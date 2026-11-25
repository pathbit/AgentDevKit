import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findNpmCli } from '../.pbai4devs/scripts/lib/npm.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
test("input runtime preserves Git and own skill in init, sync and update", { timeout: 900000 }, async t => {
  if (process.env.ADK_EXPECT_NODE18 === '1') assert.equal(process.versions.node, '18.20.8');
  const base = mkdtempSync(join(tmpdir(), 'adk-runtime-'));
  t.after(() => rm(base, { recursive: true, force: true, maxRetries: 6, retryDelay: 250 }));
  const root = join(base, 'project'), template = join(base, 'template');
  mkdirSync(root); mkdirSync(template);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !/^npm_config_|^NODE_OPTIONS$/i.test(key) && !/(?:^|_)(?:token|secret|password)(?:_|$)/i.test(key)));
  const userConfig = join(base, 'user.npmrc'), globalConfig = join(base, 'global.npmrc');
  writeFileSync(userConfig, ''); writeFileSync(globalConfig, '');
  Object.assign(env, { npm_config_cache: join(base, 'npm-cache'), npm_config_userconfig: userConfig,
    npm_config_globalconfig: globalConfig, npm_config_offline: 'true', npm_config_ignore_scripts: 'true',
    npm_config_audit: 'false', npm_config_fund: 'false' });
  const run = (program, args, cwd = root) => {
    const result = spawnSync(program, args, {
      cwd, env, encoding: 'utf8', timeout: 180000,
      maxBuffer: 8 * 1024 * 1024, windowsHide: true,
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.signal, null, result.stderr);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return result.stdout;
  };
  const npm = findNpmCli({ node: process.execPath, environment: env });
  assert.ok(npm, 'npm é necessário para empacotar a fixture offline');
  const packed = JSON.parse(run(process.execPath, [npm, 'pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', base], repository));
  assert.equal(packed.length, 1);
  const archive = join(base, packed[0].filename), prefix = join(base, 'installed');
  run(process.execPath, [npm, 'install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', prefix, archive], base);
  const packageRoot = join(prefix, 'node_modules', '@pathbit', 'agentdevkit');
  const cli = join(packageRoot, 'bin', 'agentdevkit.mjs');
  assert.ok(existsSync(cli), 'CLI ausente do pacote instalado');
  if (Number(process.versions.node.split('.')[0]) < 24) {
    const node24 = process.env.ADK_TEST_NODE24;
    assert.ok(node24 && isAbsolute(node24), 'ADK_TEST_NODE24 deve apontar para Node 24 instalado');
    const version = run(node24, ['--version']).trim();
    assert.match(version, /^v24\.\d+\.\d+$/);
    assert.equal(run(node24, ['-p', 'process.arch']).trim(), process.arch);
    const npm24 = findNpmCli({ node: node24, environment: {} });
    assert.ok(npm24, 'npm da instalação Node 24 não encontrado');
    const platform = process.platform === 'win32' ? `win-${process.arch}` : process.platform === 'darwin'
      ? `darwin-${process.arch}` : `linux-${process.arch}${process.report?.getReport().header.glibcVersionRuntime ? '' : '-musl'}`;
    const runtime = join(packageRoot, '.pbai4devs', 'tools', '.cache', 'runtime', 'node', platform, version);
    const cache = join(packageRoot, '.pbai4devs', 'tools', '.cache', 'runtime', 'node', platform);
    assert.equal(existsSync(cache), false, 'Pacote temporário contém cache de runtime');
    const bootstrap = await import(pathToFileURL(join(packageRoot, '.pbai4devs', 'scripts', 'preparar-ferramentas', 'BOOTSTRAP.mjs')).href);
    await assert.rejects(bootstrap.ensureRuntime({ root: packageRoot, allowDownload: false, environment: env }), /Node\.js 24\+ e npm nao encontrados/);
    assert.equal(existsSync(cache), false, 'Consulta sem download criou cache de runtime');
    const binary = process.platform === 'win32' ? join(runtime, 'node.exe') : join(runtime, 'bin', 'node');
    const npmTarget = process.platform === 'win32' ? join(runtime, 'node_modules', 'npm') : join(runtime, 'lib', 'node_modules', 'npm');
    mkdirSync(dirname(binary), { recursive: true }); mkdirSync(dirname(npmTarget), { recursive: true });
    copyFileSync(node24, binary);
    if (process.platform !== 'win32') chmodSync(binary, 0o755);
    cpSync(dirname(dirname(npm24)), npmTarget, { recursive: true });
    const selected = await bootstrap.ensureRuntime({ root: packageRoot, allowDownload: false, environment: env });
    assert.equal(selected.source, 'cache');
    assert.equal(selected.version, version.slice(1));
    assert.equal(realpathSync(selected.node), realpathSync(binary));
  }
  const git = (...args) => run('git', args);
  const command = (...args) => {
    const result = JSON.parse(run(process.execPath, [cli, ...args, '--target', root, '--json']));
    assert.equal(result.ok, true, JSON.stringify(result));
    return result;
  };
  git('init', '--quiet', `--template=${template}`);
  writeFileSync(join(root, '.gitignore'), '# conteúdo humano\n*.local\n');
  writeFileSync(join(root, 'AGENTS.md'), '# Instruções humanas\n\nPreserve esta decisão.\n');
  writeFileSync(join(root, 'human.txt'), 'preparado\n');
  mkdirSync(join(root, '.git', 'info'), { recursive: true });
  writeFileSync(join(root, '.git', 'info', 'exclude'), '# exclusão humana\nprivado/\n');
  git('add', '--', '.gitignore', 'AGENTS.md', 'human.txt');
  writeFileSync(join(root, 'human.txt'), 'preparado\nalteração local\n');
  const protectedPaths = ['.git/index', '.git/config', '.git/info/exclude', '.git/HEAD', '.gitignore', 'human.txt'];
  const snapshot = () => new Map(protectedPaths.map(path => [path, readFileSync(join(root, path))]));
  const unchanged = before => {
    for (const [path, bytes] of before) assert.deepEqual(readFileSync(join(root, path)), bytes, path);
    assert.ok(readFileSync(join(root, 'AGENTS.md'), 'utf8').startsWith(humanAgents));
  };
  const humanAgents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  const initial = snapshot();
  command('init', '--agents', 'codex', '--yes');
  unchanged(initial);

  const source = '.pbai4devs/skills/extra/local-skill/SKILL.md';
  const pointer = '.agents/skills/extra/local-skill/SKILL.md';
  mkdirSync(dirname(join(root, source)), { recursive: true });
  writeFileSync(join(root, source), '---\nname: local-skill\ndescription: Skill humana sintética.\n---\n\n# Skill local\n\nPreserve esta decisão.\n');
  git('add', '-f', '--', source);
  protectedPaths.push(source);
  const staged = snapshot();
  assert.equal(existsSync(join(root, pointer)), false);
  assert.equal(command('sync').changed, true);
  unchanged(staged);
  const body = readFileSync(join(root, pointer), 'utf8');
  const match = body.match(/\[origem\]\(([^)]+)\)/);
  assert.ok(match, 'Apontamento da skill própria ausente');
  assert.equal(resolve(dirname(join(root, pointer)), decodeURIComponent(match[1])), resolve(root, source));
  const pointerBytes = readFileSync(join(root, pointer));
  for (const args of [['sync', '--check'], ['update'], ['update', '--dry-run'], ['doctor']]) {
    command(...args);
    unchanged(staged);
    assert.deepEqual(readFileSync(join(root, pointer)), pointerBytes);
  }
});
