// The fixture span check is independent; TOML semantics and digest use kit code.
import smol from '../.pbai4devs/scripts/lib/smol-toml.cjs';
import { tomlManagedBlockDigest } from '../.pbai4devs/scripts/lib/managed-toml.mjs';
import { extractManagedBlock } from '../.pbai4devs/scripts/lib/managed-content.mjs';

// Recognize one complete TOML string token in this controlled fixture. Nothing
// after the closing delimiter (including a comment or assignment) is ignored.
function singleStringToken(value) {
  const quote = value[0];
  if (quote !== '"' && quote !== "'") return false;
  const multiline = value.startsWith(quote.repeat(3));
  let index = multiline ? 3 : 1;
  while (index < value.length) {
    if (quote === '"' && value[index] === '\\') { index += 2; continue; }
    if (value[index] === quote) {
      if (!multiline) return index + 1 === value.length;
      let end = index; while (value[end] === quote) end++;
      if (end - index >= 3) return end - index <= 5 && end === value.length;
      index = end; continue;
    }
    if (!multiline && (value[index] === '\n' || value[index] === '\r')) return false;
    index++;
  }
  return false;
}

function rawInner(value) {
  const width = value.startsWith(value[0].repeat(3)) ? 3 : 1;
  return value.slice(width, -width);
}
function stringStyle(value) {
  const quote = value[0], multiline = value.startsWith(quote.repeat(3));
  return `${quote === '"' ? 'basic' : 'literal'}-${multiline ? 'multi' : 'one'}`;
}

export function inspectFixture(text, { original, prefix, suffix, expectedHash, humanPrompt, reference }) {
  // The exact prefix comes from the original fixture, so a matching line inside
  // an earlier multiline string cannot be mistaken for the metadata comment.
  const remainder = text.startsWith(prefix) ? text.slice(prefix.length) : '';
  const marker = /^# ADK-TOML-META-V3 ([A-Za-z0-9_-]+)(\r?\n)/.exec(remainder);
  let provenanceValid = false, margins = false;
  try {
    provenanceValid = Boolean(marker) && typeof expectedHash === 'string'
      && /^[a-f0-9]{64}$/.test(expectedHash) && tomlManagedBlockDigest(text) === expectedHash;
    if (provenanceValid) {
      const assignment = remainder.slice(marker[0].length);
      const start = 'prompt = ';
      const value = assignment.slice(start.length, assignment.length - suffix.length);
      margins = assignment.startsWith(start) && assignment.endsWith(suffix)
        && assignment.length >= start.length + suffix.length
        && singleStringToken(value);
      if (margins && humanPrompt !== null) {
        const originalAssignment = original.startsWith(prefix) && original.endsWith(suffix)
          ? original.slice(prefix.length, original.length - suffix.length) : '';
        const originalValue = originalAssignment.startsWith(start) ? originalAssignment.slice(start.length) : '';
        if (!singleStringToken(originalValue)) margins = false;
        else {
          const originalStyle = stringStyle(originalValue);
          const expectedStyle = originalStyle === 'literal-one' ? 'literal-multi' : originalStyle;
          margins = stringStyle(value) === expectedStyle && rawInner(value).startsWith(rawInner(originalValue));
        }
      } else if (margins) {
        const separator = /^(?:\r\n|\n)/.exec(suffix)?.[0];
        margins = stringStyle(value) === 'basic-one' && Boolean(separator)
          && original === prefix + suffix.slice(separator.length);
      }
    }
  } catch { provenanceValid = false; margins = false; }
  let prompt = null;
  try { prompt = smol.parse(text, { integersAsBigInt: true }).prompt; } catch { /* Invalid TOML fails observation. */ }
  const normalized = typeof prompt === 'string' ? prompt.replaceAll('\r\n', '\n') : '';
  if (margins) {
    let block = null;
    try { block = extractManagedBlock(normalized); } catch { /* Ambiguous blocks fail. */ }
    const expectedHuman = humanPrompt ?? '';
    const body = `${reference}${expectedHuman.includes('{{args}}') ? '' : '\n\n{{args}}'}`;
    const expectedBlock = `<!-- BEGIN AGENTDEVKIT -->\n${body}\n<!-- END AGENTDEVKIT -->`;
    margins = block === expectedBlock && normalized === `${expectedHuman}${expectedHuman ? '\n\n' : ''}${block}\n`;
  }
  const count = part => normalized.split(part).length - 1;
  return { margins, provenanceValid, promptValid: typeof prompt === 'string', humanPrompt: humanPrompt === null || normalized.startsWith(humanPrompt), references: count(reference), args: count('{{args}}') };
}
