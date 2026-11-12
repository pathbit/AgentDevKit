import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../src/cli.mjs';
import { applyPlan, inspect, planInstallation } from '../src/install.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = content => createHash('sha256').update(content).digest('hex');
const put = (root, path, content) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); };

function fixture(t) {
  mkdirSync(join(repository, '.agent-tests'), { recursive: true });
  const directory = mkdtempSync(join(repository, '.agent-tests/coexistence-'));
  const root = join(directory, 'project'); mkdirSync(root);
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const git = (...args) => {
    const value = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    assert.equal(value.status, 0, value.stderr); return value.stdout;
  };
  git('init', '--quiet');
  return { root, directory, git };
}

function link(t, target, path, type = 'file') {
  mkdirSync(dirname(path), { recursive: true });
  try { symlinkSync(target, path, type); return true; }
  catch (error) {
    if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip('Symbolic links are unavailable.'); return false; }
    throw error;
  }
}

function snapshot(root, paths) {
  return Object.fromEntries(paths.map(path => {
    const file = join(root, path), info = lstatSync(file);
    return [path, { mode: info.mode & 0o777, ...(info.isSymbolicLink()
      ? { kind: 'symlink', target: readlinkSync(file) }
      : { kind: 'file', hash: hash(readFileSync(file)) }) }];
  }));
}

async function cli(root, args, expected = 0) {
  let stdout = '';
  const code = await main([...args, '--target', root, '--json'], { stdout: { write: value => { stdout += value; } } });
  const value = JSON.parse(stdout);
  assert.equal(code, expected, stdout);
  assert.equal(value.ok, expected === 0, stdout);
  return value;
}

test('instala e atualiza sobre agentes configurados preservando arquivos, links e índice', async t => {
  const { root, directory, git } = fixture(t);
  const files = {
    'AGENTS.md': '# Project rules\n\nKeep the existing workflow.\n',
    'packages/core/README.md': '# Existing package\n',
    '.claude/skills/triage/SKILL.md': '# Existing triage\n',
    '.claude/skills/triage/REFERENCE.md': '# Existing reference\n\nLeia [manual](https://example.com/manual).\n',
    '.claude/agents/revisor.md': '# Existing reviewer\n\nUse the project conventions.\n',
    '.claude/.gitignore': 'private-settings.json\n',
    '.github/agents/revisor.agent.md': '# Existing Copilot reviewer\n',
  };
  for (const [path, content] of Object.entries(files)) put(root, path, content);
  put(directory, 'outside/config.json', '{"existing":true}\n');
  if (!link(t, 'AGENTS.md', join(root, 'CLAUDE.md'))
    || !link(t, 'packages/core/README.md', join(root, 'README.md'))
    || !link(t, '../.claude/skills', join(root, '.codex/skills'), 'dir')
    || !link(t, '../../outside/config.json', join(root, '.claude/settings.local.json'))) return;
  const paths = [...Object.keys(files), 'CLAUDE.md', 'README.md', '.codex/skills', '.claude/settings.local.json'];
  git('add', '--all');
  const before = snapshot(root, paths), index = git('ls-files', '--stage', '-z'), staged = git('diff', '--cached', '--binary');
  const outside = readFileSync(join(directory, 'outside/config.json'));
  const args = ['init', '--yes', '--agents', 'codex,claude,copilot'];
  const preview = await cli(root, [...args, '--dry-run']);
  assert.ok(preview.preserved.some(item => item.path === 'CLAUDE.md' && item.reason === 'symbolic-link'));
  assert.equal(existsSync(join(root, '.pbai4devs')), false);
  assert.deepEqual(snapshot(root, paths), before);
  const installed = await cli(root, args);
  for (const path of ['CLAUDE.md', 'README.md', '.codex/skills', '.claude/agents/revisor.md', '.github/agents/revisor.agent.md', '.claude/.gitignore']) {
    assert.ok(installed.preserved.some(item => item.path === path), path);
  }
  assert.ok(existsSync(join(root, '.agents/skills/projeto/criar-skill/SKILL.md')), 'Codex retains its native skill path.');
  const state = JSON.parse(readFileSync(join(root, '.pbai4devs/estado/agentdevkit.json')));
  for (const path of [...Object.keys(state.files), ...Object.keys(state.blocks)]) {
    assert.ok(!paths.includes(path), `Human file claimed: ${path}`);
    assert.ok(!path.startsWith('.codex/skills/'), `Human link subtree claimed: ${path}`);
  }
  assert.ok((await cli(root, ['doctor'])).preserved.some(item => item.path === 'CLAUDE.md'));
  await cli(root, ['sync', '--check']);
  const stable = readFileSync(join(root, '.pbai4devs/estado/agentdevkit.json'));
  assert.equal((await cli(root, ['update', '--force', '--yes'])).changed, false);
  assert.equal((await cli(root, args)).changed, false);
  await cli(root, ['doctor']); await cli(root, ['sync', '--check']);
  assert.deepEqual(readFileSync(join(root, '.pbai4devs/estado/agentdevkit.json')), stable);
  assert.deepEqual(snapshot(root, paths), before);
  assert.equal(git('ls-files', '--stage', '-z'), index);
  assert.equal(git('diff', '--cached', '--binary'), staged);
  assert.deepEqual(readFileSync(join(directory, 'outside/config.json')), outside);
});

test('preserva raiz externa, link pendente e ciclo sem abrir os destinos', async t => {
  const { root, directory } = fixture(t);
  put(directory, 'outside/secret.txt', 'outside remains unchanged\n');
  put(root, 'CLAUDE.md/notes.txt', 'Existing entrypoint directory\n');
  if (!link(t, '../outside', join(root, '.cursor'), 'dir')
    || !link(t, 'does-not-exist', join(root, '.claude/commands'), 'dir')
    || !link(t, 'rules', join(root, '.claude/rules'), 'dir')) return;
  const links = ['.cursor', '.claude/commands', '.claude/rules'];
  const before = snapshot(root, links);
  const installed = await cli(root, ['init', '--yes', '--agents', 'cursor,claude']);
  for (const path of links) assert.ok(installed.preserved.some(item => item.path === path), path);
  assert.ok(installed.preserved.some(item => item.path === 'CLAUDE.md' && item.reason === 'existing-directory'));
  await cli(root, ['doctor']); await cli(root, ['sync', '--check']);
  await cli(root, ['agents', 'codex,claude']); await cli(root, ['agents', 'cursor,claude']);
  await cli(root, ['update', '--force']);
  assert.deepEqual(snapshot(root, links), before);
  assert.equal(readFileSync(join(directory, 'outside/secret.txt'), 'utf8'), 'outside remains unchanged\n');
  assert.equal(readFileSync(join(root, 'CLAUDE.md/notes.txt'), 'utf8'), 'Existing entrypoint directory\n');
  assert.equal(existsSync(join(directory, 'outside/skills')), false);
});

test('link em caminho já gerenciado continua sendo um erro e não causa gravações', async t => {
  const { root, directory } = fixture(t);
  await cli(root, ['init', '--yes', '--agents', 'claude']);
  const path = '.claude/agents/revisor.md', file = join(root, path);
  put(directory, 'outside.txt', 'external content\n');
  const state = readFileSync(join(root, '.pbai4devs/estado/agentdevkit.json'));
  rmSync(file);
  if (!link(t, '../../../outside.txt', file)) return;
  const denied = await cli(root, ['update', '--force'], 1);
  assert.equal(denied.error.code, 'E_SYMLINK');
  assert.equal(readlinkSync(file), '../../../outside.txt');
  assert.deepEqual(readFileSync(join(root, '.pbai4devs/estado/agentdevkit.json')), state);
  assert.equal(readFileSync(join(directory, 'outside.txt'), 'utf8'), 'external content\n');
});

test('link criado após o plano bloqueia aplicação antes de qualquer alteração', t => {
  const { root, directory } = fixture(t);
  put(directory, 'outside.txt', 'external content\n');
  const plan = planInstallation({ target: root, clients: ['claude'] });
  const path = join(root, '.claude/agents/revisor.md');
  if (!link(t, '../../../outside.txt', path)) return;
  assert.throws(() => applyPlan(plan), { code: 'E_SYMLINK' });
  assert.equal(existsSync(join(root, '.pbai4devs')), false);
  assert.equal(readFileSync(join(directory, 'outside.txt'), 'utf8'), 'external content\n');
});

test('preserva configuração JSON nativa mesmo quando tem o formato de um índice gerado', async t => {
  const { root } = fixture(t);
  const path = '.agents/skills.json', content = '{"entries":[{"path":"my-skills/private"}]}\n';
  put(root, path, content);
  const installed = await cli(root, ['init', '--yes', '--agents', 'codex']);
  assert.ok(installed.preserved.some(item => item.path === path));
  const state = JSON.parse(readFileSync(join(root, '.pbai4devs/estado/agentdevkit.json')));
  assert.equal(state.files[path], undefined);
  await cli(root, ['doctor']); await cli(root, ['update', '--force']);
  assert.equal(readFileSync(join(root, path), 'utf8'), content);
});

test('migra índices comprovadamente gerados por sincronização standalone', async t => {
  const { root } = fixture(t);
  const path = '.agents/skills.json';
  const preparation = planInstallation({ target: root, clients: ['codex'] });
  for (const change of preparation.changes) if (change.path.startsWith('.pbai4devs/') && change.path !== '.pbai4devs/estado/agentdevkit.json') put(root, change.path, change.content);
  assert.equal(existsSync(join(root, '.pbai4devs/estado/agentdevkit.json')), false);
  const standalone = synchronize({ root, output() {} });
  assert.equal(standalone.exitCode, 0);
  const derived = JSON.parse(readFileSync(join(root, '.pbai4devs/estado/derived.json')));
  assert.equal(derived.outputs[path], hash(readFileSync(join(root, path))));
  const installed = await cli(root, ['init', '--yes', '--agents', 'codex']);
  assert.ok(!installed.preserved.some(item => item.path === path));
  const state = JSON.parse(readFileSync(join(root, '.pbai4devs/estado/agentdevkit.json')));
  assert.equal(state.files[path], hash(readFileSync(join(root, path))));
  assert.ok(JSON.parse(readFileSync(join(root, path))).entries.length);
  await cli(root, ['doctor']); await cli(root, ['sync', '--check']);
});

test('reconhece índice regenerado por standalone e atualiza o estado pela CLI', async t => {
  const { root } = fixture(t);
  await cli(root, ['init', '--yes', '--agents', 'codex']);
  put(root, '.pbai4devs/skills/projeto/local-extra/SKILL.md', '---\nname: local-extra\ndescription: Native coexistence fixture.\n---\n\n# Local extra\n\nUse this local skill.\n');
  const changed = synchronize({ root, output() {} });
  assert.equal(changed.exitCode, 0);
  assert.ok(!inspect(root).issues.some(issue => issue.path === '.agents/skills.json'), 'O índice tem proveniência de regeneração.');
  await cli(root, ['sync']);
  await cli(root, ['doctor']);
  await cli(root, ['sync', '--check']);
});

test('preserva arquivo humano que ocupa uma pasta de skills e omite entradas indisponíveis', async t => {
  const { root } = fixture(t);
  const path = '.agents/skills', content = 'Existing native configuration\n';
  put(root, path, content);
  const installed = await cli(root, ['init', '--yes', '--agents', 'codex']);
  assert.ok(installed.preserved.some(item => item.path === path && item.reason === 'non-directory'));
  assert.deepEqual(JSON.parse(readFileSync(join(root, '.agents/skills.json'))).entries, []);
  await cli(root, ['doctor']); await cli(root, ['sync', '--check']);
  assert.equal((await cli(root, ['update', '--force'])).changed, false);
  assert.equal(readFileSync(join(root, path), 'utf8'), content);
});

test('preserva Readme.md e entradas humanas com caixa diferente sem criar duplicatas', async t => {
  const { root, git } = fixture(t);
  const files = {
    'Readme.md': '# Existing Express-style readme\n',
    'agents.md': '# Existing project agents\n',
    'claude.md': '# Existing Claude instructions\n',
    'Gemini.md': '# Existing Gemini instructions\n',
  };
  for (const [path, content] of Object.entries(files)) put(root, path, content);
  git('add', '--all');
  const before = snapshot(root, Object.keys(files)), index = git('ls-files', '--stage', '-z');
  const args = ['init', '--yes', '--agents', 'codex,claude,gemini'];
  const preview = await cli(root, [...args, '--dry-run']);
  for (const path of Object.keys(files)) assert.ok(preview.preserved.some(item => item.path === path && item.reason === 'case-variant'), path);
  assert.equal(existsSync(join(root, '.pbai4devs')), false);
  await cli(root, args);
  await cli(root, ['doctor']); await cli(root, ['sync', '--check']);
  assert.equal(synchronize({ root, check: true, output() {} }).exitCode, 0);
  assert.equal(synchronize({ root, force: true, output() {} }).exitCode, 0);
  assert.equal((await cli(root, ['update', '--force'])).changed, false);
  assert.deepEqual(snapshot(root, Object.keys(files)), before);
  assert.equal(git('ls-files', '--stage', '-z'), index);
  const names = readdirSync(root);
  for (const name of ['README.md', 'AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) assert.ok(!names.includes(name), name);
  const state = JSON.parse(readFileSync(join(root, '.pbai4devs/estado/agentdevkit.json')));
  for (const path of [...Object.keys(files), 'AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) assert.equal(state.files[path], undefined, path);
});

test('alias de caixa em saída gerenciada ou diretório de adapter continua recusado', async t => {
  const { root } = fixture(t);
  await cli(root, ['init', '--yes', '--agents', 'codex']);
  renameSync(join(root, 'AGENTS.md'), join(root, 'agents.md'));
  const denied = await cli(root, ['update', '--force'], 1);
  assert.equal(denied.error.code, 'E_PATH');
  assert.ok(readdirSync(root).includes('agents.md'));
  const other = fixture(t).root;
  put(other, '.CLAUDE/settings.json', '{}\n');
  const alias = await cli(other, ['init', '--yes', '--agents', 'claude'], 1);
  assert.equal(alias.error.code, 'E_PATH');
  assert.equal(existsSync(join(other, '.pbai4devs')), false);
});
