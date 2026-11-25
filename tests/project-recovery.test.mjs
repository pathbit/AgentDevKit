import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { completeProjectRecovery, inspectProjectRecovery, resolveProjectRecovery, startProjectRecovery } from '../.pbai4devs/scripts/lib/project-recovery.mjs';

const noHistory = { status: 'ready', generation: 0, head: null };
const absentReadme = { path: 'README.md', type: 'absent', action: 'create', mode: null };
const run = promisify(execFile);

function fixture(t) {
  const temporary = fileURLToPath(new URL('../tmp/', import.meta.url));
  mkdirSync(temporary, { recursive: true });
  const root = realpathSync(mkdtempSync(join(temporary, 'project-recovery-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test("missing root preserves the reserve and the history after the project is created", t => {
  const parent = fixture(t), target = join(parent, 'apps', 'novo');
  assert.deepEqual(inspectProjectRecovery(target), noHistory);
  assert.deepEqual(readdirSync(parent), []);
  const tx = startProjectRecovery(target, [absentReadme]);
  assert.equal(dirname(tx.store), parent);
  assert.equal(existsSync(target), false);
  assert.deepEqual(tx.originalRoot.missing, ['apps', 'novo']);
  assert.equal(tx.originalRoot.anchor, parent);
  assert.deepEqual(readdirSync(tx.stage), []);
  assert.deepEqual(readdirSync(tx.backup).sort(), ['blobs', 'manifest.json']);
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'README.md'), 'criado pelo operador');
  const pending = inspectProjectRecovery(target);
  assert.equal(pending.status, 'pending');
  assert.equal(pending.stage, tx.stage);
  assert.equal(pending.backup, tx.backup);
  assert.throws(() => startProjectRecovery(target, []), { code: 'E_RECOVERY_PENDING' });
  assert.equal(completeProjectRecovery(tx).phase, 'done');
  const next = startProjectRecovery(target, []);
  assert.equal(next.store, tx.store);
  assert.equal(next.generation, 2);
  assert.deepEqual(next.originalRoot.missing, []);
  assert.deepEqual(inspectProjectRecovery(target).originalRoot.missing, []);
  assert.equal(resolveProjectRecovery(target, next.generation, next.id).phase, 'resolved');
  assert.equal(existsSync(join(target, '.agent-tests')), false);
  assert.equal(readFileSync(join(target, 'README.md'), 'utf8'), 'criado pelo operador');
});

test("each generation records which root components are still missing", t => {
  const parent = fixture(t), intermediate = join(parent, 'apps'), target = join(intermediate, 'novo');
  const first = startProjectRecovery(target, []);
  mkdirSync(intermediate);
  resolveProjectRecovery(target, first.generation, first.id);
  const second = startProjectRecovery(target, []);
  assert.equal(second.store, first.store);
  assert.deepEqual(inspectProjectRecovery(target).originalRoot.missing, ['novo']);
  assert.equal(second.originalRoot.anchor, intermediate);
  assert.notEqual(second.manifest, first.manifest);
  assert.equal(second.backupManifest, first.backupManifest);
  resolveProjectRecovery(target, second.generation, second.id);
});

test("existing project binds bytes prior to start and keeps changes after resolution", t => {
  const target = fixture(t);
  const original = Buffer.from('versão anterior');
  const document = join(target, 'README.md');
  writeFileSync(document, original);
  assert.deepEqual(inspectProjectRecovery(target), noHistory);
  assert.deepEqual(readdirSync(target), ['README.md']);
  const tx = startProjectRecovery(target, [{ path: 'README.md', type: 'file', action: 'update', mode: 0o644, data: original }]);
  assert.equal(tx.store, join(target, '.agent-tests', 'agentdevkit', 'recovery'));
  const begin = JSON.parse(readFileSync(join(tx.journal, 'records', '000000000001.begin.json'), 'utf8'));
  assert.equal(begin.manifest, tx.manifest);
  assert.deepEqual(readFileSync(join(tx.backup, 'blobs', '00000001.bin')), original);
  writeFileSync(document, 'edição atual');
  assert.throws(() => resolveProjectRecovery(target, tx.generation + 1, tx.id), { code: 'E_RECOVERY_STATE' });
  assert.equal(resolveProjectRecovery(target, tx.generation, tx.id).phase, 'resolved');
  assert.equal(inspectProjectRecovery(target).resolvedCount, 1);
  assert.equal(readFileSync(document, 'utf8'), 'edição atual');
  assert.throws(() => completeProjectRecovery(tx), { code: 'E_RECOVERY_STATE' });
});

test("failure to prepare the copy keeps the reservation pending until explicit resolution", t => {
  const target = fixture(t);
  const document = join(target, 'README.md');
  writeFileSync(document, 'original');
  assert.throws(() => startProjectRecovery(target, [{ ...absentReadme, mode: 0o644 }]), error =>
    error.code === 'E_RECOVERY_BACKUP_INPUT' && error.recovery.generation === 1);
  const state = inspectProjectRecovery(target);
  assert.equal(state.phase, 'claim');
  assert.throws(() => startProjectRecovery(target, []), { code: 'E_RECOVERY_PENDING' });
  resolveProjectRecovery(target, state.generation, state.id);
  assert.equal(inspectProjectRecovery(target).status, 'ready');
  assert.equal(readFileSync(document, 'utf8'), 'original');
});

test("incomplete origin prevents new reservation and is available for review", t => {
  const target = fixture(t);
  const tx = startProjectRecovery(target, []);
  completeProjectRecovery(tx);
  const origin = join(tx.store, 'origin.json');
  writeFileSync(origin, '{"version":');
  assert.equal(inspectProjectRecovery(target).status, 'invalid');
  assert.throws(() => startProjectRecovery(target, []), { code: 'E_RECOVERY_STORE' });
  assert.equal(readFileSync(origin, 'utf8'), '{"version":');
});

test("manifest of the divergent copy prevents completion and resolution of the beginning", t => {
  const target = fixture(t);
  const tx = startProjectRecovery(target, [absentReadme]);
  const manifest = join(tx.backup, 'manifest.json');
  writeFileSync(manifest, '{"version":1,"entries":[]}\n');
  assert.equal(inspectProjectRecovery(target).status, 'invalid');
  assert.throws(() => completeProjectRecovery(tx), { code: 'E_RECOVERY_STORE' });
  assert.throws(() => resolveProjectRecovery(target, tx.generation, tx.id), { code: 'E_RECOVERY_STORE' });
  assert.equal(readdirSync(join(tx.journal, 'records')).length, 2);
});

test("two competing installers get a single reservation", async t => {
  const parent = fixture(t), target = join(parent, 'projeto');
  const source = new URL('../.pbai4devs/scripts/lib/project-recovery.mjs', import.meta.url).href;
  const child = `
    const { startProjectRecovery } = await import(process.argv[1]);
    try {
      const { generation, id } = startProjectRecovery(process.argv[2], []);
      console.log(JSON.stringify({ generation, id }));
    } catch (error) {
      console.log(JSON.stringify({ code: error.code }));
    }
  `;
  const options = { timeout: 120000, windowsHide: true };
  const results = await Promise.all([1, 2].map(() => run(process.execPath, ['--input-type=module', '-e', child, source, target], options)));
  const attempts = results.map(result => JSON.parse(result.stdout));
  assert.equal(attempts.filter(attempt => attempt.id).length, 1);
  assert.ok(attempts.some(attempt => ['E_RECOVERY_BUSY', 'E_RECOVERY_PENDING', 'E_RECOVERY_STORE'].includes(attempt.code)));
  const state = inspectProjectRecovery(target);
  assert.equal(state.id, attempts.find(attempt => attempt.id).id);
  assert.equal(state.phase, 'begin');
  assert.equal(existsSync(target), false);
});
