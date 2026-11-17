import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const available = process.platform !== 'win32' && spawnSync('make', ['--version'], { encoding: 'utf8' }).status === 0;
function fixture(t) {
  const temp = mkdtempSync(join(tmpdir(), 'adk-make-guards-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  copyFileSync(join(root, 'Makefile'), join(temp, 'Makefile'));
  writeFileSync(join(temp, 'package.json'), '{"version":"0.0.30"}');
  return temp;
}
const options = { skip: available ? false : 'exige GNU Make e shell POSIX' };

test('setup não apaga node_modules existente', options, t => {
  const dir = fixture(t), modules = join(dir, 'node_modules');
  mkdirSync(modules); writeFileSync(join(modules, 'humano.txt'), 'fixture humana');
  const child = spawnSync('make', ['setup'], { cwd: dir, encoding: 'utf8' });
  assert.notEqual(child.status, 0); assert.match(child.stderr, /node_modules já existe/);
  assert.equal(readFileSync(join(modules, 'humano.txt'), 'utf8'), 'fixture humana');
});

test('setup recusa Docker indisponível antes de npm ci', options, t => {
  const dir = fixture(t), bin = join(dir, 'bin'); mkdirSync(bin);
  writeFileSync(join(bin, 'docker'), '#!/bin/sh\nexit 42\n', { mode: 0o755 });
  const child = spawnSync('make', ['setup'], { cwd: dir, env: { ...process.env, PATH: bin + delimiter + process.env.PATH }, encoding: 'utf8' });
  assert.notEqual(child.status, 0); assert.match(child.stdout, /docker version/);
  assert.doesNotMatch(child.stdout, /npm ci --ignore-scripts/);
  assert.equal(existsSync(join(dir, 'node_modules')), false);
});

test('build não sobrescreve artefato existente', options, t => {
  const dir = fixture(t), release = join(dir, '.agent-tests', 'release', '0.0.30');
  mkdirSync(release, { recursive: true }); writeFileSync(join(release, 'artefato.tgz'), 'fixture humana');
  const child = spawnSync('make', ['build'], { cwd: dir, encoding: 'utf8' });
  assert.notEqual(child.status, 0); assert.match(child.stderr, /diretório de release já existe/);
  assert.equal(readFileSync(join(release, 'artefato.tgz'), 'utf8'), 'fixture humana');
});

test('build recusa diretório de saída simbólico e preserva o destino', options, t => {
  const dir = fixture(t), external = join(dir, 'fora'); mkdirSync(external);
  writeFileSync(join(external, 'humano.txt'), 'fixture humana');
  symlinkSync(external, join(dir, '.agent-tests'), 'dir');
  const child = spawnSync('make', ['build'], { cwd: dir, encoding: 'utf8' });
  assert.notEqual(child.status, 0); assert.match(child.stderr, /Diretório de release inseguro/);
  assert.deepEqual(readdirSync(external), ['humano.txt']);
  assert.equal(readFileSync(join(external, 'humano.txt'), 'utf8'), 'fixture humana');
});
