#!/usr/bin/env node
// Integration probe for an unpacked AgentDevKit package in an isolated runtime.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const packageRoot = process.env.ADK_PACKAGE_ROOT;
if (!packageRoot || !isAbsolute(packageRoot)) throw Error('ADK_PACKAGE_ROOT deve apontar para um pacote local absoluto.');
const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
assert.equal(pkg.name, '@pathbit/agentdevkit');
const root = mkdtempSync(join(tmpdir(), 'agentdevkit-container-'));
const target = join(root, 'project'), xdg = join(root, 'xdg');
mkdirSync(target); mkdirSync(xdg);
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^git_|^node_options$|^npm_config_/i.test(key)));
Object.assign(env, { GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0', XDG_CONFIG_HOME: xdg });
const run = (file, args) => {
  const result = spawnSync(file, args, { cwd: target, env, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
  assert.ifError(result.error); assert.equal(result.signal, null);
  assert.equal(result.status, 0, `${file} ${args[0]} falhou: ${result.stderr || result.stdout}`);
  return result.stdout;
};
const git = (...args) => run('git', ['-C', target, '-c', 'core.fsmonitor=false', ...args]);
const cli = (...args) => {
  const result = JSON.parse(run(process.execPath, [join(packageRoot, 'bin/agentdevkit.mjs'), ...args, '--target', target, '--json']));
  assert.equal(result.ok, true); assert.equal(result.version, pkg.version); return result;
};
const put = (path, text) => { const file = join(target, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };
const snapshot = path => {
  let parent = target;
  for (const component of path.split('/').slice(0, -1)) {
    parent = join(parent, component); let ancestor;
    try { ancestor = lstatSync(parent); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    assert.ok(ancestor.isDirectory() && !ancestor.isSymbolicLink(), `Ancestral inseguro: ${path}`);
  }
  const file = join(target, path); let item;
  try { item = lstatSync(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const mode = item.mode & 0o777;
  if (item.isSymbolicLink()) return { type: 'link', mode, target: readlinkSync(file) };
  if (item.isFile()) return { type: 'file', mode, bytes: readFileSync(file) };
  return { type: item.isDirectory() ? 'directory' : 'other', mode };
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const human = '# Instruções humanas\n\nPreservar esta instrução sintética.\n';
const ignore = '# Regras próprias\n/build/\n';
const staged = '{"team":"staged"}\n', working = '{"team":"working"}\n';
const skill = '---\nname: own-skill\ndescription: Fixture humana.\n---\n\n# Skill própria\n';
const readme = '# Projeto existente\n\nConteúdo sintético.\n';
try {
  git('init', '--quiet', '--template=');
  put('AGENTS.md', human); put('.gitignore', ignore); put('README.md', readme);
  put('.claude/settings.json', staged); put('.claude/skills/own-skill/SKILL.md', skill);
  git('add', '--', 'AGENTS.md', '.gitignore', 'README.md', '.claude/settings.json', '.claude/skills/own-skill/SKILL.md');
  put('.claude/settings.json', working);
  const before = Object.fromEntries(['.git/HEAD', '.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'README.md', '.claude/settings.json', '.claude/skills/own-skill/SKILL.md'].map(path => [path, snapshot(path)]));
  const agentBefore = snapshot('AGENTS.md');
  const check = () => {
    for (const [path, expected] of Object.entries(before)) assert.deepEqual(snapshot(path), expected, `Arquivo alterado: ${path}`);
    const agentAfter = snapshot('AGENTS.md');
    assert.equal(agentAfter?.type, 'file'); assert.equal(agentAfter.mode, agentBefore.mode);
    const content = readFileSync(join(target, 'AGENTS.md'), 'utf8');
    assert.ok(content.startsWith(human), 'Instruções humanas foram alteradas.');
    const begin = '<!-- BEGIN AGENTDEVKIT -->', end = '<!-- END AGENTDEVKIT -->';
    const start = content.indexOf(begin), finish = content.indexOf(end, start + begin.length);
    assert.ok(start >= human.length && finish > start && content.indexOf(begin, start + begin.length) === -1);
    assert.match(content.slice(human.length, start), /^\n*$/);
    assert.match(content.slice(finish + end.length), /^\n?$/);
    const state = JSON.parse(readFileSync(join(target, '.pbai4devs/state/agentdevkit.json'), 'utf8'));
    assert.equal(state.blocks?.['AGENTS.md'], hash(Buffer.from(content.slice(start, finish + end.length))));
    assert.equal(state.version, pkg.version);
  };
  const steps = [];
  for (const args of [['init', '--agents', 'claude', '--yes'], ['doctor'], ['sync', '--check'], ['update', '--force', '--yes'], ['doctor'], ['sync', '--check']]) {
    cli(...args); check(); steps.push(args.join(' '));
  }
  console.log(JSON.stringify({ status: 'passed', packageVersion: pkg.version, runtime: process.version, steps, preservedExactly: Object.keys(before), extendedWithoutChangingOriginal: ['AGENTS.md'], limits: ['Projeto sintético único; snapshots não detectam mudanças revertidas no mesmo processo.', 'Não executa fluxos de skills ou agentes.', 'Não exercita falhas de recuperação nem Windows.'] }));
} finally {
  rmSync(resolve(root), { recursive: true, force: true });
}
