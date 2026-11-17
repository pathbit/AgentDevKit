import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir, devNull } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tomlManagedBlockDigest } from '../.pbai4devs/scripts/lib/managed-toml.mjs';
import { diagnosePreservedDerivedToml } from '../src/install.mjs';

const kit = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(kit, 'bin/agentdevkit.mjs');
const target = '.gemini/commands/equipe-check.toml';
const source = '.pbai4devs/commands/equipe-check/COMMAND.md';
const state = '.pbai4devs/state/agentdevkit.json';
const derived = '.pbai4devs/state/derived.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const name = 'registro derivado Gemini divergente é diagnosticado sem alterar dados humanos ou Git';

// No snapshot can prove absence of transient mutations or preservation of ACLs/xattrs.
function snapshot(root, relative) {
  const absolute = join(root, relative);
  if (!existsSync(absolute)) return null;
  const stat = lstatSync(absolute);
  assert.equal(stat.isSymbolicLink(), false, `${relative}: fixture não aceita links`);
  if (stat.isDirectory()) return { mode: stat.mode & 0o7777, entries: Object.fromEntries(readdirSync(absolute).sort().map(child => [child, snapshot(root, `${relative}/${child}`)])) };
  assert.equal(stat.isFile(), true, `${relative}: tipo inesperado`);
  return { mode: stat.mode & 0o7777, bytes: readFileSync(absolute) };
}

// The proposed diagnostic contract is structured and path-specific. A generic
// 'existing-file', unrelated warning or another path cannot satisfy it.
function hasDiagnostic(value) {
  return ['issues', 'warnings', 'diagnostics'].some(field => Array.isArray(value[field]) && value[field].some(item =>
    item && typeof item === 'object' && item.code === 'derived-file-diverged' && item.path === target));
}

test('diagnóstico distingue falha de leitura, ausência e divergência sem inferir propriedade', () => {
  const recorded = { [target]: sha(Buffer.from('registro antigo')) }, preserved = new Map([[target, { reason: 'existing-file' }]]);
  const inspect = read => diagnosePreservedDerivedToml(recorded, preserved, {}, read);
  assert.deepEqual(inspect(() => { throw Object.assign(new Error('dados privados'), { code: 'EACCES' }); }), [{ code: 'derived-file-unverified', path: target }]);
  assert.deepEqual(inspect(() => null), [{ code: 'derived-file-missing', path: target }]);
  assert.deepEqual(inspect(() => undefined), [{ code: 'derived-file-unverified', path: target }]);
  assert.deepEqual(inspect(() => Buffer.from('conteúdo humano')), [{ code: 'derived-file-diverged', path: target }]);
  assert.deepEqual(inspect(() => Buffer.from('registro antigo')), []);
  assert.deepEqual(diagnosePreservedDerivedToml(recorded, new Map(), {}, () => { throw Error('não deveria ler'); }), []);
});

test(name, { timeout: 240000 }, t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-derived-regression-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
  Object.assign(env, { GIT_CONFIG_GLOBAL: devNull, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' });
  const run = (program, args) => {
    const result = spawnSync(program, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(result.error, undefined, `${program}: ${result.error?.message}`);
    assert.equal(result.signal, null, `${program}: ${result.signal}`);
    return result;
  };
  const success = (program, args) => { const r = run(program, args); assert.equal(r.status, 0, `${args[0]}: ${r.stderr}\n${r.stdout}`); return r; };
  const put = (path, text) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };
  success('git', ['init', '--quiet']);
  put('.gitignore', '# regra humana sintética\nprivado/\n');
  put('HUMAN.md', 'staged sintético\n');
  success('git', ['add', '--', '.gitignore', 'HUMAN.md']);
  put('HUMAN.md', 'staged sintético\nalteração não staged\n');
  const gitPaths = ['.git/index', '.git/HEAD', '.git/config', '.git/info/exclude', '.git/refs', '.git/packed-refs', '.gitignore', 'HUMAN.md'];
  const gitBefore = Object.fromEntries(gitPaths.map(path => [path, snapshot(root, path)]));
  success(process.execPath, [cli, 'init', '--target', root, '--agents', 'gemini', '--yes']);
  put(source, '---\ndescription: Comando sintético.\n---\n\n# Verificar\n\nVerifique o resultado.\n');
  const direct = join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
  success(process.execPath, [direct, '--root', root]);
  const generated = readFileSync(join(root, target));
  const oldDigest = JSON.parse(readFileSync(join(root, derived))).files?.[target];
  assert.equal(oldDigest, sha(generated), 'sync direto deve ter criado o registro correspondente');
  const edited = Buffer.concat([generated, Buffer.from('# nota humana sintética\n')]);
  writeFileSync(join(root, target), edited);
  success(process.execPath, [cli, 'update', '--target', root, '--yes']);
  assert.deepEqual(readFileSync(join(root, target)), edited, 'update deve preservar o TOML humano');
  for (const path of gitPaths) assert.deepEqual(snapshot(root, path), gitBefore[path], `update preserva ${path}`);
  const installed = JSON.parse(readFileSync(join(root, state)));
  const overlay = JSON.parse(readFileSync(join(root, derived)));
  assert.equal(overlay.files?.[target], oldDigest, 'o registro divergente deve ser natural e persistir');
  assert.notEqual(oldDigest, sha(edited));
  assert.equal(installed.files?.[target], undefined);
  assert.equal(installed.blocks?.[target], undefined);
  assert.equal(overlay.blocks?.[target], undefined);
  const protectedPaths = [target, source, state, derived, ...gitPaths];
  const beforeChecks = Object.fromEntries(protectedPaths.map(path => [path, snapshot(root, path)]));
  const doctor = run(process.execPath, [cli, 'doctor', '--target', root, '--json']);
  for (const path of protectedPaths) assert.deepEqual(snapshot(root, path), beforeChecks[path], `doctor preserva ${path}`);
  const check = run(process.execPath, [cli, 'sync', '--target', root, '--check', '--json']);
  for (const path of protectedPaths) assert.deepEqual(snapshot(root, path), beforeChecks[path], `sync --check preserva ${path}`);
  const forceCheck = run(process.execPath, [cli, 'sync', '--target', root, '--check', '--force', '--json']);
  for (const path of protectedPaths) assert.deepEqual(snapshot(root, path), beforeChecks[path], `sync --check --force preserva ${path}`);
  const directCheck = run(process.execPath, [direct, '--root', root, '--check']);
  for (const path of protectedPaths) assert.deepEqual(snapshot(root, path), beforeChecks[path], `consultas preservam ${path}`);
  const doctorJson = JSON.parse(doctor.stdout), checkJson = JSON.parse(check.stdout), forceJson = JSON.parse(forceCheck.stdout);
  t.diagnostic(`doctor=${doctor.status}, sync-check=${check.status}, sync-direto-check=${directCheck.status}`);
  const problems = [];
  if (!hasDiagnostic(doctorJson)) problems.push(`doctor deve relatar derived-file-diverged para ${target}`);
  if (doctor.status === 0 || doctorJson.ok !== false) problems.push('doctor não deve classificar divergência como saudável');
  if (!hasDiagnostic(checkJson)) problems.push(`sync --check deve relatar derived-file-diverged para ${target}`);
  if (check.status === 0 || checkJson.ok !== false) problems.push('sync --check não deve classificar divergência como saudável');
  if (!hasDiagnostic(forceJson) || forceCheck.status === 0 || forceJson.ok !== false) problems.push('sync --check --force deve informar a divergência e permanecer não saudável');
  assert.deepEqual(problems, [], problems.join('; '));

  // A selection cycle with the source present must not adopt human bytes.
  for (const client of ['codex', 'gemini']) {
    success(process.execPath, [cli, 'agents', client, '--target', root, '--yes']);
    assert.deepEqual(readFileSync(join(root, target)), edited, `${client}: TOML preservado`);
    for (const path of gitPaths) assert.deepEqual(snapshot(root, path), gitBefore[path], `${client}: Git preservado: ${path}`);
    const selectedState = JSON.parse(readFileSync(join(root, state)));
    const selectedOverlay = JSON.parse(readFileSync(join(root, derived)));
    assert.notEqual(selectedState.files?.[target], sha(edited), `${client}: não adotar o arquivo humano`);
    assert.equal(selectedState.blocks?.[target], undefined, `${client}: não adotar bloco humano`);
    assert.notEqual(selectedOverlay.files?.[target], sha(edited), `${client}: não adotar no overlay`);
    assert.equal(selectedOverlay.blocks?.[target], undefined, `${client}: não adotar bloco no overlay`);
    const selectedBefore = Object.fromEntries(protectedPaths.map(path => [path, snapshot(root, path)]));
    const result = run(process.execPath, [cli, 'sync', '--check', '--target', root, '--json']);
    const output = JSON.parse(result.stdout);
    if (selectedOverlay.files?.[target] === oldDigest) {
      assert.notEqual(result.status, 0, `${client}: registro divergente ainda presente`);
      assert.ok(hasDiagnostic(output), `${client}: registro divergente deve ser indicado`);
    }
    for (const path of protectedPaths) assert.deepEqual(snapshot(root, path), selectedBefore[path], `${client}: check preserva ${path}`);
  }

  // A missing source does not grant ownership of the preserved destination.
  unlinkSync(join(root, source));
  const remaining = [target, state, derived, ...gitPaths];
  const afterSourceRemoval = Object.fromEntries(remaining.map(path => [path, snapshot(root, path)]));
  for (const args of [['doctor'], ['sync', '--check']]) {
    const result = run(process.execPath, [cli, ...args, '--target', root, '--json']);
    const output = JSON.parse(result.stdout);
    assert.notEqual(result.status, 0, `${args.join(' ')} com origem ausente`);
    assert.equal(output.ok, false);
    assert.ok(hasDiagnostic(output), `${args.join(' ')} deve identificar o registro divergente`);
    for (const path of remaining) assert.deepEqual(snapshot(root, path), afterSourceRemoval[path], `consulta sem origem preserva ${path}`);
  }

  // Changing selection is allowed and must not adopt or delete human bytes.
  success(process.execPath, [cli, 'agents', 'codex', '--target', root, '--yes']);
  assert.deepEqual(readFileSync(join(root, target)), edited, 'troca de cliente preserva o TOML');
  for (const path of gitPaths) assert.deepEqual(snapshot(root, path), gitBefore[path], `troca de cliente preserva ${path}`);
  const afterSelection = Object.fromEntries(remaining.map(path => [path, snapshot(root, path)]));
  for (const args of [['doctor'], ['sync', '--check']]) {
    const result = run(process.execPath, [cli, ...args, '--target', root, '--json']);
    const output = JSON.parse(result.stdout);
    assert.notEqual(result.status, 0, `${args.join(' ')} após troca de cliente`);
    assert.equal(output.ok, false);
    assert.ok(hasDiagnostic(output), `${args.join(' ')} deve identificar o registro divergente após troca`);
    for (const path of remaining) assert.deepEqual(snapshot(root, path), afterSelection[path], `consulta após troca preserva ${path}`);
  }
});

test('registro correspondente e bloco comprovado não geram diagnóstico divergente', { timeout: 240000 }, t => {
  for (const variant of ['matching-file', 'matching-block', 'matching-block-stale-file']) {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-derived-control-')));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
    Object.assign(env, { GIT_CONFIG_GLOBAL: devNull, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' });
    const run = (program, args) => spawnSync(program, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
    const success = (program, args) => { const result = run(program, args); assert.equal(result.status, 0, `${variant}: ${result.error || ''}\n${result.stderr}\n${result.stdout}`); return result; };
    const put = (path, text) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };
    success('git', ['init', '--quiet']);
    put('.gitignore', '# regra sintética\nprivate/\n');
    put('HUMAN.md', 'staged\n'); success('git', ['add', '--', '.gitignore', 'HUMAN.md']);
    const gitPaths = ['.git/index', '.git/HEAD', '.git/config', '.git/info/exclude', '.git/refs', '.git/packed-refs', '.gitignore', 'HUMAN.md'];
    const gitBefore = Object.fromEntries(gitPaths.map(path => [path, snapshot(root, path)]));
    success(process.execPath, [cli, 'init', '--target', root, '--agents', 'gemini', '--yes']);
    put(source, '---\ndescription: Comando sintético.\n---\n\n# Verificar\n\nVerifique o resultado.\n');
    if (variant !== 'matching-file') put(target, 'description = "comando humano"\nprompt = "Pergunta humana."\n');
    const direct = join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
    success(process.execPath, [direct, '--root', root]);
    const current = readFileSync(join(root, target)), overlay = JSON.parse(readFileSync(join(root, derived)));
    if (variant === 'matching-file') assert.equal(overlay.files?.[target], sha(current));
    else { assert.ok(overlay.blocks?.[target]); assert.equal(overlay.blocks[target], tomlManagedBlockDigest(current)); }
    if (variant === 'matching-block-stale-file') {
      // Synthetic coexistence control; the old whole-file digest is not ownership.
      overlay.files ||= {}; overlay.files[target] = '0'.repeat(64);
      writeFileSync(join(root, derived), `${JSON.stringify(overlay, null, 2)}\n`);
    }
    const protectedPaths = [target, source, state, derived, ...gitPaths];
    const before = Object.fromEntries(protectedPaths.map(path => [path, snapshot(root, path)]));
    for (const args of [['doctor'], ['sync', '--check'], ['sync', '--check', '--force']]) {
      const result = success(process.execPath, [cli, ...args, '--target', root, '--json']), output = JSON.parse(result.stdout);
      assert.equal(output.ok, true, `${variant}: ${args.join(' ')}`);
      assert.equal(hasDiagnostic(output), false, `${variant}: sem divergência`);
      for (const path of protectedPaths) assert.deepEqual(snapshot(root, path), before[path], `${variant}: consulta preserva ${path}`);
    }
    for (const path of gitPaths) assert.deepEqual(snapshot(root, path), gitBefore[path], `${variant}: Git preservado`);
  }
});
