import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { synchronize } from '../SCRIPT.mjs';
import { entrypointReference, mergeManagedContent } from '../../lib/managed-content.mjs';
import { mergeTomlContent } from '../../lib/managed-toml.mjs';

const catalogs = ['catalog.json', 'skills.json', 'agents.json', 'rules.json'].map(name => `.pbai4devs/${name}`);
const state = '.pbai4devs/state/derived.json';
const original = '.pbai4devs/skills/demo/SKILL.md';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const get = (root, path) => readFileSync(join(root, path));
const put = (root, path, bytes) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), bytes); };
const gitEnvironment = root => ({ ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key))), GIT_CONFIG_GLOBAL: join(root, '.git-config-ausente'), GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0' });
const sync = (root, options = {}) => {
  // synchronize is synchronous and launches Git internally. Isolate only for
  // this call so an inherited GIT_INDEX_FILE/GIT_DIR cannot touch another repo.
  const saved = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^GIT_/i.test(key)));
  for (const key of Object.keys(saved)) delete process.env[key];
  Object.assign(process.env, { GIT_CONFIG_GLOBAL: join(root, '.git-config-ausente'), GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0' });
  try { return synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {}, ...options }); }
  finally {
    for (const key of Object.keys(process.env)) if (/^GIT_/i.test(key)) delete process.env[key];
    Object.assign(process.env, saved);
  }
};
function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', env: gitEnvironment(root) });
  assert.equal(result.status, 0, result.stderr);
}
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-catalog-ownership-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q');
  put(root, '.gitignore', 'node_modules/\n');
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  put(root, '.pbai4devs/templates/gitignore/agents.ignore', '# Cache\n/*\n!/.gitignore\n{{ALLOWLIST}}\n');
  put(root, '.pbai4devs/templates/gitignore/clients.json', '{}\n');
  put(root, '.pbai4devs/templates/gitignore/shared.ignore', '# Shared\n/tools/*/.local/\n');
  put(root, original, '---\nname: demo\ndescription: Demo.\n---\n\n# Demo\n');
  git(root, 'add', '-f', '.gitignore');
  return root;
}

for (const path of catalogs) for (const force of [false, true]) {
  test(`catálogo editado permanece intacto na sincronização direta: ${path}, force=${force}`, t => {
    const root = fixture(t);
    assert.equal(sync(root).exitCode, 0);
    put(root, path, '{"human":"preservar"}\n');
    git(root, 'add', '-f', '--', path);
    const before = Object.fromEntries([path, state, '.gitignore', '.git/index'].map(name => [name, get(root, name)]));
    assert.notEqual(sync(root, { check: true, force }).exitCode, 0);
    assert.throws(() => sync(root, { force }), /Conteudo proprio preservado/);
    for (const [name, content] of Object.entries(before)) assert.deepEqual(get(root, name), content, name);
  });
}

test('catálogo anterior idêntico não é assumido como próprio sem estado', t => {
  const root = fixture(t);
  assert.equal(sync(root).exitCode, 0);
  const recorded = JSON.parse(get(root, state));
  delete recorded.catalogs;
  put(root, state, `${JSON.stringify(recorded, null, 2)}\n`);
  const before = Object.fromEntries([...catalogs, '.gitignore', '.git/index'].map(name => [name, get(root, name)]));
  const result = sync(root, { force: true });
  for (const path of catalogs) assert.ok(result.preserved.some(entry => entry.path === path && entry.reason === 'existing-catalog'), path);
  assert.equal(JSON.parse(get(root, state)).catalogs, undefined);
  for (const [name, content] of Object.entries(before)) assert.deepEqual(get(root, name), content, name);
  put(root, original, '---\nname: demo\ndescription: Mudança humana.\n---\n\n# Demo\n');
  assert.throws(() => sync(root, { force: true }), /Conteudo proprio preservado/);
  for (const [name, content] of Object.entries(before)) assert.deepEqual(get(root, name), content, name);
});

test('sincronizações diretas sucessivas registram hashes dos catálogos criados', t => {
  const root = fixture(t);
  assert.equal(sync(root).exitCode, 0);
  for (const path of catalogs) assert.equal(JSON.parse(get(root, state)).catalogs[path], digest(get(root, path)), path);
  put(root, original, '---\nname: demo\ndescription: Nova descrição.\n---\n\n# Demo\n');
  assert.equal(sync(root).exitCode, 0);
  for (const path of catalogs) assert.equal(JSON.parse(get(root, state)).catalogs[path], digest(get(root, path)), path);
  assert.equal(sync(root, { check: true }).exitCode, 0);
});

test('registro de catálogo desconhecido ou hash inválido bloqueia antes de alterar arquivos', t => {
  const root = fixture(t);
  assert.equal(sync(root).exitCode, 0);
  const registry = JSON.parse(get(root, state));
  registry.catalogs['.pbai4devs/other.json'] = 'a'.repeat(64);
  put(root, state, JSON.stringify(registry));
  const before = Object.fromEntries([...catalogs, state, '.gitignore', '.git/index'].map(name => [name, get(root, name)]));
  assert.throws(() => sync(root, { force: true }), /Registro de catalogos derivados invalido/);
  for (const [name, content] of Object.entries(before)) assert.deepEqual(get(root, name), content, name);
  assert.ok(existsSync(join(root, original)));
});

for (const path of ['.pbai4devs/.gitignore', '.claude/.gitignore']) for (const force of [false, true]) {
  test(`bloco ignore editado permanece intacto: ${path}, force=${force}`, t => {
    const root = fixture(t);
    assert.equal(sync(root).exitCode, 0);
    const content = get(root, path).toString('utf8').replace('# BEGIN AGENT IGNORE', '# BEGIN AGENT IGNORE\n# Regra humana\n!/conteudo-humano/');
    put(root, path, content);
    git(root, 'add', '-f', '--', path);
    const before = Object.fromEntries([path, state, '.gitignore', '.git/index'].map(name => [name, get(root, name)]));
    assert.notEqual(sync(root, { check: true, force }).exitCode, 0);
    assert.throws(() => sync(root, { force }), /Conteudo proprio preservado/);
    for (const [name, bytes] of Object.entries(before)) assert.deepEqual(get(root, name), bytes, name);
  });
}

for (const path of ['.pbai4devs/.gitignore', '.claude/.gitignore']) {
  test(`bloco ignore igual sem comprovante não é adotado: ${path}`, t => {
    const root = fixture(t);
    assert.equal(sync(root).exitCode, 0);
    const registry = JSON.parse(get(root, state));
    delete registry.blocks[path];
    put(root, state, JSON.stringify(registry, null, 2) + '\n');
    const originalIgnore = get(root, path);
    const result = sync(root, { force: true });
    assert.ok(result.preserved.some(entry => entry.path === path && entry.reason === 'existing-ignore-block'));
    assert.equal(JSON.parse(get(root, state)).blocks?.[path], undefined);
    assert.deepEqual(get(root, path), originalIgnore);
    const template = path.startsWith('.pbai4devs/') ? 'shared.ignore' : 'agents.ignore';
    const templatePath = `.pbai4devs/templates/gitignore/${template}`;
    put(root, templatePath, Buffer.concat([get(root, templatePath), Buffer.from('/novo-item/\n')]));
    assert.throws(() => sync(root, { force: true }), /Conteudo proprio preservado/);
    assert.deepEqual(get(root, path), originalIgnore);
  });
}

test('bloco idêntico em AGENTS.md sem registro não é adotado', t => {
  const root = fixture(t), path = 'AGENTS.md';
  put(root, '.pbai4devs/templates/entrypoints/AGENTS.md', '# Instruções\n');
  const content = mergeManagedContent('# Instruções humanas\n', entrypointReference(root, path)).text;
  put(root, path, content);
  const result = sync(root, { force: true, generateEntrypoints: true });
  assert.ok(result.preserved.some(entry => entry.path === path && entry.reason === 'existing-managed-block'));
  assert.equal(get(root, path).toString('utf8'), content);
  const registry = JSON.parse(get(root, state));
  assert.equal(registry.blocks?.[path], undefined);
  assert.equal(registry.entries?.[path], undefined);
  assert.equal(sync(root, { force: true, generateEntrypoints: true }).exitCode, 0);
  assert.equal(get(root, path).toString('utf8'), content);
});

for (const kind of ['markdown', 'toml']) test(`bloco nativo ${kind} idêntico sem registro não é adotado`, t => {
  const root = fixture(t);
  const path = kind === 'markdown' ? '.claude/skills/demo/SKILL.md' : '.gemini/commands/demo.toml';
  let content;
  if (kind === 'markdown') {
    content = mergeManagedContent('# Instruções humanas\n', 'Leia e siga [origem](../../../.pbai4devs/skills/demo/SKILL.md).').text;
  } else {
    put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\nagente|.gemini|plano\n');
    put(root, '.pbai4devs/commands/demo/COMMAND.md', '---\ndescription: Demo.\n---\n\n# Demo\n');
    content = mergeTomlContent('description = "Humano"\nprompt = "Meu prompt"\n', '@{.pbai4devs/commands/demo/COMMAND.md}').text;
  }
  put(root, path, content);
  const result = sync(root, { force: true });
  assert.ok(result.preserved.some(entry => entry.path === path && entry.reason === 'existing-managed-block'));
  assert.equal(get(root, path).toString('utf8'), content);
  const registry = JSON.parse(get(root, state));
  assert.equal(registry.blocks?.[path], undefined);
  assert.equal(registry.files?.[path], undefined);
  assert.equal(sync(root, { force: true }).exitCode, 0);
  assert.equal(get(root, path).toString('utf8'), content);
});

for (const force of [false, true]) test(`configuração humana não é alterada nem adotada: force=${force}`, t => {
  const root = fixture(t), path = '.pbai4devs/espelhos.conf';
  const identical = get(root, path);
  const result = sync(root, { force });
  assert.ok(result.preserved.some(entry => entry.path === path && entry.reason === 'existing-configuration'));
  assert.equal(JSON.parse(get(root, state)).config, undefined);
  assert.deepEqual(get(root, path), identical);
  put(root, path, Buffer.concat([identical, Buffer.from('documento|manual-humano\n')]));
  git(root, 'add', '-f', '--', path);
  const before = Object.fromEntries([path, state, '.gitignore', '.git/index'].map(name => [name, get(root, name)]));
  assert.notEqual(sync(root, { check: true, force }).exitCode, 0);
  assert.throws(() => sync(root, { force }), /Conteudo proprio preservado/);
  for (const [name, content] of Object.entries(before)) assert.deepEqual(get(root, name), content, name);
});

test('overlay de configuração inválido não autoriza escrita', t => {
  const root = fixture(t);
  assert.equal(sync(root).exitCode, 0);
  const registry = JSON.parse(get(root, state));
  registry.config = 'nao-e-sha256';
  put(root, state, JSON.stringify(registry));
  const before = get(root, state);
  assert.throws(() => sync(root, { force: true }), /Registro de configuracao derivada invalido/);
  assert.deepEqual(get(root, state), before);
});

test('CLI reconhece catálogos da sincronização direta e preserva atualização de ignore', t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-cli-sync-ownership-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q');
  put(root, '.gitignore', 'node_modules/\n');
  put(root, 'AGENTS.md', '# Instruções existentes\n');
  put(root, 'staged.txt', 'Conteúdo staged humano.\n');
  git(root, 'add', '-f', '.gitignore', 'AGENTS.md', 'staged.txt');
  const initial = Object.fromEntries(['.gitignore', '.git/index', 'staged.txt'].map(path => [path, get(root, path)]));
  const cliPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../bin/agentdevkit.mjs');
  function runCli(...args) {
    const result = spawnSync(process.execPath, [cliPath, ...args, '--target', root, '--json'], {
      cwd: root, env: gitEnvironment(root), encoding: 'utf8', timeout: 90000, maxBuffer: 16 * 1024 * 1024,
    });
    let output; try { output = JSON.parse(result.stdout); } catch { assert.fail(`Resposta CLI inválida: ${result.stderr} ${result.stdout}`); }
    assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr} ${result.stdout}`);
    return output;
  }
  function direct() {
    const result = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs')], {
      cwd: root, env: gitEnvironment(root), encoding: 'utf8', timeout: 90000,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  }
  runCli('init', '--agents', 'codex');
  assert.ok(get(root, 'AGENTS.md').toString('utf8').startsWith('# Instruções existentes\n'));
  put(root, '.pbai4devs/skills/projeto/human-extra/SKILL.md', '---\nname: human-extra\ndescription: Minha skill.\n---\n\n# Minha skill\n');
  direct(); direct();
  assert.equal(runCli('doctor').ok, true);
  assert.equal(runCli('sync', '--check').ok, true);
  assert.equal(runCli('update').ok, true);
  assert.equal(runCli('sync', '--check').ok, true);
  // Simule uma versão legada que registrou legitimamente este manifesto.
  const config = '.pbai4devs/espelhos.conf', installed = '.pbai4devs/state/agentdevkit.json';
  put(root, config, Buffer.concat([get(root, config), Buffer.from('documento|legado-comprovado\n')]));
  const previous = JSON.parse(get(root, installed));
  previous.files[config] = digest(get(root, config));
  put(root, installed, JSON.stringify(previous, null, 2) + '\n');
  direct();
  assert.doesNotMatch(get(root, config).toString('utf8'), /documento\|legado-comprovado/);
  assert.equal(JSON.parse(get(root, state)).config, digest(get(root, config)));
  assert.equal(runCli('doctor').ok, true);
  assert.equal(runCli('sync', '--check').ok, true);
  assert.equal(runCli('update').ok, true);
  const template = '.pbai4devs/templates/gitignore/shared.ignore';
  const humanTemplate = Buffer.concat([get(root, template), Buffer.from('\n/artefato-humano/\n')]);
  put(root, template, humanTemplate);
  direct();
  assert.match(get(root, '.pbai4devs/.gitignore').toString('utf8'), /\/artefato-humano\//);
  assert.equal(runCli('update').ok, true);
  assert.deepEqual(get(root, template), humanTemplate);
  assert.equal(runCli('sync', '--check').ok, true);
  for (const [path, content] of Object.entries(initial)) assert.deepEqual(get(root, path), content, path);
});
