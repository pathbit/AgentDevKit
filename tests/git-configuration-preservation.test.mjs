import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, chmodSync, linkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import childProcess, { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { planLocalIgnore, checkLocalIgnore, applyLocalIgnore, planUntrack, applyUntrack, restoreUntrack } from '../.pbai4devs/scripts/lib/gitignore.mjs';
import { safeGitEnvironment, gitOutputLines, gitPathsOverlap } from '../.pbai4devs/scripts/lib/git-environment.mjs';
import { attachErrorDiagnostics, collectErrorDiagnostics, markDiagnosticsBoundary, primaryDiagnosticError } from '../.pbai4devs/scripts/lib/error-reporting.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { planInstallation, applyPlan, inspect } from '../src/install.mjs';
import { main as cliMain } from '../src/cli.mjs';
import { inspectProjectRecovery } from '../.pbai4devs/scripts/lib/project-recovery.mjs';
import { verifyRecoveryBackup } from '../.pbai4devs/scripts/lib/recovery-backup.mjs';
const repo = fileURLToPath(new URL('..', import.meta.url));

function observePublicCreates(t, root, { beforeOpen, afterClose } = {}) {
  const open = fs.openSync, close = fs.closeSync, descriptors = new Map(), closed = [];
  t.mock.method(fs, 'openSync', (path, flags, ...rest) => {
    const name = typeof path === 'string' && path.startsWith(root + sep) ? relative(root, path).split(sep).join('/') : '';
    if (flags !== 'wx' || !name || name.startsWith('.agent-tests/') || name.startsWith('.git/')) return open(path, flags, ...rest);
    beforeOpen?.(path, name);
    const fd = open(path, flags, ...rest);
    descriptors.set(fd, path);
    return fd;
  });
  t.mock.method(fs, 'closeSync', fd => {
    const path = descriptors.get(fd);
    close(fd);
    if (path) {
      descriptors.delete(fd); closed.push(path);
      afterClose?.(path, closed.length);
    }
  });
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  return { descriptors, closed };
}

function observeBackupName(t) {
  const randomUUID = crypto.randomUUID;
  let nextBackup = true;
  t.mock.method(crypto, 'randomUUID', (...args) => {
    if (!nextBackup) return randomUUID(...args);
    nextBackup = false;
    return '12345678-1234-4234-8234-123456789abc';
  });
  syncBuiltinESMExports();
  return () => { nextBackup = true; };
}

function creationPath(args, options) {
  if (!args?.includes('-EncodedCommand') || typeof options?.input !== 'string') return;
  const path = JSON.parse(options.input).create;
  return typeof path === 'string' ? path.replace(/^\\\\\?\\/, '') : undefined;
}

function observePrivateStage(t, created) {
  const temporary = fs.realpathSync(tmpdir());
  if (process.platform === 'win32') {
    const spawn = childProcess.spawnSync;
    t.mock.method(childProcess, 'spawnSync', (program, args, options) => {
      const result = spawn(program, args, options);
      const path = creationPath(args, options);
      if (result.status === 0 && path && dirname(path) === temporary && basename(path).startsWith('agentdevkit-')) created(fs.realpathSync(path));
      return result;
    });
  } else {
    const mkdtemp = fs.mkdtempSync;
    t.mock.method(fs, 'mkdtempSync', (prefix, ...args) => {
      const path = mkdtemp(prefix, ...args);
      if (dirname(prefix) === temporary && basename(prefix) === 'agentdevkit-') created(fs.realpathSync(path));
      return path;
    });
  }
}

function observeReplacement(t, destination, published) {
  if (process.platform === 'win32') {
    const spawn = childProcess.spawnSync;
    t.mock.method(childProcess, 'spawnSync', (program, args, options) => {
      const result = spawn(program, args, options);
      if (options?.env?.AGENTDEVKIT_DESTINATION === destination && result.status === 0) published();
      return result;
    });
  } else {
    const rename = fs.renameSync;
    t.mock.method(fs, 'renameSync', (from, to) => {
      const result = rename(from, to);
      if (to === destination) published();
      return result;
    });
  }
}

function recoveryFixture() {
  mkdirSync(join(repo, 'tmp'), { recursive: true });
  const root = fs.realpathSync(mkdtempSync(join(repo, 'tmp/installer-failure-')));
  git(root, 'init', '-q', '-b', 'main');
  return root;
}

function checkRecoverablePartial(root, plan) {
  const state = inspectProjectRecovery(root);
  assert.equal(state.status, 'pending'); assert.equal(state.phase, 'begin');
  verifyRecoveryBackup(state.backup, state.backupManifest);
  if (plan) assert.throws(() => applyPlan(plan), error => error.code === 'E_RECOVERY_PENDING');
  return state;
}
const bin = join(repo, 'bin/agentdevkit.mjs');
const sync = join(repo, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');

test('diagnóstico truncado continua truncado após agregação e nova coleta', () => {
  const original = new Error('original');
  original.uncertainPaths = Array.from({ length: 4100 }, (_, index) => `caminho-${index}`);
  attachErrorDiagnostics(original);
  assert.equal(original.diagnosticsTruncated, true);
  const wrapper = new Error('externo', { cause: original });
  assert.equal(collectErrorDiagnostics(wrapper).truncated, true);
  const summarized = Object.assign(new Error('resumo'), { diagnosticsTruncated: true });
  assert.equal(collectErrorDiagnostics(summarized).truncated, true);
});

test('fronteira preserva causa e evita expor diagnósticos não mapeados', () => {
  const cause = Object.assign(new Error('erro do estágio'), { uncertainPaths: ['caminho/relativo'], cleanupFailures: [{ path: 'temporário/relativo', message: 'falha' }] });
  const retained = markDiagnosticsBoundary(Object.assign(new Error('erro externo', { cause }), {
    uncertainPaths: ['/tmp/estagio/caminho/relativo'],
    cleanupFailures: [{ path: '/tmp/estagio/temporário/relativo', message: 'falha' }],
    diagnosticsTruncated: true,
  }));
  const outer = new AggregateError([retained], 'outro erro');
  const result = collectErrorDiagnostics(outer);
  assert.deepEqual(result.preservedPaths, ['/tmp/estagio/caminho/relativo']);
  assert.deepEqual(result.cleanupFailures, [{ path: '/tmp/estagio/temporário/relativo', message: 'falha' }]);
  assert.equal(result.truncated, true); assert.equal(retained.cause, cause);
  const removed = markDiagnosticsBoundary(new Error('estágio removido', { cause }));
  assert.deepEqual(collectErrorDiagnostics(new AggregateError([removed], 'externo')).preservedPaths, []);
  assert.equal(removed.cause, cause);
});
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_NOSYSTEM: '1' };
const run = (cwd, command, args) => spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 180000, maxBuffer: 20 * 1024 * 1024 });
const git = (root, ...args) => { const r = run(root, 'git', args); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
const put = (root, path, contents) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, contents); };

test('diagnóstico reconhece marcador legado com BOM sem alterar exclusões ou índice', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-legacy-bom-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q');
  put(root, 'humano.txt', 'preparado\n'); git(root, 'add', 'humano.txt');
  const index = readFileSync(join(root, '.git/index'));
  for (const ending of ['\n', '\r\n']) {
    const exclude = '\uFEFF# BEGIN AGENTDEVKIT LOCAL 1234567890abcdef' + ending + '/.claude/' + ending + '# END AGENTDEVKIT LOCAL 1234567890abcdef' + ending;
    put(root, '.git/info/exclude', exclude);
    const plan = planLocalIgnore(root, { templateRoot: repo }), result = checkLocalIgnore(plan);
    assert.ok(result.pending.some(item => item.code === 'shared-ignore-legacy'));
    assert.equal(result.ok, false);
    assert.equal(readFileSync(join(root, '.git/info/exclude'), 'utf8'), exclude);
    assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  }
});
const stageSynthetic = (root, path, contents) => {
  const blob = spawnSync('git', ['-C', root, 'hash-object', '-w', '--stdin'], { env, input: contents, encoding: 'utf8' });
  assert.equal(blob.status, 0, blob.stderr);
  git(root, 'update-index', '--add', '--cacheinfo', `100644,${blob.stdout.trim()},${path}`);
};
test('saída Git preserva espaços e trata CRLF no Windows', () => {
  assert.deepEqual(gitOutputLines('/repo com espaço \n', 'linux'), ['/repo com espaço ']);
  assert.deepEqual(gitOutputLines('C:\\repo com espaço \r\n', 'win32'), ['C:\\repo com espaço ']);
  assert.deepEqual(gitOutputLines('/repo com CR\r\n', 'linux'), ['/repo com CR\r']);
  assert.deepEqual(gitOutputLines('C:\\repo \r\nC:\\repo \\.git\\info\\exclude\r\n', 'win32'), ['C:\\repo ', 'C:\\repo \\.git\\info\\exclude']);
});

test('diagnósticos percorrem agregados e ciclos com limites e deduplicação', () => {
  const primary = new Error('principal'); primary.rollbackPreservedPaths = ['primeiro', 'primeiro'];
  primary.cleanupFailures = [{ path: 'tmp', message: 'EACCES' }, { path: 'tmp', message: 'EACCES' }];
  const aggregate = new AggregateError([primary], 'agregado', { cause: primary }); primary.cause = aggregate;
  const result = collectErrorDiagnostics(aggregate);
  assert.deepEqual(result.preservedPaths, ['primeiro']); assert.deepEqual(result.cleanupFailures, [{ path: 'tmp', message: 'EACCES' }]);
  assert.equal(result.truncated, false);
  primary.cleanupFailures.push(null);
  const partial = collectErrorDiagnostics(aggregate);
  assert.equal(partial.truncated, true);
  assert.deepEqual(partial.preservedPaths, ['primeiro']);
  assert.deepEqual(partial.cleanupFailures, [{ path: 'tmp', message: 'EACCES' }]);
  const malformed = {}; Object.defineProperty(malformed, 'cause', { get() { throw new Error('getter'); } });
  assert.equal(collectErrorDiagnostics(malformed).truncated, true);
  const huge = new AggregateError(Array.from({ length: 4200 }, () => new Error('x')));
  assert.equal(collectErrorDiagnostics(huge).truncated, true);
});

test('init/update/sync funcionam em repositório com espaço final', {
  skip: process.platform === 'win32' ? 'A API Win32 usada pela fixture normaliza espaços no fim do nome.' : false,
  timeout: 120000,
}, t => {
  const space = mkdtempSync(join(tmpdir(), 'adk-trailing-space-')); t.after(() => rmSync(space, { recursive: true, force: true }));
  const root = join(space, 'repo '); mkdirSync(root); git(root, 'init', '-q', '-b', 'main');
  put(root, 'human.txt', 'conteúdo staged\n'); git(root, 'add', 'human.txt');
  const paths = ['.git/index', '.git/config', '.git/info/exclude'];
  const before = paths.map(path => readFileSync(join(root, path)));
  for (const command of ['init', 'update', 'sync']) {
    const args = command === 'init' ? ['init', '--agents', 'codex'] : [command];
    const result = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    paths.forEach((path, i) => assert.deepEqual(readFileSync(join(root, path)), before[i], path));
  }
});
for (const targetName of ['main', 'linked']) test(`init/update/sync conservam Git e ignores existentes em ${targetName}`, { timeout: 180000 }, t => {
  const dir = mkdtempSync(join(tmpdir(), 'adk-git-configuration-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const main = join(dir, 'main'), linked = join(dir, 'linked'); mkdirSync(main);
  git(main, 'init', '-q', '-b', 'main'); git(main, 'config', 'user.name', 'Teste'); git(main, 'config', 'user.email', 'teste@example.invalid');
  put(main, 'tracked.txt', 'antes\n'); git(main, 'add', 'tracked.txt'); git(main, 'commit', '-qm', 'base'); git(main, 'worktree', 'add', '-qb', 'other', linked);
  put(main, 'tracked.txt', 'staged main\n'); git(main, 'add', 'tracked.txt'); put(linked, 'tracked.txt', 'staged linked\n'); git(linked, 'add', 'tracked.txt');
  const current = targetName === 'main' ? main : linked, other = targetName === 'main' ? linked : main;
  put(current, '.gitignore', '# humano raiz\n/tmp/\n'); put(current, '.claude/.gitignore', '# humano staged\n');
  git(current, 'add', '-f', '.claude/.gitignore'); put(current, '.claude/.gitignore', '# humano agente\n/segredo\n');
  put(current, '.pbai4devs/.gitignore', '# humano kit\n/sigilo\n');
  put(other, '.claude/settings.json', '{"humano": true}\n');
  const files = [join(main, '.git/config'), join(main, '.git/info/exclude'), join(main, '.git/index'), join(main, '.git/worktrees/linked/index'), join(current, '.gitignore'), join(current, '.claude/.gitignore'), join(current, '.pbai4devs/.gitignore'), join(other, '.claude/settings.json')];
  const before = files.map(file => readFileSync(file)); const otherStatus = git(other, 'status', '--short', '--untracked-files=all');
  for (const args of [['init', '--agents', 'claude'], ['update'], ['sync']]) {
    const r = run(current, process.execPath, [bin, ...args, '--target', current, '--json']);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const result = JSON.parse(r.stdout); assert.ok(result.warnings.some(w => w.includes('visíveis no Git')));
    files.forEach((file, i) => assert.deepEqual(readFileSync(file), before[i], `${args[0]} alterou ${file}`));
    assert.equal(git(other, 'status', '--short', '--untracked-files=all'), otherStatus);
    assert.equal(existsSync(join(current, '.claude/skills/.gitignore')), false);
  }
  const standalone = run(current, process.execPath, [sync, '--root', current]);
  assert.equal(standalone.status, 0, standalone.stdout + standalone.stderr);
  files.forEach((file, i) => assert.deepEqual(readFileSync(file), before[i], `sync direto alterou ${file}`));
  assert.equal(git(other, 'status', '--short', '--untracked-files=all'), otherStatus);
});

test('projeto novo cria somente ignore do kit, sem mexer na configuracao Git', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-git-new-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); git(root, 'config', 'user.name', 'Teste'); git(root, 'config', 'user.email', 'teste@example.invalid');
  put(root, 'tracked.txt', 'base\n'); git(root, 'add', 'tracked.txt'); git(root, 'commit', '-qm', 'base');
  put(root, '.claude/settings.json', '{"humano": true}\n');
  assert.equal(run(root, 'git', ['check-ignore', '-q', '--', '.claude/settings.json']).status, 1);
  const snapshots = ['.git/config', '.git/info/exclude', '.git/index'].map(path => readFileSync(join(root, path)));
  const r = run(root, process.execPath, [bin, 'init', '--agents', 'claude', '--target', root, '--json']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(existsSync(join(root, '.gitignore')), false);
  assert.equal(existsSync(join(root, '.claude/.gitignore')), false);
  assert.equal(existsSync(join(root, '.claude/skills/.gitignore')), false);
  assert.equal(existsSync(join(root, '.pbai4devs/.gitignore')), true);
  assert.equal(readFileSync(join(root, '.claude/settings.json'), 'utf8'), '{"humano": true}\n');
  assert.equal(run(root, 'git', ['check-ignore', '-q', '--', '.claude/settings.json']).status, 1);
  ['.git/config', '.git/info/exclude', '.git/index'].forEach((path, i) => assert.deepEqual(readFileSync(join(root, path)), snapshots[i]));
  const status = git(root, 'status', '--short', '--untracked-files=all');
  assert.ok(status.includes('AGENTS.md')); assert.ok(status.includes('.claude/skills/'));
  for (const args of [['sync', '--check'], ['doctor']]) {
    const result = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const data = JSON.parse(result.stdout);
    assert.equal(data.ok, true);
    assert.ok(data.warnings.some(value => value.includes('dados privados')));
    assert.ok(data.localIgnore.pending.some(item => item.code === 'output-visible'));
  }
  const directCheck = run(root, process.execPath, [sync, '--root', root, '--check']);
  assert.equal(directCheck.status, 0, directCheck.stdout + directCheck.stderr);
  assert.match(directCheck.stdout, /dados privados podem ficar visíveis/);
  const exclude = join(root, '.git/info/exclude'), originalExclude = readFileSync(exclude);
  const oldBlock = '# BEGIN AGENTDEVKIT LOCAL 1234567890abcdef\n/.claude/\n# END AGENTDEVKIT LOCAL 1234567890abcdef\n';
  for (const content of [oldBlock, `\uFEFF${oldBlock}`]) {
    writeFileSync(exclude, content);
    for (const args of [['sync', '--check'], ['doctor']]) {
      const result = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      const data = JSON.parse(result.stdout); assert.equal(data.ok, false);
      assert.ok(data.issues?.some(item => item.code === 'shared-ignore-legacy') || data.localIgnore?.pending.some(item => item.code === 'shared-ignore-legacy'));
      assert.equal(readFileSync(exclude, 'utf8'), content);
    }
  }
  writeFileSync(exclude, originalExclude);
  put(root, '.claude/auth.json', '{"test":"sem credenciais reais"}\n');
  for (const args of [['sync', '--check'], ['doctor']]) {
    const result = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const data = JSON.parse(result.stdout);
    assert.ok(data.issues?.some(item => item.code === 'private-file-visible' && item.path === '.claude/auth.json') || data.localIgnore?.pending.some(item => item.code === 'private-file-visible' && item.path === '.claude/auth.json'));
  }
  rmSync(join(root, '.claude/auth.json'));
  put(root, 'test-results/confidential.txt', 'artefato\n'); git(root, 'add', '-f', 'test-results/confidential.txt');
  for (const args of [['sync', '--check'], ['doctor']]) {
    const result = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const data = JSON.parse(result.stdout);
    assert.equal(data.ok, false);
    assert.ok(data.issues?.some(item => item.code === 'tracked-local-output') || data.localIgnore?.trackedOutputs.includes('test-results/confidential.txt'));
  }
});

test('comandos JSON aceitam negações genéricas e conservam Git e ignores byte a byte', { timeout: 180000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-generic-ignore-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  put(root, 'tracked.txt', 'staged humano\n'); git(root, 'add', 'tracked.txt');
  put(root, '.gitignore', '# humano\r\n!*.md\r\n!docs/*.md\r\n!**/*.mdx\r\n!*.json\r\n!*.yaml\r\n!docs/*.json\r\n');
  put(root, '.claude/.gitignore', '# cliente humano\r\n');
  put(root, '.pbai4devs/.gitignore', '# kit humano\r\n');
  const paths = ['.git/config', '.git/info/exclude', '.git/index', '.gitignore', '.claude/.gitignore', '.pbai4devs/.gitignore'];
  const before = paths.map(path => readFileSync(join(root, path)));
  for (const args of [['init', '--agents', 'claude'], ['update'], ['sync'], ['sync', '--check'], ['doctor']]) {
    const result = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
    const winCheck = process.platform === 'win32' && (args[0] === 'doctor' || args.includes('--check'));
    assert.equal(result.status, winCheck ? 1 : 0, result.stdout + result.stderr);
    const data = JSON.parse(result.stdout); assert.equal(data.ok, !winCheck);
    const ambiguous = data.localIgnore?.pending.filter(item => item.code === 'ignore-ambiguous') || [];
    if (process.platform === 'win32') {
      for (const rule of ['!docs/*.md', '!docs/*.json']) assert.ok(ambiguous.some(item => item.path.endsWith(rule)), rule);
    } else assert.equal(ambiguous.length, 0);
    assert.ok(data.warnings.some(warning => warning.includes('visíveis no Git')), args.join(' '));
    paths.forEach((path, i) => assert.deepEqual(readFileSync(join(root, path)), before[i], `${args.join(' ')}: ${path}`));
  }
  const credentials = ['.claude/.env.secret.md', '.claude/auth.json', '.claude/.env.secret.yaml'];
  for (const path of credentials) {
    put(root, path, 'fixture sem credencial real\n');
    const result = run(root, process.execPath, [bin, 'doctor', '--target', root, '--json']);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const data = JSON.parse(result.stdout);
    assert.ok(data.issues?.some(item => item.code === 'private-file-visible' && item.path === path) || data.localIgnore?.pending.some(item => item.code === 'private-file-visible' && item.path === path), path);
    paths.forEach((item, i) => assert.deepEqual(readFileSync(join(root, item)), before[i], item));
  }
  git(root, 'add', '-f', ...credentials);
  const stagedIndex = readFileSync(join(root, '.git/index'));
  const result = run(root, process.execPath, [bin, 'doctor', '--target', root, '--json']);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const data = JSON.parse(result.stdout);
  for (const path of credentials) assert.ok(data.issues?.some(item => item.code === 'tracked-local-output' && item.path === path) || data.localIgnore?.trackedOutputs.includes(path), path);
  assert.deepEqual(readFileSync(join(root, '.git/index')), stagedIndex);
  paths.filter(path => path !== '.git/index').forEach(path => assert.deepEqual(readFileSync(join(root, path)), before[paths.indexOf(path)], path));
});

test('sem Git instalado, init nao cria nem sobrescreve ignore de agente', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-without-git-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  put(root, '.claude/.gitignore', '# arquivo humano\n');
  const r = spawnSync(process.execPath, [bin, 'init', '--agents', 'claude', '--target', root, '--json'], { cwd: root, env: { ...env, PATH: '' }, encoding: 'utf8', timeout: 120000, maxBuffer: 20 * 1024 * 1024 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(readFileSync(join(root, '.claude/.gitignore'), 'utf8'), '# arquivo humano\n');
  assert.equal(existsSync(join(root, '.gitignore')), false);
  assert.equal(existsSync(join(root, '.claude/skills/.gitignore')), false);
});

test('helpers antigos recusam planos que escrevem no Git ou modificam o indice', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-git-refuse-write-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, 'tracked.txt', 'staged humano\n'); git(root, 'add', 'tracked.txt');
  const index = join(root, '.git/index'), exclude = join(root, '.git/info/exclude');
  const beforeIndex = readFileSync(index), beforeExclude = readFileSync(exclude);
  assert.throws(() => applyLocalIgnore({ edits: [{ path: exclude, before: beforeExclude.toString(), after: 'substituido' }] }), /desabilitado/);
  assert.throws(() => applyUntrack({ root, paths: ['tracked.txt'] }), /desabilitado/);
  assert.throws(() => restoreUntrack({ root, paths: ['tracked.txt'] }), /desabilitado/);
  assert.deepEqual(readFileSync(index), beforeIndex); assert.deepEqual(readFileSync(exclude), beforeExclude);
});

test('upgrade e remoção de seleção preservam ignores antes marcados como gerenciados', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-old-ignore-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); git(root, 'config', 'user.name', 'Teste'); git(root, 'config', 'user.email', 'teste@example.invalid');
  put(root, 'tracked.txt', 'base\n'); git(root, 'add', 'tracked.txt'); git(root, 'commit', '-qm', 'base');
  let result = run(root, process.execPath, [bin, 'init', '--agents', 'claude', '--target', root, '--json']); assert.equal(result.status, 0, result.stdout + result.stderr);
  const paths = ['.claude/.gitignore', '.claude/skills/.gitignore'];
  const blocks = ['# BEGIN AGENT IGNORE\n/*\n# END AGENT IGNORE', '# BEGIN AGENTDEVKIT WORKTREE LOCAL\n/demo\n# END AGENTDEVKIT WORKTREE LOCAL'];
  const statePath = join(root, '.pbai4devs/state/agentdevkit.json'), state = JSON.parse(readFileSync(statePath));
  const digest = text => createHash('sha256').update(text).digest('hex');
  paths.forEach((path, i) => { put(root, path, `${blocks[i]}\n`); state.files[path] = digest(`${blocks[i]}\n`); });
  state.blocks ||= {}; state.blocks[paths[0]] = digest(blocks[0]);
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
  const before = paths.map(path => readFileSync(join(root, path))), index = readFileSync(join(root, '.git/index')), exclude = readFileSync(join(root, '.git/info/exclude'));
  result = run(root, process.execPath, [bin, 'agents', 'codex', '--target', root, '--json']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  paths.forEach((path, i) => assert.deepEqual(readFileSync(join(root, path)), before[i], path));
  assert.deepEqual(readFileSync(join(root, '.git/index')), index); assert.deepEqual(readFileSync(join(root, '.git/info/exclude')), exclude);
});

for (const [name, rules] of [
  ['sem regras', ''], ['negacao literal', '!/.claude/\n'], ['negação BOM', '\uFEFF!/.claude/\n'],
  ['glob e negação posterior', '/.claude/*\n!/.claude/settings.json\n'],
  ['excecao de credencial', '/.claude/*\n!/.claude/auth.json\n'],
  ['aninhada', '/outro/\n!/outro/humano\n'],
]) test(`plano respeita configuração humana: ${name}`, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-ignore-policy-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, '.gitignore', rules);
  put(root, '.claude/settings.json', '{"humano": true}\n'); put(root, 'tracked.txt', 'staged\n'); git(root, 'add', '-f', 'tracked.txt');
  const paths = ['.gitignore', '.git/config', '.git/info/exclude', '.git/index', '.claude/settings.json'];
  const before = paths.map(path => readFileSync(join(root, path)));
  const ignored = run(root, 'git', ['check-ignore', '--no-index', '-q', '--', '.claude/settings.json']).status;
  const plan = planLocalIgnore(root, { outputs: ['.claude/skills/demo/SKILL.md', 'AGENTS.md'] });
  assert.deepEqual(plan.edits, []); applyLocalIgnore(plan);
  paths.forEach((path, i) => assert.deepEqual(readFileSync(join(root, path)), before[i], path));
  assert.equal(run(root, 'git', ['check-ignore', '--no-index', '-q', '--', '.claude/settings.json']).status, ignored);
});

test('playwright e resultados visíveis são informados em qualquer caixa', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-visible-artifacts-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const samples = ['.playwright-mcp/session.json', '.PLAYWRIGHT-CACHE/dados.json', 'playwright-report/index.html', 'TestResults/resultado.xml'];
  samples.forEach(path => put(root, path, 'local\n'));
  const result = checkLocalIgnore(planLocalIgnore(root));
  for (const [index, sample] of samples.entries()) {
    assert.equal(run(root, 'git', ['check-ignore', '--no-index', '-q', '--', sample]).status, 1);
    const prefix = index < 2 ? '**/.[Pp][Ll][Aa][Yy]' : index === 2 ? '**/[Pp][Ll][Aa][Yy]' : '**/[Tt][Ee][Ss][Tt][Rr]';
    assert.ok(result.pending.some(item => item.code === 'artifact-unprotected' && item.pattern?.startsWith(prefix)), sample);
  }
});

test('ambiente Git remove variáveis em qualquer caixa antes da consulta', () => {
  const source = { git_dir: 'fora', GIT_WORK_TREE: 'fora', Git_Common_Dir: 'fora', git_index_file: 'fora', GIT_EXTERNAL_DIFF: 'fora', Git_Optional_Locks: '1', git_trace: 'fora', GIT_TRACE2_EVENT: 'fora', PATH: '/bin' };
  assert.deepEqual(safeGitEnvironment(source), { PATH: '/bin', GIT_OPTIONAL_LOCKS: '0', GIT_TRACE2: '0', GIT_TRACE2_EVENT: '0', GIT_TRACE2_PERF: '0' });
  assert.equal(source.git_dir, 'fora');
});

test('consultas Git não criam arquivos de trace herdados do ambiente ou da configuração global', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-git-trace-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const config = join(root, 'gitconfig');
  const configured = ['normalTarget', 'eventTarget', 'perfTarget'].map(name => ({ name, path: join(root, `${name}.log`) }));
  writeFileSync(config, `[trace2]\n${configured.map(item => `\t${item.name} = ${JSON.stringify(item.path.replaceAll('\\', '/'))}`).join('\n')}\n`);
  const base = { ...safeGitEnvironment(process.env), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: config };
  for (const key of ['GIT_TRACE', 'GIT_TRACE2', 'GIT_TRACE2_EVENT', 'GIT_TRACE2_PERF']) {
    const path = join(root, `${key}.log`), raw = { ...base, [key]: path };
    const control = spawnSync('git', ['version'], { cwd: root, env: raw, encoding: 'utf8' });
    assert.equal(control.status, 0, control.stderr);
    assert.ok(existsSync(path), `${key} deveria gerar um trace no controle`);
    rmSync(path);
    const check = spawnSync('git', ['version'], { cwd: root, env: safeGitEnvironment(raw), encoding: 'utf8' });
    assert.equal(check.status, 0, check.stderr);
    assert.equal(existsSync(path), false, `${key} gerou trace na consulta isolada`);
  }
  const globalControl = { ...base };
  for (const key of ['GIT_TRACE2', 'GIT_TRACE2_EVENT', 'GIT_TRACE2_PERF']) delete globalControl[key];
  const control = spawnSync('git', ['version'], { cwd: root, env: globalControl, encoding: 'utf8' });
  assert.equal(control.status, 0, control.stderr);
  for (const item of configured) {
    assert.ok(existsSync(item.path), `${item.name} deve gerar trace no controle`);
    rmSync(item.path);
  }
  const check = spawnSync('git', ['version'], { cwd: root, env: safeGitEnvironment(base), encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
  for (const item of configured) assert.equal(existsSync(item.path), false, `${item.name} não deve criar trace`);
});

test('diagnóstico de arquivos privados respeita a precedência real de ignore global', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-private-global-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, 'global-ignore', '/.claude/auth.json\n');
  git(root, 'config', '--local', 'core.excludesFile', join(root, 'global-ignore'));
  put(root, '.claude/auth.json', '{"fixture": true}\n');
  const config = readFileSync(join(root, '.git/config'));
  assert.equal(run(root, 'git', ['check-ignore', '--no-index', '-q', '--', '.claude/auth.json']).status, 0);
  const check = checkLocalIgnore(planLocalIgnore(root));
  assert.equal(check.pending.some(item => item.code === 'private-file-visible' && item.path === '.claude/auth.json'), false);
  assert.deepEqual(readFileSync(join(root, '.git/config')), config);
});

test('diagnóstico cobre credenciais no hub e aliases de clientes visíveis e staged', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-private-alias-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  put(root, '.pbai4devs/.gitignore', '# ignore humano\n');
  const secrets = ['.pbai4devs/.env', '.CLAUDE/auth.json'];
  secrets.forEach(path => put(root, path, 'fixture sem credencial real\n'));
  const ignore = readFileSync(join(root, '.pbai4devs/.gitignore'));
  let plan = planLocalIgnore(root), diagnostics = checkLocalIgnore(plan);
  for (const path of secrets) assert.ok(diagnostics.pending.some(item => item.code === 'private-file-visible' && item.path === path), path);
  git(root, 'add', '-f', ...secrets); const index = readFileSync(join(root, '.git/index'));
  plan = planLocalIgnore(root); diagnostics = checkLocalIgnore(plan);
  for (const path of secrets) assert.ok(diagnostics.trackedOutputs.includes(path), path);
  assert.deepEqual(readFileSync(join(root, '.pbai4devs/.gitignore')), ignore);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('aliases Unicode e ancestrais staged são detectados conservadoramente', t => {
  assert.equal(gitPathsOverlap('.claude/skills/ſincronizar/SKILL.md', '.claude/skills/sincronizar/SKILL.md'), true);
  assert.equal(gitPathsOverlap('.claude/skills/ſincronizar', '.claude/skills/sincronizar/SKILL.md'), true);
  assert.equal(gitPathsOverlap('.claude/skills/straße', '.claude/skills/STRASSE/SKILL.md'), true);
  assert.equal(gitPathsOverlap('.codex/commands/proximos-paẞos/COMMAND.md', '.codex/commands/proximos-passos/COMMAND.md'), true);
  assert.equal(gitPathsOverlap('relatório.txt', '.pbai4devs/SKILL.md'), false);
  assert.equal(gitPathsOverlap('.claude/straße/SKILL.md', '.claude/other/SKILL.md', { platform: 'darwin' }), false);
  assert.equal(gitPathsOverlap('.claude/straße/SKILL.md', '.claude/other/SKILL.md', { platform: 'win32' }), true);
  assert.equal(gitPathsOverlap('.claude/straße/SKILL.md', '.claude/other/SKILL.md', { platform: 'win32', identity: () => 'distinct' }), false);
  assert.equal(gitPathsOverlap('.claude/skills/demo./SKILL.md', '.claude/skills/demo/SKILL.md', { platform: 'win32' }), true);
  assert.equal(gitPathsOverlap('.claude/PROGRA~1/SKILL.md', '.claude/Program Files/SKILL.md', { platform: 'win32' }), true);
  assert.equal(gitPathsOverlap('.claude/PROGRA~1.con', '.claude/Program Files.config', { platform: 'win32' }), true);
  assert.equal(gitPathsOverlap('relatorio~1.txt', '.pbai4devs/SKILL.md'), false);
  assert.equal(gitPathsOverlap('relatorio.txt.', '.pbai4devs/SKILL.md'), false);
  for (const ancestor of [false, true]) {
    const root = mkdtempSync(join(tmpdir(), 'adk-unicode-index-')); t.after(() => rmSync(root, { recursive: true, force: true }));
    git(root, 'init', '-q', '-b', 'main');
    const alias = ancestor ? '.claude/skills/ſincronizar' : '.claude/skills/ſincronizar/SKILL.md';
    const canonical = '.claude/skills/sincronizar/SKILL.md';
    put(root, alias, 'conteúdo staged próprio\n'); git(root, 'add', '-f', alias);
    const index = readFileSync(join(root, '.git/index'));
    if (ancestor) rmSync(join(root, alias));
    const expected = { [canonical]: createHash('sha256').update('conteúdo gerado\n').digest('hex') };
    assert.ok(planUntrack(root, expected).conflicts.includes(canonical), alias);
    assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  }
});

test('Windows preserva aliases curtos arbitrários e só descarta identidade comprovadamente distinta', () => {
  for (const [a, b] of [['Z~1.TXT', 'README.md'], ['longfile.txt', 'longfilename.txt'], ['AGENTS.md.', 'AGENTS.md']]) {
    assert.equal(gitPathsOverlap(a, b, { platform: 'win32' }), true);
    assert.equal(gitPathsOverlap(a, b, { platform: 'win32', identity: () => 'same' }), true);
    assert.equal(gitPathsOverlap(a, b, { platform: 'win32', identity: () => 'distinct' }), false);
    assert.equal(gitPathsOverlap(a, b, { platform: 'win32', identity: () => { throw new Error('inacessível'); } }), true);
  }
  assert.equal(gitPathsOverlap('AGENTS.md.', 'AGENTS.md', { platform: 'darwin' }), false);
  assert.equal(gitPathsOverlap('AGENTS~1', '.agents', { platform: 'darwin' }), false);
  assert.equal(gitPathsOverlap('longfile.txt', 'longfilename.txt', { platform: 'darwin' }), false);
  assert.equal(gitPathsOverlap('README.md::$DATA', 'README.md', { platform: 'win32' }), true);
});

test('identidade física simulada no Windows exige arquivos existentes e distintos', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-file-identity-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  put(root, 'README.md', 'um\n'); put(root, 'Z~1.TXT', 'outro\n');
  assert.equal(gitPathsOverlap('README.md', 'Z~1.TXT', { root, platform: 'win32' }), false);
  rmSync(join(root, 'Z~1.TXT'));
  assert.equal(gitPathsOverlap('README.md', 'Z~1.TXT', { root, platform: 'win32' }), true);
  assert.equal(gitPathsOverlap('README.md', 'Z~1.TXT', { root, platform: 'win32', allowMissingTarget: true }), false);
  assert.equal(gitPathsOverlap('absent.md', 'Z~1.TXT', { root, platform: 'win32', allowMissingTarget: true }), true);
  linkSync(join(root, 'README.md'), join(root, 'Z~1.TXT'));
  assert.equal(gitPathsOverlap('README.md', 'Z~1.TXT', { root, platform: 'win32' }), true);
  assert.equal(gitPathsOverlap('README.md', 'Z~1.TXT', { root, platform: 'win32', allowMissingTarget: true }), true);
  put(root, '.pbai4devs/state/agentdevkit.json', '{}');
  const old = '.pbai4devs/estado/outros/minhas-notas.txt', current = '.pbai4devs/state/agentdevkit.json';
  assert.equal(gitPathsOverlap(old, current, { root, platform: 'win32' }), true);
  assert.equal(gitPathsOverlap(old, current, { root, platform: 'win32', allowMissingTarget: true }), false);
  rmSync(join(root, '.pbai4devs/state'), { recursive: true });
  assert.equal(gitPathsOverlap(old, current, { root, platform: 'win32', allowMissingTarget: true }), true);
});

test('origem staged ausente permanece ambígua sem identidade física confiável', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-uncertain-identity-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  put(root, '.pbai4devs/state/agentdevkit.json', '{}');
  const old = '.pbai4devs/estado/outros/notas.txt', current = '.pbai4devs/state/agentdevkit.json';
  const original = fs.lstatSync;
  for (const mode of ['zero-inode', 'symlink', 'denied']) {
    t.mock.method(fs, 'lstatSync', (path, options) => {
      if (path === join(root, mode === 'symlink' ? '.pbai4devs' : '.pbai4devs/state')) {
        if (mode === 'denied') throw Object.assign(new Error('sem acesso'), { code: 'EACCES' });
        const info = original(path, options);
        return { dev: info.dev, ino: mode === 'zero-inode' ? 0n : info.ino, isSymbolicLink: () => mode === 'symlink' };
      }
      return original(path, options);
    });
    syncBuiltinESMExports();
    try { assert.equal(gitPathsOverlap(old, current, { root, platform: 'win32', allowMissingTarget: true }), true, mode); }
    finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  }
});

test('links staged continuam ambíguos para identidade igual, inode zero ou erro de leitura', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-symlink-identity-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  put(root, 'AGENTS.md', 'humano\n'); mkdirSync(join(root, '.agents'));
  try { fs.symlinkSync('AGENTS.md', join(root, 'HUMAN.md')); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) return t.skip('Links simbólicos indisponíveis.'); throw error; }
  const source = fs.lstatSync(join(root, 'HUMAN.md'), { bigint: true });
  const candidate = '.agents/agents/revisor.md', options = { root, platform: 'win32', allowMissingTarget: true };
  assert.equal(gitPathsOverlap('HUMAN.md', candidate, options), false, `dev=${source.dev} ino=${source.ino}`);
  const original = fs.lstatSync;
  for (const mode of ['same-inode', 'zero-inode', 'denied']) {
    t.mock.method(fs, 'lstatSync', (path, statOptions) => {
      if (path === join(root, '.agents')) {
        if (mode === 'denied') throw Object.assign(new Error('sem acesso'), { code: 'EACCES' });
        const info = original(path, statOptions);
        return { dev: mode === 'same-inode' ? source.dev : info.dev, ino: mode === 'same-inode' ? source.ino : 0n, isSymbolicLink: () => false };
      }
      return original(path, statOptions);
    });
    syncBuiltinESMExports();
    try { assert.equal(gitPathsOverlap('HUMAN.md', candidate, options), true, mode); }
    finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  }
});

test('Windows não confunde diretórios staged existentes com ancestrais ausentes de outros destinos', { timeout: 120000 }, t => {
  const outer = mkdtempSync(join(tmpdir(), 'adk-win-nested-')); t.after(() => rmSync(outer, { recursive: true, force: true }));
  git(outer, 'init', '-q');
  const root = join(outer, '.agent-tests', 'development-ecosystem-fixture'); mkdirSync(root, { recursive: true });
  git(root, 'init', '-q');
  const humans = ['.claude/skills/planejar-qa/SKILL.md', '.cursor/skills/projeto/criar-spec/SKILL.md', '.github/skills/planejar-qa/SKILL.md'];
  for (const human of humans) put(root, human, 'conteúdo humano staged\n');
  git(root, 'add', '-f', ...humans);
  const index = readFileSync(join(root, '.git/index'));
  const config = readFileSync(join(root, '.git/config'));
  const human = humans[0];
  assert.equal(gitPathsOverlap(human, '.claude/agents/revisor.md', { root, platform: 'win32', allowMissingTarget: true }), false);
  assert.equal(gitPathsOverlap(human, '.claude/skills/git-diff/SKILL.md', { root, platform: 'win32', allowMissingTarget: true }), false);
  assert.equal(gitPathsOverlap(humans[1], '.cursor/agents/revisor.md', { root, platform: 'win32', allowMissingTarget: true }), false);
  assert.equal(gitPathsOverlap(humans[2], '.github/skills/git-diff/SKILL.md', { root, platform: 'win32', allowMissingTarget: true }), false);
  assert.equal(gitPathsOverlap(human, '.claude/skills/planejar-qa/SKILL.md', { root, platform: 'win32', allowMissingTarget: true }), true);
  assert.equal(gitPathsOverlap('.claude/agents/revisor.md', human, { root, platform: 'win32', allowMissingTarget: true }), false);
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex', 'claude', 'copilot', 'cursor'] });
  for (const path of ['.claude/agents/revisor.md', '.claude/skills/git-diff/SKILL.md', '.cursor/agents/revisor.md', '.github/agents/revisor.agent.md', '.github/skills/git-diff/SKILL.md']) {
    assert.ok(plan.changes.some(change => change.path === path && change.action === 'create'), path);
  }
  for (const path of humans) assert.equal(readFileSync(join(root, path), 'utf8'), 'conteúdo humano staged\n');
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(readFileSync(join(root, '.git/config')), config);
  stageSynthetic(root, '.github/agents/revisor.agent.md', 'conteúdo humano apenas staged\n');
  const stagedIndex = readFileSync(join(root, '.git/index'));
  assert.throws(() => planInstallation({ target: root, mode: 'init', clients: ['copilot'] }), error => error.code === 'E_STAGED' && error.message.includes('.github/agents/revisor.agent.md'));
  assert.deepEqual(readFileSync(join(root, '.git/index')), stagedIndex);
  assert.deepEqual(readFileSync(join(root, '.git/config')), config);
  const legacy = '.pbai4devs/estado/outros/minhas-notas.txt';
  put(root, legacy, 'estado humano\n');
  assert.equal(gitPathsOverlap(legacy, '.pbai4devs/state/outros/minhas-notas.txt', { root, platform: 'win32', allowMissingTarget: true }), false);
});

test('protege índice quando caminho temporário e Git usam nomes físicos diferentes', { timeout: 120000 }, t => {
  const outer = mkdtempSync(join(tmpdir(), 'adk-physical-git-')); t.after(() => rmSync(outer, { recursive: true, force: true }));
  const physical = fs.realpathSync.native(outer);
  if (outer.toLowerCase() === physical.toLowerCase()) return t.skip('O diretório temporário não oferece alias físico neste sistema.');
  git(outer, 'init', '-q');
  const root = join(outer, 'nested'); mkdirSync(root);
  const path = 'nested/.github/agents/revisor.agent.md';
  stageSynthetic(outer, path, 'conteúdo humano apenas staged\n');
  const index = readFileSync(join(outer, '.git/index'));
  assert.throws(() => planInstallation({ target: root, mode: 'init', clients: ['copilot'] }), error => error.code === 'E_STAGED' && error.message.includes('.github/agents/revisor.agent.md'));
  assert.deepEqual(readFileSync(join(outer, '.git/index')), index);
  assert.equal(existsSync(join(root, '.github/agents/revisor.agent.md')), false);
});

for (const marker of ['diretório', 'arquivo']) for (const committed of [false, true]) {
  test(`init recusa destino dentro de gitlink ${committed ? 'commitado' : 'staged'} com .git ${marker}`, { timeout: 120000 }, t => {
    const outer = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-nested-git-')));
    t.after(() => rmSync(outer, { recursive: true, force: true }));
    const root = join(outer, 'project'), nested = join(root, '.agents'); mkdirSync(nested, { recursive: true });
    git(root, 'init', '-q', '-b', 'main');
    if (marker === 'arquivo') git(nested, 'init', '-q', '--separate-git-dir', join(outer, 'nested.git'));
    else git(nested, 'init', '-q');
    git(nested, 'config', 'user.name', 'Fixture'); git(nested, 'config', 'user.email', 'fixture@example.invalid');
    put(nested, 'seed.txt', 'base\n'); git(nested, 'add', 'seed.txt'); git(nested, 'commit', '-qm', 'base');
    const oid = git(nested, 'rev-parse', 'HEAD');
    git(root, 'update-index', '--add', '--cacheinfo', `160000,${oid},.agents`);
    git(root, 'config', 'diff.ignoreSubmodules', 'all');
    if (committed) {
      git(root, 'config', 'user.name', 'Fixture'); git(root, 'config', 'user.email', 'fixture@example.invalid'); git(root, 'commit', '-qm', 'submódulo');
    }
    const target = 'agents/analista-performance.md'; put(nested, target, '# Somente staged\n'); git(nested, 'add', '-f', target); rmSync(join(nested, target));
    const topIndex = readFileSync(join(root, '.git/index')), innerIndexPath = git(nested, 'rev-parse', '--git-path', 'index');
    const innerIndex = readFileSync(isAbsolute(innerIndexPath) ? innerIndexPath : join(nested, innerIndexPath));
    assert.throws(() => planInstallation({ target: root, mode: 'init', clients: ['codex'] }), error => error.code === 'E_STAGED');
    assert.equal(existsSync(join(nested, target)), false);
    assert.deepEqual(readFileSync(join(root, '.git/index')), topIndex);
    assert.deepEqual(readFileSync(isAbsolute(innerIndexPath) ? innerIndexPath : join(nested, innerIndexPath)), innerIndex);
    assert.equal(git(nested, 'show', `:${target}`), '# Somente staged');
  });
}

test('init recusa projeto sob gitlink externo não inicializado', { timeout: 120000 }, t => {
  const outer = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-gitlink-parent-')));
  t.after(() => rmSync(outer, { recursive: true, force: true }));
  const root = join(outer, 'repository'), source = join(outer, 'source'), project = join(root, '.agents/project');
  mkdirSync(project, { recursive: true }); mkdirSync(source);
  git(root, 'init', '-q', '-b', 'main'); git(source, 'init', '-q');
  git(source, 'config', 'user.name', 'Fixture'); git(source, 'config', 'user.email', 'fixture@example.invalid');
  put(source, 'seed', 'base\n'); git(source, 'add', 'seed'); git(source, 'commit', '-qm', 'base');
  git(root, 'update-index', '--add', '--cacheinfo', `160000,${git(source, 'rev-parse', 'HEAD')},.agents`);
  const index = readFileSync(join(root, '.git/index'));
  assert.throws(() => planInstallation({ target: project, mode: 'init', clients: ['codex'] }), error => error.code === 'E_STAGED');
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(existsSync(join(project, '.pbai4devs')), false);
});

test('sync recusa projeto sob gitlink externo não inicializado', { timeout: 120000 }, t => {
  const outer = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-sync-gitlink-parent-')));
  t.after(() => rmSync(outer, { recursive: true, force: true }));
  const root = join(outer, 'repository'), source = join(outer, 'source'), project = join(root, '.agents/project');
  mkdirSync(project, { recursive: true }); mkdirSync(source);
  git(root, 'init', '-q'); git(source, 'init', '-q');
  git(source, 'config', 'user.name', 'Fixture'); git(source, 'config', 'user.email', 'fixture@example.invalid');
  put(source, 'seed', 'base\n'); git(source, 'add', 'seed'); git(source, 'commit', '-qm', 'base');
  put(project, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(project, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(project, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
  git(root, 'update-index', '--add', '--cacheinfo', `160000,${git(source, 'rev-parse', 'HEAD')},.agents`);
  const index = readFileSync(join(root, '.git/index'));
  const options = { root: project, localIgnores: false, generateEntrypoints: false, output() {} };
  assert.equal(synchronize({ ...options, check: true }).exitCode, 1);
  assert.throws(() => synchronize(options), /[ÍíIi]ndice Git/);
  assert.equal(existsSync(join(project, '.claude/skills/demo/SKILL.md')), false);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('projeto dentro de submódulo inicializado usa seu próprio índice', { timeout: 120000 }, t => {
  const outer = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-initialized-submodule-')));
  t.after(() => rmSync(outer, { recursive: true, force: true }));
  const root = join(outer, 'repository'), project = join(root, 'module'); mkdirSync(project, { recursive: true });
  git(root, 'init', '-q'); git(project, 'init', '-q');
  git(project, 'config', 'user.name', 'Fixture'); git(project, 'config', 'user.email', 'fixture@example.invalid');
  put(project, 'seed', 'base\n'); git(project, 'add', 'seed'); git(project, 'commit', '-qm', 'base');
  git(root, 'update-index', '--add', '--cacheinfo', `160000,${git(project, 'rev-parse', 'HEAD')},module`);
  put(project, 'humano.txt', 'conteúdo staged\n'); git(project, 'add', 'humano.txt');
  const outerIndex = readFileSync(join(root, '.git/index')), innerIndex = readFileSync(join(project, '.git/index'));
  applyPlan(planInstallation({ target: project, mode: 'init', clients: ['codex'] }));
  assert.ok(existsSync(join(project, '.agents/agents/analista-performance.md')));
  assert.deepEqual(readFileSync(join(root, '.git/index')), outerIndex);
  assert.deepEqual(readFileSync(join(project, '.git/index')), innerIndex);
  assert.equal(git(project, 'show', ':humano.txt'), 'conteúdo staged');
});

test('gitlink não relacionado não bloqueia o cliente selecionado', { timeout: 120000 }, t => {
  const outer = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-gitlink-unrelated-')));
  t.after(() => rmSync(outer, { recursive: true, force: true }));
  const root = join(outer, 'project'), nested = join(root, 'vendor'); mkdirSync(nested, { recursive: true });
  git(root, 'init', '-q', '-b', 'main'); git(nested, 'init', '-q');
  git(nested, 'config', 'user.name', 'Fixture'); git(nested, 'config', 'user.email', 'fixture@example.invalid');
  put(nested, 'human.txt', 'preservar\n'); git(nested, 'add', 'human.txt'); git(nested, 'commit', '-qm', 'base');
  git(root, 'update-index', '--add', '--cacheinfo', `160000,${git(nested, 'rev-parse', 'HEAD')},vendor`);
  const index = readFileSync(join(root, '.git/index')), inner = readFileSync(join(nested, '.git/index'));
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] }); applyPlan(plan);
  assert.equal(readFileSync(join(nested, 'human.txt'), 'utf8'), 'preservar\n');
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(readFileSync(join(nested, '.git/index')), inner);
  assert.ok(existsSync(join(root, '.agents/agents/analista-performance.md')));
});

test('gitlink não inicializado não autoriza acrescentar bloco a arquivo interno', { timeout: 120000 }, t => {
  const outer = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-gitlink-block-')));
  t.after(() => rmSync(outer, { recursive: true, force: true }));
  const root = join(outer, 'project'), source = join(outer, 'source'); mkdirSync(root); mkdirSync(source);
  git(root, 'init', '-q', '-b', 'main'); git(source, 'init', '-q');
  git(source, 'config', 'user.name', 'Fixture'); git(source, 'config', 'user.email', 'fixture@example.invalid');
  put(source, 'seed', 'base\n'); git(source, 'add', 'seed'); git(source, 'commit', '-qm', 'base');
  git(root, 'update-index', '--add', '--cacheinfo', `160000,${git(source, 'rev-parse', 'HEAD')},.agents`);
  const file = '.agents/agents/analista-performance.md', content = '# Documento humano\n'; put(root, file, content);
  const index = readFileSync(join(root, '.git/index'));
  assert.throws(() => planInstallation({ target: root, mode: 'init', clients: ['codex'] }), error => error.code === 'E_STAGED');
  assert.equal(readFileSync(join(root, file), 'utf8'), content);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

for (const operation of ['init', 'sync']) test(`${operation} recusa backup em Git aninhado`, { timeout: 120000 }, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-nested-backup-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, '.gitignore', '# humano\n'); git(root, 'add', '.gitignore');
  const syncOptions = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  if (operation === 'init') put(root, 'AGENTS.md', '# Instruções humanas\n');
  else {
    put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
    for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
    put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
    synchronize(syncOptions);
    put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
  }
  const nested = join(root, '.agent-tests'); mkdirSync(nested, { recursive: true }); git(nested, 'init', '-q');
  put(nested, 'human.txt', 'preservar\n'); git(nested, 'add', 'human.txt');
  const contents = fs.readdirSync(nested).sort(), recovery = inspectProjectRecovery(root);
  const topIndex = readFileSync(join(root, '.git/index')), innerIndex = readFileSync(join(nested, '.git/index'));
  const action = operation === 'init' ? () => { const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] }); applyPlan(plan); }
    : () => synchronize(syncOptions);
  assert.throws(action, error => error.code === 'E_NESTED_GIT');
  assert.deepEqual(fs.readdirSync(nested).sort(), contents);
  assert.deepEqual(inspectProjectRecovery(root), recovery);
  assert.equal(readFileSync(join(nested, 'human.txt'), 'utf8'), 'preservar\n');
  assert.deepEqual(readFileSync(join(root, '.git/index')), topIndex); assert.deepEqual(readFileSync(join(nested, '.git/index')), innerIndex);
  if (operation === 'sync') {
    assert.throws(() => synchronize({ ...syncOptions, force: false }), error => error.code === 'E_NESTED_GIT');
    assert.deepEqual(fs.readdirSync(nested).sort(), contents);
    assert.deepEqual(inspectProjectRecovery(root), recovery);
    assert.deepEqual(readFileSync(join(nested, '.git/index')), innerIndex);
  }
});

for (const operation of ['init', 'sync']) test(`${operation} recusa backup sob gitlink não inicializado`, { timeout: 120000 }, t => {
  const outer = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-backup-gitlink-')));
  t.after(() => rmSync(outer, { recursive: true, force: true }));
  const root = join(outer, 'project'), source = join(outer, 'source'); mkdirSync(root); mkdirSync(source);
  git(root, 'init', '-q', '-b', 'main'); git(source, 'init', '-q');
  git(source, 'config', 'user.name', 'Fixture'); git(source, 'config', 'user.email', 'fixture@example.invalid');
  put(source, 'seed', 'base\n'); git(source, 'add', 'seed'); git(source, 'commit', '-qm', 'base');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  if (operation === 'init') put(root, 'AGENTS.md', '# Humano\n');
  else {
    put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
    for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
    put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n'); synchronize(options);
    put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  }
  git(root, 'update-index', '--add', '--cacheinfo', `160000,${git(source, 'rev-parse', 'HEAD')},.agent-tests`);
  const artifactRoot = join(root, '.agent-tests');
  mkdirSync(artifactRoot, { recursive: true });
  const contents = fs.readdirSync(artifactRoot).sort(), recovery = inspectProjectRecovery(root);
  const index = readFileSync(join(root, '.git/index'));
  const action = operation === 'init' ? () => { const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] }); applyPlan(plan); }
    : () => synchronize(options);
  assert.throws(action, /[Ss]ubm[oó]dulo|Git submodule/);
  assert.deepEqual(fs.readdirSync(artifactRoot).sort(), contents);
  assert.deepEqual(inspectProjectRecovery(root), recovery);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

for (const location of ['irmao', 'candidato', 'descendente', 'alias']) test(`sync identifica gitlink ${location} da pasta exclusiva de backup`, { timeout: 120000 }, t => {
  const outer = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-backup-gitlink-specific-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(outer, { recursive: true, force: true }); });
  const root = join(outer, 'project'), source = join(outer, 'source'); mkdirSync(root); mkdirSync(source);
  git(root, 'init', '-q'); git(source, 'init', '-q');
  git(source, 'config', 'user.name', 'Fixture'); git(source, 'config', 'user.email', 'fixture@example.invalid');
  put(source, 'seed', 'base\n'); git(source, 'add', 'seed'); git(source, 'commit', '-qm', 'base');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n'); synchronize(options);
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  const candidate = '.agent-tests/sync-backup.12345678-1234-4234-8234-123456789abc';
  const link = location === 'irmao' ? '.agent-tests/unrelated' : location === 'candidato' ? candidate : location === 'alias' ? candidate.toUpperCase() : `${candidate}/inner`;
  git(root, 'update-index', '--add', '--cacheinfo', `160000,${git(source, 'rev-parse', 'HEAD')},${link}`);
  if (location === 'irmao') put(root, `${link}/sentinela`, 'conteúdo humano\n');
  const index = readFileSync(join(root, '.git/index'));
  const recovery = inspectProjectRecovery(root);
  const repeatBackupName = observeBackupName(t);
  if (location === 'irmao') {
    const result = synchronize(options);
    assert.ok(result.backupRoot); assert.equal(readFileSync(join(root, link, 'sentinela'), 'utf8'), 'conteúdo humano\n');
  } else {
    assert.equal(synchronize({ ...options, check: true }).exitCode, 1);
    repeatBackupName();
    assert.throws(() => synchronize(options), /[Ss]ubm[oó]dulo/);
    assert.equal(existsSync(join(root, candidate)), false);
    assert.deepEqual(inspectProjectRecovery(root), recovery);
  }
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('sync preserva pasta de backup criada concorrentemente', { timeout: 120000 }, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-backup-exclusive-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  git(root, 'init', '-q');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n'); synchronize(options);
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  const candidate = join(root, '.agent-tests/sync-backup.12345678-1234-4234-8234-123456789abc'), mkdir = fs.mkdirSync;
  observeBackupName(t);
  const createCompetingDirectory = () => {
    if (existsSync(candidate)) return;
    mkdir(candidate);
    writeFileSync(join(candidate, 'sentinela'), 'humano\n');
  };
  if (process.platform === 'win32') {
    const spawn = childProcess.spawnSync;
    t.mock.method(childProcess, 'spawnSync', (program, args, options) => {
      if (creationPath(args, options) === candidate) createCompetingDirectory();
      return spawn(program, args, options);
    });
  } else {
    t.mock.method(fs, 'mkdirSync', (path, ...args) => {
      if (resolve(path) === candidate) createCompetingDirectory();
      return mkdir(path, ...args);
    });
  }
  syncBuiltinESMExports();
  let failure; try { synchronize(options); } catch (error) { failure = error; }
  assert.equal(failure?.code, 'EEXIST', failure?.stack);
  assert.equal(readFileSync(join(candidate, 'sentinela'), 'utf8'), 'humano\n');
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes(candidate));
});

test('sync não sobrescreve arquivo criado concorrentemente dentro do backup', { timeout: 120000 }, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-backup-file-exclusive-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  git(root, 'init', '-q');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n'); synchronize(options);
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  const backupRoot = join(root, '.agent-tests/sync-backup.12345678-1234-4234-8234-123456789abc'), open = fs.openSync;
  let collision;
  observeBackupName(t);
  t.mock.method(fs, 'openSync', (path, flags, ...args) => {
    if (!collision && typeof path === 'string' && resolve(path).startsWith(backupRoot + sep) && flags === 'wx+') {
      collision = resolve(path); writeFileSync(path, 'sentinela humana\n', { flag: 'wx' });
    }
    return open(path, flags, ...args);
  });
  syncBuiltinESMExports();
  let failure; try { synchronize(options); } catch (error) { failure = error; }
  assert.ok(collision, `fixture deve criar o arquivo no momento da tentativa exclusiva (cwd=${process.cwd()})`);
  assert.equal(failure?.code, 'EEXIST');
  assert.equal(readFileSync(collision, 'utf8'), 'sentinela humana\n');
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes(backupRoot));
});

test('falha congelada durante backup parcial informa a pasta preservada', { timeout: 120000 }, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-backup-partial-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  git(root, 'init', '-q');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n'); synchronize(options);
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  const backupRoot = join(root, '.agent-tests/sync-backup.12345678-1234-4234-8234-123456789abc');
  const originalOpen = fs.openSync, originalWrite = fs.writeSync, originalClose = fs.closeSync;
  const failure = Object.freeze(Object.assign(new Error('falha sintética'), { code: 'EIO' }));
  let fd, partial;
  observeBackupName(t);
  t.mock.method(fs, 'openSync', (path, flags, ...args) => {
    const result = originalOpen(path, flags, ...args);
    if (typeof path === 'string' && resolve(path).startsWith(backupRoot + sep) && flags === 'wx+') { fd = result; partial = resolve(path); }
    return result;
  });
  t.mock.method(fs, 'writeSync', (path, data, ...args) => {
    if (path === fd && partial) { originalWrite(fd, 'parcial'); throw failure; }
    return originalWrite(path, data, ...args);
  });
  t.mock.method(fs, 'closeSync', value => {
    originalClose(value);
    if (value === fd) throw Object.assign(new Error('falha sintética ao fechar'), { code: 'ENOSPC' });
  });
  syncBuiltinESMExports();
  let error; try { synchronize(options); } catch (caught) { error = caught; }
  assert.ok(partial); assert.equal(error?.code, 'EIO'); assert.equal(error.cause, failure);
  assert.equal(readFileSync(partial, 'utf8'), 'parcial');
  assert.ok(collectErrorDiagnostics(error).preservedPaths.includes(backupRoot));
  assert.ok(collectErrorDiagnostics(error).cleanupFailures.some(item => item.path === partial));
});

test('falha do sync após publicação informa backup sem alterar índice ou ignore', { timeout: 120000 }, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-sync-backup-diagnostic-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  git(root, 'init', '-q');
  put(root, '.gitignore', '# regra humana\n'); put(root, 'humano.txt', 'conteúdo preparado\n');
  git(root, 'add', '--', '.gitignore', 'humano.txt');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n'); synchronize(options);
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  const index = readFileSync(join(root, '.git/index')), ignore = readFileSync(join(root, '.gitignore'));
  const cause = Object.freeze(Object.assign(new Error('falha após publicação'), { code: 'EIO' }));
  let injected = false, failure;
  observeReplacement(t, join(root, '.pbai4devs/catalog.json'), () => {
    if (!injected) { injected = true; throw cause; }
  });
  syncBuiltinESMExports();
  try { synchronize(options); } catch (error) { failure = error; }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.ok(injected && failure); assert.equal(failure.code, 'EIO');
  const backups = fs.readdirSync(join(root, '.agent-tests')).filter(name => name.startsWith('sync-backup.'));
  assert.equal(backups.length, 1);
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes(join(root, '.agent-tests', backups[0])));
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(readFileSync(join(root, '.gitignore')), ignore);
});

test('sync executado diretamente orienta revisão após falha de publicação', { timeout: 120000 }, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-sync-direct-diagnostic-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q'); put(root, '.gitignore', '# regra humana\n'); put(root, 'humano.txt', 'sentinela preparada\n');
  git(root, 'add', '--', '.gitignore', 'humano.txt');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n'); synchronize(options);
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  const index = readFileSync(join(root, '.git/index')), ignore = readFileSync(join(root, '.gitignore'));
  const hook = join(root, 'injetar-falha.mjs');
  writeFileSync(hook, `
import fs from 'node:fs';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
const destination = process.env.ADK_TEST_DESTINATION;
function fail() { throw Object.assign(new Error('falha sintética após publicação'), { code: 'EIO' }); }
if (process.platform === 'win32') {
  const spawn = childProcess.spawnSync;
  childProcess.spawnSync = (program, args, options) => {
    const result = spawn(program, args, options);
    if (result.status === 0 && options?.env?.AGENTDEVKIT_DESTINATION === destination) fail();
    return result;
  };
} else {
  const rename = fs.renameSync;
  fs.renameSync = (from, to) => {
    const result = rename(from, to);
    if (to === destination) fail();
    return result;
  };
}
syncBuiltinESMExports();
`);
  const child = spawnSync(process.execPath, ['--import', pathToFileURL(hook).href, sync, '--root', root, '--force'], {
    env: { ...env, ADK_TEST_DESTINATION: join(root, '.pbai4devs/catalog.json') }, encoding: 'utf8', timeout: 120000,
  });
  assert.equal(child.status, 2, child.stderr);
  assert.match(child.stderr, /Causa: EIO/);
  assert.match(child.stderr, /pode ter deixado alterações/);
  assert.match(child.stderr, /dados parciais ou de outra origem/);
  assert.match(child.stderr, /sync-backup\./);
  assert.match(child.stdout, /integridade não verificada/);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(readFileSync(join(root, '.gitignore')), ignore);
  assert.equal(readFileSync(join(root, 'humano.txt'), 'utf8'), 'sentinela preparada\n');
});

test('backup do sync copia arquivo grande em blocos e conserva modo e bytes', { timeout: 120000 }, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-backup-stream-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  git(root, 'init', '-q');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', `---\nname: demo\ndescription: ${'A'.repeat(200000)}\n---\n\n# Demo\n`); synchronize(options);
  const name = '.pbai4devs/catalog.json', source = join(root, name);
  const bytes = readFileSync(source);
  // Special bits are rejected before backup; sync-special-mode tests that guard.
  const requestedMode = process.platform === 'win32' ? 0o666 : 0o755; chmodSync(source, requestedMode);
  const beforeMode = fs.statSync(source).mode & 0o7777;
  fs.utimesSync(source, new Date(Date.now() - 86400000), new Date(Date.now() + 86400000));
  const beforeAtime = fs.statSync(source, { bigint: true }).atimeNs;
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  const open = fs.openSync, read = fs.readSync, close = fs.closeSync; let sourceFd, reads = 0, maximum = 0;
  t.mock.method(fs, 'openSync', (path, flags, ...args) => {
    const result = open(path, flags, ...args);
    if (path === source && typeof flags === 'number') sourceFd = result;
    return result;
  });
  t.mock.method(fs, 'readSync', (fd, buffer, offset, length, position) => {
    if (fd === sourceFd) { reads++; maximum = Math.max(maximum, length); }
    return read(fd, buffer, offset, length, position);
  });
  t.mock.method(fs, 'closeSync', fd => { if (fd === sourceFd) sourceFd = undefined; return close(fd); });
  syncBuiltinESMExports();
  const result = synchronize(options), copy = join(result.backupRoot, name);
  const atimeDifference = fs.statSync(copy, { bigint: true }).atimeNs - beforeAtime;
  assert.ok(atimeDifference > -1000000n && atimeDifference < 1000000n, 'o backup deve conservar o tempo de acesso anterior ao planejamento');
  assert.deepEqual(readFileSync(copy), bytes);
  assert.equal(fs.statSync(copy).mode & 0o7777, beforeMode);
  assert.ok(reads >= 4); assert.equal(maximum, 65536);
});

test('backup do sync recusa troca da origem por link antes da abertura', {
  skip: process.platform === 'win32' ? 'A fixture cria um link simbólico de arquivo, que exige privilégio específico no Windows.' : false,
  timeout: 120000,
}, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-backup-source-link-')));
  const external = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-backup-source-external-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); rmSync(external, { recursive: true, force: true }); });
  git(root, 'init', '-q');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n'); synchronize(options);
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  const source = join(root, '.pbai4devs/catalog.json'), sentinel = join(external, 'sentinela');
  writeFileSync(sentinel, 'não copiar\n'); const expected = readFileSync(source), open = fs.openSync;
  let injected = false;
  t.mock.method(fs, 'openSync', (path, flags, ...args) => {
    if (!injected && path === source && typeof flags === 'number') {
      injected = true; fs.renameSync(source, `${source}.salvo`); fs.symlinkSync(sentinel, source);
    }
    return open(path, flags, ...args);
  });
  syncBuiltinESMExports();
  let failure; try { synchronize(options); } catch (error) { failure = error; }
  assert.equal(injected, true); assert.ok(failure);
  assert.equal(readFileSync(sentinel, 'utf8'), 'não copiar\n'); assert.deepEqual(readFileSync(`${source}.salvo`), expected);
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.some(path => path.includes('sync-backup.')));
});

for (const variant of ['iguais', 'diferentes']) test(`sync interrompe backup substituído após abertura com bytes ${variant}`, { timeout: 120000 }, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-backup-replaced-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  git(root, 'init', '-q'); put(root, '.gitignore', '# humano\n'); git(root, 'add', '.gitignore');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n'); synchronize(options);
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  const source = join(root, '.pbai4devs/catalog.json'), before = readFileSync(source), index = readFileSync(join(root, '.git/index'));
  const open = fs.openSync, write = fs.writeSync; let fd, backup, changed = false, human;
  t.mock.method(fs, 'openSync', (path, flags, ...args) => {
    const result = open(path, flags, ...args);
    if (typeof path === 'string' && resolve(path).startsWith(join(root, '.agent-tests') + sep) && flags === 'wx+') { fd = result; backup = resolve(path); }
    return result;
  });
  t.mock.method(fs, 'writeSync', (descriptor, ...args) => {
    const result = write(descriptor, ...args);
    if (!changed && descriptor === fd && backup) {
      changed = true; human = variant === 'iguais' ? before : Buffer.from('substituto humano\n');
      fs.unlinkSync(backup); writeFileSync(backup, human, { flag: 'wx' });
    }
    return result;
  });
  syncBuiltinESMExports();
  let failure; try { synchronize(options); } catch (error) { failure = error; }
  assert.ok(changed && backup, `fixture deve interceptar o backup (cwd=${process.cwd()}, backup=${backup})`); assert.ok(failure, 'backup substituído deve interromper a operação');
  assert.deepEqual(readFileSync(backup), human); assert.deepEqual(readFileSync(source), before);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.some(path => backup.startsWith(path + sep)));
});

test('sync limita backup quando origem cresce durante a cópia', { timeout: 120000 }, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-backup-growing-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  git(root, 'init', '-q');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n'); synchronize(options);
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  const source = join(root, '.pbai4devs/catalog.json'), originalSize = fs.statSync(source).size, appended = Buffer.alloc(131072, 'x');
  const open = fs.openSync, read = fs.readSync; let sourceFd, backup, injected = false;
  t.mock.method(fs, 'openSync', (path, flags, ...args) => {
    const result = open(path, flags, ...args);
    if (path === source && typeof flags === 'number') sourceFd = result;
    if (typeof path === 'string' && resolve(path).startsWith(join(root, '.agent-tests') + sep) && flags === 'wx+') backup = resolve(path);
    return result;
  });
  t.mock.method(fs, 'readSync', (fd, ...args) => {
    if (!injected && fd === sourceFd && backup) { injected = true; fs.appendFileSync(source, appended); }
    return read(fd, ...args);
  });
  syncBuiltinESMExports();
  let failure; try { synchronize(options); } catch (error) { failure = error; }
  assert.ok(injected && backup && failure); assert.equal(fs.statSync(source).size, originalSize + appended.length);
  assert.ok(fs.statSync(backup).size <= originalSize, 'cópia parcial não deve incluir bytes além do tamanho capturado');
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.some(path => backup.startsWith(path + sep)));
});

test('sync detecta corrupção do backup com tamanho inalterado', { timeout: 120000 }, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-backup-corrupt-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  git(root, 'init', '-q');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n'); synchronize(options);
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  const source = join(root, '.pbai4devs/catalog.json'), before = readFileSync(source), open = fs.openSync, write = fs.writeSync;
  let fd, backup, corrupted = false;
  t.mock.method(fs, 'openSync', (path, flags, ...args) => {
    const result = open(path, flags, ...args);
    if (typeof path === 'string' && resolve(path).startsWith(join(root, '.agent-tests') + sep) && flags === 'wx+') { fd = result; backup = resolve(path); }
    return result;
  });
  t.mock.method(fs, 'writeSync', (target, data, offset, length, position) => {
    if (!corrupted && target === fd && Buffer.isBuffer(data) && length > 0) {
      corrupted = true; const changed = Buffer.from(data.subarray(offset, offset + length)); changed[0] ^= 1;
      return write(target, changed, 0, changed.length, position);
    }
    return write(target, data, offset, length, position);
  });
  syncBuiltinESMExports();
  let failure; try { synchronize(options); } catch (error) { failure = error; }
  assert.ok(corrupted && backup && failure); assert.deepEqual(readFileSync(source), before);
  assert.equal(fs.statSync(backup).size, before.length); assert.notDeepEqual(readFileSync(backup), before);
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.some(path => backup.startsWith(path + sep)));
});

test('planejamento em estágio consulta o sync sem criar backups', { timeout: 120000 }, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-stage-readonly-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  git(root, 'init', '-q'); put(root, '.gitignore', '# humano\n'); git(root, 'add', '.gitignore');
  applyPlan(planInstallation({ target: root, mode: 'init', clients: ['codex'] }));
  const skill = '.pbai4devs/skills/projeto/configurar-projeto/SKILL.md';
  put(root, skill, readFileSync(join(root, skill), 'utf8').replace(/^description:.*$/m, 'description: edição humana.'));
  const before = readFileSync(join(root, skill)), index = readFileSync(join(root, '.git/index')), ignore = readFileSync(join(root, '.gitignore'));
  const recovery = inspectProjectRecovery(root);
  const open = fs.openSync; let backupOpens = 0;
  t.mock.method(fs, 'openSync', (path, flags, ...args) => {
    if (typeof path === 'string' && path.includes('sync-backup.') && flags === 'wx+') backupOpens++;
    return open(path, flags, ...args);
  });
  syncBuiltinESMExports();
  const plan = planInstallation({ target: root, mode: 'agents', clients: ['claude'] });
  assert.ok(plan); assert.equal(backupOpens, 0, 'a prévia somente leitura não deve iniciar a cópia de backup');
  assert.deepEqual(readFileSync(join(root, skill)), before);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(readFileSync(join(root, '.gitignore')), ignore);
  assert.deepEqual(inspectProjectRecovery(root), recovery);
});

for (const entry of ['planejador', 'CLI JSON', 'doctor JSON', 'doctor humano']) for (const language of entry.startsWith('doctor') ? ['pt', 'en', 'es'] : ['pt']) test(`erro agrupado em estágio removido preserva código e causa (${entry}, ${language})`, { timeout: 120000 }, async t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-stage-aggregate-'))); let stage;
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); if (stage && existsSync(stage)) rmSync(stage, { recursive: true, force: true }); rmSync(root, { recursive: true, force: true }); });
  git(root, 'init', '-q'); put(root, '.gitignore', '# regra humana\n'); put(root, 'humano.txt', 'sentinela preparada\n');
  git(root, 'add', '--', '.gitignore', 'humano.txt');
  const doctor = entry.startsWith('doctor'), human = entry === 'doctor humano';
  if (doctor) {
    applyPlan(planInstallation({ target: root, mode: 'init', clients: ['codex'] }));
    const skill = '.pbai4devs/skills/projeto/configurar-projeto/SKILL.md';
    put(root, skill, readFileSync(join(root, skill), 'utf8').replace(/^description:.*$/m, 'description: Conteúdo humano sintético.'));
    assert.ok(inspect(root).issues.length > 0, 'doctor deve iniciar com outra ocorrência');
  }
  const index = readFileSync(join(root, '.git/index')), ignore = readFileSync(join(root, '.gitignore'));
  const primary = Object.freeze(Object.assign(new Error('falha primária sintética'), { code: 'EIO' }));
  const failure = Object.freeze(new AggregateError([primary], 'falha agrupada sintética'));
  const read = fs.readFileSync; let injected = false;
  observePrivateStage(t, path => { stage = path; });
  t.mock.method(fs, 'readFileSync', (path, ...args) => {
    // The synchronizer captures the config as bytes before it plans any
    // output writes. The preceding manifest writer reads it as UTF-8.
    if (!injected && stage && path === join(stage, '.pbai4devs/espelhos.conf') && !args.length) {
      injected = true;
      throw failure;
    }
    return read(path, ...args);
  });
  syncBuiltinESMExports();
  let error, details;
  if (entry === 'planejador') {
    try { planInstallation({ target: root, mode: 'init', clients: ['claude'] }); } catch (caught) { error = caught; }
    details = error?.message;
  } else {
    let text = '';
    const argv = doctor ? ['doctor', '--target', root, '--lang', language] : ['init', '--agents', 'claude', '--target', root];
    if (!human) argv.push('--json');
    const exit = await cliMain(argv, { cwd: root, stdout: { write: value => { text += value; } } });
    assert.notEqual(exit, 0);
    if (human) {
      assert.match(text, /planejamento falhou em um estágio temporário|planning failed in a temporary stage|planificación falló en un área temporal/i);
      assert.doesNotMatch(text, /pode ter deixado caminhos temporários|may have left temporary paths|puede haber dejado rutas temporales/i);
      assert.match(text, /claude-inspection-unverified: \.claude\/rules \(EIO\)/);
    } else {
      const result = JSON.parse(text); assert.equal(result.ok, false);
      error = result.error; details = result.error.detail;
      assert.equal(error.scope, 'staging');
      if (doctor) {
        assert.match(result.next[0].label, /planejamento falhou em um estágio temporário|planning failed in a temporary stage|planificación falló en un área temporal/i);
        assert.ok(!result.error.preservedPaths?.length, 'nenhum caminho de estágio removido deve ser listado');
        assert.ok(result.issues.some(item => item.causeCode === 'EIO'));
      }
    }
  }
  assert.ok(injected && stage); assert.equal(existsSync(stage), false);
  if (!human) assert.equal(error?.code, 'EIO');
  if (!doctor) assert.match(details, /falha primária sintética/);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(readFileSync(join(root, '.gitignore')), ignore);
  assert.equal(readFileSync(join(root, 'humano.txt'), 'utf8'), 'sentinela preparada\n');
});

test('migração recusa Git aninhado antes de ler seus arquivos', { timeout: 120000 }, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-nested-legacy-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  git(root, 'init', '-q', '-b', 'main'); put(root, '.gitignore', '# humano\n'); git(root, 'add', '.gitignore');
  applyPlan(planInstallation({ target: root, mode: 'init', clients: ['codex'] }));
  fs.renameSync(join(root, '.pbai4devs/state'), join(root, '.pbai4devs/estado'));
  const nested = join(root, '.pbai4devs/estado/custom'); mkdirSync(nested); git(nested, 'init', '-q');
  put(nested, '.git/sentinela', 'privado sintético\n'); const index = readFileSync(join(root, '.git/index'));
  const read = fs.readFileSync; let exposed = false;
  t.mock.method(fs, 'readFileSync', (path, ...args) => { if (String(path).startsWith(join(nested, '.git') + sep)) exposed = true; return read(path, ...args); });
  syncBuiltinESMExports();
  assert.throws(() => planInstallation({ target: root, mode: 'update' }), error => error.code === 'E_NESTED_GIT');
  assert.equal(exposed, false); assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(fs.existsSync(join(root, '.pbai4devs/state')), false);
});

for (const marker of ['diretório', 'arquivo']) for (const operation of ['init', 'sync']) {
  test(`${operation} recusa Git aninhado independente com .git ${marker}`, { timeout: 120000 }, t => {
    const outer = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-nested-independent-')));
    t.after(() => rmSync(outer, { recursive: true, force: true }));
    const root = join(outer, 'project'), nested = join(root, '.agents'); mkdirSync(nested, { recursive: true });
    git(root, 'init', '-q', '-b', 'main'); put(root, '.gitignore', '# ignore humano\n'); git(root, 'add', '.gitignore');
    if (marker === 'arquivo') git(nested, 'init', '-q', '--separate-git-dir', join(outer, 'nested.git'));
    else git(nested, 'init', '-q');
    const item = operation === 'init' ? 'agents/analista-performance.md' : 'skills/demo/SKILL.md';
    put(nested, item, '# Apenas staged\n'); git(nested, 'add', '-f', item); rmSync(join(nested, item));
    if (operation === 'sync') {
      put(root, '.pbai4devs/espelhos.conf', 'agente|.agents|plano\n');
      for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
      put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
    }
    const topIndex = readFileSync(join(root, '.git/index')), indexPath = git(nested, 'rev-parse', '--git-path', 'index');
    const innerIndex = isAbsolute(indexPath) ? indexPath : join(nested, indexPath), beforeInner = readFileSync(innerIndex);
    const beforeIgnore = readFileSync(join(root, '.gitignore'));
    if (operation === 'sync') {
      const preview = synchronize({ root, check: true, localIgnores: false, generateEntrypoints: false, output() {} });
      assert.equal(preview.exitCode, 1);
      assert.ok(preview.preserved.some(item => item.path === '.agents' && item.reason === 'nested-git'));
      assert.equal(existsSync(join(nested, item)), false);
    }
    const action = operation === 'init' ? () => planInstallation({ target: root, mode: 'init', clients: ['codex'] })
      : () => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
    assert.throws(action, error => error.code === 'E_NESTED_GIT');
    assert.equal(existsSync(join(nested, item)), false);
    assert.deepEqual(readFileSync(join(root, '.git/index')), topIndex); assert.deepEqual(readFileSync(innerIndex), beforeInner);
    assert.deepEqual(readFileSync(join(root, '.gitignore')), beforeIgnore);
    assert.equal(git(nested, 'show', `:${item}`), '# Apenas staged');
  });
}

for (const operation of ['init', 'sync']) test(`${operation} não reverte arquivos após detectar Git aninhado criado durante aplicação`, { timeout: 120000 }, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-nested-late-'))), nested = join(root, '.agents');
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  git(root, 'init', '-q', '-b', 'main'); let action;
  if (operation === 'init') {
    const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] }); action = () => applyPlan(plan);
  } else {
    put(root, '.pbai4devs/espelhos.conf', 'agente|.agents|plano\n');
    for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
    for (const name of ['demo', 'segundo']) put(root, `.pbai4devs/skills/${name}/SKILL.md`, `---\nname: ${name}\ndescription: Fixture.\n---\n\n# Demo\n`);
    action = () => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  }
  let injected = false, first, stagedBytes, stagedIndex;
  function trackPublished(to) {
    if (!injected && typeof to === 'string' && to.startsWith(nested + sep)) {
      injected = true; first = to; git(nested, 'init', '-q');
      const name = relative(nested, to).split(sep).join('/'); git(nested, 'add', '-f', '--', name);
      stagedBytes = readFileSync(first); stagedIndex = readFileSync(join(nested, '.git/index'));
    }
  }
  observePublicCreates(t, root, { afterClose: trackPublished });
  syncBuiltinESMExports();
  let failure; try { action(); } catch (error) { failure = error; }
  assert.equal(failure?.code, 'E_NESTED_GIT'); assert.ok(injected && first && stagedBytes && stagedIndex);
  assert.deepEqual(readFileSync(first), stagedBytes); assert.deepEqual(readFileSync(join(nested, '.git/index')), stagedIndex);
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.some(path => first === join(root, path) || first.startsWith(join(root, path) + sep)));
  assert.equal(git(nested, 'show', `:${relative(nested, first).split(sep).join('/')}`), stagedBytes.toString('utf8').trim());
});

test('criação do instalador recusa arquivo humano surgido após validação', { timeout: 120000 }, t => {
  const root = recoveryFixture(), plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const selected = plan.changes.find(change => change.action === 'create' && change.path.startsWith('.pbai4devs/'));
  const destination = join(root, selected.path);
  const open = fs.openSync;
  let identity;
  observePublicCreates(t, root, { beforeOpen(path) {
    if (path === destination) {
      const fd = open(path, 'wx', 0o600);
      try { writeFileSync(fd, 'humano concorrente\n'); } finally { fs.closeSync(fd); }
      identity = fs.statSync(path, { bigint: true });
    }
  } });
  assert.throws(() => applyPlan(plan), error => error.code === 'EEXIST');
  checkRecoverablePartial(root, plan);
  assert.equal(readFileSync(destination, 'utf8'), 'humano concorrente\n');
  assert.equal(fs.statSync(destination, { bigint: true }).ino, identity.ino);
});

for (const format of ['json', 'humano']) test(`init sem hardlinks no diário informa publicação incerta em ${format}`, { timeout: 120000 }, async t => {
  const root = recoveryFixture();
  put(root, 'human.txt', 'humano staged\n'); git(root, 'add', 'human.txt');
  const index = readFileSync(join(root, '.git/index')), link = fs.linkSync;
  let stage;
  t.mock.method(fs, 'linkSync', (from, to) => {
    if (from.startsWith(join(root, '.agent-tests', 'agentdevkit', 'recovery', 'journal', 'staging') + sep)) {
      stage = from; throw Object.assign(new Error('hardlink unavailable'), { code: 'ENOTSUP' });
    }
    return link(from, to);
  });
  syncBuiltinESMExports();
  try {
    let output = ''; const writer = { write: chunk => { output += chunk; } };
    const status = await cliMain(['init', '--agents', 'codex', '--target', root, '--yes', ...(format === 'json' ? ['--json'] : [])], { stdout: writer, stderr: writer });
    assert.notEqual(status, 0); assert.ok(stage && existsSync(stage));
    assert.equal(existsSync(join(root, '.pbai4devs')), false);
    assert.deepEqual(readFileSync(join(root, '.git/index')), index);
    assert.equal(readFileSync(join(root, 'human.txt'), 'utf8'), 'humano staged\n');
    const journal = dirname(dirname(stage));
    if (format === 'json') {
      const result = JSON.parse(output);
      assert.equal(result.error.code, 'E_RECOVERY_UNCERTAIN');
      assert.equal(result.error.operation.kind, 'claim');
      assert.equal(result.error.operation.publication, 'possible');
      assert.equal(result.recovery.journal, journal);
    } else {
      assert.match(output, /E_RECOVERY_UNCERTAIN/);
      assert.ok(output.includes(JSON.stringify(journal))); assert.match(output, /Geração 1/);
    }
  } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
});

test('falha de limpeza do stage informa diretório temporário real e preserva erro primário', { timeout: 120000 }, async t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-stage-cleanup-'))); let stage;
  const remove = fs.rmSync, originalRead = fs.readFileSync;
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); if (stage) remove(stage, { recursive: true, force: true }); remove(root, { recursive: true, force: true }); });
  git(root, 'init', '-q', '-b', 'main'); put(root, 'human.txt', 'humano staged\n'); git(root, 'add', 'human.txt');
  const index = readFileSync(join(root, '.git/index'));
  observePrivateStage(t, path => { stage = path; });
  t.mock.method(fs, 'readFileSync', (path, ...args) => {
    if (stage && String(path).startsWith(stage + sep) && String(path).endsWith(`${sep}espelhos.conf`)) throw Object.assign(new Error('falha de leitura do estágio'), { code: 'EIO' });
    return originalRead(path, ...args);
  });
  t.mock.method(fs, 'rmSync', (path, ...args) => { if (path === stage) throw Object.assign(new Error('stage ocupado'), { code: 'EACCES' }); return remove(path, ...args); });
  syncBuiltinESMExports();
  let output = ''; const writer = { write: chunk => { output += chunk; }, isTTY: false };
  const status = await cliMain(['init', '--agents', 'codex', '--target', root, '--yes', '--json'], { cwd: root, stdout: writer, stderr: writer, stdin: { isTTY: false } });
  const result = JSON.parse(output); assert.notEqual(status, 0); assert.equal(result.error.code, 'EIO'); assert.match(result.error.detail, /falha de leitura do estágio/);
  assert.ok(existsSync(stage)); assert.ok(result.error.cleanupFailures.some(item => item.path === stage && item.message === 'cleanup failed'));
  assert.ok((result.error.preservedPaths || []).every(path => {
    const local = relative(stage, path);
    return local && !isAbsolute(local) && local !== '..' && !local.startsWith(`..${sep}`);
  }));
  assert.deepEqual(readFileSync(join(root, '.git/index')), index); assert.deepEqual(fs.readdirSync(root).sort(), ['.git', 'human.txt']);
});

test('volume sem hardlinks interrompe reserva e preserva arquivo e índice humanos', { timeout: 120000 }, t => {
  const root = recoveryFixture();
  put(root, 'human.txt', 'humano staged\n'); git(root, 'add', 'human.txt');
  const index = readFileSync(join(root, '.git/index')), plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  t.mock.method(fs, 'linkSync', () => { throw Object.assign(new Error('volume sem hardlinks'), { code: 'ENOTSUP' }); });
  syncBuiltinESMExports();
  try { assert.throws(() => applyPlan(plan), error => error.code === 'E_RECOVERY_UNCERTAIN' && error.operation.kind === 'claim'); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(readFileSync(join(root, 'human.txt'), 'utf8'), 'humano staged\n');
  assert.equal(existsSync(join(root, '.pbai4devs')), false);
});

test('falha após publicação exclusiva preserva os bytes publicados e sua identidade', { timeout: 120000 }, t => {
  const root = recoveryFixture(), plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const selected = plan.changes.find(change => change.action === 'create'), target = join(root, selected.path);
  let before;
  observePublicCreates(t, root, { afterClose(path) {
    if (path === target) { before = fs.statSync(path, { bigint: true }); throw new Error('resultado ambíguo'); }
  } });
  assert.throws(() => applyPlan(plan), /resultado ambíguo/);
  checkRecoverablePartial(root, plan);
  assert.deepEqual(readFileSync(target), selected.content);
  const after = fs.statSync(target, { bigint: true });
  assert.equal(after.ino, before.ino); assert.equal(after.dev, before.dev); assert.equal(after.mode, before.mode);
});

test('erro após substituição preserva erro original, publicação e backup', { timeout: 120000 }, () => {
  const root = recoveryFixture(); put(root, 'AGENTS.md', '# Humano\n');
  const target = join(root, 'AGENTS.md'), plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const change = plan.changes.find(change => change.path === 'AGENTS.md' && change.action === 'update');
  const primary = Object.assign(new Error('falha após atualização'), { code: 'EIO' });
  let identity;
  plan.changes.push({ path: 'fault.txt', action: 'create', beforeHash: null, get content() {
    identity = fs.statSync(target, { bigint: true }); throw primary;
  } });
  assert.throws(() => applyPlan(plan), error => error === primary);
  const state = checkRecoverablePartial(root, plan), entries = JSON.parse(readFileSync(join(state.backup, 'manifest.json'))).entries;
  const original = entries.find(entry => entry.path === 'AGENTS.md');
  assert.equal(readFileSync(join(state.backup, 'blobs', original.blob), 'utf8'), '# Humano\n');
  assert.deepEqual(readFileSync(target), change.content);
  assert.equal(fs.statSync(target, { bigint: true }).ino, identity.ino);
});

test('falha após publicação não apaga edição humana concorrente', { timeout: 120000 }, t => {
  const root = recoveryFixture(), plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const selected = plan.changes.find(change => change.action === 'create' && change.path.startsWith('.pbai4devs/'));
  const target = join(root, selected.path); let identity;
  observePublicCreates(t, root, { afterClose(path) {
    if (path === target) { writeFileSync(path, 'humano concorrente\n'); identity = fs.statSync(path, { bigint: true }); throw new Error('resultado ambíguo'); }
  } });
  assert.throws(() => applyPlan(plan), /resultado ambíguo/);
  checkRecoverablePartial(root, plan);
  assert.equal(readFileSync(target, 'utf8'), 'humano concorrente\n');
  assert.equal(fs.statSync(target, { bigint: true }).ino, identity.ino);
});

for (const format of ['json', 'humano']) test(`publicação incerta preserva e informa destino e backup em ${format}`, { timeout: 120000 }, async t => {
  const root = recoveryFixture(); let destination, identity, removalAttempted = false;
  const remove = fs.rmSync;
  t.mock.method(fs, 'rmSync', (path, ...rest) => { if (destination && path === destination) removalAttempted = true; return remove(path, ...rest); });
  observePublicCreates(t, root, { afterClose(path) {
    if (!destination) { destination = path; identity = fs.statSync(path, { bigint: true }); throw Object.assign(new Error('PRIVATE_OPERATION_MARKER'), { code: 'EIO' }); }
  } });
  let output = ''; const writer = { write: chunk => { output += chunk; } };
  const status = await cliMain(['init', '--agents', 'codex', '--target', root, '--yes', ...(format === 'json' ? ['--json'] : [])], { stdout: writer, stderr: writer });
  assert.notEqual(status, 0); assert.equal(removalAttempted, false);
  assert.equal(fs.statSync(destination, { bigint: true }).ino, identity.ino);
  const path = relative(root, destination).split(sep).join('/'), pending = checkRecoverablePartial(root);
  assert.ok(!output.includes('PRIVATE_OPERATION_MARKER'));
  if (format === 'json') {
    const result = JSON.parse(output);
    assert.equal(result.error.code, 'EIO'); assert.ok(result.error.preservedPaths.includes(path));
    assert.equal(result.recovery.backup, pending.backup);
    assert.ok(result.next.every(step => step.stage === 'revisao' && !step.command));
  } else {
    assert.ok(output.includes(path)); assert.ok(output.includes(JSON.stringify(pending.backup)));
    assert.match(output, /pode ter deixado/i);
  }
});

for (const [language, wording] of [['pt', /pode ter deixado/i], ['en', /may have left/i], ['es', /puede haber dejado/i]]) test(`falha após publicação informa revisão antes de outra mutação (${language})`, { timeout: 120000 }, async t => {
  const root = recoveryFixture(); let published;
  observePublicCreates(t, root, { afterClose(path) {
    published = path;
    throw Object.assign(new Error('falha após publicação'), { code: 'EIO' });
  } });
  let output = ''; const writer = { write: chunk => { output += chunk; } };
  const status = await cliMain(['init', '--target', root, '--agents', 'codex', '--yes', '--lang', language, '--json'], { stdout: writer, stderr: writer });
  assert.notEqual(status, 0); assert.ok(published && existsSync(published));
  const result = JSON.parse(output);
  assert.equal(result.error.code, 'EIO'); assert.equal(result.recovery.status, 'pending');
  assert.ok(result.error.preservedPaths.includes(relative(root, published).split(sep).join('/')));
  assert.ok(result.next.every(step => step.stage === 'revisao' && !step.command)); assert.match(result.next[0].label, wording);
});

for (const format of ['api', 'json', 'humano']) test(`erro agregado preserva causa primária, arquivos e backup em ${format}`, { timeout: 120000 }, async t => {
  const root = recoveryFixture(), primary = Object.assign(new Error('falha original'), { code: 'EIO' });
  const secondary = Object.assign(new Error('PRIVATE_SECONDARY_MARKER'), { code: 'EACCES' });
  const aggregate = new AggregateError([primary, secondary], 'publicação interrompida', { cause: primary });
  const plan = format === 'api' ? planInstallation({ target: root, mode: 'init', clients: ['codex'] }) : null;
  const states = new Map();
  observePublicCreates(t, root, { afterClose(path) {
    states.set(path, { bytes: readFileSync(path), identity: fs.statSync(path, { bigint: true }) });
    if (states.size === 2) throw aggregate;
  } });
  if (format === 'api') {
    assert.throws(() => applyPlan(plan), error => error === aggregate && error.errors.includes(primary) && error.errors.includes(secondary));
  } else {
    let output = ''; const writer = { write: chunk => { output += chunk; } };
    const status = await cliMain(['init', '--target', root, '--agents', 'codex', '--yes', ...(format === 'json' ? ['--json'] : [])], { stdout: writer, stderr: writer });
    assert.notEqual(status, 0); assert.ok(!output.includes(secondary.message));
    if (format === 'json') {
      const result = JSON.parse(output); assert.equal(result.error.code, 'EIO'); assert.equal(result.recovery.status, 'pending');
      assert.ok(result.error.preservedPaths.includes(result.recovery.backup));
    } else { assert.match(output, /EIO/); assert.match(output, /Backup/); }
  }
  checkRecoverablePartial(root, plan);
  assert.equal(states.size, 2);
  for (const [path, observed] of states) {
    assert.deepEqual(readFileSync(path), observed.bytes);
    const current = fs.statSync(path, { bigint: true });
    assert.equal(current.ino, observed.identity.ino); assert.equal(current.mode, observed.identity.mode);
  }
});


for (const format of ['json', 'humano']) test(`limpeza isolada do instalador informa estágio em ${format}`, { timeout: 120000 }, async t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-cleanup-output-')));
  git(root, 'init', '-q', '-b', 'main');
  const remove = fs.rmSync;
  let stage;
  t.after(() => {
    t.mock.restoreAll();
    syncBuiltinESMExports();
    if (stage) remove(stage, { recursive: true, force: true });
    remove(root, { recursive: true, force: true });
  });
  observePrivateStage(t, path => { stage = path; });
  t.mock.method(fs, 'rmSync', (path, ...args) => {
    if (path === stage) throw Object.assign(new Error('limpeza indisponível'), { code: 'EACCES' });
    return remove(path, ...args);
  });
  syncBuiltinESMExports();
  let output = '';
  const writer = { write: chunk => { output += chunk; }, isTTY: false };
  const status = await cliMain(['init', '--agents', 'codex', '--target', root, '--yes', ...(format === 'json' ? ['--json'] : [])], { cwd: root, stdout: writer, stderr: writer, stdin: { isTTY: false } });
  assert.notEqual(status, 0); assert.ok(stage && existsSync(stage));
  assert.deepEqual(fs.readdirSync(root), ['.git']);
  if (format === 'json') {
    const result = JSON.parse(output);
    assert.equal(result.error.code, 'EACCES');
    assert.equal(result.error.detail, 'Cleanup failed in private staging.');
    assert.ok(result.error.cleanupFailures.some(item => item.path === stage && item.message === 'cleanup failed'));
  } else {
    assert.match(output, /Revise os caminhos preservados/);
    assert.ok(output.includes(stage));
  }
});

for (const format of ['json', 'humano']) test(`falha ao fechar arquivo do sync privado informa resíduo em ${format}`, { timeout: 120000 }, async t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-sync-stage-close-')));
  git(root, 'init', '-q', '-b', 'main');
  let stage, descriptor, temporary, failed = false;
  t.after(() => {
    t.mock.restoreAll();
    syncBuiltinESMExports();
    if (stage) rmSync(stage, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  });
  observePrivateStage(t, path => { stage = path; });
  const open = fs.openSync, close = fs.closeSync;
  t.mock.method(fs, 'openSync', (path, flags, ...args) => {
    const fd = open(path, flags, ...args);
    if (!temporary && flags === 'wx' && typeof path === 'string' && stage && path.startsWith(join(stage, '.agents') + sep)) {
      temporary = path;
      descriptor = fd;
    }
    return fd;
  });
  t.mock.method(fs, 'closeSync', fd => {
    close(fd);
    if (!failed && fd === descriptor) {
      failed = true;
      throw Object.assign(new Error('falha ao fechar arquivo do estágio'), { code: 'EIO' });
    }
  });
  syncBuiltinESMExports();
  let output = '';
  const writer = { write: chunk => { output += chunk; }, isTTY: false };
  const status = await cliMain(['init', '--agents', 'codex', '--target', root, '--yes', ...(format === 'json' ? ['--json'] : [])], { cwd: root, stdout: writer, stderr: writer, stdin: { isTTY: false } });
  assert.notEqual(status, 0);
  assert.ok(stage && temporary && failed);
  assert.ok(readFileSync(temporary).length > 0);
  assert.deepEqual(fs.readdirSync(root), ['.git']);
  if (format === 'json') {
    const result = JSON.parse(output);
    assert.equal(result.error.code, 'EIO');
    assert.match(result.error.detail, /falha ao fechar arquivo do estágio/);
    assert.ok(result.error.preservedPaths.includes(stage));
    assert.ok(result.error.preservedPaths.includes(temporary));
  } else {
    assert.match(output, /Revise os caminhos preservados/);
    assert.ok(output.includes(stage));
    assert.ok(output.includes(temporary));
  }
});

for (const doubleFailure of [false, true]) test(`sync preserva o arquivo após falha ${doubleFailure ? 'de gravação e fechamento' : 'de fechamento'}`, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-sync-cleanup-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  git(root, 'init', '-q', '-b', 'main');
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
  const destination = join(root, '.claude/skills/demo/SKILL.md');
  const open = fs.openSync, close = fs.closeSync, write = fs.writeFileSync;
  const primary = Object.assign(new Error('falha original'), { code: 'EIO' });
  const secondaryMarker = 'SENTINELA_FALHA_DE_FECHAMENTO';
  const closing = Object.assign(new Error(doubleFailure ? secondaryMarker : 'falha ao fechar'), { code: 'EACCES' });
  let descriptor, written;
  t.mock.method(fs, 'openSync', (path, flags, ...args) => {
    const fd = open(path, flags, ...args);
    if (path === destination && flags === 'wx') descriptor = fd;
    return fd;
  });
  t.mock.method(fs, 'writeFileSync', (path, data, ...args) => {
    write(path, data, ...args);
    if (path === descriptor) {
      written = Buffer.from(data);
      if (doubleFailure) throw primary;
    }
  });
  t.mock.method(fs, 'closeSync', fd => {
    close(fd);
    if (fd === descriptor) {
      descriptor = undefined;
      throw closing;
    }
  });
  syncBuiltinESMExports();
  let failure;
  assert.throws(() => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }), error => {
    failure = error;
    assert.equal(primaryDiagnosticError(error), doubleFailure ? primary : closing);
    if (doubleFailure) {
      assert.ok(error.errors.includes(closing));
      assert.ok(!error.message.includes(secondaryMarker));
    }
    return true;
  });
  assert.ok(written);
  assert.deepEqual(readFileSync(destination), written);
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes('.claude/skills/demo/SKILL.md'));
  assert.equal(failure.recovery.phase, 'begin');
});

test('instalador preserva substituto humano de bytes e modo idênticos após falha', { timeout: 120000 }, t => {
  const root = recoveryFixture(), plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const first = join(root, plan.changes.find(change => change.action === 'create').path);
  let humanIdentity, bytes, mode;
  observePublicCreates(t, root, { afterClose(path, count) {
    if (count === 2) {
      bytes = readFileSync(first); mode = fs.statSync(first).mode & 0o777;
      const replacement = join(root, 'substituto-humano.txt'); writeFileSync(replacement, bytes, { mode });
      fs.renameSync(replacement, first); humanIdentity = fs.statSync(first, { bigint: true });
      throw new Error('falha posterior');
    }
  } });
  assert.throws(() => applyPlan(plan), /falha posterior/); checkRecoverablePartial(root, plan);
  assert.deepEqual(readFileSync(first), bytes); assert.equal(fs.statSync(first).mode & 0o777, mode);
  assert.equal(fs.statSync(first, { bigint: true }).ino, humanIdentity.ino);
});

for (const fail of [false, true]) test(`instalador fecha descritores de criação após ${fail ? 'falha' : 'sucesso'}`, { timeout: 120000 }, t => {
  const root = recoveryFixture();
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const { closed, descriptors } = observePublicCreates(t, root, { afterClose(path, count) {
    if (fail && count === 2) throw new Error('falha posterior');
  } });
  if (fail) { assert.throws(() => applyPlan(plan), /falha posterior/); checkRecoverablePartial(root, plan); }
  else { applyPlan(plan); assert.equal(inspectProjectRecovery(root).terminal, 'done'); }
  assert.ok(closed.length >= 2); assert.equal(descriptors.size, 0);
  for (const path of closed.slice(0, 2)) assert.ok(existsSync(path));
});

for (const prior of [1, 2]) test(`pressão de descritores preserva ${prior} criação já concluída`, { timeout: 120000 }, t => {
  const root = recoveryFixture(), plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const creates = plan.changes.filter(change => change.action === 'create');
  const failedPath = join(root, creates[prior].path), identities = new Map();
  const { closed, descriptors } = observePublicCreates(t, root, {
    beforeOpen(path) { if (path === failedPath) throw Object.assign(new Error('descritores esgotados'), { code: 'EMFILE' }); },
    afterClose(path) { identities.set(path, fs.statSync(path, { bigint: true })); },
  });
  let failure; assert.throws(() => applyPlan(plan), error => { failure = error; return error.code === 'EMFILE'; });
  const state = checkRecoverablePartial(root, plan), reported = collectErrorDiagnostics(failure).preservedPaths;
  assert.ok(reported.includes(state.backup)); assert.ok(reported.includes(creates[prior].path));
  assert.equal(closed.length, prior); assert.equal(descriptors.size, 0); assert.equal(existsSync(failedPath), false);
  for (const change of creates.slice(0, prior)) {
    const path = join(root, change.path);
    assert.deepEqual(readFileSync(path), change.content); assert.equal(fs.statSync(path, { bigint: true }).ino, identities.get(path).ino);
  }
});

test('instalador preserva arquivo existente com dois nomes antes da criação planejada', { timeout: 120000 }, () => {
  const root = recoveryFixture(), plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const change = plan.changes.find(item => item.action === 'create'), target = join(root, change.path), original = join(root, 'original-humano.txt');
  writeFileSync(original, 'arquivo humano\n'); mkdirSync(dirname(target), { recursive: true });
  linkSync(original, target);
  const before = fs.statSync(original, { bigint: true });
  assert.throws(() => applyPlan(plan), error => ['E_CHANGED', 'E_HARDLINK', 'E_CONFLICT', 'E_PROTECTED_METADATA'].includes(error.code));
  for (const path of [original, target]) {
    assert.equal(readFileSync(path, 'utf8'), 'arquivo humano\n');
    const current = fs.statSync(path, { bigint: true });
    assert.equal(current.ino, before.ino); assert.equal(current.nlink, before.nlink); assert.equal(current.mode, before.mode);
  }
});

test('dezessete criações concluídas sobrevivem a erro operacional posterior', { timeout: 120000 }, t => {
  const root = recoveryFixture(), plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const creates = plan.changes.filter(item => item.action === 'create');
  assert.ok(creates.length > 17);
  const { closed, descriptors } = observePublicCreates(t, root, { beforeOpen(path) {
    if (path === join(root, creates[17].path)) throw Object.assign(new Error('limite de descritores'), { code: 'EMFILE' });
  } });
  let failure; assert.throws(() => applyPlan(plan), error => { failure = error; return error.code === 'EMFILE'; });
  checkRecoverablePartial(root, plan);
  assert.equal(closed.length, 17); assert.equal(descriptors.size, 0);
  for (const item of creates.slice(0, 17)) assert.deepEqual(readFileSync(join(root, item.path)), item.content);
  assert.equal(existsSync(join(root, creates[17].path)), false);
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes(creates[17].path));
});


test('falha na criação do sync não tenta remover os caminhos públicos já gravados', t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-sync-no-rollback-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  git(root, 'init', '-q', '-b', 'main');
  put(root, '.gitignore', '# humano\n'); put(root, 'human.txt', 'staged\n');
  git(root, 'add', '.gitignore', 'human.txt');
  fs.appendFileSync(join(root, 'human.txt'), 'unstaged\n');
  const index = readFileSync(join(root, '.git/index'));
  const ignore = readFileSync(join(root, '.gitignore')), human = readFileSync(join(root, 'human.txt'));
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
  const remove = fs.rmSync;
  const primary = Object.assign(new Error('falha original sintética'), { code: 'EIO' });
  let first, failureInjected = false, cleanupAttempted = false;
  observePublicCreates(t, root, {
    afterClose(path) { first ||= path; },
    beforeOpen() { if (first) { failureInjected = true; throw primary; } },
  });
  t.mock.method(fs, 'rmSync', (path, ...args) => {
    if (path === first) cleanupAttempted = true;
    return remove(path, ...args);
  });
  syncBuiltinESMExports();
  assert.throws(() => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }), error => error === primary);
  assert.ok(failureInjected && first);
  assert.equal(cleanupAttempted, false);
  assert.ok(existsSync(first));
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(readFileSync(join(root, '.gitignore')), ignore);
  assert.deepEqual(readFileSync(join(root, 'human.txt')), human);
});

test('sync preserva substituto idêntico criado após publicação', t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-sync-published-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
  const open = fs.openSync;
  let first, bytes, originalIdentity, humanIdentity;
  observePublicCreates(t, root, {
    afterClose(path) { first ||= path; },
    beforeOpen() {
      if (!first) return;
      bytes = readFileSync(first);
      const metadata = fs.statSync(first, { bigint: true });
      originalIdentity = metadata.ino;
      const replacement = join(root, 'arquivo-humano');
      const fd = open(replacement, 'wx', Number(metadata.mode & 0o777n));
      try { writeFileSync(fd, bytes); } finally { fs.closeSync(fd); }
      fs.renameSync(replacement, first);
      humanIdentity = fs.statSync(first, { bigint: true }).ino;
      throw new Error('falha após publicação');
    },
  });
  assert.throws(() => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }), /falha após publicação/);
  assert.ok(humanIdentity); assert.notEqual(humanIdentity, originalIdentity);
  assert.equal(fs.statSync(first, { bigint: true }).ino, humanIdentity);
  assert.deepEqual(readFileSync(first), bytes);
});

for (const failedCreation of [0, 2, 18]) test(`sync fecha descritores ${failedCreation ? `após falhar na criação ${failedCreation}` : 'após sucesso'}`, { timeout: 120000 }, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-sync-guards-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  for (let i = 0; i < Math.max(failedCreation, 1); i++) {
    const name = `demo-${String(i).padStart(3, '0')}`;
    put(root, `.pbai4devs/skills/${name}/SKILL.md`, `---\nname: ${name}\ndescription: Fixture.\n---\n\n# Demo\n`);
  }
  let attempts = 0, blocked;
  const { closed, descriptors } = observePublicCreates(t, root, {
    beforeOpen(path) {
      if (++attempts === failedCreation) {
        blocked = path;
        throw Object.assign(new Error('descritores esgotados'), { code: 'EMFILE' });
      }
    },
  });
  const run = () => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  if (failedCreation) {
    assert.throws(run, error => error.code === 'EMFILE' && collectErrorDiagnostics(error).preservedPaths.includes(relative(root, blocked).split(sep).join('/')));
    assert.equal(closed.length, failedCreation - 1);
    assert.equal(existsSync(blocked), false);
  } else {
    run();
    assert.ok(closed.length > 0);
  }
  assert.equal(descriptors.size, 0);
  for (const path of closed) assert.ok(existsSync(path));
});

for (const kind of ['EEXIST', 'falha ambígua de abertura', 'EEXIST com conteúdo humano distinto']) test(`sync preserva dados e identidade do arquivo já presente: ${kind}`, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-identical-sync-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
  const destination = join(root, '.claude/skills/demo/SKILL.md');
  const open = fs.openSync;
  const bytes = Buffer.from(kind.endsWith('distinto') ? 'outra edição humana\n' : 'edição humana\n');
  let identity;
  observePublicCreates(t, root, { beforeOpen(path) {
    if (path !== destination) return;
    const fd = open(path, 'wx', 0o600);
    try { writeFileSync(fd, bytes); } finally { fs.closeSync(fd); }
    identity = fs.statSync(path, { bigint: true });
    if (!kind.startsWith('EEXIST')) throw Object.assign(new Error(kind), { code: 'EIO' });
  } });
  assert.throws(() => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }), { code: kind.startsWith('EEXIST') ? 'EEXIST' : 'EIO' });
  assert.ok(identity);
  const current = fs.statSync(destination, { bigint: true });
  assert.equal(current.ino, identity.ino);
  assert.equal(current.mode, identity.mode);
  assert.deepEqual(readFileSync(destination), bytes);
});

test('NTFS protege short name arbitrário existente e removido', {
  skip: process.platform !== 'win32' ? 'O teste requer aliases nativos do NTFS.' : false,
  timeout: 120000,
}, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-ntfs-short-name-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const content = 'fixture humana NTFS\n'; put(root, 'README.md', content);
  const script = String.raw`
$ErrorActionPreference = 'Stop'
$file = $env:ADK_TEST_FILE
$drive = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($file))
if ($drive.DriveFormat -ne 'NTFS') { throw 'A fixture de short name requer um volume NTFS.' }
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class AdkShortName {
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern SafeFileHandle CreateFile(string n, uint a, uint s, IntPtr sa, uint c, uint f, IntPtr t);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool SetFileShortName(SafeFileHandle h, string n);
}
'@
$handle = [AdkShortName]::CreateFile($file, 0x10000, 7, [IntPtr]::Zero, 3, 0x02000000, [IntPtr]::Zero)
if ($handle.IsInvalid) { throw "CreateFile: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }
try { if (-not [AdkShortName]::SetFileShortName($handle, 'ZFILE.TXT')) { throw "SetFileShortName: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" } } finally { $handle.Dispose() }
`;
  const systemRoot = process.env.SystemRoot;
  assert.ok(systemRoot, 'SystemRoot é necessário para encontrar o Windows PowerShell.');
  const powershell = join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const set = spawnSync(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], {
    env: { SystemRoot: systemRoot, TEMP: tmpdir(), TMP: tmpdir(), ADK_TEST_FILE: join(root, 'README.md') },
    encoding: 'utf8', windowsHide: true, timeout: 30000,
  });
  assert.ifError(set.error);
  assert.equal(set.status, 0, set.stderr?.trim() || set.signal || 'Falha ao criar o short name NTFS.');
  assert.equal(readFileSync(join(root, 'ZFILE.TXT'), 'utf8'), content, 'O short name precisa apontar para o arquivo da fixture.');
  stageSynthetic(root, 'ZFILE.TXT', 'conteúdo staged diferente\n');
  const index = readFileSync(join(root, '.git/index'));
  const expected = { 'README.md': createHash('sha256').update(content).digest('hex') };
  assert.ok(planUntrack(root, expected).conflicts.includes('README.md'));
  assert.deepEqual(readFileSync(join(root, 'README.md'), 'utf8'), content);
  rmSync(join(root, 'README.md'));
  assert.ok(planUntrack(root, expected).conflicts.includes('README.md'));
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('arquivo Unicode independente staged não impede init nem muda o índice', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-unrelated-unicode-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  put(root, 'relatório.txt', 'conteúdo humano\n'); git(root, 'add', '--', 'relatório.txt');
  const index = readFileSync(join(root, '.git/index'));
  const init = run(root, process.execPath, [bin, 'init', '--agents', 'codex', '--target', root, '--json']);
  assert.equal(init.status, 0, init.stdout + init.stderr);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(readFileSync(join(root, 'relatório.txt'), 'utf8'), 'conteúdo humano\n');
});

for (const name of ['relatorio~1.txt', 'relatorio.txt.']) test(`arquivo staged independente ${name} não impede init`, {
  skip: process.platform === 'win32' && name.endsWith('.') ? 'A API Win32 usada pela fixture normaliza o ponto final do nome.' : false,
  timeout: 120000,
}, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-unrelated-alias-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  put(root, name, 'conteúdo humano\n'); git(root, 'add', '--', name);
  const index = readFileSync(join(root, '.git/index'));
  const init = run(root, process.execPath, [bin, 'init', '--agents', 'codex', '--target', root, '--json']);
  assert.equal(init.status, 0, init.stdout + init.stderr);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(readFileSync(join(root, name), 'utf8'), 'conteúdo humano\n');
});

test('erro humano do sync é limitado e CLI JSON conserva o detalhe integral', () => {
  const argument = `--${'x'.repeat(2000)}`;
  const direct = run(repo, process.execPath, [sync, argument]);
  assert.notEqual(direct.status, 0);
  assert.ok(direct.stderr.length < 1300);
  assert.match(direct.stderr, /caracteres adicionais/);
  const structured = run(repo, process.execPath, [bin, '--json', argument]);
  assert.notEqual(structured.status, 0);
  assert.ok(JSON.parse(structured.stdout).error.detail.includes(argument));
});

for (const command of ['init', 'update', 'sync']) test(`${command} preserva índice staged com alias Unicode ẞ`, { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-sharp-s-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const canonical = '.codex/commands/proximos-passos/COMMAND.md', alias = '.codex/commands/proximos-paẞos/COMMAND.md';
  if (command !== 'init') {
    const init = run(root, process.execPath, [bin, 'init', '--agents', 'codex', '--target', root, '--json']);
    assert.equal(init.status, 0, init.stdout + init.stderr);
    rmSync(join(root, canonical));
  }
  stageSynthetic(root, alias, 'conteúdo humano staged\n');
  const index = readFileSync(join(root, '.git/index'));
  const args = command === 'init' ? ['init', '--agents', 'codex'] : [command, '--force'];
  const result = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(existsSync(join(root, canonical)), false, result.stdout + result.stderr);
});

test('prefixo aninhado com alias staged é diagnosticado e protegido', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-nested-index-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const sub = join(root, 'SubProject'); mkdirSync(sub);
  const alias = 'subproject/.claude/auth.json';
  stageSynthetic(root, alias, 'fixture privada\n');
  const index = readFileSync(join(root, '.git/index'));
  const diagnostics = checkLocalIgnore(planLocalIgnore(sub));
  assert.equal(diagnostics.ok, false);
  assert.ok(diagnostics.trackedOutputs.includes(alias), JSON.stringify(diagnostics.trackedOutputs));
  const canonical = '.claude/auth.json';
  const expected = { [canonical]: createHash('sha256').update('gerado\n').digest('hex') };
  assert.ok(planUntrack(sub, expected).conflicts.includes(canonical));
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('update aninhado preserva índice com prefixo de caixa diferente', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-nested-update-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const sub = join(root, 'SubProject'); mkdirSync(sub);
  const init = run(root, process.execPath, [bin, 'init', '--agents', 'codex', '--target', sub, '--json']);
  assert.equal(init.status, 0, init.stdout + init.stderr);
  const canonical = '.codex/commands/proximos-passos/COMMAND.md';
  rmSync(join(sub, canonical));
  stageSynthetic(root, `subproject/${canonical}`, 'conteúdo humano staged\n');
  const index = readFileSync(join(root, '.git/index'));
  const update = run(root, process.execPath, [bin, 'update', '--target', sub, '--force', '--json']);
  assert.equal(existsSync(join(sub, canonical)), false, update.stdout + update.stderr);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('sync direto bloqueia alias Unicode ẞ no índice', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-sharp-s-direct-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  const source = '.pbai4devs/skills/proximos-passos/SKILL.md';
  put(root, source, '---\nname: proximos-passos\ndescription: Antes.\n---\n\n# Antes\n');
  const execute = () => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  assert.equal(execute().exitCode, 0);
  const canonical = '.claude/skills/proximos-passos/SKILL.md', alias = '.claude/skills/proximos-paẞos/SKILL.md';
  const original = readFileSync(join(root, canonical));
  stageSynthetic(root, alias, 'conteúdo humano staged\n');
  const index = readFileSync(join(root, '.git/index'));
  put(root, source, '---\nname: proximos-passos\ndescription: Depois.\n---\n\n# Depois\n');
  assert.throws(execute, /indice|índice/i);
  assert.deepEqual(readFileSync(join(root, canonical)), original);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('sync preserva apontamento e índice com alias Unicode staged', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-unicode-sync-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  const source = '.pbai4devs/skills/sincronizar/SKILL.md';
  put(root, source, '---\nname: sincronizar\ndescription: Antes.\n---\n\n# Sincronizar\n');
  const syncFixture = () => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  assert.equal(syncFixture().exitCode, 0);
  const canonical = '.claude/skills/sincronizar/SKILL.md', alias = '.claude/skills/ſincronizar/SKILL.md';
  const original = readFileSync(join(root, canonical));
  put(root, alias, Buffer.concat([original, Buffer.from('\nConteúdo staged próprio.\n')])); git(root, 'add', '-f', alias);
  writeFileSync(join(root, canonical), original);
  const index = readFileSync(join(root, '.git/index')), aliasBytes = readFileSync(join(root, alias));
  put(root, source, '---\nname: sincronizar\ndescription: Depois.\n---\n\n# Sincronizar\n');
  assert.throws(syncFixture, /indice|índice/i);
  assert.deepEqual(readFileSync(join(root, canonical)), original);
  assert.deepEqual(readFileSync(join(root, alias)), aliasBytes);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('update não recria apontamento sobre alias Unicode staged', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-unicode-update-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const init = run(root, process.execPath, [bin, 'init', '--agents', 'codex', '--target', root, '--json']);
  assert.equal(init.status, 0, init.stdout + init.stderr);
  const canonical = '.codex/commands/sincronizar/COMMAND.md', alias = '.codex/commands/ſincronizar/COMMAND.md';
  put(root, alias, 'conteúdo humano staged\n'); git(root, 'add', '-f', alias);
  rmSync(join(root, canonical));
  const index = readFileSync(join(root, '.git/index'));
  const aliasBytes = existsSync(join(root, alias)) ? readFileSync(join(root, alias)) : null;
  const update = run(root, process.execPath, [bin, 'update', '--target', root, '--force', '--json']);
  assert.notEqual(update.status, 0, update.stdout + update.stderr);
  assert.equal(existsSync(join(root, canonical)), false);
  assert.deepEqual(existsSync(join(root, alias)) ? readFileSync(join(root, alias)) : null, aliasBytes);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('índice Git alternativo causa recusa antes de sync, update ou aplicação de plano', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-alternate-index-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); git(root, 'config', 'user.name', 'Teste'); git(root, 'config', 'user.email', 'teste@example.invalid');
  put(root, 'seed.txt', 'base\n'); git(root, 'add', 'seed.txt'); git(root, 'commit', '-qm', 'base');
  let result = run(root, process.execPath, [bin, 'init', '--agents', 'codex', '--target', root, '--json']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const pointer = '.codex/commands/sincronizar/COMMAND.md', file = join(root, pointer), original = readFileSync(file);
  const alternate = join(root, '.git/alternate-index'), altEnv = { ...env, GIT_INDEX_FILE: alternate };
  let gitResult = spawnSync('git', ['-C', root, 'read-tree', 'HEAD'], { env: altEnv, encoding: 'utf8' }); assert.equal(gitResult.status, 0, gitResult.stderr);
  writeFileSync(file, Buffer.concat([original, Buffer.from('\nConteúdo humano staged.\n')]));
  gitResult = spawnSync('git', ['-C', root, 'add', '-f', '--', pointer], { env: altEnv, encoding: 'utf8' }); assert.equal(gitResult.status, 0, gitResult.stderr);
  writeFileSync(file, original);
  const source = '.pbai4devs/commands/sincronizar/COMMAND.md';
  writeFileSync(join(root, source), readFileSync(join(root, source), 'utf8').replace('description:', 'description: alterada '));
  const watched = ['.git/index', '.git/alternate-index', '.git/config', '.git/info/exclude', pointer, source].map(path => join(root, path));
  const before = watched.map(path => readFileSync(path));
  const redirects = [['GIT_INDEX_FILE', alternate], ['git_index_file', alternate], ['GIT_DIR', join(root, '.git')], ['GIT_WORK_TREE', root], ['GIT_COMMON_DIR', join(root, '.git')]];
  for (const [key, value] of redirects) for (const args of [['init', '--agents', 'codex'], ['init', '--dry-run'], ['update', '--force'], ['sync', '--force'], ['sync', '--check'], ['doctor']]) {
    const polluted = { ...env, [key]: value };
    result = spawnSync(process.execPath, [bin, ...args, '--target', root, '--json'], { cwd: root, env: polluted, encoding: 'utf8', timeout: 120000, maxBuffer: 20 * 1024 * 1024 });
    assert.equal(result.status, 1, result.stdout + result.stderr); assert.equal(JSON.parse(result.stdout).error.code, 'E_GIT_ENV');
    watched.forEach((path, index) => assert.deepEqual(readFileSync(path), before[index], path));
  }
  result = spawnSync(process.execPath, [sync, '--root', root, '--force'], { cwd: root, env: altEnv, encoding: 'utf8', timeout: 120000 });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /Git redirecionado/);
  watched.forEach((path, index) => assert.deepEqual(readFileSync(path), before[index], path));
  const plan = planInstallation({ target: root, mode: 'update' });
  process.env.GIT_INDEX_FILE = alternate;
  try { assert.throws(() => applyPlan(plan), { code: 'E_GIT_ENV' }); }
  finally { delete process.env.GIT_INDEX_FILE; }
  watched.forEach((path, index) => assert.deepEqual(readFileSync(path), before[index], path));
});

test('filtragem de .local em qualquer caixa nunca remove ou desindexa arquivos humanos', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-private-local-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const paths = ['.claude/skills/.LoCaL/humano.md', '.pbai4devs/skills/.LoCaL/humano.md'];
  paths.forEach(path => put(root, path, '# Conteúdo próprio\n')); git(root, 'add', '-f', paths[0]);
  const index = readFileSync(join(root, '.git/index'));
  for (const args of [['init', '--agents', 'claude'], ['update', '--force'], ['sync']]) {
    const r = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    for (const path of paths) assert.equal(readFileSync(join(root, path), 'utf8'), '# Conteúdo próprio\n');
    assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  }
  const statePath = join(root, '.pbai4devs/state/agentdevkit.json'), state = JSON.parse(readFileSync(statePath));
  const wrapper = readFileSync(join(root, '.claude/skills/preparar-dev/SKILL.md'));
  writeFileSync(join(root, paths[0]), wrapper);
  state.files[paths[0]] = createHash('sha256').update(wrapper).digest('hex');
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
  const direct = run(root, process.execPath, [sync, '--root', root, '--force']);
  assert.equal(direct.status, 0, direct.stdout + direct.stderr);
  assert.deepEqual(readFileSync(join(root, paths[0])), wrapper);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  const r = run(root, process.execPath, [bin, 'update', '--force', '--target', root, '--json']);
  assert.equal(r.status, 1, r.stdout + r.stderr); assert.equal(JSON.parse(r.stdout).error.code, 'E_STATE');
  assert.deepEqual(readFileSync(join(root, paths[0])), wrapper);
  assert.equal(readFileSync(join(root, paths[1]), 'utf8'), '# Conteúdo próprio\n');
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('consultas de init, update e verificações não executam fsmonitor configurado pelo usuário', {
  skip: process.platform === 'win32' ? 'A fixture executa um hook com shebang /bin/sh e permissões POSIX.' : false,
  timeout: 120000,
}, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-fsmonitor-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); git(root, 'config', 'user.name', 'Teste'); git(root, 'config', 'user.email', 'teste@example.invalid');
  put(root, 'tracked.txt', 'base\n'); git(root, 'add', 'tracked.txt'); git(root, 'commit', '-qm', 'base');
  const sentinel = join(root, 'fsmonitor-invocado'), hook = join(root, 'fsmonitor.sh');
  writeFileSync(hook, `#!/bin/sh\nprintf chamado > '${sentinel}'\nexit 0\n`); chmodSync(hook, 0o755);
  git(root, 'config', '--local', 'core.fsmonitor', hook);
  git(root, 'status', '--short'); assert.ok(existsSync(sentinel), 'o hook de teste precisa ser executável'); rmSync(sentinel);
  const files = ['.git/config', '.git/index', '.git/info/exclude'], before = files.map(path => readFileSync(join(root, path)));
  for (const args of [['init', '--agents', 'claude'], ['update'], ['sync', '--check'], ['doctor']]) {
    const r = run(root, process.execPath, [bin, ...args, '--target', root, '--json']); assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(existsSync(sentinel), false, args.join(' '));
    files.forEach((path, i) => assert.deepEqual(readFileSync(join(root, path)), before[i], `${args[0]} alterou ${path}`));
  }
  const direct = run(root, process.execPath, [sync, '--root', root, '--check']); assert.equal(direct.status, 0, direct.stdout + direct.stderr);
  assert.equal(existsSync(sentinel), false);
});
