import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { inspect } from '../src/install.mjs';
import { main } from '../src/cli.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { fixture, put, read, cli } from './fixtures/client-selection-helpers.mjs';

test('doctor e checks identificam remoção sem entrada e preservam os dados', async t => {
  const root = fixture(t);
  put(root, '.gitignore', '# configuração do projeto\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
  cli(root, ['init', '--agents', 'codex']);
  const path = '.claude/skills/equipe/SKILL.md';
  const human = '# Instruções da equipe\n';
  put(root, path, human);
  const derivedPath = '.pbai4devs/state/derived.json';
  let derived;
  try { derived = JSON.parse(read(root, derivedPath)); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    derived = { schemaVersion: 1, entries: {} };
  }
  derived.removedFiles = { ...derived.removedFiles, [path]: 'a'.repeat(64) };
  put(root, derivedPath, `${JSON.stringify(derived, null, 2)}\n`);
  const original = read(root, derivedPath);
  const gitPaths = ['.git/index', '.git/config', '.git/info/exclude'];
  const gitBefore = gitPaths.map(path => readFileSync(join(root, path)));
  const diagnostic = { code: 'removed-file-unverified', path };
  assert.ok(inspect(root).issues.some(issue => issue.code === diagnostic.code && issue.path === path));
  const result = cli(root, ['doctor'], 1);
  assert.ok(result.issues.some(issue => issue.code === diagnostic.code && issue.path === path));
  const check = cli(root, ['sync', '--check'], 1);
  assert.ok(check.issues.some(issue => issue.code === diagnostic.code && issue.path === path));
  const direct = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--check'], { cwd: root, encoding: 'utf8', timeout: 180000 });
  assert.equal(direct.status, 1, direct.stderr || direct.stdout);
  assert.ok(direct.stdout.includes(path) && direct.stdout.includes('preserve e revise'), direct.stdout);
  const binary = fileURLToPath(new URL('../bin/agentdevkit.mjs', import.meta.url));
  for (const [language, expected] of [
    ['pt', 'Registro de remoção sem entrada'],
    ['en', 'Removal record has no entry'],
    ['es', 'Registro de eliminación sin entrada'],
  ]) {
    const result = spawnSync(process.execPath, [binary, 'doctor', '--target', root, '--lang', language], { encoding: 'utf8', timeout: 180000 });
    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.ok(result.stdout.includes(expected) && result.stdout.includes(path), result.stdout);
  }
  const source = join(root, '.pbai4devs/skills/projeto/configurar-projeto/SKILL.md');
  const originalRead = fs.readFileSync, directOutput = [];
  t.mock.method(fs, 'readFileSync', (file, ...args) => {
    if (file === source) throw Object.assign(new Error('falha sintética da fonte'), { code: 'EIO' });
    return originalRead(file, ...args);
  });
  syncBuiltinESMExports();
  try {
    assert.throws(() => synchronize({ root, check: true, output: message => directOutput.push(message) }), { code: 'EIO' });
    assert.ok(directOutput.some(message => message.includes(path) && message.includes('preserve e revise')));
  } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  let failureOutput = '', injected = 0;
  const stagePrefix = join(fs.realpathSync(tmpdir()), 'agentdevkit-');
  const originalWrite = fs.writeFileSync;
  t.mock.method(fs, 'writeFileSync', (file, ...args) => {
    if (typeof file === 'string' && file.startsWith(stagePrefix) && file.includes(`${sep}.pbai4devs${sep}`)) {
      injected++;
      throw Object.assign(new Error('falha sintética do estágio'), { code: 'EIO' });
    }
    return originalWrite(file, ...args);
  });
  syncBuiltinESMExports();
  let status;
  try {
    status = await main(['sync', '--check', '--target', root, '--json'], { cwd: root, stdout: { write: value => { failureOutput += value; } } });
    for (const [language, expected] of [
      ['pt', 'observado antes da falha no planejamento'],
      ['en', 'observed before planning failed'],
      ['es', 'observado antes del fallo de planificación'],
    ]) {
      let humanOutput = '';
      const humanStatus = await main(['sync', '--check', '--target', root, '--lang', language], { cwd: root, stdout: { write: value => { humanOutput += value; } } });
      assert.equal(humanStatus, 1);
      assert.ok(humanOutput.includes(path) && humanOutput.includes(expected));
    }
    let doctorOutput = '';
    const doctorStatus = await main(['doctor', '--target', root], { cwd: root, stdout: { write: value => { doctorOutput += value; } } });
    assert.equal(doctorStatus, 1);
    assert.ok(doctorOutput.includes('Não foi possível concluir o planejamento (EIO)'));
  } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  const failedCheck = JSON.parse(failureOutput);
  assert.equal(injected, 5, 'cada consulta precisa exercitar a falha de cópia no estágio');
  assert.equal(status, 1);
  assert.equal(failedCheck.error.code, 'EIO');
  assert.ok(failedCheck.issues.some(issue => issue.code === diagnostic.code && issue.path === path && issue.observedBeforePlanFailure));
  assert.equal(read(root, path), human);
  assert.equal(read(root, derivedPath), original);
  assert.equal(read(root, '.gitignore'), '# configuração do projeto\n');
  assert.deepEqual(gitPaths.map(path => readFileSync(join(root, path))), gitBefore);
});

test('registro correlacionado não é marcado como remoção sem correspondência', t => {
  const root = fixture(t), path = '.codex/skills/exemplo/SKILL.md', digest = 'b'.repeat(64);
  put(root, '.pbai4devs/state/agentdevkit.json', JSON.stringify({ schemaVersion: 1, version: '0.0.21', language: 'pt', files: { [path]: digest }, blocks: {} }));
  put(root, '.pbai4devs/state/derived.json', JSON.stringify({ schemaVersion: 1, entries: {}, removedFiles: { [path]: digest } }));
  assert.ok(!inspect(root).issues.some(issue => issue.code === 'removed-file-unverified'));
  put(root, '.pbai4devs/state/derived.json', JSON.stringify({ schemaVersion: 1, entries: {}, removedFiles: { [path]: 'c'.repeat(64) } }));
  assert.throws(() => inspect(root), { code: 'E_STATE' });
});

test('diagnóstico mantém as duas ocorrências com alvo ausente e overlay posterior', t => {
  const root = fixture(t), first = '.codex/skills/um/SKILL.md', second = '.claude/skills/dois/SKILL.md';
  put(root, '.pbai4devs/state/agentdevkit.json', JSON.stringify({ schemaVersion: 1, version: '0.0.21', language: 'pt', files: {}, blocks: {} }));
  put(root, '.pbai4devs/state/derived.json', JSON.stringify({ schemaVersion: 1, entries: {}, files: { [second]: 'c'.repeat(64) }, removedFiles: { [first]: 'a'.repeat(64), [second]: 'b'.repeat(64) } }));
  assert.deepEqual(inspect(root).issues.filter(issue => issue.code === 'removed-file-unverified').map(issue => issue.path).sort(), [first, second].sort());
});
