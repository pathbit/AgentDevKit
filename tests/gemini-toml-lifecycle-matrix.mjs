// Optional regression proof: node --test tests/gemini-toml-lifecycle-matrix.mjs
// Prompt observations use the kit's vendored TOML parser, not an independent parser.
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

if (process.versions.bun || Number(process.versions.node.split('.')[0]) < 24) throw new Error('Esta prova exige Node.js 24+; não instala runtimes.');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(repo, 'bin/agentdevkit.mjs');
const target = '.gemini/commands/revisar-entrega.toml';
const reference = '@{.pbai4devs/commands/revisar-entrega/COMMAND.md}';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const kinds = [
  ['basic', 'prompt = "Orientação humana"', 'Orientação humana'],
  ['literal', "prompt = 'Orientação humana'", 'Orientação humana'],
  ['basic-multiline', 'prompt = """\nPrimeira\nSegunda"""', 'Primeira\nSegunda'],
  ['literal-multiline', "prompt = '''\nPrimeira\nSegunda'''", 'Primeira\nSegunda'],
  ['missing', null, null],
];

for (const [kind, assignment, humanPrompt] of kinds) for (const eol of ['\n', '\r\n']) for (const bom of ['', '\ufeff']) {
  const id = `${kind}/${eol === '\n' ? 'LF' : 'CRLF'}/${bom ? 'BOM' : 'sem-BOM'}`;
  test(`ciclo TOML ${id}`, { timeout: 240000 }, t => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-gemini-matrix-')));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const run = (program, args) => spawnSync(program, args, { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
    const git = (...args) => { const result = run('git', args); assert.equal(result.status, 0, result.stderr || result.error?.message); return result.stdout; };
    const put = (path, content) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); };
    const invoke = (program, args, label) => {
      const result = run(program, args);
      assert.equal(result.status, 0, `${label}: ${result.stdout}\n${result.stderr}\n${result.error || ''}`);
      if (args.includes('--json')) { const json = JSON.parse(result.stdout); assert.equal(json.ok, true, label); }
    };
    const lead = `${bom}# Conteúdo humano${eol}description = "Meu comando"${eol}`;
    const tail = `[config]${eol}value = 1${eol}`;
    const original = assignment === null ? `${lead}${tail}` : `${lead}${assignment.replaceAll('\n', eol)} # comentário humano${eol}${tail}`;
    const suffix = assignment === null ? `${eol}${tail}` : ` # comentário humano${eol}${tail}`;

    git('init', '--quiet');
    put('.gitignore', '# Regra humana\nprivate/\n');
    put('HUMAN.md', 'Fixture humana.\n');
    put(target, original);
    git('add', '--', '.gitignore', 'HUMAN.md');
    const paths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'HUMAN.md'];
    const baseline = Object.fromEntries(paths.map(path => [path, hash(readFileSync(join(root, path)))]));
    const staged = hash(git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv'));
    const protectedState = label => {
      for (const path of paths) assert.equal(hash(readFileSync(join(root, path))), baseline[path], `${label}: ${path}`);
      assert.equal(hash(git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv')), staged, `${label}: diff staged`);
    };
    const observations = [];
    const observe = label => {
      protectedState(label);
      const text = readFileSync(join(root, target), 'utf8');
      const state = JSON.parse(readFileSync(join(root, '.pbai4devs/state/agentdevkit.json'), 'utf8'));
      const derivedPath = join(root, '.pbai4devs/state/derived.json');
      const derived = existsSync(derivedPath) ? JSON.parse(readFileSync(derivedPath, 'utf8')) : {};
      const expectedHash = derived.blocks?.[target] ?? state.blocks?.[target];
      observations.push({ label, ...inspectFixture(text, { original, prefix: lead, suffix, expectedHash, humanPrompt, reference }) });
    };
    invoke(process.execPath, [cli, 'init', '--target', root, '--agents', 'gemini', '--yes', '--json'], 'init'); observe('init');
    invoke(process.execPath, [cli, 'sync', '--target', root, '--yes', '--json'], 'sync CLI'); observe('sync CLI');
    const standalone = join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
    invoke(process.execPath, [standalone, '--root', root], 'sync direto'); observe('sync direto');
    invoke(process.execPath, [cli, 'agents', 'codex', '--target', root, '--yes', '--json'], 'remover Gemini');
    protectedState('remover Gemini');
    const restored = readFileSync(join(root, target));
    const expected = ['init', 'sync CLI', 'sync direto'].map(label => ({ label, margins: true, provenanceValid: true, promptValid: true, humanPrompt: true, references: 1, args: 1 }));
    assert.deepEqual({ observations, restoredBytes: restored.equals(Buffer.from(original)) }, { observations: expected, restoredBytes: true }, `${id}: prompt e bytes humanos na remoção`);
  });
}
