import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {existsSync,readFileSync,renameSync,unlinkSync} from 'node:fs';import {join} from 'node:path';import {spawnSync} from 'node:child_process';
import {planInstallation,applyPlan} from '../src/install.mjs';import {fixture,put,cli} from './fixtures/client-selection-helpers.mjs';
const target='.agents/skills/projeto/configurar-projeto/SKILL.md',state='.pbai4devs/state/agentdevkit.json',legacyState='.pbai4devs/estado/agentdevkit.json',legacyDerived='.pbai4devs/estado/derived.json';
const read=(root,path)=>existsSync(join(root,path))?readFileSync(join(root,path)):null;
const git=(root,...args)=>{const r=spawnSync('git',['-C',root,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr)};
const snapshot=root=>Object.fromEntries(['.git/index','.git/config','.git/info/exclude','.gitignore','HUMAN.md',target,legacyState,legacyDerived].map(path=>[path,read(root,path)]));
test("Reactivation correlated in migration refusal before changing status and index", {timeout:180000}, t=>{
 for(const staged of [false,true]){
  const root=fixture(t);put(root,'.gitignore','# humano\n');put(root,'HUMAN.md','# humano staged\n');git(root,'add','--','.gitignore','HUMAN.md');cli(root,['init','--agents','codex']);
  const s=JSON.parse(read(root,state)),digest=s.files[target];assert.ok(digest);assert.ok(read(root,target));
  const old='.pbai4devs/state/derived.json',d=read(root,old)?JSON.parse(read(root,old)):{schemaVersion:1,entries:{}};
  d.removedFiles={...d.removedFiles,[target]:digest};d.humanNote={text:'decisão humana sintética'};put(root,old,JSON.stringify(d,null,2)+'\n');
  renameSync(join(root,'.pbai4devs/state'),join(root,'.pbai4devs/estado'));unlinkSync(join(root,target));
  if(staged)git(root,'add','-f','--',legacyDerived);
  const before=snapshot(root);assert.equal(existsSync(join(root,'.pbai4devs/state')),false);
  for(const force of [false,true]){
   assert.throws(()=>planInstallation({target:root,mode:'update',language:'pt',force}),e=>e.code==='E_MIGRATION_REVIEW'&&e.message.includes(target));
   assert.deepEqual(snapshot(root),before);assert.equal(existsSync(join(root,'.pbai4devs/state')),false);
  }
  if(!staged)for(const [language,expected] of [['pt','Migração interrompida'],['en','Migration stopped'],['es','Migración detenida']]){
   const result=cli(root,['update','--lang',language],1);assert.equal(result.error.code,'E_MIGRATION_REVIEW');assert.ok(result.message.includes(expected));assert.deepEqual(snapshot(root),before);
  }
 }
});

test("independent migration preserves unknown brand and human file out of selection", {timeout:180000}, t=>{
 const root=fixture(t),human='.claude/skills/equipe/SKILL.md',old='.pbai4devs/state/derived.json';
 put(root,'.gitignore','# humano\n');put(root,'HUMAN.md','# staged\n');git(root,'add','--','.gitignore','HUMAN.md');cli(root,['init','--agents','codex']);
 const d=read(root,old)?JSON.parse(read(root,old)):{schemaVersion:1,entries:{}};d.removedFiles={...d.removedFiles,[human]:'a'.repeat(64)};d.humanNote={text:'decisão humana sintética'};
 put(root,old,JSON.stringify(d,null,2)+'\n');put(root,human,'# instruções humanas\n');renameSync(join(root,'.pbai4devs/state'),join(root,'.pbai4devs/estado'));
 git(root,'add','-f','--',legacyDerived);const index=read(root,'.git/index'),prior=read(root,legacyDerived),own=read(root,human),ignore=read(root,'.gitignore');
 const plan=planInstallation({target:root,mode:'update',language:'pt'});assert.equal(plan.canApply,true);applyPlan(plan);
 assert.deepEqual(read(root,'.pbai4devs/state/derived.json'),prior);assert.deepEqual(read(root,human),own);assert.deepEqual(read(root,'.git/index'),index);assert.deepEqual(read(root,'.gitignore'),ignore);
 assert.equal(existsSync(join(root,'.pbai4devs/estado')),false);
});

test("independent migration preserves correlated marker outside selection", {timeout:180000}, t=>{
 const root=fixture(t),old='.pbai4devs/state/derived.json';
 put(root,'.gitignore','# humano\n');put(root,'HUMAN.md','# staged\n');git(root,'add','--','.gitignore','HUMAN.md');cli(root,['init','--agents','codex']);
 const s=JSON.parse(read(root,state)),digest=s.files[target];assert.ok(digest);
 const d=read(root,old)?JSON.parse(read(root,old)):{schemaVersion:1,entries:{}};d.removedFiles={...d.removedFiles,[target]:digest};d.humanNote={text:'sintético'};
 put(root,old,JSON.stringify(d,null,2)+'\n');renameSync(join(root,'.pbai4devs/state'),join(root,'.pbai4devs/estado'));unlinkSync(join(root,target));
 git(root,'add','-f','--',legacyDerived);const before={index:read(root,'.git/index'),config:read(root,'.git/config'),exclude:read(root,'.git/info/exclude'),ignore:read(root,'.gitignore'),human:read(root,'HUMAN.md'),derived:read(root,legacyDerived)};
 const plan=planInstallation({target:root,mode:'update',clients:['cursor']});assert.equal(plan.canApply,true);assert.equal(plan.changes.some(item=>item.path===target&&item.action==='create'),false);applyPlan(plan);
 assert.deepEqual(read(root,'.git/index'),before.index);assert.deepEqual(read(root,'.git/config'),before.config);assert.deepEqual(read(root,'.git/info/exclude'),before.exclude);assert.deepEqual(read(root,'.gitignore'),before.ignore);assert.deepEqual(read(root,'HUMAN.md'),before.human);assert.deepEqual(read(root,'.pbai4devs/state/derived.json'),before.derived);assert.equal(read(root,target),null);
});

test("Tombstone with different target box planned causes review", {timeout:180000}, t=>{
 const root=fixture(t),old='.pbai4devs/state/derived.json',alias=target.replace('/SKILL.md','/skill.md');
 put(root,'.gitignore','# humano\n');put(root,'HUMAN.md','# staged\n');git(root,'add','--','.gitignore','HUMAN.md');cli(root,['init','--agents','codex']);
 const s=JSON.parse(read(root,state)),digest=s.files[target];assert.ok(digest);delete s.files[target];s.files[alias]=digest;put(root,state,JSON.stringify(s,null,2)+'\n');
 const d=read(root,old)?JSON.parse(read(root,old)):{schemaVersion:1,entries:{}};d.removedFiles={...d.removedFiles,[alias]:digest};put(root,old,JSON.stringify(d,null,2)+'\n');
 renameSync(join(root,'.pbai4devs/state'),join(root,'.pbai4devs/estado'));unlinkSync(join(root,target));
 const before=snapshot(root);assert.throws(()=>planInstallation({target:root,mode:'update'}),e=>e.code==='E_MIGRATION_REVIEW');assert.deepEqual(snapshot(root),before);
});
