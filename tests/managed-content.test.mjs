import test from 'node:test';
import assert from 'node:assert/strict';
import fs, { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { main } from '../src/cli.mjs';
import { applyPlan, inspect, planInstallation } from '../src/install.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { extractManagedBlock, managedBlockDigest } from '../.pbai4devs/scripts/lib/managed-content.mjs';
import { extractTomlManagedBlock, tomlManagedBlockDigest } from '../.pbai4devs/scripts/lib/managed-toml.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function fixture(t) {
  mkdirSync(join(repository, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(repository, '.agent-tests/managed-content-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result.stdout;
  };
  git('init', '--quiet');
  const put = (path, content) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), content); };
  const read = path => readFileSync(join(root, path), 'utf8');
  return { root, git, put, read };
}
async function cli(root, args, expected = 0) {
  let output = '';
  assert.equal(await main([...args, '--target', root, '--json'], { stdout: { write: value => { output += value; } } }), expected, output);
  const result = JSON.parse(output); assert.equal(result.ok, expected === 0, output); return result;
}

test('entradas novas e geradas importam o nome real de agents.md', async t => {
  const { root, put, read } = fixture(t);
  put('agents.md', '# Instrucoes humanas\n');
  await cli(root, ['init', '--agents', 'claude,gemini']);
  assert.match(read('CLAUDE.md'), /^@agents\.md$/m);
  assert.match(read('GEMINI.md'), /^@\.\/agents\.md$/m);
  fs.renameSync(join(root, 'agents.md'), join(root, 'Agents.md'));
  synchronize({ root, output() {} });
  assert.match(read('CLAUDE.md'), /^@Agents\.md$/m);
  assert.match(read('GEMINI.md'), /^@\.\/Agents\.md$/m);
  assert.deepEqual(inspect(root).issues, []);
  await cli(root, ['sync']);
  await cli(root, ['doctor']);
});

test('diagnostico deixa de exigir arquivo humano depois de retirar seu bloco', async t => {
  const { root, put } = fixture(t);
  const path = '.claude/skills/local-retire/SKILL.md';
  const source = '.pbai4devs/skills/projeto/local-retire/SKILL.md';
  await cli(root, ['init', '--agents', 'claude']);
  put(source, '---\nname: local-retire\ndescription: Recurso local para retirada.\n---\n\n# Recurso local\n');
  put(path, '# Minha revisao\n');
  await cli(root, ['sync']);
  fs.rmSync(join(root, source));
  synchronize({ root, output() {} });
  const derived = JSON.parse(readFileSync(join(root, '.pbai4devs/state/derived.json'), 'utf8'));
  assert.ok(derived.removedBlocks.includes(path));
  fs.rmSync(join(root, path));
  assert.equal(inspect(root).issues.some(issue => issue.path === path), false);
});

test('entradas humanas em caixa original recebem apenas o bloco e mantêm índice, CRLF e alterações futuras', async t => {
  const { root, git, put, read } = fixture(t);
  const entries = {
    'agents.md': '\ufeff---\r\ncustom: project\r\n---\r\n\r\n# Regras humanas\r\n\r\nNão altere meu fluxo.',
    'claude.md': '# Meu Claude\r\n\r\nUse minhas ferramentas.\r\n',
    'Gemini.md': '# Meu Gemini\r\n\r\nMantenha minha configuração.\r\n',
  };
  for (const [path, content] of Object.entries(entries)) put(path, content);
  git('add', '--all'); const index = git('ls-files', '--stage', '-z');
  const args = ['init', '--agents', 'claude,gemini,codex', '--yes'];
  const preview = await cli(root, [...args, '--dry-run']);
  assert.equal(existsSync(join(root, '.pbai4devs')), false);
  assert.ok(preview.plan.some(item => item.path === 'agents.md'));
  await cli(root, args);
  const state = JSON.parse(read('.pbai4devs/state/agentdevkit.json'));
  for (const [path, content] of Object.entries(entries)) {
    assert.ok(read(path).startsWith(content), path);
    assert.equal(state.files[path], undefined);
    assert.equal(state.blocks[path], managedBlockDigest(read(path)));
    assert.equal((read(path).match(/<!-- BEGIN AGENTDEVKIT -->/g) || []).length, 1);
  }
  assert.match(extractManagedBlock(read('claude.md')), /@agents\.md/);
  assert.match(extractManagedBlock(read('Gemini.md')), /@\.\/agents\.md/);
  for (const name of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) assert.ok(!readdirSync(root).includes(name));
  assert.equal(git('ls-files', '--stage', '-z'), index);
  const stable = Object.fromEntries(Object.keys(entries).map(path => [path, read(path)]));
  assert.equal((await cli(root, ['update', '--force'])).changed, false);
  put('agents.md', `${stable['agents.md']}\r\nMinha regra posterior.\r\n`);
  const edited = read('agents.md');
  await cli(root, ['update']); await cli(root, ['doctor']); await cli(root, ['sync', '--check']);
  assert.equal(read('agents.md'), edited);
  assert.equal(git('ls-files', '--stage', '-z'), index);
});

test('skills, agentes, comandos e regras de mesmo nome mantêm metadados e só recebem referência', async t => {
  const { root, git, put, read } = fixture(t);
  const paths = {
    '.claude/skills/criar-skill/SKILL.md': '---\nname: criar-skill\ndescription: Minha definição\ncustom: true\n---\n\n# Minha skill\n\nExecute a rotina humana.\n',
    '.claude/agents/revisor.md': '---\nname: revisor\ntools: Read\n---\n\n# Meu revisor\n\nNão altere arquivos.\n',
    '.claude/commands/preparar-dev.md': '# Meu preparo\n\nPrimeiro veja meu README.\n',
    '.claude/commands/diagnosticar.md': '',
    '.cursor/rules/seguranca.mdc': '---\ndescription: Meu controle\nalwaysApply: false\n---\n\n# Minha segurança\n',
  };
  for (const [path, content] of Object.entries(paths)) put(path, content);
  git('add', '--all'); const index = git('ls-files', '--stage', '-z');
  await cli(root, ['init', '--agents', 'claude,cursor', '--yes']);
  const plan = planInstallation({ target: root, mode: 'update' });
  const state = JSON.parse(read('.pbai4devs/state/agentdevkit.json'));
  for (const [path, content] of Object.entries(paths)) {
    assert.ok(read(path).startsWith(content), path);
    assert.match(extractManagedBlock(read(path)), /\.pbai4devs\//);
    assert.equal(state.files[path], undefined, path);
    assert.equal(state.blocks[path], managedBlockDigest(read(path)), path);
    assert.ok(!plan.ownedOutputs.includes(path), path);
    assert.ok(!plan.untrack.paths.includes(path), path);
  }
  await cli(root, ['doctor']); await cli(root, ['sync', '--check']);
  await cli(root, ['agents', 'codex']);
  for (const [path, content] of Object.entries(paths)) {
    assert.ok(read(path).startsWith(content), path);
    assert.equal(extractManagedBlock(read(path)), null, path);
  }
  assert.equal(git('ls-files', '--stage', '-z'), index);
});

test('edição humana num apontamento previamente gerado migra para ownership de bloco sem desindexar', async t => {
  const { root, git, put, read } = fixture(t);
  await cli(root, ['init', '--agents', 'claude', '--yes']);
  const path = '.claude/agents/revisor.md';
  const original = read(path);
  git('add', '--force', path); const index = git('ls-files', '--stage', '-z');
  const human = `${original}\n# Meu complemento\n\nEsta regra é do usuário.\n`;
  put(path, human);
  if (process.platform !== 'win32') chmodSync(join(root, path), 0o640);
  const mode = statSync(join(root, path)).mode & 0o777;
  const result = await cli(root, ['update']);
  assert.ok(result.changed);
  assert.ok(read(path).startsWith(human));
  assert.equal(git('ls-files', '--stage', '-z'), index);
  assert.equal(statSync(join(root, path)).mode & 0o777, mode);
  const state = JSON.parse(read('.pbai4devs/state/agentdevkit.json'));
  assert.equal(state.files[path], undefined);
  assert.equal(state.blocks[path], managedBlockDigest(read(path)));
  assert.equal((await cli(root, ['update', '--force'])).changed, false);
});

test('comando Gemini existente recebe referência dentro do prompt sem reescrever configuração', async t => {
  const { root, git, put, read } = fixture(t);
  const path = '.gemini/commands/preparar-dev.toml';
  const original = '# comentário humano\r\ndescription = "Meu comando"\r\nprompt = "Siga a rotina do usuário." # comentário do prompt\r\n\r\n[metadata]\r\ncustom = true\r\n';
  put(path, original); git('add', '--all'); const index = git('ls-files', '--stage', '-z');
  await cli(root, ['init', '--agents', 'gemini', '--yes']);
  const content = read(path);
  assert.ok(content.startsWith('# comentário humano\r\ndescription = "Meu comando"\r\nprompt = '));
  assert.ok(content.endsWith(' # comentário do prompt\r\n\r\n[metadata]\r\ncustom = true\r\n'));
  assert.match(content, /Siga a rotina do usuário/);
  assert.match(extractTomlManagedBlock(content), /@\{\.pbai4devs\/commands\/preparar-dev\/COMMAND\.md\}/);
  const state = JSON.parse(read('.pbai4devs/state/agentdevkit.json'));
  assert.equal(state.files[path], undefined);
  assert.equal(state.blocks[path], tomlManagedBlockDigest(content));
  assert.equal((await cli(root, ['update'])).changed, false);
  await cli(root, ['doctor']); await cli(root, ['sync', '--check']);
  assert.equal(git('ls-files', '--stage', '-z'), index);
  await cli(root, ['agents', 'codex']);
  assert.equal(extractTomlManagedBlock(read(path)), null);
  assert.match(read(path), /Siga a rotina do usuário/);
  assert.ok(read(path).endsWith(' # comentário do prompt\r\n\r\n[metadata]\r\ncustom = true\r\n'));
});

test('standalone pode promover e retirar um bloco antes de a CLI reconciliar o estado', async t => {
  const { root, put, read } = fixture(t);
  await cli(root, ['init', '--agents', 'claude', '--yes']);
  const source = '.pbai4devs/skills/projeto/local-only/SKILL.md';
  put(source, '---\nname: local-only\ndescription: Recurso local para a verificação.\n---\n\n# Recurso local\n\nSiga esta rotina.\n');
  assert.equal(synchronize({ root, output() {} }).exitCode, 0);
  const path = '.claude/skills/local-only/SKILL.md';
  const human = `${read(path)}\n# Política humana\n\nNão remova este texto.\n`;
  put(path, human);
  assert.equal(synchronize({ root, output() {} }).exitCode, 0);
  assert.ok(read(path).startsWith(human));
  assert.ok(extractManagedBlock(read(path)));
  assert.ok(!inspect(root).issues.some(issue => issue.path === path));
  await cli(root, ['sync']);
  rmSync(join(root, source));
  assert.equal(synchronize({ root, output() {} }).exitCode, 0);
  assert.equal(extractManagedBlock(read(path)), null);
  assert.ok(read(path).startsWith(human));
  assert.ok(!inspect(root).issues.some(issue => issue.path === path));
  await cli(root, ['sync']);
  assert.ok(read(path).startsWith(human));
  assert.equal(extractManagedBlock(read(path)), null);
});

for (const mode of ['sync', 'deselect']) test(`recriação própria após remoção de arquivo misto substitui ownership antigo de bloco: ${mode}`, async t => {
  const { root, put, read } = fixture(t);
  const native = '.claude/agents/revisor.md';
  put('AGENTS.md', '# Meu projeto anterior\n'); put(native, '# Meu revisor anterior\n');
  await cli(root, ['init', '--agents', 'claude', '--yes']);
  rmSync(join(root, 'AGENTS.md')); rmSync(join(root, native));
  assert.equal(synchronize({ root, output() {} }).exitCode, 0);
  assert.deepEqual(inspect(root).issues, []);
  const check = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/verificar-recursos/SCRIPT.mjs')], { encoding: 'utf8', timeout: 180000 });
  assert.equal(check.status, 0, `verificar-recursos: ${check.error?.stack || ''}\nsignal: ${check.signal || 'none'}\n${check.stdout || ''}${check.stderr || ''}`);
  const plan = planInstallation({ target: root, mode: mode === 'sync' ? 'sync' : 'agents', ...(mode === 'deselect' ? { clients: ['codex'] } : {}) });
  assert.equal(plan.canApply, true, JSON.stringify(plan.conflicts));
  await cli(root, mode === 'sync' ? ['sync'] : ['agents', 'codex']); await cli(root, ['doctor']);
  const state = JSON.parse(read('.pbai4devs/state/agentdevkit.json'));
  for (const path of mode === 'sync' ? ['AGENTS.md', native] : ['AGENTS.md']) { assert.ok(state.files[path]); assert.equal(state.blocks[path], undefined); }
  if (mode === 'deselect') assert.equal(existsSync(join(root, native)), false);
});

test('edição humana durante o planejamento não pode entrar só no hash do snapshot', t => {
  const { root, put, read } = fixture(t);
  const path = join(root, 'AGENTS.md'), original = '# Regra humana original\n';
  put('AGENTS.md', original);
  const newer = '# Edição humana durante o planejamento\n';
  const originalRead = fs.readFileSync;
  let reads = 0;
  fs.readFileSync = (file, ...args) => {
    if (String(file) === path && ++reads === 3) writeFileSync(path, newer);
    return originalRead(file, ...args);
  };
  syncBuiltinESMExports();
  try { assert.throws(() => planInstallation({ target: root, clients: ['claude'] }), { code: 'E_CHANGED' }); }
  finally { fs.readFileSync = originalRead; syncBuiltinESMExports(); }
  assert.equal(read('AGENTS.md'), newer);
  assert.equal(existsSync(join(root, '.pbai4devs')), false);
});

for (const window of ['backup', 'temporary-write']) test(`edição humana durante ${window} impede publicação do conteúdo antigo`, t => {
  const { root, put, read } = fixture(t);
  const path = join(root, 'AGENTS.md'), original = '# Minhas instruções\n';
  put('AGENTS.md', original);
  const plan = planInstallation({ target: root, clients: ['claude'] });
  const newer = '# Alteração humana concorrente\n';
  const originalWrite = fs.writeFileSync;
  let injected = false;
  fs.writeFileSync = (file, ...args) => {
    const result = originalWrite(file, ...args);
    const value = String(file).replaceAll('\\', '/');
    const selected = window === 'backup' ? value.includes('/.agent-tests/agentdevkit/backups/') && value.endsWith('/AGENTS.md')
      : String(file).startsWith(`${path}.agentdevkit-`);
    if (!injected && selected) { injected = true; originalWrite(path, newer); }
    return result;
  };
  syncBuiltinESMExports();
  try { assert.throws(() => applyPlan(plan), { code: 'E_CHANGED' }); }
  finally { fs.writeFileSync = originalWrite; syncBuiltinESMExports(); }
  assert.equal(injected, true);
  assert.equal(read('AGENTS.md'), newer);
});

test('arquivo humano criado depois da ausência observada não é sobrescrito com force', t => {
  const { root, read } = fixture(t);
  const path = join(root, 'AGENTS.md'), human = '# Criado durante o planejamento\n';
  const originalRead = fs.readFileSync;
  let injected = false;
  fs.readFileSync = (file, ...args) => {
    const value = String(file).replaceAll('\\', '/');
    if (!injected && value.endsWith('/AGENTS.md') && value.includes('/agentdevkit-') && String(file) !== path && !value.includes('/.pbai4devs/')) {
      injected = true; writeFileSync(path, human);
    }
    return originalRead(file, ...args);
  };
  syncBuiltinESMExports();
  try { assert.throws(() => planInstallation({ target: root, clients: ['claude'], force: true }), { code: 'E_CHANGED' }); }
  finally { fs.readFileSync = originalRead; syncBuiltinESMExports(); }
  assert.equal(injected, true);
  assert.equal(read('AGENTS.md'), human);
  assert.equal(existsSync(join(root, '.pbai4devs')), false);
});

test('rollback não renomeia por cima de uma edição humana feita durante a restauração', t => {
  const { root, put, read } = fixture(t);
  const path = join(root, 'AGENTS.md'); put('AGENTS.md', '# Minhas instruções\n');
  const plan = planInstallation({ target: root, clients: ['claude'] });
  const failure = new Error('Falha depois da gravação do AgentDevKit.');
  plan.changes.push({ path: 'injected-failure.txt', action: 'create', beforeHash: null,
    get content() { throw failure; } });
  const human = '# Alteração humana durante rollback\n';
  const originalWrite = fs.writeFileSync;
  let writes = 0;
  fs.writeFileSync = (file, ...args) => {
    const result = originalWrite(file, ...args);
    if (String(file).startsWith(`${path}.agentdevkit-`) && ++writes === 2) originalWrite(path, human);
    return result;
  };
  syncBuiltinESMExports();
  try { assert.throws(() => applyPlan(plan), error => error === failure); }
  finally { fs.writeFileSync = originalWrite; syncBuiltinESMExports(); }
  assert.equal(writes, 2);
  assert.equal(read('AGENTS.md'), human);
  assert.ok(failure.rollbackPreservedPaths.includes('AGENTS.md'));
});

for (const corruption of ['alterado', 'duplicado', 'incompleto']) test(`bloco ${corruption} não é substituído nem com force`, async t => {
  const { root, put, read } = fixture(t);
  put('AGENTS.md', '# Meu projeto\n');
  await cli(root, ['init', '--agents', 'claude', '--yes']);
  const source = read('AGENTS.md');
  const broken = corruption === 'alterado' ? source.replace('Leia e siga', 'Minha alteração: leia')
    : corruption === 'duplicado' ? `${source}\n${extractManagedBlock(source)}\n`
      : source.replace('<!-- END AGENTDEVKIT -->', '<!-- fim humano -->');
  put('AGENTS.md', broken); const state = read('.pbai4devs/state/agentdevkit.json');
  for (const args of [['update'], ['update', '--force']]) {
    const result = await cli(root, args, 1);
    assert.equal(result.error.code, 'E_MANAGED_BLOCK');
    assert.equal(read('AGENTS.md'), broken);
    assert.equal(read('.pbai4devs/state/agentdevkit.json'), state);
  }
});

test('desmarcar cliente não remove um bloco adulterado nem seu arquivo humano', async t => {
  const { root, put, read } = fixture(t);
  const path = '.claude/agents/revisor.md';
  put(path, '# Meu revisor\n');
  await cli(root, ['init', '--agents', 'claude,codex', '--yes']);
  const modified = read(path).replace('Leia e siga', 'Texto humano dentro do bloco');
  put(path, modified); const before = read('.pbai4devs/state/agentdevkit.json');
  const result = await cli(root, ['agents', 'codex', '--force'], 1);
  assert.equal(result.error.code, 'E_MANAGED_BLOCK');
  assert.equal(read(path), modified);
  assert.equal(read('.pbai4devs/state/agentdevkit.json'), before);
});

test('limpeza preserva metadados humanos mesmo quando o corpo ainda parece um apontamento', async t => {
  const { root, put, read } = fixture(t);
  await cli(root, ['init', '--agents', 'claude', '--yes']);
  const source = '.pbai4devs/skills/projeto/local-known/SKILL.md';
  put(source, '---\nname: local-known\ndescription: Minha skill local.\n---\n\n# Skill local\n\nUse esta rotina.\n');
  await cli(root, ['sync']);
  const path = '.claude/skills/local-known/SKILL.md';
  const changed = read(path).replace('description: Minha skill local.', 'description: Metadado alterado pelo usuário.');
  assert.notEqual(changed, read(path));
  put(path, changed); rmSync(join(root, source));
  const plan = planInstallation({ target: root, mode: 'sync', force: true });
  assert.ok(!plan.changes.some(change => change.path === path));
  await cli(root, ['sync', '--force']);
  assert.equal(read(path), changed);
  assert.equal(JSON.parse(read('.pbai4devs/state/agentdevkit.json')).files[path], undefined);
});

test('marcador copiado em um arquivo sem ownership não autoriza sua remoção', async t => {
  const { root, put, read } = fixture(t);
  const path = '.claude/skills/existing/SKILL.md';
  const content = '---\nname: existing\ndescription: Minha definição.\n---\n\n# Minha definição\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/skills/projeto/criar-skill/SKILL.md).\n';
  put(path, content);
  await cli(root, ['init', '--agents', 'claude', '--yes']);
  await cli(root, ['update', '--force']);
  assert.equal(read(path), content);
  const state = JSON.parse(read('.pbai4devs/state/agentdevkit.json'));
  assert.equal(state.files[path], undefined); assert.equal(state.blocks[path], undefined);
});
