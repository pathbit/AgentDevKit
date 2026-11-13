#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { githubRequest } from './publish.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const invalid = message => { throw new Error(message); };
const shaPattern = /^[a-f0-9]{40}$/;
const versionPattern = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const expectedName = '@pathbit/agentdevkit';
const ciPath = '.github/workflows/ci.yml';

function checkedPackage(pkg) {
  if (pkg?.name !== expectedName || !versionPattern.test(pkg.version || '')) invalid('Nome ou versão do pacote inválido.');
  return pkg.version;
}

function versionLessThan(left, right) {
  const a = left.split('.').map(BigInt), b = right.split('.').map(BigInt);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

function trustedRun(run, { repository, branch, sha, id, attempt }) {
  return run?.id === id && run.run_attempt === attempt && run.head_sha === sha && run.head_branch === branch
    && run.event === 'push' && run.path === ciPath && run.status === 'completed' && run.conclusion === 'success'
    && run.repository?.full_name === repository && run.head_repository?.full_name === repository;
}

function checkedContext(event, env, checkoutCommit) {
  const repository = env.GITHUB_REPOSITORY;
  const branch = event?.repository?.default_branch;
  const run = event?.workflow_run;
  const sha = run?.head_sha, id = run?.id, attempt = run?.run_attempt;
  if (env.GITHUB_EVENT_NAME !== 'workflow_run' || event?.action !== 'completed'
    || !/^[\w.-]+\/[\w.-]+$/.test(repository || '') || event?.repository?.full_name !== repository
    || !['master', 'main'].includes(branch) || !shaPattern.test(sha || '') || checkoutCommit !== sha
    || !Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(attempt) || attempt < 1
    || !trustedRun(run, { repository, branch, sha, id, attempt })) invalid('Evento, CI, branch ou checkout não confiável.');
  return { repository, branch, sha, id, attempt };
}

function previousPackage(response) {
  if (!response || response.encoding !== 'base64' || typeof response.content !== 'string') invalid('Versão anterior não disponível; não será criada uma tag.');
  try {
    return JSON.parse(Buffer.from(response.content.replace(/\s/g, ''), 'base64').toString('utf8'));
  } catch { return invalid('Versão anterior inválida; não será criada uma tag.'); }
}

async function commitForRef(ref, repository, request) {
  let object = ref?.object;
  for (let depth = 0; object?.type === 'tag' && depth < 5; depth++) {
    if (!shaPattern.test(object.sha || '')) invalid('Objeto de tag inválido.');
    object = (await request('GET', `/repos/${repository}/git/tags/${object.sha}`))?.object;
  }
  if (object?.type !== 'commit' || !shaPattern.test(object.sha || '')) invalid('A tag existente não aponta para commit válido.');
  return object.sha;
}

async function ensureNotOlderThanTags(prefix, version, request) {
  const refs = await request('GET', `${prefix}/git/matching-refs/tags/v`);
  if (!Array.isArray(refs)) invalid('Não foi possível conferir as versões já marcadas.');
  for (const entry of refs) {
    const candidate = typeof entry?.ref === 'string' && entry.ref.startsWith('refs/tags/v') ? entry.ref.slice(11) : '';
    if (versionPattern.test(candidate) && versionLessThan(version, candidate)) invalid('Versão inferior a uma tag existente não será publicada automaticamente.');
  }
}

// The completed CI and its exact artifact are revalidated before any writes.
// Never wait for the dispatched release from this workflow.
export async function autoTagRelease({ event, environment = process.env, checkoutCommit, packageInfo, lock, request }) {
  const context = checkedContext(event, environment, checkoutCommit);
  const { repository, branch, sha, id, attempt } = context;
  if (typeof request !== 'function') invalid('Cliente da API do GitHub ausente.');
  const version = checkedPackage(packageInfo);
  if (lock?.name !== expectedName || lock.version !== version || lock.packages?.['']?.name !== expectedName
    || lock.packages?.['']?.version !== version || !Number.isInteger(lock.lockfileVersion)) invalid('package-lock.json diverge do pacote.');
  const tag = `v${version}`, prefix = `/repos/${repository}`;
  const ciRun = await request('GET', `${prefix}/actions/runs/${id}`);
  if (!trustedRun(ciRun, context)) invalid('CI de origem não está concluído e aprovado para este commit.');
  const artifacts = await request('GET', `${prefix}/actions/runs/${id}/artifacts?per_page=100`);
  const expectedArtifact = `agentdevkit-${sha}-${attempt}`;
  if (!Array.isArray(artifacts?.artifacts) || !artifacts.artifacts.some(item => item.name === expectedArtifact && item.expired === false && Number.isSafeInteger(item.id) && item.id > 0)) invalid('Artefato do CI aprovado ausente ou expirado.');
  const branchRef = await request('GET', `${prefix}/git/ref/heads/${encodeURIComponent(branch)}`);
  if (branchRef?.object?.type !== 'commit' || !shaPattern.test(branchRef.object.sha || '')) invalid('HEAD remoto do branch inválido.');
  if (branchRef.object.sha !== sha) return { status: 'skipped', reason: 'branch-advanced', tag, sourceCommit: sha };
  const commit = await request('GET', `${prefix}/commits/${sha}`);
  const parent = commit?.parents?.[0]?.sha;
  if (commit?.sha !== sha || !shaPattern.test(parent || '')) invalid('Commit anterior indisponível; não será criada uma tag.');
  const beforeResponse = await request('GET', `${prefix}/contents/package.json?ref=${parent}`);
  const priorVersion = checkedPackage(previousPackage(beforeResponse));
  if (versionLessThan(version, priorVersion)) invalid('Versão inferior à anterior não será publicada automaticamente; use uma versão fixa para rollback.');
  const tagRefPath = `${prefix}/git/ref/tags/${encodeURIComponent(tag)}`;
  let tagRef = await request('GET', tagRefPath);
  let created = false;
  if (tagRef) {
    const existing = await commitForRef(tagRef, repository, request);
    if (existing !== sha) {
      if (priorVersion !== version) invalid('A versão já possui tag em outro commit; ela não será movida.');
      const release = await request('GET', `${prefix}/releases/tags/${encodeURIComponent(tag)}`);
      if (!release || release.tag_name !== tag || release.draft !== false) invalid('A versão já possui tag em outro commit sem release publicada; recupere essa publicação.');
      return { status: 'skipped', reason: 'version-already-released', tag, sourceCommit: existing };
    }
  } else {
    await ensureNotOlderThanTags(prefix, version, request);
    try {
      await request('POST', `${prefix}/git/refs`, { ref: `refs/tags/${tag}`, sha });
      created = true;
    } catch (error) {
      if (!/HTTP (?:409|422)\.?$/.test(error?.message || '')) throw error;
      tagRef = await request('GET', tagRefPath);
      if (!tagRef || await commitForRef(tagRef, repository, request) !== sha) throw error;
    }
  }
  const finalRef = await request('GET', tagRefPath);
  if (!finalRef || await commitForRef(finalRef, repository, request) !== sha) invalid('A tag mudou antes da publicação.');
  const release = await request('GET', `${prefix}/releases/tags/${encodeURIComponent(tag)}`);
  if (release) {
    if (release.tag_name !== tag || release.draft !== false) invalid('Release existente está incompleta; recupere-a antes de publicar.');
    return { status: 'skipped', reason: 'release-exists', tag, sourceCommit: sha, created };
  }
  if (!created) await ensureNotOlderThanTags(prefix, version, request);
  const runs = await request('GET', `${prefix}/actions/workflows/release.yml/runs?head_sha=${sha}&per_page=100`);
  if (!runs || !Array.isArray(runs.workflow_runs)) invalid('Não foi possível conferir publicações em andamento.');
  if (runs.workflow_runs.some(run => run.head_sha === sha && run.head_branch === tag
    && run.repository?.full_name === repository && run.head_repository?.full_name === repository
    && run.path === '.github/workflows/release.yml' && run.status !== 'completed')) {
    return { status: 'skipped', reason: 'release-in-progress', tag, sourceCommit: sha, created };
  }
  await request('POST', `${prefix}/actions/workflows/release.yml/dispatches`, { ref: tag, inputs: { tag, expected_commit: sha } });
  return { status: 'dispatched', tag, sourceCommit: sha, created };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (Number(process.versions.node.split('.')[0]) < 24) invalid('Use Node.js 24+.');
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const packageInfo = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
    const checkoutCommit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const request = githubRequest({ token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN });
    console.log(JSON.stringify(await autoTagRelease({ event, checkoutCommit, packageInfo, lock, request })));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
