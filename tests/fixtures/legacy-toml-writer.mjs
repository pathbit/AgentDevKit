// Recreate the TOML output shipped by older releases for migration tests.
import { createHash } from 'node:crypto';
import { extractTomlManagedBlock, tomlManagedBlockDigest } from '../../.pbai4devs/scripts/lib/managed-toml.mjs';
import { locatePrompt } from '../../.pbai4devs/scripts/lib/managed-toml-parser.mjs';
import { extractManagedBlock, mergeManagedContent } from '../../.pbai4devs/scripts/lib/managed-content.mjs';
import { checked, rawFor, metadata, remove } from '../../.pbai4devs/scripts/lib/extended.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const tag = '# ADK-TOML-META-V3 ';
const encode = meta => Buffer.from(JSON.stringify(meta)).toString('base64url');

function add(input, body) {
  const initial = checked(input), original = initial.text;
  let p = initial, origin = 'existing', pre = '', stmtEol = '';
  if (!p.prompt) {
    origin = 'missing';
    const eol = original.match(/\r\n|\n/)?.[0] || '\n';
    stmtEol = eol;
    pre = p.insertion && !/[\r\n]$/.test(original.slice(0, p.insertion)) ? eol : '';
    const inserted = original.slice(0, p.insertion) + pre + 'prompt = ""' + eol + original.slice(p.insertion);
    p = checked(inserted);
  } else if (p.style === 'literal-one') {
    origin = 'literal-one';
    const raw = original.slice(p.prompt.start + 1, p.prompt.end - 1);
    const converted = original.slice(0, p.prompt.start) + "'''" + raw + "'''" + original.slice(p.prompt.end);
    p = checked(converted);
    if (p.prompt.value !== initial.prompt.value) fail('conversão literal alterou conteúdo');
  }
  if (extractManagedBlock(p.prompt.value)) fail('bloco existente não é adotado');
  const probe = mergeManagedContent(p.prompt.value, body, { eolMode: 'toml' });
  const offset = probe.text.indexOf(probe.block, p.prompt.value.length);
  if (offset < p.prompt.value.length || !probe.text.startsWith(p.prompt.value)) fail('inserção ambígua');
  const separator = probe.text.slice(p.prompt.value.length, offset), eol = probe.text.slice(offset + probe.block.length);
  const merged = probe;
  const lineEol = p.text.match(/\r\n|\n/)?.[0] || '\n';
  const meta = { v: 3, origin, style: p.style, separator, eol, pre, stmtEol, blockHash: merged.sha256, lineEol };
  const suffix = merged.text.slice(p.prompt.value.length);
  if (suffix !== separator + merged.block + eol) fail('estrutura de inserção divergente');
  const changed = p.text.slice(0, p.end) + rawFor(suffix, p.style) + p.text.slice(p.end);
  const nl = p.text.lastIndexOf('\n', p.prompt.start - 1);
  const lineStart = nl < 0 ? (p.text.startsWith('\ufeff') ? 1 : 0) : nl + 1;
  const output = changed.slice(0, lineStart) + tag + encode(meta) + lineEol + changed.slice(lineStart);
  if (checked(output).prompt.value !== merged.text || remove(output, merged.sha256) !== original) fail('round-trip não comprovado');
  return { text: output, blockHash: merged.sha256 };
}
function merge(input, body, expectedHash) {
  if (!expectedHash) return add(input, body);
  const p = checked(input), block = p.prompt && extractManagedBlock(p.prompt.value);
  if (!block || digest(block) !== expectedHash) fail('bloco sem procedência ou alterado');
  const info = metadata(p, expectedHash), { meta } = info;
  remove(input, expectedHash);
  const result = mergeManagedContent(p.prompt.value, body, { expectedHash, eolMode: 'toml' });
  const literalStart = p.prompt.start + (p.style === 'basic-one' ? 1 : 3), literal = p.text.slice(literalStart, p.end);
  const encoded = rawFor(block, p.style), offset = literal.indexOf(encoded);
  if (offset < 0 || literal.indexOf(encoded, offset + 1) >= 0) fail('forma bruta ambígua ou alterada');
  const start = literalStart + offset;
  const changed = p.text.slice(0, start) + rawFor(result.block, p.style) + p.text.slice(start + encoded.length);
  const nextMeta = { ...meta, blockHash: result.sha256 };
  const text = changed.slice(0, info.start) + tag + encode(nextMeta) + meta.lineEol + changed.slice(info.end);
  if (checked(text).prompt.value !== result.text) fail('valor resultante divergente');
  return { text, blockHash: result.sha256 };
}

const header = /^# ADK-TOML-META-V3 [A-Za-z0-9_-]+$/;
const marker = '# ADK-TOML-META-V3';
const fail = message => { throw Object.assign(new Error(message), { code: 'E_MANAGED_BLOCK' }); };
function translate(run) {
  try { return run(); }
  catch (error) {
    if (error?.code === 'E_PROTOTYPE_CONFLICT') throw Object.assign(new Error(error.message), { code: 'E_MANAGED_BLOCK', cause: error });
    throw error;
  }
}
function isExtended(parsed) {
  const found = parsed.comments.filter(comment => comment.text.startsWith(marker));
  if (found.length > 1 || found.some(comment => !header.test(comment.text))) {
    throw Object.assign(new Error('Metadados TOML ambíguos; preservados para revisão.'), { code: 'E_MANAGED_BLOCK' });
  }
  return found.length === 1;
}
function output(text, original) {
  const block = extractTomlManagedBlock(text);
  return { text, block, sha256: tomlManagedBlockDigest(text), changed: text !== original };
}
export function mergeTomlContent(input, body, { expectedHash } = {}) {
  return translate(() => {
    const parsed = locatePrompt(input), { text } = parsed, block = extractTomlManagedBlock(text), extended = isExtended(parsed);
    if (!block) {
      if (extended || expectedHash) throw Object.assign(new Error('Metadados ou registro TOML sem bloco; preservados para revisão.'), { code: 'E_MANAGED_BLOCK' });
      const result = merge(text, body); return output(result.text, text);
    }
    if (!expectedHash) throw Object.assign(new Error('Bloco existente sem propriedade comprovada.'), { code: 'E_MANAGED_BLOCK' });
    if (tomlManagedBlockDigest(text) !== expectedHash) throw Object.assign(new Error('Registro TOML divergente.'), { code: 'E_MANAGED_BLOCK' });
    if (!extended) fail('A fixture requer os metadados TOML V3.');
    const result = merge(text, body, digest(block));
    return output(result.text, text);
  });
}
