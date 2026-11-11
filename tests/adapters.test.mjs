import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adapters, adapterRoots, availableClients, normalizeClients, resolveAdapters, adapterManifest, writeAdapterManifest } from '../src/adapters/index.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';

const project = fileURLToPath(new URL('..', import.meta.url));
const write = (root, file, text) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), text); };
const read = (root, file) => readFileSync(join(root, file), 'utf8');
function fixture(t) {
  mkdirSync(join(project, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(project, '.agent-tests/adapters-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  write(root, '.pbai4devs/skills/projeto/example/SKILL.md', '---\nname: example\ndescription: Exemplo.\n---\n\n# Exemplo\n');
  write(root, '.pbai4devs/commands/projeto/check/COMMAND.md', '---\ndescription: Checagem.\n---\n\n# Checagem\n');
  write(root, '.pbai4devs/rules/projeto/style/RULE.md', '---\ntrigger: always_on\ndescription: Estilo.\n---\n\n# Estilo\n');
  write(root, '.pbai4devs/agents/revisor/AGENT.md', '---\nname: revisor\ndescription: Revisor.\n---\n\n# Revisor\n');
  write(root, '.pbai4devs/agents/revisor/claude.yaml', '---\nname: revisor\ndescription: Revisor.\ntools: Read, Grep\n---\n');
  for (const client of ['antigravity', 'github', 'gemini']) write(root, `.pbai4devs/agents/revisor/${client}.yaml`, '---\nname: revisor\ndescription: Revisor.\n---\n');
  write(root, '.pbai4devs/templates/gitignore/agents.ignore', '/*\n!/.gitignore\n{{ALLOWLIST}}\n');
  write(root, '.pbai4devs/templates/gitignore/shared.ignore', '/tools/.cache/\n');
  write(root, '.pbai4devs/templates/gitignore/clients.json', '{".agents":{"allow":["skills.json","rules.json","agents.json"]}}\n');
  return root;
}

test('writer e deterministico e nao executa a sincronizacao', t => {
  const root = fixture(t);
  const result = writeAdapterManifest(root);
  assert.deepEqual(result.changed, ['.pbai4devs/espelhos.conf']);
  assert.deepEqual(result.roots, adapterRoots);
  assert.equal(existsSync(join(root, '.agents')), false);
  const first = read(root, '.pbai4devs/espelhos.conf');
  assert.deepEqual(writeAdapterManifest(root).changed, []);
  assert.equal(read(root, '.pbai4devs/espelhos.conf'), first);
  assert.ok(first.includes('nativo|.claude/agents/revisor.md|'));
  assert.ok(!first.includes('nativo|.zcode/agents/'));
});

test('clientes recebem grupos e excecoes nativas pesquisadas', t => {
  const root = fixture(t);
  writeAdapterManifest(root);
  assert.equal(synchronize({ root, output() {} }).exitCode, 0);
  for (const client of ['.agents', '.codex', '.cursor', '.opencode', '.kimi-code', '.mimocode']) {
    assert.ok(existsSync(join(root, client, 'skills/projeto/example/SKILL.md')), client);
    assert.equal(existsSync(join(root, client, 'skills/example/SKILL.md')), false, client);
  }
  for (const client of ['.claude', '.github', '.gemini', '.zcode', '.minimax', '.dsh']) {
    assert.ok(existsSync(join(root, client, 'skills/example/SKILL.md')), client);
    assert.equal(existsSync(join(root, client, 'skills/projeto/example/SKILL.md')), false, client);
  }
  assert.ok(existsSync(join(root, '.opencode/commands/projeto/check.md')));
  assert.ok(existsSync(join(root, '.claude/commands/projeto/check.md')));
  assert.ok(existsSync(join(root, '.gemini/commands/projeto/check.toml')));
  assert.ok(existsSync(join(root, '.cursor/rules/projeto/style.mdc')));
  assert.ok(existsSync(join(root, '.github/instructions/projeto/style.instructions.md')));
  assert.match(read(root, '.claude/agents/revisor.md'), /tools: Read, Grep/);
  assert.deepEqual(JSON.parse(read(root, '.agents/skills.json')).entries, [{ path: '.agents/skills/projeto/example' }]);
  assert.equal(synchronize({ root, check: true, output() {} }).exitCode, 0);
});

test('cada excecao de layout tem motivo e fontes oficiais', () => {
  assert.equal(new Set(adapterRoots).size, adapterRoots.length);
  assert.equal(adapters.length, 14);
  for (const adapter of adapters) {
    assert.ok(adapter.name.length > 0);
    assert.ok(adapter.reason.length > 20);
    assert.ok(adapter.sources.length > 0);
    for (const source of adapter.sources) assert.equal(new URL(source).protocol, 'https:');
  }
});

test('clientes disponiveis e aliases derivam da mesma politica', () => {
  assert.deepEqual(availableClients.map(client => client.id), ['all', ...adapters.map(adapter => adapter.id)]);
  assert.equal(new Set(availableClients.map(client => client.id)).size, availableClients.length);
  for (const client of availableClients) assert.ok(client.name);
  assert.deepEqual(normalizeClients(), ['all']);
  assert.deepEqual(normalizeClients(' ALL '), ['all']);
  assert.deepEqual(normalizeClients(['all', 'ALL']), ['all']);
  assert.deepEqual(normalizeClients('vscode, claude-code, kimi-code, xiaomi'), ['claude', 'copilot', 'kimi', 'mimo']);
  assert.deepEqual(normalizeClients(['CODEX', 'codex, vscode', 'copilot']), ['codex', 'copilot']);
  assert.deepEqual(availableClients.find(client => client.id === 'copilot').aliases, ['vscode']);
});

const selections = [
  ['antigravity', ['.agents'], ['AGENTS.md', 'GEMINI.md']],
  ['antigravity-legacy', ['.agents', '.agent'], ['AGENTS.md', 'GEMINI.md']],
  ['claude', ['.claude'], ['AGENTS.md', 'CLAUDE.md']],
  ['codex', ['.agents', '.codex'], ['AGENTS.md']],
  ['cursor', ['.cursor'], ['AGENTS.md']],
  ['copilot', ['.github', '.vscode'], ['AGENTS.md']],
  ['opencode', ['.opencode'], ['AGENTS.md']],
  ['gemini', ['.gemini'], ['AGENTS.md', 'GEMINI.md']],
  ['zcode', ['.zcode'], ['AGENTS.md']],
  ['kimi', ['.kimi-code'], ['AGENTS.md']],
  ['kimi-legacy', ['.kimi'], ['AGENTS.md']],
  ['minimax', ['.minimax'], ['AGENTS.md']],
  ['mimo', ['.mimocode'], ['AGENTS.md']],
  ['deepseek', ['.dsh'], ['AGENTS.md']],
];

test('selecao resolve dependencias, pontos de entrada e fallback all', () => {
  for (const [client, roots, entrypoints] of selections) {
    const selection = resolveAdapters(client);
    assert.deepEqual(selection.clients, [client]);
    assert.deepEqual(selection.roots, roots, client);
    assert.deepEqual(selection.entrypoints, entrypoints, client);
    assert.deepEqual(selection.adapters.map(adapter => adapter.root), roots.filter(root => root !== '.vscode'));
  }
  assert.deepEqual(resolveAdapters().roots, adapterRoots);
  assert.deepEqual(resolveAdapters('all').entrypoints, ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']);
  assert.deepEqual(resolveAdapters(['codex', 'antigravity', 'vscode']).roots, ['.agents', '.codex', '.github', '.vscode']);
  assert.deepEqual(resolveAdapters(['gemini', 'claude']).entrypoints, ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']);
});

test('cada selecao filtra todos os tipos de linha e sincroniza somente suas raizes', async t => {
  for (const [client, roots] of selections) await t.test(client, t => {
    const root = fixture(t);
    const result = writeAdapterManifest(root, { clients: client });
    assert.deepEqual(result.clients, [client]);
    assert.deepEqual(result.roots, roots);
    const manifest = read(root, '.pbai4devs/espelhos.conf');
    assert.equal(manifest, adapterManifest(root, { clients: client }));
    for (const row of manifest.split('\n').filter(row => row && !row.startsWith('#'))) {
      const [kind, target] = row.split('|');
      assert.ok(['agente', 'formato', 'descoberta', 'nativo', 'gitignore'].includes(kind));
      assert.ok(roots.includes(target.split('/')[0]), `${client}: ${row}`);
    }
    assert.equal(synchronize({ root, output() {} }).exitCode, 0);
    assert.deepEqual(readdirSync(root).filter(name => adapterRoots.includes(name)).sort(), [...roots].sort());
    assert.equal(synchronize({ root, check: true, output() {} }).exitCode, 0);
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
  assert.equal(synchronize({ root, output() {} }).exitCode, 0);
  assert.match(read(root, '.claude/agents/revisor.md'), /tools: Read, Grep/);
  assert.equal(existsSync(join(root, '.vscode/skills')), false);
});

test('mudar selecao preserva arquivos anteriores e nao recria raiz excluida', t => {
  const root = fixture(t);
  writeAdapterManifest(root);
  synchronize({ root, output() {} });
  const oldReference = read(root, '.claude/skills/example/SKILL.md');
  write(root, '.claude/skills/personal/SKILL.md', 'Meu arquivo.\n');
  write(root, '.claude/settings.json', '{"custom":true}\n');
  write(root, '.vscode/settings.json', '{"custom":true}\n');
  writeAdapterManifest(root, { clients: ['codex'] });
  assert.equal(synchronize({ root, force: true, output() {} }).exitCode, 0);
  assert.equal(read(root, '.claude/skills/example/SKILL.md'), oldReference);
  assert.equal(read(root, '.claude/skills/personal/SKILL.md'), 'Meu arquivo.\n');
  assert.equal(read(root, '.claude/settings.json'), '{"custom":true}\n');
  assert.equal(read(root, '.vscode/settings.json'), '{"custom":true}\n');
  for (const client of ['.claude', '.vscode']) rmSync(join(root, client), { recursive: true });
  assert.equal(synchronize({ root, force: true, output() {} }).exitCode, 0);
  assert.equal(existsSync(join(root, '.claude')), false);
  assert.equal(existsSync(join(root, '.vscode')), false);
  assert.equal(synchronize({ root, check: true, output() {} }).exitCode, 0);
});

test('selecao invalida falha antes de alterar manifesto ou criar pastas', t => {
  const root = fixture(t);
  writeAdapterManifest(root, { clients: 'claude' });
  const original = read(root, '.pbai4devs/espelhos.conf');
  for (const clients of [null, {}, [], '', ' ', ',', 'missing', ['all', 'codex'], ['vscode', 'all'], ['claude', 1]]) {
    assert.throws(() => normalizeClients(clients));
    assert.throws(() => writeAdapterManifest(root, { clients }));
    assert.equal(read(root, '.pbai4devs/espelhos.conf'), original);
    assert.deepEqual(readdirSync(root), ['.pbai4devs']);
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
