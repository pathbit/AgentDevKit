import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import childProcess, { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { applyPlan, planInstallation } from '../src/install.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { collectErrorDiagnostics } from '../.pbai4devs/scripts/lib/error-reporting.mjs';

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-rename-cleanup-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
  const git = spawnSync('git', ['init', '-q', root], { encoding: 'utf8' });
  assert.equal(git.status, 0, git.stderr);
  return root;
}

function syncTemporaryFor(path, target, root) {
  return typeof path === 'string' && (path.startsWith(`${target}.sync.`) ||
    path.includes(`${sep}stage${sep}${relative(root, target)}.sync.`));
}

function includesCause(error, expected, seen = new Set()) {
  if (!error || typeof error !== 'object' || seen.has(error)) return false;
  if (error === expected) return true;
  seen.add(error);
  return includesCause(error.cause, expected, seen)
    || (Array.isArray(error.errors) && error.errors.some(item => includesCause(item, expected, seen)));
}

function newFileOperation(root, kind) {
  if (kind === 'install') {
    const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
    const file = plan.changes.find(change => change.action === 'create').path;
    return { file, run: () => applyPlan(plan) };
  }
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
  }
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Fixture.\n---\n\n# Demo\n');
  return { file: '.claude/skills/demo/SKILL.md', run: () => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }) };
}

for (const kind of ['install', 'sync']) for (const timing of ['antes', 'depois']) for (const frozen of [false, true]) for (const failureCode of ['EIO', 'EEXIST', 'ENOTSUP', 'EOPNOTSUPP']) {
  test(`${kind}: ${failureCode} ${timing} da criação exclusiva${frozen ? ' congelado' : ''} mantém resultado revisável`, { timeout: 120000 }, t => {
    const root = fixture(t), { file, run } = newFileOperation(root, kind), target = join(root, file);
    const open = fs.openSync, partial = Buffer.from('gravação parcial\n');
    const injected = Object.assign(new Error('falha sintética na criação'), { code: failureCode });
    let observed = false;
    t.mock.method(fs, 'openSync', (path, flags, ...args) => {
      if (!observed && path === target && flags === 'wx') {
        observed = true;
        if (timing === 'depois') {
          const fd = open(path, flags, ...args);
          try { fs.writeFileSync(fd, partial); } finally { fs.closeSync(fd); }
        }
        throw frozen ? Object.freeze(injected) : injected;
      }
      return open(path, flags, ...args);
    });
    syncBuiltinESMExports();
    let error; try { run(); } catch (failure) { error = failure; }
    assert.ok(observed);
    assert.equal(error?.code, failureCode);
    assert.ok(includesCause(error, injected));
    assert.equal(fs.existsSync(target), timing === 'depois');
    if (timing === 'depois') assert.deepEqual(fs.readFileSync(target), partial);
    assert.ok(collectErrorDiagnostics(error).preservedPaths.some(path => path === file || path === target));
  });
}

for (const kind of ['install', 'sync']) for (const frozen of [false, true]) {
  test(`${kind}: EEXIST real${frozen ? ' congelado' : ''} mantém arquivo humano no destino`, { timeout: 120000 }, t => {
    const root = fixture(t), { file, run } = newFileOperation(root, kind), target = join(root, file);
    const open = fs.openSync, bytes = Buffer.from('Destino humano.\n');
    let identity, collision;
    t.mock.method(fs, 'openSync', (path, flags, ...args) => {
      if (!identity && path === target && flags === 'wx') {
        const fd = open(path, flags, 0o600);
        try { fs.writeFileSync(fd, bytes); identity = fs.fstatSync(fd, { bigint: true }); } finally { fs.closeSync(fd); }
        try { return open(path, flags, ...args); } catch (error) { collision = error; throw frozen ? Object.freeze(error) : error; }
      }
      return open(path, flags, ...args);
    });
    syncBuiltinESMExports();
    let failure; try { run(); } catch (error) { failure = error; }
    assert.equal(collision?.code, 'EEXIST'); assert.equal(failure?.code, 'EEXIST');
    assert.ok(includesCause(failure, collision));
    assert.deepEqual(fs.readFileSync(target), bytes);
    const after = fs.statSync(target, { bigint: true });
    assert.equal(after.ino, identity.ino); assert.equal(after.dev, identity.dev); assert.equal(after.mode, identity.mode);
    assert.ok(collectErrorDiagnostics(failure).preservedPaths.some(path => path === target || path === file));
  });
}

function updatedFileOperation(root, kind) {
  if (kind === 'install') {
    put(root, 'AGENTS.md', '# Equipe\n');
    const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
    return { target: join(root, 'AGENTS.md'), run: () => applyPlan(plan) };
  }
  const { file, run } = newFileOperation(root, kind);
  run();
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Atualizada.\n---\n\n# Demo\n');
  return { target: join(root, file), run };
}

function observeReplacement(t, target, callback) {
  if (process.platform === 'win32') {
    const original = childProcess.spawnSync;
    t.mock.method(childProcess, 'spawnSync', (program, args, options) => {
      const replace = () => original(program, args, options);
      return options?.env?.AGENTDEVKIT_DESTINATION === target
        ? callback(options.env.AGENTDEVKIT_REPLACEMENT, target, replace) : replace();
    });
  } else {
    const original = fs.renameSync;
    t.mock.method(fs, 'renameSync', (from, to) => {
      const replace = () => original(from, to);
      return to === target ? callback(from, to, replace) : replace();
    });
  }
}

for (const kind of ['install', 'sync']) for (const timing of ['antes', 'depois']) for (const frozen of [false, true]) {
  test(`${kind}: erro ${timing} da substituição${frozen ? ' congelado' : ''} preserva o temporário`, { timeout: 120000 }, t => {
    const root = fixture(t), { target, run: operation } = updatedFileOperation(root, kind);
    const bytes = Buffer.from('Temporário humano no rename.\n'); let temporary, human, injectedError;
    observeReplacement(t, target, (from, to, replace) => {
      if (!temporary && to === target) {
        temporary = from;
        if (timing === 'depois') replace(); else fs.unlinkSync(from);
        fs.writeFileSync(from, bytes, { flag: 'wx', mode: 0o600 });
        const s = fs.statSync(from, { bigint: true }); human = { dev: s.dev, ino: s.ino, mode: s.mode & 0o777n };
        injectedError = Object.assign(new Error('falha sintética no rename'), { code: 'EIO' });
        throw frozen ? Object.freeze(injectedError) : injectedError;
      }
      return replace();
    });
    syncBuiltinESMExports();
    let error; try { operation(); } catch (failure) { error = failure; }
    assert.ok(temporary && human, 'fixture deve substituir o temporário durante rename');
    assert.equal(error?.code, 'EIO'); assert.ok(fs.existsSync(temporary));
    assert.ok(includesCause(error, injectedError), 'erro original deve permanecer acessível');
    assert.deepEqual(fs.readFileSync(temporary), bytes);
    const s = fs.statSync(temporary, { bigint: true });
    assert.deepEqual({ dev: s.dev, ino: s.ino, mode: s.mode & 0o777n }, human);
    assert.ok(collectErrorDiagnostics(error).preservedPaths.includes(temporary));
  });
}

for (const kind of ['install', 'sync']) for (const scenario of ['colisão', 'falha-parcial', 'falha-congelada']) {
  test(`${kind}: criação temporária ${scenario} preserva caminho de resultado incerto`, { timeout: 120000 }, t => {
    const root = fixture(t), { target: destination, run: operation } = updatedFileOperation(root, kind);
    const original = fs.writeFileSync, bytes = Buffer.from('Conteúdo existente ou gravação parcial.\n');
    const expected = path => typeof path === 'string' && (kind === 'install'
      ? path.includes(`${sep}stage${sep}${relative(root, destination)}.agentdevkit-`) : syncTemporaryFor(path, destination, root));
    let target, identity;
    t.mock.method(fs, 'writeFileSync', (path, data, options) => {
      if (!target && expected(path)) {
        target = path;
        original(path, bytes, { flag: 'wx', mode: 0o600 });
        const item = fs.statSync(path, { bigint: true });
        identity = { dev: item.dev, ino: item.ino };
        if (scenario !== 'colisão') {
          const failure = Object.assign(new Error('falha sintética após criação'), { code: 'EIO' });
          throw scenario === 'falha-congelada' ? Object.freeze(failure) : failure;
        }
      }
      return original(path, data, options);
    });
    syncBuiltinESMExports();
    let failure;
    try { operation(); } catch (error) { failure = error; }
    assert.ok(target && identity, 'fixture deve interceptar criação exclusiva');
    assert.equal(failure?.code, scenario === 'colisão' ? 'EEXIST' : 'EIO');
    assert.ok(fs.existsSync(target), 'limpeza removeu o caminho com resultado incerto');
    const current = fs.statSync(target, { bigint: true });
    assert.deepEqual(fs.readFileSync(target), bytes);
    assert.equal(current.dev, identity.dev);
    assert.equal(current.ino, identity.ino);
    assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes(target), 'diagnóstico deve indicar o caminho preservado');
  });
}

function planningStage(path) {
  if (typeof path !== 'string' || !isAbsolute(path)) return null;
  const base = fs.realpathSync(tmpdir());
  const [name] = relative(base, path).split(sep);
  return /^agentdevkit-[a-zA-Z0-9-]+$/.test(name) ? join(base, name) : null;
}

for (const code of ['EEXIST', 'EIO']) for (const frozen of [false, true]) {
  test(`sync privado preserva estágio, bytes parciais e causa ${code}${frozen ? ' congelada' : ''}`, { timeout: 120000 }, t => {
    const root = fixture(t), bytes = Buffer.from('Resultado parcial no estágio.\n');
    put(root, '.gitignore', '# regra humana\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '--', '.gitignore']).status, 0);
    const index = fs.readFileSync(join(root, '.git/index')), ignore = fs.readFileSync(join(root, '.gitignore'));
    const open = fs.openSync;
    let stage, selected, primary, identity;
    t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); if (stage) fs.rmSync(stage, { recursive: true, force: true }); });
    t.mock.method(fs, 'openSync', (path, flags, ...args) => {
      if (!selected && flags === 'wx' && planningStage(path) && /SKILL\.md$/.test(path)) {
        stage = planningStage(path); selected = path;
        const fd = open(path, flags, ...args);
        try { fs.writeFileSync(fd, bytes); identity = fs.fstatSync(fd, { bigint: true }); } finally { fs.closeSync(fd); }
        primary = Object.assign(new Error('Falha na criação dentro do estágio.'), { code });
        throw frozen ? Object.freeze(primary) : primary;
      }
      return open(path, flags, ...args);
    });
    syncBuiltinESMExports();
    let failure;
    try { planInstallation({ target: root, mode: 'init', clients: ['codex'] }); } catch (error) { failure = error; }
    assert.ok(stage && selected, 'fixture deve atingir o sync privado');
    assert.equal(failure?.code, code); assert.ok(includesCause(failure, primary));
    assert.deepEqual(fs.readFileSync(selected), bytes);
    assert.equal(fs.statSync(selected, { bigint: true }).ino, identity.ino);
    const paths = collectErrorDiagnostics(failure).preservedPaths;
    assert.ok(paths.includes(stage)); assert.ok(paths.includes(selected)); assert.ok(paths.every(isAbsolute));
    assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
    assert.deepEqual(fs.readFileSync(join(root, '.gitignore')), ignore);
  });
}

test('diagnóstico truncado no sync preserva estágio mesmo sem lista de caminhos', { timeout: 120000 }, t => {
  const root = fixture(t), originalRead = fs.readFileSync;
  let stage, sentinel;
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); if (stage) fs.rmSync(stage, { recursive: true, force: true }); });
  t.mock.method(fs, 'readFileSync', (path, ...args) => {
    if (!sentinel && planningStage(path) && path.endsWith(`${sep}espelhos.conf`)) {
      stage = planningStage(path); sentinel = join(stage, 'sentinela.txt');
      fs.writeFileSync(sentinel, 'preservar\n', { flag: 'wx' });
      throw Object.assign(new Error('diagnóstico sintético incompleto'), { code: 'EIO', diagnosticsTruncated: true });
    }
    return originalRead(path, ...args);
  });
  syncBuiltinESMExports();
  let failure;
  try { planInstallation({ target: root, mode: 'init', clients: ['codex'] }); } catch (error) { failure = error; }
  assert.equal(failure?.code, 'EIO'); assert.ok(stage && sentinel);
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'preservar\n');
  const diagnostics = collectErrorDiagnostics(failure);
  assert.equal(diagnostics.truncated, true); assert.ok(diagnostics.preservedPaths.includes(stage));
});

for (const scenario of ['sem-arquivo', 'colisão', 'parcial']) test(`sync não restaura destino após falha pré-publicação: ${scenario}`, { timeout: 120000 }, t => {
  const root = fixture(t);
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
  }
  const skill = '.pbai4devs/skills/demo/SKILL.md';
  put(root, skill, '---\nname: demo\ndescription: Primeira descrição.\n---\n\n# Demo\n');
  synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  put(root, skill, '---\nname: demo\ndescription: Descrição alterada.\n---\n\n# Demo\n');
  const target = join(root, '.claude/skills/demo/SKILL.md'), before = fs.readFileSync(target);
  const previous = fs.statSync(target, { bigint: true }), originalWrite = fs.writeFileSync, originalRemove = fs.rmSync;
  const human = Buffer.from('Substituição humana antes da remoção.\n');
  let temporary, attemptedRemoval = false, injected;
  t.mock.method(fs, 'writeFileSync', (path, content, options) => {
    if (!temporary && typeof path === 'string' && syncTemporaryFor(path, target, root)) {
      temporary = path;
      if (scenario !== 'sem-arquivo') originalWrite(path, 'arquivo temporário incerto\n', { flag: 'wx' });
      if (scenario === 'colisão') return originalWrite(path, content, options);
      throw Object.assign(new Error('falha antes de publicar'), { code: scenario === 'parcial' ? 'EIO' : 'EACCES' });
    }
    return originalWrite(path, content, options);
  });
  t.mock.method(fs, 'rmSync', (path, ...args) => {
    if (temporary && path === target && !attemptedRemoval) {
      attemptedRemoval = true;
      fs.unlinkSync(target); originalWrite(target, human, { flag: 'wx' });
      const info = fs.statSync(target, { bigint: true });
      injected = { dev: info.dev, ino: info.ino };
    }
    return originalRemove(path, ...args);
  });
  syncBuiltinESMExports();
  let failure;
  try { synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }); } catch (error) { failure = error; }
  assert.equal(failure?.code, scenario === 'colisão' ? 'EEXIST' : scenario === 'parcial' ? 'EIO' : 'EACCES');
  assert.ok(temporary, 'fixture deve falhar antes da publicação');
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes(temporary));
  if (scenario !== 'sem-arquivo') assert.equal(fs.readFileSync(temporary, 'utf8'), 'arquivo temporário incerto\n');
  if (injected) {
    assert.ok(fs.existsSync(target), 'restauração removeu uma substituição humana');
    const current = fs.statSync(target, { bigint: true });
    assert.deepEqual(fs.readFileSync(target), human);
    assert.equal(current.dev, injected.dev); assert.equal(current.ino, injected.ino);
  } else {
    assert.equal(attemptedRemoval, false, 'destino inalterado não deve ser restaurado');
    const current = fs.statSync(target, { bigint: true });
    assert.deepEqual(fs.readFileSync(target), before);
    assert.equal(current.dev, previous.dev); assert.equal(current.ino, previous.ino);
  }
});

for (const variant of ['iguais', 'diferentes', 'planejados']) test(`sync preserva substituição de bytes ${variant} durante falha pré-publicação`, { timeout: 120000 }, t => {
  const root = fixture(t);
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
  }
  const skill = '.pbai4devs/skills/demo/SKILL.md';
  put(root, skill, '---\nname: demo\ndescription: Primeira descrição.\n---\n\n# Demo\n');
  synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  put(root, skill, '---\nname: demo\ndescription: Descrição alterada.\n---\n\n# Demo\n');
  const target = join(root, '.claude/skills/demo/SKILL.md'), before = fs.readFileSync(target);
  const mode = fs.statSync(target).mode & 0o777, originalWrite = fs.writeFileSync, originalRemove = fs.rmSync;
  let bytes = variant === 'iguais' ? before : Buffer.from('Outra edição humana.\n');
  let replacement, removed = false;
  t.mock.method(fs, 'writeFileSync', (path, content, options) => {
    if (!replacement && typeof path === 'string' && syncTemporaryFor(path, target, root)) {
      if (variant === 'planejados') bytes = Buffer.from(content);
      fs.unlinkSync(target); originalWrite(target, bytes, { flag: 'wx', mode }); fs.chmodSync(target, mode);
      const item = fs.statSync(target, { bigint: true });
      replacement = { dev: item.dev, ino: item.ino, mode: item.mode & 0o777n };
      throw Object.assign(new Error('falha antes de publicar'), { code: 'EACCES' });
    }
    return originalWrite(path, content, options);
  });
  t.mock.method(fs, 'rmSync', (path, ...args) => { if (path === target) removed = true; return originalRemove(path, ...args); });
  syncBuiltinESMExports();
  let failure;
  try { synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }); } catch (error) { failure = error; }
  assert.match(failure?.message || '', /falha antes de publicar/);
  assert.ok(replacement, 'fixture deve substituir o destino antes de retornar erro');
  assert.equal(removed, false, 'destino substituído não deve ser removido');
  if (variant !== 'iguais') assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes('.claude/skills/demo/SKILL.md'));
  assert.ok(fs.existsSync(target));
  const item = fs.statSync(target, { bigint: true });
  assert.deepEqual(fs.readFileSync(target), bytes);
  assert.equal(item.dev, replacement.dev); assert.equal(item.ino, replacement.ino); assert.equal(item.mode & 0o777n, replacement.mode);
});

// Windows writes through the original file handle. Its staged file has
// no POSIX chmod step.
const syncMetadataChecks = process.platform === 'win32' ? ['lstat'] : ['chmod', 'lstat'];
for (const point of syncMetadataChecks) for (const replacement of ['inalterado', 'planejado']) {
  test(`sync preserva destino ${replacement} quando ${point} do temporário falha antes da publicação`, { timeout: 120000 }, t => {
    const root = fixture(t);
    put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
    for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
      put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
    }
    const skill = '.pbai4devs/skills/demo/SKILL.md';
    put(root, skill, '---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
    synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
    put(root, skill, '---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
    const target = join(root, '.claude/skills/demo/SKILL.md'), before = fs.readFileSync(target);
    const originalWrite = fs.writeFileSync, originalChmod = fs.chmodSync, originalLstat = fs.lstatSync, originalRemove = fs.rmSync;
    const beforeStat = fs.statSync(target, { bigint: true }), mode = Number(beforeStat.mode & 0o777n);
    let temporary, planned, expected = { bytes: before, dev: beforeStat.dev, ino: beforeStat.ino }, failed = false, removed = false;
    t.mock.method(fs, 'writeFileSync', (path, content, options) => {
      if (!temporary && typeof path === 'string' && syncTemporaryFor(path, target, root)) { temporary = path; planned = Buffer.from(content); }
      return originalWrite(path, content, options);
    });
    const fail = path => {
      if (path !== temporary || failed) return;
      failed = true;
      if (replacement === 'planejado') {
        fs.unlinkSync(target); originalWrite(target, planned, { flag: 'wx', mode }); originalChmod(target, mode);
        const item = fs.statSync(target, { bigint: true }); expected = { bytes: planned, dev: item.dev, ino: item.ino };
      }
      throw Object.assign(new Error(`falha de ${point} antes de publicar`), { code: 'EACCES' });
    };
    t.mock.method(fs, 'chmodSync', (path, ...args) => { if (point === 'chmod') fail(path); return originalChmod(path, ...args); });
    t.mock.method(fs, 'lstatSync', (path, ...args) => { if (point === 'lstat') fail(path); return originalLstat(path, ...args); });
    t.mock.method(fs, 'rmSync', (path, ...args) => { if (path === target) removed = true; return originalRemove(path, ...args); });
    syncBuiltinESMExports();
    let error;
    try { synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }); } catch (failure) { error = failure; }
    assert.ok(temporary && failed, 'fixture deve falhar antes de publicar');
    assert.equal(error?.code, 'EACCES');
    assert.equal(removed, false, 'rollback não deve remover o destino');
    const item = fs.statSync(target, { bigint: true });
    assert.deepEqual(fs.readFileSync(target), expected.bytes);
    assert.equal(item.dev, expected.dev); assert.equal(item.ino, expected.ino);
    if (replacement === 'planejado') assert.ok(collectErrorDiagnostics(error).preservedPaths.includes('.claude/skills/demo/SKILL.md'));
  });
}

for (const point of syncMetadataChecks) for (const errorKind of ['normal', 'congelado']) test(`sync preserva temporário substituído quando ${point} falha com erro ${errorKind} antes da publicação`, { timeout: 120000 }, t => {
  const root = fixture(t);
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
  }
  const skill = '.pbai4devs/skills/demo/SKILL.md';
  put(root, skill, '---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
  synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  put(root, skill, '---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
  const target = join(root, '.claude/skills/demo/SKILL.md'), before = fs.readFileSync(target);
  const originalWrite = fs.writeFileSync, originalChmod = fs.chmodSync, originalLstat = fs.lstatSync;
  const bytes = Buffer.from('Arquivo humano no nome temporário.\n');
  let temporary, human, failed = false;
  t.mock.method(fs, 'writeFileSync', (path, content, options) => {
    if (!temporary && typeof path === 'string' && syncTemporaryFor(path, target, root)) temporary = path;
    return originalWrite(path, content, options);
  });
  const fail = path => {
    if (path !== temporary || failed) return;
    failed = true; fs.unlinkSync(path); originalWrite(path, bytes, { flag: 'wx', mode: 0o600 });
    const item = fs.statSync(path, { bigint: true }); human = { dev: item.dev, ino: item.ino };
    const failure = Object.assign(new Error(`falha de ${point} antes de publicar`), { code: 'EACCES' });
    throw errorKind === 'congelado' ? Object.freeze(failure) : failure;
  };
  t.mock.method(fs, 'chmodSync', (path, ...args) => { if (point === 'chmod') fail(path); return originalChmod(path, ...args); });
  t.mock.method(fs, 'lstatSync', (path, ...args) => { if (point === 'lstat') fail(path); return originalLstat(path, ...args); });
  syncBuiltinESMExports();
  let error;
  try { synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }); } catch (failure) { error = failure; }
  assert.ok(temporary && human && failed, 'fixture deve substituir temporário antes da falha');
  assert.equal(error?.code, 'EACCES');
  assert.ok(fs.existsSync(temporary), 'temporário substituído deve ser preservado');
  const item = fs.statSync(temporary, { bigint: true });
  assert.deepEqual(fs.readFileSync(temporary), bytes);
  assert.equal(item.dev, human.dev); assert.equal(item.ino, human.ino);
  assert.ok(collectErrorDiagnostics(error).preservedPaths.includes(temporary));
  assert.deepEqual(fs.readFileSync(target), before);
});

for (const point of ['chmod', process.platform === 'win32' ? 'substituição nativa' : 'lstat']) for (const errorKind of ['normal', 'congelado']) test(`instalador preserva temporário substituído quando ${point} falha com erro ${errorKind} antes da publicação`, { timeout: 120000 }, t => {
  const root = fixture(t), target = join(root, 'AGENTS.md');
  put(root, 'AGENTS.md', '# Instruções humanas\n');
  const before = fs.readFileSync(target), plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  assert.ok(plan.changes.some(change => change.path === 'AGENTS.md' && change.action === 'update'));
  const originalWrite = fs.writeFileSync, originalChmod = fs.chmodSync, originalLstat = fs.lstatSync;
  const bytes = Buffer.from('Arquivo humano no nome temporário.\n');
  let temporary, human, failed = false;
  t.mock.method(fs, 'writeFileSync', (path, content, options) => {
    if (!temporary && typeof path === 'string' && path.includes(`${sep}stage${sep}${relative(root, target)}.agentdevkit-`)) temporary = path;
    return originalWrite(path, content, options);
  });
  const fail = path => {
    if (path !== temporary || failed) return;
    failed = true; fs.unlinkSync(path); originalWrite(path, bytes, { flag: 'wx', mode: 0o600 });
    const item = fs.statSync(path, { bigint: true }); human = { dev: item.dev, ino: item.ino };
    const failure = Object.assign(new Error(`falha de ${point} antes de publicar`), { code: 'EACCES' });
    throw errorKind === 'congelado' ? Object.freeze(failure) : failure;
  };
  t.mock.method(fs, 'chmodSync', (path, ...args) => { if (point === 'chmod') fail(path); return originalChmod(path, ...args); });
  t.mock.method(fs, 'lstatSync', (path, ...args) => { if (point === 'lstat') fail(path); return originalLstat(path, ...args); });
  if (point === 'substituição nativa') observeReplacement(t, target, (source, destination, publish) => { fail(source); return publish(); });
  syncBuiltinESMExports();
  let error;
  try { applyPlan(plan); } catch (failure) { error = failure; }
  assert.ok(temporary && human && failed, 'fixture deve substituir temporário antes da falha');
  assert.equal(error?.code, 'EACCES');
  assert.ok(fs.existsSync(temporary), 'temporário substituído deve ser preservado');
  const item = fs.statSync(temporary, { bigint: true });
  assert.deepEqual(fs.readFileSync(temporary), bytes);
  assert.equal(item.dev, human.dev); assert.equal(item.ino, human.ino);
  assert.ok(collectErrorDiagnostics(error).preservedPaths.includes(temporary));
  assert.deepEqual(fs.readFileSync(target), before);
});

for (const failingRead of [1, 2]) test(`sync conserva erro original quando leitura ${failingRead} após falha também falharia`, { timeout: 120000 }, t => {
  const root = fixture(t);
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
  }
  const skill = '.pbai4devs/skills/demo/SKILL.md';
  put(root, skill, '---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
  synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  put(root, skill, '---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
  const target = join(root, '.claude/skills/demo/SKILL.md'), originalWrite = fs.writeFileSync, originalRead = fs.readFileSync;
  const primary = Object.assign(new Error('falha inicial do temporário'), { code: 'EACCES' });
  let temporary, reads = 0;
  t.mock.method(fs, 'writeFileSync', (path, content, options) => {
    if (!temporary && typeof path === 'string' && syncTemporaryFor(path, target, root)) { temporary = path; throw primary; }
    return originalWrite(path, content, options);
  });
  t.mock.method(fs, 'readFileSync', (path, ...args) => {
    if (temporary && path === target && ++reads === failingRead) throw Object.assign(new Error('falha secundária de leitura'), { code: 'EIO' });
    return originalRead(path, ...args);
  });
  syncBuiltinESMExports();
  let failure;
  try { synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }); } catch (error) { failure = error; }
  assert.ok(temporary, 'fixture deve atingir falha inicial');
  assert.equal(failure?.code, 'EACCES');
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes(temporary));
  assert.equal(reads, 0, 'nenhuma leitura pública após a falha');
  assert.ok(includesCause(failure, primary));
  assert.equal(failure.recovery.status, 'pending');
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes('.claude/skills/demo/SKILL.md'));
});

for (const variant of ['iguais', 'diferentes']) test(`sync conserva histórico de publicação anterior com substituição de bytes ${variant}`, { timeout: 120000 }, t => {
  const root = fixture(t);
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
  }
  const oldSkill = '.pbai4devs/skills/zeta/SKILL.md', newSkill = '.pbai4devs/skills/alfa/SKILL.md';
  put(root, oldSkill, '---\nname: zeta\ndescription: Antiga.\n---\n\n# Zeta\n');
  synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  put(root, oldSkill, '---\nname: zeta\ndescription: Alterada.\n---\n\n# Zeta\n');
  put(root, newSkill, '---\nname: alfa\ndescription: Nova.\n---\n\n# Alfa\n');
  const first = join(root, '.claude/skills/alfa/SKILL.md'), second = join(root, '.claude/skills/zeta/SKILL.md');
  const originalWrite = fs.writeFileSync;
  let published = false, replacement, failed = false;
  t.mock.method(fs, 'writeFileSync', (path, content, options) => {
    if (!failed && syncTemporaryFor(path, second, root)) {
      published = fs.existsSync(first); failed = true; assert.equal(published, true, 'primeira publicação deve preceder a falha');
      const current = fs.readFileSync(first), mode = fs.statSync(first).mode & 0o777;
      const bytes = variant === 'iguais' ? current : Buffer.from('Outra edição humana.\n');
      fs.unlinkSync(first); originalWrite(first, bytes, { flag: 'wx', mode }); fs.chmodSync(first, mode);
      const item = fs.statSync(first, { bigint: true });
      replacement = { bytes, dev: item.dev, ino: item.ino, mode: item.mode & 0o777n };
      throw Object.assign(new Error('falha antes da segunda publicação'), { code: 'EACCES' });
    }
    return originalWrite(path, content, options);
  });
  syncBuiltinESMExports();
  let failure;
  try { synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} }); } catch (error) { failure = error; }
  assert.ok(published && failed && replacement, 'fixture deve executar ambos os eventos');
  assert.equal(failure?.code, 'EACCES');
  assert.ok(fs.existsSync(first), 'edição humana em publicação anterior deve ser preservada');
  const item = fs.statSync(first, { bigint: true });
  assert.deepEqual(fs.readFileSync(first), replacement.bytes);
  assert.equal(item.dev, replacement.dev); assert.equal(item.ino, replacement.ino); assert.equal(item.mode & 0o777n, replacement.mode);
  assert.ok(collectErrorDiagnostics(failure).preservedPaths.includes('.claude/skills/alfa/SKILL.md'));
});

function put(root, path, bytes) {
  const file = join(root, path);
  fs.mkdirSync(dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
}

for (const action of ['update', 'remove']) for (const force of [false, true]) {
  test(`sync preserva hardlink humano em ${action} de referência gerenciada (force=${force})`, { timeout: 120000 }, t => {
    const root = fixture(t), skill = '.pbai4devs/skills/demo/SKILL.md';
    put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
    for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
      put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
    }
    put(root, '.gitignore', '# humano\n'); put(root, 'staged.txt', 'original\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'staged.txt']).status, 0);
    fs.appendFileSync(join(root, 'staged.txt'), 'alteração humana\n');
    put(root, skill, '---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
    const options = { root, force, localIgnores: false, generateEntrypoints: false, output() {} };
    synchronize(options);
    const target = join(root, '.claude/skills/demo/SKILL.md'), human = join(root, 'humano.md');
    try { fs.linkSync(target, human); }
    catch (error) {
      if (['ENOTSUP', 'EOPNOTSUPP', 'ENOSYS'].includes(error.code) || process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) { t.skip(`Hardlink indisponível (${error.code}).`); return; }
      throw error;
    }
    const original = fs.readFileSync(target), before = fs.statSync(target, { bigint: true });
    assert.ok(before.nlink >= 2n, 'fixture deve manter dois nomes para o mesmo inode');
    const protectedFiles = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'staged.txt'];
    const snapshots = new Map(protectedFiles.map(path => [path, fs.readFileSync(join(root, path))]));
    if (action === 'update') put(root, skill, '---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
    else fs.rmSync(join(root, skill));
    assert.throws(() => synchronize(options), error => error.code === 'E_PROTECTED_METADATA' && error.path === '.claude/skills/demo/SKILL.md');
    const after = fs.statSync(target, { bigint: true }), humanAfter = fs.statSync(human, { bigint: true });
    assert.deepEqual(fs.readFileSync(target), original); assert.deepEqual(fs.readFileSync(human), original);
    assert.equal(after.ino, before.ino); assert.equal(humanAfter.ino, before.ino); assert.equal(after.dev, before.dev); assert.equal(humanAfter.dev, before.dev);
    for (const [path, contents] of snapshots) assert.deepEqual(fs.readFileSync(join(root, path)), contents);
  });
}

test('sync sem alterações conserva referência com hardlink humano', { timeout: 120000 }, t => {
  const root = fixture(t);
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
  }
  put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
  const options = { root, localIgnores: false, generateEntrypoints: false, output() {} };
  synchronize(options);
  const target = join(root, '.claude/skills/demo/SKILL.md'), human = join(root, 'humano.md');
  try { fs.linkSync(target, human); }
  catch (error) {
    if (['ENOTSUP', 'EOPNOTSUPP', 'ENOSYS'].includes(error.code) || process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) { t.skip(`Hardlink indisponível (${error.code}).`); return; }
    throw error;
  }
  const before = fs.statSync(target, { bigint: true }), contents = fs.readFileSync(target);
  assert.equal(synchronize(options).exitCode, 0);
  const after = fs.statSync(target, { bigint: true }), humanAfter = fs.statSync(human, { bigint: true });
  assert.equal(after.ino, before.ino); assert.equal(humanAfter.ino, before.ino);
  assert.equal(after.dev, before.dev); assert.equal(humanAfter.dev, before.dev);
  assert.deepEqual(fs.readFileSync(target), contents); assert.deepEqual(fs.readFileSync(human), contents);
});

test('sync recusa hardlink criado após verificação inicial e antes da publicação', { timeout: 120000 }, t => {
  const root = fixture(t), skill = '.pbai4devs/skills/demo/SKILL.md';
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
  }
  put(root, '.gitignore', '# humano\n'); put(root, 'staged.txt', 'staged\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'staged.txt']).status, 0);
  fs.appendFileSync(join(root, 'staged.txt'), 'unstaged\n');
  put(root, skill, '---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
  const options = { root, localIgnores: false, generateEntrypoints: false, output() {} };
  synchronize(options);
  const target = join(root, '.claude/skills/demo/SKILL.md'), human = join(root, 'humano.md');
  try { fs.linkSync(target, human); fs.unlinkSync(human); }
  catch (error) {
    if (['ENOTSUP', 'EOPNOTSUPP', 'ENOSYS'].includes(error.code) || process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) { t.skip(`Hardlink indisponível (${error.code}).`); return; }
    throw error;
  }
  const original = fs.readFileSync(target), identity = fs.statSync(target, { bigint: true });
  const index = fs.readFileSync(join(root, '.git/index')), staged = fs.readFileSync(join(root, 'staged.txt'));
  put(root, skill, '---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
  const write = fs.writeFileSync; let injected = false;
  t.mock.method(fs, 'writeFileSync', (path, ...args) => {
    const result = write(path, ...args);
    if (!injected && typeof path === 'string' && syncTemporaryFor(path, target, root)) {
      fs.linkSync(target, human); injected = true;
    }
    return result;
  });
  syncBuiltinESMExports();
  let error; try { synchronize(options); } catch (failure) { error = failure; }
  t.mock.restoreAll(); syncBuiltinESMExports();
  assert.ok(injected, 'fixture deve criar o hardlink após a verificação inicial');
  assert.equal(error?.code, 'E_PROTECTED_METADATA'); assert.equal(error?.path, '.claude/skills/demo/SKILL.md');
  assert.deepEqual(fs.readFileSync(target), original); assert.deepEqual(fs.readFileSync(human), original);
  assert.equal(fs.statSync(target, { bigint: true }).ino, identity.ino);
  assert.equal(fs.statSync(human, { bigint: true }).ino, identity.ino);
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(fs.readFileSync(join(root, 'staged.txt')), staged);
});

test('sync recusa hardlink criado após verificação inicial e antes da remoção', { timeout: 120000 }, t => {
  const root = fixture(t), skill = '.pbai4devs/skills/demo/SKILL.md';
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
  }
  put(root, '.gitignore', '# humano\n'); put(root, 'staged.txt', 'staged\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'staged.txt']).status, 0);
  put(root, skill, '---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
  const options = { root, localIgnores: false, generateEntrypoints: false, output() {} };
  synchronize(options);
  const target = join(root, '.claude/skills/demo/SKILL.md'), human = join(root, 'humano.md');
  try { fs.linkSync(target, human); fs.unlinkSync(human); }
  catch (error) {
    if (['ENOTSUP', 'EOPNOTSUPP', 'ENOSYS'].includes(error.code) || process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) { t.skip(`Hardlink indisponível (${error.code}).`); return; }
    throw error;
  }
  const original = fs.readFileSync(target), identity = fs.statSync(target, { bigint: true });
  const index = fs.readFileSync(join(root, '.git/index')); fs.rmSync(join(root, skill));
  const lstat = fs.lstatSync; let injected = false;
  t.mock.method(fs, 'lstatSync', (path, ...args) => {
    if (!injected && path === target && new Error().stack.includes('mutate')) { fs.linkSync(target, human); injected = true; }
    return lstat(path, ...args);
  });
  syncBuiltinESMExports();
  let error; try { synchronize(options); } catch (failure) { error = failure; }
  t.mock.restoreAll(); syncBuiltinESMExports();
  assert.ok(injected, 'fixture deve criar o hardlink após a verificação inicial');
  assert.equal(error?.code, 'E_PROTECTED_METADATA'); assert.equal(error?.path, '.claude/skills/demo/SKILL.md');
  assert.deepEqual(fs.readFileSync(target), original); assert.deepEqual(fs.readFileSync(human), original);
  assert.equal(fs.statSync(target, { bigint: true }).ino, identity.ino);
  assert.equal(fs.statSync(human, { bigint: true }).ino, identity.ino);
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
});

for (const action of ['update', 'remove']) {
  test(`instalador preserva hardlink humano em ${action}`, { timeout: 120000 }, t => {
    const root = fixture(t), target = join(root, 'gerenciado.txt'), human = join(root, 'humano.txt');
    put(root, '.gitignore', '# humano\n'); put(root, 'staged.txt', 'staged\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'staged.txt']).status, 0);
    fs.appendFileSync(join(root, 'staged.txt'), 'unstaged\n');
    fs.writeFileSync(target, 'original\n');
    try { fs.linkSync(target, human); }
    catch (error) {
      if (['ENOTSUP', 'EOPNOTSUPP', 'ENOSYS'].includes(error.code) || process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) { t.skip(`Hardlink indisponível (${error.code}).`); return; }
      throw error;
    }
    const before = fs.readFileSync(target), info = fs.statSync(target, { bigint: true });
    assert.ok(info.nlink >= 2n);
    const paths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'staged.txt'];
    const snapshots = new Map(paths.map(path => [path, fs.readFileSync(join(root, path))]));
    const plan = { target: root, canApply: true, language: 'pt', changes: [{ path: 'gerenciado.txt', action, content: action === 'remove' ? null : Buffer.from('novo\n'), beforeHash: createHash('sha256').update(before).digest('hex') }], localIgnore: { edits: [] }, retiredRoots: [] };
    assert.throws(() => applyPlan(plan), error => error.code === 'E_PROTECTED_METADATA' && error.path === 'gerenciado.txt');
    const after = fs.statSync(target, { bigint: true }), other = fs.statSync(human, { bigint: true });
    assert.equal(after.ino, info.ino); assert.equal(other.ino, info.ino);
    assert.equal(after.dev, info.dev); assert.equal(other.dev, info.dev);
    assert.deepEqual(fs.readFileSync(target), before); assert.deepEqual(fs.readFileSync(human), before);
    for (const [path, contents] of snapshots) assert.deepEqual(fs.readFileSync(join(root, path)), contents);
  });
}

test('instalador recusa hardlink criado após verificação inicial e antes da publicação', { timeout: 120000 }, t => {
  const root = fixture(t), target = join(root, 'gerenciado.txt'), human = join(root, 'humano.txt');
  put(root, '.gitignore', '# humano\n'); put(root, 'staged.txt', 'staged\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'staged.txt']).status, 0);
  fs.appendFileSync(join(root, 'staged.txt'), 'unstaged\n'); fs.writeFileSync(target, 'original\n');
  try { fs.linkSync(target, human); fs.unlinkSync(human); }
  catch (error) {
    if (['ENOTSUP', 'EOPNOTSUPP', 'ENOSYS'].includes(error.code) || process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) { t.skip(`Hardlink indisponível (${error.code}).`); return; }
    throw error;
  }
  const before = fs.readFileSync(target), identity = fs.statSync(target, { bigint: true });
  const index = fs.readFileSync(join(root, '.git/index')), staged = fs.readFileSync(join(root, 'staged.txt'));
  const plan = { target: root, canApply: true, language: 'pt', changes: [{ path: 'gerenciado.txt', action: 'update', content: Buffer.from('novo\n'), beforeHash: createHash('sha256').update(before).digest('hex') }], localIgnore: { edits: [] }, retiredRoots: [] };
  const write = fs.writeFileSync; let injected = false;
  t.mock.method(fs, 'writeFileSync', (path, ...args) => {
    const result = write(path, ...args);
    if (!injected && typeof path === 'string' && path.includes(`${sep}stage${sep}${relative(root, target)}.agentdevkit-`)) { fs.linkSync(target, human); injected = true; }
    return result;
  });
  syncBuiltinESMExports();
  let error; try { applyPlan(plan); } catch (failure) { error = failure; }
  t.mock.restoreAll(); syncBuiltinESMExports();
  assert.ok(injected); assert.equal(error?.code, 'E_PROTECTED_METADATA'); assert.equal(error?.path, 'gerenciado.txt');
  assert.deepEqual(fs.readFileSync(target), before); assert.deepEqual(fs.readFileSync(human), before);
  assert.equal(fs.statSync(target, { bigint: true }).ino, identity.ino); assert.equal(fs.statSync(human, { bigint: true }).ino, identity.ino);
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index); assert.deepEqual(fs.readFileSync(join(root, 'staged.txt')), staged);
});

for (const kind of ['install', 'sync']) for (const scenario of ['recriado', 'mesmo-inode']) {
  test(`${kind}: nome ${scenario} após rename de atualização não é removido na limpeza`, { timeout: 120000, skip: scenario === 'mesmo-inode' && process.platform === 'win32' ? 'A variante simula preservação do inode usando a publicação POSIX.' : false }, t => {
    const root = fixture(t);
    let target, operation;
    if (kind === 'install') {
      target = join(root, 'AGENTS.md');
      put(root, 'AGENTS.md', '# Instruções humanas\n');
      const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
      assert.ok(plan.changes.some(change => change.path === 'AGENTS.md' && change.action === 'update'));
      operation = () => applyPlan(plan);
    } else {
      put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
      for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
        put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
      }
      const skill = '.pbai4devs/skills/demo/SKILL.md';
      put(root, skill, '---\nname: demo\ndescription: Primeira descrição.\n---\n\n# Demo\n');
      synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
      put(root, skill, '---\nname: demo\ndescription: Descrição alterada.\n---\n\n# Demo\n');
      target = join(root, '.claude/skills/demo/SKILL.md');
      operation = () => synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
    }
    const bytes = Buffer.from('Arquivo humano criado após o rename.\n');
    let human;
    observeReplacement(t, target, (from, to, publish) => {
      const selected = to === target && !human;
      if (selected && scenario === 'mesmo-inode') { fs.unlinkSync(to); fs.linkSync(from, to); }
      const result = publish();
      if (selected) {
        if (scenario === 'recriado') {
          assert.equal(fs.existsSync(from), false, 'a fixture exige rename que retire o nome antigo');
          fs.writeFileSync(from, bytes, { flag: 'wx', mode: 0o600 });
        } else assert.equal(fs.existsSync(from), true, 'a fixture exige rename entre hardlinks do mesmo inode');
        const info = fs.statSync(from, { bigint: true });
        human = { path: from, bytes: fs.readFileSync(from), dev: info.dev, ino: info.ino, mode: info.mode & 0o777n };
      }
      return result;
    });
    syncBuiltinESMExports();
    operation();
    assert.ok(human, 'fixture deve recriar o nome após rename bem-sucedido');
    assert.ok(fs.existsSync(human.path), 'limpeza removeu arquivo criado depois do rename');
    const actual = fs.statSync(human.path, { bigint: true });
    assert.deepEqual(fs.readFileSync(human.path), human.bytes);
    assert.equal(actual.dev, human.dev);
    assert.equal(actual.ino, human.ino);
    assert.equal(actual.mode & 0o777n, human.mode);
  });
}

for (const [name, thrown] of [['undefined', undefined], ['null', null], ['false', false], ['zero', 0], ['empty', ''], ['nan', NaN], ['bigint', 0n]]) {
  test(`falha sem valor antes da publicação conserva temporário (${name})`, { timeout: 120000 }, t => {
    const root = fixture(t), target = join(root, 'saida.txt');
    put(root, '.gitignore', '# humano\n'); put(root, 'humano.txt', 'staged\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'humano.txt']).status, 0);
    fs.appendFileSync(join(root, 'humano.txt'), 'unstaged\n');
    const index = fs.readFileSync(join(root, '.git/index'));
    const human = fs.readFileSync(join(root, 'humano.txt'));
    const before = Buffer.from('antes\n'); put(root, 'saida.txt', before);
    const plan = { target: root, canApply: true, language: 'pt', changes: [{ path: 'saida.txt', action: 'update', content: Buffer.from('novo\n'), beforeHash: createHash('sha256').update(before).digest('hex'), beforeMode: fs.statSync(target).mode & 0o777 }], localIgnore: { edits: [] }, retiredRoots: [] };
    const write = fs.writeFileSync, lstat = fs.lstatSync, remove = fs.rmSync;
    let temporary, injected = false, removed = false;
    t.mock.method(fs, 'writeFileSync', (path, ...args) => {
      const result = write(path, ...args);
      if (typeof path === 'string' && path.includes(`${sep}stage${sep}${relative(root, target)}.agentdevkit-`)) temporary = path;
      return result;
    });
    t.mock.method(fs, 'lstatSync', (path, ...args) => {
      if (temporary && !injected && path === target && new Error().stack.includes('assertOriginal')) {
        injected = true; throw thrown;
      }
      return lstat(path, ...args);
    });
    t.mock.method(fs, 'rmSync', (path, ...args) => { if (path === temporary) removed = true; return remove(path, ...args); });
    syncBuiltinESMExports();
    let error;
    try { applyPlan(plan); } catch (failure) { error = failure; }
    t.mock.restoreAll(); syncBuiltinESMExports();
    assert.ok(injected && temporary && fs.existsSync(temporary)); assert.equal(removed, false);
    assert.ok(collectErrorDiagnostics(error).preservedPaths.includes(temporary));
    let current = error, found = false;
    for (let depth = 0; depth < 8 && current && typeof current === 'object'; depth++) {
      if (!Object.hasOwn(current, 'cause')) break;
      current = current.cause;
      if (Object.is(current, thrown)) { found = true; break; }
    }
    assert.equal(found, true); assert.deepEqual(fs.readFileSync(target), before);
    assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
    assert.deepEqual(fs.readFileSync(join(root, 'humano.txt')), human);
  });
}

for (const [name, thrown] of [['undefined', undefined], ['null', null], ['false', false], ['zero', 0], ['empty', ''], ['nan', NaN], ['bigint', 0n]]) {
  test(`sync: falha sem valor antes da publicação conserva temporário (${name})`, { timeout: 120000 }, t => {
    const root = fixture(t), { run } = updatedFileOperation(root, 'sync');
    put(root, '.gitignore', '# humano\n'); put(root, 'humano.txt', 'staged\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'humano.txt']).status, 0);
    fs.appendFileSync(join(root, 'humano.txt'), 'unstaged\n');
    const index = fs.readFileSync(join(root, '.git/index')), human = fs.readFileSync(join(root, 'humano.txt'));
    const write = fs.writeFileSync, lstat = fs.lstatSync, remove = fs.rmSync;
    let temporary, injected = false, removed = false;
    t.mock.method(fs, 'writeFileSync', (path, ...args) => {
      const result = write(path, ...args);
      if (!temporary && typeof path === 'string' && /\.sync\.[0-9a-f-]{36}$/i.test(path)) temporary = path;
      return result;
    });
    t.mock.method(fs, 'lstatSync', (path, ...args) => {
      if (temporary && !injected && path === temporary) { injected = true; throw thrown; }
      return lstat(path, ...args);
    });
    t.mock.method(fs, 'rmSync', (path, ...args) => { if (path === temporary) removed = true; return remove(path, ...args); });
    syncBuiltinESMExports();
    let error;
    try { run(); } catch (failure) { error = failure; }
    t.mock.restoreAll(); syncBuiltinESMExports();
    assert.ok(injected && temporary && fs.existsSync(temporary), 'temporário deve ser preservado');
    assert.equal(removed, false);
    assert.ok(collectErrorDiagnostics(error).preservedPaths.includes(temporary));
    let current = error, found = false;
    for (let depth = 0; depth < 8 && current && typeof current === 'object'; depth++) {
      if (!Object.hasOwn(current, 'cause')) break;
      current = current.cause;
      if (Object.is(current, thrown)) { found = true; break; }
    }
    assert.equal(found, true, 'causa original deve ser preservada');
    assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
    assert.deepEqual(fs.readFileSync(join(root, 'humano.txt')), human);
  });
}
