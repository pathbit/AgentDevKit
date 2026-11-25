import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { main, parseArgs } from '../src/cli.mjs';
import { selectClientsFromMenu } from '../src/cli/client-menu.mjs';
import { applyPlan, inspect, planInstallation } from '../src/install.mjs';

import { fixture, read, state, statePath, put, cli } from './fixtures/client-selection-helpers.mjs';

test('the keyboard menu marks multiple clients and restores terminal input', async () => {
  const choices = [{ id: 'codex', name: 'Codex' }, { id: 'claude', name: 'Claude' }];
  const output = new PassThrough();
  let rendered = '';
  output.on('data', chunk => { rendered += chunk; });
  const openMenu = (language, initial = []) => {
    const input = new PassThrough();
    input.setRawMode = mode => { input.isRaw = mode; };
    return { input, result: selectClientsFromMenu({ input, output, choices, initial, language }) };
  };
  const first = openMenu('pt');
  first.input.write(' \x1b[B \r');
  assert.deepEqual(await first.result, ['codex', 'claude']);
  assert.equal(first.input.isRaw, false);
  assert.equal(first.input.readableFlowing, false);
  assert.match(rendered, /\[x\] Claude/);

  const all = openMenu('en', ['all']);
  all.input.write('\r');
  assert.deepEqual(await all.result, ['all']);
  const none = openMenu('en', ['codex']);
  none.input.write(' \r');
  assert.deepEqual(await none.result, ['none']);

  const second = openMenu('es', ['claude']);
  second.input.write('\x03');
  await assert.rejects(second.result, { code: 'E_CANCELLED', exitCode: 130 });
  assert.equal(second.input.isRaw, false);
  assert.match(rendered, /Elige los agentes de código/);
});

test('cancelling an onboarding question leaves the project alone', async t => {
  for (const [name, cancel] of [
    ['Ctrl-C', input => input.write('\x03')],
    ['Ctrl-D', input => input.write('\x04')],
    ['end of input', input => input.end()],
  ]) await t.test(name, { timeout: 5000 }, async subtest => {
    const root = fixture(subtest);
    const input = new PassThrough();
    input.isTTY = true;
    input.setRawMode = mode => { input.isRaw = mode; };
    const output = new PassThrough();
    output.isTTY = true;
    output.columns = 80;
    let rendered = '';
    let answerSent = false;
    let interrupted = false;
    output.on('data', chunk => {
      rendered += chunk;
      if (!answerSent && rendered.includes('Idioma / Language')) {
        answerSent = true;
        setImmediate(() => input.write('en\r'));
      }
      if (!interrupted && rendered.includes('What do you want to do?')) {
        interrupted = true;
        setImmediate(() => cancel(input));
      }
    });
    const status = await main(['init', '--target', root, '--agents', 'codex'], {
      stdin: input, stdout: output, stderr: { isTTY: false, write: assert.fail },
    });
    assert.equal(status, 130, rendered);
    assert.match(rendered, /Selection cancelled\./);
    assert.equal(input.isRaw, false);
    assert.deepEqual(readdirSync(root).filter(name => name !== '.git'), []);
  });
});

function ruleSnapshot(root) {
  const result = [];
  function visit(relative) {
    for (const entry of readdirSync(join(root, relative), { withFileTypes: true })) {
      const path = `${relative}/${entry.name}`, absolute = join(root, path);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) result.push([path, readFileSync(absolute).toString('base64'), statSync(absolute).mode & 0o777]);
      else assert.fail(`Tipo inesperado: ${path}`);
    }
  }
  visit('.claude/rules'); return result.sort((a, b) => a[0].localeCompare(b[0]));
}
function gitSnapshot(root) {
  return Object.fromEntries(['.git/index', '.git/info/exclude', '.git/config', '.git/HEAD', '.gitignore'].map(path => [path, existsSync(join(root, path)) ? readFileSync(join(root, path)) : null]));
}

const managedClaude = ['.claude/agents/revisor.md', '.claude/commands/preparar-dev.md', '.claude/skills/criar-skill/SKILL.md'];
const humanClaude = ['.claude/commands/user-note.md', '.claude/skills/user-custom/SKILL.md'];
function prepareClaudeRetirement(root) {
  for (const path of managedClaude) assert.ok(existsSync(join(root, path)), `Gerenciado ausente: ${path}`);
  for (const path of humanClaude) put(root, path, `# Humano: ${path}\n`);
}
function verifyClaudeRetirement(root) {
  for (const path of managedClaude) assert.equal(existsSync(join(root, path)), false, `Gerenciado não retirado: ${path}`);
  for (const path of humanClaude) assert.equal(read(root, path), `# Humano: ${path}\n`);
}

test("selection validates aliases and entries before writing; query is read only", t => {
  assert.deepEqual(parseArgs(['init', '--agents', 'CODEX,claude-code,codex']).clients, ['claude', 'codex']);
  assert.deepEqual(parseArgs(['clients', 'vscode']).clients, ['copilot']);
  for (const args of [['init', '--agents', ''], ['agents', 'unknown'], ['init', '--agents', 'all,codex'], ['doctor', '--agents', 'codex'], ['agents', '--dry-run']]) assert.throws(() => parseArgs(args), { code: 'E_ARGS' });
  const root = fixture(t);
  const result = cli(root, ['agents']);
  assert.deepEqual(result.clients, ['none']); assert.ok(result.availableClients.some(client => client.id === 'codex'));
  assert.equal(result.kitInstalled, false);
  assert.deepEqual(result.configuredClients, []);
  assert.deepEqual(result.clientRoots, []);
  cli(root, ['init', '--agents', 'unknown'], 2);
  cli(root, ['agents', 'claude'], 1);
  assert.deepEqual(readdirSync(root).filter(name => name !== '.git'), []);
});

test("new selections create only the successors of the retired adapters", async t => {
  for (const [input, selected] of [['all', ['all']], ['antigravity-legacy,kimi-legacy', ['antigravity', 'kimi']]]) await t.test(input, t => {
    const root = fixture(t);
    cli(root, ['init', '--agents', input]);
    for (const path of ['.agents', '.kimi-code']) assert.ok(existsSync(join(root, path)), path);
    for (const path of ['.agent', '.kimi']) assert.equal(existsSync(join(root, path)), false, path);
    assert.doesNotMatch(read(root, '.pbai4devs/espelhos.conf'), /\|\.(?:agent|kimi)(?:[|/]|$)/m);
    assert.deepEqual(state(root).clients, selected);
  });
});

test("update retires old own references and preserves human content and staged", async t => {
  for (const [saved, expected] of [[['all'], ['all']], [['antigravity-legacy', 'kimi-legacy'], ['antigravity', 'kimi']]]) await t.test(saved.join(','), t => {
    const root = fixture(t);
    cli(root, ['init', '--agents', saved[0] === 'all' ? 'all' : 'antigravity,kimi']);
    const owned = ['.agent/skills/projeto/intacta/SKILL.md', '.kimi/skills/intacta/SKILL.md'];
    const edited = '.agent/skills/projeto/editada/SKILL.md', staged = '.kimi/skills/staged/SKILL.md';
    const human = ['.agent/skills/projeto/intacta/nota.md', '.kimi/skills/humana/SKILL.md'];
    const manifest = '.pbai4devs/espelhos.conf';
    const recorded = state(root);
    recorded.clients = saved;
    const original = '<!-- gerado: sincronizar-agentes -->\n';
    const digest = value => createHash('sha256').update(value).digest('hex');
    for (const path of [...owned, edited, staged]) {
      put(root, path, original);
      recorded.files[path] = digest(original);
    }
    put(root, edited, 'Apontamento que agora contém texto humano.\n');
    for (const path of human) put(root, path, `Humano em ${path}\n`);
    const stagedContents = 'Conteúdo conservado no índice e diferente da cópia de trabalho.\n';
    put(root, staged, stagedContents);
    const git = (...args) => {
      const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout;
    };
    git('add', '-f', '--', staged);
    put(root, staged, original);
    const legacyManifest = read(root, manifest) + 'agente|.agent|agrupado\nagente|.kimi|agrupado\nformato|.kimi|skills|plano\n';
    put(root, manifest, legacyManifest);
    recorded.files[manifest] = digest(legacyManifest);
    const originalState = `${JSON.stringify(recorded, null, 2)}\n`;
    put(root, statePath, originalState);
    const beforeIndex = readFileSync(join(root, '.git/index'));
    const retained = new Map([edited, staged, ...human].map(path => [path, read(root, path)]));

    const dryRun = cli(root, ['update', '--dry-run']);
    for (const path of owned) assert.ok(dryRun.plan.some(item => item.path === path && item.action === 'remove'), path);
    for (const path of retained.keys()) assert.ok(!dryRun.plan.some(item => item.path === path), path);
    assert.equal(read(root, statePath), originalState);
    assert.equal(read(root, manifest), legacyManifest);
    for (const path of owned) assert.equal(read(root, path), original);

    cli(root, ['update']);
    const updated = state(root);
    assert.deepEqual(updated.clients, expected);
    assert.doesNotMatch(read(root, manifest), /\|\.(?:agent|kimi)(?:[|/]|$)/m);
    for (const path of owned) assert.equal(existsSync(join(root, path)), false, path);
    for (const [path, contents] of retained) assert.equal(read(root, path), contents, path);
    for (const path of [...owned, ...retained.keys()]) assert.ok(!updated.files[path] && !updated.blocks[path], path);
    assert.deepEqual(readFileSync(join(root, '.git/index')), beforeIndex);
    assert.equal(git('show', `:${staged}`), stagedContents);
    assert.equal(cli(root, ['update']).changed, false);
  });
});

test("isolated claude, codex skills and persistence do not create extra customers", t => {
  const root = fixture(t);
  cli(root, ['init', '--agents', 'claude']);
  assert.deepEqual(state(root).clients, ['claude']); assert.ok(existsSync(join(root, 'CLAUDE.md')));
  assert.match(read(root, 'CLAUDE.md'), /AGENTS\.md/);
  for (const path of ['.agents', '.agent', '.codex', '.github', '.vscode', 'GEMINI.md']) assert.equal(existsSync(join(root, path)), false, path);
  cli(root, ['agents', 'codex', '--dry-run']);
  assert.deepEqual(state(root).clients, ['claude']); assert.equal(existsSync(join(root, '.codex')), false);
  cli(root, ['agents', 'codex,claude']);
  assert.ok(existsSync(join(root, '.agents/skills/projeto/criar-skill/SKILL.md')));
  for (const path of ['.agents/skills.json', '.agents/agents', '.agents/commands', '.agents/rules', '.codex/skills']) {
    assert.equal(existsSync(join(root, path)), false, path);
  }
  assert.equal(cli(root, ['agents', 'claude,codex']).changed, false);
  cli(root, ['update']); cli(root, ['sync']); cli(root, ['lang', 'es']);
  assert.deepEqual(state(root).clients, ['claude', 'codex']);
  prepareClaudeRetirement(root);
  const rulesBefore = ruleSnapshot(root), gitBefore = gitSnapshot(root);
  assert.ok(rulesBefore.length);
  const selected = cli(root, ['clients', 'codex']);
  assert.equal(existsSync(join(root, 'CLAUDE.md')), false);
  assert.deepEqual(ruleSnapshot(root), rulesBefore); assert.deepEqual(gitSnapshot(root), gitBefore);
  verifyClaudeRetirement(root);
  assert.deepEqual([...selected.retainedClaudeRules].sort(), rulesBefore.map(item => item[0]).sort());
  assert.match(selected.warnings.join(' '), /global/i);
  assert.equal(existsSync(join(root, 'GEMINI.md')), false);
  assert.deepEqual(cli(root, ['agents']).clients, ['codex']);
  for (const args of [['doctor'], ['sync', '--check']]) {
    const diagnostic = cli(root, args, 1);
    assert.deepEqual([...diagnostic.retainedClaudeRules].sort(), rulesBefore.map(item => item[0]).sort());
    assert.match(diagnostic.warnings.join(' '), /global/i);
  }
  const direct = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(direct.status, 1, direct.stdout + direct.stderr); assert.match(direct.stdout, /Escopo Claude nao verificado/);
  assert.deepEqual(ruleSnapshot(root), rulesBefore); assert.deepEqual(gitSnapshot(root), gitBefore);
  assert.equal(existsSync(join(root, '.pbai4devs/tools/skills/.local')), false);
});

test("Codex uses a single skill route and migrates only intact own notes", async t => {
  for (const selection of ['codex', 'all']) await t.test(selection, t => {
    const root = fixture(t);
    const git = (...args) => {
      const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout;
    };
    put(root, '.gitignore', '# human ignore\nnode_modules/\n');
    cli(root, ['init', '--agents', selection]);
    const source = '.agents/skills/projeto/criar-skill/SKILL.md';
    const managed = '.codex/skills/projeto/criar-skill/SKILL.md';
    const modified = '.codex/skills/projeto/criar-agente/SKILL.md';
    const staged = '.codex/skills/projeto/criar-regra/SKILL.md';
    const custom = '.codex/skills/custom/SKILL.md';
    const original = read(root, source);
    const recorded = state(root);
    for (const path of [managed, modified, staged]) {
      put(root, path, original);
      recorded.files[path] = createHash('sha256').update(original).digest('hex');
    }
    put(root, modified, `${original}\nHuman edit.\n`);
    git('add', '-f', '--', staged);
    put(root, staged, `${original}\nHuman staged-worktree difference.\n`);
    put(root, custom, '---\nname: custom\ndescription: Skill própria.\n---\n\n# Custom\n');
    put(root, statePath, `${JSON.stringify(recorded, null, 2)}\n`);
    const beforeIndex = readFileSync(join(root, '.git/index'));
    const beforeIgnore = read(root, '.gitignore');
    const beforeModified = read(root, modified), beforeStaged = read(root, staged), beforeCustom = read(root, custom);
    const plan = cli(root, ['update', '--dry-run']);
    assert.ok(plan.plan.some(item => item.action === 'remove' && item.path === managed));
    assert.ok(!plan.plan.some(item => [modified, staged, custom].includes(item.path)));
    cli(root, ['update']);
    assert.equal(existsSync(join(root, managed)), false);
    assert.equal(read(root, modified), beforeModified);
    assert.equal(read(root, staged), beforeStaged);
    assert.equal(read(root, custom), beforeCustom);
    assert.equal(read(root, '.gitignore'), beforeIgnore);
    assert.deepEqual(readFileSync(join(root, '.git/index')), beforeIndex);
    assert.equal(read(root, source), original);
    cli(root, ['sync']);
    assert.equal(cli(root, ['update', '--dry-run']).plan.length, 0);
    assert.equal(cli(root, ['doctor']).ok, true);
    assert.equal(cli(root, ['sync', '--check']).ok, true);
    assert.equal(existsSync(join(root, managed)), false);
    assert.equal(read(root, modified), beforeModified);
    assert.equal(read(root, staged), beforeStaged);
    assert.equal(read(root, custom), beforeCustom);
  });
});


test("Codex fails without changing the project if the two routes are blocked", t => {
  const root = fixture(t);
  put(root, '.gitignore', '# project\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
  put(root, '.agents/skills/qualidade', 'primary human\n');
  put(root, '.codex/skills/qualidade', 'fallback human\n');
  const beforeIndex = readFileSync(join(root, '.git/index'));
  const result = cli(root, ['init', '--agents', 'codex'], 1);
  assert.match(result.error.detail, /Skill indisponivel/);
  assert.equal(read(root, '.agents/skills/qualidade'), 'primary human\n');
  assert.equal(read(root, '.codex/skills/qualidade'), 'fallback human\n');
  assert.equal(read(root, '.gitignore'), '# project\n');
  assert.deepEqual(readFileSync(join(root, '.git/index')), beforeIndex);
  assert.equal(existsSync(join(root, '.pbai4devs')), false);
});

test("Codex preserves human skill on the native route and alternates selection with fallback", t => {
  const root = fixture(t), primary = '.agents/skills/qualidade/planejar-qa/SKILL.md';
  const human = '---\nname: planejar-qa\ndescription: Plano humano.\n---\n\n# QA humano\n\nPreserve meu trabalho.\n';
  put(root, '.gitignore', '# project\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
  put(root, primary, human);
  const index = readFileSync(join(root, '.git/index'));
  cli(root, ['init', '--agents', 'codex']);
  assert.ok(read(root, primary).startsWith(human));
  assert.match(read(root, primary), /\.pbai4devs\/skills\/qualidade\/planejar-qa\/SKILL\.md/);
  assert.equal(existsSync(join(root, '.codex/skills/qualidade/planejar-qa/SKILL.md')), false);
  assert.equal(cli(root, ['doctor']).ok, true);
  cli(root, ['agents', 'claude']);
  assert.ok(read(root, primary).startsWith(human));
  assert.match(read(root, primary).slice(human.length), /^\s*$/);
  cli(root, ['agents', 'codex']);
  assert.ok(read(root, primary).startsWith(human));
  assert.equal(existsSync(join(root, '.codex/skills/qualidade/planejar-qa/SKILL.md')), false);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(read(root, '.gitignore'), '# project\n');
});

test("Competing exchange of obstruction interrupts the plan before writing", async t => {
  for (const scenario of ['appears', 'removed', 'replaced']) await t.test(scenario, t => {
    const root = fixture(t), obstacle = '.agents/skills/qualidade';
    put(root, '.gitignore', '# project\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
    if (scenario !== 'appears') put(root, obstacle, 'human obstacle\n');
    const plan = planInstallation({ target: root, clients: ['codex'] });
    const beforeIndex = readFileSync(join(root, '.git/index'));
    if (scenario === 'appears') put(root, obstacle, 'new human obstacle\n');
    else if (scenario === 'removed') rmSync(join(root, obstacle));
    else { rmSync(join(root, obstacle)); put(root, obstacle, 'replacement obstacle\n'); }
    assert.throws(() => applyPlan(plan), { code: 'E_CHANGED' });
    assert.equal(existsSync(join(root, '.pbai4devs')), false);
    assert.equal(read(root, '.gitignore'), '# project\n');
    assert.deepEqual(readFileSync(join(root, '.git/index')), beforeIndex);
    if (scenario !== 'removed') assert.match(read(root, obstacle), /obstacle/);
  });
});

test("Tombstone derivative does not hide divergent hash or human file recreated", t => {
  const root = fixture(t), obstacle = '.agents/skills/qualidade';
  const fallback = '.codex/skills/qualidade/planejar-qa/SKILL.md';
  put(root, obstacle, 'human obstacle\n');
  cli(root, ['init', '--agents', 'codex']);
  const original = read(root, fallback), digest = createHash('sha256').update(original).digest('hex');
  const derived = '.pbai4devs/state/derived.json';
  rmSync(join(root, fallback));
  const setDerived = removedFiles => put(root, derived, JSON.stringify({ schemaVersion: 1, entries: {}, removedFiles }));
  setDerived({ [fallback]: digest });
  assert.ok(!inspect(root).issues.some(issue => issue.path === fallback));
  put(root, fallback, '---\nname: human\ndescription: Recriada.\n---\n\n# Humana\n');
  const human = read(root, fallback);
  assert.ok(inspect(root).issues.some(issue => issue.path === fallback && issue.code === 'modified'));
  assert.equal(read(root, fallback), human);
  rmSync(join(root, fallback));
  setDerived({ [fallback]: 'f'.repeat(64) });
  assert.throws(() => inspect(root), { code: 'E_STATE' });
  setDerived({ [fallback]: 'not-a-hash' });
  assert.throws(() => inspect(root), { code: 'E_STATE' });
  setDerived({ '.pbai4devs/skills/projeto/criar-skill/SKILL.md': digest });
  assert.throws(() => inspect(root), { code: 'E_STATE' });
});

test("sync standalone does not remove fallback with human change staged and divergent", t => {
  const root = fixture(t), obstacle = '.agents/skills/qualidade';
  const fallback = '.codex/skills/qualidade/planejar-qa/SKILL.md';
  put(root, '.gitignore', '# human\n');
  put(root, obstacle, 'human obstacle\n');
  cli(root, ['init', '--agents', 'codex']);
  const original = read(root, fallback);
  assert.equal(spawnSync('git', ['-C', root, 'add', '-f', '--', fallback]).status, 0);
  const human = `${original}\nHuman worktree change.\n`;
  put(root, fallback, human);
  const index = readFileSync(join(root, '.git/index')), ignore = read(root, '.gitignore');
  rmSync(join(root, obstacle));
  const sync = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs')], { cwd: root, encoding: 'utf8', timeout: 180000 });
  assert.equal(sync.status, 0, sync.stderr || sync.stdout);
  assert.equal(read(root, fallback), human);
  assert.ok(existsSync(join(root, '.agents/skills/qualidade/planejar-qa/SKILL.md')));
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(read(root, '.gitignore'), ignore);
  assert.ok(inspect(root).issues.some(issue => issue.path === fallback && issue.code === 'modified'));
});

test("obstruction created on route already managed failure without discarding human content", t => {
  const root = fixture(t), path = '.agents/skills/qualidade';
  put(root, '.gitignore', '# human\n');
  cli(root, ['init', '--agents', 'codex']);
  renameSync(join(root, path), join(root, 'preserved-test-owned-skills'));
  put(root, path, 'human replacement\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
  const index = readFileSync(join(root, '.git/index'));
  const sync = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs')], { cwd: root, encoding: 'utf8', timeout: 180000 });
  assert.notEqual(sync.status, 0);
  const doctor = cli(root, ['doctor'], 1);
  assert.equal(doctor.ok, false);
  assert.equal(read(root, path), 'human replacement\n');
  assert.ok(existsSync(join(root, 'preserved-test-owned-skills/planejar-qa/SKILL.md')));
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(read(root, '.gitignore'), '# human\n');
  rmSync(join(root, path));
  renameSync(join(root, 'preserved-test-owned-skills'), join(root, path));
  assert.equal(cli(root, ['doctor']).ok, true);
});

test("sync da CLI recovers native route after removing obstruction", t => {
  const root = fixture(t), obstacle = '.agents/skills/qualidade';
  const primary = '.agents/skills/qualidade/planejar-qa/SKILL.md';
  const fallback = '.codex/skills/qualidade/planejar-qa/SKILL.md';
  put(root, '.gitignore', '# human\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
  put(root, obstacle, 'human obstacle\n');
  cli(root, ['init', '--agents', 'codex']);
  assert.ok(existsSync(join(root, fallback)));
  const index = readFileSync(join(root, '.git/index'));
  rmSync(join(root, obstacle)); // The obstruction belongs to the fixture.
  assert.equal(cli(root, ['sync']).ok, true);
  assert.ok(existsSync(join(root, primary)));
  assert.equal(existsSync(join(root, fallback)), false);
  assert.equal(cli(root, ['doctor']).ok, true);
  assert.equal(cli(root, ['sync', '--check']).ok, true);
  assert.equal(cli(root, ['update', '--dry-run']).plan.length, 0);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(read(root, '.gitignore'), '# human\n');
});

test('update consolida tombstone sem reescrever skill humana recriada ou campos desconhecidos', t => {
  const root = fixture(t), obstacle = '.agents/skills/qualidade';
  const fallback = '.codex/skills/qualidade/planejar-qa/SKILL.md';
  const derivedPath = '.pbai4devs/state/derived.json';
  put(root, '.gitignore', '# human\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
  put(root, obstacle, 'human obstacle\n');
  cli(root, ['init', '--agents', 'codex']);
  rmSync(join(root, obstacle));
  const syncScript = join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
  const sync = (...args) => spawnSync(process.execPath, [syncScript, ...args], { cwd: root, encoding: 'utf8', timeout: 180000 });
  assert.equal(sync().status, 0);
  assert.equal(sync('--check').status, 0);
  assert.equal(cli(root, ['doctor']).ok, true);
  const record = JSON.parse(read(root, derivedPath));
  assert.ok(record.removedFiles[fallback]);
  const raw = read(root, derivedPath).replace(/\n}\n$/, ',\n  "humanNote" : { "escaped" : "a\\u0062", "list": [1, {"x":"y"}] }\n}\n');
  put(root, derivedPath, raw);
  const human = '---\nname: human-recreated\ndescription: Skill humana.\n---\n\n# Minha skill\n';
  put(root, fallback, human);
  assert.equal(cli(root, ['doctor'], 1).ok, false);
  assert.equal(spawnSync('git', ['-C', root, 'add', '-f', '--', derivedPath]).status, 0);
  put(root, derivedPath, raw.replace('"list": [1', '"list": [2'));
  const index = readFileSync(join(root, '.git/index')), dirty = read(root, derivedPath);
  const refused = cli(root, ['update'], 1);
  assert.equal(refused.error.code, 'E_STAGED');
  assert.equal(read(root, derivedPath), dirty);
  assert.equal(read(root, fallback), human);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  put(root, derivedPath, raw); // Restore only this test-owned staged fixture.
  cli(root, ['update']);
  assert.equal(read(root, fallback), human);
  const updated = read(root, derivedPath);
  assert.ok(updated.includes('"humanNote" : { "escaped" : "a\\u0062", "list": [1, {"x":"y"}] }'));
  assert.equal(Object.hasOwn(JSON.parse(updated), 'removedFiles'), false);
  assert.equal(cli(root, ['doctor']).ok, true);
  const check = sync('--check');
  assert.equal(check.status, 0, check.stderr || check.stdout);
  const verifier = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/verificar-recursos/SCRIPT.mjs')], { cwd: root, encoding: 'utf8', timeout: 180000 });
  assert.equal(verifier.status, 0, verifier.stderr || verifier.stdout);
  assert.equal(cli(root, ['update', '--dry-run']).plan.length, 0);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(read(root, '.gitignore'), '# human\n');
});

test('sync preserva bytes de metadados humanos ao acrescentar e remover tombstones', t => {
  const root = fixture(t), derived = '.pbai4devs/state/derived.json';
  const primary = '.agents/skills/qualidade/planejar-qa/SKILL.md';
  const fallback = '.codex/skills/qualidade/planejar-qa/SKILL.md';
  put(root, '.gitignore', '# human\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
  put(root, '.agents/skills/qualidade', 'human obstacle\n');
  cli(root, ['init', '--agents', 'codex']);
  const sync = (...args) => spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), ...args], { cwd: root, encoding: 'utf8', timeout: 180000 });
  const raw = '{\n  "schemaVersion": 1,\n  "entries": {},\n  "humanNote" : { "escaped" : "a\\u0062", "list": [1, {"x":"y"}] }\n}\n';
  put(root, derived, raw);
  const humanNote = '"humanNote" : { "escaped" : "a\\u0062", "list": [1, {"x":"y"}] }';
  const index = readFileSync(join(root, '.git/index'));
  assert.ok(existsSync(join(root, fallback)));
  assert.equal(read(root, '.agents/skills/qualidade'), 'human obstacle\n');
  rmSync(join(root, '.agents/skills/qualidade'));
  const recovered = sync();
  assert.equal(recovered.status, 0, recovered.stderr || recovered.stdout);
  assert.equal(existsSync(join(root, fallback)), false);
  assert.ok(existsSync(join(root, primary)));
  assert.ok(read(root, derived).includes(humanNote));
  assert.ok(JSON.parse(read(root, derived)).removedFiles[fallback]);
  const check = sync('--check');
  assert.equal(check.status, 0, check.stderr || check.stdout);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(read(root, '.gitignore'), '# human\n');
});

test("uncheck preserves files with human text and removes only intact derivatives", t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude,codex']);
  const path = '.claude/skills/configurar-projeto/SKILL.md';
  const original = read(root, path), changed = `${original}\nUser edit.\n`;
  put(root, path, changed);
  put(root, '.claude/skills/unknown/SKILL.md', original);
  put(root, '.claude/skills/custom/SKILL.md', '# User owned\n');
  put(root, '.claude/.gitignore', '# User ignore\n');
  put(root, 'CLAUDE.md', `# User instructions\n${read(root, 'CLAUDE.md').replace('AGENTS.md', 'CHANGED.md')}`);
  mkdirSync(join(root, '.claude/skills/user-empty'), { recursive: true });
  const before = read(root, statePath);
  const instructions = read(root, 'CLAUDE.md');
  cli(root, ['agents', 'codex']);
  assert.notEqual(read(root, statePath), before);
  assert.equal(read(root, path), changed);
  assert.equal(read(root, 'CLAUDE.md'), instructions);
  assert.equal(cli(root, ['agents', 'codex', '--force']).changed, false);
  assert.equal(read(root, '.claude/skills/unknown/SKILL.md'), original);
  assert.equal(read(root, '.claude/skills/custom/SKILL.md'), '# User owned\n');
  assert.ok(existsSync(join(root, '.claude/skills/user-empty')));
  assert.equal(read(root, '.claude/.gitignore'), '# User ignore\n');
  assert.match(read(root, 'CLAUDE.md'), /^# User instructions/); assert.doesNotMatch(read(root, 'CLAUDE.md'), /BEGIN AGENTDEVKIT/);
  cli(root, ['sync']); assert.equal(read(root, '.claude/skills/unknown/SKILL.md'), original);
  assert.equal(read(root, path), changed);
});

test("legacy state equals all and queries do not write migration", t => {
  const root = fixture(t); cli(root, ['init', '--yes', '--agents', 'all']);
  const previous = state(root); delete previous.clients; put(root, statePath, `${JSON.stringify(previous, null, 2)}\n`);
  const before = read(root, statePath);
  assert.deepEqual(cli(root, ['agents']).clients, ['all']);
  assert.equal(cli(root, ['doctor']).ok, true); assert.equal(cli(root, ['sync', '--check']).ok, true);
  assert.equal(read(root, statePath), before);
  cli(root, ['update']); assert.deepEqual(state(root).clients, ['all']);
  put(root, '.github/workflows/custom.yml', 'name: user workflow\n');
  prepareClaudeRetirement(root);
  const rulesBefore = ruleSnapshot(root), gitBefore = gitSnapshot(root);
  assert.ok(rulesBefore.length);
  const selected = cli(root, ['agents', 'codex']);
  assert.deepEqual(ruleSnapshot(root), rulesBefore); assert.deepEqual(gitSnapshot(root), gitBefore);
  verifyClaudeRetirement(root);
  assert.deepEqual([...selected.retainedClaudeRules].sort(), rulesBefore.map(item => item[0]).sort());
  assert.match(selected.warnings.join(' '), /global/i);
  for (const path of ['.opencode', '.cursor', '.gemini', '.agent']) assert.equal(existsSync(join(root, path)), false, path);
  assert.equal(read(root, '.github/workflows/custom.yml'), 'name: user workflow\n');
  for (const args of [['doctor'], ['sync', '--check']]) {
    const diagnostic = cli(root, args, 1);
    assert.deepEqual([...diagnostic.retainedClaudeRules].sort(), rulesBefore.map(item => item[0]).sort());
    assert.match(diagnostic.warnings.join(' '), /global/i);
  }
  assert.deepEqual(ruleSnapshot(root), rulesBefore); assert.deepEqual(gitSnapshot(root), gitBefore);
});

test('TTY setup asks for language, clients and purpose and skips prompts for scripted runs', async t => {
  const root = fixture(t), questions = [], answers = ['es', 'claude', '4']; let output = '';
  put(root, 'docs/existente.md', '# Documento existente\n');
  const status = await main(['init', '--target', root], { stdin: { isTTY: true }, stdout: { isTTY: true, write: value => { output += value; } }, ask: async question => { questions.push(question); return answers.shift(); } });
  assert.equal(status, 0, output);
  assert.equal(questions.length, 3);
  assert.match(questions[0], /Idioma/);
  assert.match(questions[1], /Agentes/);
  assert.match(questions[2], /4[^\r\n]*document/i);
  assert.match(output, /\bnext --intent document\b/);
  assert.equal(state(root).language, 'es'); assert.deepEqual(state(root).clients, ['claude']);
  assert.deepEqual(readdirSync(join(root, 'docs')), ['existente.md']);
  assert.equal(read(root, 'docs/existente.md'), '# Documento existente\n');
  for (const args of [[], ['--yes'], ['--json'], ['--dry-run'], ['--lang', 'en', '--agents', 'codex']]) await t.test(args.join(' ') || 'sem TTY', async subtest => {
    const target = fixture(subtest); const tty = args.length > 0; let text = '';
    const code = await main(['init', '--target', target, ...args], { stdin: { isTTY: tty }, stdout: { isTTY: tty, write: value => { text += value; } }, ask: () => { throw new Error('Unexpected prompt'); } });
    assert.equal(code, 0, text);
    if (args.includes('--dry-run')) assert.deepEqual(readdirSync(target).filter(name => name !== '.git'), []);
    else if (args.includes('--agents')) {
      assert.deepEqual(state(target).clients, ['codex']);
      assert.equal(state(target).language, 'en');
    } else assert.deepEqual(state(target).clients, ['none']);
  });
});

test("Initial hub, incremental addition and synchronization respect the chosen customers", { timeout: 120000 }, t => {
  const root = fixture(t);
  const direct = () => spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs')], { cwd: root, encoding: 'utf8' });
  const clientInfo = () => cli(root, ['agents']);
  cli(root, ['init', '--yes']);
  assert.deepEqual(clientInfo().configuredClients, []);
  assert.equal(clientInfo().statePath, statePath);
  assert.ok(existsSync(join(root, 'AGENTS.md')));
  for (const path of ['.codex', '.agents', '.claude', '.gemini', 'GEMINI.md']) assert.equal(existsSync(join(root, path)), false, path);
  cli(root, ['doctor']);
  cli(root, ['sync', '--check']);
  const hubSync = direct();
  assert.equal(hubSync.status, 0, hubSync.stderr || hubSync.stdout);
  const preview = cli(root, ['agents', 'add', 'codex', '--dry-run']);
  assert.deepEqual(preview.clients, ['codex']);
  assert.match(preview.next[0].command, /\bagents add codex\b/);
  assert.deepEqual(state(root).clients, ['none']);
  assert.equal(existsSync(join(root, '.codex')), false);
  cli(root, ['agents', 'add', 'codex']);
  assert.deepEqual(clientInfo().configuredClients, ['codex']);
  assert.deepEqual(clientInfo().clientRoots, ['.agents', '.codex']);
  const source = 'skills/projeto/skill-da-equipe/SKILL.md';
  const mirror = `.agents/${source}`;
  put(root, `.pbai4devs/${source}`, '---\nname: skill-da-equipe\ndescription: Skill do projeto.\n---\n\n# Skill da equipe\n');
  cli(root, ['sync']);
  assert.match(read(root, mirror), /\.pbai4devs\/skills\/projeto\/skill-da-equipe\/SKILL\.md/);
  assert.equal(existsSync(join(root, '.claude')), false);
  cli(root, ['agents', 'add', 'antigravity']);
  assert.deepEqual(clientInfo().configuredClients, ['antigravity', 'codex']);
  assert.ok(existsSync(join(root, '.agents/skills.json')));
  const human = '.agents/agents/agente-da-equipe.md';
  put(root, human, '# Agente humano\n');
  cli(root, ['agents', 'remove', 'antigravity']);
  assert.deepEqual(clientInfo().configuredClients, ['codex']);
  assert.equal(existsSync(join(root, '.agents/skills.json')), false);
  assert.ok(existsSync(join(root, mirror)));
  assert.equal(read(root, human), '# Agente humano\n');
  cli(root, ['agents', 'remove', 'codex']);
  assert.deepEqual(state(root).clients, ['none']);
  assert.equal(existsSync(join(root, mirror)), false);
  assert.equal(read(root, human), '# Agente humano\n');
  cli(root, ['sync', '--check']);
});

test("selective manifesto requires compatible runtime and preserves an old edited script", { timeout: 120000 }, t => {
  const root = fixture(t);
  const relative = '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
  const manifest = '.pbai4devs/espelhos.conf';
  cli(root, ['init', '--agents', 'cursor']);
  const original = read(root, relative);
  const older = original.replace('// agentdevkit-manifest: selective-clients-v1\n', '');
  assert.notEqual(older, original);
  put(root, relative, older);
  const recorded = state(root);
  recorded.files[relative] = createHash('sha256').update(older).digest('hex');
  const saved = JSON.stringify(recorded);
  put(root, statePath, saved);
  const previousManifest = read(root, manifest);
  for (const args of [['agents', 'add', 'codex'], ['sync', '--agents', 'none']]) {
    const result = cli(root, args, 1);
    assert.equal(result.error.code, 'E_UPGRADE');
    assert.equal(result.error.path, relative);
    assert.match(result.next[0].command, /update --dry-run/);
    assert.equal(read(root, statePath), saved);
    assert.equal(read(root, manifest), previousManifest);
  }
  const edited = older + '\n// Nota da equipe.\n';
  put(root, relative, edited);
  const blocked = cli(root, ['update', '--agents', 'codex'], 1);
  assert.equal(blocked.error.path, relative);
  assert.equal(blocked.next[0].command, undefined);
  assert.equal(read(root, relative), edited);
  assert.equal(read(root, statePath), saved);
  put(root, relative, older);
  cli(root, ['update', '--agents', 'codex']);
  cli(root, ['sync', '--check']);
  assert.equal(read(root, relative), original);
  assert.deepEqual(state(root).clients, ['codex']);
});

test('explicit purpose keeps the language and client prompts and guides the chosen route', async t => {
  const root = fixture(t), questions = [], answers = ['en', 'codex']; let output = '';
  const code = await main(['init', '--target', root, '--purpose', 'run'], {
    stdin: { isTTY: true },
    stdout: { isTTY: true, write: value => { output += value; } },
    ask: async question => { questions.push(question); return answers.shift(); },
  });
  assert.equal(code, 0, output);
  assert.equal(questions.length, 2);
  assert.match(questions[0], /Idioma/);
  assert.match(questions[1], /Agents/i);
  assert.equal(state(root).language, 'en');
  assert.deepEqual(state(root).clients, ['codex']);
  assert.match(output, /\bnext --intent run\b/);
  assert.equal(existsSync(join(root, 'docs')), false);
});

test("Unselected clients with own links are not visited", t => {
  const root = fixture(t), outside = fixture(t);
  try { symlinkSync(outside, join(root, '.opencode'), 'dir'); } catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('No symlink privilege'); return; } throw error; }
  cli(root, ['init', '--agents', 'codex']);
  assert.deepEqual(readdirSync(outside).filter(name => name !== '.git'), []); assert.equal(cli(root, ['doctor']).ok, true);
  const digest = createHash('sha256').update(read(root, statePath)).digest('hex');
  cli(root, ['sync', '--check']);
  assert.equal(createHash('sha256').update(read(root, statePath)).digest('hex'), digest);
});
