import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planInstallation, applyPlan } from '../src/install.mjs';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';

const pkg=fileURLToPath(new URL('..', import.meta.url)), cli=join(pkg,'bin/agentdevkit.mjs');
function put(root,p,text){const f=join(root,p);fs.mkdirSync(dirname(f),{recursive:true});fs.writeFileSync(f,text);}
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'adk-hardlink-plan-')));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const run=(bin,args)=>spawnSync(bin,args,{cwd:root,env:process.env,encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024});
 const git=(...args)=>{const r=run('git',args);assert.equal(r.status,0,r.stderr);return r};
 git('init','-q','--template=');put(root,'.gitignore','# humano\n');put(root,'humano.txt','staged\n');git('add','.gitignore','humano.txt');fs.appendFileSync(join(root,'humano.txt'),'unstaged\n');
 const r=run(process.execPath,[cli,'init','--target',root,'--agents','claude','--yes','--json']);
 assert.equal(r.status,0,r.stdout+r.stderr);
 const skill='.pbai4devs/skills/demo/SKILL.md',target='.claude/skills/demo/SKILL.md';
 put(root,skill,'---\nname: demo\ndescription: Original.\n---\n\n# Demo\n');
 const options={root,localIgnores:false,generateEntrypoints:false,output(){}};
 synchronize(options);
 const other=join(root,'outro-humano.md');
 try{fs.linkSync(join(root,target),other);}catch(e){if(['ENOTSUP','EOPNOTSUPP','ENOSYS'].includes(e.code)||process.platform==='win32'&&['EPERM','EACCES'].includes(e.code)){t.skip('hardlink indisponível');return null;}throw e;}
 assert.ok(fs.statSync(join(root,target)).nlink>=2);
 return {root,run,skill,target,other,options};
}
function snap(f){return ['.git/index','.git/config','.git/info/exclude','.gitignore','humano.txt',f.target,'outro-humano.md'].map(p=>fs.existsSync(join(f.root,p))?fs.readFileSync(join(f.root,p)):null);}
test('check direto identifica hardlink somente quando há alteração planejada',t=>{
 const f=fixture(t);if(!f)return;const before=snap(f);
 const clean=synchronize({...f.options,check:true});assert.deepEqual(clean.hardlinkBlockers,[]);
 put(f.root,f.skill,'---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
 let output='';const result=synchronize({...f.options,check:true,output:s=>{output+=s}});
 assert.equal(result.exitCode,1);assert.deepEqual(result.hardlinkBlockers,[f.target]);assert.ok(output.includes(f.target));
 assert.deepEqual(snap(f),before);
});
test('plano real e CLI sync --check identificam hardlink do alvo planejado',t=>{
 const f=fixture(t);if(!f)return;put(f.root,f.skill,'---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
 const before=snap(f),plan=planInstallation({target:f.root,mode:'sync'});
 assert.ok(plan.changes.some(x=>x.path===f.target));assert.equal(plan.canApply,false);
 assert.deepEqual(plan.hardlinkBlockers,[{path:f.target,code:'hardlink-shared'}]);
 assert.throws(()=>applyPlan(plan),e=>e.code==='E_PROTECTED_METADATA'&&e.path===f.target);
 const out=f.run(process.execPath,[cli,'sync','--check','--target',f.root,'--json']);
 assert.equal(out.status,1,out.stdout+out.stderr);const result=JSON.parse(out.stdout);
 assert.equal(result.error.code,'E_PROTECTED_METADATA');assert.equal(result.error.path,f.target);
 assert.ok(result.issues.some(x=>x.path===f.target&&x.code==='hardlink-shared'));
 assert.deepEqual(snap(f),before);
});
test('hardlink não afetado não é bloqueador do plano',t=>{
 const f=fixture(t);if(!f)return;const plan=planInstallation({target:f.root,mode:'sync'});
 assert.equal(plan.hardlinkBlockers.some(x=>x.path===f.target),false);
});
test('link removido depois do plano não é declarado verificado',t=>{
 const f=fixture(t);if(!f)return;put(f.root,f.skill,'---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
 const plan=planInstallation({target:f.root,mode:'sync'});
 assert.deepEqual(plan.conflicts,[]);assert.deepEqual(plan.hardlinkBlockers,[{path:f.target,code:'hardlink-shared'}]);
 fs.unlinkSync(f.other);const before=snap(f);
 assert.throws(()=>applyPlan(plan),e=>e.code==='E_CHANGED'&&e.metadataTargetVerified!==true);
 assert.deepEqual(snap(f),before);
});
test('link criado depois do plano é recusado antes da escrita',t=>{
 const f=fixture(t);if(!f)return;fs.unlinkSync(f.other);
 put(f.root,f.skill,'---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
 const plan=planInstallation({target:f.root,mode:'sync'});
 assert.equal(plan.canApply,true,JSON.stringify(plan.conflicts));assert.ok(plan.changes.some(x=>x.path===f.target));
 fs.linkSync(join(f.root,f.target),f.other);const before=snap(f);
 assert.throws(()=>applyPlan(plan),e=>e.code==='E_PROTECTED_METADATA'&&e.path===f.target&&e.metadataTargetVerified===true);
 assert.deepEqual(snap(f),before);
});
test('conflito humano e hardlink planejado são relatados sem perder o conflito',t=>{
 const f=fixture(t);if(!f)return;
 const source='.pbai4devs/skills/outra/SKILL.md', conflict='.claude/skills/outra/SKILL.md';
 put(f.root,source,'---\nname: outra\ndescription: Outro recurso.\n---\n\n# Outro\n');
 synchronize(f.options);
 fs.appendFileSync(join(f.root,conflict),'\n# Edição humana\n');
 put(f.root,f.skill,'---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
 const before=snap(f), humanBefore=fs.readFileSync(join(f.root,conflict));
 const plan=planInstallation({target:f.root,mode:'sync'});
 assert.ok(plan.conflicts.includes(conflict),JSON.stringify(plan.conflicts));
 assert.deepEqual(plan.hardlinkBlockers,[{path:f.target,code:'hardlink-shared'}]);
 assert.equal(plan.canApply,false);assert.throws(()=>applyPlan(plan),e=>e.code==='E_CONFLICT');
 const out=f.run(process.execPath,[cli,'sync','--check','--target',f.root,'--json']);
 assert.equal(out.status,1,out.stdout+out.stderr);const result=JSON.parse(out.stdout);
 assert.ok(result.conflicts.includes(conflict));assert.ok(result.issues.some(x=>x.path===f.target&&x.code==='hardlink-shared'));
 assert.notEqual(result.error?.code,'E_PROTECTED_METADATA');
 for(const [language,label] of [['pt','hardlinks compartilhados'],['en','shared hardlinks'],['es','enlaces físicos compartidos']]) {
  const human=f.run(process.execPath,[cli,'sync','--check','--target',f.root,'--lang',language]);
  assert.equal(human.status,1,human.stdout+human.stderr);assert.ok(human.stdout.includes(label),human.stdout);
 }
 assert.deepEqual(fs.readFileSync(join(f.root,conflict)),humanBefore);assert.deepEqual(snap(f),before);
});

test('doctor e dry-run identificam hardlink nos três idiomas', {timeout:240000}, t=>{
 const f=fixture(t);if(!f)return;
 put(f.root,f.skill,'---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
 const before=snap(f);
 for(const [language,label] of [['pt','hardlinks compartilhados'],['en','shared hardlinks'],['es','enlaces físicos compartidos']]) for(const command of ['doctor','sync']){
  const args=[command,...(command==='sync'?['--dry-run']:[]),'--target',f.root,'--lang',language];
  const human=f.run(process.execPath,[cli,...args]);assert.equal(human.status,1,human.stdout+human.stderr);
  assert.ok(human.stdout.includes(label),human.stdout);
  const json=f.run(process.execPath,[cli,...args,'--json']);assert.equal(json.status,1,json.stdout+json.stderr);
  const result=JSON.parse(json.stdout);assert.ok(result.issues.some(x=>x.path===f.target&&x.code==='hardlink-shared'));
  assert.deepEqual(snap(f),before);
 }
});

test('plano e check distinguem contagem não verificada', {timeout:240000}, t=>{
 const f=fixture(t);if(!f)return;
 put(f.root,f.skill,'---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
 const target=join(f.root,f.target), before=snap(f), lstat=fs.lstatSync;let injected=false;
 t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});
 t.mock.method(fs,'lstatSync',(path,...args)=>{const info=lstat(path,...args);if(path===target){injected=true;Object.defineProperty(info,'nlink',{value:0});}return info;});
 syncBuiltinESMExports();
 const check=synchronize({...f.options,check:true});
 assert.deepEqual(check.hardlinkUnverified,[f.target]);assert.equal(check.exitCode,1);
 const plan=planInstallation({target:f.root,mode:'sync'});
 assert.deepEqual(plan.hardlinkBlockers,[{path:f.target,code:'hardlink-unverified'}]);
 assert.equal(plan.canApply,false);
 assert.throws(()=>applyPlan(plan),error=>error.code==='E_METADATA_UNSUPPORTED'&&error.path===f.target&&error.metadataReason==='hardlink-unverified');
 t.mock.restoreAll();syncBuiltinESMExports();
 assert.ok(injected);assert.deepEqual(snap(f),before);
});

test('contagem que deixa de ser verificável após plano não confirma hardlink', {timeout:240000}, t=>{
 const f=fixture(t);if(!f)return;
 put(f.root,f.skill,'---\nname: demo\ndescription: Alterada.\n---\n\n# Demo\n');
 const before=snap(f),plan=planInstallation({target:f.root,mode:'sync'});
 assert.deepEqual(plan.hardlinkBlockers,[{path:f.target,code:'hardlink-shared'}]);
 const target=join(f.root,f.target),lstat=fs.lstatSync;let injected=false;
 t.after(()=>{t.mock.restoreAll();syncBuiltinESMExports();});
 t.mock.method(fs,'lstatSync',(path,...args)=>{const info=lstat(path,...args);if(path===target){injected=true;Object.defineProperty(info,'nlink',{value:undefined});}return info;});
 syncBuiltinESMExports();
 assert.throws(()=>applyPlan(plan),error=>error.code==='E_METADATA_UNSUPPORTED'&&error.path===f.target&&error.metadataReason==='hardlink-unverified');
 t.mock.restoreAll();syncBuiltinESMExports();assert.ok(injected);assert.deepEqual(snap(f),before);
});
