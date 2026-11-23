import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/cli.mjs';
import { classifyRecoveryEffects } from '../.pbai4devs/scripts/lib/recovery-effects.mjs';

test('classifica comandos reais sem tratar ferramentas opacas como consulta', () => {
  const cases = [
    [[], 'mutation'],
    [['init'], 'mutation'],
    [['init', '--dry-run'], 'planning'],
    ...['agents', 'product', 'run', 'document'].map(purpose => [['init', '--purpose', purpose], 'mutation']),
    [['init', '--purpose', 'document', '--dry-run'], 'planning'],
    [['update'], 'mutation'],
    [['update', '--force', '--dry-run'], 'planning'],
    [['sync'], 'mutation'],
    [['sync', '--check'], 'planning'],
    [['sync', '--check', '--force'], 'planning'],
    [['lang'], 'query'],
    [['lang', 'pt'], 'mutation'],
    [['lang', '--lang', 'pt'], 'mutation'],
    [['lang', '--agents', 'codex'], 'mutation'],
    [['agents'], 'query'],
    [['agents', '--lang', 'pt'], 'query'],
    [['agents', 'codex'], 'mutation'],
    [['clients', 'codex', '--dry-run'], 'planning'],
    [['language', 'pt'], 'mutation'],
    [['doctor'], 'query'],
    [['next', '--intent', 'product'], 'query'],
    [['next', '--intent', 'document'], 'query'],
    [['document'], 'query'],
    [['document', '--json'], 'query'],
    [['document', '--markdown'], 'query'],
    [['--help'], 'query'],
    [['--version'], 'query'],
    [['tools', '--help'], 'opaque'],
    [['tools', 'check', 'agent-browser'], 'opaque'],
    [['tools', 'run', 'agent-browser', '--', '--check'], 'opaque'],
    [['--help', 'tools', 'run'], 'query'],
    [['recovery'], 'query'],
    [['recovery', '--json', '--lang', 'es'], 'query'],
    [['recovery', 'resolve', '1', 'b5357e75-2561-4c64-a534-e245f24a1fe0'], 'resolution'],
  ];
  for (const [args, expected] of cases) {
    assert.equal(classifyRecoveryEffects(parseArgs(args)), expected, args.join(' '));
  }
});

test('parser e classificador restringem o propósito e os formatos aos comandos correspondentes', () => {
  const invalid = [
    ['init', '--purpose'], ['init', '--purpose', 'other'],
    ['init', '--purpose', 'run', '--purpose', 'document'],
    ['update', '--purpose', 'document'], ['next', '--purpose', 'document'],
    ['document', '--purpose', 'document'], ['document', '--intent', 'document'],
    ['next', '--markdown'], ['document', '--dry-run'], ['document', '--check'],
    ['document', '--force'], ['document', '--yes'],
    ['document', '--markdown', '--json'], ['document', '--json', '--markdown'],
  ];
  for (const args of invalid) assert.throws(() => parseArgs(args), { code: 'E_ARGS' }, args.join(' '));
  const childArgs = ['--', '--purpose', 'document', '--markdown'];
  const toolOptions = parseArgs(['tools', 'run', 'agent-browser', ...childArgs]);
  assert.deepEqual(toolOptions.toolArgs, ['run', 'agent-browser', ...childArgs]);
  assert.equal(classifyRecoveryEffects(toolOptions), 'opaque');
  for (const options of [
    { ...parseArgs(['document', '--markdown']), json: true },
    { ...parseArgs(['document']), markdown: 'true' },
    { ...parseArgs(['document']), purpose: 'run' },
    { ...parseArgs(['document']), force: true },
    { ...parseArgs(['init']), purpose: 'other' },
    { ...parseArgs(['next', '--intent', 'document']), markdown: true },
  ]) assert.equal(classifyRecoveryEffects(options), 'unsupported', JSON.stringify(options));
});

test('opções desconhecidas, acessores e proxies não recebem classificação confiável', () => {
  const valid = () => parseArgs(['sync', '--check']);
  assert.equal(classifyRecoveryEffects({ ...valid(), command: 'comando-futuro' }), 'unsupported');
  assert.equal(classifyRecoveryEffects({ ...valid(), futuro: true }), 'unsupported');
  assert.equal(classifyRecoveryEffects({ ...valid(), target: 42 }), 'unsupported');
  assert.equal(classifyRecoveryEffects({ ...valid(), dryRun: 'true' }), 'unsupported');
  assert.equal(classifyRecoveryEffects({ ...valid(), command: 'doctor', check: true }), 'unsupported');
  assert.equal(classifyRecoveryEffects({ ...valid(), command: 'next', check: false, positionals: ['extra'] }), 'unsupported');
  assert.equal(classifyRecoveryEffects({ ...valid(), command: 'next', check: false, toolArgs: ['run'] }), 'unsupported');
  assert.equal(classifyRecoveryEffects({ ...valid(), command: 'agents', check: false, positionals: ['codex'] }), 'unsupported');
  const getter = valid(); let called = false;
  Object.defineProperty(getter, 'command', { get() { called = true; throw new Error('getter'); } });
  assert.equal(classifyRecoveryEffects(getter), 'unsupported');
  assert.equal(called, false);
  const revoked = Proxy.revocable([], {}); revoked.revoke();
  assert.equal(classifyRecoveryEffects({ ...valid(), positionals: revoked.proxy }), 'unsupported');
  assert.equal(classifyRecoveryEffects(new Proxy(valid(), {})), 'unsupported');
  const element = ['pt'];
  Object.defineProperty(element, 0, { get() { called = true; throw new Error('array getter'); } });
  assert.equal(classifyRecoveryEffects({ ...valid(), positionals: element }), 'unsupported');
  assert.equal(called, false);
});

test('não consulta propriedades opcionais herdadas ao classificar', () => {
  const options = parseArgs(['doctor']);
  const old = Object.getOwnPropertyDescriptor(Object.prototype, 'intent');
  let called = false;
  try {
    Object.defineProperty(Object.prototype, 'intent', {
      configurable: true,
      get() { called = true; throw new Error('inherited getter'); },
    });
    assert.equal(classifyRecoveryEffects(options), 'query');
    assert.equal(called, false);
  } finally {
    if (old) Object.defineProperty(Object.prototype, 'intent', old);
    else delete Object.prototype.intent;
  }
});

test('combinações aceitas pelo parser continuam classificáveis', () => {
  const commands = [[], ['init'], ['update'], ['sync'], ['lang'], ['lang', 'en'],
    ['agents'], ['agents', 'codex'], ['doctor'], ['next'], ['document'], ['tools', 'run', 'agent-browser'],
    ['help'], ['version'], ['clients'], ['language']];
  const flags = [['--json'], ['--yes'], ['--force'], ['--dry-run'], ['--check'],
    ['--help'], ['--version'], ['--lang', 'pt'], ['--agents', 'codex'], ['--markdown'], ['--purpose', 'document']];
  let accepted = 0;
  for (const command of commands) for (let mask = 0; mask < 2 ** flags.length; mask++) {
    const args = [...command];
    for (let bit = 0; bit < flags.length; bit++) if (mask & (1 << bit)) args.push(...flags[bit]);
    let options;
    try { options = parseArgs(args); } catch (error) { assert.equal(error.code, 'E_ARGS'); continue; }
    accepted++;
    assert.notEqual(classifyRecoveryEffects(options), 'unsupported', JSON.stringify(args));
  }
  assert.ok(accepted > 1000, `combinações aceitas: ${accepted}`);
});
