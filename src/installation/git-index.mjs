import { realpathSync, closeSync, existsSync, fstatSync, openSync, readFileSync, readSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { safeGitEnvironment, gitOutputLines, gitPathsOverlap } from '../../.pbai4devs/scripts/lib/git-environment.mjs';
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, relative, resolve, sep, join } from 'node:path';
import { indexContentMatches, noGitRepository } from '../../.pbai4devs/scripts/lib/gitignore.mjs';
import { portable, fail, stat, safePath } from './filesystem.mjs';

const canonicalExisting = path => {
  if (typeof realpathSync.native === 'function') {
    try { return realpathSync.native(path); }
    catch (error) { if (!['ENOSYS', 'ENOTSUP', 'EINVAL'].includes(error.code)) throw error; }
  }
  return realpathSync(path);
};

// Protect staged human bytes that differ from the working tree, without
// treating an unchanged HEAD entry as a staged edit or rewriting the index.
export function stagedDivergences(root) {
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
export function stagedContains(root, paths, path) {
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
