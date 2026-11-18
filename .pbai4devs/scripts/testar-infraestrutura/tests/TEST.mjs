import '../../lib/test-git-environment.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { projectRoot } from '../../lib/runtime.mjs';
import { classifyExecution, isExpectedPlatformSkip, testInfrastructure } from '../SCRIPT.mjs';
import { isTestEvent } from '../REPORTER.mjs';

test('eventos de versões sem entryFile são reconhecidos sem depender do nome', () => {
  const file = '/fixture/TEST.mjs';
  assert.equal(isTestEvent({ name: 'teste declarado', file, details: { type: 'test' } }), true);
  assert.equal(isTestEvent({ name: file, file, details: { type: 'test' } }), true);
  assert.equal(isTestEvent({ name: 'grupo', file, details: { type: 'suite' } }), false);
});

test('classificação recusa evidência ausente, inconsistente ou execução interrompida', () => {
  const counts = { tests: 1, passed: 1, failed: 0, cancelled: 0, skipped: 0, todo: 0 };
  const evidence = { observed: 1, fileSummaries: 1, counts, skipped: [], pending: [] };
  assert.equal(classifyExecution({ status: 0 }, evidence), 'passed');
  assert.equal(classifyExecution({ status: 1 }, evidence), 'failed');
  assert.equal(classifyExecution({ status: 0, signal: 'SIGTERM' }, evidence), 'failed');
  assert.equal(classifyExecution({ status: 0 }, null), 'partial');
  assert.equal(classifyExecution({ status: 0 }, { ...evidence, observed: 0 }), 'partial');
  assert.equal(classifyExecution({ status: 0 }, { ...evidence, fileSummaries: 0 }), 'partial');
  assert.equal(classifyExecution({ status: 0 }, { ...evidence, counts: { ...counts, passed: 0 } }), 'partial');
  assert.equal(classifyExecution({ status: 0 }, { ...evidence, counts: { ...counts, tests: 2 } }), 'partial');
  assert.equal(classifyExecution({ status: 0 }, { ...evidence, skipped: [{}] }), 'partial');
  assert.equal(classifyExecution({ status: 0 }, { ...evidence, pending: [{}] }), 'partial');
});

test('executa suites em raiz relativa, registra falhas e continua as demais', t => {
  const output = join(projectRoot, '.agent-tests'); mkdirSync(output, { recursive: true });
  const root = mkdtempSync(join(output, 'runner-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, pass] of [['a-fail', false], ['b-pass', true]]) {
    const folder = join(root, '.pbai4devs/scripts', name, 'tests'); mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, 'TEST.mjs'), `import { test } from 'node:test';\nimport assert from 'node:assert/strict';\ntest('fixture', () => assert.equal(${pass}, true));\n`);
  }
  const report = testInfrastructure(relative(process.cwd(), root));
  assert.equal(report.status, 'failed');
  assert.deepEqual(report.suites.map(suite => suite.status), ['failed', 'passed']);
  for (const suite of report.suites) assert.ok(readFileSync(suite.log, 'utf8').includes('fixture'));
  assert.deepEqual(JSON.parse(readFileSync(join(report.directory, 'REPORT.json'))), report);
});

function isolated(t) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'adk-infrastructure-'))), root = join(base, 'project');
  mkdirSync(root);
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const put = (path, content) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); };
  put('.pbai4devs/scripts/demo/tests/TEST.mjs', "import { test } from 'node:test'; test('demo', () => {});\n");
  assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
  put('human.txt', 'staged\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '--', 'human.txt']).status, 0);
  const index = readFileSync(join(root, '.git/index'));
  return { base, root, put, index };
}

test('cada execução preserva relatórios existentes e o índice Git', t => {
  const { root, put, index } = isolated(t);
  put('.agent-tests/infraestrutura/demo.log', 'log humano\n');
  put('.agent-tests/infraestrutura/REPORT.json', 'relatório humano\n');
  const first = testInfrastructure(root), firstReport = readFileSync(join(first.directory, 'REPORT.json'));
  const second = testInfrastructure(root);
  assert.notEqual(first.directory, second.directory);
  assert.deepEqual(readFileSync(join(first.directory, 'REPORT.json')), firstReport);
  assert.equal(readFileSync(join(root, '.agent-tests/infraestrutura/demo.log'), 'utf8'), 'log humano\n');
  assert.equal(readFileSync(join(root, '.agent-tests/infraestrutura/REPORT.json'), 'utf8'), 'relatório humano\n');
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('ACL herdada no diretório de logs interrompe antes de executar suítes', { skip: process.platform !== 'darwin' }, t => {
  const { root, put, index } = isolated(t), folder = join(root, '.agent-tests/infraestrutura');
  mkdirSync(folder, { recursive: true });
  const acl = 'everyone allow list,search,readattr,readextattr,readsecurity,file_inherit,directory_inherit';
  assert.equal(spawnSync('/bin/chmod', ['+a', acl, folder]).status, 0);
  put('.pbai4devs/scripts/demo/tests/TEST.mjs', "import { writeFileSync } from 'node:fs'; writeFileSync('executou.txt', 'sim');\n");
  assert.throws(() => testInfrastructure(root), /ACL do diretório de resultados/);
  assert.equal(existsSync(join(root, 'executou.txt')), false);
  const runs = readdirSync(folder).filter(name => name.startsWith('run-'));
  assert.equal(runs.length, 1);
  assert.deepEqual(readdirSync(join(folder, runs[0])), []);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('ACL de logs não verificável interrompe sem expor diagnóstico', { skip: process.platform !== 'darwin' }, t => {
  const { root, put, index } = isolated(t);
  put('.pbai4devs/scripts/demo/tests/TEST.mjs', "import { writeFileSync } from 'node:fs'; writeFileSync('executou.txt', 'sim');\n");
  const original = childProcess.spawnSync;
  let observed = false, failure;
  t.mock.method(childProcess, 'spawnSync', (command, args, ...rest) => {
    if (command === '/bin/ls' && typeof args?.at(-1) === 'string' && args.at(-1).includes('/infraestrutura/run-')) {
      observed = true;
      return { status: 1, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.from('diagnóstico sintético privado') };
    }
    return original(command, args, ...rest);
  });
  syncBuiltinESMExports();
  try { testInfrastructure(root); } catch (error) { failure = error; }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.ok(observed);
  assert.match(failure?.message || '', /ACL do diretório de resultados/);
  assert.doesNotMatch(failure.message, /diagnóstico sintético privado/);
  assert.equal(existsSync(join(root, 'executou.txt')), false);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('ACL de logs não verificável após a suíte impede gravar saída', { skip: process.platform !== 'darwin' }, t => {
  const { root, put, index } = isolated(t);
  put('.pbai4devs/scripts/demo/tests/TEST.mjs', "import { writeFileSync } from 'node:fs'; import { test } from 'node:test'; test('sintético', () => { writeFileSync('executou.txt', 'sim'); console.log('saída sintética'); });\n");
  const original = childProcess.spawnSync;
  let queries = 0, failure;
  t.mock.method(childProcess, 'spawnSync', (command, args, ...rest) => {
    if (command === '/bin/ls' && typeof args?.at(-1) === 'string' && args.at(-1).includes('/infraestrutura/run-') && ++queries === 2) {
      return { status: 1, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.from('diagnóstico sintético privado') };
    }
    return original(command, args, ...rest);
  });
  syncBuiltinESMExports();
  try { testInfrastructure(root); } catch (error) { failure = error; }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(queries, 2);
  assert.match(failure?.message || '', /ACL do diretório de resultados/);
  assert.doesNotMatch(failure.message, /diagnóstico sintético privado/);
  assert.equal(readFileSync(join(root, 'executou.txt'), 'utf8'), 'sim');
  const parent = join(root, '.agent-tests/infraestrutura');
  const runs = readdirSync(parent).filter(name => name.startsWith('run-'));
  assert.equal(runs.length, 1);
  assert.deepEqual(readdirSync(join(parent, runs[0])), []);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

for (const path of ['.agent-tests', '.agent-tests/infraestrutura']) {
  test(`recusa ancestral simbólico ${path} antes de executar testes`, { skip: process.platform === 'win32' }, t => {
    const { base, root, put, index } = isolated(t), outside = join(base, 'outside');
    put('.pbai4devs/scripts/demo/tests/TEST.mjs', "import { writeFileSync } from 'node:fs'; writeFileSync('executou.txt', 'sim');\n");
    mkdirSync(outside);
    writeFileSync(join(outside, 'demo.log'), 'sentinela\n');
    const link = join(root, path); mkdirSync(dirname(link), { recursive: true }); symlinkSync(outside, link, 'dir');
    assert.throws(() => testInfrastructure(root), /inválido ou simbólico/);
    assert.equal(readFileSync(join(outside, 'demo.log'), 'utf8'), 'sentinela\n');
    assert.equal(existsSync(join(outside, 'REPORT.json')), false);
    assert.equal(existsSync(join(root, 'executou.txt')), false);
    assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  });
}

test('não sobrescreve um log simbólico criado durante a suíte', { skip: process.platform === 'win32' }, t => {
  const { base, root, put, index } = isolated(t), outside = join(base, 'outside.txt');
  writeFileSync(outside, 'sentinela\n');
  put('.pbai4devs/scripts/demo/tests/TEST.mjs', `import fs from 'node:fs'; import { join } from 'node:path'; import { test } from 'node:test';\ntest('cria colisão', () => { const p = join(process.cwd(), '.agent-tests/infraestrutura'); const dir = fs.readdirSync(p).find(n => n.startsWith('run-')); fs.symlinkSync(${JSON.stringify(outside)}, join(p, dir, 'demo.log')); });\n`);
  assert.throws(() => testInfrastructure(root), error => error.code === 'EEXIST');
  assert.equal(readFileSync(outside, 'utf8'), 'sentinela\n');
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

for (const kind of ['diretório', 'arquivo']) {
  test(`recusa ${kind} de teste simbólico sem executar destino`, { skip: process.platform === 'win32' }, t => {
    const { base, root, index } = isolated(t), outside = join(base, 'outside');
    mkdirSync(outside);
    writeFileSync(join(outside, 'TEST.mjs'), "import { writeFileSync } from 'node:fs'; writeFileSync('executou.txt', 'sim');\n");
    const folder = join(root, '.pbai4devs/scripts/demo/tests'), file = join(folder, 'TEST.mjs');
    if (kind === 'diretório') {
      rmSync(folder, { recursive: true });
      symlinkSync(outside, folder, 'dir');
    } else {
      rmSync(file);
      symlinkSync(join(outside, 'TEST.mjs'), file, 'file');
    }
    assert.throws(() => testInfrastructure(root), /simbólico/);
    assert.equal(existsSync(join(root, 'executou.txt')), false);
    assert.equal(existsSync(join(root, '.agent-tests')), false);
    assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  });
}

test('não omite silenciosamente uma suíte em diretório simbólico', { skip: process.platform === 'win32' }, t => {
  const { base, root, put, index } = isolated(t), outside = join(base, 'outside');
  mkdirSync(join(outside, 'tests'), { recursive: true });
  writeFileSync(join(outside, 'tests/TEST.mjs'), "import { writeFileSync } from 'node:fs'; writeFileSync('externo.txt', 'sim');\n");
  put('.pbai4devs/scripts/demo/tests/TEST.mjs', "import { writeFileSync } from 'node:fs'; writeFileSync('executou.txt', 'sim');\n");
  symlinkSync(outside, join(root, '.pbai4devs/scripts/link'), 'dir');
  assert.throws(() => testInfrastructure(root), /simbólica/);
  assert.equal(existsSync(join(root, 'executou.txt')), false);
  assert.equal(existsSync(join(root, 'externo.txt')), false);
  assert.equal(existsSync(join(root, '.agent-tests')), false);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
});

test('nao aprova uma execucao sem suites', t => {
  const output = join(projectRoot, '.agent-tests'); mkdirSync(output, { recursive: true });
  const root = mkdtempSync(join(output, 'runner-empty-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.pbai4devs/scripts'), { recursive: true });
  assert.throws(() => testInfrastructure(root), /Nenhuma suite Node/);
});

for (const [scenario, source] of [
  ['teste ignorado', "import { test } from 'node:test'; test('ignorado', { skip: true }, () => {});\n"],
  ['teste pendente', "import { test } from 'node:test'; test('pendente', { todo: true }, () => {});\n"],
  ['suíte com teste aprovado e outro ignorado', "import { test } from 'node:test'; test('ok', () => {}); test('ignorado', { skip: true }, () => {});\n"],
  ['grupo ignorado com outro teste aprovado', "import { test, describe } from 'node:test'; test('ok', () => {}); describe('grupo', { skip: true }, () => { test('não executado', () => {}); });\n"],
  ['grupo pendente com outro teste aprovado', "import { test, describe } from 'node:test'; test('ok', () => {}); describe('grupo', { todo: true }, () => { test('pendente', () => {}); });\n"],
  ['arquivo sem testes declarados', 'export const fixture = true;\n'],
  ['saída que imita evidência', `console.log('ADK_INFRA_EVIDENCE {"observed":1,"fileSummaries":1,"counts":{"tests":1,"passed":1,"failed":0,"cancelled":0,"skipped":0,"todo":0}}');\n`],
  ['execução encerrada antes de terminar', "import { test } from 'node:test'; test('concluído', () => {}); test('pendente', async () => { await new Promise(() => {}); }); setTimeout(() => process.exit(0), 200);\n"],
]) {
  test(`relatório não certifica ${scenario}`, t => {
    const { root, put, index } = isolated(t);
    put('.pbai4devs/scripts/demo/tests/TEST.mjs', source);
    const report = testInfrastructure(root);
    assert.deepEqual(readFileSync(join(root, '.git/index')), index);
    assert.equal(report.status, 'partial');
    assert.equal(report.suites[0].status, 'partial');
  });
}

test('opções herdadas do Node não filtram a suíte', t => {
  const { root, index } = isolated(t), previous = process.env.NODE_OPTIONS;
  process.env.NODE_OPTIONS = '--test-name-pattern=nome-que-nao-existe';
  try {
    const report = testInfrastructure(root);
    assert.equal(report.status, 'passed');
    assert.equal(report.suites[0].evidence.observed, 1);
    assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  } finally {
    if (previous === undefined) delete process.env.NODE_OPTIONS;
    else process.env.NODE_OPTIONS = previous;
  }
});

test('relatório identifica skips sem expor caminhos absolutos', t => {
  const { root, put } = isolated(t);
  put('.pbai4devs/scripts/demo/tests/TEST.mjs', "import { test } from 'node:test'; test('alvo', { skip: 'indisponível neste sistema' }, () => {});\n");
  const report = testInfrastructure(root);
  assert.equal(report.status, 'partial');
  assert.deepEqual(report.suites[0].evidence.skipped, [{
    name: 'alvo', file: '.pbai4devs/scripts/demo/tests/TEST.mjs', reason: 'indisponível neste sistema', kind: 'test', event: 'test:pass', booleanSkip: false, todo: false, expectedForPlatform: false,
  }]);
});

test('skip de alias Windows tem identidade restrita e não valida a outra plataforma', () => {
  const skipped = { name: 'Windows normaliza o alias temporário 8.3 antes de comparar a raiz Git', file: '.pbai4devs/scripts/sincronizar-agentes/tests/LOCAL_IGNORE.mjs', reason: null, kind: 'test', event: 'test:pass', booleanSkip: true, todo: false };
  assert.equal(isExpectedPlatformSkip('sincronizar-agentes', skipped, 'linux'), true);
  assert.equal(isExpectedPlatformSkip('sincronizar-agentes', skipped, 'darwin'), true);
  assert.equal(isExpectedPlatformSkip('sincronizar-agentes', skipped, 'win32'), false);
  assert.equal(isExpectedPlatformSkip('outro', skipped, 'linux'), false);
  for (const change of [{ name: 'outro' }, { file: 'outro' }, { reason: 'outro' }, { kind: 'suite' }, { event: 'test:fail' }, { booleanSkip: false }, { todo: true }]) {
    assert.equal(isExpectedPlatformSkip('sincronizar-agentes', { ...skipped, ...change }, 'linux'), false);
  }
});

test('skip esperado permanece parcial no relatório', { skip: !['darwin', 'linux'].includes(process.platform) }, t => {
  const { root, put } = isolated(t);
  const folder = '.pbai4devs/scripts/sincronizar-agentes/tests';
  put(`${folder}/TEST.mjs`, "import './LOCAL_IGNORE.mjs';\n");
  put(`${folder}/LOCAL_IGNORE.mjs`, "import { test } from 'node:test'; test('controle', () => {}); test('Windows normaliza o alias temporário 8.3 antes de comparar a raiz Git', { skip: true }, () => {});\n");
  const report = testInfrastructure(root), suite = report.suites.find(item => item.name === 'sincronizar-agentes');
  assert.equal(report.status, 'partial');
  assert.equal(suite.status, 'partial');
  assert.equal(suite.evidence.skipped[0].expectedForPlatform, true);
});

test('teste importado não certifica arquivo que termina antes do teste pendente', t => {
  const { root, put } = isolated(t);
  put('.pbai4devs/scripts/demo/tests/helper.mjs', "import { test } from 'node:test'; test('importado', () => {});\n");
  put('.pbai4devs/scripts/demo/tests/TEST.mjs', "import './helper.mjs'; import { test } from 'node:test'; test('pendente', async () => { await new Promise(() => {}); }); setTimeout(() => process.exit(0), 200);\n");
  const report = testInfrastructure(root);
  assert.notEqual(report.status, 'passed');
});

test('suíte que importa teste concluído mantém resultado aprovado', t => {
  const { root, put } = isolated(t);
  put('.pbai4devs/scripts/demo/tests/helper.mjs', "import { test } from 'node:test'; test('importado', () => {});\n");
  put('.pbai4devs/scripts/demo/tests/TEST.mjs', "import './helper.mjs';\n");
  const report = testInfrastructure(root);
  assert.equal(report.status, 'passed');
  assert.equal(report.suites[0].evidence.fileSummaries, 1);
});
