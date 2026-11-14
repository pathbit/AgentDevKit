import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkHumanExcludeBytes, checkNativeOwnership, checkOriginals, checkPreservedLinks, checkPreservedManagedEdit, fileSnapshot, gitSnapshot, hash, linkedDirectoryPaths, parseCliResult, stateJson } from './oss-compatibility.mjs';

test('sentinelas nativas humanas não são adotadas integralmente mesmo com bytes idênticos', async t => {
  const paths = ['.claude/skills/human/SKILL.md', '.claude/skills/human/REFERENCE.md', '.claude/agents/revisor.md', '.claude/settings.local.json'];
  const value = hash('user content');
  assert.doesNotThrow(() => checkNativeOwnership({ files: {}, blocks: { [paths[2]]: value } }, { blocks: { [paths[0]]: value } }, paths));
  for (const path of paths) for (const field of ['main', 'entries', 'outputs', 'files', 'catalogs']) await t.test(`${field}: ${path}`, () => {
    const state = { files: field === 'main' ? { [path]: value } : {} }, derived = field === 'main' ? {} : { [field]: { [path]: value } };
    assert.throws(() => checkNativeOwnership(state, derived, paths), /propriedade integral/);
  });
});

test('snapshot inclui alvos internos de diretório sem percorrer links nem aceitar alvos externos', () => {
  const root = join(tmpdir(), 'agentdevkit-oss-link-snapshot');
  const snapshot = { '.codex/skills': { kind: 'symlink', target: '../.claude/skills' },
    '.codex/external': { kind: 'symlink', target: '../../outside' },
    '.codex/chained': { kind: 'symlink', target: '../alias' },
    alias: { kind: 'symlink', target: '.claude/skills' },
    '.claude/skills': { kind: 'directory' }, '.claude/skills/human': { kind: 'directory' },
    '.claude/skills/human/SKILL.md': { kind: 'file' }, '.claude/skills2/other': { kind: 'file' } };
  assert.deepEqual(linkedDirectoryPaths(root, snapshot).sort(), ['.claude/skills', '.claude/skills/human', '.claude/skills/human/SKILL.md'].sort());
});

test('links existentes são preservados mesmo sem rota fallback no plano', async t => {
  const link = '.codex/skills', entrypoint = 'CLAUDE.md';
  const snapshot = target => ({ kind: 'symlink', mode: 0o777, target, sha256: hash(target) });
  const before = { [link]: snapshot('../.claude/skills'), [entrypoint]: snapshot('AGENTS.md') };
  const valid = { before, after: structuredClone(before), state: { files: {}, blocks: {} }, derived: {},
    outcome: { plan: [{ path: '.agents/skills/projeto/demo/SKILL.md', action: 'create' }], preserved: [{ path: entrypoint, reason: 'symbolic-link' }] }, requiredReports: [entrypoint] };
  assert.doesNotThrow(() => checkPreservedLinks(valid));
  for (const [label, change, expected] of [
    ['link substituído', { after: { ...before, [link]: { kind: 'file', mode: 0o777, sha256: hash('../.claude/skills') } } }, /Link original alterado/],
    ['alvo alterado', { after: { ...before, [link]: snapshot('../other') } }, /Link original alterado/],
    ['modo alterado', { after: { ...before, [link]: { ...before[link], mode: 0o700 } } }, /Link original alterado/],
    ['ownership arquivo', { state: { files: { [`${link}/demo/SKILL.md`]: 'hash' }, blocks: {} } }, /adotado/],
    ['ownership bloco', { state: { files: {}, blocks: { [link]: 'hash' } } }, /adotado/],
    ['ownership derivado', { derived: { outputs: { [`${link}/demo/SKILL.md`]: 'hash' } } }, /adotado/],
    ['ownership derivado bloco', { derived: { blocks: { [link]: 'hash' } } }, /adotado/],
    ['remoção derivada', { derived: { removedBlocks: [`${link}/demo/SKILL.md`] } }, /estado de remoção/],
    ['ação sob link', { outcome: { ...valid.outcome, plan: [{ path: `${link}/demo/SKILL.md`, action: 'create' }] } }, /Plano altera/],
    ['ação no ancestral', { outcome: { ...valid.outcome, plan: [{ path: '.codex', action: 'remove' }] } }, /Plano altera/],
    ['colisão omitida', { outcome: { ...valid.outcome, preserved: [] } }, /colisão não foi informado/],
    ['motivo incorreto', { outcome: { ...valid.outcome, preserved: [{ path: entrypoint, reason: 'existing-file' }] } }, /colisão não foi informado/],
  ]) await t.test(label, () => assert.throws(() => checkPreservedLinks({ ...valid, ...change }), expected));
});

test('alvo interno aceita somente criações regulares diretamente planejadas', async t => {
  const root = join(tmpdir(), 'agentdevkit-oss-tree'), link = '.codex/skills', target = '.claude/skills';
  const directory = { kind: 'directory', mode: 0o755 };
  const file = value => ({ kind: 'file', mode: 0o644, sha256: hash(value) });
  const before = { [link]: { kind: 'symlink', mode: 0o777, target: '../.claude/skills', sha256: hash('../.claude/skills') },
    [target]: directory, [`${target}/human.md`]: file('human') };
  const generated = `${target}/projeto/example/SKILL.md`;
  const after = { ...before, [`${target}/projeto`]: directory, [`${target}/projeto/example`]: directory, [generated]: file('planned') };
  const valid = { root, before, after, state: { files: {}, blocks: {} }, derived: {},
    outcome: { plan: [{ path: generated, action: 'create' }], preserved: [] } };
  assert.doesNotThrow(() => checkPreservedLinks(valid));
  for (const [label, change, expected] of [
    ['arquivo não planejado', { after: { ...after, [`${target}/intruso.md`]: file('unexpected') } }, /Entrada inesperada/],
    ['diretório não planejado', { after: { ...after, [`${target}/intruso`]: directory } }, /Entrada inesperada/],
    ['diretório vazio planejado', { after: Object.fromEntries(Object.entries(after).filter(([p]) => p !== generated)) }, /Entrada inesperada/],
    ['novo link planejado', { after: { ...after, [generated]: { kind: 'symlink', mode: 0o777, target: 'other', sha256: hash('other') } } }, /Entrada inesperada/],
    ['ação update não autoriza criação', { outcome: { ...valid.outcome, plan: [{ path: generated, action: 'update' }] } }, /Entrada inesperada/],
    ['plano por alias não autoriza criação direta', { outcome: { ...valid.outcome, plan: [{ path: `${link}/projeto/example/SKILL.md`, action: 'create' }] } }, /Plano altera link humano/],
    ['remoção de arquivo anterior', { after: Object.fromEntries(Object.entries(after).filter(([p]) => p !== `${target}/human.md`)) }, /Entrada removida/],
    ['substituição do diretório', { after: { ...after, [target]: { kind: 'symlink', mode: 0o777, target: 'elsewhere', sha256: hash('elsewhere') } } }, /Diretório ou link do alvo alterado/],
  ]) await t.test(label, () => assert.throws(() => checkPreservedLinks({ ...valid, ...change }), expected));
  const late = { ...valid, treeBefore: after, after: { ...after, [`${target}/unexpected.md`]: file('late') }, outcome: { plan: [], preserved: [] } };
  assert.throws(() => checkPreservedLinks(late), /Entrada inesperada/);
  const adoptedLater = { ...valid, treeBefore: after, after, state: { files: { [`${link}/extra`]: 'hash' }, blocks: {} }, outcome: { plan: [], preserved: [] } };
  assert.throws(() => checkPreservedLinks(adoptedLater), /adotado/);
  const changed = { ...after, [generated]: file('new content') };
  const update = { ...valid, treeBefore: after, after: changed, state: { files: { [generated]: hash('new content') }, blocks: {} }, outcome: { plan: [{ path: generated, action: 'update' }], preserved: [] } };
  assert.doesNotThrow(() => checkPreservedLinks(update));
  assert.throws(() => checkPreservedLinks({ ...update, outcome: { plan: [], preserved: [] } }), /sem update comprovado/);
  assert.throws(() => checkPreservedLinks({ ...update, state: { files: { [generated]: hash('wrong') }, blocks: {} } }), /sem update comprovado/);
  assert.throws(() => checkPreservedLinks({ ...update, after: { ...changed, [generated]: { ...changed[generated], mode: 0o600 } } }), /sem update comprovado/);
  assert.throws(() => checkPreservedLinks({ ...update, after: { ...after, [`${target}/human.md`]: file('changed human') }, treeBefore: after }), /sem update comprovado/);
});

test('leitura do estado recusa link no arquivo ou ancestral', async t => {
  for (const component of ['.pbai4devs', '.pbai4devs/state', '.pbai4devs/state/agentdevkit.json']) await t.test(component, t => {
    const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-state-link-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const outside = join(root, 'outside'), target = join(root, component);
    mkdirSync(outside); writeFileSync(join(outside, 'sentinel'), '{"outside":true}');
    mkdirSync(join(root, '.pbai4devs/state'), { recursive: true });
    writeFileSync(join(root, '.pbai4devs/state/agentdevkit.json'), '{"inside":true}');
    const isFile = component.endsWith('.json');
    if (isFile) unlinkSync(target); else rmSync(target, { recursive: true });
    try { symlinkSync(isFile ? join(outside, 'sentinel') : outside, target, isFile ? 'file' : process.platform === 'win32' ? 'junction' : 'dir'); }
    catch (error) {
      if (process.platform === 'win32' && ['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip(`Link indisponível no Windows: ${error.code}`); return; }
      throw error;
    }
    assert.throws(() => stateJson(root, '.pbai4devs/state/agentdevkit.json'), /Link simbólico|Estado não é arquivo regular/);
    assert.equal(readFileSync(join(outside, 'sentinel'), 'utf8'), '{"outside":true}');
  });
});

test('atualização de arquivo humano exige bloco íntegro e preserva bytes originais', t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-human-block-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const link = '.codex/skills', destination = '.claude/skills', path = `${destination}/human.md`;
  mkdirSync(join(root, destination), { recursive: true });
  writeFileSync(join(root, path), 'Original humano.\n');
  const original = fileSnapshot(root, path), directory = { kind: 'directory', mode: 0o755 };
  const before = { [link]: { kind: 'symlink', mode: 0o777, target: '../.claude/skills', sha256: hash('../.claude/skills') }, [destination]: directory, [path]: original };
  const block = '<!-- BEGIN AGENTDEVKIT -->\nreference\n<!-- END AGENTDEVKIT -->';
  writeFileSync(join(root, path), `Original humano.\n\n${block}\n`);
  const after = { ...before, [path]: fileSnapshot(root, path) };
  const valid = { root, before, after, state: { files: {}, blocks: { [path]: hash(block) } }, derived: {}, outcome: { plan: [{ path, action: 'update' }], preserved: [] } };
  assert.doesNotThrow(() => checkPreservedLinks(valid));
  writeFileSync(join(root, path), `Alteração humana perdida.\n\n${block}\n`);
  assert.throws(() => checkPreservedLinks({ ...valid, after: { ...after, [path]: fileSnapshot(root, path) } }), /sem update comprovado/);
});

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

test('exclusões locais humanas sobrevivem a acréscimos do kit', t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-exclude-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.git/info'), { recursive: true }); writeFileSync(join(root, '.git/config'), 'config');
  const path = join(root, '.git/info/exclude'), original = Buffer.from('# human\n/private/\n');
  writeFileSync(path, original);
  const git = () => '', baseline = { files: {}, git: gitSnapshot(root, git), excludeOriginal: original.toString('base64') };
  writeFileSync(path, Buffer.concat([original, Buffer.from('# BEGIN AGENTDEVKIT LOCAL example\n# END AGENTDEVKIT LOCAL example\n')]));
  assert.doesNotThrow(() => checkOriginals(root, baseline, git));
  writeFileSync(path, '# modified\n/private/\n');
  assert.throws(() => checkOriginals(root, baseline, git), /Exclusões locais humanas foram alteradas/);
});

test('leitura das exclusões recusa ancestral simbólico mesmo com conteúdo igual', t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-exclude-link-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.git')); writeFileSync(join(root, '.git/config'), 'config');
  const external = join(root, 'external'), original = Buffer.from('# human\n/private/\n');
  mkdirSync(external); writeFileSync(join(external, 'exclude'), original);
  try { symlinkSync(external, join(root, '.git/info'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (process.platform === 'win32' && ['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip(`Link indisponível no Windows: ${error.code}`); return; }
    throw error;
  }
  assert.throws(() => checkHumanExcludeBytes(root, original), /Caminho Git inválido ou link simbólico/);
  assert.deepEqual(readFileSync(join(external, 'exclude')), original);
});

test('regra humana de exclusão continua efetiva e detecta exceção posterior', t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-ignore-semantics-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^git_/i.test(key)));
  env.GIT_CONFIG_NOSYSTEM = '1'; env.GIT_CONFIG_GLOBAL = join(root, 'no-git-config'); env.GIT_OPTIONAL_LOCKS = '0';
  const git = (...args) => spawnSync('git', ['-c', 'core.excludesFile=', '-C', root, ...args], { env, encoding: 'utf8' });
  assert.equal(git('init', '--quiet', '--template=').status, 0);
  const path = join(root, '.git/info/exclude'); mkdirSync(join(root, '.git/info'), { recursive: true });
  const original = '# human\n/oss-human-private/\n';
  writeFileSync(path, `${original}# BEGIN AGENTDEVKIT LOCAL test\n/other/\n# END AGENTDEVKIT LOCAL test\n`);
  assert.equal(git('check-ignore', '--no-index', '--quiet', '--', 'oss-human-private/probe').status, 0);
  writeFileSync(path, `${original}!/oss-human-private/\n!/oss-human-private/probe\n`);
  assert.ok(readFileSync(path, 'utf8').startsWith(original));
  assert.equal(git('check-ignore', '--no-index', '--quiet', '--', 'oss-human-private/probe').status, 1);
});

test('snapshot Git recusa links e tipos inválidos antes de chamar Git', async t => {
  for (const path of ['.git/index', '.git/config', '.git/info/exclude', '.git/info', '.git']) await t.test(path, t => {
    const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-git-link-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const outside = join(root, 'outside'), gitPath = join(root, '.git');
    mkdirSync(outside); writeFileSync(join(outside, 'sentinel'), 'outside unchanged\n');
    mkdirSync(join(gitPath, 'info'), { recursive: true });
    writeFileSync(join(gitPath, 'index'), 'index'); writeFileSync(join(gitPath, 'config'), 'config');
    writeFileSync(join(gitPath, 'info/exclude'), 'exclude');
    const target = join(root, path), directory = path === '.git' || path === '.git/info';
    if (directory) rmSync(target, { recursive: true }); else unlinkSync(target);
    try { symlinkSync(directory ? outside : join(outside, 'sentinel'), target, directory ? (process.platform === 'win32' ? 'junction' : 'dir') : 'file'); }
    catch (error) {
      if (process.platform === 'win32' && ['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip(`Link indisponível no Windows: ${error.code}`); return; }
      throw error;
    }
    let calls = 0;
    assert.throws(() => gitSnapshot(root, () => { calls++; return ''; }), /Caminho Git inválido ou link simbólico/);
    assert.equal(calls, 0);
    assert.equal(readFileSync(join(outside, 'sentinel'), 'utf8'), 'outside unchanged\n');
  });
  await t.test('índice não é arquivo regular', t => {
    const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-git-type-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.git/index'), { recursive: true }); writeFileSync(join(root, '.git/config'), 'config');
    let calls = 0;
    assert.throws(() => gitSnapshot(root, () => { calls++; return ''; }), /Caminho Git inválido ou link simbólico/);
    assert.equal(calls, 0);
  });
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
