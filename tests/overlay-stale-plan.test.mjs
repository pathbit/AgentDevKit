import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { syncBuiltinESMExports } from 'node:module';
import { spawnSync } from 'node:child_process';
import { applyPlan, planInstallation } from '../src/install.mjs';
import { cli, fixture, put } from './fixtures/client-selection-helpers.mjs';

function overlayFixture(t) {
  const root = fixture(t), agent = '.claude/agents/implementador.md';
  const metadata = '.pbai4devs/agents/implementador/claude.yaml';
  const state = '.pbai4devs/state/agentdevkit.json', derived = '.pbai4devs/state/derived.json';
  put(root, '.gitignore', '# regra humana\n'); put(root, 'human.txt', 'staged\n');
  const git = spawnSync('git', ['-C', root, 'add', '--', '.gitignore', 'human.txt'], { encoding: 'utf8' });
  assert.equal(git.status, 0, git.stderr);
  put(root, 'human.txt', 'staged\nunstaged\n');
  cli(root, ['init', '--agents', 'claude']);
  const original = readFileSync(join(root, metadata), 'utf8');
  assert.match(original, /^tools: Read, Grep, Glob, Bash, Edit, Write$/m);
  put(root, metadata, original.replace('tools: Read, Grep, Glob, Bash, Edit, Write', 'tools: Read, Grep, Glob'));
  const direct = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--root', root], { cwd: root, encoding: 'utf8', timeout: 180000 });
  assert.equal(direct.status, 0, direct.stdout + direct.stderr);
  const base = JSON.parse(readFileSync(join(root, state), 'utf8'));
  const overlay = JSON.parse(readFileSync(join(root, derived), 'utf8'));
  assert.ok(base.files[agent]); assert.ok(overlay.files[agent]);
  assert.notEqual(base.files[agent], overlay.files[agent]);
  const plan = planInstallation({ target: root, mode: 'sync', language: 'pt' });
  assert.ok(plan.canApply);
  assert.ok(!plan.changes.some(change => change.path === agent));
  assert.ok(plan.changes.some(change => [state, derived].includes(change.path)), 'a fixture deve planejar atualização de estado');
  return { root, agent, metadata, state, derived, plan };
}

test('plano não aplica estado após alteração da referência observada', { timeout: 180000 }, t => {
  const { root, agent, metadata, state, derived, plan } = overlayFixture(t);
  writeFileSync(join(root, agent), `${readFileSync(join(root, agent), 'utf8')}\nAlteração humana posterior ao plano.\n`);
  const paths = [agent, state, derived, metadata, '.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'human.txt'];
  const before = new Map(paths.map(path => [path, readFileSync(join(root, path))]));
  assert.throws(() => applyPlan(plan), error => error.code === 'E_CHANGED', 'a mudança após o plano precisa bloquear a aplicação');
  for (const [path, content] of before) assert.deepEqual(readFileSync(join(root, path)), content, path);
});

test('mudança durante o backup bloqueia publicação do estado', { timeout: 180000 }, t => {
  const { root, agent, metadata, state, derived, plan } = overlayFixture(t);
  const target = join(root, agent), originalWrite = fs.writeFileSync;
  const content = `${readFileSync(target, 'utf8')}\nAlteração humana durante o backup.\n`;
  const paths = [state, derived, metadata, '.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'human.txt'];
  const before = new Map(paths.map(path => [path, readFileSync(join(root, path))]));
  let changed = false, failure;
  t.mock.method(fs, 'writeFileSync', (file, ...args) => {
    if (!changed && typeof file === 'string' && file.includes(`${sep}.agent-tests${sep}agentdevkit${sep}backups${sep}`)) {
      changed = true;
      originalWrite(target, content);
    }
    return originalWrite(file, ...args);
  });
  syncBuiltinESMExports();
  try { applyPlan(plan); } catch (error) { failure = error; }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.ok(changed, 'a fixture precisa chegar ao backup');
  assert.equal(failure?.code, 'E_CHANGED');
  const backup = failure?.uncertainPaths?.find(path => path.includes('.agent-tests/agentdevkit/backups/'));
  assert.ok(backup, 'o erro deve indicar o backup preservado');
  assert.ok(existsSync(join(root, backup)), 'o backup indicado deve existir');
  const backedState = plan.changes.find(change => [state, derived].includes(change.path) && change.beforeHash);
  assert.ok(backedState);
  assert.deepEqual(readFileSync(join(root, backup, backedState.path)), before.get(backedState.path));
  assert.equal(readFileSync(target, 'utf8'), content);
  for (const [path, bytes] of before) assert.deepEqual(readFileSync(join(root, path)), bytes, path);
});
