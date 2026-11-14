import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, resolve, join, dirname, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { run } from '../bin/agentdevkit.mjs';
import { resolveTarget } from '../src/install.mjs';
import { packageInfo } from '../src/config.mjs';
import { parseArgs } from '../src/cli.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(project, 'bin/agentdevkit.mjs');
function fixture(t) {
  mkdirSync(join(project, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(project, '.agent-tests/cli-'));
  assert.equal(spawnSync('git', ['init', '--quiet', root]).status, 0);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
const put = (root, path, value) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value); };
function cli(root, args, expected = 0) {
  const result = spawnSync(process.execPath, [bin, ...args, '--target', root, '--json'], { encoding: 'utf8', timeout: 180000 });
  assert.equal(result.status, expected, `agentdevkit ${args.join(' ')}: ${result.error?.stack || ''}\nsignal: ${result.signal || 'none'}\n${result.stdout || ''}${result.stderr || ''}`);
  const value = JSON.parse(result.stdout); assert.ok(Array.isArray(value.next)); assert.ok(value.next.length);
  return value;
}

test('help, version e erros retornam JSON unico com proxima acao', t => {
  const root = fixture(t);
  put(root, '.pbai4devs/state/agentdevkit.json', '{invalid');
  const help = cli(root, ['--help', '--lang', 'en']);
  assert.equal(help.language, 'en'); assert.equal(Object.hasOwn(help, 'clients'), false);
  const version = cli(root, ['--version']);
  assert.equal(version.version, packageInfo.version); assert.equal(Object.hasOwn(version, 'clients'), false);
  const invalid = cli(root, ['nonsense', '--lang', 'es'], 2);
  assert.equal(invalid.language, 'es'); assert.match(invalid.message, /Argumentos inválidos/);
});

test('tools preserva argumentos opacos após -- e opções globais antes dele', () => {
  const opaque = ['--', '--json', '--lang', 'en', '--target', 'example.test', '--agents', 'all', '--help', '--version'];
  const options = parseArgs(['--json', '--lang', 'es', '--target', 'project', 'tools', 'run', 'agent-browser', ...opaque]);
  assert.equal(options.command, 'tools');
  assert.equal(options.json, true); assert.equal(options.language, 'es');
  assert.equal(options.target, 'project'); assert.equal(options.clients, undefined);
  assert.deepEqual(options.toolArgs, ['run', 'agent-browser', ...opaque]);
  const childOnly = parseArgs(['tools', 'run', 'agent-browser', ...opaque]);
  assert.equal(childOnly.json, false); assert.equal(childOnly.language, null);
  assert.equal(childOnly.target, null);
});

test('tools encaminha flags do processo filho sem mudar idioma ou destino da CLI', t => {
  const root = fixture(t);
  put(root, '.pbai4devs/state/agentdevkit.json', JSON.stringify({ schemaVersion: 1, version: packageInfo.version, language: 'pt', clients: ['codex'], files: {}, blocks: {} }));
  put(root, '.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs', 'process.stdout.write(JSON.stringify(process.argv.slice(2)));\n');
  const opaque = ['run', 'agent-browser', '--', '--json', '--lang', 'en', '--target', 'example.test'];
  const result = spawnSync(process.execPath, [bin, '--json', '--target', root, 'tools', ...opaque], { encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.command, 'tools'); assert.equal(value.language, 'pt');
  assert.equal(value.target, root); assert.deepEqual(JSON.parse(value.toolOutput), opaque);
});

test('help e version independem de cwd reservado, destino e estado do projeto', t => {
  const root = fixture(t), cwd = join(root, 'node_modules');
  mkdirSync(cwd);
  put(cwd, '.pbai4devs/state/agentdevkit.json', '{invalid');
  for (const [flag, command] of [['--help', 'help'], ['--version', 'version']]) {
    for (const targetArgs of [[], ['--target', join(root, '.git')]]) {
      const result = spawnSync(process.execPath, [bin, flag, '--json', '--lang', 'en', ...targetArgs], { cwd, encoding: 'utf8', timeout: 60000 });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const value = JSON.parse(result.stdout);
      assert.equal(value.ok, true); assert.equal(value.command, command);
      assert.equal(value.language, 'en'); assert.equal(value.error, undefined);
    }
  }
  assert.equal(readFileSync(join(cwd, '.pbai4devs/state/agentdevkit.json'), 'utf8'), '{invalid');
});

test('sem comando inicializa; dry-run nao cria destino; init e update sao idempotentes', t => {
  const root = fixture(t), target = join(root, 'new project');
  const preview = cli(target, ['init', '--dry-run', '--lang', 'en']);
  assert.ok(preview.plan.length); assert.equal(existsSync(target), false);
  const first = cli(target, ['--yes', '--lang', 'en']); assert.equal(first.command, 'init'); assert.equal(first.changed, true);
  const state = JSON.parse(readFileSync(join(target, '.pbai4devs/state/agentdevkit.json')));
  assert.equal(state.language, 'en');
  for (const name of ['skills', 'agents', 'rules']) assert.ok(state.files[`.agents/${name}.json`]);
  assert.match(readFileSync(join(target, 'README.md'), 'utf8'), /^---\ndescription: .+\nlanguage: en\n---\n\n# Project\n/);
  assert.equal(cli(target, ['init', '--yes']).changed, false);
  assert.equal(cli(target, ['update']).changed, false);
  assert.equal(cli(target, ['doctor']).ok, true);
  assert.equal(cli(target, ['sync', '--check']).ok, true);
});

test('preserva README, settings, workflow e skill nativa do usuario inclusive com force', t => {
  const root = fixture(t);
  const custom = { 'README.md': '# Human project\n', '.vscode/settings.json': '{"human":true}', '.github/workflows/ci.yml': 'name: human\n', '.claude/skills/custom/SKILL.md': '# Human skill\n', 'AGENTS.md': '# Human rules\n\nKeep this.\n', '.gitignore': 'human-output/\n' };
  for (const [path, content] of Object.entries(custom)) put(root, path, content);
  cli(root, ['init', '--yes']); cli(root, ['update', '--force']);
  for (const [path, content] of Object.entries(custom)) {
    const current = readFileSync(join(root, path), 'utf8');
    if (['AGENTS.md', '.gitignore'].includes(path)) assert.ok(current.startsWith(content));
    else assert.equal(current, content);
  }
  put(root, 'AGENTS.md', `# Extra human rule\n${readFileSync(join(root, 'AGENTS.md'), 'utf8')}`);
  assert.equal(cli(root, ['doctor']).ok, true);
});

test('arquivo gerenciado com edição humana é preservado inclusive com force', t => {
  const root = fixture(t); cli(root, ['init', '--yes']);
  const path = '.pbai4devs/skills/projeto/criar-skill/SKILL.md';
  const custom = `${readFileSync(join(root, path), 'utf8')}\nCustomização humana.\n`; put(root, path, custom);
  for (const args of [['update'], ['update', '--force'], ['sync']]) {
    const result = cli(root, args);
    assert.ok(result.preserved.some(item => item.path === path), args.join(' '));
    assert.equal(readFileSync(join(root, path), 'utf8'), custom);
    assert.equal(Object.hasOwn(JSON.parse(readFileSync(join(root, '.pbai4devs/state/agentdevkit.json'))).files, path), false);
  }
});

test('migração preserva apontamentos sem ownership e limpa apenas o legado comprovado', t => {
  const root = fixture(t); cli(root, ['init', '--yes']);
  const grouped = '.codex/skills/projeto/configurar-projeto/SKILL.md';
  const native = readFileSync(join(root, '.agents/skills/projeto/configurar-projeto/SKILL.md'), 'utf8');
  put(root, grouped, native);
  const pointer = native.replace('../../../../.pbai4devs/', '../../../.pbai4devs/');
  put(root, '.codex/skills/configurar-projeto/SKILL.md', pointer);
  put(root, '.codex/skills/retained/SKILL.md', pointer);
  mkdirSync(join(root, '.codex/skills/retained/user-empty'), { recursive: true });
  for (const path of ['.codex/skills/user-empty', '.codex/agents/unrelated-empty', '.codex/own-empty']) mkdirSync(join(root, path), { recursive: true });
  put(root, '.codex/skills/custom/SKILL.md', '# User skill\n');
  put(root, '.pbai4devs/adapters/README.md', '# Adaptadores\n\nAntigravity\n');
  mkdirSync(join(root, '.pbai4devs/adapters/antigravity'), { recursive: true });
  cli(root, ['sync']);
  assert.ok(existsSync(join(root, '.codex/skills/configurar-projeto')));
  assert.equal(readFileSync(join(root, '.pbai4devs/adapters/README.md'), 'utf8'), '# Adaptadores\n\nAntigravity\n');
  assert.ok(existsSync(join(root, '.pbai4devs/adapters/antigravity')));
  assert.ok(existsSync(join(root, grouped)));
  assert.ok(existsSync(join(root, '.codex/skills/retained/SKILL.md')));
  for (const path of ['.codex', '.codex/skills', '.codex/skills/user-empty', '.codex/skills/retained/user-empty', '.codex/agents/unrelated-empty', '.codex/own-empty']) assert.ok(existsSync(join(root, path)), path);
  assert.equal(readFileSync(join(root, '.codex/skills/custom/SKILL.md'), 'utf8'), '# User skill\n');
  cli(root, ['update', '--force']);
  assert.ok(existsSync(join(root, '.codex/skills/user-empty')));
});

test('idioma persiste sem traduzir documentos do usuario', t => {
  const root = fixture(t); put(root, 'README.md', '# My product\n'); cli(root, ['init', '--yes']);
  assert.equal(cli(root, ['language', 'es']).language, 'es');
  assert.equal(cli(root, ['lang']).language, 'es');
  assert.match(readFileSync(join(root, 'AGENTS.md'), 'utf8'), /español/);
  assert.equal(readFileSync(join(root, 'README.md'), 'utf8'), '# My product\n');
});

test('link simbolico no destino nao e seguido', t => {
  const root = fixture(t), outside = join(root, 'outside'), target = join(root, 'target'); mkdirSync(join(outside, 'existing'), { recursive: true });
  try { symlinkSync(outside, target, 'dir'); } catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('No symlink privilege'); return; } throw error; }
  const result = cli(target, ['init', '--yes'], 1); assert.equal(result.error.code, 'E_TARGET'); assert.equal(existsSync(join(outside, '.pbai4devs')), false);
  const nested = cli(join(target, 'existing', 'new'), ['init', '--yes'], 1);
  assert.equal(nested.error.code, 'E_TARGET'); assert.equal(existsSync(join(outside, 'existing/new')), false);
});

test('variáveis de temporários não autorizam link humano no destino', t => {
  const root = fixture(t), real = join(root, 'real'), link = join(root, 'user-link');
  mkdirSync(join(real, 'existing'), { recursive: true });
  try { symlinkSync(real, link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip('No symlink privilege'); return; } throw error; }
  const keys = ['TMPDIR', 'TEMP', 'TMP'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    for (const key of keys) process.env[key] = join(link, 'existing');
    assert.throws(() => resolveTarget(join(link, 'existing', 'new')), { code: 'E_TARGET' });
    const result = cli(join(link, 'existing', 'new'), ['init', '--yes', '--dry-run'], 1);
    assert.equal(result.error.code, 'E_TARGET');
    assert.equal(existsSync(join(real, 'existing', 'new')), false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test('macOS aceita apenas alias temporário de sistema, preservando Git e recusando links internos', { skip: process.platform !== 'darwin' }, t => {
  const root = mkdtempSync('/private/tmp/adk-system-alias-');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const logical = join('/tmp', basename(root));
  assert.equal(resolveTarget(logical), root);
  assert.equal(resolveTarget(join(logical, 'new')), join(root, 'new'));
  assert.throws(() => resolveTarget(join(logical, '.GIT', 'new')), { code: 'E_TARGET' });

  const absent = cli(join(logical, 'new'), ['init', '--yes', '--dry-run', '--agents', 'codex']);
  assert.equal(absent.ok, true);
  assert.equal(existsSync(join(root, 'new')), false);
  assert.equal(cli(join(logical, 'new'), ['init', '--yes', '--agents', 'codex']).ok, true);
  assert.ok(existsSync(join(root, 'new', '.pbai4devs', 'state', 'agentdevkit.json')));

  const projectRoot = join(root, 'project'); mkdirSync(projectRoot);
  assert.equal(spawnSync('git', ['init', '--quiet', projectRoot]).status, 0);
  const original = '# Instrução humana\n', ignored = 'node_modules/\n';
  writeFileSync(join(projectRoot, 'AGENTS.md'), original);
  writeFileSync(join(projectRoot, '.gitignore'), ignored);
  assert.equal(spawnSync('git', ['-C', projectRoot, 'add', 'AGENTS.md', '.gitignore']).status, 0);
  const index = readFileSync(join(projectRoot, '.git', 'index'));
  assert.equal(cli(join(logical, 'project'), ['init', '--yes', '--agents', 'codex']).ok, true);
  assert.ok(readFileSync(join(projectRoot, 'AGENTS.md'), 'utf8').startsWith(original));
  assert.equal(readFileSync(join(projectRoot, '.gitignore'), 'utf8'), ignored);
  assert.deepEqual(readFileSync(join(projectRoot, '.git', 'index')), index);
  assert.ok(existsSync(join(projectRoot, '.agents', 'skills')));

  const outside = join(root, 'outside'), link = join(root, 'link'); mkdirSync(outside);
  symlinkSync(outside, link, 'dir');
  assert.throws(() => resolveTarget(join(logical, 'link', 'nested')), { code: 'E_TARGET' });
  assert.equal(existsSync(join(outside, 'nested')), false);

  const systemTemp = tmpdir();
  if (systemTemp === '/var/folders' || systemTemp.startsWith('/var/folders/')) {
    const temporaryRoot = mkdtempSync(join(systemTemp, 'adk-system-alias-'));
    t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));
    assert.equal(resolveTarget(temporaryRoot), realpathSync(temporaryRoot));
  }
});

test('macOS recusa alias de sistema com proprietário ou destino inesperado', { skip: process.platform !== 'darwin' }, () => {
  const modulePath = join(project, 'src', 'install.mjs');
  const script = `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    import { pathToFileURL } from 'node:url';
    const originalStat = fs.lstatSync, originalRealpath = fs.realpathSync;
    const mode = process.argv[2];
    fs.lstatSync = (path, ...options) => {
      const result = originalStat(path, ...options);
      if (path === '/tmp' && mode === 'owner') result.uid = 501;
      if (path === '/private/tmp' && mode === 'destination-owner') result.uid = 501;
      return result;
    };
    fs.realpathSync = (path, ...options) => {
      if (path === '/tmp' && mode === 'destination') return '/private/var';
      if (path === '/tmp' && mode === 'missing') throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      return originalRealpath(path, ...options);
    };
    syncBuiltinESMExports();
    const { resolveTarget } = await import(pathToFileURL(process.argv[1]).href);
    try { resolveTarget('/tmp/adk-spoof-test/new'); process.exitCode = 1; }
    catch (error) { if (error.code !== 'E_TARGET') throw error; }
  `;
  for (const mode of ['owner', 'destination-owner', 'destination', 'missing']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script, modulePath, mode], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${mode}: ${result.stderr}`);
  }
});

test('destinos reservados sao rejeitados em qualquer caixa sem escrever no Git', t => {
  const root = fixture(t);
  for (const name of ['.git', '.GIT', '.Git', 'node_modules', 'NODE_MODULES', 'Node_Modules', '.pbai4devs', '.PBAI4DEVS', '.PbAi4Devs']) {
    const existed = existsSync(join(root, name));
    assert.throws(() => resolveTarget(join(name, 'nested'), root), { code: 'E_TARGET' }, name);
    assert.equal(existsSync(join(root, name)), existed);
  }
  mkdirSync(join(root, 'existing'));
  assert.throws(() => resolveTarget('existing/../.GIT', root), { code: 'E_TARGET' });
});

test('destinos ausentes sob a raiz mantêm nome e ordem sem criar diretórios', () => {
  const root = parse(project).root, suffix = randomUUID();
  for (const name of [`adk-uncreated-probe-${suffix}`, `tmp-adk-uncreated-${suffix}`]) {
    const first = join(root, name), child = join(first, 'child'), nested = join(child, 'nested');
    assert.equal(existsSync(first), false);
    assert.equal(resolveTarget(child), join(realpathSync(root), name, 'child'));
    assert.equal(resolveTarget(nested), join(realpathSync(root), name, 'child', 'nested'));
    assert.throws(() => resolveTarget(join(first, '.GIT', 'nested')), { code: 'E_TARGET' });
    assert.equal(existsSync(first), false);
  }
});

test('entrada CLI funciona por symlink npm sem executar ao ser importada', t => {
  const root = fixture(t), entry = join(root, 'agentdevkit');
  try { symlinkSync(bin, entry, 'file'); } catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('No symlink privilege'); return; } throw error; }
  const result = spawnSync(process.execPath, [entry, '--version', '--json', '--target', root], { encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).version, packageInfo.version);
  const imported = spawnSync(process.execPath, ['--input-type=module', '-e', 'await import(process.argv[1]);', new URL('../bin/agentdevkit.mjs', import.meta.url).href], { encoding: 'utf8', timeout: 60000 });
  assert.equal(imported.status, 0, imported.stderr); assert.equal(imported.stdout, '');
});

test('estado e catalogo excluem artefatos locais sem apagar arquivos preexistentes', t => {
  const root = fixture(t), base = '.pbai4devs/scripts/preparar-ferramentas/tests';
  const artifacts = ['.playwright-mcp/trace.json', 'Playwright-report/index.html', 'sessions/active.json', 'logs/debug.log', 'tmp/result.txt', 'auth.json', 'credentials.json', 'history.jsonl', '.env.production'];
  for (const path of artifacts) put(root, `${base}/${path}`, 'local-only');
  const fixturePath = `${base}/fixtures/cache/input.txt`; put(root, fixturePath, 'fixture');
  cli(root, ['init', '--yes']);
  const state = JSON.parse(readFileSync(join(root, '.pbai4devs/state/agentdevkit.json'))), catalog = readFileSync(join(root, '.pbai4devs/catalog.json'), 'utf8');
  for (const path of artifacts) {
    assert.equal(state.files[`${base}/${path}`], undefined);
    assert.equal(catalog.includes(`${base}/${path}`), false, path);
    assert.equal(readFileSync(join(root, base, path), 'utf8'), 'local-only');
  }
  assert.equal(readFileSync(join(root, fixturePath), 'utf8'), 'fixture');
  assert.ok(catalog.includes(fixturePath));
});

test('proximo passo em texto mostra a skill e a instrucao contextual', t => {
  const root = fixture(t); cli(root, ['init', '--yes']);
  const expected = cli(root, ['next']);
  const result = spawnSync(process.execPath, [bin, 'next', '--target', root], { encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const step of expected.next) {
    if (step.skill) assert.ok(result.stdout.includes(step.skill));
    if (step.instruction) assert.ok(result.stdout.includes(step.instruction));
  }
});

test('saida humana resume alteracoes e limita o plano enquanto JSON permanece completo', t => {
  const root = fixture(t);
  const preview = spawnSync(process.execPath, [bin, 'init', '--dry-run', '--yes', '--target', root], { encoding: 'utf8', timeout: 180000 });
  assert.equal(preview.status, 0, `init --dry-run: ${preview.error?.stack || ''}\nsignal: ${preview.signal || 'none'}\n${preview.stdout || ''}${preview.stderr || ''}`);
  assert.match(preview.stdout, /Arquivos: \d+ criar, \d+ atualizar, 0 remover/);
  assert.match(preview.stdout, /use --json para o plano completo/);
  assert.equal(preview.stdout.split('\n').filter(line => /^  criar /.test(line)).length, 12);
  const json = cli(root, ['init', '--dry-run', '--yes']); assert.ok(json.plan.length > 12);
  const installed = spawnSync(process.execPath, [bin, 'init', '--yes', '--target', root], { encoding: 'utf8', timeout: 180000 });
  assert.equal(installed.status, 0, `init: ${installed.error?.stack || ''}\nsignal: ${installed.signal || 'none'}\n${installed.stdout || ''}${installed.stderr || ''}`);
  assert.match(installed.stdout, /Arquivos: \d+ criar/);
  assert.match(installed.stdout, /\[ Próximo passo \]/);
  assert.equal(installed.stdout.split('\n').filter(line => /^  criar /.test(line)).length, 0);
  assert.ok(installed.stdout.split('\n').length < 25);
});

test('bootstrap automatico preserva argumentos e status sem instalar ferramentas', async () => {
  const calls = []; const runtime = resolve(project, 'fake-node24');
  const code = await run(['init', '--target', 'a b', '--json'], { nodeVersion: '22.0.0', ensureRuntime: async options => { assert.equal(options.root, project); return { node: runtime }; }, spawn(file, args) { calls.push({ file, args }); return { status: 7 }; } });
  assert.equal(code, 7); assert.equal(calls[0].file, runtime);
  assert.deepEqual(calls[0].args.slice(1), ['init', '--target', 'a b', '--json']);
  let output = '';
  assert.equal(await run(['--json'], { nodeVersion: '22.0.0', ensureRuntime: async () => { throw new Error('offline'); }, stdout: { write: value => { output += value; } } }), 1);
  assert.equal(JSON.parse(output).ok, false); assert.ok(JSON.parse(output).next.length);
});
