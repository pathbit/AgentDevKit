#!/usr/bin/env node
// Opt-in upgrade proof against independently installed AgentDevKit artifacts.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findNpmCli } from '../.pbai4devs/scripts/lib/npm.mjs';
import { stripManagedContent } from '../.pbai4devs/scripts/lib/managed-content.mjs';
import {
  checkSyncIssues, environment, fileSnapshot, gitSnapshot, hash, json, outputDirectory, parseCliResult,
  prepareOutput, put, recorder, registry, repositoryRoot, stateJson, workspace,
} from './oss-compatibility.mjs';

const packageName = '@pathbit/agentdevkit';
const cliPath = 'bin/agentdevkit.mjs';
const statePath = '.pbai4devs/state/agentdevkit.json';
const versionPattern = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const help = [
  'Uso: node tests/upgrade-packages.mjs [--from-version x.y.z] [--from-tarball arquivo.tgz]',
  '                                    [--to-tarball arquivo.tgz] [--output tmp/execucao-nova]',
  'Informe a versão de origem no npm público ou um tarball local. Com ambos, a origem local',
  'deve corresponder à integridade do npm. Sem --to-tarball, empacota o checkout local.',
].join('\n');

function parse(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    assert.ok(['--from-version', '--from-tarball', '--to-tarball', '--output'].includes(arg), 'Opção desconhecida. Use --help.');
    const name = arg.slice(2), value = args[++i];
    assert.ok(value && !value.startsWith('--') && !Object.hasOwn(options, name), 'Opção repetida ou sem valor.');
    options[name] = name.endsWith('-tarball') ? resolve(value) : value;
  }
  assert.ok(options['from-version'] || options['from-tarball'], 'Informe --from-version ou --from-tarball.');
  if (options['from-version']) assert.match(options['from-version'], versionPattern, 'Informe a versão exata e estável.');
  return options;
}

const scenarios = [
  { id: 'claude', client: 'claude', humanRule: true, staged: true },
  { id: 'codex-with-claude-rule', client: 'codex', humanRule: true, staged: true },
  { id: 'codex-without-claude-rule', client: 'codex', staged: true },
  { id: 'codex-untracked', client: 'codex', staged: false },
  { id: 'codex-staged-crlf', client: 'codex', staged: true, crlf: true },
  ...['copilot', 'gemini', 'opencode', 'cursor'].map(client => ({ id: client, client, staged: true })),
];

const entrypoints = {
  'AGENTS.md': '# Instruções da equipe\n\nPreservar esta orientação.\n',
  'CLAUDE.md': '# Orientações Claude\n\nRegra da equipe.\n',
  'GEMINI.md': '# Orientações Gemini\n\nRegra da equipe.\n',
};
const nativeHuman = {
  '.claude/settings.json': '{"projeto":"configuração humana"}\n',
  '.claude/skills/equipe/SKILL.md': '---\nname: equipe\ndescription: Skill humana.\n---\n\n# Equipe\n',
  '.gemini/commands/equipe.toml': 'description = "Comando humano"\nprompt = "Revisar decisões da equipe"\n',
  '.github/instructions/equipe.instructions.md': '---\napplyTo: "**/*.mjs"\n---\n\n# Regra humana\n',
  '.opencode/agents/equipe.md': '---\ndescription: Agente humano.\n---\n\n# Equipe\n',
  '.cursor/rules/equipe.mdc': '---\ndescription: Regra humana.\n---\n\n# Equipe\n',
};

function artifactDigest(path) {
  const info = lstatSync(path);
  assert.ok(info.isFile() && !info.isSymbolicLink(), 'Tarball deve ser um arquivo regular.');
  const bytes = readFileSync(path);
  return {
    bytes, size: bytes.length, sha256: hash(bytes),
    integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64'),
  };
}

function packedFile(stdout, directory) {
  const result = JSON.parse(stdout);
  assert.ok(Array.isArray(result) && result.length === 1, 'npm pack deve criar um único tarball.');
  const packed = result[0];
  assert.equal(packed.name, packageName, 'Nome inesperado no npm pack.');
  assert.match(packed.version, versionPattern);
  assert.equal(packed.filename, basename(packed.filename), 'Nome inválido no npm pack.');
  assert.match(packed.filename, /^[a-z0-9][a-z0-9.-]+\.tgz$/i, 'Nome inválido no npm pack.');
  const path = join(directory, packed.filename), actual = artifactDigest(path);
  assert.equal(actual.integrity, packed.integrity, 'Tarball diverge da integridade retornada pelo npm pack.');
  assert.equal(actual.size, packed.size, 'Tarball diverge do tamanho retornado pelo npm pack.');
  return { path, version: packed.version };
}

function installArtifact({ work, run, npm, fromVersion, expectedVersion, input, label }) {
  const directory = join(work, label);
  mkdirSync(directory);
  const metadataCwd = join(work, 'npm-work');
  const npmRun = (step, args, cwd = metadataCwd) => run(step + '-' + label, process.execPath, [npm, ...args], cwd);
  let published, generated, provenance;
  if (fromVersion) {
    const specification = packageName + '@' + fromVersion;
    published = JSON.parse(npmRun('npm-view', ['view', specification, 'name', 'version', 'dist.tarball', 'dist.integrity',
      '--json', '--offline=false', '--prefer-online', '--registry', registry]));
    assert.equal(published.name, packageName);
    assert.equal(published.version, fromVersion);
    assert.match(published['dist.integrity'], /^sha512-[A-Za-z0-9+/]{86}==$/, 'Integridade SHA-512 pública ausente ou inválida.');
    const publishedUrl = new URL(published['dist.tarball']);
    assert.ok(publishedUrl.origin === registry && !publishedUrl.username && !publishedUrl.password
      && !publishedUrl.search && !publishedUrl.hash, 'Origem do tarball publicado diverge do npm público.');
    if (!input) {
      generated = packedFile(npmRun('npm-pack', ['pack', publishedUrl.href, '--json', '--ignore-scripts',
        '--offline=false', '--prefer-online', '--registry', registry, '--pack-destination', directory]), directory);
      input = generated.path;
    }
    expectedVersion = fromVersion;
    if (generated) assert.equal(generated.version, expectedVersion, 'Versão do npm pack diverge da versão publicada.');
    provenance = { kind: 'public-npm', registry, tarballUrl: publishedUrl.href, expectedIntegrity: published['dist.integrity'] };
  } else if (input) {
    provenance = { kind: 'local-tarball' };
  } else {
    const revision = run('source-head', 'git', ['rev-parse', 'HEAD'], repositoryRoot).trim();
    const status = run('source-status', 'git', ['status', '--porcelain=v1', '--untracked-files=all'], repositoryRoot);
    generated = packedFile(npmRun('npm-pack', ['pack', '--offline', '--json', '--ignore-scripts', '--pack-destination', directory],
      repositoryRoot), directory);
    input = generated.path;
    assert.equal(generated.version, expectedVersion, 'Versão do npm pack diverge do checkout local.');
    provenance = { kind: 'packed-checkout', sourceCommit: revision, cleanCheckoutAtPack: status === '' };
  }
  const actual = artifactDigest(input);
  if (published) assert.equal(actual.integrity, published['dist.integrity'], 'Tarball de origem diverge da integridade publicada.');
  const staged = join(directory, 'input.tgz');
  writeFileSync(staged, actual.bytes, { flag: 'wx', mode: 0o600 });
  const prefix = join(directory, 'node-install');
  npmRun('npm-install', ['install', '--offline', '--ignore-scripts', '--no-save', '--no-package-lock',
    '--no-audit', '--no-fund', '--prefix', prefix, staged]);
  const installed = realpathSync(join(prefix, 'node_modules', ...packageName.split('/')));
  assert.equal(installed, join(realpathSync(prefix), 'node_modules', ...packageName.split('/')), 'npm deve instalar o pacote no prefixo da prova.');
  const manifest = json(join(installed, 'package.json')), bin = join(installed, cliPath);
  assert.equal(manifest.name, packageName, 'Pacote instalado não corresponde ao AgentDevKit.');
  assert.match(manifest.version, versionPattern);
  assert.equal(manifest.bin?.agentdevkit, cliPath, 'Ponto de entrada inesperado no pacote.');
  assert.equal(fileSnapshot(installed, cliPath).kind, 'file', 'CLI instalada deve ser um arquivo regular.');
  if (expectedVersion) {
    assert.equal(manifest.version, expectedVersion, label === 'to'
      ? 'Versão do tarball de destino diverge de package.json do checkout.'
      : 'Versão instalada diverge da versão publicada.');
  }
  const { bytes, ...digests } = actual;
  const evidence = { ...provenance, source: input, staged, version: manifest.version, ...digests };
  return { bin, evidence };
}

function compareVersions(left, right) {
  const a = left.split('.').map(BigInt), b = right.split('.').map(BigInt);
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}

function snapshotGit(root, git) {
  const raw = Object.fromEntries(['.git/HEAD', '.git/packed-refs', '.git/index', '.git/config', '.git/info/exclude', '.gitignore']
    .map(path => [path, fileSnapshot(root, path)]));
  const trees = {};
  const visit = path => {
    const item = fileSnapshot(root, path);
    trees[path] = item;
    if (item.kind === 'directory') for (const name of readdirSync(join(root, path)).sort()) visit(path + '/' + name);
  };
  visit('.git/refs'); visit('.git/logs');
  const snapshot = gitSnapshot(root, git);
  for (const [path, item] of Object.entries(raw)) assert.deepEqual(fileSnapshot(root, path), item, 'Consulta Git alterou ' + path);
  for (const [path, item] of Object.entries(trees)) assert.deepEqual(fileSnapshot(root, path), item, 'Consulta Git alterou ' + path);
  return { ...snapshot, raw, trees };
}

export function readRegularEntrypoint(root, path, original) {
  const absolute = join(root, path), current = lstatSync(absolute);
  assert.ok(original.kind === 'file' && current.isFile() && !current.isSymbolicLink(),
    'O apontamento deve continuar como arquivo regular em ' + path);
  assert.equal(current.mode & 0o777, original.mode, 'O modo do apontamento foi alterado em ' + path);
  return readFileSync(absolute);
}

function runScenario(work, env, scenario, from, to) {
  const root = join(work, 'projects', scenario.id), evidence = join(work, 'results', scenario.id);
  mkdirSync(root, { recursive: true }); mkdirSync(evidence, { recursive: true });
  const { run, commands } = recorder(evidence, env);
  const report = { id: scenario.id, client: scenario.client, status: 'failed', checks: [] };
  const book = (name, value) => put(join(evidence, name + '.json'), JSON.stringify(value, null, 2) + '\n');
  const passed = name => { report.checks.push(name); console.log(scenario.id + ': ' + name + '=passed'); };
  const git = (...args) => {
    if (!scenario.staged && args[0] === 'rev-parse') return run('git-unborn-head', 'git', ['-C', root, 'rev-parse', '--verify', '--quiet', 'HEAD'], root, 1);
    return run('git-' + args[0], 'git', ['-C', root, ...args], root);
  };
  const cli = (artifact, name, args, expected = 0) => {
    const stdout = run(name, process.execPath, [artifact.bin, ...args, '--target', root, '--json'], root, null);
    return parseCliResult(stdout, commands.at(-1).status, { name, expected, version: artifact.evidence.version });
  };
  const retained = scenario.humanRule && scenario.client !== 'claude' ? ['.claude/rules/equipe.md'] : [];
  const verifySync = (artifact, name) => {
    const expected = retained.length ? 1 : 0;
    const sync = cli(artifact, name, ['sync', '--check'], expected);
    checkSyncIssues(sync, null, true);
    assert.deepEqual(sync.plan, [], 'Sync --check apontou mudanças pendentes.');
    assert.deepEqual(sync.issues ?? [], [], 'Sync --check registrou problemas inesperados.');
    assert.equal(sync.error, undefined, 'Sync --check devolveu erro inesperado.');
    assert.notEqual(sync.localIgnore.status, 'no-git', 'Sync --check deve reconhecer a fixture Git.');
    assert.deepEqual(sync.retainedClaudeRules ?? [], retained, 'Retenção de regras Claude divergiu da fixture.');
    return { status: expected, pending: sync.localIgnore.pending, retainedClaudeRules: retained };
  };
  const write = (path, content) => put(join(root, path), content);
  const capture = paths => Object.fromEntries(paths.map(path => [path, fileSnapshot(root, path)]));
  let stage = 'prepare';
  try {
    git('init', '--quiet', '--template=');
    git('config', 'core.autocrlf', 'false');
    git('remote', 'add', 'origin', 'https://example.invalid/agentdevkit-upgrade.git');
    write('.git/info/exclude', '# Exclusão local da equipe\n/privado-da-equipe/\n');
    const human = {
      '.gitignore': '# Ignore do projeto\nminha-pasta/\n',
      'README.md': '# Projeto da equipe\n',
      'src/app.mjs': 'export const trabalhoHumano = true;\n',
      ...nativeHuman,
      ...(scenario.humanRule ? { '.claude/rules/equipe.md': '---\ndescription: Regra humana.\n---\n\n# Regra da equipe\n' } : {}),
    };
    for (const [path, content] of Object.entries({ ...human, ...entrypoints })) write(path, content);
    if (scenario.staged) {
      git('add', '--', 'README.md');
      git('-c', 'user.name=Fixture AgentDevKit', '-c', 'user.email=agentdevkit@example.invalid', 'commit', '-qm', 'Histórico da equipe');
      git('tag', 'baseline');
      git('pack-refs', '--all');
      git('add', '--', ...Object.keys(human), ...Object.keys(entrypoints));
    }
    const humanPaths = Object.keys(human), entryPaths = Object.keys(entrypoints);
    const humanBeforeInit = capture(humanPaths), entryBeforeInit = capture(entryPaths), beforeInit = snapshotGit(root, git);
    book('before-init', { git: beforeInit, human: humanBeforeInit, entrypoints: entryBeforeInit });

    stage = 'init-origin';
    cli(from, 'init-origin', ['init', '--yes', '--agents', scenario.client]);
    const initialState = stateJson(root, statePath);
    assert.equal(initialState.version, from.evidence.version, 'Instalação antiga não registrou a versão de origem.');
    assert.deepEqual(initialState.clients, [scenario.client], 'Seleção da instalação antiga divergiu.');
    const afterInit = snapshotGit(root, git);
    book('after-init', { git: afterInit, human: capture(humanPaths), state: initialState });
    assert.deepEqual(afterInit, beforeInit, 'Instalação de origem alterou o Git ou seu ignore.');
    assert.deepEqual(capture(humanPaths), humanBeforeInit, 'Instalação de origem alterou arquivos humanos.');
    if (!scenario.staged) assert.ok(!afterInit.index && afterInit.indexSha256 === null, 'Instalação não deve criar um índice no cenário untracked.');
    for (const path of entryPaths) {
      const stripped = stripManagedContent(readRegularEntrypoint(root, path, entryBeforeInit[path]), initialState.blocks?.[path]);
      assert.ok(stripped.startsWith(entrypoints[path]) && /^[\r\n]*$/.test(stripped.slice(entrypoints[path].length)),
        'Instalação alterou o conteúdo humano de ' + path);
    }
    passed('instalação de origem e preservação');

    stage = 'prepare-human-edits';
    let crlfPath;
    if (scenario.crlf) {
      crlfPath = '.agents/skills/git/git-status/SKILL.md';
      const original = readFileSync(join(root, crlfPath), 'utf8');
      assert.ok(original.includes('\n') && !original.includes('\r'), 'Prova CRLF exige referência original LF.');
      git('config', 'core.autocrlf', 'true');
      write(crlfPath, original.replaceAll('\n', '\r\n'));
      git('add', '-f', '--', crlfPath);
      assert.equal(git('show', ':' + crlfPath), original, 'O índice deve conter a referência LF da fixture.');
    }
    write('src/app.mjs', 'export const trabalhoHumano = "edição após init";\n');
    appendFileSync(join(root, '.claude/skills/equipe/SKILL.md'), '\nAlteração humana da skill.\n');
    for (const path of entryPaths) appendFileSync(join(root, path), '\nOrientação humana acrescentada após a instalação antiga.\n');
    const userFiles = capture([...humanPaths, ...(crlfPath ? [crlfPath] : [])]);
    const humanEntries = Object.fromEntries(entryPaths.map(path =>
      [path, stripManagedContent(readRegularEntrypoint(root, path, entryBeforeInit[path]), initialState.blocks?.[path])]));
    const beforeUpdate = snapshotGit(root, git);
    book('before-update', { git: beforeUpdate, human: userFiles, entrypoints: capture(entryPaths) });
    if (retained.length) {
      stage = 'verify-origin';
      const observed = workspace(root);
      report.originSync = verifySync(from, 'sync-origin');
      assert.deepEqual(workspace(root), observed, 'Sync --check de origem alterou a instalação.');
      assert.deepEqual(snapshotGit(root, git), beforeUpdate, 'Sync --check de origem alterou o Git.');
      passed('recusa conservadora comprovada na origem');
    }

    stage = 'update';
    const update = cli(to, 'update', ['update', '--yes']);
    const updatedState = stateJson(root, statePath), afterUpdate = snapshotGit(root, git);
    book('after-update', { git: afterUpdate, human: capture(Object.keys(userFiles)), entrypoints: capture(entryPaths), state: updatedState });
    assert.equal(updatedState.version, to.evidence.version, 'O estado não avançou para a versão do pacote candidato.');
    assert.deepEqual(updatedState.clients, initialState.clients, 'A atualização alterou os clientes selecionados.');
    assert.equal(updatedState.language, initialState.language, 'A atualização alterou o idioma salvo.');
    assert.deepEqual(afterUpdate, beforeUpdate, 'A atualização alterou o Git ou as exclusões locais.');
    assert.deepEqual(capture(Object.keys(userFiles)), userFiles, 'A atualização alterou conteúdo humano ou a referência CRLF staged.');
    for (const path of entryPaths) {
      assert.equal(stripManagedContent(readRegularEntrypoint(root, path, entryBeforeInit[path]), updatedState.blocks?.[path]), humanEntries[path],
        'A atualização alterou texto fora do bloco gerenciado em ' + path);
    }
    report.update = { changed: update.changed, preserved: update.preserved ?? [] };
    passed('atualização e preservação');

    stage = 'verify';
    const observed = workspace(root);
    report.syncCheck = verifySync(to, 'sync-check');
    assert.deepEqual(workspace(root), observed, 'Sync --check alterou a instalação.');
    assert.deepEqual(snapshotGit(root, git), beforeUpdate, 'Sync --check alterou o Git.');
    passed(retained.length ? 'recusa conservadora esperada sem alterações' : 'sync --check somente leitura');

    stage = 'repeat-update';
    const repeat = cli(to, 'update-repeat', ['update', '--yes']);
    assert.equal(repeat.changed, false, 'Repetição da atualização deve ser idempotente.');
    assert.deepEqual(workspace(root), observed, 'Repetição alterou a instalação.');
    assert.deepEqual(snapshotGit(root, git), beforeUpdate, 'Repetição alterou o Git.');
    passed('repetição idempotente');
    report.status = 'passed';
  } catch (error) {
    report.failure = { stage, message: error.message, ...(error.code ? { code: error.code } : {}) };
  }
  report.commands = commands.length;
  book('RESULT', report);
  console.log(scenario.id + '=' + report.status + (report.failure ? ' (' + stage + '): ' + report.failure.message : ''));
  return report;
}

export function main(args = process.argv.slice(2)) {
  const options = parse(args);
  if (options.help) { console.log(help); return 0; }
  const npm = findNpmCli();
  assert.ok(npm, 'Node e npm são necessários.');
  const work = outputDirectory(options.output || 'tmp/upgrade-packages/' + randomUUID());
  const prepared = prepareOutput(work);
  console.log(work);
  const env = { ...environment(work), npm_config_offline: 'true', npm_config_update_notifier: 'false' };
  const { run } = recorder(join(work, 'packages'), env);
  const controller = fileURLToPath(import.meta.url), controllerSha256 = hash(readFileSync(controller));
  const report = { status: 'failed', packageName, node: process.version, platform: process.platform, arch: process.arch, controllerSha256, outcomes: [],
    limits: ['Fixtures sintéticas e caminhos observados. A prova não executa clientes nem mede todos os metadados ou alterações transitórias.',
      'Pacotes são instalados de tarballs locais com npm offline e sem scripts. A origem pública é consultada no npm quando solicitada.',
      'A confirmação de proveniência identifica o registry e a integridade observada, ou o tarball local escolhido.'] };
  try {
    prepared.verifyOutput();
    const checkout = json(join(repositoryRoot, 'package.json'));
    assert.equal(checkout.name, packageName, 'Checkout deve fornecer o pacote AgentDevKit.');
    assert.match(checkout.version, versionPattern, 'Checkout deve fornecer uma versão estável.');
    report.expectedDestinationVersion = checkout.version;
    const from = installArtifact({ work, run, npm, label: 'from', fromVersion: options['from-version'], input: options['from-tarball'] });
    report.from = from.evidence;
    const to = installArtifact({ work, run, npm, label: 'to', input: options['to-tarball'], expectedVersion: checkout.version });
    report.to = to.evidence;
    const transition = compareVersions(to.evidence.version, from.evidence.version);
    assert.ok(transition >= 0, 'Pacote candidato não pode ser uma versão anterior à origem.');
    report.transition = transition === 0 ? 'same-version' : 'upgrade';
    for (const scenario of scenarios) {
      prepared.verifyOutput();
      report.outcomes.push(runScenario(work, env, scenario, from, to));
    }
    report.artifactsUnchanged = [from, to].every(({ evidence }) =>
      [evidence.source, evidence.staged].every(path => artifactDigest(path).sha256 === evidence.sha256));
    report.controllerUnchanged = hash(readFileSync(controller)) === controllerSha256;
    report.status = report.artifactsUnchanged && report.controllerUnchanged
      && report.outcomes.length === scenarios.length && report.outcomes.every(item => item.status === 'passed') ? 'passed' : 'failed';
  } catch (error) {
    report.failure = { message: error.message, ...(error.code ? { code: error.code } : {}) };
    console.error(error.message);
  }
  prepared.verifyOutput();
  const output = join(work, 'RESULT.json');
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(output);
  return report.status === 'passed' ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
