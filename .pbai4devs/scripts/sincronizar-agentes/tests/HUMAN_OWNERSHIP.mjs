import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { projectRoot } from '../../lib/runtime.mjs';
import { isReference, synchronize } from '../SCRIPT.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const source = '.pbai4devs/skills/demo/SKILL.md';
const generated = '.claude/skills/demo/SKILL.md';
const human = '# Título\n\nLeia [manual](https://example.com/manual).\n';
function write(root, path, data) { fs.mkdirSync(dirname(join(root, path)), { recursive: true }); fs.writeFileSync(join(root, path), data); }
function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'agentdevkit-ownership-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  write(root, source, '---\nname: demo\ndescription: Exemplo.\n---\n\n# Demo\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) write(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(join(projectRoot, '.pbai4devs/templates/gitignore', name)));
  const initialized = spawnSync('git', ['-C', root, 'init', '-q'], { encoding: 'utf8' });
  assert.equal(initialized.status, 0, initialized.stderr);
  return root;
}
const run = (root, options = {}) => synchronize({ root, generateEntrypoints: false, localIgnores: false, output() {}, ...options });
function snapshot(root) {
  const files = {};
  function visit(path, prefix = '') {
    for (const entry of fs.readdirSync(path, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const next = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) { files[next] = 'directory'; visit(join(path, entry.name), next); }
      else files[next] = hash(fs.readFileSync(join(path, entry.name)));
    }
  }
  visit(root); return files;
}

test('texto humano com formato de referência nunca comprova propriedade', t => {
  for (const path of [generated, '.claude/skills/human.md']) {
    const root = fixture(t); write(root, path, human);
    const before = snapshot(root);
    assert.equal(isReference(human), true, 'O parser de formato continua independente da propriedade.');
    assert.equal(run(root, { check: true }).exitCode, 1);
    const result = run(root);
    assert.ok(result.preserved.some(item => item.path === path));
    assert.ok(!result.ownedOutputs.includes(path));
    if (path === generated) {
      assert.ok(fs.readFileSync(join(root, path), 'utf8').startsWith(human));
      assert.match(fs.readFileSync(join(root, path), 'utf8'), /<!-- BEGIN AGENTDEVKIT -->/);
    } else {
      assert.equal(fs.readFileSync(join(root, path), 'utf8'), human);
      assert.equal(snapshot(root)[path], before[path]);
    }
    assert.equal(run(root, { check: true }).exitCode, 0);
    const stable = snapshot(root);
    run(root, { force: true });
    assert.deepEqual(snapshot(root), stable);
  }
});

test('hash registrado comprova referência legada sem marcador e diretório vazio humano permanece', t => {
  const root = fixture(t), stale = '.claude/skills/legacy.md';
  write(root, stale, human);
  write(root, '.pbai4devs/estado/agentdevkit.json', JSON.stringify({ schemaVersion: 1, clients: ['claude'], files: { [stale]: hash(human) }, blocks: {} }));
  fs.mkdirSync(join(root, '.claude/skills/user-empty'), { recursive: true });
  run(root);
  assert.equal(fs.existsSync(join(root, stale)), false);
  assert.equal(fs.existsSync(join(root, '.claude/skills/user-empty')), true);
  assert.equal(run(root, { check: true }).exitCode, 0);
});

test('conflito de ignore é recusado antes de criar recursos ou catálogos', t => {
  const root = fixture(t); write(root, '.gitignore', '!/.agent-tests/\n!/.agent-tests/**\n');
  const before = snapshot(root), exclude = fs.readFileSync(join(root, '.git/info/exclude'));
  assert.throws(() => run(root, { localIgnores: true, force: true }), /Regras humanas/);
  assert.deepEqual(snapshot(root), before);
  assert.deepEqual(fs.readFileSync(join(root, '.git/info/exclude')), exclude);
  assert.equal(fs.existsSync(join(root, generated)), false);
  assert.equal(fs.existsSync(join(root, '.pbai4devs/catalog.json')), false);
});

test('atualização de referência própria conserva permissões', t => {
  const root = fixture(t); run(root);
  fs.chmodSync(join(root, generated), 0o600);
  const mode = fs.statSync(join(root, generated)).mode & 0o777;
  write(root, source, '---\nname: demo\ndescription: Atualizado.\n---\n\n# Demo\n');
  run(root);
  assert.equal(fs.statSync(join(root, generated)).mode & 0o777, mode);
});

test('mudança concorrente de ignore após gravação reverte recursos e preserva a regra humana', t => {
  const root = fixture(t); run(root);
  write(root, source, '---\nname: demo\ndescription: Atualizado.\n---\n\n# Demo\n');
  const before = snapshot(root), rename = fs.renameSync;
  let injected = false;
  t.mock.method(fs, 'renameSync', (from, to) => {
    rename(from, to);
    if (!injected && to === join(root, generated)) { injected = true; write(root, '.git/info/exclude', '# concurrent human change\n'); }
  });
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  assert.throws(() => run(root, { localIgnores: true }), /Exclusao alterada apos planejar/);
  assert.equal(injected, true);
  assert.deepEqual(snapshot(root), before);
  assert.equal(fs.readFileSync(join(root, '.git/info/exclude'), 'utf8'), '# concurrent human change\n');
});

test('conteúdo humano concorrente não é apagado durante rollback', t => {
  const root = fixture(t), rename = fs.renameSync;
  let injected = false;
  t.mock.method(fs, 'renameSync', (from, to) => {
    rename(from, to);
    if (!injected && to === join(root, generated)) { injected = true; write(root, generated, human); }
  });
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  assert.throws(() => run(root), /Mudanca concorrente preservada/);
  assert.equal(injected, true);
  assert.equal(fs.readFileSync(join(root, generated), 'utf8'), human);
});

test('conteúdo humano é preservado quando a escrita lança erro após promover o arquivo', t => {
  const root = fixture(t), rename = fs.renameSync;
  const failure = new Error('falha depois de promover');
  let injected = false;
  t.mock.method(fs, 'renameSync', (from, to) => {
    rename(from, to);
    if (!injected && to === join(root, generated)) { injected = true; write(root, generated, human); throw failure; }
  });
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  assert.throws(() => run(root), error => error instanceof AggregateError && error.errors.includes(failure));
  assert.equal(injected, true);
  assert.equal(fs.readFileSync(join(root, generated), 'utf8'), human);
});

test('rollback recria ancestral podado com suas permissões originais', { skip: process.platform === 'win32' }, t => {
  const root = fixture(t); run(root);
  const parent = join(root, '.claude/skills'); fs.chmodSync(parent, 0o700);
  fs.rmSync(join(root, '.pbai4devs/skills/demo'), { recursive: true });
  const before = snapshot(root), rename = fs.renameSync;
  let injected = false;
  t.mock.method(fs, 'renameSync', (from, to) => {
    rename(from, to);
    if (!injected && to === join(root, '.pbai4devs/catalog.json')) { injected = true; write(root, '.git/info/exclude', '# concurrent human change\n'); }
  });
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  assert.throws(() => run(root, { localIgnores: true }), /Exclusao alterada apos planejar/);
  assert.equal(injected, true);
  assert.deepEqual(snapshot(root), before);
  assert.equal(fs.statSync(parent).mode & 0o777, 0o700);
});
