import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmExecutable, sha256 } from '../scripts/release/assets.mjs';
import { executeNode, guardSourceOnlyGit, markVerified, portableProfiles, runPipeline, verifyPortableClassification } from '../scripts/release/pipeline.mjs';
import { assertApprovedSource, githubRequest, publishVerifiedPackage, releaseTag, resolveVerifiedPackage, verifyDistribution } from '../scripts/release/publish.mjs';

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
  const expected = ['adapters.test.mjs', 'cli.test.mjs', 'client-selection.test.mjs', 'development-ecosystem.test.mjs', 'documentation-compatibility.test.mjs', 'github-packages.test.mjs', 'native-coexistence.test.mjs', 'next.test.mjs', 'managed-content.test.mjs', 'managed-content-helper.test.mjs', 'managed-toml.test.mjs', 'managed-preservation.test.mjs', 'security-ecosystem.test.mjs', 'source-layout.test.mjs', 'state-migration.test.mjs', 'preservation-lifecycle.test.mjs', 'file-modes.test.mjs', 'oss-preservation.test.mjs', 'release-pipeline.test.mjs', 'release-resilience.test.mjs'].sort();
  const combined = Object.values(portableProfiles).flat();
  assert.equal(new Set(combined).size, combined.length);
  assert.deepEqual(combined.toSorted(), expected);
  const calls = [];
  const options = { root, run(_root, args) { calls.push(args); } };
  for (const [profile, files] of Object.entries(portableProfiles)) {
    const group = [];
    runPipeline(profile, { root, run(_root, args) { group.push(args); } });
    assert.deepEqual(group[0], ['--test', '--test-concurrency=2', ...files.map(file => `tests/${file}`)]);
    assert.equal(group.length, profile === 'portable-resources' ? 6 : 1);
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

test('matriz roda cada grupo portátil exatamente uma vez em cada SO e falhas bloqueiam o CI', () => {
  const workflow = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
  assert.match(workflow, /fail-fast:\s*false/);
  assert.doesNotMatch(workflow, /continue-on-error:/);
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
