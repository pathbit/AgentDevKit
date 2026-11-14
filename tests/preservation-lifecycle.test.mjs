import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { applyPlan, planInstallation } from '../src/install.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(repository, 'bin/agentdevkit.mjs');
const state = '.pbai4devs/state/agentdevkit.json';
const digest = value => createHash('sha256').update(value).digest('hex');
const skill = (name, description, body = 'Texto próprio da equipe.') =>
  `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\n${body}\n`;

function fixture(t) {
  const directory = join(repository, '.agent-tests');
  mkdirSync(directory, { recursive: true });
  const root = mkdtempSync(join(directory, 'preservation-lifecycle-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}`);
    return result.stdout;
  };
  git('init', '--quiet');
  const put = (path, value) => {
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, value);
  };
  const read = path => readFileSync(join(root, path), 'utf8');
  const cli = (...args) => {
    const result = spawnSync(process.execPath, [bin, ...args, '--target', root, '--json'], {
      encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024,
    });
    assert.equal(result.status, 0, `${args.join(' ')}: ${result.error?.message || ''}\n${result.stderr}\n${result.stdout}`);
    const output = JSON.parse(result.stdout);
    assert.equal(output.ok, true, result.stdout);
    return output;
  };
  const ignore = '# Regras humanas\nnode_modules/\n.env\n!.env.example\n';
  put('.gitignore', ignore);
  return { root, git, put, read, cli, ignore };
}

test('consultas Git sem locks opcionais preservam bytes do índice e alterações', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-git-consultas-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: join(root, 'sem-config-global'), GIT_TERMINAL_PROMPT: '0' };
  const git = (args, extra = {}) => {
    const result = spawnSync('git', ['-C', root, ...args], {
      encoding: 'utf8', env: { ...env, ...extra }, windowsHide: true,
    });
    assert.equal(result.status, 0, `${args.join(' ')}: ${result.error?.message || ''}\n${result.stderr}`);
    return result.stdout;
  };
  git(['init', '--quiet']);
  const clean = join(root, 'limpo.txt'), modified = join(root, 'trabalho.txt');
  writeFileSync(clean, 'Conteúdo mantido.\n');
  writeFileSync(modified, 'Original.\n');
  git(['add', '--', 'limpo.txt', 'trabalho.txt']);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
    'commit', '--quiet', '-m', 'test: criar fixture']);
  writeFileSync(modified, 'Preparado.\n');
  git(['add', '--', 'trabalho.txt']);
  writeFileSync(modified, 'Não preparado.\n');
  writeFileSync(join(root, 'novo.txt'), 'Não rastreado.\n');
  const beforeMtime = statSync(clean).mtimeMs;
  utimesSync(clean, new Date('2001-01-01T00:00:00Z'), new Date('2001-01-01T00:00:00Z'));
  assert.notEqual(statSync(clean).mtimeMs, beforeMtime, 'a fixture precisa de stat cache desatualizado');

  const readOnly = { GIT_OPTIONAL_LOCKS: '0' };
  const entries = git(['ls-files', '--stage', '-z'], readOnly);
  const index = readFileSync(join(root, '.git', 'index'));
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'], readOnly);
  const staged = git(['diff', '--cached', '--no-color', '--', 'trabalho.txt'], readOnly);
  const unstaged = git(['diff', '--no-color', '--', 'trabalho.txt'], readOnly);
  assert.match(status, /MM trabalho\.txt/);
  assert.match(status, /\?\? novo\.txt/);
  assert.match(staged, /\+Preparado\./);
  assert.match(unstaged, /\+Não preparado\./);
  assert.match(git(['log', '-1', '--format=%s'], readOnly), /test: criar fixture/);
  assert.deepEqual(readFileSync(join(root, '.git', 'index')), index);
  assert.equal(git(['ls-files', '--stage', '-z'], readOnly), entries);
  assert.equal(readFileSync(modified, 'utf8'), 'Não preparado.\n');
  assert.equal(readFileSync(join(root, 'novo.txt'), 'utf8'), 'Não rastreado.\n');
});

test('README legado próprio e sua pasta não são removidos por heurística ou force', t => {
  const f = fixture(t);
  const legacy = '.pbai4devs/adapters/README.md';
  const content = '# Adaptadores\n\nAntigravity: instruções privadas da equipe.\n';
  f.put(legacy, content);
  f.put('.pbai4devs/adapters/antigravity/equipe.txt', 'Configuração própria.\n');
  f.git('add', '--', '.gitignore', legacy, '.pbai4devs/adapters/antigravity/equipe.txt');
  const index = f.git('ls-files', '--stage', '-z');
  for (const args of [['init', '--agents', 'codex', '--force'], ['update'], ['sync'], ['update', '--force'], ['sync', '--force']]) {
    const result = f.cli(...args);
    assert.ok(result.preserved.some(item => item.path === legacy), args.join(' '));
    assert.equal(f.read(legacy), content);
    assert.equal(f.read('.pbai4devs/adapters/antigravity/equipe.txt'), 'Configuração própria.\n');
    assert.equal(f.git('ls-files', '--stage', '-z'), index);
    assert.equal(f.read('.gitignore'), f.ignore);
  }
});

test('colisão e recursos adicionais do hub são preservados e descobertos sem ownership', t => {
  const f = fixture(t), collision = '.pbai4devs/skills/projeto/criar-skill/SKILL.md';
  const custom = skill('criar-skill', 'Processo próprio de skills.');
  const extra = '.pbai4devs/skills/equipe/skill-propria/SKILL.md';
  const extraContent = skill('skill-propria', 'Processo adicional da equipe.');
  f.put(collision, custom);
  f.put(extra, extraContent);
  f.put('.claude/settings.json', '{"human":true}\n');
  f.git('add', '--', '.gitignore', collision, extra, '.claude/settings.json');
  const index = f.git('ls-files', '--stage', '-z');
  for (const args of [['init', '--agents', 'codex,claude', '--force'], ['sync'], ['update', '--force'], ['sync', '--check']]) {
    const result = f.cli(...args);
    assert.equal(f.read(collision), custom);
    assert.equal(f.read(extra), extraContent);
    assert.equal(f.read('.claude/settings.json'), '{"human":true}\n');
    const manifest = JSON.parse(f.read(state));
    assert.equal(Object.hasOwn(manifest.files, collision), false, 'não adquirir ownership da colisão');
    assert.equal(Object.hasOwn(manifest.files, extra), false, 'não adquirir ownership do recurso extra');
    assert.match(f.read('.claude/skills/criar-skill/SKILL.md'), /Processo próprio de skills/);
    assert.match(f.read('.claude/skills/skill-propria/SKILL.md'), /Processo adicional da equipe/);
    assert.equal(f.git('ls-files', '--stage', '-z'), index);
    assert.equal(f.read('.gitignore'), f.ignore);
    if (args[0] !== 'sync') assert.ok(result.preserved.some(item => item.path === collision));
  }
  assert.deepEqual(f.cli('update', '--dry-run').plan, []);
});

test('edição em fonte gerenciada não é adotada nem sobrescrita por sync ou force', t => {
  const f = fixture(t), path = '.pbai4devs/skills/projeto/criar-skill/SKILL.md';
  f.cli('init', '--agents', 'codex,claude');
  const human = f.read(path).replace(/^description: .+$/m, 'description: Alteração humana da equipe.');
  assert.notEqual(human, f.read(path));
  f.put(path, human);
  f.git('add', '--', '.gitignore', path);
  const index = f.git('ls-files', '--stage', '-z');
  for (const args of [['sync'], ['update', '--force'], ['sync', '--check']]) {
    f.cli(...args);
    assert.equal(f.read(path), human);
    assert.equal(Object.hasOwn(JSON.parse(f.read(state)).files, path), false);
    assert.match(f.read('.claude/skills/criar-skill/SKILL.md'), /Alteração humana da equipe/);
    assert.equal(f.git('ls-files', '--stage', '-z'), index);
    assert.equal(f.read('.gitignore'), f.ignore);
  }
});

test('remove somente fonte obsoleta intacta e preserva edições e arquivos extras próximos', t => {
  const f = fixture(t);
  f.cli('init', '--agents', 'codex,claude');
  const obsolete = '.pbai4devs/skills/equipe/obsoleta/SKILL.md';
  const edited = '.pbai4devs/skills/equipe/editada/SKILL.md';
  const extra = '.pbai4devs/skills/equipe/obsoleta/notas.txt';
  const old = skill('obsoleta', 'Recurso antigo do kit.');
  const oldEdited = skill('editada', 'Outra versão antiga do kit.');
  const current = `${oldEdited}\nModificação humana.\n`;
  f.put(obsolete, old);
  f.put(edited, current);
  f.put(extra, 'Não remover.\n');
  const manifest = JSON.parse(f.read(state));
  manifest.files[obsolete] = digest(old);
  manifest.files[edited] = digest(oldEdited);
  f.put(state, `${JSON.stringify(manifest, null, 2)}\n`);
  f.git('add', '--', '.gitignore', edited, extra);
  const index = f.git('ls-files', '--stage', '-z');
  const preview = f.cli('update', '--dry-run', '--force');
  assert.ok(preview.plan.some(item => item.path === obsolete && item.action === 'remove'));
  assert.ok(!preview.plan.some(item => item.path === edited && item.action === 'remove'));
  f.cli('update', '--force');
  assert.equal(existsSync(join(f.root, obsolete)), false);
  assert.equal(f.read(edited), current);
  assert.equal(f.read(extra), 'Não remover.\n');
  assert.equal(Object.hasOwn(JSON.parse(f.read(state)).files, edited), false);
  assert.equal(f.git('ls-files', '--stage', '-z'), index);
  assert.equal(f.read('.gitignore'), f.ignore);
  f.cli('sync');
  assert.equal(f.read(edited), current);
  assert.equal(f.read(extra), 'Não remover.\n');
});

test('README legado com ownership e hash íntegro pode ser removido sem afetar arquivos adjacentes', t => {
  const f = fixture(t), legacy = '.pbai4devs/adapters/README.md';
  f.cli('init', '--agents', 'codex');
  const content = '# Adaptadores\n\nAntigravity legado.\n';
  f.put(legacy, content);
  f.put('.pbai4devs/adapters/equipe.txt', 'Preservar.\n');
  const manifest = JSON.parse(f.read(state));
  manifest.files[legacy] = digest(content);
  f.put(state, `${JSON.stringify(manifest, null, 2)}\n`);
  const preview = f.cli('update', '--dry-run');
  assert.ok(preview.plan.some(item => item.path === legacy && item.action === 'remove'));
  f.cli('update');
  assert.equal(existsSync(join(f.root, legacy)), false);
  assert.equal(f.read('.pbai4devs/adapters/equipe.txt'), 'Preservar.\n');
});

for (const committed of [false, true]) test(`fonte com staged humano divergente é preservada ${committed ? 'com commit' : 'sem commit'}`, t => {
  const f = fixture(t), source = '.pbai4devs/skills/projeto/criar-skill/SKILL.md';
  f.cli('init', '--agents', 'codex');
  const original = f.read(source), human = `${original}\nConteúdo humano preparado.\n`;
  if (committed) {
    f.git('add', '--', '.gitignore', source);
    f.git('-c', 'user.name=Teste', '-c', 'user.email=test@example.invalid', 'commit', '--quiet', '-m', 'baseline');
  }
  f.put(source, human);
  f.git('add', '--', source);
  f.put(source, original);
  f.put('outro-arquivo.txt', 'Preparado.\n');
  f.git('add', '--', 'outro-arquivo.txt');
  f.put('outro-arquivo.txt', 'Também não preparado.\n');
  const index = f.git('ls-files', '--stage', '-z');
  const result = f.cli('update', '--force');
  assert.ok(result.preserved.some(item => item.path === source && item.reason === 'staged-content-differs'));
  assert.equal(f.read(source), original);
  assert.equal(f.git('show', `:${source}`), human);
  assert.equal(f.git('ls-files', '--stage', '-z'), index);
  assert.equal(Object.hasOwn(JSON.parse(f.read(state)).files, source), false);
  assert.equal(f.read('.gitignore'), f.ignore);
  f.cli('sync');
  assert.equal(f.git('show', `:${source}`), human);
  assert.equal(f.git('ls-files', '--stage', '-z'), index);
});

test('staged divergente criado após planejar bloqueia aplicação sem alterar arquivos', t => {
  const f = fixture(t);
  f.cli('init', '--agents', 'codex');
  const original = f.read('AGENTS.md');
  const plan = planInstallation({ target: f.root, mode: 'lang', language: 'en' });
  assert.ok(plan.changes.some(item => item.path === 'AGENTS.md'));
  f.put('AGENTS.md', `${original}\nRegra humana preparada.\n`);
  f.git('add', '-f', '--', 'AGENTS.md');
  f.put('AGENTS.md', original);
  const index = f.git('ls-files', '--stage', '-z'), oldState = f.read(state);
  assert.throws(() => applyPlan(plan), error => error.code === 'E_STAGED' && error.message.includes('update AGENTS.md'));
  assert.equal(f.read('AGENTS.md'), original);
  assert.equal(f.read(state), oldState);
  assert.equal(f.git('ls-files', '--stage', '-z'), index);
  assert.equal(f.read('.gitignore'), f.ignore);
});

for (const gitMissing of [false, true]) test(`projeto sem Git ${gitMissing ? 'instalado' : 'inicializado'} preserva arquivos próprios`, t => {
  const root = mkdtempSync(join(tmpdir(), 'preservation-no-git-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const path = '.pbai4devs/skills/projeto/criar-skill/SKILL.md';
  mkdirSync(dirname(join(root, path)), { recursive: true });
  const human = skill('criar-skill', 'Skill existente sem repositório.');
  writeFileSync(join(root, path), human);
  const environment = { ...process.env };
  if (gitMissing) {
    environment.PATH = join(root, 'git-unavailable');
    environment.Path = environment.PATH;
  }
  const result = spawnSync(process.execPath, [bin, 'init', '--agents', 'codex', '--force', '--target', root, '--json'], {
    encoding: 'utf8', timeout: 180000, env: environment,
  });
  assert.equal(result.status, 0, `${result.error?.stack || ''}\n${result.stderr}\n${result.stdout}`);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.localIgnore.status, 'no-git');
  assert.ok(output.preserved.some(item => item.path === path));
  assert.equal(readFileSync(join(root, path), 'utf8'), human);
});

test('link humano fora do escopo é preservado; link em fonte gerenciada é recusado', { skip: process.platform === 'win32' }, t => {
  const f = fixture(t), external = join(f.root, 'external');
  mkdirSync(external);
  writeFileSync(join(external, 'secret.txt'), 'Não alterar.\n');
  mkdirSync(join(f.root, '.pbai4devs'), { recursive: true });
  const ownLink = join(f.root, '.pbai4devs', 'minhas-notas');
  symlinkSync(external, ownLink, 'dir');
  const legacyLink = join(f.root, '.pbai4devs', 'adapters');
  symlinkSync(external, legacyLink, 'dir');
  f.cli('init', '--agents', 'codex', '--force');
  f.cli('update', '--force');
  assert.equal(lstatSync(ownLink).isSymbolicLink(), true);
  assert.equal(lstatSync(legacyLink).isSymbolicLink(), true);
  assert.equal(readFileSync(join(external, 'secret.txt'), 'utf8'), 'Não alterar.\n');
  const managedLink = join(f.root, '.pbai4devs', 'skills', 'equipe-link');
  symlinkSync(external, managedLink, 'dir');
  const result = spawnSync(process.execPath, [bin, 'update', '--force', '--target', f.root, '--json'], {
    encoding: 'utf8', timeout: 180000,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /E_SYMLINK/);
  assert.equal(lstatSync(managedLink).isSymbolicLink(), true);
  assert.equal(readFileSync(join(external, 'secret.txt'), 'utf8'), 'Não alterar.\n');
});

for (const flag of ['--assume-unchanged', '--skip-worktree']) test(`staged humano oculto por ${flag} permanece preservado`, t => {
  const f = fixture(t), source = '.pbai4devs/skills/projeto/criar-skill/SKILL.md';
  f.cli('init', '--agents', 'codex');
  const original = f.read(source), human = `${original}\nAlteração humana preparada.\n`;
  f.git('add', '--', source);
  f.git('-c', 'user.name=Teste', '-c', 'user.email=test@example.invalid', 'commit', '--quiet', '-m', 'baseline');
  f.put(source, human);
  f.git('add', '--', source);
  f.put(source, original);
  f.git('update-index', flag, '--', source);
  const index = readFileSync(join(f.root, '.git', 'index'));
  for (const args of [['update', '--dry-run', '--force'], ['update', '--force'], ['sync']]) {
    const result = f.cli(...args);
    assert.ok(result.preserved.some(item => item.path === source && item.reason === 'staged-content-differs'));
    assert.equal(f.read(source), original);
    assert.equal(f.git('show', `:${source}`), human);
    assert.deepEqual(readFileSync(join(f.root, '.git', 'index')), index);
  }
  assert.equal(f.read('.gitignore'), f.ignore);
});

for (const args of [['update', '--dry-run', '--force'], ['update', '--force']]) test(`Git indisponível em repositório existente bloqueia ${args.join(' ')}`, t => {
  const f = fixture(t), source = '.pbai4devs/skills/projeto/criar-skill/SKILL.md';
  f.cli('init', '--agents', 'codex');
  const original = f.read(source), human = `${original}\nAlteração humana preparada.\n`;
  f.put(source, human);
  f.git('add', '--', source);
  f.put(source, original);
  const index = readFileSync(join(f.root, '.git', 'index')), oldState = f.read(state);
  const environment = { ...process.env, PATH: join(f.root, 'git-unavailable'), Path: join(f.root, 'git-unavailable') };
  const result = spawnSync(process.execPath, [bin, ...args, '--target', f.root, '--json'], { encoding: 'utf8', timeout: 180000, env: environment });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /E_GIT/);
  assert.equal(f.read(source), original);
  assert.equal(f.read(state), oldState);
  assert.deepEqual(readFileSync(join(f.root, '.git', 'index')), index);
  assert.equal(f.read('.gitignore'), f.ignore);
});

test('falha de consulta ao Git em repositório existente não é interpretada como ausência de alterações', t => {
  const f = fixture(t), source = '.pbai4devs/skills/projeto/criar-skill/SKILL.md';
  f.cli('init', '--agents', 'codex');
  f.git('add', '--', source);
  const original = f.read(source), oldState = f.read(state), index = readFileSync(join(f.root, '.git', 'index'));
  const environment = { ...process.env, GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'invalid', GIT_CONFIG_VALUE_0: 'x' };
  const result = spawnSync(process.execPath, [bin, 'update', '--force', '--target', f.root, '--json'], { encoding: 'utf8', timeout: 180000, env: environment });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /E_GIT/);
  assert.equal(f.read(source), original);
  assert.equal(f.read(state), oldState);
  assert.deepEqual(readFileSync(join(f.root, '.git', 'index')), index);
  assert.equal(f.read('.gitignore'), f.ignore);
});

test('alias de caixa do índice preserva fonte em sistema de arquivos insensível a maiúsculas', t => {
  const f = fixture(t), source = '.pbai4devs/skills/equipe/obsoleta/SKILL.md';
  const alias = source.replace('/skills/', '/SKILLS/');
  f.cli('init', '--agents', 'codex');
  const original = skill('obsoleta', 'Skill antiga do kit.');
  f.put(source, original);
  if (!existsSync(join(f.root, alias))) { t.skip('O sistema de arquivos diferencia maiúsculas de minúsculas.'); return; }
  const manifest = JSON.parse(f.read(state));
  manifest.files[source] = digest(original);
  f.put(state, `${JSON.stringify(manifest, null, 2)}\n`);
  f.git('add', '--', alias);
  f.git('-c', 'user.name=Teste', '-c', 'user.email=test@example.invalid', 'commit', '--quiet', '-m', 'baseline');
  const human = `${original}\nAlteração humana preparada.\n`;
  f.put(source, human);
  f.git('add', '--', alias);
  f.put(source, original);
  f.git('update-index', '--assume-unchanged', '--', alias);
  const index = readFileSync(join(f.root, '.git', 'index'));
  const preview = f.cli('update', '--dry-run', '--force');
  assert.ok(preview.preserved.some(item => item.path === source && item.reason === 'staged-content-differs'));
  assert.ok(!preview.plan.some(item => item.path === source && item.action === 'remove'));
  f.cli('update', '--force');
  assert.equal(f.read(source), original);
  assert.equal(f.git('show', `:${alias}`), human);
  assert.deepEqual(readFileSync(join(f.root, '.git', 'index')), index);
});

for (const filter of [false, true]) test(`staged com CRLF ${filter ? 'e filtro externo é preservado sem executá-lo' : 'equivalente é comparado como texto normalizado'}`, t => {
  const f = fixture(t), source = '.pbai4devs/skills/equipe/crlf/SKILL.md';
  f.cli('init', '--agents', 'codex');
  const original = skill('crlf', 'Skill antiga do kit.').replaceAll('\n', '\r\n');
  f.put(source, original);
  const manifest = JSON.parse(f.read(state));
  manifest.files[source] = digest(original);
  f.put(state, `${JSON.stringify(manifest, null, 2)}\n`);
  f.git('config', 'core.autocrlf', 'true');
  f.git('add', '--', source);
  assert.ok(!f.git('show', `:${source}`).includes('\r'));
  if (filter) {
    f.put('.gitattributes', '.pbai4devs/skills/equipe/crlf/SKILL.md filter=unsafe\n');
    f.git('config', 'filter.unsafe.clean', 'exit 42');
    f.git('config', 'filter.unsafe.required', 'true');
  }
  const index = readFileSync(join(f.root, '.git', 'index'));
  const preview = f.cli('update', '--dry-run', '--force');
  if (filter) {
    assert.ok(preview.preserved.some(item => item.path === source && item.reason === 'staged-content-differs'));
    assert.ok(!preview.plan.some(item => item.path === source && item.action === 'remove'));
  } else {
    assert.ok(preview.plan.some(item => item.path === source && item.action === 'remove'));
  }
  assert.deepEqual(readFileSync(join(f.root, '.git', 'index')), index);
  assert.equal(f.read(source), original);
});

test('exclusão staged de catálogo bloqueia o plano e informa caminho e operação', t => {
  const f = fixture(t), catalog = '.pbai4devs/catalog.json';
  f.cli('init', '--agents', 'codex');
  f.git('add', '-f', '--', catalog);
  f.git('-c', 'user.name=Teste', '-c', 'user.email=test@example.invalid', 'commit', '--quiet', '-m', 'baseline');
  f.git('rm', '--cached', '--', catalog);
  const original = f.read(catalog), oldState = f.read(state), index = readFileSync(join(f.root, '.git', 'index'));
  // Make the desired catalog differ without modifying the index or installed source.
  const parsed = JSON.parse(original);
  parsed.skills[0].description = 'Descrição antiga.';
  f.put(catalog, `${JSON.stringify(parsed, null, 2)}\n`);
  const current = f.read(catalog);
  const result = spawnSync(process.execPath, [bin, 'update', '--dry-run', '--force', '--target', f.root, '--json'], { encoding: 'utf8', timeout: 180000 });
  assert.notEqual(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.error.code, 'E_STAGED');
  assert.match(output.error.detail, /update \.pbai4devs\/catalog\.json/);
  assert.equal(f.read(catalog), current);
  assert.equal(f.read(state), oldState);
  assert.deepEqual(readFileSync(join(f.root, '.git', 'index')), index);
  assert.equal(f.read('.gitignore'), f.ignore);
});

test('catálogo gerado íntegro com exclusão staged é atualizado sem modificar o índice', t => {
  const f = fixture(t), catalog = '.pbai4devs/catalog.json';
  f.cli('init', '--agents', 'codex');
  const old = JSON.parse(f.read(catalog));
  old.skills[0].description = 'Descrição do catálogo anterior.';
  const oldContent = `${JSON.stringify(old, null, 2)}\n`;
  f.put(catalog, oldContent);
  const manifest = JSON.parse(f.read(state));
  manifest.files[catalog] = digest(oldContent);
  f.put(state, `${JSON.stringify(manifest, null, 2)}\n`);
  f.git('add', '-f', '--', catalog);
  f.git('-c', 'user.name=Teste', '-c', 'user.email=test@example.invalid', 'commit', '--quiet', '-m', 'baseline');
  f.git('rm', '--cached', '--', catalog);
  const index = readFileSync(join(f.root, '.git', 'index'));
  const preview = f.cli('update', '--dry-run');
  assert.ok(preview.plan.some(item => item.path === catalog && item.action === 'update'));
  assert.equal(f.read(catalog), oldContent);
  assert.deepEqual(readFileSync(join(f.root, '.git', 'index')), index);
  f.cli('update');
  assert.notEqual(f.read(catalog), oldContent);
  assert.deepEqual(readFileSync(join(f.root, '.git', 'index')), index);
  assert.match(f.git('diff', '--cached', '--name-status', '--', catalog), /^D\s/);
  assert.equal(f.read('.gitignore'), f.ignore);
});

test('catálogo com exclusão staged sem ownership continua bloqueado', t => {
  const f = fixture(t), catalog = '.pbai4devs/catalog.json';
  f.cli('init', '--agents', 'codex');
  const manifest = JSON.parse(f.read(state));
  delete manifest.files[catalog];
  f.put(state, `${JSON.stringify(manifest, null, 2)}\n`);
  const old = JSON.parse(f.read(catalog));
  old.skills[0].description = 'Conteúdo humano.';
  f.put(catalog, `${JSON.stringify(old, null, 2)}\n`);
  f.git('add', '-f', '--', catalog);
  f.git('-c', 'user.name=Teste', '-c', 'user.email=test@example.invalid', 'commit', '--quiet', '-m', 'baseline');
  f.git('rm', '--cached', '--', catalog);
  const original = f.read(catalog), index = readFileSync(join(f.root, '.git', 'index'));
  const result = spawnSync(process.execPath, [bin, 'update', '--force', '--target', f.root, '--json'], { encoding: 'utf8', timeout: 180000 });
  assert.notEqual(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.error.code, 'E_STAGED');
  assert.match(output.error.detail, /update \.pbai4devs\/catalog\.json/);
  assert.equal(f.read(catalog), original);
  assert.deepEqual(readFileSync(join(f.root, '.git', 'index')), index);
});
