import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adapters, adapterRoots, availableClients, normalizeClients, resolveAdapters, adapterManifest, writeAdapterManifest } from '../src/adapters/index.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';

const project = fileURLToPath(new URL('..', import.meta.url));
const write = (root, file, text) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), text); };
const read = (root, file) => readFileSync(join(root, file), 'utf8');
function fixture(t, { gitRepository = true } = {}) {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'adapters-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  if (gitRepository) {
    const git = spawnSync('git', ['init', '--quiet', '--template=', root], { encoding: 'utf8' });
    assert.equal(git.error, undefined);
    assert.equal(git.signal, null);
    assert.equal(git.status, 0, git.stderr);
  }
  write(root, '.pbai4devs/skills/projeto/example/SKILL.md', '---\nname: example\ndescription: Exemplo.\n---\n\n# Exemplo\n');
  write(root, '.pbai4devs/commands/projeto/check/COMMAND.md', '---\ndescription: Checagem.\n---\n\n# Checagem\n');
  write(root, '.pbai4devs/rules/projeto/style/RULE.md', '---\ntrigger: always_on\ndescription: Estilo.\n---\n\n# Estilo\n');
  write(root, '.pbai4devs/agents/revisor/AGENT.md', '---\nname: revisor\ndescription: Revisor.\n---\n\n# Revisor\n');
  write(root, '.pbai4devs/agents/revisor/claude.yaml', '---\nname: revisor\ndescription: Revisor.\ntools: Read, Grep\n---\n');
  for (const client of ['antigravity', 'github']) write(root, `.pbai4devs/agents/revisor/${client}.yaml`, '---\nname: revisor\ndescription: Revisor.\n---\n');
  write(root, '.pbai4devs/templates/gitignore/agents.ignore', '/*\n!/.gitignore\n{{ALLOWLIST}}\n');
  write(root, '.pbai4devs/templates/gitignore/shared.ignore', '/tools/.cache/\n');
  write(root, '.pbai4devs/templates/gitignore/clients.json', '{".agents":{"allow":["skills.json","rules.json","agents.json"]}}\n');
  return root;
}

test('sincroniza seleção representativa em projeto sem repositório Git ancestral', t => {
  const root = fixture(t, { gitRepository: false });
  for (let folder = root; ; folder = dirname(folder)) {
    if (existsSync(join(folder, '.git'))) return t.skip('diretório temporário dentro de um repositório');
    if (dirname(folder) === folder) break;
  }
  writeAdapterManifest(root, { clients: 'claude' });
  assert.equal(synchronize({ localIgnores: false, generateEntrypoints: false, root, output() {} }).exitCode, 0);
  assert.ok(existsSync(join(root, '.claude/skills/example/SKILL.md')));
  assert.equal(synchronize({ localIgnores: false, generateEntrypoints: false, root, check: true, output() {} }).exitCode, 0);
});

test('writer e deterministico e nao executa a sincronizacao', t => {
  const root = fixture(t);
  const result = writeAdapterManifest(root);
  assert.deepEqual(result.changed, ['.pbai4devs/espelhos.conf']);
  assert.deepEqual(result.roots, resolveAdapters().roots);
  assert.equal(existsSync(join(root, '.agents')), false);
  const first = read(root, '.pbai4devs/espelhos.conf');
  assert.deepEqual(writeAdapterManifest(root).changed, []);
  assert.equal(read(root, '.pbai4devs/espelhos.conf'), first);
  assert.ok(first.includes('nativo|.claude/agents/revisor.md|'));
  assert.ok(!first.includes('nativo|.zcode/agents/'));
  assert.doesNotMatch(first, /\|\.(?:agent|kimi)(?:[|/]|$)/m);
});

test('clientes recebem grupos e excecoes nativas pesquisadas', t => {
  const root = fixture(t);
  writeAdapterManifest(root);
  assert.equal(synchronize({ localIgnores: false, generateEntrypoints: false, root, output() {} }).exitCode, 0);
  for (const client of ['.agents', '.cursor', '.opencode', '.kimi-code', '.mimocode']) {
    assert.ok(existsSync(join(root, client, 'skills/projeto/example/SKILL.md')), client);
    assert.equal(existsSync(join(root, client, 'skills/example/SKILL.md')), false, client);
  }
  assert.equal(existsSync(join(root, '.codex/skills/projeto/example/SKILL.md')), false);
  assert.ok(existsSync(join(root, '.codex/agents/revisor/AGENT.md')));
  for (const client of ['.claude', '.github', '.zcode', '.minimax', '.dsh']) {
    assert.ok(existsSync(join(root, client, 'skills/example/SKILL.md')), client);
    assert.equal(existsSync(join(root, client, 'skills/projeto/example/SKILL.md')), false, client);
  }
  assert.ok(existsSync(join(root, '.opencode/commands/projeto/check.md')));
  assert.ok(existsSync(join(root, '.claude/commands/projeto/check.md')));
  assert.equal(existsSync(join(root, '.gemini')), false);
  assert.ok(existsSync(join(root, '.cursor/rules/projeto/style.mdc')));
  assert.ok(existsSync(join(root, '.github/instructions/projeto/style.instructions.md')));
  assert.match(read(root, '.claude/agents/revisor.md'), /tools: Read, Grep/);
  assert.deepEqual(JSON.parse(read(root, '.agents/skills.json')).entries, [{ path: '.agents/skills/projeto/example' }]);
  assert.equal(synchronize({ localIgnores: false, generateEntrypoints: false, root, check: true, output() {} }).exitCode, 0);
});

test('regra Git no Cursor usa relevância e mantém bytes do índice da fixture', t => {
  const root = fixture(t);
  const rule = '.pbai4devs/rules/git/RULE.md', metadata = '.pbai4devs/rules/git/cursor.yaml';
  write(root, rule, read(project, rule));
  write(root, metadata, read(project, metadata));
  write(root, 'humano.txt', 'conteúdo preparado\n');
  const git = spawnSync('git', ['-C', root, 'add', 'humano.txt'], { encoding: 'utf8' });
  assert.equal(git.status, 0, git.stderr);
  const index = readFileSync(join(root, '.git/index'));
  writeAdapterManifest(root, { clients: 'cursor' });
  assert.equal(synchronize({ localIgnores: false, generateEntrypoints: false, root, output() {} }).exitCode, 0);
  const source = read(root, rule), generated = read(root, '.cursor/rules/git.mdc');
  assert.match(source, /^trigger: model_decision$/m);
  assert.match(generated, /^description: Regras ao consultar, preparar, integrar ou publicar alterações Git, incluindo índice e autoria\.$/m);
  assert.match(generated, /^alwaysApply: false$/m);
  assert.doesNotMatch(generated, /^globs:/m);
  const link = generated.match(/Leia e siga \[origem\]\(([^)]+)\)\./);
  assert.ok(link);
  assert.equal(resolve(dirname(join(root, '.cursor/rules/git.mdc')), link[1]), join(root, rule));
  assert.match(source, /Autor e committer devem ser o usuário, nunca um agente/);
  assert.match(source, /não adicione coautoria/);
  assert.match(source, /não execute a consulta e informe a limitação/);
  assert.match(source, /Se a identidade do usuário não estiver clara, pergunte/);
  assert.match(source, /Não altere a\s+configuração ou a assinatura criptográfica automaticamente/);
  assert.match(source, /não reescreva\s+autores humanos existentes/);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('revisor OpenCode gerado bloqueia edição, shell e delegação com permissões V2', t => {
  const root = fixture(t);
  const sidecar = '.pbai4devs/agents/revisor/opencode.yaml';
  write(root, sidecar, read(project, sidecar));
  writeAdapterManifest(root, { clients: 'opencode' });
  assert.equal(synchronize({ localIgnores: false, generateEntrypoints: false, root, output() {} }).exitCode, 0);
  const generated = read(root, '.opencode/agents/revisor.md');
  const frontmatter = generated.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(frontmatter, 'o agente gerado precisa de frontmatter');
  assert.match(frontmatter[1], /^mode: subagent$/m);
  assert.match(frontmatter[1], /^permissions:$/m);
  assert.doesNotMatch(frontmatter[1], /^permission:|^\s*bash:/m);
  for (const action of ['edit', 'shell', 'subagent']) {
    assert.match(frontmatter[1], new RegExp(`^  - action: ${action}\\r?\\n    resource: ["']\\*["']\\r?\\n    effect: deny$`, 'm'));
  }
  assert.ok(generated.includes('.pbai4devs/agents/revisor/AGENT.md'));
});

test('implementador Claude declara preload da skill e mantém apontamentos para as fontes', t => {
  const root = fixture(t);
  const agent = '.pbai4devs/agents/implementador/AGENT.md';
  const metadata = '.pbai4devs/agents/implementador/claude.yaml';
  const skill = '.pbai4devs/skills/specs/implementar-spec/SKILL.md';
  for (const file of [agent, metadata, skill]) write(root, file, read(project, file));
  writeAdapterManifest(root, { clients: 'claude' });
  assert.equal(synchronize({ localIgnores: false, generateEntrypoints: false, root, output() {} }).exitCode, 0);
  const generated = read(root, '.claude/agents/implementador.md');
  assert.match(generated, /^skills: \[implementar-spec\]$/m);
  assert.ok(generated.includes(agent));
  const generatedSkill = read(root, '.claude/skills/implementar-spec/SKILL.md');
  assert.ok(generatedSkill.includes(skill));
  for (const wrapper of [generated, generatedSkill]) {
    const body = wrapper.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
      .replace(/^# .+$/m, '').replace(/^<!--.*-->$/gm, '').trim();
    assert.match(body, /^Leia e siga \[origem\]\([^\n]+\)\.$/);
  }
  assert.equal(synchronize({ localIgnores: false, generateEntrypoints: false, root, check: true, output() {} }).exitCode, 0);
});

test('cada excecao de layout tem motivo e fontes oficiais', () => {
  assert.equal(new Set(adapterRoots).size, adapterRoots.length);
  assert.equal(adapters.length, 11);
  for (const adapter of adapters) {
    assert.ok(adapter.name.length > 0);
    assert.ok(adapter.reason.length > 20);
    assert.ok(adapter.sources.length > 0);
    for (const source of adapter.sources) assert.equal(new URL(source).protocol, 'https:');
  }
});

test('clientes disponiveis e aliases derivam da mesma politica', () => {
  assert.deepEqual(availableClients.map(client => client.id), ['all', 'none', ...adapters.map(adapter => adapter.id)]);
  assert.equal(new Set(availableClients.map(client => client.id)).size, availableClients.length);
  for (const client of availableClients) assert.ok(client.name);
  assert.deepEqual(normalizeClients(), ['all']);
  assert.deepEqual(normalizeClients(' ALL '), ['all']);
  assert.deepEqual(normalizeClients(['all', 'ALL']), ['all']);
  assert.deepEqual(normalizeClients('vscode, claude-code, kimi-code, xiaomi'), ['claude', 'copilot', 'kimi', 'mimo']);
  assert.deepEqual(normalizeClients(['CODEX', 'codex, vscode', 'copilot']), ['codex', 'copilot']);
  assert.deepEqual(normalizeClients('ANTIGRAVITY-LEGACY, antigravity, kimi-legacy, kimi-code'), ['antigravity', 'kimi']);
  assert.deepEqual(availableClients.find(client => client.id === 'copilot').aliases, ['vscode']);
});

const selections = [
  ['antigravity', ['.agents'], ['AGENTS.md', 'GEMINI.md']],
  ['antigravity-legacy', ['.agents'], ['AGENTS.md', 'GEMINI.md'], 'antigravity'],
  ['claude', ['.claude'], ['AGENTS.md', 'CLAUDE.md']],
  ['codex', ['.agents', '.codex'], ['AGENTS.md']],
  ['cursor', ['.cursor'], ['AGENTS.md']],
  ['copilot', ['.github', '.vscode'], ['AGENTS.md']],
  ['opencode', ['.opencode'], ['AGENTS.md']],
  ['zcode', ['.zcode'], ['AGENTS.md']],
  ['kimi', ['.kimi-code'], ['AGENTS.md']],
  ['kimi-legacy', ['.kimi-code'], ['AGENTS.md'], 'kimi'],
  ['minimax', ['.minimax'], ['AGENTS.md']],
  ['mimo', ['.mimocode'], ['AGENTS.md']],
  ['deepseek', ['.dsh'], ['AGENTS.md']],
];

test('selecao resolve dependencias, pontos de entrada e fallback all', () => {
  for (const [client, roots, entrypoints, id = client] of selections) {
    const selection = resolveAdapters(client);
    assert.deepEqual(selection.clients, [id]);
    assert.deepEqual(selection.roots, roots, client);
    assert.deepEqual(selection.entrypoints, entrypoints, client);
    const supporting = id === 'codex' ? ['.agents'] : [];
    assert.deepEqual(selection.skillRoots, supporting, client);
    assert.deepEqual(selection.adapters.map(adapter => adapter.root), roots.filter(root => root !== '.vscode' && !supporting.includes(root)));
  }
  assert.deepEqual(adapterRoots.filter(root => !resolveAdapters().roots.includes(root)), ['.agent', '.gemini', '.kimi']);
  assert.deepEqual(resolveAdapters('all').entrypoints, ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']);
  assert.deepEqual(resolveAdapters('none'), { clients: ['none'], adapters: [], roots: [], skillRoots: [], entrypoints: ['AGENTS.md'] });
  assert.deepEqual(resolveAdapters(['codex', 'antigravity', 'vscode']).roots, ['.agents', '.codex', '.github', '.vscode']);
  assert.deepEqual(resolveAdapters(['antigravity', 'claude']).entrypoints, ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']);
});

test('cada selecao filtra todos os tipos de linha e sincroniza somente suas raizes', async t => {
  for (const [client, roots, , id = client] of selections) await t.test(client, t => {
    const root = fixture(t);
    const result = writeAdapterManifest(root, { clients: client });
    assert.deepEqual(result.clients, [id]);
    assert.deepEqual(result.roots, roots);
    const manifest = read(root, '.pbai4devs/espelhos.conf');
    assert.equal(manifest, adapterManifest(root, { clients: client }));
    for (const row of manifest.split('\n').filter(row => row && !row.startsWith('#'))) {
      const [kind, target] = row.split('|');
      assert.ok(['agente', 'formato', 'fallback', 'descoberta', 'nativo', 'gitignore'].includes(kind));
      assert.ok(roots.includes(target.split('/')[0]), `${client}: ${row}`);
    }
    assert.equal(synchronize({ localIgnores: false, generateEntrypoints: false, root, output() {} }).exitCode, 0);
    // A raiz auxiliar .vscode só tinha um ignore gerado; não há recurso a
    // instalar nela nesta fixture, portanto não criamos a pasta vazia.
    const generatedRoots = roots.filter(name => name !== '.vscode');
    assert.deepEqual(readdirSync(root).filter(name => adapterRoots.includes(name)).sort(), [...generatedRoots].sort());
    assert.equal(synchronize({ localIgnores: false, generateEntrypoints: false, root, check: true, output() {} }).exitCode, 0);
    assert.deepEqual(writeAdapterManifest(root, { clients: client }).changed, []);
    assert.equal(manifest.includes('gitignore|.vscode'), client === 'copilot');
  });
});

test('selecao combinada deduplica dependencias e mantem metadados nativos', t => {
  const root = fixture(t);
  const result = writeAdapterManifest(root, { clients: ['vscode', 'codex', 'antigravity', 'claude-code'] });
  assert.deepEqual(result.clients, ['antigravity', 'claude', 'codex', 'copilot']);
  assert.deepEqual(result.roots, ['.agents', '.claude', '.codex', '.github', '.vscode']);
  const manifest = read(root, '.pbai4devs/espelhos.conf');
  assert.equal(manifest.split('\n').filter(row => row === 'agente|.agents|agrupado').length, 1);
  assert.match(manifest, /nativo\|\.claude\/agents\/revisor\.md\|/);
  assert.match(manifest, /nativo\|\.github\/agents\/revisor\.agent\.md\|/);
  assert.match(manifest, /descoberta\|\.agents\|antigravity/);
  assert.doesNotMatch(manifest, /\.gemini/);
  assert.equal(synchronize({ localIgnores: false, generateEntrypoints: false, root, output() {} }).exitCode, 0);
  assert.match(read(root, '.claude/agents/revisor.md'), /tools: Read, Grep/);
  assert.equal(existsSync(join(root, '.vscode/skills')), false);
});

test('mudar selecao preserva arquivos anteriores e nao recria raiz excluida', t => {
  const root = fixture(t);
  writeAdapterManifest(root);
  synchronize({ localIgnores: false, generateEntrypoints: false, root, output() {} });
  const oldReference = read(root, '.claude/skills/example/SKILL.md');
  write(root, '.claude/skills/personal/SKILL.md', 'Meu arquivo.\n');
  write(root, '.claude/settings.json', '{"custom":true}\n');
  write(root, '.vscode/settings.json', '{"custom":true}\n');
  writeAdapterManifest(root, { clients: ['codex'] });
  assert.equal(synchronize({ localIgnores: false, generateEntrypoints: false, root, force: true, output() {} }).exitCode, 0);
  assert.equal(read(root, '.claude/skills/example/SKILL.md'), oldReference);
  assert.equal(read(root, '.claude/skills/personal/SKILL.md'), 'Meu arquivo.\n');
  assert.equal(read(root, '.claude/settings.json'), '{"custom":true}\n');
  assert.equal(read(root, '.vscode/settings.json'), '{"custom":true}\n');
  for (const client of ['.claude', '.vscode']) rmSync(join(root, client), { recursive: true });
  assert.equal(synchronize({ localIgnores: false, generateEntrypoints: false, root, force: true, output() {} }).exitCode, 0);
  assert.equal(existsSync(join(root, '.claude')), false);
  assert.equal(existsSync(join(root, '.vscode')), false);
  assert.equal(synchronize({ localIgnores: false, generateEntrypoints: false, root, check: true, output() {} }).exitCode, 0);
});

test('selecao invalida falha antes de alterar manifesto ou criar pastas', t => {
  const root = fixture(t);
  writeAdapterManifest(root, { clients: 'claude' });
  const original = read(root, '.pbai4devs/espelhos.conf');
  const entries = readdirSync(root);
  for (const clients of [null, {}, [], '', ' ', ',', 'missing', ['all', 'codex'], ['vscode', 'all'], ['claude', 1]]) {
    assert.throws(() => normalizeClients(clients));
    assert.throws(() => writeAdapterManifest(root, { clients }));
    assert.equal(read(root, '.pbai4devs/espelhos.conf'), original);
    assert.deepEqual(readdirSync(root), entries);
  }
});

test('writer recusa symlink e nao toca destino externo', t => {
  const root = fixture(t);
  const outside = join(root, 'outside.conf');
  writeFileSync(outside, 'preserve\n');
  symlinkSync(outside, join(root, '.pbai4devs/espelhos.conf'));
  assert.throws(() => writeAdapterManifest(root), /simbolico/);
  assert.equal(readFileSync(outside, 'utf8'), 'preserve\n');
});
