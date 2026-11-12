import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmExecutable, sha256 } from '../scripts/release/assets.mjs';
import { parseRegistryArgs, publishRegistryPackage } from '../scripts/release/packages.mjs';

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
const npmRuntime = { npm_execpath: npmExecutable() };
const env = { ...process.env, ...npmRuntime, GITHUB_ACTIONS: 'false', NPM_TOKEN: 'test-secret-do-not-log', GH_TOKEN: 'test-github-secret' };

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
const failure = code => ({ status: 1, stdout: JSON.stringify({ error: { code, summary: env.NPM_TOKEN } }), stderr: '' });

function mock(fixture, options = {}) {
  const calls = [], sleeps = [], views = [...(options.views || [null, { integrity: fixture.integrity }])];
  const downloads = [...(options.downloads || [true])];
  const execute = async (command, args, config) => {
    const action = args[1];
    calls.push({ command, args, config });
    if (action === '--version') return success(options.npmVersion || '11.6.2');
    if (action === 'pack') return success([{ name: packageName, version, integrity: fixture.integrity, ...options.metadata }]);
    if (action === 'view') {
      const result = views.length > 1 ? views.shift() : views[0];
      return result === null ? failure('E404') : typeof result === 'string' ? failure(result) : success(result);
    }
    if (action === 'cache') {
      const result = downloads.length > 1 ? downloads.shift() : downloads[0];
      return result === false ? failure('E404') : typeof result === 'string' ? failure(result) : typeof result === 'object' ? result : success('');
    }
    if (action === 'publish') { options.onPublish?.(); return options.publishResult || success({ id: `${packageName}@${version}` }); }
    if (action === 'exec') {
      const selected = args[args.indexOf('--') + 2];
      const command = selected === '--version' ? 'version' : selected;
      const label = command === 'sync' ? 'sync --check' : command;
      return options.execResults?.[label] || options.execResult || success({ ok: true, command, version: options.metadata?.version || version });
    }
    assert.fail(`Unexpected npm action: ${action}`);
  };
  return { calls, sleeps, options: { directory: fixture.directory, resolution, env, request, execute,
    sleep: async milliseconds => sleeps.push(milliseconds), maxAttempts: 3, pollMs: 1 } };
}

test('publica o TGZ aprovado e prova instalação pelo registry em cache novo', async t => {
  const f = fixture(t), m = mock(f);
  const result = await publishRegistryPackage(m.options);
  assert.equal(result.status, 'published'); assert.equal(result.integrity, f.integrity);
  assert.deepEqual(result.probe, { status: 'passed', version, commands: ['version', 'init', 'doctor', 'sync --check'], anonymous: true });
  assert.equal(result.url, 'https://www.npmjs.com/package/@pathbit/agentdevkit');
  assert.equal(result.authentication, 'token');
  assert.deepEqual(m.calls.map(call => call.args[1]), ['pack', 'view', 'publish', 'view', 'cache', 'exec', 'exec', 'exec', 'exec']);
  assert.deepEqual(m.calls[0].args.slice(1), ['pack', f.path, '--dry-run', '--ignore-scripts', '--json']);
  assert.deepEqual(m.calls[2].args.slice(1), ['publish', f.path, '--registry=https://registry.npmjs.org', '--access=public', '--ignore-scripts', '--json']);
  assert.deepEqual(m.calls[4].args.slice(1), ['cache', 'add', `${packageName}@${version}`, '--registry=https://registry.npmjs.org', '--ignore-scripts', '--json']);
  assert.deepEqual(m.calls[5].args.slice(1), ['exec', '--yes', '--ignore-scripts', '--registry=https://registry.npmjs.org', `--package=${packageName}@${version}`, '--', 'agentdevkit', '--version', '--json']);
  const target = join(dirname(m.calls[5].config.cwd), 'consumer');
  assert.deepEqual(m.calls[6].args.slice(8), ['init', '--target', target, '--agents', 'codex,claude', '--lang', 'en', '--yes', '--json']);
  assert.deepEqual(m.calls[7].args.slice(8), ['doctor', '--target', target, '--json']);
  assert.deepEqual(m.calls[8].args.slice(8), ['sync', '--check', '--target', target, '--json']);
  for (const call of m.calls.slice(5)) {
    assert.equal(call.config.cwd, m.calls[5].config.cwd);
    assert.equal(call.config.env.npm_config_cache, m.calls[5].config.env.npm_config_cache);
    assert.equal(call.config.shell, false);
  }
  assert.notEqual(m.calls[0].config.env.npm_config_cache, m.calls[5].config.env.npm_config_cache);
  assert.notEqual(m.calls[4].config.env.npm_config_cache, m.calls[5].config.env.npm_config_cache);
  assert.equal(m.calls[5].config.env.npm_config_offline, 'false');
  assert.ok(!existsSync(m.calls[0].config.cwd));
  assert.deepEqual(readFileSync(f.path), f.archive);
});

test('versão já publicada com mesmos bytes é idempotente e ainda prova o consumidor', async t => {
  const f = fixture(t), m = mock(f, { views: [{ integrity: f.integrity }] });
  m.options.env = { ...npmRuntime, GH_TOKEN: env.GH_TOKEN };
  const result = await publishRegistryPackage(m.options);
  assert.equal(result.status, 'skipped');
  assert.equal(result.authentication, 'not-needed');
  assert.deepEqual(m.calls.map(call => call.args[1]), ['pack', 'view', 'cache', 'exec', 'exec', 'exec', 'exec']);
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
      assert.ok(!error.message.includes(env.NPM_TOKEN)); return true;
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

test('artefato alterado e namespace diferente falham sem npm', async t => {
  const f = fixture(t), m = mock(f);
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
  await assert.rejects(publishRegistryPackage(timeout.options), /Publicação aceita; disponibilidade pendente/);
  assert.equal(timeout.calls.filter(call => call.args[1] === 'view').length, 4);
  assert.equal(timeout.calls.filter(call => call.args[1] === 'publish').length, 1);
  assert.deepEqual(timeout.sleeps, [1, 1]);
});

test('janela padrão tolera vinte minutos de análise com uma única publicação', async t => {
  const f = fixture(t), m = mock(f, { views: [...Array(121).fill(null), { integrity: f.integrity }] });
  delete m.options.maxAttempts; delete m.options.pollMs;
  let elapsed = 0;
  m.options.sleep = async milliseconds => { elapsed += milliseconds; m.sleeps.push(milliseconds); };
  const result = await publishRegistryPackage(m.options);
  assert.equal(result.status, 'published');
  assert.equal(elapsed, 20 * 60 * 1000);
  assert.equal(m.sleeps.length, 120);
  assert.ok(m.sleeps.every(milliseconds => milliseconds === 10000));
  assert.equal(m.calls.filter(call => call.args[1] === 'publish').length, 1);
  const lookups = m.calls.filter(call => call.args[1] === 'view');
  assert.equal(lookups.length, 122);
  for (const call of lookups) assert.deepEqual(Object.keys(call.config.env).filter(key => /token|secret|password|(?:^|_)auth(?:_|$)/i.test(key)), []);
  assert.equal(result.probe.anonymous, true);
});

test('janela padrão expirada informa pendência e nunca tenta publicar novamente', async t => {
  const f = fixture(t), m = mock(f, { views: [null] });
  delete m.options.maxAttempts; delete m.options.pollMs;
  let elapsed = 0; m.options.sleep = async milliseconds => { elapsed += milliseconds; };
  await assert.rejects(publishRegistryPackage(m.options), error => {
    assert.match(error.message, /Publicação aceita; disponibilidade pendente/);
    assert.match(error.message, /não republique automaticamente/);
    assert.ok(error.message.includes(`${packageName}@${version}`));
    return true;
  });
  assert.equal(elapsed, 20 * 60 * 1000);
  assert.equal(m.calls.filter(call => call.args[1] === 'publish').length, 1);
  assert.equal(m.calls.filter(call => call.args[1] === 'view').length, 122);
  assert.ok(!m.calls.some(call => call.args[1] === 'exec'));
  assert.ok(!existsSync(m.calls[0].config.cwd));
  assert.deepEqual(readFileSync(f.path), f.archive);
});

test('versão existente espera o tarball sem publicar novamente e usa cache separado', async t => {
  const f = fixture(t), m = mock(f, { views: [{ integrity: f.integrity }], downloads: [false, false, true] });
  const result = await publishRegistryPackage(m.options);
  assert.equal(result.status, 'skipped');
  assert.equal(result.authentication, 'not-needed');
  assert.equal(m.calls.filter(call => call.args[1] === 'publish').length, 0);
  assert.equal(m.calls.filter(call => call.args[1] === 'cache').length, 3);
  assert.deepEqual(m.sleeps, [1, 1]);
  const downloads = m.calls.filter(call => call.args[1] === 'cache');
  for (const call of downloads) {
    assert.equal(call.config.env.npm_config_cache, downloads[0].config.env.npm_config_cache);
    assert.deepEqual(Object.keys(call.config.env).filter(key => /token|secret|password|(?:^|_)auth(?:_|$)/i.test(key)), []);
  }
  assert.notEqual(downloads[0].config.env.npm_config_cache, m.calls.find(call => call.args[1] === 'exec').config.env.npm_config_cache);
});

test('versão existente sem tarball usa a mesma janela padrão e reconhece E404 textual', async t => {
  const f = fixture(t), m = mock(f, { views: [{ integrity: f.integrity }], downloads: [{ status: 1, stdout: '', stderr: `npm error code E404\n${env.NPM_TOKEN}` }] });
  delete m.options.maxAttempts; delete m.options.pollMs;
  let elapsed = 0; m.options.sleep = async milliseconds => { elapsed += milliseconds; };
  await assert.rejects(publishRegistryPackage(m.options), error => {
    assert.match(error.message, /Pacote já registrado; disponibilidade pendente/);
    assert.match(error.message, /não republique automaticamente/);
    assert.ok(!error.message.includes(env.NPM_TOKEN)); return true;
  });
  assert.equal(elapsed, 20 * 60 * 1000);
  assert.equal(m.calls.filter(call => call.args[1] === 'cache').length, 121);
  assert.equal(m.calls.filter(call => call.args[1] === 'view').length, 121);
  assert.equal(m.calls.filter(call => call.args[1] === 'publish').length, 0);
  assert.ok(!m.calls.some(call => call.args[1] === 'exec'));
  assert.ok(!existsSync(m.calls[0].config.cwd));
});

test('atraso de metadata e tarball compartilha tentativas após uma publicação', async t => {
  const f = fixture(t), m = mock(f, { views: [null, null, { integrity: f.integrity }], downloads: [false, true] });
  assert.equal((await publishRegistryPackage(m.options)).status, 'published');
  assert.deepEqual(m.sleeps, [1, 1]);
  assert.equal(m.calls.filter(call => call.args[1] === 'view').length, 4);
  assert.equal(m.calls.filter(call => call.args[1] === 'cache').length, 2);
  assert.equal(m.calls.filter(call => call.args[1] === 'publish').length, 1);
});

test('erro textual diferente de E404 no download interrompe sem expor credenciais', async t => {
  const f = fixture(t), m = mock(f, { views: [{ integrity: f.integrity }], downloads: [{ status: 1, stdout: '', stderr: `npm ERR! code E403\n${env.NPM_TOKEN}` }] });
  await assert.rejects(publishRegistryPackage(m.options), error => {
    assert.match(error.message, /npm cache falhou \(E403\)/);
    assert.ok(!error.message.includes(env.NPM_TOKEN)); return true;
  });
  assert.deepEqual(m.sleeps, []);
  assert.ok(!m.calls.some(call => ['publish', 'exec'].includes(call.args[1])));
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
    await assert.rejects(publishRegistryPackage(m.options), /npm exec/);
    assert.ok(!m.calls.some(call => call.args[1] === 'publish'));
  }
});

test('cada etapa exige JSON aprovado da mesma versão e para ao falhar', async t => {
  const steps = ['version', 'init', 'doctor', 'sync --check'];
  for (const [index, label] of steps.entries()) await t.test(label, async subtest => {
    const command = label === 'sync --check' ? 'sync' : label;
    for (const invalidResult of [failure('E401'), success('not JSON'), success({ ok: false, command, version }),
      success({ ok: true, command: 'wrong', version }), success({ ok: true, command, version: '9.0.0' })]) {
      const f = fixture(subtest), m = mock(f, { views: [{ integrity: f.integrity }], execResults: { [label]: invalidResult } });
      await assert.rejects(publishRegistryPackage(m.options), /npm exec/);
      assert.equal(m.calls.filter(call => call.args[1] === 'exec').length, index + 1);
      assert.ok(!existsSync(m.calls[0].config.cwd));
      assert.deepEqual(readFileSync(f.path), f.archive);
    }
  });
});

test('leituras e instalação são anônimas; publicação recebe somente seu token isolado', async t => {
  const f = fixture(t), m = mock(f);
  const delegate = m.options.execute;
  m.options.env = { ...env, NODE_AUTH_TOKEN: 'unrelated-auth', GITHUB_TOKEN: 'unrelated-github',
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'unrelated-oidc', ACTIONS_ID_TOKEN_REQUEST_URL: 'https://oidc.example',
    ANOTHER_SECRET: 'unrelated-secret', NPM_CONFIG_REGISTRY: 'https://untrusted.example', NPM_CONFIG_OFFLINE: 'true' };
  m.options.execute = async (command, args, config) => {
    assert.ok(!args.join(' ').includes(env.NPM_TOKEN));
    const npmrc = readFileSync(config.env.npm_config_userconfig, 'utf8');
    assert.ok(!npmrc.includes(env.NPM_TOKEN));
    if (args[1] === 'publish') {
      assert.ok(npmrc.includes('//registry.npmjs.org/:_authToken=${NPM_TOKEN}'));
      assert.equal(config.env.NPM_TOKEN, env.NPM_TOKEN);
      assert.equal(config.env.GH_TOKEN, undefined);
    } else {
      assert.doesNotMatch(npmrc, /authToken/);
      assert.deepEqual(Object.keys(config.env).filter(key => /token|secret|password|(?:^|_)auth(?:_|$)/i.test(key)), []);
    }
    assert.equal(config.env.NPM_CONFIG_REGISTRY, undefined);
    assert.equal(config.env.npm_config_registry, 'https://registry.npmjs.org');
    assert.equal(config.env.NPM_CONFIG_OFFLINE, undefined);
    return delegate(command, args, config);
  };
  await publishRegistryPackage(m.options);
});

test('primeira publicação exige NPM_TOKEN ou OIDC válido e nunca usa GITHUB_TOKEN como npm', async t => {
  for (const credentials of [{}, { GITHUB_TOKEN: 'github-only', NODE_AUTH_TOKEN: 'github-mapped-by-mistake' }, { NPM_TOKEN: 'bad\ntoken' }]) {
    const f = fixture(t), m = mock(f);
    m.options.env = { ...npmRuntime, ...credentials };
    await assert.rejects(publishRegistryPackage(m.options), /OIDC|NPM_TOKEN/);
    assert.ok(!m.calls.some(call => call.args[1] === 'publish'));
    assert.ok(!existsSync(m.calls[0].config.cwd));
  }
});

test('OIDC usa npm 11.5.1+ somente na publicação e mantém consumo anônimo', async t => {
  for (const npmVersion of ['11.5.1', '11.21.2', '12.2.0']) await t.test(npmVersion, async subtest => {
    const f = fixture(subtest), m = mock(f, { npmVersion });
    m.options.env = { ...npmRuntime, GITHUB_ACTIONS: 'true', ACTIONS_ID_TOKEN_REQUEST_URL: 'https://oidc.example', ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'oidc-secret' };
    const result = await publishRegistryPackage(m.options);
    assert.equal(result.authentication, 'oidc');
    const published = m.calls.find(call => call.args[1] === 'publish');
    assert.equal(published.config.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, 'oidc-secret');
    assert.equal(published.config.env.NPM_TOKEN, undefined);
    for (const call of m.calls.filter(call => call.args[1] !== 'publish')) assert.equal(call.config.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, undefined);
  });
  for (const fallback of [false, true]) {
    const f = fixture(t), m = mock(f, { npmVersion: '11.5.0' });
    m.options.env = { ...npmRuntime, GITHUB_ACTIONS: 'true', ACTIONS_ID_TOKEN_REQUEST_URL: 'https://oidc.example', ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'oidc-secret', ...(fallback ? { NPM_TOKEN: env.NPM_TOKEN } : {}) };
    if (!fallback) await assert.rejects(publishRegistryPackage(m.options), /11\.5\.1/);
    else {
      assert.equal((await publishRegistryPackage(m.options)).authentication, 'token');
      assert.equal(m.calls.find(call => call.args[1] === 'publish').config.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, undefined);
    }
  }
});

test('token configurado tem prioridade e não tenta OIDC', async t => {
  for (const npmVersion of ['11.5.0', '11.21.2']) await t.test(npmVersion, async subtest => {
    const f = fixture(subtest), m = mock(f, { npmVersion });
    m.options.env = { ...env, GITHUB_ACTIONS: 'true',
      ACTIONS_ID_TOKEN_REQUEST_URL: 'https://oidc.example',
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'oidc-not-configured' };
    const result = await publishRegistryPackage(m.options);
    assert.equal(result.authentication, 'token');
    const published = m.calls.find(call => call.args[1] === 'publish');
    assert.equal(published.config.env.NPM_TOKEN, env.NPM_TOKEN);
    assert.equal(published.config.env.ACTIONS_ID_TOKEN_REQUEST_URL, undefined);
    assert.equal(published.config.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, undefined);
    assert.ok(!m.calls.some(call => call.args[1] === '--version'));
    assert.equal(result.probe.anonymous, true);
  });
});

test('inspeção real preserva TGZ antigo e atual sem presumir o caminho do executável', async t => {
  for (const release of [{ version: '0.0.3', bin: '.pbai4devs/bin/agentdevkit.mjs' }, { version, bin: 'bin/agentdevkit.mjs' }]) await t.test(release.version, async subtest => {
    const f = fixture(subtest), source = join(f.directory, 'source'); mkdirSync(source);
    writeFileSync(join(source, 'package.json'), JSON.stringify({ name: packageName, version: release.version, bin: { agentdevkit: release.bin },
      ...(release.version === '0.0.3' ? { publishConfig: { registry: 'https://npm.pkg.github.com' } } : {}) }));
    mkdirSync(dirname(join(source, release.bin)), { recursive: true });
    writeFileSync(join(source, release.bin), '#!/usr/bin/env node\nconsole.log("fixture");\n');
    const packed = spawnSync(process.execPath, [npmExecutable(), 'pack', '--ignore-scripts', '--json', '--pack-destination', f.directory], {
      cwd: source, env: { ...env, npm_config_cache: join(f.directory, 'pack-cache'), npm_config_offline: 'true' }, encoding: 'utf8', shell: false,
    });
    assert.equal(packed.status, 0, packed.stderr);
    const archive = readFileSync(join(f.directory, JSON.parse(packed.stdout)[0].filename));
    const real = fixture(subtest, archive, release.version), m = mock(real, {
      views: [{ integrity: real.integrity }], metadata: { version: release.version },
    });
    m.options.resolution = { ...resolution, version: release.version, tag: `v${release.version}` };
    const delegate = m.options.execute;
    m.options.execute = (command, args, config) => {
      if (args[1] !== 'pack') return delegate(command, args, config);
      if (release.version === '0.0.3') {
        const dryRun = spawnSync(command, [args[0], 'publish', real.path, '--registry=https://registry.npmjs.org', '--access=public', '--ignore-scripts', '--dry-run', '--json'], {
          ...config, env: { ...config.env, npm_config_offline: 'true', npm_config_loglevel: 'notice' },
        });
        assert.equal(dryRun.status, 0, dryRun.stdout + dryRun.stderr);
        assert.match(dryRun.stderr, /Publishing to https:\/\/registry\.npmjs\.org/);
        assert.doesNotMatch(dryRun.stderr, /Publishing to https:\/\/npm\.pkg\.github\.com/);
      }
      return spawnSync(command, args, config);
    };
    assert.equal((await publishRegistryPackage(m.options)).status, 'skipped');
    assert.deepEqual(readFileSync(real.path), archive);
  });
});

function githubMock(f, options = {}) {
  const m = mock(f, options), requests = [];
  m.options.target = 'github';
  m.options.env = { ...env, GITHUB_PACKAGES_TOKEN: 'github-package-secret',
    GITHUB_ACTIONS: 'true', ACTIONS_ID_TOKEN_REQUEST_URL: 'https://unused-oidc.example', ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'unused-oidc-secret' };
  m.options.request = async (method, path) => {
    requests.push({ method, path });
    if (path === '/orgs/pathbit/packages/npm/agentdevkit') return options.packageMetadata === undefined
      ? { name: 'agentdevkit', package_type: 'npm', visibility: 'public', repository: { full_name: repository } }
      : options.packageMetadata;
    return request(method, path);
  };
  return { ...m, requests };
}

test('registry é um perfil validado, sem hosts arbitrários ou argumentos extras', async t => {
  assert.equal(parseRegistryArgs([]), 'npm');
  assert.equal(parseRegistryArgs(['publish']), 'npm');
  assert.equal(parseRegistryArgs(['publish', '--registry', 'npm']), 'npm');
  assert.equal(parseRegistryArgs(['publish', '--registry', 'github']), 'github');
  for (const args of [['publish', '--registry', 'https://npm.pkg.github.com'], ['github'], ['publish', '--registry'],
    ['publish', '--registry', '__proto__'], ['publish', '--registry', { toString: () => 'github' }],
    ['publish', '--registry', 'github', '--force']]) assert.throws(() => parseRegistryArgs(args), /Use publish/);
  const f = fixture(t), m = mock(f);
  for (const target of ['https://untrusted.example', null, { toString: () => 'github' }]) {
    await assert.rejects(publishRegistryPackage({ ...m.options, target }), /Registry não autorizado/);
  }
  assert.equal(m.calls.length, 0);
});

test('GitHub publica os mesmos bytes e autentica consultas e consumo somente nesse host', async t => {
  const f = fixture(t), m = githubMock(f), delegate = m.options.execute, configs = [];
  m.options.execute = async (command, args, config) => {
    const npmrc = readFileSync(config.env.npm_config_userconfig, 'utf8'); configs.push(npmrc);
    assert.equal(config.env.npm_config_registry, 'https://npm.pkg.github.com');
    assert.equal(config.env.NPM_TOKEN, undefined); assert.equal(config.env.GH_TOKEN, undefined);
    assert.equal(config.env.GITHUB_TOKEN, undefined); assert.equal(config.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, undefined);
    assert.equal(config.env.ACTIONS_ID_TOKEN_REQUEST_URL, undefined);
    assert.ok(!args.join(' ').includes('github-package-secret'));
    assert.ok(!npmrc.includes('github-package-secret')); assert.ok(!npmrc.includes(env.NPM_TOKEN));
    if (args[1] === 'pack') {
      assert.equal(config.env.GITHUB_PACKAGES_TOKEN, undefined); assert.doesNotMatch(npmrc, /authToken/);
    } else {
      assert.equal(config.env.GITHUB_PACKAGES_TOKEN, 'github-package-secret');
      assert.match(npmrc, /\/\/npm\.pkg\.github\.com\/:_authToken=\$\{GITHUB_PACKAGES_TOKEN\}/);
      assert.doesNotMatch(npmrc, /registry\.npmjs\.org/);
      if (process.platform !== 'win32') assert.equal(lstatSync(config.env.npm_config_userconfig).mode & 0o777, 0o600);
    }
    return delegate(command, args, config);
  };
  const result = await publishRegistryPackage(m.options);
  assert.equal(result.status, 'published'); assert.equal(result.registry, 'https://npm.pkg.github.com');
  assert.equal(result.authentication, 'github-token'); assert.equal(result.sha256, sha256(f.archive));
  assert.equal(result.url, 'https://github.com/pathbit/AgentDevKit/pkgs/npm/agentdevkit');
  assert.deepEqual(result.githubPackage, { visibility: 'public', repository });
  assert.equal(result.probe.anonymous, false);
  assert.deepEqual(result.probe.commands, ['version', 'init', 'doctor', 'sync --check']);
  assert.deepEqual(m.calls.find(c => c.args[1] === 'publish').args.slice(1),
    ['publish', f.path, '--registry=https://npm.pkg.github.com', '--access=public', '--ignore-scripts', '--json']);
  assert.ok(m.requests.some(r => r.path === '/orgs/pathbit/packages/npm/agentdevkit'));
  assert.ok(!m.calls.some(c => c.args[1] === '--version'));
  assert.ok(configs.length > 4); assert.ok(!existsSync(m.calls[0].config.cwd));
  assert.deepEqual(readFileSync(f.path), f.archive);
  assert.ok(!JSON.stringify(result).includes('secret'));
});

test('GitHub já publicado mantém versão e tarball sem outra publicação', async t => {
  const f = fixture(t), m = githubMock(f, { views: [{ integrity: f.integrity }] });
  const result = await publishRegistryPackage(m.options);
  assert.equal(result.status, 'skipped'); assert.equal(result.authentication, 'github-token');
  assert.equal(result.probe.anonymous, false);
  assert.ok(!m.calls.some(call => call.args[1] === 'publish'));
  assert.equal(m.calls.filter(call => call.args[1] === 'exec').length, 4);
  assert.deepEqual(readFileSync(f.path), f.archive);
});

test('GitHub exige token próprio mesmo para pacote público e não usa token npm ou OIDC', async t => {
  for (const credentials of [{}, { NPM_TOKEN: 'npm-only' }, { GITHUB_TOKEN: 'wrong-name' },
    { GITHUB_ACTIONS: 'true', ACTIONS_ID_TOKEN_REQUEST_URL: 'https://oidc.example', ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'oidc-only' },
    { GITHUB_PACKAGES_TOKEN: 'bad\ntoken' }]) {
    const f = fixture(t), m = githubMock(f, { views: [{ integrity: f.integrity }] });m.options.env = { ...npmRuntime, ...credentials };
    await assert.rejects(publishRegistryPackage(m.options), /GITHUB_PACKAGES_TOKEN/);
    assert.equal(m.calls.length, 0);
  }
});

test('GitHub não trata autenticação negada como versão ausente e não vaza segredos', async t => {
  for (const code of ['E401', 'E403', 'ENETUNREACH']) {
    const f = fixture(t), m = githubMock(f, { views: [code] });
    await assert.rejects(publishRegistryPackage(m.options), error => {
      assert.match(error.message, new RegExp(code)); assert.doesNotMatch(error.message, /github-package-secret|test-secret/); return true;
    });
    assert.ok(!m.calls.some(c => ['publish', 'exec'].includes(c.args[1])));
  }
});

test('GitHub recusa integridade diferente e exige visibilidade pública associada ao repo', async t => {
  const bad = fixture(t), mismatch = githubMock(bad, { views: [{ integrity: 'sha512-other' }] });
  await assert.rejects(publishRegistryPackage(mismatch.options), /tarball diferente/);
  assert.ok(!mismatch.calls.some(c => ['publish', 'exec'].includes(c.args[1])));
  for (const packageMetadata of [null, { name: 'other', package_type: 'npm', visibility: 'public', repository: { full_name: repository } },
    { name: 'agentdevkit', package_type: 'npm', visibility: 'private', repository: { full_name: repository } },
    { name: 'agentdevkit', package_type: 'npm', visibility: 'public', repository: { full_name: 'other/repo' } }]) {
    const f = fixture(t), m = githubMock(f, { views: [{ integrity: f.integrity }], packageMetadata });
    await assert.rejects(publishRegistryPackage(m.options), /GitHub Packages/);
    assert.ok(!m.calls.some(c => c.args[1] === 'exec'));
    assert.ok(m.requests.every(r => r.method === 'GET'));
    assert.deepEqual(readFileSync(f.path), f.archive);
  }
});

test('CLI registry GitHub prevalece sobre publishConfig npm sem reempacotar', async t => {
  const f = fixture(t), source = join(f.directory, 'source'); mkdirSync(source);
  writeFileSync(join(source, 'package.json'), JSON.stringify({ name: packageName, version,
    publishConfig: { registry: 'https://registry.npmjs.org', access: 'public' }, bin: { agentdevkit: 'cli.mjs' } }));
  writeFileSync(join(source, 'cli.mjs'), '#!/usr/bin/env node\nconsole.log("fixture");\n');
  const npm = npmExecutable();
  const packed = spawnSync(process.execPath, [npm, 'pack', '--ignore-scripts', '--json', '--pack-destination', f.directory], {
    cwd: source, env: { ...env, npm_config_cache: join(f.directory, 'pack-cache'), npm_config_offline: 'true' }, encoding: 'utf8', shell: false,
  });
  assert.equal(packed.status, 0, packed.stderr);
  const path = join(f.directory, JSON.parse(packed.stdout)[0].filename), before = readFileSync(path);
  const result = spawnSync(process.execPath, [npm, 'publish', path, '--registry=https://npm.pkg.github.com', '--access=public', '--ignore-scripts', '--dry-run', '--json'], {
    cwd: source, env: { ...env, npm_config_cache: join(f.directory, 'publish-cache'), npm_config_offline: 'true' }, encoding: 'utf8', shell: false,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stderr, /Publishing to https:\/\/npm\.pkg\.github\.com/);
  assert.doesNotMatch(result.stderr, /Publishing to https:\/\/registry\.npmjs\.org/);
  assert.deepEqual(readFileSync(path), before);
});
