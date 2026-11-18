import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareRecoveryBackup, verifyRecoveryBackup } from '../.pbai4devs/scripts/lib/recovery-backup.mjs';
import { inspectRecoveryJournal, reserveRecovery, beginRecovery } from '../.pbai4devs/scripts/lib/recovery-store.mjs';
import { assertPrivateRecoveryPaths, createPrivateRecoveryDirectory } from '../.pbai4devs/scripts/lib/recovery-privacy.mjs';

const test = process.platform === 'win32' ? nodeTest.skip : nodeTest;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const code = expected => error => error?.code === expected;
function fixture(t) {
  const root = fs.mkdtempSync(join(fs.realpathSync(tmpdir()), 'adk-recovery-backup-'));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
  return root;
}
function snapshots() {
  return [
    { path: 'novos/criado', action: 'create', type: 'absent', mode: null },
    { path: 'privado/binario', action: 'remove', type: 'file', mode: 0o640, data: Buffer.from([0, 255, 254, 128, 10]) },
    { path: 'privado', action: 'retain', type: 'directory', mode: 0o700 },
    { path: 'privado/vazio', action: 'update', type: 'file', mode: 0o400, data: Buffer.alloc(0) },
  ];
}

test('backup preserva bytes, ausências, diretórios e modos no manifesto', t => {
  const parent = fixture(t), root = join(parent, 'backup'), publicFile = join(parent, 'arquivo-humano');
  fs.mkdirSync(root, { mode: 0o700 }); fs.writeFileSync(publicFile, 'conteúdo humano');
  const oldMask = process.umask(0o000); let result;
  try { result = prepareRecoveryBackup(root, snapshots()); } finally { process.umask(oldMask); }
  assert.deepEqual(result, verifyRecoveryBackup(root, result.manifest));
  assert.equal(result.entries, 4); assert.equal(result.files, 2);
  const manifestBytes = fs.readFileSync(join(root, 'manifest.json')), manifest = JSON.parse(manifestBytes);
  assert.equal(result.manifest, sha(manifestBytes));
  assert.deepEqual(manifest.entries.map(entry => [entry.path, entry.action, entry.type, entry.mode]), [
    ['novos/criado', 'create', 'absent', null], ['privado', 'retain', 'directory', 0o700],
    ['privado/binario', 'remove', 'file', 0o640], ['privado/vazio', 'update', 'file', 0o400],
  ]);
  const binary = manifest.entries.find(entry => entry.path.endsWith('binario'));
  const empty = manifest.entries.find(entry => entry.path.endsWith('vazio'));
  assert.deepEqual(fs.readFileSync(join(root, 'blobs', binary.blob)), Buffer.from([0, 255, 254, 128, 10]));
  assert.deepEqual(fs.readFileSync(join(root, 'blobs', empty.blob)), Buffer.alloc(0));
  for (const path of [join(root, 'manifest.json'), join(root, 'blobs', binary.blob), join(root, 'blobs', empty.blob)]) assert.equal(fs.statSync(path).mode & 0o777, 0o600);
  assert.equal(fs.statSync(join(root, 'blobs')).mode & 0o777, 0o700);
  assert.equal(fs.readFileSync(publicFile, 'utf8'), 'conteúdo humano');
});

test('entradas inválidas, getters e aliases falham antes de escrever', t => {
  const root = fixture(t); let invoked = false;
  const getter = { action: 'update', type: 'file', mode: 0o600, data: Buffer.from('x'), get path() { invoked = true; throw Error('segredo'); } };
  const valid = { path: 'arquivo', action: 'update', type: 'file', mode: 0o600, data: Buffer.from('x') };
  const bad = [
    null, {}, [getter], [{ ...valid, path: '../fora' }], [{ ...valid, path: '.git/config' }],
    [{ ...valid, path: '.AGENT-TESTS/segredo' }], [{ ...valid, path: '/absoluto' }],
    [{ ...valid, path: '.agent-teſts/segredo' }],
    [{ ...valid, path: 'pasta\\arquivo' }], [{ ...valid, path: 'pasta/CON.txt' }],
    [{ ...valid, path: 'pasta/nome.' }], [{ ...valid, path: 'pasta/nome ' }],
    [{ ...valid, path: 'pasta/inválido?' }], [{ ...valid, path: 'pasta/COM¹.txt' }],
    [{ ...valid, path: 'pasta/CONOUT$' }], [{ ...valid, path: 'pasta/a\u202eb' }],
    [{ ...valid, path: 'CONıN$/segredo' }],
    ...['NUL .txt', 'CON  .log', 'COM1 .txt'].map(path => [{ ...valid, path }]),
    [{ ...valid, path: 'a'.repeat(256) }],
    [{ ...valid, path: 'arquivo\ud800' }], [{ ...valid, mode: 0o1000 }], [{ ...valid, mode: 0o1777 }],
    [{ ...valid, action: 'create' }], [{ ...valid, extra: 'segredo' }],
    [valid, { ...valid }], [valid, { ...valid, path: 'ARQUIVO/outro' }], [valid, { ...valid, path: 'arquivo/outro' }],
    [{ ...valid, path: 'Pasta/a' }, { ...valid, path: 'pasta/b' }],
    [{ ...valid, path: 'Straße.md' }, { ...valid, path: 'STRASSE.md' }],
    [{ ...valid, path: 'Σ/a' }, { ...valid, path: 'ς/b' }],
    [{ ...valid, path: 'ſ/a' }, { ...valid, path: 's/b' }],
    [{ ...valid, path: 'i.md' }, { ...valid, path: 'ı.md' }],
    [{ path: 'ausente', action: 'create', type: 'absent', mode: null }, { ...valid, path: 'ausente/filho' }],
    [{ ...valid, data: Buffer.alloc(32 * 1024 * 1024 + 1) }],
    new Array(4097).fill(valid),
  ];
  if (typeof SharedArrayBuffer !== 'undefined') bad.push([{ ...valid, data: new Uint8Array(new SharedArrayBuffer(1)) }]);
  for (const entries of bad) {
    assert.throws(() => prepareRecoveryBackup(root, entries), error => error.code === 'E_RECOVERY_BACKUP_INPUT' && !error.message.includes('segredo'));
    assert.deepEqual(fs.readdirSync(root), []);
  }
  assert.equal(invoked, false);
});

for (const alteration of ['extra', 'modo', 'blob anterior', 'manifesto anterior']) test(`verificação detecta ${alteration} durante leitura de blob`, t => {
  const root = fixture(t), result = prepareRecoveryBackup(root, snapshots());
  const blob = join(root, 'blobs', '00000002.bin'), blobDir = join(root, 'blobs');
  const open = fs.openSync, read = fs.readSync; let selected, changed = false;
  t.mock.method(fs, 'openSync', (path, ...args) => {
    const fd = open(path, ...args);
    if (path === blob) selected = fd;
    return fd;
  });
  t.mock.method(fs, 'readSync', (fd, ...args) => {
    if (fd === selected && !changed) {
      changed = true;
      if (alteration === 'extra') fs.writeFileSync(join(blobDir, 'extra'), 'sintético');
      else if (alteration === 'modo') fs.chmodSync(blobDir, 0o755);
      else {
        const previous = alteration === 'blob anterior' ? join(blobDir, '00000001.bin') : join(root, 'manifest.json');
        const bytes = fs.readFileSync(previous); bytes[0] ^= 1; fs.writeFileSync(previous, bytes);
      }
    }
    return read(fd, ...args);
  });
  syncBuiltinESMExports();
  assert.throws(() => verifyRecoveryBackup(root, result.manifest), code('E_RECOVERY_BACKUP_INVALID'));
  assert.equal(changed, true);
});

test('limite de entradas aceita o máximo e limite total impede escrita', t => {
  const root = fixture(t);
  const atLimit = Array.from({ length: 4096 }, (_, i) => ({ path: `criados/item-${String(i).padStart(4, '0')}`, action: 'create', type: 'absent', mode: null }));
  const result = prepareRecoveryBackup(root, atLimit);
  assert.equal(result.entries, 4096); assert.deepEqual(verifyRecoveryBackup(root, result.manifest), result);
  const other = fixture(t), buffer = Buffer.alloc(32 * 1024 * 1024);
  const overTotal = Array.from({ length: 5 }, (_, i) => ({ path: `grande-${i}`, action: 'update', type: 'file', mode: 0o600, data: buffer }));
  assert.throws(() => prepareRecoveryBackup(other, overTotal), code('E_RECOVERY_BACKUP_INPUT'));
  assert.deepEqual(fs.readdirSync(other), []);
});

test('arquivo no limite de 32 MiB é copiado e verificado', { timeout: 60000 }, t => {
  const root = fixture(t), bytes = Buffer.alloc(32 * 1024 * 1024, 0x5a);
  const result = prepareRecoveryBackup(root, [{ path: 'limite.bin', action: 'update', type: 'file', mode: 0o600, data: bytes }]);
  assert.equal(verifyRecoveryBackup(root, result.manifest).files, 1);
  assert.equal(fs.statSync(join(root, 'blobs', '00000001.bin')).size, bytes.length);
});

test('manifesto acima de 4 MiB é recusado antes de criar arquivos', t => {
  const root = fixture(t), prefix = Array(6).fill('界'.repeat(70)).join('/');
  const entries = Array.from({ length: 4096 }, (_, i) => ({ path: `${prefix}/item-${String(i).padStart(4, '0')}`, action: 'create', type: 'absent', mode: null }));
  const control = fixture(t), valid = prepareRecoveryBackup(control, [entries[0]]);
  assert.equal(verifyRecoveryBackup(control, valid.manifest).entries, 1);
  assert.throws(() => prepareRecoveryBackup(root, entries), code('E_RECOVERY_BACKUP_INPUT'));
  assert.deepEqual(fs.readdirSync(root), []);
});

test('pasta de backup ampla é recusada sem mudar arquivos existentes', t => {
  const root = fixture(t), sentinel = join(root, 'humano'); fs.writeFileSync(sentinel, 'preservar');
  fs.chmodSync(root, 0o755);
  assert.throws(() => prepareRecoveryBackup(root, snapshots()), code('E_RECOVERY_BACKUP_STORE'));
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'preservar');
  assert.equal(fs.statSync(root).mode & 0o777, 0o755);
});

test('umask que remove acesso do dono deixa resíduo e interrompe preparo', t => {
  const root = fixture(t), blobs = join(root, 'blobs'), previous = process.umask(0o100);
  try { assert.throws(() => prepareRecoveryBackup(root, snapshots()), code('E_RECOVERY_BACKUP_STORE')); }
  finally { process.umask(previous); }
  assert.equal(fs.statSync(blobs).mode & 0o777, 0o600);
  fs.chmodSync(blobs, 0o700); // Only the fixture directory is adjusted for cleanup.
  assert.deepEqual(fs.readdirSync(blobs), []);
  assert.equal(fs.existsSync(join(root, 'manifest.json')), false);
});

test('pasta e cópia com proprietário diferente são recusadas', { skip: typeof process.geteuid !== 'function' }, t => {
  const root = fixture(t), lstat = fs.lstatSync;
  const forged = info => new Proxy(info, { get(target, key, receiver) {
    if (key === 'uid') return typeof target.uid === 'bigint' ? target.uid + 1n : target.uid + 1;
    return Reflect.get(target, key, receiver);
  } });
  t.mock.method(fs, 'lstatSync', (path, ...args) => path === root ? forged(lstat(path, ...args)) : lstat(path, ...args));
  syncBuiltinESMExports();
  try { assert.throws(() => prepareRecoveryBackup(root, snapshots()), code('E_RECOVERY_BACKUP_STORE')); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.deepEqual(fs.readdirSync(root), []);
  const result = prepareRecoveryBackup(root, snapshots()), blob = join(root, 'blobs', '00000001.bin');
  t.mock.method(fs, 'lstatSync', (path, ...args) => path === blob ? forged(lstat(path, ...args)) : lstat(path, ...args));
  syncBuiltinESMExports();
  try { assert.throws(() => verifyRecoveryBackup(root, result.manifest), code('E_RECOVERY_BACKUP_INVALID')); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
});

for (const alteration of ['conteúdo', 'truncamento', 'remoção', 'extra', 'link', 'modo', 'modo restrito', 'modo executável', 'bit especial', 'manifesto']) test(`verificação detecta ${alteration}`, t => {
  const root = fixture(t), result = prepareRecoveryBackup(root, snapshots());
  const blob = join(root, 'blobs', '00000001.bin'), manifest = join(root, 'manifest.json');
  if (alteration === 'conteúdo') fs.writeFileSync(blob, 'outro');
  if (alteration === 'truncamento') fs.truncateSync(blob, 1);
  if (alteration === 'remoção') fs.unlinkSync(blob);
  if (alteration === 'extra') fs.writeFileSync(join(root, 'blobs', 'extra'), 'outro');
  if (alteration === 'modo') fs.chmodSync(blob, 0o644);
  if (alteration === 'modo restrito') fs.chmodSync(blob, 0o400);
  if (alteration === 'modo executável') fs.chmodSync(blob, 0o700);
  if (alteration === 'bit especial') fs.chmodSync(blob, 0o4600);
  if (alteration === 'link') {
    const external = fixture(t), sentinel = join(external, 'sentinela'); fs.writeFileSync(sentinel, 'externo');
    fs.unlinkSync(blob); fs.symlinkSync(sentinel, blob);
  }
  if (alteration === 'manifesto') fs.writeFileSync(manifest, '{"invalido":true}\n');
  assert.throws(() => verifyRecoveryBackup(root, result.manifest), code('E_RECOVERY_BACKUP_INVALID'));
});

test('manifesto não canônico é recusado mesmo com hash correspondente', t => {
  const root = fixture(t); prepareRecoveryBackup(root, snapshots());
  const path = join(root, 'manifest.json'), original = fs.readFileSync(path, 'utf8');
  const altered = Buffer.from(original.replace('{"version":1', '{"version":1,"version":1'));
  fs.writeFileSync(path, altered);
  assert.throws(() => verifyRecoveryBackup(root, sha(altered)), code('E_RECOVERY_BACKUP_INVALID'));
});

test('verificação recusa aliases Unicode mesmo com manifesto e hash correspondentes', t => {
  for (const paths of [['Straße.md', 'STRASSE.md'], ['Σ/a', 'ς/b'], ['ſ/a', 's/b'], ['.agent-teſts/segredo', 'outro'], ['CONıN$/segredo', 'outro'], ['NUL .txt', 'outro'], ['CON  .log', 'outro'], ['COM1 .txt', 'outro']]) {
    const root = fixture(t);
    prepareRecoveryBackup(root, [
      { path: 'primeiro', action: 'create', type: 'absent', mode: null },
      { path: 'segundo', action: 'create', type: 'absent', mode: null },
    ]);
    const file = join(root, 'manifest.json'), value = JSON.parse(fs.readFileSync(file));
    value.entries[0].path = paths[0]; value.entries[1].path = paths[1];
    value.entries.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    const bytes = Buffer.from(`${JSON.stringify(value)}\n`); fs.writeFileSync(file, bytes);
    assert.throws(() => verifyRecoveryBackup(root, sha(bytes)), code('E_RECOVERY_BACKUP_INVALID'));
  }
});

for (const alteration of ['blob externo', 'ordem', 'campo extra', 'hash inválido', 'tipo incoerente', 'UTF-8 inválido']) test(`manifesto com ${alteration} é rejeitado mesmo com hash igual`, t => {
  const root = fixture(t); prepareRecoveryBackup(root, snapshots());
  const path = join(root, 'manifest.json'), value = JSON.parse(fs.readFileSync(path));
  if (alteration === 'blob externo') value.entries.find(entry => entry.type === 'file').blob = '../externo';
  if (alteration === 'ordem') value.entries.reverse();
  if (alteration === 'campo extra') value.segredo = 'sintético';
  if (alteration === 'hash inválido') value.entries.find(entry => entry.type === 'file').sha256 = 'A'.repeat(64);
  if (alteration === 'tipo incoerente') value.entries.find(entry => entry.type === 'absent').action = 'remove';
  const bytes = alteration === 'UTF-8 inválido' ? Buffer.from([0xff, 0xfe]) : Buffer.from(`${JSON.stringify(value)}\n`);
  fs.writeFileSync(path, bytes);
  assert.throws(() => verifyRecoveryBackup(root, sha(bytes)), error => error.code === 'E_RECOVERY_BACKUP_INVALID' && !JSON.stringify(error).includes('sintético'));
});

test('hardlink em cópia é recusado sem alterar o segundo nome', t => {
  const root = fixture(t), external = fixture(t), result = prepareRecoveryBackup(root, snapshots());
  const source = join(root, 'blobs', '00000001.bin'), other = join(external, 'outro');
  fs.linkSync(source, other);
  const before = fs.readFileSync(other);
  assert.throws(() => verifyRecoveryBackup(root, result.manifest), code('E_RECOVERY_BACKUP_INVALID'));
  assert.deepEqual(fs.readFileSync(other), before);
});

test('troca por link durante abertura não lê nem altera arquivo externo', t => {
  const root = fixture(t), external = fixture(t), result = prepareRecoveryBackup(root, snapshots());
  const blob = join(root, 'blobs', '00000001.bin'), sentinel = join(external, 'privado');
  fs.writeFileSync(sentinel, 'conteúdo externo sintético');
  const open = fs.openSync, read = fs.readSync; let replaced = false, openedExternal, externalRead = false;
  t.mock.method(fs, 'openSync', (path, ...args) => {
    if (path === blob && !replaced) {
      replaced = true; fs.unlinkSync(blob); fs.symlinkSync(sentinel, blob);
      openedExternal = open(path, ...args); return openedExternal;
    }
    return open(path, ...args);
  });
  t.mock.method(fs, 'readSync', (fd, ...args) => { if (fd === openedExternal) externalRead = true; return read(fd, ...args); });
  syncBuiltinESMExports();
  try { assert.throws(() => verifyRecoveryBackup(root, result.manifest), code('E_RECOVERY_BACKUP_INVALID')); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(replaced, true); assert.equal(externalRead, false);
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'conteúdo externo sintético');
});

test('falha de sincronização preserva resíduo e não aceita reutilizar a pasta', t => {
  const root = fixture(t), sync = fs.fsyncSync; let count = 0;
  t.mock.method(fs, 'fsyncSync', fd => {
    if (++count === 2) throw Object.assign(new Error('segredo sintético'), { code: 'EIO' });
    return sync(fd);
  });
  syncBuiltinESMExports();
  try { assert.throws(() => prepareRecoveryBackup(root, snapshots()), error => error.code === 'E_RECOVERY_BACKUP_IO' && !error.message.includes('segredo')); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(fs.existsSync(join(root, 'manifest.json')), false);
  assert.equal(fs.existsSync(join(root, 'blobs')), true);
  assert.throws(() => prepareRecoveryBackup(root, snapshots()), code('E_RECOVERY_BACKUP_STORE'));
});

test('falha após manifesto pode deixar cópias verificáveis sem retornar sucesso', t => {
  const root = fixture(t), sync = fs.fsyncSync, identity = fs.statSync(root, { bigint: true }); let rootSyncs = 0;
  t.mock.method(fs, 'fsyncSync', fd => {
    const item = fs.fstatSync(fd, { bigint: true });
    if (item.isDirectory() && item.dev === identity.dev && item.ino === identity.ino && ++rootSyncs === 2) {
      throw Object.assign(new Error('falha sintética'), { code: 'EIO' });
    }
    return sync(fd);
  });
  syncBuiltinESMExports();
  try { assert.throws(() => prepareRecoveryBackup(root, snapshots()), code('E_RECOVERY_BACKUP_IO')); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  const manifest = fs.readFileSync(join(root, 'manifest.json'));
  assert.equal(verifyRecoveryBackup(root, sha(manifest)).entries, 4);
});

for (const point of ['mkdir-blobs', 'open-blob', 'write-blob', 'sync-blob', 'sync-blobs', 'open-manifest', 'write-manifest', 'sync-manifest', 'sync-root-final']) {
  test(`falha em ${point} não retorna sucesso nem altera sentinela`, t => {
    const parent = fixture(t), root = join(parent, 'backup'), sentinel = join(parent, 'humano');
    fs.mkdirSync(root, { mode: 0o700 }); fs.writeFileSync(sentinel, 'dados humanos');
    const blobs = join(root, 'blobs'), first = join(blobs, '00000001.bin'), manifest = join(root, 'manifest.json');
    const mkdir = fs.mkdirSync, open = fs.openSync, write = fs.writeFileSync, sync = fs.fsyncSync;
    const paths = new Map(); let rootSyncs = 0, injected = false;
    const failure = () => { injected = true; throw Object.assign(new Error('falha privada sintética'), { code: 'EIO' }); };
    t.mock.method(fs, 'mkdirSync', (path, ...args) => { if (point === 'mkdir-blobs' && path === blobs) failure(); return mkdir(path, ...args); });
    t.mock.method(fs, 'openSync', (path, ...args) => {
      if (point === 'open-blob' && path === first || point === 'open-manifest' && path === manifest) failure();
      const fd = open(path, ...args); paths.set(fd, path); return fd;
    });
    t.mock.method(fs, 'writeFileSync', (fd, bytes, ...args) => {
      const path = paths.get(fd);
      if (point === 'write-blob' && path === first || point === 'write-manifest' && path === manifest) {
        write(fd, bytes.subarray(0, 1), ...args); failure();
      }
      return write(fd, bytes, ...args);
    });
    t.mock.method(fs, 'fsyncSync', fd => {
      const path = paths.get(fd);
      if (path === root) rootSyncs++;
      if (point === 'sync-blob' && path === first || point === 'sync-blobs' && path === blobs
        || point === 'sync-manifest' && path === manifest || point === 'sync-root-final' && path === root && rootSyncs === 2) failure();
      return sync(fd);
    });
    syncBuiltinESMExports();
    try { assert.throws(() => prepareRecoveryBackup(root, snapshots()), error => error.code === 'E_RECOVERY_BACKUP_IO' && !error.message.includes('privada')); }
    finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
    assert.equal(injected, true); assert.equal(fs.readFileSync(sentinel, 'utf8'), 'dados humanos');
    if (point === 'mkdir-blobs') assert.deepEqual(fs.readdirSync(root), []);
    else assert.equal(fs.existsSync(blobs), true);
    if (['write-blob', 'write-manifest'].includes(point)) {
      const partial = point === 'write-blob' ? first : manifest;
      assert.equal(fs.statSync(partial).size, 1);
    }
  });
}

test('hash do backup verificado é registrado no begin do diário isolado', t => {
  const parent = fixture(t), backup = join(parent, 'backup'), journal = join(parent, 'diario');
  fs.mkdirSync(backup, { mode: 0o700 }); fs.mkdirSync(journal, { mode: 0o700 });
  fs.mkdirSync(join(journal, 'records'), { mode: 0o700 }); fs.mkdirSync(join(journal, 'staging'), { mode: 0o700 });
  const operation = reserveRecovery(journal), result = prepareRecoveryBackup(backup, snapshots());
  verifyRecoveryBackup(backup, result.manifest); beginRecovery(journal, operation.id, result.manifest);
  const begin = JSON.parse(fs.readFileSync(join(journal, 'records', '000000000001.begin.json')));
  assert.equal(begin.manifest, result.manifest); assert.equal(inspectRecoveryJournal(journal).phase, 'begin');
});

test('snapshot de projeto Git existente permite conferir conteúdo após aplicação parcial sintética', t => {
  const parent = fixture(t), project = join(parent, 'projeto'), backup = join(parent, 'backup'), journal = join(parent, 'diario');
  for (const path of [project, backup, journal]) fs.mkdirSync(path, { mode: 0o700 });
  fs.mkdirSync(join(journal, 'records'), { mode: 0o700 }); fs.mkdirSync(join(journal, 'staging'), { mode: 0o700 });
  fs.mkdirSync(join(project, '.claude'), { mode: 0o700 });
  assert.equal(spawnSync('git', ['init', '-q', project]).status, 0);
  fs.writeFileSync(join(project, 'AGENTS.md'), '# Original preparado\n');
  fs.writeFileSync(join(project, '.gitignore'), 'segredo-local/\n');
  fs.writeFileSync(join(project, '.claude/settings.json'), '{"user":true}\n');
  assert.equal(spawnSync('git', ['-C', project, 'add', 'AGENTS.md']).status, 0);
  fs.writeFileSync(join(project, 'AGENTS.md'), '# Edição humana posterior ao stage\n');
  const tracked = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', '.claude/settings.json'];
  const original = new Map(tracked.map(path => [path, fs.readFileSync(join(project, path))]));
  const userBytes = fs.readFileSync(join(project, 'AGENTS.md'));
  const items = [
    { path: 'AGENTS.md', action: 'update', type: 'file', mode: fs.statSync(join(project, 'AGENTS.md')).mode & 0o777, data: userBytes },
    { path: '.claude', action: 'retain', type: 'directory', mode: fs.statSync(join(project, '.claude')).mode & 0o777 },
    { path: '.claude/settings.json', action: 'retain', type: 'file', mode: fs.statSync(join(project, '.claude/settings.json')).mode & 0o777, data: original.get('.claude/settings.json') },
    { path: 'novo.md', action: 'create', type: 'absent', mode: null },
  ];
  const operation = reserveRecovery(journal), saved = prepareRecoveryBackup(backup, items);
  verifyRecoveryBackup(backup, saved.manifest); beginRecovery(journal, operation.id, saved.manifest);
  // Simulate a partial application only in this synthetic project.
  fs.writeFileSync(join(project, 'AGENTS.md'), '# Publicação parcial\n');
  fs.writeFileSync(join(project, 'novo.md'), 'arquivo criado na operação\n');
  const manifest = JSON.parse(fs.readFileSync(join(backup, 'manifest.json')));
  const entry = manifest.entries.find(item => item.path === 'AGENTS.md');
  const recovered = fs.readFileSync(join(backup, 'blobs', entry.blob));
  assert.deepEqual(recovered, userBytes);
  assert.equal(manifest.entries.find(item => item.path === 'novo.md').type, 'absent');
  assert.equal(inspectRecoveryJournal(journal).phase, 'begin');
  for (const [path, bytes] of original) assert.deepEqual(fs.readFileSync(join(project, path)), bytes, path);
});

nodeTest('criação exclusiva e backup verificável preservam diretório preexistente', t => {
  const parent = fixture(t), root = join(parent, 'cópia privada'), publicFile = join(parent, 'arquivo humano');
  fs.writeFileSync(publicFile, 'conteúdo humano');
  assert.throws(() => createPrivateRecoveryDirectory(parent), code('EEXIST'));
  createPrivateRecoveryDirectory(root);
  const saved = prepareRecoveryBackup(root, snapshots());
  assert.deepEqual(verifyRecoveryBackup(root, saved.manifest), saved);
  assertPrivateRecoveryPaths([root, join(root, 'blobs'), join(root, 'blobs', '00000001.bin'), join(root, 'manifest.json')]);
  assert.throws(() => createPrivateRecoveryDirectory(root), code('EEXIST'));
  assert.deepEqual(verifyRecoveryBackup(root, saved.manifest), saved);
  assert.equal(fs.readFileSync(publicFile, 'utf8'), 'conteúdo humano');
});

nodeTest('Windows recusa backup com permissão concedida a todos antes de gravar', { skip: process.platform !== 'win32' }, t => {
  const parent = fixture(t), root = join(parent, 'fixture acl');
  createPrivateRecoveryDirectory(root);
  const powershell = join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = `
    $ErrorActionPreference = 'Stop'
    $acl = [IO.Directory]::GetAccessControl($env:ADK_TEST_DIRECTORY)
    $everyone = [Security.Principal.SecurityIdentifier]::new('S-1-1-0')
    $rule = [Security.AccessControl.FileSystemAccessRule]::new($everyone, 'Read', 'Allow')
    $acl.AddAccessRule($rule)
    [IO.Directory]::SetAccessControl($env:ADK_TEST_DIRECTORY, $acl)
  `;
  const changed = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], {
    env: { ...process.env, ADK_TEST_DIRECTORY: root }, timeout: 30000,
  });
  assert.equal(changed.status, 0);
  assert.throws(() => createPrivateRecoveryDirectory(root), code('EEXIST'));
  assert.throws(() => prepareRecoveryBackup(root, snapshots()), code('E_RECOVERY_BACKUP_STORE'));
  assert.deepEqual(fs.readdirSync(root), []);
});

nodeTest('macOS recusa ACL herdada em pasta privada 0700 antes de gravar dados', { skip: process.platform !== 'darwin' }, t => {
  const parent = fixture(t), backup = join(parent, 'cópia'), journal = join(parent, 'diário');
  const access = 'everyone allow readattr,readsecurity,file_inherit,directory_inherit';
  assert.equal(spawnSync('/bin/chmod', ['+a', access, parent]).status, 0);
  assert.throws(() => createPrivateRecoveryDirectory(backup), code('E_RECOVERY_ACL_UNSAFE'));
  assert.equal(fs.lstatSync(backup).mode & 0o777, 0o700);
  assert.throws(() => assertPrivateRecoveryPaths([backup]), code('E_RECOVERY_ACL_UNSAFE'));
  assert.throws(() => prepareRecoveryBackup(backup, snapshots()), code('E_RECOVERY_BACKUP_STORE'));
  assert.deepEqual(fs.readdirSync(backup), []);
  fs.mkdirSync(journal, { mode: 0o700 });
  for (const directory of ['records', 'staging']) fs.mkdirSync(join(journal, directory), { mode: 0o700 });
  assert.throws(() => reserveRecovery(journal), code('E_RECOVERY_STORE'));
  assert.deepEqual(fs.readdirSync(join(journal, 'records')), []);
  assert.deepEqual(fs.readdirSync(join(journal, 'staging')), []);
});

nodeTest('macOS recusa ACL acrescentada em blob ou registro privado', { skip: process.platform !== 'darwin' }, t => {
  const backup = fixture(t), journal = fixture(t), saved = prepareRecoveryBackup(backup, snapshots());
  const blob = join(backup, 'blobs', '00000001.bin');
  assert.equal(spawnSync('/bin/chmod', ['+a', 'everyone allow readattr', blob]).status, 0);
  assert.throws(() => assertPrivateRecoveryPaths([blob]), code('E_RECOVERY_ACL_UNSAFE'));
  assert.throws(() => verifyRecoveryBackup(backup, saved.manifest), code('E_RECOVERY_BACKUP_INVALID'));
  for (const directory of ['records', 'staging']) fs.mkdirSync(join(journal, directory), { mode: 0o700 });
  const operation = reserveRecovery(journal), recordDir = join(journal, 'records');
  const record = fs.readdirSync(recordDir)[0];
  assert.equal(spawnSync('/bin/chmod', ['+a', 'everyone allow readattr', join(recordDir, record)]).status, 0);
  assert.throws(() => beginRecovery(journal, operation.id, saved.manifest), code('E_RECOVERY_STORE'));
  assert.deepEqual(fs.readdirSync(recordDir), [record]);
});

for (const mode of ['ausente', 'invalido', 'excecao']) for (const phase of ['prepare', 'verify']) {
  test(`UID ${mode} recusa ${phase} antes de escrita`, t => {
    const root = fixture(t);
    const entries = [{ path: 'arquivo', action: 'update', type: 'file', mode: 0o600, data: Buffer.from('synthetic') }];
    const prepared = phase === 'verify' ? prepareRecoveryBackup(root, entries) : undefined;
    const before = fs.readdirSync(root).sort();
    const descriptor = Object.getOwnPropertyDescriptor(process, 'geteuid');
    assert.ok(descriptor?.configurable);
    let outcome, thrown;
    try {
      Object.defineProperty(process, 'geteuid', {
        ...descriptor,
        value: mode === 'ausente' ? undefined : mode === 'invalido' ? () => NaN
          : () => { throw Object.assign(new Error('SYNTHETIC_PRIVATE'), { code: 'EIO' }); },
      });
      try { outcome = phase === 'prepare' ? prepareRecoveryBackup(root, entries) : verifyRecoveryBackup(root, prepared.manifest); }
      catch (error) { thrown = error; }
    } finally { Object.defineProperty(process, 'geteuid', descriptor); }
    assert.deepEqual(fs.readdirSync(root).sort(), before);
    assert.equal(outcome, undefined);
    assert.ok(thrown);
    assert.equal(thrown.code, mode === 'excecao' ? 'E_RECOVERY_BACKUP_IO'
      : phase === 'prepare' ? 'E_RECOVERY_BACKUP_STORE' : 'E_RECOVERY_BACKUP_INVALID');
    assert.ok(!thrown.message.includes('SYNTHETIC_PRIVATE'));
    if (prepared) assert.equal(verifyRecoveryBackup(root, prepared.manifest).files, 1);
  });
}

test('UID indisponível após validar diretórios impede abertura do manifesto', t => {
  const root = fixture(t);
  const prepared = prepareRecoveryBackup(root, snapshots());
  const manifest = join(root, 'manifest.json');
  const blob = join(root, 'blobs', '00000001.bin');
  const before = [fs.readFileSync(manifest), fs.readFileSync(blob)];
  const descriptor = Object.getOwnPropertyDescriptor(process, 'geteuid');
  assert.ok(descriptor?.configurable);
  const lstat = fs.lstatSync, open = fs.openSync;
  let changed = false, opens = 0, thrown;
  t.mock.method(fs, 'lstatSync', (path, ...args) => {
    const result = lstat(path, ...args);
    if (path === manifest && !changed) {
      changed = true;
      Object.defineProperty(process, 'geteuid', { ...descriptor, value: undefined });
    }
    return result;
  });
  t.mock.method(fs, 'openSync', (path, ...args) => {
    if (path === manifest) opens++;
    return open(path, ...args);
  });
  syncBuiltinESMExports();
  try { verifyRecoveryBackup(root, prepared.manifest); }
  catch (error) { thrown = error; }
  finally {
    Object.defineProperty(process, 'geteuid', descriptor);
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
  assert.ok(changed, 'a fixture deve retirar o UID após os diretórios');
  assert.equal(opens, 0, 'o manifesto não deve ser aberto sem UID efetivo');
  assert.equal(thrown?.code, 'E_RECOVERY_BACKUP_INVALID');
  assert.deepEqual([fs.readFileSync(manifest), fs.readFileSync(blob)], before);
  assert.equal(verifyRecoveryBackup(root, prepared.manifest).files, snapshots().filter(item => item.type === 'file').length);
});
