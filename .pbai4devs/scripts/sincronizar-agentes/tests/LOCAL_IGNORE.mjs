import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
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

test('sem Git preserva ignore e informa pendência; após git init protege outputs', t => {
  const root = fixture(t), outputs = ['.github/skills/generated/SKILL.md', '.vscode/.gitignore', 'AGENTS.md'];
  put(root, '.gitignore', '# Regras humanas\n*.own-cache\n');
  const plan = planLocalIgnore(root, { outputs });
  assert.equal(plan.status, 'no-git'); assert.equal(checkLocalIgnore(plan).ok, false);
  applyLocalIgnore(plan);
  assert.equal(checkLocalIgnore(planLocalIgnore(root, { outputs })).ok, false);
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), '# Regras humanas\n*.own-cache\n');
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
  for (const path of ['.github/workflows/ci.yml', '.github/ISSUE_TEMPLATE/bug.yml', '.vscode/settings.json', '.github/skills/human/SKILL.md']) assert.equal(tracked.includes(path), false, path);
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

test('projeto aninhado sob ancestral ignorado falha antes de alterar índices ou excludes', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  put(root, '.gitignore', '/.github/\n');
  const child = join(root, '.github/project');
  put(child, '.gitignore', '!/.claude/\n');
  put(child, '.claude/custom.md', 'instruções próprias\n');
  const exclude = readFileSync(join(root, '.git/info/exclude'));
  const index = git(root, ['ls-files', '--stage', '-z']);
  const plan = planLocalIgnore(child, { outputs: ['.claude/custom.md'] });
  assert.ok(checkLocalIgnore(plan).missing.some(value => value.includes('Ancestral Git ignorado: .github/')));
  assert.throws(() => applyLocalIgnore(plan), /Ancestral Git ignorado/);
  assert.deepEqual(readFileSync(join(root, '.git/info/exclude')), exclude);
  assert.equal(git(root, ['ls-files', '--stage', '-z']), index);
  assert.equal(readFileSync(join(child, '.claude/custom.md'), 'utf8'), 'instruções próprias\n');
  put(root, '.gitignore', '/.github/\n!/.github/\n');
  const opened = planLocalIgnore(child, { outputs: ['.claude/custom.md'] });
  applyLocalIgnore(opened);
  assert.equal(checkLocalIgnore(planLocalIgnore(child, { outputs: ['.claude/custom.md'] })).ok, true);
  assert.equal(spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '-q', '.github/project/.claude/custom.md']).status, 1);
});

test('opt-in aninhado respeita também excludesFile configurado pelo usuário', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  put(root, 'global-ignore', '/.private/\n');
  git(root, ['config', '--local', 'core.excludesFile', join(root, 'global-ignore')]);
  const child = join(root, '.private/project');
  put(child, '.gitignore', '!/.claude/\n');
  put(child, '.claude/custom.md', 'instruções próprias\n');
  const before = readFileSync(join(root, '.git/info/exclude'));
  const plan = planLocalIgnore(child);
  assert.ok(checkLocalIgnore(plan).missing.some(value => value.includes('Ancestral Git ignorado: .private/')));
  assert.throws(() => applyLocalIgnore(plan), /Ancestral Git ignorado/);
  assert.deepEqual(readFileSync(join(root, '.git/info/exclude')), before);
  assert.equal(readFileSync(join(child, '.claude/custom.md'), 'utf8'), 'instruções próprias\n');
});

test('check identifica negação humana sem alterar nem diagnosticar conteúdo rastreado legítimo', t => {
  const root = fixture(t), outputs = ['generated.md']; git(root, ['init', '-q']);
  put(root, 'generated.md', 'gerado'); git(root, ['add', 'generated.md']);
  applyLocalIgnore(planLocalIgnore(root, { outputs }));
  put(root, '.gitignore', '!/generated.md\n');
  const result = checkLocalIgnore(planLocalIgnore(root, { outputs }));
  assert.equal(result.ok, false); assert.deepEqual(result.missing, outputs); assert.deepEqual(result.trackedOutputs, []);
  assert.equal(git(root, ['ls-files', 'generated.md']).trim(), 'generated.md');
});

test('exceções de templates preservam o ignore raiz e protegem dados privados', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  git(root, ['config', 'core.ignorecase', 'false']);
  const original = '# Regras do projeto\n.env.*\n!.env.example\n!.env.*.example\n';
  put(root, '.gitignore', original); git(root, ['add', '.gitignore']);
  const index = git(root, ['ls-files', '--stage', '-z']);
  const plan = planLocalIgnore(root);
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), original);
  assert.equal(existsSync(join(root, '.cursor')), false);
  applyLocalIgnore(plan);
  const updated = readFileSync(join(root, '.gitignore'), 'utf8');
  assert.equal(updated, original);
  assert.equal(git(root, ['ls-files', '--stage', '-z']), index);
  assert.equal(existsSync(join(root, '.cursor')), false);
  assert.equal(checkLocalIgnore(planLocalIgnore(root)).ok, true);
  put(root, '.cursor/.CACHE/private.json', 'local');
  put(root, '.cursor/.cache/private.json', 'local');
  put(root, '.cursor/human.md', 'human');
  assert.ok(git(root, ['check-ignore', '--no-index', '.cursor/.CACHE/private.json']).includes('.cursor/.CACHE/private.json'));
  assert.ok(git(root, ['check-ignore', '--no-index', '.cursor/.cache/private.json']).includes('.cursor/.cache/private.json'));
  const visible = spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '-q', '.cursor/human.md']);
  assert.equal(visible.status, 0);
  applyLocalIgnore(planLocalIgnore(root));
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), updated);
  put(root, '.gitignore', updated + '# edição humana posterior\n');
  assert.equal(checkLocalIgnore(planLocalIgnore(root)).ok, true);
});

test('bloco legado na raiz pertence ao projeto e permanece intacto', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const original = '# BEGIN AGENTDEVKIT PRIVATE legado\n# edição humana\n# END AGENTDEVKIT PRIVATE legado\n';
  put(root, '.gitignore', original);
  applyLocalIgnore(planLocalIgnore(root));
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), original);
});

test('negação com caixa mista não expõe cache em Git sensível a maiúsculas', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  git(root, ['config', 'core.ignorecase', 'false']);
  put(root, '.gitignore', '!*.CaChE/\n');
  put(root, '.cursor/.CaChE/private.json', 'local');
  assert.throws(() => applyLocalIgnore(planLocalIgnore(root)), /Regras humanas/);
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), '!*.CaChE/\n');
});

test('negações literais e com caixa mista não expõem estado privado', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  git(root, ['config', 'core.ignorecase', 'false']);
  put(root, '.gitignore', '!*.LoCaL/\n!/.cursor/.env.production\n');
  for (const path of ['.cursor/.LoCaL/private.json', '.cursor/.env.production']) put(root, path, 'privado');
  assert.throws(() => applyLocalIgnore(planLocalIgnore(root)), /Regras humanas/);
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), '!*.LoCaL/\n!/.cursor/.env.production\n');
});

test('negação na primeira linha com BOM preserva bytes e protege segredos', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const original = '\uFEFF!/.cursor/.env.production\r\n';
  put(root, '.gitignore', original); put(root, '.cursor/.env.production', 'privado');
  assert.throws(() => applyLocalIgnore(planLocalIgnore(root)), /Regras humanas/);
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), original);
});

test('negação humana posterior é informada sem reescrever a raiz', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  put(root, '.gitignore', '# humano\n'); applyLocalIgnore(planLocalIgnore(root));
  const path = join(root, '.gitignore');
  writeFileSync(path, readFileSync(path, 'utf8') + '!/.cursor/\n!/.cursor/.env.production\n');
  put(root, '.cursor/.env.production', 'privado');
  const plan = planLocalIgnore(root);
  assert.ok(checkLocalIgnore(plan).missing.includes('.cursor/.env.production'));
  assert.throws(() => applyLocalIgnore(plan), /Regras humanas/);
  assert.equal(readFileSync(path, 'utf8'), '# humano\n!/.cursor/\n!/.cursor/.env.production\n');
});

test('planejamento sem Git não modifica ignore nem edição humana posterior', t => {
  const root = fixture(t); put(root, '.gitignore', 'antes\r\n');
  const plan = planLocalIgnore(root, { outputs: ['generated.md'] });
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), 'antes\r\n');
  put(root, '.gitignore', 'depois\r\n');
  applyLocalIgnore(plan);
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
  assert.equal(fallback.status, 'no-git'); assert.equal(existsSync(target), false);
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

test('configurações humanas podem ser versionadas após exceção explícita', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  applyLocalIgnore(planLocalIgnore(root));
  put(root, '.codex/config.toml', 'local'); put(root, '.claude/settings.json', 'local');
  put(root, '.github/settings.json', 'fonte'); put(root, '.vscode/settings.json', 'fonte');
  put(root, '.gitignore', '!/.codex/\n!/.claude/\n!/.github/\n!/.vscode/\n');
  assert.equal(checkLocalIgnore(planLocalIgnore(root)).ok, true);
  git(root, ['add', '--all']);
  const tracked = git(root, ['ls-files', '-z']).split('\0');
  assert.equal(tracked.includes('.codex/config.toml'), true);
  assert.equal(tracked.includes('.claude/settings.json'), true);
  assert.ok(tracked.includes('.github/settings.json')); assert.ok(tracked.includes('.vscode/settings.json'));
});

test('exceções de raiz usam precedência real e mantêm credenciais ignoradas', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  put(root, '.gitignore', '!/.claude/\n!/.github/\n');
  put(root, '.claude/skills/team/SKILL.md', 'skill humana\n');
  put(root, '.claude/auth.json', 'segredo');
  put(root, '.github/workflows/ci.yml', 'workflow humano\n');
  put(root, '.vscode/settings.json', 'configuração humana\n');
  const original = readFileSync(join(root, '.gitignore'));
  const plan = planLocalIgnore(root, { outputs: ['.claude/skills/team/SKILL.md', '.github/workflows/ci.yml'] });
  assert.ok(plan.optedRoots.includes('.claude'));
  assert.ok(plan.optedRoots.includes('.github'));
  applyLocalIgnore(plan);
  assert.equal(checkLocalIgnore(planLocalIgnore(root)).ok, true);
  for (const path of ['.claude/skills/team/SKILL.md', '.github/workflows/ci.yml']) {
    assert.equal(spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '-q', path]).status, 1, path);
  }
  for (const path of ['.claude/auth.json', '.vscode/settings.json']) {
    assert.equal(spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '-q', path]).status, 0, path);
  }
  assert.deepEqual(readFileSync(join(root, '.gitignore')), original);
  put(root, '.gitignore', '!/.claude/\n/.claude/\n');
  const overridden = planLocalIgnore(root);
  assert.equal(overridden.optedRoots.includes('.claude'), false);
  assert.equal(spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '-q', '.claude/skills/team/SKILL.md']).status, 0);
  put(root, '.gitignore', '!/.claude/\n!/.claude/**\n');
  assert.throws(() => applyLocalIgnore(planLocalIgnore(root)), /Regras humanas/);
});

test('derivados e entradas legítimas já rastreados permanecem no índice com ou sem opt-in', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  put(root, '.claude/skills/team/SKILL.md', 'skill rastreada\n');
  put(root, '.github/workflows/ci.yml', 'workflow rastreado\n');
  put(root, 'AGENTS.md', 'instruções rastreadas\n');
  git(root, ['add', '--all']);
  const before = git(root, ['ls-files', '--stage', '-z']);
  const outputs = ['.claude/skills/team/SKILL.md', '.github/workflows/ci.yml', 'AGENTS.md'];
  applyLocalIgnore(planLocalIgnore(root, { outputs }));
  assert.equal(checkLocalIgnore(planLocalIgnore(root, { outputs })).ok, true);
  assert.equal(git(root, ['ls-files', '--stage', '-z']), before);
  put(root, '.gitignore', '!/.claude/\n');
  const opted = planLocalIgnore(root, { outputs });
  assert.ok(opted.optedRoots.includes('.claude'));
  applyLocalIgnore(opted);
  assert.equal(checkLocalIgnore(planLocalIgnore(root, { outputs })).ok, true);
  assert.equal(git(root, ['ls-files', '--stage', '-z']), before);
});

test('artefatos vêm da política compartilhada e rastreados são informados', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  put(root, '.agent-tests/human.txt', 'evidência humana'); git(root, ['add', '-f', '.agent-tests/human.txt']);
  const plan = planLocalIgnore(root, { outputs: ['AGENTS.md'] });
  assert.ok(plan.artifactProbes.some(path => path.startsWith('.agent-tests/')));
  assert.ok(plan.artifactProbes.some(path => path.startsWith('.agentdevkit-ignore-probes/')));
  assert.ok(plan.paths.every(path => !plan.artifactProbes.includes(path)));
  assert.ok(plan.trackedOutputs.includes('.agent-tests/human.txt'));
  applyLocalIgnore(plan);
  for (const path of ['.agent-tests/x', 'TMP/x', 'nested/TeMp/x', '.PlAyWrIgHt-McP/x', 'nested/playwright-report/x', 'TEST-RESULTS/x', 'nested/TestResults/x', 'BLOB-REPORT/x']) {
    assert.equal(git(root, ['check-ignore', '--no-index', path]).trim(), path);
  }
  assert.equal(git(root, ['ls-files', '.agent-tests/human.txt']).trim(), '.agent-tests/human.txt');
  assert.equal(readFileSync(join(root, '.agent-tests/human.txt'), 'utf8'), 'evidência humana');
  assert.equal(checkLocalIgnore(planLocalIgnore(root, { outputs: ['AGENTS.md'] })).ok, false);
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

test('milhares de caminhos usam stdin sem ampliar metadata de área já ignorada', t => {
  const root = fixture(t); git(root, ['init', '-q']); put(root, '.gitignore', '/ignored/\n');
  const before = readFileSync(join(root, '.git/info/exclude'), 'utf8');
  const target = join(root, 'ignored'); mkdirSync(target);
  const outputs = Array.from({ length: 1500 }, (_, index) => `generated-${index}-${'x'.repeat(45)}.md`);
  const plan = planLocalIgnore(target, { outputs });
  assert.ok(plan.paths.length >= 1500);
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
  assert.ok(plan.edits.some(edit => edit.path === join(root, '.git/info/exclude')));
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

test('preflight valida hash do bloco substituído sem impor exclusão sobre cliente optado', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const block = '# BEGIN AGENT IGNORE\r\n!/generated.md\r\n# END AGENT IGNORE';
  put(root, '.gitignore', '!/.github/\n');
  put(root, '.github/.gitignore', `# Humano\r\n${block}\r\n!/human.md\r\n`);
  const plan = planLocalIgnore(root, { outputs: ['.github/generated.md', '.github/human.md'] });
  const replacement = { path: join(root, '.github/.gitignore'), firstLine: 2, lastLine: 4, sha256: createHash('sha256').update(block).digest('hex') };
  assert.deepEqual(checkLocalIgnore(plan).missing, []);
  assert.deepEqual(checkLocalIgnore(plan, { replacedBlocks: [replacement] }).missing, []);
  assert.throws(() => checkLocalIgnore(plan, { replacedBlocks: [{ ...replacement, sha256: '0'.repeat(64) }] }), /Bloco de ignore mudou/);
  assert.doesNotThrow(() => applyLocalIgnore(plan));
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

test('exceções com nomes arbitrários de artefatos não passam por amostragem', t => {
  for (const [name, directory] of [['.playwright-custom', true], ['.playwright-report.json', false], ['playwright-e2e', true]]) {
    const root = fixture(t); git(root, ['init', '-q']);
    const human = `!/${name}${directory ? '/' : ''}\n${directory ? `!/${name}/**\n` : ''}`;
    put(root, '.gitignore', human);
    const before = readFileSync(join(root, '.git/info/exclude'));
    const plan = planLocalIgnore(root);
    assert.ok(checkLocalIgnore(plan).missing.some(path => path.startsWith(name)), name);
    assert.throws(() => applyLocalIgnore(plan), /Regras humanas/);
    assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), human);
    assert.deepEqual(readFileSync(join(root, '.git/info/exclude')), before);
  }
});

test('arquivo real reaberto por glob é detectado também se surgir após o plano', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  put(root, '.gitignore', '!/.playwright-report-*.json\n');
  const plan = planLocalIgnore(root), path = '.playwright-report-real.json';
  put(root, path, 'artefato local\n');
  assert.ok(checkLocalIgnore(plan).missing.includes(path));
  assert.throws(() => applyLocalIgnore(plan), /Regras humanas/);
  assert.equal(readFileSync(join(root, path), 'utf8'), 'artefato local\n');
});

test('negações globais e aninhadas não expõem futuros arquivos privados', t => {
  for (const [file, rule] of [['.gitignore', '!/.claude/s*.json'], ['.claude/.gitignore', '!s*.json'], ['.claude/.gitignore', '!/settings.local.json'], ['.pbai4devs/.gitignore', '!.playwright-*/'], ['.pbai4devs/module/.gitignore', '!.playwright-*/'], ['logs/.gitignore', '!.playwright-*/'], ['.gitignore', '!**/foo/s*.json'], ['.gitignore', '!**/foo/.playwright-*.png'], ['.gitignore', '!/docs/.playwright-*.png'], ['docs/.gitignore', '!.playwright-*/'], ['.gitignore', '!*.CaChE/'], ['.gitignore', '!/.playwright-*.png']]) {
    const root = fixture(t); git(root, ['init', '-q']);
    put(root, file, `\uFEFF${rule}\n`);
    const before = readFileSync(join(root, '.git/info/exclude'));
    const index = git(root, ['ls-files', '--stage', '-z']);
    const plan = planLocalIgnore(root);
    assert.ok(checkLocalIgnore(plan).missing.some(value => value.includes(rule)), rule);
    assert.throws(() => applyLocalIgnore(plan), /Regras humanas/);
    assert.deepEqual(readFileSync(join(root, '.git/info/exclude')), before);
    assert.equal(git(root, ['ls-files', '--stage', '-z']), index);
    assert.equal(readFileSync(join(root, file), 'utf8'), `\uFEFF${rule}\n`);
  }
});

test('glob ancestral do subprojeto é detectado antes de alterar o exclude', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const child = join(root, 'packages/app'); mkdirSync(child, { recursive: true });
  put(root, '.gitignore', '!/packages/app/.claude/s*.json\n');
  const before = readFileSync(join(root, '.git/info/exclude'));
  const plan = planLocalIgnore(child);
  assert.ok(checkLocalIgnore(plan).missing.some(value => value.includes('s*.json')));
  assert.throws(() => applyLocalIgnore(plan), /Regras humanas/);
  assert.deepEqual(readFileSync(join(root, '.git/info/exclude')), before);
});

test('dependências já ignoradas não causam conflito, mas ignores visíveis são verificados', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  put(root, '.gitignore', 'node_modules/\n');
  put(root, 'node_modules/pacote/.gitignore', '!.playwright-*/\n');
  assert.equal(checkLocalIgnore(planLocalIgnore(root)).missing.length, 0);
  put(root, '.gitignore', '# dependências visíveis\n');
  assert.ok(checkLocalIgnore(planLocalIgnore(root)).missing.some(value => value.includes('!.playwright-*/')));
});

test('bloco de outra worktree não bloqueia a política local de clientes', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const old = '# BEGIN AGENTDEVKIT LOCAL 0123456789abcdef\n/.claude/\n# END AGENTDEVKIT LOCAL 0123456789abcdef\n';
  put(root, '.git/info/exclude', old);
  const plan = planLocalIgnore(root);
  assert.equal(checkLocalIgnore(plan).missing.length, 0);
  assert.doesNotThrow(() => applyLocalIgnore(plan));
  assert.ok(readFileSync(join(root, '.git/info/exclude'), 'utf8').startsWith(old));
});

test('artefatos já versionados são informados sem alterar o índice', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const artifacts = ['.playwright-mcp/trace.zip', 'playwright-report/index.html', 'test-results/result.txt', '.agent-tests/log.txt', '.claude/settings.local.json', '.codex/.env'];
  for (const path of artifacts) put(root, path, 'trace');
  git(root, ['add', '-f', ...artifacts]);
  const before = git(root, ['ls-files', '--stage', '-z']);
  const plan = planLocalIgnore(root);
  assert.deepEqual([...plan.trackedOutputs].sort(), artifacts.sort());
  assert.equal(checkLocalIgnore(plan).ok, false);
  assert.equal(git(root, ['ls-files', '--stage', '-z']), before);
});

test('regras customizadas aninhadas continuam válidas e incluem pais ocultos', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const policy = readFileSync(join(projectRoot, '.pbai4devs/templates/gitignore/agents.ignore'), 'utf8');
  put(root, '.pbai4devs/templates/gitignore/agents.ignore', `${policy}\n**/reports/cache*/\n`);
  const path = '.hidden/reports/cache-custom/out.json';
  put(root, path, 'local\n');
  put(root, '.gitignore', '!/.hidden/reports/cache-custom/\n!/.hidden/reports/cache-custom/**\n');
  const plan = planLocalIgnore(root);
  assert.ok(checkLocalIgnore(plan).missing.includes(path));
  assert.throws(() => applyLocalIgnore(plan), /Regras humanas/);
  assert.equal(readFileSync(join(root, path), 'utf8'), 'local\n');
});

test('chaves literais em padrões Git não viram expansão de glob', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const policy = readFileSync(join(projectRoot, '.pbai4devs/templates/gitignore/agents.ignore'), 'utf8');
  put(root, '.pbai4devs/templates/gitignore/agents.ignore', `${policy}\n**/cache{keep,archive}/\n`);
  put(root, 'cachekeep/source.txt', 'código humano\n');
  put(root, '.gitignore', '!cachekeep/source.txt\n');
  assert.doesNotThrow(() => applyLocalIgnore(planLocalIgnore(root)));
  assert.equal(readFileSync(join(root, 'cachekeep/source.txt'), 'utf8'), 'código humano\n');
});

test('exceção nominal de um ignore ancestral é conferida no subprojeto', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  put(root, '.gitignore', '!/modules/app/.playwright-personal/\n!/modules/app/.playwright-personal/**\n');
  const child = join(root, 'modules/app'); mkdirSync(child, { recursive: true });
  const plan = planLocalIgnore(child);
  assert.ok(checkLocalIgnore(plan).missing.some(path => path.startsWith('.playwright-personal/')));
  assert.throws(() => applyLocalIgnore(plan), /Regras humanas/);
});

test('escrita de exclusões preserva permissões e detecta alteração concorrente', { skip: process.platform === 'win32' }, t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const exclude = join(root, '.git/info/exclude'); chmodSync(exclude, 0o600);
  applyLocalIgnore(planLocalIgnore(root));
  assert.equal(statSync(exclude).mode & 0o777, 0o600);
  const changed = planLocalIgnore(root, { outputs: ['new-generated.md'] });
  chmodSync(exclude, 0o640);
  assert.throws(() => applyLocalIgnore(changed), /alterada apos planejar/);
  assert.equal(statSync(exclude).mode & 0o777, 0o640);
});

test('alteração no exclude durante escrita temporária é preservada antes da promoção', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const file = join(root, '.git/info/exclude'), before = readFileSync(file, 'utf8');
  const plan = planLocalIgnore(root), index = git(root, ['ls-files', '--stage', '-z']);
  const write = fs.writeFileSync; let injected = false;
  try {
    fs.writeFileSync = (path, content, options) => {
      const value = write(path, content, options);
      if (!injected && String(path).startsWith(`${file}.agentdevkit-`)) {
        injected = true;
        write(file, `${before}\n# regra humana concorrente\n`);
      }
      return value;
    };
    syncBuiltinESMExports();
    assert.throws(() => applyLocalIgnore(plan), /Exclusao alterada antes de publicar/);
  } finally { fs.writeFileSync = write; syncBuiltinESMExports(); }
  assert.equal(injected, true);
  assert.equal(readFileSync(file, 'utf8'), `${before}\n# regra humana concorrente\n`);
  assert.equal(git(root, ['ls-files', '--stage', '-z']), index);
});

test('alteração no exclude durante rollback não é substituída', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const file = join(root, '.git/info/exclude'), plan = planLocalIgnore(root);
  const index = git(root, ['ls-files', '--stage', '-z']);
  const write = fs.writeFileSync, remove = fs.rmSync;
  let failed = false, injected = false;
  try {
    fs.rmSync = (path, options) => {
      if (!failed && String(path).startsWith(`${file}.agentdevkit-`) && !existsSync(path)) {
        failed = true; throw new Error('falha após promoção');
      }
      return remove(path, options);
    };
    fs.writeFileSync = (path, content, options) => {
      const value = write(path, content, options);
      if (failed && !injected && String(path).startsWith(`${file}.agentdevkit-`)) {
        injected = true;
        write(file, `${readFileSync(file, 'utf8')}\n# regra humana no rollback\n`);
      }
      return value;
    };
    syncBuiltinESMExports();
    assert.throws(() => applyLocalIgnore(plan), /rollback incompleto.*conteudo preservado/s);
  } finally { fs.rmSync = remove; fs.writeFileSync = write; syncBuiltinESMExports(); }
  assert.equal(injected, true);
  assert.match(readFileSync(file, 'utf8'), /# regra humana no rollback/);
  assert.equal(git(root, ['ls-files', '--stage', '-z']), index);
});

test('ignore raiz mantém modo e bytes antes e depois de git init', { skip: process.platform === 'win32' }, t => {
  const root = fixture(t), ignore = join(root, '.gitignore');
  put(root, '.gitignore', '# humano\n'); chmodSync(ignore, 0o600);
  applyLocalIgnore(planLocalIgnore(root));
  assert.equal(statSync(ignore).mode & 0o777, 0o600);
  const original = readFileSync(ignore); git(root, ['init', '-q']);
  const exclude = join(root, '.git/info/exclude'); chmodSync(exclude, 0o600);
  applyLocalIgnore(planLocalIgnore(root));
  assert.equal(statSync(exclude).mode & 0o777, 0o600);
  assert.deepEqual(readFileSync(ignore), original); assert.equal(statSync(ignore).mode & 0o777, 0o600);
});

test('ignore raiz somente leitura não impede exclusão local no Git', { skip: process.platform === 'win32' }, t => {
  const root = fixture(t), ignore = join(root, '.gitignore');
  put(root, '.gitignore', '# humano\n'); chmodSync(ignore, 0o444);
  applyLocalIgnore(planLocalIgnore(root));
  const original = readFileSync(ignore); git(root, ['init', '-q']);
  const exclude = join(root, '.git/info/exclude');
  chmodSync(exclude, 0o444);
  const plan = planLocalIgnore(root);
  applyLocalIgnore(plan);
  assert.equal(statSync(exclude).mode & 0o777, 0o444);
  assert.deepEqual(readFileSync(ignore), original); assert.equal(statSync(ignore).mode & 0o777, 0o444);
});

test('projeto aninhado não lê gitignore inacessível do projeto irmão', { skip: process.platform === 'win32' }, t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const other = join(root, 'other/.gitignore'); put(root, 'other/.gitignore', 'tmp/\n');
  git(root, ['add', 'other/.gitignore']); chmodSync(other, 0o000);
  t.after(() => { try { chmodSync(other, 0o600); } catch {} });
  const child = join(root, 'app'); mkdirSync(child);
  const plan = planLocalIgnore(child);
  applyLocalIgnore(plan);
  assert.equal(checkLocalIgnore(planLocalIgnore(child)).ok, true);
});

test('falha no cleanup após promoção ainda reverte a exclusão publicada', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const file = join(root, '.git/info/exclude'), original = readFileSync(file);
  const plan = planLocalIgnore(root), remove = fs.rmSync;
  const injected = new Error('published cleanup failure'); let failed = false;
  try {
    fs.rmSync = (path, options) => {
      if (!failed && String(path).startsWith(`${file}.agentdevkit-`) && !existsSync(path)) { failed = true; throw injected; }
      return remove(path, options);
    };
    syncBuiltinESMExports();
    assert.throws(() => applyLocalIgnore(plan), error => error === injected);
  } finally { fs.rmSync = remove; syncBuiltinESMExports(); }
  assert.equal(failed, true);
  assert.deepEqual(readFileSync(file), original);
});

test('falha irrecuperável de rollback informa também o erro original', t => {
  const root = fixture(t); git(root, ['init', '-q']);
  const file = join(root, '.git/info/exclude'), plan = planLocalIgnore(root);
  const remove = fs.rmSync, rename = fs.renameSync;
  const original = new Error('original cleanup failure'), rollback = new Error('restore unavailable');
  let failed = false;
  try {
    fs.rmSync = (path, options) => {
      if (!failed && String(path).startsWith(`${file}.agentdevkit-`) && !existsSync(path)) { failed = true; throw original; }
      return remove(path, options);
    };
    fs.renameSync = (from, to) => { if (failed && to === file) throw rollback; return rename(from, to); };
    syncBuiltinESMExports();
    assert.throws(() => applyLocalIgnore(plan), error => error instanceof AggregateError
      && error.cause === original && error.errors.includes(rollback));
  } finally { fs.rmSync = remove; fs.renameSync = rename; syncBuiltinESMExports(); }
});
