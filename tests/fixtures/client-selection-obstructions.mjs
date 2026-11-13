import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fixture, read, put, cli } from './client-selection-helpers.mjs';

export const obstructionKinds = Object.freeze(['root-link', 'skills-file', 'group-file', 'leaf-link', 'leaf-directory']);

export function registerObstructionTests(selection) {
  if (!['codex', 'all'].includes(selection)) throw new Error('Seleção de teste inválida.');
  test(`Codex preserva obstruções e usa fallback apenas nas skills afetadas (${selection})`, async t => {
  for (const kind of obstructionKinds) await t.test(`${selection}/${kind}`, t => {
    const root = fixture(t);
    const git = (...args) => {
      const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout;
    };
    put(root, '.gitignore', '# project\nnode_modules/\n');
    put(root, 'human.txt', 'staged\n');
    git('add', '--', '.gitignore', 'human.txt');
    put(root, 'human.txt', 'working\n');
    const outside = join(root, 'outside');
    const primary = '.agents/skills/qualidade/planejar-qa/SKILL.md';
    const fallback = '.codex/skills/qualidade/planejar-qa/SKILL.md';
    const unaffectedPrimary = '.agents/skills/projeto/criar-skill/SKILL.md';
    const unaffectedFallback = '.codex/skills/projeto/criar-skill/SKILL.md';
    let obstacle;
    if (kind === 'root-link' || kind === 'leaf-link') {
      obstacle = kind === 'root-link' ? '.agents' : primary;
      mkdirSync(outside, { recursive: true });
      put(root, 'outside/keep.txt', 'external human\n');
      mkdirSync(dirname(join(root, obstacle)), { recursive: true });
      try { symlinkSync(kind === 'root-link' ? outside : join(outside, 'keep.txt'), join(root, obstacle), kind === 'root-link' ? 'dir' : 'file'); }
      catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('No symlink privilege'); return; } throw error; }
    } else if (kind === 'leaf-directory') {
      obstacle = primary;
      mkdirSync(join(root, obstacle), { recursive: true });
      put(root, `${obstacle}/human.txt`, 'human directory\n');
    } else {
      obstacle = kind === 'skills-file' ? '.agents/skills' : '.agents/skills/qualidade';
      put(root, obstacle, 'human obstruction\n');
    }
    const beforeIndex = readFileSync(join(root, '.git/index'));
    const beforeIgnore = read(root, '.gitignore');
    const installed = cli(root, ['init', '--agents', selection]);
    assert.ok(installed.preserved.some(item => item.path === obstacle));
    assert.ok(existsSync(join(root, fallback)), 'skill afetada deve ter fallback');
    if (!['root-link', 'skills-file'].includes(kind)) {
      assert.ok(existsSync(join(root, unaffectedPrimary)), 'skill sem obstrução fica na rota nativa');
      assert.equal(existsSync(join(root, unaffectedFallback)), false, 'skill sem obstrução não deve duplicar');
    }
    assert.equal(read(root, 'human.txt'), 'working\n');
    assert.equal(git('show', ':human.txt'), 'staged\n');
    assert.deepEqual(readFileSync(join(root, '.git/index')), beforeIndex);
    assert.equal(read(root, '.gitignore'), beforeIgnore);
    if (kind === 'root-link' || kind === 'leaf-link') assert.equal(read(root, 'outside/keep.txt'), 'external human\n');
    if (kind === 'leaf-directory') assert.equal(read(root, `${obstacle}/human.txt`), 'human directory\n');
    if (kind === 'skills-file' || kind === 'group-file') assert.equal(read(root, obstacle), 'human obstruction\n');
    assert.equal(cli(root, ['doctor']).ok, true);
    assert.equal(cli(root, ['sync', '--check']).ok, true);
    rmSync(join(root, obstacle), { recursive: true, force: true }); // Test-owned fixture only.
    const syncScript = join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
    for (const args of [[], [], ['--check']]) {
      const result = spawnSync(process.execPath, [syncScript, ...args], { cwd: root, encoding: 'utf8', timeout: 180000 });
      assert.equal(result.status, 0, result.stderr || result.stdout);
    }
    assert.equal(cli(root, ['doctor']).ok, true, 'doctor deve reconhecer as alterações do sincronizador standalone');
    const verifier = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/verificar-recursos/SCRIPT.mjs')], { cwd: root, encoding: 'utf8', timeout: 180000 });
    assert.equal(verifier.status, 0, verifier.stderr || verifier.stdout);
    cli(root, ['update']);
    assert.ok(existsSync(join(root, primary)), 'rota nativa volta quando a obstrução é removida');
    assert.equal(existsSync(join(root, fallback)), false, 'fallback intacto é removido após recuperação');
    assert.equal(cli(root, ['update', '--dry-run']).plan.length, 0);
    assert.equal(cli(root, ['doctor']).ok, true);
    const checkedAgain = spawnSync(process.execPath, [syncScript, '--check'], { cwd: root, encoding: 'utf8', timeout: 180000 });
    assert.equal(checkedAgain.status, 0, checkedAgain.stderr || checkedAgain.stdout);
    const verifiedAgain = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/verificar-recursos/SCRIPT.mjs')], { cwd: root, encoding: 'utf8', timeout: 180000 });
    assert.equal(verifiedAgain.status, 0, verifiedAgain.stderr || verifiedAgain.stdout);
    assert.deepEqual(readFileSync(join(root, '.git/index')), beforeIndex);
    assert.equal(read(root, '.gitignore'), beforeIgnore);
  });
});
}
