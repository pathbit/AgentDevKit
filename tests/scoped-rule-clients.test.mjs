import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(repo, 'bin/agentdevkit.mjs');
const glob = 'src/backend/**/*.ts';
const source = '.pbai4devs/rules/fixture-backend/RULE.md';
const sidecar = '.pbai4devs/rules/fixture-backend/claude.yaml';
const claude = '.claude/rules/fixture-backend/RULE.md';
const copilot = '.github/instructions/fixture-backend.instructions.md';
const hash = value => createHash('sha256').update(value).digest('hex');

// Persistent bytes, names and modes only; ACLs and transient writes are not observed.
function treeHash(root) {
  const rows = [];
  const visit = relative => {
    const path = relative ? join(root, relative) : root, info = lstatSync(path);
    assert.ok(info.isFile() || info.isDirectory());
    rows.push([relative, info.mode & 0o777, info.isFile() ? hash(readFileSync(path)) : null]);
    if (info.isDirectory()) for (const name of readdirSync(path).sort()) visit(relative ? `${relative}/${name}` : name);
  };
  visit(''); return hash(JSON.stringify(rows));
}

function assertScopedPointer(root, path, key, expected) {
  const text = readFileSync(join(root, path), 'utf8');
  const front = /^---\r?\n([^\r\n]+)\r?\n---(?:\r?\n|$)/.exec(text);
  assert.ok(front, `${path}: frontmatter esperado`);
  const match = new RegExp(`^${key}: (.+)$`).exec(front[1]);
  assert.ok(match, `${path}: campo de escopo esperado`);
  assert.deepEqual(JSON.parse(match[1]), expected, `${path}: escopo não deve ser global`);
  const pointers = [...text.matchAll(/\[origem\]\(([^)]+)\)/g)];
  assert.equal(pointers.length, 1);
  assert.equal(posix.normalize(posix.join(posix.dirname(path), pointers[0][1])), source);
}

test("glob rule maintains scope Claude and Copilot and preserves Git staged", { timeout: 240000 }, t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-scoped-rule-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const run = (program, args) => spawnSync(program, args, { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
  const git = (...args) => { const result = run('git', args); assert.equal(result.status, 0, result.stderr || result.error?.message); return result.stdout; };
  const put = (path, content) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); };
  const read = path => readFileSync(join(root, path));
  const cliCall = (...args) => {
    const result = run(process.execPath, [cli, ...args, '--target', root, '--json']);
    assert.equal(result.status, 0, `${args.join(' ')}: ${result.stdout}\n${result.stderr}\n${result.error || ''}`);
    const value = JSON.parse(result.stdout); assert.equal(value.ok, true); return value;
  };

  git('init', '--quiet');
  put('.gitignore', '# Regra humana\nprivate/\n');
  put('HUMAN.md', 'Conteúdo staged.\n');
  put('.claude/settings.json', '{"fixture":"configuração humana"}\n');
  put('.github/copilot-instructions.md', '# Instrução humana preexistente\n');
  git('add', '--', '.gitignore', 'HUMAN.md', '.claude/settings.json', '.github/copilot-instructions.md');
  put('HUMAN.md', 'Conteúdo staged.\nEdição não staged.\n');
  assert.equal(run('git', ['diff', '--cached', '--quiet', '--', 'HUMAN.md']).status, 1);
  assert.equal(run('git', ['diff', '--quiet', '--', 'HUMAN.md']).status, 1);
  const protectedPaths = ['.git/index', '.git/HEAD', '.git/config', '.git/info/exclude', '.gitignore', 'HUMAN.md', '.claude/settings.json', '.github/copilot-instructions.md'];
  const baseline = Object.fromEntries(protectedPaths.map(path => [path, hash(read(path))]));
  const staged = hash(git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv'));
  const protectedState = label => {
    for (const path of protectedPaths) assert.equal(hash(read(path)), baseline[path], `${label}: ${path}`);
    assert.equal(hash(git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv')), staged, `${label}: diff staged`);
    assert.equal(git('show', ':HUMAN.md'), 'Conteúdo staged.\n');
  };
  cliCall('init', '--agents', 'claude,copilot', '--yes');
  protectedState('init');
  const state = JSON.parse(read('.pbai4devs/state/agentdevkit.json'));
  assert.ok(state.clients.includes('claude') && state.clients.includes('copilot'));
  const rule = `---\ntrigger: glob\nglobs: "${glob}"\ndescription: Regra sintética de backend.\n---\n\n# Backend\n\nValide as entradas.\n`;
  const metadata = `---\npaths: ["${glob}"]\n---\n`;
  put(source, rule); put(sidecar, metadata);
  const previewTree = treeHash(root);
  const preview = cliCall('sync', '--dry-run');
  assert.equal(treeHash(root), previewTree, 'dry-run não altera a árvore');
  assert.ok(preview.plan.some(item => item.path === claude && !item.conflict));
  assert.ok(preview.plan.some(item => item.path === copilot && !item.conflict));
  cliCall('sync');
  protectedState('sync');
  assert.equal(read(source).toString('utf8'), rule);
  assert.equal(read(sidecar).toString('utf8'), metadata);
  assertScopedPointer(root, claude, 'paths', [glob]);
  assertScopedPointer(root, copilot, 'applyTo', glob);

  const pointers = [];
  const scan = path => {
    if (!existsSync(join(root, path))) return;
    const info = lstatSync(join(root, path));
    if (info.isDirectory()) for (const name of readdirSync(join(root, path)).sort()) scan(`${path}/${name}`);
    else if (info.isFile() && /\.md$/i.test(path) && read(path).toString('utf8').includes('fixture-backend/RULE.md')) pointers.push(path);
  };
  scan('.claude'); scan('.github');
  assert.deepEqual(pointers.sort(), [claude, copilot].sort(), 'não deve haver outra referência Markdown à regra');
  const checkTree = treeHash(root);
  cliCall('sync', '--check');
  assert.equal(treeHash(root), checkTree, 'check não altera a árvore');
  protectedState('check');
});
