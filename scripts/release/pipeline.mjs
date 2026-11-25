#!/usr/bin/env node
import { appendFileSync, lstatSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { buildRelease, releaseRoot, sha256 } from './assets.mjs';
import { nativeGate, verifyNativeTests } from './native-macos-metadata.mjs';

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
    else if (parts[0] === '.github' && ['agents', 'skills', 'prompts', 'instructions', 'rules'].includes(parts[1])) reason = 'recurso gerado do Copilot';
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

export const nodeProcessTimeoutMs = (process.platform === 'win32' ? 50 : 40) * 60 * 1000;

const testEvidenceReporter = new URL(
  '../../.pbai4devs/scripts/testar-infraestrutura/REPORTER.mjs', import.meta.url,
).href;

function checkTestEvidence(output, expectedFiles) {
  const match = output.match(/\nADK_INFRA_EVIDENCE (\{[^\n]*\})\r?\n$/);
  if (!match) throw new Error('Execução de testes sem resumo do runner.');
  const { counts, observed, fileSummaries, skipped, pending } = JSON.parse(match[1]);
  if (!counts || counts.failed || counts.cancelled || counts.todo || pending.length) {
    throw new Error('Execução de testes contém falha, cancelamento ou TODO.');
  }
  const unexplained = skipped.filter(item => !item.file || !item.reason?.trim() || item.booleanSkip || item.todo);
  if (unexplained.length) {
    throw new Error(`Skips sem justificativa: ${unexplained.map(item => `${item.file ?? '?'}: ${item.name}`).join(', ')}`);
  }
  if (fileSummaries !== expectedFiles || !counts.passed || counts.tests !== observed || counts.skipped !== skipped.length
      || counts.passed + counts.skipped !== counts.tests) {
    throw new Error('Execução de testes sem evidência completa de cobertura.');
  }
}

export function executeNode(root, args, env = process.env) {
  const test = args[0] === '--test';
  const reserved = test ? ['NODE_OPTIONS', 'NODE_TEST_CONTEXT', 'ADK_INFRA_ENTRY'] : ['NODE_TEST_CONTEXT'];
  const childEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !reserved.includes(key.toUpperCase())));
  const staging = test ? mkdtempSync(join(tmpdir(), 'agentdevkit-test-evidence-')) : undefined;
  try {
    const evidence = test ? join(staging, 'runner.log') : undefined;
    let command = args;
    if (test) {
      const displayReporter = args.find(arg => arg.startsWith('--test-reporter=')) ?? '--test-reporter=spec';
      command = ['--test', displayReporter, '--test-reporter-destination=stdout',
        `--test-reporter=${testEvidenceReporter}`, `--test-reporter-destination=${evidence}`,
        ...args.slice(1).filter(arg => arg !== displayReporter)];
    }
    const result = spawnSync(process.execPath, command, { cwd: root, env: childEnv, stdio: 'inherit', timeout: nodeProcessTimeoutMs, shell: false, windowsHide: true });
    if (result.error || result.status !== 0) {
      throw new Error(`Falha: node ${args.join(' ')}; status=${result.status}; sinal=${result.signal || 'none'}; erro=${result.error?.code || 'none'}${result.error?.message ? ` (${result.error.message})` : ''}`);
    }
    if (test) {
      const expectedFiles = args.slice(1).filter(arg => !arg.startsWith('--')).length;
      checkTestEvidence(readFileSync(evidence, 'utf8'), expectedFiles);
    }
  } finally {
    if (staging) rmSync(staging, { recursive: true, force: true });
  }
}

// Each named profile is an independent CI job; `portable` runs all locally.
export const portableProfiles = Object.freeze({
  'portable-cli': Object.freeze(['cli.test.mjs', 'adapters.test.mjs', 'development-ecosystem.test.mjs', 'security-ecosystem.test.mjs', 'file-modes.test.mjs', 'runtime-minimum.test.mjs', 'plugins.test.mjs']),
  'portable-source-integration': Object.freeze(['source-integration.test.mjs']),
  'portable-selection': Object.freeze(['client-selection.test.mjs']),
  'portable-selection-lifecycle': Object.freeze([
    'exact-native-cli.test.mjs', 'agent-sidecar-sync.test.mjs', 'stale-agent-reference.test.mjs',
    'overlay-stale-plan.test.mjs', 'codex-derived-reference.test.mjs', 'stage-preview-combined.test.mjs',
    'removed-file-diagnostic.test.mjs', 'removed-file-protection.test.mjs', 'removed-overlay.test.mjs',
    'migration-tombstone.test.mjs',
  ]),
  'portable-selection-codex': Object.freeze(['client-selection-obstructions-codex.test.mjs']),
  'portable-selection-all-root': Object.freeze(['client-selection-obstructions-all-root.test.mjs']),
  'portable-selection-all-leaf': Object.freeze(['client-selection-obstructions-all-leaf.test.mjs']),
  'portable-projects': Object.freeze(['client-ignore.test.mjs', 'diagnostic-collector-safe.test.mjs', 'cleanup-failure.test.mjs', 'concurrent-recovery.test.mjs', 'git-legacy-exclude.test.mjs', 'git-locale.test.mjs', 'hardlink-unknown.test.mjs', 'hardlink-plan.test.mjs', 'makefile-guards.test.mjs', 'native-macos-metadata-gate.test.mjs', 'native-metadata.test.mjs', 'oss-preservation.test.mjs', 'matrix-audit.test.mjs', 'pre-sync-stage-diagnostics.test.mjs']),
  'portable-projects-git': Object.freeze(['git-configuration-preservation.test.mjs']),
  'portable-projects-callbacks': Object.freeze(['callback-boundary-isolated.test.mjs']),
  'portable-projects-matrix': Object.freeze(['native-coexistence.test.mjs', 'project-matrix.test.mjs']),
  'portable-recovery': Object.freeze([
    'project-recovery.test.mjs', 'recovery-backup.test.mjs', 'recovery-capture.test.mjs',
    'recovery-diagnostics.test.mjs', 'recovery-effects.test.mjs', 'recovery-exclusive.test.mjs',
    'recovery-plan-coverage.test.mjs', 'recovery-records.test.mjs', 'recovery-store.test.mjs',
    'sync-backup-failure.test.mjs', 'sync-remove-failure.test.mjs', 'sync-logical-order.test.mjs',
  ]),
  'portable-recovery-metadata': Object.freeze([
    'mac-acl-protection.test.mjs', 'mac-acl-plan.test.mjs', 'mac-backup-acl.test.mjs',
    'mac-xattr-probe.test.mjs', 'mac-xattr-removal.test.mjs', 'xattr-stage-diagnostics.test.mjs',
    'cli-special-mode.test.mjs', 'sync-special-mode.test.mjs', 'sync-temporary-privacy.test.mjs',
    'temporary-preservation.test.mjs',
  ]),
  'portable-migration': Object.freeze(['linux-inplace-metadata-experiment.test.mjs', 'linux-xattr-probe.test.mjs', 'state-migration.test.mjs', 'state-special-mode.test.mjs', 'state-directory-xattr.test.mjs', 'preservation-lifecycle.test.mjs']),
  'portable-cli-line-endings': Object.freeze(['cli-line-endings.test.mjs']),
  'portable-resources': Object.freeze([
    'json-diagnostics.test.mjs', 'compose-package-smoke.test.mjs', 'documentation-compatibility.test.mjs',
    'github-packages.test.mjs', 'next.test.mjs', 'release-pipeline.test.mjs',
    'release-resilience.test.mjs', 'resource-coverage.test.mjs',
  ]),
  'portable-resources-clients': Object.freeze([
    'claude-agent-evidence.test.mjs', 'claude-evidence.test.mjs', 'claude-legacy-exact.test.mjs',
    'claude-legacy-exact-flow.test.mjs', 'claude-rule-scope.test.mjs',
    'claude-rule-scope-integration.test.mjs', 'copilot-evidence.test.mjs', 'copilot-fleet-evidence.test.mjs',
    'exact-native-sync.test.mjs', 'native-client-matrix.test.mjs', 'scoped-rule-clients.test.mjs',
  ]),
  'portable-claude-rule-cli': Object.freeze(['claude-rule-cli.test.mjs']),
  'portable-resources-managed': Object.freeze([
    'managed-content-helper.test.mjs', 'managed-toml.test.mjs',
    'toml-composite.test.mjs', 'toml-human-after.test.mjs',
    'toml-marker-context.test.mjs', 'sync-skill-collision.test.mjs', 'managed-preservation.test.mjs',
  ]),
  'portable-managed-content': Object.freeze(['managed-content.test.mjs']),
  'portable-managed-lifecycle': Object.freeze(['managed-content-lifecycle.test.mjs']),
  'portable-managed-protection': Object.freeze(['managed-content-protection.test.mjs']),
  'portable-legacy-toml': Object.freeze([
    'gemini-command-fixture.test.mjs', 'gemini-derived-diagnostic.test.mjs',
    'gemini-toml-lifecycle-reader.test.mjs',
  ]),
  'portable-retired-client-migration': Object.freeze(['retired-client-migration.test.mjs']),
  'portable-layout': Object.freeze(['source-layout.test.mjs']),
});

export const portableSyncProfiles = Object.freeze({
  'portable-sync-core': Object.freeze(['BASE.mjs']),
  'portable-sync-core-updates': Object.freeze(['UPDATES.mjs']),
  'portable-sync-ownership': Object.freeze(['HUMAN_OWNERSHIP.mjs', 'COEXISTENCE.mjs', 'MANAGED_CONTENT.mjs', 'CATALOG_OWNERSHIP.mjs']),
  'portable-sync-preservation': Object.freeze(['LOCAL_IGNORE.mjs', 'PRESERVATION.mjs']),
});
const portableProfileNames = [...Object.keys(portableProfiles), ...Object.keys(portableSyncProfiles)];

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

// Run the strict recovery gate first, then isolate installation-heavy selection
// suites. Each suite remains classified and is executed exactly once.
export function fullTestGroups(files) {
  const names = files.filter(name => name.endsWith('.test.mjs') && name !== 'distribution.test.mjs').sort();
  const selection = [
    'client-selection.test.mjs',
    'client-selection-obstructions-codex.test.mjs',
    'client-selection-obstructions-all-root.test.mjs',
    'client-selection-obstructions-all-leaf.test.mjs',
  ];
  const recovery = ['concurrent-recovery.test.mjs'];
  if (!names.includes(recovery[0])) throw new Error('Suíte de recuperação ausente do perfil completo.');
  if (selection.some(name => !names.includes(name))) throw new Error('Suíte de seleção ausente do perfil completo.');
  return [recovery, ...selection.map(name => [name]), names.filter(name => !selection.includes(name) && !recovery.includes(name))];
}

function checkWorkflowOutput(root, env, outputPath) {
  if(!outputPath)return;
  try {
    const output=lstatSync(outputPath), temp=realpathSync(env.RUNNER_TEMP), real=realpathSync(outputPath);
    const within=relative(temp,real), project=relative(realpathSync(root),real);
    const insideProject=project===''||(!isAbsolute(project)&&project!=='..'&&!project.startsWith('..'+sep));
    if(output.isSymbolicLink()||!output.isFile()||!within||isAbsolute(within)||within==='..'||within.startsWith('..'+sep)||insideProject||/[\r\n]/.test(temp))throw new Error('invalid');
  } catch {throw new Error('Saída do workflow inválida.');}
}

export function markVerified(directory, env = process.env) {
  const source=lstatSync(directory);
  if(!source.isDirectory()||source.isSymbolicLink())throw new Error('Diretório de origem inválido.');
  const readRegular = name => {
    const path=join(directory,name), info=lstatSync(path);
    if(info.isSymbolicLink()||!info.isFile())throw new Error('Artefato não regular: '+name);
    return readFileSync(path);
  };
  const manifest=JSON.parse(readRegular('package-manifest.json'));
  if(!/^\d+\.\d+\.\d+$/.test(manifest.version)||manifest.file!=='agentdevkit-'+manifest.version+'.tgz'||!/^[a-f0-9]{64}$/.test(manifest.sha256))throw new Error('Manifesto inválido.');
  const archive=readRegular(manifest.file), checksum=readRegular('SHA256SUMS'), notes=readRegular('NOTES.txt');
  if(sha256(archive)!==manifest.sha256)throw new Error('O pacote mudou depois da verificação.');
  if(checksum.toString('utf8')!==manifest.sha256+'  '+manifest.file+'\n')throw new Error('O checksum diverge do pacote.');
  manifest.verification={status:'passed',profile:'full',sourceCommit:manifest.sourceCommit,checkedAt:new Date().toISOString()};
  const base=env.RUNNER_TEMP||dirname(directory), info=lstatSync(base);
  if(!info.isDirectory()||info.isSymbolicLink())throw new Error('Diretório temporário inválido.');
  const within=relative(realpathSync(directory),realpathSync(base));
  if(within===''||(!isAbsolute(within)&&within!=='..'&&!within.startsWith('..'+sep)))throw new Error('Diretório temporário dentro da saída de origem.');
  const destination=mkdtempSync(join(base,'agentdevkit-package-'));
  try {
    for(const [name,data] of [[manifest.file,archive],['SHA256SUMS',checksum],['NOTES.txt',notes],['package-manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n')]])writeFileSync(join(destination,name),data,{flag:'wx',mode:0o600});
    if(sha256(readFileSync(join(destination,manifest.file)))!==manifest.sha256)throw new Error('O pacote copiado divergiu.');
    return destination;
  } catch(error) {
    try {rmSync(destination,{recursive:true,force:true});} catch(cleanup) {
      const code=typeof cleanup.code==='string'&&/^[A-Z][A-Z0-9_]{0,31}$/.test(cleanup.code)?' ('+cleanup.code+')':'';
      const e=new AggregateError([error,cleanup],'Falha ao limpar staging'+code+': '+destination+'; falha original: '+error.message);
      e.cause=error;e.preservedPaths=[destination];throw e;
    }
    throw error;
  }
}

function verifyLinuxOwnership(root, env) {
  if (process.platform !== 'linux' || process.getuid() !== 0) {
    throw new Error('O gate de propriedade exige Linux e permissão para trocar de UID.');
  }
  const fixtures = {
    'file-modes.test.mjs': ['CLI preserves file from another owner before installing'],
    'recovery-store.test.mjs': [
      'Linux root recusa UID real divergente nos três diretórios sem escrever',
      'Linux root recusa registro de outro UID sem gravar',
    ],
    'sync-backup-failure.test.mjs': [
      'sync Linux recusa arquivo de outro proprietário legível pelo grupo',
      'sync Linux preserva o modo de leitura do próprio arquivo no backup',
    ],
  };
  let passed = 0;
  for (const [file, names] of Object.entries(fixtures)) {
    passed += verifyNativeTests({ root, file: `tests/${file}`, names, env });
  }
  console.log(JSON.stringify({ platform: process.platform, passed }));
}

export function runPipeline(profile, { root = releaseRoot, env = process.env, run = executeNode, artifactOutput } = {}) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Use Node.js 24+.');
  const hub = '.pbai4devs';
  const tests = 'tests';
  const test = (names, options = [], testEnv = env) => run(root, ['--test', ...options, ...names.map(name => `${tests}/${name}`)], testEnv);
  if (profile === 'full' || profile === 'portable' || portableProfileNames.includes(profile)) {
    verifyPortableClassification(readdirSync(join(root, tests)));
  }
  const check = (checkEnv = env) => {
    guardSourceOnlyGit(root, checkEnv);
    run(root, [`${hub}/scripts/verificar-recursos/SCRIPT.mjs`, '--source-only'], checkEnv);
  };
  if (profile === 'check') { check(); return; }
  if (profile === 'full') {
    // The release gate requires native recovery fixtures.
    // NODE_OPTIONS can silently filter all tests with --test-name-pattern.
    const reserved = new Set(['NODE_OPTIONS', 'ADK_STRICT_RECOVERY_TEST', 'ADK_STRICT_CLAUDE_SCOPE_TEST']);
    const strictEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !reserved.has(key.toUpperCase())));
    strictEnv.ADK_STRICT_RECOVERY_TEST = '1';
    strictEnv.ADK_STRICT_CLAUDE_SCOPE_TEST = '1';
    checkWorkflowOutput(root,strictEnv,artifactOutput);
    for (const group of fullTestGroups(readdirSync(join(root, tests)))) test(group, ['--test-concurrency=4'], strictEnv);
    run(root, [`${hub}/scripts/preparar-ferramentas/SCRIPT.mjs`, 'install', 'skills'], strictEnv);
    run(root, ['scripts/release/infrastructure.mjs'], strictEnv);
    if (process.platform === 'linux') run(root, ['scripts/release/infrastructure.mjs', '--native'], strictEnv);
    run(root, [`${hub}/scripts/preparar-ferramentas/SCRIPT.mjs`, 'install', 'markdownlint-cli2'], strictEnv);
    check(strictEnv);
    const artifact = buildRelease(root, { env: strictEnv });
    run(root, ['--test', `${tests}/distribution.test.mjs`], { ...strictEnv, AGENTDEVKIT_TARBALL: artifact.file });
    const staged = markVerified(artifact.directory, strictEnv);
    if(artifactOutput) {
      try {
        checkWorkflowOutput(root,strictEnv,artifactOutput);
        if(/[\r\n]/.test(staged))throw new Error('Caminho do artefato inválido.');
        appendFileSync(artifactOutput,'artifact_path='+staged+'\n');
      } catch(error) {
        const e=new Error('Falha ao registrar caminho do artefato; cópia preservada: '+staged+'; falha original: '+error.message,{cause:error});
        e.preservedPaths=[staged];throw e;
      }
    }
    console.log(JSON.stringify({ profile, version: artifact.version, sha256: artifact.sha256, staged }));
    return;
  }
  if (profile === 'native-linux-ownership') { verifyLinuxOwnership(root, env); return; }
  if (profile === 'native-macos-metadata') {
    verifyPortableClassification(readdirSync(join(root, tests)));
    console.log(JSON.stringify(nativeGate({ root, env })));
    return;
  }
  if (profile === 'portable') {
    for (const name of portableProfileNames) runPipeline(name, { root, env, run });
    return;
  }
  const reporter = env.GITHUB_ACTIONS === 'true' ? ['--test-reporter=tap'] : [];
  const portableArgs = ['--test-concurrency=2', ...reporter];
  if (Object.hasOwn(portableSyncProfiles, profile)) {
    const files = portableSyncProfiles[profile];
    console.log(`Perfil ${profile}: ${files.join(', ')}`);
    run(root, ['--test', ...portableArgs, ...files.map(file => `${hub}/scripts/sincronizar-agentes/tests/${file}`)], env);
    return;
  }
  if (Object.hasOwn(portableProfiles, profile)) {
    console.log(`Perfil ${profile}: ${portableProfiles[profile].join(', ')}`);
    test(portableProfiles[profile], portableArgs);
    if (profile === 'portable-resources') {
      run(root, ['scripts/release/infrastructure.mjs', '--native'], env);
      for (const name of ['preparar-ferramentas', 'verificar-recursos', 'executar-script', 'inspecionar-projeto', 'reunir-contexto-spec', 'testar-maturidade', 'verificar-configuracao', 'revisar-entrega']) run(root, ['--test', `${hub}/scripts/${name}/tests/TEST.mjs`], env);
    }
    return;
  }
  if (profile === 'smoke') {
    test(['adapters.test.mjs', 'next.test.mjs']);
    for (const flag of ['--help', '--version']) run(root, ['bin/agentdevkit.mjs', flag], env);
    return;
  }
  throw new Error(`Use full, portable, ${portableProfileNames.join(', ')}, native-macos-metadata, native-linux-ownership, smoke ou check.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const extra=process.argv.slice(3);
    if(extra.length>1 || (extra.length===1 && extra[0]!=='--github-output'))throw new Error('Opções inválidas.');
    if(extra.length && !process.env.GITHUB_OUTPUT)throw new Error('GITHUB_OUTPUT ausente.');
    runPipeline(process.argv[2],{artifactOutput:extra.length ? process.env.GITHUB_OUTPUT : undefined});
  }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
