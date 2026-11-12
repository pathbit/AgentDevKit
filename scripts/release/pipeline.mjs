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
  const outputs = new Set(['catalog.json', 'skills.json', 'agents.json', 'rules.json', 'espelhos.conf', 'estado/agentdevkit.json', 'estado/derived.json']);
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
  if (result.error || result.status !== 0) throw new Error(result.error?.message || `Falha (${result.status}): node ${args.join(' ')}`);
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
  const test = names => run(root, ['--test', ...names.map(name => `${tests}/${name}`)], env);
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
    test(['adapters.test.mjs', 'cli.test.mjs', 'client-selection.test.mjs', 'documentation-compatibility.test.mjs', 'native-coexistence.test.mjs', 'next.test.mjs']);
    for (const name of ['preparar-ferramentas', 'sincronizar-agentes', 'verificar-recursos', 'executar-script', 'inspecionar-projeto']) run(root, ['--test', `${hub}/scripts/${name}/tests/TEST.mjs`], env);
    return;
  }
  if (profile === 'smoke') {
    test(['adapters.test.mjs', 'next.test.mjs']);
    for (const flag of ['--help', '--version']) run(root, ['bin/agentdevkit.mjs', flag], env);
    return;
  }
  throw new Error('Use full, portable, smoke ou check.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runPipeline(process.argv[2]); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
