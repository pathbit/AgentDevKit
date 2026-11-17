import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkDoctorIssues, checkExcludeOrigin, checkHumanExcludeBytes, checkNativeOwnership, checkOriginals, checkPreservedLinks, checkPreservedManagedEdit, checkStandaloneSync, checkSyncIssues, classifyIgnoreStatus, environment, fileSnapshot, gitSnapshot, hash, linkedDirectoryPaths, mayAliasPath, outputDirectory, parseCliResult, prepareOutput, stateJson } from './oss-compatibility.mjs';

test('artefatos visíveis são observados e falhas do Git são recusadas', () => {
  assert.deepEqual(classifyIgnoreStatus('tmp/probe', 0), { path: 'tmp/probe', ignored: true, status: 0 });
  assert.deepEqual(classifyIgnoreStatus('tmp/probe', 1), { path: 'tmp/probe', ignored: false, status: 1 });
  assert.throws(() => classifyIgnoreStatus('tmp/probe', 128), /Falha ao consultar ignore/);
  assert.throws(() => classifyIgnoreStatus('tmp/probe', null), /Falha ao consultar ignore/);
});

test('prova de exclusão humana exige a regra e origem exatas', () => {
  const valid = '.git/info/exclude:2:/oss-human-private/\toss-human-private/probe\n';
  assert.doesNotThrow(() => checkExcludeOrigin(valid));
  assert.throws(() => checkExcludeOrigin(valid.replace('.git/info/exclude', '.gitignore')), /não foi a regra efetiva/);
  assert.throws(() => checkExcludeOrigin(valid.replace('/oss-human-private/', '!/oss-human-private/')), /não foi a regra efetiva/);
  assert.throws(() => checkExcludeOrigin(valid + valid), /não foi a regra efetiva/);
});

test('doctor deve identificar exatamente a fixture privada visível, sem omitir outras falhas', () => {
  const path = '.opencode/settings.local.json';
  assert.doesNotThrow(() => checkDoctorIssues({ issues: [{ code: 'private-file-visible', path }] }, path, false));
  assert.doesNotThrow(() => checkDoctorIssues({ issues: [] }, path, true));
  assert.throws(() => checkDoctorIssues({ issues: [] }, path, false), /problemas ausentes/);
  assert.throws(() => checkDoctorIssues({ issues: [{ code: 'private-file-visible', path }, { code: 'broken' }] }, path, false), /inesperados/);
  assert.throws(() => checkDoctorIssues({ issues: [{ code: 'private-file-visible', path: 'outro' }] }, path, false), /inesperados/);
  assert.throws(() => checkDoctorIssues({}, path, true), /problemas ausentes/);
});

test('sync distingue alertas de visibilidade de erros além da fixture privada', () => {
  const path = '.opencode/settings.local.json';
  const value = { conflicts: [], localIgnore: { pending: [{ code: 'output-visible', path: 'AGENTS.md' }, { code: 'private-file-visible', path }], trackedOutputs: [] } };
  assert.doesNotThrow(() => checkSyncIssues(value, path, false));
  const extra = structuredClone(value); extra.localIgnore.pending.push({ code: 'ignore-ambiguous', path: '.gitignore' });
  assert.throws(() => checkSyncIssues(extra, path, false), /inesperados/);
  const tracked = structuredClone(value); tracked.localIgnore.trackedOutputs.push('.claude/secret');
  assert.throws(() => checkSyncIssues(tracked, path, false), /rastreados/);
  assert.throws(() => checkSyncIssues(value, path, true), /inesperados/);
});

test('sync independente exige resumo limpo e pendência privada exata', () => {
  const summary = '0 desatualizadas; 0 obsoletas; 0 conflitos; 0 origens nativas ausentes; 0 documentos antigos; 0 indices derivados; 0 gitignores; ';
  const path = '.opencode/settings.local.json';
  assert.doesNotThrow(() => checkStandaloneSync(`${summary}1 exclusoes locais.\nPendente: private-file-visible: ${path}\n`, path, false));
  assert.doesNotThrow(() => checkStandaloneSync(`${summary}0 exclusoes locais.\n`, path, true));
  assert.throws(() => checkStandaloneSync(`${summary}2 exclusoes locais.\nPendente: private-file-visible: ${path}\n`, path, false), /problemas inesperados/);
  assert.throws(() => checkStandaloneSync(`${summary}1 exclusoes locais.\nPendente: private-file-visible: outro\n`, path, false), /Pendências inesperadas/);
});

test('ambiente OSS não herda ignore padrão XDG da máquina', t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-xdg-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const output = join(root, 'output'), foreign = join(root, 'foreign'), project = join(root, 'project');
  mkdirSync(output); mkdirSync(join(foreign, 'git'), { recursive: true }); mkdirSync(project);
  writeFileSync(join(foreign, 'git', 'ignore'), '.claude/settings.local.json\n');
  assert.equal(spawnSync('git', ['init', '-q', '--template=', project]).status, 0);
  const isolated = environment(output);
  const command = env => spawnSync('git', ['-C', project, 'check-ignore', '--no-index', '--quiet', '--', '.claude/settings.local.json'], { env }).status;
  assert.equal(command({ ...isolated, XDG_CONFIG_HOME: foreign }), 0);
  assert.equal(command(isolated), 1);
});

function outputFixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'agentdevkit-oss-output-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const environment = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };
  const git = (args, env = environment) => {
    const result = spawnSync('git', ['-c', 'core.fsmonitor=false', '-C', root, ...args], { env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result;
  };
  git(['init', '--quiet', '--template=']);
  writeFileSync(join(root, '.gitignore'), 'tmp/\n');
  git(['add', '.gitignore']);
  return { root, environment, git, target: 'tmp/oss/run', index: join(root, '.git/index'), config: join(root, '.git/config') };
}

test('exceção ampla do EF6 pode reabrir um cache dentro do cliente', t => {
  const f = outputFixture(t), cache = join(f.root, '.claude/.Cache');
  mkdirSync(cache, { recursive: true }); writeFileSync(join(cache, 'probe'), 'fixture\n');
  const visible = () => f.git(['-c', 'core.excludesFile=', 'status', '--short', '--untracked-files=all']).stdout.split('\n').some(line => line.endsWith('.claude/.Cache/probe'));
  writeFileSync(join(f.root, '.gitignore'), '*.[Cc]ache\n');
  assert.equal(visible(), false);
  writeFileSync(join(f.root, '.gitignore'), '*.[Cc]ache\n!*.[Cc]ache/\n');
  assert.equal(visible(), true);
});

test('destino OSS respeita ignore efetivo e recusa Git redirecionado sem alterar índice', t => {
  const f = outputFixture(t), originalIndex = readFileSync(f.index), originalConfig = readFileSync(f.config);
  for (const name of ['GIT_DIR', 'git_work_tree', 'GIT_INDEX_FILE', 'git_common_dir']) {
    const value = name.toUpperCase() === 'GIT_INDEX_FILE' ? f.index : name.toUpperCase() === 'GIT_WORK_TREE' ? f.root : join(f.root, '.git');
    assert.throws(() => outputDirectory(f.target, { root: f.root, environment: { ...f.environment, [name]: value } }), /redirecionado/);
    assert.equal(existsSync(join(f.root, f.target)), false);
  }
  assert.equal(outputDirectory(f.target, { root: f.root, environment: f.environment }), join(realpathSync.native(f.root), f.target));
  assert.equal(existsSync(join(f.root, f.target)), false);
  assert.deepEqual(readFileSync(f.index), originalIndex);
  assert.deepEqual(readFileSync(f.config), originalConfig);

  writeFileSync(join(f.root, '.gitignore'), '# sem ignore local\n');
  const excludes = join(f.root, 'global-ignore'), config = join(f.root, 'global-gitconfig');
  writeFileSync(excludes, 'tmp/\n');
  writeFileSync(config, `[core]\n\texcludesFile = ${JSON.stringify(excludes)}\n`);
  assert.equal(outputDirectory(f.target, { root: f.root, environment: { ...f.environment, GIT_CONFIG_GLOBAL: config } }), join(realpathSync.native(f.root), f.target));
  writeFileSync(excludes, '');
  assert.throws(() => outputDirectory(f.target, { root: f.root, environment: { ...f.environment, GIT_CONFIG_GLOBAL: config } }), /ignorada/);
  assert.deepEqual(readFileSync(f.index), originalIndex);
  assert.deepEqual(readFileSync(f.config), originalConfig);
});

test('comparação OSS considera nomes curtos Windows sem til e distingue entradas reais', t => {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'oss-short-name-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const staged = 'tmp/ALT/human', target = 'tmp/long-directory/run';
  mkdirSync(join(root, 'tmp'));
  assert.equal(mayAliasPath(staged, target, { root, platform: 'win32' }), true);
  assert.equal(mayAliasPath(staged, target, { root, platform: 'linux' }), false);
  mkdirSync(join(root, 'tmp', 'long-directory'));
  assert.equal(mayAliasPath(staged, target, { root, platform: 'win32' }), false);
  mkdirSync(join(root, 'tmp', 'ALT'));
  assert.equal(mayAliasPath(staged, target, { root, platform: 'win32' }), false);
  assert.equal(mayAliasPath('tmp/LONGDI~1/human', target, { root, platform: 'win32' }), existsSync(join(root, 'tmp', 'LONGDI~1')));
});

test('fluxo OSS simulado em Windows aceita ancestral de saída ausente e src staged existente', t => {
  const f = outputFixture(t);
  mkdirSync(join(f.root, 'src')); writeFileSync(join(f.root, 'src/file.js'), 'humano\n');
  f.git(['add', '--', 'src/file.js']);
  const index = readFileSync(f.index), descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  try {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    assert.equal(mayAliasPath('src/file.js', f.target, { root: f.root }), false);
    assert.equal(mayAliasPath('ALT/file.js', f.target, { root: f.root }), true);
    const output = outputDirectory(f.target, { root: f.root, environment: f.environment });
    prepareOutput(output, f.root).verifyOutput();
  } finally { Object.defineProperty(process, 'platform', descriptor); }
  assert.equal(readFileSync(join(f.root, 'src/file.js'), 'utf8'), 'humano\n');
  assert.deepEqual(readFileSync(f.index), index);
});

test('Windows nativo ou simulado recusa nome curto staged ausente no destino OSS', t => {
  const f = outputFixture(t), target = 'tmp/long-directory/run';
  mkdirSync(join(f.root, 'tmp'));
  const object = spawnSync('git', ['-c', 'core.fsmonitor=false', '-C', f.root, 'hash-object', '-w', '--stdin'], { env: f.environment, input: 'humano', encoding: 'utf8' });
  assert.equal(object.status, 0, object.stderr);
  const add = spawnSync('git', ['-c', 'core.fsmonitor=false', '-C', f.root, 'update-index', '--index-info'], { env: f.environment, input: `100644 ${object.stdout.trim()}\ttmp/ALT/human\n`, encoding: 'utf8' });
  assert.equal(add.status, 0, add.stderr);
  const before = readFileSync(f.index);
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  try { Object.defineProperty(process, 'platform', { value: 'win32' }); assert.throws(() => outputDirectory(target, { root: f.root, environment: f.environment }), /staged|ambíguo/); }
  finally { Object.defineProperty(process, 'platform', descriptor); }
  assert.equal(existsSync(join(f.root, target)), false); assert.deepEqual(readFileSync(f.index), before);
});

test('destino OSS recusa ancestrais staged e aliases Unicode sem criar a pasta', async t => {
  for (const [staged, target] of [['tmp/oss', 'tmp/oss/run'], ['tmp/oss/Run/human', 'tmp/oss/run'], ['tmp/oss/SS/human', 'tmp/oss/ß']]) await t.test(staged, t => {
    const f = outputFixture(t), file = join(f.root, staged);
    mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, 'conteúdo humano');
    f.git(['add', '-f', '--', staged]);
    rmSync(join(f.root, 'tmp'), { recursive: true });
    const before = readFileSync(f.index);
    assert.throws(() => outputDirectory(target, { root: f.root, environment: f.environment }), /staged|ambíguo/);
    assert.equal(existsSync(join(f.root, target)), false);
    assert.deepEqual(readFileSync(f.index), before);
  });
});

test('preparo OSS cria saída exclusiva com proteção local e preserva o índice', t => {
  const f = outputFixture(t), index = readFileSync(f.index), config = readFileSync(f.config);
  const output = outputDirectory(f.target, { root: f.root, environment: f.environment });
  const prepared = prepareOutput(output, f.root);
  assert.equal(prepared.outputRoot, output);
  assert.equal(readFileSync(join(output, '.gitignore'), 'utf8'), '# Exemplos gerados permanecem locais.\n*\n');
  assert.doesNotThrow(() => prepared.verifyOutput());
  assert.deepEqual(readFileSync(f.index), index); assert.deepEqual(readFileSync(f.config), config);
  writeFileSync(join(output, '.gitignore'), '# proteção alterada\n');
  assert.throws(() => prepared.verifyOutput(), /Proteção da saída alterada/);
});

test('preparo OSS aceita caminhos equivalentes com nomes curtos ou longos', t => {
  const f = outputFixture(t), index = readFileSync(f.index), config = readFileSync(f.config);
  // GitHub Windows runners often expose TEMP with an 8.3 component. Exercise
  // both spellings when available and the same contract on other platforms.
  const nativeRoot = realpathSync.native(f.root);
  const output = join(nativeRoot, f.target);
  const prepared = prepareOutput(output, f.root);
  assert.equal(prepared.outputRoot, output);
  assert.doesNotThrow(() => prepared.verifyOutput());
  assert.deepEqual(readFileSync(f.index), index); assert.deepEqual(readFileSync(f.config), config);
});

test('preparo OSS recusa ancestral trocado por link depois da validação', t => {
  const f = outputFixture(t), outside = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  writeFileSync(join(outside, 'human'), 'preservado');
  mkdirSync(join(f.root, 'tmp'));
  const output = outputDirectory(f.target, { root: f.root, environment: f.environment });
  renameSync(join(f.root, 'tmp'), join(f.root, 'previous-tmp'));
  try { symlinkSync(outside, join(f.root, 'tmp'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (process.platform === 'win32' && ['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip(`Link indisponível no Windows: ${error.code}`); return; }
    throw error;
  }
  const index = readFileSync(f.index);
  assert.throws(() => prepareOutput(output, f.root), /link/i);
  assert.equal(readFileSync(join(outside, 'human'), 'utf8'), 'preservado');
  assert.equal(existsSync(join(outside, 'oss')), false);
  assert.deepEqual(readFileSync(f.index), index);
});

test('preparo OSS recusa link no caminho informado antes de canonizá-lo', t => {
  const f = outputFixture(t), outside = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  try { symlinkSync(outside, join(f.root, 'tmp'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (process.platform === 'win32' && ['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip(`Link indisponível no Windows: ${error.code}`); return; }
    throw error;
  }
  const index = readFileSync(f.index);
  assert.throws(() => prepareOutput(join(f.root, f.target), f.root), /link/i);
  assert.equal(existsSync(join(outside, 'oss')), false);
  assert.deepEqual(readFileSync(f.index), index);
});

test('consulta OSS não executa fsmonitor configurado nem modifica o Git', t => {
  const f = outputFixture(t), marker = join(f.root, 'fsmonitor-marker'), hook = join(f.root, 'fsmonitor.sh');
  writeFileSync(hook, '#!/bin/sh\nprintf called >> fsmonitor-marker\nprintf "\\0"\n'); chmodSync(hook, 0o700);
  f.git(['config', 'core.fsmonitor', './fsmonitor.sh']);
  const environment = f.environment;
  const control = spawnSync('git', ['-C', f.root, 'ls-files'], { env: environment, encoding: 'utf8' });
  assert.equal(control.status, 0, control.stderr);
  assert.equal(existsSync(marker), true, 'O controle precisa comprovar que o hook executaria.'); unlinkSync(marker);
  const before = [readFileSync(f.index), readFileSync(f.config)];
  assert.equal(outputDirectory(f.target, { root: f.root, environment }), join(realpathSync.native(f.root), f.target));
  assert.equal(existsSync(marker), false);
  assert.deepEqual([readFileSync(f.index), readFileSync(f.config)], before);
});

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

test('exclusões locais não podem receber acréscimos nem alterações do kit', t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-exclude-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.git/info'), { recursive: true }); writeFileSync(join(root, '.git/config'), 'config');
  const path = join(root, '.git/info/exclude'), original = Buffer.from('# human\n/private/\n');
  writeFileSync(path, original);
  const git = () => '', baseline = { files: {}, git: gitSnapshot(root, git), excludeOriginal: original.toString('base64') };
  writeFileSync(path, Buffer.concat([original, Buffer.from('# BEGIN AGENTDEVKIT LOCAL example\n# END AGENTDEVKIT LOCAL example\n')]));
  assert.throws(() => checkOriginals(root, baseline, git), /Exclusões locais humanas foram alteradas/);
  writeFileSync(path, original);
  assert.doesNotThrow(() => checkOriginals(root, baseline, git));
  writeFileSync(path, '# modified\n/private/\n');
  assert.throws(() => checkOriginals(root, baseline, git), /Exclusões locais humanas foram alteradas/);
});

test('snapshot OSS detecta alterações de modo dos arquivos internos Git', t => {
  if (process.platform === 'win32') { t.skip('bits POSIX não comprovam ACL no Windows'); return; }
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-mode-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.git/info'), { recursive: true });
  for (const path of ['.git/config', '.git/index', '.git/info/exclude']) { writeFileSync(join(root, path), 'conteúdo\n'); chmodSync(join(root, path), 0o600); }
  const git = () => '', baseline = { files: {}, git: gitSnapshot(root, git) };
  for (const [path, field] of [['.git/config', 'configMode'], ['.git/index', 'indexMode'], ['.git/info/exclude', 'excludeMode']]) {
    chmodSync(join(root, path), 0o644);
    assert.throws(() => checkOriginals(root, baseline, git), new RegExp(`Git ${field} alterado`));
    chmodSync(join(root, path), 0o600);
  }
  assert.doesNotThrow(() => checkOriginals(root, baseline, git));
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
