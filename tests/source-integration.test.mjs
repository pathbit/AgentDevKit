import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import fs from 'node:fs';
import { inspectProject } from '../.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs';
import { findNpmCli } from '../.pbai4devs/scripts/lib/npm.mjs';
import { getNextSteps } from '../src/next.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('..', import.meta.url));
const state = '.pbai4devs/state/derived.json';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const get = (root, path) => readFileSync(join(root, path));
const put = (root, path, bytes) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), bytes); };
const gitEnvironment = root => ({ ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key))), GIT_CONFIG_GLOBAL: join(root, '.git-config-ausente'), GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0' });
function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', env: gitEnvironment(root) });
  assert.equal(result.status, 0, result.stderr);
}

test("successful real diagnosis does not guarantee target dependencies", { timeout: 180000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-bootstrap-integration-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const cli = spawnSync(process.execPath, [join(project, 'bin/agentdevkit.mjs'), 'init', '--agents', 'codex', '--target', root, '--json'], { encoding: 'utf8', timeout: 120000 });
  assert.equal(cli.status, 0, `${cli.error?.message || ''}\n${cli.stderr}\n${cli.stdout}`);
  const target = join(root, 'probe.cjs');
  writeFileSync(target, `const {spawnSync}=require('node:child_process'); const p=spawnSync('adk-tool-nao-existe-197834',[]); console.log('DEPENDENCIA_AUSENTE='+(p.error?.code==='ENOENT')); process.exit(29);\n`);
  const npm = findNpmCli();
  assert.ok(npm, 'npm é necessário para a verificação de integração do bootstrap');
  const runtimeDirectory = dirname(process.execPath);
  const environment = { ...process.env, PATH: runtimeDirectory, Path: runtimeDirectory, npm_execpath: npm };
  const bootstrap = join(root, '.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.mjs');
  const result = spawnSync(process.execPath, [bootstrap, '--executar', '--no-install', 'probe.cjs'], { cwd: root, env: environment, encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
  assert.equal(result.status, 29, `${result.error?.message || ''}\n${result.stderr}\n${result.stdout}`);
  assert.match(result.stdout, /"tools"\s*:/);
  assert.match(result.stdout, /runtime=node/);
  assert.match(result.stdout, /DEPENDENCIA_AUSENTE=true/);
});

test("CLI recognizes direct synchronization catalogs and preserves existing ignore", t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-cli-sync-ownership-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q');
  put(root, '.gitignore', 'node_modules/\n');
  put(root, 'AGENTS.md', '# Instruções existentes\n');
  put(root, 'staged.txt', 'Conteúdo staged humano.\n');
  git(root, 'add', '-f', '.gitignore', 'AGENTS.md', 'staged.txt');
  const initial = Object.fromEntries(['.gitignore', '.git/index', 'staged.txt'].map(path => [path, get(root, path)]));
  const cliPath = join(project, 'bin/agentdevkit.mjs');
  // Windows also performs the native metadata preflight before applying writes.
  const childTimeout = process.platform === 'win32' ? 240000 : 90000;
  function runCli(...args) {
    const result = spawnSync(process.execPath, [cliPath, ...args, '--target', root, '--json'], {
      cwd: root, env: gitEnvironment(root), encoding: 'utf8', timeout: childTimeout, maxBuffer: 16 * 1024 * 1024,
    });
    const details = `${args.join(' ')}: ${result.error?.message || result.signal || ''}\n${result.stderr}\n${result.stdout}`;
    assert.equal(result.status, 0, details);
    try {
      return JSON.parse(result.stdout);
    } catch {
      assert.fail(`Resposta CLI inválida: ${details}`);
    }
  }
  function direct(stage) {
    const result = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs')], {
      cwd: root, env: gitEnvironment(root), encoding: 'utf8', timeout: childTimeout,
    });
    assert.equal(result.status, 0, `${stage}: ${result.error?.message || result.signal || ''}\n${result.stderr}\n${result.stdout}`);
  }
  runCli('init', '--agents', 'codex');
  assert.ok(get(root, 'AGENTS.md').toString('utf8').startsWith('# Instruções existentes\n'));
  put(root, '.pbai4devs/skills/projeto/human-extra/SKILL.md', '---\nname: human-extra\ndescription: Minha skill.\n---\n\n# Minha skill\n');
  direct('skill humana');
  direct('sincronização repetida');
  assert.equal(runCli('doctor').ok, true);
  assert.equal(runCli('sync', '--check').ok, true);
  assert.equal(runCli('update').ok, true);
  assert.equal(runCli('sync', '--check').ok, true);
  // Simulate a legacy version that legitimately registered this manifesto.
  const config = '.pbai4devs/espelhos.conf', installed = '.pbai4devs/state/agentdevkit.json';
  put(root, config, Buffer.concat([get(root, config), Buffer.from('documento|legado-comprovado\n')]));
  const previous = JSON.parse(get(root, installed));
  previous.files[config] = digest(get(root, config));
  put(root, installed, JSON.stringify(previous, null, 2) + '\n');
  direct('manifesto legado');
  assert.doesNotMatch(get(root, config).toString('utf8'), /documento\|legado-comprovado/);
  assert.equal(JSON.parse(get(root, state)).config, digest(get(root, config)));
  assert.equal(runCli('doctor').ok, true);
  assert.equal(runCli('sync', '--check').ok, true);
  assert.equal(runCli('update').ok, true);
  const template = '.pbai4devs/templates/gitignore/shared.ignore';
  const previousIgnore = get(root, '.pbai4devs/.gitignore');
  const humanTemplate = Buffer.concat([get(root, template), Buffer.from('\n/artefato-humano/\n')]);
  put(root, template, humanTemplate);
  direct('modelo de ignore humano');
  assert.deepEqual(get(root, '.pbai4devs/.gitignore'), previousIgnore);
  assert.equal(runCli('update').ok, true);
  assert.deepEqual(get(root, template), humanTemplate);
  assert.equal(runCli('sync', '--check').ok, true);
  for (const [path, content] of Object.entries(initial)) assert.deepEqual(get(root, path), content, path);
});

test("inventory several specs in stable order without choosing ambiguous increment", t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-spec-inventory-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = (name, content) => {
    const target = join(root, name);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  };
  file('.pbai4devs/state/configuracao/ESTADO.md', '---\npreparacao: concluido\nconfiguracao_tecnica: pendente\ndocumentos:\n  prd: docs/prd.md\n  ux_ui: docs/ux.md\n  design: docs/design.md\n  roadmap: docs/roadmap.md\n  specs: docs/specs\n---\n');
  for (const name of ['prd', 'ux', 'design']) file(`docs/${name}.md`, '---\nstatus: aprovado\n---\n');
  file('docs/roadmap.md', '---\nstatus: aprovado\n---\n# Roadmap\n- [ ] [Primeira](specs/01/SPEC.md)\n');
  const next = () => getNextSteps({ command: 'next', target: root, installed: true })[0].skill;
  const spec = number => file(`docs/specs/${String(number).padStart(2, '0')}/SPEC.md`, '---\nstatus: aprovado\n---\n# Spec\n');
  spec(1);
  assert.equal(next(), 'implementar-spec');
  spec(26);
  let report = inspectProject(root).maturity.planning.specs;
  assert.equal(report.present, true);
  assert.equal(report.complete, true);
  assert.deepEqual(report.items.map(item => item.path), ['docs/specs/01/SPEC.md', 'docs/specs/26/SPEC.md']);
  assert.equal(report.items[0].roadmapState, 'open');
  assert.equal(next(), 'gerenciar-roadmap');
  for (let number = 25; number >= 2; number--) spec(number);
  report = inspectProject(root).maturity.planning.specs;
  assert.equal(report.complete, true);
  assert.deepEqual(report.items.map(item => item.path), Array.from({ length: 26 }, (_, i) => `docs/specs/${String(i + 1).padStart(2, '0')}/SPEC.md`));
  assert.ok(report.items.every(item => item.status === 'aprovado'));
  assert.equal(next(), 'gerenciar-roadmap');
});

test("late changes in specs folder invalidate inventory and choice", t => {
  for (const mode of ['insert', 'remove']) {
    for (const inspect of [true, false]) {
      const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-spec-race-')));
      t.after(() => rmSync(root, { recursive: true, force: true }));
      const file = (name, content) => { const target = join(root, name); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content); };
      file('.pbai4devs/state/configuracao/ESTADO.md', '---\npreparacao: concluido\nconfiguracao_tecnica: pendente\ndocumentos:\n  prd: docs/prd.md\n  ux_ui: docs/ux.md\n  design: docs/design.md\n  roadmap: docs/roadmap.md\n  specs: docs/specs\n---\n');
      for (const name of ['prd', 'ux', 'design']) file(`docs/${name}.md`, '---\nstatus: aprovado\n---\n');
      file('docs/roadmap.md', '---\nstatus: aprovado\n---\n# Roadmap\n- [ ] [Spec](specs/01/SPEC.md)\n');
      const content = '---\nstatus: aprovado\n---\n# Spec\n';
      file('docs/specs/01/SPEC.md', content);
      if (mode === 'remove') file('docs/specs/02/SPEC.md', content);
      const original = fs.openSync; let changed = false, result;
      try {
        fs.openSync = (...args) => {
          const name = String(args[0]);
          if (!changed && name.startsWith(join(root, 'docs/specs') + sep) && basename(name) === 'SPEC.md') {
            changed = true;
            if (mode === 'insert') file('docs/specs/02/SPEC.md', content);
            else rmSync(join(root, 'docs/specs', basename(dirname(name)) === '01' ? '02' : '01'), { recursive: true });
          }
          return original(...args);
        };
        result = inspect ? inspectProject(root).maturity.planning.specs : getNextSteps({ command: 'next', target: root, installed: true })[0];
      } finally { fs.openSync = original; }
      assert.equal(changed, true, mode);
      if (inspect) { assert.equal(result.complete, false, mode); assert.deepEqual(result.items, [], mode); }
      else assert.equal(result.skill, 'gerenciar-roadmap', mode);
    }
  }
});
