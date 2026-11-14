#!/usr/bin/env node
// Planeja em memória; somente os caminhos gerenciados pelo manifesto são alterados.
import { chmodSync, cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { requireNode, projectRoot, isMain } from '../lib/runtime.mjs';
import { buildCatalog } from '../lib/catalog.mjs';
import { resourcePath } from '../lib/resource-path.mjs';
import { adapterManifest, resolveAdapters } from '../lib/adapters.mjs';
import { nativePathBoundary } from '../lib/native-paths.mjs';
import { canonicalEntrypoint, resolveEntrypoint, entrypointReference, renderEntrypointImports, extractManagedBlock, mergeManagedContent, stripManagedContent } from '../lib/managed-content.mjs';
import { extractTomlManagedBlock, mergeTomlContent, stripTomlContent } from '../lib/managed-toml.mjs';
import { mergeGitignore, validateIgnoreClients, renderClientIgnore, isGeneratedOutput, planLocalIgnore, applyLocalIgnore, checkLocalIgnore, assertLocalIgnoreUnchanged, planUntrack, ignoreBegin, ignoreEnd } from '../lib/gitignore.mjs';
import { stateDirectory } from '../lib/state-path.mjs';

const marker = '<!-- gerado: sincronizar-agentes -->';
const tomlMarker = '# gerado: sincronizar-agentes';
const principals = { skills: 'SKILL.md', agents: 'AGENT.md', commands: 'COMMAND.md', rules: 'RULE.md' };
const auxiliary = ['templates', 'scripts', 'tools', 'external-skills', 'state', 'estado', 'tests', 'docs', 'adapters'];
const reserved = new Set(['.git', '.pbai4devs', '.agent-tests']);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sorted = values => [...new Set(values)].sort(compare);
const layouts = new Set(['agrupado', 'plano', 'arquivo', 'mdc', 'instrucoes', 'prompt', 'agente', 'nenhum']);
const fail = message => { throw new Error(message); };
const normalize = text => text.replace(/\r\n?/g, '\n');
const read = file => normalize(readFileSync(file, 'utf8'));
const stat = file => {
  try { return lstatSync(file); }
  catch (error) { if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null; throw error; }
};

function replaceJsonMember(bytes, member, value) {
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) fail('Invalid UTF-8 in derived state.');
  let i = 0;
  const space = () => { while (/\s/.test(text[i] || '') && i < text.length) i++; };
  const stringEnd = () => {
    if (text[i++] !== '"') fail('Invalid JSON member.');
    while (i < text.length) {
      const char = text[i++];
      if (char === '\\') { i++; continue; }
      if (char === '"') return;
    }
    fail('Unterminated JSON string.');
  };
  space(); if (text[i++] !== '{') fail('Invalid derived state.');
  const properties = [];
  while (true) {
    space(); if (text[i] === '}') break;
    const start = i; stringEnd(); const key = JSON.parse(text.slice(start, i));
    space(); if (text[i++] !== ':') fail('Invalid JSON member.');
    space(); const valueStart = i;
    if (text[i] === '"') stringEnd();
    else if (text[i] === '{' || text[i] === '[') {
      const stack = [];
      do {
        const char = text[i];
        if (char === '"') { stringEnd(); continue; }
        i++;
        if (char === '{' || char === '[') stack.push(char);
        else if (char === '}' || char === ']') stack.pop();
      } while (stack.length && i < text.length);
      if (stack.length) fail('Invalid derived state.');
    } else { while (i < text.length && text[i] !== ',' && text[i] !== '}') i++; while (i > valueStart && /\s/.test(text[i - 1])) i--; }
    const end = i; properties.push({ key, start, valueStart, end });
    space(); if (text[i] === ',') { i++; continue; } if (text[i] === '}') break;
    fail('Invalid JSON member separator.');
  }
  const matches = properties.filter(item => item.key === member);
  if (matches.length > 1) fail('Ambiguous derived state member.');
  if (!matches.length) {
    if (value === undefined) return bytes;
    const insertion = `${properties.length ? ',' : ''}\n  ${JSON.stringify(member)}: ${JSON.stringify(value, null, 2)}\n`;
    const next = text.slice(0, i) + insertion + text.slice(i);
    try { JSON.parse(next); } catch { fail('Unable to preserve derived state safely.'); }
    return Buffer.from(next);
  }
  const current = matches[0], index = properties.indexOf(current);
  let next;
  if (value !== undefined) next = text.slice(0, current.valueStart) + JSON.stringify(value, null, 2) + text.slice(current.end);
  else if (index > 0) next = text.slice(0, properties[index - 1].end) + text.slice(current.end);
  else if (properties.length > 1) next = text.slice(0, current.start) + text.slice(properties[1].start);
  else next = text.slice(0, current.start) + text.slice(current.end);
  try { JSON.parse(next); } catch { fail('Unable to preserve derived state safely.'); }
  return Buffer.from(next);
}


// Compare owned fields structurally, preserving all other JSON bytes.
function derivedContent(original, previous, next) {
  if (!original) return JSON.stringify(next, null, 2) + '\n';
  const keys = ['schemaVersion', 'entries', 'outputs', 'files', 'blocks', 'removedBlocks', 'removedFiles', 'catalogs', 'config'];
  const canonical = value => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort(compare).map(key => [key, canonical(value[key])]))
    : Array.isArray(value) ? value.map(canonical) : value;
  let result = original;
  for (const key of keys) {
    if (JSON.stringify(canonical(previous[key])) !== JSON.stringify(canonical(next[key]))) result = replaceJsonMember(result, key, next[key]);
  }
  return result.toString('utf8');
}

export function header(text) {
  const lines = normalize(text).split('\n');
  if (lines[0] !== '---') fail('Frontmatter YAML ausente.');
  const end = lines.indexOf('---', 1);
  if (end < 0) fail('Frontmatter YAML sem fechamento.');
  return lines.slice(0, end + 1).join('\n') + '\n';
}

export function isReference(text) {
  let body = normalize(text);
  if (body.startsWith(tomlMarker + '\n')) {
    const lines = body.trimEnd().split('\n');
    if (lines.length !== 3 || !lines[1].startsWith('description = ') || !lines[2].startsWith('prompt = ')) return false;
    try {
      const description = JSON.parse(lines[1].slice('description = '.length));
      const prompt = JSON.parse(lines[2].slice('prompt = '.length));
      const match = typeof prompt === 'string' && prompt.match(/^@\{(\.pbai4devs\/commands\/[^{}\r\n]+\/COMMAND\.md)\}\n\n\{\{args\}\}$/);
      return typeof description === 'string' && Boolean(description.trim()) && Boolean(match) && !match[1].split('/').some(part => part === '..' || part === '.');
    } catch { return false; }
  }
  if (body.startsWith('---\n')) {
    try { body = body.slice(header(body).length); } catch { return false; }
  }
  let title = false;
  const action = [];
  for (const line of body.split('\n')) {
    if (!line.trim() || line === marker) continue;
    if (!title && line.startsWith('# ')) { title = true; continue; }
    action.push(line);
  }
  const instruction = action.join(' ').replace(/\s+/g, ' ').replace(/\) \.$/, ').');
  return title && (/^(Leia e siga|Leia) \[[^\]]+\]\([^)]*\)( ao realizar operações Git)?\.$/.test(instruction) || /^@\[[^\]\r\n]+\](?:\([^)]*\))?$/.test(instruction));
}

function topPaths(paths) {
  const result = [];
  for (const path of sorted(paths)) if (!result.some(parent => path.startsWith(parent + '/'))) result.push(path);
  return result;
}

function link(target, source) {
  return posix.relative(posix.dirname(target), source).split('/').map(part => encodeURIComponent(part).replace(/[!'()*]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase())).join('/');
}

export { resourcePath } from '../lib/resource-path.mjs';

export function synchronize({ root = projectRoot, check = false, force = false, localIgnores = true, generateEntrypoints = true, recordDerivedState = true, outputBlocked, output = console.log } = {}) {
  requireNode();
  root = realpathSync(resolve(root));
  const absolute = value => join(root, ...value.split('/'));
  function assertGitReadableForChanges() {
    // A project may be nested in a worktree; .git can be a file or directory.
    // If that marker exists we must not treat an unavailable Git executable,
    // an invalid repository or an unreadable index as a Git-free project.
    let folder = root, found = false;
    while (true) {
      if (stat(join(folder, '.git'))) { found = true; break; }
      const parent = dirname(folder);
      if (parent === folder) break;
      folder = parent;
    }
    if (!found) return false;
    const env = { ...process.env };
    for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE']) delete env[key];
    const probe = spawnSync('git', ['-C', root, 'rev-parse', '--is-inside-work-tree'], {
      encoding: 'utf8', env, windowsHide: true, timeout: 20000,
    });
    if (probe.error || probe.status !== 0 || probe.stdout.trim() !== 'true') {
      fail('Nao foi possivel consultar o Git deste projeto; sincronizacao bloqueada para preservar arquivos e indice.');
    }
    return true;
  }
  function safe(value) {
    if (typeof value !== 'string' || !value || /^[A-Za-z]:/.test(value) || /[|\\\x00-\x1f\x7f]/.test(value) || value.split('/').some(part => !part || part === '.' || part === '..')) fail(`Caminho invalido: ${value}`);
    let current = root;
    for (const part of value.split('/')) {
      const parent = stat(current);
      if (parent?.isDirectory()) {
        const aliases = readdirSync(current).filter(name => name.toLowerCase() === part.toLowerCase());
        if (aliases.some(name => name !== part)) fail(`Caminhos diferem somente por maiusculas/minusculas: ${value}`);
      }
      current = join(current, part);
      if (stat(current)?.isSymbolicLink()) fail(`Link simbolico: ${value}`);
    }
    return current;
  }
  function scan(value, { markdownOnly = false, prune = false } = {}) {
    if (preserveBoundary(value)) return [];
    const path = safe(value);
    const item = stat(path);
    if (!item) return [];
    if (item.isFile()) return !markdownOnly || /\.md$/i.test(value) ? [value] : [];
    if (!item.isDirectory()) fail(`Tipo de arquivo nao suportado: ${value}`);
    const files = [];
    function visit(folder) {
      for (const name of readdirSync(safe(folder)).sort(compare)) {
        const child = `${folder}/${name}`;
        if (preserveBoundary(child)) continue;
        const info = stat(safe(child));
        if (prune && isGeneratedOutput(child, info.isDirectory())) continue;
        if (info.isDirectory()) {
          files.push(...scan(child, { markdownOnly, prune }));
        } else if (info.isFile()) {
          if (!markdownOnly || /\.md$/i.test(name)) files.push(child);
        } else fail(`Tipo de arquivo nao suportado: ${child}`);
      }
    }
    visit(value);
    return files;
  }
  const mergedInputs = new Map();
  const captureInput = (path, bytes) => { if (!mergedInputs.has(path)) mergedInputs.set(path, bytes); };
  const referenceFile = (value, supplied) => {
    const info = stat(safe(value));
    if (!info?.isFile() || info.size > 1024 * 1024) return false;
    const bytes = supplied ?? readFileSync(absolute(value)), text = normalize(bytes.toString('utf8'));
    captureInput(value, bytes);
    const digest = createHash('sha256').update(bytes).digest('hex');
    const recordedHash = priorFiles[value];
    if (recordedHash && recordedHash !== digest) return false;
    const recorded = recordedHash === digest;
    return isReference(text) && recorded;
  };
  const protectedPath = value => /^(workflows(?:\/|$)|settings\.json$|extensions\.json$)/.test(value.slice(value.indexOf('/') + 1).toLowerCase());
  const agents = new Map();
  const formats = new Map();
  const fallbacks = new Map();
  const discoveries = new Set();
  const ignoreRoots = new Set();
  const natives = [];
  const legacy = [];
  const config = '.pbai4devs/espelhos.conf';
  const configExists = stat(safe(config));
  captureInput(config, configExists ? readFileSync(absolute(config)) : null);
  const stateRoot = stateDirectory(root);
  const stateFile = `${stateRoot}/agentdevkit.json`;
  const installed = stat(safe(stateFile)) ? JSON.parse(read(safe(stateFile))) : null;
  const configText = configExists ? read(safe(config)) : adapterManifest(root, { clients: installed?.clients });
  const rows = configText.split('\n');
  const entryRegistry = `${stateRoot}/derived.json`;
  const registryBytes = stat(safe(entryRegistry)) ? readFileSync(absolute(entryRegistry)) : null;
  captureInput(entryRegistry, registryBytes);
  const previousEntries = registryBytes ? JSON.parse(registryBytes.toString('utf8')) : { schemaVersion: 1, entries: {} };
  if (previousEntries?.schemaVersion !== 1 || !previousEntries.entries || typeof previousEntries.entries !== 'object' || Array.isArray(previousEntries.entries) || Object.entries(previousEntries.entries).some(([name, hash]) => !canonicalEntrypoint(name) || !/^[a-f0-9]{64}$/.test(hash))) fail('Registro de entradas derivadas invalido.');
  const previousOutputs = previousEntries.outputs ?? {};
  if (!previousOutputs || typeof previousOutputs !== 'object' || Array.isArray(previousOutputs) || Object.entries(previousOutputs).some(([path, hash]) => !/^\.[A-Za-z0-9][A-Za-z0-9._-]*\/(skills|rules|agents)\.json$/.test(path) || reserved.has(path.split('/')[0].toLowerCase()) || !/^[a-f0-9]{64}$/.test(hash))) fail('Registro de saidas derivadas invalido.');
  const previousCatalogs = previousEntries.catalogs ?? {};
  const catalogPaths = new Set(['.pbai4devs/catalog.json', '.pbai4devs/skills.json', '.pbai4devs/agents.json', '.pbai4devs/rules.json']);
  if (!previousCatalogs || typeof previousCatalogs !== 'object' || Array.isArray(previousCatalogs) || Object.entries(previousCatalogs).some(([path, hash]) => !catalogPaths.has(path) || !/^[a-f0-9]{64}$/.test(hash))) fail('Registro de catalogos derivados invalido.');
  for (const path of Object.keys(previousCatalogs)) safe(path);
  if (previousEntries.config !== undefined && (typeof previousEntries.config !== 'string' || !/^[a-f0-9]{64}$/.test(previousEntries.config))) fail('Registro de configuracao derivada invalido.');
  const validResourcePath = path => {
    if (typeof path !== 'string' || !/^\.[A-Za-z0-9][A-Za-z0-9._-]*\/.+/.test(path)) return false;
    const [root, scope] = path.split('/');
    return !reserved.has(root.toLowerCase()) && ![...auxiliary, 'workflows'].includes(scope.toLowerCase())
      && !['readme.md', 'instructions.md'].includes(posix.basename(path).toLowerCase())
      && (/\.(md|mdc)$/i.test(path) || path.startsWith('.gemini/commands/') && path.endsWith('.toml'));
  };
  const validIgnoreBlock = path => path === '.pbai4devs/.gitignore' || typeof path === 'string' && /^\.[A-Za-z0-9][A-Za-z0-9._-]*\/\.gitignore$/.test(path) && !reserved.has(path.split('/')[0].toLowerCase());
  for (const [name, values] of [['files', previousEntries.files ?? {}], ['blocks', previousEntries.blocks ?? {}]]) {
    if (!values || typeof values !== 'object' || Array.isArray(values) || Object.entries(values).some(([path, hash]) => !(validResourcePath(path) || name === 'blocks' && (canonicalEntrypoint(path) || validIgnoreBlock(path))) || !/^[a-f0-9]{64}$/.test(hash))) fail(`Registro de ${name} derivados invalido.`);
    for (const path of Object.keys(values)) safe(canonicalEntrypoint(path) ? resolveEntrypoint(root, canonicalEntrypoint(path)) : path);
  }
  const removedBlocks = new Set(previousEntries.removedBlocks ?? []);
  if (!Array.isArray(previousEntries.removedBlocks ?? []) || [...removedBlocks].some(path => typeof path !== 'string' || !(validResourcePath(path) || canonicalEntrypoint(path)))) fail('Registro de blocos removidos invalido.');
  for (const path of removedBlocks) safe(canonicalEntrypoint(path) ? resolveEntrypoint(root, canonicalEntrypoint(path)) : path);
  const removedFiles = previousEntries.removedFiles ?? {};
  if (!removedFiles || typeof removedFiles !== 'object' || Array.isArray(removedFiles) || Object.entries(removedFiles).some(([path, hash]) => !validResourcePath(path) || !/^[a-f0-9]{64}$/.test(hash))) fail('Registro de arquivos removidos invalido.');
  if (Object.entries(removedFiles).some(([path, hash]) => installed?.files?.[path] && installed.files[path] !== hash)) fail('Registro de arquivos removidos diverge do estado instalado.');
  for (const path of Object.keys(removedFiles)) safe(path);
  const effectiveRemovedFiles = Object.fromEntries(Object.entries(removedFiles).filter(([path, hash]) => installed?.files?.[path] === hash));
  const priorFiles = { ...Object.fromEntries(Object.entries(installed?.files ?? {}).filter(([path, hash]) => effectiveRemovedFiles[path] !== hash)), ...previousEntries.files };
  const priorBlocks = { ...Object.fromEntries(Object.entries(installed?.blocks ?? {}).filter(([path]) => !removedBlocks.has(path))), ...previousEntries.blocks };
  const ownedPaths = new Set([...Object.keys(priorFiles), ...Object.keys(priorBlocks), ...Object.keys(previousEntries.entries), ...Object.keys(previousOutputs)]);
  const nativeRoots = new Set(rows.map(row => row.split('|')).filter(([type]) => ['agente', 'gitignore'].includes(type)).map(([, target]) => target));
  const preserved = new Map();
  const remember = (path, reason = 'user-owned') => { preserved.set(path, { path, reason }); return true; };
  function preserveBoundary(value) {
    if (!nativeRoots.has(value.split('/')[0]) && !canonicalEntrypoint(value) && value !== 'README.md') return false;
    const boundary = nativePathBoundary(root, value, ownedPaths, { preserveRootAliases: true });
    return boundary ? remember(boundary.path, boundary.reason) : false;
  }
  const fallbackChecks = new Map();
  function blockedOutput(path) {
    if (outputBlocked) return outputBlocked(path);
    let boundary = nativePathBoundary(root, path, ownedPaths, { preserveRootAliases: true });
    if (!boundary) {
      const info = stat(safe(path));
      if (info && !info.isFile()) boundary = { path, reason: 'non-file' };
    }
    if (!boundary) return { blocked: false };
    remember(boundary.path, boundary.reason);
    const info = lstatSync(absolute(boundary.path));
    return { blocked: true, ...boundary, identity: [info.dev, info.ino, info.mode, info.size, info.mtimeMs, info.ctimeMs] };
  }
  function unavailable(path) {
    const status = blockedOutput(path);
    if (fallbackChecks.has(path) && JSON.stringify(fallbackChecks.get(path)) !== JSON.stringify(status)) fail(`Caminho de skill mudou durante o planejamento: ${path}`);
    fallbackChecks.set(path, status);
    return status.blocked;
  }
  function assertFallbackChecks() {
    for (const [path, status] of fallbackChecks) if (JSON.stringify(blockedOutput(path)) !== JSON.stringify(status)) fail(`Caminho de skill mudou apos o planejamento: ${path}`);
  }
  function claimed(value) {
    if (ownedPaths.has(value)) return true;
    const info = stat(safe(value));
    if (!info?.isFile() || info.size > 1024 * 1024) return false;
    const text = read(safe(value));
    return text.split('\n').includes(marker) || text.startsWith(tomlMarker + '\n');
  }
  function preserveUnknown(value) {
    if (preserveBoundary(value)) return true;
    const info = stat(safe(value));
    if (info?.isFile() && (/\.(md|mdc)$/i.test(value) || value.startsWith('.gemini/commands/') && value.endsWith('.toml'))) return false;
    return info && !referenceFile(value) && !claimed(value) ? remember(value) : false;
  }
  function preserveNativeType(value, info, type) {
    if (!info || info[type]()) return false;
    if ([...ownedPaths].some(path => path === value || path.startsWith(`${value}/`))) fail(`Tipo alterado em caminho gerenciado: ${value}`);
    return remember(value, info.isDirectory() ? 'existing-directory' : info.isFile() ? 'existing-file' : 'existing-other');
  }
  function ignoreRoot(target) {
    if (!/^\.[^/]+$/.test(target) || reserved.has(target.toLowerCase())) fail(`Pasta de agente invalida: ${target}`);
    const info = preserveBoundary(target) ? null : stat(safe(target));
    preserveNativeType(target, info, 'isDirectory');
    for (const known of ignoreRoots) if (known !== target && known.toLowerCase() === target.toLowerCase()) fail('Raizes de agentes diferem somente por maiusculas/minusculas.');
    ignoreRoots.add(target);
  }
  for (const [index, row] of rows.entries()) {
    if (!row || row.startsWith('#')) continue;
    const fields = row.split('|');
    if (fields.length < 2 || fields.length > 4) fail('Campos invalidos no manifesto.');
    const [type, target, source = '', metadata = ''] = fields;
    if (!preserveBoundary(target)) safe(target);
    if (type === 'agente') {
      if (fields.length > 3) fail(`Pasta de agente invalida: ${target}`);
      ignoreRoot(target);
      const mode = source || 'agrupado';
      if (!['agrupado', 'plano'].includes(mode)) fail(`Layout invalido: ${mode}`);
      for (const known of agents.keys()) if (known !== target && known.toLowerCase() === target.toLowerCase()) fail('Raizes de agentes diferem somente por maiusculas/minusculas.');
      if (agents.has(target) && agents.get(target) !== mode) fail(`Layouts conflitantes: ${target}`);
      agents.set(target, mode);
    } else if (type === 'formato') {
      if (fields.length !== 4 || !Object.hasOwn(principals, source) || !layouts.has(metadata)) fail(`Formato invalido: ${row}`);
      if (source === 'skills' && !['agrupado', 'plano', 'nenhum'].includes(metadata)) fail(`Skills exigem formato agrupado, plano ou nenhum: ${row}`);
      if (metadata === 'nenhum' && source !== 'skills') fail(`Formato incompativel com recurso: ${row}`);
      if ((metadata === 'mdc' || metadata === 'instrucoes') && source !== 'rules' || metadata === 'prompt' && source !== 'commands' || metadata === 'agente' && source !== 'agents') fail(`Formato incompativel com recurso: ${row}`);
      const key = `${target}/${source}`;
      if (formats.has(key)) fail(`Formato duplicado: ${key}`);
      formats.set(key, metadata);
    } else if (type === 'descoberta') {
      if (fields.length !== 3 || target !== '.agents' || source !== 'antigravity' || discoveries.has(target)) fail(`Descoberta invalida: ${row}`);
      discoveries.add(target);
    } else if (type === 'fallback') {
      if (fields.length !== 4 || metadata !== 'skills' || target === source || fallbacks.has(target)) fail(`Fallback invalido: ${row}`);
      fallbacks.set(target, source);
    } else if (type === 'gitignore') {
      if (fields.length !== 2) fail('gitignore aceita somente a pasta de destino.');
      ignoreRoot(target);
    } else if (type === 'documento') legacy.push(index);
    else if (type === 'nativo') {
      safe(source);
      if (metadata) {
        safe(metadata);
        if (posix.dirname(metadata) !== posix.dirname(source) || !/\.ya?ml$/.test(metadata)) fail(`Metadados fora da pasta da origem ou sem YAML: ${metadata}`);
        if (stat(absolute(source))?.isFile()) {
          if (!stat(absolute(metadata))?.isFile()) fail(`Metadados ausentes: ${metadata}`);
          const text = read(absolute(metadata));
          if (text.slice(header(text).length).trim()) fail(`Metadados devem conter apenas YAML: ${metadata}`);
        }
      }
      natives.push({ target, source, metadata, index });
    } else fail(`Tipo invalido no manifesto: ${type}`);
  }
  if (!agents.size) fail('Nenhum agente cadastrado.');
  for (const key of formats.keys()) if (!agents.has(key.split('/')[0])) fail(`Formato fora dos agentes: ${key}`);
  for (const [target, source] of fallbacks) if (!agents.has(target) || !agents.has(source) || formats.get(`${target}/skills`) !== 'nenhum' || formats.get(`${source}/skills`) === 'nenhum') fail(`Fallback fora dos agentes: ${target}`);
  for (const root of discoveries) if (!agents.has(root)) fail(`Descoberta fora dos agentes: ${root}`);
  const managed = value => [...agents.keys()].some(agent => value.startsWith(agent + '/'));
  const built = buildCatalog(root);
  const sources = new Map(Object.keys(principals).flatMap(kind => built.catalog[kind].map(entry => [entry.path, kind])));
  const entries = new Map();
  const folded = new Map();
  function add(target, source, metadata = '') {
    if (preserveUnknown(target)) return;
    safe(target);
    const alias = folded.get(target.toLowerCase());
    if (alias && alias !== target) fail(`Destinos diferem somente por maiusculas/minusculas: ${target}`);
    const previous = entries.get(target);
    if (previous && (previous.source !== source || (previous.metadata && metadata && previous.metadata !== metadata))) fail(`Destinos ou metadados em conflito: ${target}`);
    entries.set(target, { source, metadata: metadata || previous?.metadata || '' });
    folded.set(target.toLowerCase(), target);
  }
  for (const [source, kind] of sources) {
    for (const [agent, mode] of agents) {
      const format = formats.get(`${agent}/${kind}`) || mode;
      if (format === 'nenhum') {
        const primary = kind === 'skills' && fallbacks.get(agent);
        if (!primary) continue;
        const primaryFormat = formats.get(`${primary}/${kind}`) || agents.get(primary);
        const primaryTarget = `${primary}/${resourcePath(source, kind, primaryFormat)}`;
        if (!unavailable(primaryTarget)) continue;
        const target = `${agent}/${resourcePath(source, kind, mode)}`;
        if (unavailable(target)) fail(`Skill indisponivel: ${source}; caminhos ${primaryTarget} e ${target} obstruidos.`);
        add(target, source);
        continue;
      }
      let path = resourcePath(source, kind, format);
      if (agent === '.gemini' && kind === 'commands') path = path.replace(/\.md$/, '.toml');
      add(`${agent}/${path}`, source);
    }
  }
  const missing = [];
  for (const native of natives) {
    const { target, source, metadata } = native;
    if (!Object.entries(principals).some(([kind, name]) => source.startsWith(`.pbai4devs/${kind}/`) && source.slice(`.pbai4devs/${kind}/`.length).includes('/') && posix.basename(source) === name)) fail(`Origem exclusiva de .pbai4devs ou documento nao permitido: ${source}`);
    if (stat(absolute(source))?.isFile() && !sources.has(source)) fail(`Origem nativa fora do catalogo canonico: ${source}`);
    if (!managed(target)) fail(`Destino nativo fora dos agentes: ${target}`);
    const scope = target.split('/')[1].toLowerCase();
    const geminiCommand = target.startsWith('.gemini/commands/') && target.endsWith('.toml') && source.startsWith('.pbai4devs/commands/') && posix.basename(source) === 'COMMAND.md';
    if (target.startsWith('.gemini/commands/') && !geminiCommand) fail(`Comando Gemini exige TOML e origem COMMAND.md: ${target}`);
    if ([...auxiliary, 'workflows'].includes(scope) || ['readme.md', 'instructions.md'].includes(posix.basename(target).toLowerCase()) || (!/\.(md|mdc)$/i.test(target) && !geminiCommand)) fail(`Destino nativo nao permitido: ${target}`);
    if (geminiCommand && metadata) fail(`Comando Gemini usa metadados da origem, sem YAML separado: ${target}`);
    if (stat(absolute(source))?.isFile()) add(target, source, metadata);
    else missing.push(native);
  }
  const targets = sorted(entries.keys());
  for (const target of targets) {
    const parts = target.split('/');
    while (parts.length > 1) {
      parts.pop();
      if (folded.has(parts.join('/').toLowerCase())) fail(`Destino e ancestral de outro destino: ${target}`);
    }
  }
  const remove = new Set();
  const backup = new Set();
  const conflicts = new Set();
  const protectedConflicts = new Set();
  const expected = new Map();
  const managedBlocks = {};
  const generatedFiles = {};
  const rememberGenerated = (target, content) => {
    const hash = createHash('sha256').update(content).digest('hex');
    if (installed?.files?.[target] !== hash || Object.hasOwn(previousEntries.files ?? {}, target)) generatedFiles[target] = hash;
  };
  const retiredBlocks = new Set();
  const changed = [];
  function planRemove(value, custom = false) {
    safe(value);
    if (!managed(value) || protectedPath(value)) fail(`Limpeza fora dos espelhos ou caminho protegido: ${value}`);
    // Directories, unowned files and edited references can contain project
    // data even when --force is used. Only a recorded, unchanged reference
    // may be removed; empty directories are never removed recursively.
    if (!stat(safe(value))?.isFile() || !referenceFile(value)) {
      remember(value, 'existing-file');
      if (custom) { conflicts.add(value); protectedConflicts.add(value); }
      return;
    }
    remove.add(value);
    if (custom) backup.add(value);
  }
  function cleanScope(value) {
    if (preserveBoundary(value)) return;
    const info = stat(safe(value));
    if (!info) return;
    const files = info.isDirectory() ? scan(value) : [value];
    if (info.isDirectory() && !files.length) { remember(value, 'existing-directory'); return; }
    let hasHumanContent = false;
    for (const file of files) {
      if (expected.has(file) || priorBlocks[file] || protectedPath(file)) continue;
      if (referenceFile(file)) planRemove(file);
      else if (claimed(file)) { remember(file, 'edited-generated-file'); hasHumanContent = true; }
      else { remember(file); hasHumanContent = true; }
    }
    if (hasHumanContent && info.isDirectory()) remember(value);
  }
  const registries = new Map();
  const discoveryOutputs = {};
  const catalogOutputs = {};
  for (const [target, content] of built.outputs) {
    const info = stat(safe(target));
    if (info && !info.isFile()) fail(`Registro nao e arquivo: ${target}`);
    const current = info ? readFileSync(absolute(target)) : null;
    captureInput(target, current);
    const currentHash = current && createHash('sha256').update(current).digest('hex');
    const known = current && [installed?.files?.[target], previousCatalogs[target]].some(digest => digest && digest === currentHash);
    if (current && !known) {
      // Identical bytes do not establish ownership. An unowned catalogue can
      // remain if already current, but it cannot be adopted or regenerated.
      remember(target, 'existing-catalog');
      if (current.toString('utf8') !== content) { conflicts.add(target); protectedConflicts.add(target); }
      continue;
    }
    const nextHash = createHash('sha256').update(content).digest('hex');
    if (installed?.files?.[target] !== nextHash) catalogOutputs[target] = nextHash;
    if (!current || current.toString('utf8') !== content) {
      registries.set(target, content);
      if (force && info) backup.add(target);
    }
  }
  for (const agent of discoveries) {
    for (const kind of ['skills', 'rules', 'agents']) {
      const manifest = `${agent}/${kind}.json`;
      if (preserveBoundary(manifest)) continue;
      const paths = [...entries].filter(([target, value]) => target.startsWith(`${agent}/`) && sources.get(value.source) === kind)
        .map(([target]) => kind === 'skills' ? posix.dirname(target) : target).sort(compare);
      const content = JSON.stringify({ entries: paths.map(path => ({ path })) }, null, 2) + '\n';
      const info = stat(safe(manifest));
      if (preserveNativeType(manifest, info, 'isFile')) continue;
      if (info && !info.isFile()) fail(`Registro nao e arquivo: ${manifest}`);
      if (info && !ownedPaths.has(manifest)) { remember(manifest); continue; }
      const current = info ? readFileSync(absolute(manifest)) : null;
      captureInput(manifest, current);
      const priorHashes = [previousOutputs[manifest], installed?.files?.[manifest]];
      const unchanged = current === null || priorHashes.includes(createHash('sha256').update(current).digest('hex'));
      if (!unchanged) { remember(manifest, 'edited-generated-file'); continue; }
      const nextHash = createHash('sha256').update(content).digest('hex');
      if (installed?.files?.[manifest] !== nextHash || Object.hasOwn(previousOutputs, manifest)) discoveryOutputs[manifest] = nextHash;
      if (!info || readFileSync(absolute(manifest), 'utf8') !== content) {
        if (info && force) backup.add(manifest);
        registries.set(manifest, content);
      }
    }
  }
  const ignoreFiles = new Map();
  const clientSettingsPath = '.pbai4devs/templates/gitignore/clients.json';
  if (!stat(safe(clientSettingsPath))?.isFile()) fail(`Configuracao .gitignore ausente: ${clientSettingsPath}`);
  const ignoreClients = validateIgnoreClients(JSON.parse(read(absolute(clientSettingsPath))));
  const ignoreTemplates = new Map([
    ['.pbai4devs/.gitignore', '.pbai4devs/templates/gitignore/shared.ignore'],
    ...sorted(ignoreRoots).map(folder => [`${folder}/.gitignore`, '.pbai4devs/templates/gitignore/agents.ignore']),
  ]);
  for (const [target, template] of ignoreTemplates) {
    if (preserveBoundary(target)) continue;
    if (!stat(safe(template))?.isFile()) fail(`Template .gitignore ausente ou invalido: ${template}`);
    const info = stat(safe(target));
    if (target !== '.pbai4devs/.gitignore' && preserveNativeType(target, info, 'isFile')) continue;
    if (info && !info.isFile()) fail(`.gitignore nao e arquivo: ${target}`);
    let merged;
    const current = info ? readFileSync(absolute(target), 'utf8') : '';
    captureInput(target, info ? Buffer.from(current) : null);
    if (target !== '.pbai4devs/.gitignore' && info && !ownedPaths.has(target) && !current.split(/\r?\n/).some(line => [ignoreBegin, ignoreEnd].includes(line))) { remember(target); continue; }
    try {
      let patterns = readFileSync(absolute(template), 'utf8');
      if (target !== '.pbai4devs/.gitignore') patterns = renderClientIgnore(patterns, ignoreClients[posix.dirname(target)]);
      merged = mergeGitignore(current, patterns);
    }
    catch (error) { fail(`${target}: ${error.message}`); }
    if (merged.hasBlock) {
      const start = current.indexOf(ignoreBegin), finish = current.indexOf(ignoreEnd);
      const blockHash = start >= 0 && finish > start ? createHash('sha256').update(current.slice(start, finish + ignoreEnd.length)).digest('hex') : null;
      const fileHash = createHash('sha256').update(current).digest('hex');
      const known = [installed?.blocks?.[target], previousEntries.blocks?.[target]].some(hash => hash && hash === blockHash)
        || priorFiles[target] && priorFiles[target] === fileHash;
      if (!known) {
        // A marker or identical contents is not proof that this block belongs
        // to the kit. Do not adopt, replace or remove it even with --force.
        remember(target, 'existing-ignore-block');
        if (merged.text !== current) { conflicts.add(target); protectedConflicts.add(target); }
        continue;
      }
    }
    const start = merged.text.indexOf(ignoreBegin), finish = merged.text.indexOf(ignoreEnd);
    if (start >= 0 && finish > start) managedBlocks[target] = createHash('sha256').update(merged.text.slice(start, finish + ignoreEnd.length)).digest('hex');
    if (merged.text !== current) {
      ignoreFiles.set(target, merged.text);
      if (force && info && merged.hasBlock) backup.add(target);
    }
  }
  for (const target of targets) {
    const { source, metadata } = entries.get(target);
    let ancestor = posix.dirname(target);
    while (ancestor.includes('/')) {
      const info = stat(safe(ancestor));
      if (info && !info.isDirectory()) {
        if (force) planRemove(ancestor, true); else conflicts.add(ancestor);
      }
      ancestor = posix.dirname(ancestor);
    }
    const info = stat(safe(target));
    const targetBytes = info?.isFile() ? readFileSync(absolute(target)) : null;
    captureInput(target, targetBytes);
    const reference = targetBytes && referenceFile(target, targetBytes);
    const mixed = info?.isFile() && /\.(md|mdc|toml)$/i.test(target) && (priorBlocks[target] || !reference);
    if (info && !mixed && (!info.isFile() || !reference)) {
      scan(target);
      if (force) planRemove(target, true); else conflicts.add(target);
    }
    const sourceText = read(safe(source));
    if (target.startsWith('.gemini/commands/') && target.endsWith('.toml')) {
      if (/[{}]/.test(source)) fail(`Caminho incompativel com inclusao Gemini: ${source}`);
      const command = built.catalog.commands.find(entry => entry.path === source);
      if (!command) fail(`Comando Gemini exige COMMAND.md: ${source}`);
      const current = mixed ? targetBytes : null;
      const merged = mixed ? mergeTomlContent(current, `@{${source}}`, { expectedHash: priorBlocks[target] }) : null;
      if (current && !priorBlocks[target] && priorFiles[target] !== createHash('sha256').update(current).digest('hex') && extractTomlManagedBlock(current)) {
        // An identical block can remain, but its bytes are not ownership proof.
        remember(target, 'existing-managed-block'); expected.set(target, current); continue;
      }
      const content = merged ? merged.text : `${tomlMarker}\ndescription = ${JSON.stringify(command.description)}\nprompt = ${JSON.stringify(`@{${source}}\n\n{{args}}`)}\n`;
      if (mixed) { captureInput(target, current); managedBlocks[target] = merged.sha256; remember(target, 'existing-file-extended'); }
      else rememberGenerated(target, content);
      expected.set(target, content);
      if (!info?.isFile() || readFileSync(absolute(target), 'utf8') !== content) changed.push(target);
      continue;
    }
    let frontmatter;
    if (metadata) frontmatter = header(read(safe(metadata)));
    else if (target.endsWith('.mdc')) {
      const rule = built.catalog.rules.find(entry => entry.path === source);
      if (!rule) fail(`Regra Cursor exige RULE.md: ${source}`);
      frontmatter = `---\ndescription: ${JSON.stringify(rule.trigger === 'manual' ? '' : rule.description)}\nalwaysApply: ${rule.trigger === 'always_on'}\n${rule.trigger === 'glob' ? `globs: ${JSON.stringify(rule.globs)}\n` : ''}---\n`;
    } else frontmatter = target.endsWith('.instructions.md') ? "---\napplyTo: '**'\n---\n" : header(sourceText);
    const title = sourceText.match(/^# .+$/m)?.[0];
    if (!title) fail(`Titulo ausente: ${source}`);
    const ruleInclusion = /^\.(?:agents|agent)\/rules\//.test(target);
    const inclusion = ruleInclusion ? `@[origem](${link(target, source)})` : `Leia e siga [origem](${link(target, source)}).`;
    const current = mixed ? targetBytes : null;
    const merged = mixed ? mergeManagedContent(current, inclusion, { expectedHash: priorBlocks[target] }) : null;
    if (current && !priorBlocks[target] && priorFiles[target] !== createHash('sha256').update(current).digest('hex') && extractManagedBlock(current)) {
      remember(target, 'existing-managed-block'); expected.set(target, current); continue;
    }
    const content = merged ? merged.text : `${frontmatter}\n${title}\n\n${marker}\n${inclusion}\n`;
    if (mixed) { captureInput(target, current); managedBlocks[target] = merged.sha256; remember(target, 'existing-file-extended'); }
    else rememberGenerated(target, content);
    expected.set(target, content);
    if (!info?.isFile() || readFileSync(absolute(target), 'utf8') !== content) changed.push(target);
  }
  for (const agent of agents.keys()) {
    for (const kind of [...auxiliary, 'README.md', 'INSTRUCTIONS.md']) cleanScope(`${agent}/${kind}`);
    for (const kind of Object.keys(principals)) {
      const scope = `${agent}/${kind}`;
      if (preserveBoundary(scope)) continue;
      const info = stat(safe(scope));
      if (!info) continue;
      const files = scan(scope);
      if (!info.isDirectory()) { if (claimed(scope)) { if (force) planRemove(scope, true); else conflicts.add(scope); } else remember(scope); continue; }
      for (const file of files) if (!expected.has(file)) {
        if (priorBlocks[file]) continue;
        if (referenceFile(file)) planRemove(file);
        else if (claimed(file)) remember(file, 'edited-generated-file');
        else remember(file);
      }
      function directories(value) {
        for (const name of readdirSync(safe(value))) {
          const child = `${value}/${name}`;
          if (preserveBoundary(child)) continue;
          if (!stat(safe(child))?.isDirectory()) continue;
          if (![...expected.keys()].some(target => target.startsWith(child + '/'))) cleanScope(child);
          directories(child);
        }
      }
      directories(scope);
    }
    for (const file of scan(agent, { markdownOnly: true, prune: true })) {
      if (protectedPath(file) || expected.has(file) || priorBlocks[file] || !read(absolute(file)).includes(marker)) continue;
      if (referenceFile(file)) planRemove(file);
      else remember(file, 'edited-generated-file');
    }
  }
  for (const { target } of missing) cleanScope(target);
  const rootEntries = new Map();
  const nextEntries = generateEntrypoints ? {} : { ...previousEntries.entries };
  if (generateEntrypoints) {
    const previous = previousEntries;
    for (const canonical of resolveAdapters(installed?.clients).entrypoints) {
      const name = resolveEntrypoint(root, canonical);
      const template = `.pbai4devs/templates/entrypoints/${canonical}`;
      if (!stat(safe(template))?.isFile()) continue;
      if (preserveBoundary(name)) continue;
      const info = stat(safe(name));
      if (preserveNativeType(name, info, 'isFile')) continue;
      const current = info?.isFile() ? readFileSync(absolute(name)) : null;
      captureInput(name, current);
      const previousHash = previous.entries[name] ?? installed?.files?.[name];
      const previousBlockHash = priorBlocks[name] ?? Object.entries(priorBlocks).find(([path]) => canonicalEntrypoint(path) === canonical)?.[1];
      if (current && (previousBlockHash || createHash('sha256').update(current).digest('hex') !== previousHash)) {
        const merged = mergeManagedContent(current, entrypointReference(root, canonical), { expectedHash: previousBlockHash });
        if (!previousBlockHash && previousHash !== createHash('sha256').update(current).digest('hex') && extractManagedBlock(current)) {
          remember(name, 'existing-managed-block'); continue;
        }
        captureInput(name, current);
        managedBlocks[name] = merged.sha256;
        rootEntries.set(name, merged.text);
        remember(name, 'existing-file-extended');
        continue;
      }
      if (current && createHash('sha256').update(current).digest('hex') === installed?.files?.[name]) {
        const content = renderEntrypointImports(root, current.toString('utf8'));
        rootEntries.set(name, content);
        const nextHash = createHash('sha256').update(content).digest('hex');
        if (nextHash !== installed.files[name]) nextEntries[name] = nextHash;
        continue;
      }
      const content = renderEntrypointImports(root, readFileSync(absolute(template), 'utf8'));
      const nextHash = createHash('sha256').update(content).digest('hex');
      nextEntries[name] = nextHash;
      rootEntries.set(name, content);
    }
  }
  for (const [target, digest] of Object.entries(priorBlocks)) {
    if (!(validResourcePath(target) || canonicalEntrypoint(target))) continue;
    if (managedBlocks[target]) continue;
    if (canonicalEntrypoint(target) && Object.keys(managedBlocks).some(path => canonicalEntrypoint(path) === canonicalEntrypoint(target))) { removedBlocks.add(target); continue; }
    if (!generateEntrypoints && canonicalEntrypoint(target)) { managedBlocks[target] = digest; continue; }
    if (generatedFiles[target] || nextEntries[target]) { removedBlocks.add(target); continue; }
    if (expected.has(target) || rootEntries.has(target) || preserveBoundary(target)) continue;
    const info = stat(safe(target));
    if (!info) continue;
    if (!info.isFile()) fail(`Tipo alterado em caminho gerenciado: ${target}`);
    const current = readFileSync(absolute(target));
    const content = target.endsWith('.toml') ? stripTomlContent(current, digest) : stripManagedContent(current, digest);
    captureInput(target, current);
    expected.set(target, content);
    if (readFileSync(absolute(target), 'utf8') !== content) changed.push(target);
    retiredBlocks.add(target);
    removedBlocks.add(target);
    remember(target, 'existing-file-extended');
  }
  const omittedRows = new Set([...legacy, ...missing.map(native => native.index)]);
  const finalConfig = rows.filter((row, index) => !omittedRows.has(index)).join('\n').replace(/\n*$/, '\n');
  const configChanged = !configExists || configText !== finalConfig;
  const configHash = configExists ? createHash('sha256').update(readFileSync(absolute(config))).digest('hex') : null;
  const configKnown = configExists && [installed?.files?.[config], previousEntries.config].some(hash => hash && hash === configHash);
  if (configExists && !configKnown) {
    remember(config, 'existing-configuration');
    if (configChanged) { conflicts.add(config); protectedConflicts.add(config); }
  }
  const next = { schemaVersion: 1, entries: nextEntries };
  if (Object.keys(discoveryOutputs).length) next.outputs = discoveryOutputs;
  if (Object.keys(catalogOutputs).length) next.catalogs = catalogOutputs;
  const nextConfigHash = createHash('sha256').update(finalConfig).digest('hex');
  if ((!configExists || configKnown) && installed?.files?.[config] !== nextConfigHash) next.config = nextConfigHash;
  if (Object.keys(generatedFiles).length) next.files = generatedFiles;
  const derivedBlocks = Object.fromEntries(Object.entries(managedBlocks).filter(([path, hash]) => installed?.blocks?.[path] !== hash || Object.hasOwn(previousEntries.blocks ?? {}, path)));
  if (Object.keys(derivedBlocks).length) next.blocks = derivedBlocks;
  for (const path of Object.keys(managedBlocks)) removedBlocks.delete(path);
  if (removedBlocks.size) next.removedBlocks = sorted(removedBlocks);
  for (const path of expected.keys()) delete effectiveRemovedFiles[path];
  for (const path of remove) if (validResourcePath(path) && installed?.files?.[path] && !expected.has(path)) effectiveRemovedFiles[path] = installed.files[path];
  if (Object.keys(effectiveRemovedFiles).length) next.removedFiles = Object.fromEntries(Object.entries(effectiveRemovedFiles).sort(([a], [b]) => compare(a, b)));
  const registryContent = derivedContent(registryBytes, previousEntries, next);
  if (recordDerivedState && (Object.keys(nextEntries).length || Object.keys(discoveryOutputs).length || Object.keys(catalogOutputs).length || next.config || Object.keys(generatedFiles).length || Object.keys(derivedBlocks).length || removedBlocks.size || Object.keys(effectiveRemovedFiles).length || stat(safe(entryRegistry))) && (!stat(safe(entryRegistry)) || readFileSync(absolute(entryRegistry), 'utf8') !== registryContent)) registries.set(entryRegistry, registryContent);
  const ownedOutputs = sorted([...targets, ...built.outputs.keys(), '.pbai4devs/espelhos.conf', ...rootEntries.keys(), ...(recordDerivedState && (stat(safe(entryRegistry)) || registries.has(entryRegistry)) ? [entryRegistry] : []),
    ...[...discoveries].flatMap(agent => ['skills', 'rules', 'agents'].map(kind => `${agent}/${kind}.json`)),
    ...[...ignoreTemplates.keys()].filter(target => {
      if (target === '.pbai4devs/.gitignore') return false;
      if (preserved.has(target) || preserveBoundary(target)) return false;
      const content = ignoreFiles.get(target) ?? readFileSync(absolute(target), 'utf8');
      const start = content.indexOf(ignoreBegin), finish = content.indexOf(ignoreEnd);
      return start >= 0 && finish > start && !(content.slice(0, start) + content.slice(finish + ignoreEnd.length)).trim();
    }),
  ]).filter(path => !managedBlocks[path] && !retiredBlocks.has(path) && ![...preserved.keys()].some(value => path === value || path.startsWith(`${value}/`)));
  const localPlan = localIgnores ? planLocalIgnore(root, { outputs: ownedOutputs }) : null;
  const localStatus = localPlan ? checkLocalIgnore(localPlan) : { changed: 0, missing: [], trackedOutputs: [] };
  const removals = topPaths(remove);
  const backups = topPaths(backup);
  const rootEntryChanges = [...rootEntries].filter(([name, content]) => !stat(absolute(name)) || readFileSync(absolute(name), 'utf8') !== content);
  // Every planned write/removal may cover a different staged version. Compare
  // the worktree bytes with the index before touching any path, even in force
  // mode, and repeat immediately before applying the transaction.
  const affected = sorted([...removals, ...changed, ...registries.keys(), ...ignoreFiles.keys(), ...rootEntryChanges.map(([name]) => name), ...(configChanged ? [config] : [])]);
  const emptyHash = createHash('sha256').update(Buffer.alloc(0)).digest('hex');
  const affectedHashes = Object.fromEntries(affected.flatMap(value => {
    const info = stat(safe(value));
    if (info && !info.isFile()) return []; // A type conflict already blocks application.
    return [[value, info ? createHash('sha256').update(readFileSync(absolute(value))).digest('hex') : emptyHash]];
  }));
  const hadGit = Object.keys(affectedHashes).length ? assertGitReadableForChanges() : false;
  const affectedIndex = planUntrack(root, affectedHashes);
  for (const path of affectedIndex.conflicts) {
    conflicts.add(path);
    remember(path, 'staged-content-preserved');
  }
  function capture(value) {
    const file = safe(value), info = stat(file);
    if (!info) return null;
    if (info.isFile()) return { mode: info.mode & 0o777, data: readFileSync(file) };
    if (!info.isDirectory()) fail(`Tipo de arquivo nao suportado: ${value}`);
    return { mode: info.mode & 0o777, children: Object.fromEntries(readdirSync(file).sort(compare).map(name => [name, capture(`${value}/${name}`)])) };
  }
  function fingerprint(value) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }
  const transactionRoots = topPaths([...removals, ...changed, ...registries.keys(), ...ignoreFiles.keys(), ...rootEntryChanges.map(([name]) => name), ...(configChanged ? [config] : [])]);
  const originals = new Map(transactionRoots.map(value => [value, capture(value)]));
  for (const [path, bytes] of mergedInputs) {
    const boundary = transactionRoots.find(root => path === root || path.startsWith(root + '/'));
    if (!boundary) continue;
    let snapshot = originals.get(boundary);
    for (const segment of path.slice(boundary.length).split('/').filter(Boolean)) snapshot = snapshot?.children?.[segment];
    if (bytes === null ? snapshot != null : !snapshot?.data?.equals(bytes)) fail(`Arquivo mudou apos planejar: ${path}`);
  }
  const currentHashes = new Map([...originals].map(([value, content]) => [value, fingerprint(content)]));
  const originalDirectories = new Set();
  for (const value of transactionRoots) {
    let parent = posix.dirname(value);
    while (parent !== '.') { if (stat(safe(parent))?.isDirectory()) originalDirectories.add(parent); parent = posix.dirname(parent); }
  }
  const touched = new Set(), createdDirectories = new Set();
  const summary = { changed: changed.length + rootEntryChanges.length, stale: removals.length, conflicts: conflicts.size, missing: missing.length, legacy: legacy.length, registries: registries.size, gitignores: ignoreFiles.size, manifests: configExists ? 0 : 1, localIgnores: localStatus.changed + localStatus.missing.length + localStatus.trackedOutputs.length + (localStatus.status === 'no-git' ? 1 : 0) };
  const dirty = Object.values(summary).some(Boolean);
  output(`${summary.changed} desatualizadas; ${summary.stale} obsoletas; ${summary.conflicts} conflitos; ${summary.missing} origens nativas ausentes; ${summary.legacy} documentos antigos; ${summary.registries} indices derivados; ${summary.gitignores} gitignores; ${summary.localIgnores} exclusoes locais.`);
  assertFallbackChecks();
  if (localStatus.status === 'no-git') output('Git ausente: apos git init, execute a sincronizacao para proteger os arquivos locais.');
  const preservedPaths = sorted(preserved.keys()).map(path => preserved.get(path));
  if (check) return { ...summary, ownedOutputs, managedBlocks, preserved: preservedPaths, exitCode: dirty ? 1 : 0 };
  if (affectedIndex.conflicts.length) fail(`Indice Git contem alteracoes proprias; arquivos preservados: ${sorted(affectedIndex.conflicts).join(', ')}`);
  if (protectedConflicts.size) fail(`Conteudo proprio preservado; resolva a colisao antes de sincronizar: ${sorted(protectedConflicts).join(', ')}`);
  if (conflicts.size) fail(`Use --force para reconstruir somente os caminhos gerenciados: ${sorted(conflicts).join(', ')}`);
  if (localStatus.missing.length) fail(`Regras humanas reabrem derivados locais: ${localStatus.missing.join(', ')}`);
  if (localPlan) assertLocalIgnoreUnchanged(localPlan);
  function ensureDirectory(value) {
    let parent = posix.dirname(value);
    const missing = [];
    while (parent !== '.' && !stat(safe(parent))) { missing.push(parent); parent = posix.dirname(parent); }
    for (const directory of missing.reverse()) {
      mkdirSync(safe(directory)); createdDirectories.add(directory);
    }
  }
  function mutate(value, action, text) {
    const boundary = transactionRoots.find(root => value === root || value.startsWith(root + '/'));
    if (!boundary || fingerprint(capture(boundary)) !== currentHashes.get(boundary)) fail(`Arquivo mudou apos planejar: ${value}`);
    const beforeHash = currentHashes.get(boundary);
    touched.add(boundary);
    let failure;
    try { action(); } catch (error) { failure = error; }
    let afterHash;
    try { afterHash = fingerprint(capture(boundary)); }
    catch (error) { currentHashes.set(boundary, 'conteudo-concorrente'); throw failure || error; }
    const matches = text === undefined || (text === null ? !stat(safe(value)) : stat(safe(value))?.isFile() && readFileSync(absolute(value)).equals(Buffer.from(text)));
    if (!matches && afterHash !== beforeHash) {
      currentHashes.set(boundary, 'conteudo-concorrente');
      if (failure) throw failure;
      fail(`Mudanca concorrente preservada: ${value}`);
    }
    currentHashes.set(boundary, afterHash);
    if (failure) throw failure;
    if (!matches) fail(`Arquivo nao corresponde a gravacao planejada: ${value}`);
  }
  function atomic(value, text) {
    const target = safe(value);
    const mode = stat(target)?.isFile() ? stat(target).mode & 0o777 : undefined;
    ensureDirectory(value);
    const temporary = `${target}.sync.${randomUUID()}`;
    try { writeFileSync(temporary, text, { flag: 'wx' }); if (mode !== undefined) chmodSync(temporary, mode); renameSync(temporary, target); }
    finally { rmSync(temporary, { force: true }); }
  }
  let backupRoot;
  if (backups.length) {
    mkdirSync(safe('.agent-tests'), { recursive: true });
    backupRoot = mkdtempSync(join(absolute('.agent-tests'), 'sync-backup.'));
    for (const value of backups) if (stat(safe(value))) {
      const destination = join(backupRoot, ...value.split('/'));
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(absolute(value), destination, { recursive: true, preserveTimestamps: true });
    }
    output(`Backup local: ${posix.join('.agent-tests', backupRoot.slice(backupRoot.lastIndexOf('/') + 1).split('\\').at(-1))}`);
  }
  function restore(value, content) {
    rmSync(safe(value), { recursive: true, force: true });
    if (!content) return;
    ensureDirectory(value);
    if (content.data) writeFileSync(safe(value), content.data);
    else {
      mkdirSync(safe(value));
      for (const [name, child] of Object.entries(content.children)) restore(`${value}/${name}`, child);
    }
    chmodSync(safe(value), content.mode);
  }
  try {
    assertFallbackChecks();
    if (localPlan) assertLocalIgnoreUnchanged(localPlan);
    if (Object.keys(affectedHashes).length) {
      if (!assertGitReadableForChanges() && hadGit) fail('Git deixou de estar disponivel antes da sincronizacao; arquivos preservados.');
      const current = planUntrack(root, affectedHashes);
      if (current.conflicts.length || current.index !== affectedIndex.index) fail('Indice Git mudou antes da sincronizacao; conteudo preservado.');
    }
    for (const value of removals) mutate(value, () => rmSync(safe(value), { recursive: true, force: true }), null);
    for (const value of changed) mutate(value, () => atomic(value, expected.get(value)), expected.get(value));
    for (const [value, text] of registries) mutate(value, () => atomic(value, text), text);
    for (const [value, text] of ignoreFiles) mutate(value, () => atomic(value, text), text);
    for (const [value, text] of rootEntryChanges) mutate(value, () => atomic(value, text), text);
    if (configChanged) mutate(config, () => atomic(config, finalConfig), finalConfig);
    assertFallbackChecks();
    // Directory ownership is not recorded: keep even empty parent directories.
    if (localPlan) applyLocalIgnore(localPlan);
  } catch (error) {
    const failures = [];
    for (const value of [...touched].reverse()) {
      try {
        if (fingerprint(capture(value)) !== currentHashes.get(value)) fail(`Mudanca concorrente preservada: ${value}`);
        restore(value, originals.get(value));
      } catch (failure) { failures.push(failure); }
    }
    for (const directory of sorted(createdDirectories).sort((a, b) => b.length - a.length)) {
      try { if (!originalDirectories.has(directory) && stat(safe(directory))?.isDirectory() && !readdirSync(absolute(directory)).length) rmdirSync(safe(directory)); }
      catch (failure) { failures.push(failure); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], `${error.message}; rollback incompleto: ${failures.map(failure => failure.message).join('; ')}`);
    throw error;
  }
  return { ...summary, ownedOutputs, managedBlocks, preserved: preservedPaths, exitCode: 0, ...(backupRoot ? { backupRoot } : {}) };
}

export function main(args = process.argv.slice(2)) {
  requireNode();
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (option === '--check') options.check = true;
    else if (option === '--force') options.force = true;
    else if (option === '--root') {
      if (!args[index + 1] || args[index + 1].startsWith('--')) fail('--root exige um caminho.');
      options.root = args[++index];
    } else if (option === '--documento') fail('--documento foi removido: somente skills, agents, commands e rules sao sincronizados.');
    else fail(`Opcao desconhecida: ${option}`);
  }
  return synchronize(options).exitCode;
}

if (isMain(import.meta.url)) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}
