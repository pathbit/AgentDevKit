#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeRead } from './native-client-matrix.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const isMarker = (kind, value) => new RegExp(`^ADK_CLAUDE_${kind}_[0-9]{2}_[0-9A-F]{10}$`).test(value);

// Snapshot everything except the two instrumented files per agent. Never follow links.
function tree(root, omitted) {
  const entries = [];
  const visit = (path = '') => {
    for (const name of readdirSync(join(root, path)).sort()) {
      const rel = path ? `${path}/${name}` : name;
      const item = lstatSync(join(root, rel));
      if (omitted.has(rel)) continue;
      const mode = item.mode & 0o777;
      if (item.isSymbolicLink()) entries.push([rel, 'link', mode, readlinkSync(join(root, rel))]);
      else if (item.isDirectory()) { entries.push([rel, 'directory', mode]); visit(rel); }
      else if (item.isFile()) entries.push([rel, 'file', mode, hash(safeRead(root, rel, null))]);
      else entries.push([rel, 'other', mode]);
    }
  };
  visit(); return entries;
}

// Verifies native profile loading and explicit source reads, not full agent workflows.
export function assessClaudeAgentsEvidence({ project, fixture, packageRoot, manifest, events, prompt, process: outcome, recordedProject = project }) {
  if (!Array.isArray(manifest) || !manifest.length || !Array.isArray(events) || typeof prompt !== 'string') throw Error('Evidência inválida.');
  if (typeof recordedProject !== 'string' || !isAbsolute(recordedProject)) throw Error('Caminho original da prova deve ser absoluto.');
  for (const key of ['name', 'path', 'marker', 'profileMarker']) if (new Set(manifest.map(item => item?.[key])).size !== manifest.length) throw Error(`Campo duplicado: ${key}.`);
  if (manifest.some(item => !/^[a-z0-9-]+$/.test(item.name) || item.path !== `.pbai4devs/agents/${item.name}/AGENT.md` || !isMarker('AGENT', item.marker) || !isMarker('PROFILE', item.profileMarker))) throw Error('Manifesto inválido.');
  const indexed = events.map((event, index) => ({ event, index }));
  const blocks = indexed.flatMap(({ event, index }) => Array.isArray(event.message?.content) ? event.message.content.map(block => ({ event, index, block })) : []);
  const calls = blocks.filter(x => x.event.type === 'assistant' && x.block.type === 'tool_use');
  const results = blocks.filter(x => x.event.type === 'user' && x.block.type === 'tool_result');
  const complete = call => { const found = results.filter(x => x.block.tool_use_id === call?.block.id); return found.length === 1 && found[0].index > call.index && (found[0].event.parent_tool_use_id ?? null) === (call.event.parent_tool_use_id ?? null) ? found[0] : null; };
  const ids = calls.map(x => x.block.id);
  const uniqueCalls = ids.every(Boolean) && new Set(ids).size === ids.length && calls.every(call => complete(call)) && results.every(result => ids.includes(result.block.tool_use_id));
  // Background notifications may resume print mode repeatedly, producing
  // several init/result pairs. The last successful result is the final answer.
  const initial = indexed.filter(x => x.event.type === 'system' && x.event.subtype === 'init');
  const init = initial[0]?.event;
  const consistentInit = initial.length > 0 && initial.every(x => x.event.cwd === init.cwd && JSON.stringify(x.event.tools) === JSON.stringify(init.tools) && JSON.stringify(x.event.agents) === JSON.stringify(init.agents) && JSON.stringify(x.event.mcp_servers) === JSON.stringify(init.mcp_servers));
  const finals = indexed.filter(x => x.event.type === 'result'), final = finals.at(-1);
  let answers = null;
  try {
    const content = final.event.result.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/, '$1');
    const keys = [...content.matchAll(/"([a-z0-9-]+)"\s*:/g)].map(x => x[1]);
    const parsed = JSON.parse(content), names = manifest.map(x => x.name);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length === names.length && names.every(name => keys.filter(k => k === name).length === 1 && parsed[name] && typeof parsed[name] === 'object' && !Array.isArray(parsed[name]) && Object.keys(parsed[name]).sort().join(',') === 'origem,perfil') && keys.filter(k => k === 'perfil').length === names.length && keys.filter(k => k === 'origem').length === names.length && keys.length === 3 * names.length) answers = parsed;
  } catch { /* answer not verified */ }
  const names = new Set(manifest.map(item => item.name));
  const agentCalls = calls.filter(x => ['Agent', 'Task'].includes(x.block.name));
  const expectedAgentIds = new Set(agentCalls.filter(x => !x.event.parent_tool_use_id && names.has(x.block.input?.subagent_type)).map(x => x.block.id));
  const orphanEvents = indexed.filter(x => ['user', 'assistant'].includes(x.event.type) && x.event.parent_tool_use_id != null && !expectedAgentIds.has(x.event.parent_tool_use_id)).map(x => ({ index: x.index, type: x.event.type }));
  const expectedSourcePaths = new Set(manifest.map(item => resolve(recordedProject, item.path)));
  const unexpectedCalls = calls.filter(x => {
    if (['Agent', 'Task'].includes(x.block.name)) return Boolean(x.event.parent_tool_use_id) || !names.has(x.block.input?.subagent_type);
    if (x.block.name === 'Read') return !expectedAgentIds.has(x.event.parent_tool_use_id) || typeof x.block.input?.file_path !== 'string' || !expectedSourcePaths.has(resolve(recordedProject, x.block.input.file_path));
    return true;
  }).map(x => x.block.name || 'unknown');
  const markers = manifest.flatMap(item => [item.marker, item.profileMarker]);
  const rootTexts = blocks.filter(x => x.event.type === 'user' && !x.event.parent_tool_use_id && x.block.type === 'text');
  const promptsClean = markers.every(marker => !prompt.includes(marker) && rootTexts.every(x => typeof x.block.text === 'string' && !x.block.text.includes(marker)) && agentCalls.every(call => {
    const input = JSON.stringify(call.block.input);
    return typeof input === 'string' && !input.includes(marker);
  }));
  const originalsClean = manifest.every(item => {
    const source = safeRead(fixture, item.path, null), profile = safeRead(fixture, `.claude/agents/${item.name}.md`, null);
    return markers.every(marker => !source.includes(marker) && !profile.includes(marker));
  });
  const omitted = new Set(manifest.flatMap(item => [item.path, `.claude/agents/${item.name}.md`]));
  const otherFilesPreserved = JSON.stringify(tree(fixture, omitted)) === JSON.stringify(tree(project, omitted));
  const starts = indexed.filter(x => x.event.type === 'system' && x.event.subtype === 'task_started' && expectedAgentIds.has(x.event.tool_use_id));
  const taskIds = starts.map(x => x.event.task_id);
  const completions = indexed.filter(x => x.event.type === 'system' && x.event.subtype === 'task_updated' && x.event.patch?.status === 'completed' && taskIds.includes(x.event.task_id));
  const notifications = indexed.filter(x => x.event.type === 'system' && x.event.subtype === 'task_notification' && x.event.status === 'completed' && taskIds.includes(x.event.task_id));
  const parallelCandidate = manifest.length > 1 && starts.length === manifest.length && new Set(taskIds).size === starts.length && taskIds.every(Boolean) && starts.every(x => x.event.is_backgrounded === true) && completions.length === starts.length && new Set(completions.map(x => x.event.task_id)).size === completions.length && notifications.length === starts.length && new Set(notifications.map(x => x.event.task_id)).size === notifications.length && notifications.every(notification => completions.some(completion => completion.event.task_id === notification.event.task_id && completion.index < notification.index)) && Math.max(...starts.map(x => x.index)) < Math.min(...completions.map(x => x.index), ...notifications.map(x => x.index));
  const rows = manifest.map(item => {
    const agent = agentCalls.filter(x => !x.event.parent_tool_use_id && x.block.input?.subagent_type === item.name);
    const call = agent.length === 1 ? agent[0] : null, callResult = call && complete(call), id = call?.block.id;
    const started = indexed.filter(x => x.event.type === 'system' && x.event.subtype === 'task_started' && x.event.tool_use_id === id && x.event.subagent_type === item.name);
    const done = indexed.filter(x => x.event.type === 'system' && x.event.subtype === 'task_notification' && x.event.tool_use_id === id && x.event.status === 'completed');
    const reads = calls.filter(x => x.block.name === 'Read' && x.event.parent_tool_use_id === id && typeof x.block.input?.file_path === 'string' && resolve(recordedProject, x.block.input.file_path) === resolve(recordedProject, item.path));
    const read = reads.length === 1 ? reads[0] : null, readResult = read && complete(read);
    const childFinal = blocks.filter(x => x.event.type === 'assistant' && x.event.parent_tool_use_id === id && x.block.type === 'text' && typeof x.block.text === 'string' && x.block.text.includes(item.marker) && x.block.text.includes(item.profileMarker) && readResult && x.index > readResult.index && done.length === 1 && x.index < done[0].index);
    const leaked = results.some(x => {
      const content = JSON.stringify(x.block.content);
      if (typeof content !== 'string') return true;
      if (!content.includes(item.profileMarker)) return false;
      // A foreground Agent result legitimately relays its own completed child.
      return !(callResult === x && childFinal.length === 1 && childFinal[0].index < x.index);
    });
    const wrapperPath = `.claude/agents/${item.name}.md`, originalWrapper = safeRead(fixture, wrapperPath, null), wrapper = safeRead(project, wrapperPath, null);
    const links = [...originalWrapper.toString('utf8').matchAll(/\[origem\]\(([^)\r\n]+)\)/g)];
    const original = safeRead(fixture, item.path, null), actual = safeRead(project, item.path, null), packed = safeRead(packageRoot, item.path, null);
    const readContent = new TextDecoder('utf-8', { fatal: true }).decode(actual).split('\n').map((line, index) => `${index + 1}\t${line}`).join('\n');
    const sourceLeaked = results.some(x => {
      const content = JSON.stringify(x.block.content);
      if (typeof content !== 'string') return true;
      if (!content.includes(item.marker)) return false;
      return x !== readResult && !(x === callResult && childFinal.length === 1 && childFinal[0].index < x.index);
    });
    const childPrompts = blocks.filter(x => x.event.type === 'user' && x.event.parent_tool_use_id === id && x.block.type === 'text' && x.index < (done[0]?.index ?? Infinity));
    const childCompletions = completions.filter(x => started.length === 1 && x.event.task_id === started[0].event.task_id);
    const checks = {
      discovered: Array.isArray(init?.agents) && init.agents.filter(name => name === item.name).length === 1,
      promptsClean, originalsClean,
      selectedOnce: agent.length === 1 && callResult?.block.is_error !== true && started.length === 1 && done.length === 1 && started[0].event.task_id === done[0].event.task_id && started[0].event.prompt === call.block.input.prompt,
      sourceReadByAgent: reads.length === 1 && readResult?.block.is_error !== true && readResult?.block.content === readContent,
      profileMarkerNotLeakedByTool: !leaked,
      sourceMarkerNotLeakedByTool: !sourceLeaked,
      childPromptCleanWhenReported: childPrompts.every(x => typeof x.block.text === 'string' && markers.every(marker => !x.block.text.includes(marker))),
      childReturnedBoth: childFinal.length === 1,
      completionContainsBoth: done.length === 1 && typeof done[0].event.summary === 'string' && done[0].event.summary.includes(item.marker) && done[0].event.summary.includes(item.profileMarker),
      completionOrder: started.length === 1 && (started[0].event.is_backgrounded !== true || childFinal.length === 1 && childCompletions.length === 1 && done.length === 1 && childFinal[0].index < childCompletions[0].index && childCompletions[0].index < done[0].index),
      order: Boolean(call && started.length === 1 && read && readResult && childFinal.length === 1 && done.length === 1 && final) && call.index < started[0].index && started[0].index < read.index && read.index < readResult.index && readResult.index < childFinal[0].index && childFinal[0].index < done[0].index && done[0].index < final.index,
      answerMatches: answers?.[item.name]?.perfil === item.profileMarker && answers?.[item.name]?.origem === item.marker,
      fixtureMatchesPackage: hash(original) === item.originalSha256 && original.equals(packed),
      sourceUnchangedAfterSetup: hash(actual) === item.alteredSha256 && actual.equals(Buffer.concat([original, Buffer.from(`\nMarcador sintético de teste: ${item.marker}.\n`)])),
      profilePointsToSource: links.length === 1 && resolve(dirname(join(project, wrapperPath)), decodeURIComponent(links[0][1])) === resolve(project, item.path),
      profileUnchangedAfterSetup: hash(originalWrapper) === item.wrapperSha256 && hash(wrapper) === item.alteredWrapperSha256 && wrapper.equals(Buffer.concat([originalWrapper, Buffer.from(`\nMarcador sintético do perfil carregado: ${item.profileMarker}.\n`)])),
      originalModesPreserved: (lstatSync(join(fixture, item.path)).mode & 0o777) === (lstatSync(join(project, item.path)).mode & 0o777) && (lstatSync(join(fixture, wrapperPath)).mode & 0o777) === (lstatSync(join(project, wrapperPath)).mode & 0o777),
    };
    return { name: item.name, path: item.path, childPromptTextObserved: childPrompts.length > 0, status: Object.values(checks).every(Boolean) ? 'passed' : 'not-verified', checks };
  });
  const parallelObserved = parallelCandidate && rows.every(row => row.checks.completionOrder);
  const processPassed = outcome?.code === 0 && !outcome.signal && !outcome.error && outcome.timedOut === false && final?.event.is_error === false && finals.every(x => x.event.is_error === false) && consistentInit && initial[0].index < Math.min(...calls.map(x => x.index), ...finals.map(x => x.index)) && init && resolve(init.cwd) === resolve(recordedProject) && Array.isArray(init.tools) && init.tools.length === 2 && init.tools.includes('Read') && init.tools.some(name => ['Task', 'Agent'].includes(name)) && Array.isArray(init.mcp_servers) && init.mcp_servers.length === 0;
  const passed = Boolean(processPassed && uniqueCalls && !unexpectedCalls.length && !orphanEvents.length && otherFilesPreserved && rows.every(row => row.status === 'passed'));
  return { passed, swarmPassed: passed && parallelObserved, processPassed: Boolean(processPassed), uniqueCalls, unexpectedCalls, orphanEvents, otherFilesPreserved, parallelObserved, total: rows.length, verified: rows.filter(row => row.status === 'passed').length, rows, limitation: 'Carregamento do perfil e leitura explícita da origem; não prova o fluxo completo do agente.' };
}

function main(args) {
  if (args.length !== 3 && !(args.length === 5 && args[3] === '--recorded-project' && isAbsolute(args[4]))) throw Error('Uso: node tests/claude-agent-evidence.mjs <pasta-da-prova> <fixture-original> <pacote> [--recorded-project <caminho-absoluto>]');
  const root = realpathSync(resolve(args[0])), fixture = realpathSync(resolve(args[1])), packageRoot = realpathSync(resolve(args[2]));
  const json = name => JSON.parse(readFileSync(join(root, name), 'utf8'));
  const text = name => readFileSync(join(root, name), 'utf8');
  const report = assessClaudeAgentsEvidence({ project: join(root, 'project'), fixture, packageRoot, manifest: json('manifest.json'), events: text('events.jsonl').split('\n').filter(Boolean).map(JSON.parse), prompt: text('prompt.txt'), process: json('process.json'), recordedProject: args[4] || join(root, 'project') });
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}
let entry = false;
try { entry = Boolean(process.argv[1]) && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url)); } catch { /* imported */ }
if (entry) { try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
