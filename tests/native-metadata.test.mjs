import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyFileWithNativeMetadata, stageReplacementWithNativeMetadata } from '../.pbai4devs/scripts/lib/native-metadata.mjs';
import { inspectLinuxXattr } from '../.pbai4devs/scripts/lib/xattr-probe.mjs';

test('falhas simultâneas de escrita e fechamento preservam o código do erro primário', { skip: !['darwin', 'linux'].includes(process.platform) && 'A escrita e o fechamento usam a implementação POSIX de macOS e Linux.' }, t => {
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

test('Linux verifica os atributos visíveis da cópia mesmo sem getfattr e getfacl', {
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
