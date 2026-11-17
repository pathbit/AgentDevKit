import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { planInstallation } from '../src/install.mjs';
import { main } from '../src/cli.mjs';
import { collectErrorDiagnostics, primaryDiagnosticError } from '../.pbai4devs/scripts/lib/error-reporting.mjs';
import { fixture, put, cli } from './fixtures/client-selection-helpers.mjs';

for (const [variant,via] of [['plain','plan'],['frozen','plan'],['getter','plan'],['aggregate','plan'],['mixed','plan'],['proxy','plan'],['plain','cli'],['aggregate','cli'],['plain-cleanup','plan'],['plain-cleanup','cli'],['falsy-cleanup','plan'],['falsy-cleanup','cli'],['after-write','plan'],['after-write','cli'],['secret','plan'],['getter','cli'],['proxy','cli'],['secret','cli'],['getter','doctor'],['proxy','doctor'],['secret','doctor'],['proxy-prototype','plan'],['proxy-prototype','cli'],['proxy-prototype','doctor']]) test(`callback ${variant} via ${via}`, { timeout: 180000 }, async t => {
  const root=fixture(t),source='.pbai4devs/skills/projeto/configurar-projeto/SKILL.md',target='.agents/skills/projeto/configurar-projeto/SKILL.md';
  const git=(...args)=>{const r=spawnSync('git',['-C',root,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr)};
  put(root,'.gitignore','# sintético\n');put(root,'humano.txt','staged\n');git('add','--','.gitignore','humano.txt');put(root,'humano.txt','staged\nlocal\n');cli(root,['init','--agents','codex']);
  const text=fs.readFileSync(join(root,source),'utf8');assert(text.includes('description: Prepara um projeto'));put(root,source,text.replace('description: Prepara um projeto','description: Organiza um projeto'));
  const sync=spawnSync(process.execPath,[join(root,'.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'),'--root',root],{cwd:root,encoding:'utf8',timeout:180000});assert.equal(sync.status,0,sync.stderr);
  const paths=[target,source,'humano.txt','.gitignore','.git/index','.git/config','.git/info/exclude','.pbai4devs/state/agentdevkit.json','.pbai4devs/state/derived.json'];const before=new Map(paths.map(p=>[p,fs.readFileSync(join(root,p))]));
  const scratch=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'adk-callback-isolated-'))); const saved=Object.fromEntries(['TMPDIR','TMP','TEMP'].map(k=>[k,process.env[k]]));for(const k of Object.keys(saved))process.env[k]=scratch;
  const cleanupVariant=['plain-cleanup','falsy-cleanup'].includes(variant);
  const original=fs.lstatSync,originalRm=fs.rmSync,originalLink=fs.linkSync,originalRename=fs.renameSync,oldLimit=Error.stackTraceLimit;let fired=false,thrown,getterCalls=0,proxyTraps=0,cleanupHit=false,cleanupError,cleanupPath,stageTouched=false;Error.stackTraceLimit=80;
  try {
    for(const key of ['linkSync','renameSync']) { const fn=key==='linkSync'?originalLink:originalRename; fs[key]=function(from,to,...args){const result=fn.call(this,from,to,...args);if(String(to).startsWith(scratch+sep)&&(new Error().stack||'').includes('atomic'))stageTouched=true;return result} }
    fs.lstatSync=function(path,...args){const stack=new Error().stack||'';if(!fired&&(variant!=='after-write'||stageTouched)&&String(path).startsWith(root+sep)&&stack.includes('nativeOutputBoundary')&&stack.includes('synchronize')){fired=true;let error=Object.assign(new Error('PRIVATE_MARKER_SOURCE'),{code:'EACCES',path:join(root,'PRIVATE_PATH')});
      if(variant==='frozen')error=Object.freeze(error);
      if(variant==='secret')error.code='PRIVATE_CODE_SYNTHETIC_456';
      if(variant==='getter'){Object.defineProperty(error,'code',{get(){getterCalls++;throw new Error('GETTER_SECRET')}});Object.freeze(error);}
      if(variant==='aggregate'||variant==='mixed'){const secondary=Object.assign(new Error('PRIVATE_SECONDARY'),{uncertainPaths:['/PRIVATE_ORIGIN'],cleanupFailures:[{path:'/PRIVATE_STAGE',message:'PRIVATE_CLEANUP'}]});const outer=new AggregateError([error,secondary],'PRIVATE_AGGREGATE');if(variant==='mixed')outer.code='E_GIT';error=Object.freeze(outer);}
      if(variant==='proxy')error=new Proxy(error,{getOwnPropertyDescriptor(){proxyTraps++;throw Error('PROXY_PRIVATE')},getPrototypeOf(){proxyTraps++;throw Error('PROXY_PRIVATE')}});
      if(variant==='proxy-prototype'){delete error.code;const parent=new Proxy(Error.prototype,{getPrototypeOf(){proxyTraps++;throw Error('PROXY_PROTO_PRIVATE')},get(){proxyTraps++;throw Error('PROXY_PROTO_PRIVATE')},getOwnPropertyDescriptor(){proxyTraps++;throw Error('PROXY_PROTO_PRIVATE')}});Object.setPrototypeOf(error,parent);}
      thrown=error;throw error;}return original.call(this,path,...args)};
    fs.rmSync=function(path,...args){if(cleanupVariant && fired && !cleanupHit && String(path).startsWith(scratch+sep)){cleanupHit=true;cleanupPath=String(path);cleanupError=variant==='falsy-cleanup'?undefined:Object.assign(new Error('PRIVATE_CLEANUP_FAILURE'),{code:'EACCES'});throw cleanupError}return originalRm.call(this,path,...args)};syncBuiltinESMExports();
    let caught,output='',status;if(via==='plan'){try{planInstallation({target:root,mode:'sync',language:'pt'})}catch(error){caught=error}}
    else {status=await main([...(via==='doctor'?['doctor']:['sync','--check']),'--target',root,'--json'],{stdout:{write(value){output+=value}}});}
    assert(fired,'callback deve ser atingido');if(variant==='after-write')assert(stageTouched,'a fixture deve confirmar escrita anterior no stage');assert.equal(getterCalls,0);assert.equal(proxyTraps,0);
    const expected=variant==='mixed'?'E_GIT':['getter','proxy','secret','proxy-prototype','aggregate'].includes(variant)?'E_OPERATION':'EACCES';
    const stageExpected=['getter','aggregate','mixed','proxy','plain-cleanup','falsy-cleanup','after-write','secret','proxy-prototype'].includes(variant);
    if(via==='plan'){
      assert(caught);assert.equal(caught.code||'E_OPERATION',expected);assert.notEqual(caught.diagnosticsScope,'staging');assert.equal(primaryDiagnosticError(caught.cause).cause,thrown);assert.equal(caught.message,'Unable to inspect project output; review the project path.');
      if(cleanupVariant){assert.equal(cleanupHit,true);assert.ok(Object.hasOwn(caught,'cleanupError'));assert.equal(caught.cleanupError,cleanupError);assert.equal(Object.getOwnPropertyDescriptor(caught,'cleanupError').enumerable,false);assert(!JSON.stringify(caught).includes('PRIVATE_CLEANUP_FAILURE'));}
      const d=collectErrorDiagnostics(caught);assert.equal(d.preservedPaths.length,stageExpected?1:0);if(stageExpected){assert(d.preservedPaths[0].startsWith(scratch+sep));assert(fs.existsSync(d.preservedPaths[0]));}assert.equal(d.cleanupFailures.length,cleanupVariant?1:0);if(cleanupVariant)assert.equal(d.cleanupFailures[0].path,cleanupPath);assert(!JSON.stringify(d).includes('PRIVATE_'));if(['getter','proxy','secret','proxy-prototype','aggregate'].includes(variant))assert.equal(d.truncated,true);
    }else {assert.equal(status,1);const j=JSON.parse(output);assert.equal(j.error.code,expected);if(via==='doctor')assert(j.issues.some(x=>x.code==='plan-inspection-failed'&&x.causeCode===expected));assert.notEqual(j.error.scope,'staging');if(via!=='doctor')assert.equal(j.error.detail,'Unable to inspect project output; review the project path.');assert.equal(j.error.preservedPaths?.length||0,stageExpected?1:0);if(stageExpected)assert(j.error.preservedPaths[0].startsWith(scratch+sep));assert.equal(j.error.cleanupFailures?.length||0,cleanupVariant?1:0);if(cleanupVariant)assert.equal(j.error.cleanupFailures[0].path,cleanupPath);assert(!output.includes('PRIVATE_'));}
  } finally {fs.lstatSync=original;fs.rmSync=originalRm;fs.linkSync=originalLink;fs.renameSync=originalRename;syncBuiltinESMExports();Error.stackTraceLimit=oldLimit;for(const [k,v] of Object.entries(saved)){if(v===undefined)delete process.env[k];else process.env[k]=v}}
  for(const [p,bytes] of before)assert.deepEqual(fs.readFileSync(join(root,p)),bytes,p);
  // scratch belongs only to this synthetic fixture; its stage is intentionally retained as evidence.
});
