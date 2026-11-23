#!/usr/bin/env node
// Auditoria de coerência de artefatos; não autentica relatórios nem os reexecuta.
import { createHash } from 'node:crypto';
import { constants, closeSync, fstatSync, lstatSync, openSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const fail = msg => { throw Error(msg); };
const sha = data => createHash('sha256').update(data).digest('hex');
const digestPattern = /^[a-f0-9]{64}$/;
const isDigest = value => typeof value === 'string' && digestPattern.test(value);
const expected = ['init', 'update', 'update-force', 'doctor', 'sync-check'];
const initial = ['codex','claude','opencode','vscode','copilot','cursor','kimi','minimax','deepseek','antigravity','antigravity-legacy','zcode','kimi-legacy','mimo','claude,codex','copilot,cursor','codex,opencode','antigravity,claude','deepseek,minimax','antigravity,copilot'];
const geminiSelections = ['codex','claude','opencode','gemini','copilot','cursor','kimi','minimax','deepseek','antigravity','antigravity-legacy','zcode','kimi-legacy','mimo','claude,codex','copilot,cursor','codex,opencode','gemini,claude','deepseek,minimax','antigravity,copilot'];
function selectionPool(selections) {
  const all=[], known=new Set(), agents=selections.slice(0,14);
  const add=x=>{const k=x.split(',').sort().join(',');if(!known.has(k)){known.add(k);all.push(x);}};
  selections.forEach(add);
  function choose(list,start,left){if(!left){add(list.join(','));return;}for(let i=start;i<=agents.length-left;i++)choose([...list,agents[i]],i+1,left-1);}
  for(let size=1;size<=4;size++)choose([],0,size);
  return all;
}
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
  let current = root, before;
  if (lstatSync(root).isSymbolicLink()) fail('Raiz da auditoria é link simbólico.');
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    before = lstatSync(current);
    if (before.isSymbolicLink()) fail('Link simbólico em caminho de evidência.');
    if (i < parts.length - 1 && !before.isDirectory()) fail('Ancestral não é diretório.');
  }
  if (!before?.isFile()) fail('Evidência não é arquivo regular.');
  const sameFile = stats => stats.isFile() && stats.dev === before.dev && stats.ino === before.ino
    && stats.size === before.size && stats.mtimeMs === before.mtimeMs && stats.ctimeMs === before.ctimeMs;
  const fd = openSync(current, constants.O_RDONLY | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0));
  try {
    if (!sameFile(fstatSync(fd))) fail('Evidência mudou antes da leitura.');
    const bytes = readFileSync(fd);
    if (!sameFile(fstatSync(fd)) || !sameFile(lstatSync(current))) fail('Evidência mudou durante a leitura.');
    return bytes;
  } finally { closeSync(fd); }
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
const runnerFiles = {
  runner: 'tests/project-matrix.mjs',
  managedContent: '.pbai4devs/scripts/lib/managed-content.mjs',
  managedToml: '.pbai4devs/scripts/lib/managed-toml.mjs',
};
const packageFiles = {
  packageManifest: 'package.json',
  packageCli: 'bin/agentdevkit.mjs',
  packageCatalog: '.pbai4devs/scripts/lib/catalog.mjs',
  packageResourcePath: '.pbai4devs/scripts/lib/resource-path.mjs',
  packageAdapterPolicy: '.pbai4devs/templates/clients/ADAPTERS.json',
};
const legacyProvenanceKeys = [...Object.keys(runnerFiles), 'packageCli', 'packageManifest'].sort();
const rulesPath = '.pbai4devs/rules';
const inventoryError = 'cursorSidecar:inventory';
const sidecarPrefix = 'cursorSidecar:';
const metadataNamePattern = /^[a-z0-9][a-z0-9._-]*\.ya?ml$/i;

function checkProvenanceEntry(entry, recordedPath, initial) {
  if (!isObject(entry) || typeof recordedPath !== 'string' || !recordedPath || entry.path !== recordedPath) {
    fail('Caminho de proveniência inválido.');
  }
  if (isDigest(entry.sha256) && Object.keys(entry).length === 2) return;
  if (!initial && typeof entry.error === 'string' && entry.error.trim() && Object.keys(entry).length === 2) return;
  fail('Hash ou erro de proveniência inválido.');
}

function checkProvenanceSnapshot(entries, fixedPaths, packageRoot, flavor, initial) {
  for (const [key, recordedPath] of Object.entries(fixedPaths)) checkProvenanceEntry(entries[key], recordedPath, initial);
  const sidecars = Object.keys(entries).filter(key => !Object.hasOwn(fixedPaths, key));
  if (sidecars.includes(inventoryError)) {
    const entry = entries[inventoryError];
    if (initial || sidecars.length !== 1 || entry?.error !== 'E_SIDECAR_INVENTORY') fail('Inventário de proveniência Cursor inválido.');
    checkProvenanceEntry(entry, flavor.join(packageRoot, ...rulesPath.split('/')), false);
    return;
  }
  const filenames = new Set();
  for (const key of sidecars) {
    const relative = key.slice(sidecarPrefix.length);
    const parts = relative.split('/');
    const filename = parts.at(-1);
    if (!key.startsWith(sidecarPrefix) || !relative.startsWith(`${rulesPath}/`)
      || parts.some(part => !part || part === '.' || part === '..' || /[:\\\x00-\x1f]/.test(part))
      || !metadataNamePattern.test(filename)) fail('Chave de proveniência Cursor inválida.');
    filenames.add(filename.toLowerCase());
    checkProvenanceEntry(entries[key], flavor.join(packageRoot, ...parts), true);
  }
  if (filenames.size > 1) fail('Nomes de sidecars de proveniência Cursor divergentes.');
}

function provenanceRoot(directory) {
  const absolute = path.resolve(directory);
  if (!lstatSync(absolute).isDirectory()) fail('Raiz de proveniência deve ser diretório regular.');
  return realpathSync(absolute);
}

function readSidecars(packageRoot, metadataName) {
  const result = new Map();
  if (!lstatSync(path.join(packageRoot, '.pbai4devs')).isDirectory()) fail('Diretório de proveniência do pacote inválido.');
  function visit(relative) {
    const parts = relative.split('/');
    const absolute = path.join(packageRoot, ...parts);
    const info = lstatSync(absolute);
    const namedSidecar = parts.at(-1).toLowerCase() === metadataName.toLowerCase();
    if (info.isSymbolicLink()) fail('Link simbólico em inventário de proveniência Cursor.');
    if (info.isDirectory() && !namedSidecar) {
      for (const name of readdirSync(absolute)) visit(`${relative}/${name}`);
    } else if (namedSidecar) {
      result.set(`${sidecarPrefix}${relative}`, regularFile(packageRoot, parts));
    } else if (relative === rulesPath) fail('Diretório de proveniência Cursor inválido.');
  }
  visit(rulesPath);
  return result;
}

function verifyProvenanceSources(report, sources) {
  const before = report.provenance.before;
  const runnerRoot = provenanceRoot(sources.runnerRoot);
  const packageRoot = provenanceRoot(sources.packageRoot);
  function checkedRead(root, key, relative) {
    const bytes = regularFile(root, relative.split('/'));
    if (sha(bytes) !== before[key].sha256) fail(`Hash da fonte de proveniência divergente: ${key}.`);
    return bytes;
  }
  for (const [key, relative] of Object.entries(runnerFiles)) checkedRead(runnerRoot, key, relative);
  const packageBytes = new Map(Object.entries(packageFiles).map(([key, relative]) => [key, checkedRead(packageRoot, key, relative)]));
  const meta = json(packageBytes.get('packageManifest'));
  if (meta?.name !== '@pathbit/agentdevkit' || meta.version !== report.version) fail('Nome ou versão da fonte do pacote diverge do relatório.');
  const policy = json(packageBytes.get('packageAdapterPolicy'));
  const cursor = Array.isArray(policy?.adapters) ? policy.adapters.filter(adapter => adapter?.id === 'cursor') : [];
  if (cursor.length !== 1 || typeof cursor[0].ruleMetadata !== 'string' || !metadataNamePattern.test(cursor[0].ruleMetadata)) {
    fail('Política de proveniência Cursor inválida.');
  }
  const recorded = new Map(Object.entries(before).filter(([key]) => key.startsWith(sidecarPrefix))
    .map(([key, entry]) => [key, entry.sha256]));
  const metadataName = cursor[0].ruleMetadata;
  const sidecars = readSidecars(packageRoot, metadataName);
  const hashes = new Map([...sidecars].map(([key, bytes]) => [key, sha(bytes)]));
  if (!isDeepStrictEqual(recorded, hashes)) {
    fail('Inventário ou hash de sidecars de proveniência Cursor divergente.');
  }
  const matrixPlan = policy.adapters.some(adapter => adapter.id === 'gemini') ? 'with-gemini' : 'current';
  return { metadataName, sidecars, matrixPlan };
}

function verifyProvenance(report, flavor, sources) {
  const p = report.provenance;
  if (!isObject(p) || p.algorithm !== 'sha256' || !isObject(p.before) || !isObject(p.after)) fail('Proveniência inválida.');
  const legacy = [p.before, p.after].every(entries => isDeepStrictEqual(Object.keys(entries).sort(), legacyProvenanceKeys));
  if (legacy) {
    if (sources.packageRoot !== undefined || sources.runnerRoot !== undefined) fail('Formato legado de proveniência contém apenas cinco registros.');
    for (const key of legacyProvenanceKeys) {
      checkProvenanceEntry(p.before[key], p.before[key]?.path, true);
      checkProvenanceEntry(p.after[key], p.before[key].path, false);
    }
  } else {
    const absolute = value => typeof value === 'string' && flavor.isAbsolute(value) && flavor.normalize(value) === value;
    const runner = p.before.runner?.path;
    if (!Object.keys({ ...runnerFiles, ...packageFiles }).every(key => Object.hasOwn(p.before, key) && Object.hasOwn(p.after, key))) {
      fail('Campos de proveniência inválidos.');
    }
    if (!absolute(runner) || !absolute(report.package) || typeof p.platform !== 'string' || !p.platform
      || (p.platform === 'win32') !== (flavor === path.win32) || typeof p.arch !== 'string' || !p.arch) {
      fail('Raízes, plataforma ou arquitetura de proveniência inválidas.');
    }
    const recordedRunnerRoot = flavor.dirname(flavor.dirname(runner));
    const paths = (root, entries) => Object.entries(entries).map(([key, relative]) => [key, flavor.join(root, ...relative.split('/'))]);
    const fixed = Object.fromEntries([...paths(recordedRunnerRoot, runnerFiles), ...paths(report.package, packageFiles)]);
    checkProvenanceSnapshot(p.before, fixed, report.package, flavor, true);
    checkProvenanceSnapshot(p.after, fixed, report.package, flavor, false);
    if (typeof sources.packageRoot !== 'string' || !sources.packageRoot || typeof sources.runnerRoot !== 'string' || !sources.runnerRoot) {
      fail('Proveniência atual exige as raízes confiáveis --package e --runner-root.');
    }
  }
  const passed = isDeepStrictEqual(p.before, p.after);
  if (p.passed !== passed) fail('Proveniência inconsistente.');
  const sourcesVerified = !legacy && passed;
  const sourceDetails = sourcesVerified ? verifyProvenanceSources(report, sources) : null;
  return { passed, sourcesVerified, sourceDetails, legacy };
}

function checkRuleScopes(scopes, selection, reply, provenance, sourceDetails) {
  if (!Array.isArray(scopes) || !scopes.length || !isObject(reply)) fail('Escopos de regra inválidos.');
  const selected = new Set(selection.split(','));
  const seen = new Set();
  for (const scope of scopes) {
    const { client, source, target, mode, metadata } = isObject(scope) ? scope : {};
    const relative = typeof source === 'string' && /^\.pbai4devs\/rules\/((?:[a-z0-9][a-z0-9._-]*\/)*[a-z0-9][a-z0-9._-]*)\/RULE\.md$/i.exec(source)?.[1];
    if (!relative || source !== `${rulesPath}/${relative}/RULE.md` || !selected.has(client)) fail('Origem ou cliente do escopo de regra inválido.');
    const key = `${client}:${source.toLowerCase()}`;
    if (seen.has(key)) fail('Escopo de regra duplicado.');
    seen.add(key);
    if (client === 'claude') {
      if (mode !== 'explicit-source-only' || target !== `.claude/rules/${relative}/RULE.md` || Object.keys(scope).length !== 4) {
        fail('Escopo de regra Claude inválido.');
      }
      const matching = Array.isArray(reply.scopeOmissions)
        ? reply.scopeOmissions.filter(item => item?.source === source || item?.target === target) : [];
      const trigger = matching[0]?.trigger;
      if (matching.length !== 1 || !['manual', 'model_decision', 'glob'].includes(trigger)
        || !isDeepStrictEqual(matching[0], { source, target, trigger, status: 'explicit-reference-planned' })
        || (reply.retainedClaudeRules !== undefined && !isDeepStrictEqual(reply.retainedClaudeRules, []))) {
        fail('Omissão de escopo Claude diverge do stdout.');
      }
    } else if (client === 'cursor') {
      const metadataName = typeof metadata === 'string' ? path.posix.basename(metadata) : '';
      if (!['always-apply', 'apply-intelligently'].includes(mode) || target !== `.cursor/rules/${relative}.mdc`
        || !metadataNamePattern.test(metadataName) || metadata !== `${rulesPath}/${relative}/${metadataName}`
        || (sourceDetails && metadataName !== sourceDetails.metadataName) || Object.keys(scope).length !== 5) {
        fail('Escopo de regra Cursor inválido.');
      }
      const sidecarKey = `${sidecarPrefix}${metadata}`;
      // Inventário preserva a caixa do nome real, enquanto o registro usa o nome da política.
      const keys = Object.hasOwn(provenance, sidecarKey) ? [sidecarKey]
        : Object.keys(provenance).filter(key => path.posix.dirname(key) === path.posix.dirname(sidecarKey)
          && path.posix.basename(key).toLowerCase() === metadataName.toLowerCase());
      if (keys.length !== 1 || !isDigest(provenance[keys[0]].sha256)) fail('Sidecar do escopo Cursor ausente no inventário de proveniência.');
      if (sourceDetails) {
        const text = sourceDetails.sidecars.get(keys[0]).toString('utf8');
        const flag = /^---\ndescription: [^\r\n]+\nalwaysApply: (true|false)\n---\n$/.exec(text)?.[1];
        if (flag !== (mode === 'always-apply' ? 'true' : 'false')) fail('Modo de escopo Cursor diverge do sidecar verificado.');
      }
    } else fail('Cliente do escopo de regra não suportado.');
  }
}
export function audit(output, origin, sources = {}) {
  const read = recordedMapping(origin, output);
  const flavor = /^[A-Za-z]:[\\/]/.test(origin) || /^\\\\/.test(origin) ? path.win32 : path.posix;
  const summaryBytes = read(flavor.join(origin, 'RESULT.json'));
  const report = json(summaryBytes);
  if (!isObject(report) || !Array.isArray(report.results) || !Number.isInteger(report.rounds) || report.rounds < 1 || report.rounds > 100 || !Number.isInteger(report.startRound) || report.startRound < 1 || report.startRound + report.rounds - 1 > 100 || report.results.length !== report.rounds * 40 || typeof report.version !== 'string' || !report.version) fail('Rodadas, cardinalidade ou versão inválidas.');
  const { passed: provenance, sourcesVerified, sourceDetails, legacy } = verifyProvenance(report, flavor, sources);
  const matrixPlan = report.matrixPlan === undefined ? 'with-gemini' : report.matrixPlan;
  if (!['with-gemini', 'current'].includes(matrixPlan)
    || (sourceDetails && sourceDetails.matrixPlan !== matrixPlan)) fail('Plano de seleções da matriz inválido.');
  const pool = selectionPool(matrixPlan === 'with-gemini' ? geminiSelections : initial);
  const counts = { passed: 0, failed: 0, 'not-verified': 0 }, seen = new Set(), selectionPairs = new Set();
  for (const [index, result] of report.results.entries()) {
    if (!isObject(result) || !Number.isSafeInteger(result.number) || result.number < 1 || seen.has(result.number) || !Object.hasOwn(counts, result.status) || result.passed !== (result.status === 'passed')) fail('Caso inválido.');
    const round = report.startRound + Math.floor(index / 40);
    if (result.number !== (report.startRound - 1) * 40 + index + 1 || result.round !== round || result.fixture !== (round - 1) % 4 || result.kind !== (index % 2 ? 'existing' : 'new') || typeof result.selection !== 'string' || !result.selection || (index % 2 && result.selection !== report.results[index - 1].selection)) fail('IDs, rodada ou par de seleção inválidos.');
    const planned = pool[Math.floor((round - 1) / 4) * 20 + Math.floor((index % 40) / 2)];
    if (result.selection !== planned) fail('Seleção não corresponde à matriz planejada.');
    if (index % 2 === 0) { const key = `${round}:${result.selection}`; if (selectionPairs.has(key)) fail('Seleção duplicada na rodada.'); selectionPairs.add(key); }
    seen.add(result.number); counts[result.status]++;
    const hasOperations = Array.isArray(result.operations);
    const caseDirectory = flavor.join(origin, `${String(result.number).padStart(2, '0')}-${result.kind}`);
    const caseReport = hasOperations ? flavor.join(caseDirectory, 'RESULT.json') : flavor.join(origin, `case-${result.number}-setup-error.json`);
    if (result.report !== caseReport) fail('Caminho do relatório individual diverge do caso.');
    const entry = json(read(result.report));
    if (!isDeepStrictEqual(entry, result)) fail('Relatório individual divergente.');
    if (!hasOperations) {
      if (result.status !== 'failed' || result.coverage?.ruleScopes !== undefined) fail('Caso sem operações não está marcado failed ou declara escopo de regra.');
      continue;
    }
    const stepStdout = new Map();
    for (const op of result.operations) {
      if (!isObject(op) || typeof op.label !== 'string' || !/^[a-z][a-z0-9-]*$/.test(op.label)) fail('Operação inválida.');
      let stdout;
      for (const field of ['stdout', 'stderr']) {
        const hash = op[`${field}Sha256`];
        if (op[field] !== flavor.join(caseDirectory, `${op.label}.${field}.log`)) fail(`Caminho de ${field} fora do caso ou da operação registrada.`);
        const bytes = read(op[field]);
        if (!isDigest(hash) || sha(bytes) !== hash) fail(`Hash de ${field} divergente.`);
        if (field === 'stdout') stdout = bytes;
      }
      if (expected.includes(op.label)) stepStdout.set(op, stdout);
      const coverage = op.installation?.coverage;
      if (isObject(coverage) && Object.hasOwn(coverage, 'ruleScopes')) {
        if (legacy || !expected.includes(op.label)) fail('Escopo de regra requer proveniência atual e operação de instalação.');
        checkRuleScopes(coverage.ruleScopes, result.selection, json(stdout), report.provenance.before, sourceDetails);
      }
    }
    if (!isDeepStrictEqual(result.coverage?.ruleScopes, result.operations.at(-1)?.installation?.coverage?.ruleScopes)) fail('Escopos de regra da cobertura final divergentes.');
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
        const reply = json(stepStdout.get(op));
        const command = op.label === 'sync-check' ? 'sync' : op.label === 'update-force' ? 'update' : op.label;
        if (reply.ok !== true || reply.version !== report.version || reply.command !== command || (op.label.startsWith('update') && reply.changed !== false) || (op.label === 'doctor' && (!Array.isArray(reply.issues) || reply.issues.length)) || (op.label === 'sync-check' && (!Array.isArray(reply.plan) || reply.plan.length || !Array.isArray(reply.conflicts) || reply.conflicts.length))) fail('JSON de operação inconsistente.');
        if (Object.hasOwn(reply, 'target') && reply.target !== result.root) fail('Alvo do JSON de operação diverge do caso.');
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
  return { audit: 'consistent', matrixStatus: status, projects: report.projects, passed: counts.passed, failed: counts.failed, notVerified: counts['not-verified'], reportSha256: sha(summaryBytes), provenanceRecorded: provenance, provenanceSourcesVerified: sourcesVerified,
    limitations: ['A coerência não autentica o relatório nem comprova execução, preservação, descoberta nativa ou integridade de todo o pacote.',
      sourcesVerified ? 'A proveniência confere os arquivos indicados nas raízes fornecidas no momento da auditoria e não cobre alterações transitórias.' : 'A auditoria verificou apenas os registros de proveniência.',
      'A comparação começa em BEFORE, após a preparação Git; SETUP.json e a preservação durante a preparação não são auditados.', 'O confinamento usa lstat e O_NOFOLLOW quando disponível, sem proteção completa contra mudanças concorrentes em ancestrais.'] };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({
      options: { package: { type: 'string' }, 'runner-root': { type: 'string' } },
      allowPositionals: true,
    });
    if (positionals.length !== 2) fail('Uso: node matrix-audit.mjs <saída> <origem registrada> [--package <pacote> --runner-root <checkout do runner>]');
    console.log(JSON.stringify(audit(...positionals, { packageRoot: values.package, runnerRoot: values['runner-root'] })));
  } catch (error) { console.error(`Auditoria recusada: ${error.message}`); process.exitCode = 2; }
}
