import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { diagnosePreservedDerivedToml } from '../src/install.mjs';

const target = '.gemini/commands/equipe-check.toml';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test("diagnosis distinguishes reading failure, absence and divergence without inferring property", () => {
  const recorded = { [target]: sha(Buffer.from('registro antigo')) }, preserved = new Map([[target, { reason: 'existing-file' }]]);
  const inspect = read => diagnosePreservedDerivedToml(recorded, preserved, {}, read);
  assert.deepEqual(inspect(() => { throw Object.assign(new Error('dados privados'), { code: 'EACCES' }); }), [{ code: 'derived-file-unverified', path: target }]);
  assert.deepEqual(inspect(() => null), [{ code: 'derived-file-missing', path: target }]);
  assert.deepEqual(inspect(() => undefined), [{ code: 'derived-file-unverified', path: target }]);
  assert.deepEqual(inspect(() => Buffer.from('conteúdo humano')), [{ code: 'derived-file-diverged', path: target }]);
  assert.deepEqual(inspect(() => Buffer.from('registro antigo')), []);
  assert.deepEqual(diagnosePreservedDerivedToml(recorded, new Map(), {}, () => { throw Error('não deveria ler'); }), []);
});
