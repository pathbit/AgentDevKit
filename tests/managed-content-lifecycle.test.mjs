import { fixture, cli } from './managed-content-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { applyPlan, inspect, planInstallation } from '../src/install.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { extractManagedBlock, managedBlockDigest } from '../.pbai4devs/scripts/lib/managed-content.mjs';
import { extractTomlManagedBlock, mergeTomlContent } from '../.pbai4devs/scripts/lib/managed-toml.mjs';

test('edição humana num apontamento previamente gerado migra para ownership de bloco sem desindexar', async t => {
  const { root, git, put, read } = fixture(t);
  await cli(root, ['init', '--agents', 'claude', '--yes']);
  const path = '.claude/agents/revisor.md';
  const original = read(path);
  git('add', '--force', path); const index = git('ls-files', '--stage', '-z');
  const human = `${original}\n# Meu complemento\n\nEsta regra é do usuário.\n`;
  put(path, human);
  if (process.platform !== 'win32') chmodSync(join(root, path), 0o640);
  const mode = statSync(join(root, path)).mode & 0o777;
  const result = await cli(root, ['update']);
  assert.ok(result.changed);
  assert.ok(read(path).startsWith(human));
  assert.equal(git('ls-files', '--stage', '-z'), index);
  assert.equal(statSync(join(root, path)).mode & 0o777, mode);
  const state = JSON.parse(read('.pbai4devs/state/agentdevkit.json'));
  assert.equal(state.files[path], undefined);
  assert.equal(state.blocks[path], managedBlockDigest(read(path)));
  assert.equal((await cli(root, ['update', '--force'])).changed, false);
});

test('retira bloco Gemini staged preservando edição humana posterior e índice', async t => {
  const { root, git, put, read } = fixture(t);
  const path = '.gemini/commands/preparar-dev.toml';
  put(path, '# comentário humano\r\ndescription = "Meu comando"\r\nprompt = "Siga a rotina do usuário."\r\n');
  put('.gitignore', '# Ignore humano\n');
  await cli(root, ['init', '--agents', 'codex', '--yes']);
  const statePath = '.pbai4devs/state/agentdevkit.json';
  const legacy = JSON.parse(read(statePath));
  const managed = mergeTomlContent(read(path), '@{.pbai4devs/commands/preparar-dev/COMMAND.md}\n\n{{args}}');
  put(path, managed.text);
  legacy.clients = ['gemini'];
  legacy.blocks[path] = managed.sha256;
  put(statePath, JSON.stringify(legacy));
  assert.ok(extractTomlManagedBlock(read(path)));
  git('add', '-f', '--', path, '.gitignore');
  const index = readFileSync(join(root, '.git/index'));
  const exclude = readFileSync(join(root, '.git/info/exclude'));
  put(path, `${read(path)}\r\n# Edição humana posterior.\r\n`);
  const plan = planInstallation({ target: root, mode: 'agents', clients: ['codex'] });
  const change = plan.changes.find(item => item.path === path);
  assert.equal(change?.stagedBlockAllowed, true);
  const expected = Buffer.from(change.content);
  applyPlan(plan);
  assert.deepEqual(readFileSync(join(root, path)), expected);
  assert.equal(extractTomlManagedBlock(read(path)), null);
  assert.match(read(path), /Siga a rotina do usuário/);
  assert.match(read(path), /# Edição humana posterior\./);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(readFileSync(join(root, '.git/info/exclude')), exclude);
  assert.equal(read('.gitignore'), '# Ignore humano\n');
});

test('referência derivada editada é preservada e bloqueia sync direto e CLI, inclusive force', async t => {
  const { root, git, put, read } = fixture(t);
  put('.gitignore', '# Ignore humano\n');
  put('humano.txt', 'Preparado no índice.\n');
  git('add', '--', 'humano.txt', '.gitignore');
  put('humano.txt', 'Preparado no índice.\nAlteração local.\n');
  await cli(root, ['init', '--agents', 'claude', '--yes']);
  const source = '.pbai4devs/skills/projeto/local-only/SKILL.md';
  put(source, '---\nname: local-only\ndescription: Recurso local para a verificação.\n---\n\n# Recurso local\n\nSiga esta rotina.\n');
  assert.equal(synchronize({ root, output() {} }).exitCode, 0);
  const path = '.claude/skills/local-only/SKILL.md';
  const human = `${read(path)}\n# Política humana\n\nNão remova este texto.\n`;
  put(path, human);
  const protectedPaths = [path, source, 'humano.txt', '.gitignore', '.git/index', '.git/config', '.git/info/exclude', '.pbai4devs/espelhos.conf', '.pbai4devs/state/agentdevkit.json', '.pbai4devs/state/derived.json'];
  const before = new Map(protectedPaths.map(name => [name, readFileSync(join(root, name))]));
  const unchanged = () => { for (const [name, bytes] of before) assert.deepEqual(readFileSync(join(root, name)), bytes, name); };
  const check = synchronize({ root, check: true, output() {} });
  assert.equal(check.exitCode, 1);
  assert.ok(check.conflictPaths.includes(path));
  assert.ok(check.preserved.some(item => item.path === path && item.reason === 'derived-reference-diverged'));
  unchanged();
  for (const force of [false, true]) {
    assert.throws(() => synchronize({ root, force, output() {} }), /Conteudo proprio preservado; resolva a colisao/);
    unchanged();
    const result = await cli(root, ['sync', ...(force ? ['--force'] : [])], 1);
    assert.ok(result.conflicts?.includes(path));
    assert.ok(result.preserved?.some(item => item.path === path && item.reason === 'edited-managed-file'));
    unchanged();
  }
  assert.equal(read(path), human);
  assert.equal(extractManagedBlock(read(path)), null);
});

test('sync direto adiciona e retira bloco de arquivo humano após a CLI reconciliar o estado', async t => {
  const { root, put, read } = fixture(t);
  await cli(root, ['init', '--agents', 'claude', '--yes']);
  const source = '.pbai4devs/skills/projeto/local-only/SKILL.md';
  const path = '.claude/skills/local-only/SKILL.md';
  const human = '# Política humana\n\nNão remova este texto.\n';
  put(source, '---\nname: local-only\ndescription: Recurso local para a verificação.\n---\n\n# Recurso local\n\nSiga esta rotina.\n');
  put(path, human);
  assert.equal(synchronize({ root, output() {} }).exitCode, 0);
  const block = '<!-- BEGIN AGENTDEVKIT -->\nLeia e siga [origem](../../../.pbai4devs/skills/projeto/local-only/SKILL.md).\n<!-- END AGENTDEVKIT -->';
  assert.equal(read(path), `${human}\n${block}\n`);
  assert.equal(extractManagedBlock(read(path)), block);
  await cli(root, ['sync']);
  rmSync(join(root, source));
  assert.equal(synchronize({ root, output() {} }).exitCode, 0);
  assert.equal(extractManagedBlock(read(path)), null);
  const restored = read(path);
  assert.ok(restored.startsWith(human));
  assert.match(restored.slice(human.length), /^\n*$/);
  assert.ok(!inspect(root).issues.some(issue => issue.path === path));
  await cli(root, ['sync']);
  assert.equal(read(path), restored);
  assert.equal(extractManagedBlock(read(path)), null);
});

for (const mode of ['sync', 'deselect']) test(`recriação própria após remoção de arquivo misto substitui ownership antigo de bloco: ${mode}`, async t => {
  const { root, put, read } = fixture(t);
  const native = '.claude/agents/revisor.md';
  put('AGENTS.md', '# Meu projeto anterior\n'); put(native, '# Meu revisor anterior\n');
  await cli(root, ['init', '--agents', 'claude', '--yes']);
  rmSync(join(root, 'AGENTS.md')); rmSync(join(root, native));
  assert.equal(synchronize({ root, output() {} }).exitCode, 0);
  assert.deepEqual(inspect(root).issues, []);
  const check = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/verificar-recursos/SCRIPT.mjs')], { encoding: 'utf8', timeout: 180000 });
  assert.equal(check.status, 0, `verificar-recursos: ${check.error?.stack || ''}\nsignal: ${check.signal || 'none'}\n${check.stdout || ''}${check.stderr || ''}`);
  const plan = planInstallation({ target: root, mode: mode === 'sync' ? 'sync' : 'agents', ...(mode === 'deselect' ? { clients: ['codex'] } : {}) });
  assert.equal(plan.canApply, true, JSON.stringify(plan.conflicts));
  const retained = mode === 'deselect' ? read('.claude/rules/seguranca/RULE.md') : null;
  const operation = await cli(root, mode === 'sync' ? ['sync'] : ['agents', 'codex']);
  if (mode === 'deselect') {
    assert.equal(read('.claude/rules/seguranca/RULE.md'), retained);
    assert.ok(operation.retainedClaudeRules.includes('.claude/rules/seguranca/RULE.md'));
    const diagnosis = await cli(root, ['doctor'], 1);
    assert.ok(diagnosis.retainedClaudeRules.includes('.claude/rules/seguranca/RULE.md'));
    const check = await cli(root, ['sync', '--check'], 1);
    assert.ok(check.retainedClaudeRules.includes('.claude/rules/seguranca/RULE.md'));
  } else await cli(root, ['doctor']);
  const state = JSON.parse(read('.pbai4devs/state/agentdevkit.json'));
  for (const path of mode === 'sync' ? ['AGENTS.md', native] : ['AGENTS.md']) { assert.ok(state.files[path]); assert.equal(state.blocks[path], undefined); }
  if (mode === 'deselect') assert.equal(existsSync(join(root, native)), false);
});
