#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmExecutable, releaseRoot, sha256 } from './assets.mjs';
import { assertApprovedSource, githubRequest, verifyDistribution } from './publish.mjs';

const registry = 'https://npm.pkg.github.com';
const expectedName = '@pathbit/agentdevkit';
const pause = milliseconds => new Promise(done => setTimeout(done, milliseconds));
const invalid = message => { throw new Error(message); };

function json(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function npmError(result) {
  const error = json(result.stdout)?.error || json(result.stderr)?.error;
  return /^[A-Z][A-Z0-9_]+$/.test(error?.code || '') ? error.code : 'UNKNOWN';
}

function sameIntegrity(value, expected) {
  return typeof value === 'string' && value.trim().split(/\s+/).includes(expected);
}

// npm reads authentication through this temporary file, never an argv token.
function isolatedEnvironment(environment, directory) {
  const env = Object.fromEntries(Object.entries(environment).filter(([key]) => !/^npm_config_/i.test(key)));
  const config = join(directory, 'npmrc'), globalConfig = join(directory, 'global-npmrc');
  writeFileSync(config, `@pathbit:registry=${registry}\n//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}\n`, { mode: 0o600 });
  writeFileSync(globalConfig, '');
  const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') || 'PATH';
  env[pathKey] = `${dirname(process.execPath)}${delimiter}${env[pathKey] || ''}`;
  return { ...env, npm_config_userconfig: config, npm_config_globalconfig: globalConfig,
    npm_config_cache: join(directory, 'cache'), npm_config_registry: registry,
    npm_config_ignore_scripts: 'true', npm_config_offline: 'false',
    npm_config_prefer_offline: 'false', npm_config_prefer_online: 'true',
    npm_config_audit: 'false', npm_config_fund: 'false', npm_config_loglevel: 'error' };
}

export async function publishRegistryPackage({ directory, resolution, env = process.env,
  execute = spawnSync, sleep = pause, maxAttempts = 12, pollMs = 5000,
  packageName = expectedName, request } = {}) {
  if (Number(process.versions.node.split('.')[0]) < 24) invalid('Use Node.js 24+.');
  if (packageName !== expectedName) invalid('Nome do pacote não autorizado.');
  if (!env.NODE_AUTH_TOKEN || /[\r\n]/.test(env.NODE_AUTH_TOKEN)) invalid('NODE_AUTH_TOKEN válido é obrigatório.');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 30
    || !Number.isInteger(pollMs) || pollMs < 0 || pollMs > 10000) invalid('Limite de tentativas inválido.');
  const verified = verifyDistribution(directory, resolution);
  const archivePath = resolve(directory, verified.manifest.file);
  const integrity = `sha512-${createHash('sha512').update(verified.archive).digest('base64')}`;
  const temporary = mkdtempSync(join(tmpdir(), 'agentdevkit-registry-'));
  try {
    const isolated = isolatedEnvironment(env, temporary);
    const npm = npmExecutable(env);
    const invoke = async (args, { cwd = temporary, cache, allowMissing = false } = {}) => {
      let result;
      try {
        result = await execute(process.execPath, [npm, ...args], {
          cwd, env: cache ? { ...isolated, npm_config_cache: cache } : isolated,
          encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, shell: false,
        });
      } catch { invalid(`npm ${args[0]} não pôde ser executado.`); }
      if (!result || result.error || result.status !== 0) {
        const code = npmError(result || {});
        if (allowMissing && !result?.error && code === 'E404') return null;
        invalid(`npm ${args[0]} falhou (${code}).`);
      }
      return result.stdout;
    };
    const assertArchive = () => {
      if (sha256(readFileSync(archivePath)) !== verified.manifest.sha256) invalid('O tarball mudou durante a publicação.');
    };
    // --dry-run inspects the approved tgz; it does not create another package.
    const inspected = json(await invoke(['pack', archivePath, '--dry-run', '--ignore-scripts', '--json']));
    if (!Array.isArray(inspected) || inspected.length !== 1 || inspected[0].name !== packageName
      || inspected[0].version !== resolution.version || !sameIntegrity(inspected[0].integrity, integrity)) invalid('Nome, versão ou integridade interna do tarball inválidos.');
    assertArchive();
    const spec = `${packageName}@${resolution.version}`;
    const lookup = async () => {
      const output = await invoke(['view', spec, 'dist', '--json', `--registry=${registry}`], { allowMissing: true });
      if (output === null) return null;
      const dist = json(output);
      if (!dist || !sameIntegrity(dist.integrity, integrity)) invalid('A versão no registry contém um tarball diferente.');
      return dist;
    };
    await assertApprovedSource(resolution, request || githubRequest({ token: env.GH_TOKEN || env.GITHUB_TOKEN }));
    const existing = await lookup();
    if (!existing) {
      assertArchive();
      await invoke(['publish', archivePath, `--registry=${registry}`, '--ignore-scripts', '--json']);
      let visible = false;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (await lookup()) { visible = true; break; }
        if (attempt + 1 < maxAttempts) await sleep(pollMs);
      }
      if (!visible) invalid('A versão publicada ainda não está visível no registry.');
    }
    const probe = join(temporary, 'probe');
    const consumer = join(temporary, 'consumer');
    const cache = join(temporary, 'probe-cache');
    const commands = [];
    mkdirSync(probe);
    const prove = async (command, args, label = command) => {
      const output = await invoke(['exec', '--yes', '--ignore-scripts', `--registry=${registry}`,
        `--package=${spec}`, '--', 'agentdevkit', ...args, '--json'], { cwd: probe, cache });
      const reported = json(output);
      if (reported?.ok !== true || reported.command !== command || reported.version !== resolution.version) invalid(`A prova ${label} pelo npm exec não confirmou o artefato.`);
      assertArchive();
      commands.push(label);
    };
    await prove('version', ['--version']);
    await prove('init', ['init', '--target', consumer, '--agents', 'codex,claude', '--lang', 'en', '--yes']);
    await prove('doctor', ['doctor', '--target', consumer]);
    await prove('sync', ['sync', '--check', '--target', consumer], 'sync --check');
    return { packageName, version: resolution.version, registry,
      url: `https://github.com/${resolution.repository}/pkgs/npm/agentdevkit`,
      status: existing ? 'skipped' : 'published', sha256: verified.manifest.sha256,
      integrity, probe: { status: 'passed', version: resolution.version, commands } };
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] && process.argv[2] !== 'publish') invalid('Use publish.');
    const state = join(releaseRoot, '.agent-tests/release-resolution.json');
    const resolution = JSON.parse(process.env.AGENTDEVKIT_RELEASE_RESOLUTION || readFileSync(state, 'utf8'));
    const result = await publishRegistryPackage({ directory: process.env.AGENTDEVKIT_ARTIFACT_DIR, resolution });
    mkdirSync(join(releaseRoot, '.agent-tests'), { recursive: true });
    writeFileSync(join(releaseRoot, '.agent-tests/registry-publication.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
