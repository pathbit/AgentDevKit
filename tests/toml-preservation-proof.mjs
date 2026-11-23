#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractTomlManagedBlock, stripTomlContent } from '../.pbai4devs/scripts/lib/managed-toml.mjs';
import { mergeTomlContent } from './fixtures/legacy-toml-writer.mjs';

// Synthetic, deterministic examples; this does not validate all TOML syntax.
const inputs = [
  ['basic', 'prompt = "Ol\\u0061\\nlinha"'],
  ['literal', "prompt = 'C:\\meu\\arquivo'"],
  ['basic-multiline', 'prompt = """\nPrimeira\nSegunda"""'],
  ['literal-multiline', "prompt = '''\nPrimeira\nSegunda'''"],
  ['missing', null],
];
const body = '@{.pbai4devs/commands/diagnosticar/COMMAND.md}';
const updatedBody = `${body}\nOrientação adicional.`;

export function verifyTomlRoundTrips() {
  const cases = [];
  for (const [kind, prompt] of inputs) for (const eol of ['\n', '\r\n']) {
    for (const bom of ['', '\ufeff']) for (const finalNewline of [false, true]) {
      const lines = ['# Conteúdo humano', 'description = "Comando humano"'];
      if (prompt !== null) lines.push(`${prompt.replaceAll('\n', eol)} # comentário humano`);
      lines.push('[config]', 'value = 1');
      const source = `${bom}${lines.join(eol)}${finalNewline ? eol : ''}`;
      const id = `${kind}/${eol === '\n' ? 'lf' : 'crlf'}/${bom ? 'bom' : 'no-bom'}/${finalNewline ? 'newline' : 'eof'}`;
      try {
        const merged = mergeTomlContent(Buffer.from(source), body);
        const blockPresent = typeof merged.block === 'string' && merged.block.includes(body)
          && extractTomlManagedBlock(merged.text) === merged.block;
        const repeated = mergeTomlContent(merged.text, body, { expectedHash: merged.sha256 });
        const idempotent = repeated.text === merged.text;
        const updated = mergeTomlContent(merged.text, updatedBody, { expectedHash: merged.sha256 });
        const updatePresent = typeof updated.block === 'string' && updated.block.includes(body)
          && updated.block.includes('Orientação adicional.') && extractTomlManagedBlock(updated.text) === updated.block;
        const restored = stripTomlContent(updated.text, updated.sha256);
        cases.push({ id, blockPresent, idempotent, updatePresent, bytesRestored: Buffer.from(restored).equals(Buffer.from(source)) });
      } catch (error) {
        cases.push({ id, blockPresent: false, idempotent: false, updatePresent: false, bytesRestored: false, error: error.code || error.name });
      }
    }
  }
  const passed = cases.filter(item => item.blockPresent && item.idempotent && item.updatePresent && item.bytesRestored).length;
  const matrixValid = cases.length === 40 && new Set(cases.map(item => item.id)).size === 40;
  return { total: cases.length, matrixValid, passed, failed: cases.length - passed, cases,
    limitation: 'Synthetic byte comparisons; intermediate semantics, an independent TOML parser and real clients require separate verification.' };
}

let entry = import.meta.main === true || Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!entry && process.argv[1]) {
  try { entry = realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url)); }
  catch (error) {
    if (basename(resolve(process.argv[1])) === 'toml-preservation-proof.mjs') {
      console.error(`Cannot verify test entry: ${error.code || error.name}`); process.exitCode = 1;
    }
  }
}
if (entry) {
  const report = verifyTomlRoundTrips();
  console.log(JSON.stringify(report, null, 2));
  if (!report.matrixValid || report.failed) process.exitCode = 1;
}
