import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { synchronize } from '../SCRIPT.mjs';
import { indexContentMatches } from '../../lib/gitignore.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const original = '.pbai4devs/skills/projeto/criar-skill/SKILL.md';
const pointer = '.claude/skills/criar-skill/SKILL.md';
const file = (root, relative) => join(root, relative);
const put = (root, relative, content) => { mkdirSync(dirname(file(root, relative)), { recursive: true }); writeFileSync(file(root, relative), content); };
function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}
function fixture(t, withGit = true) {
  mkdirSync(join(repository, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(withGit ? join(repository, '.agent-tests') : tmpdir(), 'sync-preservation-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  if (withGit) git(root, 'init', '--quiet');
  populate(root);
  return root;
}
function populate(root) {
  put(root, '.gitignore', '# Human ignore\nnode_modules/\n');
  put(root, '.pbai4devs/templates/gitignore/agents.ignore', '# Cache\n/*\n!/.gitignore\n{{ALLOWLIST}}\n/cache/\n*.log\n');
  put(root, '.pbai4devs/templates/gitignore/clients.json', '{}\n');
  put(root, '.pbai4devs/templates/gitignore/shared.ignore', '# Shared\n/tools/*/.local/\n');
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  put(root, original, '---\nname: criar-skill\ndescription: Criar recurso.\n---\n\n# Criar skill\n');
  assert.equal(run(root).exitCode, 0);
  assert.ok(existsSync(file(root, pointer)));
}
function run(root, options = {}) {
  return synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {}, ...options });
}
function withoutGit(t, callback) {
  const emptyPath = mkdtempSync(join(tmpdir(), 'sync-empty-path-'));
  t.after(() => rmSync(emptyPath, { recursive: true, force: true }));
  const keys = Object.keys(process.env).filter(key => key.toLowerCase() === 'path');
  const previous = new Map(keys.map(key => [key, process.env[key]]));
  if (!keys.length) keys.push('PATH');
  try {
    for (const key of keys) process.env[key] = emptyPath;
    return callback();
  } finally {
    for (const key of keys) {
      if (previous.has(key)) process.env[key] = previous.get(key);
      else delete process.env[key];
    }
  }
}

for (const [withGit, force] of [[true, false], [true, true], [false, false], [false, true]]) {
  test(`remoção obsoleta preserva pasta vazia humana (git=${withGit}, force=${force})`, t => {
    const root = fixture(t, withGit), human = '.claude/skills/criar-skill/Equipe-Vazia';
    mkdirSync(file(root, human));
    const state = readFileSync(file(root, '.pbai4devs/state/derived.json'));
    const index = withGit ? git(root, 'ls-files', '--stage', '-z') : null;
    const ignore = readFileSync(file(root, '.gitignore'));
    rmSync(dirname(file(root, original)), { recursive: true });
    const check = run(root, { check: true, force });
    assert.notEqual(check.exitCode, 0);
    assert.ok(existsSync(file(root, pointer)));
    assert.ok(existsSync(file(root, human)));
    assert.deepEqual(readFileSync(file(root, '.pbai4devs/state/derived.json')), state);
    run(root, { force });
    assert.equal(existsSync(file(root, pointer)), false, 'apontamento obsoleto comprovado é removido');
    assert.ok(existsSync(file(root, human)), 'pasta vazia própria permanece');
    assert.deepEqual(readFileSync(file(root, '.gitignore')), ignore);
    if (withGit) assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
  });
}

for (const force of [false, true]) {
  test(`índice com conteúdo humano divergente bloqueia remoção (force=${force})`, t => {
    const root = fixture(t), generated = readFileSync(file(root, pointer));
    put(root, pointer, Buffer.concat([generated, Buffer.from('\nConteúdo humano staged.\n')]));
    git(root, 'add', '-f', '--', pointer);
    const index = git(root, 'ls-files', '--stage', '-z');
    put(root, pointer, generated);
    rmSync(dirname(file(root, original)), { recursive: true });
    const state = readFileSync(file(root, '.pbai4devs/state/derived.json'));
    const check = run(root, { check: true, force });
    assert.notEqual(check.exitCode, 0);
    assert.deepEqual(readFileSync(file(root, pointer)), generated);
    assert.deepEqual(readFileSync(file(root, '.pbai4devs/state/derived.json')), state);
    assert.throws(() => run(root, { force }), /conflitos|indice|índice/i);
    assert.deepEqual(readFileSync(file(root, pointer)), generated);
    assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
  });
}

for (const force of [false, true]) {
  test(`índice divergente impede atualização de apontamento ativo (force=${force})`, t => {
    const root = fixture(t), generated = readFileSync(file(root, pointer));
    put(root, pointer, Buffer.concat([generated, Buffer.from('\nAlteração humana staged.\n')]));
    git(root, 'add', '-f', '--', pointer);
    const index = git(root, 'ls-files', '--stage', '-z');
    put(root, pointer, generated);
    put(root, original, '---\nname: criar-skill\ndescription: Mudança real.\n---\n\n# Criar skill\n');
    const state = readFileSync(file(root, '.pbai4devs/state/derived.json'));
    assert.notEqual(run(root, { check: true, force }).exitCode, 0);
    assert.throws(() => run(root, { force }), /indice/i);
    assert.deepEqual(readFileSync(file(root, pointer)), generated);
    assert.deepEqual(readFileSync(file(root, '.pbai4devs/state/derived.json')), state);
    assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
  });
}

for (const flag of ['--assume-unchanged', '--skip-worktree']) {
  test(`índice divergente continua protegido com ${flag}`, t => {
    const root = fixture(t), generated = readFileSync(file(root, pointer));
    put(root, pointer, Buffer.concat([generated, Buffer.from('\nAlteração humana staged.\n')]));
    git(root, 'add', '-f', '--', pointer);
    put(root, pointer, generated);
    git(root, 'update-index', flag, '--', pointer);
    const index = git(root, 'ls-files', '--stage', '-z');
    const flags = git(root, 'ls-files', '-v', '--', pointer);
    put(root, original, '---\nname: criar-skill\ndescription: Mudança real.\n---\n\n# Criar skill\n');
    assert.notEqual(run(root, { check: true, force: true }).exitCode, 0);
    assert.throws(() => run(root, { force: true }), /indice/i);
    assert.deepEqual(readFileSync(file(root, pointer)), generated);
    assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
    assert.equal(git(root, 'ls-files', '-v', '--', pointer), flags);
  });
}

test('índice com alias de caixa bloqueia alteração conservadoramente em qualquer sistema', t => {
  const root = fixture(t), generated = readFileSync(file(root, pointer));
  const alias = pointer.replace('/skills/', '/SKILLS/');
  put(root, alias, Buffer.concat([generated, Buffer.from('\nAlteração humana staged.\n')]));
  git(root, 'add', '-f', '--', alias);
  const index = git(root, 'ls-files', '--stage', '-z');
  put(root, pointer, generated);
  put(root, original, '---\nname: criar-skill\ndescription: Mudança real.\n---\n\n# Criar skill\n');
  const aliasBytes = readFileSync(file(root, alias));
  const state = readFileSync(file(root, '.pbai4devs/state/derived.json'));
  const ignore = readFileSync(file(root, '.gitignore'));
  const preserved = () => {
    assert.deepEqual(readFileSync(file(root, pointer)), generated);
    assert.deepEqual(readFileSync(file(root, alias)), aliasBytes);
    assert.deepEqual(readFileSync(file(root, '.pbai4devs/state/derived.json')), state);
    assert.deepEqual(readFileSync(file(root, '.gitignore')), ignore);
    assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
  };
  let check, error;
  try { check = run(root, { check: true, force: true }); } catch (failure) { error = failure; }
  if (error) assert.match(error.message, /maiusculas\/minusculas/i);
  else assert.notEqual(check.exitCode, 0);
  preserved();
  assert.throws(() => run(root, { force: true }), /indice|maiusculas\/minusculas/i);
  preserved();
});

test('comparação de índice entende CRLF autorizado e recusa filtros, binários e divergência', t => {
  const root = fixture(t), path = 'arquivo.txt';
  const crlf = Buffer.from('texto\r\noutra linha\r\n'), lf = Buffer.from('texto\noutra linha\n');
  git(root, 'config', 'core.autocrlf', 'false');
  git(root, 'config', 'core.attributesfile', file(root, 'atributos-ausentes'));
  assert.equal(indexContentMatches(root, path, crlf, lf), false);
  git(root, 'config', 'core.autocrlf', 'true');
  assert.equal(indexContentMatches(root, path, crlf, lf), true);
  assert.equal(indexContentMatches(root, path, crlf, Buffer.from('texto humano\noutra linha\n')), false);
  assert.equal(indexContentMatches(root, path, Buffer.from([0, 13, 10]), Buffer.from([0, 10])), false);
  assert.equal(indexContentMatches(root, path, Buffer.from('um\r\ndois\r'), Buffer.from('um\ndois\r')), false);
  assert.equal(indexContentMatches(root, path, Buffer.from('\ufefftexto\r\n'), Buffer.from('texto\n')), false);
  assert.equal(indexContentMatches(root, path, Buffer.from('\ufefftexto\r\n'), Buffer.from('\ufefftexto\n')), true);
  put(root, '.gitattributes', '*.txt -text\n');
  assert.equal(indexContentMatches(root, path, crlf, lf), false);
  put(root, '.gitattributes', '*.txt text filter=nao-executar\n');
  git(root, 'config', 'filter.nao-executar.clean', 'exit 1');
  assert.equal(indexContentMatches(root, path, crlf, lf), false);
  put(root, '.gitattributes', '*.txt text working-tree-encoding=UTF-16\n');
  assert.equal(indexContentMatches(root, path, crlf, lf), false);
  put(root, '.gitattributes', '*.txt text ident\n');
  assert.equal(indexContentMatches(root, path, crlf, lf), false);
  put(root, '.gitattributes', '*.txt text eol=crlf\n');
  git(root, 'config', 'core.autocrlf', 'false');
  assert.equal(indexContentMatches(root, path, crlf, lf), true);
});

test('sync atualiza apontamento staged equivalente em repositório com autocrlf', t => {
  const root = fixture(t), generated = readFileSync(file(root, pointer), 'utf8').replaceAll('\n', '\r\n');
  git(root, 'config', 'core.autocrlf', 'true');
  put(root, pointer, generated);
  git(root, 'add', '-f', '--', pointer);
  const index = git(root, 'ls-files', '--stage', '-z');
  put(root, original, '---\nname: criar-skill\ndescription: Mudança real.\n---\n\n# Criar skill\n');
  assert.equal(run(root, { force: true }).exitCode, 0);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
});

for (const target of ['.pbai4devs/state/derived.json', '.claude/.gitignore']) {
  test(`índice divergente impede atualização de ${target}`, t => {
    const root = fixture(t), generated = readFileSync(file(root, target));
    put(root, target, Buffer.concat([generated, Buffer.from('\nAlteração humana staged.\n')]));
    git(root, 'add', '-f', '--', target);
    const index = git(root, 'ls-files', '--stage', '-z');
    put(root, target, generated);
    if (target.endsWith('derived.json')) {
      put(root, original, '---\nname: criar-skill\ndescription: Mudança real.\n---\n\n# Criar skill\n');
    } else {
      put(root, '.pbai4devs/templates/gitignore/agents.ignore', '# Cache atualizado\n/*\n!/.gitignore\n{{ALLOWLIST}}\n/cache/\n*.log\n');
    }
    assert.notEqual(run(root, { check: true, force: true }).exitCode, 0);
    assert.throws(() => run(root, { force: true }), /indice/i);
    assert.deepEqual(readFileSync(file(root, target)), generated);
    assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
  });
}

for (const options of [{ check: true }, { force: true }]) {
  test(`Git indisponível bloqueia limpeza em repositório (check=${Boolean(options.check)}, force=${Boolean(options.force)})`, t => {
    const root = fixture(t), generated = readFileSync(file(root, pointer));
    put(root, pointer, Buffer.concat([generated, Buffer.from('\nConteúdo humano staged.\n')]));
    git(root, 'add', '-f', '--', pointer);
    const index = git(root, 'ls-files', '--stage', '-z');
    put(root, pointer, generated);
    rmSync(dirname(file(root, original)), { recursive: true });
    const state = readFileSync(file(root, '.pbai4devs/state/derived.json'));
    withoutGit(t, () => assert.throws(() => run(root, options), /consultar o Git.*preservar/i));
    assert.deepEqual(readFileSync(file(root, pointer)), generated);
    assert.deepEqual(readFileSync(file(root, '.pbai4devs/state/derived.json')), state);
    assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
  });
}

test('projeto realmente sem Git pode limpar apontamento próprio sem executável Git', t => {
  const root = fixture(t, false), human = '.claude/skills/criar-skill/equipe-vazia';
  mkdirSync(file(root, human));
  rmSync(dirname(file(root, original)), { recursive: true });
  withoutGit(t, () => assert.equal(run(root, { force: true }).exitCode, 0));
  assert.equal(existsSync(file(root, pointer)), false);
  assert.ok(existsSync(file(root, human)));
});

test('preserva diretório preexistente sem prova de propriedade após remover único apontamento', t => {
  const root = fixture(t), directory = dirname(file(root, pointer));
  rmSync(dirname(file(root, original)), { recursive: true });
  assert.equal(run(root, { force: true }).exitCode, 0);
  assert.equal(existsSync(file(root, pointer)), false);
  assert.ok(existsSync(directory));
});

test('alteração concorrente no índice bloqueia limpeza antes de qualquer exclusão', t => {
  const root = fixture(t), generated = readFileSync(file(root, pointer));
  rmSync(dirname(file(root, original)), { recursive: true });
  let staged;
  assert.throws(() => synchronize({ root, localIgnores: false, generateEntrypoints: false, force: true,
    output() {
      if (staged !== undefined) return;
      put(root, pointer, Buffer.concat([generated, Buffer.from('\nStaged pela equipe.\n')]));
      git(root, 'add', '-f', '--', pointer);
      staged = git(root, 'ls-files', '--stage', '-z');
      put(root, pointer, generated);
    },
  }), /indice git mudou/i);
  assert.notEqual(staged, undefined);
  assert.deepEqual(readFileSync(file(root, pointer)), generated);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), staged);
});

test('índice divergente é protegido quando o projeto fica em subpasta do repositório Git', t => {
  const outer = mkdtempSync(join(tmpdir(), 'sync-parent-git-'));
  t.after(() => rmSync(outer, { recursive: true, force: true }));
  git(outer, 'init', '--quiet');
  const root = join(outer, 'projeto'); mkdirSync(root);
  populate(root);
  const generated = readFileSync(file(root, pointer));
  put(root, pointer, Buffer.concat([generated, Buffer.from('\nStaged pela equipe.\n')]));
  git(root, 'add', '-f', '--', pointer);
  const index = git(outer, 'ls-files', '--stage', '-z');
  put(root, pointer, generated);
  rmSync(dirname(file(root, original)), { recursive: true });
  assert.throws(() => run(root, { force: true }), /indice/i);
  assert.deepEqual(readFileSync(file(root, pointer)), generated);
  assert.equal(git(outer, 'ls-files', '--stage', '-z'), index);
});

test('conteúdo humano na pasta e apontamento gerenciado editado sobrevivem à limpeza forçada', t => {
  const root = fixture(t), human = '.claude/skills/criar-skill/notas-da-equipe.md';
  const notes = '# Referência própria\n', edited = Buffer.concat([readFileSync(file(root, pointer)), Buffer.from('\nNota própria.\n')]);
  put(root, human, notes);
  put(root, pointer, edited);
  rmSync(dirname(file(root, original)), { recursive: true });
  run(root, { force: true });
  assert.equal(readFileSync(file(root, human), 'utf8'), notes);
  assert.deepEqual(readFileSync(file(root, pointer)), edited);
});

test('colisão com arquivo humano ancestral não é removida por --force', t => {
  const root = fixture(t), ancestor = '.claude/skills/equipe-custom';
  const human = 'Arquivo da equipe; não substituir.\n';
  put(root, ancestor, human);
  put(root, '.pbai4devs/skills/projeto/equipe-custom/SKILL.md', '---\nname: equipe-custom\ndescription: Exemplo.\n---\n\n# Equipe\n');
  const index = git(root, 'ls-files', '--stage', '-z');
  try { run(root, { force: true }); } catch (error) { assert.match(error.message, /conflito|gerenciado|arquivo|diretor/i); }
  assert.equal(readFileSync(file(root, ancestor), 'utf8'), human);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
});
