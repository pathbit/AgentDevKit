import assert from 'node:assert/strict';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { projectRoot, requireNode } from '../../lib/runtime.mjs';
import { inspectDocumentation } from '../SCRIPT.mjs';

requireNode();
const script = join(projectRoot, '.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs');
function fixture(t) {
  const home = join(projectRoot, '.agent-tests');
  mkdirSync(home, { recursive: true });
  const root = mkdtempSync(join(home, 'inspecionar-projeto-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = name => mkdirSync(join(root, name), { recursive: true });
  const file = (name, data = '') => { const target = join(root, name); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, data); };
  const run = (...args) => {
    const result = spawnSync(process.execPath, [script, '--root', root, ...args], { encoding: 'utf8' });
    assert.ifError(result.error);
    return { ...result, report: result.stdout.trim() ? JSON.parse(result.stdout) : undefined };
  };
  return { root, directory, file, run };
}

test('identifica repositório sem aplicação e informa estrutura ausente', t => {
  const { run } = fixture(t);
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.report.mode, 'agentes-sem-aplicacao');
  assert.ok(result.report.structure.missing.includes('Makefile'));
  assert.equal(run('--check').status, 1);
});

test('ignora agentes, dependências, estado e links simbólicos', t => {
  const { root, file, run } = fixture(t);
  file('.pbai4devs/tools/node_modules/example/package.json', '{"scripts":{"wrong":"secret"}}');
  file('node_modules/example/package.json', '{}');
  file('.git/package.json', '{}');
  file('.agent-tests/package.json', '{}');
  assert.equal(run().report.mode, 'agentes-sem-aplicacao');
  try { symlinkSync(join(projectRoot, 'README.md'), join(root, 'linked.py')); }
  catch (error) {
    if (process.platform !== 'win32' || !['EPERM', 'EACCES'].includes(error.code)) throw error;
    t.diagnostic('Link simbólico indisponível sem permissão do Windows.');
  }
  assert.equal(run().report.mode, 'agentes-sem-aplicacao');
});

test('descobre linguagens e comandos sem expor valores nem executar Python', t => {
  const { root, file, run } = fixture(t);
  const secret = 'THIS_VALUE_MUST_NEVER_APPEAR_393838';
  file('.env', `TOKEN=${secret}`);
  file('backend/pyproject.toml', `[project]\nname="existing"\n[project.scripts]\nserve="app:main"\n[tool.private]\npassword="${secret}"`);
  file('backend/app.py', `password="${secret}"`);
  file('deploy/docker-compose.dev.yml', `services:\n  app:\n    environment:\n      TOKEN: ${secret}\n`);
  file('Dockerfile', `ENV TOKEN=${secret}`);
  file('Makefile', `dev:\n\t@echo ${secret}\ntest check:\n\t@echo ok\n`);
  file('package.json', JSON.stringify({ scripts: { dev: `echo ${secret}`, test: 'exit 0' }, config: { token: secret } }));
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.report.mode, 'aplicacao-detectada');
  assert.deepEqual(result.report.languages, ['javascript', 'python']);
  assert.ok(result.report.compose.includes('deploy/docker-compose.dev.yml'));
  assert.ok(result.report.structure.missing.includes('src'));
  assert.deepEqual(result.report.commands.find(row => row.file === 'package.json').names, ['dev', 'test']);
  assert.deepEqual(result.report.commands.find(row => row.file === 'Makefile').names, ['check', 'dev', 'test']);
  assert.deepEqual(result.report.commands.find(row => row.file === 'backend/pyproject.toml').names, ['serve']);
  assert.ok(!result.stdout.includes(secret));
  assert.ok(!result.stderr.includes(secret));
  assert.equal(readFileSync(join(root, '.env'), 'utf8'), `TOKEN=${secret}`);
});

test('aceita estrutura completa e raízes de agentes configuradas', t => {
  const { directory, file, run } = fixture(t);
  for (const name of ['.pbai4devs', '.agents', '.agent', '.gemini', '.claude', '.codex', '.cursor', '.github', '.opencode', '.vscode', 'src', 'tests', 'infra']) directory(name);
  for (const name of ['.gitignore', '.gitattributes', '.editorconfig', '.dockerignore', 'README.md', 'Makefile']) file(name);
  file('infra/compose/docker-compose.local.yml', 'services: {}\n');
  const result = run('--check');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.report.contract.complete, true);
  assert.deepEqual(result.report.structure.missing, []);
  file('.pbai4devs/espelhos.conf', 'agente|.github|plano\nagente|.dsh|plano\n');
  file('.dsh/skills/tool/package.json', '{"scripts":{"hidden":"secret"}}');
  const configured = run('--check');
  assert.equal(configured.status, 0, configured.stderr);
  assert.ok(configured.report.structure.present.includes('.dsh'));
  assert.ok(!configured.report.manifests.some(name => name.startsWith('.dsh/')));
});

test('manifests inválidos geram aviso sem revelar seu conteúdo', t => {
  const { file, run } = fixture(t);
  const secret = 'MALFORMED_PRIVATE_VALUE';
  file('package.json', '{ malformed ' + secret);
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.report.warnings.some(row => row.file === 'package.json'));
  assert.ok(!result.stdout.includes(secret));
});

test('rejeita origens fora das fixtures e opções desconhecidas', () => {
  for (const args of [['--root', dirname(projectRoot)], ['--root', '.pbai4devs'], ['--root', 'examples'], ['--root', 'examples/custom'], ['--unknown']]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.equal(typeof JSON.parse(result.stderr).error, 'string');
  }
});

test('classifica sinais de maturidade sem confundir planejamento com produto funcionando', t => {
  const { directory, file, run } = fixture(t);
  const state = stage => file('.pbai4devs/state/configuracao/ESTADO.md', `---\npreparacao: concluido\nconfiguracao_tecnica: ${stage}\ndocumentos:\n  prd: docs/PRD.md\n  ux_ui: docs/UX.md\n  design: docs/DESIGN.md\n  releases: docs/releases\n---\n# Estado\n`);
  assert.equal(run().report.maturity.level, 'preparacao');
  state('pendente'); file('docs/PRD.md', '---\nstatus: rascunho\n---\n# PRD\n');
  assert.equal(run().report.maturity.level, 'descoberta');
  for (const name of ['PRD', 'DESIGN']) file(`docs/${name}.md`, `---\nstatus: aprovado\n---\n# ${name}\n`);
  file('docs/UX.md', '---\nstatus: nao-aplicavel\n---\n# UX\n');
  assert.equal(run().report.maturity.level, 'planejado');
  file('package.json', '{"scripts":{"test":"node --test"}}'); file('src/main.mjs', 'export const answer = 42;');
  assert.equal(run().report.maturity.level, 'implementacao');
  for (const name of ['.agents', '.agent', '.gemini', '.claude', '.codex', '.cursor', '.github', '.opencode', '.vscode', 'tests', 'infra']) directory(name);
  for (const name of ['.gitignore', '.gitattributes', '.editorconfig', '.dockerignore', 'README.md', 'Makefile']) file(name);
  file('infra/compose/compose.local.yml', 'services: {}\n'); state('concluido');
  assert.equal(run('--check').report.maturity.level, 'configurado');
  file('docs/releases/v1/RELEASE.md', '---\nstatus: publicado\n---\n# Release\n');
  const result = run('--check'); assert.equal(result.status, 0);
  assert.equal(result.report.maturity.level, 'manutencao');
  assert.equal(result.report.maturity.released, true);
  assert.match(result.report.maturity.limits[0], /nao substitui/);
});

test('inspeção lê decisões legadas e informa conflito entre pastas de estado', t => {
  const { file, run } = fixture(t);
  const decisions = '---\npreparacao: concluido\nconfiguracao_tecnica: pendente\n---\n# Estado\n';
  file('.pbai4devs/estado/configuracao/ESTADO.md', decisions);
  const legacy = run();
  assert.equal(legacy.status, 0, legacy.stderr);
  assert.equal(legacy.report.maturity.configuration.present, true);
  assert.equal(legacy.report.maturity.configuration.preparacao, 'concluido');
  file('.pbai4devs/state/configuracao/ESTADO.md', decisions);
  const conflict = run();
  assert.equal(conflict.status, 2);
  assert.match(JSON.parse(conflict.stderr).error, /coexistem/);
});

test('exemplos e caches Playwright não viram aplicação do projeto real', t => {
  const { file, run } = fixture(t);
  for (const folder of ['examples/generated/a', 'examples/fixture', 'tmp/examples/a', 'TEMP/project', '.PLAYWRIGHT-MCP', 'playwright-results']) {
    file(`${folder}/package.json`, '{}'); file(`${folder}/main.mjs`, 'export const fake=1;');
  }
  file('.PLAYWRIGHT-state.js', 'export const transient = true;');
  const report = run().report;
  assert.equal(report.mode, 'agentes-sem-aplicacao');
  assert.deepEqual(report.manifests, []); assert.deepEqual(report.sources, []);
});

test('aceita inspecionar cenário em examples/generated sem liberar outras pastas', t => {
  const base = join(projectRoot, 'examples/generated'); mkdirSync(base, { recursive: true });
  const root = mkdtempSync(join(base, 'inspector-fixture-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'package.json'), '{}');
  const result = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });
  assert.ifError(result.error); assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).mode, 'aplicacao-detectada');
});

test('status arbitrários e referências fora da raiz não expõem dados da configuração', t => {
  const { file, run } = fixture(t); const secret = 'PRIVATE_STATUS_192819';
  file('.pbai4devs/state/configuracao/ESTADO.md', `---\npreparacao: ${secret}\nconfiguracao_tecnica: ${secret}\ndocumentos:\n  prd: ../outside.md\n  design: docs/DESIGN.md\n---\n# Estado\n`);
  file('docs/DESIGN.md', `---\nstatus: ${secret}\n---\n# Design\n`);
  const result = run(); assert.equal(result.status, 0);
  assert.equal(result.report.maturity.planning.prd.path, null);
  assert.equal(result.report.maturity.planning.ready, false);
  assert.ok(!result.stdout.includes(secret));
});

test('inventário documental vazio não cria arquivos nem presume aprovação', t => {
  const { root, run } = fixture(t);
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.report.documentation.files, []);
  assert.deepEqual(result.report.documentation.configured, []);
  assert.equal(result.report.documentation.scan.truncated, false);
  assert.equal(result.report.documentation.scan.complete, true);
  assert.deepEqual(readdirSync(root), []);
  assert.match(result.report.documentation.limits.at(-1), /nao cria documentos/);
});

test('descobre documentação real sem impor caixa, pasta docs ou frontmatter', t => {
  const { root, file, run } = fixture(t);
  const content = 'DOC_CONTENT_MUST_NOT_BE_EMITTED_182711';
  for (const name of ['Readme.md', 'CONTRIBUTING.rst', 'SECURITY.adoc', 'History.md', 'ARCHITECTURE.md', 'AGENTS.md', 'LICENSE', 'examples/README', '_examples/server/README.md', 'wiki/guide.mdx', 'rfcs/001-change.md', 'packages/docs/content/api.mdx', '.github/CONTRIBUTING.md', '.github/SECURITY.md', '.github/copilot-instructions.md']) file(name, content);
  for (const name of ['node_modules/lib/README.md', '.pbai4devs/README.md', '.claude/skills/private/SKILL.md', '.github/skills/demo/SKILL.md', '.github/agents/revisor.agent.md', 'examples/generated/fixture/README.md', '.PLAYWRIGHT-MCP/README.md', 'tmp/README.md']) file(name, content);
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const docs = result.report.documentation;
  assert.equal(docs.files.length, 15);
  assert.equal(docs.files.find(item => item.path === 'Readme.md').role, 'readme');
  assert.equal(docs.files.find(item => item.path === 'rfcs/001-change.md').role, 'decision');
  assert.equal(docs.files.find(item => item.path === 'ARCHITECTURE.md').role, 'design');
  assert.equal(docs.files.find(item => item.path === 'AGENTS.md').role, 'instructions');
  assert.equal(docs.files.find(item => item.path === '.github/copilot-instructions.md').role, 'instructions');
  assert.equal(docs.files.find(item => item.path === '.github/CONTRIBUTING.md').role, 'contribution');
  assert.equal(docs.files.find(item => item.path === 'LICENSE').role, 'license');
  assert.ok(docs.exclusions.paths.includes('.github/skills'));
  assert.equal(docs.files.find(item => item.path === 'wiki/guide.mdx').sha256, createHash('sha256').update(content).digest('hex'));
  assert.ok(docs.files.every(item => item.origin === 'inferred' && item.kind === 'file'));
  assert.ok(!result.stdout.includes(content));
  assert.equal(readFileSync(join(root, 'Readme.md'), 'utf8'), content);
});

test('caminhos cadastrados têm proveniência sem assumir status ou ler arquivos de configuração', t => {
  const { file, run } = fixture(t);
  file('.pbai4devs/state/configuracao/ESTADO.md', '---\ndocumentos:\n  design: architecture/current.md\n  specs: specifications\n  prd: planning/absent.md\n  readme: ../private-secret.md\n  seguranca: .env\n---\n# Estado\n');
  file('architecture/current.md', '# Existing architecture\n');
  file('specifications/current.mdx', '# Increment\n');
  file('.env', 'DO_NOT_EMIT_OR_HASH_THIS_SECRET');
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const docs = result.report.documentation;
  assert.deepEqual(docs.files.find(item => item.path === 'architecture/current.md').configuredAs, ['design']);
  assert.equal(docs.files.find(item => item.path === 'specifications/current.mdx').origin, 'configured');
  assert.ok(docs.configured.some(item => item.role === 'prd' && item.kind === 'missing'));
  assert.ok(docs.warnings.some(item => item.reason === 'invalid-configured-path'));
  assert.ok(docs.warnings.some(item => item.reason === 'configured-path-not-document'));
  assert.ok(!docs.files.some(item => item.path === '.env'));
  assert.ok(!result.stdout.includes('private-secret') && !result.stdout.includes('DO_NOT_EMIT'));
  assert.equal(docs.files.some(item => Object.hasOwn(item, 'status')), false);
});

test('documentos simbólicos permanecem opacos sem ler destinos internos, externos ou ausentes', t => {
  const { root, file, run } = fixture(t);
  const outside = mkdtempSync(join(projectRoot, '.agent-tests', 'outside-docs-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  file('docs/real.md', '# Actual document\n');
  writeFileSync(join(outside, 'private.md'), 'OUTSIDE_SECRET_MUST_NOT_APPEAR');
  try {
    symlinkSync('docs/real.md', join(root, 'README.md'));
    symlinkSync(join(outside, 'private.md'), join(root, 'CLAUDE.md'));
    symlinkSync('absent.md', join(root, 'missing.md'));
    symlinkSync(outside, join(root, 'external'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (process.platform !== 'win32' || !['EPERM', 'EACCES'].includes(error.code)) throw error;
    t.skip('Links simbólicos indisponíveis sem permissão do Windows.'); return;
  }
  file('.pbai4devs/state/configuracao/ESTADO.md', '---\ndocumentos:\n  design: external/private.md\n---\n# State\n');
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const docs = result.report.documentation;
  for (const name of ['README.md', 'CLAUDE.md', 'missing.md', 'external']) {
    const item = docs.files.find(item => item.path === name);
    assert.equal(item?.kind, 'symbolic-link', name);
    assert.equal(item.sha256, undefined);
  }
  assert.ok(!docs.files.some(item => item.path === 'external/private.md'));
  assert.ok(!result.stdout.includes(outside) && !result.stdout.includes('OUTSIDE_SECRET'));
  assert.equal(docs.scan.complete, false);
  assert.ok(docs.warnings.some(item => item.file === 'external' && item.reason === 'symbolic-link-not-inspected'));
  assert.equal(readFileSync(join(outside, 'private.md'), 'utf8'), 'OUTSIDE_SECRET_MUST_NOT_APPEAR');
});

test('pastas documentais simbólicas sem cadastro não ocultam uma leitura incompleta', t => {
  const { root, run } = fixture(t);
  const outside = mkdtempSync(join(projectRoot, '.agent-tests', 'outside-doc-tree-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  const privateContent = 'UNREAD_EXTERNAL_DOCUMENT_719329';
  writeFileSync(join(outside, 'private.md'), privateContent);
  try {
    for (const name of ['docs', 'wiki', 'rfcs', 'examples', 'custom-docs']) symlinkSync(outside, join(root, name), process.platform === 'win32' ? 'junction' : 'dir');
    symlinkSync('absent-directory', join(root, 'missing-directory'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (process.platform !== 'win32' || !['EPERM', 'EACCES'].includes(error.code)) throw error;
    t.skip('Links simbólicos indisponíveis sem permissão do Windows.'); return;
  }
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const docs = result.report.documentation;
  assert.equal(docs.scan.complete, false);
  assert.equal(docs.scan.bytesRead, 0);
  assert.deepEqual(docs.configured, []);
  assert.deepEqual(docs.files.map(item => item.path), ['custom-docs', 'docs', 'examples', 'missing-directory', 'rfcs', 'wiki']);
  assert.ok(docs.files.every(item => item.kind === 'symbolic-link' && item.role === 'unclassified' && !item.sha256));
  assert.equal(docs.warnings.filter(item => item.reason === 'symbolic-link-not-inspected').length, 6);
  assert.ok(!result.stdout.includes(outside) && !result.stdout.includes(privateContent));
  assert.equal(readFileSync(join(outside, 'private.md'), 'utf8'), privateContent);
  const limited = inspectDocumentation(root, { maxFiles: 1 });
  assert.equal(limited.files.length, 1);
  assert.equal(limited.scan.truncated, true);
  assert.equal(limited.scan.complete, false);
});

test('limites documentais são explícitos e não retornam inventário parcial como completo', t => {
  const { root, file } = fixture(t);
  file('a.md', '123'); file('b.md', '456'); file('deep/nested/c.md', '789');
  const files = inspectDocumentation(root, { maxFiles: 1 });
  assert.equal(files.files.length, 1); assert.equal(files.scan.truncated, true);
  assert.equal(files.scan.complete, false);
  const entries = inspectDocumentation(root, { maxEntries: 1 });
  assert.equal(entries.scan.entries, 1); assert.equal(entries.scan.truncated, true);
  const depth = inspectDocumentation(root, { maxDepth: 0 });
  assert.ok(!depth.files.some(item => item.path.startsWith('deep/')));
  assert.ok(depth.warnings.some(item => item.reason === 'depth-limit'));
  const bytes = inspectDocumentation(root, { maxFileBytes: 2 });
  assert.equal(bytes.scan.bytesHashed, 0); assert.equal(bytes.scan.truncated, true);
  assert.ok(bytes.files.every(item => !item.sha256));
  const total = inspectDocumentation(root, { maxTotalBytes: 4 });
  assert.ok(total.scan.bytesRead <= 4); assert.ok(total.scan.bytesHashed <= 4);
  assert.equal(total.scan.truncated, true);
  for (const limits of [{ maxFiles: -1 }, { maxEntries: 25001 }, { unknown: 1 }]) assert.throws(() => inspectDocumentation(root, limits), /Limite documental/);
});

test('inventário repetido preserva bytes, modos, caminhos e índice Git', t => {
  const { root, file, run } = fixture(t);
  file('README.md', '# Existing\n'); file('docs/guide.md', 'No imposed frontmatter\n');
  const git = (...args) => {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result.stdout;
  };
  git('init', '--quiet', '--template='); git('add', '--', 'README.md');
  const snapshot = () => {
    const files = {};
    const visit = (folder = '') => {
      for (const name of readdirSync(join(root, folder)).sort()) {
        if (name === '.git') continue;
        const relative = folder ? `${folder}/${name}` : name;
        const info = lstatSync(join(root, relative));
        files[relative] = { mode: info.mode, kind: info.isDirectory() ? 'directory' : info.isSymbolicLink() ? 'symbolic-link' : 'file' };
        if (info.isSymbolicLink()) files[relative].target = readlinkSync(join(root, relative));
        else if (info.isDirectory()) visit(relative);
        else files[relative].sha256 = createHash('sha256').update(readFileSync(join(root, relative))).digest('hex');
      }
    };
    visit(); return { files, index: git('ls-files', '--stage'), staged: git('diff', '--cached', '--binary'), config: readFileSync(join(root, '.git/config'), 'utf8') };
  };
  const before = snapshot();
  const first = run(), second = run();
  assert.equal(first.status, 0, first.stderr); assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(first.report.documentation, second.report.documentation);
  assert.deepEqual(snapshot(), before);
});
