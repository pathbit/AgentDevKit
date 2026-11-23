import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import smol from '../.pbai4devs/scripts/lib/smol-toml.cjs';
import { extractTomlManagedBlock, stripTomlContent, tomlManagedBlockDigest } from '../.pbai4devs/scripts/lib/managed-toml.mjs';
import { mergeTomlContent } from './fixtures/legacy-toml-writer.mjs';

const body = '@{.pbai4devs/commands/revisar-entrega/COMMAND.md}';
// Parser distribuido com o kit: valida semantica, sem alegar independencia.
const promptValue = text => smol.parse(text, { integersAsBigInt: true }).prompt;
const sha = value => createHash('sha256').update(value).digest('hex');
function withoutMetadata(text) {
  const matches = [...text.matchAll(/^# ADK-TOML-META-V3 ([A-Za-z0-9_-]+)(\r?\n)/gm)];
  assert.equal(matches.length, 1, 'deve haver um comentario de proveniencia');
  const match = matches[0], metadata = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'));
  assert.equal(metadata.v, 3);
  assert.equal(metadata.lineEol, match[2]);
  const block = extractTomlManagedBlock(text);
  assert.ok(block);
  assert.equal(metadata.blockHash, sha(block));
  assert.equal(tomlManagedBlockDigest(text), sha(JSON.stringify(['agentdevkit-toml-composite-v1', block, match[0]])));
  return text.slice(0, match.index) + text.slice(match.index + match[0].length);
}

test('complementa string basica e preserva tudo fora do valor prompt', () => {
  const source = String.raw`# meu comando
description = "Minhas regras"
prompt  = "Leia \"isto\" e C:\\tmp\n{{args}}" # manter
[settings]
model = "local"
`;
  const result = mergeTomlContent(source, body);
  assert.ok(withoutMetadata(result.text).startsWith('# meu comando\ndescription = "Minhas regras"\nprompt  = '));
  assert.ok(result.text.endsWith(' # manter\n[settings]\nmodel = "local"\n'));
  assert.ok(promptValue(result.text).startsWith('Leia "isto" e C:\\tmp\n{{args}}'));
  assert.equal(extractTomlManagedBlock(result.text), result.block);
  assert.equal(tomlManagedBlockDigest(result.text), result.sha256);
  assert.equal(mergeTomlContent(result.text, body, { expectedHash: result.sha256 }).text, result.text);
  assert.equal(stripTomlContent(result.text, result.sha256), source);
});

test('suporta as quatro formas de string e newline inicial multiline', () => {
  const cases = [
    ['"linha\\nseguinte"', 'linha\nseguinte'],
    ["'C:\\minhas\\regras {{args}}'", 'C:\\minhas\\regras {{args}}'],
    ['"""\nPrimeira\n  segunda\n"""', 'Primeira\n  segunda\n'],
    ["'''\nMinhas \\regras\ncom 'aspas'\n'''", "Minhas \\regras\ncom 'aspas'\n"],
    ['""""citacao""""', '"citacao"'],
    ["''''citacao''''", "'citacao'"],
  ];
  for (const [encoded, expected] of cases) {
    const source = `prompt = ${encoded}\n`;
    const result = mergeTomlContent(source, body);
    withoutMetadata(result.text);
    assert.ok(promptValue(result.text).startsWith(expected), encoded);
    assert.equal(stripTomlContent(result.text, result.sha256), source, encoded);
  }
});

test('decodifica escapes Unicode escalares e continuacoes multiline', () => {
  const source = 'prompt = """\\\n   Ol\\u00E1 \\\n    mundo \\U0001F600 \\b\\t\\f\\r\\"\\\\\n"""\n';
  const result = mergeTomlContent(source, body);
  assert.ok(promptValue(result.text).startsWith('Olá mundo 😀 \b\t\f\r"\\\n'));
  withoutMetadata(result.text);
  assert.equal(mergeTomlContent(result.text, body, { expectedHash: result.sha256 }).changed, false);
  assert.equal(stripTomlContent(result.text, result.sha256), source);
});

test('preserva BOM, CRLF, chaves quoted e comentarios', () => {
  const prefix = '\ufeff# comando\r\ndescription = \'Minha descricao\'\r\n"prompt" = ';
  const suffix = ' # meu comentario\r\n[config]\r\nmodel = "local"\r\n';
  const source = prefix + "'''\r\nMinha linha\r\nOutra linha'''" + suffix;
  const result = mergeTomlContent(Buffer.from(source), body);
  assert.ok(withoutMetadata(result.text).startsWith(prefix));
  assert.ok(result.text.endsWith(suffix));
  assert.ok(promptValue(result.text).startsWith(promptValue(source)));
  assert.equal(tomlManagedBlockDigest(result.text), result.sha256);
  assert.equal(stripTomlContent(result.text, result.sha256), source);
});

test('insere prompt ausente antes de tabelas sem alterar prompt de tabela', () => {
  const source = '# meu comando\ndescription = "Descricao"\n[config]\nprompt = "Outro significado"\n';
  const result = mergeTomlContent(source, body);
  assert.ok(withoutMetadata(result.text).startsWith('# meu comando\ndescription = "Descricao"\nprompt = '));
  assert.ok(result.text.endsWith('[config]\nprompt = "Outro significado"\n'));
  assert.equal(extractTomlManagedBlock(source), null);
  assert.equal(mergeTomlContent(result.text, body, { expectedHash: result.sha256 }).changed, false);
  assert.equal(stripTomlContent(result.text, result.sha256), source);
});

test('ignora palavras prompt e headers dentro de outras strings e arrays', () => {
  const source = 'description = """\nprompt = \'fake\'\n[nao-e-tabela]\n"""\nnotes = ["x", { prompt = "interno" }, # comentario\n "y"]\nprompt = \'Minha instrucao\'\n';
  const result = mergeTomlContent(source, body);
  assert.ok(withoutMetadata(result.text).startsWith(source.slice(0, source.lastIndexOf('prompt ='))));
  assert.ok(promptValue(result.text).startsWith('Minha instrucao'));
  assert.equal(stripTomlContent(result.text, result.sha256), source);
});

test('edicoes humanas antes/depois e dentro do prompt ficam preservadas', () => {
  const first = mergeTomlContent('description = "Original"\nprompt = "Humano"\n', body);
  const edited = first.text.replace('Original', 'Atualizada').replace('Humano', 'Humano revisado') + '# nota final\n';
  const result = mergeTomlContent(edited, body + '\nNova referencia.', { expectedHash: first.sha256 });
  assert.ok(result.text.startsWith('description = "Atualizada"'));
  assert.ok(result.text.endsWith('# nota final\n'));
  assert.ok(promptValue(result.text).startsWith('Humano revisado'));
  withoutMetadata(result.text);
  assert.equal(stripTomlContent(result.text, result.sha256), 'description = "Atualizada"\nprompt = "Humano revisado"\n# nota final\n');
});

test('bloco adulterado, incompleto ou duplicado nao e substituido', () => {
  const first = mergeTomlContent('prompt = "Meu texto"\n', body);
  for (const edited of [
    first.text.replace('revisar-entrega', 'minha-edicao'),
    first.text.replace('<!-- END AGENTDEVKIT -->', 'fim'),
    'prompt = ' + JSON.stringify(promptValue(first.text) + '\n' + first.block) + '\n',
  ]) assert.throws(() => mergeTomlContent(edited, body, { expectedHash: first.sha256 }), { code: 'E_MANAGED_BLOCK' });
  assert.throws(() => stripTomlContent(first.text, '0'.repeat(64)), { code: 'E_MANAGED_BLOCK' });
});

test('recusa prompt duplicado, tabelas conflitantes e valores nao string', () => {
  for (const source of [
    'prompt = "a"\n"prompt" = "b"\n',
    'prompt.child = "a"\n',
    '[prompt]\ntext = "a"\n',
    'prompt = "a"\n[prompt.child]\ntext = "b"\n',
    'prompt = ["a"]\n',
    'prompt = true\n',
    'prompt = "a" invalid = "b"\n',
    'prompt = "unterminated\n',
  ]) assert.throws(() => mergeTomlContent(source, body), { code: 'E_MANAGED_BLOCK' }, source);
});

test('recusa Unicode e escapes invalidos, CR isolado e bytes invalidos', () => {
  for (const value of [
    'prompt = "\\uD800"\n', 'prompt = "\\U00110000"\n', 'prompt = "\\uZZZZ"\n',
    'prompt = "\\x41"\n', 'prompt = "\\/"\n', 'prompt = "\\e"\n',
    'prompt = "abc\rdef"\n', 'prompt = "\x7f"\n', 'prompt = "\ud800"\n',
    'prompt = """abc\\  def"""\n',
  ]) assert.throws(() => mergeTomlContent(value, body), { code: 'E_MANAGED_BLOCK' }, value);
  assert.throws(() => mergeTomlContent(Buffer.from([0xff]), body), { code: 'E_MANAGED_BLOCK' });
});

test('mantem controles escapados validos no TOML gerado', () => {
  const result = mergeTomlContent('prompt = "valor\\u007F"\n', body);
  assert.ok(result.text.includes('\\u007F'));
  assert.ok(!result.text.includes('\x7f'));
  assert.ok(promptValue(result.text).startsWith('valor\x7f'));
});
