import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { assessFleetEvidence } from './copilot-fleet-evidence.mjs';

function fixture(t, label = 'original') {
  const root = mkdtempSync(join(tmpdir(), 'copilot-fleet-proof-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const project = join(root, 'project'), original = join(root, 'original'), packageRoot = join(root, 'package');
  const hash = data => createHash('sha256').update(data).digest('hex');
  const put = (base, path, value) => { const file = join(base, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value); };
  const manifest = ['alpha', 'beta'].map((name, index) => {
    const path = `.pbai4devs/agents/${name}/AGENT.md`;
    const marker = `ADK_AGENT_0${index + 1}_ABCDEF123${index}`;
    const bytes = Buffer.from(`# ${name}\n`);
    const changed = Buffer.concat([bytes, Buffer.from(`\nMarcador sintético de teste: ${marker}.\n`)]);
    put(original, path, bytes); put(packageRoot, path, bytes); put(project, path, changed);
    const wrapper = `---\nname: ${name}\n---\n\n# ${name}\n\nLeia [origem](../../${path}).\n`;
    put(original, `.github/agents/${name}.agent.md`, wrapper);
    put(project, `.github/agents/${name}.agent.md`, label === 'path' ? wrapper.replace('[origem](', `[${path}](`) : wrapper);
    return { name, path, marker, originalSha256: hash(bytes), alteredSha256: hash(changed) };
  });
  for (const name of ['README.md', '.gitignore']) { put(original, name, 'preservar\n'); put(project, name, 'preservar\n'); }
  const events = [{ type: 'session.custom_agents_updated', data: { agents: manifest.map(item => ({ name: item.name, source: 'project', userInvocable: true })) } }];
  for (const [index, item] of manifest.entries()) {
    const task = `task${index}`, view = `view${index}`;
    events.push({ type: 'tool.execution_start', data: { toolCallId: task, toolName: 'task', arguments: { agent_type: item.name, mode: 'background' } } });
    events.push({ type: 'subagent.started', data: { toolCallId: task, agentName: item.name, agentType: item.name, executionMode: 'background' } });
    events.push({ type: 'tool.execution_complete', data: { toolCallId: task, success: true, result: { content: 'Agent started in background with agent_id: 00000000-0000-0000-0000-000000000000.' } } });
    events.push({ type: 'subagent.selected', data: { agentName: item.name } });
    events.push({ type: 'tool.execution_start', data: { toolCallId: view, parentToolCallId: task, toolName: 'view', arguments: { path: join(project, item.path) } } });
    events.push({ type: 'tool.execution_complete', data: { toolCallId: view, success: true, result: { content: item.marker } } });
    events.push({ type: 'assistant.message', data: { phase: 'final_answer', parentToolCallId: task, content: item.marker } });
    events.push({ type: 'subagent.completed', data: { toolCallId: task, agentName: item.name } });
  }
  events.push({ type: 'assistant.message', data: { phase: 'final_answer', content: JSON.stringify(Object.fromEntries(manifest.map(item => [item.name, item.marker]))) } });
  events.push({ type: 'result', exitCode: 0 });
  return { project, fixture: original, packageRoot, manifest, events, prompt: 'Delegue cada perfil.', process: { code: 0, signal: null, timedOut: false }, label };
}

test('audita a leitura de cada perfil pelo subagente selecionado', t => {
  const input = fixture(t), result = assessFleetEvidence(input);
  assert.equal(result.passed, true); assert.equal(result.verified, 2);
  const wrongAgent = structuredClone(input); wrongAgent.events[5].data.parentToolCallId = 'outro';
  assert.equal(assessFleetEvidence(wrongAgent).rows[0].checks.sourceReadByOwnAgent, false);
  const wrongAnswer = structuredClone(input); wrongAnswer.events.at(-2).data.content = JSON.stringify({ alpha: input.manifest[1].marker, beta: input.manifest[0].marker });
  assert.equal(assessFleetEvidence(wrongAnswer).passed, false);
  const earlyCompletion = structuredClone(input); const [end] = earlyCompletion.events.splice(6, 1); earlyCompletion.events.unshift(end);
  assert.equal(assessFleetEvidence(earlyCompletion).passed, false);
  const earlySubagentEnd = structuredClone(input); const [subagentEnd] = earlySubagentEnd.events.splice(8, 1); earlySubagentEnd.events.splice(4, 0, subagentEnd);
  assert.equal(assessFleetEvidence(earlySubagentEnd).passed, false);
  const lateAcknowledgement = structuredClone(input); const [ack] = lateAcknowledgement.events.splice(3, 1); lateAcknowledgement.events.splice(8, 0, ack);
  assert.equal(assessFleetEvidence(lateAcknowledgement).rows[0].checks.executionOrder, false);
  const unacknowledged = structuredClone(input); unacknowledged.events[3].data.result.content = 'completed';
  assert.equal(assessFleetEvidence(unacknowledged).rows[0].checks.backgroundAcknowledged, false);
  const earlyFinal = structuredClone(input); const [final] = earlyFinal.events.splice(-2, 1); earlyFinal.events.unshift(final);
  assert.equal(assessFleetEvidence(earlyFinal).passed, false);
  const leaked = structuredClone(input); leaked.prompt += input.manifest[0].marker;
  assert.equal(assessFleetEvidence(leaked).rows[0].checks.markerAbsentFromPrompt, false);
  const forbidden = structuredClone(input); forbidden.events.unshift({ type: 'tool.execution_start', data: { toolCallId: 'shell', toolName: 'shell' } });
  assert.deepEqual(assessFleetEvidence(forbidden).unexpectedTools, ['shell']);
  const extraAgent = structuredClone(input); extraAgent.events.unshift({ type: 'subagent.started', data: { agentName: 'outro', agentType: 'outro' } });
  assert.deepEqual(assessFleetEvidence(extraAgent).unexpectedAgents, ['outro']);
  const external = structuredClone(input); external.events.unshift(
    { type: 'tool.execution_start', data: { toolCallId: 'outside', toolName: 'view', arguments: { path: join(input.project, '..', 'privado') } } },
    { type: 'tool.execution_complete', data: { toolCallId: 'outside', success: true } });
  assert.equal(assessFleetEvidence(external).outsideUnverified, 1);
  assert.equal(assessFleetEvidence(external).passed, false);
  external.events[1].data = { toolCallId: 'outside', success: false, error: { code: 'denied' } };
  assert.equal(assessFleetEvidence(external).outsideUnverified, 0);
  external.events[1].data.result = { content: 'possível conteúdo parcial' };
  assert.equal(assessFleetEvidence(external).outsideUnverified, 1);
  external.events[0].data.arguments.path = null; external.events[1].data.success = true;
  assert.equal(assessFleetEvidence(external).outsideUnverified, 1);
});

test('registra tentativa rejeitada e verifica variante de apontamento', t => {
  const input = fixture(t, 'path');
  input.events.splice(1, 0,
    { type: 'tool.execution_start', data: { toolCallId: 'rejected', toolName: 'task', arguments: { agent_type: 'alpha' } } },
    { type: 'tool.execution_complete', data: { toolCallId: 'rejected', success: false } });
  const result = assessFleetEvidence(input);
  assert.equal(result.passed, true); assert.equal(result.rows[0].failedAttempts, 1);
  assert.equal(assessFleetEvidence({ ...input, label: 'original' }).passed, false);
  writeFileSync(join(input.project, '.github/agents/beta.agent.md'), 'adulterado');
  assert.equal(assessFleetEvidence(input).rows[1].checks.wrapperPointsToSource, false);
});
