import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { diagnose } from '../SCRIPT.mjs';
import { findExecutable, projectRoot, requireNode } from '../../lib/runtime.mjs';

test('diagnostico funciona so com Node e informa dependencias opcionais ausentes', t => {
  const output = join(projectRoot, '.agent-tests'); mkdirSync(output, { recursive: true });
  const root = mkdtempSync(join(output, 'diagnose-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const report = diagnose({ root, environment: { PATH: '' }, probe: () => { throw new Error('Nenhum processo opcional esperado.'); } });
  assert.equal(report.runtime.name, 'node'); assert.equal(report.runtime.executable, process.execPath);
  assert.equal(report.npm, null); assert.equal(report.git, null);
  assert.equal(report.docker.executable, null); assert.equal(report.docker.compose, false);
  assert.deepEqual(report.tools, []); assert.equal(existsSync(join(root, '.pbai4devs')), false);
});

test('requisito comum recusa Node antigo e procura executaveis sem shell', t => {
  assert.throws(() => requireNode(24, '22.22.0'), /Node.js >=24/);
  assert.doesNotThrow(() => requireNode(24, '24.13.0'));
  const output = join(projectRoot, '.agent-tests'); mkdirSync(output, { recursive: true });
  const root = mkdtempSync(join(output, 'runtime-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = join(root, process.platform === 'win32' ? 'fixture.exe' : 'fixture');
  writeFileSync(file, 'fixture'); chmodSync(file, 0o755);
  assert.equal(findExecutable(file), file);
  assert.equal(findExecutable('fixture', { PATH: dirname(file) }), file);
  assert.equal(findExecutable('missing', { PATH: dirname(file) }), null);
});
