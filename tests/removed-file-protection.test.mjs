import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {planInstallation,applyPlan,inspect} from '../src/install.mjs';
import {synchronize} from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import {fixture,put,cli} from './fixtures/client-selection-helpers.mjs';
const target='.agents/skills/projeto/configurar-projeto/SKILL.md',state='.pbai4devs/state/agentdevkit.json',derived='.pbai4devs/state/derived.json';
const read=(r,p)=>existsSync(join(r,p))?readFileSync(join(r,p)):null;
const snapshot=r=>Object.fromEntries(['.git/index','.git/config','.git/info/exclude','.gitignore',target,state,derived].map(p=>[p,read(r,p)]));
const git=(r,...args)=>{const c=spawnSync('git',['-C',r,...args],{encoding:'utf8'});assert.equal(c.status,0,c.stderr)};
function prepare(t){const root=fixture(t);put(root,'.gitignore','# fixture\n');git(root,'add','--','.gitignore');cli(root,['init','--agents','codex']);return root}
function seed(root,unknown){const s=JSON.parse(read(root,state)),digest=s.files[target];assert.ok(digest);const d=read(root,derived)?JSON.parse(read(root,derived)):{schemaVersion:1,entries:{}};d.removedFiles={...d.removedFiles,[target]:digest};if(unknown){delete s.files[target];put(root,state,JSON.stringify(s,null,2)+'\n')}put(root,derived,JSON.stringify(d,null,2)+'\n');return digest}

test('correlacionado ausente é recriado e consolidado sem alterar índice', {timeout:180000}, t=>{
 const root=prepare(t),digest=seed(root,false),index=read(root,'.git/index');unlinkSync(join(root,target));
 const plan=planInstallation({target:root,mode:'update',language:'pt'});assert.equal(plan.canApply,true);assert.equal(plan.changes.find(x=>x.path===target)?.action,'create');applyPlan(plan);
 assert.ok(read(root,target));assert.equal(JSON.parse(read(root,state)).files[target],digest);assert.ok(!Object.hasOwn(JSON.parse(read(root,derived)).removedFiles??{},target));assert.ok(!inspect(root).issues.some(x=>x.path===target));assert.deepEqual(read(root,'.git/index'),index);
 assert.equal(cli(root,['sync','--check']).ok,true);assert.deepEqual(read(root,'.git/index'),index);
});

test('desconhecido selecionado mantém plano legado mas não pode ser aplicado com ou sem force', {timeout:180000}, t=>{
 const root=prepare(t);seed(root,true);put(root,target,'# humano sintético\n');git(root,'add','-f','--',target);put(root,target,'# humano sintético com edição não staged\n');const before=snapshot(root);
 for(const force of [false,true]){
  const direct=synchronize({root,check:true,localIgnores:false,generateEntrypoints:false,force,output(){}});assert.equal(direct.exitCode,1);assert.ok(direct.unverifiedRemovals.includes(target));
  assert.throws(()=>synchronize({root,localIgnores:false,generateEntrypoints:false,force,output(){}}), /Indice Git|historico de remocao pendente/i);
  try { const plan=planInstallation({target:root,mode:'sync',force,language:'pt'});assert.equal(plan.canApply,false);assert.ok(plan.conflicts.includes(target));assert.throws(()=>applyPlan(plan),{code:'E_CONFLICT'}); }
  catch(error){if(error.code!=='E_STAGED')throw error}
  assert.deepEqual(snapshot(root),before);
 }
});

test('apontamento igual ao gerado com remoção desconhecida continua bloqueado', {timeout:180000}, t=>{
 const donor=prepare(t),reference=read(donor,target),root=prepare(t);assert.deepEqual(read(root,target),reference);seed(root,true);const before=snapshot(root);
 for(const force of [false,true]){
  const plan=planInstallation({target:root,mode:'sync',force,language:'pt'});
  assert.equal(plan.canApply,false);assert.ok(plan.conflicts.includes(target));
  assert.equal(plan.preserved.find(x=>x.path===target)?.reason,'existing-file-extended');
  assert.equal(plan.changes.find(x=>x.path===target)?.action,'update');
  assert.throws(()=>applyPlan(plan),{code:'E_CONFLICT'});assert.deepEqual(snapshot(root),before);
 }
});

test('registro desconhecido fora da seleção sobrevive a operações independentes', {timeout:180000}, t=>{
 const root=prepare(t),path='.claude/skills/equipe/SKILL.md',human='# registro humano sintético\n';put(root,path,human);
 const d=read(root,derived)?JSON.parse(read(root,derived)):{schemaVersion:1,entries:{}};d.removedFiles={...d.removedFiles,[path]:'a'.repeat(64)};d.humanNote={value:'manter sintético'};put(root,derived,JSON.stringify(d,null,2)+'\n');
 const before=Object.fromEntries(['.git/index','.git/config','.git/info/exclude','.gitignore',path].map(p=>[p,read(root,p)]));
 const preserved=()=>{const d=JSON.parse(read(root,derived));assert.equal(d.removedFiles[path],'a'.repeat(64));assert.deepEqual(d.humanNote,{value:'manter sintético'});assert.deepEqual(Object.fromEntries(Object.keys(before).map(p=>[p,read(root,p)])),before)};
 assert.equal(synchronize({root,localIgnores:false,generateEntrypoints:false,output(){}}).exitCode,0);preserved();
 const direct=synchronize({root,check:true,localIgnores:false,generateEntrypoints:false,output(){}});assert.equal(direct.exitCode,1);assert.ok(direct.unverifiedRemovals.includes(path));preserved();
 for(const args of [['init','--agents','codex'],['update'],['sync']]){assert.equal(cli(root,args).ok,true);preserved()}
 const checked=cli(root,['sync','--check'],1);assert.ok(checked.issues.some(item=>item.code==='removed-file-unverified'&&item.path===path));preserved();
});
