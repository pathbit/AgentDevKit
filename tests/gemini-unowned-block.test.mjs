import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(repository, 'bin/agentdevkit.mjs');
const command = '.gemini/commands/revisar-entrega.toml';
const independent = '.gemini/commands/diagnosticar.toml';
const generatedBody = '@{.pbai4devs/commands/revisar-entrega/COMMAND.md}\n\n{{args}}';
const humanBody = 'Referência humana preexistente, diferente da fornecida pelo kit.';
function humanToml(body) {
  const prompt = `Orientação humana\n\n<!-- BEGIN AGENTDEVKIT -->\n${body}\n<!-- END AGENTDEVKIT -->\n`;
  return Buffer.from(`description = "Comando humano"\nprompt = ${JSON.stringify(prompt)} # comentário humano\n`);
}
const staged = Buffer.from('description = "Conteúdo staged independente"\nprompt = "Preservar índice"\n');
const hash = value => createHash('sha256').update(value).digest('hex');

function run(program, args, cwd) {
  return spawnSync(program, args, { cwd, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
}

function git(root, ...args) {
  const result = run('git', args, root);
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr || result.error?.message}`);
  return result.stdout;
}

function invoke(root, args) {
  const result = run(process.execPath, [cli, ...args, '--target', root, '--yes', '--json'], root);
  let json;
  try { json = JSON.parse(result.stdout); } catch { /* Report process output in the assertion. */ }
  return { result, json };
}

function put(root, path, content) {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

for (const phase of ['init', 'sync']) for (const [kind, body] of [['idêntico', generatedBody], ['diferente', humanBody]]) {
  test(`Gemini: ${phase} preserva bloco ${kind} sem ownership e instala outro comando`, { timeout: 240000 }, t => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-unowned-gemini-')));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    git(root, 'init', '--quiet');
    if (phase === 'sync') {
      const setup = invoke(root, ['init', '--agents', 'codex']);
      assert.equal(setup.result.status, 0, setup.result.stdout + setup.result.stderr);
      assert.equal(setup.json?.ok, true);
    }

    const original = humanToml(body);
    put(root, '.gitignore', '# Regras humanas\nprivate/\n');
    put(root, command, staged);
    git(root, 'add', '--', '.gitignore', command);
    put(root, command, original);
    const indexHash = hash(readFileSync(join(root, '.git/index')));
    const stagedHash = hash(Buffer.from(git(root, 'diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv')));
    const originalHash = hash(original);
    const ignoreHash = hash(readFileSync(join(root, '.gitignore')));
    const gitFiles = ['.git/config', '.git/info/exclude'];
    const gitHashes = new Map(gitFiles.map(path => [path, existsSync(join(root, path)) ? hash(readFileSync(join(root, path))) : null]));

    function verify(outcome, step, { json = true } = {}) {
      assert.equal(hash(readFileSync(join(root, command))), originalHash, `${step}: bytes do TOML humano`);
      assert.equal(hash(readFileSync(join(root, '.git/index'))), indexHash, `${step}: bytes do índice Git`);
      assert.equal(hash(Buffer.from(git(root, 'diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv'))), stagedHash, `${step}: diff staged`);
      assert.equal(hash(readFileSync(join(root, '.gitignore'))), ignoreHash, `${step}: .gitignore humano`);
      for (const [path, expected] of gitHashes) {
        assert.equal(existsSync(join(root, path)) ? hash(readFileSync(join(root, path))) : null, expected, `${step}: ${path}`);
      }
      assert.equal(outcome.result.status, 0, `${step}: ${outcome.result.stdout}\n${outcome.result.stderr}\n${outcome.result.error || ''}`);
      if (json) {
        assert.equal(outcome.json?.ok, true, step);
        assert.equal(outcome.json?.command, step.split(' ')[0]);
      }
      for (const path of ['.pbai4devs/state/agentdevkit.json', '.pbai4devs/state/derived.json']) {
        const file = join(root, path);
        if (!existsSync(file)) continue;
        const state = JSON.parse(readFileSync(file, 'utf8'));
        for (const section of ['files', 'blocks', 'entries', 'outputs']) {
          assert.equal(Object.hasOwn(state[section] || {}, command), false, `${step}: ${path}:${section} não deve reivindicar o TOML humano`);
        }
      }
    }

    const outcome = invoke(root, [phase, '--agents', phase === 'sync' ? 'codex,gemini' : 'gemini']);
    verify(outcome, phase);
    assert.ok(existsSync(join(root, independent)), 'comando independente do Gemini deve ser instalado');
    const generated = readFileSync(join(root, independent), 'utf8').match(/^prompt = (.+)$/m);
    assert.ok(generated, 'comando independente tem prompt gerado');
    const actualBody = JSON.parse(generated[1]).replace('/diagnosticar/COMMAND.md', '/revisar-entrega/COMMAND.md');
    assert.equal(actualBody, generatedBody, 'fixture idêntica corresponde ao corpo do kit');

    for (const [index, action] of ['update', 'sync', 'update', 'sync'].entries()) {
      verify(invoke(root, [action]), `${action} ${index + 1}`);
    }
    const standalone = join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
    verify({ result: run(process.execPath, [standalone, '--root', root], root) }, 'sync direto', { json: false });
  });
}
