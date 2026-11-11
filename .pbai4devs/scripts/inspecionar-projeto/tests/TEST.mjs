import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { projectRoot, requireNode } from '../../lib/runtime.mjs';

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
  for (const args of [['--root', dirname(projectRoot)], ['--root', '.pbai4devs'], ['--unknown']]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.equal(typeof JSON.parse(result.stderr).error, 'string');
  }
});

test('classifica sinais de maturidade sem confundir planejamento com produto funcionando', t => {
  const { directory, file, run } = fixture(t);
  const state = stage => file('.pbai4devs/estado/configuracao/ESTADO.md', `---\npreparacao: concluido\nconfiguracao_tecnica: ${stage}\ndocumentos:\n  prd: docs/PRD.md\n  ux_ui: docs/UX.md\n  design: docs/DESIGN.md\n  releases: docs/releases\n---\n# Estado\n`);
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

test('exemplos temporários e caches Playwright não viram aplicação do projeto real', t => {
  const { file, run } = fixture(t);
  for (const folder of ['tmp/examples/a', 'TEMP/project', '.PLAYWRIGHT-MCP', 'playwright-results']) {
    file(`${folder}/package.json`, '{}'); file(`${folder}/main.mjs`, 'export const fake=1;');
  }
  file('.PLAYWRIGHT-state.js', 'export const transient = true;');
  const report = run().report;
  assert.equal(report.mode, 'agentes-sem-aplicacao');
  assert.deepEqual(report.manifests, []); assert.deepEqual(report.sources, []);
});

test('status arbitrários e referências fora da raiz não expõem dados da configuração', t => {
  const { file, run } = fixture(t); const secret = 'PRIVATE_STATUS_192819';
  file('.pbai4devs/estado/configuracao/ESTADO.md', `---\npreparacao: ${secret}\nconfiguracao_tecnica: ${secret}\ndocumentos:\n  prd: ../outside.md\n  design: docs/DESIGN.md\n---\n# Estado\n`);
  file('docs/DESIGN.md', `---\nstatus: ${secret}\n---\n# Design\n`);
  const result = run(); assert.equal(result.status, 0);
  assert.equal(result.report.maturity.planning.prd.path, null);
  assert.equal(result.report.maturity.planning.ready, false);
  assert.ok(!result.stdout.includes(secret));
});
