import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTomlManagedBlock, mergeTomlContent, stripTomlContent, tomlManagedBlockDigest } from '../.pbai4devs/scripts/lib/managed-toml.mjs';

const body = '@{.pbai4devs/commands/revisar-entrega/COMMAND.md}';
const promptValue = text => JSON.parse(/^\s*(?:prompt|"prompt"|'prompt')\s*=\s*("(?:\\.|[^"\\])*")/m.exec(text)?.[1] || 'null');

test('complementa string basica e preserva tudo fora do valor prompt', () => {
  const source = String.raw`# meu comando
description = "Minhas regras"
prompt  = "Leia \"isto\" e C:\\tmp\n{{args}}" # manter
[settings]
model = "local"
`;
  const result = mergeTomlContent(source, body);
  assert.ok(result.text.startsWith('# meu comando\ndescription = "Minhas regras"\nprompt  = '));
  assert.ok(result.text.endsWith(' # manter\n[settings]\nmodel = "local"\n'));
  assert.ok(promptValue(result.text).startsWith('Leia "isto" e C:\\tmp\n{{args}}'));
  assert.equal(extractTomlManagedBlock(result.text), result.block);
  assert.equal(tomlManagedBlockDigest(result.text), result.sha256);
  assert.equal(mergeTomlContent(result.text, body, { expectedHash: result.sha256 }).text, result.text);
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
    const result = mergeTomlContent(`prompt = ${encoded}\n`, body);
    assert.ok(promptValue(result.text).startsWith(expected), encoded);
    assert.equal(promptValue(stripTomlContent(result.text, result.sha256)).trimEnd(), expected.trimEnd());
  }
});

test('decodifica escapes Unicode escalares e continuacoes multiline', () => {
  const source = 'prompt = """\\\n   Ol\\u00E1 \\\n    mundo \\U0001F600 \\b\\t\\f\\r\\"\\\\\n"""\n';
  const result = mergeTomlContent(source, body);
  assert.ok(promptValue(result.text).startsWith('Olá mundo 😀 \b\t\f\r"\\\n'));
  assert.equal(mergeTomlContent(result.text, body, { expectedHash: result.sha256 }).changed, false);
});

test('preserva BOM, CRLF, chaves quoted e comentarios', () => {
  const prefix = '\ufeff# comando\r\ndescription = \'Minha descricao\'\r\n"prompt" = ';
  const suffix = ' # meu comentario\r\n[config]\r\nmodel = "local"\r\n';
  const result = mergeTomlContent(Buffer.from(prefix + "'''\r\nMinha linha\r\nOutra linha'''" + suffix), body);
  assert.ok(result.text.startsWith(prefix));
  assert.ok(result.text.endsWith(suffix));
  assert.ok(promptValue(result.text).startsWith('Minha linha\r\nOutra linha'));
  assert.equal(tomlManagedBlockDigest(result.text), result.sha256);
});

test('insere prompt ausente antes de tabelas sem alterar prompt de tabela', () => {
  const source = '# meu comando\ndescription = "Descricao"\n[config]\nprompt = "Outro significado"\n';
  const result = mergeTomlContent(source, body);
  assert.ok(result.text.startsWith('# meu comando\ndescription = "Descricao"\nprompt = '));
  assert.ok(result.text.endsWith('[config]\nprompt = "Outro significado"\n'));
  assert.equal(extractTomlManagedBlock(source), null);
  assert.equal(mergeTomlContent(result.text, body, { expectedHash: result.sha256 }).changed, false);
});

test('ignora palavras prompt e headers dentro de outras strings e arrays', () => {
  const source = 'description = """\nprompt = \'fake\'\n[nao-e-tabela]\n"""\nnotes = ["x", { prompt = "interno" }, # comentario\n "y"]\nprompt = \'Minha instrucao\'\n';
  const result = mergeTomlContent(source, body);
  assert.ok(result.text.startsWith(source.slice(0, source.lastIndexOf('prompt ='))));
  assert.ok(promptValue(result.text).startsWith('Minha instrucao'));
});

test('edicoes humanas antes/depois e dentro do prompt ficam preservadas', () => {
  const first = mergeTomlContent('description = "Original"\nprompt = "Humano"\n', body);
  const edited = first.text.replace('Original', 'Atualizada').replace('Humano', 'Humano revisado') + '# nota final\n';
  const result = mergeTomlContent(edited, body + '\nNova referencia.', { expectedHash: first.sha256 });
  assert.ok(result.text.startsWith('description = "Atualizada"'));
  assert.ok(result.text.endsWith('# nota final\n'));
  assert.ok(promptValue(result.text).startsWith('Humano revisado'));
  assert.equal(promptValue(stripTomlContent(result.text, result.sha256)).trim(), 'Humano revisado');
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
