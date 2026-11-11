import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { projectRoot, requireNode } from '../../lib/runtime.mjs';
import { checkFrontmatter, checkLint, checkSynchronization, checkCatalog, checkResourceReferences, collectMarkdown, localLinkTargets, registryRoots, resourcePaths, verifyResources } from '../SCRIPT.mjs';
import { buildCatalog } from '../../lib/catalog.mjs';
import { platformKey, toolWrapper } from '../../preparar-ferramentas/SCRIPT.mjs';
import './ambiente-local.mjs';

requireNode();
const markdown = '# Exemplo\n';
const document = body => `---\ndescription: Fixture.\n---\n\n${body}`;
function fixture(t, prefix = 'verificar-recursos-') {
  const home = join(projectRoot, '.agent-tests');
  mkdirSync(home, { recursive: true });
  const root = mkdtempSync(join(home, prefix));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = (name, content = document(markdown)) => {
    const path = join(root, name);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, content);
    return path;
  };
  return { root, file };
}
function resourceFixture(t) {
  const context = fixture(t);
  context.file('.pbai4devs/espelhos.conf', 'agente|.codex|plano\n');
  context.file('.pbai4devs/skills/README.md');
  context.file('.pbai4devs/skills/exemplo/SKILL.md');
  context.file('.pbai4devs/tools/README.md');
  context.file('.pbai4devs/tools/demo/TOOL.json', JSON.stringify({ name: 'demo', description: 'CLI de prova.', group: 'base', source: 'https://github.com/owner/demo', download: { provider: 'npm', package: 'demo', registry: 'https://registry.npmjs.org/', repository: 'owner/demo', channel: 'latest' }, platforms: [platformKey()], scripts: { entry: 'SCRIPT.mjs' }, probe: ['--version'] }));
  context.file('.pbai4devs/tools/demo/SCRIPT.mjs', toolWrapper('demo'));
  context.file('.pbai4devs/tools/demo/README.md');
  context.file('.codex/skills/exemplo/SKILL.md', document('# Exemplo\n\n[Origem](../../../.pbai4devs/skills/exemplo/SKILL.md)\n'));
  return context;
}
const verify = root => verifyResources({ root, synchronize() {}, catalogCheck() {}, lint: () => ['lint=fixture'] });

function writeCatalog(root) {
  for (const [path, content] of buildCatalog(root).outputs) { mkdirSync(join(root, path, '..'), { recursive: true }); writeFileSync(join(root, path), content); }
}

test('confere recursos sem percorrer downloads ou modificar a fixture', t => {
  const { root, file } = resourceFixture(t);
  file('.pbai4devs/tools/demo/.local/versions/package/README.md', 'invalido');
  file('.pbai4devs/tools/bin/README.md', 'invalido');
  file('.pbai4devs/tools/.cache/README.md', 'invalido');
  file('.pbai4devs/tools/npm-cache/README.md', 'invalido');
  const before = readdirSync(root, { recursive: true });
  const result = verify(root);
  assert.deepEqual(result.messages, ['lint=fixture', 'recursos=passed']);
  assert.ok(result.files.includes(join(root, '.pbai4devs/tools/demo/README.md')));
  assert.ok(!result.files.some(path => path.includes('.local')));
  assert.deepEqual(readdirSync(root, { recursive: true }), before);
});

test('ignora resultados locais em qualquer caixa e ainda verifica fixtures comuns', t => {
  const { root, file } = resourceFixture(t);
  for (const path of ['.pbai4devs/TmP/invalid.md', '.pbai4devs/skills/exemplo/.PLAYWRIGHT-MCP/invalid.md', '.pbai4devs/skills/exemplo/playwright-report/invalid.md', '.pbai4devs/skills/exemplo/TEST-RESULTS/invalid.md', '.codex/skills/exemplo/.agent-tests/invalid.md']) file(path, '# Resultado sem frontmatter\n');
  const kept = file('.pbai4devs/skills/exemplo/fixtures/cache/input.md');
  assert.ok(verify(root).files.includes(kept));
  file('.pbai4devs/skills/exemplo/fixtures/cache/input.md', '# Fixture invalida\n');
  assert.throws(() => verify(root), /fixtures\/cache\/input.md/);
});

test('catalogo derivado cobre recursos e detecta JSON editado sem reescrever', t => {
  const { root, file } = resourceFixture(t);
  file('.pbai4devs/commands/inspecionar/COMMAND.md', document('# Inspecionar\n\n[Script](../../scripts/inspecionar/SCRIPT.mjs).\n'));
  file('.pbai4devs/scripts/README.md'); file('.pbai4devs/scripts/inspecionar/README.md');
  file('.pbai4devs/scripts/inspecionar/SCRIPT.mjs', 'export {};\n');
  file('.pbai4devs/templates/README.md'); file('.pbai4devs/templates/exemplo/TEMPLATE.md');
  file('.pbai4devs/tools/demo/.local/versions/upstream/README.md', 'nao verificar');
  writeCatalog(root);
  const catalog = checkCatalog(root);
  assert.equal(catalog.commands[0].id, 'inspecionar'); assert.equal(catalog.scripts[0].id, 'inspecionar');
  assert.equal(catalog.templates[0].id, 'exemplo'); assert.equal(catalog.tools[0].name, 'demo');
  assert.ok(!JSON.stringify(catalog).includes('upstream'));
  const path = join(root, '.pbai4devs/catalog.json'); writeFileSync(path, '{"editado":true}\n');
  assert.throws(() => checkCatalog(root), /Catalogo divergente/);
  assert.equal(readFileSync(path, 'utf8'), '{"editado":true}\n');
  writeCatalog(root);
  const native = join(root, '.pbai4devs/skills.json'); writeFileSync(native, '{"entries":[]}\n');
  assert.throws(() => checkCatalog(root), /skills.json/);
});

test('catalogo recusa TOOL incompleto, ponte ausente e referencia de comando quebrada', t => {
  const { root, file } = resourceFixture(t); writeCatalog(root);
  rmSync(join(root, '.pbai4devs/tools/demo/SCRIPT.mjs'));
  assert.throws(() => checkCatalog(root), /Script ausente/);
  file('.pbai4devs/tools/demo/SCRIPT.mjs', toolWrapper('demo'));
  file('.pbai4devs/tools/demo/TOOL.json', '{}'); assert.throws(() => checkCatalog(root), /Nome/);
  rmSync(join(root, '.pbai4devs/tools/demo'), { recursive: true });
  file('.pbai4devs/commands/quebrado/COMMAND.md', document('# Quebrado\n\n[Script](../../scripts/ausente/SCRIPT.mjs).\n'));
  assert.throws(() => checkCatalog(root), /Referencia ausente/);
});

test('caminhos concretos em comandos e exemplos apontam para arquivos reais', t => {
  const { root, file } = resourceFixture(t);
  file('.pbai4devs/scripts/tarefa/SCRIPT.mjs', 'export {};\n');
  const command = file('.pbai4devs/commands/tarefa/COMMAND.md', document('# Tarefa\n\n```console\nnode .pbai4devs/scripts/tarefa/SCRIPT.mjs check\n```\n\nModelo: `.pbai4devs/templates/<nome>/TEMPLATE.md`.\n'));
  checkResourceReferences(root, [command]);
  assert.deepEqual(resourcePaths('`.pbai4devs/tools/demo/.local/CURRENT.json` e `.pbai4devs/tools/bin/demo.mjs`'), []);
  assert.deepEqual(resourcePaths('`node .pbai4devs/scripts/tarefa/SCRIPT.mjs`'), ['.pbai4devs/scripts/tarefa/SCRIPT.mjs']);
  rmSync(join(root, '.pbai4devs/scripts/tarefa/SCRIPT.mjs'));
  assert.throws(() => checkResourceReferences(root, [command]), /Recurso ausente/);
});

test('external-skills mantém seu guia validado e só oculta o payload .local', t => {
  const { root, file } = resourceFixture(t);
  const guide = file('.pbai4devs/external-skills/README.md');
  file('.pbai4devs/external-skills/CATALOG.json', '{"entries":[]}');
  for (let index = 0; index < 80; index++) file(`.pbai4devs/external-skills/.local/upstream-${index}/SKILL.md`, '# Upstream sem frontmatter\n');
  const result = verify(root);
  assert.ok(result.files.includes(guide));
  assert.ok(!result.files.some(path => /external-skills[\\/]\.local/.test(path)));
  file('.pbai4devs/external-skills/README.md', '# Guia sem frontmatter\n');
  assert.throws(() => verify(root), /Frontmatter\/H1 invalido: .pbai4devs\/external-skills\/README.md/);
  file('.pbai4devs/external-skills/README.md');
  file('.pbai4devs/external-skills/notes/guia.md', '# Documento externo ao payload\n');
  assert.throws(() => verify(root), /Frontmatter\/H1 invalido: .pbai4devs\/external-skills\/notes\/guia.md/);
  rmSync(join(root, '.pbai4devs/external-skills/notes'), { recursive: true });
  file('.pbai4devs/skills/.local/guia.md', '# Este .local continua sendo verificado\n');
  assert.throws(() => verify(root), /Frontmatter\/H1 invalido: .pbai4devs\/skills\/.local\/guia.md/);
});

test('external-skills é auxiliar proibido nas pastas dos agentes', t => {
  const { root, file } = resourceFixture(t);
  file('.codex/external-skills/CATALOG.json', '{"entries":[]}');
  assert.throws(() => verify(root), /Auxiliar indevido em .codex\/external-skills/);
});

const symlinkCases = [
  ['README.md', 'file', false],
  ['.pbai4devs', 'dir', true],
  ['.pbai4devs/espelhos.conf', 'file', true],
  ['.pbai4devs/espelhos.conf', 'file', false],
  ['.pbai4devs/tools', 'dir', true],
  ['.pbai4devs/tools', 'dir', false],
  ['.pbai4devs/tools/demo', 'dir', true],
  ['.pbai4devs/tools/demo', 'dir', false],
  ['.pbai4devs/tools/demo/README.md', 'file', false],
  ['.pbai4devs/tools/demo/TOOL.json', 'file', false],
  ['.pbai4devs/external-skills/.local', 'dir', true],
  ['.pbai4devs/external-skills/.local', 'dir', false],
];
for (const [name, type, targetExists] of symlinkCases) {
  test(`rejeita link ${targetExists ? 'existente' : 'quebrado'} em ${name} antes de ler o destino`, t => {
    const { root, file } = resourceFixture(t);
    if (name.startsWith('.pbai4devs/external-skills/')) file('.pbai4devs/external-skills/README.md');
    const target = join(root, 'payload', type === 'dir' ? 'directory' : 'file');
    if (targetExists) {
      if (type === 'dir') { file('payload/directory/README.md', 'payload invalido'); file('payload/directory/espelhos.conf', 'payload invalido'); }
      else file('payload/file', 'payload invalido');
    }
    const link = join(root, name);
    rmSync(link, { recursive: true, force: true });
    try { symlinkSync(target, link, process.platform === 'win32' && type === 'dir' ? 'junction' : type); }
    catch (error) {
      if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) { t.skip('Sem permissão para criar este link no Windows.'); return; }
      throw error;
    }
    assert.throws(() => verify(root), error => error.message === `Link simbolico: ${name}`);
  });
}

test('frontmatter e primeiro conteúdo H1 são obrigatórios', () => {
  checkFrontmatter(document('# Correto\n'), 'ok.md');
  checkFrontmatter(document('# Correto\r\n'), 'ok.mdc');
  for (const text of ['# Sem YAML\n', '---\ndescription: aberto\n# H1\n', document('Texto\n# Tarde\n'), document('## H2\n')]) {
    assert.throws(() => checkFrontmatter(text, 'erro.md'), /Frontmatter\/H1 invalido/);
  }
});

test('valida links locais inline, referências e nomes codificados', t => {
  const { root, file } = resourceFixture(t);
  file('docs/target name.md');
  const guide = file('README.md', document('# Links\n\n[Local](docs/target%20name.md#titulo)\n[Outro][target]\n[Web](https://example.com)\n[Email](mailto:teste@example.com)\n[Âncora](#titulo)\n\n[target]: <docs/target name.md>\n\n```md\n[Exemplo](nao-existe.md)\n```\n'));
  verify(root);
  file('README.md', document('# Falha\n\n[Local](missing.md)\n'));
  assert.throws(() => verify(root), /Link ausente: README.md -> missing.md/);
  writeFileSync(guide, document('# Falha\n\n[Local][ref]\n\n[ref]: missing.md\n'));
  assert.throws(() => verify(root), /Link ausente/);
  assert.throws(() => localLinkTargets('[Local](invalid%Q0.md)'), /codificacao invalida/);
});

test('inclui mdc e documentos registrados no catálogo', t => {
  const { root, file } = resourceFixture(t);
  file('.pbai4devs/espelhos.conf', 'agente|.codex|plano\ndocumento|EXTRA.md|AGENTS.md\n');
  file('EXTRA.md');
  file('.codex/rules/exemplo.mdc', document('## H2 invalido\n'));
  assert.throws(() => verify(root), /Frontmatter\/H1 invalido: .codex\/rules\/exemplo.mdc/);
  file('.codex/rules/exemplo.mdc');
  assert.ok(collectMarkdown(root).includes(join(root, 'EXTRA.md')));
});

test('exige guias da origem e impede auxiliares nos espelhos', t => {
  const { root, file } = resourceFixture(t);
  rmSync(join(root, '.pbai4devs/tools/demo/README.md'));
  assert.throws(() => verify(root), /README ausente: .pbai4devs\/tools\/demo/);
  file('.pbai4devs/tools/demo/README.md');
  file('.codex/README.md');
  assert.throws(() => verify(root), /Guia indevido em .codex/);
  rmSync(join(root, '.codex/README.md'));
  file('.codex/tools/tool.json', '{}');
  assert.throws(() => verify(root), /Auxiliar indevido em .codex\/tools/);
});

test('chama sincronizador e linter pelo Node atual, sem wrappers shell', t => {
  const { root, file } = resourceFixture(t);
  const calls = [];
  const run = (...args) => { calls.push(args); return { status: 0, stdout: 'Finding: fixture\nLinting: 2 files\nSummary: 0 error(s)\n', stderr: '' }; };
  checkSynchronization(root, run);
  assert.equal(calls[0][0], process.execPath);
  assert.deepEqual(calls[0][1], [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--check']);
  assert.match(checkLint(root, [], run)[0], /markdownlint-cli2=missing/);
  file('.pbai4devs/tools/markdownlint-cli2/.local/CURRENT.json', '{}');
  const files = [join(root, 'README.md')];
  assert.deepEqual(checkLint(root, files, run), ['Linting: 2 files', 'Summary: 0 error(s)']);
  assert.equal(calls[1][0], process.execPath);
  assert.deepEqual(calls[1][1], [join(root, '.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs'), 'run', 'markdownlint-cli2', ...files]);
  assert.throws(() => checkSynchronization(root, () => ({ status: 1, stderr: 'espelhos divergentes' })), /espelhos divergentes/);
  assert.throws(() => checkLint(root, files, () => ({ status: 1, stdout: 'Finding: fixture\nREADME.md: MD041' })), /README.md: MD041/);
});

const ignored = [
  '.agent-tests/report.json', '.AgEnT-TeStS/report.json', 'TestResults/report.xml',
  'tests/TestResults/report.xml', 'tests/testresults/report.xml', 'test-results/result.json',
  'playwright-report/index.html', 'blob-report/report.zip', 'playwright/.cache/file',
  'src/tmp/file', 'src/TMP/file', 'src/temp/file', 'src/TeMp/file',
  '.pbai4devs/tools/agent-browser.exe', '.pbai4devs/tools/download/setup.bat',
  '.pbai4devs/tools/package.json', '.pbai4devs/tools/node_modules/library/index.js',
  '.pbai4devs/tools/agent-browser/.local/CURRENT.json',
  '.pbai4devs/tools/agent-browser/.local/versions/package/README.md',
  '.pbai4devs/tools/agent-browser/download.exe', '.pbai4devs/tools/agent-browser/download.bat',
  '.pbai4devs/tools/bin/agent-browser', '.pbai4devs/tools/bin/README.md',
  '.pbai4devs/tools/.cache/npm/file', '.pbai4devs/tools/npm-cache/file',
  '.pbai4devs/external-skills/.local/upstream/SKILL.md',
  '.pbai4devs/external-skills/.local/catalog-state.json',
  '.PlAyWrIgHt-MCP/report.json', '.playwright.config.ts', '.playwright-mcp',
  'tests/.PLAYWRIGHT-results.json', 'tests/PLAYWRIGHT-output/report.json'
];
const versionable = [
  '.pbai4devs/scripts/executar-script/SCRIPT.mjs', '.pbai4devs/scripts/verificar-recursos/tests/TEST.mjs',
  '.pbai4devs/templates/release/TEMPLATE.md', '.pbai4devs/templates/releases/TEMPLATE.md',
  '.pbai4devs/templates/build/TEMPLATE.md', '.pbai4devs/scripts/tool/SCRIPT.bat',
  '.pbai4devs/scripts/tool/program.exe', '.pbai4devs/tools/README.md',
  '.pbai4devs/external-skills/README.md', '.pbai4devs/external-skills/CATALOG.json',
  '.pbai4devs/tools/agent-browser/TOOL.json', '.pbai4devs/tools/agent-browser/SCRIPT.mjs',
  '.pbai4devs/tools/agent-browser/README.md', '.pbai4devs/tools/agent-desktop/TOOL.json',
  '.pbai4devs/tools/markdownlint-cli2/TOOL.json', 'playwright.config.ts',
  'tests/unittests/example.test.ts', 'tests/e2e/example.spec.ts', 'tests/fixtures/example.json',
  'tests/fixtures/example.dll', '.vscode/settings.json', 'infra/compose/compose.local.yml', 'scripts/start.cmd'
];
const agentRoots = registryRoots(projectRoot).agents;
const ignoreFiles = ['.gitignore', '.pbai4devs/.gitignore', ...agentRoots.map(root => `${root}/.gitignore`), '.vscode/.gitignore'];
const localArtifacts = [
  'sessions/current.json', 'SeSsIoNs/current.json', '.local/state.json', '.cache/data.json',
  'logs/current.txt', 'auth.json', 'credentials.json',
  'settings.local.json', 'settings.LoCaL.json', 'opencode-loop/state.json',
  '.playwright-mcp/result.json', '.PlAyWrIgHt-MCP/result.json',
  '.DS_Store', 'Thumbs.db', 'draft.swp', '.env', '.ENV.production',
  'NoDe_MoDuLeS/demo/index.js', '.AgEnT-TeStS/report.json'
];
for (const root of agentRoots) {
  ignored.push(`${root}/unknown-private-file.json`, `${root}/tools/payload.js`, `${root}/cache/data.json`, `${root}/CaChE/data.json`);
  for (const local of localArtifacts) ignored.push(`${root}/${local}`, `${root}/skills/demo/${local}`);
  versionable.push(`${root}/.gitignore`, `${root}/skills/demo/SKILL.md`, `${root}/skills/demo/fixtures/example.json`, `${root}/skills/demo/fixtures/cache/input.json`, `${root}/skills/demo/.env.development.example`, `${root}/agents/demo/AGENT.md`, `${root}/agents/demo/native.yaml`, `${root}/commands/demo/COMMAND.md`, `${root}/rules/demo/RULE.md`);
}
ignored.push('.pbai4devs/unknown-private-file.json', '.vscode/unknown-private-file.json');
for (const root of ['.pbai4devs/scripts/demo', '.pbai4devs/estado', '.vscode']) {
  for (const local of localArtifacts) ignored.push(`${root}/${local}`);
}
versionable.push(
  '.pbai4devs/.gitignore', '.pbai4devs/README.md', '.pbai4devs/espelhos.conf', '.pbai4devs/catalog.json',
  '.pbai4devs/skills.json', '.pbai4devs/agents.json', '.pbai4devs/rules.json', '.pbai4devs/agents/revisor/claude.yaml',
  '.pbai4devs/scripts/demo/tests/fixtures/expected.json', '.pbai4devs/scripts/demo/tests/fixtures/cache/input.json', '.pbai4devs/scripts/demo/.env.development.example', '.pbai4devs/estado/project.json',
  '.claude/settings.json', '.codex/config.toml', '.cursor/mcp.json',
  '.opencode/opencode.json', '.opencode/opencode.jsonc', '.github/copilot-instructions.md',
  '.github/instructions/demo.instructions.md', '.github/prompts/demo.prompt.md',
  '.github/workflows/ci.yml', '.github/actions/demo/action.yml', '.github/actions/cache/action.yml',
  '.vscode/.gitignore', '.vscode/extensions.json', '.vscode/tasks.json', '.vscode/launch.json',
  '.gemini/commands/instalar-ferramentas.toml', 'GEMINI.md'
);
function git(root, args, input) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', input });
  if (result.error) throw result.error;
  return result;
}
function ignoredPaths(root, paths) {
  const result = git(root, ['check-ignore', '--no-index', '--stdin', '-z'], `${paths.join('\0')}\0`);
  assert.ok([0, 1].includes(result.status), result.stderr);
  return result.stdout.split('\0').filter(Boolean);
}

test('gitignore mantém fontes elegíveis e ignora artefatos em qualquer caixa', t => {
  for (const name of ['.playwright', '.PLAYWRIGHT', '.PlAyWrIgHt.config.ts']) {
    for (const prefix of ['', 'tests/', 'nested/deep/']) ignored.push(`${prefix}${name}`);
  }
  const model = readFileSync(join(projectRoot, '.pbai4devs/templates/gitignore/TEMPLATE.md'), 'utf8');
  const block = model.match(/```gitignore\r?\n([\s\S]*?)```/)?.[1];
  assert.ok(block, 'Modelo deve conter bloco gitignore.');
  const { root, file } = fixture(t, 'gitignore-');
  assert.equal(git(root, ['init', '-q']).status, 0);
  for (const path of ignoreFiles) file(path, readFileSync(join(projectRoot, path), 'utf8'));
  for (const location of [projectRoot, root]) {
    const actual = new Set(ignoredPaths(location, ignored));
    assert.deepEqual(ignored.filter(path => !actual.has(path)), [], `Ignorados ausentes em ${relative(projectRoot, location) || '.'}`);
    assert.deepEqual(ignoredPaths(location, versionable), []);
  }
  const actual = readFileSync(join(projectRoot, '.gitignore'), 'utf8');
  assert.deepEqual(ignoredPaths(projectRoot, ['.vscode-test/download', '.VSCODE-TEST/download']).sort(), ['.VSCODE-TEST/download', '.vscode-test/download']);
  const rules = actual.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#'));
  for (const agent of ['.pbai4devs', ...agentRoots, '.vscode']) {
    assert.ok(!rules.some(line => line.includes(agent)), `Regras de ${agent} devem ficar no proprio .gitignore.`);
  }
  const marker = '# CUSTOM IGNORE';
  assert.equal(actual.split(marker).length, 2, 'A seção custom deve existir uma vez.');
  const tail = actual.slice(actual.indexOf(marker));
  for (const line of block.split(/\r?\n/).filter(line => line && !line.startsWith('#'))) assert.ok(tail.includes(line), `Regra custom ausente: ${line}`);
});

test('git add preserva arquivos compartilhados e nunca inclui estado local dos agentes', t => {
  const { root, file } = fixture(t, 'gitignore-index-');
  assert.equal(git(root, ['init', '-q']).status, 0);
  for (const path of ignoreFiles) file(path, readFileSync(join(projectRoot, path), 'utf8'));
  const sourceFiles = ['.pbai4devs/tools/agent-browser/TOOL.json', '.pbai4devs/scripts/demo/tests/TEST.mjs', '.codex/skills/demo/SKILL.md', '.vscode/settings.json', '.github/workflows/ci.yml'];
  const stateFiles = ['.pbai4devs/tools/agent-browser/.local/CURRENT.json', '.codex/auth.json', '.opencode/opencode-loop/state.json', '.claude/settings.local.json'];
  for (const path of [...sourceFiles, ...stateFiles]) file(path, 'fixture\n');
  const added = git(root, ['add', '--all']);
  assert.equal(added.status, 0, added.stderr);
  const tracked = git(root, ['ls-files', '-z']);
  assert.equal(tracked.status, 0, tracked.stderr);
  assert.deepEqual(tracked.stdout.split('\0').filter(Boolean).sort(), [...ignoreFiles, ...sourceFiles].sort());
});

test('gitignores locais protegem fontes e artefatos mesmo sem gitignore na raiz', t => {
  const { root, file } = fixture(t, 'gitignore-local-');
  assert.equal(git(root, ['init', '-q']).status, 0);
  for (const path of ignoreFiles.filter(path => path !== '.gitignore')) file(path, readFileSync(join(projectRoot, path), 'utf8'));
  const internal = path => ['.pbai4devs', ...agentRoots, '.vscode'].some(directory => path.startsWith(`${directory}/`));
  const expectedIgnored = ignored.filter(internal);
  const actual = new Set(ignoredPaths(root, expectedIgnored));
  assert.deepEqual(expectedIgnored.filter(path => !actual.has(path)), [], 'Ignore local nao deve depender das regras genericas da raiz.');
  assert.deepEqual(ignoredPaths(root, versionable.filter(internal)), [], 'Fontes internas devem permanecer elegiveis sem ignore raiz.');
});

test('arquivos de agentes ja rastreados respeitam os gitignores locais', () => {
  const result = git(projectRoot, ['ls-files', '--cached', '-z']);
  assert.equal(result.status, 0, result.stderr);
  const roots = ['.pbai4devs', ...agentRoots, '.vscode'];
  const tracked = result.stdout.split('\0').filter(path => roots.some(root => path.startsWith(`${root}/`)));
  if (tracked.length) assert.deepEqual(ignoredPaths(projectRoot, tracked), [], 'Remova artefatos locais do indice Git; gitignore nao remove arquivos ja rastreados.');
});

test('nenhuma fonte ou asset do catalogo compartilhado fica oculto no Git', () => {
  const { catalog } = buildCatalog(projectRoot);
  const sources = [...new Set(Object.values(catalog).flatMap(entries => Array.isArray(entries) ? entries.flatMap(entry => [entry.path, ...(entry.assets || [])]) : []).filter(path => path?.startsWith('.pbai4devs/') && !path.includes('/.local/')))];
  assert.ok(sources.some(path => path.endsWith('/claude.yaml')));
  assert.ok(sources.some(path => path.endsWith('/BOOTSTRAP.sh')));
  assert.ok(sources.some(path => path.endsWith('/compose.local.yml.template')));
  assert.deepEqual(ignoredPaths(projectRoot, sources), [], 'Fontes, fixtures e metadados do catalogo precisam continuar elegiveis.');
});

test('nenhum .playwright* está rastreado ou elegível no Git', () => {
  const result = git(projectRoot, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']);
  assert.equal(result.status, 0, result.stderr);
  const artifacts = result.stdout.split('\0').filter(path => path.split(/[\\/]/).some(part => /^\.playwright/i.test(part)));
  assert.deepEqual(artifacts, []);
});
