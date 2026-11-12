import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, readFileSync, writeFileSync, readdirSync, mkdirSync, mkdtempSync, realpathSync, renameSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { synchronize, isReference } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { isGeneratedOutput, planLocalIgnore, checkLocalIgnore, assertLocalIgnoreUnchanged, applyLocalIgnore, planUntrack, applyUntrack, restoreUntrack } from '../.pbai4devs/scripts/lib/gitignore.mjs';
import { nativePathBoundary } from '../.pbai4devs/scripts/lib/native-paths.mjs';
import { canonicalEntrypoint, resolveEntrypoint, entrypointReference, renderEntrypointImports, extractManagedBlock, managedBlockDigest, mergeManagedContent, stripManagedContent } from '../.pbai4devs/scripts/lib/managed-content.mjs';
import { extractTomlManagedBlock, tomlManagedBlockDigest, mergeTomlContent, stripTomlContent } from '../.pbai4devs/scripts/lib/managed-toml.mjs';
import { writeAdapterManifest, adapterRoots, normalizeClients, resolveAdapters } from './adapters/index.mjs';
import { packageRoot, packageInfo, statePath, entryNames, begin, end } from './config.mjs';
import { normalizeLanguage, text } from './i18n.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const portable = value => value.split(sep).join('/');
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const stat = path => { try { return lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };
const ignored = new Set(['.git', '.local', '.cache', 'node_modules', '.agent-tests', 'opencode-loop']);
const reservedTargets = new Set(['.git', 'node_modules', '.pbai4devs']);
const checkTarget = path => {
  if (path.split(sep).some(part => reservedTargets.has(part.toLowerCase()))) fail('E_TARGET', 'Unsafe target directory.');
};

export function resolveTarget(input, cwd = process.cwd()) {
  let target = resolve(cwd, input || '.');
  checkTarget(target);
  // The OS may expose its own temporary directory through a system alias.
  const temporary = resolve(tmpdir()), insideTemporary = relative(temporary, target);
  if (insideTemporary === '' || (!insideTemporary.startsWith(`..${sep}`) && insideTemporary !== '..' && !isAbsolute(insideTemporary))) target = join(realpathSync(temporary), insideTemporary);
  let ancestor = target;
  while (true) {
    const info = stat(ancestor);
    if (info && (info.isSymbolicLink() || !info.isDirectory())) fail('E_TARGET', 'Target must be a real directory, without a symbolic link.');
    const parent = dirname(ancestor); if (parent === ancestor) break; ancestor = parent;
  }
  const missing = []; let parent = target;
  while (!stat(parent)) { missing.unshift(parent.slice(dirname(parent).length + 1)); parent = dirname(parent); }
  const info = stat(parent);
  if (info.isSymbolicLink() || !info.isDirectory()) fail('E_TARGET', 'Target must be a real directory, without a symbolic link.');
  const canonical = join(realpathSync(parent), ...missing);
  checkTarget(canonical);
  return canonical;
}

export function safePath(root, path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || /[\\\x00-\x1f:]/.test(path) || path.split('/').some(part => !part || part === '.' || part === '..')) fail('E_PATH', `Invalid managed path: ${path}`);
  let current = root;
  for (const part of path.split('/')) {
    current = join(current, part);
    if (stat(current)?.isSymbolicLink()) fail('E_SYMLINK', `Symbolic link refused: ${path}`);
  }
  return current;
}

function resourceAllowed(path, directory = false) {
  const parts = path.split('/');
  const folders = new Set(['agents', 'commands', 'external-skills', 'rules', 'scripts', 'skills', 'templates', 'tools', 'estado']);
  const files = new Set(['README.md', 'INSTRUCTIONS.md', 'COMPATIBILIDADE.md', 'LICENSE', '.gitignore']);
  if (!folders.has(parts[0]) && !(parts.length === 1 && files.has(parts[0]))) return false;
  if (parts[0] === 'estado') return directory && parts.length === 1 || path === 'estado/README.md';
  if (isGeneratedOutput(path, directory) || parts.some(part => ignored.has(part)) || parts[0] === 'adapters' || path === 'estado/agentdevkit.json' || path === '.npmignore') return false;
  if (parts[0] === 'tools') return parts.length === 1 || (directory && parts.length === 2 && !['bin', 'npm-cache'].includes(parts[1])) || (parts.length === 2 && parts[1] === 'README.md') || (parts.length === 3 && ['TOOL.json', 'SCRIPT.mjs', 'README.md'].includes(parts[2]));
  if (parts[0] === 'external-skills') return parts.length === 1 || (parts.length === 2 && ['README.md', 'CATALOG.json'].includes(parts[1]));
  return true;
}

function walk(root, path = '', filter = () => true) {
  const directory = path ? join(root, path) : root;
  if (!existsSync(directory)) return [];
  const files = [];
  for (const name of readdirSync(directory).sort()) {
    const child = path ? `${path}/${name}` : name;
    const info = lstatSync(join(root, child));
    if (info.isSymbolicLink()) fail('E_SYMLINK', `Symbolic link refused: ${child}`);
    if (!filter(child, info.isDirectory())) continue;
    if (info.isDirectory()) files.push(...walk(root, child, filter));
    else if (info.isFile()) files.push(child);
    else fail('E_PATH', `Unsupported file: ${child}`);
  }
  return files;
}

function write(root, path, content, mode) {
  const target = safePath(root, path); mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, mode === undefined ? undefined : { mode });
  if (mode !== undefined) chmodSync(target, mode);
}

function atomicWrite(root, path, content, mode, onPublished, beforePublish) {
  const file = safePath(root, path);
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.agentdevkit-${randomUUID()}`;
  try {
    writeFileSync(temporary, content, { flag: 'wx', ...(mode === undefined ? {} : { mode }) });
    if (mode !== undefined) chmodSync(temporary, mode);
    const writtenMode = stat(temporary).mode & 0o777;
    beforePublish?.();
    renameSync(temporary, file);
    onPublished?.(writtenMode);
    return writtenMode;
  } finally { rmSync(temporary, { force: true }); }
}

function read(root, path) {
  const file = safePath(root, path), info = stat(file);
  if (!info) return null;
  if (!info.isFile()) fail('E_PATH', `Expected a file: ${path}`);
  return readFileSync(file);
}

function allowedManaged(path) {
  if (canonicalEntrypoint(path) || path === '.gitignore') return true;
  if (nativeMarkdown(path) || nativeToml(path)) return true;
  if (['catalog.json', 'skills.json', 'agents.json', 'rules.json', 'espelhos.conf'].some(name => path === `.pbai4devs/${name}`)) return true;
  if (['.agents/skills.json', '.agents/agents.json', '.agents/rules.json'].includes(path)) return true;
  if (path.startsWith('.pbai4devs/')) return resourceAllowed(path.slice('.pbai4devs/'.length));
  return adapterRoots.some(root => path === `${root}/.gitignore` || ['skills', 'agents', 'commands', 'rules', 'instructions', 'prompts'].some(kind => path.startsWith(`${root}/${kind}/`)));
}

function nativeMarkdown(path) {
  return Boolean(canonicalEntrypoint(path)) || /\.(?:md|mdc)$/i.test(path)
    && adapterRoots.some(root => {
      if (!path.startsWith(`${root}/`)) return false;
      const relative = path.slice(root.length + 1).split('/');
      return !['tools', 'scripts', 'templates', 'external-skills', 'estado', 'tests', 'docs', 'adapters', 'workflows'].includes(relative[0].toLowerCase())
        && !['readme.md', 'instructions.md'].includes(relative.at(-1).toLowerCase());
    });
}
const nativeToml = path => path.startsWith('.gemini/commands/') && path.endsWith('.toml');
const nativeManagedText = path => nativeMarkdown(path) || nativeToml(path);

export function loadState(root) {
  const content = read(root, statePath); if (content === null) return null;
  let state; try { state = JSON.parse(content); } catch { fail('E_STATE', 'Invalid AgentDevKit state JSON.'); }
  if (state?.schemaVersion !== 1 || !normalizeLanguage(state.language) || typeof state.version !== 'string' || !state.files || typeof state.files !== 'object' || Array.isArray(state.files) || !state.blocks || typeof state.blocks !== 'object' || Array.isArray(state.blocks)) fail('E_STATE', 'Invalid AgentDevKit state.');
  if (state.clients !== undefined) {
    if (!Array.isArray(state.clients)) fail('E_STATE', 'Invalid client selection in AgentDevKit state.');
    try { state.clients = normalizeClients(state.clients); } catch { fail('E_STATE', 'Invalid client selection in AgentDevKit state.'); }
  }
  for (const [path, digest] of [...Object.entries(state.files), ...Object.entries(state.blocks)]) {
    safePath(root, path);
    if (!allowedManaged(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', `Invalid managed state entry: ${path}`);
  }
  return state;
}

function extractBlock(content, first = begin, last = end) {
  const start = content.indexOf(first), finish = content.indexOf(last);
  if (start < 0 && finish < 0) return null;
  if (start < 0 || finish < start || content.indexOf(first, start + first.length) >= 0 || content.indexOf(last, finish + last.length) >= 0) fail('E_BLOCK', 'Invalid or duplicate managed block markers.');
  return content.slice(start, finish + last.length);
}

function blockDigest(path, content) {
  const value = content.toString('utf8');
  if (nativeToml(path)) return tomlManagedBlockDigest(content);
  if (nativeMarkdown(path)) return managedBlockDigest(content);
  const block = path === '.gitignore' ? extractBlock(value, '# BEGIN AGENTDEVKIT', '# END AGENTDEVKIT') : path.endsWith('/.gitignore') ? extractBlock(value, '# BEGIN AGENT IGNORE', '# END AGENT IGNORE') : null;
  return block === null ? null : hash(block);
}

function replacedIgnoreBlocks(target, changes, previous) {
  const blocks = [];
  for (const change of changes) {
    if (change.path !== '.gitignore' && !change.path.endsWith('/.gitignore')) continue;
    const current = read(target, change.path); if (!current) continue;
    const source = current.toString('utf8');
    if (!previous?.blocks[change.path] || blockDigest(change.path, current) !== previous.blocks[change.path]) continue;
    const block = change.path === '.gitignore' ? extractBlock(source, '# BEGIN AGENTDEVKIT', '# END AGENTDEVKIT') : extractBlock(source, '# BEGIN AGENT IGNORE', '# END AGENT IGNORE');
    if (!block) continue;
    const first = source.indexOf(block), last = first + block.length;
    blocks.push({ path: safePath(target, change.path), firstLine: source.slice(0, first).split('\n').length, lastLine: source.slice(0, last).split('\n').length, sha256: hash(block) });
  }
  return blocks;
}

function entryContent(current, template, language, path) {
  const lines = template.replaceAll('\r', '').split('\n');
  const heading = lines.findIndex(line => line.startsWith('# '));
  if (heading < 0) fail('E_TEMPLATE', `Missing title: ${path}`);
  let body = lines.slice(heading + 1).join('\n').trim();
  if (path === 'AGENTS.md') body = `${text(language, 'agentLanguage')}\n\n${body}`;
  const managed = `${begin}\n${body}\n${end}`;
  if (!current) return `${lines.slice(0, heading + 1).join('\n')}\n\n${managed}\n`;
  const source = current.toString('utf8'), previous = extractBlock(source);
  return previous ? source.replace(previous, managed) : `${source}${source.endsWith('\n\n') ? '' : source.endsWith('\n') ? '\n' : '\n\n'}${managed}\n`;
}

function copyResources(source, destination) {
  const files = walk(source, '', resourceAllowed);
  for (const path of files) write(destination, path, readFileSync(join(source, path)));
  return files;
}

function readDerivedState(target) {
  let entries = {}, outputs = {}, blocks = {}, files = {}, removedBlocks = [];
  const derived = read(target, '.pbai4devs/estado/derived.json');
  if (derived) {
    try {
      const value = JSON.parse(derived);
      if (value.schemaVersion !== 1 || !value.entries || typeof value.entries !== 'object' || Array.isArray(value.entries)
        || ['outputs', 'blocks', 'files'].some(key => value[key] !== undefined && (!value[key] || typeof value[key] !== 'object' || Array.isArray(value[key])))) fail('E_STATE', 'Invalid derived entrypoint state.');
      entries = value.entries; outputs = value.outputs ?? {}; blocks = value.blocks ?? {}; files = value.files ?? {};
      removedBlocks = value.removedBlocks ?? [];
      if (!Array.isArray(removedBlocks) || removedBlocks.some(path => typeof path !== 'string' || !nativeManagedText(path))) fail('E_STATE', 'Invalid removed block state.');
      for (const [path, digest] of Object.entries(entries)) if (!canonicalEntrypoint(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived entrypoint state.');
      for (const [path, digest] of Object.entries(outputs)) if (!allowedManaged(path) || !/^\.[^/]+\/(?:skills|agents|rules)\.json$/.test(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived output state.');
      for (const [path, digest] of Object.entries(blocks)) if (!nativeManagedText(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived block state.');
      for (const [path, digest] of Object.entries(files)) if (!allowedManaged(path) || !/\.(?:md|mdc|toml)$/.test(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived file state.');
    }
    catch { fail('E_STATE', 'Invalid derived entrypoint state.'); }
    for (const path of [...Object.keys(entries), ...Object.keys(outputs), ...Object.keys(blocks), ...Object.keys(files), ...removedBlocks]) safePath(target, path);
  }
  return { entries, outputs, blocks, files, removedBlocks };
}

export function planInstallation({ target, language = 'pt', mode = 'init', force = false, clients }) {
  const previous = loadState(target);
  if (mode !== 'init' && !previous) fail('E_MISSING', text(language, 'missing'));
  const selected = normalizeClients(clients ?? previous?.clients ?? ['all']);
  const active = resolveAdapters(selected);
  const changingClients = clients !== undefined || mode === 'agents';
  const ownedEntrypoints = new Set(), mixedPaths = new Set(), nativeInputs = new Map();
  const observeNative = (path, content) => {
    if (nativeInputs.has(path)) {
      const original = nativeInputs.get(path);
      if (original === null ? content !== null : !content?.equals(original)) fail('E_CHANGED', `File changed while planning: ${path}`);
    } else nativeInputs.set(path, content);
  };
  const { entries: derivedEntries, outputs: derivedOutputs, blocks: derivedBlocks, files: derivedFiles, removedBlocks } = readDerivedState(target);
  const previousBlocks = Object.fromEntries(Object.entries(previous?.blocks || {}).filter(([path]) => !removedBlocks.includes(path)));
  const knownBlocks = { ...previousBlocks, ...derivedBlocks };
  const ownedPaths = [...Object.keys(previous?.files || {}), ...Object.keys(previousBlocks), ...Object.keys(derivedEntries), ...Object.keys(derivedOutputs), ...Object.keys(derivedBlocks), ...Object.keys(derivedFiles)];
  const entryPaths = new Map(entryNames.map(name => [name, resolveEntrypoint(target, name)]));
  const blockHash = path => knownBlocks[path]
    ?? (canonicalEntrypoint(path) ? Object.entries(knownBlocks).find(([candidate]) => canonicalEntrypoint(candidate) === canonicalEntrypoint(path))?.[1] : undefined);
  const preserved = new Map();
  const recordPreserved = (path, reason) => { preserved.set(path, { path, reason }); return true; };
  const native = path => canonicalEntrypoint(path) || path === 'README.md' || adapterRoots.some(root => path === root || path.startsWith(`${root}/`));
  const boundary = path => {
    if (!native(path)) return false;
    const found = nativePathBoundary(target, path, ownedPaths, { preserveRootAliases: path === 'README.md' });
    return found ? recordPreserved(found.path, found.reason) : false;
  };
  const owned = path => ownedPaths.includes(path);
  const generatedReference = content => Boolean(content && isReference(content.toString('utf8'))
    && (content.toString('utf8').split(/\r?\n/).includes('<!-- gerado: sincronizar-agentes -->') || content.toString('utf8').startsWith('# gerado: sincronizar-agentes\n')));
  const preserveNative = path => {
    if (!native(path)) return false;
    if (boundary(path)) return true;
    const item = stat(safePath(target, path));
    if (!item) { observeNative(path, null); return false; }
    const current = item.isFile() ? read(target, path) : null;
    if (item.isFile()) observeNative(path, current);
    if (owned(path)) return false;
    if (!item.isFile() && ownedPaths.some(value => value.startsWith(`${path}/`))) fail('E_PATH', `Managed subtree occupies a file destination: ${path}`);
    if (item.isFile()) {
      if (nativeManagedText(path)) return false;
      if (generatedReference(current)) return false;
      if (path.endsWith('/.gitignore') && current.toString('utf8').split(/\r?\n/).some(line => ['# BEGIN AGENT IGNORE', '# END AGENT IGNORE'].includes(line))) return false;
    }
    return recordPreserved(path, item.isFile() ? 'existing-file' : 'existing-directory');
  };
  const stage = realpathSync(mkdtempSync(join(tmpdir(), 'agentdevkit-')));
  try {
    const existing = copyResources(join(target, '.pbai4devs'), join(stage, '.pbai4devs'));
    const bundled = mode === 'init' || mode === 'update' ? copyResources(join(packageRoot, '.pbai4devs'), join(stage, '.pbai4devs')) : [];
    if (mode === 'init' || mode === 'update') {
      const license = read(packageRoot, 'LICENSE');
      if (!license?.length) fail('E_LICENSE', 'The AgentDevKit package is missing its LICENSE.');
      write(stage, '.pbai4devs/LICENSE', license);
      bundled.push('LICENSE');
    }
    const supplied = new Set(bundled);
    const internal = new Set(['catalog.json', 'skills.json', 'agents.json', 'rules.json', 'espelhos.conf', '.gitignore', 'estado/README.md']);
    if (bundled.length) for (const path of Object.keys(previous?.files || {})) {
      if (path.startsWith('.pbai4devs/') && !supplied.has(path.slice(11)) && !internal.has(path.slice(11))) rmSync(safePath(stage, path), { force: true });
    }
    for (const root of active.roots) {
      if (preserveNative(`${root}/.gitignore`)) continue;
      const content = read(target, `${root}/.gitignore`);
      if (content) write(stage, `${root}/.gitignore`, content);
    }
    const ownIgnore = read(target, '.pbai4devs/.gitignore');
    if (ownIgnore) write(stage, '.pbai4devs/.gitignore', ownIgnore);
    writeAdapterManifest(stage, { clients: selected });
    const synchronized = synchronize({ root: stage, force: true, localIgnores: false, generateEntrypoints: false, recordDerivedState: false, output() {} });
    for (const canonical of active.entrypoints) {
      const name = entryPaths.get(canonical);
      if (preserveNative(name)) continue;
      const current = read(target, name), template = readFileSync(join(packageRoot, '.pbai4devs/templates/entrypoints', canonical), 'utf8');
      observeNative(name, current);
      const legacy = entryContent(null, template, language, canonical);
      const content = renderEntrypointImports(target, legacy.replace(`${begin}\n`, '').replace(`\n${end}`, ''));
      const knownFile = current && (previous?.files[name] === hash(current) || derivedEntries[name] === hash(current));
      const knownLegacy = current && previous?.blocks[name] && current.toString('utf8') === entryContent(null, template, previous.language, canonical);
      if (!current || knownFile || knownLegacy) { write(stage, name, content); ownedEntrypoints.add(name); }
      else {
        const body = entrypointReference(target, canonical);
        const merged = mergeManagedContent(current, body, { expectedHash: blockHash(name) });
        write(stage, name, merged.text); mixedPaths.add(name); recordPreserved(name, 'existing-file-extended');
      }
    }
    if (!preserveNative('README.md') && !read(target, 'README.md')) write(stage, 'README.md', `---\ndescription: ${JSON.stringify(text(language, 'readme'))}\nlanguage: ${language}\n---\n\n# ${text(language, 'project')}\n\n${text(language, 'readme')}\n`);
    if (!existsSync(join(stage, '.pbai4devs/estado/README.md'))) write(stage, '.pbai4devs/estado/README.md', `---\ndescription: AgentDevKit state.\n---\n\n# AgentDevKit\n\n${text(language, 'state')}\n`);
    const unknown = new Set(existing.filter(path => !supplied.has(path) && !previous?.files[`.pbai4devs/${path}`] && !internal.has(path)));
    const paths = walk(stage, '', path => !path.split('/').includes('.agent-tests')).filter(path => !path.startsWith('.pbai4devs/') || !unknown.has(path.slice(11)));
    const desired = new Map(paths.filter(path => !preserveNative(path)).map(path => [path, readFileSync(join(stage, path))]));
    for (const [path, content] of desired) {
      if (!nativeManagedText(path) || canonicalEntrypoint(path)) continue;
      const current = read(target, path);
      observeNative(path, current);
      if (!current) continue;
      const known = [previous?.files[path], derivedFiles[path]].some(digest => digest && digest === hash(current));
      if (known) continue;
      const source = content.toString('utf8'), marker = '<!-- gerado: sincronizar-agentes -->';
      const index = source.indexOf(marker);
      if (!nativeToml(path) && index < 0) fail('E_TEMPLATE', `Missing reference marker: ${path}`);
      const body = nativeToml(path) ? JSON.parse(source.match(/^prompt = (.+)$/m)[1]) : source.slice(index + marker.length).trim();
      const merged = (nativeToml(path) ? mergeTomlContent : mergeManagedContent)(current, body, { expectedHash: blockHash(path) });
      desired.set(path, Buffer.from(merged.text)); mixedPaths.add(path); recordPreserved(path, 'existing-file-extended');
    }
    // Native discovery manifests must not advertise resources omitted at a human boundary.
    const overlapsPreserved = path => [...preserved.keys()].some(kept => !mixedPaths.has(kept) && (path === kept || path.startsWith(`${kept}/`) || kept.startsWith(`${path}/`)));
    for (const [path, content] of desired) if (/^\.agents\/(skills|rules|agents)\.json$/.test(path)) {
      const discovery = JSON.parse(content);
      discovery.entries = discovery.entries.filter(entry => !overlapsPreserved(entry.path));
      desired.set(path, Buffer.from(`${JSON.stringify(discovery, null, 2)}\n`));
    }
    const manifest = { schemaVersion: 1, version: bundled.length ? packageInfo.version : previous.version, language, files: {}, blocks: {} };
    if (mode !== 'sync' || clients !== undefined || previous?.clients !== undefined) manifest.clients = selected;
    for (const [path, content] of desired) {
      if (path === 'README.md') continue;
      const block = blockDigest(path, content);
      if (block) manifest.blocks[path] = block;
      else manifest.files[path] = hash(content);
    }
    desired.set(statePath, Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
    const changes = [], conflicts = [];
    const aliasedEntrypoint = path => canonicalEntrypoint(path) && entryPaths.get(canonicalEntrypoint(path)) !== path;
    for (const [path, content] of desired) {
      const current = read(target, path);
      if (nativeInputs.has(path) && (nativeInputs.get(path) === null ? current !== null : !current?.equals(nativeInputs.get(path)))) fail('E_CHANGED', `File changed while planning: ${path}`);
      if (current?.equals(content)) continue;
      const managed = [previous?.files[path], derivedOutputs[path], derivedEntries[path], derivedFiles[path]].some(digest => digest && hash(current || '') === digest)
        || knownBlocks[path] && blockDigest(path, current || Buffer.alloc(0)) === knownBlocks[path];
      const appendBlock = mixedPaths.has(path) || canonicalEntrypoint(path) || path === '.gitignore' || path.endsWith('/.gitignore');
      const conflict = current && path !== statePath && !managed && !appendBlock;
      const changedBlock = current && knownBlocks[path] && !managed;
      if (conflict || changedBlock) conflicts.push(path);
      changes.push({ path, action: current ? 'update' : 'create', content, beforeHash: current ? hash(current) : null });
    }
    const wholeRecords = [previous?.files || {}, derivedEntries, derivedFiles];
    for (const path of new Set(wholeRecords.flatMap(record => Object.keys(record)))) if (!desired.has(path)) {
      if (aliasedEntrypoint(path)) continue;
      const current = read(target, path); if (!current) continue;
      const known = wholeRecords.some(record => record[path] === hash(current));
      if (nativeManagedText(path) && !known) { recordPreserved(path, 'existing-file'); continue; }
      if (!known) conflicts.push(path);
      changes.push({ path, action: 'remove', content: null, beforeHash: hash(current) });
    }
    for (const [recordedPath, digest] of Object.entries(knownBlocks)) {
      const path = canonicalEntrypoint(recordedPath) ? entryPaths.get(canonicalEntrypoint(recordedPath)) : recordedPath;
      if (desired.has(path)) continue;
      if (changes.some(change => change.path === path)) continue;
      if (path === '.gitignore') continue;
      const current = read(target, path); if (!current) continue;
      const source = current.toString('utf8');
      const block = path.endsWith('/.gitignore') ? extractBlock(source, '# BEGIN AGENT IGNORE', '# END AGENT IGNORE') : nativeToml(path) ? extractTomlManagedBlock(current) : extractManagedBlock(current);
      if (!block || hash(block) !== digest) conflicts.push(path);
      if (!block) continue;
      let content = path.endsWith('/.gitignore') ? source.replace(block, '') : (nativeToml(path) ? stripTomlContent : stripManagedContent)(current, digest);
      let removable = path.endsWith('/.gitignore') && !content.trim();
      if (canonicalEntrypoint(path)) {
        const template = readFileSync(join(packageRoot, '.pbai4devs/templates/entrypoints', canonicalEntrypoint(path)), 'utf8');
        if (source === entryContent(null, template, previous?.language || language, canonicalEntrypoint(path))) { content = ''; removable = true; }
      }
      changes.push({ path, action: removable ? 'remove' : 'update', content: removable ? null : Buffer.from(content), beforeHash: hash(current) });
    }
    function nativeFiles(root) {
      if (boundary(root)) return [];
      const directory = stat(safePath(target, root));
      if (!directory?.isDirectory()) return [];
      const files = [];
      const visit = folder => {
        for (const name of readdirSync(safePath(target, folder)).sort()) {
          const path = `${folder}/${name}`;
          if (boundary(path)) continue;
          const info = stat(safePath(target, path));
          if (path.split('/').some(part => ignored.has(part))) continue;
          if (info?.isDirectory()) visit(path);
          else if (info?.isFile()) files.push(path);
        }
      };
      visit(root); return files;
    }
    for (const root of changingClients ? [] : active.roots) for (const full of nativeFiles(root)) {
      const path = full.slice(root.length + 1);
      if (!['skills', 'agents', 'commands', 'rules', 'instructions', 'prompts'].includes(path.split('/')[0])) continue;
      if (desired.has(full) || changes.some(change => change.path === full)) continue;
      const current = read(target, full);
      const known = [previous?.files[full], derivedFiles[full]].some(digest => digest && digest === hash(current));
      if (preserved.has(full) || !known || !generatedReference(current)) { recordPreserved(full, 'existing-file'); continue; }
      changes.push({ path: full, action: 'remove', content: null, beforeHash: hash(current) });
    }
    const legacy = '.pbai4devs/adapters/README.md', legacyContent = read(target, legacy);
    if (legacyContent) {
      const known = legacyContent.toString('utf8').includes('# Adaptadores') && /Antigravity|metadados/.test(legacyContent.toString('utf8'));
      if (!known) conflicts.push(legacy);
      changes.push({ path: legacy, action: 'remove', content: null, beforeHash: hash(legacyContent) });
    }
    const retiredRoots = adapterRoots.filter(root => !active.roots.includes(root) && changes.some(change => change.action === 'remove' && change.path.startsWith(`${root}/`) && (previous?.files[change.path] || previous?.blocks[change.path])));
    const ownedOutputs = [...new Set([...synchronized.ownedOutputs, ...ownedEntrypoints, statePath])].filter(path => !mixedPaths.has(path) && !overlapsPreserved(path));
    const hashes = {};
    for (const [path, digest] of Object.entries(previous?.files || {})) if ((ownedOutputs.includes(path) || !path.startsWith('.pbai4devs/')) && !mixedPaths.has(path) && !overlapsPreserved(path) && !aliasedEntrypoint(path)) hashes[path] = digest;
    for (const path of ownedEntrypoints) { const current = read(target, path); if (current && (previous?.blocks[path] || derivedEntries[path] === hash(current))) hashes[path] = hash(current); }
    for (const path of Object.keys(previous?.blocks || {})) if (path.endsWith('/.gitignore') && adapterRoots.some(root => path === `${root}/.gitignore`)) {
      const current = read(target, path);
      if (current) { const source = current.toString('utf8'), block = extractBlock(source, '# BEGIN AGENT IGNORE', '# END AGENT IGNORE'); if (block && source.trim() === block.trim() && hash(block) === previous.blocks[path]) hashes[path] = hash(current); }
    }
    if (previous) hashes[statePath] = hash(read(target, statePath));
    const untrack = existsSync(target) ? planUntrack(target, hashes) : null;
    const localIgnore = planLocalIgnore(target, { outputs: ownedOutputs, templateRoot: stage });
    const localIgnoreCheck = checkLocalIgnore(localIgnore, { replacedBlocks: replacedIgnoreBlocks(target, changes, previous) });
    conflicts.push(...(untrack?.conflicts || []), ...localIgnoreCheck.missing);
    return { target, language, mode, changes, conflicts: [...new Set(conflicts)].sort(), canApply: (!conflicts.length || force) && !untrack?.conflicts?.length && !localIgnoreCheck.missing.length, manifest, retiredRoots, ownedOutputs, untrack, localIgnore, localIgnoreCheck, preserved: [...preserved.values()].sort((a, b) => a.path.localeCompare(b.path)) };
  } finally { rmSync(stage, { recursive: true, force: true }); }
}

export function applyPlan(plan) {
  if (!plan.canApply) fail('E_CONFLICT', text(plan.language, 'conflict'));
  assertLocalIgnoreUnchanged(plan.localIgnore);
  const { target } = plan;
  const backup = `.agent-tests/agentdevkit/backups/${Date.now()}-${randomUUID()}`;
  safePath(target, backup);
  for (const change of plan.changes) safePath(target, change.path);
  const before = new Map(plan.changes.map(change => [change.path, read(target, change.path)]));
  const beforeModes = new Map(plan.changes.map(change => {
    const info = stat(safePath(target, change.path));
    return [change.path, info ? info.mode & 0o777 : undefined];
  }));
  for (const change of plan.changes) if ((before.get(change.path) ? hash(before.get(change.path)) : null) !== change.beforeHash) fail('E_CHANGED', `File changed after planning: ${change.path}`);
  for (const [path, content] of before) if (content) write(target, `${backup}/${path}`, content, beforeModes.get(path));
  const applied = [], removedDirectories = [];
  let untracked = false;
  const assertOriginal = path => {
    const file = safePath(target, path), info = stat(file), bytes = before.get(path);
    if (bytes === null ? info !== null : !info?.isFile() || !readFileSync(file).equals(bytes) || (info.mode & 0o777) !== beforeModes.get(path)) fail('E_CHANGED', `File changed before writing: ${path}`);
  };
  try {
    for (const change of plan.changes) assertOriginal(change.path);
    if (plan.untrack?.paths.length) { applyUntrack(plan.untrack); untracked = true; }
    for (const change of plan.changes) {
      assertOriginal(change.path);
      const file = safePath(target, change.path);
      const content = change.content;
      const signature = { path: change.path, hash: content === null ? null : hash(content) };
      if (content === null) { rmSync(file, { force: true }); applied.push(signature); }
      else atomicWrite(target, change.path, content, beforeModes.get(change.path), mode => {
        signature.mode = mode; applied.push(signature);
      }, () => assertOriginal(change.path));
    }
    pruneRemovedDirectories(plan, directory => removedDirectories.push(directory));
    const changesFallback = plan.changes.some(change => change.path === '.gitignore');
    // Metadata is committed last; its writer rolls back partial writes itself.
    const ignored = applyLocalIgnore(changesFallback ? planLocalIgnore(target, { outputs: plan.ownedOutputs }) : plan.localIgnore);
    return { changed: Boolean(plan.changes.length || ignored.changed || untracked), backup: [...before.values()].some(Boolean) ? backup : null };
  } catch (error) {
    const rollbackErrors = [], preserved = [];
    for (const removed of [...removedDirectories].sort((a, b) => a.path.length - b.path.length)) {
      let directory, current;
      try { directory = safePath(target, removed.path); current = stat(directory); }
      catch { preserved.push(removed.path); continue; }
      if (current) continue;
      try { mkdirSync(directory, { mode: removed.mode }); chmodSync(directory, removed.mode); }
      catch (failure) { rollbackErrors.push(failure); }
    }
    for (const appliedFile of applied.reverse()) {
      const { path } = appliedFile;
      const stillApplied = () => {
        try {
          const file = safePath(target, path), info = stat(file);
          return appliedFile.hash === null ? !info : Boolean(info?.isFile()
            && (info.mode & 0o777) === appliedFile.mode && hash(readFileSync(file)) === appliedFile.hash);
        } catch { return false; }
      };
      const unchanged = stillApplied();
      if (!unchanged) { preserved.push(path); continue; }
      const content = before.get(path);
      try {
        if (content) atomicWrite(target, path, content, beforeModes.get(path), undefined, () => {
          if (!stillApplied()) fail('E_CHANGED', `File changed during rollback: ${path}`);
        });
        else rmSync(safePath(target, path), { force: true });
      } catch (failure) {
        if (failure.code === 'E_CHANGED') preserved.push(path);
        else rollbackErrors.push(failure);
      }
    }
    if (preserved.length) {
      try { error.rollbackPreservedPaths = preserved; } catch { /* Preserve a exceção original. */ }
    }
    if (untracked) try { restoreUntrack(plan.untrack); } catch (failure) { rollbackErrors.push(failure); }
    if (rollbackErrors.length) throw Object.assign(new AggregateError([error, ...rollbackErrors], `${error.message}; rollback incompleto: ${rollbackErrors.map(failure => failure.message).join('; ')}`, { cause: error }), { code: error.code || 'E_OPERATION' });
    throw error;
  }
}

function pruneRemovedDirectories(plan, onRemoved) {
  const { target } = plan;
  const legacy = '.pbai4devs/adapters/README.md';
  const removed = plan.changes.filter(change => change.action === 'remove' && (allowedManaged(change.path) || change.path === legacy));
  const parents = new Set(removed.map(change => portable(dirname(change.path))));
  if (removed.some(change => change.path === legacy)) {
    parents.add('.pbai4devs/adapters/antigravity');
    parents.add('.pbai4devs/adapters/antigravity/agents');
  }
  for (let parent of [...parents].sort((left, right) => right.length - left.length)) {
    const boundary = parent.startsWith('.pbai4devs/') ? '.pbai4devs' : adapterRoots.find(root => parent.startsWith(`${root}/`));
    while (boundary && parent.startsWith(`${boundary}/`)) {
      const directory = safePath(target, parent);
      const info = stat(directory);
      if (!info?.isDirectory() || readdirSync(directory).length) break;
      try { rmdirSync(directory); onRemoved?.({ path: parent, mode: info.mode & 0o777 }); }
      catch (error) { if (['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) break; throw error; }
      parent = portable(dirname(parent));
    }
  }
  for (const root of plan.retiredRoots || []) {
    if (!adapterRoots.includes(root)) continue;
    const directory = safePath(target, root);
    const info = stat(directory);
    if (!info?.isDirectory()) continue;
    try { if (readdirSync(directory).length === 0) { rmdirSync(directory); onRemoved?.({ path: root, mode: info.mode & 0o777 }); } }
    catch (error) { if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error; }
  }
}

export function inspect(target) {
  const state = loadState(target);
  if (!state) return { installed: false, issues: [{ code: 'missing', path: statePath }] };
  const derived = readDerivedState(target);
  const issues = [];
  for (const [path, digest] of Object.entries(state.files)) {
    if (derived.blocks[path] || derived.removedBlocks.includes(path)) continue;
    const content = read(target, path);
    if (!content || hash(content) !== digest && hash(content) !== derived.outputs[path] && hash(content) !== derived.files[path] && hash(content) !== derived.entries[path]) issues.push({ code: content ? 'modified' : 'missing', path });
  }
  for (const [path, digest] of Object.entries({ ...state.blocks, ...derived.blocks })) {
    const content = read(target, path);
    if (content && [derived.entries[path], derived.files[path]].some(value => value && hash(content) === value)) continue;
    if (derived.removedBlocks.includes(path) && content && blockDigest(path, content) === null) continue;
    if (!content || blockDigest(path, content) !== digest) issues.push({ code: content ? 'modified' : 'missing', path });
  }
  return { installed: true, version: state.version, language: state.language, issues };
}
