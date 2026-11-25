import { createHash } from 'node:crypto';
import { sep, join, relative, dirname, resolve, isAbsolute, parse } from 'node:path';
import { types as utilTypes } from 'node:util';
import { lstatSync, realpathSync, existsSync, readdirSync, chmodSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { nativePathBoundary } from '../../.pbai4devs/scripts/lib/native-paths.mjs';
import { isGeneratedOutput } from '../../.pbai4devs/scripts/lib/gitignore.mjs';

export const hash = value => createHash('sha256').update(value).digest('hex');
export const sameBytes = (left, right) => left === null ? right === null : Boolean(right && left.equals(right));

export const portable = value => value.split(sep).join('/');

export const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };

const missingCode = (error, accepted) => { try { if (utilTypes.isProxy(error)) return false; const d = Object.getOwnPropertyDescriptor(error, 'code'); return Boolean(d && 'value' in d && accepted.includes(d.value)); } catch { return false; } };

export const stat = (path, ...options) => { try { return lstatSync(path, ...options); } catch (error) { if (missingCode(error, ['ENOENT'])) return null; throw error; } };

export const ignored = new Set(['.git', '.local', '.cache', 'node_modules', '.agent-tests', 'opencode-loop']);

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

function targetLayout(target) {
  const root = parse(target).root;
  const parts = relative(root, target).split(sep).filter(Boolean);
  let ancestor = root, info = stat(root, { bigint: true });
  if (!info?.isDirectory()) fail('E_TARGET', 'Target must be a real directory, without a symbolic link.');
  for (const [index, part] of parts.entries()) {
    const path = join(ancestor, part);
    const child = stat(path, { bigint: true });
    if (!child) return { ancestor, info, missing: parts.slice(index) };
    if (!child.isDirectory()) fail('E_TARGET', 'Target must be a real directory, without a symbolic link.');
    ancestor = path;
    info = child;
  }
  return { ancestor, info, missing: [] };
}

export function resolveTarget(input, cwd = process.cwd()) {
  const target = resolve(cwd, input || '.');
  checkTarget(target);
  const { ancestor, missing } = targetLayout(normalizeSystemTemporaryAlias(target));
  const canonical = join(realpathSync(ancestor), ...missing);
  checkTarget(canonical);
  return canonical;
}

export function targetIdentity(target) {
  const { ancestor, info } = targetLayout(normalizeSystemTemporaryAlias(resolve(target)));
  return { ancestor, device: info.dev.toString(), inode: info.ino.toString() };
}

export function assertTargetUnchanged(target, expected) {
  if (!expected) return;
  let current;
  try { current = targetIdentity(target); }
  catch (error) {
    if (error.code !== 'E_TARGET') throw error;
  }
  if (!current || current.ancestor !== expected.ancestor || current.device !== expected.device || current.inode !== expected.inode) {
    fail('E_CHANGED', 'The target directory changed; review and create a new plan.');
  }
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
export function nativeOutputBoundary(root, path, ownedPaths) {
  let boundary = nativePathBoundary(root, path, ownedPaths, { preserveRootAliases: true });
  if (!boundary) {
    const info = stat(safePath(root, path));
    if (info && !info.isFile()) boundary = { path, reason: 'non-file' };
  }
  if (!boundary) return { blocked: false };
  const info = lstatSync(join(root, ...boundary.path.split('/')));
  return { blocked: true, ...boundary, identity: [info.dev, info.ino, info.mode, info.size, info.mtimeMs, info.ctimeMs] };
}

export function resourceAllowed(path, directory = false) {
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

export function walk(root, path = '', filter = () => true) {
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

export function write(root, path, content, mode) {
  const target = safePath(root, path); mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, mode === undefined ? undefined : { mode });
  if (mode !== undefined) chmodSync(target, mode);
}

export function read(root, path) {
  const file = safePath(root, path), info = stat(file);
  if (!info) return null;
  if (!info.isFile()) fail('E_PATH', `Expected a file: ${path}`);
  return readFileSync(file);
}

export function copyResources(source, destination) {
  const files = walk(source, '', resourceAllowed);
  for (const path of files) write(destination, path, readFileSync(join(source, path)));
  return files;
}
