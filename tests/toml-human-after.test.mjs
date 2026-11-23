import test from 'node:test';
import assert from 'node:assert/strict';
// O parser é distribuído com o kit; não é uma verificação independente.
import toml from '../.pbai4devs/scripts/lib/smol-toml.cjs';
import { stripTomlContent } from '../.pbai4devs/scripts/lib/managed-toml.mjs';
import { mergeTomlContent } from './fixtures/legacy-toml-writer.mjs';

const body = '@{.pbai4devs/commands/demo/COMMAND.md}';
const formats = [
  ['básico', 'prompt = "humano"\n', '"'],
  ['literal', "prompt = 'humano'\n", "'"],
  ['básico multilinha', 'prompt = """humano"""\n', '"""'],
  ['literal multilinha', "prompt = '''humano'''\n", "'''"],
];

for (const [name, source, delimiter] of formats) {
  test(`preserva edição posterior: ${name}`, () => {
    const first = mergeTomlContent(source, body);
    const generatedDelimiter = name === 'literal' ? "'''" : delimiter;
    const closing = first.text.lastIndexOf(generatedDelimiter);
    const edited = `${first.text.slice(0, closing)}adicionado${first.text.slice(closing)}`;
    const updated = mergeTomlContent(edited, `${body}\nnova orientação`, { expectedHash: first.sha256 });
    const prompt = toml.parse(updated.text).prompt;
    assert.ok(prompt.indexOf('adicionado') > prompt.indexOf('<!-- END AGENTDEVKIT -->'));
    const originalClosing = source.lastIndexOf(delimiter);
    const expected = `${source.slice(0, originalClosing)}adicionado${source.slice(originalClosing)}`;
    assert.equal(stripTomlContent(updated.text, updated.sha256), expected);
  });
}

test('prompt criado e depois editado permanece ao remover bloco', () => {
  const first = mergeTomlContent('# humano\n', body);
  const closing = first.text.lastIndexOf('"');
  const edited = `${first.text.slice(0, closing)}conteúdo humano${first.text.slice(closing)}`;
  const expected = '# humano\nprompt = "conteúdo humano"\n';
  assert.equal(stripTomlContent(edited, first.sha256), expected);
  const updated = mergeTomlContent(edited, `${body}\nnova orientação`, { expectedHash: first.sha256 });
  assert.equal(stripTomlContent(updated.text, updated.sha256), expected);
});
