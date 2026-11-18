#!/usr/bin/env node
// Opt-in: packages the current checkout and runs an isolated Compose probe.
import { createHash, randomBytes } from 'node:crypto';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findNpmCli } from '../.pbai4devs/scripts/lib/npm.mjs';
import { assertUnredirectedGitEnvironment, gitOutputLines, safeGitEnvironment } from '../.pbai4devs/scripts/lib/git-environment.mjs';
import { outputParent } from './project-matrix.mjs';

const repo = fileURLToPath(new URL('..', import.meta.url));
const usage = 'Uso: node tests/compose-package-smoke.mjs [--output <diretório-temporário>]';
function options(args) {
  if (!args.length) return { parent: outputParent(tmpdir()) };
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) return { help: true };
  if (args.length === 2 && args[0] === '--output') return { parent: outputParent(args[1]) };
  throw Error(usage);
}
function command(file, args, { cwd, env, timeout = 240000 }) {
  const result = spawnSync(file, args, { cwd, env, encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024, shell: false, windowsHide: true });
  if (result.error || result.signal || result.status !== 0) throw Error(`${file}: status=${result.status}, sinal=${result.signal || 'nenhum'}, erro=${(result.error?.message || result.stderr?.trim() || 'nenhum').slice(0, 2000)}`);
  return result.stdout;
}
function gitPath(name, env) {
  const lines = gitOutputLines(command('git', ['-C', repo, '-c', 'core.fsmonitor=false', 'rev-parse', '--git-path', name], { cwd: repo, env }));
  if (lines.length !== 1 || !lines[0]) throw Error(`Caminho Git ambíguo: ${name}`);
  const value = lines[0];
  return isAbsolute(value) ? value : resolve(repo, value);
}
function snapshot(path) {
  let item;
  try { item = lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  if (!item.isFile() || item.isSymbolicLink()) throw Error(`Caminho protegido não é arquivo regular: ${path}`);
  return { mode: item.mode & 0o777, bytes: readFileSync(path) };
}
function same(left, right) {
  return left === null ? right === null : right !== null && left.mode === right.mode && left.bytes.equals(right.bytes);
}

export function prohibitedPaths(files) {
  return files.filter(path => typeof path !== 'string' || /[\\\x00-\x1f\x7f]/.test(path) || /^[a-z]:/i.test(path)
    || /(?:^|\/)(?:\.local|\.cache|node_modules|\.agent-tests|\.playwright[^/]*|playwright[^/]*|test-results|testresults|blob-report|tmp|temp)(?:\/|$)/i.test(path)
    || /^\.pbai4devs\/(?:state|estado)\/(?!README\.md$)/i.test(path)
    || path.startsWith('/') || path.split('/').some(part => part === '..' || !part));
}

export function main(args = process.argv.slice(2)) {
  const selected = options(args);
  if (selected.help) { console.log(usage); return 0; }
  if (Number(process.versions.node.split('.')[0]) < 24) throw Error('Use Node.js 24+.');
  assertUnredirectedGitEnvironment();
  const gitEnv = safeGitEnvironment(), npm = findNpmCli();
  if (!npm) throw Error('npm não encontrado.');
  const protectedPaths = { index: gitPath('index', gitEnv), config: gitPath('config', gitEnv), exclude: gitPath('info/exclude', gitEnv), gitignore: join(repo, '.gitignore') };
  const before = Object.fromEntries(Object.entries(protectedPaths).map(([name, path]) => [name, snapshot(path)]));
  const out = mkdtempSync(join(selected.parent, 'agentdevkit-compose-'));
  const cache = join(out, 'npm-cache'), userConfig = join(out, 'user.npmrc'), globalConfig = join(out, 'global.npmrc');
  mkdirSync(cache); writeFileSync(userConfig, ''); writeFileSync(globalConfig, '');
  const env = Object.fromEntries(Object.entries(gitEnv).filter(([key]) => !/^npm_config_|^node_options$/i.test(key)));
  Object.assign(env, { npm_config_userconfig: userConfig, npm_config_globalconfig: globalConfig, npm_config_cache: cache });
  const run = (name, file, argv) => {
    const value = command(file, argv, { cwd: repo, env });
    writeFileSync(join(out, `${name}.stdout`), value);
    return value;
  };
  console.log(JSON.stringify({ status: 'running', output: out }));
  const packed = JSON.parse(run('pack', process.execPath, [npm, 'pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', out]))[0];
  const packageInfo = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
  if (packed.name !== '@pathbit/agentdevkit' || packed.version !== packageInfo.version || !Array.isArray(packed.files)
    || typeof packed.filename !== 'string' || basename(packed.filename) !== packed.filename || !/^[a-z0-9._-]+\.tgz$/i.test(packed.filename)) throw Error('Pacote inesperado.');
  const forbidden = prohibitedPaths(packed.files.map(file => file.path));
  if (forbidden.length) throw Error(`Pacote contém artefatos locais: ${forbidden.join(', ')}`);
  const archive = join(out, packed.filename), digest = createHash('sha256').update(readFileSync(archive)).digest('hex');
  run('extract', 'tar', ['-xzf', archive, '-C', out]);
  const source = JSON.stringify(join(out, 'package')), probe = JSON.stringify(join(repo, 'tests/container-cli-smoke.mjs'));
  const compose = `services:\n  probe:\n    image: node:24-bookworm\n    network_mode: none\n    read_only: true\n    user: "1000:1000"\n    cap_drop: [ALL]\n    security_opt: [no-new-privileges:true]\n    tmpfs:\n      - /tmp:mode=1777\n    working_dir: /tmp\n    environment:\n      ADK_PACKAGE_ROOT: /opt/agentdevkit\n    volumes:\n      - type: bind\n        source: ${source}\n        target: /opt/agentdevkit\n        read_only: true\n      - type: bind\n        source: ${probe}\n        target: /opt/probe.mjs\n        read_only: true\n    entrypoint: [node, /opt/probe.mjs]\n`;
  const composeFile = join(out, 'compose.yml'); writeFileSync(composeFile, compose);
  const project = `adk-prep-${randomBytes(6).toString('hex')}`, prefix = ['compose', '--project-name', project, '-f', composeFile];
  console.log(JSON.stringify({ dockerProject: project }));
  for (const type of ['container', 'network', 'volume']) {
    const listed = run(`docker-${type}-before`, 'docker', [type, 'ls', ...(type === 'container' ? ['--all'] : []), '--filter', `label=com.docker.compose.project=${project}`, '--format', type === 'volume' ? '{{.Name}}' : '{{.ID}}']);
    if (listed.trim()) throw Error(`Projeto Docker já existe: ${project}; operação recusada.`);
  }
  run('compose-config', 'docker', [...prefix, 'config', '--quiet']);
  const result = JSON.parse(run('compose-smoke', 'docker', [...prefix, 'run', '--rm', '--no-deps', '--pull', 'never', '-T', 'probe']));
  if (result.status !== 'passed' || result.packageVersion !== packed.version) throw Error('Prova do pacote não passou.');
  for (const [name, path] of Object.entries(protectedPaths)) if (!same(before[name], snapshot(path))) throw Error(`Git ou ignore do checkout mudou: ${name}`);
  for (const type of ['container', 'network', 'volume']) {
    const listed = run(`docker-${type}-check`, 'docker', [type, 'ls', ...(type === 'container' ? ['--all'] : []), '--filter', `label=com.docker.compose.project=${project}`, '--format', type === 'volume' ? '{{.Name}}' : '{{.ID}}']);
    if (listed.trim()) throw Error(`Recurso Docker da prova permaneceu: ${type}; revise o projeto ${project}.`);
  }
  const report = { status: 'passed', version: packed.version, archiveSha256: digest, files: packed.files.length, forbidden: forbidden.length, project, smoke: result,
    protected: Object.keys(protectedPaths), limits: ['Compose temporário para CLI sem rede; não estabelece infraestrutura permanente.', 'Não valida recuperação concorrente ou Windows.'] };
  writeFileSync(join(out, 'REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, output: out, version: report.version, archiveSha256: digest, steps: result.steps.length }));
  return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
