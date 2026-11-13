import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs, { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPlan, planInstallation } from '../src/install.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const posixOnly = process.platform === 'win32' ? 'Windows does not expose POSIX permission bits.' : false;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const mode = file => statSync(file).mode & 0o777;

function fixture(t) {
  mkdirSync(join(repository, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(repository, '.agent-tests/file-modes-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '--quiet', root]).status, 0);
  applyPlan(planInstallation({ target: root, mode: 'init', clients: ['codex'] }));
  return root;
}

test('escrita atômica e backups preservam permissões mesmo com umask restritiva', { skip: posixOnly }, t => {
  const root = fixture(t), agents = join(root, 'AGENTS.md'), state = join(root, '.pbai4devs/state/agentdevkit.json');
  chmodSync(agents, 0o600); chmodSync(state, 0o640);
  const before = readFileSync(agents);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  assert.ok(plan.changes.some(change => change.path === 'AGENTS.md'));
  const previousUmask = process.umask(0o077);
  let applied;
  try { applied = applyPlan(plan); }
  finally { process.umask(previousUmask); }
  assert.equal(mode(agents), 0o600); assert.equal(mode(state), 0o640);
  assert.notDeepEqual(readFileSync(agents), before);
  assert.ok(applied.backup);
  assert.deepEqual(readFileSync(join(root, applied.backup, 'AGENTS.md')), before);
  assert.equal(mode(join(root, applied.backup, 'AGENTS.md')), 0o600);
  assert.equal(mode(join(root, applied.backup, '.pbai4devs/state/agentdevkit.json')), 0o640);
});

test('rollback restaura bytes e modo de arquivos substituídos e removidos', { skip: posixOnly }, t => {
  const root = fixture(t), agents = join(root, 'AGENTS.md');
  chmodSync(agents, 0o600);
  const obsoletePath = '.pbai4devs/rules/obsolete/RULE.md', obsolete = join(root, obsoletePath);
  mkdirSync(dirname(obsolete), { recursive: true });
  writeFileSync(obsolete, '---\ntrigger: manual\ndescription: Private obsolete rule.\n---\n\n# Private rule\n');
  chmodSync(obsolete, 0o700);
  const originalAgents = readFileSync(agents), originalRule = readFileSync(obsolete);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  plan.changes.push({ path: obsoletePath, action: 'remove', beforeHash: digest(originalRule), content: null });
  plan.changes.push({ path: 'injected-failure.txt', action: 'create', beforeHash: null,
    get content() { throw new Error('injected failure after earlier writes and removal'); } });
  assert.throws(() => applyPlan(plan), /injected failure after earlier writes and removal/);
  assert.deepEqual(readFileSync(agents), originalAgents); assert.equal(mode(agents), 0o600);
  assert.deepEqual(readFileSync(obsolete), originalRule); assert.equal(mode(obsolete), 0o700);
});

for (const remove of [false, true]) test(`rollback de 0444 após ${remove ? 'remoção' : 'substituição'} preserva o erro original`, { skip: posixOnly }, t => {
  const root = fixture(t), agents = join(root, 'AGENTS.md');
  const bytes = readFileSync(agents);
  chmodSync(agents, 0o444);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const change = plan.changes.find(item => item.path === 'AGENTS.md');
  assert.ok(change, 'A alteração deve exercitar o arquivo somente leitura.');
  if (remove) {
    change.action = 'remove'; change.content = null;
  }
  const failure = new Error('failure after read-only file change');
  plan.changes.push({ path: 'injected-failure.txt', action: 'create', beforeHash: null,
    get content() { throw failure; } });
  assert.throws(() => applyPlan(plan), error => error === failure);
  assert.deepEqual(readFileSync(agents), bytes);
  assert.equal(mode(agents), 0o444);
});

for (const changed of ['content-and-mode', 'mode-only', 'removed', 'recreated']) test(`rollback preserva mudança concorrente: ${changed}`, { skip: posixOnly }, t => {
  const root = fixture(t), agents = join(root, 'AGENTS.md');
  const state = join(root, '.pbai4devs/state/agentdevkit.json');
  const beforeState = readFileSync(state);
  chmodSync(agents, 0o600);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const change = plan.changes.find(item => item.path === 'AGENTS.md');
  assert.ok(change);
  const appliedBytes = Buffer.from(change.content);
  if (changed === 'recreated') { change.action = 'remove'; change.content = null; }
  const human = Buffer.from('Human edit during failed operation.\n');
  const failure = new Error('failure after concurrent human edit');
  plan.changes.push({ path: 'injected-failure.txt', action: 'create', beforeHash: null,
    get content() {
      if (changed === 'removed') rmSync(agents);
      else {
        if (changed !== 'mode-only') writeFileSync(agents, human);
        chmodSync(agents, 0o640);
      }
      throw failure;
    } });
  assert.throws(() => applyPlan(plan), error => error === failure);
  assert.deepEqual(failure.rollbackPreservedPaths, ['AGENTS.md']);
  if (changed === 'removed') assert.equal(existsSync(agents), false);
  else {
    assert.deepEqual(readFileSync(agents), changed === 'mode-only' ? appliedBytes : human);
    assert.equal(mode(agents), 0o640);
  }
  assert.deepEqual(readFileSync(state), beforeState, 'Outras gravações próprias devem ser restauradas.');
});

for (const humanChange of [false, true]) test(`falha de limpeza após rename ${humanChange ? 'preserva edição concorrente' : 'restaura a gravação publicada'}`, { skip: posixOnly }, t => {
  const root = fixture(t), agents = join(root, 'AGENTS.md');
  const originalBytes = readFileSync(agents);
  chmodSync(agents, 0o444);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const failure = Object.assign(new Error('injected cleanup failure after publish'), { code: 'EIO' });
  const human = Buffer.from('Concurrent human text after publication.\n');
  const originalRm = fs.rmSync;
  let thrown = false;
  fs.rmSync = (path, options) => {
    if (!thrown && String(path).startsWith(`${agents}.agentdevkit-`) && !existsSync(path)) {
      thrown = true;
      if (humanChange) { chmodSync(agents, 0o640); writeFileSync(agents, human); }
      throw failure;
    }
    return originalRm(path, options);
  };
  syncBuiltinESMExports();
  try { assert.throws(() => applyPlan(plan), error => error === failure); }
  finally { fs.rmSync = originalRm; syncBuiltinESMExports(); }
  assert.equal(thrown, true, 'A falha deve ocorrer depois do rename.');
  assert.deepEqual(readFileSync(agents), humanChange ? human : originalBytes);
  assert.equal(mode(agents), humanChange ? 0o640 : 0o444);
  if (humanChange) assert.deepEqual(failure.rollbackPreservedPaths, ['AGENTS.md']);
});

for (const recreated of [false, true]) test(`rollback de ancestrais removidos ${recreated ? 'preserva modos da recriação humana' : 'restaura permissões originais'}`, { skip: posixOnly }, t => {
  const root = fixture(t), parent = join(root, '.pbai4devs/rules/private-group');
  const nested = join(parent, 'obsolete'), relative = '.pbai4devs/rules/private-group/obsolete/RULE.md';
  const file = join(root, relative);
  mkdirSync(nested, { recursive: true });
  const bytes = Buffer.from('---\ntrigger: manual\ndescription: Private rule.\n---\n\n# Private rule\n');
  writeFileSync(file, bytes); chmodSync(parent, 0o700); chmodSync(nested, 0o750); chmodSync(file, 0o640);
  const ignore = join(root, '.gitignore');
  writeFileSync(ignore, '# Local user ignore\n');
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  plan.changes.push({ path: relative, action: 'remove', beforeHash: digest(bytes), content: null });
  const failure = new Error('failure after pruning directories');
  plan.localIgnore.edits = [{ path: ignore, before: readFileSync(ignore, 'utf8'),
    get after() {
      assert.equal(existsSync(parent), false, 'Os diretórios devem ter sido removidos antes da falha.');
      if (recreated) {
        mkdirSync(nested, { recursive: true });
        chmodSync(parent, 0o711); chmodSync(nested, 0o770);
      }
      throw failure;
    } }];
  assert.throws(() => applyPlan(plan), error => error === failure);
  assert.deepEqual(readFileSync(file), bytes);
  assert.equal(mode(file), 0o640);
  assert.equal(mode(parent), recreated ? 0o711 : 0o700);
  assert.equal(mode(nested), recreated ? 0o770 : 0o750);
});
