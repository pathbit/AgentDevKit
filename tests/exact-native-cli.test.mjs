import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { spawnSync } from 'node:child_process';
import { planInstallation } from '../src/install.mjs';
import { fixture, put, cli } from './fixtures/client-selection-helpers.mjs';

const target = '.agents/skills/projeto/configurar-projeto/SKILL.md';
const discovery = '.agents/skills.json';
const derived = '.pbai4devs/state/derived.json';
const installed = '.pbai4devs/state/agentdevkit.json';
const bytes = (root, path) => existsSync(join(root, path)) ? readFileSync(join(root, path)) : null;
const git = (root, ...args) => {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); return result.stdout;
};
function setup(t) {
  const donor = fixture(t); cli(donor, ['init', '--agents', 'codex']);
  const reference = bytes(donor, target); assert.ok(reference);
  const root = fixture(t);
  put(root, '.gitignore', '# regra humana\n'); put(root, 'README.md', '# humano\n');
  put(root, 'human.txt', 'staged\n'); put(root, target, reference);
  git(root, 'add', '--', '.gitignore', 'README.md', 'human.txt', target);
  writeFileSync(join(root, 'human.txt'), 'staged\nunstaged\n');
  return { root, reference };
}
function snapshot(root) {
  return Object.fromEntries(['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'README.md', 'human.txt', target].map(path => [path, bytes(root, path)]));
}

test('overlay legítimo do sync direto é aceito pelo check da CLI', { timeout: 180000 }, t => {
  const root = fixture(t), agent = '.claude/agents/implementador.md';
  const metadata = '.pbai4devs/agents/implementador/claude.yaml';
  put(root, '.gitignore', '# humano\n'); put(root, 'human.txt', 'staged\n');
  git(root, 'add', '--', '.gitignore', 'human.txt');
  put(root, 'human.txt', 'staged\nunstaged\n');
  cli(root, ['init', '--agents', 'claude']);
  const original = bytes(root, metadata).toString('utf8');
  assert.match(original, /^tools: Read, Grep, Glob, Bash, Edit, Write$/m);
  put(root, metadata, original.replace('tools: Read, Grep, Glob, Bash, Edit, Write', 'tools: Read, Grep, Glob'));
  const run = (...args) => {
    const result = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--root', root, ...args], { encoding: 'utf8', timeout: 180000 });
    assert.equal(result.status, 0, result.stdout + result.stderr); return result;
  };
  run();
  const base = JSON.parse(bytes(root, installed)), overlay = JSON.parse(bytes(root, derived));
  assert.ok(base.files[agent]); assert.ok(overlay.files[agent]);
  assert.notEqual(base.files[agent], overlay.files[agent]);
  const paths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'human.txt', metadata, agent];
  const before = Object.fromEntries(paths.map(path => [path, bytes(root, path)]));
  run('--check');
  const plan = planInstallation({ target: root, mode: 'sync', language: 'pt' });
  assert.ok(!plan.conflicts.includes(agent));
  assert.ok(!plan.changes.some(change => change.path === agent));
  assert.equal(cli(root, ['sync']).ok, true);
  assert.equal(cli(root, ['sync', '--check']).ok, true); run('--check');
  assert.deepEqual(Object.fromEntries(paths.map(path => [path, bytes(root, path)])), before);
});

test('CLI mantém referência idêntica sem adoção, com descoberta e índice staged', { timeout: 180000 }, t => {
  const { root, reference } = setup(t), before = snapshot(root);
  for (const args of [['init', '--agents', 'antigravity,codex'], ['update'], ['sync'], ['sync', '--check'], ['sync'], ['sync', '--check']]) {
    const result = cli(root, args); assert.equal(result.ok, true, args.join(' '));
    assert.deepEqual(snapshot(root), before); assert.deepEqual(bytes(root, target), reference);
    const entries = JSON.parse(bytes(root, discovery)).entries;
    assert.equal(entries.filter(entry => entry.path === posix.dirname(target)).length, 1);
    for (const path of [installed, derived]) {
      if (!bytes(root, path)) continue;
      const record = JSON.parse(bytes(root, path));
      for (const section of ['files', 'blocks', 'entries', 'outputs', 'catalogs']) assert.equal(Object.hasOwn(record[section] ?? {}, target), false);
    }
  }
});

test('plano mantém diagnóstico específico de referência não Claude já satisfeita', { timeout: 180000 }, t => {
  const { root, reference } = setup(t); cli(root, ['init', '--agents', 'codex']);
  const before = snapshot(root), plan = planInstallation({ target: root, mode: 'sync', language: 'pt' });
  assert.equal(plan.preserved.find(item => item.path === target)?.reason, 'existing-reference-satisfied');
  assert.deepEqual(snapshot(root), before);
  assert.deepEqual(bytes(root, target), reference);
});

test('plano continua classificando arquivo nativo desconhecido como existente', { timeout: 180000 }, t => {
  const { root } = setup(t), extra = '.codex/commands/humano.md'; cli(root, ['init', '--agents', 'codex']);
  put(root, extra, '# Comando humano\n');
  const before = bytes(root, extra), plan = planInstallation({ target: root, mode: 'sync', language: 'pt' });
  assert.equal(plan.preserved.find(item => item.path === extra)?.reason, 'existing-file');
  assert.deepEqual(bytes(root, extra), before);
});

test('CLI não considera equivalentes texto ou metadados humanos diferentes', { timeout: 180000 }, t => {
  for (const variant of ['extra', 'metadata']) {
    const { root, reference } = setup(t);
    const content = variant === 'extra' ? Buffer.concat([reference, Buffer.from('Nota humana.\n')]) : Buffer.from(reference.toString('utf8').replace('description:', 'description: Conteúdo humano '));
    put(root, target, content); git(root, 'add', '--', target); const before = snapshot(root);
    const plan = planInstallation({ target: root, mode: 'init', language: 'pt', clients: ['codex'] });
    assert.notEqual(plan.preserved.find(item => item.path === target)?.reason, 'existing-reference-satisfied');
    assert.deepEqual(snapshot(root), before); assert.deepEqual(bytes(root, target), content);
  }
});

test('CLI preserva índice staged diferente do apontamento presente no disco', { timeout: 180000 }, t => {
  const { root, reference } = setup(t); cli(root, ['init', '--agents', 'antigravity,codex']);
  const staged = 'apontamento staged sintético diferente\n';
  put(root, target, staged); git(root, 'add', '--', target); put(root, target, reference);
  const before = snapshot(root), diff = git(root, 'diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv');
  assert.equal(git(root, 'show', `:${target}`), staged);
  for (const args of [['sync'], ['sync', '--check']]) {
    assert.equal(cli(root, args).ok, true);
    assert.deepEqual(snapshot(root), before); assert.deepEqual(bytes(root, target), reference);
    assert.equal(git(root, 'show', `:${target}`), staged);
    assert.equal(git(root, 'diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv'), diff);
    assert.equal(JSON.parse(bytes(root, discovery)).entries.filter(entry => entry.path === posix.dirname(target)).length, 1);
    for (const path of [installed, derived]) if (bytes(root, path)) {
      const record = JSON.parse(bytes(root, path));
      for (const section of ['files', 'blocks']) assert.equal(Object.hasOwn(record[section] ?? {}, target), false);
    }
  }
});

test('CLI deixa tombstones brutos no caminho legado sem aplicar o plano', { timeout: 180000 }, t => {
  const { root } = setup(t); cli(root, ['init', '--agents', 'codex']);
  const original = bytes(root, derived);
  for (const kind of ['file', 'block']) {
    const record = original ? JSON.parse(original) : { schemaVersion: 1, entries: {} };
    if (kind === 'file') record.removedFiles = { ...record.removedFiles, [target]: 'a'.repeat(64) };
    else record.removedBlocks = [...new Set([...(record.removedBlocks ?? []), target])];
    put(root, derived, `${JSON.stringify(record, null, 2)}\n`);
    const before = snapshot(root), beforeState = bytes(root, derived);
    const plan = planInstallation({ target: root, mode: 'sync', language: 'pt' });
    assert.equal(plan.preserved.find(item => item.path === target)?.reason, 'existing-file-extended');
    assert.equal(plan.changes.find(item => item.path === target)?.action, 'update');
    assert.deepEqual(snapshot(root), before); assert.deepEqual(bytes(root, derived), beforeState);
  }
});
