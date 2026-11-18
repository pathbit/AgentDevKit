#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeRead } from './native-client-matrix.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inside = (root, path) => { const part = relative(root, path); return part !== '..' && !part.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(part); };
const optional = (root, path) => { try { return safeRead(root, path, null); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };

// Proof of explicit skill invocation and source reading, not completion of the skill workflow.
export function assessClaudeEvidence({ project, fixture, packageRoot, manifest, events, prompt, process: outcome }) {
  if (!Array.isArray(manifest) || !manifest.length || !Array.isArray(events) || typeof prompt !== 'string') throw Error('Evidência inválida.');
  for (const key of ['name', 'path', 'marker']) if (new Set(manifest.map(item => item?.[key])).size !== manifest.length) throw Error(`Campo duplicado: ${key}.`);
  if (manifest.some(item => !/^[a-z0-9-]+$/.test(item.name) || !/^\.pbai4devs\/skills\/[a-z0-9/-]+\/SKILL\.md$/.test(item.path) || !/^ADK_CLAUDE_[0-9]{2}_[0-9A-F]{10}$/.test(item.marker))) throw Error('Manifesto inválido.');
  const indexed = events.map((event, index) => ({ event, index }));
  const blocks = indexed.flatMap(({ event, index }) => Array.isArray(event.message?.content) ? event.message.content.map((block, subindex) => ({ event, index, subindex, block })) : []);
  const calls = blocks.filter(x => x.event.type === 'assistant' && x.block.type === 'tool_use');
  const results = blocks.filter(x => x.event.type === 'user' && x.block.type === 'tool_result');
  const completion = call => { const found = results.filter(x => x.block.tool_use_id === call?.block.id); return found.length === 1 && found[0].index > call.index ? found[0] : null; };
  const ids = calls.map(x => x.block.id);
  const uniqueCalls = ids.every(Boolean) && new Set(ids).size === ids.length && results.every(x => ids.includes(x.block.tool_use_id)) && calls.every(call => completion(call));
  const initial = indexed.filter(x => x.event.type === 'system' && x.event.subtype === 'init');
  const init = initial.length === 1 ? initial[0].event : null;
  const finals = indexed.filter(x => x.event.type === 'result');
  const final = finals.length === 1 ? finals[0] : null;
  let answers = null;
  try {
    const content = final.event.result.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/, '$1');
    const keys = [...content.matchAll(/"([a-z0-9-]+)"\s*:/g)].map(x => x[1]);
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && keys.length === manifest.length && new Set(keys).size === keys.length && Object.keys(parsed).length === manifest.length) answers = parsed;
  } catch { /* incomplete final output */ }
  const expectedNames = new Set(manifest.map(item => item.name));
  const unexpectedTools = calls.filter(x => !['Read', 'Skill'].includes(x.block.name) || (x.block.name === 'Skill' && !expectedNames.has(x.block.input?.skill))).map(x => x.block.name);
  const external = calls.filter(x => x.block.name === 'Read' && (typeof x.block.input?.file_path !== 'string' || !inside(project, resolve(project, x.block.input.file_path))));
  const externalUnverified = external.filter(call => {
    const result = completion(call)?.block;
    return result?.is_error !== true || typeof result.content !== 'string' || !/^(?:File does not exist\.|(?:Error: )?(?:EACCES|EPERM|Permission denied))$/.test(result.content);
  }).length;
  const originals = manifest.map(item => safeRead(fixture, item.path, null));
  const cleanOriginals = originals.every(bytes => manifest.every(item => !bytes.includes(item.marker)));
  const rows = manifest.map((item, index) => {
    const skillCalls = calls.filter(x => x.block.name === 'Skill' && x.block.input?.skill === item.name);
    const readCalls = calls.filter(x => x.block.name === 'Read' && typeof x.block.input?.file_path === 'string' && resolve(project, x.block.input.file_path) === resolve(project, item.path));
    const skill = skillCalls.length === 1 ? skillCalls[0] : null, read = readCalls.length === 1 ? readCalls[0] : null;
    const skillResult = skill && completion(skill), readResult = read && completion(read);
    const returned = skillResult?.block.content;
    const skillReturn = {
      contentType: !skillResult ? 'unavailable' : !Object.hasOwn(skillResult.block, 'content') ? 'absent' : typeof returned === 'string' ? 'text' : Array.isArray(returned) ? 'array' : 'other',
      expectedLaunch: typeof returned === 'string' ? returned === `Launching skill: ${item.name}` : null,
    };
    const base = blocks.filter(x => x.event.type === 'user' && x.block.type === 'text' && typeof x.block.text === 'string' && x.block.text.startsWith(`Base directory for this skill: ${join(project, '.claude/skills', item.name)}\n`));
    const original = originals[index], actual = safeRead(project, item.path, null);
    const wrapperPath = `.claude/skills/${item.name}/SKILL.md`, wrapper = safeRead(project, wrapperPath);
    const link = wrapper.match(/^---\r?\n(?:(?!---(?:\r?\n|$))[^\r\n]*\r?\n)*---\r?\n\r?\n# [^\r\n]+\r?\n\r?\n<!-- gerado: sincronizar-agentes -->\r?\nLeia e siga \[origem\]\(([^)\r\n]+)\)\.\r?\n?$/);
    const checks = {
      markerAbsentFromPrompt: !prompt.includes(item.marker), cleanOriginals,
      discovered: Array.isArray(init?.skills) && init.skills.filter(name => name === item.name).length === 1,
      skillCalledOnce: skillCalls.length === 1 && skillResult?.block.is_error !== true && skillResult?.event.tool_use_result?.success === true && skillResult?.event.tool_use_result?.commandName === item.name,
      wrapperLoaded: base.length === 1 && base[0].block.text === `Base directory for this skill: ${join(project, '.claude/skills', item.name)}\n\n${wrapper.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n\r?\n/, '')}`,
      wrapperPointsToSource: Boolean(link) && wrapper === safeRead(fixture, wrapperPath) && resolve(dirname(join(project, wrapperPath)), decodeURIComponent(link[1])) === resolve(project, item.path),
      sourceReadOnce: readCalls.length === 1 && readResult?.block.is_error !== true && typeof readResult?.block.content === 'string' && readResult.block.content.includes(item.marker),
      order: Boolean(skill && skillResult && base.length === 1 && read && readResult && final) && skill.index < skillResult.index && skillResult.index < base[0].index && base[0].index < read.index && read.index < readResult.index && readResult.index < final.index,
      answerMatches: answers?.[item.name] === item.marker,
      originalMatchesPackage: hash(original) === item.originalSha256 && original.equals(safeRead(packageRoot, item.path, null)),
      sourceUnchangedAfterSetup: hash(actual) === item.alteredSha256 && actual.equals(Buffer.concat([original, Buffer.from(`\nMarcador sintético de teste: ${item.marker}.\n`)])),
    };
    return { name: item.name, path: item.path, status: Object.values(checks).every(Boolean) ? 'passed' : 'not-verified', skillReturn, checks };
  });
  const documentsPreserved = ['README.md', '.gitignore'].every(file => { const before = optional(fixture, file), after = optional(project, file); return before === null ? after === null : after !== null && before.equals(after); });
  const processPassed = outcome?.code === 0 && !outcome.signal && !outcome.error && outcome.timedOut === false && final?.event.is_error === false && init && Array.isArray(init.tools) && init.tools.length === 2 && init.tools.includes('Skill') && init.tools.includes('Read');
  const passed = Boolean(processPassed && uniqueCalls && !unexpectedTools.length && !externalUnverified && documentsPreserved && rows.every(row => row.status === 'passed'));
  return { passed, processPassed: Boolean(processPassed), uniqueCalls, unexpectedTools, outsideAttempts: external.length, outsideUnverified: externalUnverified, documentsPreserved, total: rows.length, verified: rows.filter(row => row.status === 'passed').length, rows, limitation: 'Invocação explícita e leitura da origem; não prova o fluxo completo da skill.' };
}

function main(args) {
  if (args.length !== 3) throw Error('Uso: node tests/claude-evidence.mjs <pasta-da-prova> <fixture-original> <pacote>');
  const root = realpathSync(resolve(args[0])), fixture = realpathSync(resolve(args[1])), packageRoot = realpathSync(resolve(args[2]));
  const json = name => JSON.parse(readFileSync(join(root, name), 'utf8'));
  const text = name => readFileSync(join(root, name), 'utf8');
  const report = assessClaudeEvidence({ project: join(root, 'project'), fixture, packageRoot, manifest: json('manifest.json'), events: text('events.jsonl').split('\n').filter(Boolean).map(JSON.parse), prompt: text('prompt.txt'), process: json('process.json') });
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}
let entry = false;
try { entry = Boolean(process.argv[1]) && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url)); } catch { /* imported */ }
if (entry) { try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
