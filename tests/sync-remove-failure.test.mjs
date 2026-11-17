import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { collectErrorDiagnostics } from '../.pbai4devs/scripts/lib/error-reporting.mjs';

function put(root, path, content) {
  const file = join(root, path);
  fs.mkdirSync(dirname(file), { recursive: true }); fs.writeFileSync(file, content);
}

test('sync preserva pasta humana criada no lugar da referência antes da remoção', { timeout: 120000 }, t => {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-remove-directory-race-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
  assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
  put(root, '.gitignore', '# humano\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
  const source = '.pbai4devs/skills/demo/SKILL.md', target = join(root, '.claude/skills/demo/SKILL.md');
  put(root, source, '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
  const options = { root, localIgnores: false, generateEntrypoints: false, output() {} };
  synchronize(options);
  fs.rmSync(join(root, source));
  const index = fs.readFileSync(join(root, '.git/index'));
  const remove = fs.rmSync;
  let injected = false;
  t.mock.method(fs, 'rmSync', (file, ...args) => {
    if (!injected && file === target) {
      injected = true;
      remove(target, { force: true });
      fs.mkdirSync(target);
      fs.writeFileSync(join(target, 'humano.txt'), 'conteúdo humano\n');
    }
    return remove(file, ...args);
  });
  syncBuiltinESMExports();
  assert.throws(() => synchronize({ ...options, force: true }));
  assert.equal(injected, true);
  assert.equal(fs.readFileSync(join(target, 'humano.txt'), 'utf8'), 'conteúdo humano\n');
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
});

for (const variant of ['arquivo', 'pasta', 'substituido']) test(`rollback do sync preserva ${variant === 'pasta' ? 'pasta humana criada' : variant === 'substituido' ? 'arquivo humano substituto' : 'arquivo humano criado'} durante restauração`, { timeout: 120000 }, t => {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-rollback-create-race-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
  assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
  put(root, '.gitignore', '# humano\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
  for (const name of ['alpha', 'beta']) put(root, `.pbai4devs/skills/${name}/SKILL.md`, `---\nname: ${name}\ndescription: Original.\n---\n\n# ${name}\n`);
  const options = { root, localIgnores: false, generateEntrypoints: false, output() {} };
  synchronize(options);
  for (const name of ['alpha', 'beta']) put(root, `.pbai4devs/skills/${name}/SKILL.md`, `---\nname: ${name}\ndescription: Alterada.\n---\n\n# ${name}\n`);
  const alpha = join(root, '.claude/skills/alpha/SKILL.md'), beta = join(root, '.claude/skills/beta/SKILL.md');
  const index = fs.readFileSync(join(root, '.git/index')), write = fs.writeFileSync, remove = fs.rmSync, open = fs.openSync;
  let failed = false, injected = false, restoreFd, humanMode;
  t.mock.method(fs, 'writeFileSync', (file, ...args) => {
    if (!failed && typeof file === 'string' && file.startsWith(`${beta}.sync.`)) {
      failed = true;
      throw Object.assign(new Error('falha sintética'), { code: 'EIO' });
    }
    const result = write(file, ...args);
    if (variant === 'substituido' && failed && !injected && file === restoreFd) {
      injected = true;
      fs.renameSync(alpha, `${alpha}.restaurado`);
      write(alpha, 'conteúdo humano concorrente\n', { flag: 'wx', mode: 0o600 });
      humanMode = fs.statSync(alpha).mode & 0o777;
    }
    return result;
  });
  t.mock.method(fs, 'openSync', (file, flags, ...args) => {
    if (failed && !injected && typeof file === 'string' && file.includes('.sync-rollback.') && flags === 'wx+'
      && variant === 'arquivo') {
      injected = true;
      remove(alpha, { force: true });
      write(alpha, 'conteúdo humano concorrente\n', { flag: 'wx', mode: 0o600 });
    }
    if (failed && !injected && typeof file === 'string' && file.includes('.sync-rollback.') && flags === 'wx+'
      && variant === 'pasta') {
      injected = true;
      remove(alpha, { force: true });
      fs.mkdirSync(alpha);
      write(join(alpha, 'humano.txt'), 'conteúdo humano concorrente\n', { flag: 'wx' });
    }
    const fd = open(file, flags, ...args);
    if (variant === 'substituido' && failed && typeof file === 'string' && file.includes('.sync-rollback.') && flags === 'wx+') restoreFd = fd;
    return fd;
  });
  syncBuiltinESMExports();
  let failure;
  try { synchronize({ ...options, force: true }); } catch (error) { failure = error; }
  assert.equal(failed, true);
  assert.equal(injected, true);
  assert.equal(failure?.code, 'EIO');
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes('.claude/skills/alpha/SKILL.md'));
  assert.equal(fs.readFileSync(variant === 'pasta' ? join(alpha, 'humano.txt') : alpha, 'utf8'), 'conteúdo humano concorrente\n');
  if (variant === 'substituido') assert.equal(fs.statSync(alpha).mode & 0o777, humanMode);
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
});

for (const [name, value] of [['undefined', undefined], ['null', null], ['false', false], ['zero', 0], ['empty', ''], ['nan', NaN], ['bigint', 0n], ['EIO', () => Object.assign(new Error('falha sintética'), { code: 'EIO' })], ['EIO congelado', () => Object.freeze(Object.assign(new Error('falha sintética'), { code: 'EIO' }))]]) for (const timing of ['antes', 'depois', 'substituido']) {
  test(`sync informa falha ${name} ${timing} de remover referência`, { timeout: 120000 }, t => {
    const thrown = typeof value === 'function' ? value() : value;
    const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-remove-failure-')));
    t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
    assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
    put(root, '.gitignore', '# humano\n'); put(root, 'humano.txt', 'staged\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'humano.txt']).status, 0);
    fs.appendFileSync(join(root, 'humano.txt'), 'unstaged\n');
    put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
    for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
      put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
    }
    const source = '.pbai4devs/skills/demo/SKILL.md';
    put(root, source, '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
    const options = { root, localIgnores: false, generateEntrypoints: false, output() {} };
    synchronize(options);
    const target = join(root, '.claude/skills/demo/SKILL.md'), original = fs.readFileSync(target);
    const identity = fs.statSync(target, { bigint: true });
    const held = timing === 'substituido' && process.platform !== 'win32' ? fs.openSync(target, 'r') : undefined;
    if (held !== undefined) t.after(() => fs.closeSync(held));
    const paths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'humano.txt'];
    const snapshots = new Map(paths.map(path => [path, fs.readFileSync(join(root, path))]));
    fs.rmSync(join(root, source));
    const remove = fs.rmSync; let injected = false, replacement;
    t.mock.method(fs, 'rmSync', (path, ...args) => {
      if (!injected && path === target) {
        injected = true;
        if (timing === 'depois') remove(path, ...args);
        if (timing === 'substituido') {
          remove(path, ...args); fs.writeFileSync(path, original, { flag: 'wx', mode: Number(identity.mode & 0o777n) });
          replacement = fs.statSync(path, { bigint: true });
        }
        throw thrown;
      }
      return remove(path, ...args);
    });
    syncBuiltinESMExports();
    let failure, failed = false;
    try { synchronize(options); } catch (error) { failed = true; failure = error; }
    t.mock.restoreAll(); syncBuiltinESMExports();
    assert.ok(injected, 'fixture deve atingir a remoção');
    assert.equal(failed, true, 'falha da remoção deve ser informada');
    if (timing !== 'depois') assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes('.claude/skills/demo/SKILL.md'));
    assert.deepEqual(fs.readFileSync(target), original);
    if (timing === 'antes') {
      const actual = fs.statSync(target, { bigint: true });
      assert.equal(actual.ino, identity.ino, 'falha anterior à remoção deve preservar inode');
      assert.equal(actual.dev, identity.dev);
    }
    if (timing === 'substituido') {
      const actual = fs.statSync(target, { bigint: true });
      if (held !== undefined && identity.ino && replacement.ino) assert.notEqual(replacement.ino, identity.ino);
      assert.equal(actual.ino, replacement.ino, 'substituto humano não deve ser recriado');
      assert.equal(actual.dev, replacement.dev);
    }
    for (const [path, bytes] of snapshots) assert.deepEqual(fs.readFileSync(join(root, path)), bytes);
    let current = failure, found = Object.is(failure, thrown);
    for (let depth = 0; depth < 8 && current && typeof current === 'object'; depth++) {
      if (!Object.hasOwn(current, 'cause')) break;
      current = current.cause;
      if (Object.is(current, thrown)) { found = true; break; }
    }
    assert.equal(found, true, 'causa original deve ser preservada');
    if (name.startsWith('EIO')) assert.equal(failure.code, 'EIO');
  });
}
