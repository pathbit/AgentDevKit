import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(repo, 'bin/agentdevkit.mjs');
const collision = '.gemini/skills/fixture-colisao/SKILL.md';
const collisionSource = '.pbai4devs/skills/projeto/fixture-colisao/SKILL.md';
const freeSource = '.pbai4devs/skills/projeto/fixture-livre/SKILL.md';
const freeTarget = '.gemini/skills/fixture-livre/SKILL.md';
const hash = value => createHash('sha256').update(value).digest('hex');

// Compares persistent fixture names, modes and bytes; it does not capture
// ACLs, xattrs, access times or temporary changes later reverted.
function treeHash(root) {
  const rows = [];
  const visit = relative => {
    const path = relative ? join(root, relative) : root;
    const info = lstatSync(path);
    assert.ok(info.isFile() || info.isDirectory(), `tipo inesperado na fixture: ${relative}`);
    rows.push([relative, info.mode & 0o777, info.isFile() ? hash(readFileSync(path)) : null]);
    if (info.isDirectory()) for (const name of readdirSync(path).sort()) visit(relative ? `${relative}/${name}` : name);
  };
  visit('');
  return hash(JSON.stringify(rows));
}

test('sync preserva conteúdo humano e índice staged em colisão de skill', { timeout: 240000 }, t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-sync-collision-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const run = (program, args) => spawnSync(program, args, { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
  const git = (...args) => { const result = run('git', args); assert.equal(result.status, 0, result.stderr || result.error?.message); return result.stdout; };
  const put = (path, content) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); };
  const read = path => readFileSync(join(root, path));
  const invoke = (...args) => {
    const result = run(process.execPath, [cli, ...args, '--target', root, '--json']);
    assert.equal(result.status, 0, `${args.join(' ')}: ${result.stdout}\n${result.stderr}\n${result.error || ''}`);
    const value = JSON.parse(result.stdout);
    assert.equal(value.ok, true, args.join(' '));
    return value;
  };

  git('init', '--quiet');
  put('.gitignore', '# Ignore humano\nprivado/\n');
  put('HUMAN.md', 'Documento humano sintético.\n');
  const staged = '---\nname: fixture-colisao\ndescription: Conteúdo staged.\n---\n\n# Skill humana\nVersão staged.\n';
  const working = '---\nname: fixture-colisao\ndescription: Conteúdo humano.\n---\n\n# Skill humana\nVersão não staged.\n';
  put(collision, staged);
  git('add', '--', '.gitignore', 'HUMAN.md', collision);
  put(collision, working);
  assert.equal(run('git', ['diff', '--cached', '--quiet', '--', collision]).status, 1, 'colisão deve ter adição staged');
  assert.equal(run('git', ['diff', '--quiet', '--', collision]).status, 1, 'working tree deve divergir do índice');

  const protectedPaths = ['.git/index', '.git/HEAD', '.git/config', '.git/info/exclude', '.gitignore', 'HUMAN.md'];
  const baseline = Object.fromEntries(protectedPaths.map(path => [path, hash(read(path))]));
  const stagedDiff = hash(git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv'));
  const protectedState = phase => {
    for (const path of protectedPaths) assert.equal(hash(read(path)), baseline[path], `${phase}: ${path}`);
    assert.equal(hash(git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv')), stagedDiff, `${phase}: diff staged`);
    assert.equal(git('show', `:${collision}`), staged, `${phase}: blob staged da colisão`);
  };
  invoke('init', '--agents', 'gemini', '--yes');
  protectedState('init');
  assert.equal(read(collision).toString('utf8'), working, 'init preserva colisão humana');

  const skill = name => `---\nname: ${name}\ndescription: Skill sintética para prova.\n---\n\n# ${name}\n\nConteúdo humano da fixture.\n`;
  const collisionDoc = skill('fixture-colisao'), freeDoc = skill('fixture-livre');
  put(collisionSource, collisionDoc);
  put(freeSource, freeDoc);
  assert.equal(existsSync(join(root, freeTarget)), false, 'destino livre não deve existir antes do sync');
  const sourceState = phase => {
    assert.equal(read(collisionSource).toString('utf8'), collisionDoc, `${phase}: fonte com colisão`);
    assert.equal(read(freeSource).toString('utf8'), freeDoc, `${phase}: fonte livre`);
    protectedState(phase);
  };
  const beforePreview = treeHash(root);
  const preview = invoke('sync', '--dry-run');
  assert.equal(treeHash(root), beforePreview, 'dry-run não deve alterar a árvore');
  sourceState('dry-run');
  assert.equal(read(collision).toString('utf8'), working);
  assert.ok(preview.plan.some(item => item.path === freeTarget && item.action === 'create'));
  assert.ok(preview.preserved.some(item => item.path === collision && item.reason === 'existing-file-extended'));

  const applied = invoke('sync');
  sourceState('sync');
  assert.ok(applied.preserved.some(item => item.path === collision && item.reason === 'existing-file-extended'));
  const added = '\n<!-- BEGIN AGENTDEVKIT -->\nLeia e siga [origem](../../../.pbai4devs/skills/projeto/fixture-colisao/SKILL.md).\n<!-- END AGENTDEVKIT -->\n';
  assert.deepEqual(read(collision), Buffer.from(working + added), 'colisão deve receber somente o apontamento esperado');
  const expectedFree = '---\nname: fixture-livre\ndescription: Skill sintética para prova.\n---\n\n# fixture-livre\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/skills/projeto/fixture-livre/SKILL.md).\n';
  assert.deepEqual(read(freeTarget), Buffer.from(expectedFree), 'recurso livre deve conter o apontamento esperado');

  const beforeCheck = treeHash(root);
  invoke('sync', '--check');
  assert.equal(treeHash(root), beforeCheck, 'check não deve alterar a árvore');
  sourceState('check');
  assert.deepEqual(read(collision), Buffer.from(working + added));
});
