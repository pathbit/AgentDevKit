#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { isMain, projectRoot, requireNode } from '../lib/runtime.mjs';

const fail = message => { throw new Error(message); };
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const portable = value => value.split(sep).join('/');
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const completed = value => nonempty(value) && !/^(?:a definir|pendente|pending|todo|tbd|\.\.\.)[.!]?$/i.test(value.trim());
const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');

function pathInRoot(root, input) {
  if (!nonempty(input) || /[\0\r\n]/.test(input)) fail('Caminho invalido.');
  const name = portable(relative(root, resolve(root, input)));
  if (!name || name === '..' || name.startsWith('../') || isAbsolute(name) || name.split('/').some(part => part.toLowerCase() === '.git')) fail(`Caminho fora do escopo: ${input}`);
  let current = root;
  for (const part of name.split('/')) {
    current = join(current, part);
    try { if (lstatSync(current).isSymbolicLink()) fail(`Link simbolico nao permitido: ${name}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return name;
}

function git(root, args, allowFailure = false) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 15000, windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1' } });
  if ((result.error || result.status !== 0) && !allowFailure) fail(`Git: ${result.error?.message || result.stderr?.trim() || 'operacao falhou'}`);
  return result;
}

function repository(root) {
  const canonical = realpathSync(root);
  const top = git(canonical, ['rev-parse', '--show-toplevel']).stdout.trim();
  if (realpathSync(top) !== canonical) fail('Use a raiz do repositorio.');
  return canonical;
}

function head(root) {
  const result = git(root, ['rev-parse', '--verify', 'HEAD'], true);
  return result.status === 0 ? result.stdout.trim() : null;
}

function ignored(root, file) {
  return git(root, ['check-ignore', '--no-index', '-q', '--', file], true).status === 0;
}

function tracked(root, file) {
  return git(root, ['--literal-pathspecs', 'ls-files', '--error-unmatch', '--', file], true).status === 0;
}

function ignoredPaths(root, files) {
  if (!files.length) return new Set();
  const result = spawnSync('git', ['check-ignore', '--no-index', '--stdin', '-z'], { cwd: root, input: files.join('\0') + '\0', encoding: 'utf8', timeout: 15000, windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1' } });
  if (result.error || ![0, 1].includes(result.status)) fail(`Git: ${result.error?.message || result.stderr?.trim() || 'falha ao conferir ignores'}`);
  return new Set(result.stdout.split('\0').filter(Boolean));
}

function stagedDeletions(root) {
  return new Set(git(root, ['diff', '--cached', '--diff-filter=D', '--no-renames', '--name-only', '-z', '--']).stdout.split('\0').filter(Boolean));
}

function changedFiles(root) {
  const baseline = head(root);
  const versioned = git(root, baseline ? ['diff', '--name-only', '-z', 'HEAD', '--'] : ['ls-files', '-z']).stdout;
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z']).stdout;
  return [...new Set((versioned + '\0' + untracked).split('\0').filter(Boolean))].sort();
}

function snapshot(root, mode, paths, documents = [], spec = null) {
  const names = mode === 'git' ? [...changedFiles(root), ...paths] : paths;
  const selected = [...new Set(names.map(file => pathInRoot(root, file)))].sort();
  const deleted = stagedDeletions(root), local = ignoredPaths(root, selected);
  const files = selected.map(path => {
    if (path.toLowerCase().startsWith('.agent-tests/')) fail('Artefatos nao fazem parte do escopo versionado.');
    const absolute = join(root, path);
    if (!existsSync(absolute)) return { path, sha256: null };
    if (!lstatSync(absolute).isFile()) fail(`Escopo exige arquivos: ${path}`);
    return { path, sha256: createHash('sha256').update(readFileSync(absolute)).digest('hex'), ...(deleted.has(path) && local.has(path) ? { indexAction: 'untrack' } : {}) };
  });
  if (!files.length) fail('Nenhuma alteracao para revisar; indique --scope para uma revisao especifica.');
  return { mode, head: head(root), files, documents, spec };
}

export function specCriteria(text) {
  const section = text.match(/^## (?:Crit[eé]rios de aceite|Acceptance criteria)\s*\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/im)?.[1];
  const ids = [...new Set((section || '').match(/\bAC-\d{3,}\b/g) || [])];
  if (!ids.length) fail('A spec deve definir criterios AC-001, AC-002... na secao Criterios de aceite.');
  return ids;
}

function expectedDocuments(root, state, extra = []) {
  const existing = ['README.md', 'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'SECURITY.md'].filter(file => existsSync(join(root, file)));
  const changed = state.files.filter(file => /\.mdc?$/i.test(file.path)).map(file => file.path);
  const candidates = [...new Set([...existing, ...changed].map(file => pathInRoot(root, file)))];
  const local = ignoredPaths(root, candidates);
  const versioned = new Set(git(root, ['ls-files', '-z']).stdout.split('\0').filter(Boolean));
  return [...new Set([...candidates.filter(file => !local.has(file) || versioned.has(file)), ...extra.map(file => pathInRoot(root, file))])].sort();
}

function checkIndex(root, state) {
  const staged = new Set(git(root, ['diff', '--cached', '--name-only', '-z', '--']).stdout.split('\0').filter(Boolean));
  const deleted = stagedDeletions(root);
  const indexed = new Set(git(root, ['ls-files', '-z']).stdout.split('\0').filter(Boolean));
  const local = ignoredPaths(root, state.files.filter(file => file.indexAction === 'untrack').map(file => file.path));
  for (const file of state.files) {
    if (file.indexAction === 'untrack') {
      if (!staged.has(file.path) || !deleted.has(file.path) || indexed.has(file.path) || file.sha256 === null || !existsSync(join(root, file.path)) || !local.has(file.path)) fail(`Acao de desindexacao mudou: ${file.path}`);
      continue;
    }
    if (file.indexAction !== undefined) fail(`Acao de indice invalida: ${file.path}`);
    if (!staged.has(file.path)) continue;
    const deletedButPresent = !indexed.has(file.path) && file.sha256 !== null;
    const differs = git(root, ['--literal-pathspecs', 'diff', '--quiet', '--no-ext-diff', '--', file.path], true);
    if (deletedButPresent || differs.error || differs.status !== 0) fail(`Indice Git difere do arquivo testado: ${file.path}`);
  }
}

function artifact(root, file, prefix, mustExist) {
  const path = pathInRoot(root, file);
  if (!path.startsWith(prefix + '/')) fail(`Evidencia deve ficar em ${prefix}/: ${path}`);
  if (!ignored(root, path) || tracked(root, path)) fail(`Artefato deve estar ignorado e fora do indice Git: ${path}`);
  if (mustExist && (!existsSync(join(root, path)) || !lstatSync(join(root, path)).isFile() || lstatSync(join(root, path)).size === 0)) fail(`Evidencia ausente ou vazia: ${path}`);
  return path;
}

export function prepareReview({ root = projectRoot, id, execution = new Date().toISOString().replace(/[^a-z0-9]/gi, '').toLowerCase(), spec = null, scope = [], documents = [], output } = {}) {
  requireNode(); root = repository(root);
  if (!slug.test(id || '') || !slug.test(execution)) fail('Use referencia e execucao como slugs em minusculas.');
  const reference = spec ? pathInRoot(root, spec) : null;
  if (reference && ignored(root, reference) && !tracked(root, reference)) fail('A spec deve ser um documento versionavel, fora dos artefatos ignorados.');
  const criteria = reference ? specCriteria(readFileSync(join(root, reference), 'utf8')) : ['AC-001'];
  let state = snapshot(root, scope.length ? 'scope' : 'git', [...scope, ...(reference ? [reference] : [])]);
  const requiredDocs = expectedDocuments(root, state, documents);
  const localDocuments = ignoredPaths(root, requiredDocs);
  for (const file of requiredDocs) if (localDocuments.has(file) && !tracked(root, file)) fail(`Documento deve ser versionavel: ${file}`);
  state = snapshot(root, scope.length ? 'scope' : 'git', [...state.files.map(file => file.path), ...requiredDocs], requiredDocs, reference);
  const prefix = `.agent-tests/${id}/${execution}`;
  const file = artifact(root, output || `${prefix}/revisao.json`, prefix, false);
  const baselineFile = artifact(root, `${prefix}/baseline.json`, prefix, false);
  if (existsSync(join(root, file)) || existsSync(join(root, baselineFile))) fail(`Relatorio ja existe; preserve-o e use outra execucao: ${file}`);
  const baseline = { version: 1, reference: id, execution, spec: reference, snapshot: state, criteria };
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, baselineFile), JSON.stringify(baseline, null, 2) + '\n', { flag: 'wx' });
  const report = {
    version: 1, reference: id, execution, spec: reference, snapshot: state,
    baseline: { file: baselineFile, sha256: digest(join(root, baselineFile)) },
    documentation: expectedDocuments(root, state, documents).map(path => ({ path, decision: 'pending', reason: '' })),
    validation: criteria.map(criterion => ({ criterion, method: '', prerequisite: '', assertion: '', evidence: [], status: 'pending' })),
    review: { status: 'pending', reviewer: '', findings: [] },
  };
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return { file, report };
}

function validateReview(file, { root = projectRoot, requireSeal = true } = {}) {
  requireNode(); root = repository(root);
  const reportPath = pathInRoot(root, file);
  const report = JSON.parse(readFileSync(join(root, reportPath), 'utf8'));
  if (report.version !== 1 || !slug.test(report.reference || '') || !slug.test(report.execution || '')) fail('Cabecalho de revisao invalido.');
  const prefix = `.agent-tests/${report.reference}/${report.execution}`;
  artifact(root, reportPath, prefix, true);
  const baselineFile = artifact(root, `${prefix}/baseline.json`, prefix, true);
  const baseline = JSON.parse(readFileSync(join(root, baselineFile), 'utf8'));
  if (report.baseline?.file !== baselineFile || report.baseline.sha256 !== digest(join(root, baselineFile)) ||
      baseline.reference !== report.reference || baseline.execution !== report.execution || baseline.spec !== report.spec ||
      JSON.stringify(baseline.snapshot) !== JSON.stringify(report.snapshot)) fail('Baseline gerada diverge do relatorio; preserve os metadados e refaca o preparo.');
  const state = report.snapshot;
  if (!state || !['git', 'scope'].includes(state.mode) || !Array.isArray(state.files) || !Array.isArray(state.documents) || report.spec !== state.spec) fail('Snapshot ausente ou referencias alteradas.');
  const requiredDocs = state.documents.map(file => pathInRoot(root, file));
  const currentDocuments = expectedDocuments(root, state, requiredDocs);
  if (currentDocuments.some(path => !requiredDocs.includes(path) || !state.files.some(file => file.path === path))) {
    fail('Documentos obrigatorios mudaram depois do snapshot; refaca a revisao.');
  }
  const current = snapshot(root, state.mode, state.files.map(file => file.path), requiredDocs, state.spec);
  if (JSON.stringify(current) !== JSON.stringify(state)) fail('Arquivos ou HEAD mudaram depois do snapshot; refaca a revisao.');
  checkIndex(root, state);
  if (!Array.isArray(report.documentation) || !Array.isArray(report.validation)) fail('Documentacao e validacoes sao obrigatorias.');
  const docs = new Map();
  for (const item of report.documentation) {
    const path = pathInRoot(root, item.path);
    if (docs.has(path) || !['updated', 'no-impact', 'not-applicable'].includes(item.decision) || !completed(item.reason)) fail(`Decisao de documentacao pendente/invalida: ${path}`);
    if (item.decision !== 'not-applicable' && !existsSync(join(root, path))) fail(`Documento ausente: ${path}`);
    if (item.decision === 'not-applicable' && existsSync(join(root, path))) fail(`Documento existente exige decisao de impacto: ${path}`);
    docs.set(path, item);
  }
  for (const path of currentDocuments) if (!docs.has(path)) fail(`Documento sem revisao: ${path}`);
  const ids = new Set();
  const proofs = new Set();
  for (const item of report.validation) {
    if (!/^AC-\d{3,}$/.test(item.criterion || '') || ids.has(item.criterion)) fail('Criterio invalido ou duplicado.');
    ids.add(item.criterion);
    if (![item.method, item.prerequisite, item.assertion].every(completed)) fail(`Plano de validacao incompleto: ${item.criterion}`);
    if (item.status !== 'passed' || !Array.isArray(item.evidence) || !item.evidence.length) fail(`Criterio sem prova aprovada: ${item.criterion}`);
    for (const proof of item.evidence) proofs.add(artifact(root, proof, prefix, true));
  }
  if (!ids.size) fail('Nenhum criterio de aceite.');
  for (const id of baseline.criteria) if (!ids.has(id)) fail(`Criterio da spec sem resultado: ${id}`);
  if (report.review?.status !== 'approved' || !nonempty(report.review.reviewer) || !Array.isArray(report.review.findings)) fail('Revisao independente pendente.');
  if (report.review.findings.some(item => !nonempty(item.id) || !nonempty(item.description) || item.status !== 'resolved')) fail('Achados de revisao ainda abertos.');
  const seal = {
    reportHash: digest(join(root, reportPath)), baselineHash: digest(join(root, baselineFile)),
    evidence: [...proofs].sort().map(path => ({ path, sha256: digest(join(root, path)) })),
  };
  if (requireSeal) {
    if (!existsSync(join(root, prefix, 'seal.json'))) fail('Revisao nao selada; conclua a revisao independente e execute seal.');
    const sealPath = artifact(root, `${prefix}/seal.json`, prefix, true);
    const recorded = JSON.parse(readFileSync(join(root, sealPath), 'utf8'));
    if (JSON.stringify(recorded) !== JSON.stringify(seal)) fail('Relatorio, baseline ou evidencia alterados apos selar a revisao.');
  }
  return { root, prefix, seal, snapshot: state, result: { status: 'passed', report: reportPath, criteria: ids.size, documents: docs.size } };
}

export function checkReview(file, { root = projectRoot } = {}) { return validateReview(file, { root, requireSeal: true }).result; }

// This deliberately permits only a fast-forward and regular non-executable
// files. Existing review snapshots do not record modes or merge results.
export function checkMerge(reports, destination, { root = projectRoot } = {}) {
  requireNode(); root = repository(root);
  if (!Array.isArray(reports) || !reports.length) fail('Informe um ou mais relatorios selados, sem repeticao.');
  reports = reports.map(file => pathInRoot(root, file));
  if (new Set(reports).size !== reports.length) fail('Informe relatorios selados sem repeticao.');
  if (typeof destination !== 'string' || !destination.startsWith('refs/heads/') || git(root, ['check-ref-format', destination], true).status !== 0) fail('Destino deve ser uma branch local completa: refs/heads/<nome>.');
  const currentBranch = git(root, ['symbolic-ref', '--quiet', 'HEAD'], true);
  if (currentBranch.status !== 0) fail('Confira a branch de origem; HEAD destacado nao e aceito.');
  const sourceRef = currentBranch.stdout.trim();
  if (!sourceRef.startsWith('refs/heads/') || git(root, ['check-ref-format', sourceRef], true).status !== 0) fail('A origem deve ser uma branch local valida.');
  if (sourceRef === destination) fail('Origem e destino devem ser branches distintas.');
  for (const ref of [sourceRef, destination]) if (git(root, ['symbolic-ref', '--quiet', ref], true).status === 0) fail(`Branch simbolica nao e aceita: ${ref}`);
  const resolveCommit = ref => {
    const out = git(root, ['rev-parse', '--verify', `${ref}^{commit}`], true);
    const value = out.stdout?.trim();
    if (out.status !== 0 || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value || '')) fail(`Branch ou commit invalido: ${ref}`);
    return value;
  };
  const source = resolveCommit(sourceRef), target = resolveCommit(destination);
  if (head(root) !== source) fail('HEAD diverge da branch de origem.');
  if (git(root, ['merge-base', '--is-ancestor', target, source], true).status !== 0) fail('Apenas fast-forward comprovado e suportado; revise o resultado integrado para historico divergente.');
  const bytes = args => {
    const result = spawnSync('git', args, { cwd: root, timeout: 15000, windowsHide: true, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1' } });
    if (result.error || result.status !== 0) fail(`Git: ${result.error?.message || result.stderr?.toString().trim() || 'operacao falhou'}`);
    return result.stdout;
  };
  const decode = data => { try { return new TextDecoder('utf-8', { fatal: true }).decode(data); } catch { fail('Caminho Git nao e UTF-8 valido.'); } };
  const raw = bytes(['diff', '--raw', '-z', '--no-abbrev', '--no-renames', '--no-ext-diff', '--no-textconv', '--ignore-submodules=none', target, source, '--']);
  const parts = decode(raw).split('\0');
  if (parts.pop() !== '' || parts.length % 2) fail('Diff Git incompleto ou ambiguo.');
  const changes = new Map();
  for (let i = 0; i < parts.length; i += 2) {
    const match = /^:(\d{6}) (\d{6}) ([a-f0-9]+) ([a-f0-9]+) ([AMD])$/.exec(parts[i]);
    if (!match) fail('Tipo de alteracao Git nao suportado.');
    const [, beforeMode, afterMode, , , action] = match, path = pathInRoot(root, parts[i + 1]);
    if (changes.has(path) || !['000000', '100644'].includes(beforeMode) || !['000000', '100644'].includes(afterMode)) fail(`Tipo ou modo nao comprovado: ${path}`);
    changes.set(path, action);
  }
  if (!changes.size) fail('Nao ha alteracoes para integrar.');
  const reviewed = new Set();
  const verified = reports.map(file => validateReview(file, { root, requireSeal: true }));
  for (const review of verified) {
    if (review.snapshot.head !== source) fail('Relatorio nao corresponde ao commit de origem.');
    for (const item of review.snapshot.files) {
      const path = pathInRoot(root, item.path);
      if (item.indexAction !== undefined) fail(`Acao de indice nao pode comprovar merge: ${path}`);
      const tree = decode(bytes(['--literal-pathspecs', 'ls-tree', '-z', '--full-tree', source, '--', path]));
      if (!tree) {
        if (item.sha256 !== null) fail(`Conteudo revisado nao esta no commit de origem: ${path}`);
      } else {
        const m = /^(\d{6}) blob ([a-f0-9]+)\t([^\0]+)\0$/.exec(tree);
        if (!m || m[1] !== '100644' || m[3] !== path) fail(`Arquivo, link ou modo nao comprovado no commit: ${path}`);
        if (item.sha256 !== createHash('sha256').update(bytes(['cat-file', 'blob', m[2]])).digest('hex')) fail(`Conteudo revisado difere do commit de origem: ${path}`);
      }
      if (changes.has(path)) reviewed.add(path);
    }
  }
  const missing = [...changes.keys()].filter(path => !reviewed.has(path));
  if (missing.length) fail(`Alteracoes sem revisao selada: ${missing.join(', ')}`);
  // Detect moved refs or changed worktree/reports during the validation.
  if (git(root, ['symbolic-ref', '--quiet', 'HEAD']).stdout.trim() !== sourceRef || resolveCommit(sourceRef) !== source || resolveCommit(destination) !== target || head(root) !== source) fail('Origem ou destino mudou durante a verificacao.');
  for (const file of reports) validateReview(file, { root, requireSeal: true });
  if (git(root, ['symbolic-ref', '--quiet', 'HEAD']).stdout.trim() !== sourceRef || resolveCommit(sourceRef) !== source || resolveCommit(destination) !== target || head(root) !== source) fail('Origem ou destino mudou durante a verificacao.');
  return { status: 'passed', sourceRef, source, destination, target, changes: changes.size, reports: reports.length, mode: 'fast-forward' };
}

export function sealReview(file, options) {
  const checked = validateReview(file, { ...options, requireSeal: false });
  const path = artifact(checked.root, `${checked.prefix}/seal.json`, checked.prefix, false);
  if (existsSync(join(checked.root, path))) return checkReview(file, options);
  writeFileSync(join(checked.root, path), JSON.stringify(checked.seal, null, 2) + '\n', { flag: 'wx' });
  return checkReview(file, options);
}

const usage = 'Uso: revisar-entrega prepare --id <slug> [--execution <slug>] [--spec <arquivo>] [--scope <arquivo>] [--document <arquivo>] [--output <artefato>]; seal|check <revisao.json>; check-merge --destino refs/heads/<branch> <revisao.json> [...]';
export function main(args = process.argv.slice(2)) {
  requireNode(); const [mode, ...rest] = args;
  if (!mode || ['--help', '-h'].includes(mode)) { console.log(usage); return 0; }
  if (mode === 'check' && rest.length === 1) { console.log(JSON.stringify(checkReview(rest[0]))); return 0; }
  if (mode === 'seal' && rest.length === 1) { console.log(JSON.stringify(sealReview(rest[0]))); return 0; }
  if (mode === 'check-merge' && rest.length >= 3 && rest[0] === '--destino') { console.log(JSON.stringify(checkMerge(rest.slice(2), rest[1]))); return 0; }
  if (mode !== 'prepare') fail(usage);
  const options = { scope: [], documents: [] };
  const fields = { '--id': 'id', '--execution': 'execution', '--spec': 'spec', '--output': 'output' };
  for (let i = 0; i < rest.length; i += 2) {
    const value = rest[i + 1]; if (!value || value.startsWith('--')) fail(usage);
    if (rest[i] === '--scope') options.scope.push(value);
    else if (rest[i] === '--document') options.documents.push(value);
    else if (fields[rest[i]]) { if (options[fields[rest[i]]] !== undefined) fail('Opcao duplicada.'); options[fields[rest[i]]] = value; }
    else fail(usage);
  }
  console.log(JSON.stringify({ report: prepareReview(options).file, status: 'pending' })); return 0;
}

if (isMain(import.meta.url)) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
