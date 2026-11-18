import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectRecoveryJournal, reserveRecovery, beginRecovery, finishRecovery, resolveRecovery } from '../.pbai4devs/scripts/lib/recovery-store.mjs';
import { createPrivateRecoveryDirectory } from '../.pbai4devs/scripts/lib/recovery-privacy.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = new URL('../.pbai4devs/scripts/lib/recovery-store.mjs', import.meta.url).href;
const manifest = 'a'.repeat(64);
// The legacy POSIX suite verifies mode, UID and directory fsync. Portable
// cases below create a root with the platform-specific protection.
const test = process.platform === 'win32' ? nodeTest.skip : nodeTest;
function fixture(t, parent = fs.realpathSync(tmpdir())) {
  const root = fs.mkdtempSync(join(parent, 'adk-recovery-store-'));
  fs.mkdirSync(join(root, 'records'), { mode: 0o700 });
  fs.mkdirSync(join(root, 'staging'), { mode: 0o700 });
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
  return root;
}
const contents = root => fs.readdirSync(join(root, 'records')).sort().map(name => [name, fs.readFileSync(join(root, 'records', name))]);
const code = expected => error => error?.code === expected;

test('diário vazio, pendente, concluído e nova geração mantêm a cadeia', t => {
  const root = fixture(t);
  assert.deepEqual(inspectRecoveryJournal(root), { status: 'ready', generation: 0, head: null });
  const first = reserveRecovery(root);
  assert.deepEqual(inspectRecoveryJournal(root), { status: 'pending', generation: 1, id: first.id, phase: 'claim' });
  assert.throws(() => reserveRecovery(root), code('E_RECOVERY_PENDING'));
  assert.throws(() => beginRecovery(root, 'id-inválido', manifest), code('E_RECOVERY_INPUT'));
  assert.throws(() => beginRecovery(root, first.id, 'invalid'), code('E_RECOVERY_INPUT'));
  assert.throws(() => finishRecovery(root, first.id), code('E_RECOVERY_STATE'));
  beginRecovery(root, first.id, manifest);
  assert.deepEqual(inspectRecoveryJournal(root), { status: 'pending', generation: 1, id: first.id, phase: 'begin' });
  assert.throws(() => beginRecovery(root, first.id, manifest), code('E_RECOVERY_STATE'));
  const done = finishRecovery(root, first.id), state = inspectRecoveryJournal(root);
  assert.equal(done.phase, 'done'); assert.equal(state.status, 'ready'); assert.equal(state.generation, 1);
  assert.equal(state.head, hash(fs.readFileSync(join(root, 'records', '000000000001.done.json'))));
  const second = reserveRecovery(root);
  assert.equal(second.generation, 2); assert.notEqual(second.id, first.id);
  assert.equal(inspectRecoveryJournal(root).phase, 'claim');
  assert.throws(() => beginRecovery(root, first.id, manifest), code('E_RECOVERY_STATE'));
  assert.equal(fs.readdirSync(join(root, 'staging')).length, 4);
  if (process.platform !== 'win32') for (const name of fs.readdirSync(join(root, 'staging'))) assert.equal(fs.statSync(join(root, 'staging', name)).mode & 0o777, 0o400);
});

test('layout incompleto, conteúdo estranho, link e arquivo truncado falham fechados', t => {
  const root = fixture(t), records = join(root, 'records'), record = join(records, '000000000001.claim.json');
  fs.writeFileSync(record, 'incompleto');
  assert.equal(inspectRecoveryJournal(root).status, 'invalid');
  assert.throws(() => reserveRecovery(root), code('E_RECOVERY_STORE'));
  assert.equal(fs.readFileSync(record, 'utf8'), 'incompleto');
  fs.unlinkSync(record); fs.writeFileSync(join(records, 'desconhecido'), 'sentinela');
  assert.equal(inspectRecoveryJournal(root).status, 'invalid');
  fs.unlinkSync(join(records, 'desconhecido'));
  fs.writeFileSync(record, Buffer.alloc(4097));
  assert.equal(inspectRecoveryJournal(root).status, 'invalid');
  fs.unlinkSync(record);
  if (process.platform !== 'win32') {
    const outsideDir = fs.mkdtempSync(join(fs.realpathSync(tmpdir()), 'adk-recovery-external-'));
    t.after(() => fs.rmSync(outsideDir, { recursive: true, force: true }));
    const outside = join(outsideDir, 'sentinela'); fs.writeFileSync(outside, 'privado');
    fs.symlinkSync(outside, record);
    assert.equal(inspectRecoveryJournal(root).status, 'invalid');
    assert.equal(fs.readFileSync(outside, 'utf8'), 'privado');
    fs.unlinkSync(record);
    fs.chmodSync(records, 0o755);
    assert.equal(inspectRecoveryJournal(root).status, 'invalid');
    fs.chmodSync(records, 0o700);
  }
  fs.rmdirSync(join(root, 'staging'));
  assert.equal(inspectRecoveryJournal(root).status, 'invalid');
  assert.equal(inspectRecoveryJournal(join(root, 'ausente')).status, 'invalid');
});

test('store inválido e falha de leitura são distintos de operação pendente', t => {
  const root = fixture(t), id = '12345678-1234-4234-8234-123456789abc';
  fs.writeFileSync(join(root, 'records', '000000000001.claim.json'), 'inválido');
  assert.throws(() => beginRecovery(root, id, manifest), code('E_RECOVERY_STORE'));
  assert.throws(() => finishRecovery(root, id), code('E_RECOVERY_STORE'));
  const opendir = fs.opendirSync;
  t.mock.method(fs, 'opendirSync', (...args) => {
    if (args[0] === root) throw Object.assign(new Error('falha privada'), { code: 'EIO' });
    return opendir(...args);
  });
  syncBuiltinESMExports();
  try {
    assert.deepEqual(inspectRecoveryJournal(root), { status: 'invalid', reason: 'unreadable' });
    for (const operation of [() => reserveRecovery(root), () => beginRecovery(root, id, manifest), () => finishRecovery(root, id)]) {
      assert.throws(operation, error => error.code === 'E_RECOVERY_IO' && !error.message.includes('privada'));
    }
  } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
});

test('troca por link após lstat não lê nem altera o arquivo externo', { skip: process.platform === 'win32' }, t => {
  const root = fixture(t); reserveRecovery(root);
  const external = fs.mkdtempSync(join(fs.realpathSync(tmpdir()), 'adk-recovery-link-'));
  t.after(() => fs.rmSync(external, { recursive: true, force: true }));
  const sentinel = join(external, 'privado'), record = join(root, 'records', '000000000001.claim.json');
  fs.writeFileSync(sentinel, 'dado sintético protegido');
  const open = fs.openSync, read = fs.readSync; let replaced = false, readCalled = false;
  t.mock.method(fs, 'openSync', (path, ...args) => {
    if (path === record && !replaced) { replaced = true; fs.unlinkSync(record); fs.symlinkSync(sentinel, record); }
    return open(path, ...args);
  });
  t.mock.method(fs, 'readSync', (...args) => { readCalled = true; return read(...args); });
  syncBuiltinESMExports();
  let result;
  try { result = inspectRecoveryJournal(root); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(replaced, true); assert.equal(readCalled, false); assert.equal(result.status, 'invalid');
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'dado sintético protegido');
});

for (const when of ['antes do link', 'depois do link', 'fsync após o link']) test(`falha ${when} preserva registros e sentinela pública`, t => {
  const publicRoot = fs.mkdtempSync(join(fs.realpathSync(tmpdir()), 'adk-recovery-public-'));
  t.after(() => fs.rmSync(publicRoot, { recursive: true, force: true }));
  const root = fixture(t, publicRoot);
  const sentinel = join(publicRoot, 'sentinela'); fs.writeFileSync(sentinel, 'dados humanos');
  const link = fs.linkSync, sync = fs.fsyncSync;
  if (when === 'antes do link') t.mock.method(fs, 'fchmodSync', () => {
    throw Object.assign(new Error('conteúdo privado não deve escapar'), { code: 'EIO' });
  });
  else if (when === 'depois do link') t.mock.method(fs, 'linkSync', (from, to) => {
    link(from, to); throw Object.assign(new Error('conteúdo privado não deve escapar'), { code: 'EIO' });
  });
  else t.mock.method(fs, 'fsyncSync', fd => {
    if (fs.fstatSync(fd).isDirectory()) throw Object.assign(new Error('conteúdo privado não deve escapar'), { code: 'EIO' });
    return sync(fd);
  });
  syncBuiltinESMExports();
  let failure;
  try { reserveRecovery(root); } catch (error) { failure = error; }
  t.mock.restoreAll(); syncBuiltinESMExports();
  assert.equal(failure?.code, when === 'antes do link' ? 'E_RECOVERY_IO' : 'E_RECOVERY_UNCERTAIN');
  assert.equal(failure.message.includes('privado'), false);
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'dados humanos');
  assert.equal(inspectRecoveryJournal(root).status, when === 'antes do link' ? 'ready' : 'pending');
  if (failure.operation) {
    assert.equal(failure.operation.publication, 'possible'); assert.equal(failure.operation.kind, 'claim');
    assert.equal(inspectRecoveryJournal(root).id, failure.operation.id);
  }
  assert.equal(fs.readdirSync(join(root, 'staging')).length, 1);
});

test('colisão na reserva preserva o claim concorrente e reporta disputa', t => {
  const root = fixture(t), link = fs.linkSync, rival = '12345678-1234-4234-8234-123456789abc';
  t.mock.method(fs, 'linkSync', (from, to) => {
    const bytes = Buffer.from(JSON.stringify({ version: 1, generation: 1, id: rival, kind: 'claim', previous: null }) + '\n');
    fs.writeFileSync(to, bytes, { flag: 'wx', mode: 0o400 });
    return link(from, to);
  });
  syncBuiltinESMExports();
  assert.throws(() => reserveRecovery(root), code('E_RECOVERY_BUSY'));
  t.mock.restoreAll(); syncBuiltinESMExports();
  assert.deepEqual(inspectRecoveryJournal(root), { status: 'pending', generation: 1, id: rival, phase: 'claim' });
  assert.equal(contents(root).length, 1);
});

test('colisão no arquivo de preparação é erro de E/S e não disputa de claim', t => {
  const root = fixture(t), open = fs.openSync;
  t.mock.method(fs, 'openSync', (path, ...args) => {
    if (String(path).startsWith(join(root, 'staging'))) throw Object.assign(new Error('colisão sintética'), { code: 'EEXIST' });
    return open(path, ...args);
  });
  syncBuiltinESMExports();
  try { assert.throws(() => reserveRecovery(root), code('E_RECOVERY_IO')); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(inspectRecoveryJournal(root).status, 'ready');
  assert.deepEqual(fs.readdirSync(join(root, 'records')), []);
});

test('falha ao fechar arquivo de preparação não fecha o descritor duas vezes', t => {
  const root = fixture(t), close = fs.closeSync; let calls = 0;
  t.mock.method(fs, 'closeSync', fd => {
    calls++; close(fd);
    throw Object.assign(new Error('falha sintética após fechar'), { code: 'EIO' });
  });
  syncBuiltinESMExports();
  assert.throws(() => reserveRecovery(root), code('E_RECOVERY_IO'));
  t.mock.restoreAll(); syncBuiltinESMExports();
  assert.equal(calls, 1); assert.equal(inspectRecoveryJournal(root).status, 'ready');
  assert.equal(fs.readdirSync(join(root, 'staging')).length, 1);
});

test('limite de bytes é aplicado antes de interpretar registros inválidos', t => {
  const root = fixture(t), records = join(root, 'records');
  for (let n = 1; n <= 257; n++) fs.writeFileSync(join(records, `${String(n).padStart(12, '0')}.claim.json`), Buffer.alloc(4096), { mode: 0o400 });
  assert.deepEqual(inspectRecoveryJournal(root), { status: 'invalid', reason: 'limit-exceeded' });
  assert.throws(() => reserveRecovery(root), code('E_RECOVERY_STORE'));
  assert.equal(fs.readdirSync(records).length, 257);
});

test('falha no fsync depois do recibo pode deixar done visível apesar do erro', t => {
  const root = fixture(t), claim = reserveRecovery(root);
  beginRecovery(root, claim.id, manifest);
  const sync = fs.fsyncSync; let directorySyncs = 0;
  t.mock.method(fs, 'fsyncSync', fd => {
    if (fs.fstatSync(fd).isDirectory() && ++directorySyncs === 2) throw Object.assign(new Error('falha sintética'), { code: 'EIO' });
    return sync(fd);
  });
  syncBuiltinESMExports();
  assert.throws(() => finishRecovery(root, claim.id), error => error.code === 'E_RECOVERY_UNCERTAIN'
    && error.operation.id === claim.id && error.operation.kind === 'done');
  t.mock.restoreAll(); syncBuiltinESMExports();
  assert.equal(inspectRecoveryJournal(root).status, 'ready');
  assert.equal(contents(root).length, 3);
});

nodeTest('resolução manual exige ID e geração pendentes e preserva o projeto', t => {
  const parent = fixture(t), root = join(parent, 'diário privado'), publicFile = join(parent, 'README.md');
  createPrivateRecoveryDirectory(root);
  fs.mkdirSync(join(root, 'records'), { mode: 0o700 });
  fs.mkdirSync(join(root, 'staging'), { mode: 0o700 });
  fs.writeFileSync(publicFile, 'edição humana');
  for (const phase of ['claim', 'begin']) {
    const { id, generation } = reserveRecovery(root);
    if (phase === 'begin') beginRecovery(root, id, manifest);
    const before = contents(root);
    assert.throws(() => resolveRecovery(root, generation + 1, id), code('E_RECOVERY_STATE'));
    assert.throws(() => resolveRecovery(root, generation, '12345678-1234-4234-8234-123456789abc'), code('E_RECOVERY_STATE'));
    assert.throws(() => resolveRecovery(root, '1', id), code('E_RECOVERY_INPUT'));
    assert.deepEqual(contents(root), before);
    assert.deepEqual(resolveRecovery(root, generation, id), { generation, id, phase: 'resolved' });
    const state = inspectRecoveryJournal(root);
    assert.equal(state.terminal, 'resolved'); assert.equal(state.resolvedCount, generation);
    assert.throws(() => resolveRecovery(root, generation, id), code('E_RECOVERY_STATE'));
    assert.throws(() => finishRecovery(root, id), code('E_RECOVERY_STATE'));
    assert.equal(fs.readFileSync(publicFile, 'utf8'), 'edição humana');
  }
  const next = reserveRecovery(root);
  beginRecovery(root, next.id, manifest);
  finishRecovery(root, next.id);
  assert.equal(inspectRecoveryJournal(root).terminal, 'done');
});

nodeTest('recibo inválido bloqueia a resolução e preserva a pendência para inspeção', t => {
  const parent = fixture(t), root = join(parent, 'journal');
  createPrivateRecoveryDirectory(root);
  fs.mkdirSync(join(root, 'records'), { mode: 0o700 });
  fs.mkdirSync(join(root, 'staging'), { mode: 0o700 });
  const { generation, id } = reserveRecovery(root);
  const name = join(root, 'records', '000000000001.resolved.json');
  fs.writeFileSync(name, '{}\n', { flag: 'wx', mode: 0o400 });
  const before = contents(root);
  assert.throws(() => resolveRecovery(root, generation, id), code('E_RECOVERY_STORE'));
  assert.throws(() => reserveRecovery(root), code('E_RECOVERY_STORE'));
  assert.deepEqual(contents(root), before);
});

nodeTest('erro ao gravar a resolução deixa a operação pendente e permite repetir', t => {
  const parent = fixture(t), root = join(parent, 'journal');
  createPrivateRecoveryDirectory(root);
  fs.mkdirSync(join(root, 'records'), { mode: 0o700 });
  fs.mkdirSync(join(root, 'staging'), { mode: 0o700 });
  const { generation, id } = reserveRecovery(root);
  beginRecovery(root, id, manifest);
  const before = contents(root);
  t.mock.method(fs, 'writeFileSync', () => { throw Object.assign(new Error('falha sintética de gravação'), { code: 'EIO' }); });
  syncBuiltinESMExports();
  try { assert.throws(() => resolveRecovery(root, generation, id), code('E_RECOVERY_IO')); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.deepEqual(contents(root), before);
  assert.equal(inspectRecoveryJournal(root).phase, 'begin');
  assert.equal(resolveRecovery(root, generation, id).phase, 'resolved');
});

test('falha ao sincronizar registro anterior impede publicação seguinte', t => {
  const root = fixture(t), claim = reserveRecovery(root), before = contents(root);
  const sync = fs.fsyncSync;
  t.mock.method(fs, 'fsyncSync', fd => {
    if (fs.fstatSync(fd).isFile()) throw Object.assign(new Error('falha sintética'), { code: 'EIO' });
    return sync(fd);
  });
  syncBuiltinESMExports();
  assert.throws(() => beginRecovery(root, claim.id, manifest), code('E_RECOVERY_IO'));
  t.mock.restoreAll(); syncBuiltinESMExports();
  assert.deepEqual(contents(root), before);
  assert.equal(fs.readdirSync(join(root, 'staging')).length, 1);
  assert.equal(inspectRecoveryJournal(root).phase, 'claim');
});

test('limite reserva espaço para claim, begin e done sem modificar diário cheio', { timeout: 120000 }, t => {
  const root = fixture(t), records = join(root, 'records'); let previous = null;
  const entry = (generation, id, kind, extra) => Buffer.from(JSON.stringify({ version: 1, generation, id, kind, ...extra }) + '\n');
  for (let generation = 1; generation <= 1332; generation++) {
    const id = `12345678-1234-4234-8234-${generation.toString(16).padStart(12, '0')}`;
    const c = entry(generation, id, 'claim', { previous }), b = entry(generation, id, 'begin', { claim: hash(c), manifest }), d = entry(generation, id, 'done', { begin: hash(b) });
    for (const [kind, bytes] of [['claim', c], ['begin', b], ['done', d]]) fs.writeFileSync(join(records, `${String(generation).padStart(12, '0')}.${kind}.json`), bytes, { mode: 0o400 });
    previous = hash(d);
  }
  assert.equal(inspectRecoveryJournal(root).status, 'ready');
  const last = reserveRecovery(root); beginRecovery(root, last.id, manifest); finishRecovery(root, last.id);
  assert.throws(() => reserveRecovery(root), code('E_RECOVERY_LIMIT'));
  assert.equal(fs.readdirSync(records).length, 3999); assert.equal(fs.readdirSync(join(root, 'staging')).length, 3);
  fs.writeFileSync(join(records, '000000001334.claim.json'), 'x', { mode: 0o400 });
  fs.writeFileSync(join(records, '000000001334.begin.json'), 'x', { mode: 0o400 });
  assert.deepEqual(inspectRecoveryJournal(root), { status: 'invalid', reason: 'limit-exceeded' });
});

function child(script, args) {
  const process = spawn(globalThis.process.execPath, ['--input-type=module', '-e', script, source, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  process.stdout.on('data', chunk => { stdout += chunk; }); process.stderr.on('data', chunk => { stderr += chunk; });
  const done = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { process.kill('SIGKILL'); reject(Error('subprocess timeout')); }, 30000);
    process.on('error', error => { clearTimeout(timeout); reject(error); });
    process.on('close', (code, signal) => { clearTimeout(timeout); resolve({ code, signal, stdout, stderr }); });
  });
  return { process, done };
}

test('oito processos disputam a mesma geração; apenas um publica claim', { timeout: 60000 }, async t => {
  const root = fixture(t);
  const script = `const {reserveRecovery}=await import(process.argv[1]);process.stdout.write('ready\\n');await new Promise(r=>process.stdin.once('data',r));process.stdin.pause();try{process.stdout.write(JSON.stringify({ok:true,value:reserveRecovery(process.argv[2])}))}catch(e){process.stdout.write(JSON.stringify({ok:false,code:e.code}))}`;
  const children = Array.from({ length: 8 }, () => child(script, [root]));
  t.after(() => { for (const item of children) if (item.process.exitCode === null && !item.process.killed) item.process.kill('SIGKILL'); });
  await Promise.all(children.map(item => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('worker readiness timeout')), 20000); let received = '';
    item.process.stdout.on('data', chunk => { received += chunk; if (received.includes('ready\n')) { clearTimeout(timeout); resolve(); } });
    item.process.on('error', error => { clearTimeout(timeout); reject(error); });
  })));
  for (const item of children) item.process.stdin.end('start\n');
  const results = await Promise.all(children.map(item => item.done));
  for (const result of results) assert.equal(result.code, 0, result.stderr);
  const parsed = results.map(result => JSON.parse(result.stdout.slice(result.stdout.indexOf('\n') + 1)));
  assert.equal(parsed.filter(item => item.ok).length, 1);
  assert.ok(parsed.filter(item => !item.ok).every(item => ['E_RECOVERY_PENDING', 'E_RECOVERY_BUSY'].includes(item.code)));
  assert.equal(inspectRecoveryJournal(root).status, 'pending');
  assert.equal(contents(root).length, 1);
});

test('encerrar o processo após claim deixa pendência reconhecível', { timeout: 30000 }, async t => {
  const root = fixture(t);
  const script = `const {reserveRecovery}=await import(process.argv[1]);process.stdout.write(JSON.stringify(reserveRecovery(process.argv[2]))+'\\n');setInterval(()=>{},1000)`;
  const item = child(script, [root]);
  t.after(() => { if (item.process.exitCode === null && !item.process.killed) item.process.kill('SIGKILL'); });
  const line = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('claim timeout')), 20000); let received = '';
    item.process.stdout.on('data', chunk => { received += chunk; if (received.includes('\n')) { clearTimeout(timeout); resolve(received.trim()); } });
    item.process.on('error', error => { clearTimeout(timeout); reject(error); });
  });
  const claim = JSON.parse(line); item.process.kill('SIGTERM');
  const result = await item.done; assert.equal(result.signal, 'SIGTERM');
  assert.deepEqual(inspectRecoveryJournal(root), { status: 'pending', generation: 1, id: claim.id, phase: 'claim' });
  assert.throws(() => reserveRecovery(root), code('E_RECOVERY_PENDING'));
});

test('interrupção entre link e fsync do diretório mantém claim visível', { timeout: 30000 }, async t => {
  const root = fixture(t);
  const script = `import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';const link=fs.linkSync;fs.linkSync=(a,b)=>{link(a,b);fs.writeSync(1,'linked\\n');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,30000)};syncBuiltinESMExports();const {reserveRecovery}=await import(process.argv[1]);reserveRecovery(process.argv[2]);`;
  const item = child(script, [root]);
  t.after(() => { if (item.process.exitCode === null && !item.process.killed) item.process.kill('SIGKILL'); });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('link timeout')), 20000); let received = '';
    item.process.stdout.on('data', chunk => { received += chunk; if (received.includes('linked\n')) { clearTimeout(timeout); resolve(); } });
    item.process.on('error', error => { clearTimeout(timeout); reject(error); });
  });
  assert.equal(inspectRecoveryJournal(root).status, 'pending');
  item.process.kill('SIGTERM');
  const result = await item.done; assert.equal(result.signal, 'SIGTERM');
  assert.equal(inspectRecoveryJournal(root).status, 'pending');
  assert.throws(() => reserveRecovery(root), code('E_RECOVERY_PENDING'));
});

// These checks cover observable ownership and mode, not ACLs or concurrent replacement.
for (const phase of ['empty', 'claim', 'begin']) for (const part of ['', 'records', 'staging']) {
  test(`UID divergente em ${part || 'raiz'} recusa ${phase} antes de escrever`, t => {
    const root = fixture(t);
    let id;
    if (phase !== 'empty') { id = reserveRecovery(root).id; if (phase === 'begin') beginRecovery(root, id, manifest); }
    const target = part ? join(root, part) : root, beforeRecords = contents(root);
    const beforeStaging = fs.readdirSync(join(root, 'staging')).sort().map(name => [name, fs.readFileSync(join(root, 'staging', name))]);
    const lstat = fs.lstatSync, open = fs.openSync; let writes = 0;
    t.mock.method(fs, 'lstatSync', (path, ...args) => {
      const item = lstat(path, ...args);
      if (path !== target) return item;
      return Object.assign(Object.create(Object.getPrototypeOf(item)), item, { uid: process.geteuid() + 1 });
    });
    t.mock.method(fs, 'openSync', (path, flags, ...args) => {
      if (typeof flags === 'string' ? /[wa+]/.test(flags) : Boolean(flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_APPEND))) { writes++; throw Error('escrita inesperada'); }
      return open(path, flags, ...args);
    });
    for (const name of ['writeFileSync', 'linkSync', 'fchmodSync', 'fsyncSync']) t.mock.method(fs, name, () => { writes++; throw Error('mutação inesperada'); });
    syncBuiltinESMExports();
    try {
      assert.deepEqual(inspectRecoveryJournal(root), { status: 'invalid', reason: 'invalid-store' });
      const action = phase === 'empty' ? () => reserveRecovery(root) : phase === 'claim' ? () => beginRecovery(root, id, manifest) : () => finishRecovery(root, id);
      assert.throws(action, code('E_RECOVERY_STORE'));
      assert.equal(writes, 0);
    } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
    assert.deepEqual(contents(root), beforeRecords);
    assert.deepEqual(fs.readdirSync(join(root, 'staging')).sort().map(name => [name, fs.readFileSync(join(root, 'staging', name))]), beforeStaging);
  });
}
for (const part of ['', 'records', 'staging']) for (const bit of [0o1000, 0o2000, 0o4000]) {
  test(`bit especial ${bit.toString(8)} em ${part || 'raiz'} recusa sem escrever`, t => {
    const root = fixture(t), target = part ? join(root, part) : root;
    const lstat = fs.lstatSync; let writes = 0;
    t.mock.method(fs, 'lstatSync', (path, ...args) => {
      const item = lstat(path, ...args);
      return path === target ? Object.assign(Object.create(Object.getPrototypeOf(item)), item, { mode: item.mode | bit }) : item;
    });
    for (const name of ['writeFileSync', 'linkSync', 'fchmodSync', 'fsyncSync']) t.mock.method(fs, name, () => { writes++; throw Error('mutação inesperada'); });
    syncBuiltinESMExports();
    try {
      assert.deepEqual(inspectRecoveryJournal(root), { status: 'invalid', reason: 'invalid-store' });
      assert.throws(() => reserveRecovery(root), code('E_RECOVERY_STORE'));
      assert.equal(writes, 0);
    } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
    assert.deepEqual(fs.readdirSync(join(root, 'records')), []);
    assert.deepEqual(fs.readdirSync(join(root, 'staging')), []);
  });
}
nodeTest('Linux root recusa UID real divergente nos três diretórios sem escrever', {
  skip: process.platform !== 'linux' || typeof process.geteuid !== 'function' || process.geteuid() !== 0,
}, t => {
  for (const part of ['', 'records', 'staging']) {
    const root = fixture(t), target = part ? join(root, part) : root;
    fs.chownSync(target, 12345, process.getegid());
    try {
      assert.equal(fs.lstatSync(target).uid, 12345);
      assert.deepEqual(inspectRecoveryJournal(root), { status: 'invalid', reason: 'invalid-store' });
      assert.throws(() => reserveRecovery(root), code('E_RECOVERY_STORE'));
      assert.deepEqual(fs.readdirSync(join(root, 'records')), []);
      assert.deepEqual(fs.readdirSync(join(root, 'staging')), []);
    } finally { fs.chownSync(target, process.geteuid(), process.getegid()); }
  }
});

for (const part of ['', 'records', 'staging']) test(`sticky real em ${part || 'raiz'} é recusado`, t => {
  const root = fixture(t), target = part ? join(root, part) : root;
  fs.chmodSync(target, 0o1700);
  assert.equal(fs.lstatSync(target).mode & 0o7777, 0o1700, 'fixture exige filesystem que suporte sticky bit');
  assert.deepEqual(inspectRecoveryJournal(root), { status: 'invalid', reason: 'invalid-store' });
  assert.throws(() => reserveRecovery(root), code('E_RECOVERY_STORE'));
  assert.deepEqual(fs.readdirSync(join(root, 'records')), []);
  assert.deepEqual(fs.readdirSync(join(root, 'staging')), []);
  fs.chmodSync(target, 0o700);
  assert.equal(inspectRecoveryJournal(root).status, 'ready');
});

for (const mode of ['ausente', 'exceção']) for (const phase of ['empty', 'claim', 'begin']) {
  test(`UID efetivo ${mode} recusa ${phase} sem escrever`, t => {
    const root = fixture(t); let id;
    if (phase !== 'empty') { id = reserveRecovery(root).id; if (phase === 'begin') beginRecovery(root, id, manifest); }
    const beforeRecords = contents(root);
    const beforeStaging = fs.readdirSync(join(root, 'staging')).sort().map(name => [name, fs.readFileSync(join(root, 'staging', name))]);
    const descriptor = Object.getOwnPropertyDescriptor(process, 'geteuid');
    assert.ok(descriptor?.configurable, 'o teste deve restaurar o descritor original');
    const open = fs.openSync; let writes = 0;
    t.mock.method(fs, 'openSync', (path, flags, ...args) => {
      if (typeof flags === 'string' ? /[wa+]/.test(flags) : Boolean(flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_APPEND))) { writes++; throw Error('escrita inesperada'); }
      return open(path, flags, ...args);
    });
    for (const name of ['writeFileSync', 'linkSync', 'fchmodSync', 'fsyncSync']) t.mock.method(fs, name, () => { writes++; throw Error('mutação inesperada'); });
    syncBuiltinESMExports();
    try {
      Object.defineProperty(process, 'geteuid', { ...descriptor, value: mode === 'ausente' ? undefined : () => { throw Object.assign(new Error('detalhe privado'), { code: 'EIO' }); } });
      const state = inspectRecoveryJournal(root);
      assert.deepEqual(state, { status: 'invalid', reason: mode === 'ausente' ? 'invalid-store' : 'unreadable' });
      const action = phase === 'empty' ? () => reserveRecovery(root) : phase === 'claim' ? () => beginRecovery(root, id, manifest) : () => finishRecovery(root, id);
      assert.throws(action, error => error.code === (mode === 'ausente' ? 'E_RECOVERY_STORE' : 'E_RECOVERY_IO') && !error.message.includes('privado'));
      assert.equal(writes, 0);
    } finally {
      Object.defineProperty(process, 'geteuid', descriptor);
      t.mock.restoreAll(); syncBuiltinESMExports();
    }
    assert.deepEqual(contents(root), beforeRecords);
    assert.deepEqual(fs.readdirSync(join(root, 'staging')).sort().map(name => [name, fs.readFileSync(join(root, 'staging', name))]), beforeStaging);
  });
}

test('registro legítimo pode ter dois links e avançar normalmente', t => {
  const root = fixture(t), claim = reserveRecovery(root);
  const record = join(root, 'records', '000000000001.claim.json');
  assert.equal(fs.statSync(record).mode & 0o7777, 0o400);
  assert.equal(fs.statSync(record).nlink, 2);
  beginRecovery(root, claim.id, manifest); finishRecovery(root, claim.id);
  assert.equal(inspectRecoveryJournal(root).status, 'ready');
});
for (const mode of [0o600, 0o444, 0o4400]) test(`registro com modo ${mode.toString(8)} é recusado sem escrita`, t => {
  const root = fixture(t), claim = reserveRecovery(root), record = join(root, 'records', '000000000001.claim.json');
  fs.chmodSync(record, mode);
  assert.equal(fs.statSync(record).mode & 0o7777, mode);
  const before = contents(root), staging = fs.readdirSync(join(root, 'staging')).sort(), open = fs.openSync; let writes = 0;
  t.mock.method(fs, 'openSync', (path, flags, ...args) => {
    if (typeof flags === 'string' ? /[wa+]/.test(flags) : Boolean(flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_APPEND))) { writes++; throw Error('escrita inesperada'); }
    return open(path, flags, ...args);
  });
  for (const name of ['writeFileSync', 'linkSync', 'fchmodSync', 'fsyncSync']) t.mock.method(fs, name, () => { writes++; throw Error('mutação inesperada'); });
  syncBuiltinESMExports();
  try {
    assert.deepEqual(inspectRecoveryJournal(root), { status: 'invalid', reason: 'invalid-store' });
    assert.throws(() => beginRecovery(root, claim.id, manifest), code('E_RECOVERY_STORE'));
    assert.equal(writes, 0);
  } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.deepEqual(contents(root), before); assert.deepEqual(fs.readdirSync(join(root, 'staging')).sort(), staging);
  assert.equal(fs.statSync(record).mode & 0o7777, mode);
});
test('registro com UID divergente simulado é recusado antes de abrir ou escrever', t => {
  const root = fixture(t), claim = reserveRecovery(root), record = join(root, 'records', '000000000001.claim.json');
  const before = contents(root), staging = fs.readdirSync(join(root, 'staging')).sort(), lstat = fs.lstatSync, open = fs.openSync; let opens = 0;
  t.mock.method(fs, 'lstatSync', (path, ...args) => {
    const item = lstat(path, ...args);
    return path === record ? Object.assign(Object.create(Object.getPrototypeOf(item)), item, { uid: BigInt(process.geteuid() + 1) }) : item;
  });
  t.mock.method(fs, 'openSync', (path, ...args) => { if (path === record || String(path).startsWith(join(root, 'staging'))) { opens++; throw Error('abertura inesperada'); } return open(path, ...args); });
  syncBuiltinESMExports();
  try {
    assert.deepEqual(inspectRecoveryJournal(root), { status: 'invalid', reason: 'invalid-store' });
    assert.throws(() => beginRecovery(root, claim.id, manifest), code('E_RECOVERY_STORE'));
    assert.equal(opens, 0);
  } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.deepEqual(contents(root), before); assert.deepEqual(fs.readdirSync(join(root, 'staging')).sort(), staging);
});
for (const stage of ['opened', 'after', 'named']) for (const field of ['uid', 'mode', 'nlink', 'size', 'mtimeNs', 'ctimeNs']) {
  test(`alteração de ${field} ${stage} ao ler registro é recusada`, t => {
    const root = fixture(t), claim = reserveRecovery(root), record = join(root, 'records', '000000000001.claim.json');
    const before = contents(root), staging = fs.readdirSync(join(root, 'staging')).sort(), lstat = fs.lstatSync, fstat = fs.fstatSync, open = fs.openSync;
    let lstatRecord = 0, fstats = 0, writes = 0;
    const changed = item => Object.assign(Object.create(Object.getPrototypeOf(item)), item, { [field]: field === 'mode' ? item.mode ^ 0o200n : item[field] + 1n });
    t.mock.method(fs, 'lstatSync', (path, ...args) => { const item = lstat(path, ...args); return path === record && ++lstatRecord === 2 && stage === 'named' ? changed(item) : item; });
    t.mock.method(fs, 'fstatSync', (fd, ...args) => { const item = fstat(fd, ...args); return ++fstats === (stage === 'opened' ? 1 : 2) && stage !== 'named' ? changed(item) : item; });
    t.mock.method(fs, 'openSync', (path, flags, ...args) => { if (typeof flags === 'string' && /[wa+]/.test(flags)) { writes++; throw Error('escrita inesperada'); } return open(path, flags, ...args); });
    for (const name of ['writeFileSync', 'linkSync', 'fchmodSync', 'fsyncSync']) t.mock.method(fs, name, () => { writes++; throw Error('mutação inesperada'); });
    syncBuiltinESMExports();
    try {
      assert.deepEqual(inspectRecoveryJournal(root), { status: 'invalid', reason: 'invalid-store' });
      lstatRecord = 0; fstats = 0;
      assert.throws(() => beginRecovery(root, claim.id, manifest), code('E_RECOVERY_STORE'));
      assert.equal(writes, 0);
    } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
    assert.deepEqual(contents(root), before); assert.deepEqual(fs.readdirSync(join(root, 'staging')).sort(), staging);
  });
}
nodeTest('Linux root recusa registro de outro UID sem gravar', {
  skip: process.platform !== 'linux' || typeof process.geteuid !== 'function' || process.geteuid() !== 0,
}, t => {
  const root = fixture(t), claim = reserveRecovery(root), record = join(root, 'records', '000000000001.claim.json');
  fs.chownSync(record, 12345, process.getegid());
  try {
    assert.equal(fs.statSync(record).uid, 12345);
    const before = contents(root), staging = fs.readdirSync(join(root, 'staging')).sort();
    assert.deepEqual(inspectRecoveryJournal(root), { status: 'invalid', reason: 'invalid-store' });
    assert.throws(() => beginRecovery(root, claim.id, manifest), code('E_RECOVERY_STORE'));
    assert.deepEqual(contents(root), before); assert.deepEqual(fs.readdirSync(join(root, 'staging')).sort(), staging);
  } finally { fs.chownSync(record, process.geteuid(), process.getegid()); }
});

test('alteração real no mesmo inode após fstat final é detectada e preservada', t => {
  const root = fixture(t), record = join(root, 'records', '000000000001.claim.json');
  reserveRecovery(root);
  fs.chmodSync(record, 0o600);
  const fd = fs.openSync(record, 'r+');
  t.after(() => fs.closeSync(fd));
  fs.chmodSync(record, 0o400);
  const before = fs.lstatSync(record, { bigint: true }), original = fs.readFileSync(record), lstat = fs.lstatSync;
  let checks = 0, injected = false;
  t.mock.method(fs, 'lstatSync', (path, ...args) => {
    if (path === record && ++checks === 2) {
      injected = true;
      fs.writeSync(fd, Buffer.from('X'), 0, 1, 0);
      fs.futimesSync(fd, new Date(1577836800000), new Date(1577836800000));
    }
    return lstat(path, ...args);
  });
  syncBuiltinESMExports();
  let result;
  try { result = inspectRecoveryJournal(root); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  const after = fs.lstatSync(record, { bigint: true }), changed = fs.readFileSync(record);
  assert.ok(injected); assert.deepEqual(result, { status: 'invalid', reason: 'invalid-store' });
  assert.equal(after.dev, before.dev); assert.equal(after.ino, before.ino);
  assert.equal(after.mode & 0o7777n, 0o400n); assert.equal(changed.length, original.length);
  assert.notDeepEqual(changed, original); assert.equal(changed[0], 0x58);
  assert.equal(fs.readdirSync(join(root, 'staging')).length, 1);
  // These snapshots do not exclude races after the last comparison.
});
