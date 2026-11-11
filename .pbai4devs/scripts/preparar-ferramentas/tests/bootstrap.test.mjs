import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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
      if (!existsSync(file) || readFileSync(file, 'utf8') !== 'fixture-node') return { status: 1, stdout: '' };
      return { status: 0, stdout: JSON.stringify({ version: '24.1.2', node: file, bun: false }) };
    }
    if (args[1] === '--version') return { status: existsSync(args[0]) && readFileSync(args[0], 'utf8') === 'fixture-npm' ? 0 : 1, stdout: '11.0.0\n' };
    return spawnSync(file, args, options);
  };
  const options = { root, node: join(root, 'missing-node'), platform, arch, libc: 'glibc', run,
    download: async (url, destination) => { calls++; if (url.endsWith('SHASUMS256.txt')) writeFileSync(destination, manifest); else copyFileSync(archive, destination); } };
  return { root, options, archive, key, cache: join(root, '.pbai4devs/tools/.cache/runtime/node', key), setManifest: value => { manifest = value; }, calls: () => calls };
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
