import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { applyPlan, planInstallation } from '../src/install.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { collectErrorDiagnostics } from '../.pbai4devs/scripts/lib/error-reporting.mjs';
import { managedBlockDigest } from '../.pbai4devs/scripts/lib/managed-content.mjs';
import { buildCatalog } from '../.pbai4devs/scripts/lib/catalog.mjs';
import { assertPrivateRecoveryPaths } from '../.pbai4devs/scripts/lib/recovery-privacy.mjs';

const repository = fileURLToPath(new URL('..', import.meta.url));
function fixture(t, kind) {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-recovery-race-')));
  t.after(() => {
    t.mock.restoreAll();
    syncBuiltinESMExports();
    fs.rmSync(root, { recursive: true, force: true });
  });
  assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
  if (kind === 'sync') {
    const put = (path, bytes) => { const file = join(root, path); fs.mkdirSync(dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); };
    put('.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
    for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(`.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(join(repository, '.pbai4devs/templates/gitignore', name)));
    put('.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
  }
  return root;
}

function prepareSyncUpdate(root) {
  const put = (name, bytes) => { const file = join(root, name); fs.mkdirSync(dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); };
  const run = () => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  run();
  put('.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
  put('.pbai4devs/skills/zzz/SKILL.md', '---\nname: zzz\ndescription: Nova.\n---\n\n# Nova\n');
  return { run, target: join(root, '.claude/skills/demo/SKILL.md'), later: join(root, '.claude/skills/zzz/SKILL.md') };
}

if (process.platform === 'win32') {
  test('sync: troca de ancestral do backup não cria arquivo externo', { skip: 'fixture exige symlink em ambiente POSIX' });
} else if (process.env.ADK_STRICT_RECOVERY_TEST !== '1') {
  test('sync: troca de ancestral do backup não cria arquivo externo', { todo: 'abertura do destino não fixa os ancestrais' });
} else {
  test('sync: troca de ancestral do backup não cria arquivo externo', { timeout: 120000 }, t => {
    const root = fixture(t, 'sync'), external = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-backup-external-')));
    const originalCwd = process.cwd();
    t.after(() => fs.rmSync(external, { recursive: true, force: true }));
    prepareSyncUpdate(root); const open = fs.openSync;
    let injected = false, escaped;
    t.mock.method(fs, 'openSync', (path, flags, ...args) => {
      if (!injected && typeof path === 'string' && flags === 'wx+') {
        injected = true;
        const parent = join(root, '.agent-tests'); escaped = join(external, path);
        fs.renameSync(parent, `${parent}.saved`); fs.symlinkSync(external, parent, 'dir');
      }
      return open(path, flags, ...args);
    });
    syncBuiltinESMExports();
    let failure;
    try { synchronize({ root, force: true, localIgnores: false, generateEntrypoints: false, output() {} }); }
    catch (error) { failure = error; /* An error after creation does not undo the escaped write. */ }
    assert.equal(injected, true, `a troca deve ocorrer imediatamente antes da abertura${failure ? `: ${failure.message}` : ''}`);
    assert.equal(fs.existsSync(escaped), false, 'a operação não deve criar arquivos fora do projeto');
    assert.equal(process.cwd(), originalCwd, 'a operação deve restaurar o diretório de trabalho do processo');
  });
}

test('sync: edição do backup após o hash não produz sucesso', { timeout: 120000 }, t => {
    const root = fixture(t, 'sync'); prepareSyncUpdate(root);
    const source = join(root, '.pbai4devs/catalog.json'), original = fs.readFileSync(source);
    const open = fs.openSync, times = fs.futimesSync; let fd, backup, injected = false, human;
    t.mock.method(fs, 'openSync', (path, flags, ...args) => {
      const result = open(path, flags, ...args);
      if (!injected && typeof path === 'string' && flags === 'wx+') { fd = result; backup = resolve(path); }
      return result;
    });
    t.mock.method(fs, 'futimesSync', (target, ...args) => {
      if (!injected && target === fd && backup) {
        injected = true; human = Buffer.alloc(Number(fs.fstatSync(target, { bigint: true }).size), 'x');
        fs.writeSync(target, human, 0, human.length, 0);
      }
      return times(target, ...args);
    });
    syncBuiltinESMExports();
    let failure;
    try { synchronize({ root, force: true, localIgnores: false, generateEntrypoints: false, output() {} }); }
    catch (error) { failure = error; }
    assert.ok(injected && backup && human);
    assert.ok(failure, 'backup alterado não deve ser anunciado como válido');
    assert.match(failure.message, /Backup mudou/);
    assert.deepEqual(fs.readFileSync(backup), human);
    assert.deepEqual(fs.readFileSync(source), original);
});

for (const [kind, expected] of [['claim', 'pending'], ['done', 'ready']]) {
  test(`sync: falha após publicar recibo ${kind} informa estado observado ${expected}`, { timeout: 120000 }, t => {
    const root = fixture(t, 'sync'), link = fs.linkSync;
    let published = false;
    t.mock.method(fs, 'linkSync', (from, to) => {
      const result = link(from, to);
      if (!published && typeof to === 'string' && to.endsWith(`.${kind}.json`)) {
        published = true; throw Object.assign(new Error('Registro publicado com resultado incerto'), { code: 'EIO' });
      }
      return result;
    });
    syncBuiltinESMExports();
    let failure;
    try { synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }); }
    catch (error) { failure = error; }
    assert.ok(published); assert.equal(failure?.code, 'E_RECOVERY_UNCERTAIN');
    assert.equal(failure.operation.kind, kind); assert.equal(failure.operation.publication, 'possible');
    assert.equal(failure.recovery.status, expected);
    const output = join(root, '.claude/skills/demo/SKILL.md');
    assert.equal(fs.existsSync(output), kind === 'done');
    if (kind === 'done') {
      assert.equal(failure.transaction.id, failure.operation.id);
      assert.ok(fs.existsSync(join(failure.transaction.backup, 'manifest.json')));
    }
  });
}

function newPublication(root, kind) {
  if (kind === 'install') {
    const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
    return { first: join(root, plan.changes.find(item => item.action === 'create').path), run: () => applyPlan(plan) };
  }
  return { first: join(root, '.claude/skills/demo/SKILL.md'),
    run: () => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }) };
}

for (const kind of ['install', 'sync']) {
  test(`${kind}: criação exclusiva preserva um arquivo humano no mesmo diretório`, { timeout: 120000 }, t => {
    const root = fixture(t, kind), { first, run } = newPublication(root, kind);
    const open = fs.openSync, bytes = Buffer.from('Conteúdo humano independente.\n');
    const sibling = join(dirname(first), 'notas-humanas.txt');
    let human;
    t.mock.method(fs, 'openSync', (file, flags, ...args) => {
      if (file === first && flags === 'wx' && !human) {
        fs.writeFileSync(sibling, bytes, { flag: 'wx', mode: 0o600 });
        human = fs.statSync(sibling, { bigint: true });
      }
      return open(file, flags, ...args);
    });
    syncBuiltinESMExports(); run();
    assert.ok(human); assert.deepEqual(fs.readFileSync(sibling), bytes);
    const current = fs.statSync(sibling, { bigint: true });
    assert.equal(current.ino, human.ino); assert.equal(current.dev, human.dev); assert.equal(current.mode, human.mode);
  });
}

test('sync: falha na criação posterior mantém atualização publicada e backup original', { timeout: 120000 }, t => {
  const root = fixture(t, 'sync'), { target, later, run } = prepareSyncUpdate(root);
  const before = fs.readFileSync(target), primary = Object.assign(new Error('falha sintética de publicação'), { code: 'ENOSPC' });
  const open = fs.openSync;
  t.mock.method(fs, 'openSync', (file, flags, ...args) => {
    if (file === later && flags === 'wx') throw primary;
    return open(file, flags, ...args);
  });
  syncBuiltinESMExports();
  let failure; try { run(); } catch (error) { failure = error; }
  assert.equal(failure?.code, 'ENOSPC'); assert.equal(failure.recovery.status, 'pending');
  assert.notDeepEqual(fs.readFileSync(target), before); assert.equal(fs.existsSync(later), false);
  const hash = createHash('sha256').update(before).digest('hex');
  const manifest = JSON.parse(fs.readFileSync(join(failure.recovery.backup, 'manifest.json')));
  const entry = manifest.entries.find(item => item.path === '.claude/skills/demo/SKILL.md');
  assert.equal(entry.sha256, hash);
  assert.deepEqual(fs.readFileSync(join(failure.recovery.backup, 'blobs', entry.blob)), before);
});

for (const kind of ['install', 'sync']) {
  test(`${kind}: falha na gravação do temporário preserva o arquivo para revisão`, { timeout: 120000 }, t => {
    const root = fixture(t, kind), primary = Object.assign(new Error('falha de gravação'), { code: 'ENOSPC' });
    let target, run;
    if (kind === 'install') {
      target = join(root, 'AGENTS.md');
      fs.writeFileSync(target, '# Instruções da equipe\n');
      const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
      run = () => applyPlan(plan);
    } else {
      ({ target, run } = prepareSyncUpdate(root));
    }
    const before = fs.readFileSync(target), write = fs.writeFileSync;
    const suffix = kind === 'install' ? /\.agentdevkit-[0-9a-f-]{36}$/i : /\.sync\.[0-9a-f-]{36}$/i;
    const partial = Buffer.from('Gravação parcial.\n');
    let temporary, reference;
    t.mock.method(fs, 'writeFileSync', (path, content, options) => {
      if (!temporary && typeof path === 'string' && path.startsWith(root + sep) && suffix.test(path)) {
        temporary = path;
        write(path, partial, options);
        reference = fs.statSync(path, { bigint: true });
        throw primary;
      }
      return write(path, content, options);
    });
    syncBuiltinESMExports();
    let recovery;
    assert.throws(run, error => {
      recovery = error.recovery;
      return error.code === 'ENOSPC' && recovery?.status === 'pending' &&
        collectErrorDiagnostics(error).preservedPaths.includes(temporary);
    });
    assert.ok(temporary && reference);
    assert.ok(temporary.startsWith(recovery.stage + sep));
    assertPrivateRecoveryPaths([recovery.stage, temporary]);
    if (process.platform !== 'win32') assert.equal(reference.mode & 0o777n, 0o600n);
    assertPreserved(temporary, partial, reference);
    assert.deepEqual(fs.readFileSync(target), before);
  });
}

for (const kind of ['install', 'sync']) {
  test(`${kind}: estágio em volume diferente impede a atualização`, { timeout: 120000 }, t => {
    const root = fixture(t, kind);
    let target, run;
    if (kind === 'install') {
      target = join(root, 'AGENTS.md');
      fs.writeFileSync(target, '# Instruções da equipe\n');
      const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
      run = () => applyPlan(plan);
    } else {
      ({ target, run } = prepareSyncUpdate(root));
    }
    const before = fs.readFileSync(target), identity = fs.statSync(target, { bigint: true });
    const names = fs.readdirSync(root).filter(name => name !== '.agent-tests');
    const lstat = fs.lstatSync;
    let checked = false;
    t.mock.method(fs, 'lstatSync', (path, options) => {
      const result = lstat(path, options);
      if (typeof path === 'string' && path.startsWith(join(root, '.agent-tests', 'agentdevkit', 'recovery', 'backups') + sep)
        && path.endsWith(sep + 'stage') && options === undefined) {
        checked = true;
        result.dev += 1;
      }
      return result;
    });
    syncBuiltinESMExports();
    assert.throws(run, error => error.code === 'EXDEV' && error.recovery?.status === 'pending');
    assert.ok(checked);
    assertPreserved(target, before, identity);
    assert.deepEqual(fs.readdirSync(root).filter(name => name !== '.agent-tests'), names);
  });
}

for (const kind of ['xattr', 'acl']) {
  const name = `install: atualização preserva ${kind} existente no macOS`;
  if (process.platform !== 'darwin') { test(name, { skip: 'metadados nativos exigem macOS real' }); continue; }
  if (process.env.ADK_STRICT_RECOVERY_TEST !== '1') { test(name, { todo: 'metadados nativos ainda não são preservados' }); continue; }
  test(name, { timeout: 120000 }, t => {
    const root = fixture(t, 'install'), target = join(root, 'AGENTS.md');
    const content = '# Documento da equipe\n'; fs.writeFileSync(target, content);
    const run = (command, args) => {
      const result = spawnSync(command, args, { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr); return result.stdout;
    };
    let original;
    if (kind === 'xattr') {
      run('/usr/bin/xattr', ['-w', 'com.pathbit.test-preservation', 'valor-sintetico', target]);
      original = run('/usr/bin/xattr', ['-p', 'com.pathbit.test-preservation', target]);
    } else {
      run('/bin/chmod', ['+a', 'everyone allow read', target]);
      original = run('/bin/ls', ['-lde', target]).split('\n').filter(line => /^\s*\d+: /.test(line)).map(line => line.trim());
      assert.ok(original.some(line => /allow read/.test(line)), 'fixture precisa conter a ACL sintética');
      assert.doesNotThrow(() => fs.accessSync(target, fs.constants.W_OK));
    }
    const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
    const change = plan.changes.find(item => item.path === 'AGENTS.md' && item.action === 'update');
    assert.ok(change);
    applyPlan(plan);
    const updated = fs.readFileSync(target, 'utf8');
    assert.ok(updated.includes(content) && updated.includes('<!-- BEGIN AGENTDEVKIT -->'), 'fixture deve atualizar sem descartar conteúdo humano');
    assert.deepEqual(fs.readFileSync(target), Buffer.from(change.content));
    if (kind === 'xattr') assert.equal(run('/usr/bin/xattr', ['-p', 'com.pathbit.test-preservation', target]), original);
    else {
      const actual = run('/bin/ls', ['-lde', target]).split('\n').filter(line => /^\s*\d+: /.test(line)).map(line => line.trim());
      assert.deepEqual(actual, original);
      assert.doesNotThrow(() => fs.accessSync(target, fs.constants.W_OK));
    }
  });
}

for (const kind of ['xattr', 'acl']) {
  const name = `sync: atualização preserva ${kind} existente no macOS`;
  if (process.platform !== 'darwin') { test(name, { skip: 'metadados nativos exigem macOS real' }); continue; }
  if (process.env.ADK_STRICT_RECOVERY_TEST !== '1') { test(name, { todo: 'metadados nativos ainda não são preservados' }); continue; }
  test(name, { timeout: 120000 }, t => {
    const root = fixture(t, 'sync'), { run } = prepareSyncUpdate(root);
    const target = join(root, '.pbai4devs/catalog.json');
    const before = fs.readFileSync(target);
    const command = (executable, args) => {
      const result = spawnSync(executable, args, { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout;
    };
    const acl = () => command('/bin/ls', ['-lde', target]).split('\n')
      .filter(line => /^\s*\d+: /.test(line)).map(line => line.trim());
    let original;
    if (kind === 'xattr') {
      command('/usr/bin/xattr', ['-w', 'com.pathbit.test-preservation', 'valor-sintetico', target]);
      original = command('/usr/bin/xattr', ['-p', 'com.pathbit.test-preservation', target]);
    } else {
      command('/bin/chmod', ['+a', 'everyone allow read', target]);
      original = acl();
      assert.ok(original.some(line => /allow read/.test(line)));
      assert.doesNotThrow(() => fs.accessSync(target, fs.constants.W_OK));
    }
    run();
    assert.notDeepEqual(fs.readFileSync(target), before, 'a fixture deve atualizar o catálogo');
    if (kind === 'xattr') assert.equal(command('/usr/bin/xattr', ['-p', 'com.pathbit.test-preservation', target]), original);
    else {
      assert.deepEqual(acl(), original);
      assert.doesNotThrow(() => fs.accessSync(target, fs.constants.W_OK));
    }
  });
}

for (const kind of ['install', 'sync']) {
  const name = `${kind}: atualização preserva ACL que nega append ou recusa com segurança no macOS`;
  if (process.platform !== 'darwin') { test(name, { skip: 'ACL nativa exige macOS real' }); continue; }
  if (process.env.ADK_STRICT_RECOVERY_TEST !== '1') { test(name, { todo: 'ACL existente pode ser perdida na substituição' }); continue; }
  test(name, { timeout: 120000 }, t => {
    const root = fixture(t, kind);
    let target, operation, expected;
    if (kind === 'sync') {
      const prepared = prepareSyncUpdate(root);
      target = join(root, '.pbai4devs/catalog.json'); operation = prepared.run;
    } else {
      target = join(root, 'AGENTS.md'); fs.writeFileSync(target, '# Documento humano\n');
    }
    fs.writeFileSync(join(root, 'base.txt'), 'base sintetica\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '--', 'base.txt']).status, 0);
    assert.equal(spawnSync('git', ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'test: base sintetica']).status, 0);
    fs.writeFileSync(join(root, '.gitignore'), '# regra humana\n');
    fs.writeFileSync(join(root, 'humano.txt'), 'staged\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '--', '.gitignore', 'humano.txt']).status, 0);
    const command = (file, args) => { const result = spawnSync(file, args, { encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr); return result.stdout; };
    command('/bin/chmod', ['+a', 'everyone deny append', target]);
    command('/usr/bin/xattr', ['-w', 'com.pathbit.append-acl', 'valor-sintetico', target]);
    const acl = () => command('/bin/ls', ['-lde', target]).split('\n').filter(line => /^\s*\d+: /.test(line)).map(line => line.trim());
    const originalAcl = acl(); assert.ok(originalAcl.some(line => /deny append/.test(line)));
    const control = join(root, 'controle-append.txt'); fs.writeFileSync(control, 'controle');
    command('/bin/chmod', ['+a', 'everyone deny append', control]);
    let appendFd, appendError;
    try { appendFd = fs.openSync(control, fs.constants.O_WRONLY | fs.constants.O_APPEND); fs.writeSync(appendFd, 'x'); }
    catch (error) { appendError = error; } finally { if (appendFd !== undefined) fs.closeSync(appendFd); }
    assert.ok(['EACCES', 'EPERM'].includes(appendError?.code), 'a fixture deve negar append efetivamente');
    assert.equal(fs.readFileSync(control, 'utf8'), 'controle');
    const fd = fs.openSync(target, fs.constants.O_WRONLY); fs.closeSync(fd); // A write-open probe alone accepts this ACL.
    if (kind === 'sync') expected = Buffer.from(buildCatalog(root).outputs.get('.pbai4devs/catalog.json'));
    else operation = () => {
      const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
      const change = plan.changes.find(item => item.path === 'AGENTS.md' && item.action === 'update');
      assert.ok(change); expected = Buffer.from(change.content); return applyPlan(plan);
    };
    const bytes = fs.readFileSync(target), inode = fs.lstatSync(target, { bigint: true }).ino;
    const mode = fs.statSync(target).mode & 0o777;
    const before = protectedMetadataTree(root), gitPaths = ['.git/index', '.git/config', '.git/HEAD', '.git/info/exclude'];
    const gitBefore = Object.fromEntries(gitPaths.map(path => [path, fs.readFileSync(join(root, path))]));
    const refs = () => command('git', ['-C', root, 'for-each-ref', '--format=%(refname) %(objectname)']);
    const refsBefore = refs(); assert.ok(refsBefore.trim(), 'fixture deve conter uma ref antes da operação');
    let failure; try { operation(); } catch (error) { failure = error; }
    const current = fs.existsSync(target) ? fs.lstatSync(target, { bigint: true }) : null;
    const actualAcl = current ? acl() : null;
    const attr = current ? spawnSync('/usr/bin/xattr', ['-p', 'com.pathbit.append-acl', target], { encoding: 'utf8' }) : null;
    const metadataPreserved = JSON.stringify(actualAcl) === JSON.stringify(originalAcl)
      && attr?.status === 0 && attr.stdout.trim() === 'valor-sintetico'
      && current && Number(current.mode & 0o777n) === mode;
    if (failure) {
      const after = protectedMetadataTree(root), beforeMap = new Map(before.map(row => [row[0], JSON.stringify(row)]));
      const afterMap = new Map(after.map(row => [row[0], JSON.stringify(row)]));
      const changed = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].filter(path => beforeMap.get(path) !== afterMap.get(path));
      const gitChanged = gitPaths.filter(path => !gitBefore[path].equals(fs.readFileSync(join(root, path))));
      assertObservedProtection({ failure, root, target, changed, gitChanged, inodePreserved: current?.ino === inode, metadataPreserved });
      assert.equal(refs(), refsBefore);
    } else {
      assert.ok(current?.isFile(), 'atualização deve manter o arquivo');
      assert.notDeepEqual(fs.readFileSync(target), bytes, 'fixture deve executar uma atualização');
      assert.deepEqual(fs.readFileSync(target), expected, 'atualização deve manter o resultado planejado');
      assert.deepEqual(actualAcl, originalAcl, 'atualização não deve perder ACL que nega append');
      assert.equal(fs.statSync(target).mode & 0o777, mode);
      assert.equal(attr?.status, 0); assert.equal(attr.stdout.trim(), 'valor-sintetico');
      assert.equal(fs.readFileSync(join(root, 'base.txt'), 'utf8'), 'base sintetica\n');
      assert.equal(fs.readFileSync(join(root, '.gitignore'), 'utf8'), '# regra humana\n');
      assert.equal(fs.readFileSync(join(root, 'humano.txt'), 'utf8'), 'staged\n');
      assert.equal(fs.readFileSync(control, 'utf8'), 'controle');
      assert.equal(refs(), refsBefore);
      for (const path of gitPaths) assert.deepEqual(fs.readFileSync(join(root, path)), gitBefore[path]);
    }
  });
}

const linuxXattrPerl = String.raw`
  require 'syscall.ph';
  my ($action, $path) = @ARGV;
  my $name = 'user.pathbit-test';
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
for (const kind of ['install', 'sync']) {
  const linuxXattrName = `${kind}: atualização preserva atributo estendido no Linux`;
  if (process.platform !== 'linux') { test(linuxXattrName, { skip: 'fixture exige Linux' }); continue; }
  if (process.env.ADK_STRICT_RECOVERY_TEST !== '1') { test(linuxXattrName, { todo: 'atributos estendidos ainda não são preservados' }); continue; }
  test(linuxXattrName, { timeout: 120000 }, t => {
    const perl = spawnSync('perl', ['-e', 'require "syscall.ph"; my $set = &SYS_setxattr; my $get = &SYS_getxattr; exit(0)']);
    assert.equal(perl.status, 0, 'a prova estrita exige Perl, syscall.ph e as chamadas xattr do Linux');
    const root = fixture(t, kind);
    let run, target;
    if (kind === 'sync') {
      ({ run } = prepareSyncUpdate(root)); target = join(root, '.pbai4devs/catalog.json');
    } else {
      target = join(root, 'AGENTS.md'); fs.writeFileSync(target, '# Documento humano\n');
      run = () => {
        const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
        assert.ok(plan.changes.some(change => change.path === 'AGENTS.md' && change.action === 'update'));
        applyPlan(plan);
      };
    }
    const before = fs.readFileSync(target);
    const xattr = action => spawnSync('perl', ['-e', linuxXattrPerl, action, target], { encoding: 'utf8' });
    assert.equal(xattr('set').status, 0, 'sistema de arquivos da fixture deve suportar xattr');
    const original = xattr('get');
    assert.equal(original.status, 0); assert.equal(original.stdout, 'sentinela-sintetica');
    run();
    assert.notDeepEqual(fs.readFileSync(target), before, 'a fixture deve atualizar o arquivo');
    const after = xattr('get');
    assert.equal(after.status, 0, 'o atributo estendido foi removido');
    assert.equal(after.stdout, original.stdout);
  });
}

const linuxBackupXattrName = 'install: backup preserva atributo estendido no Linux';
if (process.platform !== 'linux') {
  test(linuxBackupXattrName, { skip: 'fixture exige Linux' });
} else if (process.env.ADK_STRICT_RECOVERY_TEST !== '1') {
  test(linuxBackupXattrName, { todo: 'backup ainda não preserva atributos estendidos' });
} else {
  test(linuxBackupXattrName, { timeout: 120000 }, t => {
    const perl = spawnSync('perl', ['-e', 'require "syscall.ph"; my $set = &SYS_setxattr; my $get = &SYS_getxattr; exit(0)']);
    assert.equal(perl.status, 0, 'a prova estrita exige Perl, syscall.ph e as chamadas xattr do Linux');
    const root = fixture(t, 'install'), target = join(root, 'AGENTS.md');
    const human = Buffer.from('# Documento humano\n'); fs.writeFileSync(target, human);
    const xattr = (action, file) => spawnSync('perl', ['-e', linuxXattrPerl, action, file], { encoding: 'utf8' });
    assert.equal(xattr('set', target).status, 0, 'sistema de arquivos da fixture deve suportar xattr');
    const original = xattr('get', target);
    assert.equal(original.status, 0); assert.equal(original.stdout, 'sentinela-sintetica');
    const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
    assert.ok(plan.changes.some(change => change.path === 'AGENTS.md' && change.action === 'update'));
    const result = applyPlan(plan);
    assert.ok(result.backup, 'a atualização deve criar backup');
    const backup = join(root, result.backup, 'AGENTS.md');
    assert.deepEqual(fs.readFileSync(backup), human, 'backup deve conter os bytes anteriores');
    const copied = xattr('get', backup);
    assert.equal(copied.status, 0, 'o atributo estendido não foi copiado para o backup');
    assert.equal(copied.stdout, original.stdout);
  });
}

for (const kind of ['install', 'sync']) for (const variant of ['iguais', 'diferentes']) {
  test(`${kind}: criação parcial conserva arquivo publicado e edição posterior de bytes ${variant}`, { timeout: 120000 }, t => {
    const root = fixture(t, kind), { first, run } = newPublication(root, kind);
    const open = fs.openSync, failure = Object.assign(new Error('falha na próxima criação'), { code: 'ENOSPC' });
    let started = false, interrupted = false;
    t.mock.method(fs, 'openSync', (file, flags, ...args) => {
      if (flags === 'wx' && file === first) started = true;
      else if (started && !interrupted && flags === 'wx' && typeof file === 'string' && file.startsWith(root + sep)) {
        interrupted = true; throw failure;
      }
      return open(file, flags, ...args);
    });
    syncBuiltinESMExports();
    assert.throws(run, { code: 'ENOSPC' }); assert.ok(started && interrupted);
    const current = fs.readFileSync(first);
    const bytes = variant === 'iguais' ? current : Buffer.concat([current, Buffer.from('Edição posterior.\n')]);
    fs.writeFileSync(first, bytes); const human = fs.statSync(first, { bigint: true });
    assert.throws(run, { code: 'E_RECOVERY_PENDING' });
    assert.deepEqual(fs.readFileSync(first), bytes);
    const actual = fs.statSync(first, { bigint: true });
    assert.equal(actual.mode, human.mode); assert.equal(actual.dev, human.dev); assert.equal(actual.ino, human.ino);
  });
}

function assertPreserved(path, bytes, before) {
  assert.deepEqual(fs.readFileSync(path), bytes);
  const after = fs.statSync(path, { bigint: true });
  assert.equal(after.mode, before.mode);
  assert.equal(after.dev, before.dev);
  assert.equal(after.ino, before.ino);
}

function failAfterPublication(t, { target, later, run, variant, created }) {
  const open = fs.openSync;
  const expected = Object.assign(new Error('falha após publicação'), { code: 'ENOSPC' });
  let replacement, bytes;
  t.mock.method(fs, 'openSync', (path, flags, ...args) => {
    if (!replacement && flags === 'wx' && later(path)) {
      const published = fs.readFileSync(target), mode = fs.statSync(target).mode & 0o777;
      bytes = variant === 'iguais' ? published : Buffer.concat([published, Buffer.from('Edição humana.\n')]);
      const edited = target + '.edicao';
      const fd = open(edited, 'wx', mode);
      try { fs.writeFileSync(fd, bytes); fs.fchmodSync(fd, mode); } finally { fs.closeSync(fd); }
      fs.renameSync(edited, target);
      replacement = fs.statSync(target, { bigint: true });
      if (created) fs.closeSync(open(path, flags, ...args));
      throw expected;
    }
    return open(path, flags, ...args);
  });
  syncBuiltinESMExports();
  assert.throws(run, error => error.code === 'ENOSPC' && error.recovery?.status === 'pending' &&
    collectErrorDiagnostics(error).possiblePartial);
  assert.ok(replacement, 'a publicação e a edição devem preceder a falha');
  assertPreserved(target, bytes, replacement);
}

for (const kind of ['install', 'sync']) for (const variant of ['iguais', 'diferentes']) {
  test(`${kind}: falha após criação preserva substituto humano de bytes ${variant}`, { timeout: 120000 }, t => {
    const root = fixture(t, kind), { first, run } = newPublication(root, kind);
    failAfterPublication(t, {
      target: first, run, variant, created: true,
      later: path => typeof path === 'string' && path !== first && path.startsWith(root + sep)
        && !path.startsWith(join(root, '.agent-tests') + sep) && fs.existsSync(first),
    });
  });
}

for (const variant of ['iguais', 'diferentes']) for (const created of [false, true]) {
  const moment = created ? 'após a criação seguinte' : 'antes da criação seguinte';
  test(`install: falha ${moment} preserva substituto humano de bytes ${variant} do arquivo atualizado`, { timeout: 120000 }, t => {
    const root = fixture(t, 'install'), target = join(root, 'AGENTS.md');
    const original = '# Instruções humanas originais\n';
    fs.writeFileSync(target, original);
    const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
    const index = plan.changes.findIndex(change => change.path === 'AGENTS.md' && change.action === 'update');
    const next = plan.changes.slice(index + 1).find(change => change.action === 'create');
    assert.ok(index >= 0 && next);
    const later = join(root, next.path);
    failAfterPublication(t, {
      target, variant, created, run: () => applyPlan(plan),
      later: path => path === later && fs.readFileSync(target, 'utf8') !== original,
    });
    assert.equal(fs.existsSync(later), created);
  });
}

for (const variant of ['iguais', 'diferentes']) {
  test(`sync: falha após atualização preserva edição posterior de bytes ${variant}`, { timeout: 120000 }, t => {
    const root = fixture(t, 'sync'), { run, target, later } = prepareSyncUpdate(root);
    const open = fs.openSync, before = fs.readFileSync(target);
    t.mock.method(fs, 'openSync', (file, flags, ...args) => {
      if (file === later && flags === 'wx') throw Object.assign(new Error('disco cheio'), { code: 'ENOSPC' });
      return open(file, flags, ...args);
    });
    syncBuiltinESMExports(); assert.throws(run, { code: 'ENOSPC' });
    const published = fs.readFileSync(target);
    assert.notDeepEqual(published, before);
    const bytes = variant === 'iguais' ? published : Buffer.concat([published, Buffer.from('Edição posterior.\n')]);
    fs.writeFileSync(target, bytes);
    const human = fs.statSync(target, { bigint: true });
    assert.throws(run, { code: 'E_RECOVERY_PENDING' });
    assert.deepEqual(fs.readFileSync(target), bytes);
    const actual = fs.statSync(target, { bigint: true });
    assert.equal(actual.mode, human.mode); assert.equal(actual.dev, human.dev); assert.equal(actual.ino, human.ino);
  });
}

test('install: falha após atualização não altera caminhos públicos na recuperação', { timeout: 120000 }, t => {
  const root = fixture(t, 'install'), target = join(root, 'AGENTS.md');
  const before = '# Instruções humanas originais\n';
  fs.writeFileSync(target, before);
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const updated = plan.changes.findIndex(change => change.path === 'AGENTS.md' && change.action === 'update');
  const next = plan.changes.slice(updated + 1).find(change => change.action === 'create');
  assert.ok(updated >= 0 && next);
  const later = join(root, next.path);
  const names = ['openSync', 'renameSync', 'linkSync', 'unlinkSync', 'rmSync', 'rmdirSync', 'mkdirSync', 'chmodSync', 'writeFileSync', 'appendFileSync', 'copyFileSync', 'cpSync', 'symlinkSync'];
  const original = Object.fromEntries(names.map(name => [name, fs[name]]));
  const operations = [], failure = Object.assign(new Error('falha sintética após atualização'), { code: 'ENOSPC' });
  let failed = false;
  const inProject = path => typeof path === 'string' && (path === root || path.startsWith(root + sep));
  for (const name of names) t.mock.method(fs, name, (...args) => {
    if (name === 'openSync' && args[0] === later && args[1] === 'wx') {
      assert.notEqual(fs.readFileSync(target, 'utf8'), before);
      failed = true;
      throw failure;
    }
    const writes = name !== 'openSync' || (typeof args[1] === 'number'
      ? Boolean(args[1] & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC))
      : /[wa+]/.test(args[1]));
    if (failed && writes && args.some(inProject)) operations.push({ operation: name, paths: args.filter(inProject) });
    return original[name](...args);
  });
  syncBuiltinESMExports();
  assert.throws(() => applyPlan(plan), { code: 'ENOSPC' });
  assert.ok(failed);
  assert.deepEqual(operations, []);
});

test('sync: falha após atualização não altera caminhos públicos na recuperação', { timeout: 120000 }, t => {
  const root = fixture(t, 'sync'), { run, target, later } = prepareSyncUpdate(root);
  const names = ['openSync', 'renameSync', 'linkSync', 'unlinkSync', 'rmSync', 'rmdirSync', 'mkdirSync', 'chmodSync', 'writeFileSync', 'appendFileSync', 'copyFileSync', 'cpSync', 'symlinkSync'];
  const original = Object.fromEntries(names.map(name => [name, fs[name]]));
  const before = fs.readFileSync(target), operations = [];
  let failed = false;
  const publicPath = path => typeof path === 'string' && (path === root || path.startsWith(root + sep));
  for (const name of names) t.mock.method(fs, name, (...args) => {
    if (name === 'openSync' && args[0] === later && args[1] === 'wx') {
      failed = true; throw Object.assign(new Error('disco cheio'), { code: 'ENOSPC' });
    }
    const mutation = name !== 'openSync' || (typeof args[1] === 'number'
      ? Boolean(args[1] & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC))
      : /[wa+]/.test(args[1]));
    if (failed && mutation && args.some(publicPath)) operations.push(name);
    return original[name](...args);
  });
  syncBuiltinESMExports(); assert.throws(run, { code: 'ENOSPC' });
  assert.ok(failed); assert.notDeepEqual(fs.readFileSync(target), before); assert.deepEqual(operations, []);
});

// Proposta de contrato: autorização para alterar o arquivo existente e
// preservação dos seus metadados são verificações distintas. O snapshot final
// não observa mutações revertidas, .agent-tests ou ACL/xattrs de outros arquivos.
function protectedMetadataTree(root) {
  const rows = [];
  const walk = (relative = '') => {
    for (const name of fs.readdirSync(join(root, relative)).sort()) {
      const part = relative ? `${relative}/${name}` : name;
      if (part === '.git' || part === '.agent-tests') continue;
      const absolute = join(root, part), info = fs.lstatSync(absolute, { bigint: true });
      if (info.isSymbolicLink()) rows.push([part, 'link', fs.readlinkSync(absolute)]);
      else if (info.isDirectory()) { rows.push([part, 'directory', Number(info.mode & 0o777n)]); walk(part); }
      else if (info.isFile()) rows.push([part, 'file', Number(info.mode & 0o777n), digestMetadata(fs.readFileSync(absolute))]);
      else assert.fail(`Tipo não coberto na fixture: ${part}`);
    }
  };
  walk(); return rows;
}
function digestMetadata(content) {
  return createHash('sha256').update(content).digest('hex');
}
function hasProtectedMetadataCause(error, root, target) {
  const accepted = new Set(['EACCES', 'EPERM', 'E_PROTECTED_METADATA', 'E_METADATA_UNSUPPORTED']);
  const seen = new Set(); let current = error;
  for (let visited = 0; current && typeof current === 'object' && !seen.has(current) && visited < 64; visited++) {
    seen.add(current);
    const matchesTarget = typeof current.path === 'string' && resolve(root, current.path) === target;
    if (accepted.has(current.code) && matchesTarget) return true;
    // Only the primary cause is relevant; AggregateError.errors may also hold
    // unrelated rollback/cleanup failures and must not be searched wholesale.
    current = current.cause || (current instanceof AggregateError && Array.isArray(current.errors) ? current.errors[0] : null);
  }
  return false;
}
function assertObservedProtection({ failure, root, target, changed, gitChanged, inodePreserved, metadataPreserved }) {
  const detail = `árvore alterada: ${changed.length} (${changed.slice(0, 5).join(', ')}); Git alterado: ${gitChanged.join(', ') || 'não'}; inode preservado: ${inodePreserved}`;
  assert.ok(failure, `operação deve recusar arquivo protegido; ${detail}`);
  assert.ok(hasProtectedMetadataCause(failure, root, target), `falha não comprova proteção do alvo: ${failure.code}; ${detail}`);
  assert.equal(changed.length, 0, detail); assert.equal(gitChanged.length, 0, detail);
  assert.ok(inodePreserved, detail); assert.ok(metadataPreserved, detail);
}
test('verificador exige causa primária de proteção do alvo e estado observado preservado', () => {
  const root = resolve('fixture-contract'), target = join(root, 'protected.md');
  const permission = Object.assign(new Error('negado'), { code: 'EACCES', path: target });
  const control = { root, target, failure: permission, changed: [], gitChanged: [], inodePreserved: true, metadataPreserved: true };
  assert.doesNotThrow(() => assertObservedProtection(control));
  assert.doesNotThrow(() => assertObservedProtection({ ...control, failure: Object.assign(new Error('negado'), { code: 'EPERM', path: 'protected.md' }) }));
  assert.doesNotThrow(() => assertObservedProtection({ ...control, failure: new Error('wrapper', { cause: permission }) }));
  assert.doesNotThrow(() => assertObservedProtection({ ...control, failure: new AggregateError([permission], 'protegido') }));
  assert.throws(() => assertObservedProtection({ ...control, failure: Object.assign(new Error('outro'), { code: 'EACCES', path: join(root, 'other') }) }), /não comprova proteção/);
  assert.throws(() => assertObservedProtection({ ...control, failure: Object.assign(new Error('sem alvo'), { code: 'E_PROTECTED_METADATA' }) }), /não comprova proteção/);
  assert.throws(() => assertObservedProtection({ ...control, failure: Object.assign(new Error('rename'), { code: 'EACCES', path: join(root, 'other'), dest: target }) }), /não comprova proteção/);
  assert.throws(() => assertObservedProtection({ ...control, failure: Object.assign(new Error('dest only'), { code: 'E_PROTECTED_METADATA', dest: target }) }), /não comprova proteção/);
  const gitError = Object.assign(new Error('Git'), { code: 'E_GIT' });
  assert.throws(() => assertObservedProtection({ ...control, failure: new AggregateError([gitError, permission], 'erro e limpeza', { cause: gitError }) }), /não comprova proteção/);
  assert.throws(() => assertObservedProtection({ ...control, failure: new AggregateError([gitError, permission], 'erro e limpeza') }), /não comprova proteção/);
  assert.throws(() => assertObservedProtection({ ...control, changed: ['human.txt'] }), /árvore alterada/);
  const cycle = Object.assign(new Error('ciclo'), { code: 'E_GIT' }); cycle.cause = cycle;
  assert.throws(() => assertObservedProtection({ ...control, failure: cycle }), /não comprova proteção/);
});
for (const kind of ['install', 'update', 'sync']) for (const protection of ['acl-deny', 'immutable']) {
  const name = `${kind}: recusa alteração quando ${protection} nega escrita e preserva estado observado após recusa`;
  if (process.platform !== 'darwin') { test(name, { skip: 'proteção nativa exige macOS real' }); continue; }
  if (process.env.ADK_STRICT_RECOVERY_TEST !== '1') { test(name, { todo: 'pré-verificação e recuperação de metadados ainda não implementadas' }); continue; }
  test(name, { timeout: 120000 }, t => {
    const root = fixture(t, kind), command = (program, args) => {
      const result = spawnSync(program, args, { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr); return result.stdout;
    };
    const put = (name, content) => { fs.mkdirSync(dirname(join(root, name)), { recursive: true }); fs.writeFileSync(join(root, name), content); };
    let run, target;
    if (kind === 'sync') { ({ run } = prepareSyncUpdate(root)); target = join(root, '.pbai4devs/catalog.json'); }
    else {
      target = join(root, 'AGENTS.md'); fs.writeFileSync(target, '# Documento humano\n');
      if (kind === 'update') {
        applyPlan(planInstallation({ target: root, mode: 'init', clients: ['codex'] }));
        const current = fs.readFileSync(target, 'utf8');
        const legacy = current.replaceAll('.pbai4devs/INSTRUCTIONS.md', '.pbai4devs/legacy/INSTRUCTIONS.md');
        assert.notEqual(legacy, current, 'a fixture deve simular um bloco legado diferente');
        fs.writeFileSync(target, legacy);
        const statePath = join(root, '.pbai4devs/state/agentdevkit.json');
        const state = JSON.parse(fs.readFileSync(statePath)); state.blocks['AGENTS.md'] = managedBlockDigest(legacy);
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
      }
      run = () => applyPlan(planInstallation({ target: root, mode: kind === 'update' ? 'update' : 'init', clients: ['codex'] }));
    }
    put('.gitignore', '# humano\nprivate/\n'); put('human.txt', 'staged\n');
    command('git', ['-C', root, 'add', '--', '.gitignore', 'human.txt']); put('human.txt', 'staged\nunstaged\n');
    put('.git/info/exclude', '# humano\nprivate-local/\n');
    command('/usr/bin/xattr', ['-w', 'com.pathbit.contract', 'synthetic', target]);
    if (protection === 'acl-deny') command('/bin/chmod', ['+a', 'everyone deny write,append', target]);
    else command('/usr/bin/chflags', ['uchg', target]);
    try {
      assert.throws(() => { const fd = fs.openSync(target, fs.constants.O_WRONLY); fs.closeSync(fd); }, error => ['EACCES', 'EPERM'].includes(error.code));
      const before = protectedMetadataTree(root), gitBefore = Object.fromEntries(['.git/index', '.git/config', '.git/HEAD', '.git/info/exclude'].map(p => [p, fs.readFileSync(join(root, p))]));
      const inode = fs.lstatSync(target, { bigint: true }).ino, metadata = command('/bin/ls', ['-ldeO@', target]);
      let failure; try { run(); } catch (error) { failure = error; }
      // Colete evidência antes de qualquer asserção, inclusive sucesso indevido.
      const after = protectedMetadataTree(root), gitAfter = Object.fromEntries(Object.keys(gitBefore).map(p => [p, fs.readFileSync(join(root, p))]));
      const current = fs.existsSync(target) ? fs.lstatSync(target, { bigint: true }) : null;
      const metadataAfter = current ? command('/bin/ls', ['-ldeO@', target]) : null;
      const beforeMap = new Map(before.map(row => [row[0], JSON.stringify(row)])), afterMap = new Map(after.map(row => [row[0], JSON.stringify(row)]));
      const changed = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].filter(path => beforeMap.get(path) !== afterMap.get(path));
      const gitChanged = Object.keys(gitBefore).filter(path => !gitBefore[path].equals(gitAfter[path]));
      assertObservedProtection({ failure, root, target, changed, gitChanged, inodePreserved: current?.ino === inode, metadataPreserved: metadataAfter === metadata });
      assert.equal(command('/usr/bin/xattr', ['-p', 'com.pathbit.contract', target]).trim(), 'synthetic');
    } finally { if (protection === 'immutable' && fs.existsSync(target)) command('/usr/bin/chflags', ['nouchg', target]); }
  });
}
