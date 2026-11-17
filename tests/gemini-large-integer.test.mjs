import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectFixture } from './gemini-toml-lifecycle-reader.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(repo, 'bin/agentdevkit.mjs');
const target = '.gemini/commands/revisar-entrega.toml';
const integer = 'human_counter = 9007199254740992 # manter inteiro exato\n';
const reference = '@{.pbai4devs/commands/revisar-entrega/COMMAND.md}';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const count = (text, part) => text.split(part).length - 1;

test('Gemini preserva inteiro TOML de 64 bits no init, update e sync', { timeout: 240000 }, t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-gemini-large-integer-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const run = (program, args) => spawnSync(program, args, { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
  const git = (...args) => { const result = run('git', args); assert.equal(result.status, 0, result.stderr || result.error?.message); return result.stdout; };
  const put = (path, text) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };
  git('init', '--quiet');
  put('.gitignore', '# Regra humana\nprivate/\n');
  put('HUMAN.md', 'Documento humano sintético.\n');
  const beforePrompt = `# Comando humano\n${integer}description = "Comando humano"\nprompt = `;
  const afterPrompt = ' # comentário humano\n';
  const original = `${beforePrompt}"Orientação humana"${afterPrompt}`;
  put(target, original);
  git('add', '--', '.gitignore', 'HUMAN.md');
  const protectedPaths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'HUMAN.md'];
  const baseline = Object.fromEntries(protectedPaths.map(path => [path, hash(readFileSync(join(root, path)))]));
  const staged = hash(git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv'));
  const check = label => {
    for (const path of protectedPaths) assert.equal(hash(readFileSync(join(root, path))), baseline[path], `${label}: ${path}`);
    assert.equal(hash(git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv')), staged, `${label}: diff staged`);
    const text = readFileSync(join(root, target), 'utf8');
    assert.equal(count(text, integer), 1, `${label}: inteiro decimal exato`);
    return text;
  };
  for (const [label, program, args] of [
    ['init', cli, ['init', '--target', root, '--agents', 'gemini', '--yes', '--json']],
    ['update', cli, ['update', '--target', root, '--yes', '--json']],
    ['sync', cli, ['sync', '--target', root, '--yes', '--json']],
    ['sync direto', join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), ['--root', root]],
  ]) {
    const result = run(process.execPath, [program, ...args]);
    const text = check(label);
    assert.equal(result.status, 0, `${label}: ${result.stdout}\n${result.stderr}\n${result.error || ''}`);
    if (args.includes('--json')) assert.equal(JSON.parse(result.stdout).ok, true, label);
    const state = JSON.parse(readFileSync(join(root, '.pbai4devs/state/agentdevkit.json'), 'utf8'));
    const derivedPath = join(root, '.pbai4devs/state/derived.json');
    const derived = existsSync(derivedPath) ? JSON.parse(readFileSync(derivedPath, 'utf8')) : {};
    const expectedHash = derived.blocks?.[target] ?? state.blocks?.[target];
    const observed = inspectFixture(text, { original, prefix: beforePrompt.slice(0, -'prompt = '.length), suffix: afterPrompt, expectedHash, humanPrompt: 'Orientação humana', reference });
    assert.deepEqual(observed, { margins: true, provenanceValid: true, promptValid: true, humanPrompt: true, references: 1, args: 1 }, label);
  }
});
