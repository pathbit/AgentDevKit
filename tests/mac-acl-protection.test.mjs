import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import childProcess from 'node:child_process';
import { createHash } from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPlan } from '../src/install.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { classifyMacAcl } from '../.pbai4devs/scripts/lib/xattr-probe.mjs';

function put(root, path, content) {
  const file = join(root, path); fs.mkdirSync(dirname(file), { recursive: true }); fs.writeFileSync(file, content);
}

test("classifier refuses ambiguous result and identifies ACL whether or not with xattr marker", () => {
  const result = output => ({ status: 0, signal: null, stdout: Buffer.from(output), stderr: Buffer.alloc(0) });
  assert.equal(classifyMacAcl(result('-rw-r--r--  1 user group 1 date arquivo\n')), 'empty');
  assert.equal(classifyMacAcl(result('-rw-r--r--@ 1 user group 1 date arquivo\n 0: group:everyone allow read\n')), 'present');
  assert.equal(classifyMacAcl(result('-rw-r--r--+ 1 user group 1 date arquivo\n')), 'unknown');
  assert.equal(classifyMacAcl(result('-rw-r--r--X 1 user group 1 date arquivo\n')), 'unknown');
  assert.equal(classifyMacAcl(result('-rw-r--r--  inválido\n')), 'unknown');
  assert.equal(classifyMacAcl(result('lrwxr-xr-x  1 user group 1 date arquivo\n')), 'unknown');
  assert.equal(classifyMacAcl(result('drwx------  2 user group 64 date backup\n'), 'directory'), 'empty');
  assert.equal(classifyMacAcl(result('drwx------+ 2 user group 64 date backup\n 0: group:everyone allow read\n'), 'directory'), 'present');
  assert.equal(classifyMacAcl(result('drwx------@ 2 user group 64 date backup\n 0: group:everyone allow read\n'), 'directory'), 'present');
  assert.equal(classifyMacAcl(result('drwx------  2 user group 64 date backup\n')), 'unknown');
  assert.equal(classifyMacAcl(result('saída inesperada\n')), 'unknown');
  assert.equal(classifyMacAcl({ ...result(''), error: new Error('timeout') }), 'unknown');
  assert.equal(classifyMacAcl({ ...result(''), status: 1 }), 'unknown');
  assert.equal(classifyMacAcl({ ...result('-rw-r--r--  1 a b 1 date x\n'), signal: 'SIGTERM' }), 'unknown');
  assert.equal(classifyMacAcl({ ...result('-rw-r--r--  1 a b 1 date x\n'), stderr: Buffer.from('erro') }), 'unknown');
  assert.equal(classifyMacAcl(result('-rw-r--r--  1 a b 1 date x')), 'unknown');
});

test('instalador recusa quando a consulta de ACL falha', { timeout: 120000, skip: process.platform !== 'darwin' ? 'ACL macOS requer macOS' : false }, t => {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-mac-acl-fail-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
  assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
  put(root, 'gerenciado.txt', 'original\n');
  const target = join(root, 'gerenciado.txt'), original = fs.readFileSync(target), identity = fs.statSync(target, { bigint: true });
  const plan = { target: root, canApply: true, language: 'pt', changes: [{ path: 'gerenciado.txt', action: 'update', content: Buffer.from('novo\n'), beforeHash: createHash('sha256').update(original).digest('hex') }], localIgnore: { edits: [] }, retiredRoots: [] };
  const spawn = childProcess.spawnSync; let injected = false;
  t.mock.method(childProcess, 'spawnSync', (command, ...args) => {
    if (command === '/bin/ls') { injected = true; return { status: 1, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.from('falha privada sintética') }; }
    return spawn(command, ...args);
  });
  syncBuiltinESMExports();
  let failure; try { applyPlan(plan); } catch (error) { failure = error; }
  t.mock.restoreAll(); syncBuiltinESMExports();
  assert.ok(injected); assert.equal(failure?.code, 'E_METADATA_UNSUPPORTED');
  assert.equal(failure?.path, 'gerenciado.txt'); assert.equal(failure?.metadataReason, 'acl-unverified');
  assert.doesNotMatch(failure.message, /falha privada sintética/);
  assert.deepEqual(fs.readFileSync(target), original); assert.equal(fs.statSync(target, { bigint: true }).ino, identity.ino);
});

for (const kind of ['install', 'sync']) for (const withXattr of [false, true]) {
  test(`${kind}: atualização preserva ACL legível existente (xattr=${withXattr})`, { timeout: 120000, skip: process.platform !== 'darwin' ? 'ACL macOS requer macOS' : false }, t => {
    const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-mac-acl-')));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
    put(root, '.gitignore', '# humano\n'); put(root, 'humano.txt', 'staged\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'humano.txt']).status, 0);
    fs.appendFileSync(join(root, 'humano.txt'), 'unstaged\n');
    let path, operation;
    if (kind === 'install') {
      path = 'gerenciado.txt'; put(root, path, 'original\n');
      const before = fs.readFileSync(join(root, path));
      const plan = { target: root, canApply: true, language: 'pt', changes: [{ path, action: 'update', content: Buffer.from('novo\n'), beforeHash: createHash('sha256').update(before).digest('hex') }], localIgnore: { edits: [] }, retiredRoots: [] };
      operation = () => applyPlan(plan);
    } else {
      put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
      for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
      const source = '.pbai4devs/skills/demo/SKILL.md';
      put(root, source, '---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
      const options = { root, localIgnores: false, generateEntrypoints: false, output() {} };
      synchronize(options); path = '.claude/skills/demo/SKILL.md';
      put(root, source, '---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
      operation = () => synchronize(options);
    }
    const target = join(root, path), chmod = spawnSync('/bin/chmod', ['+a', 'everyone allow read', target], { encoding: 'utf8' });
    assert.equal(chmod.status, 0, chmod.stderr);
    if (withXattr) assert.equal(spawnSync('/usr/bin/xattr', ['-w', 'com.pathbit.acl-test', 'valor-sintetico', target]).status, 0);
    const acl = () => spawnSync('/bin/ls', ['-lde', '--', target], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LC_ALL: 'C' } }).stdout.split('\n').filter(line => /^\s*\d+: /.test(line));
    const originalAcl = acl(); assert.ok(originalAcl.some(line => line.includes('allow read')));
    const bytes = fs.readFileSync(target), identity = fs.statSync(target, { bigint: true });
    const paths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'humano.txt'];
    const snapshots = new Map(paths.map(item => [item, fs.readFileSync(join(root, item))]));
    let failure; try { operation(); } catch (error) { failure = error; }
    assert.equal(failure, undefined, failure?.stack);
    const after = fs.statSync(target, { bigint: true });
    assert.equal(after.dev, identity.dev); assert.equal(after.mode & 0o777n, identity.mode & 0o777n);
    assert.notDeepEqual(fs.readFileSync(target), bytes); assert.deepEqual(acl(), originalAcl);
    if (withXattr) {
      const attribute = spawnSync('/usr/bin/xattr', ['-p', 'com.pathbit.acl-test', target], { encoding: 'utf8' });
      assert.equal(attribute.status, 0); assert.equal(attribute.stdout.trim(), 'valor-sintetico');
    }
    for (const [item, content] of snapshots) assert.deepEqual(fs.readFileSync(join(root, item)), content);
  });
}

for (const language of ['pt', 'en', 'es']) for (const json of [false, true]) {
  test(`CLI preserva ACL legível durante init em ${language} json=${json}`, { timeout: 120000, skip: process.platform !== 'darwin' ? 'ACL macOS requer macOS' : false }, t => {
    const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-mac-acl-cli-')));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
    put(root, 'AGENTS.md', '# Instrução humana\n');
    const target = join(root, 'AGENTS.md');
    assert.equal(spawnSync('/bin/chmod', ['+a', 'everyone allow read', target]).status, 0);
    const original = fs.readFileSync(target);
    const acl = () => spawnSync('/bin/ls', ['-lde', '--', target], { encoding: 'utf8' }).stdout.split('\n').filter(line => /^\s*\d+: /.test(line));
    const originalAcl = acl(); assert.ok(originalAcl.some(line => line.includes('allow read')));
    const cli = new URL('../bin/agentdevkit.mjs', import.meta.url);
    const result = spawnSync(process.execPath, [fileURLToPath(cli), 'init', '--target', root, '--agents', 'codex', '--yes', '--lang', language, ...(json ? ['--json'] : [])], { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    if (json) {
      const body = JSON.parse(result.stdout);
      assert.equal(body.ok, true);
    }
    assert.notDeepEqual(fs.readFileSync(target), original);
    assert.deepEqual(acl(), originalAcl);
  });
}
