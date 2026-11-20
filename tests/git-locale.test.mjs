import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import childProcess from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import { noGitRepository, planLocalIgnore, planUntrack } from '../.pbai4devs/scripts/lib/gitignore.mjs';
import { applyPlan, planInstallation } from '../src/install.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(repository, 'bin/agentdevkit.mjs');
const runtimeSupported = !process.versions.bun && Number(process.versions.node.split('.')[0]) >= 24;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-git-locale-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'human.txt'), 'conteúdo humano\n');
  return root;
}

function withFrenchLocale(t) {
  const keys = ['LC_ALL', 'LANG', 'LANGUAGE'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => { for (const key of keys) previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key]; });
  process.env.LC_ALL = 'C.UTF-8';
  process.env.LANG = 'C.UTF-8';
  process.env.LANGUAGE = 'fr';
}

function run(root, program, args) {
  return childProcess.spawnSync(program, args, { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
}

test('locale do usuário não impede consulta em projeto sem Git', t => {
  withFrenchLocale(t);
  const root = fixture(t), file = join(root, 'human.txt'), before = readFileSync(file);
  const plan = planLocalIgnore(root);
  assert.equal(plan.status, 'no-git');
  assert.deepEqual(plan.edits, []);
  const untrack = planUntrack(root, { 'human.txt': sha(before) });
  assert.deepEqual(untrack.paths, []);
  assert.deepEqual(untrack.conflicts, []);
  assert.deepEqual(readFileSync(file), before);
  assert.equal(existsSync(join(root, '.git')), false);
  assert.equal(process.env.LANGUAGE, 'fr');
  assert.equal(process.env.LC_ALL, 'C.UTF-8');
});

test('init sem Git funciona com locale externo e não altera conteúdo humano', { skip: !runtimeSupported ? 'A CLI do kit requer Node.js 24 ou superior nesta fixture.' : false, timeout: 120000 }, t => {
  withFrenchLocale(t);
  const root = fixture(t), file = join(root, 'human.txt'), before = readFileSync(file);
  const result = run(root, process.execPath, [cli, 'init', '--target', root, '--agents', 'codex', '--yes', '--json']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, true);
  assert.deepEqual(readFileSync(file), before);
  assert.equal(existsSync(join(root, '.git')), false);
});

test('erro operacional de configuração Git não vira projeto sem Git', t => {
  withFrenchLocale(t);
  const root = fixture(t), gitDir = join(root, '.git');
  const initialized = run(root, 'git', ['init', '--quiet']);
  assert.equal(initialized.status, 0, initialized.stderr);
  const human = readFileSync(join(root, 'human.txt'));
  const config = join(gitDir, 'config');
  writeFileSync(config, '[configuração inválida\n');
  const invalidConfig = readFileSync(config);
  assert.throws(() => planLocalIgnore(root));
  assert.throws(() => planUntrack(root, { 'human.txt': sha(human) }));
  assert.deepEqual(readFileSync(config), invalidConfig);
  assert.deepEqual(readFileSync(join(root, 'human.txt')), human);
});

test('erro operacional de configuração global não vira projeto sem Git', t => {
  withFrenchLocale(t);
  const root = fixture(t), file = join(root, 'human.txt'), human = readFileSync(file);
  const badConfig = join(root, 'git-config-inválida');
  writeFileSync(badConfig, '[configuração inválida\n');
  const previous = process.env.GIT_CONFIG_GLOBAL;
  t.after(() => { if (previous === undefined) delete process.env.GIT_CONFIG_GLOBAL; else process.env.GIT_CONFIG_GLOBAL = previous; });
  process.env.GIT_CONFIG_GLOBAL = badConfig;
  assert.throws(() => planLocalIgnore(root));
  assert.throws(() => planUntrack(root, { 'human.txt': sha(human) }));
  assert.deepEqual(readFileSync(file), human);
  assert.equal(existsSync(join(root, '.git')), false);
});

test('init recusa configuração Git global inválida antes de alterar o projeto', { skip: !runtimeSupported ? 'A CLI do kit requer Node.js 24 ou superior nesta fixture.' : false, timeout: 120000 }, t => {
  withFrenchLocale(t);
  const root = fixture(t), human = readFileSync(join(root, 'human.txt'));
  const badConfig = join(root, 'git-config-inválida');
  writeFileSync(badConfig, '[configuração inválida\n');
  const config = readFileSync(badConfig), names = readdirSync(root).sort();
  const previous = process.env.GIT_CONFIG_GLOBAL;
  t.after(() => { if (previous === undefined) delete process.env.GIT_CONFIG_GLOBAL; else process.env.GIT_CONFIG_GLOBAL = previous; });
  process.env.GIT_CONFIG_GLOBAL = badConfig;
  const result = run(root, process.execPath, [cli, 'init', '--target', root, '--agents', 'codex', '--yes', '--json']);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, false);
  assert.equal(output.error.code, 'E_GIT');
  assert.match(output.error.detail, /exit status \d+.*Check the Git installation and configuration/);
  assert.doesNotMatch(output.error.detail, /git-config-inválida|configuração inválida/);
  assert.deepEqual(readdirSync(root).sort(), names);
  assert.deepEqual(readFileSync(join(root, 'human.txt')), human);
  assert.deepEqual(readFileSync(badConfig), config);
});

test('classificação de consulta Git exige ausência comprovada e recusa sinais', t => {
  const root = fixture(t);
  const absent = { status: 128, signal: null, stderr: Buffer.from('fatal: not a git repository\n') };
  const unavailable = { status: null, signal: null, error: Object.assign(new Error('Git indisponível'), { code: 'ENOENT' }) };
  assert.equal(noGitRepository(root, absent), true);
  assert.equal(noGitRepository(root, unavailable), true);
  assert.equal(noGitRepository(root, { ...absent, status: 1 }), false);
  assert.equal(noGitRepository(root, { ...absent, signal: 'SIGTERM' }), false);
  assert.equal(noGitRepository(root, { status: 128, signal: null, stderr: 'fatal: invalid configuration' }), false);
  assert.equal(noGitRepository(root, { status: null, signal: null, error: Object.assign(new Error('falha'), { code: 'EACCES' }) }), false);
  mkdirSync(join(root, '.git'));
  const nested = join(root, 'nested'); mkdirSync(nested);
  assert.equal(noGitRepository(nested, absent), false);
  assert.equal(noGitRepository(nested, unavailable), false);
});

test('aplicação recusa configuração Git inválida e preserva o projeto', { skip: !runtimeSupported ? 'A CLI do kit requer Node.js 24 ou superior nesta fixture.' : false, timeout: 120000 }, t => {
  withFrenchLocale(t);
  const root = fixture(t), human = readFileSync(join(root, 'human.txt'));
  const badConfig = join(root, 'git-config-inválida');
  writeFileSync(badConfig, '[configuração inválida\n');
  const config = readFileSync(badConfig), names = readdirSync(root).sort();
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  assert.equal(plan.canApply, true);
  const previous = process.env.GIT_CONFIG_GLOBAL;
  t.after(() => { if (previous === undefined) delete process.env.GIT_CONFIG_GLOBAL; else process.env.GIT_CONFIG_GLOBAL = previous; });
  process.env.GIT_CONFIG_GLOBAL = badConfig;
  assert.throws(() => applyPlan(plan), { code: 'E_GIT' });
  assert.deepEqual(readdirSync(root).sort(), names);
  assert.deepEqual(readFileSync(join(root, 'human.txt')), human);
  assert.deepEqual(readFileSync(badConfig), config);
});

test('init sem executável Git recusa marcador ancestral e preserva índice', { skip: !runtimeSupported ? 'A CLI do kit requer Node.js 24 ou superior nesta fixture.' : false, timeout: 120000 }, t => {
  const root = fixture(t), nested = join(root, 'nested');
  for (const args of [['init', '--quiet'], ['add', '--', 'human.txt']]) {
    const result = run(root, 'git', args);
    assert.equal(result.status, 0, result.stderr);
  }
  mkdirSync(nested);
  const human = readFileSync(join(root, 'human.txt'));
  const index = readFileSync(join(root, '.git', 'index'));
  const env = { ...process.env, PATH: '' };
  const probe = childProcess.spawnSync('git', ['--version'], { cwd: nested, env, encoding: 'utf8' });
  if (probe.error?.code !== 'ENOENT') return t.skip('Não foi possível isolar a ausência de Git neste sistema.');
  const result = childProcess.spawnSync(process.execPath, [cli, 'init', '--target', nested, '--agents', 'codex', '--yes', '--json'], { cwd: nested, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).ok, false);
  assert.deepEqual(readdirSync(nested), []);
  assert.deepEqual(readFileSync(join(root, 'human.txt')), human);
  assert.deepEqual(readFileSync(join(root, '.git', 'index')), index);
});

test('locale externo preserva índice e exclusões de repositório válido', t => {
  withFrenchLocale(t);
  const root = fixture(t), human = readFileSync(join(root, 'human.txt'));
  for (const args of [['init', '--quiet'], ['add', '--', 'human.txt']]) {
    const result = run(root, 'git', args);
    assert.equal(result.status, 0, result.stderr);
  }
  const paths = ['.git/index', '.git/config', '.git/info/exclude'].map(path => join(root, path));
  const before = paths.map(path => existsSync(path) ? readFileSync(path) : null);
  assert.equal(planLocalIgnore(root).status, 'git');
  const untrack = planUntrack(root, { 'human.txt': sha(human) });
  assert.deepEqual(untrack.conflicts, []);
  assert.deepEqual(untrack.paths, ['human.txt']);
  paths.forEach((path, index) => assert.deepEqual(existsSync(path) ? readFileSync(path) : null, before[index]));
  assert.deepEqual(readFileSync(join(root, 'human.txt')), human);
});

for (const scenario of ['sinal', 'status inesperado', 'Git ausente com marcador', 'Git ausente sem marcador']) {
  test(`${scenario} tem resultado conservador nos dois planejadores`, t => {
    withFrenchLocale(t);
    const fixtureRoot = fixture(t), human = readFileSync(join(fixtureRoot, 'human.txt'));
    const root = scenario === 'Git ausente com marcador' ? join(fixtureRoot, 'nested') : fixtureRoot;
    if (root !== fixtureRoot) {
      mkdirSync(join(fixtureRoot, '.git'));
      mkdirSync(root);
      writeFileSync(join(root, 'human.txt'), human);
    }
    const spawn = childProcess.spawnSync, observations = [];
    t.mock.method(childProcess, 'spawnSync', (program, args, options) => {
      if (program !== 'git') return spawn(program, args, options);
      observations.push({ locale: options.env.LC_ALL, language: options.env.LANGUAGE });
      if (scenario === 'sinal') return { status: null, signal: 'SIGTERM', stderr: 'fatal: not a git repository', stdout: '' };
      if (scenario === 'status inesperado') return { status: 1, signal: null, stderr: 'fatal: not a git repository', stdout: '' };
      return { status: null, signal: null, error: Object.assign(new Error('Git indisponível'), { code: 'ENOENT' }), stderr: '', stdout: '' };
    });
    syncBuiltinESMExports();
    try {
      if (scenario === 'Git ausente sem marcador') {
        assert.equal(planLocalIgnore(root).status, 'no-git');
        const untrack = planUntrack(root, { 'human.txt': sha(human) });
        assert.deepEqual(untrack.paths, []);
        assert.deepEqual(untrack.conflicts, []);
        assert.equal(untrack.index, '');
        assert.equal(existsSync(join(root, '.git')), false);
      } else {
        assert.throws(() => planLocalIgnore(root));
        assert.throws(() => planUntrack(root, { 'human.txt': sha(human) }));
      }
    } finally {
      t.mock.restoreAll();
      syncBuiltinESMExports();
    }
    assert.equal(observations.length, 2);
    assert.ok(observations.every(item => item.locale === 'C' && item.language === 'C'));
    assert.deepEqual(readFileSync(join(root, 'human.txt')), human);
  });
}
