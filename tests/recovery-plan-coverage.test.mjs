import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { applyPlan, derivePruneCandidates, planInstallation } from '../src/install.mjs';
import { inspectSyncEffects, synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { prepareRecoveryBackup, verifyRecoveryBackup } from '../.pbai4devs/scripts/lib/recovery-backup.mjs';
import { captureRecoverySnapshot, inspectRecoveryTarget } from './fixtures/recovery-capture.mjs';

function test(name, options, run) {
  const skip = process.platform === 'win32' ? 'As fixtures legadas observam efeitos no POSIX e ainda precisam de instrumentação para as operações nativas do Windows.' : false;
  if (typeof options === 'function') return nodeTest(name, { skip }, options);
  return nodeTest(name, { ...options, skip: options.skip || skip }, run);
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const posix = path => path.split(sep).join('/');
function fixture(t) {
  const root = fs.mkdtempSync(join(fs.realpathSync(tmpdir()), 'adk-plan-coverage-'));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
  const result = spawnSync('git', ['init', '-q', root], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); return root;
}
function put(root, path, content) {
  const file = join(root, path); fs.mkdirSync(dirname(file), { recursive: true }); fs.writeFileSync(file, content);
}
function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); return result.stdout;
}
function safeStat(path) {
  try { return fs.lstatSync(path); } catch (error) { if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null; throw error; }
}

for (const scenario of ['update-sem-conteudo', 'remove-com-conteudo', 'conteudo-invalido', 'acao-desconhecida',
  'create-existente', 'update-ausente', 'remove-ausente', 'hash-invalido']) {
  nodeTest(`plano inconsistente (${scenario}) é recusado sem alterar o projeto`, { timeout: 120000 }, t => {
    const root = fixture(t), human = '# Instruções humanas\n';
    put(root, 'AGENTS.md', human); put(root, '.gitignore', '# regra humana\n');
    git(root, 'add', '--', 'AGENTS.md', '.gitignore');
    const index = fs.readFileSync(join(root, '.git/index'));
    const exclude = fs.readFileSync(join(root, '.git/info/exclude'));
    const before = fs.lstatSync(join(root, 'AGENTS.md'), { bigint: true });
    const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
    const change = plan.changes.find(item => scenario.endsWith('-ausente')
      ? item.action === 'create' : item.path === 'AGENTS.md' && item.action === 'update');
    assert.ok(change);
    if (scenario === 'update-sem-conteudo') change.content = null;
    if (scenario === 'remove-com-conteudo') change.action = 'remove';
    if (scenario === 'conteudo-invalido') change.content = 'texto';
    if (scenario === 'acao-desconhecida') change.action = 'unknown';
    if (scenario === 'create-existente') change.action = 'create';
    if (scenario === 'update-ausente') change.action = 'update';
    if (scenario === 'remove-ausente') { change.action = 'remove'; change.content = null; }
    if (scenario === 'hash-invalido') change.beforeHash = 'inválido';
    assert.throws(() => applyPlan(plan), error => error.code === 'E_PLAN');
    const after = fs.lstatSync(join(root, 'AGENTS.md'), { bigint: true });
    assert.equal(fs.readFileSync(join(root, 'AGENTS.md'), 'utf8'), human);
    assert.equal(after.dev, before.dev); assert.equal(after.ino, before.ino);
    assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
    assert.deepEqual(fs.readFileSync(join(root, '.git/info/exclude')), exclude);
    assert.equal(fs.readFileSync(join(root, '.gitignore'), 'utf8'), '# regra humana\n');
    assert.equal(fs.existsSync(join(root, '.agent-tests')), false);
  });
}

nodeTest('plano aceita conteúdo binário vazio e não UTF-8 em criações válidas', { timeout: 120000 }, t => {
  const root = fixture(t);
  put(root, '.gitignore', '# regra humana\n');
  git(root, 'add', '--', '.gitignore');
  const index = fs.readFileSync(join(root, '.git/index'));
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  plan.changes.push({ path: 'vazio.bin', action: 'create', beforeHash: null, content: Buffer.alloc(0) });
  plan.changes.push({ path: 'binario.bin', action: 'create', beforeHash: null, content: Buffer.from([0, 255, 128]) });
  applyPlan(plan);
  assert.deepEqual(fs.readFileSync(join(root, 'vazio.bin')), Buffer.alloc(0));
  assert.deepEqual(fs.readFileSync(join(root, 'binario.bin')), Buffer.from([0, 255, 128]));
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
  assert.equal(fs.readFileSync(join(root, '.gitignore'), 'utf8'), '# regra humana\n');
});

for (const action of ['update', 'create', 'remove', 'mixed']) nodeTest(`plano com caminho ${action} duplicado é recusado antes de gravar`, { timeout: 120000 }, t => {
  const root = fixture(t), human = '# Instruções humanas\n';
  put(root, 'AGENTS.md', human); put(root, '.gitignore', '# regra humana\n');
  git(root, 'add', '--', 'AGENTS.md', '.gitignore');
  const index = fs.readFileSync(join(root, '.git/index'));
  const exclude = fs.readFileSync(join(root, '.git/info/exclude'));
  const before = fs.lstatSync(join(root, 'AGENTS.md'), { bigint: true });
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const offset = plan.changes.findIndex(change => action === 'remove' || action === 'mixed'
    ? change.action === 'update' && change.path === 'AGENTS.md'
    : change.action === action && (action !== 'update' || change.path === 'AGENTS.md'));
  assert.ok(offset >= 0, `fixture sem ação ${action}`);
  if (action === 'remove') plan.changes[offset] = { ...plan.changes[offset], action, content: null };
  const duplicate = { ...plan.changes[offset] };
  if (action === 'mixed') { duplicate.action = 'remove'; duplicate.content = null; }
  plan.changes.splice(offset, 0, duplicate);
  assert.throws(() => applyPlan(plan), error => error.code === 'E_PLAN');
  const after = fs.lstatSync(join(root, 'AGENTS.md'), { bigint: true });
  assert.equal(fs.readFileSync(join(root, 'AGENTS.md'), 'utf8'), human);
  assert.equal(after.dev, before.dev); assert.equal(after.ino, before.ino);
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(fs.readFileSync(join(root, '.git/info/exclude')), exclude);
  assert.equal(fs.readFileSync(join(root, '.gitignore'), 'utf8'), '# regra humana\n');
  assert.equal(fs.existsSync(join(root, '.agent-tests')), false, 'plano inválido não deve criar backup');
});

test("change of actions during backup is refused before public changes", { timeout: 120000 }, t => {
  const root = fixture(t), human = '# Instruções humanas\n';
  put(root, 'AGENTS.md', human); put(root, '.gitignore', '# regra humana\n');
  git(root, 'add', '--', 'AGENTS.md', '.gitignore');
  const index = fs.readFileSync(join(root, '.git/index'));
  const exclude = fs.readFileSync(join(root, '.git/info/exclude'));
  const before = fs.lstatSync(join(root, 'AGENTS.md'), { bigint: true });
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const change = plan.changes.find(item => item.path === 'AGENTS.md' && item.action === 'update');
  assert.ok(change);
  const write = fs.writeFileSync; let changed = false;
  t.mock.method(fs, 'writeFileSync', (path, ...args) => {
    const result = write(path, ...args);
    if (!changed && typeof path === 'string' && path.includes(`${sep}.agent-tests${sep}agentdevkit${sep}backups${sep}`)) {
      changed = true; plan.changes.push({ ...change });
    }
    return result;
  });
  syncBuiltinESMExports();
  let error; try { applyPlan(plan); } catch (caught) { error = caught; }
  assert.equal(changed, true);
  assert.equal(error?.code, 'E_CHANGED');
  const after = fs.lstatSync(join(root, 'AGENTS.md'), { bigint: true });
  assert.equal(fs.readFileSync(join(root, 'AGENTS.md'), 'utf8'), human);
  assert.equal(after.dev, before.dev); assert.equal(after.ino, before.ino);
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(fs.readFileSync(join(root, '.git/info/exclude')), exclude);
  assert.equal(fs.readFileSync(join(root, '.gitignore'), 'utf8'), '# regra humana\n');
});

nodeTest('candidatos de poda respeitam limites e incluem diretórios legados condicionais', () => {
  const plan = {
    changes: [
      { action: 'remove', path: '.claude/skills/demo/SKILL.md' },
      { action: 'remove', path: '.pbai4devs/adapters/README.md' },
      { action: 'remove', path: 'notas/arquivo-humano.md' },
      { action: 'update', path: '.claude/skills/mantida/SKILL.md' },
    ],
    retiredRoots: ['.claude', 'notas'],
  };
  const effects = derivePruneCandidates(plan), paths = effects.chains.flat();
  assert.ok(effects.chains.some(chain => chain.join(',') === '.claude/skills/demo,.claude/skills'));
  assert.ok(paths.includes('.pbai4devs/adapters/antigravity/agents'));
  assert.ok(paths.includes('.pbai4devs/adapters/antigravity'));
  assert.ok(!paths.includes('.pbai4devs') && !paths.includes('.claude'));
  assert.ok(!paths.some(path => path.startsWith('notas') || path.includes('mantida')));
  assert.deepEqual(effects.retiredRoots, ['.claude']);
});

test("plan change during backup blocks pruning before public changes", { timeout: 120000 }, t => {
  const root = fixture(t), human = Buffer.from('# Instruções da equipe\n');
  put(root, 'AGENTS.md', human); put(root, '.gitignore', '# regra humana\n');
  git(root, 'add', '--', '.gitignore');
  const index = fs.readFileSync(join(root, '.git/index'));
  const ignore = fs.readFileSync(join(root, '.gitignore'));
  fs.mkdirSync(join(root, '.claude'));
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  plan.retiredRoots.push('.claude');
  assert.ok(plan.changes.some(change => change.path === 'AGENTS.md' && change.action === 'update'));
  const write = fs.writeFileSync; let changed = false;
  t.mock.method(fs, 'writeFileSync', (path, ...args) => {
    if (!changed && typeof path === 'string' && path.includes(`${sep}.agent-tests${sep}agentdevkit${sep}backups${sep}`)) {
      changed = true; plan.retiredRoots.length = 0;
    }
    return write(path, ...args);
  });
  syncBuiltinESMExports();
  assert.throws(() => applyPlan(plan), error => error.code === 'E_CHANGED' && /pruning plan changed/.test(error.message));
  assert.equal(changed, true);
  assert.equal(fs.existsSync(join(root, '.claude')), true);
  assert.deepEqual(fs.readFileSync(join(root, 'AGENTS.md')), human);
  assert.deepEqual(fs.readFileSync(join(root, '.gitignore')), ignore);
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
});

test("Single-use iterator is refused before creating backup or changing the project", { timeout: 120000 }, t => {
  const root = fixture(t), human = Buffer.from('# Instruções da equipe\n');
  put(root, 'AGENTS.md', human); put(root, '.gitignore', '# regra humana\n');
  git(root, 'add', '--', '.gitignore');
  const index = fs.readFileSync(join(root, '.git/index'));
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const makeIterator = () => (function* () { yield '.claude'; })();
  const shared = makeIterator();
  for (const retiredRoots of [makeIterator(), { [Symbol.iterator]: () => shared }]) {
    plan.retiredRoots = retiredRoots;
    assert.throws(() => applyPlan(plan), error => error.code === 'E_PLAN' && /array or Set/.test(error.message));
  }
  assert.deepEqual(fs.readFileSync(join(root, 'AGENTS.md')), human);
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
  assert.equal(fs.existsSync(join(root, '.agent-tests')), false);
});

test("root change during pruning prevents removing unmarked root", { timeout: 120000 }, t => {
  const root = fixture(t);
  applyPlan(planInstallation({ target: root, mode: 'init', clients: ['claude'] }));
  const plan = planInstallation({ target: root, mode: 'agents', clients: ['codex'] });
  assert.ok(plan.retiredRoots.includes('.claude'));
  const remove = fs.rmdirSync; let changed = false, rootRemovalAttempted = false;
  t.mock.method(fs, 'rmdirSync', (path, ...args) => {
    if (path === join(root, '.claude')) rootRemovalAttempted = true;
    if (!changed && typeof path === 'string' && path.startsWith(join(root, '.claude') + sep)) {
      changed = true; plan.retiredRoots.length = 0;
    }
    return remove(path, ...args);
  });
  syncBuiltinESMExports();
  assert.throws(() => applyPlan(plan), error => error.code === 'E_CHANGED' && /pruning plan changed/.test(error.message));
  assert.equal(changed, true);
  assert.equal(rootRemovalAttempted, false);
  assert.equal(fs.statSync(join(root, '.claude')).isDirectory(), true);
});

test("change between roots removed prevents pruning the next root", { timeout: 120000 }, t => {
  const root = fixture(t);
  // Claude maintains rules for revision; use two effectively removable roots.
  applyPlan(planInstallation({ target: root, mode: 'init', clients: ['cursor', 'opencode'] }));
  const plan = planInstallation({ target: root, mode: 'agents', clients: ['codex'] });
  assert.ok(plan.retiredRoots.includes('.cursor') && plan.retiredRoots.includes('.opencode'));
  const [first, second] = plan.retiredRoots;
  const remove = fs.rmdirSync; let changed = false, secondAttempted = false;
  t.mock.method(fs, 'rmdirSync', (path, ...args) => {
    if (path === join(root, second)) secondAttempted = true;
    if (!changed && path === join(root, first)) { changed = true; plan.retiredRoots.length = 0; }
    return remove(path, ...args);
  });
  syncBuiltinESMExports();
  assert.throws(() => applyPlan(plan), error => error.code === 'E_CHANGED' && /pruning plan changed/.test(error.message));
  assert.equal(changed, true);
  assert.equal(secondAttempted, false);
  assert.equal(fs.statSync(join(root, second)).isDirectory(), true);
});

// An investigative over-approximation, not production capture. It records
// ancestors that may be created or pruned, not an exact prediction of pruning.
function candidate(root, plan) {
  const changes = new Map(plan.changes.map(change => [change.path, change]));
  const paths = new Set(changes.keys()), possibleRemoval = new Set();
  const include = (path, removal = false) => {
    if (!path || path === '.') return;
    paths.add(path); if (removal) possibleRemoval.add(path);
    let parent = posix(dirname(path));
    while (parent !== '.') { paths.add(parent); if (removal) possibleRemoval.add(parent); parent = posix(dirname(parent)); }
  };
  for (const change of plan.changes) include(change.path, change.action === 'remove');
  for (const directory of plan.migration?.directories || []) {
    include(directory.path, true);
    include(directory.path.replace(/^\.pbai4devs\/estado/, '.pbai4devs/state'));
  }
  for (const item of plan.migration?.files || []) { include(item.path, true); include(item.target); }
  for (const path of plan.retiredRoots || []) include(path, true);
  if (changes.get('.pbai4devs/adapters/README.md')?.action === 'remove') {
    include('.pbai4devs/adapters/antigravity', true); include('.pbai4devs/adapters/antigravity/agents', true);
  }
  return [...paths].sort().map(path => {
    const file = join(root, path), info = safeStat(file), planned = changes.get(path);
    if (!info) return { path, action: 'create', type: 'absent', mode: null };
    assert.equal(info.isSymbolicLink(), false, `fixture inesperada: ${path}`);
    if (info.isDirectory()) return { path, action: possibleRemoval.has(path) ? 'remove' : 'retain', type: 'directory', mode: info.mode & 0o777 };
    assert.equal(info.isFile(), true, `fixture inesperada: ${path}`);
    const data = fs.readFileSync(file);
    if (planned) assert.equal(sha(data), planned.beforeHash, `arquivo mudou após plano: ${path}`);
    return { path, action: planned?.action || 'retain', type: 'file', mode: info.mode & 0o777, data };
  });
}

// Only calls through these Node fs bindings are observed. Git subprocesses,
// lower-level syscalls, concurrent writers and uninstrumented APIs are not.
function traceRun(t, root, operation, { captureRecursiveParents = false } = {}) {
  const names = ['writeFileSync', 'appendFileSync', 'rmSync', 'unlinkSync', 'mkdirSync', 'rmdirSync', 'chmodSync', 'renameSync', 'linkSync', 'symlinkSync', 'cpSync', 'copyFileSync', 'truncateSync', 'openSync', 'closeSync'];
  const originals = Object.fromEntries(names.map(name => [name, fs[name]]));
  const events = [], writable = new Map();
  const local = value => {
    if (typeof value !== 'string') return null;
    const path = resolve(value), prefix = root + sep;
    if (path !== root && !path.startsWith(prefix)) return null;
    return posix(relative(root, path));
  };
  for (const name of names) t.mock.method(fs, name, (...args) => {
    const missingParents = [];
    if (captureRecursiveParents && name === 'mkdirSync' && typeof args[0] === 'string') {
      let current = resolve(args[0]);
      while ((current === root || current.startsWith(root + sep)) && !fs.existsSync(current)) {
        missingParents.push(current);
        current = dirname(current);
      }
    }
    const flags = args[1], writeOpen = name === 'openSync' && (typeof flags === 'number'
      ? Boolean(flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_APPEND))
      : typeof flags === 'string' && /[wax+]/.test(flags));
    if (name !== 'closeSync' && (name !== 'openSync' || writeOpen)) {
      const pathArgs = ['renameSync', 'linkSync', 'symlinkSync', 'copyFileSync', 'cpSync'].includes(name) ? args.slice(0, 2) : args.slice(0, 1);
      for (const [argument, arg] of pathArgs.entries()) {
        const path = typeof arg === 'number' ? writable.get(arg) : local(arg);
        if (path !== null && path !== undefined) {
          events.push({ operation: name, path, argument, ...(name === 'openSync' ? { flags } : {}) });
        }
      }
    }
    const result = originals[name](...args);
    for (const path of missingParents) if (fs.existsSync(path)) {
      events.push({ operation: 'mkdir-created', path: local(path), argument: 0 });
    }
    if (name === 'closeSync') writable.delete(args[0]);
    if (name === 'openSync' && typeof result === 'number') {
      writable.delete(result);
      const path = local(args[0]); if (writeOpen && path !== null) writable.set(result, path);
    }
    return result;
  });
  syncBuiltinESMExports();
  try { operation(); } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  return events;
}

function syncPublicEvents(events) {
  const recovery = '.agent-tests/agentdevkit/recovery';
  return events.filter(({ path }) => path !== '.agent-tests' && path !== '.agent-tests/agentdevkit'
    && path !== recovery && !path.startsWith(recovery + '/'));
}

function syncLogicalAction(event) {
  if (event.operation === 'rmSync' && event.argument === 0) return 'remove';
  if (event.operation === 'openSync' && event.argument === 0 && event.flags === 'wx') return 'write';
  if (event.operation === 'renameSync' && event.argument === 1) return 'write';
  return null;
}

function assertSyncLogicalOperations(events, operations) {
  const observed = events.map(event => ({ path: event.path, action: syncLogicalAction(event) })).filter(item => item.action);
  assert.deepEqual(observed, operations.map(({ path, action }) => ({ path, action })));
}

function assertCoverage(events, entries, { allowRoot = false } = {}) {
  const paths = new Set(entries.map(entry => entry.path));
  assert.ok(events.length > 0, 'instrumentação não observou chamadas');
  const relevant = events.filter(event => event.path !== '.agent-tests' && !event.path.startsWith('.agent-tests/') && !(allowRoot && event.path === ''));
  const missing = relevant.filter(event => {
    const logical = event.path.replace(/\.agentdevkit-[0-9a-f-]{36}$/i, '');
    return !paths.has(event.path) && !paths.has(logical);
  });
  assert.deepEqual(missing.slice(0, 15), [], `chamadas observadas fora do candidato: ${JSON.stringify(missing.slice(0, 15))}`);
  return relevant;
}

function verifyCandidate(t, root, plan, { missingRoot = false } = {}) {
  const expected = candidate(root, plan);
  const operations = expected.map(entry => ({ path: entry.path, action: entry.action,
    ...(entry.type === 'file' ? { beforeHash: sha(entry.data) } : {}) }));
  let entries;
  if (missingRoot) {
    assert.throws(() => captureRecoverySnapshot(root, operations), { code: 'E_RECOVERY_CAPTURE_ROOT' });
    entries = expected; // Synthetic candidate: does not represent root creation.
  } else {
    entries = captureRecoverySnapshot(root, operations);
    assert.deepEqual(entries, expected);
  }
  const backup = fs.mkdtempSync(join(fs.realpathSync(tmpdir()), 'adk-plan-backup-'));
  t.after(() => fs.rmSync(backup, { recursive: true, force: true }));
  const result = prepareRecoveryBackup(backup, entries);
  assert.deepEqual(verifyRecoveryBackup(backup, result.manifest), result);
  const data = JSON.parse(fs.readFileSync(join(backup, 'manifest.json')));
  return { entries, backup, data, result };
}

test("real init: candidate covers observed calls and conserves previous content and index", { timeout: 120000 }, t => {
  const root = fixture(t);
  put(root, '.gitignore', '# humano\nsegredos/\n'); put(root, 'AGENTS.md', '# Orientações da equipe\n');
  put(root, '.claude/settings.json', '{"humano":true}\n'); git(root, 'add', '--', '.gitignore', 'AGENTS.md', '.claude/settings.json');
  put(root, 'AGENTS.md', '# Orientações editadas após stage\n');
  const index = fs.readFileSync(join(root, '.git/index')), config = fs.readFileSync(join(root, '.git/config'));
  const ignore = fs.readFileSync(join(root, '.gitignore')), human = fs.readFileSync(join(root, 'AGENTS.md'));
  const plan = planInstallation({ target: root, mode: 'init', clients: ['claude'] });
  assert.equal(plan.canApply, true);
  const snapshot = verifyCandidate(t, root, plan), saved = snapshot.data.entries.find(entry => entry.path === 'AGENTS.md');
  assert.ok(saved); assert.deepEqual(fs.readFileSync(join(snapshot.backup, 'blobs', saved.blob)), human);
  const observed = traceRun(t, root, () => applyPlan(plan));
  assert.ok(observed.filter(event => event.path === '').every(event => event.operation === 'mkdirSync'));
  const events = assertCoverage(observed, snapshot.entries, { allowRoot: true });
  assert.throws(() => assertCoverage(events, snapshot.entries.filter(entry => plan.changes.some(change => change.path === entry.path))), /chamadas observadas fora do candidato/);
  assert.ok(events.some(event => event.operation === 'mkdirSync' && !plan.changes.some(change => change.path === event.path)), 'o plano de arquivos não cobre todos os diretórios observados');
  assert.ok(events.some(event => event.operation === 'mkdirSync'));
  assert.ok(events.some(event => event.operation === 'linkSync' || event.operation === 'renameSync'));
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(fs.readFileSync(join(root, '.git/config')), config);
  assert.deepEqual(fs.readFileSync(join(root, '.gitignore')), ignore);
  assert.ok(fs.readFileSync(join(root, 'AGENTS.md'), 'utf8').includes(human.toString('utf8').trim()));
  assert.equal(fs.readFileSync(join(root, '.claude/settings.json'), 'utf8'), '{"humano":true}\n');
});

test("real migration: candidate covers files, old directories and observed destinations", { timeout: 120000 }, t => {
  const root = fixture(t); put(root, '.gitignore', '# humano\n');
  applyPlan(planInstallation({ target: root, mode: 'init', clients: ['codex'] }));
  const state = join(root, '.pbai4devs/state/agentdevkit.json'), value = JSON.parse(fs.readFileSync(state));
  value.version = '0.0.16';
  for (const key of Object.keys(value.files || {})) if (key.startsWith('.pbai4devs/state/')) {
    value.files[key.replace('.pbai4devs/state/', '.pbai4devs/estado/')] = value.files[key]; delete value.files[key];
  }
  fs.writeFileSync(state, `${JSON.stringify(value, null, 2)}\n`);
  put(root, '.pbai4devs/state/equipe/notas.txt', 'dados da equipe\n');
  fs.renameSync(join(root, '.pbai4devs/state'), join(root, '.pbai4devs/estado'));
  git(root, 'add', '--', '.gitignore', '.pbai4devs/estado/equipe/notas.txt');
  const index = fs.readFileSync(join(root, '.git/index')), plan = planInstallation({ target: root, mode: 'update' });
  assert.ok(plan.migration?.directories.length); assert.ok(plan.migration.files.length);
  const snapshot = verifyCandidate(t, root, plan);
  assert.ok(snapshot.entries.some(entry => entry.path === '.pbai4devs/estado/equipe/notas.txt' && entry.type === 'file'));
  assert.ok(snapshot.entries.some(entry => entry.path === '.pbai4devs/state/equipe' && entry.type === 'absent'));
  const observed = traceRun(t, root, () => applyPlan(plan));
  assert.ok(observed.filter(event => event.path === '').every(event => event.operation === 'mkdirSync'));
  const events = assertCoverage(observed, snapshot.entries, { allowRoot: true });
  assert.ok(events.some(event => event.operation === 'rmdirSync' && (event.path === '.pbai4devs/estado' || event.path.startsWith('.pbai4devs/estado/'))));
  assert.equal(fs.readFileSync(join(root, '.pbai4devs/state/equipe/notas.txt'), 'utf8'), 'dados da equipe\n');
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
});

test("actual obsolete removal: candidate includes directories possibly removed", { timeout: 120000 }, t => {
  const root = fixture(t); applyPlan(planInstallation({ target: root, mode: 'init', clients: ['codex'] }));
  const obsolete = '.pbai4devs/skills/equipe/obsoleta/SKILL.md';
  const content = '---\nname: obsoleta\ndescription: Recurso antigo.\n---\n\n# Obsoleta\n'; put(root, obsolete, content);
  const state = join(root, '.pbai4devs/state/agentdevkit.json'), value = JSON.parse(fs.readFileSync(state));
  value.files[obsolete] = sha(Buffer.from(content)); fs.writeFileSync(state, `${JSON.stringify(value, null, 2)}\n`);
  const plan = planInstallation({ target: root, mode: 'update', force: true });
  assert.ok(plan.changes.some(change => change.path === obsolete && change.action === 'remove'));
  const prunePaths = new Set(derivePruneCandidates(plan).chains.flat());
  const snapshot = verifyCandidate(t, root, plan);
  assert.ok(snapshot.entries.some(entry => entry.path === '.pbai4devs/skills/equipe/obsoleta' && entry.type === 'directory'));
  const saved = snapshot.data.entries.find(entry => entry.path === obsolete);
  assert.ok(saved);
  const observed = traceRun(t, root, () => applyPlan(plan));
  assert.ok(observed.filter(event => event.path === '').every(event => event.operation === 'mkdirSync'));
  const events = assertCoverage(observed, snapshot.entries, { allowRoot: true });
  assert.ok(events.some(event => event.operation === 'rmdirSync' && event.path === '.pbai4devs/skills/equipe/obsoleta'));
  assert.ok(events.filter(event => event.operation === 'rmdirSync').every(event => prunePaths.has(event.path)), 'poda observada deve estar entre os candidatos');
  assert.equal(fs.readFileSync(join(snapshot.backup, 'blobs', saved.blob), 'utf8'), content);
  assert.deepEqual(verifyRecoveryBackup(snapshot.backup, snapshot.result.manifest), snapshot.result);
});

test("obsolete removal preserves human file in the same directory", { timeout: 120000 }, t => {
  const root = fixture(t); applyPlan(planInstallation({ target: root, mode: 'init', clients: ['codex'] }));
  const obsolete = '.pbai4devs/skills/equipe/obsoleta/SKILL.md', human = '.pbai4devs/skills/equipe/obsoleta/nota-humana.txt';
  const content = '---\nname: obsoleta\ndescription: Fixture.\n---\n\n# Obsoleta\n';
  put(root, obsolete, content); put(root, human, 'preservar\n');
  const state = join(root, '.pbai4devs/state/agentdevkit.json'), value = JSON.parse(fs.readFileSync(state));
  value.files[obsolete] = sha(Buffer.from(content)); fs.writeFileSync(state, `${JSON.stringify(value, null, 2)}\n`);
  const plan = planInstallation({ target: root, mode: 'update', force: true });
  assert.ok(plan.changes.some(change => change.path === obsolete && change.action === 'remove'));
  const snapshot = verifyCandidate(t, root, plan), observed = traceRun(t, root, () => applyPlan(plan));
  assert.ok(observed.filter(event => event.path === '').every(event => event.operation === 'mkdirSync'));
  assertCoverage(observed, snapshot.entries, { allowRoot: true });
  assert.equal(fs.existsSync(join(root, obsolete)), false);
  assert.equal(fs.readFileSync(join(root, human), 'utf8'), 'preservar\n');
});

test("nonexistent project: Plan files do not represent root creation", { timeout: 120000 }, t => {
  const parent = fixture(t), root = join(parent, 'projeto-novo');
  assert.equal(fs.existsSync(root), false);
  const targetBefore = inspectRecoveryTarget(root);
  assert.equal(targetBefore.status, 'missing'); assert.deepEqual(targetBefore.missing, ['projeto-novo']);
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  assert.deepEqual(inspectRecoveryTarget(root), targetBefore);
  const snapshot = verifyCandidate(t, root, plan, { missingRoot: true });
  assert.ok(snapshot.entries.length > 0);
  assert.ok(snapshot.entries.every(entry => entry.type === 'absent'));
  assert.ok(!snapshot.entries.some(entry => entry.path === '.' || entry.path === ''));
  const events = traceRun(t, root, () => applyPlan(plan));
  assert.ok(events.some(event => event.path === '' && event.operation === 'mkdirSync'), 'a criação da raiz deve ser observada');
  assertCoverage(events, snapshot.entries, { allowRoot: true });
  assert.equal(fs.statSync(root).isDirectory(), true);
  assert.equal(inspectRecoveryTarget(root).status, 'existing');
});

test("direct sync: new observed outputs require plan available before writing", { timeout: 120000 }, t => {
  const root = fixture(t);
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    const source = new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url);
    put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(source));
  }
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
  put(root, '.claude/settings.json', '{"equipe":true}\n'); put(root, '.gitignore', '# humano\n');
  git(root, 'add', '--', '.claude/settings.json', '.gitignore');
  synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  put(root, '.pbai4devs/skills/novo/SKILL.md', '---\nname: novo\ndescription: Outro recurso.\n---\n\n# Novo\n');
  const index = fs.readFileSync(join(root, '.git/index')), settings = fs.readFileSync(join(root, '.claude/settings.json'));
  const expected = join(root, '.claude/skills/novo/SKILL.md');
  assert.equal(fs.existsSync(expected), false);
  let preview;
  const checkEvents = traceRun(t, root, () => { preview = synchronize({ root, check: true, localIgnores: false, generateEntrypoints: false, output() {} }); });
  assert.deepEqual(checkEvents, [], 'check não deve escrever pelas APIs instrumentadas');
  assert.equal(preview.exitCode, 1);
  assert.equal(Object.hasOwn(preview, 'plan'), false, 'a consulta atual retorna resumo, não o plano de ações');
  assert.equal(Object.hasOwn(preview, 'logicalEffects'), false, 'a saída existente não deve mudar');
  let described;
  const descriptionEvents = traceRun(t, root, () => { described = inspectSyncEffects({ root, localIgnores: false, generateEntrypoints: false, output() {} }); });
  assert.deepEqual(descriptionEvents, [], 'a inspeção de efeitos deve ser somente leitura');
  assert.equal(described.logicalEffects.completeness, 'incomplete');
  assert.equal(described.logicalEffects.mutationAuthorized, false);
  assert.ok(described.logicalEffects.exclusions.includes('temporary-files'));
  assert.ok(described.logicalEffects.exclusions.includes('backups'));
  assert.ok(described.logicalEffects.exclusions.includes('rollback'));
  const actions = described.logicalEffects.operations;
  assert.ok(actions.some(item => item.path === '.claude/skills/novo/SKILL.md' && item.action === 'write'));
  assert.ok(actions.every(item => !Object.hasOwn(item, 'content')));
  assert.ok(!JSON.stringify(described.logicalEffects).includes('Outro recurso.'));
  assert.equal(fs.existsSync(expected), false);
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
  const events = traceRun(t, root, () => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }));
  const publicEvents = syncPublicEvents(events);
  assert.ok(events.some(event => event.operation === 'linkSync' && event.argument === 1
    && event.path.startsWith('.agent-tests/agentdevkit/recovery/journal/records/')), 'a fixture deve observar o diário excluído');
  assert.ok(publicEvents.some(event => event.operation === 'openSync' && event.flags === 'wx' && event.path === '.claude/skills/novo/SKILL.md'));
  assert.ok(publicEvents.some(event => event.operation === 'writeFileSync' && event.path === '.claude/skills/novo/SKILL.md'));
  const allowed = new Set(actions.flatMap(item => [item.path, ...(item.parents || [])]));
  assert.deepEqual(publicEvents.filter(event => !allowed.has(event.path)), [], 'a fixture observada tem efeitos fora da lista e dos pais');
  const omitted = actions.filter(item => item.path !== '.claude/skills/novo/SKILL.md');
  const omittedPaths = new Set(omitted.flatMap(item => [item.path, ...(item.parents || [])]));
  assert.throws(() => assert.deepEqual(publicEvents.filter(event => !omittedPaths.has(event.path)), []), 'controle negativo deve detectar ação omitida');
  assertSyncLogicalOperations(publicEvents, actions);
  assert.throws(() => assertSyncLogicalOperations(publicEvents, actions.filter(item => item.path !== '.claude/skills/novo/SKILL.md')));
  assert.equal(fs.existsSync(expected), true);
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(fs.readFileSync(join(root, '.claude/settings.json')), settings);
});

test("effect inspection cannot be activated in changeable mode", t => {
  const root = fixture(t); put(root, 'README.md', '# Equipe\n'); git(root, 'add', '--', 'README.md');
  const index = fs.readFileSync(join(root, '.git/index'));
  const before = fs.readdirSync(root).sort();
  assert.throws(() => synchronize({ root, inspectEffects: true, output() {} }), /modo de consulta/);
  assert.deepEqual(fs.readdirSync(root).sort(), before);
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
});

test("description of sync effects covers creation, update and removal observed", t => {
  const root = fixture(t);
  const trickyParent = '.claude/skills/hub.sync.123e4567-e89b-42d3-a456-426614174000';
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\nnativo|.claude/skills/demo.sync.aprovado/SKILL.md|.pbai4devs/skills/demo/SKILL.md\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
  }
  for (const name of ['antigo', 'demo']) put(root, `.pbai4devs/skills/${name}/SKILL.md`, `---\nname: ${name}\ndescription: Original.\n---\n\n# ${name}\n`);
  const options = { root, localIgnores: false, generateEntrypoints: false, output() {} };
  synchronize(options);
  fs.rmSync(join(root, '.pbai4devs/skills/antigo'), { recursive: true });
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Atualizada.\n---\n\n# Demo\n');
  put(root, '.pbai4devs/skills/novo/SKILL.md', '---\nname: novo\ndescription: Criada.\n---\n\n# Novo\n');
  const configFile = join(root, '.pbai4devs/espelhos.conf');
  fs.appendFileSync(configFile, `nativo|${trickyParent}/SKILL.md|.pbai4devs/skills/demo/SKILL.md\n`);
  put(root, '.claude/settings.json', '{"equipe":true}\n'); put(root, '.gitignore', '# humano\n');
  git(root, 'add', '--', '.claude/settings.json', '.gitignore');
  const index = fs.readFileSync(join(root, '.git/index')), config = fs.readFileSync(join(root, '.git/config'));
  const effects = inspectSyncEffects(options).logicalEffects, operations = effects.operations;
  assert.ok(operations.every(item => Object.hasOwn(item, 'beforeHash')));
  const recoveryOperations = operations.map(item => ({ path: item.path,
    action: item.action === 'remove' ? 'remove' : item.beforeHash === null ? 'create' : 'update',
    beforeHash: item.beforeHash }));
  const captured = captureRecoverySnapshot(root, recoveryOperations);
  const updatedBefore = captured.find(item => item.path === '.claude/skills/demo/SKILL.md');
  const removedBefore = captured.find(item => item.path === '.claude/skills/antigo/SKILL.md');
  assert.equal(updatedBefore?.action, 'update'); assert.equal(removedBefore?.action, 'remove');
  assert.ok(captured.some(item => item.path === '.claude/skills/novo/SKILL.md' && item.type === 'absent'));
  assert.equal(sha(updatedBefore.data), operations.find(item => item.path === updatedBefore.path).beforeHash);
  const stale = recoveryOperations.map(item => item.path === updatedBefore.path ? { ...item, beforeHash: '0'.repeat(64) } : item);
  assert.throws(() => captureRecoverySnapshot(root, stale), { code: 'E_RECOVERY_CAPTURE_CHANGED' });
  const updatedPath = join(root, updatedBefore.path), originalBytes = fs.readFileSync(updatedPath);
  fs.writeFileSync(updatedPath, 'Edição entre planejamento e captura.\n');
  assert.throws(() => captureRecoverySnapshot(root, recoveryOperations), { code: 'E_RECOVERY_CAPTURE_CHANGED' });
  assert.equal(fs.readFileSync(updatedPath, 'utf8'), 'Edição entre planejamento e captura.\n');
  fs.writeFileSync(updatedPath, originalBytes);
  const expected = [
    ['.claude/skills/antigo/SKILL.md', 'remove'],
    ['.claude/skills/demo/SKILL.md', 'write'],
    ['.claude/skills/novo/SKILL.md', 'write'],
    ['.claude/skills/demo.sync.aprovado/SKILL.md', 'write'],
  ];
  for (const [path, action] of expected) assert.ok(operations.some(item => item.path === path && item.action === action));
  const observed = traceRun(t, root, () => synchronize(options));
  const publicEvents = syncPublicEvents(observed);
  const positions = expected.map(([path, action]) => publicEvents.findIndex(event => event.path === path && syncLogicalAction(event) === action));
  assert.ok(positions.every(position => position >= 0));
  assert.ok(positions[0] < positions[1] && positions[0] < positions[2]);
  const allowed = new Set(operations.flatMap(item => [item.path, ...(item.parents || [])]));
  assert.deepEqual(publicEvents.filter(event => !allowed.has(event.path)), []);
  assert.ok(observed.some(event => event.operation === 'mkdirSync' && event.path === trickyParent));
  const missingParent = new Set([...allowed].filter(path => path !== trickyParent));
  assert.throws(() => assert.deepEqual(publicEvents.filter(event => !missingParent.has(event.path)), []));
  assert.ok(publicEvents.some(event => event.operation === 'openSync' && event.flags === 'wx' && event.path === '.claude/skills/novo/SKILL.md'));
  assert.ok(observed.some(event => event.operation === 'renameSync' && event.argument === 1 && event.path === '.claude/skills/demo/SKILL.md'));
  assertSyncLogicalOperations(publicEvents, operations);
  assert.throws(() => assertSyncLogicalOperations(publicEvents, operations.filter(item => item.path !== '.claude/skills/demo.sync.aprovado/SKILL.md')));
  const changedAction = operations.map(item => item.path === '.claude/skills/demo/SKILL.md' ? { ...item, action: 'remove' } : item);
  assert.throws(() => assertSyncLogicalOperations(publicEvents, changedAction));
  assert.throws(() => assertSyncLogicalOperations(publicEvents, [...operations].reverse()));
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(fs.readFileSync(join(root, '.git/config')), config);
  assert.equal(fs.readFileSync(join(root, '.claude/settings.json'), 'utf8'), '{"equipe":true}\n');
});

// Laboratory description only: candidates do not prove a complete snapshot,
// authorization, metadata preservation or a durable recovery protocol.
function describeCandidate(root, plan) {
  return {
    completeness: 'incomplete',
    mutationAuthorized: false,
    exclusions: [
      'temporary-files', 'backup-and-journal', 'target-root', 'rollback',
      'conditional-directory-outcomes', 'local-ignore', 'external-callbacks',
      'git-subprocesses', 'acl-xattr-and-flags', 'absent-kind',
    ],
    entries: candidate(root, plan),
  };
}

test("init Codex: candidate covers observed directories and explicit exclusions", { timeout: 120000 }, t => {
  const root = fixture(t);
  put(root, '.gitignore', '# equipe\n');
  put(root, 'HUMAN.txt', 'staged\n');
  put(root, 'AGENTS.md', '# instruções humanas\n');
  const agentsBefore = fs.readFileSync(join(root, 'AGENTS.md'));
  git(root, 'add', '--', '.gitignore', 'HUMAN.txt');
  fs.appendFileSync(join(root, 'HUMAN.txt'), 'unstaged\n');
  const protectedFiles = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'HUMAN.txt'];
  const protectedBefore = protectedFiles.map(path => fs.readFileSync(join(root, path)));
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  assert.equal(plan.canApply, true);
  const report = describeCandidate(root, plan);
  assert.equal(report.completeness, 'incomplete');
  assert.equal(report.mutationAuthorized, false);
  const paths = new Map(report.entries.map(entry => [entry.path, entry]));
  let applied;
  const events = traceRun(t, root, () => { applied = applyPlan(plan); }, { captureRecursiveParents: true });
  const privatePath = path => path === '.agent-tests' || path.startsWith('.agent-tests/');
  const mkdirs = [...new Set(events.filter(event => event.operation === 'mkdir-created' && event.path && !privatePath(event.path)).map(event => event.path))];
  const missing = mkdirs.filter(path => !paths.has(path));
  assert.deepEqual(missing, []);
  const newlyCreated = mkdirs.filter(path => paths.get(path)?.type === 'absent' && fs.lstatSync(join(root, path)).isDirectory());
  assert.ok(newlyCreated.length > 0, 'a fixture deve criar diretórios fora dos arquivos planejados');
  assert.ok(newlyCreated.some(path => !plan.changes.some(change => change.path === path)));
  const omitted = new Set([...paths.keys()].filter(path => path !== newlyCreated[0]));
  assert.ok(mkdirs.some(path => !omitted.has(path)), 'controle negativo deve detectar diretório omitido');
  const temporaries = [...new Set(events.filter(event => /\.agentdevkit-[0-9a-f-]{36}$/i.test(event.path)).map(event => event.path))];
  assert.ok(temporaries.length > 0, 'a fixture deve observar nomes temporários físicos');
  assert.ok(temporaries.every(path => !paths.has(path)), 'o candidato não deve fingir que um nome temporário é o destino final');
  assert.equal(typeof applied.backup, 'string', 'a aplicação deve informar o backup criado');
  assert.match(applied.backup, /^\.agent-tests\/agentdevkit\/backups\/[^/]+$/);
  const backupFile = `${applied.backup}/AGENTS.md`;
  assert.ok(events.some(event => event.path === backupFile && event.operation === 'writeFileSync'), 'a instrumentação deve observar a gravação do backup específico');
  assert.deepEqual(fs.readFileSync(join(root, ...backupFile.split('/'))), agentsBefore);
  for (const exclusion of ['temporary-files', 'backup-and-journal', 'target-root', 'rollback', 'conditional-directory-outcomes', 'local-ignore', 'external-callbacks', 'git-subprocesses', 'acl-xattr-and-flags', 'absent-kind']) assert.ok(report.exclusions.includes(exclusion));
  assert.deepEqual(protectedFiles.map(path => fs.readFileSync(join(root, path))), protectedBefore);
  const agentsAfter = fs.readFileSync(join(root, 'AGENTS.md'));
  assert.ok(agentsAfter.includes(agentsBefore));
  assert.notDeepEqual(agentsAfter, agentsBefore, 'a fixture deve acrescentar o bloco gerenciado');
  t.diagnostic(JSON.stringify({ candidateEntries: report.entries.length, newlyCreatedDirectories: newlyCreated.length, physicalTemporaries: temporaries.length, backupBytesMatch: true, agentsUpdated: true, completeness: report.completeness }));
});

test("Missing root remains excluded from incomplete description", { timeout: 120000 }, t => {
  const parent = fixture(t), root = join(parent, 'projeto-novo');
  put(parent, '.gitignore', '# equipe\n');
  put(parent, 'HUMAN.txt', 'staged\n');
  git(parent, 'add', '--', '.gitignore', 'HUMAN.txt');
  fs.appendFileSync(join(parent, 'HUMAN.txt'), 'unstaged\n');
  const paths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'HUMAN.txt'];
  const before = paths.map(path => fs.readFileSync(join(parent, path)));
  assert.equal(fs.existsSync(root), false);
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  const report = describeCandidate(root, plan);
  assert.equal(report.completeness, 'incomplete');
  assert.equal(report.mutationAuthorized, false);
  assert.ok(report.exclusions.includes('target-root'));
  assert.ok(!report.entries.some(entry => entry.path === '' || entry.path === '.'));
  const events = traceRun(t, root, () => applyPlan(plan), { captureRecursiveParents: true });
  assert.ok(events.some(event => event.operation === 'mkdir-created' && event.path === ''));
  assert.equal(fs.statSync(root).isDirectory(), true);
  assert.deepEqual(paths.map(path => fs.readFileSync(join(parent, path))), before);
});

test("installer can read external target if an ancestor turns symlink between validation and reading", { timeout: 120000 }, t => {
  const root = fs.realpathSync(fs.mkdtempSync(join('/tmp', 'adk-install-ancestor-race-')));
  const outside = fs.realpathSync(fs.mkdtempSync(join('/tmp', 'adk-install-ancestor-outside-')));
  t.after(() => {
    t.mock.restoreAll(); syncBuiltinESMExports();
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  });
  git(root, 'init', '-q');
  const parent = join(root, 'swap'), moved = join(root, 'swap-original');
  const path = join(parent, 'secret.txt'), external = join(outside, 'secret.txt');
  const internalBytes = Buffer.from('conteudo interno sintetico\n');
  const externalBytes = Buffer.from('sentinela externa sintetica\n');
  fs.mkdirSync(parent); fs.writeFileSync(path, internalBytes); fs.writeFileSync(external, externalBytes);

  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  assert.equal(plan.canApply, true);
  plan.changes.push({ path: 'swap/secret.txt', action: 'update', beforeHash: sha(internalBytes), content: Buffer.from('novo conteudo\n') });

  const readFile = fs.readFileSync;
  let swapped = false, externalRead = false;
  t.mock.method(fs, 'readFileSync', (file, ...args) => {
    if (!swapped && file === path) {
      // applyPlan has passed safePath/stat for this file and is about to read
      // the snapshot by name. Replace only the ancestor at that boundary.
      swapped = true;
      fs.renameSync(parent, moved);
      fs.symlinkSync(outside, parent, 'dir');
    }
    const bytes = readFile(file, ...args);
    if (file === path && Buffer.isBuffer(bytes) && bytes.equals(externalBytes)) externalRead = true;
    return bytes;
  });
  syncBuiltinESMExports();

  assert.throws(() => applyPlan(plan));
  assert.equal(swapped, true, 'a fixture deve trocar o ancestral imediatamente antes da leitura');
  assert.equal(externalRead, true, 'a leitura por caminho deve alcançar o arquivo externo sintético');
  assert.deepEqual(readFile(external), externalBytes, 'o arquivo externo permanece intacto');
  assert.deepEqual(readFile(join(moved, 'secret.txt')), internalBytes, 'o arquivo original permanece intacto');
  assert.equal(fs.existsSync(join(root, '.agent-tests')), false, 'a aplicação deve falhar antes de criar o backup');
});
