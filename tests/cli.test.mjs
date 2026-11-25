import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, resolve, join, dirname, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { run } from '../bin/agentdevkit.mjs';
import { resolveTarget } from '../src/install.mjs';
import { packageInfo } from '../src/config.mjs';
import { main as cliMain, parseArgs, print } from '../src/cli.mjs';
import { startProjectRecovery } from '../.pbai4devs/scripts/lib/project-recovery.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(project, 'bin/agentdevkit.mjs');
function fixture(t) {
  mkdirSync(join(project, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(project, '.agent-tests/cli-'));
  assert.equal(spawnSync('git', ['init', '--quiet', root]).status, 0);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
const put = (root, path, value) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value); };

test("conflicts appear in the human exit even without planned changes", () => {
  const conflicts = ['.claude/rules/a/RULE.md', 'linha\nextra', 'c', 'd', 'e', 'f'];
  for (const [language, label] of [['pt', 'Conflitos'], ['en', 'Conflicts'], ['es', 'Conflictos']]) {
    let human = '';
    const result = { language, message: 'revisar', plan: [], conflicts, next: [] };
    print(result, { json: false }, { write: value => { human += value; } });
    assert.ok(human.includes(`${label}: 6.`));
    assert.ok(human.includes(JSON.stringify(conflicts[0])));
    assert.ok(human.includes(JSON.stringify(conflicts[1])));
    assert.ok(!human.includes('linha\nextra'));
    assert.ok(!human.includes(JSON.stringify(conflicts[5])));
    assert.match(human, /--json/);
    let json = '';
    print(result, { json: true }, { write: value => { json += value; } });
    assert.deepEqual(JSON.parse(json).conflicts, conflicts);
  }
});
function cli(root, args, expected = 0) {
  const result = spawnSync(process.execPath, [bin, ...args, '--target', root, '--json'], { encoding: 'utf8', timeout: 180000 });
  assert.equal(result.status, expected, `agentdevkit ${args.join(' ')}: ${result.error?.stack || ''}\nsignal: ${result.signal || 'none'}\n${result.stdout || ''}${result.stderr || ''}`);
  const value = JSON.parse(result.stdout); assert.ok(Array.isArray(value.next)); assert.ok(value.next.length);
  return value;
}

test("init --local keeps the hub out of the files discovered by Git", { timeout: 120000 }, t => {
  const root = fixture(t);
  const git = (...args) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  const files = {
    '.gitignore': '# regras do repositório\n*.tmp\n',
    'README.md': '# Projeto\n',
    'AGENTS.md': 'Instruções da equipe.\n',
    '.pbai4devs/.gitignore': '# regra local\r\n!/docs/\r\n',
    '.pbai4devs/docs/LOCAL.md': '# Documento local\n',
  };
  for (const [path, value] of Object.entries(files)) put(root, path, value);
  assert.equal(git('add', '--', '.gitignore', 'README.md').status, 0);
  const preserved = ['.gitignore', 'README.md', '.git/index', '.git/config', '.git/info/exclude',
    '.pbai4devs/docs/LOCAL.md'];
  const bytes = () => preserved.map(path => readFileSync(join(root, path)));
  const gitBefore = bytes();
  const untracked = () => {
    const result = git('ls-files', '--others', '--exclude-standard');
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.split('\n');
  };
  assert.ok(untracked().includes('.pbai4devs/docs/LOCAL.md'));
  const args = ['init', '--local', '--agents', 'none'];
  const preview = cli(root, [...args, '--dry-run']);
  assert.match(preview.next[0].command, /--local\b/);
  assert.equal(readFileSync(join(root, '.pbai4devs/.gitignore'), 'utf8'), files['.pbai4devs/.gitignore']);
  assert.deepEqual(bytes(), gitBefore);

  cli(root, args);
  assert.ok(!untracked().some(path => path.startsWith('.pbai4devs/')));
  assert.ok(readFileSync(join(root, 'AGENTS.md'), 'utf8').startsWith(files['AGENTS.md']));
  const ignore = join(root, '.pbai4devs/.gitignore');
  assert.ok(readFileSync(ignore, 'utf8').startsWith(files['.pbai4devs/.gitignore']));
  assert.equal(JSON.parse(readFileSync(join(root, '.pbai4devs/state/agentdevkit.json'), 'utf8')).local, true);
  cli(root, ['update']);
  assert.deepEqual(cli(root, ['sync', '--check']).plan, []);
  assert.deepEqual(cli(root, ['doctor']).issues, []);
  assert.ok(!untracked().some(path => path.startsWith('.pbai4devs/')));
  assert.deepEqual(bytes(), gitBefore);
});

test("CLI query and resolves pending generation even with partial status", { timeout: 120000 }, () => {
  const proofs = join(project, 'tmp');
  mkdirSync(proofs, { recursive: true });
  const root = mkdtempSync(join(realpathSync(proofs), 'cli-recuperacao-'));
  const state = { schemaVersion: 1, version: packageInfo.version, language: 'en', clients: ['codex'], files: {}, blocks: {} };
  put(root, '.pbai4devs/state/agentdevkit.json', JSON.stringify(state));
  put(root, '.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs', "import fs from 'node:fs'; fs.writeFileSync('ferramenta-executada', 'x');");
  put(root, 'humano.txt', 'edição preservada');
  const tx = startProjectRecovery(root, []);
  const pending = cli(root, ['recovery']);
  assert.equal(pending.language, 'en');
  assert.equal(pending.recovery.id, tx.id);
  assert.equal(pending.recovery.phase, 'begin');
  assert.equal(pending.recovery.backup, tx.backup);
  assert.deepEqual(cli(root, ['agents']).clients, ['codex']);
  assert.match(cli(root, ['lang']).message, /current language/i);
  const secret = 'conteudo-privado-que-nao-pode-sair';
  put(root, '.pbai4devs/state/agentdevkit.json', secret);
  for (const command of [['init', '--yes'], ['update'], ['sync'], ['lang', 'es'], ['agents', 'all'], ['tools', 'run']]) {
    const result = cli(root, command, 1);
    assert.equal(result.error.code, 'E_RECOVERY_PENDING');
    assert.equal(result.configurationStatus, 'unreadable');
    assert.ok(!JSON.stringify(result).includes(secret));
  }
  assert.equal(existsSync(join(root, 'ferramenta-executada')), false);
  for (const args of [['sync', '--check'], ['update', '--dry-run']]) {
    const result = cli(root, args, 1);
    assert.equal(result.planStatus, 'inconclusive');
    assert.equal(result.plan, undefined);
  }
  assert.equal(cli(root, ['doctor'], 1).recovery.status, 'pending');
  assert.equal(cli(root, ['next']).configurationStatus, 'unreadable');
  const mismatch = cli(root, ['recovery', 'resolve', String(tx.generation + 1), tx.id, '--lang', 'es'], 1);
  assert.equal(mismatch.error.code, 'E_RECOVERY_STATE');
  assert.match(mismatch.message, /generación/i);
  const response = cli(root, ['recovery', 'resolve', String(tx.generation), tx.id, '--lang', 'pt']);
  assert.equal(response.recovery.terminal, 'resolved');
  assert.match(response.message, /resolução/i);
  assert.equal(readFileSync(join(root, 'humano.txt'), 'utf8'), 'edição preservada');
  assert.equal(readFileSync(join(root, '.pbai4devs/state/agentdevkit.json'), 'utf8'), secret);
  assert.equal(existsSync(join(tx.backup, 'manifest.json')), true);
  assert.equal(cli(root, ['recovery']).recovery.status, 'ready');
});

test("CLI keeps query in invalid diary and does not create new destination when consulting", { timeout: 120000 }, () => {
  const proofs = join(project, 'tmp');
  mkdirSync(proofs, { recursive: true });
  const root = mkdtempSync(join(realpathSync(proofs), 'cli-diario-invalido-'));
  const missing = join(root, 'novo');
  assert.equal(cli(missing, ['recovery', '--lang', 'en']).recovery.generation, 0);
  assert.equal(cli(missing, ['--version']).command, 'version');
  assert.match(cli(missing, ['--help', '--lang', 'es']).message, /recovery/);
  assert.equal(existsSync(missing), false);
  const tx = startProjectRecovery(root, []);
  const unexpected = 'conteudo-privado-do-diario';
  put(tx.journal, 'records/invalido', unexpected);
  for (const command of [['recovery'], ['recovery', 'resolve', String(tx.generation), tx.id], ['sync'], ['doctor']]) {
    const result = cli(root, command, 1);
    assert.equal(result.error.code, 'E_RECOVERY_STORE');
    assert.equal(result.recovery.status, 'invalid');
    assert.ok(!JSON.stringify(result).includes(unexpected));
  }
  assert.equal(readFileSync(join(tx.journal, 'records/invalido'), 'utf8'), unexpected);
});

test('help, version e erros retornam JSON unico com proxima acao', t => {
  const root = fixture(t);
  put(root, '.pbai4devs/state/agentdevkit.json', '{invalid');
  const help = cli(root, ['--help', '--lang', 'en']);
  assert.equal(help.language, 'en'); assert.equal(Object.hasOwn(help, 'clients'), false);
  const version = cli(root, ['--version']);
  assert.equal(version.version, packageInfo.version); assert.equal(Object.hasOwn(version, 'clients'), false);
  const invalid = cli(root, ['nonsense', '--lang', 'es'], 2);
  assert.equal(invalid.language, 'es'); assert.match(invalid.message, /Argumentos inválidos/);
});

test("tools preserves opaque arguments after -- and global options before it", () => {
  const opaque = ['--', '--json', '--lang', 'en', '--target', 'example.test', '--agents', 'all', '--help', '--version'];
  const options = parseArgs(['--json', '--lang', 'es', '--target', 'project', 'tools', 'run', 'agent-browser', ...opaque]);
  assert.equal(options.command, 'tools');
  assert.equal(options.json, true); assert.equal(options.language, 'es');
  assert.equal(options.target, 'project'); assert.equal(options.clients, undefined);
  assert.deepEqual(options.toolArgs, ['run', 'agent-browser', ...opaque]);
  const childOnly = parseArgs(['tools', 'run', 'agent-browser', ...opaque]);
  assert.equal(childOnly.json, false); assert.equal(childOnly.language, null);
  assert.equal(childOnly.target, null);
});

test("tools forwards child process flags without changing language or destination of CLI", t => {
  const root = fixture(t);
  put(root, '.pbai4devs/state/agentdevkit.json', JSON.stringify({ schemaVersion: 1, version: packageInfo.version, language: 'pt', clients: ['codex'], files: {}, blocks: {} }));
  put(root, '.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs', 'process.stdout.write(JSON.stringify(process.argv.slice(2)));\n');
  const opaque = ['run', 'agent-browser', '--', '--json', '--lang', 'en', '--target', 'example.test'];
  const result = spawnSync(process.execPath, [bin, '--json', '--target', root, 'tools', ...opaque], { encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.command, 'tools'); assert.equal(value.language, 'pt');
  assert.equal(value.target, root); assert.deepEqual(JSON.parse(value.toolOutput), opaque);
});

for (const [language, wording] of [['pt', /pode ter deixado/i], ['en', /may have left/i], ['es', /puede haber dejado/i]]) for (const format of ['json', 'humano']) {
  test(`falha de tools preserva saída e não recomenda nova mutação (${language}, ${format})`, t => {
    const root = fixture(t);
    put(root, '.pbai4devs/state/agentdevkit.json', JSON.stringify({ schemaVersion: 1, version: packageInfo.version, language, clients: ['codex'], files: {}, blocks: {} }));
    put(root, '.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs', 'import { writeFileSync } from "node:fs";\nwriteFileSync("tool-output.tmp", "parcial\\n");\nconsole.log("erro sintético da ferramenta");\nprocess.exit(17);\n');
    put(root, '.gitignore', '# regra humana\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
    const index = readFileSync(join(root, '.git/index')), ignore = readFileSync(join(root, '.gitignore'));
    const args = ['--target', root, '--lang', language, ...(format === 'json' ? ['--json'] : []), 'tools', 'setup'];
    const result = spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8', timeout: 60000 });
    assert.equal(result.status, 17, result.stdout + result.stderr);
    assert.equal(readFileSync(join(root, 'tool-output.tmp'), 'utf8'), 'parcial\n');
    assert.deepEqual(readFileSync(join(root, '.git/index')), index);
    assert.deepEqual(readFileSync(join(root, '.gitignore')), ignore);
    assert.match(result.stdout, /erro sintético da ferramenta/);
    if (format === 'json') {
      const value = JSON.parse(result.stdout);
      assert.equal(value.ok, false); assert.equal(value.next.length, 1);
      assert.equal(value.next[0].stage, 'revisao'); assert.equal(value.next[0].command, undefined);
      assert.match(value.next[0].label, wording);
    } else {
      assert.match(result.stdout, wording);
      assert.doesNotMatch(result.stdout, /^\s*>.*\b(?:init|update|sync|tools)\b/m);
    }
  });
}

test("output failure after installation completed orients review the state", { timeout: 120000 }, async t => {
  const root = fixture(t); let output = '', writes = 0;
  const writer = { isTTY: false, write: chunk => { if (++writes === 1) throw new Error('falha sintética de saída'); output += chunk; } };
  const status = await cliMain(['init', '--target', root, '--agents', 'codex', '--lang', 'pt', '--yes', '--json'], { cwd: root, stdout: writer, stderr: writer, stdin: { isTTY: false } });
  assert.notEqual(status, 0);
  assert.equal(existsSync(join(root, '.pbai4devs/state/agentdevkit.json')), true);
  const value = JSON.parse(output);
  assert.equal(value.ok, false); assert.match(value.error.detail, /falha sintética de saída/);
  assert.equal(value.next.length, 1); assert.equal(value.next[0].stage, 'revisao');
  assert.equal(value.next[0].command, undefined); assert.match(value.next[0].label, /pode ter deixado/i);
});

test("help and version depend on cwd reserved, project destination and status", t => {
  const root = fixture(t), cwd = join(root, 'node_modules');
  mkdirSync(cwd);
  put(cwd, '.pbai4devs/state/agentdevkit.json', '{invalid');
  for (const [flag, command] of [['--help', 'help'], ['--version', 'version']]) {
    for (const targetArgs of [[], ['--target', join(root, '.git')]]) {
      const result = spawnSync(process.execPath, [bin, flag, '--json', '--lang', 'en', ...targetArgs], { cwd, encoding: 'utf8', timeout: 60000 });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const value = JSON.parse(result.stdout);
      assert.equal(value.ok, true); assert.equal(value.command, command);
      assert.equal(value.language, 'en'); assert.equal(value.error, undefined);
    }
  }
  assert.equal(readFileSync(join(cwd, '.pbai4devs/state/agentdevkit.json'), 'utf8'), '{invalid');
});

test("without command initializes; dry-run does not create destination; init and update are idempotent", t => {
  const root = fixture(t), target = join(root, 'new project');
  const preview = cli(target, ['init', '--dry-run', '--lang', 'en']);
  assert.ok(preview.plan.length); assert.equal(existsSync(target), false);
  const first = cli(target, ['--yes', '--lang', 'en', '--agents', 'antigravity']); assert.equal(first.command, 'init'); assert.equal(first.changed, true);
  const state = JSON.parse(readFileSync(join(target, '.pbai4devs/state/agentdevkit.json')));
  assert.equal(state.language, 'en');
  for (const name of ['skills', 'agents', 'rules']) assert.ok(state.files[`.agents/${name}.json`]);
  const generatedReadme = readFileSync(join(target, 'README.md'), 'utf8');
  assert.match(generatedReadme, /^---\ndescription: .+\nlanguage: en\n---\n\n# Project\n/);
  assert.match(generatedReadme, /\n## Prerequisites\n/);
  assert.match(generatedReadme, /https:\/\/nodejs\.org\/en\/download/);
  assert.equal(cli(target, ['init', '--yes']).changed, false);
  assert.equal(cli(target, ['update']).changed, false);
  assert.equal(cli(target, ['doctor']).ok, true);
  assert.equal(cli(target, ['sync', '--check']).ok, true);
});

test("preserves README, settings, workflow and native user skill including with force", t => {
  const root = fixture(t);
  const custom = { 'README.md': '# Human project\n', '.vscode/settings.json': '{"human":true}', '.github/workflows/ci.yml': 'name: human\n', '.claude/skills/custom/SKILL.md': '# Human skill\n', 'AGENTS.md': '# Human rules\n\nKeep this.\n', '.gitignore': 'human-output/\n' };
  for (const [path, content] of Object.entries(custom)) put(root, path, content);
  cli(root, ['init', '--yes']); cli(root, ['update', '--force']);
  for (const [path, content] of Object.entries(custom)) {
    const current = readFileSync(join(root, path), 'utf8');
    if (['AGENTS.md', '.gitignore'].includes(path)) assert.ok(current.startsWith(content));
    else assert.equal(current, content);
  }
  put(root, 'AGENTS.md', `# Extra human rule\n${readFileSync(join(root, 'AGENTS.md'), 'utf8')}`);
  assert.equal(cli(root, ['doctor']).ok, true);
});

test("managed file with human edition is preserved even with force", t => {
  const root = fixture(t); cli(root, ['init', '--yes']);
  const path = '.pbai4devs/skills/projeto/criar-skill/SKILL.md';
  const custom = `${readFileSync(join(root, path), 'utf8')}\nCustomização humana.\n`; put(root, path, custom);
  for (const args of [['update'], ['update', '--force'], ['sync']]) {
    const result = cli(root, args);
    assert.ok(result.preserved.some(item => item.path === path), args.join(' '));
    assert.equal(readFileSync(join(root, path), 'utf8'), custom);
    assert.equal(Object.hasOwn(JSON.parse(readFileSync(join(root, '.pbai4devs/state/agentdevkit.json'))).files, path), false);
  }
});

test("migration preserves notes without ownership and clears only the proven legacy", t => {
  const root = fixture(t); cli(root, ['init', '--yes', '--agents', 'codex']);
  const grouped = '.codex/skills/projeto/configurar-projeto/SKILL.md';
  const native = readFileSync(join(root, '.agents/skills/projeto/configurar-projeto/SKILL.md'), 'utf8');
  put(root, grouped, native);
  const pointer = native.replace('../../../../.pbai4devs/', '../../../.pbai4devs/');
  put(root, '.codex/skills/configurar-projeto/SKILL.md', pointer);
  put(root, '.codex/skills/retained/SKILL.md', pointer);
  mkdirSync(join(root, '.codex/skills/retained/user-empty'), { recursive: true });
  for (const path of ['.codex/skills/user-empty', '.codex/agents/unrelated-empty', '.codex/own-empty']) mkdirSync(join(root, path), { recursive: true });
  put(root, '.codex/skills/custom/SKILL.md', '# User skill\n');
  put(root, '.pbai4devs/adapters/README.md', '# Adaptadores\n\nAntigravity\n');
  mkdirSync(join(root, '.pbai4devs/adapters/antigravity'), { recursive: true });
  cli(root, ['sync']);
  assert.ok(existsSync(join(root, '.codex/skills/configurar-projeto')));
  assert.equal(readFileSync(join(root, '.pbai4devs/adapters/README.md'), 'utf8'), '# Adaptadores\n\nAntigravity\n');
  assert.ok(existsSync(join(root, '.pbai4devs/adapters/antigravity')));
  assert.ok(existsSync(join(root, grouped)));
  assert.ok(existsSync(join(root, '.codex/skills/retained/SKILL.md')));
  for (const path of ['.codex', '.codex/skills', '.codex/skills/user-empty', '.codex/skills/retained/user-empty', '.codex/agents/unrelated-empty', '.codex/own-empty']) assert.ok(existsSync(join(root, path)), path);
  assert.equal(readFileSync(join(root, '.codex/skills/custom/SKILL.md'), 'utf8'), '# User skill\n');
  cli(root, ['update', '--force']);
  assert.ok(existsSync(join(root, '.codex/skills/user-empty')));
});

test("language persists without translating user documents", t => {
  const root = fixture(t); put(root, 'README.md', '# My product\n'); cli(root, ['init', '--yes']);
  assert.equal(cli(root, ['language', 'es']).language, 'es');
  assert.equal(cli(root, ['lang']).language, 'es');
  assert.match(readFileSync(join(root, 'AGENTS.md'), 'utf8'), /español/);
  assert.equal(readFileSync(join(root, 'README.md'), 'utf8'), '# My product\n');
});

test('link simbolico no destino nao e seguido', t => {
  const root = fixture(t), outside = join(root, 'outside'), target = join(root, 'target'); mkdirSync(join(outside, 'existing'), { recursive: true });
  try { symlinkSync(outside, target, 'dir'); } catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('No symlink privilege'); return; } throw error; }
  const result = cli(target, ['init', '--yes'], 1); assert.equal(result.error.code, 'E_TARGET'); assert.equal(existsSync(join(outside, '.pbai4devs')), false);
  const nested = cli(join(target, 'existing', 'new'), ['init', '--yes'], 1);
  assert.equal(nested.error.code, 'E_TARGET'); assert.equal(existsSync(join(outside, 'existing/new')), false);
});

test('a file in the target route is reported as an invalid target', t => {
  const root = fixture(t), existing = join(root, 'existing.txt');
  writeFileSync(existing, 'project content\n');
  const result = cli(join(existing, 'nested'), ['init', '--yes', '--dry-run'], 1);
  assert.equal(result.error.code, 'E_TARGET');
  assert.equal(readFileSync(existing, 'utf8'), 'project content\n');
});

test("temporary variables do not authorize human link in destination", t => {
  const root = fixture(t), real = join(root, 'real'), link = join(root, 'user-link');
  mkdirSync(join(real, 'existing'), { recursive: true });
  try { symlinkSync(real, link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip('No symlink privilege'); return; } throw error; }
  const keys = ['TMPDIR', 'TEMP', 'TMP'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    for (const key of keys) process.env[key] = join(link, 'existing');
    assert.throws(() => resolveTarget(join(link, 'existing', 'new')), { code: 'E_TARGET' });
    const result = cli(join(link, 'existing', 'new'), ['init', '--yes', '--dry-run'], 1);
    assert.equal(result.error.code, 'E_TARGET');
    assert.equal(existsSync(join(real, 'existing', 'new')), false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("macOS only accepts temporary system aliases, preserving Git and refusing internal links", { skip: process.platform !== 'darwin' ? 'A fixture verifica os aliases físicos dos diretórios de sistema do macOS.' : false }, t => {
  const root = mkdtempSync('/private/tmp/adk-system-alias-');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const logical = join('/tmp', basename(root));
  assert.equal(resolveTarget(logical), root);
  assert.equal(resolveTarget(join(logical, 'new')), join(root, 'new'));
  assert.throws(() => resolveTarget(join(logical, '.GIT', 'new')), { code: 'E_TARGET' });

  const absent = cli(join(logical, 'new'), ['init', '--yes', '--dry-run', '--agents', 'codex']);
  assert.equal(absent.ok, true);
  assert.equal(existsSync(join(root, 'new')), false);
  assert.equal(cli(join(logical, 'new'), ['init', '--yes', '--agents', 'codex']).ok, true);
  assert.ok(existsSync(join(root, 'new', '.pbai4devs', 'state', 'agentdevkit.json')));

  const projectRoot = join(root, 'project'); mkdirSync(projectRoot);
  assert.equal(spawnSync('git', ['init', '--quiet', projectRoot]).status, 0);
  const original = '# Instrução humana\n', ignored = 'node_modules/\n';
  writeFileSync(join(projectRoot, 'AGENTS.md'), original);
  writeFileSync(join(projectRoot, '.gitignore'), ignored);
  assert.equal(spawnSync('git', ['-C', projectRoot, 'add', 'AGENTS.md', '.gitignore']).status, 0);
  const index = readFileSync(join(projectRoot, '.git', 'index'));
  assert.equal(cli(join(logical, 'project'), ['init', '--yes', '--agents', 'codex']).ok, true);
  assert.ok(readFileSync(join(projectRoot, 'AGENTS.md'), 'utf8').startsWith(original));
  assert.equal(readFileSync(join(projectRoot, '.gitignore'), 'utf8'), ignored);
  assert.deepEqual(readFileSync(join(projectRoot, '.git', 'index')), index);
  assert.ok(existsSync(join(projectRoot, '.agents', 'skills')));

  const outside = join(root, 'outside'), link = join(root, 'link'); mkdirSync(outside);
  symlinkSync(outside, link, 'dir');
  assert.throws(() => resolveTarget(join(logical, 'link', 'nested')), { code: 'E_TARGET' });
  assert.equal(existsSync(join(outside, 'nested')), false);

  const systemTemp = tmpdir();
  if (systemTemp === '/var/folders' || systemTemp.startsWith('/var/folders/')) {
    const temporaryRoot = mkdtempSync(join(systemTemp, 'adk-system-alias-'));
    t.after(() => rmSync(temporaryRoot, { recursive: true, force: true }));
    assert.equal(resolveTarget(temporaryRoot), realpathSync(temporaryRoot));
  }
});

test("macOS refuses system aliases with owner or unexpected destination", { skip: process.platform !== 'darwin' ? 'A fixture verifica os aliases físicos dos diretórios de sistema do macOS.' : false }, () => {
  const modulePath = join(project, 'src', 'install.mjs');
  const script = `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    import { pathToFileURL } from 'node:url';
    const originalStat = fs.lstatSync, originalRealpath = fs.realpathSync;
    const mode = process.argv[2];
    fs.lstatSync = (path, ...options) => {
      const result = originalStat(path, ...options);
      if (path === '/tmp' && mode === 'owner') result.uid = 501;
      if (path === '/private/tmp' && mode === 'destination-owner') result.uid = 501;
      return result;
    };
    fs.realpathSync = (path, ...options) => {
      if (path === '/tmp' && mode === 'destination') return '/private/var';
      if (path === '/tmp' && mode === 'missing') throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      return originalRealpath(path, ...options);
    };
    syncBuiltinESMExports();
    const { resolveTarget } = await import(pathToFileURL(process.argv[1]).href);
    try { resolveTarget('/tmp/adk-spoof-test/new'); process.exitCode = 1; }
    catch (error) { if (error.code !== 'E_TARGET') throw error; }
  `;
  for (const mode of ['owner', 'destination-owner', 'destination', 'missing']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script, modulePath, mode], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${mode}: ${result.stderr}`);
  }
});

test("reserved destinations are rejected in any box without writing in Git", t => {
  const root = fixture(t);
  for (const name of ['.git', '.GIT', '.Git', 'node_modules', 'NODE_MODULES', 'Node_Modules', '.pbai4devs', '.PBAI4DEVS', '.PbAi4Devs']) {
    const existed = existsSync(join(root, name));
    assert.throws(() => resolveTarget(join(name, 'nested'), root), { code: 'E_TARGET' }, name);
    assert.equal(existsSync(join(root, name)), existed);
  }
  mkdirSync(join(root, 'existing'));
  assert.throws(() => resolveTarget('existing/../.GIT', root), { code: 'E_TARGET' });
});

test("Missing destinations under the root keep name and order without creating directories", () => {
  const root = parse(project).root, suffix = randomUUID();
  for (const name of [`adk-uncreated-probe-${suffix}`, `tmp-adk-uncreated-${suffix}`]) {
    const first = join(root, name), child = join(first, 'child'), nested = join(child, 'nested');
    assert.equal(existsSync(first), false);
    assert.equal(resolveTarget(child), join(realpathSync(root), name, 'child'));
    assert.equal(resolveTarget(nested), join(realpathSync(root), name, 'child', 'nested'));
    assert.throws(() => resolveTarget(join(first, '.GIT', 'nested')), { code: 'E_TARGET' });
    assert.equal(existsSync(first), false);
  }
});

test('entrada CLI funciona por symlink npm sem executar ao ser importada', t => {
  const root = fixture(t), entry = join(root, 'agentdevkit');
  try { symlinkSync(bin, entry, 'file'); } catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('No symlink privilege'); return; } throw error; }
  const result = spawnSync(process.execPath, [entry, '--version', '--json', '--target', root], { encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).version, packageInfo.version);
  const imported = spawnSync(process.execPath, ['--input-type=module', '-e', 'await import(process.argv[1]);', new URL('../bin/agentdevkit.mjs', import.meta.url).href], { encoding: 'utf8', timeout: 60000 });
  assert.equal(imported.status, 0, imported.stderr); assert.equal(imported.stdout, '');
});

test("status and catalog delete local artifacts without deleting preexisting files", t => {
  const root = fixture(t), base = '.pbai4devs/scripts/preparar-ferramentas/tests';
  const artifacts = ['.playwright-mcp/trace.json', 'Playwright-report/index.html', 'sessions/active.json', 'logs/debug.log', 'tmp/result.txt', 'auth.json', 'credentials.json', 'history.jsonl', '.env.production'];
  for (const path of artifacts) put(root, `${base}/${path}`, 'local-only');
  const fixturePath = `${base}/fixtures/cache/input.txt`; put(root, fixturePath, 'fixture');
  cli(root, ['init', '--yes']);
  const state = JSON.parse(readFileSync(join(root, '.pbai4devs/state/agentdevkit.json'))), catalog = readFileSync(join(root, '.pbai4devs/catalog.json'), 'utf8');
  for (const path of artifacts) {
    assert.equal(state.files[`${base}/${path}`], undefined);
    assert.equal(catalog.includes(`${base}/${path}`), false, path);
    assert.equal(readFileSync(join(root, base, path), 'utf8'), 'local-only');
  }
  assert.equal(readFileSync(join(root, fixturePath), 'utf8'), 'fixture');
  assert.ok(catalog.includes(fixturePath));
});

test('proximo passo em texto mostra a skill e a instrucao contextual', t => {
  const root = fixture(t); cli(root, ['init', '--yes']);
  const expected = cli(root, ['next']);
  const result = spawnSync(process.execPath, [bin, 'next', '--target', root], { encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const step of expected.next) {
    if (step.skill) assert.ok(result.stdout.includes(step.skill));
    if (step.instruction) assert.ok(result.stdout.includes(step.instruction));
  }
});

test("human output summarizes changes and limits the plan while JSON remains complete", t => {
  const root = fixture(t);
  const preview = spawnSync(process.execPath, [bin, 'init', '--dry-run', '--yes', '--target', root], { encoding: 'utf8', timeout: 180000 });
  assert.equal(preview.status, 0, `init --dry-run: ${preview.error?.stack || ''}\nsignal: ${preview.signal || 'none'}\n${preview.stdout || ''}${preview.stderr || ''}`);
  assert.match(preview.stdout, /Arquivos: \d+ criar, \d+ atualizar, 0 remover/);
  assert.match(preview.stdout, /use --json para o plano completo/);
  assert.equal(preview.stdout.split('\n').filter(line => /^  criar /.test(line)).length, 12);
  const json = cli(root, ['init', '--dry-run', '--yes']); assert.ok(json.plan.length > 12);
  const installed = spawnSync(process.execPath, [bin, 'init', '--yes', '--target', root], { encoding: 'utf8', timeout: 180000 });
  assert.equal(installed.status, 0, `init: ${installed.error?.stack || ''}\nsignal: ${installed.signal || 'none'}\n${installed.stdout || ''}${installed.stderr || ''}`);
  assert.match(installed.stdout, /Arquivos: \d+ criar/);
  assert.match(installed.stdout, /\[ Próximo passo \]/);
  assert.equal(installed.stdout.split('\n').filter(line => /^  criar /.test(line)).length, 0);
  assert.ok(installed.stdout.split('\n').length < 25);
});

test("automatic bootstrap preserves arguments and status without installing tools", async () => {
  const calls = []; const runtime = resolve(project, 'fake-node24');
  const code = await run(['init', '--target', 'a b', '--json'], { nodeVersion: '22.0.0', ensureRuntime: async options => { assert.equal(options.root, project); return { node: runtime }; }, spawn(file, args) { calls.push({ file, args }); return { status: 7 }; } });
  assert.equal(code, 7); assert.equal(calls[0].file, runtime);
  assert.deepEqual(calls[0].args.slice(1), ['init', '--target', 'a b', '--json']);
  let output = '';
  assert.equal(await run(['--json'], { nodeVersion: '22.0.0', ensureRuntime: async () => { throw new Error('offline'); }, stdout: { write: value => { output += value; } } }), 1);
  assert.equal(JSON.parse(output).ok, false); assert.ok(JSON.parse(output).next.length);
});

test('falha no bootstrap respeita idioma e separador de argumentos', async () => {
  const runtime = process.platform === 'win32' ? 'Node.js 24.13.1+ (LTS)' : 'Node.js 24+';
  const messages = {
    pt: `Não foi possível preparar ${runtime}.`,
    en: `Could not prepare ${runtime}.`,
    es: `No se pudo preparar ${runtime}.`,
  };
  for (const [args, language, json] of [
    [['init', '--target', 'en', '--lang', 'es', '--json'], 'es', true],
    [['init', '--lang', 'en', '--lang', 'ES', '--json'], 'es', true],
    [['lang', 'en', '--json'], 'en', true],
    [['tools', 'run', '--intent', '--lang', 'en', '--json'], 'en', true],
    [['lang', 'en', '--lang', 'es', '--help', '--json'], 'es', true],
    [['tools', 'run', '--', '--lang', 'en', '--json'], 'pt', false],
  ]) {
    let output = '';
    const status = await run(args, { nodeVersion: '22.0.0', ensureRuntime: async () => { throw new Error('offline'); }, stdout: { write: value => { output += value; } } });
    assert.equal(status, 1);
    if (json) {
      const diagnostic = JSON.parse(output);
      assert.equal(diagnostic.language, language);
      assert.equal(diagnostic.message, messages[language]);
      assert.equal(diagnostic.next[0].label, runtime);
    } else {
      assert.equal(output.split('\n', 1)[0], messages[language]);
    }
  }
});
