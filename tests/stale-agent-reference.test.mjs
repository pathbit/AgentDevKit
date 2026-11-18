import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(repository, 'bin/agentdevkit.mjs');
const source = '.pbai4devs/agents/inventariar-docs/AGENT.md';
const sidecar = '.pbai4devs/agents/inventariar-docs/claude.yaml';
const target = '.claude/agents/inventariar-docs.md';
const state = '.pbai4devs/state/agentdevkit.json';
const derived = '.pbai4devs/state/derived.json';

for (const force of [false, true]) {
  test(`sync direto preserva referência divergente já existente: force=${force}`, { timeout: 300000 }, t => {
    const root = mkdtempSync(join(tmpdir(), 'adk-stale-agent-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const put = (path, value) => {
      const file = join(root, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, value);
    };
    const run = (program, args) => {
      const result = spawnSync(program, args, { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
      assert.equal(result.error, undefined, result.error?.message);
      assert.equal(result.signal, null, `processo interrompido: ${result.signal}`);
      return result;
    };
    const success = result => assert.equal(result.status, 0, result.stdout + result.stderr);
    const git = (...args) => success(run('git', args));
    const command = (...args) => run(process.execPath, [cli, ...args, '--target', root, '--json']);
    const direct = (...args) => run(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--root', root, ...args]);
    git('init', '--quiet');
    put('.gitignore', '# ignore humano\n');
    put('human.txt', 'staged\n');
    git('add', '--', '.gitignore', 'human.txt');
    put('human.txt', 'staged\nunstaged\n');
    success(command('init', '--agents', 'claude', '--yes'));
    put(source, '---\nname: inventariar-docs\ndescription: Lista documentos sintéticos.\n---\n\n# Inventariar docs\n');
    success(direct());
    const earlier = JSON.parse(readFileSync(join(root, derived), 'utf8'));
    assert.ok(earlier.files[target]);
    put(sidecar, '---\nname: inventariar-docs\ndescription: Lista documentos sintéticos.\ntools: Read, Grep, Glob\n---\n');
    success(command('sync'));
    const installed = JSON.parse(readFileSync(join(root, state), 'utf8'));
    const overlay = JSON.parse(readFileSync(join(root, derived), 'utf8'));
    // Simulate a legacy installation even after new syncs stop creating it.
    overlay.files = { ...overlay.files, [target]: earlier.files[target] };
    overlay.humanNote = { keep: 'preserve this unknown field' };
    put(derived, `${JSON.stringify(overlay, null, 2)}\n`);
    assert.ok(installed.files[target]);
    assert.ok(overlay.files[target]);
    assert.notEqual(installed.files[target], overlay.files[target], 'a fixture precisa conter registros divergentes');
    const paths = [target, state, derived, source, sidecar, 'human.txt', '.gitignore', '.git/index', '.git/config', '.git/info/exclude'];
    const before = new Map(paths.map(path => [path, readFileSync(join(root, path))]));
    const result = direct(...(force ? ['--force'] : []));
    assert.equal(result.status, 2, 'estado divergente deve bloquear a escrita');
    assert.match(result.stdout + result.stderr, /inventariar-docs/);
    for (const [path, bytes] of before) assert.deepEqual(readFileSync(join(root, path)), bytes, path);
  });
}

for (const force of [false, true]) {
  test(`sync direto preserva conteúdo humano em referência derivada: force=${force}`, { timeout: 300000 }, t => {
    const root = mkdtempSync(join(tmpdir(), 'adk-edited-agent-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const put = (path, value) => {
      const file = join(root, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, value);
    };
    const run = (program, args) => {
      const result = spawnSync(program, args, { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
      assert.equal(result.error, undefined, result.error?.message);
      assert.equal(result.signal, null, `processo interrompido: ${result.signal}`);
      return result;
    };
    const success = result => assert.equal(result.status, 0, result.stdout + result.stderr);
    const direct = (...args) => run(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--root', root, ...args]);
    success(run('git', ['init', '--quiet']));
    put('.gitignore', '# ignore humano\n'); put('human.txt', 'staged\n');
    success(run('git', ['add', '--', '.gitignore', 'human.txt']));
    put('human.txt', 'staged\nunstaged\n');
    success(run(process.execPath, [cli, 'init', '--agents', 'claude', '--yes', '--target', root, '--json']));
    put(source, '---\nname: inventariar-docs\ndescription: Lista documentos sintéticos.\n---\n\n# Inventariar docs\n');
    success(direct());
    const base = JSON.parse(readFileSync(join(root, state), 'utf8'));
    const overlay = JSON.parse(readFileSync(join(root, derived), 'utf8'));
    assert.ok(overlay.files[target]); assert.equal(base.files[target], undefined);
    put(target, `${readFileSync(join(root, target), 'utf8')}\nNota humana preservada.\n`);
    const paths = [target, state, derived, source, 'human.txt', '.gitignore', '.git/index', '.git/config', '.git/info/exclude'];
    const before = new Map(paths.map(path => [path, readFileSync(join(root, path))]));
    const result = direct(...(force ? ['--force'] : []));
    assert.ok([0, 2].includes(result.status), `resultado inesperado: ${result.status}`);
    if (result.status === 2) assert.match(result.stdout + result.stderr, /inventariar-docs/);
    for (const [path, bytes] of before) assert.deepEqual(readFileSync(join(root, path)), bytes, path);
  });
}
