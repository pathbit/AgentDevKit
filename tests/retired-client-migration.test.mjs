import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { cli, fixture, put, read, state, statePath } from './fixtures/client-selection-helpers.mjs';
import { stripTomlContent } from '../.pbai4devs/scripts/lib/managed-toml.mjs';
import { mergeTomlContent } from './fixtures/legacy-toml-writer.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');

function legacyState(root, clients) {
  const metadata = state(root);
  const generated = '.gemini/commands/owned.toml';
  const retained = '.gemini/commands/team.toml';
  const mixed = '.gemini/commands/mixed.toml';
  const antigravityConfig = '.gemini/config.json';
  const config = '{"personal_customization_dir":"people/{user}"}\n';
  const own = 'description = "Instrução da equipe"\nprompt = "Revise o histórico."\n';
  const text = mergeTomlContent(own, '@{.pbai4devs/commands/revisar-entrega/COMMAND.md}\n\n{{args}}');
  const generatedText = 'prompt = "Referência gerenciada"\n';
  put(root, generated, generatedText);
  put(root, retained, own);
  put(root, mixed, text.text);
  put(root, antigravityConfig, config);
  metadata.clients = clients;
  metadata.files[generated] = digest(generatedText);
  metadata.blocks[mixed] = text.sha256;
  put(root, statePath, JSON.stringify(metadata));
  const added = spawnSync('git', ['-C', root, 'add', '-f', '--', retained, antigravityConfig], { encoding: 'utf8' });
  assert.equal(added.status, 0, added.stderr);
  return { generated, retained, mixed, own, antigravityConfig, config, restored: stripTomlContent(text.text, text.sha256) };
}

test('Gemini CLI não integra instalações novas nem aparece em agents', { timeout: 120000 }, t => {
  const root = fixture(t);
  const available = cli(root, ['agents']).availableClients;
  assert.ok(!available.some(client => client.id === 'gemini'));
  assert.equal(cli(root, ['init', '--agents', 'gemini'], 2).error.code, 'E_ARGS');
  cli(root, ['init', '--agents', 'all']);
  assert.ok(!existsSync(join(root, '.gemini')));
  assert.ok(existsSync(join(root, 'GEMINI.md')), 'Antigravity mantém a sua entrada');
});

test('sync direto orienta a atualização de manifesto gerado antigo', { timeout: 120000 }, t => {
  const root = fixture(t);
  cli(root, ['init', '--agents', 'codex']);
  const { generated } = legacyState(root, ['gemini']);
  const manifest = '.pbai4devs/espelhos.conf';
  const old = '# Gerado por AgentDevKit; sincronizacao instalada.\nagente|.gemini|agrupado\n';
  put(root, manifest, old);
  const direct = '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
  for (const config of [old, 'agente|.gemini|agrupado\n', null]) {
    if (config === null) unlinkSync(join(root, manifest));
    else put(root, manifest, config);
    const result = spawnSync(process.execPath, [join(root, direct), '--root', root], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /agentdevkit update --dry-run/);
    assert.ok(existsSync(join(root, generated)));
    assert.equal(existsSync(join(root, manifest)), config !== null);
    if (config !== null) assert.equal(read(root, manifest), config);
  }
});

test('sync direto de instalação atual não reativa Gemini em manifesto manual', { timeout: 120000 }, t => {
  const root = fixture(t);
  cli(root, ['init', '--agents', 'codex']);
  const manifest = '.pbai4devs/espelhos.conf';
  const script = '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
  for (const custom of ['agente|.gemini|agrupado\n', 'agente|.Gemini|agrupado\n', 'agente|.codex|agrupado\ngitignore|.Gemini\n']) {
    put(root, manifest, custom);
    const result = spawnSync(process.execPath, [join(root, script), '--root', root], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /agentdevkit update --dry-run/);
    assert.equal(read(root, manifest), custom);
    for (const path of ['.gemini', '.Gemini']) assert.equal(existsSync(join(root, path)), false, path);
  }
  assert.equal(cli(root, ['agents', 'add', 'gemini'], 2).error.code, 'E_ARGS');
});

for (const clients of [['gemini'], ['codex', 'gemini']]) {
  test(`atualiza a seleção legada ${clients.join(',')}`, { timeout: 120000 }, t => {
    const root = fixture(t);
    cli(root, ['init', '--agents', 'codex']);
    const { generated, retained, mixed, own, antigravityConfig, config, restored } = legacyState(root, clients);
    const index = readFileSync(join(root, '.git/index'));
    const previous = read(root, statePath);
    const onlyRetired = clients.length === 1;
    const selectionInfo = cli(root, ['agents']);
    assert.deepEqual(selectionInfo.clients, onlyRetired ? [] : ['codex']);
    const destination = onlyRetired ? 'antigravity' : 'codex';
    const selection = onlyRetired ? ['--agents', destination] : [];
    if (onlyRetired) {
      assert.equal(cli(root, ['agents', 'remove', 'codex', '--dry-run'], 1).error.code, 'E_CLIENTS_RETIRED');
      const blocked = cli(root, ['update', '--dry-run'], 1);
      assert.equal(blocked.error.code, 'E_CLIENTS_RETIRED');
      assert.match(blocked.message, /update --agents/);
      assert.match(blocked.next[0].command, /\bagents\b/);
      assert.equal(blocked.warnings, undefined);
      assert.equal(selectionInfo.next[0].command, undefined);
      assert.match(selectionInfo.next[0].instruction, /update --agents/);
      const doctor = cli(root, ['doctor'], 1);
      assert.ok(doctor.issues.some(issue => issue.code === 'client-selection-retired'));
      assert.match(doctor.next[0].command, /\bagents\b/);
    }
    const preview = cli(root, ['update', '--dry-run', ...selection]);
    assert.ok(preview.plan.some(item => item.path === generated && item.action === 'remove'));
    assert.ok(!preview.plan.some(item => item.path === antigravityConfig));
    assert.equal(read(root, statePath), previous);
    cli(root, ['update', ...selection]);
    assert.deepEqual(state(root).clients, [destination]);
    if (onlyRetired) assert.ok(existsSync(join(root, 'GEMINI.md')));
    assert.equal(existsSync(join(root, generated)), false);
    assert.equal(read(root, retained), own);
    assert.equal(read(root, mixed), restored);
    assert.equal(read(root, antigravityConfig), config);
    assert.deepEqual(readFileSync(join(root, '.git/index')), index);
    assert.doesNotMatch(read(root, '.pbai4devs/espelhos.conf'), /\.gemini/);
    cli(root, ['sync', '--check']);
  });
}
