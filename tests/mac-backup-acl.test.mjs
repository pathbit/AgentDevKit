import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import childProcess from 'node:child_process';
import { createHash } from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPlan } from '../src/install.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { collectErrorDiagnostics } from '../.pbai4devs/scripts/lib/error-reporting.mjs';

function put(root, path, content) { const file = join(root, path); fs.mkdirSync(dirname(file), { recursive: true }); fs.writeFileSync(file, content); }

for (const kind of ['install', 'sync']) for (const scenario of ['herdada', 'indisponivel', 'nao-herdada']) {
  test(`${kind}: backup com ACL ${scenario} respeita privacidade`, { timeout: 120000, skip: process.platform !== 'darwin' ? 'ACL macOS requer macOS' : false }, t => {
    const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-private-acl-')));
    t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
    assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
    put(root, '.gitignore', '# humano\n'); put(root, 'humano.txt', 'staged\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'humano.txt']).status, 0);
    fs.appendFileSync(join(root, 'humano.txt'), 'unstaged\n');
    let path, backupParent, operation;
    if (kind === 'install') {
      path = 'gerenciado.txt'; put(root, path, 'conteúdo sintético privado\n');
      const before = fs.readFileSync(join(root, path));
      const plan = { target: root, canApply: true, language: 'pt', changes: [{ path, action: 'update', content: Buffer.from('novo\n'), beforeHash: createHash('sha256').update(before).digest('hex') }], localIgnore: { edits: [] }, retiredRoots: [] };
      operation = () => applyPlan(plan); backupParent = '.agent-tests/agentdevkit/backups';
    } else {
      put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
      for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
      const source = '.pbai4devs/skills/demo/SKILL.md';
      put(root, source, '---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
      const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
      synchronize(options); path = '.claude/skills/demo/SKILL.md';
      put(root, source, '---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
      operation = () => synchronize(options); backupParent = '.agent-tests';
    }
    fs.mkdirSync(join(root, backupParent), { recursive: true });
    const acl = 'everyone allow list,search,readattr,readextattr,readsecurity,file_inherit,directory_inherit';
    if (scenario !== 'indisponivel') assert.equal(spawnSync('/bin/chmod', ['+a', scenario === 'herdada' ? acl : 'everyone allow list,search,readattr,readextattr,readsecurity', join(root, backupParent)]).status, 0);
    const target = join(root, path), before = fs.readFileSync(target), identity = fs.statSync(target, { bigint: true });
    const backupSource = kind === 'install' ? path : '.pbai4devs/catalog.json';
    const backupBytes = fs.readFileSync(join(root, backupSource)), backupMode = fs.statSync(join(root, backupSource)).mode & 0o777;
    const paths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'humano.txt'];
    const snapshots = new Map(paths.map(item => [item, fs.readFileSync(join(root, item))]));
    const spawn = childProcess.spawnSync; let injected = false;
    if (scenario === 'indisponivel') {
      t.mock.method(childProcess, 'spawnSync', (command, args, ...rest) => {
        const file = args?.at(-1);
        if (command === '/bin/ls' && typeof file === 'string' && file.includes(kind === 'install' ? '/agentdevkit/backups/' : '/.agent-tests/sync-backup.')) {
          injected = true; return { status: 1, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.from('privado-sintetico') };
        }
        return spawn(command, args, ...rest);
      });
      syncBuiltinESMExports();
    }
    let failure, result; try { result = operation(); } catch (error) { failure = error; }
    t.mock.restoreAll(); syncBuiltinESMExports();
    if (scenario === 'nao-herdada') {
      assert.equal(failure, undefined);
      const backupPath = resolve(root, kind === 'install' ? result.backup : result.backupRoot);
      assert.ok(fs.readdirSync(backupPath).length > 0);
      assert.deepEqual(fs.readFileSync(join(backupPath, backupSource)), backupBytes);
      assert.equal(fs.statSync(join(backupPath, backupSource)).mode & 0o777, backupMode);
      const listed = spawnSync('/bin/ls', ['-lde', '--', backupPath], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LC_ALL: 'C' } });
      assert.equal(listed.status, 0); assert.doesNotMatch(listed.stdout, /^\s*\d+: /m);
      assert.notDeepEqual(fs.readFileSync(target), before);
      for (const [item, content] of snapshots) assert.deepEqual(fs.readFileSync(join(root, item)), content);
      return;
    }
    if (scenario === 'indisponivel') assert.ok(injected, 'consulta do backup deve falhar');
    assert.equal(failure?.code, 'E_BACKUP');
    assert.ok(!failure.message.includes('privado-sintetico'));
    const diagnostics = collectErrorDiagnostics(failure);
    const backup = diagnostics.preservedPaths.find(item => item.includes(kind === 'install' ? 'agentdevkit/backups/' : 'sync-backup.'));
    assert.ok(backup, 'backup vazio deve ser informado para revisão');
    const backupPath = resolve(root, backup);
    assert.deepEqual(fs.readdirSync(backupPath), [], 'nenhum dado deve ser copiado');
    assert.equal(fs.statSync(backupPath).mode & 0o777, 0o700);
    if (scenario === 'herdada') {
      const listed = spawnSync('/bin/ls', ['-lde', '--', backupPath], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LC_ALL: 'C' } });
      assert.equal(listed.status, 0); assert.match(listed.stdout, /\binherited\b/);
    }
    assert.deepEqual(fs.readFileSync(target), before); assert.equal(fs.statSync(target, { bigint: true }).ino, identity.ino);
    for (const [item, content] of snapshots) assert.deepEqual(fs.readFileSync(join(root, item)), content);
  });
}

test("CLI init daily refusal with ACL inherited before copying data", { timeout: 120000, skip: process.platform !== 'darwin' ? 'ACL macOS requer macOS' : false }, t => {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-cli-private-acl-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
  put(root, '.gitignore', '# humano\n'); put(root, 'humano.txt', 'staged\n'); put(root, 'AGENTS.md', '# Instrução humana\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'humano.txt']).status, 0);
  fs.appendFileSync(join(root, 'humano.txt'), 'unstaged\n');
  assert.equal(spawnSync('/bin/chmod', ['+a', 'everyone allow read,file_inherit,directory_inherit', root]).status, 0);
  const target = join(root, 'AGENTS.md'), before = fs.readFileSync(target), identity = fs.statSync(target, { bigint: true });
  const listed = spawnSync('/bin/ls', ['-lde', '--', target], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LC_ALL: 'C' } });
  assert.equal(listed.status, 0); assert.doesNotMatch(listed.stdout, /^\s*\d+: /m, 'arquivo original deve estar sem ACL');
  const paths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'humano.txt'];
  const snapshots = new Map(paths.map(path => [path, fs.readFileSync(join(root, path))]));
  const cli = fileURLToPath(new URL('../bin/agentdevkit.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [cli, 'init', '--target', root, '--agents', 'codex', '--yes', '--json'], { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 1, result.stderr); const body = JSON.parse(result.stdout);
  assert.equal(body.error.code, 'E_RECOVERY_ACL_UNSAFE');
  assert.equal(body.recovery.status, 'invalid');
  const store = join(root, '.agent-tests', 'agentdevkit', 'recovery');
  assert.deepEqual(fs.readdirSync(store), [], 'nenhum registro ou backup deve ter sido gravado');
  const recoveryAcl = spawnSync('/bin/ls', ['-lde', '--', store], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LC_ALL: 'C' } });
  assert.equal(recoveryAcl.status, 0);
  assert.match(recoveryAcl.stdout, /\binherited\b/);
  assert.deepEqual(fs.readFileSync(target), before); assert.equal(fs.statSync(target, { bigint: true }).ino, identity.ino);
  for (const [path, content] of snapshots) assert.deepEqual(fs.readFileSync(join(root, path)), content);
});
