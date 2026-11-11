import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { main, parseArgs } from '../src/cli.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(project, 'bin/agentdevkit.mjs');
const statePath = '.pbai4devs/estado/agentdevkit.json';
function fixture(t) {
  mkdirSync(join(project, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(project, '.agent-tests/client-selection-'));
  t.after(() => rmSync(root, { recursive: true, force: true })); return root;
}
const read = (root, path) => readFileSync(join(root, path), 'utf8');
const state = root => JSON.parse(read(root, statePath));
function put(root, path, value) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), value); }
function cli(root, args, status = 0) {
  const result = spawnSync(process.execPath, [bin, ...args, '--target', root, '--json'], { encoding: 'utf8', timeout: 90000 });
  assert.equal(result.status, status, result.stdout + result.stderr); return JSON.parse(result.stdout);
}

test('seleção valida aliases e entradas antes de escrever; consulta é somente leitura', t => {
  assert.deepEqual(parseArgs(['init', '--agents', 'CODEX,claude-code,codex']).clients, ['claude', 'codex']);
  assert.deepEqual(parseArgs(['clients', 'vscode']).clients, ['copilot']);
  for (const args of [['init', '--agents', ''], ['agents', 'unknown'], ['init', '--agents', 'all,codex'], ['doctor', '--agents', 'codex'], ['agents', '--dry-run']]) assert.throws(() => parseArgs(args), { code: 'E_ARGS' });
  const root = fixture(t);
  const result = cli(root, ['agents']);
  assert.deepEqual(result.clients, ['all']); assert.ok(result.availableClients.some(client => client.id === 'codex'));
  cli(root, ['init', '--agents', 'unknown'], 2);
  cli(root, ['agents', 'claude'], 1);
  assert.deepEqual(readdirSync(root), []);
});

test('claude isolado, dependência do codex e persistência não criam clientes extras', t => {
  const root = fixture(t);
  cli(root, ['init', '--agents', 'claude']);
  assert.deepEqual(state(root).clients, ['claude']); assert.ok(existsSync(join(root, 'CLAUDE.md')));
  assert.match(read(root, 'CLAUDE.md'), /AGENTS\.md/);
  for (const path of ['.agents', '.agent', '.codex', '.github', '.vscode', 'GEMINI.md']) assert.equal(existsSync(join(root, path)), false, path);
  cli(root, ['agents', 'codex', '--dry-run']);
  assert.deepEqual(state(root).clients, ['claude']); assert.equal(existsSync(join(root, '.codex')), false);
  cli(root, ['agents', 'codex,claude']);
  assert.ok(existsSync(join(root, '.agents/skills.json'))); assert.ok(existsSync(join(root, '.codex/skills')));
  assert.equal(cli(root, ['agents', 'claude,codex']).changed, false);
  cli(root, ['update']); cli(root, ['sync']); cli(root, ['lang', 'es']);
  assert.deepEqual(state(root).clients, ['claude', 'codex']);
  cli(root, ['clients', 'codex']);
  assert.equal(existsSync(join(root, 'CLAUDE.md')), false);
  assert.equal(existsSync(join(root, '.claude')), false);
  assert.equal(existsSync(join(root, 'GEMINI.md')), false);
  assert.deepEqual(cli(root, ['agents']).clients, ['codex']);
  assert.equal(cli(root, ['doctor']).ok, true); assert.equal(cli(root, ['sync', '--check']).ok, true);
  const direct = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(direct.status, 0, direct.stdout + direct.stderr);
  assert.equal(existsSync(join(root, '.pbai4devs/tools/skills/.local')), false);
});

test('desmarcar preserva recursos próprios e exige revisão de derivados alterados', t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude,codex']);
  const path = '.claude/skills/configurar-projeto/SKILL.md';
  const original = read(root, path), changed = `${original}\nUser edit.\n`;
  put(root, path, changed);
  put(root, '.claude/skills/unknown/SKILL.md', original);
  put(root, '.claude/skills/custom/SKILL.md', '# User owned\n');
  put(root, '.claude/.gitignore', `# User ignore\n${read(root, '.claude/.gitignore')}`);
  put(root, 'CLAUDE.md', `# User instructions\n${read(root, 'CLAUDE.md').replace('AGENTS.md', 'CHANGED.md')}`);
  mkdirSync(join(root, '.claude/skills/user-empty'), { recursive: true });
  const before = read(root, statePath);
  const denied = cli(root, ['agents', 'codex'], 1);
  assert.ok(denied.conflicts.includes(path)); assert.ok(denied.conflicts.includes('CLAUDE.md'));
  assert.equal(read(root, statePath), before); assert.equal(read(root, path), changed);
  const result = cli(root, ['agents', 'codex', '--force']);
  assert.equal(read(root, join(result.backup, path)), changed);
  assert.equal(existsSync(join(root, path)), false);
  assert.equal(read(root, '.claude/skills/unknown/SKILL.md'), original);
  assert.equal(read(root, '.claude/skills/custom/SKILL.md'), '# User owned\n');
  assert.ok(existsSync(join(root, '.claude/skills/user-empty')));
  assert.equal(read(root, '.claude/.gitignore'), '# User ignore\n\n');
  assert.match(read(root, 'CLAUDE.md'), /^# User instructions/); assert.doesNotMatch(read(root, 'CLAUDE.md'), /BEGIN AGENTDEVKIT/);
  cli(root, ['sync']); assert.equal(read(root, '.claude/skills/unknown/SKILL.md'), original);
});

test('estado legado equivale a all e consultas não escrevem migração', t => {
  const root = fixture(t); cli(root, ['init', '--yes']);
  const previous = state(root); delete previous.clients; put(root, statePath, `${JSON.stringify(previous, null, 2)}\n`);
  const before = read(root, statePath);
  assert.deepEqual(cli(root, ['agents']).clients, ['all']);
  assert.equal(cli(root, ['doctor']).ok, true); assert.equal(cli(root, ['sync', '--check']).ok, true);
  assert.equal(read(root, statePath), before);
  cli(root, ['update']); assert.deepEqual(state(root).clients, ['all']);
  put(root, '.github/workflows/custom.yml', 'name: user workflow\n');
  cli(root, ['agents', 'codex']);
  for (const path of ['.claude', '.opencode', '.cursor', '.gemini', '.agent']) assert.equal(existsSync(join(root, path)), false, path);
  assert.equal(read(root, '.github/workflows/custom.yml'), 'name: user workflow\n');
});

test('TTY pergunta idioma e clientes; execução semTTY e opções não perguntam', async t => {
  const root = fixture(t), questions = [], answers = ['es', 'claude']; let output = '';
  const status = await main(['init', '--target', root], { stdin: { isTTY: true }, stdout: { isTTY: true, write: value => { output += value; } }, ask: async question => { questions.push(question); return answers.shift(); } });
  assert.equal(status, 0, output); assert.equal(questions.length, 2); assert.match(questions[0], /Idioma/); assert.match(questions[1], /Agentes/);
  assert.equal(state(root).language, 'es'); assert.deepEqual(state(root).clients, ['claude']);
  for (const args of [[], ['--yes'], ['--json'], ['--dry-run']]) await t.test(args.join(' ') || 'sem TTY', async subtest => {
    const target = fixture(subtest); const tty = args.length > 0; let text = '';
    const code = await main(['init', '--target', target, ...args], { stdin: { isTTY: tty }, stdout: { isTTY: tty, write: value => { text += value; } }, ask: () => { throw new Error('Unexpected prompt'); } });
    assert.equal(code, 0, text);
    if (args.includes('--dry-run')) assert.deepEqual(readdirSync(target), []);
    else assert.deepEqual(state(target).clients, ['all']);
  });
});

test('clientes não selecionados com links próprios não são visitados', t => {
  const root = fixture(t), outside = fixture(t);
  try { symlinkSync(outside, join(root, '.opencode'), 'dir'); } catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('No symlink privilege'); return; } throw error; }
  cli(root, ['init', '--agents', 'codex']);
  assert.deepEqual(readdirSync(outside), []); assert.equal(cli(root, ['doctor']).ok, true);
  const digest = createHash('sha256').update(read(root, statePath)).digest('hex');
  cli(root, ['sync', '--check']);
  assert.equal(createHash('sha256').update(read(root, statePath)).digest('hex'), digest);
});
