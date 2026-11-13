import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmExecutable, sha256 } from '../scripts/release/assets.mjs';
import { resolveVerifiedPackage } from '../scripts/release/publish.mjs';
import { publishRegistryPackage } from '../scripts/release/packages.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repository = 'pathbit/AgentDevKit', commit = 'a'.repeat(40), version = '1.2.3';
const resolution = { schemaVersion: 1, repository, tag: `v${version}`, version, sourceCommit: commit,
  runId: 42, runAttempt: 1, branch: 'master', workflowPath: '.github/workflows/ci.yml', artifactId: 50 };
const run = { id: 42, run_attempt: 1, head_sha: commit, head_branch: 'master', event: 'push',
  path: resolution.workflowPath, repository: { full_name: repository }, head_repository: { full_name: repository } };
const artifact = { id: 50, name: `agentdevkit-${commit}-1`, expired: false };

function fixture(t) {
  const base = join(root, '.agent-tests'); mkdirSync(base, { recursive: true });
  const directory = mkdtempSync(join(base, 'release-resilience-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = `agentdevkit-${version}.tgz`, archive = Buffer.from('approved archive');
  const hash = sha256(archive);
  writeFileSync(join(directory, file), archive);
  writeFileSync(join(directory, 'SHA256SUMS'), `${hash}  ${file}\n`);
  writeFileSync(join(directory, 'NOTES.txt'), 'Approved release.');
  writeFileSync(join(directory, 'package-manifest.json'), JSON.stringify({ version, file, sha256: hash,
    sourceCommit: commit, provenance: { repository, runId: '42', runAttempt: '1', event: 'push', ref: 'refs/heads/master' },
    verification: { status: 'passed', profile: 'full', sourceCommit: commit } }));
  return directory;
}

test('release aguarda CI pendente por mais de 17 minutos sem aceitar CI sem sucesso', async () => {
  let clock = 0, polls = 0;
  const request = async (_method, path) => {
    if (path.includes('/git/ref/')) return { object: { type: 'commit', sha: commit } };
    if (path.includes('/artifacts')) return { artifacts: [artifact] };
    polls++;
    return { workflow_runs: [{ ...run, status: clock < 18 * 60000 ? 'in_progress' : 'completed',
      conclusion: clock < 18 * 60000 ? null : 'success' }] };
  };
  const found = await resolveVerifiedPackage({ repository, tag: `v${version}`, request,
    now: () => clock, sleep: async ms => { clock += ms; } });
  assert.equal(clock, 18 * 60000);
  assert.ok(polls > 1);
  assert.equal(found.sourceCommit, commit);
  assert.equal(found.artifactId, 50);
});

test('CI falha ou rerun sem artefato da tentativa atual bloqueia a release', async t => {
  for (const scenario of [
    { name: 'falha', run: { ...run, status: 'completed', conclusion: 'failure' }, artifacts: [artifact] },
    { name: 'artefato antigo', run: { ...run, run_attempt: 2, status: 'completed', conclusion: 'success' }, artifacts: [artifact] },
  ]) await t.test(scenario.name, async () => {
    let artifactRequests = 0;
    const request = async (method, path) => {
      assert.equal(method, 'GET');
      if (path.includes('/git/ref/')) return { object: { type: 'commit', sha: commit } };
      if (path.includes('/artifacts')) { artifactRequests++; return { artifacts: scenario.artifacts }; }
      return { workflow_runs: [scenario.run] };
    };
    await assert.rejects(resolveVerifiedPackage({ repository, tag: `v${version}`, request }), /Execute o CI novamente/);
    assert.equal(artifactRequests, scenario.name === 'falha' ? 0 : 1);
  });
});

test('CI que não termina interrompe a espera no prazo sem publicar', async () => {
  let clock = 0;
  const request = async (method, path) => {
    assert.equal(method, 'GET');
    if (path.includes('/git/ref/')) return { object: { type: 'commit', sha: commit } };
    return { workflow_runs: [{ ...run, status: 'in_progress', conclusion: null }] };
  };
  await assert.rejects(resolveVerifiedPackage({ repository, tag: `v${version}`, request,
    now: () => clock, sleep: async ms => { clock += ms; } }), /Tempo esgotado/);
  assert.equal(clock, 35 * 60000);
});

test('limites dos jobs dão margem à espera do CI e aos dois registries', () => {
  const workflow = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8');
  const resolveJob = workflow.split('  resolve:\n')[1].split('\n  publish:')[0];
  const minutes = Number(resolveJob.match(/timeout-minutes:\s*(\d+)/)?.[1]);
  assert.ok(minutes >= 40);
  const publishMinutes = Number(workflow.split('  publish:\n')[1].match(/timeout-minutes:\s*(\d+)/)?.[1]);
  assert.ok(publishMinutes >= 50);
});

test('falhas de subprocesso são identificadas sem imprimir dados privados', async t => {
  const secret = 'ESECRET_PRIVATE_DATA';
  const cases = [
    { name: 'timeout', result: { status: null, signal: 'SIGTERM', error: { code: 'ETIMEDOUT', message: secret } }, matches: ['ETIMEDOUT', 'SIGTERM'] },
    { name: 'buffer', result: { status: null, signal: 'SIGTERM', error: { code: 'ENOBUFS', message: secret } }, matches: ['ENOBUFS', 'SIGTERM'] },
    { name: 'sinal', result: { status: null, signal: 'SIGKILL', error: null }, matches: ['SIGKILL'] },
    { name: 'saída', result: { status: 17, signal: null, error: null }, matches: ['saída 17'] },
    { name: 'código não confiável', result: { status: 1, signal: secret, error: { code: secret } }, matches: ['UNKNOWN'] },
    { name: 'lançamento', thrown: Object.assign(new Error(secret), { code: 'ENOENT' }), matches: ['ENOENT'] },
  ];
  for (const scenario of cases) await t.test(scenario.name, async subtest => {
    const directory = fixture(subtest);
    const execute = async () => {
      if (scenario.thrown) throw scenario.thrown;
      return { ...scenario.result, stdout: secret, stderr: secret };
    };
    await assert.rejects(publishRegistryPackage({ directory, resolution, execute,
      env: { npm_execpath: npmExecutable(), PATH: process.env.PATH, NPM_TOKEN: secret },
      readCache: async () => Buffer.alloc(0) }), error => {
      for (const value of scenario.matches) assert.ok(error.message.includes(value), error.message);
      assert.ok(!error.message.includes(secret));
      return true;
    });
  });
});

test('processo interrompido não é tratado como versão ausente ou propagação', async t => {
  for (const scenario of [
    { action: 'view', code: 'E404' },
    { action: 'cache', code: 'ETARGET' },
  ]) await t.test(`${scenario.action} ${scenario.code}`, async subtest => {
    const directory = fixture(subtest), calls = [];
    const integrity = `sha512-${createHash('sha512').update(Buffer.from('approved archive')).digest('base64')}`;
    const execute = async (_command, args) => {
      const action = args[1]; calls.push(action);
      if (action === scenario.action) return { status: null, signal: 'SIGKILL', error: null,
        stdout: '', stderr: `npm error code ${scenario.code}` };
      if (action === 'pack') return { status: 0, stdout: JSON.stringify([{ name: '@pathbit/agentdevkit', version, integrity }]) };
      if (action === 'view') return { status: 0, stdout: JSON.stringify({ integrity }) };
      assert.fail(`Não deveria executar npm ${action}`);
    };
    const request = async (_method, path) => path.includes('/actions/runs/')
      ? { ...run, status: 'completed', conclusion: 'success' }
      : { object: { type: 'commit', sha: commit } };
    await assert.rejects(publishRegistryPackage({ directory, resolution, execute, request,
      env: { npm_execpath: npmExecutable(), PATH: process.env.PATH, NPM_TOKEN: 'test-secret' },
      readCache: async () => Buffer.alloc(0), sleep: async () => assert.fail('Não deve repetir após interrupção') }), error => {
      assert.match(error.message, new RegExp(`npm ${scenario.action} falhou \\(${scenario.code}\\)`));
      assert.match(error.message, /SIGKILL/);
      return true;
    });
    assert.ok(!calls.includes('publish'));
    assert.equal(calls.filter(action => action === scenario.action).length, 1);
  });
});
