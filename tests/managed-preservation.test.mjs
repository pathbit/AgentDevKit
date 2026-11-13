import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { mergeManagedContent } from '../.pbai4devs/scripts/lib/managed-content.mjs';
import { mergeTomlContent } from '../.pbai4devs/scripts/lib/managed-toml.mjs';
import { planLocalIgnore, applyLocalIgnore, checkLocalIgnore } from '../.pbai4devs/scripts/lib/gitignore.mjs';
import { checkManagedBlocks } from '../.pbai4devs/scripts/verificar-recursos/SCRIPT.mjs';

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'agentdevkit-preservation-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (path, text) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
  const git = (...args) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  return { root, put, git };
}

test('ignore local cobre clientes; opt-in preserva instrucoes, indice e privacidade', t => {
  const { root, put, git } = fixture(t);
  assert.equal(git('init', '--quiet').status, 0);
  put('.claude/skills/minha-skill/SKILL.md', '# Minha skill\n');
  assert.equal(git('add', '.claude/skills/minha-skill/SKILL.md').status, 0);
  const index = git('ls-files', '--stage', '-z').stdout;
  const outputs = ['.claude/skills/kit/SKILL.md', '.agents/agents/kit.md'];
  applyLocalIgnore(planLocalIgnore(root, { outputs }));
  assert.equal(checkLocalIgnore(planLocalIgnore(root, { outputs })).ok, true);
  for (const path of [...outputs, '.agent-tests/result.json', '.PLAYWRIGHT-MCP/report.txt', '.claude/auth.json', '.claude/settings.local.json', '.claude/.LOCAL/cache', '.claude/nested/CREDENTIALS.JSON']) assert.equal(git('check-ignore', '--no-index', path).status, 0, path);
  for (const path of ['.claude/skills/minha-skill/SKILL.md', '.claude/settings.json', '.agents/agents/meu-agente.md', '.claude/.env.example']) assert.equal(git('check-ignore', '--no-index', path).status, 0, path);
  assert.equal(git('check-ignore', '--no-index', 'src/auth.json').status, 1);
  put('.gitignore', '!/.claude/\n!/.agents/\n');
  applyLocalIgnore(planLocalIgnore(root, { outputs }));
  for (const path of ['.claude/skills/minha-skill/SKILL.md', '.claude/settings.json', '.agents/agents/meu-agente.md', '.claude/.env.example']) assert.equal(git('check-ignore', '--no-index', path).status, 1, path);
  for (const path of ['.claude/auth.json', '.claude/settings.local.json', '.claude/.LOCAL/cache']) assert.equal(git('check-ignore', '--no-index', path).status, 0, path);
  assert.equal(git('ls-files', '--stage', '-z').stdout, index);
});

test('migracao preserva regras humanas e permite opt-in de pasta inteira', t => {
  const { root, put, git } = fixture(t);
  assert.equal(git('init', '--quiet').status, 0);
  const original = planLocalIgnore(root, { outputs: ['.claude/skills/kit/SKILL.md'] });
  writeFileSync(join(root, '.git/info/exclude'), `# Regra humana\nminha-pasta/\n${original.first}\n/.claude/\n${original.last}\n`);
  applyLocalIgnore(planLocalIgnore(root, { outputs: ['.claude/skills/kit/SKILL.md'] }));
  assert.equal(git('check-ignore', '.claude/settings.json').status, 0);
  assert.equal(git('check-ignore', '.claude/skills/kit/SKILL.md').status, 0);
  assert.ok(readFileSync(join(root, '.git/info/exclude'), 'utf8').startsWith('# Regra humana\nminha-pasta/\n'));
  put('.gitignore', '!/.claude/\n');
  applyLocalIgnore(planLocalIgnore(root, { outputs: ['.claude/skills/kit/SKILL.md'] }));
  assert.equal(git('check-ignore', '.claude/settings.json').status, 1);
  assert.equal(git('check-ignore', '.claude/skills/kit/SKILL.md').status, 1);
  assert.ok(readFileSync(join(root, '.git/info/exclude'), 'utf8').startsWith('# Regra humana\nminha-pasta/\n'));
});

test('gitignore humano nao desativa protecao de credenciais locais do cliente', t => {
  const { root, put, git } = fixture(t);
  assert.equal(git('init', '--quiet').status, 0);
  put('.claude/.gitignore', '# Regras humanas\nminha-pasta/\n');
  for (const path of ['.claude/auth.json', '.claude/private.local.json', '.claude/.LOCAL/cache/data']) put(path, 'private fixture\n');
  applyLocalIgnore(planLocalIgnore(root, { outputs: [] }));
  for (const path of ['.claude/auth.json', '.claude/private.local.json', '.claude/.LOCAL/cache/data']) assert.equal(git('check-ignore', '--no-index', path).status, 0, path);
  assert.equal(readFileSync(join(root, '.claude/.gitignore'), 'utf8'), '# Regras humanas\nminha-pasta/\n');
});

test('projeto aninhado preserva exemplos publicos e isola regras privadas', t => {
  const { root, put, git } = fixture(t);
  assert.equal(git('init', '--quiet').status, 0);
  const nested = join(root, 'packages/example');
  put('packages/example/.gitignore', '!/.claude/\n');
  put('packages/example/.claude/.env.example', 'TOKEN=\n');
  put('packages/example/.claude/.env', 'private fixture\n');
  applyLocalIgnore(planLocalIgnore(nested, { outputs: ['.claude/skills/kit/SKILL.md'] }));
  assert.equal(git('check-ignore', '--no-index', 'packages/example/.claude/.env.example').status, 1);
  assert.equal(git('check-ignore', '--no-index', 'packages/example/.claude/.env').status, 0);
  assert.equal(git('check-ignore', '--no-index', 'packages/other/.claude/.env').status, 1);
});

test('probes de privacidade nao atravessam raizes nativas simbolicas', t => {
  const { root, git } = fixture(t);
  assert.equal(git('init', '--quiet').status, 0);
  const external = mkdtempSync(join(tmpdir(), 'agentdevkit-external-'));
  t.after(() => rmSync(external, { recursive: true, force: true }));
  writeFileSync(join(external, 'auth.json'), 'preserve outside\n');
  writeFileSync(join(external, '.gitignore'), '!.playwright-*/\n');
  writeFileSync(join(root, '.gitignore'), '!/.claude/.playwright-mcp/\n');
  try { symlinkSync(external, join(root, '.claude'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip('Links indisponiveis.'); return; } throw error; }
  const plan = planLocalIgnore(root, { outputs: [] });
  assert.equal(plan.artifactProbes.some(path => path.startsWith('.claude/')), false);
  assert.doesNotThrow(() => applyLocalIgnore(plan));
  const unsafe = planLocalIgnore(root, { outputs: ['.claude/skills/kit.md'] });
  assert.ok(checkLocalIgnore(unsafe).missing.includes('.claude/skills/kit.md'));
  assert.throws(() => applyLocalIgnore(unsafe), /Regras humanas/);
  assert.equal(readFileSync(join(external, 'auth.json'), 'utf8'), 'preserve outside\n');
  assert.equal(readFileSync(join(external, '.gitignore'), 'utf8'), '!.playwright-*/\n');
});

test('probe planejado e novamente validado se uma pasta virar link', t => {
  const { root, git } = fixture(t); assert.equal(git('init', '--quiet').status, 0);
  const external = mkdtempSync(join(tmpdir(), 'agentdevkit-race-'));
  t.after(() => rmSync(external, { recursive: true, force: true }));
  mkdirSync(join(root, '.claude/logs'), { recursive: true });
  const plan = planLocalIgnore(root);
  renameSync(join(root, '.claude/logs'), join(root, '.claude/logs-original'));
  try { symlinkSync(external, join(root, '.claude/logs'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip('Links indisponiveis.'); return; } throw error; }
  assert.doesNotThrow(() => checkLocalIgnore(plan));
  assert.doesNotThrow(() => applyLocalIgnore(plan));
});

test('excecao de diretorio nao atravessa juncao dentro do cliente', t => {
  const { root, git } = fixture(t);
  assert.equal(git('init', '--quiet').status, 0);
  const external = mkdtempSync(join(tmpdir(), 'agentdevkit-child-'));
  t.after(() => rmSync(external, { recursive: true, force: true }));
  writeFileSync(join(external, 'auth.json'), 'externo\n');
  mkdirSync(join(root, '.claude'));
  writeFileSync(join(root, '.gitignore'), '!/.claude/logs/\n');
  try { symlinkSync(external, join(root, '.claude/logs'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip('Links indisponiveis.'); return; } throw error; }
  const plan = planLocalIgnore(root);
  assert.equal(plan.artifactProbes.some(path => path.startsWith('.claude/logs/')), false);
  assert.doesNotThrow(() => applyLocalIgnore(plan));
  assert.equal(readFileSync(join(external, 'auth.json'), 'utf8'), 'externo\n');
});

test('verificador confere apenas nosso bloco e nao impoe metadados ao Markdown humano', t => {
  const { root, put } = fixture(t);
  put('.pbai4devs/skills/demo/SKILL.md', '# Fonte\n');
  const mixed = mergeManagedContent('Texto humano sem H1 ou YAML.\n[Link particular](inexistente.md)\n', 'Leia [origem](../../../.pbai4devs/skills/demo/SKILL.md).');
  put('.claude/skills/demo/SKILL.md', mixed.text);
  assert.doesNotThrow(() => checkManagedBlocks(root, { '.claude/skills/demo/SKILL.md': mixed.sha256 }));
  put('.claude/skills/demo/SKILL.md', mixed.text.replace('Leia [origem]', 'Outra [origem]'));
  assert.throws(() => checkManagedBlocks(root, { '.claude/skills/demo/SKILL.md': mixed.sha256 }));
});

test('verificador resolve inclusao Gemini pela raiz do projeto', t => {
  const { root, put } = fixture(t);
  put('.pbai4devs/commands/demo/COMMAND.md', '# Fonte\n');
  const mixed = mergeTomlContent('description = "Meu comando"\nprompt = "Minha instrucao"\n', '@{.pbai4devs/commands/demo/COMMAND.md}');
  put('.gemini/commands/demo.toml', mixed.text);
  assert.doesNotThrow(() => checkManagedBlocks(root, { '.gemini/commands/demo.toml': mixed.sha256 }));
});

test('verificador trata inclusao Markdown do Antigravity como link', t => {
  const { root, put } = fixture(t);
  put('.pbai4devs/rules/demo/RULE.md', '# Regra\n');
  const mixed = mergeManagedContent('# Regra humana\n', '@[origem](../../.pbai4devs/rules/demo/RULE.md)');
  put('.agent/rules/demo.md', mixed.text);
  assert.doesNotThrow(() => checkManagedBlocks(root, { '.agent/rules/demo.md': mixed.sha256 }));
});
