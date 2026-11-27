import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyFileWithNativeMetadata, stageReplacementWithNativeMetadata } from '../.pbai4devs/scripts/lib/native-metadata.mjs';
import { inspectLinuxXattr } from '../.pbai4devs/scripts/lib/xattr-probe.mjs';

const provenance = 'com.apple.provenance';
const userAttribute = 'com.pathbit.agentdevkit.test';
const sharedAttributes = { [userAttribute]: 'existing value' };
for (const [name, sourceAttributes, copyAttributes, allowed] of [
  ['accepts a new system provenance attribute', sharedAttributes, { ...sharedAttributes, [provenance]: 'system value' }, true],
  ['rejects a changed user attribute', sharedAttributes, { [userAttribute]: 'changed value', [provenance]: 'system value' }, false],
  ['preserves an existing provenance attribute', { [provenance]: 'existing value' }, { [provenance]: 'changed value' }, false],
]) {
  test(`macOS metadata verification ${name}`, {
    skip: process.platform !== 'darwin' && 'The fixture verifies macOS extended attributes.',
  }, t => {
    const root = fs.mkdtempSync(join(tmpdir(), 'adk-mac-provenance-'));
    t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
    const source = join(root, 'source'), destination = join(root, 'destination');
    fs.writeFileSync(source, 'original\n', { mode: 0o600 });
    fs.writeFileSync(destination, '', { mode: 0o600 });
    const spawn = childProcess.spawnSync;
    t.mock.method(childProcess, 'spawnSync', (command, args, options) => {
      const path = args.at(-1);
      if (command !== '/usr/bin/xattr' || ![source, destination].includes(path)) return spawn(command, args, options);
      const attrs = path === source ? sourceAttributes : copyAttributes;
      const stdout = args[0] === '-p' ? Buffer.from(attrs[args[1]]) : Object.keys(attrs).join('\n');
      return { status: 0, stdout };
    });
    syncBuiltinESMExports();

    if (allowed) {
      copyFileWithNativeMetadata(source, destination);
      assert.equal(fs.readFileSync(destination, 'utf8'), 'original\n');
      stageReplacementWithNativeMetadata(source, destination, 'updated\n', 0o600);
      assert.equal(fs.readFileSync(destination, 'utf8'), 'updated\n');
    } else {
      assert.throws(() => copyFileWithNativeMetadata(source, destination), { code: 'E_METADATA_COPY' });
      assert.throws(() => stageReplacementWithNativeMetadata(source, destination, 'updated\n', 0o600), { code: 'E_METADATA_COPY' });
    }
    assert.equal(fs.readFileSync(source, 'utf8'), 'original\n');
  });
}

test("simultaneous writing and closing failures preserve the primary error code", { skip: !['darwin', 'linux'].includes(process.platform) && 'A escrita e o fechamento usam a implementação POSIX de macOS e Linux.' }, t => {
  const root = fs.mkdtempSync(join(tmpdir(), 'adk-native-metadata-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'source'), staged = join(root, 'staged');
  fs.writeFileSync(source, 'antes\n', { mode: 0o600 });
  fs.writeFileSync(staged, 'temporario\n', { mode: 0o600 });

  const originalWrite = fs.writeSync, originalClose = fs.closeSync;
  let failedFd;
  try {
    fs.writeSync = (fd, ...args) => {
      failedFd = fd;
      throw Object.assign(new Error('falha sintética de escrita'), { code: 'EIO' });
    };
    fs.closeSync = (fd, ...args) => {
      if (fd === failedFd) throw Object.assign(new Error('falha sintética de fechamento'), { code: 'ENOSPC' });
      return originalClose(fd, ...args);
    };
    syncBuiltinESMExports();
    let caught;
    try { stageReplacementWithNativeMetadata(source, staged, 'depois\n', 0o600); }
    catch (error) { caught = error; }
    assert.ok(caught instanceof AggregateError);
    assert.equal(caught.code, 'E_METADATA_COPY');
    assert.equal(caught.cause?.code, 'E_METADATA_COPY');
    assert.deepEqual(caught.errors.map(error => error.code), ['E_METADATA_COPY', 'ENOSPC']);
  } finally {
    fs.writeSync = originalWrite;
    fs.closeSync = originalClose;
    syncBuiltinESMExports();
    if (failedFd !== undefined) try { originalClose(failedFd); } catch { /* It may already be closed. */ }
  }
});

test("Linux checks the visible attributes of the copy even without getfattr and getfacl", {
  skip: process.platform !== 'linux' ? 'A fixture lê e grava xattr nativo no Linux.'
    : !fs.existsSync('/usr/bin/python3') && 'Python 3 em /usr/bin é necessário para ler e gravar xattr sem os utilitários attr.',
}, t => {
  const root = fs.mkdtempSync(join(tmpdir(), 'adk-native-xattr-'));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
  const source = join(root, 'source'), destination = join(root, 'destination');
  fs.writeFileSync(source, 'example\n', { mode: 0o600 });
  fs.writeFileSync(destination, '', { mode: 0o600 });
  const setAttr = childProcess.spawnSync('/usr/bin/python3', ['-I', '-S', '-c',
    'import os, sys; os.setxattr(sys.argv[1], b"user.agentdevkit.test", b"test-value")', source]);
  assert.equal(setAttr.status, 0, 'a fixture precisa aceitar atributos estendidos');
  const exists = fs.existsSync;
  t.mock.method(fs, 'existsSync', path => !['/usr/bin/getfattr', '/usr/bin/getfacl'].includes(path) && exists(path));
  syncBuiltinESMExports();
  assert.equal(inspectLinuxXattr(source), 'present', 'o preflight de remoção também precisa detectar o atributo');
  copyFileWithNativeMetadata(source, destination);

  const spawn = childProcess.spawnSync;
  t.mock.method(childProcess, 'spawnSync', (command, args, options) =>
    spawn(command, command === '/bin/cp' ? ['--preserve=mode,ownership,timestamps', '--', source, destination] : args, options));
  syncBuiltinESMExports();
  fs.unlinkSync(destination);
  fs.writeFileSync(destination, '', { mode: 0o600 });
  assert.throws(() => copyFileWithNativeMetadata(source, destination), { code: 'E_METADATA_COPY' });
});
