import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { testGitConfig } from '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import { applyLocalIgnore, checkLocalIgnore, planLocalIgnore } from '../.pbai4devs/scripts/lib/gitignore.mjs';

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
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'adk-exclude-marker-')));
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
  return { base, root, index, exclude };
}

function snapshots(paths) {
  return new Map(paths.map(path => [path, existsSync(path) ? readFileSync(path) : null]));
}

function assertUnchanged(before) {
  for (const [path, bytes] of before) {
    assert.deepEqual(existsSync(path) ? readFileSync(path) : null, bytes, `conteúdo alterado: ${path}`);
  }
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

test('marcador legado bloqueia check; avisos de cobertura isolados não bloqueiam', t => {
  const { root, index, exclude } = fixture(t);
  const marker = '# BEGIN AGENTDEVKIT LOCAL 0123456789abcdef';
  const body = `${marker}\n/.claude/\n# END AGENTDEVKIT LOCAL 0123456789abcdef\n`;
  writeFileSync(exclude, body);
  const before = snapshots([exclude, index, join(root, '.git/config'), join(root, '.gitignore')]);
  const withMarker = checkLocalIgnore(planLocalIgnore(root));
  assert.equal(withMarker.ok, false);
  assert.ok(withMarker.pending.some(item => item.code === 'shared-ignore-legacy'));
  assertUnchanged(before);
  // Somente a fixture é modificada; as regras de ignore continuam iguais.
  writeFileSync(exclude, body.replace(marker, '# marcador desativado na fixture'));
  const edited = snapshots([exclude, index, join(root, '.git/config'), join(root, '.gitignore')]);
  const withoutMarker = checkLocalIgnore(planLocalIgnore(root));
  assert.equal(withoutMarker.ok, true);
  assert.ok(!withoutMarker.pending.some(item => item.code === 'shared-ignore-legacy'));
  assert.ok(withoutMarker.pending.some(item => item.code === 'artifact-coverage-unverified' || item.code === 'artifact-unprotected'));
  assertUnchanged(edited);
});

test('comandos e sync direto preservam marcador reconhecido e Git', { skip: !supportsRuntime, timeout: 180000 }, t => {
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

test('worktree vinculada preserva exclude compartilhado e índices humanos', { skip: !supportsRuntime, timeout: 180000 }, t => {
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
  const canonicalExclude = path => join(realpathSync(dirname(path)), basename(path));
  const linkedExcludePath = canonicalExclude(linkedExclude), excludePath = canonicalExclude(exclude);
  assert.equal(process.platform === 'win32' ? linkedExcludePath.toLowerCase() : linkedExcludePath,
    process.platform === 'win32' ? excludePath.toLowerCase() : excludePath);
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
