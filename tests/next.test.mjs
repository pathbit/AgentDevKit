import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { getNextSteps } from '../src/next.mjs';
import { main, parseArgs } from '../src/cli.mjs';
import { packageInfo } from '../src/config.mjs';
import { findNpmCli } from '../.pbai4devs/scripts/lib/npm.mjs';
import { startProjectRecovery } from '../.pbai4devs/scripts/lib/project-recovery.mjs';
import { inspectDocumentation, inspectProject } from '../.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs';
import { testGitConfig } from '../.pbai4devs/scripts/lib/test-git-environment.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('falha possivelmente parcial orienta revisão de backups nos três idiomas', () => {
  for (const [language, incomplete] of [['pt', /incompletos/i], ['en', /incomplete/i], ['es', /incompletos/i]]) {
    const steps = getNextSteps({ command: 'error', target: tmpdir(), language, possiblePartial: true });
    assert.equal(steps.length, 1); assert.equal(steps[0].stage, 'revisao');
    assert.equal(steps[0].command, undefined); assert.match(steps[0].instruction, incomplete);
  }
});

function fixture(t, { withInspector = true } = {}) {
  const target = realpathSync(mkdtempSync(join(tmpdir(), "agentdevkit próximos $() ' -")));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const write = (file, content) => { const full = join(target, file); mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, content); };
  if (withInspector) {
    write('.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs', readFileSync(join(root, '.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs')));
    cpSync(join(root, '.pbai4devs/scripts/lib'), join(target, '.pbai4devs/scripts/lib'), { recursive: true });
  }
  return { target, write };
}
function state(write, { preparation = 'concluido', technical = 'pendente', prd = 'aprovado', ux = 'nao-aplicavel', design = 'aprovado', roadmap = 'docs/planos/ROADMAP.md', specs = 'docs/incrementos' } = {}) {
  write('.pbai4devs/state/configuracao/ESTADO.md', `---\npreparacao: ${preparation}\nconfiguracao_tecnica: ${technical}\ndocumentos:\n  prd: docs/prd.md\n  ux_ui: docs/ux.md\n  design: docs/design.md\n  roadmap: ${roadmap}\n  specs: ${specs}\n---\n\n# Estado\n`);
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
    assert.doesNotMatch(next.instruction, /status registrado|recorded status|estado registrado/i);
    const escapedTarget = target.replaceAll("'", process.platform === 'win32' ? "''" : "'\\''");
    assert.ok(next.command.includes(escapedTarget));
    assert.doesNotMatch(next.command, /'next'/);
  }
});

test('aprovações registradas determinam a etapa sem inventar aprovação', t => {
  const { target, write } = fixture(t);
  const next = () => getNextSteps({ command: 'doctor', target, installed: true })[0];
  state(write, { prd: 'rascunho' }); assert.equal(next().skill, 'criar-prd');
  state(write, { ux: 'pendente' }); assert.equal(next().skill, 'criar-ux-ui');
  state(write, { design: 'rascunho' }); assert.equal(next().skill, 'criar-design-doc');
  state(write); assert.equal(next().skill, 'gerenciar-roadmap');
  write('docs/planos/ROADMAP.md', '---\nstatus: aprovado\n---\n# Roadmap\n');
  assert.equal(next().skill, 'criar-spec');
  state(write, { technical: 'concluido' }); assert.equal(next().skill, 'criar-spec');
  assert.doesNotMatch(next().command, /'next'/);
});

test('etapas de produto solicitam evidências também nos fluxos padrão e run', t => {
  const { target, write } = fixture(t);
  for (const [options, expected] of [
    [{ prd: 'rascunho' }, 'criar-prd'],
    [{ ux: 'pendente' }, 'criar-ux-ui'],
    [{ design: 'rascunho' }, 'criar-design-doc'],
    [{}, 'gerenciar-roadmap'],
  ]) {
    state(write, options);
    for (const intent of [undefined, 'run', 'product']) {
      const [step] = getNextSteps({ command: 'next', target, installed: true, intent });
      assert.equal(step.skill, expected);
      assert.match(step.instruction, /status registrado, por si só, não comprova aprovação/i);
    }
  }
});

test('frontmatter CRLF legítimo mantém aprovação e seleção da spec', t => {
  const { target, write } = fixture(t);
  state(write);
  write('docs/planos/ROADMAP.md', '---\r\nstatus: aprovado\r\n---\r\n# Roadmap\r\n- [ ] [Spec](../incrementos/primeiro/SPEC.md)\r\n');
  write('docs/incrementos/primeiro/SPEC.md', '---\r\nstatus: aprovado\r\n---\r\n# Spec\r\n');
  for (const file of ['.pbai4devs/state/configuracao/ESTADO.md', 'docs/prd.md', 'docs/ux.md', 'docs/design.md']) {
    write(file, readFileSync(join(target, file), 'utf8').replaceAll('\n', '\r\n'));
  }
  assert.equal(getNextSteps({ command: 'next', target, installed: true })[0].skill, 'implementar-spec');
});

test('respeita roadmap, spec declarada e configuração antes de sugerir implementação', t => {
  const { target, write } = fixture(t); const next = () => getNextSteps({ command: 'next', target, installed: true })[0];
  state(write);
  const roadmap = (status, link = '') => write('docs/planos/ROADMAP.md', `${status ? `---\nstatus: ${status}\n---\n` : ''}# Roadmap\n${link}\n`);
  const spec = status => write('docs/incrementos/primeiro/SPEC.md', `${status ? `---\nstatus: ${status}\n---\n` : ''}# Spec\n`);
  assert.equal(next().skill, 'gerenciar-roadmap');
  roadmap(null); assert.equal(next().skill, 'gerenciar-roadmap');
  roadmap('rascunho'); assert.equal(next().skill, 'gerenciar-roadmap');
  roadmap('aprovado'); assert.equal(next().skill, 'criar-spec');
  mkdirSync(join(target, 'docs/incrementos'), { recursive: true });
  assert.equal(next().skill, 'criar-spec');
  spec('rascunho'); assert.equal(next().skill, 'gerenciar-roadmap');
  roadmap('planejado', '- [ ] [Incremento](../incrementos/primeiro/SPEC.md)');
  assert.equal(next().skill, 'criar-spec');
  spec(null); assert.equal(next().skill, 'gerenciar-roadmap');
  spec('aprovado');
  const report = inspectProject(target).maturity.planning;
  assert.equal(report.specs.items[0].status, 'aprovado');
  assert.equal(report.specs.items[0].linked, true);
  assert.equal(report.specs.items[0].roadmapState, 'open');
  assert.match(inspectProject(target).maturity.limits[0], /nao substitui aprovacao/);
  assert.equal(next().skill, 'implementar-spec');
  assert.match(next().instruction, /confirme as decisões ainda pendentes/);
  for (const [language, warning] of [
    ['pt', /status registrado, por si só, não comprova aprovação/i],
    ['en', /recorded status alone does not establish approval/i],
    ['es', /estado registrado no demuestra por sí solo la aprobación/i],
  ]) {
    const [step] = getNextSteps({ command: 'next', target, language, installed: true });
    assert.equal(step.skill, 'implementar-spec');
    assert.match(step.instruction, warning);
  }
  write('docs/planos/PLANO.md', '---\nstatus: aprovado\n---\n# Plano existente\n');
  assert.equal(next().skill, 'implementar-spec');
  state(write, { technical: 'concluido' });
  assert.equal(next().skill, 'implementar-spec');
  write('docs/incrementos/segundo/SPEC.md', '---\nstatus: rascunho\n---\n# Outro\n');
  assert.equal(next().skill, 'gerenciar-roadmap');
});

test('somente vínculos locais explícitos identificam a spec no caminho acordado', t => {
  const { target, write } = fixture(t); const next = () => getNextSteps({ command: 'next', target, installed: true })[0];
  state(write, { specs: 'docs/incrementos com espaços' });
  write('docs/incrementos com espaços/primeiro/SPEC.md', '---\nstatus: aprovado\n---\n# Spec\n');
  const roadmap = link => write('docs/planos/ROADMAP.md', `---\nstatus: planejado\n---\n# Roadmap\n- [ ] ${link}\n`);
  for (const link of [
    '[externo](https://example.com/docs/incrementos%20com%20espa%C3%A7os/primeiro/SPEC.md)',
    '[incorreto](../incrementos%20com%20espa%C3%A7os/outro/SPEC.md)',
    '[inválido](../incrementos%ZZ/primeiro/SPEC.md)',
    '[barra](..%5Cincrementos%20com%20espa%C3%A7os%5Cprimeiro%5CSPEC.md)',
    '[fora](../../../incrementos%20com%20espa%C3%A7os/primeiro/SPEC.md)',
    '[incompleto](../incrementos%20com%20espa%C3%A7os/primeiro/SPEC.md',
    '![imagem](../incrementos%20com%20espa%C3%A7os/primeiro/SPEC.md)',
    '<!-- [comentário](../incrementos%20com%20espa%C3%A7os/primeiro/SPEC.md) -->',
    '`[exemplo](../incrementos%20com%20espa%C3%A7os/primeiro/SPEC.md)`',
    '```markdown\n[exemplo](../incrementos%20com%20espa%C3%A7os/primeiro/SPEC.md)\n```',
    '[spec]: <../incrementos%20com%20espa%C3%A7os/primeiro/SPEC.md>',
    '[uso][spec]\n\n[spec]: https://example.com/outro\n[spec]: <../incrementos%20com%20espa%C3%A7os/primeiro/SPEC.md>',
  ]) { roadmap(link); assert.equal(next().skill, 'gerenciar-roadmap', link); }
  roadmap('[correto](../incrementos%20com%20espa%C3%A7os/primeiro/SPEC.md#aceite)');
  assert.equal(next().skill, 'implementar-spec');
  roadmap('[correto](<../incrementos com espaços/primeiro/SPEC.md>)');
  assert.equal(next().skill, 'implementar-spec');
  roadmap('[correto][spec]\n\n[spec]: <../incrementos%20com%20espa%C3%A7os/primeiro/SPEC.md>');
  assert.equal(next().skill, 'implementar-spec');
});

test('não reabre entrega concluída, cancelada, publicada ou ambígua', t => {
  const { target, write } = fixture(t); const next = () => getNextSteps({ command: 'next', target, installed: true })[0];
  state(write, { technical: 'concluido' });
  write('docs/incrementos/primeiro/SPEC.md', '---\nstatus: aprovado\n---\n# Spec\n');
  const link = '[Incremento](../incrementos/primeiro/SPEC.md)';
  const roadmap = body => write('docs/planos/ROADMAP.md', `---\nstatus: planejado\n---\n# Roadmap\n${body}\n`);
  for (const body of [
    `- [x] ${link}`, `- [X] ${link}`, `- [ ] ${link} — cancelada`,
    `- [ ] ${link} — publicada`, `- [ ] ${link} — concluída`, link,
    `- [ ] ${link}\n- [x] ${link}`, `- [ ] ${link}\n- [ ] ${link}`,
    `- [x] Release\n  - [ ] ${link}`, `- [ ] Release cancelada\n  - [ ] ${link}`,
    `- Release sem estado\n  - [ ] ${link}`,
  ]) { roadmap(body); assert.equal(next().skill, 'gerenciar-roadmap', body); }
  for (const body of [`- [ ] ${link}`, `- [-] ${link}`, `- [ ] Release\n  - [ ] ${link}`]) {
    roadmap(body); assert.equal(next().skill, 'implementar-spec', body);
  }
  write('docs/incrementos/primeiro/SPEC.md', '---\nstatus: cancelado\n---\n# Spec\n');
  assert.equal(next().skill, 'gerenciar-roadmap');
  write('docs/incrementos/primeiro/SPEC.md', '---\nstatus: publicado\n---\n# Spec\n');
  assert.equal(next().skill, 'gerenciar-roadmap');
});

test('status duplicado ou sintaxe YAML relevante desconhecida não cria aprovação', t => {
  const { target, write } = fixture(t); const next = () => getNextSteps({ command: 'next', target, installed: true })[0];
  const link = '- [ ] [Incremento](../incrementos/primeiro/SPEC.md)';
  const files = [
    ['docs/prd.md', 'criar-prd', 'aprovado'],
    ['docs/ux.md', 'criar-ux-ui', 'nao-aplicavel'],
    ['docs/design.md', 'criar-design-doc', 'aprovado'],
    ['docs/planos/ROADMAP.md', 'gerenciar-roadmap', 'aprovado'],
    ['docs/incrementos/primeiro/SPEC.md', 'gerenciar-roadmap', 'aprovado'],
  ];
  for (const [file, expected, status] of files) {
    for (const header of [
      `status: rascunho\nstatus: ${status}`,
      `"status": rascunho\nstatus: ${status}`,
      `'status': rascunho\nstatus: ${status}`,
      `!!str status: rascunho\nstatus: ${status}`,
      `!!str "status": rascunho\nstatus: ${status}`,
      `status: ${status}\n  rascunho`,
      `status: ${status}\n  rascunho\ntitulo: Documento`,
      `status: "${status.slice(0, 4)}\r${status.slice(4)}"`,
      `status: '${status.slice(0, 4)}\r${status.slice(4)}'`,
    ]) {
      state(write);
      write('docs/planos/ROADMAP.md', `---\nstatus: aprovado\n---\n# Roadmap\n${link}\n`);
      write('docs/incrementos/primeiro/SPEC.md', '---\nstatus: aprovado\n---\n# Spec\n');
      write(file, `---\n${header}\n---\n# Documento\n${file.endsWith('ROADMAP.md') ? link : ''}\n`);
      assert.equal(next().skill, expected, `${file}: ${header}`);
    }
  }
  state(write);
  write('docs/planos/ROADMAP.md', `---\nstatus: aprovado\n---\n# Roadmap\n${link}\n`);
  write('docs/incrementos/primeiro/SPEC.md', '---\nstatus: aprovado\n---\n# Spec\n');
  const stateFile = '.pbai4devs/state/configuracao/ESTADO.md';
  write(stateFile, readFileSync(join(target, stateFile), 'utf8').replace('  specs: docs/incrementos', '  specs: docs/incrementos\n  "specs": docs/outro'));
  assert.equal(next().skill, 'gerenciar-roadmap');
});

test('não presume caminhos ausentes, inválidos ou diretório com conteúdo ambíguo', t => {
  const { target, write } = fixture(t); const next = () => getNextSteps({ command: 'next', target, installed: true })[0];
  write('docs/planos/ROADMAP.md', '---\nstatus: aprovado\n---\n# Roadmap\n');
  for (const configured of ['null', '../fora', '/etc', 'docs/.GiT/specs', 'docs/incrementos\\externos', 'docs/incrementos:outros']) {
    state(write, { specs: configured });
    assert.equal(next().skill, 'gerenciar-roadmap', configured);
  }
  state(write);
  write('docs/incrementos/observacoes.md', '# Arquivo próprio\n');
  assert.equal(next().skill, 'gerenciar-roadmap');
});

test('subárvores reservadas não são interpretadas como specs do projeto', t => {
  const { target, write } = fixture(t); const next = () => getNextSteps({ command: 'next', target, installed: true })[0];
  state(write);
  write('docs/planos/ROADMAP.md', '---\nstatus: aprovado\n---\n# Roadmap\n[Spec](../incrementos/.GiT/SPEC.md)\n');
  write('docs/incrementos/.GiT/SPEC.md', '---\nstatus: aprovado\n---\n# Conteúdo protegido\n');
  assert.equal(next().skill, 'gerenciar-roadmap');
  assert.equal(inspectProject(target).maturity.planning.specs.complete, false);
});

test('enumeração de specs e seus filhos é limitada e não retorna seleção parcial', t => {
  for (const mode of ['root', 'child']) {
    const { target, write } = fixture(t);
    state(write);
    write('docs/planos/ROADMAP.md', '---\nstatus: aprovado\n---\n# Roadmap\n');
    const folder = mode === 'root' ? 'docs/incrementos' : 'docs/incrementos/primeiro';
    for (let index = 0; index < 205; index++) write(`${folder}/nota-${index}.md`, '# Nota\n');
    if (mode === 'child') write(`${folder}/SPEC.md`, '---\nstatus: aprovado\n---\n# Spec\n');
    const original = fs.opendirSync; const openings = [];
    fs.opendirSync = (...args) => {
      const handle = original(...args), name = String(args[0]);
      const read = handle.readSync.bind(handle), close = handle.closeSync.bind(handle);
      const opening = { name, reads: 0, closed: false }; openings.push(opening);
      handle.readSync = () => { opening.reads++; return read(); };
      handle.closeSync = () => { opening.closed = true; return close(); };
      return handle;
    };
    let report;
    try { report = inspectProject(target); } finally { fs.opendirSync = original; }
    assert.equal(report.maturity.planning.specs.complete, false, mode);
    assert.deepEqual(report.maturity.planning.specs.items, [], mode);
    const large = join(target, folder);
    assert.ok(openings.some(item => item.name === large && item.reads === 201), mode);
    assert.ok(openings.every(item => item.closed), mode);
    assert.equal(getNextSteps({ command: 'next', target, installed: true })[0].skill, 'gerenciar-roadmap');
  }
});

test('inventário genérico limitado pede inspeção manual sem presumir projeto vazio', t => {
  const { target, write } = fixture(t), large = join(target, 'huge');
  mkdirSync(large);
  write('src/existing.mjs', 'export const existing = true;\n');
  const original = fs.opendirSync, openings = [];
  const ignored = { name: 'node_modules', isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false };
  fs.opendirSync = (...args) => {
    if (String(args[0]) !== large) return original(...args);
    const opening = { reads: 0, closed: false }; openings.push(opening);
    return { readSync: () => (++opening.reads <= 30000 ? ignored : null), closeSync: () => { opening.closed = true; } };
  };
  let report, next;
  try {
    report = inspectProject(target);
    next = ['pt', 'en', 'es'].map(language => getNextSteps({ command: 'next', target, installed: true, language })[0]);
  } finally { fs.opendirSync = original; }
  assert.equal(report.scan.truncated, true);
  assert.equal(report.documentation.scan.truncated, true);
  assert.match(next[0].instruction, /Inspecione manualmente/);
  assert.match(next[1].instruction, /Inspect .* manually/);
  assert.match(next[2].instruction, /Inspeccione manualmente/);
  assert.ok(next.every(item => !item.skill && !item.command && !Object.hasOwn(item, 'stage')));
  assert.ok(openings.length >= 2);
  assert.ok(openings.every(item => item.closed && item.reads <= 25001));
});

test('não segue links de roadmap ou specs, inclusive em ancestrais', t => {
  const { target, write } = fixture(t); const next = () => getNextSteps({ command: 'next', target, installed: true })[0];
  state(write);
  write('outro/ROADMAP.md', '---\nstatus: aprovado\n---\n# Roadmap\n');
  mkdirSync(join(target, 'docs/planos'), { recursive: true });
  try { symlinkSync(join(target, 'outro/ROADMAP.md'), join(target, 'docs/planos/ROADMAP.md'), 'file'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip('Sem permissão para links simbólicos.'); return; } throw error; }
  assert.equal(next().skill, 'gerenciar-roadmap');
  rmSync(join(target, 'docs/planos/ROADMAP.md'));
  write('docs/planos/ROADMAP.md', '---\nstatus: aprovado\n---\n# Roadmap\n');
  mkdirSync(join(target, 'outro/specs'), { recursive: true });
  symlinkSync(join(target, 'outro/specs'), join(target, 'docs/incrementos'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(next().skill, 'gerenciar-roadmap');
});

test('spec e metadados humanos com links não são seguidos ou interpretados como aprovação', t => {
  const { target, write } = fixture(t); const next = () => getNextSteps({ command: 'next', target, installed: true })[0];
  state(write);
  write('docs/planos/ROADMAP.md', '---\nstatus: aprovado\n---\n# Roadmap\n[Spec](../incrementos/primeiro/SPEC.md)\n');
  mkdirSync(join(target, 'docs/incrementos/primeiro'), { recursive: true });
  write('externo/spec.md', '---\nstatus: aprovado\n---\n# Fora\n');
  try { symlinkSync(join(target, 'externo/spec.md'), join(target, 'docs/incrementos/primeiro/SPEC.md'), 'file'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip('Sem permissão para links simbólicos.'); return; } throw error; }
  assert.equal(next().skill, 'gerenciar-roadmap');
  const planning = inspectProject(target).maturity.planning;
  assert.equal(planning.specs.complete, false);
  assert.deepEqual(planning.specs.items, []);
  assert.equal(readFileSync(join(target, 'externo/spec.md'), 'utf8'), '---\nstatus: aprovado\n---\n# Fora\n');
});

test('troca de ancestral durante inspeção não usa metadados externos', t => {
  const { target, write } = fixture(t);
  const outside = realpathSync(mkdtempSync(join(tmpdir(), 'adk-next-outside-')));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  const probe = join(target, 'link-probe');
  try { symlinkSync(outside, probe, process.platform === 'win32' ? 'junction' : 'dir'); unlinkSync(probe); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip('Sem permissão para links simbólicos.'); return; } throw error; }
  state(write);
  write('docs/planos/ROADMAP.md', '---\nstatus: rascunho\n---\n# Local\n');
  writeFileSync(join(outside, 'ROADMAP.md'), '---\nstatus: aprovado\n---\n# Externo\n');
  const file = join(target, 'docs/planos/ROADMAP.md');
  const originalLstat = fs.lstatSync, originalOpen = fs.openSync;
  let hits = 0, swapped = false, openedExternal = false;
  fs.lstatSync = (value, ...args) => {
    if (String(value) === file && ++hits === 3) {
      renameSync(join(target, 'docs/planos'), join(target, 'docs/planos-original'));
      symlinkSync(outside, join(target, 'docs/planos'), process.platform === 'win32' ? 'junction' : 'dir');
      swapped = true;
    }
    return originalLstat(value, ...args);
  };
  fs.openSync = (value, ...args) => {
    if (String(value) === file && swapped && realpathSync(dirname(file)) === outside) openedExternal = true;
    return originalOpen(value, ...args);
  };
  let report;
  try { report = inspectProject(target); } finally { fs.lstatSync = originalLstat; fs.openSync = originalOpen; }
  assert.equal(swapped, true);
  assert.equal(openedExternal, false);
  assert.equal(report.maturity.planning.roadmap.status, null);
  assert.equal(getNextSteps({ command: 'next', target, installed: true })[0].skill, 'gerenciar-roadmap');
  assert.equal(readFileSync(join(outside, 'ROADMAP.md'), 'utf8'), '---\nstatus: aprovado\n---\n# Externo\n');
});

test('troca de diretório após a listagem não enumera conteúdo externo', t => {
  for (const mode of ['project', 'documentation']) {
    const { target, write } = fixture(t);
    const outside = realpathSync(mkdtempSync(join(tmpdir(), 'adk-next-dir-outside-')));
    t.after(() => rmSync(outside, { recursive: true, force: true }));
    const probe = join(target, 'link-probe');
    try { symlinkSync(outside, probe, process.platform === 'win32' ? 'junction' : 'dir'); unlinkSync(probe); }
    catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip('Sem permissão para links simbólicos.'); return; } throw error; }
    write('docs/safe/README.md', '# Local\n');
    writeFileSync(join(outside, 'package.json'), '{"scripts":{"outside":"echo outside"}}\n');
    const folder = join(target, 'docs/safe'), original = fs.opendirSync;
    let swapped = false, externalReads = 0;
    fs.opendirSync = (value, ...args) => {
      if (String(value) === folder && !swapped) {
        renameSync(folder, join(target, 'docs/safe-original'));
        symlinkSync(outside, folder, process.platform === 'win32' ? 'junction' : 'dir');
        swapped = true;
        const handle = original(value, ...args), read = handle.readSync.bind(handle);
        handle.readSync = () => { externalReads++; return read(); };
        return handle;
      }
      return original(value, ...args);
    };
    let result;
    try { result = mode === 'project' ? inspectProject(target) : inspectDocumentation(target); }
    finally { fs.opendirSync = original; }
    assert.equal(swapped, true, mode);
    assert.equal(externalReads, 0, mode);
    assert.equal(result.scan.truncated, true, mode);
    assert.ok(result.warnings.some(item => item.reason === 'changed-during-read'), mode);
    assert.equal(readFileSync(join(outside, 'package.json'), 'utf8'), '{"scripts":{"outside":"echo outside"}}\n');
  }
});

test('inspeção preserva destino com espaços e metacaracteres sem shell', t => {
  const { target } = fixture(t);
  const [next] = getNextSteps({ command: 'next', target, language: 'en', installed: true });
  assert.ok(next.command.includes('inspecionar-projeto'));
  const result = spawnSync(process.execPath, [join(target, '.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).maturity.level, 'preparacao');
});

test('manutenção orienta roadmap e não cria um loop de next', t => {
  const { target, write } = fixture(t);
  state(write, { technical: 'concluido' });
  const file = join(target, '.pbai4devs/state/configuracao/ESTADO.md');
  write('.pbai4devs/state/configuracao/ESTADO.md', readFileSync(file, 'utf8').replace('  design: docs/design.md', '  design: docs/design.md\n  releases: docs/releases'));
  write('docs/releases/v1/RELEASE.md', '---\nstatus: publicado\n---\n\n# Release\n');
  for (const directory of ['.vscode', 'src', 'tests', 'infra', '.agents', '.agent', '.gemini', '.claude', '.codex', '.cursor', '.github', '.opencode']) mkdirSync(join(target, directory), { recursive: true });
  for (const name of ['.gitignore', '.gitattributes', '.editorconfig', '.dockerignore', 'Makefile', 'README.md', 'infra/compose/compose.local.yml']) write(name, '# Fixture\n');
  write('src/app.mjs', 'export const app = true;\n');
  const [next] = getNextSteps({ command: 'next', target, installed: true });
  assert.equal(next.stage, 'manutencao'); assert.equal(next.skill, 'gerenciar-roadmap');
  assert.doesNotMatch(next.command, /'next'/);
});

test('instalação usa pacote do registry em macOS e Windows com destino literal', t => {
  const { target } = fixture(t);
  for (const platform of ['darwin', 'win32']) {
    const [next] = getNextSteps({ command: 'next', target, language: 'es', installed: false, platform });
    assert.equal(next.command.startsWith('& '), platform === 'win32');
    assert.ok(next.command.includes(target.replaceAll("'", platform === 'win32' ? "''" : "'\\''")));
    assert.ok(next.command.includes('--target '));
    assert.equal(next.command.includes('--registry='), false);
    assert.ok(next.command.includes(`--package=${packageInfo.name}@${packageInfo.version}`));
    assert.ok(next.command.includes('--ignore-scripts'));
    assert.doesNotMatch(next.command, /node_modules|_npx|releases\/download|\.tgz|--package=https/);
  }
  const result = spawnSync(process.execPath, [join(root, 'bin/agentdevkit.mjs'), 'next', '--target', target, '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const command = JSON.parse(result.stdout).next[0].command;
  assert.ok(command.includes(`--package=${packageInfo.name}@${packageInfo.version}`));
  assert.equal(command.includes('--registry='), false);
  assert.doesNotMatch(command, /releases\/download|\.tgz|--package=https/);
});

test('comando respeita metadados do pacote e usa npmjs quando registry está ausente', async t => {
  const { target } = fixture(t);
  const source = readFileSync(join(root, 'src/config.mjs'));
  for (const [id, registry] of [['custom', 'https://registry.example.test'], ['github', 'https://npm.pkg.github.com'], ['npmjs', 'https://registry.npmjs.org/'], ['default', undefined]]) {
    const directory = join(target, id); mkdirSync(join(directory, 'src'), { recursive: true });
    writeFileSync(join(directory, 'src/config.mjs'), source);
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: '@fixture/custom-kit', version: '9.8.7', ...(registry ? { publishConfig: { registry } } : {}) }));
    const config = await import(pathToFileURL(join(directory, 'src/config.mjs')).href);
    const option = registry && new URL(registry).hostname !== 'registry.npmjs.org' ? ` --registry=${registry}` : '';
    assert.equal(config.releaseCommand, `npx --yes --ignore-scripts${option} --package=@fixture/custom-kit@9.8.7 agentdevkit`);
  }
});

test('repo usa npm público e sobrepõe mapeamento legado do usuário sem editar credenciais', t => {
  const { target } = fixture(t), userConfig = join(target, 'user.npmrc');
  writeFileSync(userConfig, '@pathbit:registry=https://npm.pkg.github.com\n');
  assert.equal(packageInfo.publishConfig.registry, 'https://registry.npmjs.org');
  assert.equal(packageInfo.publishConfig.access, 'public');
  const result = spawnSync(process.execPath, [findNpmCli(), 'config', 'get', '@pathbit:registry', `--userconfig=${userConfig}`], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.stdout.trim().replace(/\/$/, ''), 'https://registry.npmjs.org');
  assert.equal(readFileSync(userConfig, 'utf8'), '@pathbit:registry=https://npm.pkg.github.com\n');
});

// The query must preserve both the user's files and Git's staged state.
function intentTree(root) {
  const rows = [];
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  function visit(relative = '') {
    const absolute = join(root, relative), info = fs.lstatSync(absolute);
    if (info.isSymbolicLink()) { rows.push([relative, 'link', fs.readlinkSync(absolute)]); return; }
    if (info.isDirectory()) {
      rows.push([relative, 'directory', info.mode & 0o777]);
      for (const name of fs.readdirSync(absolute).sort()) visit(join(relative, name));
      return;
    }
    assert.ok(info.isFile(), `Tipo inesperado na fixture: ${relative}`);
    rows.push([relative, 'file', info.mode & 0o777, hash(fs.readFileSync(absolute))]);
  }
  visit(); return rows;
}

function guidanceFixture(t) {
  const { target, write } = fixture(t, { withInspector: false });
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_|^NODE_OPTIONS$/i.test(key)));
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: testGitConfig, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C' });
  function invoke(program, args, expected = 0) {
    const result = spawnSync(program, args, { cwd: target, env, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
    assert.ifError(result.error);
    assert.equal(result.status, expected, result.stderr || result.stdout);
    return result;
  }
  const cliResult = (args, expected, destination = target) =>
    invoke(process.execPath, [join(root, 'bin/agentdevkit.mjs'), ...args, '--target', destination], expected);
  const cli = (args, expected) => cliResult(args, expected).stdout;
  return { target, write, cli, cliResult, json: (args, expected) => JSON.parse(cli([...args, '--json'], expected)),
    git: (...args) => invoke('git', args).stdout };
}

test('document inventaria aplicação legada e exporta somente evidências de um rascunho', {
  timeout: process.platform === 'win32' ? 480000 : 180000,
}, t => {
  const { target, write, json, cli, git } = guidanceFixture(t);
  const privateText = /ADK_PRIVATE|status:\s*aprovado/;
  const executionProbe = 'import { writeFileSync } from "node:fs";\nwriteFileSync(new URL("../executed.flag", import.meta.url), "unexpected");\n';
  git('init', '--quiet');
  write('package.json', JSON.stringify({
    name: 'ADK_PRIVATE_MANIFEST',
    scripts: { test: 'node tests/app.test.mjs', start: 'node src/app.mjs # ADK_PRIVATE_SCRIPT' },
  }));
  write('package-lock.json', '{"name":"ADK_PRIVATE_LOCK","lockfileVersion":3}');
  write('src/app.mjs', executionProbe + '// ADK_PRIVATE_SOURCE\n');
  write('tests/app.test.mjs', executionProbe + '// ADK_PRIVATE_TEST\n');
  write('infra/compose/compose.local.yml', 'services:\n  web:\n    image: ADK_PRIVATE_IMAGE\n');
  write('Dockerfile', 'FROM ADK_PRIVATE_IMAGE\n');
  write('.env', 'TOKEN=ADK_PRIVATE_ENV\n');
  write('README.md', '# Projeto humano\n');
  write('docs/PRD.md', '---\nstatus: aprovado\n---\n# ADK_PRIVATE_DOC\n');
  git('add', '--', 'README.md', 'docs/PRD.md', 'package.json');
  write('README.md', '# Projeto humano\nADK_PRIVATE_UNSTAGED\n');

  const before = intentTree(target);
  const result = json(['document']);
  assert.equal(result.ok, true);
  assert.equal(result.command, 'document');
  assert.equal(result.version, packageInfo.version);
  const { status, evidence, coverage, gaps } = result.documentation;
  assert.equal(status, 'rascunho');
  for (const [field, path] of [
    ['manifests', 'package.json'], ['lockfiles', 'package-lock.json'], ['sources', 'src/app.mjs'],
    ['tests', 'tests/app.test.mjs'], ['compose', 'infra/compose/compose.local.yml'], ['dockerfiles', 'Dockerfile'],
  ]) assert.deepEqual(evidence[field], [path], field);
  assert.deepEqual(evidence.commands, [{ file: 'package.json', names: ['start', 'test'] }]);
  assert.deepEqual(evidence.documents.toSorted((left, right) => left.path.localeCompare(right.path)), [
    { path: 'docs/PRD.md', roles: ['product'] }, { path: 'README.md', roles: ['readme'] },
  ]);
  assert.equal(coverage.inventoryComplete, true);
  assert.equal(coverage.documentationComplete, true);
  assert.equal(coverage.applicationDetected, true);
  assert.deepEqual(coverage.sampledFields.toSorted(), ['sources', 'tests']);
  assert.deepEqual(gaps, ['behavior-unverified']);
  assert.doesNotMatch(JSON.stringify(result), privateText);
  const markdown = cli(['document', '--markdown']);
  assert.match(markdown, /^---\r?\ndescription: \S[^\r\n]+\r?\nstatus: rascunho\r?\n---\r?\n/);
  assert.match(markdown, /^# Levantamento do sistema existente$/m);
  for (const heading of ['Escopo', 'Evidências observadas', 'Comportamentos', 'Lacunas', 'Revisão']) {
    assert.ok(markdown.split(/\r?\n/).includes('## ' + heading), heading);
  }
  for (const path of ['package.json', 'src/app.mjs', 'tests/app.test.mjs', 'docs/PRD.md']) assert.ok(markdown.includes(path), path);
  assert.doesNotMatch(markdown, privateText);
  assert.match(cli(['document']), /^# Levantamento do sistema existente/m);
  assert.equal(fs.existsSync(join(target, 'executed.flag')), false);
  assert.deepEqual(intentTree(target), before);
});

test('document distingue inventários parciais sem publicar dados dos arquivos ilegíveis', t => {
  const { target, write, json } = guidanceFixture(t);
  write('package.json', '{"scripts": "ADK_PRIVATE_INVALID_MANIFEST"');
  write('README.md', 'ADK_PRIVATE_OVERSIZED_DOC'.padEnd(2 * 1024 * 1024 + 1, ' '));
  const before = intentTree(target);
  const result = json(['document']);
  const { evidence, coverage, gaps } = result.documentation;
  assert.equal(coverage.inventoryComplete, false);
  assert.equal(coverage.documentationComplete, false);
  assert.deepEqual(evidence.manifests, ['package.json']);
  assert.deepEqual(evidence.commands, []);
  assert.deepEqual(evidence.documents, []);
  assert.ok(gaps.includes('behavior-unverified'));
  assert.ok(gaps.includes('inventory-incomplete'));
  assert.ok(gaps.includes('documentation-incomplete'));
  assert.doesNotMatch(JSON.stringify(result), /ADK_PRIVATE/);
  assert.deepEqual(intentTree(target), before);
});

test('document preserva evidência legível quando uma subpasta recusa acesso', async t => {
  const { target, write } = guidanceFixture(t);
  write('README.md', '# Documento existente\n');
  write('restrito/package.json', '{"scripts":{"ADK_PRIVATE_RESTRICTED":"node app.js"}}');
  write('restrito/README.md', '# Documento restrito\n');
  const before = intentTree(target);
  const restricted = join(target, 'restrito');
  const open = fs.opendirSync;
  let attempts = 0, stdout = '';
  fs.opendirSync = (path, ...args) => {
    if (path !== restricted) return open(path, ...args);
    attempts++;
    throw Object.assign(new Error('ADK_PRIVATE_ACCESS'), { code: 'EACCES', path });
  };
  try {
    assert.equal(await main(['document', '--json', '--target', target], {
      stdout: { write: text => { stdout += text; } },
    }), 0, stdout);
  } finally {
    fs.opendirSync = open;
  }
  assert.ok(attempts > 0, 'A subpasta restrita precisa ser consultada');
  const { evidence, coverage, gaps } = JSON.parse(stdout).documentation;
  assert.deepEqual(evidence.documents, [{ path: 'README.md', roles: ['readme'] }]);
  assert.deepEqual(evidence.manifests, []);
  assert.equal(coverage.inventoryComplete, false);
  assert.equal(coverage.documentationComplete, false);
  assert.ok(gaps.includes('inventory-incomplete'));
  assert.ok(gaps.includes('documentation-incomplete'));
  assert.doesNotMatch(stdout, /ADK_PRIVATE/);
  assert.deepEqual(intentTree(target), before);
});

test('document usa português com estado legado pt-BR e preserva seus bytes', t => {
  const { target, write, cli, json } = guidanceFixture(t);
  const stateFile = '.pbai4devs/estado/agentdevkit.json';
  const legacyState = '{"schemaVersion":1,"version":"0.0.21","language":"pt-BR","files":{},"blocks":{}}\r\n';
  write(stateFile, legacyState);
  write('README.md', '# Documento legado\n');
  const before = intentTree(target);
  const report = json(['document']);
  assert.equal(report.ok, true);
  assert.equal(report.language, 'pt');
  assert.equal(report.documentation.status, 'rascunho');
  assert.match(cli(['document', '--markdown']), /^# Levantamento do sistema existente$/m);
  assert.deepEqual(readFileSync(join(target, stateFile)), Buffer.from(legacyState));
  assert.deepEqual(intentTree(target), before);
});

test('document mantém os artefatos de fixtures fora da evidência de aplicação', t => {
  const { target, write, json } = guidanceFixture(t);
  const mock = 'tests/fixtures/mock';
  write(`${mock}/package.json`, '{"scripts":{"fixture-start":"node app.mjs"}}');
  write(`${mock}/package-lock.json`, '{}');
  write(`${mock}/compose.yml`, 'services: {}\n');
  write(`${mock}/Dockerfile`, 'FROM scratch\n');
  write(`${mock}/app.mjs`, 'export const fixture = true;\n');
  write('tests/app.test.mjs', 'export const test = true;\n');
  const before = intentTree(target);
  const { evidence, coverage, gaps } = json(['document']).documentation;
  for (const field of ['manifests', 'lockfiles', 'commands', 'compose', 'dockerfiles', 'sources']) {
    assert.deepEqual(evidence[field], [], field);
  }
  assert.deepEqual(evidence.tests, ['tests/app.test.mjs']);
  assert.equal(coverage.applicationDetected, false);
  assert.ok(gaps.includes('no-application-evidence'));
  assert.deepEqual(intentTree(target), before);
});

test('next documenta a rota antes e depois do init e inventário vazio explicita lacunas', {
  timeout: process.platform === 'win32' ? 480000 : 180000,
}, t => {
  const { target, write, json, git } = guidanceFixture(t);
  git('init', '--quiet');
  const before = intentTree(target);
  const { evidence, coverage, gaps } = json(['document']).documentation;
  assert.ok(Object.values(evidence).every(items => Array.isArray(items) && items.length === 0));
  assert.equal(coverage.applicationDetected, false);
  assert.deepEqual(gaps.toSorted(), ['behavior-unverified', 'no-application-evidence', 'no-documents']);
  const [preinstall] = json(['next', '--intent', 'document']).next;
  assert.match(preinstall.command, /\bagentdevkit document\b/);
  assert.equal(preinstall.skill, undefined);
  assert.deepEqual(intentTree(target), before);

  write('docs/README.md', '# Documento humano\n');
  git('add', '--', 'docs/README.md');
  const index = readFileSync(join(target, '.git/index'));
  const init = json(['init', '--agents', 'codex', '--lang', 'pt', '--purpose', 'document', '--yes']);
  assert.ok(init.next.some(step => /\bnext --intent document\b/.test(step.command ?? '')));
  assert.equal(fs.existsSync(join(target, '.pbai4devs/skills/projeto/documentar-legado/SKILL.md')), true);
  assert.deepEqual(fs.readdirSync(join(target, 'docs')), ['README.md']);
  assert.equal(readFileSync(join(target, 'docs/README.md'), 'utf8'), '# Documento humano\n');
  assert.deepEqual(readFileSync(join(target, '.git/index')), index);

  const installed = intentTree(target);
  const [postinstall] = json(['next', '--intent', 'document']).next;
  assert.match(postinstall.command, /\bagentdevkit document\b/);
  assert.equal(postinstall.skill, 'documentar-legado');
  assert.deepEqual(intentTree(target), installed);
});

test('document e init com propósito documental respeitam as barreiras de recuperação', t => {
  const { target, write, json, cliResult } = guidanceFixture(t);
  write('package.json', '{"name":"ADK_PRIVATE_PROJECT","scripts":{"start":"node server.js"}}');
  const tx = startProjectRecovery(target, []);
  const verifyBlocked = (status, code) => {
    const before = intentTree(target);
    for (const args of [['document'], ['init', '--purpose', 'document', '--yes']]) {
      const result = json(args, 1);
      assert.equal(result.ok, false);
      assert.equal(result.error.code, code);
      assert.equal(result.recovery.status, status);
      assert.equal(result.documentation, undefined);
      assert.doesNotMatch(JSON.stringify(result), /ADK_PRIVATE/);
    }
    const { stdout, stderr } = cliResult(['document', '--markdown'], 1);
    assert.equal(stdout, '');
    assert.ok(stderr.includes(code), stderr);
    assert.doesNotMatch(stderr, /^---|Levantamento do sistema existente|ADK_PRIVATE/m);
    const result = json(['next', '--intent', 'document']);
    assert.equal(result.next.length, 1);
    assert.equal(result.next[0].stage, 'revisao');
    assert.equal(result.next[0].skill, undefined);
    assert.doesNotMatch(result.next[0].command ?? '', /\bagentdevkit document\b/);
    assert.deepEqual(intentTree(target), before);
  };
  verifyBlocked('pending', 'E_RECOVERY_PENDING');
  writeFileSync(join(tx.journal, 'records', 'invalido'), 'ADK_PRIVATE_JOURNAL');
  verifyBlocked('invalid', 'E_RECOVERY_STORE');

  const unreadable = guidanceFixture(t);
  unreadable.write('.pbai4devs/state/agentdevkit.json', 'ADK_PRIVATE_STATE');
  const before = intentTree(unreadable.target);
  const result = unreadable.json(['document'], 1);
  assert.equal(result.configurationStatus, 'unreadable');
  assert.equal(result.error.code, 'E_STATE');
  assert.equal(result.documentation, undefined);
  assert.doesNotMatch(JSON.stringify(result), /ADK_PRIVATE/);
  assert.deepEqual(intentTree(unreadable.target), before);
});

test('document markdown encaminha alvo inválido para stderr e mantém stdout vazio', t => {
  const { target, write, cliResult } = guidanceFixture(t);
  write('README.md', '# Bytes humanos\n');
  const before = intentTree(target);
  const { stdout, stderr } = cliResult(['document', '--markdown'], 1, join(target, 'README.md'));
  assert.equal(stdout, '');
  assert.match(stderr, /\bE_TARGET\b/);
  assert.doesNotMatch(stderr, /^---|Levantamento do sistema existente/m);
  assert.deepEqual(intentTree(target), before);
});

test('instalação 0.0.34 sem skill documental regular orienta atualização após o levantamento', async t => {
  const { target, write, json } = guidanceFixture(t);
  write('.pbai4devs/state/agentdevkit.json', JSON.stringify({
    schemaVersion: 1, version: '0.0.34', language: 'pt', clients: ['codex'], files: {}, blocks: {},
  }));
  write('README.md', '# Projeto em 0.0.34\n');
  function verify() {
    const before = intentTree(target);
    const next = json(['next', '--intent', 'document']).next;
    assert.match(next[0].command, /\bagentdevkit document\b/);
    assert.ok(next.every(step => step.skill === undefined));
    const result = json(['document']);
    assert.equal(result.documentation.status, 'rascunho');
    assert.ok(result.next.some(step => /\bagentdevkit update\b/.test(step.command ?? '')));
    assert.ok(result.next.every(step => step.skill === undefined));
    assert.deepEqual(intentTree(target), before);
  }
  verify();
  await t.test('diretório da skill é link para outra árvore', subtest => {
    const outside = guidanceFixture(subtest);
    outside.write('SKILL.md', '# Link para uma skill fora do projeto\n');
    const link = join(target, '.pbai4devs/skills/projeto/documentar-legado');
    mkdirSync(dirname(link), { recursive: true });
    try { symlinkSync(outside.target, link, process.platform === 'win32' ? 'junction' : 'dir'); }
    catch (error) {
      if (['EPERM', 'EACCES', 'ENOSYS', 'ENOTSUP'].includes(error.code)) {
        subtest.skip('A plataforma não permite criar links de diretório na fixture');
        return;
      }
      throw error;
    }
    const before = intentTree(outside.target);
    verify();
    assert.deepEqual(intentTree(outside.target), before);
  });
});

const integrationFixtures = {
  bmad: ['_bmad/config.toml', '_bmad/scripts/render_skill.py'],
  openspec: ['openspec/specs/conta/spec.md'],
  'spec-kit': ['.specify/memory/constitution.md'],
  tlc: ['.specs/STATE.md'],
  dotcontext: ['.context/docs/README.md'],
};
const privateFixtureText = 'ADK_INTEGRACAO_CONTEUDO_NAO_CONSULTAR';
const integrationHint = /\bnext\b[^\r\n]*--integrations/;

test('next identifica cinco estruturas de integração antes e depois da instalação sem escrever', {
  timeout: process.platform === 'win32' ? 480000 : 180000,
}, t => {
  const { target, write, json, cli, git } = guidanceFixture(t);
  git('init', '--quiet');
  write('.gitignore', '# Ignore humano\nprivate/\n');
  write('README.md', '# Projeto existente\n');
  write('src/app.mjs', 'export const app = true;\n');
  for (const path of Object.values(integrationFixtures).flat()) write(path, privateFixtureText);
  git('add', '--', 'README.md', '.gitignore', '.specify/memory/constitution.md');
  write('.specify/memory/constitution.md', privateFixtureText + ' edição ainda não preparada');
  const staged = git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv');
  assert.match(staged, new RegExp(privateFixtureText));
  function verify(phase) {
    const before = intentTree(target);
    const result = json(['next', '--integrations']);
    assert.equal(result.ok, true);
    assert.equal(result.command, 'next');
    assert.equal(result.version, packageInfo.version);
    assert.deepEqual(result.integrations.map(item => item.id).sort(), Object.keys(integrationFixtures).sort());
    assert.doesNotMatch(JSON.stringify(result), new RegExp(privateFixtureText), phase);
    for (const item of result.integrations) {
      const plugin = { openspec: 'openspec', dotcontext: 'dotcontext-mcp' }[item.id];
      const keys = ['id', 'instruction', 'name', 'paths', 'url'];
      if (plugin) keys.push('plugin');
      assert.deepEqual(Object.keys(item).sort(), keys.sort());
      assert.equal(item.plugin, plugin);
      assert.ok(item.name.trim() && item.instruction.trim(), item.id);
      assert.equal(new URL(item.url).protocol, 'https:', item.id);
      assert.ok(Array.isArray(item.paths) && item.paths.length, item.id);
      assert.equal(new Set(item.paths).size, item.paths.length, item.id);
      for (const evidence of item.paths) {
        assert.ok(evidence.split('/').every(part => part && part !== '..' && part !== '.' && !part.includes('\\')), item.id);
        assert.ok(integrationFixtures[item.id].some(path => path === evidence || path.startsWith(evidence + '/')), evidence);
        assert.ok(!fs.lstatSync(join(target, evidence)).isSymbolicLink(), evidence);
      }
    }
    const product = json(['next', '--integrations', '--intent', 'product']).integrations;
    const run = json(['next', '--integrations', '--intent', 'run']).integrations;
    const methods = items => items.map(({ id, paths }) => [id, paths]);
    assert.deepEqual(methods(product), methods(result.integrations));
    assert.deepEqual(methods(run), methods(result.integrations));
    assert.notDeepEqual(product.map(item => item.instruction), run.map(item => item.instruction));
    const human = cli(['next', '--integrations']);
    for (const { name } of result.integrations) assert.ok(human.includes(name), name);
    assert.doesNotMatch(human, new RegExp(privateFixtureText), phase);
    assert.equal(git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv'), staged);
    assert.deepEqual(intentTree(target), before, phase);
  }
  verify('antes do init');
  assert.equal(json(['init', '--agents', 'codex', '--lang', 'pt', '--yes']).ok, true);
  verify('depois do init');

  const before = intentTree(target);
  for (const [intent, skill] of [['product', 'configurar-projeto'], ['run', 'preparar-dev'], [null, 'preparar-dev']]) {
    const result = json(intent ? ['next', '--intent', intent] : ['next']);
    assert.equal(result.next[0].skill, skill);
    assert.doesNotMatch(result.next[0].command || '', integrationHint, 'A orientação principal deve continuar primeiro.');
    const hint = result.next.slice(1).find(step => integrationHint.test(step.command || ''));
    assert.ok(hint, intent || 'sem intenção explícita');
    if (intent) assert.ok(hint.command.includes(`--intent ${intent}`), hint.command);
  }
  assert.deepEqual(intentTree(target), before);
});

test('next reconhece as estruturas alternativas sem abrir os arquivos de integração', async t => {
  const { target, write, git, json } = guidanceFixture(t);
  const paths = [
    '_bmad/config.toml', '_bmad-output/planning-artifacts/plan.md',
    'openspec/specs/conta/spec.md', '.specify/memory/constitution.md', '.specs/STATE.md', '.context/plans/roadmap.md',
  ];
  for (const path of paths) write(path, privateFixtureText);
  git('init', '--quiet');
  assert.equal(json(['init', '--agents', 'codex', '--yes']).ok, true);
  const before = intentTree(target), landmarks = new Set(paths.map(path => join(target, path)));
  const attemptedReads = [];
  const originalOpen = fs.openSync, originalRead = fs.readFileSync;
  const record = (operation, path) => {
    if (landmarks.has(path)) attemptedReads.push([operation, path]);
  };
  fs.openSync = (path, ...args) => { record('open', path); return originalOpen(path, ...args); };
  fs.readFileSync = (path, ...args) => { record('read', path); return originalRead(path, ...args); };
  syncBuiltinESMExports();
  let output = '';
  try {
    const status = await main(['next', '--integrations', '--json', '--target', target], {
      stdin: { isTTY: true }, stdout: { isTTY: true, write: text => { output += text; } },
      ask: () => assert.fail('A consulta de integrações não deve perguntar.'),
    });
    assert.equal(status, 0, output);
  } finally {
    fs.openSync = originalOpen;
    fs.readFileSync = originalRead;
    syncBuiltinESMExports();
  }
  assert.deepEqual(JSON.parse(output).integrations.map(item => item.id).sort(), Object.keys(integrationFixtures).sort());
  assert.match(JSON.parse(output).next[0].command, /\bnext --target\b/);
  assert.deepEqual(attemptedReads, []);
  assert.doesNotMatch(output, new RegExp(privateFixtureText));
  assert.deepEqual(intentTree(target), before);
});

test('next recusa estruturas incompletas e não segue diretórios de integração por link', t => {
  const { target, write, json } = guidanceFixture(t);
  const external = fixture(t, { withInspector: false });
  write('_bmad/config.toml', privateFixtureText);
  write('.specs/README.md', privateFixtureText);
  write('openspec/conta/spec.md', privateFixtureText);
  write('.context/README.md', privateFixtureText);
  mkdirSync(join(target, '.specify/memory'), { recursive: true });
  mkdirSync(join(target, '.specify/memory/constitution.md'));
  const before = intentTree(target);
  assert.deepEqual(json(['next', '--integrations']).integrations, []);
  const next = json(['next']);
  assert.ok(next.next.every(step => !integrationHint.test(step.command || '')));
  assert.deepEqual(intentTree(target), before);
  external.write('.specify/memory/constitution.md', privateFixtureText);
  external.write('openspec/specs/conta/spec.md', privateFixtureText);
  mkdirSync(join(target, 'openspec/specs'), { recursive: true });
  rmSync(join(target, '.specify'), { recursive: true });
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  symlinkSync(join(external.target, '.specify'), join(target, '.specify'), linkType);
  symlinkSync(join(external.target, 'openspec/specs/conta'), join(target, 'openspec/specs/conta'), linkType);
  if (process.platform !== 'win32') {
    external.write('.specs/STATE.md', privateFixtureText);
    symlinkSync(join(external.target, '.specs/STATE.md'), join(target, '.specs/STATE.md'), 'file');
  }
  const linked = intentTree(target), outside = intentTree(external.target);
  assert.deepEqual(json(['next', '--integrations']).integrations, []);
  assert.deepEqual(intentTree(target), linked);
  assert.deepEqual(intentTree(external.target), outside);
});

test('integrações são uma opção de next e o diagnóstico limpo encaminha sem escrever', {
  timeout: process.platform === 'win32' ? 480000 : 180000,
}, t => {
  const { target, write, json, git } = guidanceFixture(t);
  for (const command of ['init', 'update', 'doctor', 'sync', 'agents', 'lang', 'recovery']) {
    assert.throws(() => parseArgs([command, '--integrations']), { code: 'E_ARGS' });
  }
  assert.throws(() => parseArgs(['next', '--integrations', '--integrations']), { code: 'E_ARGS' });
  assert.deepEqual(parseArgs(['tools', 'run', 'agent-browser', '--', '--integrations']).toolArgs,
    ['run', 'agent-browser', '--', '--integrations']);
  git('init', '--quiet');
  write('README.md', '# Projeto existente\n');
  write('src/app.mjs', 'export const app = true;\n');
  git('add', '--', 'README.md', 'src/app.mjs');
  assert.equal(json(['init', '--agents', 'codex', '--lang', 'pt', '--yes']).ok, true);
  const before = intentTree(target);
  const invalid = json(['init', '--integrations'], 2);
  assert.equal(invalid.error.code, 'E_ARGS');
  const doctor = json(['doctor']);
  assert.deepEqual(doctor.issues, []);
  assert.match(doctor.next[0].command, /\bsync\b[^\r\n]*--check/);
  const sync = json(['sync', '--check']);
  assert.deepEqual(sync.plan, []);
  assert.match(sync.next[0].command, /\bnext\b/);
  const guidance = json(['next']);
  assert.equal(guidance.next[0].skill, 'preparar-dev');
  assert.ok(guidance.next.every(step => !integrationHint.test(step.command || '')));
  assert.deepEqual(intentTree(target), before);

  const output = '.codex/agents/analista-performance/AGENT.md';
  unlinkSync(join(target, output));
  const missing = intentTree(target);
  assert.match(json(['doctor'], 1).next[0].command, /\bsync --dry-run --json\b/);
  assert.match(json(['sync', '--check', '--agents', 'codex'], 1).next[0].command,
    /\bsync --dry-run --json --agents codex\b/);
  const preview = json(['sync', '--dry-run', '--agents', 'codex']);
  assert.ok(preview.plan.some(entry => entry.path === output));
  assert.match(preview.next[0].command, /\bsync --agents codex --target\b/);
  assert.doesNotMatch(preview.next[0].command, /--force/);
  assert.deepEqual(intentTree(target), missing);
});

test('intenção de execução mantém o foco na aplicação com uma spec aberta', t => {
  const { target, write } = fixture(t);
  state(write);
  write('package.json', '{"scripts":{"start":"node src/app.mjs"}}');
  write('src/app.mjs', 'export const app = true;\n');
  write('docs/incrementos/primeiro/SPEC.md', '---\nstatus: aprovado\n---\n# Spec\n');
  write('docs/planos/ROADMAP.md', '---\nstatus: planejado\n---\n# Roadmap\n- [ ] [Spec](../incrementos/primeiro/SPEC.md)\n');
  const next = intent => getNextSteps({ command: 'next', target, installed: true, intent })[0];
  assert.equal(next('product').skill, 'implementar-spec');
  assert.equal(next().skill, 'implementar-spec');
  assert.equal(next('run').skill, 'preparar-dev');
});

test('next diferencia intenção de produto e execução sem alterar projeto ou Git', t => {
  const { target, write } = fixture(t);
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^GIT_|^NODE_OPTIONS$/i.test(name)));
  Object.assign(env, { GIT_CONFIG_GLOBAL: testGitConfig, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' });
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: target, env, encoding: 'utf8', timeout: 30000 });
    assert.equal(result.status, 0, result.stderr || result.error?.message); return result.stdout;
  };
  write('.gitignore', '# regras humanas\nprivate/\n');
  write('README.md', '# Projeto existente\n');
  write('docs/PRD.md', '# Documento humano existente\n');
  write('docs/decisoes/DESIGN.md', '# Design existente\n');
  write('src/app.mjs', 'export const app = true;\n');
  write('human.txt', 'conteúdo staged\n');
  write('.pbai4devs/state/agentdevkit.json', JSON.stringify({ schemaVersion: 1, version: packageInfo.version, language: 'pt', files: {}, blocks: {} }));
  git('init', '--quiet'); git('add', '--', '.gitignore', 'README.md', 'docs', 'src', 'human.txt');
  write('human.txt', 'conteúdo staged\nalteração não staged\n');
  const staged = git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv');
  assert.match(staged, /conteúdo staged/);
  const before = intentTree(target);
  const cli = (...args) => {
    const result = spawnSync(process.execPath, [join(root, 'bin/agentdevkit.mjs'), 'next', '--target', target, '--json', ...args], { cwd: target, env, encoding: 'utf8', timeout: 60000 });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const value = JSON.parse(result.stdout); assert.equal(value.ok, true); return value.next[0];
  };
  const product = cli('--intent', 'product');
  assert.equal(product.skill, 'configurar-projeto');
  assert.equal(product.stage, 'preparacao');
  assert.equal(product.maturity, 'implementacao');
  assert.match(product.instruction, /inventari|mape/i);
  assert.doesNotMatch(`${product.label} ${product.instruction}`, /(?:não|nao) (?:há|ha|existem?|existe) (?:documentos|docs|prd|design)/i);
  for (const step of [cli('--intent', 'run'), cli()]) assert.equal(step.skill, 'preparar-dev');
  assert.equal(git('diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv'), staged);
  assert.deepEqual(intentTree(target), before);
});

test('intenção de produto respeita projeto novo, estado mapeado e lacunas', t => {
  const { target, write } = fixture(t);
  const next = intent => getNextSteps({ command: 'next', target, installed: true, intent })[0];
  const notInstalled = getNextSteps({ command: 'next', target, installed: false, intent: 'product' })[0];
  assert.equal(notInstalled.stage, 'instalacao');
  assert.equal(notInstalled.maturity, undefined);
  assert.equal(next('product').skill, 'configurar-projeto');
  write('src/app.mjs', 'export const app = true;\n');
  state(write, { prd: 'rascunho' });
  assert.equal(next('product').skill, 'criar-prd');
  assert.equal(next('run').skill, 'preparar-dev');
  const before = intentTree(target);
  const stateFile = '.pbai4devs/state/configuracao/ESTADO.md';
  write(stateFile, readFileSync(join(target, stateFile), 'utf8').replace('  prd: docs/prd.md', '  prd: null'));
  const incomplete = next('product');
  assert.notEqual(incomplete.skill, 'criar-prd', 'caminho não mapeado não comprova ausência do PRD');
  assert.notEqual(incomplete.skill, 'implementar-spec');
  assert.ok(incomplete.instruction);
  assert.notDeepEqual(intentTree(target), before, 'a alteração foi feita pela fixture, não por next');
  const afterFixtureEdit = intentTree(target);
  next('product'); assert.deepEqual(intentTree(target), afterFixtureEdit);
});

test('intenção de produto identifica a primeira etapa pendente antes de fases não mapeadas', t => {
  const { target, write } = fixture(t);
  const stateFile = '.pbai4devs/state/configuracao/ESTADO.md';
  const next = () => getNextSteps({ command: 'next', target, installed: true, intent: 'product' })[0];
  const clearPaths = (...paths) => {
    let value = readFileSync(join(target, stateFile), 'utf8');
    for (const name of paths) value = value.replace(`  ${name}: docs/${name === 'ux_ui' ? 'ux' : name}.md`, `  ${name}: null`);
    write(stateFile, value);
  };
  state(write, { prd: 'rascunho' }); clearPaths('ux_ui', 'design');
  let before = intentTree(target);
  assert.equal(next().skill, 'criar-prd');
  assert.equal(next().stage, 'prd');
  assert.deepEqual(intentTree(target), before);
  state(write, { ux: 'rascunho' }); clearPaths('design');
  before = intentTree(target);
  assert.equal(next().skill, 'criar-ux-ui');
  assert.equal(next().stage, 'ux');
  assert.deepEqual(intentTree(target), before);
  state(write); clearPaths('prd');
  before = intentTree(target);
  assert.equal(next().skill, null);
  assert.equal(next().stage, 'inspecao');
  assert.match(next().instruction, /caminhos.*evidências/i);
  assert.deepEqual(intentTree(target), before);
});

test('intenção de produto mantém inspeção conservadora quando inventário é truncado', t => {
  const { target, write } = fixture(t), large = join(target, 'huge');
  mkdirSync(large); write('src/app.mjs', 'export const app = true;\n');
  write('docs/PRD.md', '# Documento existente\n');
  const original = fs.opendirSync;
  const ignored = { name: 'node_modules', isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false };
  fs.opendirSync = (...args) => {
    if (String(args[0]) !== large) return original(...args);
    let reads = 0; return { readSync: () => (++reads <= 30000 ? ignored : null), closeSync: () => {} };
  };
  let step;
  try { step = getNextSteps({ command: 'next', target, installed: true, intent: 'product' })[0]; }
  finally { fs.opendirSync = original; }
  assert.match(step.instruction, /inspecione manualmente/i);
  assert.equal(step.skill, undefined); assert.equal(step.command, undefined);
  assert.doesNotMatch(step.instruction, /(?:não|nao) (?:há|ha|existem?|existe) (?:documentos|docs|prd|design)/i);
});

test('intenção de produto não escolhe etapa com inventário documental truncado', t => {
  const { target, write } = fixture(t);
  write('src/app.mjs', 'export const app = true;\n');
  state(write, { prd: 'rascunho' });
  write('docs/PRD-grande.md', '# Documento humano\n' + 'a'.repeat(2 * 1024 * 1024 + 1));
  const report = inspectProject(target);
  assert.equal(report.scan.truncated, false);
  assert.equal(report.documentation.scan.truncated, true);
  const product = getNextSteps({ command: 'next', target, installed: true, intent: 'product' })[0];
  assert.equal(product.skill, undefined);
  assert.equal(product.stage, undefined);
  assert.equal(product.maturity, undefined);
  assert.match(product.instruction, /inspecione manualmente/i);
  for (const intent of [undefined, 'run']) {
    assert.equal(getNextSteps({ command: 'next', target, installed: true, intent })[0].skill, 'preparar-dev');
  }
});

test('intenção de produto pede inspeção quando o inventário documental tem avisos', t => {
  const { target, write } = fixture(t);
  write('src/app.mjs', 'export const app = true;\n');
  state(write, { prd: 'rascunho' });
  const stateFile = '.pbai4devs/state/configuracao/ESTADO.md';
  const originalState = readFileSync(join(target, stateFile), 'utf8');
  const next = intent => getNextSteps({ command: 'next', target, installed: true, intent })[0];
  write(stateFile, originalState.replace('  prd: docs/prd.md', '  changelog: ../fora.md\n  prd: docs/prd.md'));
  let report = inspectProject(target);
  assert.equal(report.documentation.scan.truncated, false);
  assert.equal(report.documentation.scan.complete, false);
  assert.ok(report.documentation.warnings.some(item => item.reason === 'invalid-configured-path'));
  let before = intentTree(target);
  assert.equal(next('product').skill, undefined);
  assert.match(next('product').instruction, /inspecione manualmente/i);
  assert.equal(next('run').skill, 'preparar-dev');
  assert.deepEqual(intentTree(target), before);

  write(stateFile, originalState);
  write('docs/nao-lido.md', '# Documento humano\n');
  const document = join(target, 'docs/nao-lido.md'), originalOpen = fs.openSync;
  fs.openSync = (...args) => {
    if (String(args[0]) === document) throw Object.assign(new Error('fixture unreadable'), { code: 'EACCES' });
    return originalOpen(...args);
  };
  try {
    report = inspectProject(target);
    assert.equal(report.documentation.scan.truncated, false);
    assert.equal(report.documentation.scan.complete, false);
    assert.ok(report.documentation.warnings.some(item => item.reason === 'unreadable-document'));
    assert.equal(next('product').skill, undefined);
    assert.match(next('product').instruction, /inspecione manualmente/i);
    assert.equal(next('run').skill, 'preparar-dev');
  } finally { fs.openSync = originalOpen; }
  before = intentTree(target);
  assert.equal(next('product').skill, 'criar-prd');
  assert.deepEqual(intentTree(target), before);
});

test('intenção de produto pede inspeção para link opaco', t => {
  const { target, write } = fixture(t);
  write('src/app.mjs', 'export const app = true;\n');
  state(write, { prd: 'rascunho' });
  mkdirSync(join(target, 'assets'), { recursive: true });
  try { symlinkSync('destino-nao-inspecionado', join(target, 'assets/icon.png')); }
  catch (error) {
    if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) return t.skip('links simbólicos indisponíveis');
    throw error;
  }
  const report = inspectProject(target), before = intentTree(target);
  assert.equal(report.documentation.scan.complete, false);
  assert.ok(report.documentation.warnings.some(item => item.reason === 'symbolic-link-not-inspected'));
  const product = getNextSteps({ command: 'next', target, installed: true, intent: 'product' })[0];
  assert.equal(product.skill, undefined);
  assert.match(product.instruction, /inspecione manualmente/i);
  assert.equal(getNextSteps({ command: 'next', target, installed: true, intent: 'run' })[0].skill, 'preparar-dev');
  assert.deepEqual(intentTree(target), before);
});

test('intenção de produto informa falha global de inspeção sem escolher etapa', t => {
  const { target } = fixture(t), originalRealpath = fs.realpathSync;
  fs.realpathSync = (...args) => {
    if (String(args[0]) === target) throw Object.assign(new Error('fixture unreadable'), { code: 'EACCES' });
    return originalRealpath(...args);
  };
  try {
    const product = getNextSteps({ command: 'next', target, installed: true, intent: 'product' })[0];
    assert.equal(product.skill, undefined);
    assert.equal(product.command, undefined);
    assert.equal(product.stage, undefined);
    assert.equal(product.maturity, undefined);
    assert.match(product.instruction, /inspecione manualmente/i);
    for (const intent of [undefined, 'run']) {
      const legacy = getNextSteps({ command: 'next', target, installed: true, intent })[0];
      assert.equal(legacy.stage, 'verificacao');
      assert.match(legacy.command, /doctor/);
    }
  } finally { fs.realpathSync = originalRealpath; }
});

test('CLI recusa intenção ausente, inválida, repetida ou em outro comando', t => {
  const { target } = fixture(t), before = intentTree(target);
  for (const args of [
    ['next', '--intent'], ['next', '--intent', 'unknown'],
    ['next', '--intent', 'product', '--intent', 'run'],
    ['next', '--intent', 'run', '--intent', 'run'],
    ['doctor', '--intent', 'product'], ['init', '--intent', 'run'],
  ]) {
    const result = spawnSync(process.execPath, [join(root, 'bin/agentdevkit.mjs'), ...args, '--target', target, '--json'], { cwd: target, encoding: 'utf8', timeout: 60000 });
    assert.notEqual(result.status, 0, args.join(' '));
    assert.equal(JSON.parse(result.stdout).ok, false, args.join(' '));
  }
  const missing = spawnSync(process.execPath, [join(root, 'bin/agentdevkit.mjs'), '--json', '--target', target, 'next', '--intent'], { cwd: target, encoding: 'utf8', timeout: 60000 });
  assert.notEqual(missing.status, 0); assert.equal(JSON.parse(missing.stdout).ok, false);
  assert.deepEqual(intentTree(target), before);
});

test('tools preserva argumentos --intent opacos após separador', t => {
  const opaque = ['--', '--intent', 'unknown', '--intent', 'product'];
  const parsed = parseArgs(['tools', 'run', 'agent-browser', ...opaque]);
  assert.equal(parsed.command, 'tools');
  assert.deepEqual(parsed.toolArgs, ['run', 'agent-browser', ...opaque]);
  assert.equal(parsed.intent, undefined);
  const { target, write } = fixture(t);
  write('.pbai4devs/state/agentdevkit.json', JSON.stringify({ schemaVersion: 1, version: packageInfo.version, language: 'pt', files: {}, blocks: {} }));
  write('.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs', 'process.stdout.write(JSON.stringify(process.argv.slice(2)));\n');
  const result = spawnSync(process.execPath, [join(root, 'bin/agentdevkit.mjs'), '--json', '--target', target, 'tools', 'run', 'agent-browser', ...opaque], { cwd: target, encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const response = JSON.parse(result.stdout);
  assert.deepEqual(JSON.parse(response.toolOutput), ['run', 'agent-browser', ...opaque]);
});

test('help e version permanecem globais com intenção válida', t => {
  const { target } = fixture(t), before = intentTree(target);
  for (const [flag, expected] of [['--help', 'help'], ['--version', 'version']]) {
    const args = ['next', '--intent', 'product', flag, '--json', '--target', target];
    const result = spawnSync(process.execPath, [join(root, 'bin/agentdevkit.mjs'), ...args], { cwd: target, encoding: 'utf8', timeout: 60000 });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const response = JSON.parse(result.stdout);
    assert.equal(response.ok, true);
    assert.equal(response.command, expected);
  }
  assert.deepEqual(intentTree(target), before);
});
