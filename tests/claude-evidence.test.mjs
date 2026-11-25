import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { assessClaudeEvidence } from './claude-evidence.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'claude-proof-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const project = join(root, 'project'), original = join(root, 'original'), packageRoot = join(root, 'package');
  const hash = value => createHash('sha256').update(value).digest('hex');
  const put = (base, path, value) => { const file = join(base, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value); };
  const manifest = ['alpha', 'beta'].map((name, i) => {
    const path = `.pbai4devs/skills/example/${name}/SKILL.md`, marker = `ADK_CLAUDE_0${i + 1}_ABCDEF123${i}`;
    const bytes = Buffer.from(`# ${name}\n`), changed = Buffer.concat([bytes, Buffer.from(`\nMarcador sintético de teste: ${marker}.\n`)]);
    put(original, path, bytes); put(packageRoot, path, bytes); put(project, path, changed);
    const wrapper = `---\nname: ${name}\n---\n\n# ${name}\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../${path}).\n`;
    put(original, `.claude/skills/${name}/SKILL.md`, wrapper); put(project, `.claude/skills/${name}/SKILL.md`, wrapper);
    return { name, path, marker, originalSha256: hash(bytes), alteredSha256: hash(changed) };
  });
  for (const file of ['README.md', '.gitignore']) { put(original, file, 'humano\n'); put(project, file, 'humano\n'); }
  const events = [{ type: 'system', subtype: 'init', skills: manifest.map(item => item.name), tools: ['Read', 'Skill'] }];
  const assistant = block => ({ type: 'assistant', message: { content: [block] } });
  const user = (block, extra = {}) => ({ type: 'user', message: { content: [block] }, ...extra });
  for (const [i, item] of manifest.entries()) {
    events.push(assistant({ type: 'tool_use', id: `s${i}`, name: 'Skill', input: { skill: item.name } }));
    events.push(user({ type: 'tool_result', tool_use_id: `s${i}`, content: `Launching skill: ${item.name}` }, { tool_use_result: { success: true, commandName: item.name } }));
    events.push(user({ type: 'text', text: `Base directory for this skill: ${join(project, '.claude/skills', item.name)}\n\n# ${item.name}\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../${item.path}).\n` }));
    events.push(assistant({ type: 'tool_use', id: `r${i}`, name: 'Read', input: { file_path: join(project, item.path) } }));
    events.push(user({ type: 'tool_result', tool_use_id: `r${i}`, content: item.marker }));
  }
  events.push({ type: 'result', is_error: false, result: JSON.stringify(Object.fromEntries(manifest.map(x => [x.name, x.marker]))) });
  return { project, fixture: original, packageRoot, manifest, events, prompt: 'Leia as skills.', process: { code: 0, signal: null, timedOut: false } };
}

test("Claude: proof requires coherent origin, call, reading and response", t => {
  const input = fixture(t); assert.equal(assessClaudeEvidence(input).verified, 2); assert.equal(assessClaudeEvidence(input).passed, true);
  assert.deepEqual(assessClaudeEvidence(input).rows[0].skillReturn, { contentType: 'text', expectedLaunch: true });
  const unexpectedReturn = structuredClone(input); unexpectedReturn.events[2].message.content[0].content = 'conteúdo privado de teste';
  const report = assessClaudeEvidence(unexpectedReturn);
  assert.deepEqual(report.rows[0].skillReturn, { contentType: 'text', expectedLaunch: false });
  assert.ok(!JSON.stringify(report).includes('conteúdo privado de teste'));
  const structuredReturn = structuredClone(input); structuredReturn.events[2].message.content[0].content = [{ type: 'text', text: 'privado' }];
  assert.deepEqual(assessClaudeEvidence(structuredReturn).rows[0].skillReturn, { contentType: 'array', expectedLaunch: null });
  const missingContent = structuredClone(input); delete missingContent.events[2].message.content[0].content;
  assert.deepEqual(assessClaudeEvidence(missingContent).rows[0].skillReturn, { contentType: 'absent', expectedLaunch: null });
  const repeatedResult = structuredClone(input); repeatedResult.events.splice(3, 0, structuredClone(repeatedResult.events[2]));
  assert.deepEqual(assessClaudeEvidence(repeatedResult).rows[0].skillReturn, { contentType: 'unavailable', expectedLaunch: null });
  assert.equal(assessClaudeEvidence(repeatedResult).passed, false);
  const swapped = structuredClone(input); swapped.events.at(-1).result = JSON.stringify({ alpha: input.manifest[1].marker, beta: input.manifest[0].marker }); assert.equal(assessClaudeEvidence(swapped).passed, false);
  const leaked = structuredClone(input); leaked.prompt += input.manifest[0].marker; assert.equal(assessClaudeEvidence(leaked).rows[0].checks.markerAbsentFromPrompt, false);
  const wrongPath = structuredClone(input); wrongPath.events[4].message.content[0].input.file_path = join(input.project, 'outro.md'); assert.equal(assessClaudeEvidence(wrongPath).passed, false);
  const wrongBase = structuredClone(input); wrongBase.events[3].message.content[0].text = 'Base directory for this skill: /outro'; assert.equal(assessClaudeEvidence(wrongBase).passed, false);
  const failedRead = structuredClone(input); failedRead.events[5].message.content[0].is_error = true; assert.equal(assessClaudeEvidence(failedRead).passed, false);
  const early = structuredClone(input); const [result] = early.events.splice(5, 1); early.events.splice(1, 0, result); assert.equal(assessClaudeEvidence(early).passed, false);
  const duplicate = structuredClone(input); duplicate.events.splice(2, 0, structuredClone(duplicate.events[1])); assert.equal(assessClaudeEvidence(duplicate).uniqueCalls, false);
  const repeatedFinal = structuredClone(input); repeatedFinal.events.push(structuredClone(repeatedFinal.events.at(-1))); assert.equal(assessClaudeEvidence(repeatedFinal).passed, false);
  const forbidden = structuredClone(input); forbidden.events.push({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'shell', name: 'Bash' }] } }); assert.deepEqual(assessClaudeEvidence(forbidden).unexpectedTools, ['Bash']);
  const failed = structuredClone(input); failed.process.code = 1; assert.equal(assessClaudeEvidence(failed).processPassed, false);
});

test("Claude: external reading is only accepted as a non-content attempt when it returns recognized error", t => {
  const input = fixture(t);
  const call = { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'outside', name: 'Read', input: { file_path: '/outside/file' } }] } };
  const answer = { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'outside', content: 'File does not exist.', is_error: true }] } };
  input.events.splice(1, 0, call, answer);
  assert.equal(assessClaudeEvidence(input).passed, true); assert.equal(assessClaudeEvidence(input).outsideAttempts, 1);
  const permission = structuredClone(input); permission.events[2].message.content[0].content = 'Error: EPERM'; assert.equal(assessClaudeEvidence(permission).passed, true);
  const success = structuredClone(input); success.events[2].message.content[0].is_error = false; assert.equal(assessClaudeEvidence(success).passed, false);
  const partial = structuredClone(input); partial.events[2].message.content[0].content += '\nconteúdo'; assert.equal(assessClaudeEvidence(partial).passed, false);
  const sameLine = structuredClone(input); sameLine.events[2].message.content[0].content += ' conteúdo'; assert.equal(assessClaudeEvidence(sameLine).passed, false);
  const permissionWithExtra = structuredClone(input); permissionWithExtra.events[2].message.content[0].content = 'Error: EPERM conteúdo'; assert.equal(assessClaudeEvidence(permissionWithExtra).passed, false);
  const missing = structuredClone(input); missing.events.splice(2, 1); assert.equal(assessClaudeEvidence(missing).passed, false);
});

test("Claude: adulterated files and human documents are detected", t => {
  const input = fixture(t);
  writeFileSync(join(input.project, input.manifest[0].path), 'adulterado'); assert.equal(assessClaudeEvidence(input).rows[0].checks.sourceUnchangedAfterSetup, false);
  writeFileSync(join(input.project, 'README.md'), 'substituído'); assert.equal(assessClaudeEvidence(input).documentsPreserved, false);
  writeFileSync(join(input.project, '.claude/skills/beta/SKILL.md'), 'errado'); assert.equal(assessClaudeEvidence(input).rows[1].checks.wrapperPointsToSource, false);
  writeFileSync(join(input.packageRoot, input.manifest[1].path), 'adulterado'); assert.equal(assessClaudeEvidence(input).rows[1].checks.originalMatchesPackage, false);
});
