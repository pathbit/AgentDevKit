import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureRecoverySnapshot, inspectRecoveryTarget } from './fixtures/recovery-capture.mjs';
import { prepareRecoveryBackup, verifyRecoveryBackup } from '../.pbai4devs/scripts/lib/recovery-backup.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
  const root = fs.mkdtempSync(join(fs.realpathSync(tmpdir()), 'adk-capture-'));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
  return root;
}

test('descreve uma raiz ausente e seus ancestrais sem criá-los', t => {
  const root = fixture(t), target = join(root, 'novo', 'projeto');
  const before = fs.statSync(root, { bigint: true });
  const missing = inspectRecoveryTarget(target);
  assert.equal(missing.status, 'missing'); assert.deepEqual(missing.missing, ['novo', 'projeto']);
  assert.equal(missing.anchor.dev, String(before.dev)); assert.equal(missing.anchor.ino, String(before.ino));
  assert.equal(fs.existsSync(join(root, 'novo')), false);
  fs.mkdirSync(join(root, 'novo'));
  const intermediate = inspectRecoveryTarget(target);
  assert.equal(intermediate.status, 'missing'); assert.deepEqual(intermediate.missing, ['projeto']);
  assert.notEqual(intermediate.anchor.ino, missing.anchor.ino);
  fs.mkdirSync(target);
  const present = inspectRecoveryTarget(target);
  assert.equal(present.status, 'existing'); assert.deepEqual(present.missing, []);
  assert.equal(present.anchor.ino, String(fs.statSync(target, { bigint: true }).ino));
});

test('recusa link ou arquivo em ancestral da raiz sem criar projeto', t => {
  const root = fixture(t), outside = fixture(t);
  fs.writeFileSync(join(root, 'arquivo'), 'humano');
  assert.throws(() => inspectRecoveryTarget(join(root, 'arquivo', 'novo')), { code: 'E_RECOVERY_CAPTURE_ROOT' });
  try { fs.symlinkSync(outside, join(root, 'link'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) { t.skip('Sem permissão para criar links.'); return; } throw error; }
  assert.throws(() => inspectRecoveryTarget(join(root, 'link', 'novo')), { code: 'E_RECOVERY_CAPTURE_ROOT' });
  assert.equal(fs.existsSync(join(outside, 'novo')), false);
  assert.equal(fs.readFileSync(join(root, 'arquivo'), 'utf8'), 'humano');
});

test('recusa criação concorrente da raiz durante a inspeção', t => {
  const root = fixture(t), target = join(root, 'novo', 'projeto'), firstMissing = join(root, 'novo');
  const lstat = fs.lstatSync; let checks = 0;
  t.mock.method(fs, 'lstatSync', (path, ...args) => {
    if (path === firstMissing && ++checks === 2) fs.mkdirSync(firstMissing);
    return lstat(path, ...args);
  });
  syncBuiltinESMExports();
  assert.throws(() => inspectRecoveryTarget(target), { code: 'E_RECOVERY_CAPTURE_CHANGED' });
  assert.equal(checks, 2); assert.equal(fs.existsSync(target), false);
});

test('captura ações e ancestrais e produz backup verificável sem alterar arquivos', { skip: process.platform === 'win32' }, t => {
  const root = fixture(t), backup = fixture(t);
  fs.mkdirSync(join(root, 'docs'));
  const data = Buffer.from([0, 255, 128, 10]);
  fs.writeFileSync(join(root, 'docs/original.bin'), data, { mode: 0o600 });
  const before = fs.statSync(join(root, 'docs/original.bin'), { bigint: true });
  const entries = captureRecoverySnapshot(root, [
    { path: 'docs/original.bin', action: 'update', beforeHash: sha(data) },
    { path: 'docs/novo/nome.txt', action: 'create', beforeHash: null },
  ]);
  assert.deepEqual(entries, [
    { path: 'docs', action: 'retain', type: 'directory', mode: Number(fs.statSync(join(root, 'docs')).mode & 0o777) },
    { path: 'docs/novo', action: 'create', type: 'absent', mode: null },
    { path: 'docs/novo/nome.txt', action: 'create', type: 'absent', mode: null },
    { path: 'docs/original.bin', action: 'update', type: 'file', mode: 0o600, data },
  ]);
  const saved = prepareRecoveryBackup(backup, entries);
  assert.deepEqual(verifyRecoveryBackup(backup, saved.manifest), saved);
  const manifest = JSON.parse(fs.readFileSync(join(backup, 'manifest.json'), 'utf8'));
  const entry = manifest.entries.find(item => item.path === 'docs/original.bin');
  assert.deepEqual(fs.readFileSync(join(backup, 'blobs', entry.blob)), data);
  const after = fs.statSync(join(root, 'docs/original.bin'), { bigint: true });
  assert.equal(after.dev, before.dev); assert.equal(after.ino, before.ino);
  assert.equal(after.mode, before.mode); assert.deepEqual(fs.readFileSync(join(root, 'docs/original.bin')), data);
  assert.equal(fs.existsSync(join(root, 'docs/novo')), false);
});

test('recusa caminhos inválidos, aliases e conflitos de estado', t => {
  const root = fixture(t);
  fs.writeFileSync(join(root, 'human.txt'), 'humano');
  for (const path of ['../fora', '.git/config', '.agent-tests/teste', 'CON', 'diretorio/../fora', 'a\\b']) {
    assert.throws(() => captureRecoverySnapshot(root, [{ path, action: 'create' }]), { code: 'E_RECOVERY_CAPTURE_INPUT' }, path);
  }
  assert.throws(() => captureRecoverySnapshot(root, [{ path: 'A/x', action: 'create' }, { path: 'a/y', action: 'create' }]), { code: 'E_RECOVERY_CAPTURE_INPUT' });
  assert.throws(() => captureRecoverySnapshot(root, [{ path: 'straße/x', action: 'create' }, { path: 'STRASSE/y', action: 'create' }]), { code: 'E_RECOVERY_CAPTURE_INPUT' });
  assert.throws(() => captureRecoverySnapshot(root, [{ path: 'human.txt', action: 'create' }]), { code: 'E_RECOVERY_CAPTURE_CHANGED' });
  assert.throws(() => captureRecoverySnapshot(root, [{ path: 'ausente', action: 'remove' }]), { code: 'E_RECOVERY_CAPTURE_CHANGED' });
  assert.throws(() => captureRecoverySnapshot(root, [{ path: 'human.txt', action: 'update' }]), { code: 'E_RECOVERY_CAPTURE_INPUT' });
  assert.throws(() => captureRecoverySnapshot(root, [{ path: 'human.txt', action: 'update', beforeHash: '0'.repeat(64) }]), { code: 'E_RECOVERY_CAPTURE_CHANGED' });
  assert.equal(fs.readFileSync(join(root, 'human.txt'), 'utf8'), 'humano');
});

test('distingue arquivo vazio de caminho ausente', t => {
  const root = fixture(t); fs.writeFileSync(join(root, 'vazio'), Buffer.alloc(0));
  const captured = captureRecoverySnapshot(root, [
    { path: 'vazio', action: 'update', beforeHash: sha(Buffer.alloc(0)) },
    { path: 'novo', action: 'create', beforeHash: null },
  ]);
  assert.equal(captured.find(item => item.path === 'vazio').type, 'file');
  assert.deepEqual(captured.find(item => item.path === 'vazio').data, Buffer.alloc(0));
  assert.equal(captured.find(item => item.path === 'novo').type, 'absent');
  assert.equal(fs.existsSync(join(root, 'novo')), false);
});

test('recusa links e hardlinks sem abrir ou modificar o destino', t => {
  const root = fixture(t), outside = fixture(t);
  const secret = join(outside, 'externo'); fs.writeFileSync(secret, 'preservar');
  try { fs.symlinkSync(outside, join(root, 'link'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) { t.skip('Sem permissão para criar links.'); return; } throw error; }
  assert.throws(() => captureRecoverySnapshot(root, [{ path: 'link/externo', action: 'update' }]), { code: 'E_RECOVERY_CAPTURE_PROTECTED' });
  fs.writeFileSync(join(root, 'file'), 'vínculo'); fs.linkSync(join(root, 'file'), join(root, 'hardlink'));
  assert.throws(() => captureRecoverySnapshot(root, [{ path: 'file', action: 'update' }]), { code: 'E_RECOVERY_CAPTURE_PROTECTED' });
  assert.equal(fs.readFileSync(secret, 'utf8'), 'preservar');
  assert.equal(fs.readFileSync(join(root, 'hardlink'), 'utf8'), 'vínculo');
});

test('recusa edição durante a leitura em vez de registrar snapshot inconsistente', t => {
  const root = fixture(t), path = join(root, 'arquivo'); fs.writeFileSync(path, 'original');
  const read = fs.readSync; let changed = false;
  t.mock.method(fs, 'readSync', (...args) => {
    const count = read(...args);
    if (!changed) { changed = true; fs.writeFileSync(path, 'alterado'); }
    return count;
  });
  syncBuiltinESMExports();
  assert.throws(() => captureRecoverySnapshot(root, [{ path: 'arquivo', action: 'update', beforeHash: sha(Buffer.from('original')) }]), { code: 'E_RECOVERY_CAPTURE_CHANGED' });
  assert.equal(changed, true); assert.equal(fs.readFileSync(path, 'utf8'), 'alterado');
});

test('troca de ancestral por link é detectada antes da leitura do arquivo externo', { skip: process.platform === 'win32' }, t => {
  const root = fixture(t), outside = fixture(t), directory = join(root, 'docs');
  fs.mkdirSync(directory); fs.writeFileSync(join(directory, 'arquivo'), 'interno');
  const external = join(outside, 'arquivo'); fs.writeFileSync(external, 'externo');
  const externalIdentity = fs.statSync(external, { bigint: true });
  const open = fs.openSync, read = fs.readSync; let replaced = false, readCalled = false, openedExternal = false;
  t.mock.method(fs, 'openSync', (path, ...args) => {
    if (path === join(directory, 'arquivo') && !replaced) {
      replaced = true; fs.renameSync(directory, join(root, 'docs-originais')); fs.symlinkSync(outside, directory, 'dir');
    }
    const fd = open(path, ...args);
    const observed = fs.fstatSync(fd, { bigint: true });
    openedExternal ||= observed.dev === externalIdentity.dev && observed.ino === externalIdentity.ino;
    return fd;
  });
  t.mock.method(fs, 'readSync', (...args) => { readCalled = true; return read(...args); });
  syncBuiltinESMExports();
  assert.throws(() => captureRecoverySnapshot(root, [{ path: 'docs/arquivo', action: 'update', beforeHash: sha(Buffer.from('interno')) }]),
    { code: 'E_RECOVERY_CAPTURE_CHANGED' });
  assert.equal(replaced, true); assert.equal(readCalled, false);
  t.diagnostic(`abertura externa observada: ${openedExternal}; a recusa anterior à leitura não comprova isolamento da abertura`);
  assert.equal(fs.readFileSync(external, 'utf8'), 'externo');
  assert.equal(fs.readFileSync(join(root, 'docs-originais/arquivo'), 'utf8'), 'interno');
});

const earlySwap = 'troca anterior ao lstat do arquivo não lê conteúdo externo';
if (process.platform === 'win32') {
  test(earlySwap, { skip: 'fixture de link requer ambiente POSIX' });
} else if (process.env.ADK_STRICT_RECOVERY_TEST !== '1') {
  test(earlySwap, { todo: 'captura por caminhos ainda permite leitura por ancestral trocado' });
} else {
  test(earlySwap, t => {
    const root = fixture(t), outside = fixture(t), directory = join(root, 'docs');
    fs.mkdirSync(directory); fs.writeFileSync(join(directory, 'arquivo'), 'interno');
    const external = join(outside, 'arquivo'); fs.writeFileSync(external, 'externo sintético');
    const externalIdentity = fs.statSync(external, { bigint: true });
    const lstat = fs.lstatSync, read = fs.readSync; let replaced = false, readExternal = false;
    t.mock.method(fs, 'lstatSync', (path, ...args) => {
      if (path === join(directory, 'arquivo') && !replaced) {
        replaced = true; fs.renameSync(directory, join(root, 'docs-originais')); fs.symlinkSync(outside, directory, 'dir');
      }
      return lstat(path, ...args);
    });
    t.mock.method(fs, 'readSync', (fd, ...args) => {
      const opened = fs.fstatSync(fd, { bigint: true });
      if (opened.dev === externalIdentity.dev && opened.ino === externalIdentity.ino) readExternal = true;
      return read(fd, ...args);
    });
    syncBuiltinESMExports();
    assert.throws(() => captureRecoverySnapshot(root, [{ path: 'docs/arquivo', action: 'update', beforeHash: sha(Buffer.from('interno')) }]));
    assert.equal(replaced, true, 'fixture deve trocar o ancestral antes do lstat do arquivo');
    assert.equal(readExternal, false, 'a captura não deve ler o destino externo');
    assert.equal(fs.readFileSync(external, 'utf8'), 'externo sintético');
  });
}
