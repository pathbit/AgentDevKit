import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {chmodSync,existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {testGitConfig} from '../.pbai4devs/scripts/lib/test-git-environment.mjs';
const pkg=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cli=join(pkg,'bin/agentdevkit.mjs');
const source='.pbai4devs/commands/fixture-modo/COMMAND.md';
const target='.cursor/commands/fixture-modo.md';
const sha=x=>createHash('sha256').update(x).digest('hex');
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^GIT_|^NODE_OPTIONS$/i.test(k)));
Object.assign(env,{GIT_CONFIG_GLOBAL:testGitConfig,GIT_CONFIG_NOSYSTEM:'1',GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0'});
function snapshot(root){const rows=[];function visit(p){const full=p?join(root,p):root,s=lstatSync(full);assert.ok(!s.isSymbolicLink()&&(s.isFile()||s.isDirectory()),`tipo inesperado ${p}`);rows.push([p,s.isDirectory()?'d':'f',s.mode&0o7777,s.isFile()?sha(readFileSync(full)):null]);if(s.isDirectory())for(const n of readdirSync(full).sort())visit(p?`${p}/${n}`:n)}visit('');return rows;}
function prepare(t,action,protectedTarget=true){
 const root=mkdtempSync(join(tmpdir(),'adk-sync-mode-fixture-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const run=(bin,args)=>spawnSync(bin,args,{cwd:root,env,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
 const ok=(bin,args)=>{const r=run(bin,args);assert.equal(r.status,0,r.stderr+'\n'+r.stdout);return r};
 const put=(p,c)=>{mkdirSync(dirname(join(root,p)),{recursive:true});writeFileSync(join(root,p),c)};
 ok('git',['init','--quiet']);put('.gitignore','# regra humana\nprivate/\n');put('HUMAN.md','staged\n');ok('git',['add','--','.gitignore','HUMAN.md']);put('HUMAN.md','staged\nunstaged\n');
 ok(process.execPath,[cli,'init','--target',root,'--agents','cursor','--yes']);
 const script=join(root,'.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
 const command=d=>`---\ndescription: ${d}\n---\n\n# Comando sintético\n\nVerificar.\n`;
 put(source,command('Versão inicial'));ok(process.execPath,[script,'--root',root]);
 assert.ok(existsSync(join(root,target)), 'sync deve gerar alvo de teste');
 if(action==='remove')rmSync(join(root,source));else put(source,command('Versão alterada'));
 const special=protectedTarget?target:'HUMAN.md';chmodSync(join(root,special),0o1644);
 if((lstatSync(join(root,special)).mode&0o7000)!==0o1000){
  if(process.env.ADK_STRICT_RECOVERY_TEST==='1') assert.fail('filesystem não preservou o bit sticky sintético');
  t.skip('filesystem não preservou o bit sticky sintético');return null;
 }
 return {root,run,script,special,before:snapshot(root)};
}
const unsupported = !['darwin','linux'].includes(process.platform);
for(const action of ['update','remove']) for(const force of [false,true]) test(`recusa ${action}${force?' --force':''} com bit especial no arquivo alvo antes de alterações`,{timeout:240000,skip:unsupported && 'guarda POSIX implementada somente em macOS e Linux'},t=>{
 const f=prepare(t,action);if(!f)return;
 const run=f.run(process.execPath,[f.script,'--root',f.root,...(force?['--force']:[])]);
 assert.notEqual(run.status,0,'operação precisa ser recusada');assert.equal(run.signal,null);
 assert.equal(run.stderr.split(/\r?\n/)[0],`E_PROTECTED_METADATA: ${target}`);
 assert.deepEqual(snapshot(f.root),f.before,'snapshot inteiro incluindo Git e backups deve ser igual');
});
for(const [label,bit] of [['setuid',0o4000],['setgid',0o2000]]) test(`recusa update com ${label} no alvo`,{timeout:240000,skip:unsupported && 'guarda POSIX implementada somente em macOS e Linux'},t=>{
 const f=prepare(t,'update');if(!f)return;
 chmodSync(join(f.root,target),bit|0o644);
 if((lstatSync(join(f.root,target)).mode&0o7000)!==bit){
  if(process.env.ADK_STRICT_RECOVERY_TEST==='1') assert.fail(`filesystem não preservou ${label}`);
  t.skip(`filesystem não preservou ${label}`);return;
 }
 const before=snapshot(f.root),r=f.run(process.execPath,[f.script,'--root',f.root]);
 assert.notEqual(r.status,0);assert.equal(r.signal,null);
 assert.equal(r.stderr.split(/\r?\n/)[0],`E_PROTECTED_METADATA: ${target}`);
 assert.deepEqual(snapshot(f.root),before);
});
test('arquivo especial sem alteração planejada não bloqueia atualização normal',{timeout:240000,skip:unsupported && 'guarda POSIX implementada somente em macOS e Linux'},t=>{
 const f=prepare(t,'update',false);if(!f)return;
 const before=readFileSync(join(f.root,target)),mode=lstatSync(join(f.root,f.special)).mode&0o7777;
 const r=f.run(process.execPath,[f.script,'--root',f.root]);assert.equal(r.status,0,r.stdout+'\n'+r.stderr);
 assert.notDeepEqual(readFileSync(join(f.root,target)),before,'controle deve atualizar arquivo planejado');
 assert.equal(lstatSync(join(f.root,f.special)).mode&0o7777,mode);assert.equal(readFileSync(join(f.root,f.special),'utf8'),'staged\nunstaged\n');
});
test('arquivo planejado em modo comum é atualizado',{timeout:240000,skip:unsupported && 'guarda POSIX implementada somente em macOS e Linux'},t=>{
 const f=prepare(t,'update');if(!f)return;chmodSync(join(f.root,target),0o644);
 const before=readFileSync(join(f.root,target));const r=f.run(process.execPath,[f.script,'--root',f.root]);assert.equal(r.status,0,r.stdout+'\n'+r.stderr);
 assert.notDeepEqual(readFileSync(join(f.root,target)),before);assert.equal(lstatSync(join(f.root,target)).mode&0o7777,0o644);
});
