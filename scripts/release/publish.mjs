#!/usr/bin/env node
import { appendFileSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseRoot, sha256 } from './assets.mjs';

const workflowPath = '.github/workflows/ci.yml';
const branches = new Set(['master', 'main']);
const pause = milliseconds => new Promise(done => setTimeout(done, milliseconds));
const invalid = message => { throw new Error(message); };

export function releaseTag(environment = process.env) {
  const override = environment.GITHUB_EVENT_NAME === 'workflow_dispatch' ? environment.AGENTDEVKIT_RELEASE_TAG : undefined;
  const tag = override || (environment.GITHUB_REF_TYPE === 'tag' ? environment.GITHUB_REF_NAME : undefined);
  if (!/^v\d+\.\d+\.\d+$/.test(tag || '')) invalid('Informe uma tag de release vX.Y.Z.');
  return tag;
}

export function githubRequest({ token, fetchImpl = fetch } = {}) {
  if (!token) invalid('Token do GitHub ausente.');
  return async (method, resource, body, contentType) => {
    const url = resource.startsWith('https://') ? resource : `https://api.github.com${resource}`;
    const parsed = new URL(url);
    if (!['api.github.com', 'uploads.github.com'].includes(parsed.hostname) || parsed.protocol !== 'https:' || parsed.username || parsed.password) invalid('Destino do GitHub inválido.');
    const response = await fetchImpl(url, {
      method, signal: AbortSignal.timeout(30000),
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(body === undefined ? {} : { 'Content-Type': contentType || 'application/json' }) },
      ...(body === undefined ? {} : { body: contentType ? body : JSON.stringify(body) }),
    });
    if (response.status === 404 && method === 'GET') return null;
    if (!response.ok) invalid(`GitHub ${method} falhou: HTTP ${response.status}.`);
    return response.status === 204 ? null : response.json();
  };
}

async function tagCommit(repository, tag, request) {
  const ref = await request('GET', `/repos/${repository}/git/ref/tags/${encodeURIComponent(tag)}`);
  if (!ref) invalid('A tag de release não existe.');
  let object = ref.object;
  for (let count = 0; object?.type === 'tag' && count < 5; count++) {
    object = (await request('GET', `/repos/${repository}/git/tags/${object.sha}`))?.object;
  }
  if (object?.type !== 'commit' || !/^[a-f0-9]{40}$/i.test(object.sha)) invalid('A tag não aponta para um commit válido.');
  return object.sha;
}

function trustedRun(run, repository, commit) {
  return run.head_sha === commit && run.event === 'push' && branches.has(run.head_branch)
    && run.path === workflowPath && run.repository?.full_name === repository
    && run.head_repository?.full_name === repository;
}

export async function resolveVerifiedPackage({ repository, tag, request, now = Date.now, sleep = pause, timeoutMs = 2100000, pollMs = 10000 }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '')) invalid('Repositório inválido.');
  if (!/^v\d+\.\d+\.\d+$/.test(tag || '')) invalid('A release exige uma tag vX.Y.Z.');
  const sourceCommit = await tagCommit(repository, tag, request);
  const deadline = now() + timeoutMs;
  do {
    const page = await request('GET', `/repos/${repository}/actions/workflows/ci.yml/runs?event=push&head_sha=${sourceCommit}&per_page=100`);
    const runs = (page?.workflow_runs || []).filter(run => trustedRun(run, repository, sourceCommit)).sort((a, b) => b.id - a.id);
    for (const run of runs.filter(run => run.status === 'completed' && run.conclusion === 'success')) {
      const artifacts = await request('GET', `/repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`);
      const name = `agentdevkit-${sourceCommit}-${run.run_attempt}`;
      const artifact = artifacts?.artifacts?.find(item => item.name === name && !item.expired);
      if (artifact && Number.isSafeInteger(artifact.id) && Number.isSafeInteger(run.id)) return {
        schemaVersion: 1, repository, tag, version: tag.slice(1), sourceCommit,
        runId: run.id, runAttempt: run.run_attempt, branch: run.head_branch,
        workflowPath, artifactId: artifact.id, artifactName: name,
      };
    }
    const pending = runs.some(run => run.status !== 'completed');
    if (runs.length && !pending) invalid('CI aprovado com artefato disponível não encontrado. Execute o CI novamente para este commit.');
    if (now() >= deadline) break;
    await sleep(Math.min(pollMs, deadline - now()));
  } while (now() <= deadline);
  invalid('Tempo esgotado aguardando o CI deste commit. Execute o CI e tente a release novamente.');
}

function regularFile(directory, name) {
  const file = join(directory, name);
  if (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink()) invalid(`Artefato não regular: ${name}`);
  return readFileSync(file);
}

export function verifyDistribution(directory, resolution) {
  if (resolution?.schemaVersion !== 1 || !/^[\w.-]+\/[\w.-]+$/.test(resolution.repository || '')
    || !/^[a-f0-9]{40}$/i.test(resolution.sourceCommit || '') || !branches.has(resolution.branch)
    || resolution.workflowPath !== workflowPath || !Number.isSafeInteger(resolution.runId)
    || !Number.isSafeInteger(resolution.runAttempt) || !Number.isSafeInteger(resolution.artifactId)) invalid('Seleção do artefato inválida.');
  const manifest = JSON.parse(regularFile(directory, 'package-manifest.json'));
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version) || manifest.version !== resolution.version || resolution.tag !== `v${manifest.version}`) invalid('Versão do artefato difere da tag.');
  if (manifest.file !== `agentdevkit-${manifest.version}.tgz`) invalid('Nome inesperado do pacote.');
  const p = manifest.provenance;
  if (manifest.sourceCommit !== resolution.sourceCommit || p?.repository !== resolution.repository
    || String(p.runId) !== String(resolution.runId) || Number(p.runAttempt) !== resolution.runAttempt
    || p.event !== 'push' || p.ref !== `refs/heads/${resolution.branch}`) invalid('Procedência do artefato inválida.');
  if (manifest.verification?.status !== 'passed' || manifest.verification.profile !== 'full'
    || manifest.verification.sourceCommit !== resolution.sourceCommit) invalid('O pacote não registra a verificação completa.');
  const archive = regularFile(directory, manifest.file);
  if (sha256(archive) !== manifest.sha256) invalid('SHA-256 do pacote diverge do manifesto.');
  const checksum = regularFile(directory, 'SHA256SUMS');
  if (checksum.toString('utf8') !== `${manifest.sha256}  ${manifest.file}\n`) invalid('SHA256SUMS diverge do pacote.');
  return { manifest, archive, checksum, notes: regularFile(directory, 'NOTES.txt').toString('utf8') };
}

export async function assertApprovedSource(resolution, request) {
  const prefix = `/repos/${resolution.repository}`;
  const run = await request('GET', `${prefix}/actions/runs/${resolution.runId}`);
  if (!run || !trustedRun(run, resolution.repository, resolution.sourceCommit)
    || run.status !== 'completed' || run.conclusion !== 'success' || run.run_attempt !== resolution.runAttempt) invalid('A execução de origem não está aprovada.');
  if (await tagCommit(resolution.repository, resolution.tag, request) !== resolution.sourceCommit) invalid('A tag mudou depois da seleção do pacote.');
}

export async function publishVerifiedPackage({ directory, resolution, request }) {
  const verified = verifyDistribution(directory, resolution);
  await assertApprovedSource(resolution, request);
  const prefix = `/repos/${resolution.repository}`;
  if (await request('GET', `${prefix}/releases/tags/${resolution.tag}`)) invalid('A release já existe; ela não será sobrescrita.');
  const release = await request('POST', `${prefix}/releases`, { tag_name: resolution.tag, target_commitish: resolution.sourceCommit, name: `AgentDevKit ${resolution.tag}`, body: verified.notes, draft: true, prerelease: false });
  if (!Number.isSafeInteger(release?.id)) invalid('Resposta de criação da release inválida.');
  const upload = `https://uploads.github.com/repos/${resolution.repository}/releases/${release.id}/assets`;
  await request('POST', `${upload}?name=${encodeURIComponent(verified.manifest.file)}`, verified.archive, 'application/gzip');
  await request('POST', `${upload}?name=SHA256SUMS`, verified.checksum, 'text/plain');
  const published = await request('PATCH', `${prefix}/releases/${release.id}`, { draft: false });
  return { version: resolution.version, sourceCommit: resolution.sourceCommit, sha256: verified.manifest.sha256, url: published.html_url };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (Number(process.versions.node.split('.')[0]) < 24) invalid('Use Node.js 24+.');
    const stateFile = join(releaseRoot, '.agent-tests/release-resolution.json');
    const request = githubRequest({ token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN });
    if (process.argv[2] === 'resolve') {
      const result = await resolveVerifiedPackage({ repository: process.env.GITHUB_REPOSITORY, tag: releaseTag(), request });
      mkdirSync(join(releaseRoot, '.agent-tests'), { recursive: true });
      writeFileSync(stateFile, JSON.stringify(result, null, 2) + '\n');
      if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `artifact-id=${result.artifactId}\nrun-id=${result.runId}\nresolution=${JSON.stringify(result)}\n`);
      console.log(JSON.stringify(result));
    } else if (process.argv[2] === 'publish') {
      const resolution = JSON.parse(process.env.AGENTDEVKIT_RELEASE_RESOLUTION || readFileSync(stateFile, 'utf8'));
      const result = await publishVerifiedPackage({ directory: process.env.AGENTDEVKIT_ARTIFACT_DIR, resolution, request });
      mkdirSync(join(releaseRoot, '.agent-tests'), { recursive: true });
      writeFileSync(join(releaseRoot, '.agent-tests/release-publication.json'), JSON.stringify(result, null, 2) + '\n');
      console.log(JSON.stringify(result));
    } else invalid('Use resolve ou publish.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
