import test from 'node:test';
import assert from 'node:assert/strict';
import { stripTomlContent } from '../.pbai4devs/scripts/lib/managed-toml.mjs';
import { mergeTomlContent } from './fixtures/legacy-toml-writer.mjs';

const body = '@{.pbai4devs/commands/demo/COMMAND.md}';

test("string marker TOML multiline is neither comment nor metadata", () => {
  const source = 'description = """\n# ADK-TOML-META-V3 exemplo\n"""\nprompt = "humano"\n';
  const result = mergeTomlContent(source, body);
  assert.equal(stripTomlContent(result.text, result.sha256), source);
});

test("orphaned, duplicated and malformed markers are refused", () => {
  const source = 'prompt = "humano"\n';
  const generated = mergeTomlContent(source, body);
  const orphan = `# ADK-TOML-META-V3 inválido\n${source}`;
  const malformed = generated.text.replace('# ADK-TOML-META-V3 ', '# ADK-TOML-META-V3 %');
  const duplicated = `# ADK-TOML-META-V3 abc\n${generated.text}`;
  assert.throws(() => mergeTomlContent(orphan, body), { code: 'E_MANAGED_BLOCK' });
  for (const text of [malformed, duplicated]) {
    assert.throws(() => mergeTomlContent(text, body, { expectedHash: generated.sha256 }), { code: 'E_MANAGED_BLOCK' });
    assert.throws(() => stripTomlContent(text, generated.sha256), { code: 'E_MANAGED_BLOCK' });
  }
});
