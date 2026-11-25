import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmExecutable, sha256 } from '../scripts/release/assets.mjs';
import { verifyInfrastructure, verifyNativeInfrastructure } from '../scripts/release/infrastructure.mjs';
import { executeNode, fullTestGroups, guardSourceOnlyGit, markVerified, nodeProcessTimeoutMs, portableProfiles, portableSyncProfiles, runPipeline, verifyPortableClassification } from '../scripts/release/pipeline.mjs';
import { assertApprovedSource, githubRequest, publishVerifiedPackage, releaseTag, resolveVerifiedPackage, verifyDistribution } from '../scripts/release/publish.mjs';
import { obstructionKinds } from './fixtures/client-selection-obstructions.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repository = 'pathbit/AgentDevKit', commit = 'a'.repeat(40), version = '1.2.3';
const run = { id: 42, run_attempt: 2, head_sha: commit, head_branch: 'master', event: 'push', path: '.github/workflows/ci.yml', status: 'completed', conclusion: 'success', repository: { full_name: repository }, head_repository: { full_name: repository } };
const resolution = { schemaVersion: 1, repository, tag: `v${version}`, version, sourceCommit: commit, runId: 42, runAttempt: 2, branch: 'master', workflowPath: run.path, artifactId: 50, artifactName: `agentdevkit-${commit}-2` };
const manifest = () => ({ version, file: `agentdevkit-${version}.tgz`, sha256: sha256(Buffer.from('exact archive bytes')), sourceCommit: commit, provenance: { repository, runId: '42', runAttempt: '2', event: 'push', ref: 'refs/heads/master' }, verification: { status: 'passed', profile: 'full', sourceCommit: commit } });

function fixture(t) {
  const home = join(root, '.agent-tests'); mkdirSync(home, { recursive: true });
  const directory = mkdtempSync(join(home, 'release-pipeline-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, `agentdevkit-${version}.tgz`), 'exact archive bytes');
  writeFileSync(join(directory, 'package-manifest.json'), JSON.stringify(manifest()));
  writeFileSync(join(directory, 'SHA256SUMS'), `${manifest().sha256}  agentdevkit-${version}.tgz\n`);
  writeFileSync(join(directory, 'NOTES.txt'), 'Release notes.');
  return directory;
}

test("full prepares the CLI de skills before gate and the matrix executes native suites", () => {
  const calls = [];
  const stop = new Error('gate de teste');
  assert.throws(() => runPipeline('full', { root, run(_root, args) {
    calls.push(args);
    if (args[0] === 'scripts/release/infrastructure.mjs') throw stop;
  } }), error => error === stop);
  assert.deepEqual(calls.at(-2), ['.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs', 'install', 'skills']);
  const portable = [];
  runPipeline('portable-resources', { root, run(_root, args) { portable.push(args); } });
  assert.deepEqual(portable[1], ['scripts/release/infrastructure.mjs', '--native']);
  assert.ok(portable.every(args => !args.includes('.pbai4devs/scripts/sincronizar-agentes/tests/TEST.mjs')));
});

test("the infrastructure gate requires complete execution of the tests of the current platform", () => {
  const skip = {
    name: 'ACL inherited in log directory interrupts before running suites',
    file: '.pbai4devs/scripts/testar-infraestrutura/tests/TEST.mjs',
    kind: 'test', event: 'test:pass',
    reason: 'Requer macOS para verificar ACLs e atributos nativos.',
    booleanSkip: false, todo: false,
  };
  const counts = { tests: 3, passed: 2, failed: 0, cancelled: 0, skipped: 1, todo: 0 };
  const evidence = { observed: 3, fileSummaries: 1, counts, skipped: [skip], pending: [] };
  const suite = { status: 'partial', name: 'testar-infraestrutura', log: 'infra.log', evidence };
  const original = structuredClone(suite);
  assert.doesNotThrow(() => verifyInfrastructure({ suites: [suite] }, 'linux'));
  assert.deepEqual(suite, original);
  assert.throws(() => verifyInfrastructure({ suites: [suite] }, 'darwin'), /infra.log/);
  for (const invalid of [
    { ...evidence, skipped: [{ ...skip, file: 'other.mjs' }] },
    { ...evidence, skipped: [{ ...skip, name: 'outro teste' }] },
    { ...evidence, skipped: [{ ...skip, reason: 'ferramenta ausente' }] },
    { ...evidence, skipped: [{ ...skip, reason: null, booleanSkip: true }] },
    { ...evidence, skipped: [skip, skip], counts: { ...counts, passed: 1, skipped: 2 } },
    { ...evidence, observed: 2 },
    { ...evidence, pending: [{ name: 'outro teste' }] },
    { ...evidence, counts: { ...counts, skipped: 2 } },
    { ...evidence, counts: { ...counts, tests: 1, passed: 0 } },
  ]) {
    assert.throws(() => verifyInfrastructure({ suites: [{ ...suite, evidence: invalid }] }, 'linux'), /infra.log/);
  }
});

test("Gate requires suites and confers evidence even when status is approved", () => {
  const counts = { tests: 2, passed: 2, failed: 0, cancelled: 0, skipped: 0, todo: 0 };
  const evidence = { observed: 2, fileSummaries: 1, counts, skipped: [], pending: [] };
  const suite = { status: 'passed', name: 'arbitrária', log: 'infra.log', evidence };
  assert.throws(() => verifyInfrastructure({ suites: [] }), /não inclui suítes/);
  assert.doesNotThrow(() => verifyInfrastructure({ suites: [suite] }));
  for (const invalid of [undefined, { ...evidence, skipped: [{ name: 'ignorado' }] }, { ...evidence, observed: 1 }]) {
    assert.throws(() => verifyInfrastructure({ suites: [{ ...suite, evidence: invalid }] }), /infra.log/);
  }
});

test('a matriz nativa recusa skip do alias Windows delegado pelo perfil completo', () => {
  const name = 'Windows normalizes temporary aliases 8.3 before comparing the Git root';
  const run = skipped => (_node, args) => {
    assert.equal(args.at(-1), '.pbai4devs/scripts/sincronizar-agentes/tests/LOCAL_IGNORE.mjs');
    return { status: 0, stdout: `ok 1 - ${name}${skipped ? ' # SKIP' : ''}\n# tests 1\n# pass ${1 - skipped}\n# fail 0\n# cancelled 0\n# skipped ${skipped}\n# todo 0\n` };
  };
  assert.deepEqual(verifyNativeInfrastructure({ platform: 'win32', exec: run(0) }), { platform: 'win32', passed: 1 });
  assert.throws(() => verifyNativeInfrastructure({ platform: 'win32', exec: run(1) }), /gate nativo incompleto/i);
});

const reference = { object: { type: 'commit', sha: commit } };

test("manual tag allows backfill without changing the selection of push events", () => {
  const push = { GITHUB_EVENT_NAME: 'push', GITHUB_REF_TYPE: 'tag', GITHUB_REF_NAME: 'v0.0.3', AGENTDEVKIT_RELEASE_TAG: 'v9.9.9' };
  assert.equal(releaseTag(push), 'v0.0.3');
  assert.equal(releaseTag({ ...push, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF_TYPE: 'branch', GITHUB_REF_NAME: 'master', AGENTDEVKIT_RELEASE_TAG: 'v0.0.3' }), 'v0.0.3');
  assert.equal(releaseTag({ ...push, GITHUB_EVENT_NAME: 'workflow_dispatch', AGENTDEVKIT_RELEASE_TAG: '' }), 'v0.0.3');
  for (const tag of ['latest', 'v0.0.3-rc.1', 'v0.0.3\n', '../v0.0.3']) assert.throws(() => releaseTag({ GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF_TYPE: 'branch', AGENTDEVKIT_RELEASE_TAG: tag }), /vX.Y.Z/);
  assert.throws(() => releaseTag({ GITHUB_EVENT_NAME: 'push', GITHUB_REF_TYPE: 'branch', GITHUB_REF_NAME: 'master', AGENTDEVKIT_RELEASE_TAG: 'v0.0.3' }), /vX.Y.Z/);
});

test("workflow keeps records separate and allows you to complete a tag without recreating the release", () => {
  const workflow = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8');
  const step = name => workflow.split(`      - name: ${name}\n`)[1]?.split('\n      - name: ')[0];
  const npm = step('Publish the same tarball to public npm');
  const github = step('Publish the same tarball to GitHub Packages');
  assert.ok(npm && github);
  assert.match(workflow, /options: \[both, npm, github\]/);
  assert.match(workflow, /packages: write/);
  assert.match(npm, /inputs\.registry != 'github'/);
  assert.match(npm, /NPM_TOKEN: \$\{\{ secrets\.NPMJS_TOKEN \}\}/);
  assert.doesNotMatch(npm, /GITHUB_PACKAGES_TOKEN/);
  assert.match(github, /inputs\.registry != 'npm'/);
  assert.match(github, /GITHUB_PACKAGES_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(github, /packages\.mjs publish --registry github/);
  assert.doesNotMatch(github, /NPM_TOKEN|NPMJS_TOKEN/);
  assert.match(step('Verify provenance and publish'), /!inputs\.package_only/);
  assert.doesNotMatch(npm + github, /!inputs\.package_only/);
});

test("npm is located by Path when Node does not include npm, without calling wrappers", t => {
  const directory = fixture(t), bin = join(directory, 'npm-prefix');
  const executable = join(bin, 'node_modules/npm/bin/npm-cli.js');
  mkdirSync(dirname(executable), { recursive: true }); writeFileSync(executable, '// npm fixture');
  writeFileSync(join(bin, 'npm.cmd'), 'fixture: discovery only, never executed');
  assert.equal(npmExecutable({ Path: bin }, join(directory, 'isolated-node')), executable);
});

test("check Git distinguishes sources of outputs and does not generate files in checkout", t => {
  const directory = join(fixture(t), 'source-check'); mkdirSync(directory);
  const put = (path, text = 'fixture') => { mkdirSync(dirname(join(directory, path)), { recursive: true }); writeFileSync(join(directory, path), text); };
  const git = (...args) => { const result = spawnSync('git', ['-C', directory, ...args], { encoding: 'utf8', shell: false }); assert.equal(result.status, 0, result.stderr); };
  put('.pbai4devs/templates/clients/ADAPTERS.json', readFileSync(join(root, '.pbai4devs/templates/clients/ADAPTERS.json')));
  for (const file of ['README.md', 'src/cli.mjs', 'bin/agentdevkit.mjs', 'tests/example.test.mjs', 'scripts/release/pipeline.mjs', 'examples/.claude/skills/example/SKILL.md', '.github/workflows/ci.yml', '.github/ISSUE_TEMPLATE/bug.yml', '.github/PULL_REQUEST_TEMPLATE.md', '.github/.gitignore', '.vscode/.gitignore', '.vscode/settings.json', '.pbai4devs/agents/revisor/claude.yaml', '.pbai4devs/state/README.md', '.pbai4devs/state/configuracao/ESTADO.md', '.pbai4devs/templates/example.sh.template']) put(file);
  git('init', '--quiet'); git('add', '.');
  assert.ok(guardSourceOnlyGit(directory).files > 0);
  const calls = [];
  runPipeline('check', { root: directory, run(_root, args) { calls.push(args); } });
  assert.deepEqual(calls, [['.pbai4devs/scripts/verificar-recursos/SCRIPT.mjs', '--source-only']]);
  assert.equal(existsSync(join(directory, '.pbai4devs/catalog.json')), false);
  const forbidden = ['.CoDeX/skills/probe/SKILL.md', 'CLAUDE.md', '.github/agents/probe.agent.md', '.github/prompts/probe.prompt.md', '.github/instructions/probe.md', '.github/skills/probe/SKILL.md', '.github/rules/probe/RULE.md', '.github/RuLeS/probe/RULE.md', '.pbai4devs/catalog.json', '.pbai4devs/espelhos.conf', '.pbai4devs/state/agentdevkit.json', '.pbai4devs/state/derived.json', '.pbai4devs/estado/agentdevkit.json', '.pbai4devs/estado/derived.json', 'scripts/legacy.PS1'];
  for (const file of forbidden) {
    put(file); git('add', '--', file);
    assert.throws(() => guardSourceOnlyGit(directory), error => error.message.includes(JSON.stringify(file)), file);
    git('rm', '--cached', '--quiet', '--', file);
  }
  assert.ok(guardSourceOnlyGit(directory).files > 0);
});

test("portable profiles cover each suite once and the local command executes all", () => {
  assert.deepEqual(portableProfiles['portable-selection'], ['client-selection.test.mjs']);
  assert.deepEqual(portableProfiles['portable-selection-lifecycle'], [
    'exact-native-cli.test.mjs', 'agent-sidecar-sync.test.mjs', 'stale-agent-reference.test.mjs',
    'overlay-stale-plan.test.mjs', 'codex-derived-reference.test.mjs', 'stage-preview-combined.test.mjs',
    'removed-file-diagnostic.test.mjs', 'removed-file-protection.test.mjs', 'removed-overlay.test.mjs',
    'migration-tombstone.test.mjs',
  ]);
  assert.deepEqual(portableProfiles['portable-selection-codex'], ['client-selection-obstructions-codex.test.mjs']);
  assert.deepEqual(portableProfiles['portable-selection-all-root'], ['client-selection-obstructions-all-root.test.mjs']);
  assert.deepEqual(portableProfiles['portable-selection-all-leaf'], ['client-selection-obstructions-all-leaf.test.mjs']);
  assert.deepEqual(portableProfiles['portable-projects'], ['client-ignore.test.mjs', 'diagnostic-collector-safe.test.mjs', 'cleanup-failure.test.mjs', 'concurrent-recovery.test.mjs', 'git-legacy-exclude.test.mjs', 'git-locale.test.mjs', 'hardlink-unknown.test.mjs', 'hardlink-plan.test.mjs', 'makefile-guards.test.mjs', 'native-macos-metadata-gate.test.mjs', 'native-metadata.test.mjs', 'oss-preservation.test.mjs', 'matrix-audit.test.mjs', 'pre-sync-stage-diagnostics.test.mjs']);
  assert.deepEqual(portableProfiles['portable-projects-git'], ['git-configuration-preservation.test.mjs']);
  assert.deepEqual(portableProfiles['portable-projects-callbacks'], ['callback-boundary-isolated.test.mjs']);
  assert.deepEqual(portableProfiles['portable-projects-matrix'], ['native-coexistence.test.mjs', 'project-matrix.test.mjs']);
  assert.deepEqual(portableProfiles['portable-recovery'], [
    'project-recovery.test.mjs', 'recovery-backup.test.mjs', 'recovery-capture.test.mjs',
    'recovery-diagnostics.test.mjs', 'recovery-effects.test.mjs', 'recovery-exclusive.test.mjs',
    'recovery-plan-coverage.test.mjs', 'recovery-records.test.mjs', 'recovery-store.test.mjs',
    'sync-backup-failure.test.mjs', 'sync-remove-failure.test.mjs', 'sync-logical-order.test.mjs',
  ]);
  assert.deepEqual(portableProfiles['portable-recovery-metadata'], [
    'mac-acl-protection.test.mjs', 'mac-acl-plan.test.mjs', 'mac-backup-acl.test.mjs',
    'mac-xattr-probe.test.mjs', 'mac-xattr-removal.test.mjs', 'xattr-stage-diagnostics.test.mjs',
    'cli-special-mode.test.mjs', 'sync-special-mode.test.mjs', 'sync-temporary-privacy.test.mjs',
    'temporary-preservation.test.mjs',
  ]);
  assert.deepEqual(portableProfiles['portable-migration'], ['linux-inplace-metadata-experiment.test.mjs', 'linux-xattr-probe.test.mjs', 'state-migration.test.mjs', 'state-special-mode.test.mjs', 'state-directory-xattr.test.mjs', 'preservation-lifecycle.test.mjs']);
  assert.deepEqual(portableProfiles['portable-cli-line-endings'], ['cli-line-endings.test.mjs']);
  const expected = ['adapters.test.mjs', 'claude-agent-evidence.test.mjs', 'claude-evidence.test.mjs', 'claude-legacy-exact.test.mjs', 'claude-legacy-exact-flow.test.mjs', 'claude-rule-cli.test.mjs', 'claude-rule-scope.test.mjs', 'claude-rule-scope-integration.test.mjs', 'cli.test.mjs', 'plugins.test.mjs', 'client-selection.test.mjs', 'client-selection-obstructions-codex.test.mjs', 'client-selection-obstructions-all-root.test.mjs', 'client-selection-obstructions-all-leaf.test.mjs', 'client-ignore.test.mjs', 'callback-boundary-isolated.test.mjs', 'diagnostic-collector-safe.test.mjs', 'cleanup-failure.test.mjs', 'concurrent-recovery.test.mjs', 'compose-package-smoke.test.mjs', 'copilot-evidence.test.mjs', 'copilot-fleet-evidence.test.mjs', 'git-configuration-preservation.test.mjs', 'git-legacy-exclude.test.mjs', 'git-locale.test.mjs', 'hardlink-unknown.test.mjs', 'hardlink-plan.test.mjs', 'makefile-guards.test.mjs', 'development-ecosystem.test.mjs', 'documentation-compatibility.test.mjs', 'github-packages.test.mjs', 'native-client-matrix.test.mjs', 'native-macos-metadata-gate.test.mjs', 'native-metadata.test.mjs', 'native-coexistence.test.mjs', 'next.test.mjs', 'managed-content.test.mjs', 'managed-content-helper.test.mjs', 'managed-toml.test.mjs', 'toml-composite.test.mjs', 'toml-human-after.test.mjs', 'toml-marker-context.test.mjs', 'gemini-command-fixture.test.mjs', 'gemini-derived-diagnostic.test.mjs', 'sync-skill-collision.test.mjs', 'scoped-rule-clients.test.mjs', 'gemini-toml-lifecycle-reader.test.mjs', 'retired-client-migration.test.mjs', 'managed-preservation.test.mjs', 'security-ecosystem.test.mjs', 'source-layout.test.mjs', 'source-integration.test.mjs', 'sync-logical-order.test.mjs', 'mac-acl-protection.test.mjs', 'mac-acl-plan.test.mjs', 'mac-backup-acl.test.mjs', 'mac-xattr-probe.test.mjs', 'mac-xattr-removal.test.mjs', 'xattr-stage-diagnostics.test.mjs', 'cli-special-mode.test.mjs', 'sync-special-mode.test.mjs', 'sync-temporary-privacy.test.mjs', 'state-migration.test.mjs', 'preservation-lifecycle.test.mjs', 'file-modes.test.mjs', 'oss-preservation.test.mjs', 'project-matrix.test.mjs', 'matrix-audit.test.mjs', 'pre-sync-stage-diagnostics.test.mjs', 'project-recovery.test.mjs', 'recovery-backup.test.mjs', 'recovery-capture.test.mjs', 'recovery-diagnostics.test.mjs', 'recovery-effects.test.mjs', 'recovery-exclusive.test.mjs', 'recovery-plan-coverage.test.mjs', 'recovery-records.test.mjs', 'recovery-store.test.mjs', 'sync-backup-failure.test.mjs', 'sync-remove-failure.test.mjs', 'temporary-preservation.test.mjs', 'release-pipeline.test.mjs', 'release-resilience.test.mjs', 'resource-coverage.test.mjs'].sort();
  expected.push('cli-line-endings.test.mjs', 'linux-inplace-metadata-experiment.test.mjs', 'linux-xattr-probe.test.mjs', 'json-diagnostics.test.mjs', 'exact-native-cli.test.mjs', 'exact-native-sync.test.mjs', 'agent-sidecar-sync.test.mjs', 'stale-agent-reference.test.mjs', 'overlay-stale-plan.test.mjs', 'codex-derived-reference.test.mjs', 'stage-preview-combined.test.mjs', 'removed-file-diagnostic.test.mjs', 'removed-file-protection.test.mjs', 'removed-overlay.test.mjs', 'migration-tombstone.test.mjs', 'runtime-minimum.test.mjs', 'state-special-mode.test.mjs', 'state-directory-xattr.test.mjs');
  expected.push('managed-content-lifecycle.test.mjs', 'managed-content-protection.test.mjs');
  expected.sort();
  const combined = Object.values(portableProfiles).flat();
  assert.equal(new Set(combined).size, combined.length);
  assert.deepEqual(combined.toSorted(), expected);
  const calls = [];
  const options = { root, env: {}, run(_root, args) { calls.push(args); } };
  for (const [profile, files] of Object.entries(portableProfiles)) {
    const group = [];
    runPipeline(profile, { root, env: {}, run(_root, args) { group.push(args); } });
    assert.deepEqual(group[0], ['--test', '--test-concurrency=2', ...files.map(file => `tests/${file}`)]);
    assert.equal(group.length, profile === 'portable-resources' ? 10 : 1);
    if (profile === 'portable-resources') assert.ok(group.some(args => args.includes('.pbai4devs/scripts/revisar-entrega/tests/TEST.mjs')));
    if (profile === 'portable-resources') assert.ok(group.some(args => args.includes('.pbai4devs/scripts/reunir-contexto-spec/tests/TEST.mjs')));
    calls.push(...group);
  }
  const syncDir = '.pbai4devs/scripts/sincronizar-agentes/tests';
  const syncModules = Object.values(portableSyncProfiles).flat();
  assert.equal(new Set(syncModules).size, syncModules.length);
  const aggregate = readFileSync(join(root, syncDir, 'TEST.mjs'), 'utf8');
  const imported = [...aggregate.matchAll(/^import '\.\/([^']+)';$/gm)].map(match => match[1]);
  assert.deepEqual(syncModules.toSorted(), imported.toSorted());
  assert.deepEqual(syncModules.toSorted(), readdirSync(join(root, syncDir)).filter(file => /^[A-Z_]+\.mjs$/.test(file) && file !== 'TEST.mjs').sort());
  for (const [profile, files] of Object.entries(portableSyncProfiles)) {
    const group = [];
    runPipeline(profile, { root, env: {}, run(_root, args) { group.push(args); } });
    assert.deepEqual(group, [['--test', '--test-concurrency=2', ...files.map(file => `${syncDir}/${file}`)]]);
    calls.push(...group);
  }
  const individual = calls.splice(0);
  runPipeline('portable', options);
  assert.deepEqual(calls, individual);
  calls.length = 0;
  runPipeline('portable-layout', { ...options, env: { GITHUB_ACTIONS: 'true' } });
  assert.deepEqual(calls, [['--test', '--test-concurrency=2', '--test-reporter=tap', 'tests/source-layout.test.mjs']]);
  calls.length = 0;
  runPipeline('smoke', options);
  assert.deepEqual(calls, [
    ['--test', 'tests/adapters.test.mjs', 'tests/next.test.mjs'],
    ['bin/agentdevkit.mjs', '--help'],
    ['bin/agentdevkit.mjs', '--version'],
  ]);
});

test("classification requires justifying each suite and detects absences and duplicates", () => {
  const files = readdirSync(join(root, 'tests'));
  verifyPortableClassification(files);
  assert.throws(() => verifyPortableClassification([...files, 'nova.test.mjs']), /faltam: nova\.test\.mjs/);
  assert.throws(() => verifyPortableClassification(files.filter(file => file !== 'cli.test.mjs')), /ausentes: cli\.test\.mjs/);
  assert.throws(() => verifyPortableClassification(['a.test.mjs'], { profiles: { a: ['a.test.mjs'], b: ['a.test.mjs'] }, fullOnly: {} }), /duplicada/);
  assert.throws(() => verifyPortableClassification(['a.test.mjs'], { profiles: { a: [] }, fullOnly: { 'a.test.mjs': '' } }), /justificativa/);
});

test("Full profile isolates recovery and heavy obstructions and performs each suite once", () => {
  const files = readdirSync(join(root, 'tests'));
  const groups = fullTestGroups(files);
  assert.deepEqual(groups[0], ['concurrent-recovery.test.mjs']);
  const selection = ['client-selection.test.mjs', 'client-selection-obstructions-codex.test.mjs', 'client-selection-obstructions-all-root.test.mjs', 'client-selection-obstructions-all-leaf.test.mjs'];
  assert.deepEqual(groups.slice(1, 5), selection.map(file => [file]));
  const expected = files.filter(name => name.endsWith('.test.mjs') && name !== 'distribution.test.mjs').sort();
  assert.deepEqual(groups.flat().sort(), expected);
  assert.equal(new Set(groups.flat()).size, expected.length);
  assert.throws(() => fullTestGroups(files.filter(name => name !== 'client-selection.test.mjs')), /seleção ausente/);
  for (const file of selection) assert.throws(() => fullTestGroups(files.filter(name => name !== file)), /seleção ausente/);
  assert.throws(() => fullTestGroups(files.filter(name => name !== 'concurrent-recovery.test.mjs')), /recuperação ausente/);
  const calls = [], environments = [], failure = new Error('falha do segundo grupo');
  assert.throws(() => runPipeline('full', { root, env: { ADK_STRICT_RECOVERY_TEST: '0', adk_strict_recovery_test: '0', ADK_STRICT_CLAUDE_SCOPE_TEST: '0', adk_strict_claude_scope_test: '0', NODE_OPTIONS: '--test-name-pattern=skip', node_options: 'ignored' }, run(_root, args, env) {
    calls.push(args); environments.push(env);
    if (calls.length === 2) throw failure;
  } }), error => error === failure);
  assert.deepEqual(calls, groups.slice(0, 2).map(group => ['--test', '--test-concurrency=4', ...group.map(file => `tests/${file}`)]));
  assert.ok(environments.every(env => env.ADK_STRICT_RECOVERY_TEST === '1'));
  assert.ok(environments.every(env => env.ADK_STRICT_CLAUDE_SCOPE_TEST === '1'));
  for (const name of ['ADK_STRICT_RECOVERY_TEST', 'ADK_STRICT_CLAUDE_SCOPE_TEST']) {
    assert.ok(environments.every(env => Object.keys(env).filter(key => key.toUpperCase() === name).length === 1));
  }
  assert.ok(environments.every(env => !Object.keys(env).some(key => key.toUpperCase() === 'NODE_OPTIONS')));
  const firstFailure = new Error('recuperação falhou'); let invoked = 0;
  assert.throws(() => runPipeline('full', { root, run() { invoked++; throw firstFailure; } }), error => error === firstFailure);
  assert.equal(invoked, 1);
  const infrastructureCalls = [];
  const stopAtLint = new Error('fim da prova de infraestrutura');
  assert.throws(() => runPipeline('full', { root, run(_root, args) {
    if (args[0] === 'scripts/release/infrastructure.mjs') infrastructureCalls.push(args);
    if (args.includes('markdownlint-cli2')) throw stopAtLint;
  } }), error => error === stopAtLint);
  assert.deepEqual(infrastructureCalls, [
    ['scripts/release/infrastructure.mjs'],
    ...(process.platform === 'linux' ? [['scripts/release/infrastructure.mjs', '--native']] : []),
  ]);
});

test("Full profile does not accept inherited filter hiding tests", t => {
  const directory = fixture(t), file = join(directory, 'gate.test.mjs');
  writeFileSync(file, "import test from 'node:test'; test('required gate', () => { throw Error('gate-executed'); });\n");
  const stop = new Error('prova concluída'); let executed = false;
  assert.throws(() => runPipeline('full', {
    root, env: { ...process.env, NODE_OPTIONS: '--test-name-pattern=does-not-exist' },
    run(_root, args, env) {
      if (!args.includes('tests/concurrent-recovery.test.mjs')) return;
      const childEnv = { ...env }; delete childEnv.NODE_TEST_CONTEXT;
      const result = spawnSync(process.execPath, ['--test', file], { cwd: root, env: childEnv, encoding: 'utf8', shell: false });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stdout + result.stderr, /gate-executed/);
      executed = true; throw stop;
    },
  }), error => error === stop);
  assert.equal(executed, true);
});

test("runner gate refuses TODO, skip for no reason and execution without proof, and preserves the justification", t => {
  const directory = fixture(t);
  const runner = join(directory, 'gate.mjs');
  const passed = "test('executado', () => {});";
  const scenarios = [
    [`${passed} test('nativo', { skip: 'A fixture requer outro sistema.' }, () => {});`],
    [`${passed} test('sem motivo', { skip: true }, () => {});`, /Skips sem justificativa.*sem motivo/],
    [`${passed} test('em aberto', { todo: 'pendência' }, () => {});`, /contém falha, cancelamento ou TODO/],
    ["export {};", /sem evidência completa/],
    ["test('nenhuma prova', { skip: 'A fixture requer outro sistema.' }, () => {});", /sem evidência completa/],
  ];
  for (const [cases, expected] of scenarios) {
    writeFileSync(runner, `import test from 'node:test'; ${cases}\n`);
    const run = () => executeNode(directory, ['--test', runner], { ...process.env, NODE_OPTIONS: '--test-name-pattern=ausente' });
    if (expected) assert.throws(run, expected);
    else assert.doesNotThrow(run);
  }
  writeFileSync(runner, `import test from 'node:test'; ${passed}\n`);
  const empty = join(directory, 'empty.mjs');
  writeFileSync(empty, 'export {};\n');
  assert.throws(() => executeNode(directory, ['--test', runner, empty]), /sem evidência completa/);
});

test("the obstruction suites partition the five cases without doubling coverage.", () => {
  assert.deepEqual(obstructionKinds, ['root-link', 'skills-file', 'group-file', 'leaf-link', 'leaf-directory']);
  const codexFile = join(root, 'tests/client-selection-obstructions-codex.test.mjs');
  assert.ok(readFileSync(codexFile, 'utf8').includes("registerObstructionTests('codex')"));
  const partitions = [
    ['client-selection-obstructions-all-root.test.mjs', ['root-link', 'skills-file', 'group-file']],
    ['client-selection-obstructions-all-leaf.test.mjs', ['leaf-link', 'leaf-directory']],
  ];
  const covered = [];
  for (const [file, kinds] of partitions) {
    const argumentsText = kinds.map(kind => `'${kind}'`).join(', ');
    assert.ok(readFileSync(join(root, 'tests', file), 'utf8').includes(`registerObstructionTests('all', [${argumentsText}])`));
    covered.push(...kinds);
  }
  assert.deepEqual(covered, obstructionKinds);
  assert.equal(new Set(covered).size, obstructionKinds.length);
});

test("matrix rotates each portable group exactly once in each OS and failures block the CI", () => {
  const workflow = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
  assert.match(workflow, /fail-fast:\s*false/);
  assert.doesNotMatch(workflow, /continue-on-error:/);
  const verifyBody = workflow.split(/^  verify:\s*$/m)[1]?.split(/^  [\w-]+:\s*$/m)[0];
  assert.ok(verifyBody, 'Job verify ausente');
  const jobTimeout = Number(verifyBody.match(/^    timeout-minutes:\s*(\d+)\s*$/m)?.[1]);
  assert.equal(nodeProcessTimeoutMs, (process.platform === 'win32' ? 50 : 40) * 60 * 1000);
  assert.ok(jobTimeout * 60 * 1000 >= nodeProcessTimeoutMs + 5 * 60 * 1000);
  const minimumBody = workflow.split(/^  minimum-runtime:\s*$/m)[1]?.split(/^  [\w-]+:\s*$/m)[0];
  assert.ok(minimumBody, 'Job de runtime mínimo ausente');
  const minimumSystems = [...minimumBody.matchAll(/- os:\s*(\S+)/g)].map(match => match[1]).sort();
  assert.deepEqual(minimumSystems, ['macos-15-intel', 'ubuntu-latest', 'windows-latest']);
  assert.deepEqual([...minimumBody.matchAll(/node-version:\s*([\d.]+)/g)].map(match => match[1]), ['24.13.1', '18.20.8']);
  assert.match(minimumBody, /ADK_TEST_NODE24=/);
  assert.match(minimumBody, /ADK_EXPECT_NODE18:\s*'1'/);
  assert.match(minimumBody, /node --test tests\/runtime-minimum\.test\.mjs/);
  const rows = [...verifyBody.matchAll(/- os:\s*(\S+)\s+node:\s*(\d+)\s+profile:\s*(\S+)/g)].map(match => ({ os: match[1], node: match[2], profile: match[3] }));
  const profiles = [...Object.keys(portableProfiles), ...Object.keys(portableSyncProfiles)];
  for (const os of ['windows-latest', 'macos-15-intel']) {
    const expectedProfiles = [...profiles, ...(os === 'macos-15-intel' ? ['native-macos-metadata'] : [])].sort();
    assert.deepEqual(rows.filter(row => row.os === os && row.node === '24').map(row => row.profile).sort(), expectedProfiles);
  }
  assert.ok(rows.some(row => row.os === 'ubuntu-latest' && row.node === '24' && row.profile === 'full'));
  assert.match(workflow, /if:\s*matrix\.profile == 'full'/);
  const metadataStep = verifyBody.split(/^      - name: Install Linux metadata test tools\r?$/m)[1]?.split(/^      - /m)[0];
  assert.ok(metadataStep, 'Instalação das ferramentas de metadados ausente');
  assert.match(metadataStep, /^        if:\s*runner\.os == 'Linux' && matrix\.profile == 'full'\s*$/m);
  assert.match(metadataStep, /^          sudo apt-get install -y attr acl\s*$/m);
  const verifyStep = verifyBody.split(/^      - name: Verify the selected profile\r?$/m)[1]?.split(/^      - /m)[0];
  assert.ok(verifyStep, 'Passo de verificação ausente');
  assert.match(verifyStep, /^        env:\s*$/m);
  assert.match(verifyStep, /^          NODE_OPTIONS:\s*''\s*$/m);
  assert.match(verifyStep, /^          ADK_REQUIRE_LINUX_XATTR:\s*\$\{\{\s*runner\.os == 'Linux' && matrix\.profile == 'full' && '1' \|\| '0'\s*\}\}\s*$/m);
  assert.match(verifyStep, /^        run:\s*node scripts\/release\/pipeline\.mjs \$\{\{ matrix\.profile \}\} --github-output\s*$/m);
  for (const profile of ['portable', ...profiles]) {
    const calls = [];
    const failure = new Error('falha real da suíte');
    assert.throws(() => runPipeline(profile, { root, run(_root, args) { calls.push(args); throw failure; } }), error => error === failure);
    assert.equal(calls.length, 1);
  }
  let calls = 0;
  assert.throws(() => runPipeline('portable', { root, run() { if (++calls === 2) throw new Error('segundo grupo falhou'); } }), /segundo grupo falhou/);
  assert.equal(calls, 2);
});

test('executor informa status e sinal do processo que falhou', () => {
  assert.throws(() => executeNode(root, ['-e', 'process.exit(7)']), /status=7; sinal=none; erro=none/);
});

test("selection awaits the correct IC and refusal source of PR, fork, branch or SHA different", async () => {
  let clock = 0, polls = 0;
  const request = async (_method, path) => {
    if (path.includes('/git/ref/')) return reference;
    if (path.includes('/artifacts')) return { artifacts: [{ id: 50, name: resolution.artifactName, expired: false }] };
    polls++;
    return { workflow_runs: [
      { ...run, id: 99, event: 'pull_request' },
      { ...run, id: 98, head_repository: { full_name: 'other/fork' } },
      { ...run, id: 97, head_branch: 'unreviewed' },
      { ...run, id: 96, head_sha: 'b'.repeat(40) },
      { ...run, status: polls === 1 ? 'in_progress' : 'completed' },
    ] };
  };
  const found = await resolveVerifiedPackage({ repository, tag: 'v1.2.3', request, now: () => clock, sleep: async ms => { clock += ms; }, pollMs: 5, timeoutMs: 10 });
  assert.deepEqual(found, resolution); assert.equal(polls, 2);
});

test("annotated tag is resolved; expired artifact does not cause new build", async () => {
  const calls = [];
  const request = async (method, path) => {
    calls.push([method, path]);
    if (path.includes('/git/ref/')) return { object: { type: 'tag', sha: 'b'.repeat(40) } };
    if (path.includes('/git/tags/')) return reference;
    if (path.includes('/artifacts')) return { artifacts: [{ id: 50, name: resolution.artifactName, expired: true }] };
    return { workflow_runs: [run] };
  };
  await assert.rejects(resolveVerifiedPackage({ repository, tag: 'v1.2.3', request }), /Execute o CI novamente/);
  assert(calls.every(([method]) => method === 'GET'));
});

test("absence of IC ends at the limit without publishing or firing workflow", async () => {
  let clock = 0, requests = 0;
  const request = async (_method, path) => { requests++; return path.includes('/git/ref/') ? reference : { workflow_runs: [] }; };
  await assert.rejects(resolveVerifiedPackage({ repository, tag: 'v1.2.3', request, now: () => clock, sleep: async ms => { clock += ms; }, pollMs: 5, timeoutMs: 10 }), /Tempo esgotado/);
  assert.equal(clock, 10); assert.equal(requests, 4);
});

test("verification requires approved bytes, checksum, commit and execution", t => {
  const directory = fixture(t);
  assert.equal(verifyDistribution(directory, resolution).archive.toString(), 'exact archive bytes');
  for (const change of [
    data => { data.version = '9.9.9'; },
    data => { data.sourceCommit = 'b'.repeat(40); },
    data => { data.provenance.runId = '99'; },
    data => { data.provenance.ref = 'refs/heads/feature'; },
    data => { data.verification.status = 'pending'; },
    data => { data.sha256 = '0'.repeat(64); },
  ]) {
    const altered = manifest(); change(altered);
    writeFileSync(join(directory, 'package-manifest.json'), JSON.stringify(altered));
    assert.throws(() => verifyDistribution(directory, resolution));
  }
  writeFileSync(join(directory, 'package-manifest.json'), JSON.stringify(manifest()));
  writeFileSync(join(directory, 'SHA256SUMS'), 'wrong');
  assert.throws(() => verifyDistribution(directory, resolution), /SHA256SUMS/);
});

test("post sends verified bytes and only makes public after both uploads", async t => {
  const directory = fixture(t), calls = [];
  const request = async (method, path, body) => {
    calls.push({ method, path, body });
    if (path.endsWith('/actions/runs/42')) return run;
    if (path.includes('/git/ref/')) return reference;
    if (path.includes('/releases/tags/')) return null;
    if (method === 'POST' && path.endsWith('/releases')) return { id: 7 };
    return { html_url: 'https://github.com/pathbit/AgentDevKit/releases/tag/v1.2.3' };
  };
  const result = await publishVerifiedPackage({ directory, resolution, request });
  assert.equal(result.sha256, manifest().sha256);
  const writes = calls.filter(call => call.method !== 'GET');
  assert.deepEqual(writes.map(call => call.method), ['POST', 'POST', 'POST', 'PATCH']);
  assert.equal(writes[0].body.draft, true);
  assert.deepEqual(writes[1].body, readFileSync(join(directory, manifest().file)));
  assert.deepEqual(writes[2].body, readFileSync(join(directory, 'SHA256SUMS')));
  assert.deepEqual(writes[3].body, { draft: false });
});

test("IC failed, tag moved and release existing block any writing", async t => {
  const directory = fixture(t);
  for (const scenario of ['failed', 'moved', 'existing']) {
    const request = async (method, path) => {
      assert.equal(method, 'GET');
      if (path.endsWith('/actions/runs/42')) return scenario === 'failed' ? { ...run, conclusion: 'failure' } : run;
      if (path.includes('/git/ref/')) return scenario === 'moved' ? { object: { type: 'commit', sha: 'b'.repeat(40) } } : reference;
      if (path.includes('/releases/tags/')) return { id: 1 };
      assert.fail(path);
    };
    await assert.rejects(publishVerifiedPackage({ directory, resolution, request }));
  }
});

test("approved origin can be revalidated without creating a release", async () => {
  const calls = [];
  const request = async (method, path) => {
    calls.push([method, path]);
    assert.equal(method, 'GET');
    return path.endsWith('/actions/runs/42') ? run : reference;
  };
  assert.equal(await assertApprovedSource(resolution, request), undefined);
  assert.equal(calls.length, 2);
  for (const state of [
    { ...run, status: 'in_progress' },
    { ...run, run_attempt: 3 },
    { ...run, head_sha: 'b'.repeat(40) },
    { ...run, event: 'pull_request' },
  ]) await assert.rejects(assertApprovedSource(resolution, async () => state), /não está aprovada/);
  await assert.rejects(assertApprovedSource(resolution, async (_method, path) => path.endsWith('/actions/runs/42') ? run : { object: { type: 'commit', sha: 'b'.repeat(40) } }), /tag mudou/);
});

test("upload failure keeps draft and does not partially publish", async t => {
  const directory = fixture(t), writes = [];
  const request = async (method, path) => {
    if (path.endsWith('/actions/runs/42')) return run;
    if (path.includes('/git/ref/')) return reference;
    if (path.includes('/releases/tags/')) return null;
    if (method !== 'GET') writes.push(method);
    if (path.endsWith('/releases')) return { id: 7 };
    throw new Error('upload failed');
  };
  await assert.rejects(publishVerifiedPackage({ directory, resolution, request }), /upload failed/);
  assert.deepEqual(writes, ['POST', 'POST']);
});

test("staging does not repackage; modified package is refused before marking approval", t => {
  const directory = fixture(t), runner = mkdtempSync(join(root, '.agent-tests', 'runner-test-'));
  t.after(() => rmSync(runner, { recursive: true, force: true }));
  const sourceBefore = readFileSync(join(directory, 'package-manifest.json'));
  const staged = markVerified(directory, { RUNNER_TEMP: runner });
  assert.deepEqual(readFileSync(join(directory, 'package-manifest.json')), sourceBefore);
  assert.deepEqual(readFileSync(join(staged, manifest().file)), readFileSync(join(directory, manifest().file)));
  assert.equal(JSON.parse(readFileSync(join(staged, 'package-manifest.json'))).verification.profile, 'full');
  assert.doesNotThrow(() => verifyDistribution(staged, resolution));
  writeFileSync(join(directory, manifest().file), 'tampered');
  assert.throws(() => markVerified(directory, { RUNNER_TEMP: runner }), /mudou/);
});

test('cliente HTTP limita o token aos hosts oficiais e propaga falhas', async () => {
  const request = githubRequest({ token: 'fixture', fetchImpl: async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer fixture');
    return { status: 403, ok: false };
  } });
  await assert.rejects(request('GET', '/repos/pathbit/AgentDevKit'), /HTTP 403/);
  await assert.rejects(request('POST', 'https://other.example/upload'), /Destino/);
});

// The creation of the tag is isolated from the publication and does not call the network in these tests.
test("auto tag creates reference for matrix commit and shoots release explicitly", async () => {
  const { autoTagRelease } = await import('../scripts/release/auto-tag.mjs');
  const f = autoTagFixture();
  const result = await autoTagRelease(f.options);
  assert.deepEqual(result, { status: 'dispatched', tag: 'v1.2.3', sourceCommit: commit, created: true });
  assert.deepEqual(f.writes.map(x => [x.path, x.body]), [
    [`/repos/${repository}/git/refs`, { ref: 'refs/tags/v1.2.3', sha: commit }],
    [`/repos/${repository}/actions/workflows/release.yml/dispatches`, { ref: 'v1.2.3', inputs: { tag: 'v1.2.3', expected_commit: commit } }],
  ]);
  assert.ok(f.calls.findIndex(c => c.path.includes('/git/ref/heads/')) < f.calls.findIndex(c => c.path.endsWith('/git/refs')));
});

function autoTagFixture({ currentVersion = version, beforeVersion = '1.2.2', existing = null, release = null, runs = [], onCall } = {}) {
  const before = 'b'.repeat(40), calls = [], writes = [];
  let tagRef = existing;
  const packageInfo = { name: '@pathbit/agentdevkit', version: currentVersion };
  const lock = { name: packageInfo.name, version: currentVersion, lockfileVersion: 3, packages: { '': { ...packageInfo } } };
  const environment = { GITHUB_EVENT_NAME: 'workflow_run', GITHUB_REPOSITORY: repository };
  const event = { action: 'completed', repository: { full_name: repository, default_branch: 'master' }, workflow_run: structuredClone(run) };
  const request = async (method, path, body) => {
    calls.push({ method, path, body }); if (method !== 'GET') writes.push({ method, path, body });
    const override = await onCall?.({ method, path, body, calls, writes, getTag: () => tagRef, setTag: value => { tagRef = value; } });
    if (override?.handled) return override.value;
    if (path.endsWith(`/actions/runs/${run.id}`)) return structuredClone(run);
    if (path.includes(`/actions/runs/${run.id}/artifacts`)) return { artifacts: [{ id: 50, name: `agentdevkit-${commit}-${run.run_attempt}`, expired: false }] };
    if (path.includes('/git/ref/heads/')) return { object: { type: 'commit', sha: commit } };
    if (path.endsWith(`/commits/${commit}`)) return { sha: commit, parents: [{ sha: before }] };
    if (path.includes('/contents/package.json?ref=')) return { encoding: 'base64', content: Buffer.from(JSON.stringify({ name: packageInfo.name, version: beforeVersion })).toString('base64') };
    if (path.endsWith('/git/matching-refs/tags/v')) return [];
    if (path.includes('/git/ref/tags/')) return tagRef;
    if (path.endsWith('/git/refs') && method === 'POST') { tagRef = { object: { type: 'commit', sha: body.sha } }; return tagRef; }
    if (path.includes('/releases/tags/')) return release;
    if (path.includes('/actions/workflows/release.yml/runs?')) return { workflow_runs: runs };
    if (path.endsWith('/actions/workflows/release.yml/dispatches')) return null;
    assert.fail(`Chamada inesperada: ${method} ${path}`);
  };
  return { options: { event, environment, checkoutCommit: commit, packageInfo, lock, request }, event, environment, packageInfo, lock, calls, writes };
}

test("newly created tag awaits visibility without repeating creation or relaxing the commit conference", async t => {
  const { autoTagRelease } = await import('../scripts/release/auto-tag.mjs');
  const expected = { object: { type: 'commit', sha: commit } };
  const different = { object: { type: 'commit', sha: 'd'.repeat(40) } };
  for (const { name, existing, reads, waits, error, writes } of [
    { name: 'propaga depois de dois 404', reads: [null, null, null, expected], waits: [1000, 2000], writes: ['refs', 'dispatches'] },
    { name: 'continua ausente', reads: Array(7).fill(null), waits: [1000, 2000, 4000, 8000, 16000], error: /ainda não mostra/, writes: ['refs'] },
    { name: 'aparece em outro commit', reads: [null, null, different], waits: [1000], error: /tag mudou/, writes: ['refs'] },
    { name: 'tag preexistente desaparece', existing: expected, reads: [expected, null], waits: [], error: /tag mudou/, writes: [] },
  ]) await t.test(name, async () => {
    const observedWaits = [];
    const f = autoTagFixture({ existing, onCall: ({ path }) => {
      if (!path.includes('/git/ref/tags/')) return null;
      assert.ok(reads.length, 'releitura de tag inesperada');
      return { handled: true, value: reads.shift() };
    } });
    const result = autoTagRelease({ ...f.options, sleep: async delay => { observedWaits.push(delay); } });
    if (error) await assert.rejects(result, error);
    else assert.equal((await result).status, 'dispatched');
    assert.deepEqual(observedWaits, waits);
    assert.deepEqual(f.writes.map(call => call.path.split('/').at(-1)), writes);
    assert.equal(reads.length, 0);
  });
});

test("auto tag refuses unreliable event, divergent version and invalid remote branch before writing", async () => {
  const { autoTagRelease } = await import('../scripts/release/auto-tag.mjs');
  const changes = [
    f => { f.environment.GITHUB_EVENT_NAME = 'pull_request'; },
    f => { f.event.workflow_run.conclusion = 'failure'; },
    f => { f.event.workflow_run.status = 'in_progress'; },
    f => { f.event.workflow_run.event = 'pull_request'; },
    f => { f.event.workflow_run.head_repository.full_name = 'attacker/fork'; },
    f => { f.event.workflow_run.path = '.github/workflows/other.yml'; },
    f => { f.event.workflow_run.run_attempt = 0; },
    f => { f.options.checkoutCommit = 'c'.repeat(40); },
    f => { f.event.repository.full_name = 'attacker/fork'; },
    f => { f.event.repository.default_branch = 'feature'; },
    f => { f.event.workflow_run.head_sha = 'c'.repeat(40); },
    f => { f.event.workflow_run.head_branch = 'feature'; },
    f => { f.packageInfo.version = '1.2.3-rc.1'; },
    f => { f.packageInfo.name = '@malicious/other'; },
    f => { f.lock.version = '9.0.0'; },
    f => { f.lock.packages[''].version = '9.0.0'; },
  ];
  for (const change of changes) {
    const f = autoTagFixture(); change(f);
    await assert.rejects(autoTagRelease(f.options)); assert.deepEqual(f.writes, []);
  }
  const f = autoTagFixture({ onCall: ({ path }) => path.includes('/git/ref/heads/') ? { handled: true, value: { object: { type: 'commit', sha: 'd'.repeat(40) } } } : null });
  assert.equal((await autoTagRelease(f.options)).reason, 'branch-advanced'); assert.deepEqual(f.writes, []);
});

test("auto tag does not move published version and rejects inaccessible collision or history", async () => {
  const { autoTagRelease } = await import('../scripts/release/auto-tag.mjs');
  const existing = { object: { type: 'commit', sha: 'c'.repeat(40) } };
  const published = { tag_name: 'v1.2.3', draft: false };
  const absent = autoTagFixture({ beforeVersion: version });
  assert.equal((await autoTagRelease(absent.options)).status, 'dispatched');
  let f = autoTagFixture({ beforeVersion: version, existing, release: published });
  assert.equal((await autoTagRelease(f.options)).reason, 'version-already-released'); assert.deepEqual(f.writes, []);
  f = autoTagFixture({ beforeVersion: '1.2.2', existing, release: published });
  await assert.rejects(autoTagRelease(f.options), /outro commit/); assert.deepEqual(f.writes, []);
  f = autoTagFixture({ beforeVersion: version, existing });
  await assert.rejects(autoTagRelease(f.options), /sem release publicada/); assert.deepEqual(f.writes, []);
  f = autoTagFixture({ onCall: ({ path }) => path.includes('/contents/package.json?') ? { handled: true, value: null } : null });
  await assert.rejects(autoTagRelease(f.options), /anterior não disponível/); assert.deepEqual(f.writes, []);
});

test("auto tag exact CI query and current artifact before any change", async () => {
  const { autoTagRelease } = await import('../scripts/release/auto-tag.mjs');
  const badRuns = [
    { ...run, conclusion: 'failure' }, { ...run, status: 'in_progress' },
    { ...run, run_attempt: 3 }, { ...run, head_sha: 'd'.repeat(40) },
    { ...run, event: 'pull_request' }, { ...run, head_repository: { full_name: 'attacker/fork' } },
  ];
  for (const bad of badRuns) {
    const f = autoTagFixture({ onCall: ({ path }) => path.endsWith('/actions/runs/42') ? { handled: true, value: bad } : null });
    await assert.rejects(autoTagRelease(f.options), /CI de origem/); assert.deepEqual(f.writes, []);
  }
  for (const artifacts of [[], [{ id: 50, name: `agentdevkit-${commit}-1`, expired: false }], [{ id: 50, name: `agentdevkit-${commit}-2`, expired: true }]]) {
    const f = autoTagFixture({ onCall: ({ path }) => path.includes('/actions/runs/42/artifacts') ? { handled: true, value: { artifacts } } : null });
    await assert.rejects(autoTagRelease(f.options), /Artefato/); assert.deepEqual(f.writes, []);
  }
});

test("auto tag blocks downgrade of later with whole comparison without overflow", async () => {
  const { autoTagRelease } = await import('../scripts/release/auto-tag.mjs');
  for (const [currentVersion, beforeVersion] of [
    ['1.2.3', '1.2.4'], ['1.9.9', '2.0.0'],
    ['99999999999999999999.1.1', '100000000000000000000.0.0'],
    ['1.9007199254740992.2', '1.9007199254740993.0'],
  ]) {
    const f = autoTagFixture({ currentVersion, beforeVersion });
    await assert.rejects(autoTagRelease(f.options), /Versão inferior/); assert.deepEqual(f.writes, []);
  }
  const f = autoTagFixture({ currentVersion: '100000000000000000000.0.0', beforeVersion: '99999999999999999999.99.99' });
  assert.equal((await autoTagRelease(f.options)).status, 'dispatched');
});

test("major tag prevents publication even after commit without version change; skip pre-releases", async () => {
  const { autoTagRelease } = await import('../scripts/release/auto-tag.mjs');
  let f = autoTagFixture({ currentVersion: '1.2.3', beforeVersion: '1.2.3', onCall: ({ path }) => path.endsWith('/git/matching-refs/tags/v') ? { handled: true, value: [{ ref: 'refs/tags/v1.2.4' }] } : null });
  await assert.rejects(autoTagRelease(f.options), /inferior a uma tag existente/); assert.deepEqual(f.writes, []);
  f = autoTagFixture({ onCall: ({ path }) => path.endsWith('/git/matching-refs/tags/v') ? { handled: true, value: [{ ref: 'refs/tags/v9.9.9-rc.1' }, { ref: 'refs/tags/v1.2.2' }, { ref: 'refs/tags/other' }] } : null });
  assert.equal((await autoTagRelease(f.options)).status, 'dispatched');
  f = autoTagFixture({ existing: { object: { type: 'commit', sha: commit } }, onCall: ({ path }) => path.endsWith('/git/matching-refs/tags/v') ? { handled: true, value: [{ ref: 'refs/tags/v2.0.0' }] } : null });
  await assert.rejects(autoTagRelease(f.options), /inferior a uma tag existente/); assert.deepEqual(f.writes, []);
});

test("auto tag resume tag created in the same commit and avoid dispatching existing or ongoing release", async () => {
  const { autoTagRelease } = await import('../scripts/release/auto-tag.mjs');
  const existing = { object: { type: 'commit', sha: commit } };
  let f = autoTagFixture({ existing });
  assert.deepEqual(await autoTagRelease(f.options), { status: 'dispatched', tag: 'v1.2.3', sourceCommit: commit, created: false });
  assert.equal(f.writes.length, 1); assert.match(f.writes[0].path, /dispatches$/);
  f = autoTagFixture({ existing, release: { tag_name: 'v1.2.3', draft: false } });
  assert.equal((await autoTagRelease(f.options)).reason, 'release-exists'); assert.deepEqual(f.writes, []);
  f = autoTagFixture({ existing, release: { tag_name: 'v1.2.3', draft: true } });
  await assert.rejects(autoTagRelease(f.options), /incompleta/); assert.deepEqual(f.writes, []);
  const active = { head_sha: commit, head_branch: 'v1.2.3', path: '.github/workflows/release.yml', status: 'in_progress', repository: { full_name: repository }, head_repository: { full_name: repository } };
  f = autoTagFixture({ existing, runs: [active] });
  assert.equal((await autoTagRelease(f.options)).reason, 'release-in-progress'); assert.deepEqual(f.writes, []);
});

test("auto tag solves annotated tags, competition and fault propagation without moving references", async () => {
  const { autoTagRelease } = await import('../scripts/release/auto-tag.mjs');
  const annotated = { object: { type: 'tag', sha: 'c'.repeat(40) } };
  let f = autoTagFixture({ existing: annotated, onCall: ({ path }) => path.includes('/git/tags/') ? { handled: true, value: { object: { type: 'commit', sha: commit } } } : null });
  assert.equal((await autoTagRelease(f.options)).status, 'dispatched');
  f = autoTagFixture({ onCall: ({ method, path, setTag }) => {
    if (method === 'POST' && path.endsWith('/git/refs')) { setTag({ object: { type: 'commit', sha: commit } }); throw new Error('GitHub POST falhou: HTTP 409.'); }
    return null;
  } });
  assert.equal((await autoTagRelease(f.options)).status, 'dispatched');
  f = autoTagFixture({ onCall: ({ method, path, setTag }) => {
    if (method === 'POST' && path.endsWith('/git/refs')) { setTag({ object: { type: 'commit', sha: commit } }); throw new Error('GitHub POST falhou: HTTP 422.'); }
    return null;
  } });
  assert.equal((await autoTagRelease(f.options)).status, 'dispatched');
  f = autoTagFixture({ onCall: ({ method, path, setTag }) => {
    if (method === 'POST' && path.endsWith('/git/refs')) { setTag({ object: { type: 'commit', sha: 'd'.repeat(40) } }); throw new Error('GitHub POST falhou: HTTP 422.'); }
    return null;
  } });
  await assert.rejects(autoTagRelease(f.options), /HTTP 422/); assert.equal(f.writes.length, 1);
  f = autoTagFixture({ onCall: ({ method, path }) => { if (method === 'POST' && path.endsWith('/git/refs')) throw new Error('GitHub POST falhou: HTTP 403.'); return null; } });
  await assert.rejects(autoTagRelease(f.options), /HTTP 403/); assert.equal(f.writes.length, 1);
  f = autoTagFixture({ onCall: ({ method, path }) => { if (method === 'POST' && path.endsWith('/dispatches')) throw new Error('GitHub POST falhou: HTTP 503.'); return null; } });
  await assert.rejects(autoTagRelease(f.options), /HTTP 503/); assert.equal(f.writes.length, 2);
});

test("tag created in finished IC remains publicable if branch advances; tag moved prevents dismatch", async () => {
  const { autoTagRelease } = await import('../scripts/release/auto-tag.mjs');
  let branchReads = 0;
  let f = autoTagFixture({ onCall: ({ path }) => {
    if (path.includes('/git/ref/heads/')) return { handled: true, value: { object: { type: 'commit', sha: ++branchReads === 1 ? commit : 'd'.repeat(40) } } };
    return null;
  } });
  assert.equal((await autoTagRelease(f.options)).status, 'dispatched'); assert.equal(branchReads, 1);
  let tagReads = 0;
  f = autoTagFixture({ onCall: ({ path }) => {
    if (path.includes('/git/ref/tags/') && ++tagReads === 2) return { handled: true, value: { object: { type: 'commit', sha: 'd'.repeat(40) } } };
    return null;
  } });
  await assert.rejects(autoTagRelease(f.options), /tag mudou/);
  assert.deepEqual(f.writes.map(x => x.path), [`/repos/${repository}/git/refs`]);
});

test("real workflow creates tag only after IC completed and calls release without waiting for it", () => {
  const workflow = readFileSync(join(root, '.github/workflows/auto-release.yml'), 'utf8');
  const job = workflow.split('\n  tag:\n')[1];
  assert.ok(job, 'Job tag ausente');
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /workflows:\s*\[CI\]/);
  assert.match(workflow, /types:\s*\[completed\]/);
  assert.match(workflow, /group:\s*automatic-release-\$\{\{\s*github\.event\.workflow_run\.event\s*\}\}-\$\{\{\s*github\.event\.workflow_run\.head_repository\.full_name\s*\}\}-\$\{\{\s*github\.event\.workflow_run\.head_branch\s*\}\}/);
  assert.match(job, /github\.event\.workflow_run\.conclusion\s*==\s*'success'/);
  assert.match(job, /github\.event\.workflow_run\.event\s*==\s*'push'/);
  assert.match(job, /github\.event\.repository\.default_branch/);
  assert.match(job, /ref:\s*\$\{\{\s*github\.event\.workflow_run\.head_sha\s*\}\}/);
  assert.match(job, /persist-credentials:\s*false/);
  assert.match(job, /contents:\s*write/);
  assert.match(job, /actions:\s*write/);
  assert.match(job, /node scripts\/release\/auto-tag\.mjs/);
  assert.doesNotMatch(job, /gh run watch|workflow.*wait/);
});

test("IC sends execution artifact by unique path and explicit option", () => {
  const workflow=readFileSync(join(root,'.github/workflows/ci.yml'),'utf8');
  assert.match(workflow,/node scripts\/release\/pipeline\.mjs \$\{\{ matrix\.profile \}\} --github-output/);
  assert.match(workflow,/id: verify/);
  assert.match(workflow,/path: \$\{\{ steps\.verify\.outputs\.artifact_path \}\}/);
});
