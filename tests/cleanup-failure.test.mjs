import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, join, dirname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyPlan, planInstallation } from '../src/install.mjs';
import { main as cliMain } from '../src/cli.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { collectErrorDiagnostics } from '../.pbai4devs/scripts/lib/error-reporting.mjs';
import { inspectProjectRecovery } from '../.pbai4devs/scripts/lib/project-recovery.mjs';

function includesCause(error, expected, seen = new Set()) {
  if (!error || typeof error !== 'object' || seen.has(error)) return false;
  if (error === expected) return true;
  seen.add(error);
  return includesCause(error.cause, expected, seen)
    || (Array.isArray(error.errors) && error.errors.some(e => includesCause(e, expected, seen)));
}

function put(root, path, data) {
  const file = join(root, path);
  fs.mkdirSync(dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

function overrideTempDir(path) {
  const keys = ['TMPDIR', 'TMP', 'TEMP'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) process.env[key] = path;
  return () => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  };
}

function stageContaining(scratch, path, ...parts) {
  const suffix = sep + join(...parts);
  if (typeof path !== 'string' || !path.endsWith(suffix)) return undefined;
  const stage = path.slice(0, -suffix.length);
  if (dirname(stage) === scratch && basename(stage).startsWith('agentdevkit-')) return stage;
}

for (const kind of ['install', 'sync']) for (const frozen of [false, true]) {
  test(`${kind}: falha ${frozen ? 'congelada' : 'normal'} de escrita preserva temporário para revisão`, { timeout: 120000 }, t => {
    const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-cleanup-io-')));
    t.after(() => {
      t.mock.restoreAll();
      syncBuiltinESMExports();
      fs.rmSync(root, { recursive: true, force: true });
    });
    assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
    put(root, '.gitignore', '# regra humana\n');
    put(root, 'human.txt', 'humano staged\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'human.txt']).status, 0);
    fs.appendFileSync(join(root, 'human.txt'), 'humano unstaged\n');
    const paths = ['.git/index', '.gitignore', 'human.txt'];
    const before = paths.map(p => fs.readFileSync(join(root, p)));
    let operation, updatedFile;
    if (kind === 'install') {
      updatedFile = 'AGENTS.md';
      put(root, updatedFile, '# Instruções da equipe\n');
      const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
      operation = () => applyPlan(plan);
    } else {
      put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
      for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
        put(root, `.pbai4devs/templates/gitignore/${name}`,
          fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
      }
      const skill = '.pbai4devs/skills/demo/SKILL.md';
      const originalSkill = '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n';
      put(root, skill, originalSkill);
      operation = () => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
      assert.equal(operation().exitCode, 0);
      put(root, skill, originalSkill.replace('Fixture.', 'Fixture revisada.'));
      updatedFile = '.claude/skills/demo/SKILL.md';
    }
    const updatedPath = join(root, updatedFile), updatedBefore = fs.readFileSync(updatedPath);
    const write = fs.writeFileSync, remove = fs.rmSync;
    const marker = kind === 'install' ? /\.agentdevkit-[0-9a-f-]{36}$/i : /\.sync\.[0-9a-f-]{36}$/i;
    const partial = Buffer.from('dados sintéticos retidos\n');
    let temporary, initialIdentity;
    const removals = [];
    const original = Object.assign(new Error('falha sintética de escrita'), { code: 'EACCES' });
    if (frozen) Object.freeze(original);
    t.mock.method(fs, 'writeFileSync', (file, data, options) => {
      if (!temporary && typeof file === 'string' && file.startsWith(root + sep) && marker.test(file)
          && file.replace(marker, '').endsWith(sep + join(...updatedFile.split('/')))) {
        temporary = file;
        write(file, partial, options);
        initialIdentity = fs.statSync(file, { bigint: true });
        throw original;
      }
      return write(file, data, options);
    });
    t.mock.method(fs, 'rmSync', (file, ...args) => {
      if (temporary && typeof file === 'string') removals.push(file);
      return remove(file, ...args);
    });
    syncBuiltinESMExports();
    let failure;
    try { operation(); } catch (e) { failure = e; } finally {
      t.mock.restoreAll();
      syncBuiltinESMExports();
    }
    assert.ok(temporary, 'falha de escrita deve ser atingida');
    assert.ok(failure, 'operação deve falhar');
    assert.equal(failure.code, 'EACCES');
    assert.ok(includesCause(failure, original), 'causa original preservada');
    const recovery = inspectProjectRecovery(root);
    assert.equal(recovery.status, 'pending');
    assert.ok(temporary.startsWith(recovery.stage + sep));
    assert.ok(!removals.some(path => path === temporary || temporary.startsWith(path + sep)));
    assert.deepEqual(fs.readFileSync(temporary), partial);
    const retained = fs.statSync(temporary, { bigint: true });
    assert.equal(retained.ino, initialIdentity.ino);
    assert.equal(retained.dev, initialIdentity.dev);
    assert.equal(retained.mode, initialIdentity.mode);
    const diagnostics = collectErrorDiagnostics(failure);
    assert.ok(diagnostics.preservedPaths.includes(temporary), 'diagnóstico deve incluir o caminho retido');
    assert.deepEqual(diagnostics.cleanupFailures, []);
    assert.deepEqual(fs.readFileSync(updatedPath), updatedBefore);
    assert.deepEqual(paths.map(p => fs.readFileSync(join(root, p))), before);
  });
}

test('falha de limpeza no estágio mantém causa e escopo de estágio', { timeout: 120000 }, t => {
  const base = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-cleanup-stage-')));
  const root = join(base, 'project'), scratch = join(base, 'scratch');
  fs.mkdirSync(root);
  fs.mkdirSync(scratch);
  const restoreTemp = overrideTempDir(scratch);
  t.after(() => {
    t.mock.restoreAll();
    syncBuiltinESMExports();
    restoreTemp();
    fs.rmSync(base, { recursive: true, force: true });
  });
  assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
  put(root, '.gitignore', '# humano\n');
  put(root, 'human.txt', 'preservar\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'human.txt']).status, 0);
  const paths = ['.git/index', '.gitignore', 'human.txt'];
  const before = paths.map(p => fs.readFileSync(join(root, p)));
  const rm = fs.rmSync;
  let temporary;
  const original = Object.freeze(Object.assign(new Error('falha sintética de limpeza no estágio'), { code: 'EACCES' }));
  t.mock.method(fs, 'rmSync', (file, ...args) => {
    if (!temporary && typeof file === 'string' && dirname(file) === scratch && basename(file).startsWith('agentdevkit-')) {
      temporary = file;
      throw original;
    }
    return rm(file, ...args);
  });
  syncBuiltinESMExports();
  let failure;
  try { planInstallation({ target: root, mode: 'init', clients: ['codex'] }); } catch (e) { failure = e; } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
    restoreTemp();
  }
  assert.ok(temporary, 'falha deve ocorrer em estágio controlado');
  assert.equal(failure?.code, 'EACCES');
  assert.equal(failure?.diagnosticsScope, 'staging');
  assert.ok(includesCause(failure, original));
  assert.ok(fs.existsSync(temporary));
  const diagnostics = collectErrorDiagnostics(failure);
  assert.ok(diagnostics.preservedPaths.includes(temporary)
    || diagnostics.cleanupFailures.some(item => item.path === temporary));
  assert.deepEqual(paths.map(p => fs.readFileSync(join(root, p))), before);
});

test('CLI JSON identifica o estágio sem publicar conteúdo humano', { timeout: 120000 }, async t => {
  const base = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-cleanup-cli-')));
  const root = join(base, 'project'), scratch = join(base, 'scratch');
  fs.mkdirSync(root);
  fs.mkdirSync(scratch);
  const restoreTemp = overrideTempDir(scratch);
  t.after(() => {
    t.mock.restoreAll();
    syncBuiltinESMExports();
    restoreTemp();
    fs.rmSync(base, { recursive: true, force: true });
  });
  assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
  const marker = 'CONTEUDO_HUMANO_SINTETICO_6291';
  put(root, '.gitignore', '# humano\n');
  put(root, 'human.txt', marker + '\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'human.txt']).status, 0);
  const paths = ['.git/index', '.gitignore', 'human.txt'];
  const before = paths.map(p => fs.readFileSync(join(root, p)));
  const rm = fs.rmSync;
  let temporary;
  const original = Object.freeze(Object.assign(new Error('falha sintética de limpeza'), { code: 'EACCES' }));
  t.mock.method(fs, 'rmSync', (file, ...args) => {
    if (!temporary && typeof file === 'string' && dirname(file) === scratch && basename(file).startsWith('agentdevkit-')) {
      temporary = file;
      throw original;
    }
    return rm(file, ...args);
  });
  syncBuiltinESMExports();
  let output = '', status;
  try {
    status = await cliMain(['init', '--target', root, '--agents', 'codex', '--json'], {
      cwd: root,
      stdout: { write: s => { output += s; } },
      stderr: { write() {} },
      stdin: { isTTY: false },
    });
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
    restoreTemp();
  }
  assert.ok(temporary);
  assert.equal(status, 1);
  const result = JSON.parse(output);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'EACCES');
  assert.equal(result.error.scope, 'staging');
  assert.equal(Object.hasOwn(result.error, 'path'), false);
  assert.ok(result.error.preservedPaths.some(p => p === temporary));
  assert.ok(result.error.preservedPaths.every(p => p.startsWith(scratch + sep)));
  assert.equal(output.includes(marker), false);
  assert.deepEqual(paths.map(p => fs.readFileSync(join(root, p))), before);
});

for (const frozen of [false, true]) {
  test(`CLI não divulga falha secundária de limpeza do estágio (congelada=${frozen})`, { timeout: 120000 }, async t => {
    const base = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-cleanup-secondary-')));
    const root = join(base, 'project'), scratch = join(base, 'scratch');
    fs.mkdirSync(root); fs.mkdirSync(scratch);
    const restoreTemp = overrideTempDir(scratch);
    t.after(() => {
      t.mock.restoreAll(); syncBuiltinESMExports();
      restoreTemp();
      fs.rmSync(base, { recursive: true, force: true });
    });
    assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
    put(root, '.gitignore', '# humano\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
    const paths = ['.git/index', '.gitignore'], before = paths.map(path => fs.readFileSync(join(root, path)));
    const read = fs.readdirSync, remove = fs.rmSync;
    let stage, injected = false, cleaned = false;
    t.mock.method(fs, 'readdirSync', (path, ...args) => {
      const candidate = stageContaining(scratch, path, '.pbai4devs', 'skills');
      if (!injected && candidate && new Error().stack.includes('synchronize')) {
        stage = candidate;
        injected = true;
        throw Object.assign(new Error('Falha primária sintética.'), { code: 'EIO' });
      }
      return read(path, ...args);
    });
    const sentinel = 'SENTINELA_LIMPEZA_SECUNDARIA_937';
    t.mock.method(fs, 'rmSync', (path, ...args) => {
      if (injected && path === stage) {
        cleaned = true;
        const error = Object.assign(new Error(sentinel), { code: 'EACCES' });
        throw frozen ? Object.freeze(error) : error;
      }
      return remove(path, ...args);
    });
    syncBuiltinESMExports();
    let output = '';
    const status = await cliMain(['init', '--target', root, '--agents', 'codex', '--json'], {
      cwd: root, stdout: { write: value => { output += value; } }, stderr: { write() {} }, stdin: { isTTY: false },
    });
    t.mock.restoreAll(); syncBuiltinESMExports();
    restoreTemp();
    assert.ok(injected && cleaned && fs.existsSync(stage));
    assert.equal(status, 1);
    const result = JSON.parse(output);
    assert.equal(result.error.code, 'EIO');
    assert.ok(result.error.cleanupFailures.some(item => item.path === stage && item.message === 'cleanup failed'));
    assert.equal(output.includes(sentinel), false);
    assert.deepEqual(paths.map(path => fs.readFileSync(join(root, path))), before);
  });
}

for (const frozen of [false, true]) {
  for (const format of ['api', 'json', 'human']) {
    test(`falha primária da limpeza final é segura (${format}, congelada=${frozen})`, { timeout: 120000 }, t => {
      const base = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-final-cleanup-')));
      const root = join(base, 'project'), scratch = join(base, 'scratch');
      fs.mkdirSync(root); fs.mkdirSync(scratch);
      t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(base, { recursive: true, force: true }); });
      assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
      put(root, '.gitignore', '# humano\n');
      put(root, 'human.txt', 'humano staged\n');
      assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'human.txt']).status, 0);
      fs.appendFileSync(join(root, 'human.txt'), 'humano unstaged\n');
      const paths = ['.git/index', '.gitignore', 'human.txt'];
      const before = paths.map(path => fs.readFileSync(join(root, path)));
      const marker = 'MENSAGEM_SINTETICA_LIMPEZA_FINAL_671';
      let stage;
      if (format === 'api') {
        const restore = overrideTempDir(scratch), originalRm = fs.rmSync;
        t.after(restore);
        const original = Object.assign(new Error(marker), { code: 'EACCES' });
        if (frozen) Object.freeze(original);
        t.mock.method(fs, 'rmSync', (path, ...args) => {
          if (typeof path === 'string' && dirname(path) === scratch && basename(path).startsWith('agentdevkit-')) {
            stage = path; throw original;
          }
          return originalRm(path, ...args);
        });
        syncBuiltinESMExports();
        let error;
        try { planInstallation({ target: root, mode: 'init', clients: ['codex'] }); } catch (failure) { error = failure; }
        t.mock.restoreAll(); syncBuiltinESMExports(); restore();
        assert.ok(stage && fs.existsSync(stage));
        assert.equal(error?.code, 'EACCES'); assert.equal(error.cause, original);
        assert.equal(error.diagnosticsScope, 'staging'); assert.equal(error.message.includes(marker), false);
        const diagnostics = collectErrorDiagnostics(error);
        assert.ok(diagnostics.preservedPaths.includes(stage));
        assert.ok(diagnostics.cleanupFailures.some(item => item.path === stage && item.message === 'cleanup failed'));
        assert.equal(JSON.stringify(diagnostics).includes(marker), false);
      } else {
        const preload = join(base, 'inject.mjs');
        fs.writeFileSync(preload, `import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {basename, dirname} from 'node:path';
const original = fs.rmSync;
fs.rmSync = function(path, ...args) {
  if (typeof path === 'string' && dirname(path) === process.env.ADK_LAB_SCRATCH && basename(path).startsWith('agentdevkit-')) {
    const error = Object.assign(new Error(process.env.ADK_LAB_MARKER), {code: 'EACCES'});
    throw process.env.ADK_LAB_FROZEN === '1' ? Object.freeze(error) : error;
  }
  return original.call(this, path, ...args);
};
syncBuiltinESMExports();\n`);
        const env = { ...process.env, TMPDIR: scratch, TMP: scratch, TEMP: scratch, ADK_LAB_SCRATCH: scratch, ADK_LAB_MARKER: marker, ADK_LAB_FROZEN: frozen ? '1' : '0' };
        const launcher = fileURLToPath(new URL('../bin/agentdevkit.mjs', import.meta.url));
        const args = ['--import', pathToFileURL(preload).href, launcher, 'init', '--target', root, '--agents', 'codex'];
        if (format === 'json') args.push('--json');
        const result = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 30000 });
        assert.equal(result.error, undefined); assert.equal(result.signal, null); assert.equal(result.status, 1);
        const output = result.stdout + result.stderr;
        assert.equal(output.includes(marker), false); assert.ok(output.includes('EACCES'));
        const stages = fs.readdirSync(scratch).filter(name => name.startsWith('agentdevkit-'));
        assert.equal(stages.length, 1); stage = join(scratch, stages[0]);
        if (format === 'json') {
          const json = JSON.parse(result.stdout);
          assert.equal(json.error.code, 'EACCES'); assert.equal(json.error.scope, 'staging');
          assert.ok(json.error.preservedPaths.includes(stage));
          assert.ok(json.error.cleanupFailures.some(item => item.path === stage && item.message === 'cleanup failed'));
        } else assert.ok(output.includes(stage));
      }
      assert.deepEqual(paths.map(path => fs.readFileSync(join(root, path))), before);
    });
  }
}

for (const [name, thrown] of [['undefined', undefined], ['null', null], ['false', false], ['zero', 0], ['empty', ''], ['nan', NaN]]) {
  for (const format of ['api', 'json']) {
    test(`falha sem valor na limpeza final não é ignorada (${name}, ${format})`, { timeout: 120000 }, async t => {
      const base = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-falsy-cleanup-')));
      const root = join(base, 'project'), scratch = join(base, 'scratch');
      fs.mkdirSync(root); fs.mkdirSync(scratch);
      const restore = overrideTempDir(scratch);
      t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); restore(); fs.rmSync(base, { recursive: true, force: true }); });
      assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
      put(root, '.gitignore', '# humano\n');
      assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
      const index = fs.readFileSync(join(root, '.git/index'));
      const ignore = fs.readFileSync(join(root, '.gitignore'));
      const originalRm = fs.rmSync;
      let stage, injected = false;
      t.mock.method(fs, 'rmSync', (path, ...args) => {
        if (!injected && typeof path === 'string' && dirname(path) === scratch && basename(path).startsWith('agentdevkit-')) {
          stage = path; injected = true; throw thrown;
        }
        return originalRm(path, ...args);
      });
      syncBuiltinESMExports();
      let error, output = '', status;
      if (format === 'api') {
        try { planInstallation({ target: root, mode: 'init', clients: ['codex'] }); } catch (failure) { error = failure; }
      } else {
        status = await cliMain(['init', '--dry-run', '--target', root, '--agents', 'codex', '--json'], {
          cwd: root, stdout: { write: value => { output += value; } }, stderr: { write() {} }, stdin: { isTTY: false },
        });
      }
      t.mock.restoreAll(); syncBuiltinESMExports(); restore();
      assert.ok(injected && stage && fs.existsSync(stage));
      if (format === 'api') {
        assert.ok(error instanceof Error); assert.ok(Object.hasOwn(error, 'cause')); assert.equal(error.cause, thrown);
        assert.equal(error.diagnosticsScope, 'staging'); assert.ok(collectErrorDiagnostics(error).preservedPaths.includes(stage));
      } else {
        assert.equal(status, 1); const result = JSON.parse(output);
        assert.equal(result.ok, false); assert.equal(result.error.scope, 'staging');
        assert.ok(result.error.preservedPaths.includes(stage));
      }
      assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
      assert.deepEqual(fs.readFileSync(join(root, '.gitignore')), ignore);
    });
  }
}

for (const [name, thrown] of [['undefined', undefined], ['null', null], ['false', false], ['zero', 0], ['empty', ''], ['nan', NaN]]) {
  for (const format of ['api', 'json']) {
    test(`falha secundária sem valor mantém causa e resíduo (${name}, ${format})`, { timeout: 120000 }, async t => {
      const base = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-falsy-secondary-')));
      const root = join(base, 'project'), scratch = join(base, 'scratch');
      fs.mkdirSync(root); fs.mkdirSync(scratch);
      const restore = overrideTempDir(scratch);
      t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); restore(); fs.rmSync(base, { recursive: true, force: true }); });
      assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
      put(root, '.gitignore', '# humano\n');
      assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
      const index = fs.readFileSync(join(root, '.git/index'));
      const primary = Object.assign(new Error('falha primária sintética'), { code: 'EIO' });
      const read = fs.readdirSync, remove = fs.rmSync;
      let stage, injected = false, cleaned = false;
      t.mock.method(fs, 'readdirSync', (path, ...args) => {
        const candidate = stageContaining(scratch, path, '.pbai4devs', 'skills');
        if (!injected && candidate && new Error().stack.includes('synchronize')) {
          stage = candidate;
          injected = true; throw primary;
        }
        return read(path, ...args);
      });
      t.mock.method(fs, 'rmSync', (path, ...args) => {
        if (injected && path === stage) { cleaned = true; throw thrown; }
        return remove(path, ...args);
      });
      syncBuiltinESMExports();
      let error, output = '', status;
      if (format === 'api') {
        try { planInstallation({ target: root, mode: 'init', clients: ['codex'] }); } catch (failure) { error = failure; }
      } else {
        status = await cliMain(['init', '--dry-run', '--target', root, '--agents', 'codex', '--json'], {
          cwd: root, stdout: { write: value => { output += value; } }, stderr: { write() {} }, stdin: { isTTY: false },
        });
      }
      t.mock.restoreAll(); syncBuiltinESMExports(); restore();
      assert.ok(injected && cleaned && stage && fs.existsSync(stage));
      if (format === 'api') {
        assert.equal(error?.code, 'EIO'); assert.equal(error.cause, primary);
        assert.ok(Object.hasOwn(error, 'cleanupError')); assert.equal(error.cleanupError, thrown);
        const diagnostics = collectErrorDiagnostics(error);
        assert.ok(diagnostics.preservedPaths.includes(stage) || diagnostics.cleanupFailures.some(item => item.path === stage));
      } else {
        assert.equal(status, 1); const result = JSON.parse(output);
        assert.equal(result.error.code, 'EIO'); assert.equal(result.error.scope, 'staging');
        assert.ok((result.error.preservedPaths || []).includes(stage) || (result.error.cleanupFailures || []).some(item => item.path === stage));
        assert.ok(result.error.cleanupFailures.some(item => item.path === stage && item.message === 'cleanup failed'));
      }
      assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
    });
  }
}

for (const [name, thrown] of [['undefined', undefined], ['null', null], ['false', false], ['zero', 0], ['empty', ''], ['nan', NaN]]) {
  for (const format of ['api', 'json']) for (const secondaryKind of ['erro', 'undefined']) {
    test(`falha primária sem valor permanece causa após falha de limpeza (${name}, ${format}, ${secondaryKind})`, { timeout: 120000 }, async t => {
      const base = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-falsy-primary-')));
      const root = join(base, 'project'), scratch = join(base, 'scratch');
      fs.mkdirSync(root); fs.mkdirSync(scratch);
      const restore = overrideTempDir(scratch);
      t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); restore(); fs.rmSync(base, { recursive: true, force: true }); });
      assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
      put(root, '.gitignore', '# humano\n');
      assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
      const index = fs.readFileSync(join(root, '.git/index'));
      const secondary = secondaryKind === 'undefined' ? undefined : Object.freeze(Object.assign(new Error('FALHA_SECUNDARIA_PRIVADA_893'), { code: 'EACCES' }));
      const read = fs.readdirSync, remove = fs.rmSync;
      let stage, injected = false, cleaned = false;
      t.mock.method(fs, 'readdirSync', (path, ...args) => {
        const candidate = stageContaining(scratch, path, '.pbai4devs', 'skills');
        if (!injected && candidate && new Error().stack.includes('synchronize')) {
          stage = candidate;
          injected = true; throw thrown;
        }
        return read(path, ...args);
      });
      t.mock.method(fs, 'rmSync', (path, ...args) => {
        if (injected && path === stage) { cleaned = true; throw secondary; }
        return remove(path, ...args);
      });
      syncBuiltinESMExports();
      let error, output = '', status;
      if (format === 'api') {
        try { planInstallation({ target: root, mode: 'init', clients: ['codex'] }); } catch (failure) { error = failure; }
      } else {
        status = await cliMain(['init', '--dry-run', '--target', root, '--agents', 'codex', '--json'], {
          cwd: root, stdout: { write: value => { output += value; } }, stderr: { write() {} }, stdin: { isTTY: false },
        });
      }
      t.mock.restoreAll(); syncBuiltinESMExports(); restore();
      assert.ok(injected && cleaned && stage && fs.existsSync(stage));
      if (format === 'api') {
        assert.ok(error instanceof Error); assert.ok(Object.hasOwn(error, 'cause')); assert.equal(error.cause, thrown);
        assert.ok(Object.hasOwn(error, 'cleanupError')); assert.equal(error.cleanupError, secondary); assert.equal(error.diagnosticsScope, 'staging');
      } else {
        assert.equal(status, 1); const result = JSON.parse(output);
        assert.equal(result.error.code, 'E_OPERATION'); assert.equal(result.error.scope, 'staging');
        assert.ok(result.error.cleanupFailures.some(item => item.path === stage && item.message === 'cleanup failed'));
        assert.equal(output.includes('FALHA_SECUNDARIA_PRIVADA_893'), false);
      }
      assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
    });
  }
}

test('falha anterior ao sync sem valor continua como causa após falha de limpeza', { timeout: 120000 }, t => {
  const base = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-falsy-before-sync-')));
  const root = join(base, 'project'), scratch = join(base, 'scratch');
  fs.mkdirSync(root); fs.mkdirSync(scratch);
  const restore = overrideTempDir(scratch);
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); restore(); fs.rmSync(base, { recursive: true, force: true }); });
  assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
  put(root, '.gitignore', '# humano\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
  const index = fs.readFileSync(join(root, '.git/index'));
  const secondary = Object.freeze(Object.assign(new Error('falha secundária sintética'), { code: 'EACCES' }));
  const read = fs.readFileSync, remove = fs.rmSync;
  let stage, injected = false, cleaned = false;
  t.mock.method(fs, 'readFileSync', (path, ...args) => {
    const candidate = stageContaining(scratch, path, '.pbai4devs', 'espelhos.conf');
    if (!injected && candidate && !new Error().stack.includes('synchronize')) {
      stage = candidate;
      injected = true; throw undefined;
    }
    return read(path, ...args);
  });
  t.mock.method(fs, 'rmSync', (path, ...args) => {
    if (injected && path === stage) { cleaned = true; throw secondary; }
    return remove(path, ...args);
  });
  syncBuiltinESMExports();
  let error;
  try { planInstallation({ target: root, mode: 'init', clients: ['codex'] }); } catch (failure) { error = failure; }
  t.mock.restoreAll(); syncBuiltinESMExports(); restore();
  assert.ok(injected && cleaned && stage && fs.existsSync(stage));
  assert.ok(error instanceof Error); assert.ok(Object.hasOwn(error, 'cause')); assert.equal(error.cause, undefined);
  assert.equal(error.cleanupError, secondary); assert.equal(error.operationMayBePartial, true);
  assert.ok(collectErrorDiagnostics(error).preservedPaths.includes(stage));
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
});

for (const format of ['api', 'json']) {
  test(`falha anterior ao sync sem valor é reportada após limpeza (${format})`, { timeout: 120000 }, async t => {
    const base = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-falsy-before-clean-')));
    const root = join(base, 'project'), scratch = join(base, 'scratch');
    fs.mkdirSync(root); fs.mkdirSync(scratch);
    const restore = overrideTempDir(scratch);
    t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); restore(); fs.rmSync(base, { recursive: true, force: true }); });
    assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
    put(root, '.gitignore', '# humano\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
    const index = fs.readFileSync(join(root, '.git/index'));
    const read = fs.readFileSync;
    let stage, injected = false;
    t.mock.method(fs, 'readFileSync', (path, ...args) => {
      const candidate = stageContaining(scratch, path, '.pbai4devs', 'espelhos.conf');
      if (!injected && candidate && !new Error().stack.includes('synchronize')) {
        stage = candidate;
        injected = true; throw undefined;
      }
      return read(path, ...args);
    });
    syncBuiltinESMExports();
    let error, output = '', status;
    if (format === 'api') {
      try { planInstallation({ target: root, mode: 'init', clients: ['codex'] }); } catch (failure) { error = failure; }
    } else {
      status = await cliMain(['init', '--dry-run', '--target', root, '--agents', 'codex', '--json'], {
        cwd: root, stdout: { write: value => { output += value; } }, stderr: { write() {} }, stdin: { isTTY: false },
      });
    }
    t.mock.restoreAll(); syncBuiltinESMExports(); restore();
    assert.ok(injected && stage); assert.equal(fs.existsSync(stage), false);
    if (format === 'api') {
      assert.ok(error instanceof Error); assert.ok(Object.hasOwn(error, 'cause')); assert.equal(error.cause, undefined);
      assert.equal(error.code, 'E_OPERATION'); assert.equal(error.diagnosticsScope, 'staging');
    } else {
      assert.equal(status, 1); const result = JSON.parse(output);
      assert.equal(result.error.code, 'E_OPERATION'); assert.equal(result.error.scope, 'staging');
    }
    assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
  });
}

for (const [name, thrown] of [['undefined', undefined], ['null', null], ['false', false], ['zero', 0], ['empty', ''], ['nan', NaN]]) {
  for (const format of ['api', 'json']) {
    test(`falha do sync sem valor é reportada após limpeza bem-sucedida (${name}, ${format})`, { timeout: 120000 }, async t => {
      const base = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-falsy-sync-')));
      const root = join(base, 'project'), scratch = join(base, 'scratch');
      fs.mkdirSync(root); fs.mkdirSync(scratch);
      const restore = overrideTempDir(scratch);
      t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); restore(); fs.rmSync(base, { recursive: true, force: true }); });
      assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
      put(root, '.gitignore', '# humano\n');
      assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
      const index = fs.readFileSync(join(root, '.git/index'));
      const read = fs.readdirSync;
      let stage, injected = false;
      t.mock.method(fs, 'readdirSync', (path, ...args) => {
        const candidate = stageContaining(scratch, path, '.pbai4devs', 'skills');
        if (!injected && candidate && new Error().stack.includes('synchronize')) {
          stage = candidate;
          injected = true; throw thrown;
        }
        return read(path, ...args);
      });
      syncBuiltinESMExports();
      let error, output = '', status;
      if (format === 'api') {
        try { planInstallation({ target: root, mode: 'init', clients: ['codex'] }); } catch (failure) { error = failure; }
      } else {
        status = await cliMain(['init', '--dry-run', '--target', root, '--agents', 'codex', '--json'], {
          cwd: root, stdout: { write: value => { output += value; } }, stderr: { write() {} }, stdin: { isTTY: false },
        });
      }
      t.mock.restoreAll(); syncBuiltinESMExports(); restore();
      assert.ok(injected && stage); assert.equal(fs.existsSync(stage), false);
      if (format === 'api') {
        assert.ok(error instanceof Error); assert.ok(Object.hasOwn(error, 'cause')); assert.equal(error.cause, thrown);
        assert.equal(error.diagnosticsScope, 'staging');
      } else {
        assert.equal(status, 1); const result = JSON.parse(output);
        assert.equal(result.error.code, 'E_OPERATION'); assert.equal(result.error.scope, 'staging');
      }
      assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
    });
  }
}

for (const frozen of [false, true]) for (const format of ['api', 'json', 'human']) {
  test(`falha secundária de estágio mantém objeto na API sem projeção CLI (${format}, congelada=${frozen})`, { timeout: 120000 }, async t => {
    const base = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-secondary-api-')));
    const root = join(base, 'project'), scratch = join(base, 'scratch');
    fs.mkdirSync(root); fs.mkdirSync(scratch);
    const restoreTemp = overrideTempDir(scratch);
    t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); restoreTemp(); fs.rmSync(base, { recursive: true, force: true }); });
    assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
    put(root, '.gitignore', '# humano\n'); put(root, 'human.txt', 'staged\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'human.txt']).status, 0);
    fs.appendFileSync(join(root, 'human.txt'), 'unstaged\n');
    const paths = ['.git/index', '.gitignore', 'human.txt'];
    const before = paths.map(path => fs.readFileSync(join(root, path)));
    const read = fs.readdirSync, remove = fs.rmSync;
    const primary = Object.assign(new Error('FALHA_PRIMARIA_SINTETICA'), { code: 'EIO' });
    const secondary = Object.assign(new Error('FALHA_SECUNDARIA_PRIVADA_893'), { code: 'EACCES' });
    if (frozen) { Object.freeze(primary); Object.freeze(secondary); }
    const primaryKeys = Object.getOwnPropertyDescriptors(primary), secondaryKeys = Object.getOwnPropertyDescriptors(secondary);
    let stage, injected, cleaned;
    t.mock.method(fs, 'readdirSync', (path, ...args) => {
      const candidate = stageContaining(scratch, path, '.pbai4devs', 'skills');
      if (!injected && candidate && new Error().stack.includes('synchronize')) {
        stage = candidate;
        injected = true; throw primary;
      }
      return read(path, ...args);
    });
    t.mock.method(fs, 'rmSync', (path, ...args) => {
      if (injected && path === stage) { cleaned = true; throw secondary; }
      return remove(path, ...args);
    });
    syncBuiltinESMExports();
    for (let iteration = 0; iteration < 2; iteration++) {
      stage = undefined; injected = false; cleaned = false;
      let failure, output = '', status;
      if (format === 'api') {
        try { planInstallation({ target: root, mode: 'init', clients: ['codex'] }); } catch (e) { failure = e; }
      } else {
        const args = ['init', '--target', root, '--agents', 'codex'];
        if (format === 'json') args.push('--json');
        status = await cliMain(args, { cwd: root, stdout: { write: s => { output += s; } }, stderr: { write: s => { output += s; } }, stdin: { isTTY: false } });
      }
      assert.ok(injected && cleaned && stage && fs.existsSync(stage));
      if (format === 'api') {
        assert.ok(failure); assert.equal(failure.code, 'EIO');
        assert.equal(failure.cause, primary); assert.equal(failure.cleanupError, secondary);
        assert.equal(failure.cleanupError.code, 'EACCES');
        assert.equal(Object.getOwnPropertyDescriptor(failure, 'cleanupError').enumerable, false);
        assert.equal(JSON.stringify(failure).includes('FALHA_SECUNDARIA_PRIVADA_893'), false);
        assert.equal(Object.hasOwn({ ...failure }, 'cleanupError'), false);
        const diagnostics = collectErrorDiagnostics(failure);
        assert.ok(diagnostics.cleanupFailures.some(x => x.path === stage && x.message === 'cleanup failed'));
        assert.equal(JSON.stringify(diagnostics).includes('FALHA_SECUNDARIA_PRIVADA_893'), false);
      } else {
        assert.equal(status, 1); assert.equal(output.includes('FALHA_SECUNDARIA_PRIVADA_893'), false);
        assert.ok(output.includes('EIO'));
        if (format === 'json') {
          const result = JSON.parse(output);
          assert.equal(result.error.code, 'EIO'); assert.equal(result.error.scope, 'staging');
          assert.ok(result.error.cleanupFailures.some(x => x.path === stage && x.message === 'cleanup failed'));
          assert.equal(Object.hasOwn(result.error, 'cleanupError'), false);
        }
      }
      assert.deepEqual(Object.getOwnPropertyDescriptors(primary), primaryKeys);
      assert.deepEqual(Object.getOwnPropertyDescriptors(secondary), secondaryKeys);
      assert.deepEqual(paths.map(path => fs.readFileSync(join(root, path))), before);
    }
  });
}
