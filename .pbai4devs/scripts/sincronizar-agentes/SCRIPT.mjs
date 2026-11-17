#!/usr/bin/env node
// Planeja em memória; somente os caminhos gerenciados pelo manifesto são alterados.
import { constants, chmodSync, closeSync, fchmodSync, fstatSync, ftruncateSync, futimesSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, realpathSync, renameSync, rmSync, rmdirSync, writeFileSync, writeSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { inspectLinuxXattr, inspectMacAcl, inspectMacDirectoryAcl, inspectMacXattr } from '../lib/xattr-probe.mjs';
import { fileOwnerIssue } from '../lib/file-owner.mjs';
import { safeGitEnvironment, assertUnredirectedGitEnvironment, assertNoNestedGit } from '../lib/git-environment.mjs';
import { attachErrorDiagnostics, collectErrorDiagnostics, explainUnsupportedHardlink, withPotentialPartial, withUncertainPath } from '../lib/error-reporting.mjs';
import { requireNode, projectRoot, isMain } from '../lib/runtime.mjs';
import { buildCatalog } from '../lib/catalog.mjs';
import { clientResourcePath, resourcePath } from '../lib/resource-path.mjs';
import { planClaudeRule, serializeClaudePaths } from '../lib/claude-rule-scope.mjs';
import { isLegacyExact } from '../lib/claude-legacy-exact.mjs';
import { adapterManifest, resolveAdapters } from '../lib/adapters.mjs';
import { nativePathBoundary } from '../lib/native-paths.mjs';
import { mayReferenceClaudeRule, resemblesClaudeReference, scanRetainedClaude } from '../lib/claude-retained.mjs';
import { canonicalEntrypoint, resolveEntrypoint, entrypointReference, renderEntrypointImports, extractManagedBlock, mergeManagedContent, stripManagedContent } from '../lib/managed-content.mjs';
import { extractTomlManagedBlock, mergeTomlContent, stripTomlContent, promptMatchesCompleteReference, geminiReferenceBody } from '../lib/managed-toml.mjs';
import { mergeGitignore, validateIgnoreClients, renderClientIgnore, isGeneratedOutput, planLocalIgnore, applyLocalIgnore, checkLocalIgnore, assertLocalIgnoreUnchanged, planUntrack, indexContentMatches, isBlockingLocalIgnore, ignoreBegin, ignoreEnd } from '../lib/gitignore.mjs';
import { stateDirectory } from '../lib/state-path.mjs';
import { copyFileWithNativeMetadata, inspectMacWriteProtection, nativeMetadataCopySupported, stageReplacementWithNativeMetadata } from '../lib/native-metadata.mjs';

const marker = '<!-- gerado: sincronizar-agentes -->';
const tomlMarker = '# gerado: sincronizar-agentes';
const principals = { skills: 'SKILL.md', agents: 'AGENT.md', commands: 'COMMAND.md', rules: 'RULE.md' };
const auxiliary = ['templates', 'scripts', 'tools', 'external-skills', 'state', 'estado', 'tests', 'docs', 'adapters'];
const reserved = new Set(['.git', '.pbai4devs', '.agent-tests']);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sorted = values => [...new Set(values)].sort(compare);
const layouts = new Set(['agrupado', 'plano', 'arquivo', 'mdc', 'instrucoes', 'prompt', 'agente', 'nenhum']);
const fail = message => { throw new Error(message); };
const parseJson = (text, label) => {
  try { return JSON.parse(text); } catch { throw new SyntaxError(`JSON invalido: ${label}`); }
};
const normalize = text => text.replace(/\r\n?/g, '\n');
const read = file => normalize(readFileSync(file, 'utf8'));
const stat = file => {
  try { return lstatSync(file); }
  catch (error) { if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null; throw error; }
};
function indexStatMatchesFile(root, path, info) {
  const result = spawnSync('git', ['--literal-pathspecs', '-C', root, '-c', 'core.fsmonitor=false', 'ls-files', '--debug', '-z', '--', path], {
    encoding: null, env: { ...safeGitEnvironment(), LC_ALL: 'C', LANGUAGE: 'C' }, windowsHide: true, maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0 || result.signal || !Buffer.isBuffer(result.stdout)) return false;
  const separator = result.stdout.indexOf(0);
  if (separator < 0 || result.stdout.indexOf(0, separator + 1) >= 0
    || !result.stdout.subarray(0, separator).equals(Buffer.from(path))) return false;
  const fields = result.stdout.subarray(separator + 1).toString('ascii');
  const value = name => fields.match(new RegExp(`(?:^|[\\t\\n])\\s*${name}:\\s+(\\d+)`))?.[1];
  const time = name => {
    const match = fields.match(new RegExp(`^\\s*${name}:\\s+(\\d+):(\\d+)`, 'm'));
    return match ? BigInt(match[1]) * 1_000_000_000n + BigInt(match[2].padStart(9, '0')) : null;
  };
  const dev = value('dev'), ino = value('ino'), uid = value('uid'), gid = value('gid'), size = value('size');
  // Git for Windows and Node report ctime with different semantics.
  return dev !== undefined && ino !== undefined && uid !== undefined && gid !== undefined && size !== undefined
    && BigInt(dev) === info.dev && BigInt(ino) === info.ino && BigInt(uid) === info.uid && BigInt(gid) === info.gid
    && BigInt(size) === info.size && (process.platform === 'win32' || time('ctime') === info.ctimeNs)
    && time('mtime') === info.mtimeNs;
}

function indexBlobMatchesFile(root, path, bytes, info) {
  const env = { ...safeGitEnvironment(), GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1', LC_ALL: 'C', LANGUAGE: 'C' };
  const result = spawnSync('git', ['--literal-pathspecs', '-C', root, '-c', 'core.fsmonitor=false', 'ls-files', '--stage', '-z', '--', path], {
    encoding: null, env, windowsHide: true, maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0 || result.signal || !Buffer.isBuffer(result.stdout)) return false;
  const end = result.stdout.indexOf(0), tab = result.stdout.indexOf(9);
  if (end < 0 || result.stdout.indexOf(0, end + 1) >= 0 || tab < 0 || tab >= end
    || !result.stdout.subarray(tab + 1, end).equals(Buffer.from(path))) return false;
  const entry = result.stdout.subarray(0, tab).toString('ascii').match(/^(100644|100755) ([0-9a-f]{40,64}) 0$/);
  const expectedMode = info.mode & 0o111n ? '100755' : '100644';
  if (!entry || entry[1] !== expectedMode) return false;
  const blob = spawnSync('git', ['--literal-pathspecs', '-C', root, '-c', 'core.fsmonitor=false', 'cat-file', 'blob', entry[2]], {
    encoding: null, env, windowsHide: true, maxBuffer: 1024 * 1024,
  });
  return !blob.error && blob.status === 0 && !blob.signal && Buffer.isBuffer(blob.stdout)
    && blob.stdout.length <= 1024 * 1024 && indexContentMatches(root, path, bytes, blob.stdout);
}

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

// Accept only unambiguous quoted scalars for applyTo and optional description.
function copilotApplyTo(text) {
  let front;
  try { front = header(text); } catch { return null; }
  const lines = front.trimEnd().split('\n').slice(1, -1);
  const fields = {};
  for (const line of lines) {
    const match = line.match(/^(applyTo|description):\s*(.*?)\s*$/);
    if (!match || Object.hasOwn(fields, match[1])) return null;
    const value = match[2]; let parsed;
    if (/^"(?:[^"\\]|\\.)*"$/.test(value)) {
      try { parsed = JSON.parse(value); } catch { return null; }
    } else if (/^'(?:[^']|'')*'$/.test(value)) parsed = value.slice(1, -1).replace(/''/g, "'");
    else return null;
    if (typeof parsed !== 'string' || !parsed.trim()) return null;
    fields[match[1]] = parsed;
  }
  return fields.applyTo || null;
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

// Internal planning evidence only: paths do not describe every filesystem
// effect and are not a backup or permission to mutate a project.
export function inspectSyncEffects(options = {}) {
  return synchronize({ ...options, check: true, inspectEffects: true });
}

export function synchronize({ root = projectRoot, check = false, force = false, localIgnores = true, generateEntrypoints = true, recordDerivedState = true, inspectEffects = false, outputBlocked, output = console.log } = {}) {
  requireNode();
  if (inspectEffects && !check) fail('Inspecao de efeitos exige modo de consulta.');
  assertUnredirectedGitEnvironment();
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
    const env = safeGitEnvironment();
    const probe = spawnSync('git', ['-C', root, '-c', 'core.fsmonitor=false', 'rev-parse', '--is-inside-work-tree'], {
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
    const recordedHash = priorFiles[value];
    const recorded = recordedHash === createHash('sha256').update(bytes).digest('hex');
    return isReference(text) && recorded;
  };
  const indexAttributeFilesMatch = value => {
    const parts = value.split('/'), candidates = ['.gitattributes'];
    for (let index = 0; index < parts.length - 1; index++) candidates.push(`${parts.slice(0, index + 1).join('/')}/.gitattributes`);
    for (const candidate of candidates) {
      const file = safe(candidate), info = stat(file);
      if (!info) continue;
      if (!info.isFile() || info.isSymbolicLink()) return false;
      const identity = lstatSync(file, { bigint: true }), bytes = readFileSync(file);
      if (!indexStatMatchesFile(root, candidate, identity) || !indexBlobMatchesFile(root, candidate, bytes, identity)) return false;
    }
    return true;
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
  const installed = stat(safe(stateFile)) ? parseJson(read(safe(stateFile)), 'estado instalado') : null;
  const configText = configExists ? read(safe(config)) : adapterManifest(root, { clients: installed?.clients });
  const rows = configText.split('\n');
  const entryRegistry = `${stateRoot}/derived.json`;
  const registryBytes = stat(safe(entryRegistry)) ? readFileSync(absolute(entryRegistry)) : null;
  captureInput(entryRegistry, registryBytes);
  const previousEntries = registryBytes ? parseJson(registryBytes.toString('utf8'), 'estado derivado') : { schemaVersion: 1, entries: {} };
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
  const effectiveRemovedFiles = { ...removedFiles };
  const unverifiedRemovals = sorted(Object.keys(removedFiles).filter(path => !Object.hasOwn(installed?.files ?? {}, path)));
  const unknownRemovedFiles = new Set(unverifiedRemovals);
  if (unverifiedRemovals.length) output(`Registros de remocao sem entrada no estado instalado; preserve e revise: ${unverifiedRemovals.map(path => JSON.stringify(path)).join(', ')}.`);
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
  let stageMayHaveEffects = false;
  function blockedOutput(path) {
    if (outputBlocked) return outputBlocked(path, { stageMayHaveEffects });
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
  const rules = new Map(built.catalog.rules.map(rule => [rule.path, rule]));
  const entries = new Map();
  const folded = new Map();
  const omittedClaude = new Map();
  const invalidClaude = new Map();
  const claudeScopeBoundaries = new Set();
  function add(target, source, metadata = '') {
    if (preserveUnknown(target)) {
      if (target.startsWith('.claude/rules/')) claudeScopeBoundaries.add(target);
      return;
    }
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
      const nativeTarget = `${agent}/${resourcePath(source, kind, format)}`;
      const explicitMetadata = natives.some(native => native.target === nativeTarget && native.source === source && native.metadata);
      let path = clientResourcePath(source, kind, format, agent, rules.get(source), explicitMetadata);
      if (path === null) {
        omittedClaude.set(nativeTarget, { source, trigger: rules.get(source)?.trigger });
        continue;
      }
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
    if (target.startsWith('.claude/rules/') && rules.has(source)) {
      const scope = planClaudeRule({ trigger: rules.get(source).trigger, nativeMetadata: metadata ? read(safe(metadata)) : undefined });
      if (scope.status !== 'ready') {
        if (!check) fail(`Escopo Claude invalido ou nao comprovado: ${target}: ${scope.reason || scope.status}.`);
        invalidClaude.set(target, scope.reason || scope.status);
        entries.delete(target); folded.delete(target.toLowerCase());
        continue;
      }
    }
    if (target.startsWith('.github/instructions/') && target.endsWith('.instructions.md') && rules.has(source) && ['manual', 'model_decision'].includes(rules.get(source).trigger) && !metadata) {
      const existing = stat(safe(target));
      // A human's existing frontmatter remains authoritative. Creating or
      // refreshing a native instruction without metadata would broaden it.
      if (!existing?.isFile() || referenceFile(target)) fail(`Regra ${rules.get(source).trigger} exige YAML nativo explicito para ${target}.`);
    }
    if (stat(absolute(source))?.isFile()) add(target, source, metadata);
    else missing.push(native);
  }
  for (const target of omittedClaude.keys()) if (entries.has(target)) fail(`Destino Claude ambiguo entre regra sem escopo e outra origem: ${target}.`);
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
  const protectedClaudeStale = new Set();
  const omittedStagedConflicts = [];
  for (const [target] of invalidClaude) {
    conflicts.add(target); protectedConflicts.add(target);
    if (preserveBoundary(target)) { claudeScopeBoundaries.add(target); continue; }
    if (stat(safe(target))) remember(target, 'claude-scope-invalid');
  }
  for (const [target] of omittedClaude) {
    if (preserveBoundary(target)) { claudeScopeBoundaries.add(target); continue; }
    const info = stat(safe(target));
    // Estados legados só registram hash de conteúdo. Isso não prova que o
    // inode, o modo, ACLs ou xattrs ainda pertençam ao kit, nem que o arquivo
    // não tenha sido substituído por outro com bytes iguais.
    if (info) {
      remember(target, 'claude-scope-preserved');
      conflicts.add(target); protectedConflicts.add(target);
      if (info.isFile()) {
        const indexPlan = planUntrack(root, { [target]: createHash('sha256').update(readFileSync(safe(target))).digest('hex') });
        omittedStagedConflicts.push(...indexPlan.conflicts);
      }
    }
  }
  const expected = new Map();
  const stagedLineEndingCandidates = new Set();
  // Preserving a human file does not reverse an earlier ownership tombstone.
  const preservedHumanFiles = new Set();
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
    if (unknownRemovedFiles.has(value)) { remember(value, 'removed-file-unverified'); conflicts.add(value); protectedConflicts.add(value); return; }
    if (omittedClaude.has(value) || protectedClaudeStale.has(value)) { remember(value, 'claude-scope-preserved'); conflicts.add(value); protectedConflicts.add(value); return; }
    if (isGeneratedOutput(value)) { remember(value, 'local-output'); return; }
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
    if (isGeneratedOutput(value, info.isDirectory())) { remember(value, 'local-output'); return; }
    const files = info.isDirectory() ? scan(value, { prune: true }) : [value];
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
  const ignoreClients = validateIgnoreClients(parseJson(read(absolute(clientSettingsPath)), 'configuracao de clientes'));
  const ignoreTemplates = new Map([
    ['.pbai4devs/.gitignore', '.pbai4devs/templates/gitignore/shared.ignore'],
  ]);
  for (const folder of sorted(ignoreRoots)) {
    const target = `${folder}/.gitignore`;
    if (!preserveBoundary(target) && stat(safe(target))) remember(target, 'existing-ignore');
  }
  for (const [target, template] of ignoreTemplates) {
    if (preserveBoundary(target)) continue;
    if (!stat(safe(template))?.isFile()) fail(`Template .gitignore ausente ou invalido: ${template}`);
    const info = stat(safe(target));
    if (target !== '.pbai4devs/.gitignore' && preserveNativeType(target, info, 'isFile')) continue;
    if (info && !info.isFile()) fail(`.gitignore nao e arquivo: ${target}`);
    let merged;
    const current = info ? readFileSync(absolute(target), 'utf8') : '';
    captureInput(target, info ? Buffer.from(current) : null);
    if (info) {
      const start = current.indexOf(ignoreBegin), finish = current.indexOf(ignoreEnd);
      const blockHash = start >= 0 && finish > start ? createHash('sha256').update(current.slice(start, finish + ignoreEnd.length)).digest('hex') : null;
      const fileHash = createHash('sha256').update(current).digest('hex');
      if (blockHash && ([installed?.blocks?.[target], previousEntries.blocks?.[target]].includes(blockHash) || priorFiles[target] === fileHash)) managedBlocks[target] = blockHash;
      else remember(target, 'existing-ignore');
      continue;
    }
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
    const installedHash = installed?.files?.[target], derivedHash = previousEntries.files?.[target];
    const currentHash = targetBytes && createHash('sha256').update(targetBytes).digest('hex');
    const conflictingRecords = Boolean(installedHash && derivedHash && installedHash !== derivedHash
      && (!targetBytes || currentHash !== derivedHash));
    // When only one whole-file record exists, preserve a later human edit
    // unless a separately recorded Markdown block actually validates.
    let derivedOnlyDiverged = Boolean(derivedHash && targetBytes && currentHash !== derivedHash
      && (!installedHash || installedHash === derivedHash) && /\.(md|mdc)$/i.test(target));
    if (derivedOnlyDiverged && !conflictingRecords && targetBytes) {
      const text = targetBytes.toString('utf8'), normalized = Buffer.from(text.replaceAll('\r\n', '\n'));
      const lineEndingOnly = Buffer.from(text).equals(targetBytes) && text.includes('\r\n') && !text.replaceAll('\r\n', '').includes('\r')
        && createHash('sha256').update(normalized).digest('hex') === derivedHash;
      const currentInfo = lineEndingOnly ? lstatSync(safe(target), { bigint: true }) : null;
      if (lineEndingOnly && currentInfo.isFile() && !currentInfo.isSymbolicLink()
        && indexStatMatchesFile(root, target, currentInfo) && indexBlobMatchesFile(root, target, targetBytes, currentInfo)
        && indexAttributeFilesMatch(target)) {
        derivedOnlyDiverged = false;
        stagedLineEndingCandidates.add(target);
      }
    }
    if (derivedOnlyDiverged && priorBlocks[target]) {
      const existingBlock = extractManagedBlock(targetBytes);
      if (existingBlock && createHash('sha256').update(existingBlock).digest('hex') === priorBlocks[target]) derivedOnlyDiverged = false;
    }
    if (unknownRemovedFiles.has(target)) {
      remember(target, 'removed-file-unverified'); conflicts.add(target); protectedConflicts.add(target);
      preservedHumanFiles.add(target); if (targetBytes) expected.set(target, targetBytes); continue;
    }
    if (conflictingRecords || derivedOnlyDiverged) {
      // Diagnostic only: matching normalized bytes does not establish ownership
      // or authorize replacing the user's line endings.
      let reason = 'derived-reference-diverged';
      if (derivedOnlyDiverged && !conflictingRecords && targetBytes.includes(13)) {
        const text = targetBytes.toString('utf8');
        if (Buffer.from(text).equals(targetBytes) && !text.replaceAll('\r\n', '').includes('\r')
          && createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex') === derivedHash) reason = 'line-ending-diverged';
      }
      remember(target, reason); conflicts.add(target); protectedConflicts.add(target);
      preservedHumanFiles.add(target); if (targetBytes) expected.set(target, targetBytes); continue;
    }
    const reference = targetBytes && (referenceFile(target, targetBytes)
      || stagedLineEndingCandidates.has(target) && isReference(normalize(targetBytes.toString('utf8'))));
    const mixed = info?.isFile() && /\.(md|mdc|toml)$/i.test(target) && (priorBlocks[target] || !reference);
    if (info && !mixed && (!info.isFile() || !reference)) {
      scan(target);
      if (force) planRemove(target, true); else conflicts.add(target);
    }
    const sourceText = read(safe(source));
    if (target.startsWith('.claude/rules/') && rules.has(source)) {
      const rule = rules.get(source);
      // Referência legada exata não estabelece ownership nem ativação nativa.
      const legacyName = target.match(/^\.claude\/rules\/([a-z0-9]+(?:-[a-z0-9]+)*)\/RULE\.md$/)?.[1];
      const legacyTitle = sourceText.match(/^# [^\r\n]+$/m)?.[0];
      const legacyGenerated = legacyName && legacyTitle && !metadata && rule.trigger === 'always_on'
        && source === `.pbai4devs/rules/${legacyName}/RULE.md`
        ? Buffer.from(`---\ndescription: ${JSON.stringify(rule.description)}\n---\n\n${legacyTitle}\n\n${marker}\nLeia e siga [origem](${link(target, source)}).\n`) : null;
      if (legacyGenerated && targetBytes && isLegacyExact(readFileSync(absolute(source)), targetBytes, legacyGenerated, legacyName)
        && !installed?.files?.[target] && !installed?.blocks?.[target]
        && !previousEntries.files?.[target] && !previousEntries.blocks?.[target]
        && !previousEntries.entries?.[target] && !previousOutputs[target] && !previousCatalogs[target]
        && !removedBlocks.has(target) && !Object.hasOwn(removedFiles, target)) {
        captureInput(target, targetBytes); preservedHumanFiles.add(target);
        remember(target, 'legacy-claude-scope-unverified'); expected.set(target, targetBytes);
        claudeScopeBoundaries.add(target); continue;
      }
      const scope = planClaudeRule({ trigger: rule.trigger, nativeMetadata: metadata ? read(safe(metadata)) : undefined, ...(mixed ? { humanFile: targetBytes.toString('utf8') } : {}) });
      if (scope.status === 'blocked' || scope.status === 'reference-only') fail(`Escopo Claude invalido ou nao comprovado: ${target}: ${scope.reason || scope.status}.`);
      if (mixed) {
        if (priorBlocks[target]) managedBlocks[target] = priorBlocks[target];
        remember(target, 'claude-scope-preserved');
        conflicts.add(target); protectedConflicts.add(target);
        expected.set(target, targetBytes);
        continue;
      }
    }
    if (mixed && target.startsWith('.github/instructions/') && target.endsWith('.instructions.md') && rules.has(source)) {
      const rule = rules.get(source);
      let compatible = false;
      if (metadata) {
        try {
          const native = read(safe(metadata));
          compatible = copilotApplyTo(native) !== null && header(targetBytes.toString('utf8')) === header(native);
        } catch { /* Preserve ambiguous human metadata. */ }
      } else if (['always_on', 'glob'].includes(rule.trigger)) {
        const actual = copilotApplyTo(targetBytes.toString('utf8'));
        compatible = actual !== null && actual === (rule.trigger === 'glob' ? rule.globs : '**');
      }
      if (!compatible) {
        // Existing owned blocks remain intact too: removing them would change
        // human bytes. Report the collision for the user to review.
        if (priorBlocks[target]) managedBlocks[target] = priorBlocks[target];
        remember(target, 'copilot-scope-preserved');
        conflicts.add(target);
        protectedConflicts.add(target);
        expected.set(target, targetBytes);
        continue;
      }
    }
    if (target.startsWith('.gemini/commands/') && target.endsWith('.toml')) {
      if (/[{}]/.test(source)) fail(`Caminho incompativel com inclusao Gemini: ${source}`);
      const command = built.catalog.commands.find(entry => entry.path === source);
      if (!command) fail(`Comando Gemini exige COMMAND.md: ${source}`);
      const current = mixed ? targetBytes : null;
      if (current && !priorBlocks[target] && priorFiles[target] !== createHash('sha256').update(current).digest('hex') && extractTomlManagedBlock(current)) {
        // A pre-existing block does not prove ownership.
        captureInput(target, current);
        preservedHumanFiles.add(target);
        remember(target, 'existing-managed-block'); expected.set(target, current); continue;
      }
      if (current && !priorBlocks[target] && priorFiles[target] !== createHash('sha256').update(current).digest('hex')
        && promptMatchesCompleteReference(current, `@{${source}}\n\n{{args}}`)) {
        captureInput(target, current);
        preservedHumanFiles.add(target);
        remember(target, 'existing-prompt-satisfied'); expected.set(target, current); continue;
      }
      const body = mixed ? geminiReferenceBody(current, `@{${source}}\n\n{{args}}`, priorBlocks[target]) : null;
      const merged = mixed ? mergeTomlContent(current, body, { expectedHash: priorBlocks[target] }) : null;
      const content = merged ? merged.text : `${tomlMarker}\ndescription = ${JSON.stringify(command.description)}\nprompt = ${JSON.stringify(`@{${source}}\n\n{{args}}`)}\n`;
      if (mixed) { captureInput(target, current); managedBlocks[target] = merged.sha256; remember(target, 'existing-file-extended'); }
      else rememberGenerated(target, content);
      expected.set(target, content);
      if (!info?.isFile() || readFileSync(absolute(target), 'utf8') !== content) changed.push(target);
      continue;
    }
    let frontmatter;
    if (target.startsWith('.claude/rules/') && rules.has(source)) {
      const rule = rules.get(source);
      const scope = planClaudeRule({ trigger: rule.trigger, nativeMetadata: metadata ? read(safe(metadata)) : undefined });
      if (scope.status !== 'ready') fail(`Escopo Claude invalido ou nao comprovado: ${target}.`);
      frontmatter = scope.activation === 'paths' ? serializeClaudePaths(scope.paths) : `---\ndescription: ${JSON.stringify(rule.description)}\n---\n`;
    } else if (metadata) frontmatter = header(read(safe(metadata)));
    else if (target.endsWith('.mdc')) {
      const rule = built.catalog.rules.find(entry => entry.path === source);
      if (!rule) fail(`Regra Cursor exige RULE.md: ${source}`);
      frontmatter = `---\ndescription: ${JSON.stringify(rule.trigger === 'manual' ? '' : rule.description)}\nalwaysApply: ${rule.trigger === 'always_on'}\n${rule.trigger === 'glob' ? `globs: ${JSON.stringify(rule.globs)}\n` : ''}---\n`;
    } else if (target.startsWith('.github/instructions/') && target.endsWith('.instructions.md') && rules.has(source)) {
      const rule = rules.get(source);
      if (!['always_on', 'glob'].includes(rule.trigger) && !mixed) fail(`Regra ${rule.trigger} exige metadados nativos explicitos: ${target}`);
      frontmatter = mixed ? '' : `---\napplyTo: ${JSON.stringify(rule.trigger === 'glob' ? rule.globs : '**')}\n---\n`;
    } else frontmatter = target.endsWith('.instructions.md') ? "---\napplyTo: '**'\n---\n" : header(sourceText);
    const title = sourceText.match(/^# .+$/m)?.[0];
    if (!title) fail(`Titulo ausente: ${source}`);
    const ruleInclusion = /^\.(?:agents|agent)\/rules\//.test(target);
    const inclusion = ruleInclusion ? `@[origem](${link(target, source)})` : `Leia e siga [origem](${link(target, source)}).`;
    const current = mixed ? targetBytes : null;
    // Compare the complete native frontmatter; differing mixed files keep the
    // existing merge behavior.
    const rule = !metadata && target.startsWith('.github/instructions/') && target.endsWith('.instructions.md') ? rules.get(source) : null;
    const exactFrontmatter = rule && ['always_on', 'glob'].includes(rule.trigger)
      ? `---\napplyTo: ${JSON.stringify(rule.trigger === 'glob' ? rule.globs : '**')}\n---\n` : frontmatter;
    const exactGenerated = `${exactFrontmatter}\n${title}\n\n${marker}\n${inclusion}\n`;
    if (current && stagedLineEndingCandidates.has(target) && normalize(current.toString('utf8')) === exactGenerated) {
      captureInput(target, current); preservedHumanFiles.add(target);
      remember(target, 'existing-reference-satisfied'); expected.set(target, current); continue;
    }
    // Preserve an already satisfied installed reference byte-for-byte when
    // only its line endings differ. This does not claim ownership or permit
    // replacing it, and does not apply when the generated content changed.
    if (current && !priorBlocks[target] && !previousEntries.files?.[target]
      && !previousEntries.blocks?.[target] && !previousEntries.entries?.[target]
      && !previousOutputs[target] && !previousCatalogs[target] && !removedBlocks.has(target)
      && !Object.hasOwn(removedFiles, target)) {
      const text = current.toString('utf8'), normalized = text.replaceAll('\r\n', '\n');
      if (text.includes('\r\n') && Buffer.from(text).equals(current) && normalized === exactGenerated
        && (!installedHash || createHash('sha256').update(normalized).digest('hex') === installedHash)) {
        captureInput(target, current); preservedHumanFiles.add(target);
        remember(target, 'existing-reference-satisfied'); expected.set(target, current); continue;
      }
    }
    if (current && !installed?.files?.[target] && !installed?.blocks?.[target]
      && !previousEntries.files?.[target] && !previousEntries.blocks?.[target]
      && !previousEntries.entries?.[target] && !previousOutputs[target] && !previousCatalogs[target]
      && !removedBlocks.has(target) && !Object.hasOwn(removedFiles, target)
      && current.equals(Buffer.from(exactGenerated))) {
      captureInput(target, current); preservedHumanFiles.add(target);
      remember(target, 'existing-reference-satisfied'); expected.set(target, current); continue;
    }
    const merged = mixed ? mergeManagedContent(current, inclusion, { expectedHash: priorBlocks[target] }) : null;
    if (current && !stagedLineEndingCandidates.has(target) && !priorBlocks[target]
      && priorFiles[target] !== createHash('sha256').update(current).digest('hex') && extractManagedBlock(current)) {
      remember(target, 'existing-managed-block'); expected.set(target, current); continue;
    }
    const content = merged ? merged.text : `${frontmatter}\n${title}\n\n${marker}\n${inclusion}\n`;
    if (target.startsWith('.claude/rules/') && info?.isFile() && !targetBytes.equals(Buffer.from(content))) {
      // Um hash anterior não comprova identidade ou metadados do arquivo atual.
      remember(target, 'claude-metadata-unverified'); conflicts.add(target); protectedConflicts.add(target);
      expected.set(target, targetBytes);
      continue;
    }
    if (mixed) { captureInput(target, current); managedBlocks[target] = merged.sha256; remember(target, 'existing-file-extended'); }
    else rememberGenerated(target, content);
    expected.set(target, content);
    if (!info?.isFile() || readFileSync(absolute(target), 'utf8') !== content) changed.push(target);
  }
  if (agents.has('.claude')) {
    // Claude carrega regras mesmo em diretórios ignorados como .local/.cache.
    // Limite ou erro de varredura bloqueia a escrita e mantém a proveniência.
    for (const item of scanRetainedClaude(root)) {
      const file = item.path;
      if (item.reason === 'claude-scan-incomplete') {
        remember(file, item.reason); conflicts.add(file); protectedConflicts.add(file); continue;
      }
      if (item.reason !== 'claude-activation-unverified') {
        remember(file, item.reason); claudeScopeBoundaries.add(file); continue;
      }
      if (expected.has(file)) continue;
      if (!ownedPaths.has(file)) {
        const info = stat(safe(file));
        if (!info?.isFile() || info.size > 1024 * 1024) { claudeScopeBoundaries.add(file); continue; }
        const text = read(safe(file));
        if (!resemblesClaudeReference(file, text)) {
          if (mayReferenceClaudeRule(file, text)) { remember(file, 'claude-scope-unverified'); claudeScopeBoundaries.add(file); }
          continue;
        }
      }
      // Hash não comprova que inode, modo, ACL ou xattrs não mudaram.
      protectedClaudeStale.add(file); remember(file, 'claude-metadata-unverified');
      conflicts.add(file); protectedConflicts.add(file);
    }
  }
  for (const agent of agents.keys()) {
    for (const kind of [...auxiliary, 'README.md', 'INSTRUCTIONS.md']) cleanScope(`${agent}/${kind}`);
    for (const kind of Object.keys(principals)) {
      const scope = `${agent}/${kind}`;
      if (preserveBoundary(scope)) continue;
      const info = stat(safe(scope));
      if (!info) continue;
      const files = scan(scope, { prune: true });
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
          if (isGeneratedOutput(child, true)) continue;
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
    if (unknownRemovedFiles.has(target)) {
      // Preserve the original overlay separately; it is not a newly managed
      // block and must not clear an existing removedBlocks entry.
      remember(target, 'removed-file-unverified'); continue;
    }
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
  for (const [path, digest] of Object.entries(previousEntries.blocks ?? {})) {
    if (unknownRemovedFiles.has(path)) derivedBlocks[path] = digest;
  }
  if (Object.keys(derivedBlocks).length) next.blocks = derivedBlocks;
  for (const path of Object.keys(managedBlocks)) removedBlocks.delete(path);
  if (removedBlocks.size) next.removedBlocks = sorted(removedBlocks);
  for (const path of expected.keys()) if (!preservedHumanFiles.has(path)) delete effectiveRemovedFiles[path];
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
  // Ordered logical file actions the execution loop would attempt. Parent
  // chains are lexical candidates, checked again at the point of use; they
  // do not describe temporary names, backups or rollback and are not a
  // recovery plan.
  const parentChain = path => {
    const parents = [];
    for (let parent = posix.dirname(path); parent !== '.'; parent = posix.dirname(parent)) parents.push(parent);
    return parents;
  };
  const logicalOperations = [
    ...removals.map(path => ({ path, action: 'remove' })),
    ...changed.map(path => ({ path, action: 'write', content: expected.get(path), parents: parentChain(path) })),
    ...[...registries, ...ignoreFiles, ...rootEntryChanges].map(([path, content]) => ({ path, action: 'write', content, parents: parentChain(path) })),
    ...(configChanged ? [{ path: config, action: 'write', content: finalConfig, parents: parentChain(config) }] : []),
  ];
  for (const operation of logicalOperations) {
    if (typeof operation.path !== 'string' || !['remove', 'write'].includes(operation.action)
      || operation.action === 'write' && typeof operation.content !== 'string' && !Buffer.isBuffer(operation.content)) {
      fail('Plano de operacoes logicas invalido; nenhuma alteracao foi aplicada.');
    }
  }
  const backupCandidate = backups.length ? `.agent-tests/sync-backup.${randomUUID()}` : null;
  const nestedCandidates = [...logicalOperations.map(operation => operation.path), ...(backupCandidate ? [backupCandidate] : [])];
  try { assertNoNestedGit(root, nestedCandidates); }
  catch (error) {
    if (!check || error.code !== 'E_NESTED_GIT') throw error;
    conflicts.add(error.nestedGitPath); protectedConflicts.add(error.nestedGitPath); remember(error.nestedGitPath, 'nested-git');
  }
  // Every planned write/removal may cover a different staged version. Compare
  // the worktree bytes with the index before touching any path, even in force
  // mode, and repeat immediately before applying the transaction.
  const affected = sorted(logicalOperations.map(operation => operation.path));
  const emptyHash = createHash('sha256').update(Buffer.alloc(0)).digest('hex');
  const affectedHashes = Object.fromEntries(affected.flatMap(value => {
    const info = stat(safe(value));
    if (info && !info.isFile()) return []; // A type conflict already blocks application.
    return [[value, info ? createHash('sha256').update(readFileSync(absolute(value))).digest('hex') : emptyHash]];
  }));
  const hadGit = Object.keys(affectedHashes).length ? assertGitReadableForChanges() : false;
  const affectedIndex = planUntrack(root, affectedHashes, { gitlinkBoundaries: backupCandidate ? [backupCandidate] : [] });
  for (const path of affectedIndex.gitlinkConflicts || []) {
    conflicts.add(path); protectedConflicts.add(path); remember(path, 'gitlink');
  }
  for (const path of affectedIndex.paths) {
    if (!removals.includes(path)) continue;
    conflicts.add(path);
    protectedConflicts.add(path);
    remember(path, 'tracked-stale-file-preserved');
  }
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
  const transactionRoots = topPaths(logicalOperations.map(operation => operation.path));
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
  const touched = new Set(), createdDirectories = new Set(), uncertainWrites = new Set(), unpublishedWrites = new Set(), publishedIdentities = new Map(), identityGuards = [];
  let identityPressure = false;
  const releaseIdentityGuards = () => {
    identityPressure = true;
    for (const path of publishedIdentities.keys()) publishedIdentities.set(path, null);
    for (const guard of identityGuards.splice(0)) try { closeSync(guard.fd); } catch { /* Preserve the operation result. */ }
  };
  const summary = { changed: changed.length + rootEntryChanges.length, stale: removals.length, conflicts: conflicts.size, missing: missing.length, legacy: legacy.length, registries: registries.size, gitignores: ignoreFiles.size, manifests: configExists ? 0 : 1, localIgnores: localStatus.changed + localStatus.missing.length + localStatus.trackedOutputs.length + (localStatus.pending?.filter(isBlockingLocalIgnore).length || 0) + (localStatus.status === 'no-git' ? 1 : 0) };
  const retainedClaudeRules = agents.has('.claude') ? [] : scanRetainedClaude(root);
  // Qualquer obstrução em rules pode ocultar instruções, mesmo sem omissões.
  const activeClaudeBoundaries = agents.has('.claude') ? [...preserved].filter(([path, item]) =>
    (path === '.claude' || path === '.claude/rules' || path.startsWith('.claude/rules/'))
      && ['symbolic-link', 'non-directory', 'non-file'].includes(item.reason)) : [];
  const dirty = Object.values(summary).some(Boolean) || unverifiedRemovals.length > 0 || retainedClaudeRules.length > 0 || claudeScopeBoundaries.size > 0 || activeClaudeBoundaries.length > 0;
  if (retainedClaudeRules.length || claudeScopeBoundaries.size || activeClaudeBoundaries.length) output('Escopo Claude nao verificado: regras preservadas podem continuar ativas globalmente; revise-as.');
  output(`${summary.changed} desatualizadas; ${summary.stale} obsoletas; ${summary.conflicts} conflitos; ${summary.missing} origens nativas ausentes; ${summary.legacy} documentos antigos; ${summary.registries} indices derivados; ${summary.gitignores} gitignores; ${summary.localIgnores} exclusoes locais.`);
  const conflictPaths = sorted(conflicts);
  if (conflictPaths.length) {
    output(`Conflitos preservados: ${conflictPaths.slice(0, 10).map(path => JSON.stringify(path)).join(', ')}${conflictPaths.length > 10 ? ` (+${conflictPaths.length - 10})` : ''}`);
  }
  if (localPlan?.worktreeScope) output('Configuracao Git e ignores existentes preservados; apontamentos, artefatos e dados privados podem ficar visiveis. Confira o status antes de adicionar arquivos. Regras antigas podem afetar outras worktrees.');
  const pending = localStatus.pending || [];
  const displayedPending = [...pending.filter(isBlockingLocalIgnore), ...pending.filter(item => !isBlockingLocalIgnore(item))];
  for (const item of displayedPending.slice(0, 12)) output(`${isBlockingLocalIgnore(item) ? 'Pendente' : 'Aviso'}: ${item.code}: ${item.path}`);
  if (pending.length > 12) output(`+${pending.length - 12}; use agentdevkit sync --check --json para detalhes.`);
  assertFallbackChecks();
  if (localStatus.status === 'no-git') output('Git indisponivel ou nao inicializado: apos instalar e iniciar Git, execute sync --check para verificar arquivos visiveis.');
  const preservedPaths = sorted(preserved.keys()).map(path => preserved.get(path));
  const lineEndingConflicts = preservedPaths.filter(item => item.reason === 'line-ending-diverged').map(item => item.path);
  if (lineEndingConflicts.length) output(`Finais de linha divergentes preservados; revise antes de sincronizar: ${lineEndingConflicts.slice(0, 10).map(path => JSON.stringify(path)).join(', ')}${lineEndingConflicts.length > 10 ? ` (+${lineEndingConflicts.length - 10})` : ''}`);
  const claudeRetiredTargets = [...omittedClaude.entries()].map(([target, item]) => ({ target, source: item.source, trigger: item.trigger }));
  // Um alvo legado preservado pode continuar sendo carregado globalmente.
  // Uma omissão descreve o plano, não comprova o estado ativo no cliente.
  const claudeScopeConflicted = claudeScopeBoundaries.size > 0 || activeClaudeBoundaries.length > 0 || [...conflicts].some(path => path.startsWith('.claude/rules/'));
  const scopeOmissions = [...omittedClaude.entries()]
    .filter(([, item]) => ![...entries].some(([target, entry]) => target.startsWith('.claude/rules/') && entry.source === item.source))
    .map(([target, item]) => ({ target, source: item.source, trigger: item.trigger, status: claudeScopeConflicted ? 'activation-unverified' : 'explicit-reference-planned' }));
  if (scopeOmissions.length) output(claudeScopeConflicted
    ? 'Escopo Claude nao verificado: arquivos preservados podem continuar ativos globalmente; revise as regras e o escopo.'
    : `Plano Claude sem nova ativacao automatica: ${scopeOmissions.map(item => item.source).join(', ')}. Leia as fontes explicitamente; outras regras podem estar ativas e a equivalencia de escopo nao foi comprovada.`);
  const copilotCollisions = preservedPaths.filter(item => item.reason === 'copilot-scope-preserved').map(item => item.path);
  if (copilotCollisions.length) output(`Escopo Copilot humano diferente ou ambiguo; arquivos preservados para revisao: ${copilotCollisions.join(', ')}`);
  const hardlinkBlockers = [], hardlinkUnverified = [], aclBlockers = [], xattrBlockers = [], xattrUnverified = [], ownerBlockers = [];
  if (check) for (const { path, action } of logicalOperations) {
    const info = stat(safe(path));
    if (!info?.isFile()) continue;
    const ownerIssue = fileOwnerIssue(info);
    if (ownerIssue) ownerBlockers.push({ path, code: ownerIssue });
    if (!Number.isSafeInteger(info.nlink) || info.nlink < 1) hardlinkUnverified.push(path);
    else if (info.nlink > 1) hardlinkBlockers.push(path);
    if (process.platform === 'darwin') {
      const acl = inspectMacAcl(safe(path));
      const safeUpdate = action === 'write' && nativeMetadataCopySupported
        && acl === 'present' && inspectMacWriteProtection(safe(path)) === 'clear';
      if (acl !== 'empty' && !safeUpdate) aclBlockers.push({ path, code: acl === 'present' ? 'acl-present' : 'acl-unverified' });
    }
    if (process.platform === 'linux') {
      const status = inspectLinuxXattr(safe(path));
      if (status === 'present') {
        if (!(action === 'write' && nativeMetadataCopySupported)) xattrBlockers.push(path);
      } else xattrUnverified.push(path);
    }
  }
  if (hardlinkBlockers.length) output(`Hardlinks compartilhados exigem revisao: ${sorted(hardlinkBlockers).join(', ')}`);
  if (hardlinkUnverified.length) output(`Contagem de hardlinks nao verificada: ${sorted(hardlinkUnverified).join(', ')}`);
  if (aclBlockers.length) output(`ACL presente ou nao verificada; revise: ${sorted(aclBlockers.map(item => item.path)).join(', ')}`);
  if (ownerBlockers.length) output(`Proprietario ou leitura do arquivo exige revisao: ${sorted(ownerBlockers.map(item => item.path)).join(', ')}`);
  if (xattrBlockers.length) output(`Atributos estendidos detectados; revise: ${sorted(xattrBlockers).join(', ')}`);
  if (xattrUnverified.length) output('Atributos estendidos Linux nao foram totalmente verificados; a substituicao pode perde-los. Revise e mantenha uma copia que os preserve.');
  if (check) return {
    ...summary, hardlinkBlockers: sorted(hardlinkBlockers), hardlinkUnverified: sorted(hardlinkUnverified), aclBlockers, ownerBlockers, xattrBlockers: sorted(xattrBlockers), xattrUnverified: sorted(xattrUnverified), conflictPaths, ownedOutputs, managedBlocks, preserved: preservedPaths, scopeOmissions, claudeRetiredTargets, retainedClaudeRules, unverifiedRemovals, exitCode: dirty || hardlinkBlockers.length || hardlinkUnverified.length || aclBlockers.length || ownerBlockers.length || xattrBlockers.length ? 1 : 0,
    ...(inspectEffects ? { logicalEffects: {
      completeness: 'incomplete', mutationAuthorized: false,
      exclusions: ['temporary-files', 'backups', 'rollback', 'conditional-directory-changes', 'local-ignore', 'external-callbacks'],
      operations: logicalOperations.map(({ path, action, parents }) => ({ path, action, ...(parents ? { parents: [...parents] } : {}) })),
    } } : {}),
  };
  if (affectedIndex.gitlinkConflicts?.length) fail(`Backup em submódulo Git; arquivos preservados: ${affectedIndex.gitlinkConflicts.join(', ')}`);
  if (omittedStagedConflicts.length) fail(`Indice Git contem alteracoes proprias; arquivos preservados: ${sorted(omittedStagedConflicts).join(', ')}`);
  if (affectedIndex.conflicts.length) fail(`Indice Git contem alteracoes proprias; arquivos preservados: ${sorted(affectedIndex.conflicts).join(', ')}`);
  if (affectedIndex.paths.some(path => removals.includes(path))) fail(`Arquivo obsoleto rastreado no indice Git; remocao bloqueada: ${affectedIndex.paths.filter(path => removals.includes(path)).join(', ')}`);
  if (protectedConflicts.size) {
    const prefix = [...protectedConflicts].some(path => unknownRemovedFiles.has(path))
      ? 'Conteudo preservado ou historico de remocao pendente; revise antes de sincronizar'
      : 'Conteudo proprio preservado; resolva a colisao antes de sincronizar';
    fail(`${prefix}: ${sorted(protectedConflicts).join(', ')}`);
  }
  if (conflicts.size) fail(`Use --force para reconstruir somente os caminhos gerenciados: ${sorted(conflicts).join(', ')}`);
  if (localStatus.missing.length) fail(`Regras humanas reabrem derivados locais: ${localStatus.missing.join(', ')}`);
  if (localPlan) assertLocalIgnoreUnchanged(localPlan);
  // A replacement or removal would break a pre-existing hardlink relationship.
  // This check does not prevent another process from changing links later.
  const assertNoSharedHardlinks = path => {
    const info = stat(safe(path));
    const ownerIssue = fileOwnerIssue(info);
    if (ownerIssue) throw Object.assign(new Error(`E_PROTECTED_METADATA: ${path}`), { code: ownerIssue === 'file-owner-unverified' ? 'E_METADATA_UNSUPPORTED' : 'E_PROTECTED_METADATA', path, metadataReason: ownerIssue });
    if (info?.isFile() && (!Number.isSafeInteger(info.nlink) || info.nlink < 1)) {
      throw Object.assign(new Error(`E_METADATA_UNSUPPORTED: ${path}`), { code: 'E_METADATA_UNSUPPORTED', path });
    }
    if (info?.isFile() && info.nlink > 1) {
      throw Object.assign(new Error(`E_PROTECTED_METADATA: ${path}`), { code: 'E_PROTECTED_METADATA', path });
    }
  };
  for (const { path } of logicalOperations) assertNoSharedHardlinks(path);
  // Conservatively reject special-mode regular files before backup or writes.
  // macOS only: inspect listed ACLs and xattrs; directory effects need separate gates.
  if (process.platform === 'darwin' || process.platform === 'linux') {
    for (const { path, action } of logicalOperations) {
      const info = stat(safe(path));
      const ownerIssue = fileOwnerIssue(info);
      if (ownerIssue) throw Object.assign(new Error(`E_PROTECTED_METADATA: ${path}`), { code: ownerIssue === 'file-owner-unverified' ? 'E_METADATA_UNSUPPORTED' : 'E_PROTECTED_METADATA', path, metadataReason: ownerIssue });
      // Positive detection is useful but an empty/inaccessible Linux listing
      // is inconclusive; this guard is not complete metadata protection.
      if (info?.isFile() && process.platform === 'linux') {
        const xattrs = inspectLinuxXattr(safe(path));
        if (xattrs === 'present' && !(action === 'write' && nativeMetadataCopySupported)) throw Object.assign(new Error(`E_PROTECTED_METADATA: ${path}`), { code: 'E_PROTECTED_METADATA', path });
        if (xattrs !== 'present') xattrUnverified.push(path);
      }
      if (info?.isFile() && process.platform === 'darwin') {
        const protection = inspectMacWriteProtection(safe(path));
        if (protection !== 'clear') {
          const code = protection === 'protected' ? 'E_PROTECTED_METADATA' : 'E_METADATA_UNSUPPORTED';
          throw Object.assign(new Error(`${code}: ${path}`), { code, path });
        }
        const acl = inspectMacAcl(safe(path));
        if (acl !== 'empty' && !(action === 'write' && nativeMetadataCopySupported && acl === 'present')) {
          const code = acl === 'present' ? 'E_PROTECTED_METADATA' : 'E_METADATA_UNSUPPORTED';
          throw Object.assign(new Error(`${code}: ${path}`), { code, path });
        }
        const result = inspectMacXattr(safe(path));
        if (result !== 'empty' && !(action === 'write' && nativeMetadataCopySupported && result === 'present')) {
          const code = result === 'present' ? 'E_PROTECTED_METADATA' : 'E_METADATA_UNSUPPORTED';
          throw Object.assign(new Error(`${code}: ${path}`), { code, path });
        }
      }
      if (info?.isFile() && (info.mode & 0o7000)) {
        throw Object.assign(new Error(`E_PROTECTED_METADATA: ${path}`), { code: 'E_PROTECTED_METADATA', path });
      }
    }
  }
  if (xattrUnverified.length) output('Atributos estendidos Linux nao foram totalmente verificados; a substituicao pode perde-los. Revise e mantenha uma copia que os preserve.');
  function ensureDirectory(value, parents = parentChain(value)) {
    const missing = [];
    for (const parent of parents) {
      if (stat(safe(parent))) break;
      missing.push(parent);
    }
    for (const directory of missing.reverse()) {
      mkdirSync(safe(directory)); createdDirectories.add(directory);
    }
  }
  function mutate(value, action, text) {
    const boundary = transactionRoots.find(root => value === root || value.startsWith(root + '/'));
    if (!boundary || fingerprint(capture(boundary)) !== currentHashes.get(boundary)) fail(`Arquivo mudou apos planejar: ${value}`);
    const beforeHash = currentHashes.get(boundary), previouslyTouched = touched.has(boundary);
    touched.add(boundary);
    let failure, failed = false;
    try { action(); } catch (error) { failure = error; failed = true; }
    if (uncertainWrites.has(value)) {
      currentHashes.set(boundary, 'conteudo-concorrente');
      if (failed) throw failure;
      fail(`Identidade da gravacao nao comprovada; conteudo preservado: ${value}`);
    }
    let afterHash;
    try { afterHash = fingerprint(capture(boundary)); }
    catch (error) { currentHashes.set(boundary, 'conteudo-concorrente'); throw failed ? failure : error; }
    // The atomic write failed before attempting publication.
    // Treat any changed boundary as concurrent even if it matches the desired
    // bytes; on no change, retain the history of an earlier touched boundary.
    if (failed && unpublishedWrites.has(value)) {
      if (afterHash !== beforeHash) currentHashes.set(boundary, 'conteudo-concorrente');
      else {
        if (!previouslyTouched) touched.delete(boundary);
        currentHashes.set(boundary, afterHash);
      }
      throw failure;
    }
    // A failed removal with unchanged observed content may still leave a
    // name owned by another process. Do not recreate it during rollback.
    if (failed && text === null && afterHash === beforeHash) {
      if (previouslyTouched) currentHashes.set(boundary, 'conteudo-concorrente');
      else touched.delete(boundary);
      throw withUncertainPath(failure, value);
    }
    const matches = text === undefined || (text === null ? !stat(safe(value)) : stat(safe(value))?.isFile() && readFileSync(absolute(value)).equals(Buffer.from(text)));
    if (!matches && afterHash !== beforeHash) {
      currentHashes.set(boundary, 'conteudo-concorrente');
      if (failed) throw failure;
      fail(`Mudanca concorrente preservada: ${value}`);
    }
    currentHashes.set(boundary, afterHash);
    if (failed) throw failure;
    if (!matches) fail(`Arquivo nao corresponde a gravacao planejada: ${value}`);
  }
  function atomic(value, text, parents) {
    unpublishedWrites.add(value);
    const target = safe(value);
    const boundary = transactionRoots.find(item => value === item || value.startsWith(item + '/'));
    let original = originals.get(boundary);
    for (const segment of value.slice(boundary.length).split('/').filter(Boolean)) original = original?.children?.[segment];
    const exclusive = !original;
    const current = stat(target);
    const mode = current?.isFile() ? current.mode & 0o777 : undefined;
    if (!exclusive && (mode === undefined || mode !== original.mode)) fail(`Arquivo mudou apos planejar: ${value}`);
    if (!exclusive && identityGuards.length >= 16) {
      const index = identityGuards.findIndex(guard => guard.created);
      if (index !== -1) {
        const [evicted] = identityGuards.splice(index, 1); publishedIdentities.set(evicted.path, null);
        try { closeSync(evicted.fd); } catch { /* Preserve the operation result. */ }
      }
    }
    ensureDirectory(value, parents);
    const temporary = `${target}.sync.${randomUUID()}`;
    let primaryError, primaryFailed = false, guard, renamed = false, temporaryCreated = false, created;
    try {
      // On POSIX, create an update's temporary no broader than its target.
      // New files and Windows keep their previous creation behavior.
      const temporaryMode = !exclusive && nativeMetadataCopySupported && mode !== undefined ? 0o600 : mode;
      const creationMode = temporaryMode !== undefined && process.platform !== 'win32' ? { mode: temporaryMode } : {};
      try {
        writeFileSync(temporary, text, { flag: 'wx', ...creationMode });
        temporaryCreated = true;
      } catch (error) {
        // Collision or partial creation leaves ownership of the name uncertain.
        throw withUncertainPath(error, temporary);
      }
      if (mode !== undefined && (exclusive || !nativeMetadataCopySupported)) chmodSync(temporary, mode);
      created = lstatSync(temporary, { bigint: true });
      let identity = null;
      if (created.ino && !identityPressure && identityGuards.length < 16) {
        try {
          guard = openSync(temporary, 'r');
          const held = fstatSync(guard, { bigint: true });
          if (held.isFile() && held.dev === created.dev && held.ino === created.ino) identity = { dev: held.dev, ino: held.ino };
        } catch (error) {
          if (['EMFILE', 'ENFILE'].includes(error.code)) releaseIdentityGuards();
          /* Without a retained inode, rollback must preserve this path. */
        }
      }
      const recordPublication = () => {
        publishedIdentities.set(value, identity);
        if (identity) { identityGuards.push({ fd: guard, path: value, created: exclusive }); guard = undefined; }
      };
      if (!exclusive) assertNoSharedHardlinks(value);
      if (!exclusive && nativeMetadataCopySupported) stageReplacementWithNativeMetadata(safe(value), temporary, text, mode, value);
      if (mode !== undefined && !exclusive && nativeMetadataCopySupported) chmodSync(temporary, mode);
      try {
        // Once publication is attempted its result may be ambiguous, even if
        // the filesystem reports an error; use the existing conservative path.
        unpublishedWrites.delete(value);
        if (exclusive) linkSync(temporary, target);
        else { renameSync(temporary, target); renamed = true; }
      } catch (failure) {
        const error = exclusive ? explainUnsupportedHardlink(failure) : failure;
        let published = false;
        try { const current = lstatSync(target, { bigint: true }); published = Boolean(error.code !== 'EEXIST' && identity && !current.isSymbolicLink() && current.dev === identity.dev && current.ino === identity.ino); } catch { /* Preserve when ambiguous. */ }
        if (published) { recordPublication(); throw error; }
        uncertainWrites.add(value);
        throw withUncertainPath(error, value);
      }
      recordPublication();
      if (identity) {
        let current; try { current = lstatSync(target, { bigint: true }); } catch { /* Preserve when ambiguous. */ }
        if (!current || current.isSymbolicLink() || current.dev !== identity.dev || current.ino !== identity.ino) uncertainWrites.add(value);
      }
    } catch (error) { primaryError = error; primaryFailed = true; throw error; }
    finally {
      if (guard !== undefined) try { closeSync(guard); } catch { /* Preserve the original result. */ }
      // After rename succeeds, the old name can belong to another writer.
      // Same-inode renames may retain it; leave that ambiguous name untouched.
      if (temporaryCreated && !renamed) {
        if (primaryFailed) {
          // Publication may have failed before or after changing either name.
          // A different writer may now own the temporary name; retain it.
          const reported = withUncertainPath(primaryError, temporary);
          if (reported !== primaryError) throw reported;
        } else try {
          // Detect a replacement before cleanup; the check is not atomic with
          // removal and does not prove complete concurrent protection.
          const current = lstatSync(temporary, { bigint: true });
          if (!created?.ino || !current.isFile() || current.isSymbolicLink()
            || current.dev !== created.dev || current.ino !== created.ino) {
            throw Object.assign(new Error('Arquivo temporario mudou; preservado para revisao.'), { code: 'E_CHANGED' });
          }
          rmSync(temporary, { force: true });
        }
        catch (failure) {
          const error = failure;
          try { error.cleanupFailures = [...(error.cleanupFailures || []), { path: temporary, message: failure.message }]; } catch { /* Keep the original error. */ }
          throw withUncertainPath(failure, temporary);
        }
      }
    }
  }
  let backupRoot;
  let backupReady = false;
  if (backups.length) {
    stageMayHaveEffects = true;
    const originalCwd = process.cwd();
    let changedCwd = false, backupFailure;
    const checkBackupBoundary = () => {
      assertNoNestedGit(root, [backupCandidate]);
      if ((planUntrack(root, {}, { gitlinkBoundaries: [backupCandidate] }).gitlinkConflicts || []).length) fail('Backup em submódulo Git; arquivos preservados.');
    };
    try {
      checkBackupBoundary();
      const agentTests = safe('.agent-tests');
      mkdirSync(agentTests, { recursive: true });
      const agentTestsInfo = lstatSync(agentTests, { bigint: true });
      if (!agentTestsInfo.isDirectory() || agentTestsInfo.isSymbolicLink()) fail('Pasta de backup insegura; arquivos preservados.');
      process.chdir(agentTests);
      changedCwd = true;
      const pinnedAgentTests = lstatSync('.', { bigint: true });
      if (pinnedAgentTests.dev !== agentTestsInfo.dev || pinnedAgentTests.ino !== agentTestsInfo.ino) fail('Pasta de backup mudou; arquivos preservados.');
      checkBackupBoundary();
      const backupName = backupCandidate.slice('.agent-tests/'.length);
      backupRoot = safe(backupCandidate);
      mkdirSync(backupName, { mode: 0o700 });
      const info = lstatSync(backupName, { bigint: true });
      if (!info.isDirectory() || info.isSymbolicLink() || process.platform !== 'win32' && (info.mode & 0o077n)) fail('Pasta de backup insegura; arquivos preservados.');
      if (process.platform === 'darwin' && inspectMacDirectoryAcl(backupRoot) !== 'empty') throw Object.assign(new Error('ACL do backup nao verificada como privada.'), { code: 'E_BACKUP' });
      process.chdir(backupName);
      const pinnedBackup = lstatSync('.', { bigint: true });
      if (pinnedBackup.dev !== info.dev || pinnedBackup.ino !== info.ino) fail('Pasta de backup mudou; arquivos preservados.');
      checkBackupBoundary();
      for (const value of backups) if (stat(safe(value))) {
        const backup = posix.join(backupCandidate, value);
        checkBackupBoundary(); assertNoNestedGit(root, [backup]);
        const destination = value;
        const absoluteDestination = join(backupRoot, ...value.split('/'));
        mkdirSync(dirname(destination), { recursive: true });
        checkBackupBoundary(); assertNoNestedGit(root, [backup]);
        // Only regular files enter the backup plan. Hold the source open and
        // create the destination exclusively, so a concurrent file is never
        // silently replaced. Ancestor checks are not atomic with these calls.
        const source = safe(value), before = lstatSync(source, { bigint: true });
        if (!before.isFile() || before.isSymbolicLink()) fail('Origem de backup deixou de ser arquivo; arquivos preservados.');
        let sourceFd, destinationFd, verificationFd, primaryError, primaryFailed = false;
        const closeFailures = [];
        try {
          sourceFd = openSync(source, constants.O_RDONLY | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0));
          const opened = fstatSync(sourceFd, { bigint: true });
          const same = item => item.isFile() && !item.isSymbolicLink() && item.dev === opened.dev && item.ino === opened.ino
            && item.mode === opened.mode && item.size === opened.size && item.mtimeNs === opened.mtimeNs && item.ctimeNs === opened.ctimeNs;
          if (!same(before)) fail('Origem de backup mudou; arquivos preservados.');
          if (opened.size > BigInt(Number.MAX_SAFE_INTEGER)) fail('Origem de backup excede limite seguro.');
          const mode = Number(opened.mode & 0o7777n);
          // Open the no-atime reader while the new file is private and still
          // owner-readable; the source mode may grant read access only to a
          // different principal. The backup directory has already been checked.
          destinationFd = openSync(destination, 'wx+', nativeMetadataCopySupported ? 0o600 : mode);
          if (process.platform === 'linux') {
            if (!constants.O_NOATIME) fail('Horario de acesso do backup nao verificavel; arquivos preservados.');
            fchmodSync(destinationFd, 0o600);
            const created = fstatSync(destinationFd, { bigint: true });
            verificationFd = openSync(destination, constants.O_RDONLY | constants.O_NOATIME | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0));
            const verifier = fstatSync(verificationFd, { bigint: true });
            if (!created.isFile() || !verifier.isFile() || !created.ino || verifier.dev !== created.dev || verifier.ino !== created.ino) fail('Backup mudou; arquivos preservados.');
          }
          const buffer = Buffer.alloc(65536), sourceHash = createHash('sha256'); let total = 0n, count;
          while ((count = readSync(sourceFd, buffer, 0, buffer.length, null)) > 0) {
            total += BigInt(count);
            if (total > opened.size) fail('Origem de backup mudou; arquivos preservados.');
            sourceHash.update(buffer.subarray(0, count));
            for (let offset = 0; offset < count;) {
              const written = writeSync(destinationFd, buffer, offset, count - offset, null);
              if (written <= 0) throw Object.assign(new Error('Falha ao escrever backup.'), { code: 'EIO' });
              offset += written;
            }
          }
          if (total !== opened.size) fail('Origem de backup mudou; arquivos preservados.');
          if (!same(fstatSync(sourceFd, { bigint: true })) || !same(lstatSync(source, { bigint: true }))) fail('Origem de backup mudou; arquivos preservados.');
          const initialCopy = fstatSync(destinationFd, { bigint: true }), copyHash = createHash('sha256');
          if (!initialCopy.isFile() || initialCopy.size !== opened.size || initialCopy.nlink !== 1n) fail('Backup mudou; arquivos preservados.');
          let position = 0, copied;
          while (position < Number(opened.size)) {
            copied = readSync(destinationFd, buffer, 0, Math.min(buffer.length, Number(opened.size) - position), position);
            if (!copied) fail('Backup incompleto; arquivos preservados.');
            copyHash.update(buffer.subarray(0, copied)); position += copied;
          }
          const sourceDigest = sourceHash.digest('hex');
          const sameCopy = (item, reference) => item.isFile() && !item.isSymbolicLink() && item.dev === reference.dev && item.ino === reference.ino
            && item.mode === reference.mode && item.size === reference.size && item.nlink === 1n
            && item.mtimeNs === reference.mtimeNs && item.ctimeNs === reference.ctimeNs;
          if (sourceDigest !== copyHash.digest('hex') || !sameCopy(fstatSync(destinationFd, { bigint: true }), initialCopy)
            || !sameCopy(lstatSync(destination, { bigint: true }), initialCopy)) fail('Backup mudou; arquivos preservados.');
          if (nativeMetadataCopySupported) {
            copyFileWithNativeMetadata(source, destination, { destinationIdentity: fstatSync(destinationFd, { bigint: true }), metadataOnly: true });
            if (process.platform === 'darwin') {
              // macOS cp -p carries ACLs and xattrs by copying the source
              // bytes too. Restore the already verified stream through the
              // open descriptor, then prove its digest again.
              ftruncateSync(destinationFd, 0);
              const restoredHash = createHash('sha256'); position = 0;
              while (position < Number(opened.size)) {
                copied = readSync(sourceFd, buffer, 0, Math.min(buffer.length, Number(opened.size) - position), position);
                if (!copied) fail('Origem de backup mudou; arquivos preservados.');
                restoredHash.update(buffer.subarray(0, copied));
                let offset = 0;
                while (offset < copied) {
                  const written = writeSync(destinationFd, buffer, offset, copied - offset, position + offset);
                  if (written <= 0) throw Object.assign(new Error('Falha ao escrever backup.'), { code: 'EIO' });
                  offset += written;
                }
                position += copied;
              }
              if (restoredHash.digest('hex') !== sourceDigest) fail('Origem de backup mudou; arquivos preservados.');
            }
          }
          if (process.platform === 'darwin') fchmodSync(destinationFd, mode);
          if (!same(fstatSync(sourceFd, { bigint: true })) || !same(lstatSync(source, { bigint: true }))) fail('Origem de backup mudou; arquivos preservados.');
          const completed = fstatSync(destinationFd, { bigint: true });
          if (!completed.isFile() || completed.size !== opened.size || completed.nlink !== 1n || completed.mode !== opened.mode) fail('Backup mudou; arquivos preservados.');
          const finalCopyHash = createHash('sha256'); position = 0;
          while (position < Number(opened.size)) {
            copied = readSync(destinationFd, buffer, 0, Math.min(buffer.length, Number(opened.size) - position), position);
            if (!copied) fail('Backup incompleto; arquivos preservados.');
            finalCopyHash.update(buffer.subarray(0, copied)); position += copied;
          }
          if (sourceDigest !== finalCopyHash.digest('hex') || !sameCopy(fstatSync(destinationFd, { bigint: true }), completed)
            || !sameCopy(lstatSync(destination, { bigint: true }), completed)) fail('Backup mudou; arquivos preservados.');
          // Restore timestamps, verify bytes, then restore them again because
          // macOS has no portable O_NOATIME reader.
          futimesSync(destinationFd, Number(opened.atimeNs) / 1e9, Number(opened.mtimeNs) / 1e9);
          const timestamped = fstatSync(destinationFd, { bigint: true });
          if (timestamped.dev !== completed.dev || timestamped.ino !== completed.ino || timestamped.size !== completed.size || timestamped.mode !== completed.mode
            || !timestamped.isFile() || timestamped.nlink !== 1n) fail('Backup mudou; arquivos preservados.');
          const reader = verificationFd ?? destinationFd;
          const finalHash = createHash('sha256'); position = 0;
          while (position < Number(opened.size)) {
            copied = readSync(reader, buffer, 0, Math.min(buffer.length, Number(opened.size) - position), position);
            if (!copied) fail('Backup incompleto; arquivos preservados.');
            finalHash.update(buffer.subarray(0, copied)); position += copied;
          }
          const checked = fstatSync(destinationFd, { bigint: true });
          const checkedNamed = lstatSync(destination, { bigint: true });
          if (sourceDigest !== finalHash.digest('hex') || checked.dev !== timestamped.dev || checked.ino !== timestamped.ino
            || checked.mode !== timestamped.mode || checked.size !== timestamped.size || checked.nlink !== 1n
            || checked.atimeNs !== checkedNamed.atimeNs || checked.mtimeNs !== checkedNamed.mtimeNs || checked.ctimeNs !== checkedNamed.ctimeNs
            || !same(fstatSync(sourceFd, { bigint: true })) || !same(lstatSync(source, { bigint: true }))) fail('Backup mudou; arquivos preservados.');
          futimesSync(destinationFd, Number(opened.atimeNs) / 1e9, Number(opened.mtimeNs) / 1e9);
          const final = fstatSync(destinationFd, { bigint: true });
          const finalNamed = lstatSync(destination, { bigint: true });
          if (!finalNamed.isFile() || finalNamed.isSymbolicLink() || finalNamed.dev !== final.dev || finalNamed.ino !== final.ino
            || finalNamed.mode !== final.mode || finalNamed.size !== final.size || finalNamed.nlink !== 1n
            || finalNamed.atimeNs !== final.atimeNs || finalNamed.mtimeNs !== final.mtimeNs || finalNamed.ctimeNs !== final.ctimeNs) fail('Backup mudou; arquivos preservados.');
        } catch (error) {
          primaryError = error;
          primaryFailed = true;
        } finally {
          for (const [fd, path] of [[verificationFd, absoluteDestination], [destinationFd, absoluteDestination], [sourceFd, source]]) if (fd !== undefined) {
            try { closeSync(fd); } catch (error) { closeFailures.push({ error, path }); }
          }
        }
        if (closeFailures.length) {
          const cause = primaryFailed ? primaryError : closeFailures[0].error;
          const reported = new AggregateError([...(primaryFailed ? [primaryError] : []), ...closeFailures.map(item => item.error)], cause?.message || 'Falha ao fechar backup.', { cause });
          if (cause?.code) reported.code = cause.code;
          reported.cleanupFailures = closeFailures.map(item => ({ path: item.path, message: /^[A-Z0-9_]+$/.test(item.error?.code || '') ? item.error.code : 'close failed' }));
          throw reported;
        }
        if (primaryFailed) throw primaryError;
        checkBackupBoundary();
      }
      backupReady = true;
    } catch (error) { backupFailure = withUncertainPath(error, backupRoot || join(root, '.agent-tests')); }
    finally {
      if (changedCwd) try { process.chdir(originalCwd); }
      catch (error) {
        const restoration = withUncertainPath(error, originalCwd);
        if (!backupFailure) backupFailure = restoration;
        else {
          const primary = backupFailure;
          backupFailure = new AggregateError([primary, restoration], primary.message, { cause: primary });
          if (primary.code) backupFailure.code = primary.code;
          backupFailure.operationMayBePartial = true;
        }
      }
    }
    if (backupFailure) throw backupFailure;
  }
  if (backupReady) output(`Backup local (integridade não verificada): ${backupCandidate}`);
  function restore(value, content, validate = () => {}) {
    // A directory at a file boundary may belong to another process. Never
    // recursively remove it or reconstruct a directory without ownership.
    if (content && !content.data) fail(`Diretorio preservado durante rollback: ${value}`);
    const destination = safe(value);
    if (!content) {
      validate();
      rmSync(destination, { force: true });
      return;
    }
    ensureDirectory(value);
    // Prepare the old bytes beside the destination, then replace it with one
    // rename. If preparation or publication fails, the currently published
    // file remains available instead of being removed before recreation.
    const temporary = `${destination}.sync-rollback.${randomUUID()}`;
    let fd, owned = false;
    try {
      fd = openSync(temporary, 'wx+', content.mode);
      owned = true;
      writeFileSync(fd, content.data);
      fchmodSync(fd, content.mode);
      const opened = fstatSync(fd, { bigint: true }), staged = lstatSync(temporary, { bigint: true });
      const verified = Buffer.alloc(content.data.length);
      let read = 0;
      while (read < verified.length) {
        const count = readSync(fd, verified, read, verified.length - read, read);
        if (count === 0) break;
        read += count;
      }
      if (!opened.ino || !staged.isFile() || staged.isSymbolicLink()
        || opened.ino !== staged.ino || opened.dev !== staged.dev
        || (opened.mode & 0o777n) !== BigInt(content.mode)
        || BigInt(opened.size) !== BigInt(content.data.length)
        || read !== verified.length || !verified.equals(content.data)) {
        fail(`Identidade nao comprovada durante rollback: ${value}`);
      }
      closeSync(fd); fd = undefined;
      validate();
      renameSync(temporary, destination);
      owned = false;
      const restored = lstatSync(destination, { bigint: true });
      if (!restored.isFile() || restored.isSymbolicLink()
        || restored.dev !== staged.dev || restored.ino !== staged.ino
        || (restored.mode & 0o777n) !== BigInt(content.mode)
        || !readFileSync(destination).equals(content.data)) {
        fail(`Arquivo restaurado nao corresponde ao backup: ${value}`);
      }
    } catch (error) {
      // Do not remove a temporary pathname after a failure: another process
      // may have replaced it. Leave it for explicit review when ownership is
      // uncertain, and preserve the original operation error at the caller.
      if (owned) throw withUncertainPath(error, temporary);
      throw error;
    } finally {
      if (fd !== undefined) try { closeSync(fd); } catch { /* Preserve the primary failure. */ }
    }
  }
  try {
    stageMayHaveEffects = true;
    assertFallbackChecks();
    if (localPlan) assertLocalIgnoreUnchanged(localPlan);
    if (Object.keys(affectedHashes).length) {
      if (!assertGitReadableForChanges() && hadGit) fail('Git deixou de estar disponivel antes da sincronizacao; arquivos preservados.');
      const current = planUntrack(root, affectedHashes);
      if (current.conflicts.length || current.index !== affectedIndex.index || current.paths.some(path => removals.some(value => path === value || path.startsWith(value + '/')))) fail('Indice Git mudou antes da sincronizacao; conteudo preservado.');
    }
    for (const { path, action, content, parents } of logicalOperations) {
      assertNoNestedGit(root, [path]);
      if (action === 'remove') mutate(path, () => {
        unpublishedWrites.add(path);
        assertNoSharedHardlinks(path);
        const target = safe(path);
        if (process.platform === 'linux' && stat(target)?.isFile() && inspectLinuxXattr(target) === 'present') {
          throw Object.assign(new Error(`E_PROTECTED_METADATA: ${path}`), { code: 'E_PROTECTED_METADATA', path });
        }
        unpublishedWrites.delete(path);
        // Only a regular file can enter the removal plan. Never recurse if
        // another process replaces it with a directory before this call.
        rmSync(target, { force: true });
      }, null);
      else if (action === 'write') mutate(path, () => atomic(path, content, parents), content);
      else fail(`Operacao logica desconhecida: ${action}`);
    }
    assertFallbackChecks();
    // Directory ownership is not recorded: keep even empty parent directories.
    if (localPlan) applyLocalIgnore(localPlan);
  } catch (error) {
    error = withPotentialPartial(error);
    if (backupRoot) error = withUncertainPath(error, backupRoot);
    if (error.code === 'E_NESTED_GIT') {
      // A new repository may now own any touched pathname. Leave all of them
      // for review instead of traversing an uninspected nested index.
      for (const path of [...touched, ...createdDirectories, error.nestedGitPath]) {
        if (typeof path === 'string') error = withUncertainPath(error, path);
      }
      throw error;
    }
    if (['EMFILE', 'ENFILE'].includes(error.code)) releaseIdentityGuards();
    const failures = [], preservedPaths = [];
    for (const value of [...touched].reverse()) {
      try {
        if (fingerprint(capture(value)) !== currentHashes.get(value)) fail(`Mudanca concorrente preservada: ${value}`);
        for (const [path, identity] of publishedIdentities) if (path === value || path.startsWith(value + '/')) {
          const current = lstatSync(safe(path), { bigint: true });
          if (!identity || current.isSymbolicLink() || current.dev !== identity.dev || current.ino !== identity.ino) fail(`Identidade concorrente preservada: ${path}`);
        }
        restore(value, originals.get(value), () => {
          if (fingerprint(capture(value)) !== currentHashes.get(value)) fail(`Mudanca concorrente preservada: ${value}`);
          for (const [path, identity] of publishedIdentities) if (path === value || path.startsWith(value + '/')) {
            const current = lstatSync(safe(path), { bigint: true });
            if (!identity || current.isSymbolicLink() || current.dev !== identity.dev || current.ino !== identity.ino) {
              fail(`Identidade concorrente preservada: ${path}`);
            }
          }
        });
      } catch (failure) { failures.push(failure); preservedPaths.push(value); }
    }
    for (const directory of sorted(createdDirectories).sort((a, b) => b.length - a.length)) {
      try { if (!originalDirectories.has(directory) && stat(safe(directory))?.isDirectory() && !readdirSync(absolute(directory)).length) rmdirSync(safe(directory)); }
      catch (failure) { failures.push(failure); preservedPaths.push(directory); }
    }
    if (failures.length) {
      const combined = new AggregateError([error, ...failures], `${error.message}; rollback incompleto`);
      if (error.code) combined.code = error.code;
      if (error.hardlinkUnsupported) combined.hardlinkUnsupported = true;
      if (error.cleanupFailures?.length) combined.cleanupFailures = error.cleanupFailures;
      if (preservedPaths.length) combined.rollbackPreservedPaths = preservedPaths;
      throw attachErrorDiagnostics(combined);
    }
    throw error;
  } finally {
    // Keep published inodes alive until rollback can no longer confuse them
    // with human replacements that happen to have the same bytes and mode.
    for (const guard of identityGuards) try { closeSync(guard.fd); } catch { /* Preserve the operation result. */ }
  }
  return { ...summary, ownedOutputs, managedBlocks, preserved: preservedPaths, scopeOmissions, claudeRetiredTargets, retainedClaudeRules, exitCode: 0, ...(backupRoot ? { backupRoot } : {}) };
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
  catch (error) {
    const message = String(error.message), limit = 1200;
    console.error(message.length <= limit ? message : `${message.slice(0, limit)}… (${message.length - limit} caracteres adicionais)`);
    const diagnostics = collectErrorDiagnostics(error);
    const paths = [...new Set([...diagnostics.preservedPaths, ...diagnostics.cleanupFailures.map(item => item.path)])];
    if (paths.length) console.error(`Revise os caminhos preservados: ${paths.slice(0, 5).join(', ')}${paths.length > 5 ? ` (+${paths.length - 5})` : ''}`);
    if (paths.length) console.error('Os caminhos podem conter dados parciais ou de outra origem; preserve-os e revise antes de recuperar.');
    if (diagnostics.possiblePartial) console.error('A operação pode ter deixado alterações; interrompa outros processos e revise o projeto antes de tentar novamente.');
    if (diagnostics.truncated) console.error('Diagnosticos adicionais foram limitados.');
    process.exitCode = 2;
  }
}
