import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmodSync, closeSync, existsSync, fstatSync, lstatSync, openSync, readFileSync, readSync, writeFileSync, readdirSync, mkdirSync, mkdtempSync, realpathSync, renameSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { synchronize, isReference } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { isGeneratedOutput, planLocalIgnore, checkLocalIgnore, assertLocalIgnoreUnchanged, applyLocalIgnore, indexContentMatches } from '../.pbai4devs/scripts/lib/gitignore.mjs';
import { nativePathBoundary } from '../.pbai4devs/scripts/lib/native-paths.mjs';
import { canonicalEntrypoint, resolveEntrypoint, entrypointReference, renderEntrypointImports, extractManagedBlock, managedBlockDigest, mergeManagedContent, stripManagedContent } from '../.pbai4devs/scripts/lib/managed-content.mjs';
import { extractTomlManagedBlock, tomlManagedBlockDigest, mergeTomlContent, stripTomlContent } from '../.pbai4devs/scripts/lib/managed-toml.mjs';
import { writeAdapterManifest, adapterRoots, normalizeClients, resolveAdapters } from './adapters/index.mjs';
import { packageRoot, packageInfo, statePath, legacyStatePath, entryNames, begin, end } from './config.mjs';
import { normalizeLanguage, text } from './i18n.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const portable = value => value.split(sep).join('/');
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const stat = path => { try { return lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };

// Protect staged human bytes that differ from the working tree, without
// treating an unchanged HEAD entry as a staged edit or rewriting the index.
function stagedDivergences(root) {
  let anchor = resolve(root);
  while (!existsSync(anchor)) {
    const parent = dirname(anchor);
    if (parent === anchor) break;
    anchor = parent;
  }
  const prefix = portable(relative(anchor, root));
  let hasGitMarker = false;
  for (let current = anchor; ; current = dirname(current)) {
    if (stat(join(current, '.git'))) { hasGitMarker = true; break; }
    if (dirname(current) === current) break;
  }
  const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE', 'GIT_EXTERNAL_DIFF']) delete env[key];
  const run = args => spawnSync('git', ['-C', anchor, '-c', 'core.fsmonitor=false', ...args], {
    env, timeout: 30000, windowsHide: true, maxBuffer: 16 * 1024 * 1024,
  });
  const repository = run(['rev-parse', '--is-inside-work-tree']);
  if (repository.error || repository.status !== 0) {
    if (hasGitMarker) fail('E_GIT', 'Unable to inspect the existing Git repository safely.');
    if (repository.error?.code === 'ENOENT' || !repository.error && repository.status !== 0) return new Set();
  }
  if (repository.error || repository.status !== 0 || repository.stdout.toString('utf8').trim() !== 'true') fail('E_GIT', 'Unable to inspect Git worktree.');
  // `git diff` against the worktree respects assume-unchanged and
  // skip-worktree, so compare the actual bytes to the index blobs instead.
  const stagedResult = run(['diff', '--cached', '--no-renames', '--no-ext-diff', '--no-textconv', '--name-only', '--relative', '-z']);
  const indexResult = run(['ls-files', '--stage', '-z']);
  if (stagedResult.error || stagedResult.status !== 0 || indexResult.error || indexResult.status !== 0) fail('E_GIT', 'Unable to inspect staged changes safely.');
  const decode = buffer => {
    const value = buffer.toString('utf8');
    if (!Buffer.from(value, 'utf8').equals(buffer)) fail('E_GIT', 'Unable to safely inspect a non-UTF-8 staged path.');
    return value;
  };
  const records = buffer => {
    const result = []; let start = 0;
    for (let i = 0; i < buffer.length; i++) if (buffer[i] === 0) { result.push(buffer.subarray(start, i)); start = i + 1; }
    if (start !== buffer.length) fail('E_GIT', 'Unable to parse Git output safely.');
    return result;
  };
  const paths = new Set(records(stagedResult.stdout).map(decode));
  const entries = new Map();
  for (const bytes of records(indexResult.stdout)) {
    const tab = bytes.indexOf(9);
    const record = bytes.subarray(0, tab).toString('ascii');
    if (tab < 0) fail('E_GIT', 'Unable to parse the Git index safely.');
    const match = /^(\d+) ([0-9a-f]+) ([0-3])$/.exec(record);
    if (!match) fail('E_GIT', 'Unable to parse the Git index safely.');
    const rawName = bytes.subarray(tab + 1);
    const name = rawName.toString('utf8');
    if (!paths.has(name)) continue;
    if (!Buffer.from(name, 'utf8').equals(rawName)) fail('E_GIT', 'Unable to safely inspect a non-UTF-8 staged path.');
    if (entries.has(name) || match[3] !== '0') entries.set(name, null);
    else entries.set(name, { mode: match[1], oid: match[2] });
  }
  const divergent = new Set();
  divergent.deleted = new Set();
  for (const name of paths) {
    if (prefix && !name.startsWith(`${prefix}/`)) continue;
    const path = prefix ? name.slice(prefix.length + 1) : name;
    const entry = entries.get(name);
    // Distinguish a staged deletion from unresolved index stages.
    if (!entries.has(name)) { divergent.add(path); divergent.deleted.add(path); continue; }
    if (!entry || !['100644', '100755'].includes(entry.mode) || ![40, 64].includes(entry.oid.length)) { divergent.add(path); continue; }
    let fd;
    try {
      const file = safePath(root, path), info = stat(file);
      if (!info?.isFile()) { divergent.add(path); continue; }
      fd = openSync(file, 'r');
      const before = fstatSync(fd);
      const digest = createHash(entry.oid.length === 64 ? 'sha256' : 'sha1').update(`blob ${before.size}\0`);
      const buffer = Buffer.allocUnsafe(64 * 1024);
      let count = 0, n;
      while ((n = readSync(fd, buffer, 0, buffer.length, null)) !== 0) { digest.update(buffer.subarray(0, n)); count += n; }
      const after = fstatSync(fd);
      if (count !== before.size || before.size !== after.size || before.mtimeMs !== after.mtimeMs) { divergent.add(path); continue; }
      if (digest.digest('hex') !== entry.oid) {
        const indexed = run(['cat-file', 'blob', entry.oid]);
        const working = readFileSync(file), latest = fstatSync(fd);
        if (indexed.error || indexed.status !== 0) fail('E_GIT', 'Unable to inspect staged content safely.');
        if (latest.size !== after.size || latest.mtimeMs !== after.mtimeMs || !indexContentMatches(root, path, working, indexed.stdout)) divergent.add(path);
      }
    } catch (error) {
      // Treat paths that cannot be inspected (including symbolic links) as
      // divergent; the normal safety checks still reject unsafe writes.
      if (error.code === 'E_SYMLINK' || error.code === 'ENOENT' || error.code === 'ENOTDIR' || error.code === 'E_PATH') divergent.add(path);
      else throw error;
    } finally { if (fd !== undefined) closeSync(fd); }
  }
  return divergent;
}
// A staged name may use another case for the same path on macOS or Windows.
// Probe an existing directory only; do not create files during a dry run.
function stagedContains(root, paths, path) {
  if (paths.has(path)) return true;
  let current = root;
  while (!stat(current) && dirname(current) !== current) current = dirname(current);
  while (dirname(current) !== current) {
    const base = current.slice(dirname(current).length + 1);
    const index = base.search(/[A-Za-z]/);
    if (index >= 0) {
      const letter = base[index];
      const other = letter === letter.toUpperCase() ? letter.toLowerCase() : letter.toUpperCase();
      const alternative = join(dirname(current), `${base.slice(0, index)}${other}${base.slice(index + 1)}`);
      const a = stat(current), b = stat(alternative);
      if (!a || !b || a.dev !== b.dev || a.ino !== b.ino) return false;
      return [...paths].some(candidate => candidate.toLowerCase() === path.toLowerCase());
    }
    current = dirname(current);
  }
  // If no existing name can be probed, preserve on ambiguity.
  return [...paths].some(candidate => candidate.toLowerCase() === path.toLowerCase());
}
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

// Inspect the route without following user-owned links. A final directory is
// also unavailable where the generated skill requires a regular file.
function nativeOutputBoundary(root, path, ownedPaths) {
  let boundary = nativePathBoundary(root, path, ownedPaths, { preserveRootAliases: true });
  if (!boundary) {
    const info = stat(safePath(root, path));
    if (info && !info.isFile()) boundary = { path, reason: 'non-file' };
  }
  if (!boundary) return { blocked: false };
  const info = lstatSync(join(root, ...boundary.path.split('/')));
  return { blocked: true, ...boundary, identity: [info.dev, info.ino, info.mode, info.size, info.mtimeMs, info.ctimeMs] };
}

function resourceAllowed(path, directory = false) {
  const parts = path.split('/');
  const folders = new Set(['agents', 'commands', 'external-skills', 'rules', 'scripts', 'skills', 'templates', 'tools', 'state']);
  const files = new Set(['README.md', 'INSTRUCTIONS.md', 'COMPATIBILIDADE.md', 'LICENSE', '.gitignore']);
  if (!folders.has(parts[0]) && !(parts.length === 1 && files.has(parts[0]))) return false;
  if (parts[0] === 'state') return directory && parts.length === 1 || path === 'state/README.md';
  if (isGeneratedOutput(path, directory) || parts.some(part => ignored.has(part)) || parts[0] === 'adapters' || path === 'state/agentdevkit.json' || path === '.npmignore') return false;
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
    if (info.isSymbolicLink()) {
      if (!filter(child, false) && !filter(child, true)) continue;
      fail('E_SYMLINK', `Symbolic link refused: ${child}`);
    }
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
  if (['.pbai4devs/estado/README.md', '.pbai4devs/adapters/README.md'].includes(path)) return true;
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
      return !['tools', 'scripts', 'templates', 'external-skills', 'estado', 'state', 'tests', 'docs', 'adapters', 'workflows'].includes(relative[0].toLowerCase())
        && !['readme.md', 'instructions.md'].includes(relative.at(-1).toLowerCase());
    });
}
const nativeToml = path => path.startsWith('.gemini/commands/') && path.endsWith('.toml');
const nativeManagedText = path => nativeMarkdown(path) || nativeToml(path);

export function loadState(root) {
  const content = read(root, actualStatePath(root)); if (content === null) return null;
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

function actualStatePath(root) {
  const legacy = stat(safePath(root, '.pbai4devs/estado'));
  const current = stat(safePath(root, '.pbai4devs/state'));
  if (legacy && !legacy.isDirectory() || current && !current.isDirectory()) fail('E_STATE', 'AgentDevKit state must be a directory.');
  if (legacy && current) fail('E_STATE', 'Both .pbai4devs/estado and .pbai4devs/state exist; preserve both and resolve the conflict.');
  return legacy ? legacyStatePath : statePath;
}

function readLegacyConfiguration(root, path) {
  const limit = 4 * 1024 * 1024, fd = openSync(safePath(root, path), 'r');
  try {
    if (!fstatSync(fd).isFile() || fstatSync(fd).size > limit) fail('E_STATE', 'Legacy configuration is too large or not a regular file.');
    const buffer = Buffer.allocUnsafe(limit + 1);
    let total = 0, count;
    while (total < buffer.length && (count = readSync(fd, buffer, total, buffer.length - total, null)) > 0) total += count;
    if (total > limit) fail('E_STATE', 'Legacy configuration is too large to inspect safely.');
    return buffer.subarray(0, total);
  } finally { closeSync(fd); }
}

function assertNoLegacyReferences(value) {
  const legacy = /\.pbai4devs\/estado(?=$|\/|[\s"'\],}:#])/i;
  const reject = () => fail('E_LEGACY_PATH', 'Replace .pbai4devs/estado references with .pbai4devs/state in the legacy configuration before running update.');
  if (legacy.test(value)) reject();
  const normalized = value.replaceAll('\r', '');
  const header = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  if (header === undefined) {
    if (normalized.startsWith('---')) fail('E_CONFIG_PARSE', 'Legacy configuration has an incomplete frontmatter block.');
    return;
  }
  let documents = false;
  for (const line of header.split('\n')) {
    const top = line.match(/^([a-z_]+):\s*(.*)$/);
    if (top) documents = top[1] === 'documentos';
    const nested = !top && documents ? line.match(/^  ([a-z_]+):\s*(.*)$/) : null;
    const raw = (top?.[2] ?? nested?.[2])?.trim();
    if (!raw?.startsWith('"')) continue;
    let decoded;
    try { decoded = JSON.parse(raw); }
    catch { fail('E_CONFIG_PARSE', 'Legacy configuration contains an ambiguous quoted scalar.'); }
    if (typeof decoded !== 'string') fail('E_CONFIG_PARSE', 'Legacy configuration contains an invalid quoted scalar.');
    if (legacy.test(decoded)) reject();
  }
}

function legacyStateMigration(root) {
  if (actualStatePath(root) !== legacyStatePath) return null;
  const base = '.pbai4devs/estado', files = [], directories = [];
  const visit = folder => {
    const info = stat(safePath(root, folder));
    if (!info?.isDirectory()) fail('E_STATE', `Invalid state directory: ${folder}`);
    const names = readdirSync(safePath(root, folder)).sort();
    directories.push({ path: folder, mode: info.mode & 0o777, names });
    for (const name of names) {
      const path = `${folder}/${name}`, item = stat(safePath(root, path));
      if (item?.isDirectory()) visit(path);
      else if (item?.isFile()) {
        const configuration = path === `${base}/configuracao/ESTADO.md`;
        const content = configuration ? readLegacyConfiguration(root, path) : read(root, path);
        if (configuration) {
          if (content.includes(0)) fail('E_STATE', 'Legacy configuration contains binary data.');
          let value;
          try { value = new TextDecoder('utf-8', { fatal: true }).decode(content); }
          catch { fail('E_STATE', 'Legacy configuration is not valid UTF-8.'); }
          assertNoLegacyReferences(value);
        }
        files.push({ path, target: path.replace(`${base}/`, '.pbai4devs/state/'), mode: item.mode & 0o777, content });
      }
      else fail('E_STATE', `Unsupported state entry: ${path}`);
    }
  };
  visit(base);
  return { files, directories };
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

// Change only one top-level JSON member. Other fields, escaping and whitespace
// remain byte-for-byte intact, including user-provided fields in local state.
function replaceJsonMember(bytes, member, value) {
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) fail('E_STATE', 'Invalid UTF-8 in derived state.');
  let i = 0;
  const space = () => { while (/\s/.test(text[i] || '') && i < text.length) i++; };
  const stringEnd = () => {
    if (text[i++] !== '"') fail('E_STATE', 'Invalid JSON member.');
    while (i < text.length) {
      const char = text[i++];
      if (char === '\\') { i++; continue; }
      if (char === '"') return;
    }
    fail('E_STATE', 'Unterminated JSON string.');
  };
  space(); if (text[i++] !== '{') fail('E_STATE', 'Invalid derived state.');
  const properties = [];
  while (true) {
    space(); if (text[i] === '}') break;
    const start = i; stringEnd(); const key = JSON.parse(text.slice(start, i));
    space(); if (text[i++] !== ':') fail('E_STATE', 'Invalid JSON member.');
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
      if (stack.length) fail('E_STATE', 'Invalid derived state.');
    } else { while (i < text.length && text[i] !== ',' && text[i] !== '}') i++; while (i > valueStart && /\s/.test(text[i - 1])) i--; }
    const end = i; properties.push({ key, start, valueStart, end });
    space(); if (text[i] === ',') { i++; continue; } if (text[i] === '}') break;
    fail('E_STATE', 'Invalid JSON member separator.');
  }
  const matches = properties.filter(item => item.key === member);
  if (matches.length !== 1) fail('E_STATE', 'Ambiguous derived state member.');
  const current = matches[0], index = properties.indexOf(current);
  let next;
  if (value !== undefined) next = text.slice(0, current.valueStart) + JSON.stringify(value, null, 2) + text.slice(current.end);
  else if (index > 0) next = text.slice(0, properties[index - 1].end) + text.slice(current.end);
  else if (properties.length > 1) next = text.slice(0, current.start) + text.slice(properties[1].start);
  else next = text.slice(0, current.start) + text.slice(current.end);
  try { JSON.parse(next); } catch { fail('E_STATE', 'Unable to preserve derived state safely.'); }
  return Buffer.from(next);
}

function readDerivedState(target) {
  let entries = {}, outputs = {}, blocks = {}, files = {}, removedBlocks = [], removedFiles = {};
  const derived = read(target, actualStatePath(target).replace(/agentdevkit\.json$/, 'derived.json'));
  if (derived) {
    try {
      const value = JSON.parse(derived);
      if (value.schemaVersion !== 1 || !value.entries || typeof value.entries !== 'object' || Array.isArray(value.entries)
        || ['outputs', 'blocks', 'files', 'removedFiles'].some(key => value[key] !== undefined && (!value[key] || typeof value[key] !== 'object' || Array.isArray(value[key])))) fail('E_STATE', 'Invalid derived entrypoint state.');
      entries = value.entries; outputs = value.outputs ?? {}; blocks = value.blocks ?? {}; files = value.files ?? {}; removedFiles = value.removedFiles ?? {};
      removedBlocks = value.removedBlocks ?? [];
      if (!Array.isArray(removedBlocks) || removedBlocks.some(path => typeof path !== 'string' || !nativeManagedText(path))) fail('E_STATE', 'Invalid removed block state.');
      for (const [path, digest] of Object.entries(entries)) if (!canonicalEntrypoint(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived entrypoint state.');
      for (const [path, digest] of Object.entries(outputs)) if (!allowedManaged(path) || !/^\.[^/]+\/(?:skills|agents|rules)\.json$/.test(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived output state.');
      for (const [path, digest] of Object.entries(blocks)) if (!(nativeManagedText(path) || adapterRoots.some(root => path === `${root}/.gitignore`)) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived block state.');
      for (const [path, digest] of Object.entries(files)) if (!allowedManaged(path) || !/\.(?:md|mdc|toml)$/.test(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived file state.');
      for (const [path, digest] of Object.entries(removedFiles)) if (canonicalEntrypoint(path) || !(nativeMarkdown(path) || nativeToml(path)) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid removed file state.');
      const installed = loadState(target);
      if (Object.entries(removedFiles).some(([path, digest]) => installed?.files?.[path] && installed.files[path] !== digest)) fail('E_STATE', 'Removed file state differs from installation.');
    }
    catch { fail('E_STATE', 'Invalid derived entrypoint state.'); }
    for (const path of [...Object.keys(entries), ...Object.keys(outputs), ...Object.keys(blocks), ...Object.keys(files), ...Object.keys(removedFiles), ...removedBlocks]) safePath(target, path);
  }
  return { entries, outputs, blocks, files, removedBlocks, removedFiles };
}

export function planInstallation({ target, language = 'pt', mode = 'init', force = false, clients }) {
  let previous = loadState(target);
  const installedState = previous;
  const migration = legacyStateMigration(target);
  // A migration must update the installed scripts and pointers in the same
  // transaction; a plain sync/agents/lang would leave old hard-coded paths.
  if (migration && !['init', 'update'].includes(mode)) fail('E_UPGRADE', 'Run AgentDevKit update before migrating the legacy state directory.');
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
  const { entries: derivedEntries, outputs: derivedOutputs, blocks: derivedBlocks, files: derivedFiles, removedBlocks, removedFiles } = readDerivedState(target);
  if (previous) previous = { ...previous, files: Object.fromEntries(Object.entries(previous.files).filter(([path, digest]) => removedFiles[path] !== digest)) };
  const previousBlocks = Object.fromEntries(Object.entries(previous?.blocks || {}).filter(([path]) => !removedBlocks.includes(path)));
  const knownBlocks = { ...previousBlocks, ...derivedBlocks };
  const ownedPaths = [...Object.keys(previous?.files || {}), ...Object.keys(previousBlocks), ...Object.keys(derivedEntries), ...Object.keys(derivedOutputs), ...Object.keys(derivedBlocks), ...Object.keys(derivedFiles)];
  const entryPaths = new Map(entryNames.map(name => [name, resolveEntrypoint(target, name)]));
  const blockHash = path => knownBlocks[path]
    ?? (canonicalEntrypoint(path) ? Object.entries(knownBlocks).find(([candidate]) => canonicalEntrypoint(candidate) === canonicalEntrypoint(path))?.[1] : undefined);
  const preserved = new Map();
  const recordPreserved = (path, reason) => { preserved.set(path, { path, reason }); return true; };
  const fallbackChecks = new Map();
  const outputBlocked = path => {
    const result = nativeOutputBoundary(target, path, ownedPaths);
    if (fallbackChecks.has(path) && JSON.stringify(fallbackChecks.get(path)) !== JSON.stringify(result)) fail('E_CHANGED', `Skill route changed while planning: ${path}`);
    fallbackChecks.set(path, result);
    if (result.blocked) recordPreserved(result.path, result.reason);
    return result;
  };
  const stagedHuman = stagedDivergences(target);
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
    const internal = new Set(['catalog.json', 'skills.json', 'agents.json', 'rules.json', 'espelhos.conf', '.gitignore', 'state/README.md', 'estado/README.md']);
    // A pathname, matching contents, or --force alone do not establish that a
    // project's hub source belongs to the kit. Restore human files *before*
    // deriving native pointers so that the staged catalogue describes the
    // source that will actually remain in the project.
    const preservedHub = new Set();
    for (const relative of existing) {
      const path = `.pbai4devs/${relative}`;
      if (internal.has(relative)) continue;
      const current = read(target, path);
      if (!current || previous?.files?.[path] === hash(current) && !stagedContains(target, stagedHuman, path)) continue;
      if (supplied.has(relative)) write(stage, path, current);
      preservedHub.add(path);
      recordPreserved(path, stagedContains(target, stagedHuman, path) ? 'staged-content-differs' : previous?.files?.[path] ? 'edited-managed-file' : 'existing-file');
    }
    if (bundled.length) for (const [path, digest] of Object.entries(previous?.files || {})) {
      if (!path.startsWith('.pbai4devs/') || supplied.has(path.slice(11)) || internal.has(path.slice(11))) continue;
      const current = read(target, path);
      if (current && (digest !== hash(current) || stagedContains(target, stagedHuman, path))) {
        preservedHub.add(path);
        recordPreserved(path, stagedContains(target, stagedHuman, path) ? 'staged-content-differs' : 'edited-managed-file');
      } else rmSync(safePath(stage, path), { force: true });
    }
    for (const root of active.roots) {
      if (preserveNative(`${root}/.gitignore`)) continue;
      const content = read(target, `${root}/.gitignore`);
      if (content) write(stage, `${root}/.gitignore`, content);
    }
    const ownIgnore = read(target, '.pbai4devs/.gitignore');
    if (ownIgnore) write(stage, '.pbai4devs/.gitignore', ownIgnore);
    writeAdapterManifest(stage, { clients: selected });
    const synchronized = synchronize({ root: stage, force: true, localIgnores: false, generateEntrypoints: false, recordDerivedState: false, outputBlocked, output() {} });
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
    if (!existsSync(join(stage, '.pbai4devs/state/README.md'))) write(stage, '.pbai4devs/state/README.md', `---\ndescription: AgentDevKit state.\n---\n\n# AgentDevKit\n\n${text(language, 'state')}\n`);
    const unknown = new Set(existing.filter(path => !supplied.has(path) && !previous?.files[`.pbai4devs/${path}`] && !internal.has(path)));
    const paths = walk(stage, '', path => !path.split('/').includes('.agent-tests')).filter(path => !path.startsWith('.pbai4devs/') || !unknown.has(path.slice(11)));
    const desired = new Map(paths.filter(path => !preserveNative(path)).map(path => [path, readFileSync(join(stage, path))]));
    const migratedHuman = new Set();
    for (const item of migration?.files || []) {
      if (item.path === legacyStatePath) continue;
      if (item.path === '.pbai4devs/estado/README.md') {
        const managed = previous?.files?.[item.path] === hash(item.content);
        const matchesTemplate = desired.get(item.target)?.equals(item.content);
        desired.set(item.target, item.content);
        if (!managed || !matchesTemplate) { recordPreserved(item.target, 'existing-file'); migratedHuman.add(item.target); }
        continue;
      }
      if (desired.has(item.target)) fail('E_STATE', `State migration collides with a managed file: ${item.target}`);
      desired.set(item.target, item.content);
      migratedHuman.add(item.target);
    }
    // Preserve human README content; verified managed files may be updated.
    const stateReadme = '.pbai4devs/state/README.md';
    const currentStateReadme = read(target, stateReadme);
    if (currentStateReadme && previous?.files?.[stateReadme] !== hash(currentStateReadme)) {
      desired.set(stateReadme, currentStateReadme);
      migratedHuman.add(stateReadme);
      recordPreserved(stateReadme, 'existing-file');
    }
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
      if (path === 'README.md' || migratedHuman.has(path) || preservedHub.has(path)) continue;
      const block = blockDigest(path, content);
      if (block) manifest.blocks[path] = block;
      else manifest.files[path] = hash(content);
    }
    // A standalone sync records its proven outputs separately. During a later
    // check/sync, compare that overlay before declaring the installation state
    // stale; update still consolidates it into the main state transactionally.
    let stateContent = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
    if (mode === 'sync' && installedState && !changingClients) {
      const files = { ...installedState.files }, blocks = { ...installedState.blocks };
      for (const [path, digest] of Object.entries(removedFiles)) {
        if (files[path] === digest && !stat(safePath(target, path))) delete files[path];
      }
      for (const path of removedBlocks) delete blocks[path];
      for (const [path, digest] of Object.entries({ ...derivedFiles, ...derivedOutputs, ...derivedEntries })) { files[path] = digest; delete blocks[path]; }
      for (const [path, digest] of Object.entries(derivedBlocks)) { blocks[path] = digest; delete files[path]; }
      const same = (a, b) => {
        const keys = Object.keys(a).sort();
        return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
      };
      if (installedState.schemaVersion === manifest.schemaVersion && installedState.version === manifest.version && installedState.language === manifest.language
        && JSON.stringify(installedState.clients) === JSON.stringify(manifest.clients) && same(files, manifest.files) && same(blocks, manifest.blocks)) stateContent = read(target, statePath);
    }
    desired.set(statePath, stateContent);
    const derivedPath = actualStatePath(target).replace(/agentdevkit\.json$/, 'derived.json');
    const derivedBytes = !migration ? read(target, derivedPath) : null;
    if (derivedBytes && Object.keys(removedFiles).length) {
      const finalState = JSON.parse(stateContent);
      const remaining = Object.fromEntries(Object.entries(removedFiles).filter(([path, digest]) =>
        finalState.files[path] === digest && !stat(safePath(target, path))));
      if (Object.keys(remaining).length !== Object.keys(removedFiles).length) {
        observeNative(derivedPath, derivedBytes);
        desired.set(derivedPath, replaceJsonMember(derivedBytes, 'removedFiles', Object.keys(remaining).length ? remaining : undefined));
      }
    }
    const changes = [], conflicts = [];
    const aliasedEntrypoint = path => canonicalEntrypoint(path) && entryPaths.get(canonicalEntrypoint(path)) !== path;
    for (const [path, content] of desired) {
      const current = read(target, path);
      if (nativeInputs.has(path) && (nativeInputs.get(path) === null ? current !== null : !current?.equals(nativeInputs.get(path)))) fail('E_CHANGED', `File changed while planning: ${path}`);
      if (current?.equals(content)) continue;
      const managed = path === derivedPath && derivedBytes && current?.equals(derivedBytes)
        || [previous?.files[path], derivedOutputs[path], derivedEntries[path], derivedFiles[path]].some(digest => digest && hash(current || '') === digest)
        || knownBlocks[path] && blockDigest(path, current || Buffer.alloc(0)) === knownBlocks[path];
      const appendBlock = mixedPaths.has(path) || canonicalEntrypoint(path) || path === '.gitignore' || path.endsWith('/.gitignore');
      const conflict = current && path !== statePath && !managed && !appendBlock;
      const changedBlock = current && knownBlocks[path] && !managed;
      if (conflict || changedBlock) conflicts.push(path);
      const migrated = migration?.files.find(item => item.target === path);
      changes.push({ path, action: current ? 'update' : 'create', content, beforeHash: current ? hash(current) : null, ...(migrated ? { mode: migrated.mode } : {}) });
    }
    const wholeRecords = [previous?.files || {}, derivedEntries, derivedFiles];
    for (const path of new Set(wholeRecords.flatMap(record => Object.keys(record)))) if (!desired.has(path)) {
      if (migration && path.startsWith('.pbai4devs/estado/')) continue;
      if (path === '.gitignore') { recordPreserved(path, 'project-owned'); continue; }
      if (aliasedEntrypoint(path)) continue;
      const current = read(target, path); if (!current) continue;
      const known = wholeRecords.some(record => record[path] === hash(current));
      if (stagedContains(target, stagedHuman, path)) { recordPreserved(path, 'staged-content-differs'); continue; }
      if (!known) { recordPreserved(path, 'edited-managed-file'); continue; }
      changes.push({ path, action: 'remove', content: null, beforeHash: hash(current) });
    }
    for (const [recordedPath, digest] of Object.entries(knownBlocks)) {
      if (migration && recordedPath.startsWith('.pbai4devs/estado/')) continue;
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
    const legacy = '.pbai4devs/adapters/README.md', legacyRoot = '.pbai4devs/adapters';
    const legacyRootInfo = stat(join(target, legacyRoot));
    const legacyInfo = legacyRootInfo?.isDirectory() ? stat(join(target, legacy)) : null;
    if (legacyRootInfo && !legacyRootInfo.isDirectory()) recordPreserved(legacyRoot, legacyRootInfo.isSymbolicLink() ? 'symbolic-link' : 'existing-file');
    if (legacyInfo && !legacyInfo.isFile()) recordPreserved(legacy, legacyInfo.isSymbolicLink() ? 'symbolic-link' : 'existing-directory');
    const legacyContent = legacyInfo?.isFile() ? read(target, legacy) : null;
    if (legacyContent && !changes.some(change => change.path === legacy)) {
      if (!stagedContains(target, stagedHuman, legacy) && previous?.files?.[legacy] === hash(legacyContent)) changes.push({ path: legacy, action: 'remove', content: null, beforeHash: hash(legacyContent) });
      else recordPreserved(legacy, stagedContains(target, stagedHuman, legacy) ? 'staged-content-differs' : 'existing-file');
    }
    for (const item of migration?.files || []) changes.push({ path: item.path, action: 'remove', content: null, beforeHash: hash(item.content) });
    // The generated catalogues must agree with the installed sources. A staged
    // deletion has no indexed bytes to overwrite; allow their regeneration only
    // when the current file exactly matches the previously owned digest.
    const generatedCatalogues = new Set(['.pbai4devs/catalog.json', '.pbai4devs/skills.json', '.pbai4devs/agents.json', '.pbai4devs/rules.json']);
    for (const change of changes) if (change.action === 'update' && generatedCatalogues.has(change.path)
      && stagedContains(target, stagedHuman.deleted || new Set(), change.path)
      && change.beforeHash && previous?.files?.[change.path] === change.beforeHash) change.stagedDeletionAllowed = true;
    for (const change of changes) {
      if (!stagedContains(target, stagedHuman, change.path)) continue;
      const current = read(target, change.path);
      if (change.action === 'update' && current && change.content && nativeManagedText(change.path)) {
        // Preserve every byte outside a known managed block. Appending a block
        // is also safe when the complete existing file is an exact prefix.
        if (!nativeToml(change.path) && change.content.subarray(0, current.length).equals(current)) {
          try {
            const digest = managedBlockDigest(change.content);
            const stripped = digest && stripManagedContent(change.content, digest);
            const extra = stripped?.slice(current.toString('utf8').length);
            if (stripped?.startsWith(current.toString('utf8')) && extra !== undefined && /^[\r\n]*$/.test(extra)) change.stagedBlockAllowed = true;
          } catch { /* Invalid or unproven block: keep the path blocked. */ }
        } else if (knownBlocks[change.path]) {
          try {
            const strip = nativeToml(change.path) ? stripTomlContent : stripManagedContent;
            if (Buffer.from(strip(current, knownBlocks[change.path])).equals(change.content)) change.stagedBlockAllowed = true;
          } catch { /* An edited block is not safe to remove. */ }
        }
      }
      if (change.action === 'remove' && migration) {
        const item = migration.files.find(file => file.path === change.path);
        const copy = item && changes.find(candidate => candidate.path === item.target && candidate.action === 'create');
        if (item && current?.equals(item.content) && copy?.content?.equals(item.content)
          && changes.indexOf(copy) < changes.indexOf(change)) change.stagedMigrationTarget = item.target;
      }
    }
    const stagedChanges = changes.filter(change => stagedContains(target, stagedHuman, change.path) && !change.stagedDeletionAllowed && !change.stagedBlockAllowed && !change.stagedMigrationTarget);
    if (stagedChanges.length) fail('E_STAGED', `Staged content differs from the working tree for planned changes: ${stagedChanges.map(change => `${change.action} ${change.path}`).join(', ')}. Preserve and review these paths before updating.`);
    const retiredRoots = adapterRoots.filter(root => !active.roots.includes(root) && changes.some(change => change.action === 'remove' && change.path.startsWith(`${root}/`) && (previous?.files[change.path] || previous?.blocks[change.path])));
    const ownedOutputs = [...new Set([...synchronized.ownedOutputs, ...ownedEntrypoints, statePath])].filter(path => !mixedPaths.has(path) && !overlapsPreserved(path));
    // Ignore rules affect only untracked files. Never remove existing index
    // entries on behalf of the project; staged bytes are checked separately.
    const untrack = { root: target, paths: [], hashes: {}, index: '', conflicts: [] };
    const localIgnore = planLocalIgnore(target, { outputs: ownedOutputs, templateRoot: stage });
    const localIgnoreCheck = checkLocalIgnore(localIgnore, { replacedBlocks: replacedIgnoreBlocks(target, changes, previous) });
    conflicts.push(...(untrack?.conflicts || []), ...localIgnoreCheck.missing);
    return { target, language, mode, changes, conflicts: [...new Set(conflicts)].sort(), canApply: (!conflicts.length || force) && !untrack?.conflicts?.length && !localIgnoreCheck.missing.length, manifest, retiredRoots, ownedOutputs, untrack, localIgnore, localIgnoreCheck, migration, fallbackChecks: [...fallbackChecks], fallbackOwnedPaths: ownedPaths, preserved: [...preserved.values()].sort((a, b) => a.path.localeCompare(b.path)) };
  } finally { rmSync(stage, { recursive: true, force: true }); }
}

export function applyPlan(plan) {
  if (!plan.canApply) fail('E_CONFLICT', text(plan.language, 'conflict'));
  assertLocalIgnoreUnchanged(plan.localIgnore);
  const { target } = plan;
  const assertFallbackChecks = () => {
    for (const [path, expected] of plan.fallbackChecks || []) {
      let current;
      try { current = nativeOutputBoundary(target, path, plan.fallbackOwnedPaths || []); }
      catch { fail('E_CHANGED', `Skill route changed after planning: ${path}`); }
      if (JSON.stringify(current) !== JSON.stringify(expected)) fail('E_CHANGED', `Skill route changed after planning: ${path}`);
    }
  };
  assertFallbackChecks();
  const stagedHuman = stagedDivergences(target);
  const currentState = loadState(target);
  const stagedChanges = plan.changes.filter(change => {
    if (!stagedContains(target, stagedHuman, change.path)) return false;
    const current = read(target, change.path);
    if ((current ? hash(current) : null) !== change.beforeHash) fail('E_CHANGED', `File changed after planning: ${change.path}`);
    if (!current) return true;
    if (change.stagedDeletionAllowed && stagedContains(target, stagedHuman.deleted || new Set(), change.path)
      && currentState?.files?.[change.path] === change.beforeHash) return false;
    if (change.stagedBlockAllowed) return false; // Exact source and planned bytes were checked above.
    if (change.stagedMigrationTarget) {
      const copy = plan.changes.find(candidate => candidate.path === change.stagedMigrationTarget && candidate.action === 'create');
      if (copy?.content?.equals(current) && plan.changes.indexOf(copy) < plan.changes.indexOf(change)
        && !stat(safePath(target, change.stagedMigrationTarget))) return false;
    }
    return true;
  });
  if (stagedChanges.length) fail('E_STAGED', `Staged content differs from the working tree for planned changes: ${stagedChanges.map(change => `${change.action} ${change.path}`).join(', ')}. Preserve and review these paths before updating.`);
  if (plan.migration) {
    if (stat(safePath(target, '.pbai4devs/state'))) fail('E_CHANGED', 'State destination appeared after planning.');
    for (const directory of plan.migration.directories) {
      const info = stat(safePath(target, directory.path));
      if (!info?.isDirectory() || (info.mode & 0o777) !== directory.mode || JSON.stringify(readdirSync(safePath(target, directory.path)).sort()) !== JSON.stringify(directory.names)) fail('E_CHANGED', `State directory changed after planning: ${directory.path}`);
    }
    for (const item of plan.migration.files) {
      const info = stat(safePath(target, item.path));
      if (!info?.isFile() || (info.mode & 0o777) !== item.mode || hash(readFileSync(safePath(target, item.path))) !== hash(item.content)) fail('E_CHANGED', `State file changed after planning: ${item.path}`);
    }
  }
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
  const assertOriginal = path => {
    const file = safePath(target, path), info = stat(file), bytes = before.get(path);
    if (bytes === null ? info !== null : !info?.isFile() || !readFileSync(file).equals(bytes) || (info.mode & 0o777) !== beforeModes.get(path)) fail('E_CHANGED', `File changed before writing: ${path}`);
  };
  try {
    for (const change of plan.changes) assertOriginal(change.path);
    for (const change of plan.changes) {
      assertOriginal(change.path);
      const file = safePath(target, change.path);
      const content = change.content;
      const signature = { path: change.path, hash: content === null ? null : hash(content) };
      if (content === null) {
        const migrated = plan.migration?.files.find(item => item.path === change.path);
        if (migrated) {
          const copy = plan.changes.find(candidate => candidate.path === migrated.target && candidate.action === 'create');
          const copied = read(target, migrated.target);
          if (!copy?.content || !copied?.equals(copy.content)
            || migrated.path !== legacyStatePath && !copied.equals(before.get(change.path))) {
            fail('E_CHANGED', `Migrated copy changed before removing: ${change.path}`);
          }
        }
        rmSync(file, { force: true }); applied.push(signature);
      }
      else atomicWrite(target, change.path, content, beforeModes.get(change.path) ?? change.mode, mode => {
        signature.mode = mode; applied.push(signature);
      }, () => assertOriginal(change.path));
    }
    if (plan.migration) {
      for (const directory of plan.migration.directories) {
        const destination = directory.path.replace(/^\.pbai4devs\/estado/, '.pbai4devs/state');
        const file = safePath(target, destination), existing = stat(file);
        if (existing && !existing.isDirectory()) fail('E_CHANGED', `Invalid state destination: ${destination}`);
        if (!existing) mkdirSync(file, { recursive: true, mode: directory.mode });
        chmodSync(file, directory.mode);
      }
      for (const directory of [...plan.migration.directories].sort((a, b) => b.path.length - a.path.length)) {
        const file = safePath(target, directory.path), info = stat(file);
        if (!info?.isDirectory() || readdirSync(file).length) fail('E_CHANGED', `State directory changed during migration: ${directory.path}`);
        rmdirSync(file); removedDirectories.push({ path: directory.path, mode: directory.mode });
      }
    }
    assertFallbackChecks();
    pruneRemovedDirectories(plan, directory => removedDirectories.push(directory));
    const changesFallback = plan.changes.some(change => change.path === '.gitignore');
    // Metadata is committed last; its writer rolls back partial writes itself.
    const ignored = applyLocalIgnore(changesFallback ? planLocalIgnore(target, { outputs: plan.ownedOutputs }) : plan.localIgnore);
    return { changed: Boolean(plan.changes.length || ignored.changed), backup: [...before.values()].some(Boolean) ? backup : null };
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
    if (plan.migration) for (const directory of [...plan.migration.directories].sort((a, b) => b.path.length - a.path.length)) {
      const destination = directory.path.replace(/^\.pbai4devs\/estado/, '.pbai4devs/state');
      try { const file = safePath(target, destination); if (stat(file)?.isDirectory() && !readdirSync(file).length) rmdirSync(file); }
      catch (failure) { if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(failure.code)) rollbackErrors.push(failure); }
    }
    if (preserved.length) {
      try { error.rollbackPreservedPaths = preserved; } catch { /* Preserve a exceção original. */ }
    }
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
    if (derived.removedFiles[path] === digest && !derived.files[path] && !derived.entries[path]) {
      if (content) issues.push({ code: 'modified', path });
      continue;
    }
    if (!content || hash(content) !== digest && hash(content) !== derived.outputs[path] && hash(content) !== derived.files[path] && hash(content) !== derived.entries[path]) issues.push({ code: content ? 'modified' : 'missing', path });
  }
  for (const [path, digest] of Object.entries({ ...state.blocks, ...derived.blocks })) {
    if (derived.removedBlocks.includes(path) && !Object.hasOwn(derived.blocks, path)) continue;
    const content = read(target, path);
    if (content && [derived.entries[path], derived.files[path]].some(value => value && hash(content) === value)) continue;
    if (!content || blockDigest(path, content) !== digest) issues.push({ code: content ? 'modified' : 'missing', path });
  }
  return { installed: true, version: state.version, language: state.language, issues };
}
