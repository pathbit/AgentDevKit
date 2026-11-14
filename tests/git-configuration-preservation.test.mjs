import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, chmodSync, linkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { planLocalIgnore, checkLocalIgnore, applyLocalIgnore, planUntrack, applyUntrack, restoreUntrack } from '../.pbai4devs/scripts/lib/gitignore.mjs';
import { safeGitEnvironment, gitOutputLines, gitPathsOverlap } from '../.pbai4devs/scripts/lib/git-environment.mjs';
import { collectErrorDiagnostics } from '../.pbai4devs/scripts/lib/error-reporting.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { planInstallation, applyPlan } from '../src/install.mjs';
import { main as cliMain } from '../src/cli.mjs';
const repo = fileURLToPath(new URL('..', import.meta.url));
const bin = join(repo, 'bin/agentdevkit.mjs');
const sync = join(repo, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_NOSYSTEM: '1' };
const run = (cwd, command, args) => spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 180000, maxBuffer: 20 * 1024 * 1024 });
const git = (root, ...args) => { const r = run(root, 'git', args); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
const put = (root, path, contents) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, contents); };
const stageSynthetic = (root, path, contents) => {
  const blob = spawnSync('git', ['-C', root, 'hash-object', '-w', '--stdin'], { env, input: contents, encoding: 'utf8' });
  assert.equal(blob.status, 0, blob.stderr);
  git(root, 'update-index', '--add', '--cacheinfo', `100644,${blob.stdout.trim()},${path}`);
};
test('saída Git preserva espaços e trata CRLF no Windows', () => {
  assert.deepEqual(gitOutputLines('/repo com espaço \n', 'linux'), ['/repo com espaço ']);
  assert.deepEqual(gitOutputLines('C:\\repo com espaço \r\n', 'win32'), ['C:\\repo com espaço ']);
  assert.deepEqual(gitOutputLines('/repo com CR\r\n', 'linux'), ['/repo com CR\r']);
  assert.deepEqual(gitOutputLines('C:\\repo \r\nC:\\repo \\.git\\info\\exclude\r\n', 'win32'), ['C:\\repo ', 'C:\\repo \\.git\\info\\exclude']);
});

test('diagnósticos percorrem agregados e ciclos com limites e deduplicação', () => {
  const primary = new Error('principal'); primary.rollbackPreservedPaths = ['primeiro', 'primeiro'];
  primary.cleanupFailures = [{ path: 'tmp', message: 'EACCES' }, { path: 'tmp', message: 'EACCES' }, null];
  const aggregate = new AggregateError([primary], 'agregado', { cause: primary }); primary.cause = aggregate;
  const result = collectErrorDiagnostics(aggregate);
  assert.deepEqual(result.preservedPaths, ['primeiro']); assert.deepEqual(result.cleanupFailures, [{ path: 'tmp', message: 'EACCES' }]);
  assert.equal(result.truncated, false);
  const malformed = {}; Object.defineProperty(malformed, 'cause', { get() { throw new Error('getter'); } });
  assert.equal(collectErrorDiagnostics(malformed).truncated, true);
  const huge = new AggregateError(Array.from({ length: 4200 }, () => new Error('x')));
  assert.equal(collectErrorDiagnostics(huge).truncated, true);
});

test('init/update/sync funcionam em repositório com espaço final', { skip: process.platform === 'win32', timeout: 120000 }, t => {
  const space = mkdtempSync(join(tmpdir(), 'adk-trailing-space-')); t.after(() => rmSync(space, { recursive: true, force: true }));
  const root = join(space, 'repo '); mkdirSync(root); git(root, 'init', '-q', '-b', 'main');
  put(root, 'human.txt', 'conteúdo staged\n'); git(root, 'add', 'human.txt');
  const paths = ['.git/index', '.git/config', '.git/info/exclude'];
  const before = paths.map(path => readFileSync(join(root, path)));
  for (const command of ['init', 'update', 'sync']) {
    const args = command === 'init' ? ['init', '--agents', 'codex'] : [command];
    const result = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    paths.forEach((path, i) => assert.deepEqual(readFileSync(join(root, path)), before[i], path));
  }
});
for (const targetName of ['main', 'linked']) test(`init/update/sync conservam Git e ignores existentes em ${targetName}`, { timeout: 180000 }, t => {
  const dir = mkdtempSync(join(tmpdir(), 'adk-git-configuration-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const main = join(dir, 'main'), linked = join(dir, 'linked'); mkdirSync(main);
  git(main, 'init', '-q', '-b', 'main'); git(main, 'config', 'user.name', 'Teste'); git(main, 'config', 'user.email', 'teste@example.invalid');
  put(main, 'tracked.txt', 'antes\n'); git(main, 'add', 'tracked.txt'); git(main, 'commit', '-qm', 'base'); git(main, 'worktree', 'add', '-qb', 'other', linked);
  put(main, 'tracked.txt', 'staged main\n'); git(main, 'add', 'tracked.txt'); put(linked, 'tracked.txt', 'staged linked\n'); git(linked, 'add', 'tracked.txt');
  const current = targetName === 'main' ? main : linked, other = targetName === 'main' ? linked : main;
  put(current, '.gitignore', '# humano raiz\n/tmp/\n'); put(current, '.claude/.gitignore', '# humano staged\n');
  git(current, 'add', '-f', '.claude/.gitignore'); put(current, '.claude/.gitignore', '# humano agente\n/segredo\n');
  put(current, '.pbai4devs/.gitignore', '# humano kit\n/sigilo\n');
  put(other, '.claude/settings.json', '{"humano": true}\n');
  const files = [join(main, '.git/config'), join(main, '.git/info/exclude'), join(main, '.git/index'), join(main, '.git/worktrees/linked/index'), join(current, '.gitignore'), join(current, '.claude/.gitignore'), join(current, '.pbai4devs/.gitignore'), join(other, '.claude/settings.json')];
  const before = files.map(file => readFileSync(file)); const otherStatus = git(other, 'status', '--short', '--untracked-files=all');
  for (const args of [['init', '--agents', 'claude'], ['update'], ['sync']]) {
    const r = run(current, process.execPath, [bin, ...args, '--target', current, '--json']);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const result = JSON.parse(r.stdout); assert.ok(result.warnings.some(w => w.includes('visiveis')));
    files.forEach((file, i) => assert.deepEqual(readFileSync(file), before[i], `${args[0]} alterou ${file}`));
    assert.equal(git(other, 'status', '--short', '--untracked-files=all'), otherStatus);
    assert.equal(existsSync(join(current, '.claude/skills/.gitignore')), false);
  }
  const standalone = run(current, process.execPath, [sync, '--root', current]);
  assert.equal(standalone.status, 0, standalone.stdout + standalone.stderr);
  files.forEach((file, i) => assert.deepEqual(readFileSync(file), before[i], `sync direto alterou ${file}`));
  assert.equal(git(other, 'status', '--short', '--untracked-files=all'), otherStatus);
});

test('projeto novo cria somente ignore do kit, sem mexer na configuracao Git', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-git-new-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); git(root, 'config', 'user.name', 'Teste'); git(root, 'config', 'user.email', 'teste@example.invalid');
  put(root, 'tracked.txt', 'base\n'); git(root, 'add', 'tracked.txt'); git(root, 'commit', '-qm', 'base');
  put(root, '.claude/settings.json', '{"humano": true}\n');
  assert.equal(run(root, 'git', ['check-ignore', '-q', '--', '.claude/settings.json']).status, 1);
  const snapshots = ['.git/config', '.git/info/exclude', '.git/index'].map(path => readFileSync(join(root, path)));
  const r = run(root, process.execPath, [bin, 'init', '--agents', 'claude', '--target', root, '--json']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(existsSync(join(root, '.gitignore')), false);
  assert.equal(existsSync(join(root, '.claude/.gitignore')), false);
  assert.equal(existsSync(join(root, '.claude/skills/.gitignore')), false);
  assert.equal(existsSync(join(root, '.pbai4devs/.gitignore')), true);
  assert.equal(readFileSync(join(root, '.claude/settings.json'), 'utf8'), '{"humano": true}\n');
  assert.equal(run(root, 'git', ['check-ignore', '-q', '--', '.claude/settings.json']).status, 1);
  ['.git/config', '.git/info/exclude', '.git/index'].forEach((path, i) => assert.deepEqual(readFileSync(join(root, path)), snapshots[i]));
  const status = git(root, 'status', '--short', '--untracked-files=all');
  assert.ok(status.includes('AGENTS.md')); assert.ok(status.includes('.claude/skills/'));
  for (const args of [['sync', '--check'], ['doctor']]) {
    const result = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const data = JSON.parse(result.stdout);
    assert.equal(data.ok, true);
    assert.ok(data.warnings.some(value => value.includes('dados privados')));
    assert.ok(data.localIgnore.pending.some(item => item.code === 'output-visible'));
  }
  const directCheck = run(root, process.execPath, [sync, '--root', root, '--check']);
  assert.equal(directCheck.status, 0, directCheck.stdout + directCheck.stderr);
  assert.match(directCheck.stdout, /dados privados podem ficar visiveis/);
  const exclude = join(root, '.git/info/exclude'), originalExclude = readFileSync(exclude);
  const oldBlock = '# BEGIN AGENTDEVKIT LOCAL 1234567890abcdef\n/.claude/\n# END AGENTDEVKIT LOCAL 1234567890abcdef\n';
  writeFileSync(exclude, oldBlock);
  for (const args of [['sync', '--check'], ['doctor']]) {
    const result = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const data = JSON.parse(result.stdout); assert.equal(data.ok, false);
    assert.ok(data.issues?.some(item => item.code === 'shared-ignore-legacy') || data.localIgnore?.pending.some(item => item.code === 'shared-ignore-legacy'));
    assert.equal(readFileSync(exclude, 'utf8'), oldBlock);
  }
  writeFileSync(exclude, originalExclude);
  put(root, '.claude/auth.json', '{"test":"sem credenciais reais"}\n');
  for (const args of [['sync', '--check'], ['doctor']]) {
    const result = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const data = JSON.parse(result.stdout);
    assert.ok(data.issues?.some(item => item.code === 'private-file-visible' && item.path === '.claude/auth.json') || data.localIgnore?.pending.some(item => item.code === 'private-file-visible' && item.path === '.claude/auth.json'));
  }
  rmSync(join(root, '.claude/auth.json'));
  put(root, 'test-results/confidential.txt', 'artefato\n'); git(root, 'add', '-f', 'test-results/confidential.txt');
  for (const args of [['sync', '--check'], ['doctor']]) {
    const result = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const data = JSON.parse(result.stdout);
    assert.equal(data.ok, false);
    assert.ok(data.issues?.some(item => item.code === 'tracked-local-output') || data.localIgnore?.trackedOutputs.includes('test-results/confidential.txt'));
  }
});

test('comandos JSON aceitam negações genéricas e conservam Git e ignores byte a byte', { timeout: 180000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-generic-ignore-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  put(root, 'tracked.txt', 'staged humano\n'); git(root, 'add', 'tracked.txt');
  put(root, '.gitignore', '# humano\r\n!*.md\r\n!docs/*.md\r\n!**/*.mdx\r\n!*.json\r\n!*.yaml\r\n!docs/*.json\r\n');
  put(root, '.claude/.gitignore', '# cliente humano\r\n');
  put(root, '.pbai4devs/.gitignore', '# kit humano\r\n');
  const paths = ['.git/config', '.git/info/exclude', '.git/index', '.gitignore', '.claude/.gitignore', '.pbai4devs/.gitignore'];
  const before = paths.map(path => readFileSync(join(root, path)));
  for (const args of [['init', '--agents', 'claude'], ['update'], ['sync'], ['sync', '--check'], ['doctor']]) {
    const result = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const data = JSON.parse(result.stdout); assert.notEqual(data.ok, false);
    assert.ok(!data.localIgnore?.pending.some(item => item.code === 'ignore-ambiguous'));
    assert.ok(data.warnings.some(warning => warning.includes('visiveis')), args.join(' '));
    paths.forEach((path, i) => assert.deepEqual(readFileSync(join(root, path)), before[i], `${args.join(' ')}: ${path}`));
  }
  const credentials = ['.claude/.env.secret.md', '.claude/auth.json', '.claude/.env.secret.yaml'];
  for (const path of credentials) {
    put(root, path, 'fixture sem credencial real\n');
    const result = run(root, process.execPath, [bin, 'doctor', '--target', root, '--json']);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const data = JSON.parse(result.stdout);
    assert.ok(data.issues?.some(item => item.code === 'private-file-visible' && item.path === path) || data.localIgnore?.pending.some(item => item.code === 'private-file-visible' && item.path === path), path);
    paths.forEach((item, i) => assert.deepEqual(readFileSync(join(root, item)), before[i], item));
  }
  git(root, 'add', '-f', ...credentials);
  const stagedIndex = readFileSync(join(root, '.git/index'));
  const result = run(root, process.execPath, [bin, 'doctor', '--target', root, '--json']);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const data = JSON.parse(result.stdout);
  for (const path of credentials) assert.ok(data.issues?.some(item => item.code === 'tracked-local-output' && item.path === path) || data.localIgnore?.trackedOutputs.includes(path), path);
  assert.deepEqual(readFileSync(join(root, '.git/index')), stagedIndex);
  paths.filter(path => path !== '.git/index').forEach(path => assert.deepEqual(readFileSync(join(root, path)), before[paths.indexOf(path)], path));
});

test('sem Git instalado, init nao cria nem sobrescreve ignore de agente', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-without-git-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  put(root, '.claude/.gitignore', '# arquivo humano\n');
  const r = spawnSync(process.execPath, [bin, 'init', '--agents', 'claude', '--target', root, '--json'], { cwd: root, env: { ...env, PATH: '' }, encoding: 'utf8', timeout: 120000, maxBuffer: 20 * 1024 * 1024 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(readFileSync(join(root, '.claude/.gitignore'), 'utf8'), '# arquivo humano\n');
  assert.equal(existsSync(join(root, '.gitignore')), false);
  assert.equal(existsSync(join(root, '.claude/skills/.gitignore')), false);
});

test('helpers antigos recusam planos que escrevem no Git ou modificam o indice', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-git-refuse-write-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, 'tracked.txt', 'staged humano\n'); git(root, 'add', 'tracked.txt');
  const index = join(root, '.git/index'), exclude = join(root, '.git/info/exclude');
  const beforeIndex = readFileSync(index), beforeExclude = readFileSync(exclude);
  assert.throws(() => applyLocalIgnore({ edits: [{ path: exclude, before: beforeExclude.toString(), after: 'substituido' }] }), /desabilitado/);
  assert.throws(() => applyUntrack({ root, paths: ['tracked.txt'] }), /desabilitado/);
  assert.throws(() => restoreUntrack({ root, paths: ['tracked.txt'] }), /desabilitado/);
  assert.deepEqual(readFileSync(index), beforeIndex); assert.deepEqual(readFileSync(exclude), beforeExclude);
});

test('upgrade e remoção de seleção preservam ignores antes marcados como gerenciados', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-old-ignore-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); git(root, 'config', 'user.name', 'Teste'); git(root, 'config', 'user.email', 'teste@example.invalid');
  put(root, 'tracked.txt', 'base\n'); git(root, 'add', 'tracked.txt'); git(root, 'commit', '-qm', 'base');
  let result = run(root, process.execPath, [bin, 'init', '--agents', 'claude', '--target', root, '--json']); assert.equal(result.status, 0, result.stdout + result.stderr);
  const paths = ['.claude/.gitignore', '.claude/skills/.gitignore'];
  const blocks = ['# BEGIN AGENT IGNORE\n/*\n# END AGENT IGNORE', '# BEGIN AGENTDEVKIT WORKTREE LOCAL\n/demo\n# END AGENTDEVKIT WORKTREE LOCAL'];
  const statePath = join(root, '.pbai4devs/state/agentdevkit.json'), state = JSON.parse(readFileSync(statePath));
  const digest = text => createHash('sha256').update(text).digest('hex');
  paths.forEach((path, i) => { put(root, path, `${blocks[i]}\n`); state.files[path] = digest(`${blocks[i]}\n`); });
  state.blocks ||= {}; state.blocks[paths[0]] = digest(blocks[0]);
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
  const before = paths.map(path => readFileSync(join(root, path))), index = readFileSync(join(root, '.git/index')), exclude = readFileSync(join(root, '.git/info/exclude'));
  result = run(root, process.execPath, [bin, 'agents', 'codex', '--target', root, '--json']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  paths.forEach((path, i) => assert.deepEqual(readFileSync(join(root, path)), before[i], path));
  assert.deepEqual(readFileSync(join(root, '.git/index')), index); assert.deepEqual(readFileSync(join(root, '.git/info/exclude')), exclude);
});

for (const [name, rules] of [
  ['sem regras', ''], ['negacao literal', '!/.claude/\n'], ['negação BOM', '\uFEFF!/.claude/\n'],
  ['glob e negação posterior', '/.claude/*\n!/.claude/settings.json\n'],
  ['excecao de credencial', '/.claude/*\n!/.claude/auth.json\n'],
  ['aninhada', '/outro/\n!/outro/humano\n'],
]) test(`plano respeita configuração humana: ${name}`, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-ignore-policy-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, '.gitignore', rules);
  put(root, '.claude/settings.json', '{"humano": true}\n'); put(root, 'tracked.txt', 'staged\n'); git(root, 'add', '-f', 'tracked.txt');
  const paths = ['.gitignore', '.git/config', '.git/info/exclude', '.git/index', '.claude/settings.json'];
  const before = paths.map(path => readFileSync(join(root, path)));
  const ignored = run(root, 'git', ['check-ignore', '--no-index', '-q', '--', '.claude/settings.json']).status;
  const plan = planLocalIgnore(root, { outputs: ['.claude/skills/demo/SKILL.md', 'AGENTS.md'] });
  assert.deepEqual(plan.edits, []); applyLocalIgnore(plan);
  paths.forEach((path, i) => assert.deepEqual(readFileSync(join(root, path)), before[i], path));
  assert.equal(run(root, 'git', ['check-ignore', '--no-index', '-q', '--', '.claude/settings.json']).status, ignored);
});

test('playwright e resultados visíveis são informados em qualquer caixa', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-visible-artifacts-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const samples = ['.playwright-mcp/session.json', '.PLAYWRIGHT-CACHE/dados.json', 'playwright-report/index.html', 'TestResults/resultado.xml'];
  samples.forEach(path => put(root, path, 'local\n'));
  const result = checkLocalIgnore(planLocalIgnore(root));
  for (const [index, sample] of samples.entries()) {
    assert.equal(run(root, 'git', ['check-ignore', '--no-index', '-q', '--', sample]).status, 1);
    const prefix = index < 2 ? '**/.[Pp][Ll][Aa][Yy]' : index === 2 ? '**/[Pp][Ll][Aa][Yy]' : '**/[Tt][Ee][Ss][Tt][Rr]';
    assert.ok(result.pending.some(item => item.code === 'artifact-unprotected' && item.pattern?.startsWith(prefix)), sample);
  }
});

test('ambiente Git remove variáveis em qualquer caixa antes da consulta', () => {
  const source = { git_dir: 'fora', GIT_WORK_TREE: 'fora', Git_Common_Dir: 'fora', git_index_file: 'fora', GIT_EXTERNAL_DIFF: 'fora', Git_Optional_Locks: '1', PATH: '/bin' };
  assert.deepEqual(safeGitEnvironment(source), { PATH: '/bin', GIT_OPTIONAL_LOCKS: '0' });
  assert.equal(source.git_dir, 'fora');
});

test('diagnóstico de arquivos privados respeita a precedência real de ignore global', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-private-global-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, 'global-ignore', '/.claude/auth.json\n');
  git(root, 'config', '--local', 'core.excludesFile', join(root, 'global-ignore'));
  put(root, '.claude/auth.json', '{"fixture": true}\n');
  const config = readFileSync(join(root, '.git/config'));
  assert.equal(run(root, 'git', ['check-ignore', '--no-index', '-q', '--', '.claude/auth.json']).status, 0);
  const check = checkLocalIgnore(planLocalIgnore(root));
  assert.equal(check.pending.some(item => item.code === 'private-file-visible' && item.path === '.claude/auth.json'), false);
  assert.deepEqual(readFileSync(join(root, '.git/config')), config);
});

test('diagnóstico cobre credenciais no hub e aliases de clientes visíveis e staged', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-private-alias-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  put(root, '.pbai4devs/.gitignore', '# ignore humano\n');
  const secrets = ['.pbai4devs/.env', '.CLAUDE/auth.json'];
  secrets.forEach(path => put(root, path, 'fixture sem credencial real\n'));
  const ignore = readFileSync(join(root, '.pbai4devs/.gitignore'));
  let plan = planLocalIgnore(root), diagnostics = checkLocalIgnore(plan);
  for (const path of secrets) assert.ok(diagnostics.pending.some(item => item.code === 'private-file-visible' && item.path === path), path);
  git(root, 'add', '-f', ...secrets); const index = readFileSync(join(root, '.git/index'));
  plan = planLocalIgnore(root); diagnostics = checkLocalIgnore(plan);
  for (const path of secrets) assert.ok(diagnostics.trackedOutputs.includes(path), path);
  assert.deepEqual(readFileSync(join(root, '.pbai4devs/.gitignore')), ignore);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('aliases Unicode e ancestrais staged são detectados conservadoramente', t => {
  assert.equal(gitPathsOverlap('.claude/skills/ſincronizar/SKILL.md', '.claude/skills/sincronizar/SKILL.md'), true);
  assert.equal(gitPathsOverlap('.claude/skills/ſincronizar', '.claude/skills/sincronizar/SKILL.md'), true);
  assert.equal(gitPathsOverlap('.claude/skills/straße', '.claude/skills/STRASSE/SKILL.md'), true);
  assert.equal(gitPathsOverlap('.codex/commands/proximos-paẞos/COMMAND.md', '.codex/commands/proximos-passos/COMMAND.md'), true);
  assert.equal(gitPathsOverlap('relatório.txt', '.pbai4devs/SKILL.md'), false);
  assert.equal(gitPathsOverlap('.claude/straße/SKILL.md', '.claude/other/SKILL.md'), false);
  assert.equal(gitPathsOverlap('.claude/skills/demo./SKILL.md', '.claude/skills/demo/SKILL.md', { platform: 'win32' }), true);
  assert.equal(gitPathsOverlap('.claude/PROGRA~1/SKILL.md', '.claude/Program Files/SKILL.md', { platform: 'win32' }), true);
  assert.equal(gitPathsOverlap('.claude/PROGRA~1.con', '.claude/Program Files.config', { platform: 'win32' }), true);
  assert.equal(gitPathsOverlap('relatorio~1.txt', '.pbai4devs/SKILL.md'), false);
  assert.equal(gitPathsOverlap('relatorio.txt.', '.pbai4devs/SKILL.md'), false);
  for (const ancestor of [false, true]) {
    const root = mkdtempSync(join(tmpdir(), 'adk-unicode-index-')); t.after(() => rmSync(root, { recursive: true, force: true }));
    git(root, 'init', '-q', '-b', 'main');
    const alias = ancestor ? '.claude/skills/ſincronizar' : '.claude/skills/ſincronizar/SKILL.md';
    const canonical = '.claude/skills/sincronizar/SKILL.md';
    put(root, alias, 'conteúdo staged próprio\n'); git(root, 'add', '-f', alias);
    const index = readFileSync(join(root, '.git/index'));
    if (ancestor) rmSync(join(root, alias));
    const expected = { [canonical]: createHash('sha256').update('conteúdo gerado\n').digest('hex') };
    assert.ok(planUntrack(root, expected).conflicts.includes(canonical), alias);
    assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  }
});

test('Windows preserva aliases curtos arbitrários e só descarta identidade comprovadamente distinta', () => {
  for (const [a, b] of [['Z~1.TXT', 'README.md'], ['longfile.txt', 'longfilename.txt'], ['AGENTS.md.', 'AGENTS.md']]) {
    assert.equal(gitPathsOverlap(a, b, { platform: 'win32' }), true);
    assert.equal(gitPathsOverlap(a, b, { platform: 'win32', identity: () => 'same' }), true);
    assert.equal(gitPathsOverlap(a, b, { platform: 'win32', identity: () => 'distinct' }), false);
    assert.equal(gitPathsOverlap(a, b, { platform: 'win32', identity: () => { throw new Error('inacessível'); } }), true);
  }
  assert.equal(gitPathsOverlap('AGENTS.md.', 'AGENTS.md', { platform: 'darwin' }), false);
  assert.equal(gitPathsOverlap('AGENTS~1', '.agents', { platform: 'darwin' }), false);
  assert.equal(gitPathsOverlap('longfile.txt', 'longfilename.txt', { platform: 'darwin' }), false);
  assert.equal(gitPathsOverlap('README.md::$DATA', 'README.md', { platform: 'win32' }), true);
});

test('identidade física simulada no Windows exige arquivos existentes e distintos', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-file-identity-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  put(root, 'README.md', 'um\n'); put(root, 'Z~1.TXT', 'outro\n');
  assert.equal(gitPathsOverlap('README.md', 'Z~1.TXT', { root, platform: 'win32' }), false);
  rmSync(join(root, 'Z~1.TXT'));
  assert.equal(gitPathsOverlap('README.md', 'Z~1.TXT', { root, platform: 'win32' }), true);
  assert.equal(gitPathsOverlap('README.md', 'Z~1.TXT', { root, platform: 'win32', allowMissingTarget: true }), false);
  assert.equal(gitPathsOverlap('absent.md', 'Z~1.TXT', { root, platform: 'win32', allowMissingTarget: true }), true);
  linkSync(join(root, 'README.md'), join(root, 'Z~1.TXT'));
  assert.equal(gitPathsOverlap('README.md', 'Z~1.TXT', { root, platform: 'win32' }), true);
});

test('criação do instalador recusa arquivo humano surgido após validação', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-exclusive-install-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const selected = plan.changes.find(change => change.action === 'create' && change.path.startsWith('.pbai4devs/'));
  assert.ok(selected); const destination = join(root, selected.path), link = fs.linkSync;
  let injected = false;
  t.mock.method(fs, 'linkSync', (from, to) => {
    if (to === destination) { injected = true; writeFileSync(to, 'humano concorrente\n', { flag: 'wx' }); }
    return link(from, to);
  });
  syncBuiltinESMExports(); t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  assert.throws(() => applyPlan(plan));
  assert.ok(injected); assert.equal(readFileSync(destination, 'utf8'), 'humano concorrente\n');
});

for (const format of ['json', 'humano']) test(`init em stage sem hardlinks diagnostica falha sem caminhos fantasmas em ${format}`, { timeout: 120000 }, async t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-stage-no-hardlink-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, 'human.txt', 'humano staged\n'); git(root, 'add', 'human.txt');
  const index = readFileSync(join(root, '.git/index')); let stage;
  t.mock.method(fs, 'linkSync', (from, to) => { stage = from; throw Object.assign(new Error('operation not supported by filesystem'), { code: 'ENOTSUP' }); });
  syncBuiltinESMExports(); t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  let output = ''; const writer = { write: chunk => { output += chunk; }, isTTY: false };
  const status = await cliMain(['init', '--agents', 'codex', '--target', root, '--yes', ...(format === 'json' ? ['--json'] : [])], { cwd: root, stdout: writer, stderr: writer, stdin: { isTTY: false } });
  assert.notEqual(status, 0); assert.ok(stage); assert.equal(existsSync(stage), false);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index); assert.equal(readFileSync(join(root, 'human.txt'), 'utf8'), 'humano staged\n');
  assert.deepEqual(fs.readdirSync(root).sort(), ['.git', 'human.txt']);
  if (format === 'json') {
    const result = JSON.parse(output); assert.equal(result.error.code, 'ENOTSUP'); assert.match(result.error.detail, /hard.?links?/i);
    assert.doesNotMatch(result.error.detail, /rollback incompleto/); assert.equal(result.error.preservedPaths, undefined); assert.equal(result.error.cleanupFailures, undefined);
  } else { assert.match(output, /hard.?links?/i); assert.doesNotMatch(output, /caminhos preservados/); }
});

test('falha de limpeza do stage informa diretório temporário real e preserva erro primário', { timeout: 120000 }, async t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-stage-cleanup-'))); let stage;
  const remove = fs.rmSync;
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); if (stage) remove(stage, { recursive: true, force: true }); remove(root, { recursive: true, force: true }); });
  git(root, 'init', '-q', '-b', 'main'); put(root, 'human.txt', 'humano staged\n'); git(root, 'add', 'human.txt');
  const index = readFileSync(join(root, '.git/index'));
  t.mock.method(fs, 'linkSync', from => { stage = from.match(/^.*?[\\/]agentdevkit-[^\\/]+/)[0]; throw Object.assign(new Error('operation not supported'), { code: 'ENOTSUP' }); });
  t.mock.method(fs, 'rmSync', (path, ...args) => { if (path === stage) throw Object.assign(new Error('stage ocupado'), { code: 'EACCES' }); return remove(path, ...args); });
  syncBuiltinESMExports();
  let output = ''; const writer = { write: chunk => { output += chunk; }, isTTY: false };
  const status = await cliMain(['init', '--agents', 'codex', '--target', root, '--yes', '--json'], { cwd: root, stdout: writer, stderr: writer, stdin: { isTTY: false } });
  const result = JSON.parse(output); assert.notEqual(status, 0); assert.equal(result.error.code, 'ENOTSUP'); assert.match(result.error.detail, /hard.?links?/i);
  assert.ok(existsSync(stage)); assert.ok(result.error.cleanupFailures.some(item => item.path === stage && item.message === 'stage ocupado'));
  assert.ok((result.error.preservedPaths || []).every(path => path.startsWith(`${stage}/`)));
  assert.deepEqual(readFileSync(join(root, '.git/index')), index); assert.deepEqual(fs.readdirSync(root).sort(), ['.git', 'human.txt']);
});

test('volume sem hardlinks interrompe criação e preserva arquivo e índice humanos', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-no-hardlink-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, 'human.txt', 'humano staged\n'); git(root, 'add', 'human.txt');
  const index = readFileSync(join(root, '.git/index')), plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  t.mock.method(fs, 'linkSync', () => { throw Object.assign(new Error('hardlink não suportado'), { code: 'ENOTSUP' }); });
  syncBuiltinESMExports(); t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  assert.throws(() => applyPlan(plan), /hardlink não suportado/);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(readFileSync(join(root, 'human.txt'), 'utf8'), 'humano staged\n');
});

test('falha após publicação exclusiva é revertida quando ainda pertence ao instalador', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-link-ambiguous-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const selected = plan.changes.find(change => change.action === 'create' && change.path.startsWith('.pbai4devs/'));
  const destination = join(root, selected.path), link = fs.linkSync;
  t.mock.method(fs, 'linkSync', (from, to) => { link(from, to); if (to === destination) throw new Error('resultado ambíguo'); });
  syncBuiltinESMExports(); t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  assert.throws(() => applyPlan(plan), /resultado ambíguo/);
  assert.equal(existsSync(destination), false);
});

test('erro após substituição preserva erro original e reverte apenas bytes próprios', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-rename-ambiguous-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, 'AGENTS.md', '# Humano\n');
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  assert.ok(plan.changes.some(change => change.path === 'AGENTS.md' && change.action === 'update'));
  const destination = join(root, 'AGENTS.md'), rename = fs.renameSync; let injected = false;
  t.mock.method(fs, 'renameSync', (from, to) => { rename(from, to); if (!injected && to === destination) { injected = true; throw Object.assign(new Error('rename ambíguo'), { code: 'EIO' }); } });
  syncBuiltinESMExports(); t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  assert.throws(() => applyPlan(plan), error => error.message === 'rename ambíguo' && error.code === 'EIO');
  assert.ok(injected); assert.equal(readFileSync(destination, 'utf8'), '# Humano\n');
});

test('falha após publicação não apaga edição humana concorrente', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-link-ambiguous-human-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const selected = plan.changes.find(change => change.action === 'create' && change.path.startsWith('.pbai4devs/'));
  const destination = join(root, selected.path), link = fs.linkSync;
  t.mock.method(fs, 'linkSync', (from, to) => { link(from, to); if (to === destination) { writeFileSync(to, 'humano concorrente\n'); throw new Error('resultado ambíguo'); } });
  syncBuiltinESMExports(); t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  assert.throws(() => applyPlan(plan));
  assert.equal(readFileSync(destination, 'utf8'), 'humano concorrente\n');
});

for (const format of ['json', 'humano']) test(`publicação incerta e falha de limpeza informam caminho em ${format}`, { timeout: 120000 }, async t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-uncertain-output-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const link = fs.linkSync, lstat = fs.lstatSync, remove = fs.rmSync;
  let temporary, destination, injected = false;
  t.mock.method(fs, 'linkSync', (from, to) => {
    link(from, to);
    if (!injected && to.startsWith(root)) { injected = true; temporary = from; destination = to; throw Object.assign(new Error('falha original'), { code: 'EIO' }); }
  });
  t.mock.method(fs, 'lstatSync', (path, ...args) => { if (injected && path === temporary) throw Object.assign(new Error('stat indisponível'), { code: 'EACCES' }); return lstat(path, ...args); });
  t.mock.method(fs, 'rmSync', (path, ...args) => { if (injected && path === temporary) throw Object.assign(new Error('limpeza indisponível'), { code: 'EACCES' }); return remove(path, ...args); });
  syncBuiltinESMExports(); t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  let output = ''; const writer = { write: chunk => { output += chunk; }, isTTY: false };
  const args = ['init', '--agents', 'codex', '--target', root, '--yes', ...(format === 'json' ? ['--json'] : [])];
  const status = await cliMain(args, { cwd: root, stdout: writer, stderr: writer, stdin: { isTTY: false } });
  assert.notEqual(status, 0); assert.ok(injected); assert.ok(existsSync(destination));
  const relativePath = destination.slice(root.length + 1).split(/[\\/]/).join('/');
  if (format === 'json') {
    const result = JSON.parse(output);
    assert.equal(result.error.code, 'EIO'); assert.equal(result.error.detail, 'falha original');
    assert.ok(result.error.preservedPaths.includes(relativePath));
    assert.ok(result.error.cleanupFailures.some(item => item.path === temporary && item.message === 'limpeza indisponível'));
  } else { assert.match(output, /Revise os caminhos preservados/); assert.ok(output.includes(relativePath)); assert.ok(output.includes(temporary)); }
});

for (const format of ['json', 'humano']) test(`erro agregado informa rollback e limpeza em ${format}`, { timeout: 120000 }, async t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-aggregate-output-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const link = fs.linkSync, remove = fs.rmSync; let first, temporary, second;
  t.mock.method(fs, 'linkSync', (from, to) => {
    link(from, to);
    if (!from.includes('.agentdevkit-')) return;
    if (!first) first = to;
    else if (!second) { second = to; temporary = from; throw Object.assign(new Error('falha original'), { code: 'EIO' }); }
  });
  t.mock.method(fs, 'rmSync', (path, ...args) => {
    if (path === temporary || path === first) throw Object.assign(new Error('limpeza indisponível'), { code: 'EACCES' });
    return remove(path, ...args);
  });
  syncBuiltinESMExports(); t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  let output = ''; const writer = { write: chunk => { output += chunk; }, isTTY: false };
  const status = await cliMain(['init', '--agents', 'codex', '--target', root, '--yes', ...(format === 'json' ? ['--json'] : [])], { cwd: root, stdout: writer, stderr: writer, stdin: { isTTY: false } });
  assert.notEqual(status, 0); assert.ok(first); assert.ok(second); assert.ok(temporary); assert.ok(existsSync(first));
  const relativePath = first.slice(root.length + 1).split(/[\\/]/).join('/');
  if (format === 'json') {
    const result = JSON.parse(output); assert.equal(result.error.code, 'EIO'); assert.match(result.error.detail, /falha original/);
    assert.ok(result.error.preservedPaths.includes(relativePath));
    assert.ok(result.error.cleanupFailures.some(item => item.path === temporary && item.message === 'limpeza indisponível'));
  } else { assert.match(output, /Revise os caminhos preservados/); assert.ok(output.includes(relativePath)); assert.ok(output.includes(temporary)); }
});

for (const flow of ['instalador', 'sync']) for (const format of ['json', 'humano']) test(`limpeza isolada de ${flow} informa caminho em ${format}`, { timeout: 120000 }, async t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-cleanup-output-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const link = fs.linkSync, remove = fs.rmSync; let temporary;
  t.mock.method(fs, 'linkSync', (from, to) => {
    link(from, to);
    if (!temporary && (flow === 'sync' ? from.includes('.sync.') : from.includes('.agentdevkit-'))) temporary = from;
  });
  t.mock.method(fs, 'rmSync', (path, ...args) => { if (path === temporary) throw Object.assign(new Error('limpeza indisponível'), { code: 'EACCES' }); return remove(path, ...args); });
  syncBuiltinESMExports(); t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  let output = ''; const writer = { write: chunk => { output += chunk; }, isTTY: false };
  const status = await cliMain(['init', '--agents', 'codex', '--target', root, '--yes', ...(format === 'json' ? ['--json'] : [])], { cwd: root, stdout: writer, stderr: writer, stdin: { isTTY: false } });
  assert.notEqual(status, 0); assert.ok(temporary);
  if (format === 'json') {
    const result = JSON.parse(output); assert.equal(result.error.code, 'EACCES'); assert.equal(result.error.detail, 'limpeza indisponível');
    if (flow === 'sync') { assert.equal(existsSync(temporary), false); assert.equal(result.error.cleanupFailures, undefined); }
    else assert.ok(result.error.cleanupFailures.some(item => item.path === temporary && item.message === 'limpeza indisponível'));
  } else if (flow === 'sync') { assert.equal(existsSync(temporary), false); assert.doesNotMatch(output, /Revise os caminhos preservados/); }
  else { assert.match(output, /Revise os caminhos preservados/); assert.ok(output.includes(temporary)); }
});

for (const failureMode of ['isolada', 'dupla']) test(`sync mantém erro primário e informa limpeza ${failureMode}`, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-sync-cleanup-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
  const destination = join(root, '.claude/skills/demo/SKILL.md'), link = fs.linkSync, remove = fs.rmSync; let temporary;
  t.mock.method(fs, 'linkSync', (from, to) => {
    link(from, to);
    if (to === destination) { temporary = from; if (failureMode === 'dupla') throw Object.assign(new Error('falha original'), { code: 'EIO' }); }
  });
  t.mock.method(fs, 'rmSync', (path, ...args) => { if (path === temporary) throw Object.assign(new Error('limpeza indisponível'), { code: 'EACCES' }); return remove(path, ...args); });
  syncBuiltinESMExports(); t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  assert.throws(() => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }), error => {
    assert.equal(error.code, failureMode === 'dupla' ? 'EIO' : 'EACCES');
    assert.equal(error.message, failureMode === 'dupla' ? 'falha original' : 'limpeza indisponível');
    assert.ok(error.cleanupFailures.some(item => item.path === temporary)); return true;
  });
  assert.ok(temporary); assert.equal(existsSync(destination), false);
});

test('rollback do instalador preserva substituto humano de bytes e modo idênticos', { timeout: 120000 }, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-identical-install-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const creates = plan.changes.filter(change => change.action === 'create'); assert.ok(creates.length >= 2);
  const first = join(root, creates[0].path), second = join(root, creates[1].path), link = fs.linkSync;
  let humanIdentity;
  t.mock.method(fs, 'linkSync', (from, to) => {
    link(from, to);
    if (to === second) {
      const bytes = readFileSync(first), mode = fs.statSync(first).mode & 0o777;
      fs.unlinkSync(first); writeFileSync(first, bytes, { mode }); humanIdentity = fs.statSync(first, { bigint: true }).ino;
      throw new Error('falha posterior');
    }
  });
  syncBuiltinESMExports(); t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  assert.throws(() => applyPlan(plan), /falha posterior/);
  assert.ok(humanIdentity); assert.equal(fs.statSync(first, { bigint: true }).ino, humanIdentity);
});

for (const kind of ['falha após link', 'EEXIST']) test(`rollback do sync preserva substituto humano idêntico: ${kind}`, t => {
  const root = fs.realpathSync(mkdtempSync(join(tmpdir(), 'adk-identical-sync-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
  const destination = join(root, '.claude/skills/demo/SKILL.md'), link = fs.linkSync; let humanIdentity;
  t.mock.method(fs, 'linkSync', (from, to) => {
    if (to !== destination) return link(from, to);
    if (kind === 'falha após link') { link(from, to); fs.unlinkSync(to); }
    const bytes = readFileSync(from), mode = fs.statSync(from).mode & 0o777;
    writeFileSync(to, bytes, { mode, flag: 'wx' }); humanIdentity = fs.statSync(to, { bigint: true }).ino;
    throw Object.assign(new Error(kind), { code: kind === 'EEXIST' ? 'EEXIST' : 'EIO' });
  });
  syncBuiltinESMExports(); t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  assert.throws(() => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }));
  assert.ok(humanIdentity); assert.equal(fs.statSync(destination, { bigint: true }).ino, humanIdentity);
});

test('criação do sync recusa arquivo humano surgido após validação', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-exclusive-sync-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
  const destination = join(fs.realpathSync(root), '.claude/skills/demo/SKILL.md'), link = fs.linkSync;
  let injected = false;
  t.mock.method(fs, 'linkSync', (from, to) => {
    if (to === destination) { injected = true; writeFileSync(to, 'humano concorrente\n', { flag: 'wx' }); }
    return link(from, to);
  });
  syncBuiltinESMExports(); t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  assert.throws(() => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }));
  assert.ok(injected); assert.equal(readFileSync(destination, 'utf8'), 'humano concorrente\n');
});

test('NTFS protege short name arbitrário existente e removido', { skip: process.platform !== 'win32', timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-ntfs-short-name-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const content = 'fixture humana NTFS\n'; put(root, 'README.md', content);
  const script = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class AdkShortName {
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern SafeFileHandle CreateFile(string n, uint a, uint s, IntPtr sa, uint c, uint f, IntPtr t);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool SetFileShortName(SafeFileHandle h, string n);
}
'@
$handle = [AdkShortName]::CreateFile($env:ADK_TEST_FILE, 0x10000, 7, [IntPtr]::Zero, 3, 0x02000000, [IntPtr]::Zero)
if ($handle.IsInvalid) { throw "CreateFile: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }
try { if (-not [AdkShortName]::SetFileShortName($handle, 'ZFILE.TXT')) { throw "SetFileShortName: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" } } finally { $handle.Dispose() }
`;
  const set = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...env, ADK_TEST_FILE: join(root, 'README.md') }, encoding: 'utf8', timeout: 30000 });
  if (set.status !== 0 || !existsSync(join(root, 'ZFILE.TXT'))) { t.skip(`NTFS/SetFileShortName indisponível; não verificado: ${set.stderr || set.error?.message || set.status}`); return; }
  stageSynthetic(root, 'ZFILE.TXT', 'conteúdo staged diferente\n');
  const index = readFileSync(join(root, '.git/index'));
  const expected = { 'README.md': createHash('sha256').update(content).digest('hex') };
  assert.ok(planUntrack(root, expected).conflicts.includes('README.md'));
  assert.deepEqual(readFileSync(join(root, 'README.md'), 'utf8'), content);
  rmSync(join(root, 'README.md'));
  assert.ok(planUntrack(root, expected).conflicts.includes('README.md'));
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('arquivo Unicode independente staged não impede init nem muda o índice', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-unrelated-unicode-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  put(root, 'relatório.txt', 'conteúdo humano\n'); git(root, 'add', '--', 'relatório.txt');
  const index = readFileSync(join(root, '.git/index'));
  const init = run(root, process.execPath, [bin, 'init', '--agents', 'codex', '--target', root, '--json']);
  assert.equal(init.status, 0, init.stdout + init.stderr);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(readFileSync(join(root, 'relatório.txt'), 'utf8'), 'conteúdo humano\n');
});

for (const name of ['relatorio~1.txt', 'relatorio.txt.']) test(`arquivo staged independente ${name} não impede init`, { skip: process.platform === 'win32' && name.endsWith('.'), timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-unrelated-alias-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  put(root, name, 'conteúdo humano\n'); git(root, 'add', '--', name);
  const index = readFileSync(join(root, '.git/index'));
  const init = run(root, process.execPath, [bin, 'init', '--agents', 'codex', '--target', root, '--json']);
  assert.equal(init.status, 0, init.stdout + init.stderr);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(readFileSync(join(root, name), 'utf8'), 'conteúdo humano\n');
});

test('erro humano do sync é limitado e CLI JSON conserva o detalhe integral', () => {
  const argument = `--${'x'.repeat(2000)}`;
  const direct = run(repo, process.execPath, [sync, argument]);
  assert.notEqual(direct.status, 0);
  assert.ok(direct.stderr.length < 1300);
  assert.match(direct.stderr, /caracteres adicionais/);
  const structured = run(repo, process.execPath, [bin, '--json', argument]);
  assert.notEqual(structured.status, 0);
  assert.ok(JSON.parse(structured.stdout).error.detail.includes(argument));
});

for (const command of ['init', 'update', 'sync']) test(`${command} preserva índice staged com alias Unicode ẞ`, { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-sharp-s-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const canonical = '.codex/commands/proximos-passos/COMMAND.md', alias = '.codex/commands/proximos-paẞos/COMMAND.md';
  if (command !== 'init') {
    const init = run(root, process.execPath, [bin, 'init', '--agents', 'codex', '--target', root, '--json']);
    assert.equal(init.status, 0, init.stdout + init.stderr);
    rmSync(join(root, canonical));
  }
  stageSynthetic(root, alias, 'conteúdo humano staged\n');
  const index = readFileSync(join(root, '.git/index'));
  const args = command === 'init' ? ['init', '--agents', 'codex'] : [command, '--force'];
  const result = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(existsSync(join(root, canonical)), false, result.stdout + result.stderr);
});

test('prefixo aninhado com alias staged é diagnosticado e protegido', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-nested-index-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const sub = join(root, 'SubProject'); mkdirSync(sub);
  const alias = 'subproject/.claude/auth.json';
  stageSynthetic(root, alias, 'fixture privada\n');
  const index = readFileSync(join(root, '.git/index'));
  const diagnostics = checkLocalIgnore(planLocalIgnore(sub));
  assert.equal(diagnostics.ok, false);
  assert.ok(diagnostics.trackedOutputs.includes(alias), JSON.stringify(diagnostics.trackedOutputs));
  const canonical = '.claude/auth.json';
  const expected = { [canonical]: createHash('sha256').update('gerado\n').digest('hex') };
  assert.ok(planUntrack(sub, expected).conflicts.includes(canonical));
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('update aninhado preserva índice com prefixo de caixa diferente', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-nested-update-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const sub = join(root, 'SubProject'); mkdirSync(sub);
  const init = run(root, process.execPath, [bin, 'init', '--agents', 'codex', '--target', sub, '--json']);
  assert.equal(init.status, 0, init.stdout + init.stderr);
  const canonical = '.codex/commands/proximos-passos/COMMAND.md';
  rmSync(join(sub, canonical));
  stageSynthetic(root, `subproject/${canonical}`, 'conteúdo humano staged\n');
  const index = readFileSync(join(root, '.git/index'));
  const update = run(root, process.execPath, [bin, 'update', '--target', sub, '--force', '--json']);
  assert.equal(existsSync(join(sub, canonical)), false, update.stdout + update.stderr);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('sync direto bloqueia alias Unicode ẞ no índice', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-sharp-s-direct-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  const source = '.pbai4devs/skills/proximos-passos/SKILL.md';
  put(root, source, '---\nname: proximos-passos\ndescription: Antes.\n---\n\n# Antes\n');
  const execute = () => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  assert.equal(execute().exitCode, 0);
  const canonical = '.claude/skills/proximos-passos/SKILL.md', alias = '.claude/skills/proximos-paẞos/SKILL.md';
  const original = readFileSync(join(root, canonical));
  stageSynthetic(root, alias, 'conteúdo humano staged\n');
  const index = readFileSync(join(root, '.git/index'));
  put(root, source, '---\nname: proximos-passos\ndescription: Depois.\n---\n\n# Depois\n');
  assert.throws(execute, /indice|índice/i);
  assert.deepEqual(readFileSync(join(root, canonical)), original);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('sync preserva apontamento e índice com alias Unicode staged', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-unicode-sync-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  const source = '.pbai4devs/skills/sincronizar/SKILL.md';
  put(root, source, '---\nname: sincronizar\ndescription: Antes.\n---\n\n# Sincronizar\n');
  const syncFixture = () => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  assert.equal(syncFixture().exitCode, 0);
  const canonical = '.claude/skills/sincronizar/SKILL.md', alias = '.claude/skills/ſincronizar/SKILL.md';
  const original = readFileSync(join(root, canonical));
  put(root, alias, Buffer.concat([original, Buffer.from('\nConteúdo staged próprio.\n')])); git(root, 'add', '-f', alias);
  writeFileSync(join(root, canonical), original);
  const index = readFileSync(join(root, '.git/index')), aliasBytes = readFileSync(join(root, alias));
  put(root, source, '---\nname: sincronizar\ndescription: Depois.\n---\n\n# Sincronizar\n');
  assert.throws(syncFixture, /indice|índice/i);
  assert.deepEqual(readFileSync(join(root, canonical)), original);
  assert.deepEqual(readFileSync(join(root, alias)), aliasBytes);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('update não recria apontamento sobre alias Unicode staged', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-unicode-update-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const init = run(root, process.execPath, [bin, 'init', '--agents', 'codex', '--target', root, '--json']);
  assert.equal(init.status, 0, init.stdout + init.stderr);
  const canonical = '.codex/commands/sincronizar/COMMAND.md', alias = '.codex/commands/ſincronizar/COMMAND.md';
  put(root, alias, 'conteúdo humano staged\n'); git(root, 'add', '-f', alias);
  rmSync(join(root, canonical));
  const index = readFileSync(join(root, '.git/index'));
  const aliasBytes = existsSync(join(root, alias)) ? readFileSync(join(root, alias)) : null;
  const update = run(root, process.execPath, [bin, 'update', '--target', root, '--force', '--json']);
  assert.notEqual(update.status, 0, update.stdout + update.stderr);
  assert.equal(existsSync(join(root, canonical)), false);
  assert.deepEqual(existsSync(join(root, alias)) ? readFileSync(join(root, alias)) : null, aliasBytes);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('índice Git alternativo causa recusa antes de sync, update ou aplicação de plano', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-alternate-index-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); git(root, 'config', 'user.name', 'Teste'); git(root, 'config', 'user.email', 'teste@example.invalid');
  put(root, 'seed.txt', 'base\n'); git(root, 'add', 'seed.txt'); git(root, 'commit', '-qm', 'base');
  let result = run(root, process.execPath, [bin, 'init', '--agents', 'codex', '--target', root, '--json']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const pointer = '.codex/commands/sincronizar/COMMAND.md', file = join(root, pointer), original = readFileSync(file);
  const alternate = join(root, '.git/alternate-index'), altEnv = { ...env, GIT_INDEX_FILE: alternate };
  let gitResult = spawnSync('git', ['-C', root, 'read-tree', 'HEAD'], { env: altEnv, encoding: 'utf8' }); assert.equal(gitResult.status, 0, gitResult.stderr);
  writeFileSync(file, Buffer.concat([original, Buffer.from('\nConteúdo humano staged.\n')]));
  gitResult = spawnSync('git', ['-C', root, 'add', '-f', '--', pointer], { env: altEnv, encoding: 'utf8' }); assert.equal(gitResult.status, 0, gitResult.stderr);
  writeFileSync(file, original);
  const source = '.pbai4devs/commands/sincronizar/COMMAND.md';
  writeFileSync(join(root, source), readFileSync(join(root, source), 'utf8').replace('description:', 'description: alterada '));
  const watched = ['.git/index', '.git/alternate-index', '.git/config', '.git/info/exclude', pointer, source].map(path => join(root, path));
  const before = watched.map(path => readFileSync(path));
  const redirects = [['GIT_INDEX_FILE', alternate], ['git_index_file', alternate], ['GIT_DIR', join(root, '.git')], ['GIT_WORK_TREE', root], ['GIT_COMMON_DIR', join(root, '.git')]];
  for (const [key, value] of redirects) for (const args of [['init', '--agents', 'codex'], ['init', '--dry-run'], ['update', '--force'], ['sync', '--force'], ['sync', '--check'], ['doctor']]) {
    const polluted = { ...env, [key]: value };
    result = spawnSync(process.execPath, [bin, ...args, '--target', root, '--json'], { cwd: root, env: polluted, encoding: 'utf8', timeout: 120000, maxBuffer: 20 * 1024 * 1024 });
    assert.equal(result.status, 1, result.stdout + result.stderr); assert.equal(JSON.parse(result.stdout).error.code, 'E_GIT_ENV');
    watched.forEach((path, index) => assert.deepEqual(readFileSync(path), before[index], path));
  }
  result = spawnSync(process.execPath, [sync, '--root', root, '--force'], { cwd: root, env: altEnv, encoding: 'utf8', timeout: 120000 });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /Git redirecionado/);
  watched.forEach((path, index) => assert.deepEqual(readFileSync(path), before[index], path));
  const plan = planInstallation({ target: root, mode: 'update' });
  process.env.GIT_INDEX_FILE = alternate;
  try { assert.throws(() => applyPlan(plan), { code: 'E_GIT_ENV' }); }
  finally { delete process.env.GIT_INDEX_FILE; }
  watched.forEach((path, index) => assert.deepEqual(readFileSync(path), before[index], path));
});

test('filtragem de .local em qualquer caixa nunca remove ou desindexa arquivos humanos', { timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-private-local-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const paths = ['.claude/skills/.LoCaL/humano.md', '.pbai4devs/skills/.LoCaL/humano.md'];
  paths.forEach(path => put(root, path, '# Conteúdo próprio\n')); git(root, 'add', '-f', paths[0]);
  const index = readFileSync(join(root, '.git/index'));
  for (const args of [['init', '--agents', 'claude'], ['update', '--force'], ['sync']]) {
    const r = run(root, process.execPath, [bin, ...args, '--target', root, '--json']);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    for (const path of paths) assert.equal(readFileSync(join(root, path), 'utf8'), '# Conteúdo próprio\n');
    assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  }
  const statePath = join(root, '.pbai4devs/state/agentdevkit.json'), state = JSON.parse(readFileSync(statePath));
  const wrapper = readFileSync(join(root, '.claude/skills/preparar-dev/SKILL.md'));
  writeFileSync(join(root, paths[0]), wrapper);
  state.files[paths[0]] = createHash('sha256').update(wrapper).digest('hex');
  writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
  const direct = run(root, process.execPath, [sync, '--root', root, '--force']);
  assert.equal(direct.status, 0, direct.stdout + direct.stderr);
  assert.deepEqual(readFileSync(join(root, paths[0])), wrapper);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  const r = run(root, process.execPath, [bin, 'update', '--force', '--target', root, '--json']);
  assert.equal(r.status, 1, r.stdout + r.stderr); assert.equal(JSON.parse(r.stdout).error.code, 'E_STATE');
  assert.deepEqual(readFileSync(join(root, paths[0])), wrapper);
  assert.equal(readFileSync(join(root, paths[1]), 'utf8'), '# Conteúdo próprio\n');
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('consultas de init, update e verificações não executam fsmonitor configurado pelo usuário', { skip: process.platform === 'win32', timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-fsmonitor-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main'); git(root, 'config', 'user.name', 'Teste'); git(root, 'config', 'user.email', 'teste@example.invalid');
  put(root, 'tracked.txt', 'base\n'); git(root, 'add', 'tracked.txt'); git(root, 'commit', '-qm', 'base');
  const sentinel = join(root, 'fsmonitor-invocado'), hook = join(root, 'fsmonitor.sh');
  writeFileSync(hook, `#!/bin/sh\nprintf chamado > '${sentinel}'\nexit 0\n`); chmodSync(hook, 0o755);
  git(root, 'config', '--local', 'core.fsmonitor', hook);
  git(root, 'status', '--short'); assert.ok(existsSync(sentinel), 'o hook de teste precisa ser executável'); rmSync(sentinel);
  const files = ['.git/config', '.git/index', '.git/info/exclude'], before = files.map(path => readFileSync(join(root, path)));
  for (const args of [['init', '--agents', 'claude'], ['update'], ['sync', '--check'], ['doctor']]) {
    const r = run(root, process.execPath, [bin, ...args, '--target', root, '--json']); assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(existsSync(sentinel), false, args.join(' '));
    files.forEach((path, i) => assert.deepEqual(readFileSync(join(root, path)), before[i], `${args[0]} alterou ${path}`));
  }
  const direct = run(root, process.execPath, [sync, '--root', root, '--check']); assert.equal(direct.status, 0, direct.stdout + direct.stderr);
  assert.equal(existsSync(sentinel), false);
});
