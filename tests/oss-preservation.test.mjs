import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkOriginals, fileSnapshot, hash } from './oss-compatibility.mjs';

test('verificação OSS rejeita substituição de link por arquivo com bloco', { skip: process.platform === 'win32' }, t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-oss-link-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const path = join(root, 'CLAUDE.md');
  symlinkSync('human.md', path);
  const original = fileSnapshot(root, 'CLAUDE.md');
  assert.equal(original.kind, 'symlink');
  const git = () => '';
  const baseline = { files: { 'CLAUDE.md': original }, git: { head: '', index: '', stagedDiff: '', remotes: '', configSha256: hash('') } };
  mkdirSync(join(root, '.git')); writeFileSync(join(root, '.git/config'), '');
  unlinkSync(path);
  const block = '<!-- BEGIN AGENTDEVKIT -->\n@AGENTS.md\n<!-- END AGENTDEVKIT -->';
  writeFileSync(path, `human.md\n\n${block}\n`); chmodSync(path, original.mode);
  assert.equal(fileSnapshot(root, 'CLAUDE.md').kind, 'file');
  mkdirSync(join(root, '.pbai4devs/state'), { recursive: true });
  writeFileSync(join(root, '.pbai4devs/state/agentdevkit.json'), JSON.stringify({ blocks: { 'CLAUDE.md': hash(block) } }));
  assert.throws(() => checkOriginals(root, baseline, git), /Tipo do arquivo original alterado/);
});
