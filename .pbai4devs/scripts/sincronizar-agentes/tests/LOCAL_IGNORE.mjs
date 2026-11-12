import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { projectRoot } from '../../lib/runtime.mjs';
import { planLocalIgnore, applyLocalIgnore, checkLocalIgnore, planUntrack, applyUntrack, restoreUntrack, assertLocalIgnoreUnchanged } from '../../lib/gitignore.mjs';

function fixture(t, canonical = true) {
  const created = mkdtempSync(join(tmpdir(), 'agentdevkit-ignore-'));
  const root = canonical ? realpathSync.native(created) : created;
  t.after(() => rmSync(root, { recursive: true, force: true }));
  put(root, '.pbai4devs/templates/gitignore/local.ignore', readFileSync(join(projectRoot, '.pbai4devs/templates/gitignore/local.ignore')));
  return root;
}
function put(root, path, content) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), content); }
function git(root, args, input) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', input });
  assert.ifError(result.error); assert.equal(result.status, 0, result.stderr); return result.stdout;
}

test('fallback protege outputs antes de git init e migra para exclude preservando regras', t => {
  const root = fixture(t), outputs = ['.github/skills/generated/SKILL.md', '.vscode/.gitignore', 'AGENTS.md'];
  put(root, '.gitignore', '# Regras humanas\n*.own-cache\n');
  const plan = planLocalIgnore(root, { outputs });
  assert.equal(plan.status, 'fallback'); assert.equal(checkLocalIgnore(plan).ok, false);
  applyLocalIgnore(plan);
  assert.equal(checkLocalIgnore(planLocalIgnore(root, { outputs })).ok, true);
  assert.match(readFileSync(join(root, '.gitignore'), 'utf8'), /^# Regras humanas\n\*\.own-cache\n/);
  git(root, ['init', '-q']);
  put(root, '.git/info/exclude', '# Exclusoes humanas\n*.local-backup\n');
  applyLocalIgnore(planLocalIgnore(root, { outputs }));
  assert.doesNotMatch(readFileSync(join(root, '.gitignore'), 'utf8'), /AGENTDEVKIT LOCAL/);
  assert.match(readFileSync(join(root, '.git/info/exclude'), 'utf8'), /^# Exclusoes humanas/);
  assert.equal(checkLocalIgnore(planLocalIgnore(root, { outputs })).ok, true);
  for (const path of outputs) put(root, path, 'gerado\n');
  for (const path of ['.github/workflows/ci.yml', '.github/ISSUE_TEMPLATE/bug.yml', '.vscode/settings.json', '.github/skills/human/SKILL.md']) put(root, path, 'humano\n');
  git(root, ['add', '--all']);
  const tracked = git(root, ['ls-files', '-z']).split('\0').filter(Boolean);
  for (const path of outputs) assert.equal(tracked.includes(path), false, path);
  for (const path of ['.github/workflows/ci.yml', '.github/ISSUE_TEMPLATE/bug.yml', '.vscode/settings.json', '.github/skills/human/SKILL.md']) assert.ok(tracked.includes(path), path);
});

test('prefixos e projetos distintos preservam blocos locais independentes', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const template = readFileSync(join(root, '.pbai4devs/templates/gitignore/local.ignore'));
  for (const name of ['first space', 'second']) {
    const child = join(root, name); put(child, '.pbai4devs/templates/gitignore/local.ignore', template);
    applyLocalIgnore(planLocalIgnore(child, { outputs: ['.github/prompts/a[1].md'] }));
    assert.equal(checkLocalIgnore(planLocalIgnore(child, { outputs: ['.github/prompts/a[1].md'] })).ok, true);
  }
  const content = readFileSync(join(root, '.git/info/exclude'), 'utf8');
  assert.equal((content.match(/# BEGIN AGENTDEVKIT LOCAL/g) || []).length, 2);
  assert.match(content, /first\\ space/); assert.match(content, /second/);
});

test('check identifica negação humana e outputs rastreados sem alterar o índice', t => {
  const root = fixture(t), outputs = ['generated.md']; git(root, ['init', '-q']);
  put(root, 'generated.md', 'gerado'); git(root, ['add', 'generated.md']);
  applyLocalIgnore(planLocalIgnore(root, { outputs }));
  put(root, '.gitignore', '!/generated.md\n');
  const result = checkLocalIgnore(planLocalIgnore(root, { outputs }));
  assert.equal(result.ok, false); assert.deepEqual(result.missing, outputs); assert.deepEqual(result.trackedOutputs, outputs);
  assert.equal(git(root, ['ls-files', 'generated.md']).trim(), 'generated.md');
});

test('planejamento é somente leitura e aplicação detecta mudança concorrente', t => {
  const root = fixture(t); put(root, '.gitignore', 'antes\r\n');
  const plan = planLocalIgnore(root, { outputs: ['generated.md'] });
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), 'antes\r\n');
  put(root, '.gitignore', 'depois\r\n');
  assert.throws(() => applyLocalIgnore(plan), /alterada apos planejar/);
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), 'depois\r\n');
  for (const path of ['../outside', '/absolute', 'line\nname', 'a\\b']) assert.throws(() => planLocalIgnore(root, { outputs: [path] }), /invalida/);
});

test('desindexação preserva bytes e outros arquivos staged e recusa hash alterado', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  put(root, 'generated [1].md', 'gerado\n'); put(root, 'human.md', 'humano\n');
  git(root, ['add', '--all']);
  const hash = createHash('sha256').update('gerado\n').digest('hex');
  const plan = planUntrack(root, { 'generated [1].md': hash });
  assert.deepEqual(plan.paths, ['generated [1].md']);
  assert.deepEqual(applyUntrack(plan).removed, plan.paths);
  assert.equal(readFileSync(join(root, 'generated [1].md'), 'utf8'), 'gerado\n');
  assert.equal(git(root, ['ls-files', 'human.md']).trim(), 'human.md');
  git(root, ['add', 'generated [1].md']);
  const pending = planUntrack(root, { 'generated [1].md': hash });
  put(root, 'generated [1].md', 'editado\n');
  assert.throws(() => applyUntrack(pending), /mudou/);
  assert.equal(git(root, ['ls-files', 'generated [1].md']).trim(), 'generated [1].md');
});

test('plano de instalação em alvo inexistente não cria arquivos', t => {
  const root = fixture(t);
  const target = join(root, 'new project', 'nested');
  const fallback = planLocalIgnore(target, { outputs: ['AGENTS.md'] });
  assert.equal(fallback.status, 'fallback'); assert.equal(existsSync(target), false);
  git(root, ['init', '-q']);
  const plan = planLocalIgnore(target, { outputs: ['AGENTS.md'] });
  assert.equal(plan.status, 'git'); assert.equal(existsSync(target), false);
  assert.equal(plan.location.prefix, 'new project/nested');
  assert.match(plan.edits[0].after, /new\\ project\/nested\/AGENTS.md/);
});

test('desindexação não descarta edição humana staged com workingtree restaurado', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  put(root, 'generated.md', 'edição humana\n'); git(root, ['add', 'generated.md']);
  put(root, 'generated.md', 'gerado\n');
  const hash = createHash('sha256').update('gerado\n').digest('hex');
  const plan = planUntrack(root, { 'generated.md': hash });
  assert.deepEqual(plan.paths, []); assert.deepEqual(plan.conflicts, ['generated.md']);
  assert.throws(() => applyUntrack(plan), /alteracoes/);
  assert.equal(git(root, ['show', ':generated.md']), 'edição humana\n');
  assert.equal(readFileSync(join(root, 'generated.md'), 'utf8'), 'gerado\n');
});

test('raízes dedicadas são locais, enquanto configurações de GitHub e VS Code são fontes', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  applyLocalIgnore(planLocalIgnore(root));
  put(root, '.codex/config.toml', 'local'); put(root, '.claude/settings.json', 'local');
  put(root, '.github/settings.json', 'fonte'); put(root, '.vscode/settings.json', 'fonte');
  git(root, ['add', '--all']);
  const tracked = git(root, ['ls-files', '-z']).split('\0');
  assert.equal(tracked.includes('.codex/config.toml'), false);
  assert.equal(tracked.includes('.claude/settings.json'), false);
  assert.ok(tracked.includes('.github/settings.json')); assert.ok(tracked.includes('.vscode/settings.json'));
});

test('artefatos vêm da política compartilhada e não entram na lista de outputs', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  put(root, '.agent-tests/human.txt', 'evidência humana'); git(root, ['add', '-f', '.agent-tests/human.txt']);
  const plan = planLocalIgnore(root, { outputs: ['AGENTS.md'] });
  assert.ok(plan.artifactProbes.some(path => path.startsWith('.agent-tests/')));
  assert.ok(plan.artifactProbes.some(path => path.startsWith('.agentdevkit-ignore-probes/')));
  assert.ok(plan.paths.every(path => !plan.artifactProbes.includes(path)));
  assert.ok(!plan.trackedOutputs.includes('.agent-tests/human.txt'));
  applyLocalIgnore(plan);
  for (const path of ['.agent-tests/x', 'TMP/x', 'nested/TeMp/x', '.PlAyWrIgHt-McP/x', 'nested/playwright-report/x', 'TEST-RESULTS/x', 'nested/TestResults/x', 'BLOB-REPORT/x']) {
    assert.equal(git(root, ['check-ignore', '--no-index', path]).trim(), path);
  }
  assert.equal(git(root, ['ls-files', '.agent-tests/human.txt']).trim(), '.agent-tests/human.txt');
  assert.equal(readFileSync(join(root, '.agent-tests/human.txt'), 'utf8'), 'evidência humana');
  assert.equal(checkLocalIgnore(planLocalIgnore(root, { outputs: ['AGENTS.md'] })).ok, true);
});

test('regras de artefatos são limitadas ao projeto dentro do monorepo', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const child = join(root, 'apps', 'my project'); mkdirSync(child, { recursive: true });
  applyLocalIgnore(planLocalIgnore(child, { outputs: ['AGENTS.md'] }));
  for (const path of ['apps/my project/.agent-tests/x', 'apps/my project/nested/.Playwright-MCP/x', 'apps/my project/sub/test-results/x']) {
    assert.equal(git(root, ['check-ignore', '--no-index', path]).trim(), path);
  }
  for (const path of ['apps/other/.agent-tests/x', 'apps/other/tmp/x', '.agent-tests/x']) {
    const result = spawnSync('git', ['-C', root, 'check-ignore', '--no-index', path], { encoding: 'utf8' });
    assert.equal(result.status, 1, path + result.stderr);
  }
});

test('ignore global não mascara a ausência das regras locais de artefatos', t => {
  const root = fixture(t), outside = fixture(t); git(root, ['init', '-q']);
  put(outside, 'global.ignore', '*\n');
  git(root, ['config', 'core.excludesFile', join(outside, 'global.ignore')]);
  const plan = planLocalIgnore(root, { outputs: ['AGENTS.md'] });
  assert.equal(plan.edits.length, 1);
  const missing = checkLocalIgnore({ ...plan, edits: [] });
  assert.ok(missing.missing.some(path => path.startsWith('.agent-tests/')));
  applyLocalIgnore(plan);
  assert.equal(checkLocalIgnore(planLocalIgnore(root, { outputs: ['AGENTS.md'] })).ok, true);
});

test('negação humana de artefatos bloqueia aplicação sem modificar regras ou índice', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const human = '!/.agent-tests/**\n'; put(root, '.gitignore', human);
  const exclude = readFileSync(join(root, '.git/info/exclude'));
  const plan = planLocalIgnore(root, { outputs: ['AGENTS.md'] });
  assert.ok(checkLocalIgnore(plan).missing.some(path => path.startsWith('.agent-tests/')));
  assert.throws(() => applyLocalIgnore(plan), /Regras humanas/);
  assert.deepEqual(readFileSync(join(root, '.git/info/exclude')), exclude);
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), human);
});

test('probes reconhecem exceções humanas para nomes reais de Playwright', async t => {
  for (const path of ['.playwright-mcp', 'playwright-report', 'playwright/.cache']) await t.test(path, subtest => {
    const root = fixture(subtest); git(root, ['init', '-q']);
    const prefixes = path.split('/').map((_part, index, parts) => '!/' + parts.slice(0, index + 1).join('/') + '/');
    const human = [...prefixes, `!/${path}/**`, ''].join('\n'); put(root, '.gitignore', human);
    const before = readFileSync(join(root, '.git/info/exclude'));
    const plan = planLocalIgnore(root, { outputs: ['AGENTS.md'] });
    assert.ok(checkLocalIgnore(plan).missing.some(probe => probe.startsWith(path + '/')));
    assert.throws(() => applyLocalIgnore(plan), /Regras humanas/);
    assert.deepEqual(readFileSync(join(root, '.git/info/exclude')), before);
  });
});

test('milhares de caminhos usam stdin e não ampliam metadata de área já ignorada', t => {
  const root = fixture(t); git(root, ['init', '-q']); put(root, '.gitignore', '/ignored/\n');
  const before = readFileSync(join(root, '.git/info/exclude'), 'utf8');
  const target = join(root, 'ignored'); mkdirSync(target);
  const outputs = Array.from({ length: 1500 }, (_, index) => `.github/skills/generated-${index}-${'x'.repeat(45)}/SKILL.md`);
  const plan = planLocalIgnore(target, { outputs });
  assert.deepEqual(plan.edits, []); assert.equal(checkLocalIgnore(plan).ok, true);
  applyLocalIgnore(plan); assert.equal(readFileSync(join(root, '.git/info/exclude'), 'utf8'), before);
  assert.deepEqual(planUntrack(target, Object.fromEntries(outputs.map(path => [path, 'a'.repeat(64)]))).paths, []);
});

test('rollback restaura somente entradas removidas e preserva estágio posterior', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  put(root, 'generated.md', 'gerado\n'); put(root, 'second.md', 'original\n'); put(root, 'human.md', 'humano\n');
  git(root, ['add', '--all']);
  const digest = value => createHash('sha256').update(value).digest('hex');
  const plan = planUntrack(root, { 'generated.md': digest('gerado\n'), 'second.md': digest('original\n') });
  applyUntrack(plan);
  put(root, 'second.md', 'staged depois\n'); git(root, ['add', 'second.md']);
  put(root, 'human.md', 'humano depois\n'); git(root, ['add', 'human.md']);
  const result = restoreUntrack(plan);
  assert.deepEqual(result.restored, ['generated.md']); assert.deepEqual(result.preserved, ['second.md']);
  assert.equal(git(root, ['show', ':generated.md']), 'gerado\n');
  assert.equal(git(root, ['show', ':second.md']), 'staged depois\n');
  assert.equal(git(root, ['show', ':human.md']), 'humano depois\n');
});

test('rollback respeita lock alheio e preflight detecta metadata alterada', t => {
  const root = fixture(t); git(root, ['init', '-q']); put(root, 'generated.md', 'gerado\n'); git(root, ['add', 'generated.md']);
  const plan = planUntrack(root, { 'generated.md': createHash('sha256').update('gerado\n').digest('hex') });
  applyUntrack(plan); put(root, '.git/index.lock', 'lock alheio');
  assert.throws(() => restoreUntrack(plan), /EEXIST/);
  assert.equal(readFileSync(join(root, '.git/index.lock'), 'utf8'), 'lock alheio');
  const metadata = planLocalIgnore(root, { outputs: ['generated.md'] });
  put(root, '.git/info/exclude', 'mudou\n');
  assert.throws(() => assertLocalIgnoreUnchanged(metadata), /alterada apos planejar/);
});

test('rollback em projeto aninhado restaura o caminho relativo à raiz Git', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  put(root, 'nested/generated.md', 'gerado\n'); put(root, 'human.md', 'humano\n'); git(root, ['add', '--all']);
  const child = join(root, 'nested');
  const plan = planUntrack(child, { 'generated.md': createHash('sha256').update('gerado\n').digest('hex') });
  applyUntrack(plan); restoreUntrack(plan);
  assert.equal(git(root, ['show', ':nested/generated.md']), 'gerado\n');
  assert.equal(git(root, ['show', ':human.md']), 'humano\n');
});

test('negação humana é detectada antes de aplicar novas exclusões e permanece intacta', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  put(root, '.gitignore', '!/AGENTS.md\n');
  const before = readFileSync(join(root, '.git/info/exclude'), 'utf8');
  const plan = planLocalIgnore(root, { outputs: ['AGENTS.md'] });
  assert.equal(plan.edits.length, 1);
  assert.deepEqual(checkLocalIgnore(plan).missing, ['AGENTS.md']);
  assert.throws(() => applyLocalIgnore(plan), /Regras humanas/);
  assert.equal(readFileSync(join(root, '.git/info/exclude'), 'utf8'), before);
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), '!/AGENTS.md\n');
});

test('cliente não selecionado com symlink próprio não é atravessado pelo probe', t => {
  const root = fixture(t), outside = fixture(t); git(root, ['init', '-q']);
  try { symlinkSync(outside, join(root, '.opencode'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('Sem permissão para criar symlink.'); return; } throw error; }
  const before = readdirSync(outside);
  applyLocalIgnore(planLocalIgnore(root, { outputs: ['AGENTS.md'] }));
  assert.equal(checkLocalIgnore(planLocalIgnore(root, { outputs: ['AGENTS.md'] })).ok, true);
  assert.deepEqual(readdirSync(outside), before);
});

test('preflight dispensa somente regras de bloco substituído com hash válido', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const block = '# BEGIN AGENT IGNORE\r\n!/generated.md\r\n# END AGENT IGNORE';
  put(root, '.github/.gitignore', `# Humano\r\n${block}\r\n!/human.md\r\n`);
  const plan = planLocalIgnore(root, { outputs: ['.github/generated.md', '.github/human.md'] });
  const replacement = { path: join(root, '.github/.gitignore'), firstLine: 2, lastLine: 4, sha256: createHash('sha256').update(block).digest('hex') };
  assert.deepEqual(checkLocalIgnore(plan).missing, ['.github/generated.md', '.github/human.md']);
  assert.deepEqual(checkLocalIgnore(plan, { replacedBlocks: [replacement] }).missing, ['.github/human.md']);
  assert.throws(() => checkLocalIgnore(plan, { replacedBlocks: [{ ...replacement, sha256: '0'.repeat(64) }] }), /Bloco de ignore mudou/);
  assert.throws(() => applyLocalIgnore(plan), /Regras humanas/);
  assert.equal(readFileSync(join(root, '.github/.gitignore'), 'utf8'), `# Humano\r\n${block}\r\n!/human.md\r\n`);
});

test('aliases ancestrais usam caminhos nativos em exclusão, desindexação e rollback', t => {
  const base = fixture(t), project = join(base, 'project'), alias = join(base, 'alias');
  mkdirSync(project);
  try { symlinkSync(base, alias, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('Sem permissão para criar alias.'); return; } throw error; }
  git(project, ['init', '-q']);
  const native = realpathSync.native;
  const canonical = native(project), viaAlias = join(alias, 'project');
  let nativeCalls = 0;
  t.mock.method(realpathSync, 'native', (...args) => { nativeCalls++; return native(...args); });
  const plan = planLocalIgnore(viaAlias, { outputs: ['generated.md'] });
  assert.equal(plan.root, canonical); assert.equal(plan.location.top, canonical); assert.equal(plan.location.prefix, '');
  applyLocalIgnore(plan);
  assert.equal(planLocalIgnore(project, { outputs: ['generated.md'] }).edits.length, 0);
  const future = planLocalIgnore(join(viaAlias, 'future', 'nested'), { outputs: ['generated.md'] });
  assert.equal(future.root, join(canonical, 'future', 'nested'));
  assert.equal(future.location.prefix, 'future/nested'); assert.equal(existsSync(future.root), false);
  put(project, 'generated.md', 'gerado\n'); git(project, ['add', '-f', 'generated.md']);
  const untrack = planUntrack(viaAlias, { 'generated.md': createHash('sha256').update('gerado\n').digest('hex') });
  assert.equal(untrack.root, canonical); applyUntrack(untrack); restoreUntrack(untrack);
  assert.equal(git(project, ['show', ':generated.md']), 'gerado\n');
  assert.ok(nativeCalls > 3, 'As comparações devem usar realpathSync.native.');
});

test('canonicalização recorre a realpath quando operação nativa não é suportada', t => {
  const root = fixture(t), expected = realpathSync(root);
  t.mock.method(realpathSync, 'native', () => { throw Object.assign(new Error('Sem suporte'), { code: 'ENOSYS' }); });
  const plan = planLocalIgnore(join(root, 'future'), { outputs: ['generated.md'] });
  assert.equal(plan.root, join(expected, 'future')); assert.equal(existsSync(plan.root), false);
});

test('Windows normaliza o alias temporário 8.3 antes de comparar a raiz Git', { skip: process.platform !== 'win32' }, t => {
  const root = fixture(t, false), canonical = realpathSync.native(root);
  git(root, ['init', '-q']);
  const plan = planLocalIgnore(root, { outputs: ['generated.md'] });
  assert.equal(plan.root, canonical); assert.equal(plan.location.top, canonical); assert.equal(plan.location.prefix, '');
  const future = planLocalIgnore(join(root, 'future'), { outputs: ['generated.md'] });
  assert.equal(future.root, join(canonical, 'future')); assert.equal(future.location.prefix, 'future');
  put(root, 'generated.md', 'gerado\n'); git(root, ['add', 'generated.md']);
  const untrack = planUntrack(root, { 'generated.md': createHash('sha256').update('gerado\n').digest('hex') });
  applyUntrack(untrack); restoreUntrack(untrack);
  assert.equal(git(root, ['show', ':generated.md']), 'gerado\n');
});

test('canonicalização do índice mantém rejeição de symlink antes de resolver o destino', t => {
  const root = fixture(t); git(root, ['init', '-q']); put(root, 'generated.md', 'gerado\n'); git(root, ['add', 'generated.md']);
  const plan = planUntrack(root, { 'generated.md': createHash('sha256').update('gerado\n').digest('hex') });
  applyUntrack(plan);
  const index = join(root, '.git/index'), saved = join(root, '.git/saved-index');
  renameSync(index, saved);
  try { symlinkSync(saved, index); }
  catch (error) { renameSync(saved, index); if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('Sem permissão para criar symlink.'); return; } throw error; }
  const before = readFileSync(saved);
  assert.throws(() => restoreUntrack(plan), /Link simbolico/);
  assert.throws(() => checkLocalIgnore({ root, location: null, paths: [], edits: [], trackedOutputs: [] }, {
    replacedBlocks: [{ path: index, firstLine: 1, lastLine: 1, sha256: '0'.repeat(64) }],
  }), /Link simbolico/);
  assert.deepEqual(readFileSync(saved), before);
});

test('worktree usa a raiz nativa, exclude comum e seu próprio índice', t => {
  const root = fixture(t); git(root, ['init', '-q']); put(root, 'seed.txt', 'base\n'); git(root, ['add', 'seed.txt']);
  git(root, ['-c', 'user.name=Test User', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=disabled-hooks', 'commit', '-q', '-m', 'test: worktree fixture']);
  const linked = join(root, 'linked-worktree');
  git(root, ['worktree', 'add', '-q', '-b', 'fixture-linked', linked]);
  const plan = planLocalIgnore(linked, { outputs: ['generated.md'] });
  assert.equal(plan.root, realpathSync.native(linked));
  assert.equal(plan.location.top, realpathSync.native(linked));
  assert.equal(plan.location.exclude, realpathSync.native(join(root, '.git/info/exclude')));
  applyLocalIgnore(plan); assert.equal(checkLocalIgnore(planLocalIgnore(linked, { outputs: ['generated.md'] })).ok, true);
  put(linked, 'generated.md', 'gerado\n'); git(linked, ['add', '-f', 'generated.md']);
  const untrack = planUntrack(linked, { 'generated.md': createHash('sha256').update('gerado\n').digest('hex') });
  applyUntrack(untrack); restoreUntrack(untrack);
  assert.equal(git(linked, ['show', ':generated.md']), 'gerado\n');
  assert.equal(git(root, ['ls-files', 'generated.md']), '');
});
