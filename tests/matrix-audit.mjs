#!/usr/bin/env node
// Auditoria de coerência de artefatos; não autentica relatórios nem os reexecuta.
import { createHash } from 'node:crypto';
import { constants, closeSync, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

const fail = msg => { throw Error(msg); };
const sha = data => createHash('sha256').update(data).digest('hex');
const digestPattern = /^[a-f0-9]{64}$/;
const expected = ['init', 'update', 'update-force', 'doctor', 'sync-check'];
const initial = ['codex','claude','opencode','gemini','copilot','cursor','kimi','minimax','deepseek','antigravity','antigravity-legacy','zcode','kimi-legacy','mimo','claude,codex','copilot,cursor','codex,opencode','gemini,claude','deepseek,minimax','antigravity,copilot'];
function selectionPool() {
  const all=[], known=new Set(), agents=initial.slice(0,14);
  const add=x=>{const k=x.split(',').sort().join(',');if(!known.has(k)){known.add(k);all.push(x);}};
  initial.forEach(add);
  function choose(list,start,left){if(!left){add(list.join(','));return;}for(let i=start;i<=agents.length-left;i++)choose([...list,agents[i]],i+1,left-1);}
  for(let size=1;size<=4;size++)choose([],0,size);
  return all;
}
const pool=selectionPool();
// Recalcula independentemente os motivos publicados pelo runner. Alterações no
// contrato exigem revisão explícita desta função; não importa o runner.
function coverageAssessment(operations) {
  const reasons=[];
  for(const label of expected) {
    const matches=operations.filter(op=>op.label===label);
    if(matches.length!==1){reasons.push(`${label}: etapa ausente ou duplicada`);continue;}
    const c=matches[0].installation?.coverage;
    if(!isObject(c)){reasons.push(`${label}: cobertura ausente ou inválida`);continue;}
    const counts=c.checked;
    if(!isObject(counts)||!['skills','agents','commands','rules'].every(k=>Number.isSafeInteger(counts[k])&&counts[k]>=0)||!Array.isArray(c.notVerified)||!c.notVerified.every(x=>typeof x==='string'&&x.trim())){reasons.push(`${label}: dados de cobertura incompletos ou inválidos`);continue;}
    if(!['verified','not-verified'].includes(c.status)){reasons.push(`${label}: status de cobertura desconhecido`);continue;}
    if(c.status==='not-verified'||c.notVerified.length)reasons.push(`${label}: cobertura não verificada${c.notVerified.length?`: ${c.notVerified.join('; ')}`:''}`);
  }
  return {status:reasons.length?'not-verified':'verified',reasons};
}
const json = bytes => JSON.parse(bytes.toString('utf8'));
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);

// Não segue links em componentes internos na checagem observada. Não é openat:
// substituições simultâneas entre checagem e abertura estão fora do contrato.
function regularFile(root, parts) {
  let current = root;
  if (lstatSync(root).isSymbolicLink()) fail('Raiz da auditoria é link simbólico.');
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    const st = lstatSync(current);
    if (st.isSymbolicLink()) fail('Link simbólico em caminho de evidência.');
    if (i < parts.length - 1 && !st.isDirectory()) fail('Ancestral não é diretório.');
    if (i === parts.length - 1 && !st.isFile()) fail('Evidência não é arquivo regular.');
  }
  const fd = openSync(current, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try { if (!fstatSync(fd).isFile()) fail('Evidência não é arquivo regular.'); return readFileSync(fd); }
  finally { closeSync(fd); }
}
function recordedMapping(origin, output) {
  if (typeof origin !== 'string' || !origin) fail('Origem obrigatória.');
  const flavor = /^[A-Za-z]:[\\/]/.test(origin) || /^\\\\/.test(origin) ? path.win32 : path.posix;
  if (!flavor.isAbsolute(origin)) fail('Origem deve ser absoluta.');
  const base = flavor.resolve(origin);
  if (lstatSync(path.resolve(output)).isSymbolicLink()) fail('Raiz da auditoria é link simbólico.');
  const realRoot = realpathSync(output);
  if (!lstatSync(realRoot).isDirectory()) fail('Saída deve ser diretório.');
  return p => {
    if (typeof p !== 'string' || !flavor.isAbsolute(p)) fail('Caminho registrado inválido.');
    const r = flavor.relative(base, flavor.resolve(p));
    if (!r || r === '..' || r.startsWith(`..${flavor.sep}`) || flavor.isAbsolute(r)) fail('Caminho fora da saída registrada.');
    const parts = r.split(flavor.sep);
    if (parts.some(part => !part || part === '.' || part === '..' || part.includes('/') || part.includes('\\'))) fail('Componente inválido.');
    return regularFile(realRoot, parts);
  };
}
function provenanceOK(p) {
  if (!isObject(p) || !isObject(p.before) || !isObject(p.after)) fail('Proveniência inválida.');
  const keys = Object.keys(p.before).sort();
  const required = ['managedContent', 'managedToml', 'packageCli', 'packageManifest', 'runner'];
  if (p.algorithm !== 'sha256' || !isDeepStrictEqual(keys, required) || !isDeepStrictEqual(keys, Object.keys(p.after).sort())) fail('Campos de proveniência inválidos.');
  return keys.every(key => isObject(p.before[key]) && isObject(p.after[key]) && typeof p.before[key].path === 'string' && p.before[key].path === p.after[key].path && digestPattern.test(p.before[key].sha256 || '') && p.before[key].sha256 === p.after[key].sha256);
}
export function audit(output, origin) {
  const read = recordedMapping(origin, output);
  const flavor = /^[A-Za-z]:[\\/]/.test(origin) || /^\\\\/.test(origin) ? path.win32 : path.posix;
  const summaryBytes = read(flavor.join(origin, 'RESULT.json'));
  const report = json(summaryBytes);
  if (!isObject(report) || !Array.isArray(report.results) || !Number.isInteger(report.rounds) || report.rounds < 1 || report.rounds > 100 || !Number.isInteger(report.startRound) || report.startRound < 1 || report.startRound + report.rounds - 1 > 100 || report.results.length !== report.rounds * 40 || typeof report.version !== 'string' || !report.version) fail('Rodadas, cardinalidade ou versão inválidas.');
  const provenance = provenanceOK(report.provenance);
  if (report.provenance.passed !== provenance) fail('Proveniência inconsistente.');
  const counts = { passed: 0, failed: 0, 'not-verified': 0 }, seen = new Set(), selectionPairs = new Set();
  for (const [index, result] of report.results.entries()) {
    if (!isObject(result) || !Number.isSafeInteger(result.number) || result.number < 1 || seen.has(result.number) || !Object.hasOwn(counts, result.status) || result.passed !== (result.status === 'passed')) fail('Caso inválido.');
    const round = report.startRound + Math.floor(index / 40);
    if (result.number !== (report.startRound - 1) * 40 + index + 1 || result.round !== round || result.fixture !== (round - 1) % 4 || result.kind !== (index % 2 ? 'existing' : 'new') || typeof result.selection !== 'string' || !result.selection || (index % 2 && result.selection !== report.results[index - 1].selection)) fail('IDs, rodada ou par de seleção inválidos.');
    const planned = pool[Math.floor((round - 1) / 4) * 20 + Math.floor((index % 40) / 2)];
    if (result.selection !== planned) fail('Seleção não corresponde à matriz planejada.');
    if (index % 2 === 0) { const key = `${round}:${result.selection}`; if (selectionPairs.has(key)) fail('Seleção duplicada na rodada.'); selectionPairs.add(key); }
    seen.add(result.number); counts[result.status]++;
    const entry = json(read(result.report));
    if (!isDeepStrictEqual(entry, result)) fail('Relatório individual divergente.');
    if (!Array.isArray(result.operations)) {
      if (result.status !== 'failed') fail('Caso sem operações não está marcado failed.');
      continue;
    }
    for (const op of result.operations) {
      if (!isObject(op) || typeof op.label !== 'string') fail('Operação inválida.');
      for (const field of ['stdout', 'stderr']) {
        const hash = op[`${field}Sha256`];
        if (!digestPattern.test(hash || '') || sha(read(op[field])) !== hash) fail(`Hash de ${field} divergente.`);
      }
    }
    const steps = result.operations.filter(op => expected.includes(op.label));
    const complete = !result.issue && steps.length === 5 && result.preservation?.unchanged === true && result.preservation?.documentsPreserved === true;
    const calculated = coverageAssessment(result.operations);
    const hasAssessment = Object.hasOwn(result, 'coverageAssessment');
    if (hasAssessment && !isDeepStrictEqual(result.coverageAssessment, calculated)) fail('Motivos de coverageAssessment divergentes.');
    const status = !complete ? 'failed' : calculated.status === 'not-verified' ? 'not-verified' : 'passed';
    if (result.status !== status) fail('Status individual inconsistente.');
    if (result.status !== 'failed') {
      function coverageOK(c) { return isObject(c) && ['verified','not-verified'].includes(c.status) && Array.isArray(c.notVerified) && c.notVerified.every(x => typeof x === 'string' && x.length > 0) && (c.status === 'verified' ? c.notVerified.length === 0 : c.notVerified.length > 0) && isObject(c.checked) && ['skills','agents','commands','rules'].every(k => Number.isSafeInteger(c.checked[k]) && c.checked[k] >= 0); }
      if (!hasAssessment && !coverageOK(result.coverage)) fail('Coverage ausente ou contraditória em relatório legado.');
      const preparation = result.kind === 'existing' ? ['git-init','git-add-base','git-commit-base','git-add'] : ['git-init','git-add'];
      if (!isDeepStrictEqual(result.operations.map(op=>op.label),[...preparation,...expected]) || result.operations.some(op => op.status !== 0 || op.signal !== null || op.error !== null || op.timedOut !== false || op.exceeded !== false)) fail('Preparação Git ou operações de caso completo inconsistentes.');
      const expectedRoot=flavor.join(flavor.dirname(result.report),'project');
      if(result.root!==expectedRoot)fail('Raiz registrada da fixture divergente.');
      const human=result.fixture>0?`human/round-${result.round}/case-${result.number}.txt`:null;
      const native=[null,'.cursor/rules/equipe.mdc','.gemini/commands/equipe.toml','.agents/skills/projeto/criar-skill/SKILL.md'][result.fixture];
      const extras=human?[human,...(result.kind==='existing'||result.fixture===3?[native]:[])]:[];
      const cli=report.provenance.before.packageCli.path;
      const wanted={
        'git-init':['init','--quiet'],
        'git-add-base':['add','--','.gitignore','AGENTS.md','CLAUDE.md','.claude','.pbai4devs/skills','src/main.js',...extras],
        'git-commit-base':['-c','user.name=Fixture Developer','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','--quiet','-m','test: criar fixture sintética'],
        'git-add':['add','--','.gitignore','HUMAN-STAGED.txt',...(human?[human]:[])],
        init:[cli,'init','--agents',result.selection,'--target',result.root,'--json'],
        update:[cli,'update','--target',result.root,'--json'],
        'update-force':[cli,'update','--force','--target',result.root,'--json'],
        doctor:[cli,'doctor','--target',result.root,'--json'],
        'sync-check':[cli,'sync','--check','--target',result.root,'--json'],
      };
      if(result.operations.some(op=>!isDeepStrictEqual(op.args,wanted[op.label])))fail('Argumentos registrados da operação divergentes.');
      const baseline = json(read(flavor.join(flavor.dirname(result.report), 'BEFORE.json')));
      const requiredFiles=['.git/index','.git/HEAD','.git/config','.git/info/exclude','.gitignore','HUMAN-STAGED.txt','HUMAN-UNTRACKED.txt'];
      const requiredDocs=[];
      if(result.kind==='existing') {
        requiredFiles.push('.pbai4devs/skills/equipe/skill-propria/SKILL.md','.pbai4devs/skills/projeto/criar-skill/SKILL.md','.claude/settings.json','.claude/skills/equipe/SKILL.md','src/main.js');
        requiredDocs.push('AGENTS.md','CLAUDE.md','.claude/skills/criar-skill/SKILL.md');
      }
      if(result.fixture>0) {
        requiredFiles.push(`human/round-${result.round}/case-${result.number}.txt`);
        if(result.kind==='existing' && result.fixture===1)requiredFiles.push('.cursor/rules/equipe.mdc');
        if(result.kind==='existing' && result.fixture===2)requiredFiles.push('.gemini/commands/equipe.toml');
        if(result.fixture===3)requiredDocs.push('.agents/skills/projeto/criar-skill/SKILL.md');
      }
      const validFile=(x,p)=>{
        if(!isObject(x)||!digestPattern.test(x.sha256||'')||!Number.isSafeInteger(x.mode)||!isObject(x.directories)||typeof p!=='string'||p.startsWith('/')||p.split('/').some(z=>!z||z==='.'||z==='..'||z.includes('\\')))return false;
        const parts=p.split('/'), parents=['.'];
        for(let i=1;i<parts.length;i++)parents.push(parts.slice(0,i).join('/'));
        return isDeepStrictEqual(Object.keys(x.directories).sort(),parents.sort())&&parents.every(k=>x.directories[k]?.type==='directory'&&Number.isSafeInteger(x.directories[k].mode));
      };
      if(!isObject(baseline.unchanged)||requiredFiles.some(k=>!validFile(baseline.unchanged[k],k))||Object.entries(baseline.unchanged).some(([k,v])=>!validFile(v,k)))fail('Arquivos mínimos do snapshot ausentes ou inválidos.');
      if(!isObject(baseline.documents)||requiredDocs.some(k=>!validFile(baseline.documents[k],k))||Object.entries(baseline.documents).some(([k,v])=>!validFile(v,k)))fail('Documentos humanos obrigatórios ausentes ou inválidos.');
      if(!isObject(baseline.refs)||['.git/refs','.git/refs/heads','.git/refs/tags'].some(k=>baseline.refs[k]?.type!=='directory'||!Number.isSafeInteger(baseline.refs[k].mode)))fail('Diretórios de refs ausentes ou inválidos.');
      if(!isObject(baseline.optional)||!Object.hasOwn(baseline.optional,'.git/packed-refs'))fail('Refs opcionais ausentes.');
      const branches=Object.keys(baseline.optional).filter(k=>/^\.git\/refs\/heads\/[A-Za-z0-9._/-]+$/.test(k)&&k.split('/').every(part=>part!=='.'&&part!=='..'&&part));
      if(branches.length!==1)fail('Ref de HEAD ausente ou inválida.');
      const branch=branches[0], branchSnapshot=baseline.optional[branch], packed=baseline.optional['.git/packed-refs'];
      if(baseline.unchanged['.git/HEAD'].sha256!==sha(Buffer.from(`ref: ${branch.slice(5)}\n`)))fail('HEAD não corresponde à ref registrada.');
      if((branchSnapshot!==null&&!validFile(branchSnapshot,branch))||(packed!==null&&!validFile(packed,'.git/packed-refs')))fail('Snapshot de refs opcionais inválido.');
      if(result.kind==='existing'&&branchSnapshot===null)fail('Ref do projeto existente ausente.');
      if(branchSnapshot===null ? Object.hasOwn(baseline.refs,branch) : !isDeepStrictEqual(baseline.refs[branch],{type:'file',...branchSnapshot}))fail('Ref de HEAD divergente da árvore de refs.');
      let fingerprint, lastSnapshot;
      for (const op of steps) {
        if (op.ok !== true || op.version !== report.version || (!hasAssessment && !coverageOK(op.installation?.coverage))) fail('Resposta ou coverage de operação inconsistente.');
        const reply = json(read(op.stdout));
        const command = op.label === 'sync-check' ? 'sync' : op.label === 'update-force' ? 'update' : op.label;
        if (reply.ok !== true || reply.version !== report.version || reply.command !== command || (op.label.startsWith('update') && reply.changed !== false) || (op.label === 'doctor' && (!Array.isArray(reply.issues) || reply.issues.length)) || (op.label === 'sync-check' && (!Array.isArray(reply.plan) || reply.plan.length || !Array.isArray(reply.conflicts) || reply.conflicts.length))) fail('JSON de operação inconsistente.');
        const snapshot = json(read(op.preservation?.snapshot));
        lastSnapshot = snapshot;
        if (op.preservation?.status !== 'verified' || op.preservation.unchanged !== true || op.preservation.documentsPreserved !== true || snapshot.status !== op.preservation.status || snapshot.unchanged !== op.preservation.unchanged || snapshot.documentsPreserved !== op.preservation.documentsPreserved) fail('Snapshot intermediário inconsistente.');
        if (!isDeepStrictEqual(snapshot.baseline, baseline) || !isObject(baseline.unchanged) || !isObject(baseline.documents) || !isObject(baseline.optional) || !isObject(baseline.refs) || !isObject(snapshot.after) || !isObject(snapshot.optional) || !isObject(snapshot.refs) || !isObject(snapshot.documents)) fail('Estrutura do snapshot inválida.');
        const same = (a,b) => isDeepStrictEqual(a,b);
        const unchanged = same(baseline.unchanged,snapshot.after) && same(baseline.optional,snapshot.optional) && same(baseline.refs,snapshot.refs);
        const docs = same(Object.keys(baseline.documents).sort(),Object.keys(snapshot.documents).sort()) && Object.entries(snapshot.documents).every(([k,d]) => d.originalPrefixPreserved === true && d.allowedContent === true && d.modePreserved === true && d.directoriesPreserved === true && validFile(d.after,k) && d.after.mode === baseline.documents[k].mode && same(d.after.directories,baseline.documents[k].directories));
        if (!unchanged || !docs || snapshot.observedUnchanged !== true || snapshot.observedOptionalUnchanged !== true || snapshot.observedRefsUnchanged !== true || snapshot.observedDocumentsPreserved !== true) fail('Dados do snapshot contradizem preservação.');
        if (!isObject(op.installation) || !digestPattern.test(op.installation.fingerprint || '') || (fingerprint && fingerprint !== op.installation.fingerprint)) fail('Inventário ausente ou inconsistente.');
        fingerprint = op.installation.fingerprint;
      }
      if (!isDeepStrictEqual(result.coverage ?? null, steps.at(-1).installation?.coverage ?? null)) fail('Coverage final divergente.');
      const finalSnapshot = json(read(flavor.join(flavor.dirname(result.report), 'AFTER.json')));
      if (!isDeepStrictEqual(finalSnapshot, result.preservation) || !isDeepStrictEqual(finalSnapshot, lastSnapshot)) fail('Snapshot final divergente.');
    }
  }
  if (report.projects !== report.results.length || report.passed !== counts.passed || report.failed !== counts.failed || report.notVerified !== counts['not-verified']) fail('Contagens inconsistentes.');
  const status = !provenance || counts.failed ? 'failed' : counts['not-verified'] ? 'not-verified' : 'passed';
  if (report.status !== status) fail('Status global inconsistente.');
  return { audit: 'consistent', matrixStatus: status, projects: report.projects, passed: counts.passed, failed: counts.failed, notVerified: counts['not-verified'], reportSha256: sha(summaryBytes), provenanceRecorded: provenance,
    limitations: ['A coerência não autentica o relatório nem comprova execução, preservação, descoberta nativa ou integridade do pacote.', 'A proveniência apenas confere valores registrados; não lê suas fontes nem cobre alterações transitórias.', 'A comparação começa em BEFORE, após a preparação Git; SETUP.json e a preservação durante a preparação não são auditados.', 'O confinamento usa lstat e O_NOFOLLOW quando disponível, sem proteção completa contra mudanças concorrentes em ancestrais.'] };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 4) fail('Uso: node matrix-audit.mjs <diretório da saída> <diretório de origem registrado>');
    console.log(JSON.stringify(audit(process.argv[2], process.argv[3])));
  } catch (error) { console.error(`Auditoria recusada: ${error.message}`); process.exitCode = 2; }
}
