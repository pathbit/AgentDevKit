import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const bin = join(project, 'bin/agentdevkit.mjs');
export const statePath = '.pbai4devs/state/agentdevkit.json';
export function fixture(t) {
  mkdirSync(join(project, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(project, '.agent-tests/client-selection-'));
  assert.equal(spawnSync('git', ['init', '--quiet', root]).status, 0);
  t.after(() => rmSync(root, { recursive: true, force: true })); return root;
}
export const read = (root, path) => readFileSync(join(root, path), 'utf8');
export const state = root => JSON.parse(read(root, statePath));
export function put(root, path, value) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), value); }
export function cli(root, args, status = 0) {
  const result = spawnSync(process.execPath, [bin, ...args, '--target', root, '--json'], { encoding: 'utf8', timeout: 180000 });
  assert.equal(result.status, status, `agentdevkit ${args.join(' ')}: ${result.error?.stack || ''}\nsignal: ${result.signal || 'none'}\n${result.stdout || ''}${result.stderr || ''}`); return JSON.parse(result.stdout);
}
