#!/usr/bin/env node
// Opt-in integration runner. It never runs the cloned applications.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findNpmCli } from '../.pbai4devs/scripts/lib/npm.mjs';

const repositoryRoot = realpathSync.native(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const hash = content => createHash('sha256').update(content).digest('hex');
const portable = path => path.split(sep).join('/');
const statePath = '.pbai4devs/estado/agentdevkit.json';
const registry = 'https://registry.npmjs.org';
const put = (path, text) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); };
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const info = path => { try { return lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };

function parse(args) {
  const options = { version: json(join(repositoryRoot, 'package.json')).version };
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (['--help', '-h'].includes(option)) options.help = true;
    else if (['--project', '--output', '--version', '--tarball'].includes(option) && args[index + 1] && !args[index + 1].startsWith('--')) options[option.slice(2)] = args[++index];
    else throw new Error(`Opção inválida: ${option}. Use --help.`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(options.version)) throw new Error('--version exige uma versão estável x.y.z.');
  return options;
}

function projects(options) {
  const value = json(join(repositoryRoot, 'tests/fixtures/oss-projects.json'));
  assert.ok(Array.isArray(value.projects) && value.projects.length, 'Fixture sem projetos.');
  const ids = new Set();
  const entries = value.projects.map(project => {
    assert.match(project.id || '', /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'ID de projeto inválido.');
    assert.ok(!ids.has(project.id), `ID duplicado: ${project.id}`); ids.add(project.id);
    assert.match(project.repository || '', /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/, 'Use repositório HTTPS público do GitHub.');
    assert.match(project.commit || '', /^[a-f0-9]{40}$/i, 'Commit completo obrigatório.');
    assert.ok(typeof project.profile === 'string' && project.profile.length, 'Perfil obrigatório.');
    const clients = Array.isArray(project.clients) ? project.clients : String(project.clients || '').split(',');
    assert.ok(clients.length && clients.every(client => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(client)), 'Clientes inválidos.');
    assert.ok(project.dirty === undefined || typeof project.dirty === 'boolean', 'dirty deve ser booleano.');
    assert.ok(project.dirtyFile === undefined || ['README.md', '.gitignore'].includes(project.dirtyFile), 'dirtyFile deve ser README.md ou .gitignore.');
    return { ...project, clients };
  });
  const selected = options.project ? entries.filter(project => project.id === options.project) : entries;
  assert.ok(selected.length, `Projeto desconhecido: ${options.project}`);
  return selected;
}

function outputDirectory(requested) {
  const path = resolve(repositoryRoot, requested || `tmp/oss-compatibility/${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`);
  const rel = portable(relative(repositoryRoot, path));
  assert.ok(rel.startsWith('tmp/') && rel !== 'tmp/' && !isAbsolute(rel), '--output deve ficar dentro de tmp/ do repositório.');
  let current = repositoryRoot;
  for (const part of rel.split('/')) {
    current = join(current, part);
    const item = info(current);
    assert.ok(!item || item.isDirectory() && !item.isSymbolicLink(), 'Saída não pode atravessar arquivos ou links.');
  }
  assert.ok(!existsSync(path), 'A pasta de saída já existe; use uma execução nova.');
  const top = spawnSync('git', ['-C', repositoryRoot, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  assert.equal(top.status, 0, 'Execute a partir de um checkout Git do AgentDevKit.');
  assert.equal(realpathSync.native(top.stdout.trim()), repositoryRoot, 'O Git encontrado não pertence ao AgentDevKit.');
  const ignored = spawnSync('git', ['-c', 'core.excludesFile=', '-C', repositoryRoot, 'check-ignore', '--no-index', '-q', '--', rel + '/projects/probe'], { encoding: 'utf8' });
  assert.equal(ignored.status, 0, 'A saída deve estar ignorada pelo Git antes de clonar.');
  return path;
}

function environment(output) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^npm_|^npm_config_|^git_|^node_options$|^node_test_context$|(?:^|_)(?:token|secret|password)(?:_|$)/i.test(key)));
  const work = join(output, 'npm-work'); mkdirSync(work, { recursive: true });
  put(join(work, 'package.json'), '{"name":"agentdevkit-oss-probe","private":true}\n');
  put(join(output, 'npmrc'), `@pathbit:registry=${registry}\n`);
  put(join(output, 'empty-config'), '');
  mkdirSync(join(output, 'empty-hooks'));
  const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') || 'PATH';
  env[pathKey] = `${dirname(process.execPath)}${delimiter}${env[pathKey] || ''}`;
  return { ...env, npm_config_registry: registry, npm_config_userconfig: join(output, 'npmrc'),
    npm_config_globalconfig: join(output, 'empty-config'), npm_config_cache: join(output, 'npm-cache'),
    npm_config_ignore_scripts: 'true', npm_config_offline: 'false', npm_config_audit: 'false', npm_config_fund: 'false',
    GIT_CONFIG_GLOBAL: join(output, 'empty-config'), GIT_CONFIG_SYSTEM: join(output, 'empty-config'), GIT_CONFIG_NOSYSTEM: '1',
    GIT_TERMINAL_PROMPT: '0', GIT_ALLOW_PROTOCOL: 'https', GIT_OPTIONAL_LOCKS: '0' };
}

function recorder(output, env) {
  const commands = [];
  const run = (name, command, args, cwd, expected = 0) => {
    assert.ok(command !== 'git' || !args.includes('push'), 'O runner não permite git push.');
    const number = String(commands.length + 1).padStart(3, '0'), prefix = join(output, 'logs', `${number}-${name}`);
    const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', shell: false, windowsHide: true,
      timeout: command === 'git' ? 180000 : 240000, maxBuffer: 64 * 1024 * 1024 });
    put(`${prefix}.stdout.log`, result.stdout || ''); put(`${prefix}.stderr.log`, result.stderr || '');
    commands.push({ name, command, args, cwd, status: result.status, error: result.error?.code || null,
      stdout: portable(relative(output, `${prefix}.stdout.log`)), stderr: portable(relative(output, `${prefix}.stderr.log`)) });
    put(join(output, 'commands.json'), JSON.stringify(commands, null, 2) + '\n');
    assert.ifError(result.error);
    if (expected !== null) assert.equal(result.status, expected, `${name}: esperado ${expected}, recebido ${result.status}; veja ${prefix}.stderr.log`);
    return result.stdout;
  };
  return { run, commands };
}

function fileSnapshot(root, path) {
  assert.ok(!isAbsolute(path) && !path.split('/').includes('..'), 'Caminho fora do clone.');
  const item = info(join(root, path));
  if (!item) return { kind: 'missing' };
  const mode = item.mode & 0o777;
  if (item.isSymbolicLink()) {
    const target = readlinkSync(join(root, path)); return { kind: 'symlink', mode, target, sha256: hash(target) };
  }
  if (item.isDirectory()) return { kind: 'directory', mode };
  assert.ok(item.isFile(), `Arquivo não regular: ${path}`);
  return { kind: 'file', mode, sha256: hash(readFileSync(join(root, path))) };
}

function writeClone(root, path, content) {
  assert.ok(!isAbsolute(path) && !path.split('/').includes('..'), 'Escrita fora do clone.');
  let current = root;
  for (const part of path.split('/')) {
    current = join(current, part);
    assert.ok(!info(current)?.isSymbolicLink(), `Escrita recusada através de link: ${path}`);
  }
  put(join(root, path), content);
}

function workspace(root) {
  const files = {};
  function visit(path = '') {
    for (const name of readdirSync(join(root, path)).sort()) {
      if (name === '.git') continue;
      const child = path ? `${path}/${name}` : name;
      files[child] = fileSnapshot(root, child);
      if (files[child].kind === 'directory') visit(child);
    }
  }
  visit(); return files;
}

function gitSnapshot(root, git) {
  return { head: git('rev-parse', 'HEAD').trim(), index: git('ls-files', '--stage', '-z'),
    stagedDiff: git('diff', '--cached', '--binary', '--no-ext-diff', '--no-color'),
    remotes: git('config', '--get-regexp', '^remote\\..*\\.(url|pushurl)$'),
    configSha256: hash(readFileSync(join(root, '.git/config'))),
    exclude: info(join(root, '.git/info/exclude')) ? hash(readFileSync(join(root, '.git/info/exclude'))) : null };
}

function originalSnapshot(root, paths) {
  return Object.fromEntries(paths.map(path => [path, fileSnapshot(root, path)]));
}

function checkOriginals(root, baseline, git) {
  const state = info(join(root, statePath)) ? json(join(root, statePath)) : null;
  for (const [path, original] of Object.entries(baseline.files)) {
    const current = fileSnapshot(root, path);
    if (JSON.stringify(current) === JSON.stringify(original)) continue;
    assert.equal(original.kind, 'file', `Tipo do arquivo original alterado: ${path}`);
    assert.equal(current.kind, 'file', `Tipo do arquivo original alterado: ${path}`);
    assert.equal(current.mode, original.mode, `Permissão do arquivo original alterada: ${path}`);
    const content = readFileSync(join(root, path));
    // Existing Markdown receives an appended, kit-owned block. Verify every
    // original byte by its pre-install hash, including original line endings.
    const privateIgnore = path === '.gitignore' && content.includes(Buffer.from('# BEGIN AGENTDEVKIT PRIVATE '));
    const marker = Buffer.from(privateIgnore ? '# BEGIN AGENTDEVKIT PRIVATE ' : '<!-- BEGIN AGENTDEVKIT -->');
    const position = content.indexOf(marker);
    assert.ok(position >= 0 && content.indexOf(marker, position + marker.length) < 0, `Arquivo original alterado: ${path}`);
    const blockEnd = Buffer.from(privateIgnore ? '# END AGENTDEVKIT PRIVATE ' : '<!-- END AGENTDEVKIT -->');
    const end = content.indexOf(blockEnd, position + marker.length);
    const suffix = end < 0 ? '' : content.subarray(end + blockEnd.length).toString();
    assert.ok(end >= 0 && (privateIgnore ? /^[a-f0-9]{16}(?:\r\n|\n|\r)?$/.test(suffix) : /^(?:\r\n|\n|\r)?$/.test(suffix)), `Bloco adicionado inválido: ${path}`);
    if (!privateIgnore) assert.equal(state?.blocks?.[path], hash(content.subarray(position, end + blockEnd.length)), `Bloco não pertence ao kit: ${path}`);
    const prefix = content.subarray(0, position);
    let preserved = hash(prefix) === original.sha256;
    for (let removed = 1; !preserved && removed <= Math.min(4, prefix.length); removed++) {
      if (!/^[\r\n]+$/.test(prefix.subarray(prefix.length - removed).toString())) break;
      preserved = hash(prefix.subarray(0, prefix.length - removed)) === original.sha256;
    }
    assert.ok(preserved, `Conteúdo original alterado: ${path}`);
  }
  const now = gitSnapshot(root, git);
  for (const field of ['head', 'index', 'stagedDiff', 'remotes', 'configSha256']) assert.equal(now[field], baseline.git[field], `Git ${field} alterado.`);
}

function testProject(project, options, output, env, npm) {
  const directory = join(output, 'projects', project.id), evidence = join(output, 'results', project.id);
  mkdirSync(evidence, { recursive: true });
  const { run, commands } = recorder(evidence, env);
  const gitPrefix = ['-c', `core.hooksPath=${join(output, 'empty-hooks')}`, '-c', `core.excludesFile=${join(output, 'empty-config')}`, '-C', directory];
  const git = (...args) => run(`git-${args[0]}`, 'git', [...gitPrefix, ...args], output);
  const result = { id: project.id, repository: project.repository, commit: project.commit, profile: project.profile,
    clients: project.clients, dirty: Boolean(project.dirty), dirtyFile: project.dirty ? project.dirtyFile || 'README.md' : null, packageSource: options.packageSource,
    status: 'failed', checks: [], failures: [] };
  const checked = (name, status = 'passed') => { result.checks.push({ name, status }); console.log(`${project.id}: ${name}=${status}`); };
  let baseline, paths;
  try {
    assert.ok(!existsSync(directory), 'Clone já existe.'); mkdirSync(directory, { recursive: true });
    git('init', '--quiet', '--template=');
    git('remote', 'add', 'origin', project.repository);
    git('fetch', '--depth=1', '--no-tags', '--no-recurse-submodules', 'origin', project.commit);
    git('checkout', '--quiet', '--detach', project.commit);
    assert.equal(git('rev-parse', 'HEAD').trim().toLowerCase(), project.commit.toLowerCase());
    const trackedPaths = git('ls-files', '-z').split('\0').filter(Boolean);
    const nativeRoot = project.clients.some(client => ['all', 'claude'].includes(client)) ? '.claude' : '.opencode';
    const nativeSkill = `${nativeRoot}/skills/oss-preexisting-${project.id}/SKILL.md`;
    const nativeReference = `${nativeRoot}/skills/oss-preexisting-${project.id}/REFERENCE.md`;
    const nativeAgent = `${nativeRoot}/agents/revisor.md`;
    const nativeConfig = `${nativeRoot}/settings.local.json`;
    assert.ok(!existsSync(join(directory, nativeSkill)) && !existsSync(join(directory, nativeReference)), 'Sentinela nativa já existe.');
    writeClone(directory, nativeSkill, `---\nname: oss-preexisting-${project.id}\ndescription: Existing user-owned native skill.\n---\n\n# Existing native skill\n\nPreserve this file.\n`);
    writeClone(directory, nativeReference, '# Project reference\n\nLeia [manual](https://example.com/manual).\n');
    assert.ok(!info(join(directory, nativeAgent)) && !info(join(directory, nativeConfig)), 'Configuração sentinela já existe.');
    writeClone(directory, nativeAgent, `---\nname: revisor\ndescription: Existing project reviewer.\n---\n\n# Project reviewer\n\nPreserve this project-specific agent and its instructions.\n`);
    writeClone(directory, nativeConfig, '{"projectSetting":"preserve-existing-configuration"}\n');
    if (project.dirty) {
      const path = project.dirtyFile || 'README.md';
      assert.equal(fileSnapshot(directory, path).kind, 'file', `dirty exige ${path} regular.`);
      const comment = path === '.gitignore' ? '\n# AgentDevKit OSS dirty-stage probe.\n' : '\n\n<!-- AgentDevKit OSS dirty-stage probe. -->\n';
      writeClone(directory, path, Buffer.concat([readFileSync(join(directory, path)), Buffer.from(comment)]));
      git('add', '--', path);
    }
    paths = [...trackedPaths, nativeSkill, nativeReference, nativeAgent, nativeConfig];
    baseline = { files: originalSnapshot(directory, paths), git: gitSnapshot(directory, git), trackedPaths, nativeSentinel: nativeSkill, nativeReference };
    put(join(evidence, 'baseline.json'), JSON.stringify(baseline, null, 2) + '\n');
    result.originalFiles = trackedPaths.length; result.nativeSentinel = nativeSkill; result.nativeReference = nativeReference; result.checkout = baseline.git.head; checked('checkout-pinned');
    const cli = (name, args, expected = 0) => {
      const text = run(name, process.execPath, [npm, 'exec', '--yes', '--ignore-scripts', `--registry=${registry}`,
        `--package=${options.tarball || `@pathbit/agentdevkit@${options.version}`}`, '--', 'agentdevkit', ...args, '--json'], join(output, 'npm-work'), expected);
      const value = JSON.parse(text);
      assert.equal(value.version, options.version, 'Versão executada diverge do pacote solicitado.');
      assert.equal(value.ok, expected === 0, `${name}: estado JSON inesperado.`);
      return value;
    };
    cli('package-version', ['--version']);
    const init = ['init', '--target', directory, '--agents', project.clients.join(','), '--lang', 'en', '--yes'];
    const dryBefore = { workspace: workspace(directory), git: gitSnapshot(directory, git) };
    put(join(evidence, 'dry-run-before.json'), JSON.stringify(dryBefore, null, 2) + '\n');
    try { cli('init-dry-run', [...init, '--dry-run']); }
    finally {
      const after = { workspace: workspace(directory), git: gitSnapshot(directory, git) };
      put(join(evidence, 'dry-run-after.json'), JSON.stringify(after, null, 2) + '\n');
      assert.deepEqual(after, dryBefore, 'Dry-run alterou o clone.'); result.dryRunPreserved = true;
    }
    checked('dry-run-read-only');
    const installed = cli('init', init);
    result.preserved = installed.preserved;
    const state = json(join(directory, statePath));
    assert.ok(!Object.hasOwn(state.files, nativeAgent), 'Agente humano foi registrado como propriedade integral do kit.');
    assert.ok(state.blocks?.[nativeAgent] || installed.preserved?.some(item => item.path === nativeAgent), 'Agente humano em colisão não foi integrado nem preservado.');
    for (const path of ['CLAUDE.md', 'README.md', '.codex/skills']) if (fileSnapshot(directory, path).kind === 'symlink') {
      assert.ok(installed.preserved.some(item => item.path === path), `Link preservado não foi informado: ${path}`);
      assert.ok(!Object.keys(state.files).some(owned => owned === path || owned.startsWith(path + '/')), `Link humano foi adotado pelo kit: ${path}`);
    }
    if (project.clients.includes('all') || project.clients.includes('codex')) {
      assert.equal(fileSnapshot(directory, '.agents/skills/projeto/configurar-projeto/SKILL.md').kind, 'file', 'Rota nativa do Codex não recebeu a skill.');
    }
    checkOriginals(directory, baseline, git); checked('init-preserves-originals');
    result.ignoreChecks = [];
    for (const path of ['.agent-tests/probe', 'tmp/probe', '.PlAyWrIgHt-McP/probe', 'playwright-report/probe', 'test-results/probe']) {
      run('ignore-check', 'git', [...gitPrefix, 'check-ignore', '--no-index', '--quiet', '--', path], output, null);
      const status = commands.at(-1).status;
      const match = status === 0 ? '' : run('ignore-diagnostic', 'git', [...gitPrefix, 'check-ignore', '--no-index', '--verbose', '--', path], output, null);
      result.ignoreChecks.push({ path, ignored: status === 0, status, match: match.trim() });
      if (status !== 0) result.failures.push(`Artefato local não ignorado: ${path} (git=${status}).`);
    }
    checked('artifact-ignore-checks', result.failures.length ? 'failed' : 'passed');
    cli('doctor', ['doctor', '--target', directory]);
    cli('sync-check', ['sync', '--check', '--target', directory]); checked('doctor-and-sync');
    run('standalone-sync-check', process.execPath, ['.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs', '--check'], directory);
    run('installed-resource-check', process.execPath, ['.pbai4devs/scripts/verificar-recursos/SCRIPT.mjs'], directory);
    checkOriginals(directory, baseline, git); checked('standalone-sync-preserves-agents');
    const stable = workspace(directory);
    cli('init-repeat', init); cli('update-repeat', ['update', '--target', directory, '--yes']);
    assert.deepEqual(workspace(directory), stable, 'Repetição alterou a instalação.');
    checkOriginals(directory, baseline, git); checked('idempotent');
    cli('update-force-preservation', ['update', '--target', directory, '--yes', '--force']);
    run('standalone-force-preservation', process.execPath, ['.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs', '--force'], directory);
    assert.deepEqual(workspace(directory), stable, 'Sincronização forçada alterou configuração preservada ou instalação estável.');
    checkOriginals(directory, baseline, git); checked('force-preserves-existing-agents');
    const skillPath = `.pbai4devs/skills/projeto/oss-user-${project.id}/SKILL.md`;
    assert.ok(!existsSync(join(directory, skillPath)), 'Skill de teste já existe.');
    const skill = `---\nname: oss-user-${project.id}\ndescription: User-owned OSS compatibility fixture.\n---\n\n# OSS user skill\n\nPreserve this user-owned resource.\n`;
    writeClone(directory, skillPath, skill);
    cli('update-user-skill', ['update', '--target', directory, '--yes']);
    assert.equal(readFileSync(join(directory, skillPath), 'utf8'), skill);
    cli('doctor-user-skill', ['doctor', '--target', directory]);
    cli('sync-user-skill', ['sync', '--check', '--target', directory]);
    checkOriginals(directory, baseline, git); checked('user-skill-preserved');
    const managed = '.pbai4devs/rules/qualidade/RULE.md', original = readFileSync(join(directory, managed));
    assert.equal(json(join(directory, statePath)).files[managed], hash(original), 'Probe exige arquivo comprovadamente gerenciado.');
    const beforeConflict = workspace(directory);
    try {
      writeClone(directory, managed, Buffer.concat([original, Buffer.from('\n<!-- Deliberate compatibility conflict. -->\n')]));
      const expected = { workspace: workspace(directory), git: gitSnapshot(directory, git) };
      const denied = cli('update-conflict', ['update', '--target', directory, '--yes'], 1);
      assert.ok(denied.conflicts.includes(managed), 'Conflito deliberado não foi identificado.');
      assert.deepEqual({ workspace: workspace(directory), git: gitSnapshot(directory, git) }, expected, 'Update bloqueado alterou arquivos ou Git.');
    } finally { writeClone(directory, managed, original); }
    assert.deepEqual(workspace(directory), beforeConflict, 'Arquivo do conflito não foi restaurado.');
    checkOriginals(directory, baseline, git); checked('conflict-blocked-and-restored');
    put(join(evidence, 'after.json'), JSON.stringify({ files: originalSnapshot(directory, paths), git: gitSnapshot(directory, git) }, null, 2) + '\n');
    assert.ok(commands.every(command => command.command !== 'git' || !command.args.includes('push')));
    result.remoteUrlsUnchanged = true; result.originalsPreserved = true; result.runnerPushCommands = 0;
    result.status = result.failures.length ? 'failed' : 'passed';
  } catch (error) {
    result.error = error.message; result.failures.push(error.message);
    if (baseline) try {
      put(join(evidence, 'after.json'), JSON.stringify({ files: originalSnapshot(directory, paths), git: gitSnapshot(directory, git) }, null, 2) + '\n');
      checkOriginals(directory, baseline, git); result.originalsPreserved = true;
    } catch (failure) { result.originalsPreserved = false; result.failures.push(`Preservação: ${failure.message}`); }
  }
  result.commands = commands.length;
  result.evidence = portable(relative(output, evidence));
  put(join(evidence, 'REPORT.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(`${project.id}=${result.status}${result.failures.length ? `: ${result.failures.join('; ')}` : ''}`);
  return result;
}

export function main(args = process.argv.slice(2)) {
  const options = parse(args);
  if (options.help) {
    console.log('Uso: node tests/oss-compatibility.mjs [--project id] [--output tmp/oss-compatibility/execucao-nova] [--version x.y.z] [--tarball arquivo.tgz]\nTeste opt-in: clona commits públicos fixos, sem executar aplicações. Sem --tarball, usa o npm público. Saídas permanecem em tmp/ ignorado.');
    return 0;
  }
  assert.ok(Number(process.versions.node.split('.')[0]) >= 24, 'Use Node.js 24+.');
  const selected = projects(options), output = outputDirectory(options.output), npm = findNpmCli();
  assert.ok(npm, 'npm CLI não encontrado junto ao Node ou no PATH.');
  if (options.tarball) {
    options.tarball = resolve(options.tarball);
    const item = info(options.tarball);
    assert.ok(options.tarball.endsWith('.tgz') && item?.isFile() && !item.isSymbolicLink(), '--tarball exige arquivo .tgz regular.');
    options.packageSource = { kind: 'local-tarball', path: options.tarball, sha256: hash(readFileSync(options.tarball)), expectedVersion: options.version };
  } else options.packageSource = { kind: 'public-registry', registry, package: `@pathbit/agentdevkit@${options.version}`, expectedVersion: options.version };
  mkdirSync(output, { recursive: true });
  const env = environment(output);
  const results = selected.map(project => testProject(project, options, output, env, npm));
  let archiveUnchanged = true;
  if (options.tarball) try { archiveUnchanged = hash(readFileSync(options.tarball)) === options.packageSource.sha256; }
  catch { archiveUnchanged = false; }
  const report = { status: archiveUnchanged && results.every(result => result.status === 'passed') ? 'passed' : 'failed', version: options.version,
    packageSource: { ...options.packageSource, ...(options.tarball ? { unchanged: archiveUnchanged } : {}) },
    node: process.version, platform: process.platform, arch: process.arch, output, results,
    limits: ['Somente compatibilidade de instalação do kit; aplicações, builds e serviços não foram executados.',
      'Sem push, alteração de remotes após o clone, configuração global ou credenciais npm.',
      'Resultados limitados aos commits, clientes, sistema operacional e runtime registrados.'] };
  put(join(output, 'REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, projects: results.length, report: join(output, 'REPORT.json') }));
  return report.status === 'passed' ? 0 : 1;
}

// Shared by the opt-in documentation exercise; no helper runs on import.
export {
  parse as parseCompatibilityArgs, outputDirectory, environment, recorder,
  fileSnapshot, workspace, gitSnapshot, checkOriginals, info, put, json, hash, portable,
  repositoryRoot, registry,
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
