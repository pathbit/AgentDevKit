import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectErrorDiagnostics,
  markDiagnosticsBoundary,
} from '../.pbai4devs/scripts/lib/error-reporting.mjs';

test("preserves its own diagnoses and legitimate causes without modifying objects", () => {
  const cause = Object.assign(new Error('synthetic'), {
    uncertainPaths: ['backup/a'],
    cleanupFailures: [{ path: 'backup/b', message: 'cleanup failed' }],
  });
  const outer = Object.assign(new AggregateError([cause], 'synthetic', { cause }), {
    operationMayBePartial: true,
    rollbackPreservedPaths: ['output'],
  });
  const got = collectErrorDiagnostics(outer);
  assert.deepEqual(new Set(got.preservedPaths), new Set(['backup/a', 'output']));
  assert.deepEqual(got.cleanupFailures, [{ path: 'backup/b', message: 'cleanup failed' }]);
  assert.equal(got.possiblePartial, true);
  assert.equal(got.truncated, false);
  assert.equal(outer.cause, cause);
});

test("does not execute own bug getters, arrays and cleaning inputs", () => {
  let calls = 0;
  const getter = () => { calls++; throw Error('synthetic'); };
  const arr = ['a', 'b'];
  Object.defineProperty(arr, '1', { get: getter });
  const cleanup = [{ get path() { return getter(); }, message: 'x' }];
  const error = { uncertainPaths: arr, cleanupFailures: cleanup };
  Object.defineProperty(error, 'cause', { get: getter });
  const diagnostics = collectErrorDiagnostics(error);
  assert.deepEqual(diagnostics.preservedPaths, ['a']);
  assert.equal(diagnostics.truncated, true);
  assert.equal(calls, 0);
});

test("does not execute direct, revoked, array or prototype proxies traps", () => {
  let traps = 0;
  const handler = {
    get() { traps++; throw Error(); },
    getPrototypeOf() { traps++; throw Error(); },
    getOwnPropertyDescriptor() { traps++; throw Error(); },
  };
  const revocable = Proxy.revocable([], handler);
  revocable.revoke();
  const error = new Error('synthetic');
  Object.setPrototypeOf(error, new Proxy(Error.prototype, handler));
  Object.defineProperty(error, 'uncertainPaths', { value: new Proxy(['x'], handler) });
  Object.defineProperty(error, 'errors', { value: [new Proxy({}, handler), revocable.proxy] });
  const diagnostics = collectErrorDiagnostics(error);
  assert.equal(diagnostics.truncated, true);
  assert.equal(traps, 0);
});

test("custom prototype truncation brand and does not take inherited data", () => {
  const prototype = { rollbackPreservedPaths: ['herdado'] };
  const error = Object.assign(Object.create(prototype), { uncertainPaths: ['próprio'] });
  const diagnostics = collectErrorDiagnostics(error);
  assert.deepEqual(diagnostics.preservedPaths, ['próprio']);
  assert.equal(diagnostics.truncated, true);
});

test('limita grafos e arrays, reconhece ciclos e respeita fronteira mapeada', () => {
  const error = {};
  error.cause = error;
  error.uncertainPaths = Array.from({ length: 4100 }, (_, index) => String(index));
  const diagnostics = collectErrorDiagnostics(error);
  assert.equal(diagnostics.preservedPaths.length, 4096);
  assert.equal(diagnostics.truncated, true);

  const hidden = { uncertainPaths: ['não atravessar'] };
  const boundary = markDiagnosticsBoundary({ cause: hidden, uncertainPaths: ['visível'] });
  assert.deepEqual(collectErrorDiagnostics(boundary).preservedPaths, ['visível']);
});

test("signals malformed or inaccessible diagnosis without inventing data", () => {
  const cases = [
    { uncertainPaths: 'invalid' },
    { rollbackPreservedPaths: [42] },
    { cleanupFailures: [{ path: 42, message: 'x' }] },
  ];
  for (const error of cases) {
    const diagnostics = collectErrorDiagnostics(error);
    assert.equal(diagnostics.truncated, true);
    assert.deepEqual(diagnostics.preservedPaths, []);
    assert.deepEqual(diagnostics.cleanupFailures, []);
  }
});

test("inherited diagnosis of altered standard prototype is uncertain without invoking getter", () => {
  let calls = 0;
  const previous = Object.getOwnPropertyDescriptor(Error.prototype, 'uncertainPaths');
  try {
    Object.defineProperty(Error.prototype, 'uncertainPaths', {
      configurable: true,
      get() { calls++; throw Error('synthetic'); },
    });
    const diagnostics = collectErrorDiagnostics(new Error('synthetic'));
    assert.equal(diagnostics.truncated, true);
    assert.deepEqual(diagnostics.preservedPaths, []);
    assert.equal(calls, 0);
  } finally {
    if (previous) Object.defineProperty(Error.prototype, 'uncertainPaths', previous);
    else delete Error.prototype.uncertainPaths;
  }
});

test("maintains compatibility for regular data, duplicates and aggregated error", () => {
  const secondary = Object.assign(new Error('synthetic secondary'), {
    rollbackPreservedPaths: ['same', 'second'],
    cleanupFailures: [{ path: 'cleanup', message: 'reason' }],
  });
  const primary = Object.assign(new Error('synthetic primary'), {
    uncertainPaths: ['same', 'first'],
    cleanupFailures: [{ path: 'cleanup', message: 'reason' }],
    operationMayBePartial: true,
  });
  const aggregate = new AggregateError([primary, secondary], 'synthetic aggregate', { cause: primary });
  const diagnostics = collectErrorDiagnostics(aggregate);
  assert.deepEqual(new Set(diagnostics.preservedPaths), new Set(['same', 'first', 'second']));
  assert.deepEqual(diagnostics.cleanupFailures, [{ path: 'cleanup', message: 'reason' }]);
  assert.equal(diagnostics.possiblePartial, true);
  assert.equal(diagnostics.truncated, false);
});

test("limit is shared between lists and signals omission of later data", () => {
  const full = Array.from({ length: 4096 }, (_, index) => `item-${index}`);
  const exact = collectErrorDiagnostics({ rollbackPreservedPaths: full });
  assert.equal(exact.preservedPaths.length, 4096);
  assert.equal(exact.truncated, false);

  const over = collectErrorDiagnostics({
    rollbackPreservedPaths: full,
    uncertainPaths: ['depois'],
    cause: { uncertainPaths: ['causa'] },
  });
  assert.equal(over.preservedPaths.length, 4096);
  assert.equal(over.truncated, true);
  assert(!over.preservedPaths.includes('depois'));
  assert(!over.preservedPaths.includes('causa'));
});
