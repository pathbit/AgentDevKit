import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import smol from '../.pbai4devs/scripts/lib/smol-toml.cjs';
import { promptMatchesCompleteReference } from '../.pbai4devs/scripts/lib/managed-toml.mjs';

const ref = '@{.pbai4devs/commands/demo/COMMAND.md}';
const complete = `${ref}\n\n{{args}}`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

for (const [name, source, expected] of [
  ['básica simples', `prompt = ${JSON.stringify(ref)}\n`, ref],
  ['literal simples', `prompt = '${ref}'\n`, ref],
  ['básica multilinha', `prompt = """${ref}"""\n`, ref],
  ['literal multilinha', `prompt = '''${ref}'''\n`, ref],
  ['básica com argumentos', `prompt = ${JSON.stringify(complete)}\n`, complete],
  ['básica multilinha com argumentos', `prompt = """${ref}\n\n{{args}}"""\n`, complete],
  ['literal multilinha com argumentos', `prompt = '''${ref}\n\n{{args}}'''\n`, complete],
]) test(`reconhece igualdade completa: ${name}`, () => {
  const bytes = Buffer.from(source), before = hash(bytes);
  assert.equal(promptMatchesCompleteReference(bytes, expected), true);
  assert.equal(hash(bytes), before);
});

test('preserva e reconhece BOM, CRLF externo, comentário e escapes equivalentes', () => {
  const escaped = '\\u0040\\u007b.pbai4devs/commands/demo/COMMAND.md\\u007d\\n\\n{{args}}';
  const text = `\ufeff# projeto\r\ndescription = "Humano"\r\n"prompt" = "${escaped}" # nota\r\n`;
  assert.equal(promptMatchesCompleteReference(text, complete), true);
});

test('aceita inteiros TOML válidos maiores que a precisão de Number sem alterar a entrada', () => {
  const bytes = Buffer.from(`positive = 9007199254740992\nnegative = -9007199254740993\nprompt = ${JSON.stringify(complete)}\n`);
  const before = hash(bytes);
  assert.equal(promptMatchesCompleteReference(bytes, complete), true);
  assert.equal(hash(bytes), before);
});

test('CRLF dentro da string é comparado exatamente, sem normalização silenciosa', () => {
  const text = `prompt = '''${ref}\r\n\r\n{{args}}'''\r\n`;
  assert.equal(promptMatchesCompleteReference(text, complete), false);
  assert.equal(promptMatchesCompleteReference(text, `${ref}\r\n\r\n{{args}}`), true);
});

test('literal simples não pode coincidir com referência que contém quebras de linha', () => {
  assert.equal(promptMatchesCompleteReference(`prompt = '${ref}'\n`, complete), false);
});

test('prompt diferente ou com bloco existente não é considerado equivalente', () => {
  const existing = `${ref}\n\n{{args}}\n\n<!-- BEGIN AGENTDEVKIT -->\nreferência\n<!-- END AGENTDEVKIT -->\n`;
  for (const value of [ref, `texto humano\n${complete}`, existing, `${complete}\nextra`]) {
    assert.equal(promptMatchesCompleteReference(`prompt = ${JSON.stringify(value)}\n`, complete), false);
  }
});

test('documento TOML inválido ou UTF-8 inválido interrompe o fluxo antes do merge', () => {
  const encoded = JSON.stringify(complete);
  for (const text of [
    `other = ???\nprompt = ${encoded}\n`,
    `other = 1\nother = 2\nprompt = ${encoded}\n`,
    `prompt = ${encoded}\nprompt = ${encoded}\n`,
    `prompt = "unterminated\n`,
    Buffer.from([0xff]),
  ]) assert.throws(() => promptMatchesCompleteReference(text, complete), { code: 'E_MANAGED_BLOCK' });
});

test('TOML válido com prompt ausente, não textual ou distinto permanece no fluxo anterior', () => {
  for (const source of ['description = "humano"\n', 'prompt = ["humano"]\n', 'prompt = 10\n', 'prompt = "outro"\n']) {
    assert.equal(promptMatchesCompleteReference(source, complete), false);
  }
});

test('discordância simulada dos parsers interrompe antes do merge', () => {
  const original = smol.parse;
  try {
    smol.parse = () => ({ prompt: 'valor divergente' });
    assert.throws(() => promptMatchesCompleteReference(`prompt = ${JSON.stringify(complete)}\n`, complete), { code: 'E_MANAGED_BLOCK' });
  } finally {
    smol.parse = original;
  }
});

test('bundle e licença mantêm bytes verificados na fixture', () => {
  const bundle = readFileSync(new URL('../.pbai4devs/scripts/lib/smol-toml.cjs', import.meta.url));
  const license = readFileSync(new URL('../.pbai4devs/scripts/lib/smol-toml.LICENSE', import.meta.url));
  assert.equal(hash(bundle), 'f9029370259e9a43a2f3e64fa1d39e72f3598188380ace83a0abb8261fa33555');
  assert.equal(hash(license), 'fa5659948374d4f555594f47f6da073b40dc503e921aeeece30df4362b3051a5');
  assert.match(license.toString('utf8'), /Redistribution and use in source and binary forms/);
});
