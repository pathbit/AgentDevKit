import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkMerge, checkReview, prepareReview, sealReview, specCriteria } from '../SCRIPT.mjs';
import { projectRoot } from '../../lib/runtime.mjs';

function fixture(t) {
  mkdirSync(join(projectRoot, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(projectRoot, '.agent-tests/review-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result.stdout;
  };
  git('init', '-q');
  const put = (file, body) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), body); };
  put('.gitignore', '/.agent-tests/\n'); put('README.md', '# Projeto\n'); put('src/main.mjs', 'export const value=1;\n');
  put('spec.md', '# Spec\n\n## Critérios de aceite\n\n| ID | Resultado |\n| --- | --- |\n| AC-001 | Um |\n| AC-002 | Dois |\n\n## Dependências\n\nNenhuma.\n');
  return { root, git, put };
}

function approved(t, options = {}, setup = () => {}, seal = true) {
  const f = fixture(t);
  setup(f);
  const made = prepareReview({ root: f.root, id: 'mudanca', execution: 'exec-1', scope: ['src/main.mjs'], spec: 'spec.md', ...options });
  const report = made.report;
  for (const item of report.documentation) Object.assign(item, { decision: 'no-impact', reason: 'Comportamento externo preservado; revisado.' });
  const proof = '.agent-tests/mudanca/exec-1/test.txt'; f.put(proof, 'teste real de fixture passou\n');
  for (const item of report.validation) Object.assign(item, { method: 'node --test', prerequisite: 'Node 24', assertion: 'Resultado esperado presente', evidence: [proof], status: 'passed' });
  report.review = { status: 'approved', reviewer: 'revisor-independente', findings: [] };
  const save = () => f.put(made.file, JSON.stringify(report, null, 2)); save();
  if (seal) sealReview(made.file, { root: f.root });
  return { ...f, ...made, save, proof };
}

test('aprova relatorio completo e liga spec, documentos e evidencias ignoradas', t => {
  const f = approved(t);
  assert.equal(checkReview(f.file, { root: f.root }).status, 'passed');
  assert.equal(f.report.validation.length, 2);
  assert.ok(f.report.snapshot.files.some(item => item.path === 'README.md'));
  assert.ok(f.report.snapshot.files.some(item => item.path === 'spec.md'));
  assert.equal(f.git('ls-files', '--', '.agent-tests').trim(), '');
});

test('instrucoes existentes entram na revisao e mudancas posteriores invalidam o selo', async t => {
  for (const file of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) await t.test(file, t => {
    const f = approved(t, {}, f => f.put(file, '# Instrucoes\n'));
    assert.ok(f.report.documentation.some(item => item.path === file));
    assert.ok(f.report.snapshot.files.some(item => item.path === file));
    f.put(file, '# Instrucoes alteradas\n');
    assert.throws(() => checkReview(f.file, { root: f.root }), /mudaram/);
  });
});

test('instrucoes criadas apos o preparo exigem novo snapshot mesmo em escopo limitado', async t => {
  for (const file of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) await t.test(file, t => {
    const f = approved(t, {}, () => {}, false);
    f.put(file, '# Novas instrucoes\n');
    f.report.documentation.push({ path: file, decision: 'no-impact', reason: 'Revisado apos o preparo.' });
    f.save();
    assert.throws(() => sealReview(f.file, { root: f.root }), /Documentos obrigatorios mudaram/);
  });
});

test('relatorio inicial nao aprova entrega nem sobrescreve evidencias anteriores', t => {
  const f = fixture(t);
  const options = { root: f.root, id: 'mudanca', execution: 'exec-1', scope: ['src/main.mjs'] };
  const result = prepareReview(options);
  assert.throws(() => checkReview(result.file, { root: f.root }), /pendente|invalida/);
  assert.throws(() => prepareReview(options), /ja existe/);
});

test('mudanca de codigo, spec ou documento depois do snapshot exige nova revisao', async t => {
  for (const file of ['src/main.mjs', 'spec.md', 'README.md']) await t.test(file, t => {
    const f = approved(t); f.put(file, readFileSync(join(f.root, file), 'utf8') + '\nMudanca posterior.');
    assert.throws(() => checkReview(f.file, { root: f.root }), /mudaram/);
  });
});

test('em modo git um novo arquivo elegivel invalida a revisao', t => {
  const f = approved(t, { scope: [] });
  f.put('novo.mjs', 'export {};');
  assert.throws(() => checkReview(f.file, { root: f.root }), /mudaram/);
});

test('todos os criterios precisam resultado e prova; nao executado nao e aprovado', async t => {
  for (const status of ['pending', 'failed', 'not-run', 'not-applicable']) await t.test(status, t => {
    const f = approved(t); f.report.validation[0].status = status; f.save();
    assert.throws(() => checkReview(f.file, { root: f.root }), /sem prova/);
  });
  await t.test('criterio ausente', t => {
    const f = approved(t); f.report.validation.pop(); f.save();
    assert.throws(() => checkReview(f.file, { root: f.root }), /sem resultado/);
  });
});

test('provas vazias, fora do diretorio e forcadas no Git sao recusadas', async t => {
  await t.test('vazia', t => { const f = approved(t); f.put(f.proof, ''); assert.throws(() => checkReview(f.file, { root: f.root }), /vazia/); });
  await t.test('fora', t => { const f = approved(t); f.report.validation[0].evidence = ['README.md']; f.save(); assert.throws(() => checkReview(f.file, { root: f.root }), /Evidencia deve/); });
  await t.test('versionada', t => { const f = approved(t); f.git('add', '-f', f.proof); assert.throws(() => checkReview(f.file, { root: f.root }), /indice Git/); });
});

test('sem impacto exige motivo; omitir documento ou deixar achado aberto bloqueia', async t => {
  await t.test('motivo', t => { const f = approved(t); f.report.documentation[0].reason = ''; f.save(); assert.throws(() => checkReview(f.file, { root: f.root }), /documentacao/); });
  await t.test('documento', t => { const f = approved(t); f.report.documentation = []; f.save(); assert.throws(() => checkReview(f.file, { root: f.root }), /sem revisao/); });
  await t.test('achado', t => { const f = approved(t); f.report.review.findings.push({ id: 'R1', description: 'Correcao necessaria', status: 'open' }); f.save(); assert.throws(() => checkReview(f.file, { root: f.root }), /abertos/); });
});

test('caminhos perigosos e relatorios fora de local ignorado sao recusados', t => {
  const f = fixture(t);
  for (const scope of [['../fora'], ['.git/config']]) assert.throws(() => prepareReview({ root: f.root, id: 'mudanca', scope }), /fora do escopo/);
  f.put('.gitignore', '');
  assert.throws(() => prepareReview({ root: f.root, id: 'mudanca', scope: ['src/main.mjs'] }), /ignorado/);
});

test('links simbolicos nao viram prova ou documento autorizado', t => {
  const f = approved(t); const target = '.agent-tests/mudanca/exec-1/link.txt';
  try { symlinkSync(join(f.root, f.proof), join(f.root, target)); }
  catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) return t.skip('Sem permissao de symlink.'); throw error; }
  f.report.validation[0].evidence = [target]; f.save();
  assert.throws(() => checkReview(f.file, { root: f.root }), /simbolico/);
});

test('spec sem IDs claros nao passa pelo preparo', () => {
  assert.throws(() => specCriteria('## Critérios de aceite\n\nFunciona.\n'), /AC-001/);
  assert.deepEqual(specCriteria('## Critérios de aceite\nAC-001\nAC-001\n\n## Referências\nAC-999'), ['AC-001']);
});

test('placeholders no plano nao contam como validacao definida', t => {
  const f = approved(t); f.report.validation[0].assertion = 'A definir.'; f.save();
  assert.throws(() => checkReview(f.file, { root: f.root }), /incompleto/);
});

test('documento extra nao Markdown permanece obrigatorio e protegido pelo snapshot', t => {
  const f = fixture(t); f.put('api/openapi.yaml', 'openapi: 3.1.0\n');
  const made = prepareReview({ root: f.root, id: 'mudanca', execution: 'extra', scope: ['src/main.mjs'], documents: ['api/openapi.yaml'] });
  assert.ok(made.report.snapshot.documents.includes('api/openapi.yaml'));
  assert.ok(made.report.snapshot.files.some(file => file.path === 'api/openapi.yaml'));
  made.report.documentation = made.report.documentation.filter(item => item.path !== 'api/openapi.yaml');
  for (const item of made.report.documentation) Object.assign(item, { decision: 'no-impact', reason: 'Revisado sem alteracao.' });
  f.put(made.file, JSON.stringify(made.report));
  assert.throws(() => checkReview(made.file, { root: f.root }), /Documento sem revisao/);
});

test('spec e documento de referencia nao podem ser artefatos ignorados', t => {
  const f = fixture(t); f.put('.agent-tests/spec.md', readFileSync(join(f.root, 'spec.md')));
  assert.throws(() => prepareReview({ root: f.root, id: 'mudanca', spec: '.agent-tests/spec.md' }), /versionavel/);
  assert.throws(() => prepareReview({ root: f.root, id: 'mudanca', documents: ['.agent-tests/relatorio.txt'] }), /versionavel/);
});

test('remover referencia da spec do relatorio nao remove sua obrigatoriedade', t => {
  const f = approved(t); f.report.spec = null; f.save();
  assert.throws(() => checkReview(f.file, { root: f.root }), /Baseline|referencias alteradas/);
});

test('indice Git precisa corresponder ao codigo testado antes de commit', t => {
  const f = approved(t, {}, f => {
    f.git('add', 'src/main.mjs');
    f.put('src/main.mjs', 'export const value=2;\n');
  }, false);
  assert.throws(() => checkReview(f.file, { root: f.root }), /Indice Git difere/);
  f.git('add', 'src/main.mjs');
  sealReview(f.file, { root: f.root });
  assert.equal(checkReview(f.file, { root: f.root }).status, 'passed');
});

test('alterar evidencia apos a aprovacao invalida o selo', t => {
  const f = approved(t); f.put(f.proof, 'TESTE FALHOU\n');
  assert.throws(() => checkReview(f.file, { root: f.root }), /apos selar/);
  assert.throws(() => sealReview(f.file, { root: f.root }), /apos selar/);
});

test('remover spec e criterios do JSON nao altera a baseline do preparo', t => {
  const f = approved(t);
  f.report.spec = null; f.report.snapshot.spec = null;
  f.report.snapshot.files = f.report.snapshot.files.filter(item => item.path !== 'spec.md');
  f.report.snapshot.documents = f.report.snapshot.documents.filter(path => path !== 'spec.md');
  f.report.validation.pop(); f.save();
  assert.throws(() => checkReview(f.file, { root: f.root }), /Baseline/);
});

test('check exige selo sem permitir bypass pela API', t => {
  const f = approved(t, {}, () => {}, false);
  assert.throws(() => checkReview(f.file, { root: f.root, requireSeal: false }), /nao selada/);
  sealReview(f.file, { root: f.root });
  assert.equal(checkReview(f.file, { root: f.root }).status, 'passed');
});

function stageUntrack(f, file = 'generated.md', ignore = true) {
  f.put(file, '# Saida local\n');
  f.git('add', '-f', '--', file);
  f.git('-c', 'user.name=Test User', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=disabled-hooks', 'commit', '-q', '-m', 'test: fixture base');
  f.git('rm', '--cached', '--', file);
  if (ignore) f.put('.git/info/exclude', `/${file}\n`);
}

test('desindexação real registra ação e hash físico sem exigir documento local', async t => {
  for (const scope of [[], ['generated.md']]) await t.test(scope.length ? 'scope' : 'git', t => {
    const f = approved(t, { scope }, f => stageUntrack(f));
    const file = f.report.snapshot.files.find(file => file.path === 'generated.md');
    assert.equal(file.indexAction, 'untrack'); assert.match(file.sha256, /^[a-f0-9]{64}$/);
    assert.equal(f.report.documentation.some(item => item.path === 'generated.md'), false);
    assert.ok(existsSync(join(f.root, 'generated.md')));
    assert.equal(f.git('ls-files', 'generated.md'), '');
    assert.equal(checkReview(f.file, { root: f.root }).status, 'passed');
  });
});

test('desindexação sem ignore continua bloqueada em git e scope', async t => {
  for (const scope of [[], ['generated.md']]) await t.test(scope.length ? 'scope' : 'git', t => {
    assert.throws(() => approved(t, { scope }, f => stageUntrack(f, 'generated.md', false)), /Indice Git difere/);
  });
});

test('mudanças no arquivo, índice ou ignore invalidam a revisão de desindexação', async t => {
  const cases = [
    ['conteudo', f => f.put('generated.md', '# Editado depois\n')],
    ['indice', f => f.git('add', '-f', 'generated.md')],
    ['ignore', f => f.put('.git/info/exclude', '')],
    ['arquivo removido', f => rmSync(join(f.root, 'generated.md'))],
  ];
  for (const [name, change] of cases) await t.test(name, t => {
    const f = approved(t, { scope: [] }, f => stageUntrack(f));
    change(f);
    assert.throws(() => checkReview(f.file, { root: f.root }), /mudaram|desindexacao/);
  });
});

test('entradas ignoradas fora do índice não entram nos documentos obrigatórios', t => {
  const f = approved(t, {}, f => {
    f.put('AGENTS.md', '# Gerado\n'); f.put('CLAUDE.md', '# Gerado\n'); f.put('GEMINI.md', '# Gerado\n');
    f.put('.git/info/exclude', '/AGENTS.md\n/CLAUDE.md\n/GEMINI.md\n');
  });
  for (const name of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) assert.equal(f.report.documentation.some(item => item.path === name), false);
  assert.equal(checkReview(f.file, { root: f.root }).status, 'passed');
});

test('documentos rastreados permanecem obrigatórios mesmo com regra de ignore', t => {
  const f = approved(t, {}, f => {
    f.put('AGENTS.md', '# Instrução versionada\n');
    f.git('add', 'AGENTS.md', 'spec.md');
    f.put('.git/info/exclude', '/AGENTS.md\n/spec.md\n');
  });
  assert.ok(f.report.documentation.some(item => item.path === 'AGENTS.md'));
  assert.ok(f.report.documentation.some(item => item.path === 'spec.md'));
  assert.equal(checkReview(f.file, { root: f.root }).status, 'passed');
});

function mergeFixture(t, { scope = ['src/main.mjs', 'src/old.txt', 'src/new.txt'], dirty = false, seal = true, ignoredSubmodule = false } = {}) {
  const f = fixture(t);
  const commit = message => f.git('-c', 'user.name=Test User', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=disabled-hooks', 'commit', '-q', '-m', message);
  f.put('src/old.txt', 'original\n'); f.git('add', '.'); commit('test: base');
  f.git('branch', '-M', 'main'); f.git('checkout', '-q', '-b', 'feature');
  f.put('src/main.mjs', 'export const value=2;\n');
  f.git('mv', 'src/old.txt', 'src/new.txt'); f.git('add', 'src/main.mjs'); commit('test: source');
  if (ignoredSubmodule) {
    const object = f.git('rev-parse', 'HEAD').trim();
    f.git('update-index', '--add', '--cacheinfo', `160000,${object},vendor`);
    commit('test: submodule');
    f.git('config', 'diff.ignoreSubmodules', 'all');
  }
  if (dirty) f.put('src/main.mjs', 'export const value=3; // not committed\n');
  const made = prepareReview({ root: f.root, id: 'merge', execution: 'review', scope });
  for (const item of made.report.documentation) Object.assign(item, { decision: 'no-impact', reason: 'Documento examinado na fixture.' });
  const proof = '.agent-tests/merge/review/proof.txt'; f.put(proof, 'Prova sintetica para testar validacao.\n');
  for (const item of made.report.validation) Object.assign(item, { method: 'fixture', prerequisite: 'fixture local', assertion: 'snapshot comparado', evidence: [proof], status: 'passed' });
  made.report.review = { status: 'approved', reviewer: 'simulacao de teste', findings: [] };
  f.put(made.file, JSON.stringify(made.report));
  if (seal) sealReview(made.file, { root: f.root });
  return { ...f, ...made, commit };
}

test('check-merge prova fast-forward completo sem alterar indice ou arquivos humanos', t => {
  const f = mergeFixture(t);
  f.put('human.txt', 'staged humano\n'); f.git('add', 'human.txt'); f.put('human.txt', 'alteracao humana\n');
  const index = readFileSync(join(f.root, '.git/index')), human = readFileSync(join(f.root, 'human.txt'));
  const result = checkMerge([f.file], 'refs/heads/main', { root: f.root });
  assert.equal(result.status, 'passed'); assert.equal(result.mode, 'fast-forward'); assert.equal(result.changes, 3);
  assert.equal(result.source, f.git('rev-parse', 'HEAD').trim()); assert.equal(result.target, f.git('rev-parse', 'main').trim());
  assert.deepEqual(readFileSync(join(f.root, '.git/index')), index); assert.deepEqual(readFileSync(join(f.root, 'human.txt')), human);
});

test('check-merge funciona na CLI e rejeita relatorio duplicado por alias', t => {
  const f = mergeFixture(t);
  const script = '.pbai4devs/scripts/revisar-entrega/SCRIPT.mjs', runtime = '.pbai4devs/scripts/lib/runtime.mjs';
  for (const file of [script, runtime]) { mkdirSync(dirname(join(f.root, file)), { recursive: true }); cpSync(join(projectRoot, file), join(f.root, file)); }
  const args = [join(f.root, script), 'check-merge', '--destino', 'refs/heads/main', f.file];
  const run = spawnSync(process.execPath, args, { cwd: f.root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr); assert.equal(JSON.parse(run.stdout).status, 'passed');
  assert.throws(() => checkMerge([f.file, `./${f.file}`], 'refs/heads/main', { root: f.root }), /sem repeticao/);
});

test('check-merge bloqueia conteudo nao commitado e escopo parcial', async t => {
  await t.test('working tree diferente do commit', t => {
    const f = mergeFixture(t, { dirty: true });
    assert.equal(checkReview(f.file, { root: f.root }).status, 'passed');
    assert.throws(() => checkMerge([f.file], 'refs/heads/main', { root: f.root }), /difere do commit/);
  });
  await t.test('omissao de arquivo removido', t => {
    const f = mergeFixture(t, { scope: ['src/main.mjs', 'src/new.txt'] });
    assert.throws(() => checkMerge([f.file], 'refs/heads/main', { root: f.root }), /sem revisao selada: src\/old.txt/);
  });
  await t.test('relatorio sem selo', t => {
    const f = mergeFixture(t, { seal: false });
    assert.throws(() => checkMerge([f.file], 'refs/heads/main', { root: f.root }), /nao selada/);
  });
});

test('check-merge aceita cobertura distribuida por relatorios selados', t => {
  const f = mergeFixture(t, { scope: ['src/main.mjs', 'src/new.txt'] });
  const made = prepareReview({ root: f.root, id: 'merge-extra', execution: 'review', scope: ['src/old.txt'] });
  for (const item of made.report.documentation) Object.assign(item, { decision: 'no-impact', reason: 'Documento examinado na fixture.' });
  const proof = '.agent-tests/merge-extra/review/proof.txt'; f.put(proof, 'Prova sintetica complementar.\n');
  for (const item of made.report.validation) Object.assign(item, { method: 'fixture', prerequisite: 'fixture local', assertion: 'delecao revisada', evidence: [proof], status: 'passed' });
  made.report.review = { status: 'approved', reviewer: 'simulacao de teste', findings: [] };
  f.put(made.file, JSON.stringify(made.report)); sealReview(made.file, { root: f.root });
  const result = checkMerge([f.file, made.file], 'refs/heads/main', { root: f.root });
  assert.equal(result.status, 'passed'); assert.equal(result.reports, 2); assert.equal(result.changes, 3);
});

test('check-merge recusa origem e destino invalidos, divergencia e tipos nao comprovados', async t => {
  await t.test('branch invalida ou identica', t => {
    const f = mergeFixture(t);
    for (const name of ['main', 'refs/heads/missing', 'refs/heads/feature', '--help']) assert.throws(() => checkMerge([f.file], name, { root: f.root }));
  });
  await t.test('historico divergente', t => {
    const f = mergeFixture(t); f.git('checkout', '-q', 'main'); f.put('different.txt', 'destino\n'); f.git('add', 'different.txt'); f.commit('test: target'); f.git('checkout', '-q', 'feature');
    assert.throws(() => checkMerge([f.file], 'refs/heads/main', { root: f.root }), /fast-forward/);
  });
  await t.test('HEAD destacado', t => {
    const f = mergeFixture(t); f.git('checkout', '-q', '--detach');
    assert.throws(() => checkMerge([f.file], 'refs/heads/main', { root: f.root }), /HEAD destacado/);
  });
  await t.test('origem fora das branches locais', t => {
    const f = mergeFixture(t); f.git('symbolic-ref', 'HEAD', 'refs/remotes/origin/feature');
    assert.throws(() => checkMerge([f.file], 'refs/heads/main', { root: f.root }), /origem deve ser uma branch local/);
  });
  await t.test('submodulo ignorado pela configuracao Git', t => {
    const f = mergeFixture(t, { ignoredSubmodule: true });
    assert.throws(() => checkMerge([f.file], 'refs/heads/main', { root: f.root }), /modo nao comprovado: vendor/);
    const script = '.pbai4devs/scripts/revisar-entrega/SCRIPT.mjs', runtime = '.pbai4devs/scripts/lib/runtime.mjs';
    for (const file of [script, runtime]) { mkdirSync(dirname(join(f.root, file)), { recursive: true }); cpSync(join(projectRoot, file), join(f.root, file)); }
    const run = spawnSync(process.execPath, [join(f.root, script), 'check-merge', '--destino', 'refs/heads/main', f.file], { cwd: f.root, encoding: 'utf8' });
    assert.equal(run.status, 1); assert.match(run.stderr, /modo nao comprovado: vendor/);
  });
  await t.test('link simbolico', t => {
    const f = mergeFixture(t);
    try { symlinkSync('main.mjs', join(f.root, 'src/link')); }
    catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) return t.skip('Sem permissao de symlink.'); throw error; }
    f.git('add', 'src/link'); f.commit('test: link');
    assert.throws(() => checkMerge([f.file], 'refs/heads/main', { root: f.root }), /simbolico|modo nao comprovado/);
  });
  await t.test('arquivo executavel', t => {
    const f = mergeFixture(t); f.git('update-index', '--chmod=+x', 'src/main.mjs'); f.commit('test: mode');
    assert.throws(() => checkMerge([f.file], 'refs/heads/main', { root: f.root }), /modo nao comprovado/);
  });
});
