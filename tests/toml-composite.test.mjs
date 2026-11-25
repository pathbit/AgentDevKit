import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTomlContent, tomlManagedBlockDigest } from '../.pbai4devs/scripts/lib/managed-toml.mjs';
import { mergeTomlContent } from './fixtures/legacy-toml-writer.mjs';

const body = '@{.pbai4devs/commands/demo/COMMAND.md}\n\n{{args}}';
const source = 'description = "humano"\nprompt = "texto humano"\n';

test("compound digest allows creation, repetition, update and removal", () => {
  const first = mergeTomlContent(source, body);
  assert.equal(first.sha256, tomlManagedBlockDigest(first.text));
  const repeated = mergeTomlContent(first.text, body, { expectedHash: first.sha256 });
  assert.equal(repeated.text, first.text);
  assert.equal(repeated.sha256, first.sha256);
  const updated = mergeTomlContent(first.text, `${body} mais`, { expectedHash: first.sha256 });
  assert.notEqual(updated.sha256, first.sha256);
  assert.equal(stripTomlContent(updated.text, updated.sha256), source);
});

test("comment changed or missing record refuse change", () => {
  const first = mergeTomlContent(source, body);
  const edited = first.text.replace('# ADK-TOML-META-V3 ', '# ADK-TOML-META-V3 X');
  assert.throws(() => mergeTomlContent(edited, body, { expectedHash: first.sha256 }));
  assert.throws(() => stripTomlContent(first.text));
});

test("record without block and metadata JSON null are refused", () => {
  const first = mergeTomlContent(source, body);
  assert.throws(() => stripTomlContent(source, first.sha256), { code: 'E_MANAGED_BLOCK' });
  const marker = Buffer.from('null').toString('base64url');
  const invalid = first.text.replace(/^# ADK-TOML-META-V3 .*$/m, `# ADK-TOML-META-V3 ${marker}`);
  assert.throws(() => tomlManagedBlockDigest(invalid), { code: 'E_MANAGED_BLOCK' });
});

test('registro existente com bloco ausente impede novo merge', () => {
  const first = mergeTomlContent(source, body);
  assert.throws(() => mergeTomlContent(source, body, { expectedHash: first.sha256 }), { code: 'E_MANAGED_BLOCK' });
});

test("digest refuses document with invalid or duplicated human field", () => {
  const first = mergeTomlContent(source, body);
  for (const invalid of [`${first.text}outro = ???\n`, `${first.text}description = "duplicado"\n`]) {
    assert.throws(() => tomlManagedBlockDigest(invalid), { code: 'E_MANAGED_BLOCK' });
    assert.throws(() => mergeTomlContent(invalid, body, { expectedHash: first.sha256 }), { code: 'E_MANAGED_BLOCK' });
  }
});

test("large integers outside the prompt are preserved", () => {
  for (const value of ['9007199254740992', '9223372036854775807', '-9223372036854775808']) {
    const original = `${source}limite = ${value}\n`;
    const first = mergeTomlContent(original, body);
    assert.equal(tomlManagedBlockDigest(first.text), first.sha256);
    assert.equal(stripTomlContent(first.text, first.sha256), original);
  }
});
