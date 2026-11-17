import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expectedNames, nativeGate } from '../scripts/release/native-macos-metadata.mjs';

const tap = () => expectedNames.map((name, index) => `ok ${index + 1} - ${name}`).join('\n')
  + '\n# tests 12\n# pass 12\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0';

test('gate isola variáveis e exige exatamente doze passes', () => {
  let args;
  const exec = (...value) => { args = value; return { status: 0, stdout: tap() }; };
  const env = { NODE_OPTIONS: '--test-name-pattern=nope', node_options: 'hostile', NODE_TEST_CONTEXT: 'child-v8', ADK_STRICT_RECOVERY_TEST: '0', OTHER: 'safe' };
  assert.deepEqual(nativeGate({ root: '/tmp', platform: 'darwin', env, exec }), { platform: 'darwin', passed: 12 });
  assert.equal(args[2].env.NODE_OPTIONS, undefined);
  assert.equal(args[2].env.node_options, undefined);
  assert.equal(args[2].env.NODE_TEST_CONTEXT, undefined);
  assert.equal(args[2].env.ADK_STRICT_RECOVERY_TEST, '1');
  assert.equal(args[2].env.OTHER, 'safe');
  assert.ok(args[1].some(value => value.startsWith('--test-name-pattern=')));
});

test('gate bloqueia skip, TODO, nome ausente, duplicado e processo falho', () => {
  const invalid = [
    tap().replace(expectedNames[0], `${expectedNames[0]} # SKIP`),
    tap().replace(expectedNames[0], `${expectedNames[0]} # TODO`),
    tap().replace(`ok 1 - ${expectedNames[0]}\n`, ''),
    `${tap()}\nok 13 - ${expectedNames[0]}`,
    `${tap()}\n    # Subtest: hidden\n    ok 1 - hidden # SKIP`,
    tap().replace('# skipped 0', '# skipped 1'),
    tap().replace('# tests 12', '# tests 13'),
    '',
  ];
  for (const output of invalid) {
    assert.throws(() => nativeGate({ platform: 'darwin', exec: () => ({ status: 0, stdout: output }) }), /incompleto/);
  }
  assert.throws(() => nativeGate({ platform: 'darwin', exec: () => ({ status: 1, stdout: tap() }) }), /falhou/);
  assert.throws(() => nativeGate({ platform: 'linux', exec: () => ({ status: 0, stdout: tap() }) }), /macOS/);
});

test('timeout e maxBuffer do subprocesso bloqueiam o gate', () => {
  for (const code of ['ETIMEDOUT', 'ENOBUFS']) {
    const error = Object.assign(new Error(code), { code });
    assert.throws(() => nativeGate({ platform: 'darwin', exec: () => ({ status: null, error, stdout: tap() }) }), /falhou/);
  }
});

test('Node real aceita 12 casos planos e recusa subteste skip e TODO', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-native-gate-control-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'tests'));
  const file = join(root, 'tests/concurrent-recovery.test.mjs');
  const make = nested => "import test from 'node:test';\n" + expectedNames.map((name, index) => (
    index === 0 && nested
      ? `test(${JSON.stringify(name)}, async t => { await t.test('omisso', {${nested}: 'prova'}, () => {}); });`
      : `test(${JSON.stringify(name)}, () => {});`
  )).join('\n') + '\n';

  writeFileSync(file, make(null));
  assert.deepEqual(nativeGate({ root, platform: 'darwin' }), { platform: 'darwin', passed: 12 });
  for (const nested of ['skip', 'todo']) {
    writeFileSync(file, make(nested));
    assert.throws(() => nativeGate({ root, platform: 'darwin' }), /subtestes não são aceitos/);
  }
});
