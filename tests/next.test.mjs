import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { getNextSteps } from '../src/next.mjs';
import { inspectProject } from '../.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function fixture(t) {
  const target = realpathSync(mkdtempSync(join(tmpdir(), "agentdevkit próximos $() ' -")));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const write = (file, content) => { const full = join(target, file); mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, content); };
  write('.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs', readFileSync(join(root, '.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs')));
  cpSync(join(root, '.pbai4devs/scripts/lib'), join(target, '.pbai4devs/scripts/lib'), { recursive: true });
  return { target, write };
}
function state(write, { preparation = 'concluido', technical = 'pendente', prd = 'aprovado', ux = 'nao-aplicavel', design = 'aprovado' } = {}) {
  write('.pbai4devs/estado/configuracao/ESTADO.md', `---\npreparacao: ${preparation}\nconfiguracao_tecnica: ${technical}\ndocumentos:\n  prd: docs/prd.md\n  ux_ui: docs/ux.md\n  design: docs/design.md\n---\n\n# Estado\n`);
  for (const [name, status] of [['prd', prd], ['ux', ux], ['design', design]]) write(`docs/${name}.md`, `---\nstatus: ${status}\n---\n\n# ${name}\n`);
}

test('inspeção exportada é somente leitura e não mantém exclusões entre projetos', t => {
  const first = fixture(t), second = fixture(t);
  first.write('.pbai4devs/espelhos.conf', 'agente|.custom|plano\n');
  second.write('.custom/code.js', 'export const source = true;\n');
  assert.equal(inspectProject(first.target).mode, 'agentes-sem-aplicacao');
  assert.equal(inspectProject(second.target).mode, 'aplicacao-detectada');
});

test('novo projeto recebe preparação e projeto existente preserva descoberta', t => {
  const { target, write } = fixture(t);
  assert.equal(getNextSteps({ command: 'next', target, installed: false })[0].stage, 'instalacao');
  assert.equal(getNextSteps({ command: 'next', target, installed: true })[0].skill, 'configurar-projeto');
  write('src/app.mjs', 'export const app = true;\n');
  for (const language of ['pt', 'en', 'es']) {
    const [next] = getNextSteps({ command: 'next', target, language, installed: true });
    assert.equal(next.skill, 'preparar-dev'); assert.ok(next.instruction);
    assert.ok(next.command.includes(target.replaceAll("'", "'\\''")));
    assert.doesNotMatch(next.command, /'next'/);
  }
});

test('aprovações registradas determinam a etapa sem inventar aprovação', t => {
  const { target, write } = fixture(t);
  const next = () => getNextSteps({ command: 'doctor', target, installed: true })[0];
  state(write, { prd: 'rascunho' }); assert.equal(next().skill, 'criar-prd');
  state(write, { ux: 'pendente' }); assert.equal(next().skill, 'criar-ux-ui');
  state(write, { design: 'rascunho' }); assert.equal(next().skill, 'criar-design-doc');
  state(write); assert.equal(next().skill, 'configurar-projeto');
  state(write, { technical: 'concluido' }); assert.equal(next().skill, 'criar-spec');
  assert.doesNotMatch(next().command, /'next'/);
});

test('comando de inspeção preserva destino com espaços e metacaracteres', { skip: process.platform === 'win32' }, t => {
  const { target } = fixture(t);
  const [next] = getNextSteps({ command: 'next', target, language: 'en', installed: true });
  const result = spawnSync('/bin/sh', ['-c', next.command], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).maturity.level, 'preparacao');
});

test('manutenção orienta roadmap e não cria um loop de next', t => {
  const { target, write } = fixture(t);
  state(write, { technical: 'concluido' });
  const file = join(target, '.pbai4devs/estado/configuracao/ESTADO.md');
  write('.pbai4devs/estado/configuracao/ESTADO.md', readFileSync(file, 'utf8').replace('  design: docs/design.md', '  design: docs/design.md\n  releases: docs/releases'));
  write('docs/releases/v1/RELEASE.md', '---\nstatus: publicado\n---\n\n# Release\n');
  for (const directory of ['.vscode', 'src', 'tests', 'infra', '.agents', '.agent', '.gemini', '.claude', '.codex', '.cursor', '.github', '.opencode']) mkdirSync(join(target, directory), { recursive: true });
  for (const name of ['.gitignore', '.gitattributes', '.editorconfig', '.dockerignore', 'Makefile', 'README.md', 'infra/compose/compose.local.yml']) write(name, '# Fixture\n');
  write('src/app.mjs', 'export const app = true;\n');
  const [next] = getNextSteps({ command: 'next', target, installed: true });
  assert.equal(next.stage, 'manutencao'); assert.equal(next.skill, 'gerenciar-roadmap');
  assert.doesNotMatch(next.command, /'next'/);
});

test('comandos PowerShell usam literal quotado e chamada explícita', t => {
  const { target } = fixture(t);
  const [next] = getNextSteps({ command: 'next', target, language: 'es', installed: false, platform: 'win32' });
  assert.ok(next.command.startsWith('& '));
  assert.ok(next.command.includes(target.replaceAll("'", "''")));
  assert.ok(next.command.includes('--target '));
  assert.doesNotMatch(next.command, /node_modules|_npx/);
});
