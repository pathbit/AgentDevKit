import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { projectRoot } from '../../lib/runtime.mjs';
import { testInfrastructure } from '../SCRIPT.mjs';

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
  assert.deepEqual(JSON.parse(readFileSync(join(root, '.agent-tests/infraestrutura/REPORT.json'))), report);
});

test('nao aprova uma execucao sem suites', t => {
  const output = join(projectRoot, '.agent-tests'); mkdirSync(output, { recursive: true });
  const root = mkdtempSync(join(output, 'runner-empty-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.pbai4devs/scripts'), { recursive: true });
  assert.throws(() => testInfrastructure(root), /Nenhuma suite Node/);
});
