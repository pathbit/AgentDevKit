import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncBuiltinESMExports } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { applyPlan, planInstallation } from '../src/install.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { classifyXattr, inspectLinuxXattr } from '../.pbai4devs/scripts/lib/xattr-probe.mjs';

function skipUnavailable(t, reason) {
  if (process.env.ADK_REQUIRE_LINUX_XATTR === '1') assert.fail(reason);
  t.skip(reason);
}

test('classificação recusa erros e distingue saída vazia e não vazia', () => {
  const result = { status: 0, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
  assert.equal(classifyXattr(result), 'empty');
  assert.equal(classifyXattr({ ...result, stdout: Buffer.from('atributo') }), 'present');
  for (const invalid of [{ ...result, status: 1 }, { ...result, stderr: Buffer.from('erro') }, { ...result, signal: 'SIGTERM' }, { ...result, error: new Error('falha') }, null]) assert.equal(classifyXattr(invalid), 'unknown');
});

test('consulta Linux identifica atributo e falha fechada sem expor seu valor', { skip: process.platform !== 'linux' }, t => {
  if (spawnSync('/usr/bin/getfattr', ['--version']).error || spawnSync('/usr/bin/setfattr', ['--version']).error) { skipUnavailable(t, 'Ferramentas attr indisponíveis.'); return; }
  const root = mkdtempSync(join(tmpdir(), 'adk-xattr-probe-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = join(root, 'arquivo');
  writeFileSync(file, 'fixture');
  assert.equal(inspectLinuxXattr(file), 'unknown', 'uma listagem vazia não comprova ausência de atributos inacessíveis');
  const set = spawnSync('/usr/bin/setfattr', ['-n', 'user.pathbit-fixture', '-v', 'valor-sintetico', '--', file]);
  if (set.status !== 0) { skipUnavailable(t, 'Filesystem não permite atributo de teste.'); return; }
  assert.equal(inspectLinuxXattr(file), 'present');
  assert.equal(inspectLinuxXattr(join(root, 'ausente')), 'unknown');
});

test('consulta Linux identifica ACL POSIX listável', { skip: process.platform !== 'linux' }, t => {
  if (spawnSync('/usr/bin/getfattr', ['--version']).error || spawnSync('/usr/bin/setfacl', ['--version']).error) { skipUnavailable(t, 'Ferramentas attr ou acl indisponíveis.'); return; }
  const root = mkdtempSync(join(tmpdir(), 'adk-acl-probe-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = join(root, 'arquivo');
  writeFileSync(file, 'fixture');
  assert.equal(inspectLinuxXattr(file), 'unknown');
  if (spawnSync('/usr/bin/setfacl', ['-m', 'u:12345:r--', '--', file]).status !== 0) { skipUnavailable(t, 'Filesystem não permite ACL de teste.'); return; }
  assert.equal(inspectLinuxXattr(file), 'present');
});

test('instalador preserva arquivo com atributo Linux detectável', { skip: process.platform !== 'linux' || Number(process.versions.node.split('.')[0]) < 24 }, t => {
  if (spawnSync('/usr/bin/getfattr', ['--version']).error || spawnSync('/usr/bin/setfattr', ['--version']).error) { skipUnavailable(t, 'Ferramentas attr indisponíveis.'); return; }
  const root = mkdtempSync(join(tmpdir(), 'adk-install-xattr-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = join(root, 'gerenciado.txt'), original = Buffer.from('original\n');
  writeFileSync(file, original);
  if (spawnSync('/usr/bin/setfattr', ['-n', 'user.pathbit-fixture', '-v', 'valor-sintetico', '--', file]).status !== 0) { skipUnavailable(t, 'Filesystem não permite atributo de teste.'); return; }
  const plan = { target: root, canApply: true, language: 'pt', changes: [{ path: 'gerenciado.txt', action: 'update', content: Buffer.from('novo\n'), beforeHash: createHash('sha256').update(original).digest('hex') }], localIgnore: { edits: [] }, retiredRoots: [] };
  assert.throws(() => applyPlan(plan), error => error.code === 'E_PROTECTED_METADATA' && error.path === 'gerenciado.txt');
  assert.deepEqual(readFileSync(file), original);
  assert.equal(inspectLinuxXattr(file), 'present');
});

test('instalador recusa atributo Linux adicionado antes da publicação', { skip: process.platform !== 'linux' || Number(process.versions.node.split('.')[0]) < 24 }, t => {
  if (spawnSync('/usr/bin/getfattr', ['--version']).error || spawnSync('/usr/bin/setfattr', ['--version']).error) { skipUnavailable(t, 'Ferramentas attr indisponíveis.'); return; }
  const root = mkdtempSync(join(tmpdir(), 'adk-xattr-publication-'));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  const file = join(root, 'gerenciado.txt'), original = Buffer.from('original\n');
  writeFileSync(file, original);
  const plan = { target: root, canApply: true, language: 'pt', changes: [{ path: 'gerenciado.txt', action: 'update', content: Buffer.from('novo\n'), beforeHash: createHash('sha256').update(original).digest('hex') }], localIgnore: { edits: [] }, retiredRoots: [] };
  const originalWrite = fs.writeFileSync;
  let injected = false;
  t.mock.method(fs, 'writeFileSync', (name, ...args) => {
    const result = originalWrite(name, ...args);
    if (!injected && String(name).startsWith(`${file}.agentdevkit-`)) {
      const set = spawnSync('/usr/bin/setfattr', ['-n', 'user.pathbit-race', '-v', 'fixture', '--', file]);
      assert.equal(set.status, 0, 'a fixture deve adicionar o atributo');
      injected = true;
    }
    return result;
  });
  syncBuiltinESMExports();
  assert.throws(() => applyPlan(plan), error => error.code === 'E_PROTECTED_METADATA');
  assert.equal(injected, true);
  assert.deepEqual(readFileSync(file), original);
  assert.equal(inspectLinuxXattr(file), 'present');
  const attribute = spawnSync('/usr/bin/getfattr', ['--only-values', '-n', 'user.pathbit-race', '--', file], { encoding: 'utf8' });
  assert.equal(attribute.status, 0);
  assert.equal(attribute.stdout, 'fixture');
});

test('sync recusa atributo Linux adicionado antes da publicação', { skip: process.platform !== 'linux' || Number(process.versions.node.split('.')[0]) < 24 }, t => {
  if (spawnSync('/usr/bin/getfattr', ['--version']).error || spawnSync('/usr/bin/setfattr', ['--version']).error) { skipUnavailable(t, 'Ferramentas attr indisponíveis.'); return; }
  const root = mkdtempSync(join(tmpdir(), 'adk-sync-xattr-publication-'));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const put = (name, content) => { const file = join(root, name); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); };
  assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
  put('.gitignore', '# fixture\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
  put('.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(`.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  const source = '.pbai4devs/skills/demo/SKILL.md', pointer = '.claude/skills/demo/SKILL.md';
  put(source, '---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
  const options = { root, localIgnores: false, generateEntrypoints: false, output() {} };
  assert.equal(synchronize(options).exitCode, 0);
  const file = join(root, pointer), original = readFileSync(file), index = readFileSync(join(root, '.git/index'));
  put(source, '---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
  const originalWrite = fs.writeFileSync;
  let injected = false;
  t.mock.method(fs, 'writeFileSync', (name, ...args) => {
    const result = originalWrite(name, ...args);
    if (!injected && String(name).startsWith(`${file}.sync.`)) {
      const set = spawnSync('/usr/bin/setfattr', ['-n', 'user.pathbit-race', '-v', 'fixture', '--', file]);
      assert.equal(set.status, 0, 'a fixture deve adicionar o atributo');
      injected = true;
    }
    return result;
  });
  syncBuiltinESMExports();
  assert.throws(() => synchronize({ ...options, force: true }), error => error.code === 'E_PROTECTED_METADATA');
  assert.equal(injected, true);
  assert.deepEqual(readFileSync(file), original);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(inspectLinuxXattr(file), 'present');
  const attribute = spawnSync('/usr/bin/getfattr', ['--only-values', '-n', 'user.pathbit-race', '--', file], { encoding: 'utf8' });
  assert.equal(attribute.status, 0);
  assert.equal(attribute.stdout, 'fixture');
});

test('instalador preserva atributo Linux adicionado antes da remoção', { skip: process.platform !== 'linux' || Number(process.versions.node.split('.')[0]) < 24 }, t => {
  if (spawnSync('/usr/bin/getfattr', ['--version']).error || spawnSync('/usr/bin/setfattr', ['--version']).error) { skipUnavailable(t, 'Ferramentas attr indisponíveis.'); return; }
  const root = mkdtempSync(join(tmpdir(), 'adk-xattr-remove-'));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); rmSync(root, { recursive: true, force: true }); });
  const file = join(root, 'gerenciado.txt'), original = Buffer.from('original\n');
  writeFileSync(file, original);
  const plan = { target: root, canApply: true, language: 'pt', changes: [{ path: 'gerenciado.txt', action: 'remove', content: null, beforeHash: createHash('sha256').update(original).digest('hex') }], localIgnore: { edits: [] }, retiredRoots: [] };
  const originalWrite = fs.writeFileSync;
  let injected = false;
  t.mock.method(fs, 'writeFileSync', (name, ...args) => {
    const result = originalWrite(name, ...args);
    if (!injected && String(name).includes('/.agent-tests/agentdevkit/backups/')) {
      const set = spawnSync('/usr/bin/setfattr', ['-n', 'user.pathbit-remove', '-v', 'fixture', '--', file]);
      assert.equal(set.status, 0);
      injected = true;
    }
    return result;
  });
  syncBuiltinESMExports();
  assert.throws(() => applyPlan(plan), error => error.code === 'E_PROTECTED_METADATA');
  assert.equal(injected, true);
  assert.deepEqual(readFileSync(file), original);
  assert.equal(inspectLinuxXattr(file), 'present');
  const attribute = spawnSync('/usr/bin/getfattr', ['--only-values', '-n', 'user.pathbit-remove', '--', file], { encoding: 'utf8' });
  assert.equal(attribute.status, 0);
  assert.equal(attribute.stdout, 'fixture');
});

test('sync preserva atributo Linux adicionado antes da remoção', { skip: process.platform !== 'linux' || Number(process.versions.node.split('.')[0]) < 24 }, t => {
  if (spawnSync('/usr/bin/getfattr', ['--version']).error || spawnSync('/usr/bin/setfattr', ['--version']).error) { skipUnavailable(t, 'Ferramentas attr indisponíveis.'); return; }
  const root = mkdtempSync(join(tmpdir(), 'adk-sync-xattr-remove-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const put = (name, content) => { const file = join(root, name); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); };
  assert.equal(spawnSync('git', ['init', '-q', '--template=', root]).status, 0);
  put('.gitignore', '# fixture\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore']).status, 0);
  put('.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(`.pbai4devs/templates/gitignore/${name}`, readFileSync(join(repo, '.pbai4devs/templates/gitignore', name)));
  const source = '.pbai4devs/skills/demo/SKILL.md', pointer = '.claude/skills/demo/SKILL.md';
  put(source, '---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
  const options = { root, localIgnores: false, generateEntrypoints: false, output() {} };
  assert.equal(synchronize(options).exitCode, 0);
  const file = join(root, pointer), original = readFileSync(file), index = readFileSync(join(root, '.git/index'));
  rmSync(join(root, source));
  let injected = false;
  const output = message => {
    if (!injected && message.includes('Atributos estendidos Linux nao foram totalmente verificados')) {
      const set = spawnSync('/usr/bin/setfattr', ['-n', 'user.pathbit-remove', '-v', 'fixture', '--', file]);
      assert.equal(set.status, 0);
      injected = true;
    }
  };
  assert.throws(() => synchronize({ ...options, force: true, output }), error => error.code === 'E_PROTECTED_METADATA');
  assert.equal(injected, true);
  assert.deepEqual(readFileSync(file), original);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  assert.equal(inspectLinuxXattr(file), 'present');
  const attribute = spawnSync('/usr/bin/getfattr', ['--only-values', '-n', 'user.pathbit-remove', '--', file], { encoding: 'utf8' });
  assert.equal(attribute.status, 0);
  assert.equal(attribute.stdout, 'fixture');
});

test('planejamento informa atributo Linux detectável e preserva o arquivo', { skip: process.platform !== 'linux' || Number(process.versions.node.split('.')[0]) < 24, timeout: 120000 }, t => {
  if (spawnSync('/usr/bin/getfattr', ['--version']).error || spawnSync('/usr/bin/setfattr', ['--version']).error) { skipUnavailable(t, 'Ferramentas attr indisponíveis.'); return; }
  const root = mkdtempSync(join(tmpdir(), 'adk-plan-xattr-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..'), cli = join(repo, 'bin/agentdevkit.mjs');
  const init = spawnSync(process.execPath, [cli, 'init', '--target', root, '--agents', 'claude', '--yes', '--json'], { encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(init.status, 0, init.stderr);
  const pointer = '.claude/skills/criar-skill/SKILL.md', source = join(root, '.pbai4devs/skills/projeto/criar-skill/SKILL.md'), file = join(root, pointer);
  const original = readFileSync(file), beforeSource = readFileSync(source, 'utf8');
  writeFileSync(source, beforeSource.replace(/^description: .+$/m, 'description: Descrição sintética alterada.'));
  const planBefore = planInstallation({ target: root, mode: 'sync', language: 'pt' });
  assert.equal(planBefore.canApply, true);
  assert.ok(planBefore.xattrUnverified.includes(pointer));
  if (spawnSync('/usr/bin/setfattr', ['-n', 'user.pathbit-fixture', '-v', 'valor-sintetico', '--', file]).status !== 0) { skipUnavailable(t, 'Filesystem não permite atributo de teste.'); return; }
  assert.throws(() => applyPlan(planBefore), error => error.code === 'E_PROTECTED_METADATA' && error.path === pointer);
  assert.deepEqual(readFileSync(file), original);
  const plan = planInstallation({ target: root, mode: 'sync', language: 'pt' });
  assert.equal(plan.canApply, false);
  assert.ok(plan.xattrBlockers.some(item => item.path === pointer && item.code === 'xattr-present'));
  for (const args of [['sync', '--check'], ['sync']]) {
    const result = spawnSync(process.execPath, [cli, ...args, '--target', root, '--json'], { encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(result.status, 1, result.stderr);
    for (const value of ['user.pathbit-fixture', 'valor-sintetico']) {
      assert.ok(!result.stdout.includes(value) && !result.stderr.includes(value), 'diagnóstico não deve divulgar nome ou valor do atributo');
    }
    const data = JSON.parse(result.stdout);
    assert.ok(data.issues?.some(item => item.path === pointer && item.code === 'xattr-present'));
    assert.equal(data.error?.metadataReason, 'xattr-present');
    assert.deepEqual(readFileSync(file), original);
  }
  assert.throws(() => applyPlan(plan), error => error.code === 'E_PROTECTED_METADATA' && error.path === pointer);
  assert.deepEqual(readFileSync(file), original);
  assert.equal(inspectLinuxXattr(file), 'present');
});

test('CLI informa metadados não verificados quando getfattr está ausente', { skip: process.platform !== 'linux' || Number(process.versions.node.split('.')[0]) < 24, timeout: 120000 }, t => {
  if (existsSync('/usr/bin/getfattr')) { t.skip('A fixture exige imagem sem getfattr.'); return; }
  const root = mkdtempSync(join(tmpdir(), 'adk-no-getfattr-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..'), cli = join(repo, 'bin/agentdevkit.mjs');
  const run = args => spawnSync(process.execPath, [cli, ...args, '--target', root, '--json'], { encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(run(['init', '--agents', 'claude', '--yes']).status, 0);
  const pointer = '.claude/skills/criar-skill/SKILL.md', file = join(root, pointer), source = join(root, '.pbai4devs/skills/projeto/criar-skill/SKILL.md');
  const original = readFileSync(file), currentSource = readFileSync(source, 'utf8');
  writeFileSync(source, currentSource.replace(/^description: .+$/m, 'description: Descrição sintética alterada.'));
  const result = run(['sync', '--check']);
  assert.equal(result.status, 1);
  const data = JSON.parse(result.stdout);
  assert.ok(data.xattrUnverified.includes(pointer));
  assert.ok(data.warnings.some(message => /não foram totalmente verificados/.test(message)));
  assert.deepEqual(readFileSync(file), original);
  for (const [language, phrase] of [['en', 'were not fully verified'], ['es', 'No se verificaron completamente']]) {
    const localized = run(['sync', '--check', '--lang', language]);
    assert.equal(localized.status, 1);
    const localizedData = JSON.parse(localized.stdout);
    assert.ok(localizedData.xattrUnverified.includes(pointer));
    assert.ok(localizedData.warnings.some(message => message.includes(phrase)));
    assert.deepEqual(readFileSync(file), original);
  }
  const applied = run(['sync']);
  assert.equal(applied.status, 0);
  const appliedData = JSON.parse(applied.stdout);
  assert.ok(appliedData.xattrUnverified.includes(pointer));
  assert.ok(appliedData.warnings.some(message => /não foram totalmente verificados/.test(message)));
});
