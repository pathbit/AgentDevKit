import { extractTomlManagedBlock, locatePrompt } from './managed-toml-parser.mjs';
import { createHash } from 'node:crypto';
import { extractManagedBlock, managedText } from './managed-content.mjs';
import smol from './smol-toml.cjs';
import { merge as mergeExtended, remove as removeExtended } from './extended.mjs';
import { updateLegacy, removeLegacy } from './legacy021.mjs';

export { extractTomlManagedBlock };
const sha = value => createHash('sha256').update(value).digest('hex');
// A digest is an integrity comparison, not proof of identity or authorship.
export function tomlManagedBlockDigest(input) {
  const p = locatePrompt(input), block = extractTomlManagedBlock(input);
  let parsed;
  try { parsed = smol.parse(p.text, { integersAsBigInt: true }); } catch { fail('TOML invalido ou nao verificavel; arquivo preservado.'); }
  if (p.prompt ? parsed.prompt !== p.prompt.value : Object.hasOwn(parsed, 'prompt')) fail('Parsers TOML discordam; arquivo preservado.');
  const found = p.comments.filter(c => c.text.startsWith('# ADK-TOML-META-V3'));
  if (!found.length) return block ? sha(block) : null;
  if (found.length !== 1 || !block || !p.prompt) throw Object.assign(new Error('Metadados TOML não verificados.'), { code: 'E_MANAGED_BLOCK' });
  const c = found[0], match = /^# ADK-TOML-META-V3 ([A-Za-z0-9_-]+)$/.exec(c.text);
  if (!match) throw Object.assign(new Error('Metadados TOML não verificados.'), { code: 'E_MANAGED_BLOCK' });
  const promptLine = p.text.lastIndexOf('\n', p.prompt.start - 1) + 1, eol = p.text.slice(c.end, promptLine);
  let meta;
  try { meta = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8')); }
  catch { throw Object.assign(new Error('Metadados TOML não verificados.'), { code: 'E_MANAGED_BLOCK' }); }
  if (!meta || typeof meta !== 'object' || Array.isArray(meta) || !['\n','\r\n'].includes(eol) || meta.v !== 3 || meta.lineEol !== eol || meta.blockHash !== sha(block) || Buffer.from(JSON.stringify(meta)).toString('base64url') !== match[1]) throw Object.assign(new Error('Metadados TOML não verificados.'), { code: 'E_MANAGED_BLOCK' });
  return sha(JSON.stringify(['agentdevkit-toml-composite-v1', block, c.text + eol]));
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
      const result = mergeExtended(text, body); return output(result.text, text);
    }
    if (!expectedHash) throw Object.assign(new Error('Bloco existente sem propriedade comprovada.'), { code: 'E_MANAGED_BLOCK' });
    if (tomlManagedBlockDigest(text) !== expectedHash) throw Object.assign(new Error('Registro TOML divergente.'), { code: 'E_MANAGED_BLOCK' });
    const result = extended ? mergeExtended(text, body, sha(block)) : updateLegacy(text, body, expectedHash);
    return output(result.text, text, result.blockHash);
  });
}
export function stripTomlContent(input, expectedHash) {
  return translate(() => {
    const parsed = locatePrompt(input), { text } = parsed, block = extractTomlManagedBlock(text), extended = isExtended(parsed);
    if (!block) {
      if (extended) throw Object.assign(new Error('Metadados TOML sem bloco; preservados para revisão.'), { code: 'E_MANAGED_BLOCK' });
      if (expectedHash) throw Object.assign(new Error('Bloco ausente; arquivo preservado.'), { code: 'E_MANAGED_BLOCK' });
      return text;
    }
    if (!expectedHash) throw Object.assign(new Error('Bloco existente sem propriedade comprovada.'), { code: 'E_MANAGED_BLOCK' });
    if (tomlManagedBlockDigest(text) !== expectedHash) throw Object.assign(new Error('Registro TOML divergente.'), { code: 'E_MANAGED_BLOCK' });
    return extended ? removeExtended(text, sha(block)) : removeLegacy(text, expectedHash).text;
  });
}


// Equality permits preservation only; it never establishes ownership.
export function promptMatchesCompleteReference(input, expected) {
  let text, parsed, prompt;
  try {
    text = managedText(input);
    parsed = smol.parse(text, { integersAsBigInt: true });
    if (Object.hasOwn(parsed, 'prompt') && typeof parsed.prompt !== 'string') return false;
    ({ prompt } = locatePrompt(text));
  } catch { fail('TOML invalido ou nao verificavel; arquivo preservado.'); }
  if (prompt ? parsed.prompt !== prompt.value : Object.hasOwn(parsed, 'prompt')) {
    fail('Parsers TOML discordam; arquivo preservado.');
  }
  tomlManagedBlockDigest(text);
  if (!prompt || extractManagedBlock(prompt.value)) return false;
  return typeof expected === 'string' && prompt.value === expected;
}

// Keep arguments already supplied by the human prompt; only examine a block
// after its recorded digest has been verified.
export function geminiReferenceBody(input, body, expectedHash) {
  const suffix = '\n\n{{args}}';
  if (typeof body !== 'string' || !body.endsWith(suffix)) fail('Referencia Gemini invalida.');
  let text, parsed, prompt;
  try {
    text = managedText(input);
    parsed = smol.parse(text, { integersAsBigInt: true });
    ({ prompt } = locatePrompt(text));
  } catch { fail('TOML invalido ou nao verificavel; arquivo preservado.'); }
  if (prompt ? parsed.prompt !== prompt.value : Object.hasOwn(parsed, 'prompt')) {
    fail('Parsers TOML discordam; arquivo preservado.');
  }
  const actualDigest = tomlManagedBlockDigest(text);
  if (!prompt) {
    if (expectedHash) fail('Bloco AgentDevKit ausente; arquivo preservado.');
    return body;
  }
  const block = extractManagedBlock(prompt.value);
  if (!block) {
    if (expectedHash) fail('Bloco AgentDevKit ausente; arquivo preservado.');
    return prompt.value.includes('{{args}}') ? body.slice(0, -suffix.length) : body;
  }
  if (!expectedHash || actualDigest !== expectedHash) {
    fail('Bloco AgentDevKit alterado ou sem propriedade; arquivo preservado.');
  }
  const start = prompt.value.indexOf(block);
  if (start < 0 || start !== prompt.value.lastIndexOf(block)) {
    fail('Posicao do bloco AgentDevKit ambigua; arquivo preservado.');
  }
  const before = prompt.value.slice(0, start);
  const after = prompt.value.slice(start + block.length);
  return before.includes('{{args}}') || after.includes('{{args}}') ? body.slice(0, -suffix.length) : body;
}
