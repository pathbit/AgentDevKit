import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function sameDistributionInputs(root, approved, current) {
  if (![approved, current].every(sha => typeof sha === 'string' && /^[a-f0-9]{40}$/.test(sha))) return false;
  const git = (...args) => spawnSync('git', args, { cwd: root, stdio: 'ignore' }).status;
  if (git('merge-base', '--is-ancestor', approved, current) !== 0) return false;
  const paths = readFileSync(join(root, '.github/distribution-paths'), 'utf8').trim().split(/\r?\n/);
  if (paths.some(path => !path)) throw new Error('The distribution input list is invalid.');
  return git('diff', '--quiet', '--no-renames', approved, current, '--', '.github/distribution-paths', ...paths) === 0;
}
