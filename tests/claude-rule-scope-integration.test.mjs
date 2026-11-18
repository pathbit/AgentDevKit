import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { parseClaudePaths } from '../.pbai4devs/scripts/lib/claude-rule-scope.mjs';

// localIgnores:false isola as regras; índice e exclude continuam sendo medidos.
const pendingTest = test;
const source = '.pbai4devs/rules/demo/RULE.md';
const native = '.claude/rules/demo/RULE.md';
const metadata = '.pbai4devs/rules/demo/claude.yaml';
const file = (root, relative) => join(root, relative);
const put = (root, relative, content) => { mkdirSync(dirname(file(root, relative)), { recursive: true }); writeFileSync(file(root, relative), content); };
const read = (root, relative) => readFileSync(file(root, relative));
const run = (root, options = {}) => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {}, ...options });
const rule = (trigger, extra = '') => `---\ntrigger: ${trigger}\n${extra}description: Regra sintética.\n---\n\n# Regra sintética\n\nConteúdo original da regra.\n`;

function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}

function snapshot(root) {
  const items = [];
  function walk(relative = '') {
    const directory = relative ? file(root, relative) : root;
    for (const name of readdirSync(directory).sort()) {
      const path = relative ? `${relative}/${name}` : name;
      const entry = lstatSync(file(root, path));
      const mode = entry.mode & 0o777;
      if (entry.isSymbolicLink()) items.push([path, 'link', mode, readlinkSync(file(root, path))]);
      else if (entry.isDirectory()) { items.push([path, 'directory', mode]); walk(path); }
      else if (entry.isFile()) items.push([path, 'file', mode, createHash('sha256').update(read(root, path)).digest('hex')]);
      else throw Error(`Tipo inesperado na fixture: ${path}`);
    }
  }
  walk();
  return items;
}

function protectedGit(root) {
  return { index: read(root, '.git/index'), head: read(root, '.git/HEAD'), config: read(root, '.git/config'), exclude: read(root, '.git/info/exclude'), gitignore: read(root, '.gitignore'), human: read(root, 'human.txt') };
}

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'adk-claude-scope-integration-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '--quiet');
  put(root, '.gitignore', '# Regra humana\nprivate/\n');
  put(root, 'human.txt', 'staged humano\n');
  git(root, 'add', '--', '.gitignore', 'human.txt');
  put(root, 'human.txt', 'staged humano\nedição humana não staged\n');
  writeFileSync(file(root, '.git/info/exclude'), '# Exclude humano\nprivate-local/\n');
  put(root, '.pbai4devs/templates/gitignore/agents.ignore', '# Cache\n/*\n!/.gitignore\n{{ALLOWLIST}}\n/cache/\n*.log\n');
  put(root, '.pbai4devs/templates/gitignore/clients.json', '{}\n');
  put(root, '.pbai4devs/templates/gitignore/shared.ignore', '# Compartilhado\n/tools/*/.local/\n');
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|agrupado\n');
  const before = protectedGit(root);
  assert.equal(run(root).exitCode, 0);
  assert.deepEqual(protectedGit(root), before);
  return root;
}

test('regra global Claude existente é gerada sem paths e check não altera Git', t => {
  const root = fixture(t), gitBefore = protectedGit(root);
  put(root, source, rule('always_on'));
  assert.equal(run(root).exitCode, 0);
  assert.match(read(root, native).toString(), /Leia e siga \[origem\]/);
  assert.doesNotMatch(read(root, native).toString(), /^paths:/m);
  const beforeCheck = snapshot(root);
  assert.equal(run(root, { check: true }).exitCode, 0);
  assert.deepEqual(snapshot(root), beforeCheck);
  assert.deepEqual(protectedGit(root), gitBefore);
});

test('glob com mapeamento nativo explícito usa paths e preserva índice e exclude', t => {
  const root = fixture(t), gitBefore = protectedGit(root);
  put(root, source, rule('glob', 'globs: "src/**/*.ts"\n'));
  put(root, metadata, '---\npaths: ["src/**/*.ts"]\n---\n');
  put(root, '.pbai4devs/espelhos.conf', `agente|.claude|agrupado\nnativo|${native}|${source}|${metadata}\n`);
  assert.equal(run(root).exitCode, 0);
  assert.deepEqual(parseClaudePaths(read(root, native).toString(), { metadataOnly: false }), {
    ok: true, paths: ['src/**/*.ts'],
  });
  assert.match(read(root, native).toString(), /Leia e siga \[origem\]/);
  const beforeCheck = snapshot(root);
  assert.equal(run(root, { check: true }).exitCode, 0);
  assert.deepEqual(snapshot(root), beforeCheck);
  assert.deepEqual(protectedGit(root), gitBefore);
});

test('mapeamento Claude alternativo válido não é anunciado como leitura apenas explícita', t => {
  const root = fixture(t), gitBefore = protectedGit(root), alternate = '.claude/rules/custom-scope.md';
  put(root, source, rule('glob', 'globs: "origem/**/*.ts"\n'));
  put(root, metadata, '---\npaths: ["destino/**/*.ts"]\n---\n');
  put(root, '.pbai4devs/espelhos.conf', `agente|.claude|agrupado\nnativo|${alternate}|${source}|${metadata}\n`);
  const result = run(root);
  assert.equal(result.exitCode, 0);
  assert.equal(result.scopeOmissions.some(item => item.source === source), false);
  assert.ok(result.claudeRetiredTargets.some(item => item.source === source && item.target === native));
  assert.deepEqual(parseClaudePaths(read(root, alternate).toString(), { metadataOnly: false }), { ok: true, paths: ['destino/**/*.ts'] });
  assert.equal(existsSync(file(root, native)), false);
  assert.deepEqual(protectedGit(root), gitBefore);
});

test('mapeamento alternativo não oculta regra global legada no destino padrão', t => {
  const root = fixture(t), alternate = '.claude/rules/custom-scope.md';
  put(root, source, rule('glob', 'globs: "origem/**/*.ts"\n'));
  put(root, metadata, '---\npaths: ["destino/**/*.ts"]\n---\n');
  put(root, '.pbai4devs/espelhos.conf', `agente|.claude|agrupado\nnativo|${alternate}|${source}|${metadata}\n`);
  put(root, native, '# Regra antiga humana global\n');
  const before = snapshot(root), gitBefore = protectedGit(root);
  assert.notEqual(run(root, { check: true }).exitCode, 0);
  assert.throws(() => run(root, { force: true }), /preservad|conflito/i);
  assert.deepEqual(snapshot(root), before);
  assert.deepEqual(protectedGit(root), gitBefore);
});

for (const trigger of ['manual', 'model_decision']) {
  pendingTest(`${trigger} não deve gerar arquivo em .claude/rules e mantém fonte própria`, t => {
    const root = fixture(t), gitBefore = protectedGit(root), content = rule(trigger);
    put(root, source, content);
    const beforeCheck = snapshot(root);
    assert.notEqual(run(root, { check: true }).exitCode, 0);
    assert.deepEqual(snapshot(root), beforeCheck);
    run(root);
    assert.deepEqual(protectedGit(root), gitBefore);
    assert.equal(read(root, source).toString(), content);
    assert.equal(existsSync(file(root, native)), false, 'regra não deve ser carregada globalmente');
    // Não exige que o fallback crie arquivo em references/rules.
  });
}

pendingTest('glob sem mapeamento Claude não pode ser ativado globalmente por omissão', t => {
  const root = fixture(t), gitBefore = protectedGit(root);
  put(root, source, rule('glob', 'globs: "src/**/*.ts"\n'));
  run(root);
  assert.deepEqual(protectedGit(root), gitBefore);
  assert.equal(existsSync(file(root, native)), false, 'escopo Claude não informado exige fallback explícito');
});

pendingTest('YAML Claude malformado bloqueia a transação inteira sem tocar Git', t => {
  const root = fixture(t);
  put(root, source, rule('glob', 'globs: "src/**/*.ts"\n'));
  put(root, metadata, '---\npaths: ["src/**/*.ts"\n---\n');
  put(root, '.pbai4devs/espelhos.conf', `agente|.claude|agrupado\nnativo|${native}|${source}|${metadata}\n`);
  const before = snapshot(root), gitBefore = protectedGit(root);
  assert.notEqual(run(root, { check: true }).exitCode, 0);
  assert.deepEqual(snapshot(root), before, 'check deve ser somente leitura');
  let error;
  try { run(root); } catch (caught) { error = caught; }
  assert.deepEqual(protectedGit(root), gitBefore);
  assert.deepEqual(snapshot(root), before, 'YAML inválido deve falhar antes de qualquer gravação');
  assert.ok(error, 'YAML inválido deve ser rejeitado');
});

pendingTest('colisão de paths humanos diferentes é preservada mesmo com force', t => {
  const root = fixture(t), human = '---\npaths: ["docs/**/*.md"]\n---\n\n# Humano\n\nPreservar integralmente.\n';
  put(root, source, rule('glob', 'globs: "src/**/*.ts"\n'));
  put(root, metadata, '---\npaths: ["src/**/*.ts"]\n---\n');
  put(root, native, human);
  put(root, '.pbai4devs/espelhos.conf', `agente|.claude|agrupado\nnativo|${native}|${source}|${metadata}\n`);
  const gitBefore = protectedGit(root), beforeCheck = snapshot(root);
  assert.notEqual(run(root, { check: true }).exitCode, 0);
  assert.deepEqual(snapshot(root), beforeCheck);
  let result, error;
  try { result = run(root, { force: true }); } catch (caught) { error = caught; }
  assert.deepEqual(protectedGit(root), gitBefore);
  assert.equal(read(root, native).toString(), human, 'force não pode ampliar instrução humana');
  if (error) assert.match(error.message, /escopo|conflito|preservad|paths/i);
  else assert.ok(result.preserved.some(item => item.path === native), 'a colisão preservada deve ser relatada');
});

pendingTest('migração não apaga referência legada baseada apenas em hash de conteúdo', t => {
  const root = fixture(t);
  put(root, source, rule('always_on'));
  run(root);
  assert.ok(existsSync(file(root, native)));
  put(root, source, rule('manual'));
  const before = snapshot(root), gitBefore = protectedGit(root);
  assert.notEqual(run(root, { check: true }).exitCode, 0);
  assert.deepEqual(snapshot(root), before);
  let result, error;
  try { result = run(root); } catch (caught) { error = caught; }
  assert.deepEqual(protectedGit(root), gitBefore);
  assert.deepEqual(snapshot(root), before, 'hash de bytes não prova metadados ou propriedade atual');
  assert.ok(error || result.exitCode !== 0, 'a referência potencialmente global deve ser reportada');
  assert.ok(existsSync(file(root, source)));
});

pendingTest('migração preserva modo humano em referência legada com bytes gerenciados', t => {
  if (process.platform === 'win32') { t.skip('modo POSIX não é equivalente a ACL no Windows'); return; }
  const root = fixture(t);
  put(root, source, rule('always_on'));
  run(root);
  chmodSync(file(root, native), 0o700);
  put(root, source, rule('manual'));
  const before = snapshot(root), gitBefore = protectedGit(root);
  let result, error;
  try { result = run(root, { force: true }); } catch (caught) { error = caught; }
  assert.deepEqual(protectedGit(root), gitBefore);
  assert.deepEqual(snapshot(root), before, 'modo alterado deve ser preservado');
  assert.ok(error || result.exitCode !== 0, 'a referência potencialmente global deve ser reportada');
});

pendingTest('migração preserva substituto humano de bytes idênticos em referência legada', t => {
  const root = fixture(t);
  put(root, source, rule('always_on'));
  run(root);
  const original = lstatSync(file(root, native), { bigint: true }), bytes = read(root, native);
  const replacement = `${native}.humano`;
  put(root, replacement, bytes);
  renameSync(file(root, replacement), file(root, native));
  const human = lstatSync(file(root, native), { bigint: true });
  if (original.ino && human.ino) assert.notEqual(human.ino, original.ino);
  put(root, source, rule('manual'));
  const before = snapshot(root), gitBefore = protectedGit(root);
  let result, error;
  try { result = run(root, { force: true }); } catch (caught) { error = caught; }
  assert.deepEqual(protectedGit(root), gitBefore);
  assert.deepEqual(snapshot(root), before, 'substituto de bytes idênticos deve ser preservado');
  const after = lstatSync(file(root, native), { bigint: true });
  if (human.ino) { assert.equal(after.ino, human.ino); assert.equal(after.dev, human.dev); }
  assert.ok(error || result.exitCode !== 0, 'a referência potencialmente global deve ser reportada');
});

pendingTest('migração preserva alvo nativo antigo removido do manifesto', t => {
  const root = fixture(t), custom = '.claude/rules/custom.md';
  put(root, source, rule('always_on'));
  put(root, '.pbai4devs/espelhos.conf', `agente|.claude|agrupado\nnativo|${custom}|${source}\n`);
  run(root);
  const bytes = read(root, custom), original = lstatSync(file(root, custom), { bigint: true });
  put(root, `${custom}.humano`, bytes);
  renameSync(file(root, `${custom}.humano`), file(root, custom));
  const human = lstatSync(file(root, custom), { bigint: true });
  if (original.ino && human.ino) assert.notEqual(human.ino, original.ino);
  rmSync(file(root, native));
  put(root, source, rule('manual'));
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|agrupado\n');
  const before = snapshot(root), gitBefore = protectedGit(root);
  let result, error;
  try { result = run(root, { force: true }); } catch (caught) { error = caught; }
  assert.deepEqual(protectedGit(root), gitBefore);
  assert.deepEqual(snapshot(root), before, 'alvo humano não deve ser removido na limpeza');
  const after = lstatSync(file(root, custom), { bigint: true });
  if (human.ino) { assert.equal(after.ino, human.ino); assert.equal(after.dev, human.dev); }
  assert.ok(error || result.exitCode !== 0, 'o apontamento antigo deve ser informado');
});

pendingTest('migração bloqueia referência rastreada sem alterar índice ou arquivo, inclusive com force', t => {
  const root = fixture(t);
  put(root, source, rule('always_on'));
  run(root);
  git(root, 'add', '-f', '--', native);
  put(root, source, rule('model_decision'));
  const before = snapshot(root), gitBefore = protectedGit(root);
  assert.notEqual(run(root, { check: true }).exitCode, 0);
  assert.deepEqual(snapshot(root), before);
  let error;
  try { run(root, { force: true }); } catch (caught) { error = caught; }
  assert.deepEqual(protectedGit(root), gitBefore);
  assert.deepEqual(snapshot(root), before, 'arquivo rastreado e transação devem permanecer intactos');
  assert.ok(error, 'a remoção rastreada deve ser bloqueada');
});

test('conteúdo staged divergente bloqueia alteração da regra nativa mesmo com force', t => {
  const root = fixture(t);
  put(root, source, rule('always_on'));
  run(root);
  const generated = read(root, native);
  put(root, native, Buffer.concat([generated, Buffer.from('\nConteúdo humano staged.\n')]));
  git(root, 'add', '-f', '--', native);
  put(root, native, generated);
  put(root, source, rule('manual'));
  const before = snapshot(root), gitBefore = protectedGit(root);
  assert.notEqual(run(root, { check: true, force: true }).exitCode, 0);
  assert.deepEqual(snapshot(root), before);
  assert.throws(() => run(root, { force: true }), /conflitos|[íi]ndice/i);
  assert.deepEqual(protectedGit(root), gitBefore);
  assert.deepEqual(snapshot(root), before);
});

pendingTest('legado sem ownership não é removido nem adotado mesmo com force', t => {
  const root = fixture(t), human = '---\ntrigger: manual\ndescription: Humano.\n---\n\n# Humano\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/rules/demo/RULE.md).\n';
  put(root, source, rule('manual'));
  put(root, native, human);
  git(root, 'add', '-f', '--', native);
  const gitBefore = protectedGit(root);
  let result, error;
  try { result = run(root, { force: true }); } catch (caught) { error = caught; }
  assert.deepEqual(protectedGit(root), gitBefore);
  const derived = JSON.parse(read(root, '.pbai4devs/state/derived.json').toString());
  assert.equal(Object.hasOwn(derived.files ?? {}, native), false, 'bytes iguais não comprovam ownership integral');
  assert.equal(Object.hasOwn(derived.blocks ?? {}, native), false, 'conteúdo humano não deve ser adotado como bloco');
  assert.equal(read(root, native).toString(), human);
  if (error) assert.match(error.message, /escopo|conflito|preservad|ownership|propriedade/i);
  else assert.ok(result.preserved.some(item => item.path === native), 'a referência sem ownership deve ser relatada');
});

test('diagnóstico não afirma leitura explícita quando legado pode carregar globalmente', t => {
  const root = fixture(t); put(root, source, rule('manual'));
  put(root, native, '---\ndescription: legado\n---\n\n# Legado global\n');
  const before = snapshot(root), messages = [];
  const result = run(root, { check: true, output: message => messages.push(message) });
  assert.equal(result.exitCode, 1);
  assert.equal(result.scopeOmissions.find(item => item.source === source)?.status, 'activation-unverified');
  assert.match(messages.join('\n'), /podem continuar ativos globalmente/);
  assert.deepEqual(snapshot(root), before);
});
