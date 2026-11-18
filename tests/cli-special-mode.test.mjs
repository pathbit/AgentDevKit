import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {chmodSync,existsSync,linkSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {testGitConfig} from '../.pbai4devs/scripts/lib/test-git-environment.mjs';
const cli=resolve(dirname(fileURLToPath(import.meta.url)),'../bin/agentdevkit.mjs');
const sha=x=>createHash('sha256').update(x).digest('hex');
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^GIT_|^NODE_OPTIONS$/i.test(k)));
Object.assign(env,{GIT_CONFIG_GLOBAL:testGitConfig,GIT_CONFIG_NOSYSTEM:'1',GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0'});
for (const [language, expected] of [['pt', 'hardlinks compartilhados'], ['en', 'shared hardlinks'], ['es', 'enlaces físicos compartidos']]) for (const json of [false, true]) {
 test(`init informa hardlink protegido em ${language} json=${json}`, {timeout:240000}, t=>{
  const root=mkdtempSync(join(tmpdir(),'adk-cli-hardlink-')); t.after(()=>rmSync(root,{recursive:true,force:true}));
  const run=(bin,args)=>spawnSync(bin,args,{cwd:root,env,encoding:'utf8',timeout:180000,maxBuffer:12*1024*1024});
  assert.equal(run('git',['init','--quiet']).status,0);
  const target=join(root,'AGENTS.md'), other=join(root,'humano.md');
  writeFileSync(target,'# Instruções humanas\n');
  try { linkSync(target,other); } catch(error) {
   if(['ENOTSUP','EOPNOTSUPP','ENOSYS'].includes(error.code)||process.platform==='win32'&&['EPERM','EACCES'].includes(error.code)){t.skip('Hardlink indisponível');return;} throw error;
  }
  const before=readFileSync(target), identity=lstatSync(target,{bigint:true});
  assert.ok(identity.nlink>=2n);
  const result=run(process.execPath,[cli,'init','--target',root,'--agents','codex','--yes','--lang',language,...(json?['--json']:[])]);
  assert.ok(result.status>0, result.stdout+'\n'+result.stderr);
  if(json){const body=JSON.parse(result.stdout);assert.equal(body.error.code,'E_PROTECTED_METADATA');assert.equal(body.error.path,'AGENTS.md');assert.equal(body.error.metadataReason,'hardlink-shared');}
  else {assert.ok(result.stdout.includes(expected),result.stdout);assert.ok(result.stdout.includes('AGENTS.md'));}
  assert.deepEqual(readFileSync(target),before);assert.deepEqual(readFileSync(other),before);
  assert.equal(lstatSync(target,{bigint:true}).ino,identity.ino);assert.equal(lstatSync(other,{bigint:true}).ino,identity.ino);
 });
}
function snapshot(root){const rows=[];function visit(p){const full=p?join(root,p):root,s=lstatSync(full);assert.ok(!s.isSymbolicLink()&&(s.isFile()||s.isDirectory()),`tipo inesperado ${p}`);rows.push([p,s.isDirectory()?'d':'f',s.mode&0o7777,s.isFile()?sha(readFileSync(full)):null]);if(s.isDirectory())for(const n of readdirSync(full).sort())visit(p?`${p}/${n}`:n)}visit('');return rows;}
function prepare(t,mode,unaffected=false,bit=0o1000,requireBit=false){
 const root=mkdtempSync(join(tmpdir(),'adk-cli-mode-fixture-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const run=(bin,args)=>spawnSync(bin,args,{cwd:root,env,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
 const ok=(bin,args)=>{const r=run(bin,args);assert.equal(r.status,0,r.stderr+'\n'+r.stdout);return r};
 const put=(p,c)=>{mkdirSync(dirname(join(root,p)),{recursive:true});writeFileSync(join(root,p),c)};
 ok('git',['init','--quiet']);put('.gitignore','# regra humana\nprivate/\n');put('HUMAN.md','staged\n');ok('git',['add','--','.gitignore','HUMAN.md']);put('HUMAN.md','staged\nunstaged\n');
 assert.equal(ok('git',['show',':HUMAN.md']).stdout,'staged\n','índice deve conter a versão staged');
 let target;
 if(mode==='init') {target='AGENTS.md';put(target,'# Equipe\n\nInstrução humana preexistente.\n');}
 else {ok(process.execPath,[cli,'init','--target',root,'--agents','gemini','--yes','--json']);target='.pbai4devs/state/agentdevkit.json';}
 const special=unaffected?'HUMAN.md':target;chmodSync(join(root,special),bit|0o644);
 if((lstatSync(join(root,special)).mode&0o7000)!==bit){if(requireBit||process.env.ADK_STRICT_RECOVERY_TEST==='1')assert.fail(`filesystem não preservou o bit sintético ${bit.toString(8)}`);t.skip(`filesystem não preservou o bit sintético ${bit.toString(8)}`);return null;}
 const args=mode==='init'?['init','--target',root,'--agents','gemini','--yes','--json']: [mode,'--target',root,'--lang','en','--yes','--json'];
 return {root,run,target,special,args,before:snapshot(root)};
}
const unsupported=!['darwin','linux'].includes(process.platform);
for(const mode of ['init','update','sync'])for(const force of [false,true])test(`${mode}${force?' --force':''} recusa bit especial em alvo real antes de backup`,{timeout:240000,skip:unsupported&&'somente POSIX macOS/Linux'},t=>{
 const f=prepare(t,mode);if(!f)return;const r=f.run(process.execPath,[cli,...f.args,...(force?['--force']:[])]);assert.ok(r.status>0,`esperada recusa: ${r.stdout} ${r.stderr}`);assert.equal(r.signal,null);const out=JSON.parse(r.stdout);assert.equal(out.ok,false);assert.equal(out.error?.code,'E_PROTECTED_METADATA');assert.equal(out.error?.path,f.target);assert.deepEqual(snapshot(f.root),f.before,'bytes, modos e árvore Git devem ser preservados');
});
for(const [label,bit] of [['setuid',0o4000],['setgid',0o2000]])test(`update recusa ${label} em alvo regular planejado`,{timeout:240000,skip:unsupported&&'somente POSIX macOS/Linux'},t=>{
 const f=prepare(t,'update',false,bit,true);assert.ok(f);assert.equal(lstatSync(join(f.root,f.target)).mode&0o7000,bit);
 const r=f.run(process.execPath,[cli,...f.args]);assert.ok(r.status>0);assert.equal(r.signal,null);const out=JSON.parse(r.stdout);assert.equal(out.ok,false);assert.equal(out.error?.code,'E_PROTECTED_METADATA');assert.equal(out.error?.path,f.target);assert.deepEqual(snapshot(f.root),f.before);
});
test('erro em texto informa caminho e motivo sem mutação',{timeout:240000,skip:unsupported&&'somente POSIX macOS/Linux'},t=>{
 const f=prepare(t,'update');if(!f)return;const r=f.run(process.execPath,[cli,...f.args.filter(arg=>arg!=='--json')]);assert.ok(r.status>0);assert.match(r.stdout,/special POSIX mode bits/);assert.ok(r.stdout.includes(f.target));assert.deepEqual(snapshot(f.root),f.before);
});
test('bit especial em arquivo não afetado não bloqueia update real',{timeout:240000,skip:unsupported&&'somente POSIX macOS/Linux'},t=>{
 const f=prepare(t,'update',true);if(!f)return;const previous=readFileSync(join(f.root,f.target));const r=f.run(process.execPath,[cli,...f.args]);assert.equal(r.status,0,r.stdout+'\n'+r.stderr);assert.equal(JSON.parse(r.stdout).ok,true);assert.notDeepEqual(readFileSync(join(f.root,f.target)),previous);assert.equal(lstatSync(join(f.root,f.special)).mode&0o7777,0o1644);assert.equal(readFileSync(join(f.root,f.special),'utf8'),'staged\nunstaged\n');
});
test('alvo real sem bit especial é atualizado normalmente',{timeout:240000,skip:unsupported&&'somente POSIX macOS/Linux'},t=>{
 const f=prepare(t,'update');if(!f)return;chmodSync(join(f.root,f.target),0o644);const previous=readFileSync(join(f.root,f.target));const r=f.run(process.execPath,[cli,...f.args]);assert.equal(r.status,0,r.stdout+'\n'+r.stderr);assert.equal(JSON.parse(r.stdout).ok,true);assert.notDeepEqual(readFileSync(join(f.root,f.target)),previous);assert.equal(lstatSync(join(f.root,f.target)).mode&0o7777,0o644);
});
for(const [label,bit] of [['sticky',0o1000],['setgid',0o2000],['setuid',0o4000]])for(const force of [false,true])test(`agents recusa remoção planejada com ${label}${force?' --force':''}`,{timeout:240000,skip:unsupported&&'somente POSIX macOS/Linux'},t=>{
 const root=mkdtempSync(join(tmpdir(),'adk-cli-removal-fixture-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const run=(bin,args)=>{const r=spawnSync(bin,args,{cwd:root,env,encoding:'utf8',timeout:180000,maxBuffer:12*1024*1024});assert.equal(r.error,undefined,r.error?.message);assert.equal(r.signal,null);return r;};
 const ok=(bin,args)=>{const r=run(bin,args);assert.equal(r.status,0,r.stdout+'\n'+r.stderr);return r;};
 const put=(p,c)=>{const f=join(root,p);mkdirSync(dirname(f),{recursive:true});writeFileSync(f,c)};
 const target='.gemini/commands/revisar-entrega.toml',state='.pbai4devs/state/agentdevkit.json';
 ok('git',['init','--quiet']);put('.gitignore','# regra humana\nprivate/\n');put('HUMAN.md','staged\n');ok('git',['add','--','.gitignore','HUMAN.md']);put('HUMAN.md','staged\nunstaged\n');
 assert.equal(ok('git',['show',':HUMAN.md']).stdout,'staged\n','índice deve conter a versão staged');
 const gitPaths=['.git/index','.git/HEAD','.git/config','.git/info/exclude','.gitignore','HUMAN.md'];const beforeInit=Object.fromEntries(gitPaths.map(p=>[p,sha(readFileSync(join(root,p)))]));
 ok(process.execPath,[cli,'init','--target',root,'--agents','gemini,codex','--yes','--json']);
 for(const p of gitPaths)assert.equal(sha(readFileSync(join(root,p))),beforeInit[p],`init preserva ${p}`);
 assert.equal(JSON.parse(readFileSync(join(root,state))).files[target],sha(readFileSync(join(root,target))),'alvo deve estar registrado como gerenciado');
 chmodSync(join(root,target),bit|0o644);
 if((lstatSync(join(root,target)).mode&0o7000)!==bit){if(process.env.ADK_STRICT_RECOVERY_TEST==='1')assert.fail(`filesystem não preservou ${label}`);t.skip(`filesystem não preservou ${label}`);return;}
 const before=snapshot(root),common=['agents','codex','--target',root,'--yes','--json',...(force?['--force']:[])];
 const preview=JSON.parse(ok(process.execPath,[cli,...common,'--dry-run']).stdout);
 assert.ok(preview.plan.some(item=>item.path===target&&item.action==='remove'),'remoção deve estar no plano');assert.deepEqual(snapshot(root),before);
 const r=run(process.execPath,[cli,...common]);assert.ok(r.status>0);const result=JSON.parse(r.stdout);
 assert.equal(result.ok,false);assert.equal(result.error?.code,'E_PROTECTED_METADATA');assert.equal(result.error?.path,target);assert.deepEqual(snapshot(root),before);
 assert.equal(ok('git',['show',':HUMAN.md']).stdout,'staged\n','recusa deve preservar o conteúdo staged');
});
