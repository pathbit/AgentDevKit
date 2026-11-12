import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { applyAdditiveFixture, assertAdditivePreservation, createAdditivePlan, selectReadme } from './documentation-compatibility.mjs';
import { workspace } from './oss-compatibility.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-docs-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'docs'));
  const original = Buffer.from('# Existing project\r\n\r\nOriginal decisions stay here.\r\n');
  writeFileSync(join(root, 'Readme.md'), original, { mode: 0o600 });
  writeFileSync(join(root, 'docs', 'ARCHITECTURE.md'), '# Existing architecture\n');
  writeFileSync(join(root, 'unrelated.txt'), 'Keep this exact content.\n');
  const documentation = { files: [
    { path: 'Readme.md', role: 'readme', kind: 'file', sha256: hash(original) },
    { path: 'docs/ARCHITECTURE.md', role: 'design', kind: 'file', sha256: hash(readFileSync(join(root, 'docs/ARCHITECTURE.md'))) },
  ] };
  return { root, original, documentation, project: { id: 'fixture', repository: 'https://github.com/example/project.git', commit: 'a'.repeat(40) } };
}

test('o exercício acrescenta links sem substituir conteúdo, permissões ou arquivos alheios', t => {
  const { root, original, documentation, project } = fixture(t);
  const before = workspace(root), plan = createAdditivePlan(root, documentation, project);
  assert.equal(plan.append.path, 'Readme.md');
  assert.equal(plan.create.path, 'docs/agentdevkit-validation/README.md');
  assert.equal(applyAdditiveFixture(root, plan).changed, true);
  const after = assertAdditivePreservation(root, before, plan, original);
  assert.ok(readFileSync(join(root, 'Readme.md')).subarray(0, original.length).equals(original));
  assert.equal(readFileSync(join(root, 'docs/ARCHITECTURE.md'), 'utf8'), '# Existing architecture\n');
  assert.equal(applyAdditiveFixture(root, plan).changed, false);
  assert.deepEqual(workspace(root), after);
});

test('documento alterado após o inventário ou plano bloqueia a fixture antes de criar o índice', t => {
  const { root, documentation, project } = fixture(t);
  const plan = createAdditivePlan(root, documentation, project);
  const edited = '# Human edit after planning\n';
  writeFileSync(join(root, 'Readme.md'), edited);
  assert.throws(() => createAdditivePlan(root, documentation, project), /mudou após o inventário/);
  assert.throws(() => applyAdditiveFixture(root, plan), /mudou depois do plano/);
  assert.equal(readFileSync(join(root, 'Readme.md'), 'utf8'), edited);
  assert.equal(existsSync(join(root, plan.create.path)), false);
});

test('índice criado por outra pessoa depois do plano não é sobrescrito', t => {
  const { root, documentation, project } = fixture(t);
  const plan = createAdditivePlan(root, documentation, project), before = readFileSync(join(root, plan.append.path));
  mkdirSync(join(root, 'docs/agentdevkit-validation'));
  writeFileSync(join(root, plan.create.path), '# Human index\n');
  assert.throws(() => applyAdditiveFixture(root, plan), /índice apareceu/);
  assert.equal(readFileSync(join(root, plan.create.path), 'utf8'), '# Human index\n');
  assert.deepEqual(readFileSync(join(root, plan.append.path)), before);
});

test('link inserido depois do plano não redireciona a escrita documental', t => {
  const { root, documentation, project } = fixture(t);
  const plan = createAdditivePlan(root, documentation, project);
  const outside = mkdtempSync(join(tmpdir(), 'agentdevkit-docs-external-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  const externalFile = join(outside, 'document.md'); writeFileSync(externalFile, 'External original.\n');
  unlinkSync(join(root, 'Readme.md'));
  try { symlinkSync(externalFile, join(root, 'Readme.md'), 'file'); }
  catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('Criação de symlink indisponível.'); return; } throw error; }
  assert.throws(() => applyAdditiveFixture(root, plan), /Link documental recusado/);
  assert.equal(readFileSync(externalFile, 'utf8'), 'External original.\n');
  assert.equal(existsSync(join(root, plan.create.path)), false);
});

test('o inventário opaco não autoriza seguir README simbólico e prefere o documento real do Zod', () => {
  assert.throws(() => selectReadme({ files: [{ path: 'README.md', kind: 'symbolic-link', role: 'readme' }] }, 'zod'), /Nenhum README regular/);
  const chosen = selectReadme({ files: [
    { path: 'README.md', kind: 'symbolic-link', role: 'readme' },
    { path: 'packages/other/README.md', kind: 'file', role: 'readme', sha256: 'a'.repeat(64) },
    { path: 'packages/zod/README.md', kind: 'file', role: 'readme', sha256: 'b'.repeat(64) },
  ] }, 'zod');
  assert.equal(chosen.path, 'packages/zod/README.md');
});

test('a conferência falha se conteúdo fora do plano for alterado', t => {
  const { root, original, documentation, project } = fixture(t);
  const before = workspace(root), plan = createAdditivePlan(root, documentation, project);
  applyAdditiveFixture(root, plan);
  writeFileSync(join(root, 'unrelated.txt'), 'Changed outside the plan.\n');
  assert.throws(() => assertAdditivePreservation(root, before, plan, original), /fora do plano/);
});
