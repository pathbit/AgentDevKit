import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs, { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { applyPlan, planInstallation } from '../src/install.mjs';
import { main as cliMain } from '../src/cli.mjs';
import { collectErrorDiagnostics } from '../.pbai4devs/scripts/lib/error-reporting.mjs';
import { fileOwnerIssue } from '../.pbai4devs/scripts/lib/file-owner.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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
    assert.equal(child.status, 1, child.stderr);
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
function withoutBackupDiagnostic(root, paths) {
  const backups = paths.filter(path => /^\.agent-tests\/agentdevkit\/backups\/[^/]+$/.test(path));
  assert.equal(backups.length, 1); assert.ok(existsSync(join(root, backups[0])));
  return paths.filter(path => path !== backups[0]);
}
const plannedSnapshot = (root, plan) => plan.changes.map(({ path }) => {
  const file = join(root, path);
  return [path, existsSync(file) ? { bytes: readFileSync(file), mode: mode(file) } : null];
});

function fixture(t) {
  mkdirSync(join(repository, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(repository, '.agent-tests/file-modes-'));
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
  assert.equal(existsSync(parent), false);
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
  const original = fs.mkdtempSync;
  let intercepted = false;
  t.mock.method(fs, 'mkdtempSync', (prefix, ...args) => {
    if (String(prefix).includes(`${join('.agent-tests', 'agentdevkit', 'backups')}${process.platform === 'win32' ? '\\' : '/'}`)) {
      intercepted = true; throw Object.assign(new Error('falha sintética no backup'), { code: 'EACCES' });
    }
    return original(prefix, ...args);
  });
  syncBuiltinESMExports();
  try { assert.throws(() => applyPlan(plan), /falha sintética no backup/); }
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
  const original = fs.renameSync, cause = Object.freeze(Object.assign(new Error('falha após publicação'), { code: 'EIO' }));
  const parent = join(root, '.agent-tests/agentdevkit/backups');
  let injected = false, failure;
  t.mock.method(fs, 'renameSync', (source, target, ...args) => {
    const result = original(source, target, ...args);
    if (!injected && String(target) === join(root, 'AGENTS.md')) { injected = true; throw cause; }
    return result;
  });
  syncBuiltinESMExports();
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
  const root = fixture(t), original = fs.renameSync;
  writeFileSync(join(root, 'sentinela.txt'), 'arquivo humano preparado\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '--', 'sentinela.txt']).status, 0);
  const index = readFileSync(join(root, '.git/index'));
  const primary = Object.freeze(Object.assign(new Error('falha Git sintética'), { code: 'E_GIT' }));
  const cause = Object.freeze(new AggregateError([primary], 'falha agrupada sintética'));
  let injected = false, output = '', exit;
  t.mock.method(fs, 'renameSync', (source, target, ...args) => {
    const result = original(source, target, ...args);
    if (!injected && target === join(root, 'AGENTS.md')) { injected = true; throw cause; }
    return result;
  });
  syncBuiltinESMExports();
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

test('rollback restaura bytes e modo de arquivos substituídos e removidos', { skip: posixOnly }, t => {
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
  assert.throws(() => applyPlan(plan), /injected failure after earlier writes and removal/);
  assert.deepEqual(readFileSync(agents), originalAgents); assert.equal(mode(agents), 0o600);
  assert.deepEqual(readFileSync(obsolete), originalRule); assert.equal(mode(obsolete), 0o700);
});

for (const scenario of ['restauração', 'hardlink indisponível', 'falha após hardlink', 'EEXIST concorrente', 'substituição humana', 'substituição do pin', 'edição do pin', 'limpeza indisponível']) test(`rollback Windows transfere guarda com segurança: ${scenario}`, t => {
  const root = fixture(t), agents = join(root, 'AGENTS.md'), original = readFileSync(agents);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const translated = Buffer.from(plan.changes.find(change => change.path === 'AGENTS.md').content);
  const replacement = Buffer.from('Alteração humana concorrente.\n');
  const platform = Object.getOwnPropertyDescriptor(process, 'platform');
  const link = fs.linkSync, open = fs.openSync, close = fs.closeSync, rename = fs.renameSync, remove = fs.rmSync;
  let guardFd, guardOpen = false, pin, checkedRename = false;
  t.mock.method(fs, 'openSync', (path, ...args) => {
    const fd = open(path, ...args);
    if (String(path).startsWith(`${agents}.agentdevkit-`) && args[0] === 'r') { guardFd = fd; guardOpen = true; }
    return fd;
  });
  t.mock.method(fs, 'closeSync', fd => { const result = close(fd); if (fd === guardFd) guardOpen = false; return result; });
  t.mock.method(fs, 'linkSync', (from, to) => {
    if (!String(to).startsWith(`${agents}.agentdevkit-rollback-`)) return link(from, to);
    assert.equal(guardOpen, true); pin = to;
    if (scenario === 'hardlink indisponível') throw Object.assign(new Error('hardlink indisponível'), { code: 'ENOTSUP' });
    if (scenario === 'EEXIST concorrente') { writeFileSync(to, replacement, { flag: 'wx' }); throw Object.assign(new Error('destino ocupado'), { code: 'EEXIST' }); }
    if (scenario === 'substituição humana') { fs.unlinkSync(agents); writeFileSync(agents, replacement); }
    const result = link(from, to);
    if (scenario === 'falha após hardlink') throw Object.assign(new Error('publicação incerta'), { code: 'EIO' });
    if (scenario === 'substituição do pin') { fs.unlinkSync(to); writeFileSync(to, replacement); }
    return result;
  });
  t.mock.method(fs, 'renameSync', (from, to) => {
    if (to === agents && pin) { assert.equal(guardOpen, false); assert.ok(existsSync(pin)); checkedRename = true; }
    const result = rename(from, to);
    if (to === agents && pin && scenario === 'edição do pin') writeFileSync(pin, replacement);
    return result;
  });
  t.mock.method(fs, 'rmSync', (path, ...args) => { if (path === pin && scenario === 'limpeza indisponível') throw Object.assign(new Error('limpeza indisponível'), { code: 'EACCES' }); return remove(path, ...args); });
  syncBuiltinESMExports();
  const failure = new Error('falha injetada');
  plan.changes.push({ path: 'injected-failure.txt', action: 'create', beforeHash: null,
    get content() { Object.defineProperty(process, 'platform', { ...platform, value: 'win32' }); throw failure; } });
  let actual;
  try { applyPlan(plan); } catch (error) { actual = error; }
  finally { Object.defineProperty(process, 'platform', platform); t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.ok(actual); assert.match(actual.message, /falha injetada/);
  if (scenario === 'restauração' || scenario === 'edição do pin' || scenario === 'limpeza indisponível') { assert.equal(checkedRename, true); assert.deepEqual(readFileSync(agents), original); }
  else {
    assert.equal(checkedRename, false);
    assert.ok(actual.rollbackPreservedPaths.includes('AGENTS.md'));
    if (scenario === 'substituição humana') assert.deepEqual(readFileSync(agents), replacement);
    else assert.notDeepEqual(readFileSync(agents), original);
  }
  assert.ok(pin);
  if (scenario === 'substituição humana' || scenario === 'substituição do pin' || scenario === 'falha após hardlink' || scenario === 'EEXIST concorrente' || scenario === 'edição do pin' || scenario === 'limpeza indisponível') {
    assert.ok(existsSync(pin));
    assert.deepEqual(readFileSync(pin), scenario === 'falha após hardlink' ? readFileSync(agents) : scenario === 'limpeza indisponível' ? translated : replacement);
    assert.ok(actual.cleanupFailures.some(item => item.path === pin));
  } else assert.equal(existsSync(pin), false);
});

for (const remove of [false, true]) test(`rollback de 0444 após ${remove ? 'remoção' : 'substituição'} preserva o erro original`, { skip: posixOnly }, t => {
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
  assert.deepEqual(readFileSync(agents), bytes);
  assert.equal(mode(agents), 0o444);
});

for (const changed of ['content-and-mode', 'mode-only', 'removed', 'recreated']) test(`rollback preserva mudança concorrente: ${changed}`, { skip: posixOnly }, t => {
  const root = fixture(t), agents = join(root, 'AGENTS.md');
  const state = join(root, '.pbai4devs/state/agentdevkit.json');
  const beforeState = readFileSync(state);
  chmodSync(agents, 0o600);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const change = plan.changes.find(item => item.path === 'AGENTS.md');
  assert.ok(change);
  const appliedBytes = Buffer.from(change.content);
  if (changed === 'recreated') { change.action = 'remove'; change.content = null; }
  const human = Buffer.from('Human edit during failed operation.\n');
  const failure = new Error('failure after concurrent human edit');
  plan.changes.push({ path: 'injected-failure.txt', action: 'create', beforeHash: null,
    get content() {
      if (changed === 'removed') rmSync(agents);
      else {
        if (changed !== 'mode-only') writeFileSync(agents, human);
        chmodSync(agents, 0o640);
      }
      throw failure;
    } });
  assert.throws(() => applyPlan(plan), error => error === failure);
  assert.deepEqual(withoutBackupDiagnostic(root, failure.rollbackPreservedPaths), ['AGENTS.md']);
  if (changed === 'removed') assert.equal(existsSync(agents), false);
  else {
    assert.deepEqual(readFileSync(agents), changed === 'mode-only' ? appliedBytes : human);
    assert.equal(mode(agents), 0o640);
  }
  assert.deepEqual(readFileSync(state), beforeState, 'Outras gravações próprias devem ser restauradas.');
});

for (const humanChange of [false, true]) test(`erro ambíguo após rename ${humanChange ? 'preserva edição concorrente' : 'restaura a gravação publicada'}`, { skip: posixOnly }, t => {
  const root = fixture(t), agents = join(root, 'AGENTS.md');
  const originalBytes = readFileSync(agents);
  chmodSync(agents, 0o444);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const failure = Object.assign(new Error('injected ambiguous rename after publish'), { code: 'EIO' });
  const human = Buffer.from('Concurrent human text after publication.\n');
  const originalRename = fs.renameSync;
  let thrown = false;
  fs.renameSync = (from, to) => {
    const result = originalRename(from, to);
    if (!thrown && to === agents && String(from).startsWith(`${agents}.agentdevkit-`)) {
      thrown = true;
      if (humanChange) { chmodSync(agents, 0o640); writeFileSync(agents, human); }
      throw failure;
    }
    return result;
  };
  syncBuiltinESMExports();
  try { assert.throws(() => applyPlan(plan), error => error === failure); }
  finally { fs.renameSync = originalRename; syncBuiltinESMExports(); }
  assert.equal(thrown, true, 'A falha deve ocorrer depois do rename.');
  assert.deepEqual(readFileSync(agents), humanChange ? human : originalBytes);
  assert.equal(mode(agents), humanChange ? 0o640 : 0o444);
  if (humanChange) {
    // A falha pode ocorrer depois de publicar o destino: a origem temporária
    // também deve ser comunicada como incerta, mesmo quando já não existe.
    const temporary = failure.rollbackPreservedPaths.find(path => path.startsWith(`${agents}.agentdevkit-`));
    assert.ok(temporary, 'O caminho temporário de publicação incerta deve ser informado.');
    assert.deepEqual(new Set(withoutBackupDiagnostic(root, failure.rollbackPreservedPaths)), new Set([temporary, 'AGENTS.md']));
    assert.ok(failure.uncertainPaths.includes(temporary));
    assert.equal(existsSync(temporary), false);
  }
});

for (const recreated of [false, true]) test(`rollback de ancestrais removidos ${recreated ? 'preserva modos da recriação humana' : 'restaura permissões originais'}`, { skip: posixOnly }, t => {
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
  assert.deepEqual(readFileSync(file), bytes);
  assert.equal(mode(file), 0o640);
  assert.equal(mode(parent), recreated ? 0o711 : 0o700);
  assert.equal(mode(nested), recreated ? 0o770 : 0o750);
});
