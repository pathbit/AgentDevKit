import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planInstallation, applyPlan } from '../src/install.mjs';
import { main as cliMain } from '../src/cli.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';

const macOnly = process.platform !== 'darwin' ? 'ACL macOS requer macOS' : false;
function put(root, path, content) { const file = join(root, path); fs.mkdirSync(dirname(file), { recursive: true }); fs.writeFileSync(file, content); }
function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-acl-plan-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
  put(root, '.gitignore', '# humano\n'); put(root, 'humano.txt', 'staged\n');
  assert.equal(spawnSync('git', ['-C', root, 'add', '.gitignore', 'humano.txt']).status, 0);
  fs.appendFileSync(join(root, 'humano.txt'), 'unstaged\n');
  return root;
}
function snapshots(root, target) {
  const file = join(root, target), info = fs.statSync(file, { bigint: true });
  const acl = spawnSync('/bin/ls', ['-lde', '--', file], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LC_ALL: 'C' } });
  assert.equal(acl.status, 0);
  return { files: ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'humano.txt', target].map(path => fs.readFileSync(join(root, path))),
    inode: info.ino, device: info.dev, mode: info.mode, acl: acl.stdout.split('\n').filter(line => /^\s*\d+: /.test(line)) };
}

test("plan and dry-run accept ACL preserveable without changing the query", { timeout: 120000, skip: macOnly }, t => {
  const root = fixture(t), path = 'AGENTS.md', target = join(root, path);
  put(root, path, '# Instruções humanas\n');
  assert.equal(spawnSync('/bin/chmod', ['+a', 'everyone allow read', target]).status, 0);
  const before = snapshots(root, path), plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  assert.equal(plan.canApply, true); assert.deepEqual(plan.aclBlockers, []);
  const cli = fileURLToPath(new URL('../bin/agentdevkit.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [cli, 'init', '--target', root, '--agents', 'codex', '--yes', '--dry-run', '--json'], { encoding: 'utf8', timeout: 120000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const response = JSON.parse(result.stdout); assert.equal(response.ok, true);
  assert.deepEqual(snapshots(root, path), before);
  applyPlan(plan);
  const after = snapshots(root, path);
  assert.deepEqual(after.acl, before.acl);
  assert.notDeepEqual(after.files[5], before.files[5]);
  assert.deepEqual(after.files.slice(0, 5), before.files.slice(0, 5), 'índice e configuração Git devem permanecer intactos');
});

test("direct check informs ACL only in the file that needs to change", { timeout: 120000, skip: macOnly }, t => {
  const root = fixture(t), source = '.pbai4devs/skills/demo/SKILL.md', path = '.claude/skills/demo/SKILL.md';
  put(root, '.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) put(root, `.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
  put(root, source, '---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
  const options = { root, localIgnores: false, generateEntrypoints: false, output() {} };
  synchronize(options); const target = join(root, path);
  assert.equal(spawnSync('/bin/chmod', ['+a', 'everyone allow read', target]).status, 0);
  assert.deepEqual(synchronize({ ...options, check: true }).aclBlockers, []);
  put(root, source, '---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
  const before = snapshots(root, path), result = synchronize({ ...options, check: true });
  assert.equal(result.exitCode, 1, 'check deve indicar que há conteúdo para atualizar'); assert.deepEqual(result.aclBlockers, []);
  assert.deepEqual(snapshots(root, path), before, 'check continua somente leitura');
  synchronize(options);
  const after = snapshots(root, path);
  assert.deepEqual(after.acl, before.acl);
  assert.notDeepEqual(after.files[5], before.files[5]);
  assert.deepEqual(after.files.slice(0, 5), before.files.slice(0, 5), 'índice e configuração Git devem permanecer intactos');
});

test("ACL added after plan is refused in application", { timeout: 120000, skip: macOnly }, t => {
  const root = fixture(t), path = 'AGENTS.md', target = join(root, path);
  put(root, path, '# Instruções humanas\n');
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  assert.equal(plan.canApply, true); assert.deepEqual(plan.aclBlockers, []);
  assert.equal(spawnSync('/bin/chmod', ['+a', 'everyone deny append', target]).status, 0);
  const before = snapshots(root, path), identity = fs.statSync(target, { bigint: true });
  assert.throws(() => applyPlan(plan), error => error.code === 'E_PROTECTED_METADATA' && error.path === path && error.metadataReason === 'acl-deny');
  assert.deepEqual(snapshots(root, path), before); assert.equal(fs.statSync(target, { bigint: true }).ino, identity.ino);
});

test("plan distinguishes consultation from ACL inconclusive without exposing exit", { timeout: 120000, skip: macOnly }, async t => {
  const root = fixture(t), path = 'AGENTS.md', target = join(root, path);
  put(root, path, '# Instruções humanas\n'); const before = snapshots(root, path);
  const spawn = childProcess.spawnSync; let injected = false;
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  t.mock.method(childProcess, 'spawnSync', (command, args, ...rest) => {
    if (command === '/bin/ls' && args.includes(target)) { injected = true; return { status: 1, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.from('privado-sintetico') }; }
    return spawn(command, args, ...rest);
  });
  syncBuiltinESMExports();
  const plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  assert.ok(injected); assert.equal(plan.canApply, false); assert.ok(plan.aclBlockers.some(item => item.path === path && item.code === 'acl-unverified'));
  assert.throws(() => applyPlan(plan), error => error.code === 'E_METADATA_UNSUPPORTED' && error.path === path && error.metadataReason === 'acl-unverified' && !error.message.includes('privado-sintetico'));
  for (const [language, label] of [['pt', 'ACL do arquivo não verificada'], ['en', 'File ACL could not be verified'], ['es', 'ACL del archivo no verificada']]) for (const json of [false, true]) {
    let output = ''; const writer = { write(value) { output += value; } };
    const status = await cliMain(['init', '--target', root, '--agents', 'codex', '--yes', '--dry-run', '--lang', language, ...(json ? ['--json'] : [])], { cwd: root, stdout: writer, stderr: writer, stdin: { isTTY: false } });
    assert.notEqual(status, 0); assert.ok(!output.includes('privado-sintetico'));
    if (json) { const body = JSON.parse(output); assert.ok(body.issues.some(item => item.path === path && item.code === 'acl-unverified')); assert.equal(body.error.code, 'E_METADATA_UNSUPPORTED'); assert.equal(body.error.metadataReason, 'acl-unverified'); }
    else assert.ok(output.includes(label), output);
  }
  t.mock.restoreAll(); syncBuiltinESMExports(); assert.deepEqual(snapshots(root, path), before);
});

test("ACL Preservable does not hide hardlink lock", { timeout: 120000, skip: macOnly }, t => {
  const root = fixture(t), path = 'AGENTS.md', target = join(root, path), other = join(root, 'link-humano.md');
  put(root, path, '# Instruções humanas\n');
  assert.equal(spawnSync('/bin/chmod', ['+a', 'everyone allow read', target]).status, 0);
  fs.linkSync(target, other);
  const before = snapshots(root, path), plan = planInstallation({ target: root, mode: 'init', clients: ['codex'] });
  assert.ok(plan.hardlinkBlockers.some(item => item.path === path && item.code === 'hardlink-shared'));
  assert.deepEqual(plan.aclBlockers, []);
  assert.throws(() => applyPlan(plan), error => error.code === 'E_PROTECTED_METADATA' && error.metadataReason === 'hardlink-shared');
  const cli = fileURLToPath(new URL('../bin/agentdevkit.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [cli, 'init', '--target', root, '--agents', 'codex', '--yes', '--dry-run', '--json'], { encoding: 'utf8', timeout: 120000 });
  assert.equal(result.status, 1); const response = JSON.parse(result.stdout);
  assert.ok(response.issues.some(item => item.path === path && item.code === 'hardlink-shared'));
  assert.ok(!response.issues.some(item => item.path === path && item.code === 'acl-present'));
  assert.deepEqual(snapshots(root, path), before); assert.equal(fs.statSync(other, { bigint: true }).ino, fs.statSync(target, { bigint: true }).ino);
});

test("human conflict keeps priority and ACL Preservable does not generate false lock", { timeout: 240000, skip: macOnly }, t => {
  const root = fixture(t), cli = fileURLToPath(new URL('../bin/agentdevkit.mjs', import.meta.url));
  const run = args => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const init = run(['init', '--target', root, '--agents', 'claude', '--yes', '--json']);
  assert.equal(init.status, 0, init.stdout + init.stderr);
  const source = '.pbai4devs/skills/demo/SKILL.md', target = '.claude/skills/demo/SKILL.md';
  const otherSource = '.pbai4devs/skills/outra/SKILL.md', otherTarget = '.claude/skills/outra/SKILL.md';
  put(root, source, '---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
  put(root, otherSource, '---\nname: outra\ndescription: Original.\n---\n\n# Outra\n');
  synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  assert.equal(spawnSync('/bin/chmod', ['+a', 'everyone allow read', join(root, target)]).status, 0);
  fs.appendFileSync(join(root, otherTarget), '\n# Alteração humana\n');
  put(root, source, '---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
  const before = snapshots(root, target), human = fs.readFileSync(join(root, otherTarget));
  const plan = planInstallation({ target: root, mode: 'sync' });
  assert.ok(plan.conflicts.includes(otherTarget)); assert.deepEqual(plan.aclBlockers, []);
  assert.throws(() => applyPlan(plan), error => error.code === 'E_CONFLICT');
  for (const language of ['pt', 'en', 'es']) for (const command of ['doctor', 'sync']) {
    const args = [command, ...(command === 'sync' ? ['--check'] : []), '--target', root, '--lang', language];
    const output = run(args); assert.equal(output.status, 1, output.stdout + output.stderr);
    const json = run([...args, '--json']); assert.equal(json.status, 1, json.stdout + json.stderr);
    const result = JSON.parse(json.stdout); assert.ok(!JSON.stringify(result).includes('"code":"acl-present"'));
    if (command === 'sync') assert.ok(result.conflicts.includes(otherTarget));
  }
  assert.deepEqual(snapshots(root, target), before); assert.deepEqual(fs.readFileSync(join(root, otherTarget)), human);
});
