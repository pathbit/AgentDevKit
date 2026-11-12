import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { synchronize, header, isReference, resourcePath } from '../SCRIPT.mjs';
import { buildCatalog } from '../../lib/catalog.mjs';
import { toolWrapper } from '../../preparar-ferramentas/SCRIPT.mjs';
import { mergeGitignore, ignoreBegin, ignoreEnd, validateIgnoreClients } from '../../lib/gitignore.mjs';
import './LOCAL_IGNORE.mjs';
import './HUMAN_OWNERSHIP.mjs';
import './COEXISTENCE.mjs';
import './MANAGED_CONTENT.mjs';
import { validateCatalog as validateExternalCatalog } from '../../gerenciar-skills-externas/SCRIPT.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const cli = resolve(dirname(fileURLToPath(import.meta.url)), '../SCRIPT.mjs');
const marker = '<!-- gerado: sincronizar-agentes -->';
const skill = '---\nname: demo\ndescription: Exemplo.\n---\n\n# Demo\n\nNAO_DUPLICAR_INSTRUCOES\n';
const source = '.pbai4devs/skills/projeto/demo/SKILL.md';
const read = (root, path) => readFileSync(join(root, path), 'utf8');
const write = (root, path, content) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), content); };
const pointer = (origin = 'origem.md', title = 'Referencia') => `---\ndescription: Referencia.\n---\n\n# ${title}\n\n${marker}\nLeia e siga [origem](${origin}).\n`;
const recordOwned = (root, paths) => {
  const statePath = '.pbai4devs/estado/agentdevkit.json';
  const previous = existsSync(join(root, statePath)) ? JSON.parse(read(root, statePath)) : {};
  write(root, statePath, JSON.stringify({ schemaVersion: 1, files: { ...previous.files, ...Object.fromEntries(paths.map(path => [path, createHash('sha256').update(readFileSync(join(root, path))).digest('hex')])) }, blocks: previous.blocks ?? {} }));
};
const toolConfig = (name = 'demo') => ({ name, description: `Ferramenta ${name}.`, group: 'base', source: `https://github.com/fixture/${name}`, download: { provider: 'npm', package: name, registry: 'https://registry.npmjs.org/', repository: `fixture/${name}`, channel: 'latest' }, platforms: [`${process.platform}-${process.arch}`], scripts: { entry: 'SCRIPT.mjs' }, probe: ['--version'] });
const externalConfig = () => ({ schemaVersion: 1, allowlist: ['fixture/skills'], skills: [{ id: 'external-demo', repository: 'fixture/skills', commit: 'a'.repeat(40), path: 'skills/demo/SKILL.md', name: 'external-demo', license: 'MIT', use: 'Revisar exemplo externo.', status: 'reviewed', notes: 'Sem execução automática.' }] });
const run = (root, options = {}) => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {}, ...options });
function snapshot(root) {
  const result = [];
  function visit(folder, parent = '') {
    for (const name of readdirSync(folder).sort()) {
      const file = join(folder, name), path = parent ? `${parent}/${name}` : name, item = lstatSync(file);
      if (item.isSymbolicLink()) result.push([path, 'link', readlinkSync(file)]);
      else if (item.isDirectory()) { result.push([path, 'directory']); visit(file, path); }
      else result.push([path, 'file', createHash('sha256').update(readFileSync(file)).digest('hex')]);
    }
  }
  visit(root);
  return result;
}
function fixture(t, minimal = false) {
  mkdirSync(join(project, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(project, '.agent-tests/sync-node com espaço-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  write(root, '.pbai4devs/templates/gitignore/agents.ignore', '# Cache dos clientes\n/*\n!/.gitignore\n{{ALLOWLIST}}\n/cache/\n*.log\n');
  write(root, '.pbai4devs/templates/gitignore/clients.json', '{}\n');
  write(root, '.pbai4devs/templates/gitignore/shared.ignore', '# Estado compartilhado\n/tools/*/.local/\n/tools/.cache/\n');
  write(root, '.pbai4devs/espelhos.conf', minimal ? 'agente|.codex|plano\n' : [
    '# Clientes da fixture', 'agente|.claude', 'agente|.opencode', 'agente|.github|plano', 'agente|.codex|plano', 'agente|.cursor|plano', 'agente|.kimi-code|plano', 'agente|.vscode|plano', 'agente|.agents|plano', 'agente|.agent|plano', 'agente|.gemini|plano',
    `nativo|.github/instructions/demo.instructions.md|${source}`,
    'nativo|.kimi-code/agents/revisor.md|.pbai4devs/agents/revisor/AGENT.md|.pbai4devs/agents/revisor/kimi-code.yaml',
    'nativo|.opencode/agents/revisor/AGENT.md|.pbai4devs/agents/revisor/AGENT.md|.pbai4devs/agents/revisor/opencode.yaml',
  ].join('\n') + '\n');
  if (minimal) return root;
  const ownedLegacy = ['.opencode/agents/revisor/AGENT.md'];
  write(root, source, skill);
  write(root, '.pbai4devs/skills/grupo com espaço/outro/SKILL.md', '---\nname: outro\ndescription: Outro.\n---\n\n# Outro\n');
  write(root, '.pbai4devs/agents/revisor/AGENT.md', '---\nname: revisor\ndescription: Perfil.\n---\n\n# Revisor\n');
  write(root, '.pbai4devs/rules/example/RULE.md', '---\ntrigger: always_on\ndescription: Regra.\n---\n\n# Regra\n');
  write(root, '.pbai4devs/commands/check/COMMAND.md', '---\ndescription: Comando.\n---\n\n# Comando\n');
  write(root, '.pbai4devs/agents/revisor/kimi-code.yaml', '---\nname: revisor\ntools: [Read, Grep, Glob]\n---\n');
  write(root, '.pbai4devs/agents/revisor/opencode.yaml', '---\nmode: subagent\npermission:\n  edit: deny\n---\n');
  write(root, '.pbai4devs/adapters/antigravity/agents/revisor.md', pointer('../../../agents/revisor/AGENT.md', 'Revisor'));
  write(root, '.opencode/agents/revisor/AGENT.md', `---\nmode: subagent\npermission:\n  edit: deny\n---\n\n# Revisor\n\n${marker}\nLeia e siga [origem](../../../.pbai4devs/agents/revisor/AGENT.md).\n`);
  write(root, '.github/workflows/ci.yml', 'workflow-preservado\n');
  write(root, '.vscode/settings.json', '{"fixture":"config-preservada"}\n');
  write(root, '.vscode/extensions.json', '{"recommendations":[]}\n');
  write(root, '.codex/config.toml', 'config-native-preservada\n');
  write(root, '.github/prompts/custom.prompt.md', '# Prompt proprio\n');
  write(root, '.claude/notas.md', '# Nota propria\n');
  write(root, 'README.md', 'README raiz preservado\n');
  for (const kind of ['templates', 'scripts', 'tools', 'external-skills', 'estado', 'tests', 'docs', 'adapters', 'extra']) {
    write(root, `.pbai4devs/${kind}/demo/REFERENCE.md`, '---\ndescription: Exclusivo.\n---\n\n# Exclusivo\n');
    if (kind !== 'extra') {
      const target = `.claude/${kind}/demo/REFERENCE.md`;
      write(root, target, pointer(`../../../.pbai4devs/${kind}/demo/REFERENCE.md`)); ownedLegacy.push(target);
    }
  }
  write(root, '.pbai4devs/tools/demo/TOOL.json', JSON.stringify(toolConfig()));
  write(root, '.pbai4devs/tools/demo/SCRIPT.mjs', toolWrapper('demo'));
  for (const file of ['README.md', 'INSTRUCTIONS.md']) {
    write(root, `.pbai4devs/${file}`, '---\ndescription: Guia.\n---\n\n# Guia\n');
    write(root, `.claude/${file}`, pointer(`../.pbai4devs/${file}`, 'Guia'));
    ownedLegacy.push(`.claude/${file}`);
  }
  recordOwned(root, ownedLegacy);
  return root;
}
function rejected(root, options = {}, pattern) {
  const before = snapshot(root);
  assert.throws(() => run(root, options), pattern);
  assert.deepEqual(snapshot(root), before, 'Uma operação rejeitada alterou a fixture.');
}
function assertCheckReadonly(root, options = {}, exitCode = 1) {
  const before = snapshot(root);
  assert.equal(run(root, { check: true, ...options }).exitCode, exitCode);
  assert.deepEqual(snapshot(root), before, '--check alterou a fixture.');
}

test('sincroniza somente principais, preserva metadados e usa referências UTF-8 relativas', t => {
  const root = fixture(t);
  assertCheckReadonly(root);
  assert.equal(run(root).exitCode, 0);
  assertCheckReadonly(root, {}, 0);
  assert.match(read(root, '.codex/skills/demo/SKILL.md'), /name: demo/);
  assert.doesNotMatch(read(root, '.codex/skills/demo/SKILL.md'), /NAO_DUPLICAR_INSTRUCOES/);
  assert.match(read(root, '.codex/skills/outro/SKILL.md'), /grupo%20com%20espa%C3%A7o/);
  assert.match(read(root, '.opencode/agents/revisor/AGENT.md'), /edit: deny/);
  assert.match(read(root, '.kimi-code/agents/revisor.md'), /tools: \[Read, Grep, Glob\]/);
  assert.ok(existsSync(join(root, '.claude/skills/projeto/demo/SKILL.md')));
  for (const client of ['.claude', '.opencode', '.github', '.codex', '.cursor', '.kimi-code', '.vscode', '.agents', '.agent', '.gemini']) {
    for (const kind of ['templates', 'scripts', 'tools', 'external-skills', 'estado', 'tests', 'docs', 'adapters', 'extra', 'README.md', 'INSTRUCTIONS.md']) assert.equal(existsSync(join(root, client, kind)), false, `${client}/${kind}`);
  }
  assert.deepEqual(JSON.parse(read(root, '.pbai4devs/agents.json')).entries, [{ path: '.pbai4devs/agents/revisor/AGENT.md' }]);
  assert.ok(JSON.parse(read(root, '.pbai4devs/skills.json')).entries.some(entry => entry.path === '.pbai4devs/skills/grupo com espaço/outro'));
  assert.deepEqual(JSON.parse(read(root, '.pbai4devs/rules.json')).entries, [{ path: '.pbai4devs/rules/example/RULE.md' }]);
  assert.match(read(root, '.github/workflows/ci.yml'), /workflow-preservado/);
  assert.match(read(root, '.vscode/settings.json'), /config-preservada/);
  assert.ok(existsSync(join(root, '.vscode/extensions.json')));
  assert.match(read(root, '.codex/config.toml'), /config-native-preservada/);
  assert.ok(existsSync(join(root, '.github/prompts/custom.prompt.md')));
  assert.ok(existsSync(join(root, '.claude/notas.md')));
  const before = snapshot(root);
  run(root);
  assert.deepEqual(snapshot(root), before, 'A segunda sincronização deve ser idempotente.');
});

test('metadados gerados seguem a origem e metadados editados pelo humano permanecem', t => {
  const root = fixture(t); run(root);
  write(root, '.pbai4devs/commands/check/COMMAND.md', '---\nname: check-novo\ndescription: Comando atualizado.\n---\n\n# Comando\n');
  write(root, '.pbai4devs/rules/example/RULE.md', '---\ntrigger: glob\nglobs: "**/*.ts"\ndescription: Regra atualizada.\n---\n\n# Regra\n');
  write(root, '.pbai4devs/agents/revisor/AGENT.md', '---\nname: revisor\ndescription: Perfil atualizado.\n---\n\n# Revisor\n');
  write(root, '.codex/commands/check.md', read(root, '.codex/commands/check.md').replace('description: Comando.', 'description: Obsoleto.\nlocal-only: true'));
  assertCheckReadonly(root);
  run(root);
  assert.match(read(root, '.codex/commands/check.md'), /description: Obsoleto\.\nlocal-only: true/);
  assert.match(read(root, '.codex/commands/check.md'), /<!-- BEGIN AGENTDEVKIT -->/);
  assert.match(read(root, '.codex/rules/example.md'), /trigger: glob\nglobs: "\*\*\/\*\.ts"/);
  assert.match(read(root, '.codex/agents/revisor.md'), /Perfil atualizado\./);
  assert.match(read(root, '.opencode/agents/revisor/AGENT.md'), /edit: deny/);
  assert.match(read(root, '.kimi-code/agents/revisor.md'), /tools: \[Read, Grep, Glob\]/);
  assert.match(read(root, '.github/instructions/demo.instructions.md'), /applyTo: '\*\*'/);
  assertCheckReadonly(root, {}, 0);
});

test('hub unico permite tres novos clientes, regras por inclusao e metadados nativos', t => {
  const root = fixture(t);
  write(root, '.pbai4devs/agents/revisor/antigravity.yaml', '---\nname: revisor\nmainAgent: false\nsubagent: true\n---\n');
  write(root, '.pbai4devs/agents/revisor/gemini.yaml', '---\nname: revisor\nkind: local\n---\n');
  write(root, '.pbai4devs/espelhos.conf', read(root, '.pbai4devs/espelhos.conf') + [
    'nativo|.agents/agents/revisor.md|.pbai4devs/agents/revisor/AGENT.md|.pbai4devs/agents/revisor/antigravity.yaml',
    'nativo|.agent/agents/revisor.md|.pbai4devs/agents/revisor/AGENT.md|.pbai4devs/agents/revisor/antigravity.yaml',
    'nativo|.gemini/agents/revisor.md|.pbai4devs/agents/revisor/AGENT.md|.pbai4devs/agents/revisor/gemini.yaml',
  ].join('\n') + '\n');
  run(root);
  for (const client of ['.agents', '.agent', '.gemini']) {
    assert.ok(existsSync(join(root, client, 'skills/demo/SKILL.md')));
    assert.ok(existsSync(join(root, client, '.gitignore')));
    for (const extra of ['tools', 'scripts', 'templates', 'docs', 'external-skills']) assert.equal(existsSync(join(root, client, extra)), false);
  }
  for (const client of ['.agents', '.agent']) {
    assert.match(read(root, `${client}/agents/revisor.md`), /mainAgent: false/);
    assert.match(read(root, `${client}/rules/example.md`), /@\[origem\]\(\.\.\/\.\.\/\.pbai4devs\/rules\/example\/RULE\.md\)/);
    assert.ok(isReference(read(root, `${client}/rules/example.md`)));
    const target = read(root, `${client}/rules/example.md`).match(/@\[origem\]\(([^)]+)\)/)[1];
    assert.ok(existsSync(resolve(root, client, 'rules', decodeURIComponent(target))));
  }
  assert.match(read(root, '.gemini/agents/revisor.md'), /kind: local/);
  const catalog = JSON.parse(read(root, '.pbai4devs/catalog.json'));
  assert.equal(catalog.agents.length, 1);
  assert.deepEqual(JSON.parse(read(root, '.pbai4devs/agents.json')), { entries: [{ path: '.pbai4devs/agents/revisor/AGENT.md' }] });
  assert.ok(catalog.skills.every(entry => entry.path.startsWith('.pbai4devs/')));
  assertCheckReadonly(root, {}, 0);
  assert.doesNotThrow(() => validateIgnoreClients({ '.agents': {}, '.agent': {}, '.gemini': {} }));
  assert.throws(() => validateIgnoreClients({ '.pbai4devs': {} }));
});

test('Gemini usa TOML com inclusao relativa ao workspace e argumentos, sem Markdown duplicado', t => {
  const root = fixture(t);
  write(root, '.pbai4devs/commands/check/COMMAND.md', '---\ndescription: "Verifica \\"aspas\\" e regras."\n---\n\n# Check\n');
  write(root, '.gemini/commands/check.md', pointer('../../.pbai4devs/commands/check/COMMAND.md'));
  recordOwned(root, ['.gemini/commands/check.md']);
  run(root);
  const target = '.gemini/commands/check.toml';
  const text = read(root, target); const lines = text.trimEnd().split('\n');
  assert.equal(lines[0], '# gerado: sincronizar-agentes');
  assert.equal(JSON.parse(lines[1].slice('description = '.length)), 'Verifica "aspas" e regras.');
  assert.equal(JSON.parse(lines[2].slice('prompt = '.length)), '@{.pbai4devs/commands/check/COMMAND.md}\n\n{{args}}');
  assert.ok(isReference(text)); assert.equal(existsSync(join(root, '.gemini/commands/check.md')), false);
  write(root, target, text + '# instrucao propria\n');
  assertCheckReadonly(root);
  const repaired = run(root, { force: true });
  assert.ok(repaired.managedBlocks[target]);
  assert.match(read(root, target), /# instrucao propria/);
  assert.match(read(root, target), /BEGIN AGENTDEVKIT/);
  rmSync(join(root, '.pbai4devs/commands/check'), { recursive: true });
  run(root);
  const stripped = read(root, target).split('\n');
  assert.equal(stripped[0], '# gerado: sincronizar-agentes');
  assert.equal(stripped[1], lines[1]);
  assert.equal(JSON.parse(stripped[2].slice('prompt = '.length)).trimEnd(), '@{.pbai4devs/commands/check/COMMAND.md}\n\n{{args}}');
  assert.equal(stripped[3], '# instrucao propria');
  assert.match(read(root, '.github/workflows/ci.yml'), /workflow-preservado/);
});

test('nativos TOML ficam restritos aos comandos Gemini e ponteiros falsos nao sao apagados como gerados', t => {
  for (const row of [
    'nativo|.claude/commands/check.toml|.pbai4devs/commands/check/COMMAND.md',
    'nativo|.gemini/agents/revisor.toml|.pbai4devs/agents/revisor/AGENT.md',
    'nativo|.gemini/commands/check.toml|.pbai4devs/rules/example/RULE.md',
    'nativo|.gemini/commands/check.md|.pbai4devs/commands/check/COMMAND.md',
    'nativo|.gemini/commands/check.toml|.pbai4devs/commands/check/COMMAND.md|.pbai4devs/agents/revisor/kimi-code.yaml',
  ]) {
    const root = fixture(t); write(root, '.pbai4devs/espelhos.conf', read(root, '.pbai4devs/espelhos.conf') + row + '\n');
    rejected(root, { force: true });
  }
  assert.equal(isReference('# gerado: sincronizar-agentes\ndescription = "teste"\nprompt = "!{rm -rf .}"\n'), false);
  assert.equal(isReference('# gerado: sincronizar-agentes\ndescription = "teste"\nprompt = "@{.pbai4devs/commands/../private/COMMAND.md}\\n\\n{{args}}"\n'), false);
  assert.equal(isReference('---\ndescription: regra\n---\n\n# Regra\n\n@[../../.pbai4devs/rules/demo/RULE.md]\nTexto proprio\n'), false);
});

test('gera gitignore canonico e de clientes; registro gitignore nao espelha recursos', t => {
  const root = fixture(t, true);
  write(root, source, skill);
  write(root, '.pbai4devs/espelhos.conf', 'agente|.codex|plano\ngitignore|.vscode\n');
  write(root, '.pbai4devs/templates/gitignore/clients.json', JSON.stringify({ '.vscode': { resources: false, allow: ['settings.json'] } }));
  write(root, '.vscode/settings.json', '{"preserved":true}\n');
  write(root, '.gitignore', '# Somente regras gerais\n*.tmp\n');
  const result = run(root);
  assert.equal(result.gitignores, 3);
  assert.equal(read(root, '.pbai4devs/.gitignore'), `${ignoreBegin}\n${read(root, '.pbai4devs/templates/gitignore/shared.ignore')}${ignoreEnd}\n`);
  for (const target of ['.codex', '.vscode']) assert.doesNotMatch(read(root, `${target}/.gitignore`), /\{\{ALLOWLIST\}\}/);
  assert.match(read(root, '.codex/.gitignore'), /!\/skills\//);
  assert.doesNotMatch(read(root, '.vscode/.gitignore'), /!\/skills/);
  assert.match(read(root, '.vscode/.gitignore'), /!\/settings\.json/);
  assert.equal(existsSync(join(root, '.vscode/skills')), false);
  assert.equal(read(root, '.vscode/settings.json'), '{"preserved":true}\n');
  assert.equal(read(root, '.gitignore'), '# Somente regras gerais\n*.tmp\n');
  assertCheckReadonly(root, {}, 0);
});

test('repara somente bloco gitignore e force salva o original sem perder regras externas', t => {
  const root = fixture(t, true); run(root);
  const prefix = '# Regras do usuario\r\n/private-cache/\r\n';
  const suffix = '# Excecao local\r\n!keep.log\r\n';
  const old = `${prefix}${ignoreBegin}\r\n/custom-inside/\r\n${ignoreEnd}\r\n${suffix}`;
  write(root, '.codex/.gitignore', old);
  assertCheckReadonly(root); assertCheckReadonly(root, { force: true });
  const result = run(root, { force: true });
  assert.equal(readFileSync(join(result.backupRoot, '.codex/.gitignore'), 'utf8'), old);
  const repaired = readFileSync(join(root, '.codex/.gitignore'), 'utf8');
  assert.ok(repaired.startsWith(prefix)); assert.ok(repaired.endsWith(suffix));
  assert.ok(!repaired.includes('/custom-inside/')); assert.ok(repaired.includes('/cache/'));
  write(root, '.pbai4devs/templates/gitignore/agents.ignore', '# Novo padrao\n{{ALLOWLIST}}\n/cache/\n/session/\n');
  assertCheckReadonly(root);
  run(root);
  assert.ok(read(root, '.codex/.gitignore').includes('/session/'));
  assert.ok(readFileSync(join(root, '.codex/.gitignore'), 'utf8').endsWith(suffix));
  assertCheckReadonly(root, {}, 0);
});

test('adiciona bloco a gitignore proprio, detecta exclusao e mantem idempotencia', t => {
  const root = fixture(t, true);
  const custom = '# Local\n/custom/\n!custom/keep'; write(root, '.codex/.gitignore', custom);
  run(root); assert.ok(read(root, '.codex/.gitignore').startsWith(custom));
  const before = snapshot(root); run(root); assert.deepEqual(snapshot(root), before);
  rmSync(join(root, '.pbai4devs/.gitignore')); assertCheckReadonly(root);
  assert.equal(run(root).gitignores, 1); assertCheckReadonly(root, {}, 0);
});

test('gitignore recusa marcadores invalidos e fontes ausentes antes de qualquer mutacao', t => {
  for (const text of [ignoreBegin, ignoreEnd, `${ignoreEnd}\n${ignoreBegin}\n`, `${ignoreBegin}\na\n${ignoreEnd}\n${ignoreBegin}\nb\n${ignoreEnd}\n`]) {
    const root = fixture(t, true); write(root, '.codex/.gitignore', text);
    rejected(root, { force: true }, /Marcadores/);
  }
  for (const text of ['', `${ignoreBegin}\n/cache/\n${ignoreEnd}\n`]) {
    const root = fixture(t, true); write(root, '.pbai4devs/templates/gitignore/shared.ignore', text);
    rejected(root, { force: true }, /Template/);
  }
  const missing = fixture(t, true); rmSync(join(missing, '.pbai4devs/templates/gitignore/agents.ignore'));
  rejected(missing, { force: true }, /Template .gitignore ausente/);
  for (const row of ['gitignore|.vscode|extra', 'gitignore|.pbai4devs', 'gitignore|../outside', 'gitignore|.git', 'gitignore|.CODEX']) {
    const root = fixture(t, true); write(root, '.pbai4devs/espelhos.conf', read(root, '.pbai4devs/espelhos.conf') + row + '\n');
    rejected(root, { force: true });
  }
});

test('gitignore gerado funciona no Git sem esconder definicoes versionadas', t => {
  const root = fixture(t);
  const git = spawnSync('git', ['init', '-q', root], { encoding: 'utf8' });
  if (git.error?.code === 'ENOENT') { t.skip('Git ausente: prova de regras delegada a integracao.'); return; }
  assert.equal(git.status, 0, git.stderr); run(root);
  for (const file of ['.pbai4devs/tools/demo/.local/state.json', '.codex/cache/session.json', '.claude/debug.log']) {
    write(root, file, '{}\n');
    assert.equal(spawnSync('git', ['check-ignore', '--no-index', file], { cwd: root }).status, 0, file);
  }
  for (const file of ['.pbai4devs/tools/demo/TOOL.json', '.pbai4devs/tools/demo/SCRIPT.mjs', '.codex/skills/demo/SKILL.md', '.codex/.gitignore', '.pbai4devs/.gitignore']) {
    assert.equal(spawnSync('git', ['check-ignore', '--no-index', file], { cwd: root }).status, 1, file);
  }
});

test('mergeGitignore preserva bytes exteriores e nao interpreta o arquivo como Markdown', () => {
  const current = `---\r\ncustom: true\r\n---\r\n${ignoreBegin}\r\nold\r\n${ignoreEnd}\r\n**/other\r\n`;
  const merged = mergeGitignore(current, '*.log\n');
  assert.equal(merged.hasBlock, true);
  assert.equal(merged.text, `---\r\ncustom: true\r\n---\r\n${ignoreBegin}\n*.log\n${ignoreEnd}\n**/other\r\n`);
});

test('allowlist abre somente configuracoes e diretorios declarados no Git', t => {
  const root = fixture(t, true);
  write(root, '.pbai4devs/espelhos.conf', 'agente|.codex|plano\ngitignore|.vscode\n');
  write(root, '.pbai4devs/templates/gitignore/clients.json', JSON.stringify({ '.codex': { allow: ['config.toml', 'native/file.json'] }, '.vscode': { resources: false, allow: ['settings.json', 'snippets/'] } }));
  write(root, '.gitignore', '.DS_Store\n*.swp\nThumbs.db\n');
  const git = spawnSync('git', ['init', '-q', root], { encoding: 'utf8' });
  if (git.error?.code === 'ENOENT') { t.skip('Git ausente: prova de allowlist delegada a integracao.'); return; }
  assert.equal(git.status, 0, git.stderr); run(root);
  for (const file of ['.codex/config.toml', '.codex/native/file.json', '.codex/skills/demo/SKILL.md', '.vscode/settings.json', '.vscode/snippets/example.code-snippets']) {
    write(root, file, 'fixture\n'); assert.equal(spawnSync('git', ['check-ignore', '--no-index', file], { cwd: root }).status, 1, file);
  }
  for (const file of ['.codex/native/extra.json', '.codex/auth.json', '.vscode/skills/demo/SKILL.md', '.vscode/tasks.json', '.codex/skills/demo/.DS_Store', '.codex/skills/demo/file.swp', '.vscode/snippets/Thumbs.db']) {
    write(root, file, 'fixture\n'); assert.equal(spawnSync('git', ['check-ignore', '--no-index', file], { cwd: root }).status, 0, file);
  }
  assert.equal(existsSync(join(root, '.codex/clients.json')), false);
});

test('allowlist invalida ou token ausente falha antes de mutacoes', t => {
  for (const config of [[], null, { '.pbai4devs': {} }, { '../outside': {} }, { '.codex': [], '.vscode': {} }, { '.codex': { resources: 'false' } }, { '.codex': { allow: null } }, { '.codex': { extra: true } }, { '.codex': {}, '.CODEX': {} }]) assert.throws(() => validateIgnoreClients(config));
  for (const path of ['/absolute', '../outside', 'nested/../outside', './file', 'C:/file', 'back\\slash', 'double//slash', '*', '*.json', '!file', '#file', 'ends ', '']) assert.throws(() => validateIgnoreClients({ '.codex': { allow: [path] } }), /relativo/);
  for (const body of ['{{ALLOWLIST}}\n{{ALLOWLIST}}\n']) {
    const root = fixture(t, true); write(root, '.pbai4devs/templates/gitignore/agents.ignore', body); rejected(root, { force: true }, /unico/);
  }
  const root = fixture(t, true); write(root, '.pbai4devs/templates/gitignore/clients.json', '{broken'); rejected(root, { force: true });
});

test('registros são derivados, determinísticos e --check nunca os corrige', t => {
  const root = fixture(t);
  run(root);
  write(root, '.pbai4devs/skills.json', '{"incorreto":true}\n');
  assertCheckReadonly(root);
  run(root);
  assert.ok(Array.isArray(JSON.parse(read(root, '.pbai4devs/skills.json')).entries));
  rmSync(join(root, '.pbai4devs/adapters/antigravity/agents/revisor.md'));
  run(root);
  assert.deepEqual(JSON.parse(read(root, '.pbai4devs/agents.json')).entries, [{ path: '.pbai4devs/agents/revisor/AGENT.md' }]);
  const empty = fixture(t, true);
  run(empty);
  assert.deepEqual(JSON.parse(read(empty, '.pbai4devs/skills.json')), { entries: [] });
  assertCheckReadonly(empty, {}, 0);
});

test('skills externas baixadas não entram nos índices; cópias humanas permanecem intactas', t => {
  const root = fixture(t);
  write(root, '.pbai4devs/external-skills/README.md', '# Catálogo externo\n');
  write(root, '.pbai4devs/external-skills/CATALOG.json', JSON.stringify(externalConfig()));
  for (let index = 0; index < 80; index++) write(root, `.pbai4devs/external-skills/.local/upstream-${index}/SKILL.md`, '# Skill upstream sem frontmatter\n');
  run(root);
  const index = JSON.parse(read(root, '.pbai4devs/skills.json')).entries;
  assert.equal(index.length, 2);
  assert.ok(index.every(entry => entry.path.startsWith('.pbai4devs/skills/')));
  assert.equal(existsSync(join(root, '.codex/skills/upstream-0')), false);
  const sourceBefore = read(root, '.pbai4devs/external-skills/.local/upstream-0/SKILL.md');
  write(root, '.codex/external-skills/.local/upstream-0/SKILL.md', '# Cópia indevida\n');
  write(root, '.claude/external-skills/README.md', pointer('../../.pbai4devs/external-skills/README.md'));
  assertCheckReadonly(root, {}, 0);
  const result = run(root, { force: true });
  assert.equal(read(root, '.claude/external-skills/README.md'), pointer('../../.pbai4devs/external-skills/README.md'));
  assert.ok(result.preserved.some(item => item.path === '.codex/external-skills'));
  assert.equal(read(root, '.pbai4devs/external-skills/.local/upstream-0/SKILL.md'), sourceBefore);
  assert.equal(read(root, '.codex/external-skills/.local/upstream-0/SKILL.md'), '# Cópia indevida\n');
  assertCheckReadonly(root, {}, 0);
});

test('--force complementa conteúdo editado e preserva recursos humanos', t => {
  const root = fixture(t);
  run(root);
  recordOwned(root, ['.claude/skills/projeto/demo/SKILL.md', '.kimi-code/agents/revisor.md']);
  write(root, '.claude/scripts/local.sh', 'script humano\n');
  write(root, '.claude/tools/program.exe', Buffer.from([1, 2, 3]));
  write(root, '.claude/docs/plain.md', '# Documento auxiliar\n');
  write(root, '.claude/skills/local.bin', 'custom\n');
  write(root, '.claude/skills/projeto/demo/SKILL.md', 'corrompido\n');
  write(root, '.kimi-code/agents/revisor.md', 'corrompido\n');
  write(root, '.github/prompts/edited.prompt.md', pointer() + '\nRevisar [manual](bar).\n');
  assertCheckReadonly(root);
  assertCheckReadonly(root, { force: true });
  const result = run(root, { force: true });
  for (const path of ['.claude/skills/projeto/demo/SKILL.md', '.kimi-code/agents/revisor.md']) {
    assert.ok(read(root, path).startsWith('corrompido\n'));
    assert.ok(result.managedBlocks[path]);
    assert.ok(!result.ownedOutputs.includes(path));
  }
  assert.deepEqual(readFileSync(join(root, '.claude/tools/program.exe')), Buffer.from([1, 2, 3]));
  assert.equal(read(root, '.claude/scripts/local.sh'), 'script humano\n');
  assert.equal(read(root, '.claude/skills/local.bin'), 'custom\n');
  assert.match(read(root, '.github/prompts/edited.prompt.md'), /Revisar \[manual\]/);
  assert.match(read(root, '.codex/skills/outro/SKILL.md'), /name: outro/);
  assert.match(read(root, '.github/workflows/ci.yml'), /workflow-preservado/);
  assert.match(read(root, '.codex/config.toml'), /config-native-preservada/);
  assertCheckReadonly(root, {}, 0);
});

test('atualiza fontes, adiciona clientes, remove recursos e migra agrupado para plano', t => {
  const root = fixture(t);
  run(root);
  write(root, source, skill.replace('Exemplo.', 'Atualizado.'));
  write(root, '.pbai4devs/espelhos.conf', read(root, '.pbai4devs/espelhos.conf') + 'agente|.extra|plano\n');
  assertCheckReadonly(root);
  run(root);
  assert.match(read(root, '.extra/skills/demo/SKILL.md'), /Atualizado/);
  rmSync(join(root, '.pbai4devs/rules/example/RULE.md'));
  write(root, '.pbai4devs/espelhos.conf', read(root, '.pbai4devs/espelhos.conf').replace('agente|.claude\n', 'agente|.claude|plano\n'));
  run(root);
  assert.equal(existsSync(join(root, '.claude/skills/projeto')), false);
  assert.ok(existsSync(join(root, '.claude/skills/demo/SKILL.md')));
  assert.equal(existsSync(join(root, '.codex/rules/example.md')), false);
  assert.deepEqual(JSON.parse(read(root, '.pbai4devs/rules.json')).entries, []);
  assertCheckReadonly(root, {}, 0);
});

test('remove linhas legadas e preserva arquivos sem prova de propriedade', t => {
  const root = fixture(t);
  run(root);
  write(root, 'docs/produto/prd/demo/PRD.md', '# Produto real\n');
  write(root, 'manual/guia com espaço/DOC.md', '# Documento real\n');
  write(root, '.claude/manual/DOC.md', pointer('../../manual/guia%20com%20espa%C3%A7o/DOC.md'));
  write(root, '.github/prompts/missing.prompt.md', pointer());
  write(root, '.pbai4devs/espelhos.conf', read(root, '.pbai4devs/espelhos.conf') + 'documento|manual\n' + 'nativo|.github/prompts/missing.prompt.md|.pbai4devs/commands/missing/COMMAND.md\n');
  assertCheckReadonly(root);
  run(root);
  assert.doesNotMatch(read(root, '.pbai4devs/espelhos.conf'), /documento\||missing/);
  assert.equal(existsSync(join(root, '.claude/manual/DOC.md')), true);
  assert.equal(existsSync(join(root, '.github/prompts/missing.prompt.md')), true);
  assert.ok(existsSync(join(root, 'docs/produto/prd/demo/PRD.md')));
  assert.ok(existsSync(join(root, 'manual/guia com espaço/DOC.md')));
  assertCheckReadonly(root, {}, 0);
});

test('rejeita manifestos fora do escopo, campos extras, caminhos e caixas conflitantes sem mutação', t => {
  const rows = [
    'agente|.git', 'agente|.AGENTS|plano', 'agente|.GIT|plano', 'agente|.AgEnT-TeStS|plano', 'agente|.CLAUDE|plano', 'agente|.claude|plano', 'agente|.other|invalid', 'agente|.other|plano|extra',
    'agente|../outside|plano', 'agente|C:/outside|plano', 'agente|.test//dir|plano', 'agente|.test\\dir|plano', 'agente|.test|plano|extra|another',
    `nativo|.github/workflows/unsafe.md|${source}`, `nativo|.github/WorkFlows/unsafe.md|${source}`, `nativo|.claude/templates/unsafe.md|${source}`, `nativo|.claude/external-skills/unsafe.md|${source}`, `nativo|.claude/README.md|${source}`, `nativo|.outside/prompts/unsafe.md|${source}`,
    'nativo|.claude/prompts/aux.md|.pbai4devs/templates/demo/REFERENCE.md', 'nativo|.github/prompts/aux.md|.pbai4devs/skills/projeto/demo/REFERENCE.md', 'nativo|.claude/prompts/wrong.md|.pbai4devs/commands/check/COMMAND.md|.pbai4devs/agents/revisor/kimi-code.yaml',
  ];
  for (const row of rows) {
    const root = fixture(t);
    write(root, '.pbai4devs/espelhos.conf', read(root, '.pbai4devs/espelhos.conf') + row + '\n');
    rejected(root, { force: true });
  }
});

test('colisões de destino, ancestral, metadados e slugs não são resolvidas por --force', t => {
  for (const variant of ['slug', 'source', 'ancestor', 'metadata', 'target-case']) {
    const root = fixture(t);
    let extra;
    if (variant === 'slug') write(root, '.pbai4devs/skills/duplicado/demo/SKILL.md', skill);
    if (variant === 'source') extra = 'nativo|.codex/skills/demo/SKILL.md|.pbai4devs/commands/check/COMMAND.md';
    if (variant === 'ancestor') extra = [`nativo|.github/prompts/custom.md|${source}`, `nativo|.github/prompts/custom.md/child.md|${source}`].join('\n');
    if (variant === 'target-case') extra = [`nativo|.github/prompts/custom.md|${source}`, `nativo|.github/prompts/CUSTOM.md|${source}`].join('\n');
    if (variant === 'metadata') {
      write(root, '.pbai4devs/agents/revisor/other.yaml', '---\nname: other\n---\n');
      extra = 'nativo|.kimi-code/agents/revisor.md|.pbai4devs/agents/revisor/AGENT.md|.pbai4devs/agents/revisor/other.yaml';
    }
    if (extra) write(root, '.pbai4devs/espelhos.conf', read(root, '.pbai4devs/espelhos.conf') + extra + '\n');
    rejected(root, { force: true }, /conflito|ancestral|maiusculas/i);
  }
});

test('metadados incompletos, ausentes e com corpo são rejeitados antes de alterações', t => {
  for (const text of ['name: revisor\n', '---\nname: revisor\n', '---\nname: revisor\n---\ntexto indevido\n', null]) {
    const root = fixture(t);
    const metadata = '.pbai4devs/agents/revisor/kimi-code.yaml';
    if (text === null) rmSync(join(root, metadata)); else write(root, metadata, text);
    rejected(root, { force: true }, /YAML|Metadados|Frontmatter/);
  }
  const root = fixture(t);
  write(root, source, '---\nname: demo\n---\nSem titulo\n');
  rejected(root, { force: true }, /Titulo/);
});

test('symlinks canônicos são rejeitados sem efeitos quando o sistema permite criá-los', t => {
  for (const location of ['.pbai4devs/skills/projeto/demo/external.md', '.pbai4devs/skills.json', '.pbai4devs/espelhos.conf']) {
    const root = fixture(t);
    rmSync(join(root, location), { recursive: true, force: true });
    try { symlinkSync(join(root, 'missing-target'), join(root, location)); }
    catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('Sistema não permite criar symlinks de teste.'); return; } throw error; }
    rejected(root, { force: true }, /Link simbolico/);
  }
});

test('nomes de controle são rejeitados sem efeitos em todos os sistemas', t => {
  const root = fixture(t);
  const manifest = read(root, '.pbai4devs/espelhos.conf');
  write(root, '.pbai4devs/espelhos.conf', manifest + `nativo|.claude/skills/invalid\u0001.md|${source}\n`);
  rejected(root, { force: true }, /Caminho invalido/);
  assert.match(read(root, 'README.md'), /README raiz preservado/);

  if (process.platform !== 'win32') {
    const filesystem = fixture(t);
    write(filesystem, '.claude/skills/invalid\nREADME.md', 'nunca deve fragmentar caminho\n');
    rejected(filesystem, { force: true }, /Caminho invalido/);
    assert.match(read(filesystem, 'README.md'), /README raiz preservado/);
  }
});

test('registros não regulares são rejeitados sem efeitos', t => {
  const other = fixture(t);
  mkdirSync(join(other, '.pbai4devs/skills.json'));
  rejected(other, { force: true }, /Registro nao e arquivo/);
});

test('backup recusa raiz simbólica antes de remover conteúdo próprio', t => {
  const root = fixture(t);
  run(root);
  write(root, '.pbai4devs/templates/gitignore/shared.ignore', read(root, '.pbai4devs/templates/gitignore/shared.ignore') + '*.extra-local\n');
  write(root, '.claude/scripts/own.sh', 'preservar\n');
  const outside = join(root, 'outside');
  mkdirSync(outside);
  try { symlinkSync(outside, join(root, '.agent-tests'), 'dir'); }
  catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('Sistema não permite criar symlinks de teste.'); return; } throw error; }
  rejected(root, { force: true }, /Link simbolico/);
  assert.match(read(root, '.claude/scripts/own.sh'), /preservar/);
  assert.deepEqual(readdirSync(outside), []);
});

test('frontmatter e reconhecimento de apontamentos não confundem instruções próprias', () => {
  assert.equal(header('---\r\nname: test\r\n---\r\nbody\r\n'), '---\nname: test\n---\n');
  assert.ok(isReference(pointer()));
  assert.ok(isReference('# Git\n\nLeia [origem](x) ao realizar operações Git.\n'));
  assert.equal(isReference(pointer() + '\nInstrução própria.\n'), false);
  assert.equal(isReference(pointer() + '\nLeia [outra](x).\n'), false);
  assert.equal(isReference('---\nsem fechamento\n# Titulo\nLeia [origem](x).\n'), false);
  assert.throws(() => header('sem YAML'), /YAML/);
});

test('CLI Node propaga códigos de check e rejeita opções sem invocar shell', t => {
  const root = fixture(t);
  write(root, '.pbai4devs/templates/gitignore/local.ignore', readFileSync(join(project, '.pbai4devs/templates/gitignore/local.ignore'), 'utf8'));
  write(root, '.pbai4devs/templates/gitignore/agents.ignore', readFileSync(join(project, '.pbai4devs/templates/gitignore/agents.ignore'), 'utf8'));
  assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
  run(root, { localIgnores: true });
  const before = snapshot(root);
  const good = spawnSync(process.execPath, [cli, '--root', root, '--check'], { encoding: 'utf8' });
  assert.equal(good.status, 0, good.stderr);
  assert.match(good.stdout, /0 desatualizadas/);
  for (const option of ['--documento', '--invalid', '--root']) {
    const result = spawnSync(process.execPath, [cli, '--root', root, option], { encoding: 'utf8' });
    assert.equal(result.status, 2, result.stderr);
  }
  assert.deepEqual(snapshot(root), before);
  write(root, source, skill.replace('Exemplo.', 'Novo.'));
  const changed = spawnSync(process.execPath, [cli, '--root', root, '--force', '--check'], { encoding: 'utf8' });
  assert.equal(changed.status, 1, changed.stderr);
});

test('gera manifesto e entradas sem estado e atualiza apenas entradas integralmente próprias', t => {
  const root = fixture(t, true);
  write(root, source, skill);
  rmSync(join(root, '.pbai4devs/espelhos.conf'));
  for (const name of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) write(root, `.pbai4devs/templates/entrypoints/${name}`, `---\ndescription: Entrada.\n---\n\n# ${name}\n`);
  write(root, 'CLAUDE.md', '# Instruções humanas\n');
  assertCheckReadonly(root, { generateEntrypoints: true });
  const first = run(root, { generateEntrypoints: true });
  assert.ok(first.ownedOutputs.includes('AGENTS.md'));
  assert.equal(first.ownedOutputs.includes('CLAUDE.md'), false);
  assert.ok(read(root, 'CLAUDE.md').startsWith('# Instruções humanas\n'));
  assert.match(read(root, 'CLAUDE.md'), /<!-- BEGIN AGENTDEVKIT -->/);
  assert.ok(existsSync(join(root, '.agents/skills/projeto/demo/SKILL.md')));
  assertCheckReadonly(root, { generateEntrypoints: true }, 0);
  write(root, '.pbai4devs/templates/entrypoints/AGENTS.md', '---\ndescription: Entrada.\n---\n\n# Atualizada\n');
  run(root, { generateEntrypoints: true });
  assert.match(read(root, 'AGENTS.md'), /# Atualizada/);
  write(root, 'AGENTS.md', read(root, 'AGENTS.md') + '\nTexto humano.\n');
  const second = run(root, { generateEntrypoints: true });
  assert.equal(second.ownedOutputs.includes('AGENTS.md'), false);
  assert.match(read(root, 'AGENTS.md'), /Texto humano/);
});

test('entradas da CLI mantêm ownership integral e recursos têm proveniência derivada', t => {
  const root = fixture(t, true);
  const template = '---\ndescription: Entrada.\n---\n\n# Agentes\n';
  const entry = template + '\nResponda em português.\n';
  write(root, source, skill);
  write(root, '.pbai4devs/templates/entrypoints/AGENTS.md', template);
  write(root, 'AGENTS.md', entry);
  write(root, '.pbai4devs/estado/agentdevkit.json', JSON.stringify({ clients: ['codex'], files: { 'AGENTS.md': createHash('sha256').update(entry).digest('hex') } }));
  const result = run(root, { generateEntrypoints: true });
  assert.ok(result.ownedOutputs.includes('AGENTS.md'));
  assert.equal(read(root, 'AGENTS.md'), entry);
  assert.equal(JSON.parse(read(root, '.pbai4devs/estado/derived.json')).entries['AGENTS.md'], undefined);
  assert.ok(JSON.parse(read(root, '.pbai4devs/estado/derived.json')).files['.codex/skills/demo/SKILL.md']);
  assertCheckReadonly(root, { generateEntrypoints: true }, 0);
});

function completeCatalogFixture(t) {
  const root = fixture(t, true);
  for (const [kind, file] of Object.entries({ skills: 'SKILL.md', agents: 'AGENT.md', commands: 'COMMAND.md', rules: 'RULE.md', templates: 'TEMPLATE.md' })) {
    write(root, `.pbai4devs/${kind}/demo/${file}`, `---\nname: demo\n${kind === 'rules' ? 'trigger: always_on\n' : ''}description: ${kind} original.\n---\n\n# Demo ${kind}\n`);
  }
  write(root, '.pbai4devs/templates/demo/config.yaml.template', 'example: true\n');
  write(root, '.pbai4devs/tools/demo/TOOL.json', JSON.stringify(toolConfig()));
  write(root, '.pbai4devs/tools/demo/SCRIPT.mjs', toolWrapper('demo'));
  write(root, '.pbai4devs/scripts/demo/SCRIPT.mjs', '#!/usr/bin/env node\nconsole.log("fixture");\n');
  write(root, '.pbai4devs/scripts/demo/README.md', '---\ndescription: scripts original.\n---\n\n# Demo\n');
  write(root, '.pbai4devs/scripts/demo/tests/TEST.mjs', '// Teste versionado.\n');
  write(root, '.pbai4devs/scripts/demo/tests/SMOKE_DEMO.mjs', '// Smoke versionado.\n');
  write(root, '.pbai4devs/scripts/lib/shared.mjs', 'export const shared = true;\n');
  write(root, '.pbai4devs/external-skills/CATALOG.json', JSON.stringify(externalConfig()));
  return root;
}

test('nativos recusam principais dentro de estado ignorado e fora do catalogo', t => {
  for (const directory of ['.local', '.cache', 'tmp', 'test-results', 'playwright-report']) {
    const root = fixture(t, true);
    const hidden = `.pbai4devs/skills/${directory}/oculto/SKILL.md`;
    write(root, hidden, skill);
    write(root, '.pbai4devs/espelhos.conf', read(root, '.pbai4devs/espelhos.conf') + `nativo|.codex/skills/oculto/SKILL.md|${hidden}\n`);
    rejected(root, { force: true }, /fora do catalogo canonico/);
  }
});

test('regras validam trigger e contexto antes de gerar registros ou espelhos', t => {
  const root = fixture(t, true); const path = '.pbai4devs/rules/demo/RULE.md';
  const rule = fields => `---\ndescription: Regra de teste.\n${fields}---\n\n# Regra\n`;
  for (const [fields, expected] of [
    ['trigger: always_on\n', { trigger: 'always_on' }],
    ['trigger: model_decision\n', { trigger: 'model_decision' }],
    ['trigger: manual\n', { trigger: 'manual' }],
    ['trigger: glob\nglobs: "**/*.ts"\n', { trigger: 'glob', globs: '**/*.ts' }],
    ['trigger: glob\nglob: "src/**"\n', { trigger: 'glob', globs: 'src/**' }],
  ]) {
    write(root, path, rule(fields));
    const entry = buildCatalog(root).catalog.rules[0];
    assert.equal(entry.trigger, expected.trigger); assert.equal(entry.globs, expected.globs);
  }
  for (const fields of ['', 'trigger: invalid\n', 'trigger: glob\n', 'trigger: glob\nglobs: []\n', 'trigger: glob\nglob: "a/**"\nglobs: "b/**"\n']) {
    write(root, path, rule(fields)); rejected(root, { force: true }, /Trigger|globs|Metadado|conflitantes/);
  }
  write(root, path, rule('trigger: model_decision\n').replace('description: Regra de teste.\n', ''));
  rejected(root, { force: true }, /Descricao ausente/);
});

test('outputs ignorados nao entram nos assets; fixtures versionaveis continuam', t => {
  const root = completeCatalogFixture(t);
  const hidden = ['scripts/demo/playwright-report/index.html', 'scripts/demo/.Playwright-MCP/session.json', 'scripts/demo/TEST-RESULTS/report.json', 'scripts/demo/TmP/README.md', 'scripts/demo/run.log', 'scripts/demo/Sessions/state.json', 'scripts/demo/auth.json', 'scripts/demo/CREDENTIALS.JSON', 'scripts/demo/history.jsonl', 'scripts/demo/settings.LOCAL.yaml', 'scripts/demo/.env', 'skills/demo/.agent-tests/trace.json', 'templates/demo/temp/data.json'];
  for (const path of hidden) write(root, `.pbai4devs/${path}`, 'output temporario\n');
  const kept = ['scripts/demo/tests/fixtures/cache/input.json', 'scripts/demo/tests/fixtures/playwright-response.json', 'scripts/demo/tests/fixtures/auth.sample.json', 'scripts/demo/.env.example', 'templates/demo/compose.local.yml.template'];
  for (const path of kept) write(root, `.pbai4devs/${path}`, 'fixture versionavel\n');
  const catalog = buildCatalog(root).catalog;
  const assets = new Set(Object.values(catalog).flatMap(entries => Array.isArray(entries) ? entries.flatMap(entry => entry.assets) : []));
  for (const path of hidden) assert.ok(!assets.has(`.pbai4devs/${path}`), path);
  for (const path of kept) assert.ok(assets.has(`.pbai4devs/${path}`), path);
});

test('catálogo completo deriva oito tipos, ações reais e assets sem estado local', t => {
  const root = completeCatalogFixture(t);
  write(root, '.pbai4devs/scripts/browser/SCRIPT.conf', 'executor=playwright-mcp\n');
  write(root, '.pbai4devs/scripts/browser/SCRIPT.js', '(page) => page.title();\n');
  write(root, '.pbai4devs/commands/demo/COMMAND.md', '---\ndescription: Comando com referências.\n---\n\n# Demo\n\nLeia [tool](../../tools/demo/TOOL.json), [script][script], [pasta](../../scripts/demo/) e [template](../../templates/demo/TEMPLATE.md).\n\n[script]: ../../scripts/demo/SCRIPT.mjs\n');
  for (const path of ['.pbai4devs/tools/demo/.local/node_modules/payload/SKILL.md', '.pbai4devs/tools/demo/versions/1.0.0/package.json', '.pbai4devs/external-skills/.local/upstream/SKILL.md', '.pbai4devs/scripts/demo/.cache/large.json']) write(root, path, 'conteúdo local inválido deliberado');
  const before = snapshot(root);
  const first = buildCatalog(root);
  assert.deepEqual(snapshot(root), before, 'Construir o catálogo não pode escrever arquivos.');
  assert.deepEqual(buildCatalog(root), first);
  for (const type of ['skills', 'agents', 'commands', 'rules', 'templates', 'tools', 'scripts', 'externalSkills']) assert.ok(first.catalog[type].length, type);
  assert.deepEqual([...first.outputs.keys()].sort(), ['.pbai4devs/agents.json', '.pbai4devs/catalog.json', '.pbai4devs/rules.json', '.pbai4devs/skills.json']);
  assert.ok(first.catalog.templates[0].assets.includes('.pbai4devs/templates/demo/config.yaml.template'));
  assert.deepEqual(first.catalog.commands[0].references, ['.pbai4devs/scripts/demo', '.pbai4devs/scripts/demo/SCRIPT.mjs', '.pbai4devs/templates/demo/TEMPLATE.md', '.pbai4devs/tools/demo/TOOL.json']);
  const tool = first.catalog.tools[0];
  for (const action of ['install', 'update', 'check', 'info', 'run']) assert.deepEqual(tool.actions[action].argv, ['node', '.pbai4devs/tools/demo/SCRIPT.mjs', action]);
  assert.equal(tool.actions.run.requiresArguments, true);
  const script = first.catalog.scripts.find(entry => entry.id === 'demo');
  assert.deepEqual(script.argv, ['node', '.pbai4devs/scripts/demo/SCRIPT.mjs']);
  assert.deepEqual(script.support.modules, ['.pbai4devs/scripts/lib/shared.mjs']);
  assert.deepEqual(script.support.tests, ['.pbai4devs/scripts/demo/tests/TEST.mjs']);
  assert.deepEqual(script.support.smokes, ['.pbai4devs/scripts/demo/tests/SMOKE_DEMO.mjs']);
  const browser = first.catalog.scripts.find(entry => entry.id === 'browser');
  assert.equal(browser.executor, 'playwright-mcp');
  assert.equal(browser.path, '.pbai4devs/scripts/browser/SCRIPT.js');
  assert.deepEqual(browser.argv, []);
  assert.equal(first.catalog.externalSkills[0].path, '.pbai4devs/external-skills/CATALOG.json');
  assert.equal(first.catalog.externalSkills[0].upstreamPath, 'skills/demo/SKILL.md');
  assert.doesNotMatch(first.outputs.get('.pbai4devs/catalog.json'), /node_modules|\.local|versions|\.cache|installed|conteúdo local|updatedAt/);
  run(root);
  for (const [path, text] of first.outputs) assert.equal(read(root, path), text);
  assertCheckReadonly(root, {}, 0);
});

test('criar editar e remover recursos atualiza todos os tipos e os índices nativos', t => {
  const root = completeCatalogFixture(t);
  run(root);
  for (const [kind, file] of Object.entries({ skills: 'SKILL.md', agents: 'AGENT.md', commands: 'COMMAND.md', rules: 'RULE.md', templates: 'TEMPLATE.md' })) write(root, `.pbai4devs/${kind}/demo/${file}`, `---\nname: demo\n${kind === 'rules' ? 'trigger: always_on\n' : ''}description: ${kind} atualizado.\n---\n\n# Demo\n`);
  write(root, '.pbai4devs/tools/demo/TOOL.json', JSON.stringify({ ...toolConfig(), description: 'tools atualizado.' }));
  write(root, '.pbai4devs/scripts/demo/README.md', '---\ndescription: scripts atualizado.\n---\n\n# Demo\n');
  const external = externalConfig(); external.skills[0].use = 'externalSkills atualizado.';
  write(root, '.pbai4devs/external-skills/CATALOG.json', JSON.stringify(external));
  assertCheckReadonly(root);
  run(root);
  const updated = JSON.parse(read(root, '.pbai4devs/catalog.json'));
  for (const kind of ['skills', 'agents', 'commands', 'rules', 'templates', 'tools', 'scripts', 'externalSkills']) assert.match(updated[kind][0].description, /atualizado/);
  for (const kind of ['skills', 'agents', 'commands', 'rules', 'templates/demo', 'tools', 'scripts', 'external-skills']) rmSync(join(root, '.pbai4devs', kind), { recursive: true });
  assertCheckReadonly(root);
  run(root);
  const removed = JSON.parse(read(root, '.pbai4devs/catalog.json'));
  for (const value of Object.values(removed)) if (Array.isArray(value)) assert.deepEqual(value, []);
  for (const kind of ['skills', 'agents', 'rules']) assert.deepEqual(JSON.parse(read(root, `.pbai4devs/${kind}.json`)), { entries: [] });
  assertCheckReadonly(root, {}, 0);
});

test('JSON derivado corrompido é detectado e reparado com backup sem editar fontes', t => {
  const root = completeCatalogFixture(t);
  run(root);
  for (const path of ['.pbai4devs/catalog.json', '.pbai4devs/skills.json', '.pbai4devs/agents.json', '.pbai4devs/rules.json']) write(root, path, '{corrompido');
  assertCheckReadonly(root, { force: true });
  const result = run(root, { force: true });
  for (const path of ['.pbai4devs/catalog.json', '.pbai4devs/skills.json', '.pbai4devs/agents.json', '.pbai4devs/rules.json']) assert.equal(read(result.backupRoot, path), '{corrompido');
  assert.equal(JSON.parse(read(root, '.pbai4devs/catalog.json')).schemaVersion, 1);
  assertCheckReadonly(root, {}, 0);
});

test('catalogo e seletor aceitam o mesmo SCRIPT.conf e os tres formatos Node', t => {
  const root = completeCatalogFixture(t);
  write(root, '.pbai4devs/scripts/demo/SCRIPT.conf', '# Node explicito\n executor = node \n');
  write(root, '.pbai4devs/scripts/browser/SCRIPT.conf', '# Conector\n executor = playwright-mcp \n');
  write(root, '.pbai4devs/scripts/browser/SCRIPT.js', '(page) => page.title();\n');
  write(root, '.pbai4devs/scripts/common/SCRIPT.cjs', 'module.exports = {};\n');
  write(root, '.pbai4devs/scripts/plain/SCRIPT.js', 'console.log("Node");\n');
  const scripts = buildCatalog(root).catalog.scripts;
  assert.equal(scripts.find(entry => entry.id === 'demo').executor, 'node');
  assert.equal(scripts.find(entry => entry.id === 'demo').configuration, '.pbai4devs/scripts/demo/SCRIPT.conf');
  assert.equal(scripts.find(entry => entry.id === 'browser').executor, 'playwright-mcp');
  assert.equal(scripts.find(entry => entry.id === 'common').path, '.pbai4devs/scripts/common/SCRIPT.cjs');
  assert.equal(scripts.find(entry => entry.id === 'plain').path, '.pbai4devs/scripts/plain/SCRIPT.js');
  for (const invalid of ['', '# vazio\n', 'executor=bash\n', 'executor=node\nexecutor=playwright-mcp\n']) {
    write(root, '.pbai4devs/scripts/demo/SCRIPT.conf', invalid);
    rejected(root, { force: true }, /SCRIPT.conf exige/);
  }
  rmSync(join(root, '.pbai4devs/scripts/demo/SCRIPT.conf'));
  mkdirSync(join(root, '.pbai4devs/scripts/demo/SCRIPT.conf'));
  rejected(root, { force: true }, /SCRIPT.conf deve ser um arquivo/);
});

test('fontes JSON, referências e entradas de scripts inválidas falham antes de mutações', t => {
  const cases = [
    ['.pbai4devs/tools/demo/TOOL.json', '{invalid', /TOOL|JSON/],
    ['.pbai4devs/external-skills/CATALOG.json', '{invalid', /JSON/],
    ['.pbai4devs/external-skills/CATALOG.json', '{"schemaVersion":1,"skills":[]}', /externo/],
    ['.pbai4devs/commands/demo/COMMAND.md', '---\ndescription: Ref faltando.\n---\n\n# Demo\n\nLeia [ausente](../../scripts/missing/SCRIPT.mjs).\n', /ausente/],
    ['.pbai4devs/scripts/browser/SCRIPT.conf', 'executor=python\n', /SCRIPT.conf exige/],
    ['.pbai4devs/scripts/browser/SCRIPT.conf', 'executor=playwright-mcp\n', /ausente/],
    ['.pbai4devs/templates/demo/TEMPLATE.md', '# Sem metadados\n', /Frontmatter/],
  ];
  for (const [path, body, pattern] of cases) {
    const root = completeCatalogFixture(t);
    write(root, path, body);
    rejected(root, { force: true }, pattern);
  }
  const root = completeCatalogFixture(t);
  rmSync(join(root, '.pbai4devs/tools/demo/SCRIPT.mjs'));
  rejected(root, { force: true }, /SCRIPT|script|ausente/);
});

test('descobre principais aninhados sem transformar auxiliares em recursos', t => {
  const root = completeCatalogFixture(t);
  write(root, '.pbai4devs/skills/demo/nested/SKILL.md', '---\nname: nested\ndescription: Skill aninhada.\n---\n\n# Nested\n');
  write(root, '.pbai4devs/skills/demo/REFERENCE.md', '# Guia auxiliar\n');
  write(root, '.pbai4devs/scripts/demo/tests/fixtures/SKILL.md', '# Fixture, não skill compartilhada\n');
  const { catalog } = buildCatalog(root);
  assert.deepEqual(catalog.skills.map(entry => entry.id), ['demo', 'demo/nested']);
  assert.ok(catalog.skills[0].assets.includes('.pbai4devs/skills/demo/REFERENCE.md'));
  assert.ok(catalog.scripts[0].assets.includes('.pbai4devs/scripts/demo/tests/fixtures/SKILL.md'));
  run(root);
  assert.ok(existsSync(join(root, '.codex/skills/nested/SKILL.md')));
  assert.equal(existsSync(join(root, '.codex/skills/fixtures/SKILL.md')), false);
  assertCheckReadonly(root, {}, 0);
});

test('builder e gerenciador externo compartilham o mesmo contrato de validacao', t => {
  const cases = [
    [true, value => value],
    [true, value => ({ ...value, allowlist: ['Fixture/Skills'] })],
    [false, value => ({ ...value, allowlist: ['fixture/skills', 'Fixture/Skills'] })],
    [false, value => ({ ...value, skills: [{ ...value.skills[0], name: 'Invalid Name' }] })],
    [false, value => ({ ...value, allowlist: ['-fixture/skills'], skills: [{ ...value.skills[0], repository: '-fixture/skills' }] })],
    [false, value => ({ ...value, skills: [{ ...value.skills[0], path: 'skills/demo:other/SKILL.md' }] })],
    [false, value => ({ ...value, skills: [{ ...value.skills[0], licenseSource: 'https://example.com/LICENSE' }] })],
    [false, value => ({ ...value, skills: [{ ...value.skills[0], licenseSource: 'https://github.com/fixture/skills/blob/main/LICENSE' }] })],
    [true, value => ({ ...value, skills: [{ ...value.skills[0], licenseSource: `https://github.com/fixture/skills/blob/${'a'.repeat(40)}/LICENSE` }] })],
  ];
  for (const [valid, update] of cases) {
    const value = update(externalConfig());
    const root = fixture(t, true);
    write(root, '.pbai4devs/external-skills/CATALOG.json', JSON.stringify(value));
    const before = snapshot(root);
    if (valid) {
      assert.doesNotThrow(() => validateExternalCatalog(value));
      const built = buildCatalog(root);
      assert.equal(built.catalog.externalSkills[0].name, value.skills[0].name);
      assert.equal(built.catalog.externalSkills[0].repository, value.skills[0].repository);
    } else {
      assert.throws(() => validateExternalCatalog(value));
      assert.throws(() => buildCatalog(root));
      rejected(root, { force: true });
    }
    assert.deepEqual(snapshot(root), before);
  }
});

test('formatos por tipo preservam grupos e geram apenas o formato nativo escolhido', t => {
  const root = fixture(t, true);
  write(root, source, skill);
  write(root, '.pbai4devs/commands/projeto/check/COMMAND.md', '---\ndescription: Checagem.\n---\n\n# Checagem\n');
  write(root, '.pbai4devs/rules/projeto/style/RULE.md', '---\ntrigger: glob\nglobs: "**/*.js"\ndescription: Estilo.\n---\n\n# Estilo\n');
  write(root, '.pbai4devs/agents/review/security/AGENT.md', '---\nname: security\ndescription: Perfil.\n---\n\n# Perfil\n');
  write(root, '.pbai4devs/espelhos.conf', [
    'agente|.codex|agrupado', 'agente|.claude|agrupado', 'agente|.cursor|agrupado', 'agente|.github|agrupado', 'agente|.gemini|agrupado',
    'formato|.claude|skills|plano', 'formato|.claude|commands|arquivo',
    'formato|.cursor|rules|mdc', 'formato|.github|rules|instrucoes', 'formato|.github|commands|prompt', 'formato|.github|agents|agente',
    'formato|.gemini|commands|arquivo',
  ].join('\n') + '\n');
  run(root);
  assert.ok(existsSync(join(root, '.codex/skills/projeto/demo/SKILL.md')));
  assert.ok(existsSync(join(root, '.claude/skills/demo/SKILL.md')));
  assert.ok(existsSync(join(root, '.claude/commands/projeto/check.md')));
  assert.ok(existsSync(join(root, '.github/agents/review/security.agent.md')));
  assert.ok(existsSync(join(root, '.github/prompts/projeto/check.prompt.md')));
  assert.ok(existsSync(join(root, '.github/instructions/projeto/style.instructions.md')));
  assert.ok(existsSync(join(root, '.gemini/commands/projeto/check.toml')));
  assert.match(read(root, '.cursor/rules/projeto/style.mdc'), /globs: "\*\*\/\*\.js"/);
  assert.equal(existsSync(join(root, '.github/commands/projeto/check/COMMAND.md')), false);
  assert.equal(existsSync(join(root, '.cursor/rules/projeto/style/RULE.md')), false);
  assertCheckReadonly(root, {}, 0);
});

test('manifestos Antigravity acompanham skills, regras e agentes agrupados', t => {
  const root = fixture(t, true);
  write(root, source, skill);
  write(root, '.pbai4devs/rules/projeto/style/RULE.md', '---\ntrigger: always_on\ndescription: Estilo.\n---\n\n# Estilo\n');
  write(root, '.pbai4devs/agents/review/security/AGENT.md', '---\nname: security\ndescription: Perfil.\n---\n\n# Perfil\n');
  write(root, '.pbai4devs/espelhos.conf', 'agente|.agents|agrupado\ndescoberta|.agents|antigravity\n');
  const before = snapshot(root);
  assert.equal(run(root, { check: true, generateEntrypoints: true }).exitCode, 1);
  assert.deepEqual(snapshot(root), before);
  run(root, { generateEntrypoints: true });
  assert.deepEqual(JSON.parse(read(root, '.agents/skills.json')).entries, [{ path: '.agents/skills/projeto/demo' }]);
  assert.deepEqual(JSON.parse(read(root, '.agents/rules.json')).entries, [{ path: '.agents/rules/projeto/style/RULE.md' }]);
  assert.deepEqual(JSON.parse(read(root, '.agents/agents.json')).entries, [{ path: '.agents/agents/review/security/AGENT.md' }]);
  write(root, '.pbai4devs/skills/projeto/new-skill/SKILL.md', skill.replace('name: demo', 'name: new-skill'));
  run(root, { generateEntrypoints: true });
  assert.equal(JSON.parse(read(root, '.agents/skills.json')).entries.length, 2);
  rmSync(join(root, '.pbai4devs/skills/projeto/demo'), { recursive: true });
  run(root, { generateEntrypoints: true });
  assert.deepEqual(JSON.parse(read(root, '.agents/skills.json')).entries, [{ path: '.agents/skills/projeto/new-skill' }]);
  assert.equal(existsSync(join(root, '.agents/skills/projeto/demo')), false);
  assertCheckReadonly(root, { generateEntrypoints: true }, 0);
});

test('manifesto de descoberta humano permanece intacto mesmo com force', t => {
  const root = fixture(t, true);
  write(root, source, skill);
  write(root, '.pbai4devs/espelhos.conf', 'agente|.agents|agrupado\ndescoberta|.agents|antigravity\n');
  const custom = '{"entries":[{"path":".agents/skills/custom"}]}\n';
  write(root, '.agents/skills.json', custom);
  const result = run(root, { force: true, generateEntrypoints: true });
  assert.equal(read(root, '.agents/skills.json'), custom);
  assert.ok(result.preserved.some(item => item.path === '.agents/skills.json'));
  assert.ok(!result.ownedOutputs.includes('.agents/skills.json'));
  assertCheckReadonly(root, { generateEntrypoints: true }, 0);
});

test('formatos desconhecidos ou fora do cliente falham antes de mutar', t => {
  const root = fixture(t, true);
  write(root, source, skill);
  for (const row of [
    'formato|.missing|skills|agrupado', 'formato|.codex|unknown|agrupado',
    'formato|.codex|skills|mdc', 'formato|.codex|rules|prompt',
    'formato|.codex|skills|plano\nformato|.codex|skills|agrupado',
    'descoberta|.codex|antigravity', 'descoberta|.agents|antigravity',
  ]) {
    write(root, '.pbai4devs/espelhos.conf', 'agente|.codex|agrupado\n' + row + '\n');
    rejected(root);
  }
  assert.equal(resourcePath('.pbai4devs/commands/team/check/COMMAND.md', 'commands', 'arquivo'), 'commands/team/check.md');
  assert.throws(() => resourcePath(source, 'skills', 'arquivo'), /Skills/);
});
