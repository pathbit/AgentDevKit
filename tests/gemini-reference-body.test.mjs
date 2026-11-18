import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import smol from '../.pbai4devs/scripts/lib/smol-toml.cjs';
import { geminiReferenceBody, mergeTomlContent, stripTomlContent, tomlManagedBlockDigest } from '../.pbai4devs/scripts/lib/managed-toml.mjs';

const reference = '@{.pbai4devs/commands/demo/COMMAND.md}';
const complete = `${reference}\n\n{{args}}`;
const file = prompt => `description = "Fixture"\nprompt = ${JSON.stringify(prompt)}\n`;

test('inclui argumentos apenas quando o prompt humano não os fornece', () => {
  assert.equal(geminiReferenceBody(file('Instrução humana'), complete), complete);
  assert.equal(geminiReferenceBody(file('Instrução {{args}}'), complete), reference);
  assert.equal(geminiReferenceBody('description = "Fixture"\n', complete), complete);
  assert.equal(geminiReferenceBody('description = "{{args}}"\nprompt = "Humano" # {{args}}\n', complete), complete);
});

test('aceita inteiros grandes válidos ao examinar o prompt humano', () => {
  const bytes = Buffer.from('positive = 9007199254740992\nnegative = -9007199254740993\nprompt = "Humano {{args}}"\n');
  const before = Buffer.from(bytes);
  assert.equal(geminiReferenceBody(bytes, complete), reference);
  assert.deepEqual(bytes, before);
});

test('examina texto humano antes e depois de um bloco comprovado', () => {
  const initial = mergeTomlContent(file('Humano'), complete);
  const prompt = smol.parse(initial.text, { integersAsBigInt: true }).prompt;
  const encoded = JSON.stringify(prompt);
  assert.ok(initial.text.includes(encoded));
  const before = initial.text.replace(encoded, JSON.stringify(`{{args}}\n${prompt}`));
  const after = initial.text.replace(encoded, JSON.stringify(`${prompt}Texto humano {{args}}`));
  for (const candidate of [before, after]) {
    assert.match(candidate, /^# ADK-TOML-META-V3 /m);
    assert.equal(tomlManagedBlockDigest(candidate), initial.sha256);
    assert.equal(geminiReferenceBody(candidate, complete, initial.sha256), reference);
  }
  assert.equal(stripTomlContent(before, initial.sha256), file('{{args}}\nHumano'));
  assert.equal(stripTomlContent(after, initial.sha256), file('HumanoTexto humano {{args}}'));
  assert.equal(geminiReferenceBody(initial.text, complete, initial.sha256), complete);
});

test('recusa bloco sem propriedade e documentos inválidos sem alterar entrada', () => {
  const initial = mergeTomlContent(file('Humano'), complete);
  const snapshot = Buffer.from(initial.text);
  assert.throws(() => geminiReferenceBody(snapshot, complete), { code: 'E_MANAGED_BLOCK' });
  assert.throws(() => geminiReferenceBody(snapshot, complete, '0'.repeat(64)), { code: 'E_MANAGED_BLOCK' });
  assert.equal(snapshot.toString(), initial.text);
  assert.throws(() => geminiReferenceBody(file('Humano'), complete, initial.sha256), { code: 'E_MANAGED_BLOCK' });
  assert.throws(() => geminiReferenceBody('description = "Fixture"\n', complete, initial.sha256), { code: 'E_MANAGED_BLOCK' });
  assert.throws(() => geminiReferenceBody('other = ???\nprompt = "Humano"\n', complete), { code: 'E_MANAGED_BLOCK' });
});

test('recusa posição ambígua quando o mesmo bloco aparece em exemplo cercado', () => {
  const initial = mergeTomlContent(file('Humano'), complete);
  const example = `\`\`\`markdown\n${initial.block}\n\`\`\`\n\n${initial.block}\n`;
  const legacyHash = createHash('sha256').update(initial.block).digest('hex');
  assert.throws(() => geminiReferenceBody(file(example), complete, legacyHash), /Posicao do bloco AgentDevKit ambigua/);
});
