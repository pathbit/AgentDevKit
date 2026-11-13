import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import childProcess, { spawnSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { projectRoot, requireNode } from '../../lib/runtime.mjs';
import { copyAgentStructure, prepareExamples as prepare, registeredRoots, resourceTargets, SCENARIOS } from '../SCRIPT.mjs';

// As fixtures pequenas isolam a cópia; o caso source-only usa o renderizador real.
const prepareExamples = options => prepare({ ...options, renderResources: () => {} });

requireNode();
function fixture(t) {
  const home = join(projectRoot, '.agent-tests'); mkdirSync(home, { recursive: true });
  const root = mkdtempSync(join(home, 'maturity-unit-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const put = (name, content = '') => { const file = join(root, name); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); return file; };
  put('.pbai4devs/espelhos.conf', 'agente|.codex|plano\nagente|.github|plano\nagente|.agents|plano\nagente|.agent|plano\nagente|.gemini|plano\ngitignore|.vscode\n');
  put('.pbai4devs/skills.json', '{"entries":[{"path":".pbai4devs/skills/projeto/demo"}]}');
  put('.pbai4devs/skills/projeto/demo/SKILL.md', '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
  put('.codex/skills/demo/SKILL.md', 'ponteiro'); put('.github/skills/demo/SKILL.md', 'ponteiro');
  for (const client of ['.agents', '.agent', '.gemini']) put(`${client}/skills/demo/SKILL.md`, 'ponteiro');
  put('.gemini/commands/demo.toml', 'description = "Fixture"\nprompt = "Leia o recurso compartilhado."\n');
  put('.vscode/settings.json', '{"fixture":true}\n');
  for (const name of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'README.md', '.gitattributes', '.editorconfig']) put(name, 'fixture\n');
  put('.gitignore', readFileSync(join(projectRoot, '.gitignore')));
  put('.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs', readFileSync(join(projectRoot, '.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs')));
  put('.pbai4devs/scripts/lib/runtime.mjs', readFileSync(join(projectRoot, '.pbai4devs/scripts/lib/runtime.mjs')));
  put('.pbai4devs/scripts/lib/state-path.mjs', readFileSync(join(projectRoot, '.pbai4devs/scripts/lib/state-path.mjs')));
  return { root, put, outputRoot: join(root, 'examples/generated') };
}

test('copia recursos e configurações, excluindo payloads, caches e segredos', t => {
  const { root, put } = fixture(t);
  put('.pbai4devs/tools/demo/TOOL.json', '{}'); put('.pbai4devs/tools/demo/SCRIPT.mjs', 'export {};'); put('.pbai4devs/tools/demo/README.md', '# Tool');
  put('.pbai4devs/templates/demo/TEMPLATE.md', '# Template');
  put('.pbai4devs/scripts/demo/tests/fixture.json', '{"keep":true}');
  put('.pbai4devs/external-skills/README.md', '# External'); put('.pbai4devs/external-skills/CATALOG.json', '{}');
  put('.env.example', 'PORT=3000\n');
  const excluded = ['.pbai4devs/tools/demo/.local/package/README.md', '.pbai4devs/tools/demo/download.exe', '.pbai4devs/tools/.cache/archive', '.pbai4devs/tools/bin/demo.mjs', '.pbai4devs/external-skills/.local/upstream/SKILL.md', '.pbai4devs/scripts/demo/node_modules/pkg/index.js', '.pbai4devs/scripts/demo/.env', '.pbai4devs/scripts/demo/report.log', '.env', '.codex/auth.json', '.github/credentials.json', '.vscode/settings.local.json', '.pbai4devs/scripts/demo/private.pem', '.pbai4devs/scripts/demo/config.local.toml', '.codex/.credentials.json', '.agents/.local/token.json', '.gemini/auth.json'];
  excluded.push('.pbai4devs/scripts/demo/playwright-report/index.html', '.pbai4devs/scripts/demo/TEST-RESULTS/report.json', '.pbai4devs/scripts/demo/TmP/generated.json', '.gemini/Temp/context.json', '.gemini/Sessions/state.json', '.pbai4devs/scripts/demo/history.jsonl', '.pbai4devs/skills/demo/.PLAYWRIGHT-MCP/session.json');
  excluded.push('.pbai4devs/bin/agentdevkit.mjs', '.pbai4devs/src/cli.mjs', '.pbai4devs/release/pipeline.mjs', '.pbai4devs/tests/cli.test.mjs', '.pbai4devs/DEVELOPMENT.md');
  excluded.push('bin/agentdevkit.mjs', 'src/cli.mjs', 'scripts/release/pipeline.mjs', 'tests/cli.test.mjs', 'examples/README.md');
  const kept = ['.pbai4devs/scripts/demo/tests/fixtures/cache/input.json', '.pbai4devs/scripts/demo/tests/fixtures/playwright-response.json', '.pbai4devs/templates/demo/compose.local.yml.template'];
  for (const file of kept) put(file, 'fixture versionavel');
  for (const file of excluded) put(file, 'não copiar');
  const destination = join(root, 'copy');
  const result = copyAgentStructure(root, destination);
  assert.ok(result.copiedFiles > 10);
  for (const file of excluded) assert.equal(existsSync(join(destination, file)), false, file);
  for (const file of excluded) assert.equal(readFileSync(join(root, file), 'utf8'), 'não copiar', `Origem alterada: ${file}`);
  for (const file of ['.pbai4devs/tools/demo/TOOL.json', '.pbai4devs/tools/demo/SCRIPT.mjs', '.pbai4devs/external-skills/CATALOG.json', '.pbai4devs/templates/demo/TEMPLATE.md', '.pbai4devs/scripts/demo/tests/fixture.json', '.vscode/settings.json', '.gitattributes', '.env.example', '.agents/skills/demo/SKILL.md', '.agent/skills/demo/SKILL.md', '.gemini/skills/demo/SKILL.md', '.gemini/commands/demo.toml', 'GEMINI.md']) assert.ok(existsSync(join(destination, file)), file);
  for (const file of kept) assert.equal(readFileSync(join(destination, file), 'utf8'), 'fixture versionavel');
  assert.deepEqual(result.roots, ['.pbai4devs', '.codex', '.github', '.agents', '.agent', '.gemini', '.vscode']);
});

test('destino explícito existente é recusado sem alterar projetos humanos ou gerados', t => {
  const { root, put, outputRoot } = fixture(t);
  put('examples/generated/anotacoes/keep.txt', 'preservado');
  put('examples/README.md', 'Guia humano.');
  const options = { sourceRoot: root, outputRoot, scenarios: [SCENARIOS[0]], initializeGit: false };
  assert.throws(() => prepareExamples(options), /saída já existe/);
  assert.equal(readFileSync(join(outputRoot, 'anotacoes/keep.txt'), 'utf8'), 'preservado');
  assert.equal(readFileSync(join(root, 'examples/README.md'), 'utf8'), 'Guia humano.');
  const output = join(outputRoot, 'nova-execucao');
  const [example] = prepareExamples({ ...options, outputRoot: output });
  writeFileSync(join(example.root, 'anotacao-humana.txt'), 'não apagar');
  const report = readFileSync(join(output, 'REPORT.json'));
  assert.throws(() => prepareExamples({ ...options, outputRoot: output, scenarios: [SCENARIOS[1]] }), /saída já existe/);
  assert.throws(() => prepareExamples({ ...options, outputRoot: join(example.root, 'nova'), scenarios: [SCENARIOS[1]] }), /execução anterior/);
  assert.deepEqual(readFileSync(join(output, 'REPORT.json')), report);
  assert.equal(readFileSync(join(example.root, 'anotacao-humana.txt'), 'utf8'), 'não apagar');
  assert.throws(() => prepareExamples({ ...options, outputRoot: join(outputRoot, 'invalid'), scenarios: [{ ...SCENARIOS[0], id: '../outside' }] }), /IDs únicos e seguros/);
  assert.equal(existsSync(join(outputRoot, 'invalid')), false);
});

test('troca de ancestral por symlink antes da criação não escreve no destino externo', t => {
  const { root, outputRoot } = fixture(t);
  const outside = mkdtempSync(join(dirname(root), 'maturity-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  mkdirSync(outputRoot, { recursive: true });
  const externalSentinel = join(outside, 'sentinel.txt');
  writeFileSync(externalSentinel, 'externo preservado\n');
  const linkProbe = join(root, 'probe-link');
  try { symlinkSync(outside, linkProbe, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('Sem permissão para links simbólicos.'); return; } throw error; }
  unlinkSync(linkProbe);
  const canonical = realpathSync(outputRoot);
  const original = childProcess.spawnSync;
  let injected = false;
  childProcess.spawnSync = function (file, args, options) {
    if (!injected && file === process.execPath && args?.[0] === '-e' && options?.cwd === canonical) {
      injected = true;
      renameSync(outputRoot, `${outputRoot}-original`);
      symlinkSync(outside, outputRoot, process.platform === 'win32' ? 'junction' : 'dir');
    }
    return original.call(this, file, args, options);
  };
  syncBuiltinESMExports();
  try {
    assert.throws(() => prepareExamples({ sourceRoot: root, outputRoot: join(outputRoot, 'nova'), scenarios: [SCENARIOS[0]], initializeGit: false }), /diretório exclusivo|ancestral|link simbólico/i);
    assert.equal(injected, true);
    assert.deepEqual(readdirSync(outside), ['sentinel.txt']);
    assert.equal(readFileSync(externalSentinel, 'utf8'), 'externo preservado\n');
  } finally {
    childProcess.spawnSync = original;
    syncBuiltinESMExports();
  }
});

test('cada destino padrão é exclusivo, preserva provas anteriores e permanece ignorado', t => {
  const { root, outputRoot } = fixture(t);
  const git = (...args) => {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', shell: false });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stderr); return result.stdout;
  };
  git('init', '--template=', '--quiet');
  const options = { sourceRoot: root, scenarios: [SCENARIOS[0]], initializeGit: false };
  const [first] = prepareExamples(options);
  const firstOutput = dirname(first.root);
  assert.equal(dirname(firstOutput), outputRoot);
  const human = 'Prova humana que não pode ser apagada.\n';
  writeFileSync(join(first.root, 'human.txt'), human);
  const reportFile = join(firstOutput, 'REPORT.json');
  const oldReport = readFileSync(reportFile);
  const [second] = prepareExamples(options);
  assert.notEqual(dirname(second.root), firstOutput);
  assert.equal(readFileSync(join(first.root, 'human.txt'), 'utf8'), human);
  assert.deepEqual(readFileSync(reportFile), oldReport);
  for (const file of [join(firstOutput, 'REPORT.json'), join(first.root, 'README.md'), join(second.root, 'README.md')]) {
    git('check-ignore', '--quiet', '--', file);
  }
});

test('preserva ignore humano em pastas ancestrais e aceita destinos novos permitidos', t => {
  const { root, put } = fixture(t);
  const options = { sourceRoot: root, scenarios: [SCENARIOS[0]], initializeGit: false };
  put('examples/generated/.gitignore', '!README.md\n');
  put('examples/generated/.maturity-suite.json', '{"owner":"testar-maturidade"}\n');
  put('examples/generated/somente-agentes/.maturity-case.json', '{"owner":"testar-maturidade","id":"somente-agentes"}\n');
  put('examples/generated/somente-agentes/anotacao.txt', 'Conteúdo humano anterior.\n');
  put('examples/generated/REPORT.json', '{"resultado":"anterior"}\n');
  const [generated] = prepareExamples(options);
  assert.equal(dirname(dirname(generated.root)), join(root, 'examples/generated'));
  assert.equal(readFileSync(join(root, 'examples/generated/.gitignore'), 'utf8'), '!README.md\n');
  assert.equal(readFileSync(join(root, 'examples/generated/somente-agentes/anotacao.txt'), 'utf8'), 'Conteúdo humano anterior.\n');
  assert.equal(readFileSync(join(root, 'examples/generated/REPORT.json'), 'utf8'), '{"resultado":"anterior"}\n');
  for (const target of ['tmp/examples/caso-novo', '.agent-tests/cases']) {
    const outputRoot = join(root, target);
    const [example] = prepareExamples({ ...options, outputRoot });
    assert.equal(example.root, join(outputRoot, SCENARIOS[0].id));
  }
});

test('preparação interrompida não altera resultado anterior nem declara sucesso', t => {
  const { root, put, outputRoot } = fixture(t);
  const options = { sourceRoot: root, scenarios: [SCENARIOS[0]], initializeGit: false };
  const [first] = prepareExamples(options);
  const firstOutput = dirname(first.root);
  const report = join(firstOutput, 'REPORT.json');
  const previous = readFileSync(report);
  put('.pbai4devs/state/agentdevkit.json', JSON.stringify({ blocks: null }));
  assert.throws(() => prepareExamples(options), /Estado da instalação/);
  assert.deepEqual(readFileSync(report), previous);
  const failed = readdirSync(outputRoot).filter(name => join(outputRoot, name) !== firstOutput);
  assert.equal(failed.length, 1);
  const index = join(outputRoot, failed[0], 'README.md');
  assert.match(readFileSync(index, 'utf8'), /status: preparing/);
  assert.equal(existsSync(join(outputRoot, failed[0], 'REPORT.json')), false);
  assert.doesNotMatch(readFileSync(index, 'utf8'), /status: passed|\| passed \|/);
});

test('usa entradas distribuídas do hub e mantém fallback legado', t => {
  const { root, put } = fixture(t);
  const template = '---\ndescription: Entrada genérica.\n---\n\n# Agentes do projeto\n';
  put('AGENTS.md', '# Produto do distribuidor\n\n[PRD](docs/prd.md)\n');
  put('.pbai4devs/templates/entrypoints/AGENTS.md', template);
  const destination = join(root, 'copy');
  const copied = copyAgentStructure(root, destination);
  assert.equal(readFileSync(join(destination, 'AGENTS.md'), 'utf8'), template);
  assert.equal(readFileSync(join(destination, 'CLAUDE.md'), 'utf8'), 'fixture\n');
  assert.equal(copied.entrypoints['AGENTS.md'], '.pbai4devs/templates/entrypoints/AGENTS.md');
  assert.equal(copied.entrypoints['CLAUDE.md'], 'CLAUDE.md');
  assert.equal(readFileSync(join(root, 'AGENTS.md'), 'utf8'), '# Produto do distribuidor\n\n[PRD](docs/prd.md)\n');
});

test('cópias respeitam clientes e entradas de instalações parciais', async t => {
  for (const [client, manifest, entrypoints] of [
    ['claude', 'agente|.claude|plano\n', ['AGENTS.md', 'CLAUDE.md']],
    ['codex', 'agente|.codex|agrupado\nagente|.agents|agrupado\n', ['AGENTS.md']],
  ]) await t.test(client, t => {
    const { root, put } = fixture(t);
    put('.pbai4devs/espelhos.conf', manifest);
    put('.claude/skills/demo/SKILL.md', 'ponteiro');
    for (const name of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) {
      put(`.pbai4devs/templates/entrypoints/${name}`, `# Modelo ${name}\n`);
      if (!entrypoints.includes(name)) rmSync(join(root, name));
    }
    const destination = join(root, 'copy');
    const copied = copyAgentStructure(root, destination);
    assert.deepEqual(Object.keys(copied.entrypoints), entrypoints);
    for (const name of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) {
      assert.equal(existsSync(join(destination, name)), entrypoints.includes(name), name);
      assert.ok(existsSync(join(destination, '.pbai4devs/templates/entrypoints', name)));
    }
    assert.equal(existsSync(join(destination, '.vscode')), false);
    assert.equal(existsSync(join(root, '.vscode/settings.json')), true);
    assert.equal(existsSync(join(destination, '.github')), false);
    assert.equal(existsSync(join(destination, '.gemini')), false);
    if (client === 'claude') {
      assert.deepEqual(copied.roots, ['.pbai4devs', '.claude']);
      assert.equal(existsSync(join(destination, '.codex')), false);
      assert.equal(existsSync(join(destination, '.agents')), false);
    } else {
      assert.deepEqual(copied.roots, ['.pbai4devs', '.codex', '.agents']);
      assert.equal(existsSync(join(destination, '.claude')), false);
    }
  });
});

test('configurações do editor exigem registro explícito no manifesto', t => {
  const { root, put } = fixture(t);
  put('.pbai4devs/espelhos.conf', 'agente|.codex|plano\nagente|.vscode|plano\ngitignore|.vscode\n');
  const destination = join(root, 'copy');
  const copied = copyAgentStructure(root, destination);
  assert.deepEqual(copied.roots, ['.pbai4devs', '.codex', '.vscode']);
  assert.equal(readFileSync(join(destination, '.vscode/settings.json'), 'utf8'), '{"fixture":true}\n');
});

test('instalação parcial preserva entradas próprias e blocos editados', t => {
  const { root, put } = fixture(t);
  put('.pbai4devs/espelhos.conf', 'agente|.codex|agrupado\nagente|.agents|agrupado\n');
  const block = '<!-- BEGIN AGENTDEVKIT -->\nEntrada gerenciada.\n<!-- END AGENTDEVKIT -->';
  put('.pbai4devs/state/agentdevkit.json', JSON.stringify({ schemaVersion: 1, version: '1.0.0', language: 'pt', clients: ['codex'], files: {}, blocks: { 'AGENTS.md': createHash('sha256').update(block).digest('hex') } }));
  put('AGENTS.md', `# Agentes\n\n${block}\n`);
  const human = '# Claude pessoal\r\n\r\nPreservar byte a byte: ação.\r\n';
  put('CLAUDE.md', human);
  rmSync(join(root, 'GEMINI.md'));
  for (const name of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) put(`.pbai4devs/templates/entrypoints/${name}`, `# Modelo ${name}\n`);
  const destination = join(root, 'copy');
  const copied = copyAgentStructure(root, destination);
  assert.equal(readFileSync(join(destination, 'AGENTS.md'), 'utf8'), '# Modelo AGENTS.md\n');
  assert.deepEqual(readFileSync(join(destination, 'CLAUDE.md')), Buffer.from(human));
  assert.doesNotMatch(readFileSync(join(destination, 'CLAUDE.md'), 'utf8'), /BEGIN AGENTDEVKIT/);
  assert.equal(copied.entrypoints['AGENTS.md'], '.pbai4devs/templates/entrypoints/AGENTS.md');
  assert.equal(copied.entrypoints['CLAUDE.md'], 'CLAUDE.md');
  assert.equal(existsSync(join(destination, 'GEMINI.md')), false);
  assert.equal(existsSync(join(destination, '.claude')), false);
  assert.equal(existsSync(join(destination, '.vscode')), false);
  put('AGENTS.md', `# Agentes\n\n${block.replace('gerenciada', 'editada')}\n`);
  const changed = join(root, 'changed-copy');
  copyAgentStructure(root, changed);
  assert.deepEqual(readFileSync(join(changed, 'AGENTS.md')), readFileSync(join(root, 'AGENTS.md')));
});

test('localiza apontamentos pelo formato de cada tipo e por overrides nativos', t => {
  const { root, put } = fixture(t);
  put('.pbai4devs/espelhos.conf', [
    'agente|.claude|agrupado', 'formato|.claude|skills|plano',
    'agente|.codex|plano', 'formato|.codex|skills|agrupado',
    'nativo|.codex/skills/alias/SKILL.md|.pbai4devs/skills/projeto/demo/SKILL.md',
  ].join('\n') + '\n');
  assert.deepEqual(resourceTargets(root, '.pbai4devs/skills/projeto/demo/SKILL.md'), [
    '.claude/skills/demo/SKILL.md', '.codex/skills/projeto/demo/SKILL.md', '.codex/skills/alias/SKILL.md',
  ]);
});

test('respeita tipo sem espelho e o formato TOML nativo dos comandos Gemini', t => {
  const { root, put } = fixture(t);
  put('.pbai4devs/espelhos.conf', [
    'agente|.agents|agrupado',
    'agente|.codex|agrupado', 'formato|.codex|skills|nenhum',
    'agente|.gemini|agrupado', 'formato|.gemini|commands|arquivo',
  ].join('\n') + '\n');
  const skill = resourceTargets(root, '.pbai4devs/skills/projeto/demo/SKILL.md');
  assert.deepEqual(skill, ['.agents/skills/projeto/demo/SKILL.md', '.gemini/skills/projeto/demo/SKILL.md']);
  assert.ok(!skill.some(target => target.startsWith('.codex/')));
  const command = resourceTargets(root, '.pbai4devs/commands/projeto/demo/COMMAND.md', 'commands');
  assert.ok(command.includes('.codex/commands/projeto/demo/COMMAND.md'));
  assert.ok(command.includes('.gemini/commands/projeto/demo.toml'));
  assert.ok(!command.includes('.gemini/commands/projeto/demo.md'));
});

test('identifica o fallback Codex apenas para a skill cuja rota primária está obstruída', t => {
  const { root, put } = fixture(t);
  put('.pbai4devs/espelhos.conf', [
    'agente|.agents|agrupado', 'agente|.codex|agrupado',
    'formato|.codex|skills|nenhum', 'fallback|.codex|.agents|skills',
  ].join('\n') + '\n');
  const blocked = '.pbai4devs/skills/projeto/demo/SKILL.md';
  const available = '.pbai4devs/skills/projeto/outra/SKILL.md';
  const target = join(root, '.agents/skills/projeto/demo/SKILL.md');
  mkdirSync(target, { recursive: true });
  assert.deepEqual(resourceTargets(root, blocked), ['.codex/skills/projeto/demo/SKILL.md']);
  assert.deepEqual(resourceTargets(root, available), ['.agents/skills/projeto/outra/SKILL.md']);
  rmSync(target, { recursive: true });
  assert.deepEqual(resourceTargets(root, blocked), ['.agents/skills/projeto/demo/SKILL.md']);
});

test('checkout de fontes sem manifesto deriva clientes em memória', t => {
  const { root, put } = fixture(t);
  const manifest = join(root, '.pbai4devs/espelhos.conf');
  rmSync(manifest);
  assert.ok(registeredRoots(root).includes('.claude'));
  const source = '.pbai4devs/skills/projeto/demo/SKILL.md';
  assert.ok(resourceTargets(root, source).includes('.claude/skills/demo/SKILL.md'));
  put('.pbai4devs/state/agentdevkit.json', JSON.stringify({ clients: ['claude'] }));
  assert.deepEqual(registeredRoots(root), ['.claude']);
  assert.deepEqual(resourceTargets(root, source), ['.claude/skills/demo/SKILL.md']);
  assert.equal(existsSync(manifest), false);
});

test('prepare gera apontamentos reais mesmo sem pastas de clientes na origem', t => {
  const { root } = fixture(t);
  const sourceRoot = join(root, 'source-only');
  copyAgentStructure(projectRoot, sourceRoot);
  const roots = registeredRoots(sourceRoot);
  for (const client of roots) rmSync(join(sourceRoot, client), { recursive: true, force: true });
  const [example] = prepare({ sourceRoot, scenarios: [SCENARIOS[0]], initializeGit: false });
  const skill = '.pbai4devs/skills/projeto/criar-skill/SKILL.md';
  for (const target of resourceTargets(sourceRoot, skill)) assert.ok(existsSync(join(example.root, target)), target);
  for (const client of roots) assert.equal(existsSync(join(sourceRoot, client)), false, client);
  for (const file of ['src/cli.mjs', 'bin/agentdevkit.mjs', 'scripts/release/pipeline.mjs', 'tests/cli.test.mjs']) assert.equal(existsSync(join(example.root, file)), false, file);
});

test('saída não pode sobrepor recursos de origem nem escapar das áreas de teste', t => {
  const { root } = fixture(t);
  const original = readFileSync(join(root, '.pbai4devs/espelhos.conf'), 'utf8');
  for (const location of ['.pbai4devs/generated', '.github', '.codex', '.agents', '.agent', '.gemini', 'examples', 'examples/custom', 'tmp', 'output', '../outside']) {
    assert.throws(() => prepareExamples({ sourceRoot: root, outputRoot: join(root, location), scenarios: [SCENARIOS[0]], initializeGit: false }), /Saída permitida/);
    assert.equal(readFileSync(join(root, '.pbai4devs/espelhos.conf'), 'utf8'), original);
    assert.equal(existsSync(join(root, location, '.maturity-suite.json')), false);
  }
  const outputRoot = join(root, '.agent-tests/permitted');
  const examples = prepareExamples({ sourceRoot: root, outputRoot, scenarios: [SCENARIOS[0]], initializeGit: false });
  assert.equal(examples.length, 1);
  assert.equal(readFileSync(join(root, '.pbai4devs/espelhos.conf'), 'utf8'), original);
});

test('oito cópias exercitam os seis níveis e preservam layouts legado/monorepo', t => {
  const { root, outputRoot } = fixture(t);
  const examples = prepareExamples({ sourceRoot: root, outputRoot, initializeGit: false });
  assert.equal(examples.length, 8);
  for (const example of examples) {
    assert.doesNotMatch(readFileSync(join(example.root, 'README.md'), 'utf8'), /\n{3,}/);
    const result = spawnSync(process.execPath, ['.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs'], { cwd: example.root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.maturity.level, example.expected, example.id);
    assert.equal(report.contract.complete, example.complete, example.id);
  }
  const legacy = examples.find(example => example.id === 'legado');
  assert.ok(existsSync(join(legacy.root, 'legacy/server.mjs')));
  assert.match(readFileSync(join(legacy.root, 'package.json'), 'utf8'), /dev:old/);
  const monorepo = examples.find(example => example.id === 'monorepo');
  assert.ok(existsSync(join(monorepo.root, 'apps/painel com espaços/package.json')));
  assert.ok(existsSync(join(monorepo.root, 'packages/cálculo/package.json')));
  assert.equal(existsSync(join(monorepo.root, 'src')), false);
});

test('cenários configurados completam fixtures ausentes sem alterar a origem ou arquivos copiados', t => {
  const { root, put, outputRoot } = fixture(t);
  const files = ['.gitignore', '.gitattributes', '.editorconfig'];
  const source = Object.fromEntries(files.map(file => [file, `# configuração própria de ${file}\n`]));
  // As duas fontes ausentes reproduzem uma instalação distribuída; o arquivo
  // existente prova que a preparação não substitui configurações copiadas.
  rmSync(join(root, '.gitattributes'));
  rmSync(join(root, '.editorconfig'));
  put('.gitignore', source['.gitignore']);
  const scenarios = SCENARIOS.filter(example => ['app-configurada', 'manutencao', 'app-inicial'].includes(example.id));
  const examples = prepareExamples({ sourceRoot: root, outputRoot: join(outputRoot, 'parcial'), scenarios, initializeGit: false });
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), source['.gitignore']);
  for (const file of ['.gitattributes', '.editorconfig']) assert.equal(existsSync(join(root, file)), false, file);
  for (const example of examples) {
    assert.equal(readFileSync(join(example.root, '.gitignore'), 'utf8'), source['.gitignore']);
    if (!example.configured) {
      for (const file of ['.gitattributes', '.editorconfig']) assert.equal(existsSync(join(example.root, file)), false, file);
      continue;
    }
    for (const file of ['.gitattributes', '.editorconfig']) assert.ok(readFileSync(join(example.root, file), 'utf8').trim(), file);
    const inspected = spawnSync(process.execPath, ['.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs', '--check'], { cwd: example.root, encoding: 'utf8' });
    assert.ifError(inspected.error);
    assert.equal(inspected.status, 0, inspected.stderr || inspected.stdout);
    assert.equal(JSON.parse(inspected.stdout).contract.complete, true, example.id);
  }
  // Retest with every file absent, as in the released npm tarball.
  rmSync(join(root, '.gitignore'));
  const configured = scenarios.find(example => example.id === 'app-configurada');
  const missing = prepareExamples({ sourceRoot: root, outputRoot: join(outputRoot, 'ausentes'), scenarios: [configured], initializeGit: false })[0];
  for (const file of files) {
    assert.equal(existsSync(join(root, file)), false, file);
    assert.ok(readFileSync(join(missing.root, file), 'utf8').trim(), file);
  }
  for (const file of files) put(file, source[file]);
  const preserved = prepareExamples({ sourceRoot: root, outputRoot: join(outputRoot, 'presentes'), scenarios: [configured], initializeGit: false })[0];
  for (const file of files) {
    assert.equal(readFileSync(join(root, file), 'utf8'), source[file]);
    assert.equal(readFileSync(join(preserved.root, file), 'utf8'), source[file]);
  }
});

test('fixtures padrão, legado e monorepo executam HTTP real e encerram', t => {
  const { root, outputRoot } = fixture(t);
  const scenarios = SCENARIOS.filter(example => ['app-inicial', 'legado', 'monorepo'].includes(example.id));
  const examples = prepareExamples({ sourceRoot: root, outputRoot, scenarios, initializeGit: false });
  for (const example of examples) {
    const environment = { ...process.env }; delete environment.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ['--test', ...example.application.tests], { cwd: example.root, env: environment, encoding: 'utf8', timeout: 30000 });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /AC-001/); assert.match(result.stdout, /AC-002/);
    if (example.id === 'monorepo') assert.match(result.stdout, /AC-003/);
  }
});

test('recusa links de origem e de saída, inclusive quebrados', t => {
  const { root, put, outputRoot } = fixture(t);
  const target = put('payload.txt', 'fora da cópia');
  const link = join(root, '.pbai4devs/scripts/alias.mjs');
  try { symlinkSync(target, link); }
  catch (error) { if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) { t.skip('Sem permissão para criar symlink de arquivo.'); return; } throw error; }
  assert.throws(() => copyAgentStructure(root, join(root, 'copy')), /recusa links/);
  rmSync(link); symlinkSync(join(root, 'missing.mjs'), link);
  assert.throws(() => copyAgentStructure(root, join(root, 'copy')), /recusa links/);
  rmSync(link);
  mkdirSync(dirname(outputRoot), { recursive: true });
  symlinkSync(join(root, 'missing-output'), outputRoot, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => prepareExamples({ sourceRoot: root, outputRoot, scenarios: [SCENARIOS[0]], initializeGit: false }), /não pode ser link/);
});
