import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkOriginals, checkPreservedManagedEdit, fileSnapshot, gitSnapshot, hash, parseCliResult } from './oss-compatibility.mjs';

test('verificação OSS identifica os conflitos devolvidos pela CLI sem ocultar o status', () => {
  const options = { name: 'init-dry-run', expected: 0, version: '0.0.21' };
  const failure = JSON.stringify({ ok: false, version: '0.0.21', conflicts: ['.gitignore: !*.[Cc]ache/'] });
  assert.throws(() => parseCliResult(failure, 1, options), /conflitos: \.gitignore: !\*\.\[Cc\]ache\//);
  assert.throws(() => parseCliResult('not json', 1, options), /não é JSON válido/);
  assert.throws(() => parseCliResult(JSON.stringify({ ok: true, version: '0.0.20' }), 0, options), /Versão executada/);
  assert.equal(parseCliResult(JSON.stringify({ ok: true, version: '0.0.21' }), 0, options).ok, true);
});

test('verificação OSS aceita edição humana preservada e rejeita perdas ou alteração do Git', async t => {
  const managed = '.pbai4devs/rules/qualidade/RULE.md', statePath = '.pbai4devs/state/agentdevkit.json';
  const edited = Buffer.from('Conteúdo humano preservado.\n'), backup = '.agent-tests/agentdevkit/backups/123-abc';
  const file = value => ({ kind: 'file', mode: 0o644, sha256: hash(value) });
  const before = { [managed]: file(edited), [statePath]: file('old state'), '.gitignore': file('human ignore'), 'other.txt': file('user data') };
  const backupState = `${backup}/${statePath}`;
  const after = { ...before, [statePath]: file('new state'), '.agent-tests': { kind: 'directory', mode: 0o755 },
    '.agent-tests/agentdevkit': { kind: 'directory', mode: 0o755 }, '.agent-tests/agentdevkit/backups': { kind: 'directory', mode: 0o755 }, [backup]: { kind: 'directory', mode: 0o755 },
    [`${backup}/.pbai4devs`]: { kind: 'directory', mode: 0o755 }, [`${backup}/.pbai4devs/state`]: { kind: 'directory', mode: 0o755 }, [backupState]: before[statePath] };
  const git = { head: 'commit', index: 'staged', indexSha256: hash('binary index'), stagedDiff: 'staged difference', remotes: 'remote', configSha256: hash('config'), exclude: hash('exclude') };
  const valid = { before, after, beforeGit: git, afterGit: { ...git }, managed, edited,
    outcome: { ok: true, conflicts: [], backup, preserved: [{ path: managed, reason: 'edited-managed-file' }] },
    beforeState: { files: { [managed]: hash('original'), 'other.md': hash('other') }, blocks: {}, version: '0.0.21' },
    state: { files: { 'other.md': hash('other') }, blocks: {}, version: '0.0.21' } };
  assert.doesNotThrow(() => checkPreservedManagedEdit(valid));
  for (const [label, change, message] of [
    ['edit', { after: { ...after, [managed]: file('replaced') } }, /Arquivo editado/],
    ['other', { after: { ...after, 'other.txt': file('changed') } }, /outros arquivos/],
    ['index', { afterGit: { ...git, index: 'changed' } }, /Git/],
    ['index bytes', { afterGit: { ...git, indexSha256: hash('different binary index') } }, /Git/],
    ['ignore', { after: { ...after, '.gitignore': file('changed') } }, /outros arquivos/],
    ['ownership', { state: { ...valid.state, files: { ...valid.state.files, [managed]: hash(edited) } } }, /propriedade/],
    ['other ownership', { state: { ...valid.state, files: {} } }, /estado mudou/],
    ['unreported', { outcome: { ...valid.outcome, preserved: [] } }, /reportada/],
    ['unsafe backup', { outcome: { ...valid.outcome, backup: '../outside' } }, /Backup fora/],
    ['missing backup', { outcome: { ...valid.outcome, backup: undefined } }, /obrigatório/],
    ['missing backup state', { after: Object.fromEntries(Object.entries(after).filter(([p]) => p !== backupState)) }, /Backup do estado anterior/],
    ['modified backup state', { after: { ...after, [backupState]: file('different state') } }, /Backup do estado anterior/],
    ['backup file link', { after: { ...after, [backupState]: { kind: 'symlink', target: '/outside', mode: 0o777 } } }, /Backup do estado anterior/],
    ['backup directory link', { after: { ...after, [`${backup}/.pbai4devs`]: { kind: 'symlink', target: '/outside', mode: 0o777 } } }, /Caminho do backup/],
    ['backup mode', { after: { ...after, [backupState]: { ...file('old state'), mode: 0o600 } } }, /Backup do estado anterior/],
    ['preexisting backup', { before: { ...before, [backup]: { kind: 'directory', mode: 0o755 } } }, /já existia/],
  ]) await t.test(label, () => assert.throws(() => checkPreservedManagedEdit({ ...valid, ...change }), message));
});

test('verificação OSS detecta alteração dos bytes do índice com entradas inalteradas', t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-index-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.git')); writeFileSync(join(root, '.git/config'), 'config');
  writeFileSync(join(root, '.git/index'), 'binary index before');
  const git = () => 'stable output';
  const before = gitSnapshot(root, git);
  writeFileSync(join(root, '.git/index'), 'binary index after');
  const after = gitSnapshot(root, git);
  assert.equal(before.index, after.index);
  assert.notEqual(before.indexSha256, after.indexSha256);
  assert.throws(() => checkOriginals(root, { files: {}, git: before }, git), /Git indexSha256 alterado/);
});

test('verificação OSS rejeita bloco gerenciado acrescentado a código de aplicação', t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-code-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.git')); writeFileSync(join(root, '.git/config'), 'config');
  mkdirSync(join(root, 'src')); writeFileSync(join(root, 'src/index.mjs'), 'export const answer = 42;\n');
  const original = fileSnapshot(root, 'src/index.mjs');
  const block = '<!-- BEGIN AGENTDEVKIT -->\nref\n<!-- END AGENTDEVKIT -->';
  writeFileSync(join(root, 'src/index.mjs'), `export const answer = 42;\n\n${block}\n`);
  mkdirSync(join(root, '.pbai4devs/state'), { recursive: true });
  writeFileSync(join(root, '.pbai4devs/state/agentdevkit.json'), JSON.stringify({ blocks: { 'src/index.mjs': hash(block) } }));
  assert.throws(() => checkOriginals(root, { files: { 'src/index.mjs': original }, git: {} }, () => ''), /não aceita bloco gerenciado/);
});

test('verificação OSS aceita somente acréscimos íntegros em entradas e recursos nativos', t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-native-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.git')); writeFileSync(join(root, '.git/config'), 'config');
  const entries = ['AGENTS.md', '.claude/agents/revisor.md', '.github/instructions/qualidade.instructions.md'];
  const originals = {}, blocks = {};
  const block = '<!-- BEGIN AGENTDEVKIT -->\nref\n<!-- END AGENTDEVKIT -->';
  for (const name of entries) {
    const path = join(root, name); mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, 'Instruções humanas.\n'); originals[name] = fileSnapshot(root, name);
    writeFileSync(path, `Instruções humanas.\n\n${block}\n`); blocks[name] = hash(block);
  }
  mkdirSync(join(root, '.pbai4devs/state'), { recursive: true });
  writeFileSync(join(root, '.pbai4devs/state/agentdevkit.json'), JSON.stringify({ blocks }));
  const git = () => 'stable output', baseline = { files: originals, git: gitSnapshot(root, git) };
  assert.doesNotThrow(() => checkOriginals(root, baseline, git));
  writeFileSync(join(root, entries[1]), `Instruções modificadas.\n\n${block}\n`);
  assert.throws(() => checkOriginals(root, baseline, git), /Conteúdo original alterado/);
});

test('verificação OSS rejeita substituição de link por arquivo com bloco', { skip: process.platform === 'win32' }, t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-link-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const path = join(root, 'CLAUDE.md');
  symlinkSync('human.md', path);
  const original = fileSnapshot(root, 'CLAUDE.md');
  assert.equal(original.kind, 'symlink');
  const git = () => '';
  const baseline = { files: { 'CLAUDE.md': original }, git: { head: '', index: '', stagedDiff: '', remotes: '', configSha256: hash('') } };
  mkdirSync(join(root, '.git')); writeFileSync(join(root, '.git/config'), '');
  unlinkSync(path);
  const block = '<!-- BEGIN AGENTDEVKIT -->\n@AGENTS.md\n<!-- END AGENTDEVKIT -->';
  writeFileSync(path, `human.md\n\n${block}\n`); chmodSync(path, original.mode);
  assert.equal(fileSnapshot(root, 'CLAUDE.md').kind, 'file');
  mkdirSync(join(root, '.pbai4devs/state'), { recursive: true });
  writeFileSync(join(root, '.pbai4devs/state/agentdevkit.json'), JSON.stringify({ blocks: { 'CLAUDE.md': hash(block) } }));
  assert.throws(() => checkOriginals(root, baseline, git), /Tipo do arquivo original alterado/);
});

test('verificação OSS não atravessa ancestral substituído por link mesmo com bytes iguais', { skip: process.platform === 'win32' }, t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-ancestor-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'src')); writeFileSync(join(root, 'src/index.mjs'), 'original code\n');
  const original = fileSnapshot(root, 'src/index.mjs');
  renameSync(join(root, 'src'), join(root, 'original-src'));
  symlinkSync('original-src', join(root, 'src'), 'dir');
  assert.throws(() => fileSnapshot(root, 'src/index.mjs'), /Link simbólico em diretório ancestral/);
  assert.equal(original.kind, 'file');
});
