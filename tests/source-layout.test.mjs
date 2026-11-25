import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { applyPlan, planInstallation } from '../src/install.mjs';
import { verifyRecoveryBackup } from '../.pbai4devs/scripts/lib/recovery-backup.mjs';
import { stripManagedContent } from '../.pbai4devs/scripts/lib/managed-content.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(project, 'bin/agentdevkit.mjs');
const statePath = '.pbai4devs/state/agentdevkit.json';
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
  const result = spawnSync(process.execPath, [bin, ...args, '--target', root, '--json'], { encoding: 'utf8', timeout: 180000 });
  assert.equal(result.status, status, `agentdevkit ${args.join(' ')}: ${result.error?.stack || ''}\nsignal: ${result.signal || 'none'}\n${result.stdout || ''}${result.stderr || ''}`); return JSON.parse(result.stdout);
}

test("doctor and sync check report artifacts tracked without changing the index", t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  write(root, '.playwright-mcp/trace.zip', 'trace');
  git(root, 'add', '-f', '.playwright-mcp/trace.zip');
  const before = git(root, 'ls-files', '--stage', '-z');
  const doctor = cli(root, ['doctor'], 1);
  assert.ok(doctor.issues.some(item => item.code === 'tracked-local-output' && item.path === '.playwright-mcp/trace.zip'));
  const sync = cli(root, ['sync', '--check'], 1);
  assert.deepEqual(sync.localIgnore.trackedOutputs, ['.playwright-mcp/trace.zip']);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), before);
});

test("consumer receives resources without generator code and preserves human entry", t => {
  const root = fixture(t), human = '# Meu projeto\n\nInstruções próprias.\n';
  write(root, 'AGENTS.md', human); cli(root, ['init', '--agents', 'claude']);
  assert.ok(read(root, 'AGENTS.md').startsWith(human));
  assert.match(read(root, 'AGENTS.md'), /<!-- BEGIN AGENTDEVKIT -->/);
  for (const folder of ['src', 'bin', 'tests', 'release', 'docs']) assert.equal(existsSync(join(root, '.pbai4devs', folder)), false, folder);
  assert.ok(existsSync(join(root, '.pbai4devs/skills/projeto/configurar-projeto/SKILL.md')));
  assert.equal(Object.hasOwn(JSON.parse(read(root, statePath)).files, 'AGENTS.md'), false);
  assert.equal(spawnSync('git', ['-C', root, 'check-ignore', '-q', 'AGENTS.md']).status, 1);
  assert.equal(spawnSync('git', ['-C', root, 'check-ignore', '-q', 'CLAUDE.md']).status, 1);
});

test("init transports canonical license without altering human license and sync preserves it", t => {
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

test("installation in empty Git preserves README, license, index and evidence of visibility", t => {
  const root = fixture(t), readme = '# Produto existente\n', license = 'Licença do produto\r\n';
  write(root, 'README.md', readme); write(root, 'LICENSE', license);
  write(root, '.agent-tests/human.txt', 'evidência própria\n');
  git(root, 'add', '-f', '.agent-tests/human.txt');
  const preview = cli(root, ['init', '--agents', 'claude', '--dry-run']);
  assert.ok(!preview.untrackedPaths.includes('.agent-tests/human.txt'));
  cli(root, ['init', '--agents', 'claude']);
  const exclude = read(root, '.git/info/exclude');
  for (const path of ['.agent-tests/x', 'tmp/x', 'deep/TEMP/x', '.PlAyWrIgHt-McP/x', 'nested/Playwright-report/x', 'test-results/x', 'sub/TESTRESULTS/x']) {
    assert.equal(spawnSync('git', ['-C', root, 'check-ignore', '--no-index', path]).status, 1, path);
  }
  assert.equal(read(root, 'README.md'), readme); assert.equal(read(root, 'LICENSE'), license);
  assert.equal(git(root, 'ls-files', '.agent-tests/human.txt').trim(), '.agent-tests/human.txt');
  assert.equal(read(root, '.agent-tests/human.txt'), 'evidência própria\n');
  assert.deepEqual(cli(root, ['sync', '--check'], 1).localIgnore.trackedOutputs, ['.agent-tests/human.txt']);
  assert.equal(cli(root, ['init', '--agents', 'claude']).changed, false);
  assert.equal(read(root, '.git/info/exclude'), exclude);
  assert.ok(cli(root, ['doctor'], 1).issues.some(issue => issue.code === 'tracked-local-output'));
  assert.equal(cli(root, ['sync', '--check'], 1).ok, false);
  cli(root, ['sync']);
  assert.equal(read(root, '.git/info/exclude'), exclude);
});

test("human denial of artifacts is preserved even with force", t => {
  const root = fixture(t), human = '!/.agent-tests/**\n'; write(root, '.gitignore', human);
  const exclude = read(root, '.git/info/exclude');
  for (const option of ['--dry-run', '--force']) {
    const result = cli(root, ['init', '--agents', 'claude', option]);
    assert.equal(result.ok, true);
    assert.ok(result.localIgnore.pending.some(item => item.code === 'artifact-unprotected'));
    assert.equal(existsSync(join(root, '.pbai4devs')), option !== '--dry-run');
    assert.equal(read(root, '.gitignore'), human); assert.equal(read(root, '.git/info/exclude'), exclude);
  }
});

test("without Git keeps ignore root, informs pending and protects after syncing", t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-no-git-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const human = '# Regra do produto\ndist/\n'; write(root, '.gitignore', human);
  write(root, 'README.md', '# Meu produto\n'); write(root, 'LICENSE', 'Minha licença\n');
  const installed = cli(root, ['init', '--agents', 'claude']);
  assert.equal(installed.localIgnore.status, 'no-git');
  assert.ok(installed.warnings.some(warning => /inicializar Git/.test(warning)));
  assert.equal(read(root, '.gitignore'), human);
  assert.equal(cli(root, ['doctor'], 1).ok, false);
  assert.equal(cli(root, ['sync', '--check'], 1).ok, false);
  git(root, 'init', '--quiet'); cli(root, ['sync']);
  assert.equal(read(root, '.gitignore'), human);
  for (const path of ['.agent-tests/x', 'nested/TmP/x', '.PLAYWRIGHT-MCP/x', 'sub/playwright-report/x', 'test-results/x']) {
    assert.equal(spawnSync('git', ['-C', root, 'check-ignore', '--no-index', path]).status, 1, path);
  }
  assert.equal(read(root, 'README.md'), '# Meu produto\n'); assert.equal(read(root, 'LICENSE'), 'Minha licença\n');
});

test("without Git does not create ignore missing root", t => {
  const root = mkdtempSync(join(tmpdir(), 'agentdevkit-no-ignore-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = cli(root, ['init', '--agents', 'claude']);
  assert.equal(result.localIgnore.status, 'no-git');
  assert.equal(existsSync(join(root, '.gitignore')), false);
});

test("Ignore root registered by old version is never removed or unindexed", t => {
  const root = fixture(t), human = '# Regras do projeto\n.env.*\n!.env.example\n';
  write(root, '.gitignore', human); git(root, 'add', '.gitignore');
  cli(root, ['init', '--agents', 'claude']);
  const state = JSON.parse(read(root, statePath));
  state.files['.gitignore'] = hash(human); write(root, statePath, JSON.stringify(state));
  const index = git(root, 'ls-files', '--stage', '-z');
  cli(root, ['update', '--yes']);
  assert.equal(read(root, '.gitignore'), human);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
});

test("update adds license in previous installation and detects later change", t => {
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
  const preserved = cli(root, ['update']);
  assert.ok(preserved.preserved.some(item => item.path === licensePath));
  assert.deepEqual(readFileSync(join(root, licensePath)), edited);
  assert.equal(Object.hasOwn(JSON.parse(read(root, statePath)).files, licensePath), false);
});

test("own license within the hub is preserved including with force", t => {
  const root = fixture(t), licensePath = '.pbai4devs/LICENSE';
  const rootLicense = 'Licença do produto.\n', hubLicense = 'Licença humana existente.\r\n';
  write(root, 'LICENSE', rootLicense); write(root, licensePath, hubLicense);
  const initialized = cli(root, ['init', '--agents', 'claude']);
  assert.ok(initialized.preserved.some(item => item.path === licensePath));
  assert.equal(read(root, licensePath), hubLicense); assert.equal(read(root, 'LICENSE'), rootLicense);
  assert.equal(Object.hasOwn(JSON.parse(read(root, statePath)).files, licensePath), false);
  cli(root, ['init', '--agents', 'claude', '--force']);
  assert.equal(read(root, 'LICENSE'), rootLicense);
  assert.equal(read(root, licensePath), hubLicense);
});

test("update keeps derivatives, sources and human stage in the index", t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const derived = '.claude/skills/configurar-projeto/SKILL.md';
  const source = '.pbai4devs/skills/projeto/configurar-projeto/SKILL.md';
  write(root, 'human.txt', 'staged human');
  git(root, 'add', '-f', derived, source, statePath, 'CLAUDE.md', 'human.txt');
  const stagedHuman = git(root, 'show', ':human.txt'), index = git(root, 'ls-files', '--stage', '-z');
  assert.deepEqual(cli(root, ['update']).untrackedPaths, []);
  const tracked = git(root, 'ls-files', '-z').split('\0');
  assert.ok(tracked.includes(source)); assert.ok(tracked.includes('human.txt'));
  for (const path of [derived, statePath, 'CLAUDE.md']) { assert.equal(tracked.includes(path), true); assert.ok(existsSync(join(root, path))); }
  assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
  assert.equal(git(root, 'show', ':human.txt'), stagedHuman);
});

test("different human content in the index remains intact even with force", t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const derived = '.claude/skills/configurar-projeto/SKILL.md', original = read(root, derived);
  write(root, derived, 'human staged version'); git(root, 'add', '-f', derived); write(root, derived, original);
  const index = git(root, 'ls-files', '--stage', '-z');
  assert.deepEqual(cli(root, ['update', '--force']).untrackedPaths, []);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
  assert.equal(git(root, 'show', `:${derived}`), 'human staged version');
  assert.equal(read(root, derived), original);
});

test("migration updates only legacy block of a tracked human input", t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const block = '<!-- BEGIN AGENTDEVKIT -->\nInstrução gerada antiga.\n<!-- END AGENTDEVKIT -->';
  const mixed = `# Instruções humanas\n\n${block}\n\nPreserve este texto.\n`;
  write(root, 'AGENTS.md', mixed);
  const state = JSON.parse(read(root, statePath)); delete state.files['AGENTS.md']; state.blocks['AGENTS.md'] = hash(block);
  write(root, statePath, JSON.stringify(state, null, 2) + '\n'); git(root, 'add', '-f', 'AGENTS.md');
  cli(root, ['update']);
  const updated = JSON.parse(read(root, statePath));
  assert.equal(stripManagedContent(read(root, 'AGENTS.md'), updated.blocks['AGENTS.md']), mixed.replace(block, ''));
  assert.ok(git(root, 'ls-files', 'AGENTS.md').includes('AGENTS.md'));
  assert.equal(spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '-q', 'AGENTS.md']).status, 1);
});

test("concurrent change in deletions is preserved without changing files or index", t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const derived = '.claude/skills/configurar-projeto/SKILL.md';
  git(root, 'add', '-f', derived);
  const exclude = resolve(root, git(root, 'rev-parse', '--git-path', 'info/exclude').trim());
  writeFileSync(exclude, '# exclusion before planning\n');
  const preview = cli(root, ['update', '--dry-run']);
  assert.deepEqual(preview.untrackedPaths, []);
  assert.equal(preview.localIgnore.status, 'git');
  assert.deepEqual(preview.localIgnore.edits, []);
  const plan = planInstallation({ target: root, mode: 'update' });
  assert.equal(plan.changes.length, 0);
  const index = git(root, 'ls-files', '--stage', '-z');
  const state = read(root, statePath), content = read(root, derived);
  writeFileSync(exclude, '# concurrent human exclusion\n');
  assert.doesNotThrow(() => applyPlan(plan));
  assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
  assert.equal(read(root, statePath), state);
  assert.equal(read(root, derived), content);
  assert.equal(readFileSync(exclude, 'utf8'), '# concurrent human exclusion\n');
});

test("write failure preserves previously published files, backup and concurrent staged entries", t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const derived = '.claude/skills/configurar-projeto/SKILL.md';
  write(root, 'human.txt', 'human staged before operation\n');
  git(root, 'add', '-f', derived, 'human.txt');
  const record = git(root, 'ls-files', '--stage', derived);
  const plan = planInstallation({ target: root, mode: 'lang', language: 'en' });
  const snapshots = new Map(plan.changes.map(change => [change.path, existsSync(join(root, change.path)) ? read(root, change.path) : null]));
  assert.ok(plan.changes.length > 0);
  const published = new Map();
  plan.changes.push({ path: 'fault.txt', action: 'create', beforeHash: null,
    get content() {
      assert.equal(git(root, 'ls-files', derived), `${derived}\n`);
      write(root, 'concurrent.txt', 'concurrent staged content\n');
      git(root, 'add', '-f', 'concurrent.txt');
      for (const path of snapshots.keys()) {
        const file = join(root, path);
        published.set(path, existsSync(file) ? { bytes: readFileSync(file), identity: fs.lstatSync(file, { bigint: true }) } : null);
      }
      throw new Error('injected write failure');
    },
  });
  let failure;
  assert.throws(() => applyPlan(plan), error => { failure = error; return /injected write failure/.test(error.message); });
  assert.equal(failure.operationMayBePartial, true);
  verifyRecoveryBackup(failure.recovery.backup, failure.recovery.backupManifest);
  const { entries } = JSON.parse(readFileSync(join(failure.recovery.backup, 'manifest.json')));
  const originals = new Map(entries.map(entry => [entry.path, entry]));
  assert.equal(cli(root, ['recovery']).recovery.id, failure.recovery.id);
  assert.equal(cli(root, ['update'], 1).error.code, 'E_RECOVERY_PENDING');
  for (const [path, content] of snapshots) {
    const entry = originals.get(path), observed = published.get(path), file = join(root, path);
    if (content === null) assert.equal(entry.type, 'absent', path);
    else assert.equal(readFileSync(join(failure.recovery.backup, 'blobs', entry.blob), 'utf8'), content, path);
    if (observed === null) assert.equal(existsSync(file), false, path);
    else {
      const current = fs.lstatSync(file, { bigint: true });
      assert.deepEqual(readFileSync(file), observed.bytes, path);
      assert.equal(current.ino, observed.identity.ino, path); assert.equal(current.mode, observed.identity.mode, path);
    }
  }
  assert.equal(git(root, 'ls-files', '--stage', derived), record);
  assert.equal(git(root, 'show', ':human.txt'), 'human staged before operation\n');
  assert.equal(git(root, 'show', ':concurrent.txt'), 'concurrent staged content\n');
});

test("old plan of exclusion writing is refused and preserves the index", t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const derived = '.claude/skills/configurar-projeto/SKILL.md';
  git(root, 'add', '-f', derived);
  const exclude = resolve(root, git(root, 'rev-parse', '--git-path', 'info/exclude').trim());
  writeFileSync(exclude, '# initial exclusion\n');
  const plan = planInstallation({ target: root, mode: 'update' });
  assert.equal(plan.changes.length, 0);
  assert.deepEqual(plan.untrack.paths, []);
  const index = git(root, 'ls-files', '--stage', '-z');
  plan.localIgnore.edits.push({ path: exclude, before: '# initial exclusion\n', after: 'indevido\n' });
  assert.throws(() => applyPlan(plan), /desabilitado/);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), index);
  assert.equal(readFileSync(exclude, 'utf8'), '# initial exclusion\n');
});

test("human rule that includes generated input is preserved during init", t => {
  const root = fixture(t), human = '!/AGENTS.md\n';
  write(root, '.gitignore', human);
  const exclude = resolve(root, git(root, 'rev-parse', '--git-path', 'info/exclude').trim());
  const original = readFileSync(exclude, 'utf8');
  for (const args of [['--dry-run'], ['--force']]) {
    const result = cli(root, ['init', '--agents', 'claude', ...args]);
    assert.ok(result.localIgnore.pending.some(item => item.code === 'output-visible' && item.path === 'AGENTS.md'));
    assert.equal(existsSync(join(root, '.pbai4devs')), !args.includes('--dry-run'));
    assert.equal(read(root, '.gitignore'), human);
    assert.equal(readFileSync(exclude, 'utf8'), original);
  }
});

test("doctor and sync warn about visible entry without overwriting human rule", t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const human = '!/AGENTS.md\n', original = read(root, 'AGENTS.md');
  write(root, '.gitignore', human);
  const doctor = cli(root, ['doctor']);
  assert.ok(doctor.localIgnore.pending.some(item => item.code === 'output-visible' && item.path === 'AGENTS.md'));
  for (const args of [['sync', '--check'], ['update', '--force']]) {
    const result = cli(root, args);
    assert.ok(result.localIgnore.pending.some(item => item.code === 'output-visible' && item.path === 'AGENTS.md'));
  }
  assert.equal(read(root, '.gitignore'), human);
  assert.equal(read(root, 'AGENTS.md'), original);
});

test("upgrade preserves legacy exclusions with proven ownership", t => {
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
  for (const [path, block] of Object.entries(ignores)) assert.equal(read(root, path), `${block}\n`);
});

test("legacy ownership preserves human denials outside the block and changed blocks", t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude']);
  const path = '.pbai4devs/.gitignore';
  const block = '# BEGIN AGENT IGNORE\n!/catalog.json\n# END AGENT IGNORE';
  const state = JSON.parse(read(root, statePath)); delete state.files[path]; state.blocks[path] = hash(block);
  write(root, statePath, JSON.stringify(state, null, 2) + '\n');
  const human = `${block}\n!/catalog.json\n`;
  write(root, path, human);
  cli(root, ['update', '--force']);
  assert.equal(read(root, path), human);
  write(root, path, block.replace('!/catalog.json', '!/skills.json') + '\n');
  const modified = read(root, path), result = cli(root, ['update', '--force'], 1);
  assert.ok(result.conflicts.includes(path));
  assert.equal(read(root, path), modified);
});
