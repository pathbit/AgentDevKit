import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { applyPlan, planInstallation } from '../src/install.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(project, 'bin/agentdevkit.mjs');
const statePath = '.pbai4devs/estado/agentdevkit.json';
const hash = value => createHash('sha256').update(value).digest('hex');
const read = (root, path) => readFileSync(join(root, path), 'utf8');
function write(root, path, content) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), content); }
function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); return result.stdout;
}
function fixture(t) {
  mkdirSync(join(project, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(project, '.agent-tests/source-layout-'));
  git(root, 'init', '--quiet'); t.after(() => rmSync(root, { recursive: true, force: true })); return root;
}
function cli(root, args, status = 0) {
  const result = spawnSync(process.execPath, [bin, ...args, '--target', root, '--json'], { encoding: 'utf8', timeout: 90000 });
  assert.equal(result.status, status, result.stdout + result.stderr); return JSON.parse(result.stdout);
}

test('consumidor recebe recursos sem código do gerador e preserva entrada humana', t => {
  const root = fixture(t), human = '# Meu projeto\n\nInstruções próprias.\n';
  write(root, 'AGENTS.md', human); cli(root, ['init', '--agents', 'claude']);
  assert.equal(read(root, 'AGENTS.md'), human);
  for (const folder of ['src', 'bin', 'tests', 'release', 'docs']) assert.equal(existsSync(join(root, '.pbai4devs', folder)), false, folder);
  assert.ok(existsSync(join(root, '.pbai4devs/skills/projeto/configurar-projeto/SKILL.md')));
  assert.equal(Object.hasOwn(JSON.parse(read(root, statePath)).files, 'AGENTS.md'), false);
  assert.equal(spawnSync('git', ['-C', root, 'check-ignore', '-q', 'AGENTS.md']).status, 1);
  assert.equal(spawnSync('git', ['-C', root, 'check-ignore', '-q', 'CLAUDE.md']).status, 0);
});

test('init transporta licença canônica sem alterar licença humana e sync a preserva', t => {
  const root = fixture(t), canonical = readFileSync(join(project, 'LICENSE'));
  const human = Buffer.from('Licença exclusiva deste projeto.\r\n');
  write(root, 'LICENSE', human);
  const preview = cli(root, ['init', '--agents', 'claude', '--dry-run']);
  assert.ok(preview.plan.some(change => change.path === '.pbai4devs/LICENSE' && change.action === 'create'));
  assert.equal(existsSync(join(root, '.pbai4devs/LICENSE')), false);
  cli(root, ['init', '--agents', 'claude']);
  assert.deepEqual(readFileSync(join(root, '.pbai4devs/LICENSE')), canonical);
  assert.deepEqual(readFileSync(join(root, 'LICENSE')), human);
  assert.equal(JSON.parse(read(root, statePath)).files['.pbai4devs/LICENSE'], hash(canonical));
  for (const args of [['sync'], ['update'], ['doctor']]) assert.equal(cli(root, args).ok, true);
  const synced = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs')], { cwd: root, encoding: 'utf8' });
  assert.equal(synced.status, 0, synced.stdout + synced.stderr);
  assert.deepEqual(readFileSync(join(root, '.pbai4devs/LICENSE')), canonical);
  assert.deepEqual(readFileSync(join(root, 'LICENSE')), human);
  assert.equal(spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '-q', '.pbai4devs/LICENSE']).status, 1);
});

test('instalação em Git vazio ignora artefatos sem modificar README, licença ou evidência rastreada', t => {
  const root = fixture(t), readme = '# Produto existente\n', license = 'Licença do produto\r\n';
  write(root, 'README.md', readme); write(root, 'LICENSE', license);
  write(root, '.agent-tests/human.txt', 'evidência própria\n');
  git(root, 'add', '-f', '.agent-tests/human.txt');
  const preview = cli(root, ['init', '--agents', 'claude', '--dry-run']);
  assert.ok(!preview.untrackedPaths.includes('.agent-tests/human.txt'));
  cli(root, ['init', '--agents', 'claude']);
  const exclude = read(root, '.git/info/exclude');
  for (const path of ['.agent-tests/x', 'tmp/x', 'deep/TEMP/x', '.PlAyWrIgHt-McP/x', 'nested/Playwright-report/x', 'test-results/x', 'sub/TESTRESULTS/x']) {
    assert.equal(git(root, 'check-ignore', '--no-index', path).trim(), path);
  }
  assert.equal(read(root, 'README.md'), readme); assert.equal(read(root, 'LICENSE'), license);
  assert.equal(git(root, 'ls-files', '.agent-tests/human.txt').trim(), '.agent-tests/human.txt');
  assert.equal(read(root, '.agent-tests/human.txt'), 'evidência própria\n');
  assert.equal(cli(root, ['sync', '--check']).ok, true);
  assert.equal(cli(root, ['init', '--agents', 'claude']).changed, false);
  assert.equal(read(root, '.git/info/exclude'), exclude);
  write(root, '.git/info/exclude', exclude.replace(/\n# Resultados e arquivos temporarios\n[\s\S]*?(?=# END AGENTDEVKIT LOCAL)/, '\n'));
  assert.ok(cli(root, ['doctor'], 1).issues.some(issue => issue.code === 'local-ignore'));
  assert.equal(cli(root, ['sync', '--check'], 1).ok, false);
  cli(root, ['sync']);
  assert.equal(read(root, '.git/info/exclude'), exclude);
});

test('negação humana de artefatos impede init mesmo com force', t => {
  const root = fixture(t), human = '!/.agent-tests/**\n'; write(root, '.gitignore', human);
  const exclude = read(root, '.git/info/exclude');
  for (const option of ['--dry-run', '--force']) {
    const result = cli(root, ['init', '--agents', 'claude', option], 1);
    assert.ok(result.conflicts.some(path => path.startsWith('.agent-tests/')));
    assert.equal(existsSync(join(root, '.pbai4devs')), false);
    assert.equal(read(root, '.gitignore'), human); assert.equal(read(root, '.git/info/exclude'), exclude);
  }
});

test('fallback sem Git carrega artefatos e migra sem tocar as regras humanas', t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-no-git-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const human = '# Regra do produto\ndist/\n'; write(root, '.gitignore', human);
  write(root, 'README.md', '# Meu produto\n'); write(root, 'LICENSE', 'Minha licença\n');
  cli(root, ['init', '--agents', 'claude']);
  const fallback = read(root, '.gitignore'); assert.ok(fallback.startsWith(human));
  assert.match(fallback, /Resultados e arquivos temporarios/);
  assert.equal(cli(root, ['sync', '--check']).ok, true);
  git(root, 'init', '--quiet'); cli(root, ['sync']);
  assert.equal(read(root, '.gitignore'), human);
  for (const path of ['.agent-tests/x', 'nested/TmP/x', '.PLAYWRIGHT-MCP/x', 'sub/playwright-report/x', 'test-results/x']) {
    assert.equal(git(root, 'check-ignore', '--no-index', path).trim(), path);
  }
  assert.equal(read(root, 'README.md'), '# Meu produto\n'); assert.equal(read(root, 'LICENSE'), 'Minha licença\n');
});

test('update acrescenta licença em instalação anterior e detecta alteração posterior', t => {
  const root = fixture(t), licensePath = '.pbai4devs/LICENSE', canonical = readFileSync(join(project, 'LICENSE'));
  cli(root, ['init', '--agents', 'claude']);
  const old = JSON.parse(read(root, statePath)); delete old.files[licensePath];
  write(root, statePath, JSON.stringify(old)); rmSync(join(root, licensePath));
  cli(root, ['update']);
  assert.deepEqual(readFileSync(join(root, licensePath)), canonical);
  assert.equal(JSON.parse(read(root, statePath)).files[licensePath], hash(canonical));
  const edited = Buffer.concat([canonical, Buffer.from('\nEdição humana.\n')]);
  write(root, licensePath, edited);
  const doctor = cli(root, ['doctor'], 1);
  assert.ok(doctor.issues.some(issue => issue.code === 'modified' && issue.path === licensePath));
  const blocked = cli(root, ['update'], 1);
  assert.ok(blocked.conflicts.includes(licensePath));
  assert.deepEqual(readFileSync(join(root, licensePath)), edited);
});

test('licença própria dentro do hub gera conflito e force guarda backup sem tocar raiz', t => {
  const root = fixture(t), licensePath = '.pbai4devs/LICENSE';
  const rootLicense = 'Licença do produto.\n', hubLicense = 'Licença humana existente.\r\n';
  write(root, 'LICENSE', rootLicense); write(root, licensePath, hubLicense);
  const blocked = cli(root, ['init', '--agents', 'claude'], 1);
  assert.ok(blocked.conflicts.includes(licensePath));
  assert.equal(read(root, licensePath), hubLicense); assert.equal(read(root, 'LICENSE'), rootLicense);
  assert.equal(existsSync(join(root, statePath)), false);
  const applied = cli(root, ['init', '--agents', 'claude', '--force']);
  assert.equal(read(root, 'LICENSE'), rootLicense);
  assert.deepEqual(readFileSync(join(root, licensePath)), readFileSync(join(project, 'LICENSE')));
  assert.equal(read(root, `${applied.backup}/${licensePath}`), hubLicense);
});

test('update desindexa somente derivados comprovados e mantém fontes e estágio humano', t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const derived = '.claude/skills/configurar-projeto/SKILL.md';
  const source = '.pbai4devs/skills/projeto/configurar-projeto/SKILL.md';
  write(root, 'human.txt', 'staged human');
  git(root, 'add', '-f', derived, source, statePath, 'CLAUDE.md', 'human.txt');
  const stagedHuman = git(root, 'show', ':human.txt');
  cli(root, ['update']);
  const tracked = git(root, 'ls-files', '-z').split('\0');
  assert.ok(tracked.includes(source)); assert.ok(tracked.includes('human.txt'));
  for (const path of [derived, statePath, 'CLAUDE.md']) { assert.equal(tracked.includes(path), false); assert.ok(existsSync(join(root, path))); }
  assert.equal(git(root, 'show', ':human.txt'), stagedHuman);
});

test('conteúdo humano diferente no índice bloqueia desindexação mesmo com force', t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const derived = '.claude/skills/configurar-projeto/SKILL.md', original = read(root, derived);
  write(root, derived, 'human staged version'); git(root, 'add', '-f', derived); write(root, derived, original);
  const result = cli(root, ['update', '--force'], 1);
  assert.ok(result.conflicts.includes(derived)); assert.equal(git(root, 'show', `:${derived}`), 'human staged version');
  assert.equal(read(root, derived), original);
});

test('migração retira somente bloco legado de uma entrada humana rastreada', t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const block = '<!-- BEGIN AGENTDEVKIT -->\nInstrução gerada antiga.\n<!-- END AGENTDEVKIT -->';
  const mixed = `# Instruções humanas\n\n${block}\n\nPreserve este texto.\n`;
  write(root, 'AGENTS.md', mixed);
  const state = JSON.parse(read(root, statePath)); delete state.files['AGENTS.md']; state.blocks['AGENTS.md'] = hash(block);
  write(root, statePath, JSON.stringify(state, null, 2) + '\n'); git(root, 'add', '-f', 'AGENTS.md');
  cli(root, ['update']);
  assert.equal(read(root, 'AGENTS.md'), mixed.replace(block, ''));
  assert.ok(git(root, 'ls-files', 'AGENTS.md').includes('AGENTS.md'));
  assert.equal(spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '-q', 'AGENTS.md']).status, 1);
});

test('mudança concorrente nas exclusões falha antes de alterar arquivos ou índice', t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const derived = '.claude/skills/configurar-projeto/SKILL.md';
  git(root, 'add', '-f', derived);
  const exclude = resolve(root, git(root, 'rev-parse', '--git-path', 'info/exclude').trim());
  writeFileSync(exclude, '# exclusion before planning\n');
  const preview = cli(root, ['update', '--dry-run']);
  assert.deepEqual(preview.untrackedPaths, [derived]);
  assert.equal(preview.localIgnore.status, 'git');
  assert.deepEqual(preview.localIgnore.edits, [{ path: exclude, action: 'update' }]);
  const plan = planInstallation({ target: root, mode: 'update' });
  assert.equal(plan.changes.length, 0);
  const index = git(root, 'ls-files', '--stage', '-z');
  const state = read(root, statePath), content = read(root, derived);
  writeFileSync(exclude, '# concurrent human exclusion\n');
  assert.throws(() => applyPlan(plan), /Exclusao alterada apos planejar/);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
  assert.equal(read(root, statePath), state);
  assert.equal(read(root, derived), content);
  assert.equal(readFileSync(exclude, 'utf8'), '# concurrent human exclusion\n');
});

test('falha após desindexação restaura arquivos e só as entradas removidas do índice', t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const derived = '.claude/skills/configurar-projeto/SKILL.md';
  write(root, 'human.txt', 'human staged before operation\n');
  git(root, 'add', '-f', derived, 'human.txt');
  const record = git(root, 'ls-files', '--stage', derived);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const snapshots = new Map(plan.changes.map(change => [change.path, existsSync(join(root, change.path)) ? read(root, change.path) : null]));
  assert.ok(plan.changes.length > 0);
  plan.changes.push({ path: 'fault.txt', action: 'create', beforeHash: null,
    get content() {
      assert.equal(git(root, 'ls-files', derived), '');
      write(root, 'concurrent.txt', 'concurrent staged content\n');
      git(root, 'add', '-f', 'concurrent.txt');
      throw new Error('injected write failure after untrack');
    },
  });
  assert.throws(() => applyPlan(plan), /injected write failure after untrack/);
  for (const [path, content] of snapshots) {
    if (content === null) assert.equal(existsSync(join(root, path)), false, path);
    else assert.equal(read(root, path), content, path);
  }
  assert.equal(git(root, 'ls-files', '--stage', derived), record);
  assert.equal(git(root, 'show', ':human.txt'), 'human staged before operation\n');
  assert.equal(git(root, 'show', ':concurrent.txt'), 'concurrent staged content\n');
});

test('falha de escrita de exclusão sem alterações de arquivos também restaura o índice', t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const derived = '.claude/skills/configurar-projeto/SKILL.md';
  git(root, 'add', '-f', derived);
  const exclude = resolve(root, git(root, 'rev-parse', '--git-path', 'info/exclude').trim());
  writeFileSync(exclude, '# initial exclusion\n');
  const plan = planInstallation({ target: root, mode: 'update' });
  assert.equal(plan.changes.length, 0);
  assert.ok(plan.untrack.paths.includes(derived));
  const index = git(root, 'ls-files', '--stage', '-z');
  Object.defineProperty(plan.localIgnore.edits[0], 'after', { get() { throw new Error('injected exclusion write failure'); } });
  assert.throws(() => applyPlan(plan), /injected exclusion write failure/);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
  assert.equal(readFileSync(exclude, 'utf8'), '# initial exclusion\n');
});

test('regra humana que inclui entrada gerada bloqueia init antes de criar recursos', t => {
  const root = fixture(t), human = '!/AGENTS.md\n';
  write(root, '.gitignore', human);
  const exclude = resolve(root, git(root, 'rev-parse', '--git-path', 'info/exclude').trim());
  const original = readFileSync(exclude, 'utf8');
  for (const args of [['--dry-run'], ['--force']]) {
    const result = cli(root, ['init', '--agents', 'claude', ...args], 1);
    assert.ok(result.conflicts.includes('AGENTS.md'));
    assert.ok(result.localIgnore.missing.includes('AGENTS.md'));
    assert.equal(existsSync(join(root, '.pbai4devs')), false);
    assert.equal(existsSync(join(root, '.claude')), false);
    assert.equal(read(root, '.gitignore'), human);
    assert.equal(readFileSync(exclude, 'utf8'), original);
  }
});

test('doctor e sync detectam entrada não ignorada sem sobrescrever regra humana', t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const human = '!/AGENTS.md\n', original = read(root, 'AGENTS.md');
  write(root, '.gitignore', human);
  const doctor = cli(root, ['doctor'], 1);
  assert.ok(doctor.issues.some(issue => issue.code === 'unignored' && issue.path === 'AGENTS.md'));
  for (const args of [['sync', '--check'], ['update', '--force']]) {
    const result = cli(root, args, 1);
    assert.ok(result.conflicts.includes('AGENTS.md'));
    assert.ok(result.localIgnore.missing.includes('AGENTS.md'));
  }
  assert.equal(read(root, '.gitignore'), human);
  assert.equal(read(root, 'AGENTS.md'), original);
});

test('upgrade substitui somente exclusões legadas com ownership comprovado', t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const state = JSON.parse(read(root, statePath));
  const ignores = {
    '.claude/.gitignore': '# BEGIN AGENT IGNORE\n/*\n!/.gitignore\n!/skills/\n# END AGENT IGNORE',
    '.pbai4devs/.gitignore': '# BEGIN AGENT IGNORE\n!/catalog.json\n!/skills.json\n!/agents.json\n!/rules.json\n!/espelhos.conf\n# END AGENT IGNORE',
  };
  for (const [path, block] of Object.entries(ignores)) {
    write(root, path, `${block}\n`); delete state.files[path]; state.blocks[path] = hash(block);
  }
  write(root, statePath, JSON.stringify(state, null, 2) + '\n');
  const result = cli(root, ['update']);
  assert.deepEqual(result.localIgnore.missing, []);
  assert.equal(cli(root, ['doctor']).ok, true);
  for (const path of ['.claude/.gitignore', '.pbai4devs/catalog.json']) assert.equal(spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '-q', path]).status, 0, path);
});

test('ownership legado não isenta negações humanas fora do bloco nem blocos alterados', t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const path = '.pbai4devs/.gitignore';
  const block = '# BEGIN AGENT IGNORE\n!/catalog.json\n# END AGENT IGNORE';
  const state = JSON.parse(read(root, statePath)); delete state.files[path]; state.blocks[path] = hash(block);
  write(root, statePath, JSON.stringify(state, null, 2) + '\n');
  const human = `${block}\n!/catalog.json\n`;
  write(root, path, human);
  const denied = cli(root, ['update', '--force'], 1);
  assert.ok(denied.localIgnore.missing.includes('.pbai4devs/catalog.json'));
  assert.equal(read(root, path), human);
  write(root, path, block.replace('!/catalog.json', '!/skills.json') + '\n');
  const modified = read(root, path), changed = cli(root, ['update', '--force'], 1);
  assert.ok(changed.localIgnore.missing.includes('.pbai4devs/skills.json'));
  assert.equal(read(root, path), modified);
});
