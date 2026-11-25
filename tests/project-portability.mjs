import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../bin/agentdevkit.mjs', import.meta.url));
const timeout = 120_000;
const skip = Number(process.versions.node.split('.')[0]) < 24 && 'A prova de instalação requer Node.js 24 ou superior.';

function sandbox(t) {
  const directory = mkdtempSync(join(realpathSync(tmpdir()), 'adk-project-portability-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function run(program, args, cwd, env = process.env, status = 0) {
  const result = spawnSync(program, args, {
    cwd, env, encoding: 'utf8', timeout, maxBuffer: 8 * 1024 * 1024, windowsHide: true,
  });
  assert.ifError(result.error);
  assert.equal(result.status, status, `${args.join(' ')}\n${result.stdout}${result.stderr}`);
  return result.stdout;
}

function cli(args, cwd, { env, status = 0 } = {}) {
  const output = JSON.parse(run(process.execPath, [bin, ...args, '--json'], cwd, env, status));
  assert.equal(output.ok, status === 0);
  return output;
}

function writeFiles(root, files) {
  for (const [path, content] of Object.entries(files)) {
    const destination = join(root, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, content);
  }
}

function snapshot(root, paths) {
  return paths.map(path => readFileSync(join(root, path)));
}

const projects = [
  ['pasta vazia', 'none', {}],
  ['Python', 'codex', { 'pyproject.toml': '[project]\nname = "amostra"\nversion = "0.1.0"\n', 'src/python.py': 'print("amostra")\n' }],
  ['Java', 'claude', { 'build.gradle.kts': 'plugins { java }\n', 'src/main/java/Example.java': 'final class Example {}\n' }],
  ['.NET', 'copilot', { 'Example.csproj': '<Project Sdk="Microsoft.NET.Sdk" />\n', 'Program.cs': 'System.Console.WriteLine("example");\n' }],
  ['TypeScript', 'codex', { 'package.json': '{"name":"example","private":true}\n', 'src/index.ts': 'export const example: boolean = true;\n' }],
  ['Rust', 'opencode', { 'Cargo.toml': '[package]\nname = "example"\nversion = "0.1.0"\n', 'src/main.rs': 'fn main() {}\n' }],
  ['Go', 'none', { 'go.mod': 'module example.test/example\n', 'main.go': 'package main\n\nfunc main() {}\n' }],
  ['C++', 'none', { 'CMakeLists.txt': 'project(example LANGUAGES CXX)\n', 'example.cc': 'int main() { return 0; }\n' }],
  ['documentação', 'none', { 'conteúdo/Primeiros passos.md': '# Primeiros passos\r\n', 'images/example.bin': Buffer.from([0, 128, 255]) }],
];

for (const [name, client, files] of projects) {
  test(`CLI preserva projeto ${name} sem Git`, { skip, timeout }, t => {
    const parent = sandbox(t);
    const target = join(parent, 'projeto de revisão local');
    mkdirSync(target);
    writeFiles(target, files);
    const paths = Object.keys(files);
    const original = snapshot(target, paths);
    const entries = readdirSync(target);
    // The CLI runs with Node, without Git or application tools in PATH.
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toUpperCase() !== 'PATH'));
    env.PATH = '';
    const args = ['init', '--target', target, '--lang', 'pt', '--agents', client, '--yes'];
    const preview = cli([...args, '--dry-run'], parent, { env });
    assert.ok(preview.plan.some(change => change.path === 'AGENTS.md'));
    assert.deepEqual(readdirSync(target), entries);
    assert.deepEqual(snapshot(target, paths), original);

    const installed = cli(args, parent, { env });
    const statePath = join(target, '.pbai4devs/state/agentdevkit.json');
    const installedState = readFileSync(statePath);
    const state = JSON.parse(installedState.toString('utf8'));
    assert.equal(installed.target, realpathSync(target));
    assert.deepEqual(state.clients, [client]);
    assert.ok(existsSync(join(target, 'AGENTS.md')));
    assert.equal(existsSync(join(target, '.git')), false);
    assert.deepEqual(snapshot(target, paths), original);

    const repeat = cli(['update', '--target', target, '--dry-run'], parent, { env });
    assert.deepEqual(repeat.plan, []);
    assert.deepEqual(readFileSync(statePath), installedState);
    assert.deepEqual(snapshot(target, paths), original);
  });
}

test("CLI keeps the target declared in monorepo with staged content", { skip, timeout }, t => {
  const root = sandbox(t);
  const target = join('serviços', 'pagamentos local');
  const source = join(target, 'main.go');
  const files = {
    'AGENTS.md': '# Regras da equipe\n',
    'package.json': '{"private":true,"workspaces":["apps/*"]}\n',
    'apps/web/src/index.ts': 'export const feature = true;\n',
    [join(target, 'go.mod')]: 'module example.test/payments\n',
    [source]: 'package main\n// versão preparada\n',
  };
  writeFiles(root, files);
  run('git', ['init', '--quiet', '-b', 'main'], root);
  run('git', ['add', '--', source], root);
  writeFileSync(join(root, source), `${files[source]}// edição local\n`);
  const paths = [...Object.keys(files), '.git/index', '.git/config', '.git/info/exclude', '.git/HEAD'];
  const original = snapshot(root, paths);

  const args = ['init', '--target', target, '--agents', 'codex,claude', '--yes'];
  const preview = cli([...args, '--dry-run'], root);
  assert.equal(preview.target, realpathSync(join(root, target)));
  assert.equal(existsSync(join(root, target, '.pbai4devs')), false);
  assert.deepEqual(snapshot(root, paths), original);

  const installed = cli(args, root);
  assert.deepEqual([...installed.clients].sort(), ['claude', 'codex']);
  assert.ok(existsSync(join(root, target, 'AGENTS.md')));
  assert.equal(existsSync(join(root, '.pbai4devs')), false);
  assert.equal(existsSync(join(root, 'apps/web/.pbai4devs')), false);
  assert.deepEqual(snapshot(root, paths), original);

  const checked = cli(['sync', '--check'], join(root, target));
  assert.equal(checked.target, installed.target);
  assert.deepEqual(checked.plan, []);
  assert.deepEqual(snapshot(root, paths), original);
});
