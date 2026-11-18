import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import fs from 'node:fs';

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { applyPlan, planInstallation } from '../src/install.mjs';
import { collectErrorDiagnostics } from '../.pbai4devs/scripts/lib/error-reporting.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(repository, 'bin/agentdevkit.mjs');
const oldRoot = '.pbai4devs/estado';
const newRoot = '.pbai4devs/state';
const read = (root, path) => readFileSync(join(root, path));
function put(root, path, value) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), value);
}
function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}
function cli(root, args, expected = 0) {
  const result = spawnSync(process.execPath, [bin, ...args, '--target', root, '--json'], {
    encoding: 'utf8', timeout: 180000,
  });
  assert.equal(result.status, expected, `${args.join(' ')}: ${result.error?.stack || ''}\n${result.stdout || ''}\n${result.stderr || ''}`);
  return JSON.parse(result.stdout);
}
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-state-special-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '--quiet');
  const ignore = Buffer.from('# Regras humanas\r\nnode_modules/\r\n.env\r\n!.env.example\r\n');
  put(root, '.gitignore', ignore);
  put(root, 'AGENTS.md', '# Instruções humanas\n\nNão substituir.\n');
  put(root, 'README.md', '# Projeto humano\n');
  cli(root, ['init', '--agents', 'codex,claude', '--lang', 'es']);
  const manifestPath = `${newRoot}/agentdevkit.json`;
  const manifest = JSON.parse(read(root, manifestPath));
  manifest.version = '0.0.16';
  for (const key of Object.keys(manifest.files || {})) {
    if (key.startsWith(`${newRoot}/`)) {
      manifest.files[key.replace(`${newRoot}/`, `${oldRoot}/`)] = manifest.files[key];
      delete manifest.files[key];
    }
  }
  put(root, manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const config = Buffer.from('---\npreparacao: concluido\nconfiguracao_tecnica: pendente\n---\n\n# Decisões da equipe\n\nNão reescrever.\n');
  const custom = Buffer.from('Arquivo próprio\r\ncom conteúdo preservado.\r\n');
  const catalog = '.agents/skills.json';
  const digest = createHash('sha256').update(read(root, catalog)).digest('hex');
  const derived = Buffer.from(`${JSON.stringify({ schemaVersion: 1, entries: {}, files: {}, blocks: {}, outputs: { [catalog]: digest } })}\n`);
  put(root, `${newRoot}/configuracao/ESTADO.md`, config);
  put(root, `${newRoot}/outros/minhas-notas.txt`, custom);
  put(root, `${newRoot}/derived.json`, derived);
  renameSync(join(root, newRoot), join(root, oldRoot));
  git(root, 'add', '--', '.gitignore', 'AGENTS.md', 'README.md', `${oldRoot}/configuracao/ESTADO.md`, `${oldRoot}/outros/minhas-notas.txt`);
  put(root, `${oldRoot}/configuracao/ESTADO.md`, Buffer.concat([config, Buffer.from('\nAlteração não preparada.\n')]));
  return { root, ignore, config: read(root, `${oldRoot}/configuracao/ESTADO.md`), custom, derived,
    index: git(root, 'ls-files', '--stage', '-z'), agents: read(root, 'AGENTS.md'), readme: read(root, 'README.md') };
}


const xattrName='org.pathbit.synthetic-dir', xattrValue='fixture-only';
function xattr(...args){return spawnSync('/usr/bin/xattr',args,{encoding:'buffer',timeout:5000,maxBuffer:65536,shell:false,env:{PATH:'/usr/bin:/bin',LANG:'C',LC_ALL:'C'}})}
for(const nested of [false,true]) test('xattr sintético em diretório legado recusa update: nested='+nested,{timeout:180000,skip:process.platform==='darwin' ? false : 'xattr em diretório não verificado neste sistema'},t=>{
 const f=fixture(t),{root}=f,relative=nested?oldRoot+'/especial':oldRoot,dir=join(root,relative);if(nested)fs.mkdirSync(dir,{mode:0o700});
 let set=xattr('-w',xattrName,xattrValue,dir);assert.equal(set.error,undefined);assert.equal(set.signal,null);assert.equal(set.status,0,'fixture não conseguiu criar atributo sintético');
 let get=()=>xattr('-p',xattrName,dir);let beforeAttr=get();assert.equal(beforeAttr.status,0);assert.equal(beforeAttr.stdout.toString().trim(),xattrValue);
 let paths=['.git/index','.git/config','.git/info/exclude','.gitignore','AGENTS.md','README.md',oldRoot+'/agentdevkit.json',oldRoot+'/configuracao/ESTADO.md',oldRoot+'/outros/minhas-notas.txt'];let before=new Map(paths.map(p=>[p,read(root,p)])),mode=fs.statSync(dir).mode&0o7777;
 assert.throws(()=>planInstallation({target:root,mode:'update'}),e=>e.code==='E_PROTECTED_METADATA'&&e.path===relative&&e.metadataReason==='xattr-directory-present');
 for(const force of [false,true]){let r=spawnSync(process.execPath,[bin,'update',...(force?['--force']:[]),'--target',root,'--json'],{encoding:'utf8',timeout:180000,maxBuffer:8e6});assert.equal(r.error,undefined);assert.equal(r.signal,null);assert.equal(r.status,1);let j=JSON.parse(r.stdout);assert.equal(j.ok,false);assert.equal(j.error.code,'E_PROTECTED_METADATA');assert.equal(j.error.path,relative);assert.equal(j.error.metadataReason,'xattr-directory-present')}
 let human=spawnSync(process.execPath,[bin,'update','--dry-run','--target',root,'--lang','pt'],{encoding:'utf8',timeout:180000});assert.equal(human.status,1);assert.ok(human.stdout.includes('Diretório tem atributos estendidos; revise: '+relative));
 let afterAttr=get();assert.equal(afterAttr.status,0);assert.deepEqual(afterAttr.stdout,beforeAttr.stdout);assert.equal(fs.statSync(dir).mode&0o7777,mode);assert.equal(fs.existsSync(join(root,newRoot)),false);for(const [p,b] of before)assert.deepEqual(read(root,p),b,p);
});

test('falha simulada do probe do diretório recusa sem alterar dados', {timeout:180000,skip:process.platform==='darwin' ? false : 'xattr em diretório não verificado neste sistema'},t=>{
 const f=fixture(t),{root}=f,relative=oldRoot+'/configuracao',dir=join(root,relative),paths=['.git/index','.git/config','.git/info/exclude','.gitignore',oldRoot+'/configuracao/ESTADO.md',oldRoot+'/agentdevkit.json'],before=new Map(paths.map(p=>[p,read(root,p)]));let fired=false;const original=childProcess.spawnSync;
 t.mock.method(childProcess,'spawnSync',(bin,args,opts)=>{if(bin==='/usr/bin/xattr'&&Array.isArray(args)&&args.includes(dir)){fired=true;return {status:null,signal:'SIGTERM',stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)}}return original(bin,args,opts)});syncBuiltinESMExports();let caught;try{planInstallation({target:root,mode:'update'})}catch(e){caught=e}finally{t.mock.restoreAll();syncBuiltinESMExports()}
 assert.equal(fired,true);assert.equal(caught?.code,'E_METADATA_UNSUPPORTED');assert.equal(caught.path,relative);assert.equal(caught.metadataReason,'xattr-directory-unverified');assert.equal(fs.existsSync(join(root,newRoot)),false);for(const [p,b]of before)assert.deepEqual(read(root,p),b,p);
});

test('consultas na presença de xattr de diretório não alteram dados', {timeout:180000,skip:process.platform==='darwin' ? false : 'xattr em diretório não verificado neste sistema'},t=>{
 const f=fixture(t),{root}=f,relative=oldRoot+'/configuracao',dir=join(root,relative);let set=xattr('-w',xattrName,xattrValue,dir);assert.equal(set.error,undefined);assert.equal(set.signal,null);assert.equal(set.status,0,'fixture requer suporte a xattr');let attr=xattr('-p',xattrName,dir);assert.equal(attr.status,0);assert.equal(attr.stdout.toString().trim(),xattrValue);
 const paths=['.git/index','.git/config','.git/info/exclude','.gitignore','AGENTS.md','README.md',oldRoot+'/agentdevkit.json',oldRoot+'/configuracao/ESTADO.md',oldRoot+'/outros/minhas-notas.txt'],before=new Map(paths.map(p=>[p,read(root,p)]));
 for(const args of [['--help'],['--version'],['next','--intent','product'],['agents'],['lang'],['doctor'],['sync','--check'],['update','--dry-run']]){let r=spawnSync(process.execPath,[bin,...args,'--target',root,'--json'],{encoding:'utf8',timeout:180000,maxBuffer:8e6}),blocked=['doctor','sync','update'].includes(args[0]);assert.equal(r.error,undefined);assert.equal(r.signal,null);assert.equal(r.status,blocked?1:0,JSON.stringify(args));let j=JSON.parse(r.stdout);assert.equal(j.ok,!blocked);if(blocked){assert.equal(j.error.code,'E_PROTECTED_METADATA');assert.equal(j.error.path,relative);assert.equal(j.error.metadataReason,'xattr-directory-present')}assert.equal(fs.existsSync(join(root,newRoot)),false);for(const [p,b]of before)assert.deepEqual(read(root,p),b,p);}
 let after=xattr('-p',xattrName,dir);assert.equal(after.status,0);assert.deepEqual(after.stdout,attr.stdout);
});

test('revalidação de xattr não verificada bloqueia aplicação antes do backup', {timeout:180000,skip:process.platform==='darwin' ? false : 'xattr em diretório não verificado neste sistema'},t=>{
 const f=fixture(t),{root}=f,relative=oldRoot+'/configuracao',dir=join(root,relative),plan=planInstallation({target:root,mode:'update'}),paths=['.git/index','.git/config','.git/info/exclude','.gitignore',oldRoot+'/configuracao/ESTADO.md',oldRoot+'/agentdevkit.json'],before=new Map(paths.map(p=>[p,read(root,p)]));assert.equal(plan.canApply,true);
 let fired=false;const original=childProcess.spawnSync;t.mock.method(childProcess,'spawnSync',(bin,args,opts)=>{if(bin==='/usr/bin/xattr'&&Array.isArray(args)&&args.includes(dir)){fired=true;return {status:null,signal:'SIGTERM',stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)}}return original(bin,args,opts)});syncBuiltinESMExports();let caught;try{applyPlan(plan)}catch(e){caught=e}finally{t.mock.restoreAll();syncBuiltinESMExports()}
 assert.equal(fired,true);assert.equal(caught?.code,'E_METADATA_UNSUPPORTED');assert.equal(caught.path,relative);assert.equal(caught.metadataReason,'xattr-directory-unverified');assert.equal(fs.existsSync(join(root,newRoot)),false);for(const [p,b]of before)assert.deepEqual(read(root,p),b,p);
});

test('doctor com outro problema informa xattr do diretório legado', {timeout:180000,skip:process.platform==='darwin' ? false : 'xattr em diretório não verificado neste sistema'},t=>{
 const f=fixture(t),{root}=f,relative=oldRoot+'/configuracao',dir=join(root,relative),set=xattr('-w',xattrName,xattrValue,dir);assert.equal(set.error,undefined);assert.equal(set.signal,null);assert.equal(set.status,0,'fixture requer suporte a xattr');
 const attr=xattr('-p',xattrName,dir);assert.equal(attr.status,0);fs.appendFileSync(join(root,'.pbai4devs/INSTRUCTIONS.md'),'\nObservação humana sintética.\n');
 const paths=['.git/index','.git/config','.git/info/exclude','.gitignore','.pbai4devs/INSTRUCTIONS.md',oldRoot+'/agentdevkit.json',relative+'/ESTADO.md'],before=new Map(paths.map(p=>[p,read(root,p)]));
 const result=cli(root,['doctor'],1);assert.equal(result.ok,false);assert.ok(result.issues.some(i=>i.code==='plan-inspection-failed'&&i.causeCode==='E_PROTECTED_METADATA'));assert.ok(result.issues.some(i=>i.code==='state-directory-xattr-present'&&i.path===relative));assert.equal(result.next[0].stage,'revisao');assert.ok(!result.next.some(step=>step.skill==='configurar-projeto'));
 const after=xattr('-p',xattrName,dir);assert.equal(after.status,0);assert.deepEqual(after.stdout,attr.stdout);assert.equal(fs.existsSync(join(root,newRoot)),false);for(const [p,b]of before)assert.deepEqual(read(root,p),b,p);
});

for (const variant of ['present', 'unknown', 'mode', 'ordinary']) test(`revalidação tardia durante migração: ${variant}`, { timeout: 180000, skip: process.platform !== 'darwin' && !(process.platform === 'linux' && ['mode', 'ordinary'].includes(variant)) }, t => {
  const f = fixture(t), { root } = f, relative = `${oldRoot}/configuracao`, dir = join(root, relative);
  const plan = planInstallation({ target: root, mode: 'update' });
  const tree = (base, rel = '') => fs.readdirSync(join(base, rel)).sort().flatMap(n => {
    const p = rel ? rel + '/' + n : n, st = fs.lstatSync(join(base, p));
    return st.isDirectory() ? [[p, 'dir', st.mode & 0o7777], ...tree(base, p)]
      : [[p, 'file', st.mode & 0o7777, createHash('sha256').update(fs.readFileSync(join(base, p))).digest('hex')]];
  });
  const prior = tree(join(root, oldRoot));
  const ordinaryMode = (fs.statSync(dir).mode & 0o777) ^ 0o040;
  if (variant === 'mode') prior.find(entry => entry[0] === 'configuracao')[2] = 0o1700;
  if (variant === 'ordinary') prior.find(entry => entry[0] === 'configuracao')[2] = ordinaryMode;
  const paths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'AGENTS.md', 'README.md'];
  const snapshots = new Map(paths.map(p => [p, read(root, p)]));
  const origWrite = fs.writeFileSync, origSpawn = childProcess.spawnSync;
  let injected = false, failedProbe = false;
  t.mock.method(fs, 'writeFileSync', (file, ...args) => {
    if (!injected && String(file).includes('/.agent-tests/agentdevkit/backups/')) {
      injected = true;
      if (variant === 'present') assert.equal(xattr('-w', xattrName, xattrValue, dir).status, 0);
      if (variant === 'mode') { fs.chmodSync(dir, 0o1700); assert.equal(fs.statSync(dir).mode & 0o7777, 0o1700); }
      if (variant === 'ordinary') { fs.chmodSync(dir, ordinaryMode); assert.equal(fs.statSync(dir).mode & 0o7777, ordinaryMode); }
    }
    return origWrite(file, ...args);
  });
  t.mock.method(childProcess, 'spawnSync', (command, args, opts) => {
    if (variant === 'unknown' && injected && command === '/usr/bin/xattr' && args.includes(dir)) {
      failedProbe = true;
      return { status: null, signal: 'SIGTERM', stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
    }
    return origSpawn(command, args, opts);
  });
  syncBuiltinESMExports(); let error;
  try { applyPlan(plan); } catch (e) { error = e; } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(injected, true, error?.stack); if (variant === 'unknown') assert.equal(failedProbe, true);
  const expected = { present: ['E_PROTECTED_METADATA', 'xattr-directory-present'], unknown: ['E_METADATA_UNSUPPORTED', 'xattr-directory-unverified'], mode: ['E_PROTECTED_METADATA', 'special-mode-directory'], ordinary: ['E_CHANGED', undefined] }[variant];
  assert.equal(error?.code, expected[0]);
  if (variant === 'ordinary') assert.match(error.message, /State directory mode changed during migration/);
  else { assert.equal(error.path, relative); assert.equal(error.metadataReason, expected[1]); assert.equal(error.metadataTargetVerified, true); }
  assert.equal(existsSync(join(root, newRoot)), false); assert.deepEqual(tree(join(root, oldRoot)), prior);
  for (const [p, value] of snapshots) assert.deepEqual(read(root, p), value, p);
  if (variant === 'present') { const attr = xattr('-p', xattrName, dir); assert.equal(attr.status, 0); assert.equal(attr.stdout.toString().trim(), xattrValue); }
  const backup = error.uncertainPaths?.find(p => p.startsWith('.agent-tests/agentdevkit/backups/'));
  assert.ok(backup, 'backup preservado é informado');
  assert.deepEqual(read(root, `${backup}/${relative}/ESTADO.md`), f.config);
  assert.equal(error instanceof AggregateError, false, 'rollback não deve registrar erros agrupados');
  const diagnostics = collectErrorDiagnostics(error);
  assert.equal(error.recovery.status, 'pending');
  assert.ok(existsSync(join(error.recovery.backup, 'manifest.json')));
  assert.deepEqual(diagnostics.preservedPaths, [backup, error.recovery.backup]);
  assert.deepEqual(diagnostics.cleanupFailures, []);
  assert.equal(diagnostics.truncated, false);
  assert.equal(diagnostics.possiblePartial, true);
});
