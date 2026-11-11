#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { isMain, projectRoot, requireNode } from '../lib/runtime.mjs';
import { buildCatalog } from '../lib/catalog.mjs';
import { isGeneratedOutput } from '../lib/gitignore.mjs';

const fail = message => { throw new Error(message); };
const normalize = value => value.split(sep).join('/');
const excluded = new Set(['node_modules', '.git', 'opencode-loop', '.agent-tests']);
const toolState = new Set(['bin', '.cache', 'npm-cache']);
const auxiliary = ['templates', 'scripts', 'tools', 'external-skills', 'adapters', 'estado', 'tests', 'docs'];

function checkedStat(root, location) {
  let item;
  try { item = lstatSync(location); }
  catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null; throw error; }
  if (item.isSymbolicLink()) fail(`Link simbolico: ${normalize(relative(root, location))}`);
  return item;
}

export function registryRoots(root) {
  checkedStat(root, join(root, '.pbai4devs'));
  const file = join(root, '.pbai4devs/espelhos.conf');
  checkedStat(root, file);
  const rows = readFileSync(file, 'utf8')
    .split(/\r?\n/).filter(line => /^(?:agente|documento)\|/.test(line))
    .map(line => line.split('|'));
  return { agents: rows.filter(row => row[0] === 'agente').map(row => row[1]), paths: rows.map(row => row[1]) };
}

function walk(root, location, files, { skipTools = true } = {}) {
  const path = normalize(relative(root, location));
  if (/^examples\/generated(?:\/|$)/i.test(path)) return;
  const item = checkedStat(root, location);
  if (!item) return;
  if (location === join(root, '.pbai4devs/external-skills/.local')) return;
  if (skipTools && location === join(root, '.pbai4devs/tools')) return;
  if (isGeneratedOutput(normalize(relative(root, location)), item.isDirectory())) return;
  if (item.isDirectory()) {
    if (excluded.has(basename(location))) return;
    for (const child of readdirSync(location).sort()) walk(root, join(location, child), files, { skipTools });
  } else if (item.isFile() && ['.md', '.mdc'].includes(extname(location).toLowerCase())) files.add(location);
}

export function collectMarkdown(root, registry = registryRoots(root)) {
  const agents = join(root, '.pbai4devs');
  checkedStat(root, agents);
  for (const directory of readdirSync(agents, { withFileTypes: true })) {
    const location = join(agents, directory.name);
    const item = checkedStat(root, location);
    if (isGeneratedOutput(normalize(relative(root, location)), item?.isDirectory())) continue;
    if (item?.isDirectory() && !checkedStat(root, join(location, 'README.md'))?.isFile()) fail(`README ausente: .pbai4devs/${directory.name}/`);
  }
  const files = new Set();
  const rootMarkdown = readdirSync(root).filter(name => ['.md', '.mdc'].includes(extname(name).toLowerCase()));
  const sources = ['.pbai4devs', 'docs', 'src', 'bin', 'tests', 'scripts', 'examples',
    '.github/PULL_REQUEST_TEMPLATE.md', '.github/ISSUE_TEMPLATE', ...rootMarkdown];
  for (const name of [...sources, ...registry.paths]) walk(root, resolve(root, name), files);
  const tools = join(agents, 'tools');
  if (checkedStat(root, tools)) {
    const guide = join(tools, 'README.md');
    if (!checkedStat(root, guide)?.isFile()) fail('README ausente: .pbai4devs/tools/');
    walk(root, guide, files);
    for (const item of readdirSync(tools, { withFileTypes: true })) {
      if (toolState.has(item.name) || item.name.startsWith('.')) continue;
      if (!checkedStat(root, join(tools, item.name))?.isDirectory()) continue;
      const file = join(tools, item.name, 'README.md');
      const guide = checkedStat(root, file);
      if (checkedStat(root, join(tools, item.name, 'TOOL.json')) && !guide?.isFile()) fail(`README ausente: .pbai4devs/tools/${item.name}/`);
      if (guide) walk(root, file, files);
    }
  }
  return [...files].sort();
}

export function checkFrontmatter(text, file) {
  const lines = text.replaceAll('\r', '').split('\n');
  const closing = lines.indexOf('---', 1);
  const first = closing > 0 ? lines.slice(closing + 1).find(line => line.trim()) : undefined;
  if (lines[0] !== '---' || closing < 1 || !first?.startsWith('# ')) fail(`Frontmatter/H1 invalido: ${file}`);
}

function withoutFences(text) {
  let fence;
  return text.split(/\r?\n/).map(line => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      return '';
    }
    return fence ? '' : line;
  }).join('\n');
}

export function localLinkTargets(text) {
  const content = withoutFences(text);
  const targets = [...content.matchAll(/\]\((<[^>]*>|[^)]*)\)/g)].map(match => match[1]);
  for (const match of content.matchAll(/^\s{0,3}\[[^\]^][^\]]*\]:\s*(<[^>]+>|\S+)/gm)) targets.push(match[1]);
  return targets.map(value => {
    const raw = value.trim();
    const target = raw.startsWith('<') ? raw.slice(1, raw.indexOf('>')) : raw.split(/\s+["']/)[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) return null;
    const file = target.split(/[?#]/)[0];
    if (!file) return null;
    try { return decodeURIComponent(file); }
    catch { fail(`Link com codificacao invalida: ${target}`); }
  }).filter(Boolean);
}

export function checkMarkdown(root, files, { virtualPaths = new Set() } = {}) {
  for (const file of files) {
    const label = normalize(relative(root, file));
    const text = readFileSync(file, 'utf8');
    checkFrontmatter(text, label);
    for (const target of localLinkTargets(text)) {
      const destination = resolve(dirname(file), target);
      if (!existsSync(destination) && !virtualPaths.has(normalize(relative(root, destination)))) fail(`Link ausente: ${label} -> ${target}`);
    }
  }
}

export function resourcePaths(text) {
  const result = new Set();
  for (const match of text.matchAll(/(?<![\w/.-])\.pbai4devs\/(?:scripts|tools|commands|templates)\/[^\s`'"\[\])]+/g)) {
    let path = match[0].replace(/[.,;:]+$/, '');
    if (/[<>{}$*]/.test(path) || path.split('/').includes('...')) continue;
    try { path = decodeURIComponent(path.split(/[?#]/)[0]); } catch { fail(`Referencia com codificacao invalida: ${path}`); }
    if (path.split('/').some(part => ['.local', '.cache', 'node_modules'].includes(part)) || /^\.pbai4devs\/tools\/(?:bin|npm-cache)(?:\/|$)/.test(path)) continue;
    result.add(path.replace(/\/$/, ''));
  }
  return [...result].sort();
}

export function checkResourceReferences(root, files) {
  for (const file of files) for (const path of resourcePaths(readFileSync(file, 'utf8'))) {
    const location = resolve(root, path); const child = relative(root, location);
    if (isAbsolute(child) || child === '..' || child.startsWith(`..${sep}`) || path.split('/').some(part => part === '..')) fail(`Referencia fora do projeto: ${path}`);
    let current = root;
    for (const part of child.split(sep)) { current = join(current, part); if (!checkedStat(root, current)) fail(`Recurso ausente: ${normalize(relative(root, file))} -> ${path}`); }
    if (/\.(?:mjs|cjs|js|md|mdc|json)$/.test(path) && !checkedStat(root, location).isFile()) fail(`Recurso deve ser arquivo: ${path}`);
  }
}

export function checkCatalog(root, build = buildCatalog) {
  const result = build(root);
  for (const [path, expected] of result.outputs) {
    const file = resolve(root, path); const child = relative(root, file);
    if (isAbsolute(child) || child === '..' || child.startsWith(`..${sep}`)) fail(`Saida de catalogo fora do projeto: ${path}`);
    if (!checkedStat(root, file)?.isFile() || readFileSync(file, 'utf8') !== expected) fail(`Catalogo divergente: ${path}; execute sincronizar-agentes.`);
  }
  return result.catalog;
}

export function checkAgentExtras(root, agents) {
  for (const agent of agents) {
    for (const name of auxiliary) if (existsSync(join(root, agent, name))) fail(`Auxiliar indevido em ${agent}/${name}`);
    const files = new Set();
    walk(root, join(root, agent), files);
    if ([...files].some(file => ['README.md', 'INSTRUCTIONS.md'].includes(basename(file)))) fail(`Guia indevido em ${agent}`);
  }
}

export function checkSynchronization(root, run = spawnSync) {
  const result = run(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--check'], { cwd: root, encoding: 'utf8', timeout: 60000 });
  if (result.error) throw result.error;
  if (result.status !== 0) fail(result.stderr?.trim() || result.stdout?.trim() || 'Espelhos divergentes.');
}

export function checkLint(root, files, run = spawnSync) {
  const current = join(root, '.pbai4devs/tools/markdownlint-cli2/.local/CURRENT.json');
  const legacy = join(root, '.pbai4devs/tools/markdownlint-cli2/CURRENT.json');
  if (!existsSync(current) && !existsSync(legacy)) return ['markdownlint-cli2=missing; verificacao nativa de estrutura e links executada.'];
  const script = join(root, '.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs');
  const result = run(process.execPath, [script, 'run', 'markdownlint-cli2', ...files], { cwd: root, encoding: 'utf8', timeout: 60000 });
  if (result.error) throw result.error;
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  if (result.status !== 0) fail(output.split('\n').filter(line => !line.startsWith('Finding:')).join('\n') || 'Markdown lint falhou.');
  return output.split('\n').filter(line => /^(?:Linting:|Summary:)/.test(line));
}

export function verifyResources({ root = projectRoot, sourceOnly = false, synchronize = checkSynchronization, lint = checkLint, catalogCheck = checkCatalog } = {}) {
  requireNode();
  const built = sourceOnly ? buildCatalog(root) : null;
  if (!sourceOnly) { synchronize(root); catalogCheck(root); }
  const registry = sourceOnly ? { agents: [], paths: [] } : registryRoots(root);
  const files = collectMarkdown(root, registry);
  const virtualPaths = new Set(sourceOnly ? [...built.outputs.keys(), '.pbai4devs/espelhos.conf'] : []);
  checkMarkdown(root, files, { virtualPaths });
  checkResourceReferences(root, files);
  checkAgentExtras(root, registry.agents);
  return { files, messages: [...lint(root, files), 'recursos=passed'] };
}

export function main(args = process.argv.slice(2), options = {}) {
  requireNode();
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) { console.log('Uso: node .pbai4devs/scripts/verificar-recursos/SCRIPT.mjs [--source-only]'); return 0; }
  if (args.length && !(args.length === 1 && args[0] === '--source-only')) fail('Opcao invalida; use --help.');
  if (args.includes('--source-only')) options = { ...options, sourceOnly: true };
  for (const message of verifyResources(options).messages) console.log(message);
  return 0;
}

if (isMain(import.meta.url)) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
