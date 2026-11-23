// Fast checks for the fixture reader used by the optional lifecycle matrix.
import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectFixture } from './gemini-toml-lifecycle-reader.mjs';
import { tomlManagedBlockDigest } from '../.pbai4devs/scripts/lib/managed-toml.mjs';
import { mergeTomlContent } from './fixtures/legacy-toml-writer.mjs';
import { mergeManagedContent } from '../.pbai4devs/scripts/lib/managed-content.mjs';

const reference = '@{.pbai4devs/commands/revisar-entrega/COMMAND.md}';
const humanPrompt = 'texto humano';
for (const [name, assignment] of [
  ['básica', '"texto humano"'],
  ['literal', "'texto humano'"],
  ['básica multilinha', '"""texto humano"""'],
  ['literal multilinha', "'''texto humano'''"],
]) for (const eol of ['\n', '\r\n']) for (const bom of ['', '\ufeff']) {
  test(`${name}/${eol === '\n' ? 'LF' : 'CRLF'}/${bom ? 'BOM' : 'sem BOM'}`, () => {
    const prefix = `${bom}description = "humano"${eol}`;
    const suffix = ` # nota${eol}[config]${eol}value = 1${eol}`;
    const original = `${prefix}prompt = ${assignment.replaceAll('\n', eol)}${suffix}`;
    const generated = mergeTomlContent(original, `${reference}\n\n{{args}}`);
    assert.deepEqual(inspectFixture(generated.text, { original, prefix, suffix, expectedHash: generated.sha256, humanPrompt, reference }), { margins: true, provenanceValid: true, promptValid: true, humanPrompt: true, references: 1, args: 1 });
  });
}

test('metadado inválido, ausente, repetido ou com digest errado é recusado', () => {
  const original = 'prompt = "texto humano"\n';
  const generated = mergeTomlContent(original, `${reference}\n\n{{args}}`);
  const options = { original, prefix: '', suffix: '\n', expectedHash: generated.sha256, humanPrompt, reference };
  const marker = generated.text.match(/^# ADK-TOML-META-V3 .*\n/m)[0];
  for (const text of [generated.text.replace(marker, ''), generated.text.replace(marker, marker.replace('V3 ', 'V3 %')), marker + generated.text]) {
    assert.equal(inspectFixture(text, options).provenanceValid, false);
    assert.equal(inspectFixture(text, options).margins, false);
  }
  for (const expectedHash of [undefined, '0'.repeat(64)]) {
    assert.equal(inspectFixture(generated.text, { ...options, expectedHash }).provenanceValid, false);
  }
});

test('conteúdo humano extra antes ou depois do prompt não é ignorado', () => {
  const original = 'description = "humano"\nprompt = "texto humano"\n';
  const generated = mergeTomlContent(original, `${reference}\n\n{{args}}`);
  const options = { original, prefix: 'description = "humano"\n', suffix: '\n', expectedHash: generated.sha256, humanPrompt, reference };
  for (const text of [`# linha extra\n${generated.text}`, `${generated.text}# linha extra\n`, generated.text.replace('description = "humano"', 'description = "alterado"'), generated.text.replace('texto humano', 'texto alterado'), generated.text.replace('texto humano', 'texto humano extra'), generated.text.replace('texto humano', 'texto\\u0020humano')]) {
    const result = inspectFixture(text, options);
    assert.equal(result.margins, false);
  }
});

test('valor ausente, inválido ou diferente é detectado', () => {
  const options = { original: '', prefix: '', suffix: '', expectedHash: undefined, humanPrompt, reference };
  for (const text of ['description = "sem prompt"\n', 'prompt = 3\n', 'prompt = "não fechado\n']) assert.equal(inspectFixture(text, options).promptValid, false);
  const result = inspectFixture(`prompt = "outro ${reference} ${reference}"\n`, options);
  assert.equal(result.humanPrompt, false);
  assert.equal(result.references, 2);
  assert.equal(result.args, 0);
  assert.equal(result.provenanceValid, false);
});

test('marcador V3 na primeira linha após BOM é reconhecido', () => {
  const prefix = '\ufeff', suffix = '\r\n';
  const original = `${prefix}prompt = "texto humano"${suffix}`;
  const generated = mergeTomlContent(original, `${reference}\n\n{{args}}`);
  const observed = inspectFixture(generated.text, { original, prefix, suffix, expectedHash: generated.sha256, humanPrompt, reference });
  assert.equal(observed.provenanceValid, true);
  assert.equal(observed.margins, true);
});

test('linha V3 dentro de string humana não comprova proveniência de bloco legado', () => {
  const prefix = 'description = """\n# ADK-TOML-META-V3 abc\n"""\n';
  const legacy = mergeManagedContent(humanPrompt, `${reference}\n\n{{args}}`);
  const text = `${prefix}prompt = ${JSON.stringify(legacy.text)}\n`;
  const expectedHash = tomlManagedBlockDigest(text);
  const observed = inspectFixture(text, { original: `${prefix}prompt = "texto humano"\n`, prefix, suffix: '\n', expectedHash, humanPrompt, reference });
  assert.equal(observed.provenanceValid, false);
  assert.equal(observed.margins, false);
});

test('linha semelhante dentro de string não interfere em comentário V3 real', () => {
  const prefix = 'description = """\n# ADK-TOML-META-V3 abc\n"""\n';
  const suffix = '\n';
  const original = `${prefix}prompt = "texto humano"${suffix}`;
  const generated = mergeTomlContent(original, `${reference}\n\n{{args}}`);
  const observed = inspectFixture(generated.text, { original, prefix, suffix, expectedHash: generated.sha256, humanPrompt, reference });
  assert.equal(observed.provenanceValid, true);
  assert.equal(observed.margins, true);
});

test('comentário ou atribuição extra depois do valor não é ignorado', () => {
  const prefix = '', suffix = '\n';
  const original = 'prompt = "texto humano"\n';
  const generated = mergeTomlContent(original, `${reference}\n\n{{args}}`);
  for (const extra of [' # extra', '\nother = 1']) {
    const edited = `${generated.text.slice(0, -1)}${extra}\n`;
    const observed = inspectFixture(edited, { original, prefix, suffix, expectedHash: generated.sha256, humanPrompt, reference });
    assert.equal(observed.margins, false);
  }
});

test('alteração indevida dos delimitadores não passa pela comparação de bytes', () => {
  const original = 'prompt = "texto humano"\n';
  const generated = mergeTomlContent(original, `${reference}\n\n{{args}}`);
  const changed = generated.text.replace('prompt = "', 'prompt = """').replace(/"\n$/, '"""\n');
  const result = inspectFixture(changed, { original, prefix: '', suffix: '\n', expectedHash: generated.sha256, humanPrompt, reference });
  assert.equal(result.provenanceValid, true);
  assert.equal(result.margins, false);
});

test('texto extra no corpo gerenciado não passa mesmo com digest correspondente', () => {
  const original = 'prompt = "texto humano"\n';
  const generated = mergeTomlContent(original, `${reference}\n\n{{args}}\nconteúdo extra`);
  const result = inspectFixture(generated.text, { original, prefix: '', suffix: '\n', expectedHash: generated.sha256, humanPrompt, reference });
  assert.equal(result.provenanceValid, true);
  assert.equal(result.margins, false);
});

test('fixture original ausente ou inconsistente não valida margens', () => {
  const original = 'prompt = "texto humano"\n';
  const generated = mergeTomlContent(original, `${reference}\n\n{{args}}`);
  for (const badOriginal of ['', 'descrição incorreta', undefined]) {
    const result = inspectFixture(generated.text, { original: badOriginal, prefix: '', suffix: '\n', expectedHash: generated.sha256, humanPrompt, reference });
    assert.equal(result.margins, false);
  }
  const thrown = inspectFixture(generated.text, { original: undefined, prefix: '', suffix: '\n', expectedHash: generated.sha256, humanPrompt, reference });
  assert.equal(thrown.provenanceValid, false);
});

test('prompt originalmente ausente exige bytes originais coerentes', () => {
  const prefix = '# humano\n', suffix = '\n[config]\nvalue = 1\n';
  const original = `${prefix}[config]\nvalue = 1\n`;
  const generated = mergeTomlContent(original, `${reference}\n\n{{args}}`);
  const options = { original, prefix, suffix, expectedHash: generated.sha256, humanPrompt: null, reference };
  assert.equal(inspectFixture(generated.text, options).margins, true);
  assert.equal(inspectFixture(generated.text, { ...options, original: `${original}# extra\n` }).margins, false);
});
