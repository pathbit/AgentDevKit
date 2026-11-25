import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { collectErrorDiagnostics } from '../.pbai4devs/scripts/lib/error-reporting.mjs';

function put(root, path, content) {
  const target = join(root, path);
  fs.mkdirSync(dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

for (const oldAtime of [false, true]) test(`sync --force guarda cópia anterior sem alterar Git nem arquivo humano (acesso antigo=${oldAtime})`, {
  timeout: 120000,
}, t => {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-sync-backup-success-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
  put(root, '.gitignore', '# humano\n'); put(root, 'humano.txt', 'staged\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'humano.txt']).status, 0);
  fs.appendFileSync(join(root, 'humano.txt'), 'unstaged\n');
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const file of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(root, `.pbai4devs/templates/gitignore/${file}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${file}`, import.meta.url)));
  }
  const source = '.pbai4devs/skills/demo/SKILL.md', catalog = '.pbai4devs/catalog.json';
  put(root, source, '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  synchronize(options);
  const before = fs.readFileSync(join(root, catalog));
  if (oldAtime) fs.utimesSync(join(root, catalog), 1000000000, 1000000001);
  const sourceTimes = fs.statSync(join(root, catalog));
  const protectedPaths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'humano.txt'];
  const protectedBefore = new Map(protectedPaths.map(path => [path, fs.readFileSync(join(root, path))]));
  put(root, source, '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  const result = synchronize(options);
  assert.ok(result.backupRoot, 'sync deve informar o diretório de backup');
  assert.ok(relative(root, result.backupRoot).startsWith(`.agent-tests${sep}`));
  const backup = join(result.backupRoot, catalog), backupTimes = fs.statSync(backup);
  assert.ok(Math.abs(backupTimes.atimeMs - sourceTimes.atimeMs) < 1, 'cópia deve preservar horário de acesso observado');
  assert.ok(Math.abs(backupTimes.mtimeMs - sourceTimes.mtimeMs) < 1, 'cópia deve preservar horário de modificação observado');
  assert.deepEqual(fs.readFileSync(backup), before);
  assert.notDeepEqual(fs.readFileSync(join(root, catalog)), before);
  for (const [path, bytes] of protectedBefore) assert.deepEqual(fs.readFileSync(join(root, path)), bytes, path);
});

test("sync interrupts when rereading changes backup time", { timeout: 120000 }, t => {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-sync-backup-atime-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
  assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const file of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(root, `.pbai4devs/templates/gitignore/${file}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${file}`, import.meta.url)));
  }
  const source = '.pbai4devs/skills/demo/SKILL.md', catalog = join(root, '.pbai4devs/catalog.json');
  put(root, source, '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  synchronize(options); const before = fs.readFileSync(catalog);
  put(root, source, '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  const open = fs.openSync, read = fs.readSync, times = fs.futimesSync, fstat = fs.fstatSync;
  let backupFd, verificationFd, backup, restored = false, readAfterRestore = false, injected = false;
  t.mock.method(fs, 'openSync', (path, flags, ...args) => {
    const fd = open(path, flags, ...args);
    if (typeof path === 'string' && flags === 'wx+' && !backupFd) { backupFd = fd; backup = resolve(path); }
    else if (typeof flags === 'number' && (flags & fs.constants.O_NOATIME) && backupFd) {
      const opened = fstat(fd, { bigint: true }), saved = fstat(backupFd, { bigint: true });
      if (opened.dev === saved.dev && opened.ino === saved.ino) verificationFd = fd;
    }
    return fd;
  });
  t.mock.method(fs, 'futimesSync', (fd, ...args) => { const result = times(fd, ...args); if (fd === backupFd) restored = true; return result; });
  t.mock.method(fs, 'readSync', (fd, ...args) => {
    const result = read(fd, ...args);
    if (restored && fd === (verificationFd ?? backupFd)) readAfterRestore = true;
    return result;
  });
  t.mock.method(fs, 'fstatSync', (fd, ...args) => {
    const info = fstat(fd, ...args);
    if (!injected && readAfterRestore && fd === backupFd && typeof info.atimeNs === 'bigint') {
      injected = true; info.atimeNs += 1n;
    }
    return info;
  });
  syncBuiltinESMExports();
  let failure;
  try { synchronize(options); } catch (error) { failure = error; }
  assert.ok(injected && backup && failure, 'mudança de horário deve interromper a operação');
  assert.match(failure.message, /Backup mudou/);
  assert.ok(fs.existsSync(backup));
  assert.deepEqual(fs.readFileSync(catalog), before);
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.some(path => path.includes('sync-backup.')));
});

for (const denial of ['EACCES', 'EPERM']) test(`sync preserva backup se Linux negar leitura sem alterar horário (${denial})`, { timeout: 120000, skip: process.platform !== 'linux' ? 'requer O_NOATIME Linux' : false }, t => {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-sync-backup-noatime-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
  assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const file of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(root, `.pbai4devs/templates/gitignore/${file}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${file}`, import.meta.url)));
  }
  const source = '.pbai4devs/skills/demo/SKILL.md', catalog = join(root, '.pbai4devs/catalog.json');
  put(root, source, '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  synchronize(options); const before = fs.readFileSync(catalog);
  put(root, source, '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  const open = fs.openSync, fstat = fs.fstatSync, close = fs.closeSync; let backupFd, backup, injected = false;
  t.mock.method(fs, 'openSync', (path, flags, ...args) => {
    if (typeof path === 'string' && flags === 'wx+' && !backupFd) {
      const fd = open(path, flags, ...args); backupFd = fd; backup = resolve(path); return fd;
    }
    if (typeof flags === 'number' && (flags & fs.constants.O_NOATIME) && backupFd) {
      const fd = open(path, flags, ...args), opened = fstat(fd, { bigint: true }), saved = fstat(backupFd, { bigint: true });
      if (opened.dev === saved.dev && opened.ino === saved.ino) {
        close(fd); injected = true; throw Object.assign(new Error('leitura sintética negada'), { code: denial });
      }
      return fd;
    }
    return open(path, flags, ...args);
  });
  syncBuiltinESMExports();
  let failure;
  try { synchronize(options); } catch (error) { failure = error; }
  assert.ok(injected && backup && failure, 'recusa da verificação deve interromper a operação');
  assert.equal(failure.code, denial);
  assert.ok(fs.existsSync(backup));
  assert.deepEqual(fs.readFileSync(catalog), before);
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.some(path => path.includes('sync-backup.')));
});

for (const { name, owner, mode } of [
  { name: 'sync Linux recusa arquivo de outro proprietário legível pelo grupo', owner: 0, mode: 0o040 },
  { name: 'sync Linux preserva o modo de leitura do próprio arquivo no backup', owner: 65534, mode: 0o440 },
]) test(name, {
  timeout: 120000,
  skip: process.platform !== 'linux' || process.getuid?.() !== 0 ? 'fixture requer Linux com troca de usuário' : false,
}, t => {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-sync-group-readable-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
  put(root, '.gitignore', '# humano\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
  const index = fs.readFileSync(join(root, '.git/index'));
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const file of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(root, `.pbai4devs/templates/gitignore/${file}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${file}`, import.meta.url)));
  }
  const source = '.pbai4devs/skills/demo/SKILL.md', catalog = join(root, '.pbai4devs/catalog.json');
  put(root, source, '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n');
  const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
  synchronize(options); const before = fs.readFileSync(catalog);
  put(root, source, '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
  const uid = 65534, gid = 65534;
  function chownTree(path) {
    const info = fs.lstatSync(path); if (info.isSymbolicLink()) throw new Error('fixture inesperada');
    if (info.isDirectory()) for (const name of fs.readdirSync(path)) chownTree(join(path, name));
    fs.chownSync(path, uid, gid);
  }
  chownTree(root);
  fs.chownSync(catalog, owner, gid);
  fs.chmodSync(catalog, mode);
  const safeRefusal = owner !== uid;
  const evidenceRoot = join(root, '.agent-tests');
  const evidenceSnapshot = () => fs.existsSync(evidenceRoot)
    ? fs.readdirSync(evidenceRoot, { recursive: true }).sort().map(path => {
      const fullPath = join(evidenceRoot, path);
      return [path, fs.lstatSync(fullPath).isFile() ? fs.readFileSync(fullPath) : null];
    })
    : [];
  const evidenceBefore = evidenceSnapshot();
  const moduleUrl = new URL('../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs', import.meta.url).href;
  const script = `import { synchronize } from ${JSON.stringify(moduleUrl)}; const root = process.argv[1]; const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} }; if (${safeRefusal}) { const check = synchronize({ ...options, check: true }); let failure; try { synchronize(options); } catch (error) { failure = { code: error.code, path: error.path }; } process.stdout.write(JSON.stringify({ check, failure })); } else { const result = synchronize(options); process.stdout.write(JSON.stringify({ backupRoot: result.backupRoot })); }`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script, root], { uid, gid, encoding: 'utf8', timeout: 120000 });
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  if (safeRefusal) {
    assert.ok(result.check.ownerBlockers.some(item => item.path === '.pbai4devs/catalog.json' && item.code === 'file-owner-different'));
    assert.equal(result.failure?.code, 'E_PROTECTED_METADATA');
    assert.equal(result.failure?.path, '.pbai4devs/catalog.json');
    assert.deepEqual(fs.readFileSync(catalog), before);
    assert.equal(fs.statSync(catalog).uid, owner);
    assert.equal(fs.statSync(catalog).mode & 0o777, mode);
    assert.deepEqual(evidenceSnapshot(), evidenceBefore);
  } else {
    const backup = join(result.backupRoot, '.pbai4devs/catalog.json');
    assert.deepEqual(fs.readFileSync(backup), before);
    assert.equal(fs.statSync(backup).uid, uid);
    assert.equal(fs.statSync(backup).mode & 0o777, mode);
    assert.notDeepEqual(fs.readFileSync(catalog), before);
  }
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
});

for (const [name, thrown] of [['undefined', undefined], ['null', null], ['false', false], ['zero', 0], ['empty', ''], ['nan', NaN], ['bigint', 0n]]) {
  for (const closeFails of [false, true]) for (const partial of [false, true]) {
    test(`sync interrompe backup após falha ${name}, close falha=${closeFails}, escrita parcial=${partial}`, { timeout: 120000 }, t => {
      const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-sync-backup-failure-')));
      t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
      assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
      put(root, '.gitignore', '# humano\n'); put(root, 'humano.txt', 'staged\n');
      assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'humano.txt']).status, 0);
      fs.appendFileSync(join(root, 'humano.txt'), 'unstaged\n');
      put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
      for (const file of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
        put(root, `.pbai4devs/templates/gitignore/${file}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${file}`, import.meta.url)));
      }
      const source = '.pbai4devs/skills/demo/SKILL.md';
      put(root, source, '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n');
      const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
      synchronize(options);
      put(root, source, '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
      const pointer = join(root, '.claude/skills/demo/SKILL.md');
      const before = fs.readFileSync(pointer), index = fs.readFileSync(join(root, '.git/index'));
      const human = fs.readFileSync(join(root, 'humano.txt')), ignore = fs.readFileSync(join(root, '.gitignore'));
      const open = fs.openSync, write = fs.writeSync, close = fs.closeSync;
      let fd, backup, backupSource, injected = false, closed = false, closeInjected = false, wrotePartial = false;
      t.mock.method(fs, 'openSync', (path, ...args) => {
        const result = open(path, ...args);
        if (typeof path === 'string' && args[0] === 'wx+' && !fd) {
          fd = result; backup = resolve(path);
          backupSource = fs.readFileSync(join(root, ...path.split(sep)));
        }
        return result;
      });
      t.mock.method(fs, 'writeSync', (file, ...args) => {
        if (file === fd && !injected) {
          if (partial && !wrotePartial) {
            wrotePartial = true;
            return write(file, args[0], args[1], Math.max(1, Math.floor(args[2] / 2)), args[3]);
          }
          injected = true; throw thrown;
        }
        return write(file, ...args);
      });
      t.mock.method(fs, 'closeSync', file => {
        const result = close(file);
        if (file === fd && !closed) { closed = true; if (closeFails) { closeInjected = true; throw Object.assign(new Error('falha sintética ao fechar'), { code: 'EIO' }); } }
        return result;
      });
      syncBuiltinESMExports();
      let failure, failed = false;
      try { synchronize(options); } catch (error) { failed = true; failure = error; }
      t.mock.restoreAll(); syncBuiltinESMExports();
      assert.ok(injected && closed && backup, 'fixture deve alcançar e fechar o backup');
      assert.equal(closeInjected, closeFails);
      assert.equal(wrotePartial, partial);
      assert.equal(fs.statSync(backup).size > 0, partial, 'backup parcial deve permanecer disponível para revisão');
      if (partial) {
        const saved = fs.readFileSync(backup);
        assert.ok(saved.length < backupSource.length);
        assert.deepEqual(saved, backupSource.subarray(0, saved.length));
      }
      assert.deepEqual(fs.readFileSync(join(root, ...relative(join(root, '.agent-tests'), backup).split(sep).slice(1))), backupSource);
      assert.equal(failed, true, 'uma falha no backup deve interromper o sync');
      assert.deepEqual(fs.readFileSync(pointer), before, 'apontamento não deve ser atualizado');
      assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
      assert.deepEqual(fs.readFileSync(join(root, 'humano.txt')), human);
      assert.deepEqual(fs.readFileSync(join(root, '.gitignore')), ignore);
      const diagnostics = collectErrorDiagnostics(failure);
      assert.ok(diagnostics.preservedPaths.some(path => path.includes('sync-backup.')));
      if (closeFails) {
        assert.ok(failure instanceof AggregateError);
        assert.equal(failure.errors.length, 2);
        assert.ok(Object.is(failure.errors[0], thrown));
        assert.equal(failure.errors[1].code, 'EIO');
        assert.ok(diagnostics.cleanupFailures.some(item => item.path === backup));
      }
      let current = failure, found = false;
      for (let depth = 0; depth < 8 && current && typeof current === 'object'; depth++) {
        if (!Object.hasOwn(current, 'cause')) break;
        current = current.cause;
        if (Object.is(current, thrown)) { found = true; break; }
      }
      assert.equal(found, true, 'causa original deve ser preservada');
    });
  }
}
