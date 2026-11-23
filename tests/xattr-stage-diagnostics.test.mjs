import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { devNull, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const unsupported = !['darwin', 'linux'].includes(process.platform);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
let work, packages;
after(() => { if (work) rmSync(work, { recursive: true, force: true }); });

function execute(program, args, { cwd, env, timeout = 120000 } = {}) {
  const result = spawnSync(program, args, { cwd, env, encoding: 'utf8', timeout, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.error, undefined, `${program}: ${result.error?.message}`);
  assert.equal(result.signal, null, `${program}: ${result.signal}`);
  return result;
}
function environment(root) {
  return { PATH: process.env.PATH || '/usr/bin:/bin', HOME: root, TMPDIR: root,
    GIT_CONFIG_GLOBAL: devNull, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0',
    npm_config_update_notifier: 'false', npm_config_audit: 'false', npm_config_fund: 'false' };
}
function sizeOf(root) {
  const stat = lstatSync(root);
  return stat.isDirectory() ? readdirSync(root).reduce((sum, name) => sum + sizeOf(join(root, name)), 0) : stat.isFile() ? stat.size : 0;
}
function preparePackages(t) {
  if (packages) return packages;
  work = realpathSync(mkdtempSync(join(tmpdir(), 'adk-stage-diag-test-')));
  const output = join(work, 'pack'), cache = join(work, 'npm-cache'), user = join(work, 'npm-user.conf'), global = join(work, 'npm-global.conf');
  mkdirSync(output); mkdirSync(cache); writeFileSync(user, ''); writeFileSync(global, '');
  const env = environment(work);
  const packed = execute('npm', ['pack', '--offline', '--ignore-scripts', '--json', '--cache', cache, '--userconfig', user, '--globalconfig', global, '--pack-destination', output], { cwd: source, env });
  assert.equal(packed.status, 0, packed.stderr);
  const records = JSON.parse(packed.stdout); assert.equal(records.length, 1);
  const archive = join(output, records[0].filename), sizes = statSync(archive).size;
  t.diagnostic(`pacote sintético: ${sizes} bytes; npm offline; sem scripts`);
  const prepared = {};
  for (const code of ['E_PROTECTED_METADATA', 'E_METADATA_UNSUPPORTED']) {
    const destination = join(work, code); mkdirSync(destination);
    const unpack = execute('tar', ['-xzf', archive, '-C', destination], { cwd: work, env }); assert.equal(unpack.status, 0, unpack.stderr);
    const root = join(destination, 'package'), install = join(root, 'src/install.mjs');
    const text = readFileSync(install, 'utf8');
    const needle = 'try { synchronized = synchronizePrivateStage({ root: stage, force: true, localIgnores: false, generateEntrypoints: false, recordDerivedState: false, outputBlocked, output() {} }, stageHandle); }';
    assert.equal(text.split(needle).length, 2, 'call site deve ser único');
    // Inject only into the disposable packed copy, with no environment override.
    const injection = `try { throw Object.assign(new Error('${code}: .gemini/commands/SYNTHETIC_STAGE_ONLY.toml'), { code: '${code}', path: '.gemini/commands/SYNTHETIC_STAGE_ONLY.toml' }); }`;
    writeFileSync(install, text.replace(needle, injection));
    prepared[code] = root;
  }
  t.diagnostic(`espaço sintético de preparação: ${sizeOf(work)} bytes, incluindo pacote, cache isolado e duas extrações`);
  packages = prepared;
  return packages;
}
function snapshot(root) {
  const rows = [];
  const visit = relative => {
    const file = relative ? join(root, relative) : root, stat = lstatSync(file);
    assert.equal(stat.isSymbolicLink(), false, relative);
    rows.push([relative, stat.isDirectory() ? 'directory' : 'file', stat.mode & 0o7777, stat.isFile() ? sha(readFileSync(file)) : null]);
    if (stat.isDirectory()) for (const name of readdirSync(file).sort()) visit(relative ? `${relative}/${name}` : name);
    else assert.equal(stat.isFile(), true, relative);
  };
  visit(''); return rows;
}

for (const code of ['E_PROTECTED_METADATA', 'E_METADATA_UNSUPPORTED']) for (const json of [true, false]) {
  test(`erro ${code} do estágio é contextualizado (${json ? 'JSON' : 'texto'})`, { skip: unsupported && 'prova empacotada POSIX', timeout: 240000 }, t => {
    const pkg = preparePackages(t)[code], root = realpathSync(mkdtempSync(join(work, 'project-'))), env = environment(work);
    const run = (program, args) => execute(program, args, { cwd: root, env, timeout: 180000 });
    const init = run('git', ['init', '--quiet']); assert.equal(init.status, 0, init.stderr);
    writeFileSync(join(root, '.gitignore'), '# humano\n'); writeFileSync(join(root, 'HUMAN.md'), 'staged\n');
    const add = run('git', ['add', '--', '.gitignore', 'HUMAN.md']); assert.equal(add.status, 0, add.stderr);
    writeFileSync(join(root, 'HUMAN.md'), 'staged\nunstaged\n');
    const before = snapshot(root), cli = join(pkg, 'bin/agentdevkit.mjs');
    const result = run(process.execPath, [cli, 'init', '--target', root, '--agents', 'codex', '--lang', 'pt', '--yes', ...(json ? ['--json'] : [])]);
    assert.notEqual(result.status, 0); assert.equal(result.stdout.includes('SYNTHETIC_STAGE_ONLY'), false); assert.equal(result.stderr.includes('SYNTHETIC_STAGE_ONLY'), false);
    if (json) {
      const value = JSON.parse(result.stdout); assert.equal(value.ok, false); assert.equal(value.error.code, code); assert.equal(value.error.scope, 'staging');
      assert.equal(value.error.path, undefined); assert.match(value.error.detail, /private staging/);
    } else assert.match(result.stdout, /estágio temporário/);
    assert.deepEqual(snapshot(root), before, 'consultas e recusa preservam bytes, modos e árvore Git observados');
  });
}

for (const code of ['E_PROTECTED_METADATA', 'E_METADATA_UNSUPPORTED']) {
  test(`causa original ${code} é preservada internamente`, { skip: unsupported && 'prova empacotada POSIX', timeout: 240000 }, t => {
    const pkg = preparePackages(t)[code], root = realpathSync(mkdtempSync(join(work, 'cause-'))), env = environment(work);
    const init = execute('git', ['init', '--quiet'], { cwd: root, env }); assert.equal(init.status, 0, init.stderr);
    const before = snapshot(root), moduleUrl = pathToFileURL(join(pkg, 'src/install.mjs')).href;
    const script = `import {planInstallation} from ${JSON.stringify(moduleUrl)}; try { planInstallation({target:${JSON.stringify(root)},mode:'init',clients:['codex']}); process.exitCode=2; } catch (e) { console.log(JSON.stringify({code:e.code,scope:e.diagnosticsScope,path:e.path??null,detail:e.message,causeCode:e.cause?.code,causeMessage:e.cause?.message})); }`;
    const result = execute(process.execPath, ['--input-type=module', '-e', script], { cwd: root, env }); assert.equal(result.status, 0, result.stderr);
    const actual = JSON.parse(result.stdout); assert.equal(actual.code, code); assert.equal(actual.scope, 'staging'); assert.equal(actual.path, null);
    assert.match(actual.detail, /private staging/); assert.equal(actual.detail.includes('SYNTHETIC_STAGE_ONLY'), false);
    assert.equal(actual.causeCode, code); assert.match(actual.causeMessage, /SYNTHETIC_STAGE_ONLY/);
    assert.deepEqual(snapshot(root), before);
  });
}
