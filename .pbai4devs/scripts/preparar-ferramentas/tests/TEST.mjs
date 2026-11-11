import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync, existsSync, copyFileSync, symlinkSync, unlinkSync, chmodSync, statSync, renameSync } from 'node:fs';
import { resolve, join, dirname, delimiter } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { hostname } from 'node:os';
import { ToolManager, platformKey, validateRelease, validateToolConfig, loadCatalog, main, toolEnvironment, binaryInvocation, toolActions, toolWrapper } from '../SCRIPT.mjs';
import { requireNode } from '../../lib/runtime.mjs';
import './bootstrap.test.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const tool = (name = 'test-tool', group = 'base') => ({ name, description: 'Ferramenta da fixture.', group, source: `https://github.com/owner/${name}`, download: { provider: 'npm', package: name, registry: 'https://registry.npmjs.org/', repository: `owner/${name}`, channel: 'latest' }, platforms: [platformKey()], scripts: { entry: 'SCRIPT.mjs' }, probe: ['--version'] });
const release = (version, name = 'test-tool') => ({ name, version, repository: { url: `git+https://github.com/owner/${name}.git` }, dist: { tarball: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`, integrity: 'sha512-fixture' } });
function createSymlink(t, target, path, type) {
  try { symlinkSync(target, path, type); return true; }
  catch (error) {
    if (!['EPERM', 'EACCES'].includes(error.code)) throw error;
    t.skip('Sistema sem permissao para criar symlinks de teste.');
    return false;
  }
}
function packageFiles(prefix, name, version, { tamper = false, broken = false, noBin = false } = {}) {
  const base = join(prefix, 'node_modules', name); mkdirSync(base, { recursive: true });
  writeFileSync(join(base, 'package.json'), JSON.stringify({ name, version, ...(!noBin ? { bin: 'cli.cjs' } : {}) }));
  writeFileSync(join(base, 'cli.cjs'), `#!/usr/bin/env node
if (${broken}) process.exit(9);
if (process.argv[2] === 'exit') process.exit(37);
if (process.argv[2] === 'require-env' && process.env.TOOL_FIXTURE_HOME !== process.argv[3]) process.exit(43);
if (process.argv[2] === 'require-literal' && process.env.DISABLE_TELEMETRY !== process.argv[3]) process.exit(44);
if (process.argv[2] === 'require-runtime' && process.env.PATH.split(require('node:path').delimiter)[0] !== process.argv[3]) process.exit(45);
if (process.argv[2] === 'echo') console.log(JSON.stringify(process.argv.slice(3)));
else if (process.argv[2] === 'env') console.log(JSON.stringify({state:process.env.TOOL_FIXTURE_HOME,keep:process.env.TOOL_FIXTURE_KEEP}));
else console.log(${JSON.stringify(version)});
`);
  writeFileSync(join(prefix, 'package-lock.json'), JSON.stringify({ packages: { [`node_modules/${name}`]: { integrity: tamper ? 'sha512-divergente' : 'sha512-fixture' } } }));
}
function fixture(t, catalog = { 'test-tool': tool() }, options = {}) {
  mkdirSync(join(project, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(project, '.agent-tests/tools com espaço-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, config] of Object.entries(catalog)) { const folder = join(root, '.pbai4devs/tools', name); mkdirSync(folder, { recursive: true }); writeFileSync(join(folder, 'TOOL.json'), JSON.stringify(config)); writeFileSync(join(folder, 'SCRIPT.mjs'), toolWrapper(name)); }
  const common = join(root, '.pbai4devs/scripts/preparar-ferramentas'); mkdirSync(common, { recursive: true });
  copyFileSync(join(project, '.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs'), join(common, 'SCRIPT.mjs'));
  mkdirSync(join(root, '.pbai4devs/scripts/lib'), { recursive: true });
  copyFileSync(join(project, '.pbai4devs/scripts/lib/runtime.mjs'), join(root, '.pbai4devs/scripts/lib/runtime.mjs'));
  const state = { version: '1.0.0', installs: 0, fetches: 0, fail: false, tamper: false, broken: false, noBin: false };
  const manager = new ToolManager({ root, catalog, fetchRelease: async name => { state.fetches++; return release(state.version, name); }, install(prefix, name, version) { state.installs++; if (state.fail) throw new Error('download de prova falhou'); packageFiles(prefix, name, version, state); }, ...options });
  return { root, manager, state, local: join(root, '.pbai4devs/tools/test-tool/.local') };
}

function setupNpm(root, { version = '10.0.0', exitCode = 0 } = {}) {
  const path = join(root, 'fake-npm-check.cjs');
  writeFileSync(path, `if(process.execPath !== ${JSON.stringify(process.execPath)} || process.argv[2] !== '--version') process.exit(71); console.log(${JSON.stringify(version)}); process.exit(${exitCode});\n`);
  return path;
}

// Descoberta e validacao acontecem antes de qualquer instalacao ou execucao.
test('TOOL.json e a origem unica; configuracoes invalidas e caminhos perigosos falham', t => {
  const { root } = fixture(t); assert.deepEqual(Object.keys(loadCatalog(root)), ['test-tool']);
  assert.equal(loadCatalog(root)['test-tool'].download.channel, 'latest');
  assert.throws(() => validateToolConfig('../outside', tool()), /Nome/);
  assert.throws(() => validateToolConfig('test-tool', { ...tool(), download: { ...tool().download, registry: 'https://evil.example/' } }), /Download/);
  assert.throws(() => validateToolConfig('test-tool', { ...tool(), scripts: { entry: '../SCRIPT.mjs' } }), /Script/);
  writeFileSync(join(root, '.pbai4devs/tools/test-tool/TOOL.json'), '{invalid'); assert.throws(() => loadCatalog(root), SyntaxError);
});

test('metadados incompletos nao se tornam ferramentas executaveis', () => {
  for (const change of [{ description: '' }, { description: undefined }, { source: undefined }, { source: 'file:///tmp/tool' }, { group: '' }, { platforms: [] }, { platforms: [platformKey(), platformKey()] }, { probe: [] }, { probe: ['bad\0arg'] }, { binary: '../tool' }]) {
    assert.throws(() => validateToolConfig('test-tool', { ...tool(), ...change }));
  }
});

test('catalogo exige ponte real da ferramenta correta e ignora apenas estado conhecido', async t => {
  for (const scenario of ['missing-script', 'directory-script', 'wrong-tool', 'missing-config']) await t.test(scenario, subtest => {
    const { root } = fixture(subtest); const folder = join(root, '.pbai4devs/tools/test-tool');
    if (scenario === 'missing-config') rmSync(join(folder, 'TOOL.json'));
    else {
      rmSync(join(folder, 'SCRIPT.mjs'));
      if (scenario === 'directory-script') mkdirSync(join(folder, 'SCRIPT.mjs'));
      if (scenario === 'wrong-tool') writeFileSync(join(folder, 'SCRIPT.mjs'), toolWrapper('other-tool'));
    }
    assert.throws(() => loadCatalog(root), /ausente|invalido|divergente/);
  });
  await t.test('state', subtest => {
    const { root } = fixture(subtest);
    for (const folder of ['bin', 'npm-cache', '.cache']) { const path = join(root, '.pbai4devs/tools', folder); mkdirSync(path); writeFileSync(join(path, 'TOOL.json'), 'invalid'); }
    assert.deepEqual(Object.keys(loadCatalog(root)), ['test-tool']);
  });
});

test('ponte simbolica de ferramenta nao escapa da origem', t => {
  const { root } = fixture(t); const script = join(root, '.pbai4devs/tools/test-tool/SCRIPT.mjs'); rmSync(script);
  if (!createSymlink(t, join(root, 'outside.mjs'), script)) return;
  assert.throws(() => loadCatalog(root), /nao pode ser um link/);
});

test('acoes comuns apontam para a ponte executavel e usam check para saude local', async t => {
  const { root, manager, state } = fixture(t); await manager.install('test-tool');
  const actions = toolActions('test-tool', tool());
  assert.deepEqual(Object.keys(actions), ['install', 'update', 'check', 'info', 'run', 'unlock']);
  assert.equal(actions.run.requiresArguments, true);
  for (const action of ['check', 'info']) {
    const [runtime, ...args] = actions[action].argv;
    assert.equal(runtime, 'node'); assert.equal(actions[action].executor, 'node');
    const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    if (action === 'info') assert.equal(JSON.parse(result.stdout).installed.version, '1.0.0');
  }
  assert.equal(state.installs, 1); assert.equal(state.fetches, 1);
});

test('pacote sem binario nao deixa uma instalacao marcada como pronta', async t => {
  const { manager, state, local } = fixture(t); state.noBin = true;
  await assert.rejects(manager.install('test-tool'), /Executavel ausente/);
  assert.equal(existsSync(join(local, 'CURRENT.json')), false);
  assert.equal(manager.info('test-tool').installed, null);
  assert.throws(() => manager.run('test-tool', ['--version']), /ausente/);
});

test('plataforma, pacote e origem oficiais sao conferidos antes de instalar', async t => {
  const { manager, state } = fixture(t);
  assert.throws(() => platformKey('win32', 'ia32'), /nao suportado/);
  assert.throws(() => validateRelease('test-tool', tool(), { ...release('1.0.0'), repository: 'https://evilgithub.com/owner/test-tool' }), /origem divergente/);
  assert.throws(() => validateRelease('test-tool', tool(), { ...release('1.0.0'), name: 'different' }), /Nome/);
  assert.throws(() => validateRelease('test-tool', tool(), { ...release('1.0.0'), dist: { ...release('1.0.0').dist, tarball: 'https://evil.example/tool.tgz' } }), /Tarball/);
  assert.throws(() => manager.check('__proto__'), /desconhecida/);
  manager.catalog['test-tool'] = { ...tool(), platforms: [process.platform === 'darwin' ? 'linux-x64' : 'darwin-arm64'] };
  await assert.rejects(manager.install('test-tool'), /Plataforma nao suportada/); assert.equal(state.fetches, 0);
});

test('install reutiliza sem rede; check, info e run nao instalam; argv e exit code preservados', async t => {
  const { root, manager, state, local } = fixture(t);
  assert.throws(() => manager.check('test-tool'), /ausente/); assert.equal(existsSync(local), false);
  assert.equal(manager.info('test-tool').installed, null); assert.equal(existsSync(local), false);
  assert.equal((await manager.install('test-tool')).changed, true); assert.equal(state.fetches, 1); assert.equal(state.installs, 1);
  const snapshot = readFileSync(join(local, 'CURRENT.json'), 'utf8');
  manager.fetchRelease = async () => { throw new Error('Nao deve consultar a rede'); };
  assert.equal((await manager.install('test-tool')).changed, false);
  assert.equal(manager.check('test-tool').version, '1.0.0'); assert.equal(manager.info('test-tool').installed.layout, 'local');
  assert.equal(manager.run('test-tool', ['exit']), 37);
  assert.equal(readFileSync(join(local, 'CURRENT.json'), 'utf8'), snapshot); assert.equal(state.installs, 1);
  const arg = 'valor com espaço;$(nao execute)';
  const cli = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs'), '--tool', 'test-tool', 'run', 'echo', arg], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr); assert.deepEqual(JSON.parse(cli.stdout), [arg]);
  const launcher = join(root, '.pbai4devs/tools/bin/test-tool.mjs');
  assert.ok(existsSync(launcher)); assert.equal(existsSync(join(root, '.pbai4devs/tools/bin/test-tool.cmd')), false);
  const viaLauncher = spawnSync(process.execPath, [launcher, 'echo', arg], { encoding: 'utf8' });
  assert.equal(viaLauncher.status, 0, viaLauncher.stderr); assert.deepEqual(JSON.parse(viaLauncher.stdout), [arg]);
  const viaWrapper = spawnSync(process.execPath, [join(root, '.pbai4devs/tools/test-tool/SCRIPT.mjs'), 'run', 'echo', arg], { encoding: 'utf8' });
  assert.equal(viaWrapper.status, 0, viaWrapper.stderr); assert.deepEqual(JSON.parse(viaWrapper.stdout), [arg]);
});

test('launchers recusam links de diretorio, arquivo e destino ausente sem escrever fora', async t => {
  for (const kind of ['directory', 'file', 'dangling']) await t.test(kind, subtest => {
    const { root, manager } = fixture(subtest);
    const bin = join(manager.home, 'bin'), outside = join(root, 'outside');
    if (kind === 'directory') {
      mkdirSync(outside);
      if (!createSymlink(subtest, outside, bin, 'dir')) return;
    } else {
      mkdirSync(bin);
      if (kind === 'file') writeFileSync(outside, 'preservar');
      if (!createSymlink(subtest, outside, join(bin, 'test-tool.mjs'), 'file')) return;
    }
    assert.throws(() => manager.launchers('test-tool'), /nao pode ser um link/);
    if (kind === 'directory') assert.deepEqual(readdirSync(outside), []);
    else if (kind === 'file') assert.equal(readFileSync(outside, 'utf8'), 'preservar');
    else assert.equal(existsSync(outside), false);
  });
});

test('unlock recupera somente lock local com PID comprovadamente morto', async t => {
  const { manager, local, state } = fixture(t);
  assert.deepEqual(manager.unlock('test-tool'), { name: 'test-tool', removed: false, state: 'missing' });
  assert.equal(existsSync(local), false);
  const child = spawnSync(process.execPath, ['-e', ''], { encoding: 'utf8' }); assert.equal(child.status, 0);
  const lock = join(local, '.update-lock'); mkdirSync(lock, { recursive: true });
  writeFileSync(join(lock, 'owner.json'), JSON.stringify({ pid: child.pid, hostname: hostname() }));
  assert.equal(manager.lockStatus('test-tool').state, 'stale');
  await assert.rejects(manager.withLock('test-tool', async () => true), /Lock orfao/);
  assert.deepEqual(manager.unlock('test-tool'), { name: 'test-tool', removed: true, state: 'stale' });
  assert.equal(existsSync(lock), false);
  await manager.withLock('test-tool', async () => assert.equal(JSON.parse(readFileSync(join(lock, 'owner.json'))).hostname, hostname()));
  assert.equal(state.fetches, 0); assert.equal(state.installs, 0);
  await assert.rejects(main(['unlock', 'all'], manager), /desconhecida/);
  await assert.rejects(main(['unlock', 'test-tool', 'extra'], manager), /unica ferramenta/);
});

test('unlock preserva locks ativos, incertos e recuperacao concorrente', async t => {
  for (const scenario of ['active', 'legacy', 'remote', 'invalid', 'recovering']) await t.test(scenario, subtest => {
    const { manager, local } = fixture(subtest); const lock = join(local, '.update-lock'); mkdirSync(lock, { recursive: true });
    const owner = scenario === 'legacy' ? { pid: 2147483647 } : { pid: process.pid, hostname: scenario === 'remote' ? `${hostname()}-outro` : hostname() };
    const content = scenario === 'invalid' ? '{invalido' : JSON.stringify(owner); writeFileSync(join(lock, 'owner.json'), content);
    if (scenario === 'recovering') writeFileSync(join(lock, 'recovery.json'), 'outro recuperador');
    assert.throws(() => manager.unlock('test-tool'), scenario === 'recovering' ? /EEXIST/ : /Lock active|Lock indeterminate/);
    assert.equal(readFileSync(join(lock, 'owner.json'), 'utf8'), content);
    assert.equal(existsSync(join(lock, 'recovery.json')), scenario === 'recovering');
  });
});

test('unlock detecta troca de dono antes de remover o lock', t => {
  const { manager, local } = fixture(t); const lock = join(local, '.update-lock'); mkdirSync(lock, { recursive: true });
  writeFileSync(join(lock, 'owner.json'), JSON.stringify({ pid: 2147483647, hostname: hostname() }));
  const replacement = JSON.stringify({ pid: process.pid, hostname: hostname() });
  manager.lockStatus = () => { writeFileSync(join(lock, 'owner.json'), replacement); return { state: 'stale', lock }; };
  assert.throws(() => manager.unlock('test-tool'), /mudou durante/);
  assert.equal(readFileSync(join(lock, 'owner.json'), 'utf8'), replacement);
  assert.equal(existsSync(join(lock, 'recovery.json')), false);
});

test('update consulta latest; falhas de download, integridade e probe preservam instalacao', async t => {
  const { manager, state, local } = fixture(t); await manager.install('test-tool');
  assert.equal((await manager.update('test-tool')).changed, false); assert.equal(state.fetches, 2); assert.equal(state.installs, 1);
  const before = readFileSync(join(local, 'CURRENT.json'), 'utf8'); state.version = '2.0.0'; state.fail = true;
  await assert.rejects(manager.update('test-tool'), /download de prova/); state.fail = false; state.tamper = true;
  await assert.rejects(manager.update('test-tool'), /nao corresponde/); state.tamper = false; state.broken = true;
  await assert.rejects(manager.update('test-tool'), /test-tool/); state.broken = false; state.noBin = true;
  await assert.rejects(manager.update('test-tool'), /Executavel ausente/); state.noBin = false;
  assert.equal(readFileSync(join(local, 'CURRENT.json'), 'utf8'), before); assert.equal(manager.check('test-tool').version, '1.0.0');
  assert.ok(readdirSync(local).every(name => !name.startsWith('.stage-') && (name === 'CURRENT.json' || !name.startsWith('CURRENT.')) && name !== '.update-lock'));
  assert.equal((await manager.update('test-tool')).version, '2.0.0'); assert.equal(manager.check('test-tool').version, '2.0.0');
});

test('falha ao gravar CURRENT restaura o target anterior e o pacote em uso', async t => {
  const { manager, state, local } = fixture(t); await manager.install('test-tool');
  const before = readFileSync(join(local, 'CURRENT.json'), 'utf8'); state.version = '2.0.0';
  const cache = join(local, 'versions', `2.0.0-${platformKey()}`); packageFiles(cache, 'test-tool', '2.0.0'); writeFileSync(join(cache, 'preserve.txt'), 'cached');
  manager.commitState = () => { throw new Error('CURRENT indisponivel'); };
  await assert.rejects(manager.update('test-tool'), /CURRENT indisponivel/);
  assert.equal(readFileSync(join(local, 'CURRENT.json'), 'utf8'), before); assert.equal(readFileSync(join(cache, 'preserve.txt'), 'utf8'), 'cached');
  assert.equal(manager.check('test-tool').version, '1.0.0'); assert.ok(!existsSync(join(local, '.update-lock')));
});

test('duas atualizacoes nao disputam a mesma ferramenta nem apagam lock alheio', async t => {
  const { manager, state, local } = fixture(t); let enter; let proceed;
  const entered = new Promise(resolve => { enter = resolve; });
  const allowed = new Promise(resolve => { proceed = resolve; });
  manager.fetchRelease = async () => { state.fetches++; enter(); await allowed; return release('1.0.0'); };
  const first = manager.update('test-tool'); await entered;
  await assert.rejects(manager.update('test-tool'), /em andamento/); assert.ok(existsSync(join(local, '.update-lock')));
  proceed(); await first; assert.equal(state.fetches, 1); assert.equal(state.installs, 1); assert.ok(!existsSync(join(local, '.update-lock')));
});

test('migracao move instalacao e cache antigos sem rede nem novo download', async t => {
  const { root, manager, state, local } = fixture(t);
  const legacy = join(root, '.pbai4devs/tools/test-tool'); const prefix = join(legacy, 'versions', `1.0.0-${platformKey()}`);
  packageFiles(prefix, 'test-tool', '1.0.0');
  const metadata = JSON.stringify({ name: 'test-tool', version: '1.0.0', platform: platformKey() })+'\n'; writeFileSync(join(legacy, 'CURRENT.json'), metadata);
  const oldCache = join(root, '.pbai4devs/tools/npm-cache'); mkdirSync(oldCache); writeFileSync(join(oldCache, 'cache-marker'), 'preserved');
  manager.fetchRelease = async () => { throw new Error('Migracao nao deve usar rede'); };
  assert.equal(manager.check('test-tool').layout, 'legacy'); assert.equal(existsSync(local), false);
  await manager.install('test-tool'); assert.equal(manager.check('test-tool').layout, 'local');
  assert.equal(readFileSync(join(local, 'CURRENT.json'), 'utf8'), metadata); assert.equal(existsSync(join(legacy, 'CURRENT.json')), false); assert.equal(existsSync(join(legacy, 'versions')), false);
  assert.equal(readFileSync(join(root, '.pbai4devs/tools/.cache/npm/cache-marker'), 'utf8'), 'preserved'); assert.equal(state.installs, 0); assert.equal(state.fetches, 0);
});

test('rename do hub preserva pacote e caches e setup regenera launcher sem rede', async t => {
  const { root, manager, state, local } = fixture(t);
  await manager.install('test-tool');
  const hub = join(root, '.pbai4devs'); const oldHub = join(root, '.agents');
  const receipt = readFileSync(join(local, 'CURRENT.json'), 'utf8');
  const packageFile = join(manager.current('test-tool').prefix, 'node_modules/test-tool/cli.cjs');
  const packageBefore = readFileSync(packageFile, 'utf8');
  for (const kind of ['npm', 'runtime/node/test-platform']) {
    const folder = join(hub, 'tools/.cache', kind); mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, 'preserved.txt'), kind);
  }
  renameSync(hub, oldHub);
  const launcher = join(oldHub, 'tools/bin/test-tool.mjs');
  writeFileSync(launcher, `import { main } from ${JSON.stringify(pathToFileURL(join(oldHub, 'scripts/preparar-ferramentas/SCRIPT.mjs')).href)};\nawait main(['run', 'test-tool', ...process.argv.slice(2)]);\n`);
  renameSync(oldHub, hub);
  assert.notEqual(spawnSync(process.execPath, [join(hub, 'tools/bin/test-tool.mjs'), '--version'], { encoding: 'utf8' }).status, 0);
  const repaired = new ToolManager({ root, npm: () => setupNpm(root),
    fetchRelease: async () => { throw new Error('Rename nao deve consultar o registro'); },
    install: () => { throw new Error('Rename nao deve reinstalar pacote'); } });
  const result = await repaired.setup('all');
  assert.equal(result.status, 'passed'); assert.equal(result.results[0].changed, false);
  assert.equal(readFileSync(join(local, 'CURRENT.json'), 'utf8'), receipt);
  assert.equal(readFileSync(packageFile, 'utf8'), packageBefore);
  assert.equal(state.installs, 1); assert.equal(state.fetches, 1);
  for (const kind of ['npm', 'runtime/node/test-platform']) assert.equal(readFileSync(join(hub, 'tools/.cache', kind, 'preserved.txt'), 'utf8'), kind);
  const rewritten = join(hub, 'tools/bin/test-tool.mjs');
  assert.doesNotMatch(readFileSync(rewritten, 'utf8'), /\/\.agents\//);
  const proof = spawnSync(process.execPath, [rewritten, 'echo', 'hub migrado'], { encoding: 'utf8' });
  assert.equal(proof.status, 0, proof.stderr); assert.deepEqual(JSON.parse(proof.stdout), ['hub migrado']);
  assert.equal(existsSync(oldHub), false);
  const moved = `${root}-movido`; renameSync(root, moved);
  t.after(() => rmSync(moved, { recursive: true, force: true }));
  const relocated = spawnSync(process.execPath, [join(moved, '.pbai4devs/tools/bin/test-tool.mjs'), 'echo', 'repositorio movido'], { encoding: 'utf8' });
  assert.equal(relocated.status, 0, relocated.stderr); assert.deepEqual(JSON.parse(relocated.stdout), ['repositorio movido']);
});

test('symlink de executavel para fora da instalacao e layout conflitante sao recusados', async t => {
  const { root, manager, local } = fixture(t); await manager.install('test-tool');
  writeFileSync(join(root, '.pbai4devs/tools/test-tool/CURRENT.json'), JSON.stringify({ name: 'test-tool', version: '0.1.0', platform: platformKey() }));
  mkdirSync(join(root, '.pbai4devs/tools/test-tool/versions')); await assert.rejects(manager.install('test-tool'), /coexistem/); assert.ok(existsSync(join(local, 'CURRENT.json')));
  await t.test('executavel simbolico externo', subtest => {
    const info = manager.current('test-tool'); const binary = join(info.prefix, 'node_modules/test-tool/cli.cjs'); rmSync(binary);
    if (!createSymlink(subtest, process.execPath, binary)) return;
    assert.throws(() => manager.check('test-tool'), /fora da instalacao/);
  });
});

test('envPaths isola estado em probes e run sem trocar ambiente global ou permitir escapes', async t => {
  for (const key of ['HOME', 'home', 'CODEX_HOME', 'Path', 'INVALID-NAME']) assert.throws(() => validateToolConfig('test-tool', { ...tool(), envPaths: { [key]: 'state' } }), /Variavel/);
  for (const location of ['', '.', '..', '../outside', '/tmp/outside', 'state/../outside', 'C:\\outside', 'C:outside', 'state\\outside']) assert.throws(() => validateToolConfig('test-tool', { ...tool(), envPaths: { TOOL_FIXTURE_HOME: location } }), /relativo/);
  assert.throws(() => validateToolConfig('test-tool', { ...tool(), envPaths: [] }), /envPaths/);
  const config = { ...tool(), envPaths: { TOOL_FIXTURE_HOME: 'state' } };
  const { root, manager, local } = fixture(t, { 'test-tool': config });
  const expected = join(local, 'state'); const original = process.env.TOOL_FIXTURE_HOME;
  const environment = toolEnvironment(config, local);
  assert.equal(environment.TOOL_FIXTURE_HOME, expected); assert.equal(environment.HOME, process.env.HOME); assert.equal(environment.PATH, process.env.PATH);
  assert.equal(process.env.TOOL_FIXTURE_HOME, original);
  manager.catalog['test-tool'].probe = ['require-env', expected];
  await manager.install('test-tool'); assert.equal(manager.check('test-tool').version, '1.0.0');
  const result = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs'), '--tool', 'test-tool', 'run', 'env'], { encoding: 'utf8', env: { ...process.env, TOOL_FIXTURE_HOME: 'global-default', TOOL_FIXTURE_KEEP: 'untouched' } });
  assert.equal(result.status, 0, result.stderr); assert.deepEqual(JSON.parse(result.stdout), { state: expected, keep: 'untouched' });
  assert.equal(process.env.TOOL_FIXTURE_HOME, original); assert.ok(!existsSync(expected));
  for (const [name, target] of [['diretorio simbolico', root], ['link simbolico quebrado', join(root, 'missing-target')]]) {
    await t.test(name, subtest => {
      if (!createSymlink(subtest, target, expected, 'dir')) return;
      subtest.after(() => unlinkSync(expected));
      assert.throws(() => toolEnvironment(config, local), /nao pode ser um link/);
    });
  }
});

test('ajuda focada e listagem concisa nao criam estado nem despejam configuracao', t => {
  const { root, local } = fixture(t);
  const script = join(root, '.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs');
  const help = spawnSync(process.execPath, [script, '--tool', 'test-tool'], { encoding: 'utf8' });
  assert.equal(help.status, 0); assert.match(help.stdout, /^test-tool:/); assert.doesNotMatch(help.stdout, /base\|all|--tool/);
  const list = spawnSync(process.execPath, [script, 'list'], { encoding: 'utf8' });
  assert.equal(list.status, 0); const entry = JSON.parse(list.stdout);
  assert.deepEqual(Object.keys(entry).sort(), ['group', 'installed', 'issue', 'name', 'platform', 'supported']);
  assert.equal(entry.installed, null); assert.equal(existsSync(local), false);
});

test('interface simples, aliases e --tool roteiam sem executar atualizacao implicita', async () => {
  const seen = []; const info = name => ({ name, version: '1.0.0', platform: platformKey() });
  const manager = { catalog: { base: { group: 'base' }, desktop: { group: 'desktop' } }, entry(name) { if(!Object.hasOwn(this.catalog,name)) throw new Error('unknown'); }, info, run(name,args) { seen.push(['run',name,...args]);return 37; }, async install(name){seen.push(['install',name]);return info(name);},async update(name){seen.push(['update',name]);return info(name);},check(name){seen.push(['check',name]);return info(name);} };
  await main([],manager); await main(['--tool','base'],manager); assert.deepEqual(seen,[]);
  await main(['install','base'],manager); await main(['--update','all'],manager); await main(['--tool','desktop','check'],manager); await main(['--check','base'],manager);
  assert.deepEqual(seen,[['install','base'],['update','base'],['update','desktop'],['check','desktop'],['check','base']]);
  assert.equal(await main(['--tool','desktop','run','echo','a b'],manager),37); assert.deepEqual(seen.at(-1),['run','desktop','echo','a b']);
  assert.equal(await main(['--run','base','exit'],manager),37);
  await assert.rejects(main(['--tool','base','update','extra'],manager),/excedentes/);
  await assert.rejects(main(['unknown'],manager),/Uso/);
});

test('env literal aceita apenas strings e variaveis nao protegidas', () => {
  assert.equal(validateToolConfig('test-tool', { ...tool(), env: { DISABLE_TELEMETRY: '1', EMPTY_VALUE: '' } }).env.EMPTY_VALUE, '');
  for (const key of ['HOME', 'home', 'CODEX_HOME', 'Path', 'INVALID-NAME']) assert.throws(() => validateToolConfig('test-tool', { ...tool(), env: { [key]: 'literal' } }), /Variavel/);
  for (const value of [null, 1, false, {}, [], 'bad\0value']) assert.throws(() => validateToolConfig('test-tool', { ...tool(), env: { TEST_VALUE: value } }), /Valor/);
  for (const value of [null, [], 'value']) assert.throws(() => validateToolConfig('test-tool', { ...tool(), env: value }), /env invalido/);
  assert.throws(() => validateToolConfig('test-tool', { ...tool(), env: { STATE: 'literal' }, envPaths: { state: 'state' } }), /duplicada/);
});

test('Node 24 e o unico runtime; versoes anteriores falham antes de alterar arquivos', async t => {
  assert.doesNotThrow(() => requireNode(24, '24.0.0'));
  assert.doesNotThrow(() => requireNode(24, '26.13.0'));
  for (const version of ['22.22.0', '20.19.0', '', 'invalid']) assert.throws(() => requireNode(24, version), /Node.js >=24/);
  const { manager, state, local } = fixture(t, { 'test-tool': tool() }, { nodeVersion: '22.22.0' });
  assert.equal(manager.info('test-tool').supported, false);
  await assert.rejects(manager.install('test-tool'), /Node.js >=24/);
  assert.equal(state.fetches, 0); assert.equal(state.installs, 0); assert.equal(existsSync(local), false);
});

test('definicoes usam um SCRIPT.mjs e rejeitam wrappers e runtimes antigos', () => {
  assert.equal(validateToolConfig('test-tool', tool()).scripts.entry, 'SCRIPT.mjs');
  for (const scripts of [{ entry: 'SCRIPT.sh' }, { posix: 'SCRIPT.sh', windows: 'SCRIPT.cmd', powershell: 'SCRIPT.ps1' }, { entry: 'SCRIPT.mjs', windows: 'SCRIPT.cmd' }]) {
    assert.throws(() => validateToolConfig('test-tool', { ...tool(), scripts }), /Script invalido/);
  }
  assert.throws(() => validateToolConfig('test-tool', { ...tool(), nodeMinimum: '22.0.0' }), /requisito comum/);
});

test('list e info reportam ferramentas incompativeis e preflight de all impede alteracoes parciais', async t => {
  const cases = [{ ...tool('unsupported-tool'), platforms: [process.platform === 'darwin' ? 'linux-x64' : 'darwin-arm64'] }];
  for (const unsupported of cases) {
    const catalog = { 'test-tool': tool(), 'unsupported-tool': unsupported };
    const { manager, state, root, local } = fixture(t, catalog);
    const info = manager.info('unsupported-tool'); assert.equal(info.supported, false); assert.equal(info.runtime, null); assert.match(info.issue, /nao suportada|nao encontrado/);
    assert.equal(manager.info('test-tool').supported, true);
    await main(['list'], manager); await main(['info', 'all'], manager);
    for (const mode of ['install', 'update']) await assert.rejects(main([mode, 'all'], manager), /nenhuma ferramenta foi alterada/);
    assert.equal(state.fetches, 0); assert.equal(state.installs, 0); assert.equal(existsSync(local), false);
    assert.equal(existsSync(join(root, '.pbai4devs/tools/unsupported-tool/.local')), false);
  }
});

test('grupos gerais selecionam suas ferramentas e nomes explicitos mantem precedencia', async t => {
  const catalog = { 'test-tool': tool(), 'source-a': tool('source-a', 'source'), 'source-b': tool('source-b', 'source') };
  const { manager, state } = fixture(t, catalog);
  await main(['install', 'source'], manager); assert.equal(state.installs, 2); assert.equal(state.fetches, 2);
  assert.equal(manager.info('test-tool').installed, null);
  await main(['check', 'source'], manager); assert.equal(state.installs, 2); assert.equal(state.fetches, 2);
  manager.catalog.source = tool('source', 'base');
  await main(['install', 'source'], manager); assert.equal(state.installs, 3);
  assert.equal(manager.current('source').version, '1.0.0');
});

test('env literal chega a probes e run; PATH selecionado e estado ficam restritos ao subprocesso', async t => {
  const original = { literal: process.env.DISABLE_TELEMETRY, path: process.env.PATH };
  const config = { ...tool(), env: { DISABLE_TELEMETRY: '1' }, probe: ['require-literal', '1'] };
  const { manager, local } = fixture(t, { 'test-tool': config });
  await manager.install('test-tool'); assert.equal(manager.check('test-tool').version, '1.0.0');
  assert.equal(manager.run('test-tool', ['require-literal', '1']), 0);
  const runtime = manager.runtime('test-tool');
  assert.equal(toolEnvironment(config, local, runtime).PATH.split(delimiter)[0], dirname(runtime.file));
  assert.equal(manager.run('test-tool', ['require-runtime', dirname(runtime.file)]), 0);
  assert.equal(process.env.DISABLE_TELEMETRY, original.literal); assert.equal(process.env.PATH, original.path);
});

test('npm e CLI usam Node atual, sem scripts de instalacao ou npm real', async t => {
  const config = { ...tool(), env: { DISABLE_TELEMETRY: '1' }, probe: ['require-literal', '1'] };
  const { root, local } = fixture(t, { 'test-tool': config });
  const npm = join(root, 'fake-npm/npm-cli.cjs'); mkdirSync(dirname(npm), { recursive: true });
  writeFileSync(npm, `const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
${packageFiles.toString()}
const args = process.argv.slice(2); const prefix = args[args.indexOf('--prefix') + 1];
packageFiles(prefix, 'test-tool', '1.0.0');
writeFileSync(join(prefix, 'npm-proof.json'), JSON.stringify({args,path:process.env.PATH,literal:process.env.DISABLE_TELEMETRY,strict:process.env.npm_config_engine_strict}));
`);
  const manager = new ToolManager({ root, catalog: { 'test-tool': config }, npm: () => npm, fetchRelease: async () => release('1.0.0') });
  const installed = await manager.install('test-tool'); const proof = JSON.parse(readFileSync(join(installed.prefix, 'npm-proof.json'), 'utf8'));
  assert.ok(proof.args.includes('--ignore-scripts')); assert.ok(proof.args.includes('--omit=dev')); assert.equal(proof.strict, 'true'); assert.equal(proof.literal, '1');
  assert.equal(proof.path.split(delimiter)[0], dirname(process.execPath));
  assert.equal(binaryInvocation(installed.prefix, 'test-tool')[0], process.execPath);
  assert.equal(installed.nodePath, process.execPath); assert.equal(installed.node, process.version);
  assert.equal(manager.check('test-tool').version, '1.0.0'); assert.equal(manager.run('test-tool', ['require-runtime', dirname(process.execPath)]), 0);
  assert.equal(JSON.parse(readFileSync(join(local, 'CURRENT.json'), 'utf8')).nodePath, process.execPath);
});

test('setup padrao prepara todas as ferramentas compativeis e confirma cada instalacao', async t => {
  const unsupported = { ...tool('unsupported-tool'), platforms: [process.platform === 'darwin' ? 'linux-x64' : 'darwin-arm64'] };
  const { root, manager, state, local } = fixture(t, { 'test-tool': tool(), 'unsupported-tool': unsupported });
  manager.npm = () => setupNpm(root);
  let installed = false; let checksAfterInstall = 0;
  const install = manager.install.bind(manager); const check = manager.check.bind(manager);
  manager.install = async name => { const result = await install(name); installed = true; return result; };
  manager.check = name => { if (installed) checksAfterInstall++; return check(name); };
  const result = await manager.setup();
  assert.equal(result.selection, 'all'); assert.equal(result.exitCode, 0); assert.equal(result.status, 'passed');
  assert.equal(result.nodePath, process.execPath);
  assert.deepEqual(result.summary, { passed: 1, failed: 0, notApplicable: 1 });
  assert.equal(result.npm.version, '10.0.0'); assert.equal(result.results[0].phase, 'check'); assert.equal(checksAfterInstall, 1);
  assert.equal(result.results[1].status, 'not-applicable'); assert.equal(result.results[1].exitCode, null);
  assert.equal(existsSync(join(root, '.pbai4devs/tools/unsupported-tool/.local')), false);
  assert.equal(state.installs, 1); assert.equal(state.fetches, 1); assert.ok(existsSync(join(local, 'CURRENT.json')));
});

test('setup verifica npm antes de mutar mesmo quando a ferramenta ja esta saudavel', async t => {
  const { root, manager, state, local } = fixture(t); await manager.install('test-tool');
  const before = readFileSync(join(local, 'CURRENT.json'), 'utf8');
  manager.npm = () => join(root, 'npm-missing.cjs');
  const result = await manager.setup();
  assert.equal(result.exitCode, 1); assert.equal(result.results[0].phase, 'preflight'); assert.match(result.results[0].reason, /npm indisponivel/);
  assert.equal(state.installs, 1); assert.equal(state.fetches, 1); assert.equal(readFileSync(join(local, 'CURRENT.json'), 'utf8'), before);
});

test('setup recusa npm ausente, quebrado ou invalido sem criar estado de ferramentas', async t => {
  for (const scenario of ['missing', 'broken', 'invalid']) await t.test(scenario, async subtest => {
    const { root, manager, state, local } = fixture(subtest);
    const path = scenario === 'missing' ? join(root, 'missing-npm.cjs') : setupNpm(root, scenario === 'broken' ? { exitCode: 19 } : { version: 'not-a-version' });
    manager.npm = () => path;
    const result = await manager.setup();
    assert.equal(result.exitCode, 1); assert.equal(result.summary.failed, 1); assert.equal(result.results[0].phase, 'preflight');
    if (scenario === 'broken') assert.equal(result.results[0].exitCode, 19);
    assert.match(result.results[0].reason, /https:\/\/nodejs.org\/en\/download/);
    assert.equal(state.fetches, 0); assert.equal(state.installs, 0); assert.equal(existsSync(local), false);
  });
});

test('setup coleta falhas de instalacao e check e continua as demais ferramentas', async t => {
  const catalog = Object.fromEntries(['first', 'second', 'third'].map(name => [name, tool(name)]));
  const { root, manager } = fixture(t, catalog); manager.npm = () => setupNpm(root);
  const seen = [];
  manager.install = async name => { seen.push(`install:${name}`); if (name === 'first') throw Object.assign(new Error('install failure'), { exitCode: 17 }); return { changed: true }; };
  manager.check = name => { seen.push(`check:${name}`); if (name === 'second') throw Object.assign(new Error('probe failure'), { exitCode: 23 }); return { version: '1.0.0' }; };
  const result = await manager.setup();
  assert.equal(result.exitCode, 1); assert.deepEqual(result.summary, { passed: 1, failed: 2, notApplicable: 0 });
  assert.deepEqual(result.results.map(item => [item.name, item.status, item.phase, item.exitCode]), [['first', 'failed', 'install', 17], ['second', 'failed', 'check', 23], ['third', 'passed', 'check', 0]]);
  assert.deepEqual(seen, ['install:first', 'install:second', 'check:second', 'install:third', 'check:third']);
});

test('setup grupo marca N/A mas nome explicito incompativel falha sem instalar', async t => {
  const catalog = { 'unsupported-tool': { ...tool('unsupported-tool', 'desktop'), platforms: [process.platform === 'darwin' ? 'linux-x64' : 'darwin-arm64'] } };
  const { manager, state, local } = fixture(t, catalog);
  manager.npm = () => { throw new Error('Nao deve verificar npm sem ferramentas compativeis'); };
  const group = await manager.setup('desktop'); assert.equal(group.status, 'not-applicable'); assert.equal(group.exitCode, 0);
  const explicit = await manager.setup('unsupported-tool'); assert.equal(explicit.status, 'failed'); assert.equal(explicit.exitCode, 1); assert.equal(explicit.results[0].status, 'failed');
  assert.equal(state.fetches, 0); assert.equal(state.installs, 0); assert.equal(existsSync(local), false);
});

test('CLI setup padrao all retorna o codigo agregado e rejeita argumentos excedentes', async t => {
  const { root, manager } = fixture(t); manager.npm = () => setupNpm(root);
  assert.equal(await main(['setup'], manager), 0);
  manager.npm = () => join(root, 'missing.cjs');
  assert.equal(await main(['--setup', 'all'], manager), 1);
  await assert.rejects(main(['setup', 'all', 'extra'], manager), /excedentes/);
});

test('executables valida plataforma e caminhos relativos sem autorizar comandos arbitrarios', () => {
  const base = { ...tool(), platforms: ['linux-x64', 'darwin-arm64'] };
  assert.deepEqual(validateToolConfig('test-tool', { ...base, executables: { 'linux-x64': ['bin/probe with space'] } }).executables, { 'linux-x64': ['bin/probe with space'] });
  for (const executables of [null, [], 'bin/probe', {}, { 'win32-x64': ['bin/probe'] }, { 'linux-arm64': ['bin/probe'] }, { 'linux-x64': [] }, { 'linux-x64': 'bin/probe' }, { 'linux-x64': ['bin/probe', 'bin/probe'] }]) {
    assert.throws(() => validateToolConfig('test-tool', { ...base, executables }), /[Ee]xecutave/);
  }
  for (const file of ['/tmp/probe', '../probe', 'bin/../probe', './probe', 'bin//probe', 'bin/', 'C:/probe', 'C:\\probe', 'bin\\probe', '', 'bad\0path', null]) {
    assert.throws(() => validateToolConfig('test-tool', { ...base, executables: { 'linux-x64': [file] } }), /relativo/);
  }
});

test('executables prepara somente binarios da plataforma no staging antes de executar probe real', { skip: process.platform === 'win32' }, async t => {
  const other = process.platform === 'darwin' ? 'linux-x64' : 'darwin-arm64';
  const config = { ...tool(), platforms: [platformKey(), other], executables: { [platformKey()]: ['native/probe with space'], [other]: ['native/unused'] } };
  const { manager } = fixture(t, { 'test-tool': config });
  manager.installPackage = (prefix, name, version) => {
    packageFiles(prefix, name, version);
    const base = join(prefix, 'node_modules', name); mkdirSync(join(base, 'native'));
    const native = join(base, 'native/probe with space');
    writeFileSync(native, `#!${process.execPath}\nconsole.log(${JSON.stringify(version)});\n`); chmodSync(native, 0o644);
    writeFileSync(join(base, 'native/unused'), 'unselected'); chmodSync(join(base, 'native/unused'), 0o644);
    writeFileSync(join(base, 'cli.cjs'), `const {spawnSync}=require('node:child_process');const target=require('node:path').join(__dirname,'native/probe with space');const r=spawnSync(target,process.argv.slice(2),{stdio:'inherit'});if(r.error)throw r.error;process.exit(r.status??1);\n`);
  };
  const result = await manager.install('test-tool');
  assert.equal(result.version, '1.0.0'); assert.equal(manager.check('test-tool').version, '1.0.0');
  assert.equal(statSync(join(result.prefix, 'node_modules/test-tool/native/probe with space')).mode & 0o777, 0o755);
  assert.equal(statSync(join(result.prefix, 'node_modules/test-tool/native/unused')).mode & 0o777, 0o644);
});

test('executables recusa arquivo ausente, diretorio e symlink fora do pacote sem promover staging', { skip: process.platform === 'win32' }, async t => {
  for (const scenario of ['missing', 'directory', 'external-symlink']) await t.test(scenario, async subtest => {
    const config = { ...tool(), executables: { [platformKey()]: ['native/probe'] } };
    const { root, manager, local } = fixture(subtest, { 'test-tool': config });
    const outside = join(root, 'outside-native'); writeFileSync(outside, 'untouched'); chmodSync(outside, 0o644);
    manager.installPackage = (prefix, name, version) => {
      packageFiles(prefix, name, version); const base = join(prefix, 'node_modules', name); mkdirSync(join(base, 'native'));
      if (scenario === 'directory') mkdirSync(join(base, 'native/probe'));
      if (scenario === 'external-symlink') symlinkSync(outside, join(base, 'native/probe'));
    };
    await assert.rejects(manager.install('test-tool'), /ENOENT|arquivo regular|fora do pacote/);
    assert.equal(existsSync(join(local, 'CURRENT.json')), false);
    assert.equal(statSync(outside).mode & 0o777, 0o644);
    assert.ok(readdirSync(local).every(name => !name.startsWith('.stage-')));
  });
});
