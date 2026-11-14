import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ensureRuntime, main, validateArchive, validateExtracted } from '../BOOTSTRAP.mjs';
import { findExecutable } from '../../lib/runtime.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const tar = findExecutable('tar');
function fixture(t) {
  assert.ok(tar, 'Native tar is required for archive integration tests.');
  mkdirSync(join(project, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(project, '.agent-tests/bootstrap-node-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const platform = process.platform, arch = process.arch;
  const key = platform === 'win32' ? `win-${arch}` : `${platform}-${arch}`;
  const top = `node-v24.1.2-${key}`, extension = platform === 'win32' ? 'zip' : 'tar.gz';
  const bundle = join(root, top); mkdirSync(bundle);
  const write = (path, content) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); };
  write(join(bundle, platform === 'win32' ? 'node.exe' : 'bin/node'), 'fixture-node');
  write(join(bundle, platform === 'win32' ? 'node_modules/npm/bin/npm-cli.js' : 'lib/node_modules/npm/bin/npm-cli.js'), 'fixture-npm');
  const archive = join(root, `${top}.${extension}`);
  const packed = spawnSync(tar, [platform === 'win32' ? '-acf' : '-czf', archive, '-C', root, top], { encoding: 'utf8' });
  assert.equal(packed.status, 0, packed.stderr);
  const checksum = createHash('sha256').update(readFileSync(archive)).digest('hex');
  let manifest = `${checksum}  ${top}.${extension}\n`, calls = 0;
  const run = (file, args, options) => {
    if (args[0] === '-p') {
      if (!file.startsWith(root + sep) || !existsSync(file) || readFileSync(file, 'utf8') !== 'fixture-node') return { status: 1, stdout: '' };
      return { status: 0, stdout: JSON.stringify({ version: '24.1.2', node: file, bun: false }) };
    }
    if (args[1] === '--version') return { status: existsSync(args[0]) && readFileSync(args[0], 'utf8') === 'fixture-npm' ? 0 : 1, stdout: '11.0.0\n' };
    return spawnSync(file, args, options);
  };
  const options = { root, node: join(root, 'missing-node'), platform, arch, libc: 'glibc', run,
    download: async (url, destination) => { calls++; if (url.endsWith('SHASUMS256.txt')) writeFileSync(destination, manifest); else copyFileSync(archive, destination); } };
  return { root, options, archive, key, cache: join(root, '.pbai4devs/tools/.cache/runtime/node', key), script: name => write(join(root, '.pbai4devs/scripts', name, 'SCRIPT.mjs'), ''), setManifest: value => { manifest = value; }, calls: () => calls };
}

test('bootstrap Node extrai arquivo real, verifica npm e reutiliza cache sem rede', async t => {
  const f = fixture(t), runtime = await ensureRuntime(f.options);
  assert.equal(runtime.source, 'download'); assert.equal(runtime.version, '24.1.2'); assert.equal(f.calls(), 2);
  assert.ok(existsSync(runtime.node)); assert.ok(existsSync(runtime.npm));
  const cached = await ensureRuntime({ ...f.options, download: async () => { throw new Error('Network must not run'); } });
  assert.equal(cached.source, 'cache'); assert.equal(cached.node, runtime.node);
  assert.ok(readdirSync(f.cache).every(name => !name.startsWith('.stage.')));
});

test('checksum, manifesto ambíguo e download falho não promovem runtime', async t => {
  for (const kind of ['checksum', 'manifest', 'download']) await t.test(kind, async subtest => {
    const f = fixture(subtest), previous = join(f.cache, 'v24.1.2'); mkdirSync(previous, { recursive: true }); writeFileSync(join(previous, 'preserved'), 'original');
    if (kind === 'checksum') f.setManifest(`${'0'.repeat(64)}  node-v24.1.2-${f.key}.${process.platform === 'win32' ? 'zip' : 'tar.gz'}\n`);
    if (kind === 'manifest') f.setManifest('no matching official archive\n');
    const options = kind === 'download' ? { ...f.options, download: async () => { throw new Error('offline'); } } : f.options;
    await assert.rejects(ensureRuntime(options), /SHA-256|indisponivel|offline/);
    assert.equal(readFileSync(join(previous, 'preserved'), 'utf8'), 'original');
    assert.ok(readdirSync(f.cache).every(name => !name.startsWith('.stage.')));
  });
});

test('validação recusa nomes fora da distribuição antes da extração', () => {
  const top = 'node-v24.1.2-linux-x64';
  assert.doesNotThrow(() => validateArchive(`${top}/bin/npm\n`, top));
  for (const name of ['../../outside', `${top}/../outside`, '/absolute/file', `${top}/C:file`]) assert.throws(() => validateArchive(`${name}\n`, top), /fora/);
});

test('links internos extraídos são aceitos e links externos são recusados', t => {
  const f = fixture(t), inside = join(f.root, 'inside'), outside = join(f.root, 'outside'); mkdirSync(inside); mkdirSync(outside); writeFileSync(join(inside, 'file'), 'safe');
  try { symlinkSync('file', join(inside, 'link')); } catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('No symlink privilege'); return; } throw error; }
  assert.doesNotThrow(() => validateExtracted(inside));
  symlinkSync(outside, join(inside, 'escape'), 'dir');
  assert.throws(() => validateExtracted(inside), /fora/);
});

test('cache simbólico é recusado sem tocar alvo externo', async t => {
  const f = fixture(t), outside = join(f.root, 'outside'); mkdirSync(outside);
  const cacheRoot = join(f.root, '.pbai4devs/tools/.cache'); mkdirSync(dirname(cacheRoot), { recursive: true });
  try { symlinkSync(outside, cacheRoot, 'dir'); } catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('No symlink privilege'); return; } throw error; }
  await assert.rejects(ensureRuntime(f.options), /link simbolico/); assert.deepEqual(readdirSync(outside), []);
});

test('opções inválidas falham antes de rede ou criação de cache', async () => {
  await assert.rejects(main(['--runtime-only', 'all']), /nao aceita/);
  await assert.rejects(main(['--unknown']), /runtime-only/);
});

test('runtime atual saudável não altera PATH nem grava cache', async t => {
  const f = fixture(t), original = process.env.PATH;
  const result = await ensureRuntime({ root: f.root, minimum: Number(process.versions.node.split('.')[0]) });
  assert.equal(result.source, 'current'); assert.equal(process.env.PATH, original); assert.equal(existsSync(f.cache), false);
});

test('entrada única prepara runtime, diagnostica e encaminha argumentos e status sem shell', async t => {
  const f = fixture(t), calls = [];
  f.script('script com espaços');
  const args = ['script com espaços', '--flag', 'valor com espaços', '$(não executar)', '', '--', 'final'];
  const options = { ...f.options, run: (file, argv, settings) => {
    if (argv[0] === '-p' || argv[1] === '--version' || file === tar) return f.options.run(file, argv, settings);
    calls.push({ file, argv, settings });
    return { status: calls.length === 1 ? 0 : 69 };
  } };
  assert.equal(await main(['--executar', ...args], options), 69);
  assert.equal(f.calls(), 2);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].file, calls[1].file);
  assert.deepEqual(calls[0].argv, [join(f.root, '.pbai4devs/scripts/diagnosticar-ambiente/SCRIPT.mjs')]);
  assert.deepEqual(calls[1].argv, [join(f.root, '.pbai4devs/scripts/executar-script/SCRIPT.mjs'), ...args]);
  assert.equal(calls[0].settings.cwd, f.root);
  assert.equal(calls[1].settings.cwd, f.root);
  assert.equal(calls[1].settings.shell, undefined);
  assert.equal(calls[1].settings.stdio, 'inherit');
});

test('falha de diagnóstico impede execução e propaga status', async t => {
  const f = fixture(t), calls = [];
  f.script('qualquer');
  const options = { ...f.options, run: (file, argv, settings) => {
    if (argv[0] === '-p' || argv[1] === '--version' || file === tar) return f.options.run(file, argv, settings);
    calls.push(argv); return { status: 23 };
  } };
  assert.equal(await main(['--executar', 'qualquer'], options), 23);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], join(f.root, '.pbai4devs/scripts/diagnosticar-ambiente/SCRIPT.mjs'));
});

test('plano não instala nem diagnostica; usa apenas runtime disponível', async t => {
  const f = fixture(t), calls = [];
  f.script('qualquer');
  await assert.rejects(main(['--executar', '--plan', 'qualquer'], f.options), /prepare o runtime/);
  assert.equal(f.calls(), 0);
  assert.equal(existsSync(f.cache), false);
  await ensureRuntime(f.options);
  const callsBefore = f.calls();
  const options = { ...f.options, download: async () => { throw new Error('rede indevida'); }, run: (file, argv, settings) => {
    if (argv[0] === '-p' || argv[1] === '--version' || file === tar) return f.options.run(file, argv, settings);
    calls.push(argv); return { status: 0 };
  } };
  assert.equal(await main(['--executar', '--plan', 'qualquer', 'argumento'], options), 0);
  assert.equal(f.calls(), callsBefore);
  assert.deepEqual(calls, [[join(f.root, '.pbai4devs/scripts/executar-script/SCRIPT.mjs'), '--plan', 'qualquer', 'argumento']]);
});

test('--no-install falha sem runtime e usa cache sem rede; preserva flag do alvo', async t => {
  const f = fixture(t), calls = [];
  f.script('alvo');
  await assert.rejects(main(['--executar', '--no-install', 'alvo'], f.options), /prepare o runtime/);
  assert.equal(f.calls(), 0);
  assert.equal(existsSync(f.cache), false);
  await ensureRuntime(f.options);
  const options = { ...f.options, download: async () => { throw new Error('rede indevida'); }, run: (file, argv, settings) => {
    if (argv[0] === '-p' || argv[1] === '--version' || file === tar) return f.options.run(file, argv, settings);
    calls.push(argv); return { status: 0 };
  } };
  assert.equal(await main(['--executar', '--no-install', 'alvo', '--no-install'], options), 0);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], [join(f.root, '.pbai4devs/scripts/executar-script/SCRIPT.mjs'), 'alvo', '--no-install']);
  calls.length = 0;
  assert.equal(await main(['--executar', '--plan', '--no-install', 'alvo'], options), 0);
  assert.deepEqual(calls, [[join(f.root, '.pbai4devs/scripts/executar-script/SCRIPT.mjs'), '--plan', 'alvo']]);
});

test('modo novo encontra Node 24 no PATH com espaços sem baixar runtime', async t => {
  const f = fixture(t), calls = [], bin = join(f.root, 'bin com espaços');
  f.script('alvo');
  mkdirSync(join(bin, 'node_modules/npm/bin'), { recursive: true });
  const executable = join(bin, process.platform === 'win32' ? 'node.exe' : 'node');
  writeFileSync(executable, 'fixture-node');
  if (process.platform !== 'win32') chmodSync(executable, 0o755);
  writeFileSync(join(bin, 'node_modules/npm/bin/npm-cli.js'), 'fixture-npm');
  const options = { ...f.options, environment: { PATH: bin }, download: async () => { throw new Error('rede indevida'); }, run: (file, argv, settings) => {
    if (argv[0] === '-p' || argv[1] === '--version') return f.options.run(file, argv, settings);
    calls.push({ file, argv }); return { status: 0 };
  } };
  const runtime = await ensureRuntime({ ...options, searchPath: true, allowDownload: false });
  assert.equal(runtime.source, 'path');
  assert.equal(runtime.node, executable);
  assert.equal(await main(['--executar', '--no-install', 'alvo', 'argumento com espaços'], options), 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].file, executable);
  assert.deepEqual(calls[1].argv.slice(-2), ['alvo', 'argumento com espaços']);
  assert.equal(existsSync(f.cache), false);
  assert.equal(f.calls(), 0);
});

test('entrada única sem alvo falha antes de preparar runtime', async t => {
  const f = fixture(t);
  for (const args of [['--executar'], ['--executar', '--plan'], ['--executar', '--no-install'], ['--executar', '--plan', '--no-install']]) await assert.rejects(main(args, f.options), /nome-ou-caminho/);
  assert.equal(f.calls(), 0);
  assert.equal(existsSync(f.cache), false);
});

test('ajuda não procura runtime, acessa rede ou inicia diagnóstico', async t => {
  const f = fixture(t), unexpected = [];
  const options = { ...f.options, run: (...args) => { unexpected.push(args); return f.options.run(...args); } };
  for (const args of [['--executar', '--help'], ['--executar', '-h'], ['--executar', '--no-install', '--plan', '--help']]) assert.equal(await main(args, options), 0);
  assert.equal(unexpected.length, 0);
  assert.equal(f.calls(), 0);
  assert.equal(existsSync(f.cache), false);
});

test('alvo ou configuração inválida falha antes de runtime, rede e diagnóstico', async t => {
  const f = fixture(t), scripts = join(f.root, '.pbai4devs/scripts');
  const invalid = join(scripts, 'invalido'); mkdirSync(invalid, { recursive: true });
  writeFileSync(join(invalid, 'SCRIPT.mjs'), '');
  writeFileSync(join(invalid, 'SCRIPT.conf'), 'executor=desconhecido\n');
  writeFileSync(join(f.root, 'shell.sh'), '');
  const unexpected = [];
  const options = { ...f.options, run: (...args) => { unexpected.push(args); return f.options.run(...args); } };
  for (const target of ['ausente', 'invalido', 'shell.sh', '../fora.mjs']) {
    await assert.rejects(main(['--executar', target], options), /ausente|SCRIPT.conf|JavaScript|fora/);
  }
  assert.equal(unexpected.length, 0);
  assert.equal(f.calls(), 0);
  assert.equal(existsSync(f.cache), false);
});

test('CLI preserva código do seletor quando alvo não existe', t => {
  const f = fixture(t), target = join(f.root, 'ausente.mjs');
  const selector = join(project, '.pbai4devs/scripts/executar-script/SCRIPT.mjs');
  const bootstrap = join(project, '.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.mjs');
  const direct = spawnSync(process.execPath, [selector, target], { encoding: 'utf8', timeout: 30000 });
  const viaBootstrap = spawnSync(process.execPath, [bootstrap, '--executar', target], { encoding: 'utf8', timeout: 30000 });
  assert.equal(direct.status, 2, direct.stderr);
  assert.equal(viaBootstrap.status, direct.status, viaBootstrap.stderr);
  assert.match(viaBootstrap.stderr, /ausente/);
  assert.doesNotMatch(viaBootstrap.stdout, /node=/);
  assert.equal(existsSync(f.cache), false);
});

test('diagnóstico real bem-sucedido não garante dependências do alvo', { timeout: 180000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-bootstrap-integration-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cli = spawnSync(process.execPath, [join(project, 'bin/agentdevkit.mjs'), 'init', '--agents', 'codex', '--target', root, '--json'], { encoding: 'utf8', timeout: 120000 });
  assert.equal(cli.status, 0, `${cli.error?.message || ''}\n${cli.stderr}\n${cli.stdout}`);
  const target = join(root, 'probe.cjs');
  writeFileSync(target, `const {spawnSync}=require('node:child_process'); const p=spawnSync('adk-tool-nao-existe-197834',[]); console.log('DEPENDENCIA_AUSENTE='+(p.error?.code==='ENOENT')); process.exit(29);\n`);
  const environment = { ...process.env, PATH: dirname(process.execPath), Path: dirname(process.execPath) };
  const bootstrap = join(root, '.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.mjs');
  const result = spawnSync(process.execPath, [bootstrap, '--executar', '--no-install', 'probe.cjs'], { cwd: root, env: environment, encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
  assert.equal(result.status, 29, `${result.error?.message || ''}\n${result.stderr}\n${result.stdout}`);
  assert.match(result.stdout, /"tools"\s*:/);
  assert.match(result.stdout, /runtime=node/);
  assert.match(result.stdout, /DEPENDENCIA_AUSENTE=true/);
});
