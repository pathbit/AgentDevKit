import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import childProcess from 'node:child_process';
import fs, { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { dirname, join, relative, resolve, sep, win32 } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { applyPlan, planInstallation } from '../src/install.mjs';
import { main as cliMain } from '../src/cli.mjs';
import { collectErrorDiagnostics } from '../.pbai4devs/scripts/lib/error-reporting.mjs';
import { fileOwnerIssue } from '../.pbai4devs/scripts/lib/file-owner.mjs';
import { checkWindowsFileChanges, publishFileReplacement, verifyWindowsFileChangeProbe } from '../.pbai4devs/scripts/lib/native-metadata.mjs';
import { inspectProjectRecovery } from '../.pbai4devs/scripts/lib/project-recovery.mjs';
import { verifyRecoveryBackup } from '../.pbai4devs/scripts/lib/recovery-backup.mjs';
import { createPrivateRecoveryDirectory } from '../.pbai4devs/scripts/lib/recovery-privacy.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const windowsAcl = {
  skip: process.platform !== 'win32' ? 'A DACL requer Windows e NTFS.' : false,
  timeout: 180000,
};

function ntfsProject(t) {
  const root = mkdtempSync(join(tmpdir(), 'adk-ntfs-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '--quiet', root]).status, 0);
  return root;
}

function ntfsDacl(file, addReadRule = false) {
  const script = [
    "$ErrorActionPreference = 'Stop'",
    '$file = $env:ADK_TEST_ACL_FILE',
    '$drive = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($file))',
    "if ($drive.DriveFormat -ne 'NTFS') { throw 'A prova da DACL exige um volume NTFS.' }",
    '$section = [Security.AccessControl.AccessControlSections]::Access',
  ];
  if (addReadRule) script.push(
    '$acl = [IO.File]::GetAccessControl($file, $section)',
    '$original = $acl.GetSecurityDescriptorSddlForm($section)',
    '$userSid = [Security.Principal.WindowsIdentity]::GetCurrent().User',
    "$rule = [Security.AccessControl.FileSystemAccessRule]::new($userSid, 'ReadAttributes', 'Allow')",
    '$acl.AddAccessRule($rule)',
    '[IO.File]::SetAccessControl($file, $acl)',
  );
  script.push('$descriptor = ([IO.File]::GetAccessControl($file, $section)).GetSecurityDescriptorSddlForm($section)');
  if (addReadRule) script.push("if ($descriptor -eq $original) { throw 'A regra explícita da fixture não foi adicionada.' }");
  script.push('$descriptor');
  const powershell = join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', script.join('\n')], {
    encoding: 'utf8', timeout: 60000, env: { ...process.env, ADK_TEST_ACL_FILE: file },
  });
  assert.equal(result.status, 0, result.error?.message || result.stderr);
  const descriptor = result.stdout.trim();
  assert.match(descriptor, /^D:/);
  return descriptor;
}

function initCodex(root) {
  const result = spawnSync(process.execPath, [join(repository, 'bin/agentdevkit.mjs'), 'init',
    '--target', root, '--agents', 'codex', '--lang', 'pt', '--yes', '--json'], { encoding: 'utf8', timeout: 120000 });
  assert.equal(result.status, 0, result.error?.message || result.stderr + result.stdout);
  assert.equal(JSON.parse(result.stdout).ok, true);
}

test('Windows: init incorpora instruções e preserva a DACL explícita do AGENTS.md', windowsAcl, t => {
  const root = ntfsProject(t);
  const file = join(root, 'AGENTS.md');
  const human = '# Instruções da equipe\n';
  const stream = file + ':fixture';
  writeFileSync(file, human);
  writeFileSync(stream, 'fluxo que deve permanecer');
  const original = ntfsDacl(file, true);
  const identity = fs.statSync(file, { bigint: true });
  initCodex(root);
  const updated = readFileSync(file, 'utf8');
  assert.ok(updated.startsWith(human));
  assert.match(updated, /<!-- BEGIN AGENTDEVKIT -->/);
  assert.equal(ntfsDacl(file), original);
  assert.equal(readFileSync(stream, 'utf8'), 'fluxo que deve permanecer');
  assert.equal(fs.statSync(file, { bigint: true }).ino, identity.ino);
});

test('Windows: sync direto atualiza o apontamento e preserva sua DACL explícita', windowsAcl, t => {
  const root = ntfsProject(t);
  initCodex(root);
  const skill = 'skills/seguranca/revisar-seguranca/SKILL.md';
  const pointer = join(root, '.agents', skill);
  const source = join(root, '.pbai4devs', skill);
  const description = 'description: Descrição da fixture NTFS.';
  assert.ok(!readFileSync(pointer, 'utf8').includes(description));
  const body = readFileSync(source, 'utf8');
  assert.match(body, /^description: .+$/m);
  writeFileSync(source, body.replace(/^description: .+$/m, description));
  const original = ntfsDacl(pointer, true);
  const script = join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
  const result = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8', timeout: 120000 });
  assert.equal(result.status, 0, result.error?.message || result.stderr + result.stdout);
  assert.ok(readFileSync(pointer, 'utf8').includes(description));
  assert.equal(ntfsDacl(pointer), original);
});

test('Windows: remoção preserva arquivo com um fluxo NTFS adicional', windowsAcl, t => {
  const root = ntfsProject(t), path = 'gerenciado.txt', file = join(root, path);
  const original = Buffer.from('arquivo gerenciado\n');
  const stream = file + ':fixture', extra = 'conteúdo adicional';
  writeFileSync(file, original);
  ntfsDacl(file);
  assert.doesNotThrow(() => checkWindowsFileChanges([{ path: file, displayPath: path, update: false }]));
  writeFileSync(stream, extra);
  const plan = { target: root, canApply: true, language: 'pt', localIgnore: { edits: [] }, retiredRoots: [],
    changes: [{ path, action: 'remove', content: null, beforeHash: digest(original) }] };
  assert.throws(() => applyPlan(plan), { code: 'E_PROTECTED_METADATA', path });
  assert.deepEqual(readFileSync(file), original);
  assert.equal(readFileSync(stream, 'utf8'), extra);
  assert.equal(inspectProjectRecovery(root).status, 'ready');
});

test('Windows: recusa hashes divergentes mantendo o original e a proposta', windowsAcl, t => {
  const root = ntfsProject(t), target = join(root, 'alvo.txt');
  const stage = join(root, 'stage'), proposed = join(stage, 'proposta.txt');
  createPrivateRecoveryDirectory(stage);
  const original = Buffer.from('original'), updated = Buffer.from('proposta');
  writeFileSync(target, original);
  writeFileSync(proposed, updated);
  const correct = { before: digest(original), after: digest(updated) };
  for (const field of ['before', 'after']) {
    const hashes = { ...correct, [field]: digest('divergente') };
    assert.throws(() => publishFileReplacement(proposed, target, 'alvo.txt', hashes), { code: 'E_CHANGED', path: 'alvo.txt' });
    assert.deepEqual(readFileSync(target), original);
    assert.deepEqual(readFileSync(proposed), updated);
  }
});

test('Windows: o pré-voo verifica vários alvos e identifica o arquivo protegido', windowsAcl, t => {
  const root = ntfsProject(t);
  const entries = ['primeiro.txt', 'segundo.txt'].map(displayPath => ({ path: join(root, displayPath), displayPath, update: true }));
  for (const entry of entries) writeFileSync(entry.path, entry.displayPath);
  assert.doesNotThrow(() => checkWindowsFileChanges(entries));
  const protectedFile = entries[1];
  chmodSync(protectedFile.path, 0o444);
  try {
    assert.throws(() => checkWindowsFileChanges(entries), { code: 'E_PROTECTED_METADATA', path: protectedFile.displayPath });
  } finally {
    chmodSync(protectedFile.path, 0o666);
  }
  for (const entry of entries) assert.equal(readFileSync(entry.path, 'utf8'), entry.displayPath);
});

test('Windows: o pré-voo repete apenas timeout e mantém a recusa explícita', () => {
  const entries = ['primeiro.txt', 'segundo.txt'].map(displayPath => ({
    path: join(tmpdir(), displayPath), displayPath, update: true,
  }));
  const timedOut = { status: null, error: Object.assign(new Error('detalhe interno'), { code: 'ETIMEDOUT' }), stdout: '' };
  let attempts = 0;
  assert.doesNotThrow(() => verifyWindowsFileChangeProbe(entries, () => ++attempts === 1 ? timedOut : { status: 0 }));
  assert.equal(attempts, 2);

  attempts = 0;
  assert.throws(() => verifyWindowsFileChangeProbe(entries, () => {
    attempts++;
    return timedOut;
  }), error => {
    assert.equal(error.code, 'E_METADATA_UNSUPPORTED');
    assert.equal(error.message, 'Windows file protection verification timed out.');
    assert.equal(error.path, undefined);
    return true;
  });
  assert.equal(attempts, 2);

  attempts = 0;
  assert.throws(() => verifyWindowsFileChangeProbe(entries, () => {
    attempts++;
    return { status: 2, stdout: '1' };
  }), { code: 'E_PROTECTED_METADATA', path: 'segundo.txt' });
  assert.equal(attempts, 1);
});

test('classifica proprietário e leitura sem presumir suporte no Windows', () => {
  const file = (uid, mode) => ({ uid, mode, isFile: () => true });
  assert.equal(fileOwnerIssue(file(100, 0o640), 'linux', 100), null);
  assert.equal(fileOwnerIssue(file(200, 0o640), 'linux', 100), 'file-owner-different');
  assert.equal(fileOwnerIssue(file(100, 0o040), 'darwin', 100), 'owner-read-unverified');
  assert.equal(fileOwnerIssue(file(undefined, 0o600), 'linux', 100), 'file-owner-unverified');
  assert.equal(fileOwnerIssue(file(200, 0o040), 'win32', 100), null);
});

test('CLI preserva arquivo de outro proprietário antes de instalar', {
  timeout: 120000,
  skip: process.platform !== 'linux' || process.getuid?.() !== 0 ? 'fixture requer Linux com troca de usuário' : false,
}, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-owner-cli-'))), uid = 65534, gid = 65534;
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
  writeFileSync(join(root, '.gitignore'), '# humano\n');
  writeFileSync(join(root, 'AGENTS.md'), '# Documento humano\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
  const index = readFileSync(join(root, '.git/index'));
  function chownTree(path) {
    const info = fs.lstatSync(path); if (info.isSymbolicLink()) throw new Error('fixture inesperada');
    if (info.isDirectory()) for (const name of fs.readdirSync(path)) chownTree(join(path, name));
    fs.chownSync(path, uid, gid);
  }
  chownTree(root); fs.chownSync(join(root, 'AGENTS.md'), 0, gid); chmodSync(join(root, 'AGENTS.md'), 0o040);
  for (const extra of [[], ['--force']]) {
    const child = spawnSync(process.execPath, [join(repository, 'bin/agentdevkit.mjs'), 'init', '--agents', 'codex', '--target', root, '--json', ...extra], { uid, gid, encoding: 'utf8', timeout: 120000 });
    assert.equal(child.status, 1, child.error?.message || child.stderr);
    assert.ok(child.stdout.trim(), child.stderr || 'A CLI não escreveu o diagnóstico JSON.');
    const result = JSON.parse(child.stdout);
    assert.equal(result.error?.code, 'E_PROTECTED_METADATA');
    assert.equal(result.error?.metadataReason, 'file-owner-different');
    assert.equal(result.error?.path, 'AGENTS.md');
    assert.equal(readFileSync(join(root, 'AGENTS.md'), 'utf8'), '# Documento humano\n');
    assert.equal(fs.statSync(join(root, 'AGENTS.md')).uid, 0);
    assert.equal(fs.statSync(join(root, 'AGENTS.md')).mode & 0o777, 0o040);
    assert.deepEqual(readFileSync(join(root, '.git/index')), index);
    assert.equal(existsSync(join(root, '.pbai4devs')), false);
  }
});
const posixOnly = process.platform === 'win32' ? 'Windows does not expose POSIX permission bits.' : false;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const mode = file => statSync(file).mode & 0o777;
function checkPendingBackup(root, plan, failure) {
  assert.equal(failure.operationMayBePartial, true);
  const pending = inspectProjectRecovery(root);
  assert.equal(pending.status, 'pending');
  assert.equal(pending.phase, 'begin');
  assert.equal(pending.id, failure.recovery.id);
  assert.equal(pending.generation, failure.recovery.generation);
  assert.equal(pending.backup, failure.recovery.backup);
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes(pending.backup));
  assert.equal(pending.backupManifest, failure.recovery.backupManifest);
  verifyRecoveryBackup(pending.backup, pending.backupManifest);
  const manifest = JSON.parse(readFileSync(join(pending.backup, 'manifest.json')));
  assert.throws(() => applyPlan(plan), error => error.code === 'E_RECOVERY_PENDING');
  return { root: pending.backup, entries: new Map(manifest.entries.map(entry => [entry.path, entry])) };
}

function checkOriginal(backup, path, bytes, expectedMode) {
  const entry = backup.entries.get(path);
  assert.equal(entry?.type, 'file', path);
  assert.equal(entry.mode, expectedMode, path);
  assert.deepEqual(readFileSync(join(backup.root, 'blobs', entry.blob)), bytes, path);
}

function afterReplacement(t, destination, action) {
  if (process.platform === 'win32') {
    const spawn = childProcess.spawnSync;
    t.mock.method(childProcess, 'spawnSync', (program, args, options) => {
      const result = spawn(program, args, options);
      if (options?.env?.AGENTDEVKIT_DESTINATION === destination && result.status === 0) action();
      return result;
    });
  } else {
    const rename = fs.renameSync;
    t.mock.method(fs, 'renameSync', (from, to) => {
      const result = rename(from, to); if (to === destination) action(); return result;
    });
  }
  syncBuiltinESMExports();
}
const plannedSnapshot = (root, plan) => plan.changes.map(({ path }) => {
  const file = join(root, path);
  return [path, existsSync(file) ? { bytes: readFileSync(file), mode: mode(file) } : null];
});

function fixture(t) {
  mkdirSync(join(repository, 'tmp'), { recursive: true });
  const root = mkdtempSync(join(repository, 'tmp/file-modes-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '--quiet', root]).status, 0);
  applyPlan(planInstallation({ target: root, mode: 'init', clients: ['codex'] }));
  return root;
}

test('aplicação recusa mudança de proprietário após planejamento', { skip: posixOnly }, t => {
  const root = fixture(t), path = join(root, 'AGENTS.md');
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  assert.ok(plan.changes.some(change => change.path === 'AGENTS.md'));
  const before = readFileSync(path), state = readFileSync(join(root, '.pbai4devs/state/agentdevkit.json'));
  const original = fs.lstatSync; let observed = false;
  t.mock.method(fs, 'lstatSync', (candidate, ...args) => {
    const info = original(candidate, ...args);
    if (candidate === path && typeof info.uid === 'number') { info.uid = info.uid + 1; observed = true; }
    return info;
  });
  syncBuiltinESMExports();
  try {
    assert.throws(() => applyPlan(plan), error => error.code === 'E_PROTECTED_METADATA' && error.metadataReason === 'file-owner-different');
  } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(observed, true);
  assert.deepEqual(readFileSync(path), before);
  assert.deepEqual(readFileSync(join(root, '.pbai4devs/state/agentdevkit.json')), state);
});

test('escrita atômica e backups preservam permissões mesmo com umask restritiva', { skip: posixOnly }, t => {
  const root = fixture(t), agents = join(root, 'AGENTS.md'), state = join(root, '.pbai4devs/state/agentdevkit.json');
  chmodSync(agents, 0o600); chmodSync(state, 0o640);
  const before = readFileSync(agents);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  assert.ok(plan.changes.some(change => change.path === 'AGENTS.md'));
  const previousUmask = process.umask(0o077);
  let applied;
  try { applied = applyPlan(plan); }
  finally { process.umask(previousUmask); }
  assert.equal(mode(agents), 0o600); assert.equal(mode(state), 0o640);
  assert.notDeepEqual(readFileSync(agents), before);
  assert.ok(applied.backup);
  assert.deepEqual(readFileSync(join(root, applied.backup, 'AGENTS.md')), before);
  assert.equal(mode(join(root, applied.backup, 'AGENTS.md')), 0o600);
  assert.equal(mode(join(root, applied.backup, '.pbai4devs/state/agentdevkit.json')), 0o640);
});

for (const mask of [0o000, 0o022, 0o077]) test(`raiz do backup preserva proteção da pasta original com umask ${mask.toString(8)}`, { skip: posixOnly }, t => {
  const root = fixture(t), state = join(root, '.pbai4devs/state/agentdevkit.json');
  const privateParent = dirname(state), parent = join(root, '.agent-tests/agentdevkit/backups');
  chmodSync(privateParent, 0o700); chmodSync(state, 0o640);
  mkdirSync(join(parent, 'humano'), { recursive: true });
  chmodSync(parent, 0o755); writeFileSync(join(parent, 'humano', 'conteudo'), 'dados humanos');
  const original = readFileSync(state), plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const previous = process.umask(mask); let result;
  try { result = applyPlan(plan); } finally { process.umask(previous); }
  assert.ok(result.backup);
  const backupRoot = join(root, result.backup), copy = join(backupRoot, '.pbai4devs/state/agentdevkit.json');
  assert.equal(mode(backupRoot) & 0o077, 0, 'raiz de backup não deve permitir acesso a grupo ou outros');
  assert.equal(mode(join(backupRoot, '.pbai4devs')) & 0o077, 0);
  assert.equal(mode(join(backupRoot, '.pbai4devs/state')) & 0o077, 0);
  assert.equal(mode(copy), 0o640); assert.deepEqual(readFileSync(copy), original);
  assert.equal(mode(privateParent), 0o700); assert.equal(mode(parent), 0o755);
  assert.equal(readFileSync(join(parent, 'humano', 'conteudo'), 'utf8'), 'dados humanos');
});

test('ancestrais novos do backup são privados com umask permissivo', { skip: posixOnly }, t => {
  const root = fixture(t), plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const parent = join(root, '.agent-tests');
  assert.equal(mode(parent), 0o700);
  assert.equal(existsSync(join(parent, 'agentdevkit/backups')), false);
  const previous = process.umask(0o000); let result;
  try { result = applyPlan(plan); } finally { process.umask(previous); }
  for (const directory of [parent, join(parent, 'agentdevkit'), join(parent, 'agentdevkit/backups'), join(root, result.backup)]) {
    assert.equal(mode(directory), 0o700);
  }
});

test('sem arquivos anteriores não cria diretório de backup', t => {
  mkdirSync(join(repository, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(repository, '.agent-tests/backup-empty-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '--quiet', root]).status, 0);
  const result = applyPlan(planInstallation({ target: root, mode: 'init', clients: ['codex'] }));
  assert.equal(result.backup, null);
  assert.equal(existsSync(join(root, '.agent-tests/agentdevkit/backups')), false);
});

test('falha ao criar raiz privada impede alterações dos arquivos planejados', t => {
  const root = fixture(t), agents = join(root, 'AGENTS.md');
  const before = readFileSync(agents), ignorePath = join(root, '.gitignore');
  const ignore = existsSync(ignorePath) ? readFileSync(ignorePath) : null;
  writeFileSync(join(root, 'humano-staged.txt'), 'conteúdo humano preparado\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', 'humano-staged.txt']).status, 0);
  const indexPath = join(root, '.git/index');
  const index = existsSync(indexPath) ? readFileSync(indexPath) : null;
  const config = readFileSync(join(root, '.git/config'));
  const exclude = readFileSync(join(root, '.git/info/exclude'));
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const plannedBefore = plannedSnapshot(root, plan);
  let intercepted = false;
  const backupRoot = join(root, '.agent-tests', 'agentdevkit', 'backups');
  if (process.platform === 'win32') {
    const spawn = childProcess.spawnSync, prefix = win32.toNamespacedPath(backupRoot) + sep;
    t.mock.method(childProcess, 'spawnSync', (program, args, options) => {
      if (args.includes('-EncodedCommand') && typeof options?.input === 'string'
        && JSON.parse(options.input).create?.startsWith(prefix)) {
        intercepted = true;
        return { status: 5, stdout: '', stderr: '' };
      }
      return spawn(program, args, options);
    });
  } else {
    const original = fs.mkdtempSync;
    t.mock.method(fs, 'mkdtempSync', (prefix, ...args) => {
      if (String(prefix).startsWith(backupRoot + sep)) {
        intercepted = true;
        throw Object.assign(new Error('falha sintética no backup'), { code: 'EACCES' });
      }
      return original(prefix, ...args);
    });
  }
  syncBuiltinESMExports();
  try { assert.throws(() => applyPlan(plan), { code: 'EACCES' }); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(intercepted, true);
  assert.deepEqual(readFileSync(agents), before); assert.deepEqual(existsSync(indexPath) ? readFileSync(indexPath) : null, index);
  assert.deepEqual(existsSync(ignorePath) ? readFileSync(ignorePath) : null, ignore);
  assert.deepEqual(readFileSync(join(root, '.git/config')), config);
  assert.deepEqual(readFileSync(join(root, '.git/info/exclude')), exclude);
  assert.deepEqual(plannedSnapshot(root, plan), plannedBefore);
});

test('falha ao criar ancestral não aplica arquivos planejados', t => {
  const root = fixture(t), plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const before = plannedSnapshot(root, plan), blocked = join(root, '.agent-tests/agentdevkit');
  const original = fs.mkdirSync; let intercepted = false;
  t.mock.method(fs, 'mkdirSync', (path, ...args) => {
    if (String(path) === blocked) { intercepted = true; throw Object.assign(new Error('falha sintética no ancestral'), { code: 'ENOSPC' }); }
    return original(path, ...args);
  });
  syncBuiltinESMExports();
  try { assert.throws(() => applyPlan(plan), /falha sintética no ancestral/); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(intercepted, true); assert.deepEqual(plannedSnapshot(root, plan), before);
});

test('recusa raiz de backup com modo inesperadamente amplo antes de copiar', { skip: posixOnly }, t => {
  const root = fixture(t), plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const before = plannedSnapshot(root, plan), parent = join(root, '.agent-tests/agentdevkit/backups');
  const original = fs.mkdtempSync; let directory;
  t.mock.method(fs, 'mkdtempSync', (prefix, ...args) => {
    const path = original(prefix, ...args);
    if (String(prefix).startsWith(`${parent}/`)) { directory = path; chmodSync(path, 0o755); }
    return path;
  });
  syncBuiltinESMExports();
  try { assert.throws(() => applyPlan(plan), error => error.code === 'E_BACKUP'); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.ok(directory); assert.deepEqual(fs.readdirSync(directory), []);
  assert.deepEqual(plannedSnapshot(root, plan), before);
});

test('falha durante cópia preserva projeto e backup parcial para inspeção', { skip: posixOnly }, t => {
  const root = fixture(t), plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const before = plannedSnapshot(root, plan), parent = join(root, '.agent-tests/agentdevkit/backups');
  const original = fs.writeFileSync, cause = Object.freeze(Object.assign(new Error('falha sintética na cópia'), { code: 'EIO' })); let copies = 0, failure;
  t.mock.method(fs, 'writeFileSync', (path, ...args) => {
    if (String(path).startsWith(`${parent}/`) && ++copies === 2) throw cause;
    return original(path, ...args);
  });
  syncBuiltinESMExports();
  try { applyPlan(plan); } catch (error) { failure = error; }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(copies, 2); assert.equal(failure?.code, 'EIO'); assert.equal(failure?.cause, cause);
  assert.deepEqual(plannedSnapshot(root, plan), before);
  const directories = fs.readdirSync(parent);
  assert.equal(directories.length, 1);
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes(`.agent-tests/agentdevkit/backups/${directories[0]}`));
  assert.equal(mode(join(parent, directories[0])) & 0o077, 0);
  assert.ok(fs.readdirSync(join(parent, directories[0])).length > 0);
});

test('falha após publicar alteração informa backup sem afirmar sua integridade', t => {
  const root = fixture(t), plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const cause = Object.freeze(Object.assign(new Error('falha após publicação'), { code: 'EIO' }));
  const parent = join(root, '.agent-tests/agentdevkit/backups');
  let injected = false, failure;
  afterReplacement(t, join(root, 'AGENTS.md'), () => { if (!injected) { injected = true; throw cause; } });
  try { applyPlan(plan); } catch (error) { failure = error; }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.ok(injected && failure); assert.equal(failure.code, 'EIO');
  const directories = fs.readdirSync(parent);
  assert.equal(directories.length, 1);
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes(`.agent-tests/agentdevkit/backups/${directories[0]}`));
});

for (const shape of ['erro', 'agregado']) test(`CLI JSON encaminha caminho de backup parcial e pede revisão (${shape})`, { timeout: 120000 }, async t => {
  const root = fixture(t), parent = join(root, '.agent-tests/agentdevkit/backups');
  writeFileSync(join(root, 'sentinela.txt'), 'arquivo humano preparado\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '--', 'sentinela.txt']).status, 0);
  const index = readFileSync(join(root, '.git/index')), config = readFileSync(join(root, '.git/config'));
  const original = fs.writeFileSync, primary = Object.freeze(Object.assign(new Error('falha sintética na cópia'), { code: 'EIO' }));
  const cause = shape === 'agregado' ? Object.freeze(new AggregateError([primary], 'falha agrupada sintética')) : primary;
  let injected = false, text = '', exit;
  t.mock.method(fs, 'writeFileSync', (path, ...args) => {
    if (!injected && String(path).startsWith(`${parent}${process.platform === 'win32' ? '\\' : '/'}`)) { injected = true; throw cause; }
    return original(path, ...args);
  });
  syncBuiltinESMExports();
  try { exit = await cliMain(['lang', 'en', '--target', root, '--json'], { cwd: root, stdout: { write: value => { text += value; } } }); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(injected, true); assert.notEqual(exit, 0);
  const result = JSON.parse(text), directories = fs.readdirSync(parent);
  assert.equal(result.ok, false); assert.equal(result.error.code, 'EIO'); assert.equal(directories.length, 1);
  assert.ok(result.error.preservedPaths.includes(`.agent-tests/agentdevkit/backups/${directories[0]}`));
  assert.ok(result.next.some(item => item.stage === 'revisao'));
  assert.match(result.next[0].instruction, /backups may be incomplete/i);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(readFileSync(join(root, '.git/config')), config);
});

for (const format of ['json', 'humano']) test(`CLI não promete ausência de alterações após erro Git agrupado (${format})`, { timeout: 120000 }, async t => {
  const root = fixture(t);
  writeFileSync(join(root, 'sentinela.txt'), 'arquivo humano preparado\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '--', 'sentinela.txt']).status, 0);
  const index = readFileSync(join(root, '.git/index'));
  const primary = Object.freeze(Object.assign(new Error('falha Git sintética'), { code: 'E_GIT' }));
  const cause = Object.freeze(new AggregateError([primary], 'falha agrupada sintética'));
  let injected = false, output = '', exit;
  afterReplacement(t, join(root, 'AGENTS.md'), () => { if (!injected) { injected = true; throw cause; } });
  try { exit = await cliMain(['lang', 'en', '--target', root, ...(format === 'json' ? ['--json'] : [])], { cwd: root, stdout: { write: value => { output += value; } } }); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(injected, true); assert.notEqual(exit, 0);
  assert.match(output, /project state needs review/i);
  assert.doesNotMatch(output, /no files were changed|try again|run agentdevkit update/i);
  if (format === 'json') { const result = JSON.parse(output); assert.equal(result.error.code, 'E_GIT'); assert.equal(result.next[0].stage, 'revisao'); }
  else assert.match(output, /\(E_GIT\)/);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('colisão na cópia de backup é recusada sem substituir o conteúdo existente', t => {
  const root = fixture(t), plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const before = plannedSnapshot(root, plan), parent = join(root, '.agent-tests/agentdevkit/backups');
  const original = fs.writeFileSync; let collision;
  t.mock.method(fs, 'writeFileSync', (path, ...args) => {
    if (!collision && String(path).startsWith(`${parent}${process.platform === 'win32' ? '\\' : '/'}`)) {
      collision = path; original(path, 'conteúdo sintético concorrente', { flag: 'wx' });
    }
    return original(path, ...args);
  });
  syncBuiltinESMExports();
  try { assert.throws(() => applyPlan(plan), error => error.code === 'EEXIST'); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.ok(collision); assert.equal(readFileSync(collision, 'utf8'), 'conteúdo sintético concorrente');
  assert.deepEqual(plannedSnapshot(root, plan), before);
});

test('backup preserva arquivos vazios e bytes binários não UTF-8', t => {
  const root = fixture(t), originals = new Map([
    ['vazio.bin', Buffer.alloc(0)], ['binario.bin', Buffer.from([0, 0xff, 0xfe, 0x80, 0x0a])],
  ]);
  for (const [path, bytes] of originals) writeFileSync(join(root, path), bytes);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  for (const [path, bytes] of originals) plan.changes.push({ path, action: 'update', beforeHash: digest(bytes), content: Buffer.from('novo conteúdo') });
  const result = applyPlan(plan);
  assert.ok(result.backup);
  for (const [path, bytes] of originals) assert.deepEqual(readFileSync(join(root, result.backup, path)), bytes);
});

test('falha após alteração e remoção conserva o projeto parcial e o backup com bytes e modo originais', { skip: posixOnly }, t => {
  const root = fixture(t), agents = join(root, 'AGENTS.md');
  chmodSync(agents, 0o600);
  const obsoletePath = '.pbai4devs/rules/obsolete/RULE.md', obsolete = join(root, obsoletePath);
  mkdirSync(dirname(obsolete), { recursive: true });
  writeFileSync(obsolete, '---\ntrigger: manual\ndescription: Private obsolete rule.\n---\n\n# Private rule\n');
  chmodSync(obsolete, 0o700);
  const originalAgents = readFileSync(agents), originalRule = readFileSync(obsolete);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  plan.changes.push({ path: obsoletePath, action: 'remove', beforeHash: digest(originalRule), content: null });
  plan.changes.push({ path: 'injected-failure.txt', action: 'create', beforeHash: null,
    get content() { throw new Error('injected failure after earlier writes and removal'); } });
  let failure;
  assert.throws(() => applyPlan(plan), error => { failure = error; return /injected failure after earlier writes and removal/.test(error.message); });
  const backup = checkPendingBackup(root, plan, failure);
  checkOriginal(backup, 'AGENTS.md', originalAgents, 0o600);
  checkOriginal(backup, obsoletePath, originalRule, 0o700);
  assert.deepEqual(readFileSync(agents), plan.changes.find(change => change.path === 'AGENTS.md').content);
  assert.equal(mode(agents), 0o600);
  assert.equal(existsSync(obsolete), false);
});

// Exercise the public creation API and the regular-file states visible at failure.
for (const scenario of ['abertura indisponível', 'permissão negada', 'colisão existente', 'falha antes dos bytes',
  'escrita parcial', 'falha após escrita', 'edição humana', 'falha ao fechar']) {
  test(`criação pública interrompida preserva bytes e identidade para revisão: ${scenario}`, t => {
    mkdirSync(join(repository, 'tmp'), { recursive: true });
    const root = mkdtempSync(join(repository, 'tmp/public-create-'));
    const existing = join(root, 'existing.txt'), target = join(root, 'new.txt');
    const original = Buffer.from('original'), published = Buffer.from('published'), human = Buffer.from('human');
    writeFileSync(existing, original, { mode: 0o600 });
    const originalMode = mode(existing);
    const plan = { target: root, canApply: true, retiredRoots: [], localIgnore: { edits: [] }, changes: [
      { path: 'existing.txt', action: 'update', beforeHash: digest(original), content: published },
      { path: 'new.txt', action: 'create', beforeHash: null, content: published, mode: 0o600 },
    ] };
    const code = scenario === 'permissão negada' ? 'EACCES' : scenario === 'colisão existente' ? 'EEXIST' : 'EIO';
    const failure = Object.assign(new Error('falha de criação sintética'), { code });
    const open = fs.openSync, write = fs.writeFileSync, close = fs.closeSync;
    let publicFd, observed;
    function stop() {
      const identity = existsSync(target) ? statSync(target, { bigint: true }) : null;
      observed = { bytes: identity ? readFileSync(target) : null, identity, existing: statSync(existing, { bigint: true }) };
      throw failure;
    }
    t.mock.method(fs, 'openSync', (path, flags, ...rest) => {
      if (path !== target || flags !== 'wx') return open(path, flags, ...rest);
      if (scenario === 'colisão existente') {
        const fd = open(target, 'wx', 0o600);
        try { write(fd, human); } finally { close(fd); }
        assert.throws(() => open(target, flags, ...rest), error => error.code === 'EEXIST');
        stop();
      }
      if (scenario === 'abertura indisponível' || scenario === 'permissão negada') stop();
      publicFd = open(path, flags, ...rest);
      return publicFd;
    });
    t.mock.method(fs, 'writeFileSync', (path, data, ...rest) => {
      if (publicFd === undefined || path !== publicFd) return write(path, data, ...rest);
      if (scenario === 'falha antes dos bytes') stop();
      write(path, scenario === 'escrita parcial' ? data.subarray(0, 2) : data, ...rest);
      if (scenario === 'edição humana') write(target, human);
      if (scenario !== 'falha ao fechar') stop();
    });
    t.mock.method(fs, 'closeSync', fd => {
      close(fd);
      if (fd === publicFd) {
        publicFd = undefined;
        if (scenario === 'falha ao fechar') stop();
      }
    });
    syncBuiltinESMExports();
    try { assert.throws(() => applyPlan(plan), error => error === failure); }
    finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
    assert.ok(observed, 'a falha deve ocorrer na criação pública selecionada');
    const backup = checkPendingBackup(root, plan, failure);
    checkOriginal(backup, 'existing.txt', original, originalMode);
    assert.equal(backup.entries.get('new.txt').type, 'absent');
    assert.deepEqual(readFileSync(existing), published);
    assert.equal(statSync(existing, { bigint: true }).ino, observed.existing.ino);
    assert.equal(mode(existing), originalMode);
    assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes('new.txt'));
    if (observed.identity === null) assert.equal(existsSync(target), false);
    else {
      const expected = scenario === 'falha antes dos bytes' ? Buffer.alloc(0) : scenario === 'escrita parcial' ? published.subarray(0, 2)
        : ['edição humana', 'colisão existente'].includes(scenario) ? human : published;
      assert.deepEqual(observed.bytes, expected);
      assert.deepEqual(readFileSync(target), expected);
      const current = statSync(target, { bigint: true });
      assert.equal(current.ino, observed.identity.ino); assert.equal(current.dev, observed.identity.dev);
      assert.equal(current.mode, observed.identity.mode);
    }
  });
}

for (const remove of [false, true]) test(`falha após ${remove ? 'remoção' : 'substituição'} de 0444 mantém estado parcial e modo original no backup`, { skip: posixOnly }, t => {
  const root = fixture(t), agents = join(root, 'AGENTS.md');
  const bytes = readFileSync(agents);
  chmodSync(agents, 0o444);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const change = plan.changes.find(item => item.path === 'AGENTS.md');
  assert.ok(change, 'A alteração deve exercitar o arquivo somente leitura.');
  if (remove) {
    change.action = 'remove'; change.content = null;
  }
  const failure = new Error('failure after read-only file change');
  plan.changes.push({ path: 'injected-failure.txt', action: 'create', beforeHash: null,
    get content() { throw failure; } });
  assert.throws(() => applyPlan(plan), error => error === failure);
  checkOriginal(checkPendingBackup(root, plan, failure), 'AGENTS.md', bytes, 0o444);
  if (remove) assert.equal(existsSync(agents), false);
  else {
    assert.deepEqual(readFileSync(agents), change.content);
    assert.equal(mode(agents), 0o444);
  }
});

for (const changed of ['content-and-mode', 'mode-only', 'removed', 'recreated']) test(`recuperação preserva a edição observada no momento da falha: ${changed}`, { skip: posixOnly }, t => {
  const root = fixture(t), agents = join(root, 'AGENTS.md');
  const state = join(root, '.pbai4devs/state/agentdevkit.json');
  const beforeState = readFileSync(state), stateMode = mode(state);
  const beforeAgents = readFileSync(agents);
  chmodSync(agents, 0o600);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const change = plan.changes.find(item => item.path === 'AGENTS.md');
  assert.ok(change);
  const appliedBytes = Buffer.from(change.content);
  if (changed === 'recreated') { change.action = 'remove'; change.content = null; }
  const human = Buffer.from('Human edit during failed operation.\n');
  const failure = new Error('failure after concurrent human edit');
  let changedIdentity, observedState;
  plan.changes.push({ path: 'injected-failure.txt', action: 'create', beforeHash: null,
    get content() {
      if (changed === 'removed') rmSync(agents);
      else {
        if (changed !== 'mode-only') writeFileSync(agents, human);
        chmodSync(agents, 0o640);
        changedIdentity = statSync(agents, { bigint: true });
      }
      observedState = readFileSync(state);
      throw failure;
    } });
  assert.throws(() => applyPlan(plan), error => error === failure);
  const backup = checkPendingBackup(root, plan, failure);
  checkOriginal(backup, 'AGENTS.md', beforeAgents, 0o600);
  checkOriginal(backup, '.pbai4devs/state/agentdevkit.json', beforeState, stateMode);
  if (changed === 'removed') assert.equal(existsSync(agents), false);
  else {
    assert.deepEqual(readFileSync(agents), changed === 'mode-only' ? appliedBytes : human);
    assert.equal(mode(agents), 0o640);
    assert.equal(statSync(agents, { bigint: true }).ino, changedIdentity.ino);
  }
  assert.deepEqual(readFileSync(state), observedState, 'A falha deve preservar o estado observado.');
});

for (const humanChange of [false, true]) test(`erro ambíguo após rename preserva ${humanChange ? 'edição humana' : 'gravação publicada'}`, { skip: posixOnly }, t => {
  const root = fixture(t), agents = join(root, 'AGENTS.md');
  const originalBytes = readFileSync(agents);
  chmodSync(agents, 0o444);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const failure = Object.assign(new Error('injected ambiguous rename after publish'), { code: 'EIO' });
  const human = Buffer.from('Concurrent human text after publication.\n');
  const originalRename = fs.renameSync;
  let thrown = false, identity, temporary;
  fs.renameSync = (from, to) => {
    const result = originalRename(from, to);
    if (!thrown && to === agents && String(from).includes(`${sep}stage${sep}${relative(root, agents)}.agentdevkit-`)) {
      thrown = true;
      if (humanChange) { chmodSync(agents, 0o640); writeFileSync(agents, human); }
      temporary = from;
      identity = statSync(agents, { bigint: true });
      throw failure;
    }
    return result;
  };
  syncBuiltinESMExports();
  try { assert.throws(() => applyPlan(plan), error => error === failure); }
  finally { fs.renameSync = originalRename; syncBuiltinESMExports(); }
  assert.equal(thrown, true, 'A falha deve ocorrer depois do rename.');
  const backup = checkPendingBackup(root, plan, failure);
  checkOriginal(backup, 'AGENTS.md', originalBytes, 0o444);
  assert.deepEqual(readFileSync(agents), humanChange ? human : plan.changes.find(change => change.path === 'AGENTS.md').content);
  assert.equal(statSync(agents, { bigint: true }).ino, identity.ino);
  assert.equal(mode(agents), humanChange ? 0o640 : 0o444);
  const affected = collectErrorDiagnostics(failure).preservedPaths;
  assert.ok(affected.includes(temporary));
  assert.ok(affected.includes('AGENTS.md'));
  assert.equal(existsSync(temporary), false);
});

for (const recreated of [false, true]) test(`recuperação de ancestrais removidos ${recreated ? 'preserva modos da recriação humana' : 'mantém a remoção observada'}`, { skip: posixOnly }, t => {
  const root = fixture(t), parent = join(root, '.pbai4devs/rules/private-group');
  const nested = join(parent, 'obsolete'), relative = '.pbai4devs/rules/private-group/obsolete/RULE.md';
  const file = join(root, relative);
  mkdirSync(nested, { recursive: true });
  const bytes = Buffer.from('---\ntrigger: manual\ndescription: Private rule.\n---\n\n# Private rule\n');
  writeFileSync(file, bytes); chmodSync(parent, 0o700); chmodSync(nested, 0o750); chmodSync(file, 0o640);
  const ignore = join(root, '.gitignore');
  writeFileSync(ignore, '# Local user ignore\n');
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  plan.changes.push({ path: relative, action: 'remove', beforeHash: digest(bytes), content: null });
  const failure = new Error('failure after pruning directories');
  const exclude = join(root, '.git/info/exclude'), originalStat = fs.lstatSync;
  let injected = false;
  fs.lstatSync = (path, ...args) => {
    if (!injected && String(path) === exclude && !existsSync(parent)) {
      injected = true;
      if (recreated) {
        mkdirSync(nested, { recursive: true });
        chmodSync(parent, 0o711); chmodSync(nested, 0o770);
      }
      throw failure;
    }
    return originalStat(path, ...args);
  };
  syncBuiltinESMExports();
  try { assert.throws(() => applyPlan(plan), error => error === failure); }
  finally { fs.lstatSync = originalStat; syncBuiltinESMExports(); }
  assert.equal(injected, true);
  const backup = checkPendingBackup(root, plan, failure);
  checkOriginal(backup, relative, bytes, 0o640);
  assert.equal(backup.entries.get('.pbai4devs/rules/private-group').mode, 0o700);
  assert.equal(backup.entries.get('.pbai4devs/rules/private-group/obsolete').mode, 0o750);
  assert.equal(existsSync(file), false);
  if (recreated) {
    assert.equal(mode(parent), 0o711); assert.equal(mode(nested), 0o770);
  } else {
    assert.equal(existsSync(parent), false); assert.equal(existsSync(nested), false);
  }
});
