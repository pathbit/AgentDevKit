import { fixture, cli } from './managed-content-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs, { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import { applyPlan, planInstallation } from '../src/install.mjs';
import { extractManagedBlock } from '../.pbai4devs/scripts/lib/managed-content.mjs';

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
      : value.includes('/stage/AGENTS.md.agentdevkit-');
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

test('falha do instalador conserva edição humana, identidade e backup', t => {
  const { root, put, read } = fixture(t);
  const path = join(root, 'AGENTS.md'), original = '# Minhas instruções\n', human = '# Alteração humana\n';
  put('AGENTS.md', original);
  const plan = planInstallation({ target: root, clients: ['claude'] });
  const failure = new Error('Falha depois da gravação do AgentDevKit.');
  let edited;
  plan.changes.push({ path: 'injected-failure.txt', action: 'create', beforeHash: null, get content() {
    assert.match(read('AGENTS.md'), /BEGIN AGENTDEVKIT/);
    writeFileSync(path, human);
    edited = statSync(path, { bigint: true });
    throw failure;
  } });
  assert.throws(() => applyPlan(plan), error => error === failure);
  assert.throws(() => applyPlan(plan), error => error.code === 'E_RECOVERY_PENDING');
  assert.equal(read('AGENTS.md'), human);
  const previous = JSON.parse(readFileSync(join(failure.recovery.backup, 'manifest.json'))).entries.find(entry => entry.path === 'AGENTS.md');
  assert.equal(readFileSync(join(failure.recovery.backup, 'blobs', previous.blob), 'utf8'), original);
  const remaining = statSync(path, { bigint: true });
  assert.equal(remaining.ino, edited.ino); assert.equal(remaining.dev, edited.dev); assert.equal(remaining.mode, edited.mode);
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
