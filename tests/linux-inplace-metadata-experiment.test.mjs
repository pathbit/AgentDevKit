import test from 'node:test';
import assert from 'node:assert/strict';
import { closeSync, fstatSync, ftruncateSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Experimento em fixture: não é o mecanismo de escrita do AgentDevKit.
test('escrita no mesmo inode preserva atributos observados, mas interrupção deixa conteúdo parcial', { skip: process.platform !== 'linux' }, t => {
  for (const command of ['/usr/bin/getfattr', '/usr/bin/setfattr', '/usr/bin/setfacl']) {
    if (spawnSync(command, ['--version']).error) { t.skip('Ferramentas attr ou acl indisponíveis.'); return; }
  }
  const root = mkdtempSync(join(tmpdir(), 'adk-inplace-experiment-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = join(root, 'arquivo');
  writeFileSync(file, 'conteudo original\n');
  const gitEnv = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key))), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' };
  const git = (...args) => spawnSync('git', ['-C', root, ...args], { env: gitEnv });
  assert.equal(git('init', '-q').status, 0);
  assert.equal(git('add', 'arquivo').status, 0);
  const setAttr = spawnSync('/usr/bin/setfattr', ['-n', 'user.pathbit-fixture', '-v', 'valor-sintetico', '--', file]);
  const setAcl = spawnSync('/usr/bin/setfacl', ['-m', 'u:12345:r--', '--', file]);
  if (setAttr.status !== 0 || setAcl.status !== 0) { t.skip('Filesystem não permite atributos ou ACL de teste.'); return; }
  const attributes = () => spawnSync('/usr/bin/getfattr', ['-d', '-m', '-', '--absolute-names', '--', file]);
  const before = attributes();
  assert.equal(before.status, 0);
  assert.ok(before.stdout.includes(Buffer.from('user.pathbit-fixture=')));
  assert.ok(before.stdout.includes(Buffer.from('system.posix_acl_access=')));
  const index = readFileSync(join(root, '.git/index'));
  const updated = Buffer.from('conteudo atualizado\n');
  let fd = openSync(file, 'r+');
  const inode = fstatSync(fd).ino;
  try {
    assert.equal(writeSync(fd, updated, 0, updated.length, 0), updated.length);
    ftruncateSync(fd, updated.length);
    assert.equal(fstatSync(fd).ino, inode);
  } finally { closeSync(fd); }
  const after = attributes();
  assert.equal(after.status, 0);
  assert.deepEqual(after.stdout, before.stdout);
  assert.deepEqual(readFileSync(file), updated);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  const next = Buffer.from('uma escrita mais longa que sera interrompida\n');
  fd = openSync(file, 'r+');
  try { assert.equal(writeSync(fd, next, 0, 4, 0), 4); } finally { closeSync(fd); }
  const partial = readFileSync(file);
  assert.notDeepEqual(partial, updated);
  assert.notDeepEqual(partial, next);
  const interrupted = attributes();
  assert.equal(interrupted.status, 0);
  assert.deepEqual(interrupted.stdout, before.stdout);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});
