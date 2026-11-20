import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractTomlManagedBlock, mergeTomlContent, stripTomlContent, tomlManagedBlockDigest } from '../.pbai4devs/scripts/lib/managed-toml.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(repository, 'bin/agentdevkit.mjs');
const target = '.gemini/commands/revisar-entrega.toml';
const reference = '@{.pbai4devs/commands/revisar-entrega/COMMAND.md}';
const sentinel = 'sentinela-sintetica';
const permittedCodes = new Set(['E_METADATA_UNSUPPORTED', 'E_PROTECTED_METADATA', 'EACCES', 'EPERM']);
const hash = value => createHash('sha256').update(value).digest('hex');
const perl = String.raw`
  require 'syscall.ph';
  my ($action, $path) = @ARGV;
  my $name = 'user.pathbit-gemini-test';
  if ($action eq 'set') {
    my $value = 'sentinela-sintetica';
    my $rc = syscall(&SYS_setxattr, $path, $name, $value, length($value), 0);
    exit($rc == 0 ? 0 : 2);
  }
  my $buffer = "\0" x 256;
  my $rc = syscall(&SYS_getxattr, $path, $name, $buffer, 256);
  exit(3) if $rc < 0;
  print substr($buffer, 0, $rc);
`;

// An ambiguous error, including a code/path in later diagnostics, is not proof
// of a refusal for the target. Accept only a structured primary CLI error or
// the exact first stderr line of the standalone synchronizer.
function verifiedRefusal(operation, result, root) {
  if (!Number.isInteger(result.status) || result.status <= 0 || result.signal || result.error) return false;
  const paths = [target, join(root, target)];
  if (operation === 'sync-direct') {
    const first = (result.stderr || '').split(/\r?\n/)[0];
    return [...permittedCodes].some(code => paths.some(path => first === `${code}: ${path}`));
  }
  let response;
  try { response = JSON.parse(result.stdout); } catch { return false; }
  const code = response?.error?.code, errorPath = response?.error?.path;
  return response?.ok === false && permittedCodes.has(code)
    && paths.includes(errorPath);
}

function isCanonicalUpdate(bytes, digest) {
  if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest)) return false;
  try {
    const expected = `<!-- BEGIN AGENTDEVKIT -->\n${reference}\n\n{{args}}\n<!-- END AGENTDEVKIT -->`;
    return tomlManagedBlockDigest(bytes) === digest && extractTomlManagedBlock(bytes) === expected
      && !bytes.includes(Buffer.from('VERSÃO_ANTERIOR_SINTÉTICA'));
  } catch { return false; }
}

test('classificação de recusa exige código primário e caminho exatos', () => {
  const root = join(tmpdir(), 'fixture-sintetica');
  const path = join(root, target);
  const cliError = (code, detail, errorPath = path) => ({ status: 1, signal: null, error: null, stdout: JSON.stringify({ ok: false, error: { code, detail, path: errorPath } }), stderr: '' });
  for (const code of permittedCodes) {
    assert.equal(verifiedRefusal('update', cliError(code, `${code}: ${path}`), root), true);
    assert.equal(verifiedRefusal('sync-direct', { status: 2, signal: null, error: null, stderr: `${code}: ${path}\n`, stdout: '' }, root), true);
    assert.equal(verifiedRefusal('update', cliError(code, 'A operação foi recusada para preservar metadados.'), root), true);
    assert.equal(verifiedRefusal('update', cliError(code, `${code}: ${path}`, `${path}.outro`), root), false);
    const noPath = cliError(code, `${code}: ${path}`);
    const response = JSON.parse(noPath.stdout); delete response.error.path; noPath.stdout = JSON.stringify(response);
    assert.equal(verifiedRefusal('update', noPath, root), false);
    assert.equal(verifiedRefusal('sync-direct', { status: 2, signal: null, error: null, stderr: `erro primário\n${code}: ${path}\n`, stdout: '' }, root), false);
    assert.equal(verifiedRefusal('sync-direct', { status: 2, signal: null, error: null, stderr: `${code}: ${path}.outro\n`, stdout: '' }, root), false);
  }
  assert.equal(verifiedRefusal('update', cliError('E_OTHER', `E_PROTECTED_METADATA: ${path}`), root), false);
  assert.equal(verifiedRefusal('update', { ...cliError('EPERM', path), signal: 'SIGTERM' }, root), false);
  assert.equal(verifiedRefusal('update', { ...cliError('EPERM', path), status: 0 }, root), false);
});

test('sucesso exige digest registrado e bloco canônico atualizado', () => {
  const source = 'prompt = "Humano"\n';
  const canonical = mergeTomlContent(source, `${reference}\n\n{{args}}`);
  const stale = mergeTomlContent(source, `${reference}\n\n{{args}}\nVERSÃO_ANTERIOR_SINTÉTICA`);
  assert.equal(isCanonicalUpdate(Buffer.from(canonical.text), canonical.sha256), true);
  assert.equal(isCanonicalUpdate(Buffer.from(stale.text), stale.sha256), false);
  assert.equal(isCanonicalUpdate(Buffer.from(canonical.text), '0'.repeat(64)), false);
  assert.equal(isCanonicalUpdate(Buffer.from(source), canonical.sha256), false);
});

// This snapshot detects persistent names, modes and file bytes, including
// .agent-tests and .git; it does not measure other xattrs or transient writes.
function snapshot(root) {
  const rows = [];
  const visit = relative => {
    const path = relative ? join(root, relative) : root;
    const info = lstatSync(path);
    assert.ok(info.isFile() || info.isDirectory(), `fixture inesperada: ${relative}`);
    rows.push([relative, info.isDirectory() ? 'directory' : 'file', info.mode & 0o777, info.isFile() ? hash(readFileSync(path)) : null]);
    if (info.isDirectory()) for (const name of readdirSync(path).sort()) visit(relative ? `${relative}/${name}` : name);
  };
  visit('');
  return JSON.stringify(rows);
}

for (const operation of ['update', 'sync-cli', 'sync-direct']) {
  const name = `Gemini ${operation}: preserva xattr ou recusa sem alterações`;
  if (!['darwin', 'linux'].includes(process.platform)) { test(name, { skip: 'xattr nativo requer macOS ou Linux' }); continue; }
  test(name, { timeout: 240000 }, t => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-gemini-xattr-')));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const run = (program, args) => spawnSync(program, args, { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
    const git = (...args) => { const result = run('git', args); assert.equal(result.status, 0, result.stderr || result.error?.message); return result.stdout; };
    const put = (path, content) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); };
    const attribute = action => process.platform === 'darwin'
      ? run('/usr/bin/xattr', action === 'set' ? ['-w', 'com.pathbit.gemini-test', sentinel, join(root, target)] : ['-p', 'com.pathbit.gemini-test', join(root, target)])
      : run('perl', ['-e', perl, action, join(root, target)]);
    git('init', '--quiet');
    put('.gitignore', '# Regra humana\nprivate/\n');
    put('HUMAN.md', 'Documento humano sintético.\n');
    const original = 'description = "Humano"\nprompt = "Orientação humana" # comentário humano\n';
    put(target, original);
    git('add', '--', '.gitignore', 'HUMAN.md');
    const initialized = run(process.execPath, [cli, 'init', '--target', root, '--agents', 'gemini', '--yes', '--json']);
    assert.equal(initialized.status, 0, initialized.stdout + initialized.stderr);
    assert.equal(JSON.parse(initialized.stdout).ok, true);
    const statePath = '.pbai4devs/state/agentdevkit.json';
    const state = JSON.parse(readFileSync(join(root, statePath), 'utf8'));
    const prior = readFileSync(join(root, target), 'utf8');
    assert.equal(stripTomlContent(prior, state.blocks[target]), original);
    // Make the kit-owned block outdated, keeping a valid recorded digest.
    const outdated = mergeTomlContent(prior, `${reference}\n\n{{args}}\nVERSÃO_ANTERIOR_SINTÉTICA`, { expectedHash: state.blocks[target] });
    put(target, outdated.text);
    state.blocks[target] = outdated.sha256;
    put(statePath, `${JSON.stringify(state, null, 2)}\n`);
    const set = attribute('set');
    if (set.status !== 0) {
      const reason = `xattr sintético indisponível na fixture: ${set.stderr || set.error?.message || set.status}`;
      if (process.env.ADK_STRICT_RECOVERY_TEST === '1') assert.fail(reason);
      t.skip(reason);
      return;
    }
    const beforeAttribute = attribute('get');
    assert.equal(beforeAttribute.status, 0);
    assert.equal(beforeAttribute.stdout.trim(), sentinel);
    const beforeTarget = readFileSync(join(root, target));
    const protectedPaths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'HUMAN.md'];
    const protectedHashes = Object.fromEntries(protectedPaths.map(path => [path, hash(readFileSync(join(root, path)))]));
    const staged = hash(git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv'));
    const beforeTree = snapshot(root);
    const args = operation === 'sync-direct'
      ? [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--root', root]
      : [cli, operation === 'update' ? 'update' : 'sync', '--target', root, '--yes', '--json'];
    const result = run(process.execPath, args);
    const current = readFileSync(join(root, target));
    const afterAttribute = attribute('get');
    const stateAfter = JSON.parse(readFileSync(join(root, statePath), 'utf8'));
    const derivedFile = join(root, '.pbai4devs/state/derived.json');
    let derived = {};
    try { derived = JSON.parse(readFileSync(derivedFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const digest = derived.blocks?.[target] ?? stateAfter.blocks?.[target];
    let humanRestorable = false;
    try { humanRestorable = stripTomlContent(current, digest) === original; } catch { /* Diagnostic only. */ }
    const canonicalUpdated = isCanonicalUpdate(current, digest);
    t.diagnostic(JSON.stringify({ operation, status: result.status, signal: result.signal, targetChanged: !current.equals(beforeTarget), xattrPresent: afterAttribute.status === 0, humanRestorable, canonicalUpdated }));
    for (const path of protectedPaths) assert.equal(hash(readFileSync(join(root, path))), protectedHashes[path], `${operation}: ${path}`);
    assert.equal(hash(git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv')), staged, 'diff staged');
    assert.equal(afterAttribute.status, 0, `${operation}: atributo estendido removido`);
    assert.equal(afterAttribute.stdout, beforeAttribute.stdout, `${operation}: xattr alterado`);
    if (result.status === 0 && !result.signal && !result.error) {
      if (operation !== 'sync-direct') assert.equal(JSON.parse(result.stdout).ok, true);
      assert.notDeepEqual(current, beforeTarget, 'fixture deve atualizar efetivamente o TOML');
      assert.ok(canonicalUpdated, 'digest registrado e bloco atualizado devem corresponder ao conteúdo canônico');
      assert.equal(stripTomlContent(current, digest), original, 'remoção deve recuperar bytes humanos');
    } else {
      assert.ok(verifiedRefusal(operation, result, root), 'recusa inconclusiva: código primário e caminho exato não foram comprovados');
      assert.deepEqual(current, beforeTarget, 'recusa deve preservar bytes do TOML');
      assert.equal(snapshot(root), beforeTree, 'recusa deve preservar a árvore observada');
    }
  });
}
