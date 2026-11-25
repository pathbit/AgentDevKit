import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { dirname, join, posix, win32 } from 'node:path';
import { tmpdir } from 'node:os';
import { audit } from './matrix-audit.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const selections=['codex','claude','opencode','vscode','copilot','cursor','kimi','minimax','deepseek','antigravity','antigravity-legacy','zcode','kimi-legacy','mimo','claude,codex','copilot,cursor','codex,opencode','antigravity,claude','deepseek,minimax','antigravity,copilot'];
function fixture(t, status='passed', windows=false, round=1) {
  const parent=mkdtempSync(join(tmpdir(),'adk-audit-fixture-')); t.after(()=>rmSync(parent,{recursive:true,force:true}));
  const dir=join(parent,'run');mkdirSync(dir);
  const origin=windows?'C:\\matrix\\run':'/source/matrix/run';
  const p=windows?win32:{ join:(...v)=>v.join('/') }, version='0.0.30';
  const entries=[];
  for(let i=0;i<40;i++) {
    const n=(round-1)*40+i+1, kind=i%2?'existing':'new', caseName=String(n).padStart(2,'0')+'-'+kind, caseDir=join(dir,caseName);mkdirSync(caseDir);
    const resultStatus=i===0?status:'passed';
    const coverage={status:resultStatus==='not-verified'?'not-verified':'verified',notVerified:resultStatus==='not-verified'?['escopo não comprovado']:[],checked:{skills:1,agents:1,commands:1,rules:1}};
    const required=['.git/index','.git/HEAD','.git/config','.git/info/exclude','.gitignore','HUMAN-STAGED.txt','HUMAN-UNTRACKED.txt','human'];
    if(kind==='existing')required.push('.pbai4devs/skills/equipe/skill-propria/SKILL.md','.pbai4devs/skills/projeto/criar-skill/SKILL.md','.claude/settings.json','.claude/skills/equipe/SKILL.md','src/main.js');
    const fixtureId=(round-1)%4;
    if(fixtureId>0)required.push(`human/round-${round}/case-${n}.txt`);
    if(kind==='existing'&&fixtureId===1)required.push('.cursor/rules/equipe.mdc');
    if(kind==='existing'&&fixtureId===2)required.push('.gemini/commands/equipe.toml');
    const docNames=kind==='existing'?['AGENTS.md','CLAUDE.md','.claude/skills/criar-skill/SKILL.md']:[];
    if(fixtureId===3)docNames.push('.agents/skills/projeto/criar-skill/SKILL.md');
    const fileSnapshot=p=>{const parts=p.split('/'),parents=['.'];for(let n=1;n<parts.length;n++)parents.push(parts.slice(0,n).join('/'));return {sha256:'a'.repeat(64),mode:420,directories:Object.fromEntries(parents.map(k=>[k,{type:'directory',mode:493}]))};};
    const branch=kind==='existing'?fileSnapshot('.git/refs/heads/main'):null;
    const refs={'.git/refs':{type:'directory',mode:493},'.git/refs/heads':{type:'directory',mode:493},'.git/refs/tags':{type:'directory',mode:493}};
    if(branch)refs['.git/refs/heads/main']={type:'file',...branch};
    const baseline={unchanged:Object.fromEntries(required.map(k=>[k,fileSnapshot(k)])),documents:Object.fromEntries(docNames.map(k=>[k,fileSnapshot(k)])),optional:{'.git/refs/heads/main':branch,'.git/packed-refs':null},refs};
    baseline.unchanged['.git/HEAD'].sha256=hash('ref: refs/heads/main\n');
    writeFileSync(join(caseDir,'BEFORE.json'),JSON.stringify(baseline));
    const root=p.join(origin,caseName,'project'),selection=selections[Math.floor(i/2)];
    const human=fixtureId>0?`human/round-${round}/case-${n}.txt`:null;
    const native=[null,'.cursor/rules/equipe.mdc','.gemini/commands/equipe.toml','.agents/skills/projeto/criar-skill/SKILL.md'][fixtureId];
    const extras=human?[human,...(kind==='existing'||fixtureId===3?[native]:[])]:[];
    const args={
      'git-init':['init','--quiet'],
      'git-add-base':['add','--','.gitignore','AGENTS.md','CLAUDE.md','.claude','.pbai4devs/skills','src/main.js',...extras],
      'git-commit-base':['-c','user.name=Fixture Developer','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','--quiet','-m','test: criar fixture sintética'],
      'git-add':['add','--','.gitignore','HUMAN-STAGED.txt',...(human?[human]:[])],
      init:['/packageCli','init','--agents',selection,'--target',root,'--json'],
      update:['/packageCli','update','--target',root,'--json'],
      'update-force':['/packageCli','update','--force','--target',root,'--json'],
      doctor:['/packageCli','doctor','--target',root,'--json'],
      'sync-check':['/packageCli','sync','--check','--target',root,'--json'],
    };
    const operations=[]; let lastSnapshot;
    for(const label of ['init','update','update-force','doctor','sync-check']) {
      const command=label==='sync-check'?'sync':label==='update-force'?'update':label;
      const reply={ok:true,version,command,...(label.startsWith('update')?{changed:false}:{}),...(label==='doctor'?{issues:[]}:{}),...(label==='sync-check'?{plan:[],conflicts:[]}:{})};
      const stdout=JSON.stringify(reply)+'\n', stderr='', snapshot={baseline,after:baseline.unchanged,optional:baseline.optional,refs:baseline.refs,documents:Object.fromEntries(Object.entries(baseline.documents).map(([k,v])=>[k,{after:v,originalPrefixPreserved:true,allowedContent:true,modePreserved:true,directoriesPreserved:true}])),status:'verified',observedUnchanged:true,observedOptionalUnchanged:true,observedRefsUnchanged:true,observedDocumentsPreserved:true,unchanged:true,documentsPreserved:true};
      lastSnapshot=snapshot;
      writeFileSync(join(caseDir,label+'.stdout.log'),stdout);writeFileSync(join(caseDir,label+'.stderr.log'),stderr);writeFileSync(join(caseDir,label+'.snapshot.json'),JSON.stringify(snapshot));
      operations.push({label,args:args[label],status:0,signal:null,error:null,timedOut:false,exceeded:false,stdout:p.join(origin,caseName,label+'.stdout.log'),stderr:p.join(origin,caseName,label+'.stderr.log'),stdoutSha256:hash(stdout),stderrSha256:hash(stderr),ok:true,version,preservation:{...snapshot,snapshot:p.join(origin,caseName,label+'.snapshot.json')},installation:{coverage,fingerprint:'a'.repeat(64)}});
    }
    const prep=kind==='existing'?['git-init','git-add-base','git-commit-base','git-add']:['git-init','git-add'];
    for(const label of prep.reverse()) {
      const stdout='',stderr='';writeFileSync(join(caseDir,label+'.stdout.log'),stdout);writeFileSync(join(caseDir,label+'.stderr.log'),stderr);
      operations.unshift({label,args:args[label],status:0,signal:null,error:null,timedOut:false,exceeded:false,stdout:p.join(origin,caseName,label+'.stdout.log'),stderr:p.join(origin,caseName,label+'.stderr.log'),stdoutSha256:hash(stdout),stderrSha256:hash(stderr)});
    }
    const preservation=lastSnapshot;writeFileSync(join(caseDir,'AFTER.json'),JSON.stringify(preservation));
    const result={number:n,round,fixture:fixtureId,kind,root,selection,status:resultStatus,passed:resultStatus==='passed',report:p.join(origin,caseName,'RESULT.json'),operations,preservation,issue:null,coverage};
    if(resultStatus==='failed'){result.issue='falha sintética';result.operations=result.operations.slice(0,1);}
    entries.push({caseDir,result});
  }
  const before=Object.fromEntries(['managedContent','managedToml','packageCli','packageManifest','runner'].map(k=>[k,{path:'/'+k,sha256:'a'.repeat(64)}]));
  const report={version,matrixPlan:'current',rounds:1,startRound:round,projects:40,passed:status==='passed'?40:39,failed:Number(status==='failed'),notVerified:Number(status==='not-verified'),status,provenance:{algorithm:'sha256',before,after:before,passed:true},results:entries.map(x=>x.result)};
  const save=()=>{for(const e of entries)writeFileSync(join(e.caseDir,'RESULT.json'),JSON.stringify(e.result));writeFileSync(join(dir,'RESULT.json'),JSON.stringify(report));};
  save();return {parent,dir,origin,caseDir:entries[0].caseDir,result:entries[0].result,report,save};
}
test('passed coerente',t=>{let f=fixture(t);let a=audit(f.dir,f.origin);assert.equal(a.matrixStatus,'passed');assert.equal(a.projects,40);});
test("not-verified is not promoted",t=>{let f=fixture(t,'not-verified');let a=audit(f.dir,f.origin);assert.equal(a.matrixStatus,'not-verified');assert.equal(a.notVerified,1);});
test('falha bem formada permanece falha',t=>{let f=fixture(t,'failed');assert.equal(audit(f.dir,f.origin).matrixStatus,'failed');});
test('contagem divergente',t=>{let f=fixture(t);f.report.passed=0;f.save();assert.throws(()=>audit(f.dir,f.origin),/Contagens/);});
test('status global divergente',t=>{let f=fixture(t,'not-verified');f.report.status='passed';f.save();assert.throws(()=>audit(f.dir,f.origin),/Status global/);});
test('hash de log divergente',t=>{let f=fixture(t);writeFileSync(join(f.caseDir,'init.stdout.log'),'alterado');assert.throws(()=>audit(f.dir,f.origin),/Hash/);});
test("log out of output",t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='init').stdout='/source/outside';f.save();assert.throws(()=>audit(f.dir,f.origin),/fora do caso/);});
test('link interno recusado',t=>{let f=fixture(t);const log=join(f.caseDir,'init.stdout.log'),target=join(f.parent,'other.log');writeFileSync(target,readFileSync(log));rmSync(log);try{symlinkSync(target,log,'file');}catch(e){if(process.platform==='win32'&&['EPERM','EACCES'].includes(e.code)){t.skip('Privilégio de symlink indisponível');return;}throw e;}assert.throws(()=>audit(f.dir,f.origin),/Link simbólico/);});
test('raiz symlink recusada',t=>{let f=fixture(t);const link=join(f.parent,'root-link');try{symlinkSync(f.dir,link,'dir');}catch(e){if(process.platform==='win32'&&['EPERM','EACCES'].includes(e.code)){t.skip('Privilégio de symlink indisponível');return;}throw e;}assert.throws(()=>audit(link,f.origin),/Raiz.*link/);});
test('caso individual divergente',t=>{let f=fixture(t);writeFileSync(join(f.caseDir,'RESULT.json'),'{}');assert.throws(()=>audit(f.dir,f.origin),/individual divergente/);});
test('identificador duplicado',t=>{let f=fixture(t);f.report.results[1].number=1;f.save();assert.throws(()=>audit(f.dir,f.origin),/Caso inválido/);});
test('caminhos Windows gravados',t=>{let f=fixture(t,'passed',true);assert.equal(audit(f.dir,f.origin).matrixStatus,'passed');});
test('zero resultados recusados',t=>{let f=fixture(t);f.report.results=[];f.report.projects=0;f.report.passed=0;f.save();assert.throws(()=>audit(f.dir,f.origin),/cardinalidade/);});
test("invalid rounds",t=>{let f=fixture(t);f.report.rounds=2;f.save();assert.throws(()=>audit(f.dir,f.origin),/cardinalidade/);});
test('startRound e IDs divergentes',t=>{let f=fixture(t);f.report.startRound=2;f.save();assert.throws(()=>audit(f.dir,f.origin),/IDs/);});
test("incomplete provenance",t=>{let f=fixture(t);delete f.report.provenance.before.managedToml;f.save();assert.throws(()=>audit(f.dir,f.origin),/proveniência/);});
test('coverage ausente',t=>{let f=fixture(t);f.result.coverage=null;f.save();assert.throws(()=>audit(f.dir,f.origin),/Coverage/);});
test('coverage desconhecida',t=>{let f=fixture(t);f.result.coverage.status='unknown';f.save();assert.throws(()=>audit(f.dir,f.origin),/Coverage|Status individual/);});
test("verified cover with unchecked motive",t=>{let f=fixture(t);f.result.coverage.notVerified=['não verificado'];f.save();assert.throws(()=>audit(f.dir,f.origin),/Coverage|Status individual/);});
test("fake ok in operation",t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='init').ok=false;f.save();assert.throws(()=>audit(f.dir,f.origin),/Resposta/);});
test("divergent version in operation",t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='init').version='1.0.0';f.save();assert.throws(()=>audit(f.dir,f.origin),/Resposta/);});
test("contradictory intermediate snapshot",t=>{let f=fixture(t);writeFileSync(join(f.caseDir,'init.snapshot.json'),JSON.stringify({status:'verified',unchanged:false,documentsPreserved:true}));assert.throws(()=>audit(f.dir,f.origin),/Snapshot intermediário/);});
test("contradictory final snapshot",t=>{let f=fixture(t);writeFileSync(join(f.caseDir,'AFTER.json'),'{}');assert.throws(()=>audit(f.dir,f.origin),/Snapshot final/);});

test('dados do snapshot contradizem indicador',t=>{let f=fixture(t);const file=join(f.caseDir,'init.snapshot.json');const snap=JSON.parse(readFileSync(file));snap.after.human.sha256='b'.repeat(64);writeFileSync(file,JSON.stringify(snap));assert.throws(()=>audit(f.dir,f.origin),/Dados do snapshot/);});
test("JSON operation with consistent hash but incorrect command",t=>{let f=fixture(t);const op=f.result.operations.find(o=>o.label==='init'), body=JSON.stringify({ok:true,version:'0.0.30',command:'outro'})+'\n';writeFileSync(join(f.caseDir,'init.stdout.log'),body);op.stdoutSha256=hash(body);f.save();assert.throws(()=>audit(f.dir,f.origin),/JSON de operação/);});
test("provenance of five files changed, result remains failed",t=>{let f=fixture(t,'failed');f.report.provenance.after={...f.report.provenance.before,runner:{...f.report.provenance.before.runner,sha256:'b'.repeat(64)}};f.report.provenance.passed=false;f.save();assert.equal(audit(f.dir,f.origin).matrixStatus,'failed');});
test("Double selection within the round",t=>{let f=fixture(t);f.report.results[2].selection=f.report.results[0].selection;f.report.results[3].selection=f.report.results[0].selection;f.save();assert.throws(()=>audit(f.dir,f.origin),/Seleção não corresponde/);});
function unverified(f, label, reason) {
  f.result.status='not-verified';f.result.passed=false;
  f.result.coverageAssessment={status:'not-verified',reasons:[`${label}: ${reason}`]};
  f.report.passed=39;f.report.notVerified=1;f.report.status='not-verified';
}
test("new: cover of absent init is not-verified coherent",t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='init').installation.coverage;unverified(f,'init','cobertura ausente ou inválida');f.save();assert.equal(audit(f.dir,f.origin).matrixStatus,'not-verified');});
test("new: missing final cover is not-verified coherent",t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='sync-check').installation.coverage;f.result.coverage=null;unverified(f,'sync-check','cobertura ausente ou inválida');f.save();assert.equal(audit(f.dir,f.origin).matrixStatus,'not-verified');});
test("new: unknown coverage is not-verified coherent",t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='init').installation.coverage={...f.result.coverage,status:'unknown'};unverified(f,'init','status de cobertura desconhecido');f.save();assert.equal(audit(f.dir,f.origin).matrixStatus,'not-verified');});
test("new: missing installation does not prove inventory",t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='init').installation;unverified(f,'init','cobertura ausente ou inválida');f.save();assert.throws(()=>audit(f.dir,f.origin),/Inventário/);});
test('novo: verified com motivos gera not-verified',t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='init').installation.coverage={...f.result.coverage,notVerified:['não foi verificado']};unverified(f,'init','cobertura não verificada: não foi verificado');f.save();assert.equal(audit(f.dir,f.origin).matrixStatus,'not-verified');});
test("new: inaccurate reasons are refused",t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='init').installation.coverage;unverified(f,'init','outra razão');f.save();assert.throws(()=>audit(f.dir,f.origin),/Motivos/);});
test('novo: cobertura ausente nunca gera passed',t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='init').installation.coverage;f.result.coverageAssessment={status:'not-verified',reasons:['init: cobertura ausente ou inválida']};f.save();assert.throws(()=>audit(f.dir,f.origin),/Status individual/);});
test("new: false assessment refused even if status is not-verified",t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='init').installation.coverage;unverified(f,'init','cobertura ausente ou inválida');f.result.coverageAssessment.status='verified';f.save();assert.throws(()=>audit(f.dir,f.origin),/Motivos/);});
test('novo: assessment verified coerente permanece passed',t=>{let f=fixture(t);f.result.coverageAssessment={status:'verified',reasons:[]};f.save();assert.equal(audit(f.dir,f.origin).matrixStatus,'passed');});
test("Git index absent on baseline is refused",t=>{let f=fixture(t);const file=join(f.caseDir,'BEFORE.json'), b=JSON.parse(readFileSync(file));delete b.unchanged['.git/index'];writeFileSync(file,JSON.stringify(b));assert.throws(()=>audit(f.dir,f.origin),/Arquivos mínimos/);});
test("baseline without minimum files is refused",t=>{let f=fixture(t);const file=join(f.caseDir,'BEFORE.json'), b=JSON.parse(readFileSync(file));b.unchanged={};writeFileSync(file,JSON.stringify(b));assert.throws(()=>audit(f.dir,f.origin),/Arquivos mínimos/);});
test("Unplanned synthetic selection is refused",t=>{let f=fixture(t);f.report.results[0].selection='agente-ficticio';f.report.results[1].selection='agente-ficticio';f.save();assert.throws(()=>audit(f.dir,f.origin),/Seleção não corresponde/);});
test("round five accepts planned IDs and selections",t=>{let f=fixture(t,'passed',false,5);const selection='codex,vscode|codex,copilot|codex,cursor|codex,kimi|codex,minimax|codex,deepseek|codex,antigravity|codex,antigravity-legacy|codex,zcode|codex,kimi-legacy|codex,mimo|claude,opencode|claude,vscode|claude,copilot|claude,cursor|claude,kimi|claude,minimax|claude,deepseek|claude,antigravity-legacy|claude,zcode'.split('|');f.report.results.forEach((x,i)=>{x.selection=selection[Math.floor(i/2)];x.operations.find(o=>o.label==='init').args[3]=x.selection;});f.save();assert.equal(audit(f.dir,f.origin).matrixStatus,'passed');});
function mutateBaseline(f, caseName, change){const file=join(f.dir,caseName,'BEFORE.json'),value=JSON.parse(readFileSync(file));change(value);writeFileSync(file,JSON.stringify(value));}
test("empty references are refused",t=>{let f=fixture(t);mutateBaseline(f,'01-new',b=>{b.refs={};});assert.throws(()=>audit(f.dir,f.origin),/Diretórios de refs/);});
test("mandatory ref heads is refused when removed",t=>{let f=fixture(t);mutateBaseline(f,'01-new',b=>{delete b.refs['.git/refs/heads'];});assert.throws(()=>audit(f.dir,f.origin),/Diretórios de refs/);});
test("optional empty refs are refused",t=>{let f=fixture(t);mutateBaseline(f,'01-new',b=>{b.optional={};});assert.throws(()=>audit(f.dir,f.origin),/Refs opcionais/);});
test("ref of HEAD absent is refused",t=>{let f=fixture(t);mutateBaseline(f,'01-new',b=>{delete b.optional['.git/refs/heads/main'];});assert.throws(()=>audit(f.dir,f.origin),/Ref de HEAD ausente/);});
test('ref de projeto existente deve estar presente',t=>{let f=fixture(t);mutateBaseline(f,'02-existing',b=>{b.optional['.git/refs/heads/main']=null;});assert.throws(()=>audit(f.dir,f.origin),/Ref do projeto existente ausente/);});
test("ref tree and ref of HEAD must match",t=>{let f=fixture(t);mutateBaseline(f,'02-existing',b=>{b.refs['.git/refs/heads/main'].sha256='b'.repeat(64);});assert.throws(()=>audit(f.dir,f.origin),/Ref de HEAD divergente/);});
test("empty documents are refused in existing",t=>{let f=fixture(t);mutateBaseline(f,'02-existing',b=>{b.documents={};});assert.throws(()=>audit(f.dir,f.origin),/Documentos humanos obrigatórios/);});
test("Each human document is mandatory in existing",t=>{let f=fixture(t);mutateBaseline(f,'02-existing',b=>{delete b.documents['CLAUDE.md'];});assert.throws(()=>audit(f.dir,f.origin),/Documentos humanos obrigatórios/);});
test("Kit human files are required in existing",t=>{let f=fixture(t);mutateBaseline(f,'02-existing',b=>{delete b.unchanged['.pbai4devs/skills/projeto/criar-skill/SKILL.md'];});assert.throws(()=>audit(f.dir,f.origin),/Arquivos mínimos/);});
test('variante 1 exige regra Cursor para existente',t=>{let f=fixture(t,'passed',false,2);assert.equal(audit(f.dir,f.origin).matrixStatus,'passed');mutateBaseline(f,'42-existing',b=>{delete b.unchanged['.cursor/rules/equipe.mdc'];});assert.throws(()=>audit(f.dir,f.origin),/Arquivos mínimos/);});
test('variante 2 exige comando TOML humano em projeto existente',t=>{let f=fixture(t,'passed',false,3);assert.equal(audit(f.dir,f.origin).matrixStatus,'passed');mutateBaseline(f,'82-existing',b=>{delete b.unchanged['.gemini/commands/equipe.toml'];});assert.throws(()=>audit(f.dir,f.origin),/Arquivos mínimos/);});
test("variant 3 requires human crash skill in the new",t=>{let f=fixture(t,'passed',false,4);assert.equal(audit(f.dir,f.origin).matrixStatus,'passed');mutateBaseline(f,'121-new',b=>{delete b.documents['.agents/skills/projeto/criar-skill/SKILL.md'];});assert.throws(()=>audit(f.dir,f.origin),/Documentos humanos obrigatórios/);});
test("documents with contradictory mode are not approved",t=>{let f=fixture(t);const file=join(f.dir,'02-existing','init.snapshot.json'),snapshot=JSON.parse(readFileSync(file));snapshot.documents['AGENTS.md'].after.mode=0;writeFileSync(file,JSON.stringify(snapshot));assert.throws(()=>audit(f.dir,f.origin),/Dados do snapshot/);});

test("hash of HEAD must correspond to optional ref",t=>{let f=fixture(t);mutateBaseline(f,'01-new',b=>{b.unchanged['.git/HEAD'].sha256='f'.repeat(64);});assert.throws(()=>audit(f.dir,f.origin),/HEAD não corresponde/);});
test("empty ancestors in Git index do not confirm directories",t=>{let f=fixture(t);mutateBaseline(f,'01-new',b=>{b.unchanged['.git/index'].directories={};});assert.throws(()=>audit(f.dir,f.origin),/Arquivos mínimos/);});
test("missing document ancestor is refused",t=>{let f=fixture(t);mutateBaseline(f,'02-existing',b=>{delete b.documents['.claude/skills/criar-skill/SKILL.md'].directories['.claude/skills'];});assert.throws(()=>audit(f.dir,f.origin),/Documentos humanos obrigatórios/);});
test("optional absent ref ancestor is refused",t=>{let f=fixture(t);mutateBaseline(f,'02-existing',b=>{delete b.optional['.git/refs/heads/main'].directories['.git/refs'];});assert.throws(()=>audit(f.dir,f.origin),/Snapshot de refs opcionais inválido/);});
test("AFTER and result identical but different from the last snapshot are refused",t=>{let f=fixture(t);const file=join(f.caseDir,'AFTER.json'),value=JSON.parse(readFileSync(file));value.after.human.sha256='f'.repeat(64);writeFileSync(file,JSON.stringify(value));f.result.preservation=value;f.save();assert.throws(()=>audit(f.dir,f.origin),/Snapshot final divergente/);});
test("Git-init preparation missing does not generate past",t=>{let f=fixture(t);f.result.operations=f.result.operations.filter(o=>o.label!=='git-init');f.save();assert.throws(()=>audit(f.dir,f.origin),/Preparação Git/);});
test("git-add-base preparation absent in existing project is refused",t=>{let f=fixture(t);const x=f.report.results[1];x.operations=x.operations.filter(o=>o.label!=='git-add-base');f.save();assert.throws(()=>audit(f.dir,f.origin),/Preparação Git/);});
test("git-add with failure status does not generate past",t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='git-add').status=1;f.save();assert.throws(()=>audit(f.dir,f.origin),/Preparação Git/);});
test("Git preparations out of order are refused",t=>{let f=fixture(t);[f.result.operations[0],f.result.operations[1]]=[f.result.operations[1],f.result.operations[0]];f.save();assert.throws(()=>audit(f.dir,f.origin),/Preparação Git/);});
test("missing fingerprint does not prove inventory",t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='init').installation.fingerprint;f.save();assert.throws(()=>audit(f.dir,f.origin),/Inventário/);});
test("git init with absent arguments is rejected",t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='git-init').args;f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test('git add deve incluir o arquivo staged humano',t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='git-add').args.pop();f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test('git add-base deve incluir AGENTS.md',t=>{let f=fixture(t);const op=f.report.results[1].operations.find(o=>o.label==='git-add-base');op.args=op.args.filter(x=>x!=='AGENTS.md');f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test("git commit should register expected synthetic identity",t=>{let f=fixture(t);const op=f.report.results[1].operations.find(o=>o.label==='git-commit-base');op.args[1]='user.name=Outro';f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test('fixture 1 adiciona sentinela humana ao git add',t=>{let f=fixture(t,'passed',false,2);f.result.operations.find(o=>o.label==='git-add').args.pop();f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test("fixture 3 adds native collision to git add-base",t=>{let f=fixture(t,'passed',false,4);f.report.results[1].operations.find(o=>o.label==='git-add-base').args.pop();f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test("init should inform planned selection",t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='init').args[3]='outro';f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test('sync deve registrar --check',t=>{let f=fixture(t);const o=f.result.operations.find(o=>o.label==='sync-check');o.args=o.args.filter(a=>a!=='--check');f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test("target of the operation must be the fixture itself",t=>{let f=fixture(t);const o=f.result.operations.find(o=>o.label==='init');o.args[o.args.indexOf('--target')+1]='/outro';f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test("registered root should be the case project directory",t=>{let f=fixture(t);f.result.root='/outra-pasta';f.save();assert.throws(()=>audit(f.dir,f.origin),/Raiz registrada/);});

function currentProvenance(t, { windows = false, sidecars = true } = {}) {
  const f = fixture(t, 'passed', windows);
  const flavor = windows ? win32 : posix;
  const recordedRunner = windows ? 'C:\\historico\\checkout' : '/historico/checkout';
  const recordedPackage = windows ? 'D:\\historico\\package' : '/historico/package';
  const sources = { runnerRoot: join(f.parent, 'checkout'), packageRoot: join(f.parent, 'package') };
  const before = {};
  const write = (key, relative, bytes, root = 'packageRoot') => {
    const parts = relative.split('/');
    const file = join(sources[root], ...parts);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, bytes);
    before[key] = { path: flavor.join(root === 'packageRoot' ? recordedPackage : recordedRunner, ...parts), sha256: hash(bytes) };
    return file;
  };
  write('runner', 'tests/project-matrix.mjs', 'runner', 'runnerRoot');
  write('managedContent', '.pbai4devs/scripts/lib/managed-content.mjs', 'content', 'runnerRoot');
  write('managedToml', '.pbai4devs/scripts/lib/managed-toml.mjs', 'toml', 'runnerRoot');
  write('packageCli', 'bin/agentdevkit.mjs', 'cli');
  write('packageManifest', 'package.json', JSON.stringify({ name: '@pathbit/agentdevkit', version: f.report.version }));
  write('packageCatalog', '.pbai4devs/scripts/lib/catalog.mjs', 'catalog');
  write('packageResourcePath', '.pbai4devs/scripts/lib/resource-path.mjs', 'resource-path');
  const policyFile = write('packageAdapterPolicy', '.pbai4devs/templates/clients/ADAPTERS.json',
    JSON.stringify({ adapters: [{ id: 'cursor', ruleMetadata: 'custom.yml' }] }));
  const sidecarPath = '.pbai4devs/rules/git/CUSTOM.YML';
  const sidecarKey = `cursorSidecar:${sidecarPath}`;
  const sidecarFile = join(sources.packageRoot, ...sidecarPath.split('/'));
  mkdirSync(dirname(sidecarFile), { recursive: true });
  writeFileSync(join(dirname(sidecarFile), 'RULE.md'), '# Regra');
  if (sidecars) {
    write(sidecarKey, sidecarPath, '---\ndescription: Git\nalwaysApply: true\n---\n');
    write('cursorSidecar:.pbai4devs/rules/qualidade/custom.yml', '.pbai4devs/rules/qualidade/custom.yml', '---\ndescription: Qualidade\nalwaysApply: false\n---\n');
  }
  f.report.package = recordedPackage;
  f.report.provenance = { platform: windows ? 'win32' : 'darwin', arch: 'arm64', algorithm: 'sha256', before, after: structuredClone(before), passed: true };
  for (const result of f.report.results) for (const op of result.operations) {
    if (op.args[0] === '/packageCli') op.args[0] = before.packageCli.path;
  }
  f.save();
  return { ...f, sources, sidecarFile, sidecarKey, policyFile, recordedPackage };
}

test("current provenance confers eight files and sidecars from remapped local sources", t => {
  const f = currentProvenance(t);
  const verified = audit(f.dir, f.origin, f.sources);
  assert.equal(verified.provenanceRecorded, true);
  assert.equal(verified.provenanceSourcesVerified, true);
  assert.equal(verified.matrixStatus, 'passed');
});

test("current Windows provenance is verifiable in current host", t => {
  const f = currentProvenance(t, { windows: true });
  assert.equal(audit(f.dir, f.origin, f.sources).provenanceSourcesVerified, true);
});

test("Stable provenance requires the roots provided by the auditor", t => {
  const f = currentProvenance(t);
  assert.throws(() => audit(f.dir, f.origin), /--package e --runner-root/);
  assert.throws(() => audit(f.dir, f.origin, { packageRoot: f.sources.packageRoot }), /--package e --runner-root/);
});

test("legacy is historical coherence and does not replace the conference of sources", t => {
  const f = fixture(t);
  assert.equal(audit(f.dir, f.origin).provenanceSourcesVerified, false);
  assert.throws(() => audit(f.dir, f.origin, { runnerRoot: f.parent, packageRoot: f.parent }), /Formato legado/);
});

test("Current provenance checks inventory without sidecars when package does not contain any", t => {
  const f = currentProvenance(t, { sidecars: false });
  assert.equal(audit(f.dir, f.origin, f.sources).provenanceSourcesVerified, true);
  writeFileSync(f.sidecarFile, 'adicionado depois');
  assert.throws(() => audit(f.dir, f.origin, f.sources), /Inventário ou hash de sidecars/);
});

test("sidecar omitted from the two snapshots and sidecar tampered are refused", t => {
  const f = currentProvenance(t);
  writeFileSync(f.sidecarFile, 'conteúdo modificado');
  assert.throws(() => audit(f.dir, f.origin, f.sources), /Inventário ou hash de sidecars/);
  for (const entries of [f.report.provenance.before, f.report.provenance.after]) delete entries[f.sidecarKey];
  f.save();
  assert.throws(() => audit(f.dir, f.origin, f.sources), /Inventário ou hash de sidecars/);
});

test("false fixed source hash and exchanged policy are refused even in equal snapshots", t => {
  const f = currentProvenance(t);
  const p = f.report.provenance;
  for (const entries of [p.before, p.after]) entries.packageCatalog.sha256 = 'a'.repeat(64);
  f.save();
  assert.throws(() => audit(f.dir, f.origin, f.sources), /Hash da fonte.*packageCatalog/);
  for (const entries of [p.before, p.after]) entries.packageCatalog.sha256 = hash('catalog');
  f.save();
  writeFileSync(f.policyFile, '{"adapters":[{"id":"cursor","ruleMetadata":"cursor.yaml"}]}');
  assert.throws(() => audit(f.dir, f.origin, f.sources), /Hash da fonte.*packageAdapterPolicy/);
});

test("provenance sources cannot redirect fixed files or sidecars", t => {
  const f = currentProvenance(t);
  const snapshots = [f.report.provenance.before, f.report.provenance.after];
  for (const entries of snapshots) entries.packageCli.path = '/outra/origem/agentdevkit.mjs';
  f.save();
  assert.throws(() => audit(f.dir, f.origin, f.sources), /Caminho de proveniência/);
  for (const entries of snapshots) {
    entries.packageCli.path = `${f.recordedPackage}/bin/agentdevkit.mjs`;
    entries['cursorSidecar:.pbai4devs/rules/../custom.yml'] = entries[f.sidecarKey];
  }
  f.save();
  assert.throws(() => audit(f.dir, f.origin, f.sources), /Chave de proveniência Cursor/);
});

test("inventory refuses directory with sidecar name", t => {
  const f = currentProvenance(t, { sidecars: false });
  mkdirSync(f.sidecarFile);
  assert.throws(() => audit(f.dir, f.origin, f.sources), /arquivo regular/);
});

test("inventory refuses links in ancestors", t => {
  const f = currentProvenance(t, { sidecars: false });
  const outside = join(f.parent, 'outside');
  mkdirSync(outside);
  const link = join(f.sources.packageRoot, '.pbai4devs', 'rules', 'redirecionado');
  try { symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) { t.skip('Privilégio de symlink indisponível'); return; }
    throw error;
  }
  assert.throws(() => audit(f.dir, f.origin, f.sources), /Link simbólico em inventário/);
});

test("Amended or incomplete provenance in execution is never promoted", t => {
  const f = currentProvenance(t);
  const p = f.report.provenance;
  delete p.after[f.sidecarKey];
  f.save();
  assert.throws(() => audit(f.dir, f.origin, f.sources), /Proveniência inconsistente/);
  p.passed = false;
  f.report.status = 'failed';
  f.save();
  const failed = audit(f.dir, f.origin, f.sources);
  assert.equal(failed.matrixStatus, 'failed');
  assert.equal(failed.provenanceRecorded, false);
  assert.equal(failed.provenanceSourcesVerified, false);
  for (const key of Object.keys(p.after).filter(key => key.startsWith('cursorSidecar:'))) delete p.after[key];
  p.after['cursorSidecar:inventory'] = { path: `${f.recordedPackage}/.pbai4devs/rules`, error: 'E_SIDECAR_INVENTORY' };
  f.save();
  assert.equal(audit(f.dir, f.origin, f.sources).matrixStatus, 'failed');
  p.after[f.sidecarKey] = p.before[f.sidecarKey];
  f.save();
  assert.throws(() => audit(f.dir, f.origin, f.sources), /Inventário de proveniência Cursor inválido/);
});

const claudeScope = { client: 'claude', source: '.pbai4devs/rules/git/RULE.md', target: '.claude/rules/git/RULE.md', mode: 'explicit-source-only' };
const cursorScope = { client: 'cursor', source: '.pbai4devs/rules/git/RULE.md', target: '.cursor/rules/git.mdc',
  mode: 'always-apply', metadata: '.pbai4devs/rules/git/custom.yml' };
const claudeOmission = { source: claudeScope.source, target: claudeScope.target, trigger: 'model_decision', status: 'explicit-reference-planned' };
const caseFor = (fixture, selected) => fixture.report.results.find(result => result.selection === selected);
function rewriteReply(fixture, operation, update) {
  const file = join(fixture.dir, posix.relative(fixture.origin, operation.stdout));
  const reply = JSON.parse(readFileSync(file));
  update(reply);
  const bytes = JSON.stringify(reply) + '\n';
  writeFileSync(file, bytes);
  operation.stdoutSha256 = hash(bytes);
}

test("Claude and Cursor mode in report with verified sources", t => {
  const f = currentProvenance(t);
  const claude = caseFor(f, 'claude'), cursor = caseFor(f, 'cursor');
  claude.coverage.ruleScopes = [claudeScope];
  cursor.coverage.ruleScopes = [cursorScope];
  for (const op of claude.operations.filter(operation => operation.installation)) {
    rewriteReply(f, op, reply => { reply.scopeOmissions = [claudeOmission]; });
  }
  f.save();
  assert.equal(audit(f.dir, f.origin, f.sources).matrixStatus, 'passed');
});

test("absent, contradictory, partial or ambiguous omissions Claude", t => {
  const f = currentProvenance(t);
  const claude = caseFor(f, 'claude');
  const init = claude.operations.find(op => op.label === 'init');
  claude.coverage.ruleScopes = [claudeScope];
  for (const scopeOmissions of [undefined, [{ ...claudeOmission, status: 'activation-unverified' }],
    [{ ...claudeOmission, target: '.claude/rules/outro/RULE.md' }], [claudeOmission, claudeOmission],
    [{ ...claudeOmission, trigger: 'always_on' }]]) {
    rewriteReply(f, init, reply => { reply.scopeOmissions = scopeOmissions; });
    f.save();
    assert.throws(() => audit(f.dir, f.origin, f.sources), /Omissão de escopo Claude diverge/);
  }
});

test("refusal scope Cursor without sidecar, incompatible mode, divergent destination or duplicate", t => {
  const f = currentProvenance(t);
  const cursor = caseFor(f, 'cursor');
  const invalid = [
    [[{ ...cursorScope, mode: 'apply-intelligently' }], /Modo de escopo Cursor diverge/],
    [[{ ...cursorScope, mode: 'manual' }], /Escopo de regra Cursor inválido/],
    [[{ ...cursorScope, target: '.cursor/rules/outro.mdc' }], /Escopo de regra Cursor inválido/],
    [[{ ...cursorScope, metadata: '.pbai4devs/rules/qualidade/custom.yml' }], /Escopo de regra Cursor inválido/],
    [[{ ...cursorScope, source: '.pbai4devs/rules/outro/RULE.md', target: '.cursor/rules/outro.mdc',
      metadata: '.pbai4devs/rules/outro/custom.yml' }], /Sidecar do escopo Cursor ausente/],
    [[cursorScope, cursorScope], /Escopo de regra duplicado/],
  ];
  for (const [ruleScopes, diagnostic] of invalid) {
    cursor.coverage.ruleScopes = ruleScopes;
    f.save();
    assert.throws(() => audit(f.dir, f.origin, f.sources), diagnostic);
  }
});

test("refusal of client scope absent from selection or declared only in final coverage", t => {
  const f = currentProvenance(t);
  const codex = caseFor(f, 'codex'), cursor = caseFor(f, 'cursor');
  codex.coverage.ruleScopes = [cursorScope];
  f.save();
  assert.throws(() => audit(f.dir, f.origin, f.sources), /Origem ou cliente do escopo/);
  delete codex.coverage.ruleScopes;
  cursor.coverage = { ...cursor.coverage, ruleScopes: [cursorScope] };
  f.save();
  assert.throws(() => audit(f.dir, f.origin, f.sources), /Escopos de regra da cobertura final divergentes/);
});

test('recusa uso de stdout de outro caso e de stderr de outra etapa, mesmo com hashes iguais', t => {
  const f = fixture(t);
  const init = f.result.operations.find(op => op.label === 'init');
  const other = f.report.results[1].operations.find(op => op.label === 'init');
  assert.equal(init.stdoutSha256, other.stdoutSha256);
  const original = init.stdout;
  init.stdout = other.stdout;
  f.save();
  assert.throws(() => audit(f.dir, f.origin), /Caminho de stdout fora do caso/);
  init.stdout = original;
  const update = f.result.operations.find(op => op.label === 'update');
  assert.equal(init.stderrSha256, update.stderrSha256);
  init.stderr = update.stderr;
  f.save();
  assert.throws(() => audit(f.dir, f.origin), /Caminho de stderr fora do caso/);
});

test("refusal JSON copied to the canonical log if the registered target belongs to another case", t => {
  const f = fixture(t);
  const init = f.result.operations.find(op => op.label === 'init');
  rewriteReply(f, init, reply => { reply.target = f.report.results[1].root; });
  f.save();
  assert.throws(() => audit(f.dir, f.origin), /Alvo do JSON de operação diverge do caso/);
});
