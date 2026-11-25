import { fixture, cli } from './managed-content-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs, { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { applyPlan, inspect, planInstallation } from '../src/install.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { extractManagedBlock, managedBlockDigest } from '../.pbai4devs/scripts/lib/managed-content.mjs';

test('entradas novas e geradas importam o nome real de agents.md', async t => {
  const { root, put, read } = fixture(t);
  put('agents.md', '# Instrucoes humanas\n');
  await cli(root, ['init', '--agents', 'claude,antigravity']);
  assert.match(read('CLAUDE.md'), /^@agents\.md$/m);
  assert.match(read('GEMINI.md'), /^@\.\/agents\.md$/m);
  fs.renameSync(join(root, 'agents.md'), join(root, 'Agents.md'));
  synchronize({ root, output() {} });
  assert.match(read('CLAUDE.md'), /^@Agents\.md$/m);
  assert.match(read('GEMINI.md'), /^@\.\/Agents\.md$/m);
  assert.deepEqual(inspect(root).issues, []);
  await cli(root, ['sync']);
  await cli(root, ['doctor']);
});

test("managed block preserves staged text and additional edition in the same file", t => {
  const { root, git, put, read } = fixture(t);
  put('AGENTS.md', '# Instruções humanas\n');
  put('.gitignore', '# Ignore humano\n');
  git('add', '--', 'AGENTS.md', '.gitignore');
  const index = readFileSync(join(root, '.git/index'));
  const exclude = readFileSync(join(root, '.git/info/exclude'));
  const human = '# Instruções humanas\n\nEdição humana ainda não preparada.\n';
  put('AGENTS.md', human);
  const plan = planInstallation({ target: root, mode: 'init', clients: ['claude'] });
  const change = plan.changes.find(item => item.path === 'AGENTS.md');
  assert.equal(change?.stagedBlockAllowed, true);
  const expected = Buffer.from(change.content);
  applyPlan(plan);
  assert.deepEqual(readFileSync(join(root, 'AGENTS.md')), expected);
  assert.ok(read('AGENTS.md').startsWith(human));
  assert.match(extractManagedBlock(read('AGENTS.md')), /\.pbai4devs/);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(readFileSync(join(root, '.git/info/exclude')), exclude);
  assert.equal(read('.gitignore'), '# Ignore humano\n');
});

test("sync da CLI incorporates agent sidecars created after installation", { timeout: 120000 }, async t => {
  const { root, git, put, read } = fixture(t);
  put('AGENTS.md', '# Instruções humanas\n');
  put('.gitignore', '# Ignore humano\n');
  git('add', '--', 'AGENTS.md', '.gitignore');
  const index = readFileSync(join(root, '.git/index'));
  const exclude = readFileSync(join(root, '.git/info/exclude'));
  await cli(root, ['init', '--agents', 'claude,copilot', '--yes']);
  const source = '.pbai4devs/agents/curador-notas/AGENT.md';
  const claude = '.claude/agents/curador-notas.md';
  const copilot = '.github/agents/curador-notas.agent.md';
  put(source, '---\nname: curador-notas\ndescription: Analisa notas em modo de leitura.\n---\n\n# Curador de notas\n\nAnalise somente o arquivo solicitado.\n');
  put('.pbai4devs/agents/curador-notas/claude.yaml', '---\nname: curador-notas\ndescription: Analisa notas em modo de leitura.\ntools: Read, Grep\n---\n');
  put('.pbai4devs/agents/curador-notas/github.yaml', '---\nname: curador-notas\ndescription: Analisa notas em modo de leitura.\ntools: [read, search]\n---\n');
  assert.equal(synchronize({ root, output() {} }).exitCode, 0);
  assert.equal(synchronize({ root, check: true, output() {} }).exitCode, 0);
  assert.doesNotMatch(read(claude), /^tools:/m);
  assert.doesNotMatch(read(copilot), /^tools:/m);
  const preview = await cli(root, ['sync', '--dry-run']);
  assert.ok(preview.plan.some(item => item.path === '.pbai4devs/espelhos.conf'));
  await cli(root, ['sync']);
  assert.match(read(claude), /^tools: Read, Grep$/m);
  assert.match(read(copilot), /^tools: \[read, search\]$/m);
  assert.match(read('.pbai4devs/espelhos.conf'), /nativo\|\.claude\/agents\/curador-notas\.md\|/);
  assert.match(read('.pbai4devs/espelhos.conf'), /nativo\|\.github\/agents\/curador-notas\.agent\.md\|/);
  await cli(root, ['sync', '--check']);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(readFileSync(join(root, '.git/info/exclude')), exclude);
  assert.equal(read('.gitignore'), '# Ignore humano\n');
  assert.match(read('AGENTS.md'), /# Instruções humanas/);
});

test('diagnostico deixa de exigir arquivo humano depois de retirar seu bloco', async t => {
  const { root, put } = fixture(t);
  const path = '.claude/skills/local-retire/SKILL.md';
  const source = '.pbai4devs/skills/projeto/local-retire/SKILL.md';
  await cli(root, ['init', '--agents', 'claude']);
  put(source, '---\nname: local-retire\ndescription: Recurso local para retirada.\n---\n\n# Recurso local\n');
  put(path, '# Minha revisao\n');
  await cli(root, ['sync']);
  fs.rmSync(join(root, source));
  synchronize({ root, output() {} });
  const derived = JSON.parse(readFileSync(join(root, '.pbai4devs/state/derived.json'), 'utf8'));
  assert.ok(derived.removedBlocks.includes(path));
  fs.rmSync(join(root, path));
  assert.equal(inspect(root).issues.some(issue => issue.path === path), false);
});

test("Human inputs in original box receive only the block and keep index, CRLF and future changes", async t => {
  const { root, git, put, read } = fixture(t);
  const entries = {
    'agents.md': '\ufeff---\r\ncustom: project\r\n---\r\n\r\n# Regras humanas\r\n\r\nNão altere meu fluxo.',
    'claude.md': '# Meu Claude\r\n\r\nUse minhas ferramentas.\r\n',
    'Gemini.md': '# Meu Gemini\r\n\r\nMantenha minha configuração.\r\n',
  };
  for (const [path, content] of Object.entries(entries)) put(path, content);
  git('add', '--all'); const index = git('ls-files', '--stage', '-z');
  const args = ['init', '--agents', 'claude,antigravity,codex', '--yes'];
  const preview = await cli(root, [...args, '--dry-run']);
  assert.equal(existsSync(join(root, '.pbai4devs')), false);
  assert.ok(preview.plan.some(item => item.path === 'agents.md'));
  await cli(root, args);
  const state = JSON.parse(read('.pbai4devs/state/agentdevkit.json'));
  for (const [path, content] of Object.entries(entries)) {
    assert.ok(read(path).startsWith(content), path);
    assert.equal(state.files[path], undefined);
    assert.equal(state.blocks[path], managedBlockDigest(read(path)));
    assert.equal((read(path).match(/<!-- BEGIN AGENTDEVKIT -->/g) || []).length, 1);
  }
  assert.match(extractManagedBlock(read('claude.md')), /@agents\.md/);
  assert.match(extractManagedBlock(read('Gemini.md')), /@\.\/agents\.md/);
  for (const name of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) assert.ok(!readdirSync(root).includes(name));
  assert.equal(git('ls-files', '--stage', '-z'), index);
  const stable = Object.fromEntries(Object.keys(entries).map(path => [path, read(path)]));
  assert.equal((await cli(root, ['update', '--force'])).changed, false);
  put('agents.md', `${stable['agents.md']}\r\nMinha regra posterior.\r\n`);
  const edited = read('agents.md');
  await cli(root, ['update']); await cli(root, ['doctor']); await cli(root, ['sync', '--check']);
  assert.equal(read('agents.md'), edited);
  assert.equal(git('ls-files', '--stage', '-z'), index);
});

test("Skills, agents, commands and rules of the same name keep metadata and only receive reference", async t => {
  const { root, git, put, read } = fixture(t);
  const paths = {
    '.claude/skills/criar-skill/SKILL.md': '---\nname: criar-skill\ndescription: Minha definição\ncustom: true\n---\n\n# Minha skill\n\nExecute a rotina humana.\n',
    '.claude/agents/revisor.md': '---\nname: revisor\ntools: Read\n---\n\n# Meu revisor\n\nNão altere arquivos.\n',
    '.claude/commands/preparar-dev.md': '# Meu preparo\n\nPrimeiro veja meu README.\n',
    '.claude/commands/diagnosticar.md': '',
    '.cursor/rules/seguranca.mdc': '---\ndescription: Meu controle\nalwaysApply: false\n---\n\n# Minha segurança\n',
  };
  for (const [path, content] of Object.entries(paths)) put(path, content);
  git('add', '--all'); const index = git('ls-files', '--stage', '-z');
  await cli(root, ['init', '--agents', 'claude,cursor', '--yes']);
  const plan = planInstallation({ target: root, mode: 'update' });
  const state = JSON.parse(read('.pbai4devs/state/agentdevkit.json'));
  for (const [path, content] of Object.entries(paths)) {
    assert.ok(read(path).startsWith(content), path);
    assert.match(extractManagedBlock(read(path)), /\.pbai4devs\//);
    assert.equal(state.files[path], undefined, path);
    assert.equal(state.blocks[path], managedBlockDigest(read(path)), path);
    assert.ok(!plan.ownedOutputs.includes(path), path);
    assert.ok(!plan.untrack.paths.includes(path), path);
  }
  await cli(root, ['doctor']); await cli(root, ['sync', '--check']);
  await cli(root, ['agents', 'codex']);
  for (const [path, content] of Object.entries(paths)) {
    assert.ok(read(path).startsWith(content), path);
    assert.equal(extractManagedBlock(read(path)), null, path);
  }
  assert.equal(git('ls-files', '--stage', '-z'), index);
});
