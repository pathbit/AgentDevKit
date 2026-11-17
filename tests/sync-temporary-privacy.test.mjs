import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';

const repository = fileURLToPath(new URL('..', import.meta.url));
const options = { timeout: 120000, skip: process.platform === 'win32' ? 'bits POSIX não comprovam ACLs do Windows' : false };

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-private-mode-')));
  const originalUmask = process.umask();
  t.after(() => {
    process.umask(originalUmask);
    t.mock.restoreAll();
    syncBuiltinESMExports();
    fs.rmSync(root, { recursive: true, force: true });
  });
  assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
  const put = (path, bytes) => {
    const file = join(root, path);
    fs.mkdirSync(dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
  };
  put('.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(`.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(join(repository, '.pbai4devs/templates/gitignore', name)));
  }
  put('.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
  put('.claude/notas-humanas.md', 'Conteúdo humano preservado.\n');
  return { root, target: join(root, '.claude/skills/demo/SKILL.md'),
    source: join(root, '.pbai4devs/skills/demo/SKILL.md'), human: join(root, '.claude/notas-humanas.md'),
    sync: { root, localIgnores: false, generateEntrypoints: false, output() {} } };
}

function changeSource(source) {
  const before = fs.readFileSync(source, 'utf8');
  assert.ok(before.includes('description: Fixture.'));
  fs.writeFileSync(source, before.replace('description: Fixture.', 'description: Fixture atualizada.'));
}

function captureTemporary(t, target) {
  const write = fs.writeFileSync, modes = [];
  t.mock.method(fs, 'writeFileSync', (path, ...args) => {
    const result = write(path, ...args);
    if (String(path).startsWith(`${target}.sync.`)) modes.push(fs.statSync(path).mode & 0o777);
    return result;
  });
  syncBuiltinESMExports();
  return modes;
}

for (const originalMode of [0o400, 0o444, 0o600, 0o640, 0o644]) for (const mask of [0o000, 0o002, 0o022, 0o077]) {
  test(`sync mantém o temporário privado e preserva modo ${originalMode.toString(8)} com umask ${mask.toString(8)}`, options, t => {
    const { target, source, human, sync } = fixture(t);
    synchronize(sync);
    const original = fs.readFileSync(target, 'utf8');
    const humanBytes = fs.readFileSync(human);
    changeSource(source);
    fs.chmodSync(target, originalMode);
    process.umask(mask);
    const modes = captureTemporary(t, target);
    synchronize({ ...sync, force: true });
    assert.deepEqual(modes, [0o600], 'a fixture deve observar o modo privado durante o estágio');
    assert.equal(fs.statSync(target).mode & 0o777, originalMode);
    assert.ok(original.includes('description: Fixture.'));
    assert.equal(fs.readFileSync(target, 'utf8'), original.replace('description: Fixture.', 'description: Fixture atualizada.'));
    assert.deepEqual(fs.readFileSync(human), humanBytes);
    assert.equal(fs.readdirSync(dirname(target)).some(name => name.startsWith('SKILL.md.sync.')), false);
  });
}

for (const mask of [0o000, 0o002, 0o022, 0o077]) {
  test(`sync mantém a política de criação com umask ${mask.toString(8)}`, options, t => {
    const { target, sync } = fixture(t);
    process.umask(mask);
    const modes = captureTemporary(t, target);
    synchronize(sync);
    assert.deepEqual(modes, [0o666 & ~mask]);
    assert.equal(fs.statSync(target).mode & 0o777, 0o666 & ~mask);
    assert.ok(fs.readFileSync(target).length > 0);
    assert.equal(fs.readdirSync(dirname(target)).some(name => name.startsWith('SKILL.md.sync.')), false);
  });
}

test('sync preserva edição humana e recusa sobrescrita mesmo com force', options, t => {
  const { root, target, source, human, sync } = fixture(t);
  synchronize(sync);
  fs.appendFileSync(target, '\nEdição humana sintética.\n');
  const changed = fs.readFileSync(target), humanBytes = fs.readFileSync(human);
  changeSource(source);
  const sourceBytes = fs.readFileSync(source);
  const staged = spawnSync('git', ['-C', root, 'add', '-f', '--', '.claude/notas-humanas.md'], { encoding: 'utf8' });
  assert.equal(staged.status, 0, staged.stderr);
  const index = fs.readFileSync(join(root, '.git/index'));
  const modes = captureTemporary(t, target);
  assert.throws(() => synchronize({ ...sync, force: true }), error =>
    /Conteudo proprio preservado/.test(error.message) && error.message.includes('.claude/skills/demo/SKILL.md'));
  assert.deepEqual(fs.readFileSync(target), changed);
  assert.deepEqual(fs.readFileSync(source), sourceBytes);
  assert.deepEqual(fs.readFileSync(human), humanBytes);
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(modes, []);
  assert.equal(fs.readdirSync(dirname(target)).some(name => name.startsWith('SKILL.md.sync.')), false);
});

for (const change of ['remove', 'restrict']) {
  test(`sync recusa ${change} concorrente antes de criar temporário`, options, t => {
    const { target, source, human, sync } = fixture(t);
    synchronize(sync);
    changeSource(source);
    fs.chmodSync(target, 0o644);
    const previous = fs.readFileSync(target), humanBytes = fs.readFileSync(human), lstat = fs.lstatSync, write = fs.writeFileSync;
    let changed = false, temporaryWrites = 0;
    t.mock.method(fs, 'lstatSync', (file, ...args) => {
      if (!changed && file === target && new Error().stack.includes('at atomic ')) {
        changed = true;
        if (change === 'remove') fs.unlinkSync(target); else fs.chmodSync(target, 0o600);
      }
      return lstat(file, ...args);
    });
    t.mock.method(fs, 'writeFileSync', (file, ...args) => {
      if (String(file).startsWith(`${target}.sync.`)) temporaryWrites++;
      return write(file, ...args);
    });
    syncBuiltinESMExports();
    assert.throws(() => synchronize({ ...sync, force: true }), /Arquivo mudou apos planejar/);
    assert.equal(changed, true, 'a fixture deve alterar o arquivo após a captura');
    assert.equal(temporaryWrites, 0, 'nenhum temporário deve ser criado após a mudança');
    assert.equal(fs.readdirSync(dirname(target)).some(name => name.startsWith('SKILL.md.sync.')), false);
    assert.deepEqual(fs.readFileSync(human), humanBytes);
    if (change === 'remove') assert.equal(fs.existsSync(target), false);
    else {
      assert.equal(fs.statSync(target).mode & 0o777, 0o600);
      assert.deepEqual(fs.readFileSync(target), previous);
    }
  });
}
