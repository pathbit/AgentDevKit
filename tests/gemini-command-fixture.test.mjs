import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { inspectFixture } from './gemini-command-fixture.mjs';
import { expectedStagedRefusal, mustStop, requiredIntegrityChecks } from './gemini-command-flow-policy.mjs';

const begin = '<!-- BEGIN AGENTDEVKIT -->';
const end = '<!-- END AGENTDEVKIT -->';
const reference = '@{.pbai4devs/commands/revisar-entrega/COMMAND.md}';
const marker = 'Humano usa marcador';
const file = (prompt, description = '"Comando humano"', comment = ' # preservar comentário') =>
  `description = ${description}\nprompt = ${JSON.stringify(prompt)}${comment}\n`;
const prompt = (human, body) => `${human}\n\n${begin}\n${body}\n${end}\n`;
const goodChecks = Object.fromEntries(requiredIntegrityChecks.map(key => [key, true]));

test('reconhece argumento no prompt humano ou no bloco, com preservação completa da fixture', () => {
  for (const [human, body] of [[marker, `${reference}\n\n{{args}}`], [`${marker} {{args}}`, reference]]) {
    const found = inspectFixture(file(prompt(human, body)), human);
    assert.equal(found.fixtureSyntaxValid, true);
    assert.equal(found.humanPromptPreserved, true);
    assert.equal(found.humanDescriptionPreserved, true);
    assert.equal(found.humanCommentPreserved, true);
    assert.equal(found.managedReferencePresent, true);
    assert.equal(found.argumentPlaceholderExactlyOnce, true);
    assert.equal(found.promptPlaceholderCount, 1);
  }
});

test('argumento só em descrição ou comentário não satisfaz a contagem no prompt', () => {
  const content = prompt(marker, reference);
  for (const input of [file(content, '"Comando humano {{args}}"'), file(content, '"Comando humano"', ' # preservar comentário {{args}}')]) {
    const found = inspectFixture(input, marker);
    assert.equal(found.fixtureSyntaxValid, true);
    assert.equal(found.promptPlaceholderCount, 0);
    assert.equal(found.argumentPlaceholderExactlyOnce, false);
  }
});

test('valida comentário V3 na posição esperada e atrelado aos bytes do bloco', () => {
  const body = reference + '\n\n{{args}}';
  const blockHash = createHash('sha256').update(begin + '\n' + body + '\n' + end).digest('hex');
  const raw = file(prompt(marker, body));
  const encode = (fields = {}) => Buffer.from(JSON.stringify({
    v: 3, origin: 'existing', style: 'basic-one', separator: '\n\n',
    eol: '\n', pre: '', stmtEol: '', blockHash, lineEol: '\n', ...fields,
  })).toString('base64url');
  const line = '# ADK-TOML-META-V3 ' + encode() + '\n';
  const verified = raw.replace('\nprompt', '\n' + line + 'prompt');
  assert.equal(inspectFixture(verified, marker).metadataVerified, true);
  assert.equal(inspectFixture(verified, marker).managedReferencePresent, true);
  assert.equal(inspectFixture(verified, marker).argumentPlaceholderExactlyOnce, true);
  assert.equal(inspectFixture(raw, marker).metadataVerified, false);
  for (const invalid of [
    verified.replace(encode(), encode({ blockHash: '0'.repeat(64) })),
    verified.replace(encode(), encode({ separator: '\n' })),
    verified.replace(reference, reference + ' adulterada'),
    verified.replace(line, line + line),
    raw + line,
    file(marker).replace('\nprompt', '\n' + line + 'prompt'),
  ]) assert.equal(inspectFixture(invalid, marker).fixtureSyntaxValid, false);

  const invalidBody = body + '\ud800';
  const invalidHash = createHash('sha256').update(begin + '\n' + invalidBody + '\n' + end).digest('hex');
  const invalidUnicode = file(prompt(marker, invalidBody)).replace('\nprompt', '\n'
    + line.replace(encode(), encode({ blockHash: invalidHash })) + 'prompt');
  assert.equal(inspectFixture(invalidUnicode, marker).fixtureSyntaxValid, false);
});

test('conta valor decodificado, detecta duplicação e recusa mudança humana fora do bloco', () => {
  const content = file(prompt(marker, `${reference}\n\n{{args}}`));
  const escaped = content.replace('{{args}}', '\\u007b\\u007bargs\\u007d\\u007d');
  assert.equal(inspectFixture(escaped, marker).promptPlaceholderCount, 1);
  assert.equal(inspectFixture(file(prompt(`${marker} {{args}}`, `${reference}\n\n{{args}}`)), `${marker} {{args}}`).argumentPlaceholderExactlyOnce, false);
  assert.equal(inspectFixture(file(prompt(`${marker} editado`, `${reference}\n\n{{args}}`)), marker).humanPromptPreserved, false);
  assert.equal(inspectFixture(file(`${prompt(marker, `${reference}\n\n{{args}}`)}texto extra`), marker).humanPromptPreserved, false);
});

test('recusa referência ausente, bloco repetido e sintaxe fora do subconjunto da fixture', () => {
  const inputs = [file(prompt(marker, 'outra referência')), file(prompt(marker, reference) + prompt(marker, reference)), 'prompt = "sem fechamento\n', `${file(marker)}extra = 1\n`];
  for (const input of inputs) assert.equal(inspectFixture(input, marker).managedReferencePresent, false);
  const original = inspectFixture(file(marker), marker);
  assert.equal(original.humanPromptPreserved, true);
  assert.equal(original.managedReferencePresent, false);
});

test('classificação interrompe integridade e continua apenas argumento ou idempotência', () => {
  assert.equal(mustStop(goodChecks), false);
  for (const key of requiredIntegrityChecks) {
    assert.equal(mustStop({ ...goodChecks, [key]: false }), true, key);
    const missing = { ...goodChecks }; delete missing[key];
    assert.equal(mustStop(missing), true, key);
  }
  assert.equal(mustStop({ ...goodChecks, argumentPlaceholderExactlyOnce: false, repeatedSyncIdempotent: false }), false);
  assert.equal(mustStop({ ...goodChecks, unknownCheck: false }), true);
});

test('recusa staged é esperada somente com erro exato e preservação integral', () => {
  const digest = 'a'.repeat(64);
  const base = { gitState: 'staged-and-unstaged', phase: 'init', originalHash: digest,
    result: { status: 1, signal: null, error: null, json: { ok: false, command: 'init', errorCode: 'E_STAGED' } },
    stage: { fileSha256: digest, checks: goodChecks } };
  assert.equal(expectedStagedRefusal(base), true);
  for (const variant of [
    { gitState: 'staged' }, { phase: 'sync' }, { originalHash: null },
    { result: { ...base.result, status: 0 } }, { result: { ...base.result, status: 2 } },
    { result: { ...base.result, signal: 'SIGTERM' } },
    { result: { ...base.result, error: 'ETIMEDOUT' } },
    { result: { ...base.result, json: { ...base.result.json, errorCode: 'E_OTHER' } } },
    { result: { ...base.result, json: { ...base.result.json, ok: true } } },
    { stage: { ...base.stage, fileSha256: 'b'.repeat(64) } },
  ]) assert.equal(expectedStagedRefusal({ ...base, ...variant }), false);
  for (const key of ['indexPreserved', 'stagedDiffPreserved', 'gitHeadPreserved', 'gitRefsPreserved', 'packedRefsPreserved', 'gitConfigPreserved', 'gitExcludePreserved', 'gitignorePreserved', 'readmePreserved', 'humanFilePreserved', 'fixtureSyntaxValid', 'humanPromptPreserved', 'humanDescriptionPreserved', 'humanCommentPreserved']) {
    assert.equal(expectedStagedRefusal({ ...base, stage: { ...base.stage, checks: { ...goodChecks, [key]: false } } }), false, key);
  }
});
