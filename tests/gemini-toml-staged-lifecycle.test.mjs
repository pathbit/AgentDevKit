import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tomlManagedBlockDigest } from '../.pbai4devs/scripts/lib/managed-toml.mjs';
import { testGitConfig } from '../.pbai4devs/scripts/lib/test-git-environment.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(repo, 'bin/agentdevkit.mjs');
const target = '.gemini/commands/revisar-entrega.toml';
const original = '# antes\nprompt = "Texto humano"\n';
const edited = '# antes\nprompt = "Texto humano {{args}}"\n# edição humana unstaged\n';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-toml-staged-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const home = join(root, 'home'); mkdirSync(home);
  const env = { PATH: process.env.PATH, HOME: home, USERPROFILE: home, TMPDIR: tmpdir(), TEMP: tmpdir(), TMP: tmpdir(), LC_ALL: 'C', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: testGitConfig, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' };
  if (process.platform === 'win32') { env.SystemRoot = process.env.SystemRoot; env.ComSpec = process.env.ComSpec; }
  const run = (program, args, timeout = 180000) => {
    const result = spawnSync(program, args, { cwd: root, env, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.error, undefined, `${args.slice(0, 2).join(' ')}: ${result.error?.message ?? ''} (${result.signal ?? 'sem sinal'})`);
    return result;
  };
  const git = (...args) => { const result = run('git', args); assert.equal(result.status, 0, result.stderr || result.error?.message); return result.stdout; };
  const gitBlob = () => {
    const result = spawnSync('git', ['show', `:${target}`], { cwd: root, env, timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
    assert.equal(result.status, 0, result.stderr?.toString() || result.error?.message);
    return result.stdout;
  };
  const put = (path, value) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), value); };
  git('init', '--quiet');
  const gitRoot = git('rev-parse', '--show-toplevel').trim();
  const rootInfo = statSync(root, { bigint: true }), gitRootInfo = statSync(gitRoot, { bigint: true });
  assert.equal(gitRootInfo.dev, rootInfo.dev);
  assert.equal(gitRootInfo.ino, rootInfo.ino);
  put('.gitignore', '# Regra humana\nprivado/\n'); put('HUMAN.md', 'Documento humano.\n'); put(target, original);
  git('add', '--', '.gitignore', 'HUMAN.md');
  const command = (args, timeout) => run(process.execPath, [cli, ...args, '--target', root, '--json'], timeout);
  const standalone = () => run(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--root', root]);
  const protectedFiles = ['.git/index', '.git/HEAD', '.git/config', '.git/info/exclude', '.gitignore', 'HUMAN.md'];
  const protectedSnapshot = () => Object.fromEntries(protectedFiles.map(path => [path, digest(readFileSync(join(root, path)))]));
  return { root, git, gitBlob, put, command, standalone, protectedSnapshot };
}

// Snapshot covers files, directories, links and modes, plus selected Git files.
// It does not capture ACLs, xattrs, or writes subsequently reverted.
function tree(root) {
  const entries = [];
  function visit(path, rel = '') {
    for (const name of readdirSync(path).sort()) {
      if (!rel && (name === '.git' || name === 'home')) continue;
      const child = join(path, name), relative = rel ? `${rel}/${name}` : name, stat = lstatSync(child);
      if (stat.isSymbolicLink()) entries.push([relative, 'link', readlinkSync(child)]);
      else if (stat.isDirectory()) { entries.push([relative, 'directory', stat.mode & 0o7777]); visit(child, relative); }
      else if (stat.isFile()) entries.push([relative, 'file', stat.mode & 0o7777, digest(readFileSync(child))]);
      else entries.push([relative, 'other', stat.mode]);
    }
  }
  visit(root); return entries;
}
function initialize(f) {
  const result = f.command(['init', '--agents', 'gemini', '--yes'], 300000);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(JSON.parse(result.stdout).ok, true);
  const content = readFileSync(join(f.root, target), 'utf8');
  for (const marker of ['<!-- BEGIN AGENTDEVKIT -->', '<!-- END AGENTDEVKIT -->']) {
    assert.equal(content.split(marker).length - 1, 1, `bloco gerado: ${marker}`);
  }
  assert.equal([...content.matchAll(/^# ADK-TOML-META-V3 [A-Za-z0-9_-]+\r?$/gm)].length, 1);
  const state = JSON.parse(readFileSync(join(f.root, '.pbai4devs/state/agentdevkit.json'), 'utf8'));
  const recorded = state.blocks?.[target];
  assert.match(recorded || '', /^[a-f0-9]{64}$/);
  assert.equal(tomlManagedBlockDigest(content), recorded, 'digest registrado deve corresponder ao bloco V3');
}
function stageAndEdit(f, content) {
  const originalBytes = readFileSync(join(f.root, target));
  f.git('add', '-f', '--', target);
  const staged = f.gitBlob();
  assert.deepEqual(staged, originalBytes, 'blob staged deve corresponder aos bytes iniciais');
  f.put(target, content);
  assert.notDeepEqual(Buffer.from(content), staged);
  return { staged, protected: f.protectedSnapshot() };
}
function assertProtected(f, before, label) {
  assert.deepEqual(f.protectedSnapshot(), before.protected, `${label}: índice e arquivos Git observados`);
  assert.deepEqual(f.gitBlob(), before.staged, `${label}: bytes staged`);
}

test('init recusa TOML staged com edição unstaged sem aplicação parcial observada', { timeout: 240000 }, t => {
  const f = fixture(t), before = stageAndEdit(f, edited), snapshot = tree(f.root);
  const result = f.command(['init', '--agents', 'gemini', '--yes']);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).error.code, 'E_STAGED');
  assertProtected(f, before, 'init recusado');
  assert.deepEqual(tree(f.root), snapshot);
  assert.equal(readFileSync(join(f.root, target), 'utf8'), edited);
});

test('update e ambos syncs recusam alteração do bloco staged com edição unstaged', { timeout: 480000 }, t => {
  const f = fixture(t); initialize(f);
  const existing = readFileSync(join(f.root, target), 'utf8');
  assert.ok(existing.includes('Texto humano'));
  const humanEdit = existing.replace('Texto humano', 'Texto humano {{args}}') + '# edição humana unstaged\n';
  assert.notEqual(humanEdit, existing);
  const before = stageAndEdit(f, humanEdit), snapshot = tree(f.root);
  for (const [label, invoke, status] of [
    ['update', () => f.command(['update', '--yes']), 1],
    ['sync CLI', () => f.command(['sync', '--yes']), 1],
    ['sync direto', () => f.standalone(), 2],
  ]) {
    const result = invoke();
    assert.equal(result.status, status, `${label}: ${result.stdout}\n${result.stderr}`);
    if (label !== 'sync direto') assert.equal(JSON.parse(result.stdout).error.code, 'E_STAGED', label);
    else {
      assert.match(result.stderr, /[IiÍí]ndice Git contem alteracoes proprias/, label);
      assert.ok(result.stderr.includes(target), `${label}: caminho staged`);
    }
    assertProtected(f, before, label);
    assert.deepEqual(tree(f.root), snapshot, `${label}: conteúdo público observado`);
    assert.equal(readFileSync(join(f.root, target), 'utf8'), humanEdit, label);
  }
});

test('troca de cliente preserva índice e remove somente bloco do TOML staged', { timeout: 480000 }, t => {
  const f = fixture(t); initialize(f);
  const existing = readFileSync(join(f.root, target), 'utf8');
  const humanEdit = existing.replace('Texto humano', 'Texto humano {{args}}') + '# edição humana unstaged\n';
  assert.notEqual(humanEdit, existing);
  const before = stageAndEdit(f, humanEdit);
  const result = f.command(['agents', 'codex', '--yes']);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.equal(JSON.parse(result.stdout).ok, true);
  assertProtected(f, before, 'troca de cliente');
  assert.equal(readFileSync(join(f.root, target), 'utf8'), edited);
  const state = JSON.parse(readFileSync(join(f.root, '.pbai4devs/state/agentdevkit.json'), 'utf8'));
  assert.deepEqual(state.clients, ['codex']);
  assert.equal(state.blocks[target], undefined);
  assert.equal(state.files[target], undefined);
  const derivedPath = join(f.root, '.pbai4devs/state/derived.json');
  if (existsSync(derivedPath)) {
    const derived = JSON.parse(readFileSync(derivedPath, 'utf8'));
    assert.equal(derived.blocks?.[target], undefined);
    assert.equal(derived.files?.[target], undefined);
  }
});
