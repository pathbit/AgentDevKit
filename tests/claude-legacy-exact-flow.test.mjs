import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const kit = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wrapper = '.claude/rules/ambiente-local/RULE.md';
const source = '.pbai4devs/rules/ambiente-local/RULE.md';

test('CLI e sync preservam referência legada e sinalizam escopo não verificado', { timeout: 180000 }, t => {
  const base = mkdtempSync(join(tmpdir(), 'adk-legacy-exact-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'project'); mkdirSync(root);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
  const gitConfig = join(base, 'gitconfig'), globalExclude = join(base, 'empty-exclude');
  writeFileSync(globalExclude, '');
  writeFileSync(gitConfig, `[core]\n\texcludesFile = ${JSON.stringify(globalExclude)}\n\tfsmonitor = false\n`);
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: gitConfig, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' });
  const run = (bin, args) => spawnSync(bin, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  const git = (...args) => { const r = run('git', args); assert.equal(r.status, 0, r.stderr); };
  git('init', '-q');
  const config = run('git', ['config', '--show-origin', '--get', 'core.excludesFile']);
  assert.equal(config.status, 0, config.stderr);
  const [origin, value] = config.stdout.trimEnd().split('\t');
  const portable = path => path.replaceAll('\\', '/');
  assert.equal(portable(origin), `file:${portable(gitConfig)}`);
  assert.equal(portable(value), portable(globalExclude));
  writeFileSync(join(root, '.gitignore'), '*\n!SENTINELA.txt\n'); writeFileSync(join(root, 'SENTINELA.txt'), 'staged\n'); git('add', '-f', '--', '.gitignore', 'SENTINELA.txt'); appendFileSync(join(root, 'SENTINELA.txt'), 'unstaged\n');
  const sourceBytes = readFileSync(join(kit, source)), text = sourceBytes.toString('utf8'); const head = text.match(/^---\ntrigger: always_on\ndescription: ([\p{L}][\p{L}\p{N} .,-]*)\n---\n/u)?.[0]; const title = text.match(/^# [^\r\n]+$/m)?.[0]; assert(head && title);
  const old = Buffer.from(`${head}\n${title}\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/rules/ambiente-local/RULE.md).\n`);
  for (const [p, bytes] of [[source, sourceBytes], [wrapper, old]]) { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), bytes); }
  const watched = [source, wrapper, '.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'SENTINELA.txt'];
  const hash = p => existsSync(join(root, p)) ? createHash('sha256').update(readFileSync(join(root, p))).digest('hex') : null;
  const snapshot = () => Object.fromEntries(watched.map(p => [p, hash(p)])); const initial = snapshot();
  const cli = (...args) => { const r = run(process.execPath, [join(kit, 'bin/agentdevkit.mjs'), ...args, '--target', root, '--json']); let data; try { data = JSON.parse(r.stdout); } catch { throw new Error(`CLI: ${r.status} ${r.stderr}`); } return { status: r.status, data }; };
  const init = cli('init', '--agents', 'claude'); assert.equal(init.status, 0); assert(init.data.retainedClaudeRules.includes(wrapper)); assert.deepEqual(snapshot(), initial);
  const state = '.pbai4devs/state/agentdevkit.json', derived = '.pbai4devs/state/derived.json';
  const noOwnership = () => { for (const p of [state, derived]) if (existsSync(join(root, p))) { const d = JSON.parse(readFileSync(join(root, p), 'utf8')); for (const k of ['files', 'blocks', 'entries', 'outputs']) assert(!Object.hasOwn(d[k] || {}, wrapper)); } };
  noOwnership();
  for (const args of [['doctor'], ['sync', '--check'], ['sync', '--check', '--force']]) { const before = [hash(state), hash(derived)]; const result = cli(...args); assert.equal(result.status, 1); assert.equal(result.data.ok, false); assert(result.data.retainedClaudeRules.includes(wrapper)); assert.deepEqual([hash(state), hash(derived)], before); assert.deepEqual(snapshot(), initial); noOwnership(); }
  for (const args of [['sync'], ['update']]) { const result = cli(...args); assert.equal(result.status, 0); assert(result.data.retainedClaudeRules.includes(wrapper)); assert.deepEqual(snapshot(), initial); noOwnership(); }
  const direct = run(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--check']); assert.equal(direct.status, 1); assert.match(direct.stdout, /Escopo Claude nao verificado/); assert.deepEqual(snapshot(), initial); noOwnership();
  const legacyText = old.toString('utf8');
  const variants = [legacyText.replace('description:', 'paths: ["src/**"]\ndescription:'), legacyText.replace('trigger: always_on', 'trigger: always_on\ntrigger: always_on'), legacyText.replace('rules/ambiente-local/RULE.md', 'rules/outra/RULE.md'), legacyText.replace('Estrutura mínima', 'Estrutura diferente')];
  try {
    for (const value of variants) {
      writeFileSync(join(root, wrapper), value); const before = snapshot(), states = [hash(state), hash(derived)];
      const result = cli('sync', '--check', '--force'); assert.equal(result.status, 1); assert(result.data.conflicts.includes(wrapper));
      const check = run(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--check', '--force']); assert.equal(check.status, 1); assert(check.stdout.includes(wrapper), `stdout=${check.stdout} stderr=${check.stderr}`);
      assert.deepEqual(snapshot(), before); assert.deepEqual([hash(state), hash(derived)], states); noOwnership();
    }
  } finally { writeFileSync(join(root, wrapper), old); }
  assert.deepEqual(snapshot(), initial);
  git('add', '-f', '--', wrapper); appendFileSync(join(root, wrapper), '\nEdição humana sintética.\n'); const staged = snapshot(), before = [hash(state), hash(derived)];
  const conflict = cli('sync', '--check', '--force'); assert.equal(conflict.status, 1); assert(conflict.data.conflicts.includes(wrapper)); assert.deepEqual(snapshot(), staged); assert.deepEqual([hash(state), hash(derived)], before); noOwnership();
});
