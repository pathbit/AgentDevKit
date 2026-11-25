#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeRead } from './native-client-matrix.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const markerPattern = /^ADK_COPILOT_[0-9]{2}_[0-9A-F]{10}$/;
const sourcePattern = /^\.pbai4devs\/skills\/[a-z0-9/-]+\/SKILL\.md$/;

function optional(root, file) {
  try { return safeRead(root, file, null); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

// This audits explicit invocation and source reads, not complete skill workflows.
export function assessCopilotEvidence({ project, fixture, packageRoot, manifest, events, prompt, process }) {
  if (!Array.isArray(manifest) || !manifest.length || !Array.isArray(events) || typeof prompt !== 'string') throw Error('Evidência inválida.');
  for (const key of ['name', 'path', 'marker']) {
    if (new Set(manifest.map(item => item?.[key])).size !== manifest.length) throw Error(`Campo duplicado: ${key}.`);
  }
  if (manifest.some(item => !/^[a-z0-9-]+$/.test(item.name) || !sourcePattern.test(item.path) || !markerPattern.test(item.marker))) throw Error('Manifesto inválido.');
  const indexed = events.map((event, index) => ({ event, index }));
  const starts = indexed.filter(x => x.event.type === 'tool.execution_start');
  const completions = indexed.filter(x => x.event.type === 'tool.execution_complete');
  const completion = call => {
    const matches = completions.filter(item => item.event.data?.toolCallId === call?.event.data?.toolCallId);
    return matches.length === 1 ? matches[0] : null;
  };
  const finals = indexed.filter(x => x.event.type === 'assistant.message' && x.event.data?.phase === 'final_answer');
  const final = finals.length === 1 ? finals[0] : null;
  let answers = null;
  try {
    const content = (final?.event.data?.content || '').trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/, '$1');
    const keys = [...content.matchAll(/"([a-z0-9-]+)"\s*:/g)].map(match => match[1]);
    const parsed = JSON.parse(content);
    if (parsed && !Array.isArray(parsed) && typeof parsed === 'object' && keys.length === manifest.length && new Set(keys).size === keys.length && Object.keys(parsed).length === manifest.length) answers = parsed;
  } catch { /* unproven response */ }
  const expectedNames = new Set(manifest.map(item => item.name));
  const expectedPaths = new Set(manifest.map(item => resolve(project, item.path)));
  const unexpectedTools = starts.filter(({ event }) => {
    const { toolName, arguments: args } = event.data || {};
    if (toolName === 'skill') return !expectedNames.has(args?.skill);
    if (toolName === 'view') return typeof args?.path !== 'string' || !expectedPaths.has(resolve(args.path));
    return true;
  }).map(({ event }) => event.data?.toolName || 'unknown');
  const callIds = starts.map(x => x.event.data?.toolCallId);
  const uniqueCalls = callIds.every(Boolean) && new Set(callIds).size === callIds.length;
  const originals = manifest.map(item => safeRead(fixture, item.path, null));
  const packageSources = manifest.map(item => safeRead(packageRoot, item.path, null));
  const cleanOriginals = originals.every(bytes => manifest.every(item => !bytes.includes(item.marker)));
  const rows = manifest.map((item, index) => {
    const skills = starts.filter(x => x.event.data?.toolName === 'skill' && x.event.data?.arguments?.skill === item.name);
    const views = starts.filter(x => x.event.data?.toolName === 'view' && typeof x.event.data?.arguments?.path === 'string' && resolve(x.event.data.arguments.path) === resolve(project, item.path));
    const skill = skills.length === 1 ? completion(skills[0]) : null;
    const view = views.length === 1 ? completion(views[0]) : null;
    const original = originals[index], actual = safeRead(project, item.path, null);
    const expected = Buffer.concat([original, Buffer.from(`\nMarcador sintético de teste: ${item.marker}.\n`)]);
    const wrapperPath = `.github/skills/${item.name}/SKILL.md`;
    const wrapper = safeRead(project, wrapperPath);
    const originalWrapper = safeRead(fixture, wrapperPath);
    const link = wrapper.match(/^---\r?\n(?:(?!---(?:\r?\n|$))[^\r\n]*\r?\n)*---\r?\n\r?\n# [^\r\n]+\r?\n\r?\n<!-- gerado: sincronizar-agentes -->\r?\nLeia e siga \[origem\]\(([^)\r\n]+)\)\.\r?\n?$/);
    const loaded = skills.length === 1 ? events.slice(0, skills[0].index).filter(event => event.type === 'session.skills_loaded').at(-1)?.data?.skills : null;
    const loadedMatches = Array.isArray(loaded) ? loaded.filter(row => row?.name === item.name) : [];
    const checks = {
      markerAbsentFromPrompt: !prompt.includes(item.marker), cleanOriginals,
      skillCalledOnce: skills.length === 1,
      skillFromProject: skill?.event.data?.success === true && skill.event.data?.toolTelemetry?.properties?.skillSource === 'project',
      discoveredExpectedWrapper: loadedMatches.length === 1 && loadedMatches[0].source === 'project' && loadedMatches[0].enabled === true && typeof loadedMatches[0].path === 'string' && resolve(loadedMatches[0].path) === resolve(project, wrapperPath),
      wrapperPointsToSource: Boolean(link) && wrapper === originalWrapper && resolve(dirname(join(project, wrapperPath)), decodeURIComponent(link[1])) === resolve(project, item.path),
      originReadOnce: views.length === 1 && view?.event.data?.success === true,
      executionOrder: skills.length === 1 && views.length === 1 && Boolean(skill && view && final) && skills[0].index < skill.index && skill.index < views[0].index && views[0].index < view.index && view.index < final.index,
      readContainsMarker: typeof view?.event.data?.result?.content === 'string' && view.event.data.result.content.includes(item.marker),
      answerMatches: answers?.[item.name] === item.marker,
      fixtureOriginalUnchanged: hash(original) === item.originalSha256 && original.equals(packageSources[index]),
      sourceUnchangedAfterSetup: hash(actual) === item.alteredSha256 && actual.equals(expected),
    };
    return { name: item.name, path: item.path, status: Object.values(checks).every(Boolean) ? 'passed' : 'not-verified', checks };
  });
  const documentsPreserved = ['README.md', '.gitignore'].every(file => {
    const before = optional(fixture, file), after = optional(project, file);
    return before === null ? after === null : after !== null && before.equals(after);
  });
  const results = indexed.filter(x => x.event.type === 'result');
  const result = results.length === 1 ? results[0] : null;
  const processPassed = process?.code === 0 && !process.signal && !process.error && process.timedOut === false && result?.event.exitCode === 0 && Boolean(final) && final.index < result.index;
  const passed = processPassed && uniqueCalls && unexpectedTools.length === 0 && documentsPreserved && rows.every(row => row.status === 'passed');
  return { passed, processPassed, uniqueCalls, unexpectedTools, documentsPreserved,
    total: rows.length, verified: rows.filter(row => row.status === 'passed').length, rows,
    limitation: 'Invocação explícita e leitura da origem; não prova o fluxo completo da skill.' };
}

function main(args) {
  if (args.length !== 3) throw Error('Uso: node tests/copilot-evidence.mjs <pasta-da-prova> <fixture-original> <pacote>');
  const root = realpathSync(resolve(args[0])), fixture = realpathSync(resolve(args[1])), packageRoot = realpathSync(resolve(args[2]));
  const json = name => JSON.parse(readFileSync(join(root, name), 'utf8'));
  const text = name => readFileSync(join(root, name), 'utf8');
  const events = text('events.jsonl').split('\n').filter(Boolean).map(JSON.parse);
  const report = assessCopilotEvidence({ project: join(root, 'project'), fixture, packageRoot, manifest: json('manifest.json'), events, prompt: text('prompt.txt'), process: json('process.json') });
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}

let entry = false;
try { entry = Boolean(process.argv[1]) && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url)); } catch { /* import */ }
if (entry) { try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
