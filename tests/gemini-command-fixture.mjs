// Independent oracle for this proof's two-line synthetic fixture only.
// It accepts TOML basic strings in the subset also represented by JSON strings.
const shape = /^description = ("(?:[^"\\\x00-\x1f\x7f]|\\(?:["\\bfnrt]|u[0-9a-fA-F]{4}))*")\nprompt = ("(?:[^"\\\x00-\x1f\x7f]|\\(?:["\\bfnrt]|u[0-9a-fA-F]{4}))*")([^\r\n]*)\n$/u;
const begin = '<!-- BEGIN AGENTDEVKIT -->';
const end = '<!-- END AGENTDEVKIT -->';
const reference = '@{.pbai4devs/commands/revisar-entrega/COMMAND.md}';
const count = (text, value) => text.split(value).length - 1;

export function inspectFixture(text, expectedHumanPrompt) {
  const match = shape.exec(text);
  if (!match) return { fixtureSyntaxValid: false, humanDescriptionPreserved: false, humanCommentPreserved: false, humanPromptPreserved: false, managedReferencePresent: false, argumentPlaceholderExactlyOnce: false, promptPlaceholderCount: null };
  let prompt;
  try { prompt = JSON.parse(match[2]); } catch { return { fixtureSyntaxValid: false, humanDescriptionPreserved: false, humanCommentPreserved: false, humanPromptPreserved: false, managedReferencePresent: false, argumentPlaceholderExactlyOnce: false, promptPlaceholderCount: null }; }
  const start = prompt.indexOf(begin), finish = prompt.indexOf(end);
  const blockValid = count(prompt, begin) === 1 && count(prompt, end) === 1 && finish > start;
  const block = blockValid ? prompt.slice(start, finish + end.length) : '';
  const humanPromptPreserved = blockValid
    ? prompt.slice(0, start) === `${expectedHumanPrompt}\n\n` && prompt.slice(finish + end.length) === '\n'
    : prompt === expectedHumanPrompt;
  const promptPlaceholderCount = count(prompt, '{{args}}');
  return {
    fixtureSyntaxValid: true,
    humanDescriptionPreserved: match[1] === '"Comando humano"',
    humanCommentPreserved: match[3] === ' # preservar comentário',
    humanPromptPreserved,
    managedReferencePresent: blockValid && count(block, reference) === 1,
    argumentPlaceholderExactlyOnce: promptPlaceholderCount === 1,
    promptPlaceholderCount,
  };
}
