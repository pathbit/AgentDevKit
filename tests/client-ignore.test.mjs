import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { devNull, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(repository, 'bin/agentdevkit.mjs');
const policy = JSON.parse(readFileSync(join(repository, '.pbai4devs/templates/clients/ADAPTERS.json'), 'utf8'));
const clientRoots = [...new Set(policy.adapters.flatMap(adapter => [adapter.root, ...(adapter.extraRoots || [])]))];
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: devNull };
for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE']) delete env[key];

function fixture(t, { git = true } = {}) {
  // Keep no-Git fixtures outside the source repository, whose Git context would
  // otherwise be inherited by `git -C`.
  const base = git ? join(repository, '.agent-tests') : tmpdir();
  mkdirSync(base, { recursive: true });
  const root = mkdtempSync(join(base, 'client-ignore-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  if (git) command(root, ['init', '--quiet']);
  return root;
}
function command(root, args, expected = 0, extraEnv = {}) {
  const result = spawnSync('git', ['-C', root, ...args], { env: { ...env, ...extraEnv }, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, expected, `git ${args.join(' ')}: ${result.error?.message || ''}\n${result.stdout || ''}${result.stderr || ''}`);
  return result.stdout;
}
function cli(root, args, expected = 0, extraEnv = {}) {
  const result = spawnSync(process.execPath, [bin, ...args, '--target', root, '--json'], {
    env: { ...env, ...extraEnv }, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.status, expected, `agentdevkit ${args.join(' ')}: ${result.error?.message || ''}\n${result.stdout || ''}${result.stderr || ''}`);
  return JSON.parse(result.stdout);
}
function put(root, path, value) {
  const full = join(root, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, value);
}
const read = (root, path) => readFileSync(join(root, path));
function index(root) {
  const path = command(root, ['rev-parse', '--git-path', 'index']).trim();
  const full = isAbsolute(path) ? path : join(root, path);
  return existsSync(full) ? readFileSync(full) : null;
}
function ignored(root, path, extraEnv = {}) {
  const result = spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '-q', '--', path], { env: { ...env, ...extraEnv }, timeout: 30000 });
  assert.ok([0, 1].includes(result.status), `check-ignore ${path}: ${result.stderr?.toString() || result.error?.message || ''}`);
  return result.status === 0;
}

test('exclusões locais cobrem clientes; opt-in rastreia arquivos e mantém staged em todo o ciclo', t => {
  const root = fixture(t);
  const ignore = '# Regras da equipe\n/build/\n';
  const original = '{"team":"staged"}\n';
  const working = '{"team":"working"}\n';
  put(root, '.gitignore', ignore);
  put(root, '.claude/settings.json', original);
  command(root, ['add', '--', '.gitignore', '.claude/settings.json']);
  put(root, '.claude/settings.json', working);
  put(root, '.claude/notes.md', '# Conteúdo próprio ainda não rastreado\n');
  put(root, '.github/workflows/team.yml', 'name: Team workflow\n');
  put(root, '.vscode/settings.json', '{"editor.tabSize":2}\n');
  put(root, '.opencode/team.md', '# Recurso próprio\n');
  put(root, '.claude/auth.json', '{"placeholder":true}\n');
  put(root, '.claude/.env', 'EXAMPLE_ONLY=true\n');
  put(root, '.claude/playwright-report/index.html', 'artefato\n');
  const originalIndex = index(root);
  const installed = cli(root, ['init', '--agents', 'claude']);
  assert.equal(installed.ok, true);
  assert.deepEqual(index(root), originalIndex, 'init não desindexa arquivos preparados');
  assert.deepEqual(read(root, '.gitignore'), Buffer.from(ignore));
  assert.deepEqual(read(root, '.claude/settings.json'), Buffer.from(working));
  for (const path of ['.claude/notes.md', '.github/workflows/team.yml', '.vscode/settings.json', '.opencode/team.md']) {
    assert.equal(ignored(root, path), true, path);
  }
  assert.ok(clientRoots.includes('.github') && clientRoots.includes('.vscode'));
  for (const client of clientRoots) {
    assert.equal(ignored(root, `${client}/agentdevkit-probe.md`), true, client);
  }
  assert.match(command(root, ['ls-files', '--stage', '--', '.claude/settings.json']), /\.claude\/settings\.json/);

  const selected = `${ignore}!/.claude/\n!/.github/\n`;
  put(root, '.gitignore', selected);
  assert.equal(ignored(root, '.claude/notes.md'), false);
  assert.equal(ignored(root, '.github/workflows/team.yml'), false);
  for (const path of ['.claude/auth.json', '.claude/.env', '.claude/playwright-report/index.html']) {
    assert.equal(ignored(root, path), true, path);
  }
  command(root, ['add', '--', '.gitignore', '.claude/notes.md', '.github/workflows/team.yml']);
  const selectedIndex = index(root), selectedEntries = command(root, ['ls-files', '--stage', '-z']);
  for (const args of [['update', '--force'], ['sync', '--force'], ['doctor'], ['sync', '--check'], ['init', '--agents', 'claude', '--force']]) {
    const result = cli(root, args);
    assert.equal(result.ok, true, args.join(' '));
    assert.deepEqual(index(root), selectedIndex, `${args.join(' ')} altera o índice`);
    assert.equal(command(root, ['ls-files', '--stage', '-z']), selectedEntries);
    assert.deepEqual(read(root, '.gitignore'), Buffer.from(selected));
    assert.deepEqual(read(root, '.claude/settings.json'), Buffer.from(working));
    assert.equal(ignored(root, '.claude/notes.md'), false);
    assert.equal(ignored(root, '.github/workflows/team.yml'), false);
    assert.equal(ignored(root, '.vscode/settings.json'), true);
    for (const path of ['.claude/auth.json', '.claude/.env', '.claude/playwright-report/index.html']) assert.equal(ignored(root, path), true, path);
  }
});

test('seleção de um arquivo exige reabrir pais e regras posteriores prevalecem', t => {
  const root = fixture(t);
  const selected = '.claude/skills/configurar-projeto/SKILL.md';
  const other = '.claude/skills/criar-skill/SKILL.md';
  put(root, '.gitignore', '# Projeto\n');
  assert.equal(cli(root, ['init', '--agents', 'claude']).ok, true);
  assert.ok(existsSync(join(root, selected)) && existsSync(join(root, other)));

  // Git não reabre um arquivo cujo diretório pai continua ignorado.
  put(root, '.gitignore', `# Projeto\n!/${selected}\n`);
  assert.equal(ignored(root, selected), true);
  assert.equal(cli(root, ['sync']).ok, true);

  // Reabrir os ancestrais e fechar os demais irmãos permite escolher apenas
  // uma saída; não libera credenciais nem outros arquivos do cliente.
  const selective = [
    '# Projeto', '!/.claude/', '/.claude/*', '!/.claude/skills/',
    '/.claude/skills/*', '!/.claude/skills/configurar-projeto/',
    '/.claude/skills/configurar-projeto/*', `!/${selected}`, '',
  ].join('\n');
  put(root, '.gitignore', selective);
  assert.equal(ignored(root, selected), false);
  assert.equal(ignored(root, other), true);
  assert.equal(ignored(root, '.claude/auth.json'), true);
  assert.equal(ignored(root, '.claude/.env'), true);
  command(root, ['add', '--', '.gitignore', selected]);
  const staged = index(root), entries = command(root, ['ls-files', '--stage', '-z']);
  for (const args of [['sync'], ['update', '--force'], ['doctor'], ['sync', '--check']]) {
    assert.equal(cli(root, args).ok, true, args.join(' '));
    assert.deepEqual(index(root), staged);
    assert.equal(command(root, ['ls-files', '--stage', '-z']), entries);
    assert.equal(ignored(root, selected), false);
    assert.equal(ignored(root, other), true);
    assert.equal(ignored(root, '.claude/auth.json'), true);
    assert.equal(ignored(root, '.claude/.env'), true);
  }

  // A última regra volta a ocultar a pasta, mas não altera o conteúdo staged.
  const closed = `${selective}/.claude/\n`;
  put(root, '.gitignore', closed);
  assert.equal(ignored(root, selected), true);
  assert.equal(cli(root, ['sync']).ok, true);
  assert.deepEqual(index(root), staged);
  assert.deepEqual(read(root, '.gitignore'), Buffer.from(closed));
  assert.equal(command(root, ['ls-files', '--stage', '-z']), entries);
});

test('exceção ampla que expõe credenciais bloqueia a sincronização mesmo com force', t => {
  const root = fixture(t);
  put(root, '.gitignore', '# Regras próprias\n');
  put(root, '.github/auth.json', '{"placeholder":true}\n');
  put(root, '.github/playwright-report/index.html', 'artefato\n');
  command(root, ['add', '--', '.gitignore']);
  assert.equal(cli(root, ['init', '--agents', 'claude']).ok, true);
  assert.equal(ignored(root, '.github/auth.json'), true);
  assert.equal(ignored(root, '.github/playwright-report/index.html'), true);

  // A negação ampla do usuário tem precedência sobre info/exclude e expõe
  // privados: o kit deve informar o conflito antes de mudar qualquer estado.
  const human = '# Regras próprias\n!/.github/\n!/.github/**\n';
  put(root, '.gitignore', human);
  assert.equal(ignored(root, '.github/auth.json'), false);
  assert.equal(ignored(root, '.github/playwright-report/index.html'), false);
  const excludePath = command(root, ['rev-parse', '--git-path', 'info/exclude']).trim();
  const exclude = isAbsolute(excludePath) ? excludePath : join(root, excludePath);
  const beforeExclude = readFileSync(exclude), beforeIndex = index(root);
  const beforeState = read(root, '.pbai4devs/state/agentdevkit.json');
  for (const args of [['sync', '--force'], ['update', '--force']]) {
    const result = cli(root, args, 1);
    assert.equal(result.ok, false, args.join(' '));
    assert.deepEqual(read(root, '.gitignore'), Buffer.from(human));
    assert.deepEqual(index(root), beforeIndex);
    assert.deepEqual(readFileSync(exclude), beforeExclude);
    assert.deepEqual(read(root, '.pbai4devs/state/agentdevkit.json'), beforeState);
    assert.deepEqual(read(root, '.github/auth.json'), Buffer.from('{"placeholder":true}\n'));
  }
});

test('projeto sem Git mantém regras existentes e ativa proteção após git init e sync', t => {
  const root = fixture(t, { git: false });
  const ignore = '# Ignore da equipe\n/dist/\n';
  put(root, '.gitignore', ignore);
  put(root, '.github/workflows/team.yml', 'name: team\n');
  const installed = cli(root, ['init', '--agents', 'claude']);
  assert.equal(installed.ok, true);
  assert.equal(installed.localIgnore?.status, 'no-git');
  assert.deepEqual(read(root, '.gitignore'), Buffer.from(ignore));
  command(root, ['init', '--quiet']);
  const before = index(root);
  assert.equal(cli(root, ['sync']).ok, true);
  assert.deepEqual(index(root), before);
  assert.deepEqual(read(root, '.gitignore'), Buffer.from(ignore));
  assert.equal(ignored(root, '.github/workflows/team.yml'), true);
});

test('projeto aninhado respeita o escopo Git e exceções do seu próprio ignore', t => {
  const root = fixture(t), target = join(root, 'apps', 'nested');
  put(root, '.claude/settings.json', '{"parent":true}\n');
  put(root, 'apps/nested/.gitignore', '# Projeto aninhado\n!/.claude/\n');
  put(root, 'apps/nested/.claude/notes.md', '# Recurso próprio\n');
  put(root, 'apps/nested/.github/workflows/team.yml', 'name: team\n');
  command(root, ['add', '--', '.claude/settings.json', 'apps/nested/.gitignore']);
  const before = index(root);
  assert.equal(cli(target, ['init', '--agents', 'claude']).ok, true);
  assert.deepEqual(index(root), before);
  assert.equal(ignored(root, '.claude/parent-probe.md'), false, 'outro projeto não é afetado');
  assert.equal(ignored(root, 'apps/nested/.claude/notes.md'), false);
  assert.equal(ignored(root, 'apps/nested/.github/workflows/team.yml'), true);
  assert.equal(cli(target, ['sync', '--check']).ok, true);
  assert.equal(cli(target, ['doctor']).ok, true);
  assert.deepEqual(index(root), before);
});

test('projeto aninhado em ancestral ignorado informa exceção ineficaz antes de escrever', t => {
  const root = fixture(t), target = join(root, '.github', 'project');
  put(root, '.gitignore', '# Projeto pai\n');
  command(root, ['add', '--', '.gitignore']);
  assert.equal(cli(root, ['init', '--agents', 'copilot']).ok, true);
  const childIgnore = '# Projeto filho\n!/.claude/\n';
  const human = '# Conteúdo da equipe\n';
  put(root, '.github/project/.gitignore', childIgnore);
  put(root, '.github/project/.claude/custom.md', human);
  assert.equal(ignored(root, '.github/project/.claude/custom.md'), true);
  const excludePath = command(root, ['rev-parse', '--git-path', 'info/exclude']).trim();
  const exclude = isAbsolute(excludePath) ? excludePath : join(root, excludePath);
  const beforeExclude = readFileSync(exclude), beforeIndex = index(root);
  const parentState = read(root, '.pbai4devs/state/agentdevkit.json');
  for (const args of [['init', '--agents', 'claude', '--dry-run'], ['init', '--agents', 'claude', '--force']]) {
    const result = cli(target, args, 1);
    assert.equal(result.ok, false);
    assert.match(JSON.stringify(result), /ancestral|\.claude|ignora/i);
    assert.equal(existsSync(join(target, '.pbai4devs')), false);
    assert.deepEqual(read(target, '.gitignore'), Buffer.from(childIgnore));
    assert.deepEqual(read(target, '.claude/custom.md'), Buffer.from(human));
    assert.deepEqual(read(root, '.gitignore'), Buffer.from('# Projeto pai\n'));
    assert.deepEqual(read(root, '.pbai4devs/state/agentdevkit.json'), parentState);
    assert.deepEqual(readFileSync(exclude), beforeExclude);
    assert.deepEqual(index(root), beforeIndex);
  }
});

test('exclusão global temporária de ancestral também bloqueia opt-in ineficaz', t => {
  const root = fixture(t), target = join(root, 'apps', 'project');
  const configFile = join(root, 'fixture-global.gitconfig');
  const globalIgnore = join(root, 'fixture-global.ignore');
  put(root, '.gitignore', '# Projeto pai\n');
  put(root, 'fixture-global.ignore', '/apps/\n');
  command(root, ['config', '--file', configFile, 'core.excludesFile', globalIgnore]);
  command(root, ['add', '--', '.gitignore']);
  const scopedEnv = { GIT_CONFIG_GLOBAL: configFile };
  const childIgnore = '# Projeto filho\n!/.claude/\n';
  const human = '# Conteúdo da equipe\n';
  put(root, 'apps/project/.gitignore', childIgnore);
  put(root, 'apps/project/.claude/custom.md', human);
  assert.equal(ignored(root, 'apps/project/.claude/custom.md', scopedEnv), true);
  const excludePath = command(root, ['rev-parse', '--git-path', 'info/exclude']).trim();
  const exclude = isAbsolute(excludePath) ? excludePath : join(root, excludePath);
  const beforeExclude = readFileSync(exclude), beforeIndex = index(root);
  const globalBefore = readFileSync(configFile), globalIgnoreBefore = readFileSync(globalIgnore);
  for (const args of [['init', '--agents', 'claude', '--dry-run'], ['init', '--agents', 'claude', '--force']]) {
    const result = cli(target, args, 1, scopedEnv);
    assert.equal(result.ok, false);
    assert.match(JSON.stringify(result), /ancestral|\.claude|ignora/i);
    assert.equal(existsSync(join(target, '.pbai4devs')), false);
    assert.deepEqual(read(target, '.gitignore'), Buffer.from(childIgnore));
    assert.deepEqual(read(target, '.claude/custom.md'), Buffer.from(human));
    assert.deepEqual(read(root, '.gitignore'), Buffer.from('# Projeto pai\n'));
    assert.deepEqual(readFileSync(configFile), globalBefore);
    assert.deepEqual(readFileSync(globalIgnore), globalIgnoreBefore);
    assert.deepEqual(readFileSync(exclude), beforeExclude);
    assert.deepEqual(index(root), beforeIndex);
  }
});
