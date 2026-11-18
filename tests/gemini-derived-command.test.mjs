import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(repo, 'bin/agentdevkit.mjs');
const source = '.pbai4devs/commands/equipe-check/COMMAND.md';
const target = '.gemini/commands/equipe-check.toml';
const reference = '@{.pbai4devs/commands/equipe-check/COMMAND.md}';
const hash = value => createHash('sha256').update(value).digest('hex');
const digest = (root, path) => hash(readFileSync(join(root, path)));
const count = (value, needle) => value.split(needle).length - 1;

// This oracle covers the generated JSON-compatible, single-line TOML string
// in this fixture only. It does not attempt to parse TOML in general.
function promptOf(content) {
  const matches = [...content.matchAll(/^prompt = ("(?:[^"\\\r\n]|\\.)*")$/gm)];
  assert.equal(matches.length, 1, 'a fixture deve ter um único prompt reconhecível');
  return JSON.parse(matches[0][1]);
}

test('comando Gemini derivado e editado preserva uma referência em update e sync', { timeout: 240000 }, t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-gemini-derived-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const run = (program, args) => spawnSync(program, args, { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
  const git = (...args) => {
    const result = run('git', args);
    assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr || result.error?.message}`);
    return result.stdout;
  };
  const put = (path, text) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };
  const invoke = (program, args, step) => {
    const result = run(program, args);
    assert.equal(result.status, 0, `${step}: ${result.stdout}\n${result.stderr}\n${result.error || ''}`);
  };

  git('init', '--quiet');
  put('.gitignore', '# Regra humana\nprivado/\n');
  put('HUMAN.md', 'Documento humano sintético.\n');
  git('add', '--', '.gitignore', 'HUMAN.md');
  const protectedPaths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'HUMAN.md'];
  const baseline = new Map(protectedPaths.map(path => [path, digest(root, path)]));
  const staged = hash(Buffer.from(git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv')));
  const verifyProtected = step => {
    for (const [path, original] of baseline) assert.equal(digest(root, path), original, `${step}: ${path}`);
    assert.equal(hash(Buffer.from(git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv'))), staged, `${step}: diff staged`);
  };

  invoke(process.execPath, [cli, 'init', '--target', root, '--agents', 'gemini', '--yes'], 'init');
  verifyProtected('init');
  const sourceText = '---\ndescription: Comando próprio sintético.\n---\n\n# Equipe check\n\nVerifique o resultado.\n';
  put(source, sourceText);
  const sync = join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
  invoke(process.execPath, [sync, '--root', root], 'sync inicial');
  verifyProtected('sync inicial');
  assert.equal(digest(root, source), hash(sourceText));

  const generated = readFileSync(join(root, target), 'utf8');
  assert.equal(count(promptOf(generated), reference), 1, 'sync inicial deve gerar uma referência');
  const derived = JSON.parse(readFileSync(join(root, '.pbai4devs/state/derived.json'), 'utf8'));
  assert.equal(derived.files?.[target], hash(generated), 'sync deve registrar o arquivo gerado');
  const edited = `${generated}# nota humana sintética\n`;
  writeFileSync(join(root, target), edited);
  const results = [];
  for (const [step, args] of [
    ['update', [cli, 'update', '--target', root, '--yes']],
    ['sync', [sync, '--root', root]],
  ]) {
    invoke(process.execPath, args, step);
    verifyProtected(step);
    assert.equal(digest(root, source), hash(sourceText), `${step}: fonte humana`);
    const content = readFileSync(join(root, target), 'utf8');
    results.push({ step, bytesPreserved: Buffer.from(content).equals(Buffer.from(edited)), humanCommentPreserved: content.endsWith('# nota humana sintética\n'), references: count(promptOf(content), reference), args: count(promptOf(content), '{{args}}') });
  }
  assert.deepEqual(results, [
    { step: 'update', bytesPreserved: true, humanCommentPreserved: true, references: 1, args: 1 },
    { step: 'sync', bytesPreserved: true, humanCommentPreserved: true, references: 1, args: 1 },
  ], 'cada etapa deve preservar os bytes humanos e conter uma única referência no prompt');
});
