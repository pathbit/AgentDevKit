import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmExecutable, sha256 } from '../scripts/release/assets.mjs';
import { publishRegistryPackage } from '../scripts/release/packages.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = '1.2.3', packageName = '@pathbit/agentdevkit';
const repository = 'pathbit/AgentDevKit', commit = 'a'.repeat(40);
const resolution = { schemaVersion: 1, repository, tag: `v${version}`, version, sourceCommit: commit,
  runId: 42, runAttempt: 2, branch: 'master', workflowPath: '.github/workflows/ci.yml', artifactId: 50 };
const run = { head_sha: commit, head_branch: 'master', event: 'push', path: resolution.workflowPath,
  status: 'completed', conclusion: 'success', run_attempt: 2,
  repository: { full_name: repository }, head_repository: { full_name: repository } };
const request = async (_method, path) => path.includes('/actions/runs/')
  ? run : { object: { type: 'commit', sha: commit } };
const env = { ...process.env, NODE_AUTH_TOKEN: 'test-secret-do-not-log', GH_TOKEN: 'test-github-secret' };

function fixture(t, archive = Buffer.from('exact approved archive bytes'), releaseVersion = version) {
  const base = join(root, '.agent-tests'); mkdirSync(base, { recursive: true });
  const directory = mkdtempSync(join(base, 'github-packages com espaço-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = `agentdevkit-${releaseVersion}.tgz`, path = join(directory, file), digest = sha256(archive);
  writeFileSync(path, archive);
  writeFileSync(join(directory, 'package-manifest.json'), JSON.stringify({ version: releaseVersion, file, sha256: digest,
    sourceCommit: commit, provenance: { repository, runId: '42', runAttempt: '2', event: 'push', ref: 'refs/heads/master' },
    verification: { status: 'passed', profile: 'full', sourceCommit: commit } }));
  writeFileSync(join(directory, 'SHA256SUMS'), `${digest}  ${file}\n`);
  writeFileSync(join(directory, 'NOTES.txt'), 'Approved release.');
  return { directory, path, archive,
    integrity: `sha512-${createHash('sha512').update(archive).digest('base64')}` };
}

const success = value => ({ status: 0, stdout: typeof value === 'string' ? value : JSON.stringify(value), stderr: '' });
const failure = code => ({ status: 1, stdout: JSON.stringify({ error: { code, summary: env.NODE_AUTH_TOKEN } }), stderr: '' });

function mock(fixture, options = {}) {
  const calls = [], sleeps = [], views = [...(options.views || [null, { integrity: fixture.integrity }])];
  const execute = async (command, args, config) => {
    const action = args[1];
    calls.push({ command, args, config });
    if (action === 'pack') return success([{ name: packageName, version, integrity: fixture.integrity, ...options.metadata }]);
    if (action === 'view') {
      const result = views.length > 1 ? views.shift() : views[0];
      return result === null ? failure('E404') : typeof result === 'string' ? failure(result) : success(result);
    }
    if (action === 'publish') { options.onPublish?.(); return options.publishResult || success({ id: `${packageName}@${version}` }); }
    if (action === 'exec') return options.execResult || success({ ok: true, command: 'version', version });
    assert.fail(`Unexpected npm action: ${action}`);
  };
  return { calls, sleeps, options: { directory: fixture.directory, resolution, env, request, execute,
    sleep: async milliseconds => sleeps.push(milliseconds), maxAttempts: 3, pollMs: 1 } };
}

test('publica o TGZ aprovado uma vez e executa a versão pelo registry em cache novo', async t => {
  const f = fixture(t), m = mock(f);
  const result = await publishRegistryPackage(m.options);
  assert.equal(result.status, 'published'); assert.equal(result.integrity, f.integrity);
  assert.deepEqual(result.probe, { status: 'passed', version });
  assert.deepEqual(m.calls.map(call => call.args[1]), ['pack', 'view', 'publish', 'view', 'exec']);
  assert.deepEqual(m.calls[0].args.slice(1), ['pack', f.path, '--dry-run', '--ignore-scripts', '--json']);
  assert.deepEqual(m.calls[2].args.slice(1), ['publish', f.path, '--registry=https://npm.pkg.github.com', '--ignore-scripts', '--json']);
  assert.deepEqual(m.calls[4].args.slice(1), ['exec', '--yes', '--ignore-scripts', '--registry=https://npm.pkg.github.com', `--package=${packageName}@${version}`, '--', 'agentdevkit', '--version', '--json']);
  assert.notEqual(m.calls[0].config.env.npm_config_cache, m.calls[4].config.env.npm_config_cache);
  assert.equal(m.calls[4].config.env.npm_config_offline, 'false');
  assert.ok(!existsSync(m.calls[0].config.cwd));
  assert.deepEqual(readFileSync(f.path), f.archive);
});

test('versão já publicada com mesmos bytes é idempotente e ainda prova npm exec', async t => {
  const f = fixture(t), m = mock(f, { views: [{ integrity: f.integrity }] });
  assert.equal((await publishRegistryPackage(m.options)).status, 'skipped');
  assert.deepEqual(m.calls.map(call => call.args[1]), ['pack', 'view', 'exec']);
});

test('conflito de conteúdo nunca publica nem executa', async t => {
  const f = fixture(t), m = mock(f, { views: [{ integrity: 'sha512-other' }] });
  await assert.rejects(publishRegistryPackage(m.options), /tarball diferente/);
  assert.deepEqual(m.calls.map(call => call.args[1]), ['pack', 'view']);
  assert.ok(!existsSync(m.calls[0].config.cwd));
});

test('autenticação e rede não são confundidas com pacote ausente e não expõem token', async t => {
  for (const code of ['E401', 'E403', 'ENETUNREACH', 'ETIMEDOUT']) await t.test(code, async subtest => {
    const f = fixture(subtest), m = mock(f, { views: [code] });
    await assert.rejects(publishRegistryPackage(m.options), error => {
      assert.match(error.message, new RegExp(code));
      assert.ok(!error.message.includes(env.NODE_AUTH_TOKEN)); return true;
    });
    assert.equal(m.calls.length, 2);
  });
});

test('nome, versão e integridade interna são conferidos antes de consultar o registry', async t => {
  for (const metadata of [{ name: '@other/agentdevkit' }, { version: '9.0.0' }, { integrity: 'sha512-other' }]) {
    const f = fixture(t), m = mock(f, { metadata });
    await assert.rejects(publishRegistryPackage(m.options), /interna do tarball/);
    assert.equal(m.calls.length, 1);
  }
});

test('artefato alterado, token ausente e namespace diferente falham sem npm', async t => {
  const f = fixture(t), m = mock(f);
  await assert.rejects(publishRegistryPackage({ ...m.options, env: {} }), /NODE_AUTH_TOKEN/);
  await assert.rejects(publishRegistryPackage({ ...m.options, packageName: '@other/tool' }), /não autorizado/);
  writeFileSync(f.path, 'changed');
  await assert.rejects(publishRegistryPackage(m.options), /SHA-256/);
  assert.equal(m.calls.length, 0);
});

test('CI revogado ou tag movida impedem publicação no registry', async t => {
  for (const scenario of ['failed', 'moved']) {
    const f = fixture(t), m = mock(f);
    const invalidRequest = async (_method, path) => path.includes('/actions/runs/')
      ? { ...run, conclusion: scenario === 'failed' ? 'failure' : 'success' }
      : { object: { type: 'commit', sha: scenario === 'moved' ? 'b'.repeat(40) : commit } };
    await assert.rejects(publishRegistryPackage({ ...m.options, request: invalidRequest }));
    assert.deepEqual(m.calls.map(call => call.args[1]), ['pack']);
  }
});

test('visibilidade após publicar tem retentativas limitadas', async t => {
  const f = fixture(t), m = mock(f, { views: [null, null, null, { integrity: f.integrity }] });
  assert.equal((await publishRegistryPackage(m.options)).status, 'published');
  assert.deepEqual(m.sleeps, [1, 1]);
  const timeout = mock(f, { views: [null] });
  await assert.rejects(publishRegistryPackage(timeout.options), /não está visível/);
  assert.equal(timeout.calls.filter(call => call.args[1] === 'view').length, 4);
  assert.equal(timeout.calls.filter(call => call.args[1] === 'publish').length, 1);
  assert.deepEqual(timeout.sleeps, [1, 1]);
});

test('falha de publicação ou integridade pós-publicação interrompe a prova de execução', async t => {
  const f = fixture(t), rejected = mock(f, { publishResult: failure('E403') });
  await assert.rejects(publishRegistryPackage(rejected.options), /E403/);
  assert.equal(rejected.calls.length, 3);
  const mismatch = mock(f, { views: [null, { integrity: 'sha512-other' }] });
  await assert.rejects(publishRegistryPackage(mismatch.options), /tarball diferente/);
  assert.equal(mismatch.calls.length, 4);
});

test('exec precisa informar sucesso e a mesma versão, inclusive quando já publicada', async t => {
  for (const execResult of [failure('E401'), success({ ok: true, command: 'version', version: '9.0.0' }), success('not JSON')]) {
    const f = fixture(t), m = mock(f, { views: [{ integrity: f.integrity }], execResult });
    await assert.rejects(publishRegistryPackage(m.options), /npm exec|versão executada/);
    assert.ok(!m.calls.some(call => call.args[1] === 'publish'));
  }
});

test('configuração temporária usa token só por ambiente e elimina overrides npm herdados', async t => {
  const f = fixture(t), m = mock(f);
  const delegate = m.options.execute;
  m.options.env = { ...env, NPM_CONFIG_REGISTRY: 'https://untrusted.example', NPM_CONFIG_OFFLINE: 'true' };
  m.options.execute = async (command, args, config) => {
    assert.ok(!args.join(' ').includes(env.NODE_AUTH_TOKEN));
    const npmrc = readFileSync(config.env.npm_config_userconfig, 'utf8');
    assert.ok(npmrc.includes('${NODE_AUTH_TOKEN}')); assert.ok(!npmrc.includes(env.NODE_AUTH_TOKEN));
    assert.equal(config.env.NPM_CONFIG_REGISTRY, undefined);
    assert.equal(config.env.npm_config_registry, 'https://npm.pkg.github.com');
    assert.equal(config.env.NPM_CONFIG_OFFLINE, undefined);
    return delegate(command, args, config);
  };
  await publishRegistryPackage(m.options);
});

test('inspeção real preserva TGZ antigo e atual sem presumir o caminho do executável', async t => {
  for (const release of [{ version: '0.0.3', bin: '.pbai4devs/bin/agentdevkit.mjs' }, { version, bin: 'bin/agentdevkit.mjs' }]) await t.test(release.version, async subtest => {
    const f = fixture(subtest), source = join(f.directory, 'source'); mkdirSync(source);
    writeFileSync(join(source, 'package.json'), JSON.stringify({ name: packageName, version: release.version, bin: { agentdevkit: release.bin } }));
    mkdirSync(dirname(join(source, release.bin)), { recursive: true });
    writeFileSync(join(source, release.bin), '#!/usr/bin/env node\nconsole.log("fixture");\n');
    const packed = spawnSync(process.execPath, [npmExecutable(), 'pack', '--ignore-scripts', '--json', '--pack-destination', f.directory], {
      cwd: source, env: { ...env, npm_config_cache: join(f.directory, 'pack-cache'), npm_config_offline: 'true' }, encoding: 'utf8', shell: false,
    });
    assert.equal(packed.status, 0, packed.stderr);
    const archive = readFileSync(join(f.directory, JSON.parse(packed.stdout)[0].filename));
    const real = fixture(subtest, archive, release.version), m = mock(real, {
      views: [{ integrity: real.integrity }], metadata: { version: release.version },
      execResult: success({ ok: true, command: 'version', version: release.version }),
    });
    m.options.resolution = { ...resolution, version: release.version, tag: `v${release.version}` };
    const delegate = m.options.execute;
    m.options.execute = (command, args, config) => args[1] === 'pack' ? spawnSync(command, args, config) : delegate(command, args, config);
    assert.equal((await publishRegistryPackage(m.options)).status, 'skipped');
    assert.deepEqual(readFileSync(real.path), archive);
  });
});
