import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adapters, adapterRoots, writeAdapterManifest } from '../src/adapters/index.mjs';
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
    assert.ok(adapter.reason.length > 20);
    assert.ok(adapter.sources.length > 0);
    for (const source of adapter.sources) assert.equal(new URL(source).protocol, 'https:');
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
