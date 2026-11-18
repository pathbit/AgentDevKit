import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { applyPlan, planInstallation } from '../src/install.mjs';
import { cli, fixture, put } from './fixtures/client-selection-helpers.mjs';

const timeout = 180000;
const cliEntry = resolve(dirname(fileURLToPath(import.meta.url)), '../bin/agentdevkit.mjs');
const state = '.pbai4devs/state/agentdevkit.json';
const derived = '.pbai4devs/state/derived.json';
const gitPaths = ['.git/index', '.git/config', '.git/info/exclude'];
const digest = text => createHash('sha256').update(text).digest('hex');

function add(root, ...paths) {
  const result = spawnSync('git', ['-C', root, 'add', '--', ...paths], { encoding: 'utf8' });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
}

function syncDirect(root, ...args) {
  return spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--root', root, ...args], {
    cwd: root, encoding: 'utf8', timeout,
  });
}

// Byte snapshots cover only the explicitly listed paths, not the whole tree or refs.
function snapshot(root, paths) {
  return new Map(paths.map(path => [path, readFileSync(join(root, path))]));
}

function assertUnchanged(root, before, skip = () => false) {
  for (const [path, bytes] of before) {
    if (!skip(path)) assert.deepEqual(readFileSync(join(root, path)), bytes, path);
  }
}

function stagedHuman(root) {
  put(root, '.gitignore', '# regra humana\n');
  put(root, 'human.txt', 'staged\n');
  add(root, '.gitignore', 'human.txt');
  put(root, 'human.txt', 'staged\nunstaged\n');
}

for (const [name, target] of [
  ['overlay não selecionado', '.codex/agents/sentinela.md'],
  ['legado fora do catálogo', '.claude/agents/sentinela.md'],
]) {
  test(`${name} não gera boundary nem dependência específica`, { timeout }, t => {
    const root = fixture(t);
    put(root, 'humano.txt', 'staged\n');
    add(root, 'humano.txt');
    cli(root, ['init', '--agents', 'claude']);

    const body = '# Agente de outra equipe\n\nPreserve este conteúdo.\n';
    put(root, target, body);
    const installed = JSON.parse(readFileSync(join(root, state), 'utf8'));
    installed.files[target] = 'a'.repeat(64);
    put(root, state, JSON.stringify(installed, null, 2) + '\n');
    let overlay;
    try { overlay = JSON.parse(readFileSync(join(root, derived), 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      overlay = { schemaVersion: 1, entries: {} };
    }
    overlay.files = { ...overlay.files, [target]: digest(body) };
    put(root, derived, JSON.stringify(overlay, null, 2) + '\n');

    const before = snapshot(root, [target, state, derived, ...gitPaths]);
    const plan = planInstallation({ target: root, mode: 'sync', language: 'pt' });
    assert.equal(plan.stageDependencies.some(item => item.path === target), false);
    assert.equal(plan.fallbackChecks.some(([path]) => path === target), false);
    assertUnchanged(root, before);
  });
}

for (const altered of ['state', 'derived']) {
  test(`estado de stage alterado bloqueia antes de escrever: ${altered}`, { timeout }, t => {
    const root = fixture(t);
    const agent = '.claude/agents/implementador.md';
    const metadata = '.pbai4devs/agents/implementador/claude.yaml';
    stagedHuman(root);
    cli(root, ['init', '--agents', 'claude']);
    const original = readFileSync(join(root, metadata), 'utf8');
    assert.match(original, /^tools: Read, Grep, Glob, Bash, Edit, Write$/m);
    put(root, metadata, original.replace('tools: Read, Grep, Glob, Bash, Edit, Write', 'tools: Read, Grep, Glob'));
    const direct = syncDirect(root);
    assert.equal(direct.error, undefined);
    assert.equal(direct.signal, null);
    assert.equal(direct.status, 0, direct.stdout + direct.stderr);
    const installed = JSON.parse(readFileSync(join(root, state), 'utf8'));
    const overlay = JSON.parse(readFileSync(join(root, derived), 'utf8'));
    assert.ok(installed.files[agent]);
    assert.ok(overlay.files[agent]);
    assert.notEqual(installed.files[agent], overlay.files[agent]);

    const plan = planInstallation({ target: root, mode: 'sync', language: 'pt' });
    assert.ok(plan.canApply);
    // Positive control: the selected, catalogued destination produces both observations.
    assert.ok(plan.stageDependencies.some(item => item.path === agent && item.expectedHash === digest(readFileSync(join(root, agent)))));
    assert.ok(plan.fallbackChecks.some(([path, result]) => path === agent && result.blocked === false));
    assert.ok(!plan.changes.some(change => change.path === agent));
    assert.ok(plan.changes.some(change => [state, derived].includes(change.path)), 'a fixture deve planejar atualização de estado');
    const changedPath = altered === 'state' ? state : derived;
    const changed = JSON.parse(readFileSync(join(root, changedPath), 'utf8'));
    changed.notaHumana = 'adicionada após planejamento';
    writeFileSync(join(root, changedPath), JSON.stringify(changed, null, 2) + '\n');
    const before = snapshot(root, [agent, state, derived, metadata, ...gitPaths, '.gitignore', 'human.txt']);
    assert.throws(() => applyPlan(plan), error => error.code === 'E_CHANGED' && error.message.includes('Stage input changed after planning'), 'a mudança após o plano precisa bloquear a aplicação');
    assertUnchanged(root, before);
  });
}

for (const variant of ['valid', 'missing', 'wrong-digest']) {
  test(`CLI preserva referência com bloco ${variant}`, { timeout }, t => {
    const root = fixture(t);
    const source = '.pbai4devs/skills/projeto/sintetica/SKILL.md';
    const target = '.agents/skills/projeto/sintetica/SKILL.md';
    put(root, '.gitignore', '# humano\n');
    put(root, 'human.txt', 'staged\n');
    add(root, '.gitignore', 'human.txt');
    cli(root, ['init', '--agents', 'codex']);
    put(root, source, '---\nname: sintetica\ndescription: Exemplo.\n---\n\n# Sintética\n');
    const direct = syncDirect(root);
    assert.equal(direct.error, undefined);
    assert.equal(direct.signal, null);
    assert.equal(direct.status, 0, direct.stderr);
    const overlay = JSON.parse(readFileSync(join(root, derived), 'utf8'));
    const original = readFileSync(join(root, target), 'utf8');
    assert.ok(overlay.files[target]);
    const reference = original.split('\n').find(line => line.startsWith('Leia e siga [origem]('));
    assert.ok(reference);
    const block = `<!-- BEGIN AGENTDEVKIT -->\n${reference}\n<!-- END AGENTDEVKIT -->`;
    const body = variant === 'missing' ? original + '\nNota humana.\n' : original.replace(reference, 'Nota humana.') + '\n' + block + '\n';
    put(root, target, body);
    overlay.blocks = { ...(overlay.blocks || {}), [target]: variant === 'valid' ? digest(block) : 'a'.repeat(64) };
    put(root, derived, JSON.stringify(overlay, null, 2) + '\n');
    const before = snapshot(root, [target, source, derived, ...gitPaths, '.gitignore', 'human.txt']);

    const result = spawnSync(process.execPath, [cliEntry, 'sync', '--force', '--target', root, '--json'], {
      cwd: root, encoding: 'utf8', timeout, maxBuffer: 8e6,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    const json = JSON.parse(result.stdout);
    assert.equal(json.command, 'sync');
    assert.equal(realpathSync(json.target), realpathSync(root));
    console.log('block_outcome=' + JSON.stringify({ variant, status: result.status, ok: json.ok, conflicts: json.conflicts }));
    if (variant === 'valid') {
      assert.equal(result.status, 0);
      assert.equal(json.ok, true);
      assert.ok(!json.conflicts?.includes(target));
    } else if (variant === 'missing') {
      assert.equal(result.status, 1);
      assert.equal(json.ok, false);
      assert.ok(json.conflicts?.includes(target), 'o conflito deve identificar o destino');
    } else {
      assert.equal(result.status, 1);
      assert.equal(json.ok, false);
      // The CLI currently reports the primary code, but no structured target here.
      assert.equal(json.error?.code, 'E_MANAGED_BLOCK');
    }
    assertUnchanged(root, before, path => path === derived && variant === 'valid' && result.status === 0);
  });
}

// Run this file in its own Node test process: this case temporarily changes TMPDIR/TMP/TEMP.
test('falha da prévia mantém diagnóstico de stage e não altera projeto', { timeout, concurrency: false }, t => {
  const root = fixture(t);
  const agent = '.claude/agents/implementador.md';
  const metadata = '.pbai4devs/agents/implementador/claude.yaml';
  put(root, '.gitignore', '# humano\n');
  put(root, 'human.txt', 'staged\n');
  add(root, '.gitignore', 'human.txt');
  cli(root, ['init', '--agents', 'claude']);
  const original = readFileSync(join(root, metadata), 'utf8');
  assert.match(original, /^tools: Read, Grep, Glob, Bash, Edit, Write$/m);
  const changedMetadata = original.replace('tools: Read, Grep, Glob, Bash, Edit, Write', 'tools: Read, Grep, Glob');
  assert.notEqual(changedMetadata, original);
  put(root, metadata, changedMetadata);
  const direct = syncDirect(root);
  assert.equal(direct.error, undefined);
  assert.equal(direct.signal, null);
  assert.equal(direct.status, 0, direct.stderr);
  const installed = JSON.parse(readFileSync(join(root, state), 'utf8'));
  const overlay = JSON.parse(readFileSync(join(root, derived), 'utf8'));
  assert.ok(installed.files[agent]);
  assert.ok(overlay.files[agent]);
  assert.notEqual(installed.files[agent], overlay.files[agent]);
  put(root, metadata, '---\nname: implementador\n');
  const before = snapshot(root, [agent, metadata, state, derived, ...gitPaths, '.gitignore', 'human.txt']);

  const scratch = mkdtempSync(join(tmpdir(), 'adk-preview-proof-'));
  const saved = Object.fromEntries(['TMPDIR', 'TMP', 'TEMP'].map(key => [key, process.env[key]]));
  for (const key of Object.keys(saved)) process.env[key] = scratch;
  t.after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(scratch, { recursive: true, force: true });
  });
  // The scratch directory was newly created and belongs only to this test.
  const listScratch = () => readdirSync(scratch).sort();
  const stages = listScratch();
  assert.deepEqual(stages, []);
  let caught;
  try { planInstallation({ target: root, mode: 'sync', language: 'pt' }); }
  catch (error) { caught = error; }
  assert.ok(caught, 'a prévia deve rejeitar YAML inválido');
  assert.equal(caught.diagnosticsScope, 'staging');
  assert.equal(caught.message, 'Frontmatter YAML sem fechamento.');
  assert.deepEqual(listScratch(), stages);
  assertUnchanged(root, before);
});
