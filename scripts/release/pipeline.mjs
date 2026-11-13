#!/usr/bin/env node
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildRelease, releaseRoot, sha256 } from './assets.mjs';

export function sourceOnlyViolations(files, policy) {
  if (policy?.schemaVersion !== 1 || !Array.isArray(policy.adapters)) throw new Error('Política de clientes inválida.');
  const roots = new Set(policy.adapters.flatMap(adapter => [adapter.root, ...(adapter.extraRoots || [])]).map(value => value.toLowerCase()));
  roots.delete('.github'); roots.delete('.vscode');
  const entries = new Set([...(policy.entrypoints || []), ...policy.adapters.flatMap(adapter => adapter.entrypoints || [])].map(value => value.toLowerCase()));
  const outputs = new Set(['catalog.json', 'skills.json', 'agents.json', 'rules.json', 'espelhos.conf', 'estado/agentdevkit.json', 'estado/derived.json', 'state/agentdevkit.json', 'state/derived.json']);
  const violations = [];
  for (const path of files) {
    const lower = path.toLowerCase(), parts = lower.split('/');
    let reason;
    if (roots.has(parts[0]) || entries.has(lower)) reason = 'apontamento de cliente';
    else if (parts[0] === '.github' && ['agents', 'skills', 'prompts', 'instructions'].includes(parts[1])) reason = 'recurso gerado do Copilot';
    else if (parts[0] === '.pbai4devs' && outputs.has(parts.slice(1).join('/'))) reason = 'catálogo, manifesto ou estado gerado';
    else if (/\.(?:sh|ps1|bat|cmd)$/i.test(path)) reason = 'automação shell própria';
    if (reason) violations.push({ path, reason });
  }
  return violations;
}

export function guardSourceOnlyGit(root, environment = process.env) {
  const policy = JSON.parse(readFileSync(join(root, '.pbai4devs/templates/clients/ADAPTERS.json'), 'utf8'));
  const listed = spawnSync('git', ['-C', root, 'ls-files', '-z', '--cached'], { encoding: 'utf8', env: environment, shell: false, maxBuffer: 16 * 1024 * 1024 });
  if (listed.error || listed.status !== 0) throw new Error(listed.error?.message || 'O check de fontes exige um checkout Git.');
  const violations = sourceOnlyViolations(listed.stdout.split('\0').filter(Boolean), policy);
  if (violations.length) throw new Error(`Git contém saídas locais ou automações shell: ${violations.map(item => `${JSON.stringify(item.path)} (${item.reason})`).join(', ')}`);
  return { files: listed.stdout.split('\0').filter(Boolean).length };
}

export function executeNode(root, args, env = process.env) {
  const childEnv = { ...env }; delete childEnv.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, args, { cwd: root, env: childEnv, stdio: 'inherit', timeout: 900000, shell: false, windowsHide: true });
  if (result.error || result.status !== 0) {
    throw new Error(`Falha: node ${args.join(' ')}; status=${result.status}; sinal=${result.signal || 'none'}; erro=${result.error?.code || 'none'}${result.error?.message ? ` (${result.error.message})` : ''}`);
  }
}

// Each named profile is an independent CI job; `portable` runs all locally.
export const portableProfiles = Object.freeze({
  'portable-cli': Object.freeze(['cli.test.mjs', 'adapters.test.mjs', 'development-ecosystem.test.mjs', 'security-ecosystem.test.mjs', 'file-modes.test.mjs']),
  'portable-projects': Object.freeze(['client-selection.test.mjs', 'client-ignore.test.mjs', 'native-coexistence.test.mjs', 'oss-preservation.test.mjs']),
  'portable-migration': Object.freeze(['state-migration.test.mjs', 'preservation-lifecycle.test.mjs']),
  'portable-resources': Object.freeze(['documentation-compatibility.test.mjs', 'github-packages.test.mjs', 'next.test.mjs', 'managed-content.test.mjs', 'managed-content-helper.test.mjs', 'managed-toml.test.mjs', 'managed-preservation.test.mjs', 'release-pipeline.test.mjs', 'release-resilience.test.mjs']),
  'portable-layout': Object.freeze(['source-layout.test.mjs']),
});

// Publication and the exact tarball are built and verified once on Linux.
export const fullOnlyTests = Object.freeze({
  'cli-pack.test.mjs': 'Valida o npm pack real gerado pelo perfil completo.',
  'distribution.test.mjs': 'Testa o tarball exato produzido e entregue pelo perfil completo.',
  'release-assets.test.mjs': 'Testa a montagem do artefato de release, executada no Linux.',
});

export function verifyPortableClassification(files, { profiles = portableProfiles, fullOnly = fullOnlyTests } = {}) {
  const portable = Object.values(profiles).flat();
  const excluded = Object.keys(fullOnly);
  const classified = [...portable, ...excluded];
  if (new Set(classified).size !== classified.length) throw new Error('Suíte portátil duplicada ou também excluída.');
  if (Object.values(fullOnly).some(reason => typeof reason !== 'string' || !reason.trim())) throw new Error('Suíte exclusiva do perfil completo sem justificativa.');
  const discovered = files.filter(name => name.endsWith('.test.mjs')).sort();
  const actual = classified.toSorted();
  if (discovered.length !== actual.length || discovered.some((name, index) => name !== actual[index])) {
    const missing = discovered.filter(name => !classified.includes(name));
    const obsolete = classified.filter(name => !discovered.includes(name));
    throw new Error(`Classificação das suítes desatualizada; faltam: ${missing.join(', ') || 'nenhuma'}; ausentes: ${obsolete.join(', ') || 'nenhuma'}.`);
  }
}

export function markVerified(directory, env = process.env) {
  const path = join(directory, 'package-manifest.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  if (sha256(readFileSync(join(directory, manifest.file))) !== manifest.sha256) throw new Error('O pacote mudou depois da verificação.');
  manifest.verification = { status: 'passed', profile: 'full', sourceCommit: manifest.sourceCommit, checkedAt: new Date().toISOString() };
  writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
  const destination = join(env.RUNNER_TEMP || dirname(directory), 'agentdevkit-package');
  mkdirSync(destination, { recursive: true });
  for (const file of [manifest.file, 'SHA256SUMS', 'NOTES.txt', 'package-manifest.json']) copyFileSync(join(directory, file), join(destination, file));
  return destination;
}

export function runPipeline(profile, { root = releaseRoot, env = process.env, run = executeNode } = {}) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Use Node.js 24+.');
  const hub = '.pbai4devs';
  const tests = 'tests';
  const test = (names, options = []) => run(root, ['--test', ...options, ...names.map(name => `${tests}/${name}`)], env);
  if (profile === 'full' || profile === 'portable' || Object.hasOwn(portableProfiles, profile)) {
    verifyPortableClassification(readdirSync(join(root, tests)));
  }
  const check = () => {
    guardSourceOnlyGit(root, env);
    run(root, [`${hub}/scripts/verificar-recursos/SCRIPT.mjs`, '--source-only'], env);
  };
  if (profile === 'check') { check(); return; }
  if (profile === 'full') {
    test(readdirSync(join(root, tests)).filter(name => name.endsWith('.test.mjs') && name !== 'distribution.test.mjs').sort());
    run(root, [`${hub}/scripts/testar-infraestrutura/SCRIPT.mjs`], env);
    run(root, [`${hub}/scripts/preparar-ferramentas/SCRIPT.mjs`, 'install', 'markdownlint-cli2'], env);
    check();
    const artifact = buildRelease(root, { env });
    run(root, ['--test', `${tests}/distribution.test.mjs`], { ...env, AGENTDEVKIT_TARBALL: artifact.file });
    const staged = markVerified(artifact.directory, env);
    console.log(JSON.stringify({ profile, version: artifact.version, sha256: artifact.sha256, staged }));
    return;
  }
  if (profile === 'portable') {
    for (const name of Object.keys(portableProfiles)) runPipeline(name, { root, env, run });
    return;
  }
  if (Object.hasOwn(portableProfiles, profile)) {
    console.log(`Perfil ${profile}: ${portableProfiles[profile].join(', ')}`);
    test(portableProfiles[profile], ['--test-concurrency=2']);
    if (profile === 'portable-resources') {
      for (const name of ['preparar-ferramentas', 'sincronizar-agentes', 'verificar-recursos', 'executar-script', 'inspecionar-projeto']) run(root, ['--test', `${hub}/scripts/${name}/tests/TEST.mjs`], env);
    }
    return;
  }
  if (profile === 'smoke') {
    test(['adapters.test.mjs', 'next.test.mjs']);
    for (const flag of ['--help', '--version']) run(root, ['bin/agentdevkit.mjs', flag], env);
    return;
  }
  throw new Error(`Use full, portable, ${Object.keys(portableProfiles).join(', ')}, smoke ou check.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runPipeline(process.argv[2]); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
