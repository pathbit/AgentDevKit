import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../src/cli.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function fixture(t) {
  mkdirSync(join(repository, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(repository, '.agent-tests/managed-content-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result.stdout;
  };
  git('init', '--quiet');
  const put = (path, content) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), content); };
  const read = path => readFileSync(join(root, path), 'utf8');
  return { root, git, put, read };
}
export async function cli(root, args, expected = 0) {
  let output = '';
  assert.equal(await main([...args, '--target', root, '--json'], { stdout: { write: value => { output += value; } } }), expected, output);
  const result = JSON.parse(output); assert.equal(result.ok, expected === 0, output); return result;
}
