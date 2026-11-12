import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractManagedBlock, managedBlockDigest, mergeManagedContent, resolveEntrypoint, stripManagedContent } from '../.pbai4devs/scripts/lib/managed-content.mjs';

const reference = 'Leia e siga [origem](.pbai4devs/INSTRUCTIONS.md).';

test('acrescimo preserva BOM, frontmatter, CRLF e bytes humanos', () => {
  const human = '\ufeff---\r\nname: meu-agente\r\ntools: [Read]\r\n---\r\n\r\n# Meu agente\r\n\r\nMinha regra sem newline';
  const first = mergeManagedContent(Buffer.from(human), reference);
  assert.ok(first.text.startsWith(human));
  assert.ok(first.block.includes('\r\n'));
  assert.equal(first.text.replace(/\r\n/g, '').includes('\n'), false);
  assert.equal(mergeManagedContent(first.text, reference, { expectedHash: first.sha256 }).changed, false);
  const edited = first.text.replace('Minha regra', 'Minha nova regra') + '\r\nNota humana posterior.\r\n';
  const updated = mergeManagedContent(edited, reference + '\nOutra referencia.', { expectedHash: first.sha256 });
  assert.equal(stripManagedContent(updated.text, updated.sha256), stripManagedContent(edited, first.sha256));
  assert.ok(updated.text.includes('Minha nova regra'));
  assert.ok(updated.text.endsWith('Nota humana posterior.\r\n'));
  const draft = first.text + '\r\n```js\r\nRascunho humano';
  assert.ok(mergeManagedContent(draft, reference + '\nAtualizado.', { expectedHash: first.sha256 }).text.endsWith('```js\r\nRascunho humano'));
});

test('bloco humano alterado, duplicado ou incompleto nunca e sobrescrito', () => {
  const first = mergeManagedContent('# Projeto\n', reference);
  for (const value of [first.text.replace(reference, 'Minha alteracao.'), first.text + first.block, first.text.replace('<!-- END AGENTDEVKIT -->', '')]) {
    assert.throws(() => mergeManagedContent(value, reference, { expectedHash: first.sha256 }), { code: 'E_MANAGED_BLOCK' });
  }
  assert.throws(() => stripManagedContent(first.text, '0'.repeat(64)), { code: 'E_MANAGED_BLOCK' });
  assert.throws(() => mergeManagedContent(first.text, 'Outro conteudo.'), { code: 'E_MANAGED_BLOCK' });
});

test('exemplos entre fences nao sao tratados como propriedade do kit', () => {
  const human = '# Manual\n\n```md\n<!-- BEGIN AGENTDEVKIT -->\nExemplo humano.\n<!-- END AGENTDEVKIT -->\n```\n';
  assert.equal(extractManagedBlock(human), null);
  const result = mergeManagedContent(human, reference);
  assert.ok(result.text.startsWith(human));
  assert.equal(managedBlockDigest(result.text), result.sha256);
  assert.equal(extractManagedBlock(stripManagedContent(result.text, result.sha256)), null);
});

test('nao anexa a Markdown incompleto ou bytes invalidos', () => {
  assert.throws(() => mergeManagedContent('# Manual\n```md\n', reference), { code: 'E_MANAGED_BLOCK' });
  assert.throws(() => mergeManagedContent(Buffer.from([0xff, 0xfe]), reference));
  assert.throws(() => mergeManagedContent(Buffer.from('binary\0data'), reference), { code: 'E_MANAGED_BLOCK' });
});

test('resolucao reaproveita caixa existente e recusa nomes ambiguos', t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-managed-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'agents.md'), '# Minhas instrucoes\n');
  assert.equal(resolveEntrypoint(root, 'AGENTS.md'), 'agents.md');
  assert.equal(resolveEntrypoint(root, 'CLAUDE.md'), 'CLAUDE.md');
  // Some platforms cannot represent case-only siblings; a directory can still be resolved without being read.
  mkdirSync(join(root, 'gemini.md'));
  assert.equal(resolveEntrypoint(root, 'GEMINI.md'), 'gemini.md');
  assert.throws(() => resolveEntrypoint(root, 'OTHER.md'), { code: 'E_MANAGED_BLOCK' });
});
