import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { applyPlan, planInstallation } from '../src/install.mjs';
import { explainError } from '../src/i18n.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { collectErrorDiagnostics, explainUnsupportedHardlink, markDiagnosticsBoundary, primaryDiagnosticError, withPotentialPartial, withUncertainPath } from '../.pbai4devs/scripts/lib/error-reporting.mjs';

const repository = fileURLToPath(new URL('..', import.meta.url));
const put = (root, path, value) => { const file = join(root, path); fs.mkdirSync(dirname(file), { recursive: true }); fs.writeFileSync(file, value); };

test('erro imutável mantém código, causa e caminho Git ao receber diagnóstico', () => {
  const cause = Object.freeze(Object.assign(new Error('falha sintética'), { code: 'E_NESTED_GIT', nestedGitPath: 'modulo', exitCode: 2 }));
  const error = withUncertainPath(cause, 'backup');
  assert.equal(error.cause, cause); assert.equal(error.code, 'E_NESTED_GIT');
  assert.equal(error.nestedGitPath, 'modulo'); assert.equal(error.exitCode, 2);
  assert.deepEqual(collectErrorDiagnostics(error).preservedPaths, ['backup']);
});

test('erro imutável mantém causa e comunica aplicação possivelmente parcial', () => {
  const cause = Object.freeze(Object.assign(new Error('falha sintética'), { code: 'EIO', exitCode: 2 }));
  const error = withPotentialPartial(cause);
  assert.equal(error.cause, cause); assert.equal(error.code, 'EIO'); assert.equal(error.exitCode, 2);
  assert.equal(collectErrorDiagnostics(error).possiblePartial, true);
});

for (const code of ['ENOTSUP', 'EOPNOTSUPP']) test(`erro imutável de hardlink conserva ${code} no reconhecimento`, () => {
  let reads = 0;
  const cause = new Error('sistema de arquivos sintético');
  Object.defineProperty(cause, 'code', { get() { return ++reads === 1 ? code : 'EIO'; } });
  Object.preventExtensions(cause);
  const error = explainUnsupportedHardlink(cause);
  assert.equal(reads, 1);
  assert.equal(error.code, code);
  assert.equal(error.cause, cause);
  assert.equal(error.hardlinkUnsupported, true);
});

for (const [name, wrap] of [
  ['caminho incerto', error => withUncertainPath(error, 'backup')],
  ['aplicação parcial', error => withPotentialPartial(error)],
]) test(`erro não extensível mantém causa quando mensagem muda: ${name}`, () => {
  let reads = 0;
  const cause = new Error();
  Object.defineProperty(cause, 'message', {
    get() { return ++reads === 1 ? 'falha sintética' : Symbol('mensagem alterada'); },
  });
  Object.preventExtensions(cause);
  const error = wrap(cause);
  assert.equal(reads, 1);
  assert.equal(error.message, 'falha sintética');
  assert.equal(error.cause, cause);
  if (name === 'caminho incerto') assert.deepEqual(collectErrorDiagnostics(error).preservedPaths, ['backup']);
  else assert.equal(collectErrorDiagnostics(error).possiblePartial, true);
});

test('causa primária atravessa apenas wrappers próprios e agregados sem entrar em ciclo', () => {
  const primary = Object.assign(new Error('falha primária sintética'), { code: 'EIO' });
  const aggregate = Object.freeze(new AggregateError([primary], 'falha agrupada'));
  const wrapper = withPotentialPartial(aggregate);
  assert.equal(primaryDiagnosticError(wrapper), primary);
  const arbitrary = new Error('fronteira externa', { cause: primary });
  assert.equal(primaryDiagnosticError(arbitrary), arbitrary);
  const boundary = markDiagnosticsBoundary(withPotentialPartial(Object.freeze(new Error('estágio', { cause: aggregate }))));
  assert.equal(primaryDiagnosticError(boundary), boundary);
  const cycle = new AggregateError([], 'ciclo'); cycle.errors.push(cycle);
  assert.equal(primaryDiagnosticError(cycle), cycle);
});

test('mensagens de erro parcial pedem revisão sem prometer ausência de alterações ou recomendar repetição', () => {
  for (const language of ['pt', 'en', 'es']) for (const code of ['E_GIT', 'E_CHANGED', 'E_UPGRADE', 'E_CONFIG_PARSE', 'E_LEGACY_PATH']) {
    const message = explainError(language, code, {}, { possiblePartial: true });
    assert.match(message, /revisão|review|revisión/i);
    assert.doesNotMatch(message, /nenhum arquivo|no files|no se modificaron|execute novamente|try again|ejecute de nuevo|\bupdate\b/i);
  }
  assert.match(explainError('pt', 'E_GIT', {}), /nenhum arquivo foi alterado/i);
});

for (const kind of ['install', 'sync']) for (const withBackup of [false, true]) {
  test(`${kind}: erro Git imutável preserva diagnóstico após publicação (backup=${withBackup})`, { timeout: 120000 }, t => {
    const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-recovery-diagnostic-')));
    t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
    assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
    put(root, '.gitignore', '# regra humana\n'); put(root, 'humano.txt', 'sentinela preparada\n');
    assert.equal(spawnSync('git', ['-C', root, 'add', '--', '.gitignore', 'humano.txt']).status, 0);
    const index = fs.readFileSync(join(root, '.git/index')), ignore = fs.readFileSync(join(root, '.gitignore'));
    let operation;
    if (kind === 'install') {
      if (withBackup) put(root, 'AGENTS.md', '# Instruções humanas\n');
      const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
      operation = () => applyPlan(plan);
    } else {
      put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
      for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(join(repository, '.pbai4devs/templates/gitignore', name)));
      put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Antes.\n---\n\n# Demo\n');
      const options = { root, force: true, localIgnores: false, generateEntrypoints: false, output() {} };
      if (withBackup) {
        synchronize(options);
        put(root, '.pbai4devs/skills/demo/SKILL.md', '---\nname: demo\ndescription: Depois.\n---\n\n# Demo\n');
      }
      operation = () => synchronize(options);
    }
    const cause = Object.freeze(Object.assign(new Error('falha Git sintética'), { code: 'E_NESTED_GIT', nestedGitPath: 'modulo-sintetico' }));
    const link = fs.linkSync, rename = fs.renameSync, stat = fs.lstatSync;
    let published = false, injected = false, failure;
    const record = (source, target, result) => {
      if (typeof source === 'string' && typeof target === 'string' && target.startsWith(root + sep)
        && !target.startsWith(join(root, '.agent-tests') + sep) && /(?:\.sync\.|\.agentdevkit-)[0-9a-f-]{36}$/i.test(source)) published = true;
      return result;
    };
    t.mock.method(fs, 'linkSync', (source, target, ...args) => record(source, target, link(source, target, ...args)));
    t.mock.method(fs, 'renameSync', (source, target, ...args) => record(source, target, rename(source, target, ...args)));
    t.mock.method(fs, 'lstatSync', (path, ...args) => {
      if (published && !injected && typeof path === 'string' && path.endsWith(`${sep}.git`) && path !== join(root, '.git')) { injected = true; throw cause; }
      return stat(path, ...args);
    });
    syncBuiltinESMExports();
    try { operation(); } catch (error) { failure = error; }
    finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
    assert.ok(published && injected && failure, 'a fixture deve falhar após uma publicação');
    assert.equal(failure.code, 'E_NESTED_GIT'); assert.equal(failure.cause, cause);
    const diagnostics = collectErrorDiagnostics(failure), paths = diagnostics.preservedPaths;
    assert.equal(diagnostics.possiblePartial, true);
    assert.ok(paths.includes('modulo-sintetico'));
    if (withBackup) assert.ok(paths.some(path => path.replaceAll('\\', '/').includes(kind === 'install' ? 'agentdevkit/backups/' : 'sync-backup.')));
    else assert.ok(paths.every(path => !path.replaceAll('\\', '/').includes('agentdevkit/backups/') && !path.includes('sync-backup.')));
    assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
    assert.deepEqual(fs.readFileSync(join(root, '.gitignore')), ignore);
    assert.equal(fs.readFileSync(join(root, 'humano.txt'), 'utf8'), 'sentinela preparada\n');
  });
}
