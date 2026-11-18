import { createHash, randomUUID } from 'node:crypto';
import { types as utilTypes } from 'node:util';
import { safeGitEnvironment, assertUnredirectedGitEnvironment, assertNoNestedGit, gitOutputLines, gitPathsOverlap } from '../.pbai4devs/scripts/lib/git-environment.mjs';
import { collectErrorDiagnostics, markDiagnosticsBoundary, primaryDiagnosticError, withPotentialPartial, withUncertainPath } from '../.pbai4devs/scripts/lib/error-reporting.mjs';
import { spawnSync } from 'node:child_process';
import { assertLinuxXattrsUnchanged, inspectLinuxXattr, inspectMacAcl, inspectMacDirectoryAcl, inspectMacXattr } from '../.pbai4devs/scripts/lib/xattr-probe.mjs';
import { fileOwnerIssue } from '../.pbai4devs/scripts/lib/file-owner.mjs';
import { chmodSync, closeSync, existsSync, fchmodSync, fstatSync, lstatSync, openSync, readFileSync, readSync, writeFileSync, readdirSync, mkdirSync, mkdtempSync, realpathSync, rmSync, rmdirSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import { createPrivateSyncStage, synchronizePrivateStage, isReference } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { isLegacyExact } from '../.pbai4devs/scripts/lib/claude-legacy-exact.mjs';
import { isGeneratedOutput, planLocalIgnore, checkLocalIgnore, assertLocalIgnoreUnchanged, applyLocalIgnore, indexContentMatches, noGitRepository } from '../.pbai4devs/scripts/lib/gitignore.mjs';
import { nativePathBoundary } from '../.pbai4devs/scripts/lib/native-paths.mjs';
import { checkWindowsFileChanges, copyFileWithNativeMetadata, inspectMacWriteProtection, nativeMetadataCopySupported, publishFileReplacement, stageReplacementWithNativeMetadata } from '../.pbai4devs/scripts/lib/native-metadata.mjs';
import { mayReferenceClaudeRule, resemblesClaudeReference, scanRetainedClaude } from '../.pbai4devs/scripts/lib/claude-retained.mjs';
import { canonicalEntrypoint, resolveEntrypoint, entrypointReference, renderEntrypointImports, extractManagedBlock, managedBlockDigest, mergeManagedContent, stripManagedContent } from '../.pbai4devs/scripts/lib/managed-content.mjs';
import { extractTomlManagedBlock, tomlManagedBlockDigest, mergeTomlContent, stripTomlContent, promptMatchesCompleteReference, geminiReferenceBody } from '../.pbai4devs/scripts/lib/managed-toml.mjs';
import { writeAdapterManifest, adapterRoots, normalizeClients, resolveAdapters } from './adapters/index.mjs';
import { packageRoot, packageInfo, statePath, legacyStatePath, entryNames, begin, end } from './config.mjs';
import { normalizeLanguage, text } from './i18n.mjs';
import { buildRecoveryEntries } from '../.pbai4devs/scripts/lib/recovery-entries.mjs';
import { createPrivateRecoveryDirectory } from '../.pbai4devs/scripts/lib/recovery-privacy.mjs';
import { assertRecoveryStageVolume, completeProjectRecovery, inspectProjectRecovery, startProjectRecovery } from '../.pbai4devs/scripts/lib/project-recovery.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const portable = value => value.split(sep).join('/');
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const missingCode = (error, accepted) => { try { if (utilTypes.isProxy(error)) return false; const d = Object.getOwnPropertyDescriptor(error, 'code'); return Boolean(d && 'value' in d && accepted.includes(d.value)); } catch { return false; } };
const stat = path => { try { return lstatSync(path); } catch (error) { if (missingCode(error, ['ENOENT'])) return null; throw error; } };
const canonicalExisting = path => {
  if (typeof realpathSync.native === 'function') {
    try { return realpathSync.native(path); }
    catch (error) { if (!['ENOSYS', 'ENOTSUP', 'EINVAL'].includes(error.code)) throw error; }
  }
  return realpathSync(path);
};

// Protect staged human bytes that differ from the working tree, without
// treating an unchanged HEAD entry as a staged edit or rewriting the index.
function stagedDivergences(root) {
  let anchor = resolve(root);
  while (!existsSync(anchor)) {
    const parent = dirname(anchor);
    if (parent === anchor) break;
    anchor = parent;
  }
  const env = safeGitEnvironment();
  // The no-repository diagnostic is classified internally in a stable locale.
  env.LC_ALL = 'C';
  env.LANGUAGE = 'C';
  let gitCwd = anchor;
  const run = args => spawnSync('git', ['-C', gitCwd, '-c', 'core.fsmonitor=false', ...args], {
    env, timeout: 30000, windowsHide: true, maxBuffer: 16 * 1024 * 1024,
  });
  const repository = run(['rev-parse', '--is-inside-work-tree']);
  if (repository.error || repository.status !== 0 || repository.signal) {
    if (noGitRepository(anchor, repository)) return new Set();
    const errorCode = repository.error?.code;
    const reason = typeof repository.signal === 'string' && /^SIG[A-Z0-9]{1,16}$/.test(repository.signal)
      ? `signal ${repository.signal}`
      : typeof errorCode === 'string' && /^[A-Z0-9_]{1,32}$/.test(errorCode)
        ? `execution error ${errorCode}`
        : Number.isInteger(repository.status) && repository.status >= 0 && repository.status <= 255
          ? `exit status ${repository.status}` : 'unknown execution failure';
    fail('E_GIT', `Unable to inspect Git worktree safely (${reason}). Check the Git installation and configuration.`);
  }
  if (repository.stdout.toString('utf8').trim() !== 'true') fail('E_GIT', 'Unable to inspect Git worktree.');
  const top = run(['rev-parse', '--show-toplevel']);
  if (top.error || top.status !== 0) fail('E_GIT', 'Unable to inspect Git worktree root.');
  const topLines = gitOutputLines(top.stdout.toString('utf8'));
  if (topLines.length !== 1 || !topLines[0]) fail('E_GIT', 'Unable to inspect Git worktree root.');
  gitCwd = topLines[0];
  let prefix;
  try {
    // Git can return a long or physical spelling while the requested target
    // uses a system alias (for example, a Windows 8.3 or macOS /var path).
    const physicalTop = canonicalExisting(gitCwd);
    const physicalTarget = resolve(canonicalExisting(anchor), relative(anchor, resolve(root)));
    const local = relative(physicalTop, physicalTarget);
    if (isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`)) fail('E_GIT', 'Target is outside the inspected Git worktree.');
    prefix = portable(local);
  } catch (error) {
    if (error.code === 'E_GIT') throw error;
    fail('E_GIT', 'Unable to safely resolve Git worktree paths.');
  }
  const prefixParts = prefix ? prefix.split('/') : [];
  // `git diff` against the worktree respects assume-unchanged and
  // skip-worktree, so compare the actual bytes to the index blobs instead.
  const stagedResult = run(['diff', '--cached', '--no-renames', '--no-ext-diff', '--no-textconv', '--name-only', '-z']);
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
  const entries = new Map(), gitlinks = new Set();
  for (const bytes of records(indexResult.stdout)) {
    const tab = bytes.indexOf(9);
    const record = bytes.subarray(0, tab).toString('ascii');
    if (tab < 0) fail('E_GIT', 'Unable to parse the Git index safely.');
    const match = /^(\d+) ([0-9a-f]+) ([0-3])$/.exec(record);
    if (!match) fail('E_GIT', 'Unable to parse the Git index safely.');
    const rawName = bytes.subarray(tab + 1);
    const name = rawName.toString('utf8');
    if (match[1] === '160000') {
      gitlinks.add(name);
      const indexedParts = name.split('/');
      if (prefixParts.length && indexedParts.length <= prefixParts.length && gitPathsOverlap(name, prefix, { root: gitCwd, allowMissingTarget: true })) {
        fail('E_STAGED', 'Target is inside a Git submodule whose index cannot be safely inspected.');
      }
      paths.add(name);
    }
    if (!paths.has(name)) continue;
    if (!Buffer.from(name, 'utf8').equals(rawName)) fail('E_GIT', 'Unable to safely inspect a non-UTF-8 staged path.');
    if (entries.has(name) || match[3] !== '0') entries.set(name, null);
    else entries.set(name, { mode: match[1], oid: match[2] });
  }
  const divergent = new Set();
  divergent.deleted = new Set();
  divergent.stagedNames = new Set();
  divergent.gitlinks = new Set();
  for (const name of paths) {
    const parts = name.split('/');
    if (parts.length <= prefixParts.length || prefixParts.some((_part, index) => !gitPathsOverlap(prefixParts.slice(0, index + 1).join('/'), parts.slice(0, index + 1).join('/'), { root: gitCwd }))) continue;
    const path = parts.slice(prefixParts.length).join('/');
    divergent.stagedNames.add(path);
    if (gitlinks.has(name)) divergent.gitlinks.add(path);
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
  if ([...(paths.stagedNames || paths)].some(candidate => candidate !== path && gitPathsOverlap(candidate, path, { root, allowMissingTarget: true }))) return true;
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

// Only normalize macOS aliases owned by the system. Environment-controlled
// TMPDIR is not evidence that a symbolic link is safe to follow.
function normalizeSystemTemporaryAlias(target) {
  if (process.platform !== 'darwin') return target;
  for (const { alias, allowed, physical } of [
    { alias: '/tmp', allowed: '/tmp', physical: '/private/tmp' },
    { alias: '/var', allowed: '/var/folders', physical: '/private/var' },
  ]) {
    if (target !== allowed && !target.startsWith(`${allowed}${sep}`)) continue;
    const link = stat(alias), directory = stat(physical);
    if (!link?.isSymbolicLink() || link.uid !== 0 || !directory?.isDirectory() || directory.uid !== 0) return target;
    try { if (realpathSync(alias) !== physical) return target; }
    catch (error) { if (error.code === 'ENOENT' || error.code === 'ELOOP') return target; throw error; }
    return join(physical, relative(alias, target));
  }
  return target;
}

export function resolveTarget(input, cwd = process.cwd()) {
  let target = resolve(cwd, input || '.');
  checkTarget(target);
  target = normalizeSystemTemporaryAlias(target);
  let ancestor = target;
  while (true) {
    const info = stat(ancestor);
    if (info && (info.isSymbolicLink() || !info.isDirectory())) fail('E_TARGET', 'Target must be a real directory, without a symbolic link.');
    const parent = dirname(ancestor); if (parent === ancestor) break; ancestor = parent;
  }
  const missing = []; let parent = target;
  while (!stat(parent)) { missing.unshift(basename(parent)); parent = dirname(parent); }
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

function publishPlannedFile(root, stage, path, content, mode, beforePublish, original) {
  const file = safePath(root, path);
  mkdirSync(dirname(file), { recursive: true });
  if (original === null) {
    // Let the final parent supply the default ACL. A failed create can be
    // partial; only the descriptor is closed. Never unlink the public name.
    beforePublish();
    const fd = openSync(file, 'wx', mode);
    try {
      writeFileSync(fd, content);
      if (mode !== undefined) fchmodSync(fd, mode);
    } finally { closeSync(fd); }
    return;
  }

  // Keep original ACLs and proposed contents behind the verified private
  // directory until replacement. Leave ambiguous results for review.
  const temporary = safePath(stage, path) + '.agentdevkit-' + randomUUID();
  mkdirSync(dirname(temporary), { recursive: true, mode: 0o700 });
  try {
    writeFileSync(temporary, content, { flag: 'wx', mode: 0o600 });
    if (nativeMetadataCopySupported) stageReplacementWithNativeMetadata(file, temporary, content, mode, path);
    if (mode !== undefined) chmodSync(temporary, mode);
    beforePublish();
    const hashes = process.platform === 'win32' ? { before: hash(original), after: hash(content) } : undefined;
    publishFileReplacement(temporary, file, path, hashes);
  } catch (error) { throw withUncertainPath(error, temporary); }
}

function read(root, path) {
  const file = safePath(root, path), info = stat(file);
  if (!info) return null;
  if (!info.isFile()) fail('E_PATH', `Expected a file: ${path}`);
  return readFileSync(file);
}

function allowedManaged(path) {
  if (isGeneratedOutput(path)) return false;
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

// Check the planned managed-block change again when applying it. TOML block
// removal can reserialize the prompt even when its meaning stays the same.
function allowsStagedBlock(path, current, content, knownBlock) {
  if (!current || !Buffer.isBuffer(content) || !nativeManagedText(path)) return false;
  try {
    if (!nativeToml(path) && content.subarray(0, current.length).equals(current)) {
      const digest = managedBlockDigest(content);
      const stripped = digest && stripManagedContent(content, digest);
      const extra = stripped?.slice(current.toString('utf8').length);
      return Boolean(stripped?.startsWith(current.toString('utf8')) && extra !== undefined && /^[\r\n]*$/.test(extra));
    }
    if (knownBlock) {
      const strip = nativeToml(path) ? stripTomlContent : stripManagedContent;
      return Buffer.from(strip(current, knownBlock)).equals(content);
    }
  } catch { /* Invalid or unproven block. */ }
  return false;
}

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

function assertMigrationDirectoryMetadata(root, folder, info) {
  if ((process.platform === 'darwin' || process.platform === 'linux') && (info.mode & 0o7000)) {
    throw Object.assign(new Error('State directory has special POSIX bits; review: ' + folder), { code: 'E_PROTECTED_METADATA', path: folder, metadataTargetVerified: true, metadataReason: 'special-mode-directory' });
  }
  if (process.platform === 'darwin') {
    const result = inspectMacXattr(safePath(root, folder));
    if (result !== 'empty') {
      throw Object.assign(new Error('State directory extended attributes require review: ' + folder), { code: result === 'present' ? 'E_PROTECTED_METADATA' : 'E_METADATA_UNSUPPORTED', path: folder, metadataTargetVerified: true, metadataReason: result === 'present' ? 'xattr-directory-present' : 'xattr-directory-unverified' });
    }
  }
}

function legacyStateMigration(root) {
  if (actualStatePath(root) !== legacyStatePath) return null;
  const base = '.pbai4devs/estado', files = [], directories = [];
  const visit = folder => {
    assertNoNestedGit(root, [folder]);
    const info = stat(safePath(root, folder));
    if (!info?.isDirectory()) fail('E_STATE', `Invalid state directory: ${folder}`);
    assertMigrationDirectoryMetadata(root, folder, info);
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
  if (matches.length > 1) fail('E_STATE', 'Ambiguous state member.');
  if (!matches.length) {
    if (value === undefined) return bytes;
    const insertion = `${properties.length ? ',' : ''}\n  ${JSON.stringify(member)}: ${JSON.stringify(value, null, 2)}\n`;
    const next = text.slice(0, i) + insertion + text.slice(i);
    try { JSON.parse(next); } catch { fail('E_STATE', 'Unable to preserve state safely.'); }
    return Buffer.from(next);
  }
  const current = matches[0], index = properties.indexOf(current);
  let next;
  if (value !== undefined) next = text.slice(0, current.valueStart) + JSON.stringify(value, null, 2) + text.slice(current.end);
  else if (index > 0) next = text.slice(0, properties[index - 1].end) + text.slice(current.end);
  else if (properties.length > 1) next = text.slice(0, current.start) + text.slice(properties[1].start);
  else next = text.slice(0, current.start) + text.slice(current.end);
  try { JSON.parse(next); } catch { fail('E_STATE', 'Unable to preserve derived state safely.'); }
  return Buffer.from(next);
}

function reconcileStateBytes(original, previous, next) {
  if (!original) return Buffer.from(`${JSON.stringify(next, null, 2)}\n`);
  const canonical = value => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : Array.isArray(value) ? value.map(canonical) : value;
  let result = original;
  for (const key of ['schemaVersion', 'version', 'language', 'clients', 'files', 'blocks']) {
    if (JSON.stringify(canonical(previous?.[key])) !== JSON.stringify(canonical(next[key]))) result = replaceJsonMember(result, key, next[key]);
  }
  return result;
}

function readDerivedState(target) {
  let entries = {}, outputs = {}, blocks = {}, files = {}, catalogs = {}, config = null, removedBlocks = [], removedFiles = {};
  const derived = read(target, actualStatePath(target).replace(/agentdevkit\.json$/, 'derived.json'));
  if (derived) {
    try {
      const value = JSON.parse(derived);
      if (value.schemaVersion !== 1 || !value.entries || typeof value.entries !== 'object' || Array.isArray(value.entries)
        || ['outputs', 'blocks', 'files', 'catalogs', 'removedFiles'].some(key => value[key] !== undefined && (!value[key] || typeof value[key] !== 'object' || Array.isArray(value[key])))) fail('E_STATE', 'Invalid derived entrypoint state.');
      entries = value.entries; outputs = value.outputs ?? {}; blocks = value.blocks ?? {}; files = value.files ?? {}; catalogs = value.catalogs ?? {}; removedFiles = value.removedFiles ?? {};
      if (value.config !== undefined && (typeof value.config !== 'string' || !/^[a-f0-9]{64}$/.test(value.config))) fail('E_STATE', 'Invalid derived configuration state.');
      config = value.config ?? null;
      removedBlocks = value.removedBlocks ?? [];
      if (!Array.isArray(removedBlocks) || removedBlocks.some(path => typeof path !== 'string' || !nativeManagedText(path))) fail('E_STATE', 'Invalid removed block state.');
      for (const [path, digest] of Object.entries(entries)) if (!canonicalEntrypoint(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived entrypoint state.');
      for (const [path, digest] of Object.entries(outputs)) if (!allowedManaged(path) || !/^\.[^/]+\/(?:skills|agents|rules)\.json$/.test(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived output state.');
      for (const [path, digest] of Object.entries(blocks)) if (!(nativeManagedText(path) || path === '.pbai4devs/.gitignore' || adapterRoots.some(root => path === `${root}/.gitignore`)) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived block state.');
      // Legacy standalone sync can record Claude rules under ignored folders.
      // Accept this narrow provenance only so those paths can be preserved;
      // content hashes never authorize deleting or overwriting Claude rules.
      const legacyClaudeRule = path => typeof path === 'string' && /^\.claude\/rules\/.+\.md$/.test(path)
        && !/[\\|\x00-\x1f\x7f:]/.test(path)
        && !['readme.md', 'instructions.md'].includes(path.split('/').at(-1).toLowerCase())
        && path.split('/').every(part => part && part !== '.' && part !== '..' && part.toLowerCase() !== '.git');
      for (const [path, digest] of Object.entries(files)) {
        const forbiddenClaude = path.startsWith('.claude/rules/') && (path.split('/').some(part => part.toLowerCase() === '.git')
          || ['readme.md', 'instructions.md'].includes(path.split('/').at(-1).toLowerCase()));
        if (forbiddenClaude || !(allowedManaged(path) || legacyClaudeRule(path)) || !/\.(?:md|mdc|toml)$/.test(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived file state.');
      }
      for (const [path, digest] of Object.entries(catalogs)) if (!/^\.pbai4devs\/(?:catalog|skills|agents|rules)\.json$/.test(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived catalogue state.');
      for (const [path, digest] of Object.entries(removedFiles)) if (canonicalEntrypoint(path) || !(nativeMarkdown(path) || nativeToml(path)) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid removed file state.');
      const installed = loadState(target);
      if (Object.entries(removedFiles).some(([path, digest]) => installed?.files?.[path] && installed.files[path] !== digest)) fail('E_STATE', 'Removed file state differs from installation.');
    }
    catch { fail('E_STATE', 'Invalid derived entrypoint state.'); }
    for (const path of [...Object.keys(entries), ...Object.keys(outputs), ...Object.keys(blocks), ...Object.keys(files), ...Object.keys(catalogs), ...Object.keys(removedFiles), ...removedBlocks]) safePath(target, path);
  }
  return { entries, outputs, blocks, files, catalogs, config, removedBlocks, removedFiles };
}

// Diagnostic only: equal hashes or blocks do not prove current ownership.
export function diagnosePreservedDerivedToml(derivedFiles, preserved, knownBlocks, readContent) {
  const diagnostics = [];
  for (const [path, digest] of Object.entries(derivedFiles)) {
    if (!nativeToml(path) || !preserved.has(path)) continue;
    let current;
    try { current = readContent(path); }
    catch { diagnostics.push({ code: 'derived-file-unverified', path }); continue; }
    if (current === null) { diagnostics.push({ code: 'derived-file-missing', path }); continue; }
    if (!Buffer.isBuffer(current)) { diagnostics.push({ code: 'derived-file-unverified', path }); continue; }
    if (hash(current) === digest) continue;
    const block = knownBlocks[path];
    if (block) {
      try { if (blockDigest(path, current) === block) continue; }
      catch { /* A malformed or unverified block cannot suppress the warning. */ }
    }
    diagnostics.push({ code: 'derived-file-diverged', path });
  }
  return diagnostics.sort((a, b) => a.path.localeCompare(b.path));
}

export function planInstallation({ target, language = 'pt', mode = 'init', force = false, clients }) {
  assertUnredirectedGitEnvironment();
  const initialStatePath = actualStatePath(target);
  const initialDerivedPath = initialStatePath.replace(/agentdevkit\.json$/, 'derived.json');
  const initialStateBytes = read(target, initialStatePath), initialDerivedBytes = read(target, initialDerivedPath);
  const stageDependencies = new Map();
  const sameBytes = (left, right) => left === null ? right === null : Boolean(right && left.equals(right));
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
  const ownedEntrypoints = new Set(), mixedPaths = new Set(), satisfiedReferences = new Set(), nativeInputs = new Map();
  const observeNative = (path, content) => {
    if (nativeInputs.has(path)) {
      const original = nativeInputs.get(path);
      if (original === null ? content !== null : !content?.equals(original)) fail('E_CHANGED', `File changed while planning: ${path}`);
    } else nativeInputs.set(path, content);
  };
  const { entries: derivedEntries, outputs: derivedOutputs, blocks: derivedBlocks, files: derivedFiles, catalogs: derivedCatalogs, config: derivedConfig, removedBlocks, removedFiles } = readDerivedState(target);
  const removalDiagnostics = Object.keys(removedFiles).filter(path => !Object.hasOwn(installedState?.files ?? {}, path))
    .sort().map(path => ({ code: 'removed-file-unverified', path }));
  const unknownRemovedFiles = new Set(removalDiagnostics.map(item => item.path));
  const derivedConfigFiles = derivedConfig ? { '.pbai4devs/espelhos.conf': derivedConfig } : {};
  if (previous) previous = { ...previous, files: Object.fromEntries(Object.entries(previous.files).filter(([path, digest]) => removedFiles[path] !== digest)) };
  const previousBlocks = Object.fromEntries(Object.entries(previous?.blocks || {}).filter(([path]) => !removedBlocks.includes(path)));
  const knownBlocks = { ...previousBlocks, ...derivedBlocks };
  const ownedPaths = [...Object.keys(previous?.files || {}), ...Object.keys(previousBlocks), ...Object.keys(derivedEntries), ...Object.keys(derivedOutputs), ...Object.keys(derivedBlocks), ...Object.keys(derivedFiles), ...Object.keys(derivedCatalogs), ...Object.keys(derivedConfigFiles)];
  const entryPaths = new Map(entryNames.map(name => [name, resolveEntrypoint(target, name)]));
  const blockHash = path => knownBlocks[path]
    ?? (canonicalEntrypoint(path) ? Object.entries(knownBlocks).find(([candidate]) => canonicalEntrypoint(candidate) === canonicalEntrypoint(path))?.[1] : undefined);
  const preserved = new Map();
  const recordPreserved = (path, reason) => { preserved.set(path, { path, reason }); return true; };
  const fallbackChecks = new Map();
  let outputBoundaryFailure, outputBoundaryMayHaveStageEffects = true;
  const outputBlocked = (path, context) => {
    try {
    const result = nativeOutputBoundary(target, path, ownedPaths);
    if (fallbackChecks.has(path) && JSON.stringify(fallbackChecks.get(path)) !== JSON.stringify(result)) fail('E_CHANGED', `Skill route changed while planning: ${path}`);
    fallbackChecks.set(path, result);
    if (result.blocked) recordPreserved(result.path, result.reason);
    return result;
    } catch (cause) {
      // Preserve the cause, but never expose arbitrary messages or paths.
      let truncated = false;
      const data = (object, key) => {
        try {
          if ((typeof object !== 'object' || object === null) && typeof object !== 'function') return undefined;
          if (utilTypes.isProxy(object)) { truncated = true; return undefined; }
          const d = Object.getOwnPropertyDescriptor(object, key);
          if (!d) return undefined;
          if (!Object.hasOwn(d, 'value')) { truncated = true; return undefined; }
          return d.value;
        } catch { truncated = true; return undefined; }
      };
      // A callback may throw an arbitrary object, including one with a Proxy
      // prototype. Inspect only its own code; never traverse its prototype or
      // infer a primary cause from an untrusted errors property.
      const allowed = new Set(['EACCES', 'EPERM', 'EIO', 'ENOENT', 'ENOTDIR', 'ELOOP', 'EEXIST', 'EISDIR', 'EMFILE', 'ENFILE', 'ENAMETOOLONG', 'ESTALE', 'ETIMEDOUT', 'E_CHANGED', 'E_PATH', 'E_SYMLINK', 'E_GIT', 'E_NESTED_GIT', 'E_PROTECTED_METADATA', 'E_METADATA_UNSUPPORTED']);
      const candidate = data(cause, 'code');
      const code = typeof candidate === 'string' && allowed.has(candidate) ? candidate : undefined;
      if (!code) truncated = true;
      const reported = new Error('Unable to inspect project output; review the project path.', { cause });
      if (code) reported.code = code;
      if (truncated) reported.diagnosticsTruncated = true;
      outputBoundaryMayHaveStageEffects = context?.stageMayHaveEffects !== false;
      outputBoundaryFailure = reported;
      throw reported;
    }
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
  const stageHandle = createPrivateSyncStage();
  const stage = stageHandle.path;
  let stageSyncError, stageFailure, stageSyncFailed = false, stageFailed = false;
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
    // Supply the already-validated ownership records to the private stage so
    // the synchronizer can distinguish an owned ignore block from a user's.
    // These temporary records never replace or bypass checks on the target.
    const stagingState = '.pbai4devs/state/agentdevkit.json', stagingDerived = '.pbai4devs/state/derived.json';
    if (previous) write(stage, stagingState, JSON.stringify(previous));
    if (Object.keys(derivedEntries).length || Object.keys(derivedOutputs).length || Object.keys(derivedBlocks).length || Object.keys(derivedFiles).length || Object.keys(derivedCatalogs).length || derivedConfig || removedBlocks.length || Object.keys(removedFiles).length) {
      write(stage, stagingDerived, JSON.stringify({ schemaVersion: 1, entries: derivedEntries, outputs: derivedOutputs, blocks: derivedBlocks, files: derivedFiles, catalogs: derivedCatalogs, ...(derivedConfig ? { config: derivedConfig } : {}), removedBlocks, removedFiles: {} }));
    }
    // A read-only preview identifies catalogued destinations using exactly
    // the synchronizer's own selected layouts, including native exceptions.
    const candidates = Object.keys(derivedFiles).filter(path => {
      const old = previous?.files?.[path], later = derivedFiles[path];
      return active.roots.some(root => path.startsWith(root + '/')) && old && old !== later
        && !previousBlocks[path] && !derivedBlocks[path]
        && !Object.hasOwn(removedFiles, path) && !removedBlocks.includes(path);
    });
    if (previous && candidates.length) {
      let preview;
      try { preview = synchronizePrivateStage({ root: stage, check: true, force: true, localIgnores: false, generateEntrypoints: false, recordDerivedState: false, outputBlocked, output() {} }, stageHandle); }
      catch (error) { stageSyncError = error; stageSyncFailed = true; throw error; }
      const conflicts = new Set(preview.conflictPaths);
      const stagedState = { ...previous, files: { ...previous.files } };
      let changed = false;
      for (const path of candidates) {
        if (!conflicts.has(path) || stagedContains(target, stagedHuman, path) || outputBlocked(path).blocked) continue;
        const current = read(target, path);
        if (!current || hash(current) !== derivedFiles[path]) continue;
        observeNative(path, current);
        if (actualStatePath(target) !== initialStatePath
          || !sameBytes(read(target, initialStatePath), initialStateBytes)
          || !sameBytes(read(target, initialDerivedPath), initialDerivedBytes)) fail('E_CHANGED', 'Stage state changed while planning.');
        stageDependencies.set(initialStatePath, initialStateBytes ? hash(initialStateBytes) : null);
        stageDependencies.set(initialDerivedPath, initialDerivedBytes ? hash(initialDerivedBytes) : null);
        stageDependencies.set(path, hash(current));
        delete stagedState.files[path]; changed = true;
      }
      if (changed) write(stage, stagingState, JSON.stringify(stagedState));
    }
    let synchronized;
    try { synchronized = synchronizePrivateStage({ root: stage, force: true, localIgnores: false, generateEntrypoints: false, recordDerivedState: false, outputBlocked, output() {} }, stageHandle); }
    catch (error) { stageSyncError = error; stageSyncFailed = true; throw error; }
    rmSync(join(stage, stagingState), { force: true }); rmSync(join(stage, stagingDerived), { force: true });
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
    const desired = new Map(paths.filter(path => {
      if (preserveNative(path)) return false;
      if (path.endsWith('/.gitignore') && read(target, path) && !previous?.files[path] && !previous?.blocks[path] && !derivedBlocks[path]) {
        recordPreserved(path, 'existing-ignore'); return false;
      }
      return true;
    }).map(path => [path, readFileSync(join(stage, path))]));
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
    const protectedClaude = new Set(), protectedUnknownRemoved = new Set(), protectedDivergedDerived = new Set(), legacyClaudeUnverified = new Set();
    for (const path of unknownRemovedFiles) {
      if (desired.has(path)) protectedUnknownRemoved.add(path);
    }
    for (const [path, content] of desired) {
      if (!nativeManagedText(path) || canonicalEntrypoint(path)) continue;
      const current = read(target, path);
      observeNative(path, current);
      if (!current) continue;
      // A divergent earlier direct-sync record cannot authorise extending a
      // native agent or its YAML. Preserve bytes until a person can review.
      let confirmedBlock = false;
      if (blockHash(path)) {
        try { confirmedBlock = blockDigest(path, current) === blockHash(path); } catch { /* Preserve ambiguous content. */ }
      }
      if (!nativeToml(path) && derivedFiles[path] && hash(current) !== derivedFiles[path]
        && !confirmedBlock) {
        observeNative(path, current);
        protectedDivergedDerived.add(path); recordPreserved(path, 'derived-file-diverged');
        desired.delete(path); continue;
      }
      const legacyMatch = path.match(/^\.claude\/rules\/([a-z0-9-]+)\/RULE\.md$/);
      const sourcePath = legacyMatch ? `.pbai4devs/rules/${legacyMatch[1]}/RULE.md` : null;
      const actualSource = sourcePath && read(target, sourcePath), stagedSource = sourcePath && read(stage, sourcePath);
      if (legacyMatch && actualSource && stagedSource?.equals(actualSource)
        && isLegacyExact(actualSource, current, content, legacyMatch[1])
        && !stagedContains(target, stagedHuman, path) && !stagedContains(target, stagedHuman, sourcePath)
        && !previous?.files?.[path] && !previous?.blocks?.[path] && !derivedFiles[path] && !derivedBlocks[path]
        && !derivedEntries[path] && !derivedOutputs[path] && !derivedCatalogs[path]
        && !removedBlocks.includes(path) && !Object.hasOwn(removedFiles, path)) {
        observeNative(sourcePath, actualSource); stageDependencies.set(sourcePath, hash(actualSource)); stageDependencies.set(path, hash(current));
        recordPreserved(path, 'legacy-claude-scope-unverified'); satisfiedReferences.add(path); legacyClaudeUnverified.add(path); desired.delete(path); continue;
      }
      const known = [previous?.files[path], derivedFiles[path]].some(digest => digest && digest === hash(current));
      if (known) {
        if (path.startsWith('.claude/rules/') && !current.equals(content)) {
          protectedClaude.add(path); recordPreserved(path, 'claude-metadata-unverified'); desired.delete(path);
        }
        continue;
      }
      if (path.startsWith('.claude/rules/')) {
        protectedClaude.add(path); recordPreserved(path, 'claude-scope-preserved');
        desired.delete(path);
        continue;
      }
      // A reference whose only difference is CRLF already satisfies the new
      // output. Preserve its bytes and avoid appending a duplicate block; this
      // comparison neither adopts the file nor permits its replacement.
      if (!nativeToml(path) && !installedState?.blocks?.[path]
        && !derivedFiles[path] && !derivedBlocks[path] && !derivedEntries[path] && !derivedOutputs[path] && !derivedCatalogs[path]
        && !removedBlocks.includes(path) && !Object.hasOwn(removedFiles, path)) {
        const text = current.toString('utf8'), normalized = Buffer.from(text.replaceAll('\r\n', '\n'));
        if (text.includes('\r\n') && Buffer.from(text).equals(current) && normalized.equals(content)
          && (!installedState?.files?.[path] || hash(normalized) === installedState.files[path])) {
          const match = normalized.toString('utf8').match(/(?:^|\n)Leia e siga \[origem\]\(([^)\r\n]+)\)\.\n?$/);
          let sourcePath;
          try { if (match) sourcePath = posix.normalize(posix.join(posix.dirname(path), decodeURIComponent(match[1]))); } catch { /* Ambiguous references remain on the normal preservation path. */ }
          if (sourcePath && /^\.pbai4devs\/(?:skills|agents|commands|rules)\/.+\/(?:SKILL|AGENT|COMMAND|RULE)\.md$/.test(sourcePath)) {
            const sourceBytes = read(target, sourcePath);
            if (preservedHub.has(sourcePath) && !sameBytes(sourceBytes, read(stage, sourcePath))) fail('E_CHANGED', `Source changed while planning: ${sourcePath}`);
            stageDependencies.set(path, hash(current));
            stageDependencies.set(sourcePath, sourceBytes ? hash(sourceBytes) : null);
            recordPreserved(path, 'existing-reference-satisfied');
            satisfiedReferences.add(path); desired.delete(path); continue;
          }
        }
      }
      // Exact bytes satisfy discovery without transferring ownership.
      if (!nativeToml(path) && !installedState?.files?.[path] && !installedState?.blocks?.[path]
        && !derivedFiles[path] && !derivedBlocks[path] && !derivedEntries[path] && !derivedOutputs[path] && !derivedCatalogs[path] && !removedBlocks.includes(path)
        && !Object.hasOwn(removedFiles, path) && current.equals(content)) {
        recordPreserved(path, 'existing-reference-satisfied');
        satisfiedReferences.add(path); desired.delete(path); continue;
      }
      if (nativeToml(path) && !blockHash(path) && extractTomlManagedBlock(current)) {
        // A marker alone does not establish ownership of an existing block.
        recordPreserved(path, 'existing-managed-block');
        desired.delete(path);
        continue;
      }
      const source = content.toString('utf8'), marker = '<!-- gerado: sincronizar-agentes -->';
      const index = source.indexOf(marker);
      if (!nativeToml(path) && index < 0) fail('E_TEMPLATE', `Missing reference marker: ${path}`);
      const body = nativeToml(path) ? JSON.parse(source.match(/^prompt = (.+)$/m)[1]) : source.slice(index + marker.length).trim();
      if (nativeToml(path) && !blockHash(path) && promptMatchesCompleteReference(current, body)) {
        recordPreserved(path, 'existing-prompt-satisfied');
        desired.delete(path);
        continue;
      }
      const selectedBody = nativeToml(path) ? geminiReferenceBody(current, body, blockHash(path)) : body;
      const merged = (nativeToml(path) ? mergeTomlContent : mergeManagedContent)(current, selectedBody, { expectedHash: blockHash(path) });
      desired.set(path, Buffer.from(merged.text)); mixedPaths.add(path); recordPreserved(path, 'existing-file-extended');
    }
    // Native discovery manifests must not advertise resources omitted at a human boundary.
    const overlapsPreserved = path => [...preserved.keys()].some(kept => !mixedPaths.has(kept) && !satisfiedReferences.has(kept) && (path === kept || path.startsWith(`${kept}/`) || kept.startsWith(`${path}/`)));
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
    let stateContent = reconcileStateBytes(installedState ? read(target, actualStatePath(target)) : null, installedState, manifest);
    if (mode === 'sync' && installedState && !changingClients) {
      const files = { ...installedState.files }, blocks = { ...installedState.blocks };
      for (const [path, digest] of Object.entries(removedFiles)) {
        if (files[path] === digest && !stat(safePath(target, path))) delete files[path];
      }
      for (const path of removedBlocks) delete blocks[path];
      for (const [path, digest] of Object.entries({ ...derivedFiles, ...derivedOutputs, ...derivedEntries, ...derivedCatalogs, ...derivedConfigFiles })) { files[path] = digest; delete blocks[path]; }
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
    // Legacy migration must preserve the staged source and copy byte for byte.
    // Do not recreate a correlated retired output when that migration cannot
    // also reconcile its old derived marker under those existing guarantees.
    if (migration) {
      const blocked = Object.entries(removedFiles).find(([path, digest]) =>
        installedState?.files?.[path] === digest && !stat(safePath(target, path))
        && [...desired.keys()].some(candidate => gitPathsOverlap(path, candidate, { root: target, allowMissingTarget: true })));
      if (blocked) fail('E_MIGRATION_REVIEW', `Legacy removal record needs review before reactivation: ${blocked[0]}`);
    }
    const derivedBytes = !migration ? read(target, derivedPath) : null;
    let nextDerivedBytes = derivedBytes;
    if (nextDerivedBytes && Object.keys(removedFiles).length) {
      const finalState = JSON.parse(stateContent);
      const remaining = Object.fromEntries(Object.entries(removedFiles).filter(([path, digest]) =>
        unknownRemovedFiles.has(path) || finalState.files[path] === digest && !stat(safePath(target, path)) && !desired.has(path)));
      if (Object.keys(remaining).length !== Object.keys(removedFiles).length) {
        observeNative(derivedPath, derivedBytes);
        nextDerivedBytes = replaceJsonMember(nextDerivedBytes, 'removedFiles', Object.keys(remaining).length ? remaining : undefined);
      }
    }
    // Narrow transition: a direct-sync-only file being replaced by this plan
    // can transfer its prior overlay into the newly installed record.
    if (nextDerivedBytes && Object.keys(derivedFiles).length) {
      const finalState = JSON.parse(stateContent);
      const remaining = Object.fromEntries(Object.entries(derivedFiles).filter(([path, digest]) => {
        if (Object.hasOwn(installedState?.files ?? {}, path) || installedState?.blocks?.[path]
          || Object.hasOwn(removedFiles, path) || removedBlocks.includes(path)
          || derivedBlocks[path] || mixedPaths.has(path) || preserved.has(path)
          || !synchronized.ownedOutputs.includes(path) || stagedContains(target, stagedHuman, path)) return true;
        const current = read(target, path), content = desired.get(path);
        if (!current || !content || hash(current) !== digest || current.equals(content)
          || finalState.files[path] !== hash(content)) return true;
        observeNative(path, current);
        return false;
      }));
      if (Object.keys(remaining).length !== Object.keys(derivedFiles).length) {
        observeNative(derivedPath, derivedBytes);
        nextDerivedBytes = replaceJsonMember(nextDerivedBytes, 'files', Object.keys(remaining).length ? remaining : undefined);
      }
    }
    if (nextDerivedBytes && Object.keys(derivedCatalogs).length) {
      const finalState = JSON.parse(stateContent);
      const remaining = Object.fromEntries(Object.entries(derivedCatalogs).filter(([path]) => {
        const content = desired.get(path);
        return !content || finalState.files[path] !== hash(content);
      }));
      if (Object.keys(remaining).length !== Object.keys(derivedCatalogs).length) {
        observeNative(derivedPath, derivedBytes);
        nextDerivedBytes = replaceJsonMember(nextDerivedBytes, 'catalogs', Object.keys(remaining).length ? remaining : undefined);
      }
    }
    if (nextDerivedBytes && Object.keys(derivedBlocks).length) {
      const finalState = JSON.parse(stateContent);
      const remaining = Object.fromEntries(Object.entries(derivedBlocks).filter(([path, digest]) => {
        if (unknownRemovedFiles.has(path)) return true;
        const content = desired.get(path);
        // A deselected generated block is removed later in this transaction.
        // Drop its overlay only if its current bytes are still proven; edited
        // blocks remain conflicts and no metadata is committed on failure.
        if (!content && !canonicalEntrypoint(path) && !finalState.blocks[path] && !finalState.files[path]) {
          const current = read(target, path);
          return Boolean(current && blockDigest(path, current) !== digest);
        }
        return !content || finalState.blocks[path] !== blockDigest(path, content);
      }));
      if (Object.keys(remaining).length !== Object.keys(derivedBlocks).length) {
        observeNative(derivedPath, derivedBytes);
        nextDerivedBytes = replaceJsonMember(nextDerivedBytes, 'blocks', Object.keys(remaining).length ? remaining : undefined);
      }
    }
    if (nextDerivedBytes && derivedConfig) {
      const finalState = JSON.parse(stateContent), path = '.pbai4devs/espelhos.conf', content = desired.get(path);
      if (content && finalState.files[path] === hash(content)) {
        observeNative(derivedPath, derivedBytes);
        nextDerivedBytes = replaceJsonMember(nextDerivedBytes, 'config', undefined);
      }
    }
    if (nextDerivedBytes && !nextDerivedBytes.equals(derivedBytes)) desired.set(derivedPath, nextDerivedBytes);
    const changes = [], conflicts = [...protectedClaude, ...protectedUnknownRemoved, ...protectedDivergedDerived];
    const aliasedEntrypoint = path => canonicalEntrypoint(path) && entryPaths.get(canonicalEntrypoint(path)) !== path;
    const generatedInternal = new Set(['.pbai4devs/catalog.json', '.pbai4devs/skills.json', '.pbai4devs/agents.json', '.pbai4devs/rules.json', '.pbai4devs/espelhos.conf']);
    for (const [path, content] of desired) {
      const current = read(target, path);
      if (nativeInputs.has(path) && (nativeInputs.get(path) === null ? current !== null : !current?.equals(nativeInputs.get(path)))) fail('E_CHANGED', `File changed while planning: ${path}`);
      const wholeFileOwned = current && [previous?.files[path], derivedOutputs[path], derivedEntries[path], derivedFiles[path], derivedCatalogs[path], derivedConfigFiles[path]].some(digest => digest && digest === hash(current));
      const existingBlock = current && (nativeManagedText(path) || canonicalEntrypoint(path) || path.endsWith('/.gitignore')) ? blockDigest(path, current) : null;
      if (existingBlock && !wholeFileOwned && knownBlocks[path] !== existingBlock) conflicts.push(path);
      if (current?.equals(content)) {
        // Identical bytes do not prove ownership of a pre-existing catalogue.
        // Refuse adoption: a later sync could otherwise overwrite user data.
        if (!wholeFileOwned && (generatedInternal.has(path) || native(path) && !existingBlock && !mixedPaths.has(path) && !preserved.has(path))) conflicts.push(path);
        continue;
      }
      const managed = path === derivedPath && derivedBytes && current?.equals(derivedBytes)
        || [previous?.files[path], derivedOutputs[path], derivedEntries[path], derivedFiles[path], derivedCatalogs[path], derivedConfigFiles[path]].some(digest => digest && hash(current || '') === digest)
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
      if (path === '.gitignore' || path.endsWith('/.gitignore')) { if (read(target, path)) recordPreserved(path, 'existing-ignore'); continue; }
      if (migration && path.startsWith('.pbai4devs/estado/')) continue;
      if (path === '.gitignore') { recordPreserved(path, 'project-owned'); continue; }
      if (aliasedEntrypoint(path)) continue;
      if (path.startsWith('.claude/rules/')) {
        if (boundary(path) || read(target, path)) { if (active.roots.includes('.claude')) conflicts.push(path); recordPreserved(path, 'claude-metadata-unverified'); }
        continue;
      }
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
      if (unknownRemovedFiles.has(path)) { recordPreserved(path, 'removed-file-unverified'); continue; }
      if (path === '.gitignore' || path.endsWith('/.gitignore')) { if (read(target, path)) recordPreserved(path, 'existing-ignore'); continue; }
      if (path.startsWith('.claude/rules/')) {
        if (boundary(path) || read(target, path)) { if (active.roots.includes('.claude')) conflicts.push(path); recordPreserved(path, 'claude-metadata-unverified'); }
        continue;
      }
      const current = read(target, path); if (!current) continue;
      const source = current.toString('utf8');
      const block = path.endsWith('/.gitignore') ? extractBlock(source, '# BEGIN AGENT IGNORE', '# END AGENT IGNORE') : nativeToml(path) ? extractTomlManagedBlock(current) : extractManagedBlock(current);
      if (!block || blockDigest(path, current) !== digest) conflicts.push(path);
      if (!block) continue;
      let content = path.endsWith('/.gitignore') ? source.replace(block, '') : (nativeToml(path) ? stripTomlContent : stripManagedContent)(current, digest);
      let removable = path.endsWith('/.gitignore') && !content.trim();
      if (canonicalEntrypoint(path)) {
        const template = readFileSync(join(packageRoot, '.pbai4devs/templates/entrypoints', canonicalEntrypoint(path)), 'utf8');
        if (source === entryContent(null, template, previous?.language || language, canonicalEntrypoint(path))) { content = ''; removable = true; }
      }
      changes.push({ path, action: removable ? 'remove' : 'update', content: removable ? null : Buffer.from(content), beforeHash: hash(current) });
    }
    const claudeScopeBoundaries = new Set();
    for (const omission of synchronized.claudeRetiredTargets || []) {
      const path = omission.target;
      if (boundary(path)) { claudeScopeBoundaries.add(path); continue; }
      const item = stat(safePath(target, path));
      if (item && !item.isFile()) {
        recordPreserved(path, item.isDirectory() ? 'existing-directory' : 'non-file');
        if (active.roots.includes('.claude') && ['update', 'sync'].includes(mode)) conflicts.push(path);
        claudeScopeBoundaries.add(path);
        continue;
      }
      const current = read(target, path);
      if (!current) continue;
      // Hash antigo não comprova identidade, modo, ACL ou xattrs atuais.
      conflicts.push(path); recordPreserved(path, 'claude-scope-preserved');
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
    // Regras do cliente desmarcado são preservadas sem provar ownership.
    // Enquanto existirem, a configuração ativa é desconhecida e check/doctor
    // devem continuar sinalizando o risco, inclusive após mudar a seleção.
    const retainedClaude = active.roots.includes('.claude') ? [] : scanRetainedClaude(target);
    const retainedClaudeRules = retainedClaude.map(item => item.path);
    if (active.roots.includes('.claude')) {
      for (const path of [...claudeScopeBoundaries, ...legacyClaudeUnverified]) retainedClaudeRules.push(path);
      for (const [path, item] of preserved) {
        if ((path === '.claude' || path === '.claude/rules' || path.startsWith('.claude/rules/'))
          && ['symbolic-link', 'non-directory', 'non-file', 'existing-directory'].includes(item.reason)
        ) {
          if (!retainedClaudeRules.includes(path)) retainedClaudeRules.push(path);
          // Initial setup can preserve a pre-existing client boundary, but an
          // update must not report the rule scope as fully verified through it.
          if (path.startsWith('.claude/rules/') && ['update', 'sync'].includes(mode)) conflicts.push(path);
        }
      }
    }
    for (const item of retainedClaude) recordPreserved(item.path, item.reason);
    retainedClaudeRules.sort();
    if (active.roots.includes('.claude')) for (const item of scanRetainedClaude(target)) {
      const full = item.path;
      if (item.reason === 'claude-scan-incomplete') {
        conflicts.push(full); recordPreserved(full, item.reason); continue;
      }
      if (item.reason !== 'claude-activation-unverified') {
        if (!retainedClaudeRules.includes(full)) retainedClaudeRules.push(full);
        recordPreserved(full, item.reason); continue;
      }
      if (desired.has(full) || legacyClaudeUnverified.has(full)) continue;
      const known = [previous?.files[full], derivedFiles[full], knownBlocks[full]].some(Boolean);
      if (!known) {
        const info = stat(safePath(target, full));
        if (!info?.isFile() || info.size > 1024 * 1024) {
          if (!retainedClaudeRules.includes(full)) retainedClaudeRules.push(full);
          recordPreserved(full, 'claude-scan-incomplete'); continue;
        }
        const current = read(target, full), text = current?.toString('utf8');
        if (!current) continue;
        if (!resemblesClaudeReference(full, text)) {
          if (mayReferenceClaudeRule(full, text)) {
            if (!retainedClaudeRules.includes(full)) retainedClaudeRules.push(full);
            recordPreserved(full, 'claude-scope-unverified');
          }
          continue;
        }
      }
      conflicts.push(full); recordPreserved(full, 'claude-metadata-unverified');
    }
    retainedClaudeRules.sort();
    for (const root of changingClients ? [] : active.roots) for (const full of nativeFiles(root)) {
      const path = full.slice(root.length + 1);
      if (!['skills', 'agents', 'commands', 'rules', 'instructions', 'prompts'].includes(path.split('/')[0])) continue;
      if (desired.has(full) || changes.some(change => change.path === full)) continue;
      const current = read(target, full);
      const known = [previous?.files[full], derivedFiles[full]].some(digest => digest && digest === hash(current));
      if (preserved.has(full)) continue;
      if (!known || !generatedReference(current)) { recordPreserved(full, 'existing-file'); continue; }
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
      if (change.action === 'update' && allowsStagedBlock(change.path, current, change.content, knownBlocks[change.path])) change.stagedBlockAllowed = true;
      if (change.action === 'remove' && migration) {
        const item = migration.files.find(file => file.path === change.path);
        const copy = item && changes.find(candidate => candidate.path === item.target && candidate.action === 'create');
        if (item && current?.equals(item.content) && copy?.content?.equals(item.content)
          && changes.indexOf(copy) < changes.indexOf(change)) change.stagedMigrationTarget = item.target;
      }
    }
    const backupNeeded = changes.some(change => change.beforeHash !== null);
    for (const path of unknownRemovedFiles) {
      if (changes.some(change => gitPathsOverlap(change.path, path, { root: target, allowMissingTarget: true }))) {
        conflicts.push(path); if (!preserved.has(path)) recordPreserved(path, 'removed-file-unverified');
      }
    }
    const protectedGitlinks = changes.filter(change => stagedContains(target, stagedHuman.gitlinks || new Set(), change.path));
    if (backupNeeded && stagedContains(target, stagedHuman.gitlinks || new Set(), '.agent-tests/agentdevkit/backups')) fail('E_STAGED', 'Backup would be inside a Git submodule; contents are preserved.');
    if (protectedGitlinks.length) fail('E_STAGED', 'A planned change is inside a Git submodule; its contents are preserved.');
    const stagedChanges = changes.filter(change => stagedContains(target, stagedHuman, change.path) && !change.stagedDeletionAllowed && !change.stagedBlockAllowed && !change.stagedMigrationTarget);
    if (stagedChanges.length) fail('E_STAGED', `Staged content differs from the working tree for planned changes: ${stagedChanges.map(change => `${change.action} ${change.path}`).join(', ')}. Preserve and review these paths before updating.`);
    assertNoNestedGit(target, [...changes.map(change => change.path), ...(migration?.directories || []).flatMap(item => [item.path, item.path.replace(/^\.pbai4devs\/estado/, '.pbai4devs/state')])]);
    if (backupNeeded) assertNoNestedGit(target, ['.agent-tests/agentdevkit/backups']);
    const retiredRoots = adapterRoots.filter(root => !active.roots.includes(root) && changes.some(change => change.action === 'remove' && change.path.startsWith(`${root}/`) && (previous?.files[change.path] || previous?.blocks[change.path])));
    const ownedOutputs = [...new Set([...synchronized.ownedOutputs, ...ownedEntrypoints, statePath])].filter(path => !mixedPaths.has(path) && !legacyClaudeUnverified.has(path) && !overlapsPreserved(path));
    // Ignore rules affect only untracked files. Never remove existing index
    // entries on behalf of the project; staged bytes are checked separately.
    const untrack = { root: target, paths: [], hashes: {}, index: '', conflicts: [] };
    const localIgnore = planLocalIgnore(target, { outputs: ownedOutputs, templateRoot: stage });
    const localIgnoreCheck = checkLocalIgnore(localIgnore, { replacedBlocks: replacedIgnoreBlocks(target, changes, previous) });
    conflicts.push(...(untrack?.conflicts || []), ...localIgnoreCheck.missing);
    const derivedFileDiagnostics = diagnosePreservedDerivedToml(derivedFiles, preserved, knownBlocks, path => read(target, path));
    const hardlinkBlockers = changes.flatMap(change => {
      const info = stat(safePath(target, change.path));
      if (!info?.isFile()) return [];
      if (!Number.isSafeInteger(info.nlink) || info.nlink < 1) return [{ path: change.path, code: 'hardlink-unverified' }];
      return info.nlink > 1 ? [{ path: change.path, code: 'hardlink-shared' }] : [];
    });
    const ownerBlockers = changes.flatMap(change => {
      const issue = fileOwnerIssue(stat(safePath(target, change.path)));
      return issue ? [{ path: change.path, code: issue }] : [];
    });
    const aclBlockers = process.platform === 'darwin' ? changes.flatMap(change => {
      const file = safePath(target, change.path), info = stat(file);
      if (!info?.isFile()) return [];
      const acl = inspectMacAcl(file);
      const safeUpdate = change.action === 'update' && nativeMetadataCopySupported
        && acl === 'present' && inspectMacWriteProtection(file) === 'clear';
      return acl === 'empty' || safeUpdate ? [] : [{ path: change.path, code: acl === 'present' ? 'acl-present' : 'acl-unverified' }];
    }) : [];
    const linuxXattrChecks = process.platform === 'linux' ? changes.flatMap(change => {
      const file = safePath(target, change.path), info = stat(file);
      return info?.isFile() ? [{ path: change.path, action: change.action, status: inspectLinuxXattr(file) }] : [];
    }) : [];
    const xattrBlockers = linuxXattrChecks.filter(item => item.status === 'present'
      && !(item.action === 'update' && nativeMetadataCopySupported)).map(item => ({ path: item.path, code: 'xattr-present' }));
    const xattrUnverified = linuxXattrChecks.filter(item => item.status !== 'present').map(item => item.path);
    // A conflict means ownership or the managed bytes could not be proven.
    // Backups do not authorize replacing user content, even with --force.
    return { target, language, mode, changes, stageDependencies: [...stageDependencies].map(([path, expectedHash]) => ({ path, expectedHash })), conflicts: [...new Set(conflicts)].sort(), canApply: !conflicts.length && !untrack?.conflicts?.length && !localIgnoreCheck.missing.length && !hardlinkBlockers.length && !ownerBlockers.length && !aclBlockers.length && !xattrBlockers.length, hardlinkBlockers, ownerBlockers, aclBlockers, xattrBlockers, xattrUnverified, manifest, retiredRoots, ownedOutputs, untrack, localIgnore, localIgnoreCheck, migration, fallbackChecks: [...fallbackChecks], fallbackOwnedPaths: ownedPaths, retainedClaudeRules, derivedFileDiagnostics, removalDiagnostics, scopeOmissions: (synchronized.scopeOmissions || []).map(item => (retainedClaudeRules.length || conflicts.some(path => path.startsWith('.claude/rules/'))) ? { ...item, status: 'activation-unverified' } : item), preserved: [...preserved.values()].sort((a, b) => a.path.localeCompare(b.path)) };
  } catch (error) { stageFailure = error; stageFailed = true; throw error; }
  finally {
    let callbackFailure = Boolean(stageFailed && outputBoundaryFailure && stageFailure === outputBoundaryFailure);
    if (!callbackFailure && stageFailed && outputBoundaryFailure) {
      try { callbackFailure = primaryDiagnosticError(stageFailure) === outputBoundaryFailure; } catch { /* Keep the synchronizer boundary. */ }
    }
    // Inspect only own data descriptors. Any accessor, proxy, mixed diagnostic
    // or graph limit retains the stage without disclosing arbitrary paths.
    const uncertainCause = error => {
      const pending = [error], seen = new Set();
      while (pending.length) {
        const item = pending.pop();
        if (!item || (typeof item !== 'object' && typeof item !== 'function') || seen.has(item)) continue;
        if (seen.size >= 64 || utilTypes.isProxy(item)) return true;
        seen.add(item);
        for (const key of ['uncertainPaths', 'rollbackPreservedPaths', 'cleanupFailures', 'diagnosticsTruncated', 'operationMayBePartial']) {
          let d; try { d = Object.getOwnPropertyDescriptor(item, key); } catch { return true; }
          if (d && (!Object.hasOwn(d, 'value') || d.value !== undefined && d.value !== null && d.value !== false)) return true;
        }
        let cause, errors;
        try { cause = Object.getOwnPropertyDescriptor(item, 'cause'); errors = Object.getOwnPropertyDescriptor(item, 'errors'); } catch { return true; }
        if (cause) { if (!Object.hasOwn(cause, 'value')) return true; if (cause.value) pending.push(cause.value); }
        if (errors) {
          if (!Object.hasOwn(errors, 'value') || utilTypes.isProxy(errors.value) || !Array.isArray(errors.value)) return true;
          let length; try { length = Object.getOwnPropertyDescriptor(errors.value, 'length')?.value; } catch { return true; }
          if (!Number.isSafeInteger(length) || length > 64) return true;
          for (let i = 0; i < length; i++) { let d; try { d = Object.getOwnPropertyDescriptor(errors.value, String(i)); } catch { return true; } if (d) { if (!Object.hasOwn(d, 'value')) return true; pending.push(d.value); } }
        }
      }
      return false;
    };
    const callbackUncertain = callbackFailure && (outputBoundaryMayHaveStageEffects || stageFailure !== outputBoundaryFailure || uncertainCause(outputBoundaryFailure));
    const syncDiagnostics = stageFailed && stageSyncFailed && Object.is(stageFailure, stageSyncError) && !callbackFailure ? collectErrorDiagnostics(stageFailure) : null;
    const preserveStage = callbackUncertain || Boolean(syncDiagnostics && (syncDiagnostics.preservedPaths.length || syncDiagnostics.cleanupFailures.length || syncDiagnostics.truncated));
    let cleanupFailure, cleanupFailed = false;
    // An uncertain staged name may have been replaced; recursive cleanup
    // would erase it and discard the only diagnostics. Keep the private stage.
    if (!preserveStage) try { rmSync(stage, { recursive: true, force: true }); } catch (error) { cleanupFailure = error; cleanupFailed = true; }
    if (callbackFailure) {
      // Keep the synchronizer's complete causal chain, even if it wrapped the
      // callback with an aggregate containing stage cleanup failures.
      const reported = new Error(outputBoundaryFailure.message, { cause: stageFailure });
      if (outputBoundaryFailure.code) reported.code = outputBoundaryFailure.code;
      if (callbackUncertain) { reported.uncertainPaths = [stage]; reported.diagnosticsTruncated = true; }
      if (outputBoundaryFailure.diagnosticsTruncated) reported.diagnosticsTruncated = true;
      if (cleanupFailed) {
        Object.defineProperty(reported, 'cleanupError', { value: cleanupFailure });
        reported.uncertainPaths = [stage]; reported.cleanupFailures = [{ path: stage, message: 'cleanup failed' }]; reported.operationMayBePartial = true;
      }
      throw markDiagnosticsBoundary(reported);
    }
    if (stageFailed && stageSyncFailed && Object.is(stageFailure, stageSyncError)) {
      // Synchronizer diagnostics refer to the private stage, not the project.
      // Once the stage is gone, report only the original operation failure.
      const primary = primaryDiagnosticError(stageFailure);
      const stageCode = stageFailure?.code || primary?.code;
      // Paths from the private stage must never be attributed to the project.
      const metadataStage = ['E_PROTECTED_METADATA', 'E_METADATA_UNSUPPORTED'].includes(stageCode);
      const detail = metadataStage ? 'Metadata verification failed in private staging; no project path is identified.' : (cleanupFailed || preserveStage ? stageFailure?.message : primary?.message) || 'Synchronization failed in private staging.';
      const reported = new Error(detail, { cause: stageFailure });
      // API callers can explicitly inspect the secondary error; it is not
      // included in the mapped public diagnostics or ordinary serialization.
      if (cleanupFailed) Object.defineProperty(reported, 'cleanupError', { value: cleanupFailure });
      reported.code = stageCode;
      reported.hardlinkUnsupported = stageFailure?.hardlinkUnsupported || primary?.hardlinkUnsupported;
      reported.diagnosticsScope = 'staging';
      if (syncDiagnostics.possiblePartial) reported.operationMayBePartial = true;
      if (cleanupFailed || preserveStage) {
        reported.rollbackPreservedPaths = [...(preserveStage ? [stage] : []), ...syncDiagnostics.preservedPaths.map(path => resolve(stage, path))];
        // Keep secondary filesystem messages out of the staged diagnostics;
        // the original synchronization failure remains available as the cause.
        reported.cleanupFailures = [...syncDiagnostics.cleanupFailures.map(item => ({ path: resolve(stage, item.path), message: 'cleanup failed' })), ...(cleanupFailed ? [{ path: stage, message: 'cleanup failed' }] : [])];
        if (syncDiagnostics.truncated) reported.diagnosticsTruncated = true;
      }
      throw markDiagnosticsBoundary(reported);
    }
    if (cleanupFailed) {
      // Neither failure is guaranteed to be extensible. Keep the primary
      // cause and the uncertain stage without annotating either original.
      const original = stageFailed ? stageFailure : cleanupFailure;
      const primary = primaryDiagnosticError(original);
      const reported = new Error(stageFailed ? original?.message || 'Stage operation failed.' : 'Cleanup failed in private staging.', { cause: original });
      if (stageFailed) Object.defineProperty(reported, 'cleanupError', { value: cleanupFailure });
      reported.code = original?.code || primary?.code;
      if (Number.isInteger(original?.exitCode ?? primary?.exitCode)) reported.exitCode = original?.exitCode ?? primary.exitCode;
      if (original?.hardlinkUnsupported || primary?.hardlinkUnsupported) reported.hardlinkUnsupported = true;
      if (typeof (original?.nestedGitPath ?? primary?.nestedGitPath) === 'string') reported.nestedGitPath = original?.nestedGitPath ?? primary.nestedGitPath;
      reported.operationMayBePartial = true;
      reported.uncertainPaths = [stage];
      reported.cleanupFailures = [{ path: stage, message: 'cleanup failed' }];
      if (!stageFailed) { reported.diagnosticsScope = 'staging'; throw markDiagnosticsBoundary(reported); }
      throw reported;
    }
    if (stageFailed && !stageSyncFailed && (stageFailure === null || (typeof stageFailure !== 'object' && typeof stageFailure !== 'function'))) {
      const reported = new Error('Stage operation failed.', { cause: stageFailure });
      reported.code = 'E_OPERATION'; reported.diagnosticsScope = 'staging';
      throw markDiagnosticsBoundary(reported);
    }
  }
}

export function applyPlan(plan) {
  assertUnredirectedGitEnvironment();
  const pending = inspectProjectRecovery(plan.target);
  if (pending.status !== 'ready') {
    throw Object.assign(new Error('Inspect the project recovery record before continuing.'), {
      code: pending.status === 'pending' ? 'E_RECOVERY_PENDING' : 'E_RECOVERY_STORE', operation: pending,
    });
  }
  if (!plan.canApply && !plan.conflicts?.length && !plan.localIgnoreCheck?.missing?.length && plan.ownerBlockers?.length) {
    const blocker = plan.ownerBlockers[0], issue = fileOwnerIssue(stat(safePath(plan.target, blocker.path)));
    if (issue !== blocker.code) fail('E_CHANGED', 'The planned file owner changed; review and create a new plan.');
    throw Object.assign(new Error('File ownership or readability requires review.'), { code: issue.endsWith('-unverified') ? 'E_METADATA_UNSUPPORTED' : 'E_PROTECTED_METADATA', path: blocker.path, metadataTargetVerified: true, metadataReason: issue });
  }
  if (!plan.canApply && !plan.conflicts?.length && !plan.localIgnoreCheck?.missing?.length && plan.hardlinkBlockers?.length) {
    const blocker = plan.hardlinkBlockers[0], info = stat(safePath(plan.target, blocker.path));
    if (!info?.isFile()) fail('E_CHANGED', 'The planned file changed; review and create a new plan.');
    if (!Number.isSafeInteger(info.nlink) || info.nlink < 1) throw Object.assign(new Error('Hardlink count could not be verified; preserved for review.'), { code: 'E_METADATA_UNSUPPORTED', path: blocker.path, metadataTargetVerified: true, metadataReason: 'hardlink-unverified' });
    if (info.nlink === 1 || blocker.code !== 'hardlink-shared') fail('E_CHANGED', 'The planned hardlink status changed; review and create a new plan.');
    throw Object.assign(new Error('Existing file has multiple hardlinks; preserved for review.'), { code: 'E_PROTECTED_METADATA', path: blocker.path, metadataTargetVerified: true, metadataReason: 'hardlink-shared' });
  }
  if (!plan.canApply && !plan.conflicts?.length && !plan.localIgnoreCheck?.missing?.length && plan.aclBlockers?.length && process.platform === 'darwin') {
    const blocker = plan.aclBlockers[0], file = safePath(plan.target, blocker.path), info = stat(file);
    if (!info?.isFile()) fail('E_CHANGED', 'The planned file changed; review and create a new plan.');
    const acl = inspectMacAcl(file);
    if (acl === 'empty') fail('E_CHANGED', 'The planned ACL status changed; review and create a new plan.');
    throw Object.assign(new Error('ACL requires review.'), { code: acl === 'present' ? 'E_PROTECTED_METADATA' : 'E_METADATA_UNSUPPORTED', path: blocker.path, metadataTargetVerified: true, metadataReason: acl === 'present' ? 'acl-present' : 'acl-unverified' });
  }
  if (!plan.canApply && !plan.conflicts?.length && !plan.localIgnoreCheck?.missing?.length && plan.xattrBlockers?.length && process.platform === 'linux') {
    const blocker = plan.xattrBlockers[0], file = safePath(plan.target, blocker.path);
    if (!stat(file)?.isFile() || inspectLinuxXattr(file) !== 'present') fail('E_CHANGED', 'The planned metadata changed; review and create a new plan.');
    throw Object.assign(new Error('Extended attributes require review.'), { code: 'E_PROTECTED_METADATA', path: blocker.path, metadataTargetVerified: true, metadataReason: 'xattr-present' });
  }
  if (!plan.canApply) fail('E_CONFLICT', text(plan.language, 'conflict'));
  if (!Array.isArray(plan.changes)) fail('E_PLAN', 'The installation plan must contain a list of changes.');
  const assertActionContent = (action, content, code) => {
    if (action === 'remove' ? content !== null : !['create', 'update'].includes(action) || !Buffer.isBuffer(content)) {
      fail(code, 'The installation action and its content are inconsistent.');
    }
  };
  const assertStaticContents = code => {
    for (const change of plan.changes) {
      if (!['create', 'update', 'remove'].includes(change.action)) fail(code, 'The installation plan contains an unknown action.');
      if (change.action === 'create' ? change.beforeHash !== null : typeof change.beforeHash !== 'string' || !/^[a-f0-9]{64}$/.test(change.beforeHash)) {
        fail(code, 'The installation action and its previous state are inconsistent.');
      }
      const descriptor = Object.getOwnPropertyDescriptor(change, 'content');
      if (!descriptor) fail(code, 'The installation action is missing content.');
      // Defer accessors until execution: they can report a failure without
      // being evaluated during planning. Normal plans contain data properties.
      if ('value' in descriptor) assertActionContent(change.action, descriptor.value, code);
    }
  };
  const plannedPaths = new Set();
  for (const change of plan.changes) {
    if (!change || typeof change.path !== 'string' || plannedPaths.has(change.path)) {
      fail('E_PLAN', 'The installation plan contains an invalid or duplicate path.');
    }
    plannedPaths.add(change.path);
  }
  assertStaticContents('E_PLAN');
  const plannedActions = plan.changes.map(change => [change.path, change.action]);
  const assertActionsUnchanged = () => {
    if (!Array.isArray(plan.changes) || plan.changes.length !== plannedActions.length
      || plannedActions.some(([path, action], index) => plan.changes[index]?.path !== path || plan.changes[index]?.action !== action)) {
      fail('E_CHANGED', 'The installation actions changed during application.');
    }
  };
  assertLocalIgnoreUnchanged(plan.localIgnore);
  const { target } = plan;
  // These were real inputs to private-stage decisions, even if not outputs.
  const assertStageDependencies = () => {
    if (plan.stageDependencies !== undefined && !Array.isArray(plan.stageDependencies)) fail('E_PLAN', 'Invalid stage dependencies.');
    for (const item of plan.stageDependencies || []) {
      if (!item || typeof item.path !== 'string' || (item.expectedHash !== null && !/^[a-f0-9]{64}$/.test(item.expectedHash))) fail('E_PLAN', 'Invalid stage dependency.');
      const current = read(target, item.path);
      if ((current ? hash(current) : null) !== item.expectedHash) fail('E_CHANGED', 'Stage input changed after planning: ' + item.path);
    }
  };
  assertStageDependencies();
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
  if (plan.changes.some(change => stagedContains(target, stagedHuman.gitlinks || new Set(), change.path))
    || plan.changes.some(change => change.beforeHash !== null) && stagedContains(target, stagedHuman.gitlinks || new Set(), '.agent-tests/agentdevkit/backups')) fail('E_STAGED', 'A planned change is inside a Git submodule; its contents are preserved.');
  const currentState = loadState(target);
  const derivedState = readDerivedState(target);
  const currentBlocks = {
    ...Object.fromEntries(Object.entries(currentState?.blocks || {}).filter(([path]) => !derivedState.removedBlocks.includes(path))),
    ...derivedState.blocks,
  };
  const approvedStagedContents = new Map();
  const stagedChanges = plan.changes.filter(change => {
    if (!stagedContains(target, stagedHuman, change.path)) return false;
    const current = read(target, change.path);
    if ((current ? hash(current) : null) !== change.beforeHash) fail('E_CHANGED', `File changed after planning: ${change.path}`);
    if (!current) return true;
    if (change.stagedDeletionAllowed && stagedContains(target, stagedHuman.deleted || new Set(), change.path)
      && currentState?.files?.[change.path] === change.beforeHash) return false;
    if (change.stagedBlockAllowed && change.action === 'update') {
      const proposed = change.content;
      if (Buffer.isBuffer(proposed)) {
        const content = Buffer.from(proposed);
        if (allowsStagedBlock(change.path, current, content, currentBlocks[change.path])) {
          approvedStagedContents.set(change.path, content);
          return false;
        }
      }
    }
    if (change.stagedMigrationTarget) {
      const copy = plan.changes.find(candidate => candidate.path === change.stagedMigrationTarget && candidate.action === 'create');
      if (copy?.content?.equals(current) && plan.changes.indexOf(copy) < plan.changes.indexOf(change)
        && !stat(safePath(target, change.stagedMigrationTarget))) return false;
    }
    return true;
  });
  if (stagedChanges.length) fail('E_STAGED', `Staged content differs from the working tree for planned changes: ${stagedChanges.map(change => `${change.action} ${change.path}`).join(', ')}. Preserve and review these paths before updating.`);
  assertNoNestedGit(target, [...plan.changes.map(change => change.path), ...(plan.migration?.directories || []).flatMap(item => [item.path, item.path.replace(/^\.pbai4devs\/estado/, '.pbai4devs/state')])]);
  const assertMigrationDirectories = () => {
    if (!plan.migration) return;
    if (stat(safePath(target, '.pbai4devs/state'))) fail('E_CHANGED', 'State destination appeared after planning.');
    for (const directory of plan.migration.directories) {
      const file = safePath(target, directory.path), info = stat(file);
      if (!info?.isDirectory()) fail('E_CHANGED', `State directory changed after planning: ${directory.path}`);
      assertMigrationDirectoryMetadata(target, directory.path, info);
      if ((info.mode & 0o777) !== directory.mode) fail('E_CHANGED', `State directory mode changed during migration: ${directory.path}`);
      if (JSON.stringify(readdirSync(file).sort()) !== JSON.stringify(directory.names)) {
        fail('E_CHANGED', `State directory changed after planning: ${directory.path}`);
      }
    }
  };
  assertMigrationDirectories();
  for (const item of plan.migration?.files || []) {
    const info = stat(safePath(target, item.path));
    if (!info?.isFile() || (info.mode & 0o777) !== item.mode || hash(readFileSync(safePath(target, item.path))) !== hash(item.content)) fail('E_CHANGED', `State file changed after planning: ${item.path}`);
  }
  const backupParent = '.agent-tests/agentdevkit/backups';
  safePath(target, backupParent);
  for (const change of plan.changes) safePath(target, change.path);
  const before = new Map(plan.changes.map(change => [change.path, read(target, change.path)]));
  const assertNoSharedLinks = (path, info) => {
    if (info?.isFile() && (!Number.isSafeInteger(info.nlink) || info.nlink < 1)) throw Object.assign(new Error('Hardlink count could not be verified; preserved for review.'), {
      code: 'E_METADATA_UNSUPPORTED', path, metadataTargetVerified: true, metadataReason: 'hardlink-unverified',
    });
    if (info?.isFile() && info.nlink > 1) throw Object.assign(new Error('Existing file has multiple hardlinks; preserved for review.'), {
      code: 'E_PROTECTED_METADATA', path, metadataTargetVerified: true, metadataReason: 'hardlink-shared',
    });
  };
  const assertFileOwner = (path, info) => {
    const issue = fileOwnerIssue(info);
    if (issue) throw Object.assign(new Error('File ownership or readability requires review.'), { code: issue.endsWith('-unverified') ? 'E_METADATA_UNSUPPORTED' : 'E_PROTECTED_METADATA', path, metadataTargetVerified: true, metadataReason: issue });
  };
  for (const change of plan.changes) assertNoSharedLinks(change.path, stat(safePath(target, change.path)));
  for (const change of plan.changes) assertFileOwner(change.path, stat(safePath(target, change.path)));
  if (process.platform === 'win32') {
    checkWindowsFileChanges(plan.changes.filter(item => item.action !== 'create').map(item => ({
      path: safePath(target, item.path), displayPath: item.path, update: item.action === 'update',
    })));
  }
  // Guard actual project files; private staging is not evidence of their metadata.
  if (process.platform === 'darwin' || process.platform === 'linux') {
    for (const change of plan.changes) {
      const info = stat(safePath(target, change.path));
      // Linux may hide inaccessible xattrs or lack getfattr. Only positive
      // detection is conclusive; absence of a finding is not a safety proof.
      if (info?.isFile() && process.platform === 'linux' && inspectLinuxXattr(safePath(target, change.path)) === 'present'
        && (change.action !== 'update' || !nativeMetadataCopySupported || plan.xattrUnverified?.includes(change.path))) {
        throw Object.assign(new Error('Extended attributes require review.'), { code: 'E_PROTECTED_METADATA', path: change.path, metadataTargetVerified: true, metadataReason: 'xattr-present' });
      }
      if (info?.isFile() && process.platform === 'darwin') {
        const protection = inspectMacWriteProtection(safePath(target, change.path));
        if (protection !== 'clear') {
          const code = protection === 'protected' ? 'E_PROTECTED_METADATA' : 'E_METADATA_UNSUPPORTED';
          throw Object.assign(new Error('File metadata prevents a safe update.'), { code, path: change.path, metadataTargetVerified: true, metadataReason: protection === 'protected' ? 'acl-deny' : 'acl-unverified' });
        }
        const acl = inspectMacAcl(safePath(target, change.path));
        if (acl !== 'empty' && !(change.action === 'update' && nativeMetadataCopySupported && acl === 'present')) {
          const code = acl === 'present' ? 'E_PROTECTED_METADATA' : 'E_METADATA_UNSUPPORTED';
          throw Object.assign(new Error('ACL requires review.'), { code, path: change.path, metadataTargetVerified: true, metadataReason: acl === 'present' ? 'acl-present' : 'acl-unverified' });
        }
        const result = inspectMacXattr(safePath(target, change.path));
        if (result !== 'empty' && !(change.action === 'update' && nativeMetadataCopySupported && result === 'present')) {
          const code = result === 'present' ? 'E_PROTECTED_METADATA' : 'E_METADATA_UNSUPPORTED';
          throw Object.assign(new Error('Extended attributes require review.'), { code, path: change.path, metadataTargetVerified: true, metadataReason: result === 'present' ? 'xattr-present' : 'xattr-unverified' });
        }
      }
      if (info?.isFile() && (info.mode & 0o7000)) {
        throw Object.assign(new Error('Existing file has special POSIX mode bits; preserved for review.'), {
          code: 'E_PROTECTED_METADATA', path: change.path, metadataTargetVerified: true,
        });
      }
    }
  }
  const beforeStats = new Map(plan.changes.map(change => {
    const info = stat(safePath(target, change.path));
    return [change.path, info];
  }));
  const beforeModes = new Map([...beforeStats].map(([path, info]) => [path, info ? info.mode & 0o777 : undefined]));
  for (const change of plan.changes) if ((before.get(change.path) ? hash(before.get(change.path)) : null) !== change.beforeHash) fail('E_CHANGED', `File changed after planning: ${change.path}`);
  // Plans produced by planInstallation use arrays. Restrict external plans
  // to reusable collections whose contents can be compared before backup.
  const retired = plan.retiredRoots;
  if (retired && !Array.isArray(retired) && !(retired instanceof Set)) fail('E_PLAN', 'Directory pruning roots must be an array or Set.');
  // Conditional candidates only: actual pruning still checks each directory
  // when reached. This does not describe all filesystem effects or backup.
  const pruneCandidates = derivePruneCandidates(plan);
  const pruneSnapshot = JSON.stringify(pruneCandidates);
  const assertPrunePlanUnchanged = () => {
    if (JSON.stringify(derivePruneCandidates(plan)) !== pruneSnapshot) fail('E_CHANGED', 'Directory pruning plan changed during application.');
  };
  const directories = [
    ...pruneCandidates.chains.flat().map(path => ({ path, action: 'remove' })),
    ...pruneCandidates.retiredRoots.filter(path => stat(safePath(target, path))?.isDirectory()).map(path => ({ path, action: 'remove' })),
    ...(plan.migration?.directories ?? []).flatMap(({ path }) => [
      { path, action: 'remove' }, { path: path.replace(/^\.pbai4devs\/estado/, '.pbai4devs/state'), action: 'retain' },
    ]),
  ];
  if (!plannedActions.length && !directories.length) {
    const ignored = applyLocalIgnore(plan.localIgnore);
    return { changed: false, backup: null, localIgnorePending: ignored.pending };
  }
  const entries = buildRecoveryEntries(target, plannedActions.map(([path, action]) => ({
    path, action, before: before.get(path) === null ? null : { data: before.get(path), mode: beforeModes.get(path) },
  })), directories);
  const transaction = startProjectRecovery(target, entries);
  let backup = null;
  const attemptedPaths = new Set();
  try {
    for (const [path, action] of plannedActions) {
      if (action === 'update') assertRecoveryStageVolume(transaction, safePath(target, path), path);
    }
    const copies = [...before].filter(([, content]) => content !== null);
    if (copies.length) {
      assertNoNestedGit(target, [backupParent]);
      let ancestor = '';
      for (const component of backupParent.split('/')) {
        ancestor = ancestor ? `${ancestor}/${component}` : component;
        const directory = safePath(target, ancestor);
        try { mkdirSync(directory, { mode: 0o700 }); }
        catch (error) {
          if (error.code !== 'EEXIST') throw error;
          const existing = lstatSync(safePath(target, ancestor));
          if (!existing.isDirectory() || existing.isSymbolicLink()) throw error;
        }
      }
      const directory = process.platform === 'win32'
        ? join(safePath(target, backupParent), randomUUID())
        : mkdtempSync(join(safePath(target, backupParent), `${Date.now()}-`));
      if (process.platform === 'win32') createPrivateRecoveryDirectory(directory);
      backup = portable(relative(target, directory));
      try {
        const info = lstatSync(safePath(target, backup));
        if (!info.isDirectory() || info.isSymbolicLink() || process.platform !== 'win32' && (info.mode & 0o077)) {
          fail('E_BACKUP', 'The new backup directory could not be verified as private.');
        }
        if (process.platform === 'darwin' && inspectMacDirectoryAcl(safePath(target, backup)) !== 'empty') fail('E_BACKUP', 'The new backup directory ACL could not be verified as private.');
        for (const [path, content] of copies) {
          const backupFile = `${backup}/${path}`;
          assertNoNestedGit(target, [backupFile]);
          const destination = safePath(target, backupFile), mode = beforeModes.get(path);
          mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
          assertNoNestedGit(target, [backupFile]);
          writeFileSync(destination, Buffer.alloc(0), { flag: 'wx', mode: nativeMetadataCopySupported ? 0o600 : mode });
          const destinationIdentity = lstatSync(destination, { bigint: true });
          if (nativeMetadataCopySupported) {
            try { copyFileWithNativeMetadata(safePath(target, path), destination, { destinationIdentity, expectedBytes: content }); }
            catch (error) {
              let contentStillMatches = false;
              try {
                const current = lstatSync(safePath(target, path), { bigint: true });
                contentStillMatches = current.isFile() && !current.isSymbolicLink() && read(target, path)?.equals(content) === true;
              } catch { /* An unreadable or replaced source is a concurrent change. */ }
              if (!contentStillMatches) fail('E_CHANGED', `File changed while creating its backup: ${path}`);
              throw error;
            }
          }
          else {
            writeFileSync(destination, content);
            chmodSync(destination, mode);
          }
        }
      } catch (error) { throw withUncertainPath(error, backup); }
    }
    assertStageDependencies();
    const assertOriginal = path => {
      const file = safePath(target, path), info = stat(file), bytes = before.get(path);
      assertNoSharedLinks(path, info);
      assertFileOwner(path, info);
      assertLinuxXattrsUnchanged(file, beforeStats.get(path), info, path);
      if (bytes === null ? info !== null : !info?.isFile() || !readFileSync(file).equals(bytes) || (info.mode & 0o777) !== beforeModes.get(path)) fail('E_CHANGED', `File changed before writing: ${path}`);
    };
    assertActionsUnchanged();
    assertStaticContents('E_CHANGED');
    assertPrunePlanUnchanged();
    assertMigrationDirectories();
    for (const change of plan.changes) assertOriginal(change.path);
    for (let index = 0; index < plannedActions.length; index++) {
      if (!Array.isArray(plan.changes) || plan.changes.length !== plannedActions.length) fail('E_CHANGED', 'The installation actions changed during application.');
      const change = plan.changes[index], [path, action] = plannedActions[index];
      if (!change || change.path !== path || change.action !== action) fail('E_CHANGED', 'The installation actions changed during application.');
      assertNoNestedGit(target, [path]);
      assertOriginal(path);
      const file = safePath(target, path);
      // Publish the same private bytes that passed the staged-block check.
      const content = approvedStagedContents.get(path) ?? change.content;
      assertActionContent(action, content, 'E_CHANGED');
      attemptedPaths.add(path);
      if (action === 'remove') {
        const migrated = plan.migration?.files.find(item => item.path === path);
        if (migrated) {
          const copy = plan.changes.find(candidate => candidate.path === migrated.target && candidate.action === 'create');
          const copied = read(target, migrated.target);
          if (!copy?.content || !copied?.equals(copy.content)
            || migrated.path !== legacyStatePath && !copied.equals(before.get(path))) {
            fail('E_CHANGED', `Migrated copy changed before removing: ${path}`);
          }
        }
        if (process.platform === 'linux' && stat(safePath(target, path))?.isFile() && inspectLinuxXattr(safePath(target, path)) === 'present') {
          throw Object.assign(new Error('Extended attributes require review.'), { code: 'E_PROTECTED_METADATA', path, metadataTargetVerified: true, metadataReason: 'xattr-present' });
        }
        rmSync(file);
      }
      else {
        publishPlannedFile(target, transaction.stage, path, content, beforeModes.get(path) ?? change.mode,
          () => assertOriginal(path), before.get(path));
      }
    }
    if (plan.migration) {
      for (const directory of plan.migration.directories) {
        const destination = directory.path.replace(/^\.pbai4devs\/estado/, '.pbai4devs/state');
        assertNoNestedGit(target, [directory.path, destination]);
        const file = safePath(target, destination), existing = stat(file);
        if (existing && !existing.isDirectory()) fail('E_CHANGED', `Invalid state destination: ${destination}`);
        attemptedPaths.add(destination);
        if (!existing) mkdirSync(file, { recursive: true, mode: directory.mode });
        chmodSync(file, directory.mode);
      }
      for (const directory of [...plan.migration.directories].sort((a, b) => b.path.length - a.path.length)) {
        assertNoNestedGit(target, [directory.path]);
        const file = safePath(target, directory.path), info = stat(file);
        if (!info?.isDirectory() || readdirSync(file).length) fail('E_CHANGED', `State directory changed during migration: ${directory.path}`);
        assertMigrationDirectoryMetadata(target, directory.path, info);
        if ((info.mode & 0o777) !== directory.mode) fail('E_CHANGED', `State directory mode changed during migration: ${directory.path}`);
        attemptedPaths.add(directory.path);
        rmdirSync(file);
      }
    }
    assertFallbackChecks();
    assertPrunePlanUnchanged();
    pruneRemovedDirectories(plan, pruneCandidates, assertPrunePlanUnchanged, path => attemptedPaths.add(path));
    const changesFallback = plan.changes.some(change => change.path === '.gitignore');
    const ignored = applyLocalIgnore(changesFallback ? planLocalIgnore(target, { outputs: plan.ownedOutputs }) : plan.localIgnore);
    completeProjectRecovery(transaction);
    return { changed: Boolean(plan.changes.length || ignored.changed), backup, localIgnorePending: ignored.pending };
  } catch (cause) {
    let error = withPotentialPartial(cause);
    if (backup) error = withUncertainPath(error, backup);
    for (const path of attemptedPaths) error = withUncertainPath(error, path);
    error = withUncertainPath(error, transaction.backup);
    error.recovery = inspectProjectRecovery(target);
    const publication = cause?.operation ?? cause?.cause?.operation;
    if (publication) error.operation = publication;
    throw error;
  }
}

// Lexical candidates for normal pruning. A chain stops at the first
// directory that cannot be removed; the executor rechecks the live tree.
// Migration, creation, backup and rollback effects are not included.
export function derivePruneCandidates(plan) {
  const legacy = '.pbai4devs/adapters/README.md';
  const removed = plan.changes.filter(change => change.action === 'remove' && (allowedManaged(change.path) || change.path === legacy));
  const parents = new Set(removed.map(change => portable(dirname(change.path))));
  if (removed.some(change => change.path === legacy)) {
    parents.add('.pbai4devs/adapters/antigravity');
    parents.add('.pbai4devs/adapters/antigravity/agents');
  }
  const chains = [];
  for (let parent of [...parents].sort((left, right) => right.length - left.length)) {
    const boundary = parent.startsWith('.pbai4devs/') ? '.pbai4devs' : adapterRoots.find(root => parent.startsWith(`${root}/`));
    const chain = [];
    while (boundary && parent.startsWith(`${boundary}/`)) {
      chain.push(parent);
      parent = portable(dirname(parent));
    }
    if (chain.length) chains.push(chain);
  }
  return { chains, retiredRoots: [...(plan.retiredRoots || [])].filter(root => adapterRoots.includes(root)) };
}

function pruneRemovedDirectories(plan, candidates, validateCandidates, onRemove) {
  const { target } = plan;
  for (const chain of candidates.chains) {
    for (const parent of chain) {
      const directory = safePath(target, parent);
      const info = stat(directory);
      if (!info?.isDirectory() || readdirSync(directory).length) break;
      onRemove(parent);
      try { rmdirSync(directory); }
      catch (error) { if (['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) break; throw error; }
    }
  }
  for (const root of candidates.retiredRoots) {
    validateCandidates();
    const directory = safePath(target, root);
    const info = stat(directory);
    if (!info?.isDirectory()) continue;
    try {
      if (readdirSync(directory).length === 0) {
        onRemove(root);
        rmdirSync(directory);
      }
    }
    catch (error) { if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error; }
  }
}

function unverifiedRemovalIssues(state, derived) {
  return Object.keys(derived.removedFiles).filter(path => !Object.hasOwn(state.files, path))
    .sort().map(path => ({ code: 'removed-file-unverified', path }));
}

// Read the removal history before planning, so a later planning failure does
// not hide an already observed inconsistency. This does not authorize writes.
export function inspectRemovalHistory(target) {
  const state = loadState(target);
  return state ? unverifiedRemovalIssues(state, readDerivedState(target)) : [];
}

export function inspect(target) {
  const state = loadState(target);
  if (!state) return { installed: false, issues: [{ code: 'missing', path: statePath }] };
  const derived = readDerivedState(target);
  // An orphaned removal record can be legitimate history, but the current
  // installation state cannot corroborate it. Do not silently report it clean.
  const issues = unverifiedRemovalIssues(state, derived);
  for (const [path, digest] of Object.entries(state.files)) {
    if (derived.blocks[path] || derived.removedBlocks.includes(path)) continue;
    const content = read(target, path);
    if (derived.removedFiles[path] === digest && !derived.files[path] && !derived.entries[path]) {
      if (content) issues.push({ code: 'modified', path });
      continue;
    }
    if (!content || hash(content) !== digest && hash(content) !== derived.outputs[path] && hash(content) !== derived.files[path] && hash(content) !== derived.entries[path] && hash(content) !== derived.catalogs[path] && !(path === '.pbai4devs/espelhos.conf' && hash(content) === derived.config)) issues.push({ code: content ? 'modified' : 'missing', path });
  }
  for (const [path, digest] of Object.entries({ ...state.blocks, ...derived.blocks })) {
    if (derived.removedBlocks.includes(path) && !Object.hasOwn(derived.blocks, path)) continue;
    const content = read(target, path);
    if (content && [derived.entries[path], derived.files[path]].some(value => value && hash(content) === value)) continue;
    if (!content || blockDigest(path, content) !== digest) issues.push({ code: content ? 'modified' : 'missing', path });
  }
  return { installed: true, version: state.version, language: state.language, issues };
}
