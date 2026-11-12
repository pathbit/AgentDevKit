#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmExecutable, releaseRoot, sha256 } from './assets.mjs';
import { assertApprovedSource, githubRequest, verifyDistribution } from './publish.mjs';

const registry = 'https://registry.npmjs.org';
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

// Public reads and consumer commands never inherit authentication.
function isolatedEnvironment(environment, directory) {
  const env = Object.fromEntries(Object.entries(environment).filter(([key]) => !/^npm_config_/i.test(key)
    && !/token|secret|password|(?:^|_)auth(?:_|$)/i.test(key)));
  const config = join(directory, 'npmrc'), globalConfig = join(directory, 'global-npmrc');
  writeFileSync(config, `@pathbit:registry=${registry}\n`, { mode: 0o600 });
  writeFileSync(globalConfig, '');
  const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') || 'PATH';
  env[pathKey] = `${dirname(process.execPath)}${delimiter}${env[pathKey] || ''}`;
  return { ...env, npm_config_userconfig: config, npm_config_globalconfig: globalConfig,
    npm_config_cache: join(directory, 'cache'), npm_config_registry: registry,
    npm_config_ignore_scripts: 'true', npm_config_offline: 'false',
    npm_config_prefer_offline: 'false', npm_config_prefer_online: 'true',
    npm_config_audit: 'false', npm_config_fund: 'false', npm_config_loglevel: 'error' };
}

function publicationEnvironment(environment, isolated, directory, oidc) {
  const token = environment.NPM_TOKEN;
  if (token && /[\r\n]/.test(token)) invalid('NPM_TOKEN inválido.');
  if (!oidc && !token) invalid('A publicação exige OIDC configurado no npm ou NPM_TOKEN isolado.');
  const config = join(directory, 'publish-npmrc');
  writeFileSync(config, `@pathbit:registry=${registry}\n${token ? '//registry.npmjs.org/:_authToken=${NPM_TOKEN}\n' : ''}`, { mode: 0o600 });
  return { ...isolated, npm_config_userconfig: config,
    ...(token ? { NPM_TOKEN: token } : {}),
    ...(oidc ? { ACTIONS_ID_TOKEN_REQUEST_URL: environment.ACTIONS_ID_TOKEN_REQUEST_URL,
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN } : {}) };
}

function supportsOidc(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)\s*$/.exec(value);
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  return major > 11 || major === 11 && (minor > 5 || minor === 5 && patch >= 1);
}

export async function publishRegistryPackage({ directory, resolution, env = process.env,
  execute = spawnSync, sleep = pause, maxAttempts = 121, pollMs = 10000,
  packageName = expectedName, request } = {}) {
  if (Number(process.versions.node.split('.')[0]) < 24) invalid('Use Node.js 24+.');
  if (packageName !== expectedName) invalid('Nome do pacote não autorizado.');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 180
    || !Number.isInteger(pollMs) || pollMs < 0 || pollMs > 10000) invalid('Limite de tentativas inválido.');
  const verified = verifyDistribution(directory, resolution);
  const archivePath = resolve(directory, verified.manifest.file);
  const integrity = `sha512-${createHash('sha512').update(verified.archive).digest('base64')}`;
  const temporary = mkdtempSync(join(tmpdir(), 'agentdevkit-registry-'));
  try {
    const isolated = isolatedEnvironment(env, temporary);
    const npm = npmExecutable(env);
    const invoke = async (args, { cwd = temporary, cache, allowMissing = false, environment = isolated } = {}) => {
      let result;
      try {
        result = await execute(process.execPath, [npm, ...args], {
          cwd, env: cache ? { ...environment, npm_config_cache: cache } : environment,
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
    let authentication = 'not-needed';
    if (!existing) {
      const oidc = !env.NPM_TOKEN && env.GITHUB_ACTIONS === 'true'
        && Boolean(env.ACTIONS_ID_TOKEN_REQUEST_URL && env.ACTIONS_ID_TOKEN_REQUEST_TOKEN);
      if (oidc && !supportsOidc((await invoke(['--version'])).trim())) {
        invalid('OIDC exige npm 11.5.1+; atualize o npm ou forneça NPM_TOKEN.');
      }
      const publishing = publicationEnvironment(env, isolated, temporary, oidc);
      authentication = oidc ? 'oidc' : 'token';
      assertArchive();
      await invoke(['publish', archivePath, `--registry=${registry}`, '--access=public', '--ignore-scripts', '--json'], { environment: publishing });
      let visible = false;
      // npm scans accepted publications before availability; this can take 15+ minutes.
      // https://github.blog/changelog/2026-07-28-npm-publish-time-malware-scanning-and-dual-use-metadata/
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (await lookup()) { visible = true; break; }
        if (attempt + 1 < maxAttempts) await sleep(pollMs);
      }
      if (!visible) invalid(`Publicação aceita; disponibilidade pendente para ${spec}. Confira o status no npm e consulte a mesma versão; não republique automaticamente.`);
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
      url: 'https://www.npmjs.com/package/@pathbit/agentdevkit',
      status: existing ? 'skipped' : 'published', sha256: verified.manifest.sha256,
      integrity, authentication, probe: { status: 'passed', version: resolution.version, commands, anonymous: true } };
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
