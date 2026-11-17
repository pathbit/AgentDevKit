import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { assessCopilotEvidence } from './copilot-evidence.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'copilot-proof-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const project = join(root, 'project'), original = join(root, 'original'), packageRoot = join(root, 'package');
  const hash = data => createHash('sha256').update(data).digest('hex');
  const put = (base, path, value) => { const file = join(base, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value); };
  const manifest = ['alpha', 'beta'].map((name, index) => {
    const path = `.pbai4devs/skills/example/${name}/SKILL.md`;
    const marker = `ADK_COPILOT_0${index + 1}_ABCDEF123${index}`;
    const bytes = Buffer.from(`# ${name}\n`);
    const changed = Buffer.concat([bytes, Buffer.from(`\nMarcador sintético de teste: ${marker}.\n`)]);
    put(original, path, bytes); put(packageRoot, path, bytes); put(project, path, changed);
    const wrapper = `---\nname: ${name}\n---\n\n# ${name}\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../${path}).\n`;
    put(original, `.github/skills/${name}/SKILL.md`, wrapper); put(project, `.github/skills/${name}/SKILL.md`, wrapper);
    return { name, path, marker, originalSha256: hash(bytes), alteredSha256: hash(changed) };
  });
  for (const name of ['README.md', '.gitignore']) { put(original, name, 'preservar\n'); put(project, name, 'preservar\n'); }
  const events = [{ type: 'session.skills_loaded', data: { skills: manifest.map(item => ({ name: item.name, source: 'project', enabled: true, path: join(project, '.github/skills', item.name, 'SKILL.md') })) } }];
  for (const [index, item] of manifest.entries()) {
    const skillId = `s${index}`, viewId = `v${index}`;
    events.push({ type: 'tool.execution_start', data: { toolCallId: skillId, toolName: 'skill', arguments: { skill: item.name } } });
    events.push({ type: 'tool.execution_complete', data: { toolCallId: skillId, success: true, toolTelemetry: { properties: { skillSource: 'project' } } } });
    events.push({ type: 'tool.execution_start', data: { toolCallId: viewId, toolName: 'view', arguments: { path: join(project, item.path) } } });
    events.push({ type: 'tool.execution_complete', data: { toolCallId: viewId, success: true, result: { content: item.marker } } });
  }
  events.push({ type: 'assistant.message', data: { phase: 'final_answer', content: JSON.stringify(Object.fromEntries(manifest.map(item => [item.name, item.marker]))) } });
  events.push({ type: 'result', exitCode: 0 });
  return { project, fixture: original, packageRoot, manifest, events, prompt: 'Leia cada skill.', process: { code: 0, signal: null, timedOut: false } };
}

test('auditoria exige invocação, leitura correta e marcadores por skill', t => {
  const input = fixture(t), result = assessCopilotEvidence(input);
  assert.equal(result.passed, true); assert.equal(result.verified, 2);
  const swapped = structuredClone(input);
  swapped.events.at(-2).data.content = JSON.stringify({ alpha: input.manifest[1].marker, beta: input.manifest[0].marker });
  assert.equal(assessCopilotEvidence(swapped).passed, false);
  const leaked = structuredClone(input); leaked.prompt += input.manifest[0].marker;
  assert.equal(assessCopilotEvidence(leaked).rows[0].checks.markerAbsentFromPrompt, false);
  const wrongPath = structuredClone(input); wrongPath.events[3].data.arguments.path = join(input.project, 'outro.md');
  assert.equal(assessCopilotEvidence(wrongPath).passed, false);
  const wrongDiscovery = structuredClone(input); wrongDiscovery.events[0].data.skills[0].path = join(input.project, 'outra', 'SKILL.md');
  assert.equal(assessCopilotEvidence(wrongDiscovery).rows[0].checks.discoveredExpectedWrapper, false);
  const duplicate = structuredClone(input); duplicate.events.splice(2, 0, structuredClone(duplicate.events[1]));
  assert.equal(assessCopilotEvidence(duplicate).passed, false);
  const earlyCompletion = structuredClone(input); const [completion] = earlyCompletion.events.splice(2, 1); earlyCompletion.events.unshift(completion);
  assert.equal(assessCopilotEvidence(earlyCompletion).rows[0].checks.executionOrder, false);
  const earlyFinal = structuredClone(input); const [final] = earlyFinal.events.splice(-2, 1); earlyFinal.events.unshift(final);
  assert.equal(assessCopilotEvidence(earlyFinal).passed, false);
  const duplicateFinal = structuredClone(input); duplicateFinal.events.unshift(structuredClone(duplicateFinal.events.at(-2)));
  assert.equal(assessCopilotEvidence(duplicateFinal).passed, false);
  const nonText = structuredClone(input); nonText.events[4].data.result.content = [input.manifest[0].marker];
  assert.equal(assessCopilotEvidence(nonText).rows[0].checks.readContainsMarker, false);
  const earlyResult = structuredClone(input); const [resultEvent] = earlyResult.events.splice(-1, 1); earlyResult.events.unshift(resultEvent);
  assert.equal(assessCopilotEvidence(earlyResult).processPassed, false);
  const forbidden = structuredClone(input); forbidden.events.unshift({ type: 'tool.execution_start', data: { toolCallId: 'shell', toolName: 'shell' } });
  assert.deepEqual(assessCopilotEvidence(forbidden).unexpectedTools, ['shell']);
  const failed = structuredClone(input); failed.process.code = 1;
  assert.equal(assessCopilotEvidence(failed).processPassed, false);
});

test('auditoria detecta alterações na origem e nos documentos humanos', t => {
  const input = fixture(t);
  writeFileSync(join(input.project, input.manifest[0].path), 'alterado');
  assert.equal(assessCopilotEvidence(input).rows[0].checks.sourceUnchangedAfterSetup, false);
  writeFileSync(join(input.project, 'README.md'), 'substituído');
  assert.equal(assessCopilotEvidence(input).documentsPreserved, false);
  writeFileSync(join(input.project, '.github/skills/beta/SKILL.md'), 'apontamento adulterado');
  assert.equal(assessCopilotEvidence(input).rows[1].checks.wrapperPointsToSource, false);
  writeFileSync(join(input.packageRoot, input.manifest[1].path), 'pacote adulterado');
  assert.equal(assessCopilotEvidence(input).rows[1].checks.fixtureOriginalUnchanged, false);
});
