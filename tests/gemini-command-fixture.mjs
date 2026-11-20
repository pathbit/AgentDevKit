import { createHash } from 'node:crypto';

// Independent oracle for the synthetic LF fixture with two basic strings.
const shape = /^description = (?<description>"(?:[^"\\\x00-\x1f\x7f]|\\(?:["\\bfnrt]|u(?![Dd][89a-fA-F])[0-9a-fA-F]{4}))*")\n(?:# ADK-TOML-META-V3 (?<metadata>[A-Za-z0-9_-]+)\n)?prompt = (?<prompt>"(?:[^"\\\x00-\x1f\x7f]|\\(?:["\\bfnrt]|u(?![Dd][89a-fA-F])[0-9a-fA-F]{4}))*")(?<comment>[^\r\n]*)\n$/u;
const begin = '<!-- BEGIN AGENTDEVKIT -->';
const end = '<!-- END AGENTDEVKIT -->';
const reference = '@{.pbai4devs/commands/revisar-entrega/COMMAND.md}';
const count = (text, value) => text.split(value).length - 1;
const invalid = {
  fixtureSyntaxValid: false, humanDescriptionPreserved: false, humanCommentPreserved: false,
  humanPromptPreserved: false, managedReferencePresent: false, metadataVerified: false,
  argumentPlaceholderExactlyOnce: false, promptPlaceholderCount: null,
};

function matchesFixtureMetadata(encoded, block) {
  if (!encoded || !block) return false;
  const blockHash = createHash('sha256').update(block).digest('hex');
  const expected = {
    v: 3, origin: 'existing', style: 'basic-one', separator: '\n\n',
    eol: '\n', pre: '', stmtEol: '', blockHash, lineEol: '\n',
  };
  return Buffer.from(JSON.stringify(expected), 'utf8').toString('base64url') === encoded;
}

export function inspectFixture(text, expectedHumanPrompt) {
  const match = shape.exec(text);
  if (!match) return { ...invalid };
  let prompt;
  try { prompt = JSON.parse(match.groups.prompt); } catch { return { ...invalid }; }
  const start = prompt.indexOf(begin), finish = prompt.indexOf(end);
  const blockValid = count(prompt, begin) === 1 && count(prompt, end) === 1 && finish > start;
  const block = blockValid ? prompt.slice(start, finish + end.length) : '';
  const metadataVerified = matchesFixtureMetadata(match.groups.metadata, block);
  if (match.groups.metadata && !metadataVerified) return { ...invalid };
  const humanPromptPreserved = blockValid
    ? prompt.slice(0, start) === `${expectedHumanPrompt}\n\n` && prompt.slice(finish + end.length) === '\n'
    : prompt === expectedHumanPrompt;
  const promptPlaceholderCount = count(prompt, '{{args}}');
  return {
    fixtureSyntaxValid: true,
    humanDescriptionPreserved: match.groups.description === '"Comando humano"',
    humanCommentPreserved: match.groups.comment === ' # preservar comentário',
    humanPromptPreserved,
    managedReferencePresent: blockValid && count(block, reference) === 1,
    metadataVerified,
    argumentPlaceholderExactlyOnce: promptPlaceholderCount === 1,
    promptPlaceholderCount,
  };
}
