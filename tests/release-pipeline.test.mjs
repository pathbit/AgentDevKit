import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmExecutable, sha256 } from '../scripts/release/assets.mjs';
import { executeNode, fullTestGroups, guardSourceOnlyGit, markVerified, nodeProcessTimeoutMs, portableProfiles, runPipeline, verifyPortableClassification } from '../scripts/release/pipeline.mjs';
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

const reference = { object: { type: 'commit', sha: commit } };

test('tag manual permite backfill sem alterar a seleção dos eventos push', () => {
  const push = { GITHUB_EVENT_NAME: 'push', GITHUB_REF_TYPE: 'tag', GITHUB_REF_NAME: 'v0.0.3', AGENTDEVKIT_RELEASE_TAG: 'v9.9.9' };
  assert.equal(releaseTag(push), 'v0.0.3');
  assert.equal(releaseTag({ ...push, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF_TYPE: 'branch', GITHUB_REF_NAME: 'master', AGENTDEVKIT_RELEASE_TAG: 'v0.0.3' }), 'v0.0.3');
  assert.equal(releaseTag({ ...push, GITHUB_EVENT_NAME: 'workflow_dispatch', AGENTDEVKIT_RELEASE_TAG: '' }), 'v0.0.3');
  for (const tag of ['latest', 'v0.0.3-rc.1', 'v0.0.3\n', '../v0.0.3']) assert.throws(() => releaseTag({ GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF_TYPE: 'branch', AGENTDEVKIT_RELEASE_TAG: tag }), /vX.Y.Z/);
  assert.throws(() => releaseTag({ GITHUB_EVENT_NAME: 'push', GITHUB_REF_TYPE: 'branch', GITHUB_REF_NAME: 'master', AGENTDEVKIT_RELEASE_TAG: 'v0.0.3' }), /vX.Y.Z/);
});

test('workflow mantém registries separados e permite completar uma tag sem recriar a release', () => {
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

test('npm é localizado por Path quando Node não inclui npm, sem chamar wrappers', t => {
  const directory = fixture(t), bin = join(directory, 'npm-prefix');
  const executable = join(bin, 'node_modules/npm/bin/npm-cli.js');
  mkdirSync(dirname(executable), { recursive: true }); writeFileSync(executable, '// npm fixture');
  writeFileSync(join(bin, 'npm.cmd'), 'fixture: discovery only, never executed');
  assert.equal(npmExecutable({ Path: bin }, join(directory, 'isolated-node')), executable);
});

test('check Git distingue fontes de saídas e não gera arquivos no checkout', t => {
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
  const forbidden = ['.CoDeX/skills/probe/SKILL.md', 'CLAUDE.md', '.github/agents/probe.agent.md', '.github/prompts/probe.prompt.md', '.github/instructions/probe.md', '.github/skills/probe/SKILL.md', '.pbai4devs/catalog.json', '.pbai4devs/espelhos.conf', '.pbai4devs/state/agentdevkit.json', '.pbai4devs/state/derived.json', '.pbai4devs/estado/agentdevkit.json', '.pbai4devs/estado/derived.json', 'scripts/legacy.PS1'];
  for (const file of forbidden) {
    put(file); git('add', '--', file);
    assert.throws(() => guardSourceOnlyGit(directory), error => error.message.includes(JSON.stringify(file)), file);
    git('rm', '--cached', '--quiet', '--', file);
  }
  assert.ok(guardSourceOnlyGit(directory).files > 0);
});

test('perfis portáteis cobrem cada suíte uma vez e o comando local executa todos', () => {
  assert.deepEqual(portableProfiles['portable-selection'], ['client-selection.test.mjs']);
  assert.deepEqual(portableProfiles['portable-selection-codex'], ['client-selection-obstructions-codex.test.mjs']);
  assert.deepEqual(portableProfiles['portable-selection-all'], ['client-selection-obstructions-all.test.mjs']);
  assert.deepEqual(portableProfiles['portable-projects'], ['client-ignore.test.mjs', 'native-coexistence.test.mjs', 'oss-preservation.test.mjs']);
  assert.deepEqual(portableProfiles['portable-migration'], ['state-migration.test.mjs', 'preservation-lifecycle.test.mjs']);
  const expected = ['adapters.test.mjs', 'cli.test.mjs', 'client-selection.test.mjs', 'client-selection-obstructions-codex.test.mjs', 'client-selection-obstructions-all.test.mjs', 'client-ignore.test.mjs', 'development-ecosystem.test.mjs', 'documentation-compatibility.test.mjs', 'github-packages.test.mjs', 'native-coexistence.test.mjs', 'next.test.mjs', 'managed-content.test.mjs', 'managed-content-helper.test.mjs', 'managed-toml.test.mjs', 'managed-preservation.test.mjs', 'security-ecosystem.test.mjs', 'source-layout.test.mjs', 'state-migration.test.mjs', 'preservation-lifecycle.test.mjs', 'file-modes.test.mjs', 'oss-preservation.test.mjs', 'release-pipeline.test.mjs', 'release-resilience.test.mjs', 'resource-coverage.test.mjs'].sort();
  const combined = Object.values(portableProfiles).flat();
  assert.equal(new Set(combined).size, combined.length);
  assert.deepEqual(combined.toSorted(), expected);
  const calls = [];
  const options = { root, run(_root, args) { calls.push(args); } };
  for (const [profile, files] of Object.entries(portableProfiles)) {
    const group = [];
    runPipeline(profile, { root, run(_root, args) { group.push(args); } });
    assert.deepEqual(group[0], ['--test', '--test-concurrency=2', ...files.map(file => `tests/${file}`)]);
    assert.equal(group.length, profile === 'portable-resources' ? 7 : 1);
    calls.push(...group);
  }
  const individual = calls.splice(0);
  runPipeline('portable', options);
  assert.deepEqual(calls, individual);
  calls.length = 0;
  runPipeline('smoke', options);
  assert.deepEqual(calls, [
    ['--test', 'tests/adapters.test.mjs', 'tests/next.test.mjs'],
    ['bin/agentdevkit.mjs', '--help'],
    ['bin/agentdevkit.mjs', '--version'],
  ]);
});

test('classificação exige justificar cada suíte e detecta ausências e duplicatas', () => {
  const files = readdirSync(join(root, 'tests'));
  verifyPortableClassification(files);
  assert.throws(() => verifyPortableClassification([...files, 'nova.test.mjs']), /faltam: nova\.test\.mjs/);
  assert.throws(() => verifyPortableClassification(files.filter(file => file !== 'cli.test.mjs')), /ausentes: cli\.test\.mjs/);
  assert.throws(() => verifyPortableClassification(['a.test.mjs'], { profiles: { a: ['a.test.mjs'], b: ['a.test.mjs'] }, fullOnly: {} }), /duplicada/);
  assert.throws(() => verifyPortableClassification(['a.test.mjs'], { profiles: { a: [] }, fullOnly: { 'a.test.mjs': '' } }), /justificativa/);
});

test('perfil completo isola a seleção e executa todas as demais suítes uma vez', () => {
  const files = readdirSync(join(root, 'tests'));
  const groups = fullTestGroups(files);
  assert.deepEqual(groups[0], ['client-selection.test.mjs', 'client-selection-obstructions-codex.test.mjs', 'client-selection-obstructions-all.test.mjs']);
  const expected = files.filter(name => name.endsWith('.test.mjs') && name !== 'distribution.test.mjs').sort();
  assert.deepEqual(groups.flat().sort(), expected);
  assert.equal(new Set(groups.flat()).size, expected.length);
  assert.throws(() => fullTestGroups(files.filter(name => name !== 'client-selection.test.mjs')), /seleção ausente/);
  for (const file of groups[0]) assert.throws(() => fullTestGroups(files.filter(name => name !== file)), /seleção ausente/);
  const calls = [], failure = new Error('falha do segundo grupo');
  assert.throws(() => runPipeline('full', { root, run(_root, args) {
    calls.push(args);
    if (calls.length === 2) throw failure;
  } }), error => error === failure);
  assert.deepEqual(calls, groups.map(group => ['--test', '--test-concurrency=4', ...group.map(file => `tests/${file}`)]));
});

test('as suítes de obstrução cobrem as duas seleções e os cinco casos', () => {
  assert.deepEqual(obstructionKinds, ['root-link', 'skills-file', 'group-file', 'leaf-link', 'leaf-directory']);
  for (const selection of ['codex', 'all']) {
    const file = join(root, `tests/client-selection-obstructions-${selection}.test.mjs`);
    assert.match(readFileSync(file, 'utf8'), new RegExp(`registerObstructionTests\\('${selection}'\\)`));
  }
});

test('matriz roda cada grupo portátil exatamente uma vez em cada SO e falhas bloqueiam o CI', () => {
  const workflow = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
  assert.match(workflow, /fail-fast:\s*false/);
  assert.doesNotMatch(workflow, /continue-on-error:/);
  const jobTimeout = Number(workflow.match(/timeout-minutes:\s*(\d+)/)?.[1]);
  assert.ok(nodeProcessTimeoutMs >= 20 * 60 * 1000);
  assert.ok(jobTimeout * 60 * 1000 >= nodeProcessTimeoutMs + 5 * 60 * 1000);
  const rows = [...workflow.matchAll(/- os:\s*(\S+)\s+node:\s*(\d+)\s+profile:\s*(\S+)/g)].map(match => ({ os: match[1], node: match[2], profile: match[3] }));
  for (const os of ['windows-latest', 'macos-15-intel']) {
    assert.deepEqual(rows.filter(row => row.os === os && row.node === '24').map(row => row.profile).sort(), Object.keys(portableProfiles).sort());
  }
  assert.ok(rows.some(row => row.os === 'ubuntu-latest' && row.node === '24' && row.profile === 'full'));
  assert.match(workflow, /if:\s*matrix\.profile == 'full'/);
  for (const profile of ['portable', ...Object.keys(portableProfiles)]) {
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

test('seleção aguarda o CI correto e recusa origem de PR, fork, branch ou SHA diferentes', async () => {
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

test('tag anotada é resolvida; artefato expirado não provoca novo build', async () => {
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

test('ausência de CI termina no limite sem publicar ou disparar workflow', async () => {
  let clock = 0, requests = 0;
  const request = async (_method, path) => { requests++; return path.includes('/git/ref/') ? reference : { workflow_runs: [] }; };
  await assert.rejects(resolveVerifiedPackage({ repository, tag: 'v1.2.3', request, now: () => clock, sleep: async ms => { clock += ms; }, pollMs: 5, timeoutMs: 10 }), /Tempo esgotado/);
  assert.equal(clock, 10); assert.equal(requests, 4);
});

test('verificação exige bytes, checksum, commit e execução aprovados', t => {
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

test('publicação envia os bytes verificados e só torna pública após ambos uploads', async t => {
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

test('CI reprovado, tag movida e release existente bloqueiam qualquer escrita', async t => {
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

test('origem aprovada pode ser revalidada sem criar uma release', async () => {
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

test('falha no upload mantém draft e não publica parcialmente', async t => {
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

test('staging não reempacota; pacote alterado é recusado antes de marcar aprovação', t => {
  const directory = fixture(t);
  const staged = markVerified(directory, { RUNNER_TEMP: directory });
  assert.deepEqual(readFileSync(join(staged, manifest().file)), readFileSync(join(directory, manifest().file)));
  assert.equal(JSON.parse(readFileSync(join(staged, 'package-manifest.json'))).verification.profile, 'full');
  writeFileSync(join(directory, manifest().file), 'tampered');
  assert.throws(() => markVerified(directory, { RUNNER_TEMP: directory }), /mudou/);
});

test('cliente HTTP limita o token aos hosts oficiais e propaga falhas', async () => {
  const request = githubRequest({ token: 'fixture', fetchImpl: async (_url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer fixture');
    return { status: 403, ok: false };
  } });
  await assert.rejects(request('GET', '/repos/pathbit/AgentDevKit'), /HTTP 403/);
  await assert.rejects(request('POST', 'https://other.example/upload'), /Destino/);
});

// A criação da tag é isolada da publicação e não chama a rede nestes testes.
test('tag automática cria referência para o commit da matriz e dispara release explicitamente', async () => {
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

test('tag automática recusa evento não confiável, versão divergente e branch remoto inválido antes de escrever', async () => {
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

test('tag automática não move versão publicada e rejeita colisão ou histórico inacessível', async () => {
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

test('tag automática consulta CI exato e artefato atual antes de qualquer alteração', async () => {
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

test('tag automática bloqueia downgrade de latest com comparação inteira sem overflow', async () => {
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

test('tag maior impede publicação mesmo após commit sem mudança de versão; ignora pré-releases', async () => {
  const { autoTagRelease } = await import('../scripts/release/auto-tag.mjs');
  let f = autoTagFixture({ currentVersion: '1.2.3', beforeVersion: '1.2.3', onCall: ({ path }) => path.endsWith('/git/matching-refs/tags/v') ? { handled: true, value: [{ ref: 'refs/tags/v1.2.4' }] } : null });
  await assert.rejects(autoTagRelease(f.options), /inferior a uma tag existente/); assert.deepEqual(f.writes, []);
  f = autoTagFixture({ onCall: ({ path }) => path.endsWith('/git/matching-refs/tags/v') ? { handled: true, value: [{ ref: 'refs/tags/v9.9.9-rc.1' }, { ref: 'refs/tags/v1.2.2' }, { ref: 'refs/tags/other' }] } : null });
  assert.equal((await autoTagRelease(f.options)).status, 'dispatched');
  f = autoTagFixture({ existing: { object: { type: 'commit', sha: commit } }, onCall: ({ path }) => path.endsWith('/git/matching-refs/tags/v') ? { handled: true, value: [{ ref: 'refs/tags/v2.0.0' }] } : null });
  await assert.rejects(autoTagRelease(f.options), /inferior a uma tag existente/); assert.deepEqual(f.writes, []);
});

test('tag automática retoma tag criada no mesmo commit e evita despachar release existente ou em andamento', async () => {
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

test('tag automática resolve tags anotadas, concorrência e propagação de falhas sem mover referências', async () => {
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

test('tag criada em CI concluída continua publicável se o branch avançar; tag movida impede dispatch', async () => {
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

test('workflow real cria tag somente depois do CI concluído e chama release sem aguardá-la', () => {
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
