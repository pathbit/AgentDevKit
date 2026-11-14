import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { command, outputParent, projectCase } from './project-matrix.mjs';

const runner = join(dirname(fileURLToPath(import.meta.url)), 'project-matrix.mjs');
const node24 = Number(process.versions.node.split('.')[0]) >= 24;
const temp = t => { const root = mkdtempSync(join(tmpdir(), 'adk-matrix-test-')); t.after(() => rmSync(root, { recursive: true, force: true })); return root; };
const put = (file, value) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value); };
const fakePackage = (root, script) => {
  const pkg = join(root, 'fake-package');
  put(join(pkg, 'package.json'), '{"name":"@pathbit/agentdevkit","version":"9.9.9","type":"module"}\n');
  put(join(pkg, 'bin/agentdevkit.mjs'), script);
  return pkg;
};
const controlled = root => ({ ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key))), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(root, 'no-global'), GIT_TERMINAL_PROMPT: '0' });

test('aceita o alias /tmp do macOS e recusa link humano', { skip: process.platform !== 'darwin' }, t => {
  const root = temp(t), link = join(root, 'link-humano'); symlinkSync(realpathSync(tmpdir()), link, 'dir');
  assert.equal(outputParent('/tmp'), realpathSync('/tmp'));
  assert.throws(() => outputParent(link), /sem link simbólico/);
  const child = join(root, 'diretorio'); mkdirSync(child); const alias = join(root, 'alias'); symlinkSync(child, alias, 'dir');
  mkdirSync(join(child, 'interno'));
  assert.throws(() => outputParent(join(alias, 'interno')), /sem link simbólico/);
});

test('recusa saída em repositório mesmo quando padrão fictício seria ignorado', { skip: !node24 }, t => {
  const root = temp(t), pkg = fakePackage(root, 'process.exitCode=99;');
  const repo = join(root, 'repo'); mkdirSync(repo);
  const init = spawnSync('git', ['init', '--quiet', repo], { encoding: 'utf8', env: controlled(root), timeout: 30000 });
  assert.equal(init.status, 0, init.stderr);
  put(join(repo, '.gitignore'), '*\n!adk-project-matrix-*/\n');
  put(join(repo, 'sentinela'), 'preservado\n');
  const before = readdirSync(repo).sort();
  const result = spawnSync(process.execPath, [runner, '--package', pkg, '--version', '9.9.9', '--output', repo], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 1, result.stderr); assert.match(result.stderr, /fora de repositórios Git/);
  assert.deepEqual(readdirSync(repo).sort(), before); assert.equal(readFileSync(join(repo, 'sentinela'), 'utf8'), 'preservado\n');
});

test('detecta alteração de modo nos três documentos humanos mesmo com prefixos intactos', { skip: !node24, timeout: 180000 }, t => {
  const root = temp(t);
  const pkg = fakePackage(root, `import {chmodSync,existsSync,statSync} from 'node:fs';\nimport {join} from 'node:path';\nconst target=process.argv[process.argv.indexOf('--target')+1];\nif(process.argv[2]==='init')for(const p of ['AGENTS.md','CLAUDE.md','.claude/skills/criar-skill/SKILL.md']){const f=join(target,p);if(existsSync(f))chmodSync(f,(statSync(f).mode&0o777)^0o200)}\nconsole.log(JSON.stringify({ok:true,version:'9.9.9'}));\n`);
  const output = join(root, 'output'); mkdirSync(output);
  const result = spawnSync(process.execPath, [runner, '--package', pkg, '--version', '9.9.9', '--output', output, '--jobs', '4'], { encoding: 'utf8', timeout: 170000, maxBuffer: 1024 * 1024 });
  assert.equal(result.status, 1, `${result.error?.message || ''}\n${result.stderr}\n${result.stdout}`);
  const summary = JSON.parse(result.stdout), report = JSON.parse(readFileSync(summary.report));
  assert.equal(report.projects, 40); assert.equal(report.passed, 20); assert.equal(report.failed, 20);
  for (const item of report.results.filter(item => item.kind === 'existing')) {
    for (const path of ['AGENTS.md', 'CLAUDE.md', '.claude/skills/criar-skill/SKILL.md']) {
      assert.equal(item.preservation.documents[path].originalPrefixPreserved, true, `${item.root}: ${path}`);
      assert.equal(item.preservation.documents[path].modePreserved, false, `${item.root}: ${path}`);
      // Arquivos somente leitura podem impedir a limpeza em Windows.
      chmodSync(join(item.root, path), 0o600);
    }
    assert.equal(item.preservation.documentsPreserved, false);
  }
  assert.equal(report.modeMask, process.platform === 'win32' ? '0o200' : '0o777');
});

test('interrompe após alteração indevida, antes que outra etapa a reverta', { skip: !node24, timeout: 10000 }, async t => {
  const root = temp(t), cli = join(root, 'transient.cjs'), results = join(root, 'results'); mkdirSync(results);
  put(cli, `const {writeFileSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')writeFileSync(join(target,'.gitignore'),'adulterado\\n');if(process.argv[2]==='update')writeFileSync(join(target,'.gitignore'),'# regra humana\\nprivate-data/\\n');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const result = await projectCase({ number: 1, kind: 'existing', selection: 'codex' }, results, cli, '9.9.9', controlled(root));
  assert.equal(result.passed, false); assert.equal(result.preservation.unchanged, false);
  assert.deepEqual(result.operations.map(operation => operation.label), ['git-init', 'git-add-base', 'git-commit-base', 'git-add', 'init']);
  assert.equal(result.operations.at(-1).preservation.unchanged, false);
  assert.ok(existsSync(join(results, '01-existing', 'init.snapshot.json')));
  assert.equal(readFileSync(join(result.root, '.gitignore'), 'utf8'), 'adulterado\n');
});

test('recusa troca de pasta humana por link simbólico mesmo que conteúdo pareça igual', { skip: !node24, timeout: 10000 }, async t => {
  const root = temp(t), probeTarget = join(root, 'probe-target'), probeLink = join(root, 'probe-link'); mkdirSync(probeTarget);
  try { symlinkSync(probeTarget, probeLink, 'dir'); unlinkSync(probeLink); }
  catch (error) { if (process.platform === 'win32' && ['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) { t.skip('Sem permissão para criar symlink no Windows.'); return; } throw error; }
  const cli = join(root, 'replace.cjs'), results = join(root, 'results'); mkdirSync(results);
  put(cli, `const {renameSync,symlinkSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init'){const a=join(target,'.claude');const b=join(target,'.claude-movida');renameSync(a,b);symlinkSync(b,a,'dir')}console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const result = await projectCase({ number: 1, kind: 'existing', selection: 'codex' }, results, cli, '9.9.9', controlled(root));
  assert.equal(result.passed, false); assert.equal(result.preservation.unchanged, false);
  assert.match(result.preservation.after['.claude/settings.json'].error, /Link simbólico/);
  assert.equal(result.preservation.documents['.claude/skills/criar-skill/SKILL.md'].originalPrefixPreserved, false);
  assert.ok(!result.operations.some(operation => operation.label === 'update'));
});

test('bloqueia mudança do Git config e preserva regra humana de exclude', { skip: !node24, timeout: 15000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const config = join(root, 'config.cjs');
  put(config, `const {appendFileSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')appendFileSync(join(target,'.git/config'),'\\n[fixture]\\nflag=true\\n');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const changedConfig = await projectCase({ number: 1, kind: 'existing', selection: 'codex' }, results, config, '9.9.9', controlled(root));
  assert.equal(changedConfig.passed, false); assert.equal(changedConfig.preservation.unchanged, false);
  assert.notEqual(changedConfig.preservation.after['.git/config'].sha256, changedConfig.preservation.baseline.unchanged['.git/config'].sha256);
  const exclude = join(root, 'exclude.cjs');
  put(exclude, `const {appendFileSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')appendFileSync(join(target,'.git/info/exclude'),'# bloco gerenciado\\nfixture-generated/\\n');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const additive = await projectCase({ number: 2, kind: 'existing', selection: 'codex' }, results, exclude, '9.9.9', controlled(root));
  assert.equal(additive.passed, true); assert.equal(additive.preservation.documents['.git/info/exclude'].originalPrefixPreserved, true);
  const invalid = join(root, 'exclude-invalid.cjs');
  put(invalid, `const {writeFileSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')writeFileSync(join(target,'.git/info/exclude'),'# perdeu regra humana\\n');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const deletedRule = await projectCase({ number: 3, kind: 'existing', selection: 'codex' }, results, invalid, '9.9.9', controlled(root));
  assert.equal(deletedRule.passed, false); assert.equal(deletedRule.preservation.documents['.git/info/exclude'].originalPrefixPreserved, false);
});

test('detecta mudança da ref apontada por HEAD mesmo sem editar .git/HEAD', { skip: !node24, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'), cli = join(root, 'head-ref.cjs'); mkdirSync(results);
  put(cli, `const {readFileSync,writeFileSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init'){const h=readFileSync(join(target,'.git/HEAD'),'utf8').trim().slice(5);writeFileSync(join(target,'.git',h),'0000000000000000000000000000000000000000\\n')}console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const result = await projectCase({ number: 1, kind: 'existing', selection: 'codex' }, results, cli, '9.9.9', controlled(root));
  assert.equal(result.passed, false); assert.equal(result.preservation.observedUnchanged, true);
  assert.equal(result.preservation.observedOptionalUnchanged, false); assert.equal(result.preservation.unchanged, false);
  assert.ok(!result.operations.some(operation => operation.label === 'update'));
});

test('detecta criação de outra ref e mudança em packed-refs', { skip: !node24, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'), cli = join(root, 'other-ref.cjs'); mkdirSync(results);
  put(cli, `const {writeFileSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')writeFileSync(join(target,'.git/refs/heads/extra'),'0000000000000000000000000000000000000000\\n');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const added = await projectCase({ number: 1, kind: 'existing', selection: 'codex' }, results, cli, '9.9.9', controlled(root));
  assert.equal(added.passed, false); assert.equal(added.preservation.observedRefsUnchanged, false);
  assert.equal(added.preservation.observedOptionalUnchanged, true);
  const packed = join(root, 'packed.cjs');
  put(packed, `const {writeFileSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')writeFileSync(join(target,'.git/packed-refs'),'# synthetic\\n');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const changedPacked = await projectCase({ number: 2, kind: 'new', selection: 'codex' }, results, packed, '9.9.9', controlled(root));
  assert.equal(changedPacked.passed, false); assert.equal(changedPacked.preservation.observedOptionalUnchanged, false);
});

test('recusa link simbólico dentro das refs', { skip: !node24, timeout: 10000 }, async t => {
  const root = temp(t), probe = join(root, 'probe'), link = join(root, 'probe-link'); put(probe, 'ref\n');
  try { symlinkSync(probe, link, 'file'); unlinkSync(link); }
  catch (error) { if (process.platform === 'win32' && ['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) { t.skip('Sem permissão para criar symlink no Windows.'); return; } throw error; }
  const results = join(root, 'results'), cli = join(root, 'ref-link.cjs'); mkdirSync(results);
  put(cli, `const {symlinkSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')symlinkSync(${JSON.stringify(probe)},join(target,'.git/refs/heads/extra'),'file');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const result = await projectCase({ number: 1, kind: 'existing', selection: 'codex' }, results, cli, '9.9.9', controlled(root));
  assert.equal(result.passed, false); assert.match(result.preservation.refs.error, /Link simbólico em ref/);
});

test('timeout não aguarda indefinidamente pipe herdado de descendente', { timeout: 10000 }, async t => {
  const root = temp(t), script = join(root, 'pipes.cjs');
  put(script, `const {spawn}=require('node:child_process');const {tmpdir}=require('node:os');const c=spawn(process.execPath,['-e','setTimeout(()=>{},2500)'],{stdio:'inherit',cwd:tmpdir()});c.unref();process.stdout.write('started\\n');`);
  const start = Date.now(), result = await command(process.execPath, [script], root, process.env, 300);
  assert.equal(result.timedOut, true); assert.equal(result.exceeded, false);
  assert.match(result.stdout, /started/); assert.ok(Date.now() - start < 2000, 'o pipe herdado não pode bloquear o runner');
});

test('timeout encerra grupo próprio sem sinalizar processo independente', { skip: process.platform === 'win32', timeout: 10000 }, async t => {
  const root = temp(t), script = join(root, 'group.cjs'), marker = join(root, 'escaped');
  put(script, `const {spawn}=require('node:child_process');const {tmpdir}=require('node:os');const payload="process.on('SIGTERM',()=>{});process.stdout.write('DESC_READY\\\\n');setTimeout(()=>require('node:fs').writeFileSync(process.argv[1],'alive'),3000);setTimeout(()=>{},4000);";spawn(process.execPath,['-e',payload,process.argv[2]],{stdio:'inherit',cwd:tmpdir()});process.on('SIGTERM',()=>{});setInterval(()=>{},1000);`);
  const sibling = spawn(process.execPath, ['-e', 'setTimeout(()=>{},8000)'], { stdio: 'ignore' });
  t.after(() => { if (sibling.exitCode === null && sibling.signalCode === null) sibling.kill(); });
  const result = await command(process.execPath, [script, marker], root, process.env, 1200);
  assert.equal(result.timedOut, true); assert.match(result.stdout, /DESC_READY/);
  await new Promise(resolvePromise => setTimeout(resolvePromise, 3500));
  assert.equal(existsSync(marker), false, 'descendente do grupo não deve continuar');
  assert.equal(sibling.exitCode, null); assert.equal(sibling.signalCode, null);
});

test('limita saída excessiva e não sinaliza processo independente', { timeout: 10000 }, async t => {
  const root = temp(t), script = join(root, 'flood.cjs');
  put(script, `process.on('SIGTERM',()=>{});const b=Buffer.alloc(65536,65);function send(){while(process.stdout.write(b)){}process.stdout.once('drain',send)}send();`);
  const sibling = spawn(process.execPath, ['-e', 'setTimeout(()=>{},8000)'], { stdio: 'ignore' });
  t.after(() => { if (sibling.exitCode === null && sibling.signalCode === null) sibling.kill(); });
  const result = await command(process.execPath, [script], root, process.env, 5000);
  assert.equal(result.exceeded, true); assert.equal(result.timedOut, false);
  assert.ok(Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr) <= 16 * 1024 * 1024);
  assert.equal(sibling.exitCode, null); assert.equal(sibling.signalCode, null);
});

test('timeout do alvo não certifica preservação mesmo quando snapshots coincidem', { skip: !node24, timeout: 10000 }, async t => {
  const root = temp(t), cli = join(root, 'hang.cjs');
  put(cli, `process.on('SIGTERM',()=>{});setInterval(()=>{},1000);`);
  const results = join(root, 'results'); mkdirSync(results);
  const env = controlled(root);
  const timed = (file, args, cwd, environment) => command(file, args, cwd, environment, file === process.execPath ? 300 : 30000);
  const result = await projectCase({ number: 1, kind: 'existing', selection: 'codex' }, results, cli, '9.9.9', env, timed);
  assert.equal(result.passed, false); assert.equal(result.operations.at(-1).timedOut, true);
  assert.equal(result.preservation.status, 'not-verified');
  assert.equal(result.preservation.unchanged, null); assert.equal(result.preservation.documentsPreserved, null);
  assert.equal(result.preservation.observedUnchanged, true); assert.equal(result.preservation.observedDocumentsPreserved, true);
  for (const name of ['SETUP.json', 'BEFORE.json', 'AFTER.json', 'RESULT.json']) assert.ok(existsSync(join(results, '01-existing', name)), name);
});
