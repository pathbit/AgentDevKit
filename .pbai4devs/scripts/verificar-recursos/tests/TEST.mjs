import assert from 'node:assert/strict';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { projectRoot, requireNode } from '../../lib/runtime.mjs';
import { checkFrontmatter, checkLint, checkSynchronization, checkCatalog, checkResourceReferences, collectMarkdown, localLinkTargets, registryRoots, resourcePaths, verifyResources } from '../SCRIPT.mjs';
import { buildCatalog } from '../../lib/catalog.mjs';
import { platformKey, toolWrapper } from '../../preparar-ferramentas/SCRIPT.mjs';
import './ambiente-local.mjs';
import { mergeGitignore, planLocalIgnore, applyLocalIgnore } from '../../lib/gitignore.mjs';

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

function installedFixture(t) {
  const context = resourceFixture(t);
  context.file('.pbai4devs/state/README.md');
  const generated = '.agents/skills/managed/SKILL.md';
  context.file(generated, document('# Gerado\n'));
  const files = { [generated]: createHash('sha256').update(readFileSync(join(context.root, generated))).digest('hex') };
  context.file('.pbai4devs/state/agentdevkit.json', JSON.stringify({ schemaVersion: 1, version: '0.0.9', language: 'pt', files, blocks: {} }));
  return { ...context, generated };
}

test('verificação consulta propriedade legada e recusa estado ambíguo', t => {
  const { root } = installedFixture(t);
  renameSync(join(root, '.pbai4devs/state'), join(root, '.pbai4devs/estado'));
  assert.doesNotThrow(() => collectMarkdown(root));
  mkdirSync(join(root, '.pbai4devs/state'));
  assert.throws(() => collectMarkdown(root), /coexistem/);
});

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

test('verifica Markdown de todas as pastas padrão e documentos da raiz', t => {
  const { root, file } = resourceFixture(t);
  const sources = ['src/README.md', 'bin/README.md', 'tests/README.md', 'scripts/release/README.md',
    'examples/README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'GUIDE.MD',
    '.github/PULL_REQUEST_TEMPLATE.md', '.github/ISSUE_TEMPLATE/question.md'];
  for (const source of sources) file(source);
  const collected = verify(root).files;
  for (const source of sources) {
    assert.ok(collected.includes(join(root, source)), source);
    file(source, '# Sem frontmatter\n');
    assert.throws(() => verify(root), /Frontmatter\/H1 invalido/);
    file(source);
  }
});

test('coleta source-only ignora exemplos gerados e clientes, sem exigir Git', t => {
  const { root, file } = resourceFixture(t);
  const guide = file('examples/README.md');
  file('examples/generated/README.md', '# Resultado inválido\n');
  file('examples/generated/demo/.pbai4devs/README.md', '# Cópia inválida\n');
  file('src/node_modules/dependency/README.md', '# Download inválido\n');
  file('scripts/TEST-RESULTS/README.md', '# Resultado inválido\n');
  file('.github/skills/generated/SKILL.md', '# Cliente inválido\n');
  file('.codex/skills/generated/SKILL.md', '# Cliente inválido\n');
  const result = verifyResources({ root, sourceOnly: true, lint: () => ['lint=fixture'] });
  assert.ok(result.files.includes(guide));
  for (const path of result.files) assert.doesNotMatch(relative(root, path), /examples[\\/]generated|node_modules|TEST-RESULTS|\.github[\\/]skills|\.codex/);
});

test('instalação valida somente fontes e Markdown próprio, preservando conteúdo humano', t => {
  const { root, file, generated } = installedFixture(t);
  const own = ['README.md', 'AGENTS.md', 'docs/product.md', 'src/README.md', '.codex/README.md', '.codex/templates/custom.md', '.codex/skills/human/SKILL.md'];
  for (const path of own) file(path, '# Texto humano sem frontmatter\n\n[Link próprio](missing-human-file.md)\n');
  let linted;
  const result = verifyResources({ root, synchronize() {}, catalogCheck() {}, lint(_root, files) { linted = files; return ['lint=fixture']; } });
  assert.ok(result.files.includes(join(root, generated)));
  assert.ok(result.files.includes(join(root, '.pbai4devs/skills/exemplo/SKILL.md')));
  for (const path of own) assert.equal(result.files.includes(join(root, path)), false, path);
  assert.deepEqual(linted, result.files);
  file('.pbai4devs/skills/exemplo/SKILL.md', '# Fonte do kit inválida\n');
  assert.throws(() => verify(root), /Frontmatter\/H1 invalido: .pbai4devs\/skills\/exemplo\/SKILL.md/);
});

test('instalação não atravessa links humanos de entradas e skills', t => {
  const { root, file } = installedFixture(t);
  file('AGENTS.md', '# Instrução humana sem frontmatter\n');
  file('own-docs/README.md', '# README humano\n');
  file('own-skills/human/SKILL.md', '# Skill humana\n');
  rmSync(join(root, '.codex/skills'), { recursive: true });
  const links = [['CLAUDE.md', 'AGENTS.md', 'file'], ['README.md', 'own-docs/README.md', 'file'], ['.codex/skills', '../own-skills', 'dir']];
  for (const [path, target, type] of links) {
    try { symlinkSync(type === 'dir' && process.platform === 'win32' ? join(root, 'own-skills') : target, join(root, path), process.platform === 'win32' && type === 'dir' ? 'junction' : type); }
    catch (error) {
      if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) { t.skip('Sem permissão para criar links no Windows.'); return; }
      throw error;
    }
  }
  const before = links.map(([path]) => readlinkSync(join(root, path)));
  const result = verify(root);
  for (const [path] of links) {
    assert.equal(lstatSync(join(root, path)).isSymbolicLink(), true);
    assert.equal(result.files.includes(join(root, path)), false);
  }
  assert.deepEqual(links.map(([path]) => readlinkSync(join(root, path))), before);
});

test('instalação recusa caminho gerenciado substituído por link', t => {
  const { root, file, generated } = installedFixture(t);
  const target = file('external.md', '# Conteúdo externo\n');
  rmSync(join(root, generated));
  try { symlinkSync(target, join(root, generated), 'file'); }
  catch (error) {
    if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) { t.skip('Sem permissão para criar links no Windows.'); return; }
    throw error;
  }
  assert.throws(() => verify(root), /Link simbolico: .agents\/skills\/managed\/SKILL.md/);
  assert.equal(readFileSync(target, 'utf8'), '# Conteúdo externo\n');
});

test('instalação confere entradas derivadas sem aplicar lint a blocos humanos', t => {
  const { root, file } = installedFixture(t);
  const contents = document('# Entrada gerada\n');
  file('GEMINI.md', contents);
  file('.pbai4devs/state/derived.json', JSON.stringify({ schemaVersion: 1, entries: { 'GEMINI.md': createHash('sha256').update(contents).digest('hex') } }));
  const block = '<!-- BEGIN AGENTDEVKIT -->\nLeia as fontes.\n<!-- END AGENTDEVKIT -->';
  file('AGENTS.md', `# Instruções humanas sem frontmatter\n\n${block}\n`);
  const statePath = join(root, '.pbai4devs/state/agentdevkit.json');
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  state.blocks['AGENTS.md'] = createHash('sha256').update(block).digest('hex');
  state.files['.pbai4devs/skills/exemplo/SKILL.md'] = createHash('sha256').update('fonte anterior').digest('hex');
  writeFileSync(statePath, JSON.stringify(state));
  const result = verify(root);
  assert.ok(result.files.includes(join(root, 'GEMINI.md')));
  assert.equal(result.files.includes(join(root, 'AGENTS.md')), false);
  assert.ok(result.files.includes(join(root, '.pbai4devs/skills/exemplo/SKILL.md')));
  file('GEMINI.md', document('# Fonte sincronizada com hash de instalação anterior\n'));
  assert.ok(verify(root).files.includes(join(root, 'GEMINI.md')));
});

test('instalação também protege manifestos registrados em derived.outputs', t => {
  const { root, file } = installedFixture(t);
  const manifest = '.agents/skills.json';
  const contents = '{"entries":[]}\n';
  file(manifest, contents);
  file('.pbai4devs/state/derived.json', JSON.stringify({ schemaVersion: 1, entries: {}, outputs: { [manifest]: createHash('sha256').update(contents).digest('hex') } }));
  assert.ok(!verify(root).files.includes(join(root, manifest)));
  rmSync(join(root, manifest));
  assert.throws(() => verify(root), /Arquivo gerenciado ausente: .agents\/skills.json/);
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


function git(root, args, input) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', input });
  if (result.error) throw result.error;
  return result;
}
function ignoredPaths(root, paths) {
  const result = git(root, ['check-ignore', '--no-index', '--stdin', '-z'], paths.join('\0') + '\0');
  assert.ok([0, 1].includes(result.status), result.stderr);
  return result.stdout.split('\0').filter(Boolean);
}
function ignoreFixture(t) {
  const context = fixture(t, 'local-source-ignore-');
  assert.equal(git(context.root, ['init', '-q']).status, 0);
  for (const name of ['local.ignore', 'shared.ignore', 'agents.ignore']) context.file('.pbai4devs/templates/gitignore/' + name, readFileSync(join(projectRoot, '.pbai4devs/templates/gitignore/' + name), 'utf8'));
  context.file('.pbai4devs/.gitignore', mergeGitignore('', readFileSync(join(projectRoot, '.pbai4devs/templates/gitignore/shared.ignore'), 'utf8')).text);
  for (const root of ['.github', '.vscode']) context.file(root + '/.gitignore', mergeGitignore('', readFileSync(join(projectRoot, '.pbai4devs/templates/gitignore/agents.ignore'), 'utf8')).text);
  return context;
}

test('fontes permanecem elegíveis e pastas de clientes aceitam opt-in explícito', t => {
  const { root, file } = ignoreFixture(t);
  const outputs = ['.github/skills/generated/SKILL.md', '.vscode/.gitignore', '.github/.gitignore'];
  const sources = ['src/new.mjs', 'bin/new.mjs', 'tests/new.test.mjs', 'scripts/release/new.mjs'];
  const clients = ['.github/workflows/own.yml', '.github/ISSUE_TEMPLATE/bug.yml', '.github/skills/human/SKILL.md', '.vscode/settings.json'];
  const generated = [...outputs, '.pbai4devs/catalog.json', '.pbai4devs/skills.json', '.pbai4devs/espelhos.conf', '.pbai4devs/state/agentdevkit.json'];
  for (const path of [...sources, ...clients, ...generated.filter(path => !path.endsWith('/.gitignore'))]) file(path, 'fixture\n');
  file('.github/auth.json', 'credencial local\n');
  file('.vscode/logs/session.log', 'artefato local\n');
  assert.equal(git(root, ['add', '--', clients[0], sources[0]]).status, 0);
  const index = git(root, ['ls-files', '--stage', '-z']).stdout;
  applyLocalIgnore(planLocalIgnore(root, { outputs }));
  assert.deepEqual(ignoredPaths(root, sources), []);
  assert.deepEqual(new Set(ignoredPaths(root, clients)), new Set(clients));
  assert.deepEqual(new Set(ignoredPaths(root, generated)), new Set(generated));
  assert.equal(git(root, ['ls-files', '--stage', '-z']).stdout, index);
  for (const path of clients) assert.equal(readFileSync(join(root, path), 'utf8'), 'fixture\n', path);

  const exceptions = '!/.github/\n!/.vscode/\n';
  file('.gitignore', exceptions);
  applyLocalIgnore(planLocalIgnore(root, { outputs }));
  assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), exceptions);
  assert.equal(git(root, ['ls-files', '--stage', '-z']).stdout, index);
  assert.deepEqual(ignoredPaths(root, clients), []);
  const privateFiles = ['.github/auth.json', '.vscode/logs/session.log'];
  assert.deepEqual(new Set(ignoredPaths(root, privateFiles)), new Set(privateFiles));
  assert.equal(git(root, ['add', '--all']).status, 0);
  const tracked = git(root, ['ls-files', '-z']).stdout.split('\0');
  for (const path of [...sources, ...clients, ...outputs]) assert.ok(tracked.includes(path), path);
  for (const path of [...generated.filter(path => !outputs.includes(path)), ...privateFiles]) assert.equal(tracked.includes(path), false, path);
});

test('ignores locais cobrem resultados em qualquer caixa sem bloquear fixtures', t => {
  const { root } = ignoreFixture(t);
  const ignored = ['.pbai4devs/.PLAYWRIGHT-MCP/session.json', '.pbai4devs/tests/TestResults/report.xml', '.github/skills/demo/.env', '.github/skills/demo/NoDe_MoDuLeS/dep.js', '.vscode/logs/session.log'];
  assert.deepEqual(new Set(ignoredPaths(root, ignored)), new Set(ignored));
  assert.deepEqual(ignoredPaths(root, ['.pbai4devs/tests/fixtures/cache/input.json', '.github/skills/demo/.env.development.example', '.vscode/new-config.json']), []);
});

test('validação source-only não exige catálogo, manifesto ou adaptadores gerados', t => {
  const { root, file } = resourceFixture(t);
  rmSync(join(root, '.pbai4devs/espelhos.conf'));
  file('.pbai4devs/README.md', document('# Origem\n\n[Índice](catalog.json)\n'));
  const before = readdirSync(root, { recursive: true }).sort();
  const result = verifyResources({ root, sourceOnly: true, synchronize() { throw new Error('Não sincronizar fontes'); }, lint: () => ['lint=fixture'] });
  assert.ok(result.files.includes(join(root, '.pbai4devs/README.md')));
  assert.deepEqual(readdirSync(root, { recursive: true }).sort(), before);
  file('.pbai4devs/README.md', document('# Origem\n\n[Erro](not-a-generated-file.json)\n'));
  assert.throws(() => verifyResources({ root, sourceOnly: true, lint: () => [] }), /Link ausente/);
});
