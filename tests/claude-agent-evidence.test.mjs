import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { assessClaudeAgentsEvidence } from './claude-agent-evidence.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'claude-agent-proof-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const project = join(root, 'project'), original = join(root, 'original'), packageRoot = join(root, 'package');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const put = (base, path, value) => { const file = join(base, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value); };
  const manifest = ['alpha', 'beta'].map((name, i) => {
    const path = `.pbai4devs/agents/${name}/AGENT.md`, wrapperPath = `.claude/agents/${name}.md`;
    const marker = `ADK_CLAUDE_AGENT_0${i + 1}_ABCDEF123${i}`, profileMarker = `ADK_CLAUDE_PROFILE_0${i + 1}_FEDCBA123${i}`;
    const bytes = Buffer.from(`# ${name}\n`), changed = Buffer.concat([bytes, Buffer.from(`\nMarcador sintético de teste: ${marker}.\n`)]);
    const wrapper = Buffer.from(`---\nname: ${name}\n---\n\n# ${name}\n\nLeia [origem](../../${path}).\n`);
    const changedWrapper = Buffer.concat([wrapper, Buffer.from(`\nMarcador sintético do perfil carregado: ${profileMarker}.\n`)]);
    put(original, path, bytes); put(packageRoot, path, bytes); put(project, path, changed);
    put(original, wrapperPath, wrapper); put(project, wrapperPath, changedWrapper);
    return { name, path, marker, profileMarker, originalSha256: hash(bytes), alteredSha256: hash(changed), wrapperSha256: hash(wrapper), alteredWrapperSha256: hash(changedWrapper) };
  });
  for (const file of ['README.md', '.gitignore', '.claude/settings.local.json']) { put(original, file, 'humano\n'); put(project, file, 'humano\n'); }
  const init = { type: 'system', subtype: 'init', cwd: project, agents: manifest.map(x => x.name), tools: ['Task', 'Read'], mcp_servers: [] };
  const events = [init];
  const assistant = (parent, block) => ({ type: 'assistant', parent_tool_use_id: parent, message: { content: [block] } });
  const user = (parent, block) => ({ type: 'user', parent_tool_use_id: parent, message: { content: [block] } });
  for (const [i, item] of manifest.entries()) {
    events.push(assistant(null, { type: 'tool_use', id: `a${i}`, name: 'Agent', input: { subagent_type: item.name, prompt: 'Leia a origem.' } }));
    events.push(user(null, { type: 'tool_result', tool_use_id: `a${i}`, content: 'Iniciado em background.' }));
    events.push({ type: 'system', subtype: 'task_started', tool_use_id: `a${i}`, task_id: `t${i}`, subagent_type: item.name, prompt: 'Leia a origem.' });
    events.push(assistant(`a${i}`, { type: 'tool_use', id: `r${i}`, name: 'Read', input: { file_path: join(project, item.path) } }));
    const source = `# ${item.name}\n\nMarcador sintético de teste: ${item.marker}.\n`;
    events.push(user(`a${i}`, { type: 'tool_result', tool_use_id: `r${i}`, content: source.split('\n').map((line, index) => `${index + 1}\t${line}`).join('\n') }));
    events.push(assistant(`a${i}`, { type: 'text', text: `perfil=${item.profileMarker}; origem=${item.marker}` }));
    events.push({ type: 'system', subtype: 'task_notification', tool_use_id: `a${i}`, task_id: `t${i}`, status: 'completed', summary: `perfil=${item.profileMarker}; origem=${item.marker}` });
  }
  const answer = Object.fromEntries(manifest.map(x => [x.name, { perfil: x.profileMarker, origem: x.marker }]));
  events.push(structuredClone(init), { type: 'result', is_error: false, result: JSON.stringify(answer) });
  return { project, fixture: original, packageRoot, manifest, events, prompt: 'Delegue aos perfis.', process: { code: 0, signal: null, timedOut: false } };
}

test("audita native selection, loaded profile, agent reading and response", t => {
  const input = fixture(t), report = assessClaudeAgentsEvidence(input);
  assert.equal(report.passed, true); assert.equal(report.verified, 2);
  assert.equal(report.rows[0].childPromptTextObserved, false);
  const swapped = structuredClone(input); const data = JSON.parse(swapped.events.at(-1).result); data.alpha.origem = input.manifest[1].marker; swapped.events.at(-1).result = JSON.stringify(data); assert.equal(assessClaudeAgentsEvidence(swapped).passed, false);
  const leaked = structuredClone(input); leaked.events[1].message.content[0].input.prompt += input.manifest[0].profileMarker; assert.equal(assessClaudeAgentsEvidence(leaked).passed, false);
  const wrongParent = structuredClone(input); wrongParent.events[4].parent_tool_use_id = 'a1'; assert.equal(assessClaudeAgentsEvidence(wrongParent).passed, false);
  const wrongResultParent = structuredClone(input); wrongResultParent.events[5].parent_tool_use_id = 'a1'; assert.equal(assessClaudeAgentsEvidence(wrongResultParent).passed, false);
  const wrongPath = structuredClone(input); wrongPath.events[4].message.content[0].input.file_path = join(input.project, '.claude/agents/alpha.md'); assert.equal(assessClaudeAgentsEvidence(wrongPath).passed, false);
  const failed = structuredClone(input); failed.events[5].message.content[0].is_error = true; assert.equal(assessClaudeAgentsEvidence(failed).passed, false);
  const fakeRead = structuredClone(input); fakeRead.events[5].message.content[0].content = `Erro ao ler: ${input.manifest[0].marker}`; assert.equal(assessClaudeAgentsEvidence(fakeRead).passed, false);
  const premature = structuredClone(input); const [notification] = premature.events.splice(7, 1); premature.events.splice(4, 0, notification); assert.equal(assessClaudeAgentsEvidence(premature).passed, false);
  const taskMismatch = structuredClone(input); taskMismatch.events[7].task_id = 'other'; assert.equal(assessClaudeAgentsEvidence(taskMismatch).passed, false);
  const promptMismatch = structuredClone(input); promptMismatch.events[3].prompt += input.manifest[0].profileMarker; assert.equal(assessClaudeAgentsEvidence(promptMismatch).passed, false);
  const injectedText = structuredClone(input); injectedText.events.splice(4, 0, { type: 'user', parent_tool_use_id: 'a0', message: { content: [{ type: 'text', text: input.manifest[0].profileMarker }] } }); assert.equal(assessClaudeAgentsEvidence(injectedText).passed, false);
  const lateChildText = structuredClone(input); lateChildText.events.splice(7, 0, { type: 'user', parent_tool_use_id: 'a0', message: { content: [{ type: 'text', text: input.manifest[0].profileMarker }] } }); assert.equal(assessClaudeAgentsEvidence(lateChildText).passed, false);
  const rootInjection = structuredClone(input); rootInjection.events.splice(1, 0, { type: 'user', parent_tool_use_id: null, message: { content: [{ type: 'text', text: input.manifest[0].profileMarker }] } }); assert.equal(assessClaudeAgentsEvidence(rootInjection).passed, false);
  const orphanInjection = structuredClone(input); orphanInjection.events.splice(1, 0, { type: 'user', parent_tool_use_id: 'orphan', message: { content: [{ type: 'text', text: input.manifest[0].profileMarker }] } }); assert.equal(assessClaudeAgentsEvidence(orphanInjection).passed, false); assert.equal(assessClaudeAgentsEvidence(orphanInjection).orphanEvents.length, 1);
  const orphanAssistant = structuredClone(input); orphanAssistant.events.splice(1, 0, { type: 'assistant', parent_tool_use_id: 'orphan', message: { content: [{ type: 'text', text: 'evento órfão' }] } }); assert.equal(assessClaudeAgentsEvidence(orphanAssistant).passed, false); assert.equal(assessClaudeAgentsEvidence(orphanAssistant).orphanEvents.length, 1);
  const laterLeak = structuredClone(input); laterLeak.events[9].message.content[0].content += input.manifest[0].profileMarker; assert.equal(assessClaudeAgentsEvidence(laterLeak).passed, false);
  const sourceLeak = structuredClone(input); sourceLeak.events[9].message.content[0].content += input.manifest[0].marker; assert.equal(assessClaudeAgentsEvidence(sourceLeak).passed, false);
  const emptySummary = structuredClone(input); emptySummary.events[7].summary = 'concluído'; assert.equal(assessClaudeAgentsEvidence(emptySummary).passed, false);
  const duplicateId = structuredClone(input); duplicateId.events[8].message.content[0].id = 'a0'; assert.equal(assessClaudeAgentsEvidence(duplicateId).passed, false);
  const globalRead = structuredClone(input); globalRead.events[4].parent_tool_use_id = null; assert.equal(assessClaudeAgentsEvidence(globalRead).passed, false);
  const unexpected = structuredClone(input); unexpected.events[4].message.content[0].name = 'Bash'; assert.equal(assessClaudeAgentsEvidence(unexpected).passed, false);
  const conflictingInit = structuredClone(input); conflictingInit.events.at(-2).tools.push('Bash'); assert.equal(assessClaudeAgentsEvidence(conflictingInit).processPassed, false);
  const lateInit = structuredClone(input); const [init] = lateInit.events.splice(0, 1); lateInit.events.splice(-1, 0, init); assert.equal(assessClaudeAgentsEvidence(lateInit).processPassed, false);
  const failedResult = structuredClone(input); failedResult.events.splice(-1, 0, { type: 'result', is_error: true, result: '' }); assert.equal(assessClaudeAgentsEvidence(failedResult).passed, false);
  const duplicateKey = structuredClone(input); duplicateKey.events.at(-1).result = duplicateKey.events.at(-1).result.replace('"perfil":', '"perfil":"forjado","perfil":'); assert.equal(assessClaudeAgentsEvidence(duplicateKey).passed, false);
});

test("rejects changes in files, profiles and original package", t => {
  const input = fixture(t);
  writeFileSync(join(input.project, 'README.md'), 'alterado'); assert.equal(assessClaudeAgentsEvidence(input).otherFilesPreserved, false);
  writeFileSync(join(input.project, input.manifest[0].path), 'alterado'); assert.equal(assessClaudeAgentsEvidence(input).rows[0].checks.sourceUnchangedAfterSetup, false);
  writeFileSync(join(input.project, '.claude/agents/beta.md'), 'alterado'); assert.equal(assessClaudeAgentsEvidence(input).rows[1].checks.profileUnchangedAfterSetup, false);
  writeFileSync(join(input.packageRoot, input.manifest[1].path), 'alterado'); assert.equal(assessClaudeAgentsEvidence(input).rows[1].checks.fixtureMatchesPackage, false);
});

test("accepts copy moved only with the coherent original path in events", t => {
  const input = fixture(t), relocated = `${input.project}-copy`;
  cpSync(input.project, relocated, { recursive: true });
  const copied = { ...input, project: relocated, recordedProject: input.project };
  assert.equal(assessClaudeAgentsEvidence(copied).passed, true);
  assert.equal(assessClaudeAgentsEvidence({ ...copied, recordedProject: relocated }).passed, false);
  assert.throws(() => assessClaudeAgentsEvidence({ ...copied, recordedProject: 'relativo' }), /absoluto/);
});

test("recognizes parallelism only when everyone starts before the first conclusion", t => {
  const input = fixture(t), first = input.events.slice(1, 8), second = input.events.slice(8, 15);
  first[2].is_backgrounded = true; second[2].is_backgrounded = true;
  const completed = id => ({ type: 'system', subtype: 'task_updated', task_id: id, patch: { status: 'completed' } });
  input.events = [input.events[0], ...first.slice(0, 3), ...second.slice(0, 3), ...first.slice(3, 6), completed('t0'), first[6], ...second.slice(3, 6), completed('t1'), second[6], ...input.events.slice(15)];
  assert.equal(assessClaudeAgentsEvidence(input).passed, true);
  assert.equal(assessClaudeAgentsEvidence(input).parallelObserved, true);
  assert.equal(assessClaudeAgentsEvidence(input).swarmPassed, true);
  const sequential = structuredClone(input), secondStart = sequential.events.findIndex(x => x.subtype === 'task_started' && x.task_id === 't1');
  const [start] = sequential.events.splice(secondStart, 1), firstComplete = sequential.events.findIndex(x => x.subtype === 'task_updated' && x.task_id === 't0');
  sequential.events.splice(firstComplete + 1, 0, start);
  assert.equal(assessClaudeAgentsEvidence(sequential).parallelObserved, false);
  assert.equal(assessClaudeAgentsEvidence(sequential).swarmPassed, false);
  const earlyNotification = structuredClone(input), notificationIndex = earlyNotification.events.findIndex(x => x.subtype === 'task_notification' && x.task_id === 't0');
  const [notification] = earlyNotification.events.splice(notificationIndex, 1), laterStart = earlyNotification.events.findIndex(x => x.subtype === 'task_started' && x.task_id === 't1');
  earlyNotification.events.splice(laterStart, 0, notification);
  assert.equal(assessClaudeAgentsEvidence(earlyNotification).parallelObserved, false);
  const prematureCompletion = structuredClone(input), completionIndex = prematureCompletion.events.findIndex(x => x.subtype === 'task_updated' && x.task_id === 't0');
  const [completion] = prematureCompletion.events.splice(completionIndex, 1), startIndex = prematureCompletion.events.findIndex(x => x.subtype === 'task_started' && x.task_id === 't1');
  prematureCompletion.events.splice(startIndex + 1, 0, completion);
  assert.equal(assessClaudeAgentsEvidence(prematureCompletion).swarmPassed, false);
});
