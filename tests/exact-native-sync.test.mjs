import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,chmodSync,statSync,unlinkSync,rmSync,realpathSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {synchronize,inspectSyncEffects} from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
// Reuse the isolated Git configuration installed by test-git-environment.
const env={...process.env};
const target='.codex/skills/demo/SKILL.md';
const expected='---\nname: demo\ndescription: Exemplo sintético.\n---\n\n# Demo\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/skills/projeto/demo/SKILL.md).\n';
const h=b=>createHash('sha256').update(b).digest('hex');
function fixture(t){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'adk-pointer-case-')));
 t.after(() => rmSync(root,{recursive:true,force:true}));
 const put=(p,v)=>{const f=join(root,p);mkdirSync(dirname(f),{recursive:true});writeFileSync(f,v)};
 put('.pbai4devs/templates/gitignore/agents.ignore','# Cache\n/*\n!/.gitignore\n{{ALLOWLIST}}\n');
 put('.pbai4devs/templates/gitignore/clients.json','{}\n');
 put('.pbai4devs/templates/gitignore/shared.ignore','# Estado\n');
 put('.pbai4devs/espelhos.conf','agente|.codex|plano\n');
 put('.pbai4devs/skills/projeto/demo/SKILL.md','---\nname: demo\ndescription: Exemplo sintético.\n---\n\n# Demo\n');
 put(target,expected);chmodSync(join(root,target),0o640);
 const git=(...args)=>{const r=spawnSync('git',['-c','core.fsmonitor=false',...args],{cwd:root,encoding:'utf8',env});assert.equal(r.status,0,r.stderr);return r.stdout};
 git('init','--quiet');git('add','--',target);
 const index=()=>h(readFileSync(join(root,'.git/index')));
 const run=options=>synchronize({root,localIgnores:false,generateEntrypoints:false,output() {},...options});
 const plan=()=>inspectSyncEffects({root,localIgnores:false,generateEntrypoints:false,output() {}});
 return {root,put,git,index,run,plan};
}
function state(root){return JSON.parse(readFileSync(join(root,'.pbai4devs/state/derived.json'),'utf8'))}
test('referência idêntica staged permanece sem adoção em sync repetido e check',(t)=>{
 const f=fixture(t),before=f.index(),diff=f.git('diff','--cached','--binary','--no-ext-diff','--no-textconv');
 let p=f.plan();assert.equal(p.preserved.find(x=>x.path===target)?.reason,'existing-reference-satisfied');
 assert.ok(!p.logicalEffects.operations.some(x=>x.path===target));
 for(let i=0;i<2;i++){assert.equal(f.run().exitCode,0);assert.equal(readFileSync(join(f.root,target),'utf8'),expected);if (process.platform !== 'win32') assert.equal(statSync(join(f.root,target)).mode&0o777,0o640);assert.equal(f.index(),before);let s=state(f.root);assert.ok(!Object.hasOwn(s.files??{},target));assert.ok(!Object.hasOwn(s.blocks??{},target));}
 p=f.plan();assert.equal(p.exitCode,0);assert.equal(p.preserved.find(x=>x.path===target)?.reason,'existing-reference-satisfied');
 assert.equal(f.git('diff','--cached','--binary','--no-ext-diff','--no-textconv'),diff);assert.equal(f.index(),before);
});
test('texto humano ou metadado diferente não entram na equivalência',(t)=>{
 for(const variant of [expected+'Nota humana.\n',expected.replace('description: Exemplo sintético.','description: Descrição humana.')]){
  const f=fixture(t);f.put(target,variant);const p=f.plan();assert.notEqual(p.preserved.find(x=>x.path===target)?.reason,'existing-reference-satisfied');
  assert.equal(readFileSync(join(f.root,target),'utf8'),variant);
  const before=f.index(); assert.throws(()=>f.run(),/Indice Git/);
  assert.equal(readFileSync(join(f.root,target),'utf8'),variant);assert.equal(f.index(),before);
 }
});
test('referência com hash de propriedade anterior não entra na equivalência',(t)=>{
 const f=fixture(t);f.put('.pbai4devs/state/agentdevkit.json',JSON.stringify({schemaVersion:1,files:{[target]:h(Buffer.from(expected))},blocks:{}}));
 const p=f.plan();assert.notEqual(p.preserved.find(x=>x.path===target)?.reason,'existing-reference-satisfied');assert.equal(readFileSync(join(f.root,target),'utf8'),expected);
});
test('bloco anteriormente registrado não entra na equivalência',(t)=>{
 const f=fixture(t),block='<!-- BEGIN AGENTDEVKIT -->\nLeia e siga [origem](../../../.pbai4devs/skills/projeto/demo/SKILL.md).\n<!-- END AGENTDEVKIT -->';
 f.put(target,expected+'\n'+block+'\n');f.put('.pbai4devs/state/agentdevkit.json',JSON.stringify({schemaVersion:1,files:{},blocks:{[target]:h(Buffer.from(block))}}));
 const p=f.plan();assert.notEqual(p.preserved.find(x=>x.path===target)?.reason,'existing-reference-satisfied');assert.ok(readFileSync(join(f.root,target),'utf8').includes(block));
});
test('tombstones brutos não entram no novo caminho de equivalência',(t)=>{
 for (const kind of ['file','block']) {
  const f=fixture(t), old=h(Buffer.from(expected));
  f.put('.pbai4devs/state/derived.json',JSON.stringify({schemaVersion:1,entries:{},...(kind==='file'?{removedFiles:{[target]:old}}:{removedBlocks:[target]})}));
  const before=f.index(), p=f.plan();
  assert.notEqual(p.preserved.find(x=>x.path===target)?.reason,'existing-reference-satisfied');
  assert.equal(readFileSync(join(f.root,target),'utf8'),expected);assert.equal(f.index(),before);
 }
});
test('Copilot mantém regra nativa idêntica sem adquirir propriedade',(t)=>{
 const f=fixture(t),rule='.github/instructions/demo.instructions.md';
 f.put('.pbai4devs/espelhos.conf','agente|.github|agrupado\nformato|.github|rules|instrucoes\n');
 f.put('.pbai4devs/rules/demo/RULE.md','---\ntrigger: always_on\ndescription: Regra sintética.\n---\n\n# Regra demo\n');
 const content='---\napplyTo: "**"\n---\n\n# Regra demo\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../.pbai4devs/rules/demo/RULE.md).\n';
 f.put(rule,content);chmodSync(join(f.root,rule),0o640);f.git('add','--',rule);const before=f.index();
 const p=f.plan();assert.equal(p.preserved.find(x=>x.path===rule)?.reason,'existing-reference-satisfied');assert.ok(!p.logicalEffects.operations.some(x=>x.path===rule));
 for(let n=0;n<2;n++){assert.equal(f.run().exitCode,0);assert.equal(readFileSync(join(f.root,rule),'utf8'),content);if (process.platform !== 'win32') assert.equal(statSync(join(f.root,rule)).mode&0o777,0o640);assert.equal(f.index(),before);let s=state(f.root);assert.ok(!Object.hasOwn(s.files??{},rule));assert.ok(!Object.hasOwn(s.blocks??{},rule));}
 assert.equal(f.plan().exitCode,0);
});
test('Copilot exige escopo completo idêntico com glob e sidecar nativo',(t)=>{
 for (const sidecar of [false,true]) for (const matches of [false,true]) {
  const f=fixture(t),rule='.github/instructions/demo.instructions.md';
  const source='.pbai4devs/rules/demo/RULE.md',metadata='.pbai4devs/rules/demo/copilot.yaml';
  const glob='frontend/**/*.ts';
  f.put(source,`---\ntrigger: glob\nglobs: "${glob}"\ndescription: Regra sintética.\n---\n\n# Regra demo\n`);
  const explicit=sidecar?`nativo|${rule}|${source}|${metadata}\n`:'';
  f.put('.pbai4devs/espelhos.conf',`agente|.github|agrupado\nformato|.github|rules|instrucoes\n${explicit}`);
  if(sidecar)f.put(metadata,`---\napplyTo: "${glob}"\n---\n`);
  const scope=matches?glob:'outro/**/*.ts';
  const content=`---\napplyTo: "${scope}"\n---\n\n# Regra demo\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../.pbai4devs/rules/demo/RULE.md).\n`;
  f.put(rule,content);f.git('add','--',rule);const index=f.index(),p=f.plan();
  assert.equal(p.preserved.find(x=>x.path===rule)?.reason==='existing-reference-satisfied',matches);
  assert.equal(readFileSync(join(f.root,rule),'utf8'),content);assert.equal(f.index(),index);
  if(matches){
   assert.equal(f.run().exitCode,0);assert.equal(readFileSync(join(f.root,rule),'utf8'),content);
   for(const key of ['files','blocks'])assert.ok(!Object.hasOwn(state(f.root)[key]??{},rule));
   assert.equal(f.index(),index);
  } else {
   assert.equal(p.preserved.find(x=>x.path===rule)?.reason,'copilot-scope-preserved');
   assert.ok(p.conflictPaths.includes(rule));assert.ok(!p.logicalEffects.operations.some(x=>x.path===rule));
   const statePath=join(f.root,'.pbai4devs/state/derived.json');
   const beforeState=existsSync(statePath)?readFileSync(statePath):null;
   for(const force of [false,true]){
    assert.throws(()=>f.run({force}),/colisao/);
    assert.equal(readFileSync(join(f.root,rule),'utf8'),content);assert.equal(f.index(),index);
    assert.deepEqual(existsSync(statePath)?readFileSync(statePath):null,beforeState);
   }
  }
 }
});
test('Claude regra nativa continua protegida mesmo com apontamento igual',(t)=>{
 const f=fixture(t),rule='.claude/rules/demo/RULE.md';
 f.put('.pbai4devs/espelhos.conf','agente|.claude|agrupado\nformato|.claude|rules|agrupado\n');
 f.put('.pbai4devs/rules/demo/RULE.md','---\ntrigger: always_on\ndescription: Regra sintética.\n---\n\n# Regra demo\n');
 const content='---\ndescription: "Regra sintética."\n---\n\n# Regra demo\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/rules/demo/RULE.md).\n';
 f.put(rule,content);f.git('add','--',rule);const before=f.index(),p=f.plan();
 assert.equal(p.preserved.find(x=>x.path===rule)?.reason,'claude-scope-preserved');assert.ok(p.conflictPaths.includes(rule));
 for(const force of [false,true])assert.throws(()=>f.run({force}),/colisao/);
 assert.equal(readFileSync(join(f.root,rule),'utf8'),content);assert.equal(f.index(),before);
});
