import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs, { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { main } from '../src/cli.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { resemblesClaudeReference } from '../.pbai4devs/scripts/lib/claude-retained.mjs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

const bin = resolve('bin/agentdevkit.mjs');
const cliTimeout = process.platform === 'win32' ? 240000 : 120000;
const legacy = '.claude/rules/git/RULE.md';
const pointer = '---\ntrigger: model_decision\ndescription: Git.\n---\n\n# Git\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/rules/git/RULE.md).\n';
const sha = data => createHash('sha256').update(data).digest('hex');
const put = (root, file, data) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), data); };
const read = (root, file) => readFileSync(join(root, file));
function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); return result.stdout;
}
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'adk-claude-cli-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '--quiet');
  put(root, '.gitignore', '# Humano\nprivate/\n');
  put(root, 'human.txt', 'staged\n'); git(root, 'add', '--', '.gitignore', 'human.txt');
  put(root, 'human.txt', 'staged\nunstaged\n');
  put(root, '.git/info/exclude', '# Humano\nprivate-local/\n');
  return root;
}
function cli(root, ...args) {
  const result = spawnSync(process.execPath, [bin, ...args, '--target', root, '--json'], { encoding: 'utf8', timeout: cliTimeout, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.error, undefined, `${args.join(' ')}: ${result.error?.message || ''}\n${result.stderr}\n${result.stdout}`);
  let body;
  try { body = JSON.parse(result.stdout); } catch { assert.fail(result.stdout + result.stderr); }
  return { status: result.status, body };
}
const protectedGit = root => Object.fromEntries(['.git/index', '.git/info/exclude', '.git/config', '.git/HEAD', '.gitignore', 'human.txt'].map(p => [p, read(root, p)]));
function init(root) { const r = cli(root, 'init', '--agents', 'claude'); assert.equal(r.status, 0, JSON.stringify(r.body)); return r.body; }
function addOwnedLegacy(root, { tracked = false, edited = false } = {}) {
  const statePath = '.pbai4devs/state/agentdevkit.json', state = JSON.parse(read(root, statePath));
  put(root, legacy, pointer); state.files[legacy] = sha(Buffer.from(pointer)); put(root, statePath, JSON.stringify(state, null, 2) + '\n');
  if (tracked) git(root, 'add', '-f', '--', legacy);
  if (edited) put(root, legacy, pointer + '\nAlteração humana.\n');
}

test('init Claude informa omissão sem ativação global e preserva Git humano', t => {
  const root = fixture(t), before = protectedGit(root), result = init(root);
  assert.deepEqual(protectedGit(root), before);
  assert.ok(result.scopeOmissions.some(item => item.source === '.pbai4devs/rules/git/RULE.md' && item.status === 'explicit-reference-planned'));
  assert.ok(result.warnings.some(warning => warning.includes('escopo equivalente comprovado')));
  assert.ok(result.warnings.every(warning => !warning.includes('arquivos legados preservados')));
  assert.equal(existsSync(join(root, legacy)), false);
  assert.equal(cli(root, 'sync', '--check').status, 0);
  assert.equal(cli(root, 'doctor').status, 0);
  for (const [language, fragment] of [['en', 'no verified equivalent scope'], ['es', 'alcance equivalente comprobado']]) {
    const check = cli(root, 'doctor', '--lang', language);
    assert.ok([0, 1].includes(check.status), JSON.stringify(check.body));
    assert.equal(check.body.error, undefined);
    assert.equal(check.body.ok, check.status === 0);
    // A consulta em outro idioma pode planejar os blocos e o estado nesse idioma.
    if (check.status === 1) {
      assert.ok(check.body.issues.length > 0);
      assert.ok(check.body.issues.every(issue => issue.code === 'outdated' && ['AGENTS.md', '.pbai4devs/state/agentdevkit.json'].includes(issue.path)), JSON.stringify(check.body.issues));
    }
    assert.ok(check.body.warnings.some(warning => warning.includes(fragment)));
    assert.ok(check.body.scopeOmissions.some(item => item.source === '.pbai4devs/rules/git/RULE.md'));
  }
  assert.deepEqual(protectedGit(root), before);
});

test('sync bloqueia legado não rastreado quando há apenas hash de conteúdo', t => {
  const root = fixture(t); init(root); addOwnedLegacy(root);
  const before = protectedGit(root), prior = read(root, legacy), state = read(root, '.pbai4devs/state/agentdevkit.json');
  for (const args of [['sync', '--check'], ['sync', '--force'], ['doctor']]) {
    const result = cli(root, ...args);
    assert.equal(result.status, 1, JSON.stringify(result.body));
    assert.equal(result.body.ok, false); assert.ok(result.body.scopeOmissions.some(item => item.source === '.pbai4devs/rules/git/RULE.md' && item.status === 'activation-unverified')); assert.deepEqual(read(root, legacy), prior);
    assert.ok(result.body.warnings.some(warning => warning.includes('podem continuar ativas globalmente')));
    assert.deepEqual(read(root, '.pbai4devs/state/agentdevkit.json'), state);
    assert.deepEqual(protectedGit(root), before);
  }
});

test('preview mantém motivo Claude específico e Git staged, com e sem force', { timeout: 180000 }, t => {
  const root = fixture(t); init(root); addOwnedLegacy(root, { tracked: true });
  put(root, legacy, pointer + '\nEdição humana posterior.\n');
  const before = protectedGit(root), prior = read(root, legacy), previews = [];
  const diagnosis = cli(root, 'doctor');
  assert.equal(diagnosis.status, 1, JSON.stringify(diagnosis.body));
  assert.ok(diagnosis.body.issues.some(item => item.code === 'conflict' && item.path === legacy && item.preservationReason === 'claude-metadata-unverified'));
  const humanDoctor = spawnSync(process.execPath, [bin, 'doctor', '--target', root], { encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(humanDoctor.status, 1, humanDoctor.stderr);
  assert.match(humanDoctor.stdout, /arquivo preservado; metadados não verificados/);
  for (const args of [['update', '--dry-run'], ['update', '--dry-run', '--force']]) {
    const result = cli(root, ...args);
    assert.equal(result.status, 1, JSON.stringify(result.body));
    assert.equal(result.body.ok, false);
    assert.ok(result.body.conflicts.includes(legacy));
    assert.equal(result.body.preserved.find(item => item.path === legacy)?.reason, 'claude-metadata-unverified');
    assert.deepEqual(protectedGit(root), before);
    assert.deepEqual(read(root, legacy), prior);
    previews.push({ plan: result.body.plan, conflicts: result.body.conflicts });
  }
  assert.deepEqual(previews[1], previews[0]);
  const human = spawnSync(process.execPath, [bin, 'update', '--dry-run', '--target', root], { encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(human.status, 1, human.stderr);
  assert.ok(human.stdout.includes(JSON.stringify(legacy)), human.stdout);
  assert.deepEqual(protectedGit(root), before);
  assert.deepEqual(read(root, legacy), prior);
});

for (const condition of ['unowned', 'tracked', 'edited']) test(`sync bloqueia legado ${condition} sem alterar Git ou arquivo`, t => {
  const root = fixture(t); init(root);
  if (condition === 'unowned') put(root, legacy, pointer);
  else addOwnedLegacy(root, { tracked: condition === 'tracked', edited: condition === 'edited' });
  const before = protectedGit(root), prior = read(root, legacy), state = read(root, '.pbai4devs/state/agentdevkit.json');
  for (const args of [['sync', '--check'], ['sync', '--force'], ['doctor']]) {
    const result = cli(root, ...args);
    assert.equal(result.status, 1, JSON.stringify(result.body));
    assert.equal(result.body.ok, false); assert.deepEqual(read(root, legacy), prior);
    assert.deepEqual(read(root, '.pbai4devs/state/agentdevkit.json'), state);
    assert.deepEqual(protectedGit(root), before);
  }
});

test('sync cria paths de claude.yaml explícito sem tratar glob de outro cliente como equivalente', t => {
  const root = fixture(t); init(root);
  const source = '.pbai4devs/rules/custom/RULE.md';
  put(root, source, '---\ntrigger: glob\nglobs: "origem/**/*.ts"\ndescription: Regra própria.\n---\n\n# Regra própria\n');
  put(root, '.pbai4devs/rules/custom/claude.yaml', '---\npaths: ["destino/**/*.ts"]\n---\n');
  const before = protectedGit(root), result = cli(root, 'sync');
  assert.equal(result.status, 0, JSON.stringify(result.body));
  assert.match(read(root, '.claude/rules/custom/RULE.md').toString(), /^paths: \["destino\/\*\*\/\*\.ts"\]$/m);
  assert.deepEqual(protectedGit(root), before);
  const update = cli(root, 'update');
  assert.equal(update.status, 0, JSON.stringify(update.body));
  assert.match(read(root, '.claude/rules/custom/RULE.md').toString(), /^paths: \[\"destino\/\*\*\/\*\.ts\"\]$/m);
  assert.deepEqual(protectedGit(root), before);
});

test('sync recusa colisão humana de escopo Claude em modo force', t => {
  const root = fixture(t); init(root);
  put(root, '.pbai4devs/rules/custom/RULE.md', '---\ntrigger: glob\nglobs: "src/**/*.ts"\ndescription: Regra.\n---\n\n# Regra\n');
  put(root, '.pbai4devs/rules/custom/claude.yaml', '---\npaths: ["src/**/*.ts"]\n---\n');
  const target = '.claude/rules/custom/RULE.md', human = '---\npaths: ["docs/**/*.md"]\n---\n\n# Humano\n';
  put(root, target, human);
  const before = protectedGit(root), result = cli(root, 'sync', '--force');
  assert.equal(result.status, 1, JSON.stringify(result.body));
  assert.equal(read(root, target).toString(), human); assert.deepEqual(protectedGit(root), before);
});

test('alvo alternativo histórico com hash bloqueia sync e é preservado ao desmarcar Claude', t => {
  const root = fixture(t); init(root);
  const alt = '.claude/rules/custom.md', statePath = '.pbai4devs/state/agentdevkit.json';
  const state = JSON.parse(read(root, statePath));
  put(root, alt, pointer); state.files[alt] = sha(Buffer.from(pointer)); put(root, statePath, JSON.stringify(state, null, 2) + '\n');
  const before = protectedGit(root), prior = read(root, alt), priorState = read(root, statePath);
  for (const args of [['sync', '--check'], ['sync', '--force']]) {
    const result = cli(root, ...args);
    assert.equal(result.status, 1, JSON.stringify(result.body));
    assert.equal(result.body.ok, false); assert.deepEqual(read(root, alt), prior);
    assert.deepEqual(read(root, statePath), priorState); assert.deepEqual(protectedGit(root), before);
  }
  const selection = cli(root, 'update', '--agents', 'codex', '--force');
  assert.equal(selection.status, 0, JSON.stringify(selection.body));
  assert.ok(selection.body.retainedClaudeRules.includes(alt));
  assert.deepEqual(read(root, alt), prior); assert.deepEqual(protectedGit(root), before);
  for (const args of [['sync', '--check'], ['doctor']]) {
    const diagnostic = cli(root, ...args);
    assert.equal(diagnostic.status, 1, JSON.stringify(diagnostic.body));
    assert.ok(diagnostic.body.retainedClaudeRules.includes(alt));
    assert.match(diagnostic.body.warnings.join(' '), /podem continuar ativas globalmente/);
    assert.deepEqual(read(root, alt), prior); assert.deepEqual(protectedGit(root), before);
  }
});

test('conflito alerta sobre risco de ativação global em português, inglês e espanhol', t => {
  const root = fixture(t); init(root); addOwnedLegacy(root);
  const before = protectedGit(root);
  for (const [language, expression] of [['pt', /regras preservadas podem continuar ativas globalmente/], ['en', /preserved rules may still load globally/], ['es', /las reglas conservadas pueden seguir activas globalmente/]]) {
    const result = cli(root, 'doctor', '--lang', language);
    assert.equal(result.status, 1, JSON.stringify(result.body));
    assert.ok(result.body.warnings.some(message => expression.test(message)), JSON.stringify(result.body.warnings));
    assert.ok(result.body.scopeOmissions.length > 0);
    assert.ok(result.body.scopeOmissions.every(item => item.status === 'activation-unverified'));
    assert.deepEqual(protectedGit(root), before);
  }
});

test('seleção preserva regra antiga substituída, modo e índice e mantém diagnóstico pendente', t => {
  const root = fixture(t); init(root);
  const alt = '.claude/rules/custom.md', statePath = '.pbai4devs/state/agentdevkit.json';
  const state = JSON.parse(read(root, statePath)); put(root, alt, pointer);
  state.files[alt] = sha(Buffer.from(pointer)); put(root, statePath, JSON.stringify(state, null, 2) + '\n');
  git(root, 'add', '-f', '--', alt);
  const replacement = alt + '.replacement'; put(root, replacement, pointer);
  if (process.platform !== 'win32') chmodSync(join(root, replacement), 0o700);
  renameSync(join(root, replacement), join(root, alt));
  const before = protectedGit(root), identity = lstatSync(join(root, alt), { bigint: true });
  const preview = cli(root, 'agents', 'codex', '--dry-run');
  assert.equal(preview.status, 0, JSON.stringify(preview.body));
  assert.ok(preview.body.retainedClaudeRules.includes(alt));
  assert.deepEqual(protectedGit(root), before);
  const selection = cli(root, 'agents', 'codex');
  assert.equal(selection.status, 0, JSON.stringify(selection.body));
  assert.ok(selection.body.retainedClaudeRules.includes(alt));
  assert.equal(read(root, alt).toString(), pointer); assert.deepEqual(protectedGit(root), before);
  const after = lstatSync(join(root, alt), { bigint: true });
  if (identity.ino) { assert.equal(after.ino, identity.ino); assert.equal(after.dev, identity.dev); }
  if (process.platform !== 'win32') assert.equal(after.mode & 0o777n, 0o700n);
  for (const args of [['doctor'], ['sync', '--check']]) {
    const diagnostic = cli(root, ...args); assert.equal(diagnostic.status, 1, JSON.stringify(diagnostic.body));
    assert.ok(diagnostic.body.retainedClaudeRules.includes(alt)); assert.deepEqual(protectedGit(root), before);
  }
  const reopen = cli(root, 'agents', 'claude');
  assert.equal(reopen.status, 1, JSON.stringify(reopen.body));
  assert.equal(read(root, alt).toString(), pointer); assert.deepEqual(protectedGit(root), before);
});

test('seleção detecta symlink de regra preservado preservando o alvo', t => {
  if (process.platform === 'win32') return t.skip('sem premissa de permissão para criar symlink');
  const root = fixture(t); init(root);
  const external = mkdtempSync(join(tmpdir(), 'adk-claude-external-'));
  t.after(() => rmSync(external, { recursive: true, force: true }));
  const sentinel = join(external, 'sentinel.md'); writeFileSync(sentinel, '# Conteúdo humano externo\n');
  const alt = '.claude/rules/human-link.md'; symlinkSync(sentinel, join(root, alt));
  const before = protectedGit(root), identity = lstatSync(join(root, alt), { bigint: true });
  const selection = cli(root, 'agents', 'codex');
  assert.equal(selection.status, 0, JSON.stringify(selection.body));
  assert.ok(selection.body.retainedClaudeRules.includes(alt));
  assert.equal(readFileSync(sentinel, 'utf8'), '# Conteúdo humano externo\n');
  assert.equal(lstatSync(join(root, alt), { bigint: true }).ino, identity.ino);
  assert.deepEqual(protectedGit(root), before);
  const diagnostic = cli(root, 'sync', '--check'); assert.equal(diagnostic.status, 1, JSON.stringify(diagnostic.body));
  assert.ok(diagnostic.body.retainedClaudeRules.includes(alt));
});

test('cliente desmarcado com ancestral simbólico é considerado não verificado', t => {
  if (process.platform === 'win32') return t.skip('sem premissa de permissão para criar symlink');
  const root = fixture(t), external = mkdtempSync(join(tmpdir(), 'adk-claude-external-root-'));
  t.after(() => rmSync(external, { recursive: true, force: true }));
  assert.equal(cli(root, 'init', '--agents', 'codex').status, 0);
  writeFileSync(join(external, 'sentinel.md'), '# Externo\n');
  symlinkSync(external, join(root, '.claude'));
  const before = protectedGit(root), link = lstatSync(join(root, '.claude'), { bigint: true });
  const result = cli(root, 'sync', '--check');
  assert.equal(result.status, 1, JSON.stringify(result.body));
  assert.ok(result.body.retainedClaudeRules.includes('.claude'));
  const script = join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
  const direct = spawnSync(process.execPath, [script, '--check'], { cwd: root, encoding: 'utf8', timeout: 60000 });
  assert.equal(direct.status, 1, direct.stdout + direct.stderr); assert.match(direct.stdout, /Escopo Claude nao verificado/);
  assert.equal(readFileSync(join(external, 'sentinel.md'), 'utf8'), '# Externo\n');
  assert.equal(lstatSync(join(root, '.claude'), { bigint: true }).ino, link.ino);
  assert.deepEqual(protectedGit(root), before);
});

test('doctor mantém alerta de legado com outra issue e não presume estado inválido', t => {
  const root = fixture(t); init(root);
  const selected = cli(root, 'agents', 'codex');
  assert.equal(selected.status, 0, JSON.stringify(selected.body));
  assert.ok(selected.body.retainedClaudeRules.length > 0);
  const human = protectedGit(root);
  put(root, '.pbai4devs/INSTRUCTIONS.md', '# Edição humana sintética\n');
  const doctor = cli(root, 'doctor');
  assert.equal(doctor.status, 1, JSON.stringify(doctor.body));
  assert.ok(doctor.body.issues.some(issue => issue.path === '.pbai4devs/INSTRUCTIONS.md'));
  assert.ok(doctor.body.retainedClaudeRules.length > 0);
  assert.match(doctor.body.warnings.join(' '), /podem continuar ativas globalmente/);
  assert.deepEqual(protectedGit(root), human);
  put(root, '.pbai4devs/state/agentdevkit.json', '{ inválido\n');
  const invalid = cli(root, 'doctor');
  assert.equal(invalid.status, 1, JSON.stringify(invalid.body));
  assert.match(invalid.body.warnings.join(' '), /Não foi possível verificar as regras Claude/);
  assert.deepEqual(protectedGit(root), human);
});

test('regras em pastas ignoradas continuam com escopo não verificado após desmarcar Claude', t => {
  const root = fixture(t); init(root);
  const selection = cli(root, 'agents', 'codex'); assert.equal(selection.status, 0, JSON.stringify(selection.body));
  for (const folder of ['node_modules', '.local', '.cache', 'opencode-loop']) put(root, `.claude/rules/${folder}/human.md`, '# Regra humana\n');
  const before = protectedGit(root);
  for (const args of [['doctor'], ['sync', '--check']]) {
    const result = cli(root, ...args); assert.equal(result.status, 1, JSON.stringify(result.body));
    for (const folder of ['node_modules', '.local', '.cache', 'opencode-loop']) assert.ok(result.body.retainedClaudeRules.includes(`.claude/rules/${folder}/human.md`));
    assert.deepEqual(protectedGit(root), before);
  }
});

test('limite de profundidade mantém escopo Claude como não verificado', t => {
  const root = fixture(t); init(root); assert.equal(cli(root, 'agents', 'codex').status, 0);
  let folder = join(root, '.claude/rules');
  for (let i = 0; i < 66; i++) { folder = join(folder, 'd'); mkdirSync(folder, { recursive: true }); }
  const before = protectedGit(root);
  for (const args of [['doctor'], ['sync', '--check']]) {
    const result = cli(root, ...args); assert.equal(result.status, 1, JSON.stringify(result.body));
    assert.ok(result.body.retainedClaudeRules.includes('.claude/rules'));
    assert.deepEqual(protectedGit(root), before);
  }
});

test('diretório ilegível mantém escopo Claude como não verificado', t => {
  if (process.platform === 'win32' || process.getuid?.() === 0) return t.skip('permissões Unix não aplicáveis');
  const root = fixture(t); init(root); assert.equal(cli(root, 'agents', 'codex').status, 0);
  const blocked = join(root, '.claude/rules/unreadable'); mkdirSync(blocked, { recursive: true }); chmodSync(blocked, 0);
  try {
    const before = protectedGit(root);
    for (const args of [['doctor'], ['sync', '--check']]) {
      const result = cli(root, ...args); assert.equal(result.status, 1, JSON.stringify(result.body));
      assert.ok(result.body.retainedClaudeRules?.includes('.claude/rules') || /Não foi possível verificar as regras Claude/.test((result.body.warnings || []).join(' ')), JSON.stringify(result.body));
      assert.deepEqual(protectedGit(root), before);
    }
  } finally { chmodSync(blocked, 0o700); }
});

test('limite de entradas mantém escopo Claude como não verificado', t => {
  const root = fixture(t); init(root); assert.equal(cli(root, 'agents', 'codex').status, 0);
  const directory = join(root, '.claude/rules/muitas'); mkdirSync(directory, { recursive: true });
  for (let i = 0; i < 10001; i++) writeFileSync(join(directory, `${i}.txt`), '');
  const before = protectedGit(root), result = cli(root, 'sync', '--check');
  assert.equal(result.status, 1, JSON.stringify(result.body));
  assert.ok(result.body.retainedClaudeRules.includes('.claude/rules'));
  assert.deepEqual(protectedGit(root), before);
});

test('sync direto --check detecta legado Claude após desmarcação e preserva Git', t => {
  const root = fixture(t); init(root); assert.equal(cli(root, 'agents', 'codex').status, 0);
  const before = protectedGit(root), script = join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
  const result = spawnSync(process.execPath, [script, '--check'], { cwd: root, encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /Escopo Claude nao verificado/); assert.deepEqual(protectedGit(root), before);
});

test('sync direto --check aprova ausência de legado Claude após instalar somente Codex', t => {
  const root = fixture(t); assert.equal(cli(root, 'init', '--agents', 'codex').status, 0);
  const before = protectedGit(root), script = join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
  const result = spawnSync(process.execPath, [script, '--check'], { cwd: root, encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.doesNotMatch(result.stdout, /Escopo Claude nao verificado/); assert.deepEqual(protectedGit(root), before);
});

test('init preserva link de rules e checks sinalizam escopo desconhecido preservando o alvo', t => {
  if (process.platform === 'win32') return t.skip('sem premissa de permissão para criar symlink');
  const root = fixture(t), external = mkdtempSync(join(tmpdir(), 'adk-claude-rule-boundary-'));
  t.after(() => rmSync(external, { recursive: true, force: true }));
  const sentinel = join(external, 'sentinel.md'); writeFileSync(sentinel, '# Externo\n');
  mkdirSync(join(root, '.claude'), { recursive: true }); symlinkSync(external, join(root, '.claude/rules'));
  const before = protectedGit(root), link = lstatSync(join(root, '.claude/rules'), { bigint: true });
  const initial = cli(root, 'init', '--agents', 'claude'); assert.equal(initial.status, 0, JSON.stringify(initial.body));
  assert.ok(initial.body.retainedClaudeRules.length); assert.ok(initial.body.scopeOmissions.every(x => x.status === 'activation-unverified'));
  for (const args of [['doctor'], ['sync', '--check']]) {
    const result = cli(root, ...args); assert.equal(result.status, 1, JSON.stringify(result.body));
    assert.ok(result.body.retainedClaudeRules.length); assert.match(result.body.warnings.join(' '), /globais|globalmente/);
  }
  const script = join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
  const direct = spawnSync(process.execPath, [script, '--check'], { cwd: root, encoding: 'utf8', timeout: 60000 });
  assert.equal(direct.status, 1, direct.stdout + direct.stderr); assert.match(direct.stdout, /Escopo Claude nao verificado/);
  assert.equal(readFileSync(sentinel, 'utf8'), '# Externo\n'); assert.equal(lstatSync(join(root, '.claude/rules'), { bigint: true }).ino, link.ino);
  assert.deepEqual(protectedGit(root), before);
});

test('doctor e preview identificam link simbólico em regra preservada sem ler o destino', t => {
  if (process.platform === 'win32') return t.skip('sem premissa de permissão para criar symlink');
  const root = fixture(t), external = mkdtempSync(join(tmpdir(), 'adk-claude-symlink-reason-'));
  t.after(() => rmSync(external, { recursive: true, force: true }));
  init(root);
  const sentinel = join(external, 'sentinel.md');
  writeFileSync(sentinel, 'conteúdo externo\n');
  mkdirSync(dirname(join(root, legacy)), { recursive: true });
  symlinkSync(sentinel, join(root, legacy));
  const before = protectedGit(root), state = read(root, '.pbai4devs/state/agentdevkit.json');
  const link = lstatSync(join(root, legacy), { bigint: true });
  for (const args of [['doctor'], ['update', '--dry-run'], ['update', '--dry-run', '--force'], ['update'], ['update', '--force']]) {
    const result = cli(root, ...args);
    assert.equal(result.status, 1, JSON.stringify(result.body));
    assert.ok(result.body.preserved.some(item => item.path === legacy && item.reason === 'symbolic-link'), JSON.stringify(result.body.preserved));
    if (args[0] === 'doctor') assert.ok(result.body.issues.some(item => item.code === 'conflict' && item.path === legacy && item.preservationReason === 'symbolic-link'));
    if (args[0] === 'update') assert.ok(result.body.conflicts.includes(legacy), JSON.stringify(result.body.conflicts));
    assert.equal(readFileSync(sentinel, 'utf8'), 'conteúdo externo\n');
    assert.equal(lstatSync(join(root, legacy), { bigint: true }).ino, link.ino);
    assert.deepEqual(read(root, '.pbai4devs/state/agentdevkit.json'), state);
    assert.deepEqual(protectedGit(root), before);
  }
});

test('update preserva arquivo humano que impede diretório de regra Claude', t => {
  const root = fixture(t); init(root);
  const boundary = '.claude/rules/git', content = 'arquivo humano não é diretório\n';
  put(root, boundary, content);
  const before = protectedGit(root), state = read(root, '.pbai4devs/state/agentdevkit.json');
  for (const args of [['doctor'], ['update', '--dry-run'], ['update', '--force']]) {
    const result = cli(root, ...args);
    assert.equal(result.status, 1, JSON.stringify(result.body));
    assert.ok(result.body.preserved.some(item => item.path === boundary && item.reason === 'non-directory'), JSON.stringify(result.body.preserved));
    if (args[0] === 'update') assert.ok(result.body.conflicts.includes(boundary), JSON.stringify(result.body.conflicts));
    assert.equal(read(root, boundary).toString(), content);
    assert.deepEqual(read(root, '.pbai4devs/state/agentdevkit.json'), state);
    assert.deepEqual(protectedGit(root), before);
  }
});

test('update informa diretório humano no nome de regra Claude e preserva conteúdo', t => {
  const root = fixture(t); init(root);
  const directory = join(root, legacy), sentinel = join(directory, 'humano.txt');
  mkdirSync(directory, { recursive: true }); writeFileSync(sentinel, 'conteúdo humano\n');
  const before = protectedGit(root), state = read(root, '.pbai4devs/state/agentdevkit.json');
  for (const args of [['doctor'], ['update', '--dry-run'], ['update', '--force']]) {
    const result = cli(root, ...args);
    assert.equal(result.status, 1, JSON.stringify(result.body));
    assert.ok(result.body.preserved?.some(item => item.path === legacy && item.reason === 'existing-directory'), JSON.stringify(result.body));
    if (args[0] === 'update') assert.ok(result.body.conflicts.includes(legacy));
    assert.equal(readFileSync(sentinel, 'utf8'), 'conteúdo humano\n');
    assert.deepEqual(read(root, '.pbai4devs/state/agentdevkit.json'), state);
    assert.deepEqual(protectedGit(root), before);
  }
});

test('init preserva diretório humano no nome de regra Claude', t => {
  const root = fixture(t), directory = join(root, legacy), sentinel = join(directory, 'humano.txt');
  mkdirSync(directory, { recursive: true }); writeFileSync(sentinel, 'conteúdo humano\n');
  const before = protectedGit(root), result = cli(root, 'init', '--agents', 'claude');
  assert.equal(result.status, 0, JSON.stringify(result.body));
  assert.ok(result.body.preserved.some(item => item.path === legacy && item.reason === 'existing-directory'), JSON.stringify(result.body.preserved));
  assert.ok(result.body.scopeOmissions.every(item => item.status === 'activation-unverified'));
  assert.equal(readFileSync(sentinel, 'utf8'), 'conteúdo humano\n');
  assert.deepEqual(protectedGit(root), before);
});

for (const record of ['files', 'blocks']) test(`regra Claude com registro ${record} recusa link simbólico sem alterar destino`, { timeout: 180000 }, t => {
  if (process.platform === 'win32') return t.skip('sem premissa de permissão para criar symlink');
  const root = fixture(t), external = mkdtempSync(join(tmpdir(), 'adk-claude-claimed-link-'));
  t.after(() => rmSync(external, { recursive: true, force: true }));
  init(root); addOwnedLegacy(root);
  const statePath = '.pbai4devs/state/agentdevkit.json', state = JSON.parse(read(root, statePath));
  if (record === 'blocks') { state.blocks[legacy] = state.files[legacy]; delete state.files[legacy]; }
  put(root, statePath, JSON.stringify(state, null, 2) + '\n');
  const sentinel = join(external, 'sentinel.md'), target = join(root, legacy);
  writeFileSync(sentinel, 'conteúdo externo\n'); rmSync(target); symlinkSync(sentinel, target);
  const before = protectedGit(root), stateBefore = read(root, statePath), link = lstatSync(target, { bigint: true });
  for (const args of [['doctor'], ['update', '--dry-run']]) {
    const result = cli(root, ...args);
    assert.equal(result.status, 1, JSON.stringify(result.body));
    assert.equal(result.body.error?.code, 'E_SYMLINK', JSON.stringify(result.body));
    assert.equal(readFileSync(sentinel, 'utf8'), 'conteúdo externo\n');
    assert.equal(lstatSync(target, { bigint: true }).ino, link.ino);
    assert.deepEqual(read(root, statePath), stateBefore);
    assert.deepEqual(protectedGit(root), before);
  }
});

test('doctor preserva categoria de erro duplo sem expor conteúdo da falha', async t => {
  const root = fixture(t); init(root); assert.equal(cli(root, 'agents', 'codex').status, 0);
  const before = protectedGit(root); put(root, '.pbai4devs/INSTRUCTIONS.md', '# Alteração humana\n');
  const stagePrefix = join(fs.realpathSync(tmpdir()), 'agentdevkit-');
  const original = fs.writeFileSync; let output = '', code, injected = false;
  fs.writeFileSync = (file, ...args) => {
    if (typeof file === 'string' && file.startsWith(stagePrefix) && file.includes(`${sep}.pbai4devs${sep}`)) {
      injected = true;
      throw Object.assign(new Error('segredo-sintetico-nao-expor'), { code: 'EIO' });
    }
    return original(file, ...args);
  };
  syncBuiltinESMExports();
  try { code = await main(['doctor', '--target', root, '--json'], { stdout: { write: value => { output += value; } } }); }
  finally { fs.writeFileSync = original; syncBuiltinESMExports(); }
  assert.ok(injected, 'a cópia para o estágio privado precisa falhar na fixture');
  const result = JSON.parse(output); assert.equal(code, 1, output);
  assert.ok(result.issues.some(issue => issue.path === '.pbai4devs/INSTRUCTIONS.md'));
  const issue = result.issues.find(issue => issue.code === 'claude-inspection-unverified');
  assert.equal(issue?.causeCode, 'EIO', output);
  assert.match(result.warnings.join(' '), /Não foi possível verificar as regras Claude/);
  assert.doesNotMatch(output, /segredo-sintetico-nao-expor/);
  assert.deepEqual(protectedGit(root), before);
});

test('sync direto com apenas regra global sinaliza rules simbólico cíclico, externo ou pendente', t => {
  if (process.platform === 'win32') return t.skip('sem premissa de permissão para criar symlink');
  for (const kind of ['cycle', 'external', 'dangling']) {
    const root = fixture(t), outside = mkdtempSync(join(tmpdir(), 'adk-claude-only-global-'));
    t.after(() => rmSync(outside, { recursive: true, force: true }));
    writeFileSync(join(outside, 'sentinel.md'), '# Exterior\n');
    put(root, '.pbai4devs/templates/gitignore/agents.ignore', '# Cache\n/*\n!/.gitignore\n{{ALLOWLIST}}\n/cache/\n*.log\n');
    put(root, '.pbai4devs/templates/gitignore/clients.json', '{}\n');
    put(root, '.pbai4devs/templates/gitignore/shared.ignore', '# Compartilhado\n');
    put(root, '.pbai4devs/rules/demo/RULE.md', '---\ntrigger: always_on\ndescription: Regra.\n---\n\n# Regra\n');
    put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|agrupado\n');
    mkdirSync(join(root, '.claude'), { recursive: true });
    symlinkSync(kind === 'cycle' ? 'rules' : kind === 'external' ? outside : 'missing', join(root, '.claude/rules'));
    const before = protectedGit(root), link = lstatSync(join(root, '.claude/rules'), { bigint: true });
    let output = [];
    const applied = synchronize({ root, localIgnores: false, generateEntrypoints: false, output: line => output.push(line) });
    assert.equal(applied.exitCode, 0); assert.match(output.join('\n'), /Escopo Claude nao verificado/);
    output = [];
    const check = synchronize({ root, check: true, localIgnores: false, generateEntrypoints: false, output: line => output.push(line) });
    assert.equal(check.exitCode, 1); assert.match(output.join('\n'), /Escopo Claude nao verificado/);
    assert.deepEqual(check.scopeOmissions, []);
    assert.equal(lstatSync(join(root, '.claude/rules'), { bigint: true }).ino, link.ino);
    assert.equal(readFileSync(join(outside, 'sentinel.md'), 'utf8'), '# Exterior\n'); assert.deepEqual(protectedGit(root), before);
  }
});

test('somente always_on ou glob explícito detecta link interno ou raiz em init e checks', { timeout: 120000 }, t => {
  if (process.platform === 'win32') return t.skip('sem premissa de permissão para criar symlink');
  const bundle = mkdtempSync(join(tmpdir(), 'adk-claude-only-always-package-'));
  t.after(() => rmSync(bundle, { recursive: true, force: true }));
  for (const folder of ['.pbai4devs', 'src', 'bin']) fs.cpSync(resolve(folder), join(bundle, folder), {
    recursive: true, filter: source => !source.split('/').some(part => ['.agent-tests', '.local', 'state', 'estado'].includes(part)),
  });
  fs.copyFileSync(resolve('package.json'), join(bundle, 'package.json'));
  fs.copyFileSync(resolve('LICENSE'), join(bundle, 'LICENSE'));

  const gitRule = join(bundle, '.pbai4devs/rules/git/RULE.md');
  const original = readFileSync(gitRule, 'utf8'); assert.match(original, /^trigger: model_decision$/m);
  writeFileSync(gitRule, original.replace(/^trigger: model_decision$/m, 'trigger: always_on'));
  const invoke = (root, ...args) => {
    const result = spawnSync(process.execPath, [join(bundle, 'bin/agentdevkit.mjs'), ...args, '--target', root, '--json'], { cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
    assert.ok(!result.error, result.error?.message); return { status: result.status, body: JSON.parse(result.stdout) };
  };
  for (const kind of ['root-cycle', 'root-external', 'root-dangling', 'nested-global', 'nested-glob', 'root-file', 'nested-file']) {
    const root = fixture(t), outside = mkdtempSync(join(tmpdir(), 'adk-claude-always-external-'));
    t.after(() => rmSync(outside, { recursive: true, force: true })); writeFileSync(join(outside, 'sentinel.md'), '# Externo\n');
    mkdirSync(join(root, '.claude'), { recursive: true });
    const nested = kind.startsWith('nested-');
    if (nested) mkdirSync(join(root, '.claude/rules'), { recursive: true });
    if (kind === 'nested-glob') {
      const source = join(bundle, '.pbai4devs/rules/seguranca/RULE.md'), content = readFileSync(source, 'utf8');
      writeFileSync(source, content.replace(/^trigger: always_on$/m, 'trigger: glob\nglobs: "src/**/*.js"'));
      writeFileSync(join(bundle, '.pbai4devs/rules/seguranca/claude.yaml'), '---\npaths: ["src/**/*.js"]\n---\n');
    }
    const linkPath = nested ? '.claude/rules/seguranca' : '.claude/rules';
    const target = kind === 'root-cycle' ? 'rules' : kind === 'root-dangling' ? 'missing' : outside;
    const fileBoundary = kind.endsWith('-file');
    if (fileBoundary) put(root, linkPath, '# Arquivo humano\n');
    else symlinkSync(target, join(root, linkPath));
    if (kind === 'root-file') git(root, 'add', '-f', '--', linkPath);
    const identity = lstatSync(join(root, linkPath), { bigint: true }), before = protectedGit(root);
    const initial = invoke(root, 'init', '--agents', 'claude'); assert.equal(initial.status, 0, JSON.stringify(initial.body));
    assert.ok(initial.body.retainedClaudeRules.length, JSON.stringify(initial.body));
    assert.equal(initial.body.scopeOmissions?.length || 0, 0);
    for (const args of [['doctor'], ['sync', '--check']]) {
      const result = invoke(root, ...args); assert.equal(result.status, 1, JSON.stringify(result.body));
      assert.ok(result.body.retainedClaudeRules.length); assert.match(result.body.warnings.join(' '), /global/i);
    }
    const direct = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--check'], { cwd: root, encoding: 'utf8', timeout: 60000 });
    assert.equal(direct.status, 1, direct.stdout + direct.stderr); assert.match(direct.stdout, /Escopo Claude nao verificado/);
    assert.equal(lstatSync(join(root, linkPath), { bigint: true }).ino, identity.ino);
    if (fileBoundary) assert.equal(read(root, linkPath).toString(), '# Arquivo humano\n');
    assert.equal(readFileSync(join(outside, 'sentinel.md'), 'utf8'), '# Externo\n'); assert.deepEqual(protectedGit(root), before);
  }
});

test('pacote integral detecta link interno de regra Claude global em init e checks', t => {
  if (process.platform === 'win32') return t.skip('sem premissa de permissão para criar symlink');
  const root = fixture(t), outside = mkdtempSync(join(tmpdir(), 'adk-claude-stock-external-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  const sentinel = join(outside, 'sentinel.md'); writeFileSync(sentinel, '# Exterior\n');
  mkdirSync(join(root, '.claude/rules'), { recursive: true });
  const link = '.claude/rules/seguranca'; symlinkSync(outside, join(root, link));
  const before = protectedGit(root), identity = lstatSync(join(root, link), { bigint: true });
  const initial = cli(root, 'init', '--agents', 'claude'); assert.equal(initial.status, 0, JSON.stringify(initial.body));
  assert.ok(initial.body.retainedClaudeRules.includes(link));
  for (const args of [['doctor'], ['sync', '--check']]) {
    const result = cli(root, ...args); assert.equal(result.status, 1, JSON.stringify(result.body));
    assert.ok(result.body.retainedClaudeRules.includes(link)); assert.match(result.body.warnings.join(' '), /global/i);
  }
  const direct = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--check'], { cwd: root, encoding: 'utf8', timeout: 60000 });
  assert.equal(direct.status, 1, direct.stdout + direct.stderr); assert.match(direct.stdout, /Escopo Claude nao verificado/);
  assert.equal(lstatSync(join(root, link), { bigint: true }).ino, identity.ino);
  assert.equal(readFileSync(sentinel, 'utf8'), '# Exterior\n'); assert.deepEqual(protectedGit(root), before);
});

test('sync direto distingue diretório irrelevante de obstruções no destino Claude', t => {
  for (const kind of ['empty-unrelated', 'empty-target', 'root-file', 'ancestor-file', 'staged-root-file']) {
    const root = fixture(t);
    put(root, '.pbai4devs/templates/gitignore/agents.ignore', '# Cache\n/*\n!/.gitignore\n{{ALLOWLIST}}\n/cache/\n*.log\n');
    put(root, '.pbai4devs/templates/gitignore/clients.json', '{}\n');
    put(root, '.pbai4devs/templates/gitignore/shared.ignore', '# Compartilhado\n');
    put(root, '.pbai4devs/rules/demo/RULE.md', '---\ntrigger: always_on\ndescription: Regra.\n---\n\n# Regra\n');
    put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|agrupado\n');
    if (kind === 'empty-unrelated') mkdirSync(join(root, '.claude/rules/empty'), { recursive: true });
    if (kind === 'empty-target') mkdirSync(join(root, '.claude/rules/demo/RULE.md'), { recursive: true });
    if (kind === 'root-file' || kind === 'staged-root-file') put(root, '.claude/rules', '# Conteúdo humano\n');
    if (kind === 'ancestor-file') put(root, '.claude/rules/demo', '# Conteúdo humano\n');
    if (kind === 'staged-root-file') git(root, 'add', '-f', '--', '.claude/rules');
    const before = protectedGit(root), human = kind.includes('root-file') ? read(root, '.claude/rules') : kind === 'ancestor-file' ? read(root, '.claude/rules/demo') : null;
    const applied = synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }); assert.equal(applied.exitCode, 0);
    let lines = [];
    const check = synchronize({ root, check: true, localIgnores: false, generateEntrypoints: false, output: line => lines.push(line) });
    assert.equal(check.exitCode, kind === 'empty-unrelated' ? 0 : 1, `${kind}: ${lines.join('\n')}`);
    if (kind === 'empty-unrelated') assert.doesNotMatch(lines.join('\n'), /Escopo Claude nao verificado/);
    else assert.match(lines.join('\n'), /Escopo Claude nao verificado/);
    if (human) assert.deepEqual(read(root, kind.includes('root-file') ? '.claude/rules' : '.claude/rules/demo'), human);
    assert.deepEqual(protectedGit(root), before);
  }
});

test('pacote integral preserva arquivo humano staged na raiz de regras Claude e alerta', t => {
  const root = fixture(t), path = '.claude/rules'; put(root, path, '# Humano\n'); git(root, 'add', '-f', '--', path);
  const before = protectedGit(root), bytes = read(root, path);
  const initial = cli(root, 'init', '--agents', 'claude'); assert.equal(initial.status, 0, JSON.stringify(initial.body));
  assert.ok(initial.body.retainedClaudeRules.length); assert.match(initial.body.warnings.join(' '), /global/i);
  for (const args of [['doctor'], ['sync', '--check']]) {
    const result = cli(root, ...args); assert.equal(result.status, 1, JSON.stringify(result.body));
    assert.ok(result.body.retainedClaudeRules.length); assert.match(result.body.warnings.join(' '), /global/i);
  }
  assert.deepEqual(read(root, path), bytes); assert.deepEqual(protectedGit(root), before);
});

test('legado Claude em diretórios ignorados bloqueia sync sem perder registro, inclusive force', t => {
  for (const folder of ['.local', '.cache', 'node_modules', 'opencode-loop']) {
    const root = fixture(t), source = '.pbai4devs/rules/demo/RULE.md';
    const custom = `.claude/rules/${folder}/legacy.md`, normal = '.claude/rules/demo/RULE.md';
    put(root, '.pbai4devs/templates/gitignore/agents.ignore', '# Cache\n/*\n!/.gitignore\n{{ALLOWLIST}}\n/cache/\n*.log\n');
    put(root, '.pbai4devs/templates/gitignore/clients.json', '{}\n');
    put(root, '.pbai4devs/templates/gitignore/shared.ignore', '# Compartilhado\n');
    const rule = trigger => `---\nname: Demo\ndescription: Sintético\ntrigger: ${trigger}\n---\n\n# Demo\n`;
    put(root, source, rule('always_on'));
    put(root, '.pbai4devs/espelhos.conf', `agente|.claude|agrupado\nnativo|${custom}|${source}\n`);
    assert.equal(synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }).exitCode, 0);
    const prior = read(root, custom), identity = lstatSync(join(root, custom), { bigint: true });
    const statePath = '.pbai4devs/state/derived.json';
    assert.ok(Object.hasOwn(JSON.parse(read(root, statePath)).files, custom));
    rmSync(join(root, normal)); put(root, source, rule('manual')); put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|agrupado\n');
    const derived = read(root, statePath), before = protectedGit(root);
    const check = synchronize({ root, check: true, localIgnores: false, generateEntrypoints: false, output() {} });
    assert.equal(check.exitCode, 1); assert.ok(check.scopeOmissions.some(item => item.status === 'activation-unverified'));
    for (const force of [false, true]) {
      assert.throws(() => synchronize({ root, force, localIgnores: false, generateEntrypoints: false, output() {} }), /preservad|conflito/i);
      assert.deepEqual(read(root, statePath), derived); assert.deepEqual(read(root, custom), prior);
      assert.equal(lstatSync(join(root, custom), { bigint: true }).ino, identity.ino); assert.deepEqual(protectedGit(root), before);
    }
  }
});

test('CLI e sync direto detectam legado oculto mesmo quando exclude humano o ignora', t => {
  const root = fixture(t); init(root);
  const source = '.pbai4devs/rules/demo/RULE.md', custom = '.claude/rules/.local/legacy.md', normal = '.claude/rules/demo/RULE.md';
  const rule = trigger => `---\nname: Demo\ndescription: Sintético\ntrigger: ${trigger}\n---\n\n# Demo\n`;
  put(root, source, rule('always_on'));
  const configPath = '.pbai4devs/espelhos.conf', original = read(root, configPath).toString();
  put(root, configPath, `${original}nativo|${custom}|${source}\n`);
  assert.equal(synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }).exitCode, 0);
  const prior = read(root, custom), identity = lstatSync(join(root, custom), { bigint: true });
  const statePath = '.pbai4devs/state/derived.json'; assert.ok(Object.hasOwn(JSON.parse(read(root, statePath)).files, custom));
  put(root, '.git/info/exclude', `${read(root, '.git/info/exclude').toString()}\n/.claude/rules/.local/\n`);
  rmSync(join(root, normal)); put(root, source, rule('manual')); put(root, configPath, original);
  const derived = read(root, statePath), before = protectedGit(root);
  for (const force of [false, true]) {
    assert.throws(() => synchronize({ root, force, localIgnores: false, generateEntrypoints: false, output() {} }), /preservad|conflito/i);
    assert.deepEqual(read(root, statePath), derived); assert.deepEqual(protectedGit(root), before);
  }
  const script = join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
  const direct = spawnSync(process.execPath, [script, '--check'], { cwd: root, encoding: 'utf8', timeout: 60000 });
  assert.equal(direct.status, 1, direct.stdout + direct.stderr);
  for (const args of [['doctor'], ['sync', '--check']]) {
    const result = cli(root, ...args); assert.equal(result.status, 1, JSON.stringify(result.body));
    if (args[0] === 'doctor') { assert.ok(Array.isArray(result.body.issues), JSON.stringify(result.body)); assert.ok(result.body.issues.some(issue => issue.code === 'conflict' && issue.path === custom), JSON.stringify(result.body)); }
    else assert.ok(result.body.conflicts.includes(custom));
    assert.ok(result.body.scopeOmissions.some(item => item.source === source && item.status === 'activation-unverified'));
    assert.deepEqual(read(root, statePath), derived); assert.deepEqual(protectedGit(root), before);
  }
  assert.deepEqual(read(root, custom), prior); assert.equal(lstatSync(join(root, custom), { bigint: true }).ino, identity.ino);
});

test('estado legado Claude recusa caminhos inválidos e artefatos ignorados de outros clientes', t => {
  const root = fixture(t); init(root);
  const statePath = '.pbai4devs/state/derived.json', original = { schemaVersion: 1, entries: {} };
  const paths = ['.CLAUDE/rules/.local/legacy.md', '.claude/rules/.git/config.md', '.claude/rules/.local/../escape.md', '.codex/rules/.local/legacy.md', '.claude/rules/.local/README.md', '.claude/rules/.local/INSTRUCTIONS.md', '.claude/rules/README.md', '.claude/rules/INSTRUCTIONS.md'];
  for (const path of paths) {
    const forged = structuredClone(original); forged.files = { ...(forged.files || {}), [path]: 'a'.repeat(64) };
    put(root, statePath, JSON.stringify(forged, null, 2) + '\n');
    const before = protectedGit(root), result = cli(root, 'doctor');
    assert.equal(result.status, 1, JSON.stringify(result.body));
    assert.equal(result.body.error?.code, 'E_STATE', JSON.stringify(result.body));
    assert.deepEqual(protectedGit(root), before);
  }
});

test('marcador em exemplo cercado não adota nem bloqueia documento humano', t => {
  for (const folder of ['.local', '.cache', 'node_modules', 'opencode-loop']) {
    const root = fixture(t), source = '.pbai4devs/rules/demo/RULE.md', custom = `.claude/rules/${folder}/human.md`;
    put(root, '.pbai4devs/templates/gitignore/agents.ignore', '# Cache\n/*\n!/.gitignore\n{{ALLOWLIST}}\n/cache/\n*.log\n');
    put(root, '.pbai4devs/templates/gitignore/clients.json', '{}\n'); put(root, '.pbai4devs/templates/gitignore/shared.ignore', '# Compartilhado\n');
    put(root, source, '---\ntrigger: manual\ndescription: Regra humana.\n---\n\n# Regra\n');
    put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|agrupado\n');
    const content = '# Manual humano\n\n```md\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/rules/demo/RULE.md).\n```\n\n- ```md\n  <!-- gerado: sincronizar-agentes -->\n  Leia e siga [origem](../../../.pbai4devs/rules/demo/RULE.md).\n  ```\n';
    put(root, custom, content); const before = protectedGit(root);
    for (const force of [false, true]) {
      const result = synchronize({ root, force, localIgnores: false, generateEntrypoints: false, output() {} });
      assert.equal(result.exitCode, 0); assert.equal(read(root, custom).toString(), content); assert.deepEqual(protectedGit(root), before);
    }
    const lines = [];
    const check = synchronize({ root, check: true, localIgnores: false, generateEntrypoints: false, output: line => lines.push(line) });
    assert.equal(check.exitCode, 1); assert.match(lines.join('\n'), /Escopo Claude nao verificado/);
    const derived = JSON.parse(read(root, '.pbai4devs/state/derived.json'));
    assert.equal(Object.hasOwn(derived.files || {}, custom), false); assert.equal(Object.hasOwn(derived.blocks || {}, custom), false);
  }
});

test('marcador e apontamento reais fora de fence permanecem conflito sem adoção', t => {
  const root = fixture(t), source = '.pbai4devs/rules/demo/RULE.md', custom = '.claude/rules/.local/legacy.md';
  put(root, '.pbai4devs/templates/gitignore/agents.ignore', '# Cache\n/*\n!/.gitignore\n{{ALLOWLIST}}\n/cache/\n*.log\n');
  put(root, '.pbai4devs/templates/gitignore/clients.json', '{}\n'); put(root, '.pbai4devs/templates/gitignore/shared.ignore', '# Compartilhado\n');
  put(root, source, '---\ntrigger: manual\ndescription: Regra humana.\n---\n\n# Regra\n');
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|agrupado\n');
  const content = '# Nota humana\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/rules/demo/RULE.md). Uso manual.\n\nTexto adicional.\n';
  put(root, custom, content); const before = protectedGit(root);
  for (const force of [false, true]) assert.throws(() => synchronize({ root, force, localIgnores: false, generateEntrypoints: false, output() {} }), /preservad|conflito/i);
  assert.equal(synchronize({ root, check: true, localIgnores: false, generateEntrypoints: false, output() {} }).exitCode, 1);
  assert.equal(read(root, custom).toString(), content); assert.deepEqual(protectedGit(root), before);
  assert.equal(existsSync(join(root, '.pbai4devs/state/derived.json')), false);
});

test('detecção de apontamento distingue fences comuns, listas e referência editada', () => {
  const target = '.claude/rules/.local/x.md', marker = '<!-- gerado: sincronizar-agentes -->';
  const pointer = 'Leia e siga [origem](../../../.pbai4devs/rules/demo/RULE.md).', body = marker + '\n' + pointer;
  const cases = [
    ['real', body, true], ['crlf', body.replaceAll('\n', '\r\n'), true],
    ['backticks', '```md\n' + body + '\n```', false], ['tildes', '~~~md\n' + body + '\n~~~', false],
    ['abertura longa', '````\n' + body + '\n```\n' + body, false], ['fence fechado', '````\n' + body + '\n````\n' + body, true],
    ['tilde sem fechamento', '~~~~\n' + body + '\n~~~\n' + body, false], ['aberto', '~~~\n' + body, false],
    ['indentado três', '   ```\n' + body + '\n   ```', false], ['indentado quatro', '    ```\n    ' + marker + '\n    ' + pointer + '\n    ```', false],
    ['crlf fenced', ('```\n' + body + '\n```').replaceAll('\n', '\r\n'), false],
    ['lista', '- ```md\n  ' + marker + '\n  ' + pointer + '\n  ```', false],
    ['lista ordenada', '1. ```md\n   ' + marker + '\n   ' + pointer + '\n   ```', false],
    ['lista tilde', '- ~~~md\n  ' + marker + '\n  ' + pointer + '\n  ~~~', false],
    ['editado', marker + '\n' + pointer + ' Uso manual.', true],
    ['lista aninhada antes da regra', '- Lista\n  - ```md\n    exemplo\n    ```\n\n' + body, true],
    ['lista aninhada com regra cercada', '- Lista\n  - ```md\n    ' + marker + '\n    ' + pointer + '\n    ```', false],
    ['fence aberto', '```\nexample\n' + body, false],
    ['marcador cercado', '```\n' + marker + '\n```\n' + pointer, false],
    ['apontamento cercado', marker + '\n```\n' + pointer + '\n```', false],
  ];
  for (const [name, text, expected] of cases) assert.equal(resemblesClaudeReference(target, text), expected, name);
});

test('exemplo YAML e formas Markdown alternativas são incerteza, sem adoção nem bloqueio de sync', t => {
  for (const kind of ['yaml', 'label', 'angle', 'reference']) {
    const root = fixture(t), source = '.pbai4devs/rules/demo/RULE.md', custom = '.claude/rules/.local/human.md';
    put(root, '.pbai4devs/templates/gitignore/agents.ignore', '# Cache\n/*\n!/.gitignore\n{{ALLOWLIST}}\n/cache/\n*.log\n');
    put(root, '.pbai4devs/templates/gitignore/clients.json', '{}\n'); put(root, '.pbai4devs/templates/gitignore/shared.ignore', '# Compartilhado\n');
    put(root, source, '---\ntrigger: manual\ndescription: Regra humana.\n---\n\n# Regra\n');
    put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|agrupado\n');
    const marker = '<!-- gerado: sincronizar-agentes -->', target = '../../../.pbai4devs/rules/demo/RULE.md';
    const body = kind === 'yaml' ? `---\ndescription: |\n  ${marker}\n  Leia e siga [origem](${target}).\n---\n\n# Humano\n`
      : kind === 'label' ? `# Humano\n${marker}\nLeia e siga [Origem](${target}).\n`
      : kind === 'angle' ? `# Humano\n${marker}\nLeia e siga [origem](<${target}>).\n`
      : `# Humano\n${marker}\nLeia e siga [origem][demo].\n\n[demo]: ${target}\n`;
    put(root, custom, body); const before = protectedGit(root);
    for (const force of [false, true]) {
      const result = synchronize({ root, force, localIgnores: false, generateEntrypoints: false, output() {} });
      assert.equal(result.exitCode, 0); assert.equal(read(root, custom).toString(), body); assert.deepEqual(protectedGit(root), before);
    }
    const lines = [], check = synchronize({ root, check: true, localIgnores: false, generateEntrypoints: false, output: line => lines.push(line) });
    assert.equal(check.exitCode, 1); assert.equal(check.conflicts, 0);
    const warning = lines.find(line => line.startsWith('Escopo Claude nao verificado'));
    assert.ok(warning); assert.doesNotMatch(warning, /revise os conflitos/);
    const derived = JSON.parse(read(root, '.pbai4devs/state/derived.json'));
    assert.equal(Object.hasOwn(derived.files || {}, custom), false); assert.equal(Object.hasOwn(derived.blocks || {}, custom), false);
  }
});
