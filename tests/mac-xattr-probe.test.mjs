import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { devNull, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyXattr, inspectMacXattr, inspectMacXattrBlocker } from '../.pbai4devs/scripts/lib/xattr-probe.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(repository, 'bin/agentdevkit.mjs');
const macOnly = process.platform === 'darwin' ? false : 'teste de xattr requer macOS';
const syntheticName = 'org.pathbit.agentdevkit-fixture';
const syntheticValue = 'synthetic-value';
const hash = value => createHash('sha256').update(value).digest('hex');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_|^NODE_OPTIONS$/i.test(key)));
Object.assign(env, { GIT_CONFIG_GLOBAL: devNull, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' });

// Persistent file bytes and POSIX modes only: this does not measure transient
// writes, ACLs, other xattrs, flags, timestamps or Git internals outside root.
function snapshot(root) {
  const rows = [];
  function visit(relative) {
    const absolute = relative ? join(root, relative) : root;
    const info = lstatSync(absolute);
    assert.ok(!info.isSymbolicLink() && (info.isFile() || info.isDirectory()), 'fixture possui tipo inesperado');
    rows.push([relative, info.mode & 0o7777, info.isFile() ? hash(readFileSync(absolute)) : null]);
    if (info.isDirectory()) for (const name of readdirSync(absolute).sort()) visit(relative ? `${relative}/${name}` : name);
  }
  visit('');
  return rows;
}

function setAttribute(t, file, name = syntheticName) {
  const result = spawnSync('/usr/bin/xattr', ['-w', name, syntheticValue, file], {
    encoding: 'buffer', timeout: 5000, maxBuffer: 65536, shell: false,
    env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' },
  });
  if (result.error || result.signal || result.status !== 0) {
    if (process.env.ADK_STRICT_RECOVERY_TEST === '1') assert.fail('fixture não conseguiu criar atributo estendido sintético');
    t.skip('filesystem não permitiu criar atributo estendido sintético');
    return false;
  }
  return true;
}

test('classificador distingue saída vazia, presença e verificação incompleta', () => {
  const empty = Buffer.alloc(0);
  const success = { status: 0, signal: null, stdout: empty, stderr: empty };
  assert.equal(classifyXattr(success), 'empty');
  // Whitespace can be an attribute name; trim() would incorrectly return empty.
  assert.equal(classifyXattr({ ...success, stdout: Buffer.from(' \n') }), 'present');
  for (const result of [
    { ...success, error: Object.assign(new Error('não divulgar'), { code: 'ENOBUFS' }) },
    { ...success, error: Object.assign(new Error('não divulgar'), { code: 'ETIMEDOUT' }) },
    { ...success, signal: 'SIGTERM' }, { ...success, status: 2 },
    { ...success, stderr: Buffer.from('não divulgar') }, { ...success, stdout: null },
  ]) assert.equal(classifyXattr(result), 'unknown');
});

test('nome de atributo composto apenas por espaço é identificado', { skip: macOnly }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-xattr-classifier-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = join(root, 'arquivo com espaço');
  writeFileSync(file, 'fixture');
  assert.equal(inspectMacXattr(file), 'empty');
  assert.equal(inspectMacXattrBlocker(file, false), null);
  if (!setAttribute(t, file, ' ')) return;
  assert.equal(inspectMacXattr(file), 'present');
  assert.equal(inspectMacXattrBlocker(file, false), 'xattr-present');
  assert.equal(inspectMacXattrBlocker(file, true), null);
  assert.equal(inspectMacXattrBlocker(join(root, 'ausente'), true), 'xattr-unverified');
});

for (const mode of ['init', 'unaffected']) test(`xattr seletivo: ${mode} em fixture Git`, { skip: macOnly, timeout: 240000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-xattr-flow-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const run = (program, args) => spawnSync(program, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024, shell: false });
  const success = (program, args) => {
    const result = run(program, args);
    assert.equal(result.error, undefined, 'falha ao iniciar comando da fixture');
    assert.equal(result.signal, null, 'comando da fixture foi interrompido');
    assert.equal(result.status, 0, 'comando da fixture falhou');
    return result;
  };
  success('git', ['init', '--quiet']);
  writeFileSync(join(root, '.gitignore'), '# humano\nprivate/\n');
  writeFileSync(join(root, 'HUMAN.md'), 'staged\n');
  success('git', ['add', '--', '.gitignore', 'HUMAN.md']);
  writeFileSync(join(root, 'HUMAN.md'), 'staged\nunstaged\n');
  let target, args;
  if (mode === 'init') {
    target = 'AGENTS.md';
    writeFileSync(join(root, target), '# Equipe\n\nConteúdo humano.\n');
    args = ['init', '--agents', 'codex'];
  } else {
    const initial = success(process.execPath, [cli, 'init', '--target', root, '--agents', 'codex', '--yes', '--json']);
    assert.equal(JSON.parse(initial.stdout).ok, true);
    target = 'HUMAN.md';
    args = ['update', '--lang', 'en'];
  }
  const file = join(root, target);
  assert.equal(inspectMacXattr(file), 'empty');
  if (!setAttribute(t, file)) return;
  assert.equal(inspectMacXattr(file), 'present');
  const attributeValue = spawnSync('/usr/bin/xattr', ['-p', syntheticName, file], { encoding: 'buffer' }).stdout;
  const before = snapshot(root);
  const gitPaths = ['.git/index', '.git/HEAD', '.git/config', '.git/info/exclude', '.gitignore', 'HUMAN.md'];
  const gitBefore = Object.fromEntries(gitPaths.map(path => [path, hash(readFileSync(join(root, path)))]));
  const state = join(root, '.pbai4devs/state/agentdevkit.json');
  const stateBefore = mode === 'unaffected' ? readFileSync(state) : null;
  const result = run(process.execPath, [cli, ...args, '--target', root, '--yes', '--json']);
  assert.equal(result.error, undefined);
  assert.equal(result.signal, null);
  assert.ok(!result.stdout.includes(syntheticName) && !result.stderr.includes(syntheticName), 'nome do atributo não deve ser divulgado');
  assert.ok(!result.stdout.includes(syntheticValue) && !result.stderr.includes(syntheticValue), 'valor do atributo não deve ser divulgado');
  if (mode === 'init') {
    const output = JSON.parse(result.stdout);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(output.ok, true);
    assert.notDeepEqual(snapshot(root), before, 'init deve aplicar a configuração do kit');
    for (const path of gitPaths) assert.equal(hash(readFileSync(join(root, path))), gitBefore[path], `conteúdo preservado: ${path}`);
  } else {
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).ok, true);
    assert.notDeepEqual(readFileSync(state), stateBefore, 'fixture deve aplicar alteração real');
    for (const path of gitPaths) assert.equal(hash(readFileSync(join(root, path))), gitBefore[path], `conteúdo preservado: ${path}`);
  }
  assert.equal(inspectMacXattr(file), 'present', 'atributo sintético continua listado');
  assert.deepEqual(spawnSync('/usr/bin/xattr', ['-p', syntheticName, file], { encoding: 'buffer' }).stdout, attributeValue, 'valor do xattr deve ser preservado');
});
