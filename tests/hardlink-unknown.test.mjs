import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { applyPlan } from '../src/install.mjs';
import { main as cliMain } from '../src/cli.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';

function put(root, path, content) {
  const file = join(root, path); fs.mkdirSync(dirname(file), { recursive: true }); fs.writeFileSync(file, content);
}

for (const [language, expected] of [['pt', 'Contagem de hardlinks não verificada'], ['en', 'Hardlink count could not be verified'], ['es', 'Número de enlaces físicos no verificado']]) for (const json of [false, true]) {
  test(`CLI informa contagem não verificada em ${language} json=${json}`, { timeout: 120000 }, async t => {
    const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-unknown-cli-')));
    t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
    assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
    put(root, 'AGENTS.md', '# Instrução humana\n');
    const target = join(root, 'AGENTS.md'), original = fs.readFileSync(target), lstat = fs.lstatSync; let injected = false, output = '';
    t.mock.method(fs, 'lstatSync', (file, ...args) => {
      const info = lstat(file, ...args);
      if (file === target) { injected = true; Object.defineProperty(info, 'nlink', { value: 0 }); }
      return info;
    });
    syncBuiltinESMExports();
    const writer = { write(value) { output += value; } };
    const status = await cliMain(['init', '--target', root, '--agents', 'codex', '--yes', '--lang', language, ...(json ? ['--json'] : [])], { cwd: root, stdout: writer, stderr: writer, stdin: { isTTY: false } });
    t.mock.restoreAll(); syncBuiltinESMExports();
    assert.ok(injected); assert.notEqual(status, 0);
    if (json) {
      const result = JSON.parse(output);
      assert.equal(result.error.code, 'E_METADATA_UNSUPPORTED');
      assert.equal(result.error.path, 'AGENTS.md'); assert.equal(result.error.metadataReason, 'hardlink-unverified');
    } else { assert.ok(output.includes(expected), output); assert.ok(output.includes('AGENTS.md')); }
    assert.deepEqual(fs.readFileSync(target), original);
  });
}

for (const kind of ['sync', 'install']) for (const [name, links] of [['zero', 0], ['ausente', undefined], ['nan', NaN], ['negativa', -1], ['fracionária', 1.5], ['infinita', Infinity], ['imprecisa', Number.MAX_SAFE_INTEGER + 1]]) {
  test(`${kind}: contagem ${name} não é prova de hardlink ausente`, { timeout: 120000 }, t => {
    const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-unknown-link-')));
    t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
    assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
    put(root, '.gitignore', '# humano\n'); put(root, 'humano.txt', 'staged\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'humano.txt']).status, 0);
    fs.appendFileSync(join(root, 'humano.txt'), 'unstaged\n');
    let path, operation;
    if (kind === 'sync') {
      put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
      for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
      const source = '.pbai4devs/skills/demo/SKILL.md';
      put(root, source, '---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
      const options = { root, localIgnores: false, generateEntrypoints: false, output() {} };
      synchronize(options); path = '.claude/skills/demo/SKILL.md';
      put(root, source, '---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
      operation = () => synchronize(options);
    } else {
      path = 'gerenciado.txt'; put(root, path, 'original\n');
      const original = fs.readFileSync(join(root, path));
      const plan = { target: root, canApply: true, language: 'pt', changes: [{ path, action: 'update', content: Buffer.from('novo\n'), beforeHash: createHash('sha256').update(original).digest('hex') }], localIgnore: { edits: [] }, retiredRoots: [] };
      operation = () => applyPlan(plan);
    }
    const target = join(root, path), bytes = fs.readFileSync(target), identity = fs.statSync(target, { bigint: true });
    const paths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'humano.txt'];
    const snapshots = new Map(paths.map(item => [item, fs.readFileSync(join(root, item))]));
    const lstat = fs.lstatSync; let injected = false;
    t.mock.method(fs, 'lstatSync', (file, ...args) => {
      const info = lstat(file, ...args);
      if (file === target) { injected = true; Object.defineProperty(info, 'nlink', { value: links }); }
      return info;
    });
    syncBuiltinESMExports();
    let failure; try { operation(); } catch (error) { failure = error; }
    t.mock.restoreAll(); syncBuiltinESMExports();
    assert.ok(injected); assert.equal(failure?.code, 'E_METADATA_UNSUPPORTED'); assert.equal(failure?.path, path);
    const after = fs.statSync(target, { bigint: true });
    assert.equal(after.ino, identity.ino); assert.equal(after.dev, identity.dev); assert.deepEqual(fs.readFileSync(target), bytes);
    for (const [item, content] of snapshots) assert.deepEqual(fs.readFileSync(join(root, item)), content);
  });
}
