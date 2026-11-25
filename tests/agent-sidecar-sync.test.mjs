import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(repository, 'bin/agentdevkit.mjs');
const source = '.pbai4devs/agents/inventariar-docs/AGENT.md';
const sidecar = '.pbai4devs/agents/inventariar-docs/claude.yaml';
const target = '.claude/agents/inventariar-docs.md';

test("CLI and direct sync converge after adding metadata to own agent", { timeout: 300000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-agent-sidecar-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (path, value) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value); };
  const run = (program, args, expected = 0) => {
    const result = spawnSync(program, args, { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, expected, result.stdout + result.stderr);
    return result.stdout;
  };
  const git = (...args) => run('git', args);
  const command = (...args) => JSON.parse(run(process.execPath, [cli, ...args, '--target', root, '--json']));
  const direct = (...args) => run(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--root', root, ...args]);
  git('init', '--quiet');
  put('.gitignore', '# ignore humano\n');
  put('human.txt', 'staged\n');
  git('add', '--', '.gitignore', 'human.txt');
  put('human.txt', 'staged\nunstaged\n');
  command('init', '--agents', 'claude', '--yes');
  put('.claude/agents/humano.md', '# Agente humano\n\nNão substitua.\n');
  put(source, '---\nname: inventariar-docs\ndescription: Lista documentos sintéticos.\n---\n\n# Inventariar docs\n');
  git('add', '-f', '--', '.claude/agents/humano.md', source);
  direct();
  assert.ok(existsSync(join(root, target)));
  const first = readFileSync(join(root, target));
  assert.doesNotMatch(first.toString('utf8'), /^tools:/m);
  put(sidecar, '---\nname: inventariar-docs\ndescription: Lista documentos sintéticos.\ntools: Read, Grep, Glob\n---\n');
  git('add', '-f', '--', sidecar);
  const protectedPaths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'human.txt', '.claude/agents/humano.md', source, sidecar];
  const before = new Map(protectedPaths.map(path => [path, readFileSync(join(root, path))]));
  const unchanged = () => { for (const [path, bytes] of before) assert.deepEqual(readFileSync(join(root, path)), bytes, path); };
  assert.equal(command('sync').ok, true); unchanged();
  const expected = readFileSync(join(root, target));
  assert.match(expected.toString('utf8'), /^tools: Read, Grep, Glob$/m);
  assert.notDeepEqual(expected, first);
  for (let i = 0; i < 2; i++) {
    assert.equal(command('sync', '--check').ok, true);
    direct('--check');
    direct();
    assert.deepEqual(readFileSync(join(root, target)), expected);
    unchanged();
  }
  assert.equal(command('update').ok, true);
  assert.deepEqual(readFileSync(join(root, target)), expected);
  unchanged();
});
