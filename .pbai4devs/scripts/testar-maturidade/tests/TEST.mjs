import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
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

test('regeneração preserva pastas alheias e recusa sobrescrevê-las', t => {
  const { root, put, outputRoot } = fixture(t);
  put('examples/generated/anotacoes/keep.txt', 'preservado');
  put('examples/README.md', 'Guia humano.');
  const options = { sourceRoot: root, outputRoot, scenarios: [SCENARIOS[0]], initializeGit: false };
  prepareExamples(options); prepareExamples(options);
  assert.equal(readFileSync(join(outputRoot, 'anotacoes/keep.txt'), 'utf8'), 'preservado');
  assert.equal(readFileSync(join(root, 'examples/README.md'), 'utf8'), 'Guia humano.');
  put('examples/generated/descoberta/keep.txt', 'humano');
  assert.throws(() => prepareExamples({ ...options, scenarios: [SCENARIOS[1]] }), /não é gerenciado/);
  assert.equal(readFileSync(join(outputRoot, 'descoberta/keep.txt'), 'utf8'), 'humano');
  assert.throws(() => prepareExamples({ ...options, scenarios: [{ ...SCENARIOS[0], id: '../outside' }] }), /IDs únicos e seguros/);
});

test('destino padrão redefine apenas relatório próprio e mantém resultados fora do Git', t => {
  const { root, outputRoot } = fixture(t);
  const git = (...args) => {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', shell: false });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stderr); return result.stdout;
  };
  git('init', '--template=', '--quiet');
  const options = { sourceRoot: root, scenarios: [SCENARIOS[0]], initializeGit: false };
  const examples = prepareExamples(options);
  assert.equal(examples[0].root, join(outputRoot, SCENARIOS[0].id));
  const reportFile = join(outputRoot, 'REPORT.json');
  writeFileSync(reportFile, JSON.stringify({ owner: 'testar-maturidade', status: 'passed', results: [{ stale: true }] }));
  prepareExamples(options);
  assert.deepEqual(JSON.parse(readFileSync(reportFile)), { owner: 'testar-maturidade', version: 1,
    status: 'prepared', scenarios: [SCENARIOS[0].id], results: [] });
  assert.match(git('check-ignore', '--verbose', 'examples/generated/REPORT.json'), /examples\/generated\/\.gitignore:2:\*/);
  assert.match(git('check-ignore', '--verbose', 'examples/generated/somente-agentes/README.md'), /examples\/generated\/\.gitignore:2:\*/);
  const human = JSON.stringify({ owner: 'human', notes: 'preservar' });
  writeFileSync(reportFile, human);
  assert.throws(() => prepareExamples(options), /Relatório.*não pertence/);
  assert.equal(readFileSync(reportFile, 'utf8'), human);
});

test('preserva ignore humano e continua aceitando destinos legados', t => {
  const { root, put } = fixture(t);
  const options = { sourceRoot: root, scenarios: [SCENARIOS[0]], initializeGit: false };
  put('examples/generated/.gitignore', '!README.md\n');
  assert.throws(() => prepareExamples(options), /Ignore.*não pertence/);
  assert.equal(readFileSync(join(root, 'examples/generated/.gitignore'), 'utf8'), '!README.md\n');
  for (const target of ['tmp/examples', '.agent-tests/cases']) {
    const outputRoot = join(root, target);
    const [example] = prepareExamples({ ...options, outputRoot });
    assert.equal(example.root, join(outputRoot, SCENARIOS[0].id));
  }
});

test('preparação interrompida não conserva resultado anterior nem declara sucesso', t => {
  const { root, put, outputRoot } = fixture(t);
  const options = { sourceRoot: root, scenarios: [SCENARIOS[0]], initializeGit: false };
  prepareExamples(options);
  const report = join(outputRoot, 'REPORT.json');
  const index = join(outputRoot, 'README.md');
  writeFileSync(report, JSON.stringify({ owner: 'testar-maturidade', status: 'passed', results: [{}] }));
  writeFileSync(index, readFileSync(index, 'utf8').replaceAll('prepared', 'passed'));
  put('.pbai4devs/estado/agentdevkit.json', JSON.stringify({ blocks: null }));
  assert.throws(() => prepareExamples(options), /Estado da instalação/);
  assert.equal(existsSync(report), false);
  assert.match(readFileSync(index, 'utf8'), /status: preparing/);
  assert.doesNotMatch(readFileSync(index, 'utf8'), /status: passed|\| passed \|/);
  assert.doesNotMatch(readFileSync(index, 'utf8'), /\n{3,}/);
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
  put('.pbai4devs/estado/agentdevkit.json', JSON.stringify({ schemaVersion: 1, version: '1.0.0', language: 'pt', clients: ['codex'], files: {}, blocks: { 'AGENTS.md': createHash('sha256').update(block).digest('hex') } }));
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

test('checkout de fontes sem manifesto deriva clientes em memória', t => {
  const { root, put } = fixture(t);
  const manifest = join(root, '.pbai4devs/espelhos.conf');
  rmSync(manifest);
  assert.ok(registeredRoots(root).includes('.claude'));
  const source = '.pbai4devs/skills/projeto/demo/SKILL.md';
  assert.ok(resourceTargets(root, source).includes('.claude/skills/demo/SKILL.md'));
  put('.pbai4devs/estado/agentdevkit.json', JSON.stringify({ clients: ['claude'] }));
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
