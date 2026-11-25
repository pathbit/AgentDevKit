#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeRead } from './native-client-matrix.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const markerPattern = /^ADK_AGENT_[0-9]{2}_[0-9A-F]{10}$/;

function optional(root, file) {
  try { return safeRead(root, file, null); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

// Audits delegated reads of synthetic sources, not full agent workflows.
export function assessFleetEvidence({ project, fixture, packageRoot, manifest, events, prompt, process, label = 'original' }) {
  if (!Array.isArray(manifest) || !manifest.length || !Array.isArray(events) || typeof prompt !== 'string' || !['original', 'path'].includes(label)) throw Error('Evidência inválida.');
  for (const key of ['name', 'path', 'marker']) {
    if (new Set(manifest.map(item => item?.[key])).size !== manifest.length) throw Error(`Campo duplicado: ${key}.`);
  }
  if (manifest.some(item => !/^[a-z0-9-]+$/.test(item.name) || item.path !== `.pbai4devs/agents/${item.name}/AGENT.md` || !markerPattern.test(item.marker))) throw Error('Manifesto inválido.');
  const indexed = events.map((event, index) => ({ event, index }));
  const starts = indexed.filter(x => x.event.type === 'tool.execution_start');
  const completions = indexed.filter(x => x.event.type === 'tool.execution_complete');
  const completion = call => {
    const matches = completions.filter(x => x.event.data?.toolCallId === call?.event.data?.toolCallId);
    return matches.length === 1 ? matches[0] : null;
  };
  const final = indexed.filter(x => x.event.type === 'assistant.message' && x.event.data?.phase === 'final_answer' && !x.event.data?.parentToolCallId).at(-1);
  let answers = null;
  try {
    const content = (final?.event.data?.content || '').trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/, '$1');
    const keys = [...content.matchAll(/"([a-z0-9-]+)"\s*:/g)].map(match => match[1]);
    const parsed = JSON.parse(content);
    if (parsed && !Array.isArray(parsed) && typeof parsed === 'object' && keys.length === manifest.length && new Set(keys).size === keys.length && Object.keys(parsed).length === manifest.length) answers = parsed;
  } catch { /* unproven response */ }
  const allowed = new Set(['sql', 'task', 'view', 'glob', 'rg', 'read_agent']);
  const unexpectedTools = starts.filter(x => !allowed.has(x.event.data?.toolName)).map(x => x.event.data?.toolName || 'unknown');
  const names = new Set(manifest.map(item => item.name));
  const unexpectedAgents = indexed.filter(x => x.event.type === 'subagent.started' && (!names.has(x.event.data?.agentName) || x.event.data?.agentType !== x.event.data?.agentName)).map(x => x.event.data?.agentName || 'unknown');
  const outside = path => {
    if (typeof path !== 'string') return false;
    const target = relative(project, resolve(project, path));
    return target === '..' || target.startsWith(`..${sep}`) || isAbsolute(target);
  };
  const outsideAttempts = starts.filter(x => {
    const { toolName, arguments: args } = x.event.data || {};
    if (toolName === 'view') return typeof args?.path !== 'string' || outside(args.path);
    if (!['glob', 'rg'].includes(toolName)) return false;
    const paths = Array.isArray(args?.paths) ? args.paths : [args?.paths];
    return paths.some(path => (path !== undefined && typeof path !== 'string') || outside(path)) || typeof args?.pattern !== 'string' || (isAbsolute(args.pattern) && outside(args.pattern));
  });
  // Only an explicit denial without a result proves that an external read was blocked.
  const outsideUnverified = outsideAttempts.filter(call => {
    const end = completion(call)?.event.data;
    return !(end?.success === false && end.error?.code === 'denied' && end.result === undefined);
  }).length;
  const callIds = starts.map(x => x.event.data?.toolCallId);
  const uniqueCalls = callIds.every(Boolean) && new Set(callIds).size === callIds.length;
  const originals = manifest.map(item => safeRead(fixture, item.path, null));
  const cleanOriginals = originals.every(bytes => manifest.every(item => !bytes.includes(item.marker)));
  const rows = manifest.map((item, index) => {
    const attempts = starts.filter(x => x.event.data?.toolName === 'task' && x.event.data?.arguments?.agent_type === item.name);
    const task = attempts.filter(attempt => completion(attempt)?.event.data?.success === true);
    const id = task.length === 1 ? task[0].event.data.toolCallId : null;
    const started = indexed.filter(x => x.event.type === 'subagent.started' && x.event.data?.toolCallId === id && x.event.data?.agentName === item.name && x.event.data?.agentType === item.name);
    const selected = indexed.filter(x => x.event.type === 'subagent.selected' && x.event.data?.agentName === item.name);
    const completed = indexed.filter(x => x.event.type === 'subagent.completed' && x.event.data?.toolCallId === id && x.event.data?.agentName === item.name);
    const childFinals = indexed.filter(x => x.event.type === 'assistant.message' && x.event.data?.phase === 'final_answer' && x.event.data?.parentToolCallId === id);
    const views = starts.filter(x => x.event.data?.toolName === 'view' && x.event.data?.parentToolCallId === id && typeof x.event.data?.arguments?.path === 'string' && resolve(x.event.data.arguments.path) === resolve(project, item.path));
    const verifiedViews = views.filter(view => {
      const end = completion(view), content = end?.event.data?.result?.content;
      return end?.event.data?.success === true && typeof content === 'string' && content.includes(item.marker) && view.index < end.index && started.length === 1 && selected.length === 1 && completed.length === 1 && selected[0].index < view.index && end.index < completed[0].index;
    });
    const taskEnd = task.length === 1 ? completion(task[0]) : null;
    const original = originals[index], actual = safeRead(project, item.path, null), packed = safeRead(packageRoot, item.path, null);
    const expected = Buffer.concat([original, Buffer.from(`\nMarcador sintético de teste: ${item.marker}.\n`)]);
    const wrapperPath = `.github/agents/${item.name}.agent.md`;
    const wrapper = safeRead(project, wrapperPath), originalWrapper = safeRead(fixture, wrapperPath);
    const expectedWrapper = label === 'path' ? originalWrapper.replace('[origem](', `[${item.path}](`) : originalWrapper;
    const links = [...wrapper.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
    const link = links.length === 1 ? links[0] : null;
    const loaded = indexed.filter(x => x.event.type === 'session.custom_agents_updated' && x.index < (task[0]?.index ?? -1)).at(-1)?.event.data?.agents;
    const loadedMatches = Array.isArray(loaded) ? loaded.filter(agent => agent?.name === item.name) : [];
    const checks = {
      markerAbsentFromPrompt: !prompt.includes(item.marker), cleanOriginals,
      agentAvailable: loadedMatches.length === 1 && loadedMatches[0].source === 'project' && loadedMatches[0].userInvocable === true,
      delegatedOnce: task.length === 1 && taskEnd?.event.data?.success === true && attempts.every(attempt => typeof completion(attempt)?.event.data?.success === 'boolean'),
      // The task tool returns an acknowledgement before background work ends;
      // the actual completion is the separately ordered subagent.completed event.
      backgroundAcknowledged: task.length === 1 && task[0].event.data?.arguments?.mode === 'background' && started.length === 1 && started[0].event.data?.executionMode === 'background' && typeof taskEnd?.event.data?.result?.content === 'string' && /^Agent started in background with agent_id: [a-f0-9-]{36}/.test(taskEnd.event.data.result.content),
      selectedAndCompletedOnce: started.length === 1 && selected.length === 1 && completed.length === 1,
      sourceReadByOwnAgent: verifiedViews.length > 0,
      childReturnedMarker: childFinals.some(x => typeof x.event.data?.content === 'string' && x.event.data.content.includes(item.marker) && verifiedViews.some(view => completion(view).index < x.index) && completed.length === 1 && x.index < completed[0].index),
      executionOrder: Boolean(final && task.length === 1 && taskEnd && started.length === 1 && selected.length === 1 && completed.length === 1) && task[0].index < started[0].index && task[0].index < taskEnd.index && taskEnd.index < completed[0].index && started[0].index < selected[0].index && selected[0].index < completed[0].index && completed[0].index < final.index,
      answerMatches: answers?.[item.name] === item.marker,
      fixtureOriginalUnchanged: hash(original) === item.originalSha256 && original.equals(packed),
      sourceUnchangedAfterSetup: hash(actual) === item.alteredSha256 && actual.equals(expected),
      wrapperPointsToSource: wrapper === expectedWrapper && Boolean(link) && link[1] === (label === 'path' ? item.path : 'origem') && resolve(dirname(join(project, wrapperPath)), decodeURIComponent(link[2])) === resolve(project, item.path),
    };
    return { name: item.name, path: item.path, attempts: attempts.length,
      failedAttempts: attempts.filter(attempt => completion(attempt)?.event.data?.success === false).length,
      status: Object.values(checks).every(Boolean) ? 'passed' : 'not-verified', checks };
  });
  const documentsPreserved = ['README.md', '.gitignore'].every(file => {
    const before = optional(fixture, file), after = optional(project, file);
    return before === null ? after === null : after !== null && before.equals(after);
  });
  const results = indexed.filter(x => x.event.type === 'result'), result = results.length === 1 ? results[0] : null;
  const processPassed = process?.code === 0 && !process.signal && !process.error && process.timedOut === false && result?.event.exitCode === 0 && Boolean(final) && final.index < result.index;
  const passed = processPassed && uniqueCalls && unexpectedTools.length === 0 && unexpectedAgents.length === 0 && outsideUnverified === 0 && documentsPreserved && rows.every(row => row.status === 'passed');
  return { passed, processPassed, uniqueCalls, unexpectedTools, unexpectedAgents, outsideAttempts: outsideAttempts.length, outsideUnverified, documentsPreserved,
    total: rows.length, verified: rows.filter(row => row.status === 'passed').length, rows,
    limitation: 'Delegação explícita e leitura da origem; não prova o fluxo completo dos perfis.' };
}

function main(args) {
  if (args.length !== 4 || !['original', 'path'].includes(args[3])) throw Error('Uso: node tests/copilot-fleet-evidence.mjs <pasta-da-prova> <fixture-original> <pacote> <original|path>');
  const root = realpathSync(resolve(args[0])), fixture = realpathSync(resolve(args[1])), packageRoot = realpathSync(resolve(args[2]));
  const json = name => JSON.parse(readFileSync(join(root, name), 'utf8'));
  const text = name => readFileSync(join(root, name), 'utf8');
  const events = text('events.jsonl').split('\n').filter(Boolean).map(JSON.parse);
  const report = assessFleetEvidence({ project: join(root, 'project'), fixture, packageRoot, manifest: json('manifest.json'), events, prompt: text('prompt.txt'), process: json('process.json'), label: args[3] });
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}

let entry = false;
try { entry = Boolean(process.argv[1]) && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url)); } catch { /* import */ }
if (entry) { try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
