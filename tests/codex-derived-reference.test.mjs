import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { cli, fixture, put } from './fixtures/client-selection-helpers.mjs';

const bin = resolve(dirname(fileURLToPath(import.meta.url)), '../bin/agentdevkit.mjs');
const source = '.pbai4devs/skills/projeto/inventario-sintetico/SKILL.md';
const target = '.agents/skills/projeto/inventario-sintetico/SKILL.md';
const state = '.pbai4devs/state/agentdevkit.json', derived = '.pbai4devs/state/derived.json';

for (const force of [false, true]) {
  test(`CLI preserva nota humana em referência Codex derivada: force=${force}`, { timeout: 180000 }, t => {
    const root = fixture(t);
    const git = (...args) => {
      const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
    };
    put(root, '.gitignore', '# humano\n'); put(root, 'human.txt', 'staged\n');
    git('add', '--', '.gitignore', 'human.txt');
    put(root, 'human.txt', 'staged\nunstaged\n');
    cli(root, ['init', '--agents', 'codex']);
    put(root, source, '---\nname: inventario-sintetico\ndescription: Exemplo sintético.\n---\n\n# Inventário sintético\n\nFaça a lista.\n');
    const direct = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--root', root], { cwd: root, encoding: 'utf8', timeout: 180000 });
    assert.equal(direct.status, 0, direct.stdout + direct.stderr);
    const base = JSON.parse(readFileSync(join(root, state), 'utf8'));
    const overlay = JSON.parse(readFileSync(join(root, derived), 'utf8'));
    assert.equal(base.files[target], undefined); assert.ok(overlay.files[target]);
    put(root, target, `${readFileSync(join(root, target), 'utf8')}\nNota humana sintética.\n`);
    const paths = [target, source, '.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'human.txt'];
    const before = new Map(paths.map(path => [path, readFileSync(join(root, path))]));
    const result = spawnSync(process.execPath, [bin, 'sync', ...(force ? ['--force'] : []), '--target', root, '--json'], { cwd: root, encoding: 'utf8', timeout: 180000 });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.signal, null);
    assert.ok([0, 1, 2].includes(result.status), `resultado inesperado: ${result.status}`);
    const output = JSON.parse(result.stdout);
    if (result.status === 0) assert.equal(output.ok, true);
    else {
      assert.equal(output.ok, false);
      assert.ok(JSON.stringify(output).includes(target), 'o diagnóstico precisa identificar o apontamento');
    }
    for (const [path, content] of before) assert.deepEqual(readFileSync(join(root, path)), content, path);
  });
}
