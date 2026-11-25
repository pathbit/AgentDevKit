import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import childProcess, { spawnSync } from 'node:child_process';
import { applyPlan, planInstallation } from '../src/install.mjs';
import { explainError } from '../src/i18n.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { collectErrorDiagnostics, explainUnsupportedHardlink, markDiagnosticsBoundary, primaryDiagnosticError, withPotentialPartial, withUncertainPath } from '../.pbai4devs/scripts/lib/error-reporting.mjs';

const repository = fileURLToPath(new URL('..', import.meta.url));
const put = (root, path, value) => { const file = join(root, path); fs.mkdirSync(dirname(file), { recursive: true }); fs.writeFileSync(file, value); };

test("immutable error keeps Git code, cause and path when receiving diagnosis", () => {
  const cause = Object.freeze(Object.assign(new Error('falha sintética'), { code: 'E_NESTED_GIT', nestedGitPath: 'modulo', exitCode: 2 }));
  const error = withUncertainPath(cause, 'backup');
  assert.equal(error.cause, cause); assert.equal(error.code, 'E_NESTED_GIT');
  assert.equal(error.nestedGitPath, 'modulo'); assert.equal(error.exitCode, 2);
  assert.deepEqual(collectErrorDiagnostics(error).preservedPaths, ['backup']);
});

test("immutable error keeps cause and communicates possibly partial application", () => {
  const cause = Object.freeze(Object.assign(new Error('falha sintética'), { code: 'EIO', exitCode: 2 }));
  const error = withPotentialPartial(cause);
  assert.equal(error.cause, cause); assert.equal(error.code, 'EIO'); assert.equal(error.exitCode, 2);
  assert.equal(collectErrorDiagnostics(error).possiblePartial, true);
});

for (const code of ['ENOTSUP', 'EOPNOTSUPP']) test(`erro imutável de hardlink conserva ${code} no reconhecimento`, () => {
  let reads = 0;
  const cause = new Error('sistema de arquivos sintético');
  Object.defineProperty(cause, 'code', { get() { return ++reads === 1 ? code : 'EIO'; } });
  Object.preventExtensions(cause);
  const error = explainUnsupportedHardlink(cause);
  assert.equal(reads, 1);
  assert.equal(error.code, code);
  assert.equal(error.cause, cause);
  assert.equal(error.hardlinkUnsupported, true);
});

for (const [name, wrap] of [
  ['caminho incerto', error => withUncertainPath(error, 'backup')],
  ['aplicação parcial', error => withPotentialPartial(error)],
]) test(`erro não extensível mantém causa quando mensagem muda: ${name}`, () => {
  let reads = 0;
  const cause = new Error();
  Object.defineProperty(cause, 'message', {
    get() { return ++reads === 1 ? 'falha sintética' : Symbol('mensagem alterada'); },
  });
  Object.preventExtensions(cause);
  const error = wrap(cause);
  assert.equal(reads, 1);
  assert.equal(error.message, 'falha sintética');
  assert.equal(error.cause, cause);
  if (name === 'caminho incerto') assert.deepEqual(collectErrorDiagnostics(error).preservedPaths, ['backup']);
  else assert.equal(collectErrorDiagnostics(error).possiblePartial, true);
});

test("primary cause crosses only own wrappers and aggregates without going into cycle", () => {
  const primary = Object.assign(new Error('falha primária sintética'), { code: 'EIO' });
  const aggregate = Object.freeze(new AggregateError([primary], 'falha agrupada'));
  const wrapper = withPotentialPartial(aggregate);
  assert.equal(primaryDiagnosticError(wrapper), primary);
  const arbitrary = new Error('fronteira externa', { cause: primary });
  assert.equal(primaryDiagnosticError(arbitrary), arbitrary);
  const boundary = markDiagnosticsBoundary(withPotentialPartial(Object.freeze(new Error('estágio', { cause: aggregate }))));
  assert.equal(primaryDiagnosticError(boundary), boundary);
  const cycle = new AggregateError([], 'ciclo'); cycle.errors.push(cycle);
  assert.equal(primaryDiagnosticError(cycle), cycle);
});

test("Partial error messages request revision without promising no changes or recommend repetition", () => {
  for (const language of ['pt', 'en', 'es']) for (const code of ['E_GIT', 'E_CHANGED', 'E_UPGRADE', 'E_CONFIG_PARSE', 'E_LEGACY_PATH']) {
    const message = explainError(language, code, {}, { possiblePartial: true });
    assert.match(message, /revisão|review|revisión/i);
    assert.doesNotMatch(message, /nenhum arquivo|no files|no se modificaron|execute novamente|try again|ejecute de nuevo|\bupdate\b/i);
  }
  assert.match(explainError('pt', 'E_GIT', {}), /nenhum arquivo foi alterado/i);
});

for (const kind of ['install', 'sync']) for (const withBackup of [false, true]) {
  test(`${kind}: erro Git imutável preserva diagnóstico após publicação (backup legado=${withBackup})`, { timeout: 120000 }, t => {
    const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-recovery-diagnostic-')));
    t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
    assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
    put(root, '.gitignore', '# regra humana\n'); put(root, 'humano.txt', 'sentinela preparada\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '--', '.gitignore', 'humano.txt']).status, 0);
    const index = fs.readFileSync(join(root, '.git/index')), ignore = fs.readFileSync(join(root, '.gitignore'));
    let operation, path, faultProbe, nextPublication;
    if (kind === 'install') {
      if (withBackup) put(root, 'AGENTS.md', '# Instruções humanas\n');
      const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
      path = withBackup ? 'AGENTS.md' : plan.changes.find(change => change.action === 'create').path;
      if (withBackup) {
        const update = plan.changes.findIndex(change => change.path === path && change.action === 'update');
        assert.ok(update >= 0);
        fs.mkdirSync(join(root, 'modulo-sintetico'));
        faultProbe = join(root, 'modulo-sintetico/.git');
        nextPublication = {
          path: 'publicado.md', action: 'create', beforeHash: null, content: Buffer.from('Segunda publicação.\n'),
        };
        plan.changes.splice(update + 1, 0, nextPublication, {
          path: 'modulo-sintetico/novo.md', action: 'create', beforeHash: null, content: Buffer.from('Criação seguinte.\n'),
        });
      }
      operation = () => applyPlan(plan);
    } else {
      put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
      for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(join(repository, '.pbai4devs/templates/gitignore', name)));
      put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n');
      const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
      if (withBackup) {
        synchronize(options);
        put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
      }
      path = '.claude/skills/demo/SKILL.md';
      operation = () => synchronize(options);
    }
    const cause = Object.freeze(Object.assign(new Error('falha Git sintética'), { code: 'E_NESTED_GIT', nestedGitPath: 'modulo-sintetico' }));
    const target = join(root, path);
    const before = fs.existsSync(target) ? fs.readFileSync(target) : null;
    assert.equal(before !== null, withBackup);
    const stat = fs.lstatSync;
    let publication, injected = false, failure;
    const recordPublication = () => {
      const bytes = fs.readFileSync(target);
      assert.ok(bytes.length > 0);
      if (before !== null) assert.notDeepEqual(bytes, before);
      const { dev, ino, mode } = stat(target, { bigint: true });
      publication = { bytes, dev, ino, mode };
    };
    if (!withBackup) {
      const open = fs.openSync, close = fs.closeSync;
      let destinationFd;
      t.mock.method(fs, 'openSync', (file, flags, ...args) => {
        const fd = open(file, flags, ...args);
        if (file === target && flags === 'wx') destinationFd = fd;
        return fd;
      });
      t.mock.method(fs, 'closeSync', fd => {
        close(fd);
        if (fd === destinationFd) {
          destinationFd = undefined;
          recordPublication();
        }
      });
    } else if (process.platform === 'win32') {
      const spawn = childProcess.spawnSync;
      t.mock.method(childProcess, 'spawnSync', (file, args, options) => {
        const result = spawn(file, args, options);
        if (options?.env?.AGENTDEVKIT_DESTINATION === target && result.status === 0) recordPublication();
        return result;
      });
    } else {
      const rename = fs.renameSync;
      t.mock.method(fs, 'renameSync', (from, to, ...args) => {
        const result = rename(from, to, ...args);
        if (to === target) recordPublication();
        return result;
      });
    }
    t.mock.method(fs, 'lstatSync', (path, ...args) => {
      if (publication && !injected && typeof path === 'string' && path.startsWith(root + sep)
        && path.endsWith(`${sep}.git`) && (faultProbe ? path === faultProbe : path !== join(root, '.git'))) {
        injected = true;
        throw cause;
      }
      return stat(path, ...args);
    });
    syncBuiltinESMExports();
    try { operation(); } catch (error) { failure = error; }
    finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
    assert.ok(publication && injected && failure, 'a fixture deve falhar após uma publicação');
    assert.equal(failure.code, 'E_NESTED_GIT'); assert.equal(failure.cause, cause);
    assert.equal(failure.nestedGitPath, 'modulo-sintetico');
    if (faultProbe) assert.equal(fs.existsSync(join(root, 'modulo-sintetico/novo.md')), false);
    const diagnostics = collectErrorDiagnostics(failure), paths = diagnostics.preservedPaths;
    assert.equal(diagnostics.possiblePartial, true);
    assert.ok(paths.includes(path));
    if (nextPublication) {
      assert.ok(paths.includes(nextPublication.path));
      assert.deepEqual(fs.readFileSync(join(root, nextPublication.path)), nextPublication.content);
      assert.ok(!paths.includes('modulo-sintetico/novo.md'));
    }
    assert.equal(failure.recovery.status, 'pending');
    assert.equal(failure.recovery.phase, 'begin');
    assert.ok(paths.includes(failure.recovery.backup));
    const manifest = JSON.parse(fs.readFileSync(join(failure.recovery.backup, 'manifest.json')));
    const entry = manifest.entries.find(item => item.path === path);
    assert.equal(entry?.action, withBackup ? 'update' : 'create');
    if (withBackup) assert.deepEqual(fs.readFileSync(join(failure.recovery.backup, 'blobs', entry.blob)), before);
    else assert.equal(entry.type, 'absent');
    if (withBackup) assert.ok(paths.some(path => path.replaceAll('\\', '/').includes(kind === 'install' ? 'agentdevkit/backups/' : 'sync-backup.')));
    else assert.ok(paths.every(path => !path.replaceAll('\\', '/').includes('agentdevkit/backups/') && !path.includes('sync-backup.')));
    const { dev, ino, mode } = fs.lstatSync(target, { bigint: true });
    assert.deepEqual({ bytes: fs.readFileSync(target), dev, ino, mode }, publication);
    assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
    assert.deepEqual(fs.readFileSync(join(root, '.gitignore')), ignore);
    assert.equal(fs.readFileSync(join(root, 'humano.txt'), 'utf8'), 'sentinela preparada\n');
  });
}
