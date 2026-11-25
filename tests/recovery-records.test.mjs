import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { inspectRecoveryRecords } from '../.pbai4devs/scripts/lib/recovery-records.mjs';

const id = '12345678-1234-4234-8234-123456789abc';
const other = '87654321-4321-4321-8321-cba987654321';
const hash = value => createHash('sha256').update(value).digest('hex');
const digest = 'a'.repeat(64);
const entry = (generation, kind, extra = {}, operation = id) => ({
  name: `${String(generation).padStart(12, '0')}.${kind}.json`,
  bytes: Buffer.from(JSON.stringify({ version: 1, generation, id: operation, kind, ...extra }) + '\n'),
});
const claim = (generation = 1, operation = id, previous = null) => entry(generation, 'claim', { previous }, operation);
const begin = (generation = 1, operation = id, previous = null) => entry(generation, 'begin', {
  claim: hash(claim(generation, operation, previous).bytes), manifest: digest,
}, operation);
const done = (b, generation = 1, operation = id) => entry(generation, 'done', { begin: hash(b.bytes) }, operation);
const resolved = (c, b = null, generation = 1, operation = id) => entry(generation, 'resolved', {
  claim: hash(c.bytes), begin: b ? hash(b.bytes) : null,
}, operation);

test("empty diary, operation initiated and completion produce distinct states", () => {
  const c = claim(), b = begin(), d = done(b);
  assert.deepEqual(inspectRecoveryRecords([]), { status: 'ready', generation: 0, head: null });
  assert.deepEqual(inspectRecoveryRecords([c]), { status: 'pending', generation: 1, id, phase: 'claim' });
  assert.deepEqual(inspectRecoveryRecords([b, c]), { status: 'pending', generation: 1, id, phase: 'begin' });
  assert.deepEqual(inspectRecoveryRecords([d, b, c]), { status: 'ready', generation: 1, terminal: 'done', resolvedCount: 0, head: hash(d.bytes) });
});

test("explicit resolution links the records and allows new generation", () => {
  const c1 = claim(), b1 = begin(), r1 = resolved(c1, b1);
  const c2 = claim(2, other, hash(r1.bytes)), r2 = resolved(c2, null, 2, other);
  assert.deepEqual(inspectRecoveryRecords([r2, c1, b1, c2, r1]), { status: 'ready', generation: 2, terminal: 'resolved', resolvedCount: 2, head: hash(r2.bytes) });
  const b2 = begin(2, other, hash(r1.bytes)), d2 = done(b2, 2, other);
  assert.deepEqual(inspectRecoveryRecords([c1, b1, r1, c2, b2, d2]), {
    status: 'ready', generation: 2, terminal: 'done', resolvedCount: 1, head: hash(d2.bytes),
  });
  const early = resolved(c1);
  assert.deepEqual(inspectRecoveryRecords([c1, early]), { status: 'ready', generation: 1, terminal: 'resolved', resolvedCount: 1, head: hash(early.bytes) });
  const d1 = done(b1), next = claim(2, other, hash(d1.bytes));
  assert.deepEqual(inspectRecoveryRecords([c1, b1, d1, next]), {
    status: 'pending', generation: 2, id: other, phase: 'claim',
  });
});

test("Bonds use SHA-256 of complete bytes, including line breaking", () => {
  const c = claim(), b = begin();
  const terminal = entry(1, 'resolved', {
    claim: '567a27c69017802c65da837e81601b69742f6529343142df71a8b8b1416e7a7a',
    begin: '7fbc55c1557f1785ec66d7ed7923be6e8b054153f234b6c0c36febe5b2bf72be',
  });
  assert.deepEqual(inspectRecoveryRecords([c, b, terminal]), {
    status: 'ready', generation: 1, terminal: 'resolved', resolvedCount: 1, head: hash(terminal.bytes),
  });
});

test("Inherited properties do not transform a pending operation to complete", () => {
  const c = claim(), b = begin(), moduleUrl = new URL('../.pbai4devs/scripts/lib/recovery-records.mjs', import.meta.url).href;
  const source = `import fs from 'node:fs'; import {createHash} from 'node:crypto';
const [c,b]=JSON.parse(fs.readFileSync(0,'utf8')).map(x=>({name:x.name,bytes:Buffer.from(x.base64,'base64')}));
const {inspectRecoveryRecords}=await import(process.argv[1]);
const begin=createHash('sha256').update(b.bytes).digest('hex');
Object.defineProperty(Object.prototype,'done',{value:{value:{id:${JSON.stringify(id)},begin},bytes:Buffer.from('falso')},configurable:true});
let result;try{result=inspectRecoveryRecords([c,b])}finally{delete Object.prototype.done}
process.stdout.write(JSON.stringify(result));`;
  const input = JSON.stringify([c, b].map(x => ({ name: x.name, base64: x.bytes.toString('base64') })));
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', source, moduleUrl], { input, encoding: 'utf8', timeout: 10000 });
  assert.ifError(child.error); assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), { status: 'pending', generation: 1, id, phase: 'begin' });
});

test("interprets only the indicated track without changing the input", () => {
  const c = claim(), padded = Buffer.concat([Buffer.from('antes'), c.bytes, Buffer.from('depois')]);
  const before = Buffer.from(padded), bytes = new Uint8Array(padded.buffer, padded.byteOffset + 5, c.bytes.length);
  const input = [{ name: c.name, bytes }];
  assert.deepEqual(inspectRecoveryRecords(input), { status: 'pending', generation: 1, id, phase: 'claim' });
  assert.deepEqual(padded, before);
  assert.equal(input.length, 1); assert.equal(input[0].name, c.name); assert.equal(input[0].bytes, bytes);
});

test("duplicate records, absent and incompatible transitions fail closed", () => {
  const c = claim(), b = begin(), d = done(b), r = resolved(c, b);
  for (const records of [[c, c], [b], [c, d], [c, b, d, r], [claim(2, other)],
    [c, claim(2, other)], [c, begin(1, other)], [c, b, done(b, 1, other)],
    [c, entry(1, 'begin', { claim: digest, manifest: digest })],
    [c, b, entry(1, 'done', { begin: digest })],
    [c, b, entry(1, 'resolved', { claim: hash(c.bytes), begin: null })],
    [c, b, d, claim(2, id, hash(d.bytes))],
    [c, b, d, claim(2, other)],
    [c, entry(1, 'resolved', { claim: digest, begin: null })]]) {
    assert.equal(inspectRecoveryRecords(records).status, 'invalid');
  }
});

test("rejects renaming, incorrect previous link and hole after full generation", () => {
  const c = claim(), b = begin(), d = done(b);
  for (const records of [
    [{ ...c, name: '000000000002.claim.json' }],
    [{ ...c, name: '000000000001.begin.json' }],
    [c, b, d, claim(2, other, hash(b.bytes))],
    [c, b, d, claim(3, other, hash(d.bytes))],
    [c, entry(1, 'resolved', { claim: hash(c.bytes), begin: hash(b.bytes) })],
  ]) assert.equal(inspectRecoveryRecords(records).status, 'invalid');
});

test("refuses non-canonical variations, invalid UUIDs and hashes", () => {
  const c = claim(), b = begin(), text = c.bytes.toString();
  const alternatives = [
    text.replace('"version":1,"generation":1', '"generation":1,"version":1'),
    text.replace('"version":1', '"version":1.0'),
    text.replace('"version":1', '"version":1e0'),
    text.replace(/\n$/, '\r\n'), `${text}\n`,
    text.replace(id, id.replace('4-4234', '4-1234')),
    text.replace(id, id.replace('8234-123456789abc', '7234-123456789abc')),
  ];
  for (const value of alternatives) assert.equal(inspectRecoveryRecords([{ ...c, bytes: Buffer.from(value) }]).status, 'invalid');
  for (const value of [digest.toUpperCase(), digest.slice(1), 42]) {
    assert.equal(inspectRecoveryRecords([c, entry(1, 'begin', { claim: value, manifest: digest })]).status, 'invalid');
    assert.equal(inspectRecoveryRecords([c, { ...b, bytes: Buffer.from(JSON.stringify({ version: 1, generation: 1, id, kind: 'begin', claim: hash(c.bytes), manifest: value }) + '\n') }]).status, 'invalid');
  }
});

test("refuses other forms of entry without accessing unexpected content", () => {
  const c = claim();
  class OtherArray extends Array {}
  for (const value of [null, 'texto', {}, new OtherArray(c), runInNewContext('[]'), [null], [{ name: 42, bytes: c.bytes }]]) {
    assert.equal(inspectRecoveryRecords(value).status, 'invalid');
  }
});

test("refuses non-canonical or unknown data without disclosing content", () => {
  const c = claim(), secret = 'SEGREDO_SINTETICO';
  const bad = [
    { ...c, name: '000000000001.CLAIM.json' },
    { ...c, name: `${c.name}\n` },
    { ...c, name: '../claim.json' },
    { ...c, name: '000000000000.claim.json' },
    { ...c, name: 'x'.repeat(65) },
    { ...c, bytes: Buffer.from(c.bytes.toString().replace('"version":1', '"version":1,"version":1')) },
    { ...c, bytes: Buffer.from(c.bytes.toString().replace('"kind":"claim"', `"kind":"claim","extra":"${secret}"`)) },
    { ...c, bytes: Buffer.from(c.bytes.toString().replace('"version":1', '"version":2')) },
    { ...c, bytes: Buffer.from(c.bytes.toString().replace(id, id.toUpperCase())) },
    { ...c, bytes: c.bytes.subarray(0, -1) },
    { ...c, bytes: Buffer.from([0xff, 0xfe]) },
    { ...c, bytes: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), c.bytes]) },
    { ...c, bytes: Buffer.from(c.bytes.toString().replace('{', '{ ')) },
  ];
  for (const record of bad) {
    const result = inspectRecoveryRecords([record]);
    assert.equal(result.status, 'invalid');
    assert.equal(JSON.stringify(result).includes(secret), false);
  }
});

test("limits are checked before interpretation and data are not changed", () => {
  const c = claim(), before = Buffer.from(c.bytes);
  assert.deepEqual(inspectRecoveryRecords(Array.from({ length: 4001 }, () => c)), { status: 'invalid', reason: 'limit-exceeded' });
  assert.deepEqual(inspectRecoveryRecords([{ ...c, bytes: Buffer.alloc(4097) }]), { status: 'invalid', reason: 'limit-exceeded' });
  assert.deepEqual(inspectRecoveryRecords(Array.from({ length: 3000 }, () => ({ ...c, bytes: Buffer.alloc(400) }))), { status: 'invalid', reason: 'limit-exceeded' });
  assert.deepEqual(inspectRecoveryRecords([{ ...c, bytes: Buffer.alloc(4096) }]), { status: 'invalid', reason: 'invalid-record' });
  assert.deepEqual(inspectRecoveryRecords(Array.from({ length: 256 }, () => ({ ...c, bytes: Buffer.alloc(4096) }))), { status: 'invalid', reason: 'invalid-record' });
  assert.deepEqual(inspectRecoveryRecords([...Array.from({ length: 256 }, () => ({ ...c, bytes: Buffer.alloc(4096) })), { ...c, bytes: Buffer.alloc(1) }]), { status: 'invalid', reason: 'limit-exceeded' });
  assert.deepEqual(inspectRecoveryRecords(Array.from({ length: 257 }, () => ({ ...c, bytes: Buffer.alloc(4096) }))), { status: 'invalid', reason: 'limit-exceeded' });
  assert.deepEqual(inspectRecoveryRecords(Array.from({ length: 4000 }, () => ({ ...c, bytes: Buffer.alloc(0) }))), { status: 'invalid', reason: 'invalid-record' });
  assert.deepEqual(inspectRecoveryRecords([{ ...c, bytes: 'texto' }]), { status: 'invalid', reason: 'invalid-input' });
  inspectRecoveryRecords([c]);
  assert.deepEqual(c.bytes, before);
});

test("iterators, getters and subclasses do not bypass limits", () => {
  const c = claim(), entries = [];
  entries[Symbol.iterator] = function* () { while (true) yield c; };
  assert.deepEqual(inspectRecoveryRecords(entries), { status: 'invalid', reason: 'invalid-input' });
  let names = 0, buffers = 0;
  const once = { get name() { names++; return names === 1 ? c.name : 'incorreto'; },
    get bytes() { buffers++; return buffers === 1 ? c.bytes : Buffer.alloc(5000); } };
  assert.deepEqual(inspectRecoveryRecords([once]), { status: 'invalid', reason: 'invalid-input' });
  assert.equal(names, 0); assert.equal(buffers, 0);
  class DeceptiveBytes extends Uint8Array { get byteLength() { return 1; } get length() { return 1; } }
  assert.deepEqual(inspectRecoveryRecords([{ name: c.name, bytes: new DeceptiveBytes(5000) }]),
    { status: 'invalid', reason: 'limit-exceeded' });
  const secret = 'SEGREDO_SINTETICO';
  const throws = { get name() { throw Error(secret); }, bytes: c.bytes };
  assert.deepEqual(inspectRecoveryRecords([throws]), { status: 'invalid', reason: 'invalid-input' });
  const lengthTrap = new Proxy([], { get(target, key) { return key === 'length' ? Infinity : target[key]; } });
  assert.deepEqual(inspectRecoveryRecords(lengthTrap), { status: 'invalid', reason: 'invalid-input' });
  const hidden = new Proxy([c], { get(target, key) { return key === 'length' ? 0 : target[key]; } });
  assert.deepEqual(inspectRecoveryRecords(hidden), { status: 'invalid', reason: 'invalid-input' });
  assert.deepEqual(inspectRecoveryRecords([new Proxy(c, {})]), { status: 'invalid', reason: 'invalid-input' });
  let proxyAccessed = false;
  const proxyBytes = new Proxy(c.bytes, { getPrototypeOf(target) { proxyAccessed = true; return Object.getPrototypeOf(target); } });
  assert.deepEqual(inspectRecoveryRecords([{ name: c.name, bytes: proxyBytes }]), { status: 'invalid', reason: 'invalid-input' });
  assert.equal(proxyAccessed, false);
  const hole = new Array(1);
  assert.deepEqual(inspectRecoveryRecords(hole), { status: 'invalid', reason: 'invalid-input' });
  const accessor = [];
  Object.defineProperty(accessor, '0', { get() { throw Error(secret); } });
  assert.deepEqual(inspectRecoveryRecords(accessor), { status: 'invalid', reason: 'invalid-input' });
  assert.deepEqual(inspectRecoveryRecords([Object.create(c)]), { status: 'invalid', reason: 'invalid-input' });
  for (const bytes of [new DataView(new ArrayBuffer(2)), new Uint16Array(2), new ArrayBuffer(2)]) {
    assert.deepEqual(inspectRecoveryRecords([{ name: c.name, bytes }]), { status: 'invalid', reason: 'invalid-input' });
  }
  const disguised = new Uint16Array(2);
  Object.setPrototypeOf(disguised, Uint8Array.prototype);
  assert.deepEqual(inspectRecoveryRecords([{ name: c.name, bytes: disguised }]), { status: 'invalid', reason: 'invalid-input' });
  let prototypeTrap = false;
  const ordinary = new Uint8Array(c.bytes); // Independent synthetic bytes.
  Object.setPrototypeOf(ordinary, new Proxy(Uint8Array.prototype, {
    getPrototypeOf(target) { prototypeTrap = true; return Reflect.getPrototypeOf(target); },
  }));
  assert.equal(inspectRecoveryRecords([{ name: c.name, bytes: ordinary }]).status, 'pending');
  assert.equal(prototypeTrap, false);
  const foreign = runInNewContext('Uint8Array.from(input)', { input: [...c.bytes] });
  assert.equal(inspectRecoveryRecords([{ name: c.name, bytes: foreign }]).status, 'pending');
  if (typeof SharedArrayBuffer !== 'undefined') {
    const bytes = new Uint8Array(new SharedArrayBuffer(c.bytes.length)); bytes.set(c.bytes);
    assert.deepEqual(inspectRecoveryRecords([{ name: c.name, bytes }]), { status: 'invalid', reason: 'invalid-input' });
    Object.setPrototypeOf(bytes.buffer, ArrayBuffer.prototype);
    assert.deepEqual(inspectRecoveryRecords([{ name: c.name, bytes }]), { status: 'invalid', reason: 'invalid-input' });
  }
});

test("each null byte truncation or insertion invalidates the record", () => {
  const c = claim();
  for (let offset = 0; offset <= c.bytes.length; offset++) {
    if (offset < c.bytes.length) assert.equal(inspectRecoveryRecords([{ ...c, bytes: c.bytes.subarray(0, offset) }]).status, 'invalid');
    const changed = Buffer.concat([c.bytes.subarray(0, offset), Buffer.from([0]), c.bytes.subarray(offset)]);
    assert.equal(inspectRecoveryRecords([{ ...c, bytes: changed }]).status, 'invalid');
  }
});

test("alter any digit of the binding hashes prevents the conclusion", () => {
  const c = claim(), b = begin(), d = done(b), r = resolved(c, b);
  for (const [record, field, preceding] of [[b, 'claim', [c]], [d, 'begin', [c, b]], [r, 'claim', [c, b]], [r, 'begin', [c, b]]]) {
    const value = JSON.parse(record.bytes), original = value[field];
    for (let index = 0; index < original.length; index++) {
      value[field] = original.slice(0, index) + (original[index] === '0' ? '1' : '0') + original.slice(index + 1);
      const modified = { ...record, bytes: Buffer.from(JSON.stringify(value) + '\n') };
      assert.equal(inspectRecoveryRecords([...preceding, modified]).status, 'invalid');
    }
  }
});

test("valid history of a thousand operations remains interpretable within the limits", () => {
  const entries = []; let previous = null;
  for (let generation = 1; generation <= 1000; generation++) {
    const operation = `12345678-1234-4234-8234-${generation.toString(16).padStart(12, '0')}`;
    const c = claim(generation, operation, previous), b = begin(generation, operation, previous), d = done(b, generation, operation);
    entries.push(c, b, d); previous = hash(d.bytes);
  }
  assert.deepEqual(inspectRecoveryRecords(entries.reverse()), { status: 'ready', generation: 1000, terminal: 'done', resolvedCount: 0, head: previous });
});

test("accepts exactly four thousand legitimate records and identifies the pending", () => {
  const entries = []; let previous = null;
  for (let generation = 1; generation <= 1333; generation++) {
    const operation = `12345678-1234-4234-8234-${generation.toString(16).padStart(12, '0')}`;
    const c = claim(generation, operation, previous), b = begin(generation, operation, previous), d = done(b, generation, operation);
    entries.push(c, b, d); previous = hash(d.bytes);
  }
  const operation = '12345678-1234-4234-8234-000000000536';
  entries.push(claim(1334, operation, previous));
  assert.equal(entries.length, 4000);
  assert.deepEqual(inspectRecoveryRecords(entries), { status: 'pending', generation: 1334, id: operation, phase: 'claim' });
});
