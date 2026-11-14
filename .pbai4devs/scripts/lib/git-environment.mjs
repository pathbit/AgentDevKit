import { lstatSync } from 'node:fs';
import { join } from 'node:path';

// Git location overrides and external diff hooks may redirect inspection away
// from the requested project. Environment keys are case-insensitive on Windows.
export function safeGitEnvironment(source = process.env) {
  const env = {};
  const blocked = /^(?:GIT_DIR|GIT_WORK_TREE|GIT_COMMON_DIR|GIT_INDEX_FILE|GIT_EXTERNAL_DIFF|GIT_OPTIONAL_LOCKS)$/i;
  for (const [key, value] of Object.entries(source)) if (!blocked.test(key)) env[key] = value;
  env.GIT_OPTIONAL_LOCKS = '0';
  return env;
}

export function assertUnredirectedGitEnvironment(source = process.env) {
  const redirected = Object.keys(source).filter(key => /^(?:GIT_DIR|GIT_WORK_TREE|GIT_COMMON_DIR|GIT_INDEX_FILE)$/i.test(key) && source[key]);
  if (redirected.length) throw Object.assign(new Error(`Git redirecionado por ${redirected.join(', ')}; operação recusada para preservar o índice e os arquivos.`), { code: 'E_GIT_ENV' });
}

// Do not trim: spaces (and on Unix even a trailing CR) can belong to a path.
export function gitOutputLines(output, platform = process.platform) {
  const text = output.endsWith('\n') ? output.slice(0, -1) : output;
  return text.split('\n').map(line => platform === 'win32' && line.endsWith('\r') ? line.slice(0, -1) : line);
}

// Keys accelerate the ordinary case but do not implement Unicode case folding.
export const gitPathKey = path => path.normalize('NFKC').toUpperCase().toLowerCase().normalize('NFKC');
export const ordinaryGitComponent = part => /^[a-z0-9_.-]+$/i.test(part) && !part.endsWith('.');
export const possibleWindowsShortName = part => /^[^\\/:*?"<>|. ]{1,8}(?:\.[^\\/:*?"<>|. ]{1,3})?$/u.test(part);
function componentsMayAlias(left, right, platform) {
  const normalize = part => {
    const value = part.normalize('NFD').toLowerCase();
    return platform === 'win32' ? value.replace(/[. ]+$/, '') : value;
  };
  const a = normalize(left), b = normalize(right);
  if (a === b) return true;
  // A mismatch before any uncertain Unicode character proves different names.
  const safe = char => /^[a-z0-9_.~-]$/.test(char);
  for (let i = 0; i < Math.min(a.length, b.length) && safe(a[i]) && safe(b[i]); i++) if (a[i] !== b[i]) return false;
  for (let i = 1; i <= Math.min(a.length, b.length) && safe(a.at(-i)) && safe(b.at(-i)); i++) if (a.at(-i) !== b.at(-i)) return false;
  return !(ordinaryGitComponent(a) && ordinaryGitComponent(b));
}
export function gitPathsOverlap(left, right, { root, platform = process.platform, identity, allowMissingTarget = false } = {}) {
  const a = left.split('/'), b = right.split('/');
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].normalize('NFD').toLowerCase() === b[i].normalize('NFD').toLowerCase()) continue;
    // NTFS stream syntax can address the default stream through another name.
    if (platform === 'win32' && (a[i].includes(':') || b[i].includes(':'))) continue;
    if (platform === 'win32' && (possibleWindowsShortName(a[i]) || possibleWindowsShortName(b[i]))) {
      let distinct = false;
      try {
        if (identity) distinct = identity(a.slice(0, i + 1), b.slice(0, i + 1)) === 'distinct';
        else if (root) {
          const resolveIdentity = parts => {
            let current = root, value;
            for (const [index, part] of parts.entries()) {
              current = join(current, part);
              try { value = lstatSync(current, { bigint: true }); }
              catch (error) { if (error.code === 'ENOENT') return { missing: true }; throw error; }
              if (value.isSymbolicLink() && index < parts.length - 1) return null;
            }
            return value;
          };
          const leftStat = resolveIdentity(a.slice(0, i + 1)), rightStat = resolveIdentity(b.slice(0, i + 1));
          if (leftStat?.ino && rightStat?.ino && !leftStat.isSymbolicLink() && !rightStat.isSymbolicLink())
            distinct = leftStat.dev !== rightStat.dev || leftStat.ino !== rightStat.ino;
          // An absent child of the same existing parent cannot be another
          // spelling of the existing child, including when it is a directory.
          // This applies in either direction and can use a final symbolic link
          // as evidence of an existing directory entry without following it.
          const leftExists = leftStat?.ino && (!leftStat.isSymbolicLink() || i === a.length - 1);
          const rightExists = rightStat?.ino && (!rightStat.isSymbolicLink() || i === b.length - 1);
          if (!distinct && allowMissingTarget && (leftExists && rightStat?.missing || leftStat?.missing && rightExists)) {
            const leftParent = i ? resolveIdentity(a.slice(0, i)) : lstatSync(root, { bigint: true });
            const rightParent = i ? resolveIdentity(b.slice(0, i)) : leftParent;
            if (leftParent?.ino && rightParent?.ino && !leftParent.isSymbolicLink() && !rightParent.isSymbolicLink())
              distinct = leftParent.dev === rightParent.dev && leftParent.ino === rightParent.ino;
          }
        }
      } catch { /* Missing, inaccessible, or unsupported identities stay ambiguous. */ }
      if (distinct) return false;
      continue;
    }
    if (!componentsMayAlias(a[i], b[i], platform)) return false;
  }
  return true;
}
