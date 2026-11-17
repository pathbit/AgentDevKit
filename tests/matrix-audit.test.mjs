import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { join, win32 } from 'node:path';
import { tmpdir } from 'node:os';
import { audit } from './matrix-audit.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const selections=['codex','claude','opencode','gemini','copilot','cursor','kimi','minimax','deepseek','antigravity','antigravity-legacy','zcode','kimi-legacy','mimo','claude,codex','copilot,cursor','codex,opencode','gemini,claude','deepseek,minimax','antigravity,copilot'];
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
  const report={version,rounds:1,startRound:round,projects:40,passed:status==='passed'?40:39,failed:Number(status==='failed'),notVerified:Number(status==='not-verified'),status,provenance:{algorithm:'sha256',before,after:before,passed:true},results:entries.map(x=>x.result)};
  const save=()=>{for(const e of entries)writeFileSync(join(e.caseDir,'RESULT.json'),JSON.stringify(e.result));writeFileSync(join(dir,'RESULT.json'),JSON.stringify(report));};
  save();return {parent,dir,origin,caseDir:entries[0].caseDir,result:entries[0].result,report,save};
}
test('passed coerente',t=>{let f=fixture(t);let a=audit(f.dir,f.origin);assert.equal(a.matrixStatus,'passed');assert.equal(a.projects,40);});
test('not-verified não é promovido',t=>{let f=fixture(t,'not-verified');let a=audit(f.dir,f.origin);assert.equal(a.matrixStatus,'not-verified');assert.equal(a.notVerified,1);});
test('falha bem formada permanece falha',t=>{let f=fixture(t,'failed');assert.equal(audit(f.dir,f.origin).matrixStatus,'failed');});
test('contagem divergente',t=>{let f=fixture(t);f.report.passed=0;f.save();assert.throws(()=>audit(f.dir,f.origin),/Contagens/);});
test('status global divergente',t=>{let f=fixture(t,'not-verified');f.report.status='passed';f.save();assert.throws(()=>audit(f.dir,f.origin),/Status global/);});
test('hash de log divergente',t=>{let f=fixture(t);writeFileSync(join(f.caseDir,'init.stdout.log'),'alterado');assert.throws(()=>audit(f.dir,f.origin),/Hash/);});
test('log fora da saída',t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='init').stdout='/source/outside';f.save();assert.throws(()=>audit(f.dir,f.origin),/fora da saída/);});
test('link interno recusado',t=>{let f=fixture(t);let target=join(f.parent,'other');mkdirSync(target);writeFileSync(join(target,'log'),'');try{symlinkSync(target,join(f.dir,'link'),'dir');}catch(e){if(process.platform==='win32'&&['EPERM','EACCES'].includes(e.code)){t.skip('Privilégio de symlink indisponível');return;}throw e;}f.result.operations.find(o=>o.label==='init').stdout=f.origin+'/link/log';f.save();assert.throws(()=>audit(f.dir,f.origin),/Link simbólico/);});
test('raiz symlink recusada',t=>{let f=fixture(t);const link=join(f.parent,'root-link');try{symlinkSync(f.dir,link,'dir');}catch(e){if(process.platform==='win32'&&['EPERM','EACCES'].includes(e.code)){t.skip('Privilégio de symlink indisponível');return;}throw e;}assert.throws(()=>audit(link,f.origin),/Raiz.*link/);});
test('caso individual divergente',t=>{let f=fixture(t);writeFileSync(join(f.caseDir,'RESULT.json'),'{}');assert.throws(()=>audit(f.dir,f.origin),/individual divergente/);});
test('identificador duplicado',t=>{let f=fixture(t);f.report.results[1].number=1;f.save();assert.throws(()=>audit(f.dir,f.origin),/Caso inválido/);});
test('caminhos Windows gravados',t=>{let f=fixture(t,'passed',true);assert.equal(audit(f.dir,f.origin).matrixStatus,'passed');});
test('zero resultados recusados',t=>{let f=fixture(t);f.report.results=[];f.report.projects=0;f.report.passed=0;f.save();assert.throws(()=>audit(f.dir,f.origin),/cardinalidade/);});
test('rounds inválido',t=>{let f=fixture(t);f.report.rounds=2;f.save();assert.throws(()=>audit(f.dir,f.origin),/cardinalidade/);});
test('startRound e IDs divergentes',t=>{let f=fixture(t);f.report.startRound=2;f.save();assert.throws(()=>audit(f.dir,f.origin),/IDs/);});
test('proveniência incompleta',t=>{let f=fixture(t);delete f.report.provenance.before.managedToml;f.save();assert.throws(()=>audit(f.dir,f.origin),/proveniência/);});
test('coverage ausente',t=>{let f=fixture(t);f.result.coverage=null;f.save();assert.throws(()=>audit(f.dir,f.origin),/Coverage/);});
test('coverage desconhecida',t=>{let f=fixture(t);f.result.coverage.status='unknown';f.save();assert.throws(()=>audit(f.dir,f.origin),/Coverage|Status individual/);});
test('coverage verificada com motivo não verificado',t=>{let f=fixture(t);f.result.coverage.notVerified=['não verificado'];f.save();assert.throws(()=>audit(f.dir,f.origin),/Coverage|Status individual/);});
test('ok falso na operação',t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='init').ok=false;f.save();assert.throws(()=>audit(f.dir,f.origin),/Resposta/);});
test('versão divergente na operação',t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='init').version='1.0.0';f.save();assert.throws(()=>audit(f.dir,f.origin),/Resposta/);});
test('snapshot intermediário contraditório',t=>{let f=fixture(t);writeFileSync(join(f.caseDir,'init.snapshot.json'),JSON.stringify({status:'verified',unchanged:false,documentsPreserved:true}));assert.throws(()=>audit(f.dir,f.origin),/Snapshot intermediário/);});
test('snapshot final contraditório',t=>{let f=fixture(t);writeFileSync(join(f.caseDir,'AFTER.json'),'{}');assert.throws(()=>audit(f.dir,f.origin),/Snapshot final/);});

test('dados do snapshot contradizem indicador',t=>{let f=fixture(t);const file=join(f.caseDir,'init.snapshot.json');const snap=JSON.parse(readFileSync(file));snap.after.human.sha256='b'.repeat(64);writeFileSync(file,JSON.stringify(snap));assert.throws(()=>audit(f.dir,f.origin),/Dados do snapshot/);});
test('JSON de operação com hash consistente mas comando incorreto',t=>{let f=fixture(t);const op=f.result.operations.find(o=>o.label==='init'), body=JSON.stringify({ok:true,version:'0.0.30',command:'outro'})+'\n';writeFileSync(join(f.caseDir,'init.stdout.log'),body);op.stdoutSha256=hash(body);f.save();assert.throws(()=>audit(f.dir,f.origin),/JSON de operação/);});
test('proveniência de cinco arquivos mudou, resultado permanece failed',t=>{let f=fixture(t,'failed');f.report.provenance.after={...f.report.provenance.before,runner:{...f.report.provenance.before.runner,sha256:'b'.repeat(64)}};f.report.provenance.passed=false;f.save();assert.equal(audit(f.dir,f.origin).matrixStatus,'failed');});
test('seleção duplicada dentro da rodada',t=>{let f=fixture(t);f.report.results[2].selection=f.report.results[0].selection;f.report.results[3].selection=f.report.results[0].selection;f.save();assert.throws(()=>audit(f.dir,f.origin),/Seleção não corresponde/);});
function unverified(f, label, reason) {
  f.result.status='not-verified';f.result.passed=false;
  f.result.coverageAssessment={status:'not-verified',reasons:[`${label}: ${reason}`]};
  f.report.passed=39;f.report.notVerified=1;f.report.status='not-verified';
}
test('novo: coverage de init ausente é not-verified coerente',t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='init').installation.coverage;unverified(f,'init','cobertura ausente ou inválida');f.save();assert.equal(audit(f.dir,f.origin).matrixStatus,'not-verified');});
test('novo: coverage final ausente é not-verified coerente',t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='sync-check').installation.coverage;f.result.coverage=null;unverified(f,'sync-check','cobertura ausente ou inválida');f.save();assert.equal(audit(f.dir,f.origin).matrixStatus,'not-verified');});
test('novo: cobertura desconhecida é not-verified coerente',t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='init').installation.coverage={...f.result.coverage,status:'unknown'};unverified(f,'init','status de cobertura desconhecido');f.save();assert.equal(audit(f.dir,f.origin).matrixStatus,'not-verified');});
test('novo: instalação ausente não comprova inventário',t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='init').installation;unverified(f,'init','cobertura ausente ou inválida');f.save();assert.throws(()=>audit(f.dir,f.origin),/Inventário/);});
test('novo: verified com motivos gera not-verified',t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='init').installation.coverage={...f.result.coverage,notVerified:['não foi verificado']};unverified(f,'init','cobertura não verificada: não foi verificado');f.save();assert.equal(audit(f.dir,f.origin).matrixStatus,'not-verified');});
test('novo: motivos inexatos são recusados',t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='init').installation.coverage;unverified(f,'init','outra razão');f.save();assert.throws(()=>audit(f.dir,f.origin),/Motivos/);});
test('novo: cobertura ausente nunca gera passed',t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='init').installation.coverage;f.result.coverageAssessment={status:'not-verified',reasons:['init: cobertura ausente ou inválida']};f.save();assert.throws(()=>audit(f.dir,f.origin),/Status individual/);});
test('novo: assessment falso recusado mesmo se o status é not-verified',t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='init').installation.coverage;unverified(f,'init','cobertura ausente ou inválida');f.result.coverageAssessment.status='verified';f.save();assert.throws(()=>audit(f.dir,f.origin),/Motivos/);});
test('novo: assessment verified coerente permanece passed',t=>{let f=fixture(t);f.result.coverageAssessment={status:'verified',reasons:[]};f.save();assert.equal(audit(f.dir,f.origin).matrixStatus,'passed');});
test('índice Git ausente no baseline é recusado',t=>{let f=fixture(t);const file=join(f.caseDir,'BEFORE.json'), b=JSON.parse(readFileSync(file));delete b.unchanged['.git/index'];writeFileSync(file,JSON.stringify(b));assert.throws(()=>audit(f.dir,f.origin),/Arquivos mínimos/);});
test('baseline sem arquivos mínimos é recusado',t=>{let f=fixture(t);const file=join(f.caseDir,'BEFORE.json'), b=JSON.parse(readFileSync(file));b.unchanged={};writeFileSync(file,JSON.stringify(b));assert.throws(()=>audit(f.dir,f.origin),/Arquivos mínimos/);});
test('seleção sintética não planejada é recusada',t=>{let f=fixture(t);f.report.results[0].selection='agente-ficticio';f.report.results[1].selection='agente-ficticio';f.save();assert.throws(()=>audit(f.dir,f.origin),/Seleção não corresponde/);});
test('rodada cinco aceita IDs e seleções planejadas',t=>{let f=fixture(t);const selection='codex,gemini|codex,copilot|codex,cursor|codex,kimi|codex,minimax|codex,deepseek|codex,antigravity|codex,antigravity-legacy|codex,zcode|codex,kimi-legacy|codex,mimo|claude,opencode|claude,copilot|claude,cursor|claude,kimi|claude,minimax|claude,deepseek|claude,antigravity|claude,antigravity-legacy|claude,zcode'.split('|');f.report.startRound=5;f.report.results.forEach((x,i)=>{x.number=161+i;x.round=5;x.selection=selection[Math.floor(i/2)];x.operations.find(o=>o.label==='init').args[3]=x.selection;});f.save();assert.equal(audit(f.dir,f.origin).matrixStatus,'passed');});
function mutateBaseline(f, caseName, change){const file=join(f.dir,caseName,'BEFORE.json'),value=JSON.parse(readFileSync(file));change(value);writeFileSync(file,JSON.stringify(value));}
test('referências vazias são recusadas',t=>{let f=fixture(t);mutateBaseline(f,'01-new',b=>{b.refs={};});assert.throws(()=>audit(f.dir,f.origin),/Diretórios de refs/);});
test('ref heads obrigatória é recusada quando removida',t=>{let f=fixture(t);mutateBaseline(f,'01-new',b=>{delete b.refs['.git/refs/heads'];});assert.throws(()=>audit(f.dir,f.origin),/Diretórios de refs/);});
test('refs opcionais vazias são recusadas',t=>{let f=fixture(t);mutateBaseline(f,'01-new',b=>{b.optional={};});assert.throws(()=>audit(f.dir,f.origin),/Refs opcionais/);});
test('ref de HEAD ausente é recusada',t=>{let f=fixture(t);mutateBaseline(f,'01-new',b=>{delete b.optional['.git/refs/heads/main'];});assert.throws(()=>audit(f.dir,f.origin),/Ref de HEAD ausente/);});
test('ref de projeto existente deve estar presente',t=>{let f=fixture(t);mutateBaseline(f,'02-existing',b=>{b.optional['.git/refs/heads/main']=null;});assert.throws(()=>audit(f.dir,f.origin),/Ref do projeto existente ausente/);});
test('árvore de refs e ref de HEAD devem coincidir',t=>{let f=fixture(t);mutateBaseline(f,'02-existing',b=>{b.refs['.git/refs/heads/main'].sha256='b'.repeat(64);});assert.throws(()=>audit(f.dir,f.origin),/Ref de HEAD divergente/);});
test('documentos vazios são recusados em existente',t=>{let f=fixture(t);mutateBaseline(f,'02-existing',b=>{b.documents={};});assert.throws(()=>audit(f.dir,f.origin),/Documentos humanos obrigatórios/);});
test('cada documento humano é obrigatório em existente',t=>{let f=fixture(t);mutateBaseline(f,'02-existing',b=>{delete b.documents['CLAUDE.md'];});assert.throws(()=>audit(f.dir,f.origin),/Documentos humanos obrigatórios/);});
test('arquivos humanos do kit são obrigatórios em existente',t=>{let f=fixture(t);mutateBaseline(f,'02-existing',b=>{delete b.unchanged['.pbai4devs/skills/projeto/criar-skill/SKILL.md'];});assert.throws(()=>audit(f.dir,f.origin),/Arquivos mínimos/);});
test('variante 1 exige regra Cursor para existente',t=>{let f=fixture(t,'passed',false,2);assert.equal(audit(f.dir,f.origin).matrixStatus,'passed');mutateBaseline(f,'42-existing',b=>{delete b.unchanged['.cursor/rules/equipe.mdc'];});assert.throws(()=>audit(f.dir,f.origin),/Arquivos mínimos/);});
test('variante 2 exige comando Gemini para existente',t=>{let f=fixture(t,'passed',false,3);assert.equal(audit(f.dir,f.origin).matrixStatus,'passed');mutateBaseline(f,'82-existing',b=>{delete b.unchanged['.gemini/commands/equipe.toml'];});assert.throws(()=>audit(f.dir,f.origin),/Arquivos mínimos/);});
test('variante 3 exige skill humana de colisão no novo',t=>{let f=fixture(t,'passed',false,4);assert.equal(audit(f.dir,f.origin).matrixStatus,'passed');mutateBaseline(f,'121-new',b=>{delete b.documents['.agents/skills/projeto/criar-skill/SKILL.md'];});assert.throws(()=>audit(f.dir,f.origin),/Documentos humanos obrigatórios/);});
test('documentos com modo contraditório não são aprovados',t=>{let f=fixture(t);const file=join(f.dir,'02-existing','init.snapshot.json'),snapshot=JSON.parse(readFileSync(file));snapshot.documents['AGENTS.md'].after.mode=0;writeFileSync(file,JSON.stringify(snapshot));assert.throws(()=>audit(f.dir,f.origin),/Dados do snapshot/);});

test('hash do HEAD deve corresponder à ref opcional',t=>{let f=fixture(t);mutateBaseline(f,'01-new',b=>{b.unchanged['.git/HEAD'].sha256='f'.repeat(64);});assert.throws(()=>audit(f.dir,f.origin),/HEAD não corresponde/);});
test('ancestrais vazios em índice Git não comprovam diretórios',t=>{let f=fixture(t);mutateBaseline(f,'01-new',b=>{b.unchanged['.git/index'].directories={};});assert.throws(()=>audit(f.dir,f.origin),/Arquivos mínimos/);});
test('ancestral de documento ausente é recusado',t=>{let f=fixture(t);mutateBaseline(f,'02-existing',b=>{delete b.documents['.claude/skills/criar-skill/SKILL.md'].directories['.claude/skills'];});assert.throws(()=>audit(f.dir,f.origin),/Documentos humanos obrigatórios/);});
test('ancestral da ref opcional ausente é recusado',t=>{let f=fixture(t);mutateBaseline(f,'02-existing',b=>{delete b.optional['.git/refs/heads/main'].directories['.git/refs'];});assert.throws(()=>audit(f.dir,f.origin),/Snapshot de refs opcionais inválido/);});
test('AFTER e resultado idênticos mas diferentes do último snapshot são recusados',t=>{let f=fixture(t);const file=join(f.caseDir,'AFTER.json'),value=JSON.parse(readFileSync(file));value.after.human.sha256='f'.repeat(64);writeFileSync(file,JSON.stringify(value));f.result.preservation=value;f.save();assert.throws(()=>audit(f.dir,f.origin),/Snapshot final divergente/);});
test('preparação git-init ausente não gera passado',t=>{let f=fixture(t);f.result.operations=f.result.operations.filter(o=>o.label!=='git-init');f.save();assert.throws(()=>audit(f.dir,f.origin),/Preparação Git/);});
test('preparação git-add-base ausente em projeto existente é recusada',t=>{let f=fixture(t);const x=f.report.results[1];x.operations=x.operations.filter(o=>o.label!=='git-add-base');f.save();assert.throws(()=>audit(f.dir,f.origin),/Preparação Git/);});
test('git-add com status de falha não gera passado',t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='git-add').status=1;f.save();assert.throws(()=>audit(f.dir,f.origin),/Preparação Git/);});
test('preparações Git fora de ordem são recusadas',t=>{let f=fixture(t);[f.result.operations[0],f.result.operations[1]]=[f.result.operations[1],f.result.operations[0]];f.save();assert.throws(()=>audit(f.dir,f.origin),/Preparação Git/);});
test('fingerprint ausente não comprova inventário',t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='init').installation.fingerprint;f.save();assert.throws(()=>audit(f.dir,f.origin),/Inventário/);});
test('git init com argumentos ausentes é recusado',t=>{let f=fixture(t);delete f.result.operations.find(o=>o.label==='git-init').args;f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test('git add deve incluir o arquivo staged humano',t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='git-add').args.pop();f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test('git add-base deve incluir AGENTS.md',t=>{let f=fixture(t);const op=f.report.results[1].operations.find(o=>o.label==='git-add-base');op.args=op.args.filter(x=>x!=='AGENTS.md');f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test('git commit deve registrar identidade sintética esperada',t=>{let f=fixture(t);const op=f.report.results[1].operations.find(o=>o.label==='git-commit-base');op.args[1]='user.name=Outro';f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test('fixture 1 adiciona sentinela humana ao git add',t=>{let f=fixture(t,'passed',false,2);f.result.operations.find(o=>o.label==='git-add').args.pop();f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test('fixture 3 adiciona colisão nativa ao git add-base',t=>{let f=fixture(t,'passed',false,4);f.report.results[1].operations.find(o=>o.label==='git-add-base').args.pop();f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test('init deve informar seleção planejada',t=>{let f=fixture(t);f.result.operations.find(o=>o.label==='init').args[3]='outro';f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test('sync deve registrar --check',t=>{let f=fixture(t);const o=f.result.operations.find(o=>o.label==='sync-check');o.args=o.args.filter(a=>a!=='--check');f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test('alvo da operação deve ser a própria fixture',t=>{let f=fixture(t);const o=f.result.operations.find(o=>o.label==='init');o.args[o.args.indexOf('--target')+1]='/outro';f.save();assert.throws(()=>audit(f.dir,f.origin),/Argumentos registrados/);});
test('root registrado deve ser o diretório project do caso',t=>{let f=fixture(t);f.result.root='/outra-pasta';f.save();assert.throws(()=>audit(f.dir,f.origin),/Raiz registrada/);});
