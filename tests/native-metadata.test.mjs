import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stageReplacementWithNativeMetadata } from '../.pbai4devs/scripts/lib/native-metadata.mjs';

test('falhas simultâneas de escrita e fechamento preservam o código do erro primário', { skip: !['darwin', 'linux'].includes(process.platform) }, t => {
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
