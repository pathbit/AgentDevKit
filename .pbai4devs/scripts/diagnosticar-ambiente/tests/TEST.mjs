import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { diagnose } from '../SCRIPT.mjs';
import { findExecutable, projectRoot, requireNode } from '../../lib/runtime.mjs';

test('diagnostico funciona so com Node e informa dependencias opcionais ausentes', t => {
  const output = join(projectRoot, '.agent-tests'); mkdirSync(output, { recursive: true });
  const root = mkdtempSync(join(output, 'diagnose-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const report = diagnose({ root, environment: { PATH: '' }, probe: () => { throw new Error('Nenhum processo opcional esperado.'); } });
  assert.equal(report.runtime.name, 'node'); assert.equal(report.runtime.executable, process.execPath);
  assert.equal(report.npm, null); assert.equal(report.git, null);
  assert.equal(report.docker.executable, null); assert.equal(report.docker.compose, false);
  assert.deepEqual(report.tools, []); assert.equal(existsSync(join(root, '.pbai4devs')), false);
});

test('requisito comum recusa Node antigo e procura executaveis sem shell', t => {
  assert.throws(() => requireNode(24, '22.22.0'), /Node.js >=24/);
  assert.doesNotThrow(() => requireNode(24, '24.13.0'));
  const output = join(projectRoot, '.agent-tests'); mkdirSync(output, { recursive: true });
  const root = mkdtempSync(join(output, 'runtime-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = join(root, process.platform === 'win32' ? 'fixture.exe' : 'fixture');
  writeFileSync(file, 'fixture'); chmodSync(file, 0o755);
  assert.equal(findExecutable(file), file);
  assert.equal(findExecutable('fixture', { PATH: dirname(file) }), file);
  assert.equal(findExecutable('missing', { PATH: dirname(file) }), null);
});

test('isMain reconhece caminho principal por alias sem executar imports como entrada', t => {
  const output = join(projectRoot, '.agent-tests'); mkdirSync(output, { recursive: true });
  const root = mkdtempSync(join(output, 'runtime alias espaço-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const real = join(root, 'real'), alias = join(root, 'alias'); mkdirSync(real);
  try { symlinkSync(real, alias, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (!['EPERM', 'EACCES'].includes(error.code)) throw error;
    t.skip('Sistema sem permissão para criar alias de diretório.'); return;
  }
  const script = join(real, 'entry.mjs');
  const runtime = pathToFileURL(join(projectRoot, '.pbai4devs/scripts/lib/runtime.mjs')).href;
  writeFileSync(script, `import { isMain } from ${JSON.stringify(runtime)};\nconst main = isMain(import.meta.url);\nconsole.log(main ? 'entrada' : 'importado');\nif (main && process.env.ADK_RUNTIME_IMPORT) { const target = process.env.ADK_RUNTIME_IMPORT; delete process.env.ADK_RUNTIME_IMPORT; await import(target); }\n`);
  const run = (args, extra = {}) => {
    const env = { ...process.env, ...extra }; if (!Object.hasOwn(extra, 'NODE_OPTIONS')) delete env.NODE_OPTIONS;
    if (!Object.hasOwn(extra, 'NODE_PRESERVE_SYMLINKS_MAIN')) delete env.NODE_PRESERVE_SYMLINKS_MAIN;
    if (!Object.hasOwn(extra, 'NODE_PRESERVE_SYMLINKS')) delete env.NODE_PRESERVE_SYMLINKS;
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', env, timeout: 30000, windowsHide: true });
    assert.equal(result.status, 0, result.stderr); return result.stdout.trim().split(/\r?\n/);
  };
  assert.deepEqual(run([script]), ['entrada']);
  assert.deepEqual(run([join(alias, 'entry.mjs')]), ['entrada']);
  const fileAlias = join(root, 'entry-link.mjs');
  try {
    symlinkSync(script, fileAlias, 'file');
    assert.deepEqual(run([fileAlias]), ['entrada']);
  } catch (error) { if (!['EPERM', 'EACCES'].includes(error.code)) throw error; }
  const importer = join(root, 'importer.mjs');
  writeFileSync(importer, `await import(${JSON.stringify(pathToFileURL(join(alias, 'entry.mjs')).href)});\n`);
  assert.deepEqual(run([importer]), ['importado']);
  writeFileSync(importer, `await import(${JSON.stringify(pathToFileURL(script).href + '?importado')});\n`);
  assert.deepEqual(run([importer]), ['importado']);
  assert.deepEqual(run(['--input-type=module', '-e', `await import(${JSON.stringify(pathToFileURL(script).href)});`, script]), ['importado']);
  assert.deepEqual(run(['--input-type=module', `--eval=await import(${JSON.stringify(pathToFileURL(script).href)});`, script]), ['importado']);
  const physical = pathToFileURL(script).href, logical = pathToFileURL(join(alias, 'entry.mjs')).href;
  assert.deepEqual(run(['--preserve-symlinks-main', join(alias, 'entry.mjs')], { ADK_RUNTIME_IMPORT: physical }), ['entrada', 'importado']);
  assert.deepEqual(run(['--preserve-symlinks-main=false', join(alias, 'entry.mjs')], { ADK_RUNTIME_IMPORT: physical }), ['entrada', 'importado']);
  assert.deepEqual(run(['--preserve-symlinks-main=ignored', join(alias, 'entry.mjs')], { ADK_RUNTIME_IMPORT: physical }), ['entrada', 'importado']);
  assert.deepEqual(run(['--preserve-symlinks', script], { ADK_RUNTIME_IMPORT: logical }), ['entrada', 'importado']);
  assert.deepEqual(run(['--preserve-symlinks', join(alias, 'entry.mjs')], { ADK_RUNTIME_IMPORT: logical }), ['entrada', 'importado']);
  assert.deepEqual(run([join(alias, 'entry.mjs')], { NODE_OPTIONS: '--preserve-symlinks', ADK_RUNTIME_IMPORT: logical }), ['entrada', 'importado']);
  assert.deepEqual(run([join(alias, 'entry.mjs')], { NODE_OPTIONS: '--preserve-symlinks-main', ADK_RUNTIME_IMPORT: physical }), ['entrada', 'importado']);
  assert.deepEqual(run(['--no-preserve-symlinks-main', join(alias, 'entry.mjs')], { NODE_OPTIONS: '--preserve-symlinks-main' }), ['entrada']);
  assert.deepEqual(run([join(alias, 'entry.mjs')], { NODE_PRESERVE_SYMLINKS_MAIN: '1', ADK_RUNTIME_IMPORT: physical }), ['entrada', 'importado']);
  assert.deepEqual(run(['--no-preserve-symlinks-main', join(alias, 'entry.mjs')], { NODE_PRESERVE_SYMLINKS_MAIN: '1' }), ['entrada']);
  const positiveText = join(root, 'preload --preserve-symlinks-main');
  const negativeText = join(root, 'preload --no-preserve-symlinks-main');
  for (const file of [positiveText, negativeText]) writeFileSync(file, '// preload sem efeitos\n');
  assert.deepEqual(run(['--require', positiveText, join(alias, 'entry.mjs')]), ['entrada']);
  assert.deepEqual(run([join(alias, 'entry.mjs')], { NODE_OPTIONS: `--require ${JSON.stringify(positiveText)}` }), ['entrada']);
  assert.deepEqual(run(['--preserve-symlinks-main', '--require', negativeText, join(alias, 'entry.mjs')], { ADK_RUNTIME_IMPORT: physical }), ['entrada', 'importado']);
  assert.deepEqual(run([join(alias, 'entry.mjs')], { NODE_OPTIONS: `--preserve-symlinks-main --require ${JSON.stringify(negativeText)}`, ADK_RUNTIME_IMPORT: physical }), ['entrada', 'importado']);
  const toolAlias = join(root, 'tool');
  symlinkSync(join(projectRoot, '.pbai4devs/scripts/gerenciar-skills-externas'), toolAlias, process.platform === 'win32' ? 'junction' : 'dir');
  assert.match(run([join(toolAlias, 'SCRIPT.mjs'), '--help']).join('\n'), /Uso:/);
});
