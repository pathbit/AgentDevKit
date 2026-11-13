import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { main, parseArgs } from '../src/cli.mjs';
import { applyPlan, inspect, planInstallation } from '../src/install.mjs';

import { fixture, read, state, statePath, put, cli } from './fixtures/client-selection-helpers.mjs';

test('seleção valida aliases e entradas antes de escrever; consulta é somente leitura', t => {
  assert.deepEqual(parseArgs(['init', '--agents', 'CODEX,claude-code,codex']).clients, ['claude', 'codex']);
  assert.deepEqual(parseArgs(['clients', 'vscode']).clients, ['copilot']);
  for (const args of [['init', '--agents', ''], ['agents', 'unknown'], ['init', '--agents', 'all,codex'], ['doctor', '--agents', 'codex'], ['agents', '--dry-run']]) assert.throws(() => parseArgs(args), { code: 'E_ARGS' });
  const root = fixture(t);
  const result = cli(root, ['agents']);
  assert.deepEqual(result.clients, ['all']); assert.ok(result.availableClients.some(client => client.id === 'codex'));
  cli(root, ['init', '--agents', 'unknown'], 2);
  cli(root, ['agents', 'claude'], 1);
  assert.deepEqual(readdirSync(root).filter(name => name !== '.git'), []);
});

test('claude isolado, dependência do codex e persistência não criam clientes extras', t => {
  const root = fixture(t);
  cli(root, ['init', '--agents', 'claude']);
  assert.deepEqual(state(root).clients, ['claude']); assert.ok(existsSync(join(root, 'CLAUDE.md')));
  assert.match(read(root, 'CLAUDE.md'), /AGENTS\.md/);
  for (const path of ['.agents', '.agent', '.codex', '.github', '.vscode', 'GEMINI.md']) assert.equal(existsSync(join(root, path)), false, path);
  cli(root, ['agents', 'codex', '--dry-run']);
  assert.deepEqual(state(root).clients, ['claude']); assert.equal(existsSync(join(root, '.codex')), false);
  cli(root, ['agents', 'codex,claude']);
  assert.ok(existsSync(join(root, '.agents/skills.json'))); assert.equal(existsSync(join(root, '.codex/skills')), false);
  assert.equal(cli(root, ['agents', 'claude,codex']).changed, false);
  cli(root, ['update']); cli(root, ['sync']); cli(root, ['lang', 'es']);
  assert.deepEqual(state(root).clients, ['claude', 'codex']);
  cli(root, ['clients', 'codex']);
  assert.equal(existsSync(join(root, 'CLAUDE.md')), false);
  assert.equal(existsSync(join(root, '.claude')), false);
  assert.equal(existsSync(join(root, 'GEMINI.md')), false);
  assert.deepEqual(cli(root, ['agents']).clients, ['codex']);
  assert.equal(cli(root, ['doctor']).ok, true); assert.equal(cli(root, ['sync', '--check']).ok, true);
  const direct = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(direct.status, 0, direct.stdout + direct.stderr);
  assert.equal(existsSync(join(root, '.pbai4devs/tools/skills/.local')), false);
});

test('Codex usa uma única rota de skills e migra somente apontamentos próprios intactos', async t => {
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


test('Codex falha sem alterar o projeto se as duas rotas estiverem obstruídas', t => {
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

test('Codex preserva skill humana na rota nativa e alterna seleção com fallback', t => {
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

test('troca concorrente de obstrução interrompe o plano antes de escrever', async t => {
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

test('tombstone derivado não oculta hash divergente nem arquivo humano recriado', t => {
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

test('sync standalone não remove fallback com alteração humana staged e divergente', t => {
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

test('obstrução criada sobre rota já gerenciada falha sem descartar conteúdo humano', t => {
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

test('sync da CLI recupera a rota nativa após remover obstrução', t => {
  const root = fixture(t), obstacle = '.agents/skills/qualidade';
  const primary = '.agents/skills/qualidade/planejar-qa/SKILL.md';
  const fallback = '.codex/skills/qualidade/planejar-qa/SKILL.md';
  put(root, '.gitignore', '# human\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
  put(root, obstacle, 'human obstacle\n');
  cli(root, ['init', '--agents', 'codex']);
  assert.ok(existsSync(join(root, fallback)));
  const index = readFileSync(join(root, '.git/index'));
  rmSync(join(root, obstacle)); // A obstrução pertence à fixture.
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

test('desmarcar preserva arquivos com texto humano e remove somente derivados intactos', t => {
  const root = fixture(t); cli(root, ['init', '--agents', 'claude,codex']);
  const path = '.claude/skills/configurar-projeto/SKILL.md';
  const original = read(root, path), changed = `${original}\nUser edit.\n`;
  put(root, path, changed);
  put(root, '.claude/skills/unknown/SKILL.md', original);
  put(root, '.claude/skills/custom/SKILL.md', '# User owned\n');
  put(root, '.claude/.gitignore', `# User ignore\n${read(root, '.claude/.gitignore')}`);
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
  assert.equal(read(root, '.claude/.gitignore'), '# User ignore\n\n');
  assert.match(read(root, 'CLAUDE.md'), /^# User instructions/); assert.doesNotMatch(read(root, 'CLAUDE.md'), /BEGIN AGENTDEVKIT/);
  cli(root, ['sync']); assert.equal(read(root, '.claude/skills/unknown/SKILL.md'), original);
  assert.equal(read(root, path), changed);
});

test('estado legado equivale a all e consultas não escrevem migração', t => {
  const root = fixture(t); cli(root, ['init', '--yes']);
  const previous = state(root); delete previous.clients; put(root, statePath, `${JSON.stringify(previous, null, 2)}\n`);
  const before = read(root, statePath);
  assert.deepEqual(cli(root, ['agents']).clients, ['all']);
  assert.equal(cli(root, ['doctor']).ok, true); assert.equal(cli(root, ['sync', '--check']).ok, true);
  assert.equal(read(root, statePath), before);
  cli(root, ['update']); assert.deepEqual(state(root).clients, ['all']);
  put(root, '.github/workflows/custom.yml', 'name: user workflow\n');
  cli(root, ['agents', 'codex']);
  for (const path of ['.claude', '.opencode', '.cursor', '.gemini', '.agent']) assert.equal(existsSync(join(root, path)), false, path);
  assert.equal(read(root, '.github/workflows/custom.yml'), 'name: user workflow\n');
});

test('TTY pergunta idioma e clientes; execução semTTY e opções não perguntam', async t => {
  const root = fixture(t), questions = [], answers = ['es', 'claude']; let output = '';
  const status = await main(['init', '--target', root], { stdin: { isTTY: true }, stdout: { isTTY: true, write: value => { output += value; } }, ask: async question => { questions.push(question); return answers.shift(); } });
  assert.equal(status, 0, output); assert.equal(questions.length, 2); assert.match(questions[0], /Idioma/); assert.match(questions[1], /Agentes/);
  assert.equal(state(root).language, 'es'); assert.deepEqual(state(root).clients, ['claude']);
  for (const args of [[], ['--yes'], ['--json'], ['--dry-run']]) await t.test(args.join(' ') || 'sem TTY', async subtest => {
    const target = fixture(subtest); const tty = args.length > 0; let text = '';
    const code = await main(['init', '--target', target, ...args], { stdin: { isTTY: tty }, stdout: { isTTY: tty, write: value => { text += value; } }, ask: () => { throw new Error('Unexpected prompt'); } });
    assert.equal(code, 0, text);
    if (args.includes('--dry-run')) assert.deepEqual(readdirSync(target).filter(name => name !== '.git'), []);
    else assert.deepEqual(state(target).clients, ['all']);
  });
});

test('clientes não selecionados com links próprios não são visitados', t => {
  const root = fixture(t), outside = fixture(t);
  try { symlinkSync(outside, join(root, '.opencode'), 'dir'); } catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('No symlink privilege'); return; } throw error; }
  cli(root, ['init', '--agents', 'codex']);
  assert.deepEqual(readdirSync(outside).filter(name => name !== '.git'), []); assert.equal(cli(root, ['doctor']).ok, true);
  const digest = createHash('sha256').update(read(root, statePath)).digest('hex');
  cli(root, ['sync', '--check']);
  assert.equal(createHash('sha256').update(read(root, statePath)).digest('hex'), digest);
});
