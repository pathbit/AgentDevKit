import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { planLocalIgnore } from '../.pbai4devs/scripts/lib/gitignore.mjs';
import {
  binaryInvocation,
  loadCatalog as loadTools,
} from '../.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs';
import {
  ExternalSkills,
  loadCatalog as loadExternal,
} from '../.pbai4devs/scripts/gerenciar-skills-externas/SCRIPT.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const marker = 'SYNTHETIC_PRIVATE_MARKER';
const bad = `${marker} malformed`;

function fixture(t) {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'json-fixture-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function put(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function check(error, label, root) {
  assert.ok(error instanceof SyntaxError);
  assert.equal(error.message, `JSON invalido (${label}).`);
  assert.ok(!error.message.includes(marker));
  assert.ok(!error.message.includes(root));
  assert.ok(!String(error.stack).includes(marker));
  return true;
}

const entry = {
  id: 'vendor-demo',
  repository: 'vendor/skills',
  commit: 'a'.repeat(40),
  path: 'skills/demo/SKILL.md',
  name: 'demo',
  license: 'MIT',
  use: 'Fixture.',
  status: 'reviewed',
};
const catalog = {
  schemaVersion: 1,
  allowlist: ['vendor/skills'],
  skills: [entry],
};

test('TOOL.json inválido é sanitizado e preserva bytes', t => {
  const root = fixture(t);
  const file = join(root, '.pbai4devs/tools/demo/TOOL.json');
  put(file, bad);
  assert.throws(() => loadTools(root), error => check(error, 'TOOL.json', root));
  assert.equal(readFileSync(file, 'utf8'), bad);
});

test('CATALOG.json inválido é sanitizado e preserva bytes', t => {
  const root = fixture(t);
  const file = join(root, '.pbai4devs/external-skills/CATALOG.json');
  put(file, bad);
  assert.throws(
    () => loadExternal(root),
    error => check(error, 'CATALOG.json', root),
  );
  assert.equal(readFileSync(file, 'utf8'), bad);
});

test('manifesto inválido é sanitizado e ausência mantém ENOENT', t => {
  const root = fixture(t);
  const file = join(root, 'node_modules/demo/package.json');
  put(file, bad);
  assert.throws(
    () => binaryInvocation(root, 'demo'),
    error => check(error, 'package.json', root),
  );
  assert.throws(() => binaryInvocation(root, 'absent'), error => {
    return error.code === 'ENOENT';
  });
});

test('estado e lock de skill inválidos são sanitizados', t => {
  const root = fixture(t);
  const folder = join(root, '.pbai4devs/external-skills/.local/vendor-demo');
  mkdirSync(folder, { recursive: true });
  const manager = new ExternalSkills({ root, catalog });
  const current = join(folder, 'CURRENT.json');
  put(current, bad);
  assert.throws(
    () => manager.check('vendor-demo'),
    error => check(error, 'CURRENT.json', root),
  );
  assert.equal(readFileSync(current, 'utf8'), bad);

  const skill = join(folder, '.agents/skills/demo/SKILL.md');
  put(skill, '---\nname: demo\ndescription: Fixture\n---\n\n# Demo\n');
  const lock = join(folder, 'skills-lock.json');
  put(lock, bad);
  assert.throws(
    () => manager.validatePayload(folder, entry),
    error => check(error, 'skills-lock.json', root),
  );
  assert.equal(readFileSync(lock, 'utf8'), bad);
});

test('catálogo externo ausente mantém ENOENT', t => {
  const root = fixture(t);
  assert.throws(() => loadExternal(root), error => error.code === 'ENOENT');
});

test('política local de adaptadores inválida não expõe conteúdo nem altera arquivos', t => {
  const root = fixture(t);
  assert.equal(spawnSync('git', ['init', '--quiet', '--template=', root]).status, 0);
  const file = join(root, '.pbai4devs/templates/clients/ADAPTERS.json');
  const exclude = join(root, '.git/info/exclude');
  put(file, bad);
  put(exclude, '# exclusão humana\nprivate.local\n');
  put(join(root, 'human.txt'), 'conteúdo humano\n');
  assert.equal(spawnSync('git', ['add', '--', 'human.txt'], { cwd: root }).status, 0);
  const index = readFileSync(join(root, '.git/index'));
  assert.throws(() => planLocalIgnore(root), error => {
    assert.ok(error instanceof SyntaxError);
    assert.equal(error.message, 'JSON invalido: configuracao de adaptadores.');
    assert.ok(!String(error.stack).includes(marker));
    return true;
  });
  assert.equal(readFileSync(file, 'utf8'), bad);
  assert.equal(readFileSync(exclude, 'utf8'), '# exclusão humana\nprivate.local\n');
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('sync direto não expõe política de adaptadores inválida na carga inicial', t => {
  const root = fixture(t);
  assert.equal(spawnSync('git', ['init', '--quiet', '--template=', root]).status, 0);
  const scripts = join(root, '.pbai4devs/scripts');
  cpSync(join(project, '.pbai4devs/scripts'), scripts, { recursive: true });
  const file = join(root, '.pbai4devs/templates/clients/ADAPTERS.json');
  put(file, bad);
  put(join(root, 'human.txt'), 'conteúdo humano\n');
  assert.equal(spawnSync('git', ['add', '--', 'human.txt'], { cwd: root }).status, 0);
  const index = readFileSync(join(root, '.git/index'));
  const result = spawnSync(process.execPath, [join(scripts, 'sincronizar-agentes/SCRIPT.mjs'), '--check'], {
    cwd: root, encoding: 'utf8', timeout: 30000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /JSON invalido: configuracao de adaptadores\./);
  assert.ok(!`${result.stdout}${result.stderr}`.includes(marker));
  assert.ok(!`${result.stdout}${result.stderr}`.includes(root));
  assert.ok(!`${result.stdout}${result.stderr}`.includes(project));
  assert.equal(readFileSync(file, 'utf8'), bad);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(readFileSync(join(root, 'human.txt'), 'utf8'), 'conteúdo humano\n');
});

test('CLI principal informa política de adaptadores inválida sem expor conteúdo ou caminhos', t => {
  const root = fixture(t), bundle = join(root, 'bundle'), target = join(root, 'projeto');
  mkdirSync(target);
  assert.equal(spawnSync('git', ['init', '--quiet', '--template=', target]).status, 0);
  put(join(target, 'human.txt'), 'conteúdo humano\n');
  assert.equal(spawnSync('git', ['add', '--', 'human.txt'], { cwd: target }).status, 0);
  const index = readFileSync(join(target, '.git/index'));
  for (const path of ['src', 'bin', '.pbai4devs/scripts']) cpSync(join(project, path), join(bundle, path), { recursive: true });
  cpSync(join(project, 'package.json'), join(bundle, 'package.json'));
  const file = join(bundle, '.pbai4devs/templates/clients/ADAPTERS.json');
  put(file, bad);
  for (const json of [false, true]) for (const [language, message] of [
    ['pt', 'JSON de configuracao de adaptadores invalido.'],
    ['en', 'Invalid adapter configuration JSON.'],
    ['es', 'JSON de configuracion de adaptadores invalido.'],
  ]) {
    const result = spawnSync(process.execPath, [join(bundle, 'bin/agentdevkit.mjs'), 'init', '--target', target, '--lang', language, ...(json ? ['--json'] : [])], {
      cwd: target, encoding: 'utf8', timeout: 30000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    assert.ok(!`${result.stdout}${result.stderr}`.includes(marker));
    assert.ok(!`${result.stdout}${result.stderr}`.includes(root));
    if (json) {
      const output = JSON.parse(result.stdout);
      assert.equal(output.ok, false);
      assert.equal(output.error.code, 'E_ADAPTER_POLICY_JSON');
      assert.equal(output.command, 'startup');
      assert.equal(output.language, language);
      assert.equal(output.message, message);
    } else assert.equal(result.stdout.trim(), message);
    assert.deepEqual(readFileSync(join(target, '.git/index')), index);
    assert.equal(readFileSync(join(target, 'human.txt'), 'utf8'), 'conteúdo humano\n');
    assert.equal(existsSync(join(target, '.pbai4devs')), false);
    assert.equal(readFileSync(file, 'utf8'), bad);
  }
  for (const [args, expectedLanguage, json] of [
    [['init', '--target', 'en', '--lang', 'es', '--json'], 'es', true],
    [['init', '--lang', 'EN', '--json'], 'en', true],
    [['init', '--lang', 'en', '--lang', 'es', '--json'], 'es', true],
    [['lang', 'en', '--json'], 'en', true],
    [['tools', 'run', '--intent', '--lang', 'en', '--json'], 'en', true],
    [['lang', 'en', '--lang', 'es', '--help', '--json'], 'es', true],
    [['tools', 'run', '--', '--json', '--lang', 'en'], 'pt', false],
  ]) {
    const result = spawnSync(process.execPath, [join(bundle, 'bin/agentdevkit.mjs'), ...args], {
      cwd: target, encoding: 'utf8', timeout: 30000,
    });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    assert.ok(!result.stdout.includes(root));
    if (json) assert.equal(JSON.parse(result.stdout).language, expectedLanguage);
    else assert.equal(result.stdout.trim(), 'JSON de configuracao de adaptadores invalido.');
    assert.deepEqual(readFileSync(join(target, '.git/index')), index);
    assert.equal(existsSync(join(target, '.pbai4devs')), false);
  }
});

test('CLIs recusam JSON inválido sem expor conteúdo ou caminho', t => {
  const root = fixture(t);
  const scripts = join(root, '.pbai4devs/scripts');
  cpSync(join(project, '.pbai4devs/scripts'), scripts, { recursive: true });
  const tool = join(root, '.pbai4devs/tools/demo/TOOL.json');
  const external = join(root, '.pbai4devs/external-skills/CATALOG.json');
  put(tool, bad);
  put(external, bad);

  const cases = [
    ['preparar-ferramentas', 'list', 'TOOL.json'],
    ['gerenciar-skills-externas', 'list', 'CATALOG.json'],
  ];
  for (const [script, arg, label] of cases) {
    const run = spawnSync(process.execPath, [join(scripts, script, 'SCRIPT.mjs'), arg], {
      cwd: root,
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, NODE_OPTIONS: '' },
    });
    assert.equal(run.status, 1, run.stderr);
    assert.equal(run.stderr.trim(), `JSON invalido (${label}).`);
    assert.ok(!`${run.stdout}${run.stderr}`.includes(marker));
    assert.ok(!`${run.stdout}${run.stderr}`.includes(root));
  }
  assert.equal(readFileSync(tool, 'utf8'), bad);
  assert.equal(readFileSync(external, 'utf8'), bad);
});

test('erro ao ler diretório mantém EISDIR', t => {
  const root = fixture(t);
  const file = join(root, '.pbai4devs/external-skills/CATALOG.json');
  mkdirSync(file, { recursive: true });
  assert.throws(() => loadExternal(root), error => {
    return error.code === 'EISDIR' && !(error instanceof SyntaxError);
  });
});

test('CLI principal preserva estado e índice ao encontrar JSON malformado', { timeout: 180000 }, t => {
  const root = fixture(t), bin = join(project, 'bin/agentdevkit.mjs');
  const command = (file, args) => spawnSync(file, args, { cwd: root, encoding: 'utf8', timeout: 120000 });
  assert.equal(command('git', ['init', '--quiet', '--template=', root]).status, 0);
  put(join(root, '.git/info/exclude'), '# exclusões humanas\nprivate.local\n');
  put(join(root, 'human.txt'), 'conteúdo humano\n');
  put(join(root, '.gitignore'), '# configuração humana\n*.local\n');
  assert.equal(command('git', ['add', '--', 'human.txt', '.gitignore']).status, 0);
  const index = readFileSync(join(root, '.git/index'));
  const ignore = readFileSync(join(root, '.gitignore'));
  const init = command(process.execPath, [bin, 'init', '--target', root, '--agents', 'copilot', '--yes', '--json']);
  assert.equal(init.status, 0, init.stderr);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(readFileSync(join(root, '.gitignore')), ignore);
  appendFileSync(join(root, 'human.txt'), 'alteração local\n');
  const stateFiles = [
    '.pbai4devs/state/agentdevkit.json',
    '.pbai4devs/state/derived.json',
    '.pbai4devs/templates/gitignore/clients.json',
  ];
  const observed = ['.git/config', '.git/HEAD', '.git/info/exclude', '.gitignore', 'human.txt', ...stateFiles];
  const snapshot = name => existsSync(join(root, name)) ? readFileSync(join(root, name)) : null;
  for (const name of stateFiles) {
    const file = join(root, name), original = existsSync(file) ? readFileSync(file) : null;
    put(file, bad);
    const protectedFiles = observed.filter(item => item !== name);
    const before = protectedFiles.map(snapshot);
    for (const args of [['sync', '--check'], ['update', '--dry-run']]) {
      const result = command(process.execPath, [bin, ...args, '--target', root, '--json']);
      assert.equal(result.error, undefined);
      assert.equal(result.signal, null);
      assert.equal(result.status, 1);
      assert.ok(!`${result.stdout}${result.stderr}`.includes('SYNTHETIC'));
      const output = JSON.parse(result.stdout);
      assert.equal(output.ok, false);
      assert.equal(output.error.detail, name.endsWith('/agentdevkit.json')
        ? 'Invalid AgentDevKit state JSON.'
        : name.endsWith('/derived.json') ? 'Invalid derived entrypoint state.' : 'JSON invalido: configuracao de clientes');
      assert.equal(readFileSync(file, 'utf8'), bad);
      assert.deepEqual(readFileSync(join(root, '.git/index')), index);
      assert.deepEqual(protectedFiles.map(snapshot), before);
    }
    if (original === null) rmSync(file); else writeFileSync(file, original);
  }
});
