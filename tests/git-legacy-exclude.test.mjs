import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, linkSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { testGitConfig } from '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import { applyLocalIgnore, assertLegacyIgnoreMigration, checkLocalIgnore, planLegacyIgnoreMigration, planLocalIgnore } from '../.pbai4devs/scripts/lib/gitignore.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(repository, 'bin/agentdevkit.mjs');
const sync = join(repository, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
const supportsRuntime = Number(process.versions.node.split('.')[0]) >= 24 && !process.versions.bun;
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
Object.assign(env, { GIT_CONFIG_GLOBAL: testGitConfig, GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' });

function run(cwd, program, args) {
  return spawnSync(program, args, { cwd, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
}

function git(root, ...args) {
  const result = run(root, 'git', args);
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout.trimEnd();
}

function fixture(t) {
  const requestedBase = mkdtempSync(join(tmpdir(), 'adk-exclude-marker-'));
  const base = realpathSync.native(requestedBase);
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'project'), template = join(base, 'empty-git-template');
  mkdirSync(root); mkdirSync(template);
  git(root, 'init', '--quiet', `--template=${template}`);
  writeFileSync(join(root, 'human.txt'), 'conteúdo humano preparado\n');
  writeFileSync(join(root, '.gitignore'), '# ignore humano\n');
  git(root, 'add', '--', 'human.txt', '.gitignore');
  const index = resolve(root, git(root, 'rev-parse', '--git-path', 'index'));
  const exclude = resolve(root, git(root, 'rev-parse', '--git-path', 'info/exclude'));
  mkdirSync(dirname(exclude), { recursive: true });
  return { base, root, requestedRoot: join(requestedBase, 'project'), index, exclude };
}

function snapshots(paths) {
  return new Map(paths.map(path => [path, existsSync(path) ? readFileSync(path) : null]));
}

function assertUnchanged(before) {
  for (const [path, bytes] of before) {
    assert.deepEqual(existsSync(path) ? readFileSync(path) : null, bytes, `conteúdo alterado: ${path}`);
  }
}

// Stock ignore body emitted by the published AgentDevKit 0.0.21 planner
// in an isolated Git repository. The root-specific markers are built in the fixture.
const stockBody = gunzipSync(Buffer.from([
  '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',
].join(''), 'base64')).toString('ascii');

function legacyBlock(root, body = stockBody) {
  const id = createHash('sha256').update(root).digest('hex').slice(0, 16);
  return `# BEGIN AGENTDEVKIT LOCAL ${id}\n${body}# END AGENTDEVKIT LOCAL ${id}\n`;
}

function matchedRules(root, paths) {
  const result = spawnSync('git', ['check-ignore', '--verbose', '--no-index', '--non-matching', '--stdin', '-z'], {
    cwd: root, env, encoding: 'utf8', input: paths.join('\0') + '\0',
  });
  assert.equal(result.status, 0, result.stderr);
  const rows = result.stdout.split('\0');
  assert.equal(rows.length, paths.length * 4 + 1);
  return paths.map((path, index) => {
    const [file, , pattern, name] = rows.slice(index * 4, index * 4 + 4);
    assert.equal(name, path);
    return [file, pattern];
  });
}

test("reconstitutes 0.0.21 and keeps the effective rules of ignoring in the same position", t => {
  const { root, requestedRoot, exclude, index } = fixture(t);
  writeFileSync(join(root, '.gitignore'), '# ignore humano\n!/.claude/\n');
  const prefix = Buffer.from('# regra humana \xff\r\n*.scratch\r\n!/.pbai4devs/skills.json\r\n', 'latin1');
  const suffix = Buffer.from('!/.pbai4devs/catalog.json\r\n# sufixo sem quebra \xfe', 'latin1');
  writeFileSync(exclude, Buffer.concat([prefix, Buffer.from(legacyBlock(root)), suffix]));
  const human = snapshots([index, join(root, '.git/config'), join(root, '.gitignore')]);
  const paths = [
    'human.scratch', '.pbai4devs/skills.json', '.pbai4devs/catalog.json',
    '.pbai4devs/estado/agentdevkit.json', '.claude/.env', '.claude/.env.example',
    '.claude/.agentdevkit-human-probe', 'tool/.agent-tests/log', 'src/main.js',
  ];
  const prior = matchedRules(root, paths);
  assert.deepEqual(prior.map(([, pattern]) => pattern.startsWith('!') ? 'included' : pattern ? 'ignored' : 'unmatched'),
    ['ignored', 'ignored', 'included', 'ignored', 'ignored', 'included', 'unmatched', 'ignored', 'unmatched']);
  const plan = planLocalIgnore(requestedRoot);
  assert.equal(plan.legacyMigrationStatus, 'migration');
  assert.equal(checkLocalIgnore(plan).pending.find(item => item.code === 'shared-ignore-legacy').migration, 'migration');
  const edit = plan.legacyMigration;
  assert.equal(edit.path, exclude);
  assert.equal(edit.mode, statSync(exclude).mode & 0o7777);
  assert.deepEqual(edit.before, readFileSync(exclude));
  assert.equal(edit.removedMarkers, 2);
  assert.equal(edit.removedDuplicates, 9);
  assert.deepEqual(edit.after.subarray(0, prefix.length), prefix);
  assert.deepEqual(edit.after.subarray(-suffix.length), suffix);

  // A transaction writer holds this lock when it revalidates the plan.
  writeFileSync(exclude + '.lock', '', { flag: 'wx' });
  assert.doesNotThrow(() => assertLegacyIgnoreMigration(plan));
  assertUnchanged(human);
  writeFileSync(exclude, edit.after);
  assert.deepEqual(matchedRules(root, paths), prior);
  assert.deepEqual(planLegacyIgnoreMigration(root), { status: 'absent' });
  assertUnchanged(human);
});

test("accepts ordered canonical inputs from the generator and refuses unknown outputs", t => {
  const { root, exclude } = fixture(t);
  const section = '\n# Estado privado dos clientes\n';
  const withEntrypoints = stockBody.replace(section, '/AGENTS.md\n/claude.md\n' + section);
  writeFileSync(exclude, legacyBlock(root, withEntrypoints));
  const result = planLegacyIgnoreMigration(root);
  assert.equal(result.status, 'migration');
  assert.match(result.edit.after.toString(), /\n\/AGENTS\.md\n\/claude\.md\n/);
  for (const body of [
    withEntrypoints.replace('/AGENTS.md', '/plano-humano.md'),
    withEntrypoints.replace('/AGENTS.md\n/claude.md', '/claude.md\n/AGENTS.md'),
    withEntrypoints.replace('/AGENTS.md\n', '/AGENTS.md\n/Agents.md\n'),
  ]) {
    const original = Buffer.from(legacyBlock(root, body));
    writeFileSync(exclude, original);
    assert.deepEqual(planLegacyIgnoreMigration(root), { status: 'unverified' });
    assert.deepEqual(readFileSync(exclude), original);
  }
});

test("block refusal of another root and changes in content or authenticated structure", t => {
  const { root, exclude } = fixture(t);
  const valid = legacyBlock(root);
  for (const original of [
    legacyBlock(join(root, 'outro')),
    valid.replace('/.claude/', '!/.claude/'),
    valid.replace('# Estado privado dos clientes', '# comentário humano alterado'),
    valid.replace(/\n/g, '\r\n'),
    valid.slice(0, -1),
    valid + valid,
  ]) {
    writeFileSync(exclude, original);
    const planned = planLocalIgnore(root);
    assert.equal(planned.legacyMigrationStatus, 'unverified');
    assert.equal(planned.legacyMigration, null);
    assert.equal(checkLocalIgnore(planned).pending.find(item => item.code === 'shared-ignore-legacy').migration, 'unverified');
    assert.equal(readFileSync(exclude, 'utf8'), original);
  }
});

test("revalidation refusal human edition, other after or new worktree shared", t => {
  const { base, root, exclude } = fixture(t);
  git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--quiet', '-m', 'fixture');
  const before = legacyBlock(root);
  writeFileSync(exclude, before);
  const plan = planLocalIgnore(root);
  assert.equal(plan.legacyMigrationStatus, 'migration');
  assert.throws(() => assertLegacyIgnoreMigration({
    ...plan, legacyMigration: { ...plan.legacyMigration, after: Buffer.from('/injecao\n') },
  }), /mudou após o planejamento/);
  writeFileSync(exclude, before + '# nova linha humana\n');
  assert.throws(() => assertLegacyIgnoreMigration(plan), /mudou após o planejamento/);
  assert.equal(readFileSync(exclude, 'utf8'), before + '# nova linha humana\n');
  writeFileSync(exclude, before);
  const nested = join(root, 'subprojeto');
  mkdirSync(nested);
  assert.deepEqual(planLegacyIgnoreMigration(nested), { status: 'shared' });
  const linked = join(base, 'vinculado');
  git(root, 'worktree', 'add', '--quiet', '--detach', linked);
  assert.deepEqual(planLegacyIgnoreMigration(linked), { status: 'shared' });
  assert.deepEqual(planLegacyIgnoreMigration(root), { status: 'shared' });
  assert.throws(() => assertLegacyIgnoreMigration(plan), /mudou após o planejamento/);
  assert.equal(readFileSync(exclude, 'utf8'), before);
});

test("does not plan editing when the file excludes has hardlink", t => {
  const { base, root, exclude } = fixture(t);
  const before = legacyBlock(root), alias = join(base, 'alias');
  writeFileSync(exclude, before);
  try { linkSync(exclude, alias); }
  catch (error) {
    if (!['ENOTSUP', 'EPERM', 'EACCES'].includes(error.code)) throw error;
    return t.skip('O sistema de arquivos da fixture não permite hardlink.');
  }
  assert.deepEqual(planLegacyIgnoreMigration(root), { status: 'unverified' });
  assert.equal(readFileSync(exclude, 'utf8'), before);
  assert.equal(readFileSync(alias, 'utf8'), before);
});

test("Retired roots detect private files without joining the active catalog", t => {
  const { root } = fixture(t);
  const ignore = join(root, '.gitignore');
  writeFileSync(ignore, '# ignore humano\n!/.agent/\n!/.codex/\n');
  mkdirSync(join(root, '.agent'));
  mkdirSync(join(root, '.kimi'));
  writeFileSync(join(root, '.agent/.env'), 'fixture privada\n');
  writeFileSync(join(root, '.kimi/auth.json'), '{}\n');
  git(root, 'add', '-f', '--', '.kimi/auth.json');
  const plan = planLocalIgnore(root);
  const check = checkLocalIgnore(plan);
  assert.ok(plan.optedRoots.includes('.codex'));
  assert.ok(!plan.optedRoots.includes('.agent'));
  assert.ok(check.trackedOutputs.includes('.kimi/auth.json'));
  assert.ok(check.pending.some(item => item.code === 'private-file-visible' && item.path === '.agent/.env'));
});

test("init refusal locks external before publishing files or open recovery", {
  skip: !supportsRuntime && 'A CLI do kit requer Node.js 24 ou superior nesta fixture.',
  timeout: 120000,
}, t => {
  const { root, requestedRoot, exclude, index } = fixture(t);
  writeFileSync(exclude, legacyBlock(root));
  writeFileSync(exclude + '.lock', 'trava existente\n', { flag: 'wx' });
  const before = snapshots([exclude, exclude + '.lock', index, join(root, '.git/config'), join(root, '.gitignore'), join(root, 'human.txt')]);
  const entries = readdirSync(root).sort();
  const locked = run(root, process.execPath, [cli, 'init', '--agents', 'codex', '--target', requestedRoot, '--yes', '--json']);
  assert.notEqual(locked.status, 0, locked.stdout + locked.stderr);
  const report = JSON.parse(locked.stdout);
  assert.equal(report.error?.code, 'EEXIST');
  assert.equal(report.recovery, undefined);
  assert.deepEqual(readdirSync(root).sort(), entries);
  assertUnchanged(before);
});

for (const kind of ['update da CLI', 'sync direto']) {
  test(`${kind}: migra bloco autêntico uma vez e preserva configuração, índice e backup`, {
    skip: !supportsRuntime && 'A CLI do kit requer Node.js 24 ou superior nesta fixture.',
    timeout: 240000,
  }, t => {
    const { root, requestedRoot, exclude, index } = fixture(t);
    const command = args => run(root, process.execPath, [cli, ...args, '--target', requestedRoot, '--yes', '--json']);
    const apply = () => kind === 'update da CLI' ? command(['update']) : run(root, process.execPath, [sync, '--root', requestedRoot]);
    const check = () => kind === 'update da CLI' ? command(['sync', '--check']) : run(root, process.execPath, [sync, '--root', requestedRoot, '--check']);
    const initialized = command(['init', '--agents', 'codex']);
    assert.equal(initialized.status, 0, initialized.stdout + initialized.stderr);

    const before = Buffer.from(`# regra humana anterior\r\n*.fixture-local\r\n${legacyBlock(root)}!/.pbai4devs/skills.json\n# fim humano sem quebra`);
    writeFileSync(exclude, before);
    const mode = statSync(exclude).mode & 0o7777;
    const { edit } = planLegacyIgnoreMigration(requestedRoot);
    assert.deepEqual(edit.before, before);
    const human = snapshots([index, join(root, '.git/config'), join(root, '.gitignore'), join(root, 'human.txt')]);
    const beforeCheck = check();
    assert.equal(beforeCheck.status, 1, beforeCheck.stdout + beforeCheck.stderr);
    if (kind === 'update da CLI') {
      const data = JSON.parse(beforeCheck.stdout);
      assert.deepEqual(data.localIgnore.legacyMigration, { path: '.git/info/exclude', status: 'planned' });
      assert.ok(!beforeCheck.stdout.includes('regra humana anterior'));
    }
    assert.deepEqual(readFileSync(exclude), before);
    assertUnchanged(human);

    const lock = Buffer.from('lock existente criado fora do kit\n');
    const migrationRoot = join(root, '.agent-tests/agentdevkit/ignore-migrations');
    writeFileSync(exclude + '.lock', lock, { flag: 'wx' });
    const blocked = apply();
    assert.notEqual(blocked.status, 0, blocked.stdout + blocked.stderr);
    if (kind === 'update da CLI') assert.equal(JSON.parse(blocked.stdout).error?.code, 'EEXIST');
    else assert.match(blocked.stderr, /Git info\/exclude is locked\./);
    assert.deepEqual(readFileSync(exclude + '.lock'), lock);
    assert.deepEqual(readFileSync(exclude), before);
    assert.equal(existsSync(migrationRoot), false);
    assertUnchanged(human);
    rmSync(exclude + '.lock');

    const applied = apply();
    assert.equal(applied.status, 0, applied.stdout + applied.stderr);
    const migration = kind === 'update da CLI'
      ? JSON.parse(applied.stdout).localIgnore?.legacyMigration
      : { backup: applied.stdout.match(/^Exclusao legada migrada\. Backup local: (.+)\r?$/m)?.[1] };
    assert.match(migration?.backup ?? '', /^\.agent-tests\/agentdevkit\/ignore-migrations\/[a-f0-9-]+$/);
    const backupFile = join(root, migration.backup, 'exclude');
    assert.deepEqual(readFileSync(backupFile), before);
    assert.equal(git(root, 'check-ignore', '--', migration.backup + '/exclude'), migration.backup + '/exclude');
    if (process.platform !== 'win32') {
      assert.equal(statSync(join(root, migration.backup)).mode & 0o777, 0o700);
      assert.equal(statSync(exclude).mode & 0o7777, mode);
    }
    assert.deepEqual(readFileSync(exclude), edit.after);
    assert.equal(existsSync(exclude + '.lock'), false);
    assertUnchanged(human);
    const finished = check();
    assert.equal(finished.status, 0, finished.stdout + finished.stderr);
    assert.deepEqual(readFileSync(exclude), edit.after);
    const repeated = apply();
    assert.equal(repeated.status, 0, repeated.stdout + repeated.stderr);
    if (kind === 'update da CLI') {
      const data = JSON.parse(repeated.stdout);
      assert.equal(data.localIgnore?.legacyMigration, undefined);
      assert.ok(!data.plan.some(item => item.path === '.git/info/exclude'));
    } else assert.ok(!repeated.stdout.includes('Exclusao legada migrada'));
    assert.deepEqual(readdirSync(migrationRoot), [basename(migration.backup)]);
    assert.deepEqual(readFileSync(backupFile), before);
    assert.deepEqual(readFileSync(exclude), edit.after);
    assertUnchanged(human);
  });
}

// A marker is a diagnostic pattern, not evidence of who wrote the block.
const variants = [
  ['completo LF', '# BEGIN AGENTDEVKIT LOCAL 0123456789abcdef\n/.claude/\n# END AGENTDEVKIT LOCAL 0123456789abcdef\n', true],
  ['completo CRLF', '# BEGIN AGENTDEVKIT LOCAL 0123456789abcdef\r\n/.claude/\r\n# END AGENTDEVKIT LOCAL 0123456789abcdef\r\n', true],
  ['início truncado', '# BEGIN AGENTDEVKIT LOCAL 0123456789abcdef\n/.claude/\n', true],
  ['corpo alterado', '# BEGIN AGENTDEVKIT LOCAL 0123456789abcdef\n# comentário humano\n!/.claude/\n# END AGENTDEVKIT LOCAL 0123456789abcdef\n', true],
  ['marcadores múltiplos', '# BEGIN AGENTDEVKIT LOCAL 0123456789abcdef\n/.claude/\n# END AGENTDEVKIT LOCAL 0123456789abcdef\n# BEGIN AGENTDEVKIT LOCAL fedcba9876543210\n/.codex/\n# END AGENTDEVKIT LOCAL fedcba9876543210\n', true],
  ['início alterado', '# BEGIN AGENTDEVKIT LOCAL 0123456789abcdeZ\n/.claude/\n# END AGENTDEVKIT LOCAL 0123456789abcdef\n', false],
];

for (const [name, marker, detected] of variants) {
  test(`diagnóstico de marcador ${name} preserva exclude e índice`, t => {
    const { root, index, exclude } = fixture(t);
    writeFileSync(exclude, Buffer.from(`# exclusões humanas\r\n*.privado\r\n${marker}# fim humano\r\n`));
    const before = snapshots([exclude, index, join(root, '.git/config'), join(root, '.gitignore')]);
    const plan = planLocalIgnore(root);
    assert.deepEqual(plan.edits, []);
    const inspection = checkLocalIgnore(plan);
    assert.equal(inspection.pending.some(item => item.code === 'shared-ignore-legacy'), detected);
    assert.equal(applyLocalIgnore(plan).changed, 0);
    assertUnchanged(before);
  });
}

test("legacy marker blocks check; isolated coverage warnings do not block", t => {
  const { root, index, exclude } = fixture(t);
  const marker = '# BEGIN AGENTDEVKIT LOCAL 0123456789abcdef';
  const body = `${marker}\n/.claude/\n# END AGENTDEVKIT LOCAL 0123456789abcdef\n`;
  writeFileSync(exclude, body);
  const before = snapshots([exclude, index, join(root, '.git/config'), join(root, '.gitignore')]);
  const withMarker = checkLocalIgnore(planLocalIgnore(root));
  assert.equal(withMarker.ok, false);
  assert.ok(withMarker.pending.some(item => item.code === 'shared-ignore-legacy'));
  assertUnchanged(before);
  // Only fixture is modified; ignore rules remain the same.
  writeFileSync(exclude, body.replace(marker, '# marcador desativado na fixture'));
  const edited = snapshots([exclude, index, join(root, '.git/config'), join(root, '.gitignore')]);
  const withoutMarker = checkLocalIgnore(planLocalIgnore(root));
  assert.equal(withoutMarker.ok, true);
  assert.ok(!withoutMarker.pending.some(item => item.code === 'shared-ignore-legacy'));
  assert.ok(withoutMarker.pending.some(item => item.code === 'artifact-coverage-unverified' || item.code === 'artifact-unprotected'));
  assertUnchanged(edited);
});

test('comandos e sync direto preservam marcador reconhecido e Git', { skip: !supportsRuntime ? 'A CLI do kit requer Node.js 24 ou superior nesta fixture.' : false, timeout: 180000 }, t => {
  const { root, index, exclude } = fixture(t);
  const marker = '# BEGIN AGENTDEVKIT LOCAL 0123456789abcdef\n# linha humana no bloco\n/.claude/\n# END AGENTDEVKIT LOCAL 0123456789abcdef\n';
  writeFileSync(exclude, `# prefixo humano\n${marker}# sufixo humano\n`);
  const before = snapshots([exclude, index, join(root, '.git/config'), join(root, '.gitignore')]);
  for (const args of [['init', '--agents', 'codex'], ['update'], ['update', '--force'], ['sync'], ['sync', '--force']]) {
    const result = run(root, process.execPath, [cli, ...args, '--target', root, '--yes', '--json']);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(JSON.parse(result.stdout).ok, true);
    assertUnchanged(before);
  }
  const direct = run(root, process.execPath, [sync, '--root', root]);
  assert.equal(direct.status, 0, direct.stdout + direct.stderr);
  assertUnchanged(before);
  for (const args of [['doctor'], ['sync', '--check']]) {
    const result = run(root, process.execPath, [cli, ...args, '--target', root, '--json']);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const data = JSON.parse(result.stdout);
    assert.equal(data.ok, false);
    assert.ok(data.issues?.some(item => item.code === 'shared-ignore-legacy')
      || data.localIgnore?.pending.some(item => item.code === 'shared-ignore-legacy'));
    assertUnchanged(before);
  }
  const guidance = {
    pt: 'Marcador semelhante ao legado em info/exclude:',
    en: 'Legacy-like marker in info/exclude:',
    es: 'Marcador similar al anterior en info/exclude:',
  };
  for (const [language, label] of Object.entries(guidance)) {
    for (const args of [['doctor'], ['sync', '--check']]) {
      const result = run(root, process.execPath, [cli, ...args, '--target', root, '--lang', language]);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.equal(result.stdout.split(label).length - 1, 1, result.stdout);
      assertUnchanged(before);
    }
  }
  writeFileSync(exclude, '# prefixo humano\n# sufixo humano\n');
  const withoutMarker = snapshots([exclude, index, join(root, '.git/config'), join(root, '.gitignore')]);
  for (const args of [['doctor'], ['sync', '--check']]) {
    const result = run(root, process.execPath, [cli, ...args, '--target', root, '--lang', 'pt']);
    const structured = run(root, process.execPath, [cli, ...args, '--target', root, '--lang', 'pt', '--json']);
    assert.ok([0, 1].includes(result.status), result.stderr || result.error?.message);
    assert.equal(structured.status, result.status, structured.stderr || structured.error?.message);
    const data = JSON.parse(structured.stdout);
    assert.equal(data.error, undefined);
    assert.ok(![...(data.issues || []), ...(data.localIgnore?.pending || [])].some(item => item.code === 'shared-ignore-legacy'));
    assert.ok(result.stdout.trim(), 'Saída humana vazia');
    assert.ok(!result.stdout.includes(guidance.pt), result.stdout);
    assertUnchanged(withoutMarker);
  }
});

test("worktree linked preserves shared exclusion and human indices", { skip: !supportsRuntime ? 'A CLI do kit requer Node.js 24 ou superior nesta fixture.' : false, timeout: 180000 }, t => {
  const { base, root, index, exclude } = fixture(t);
  git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '--no-verify', '-m', 'fixture');
  writeFileSync(join(root, 'human.txt'), 'alteração preparada na principal\n');
  git(root, 'add', '--', 'human.txt');
  const linked = join(base, 'linked');
  const added = run(root, 'git', ['worktree', 'add', '--quiet', '-b', 'linked-fixture', linked]);
  if (added.status !== 0 && /(?:not a git command|unknown subcommand|not supported)/i.test(added.stderr || '')) {
    return t.skip('Git worktree não disponível na fixture.');
  }
  assert.equal(added.status, 0, added.stderr || added.error?.message);
  writeFileSync(join(linked, 'human.txt'), 'alteração preparada na vinculada\n');
  git(linked, 'add', '--', 'human.txt');
  const linkedIndex = resolve(linked, git(linked, 'rev-parse', '--git-path', 'index'));
  const linkedExclude = resolve(linked, git(linked, 'rev-parse', '--git-path', 'info/exclude'));
  assert.equal(basename(linkedExclude), basename(exclude));
  const linkedParent = statSync(dirname(linkedExclude), { bigint: true });
  const excludeParent = statSync(dirname(exclude), { bigint: true });
  assert.equal(linkedParent.dev, excludeParent.dev);
  assert.equal(linkedParent.ino, excludeParent.ino);
  writeFileSync(exclude, '# regra humana\n# BEGIN AGENTDEVKIT LOCAL 0123456789abcdef\n/.claude/\n');
  const before = snapshots([exclude, index, linkedIndex, join(root, '.git/config'), join(root, '.gitignore'), join(linked, '.gitignore')]);
  const plan = planLocalIgnore(linked);
  assert.ok(checkLocalIgnore(plan).pending.some(item => item.code === 'shared-ignore-legacy'));
  assert.equal(applyLocalIgnore(plan).changed, 0);
  const result = run(linked, process.execPath, [cli, 'init', '--agents', 'codex', '--target', linked, '--yes', '--json']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assertUnchanged(before);
  const update = run(linked, process.execPath, [cli, 'update', '--force', '--target', linked, '--yes', '--json']);
  assert.equal(update.status, 0, update.stdout + update.stderr);
  assertUnchanged(before);
  const direct = run(linked, process.execPath, [sync, '--root', linked]);
  assert.equal(direct.status, 0, direct.stdout + direct.stderr);
  assertUnchanged(before);
});
