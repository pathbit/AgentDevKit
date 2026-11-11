#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { isMain, projectRoot, requireNode } from '../lib/runtime.mjs';

export function testInfrastructure(root = projectRoot) {
  requireNode();
  root = resolve(root);
  const scripts = join(root, '.pbai4devs/scripts');
  const output = join(root, '.agent-tests/infraestrutura');
  const suites = readdirSync(scripts, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(join(scripts, entry.name, 'tests/TEST.mjs')))
    .map(entry => entry.name).sort();
  if (!suites.length) throw new Error('Nenhuma suite Node encontrada.');
  mkdirSync(output, { recursive: true });
  const report = { status: 'passed', suites: [] };
  const environment = { ...process.env };
  // Cada --test precisa de seu proprio contexto, inclusive ao testar este runner.
  delete environment.NODE_TEST_CONTEXT;
  for (const name of suites) {
    const file = join(scripts, name, 'tests/TEST.mjs');
    const result = spawnSync(process.execPath, ['--test', file], { cwd: root, env: environment, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    const log = join(output, `${name}.log`);
    writeFileSync(log, `${result.stdout || ''}${result.stderr || ''}${result.error ? '\n' + result.error.message : ''}`);
    const passed = !result.error && result.status === 0;
    report.suites.push({ name, status: passed ? 'passed' : 'failed', log });
    console.log(`${name}=${passed ? 'passed' : 'failed'}`);
    if (!passed) { report.status = 'failed'; console.error(readFileSync(log, 'utf8').slice(-4000)); }
  }
  writeFileSync(join(output, 'REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`suites=${suites.length}`);
  return report;
}

if (isMain(import.meta.url)) {
  try { if (testInfrastructure().status !== 'passed') process.exitCode = 1; }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
