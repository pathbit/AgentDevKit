import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { getNextSteps } from '../src/next.mjs';
import { packageInfo } from '../src/config.mjs';
import { findNpmCli } from '../.pbai4devs/scripts/lib/npm.mjs';
import { inspectDocumentation, inspectProject } from '../.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function fixture(t) {
  const target = realpathSync(mkdtempSync(join(tmpdir(), "agentdevkit próximos $() ' -")));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const write = (file, content) => { const full = join(target, file); mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, content); };
  write('.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs', readFileSync(join(root, '.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs')));
  cpSync(join(root, '.pbai4devs/scripts/lib'), join(target, '.pbai4devs/scripts/lib'), { recursive: true });
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
