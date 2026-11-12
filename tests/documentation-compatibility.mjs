#!/usr/bin/env node
// Opt-in harness: exercises an explicit additive fixture, not autonomous authorship.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, writeFileSync, writeSync } from 'node:fs';
import { dirname, isAbsolute, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findNpmCli } from '../.pbai4devs/scripts/lib/npm.mjs';
import {
  main as runCompatibility, parseCompatibilityArgs, outputDirectory,
  environment, recorder, workspace, gitSnapshot, info, put,
  json, hash, portable, registry,
} from './oss-compatibility.mjs';

const inspector = '.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs';
const marker = '<!-- AgentDevKit documentation compatibility fixture -->';

function checkedPath(root, path, { absent = false } = {}) {
  assert.ok(typeof path === 'string' && path && !isAbsolute(path) && !/[\\\x00-\x1f]/.test(path)
    && !path.split('/').some(part => !part || ['.', '..', '.git'].includes(part)), 'Caminho documental inválido.');
  let current = root;
  for (const part of path.split('/')) {
    const parent = info(current);
    if (parent?.isDirectory()) assert.ok(!readdirSync(current).some(name => name !== part && name.toLowerCase() === part.toLowerCase()), `Alias de caixa recusado: ${path}`);
    current = join(current, part);
    assert.ok(!info(current)?.isSymbolicLink(), `Link documental recusado: ${path}`);
  }
  if (absent) assert.equal(info(current), null, `Destino já existe: ${path}`);
  return current;
}

export function selectReadme(documentation, projectId) {
  assert.ok(Array.isArray(documentation?.files), 'O pacote não fornece inventário documental.');
  const readmes = documentation.files.filter(file => file.kind === 'file' && file.role === 'readme' && /^[a-f0-9]{64}$/.test(file.sha256 || ''));
  const selected = (projectId === 'zod' && readmes.find(file => file.path === 'packages/zod/README.md'))
    || readmes.find(file => !file.path.includes('/'))
    || readmes.sort((a, b) => a.path.split('/').length - b.path.split('/').length || a.path.localeCompare(b.path))[0];
  assert.ok(selected, 'Nenhum README regular e inventariado está disponível; não seguir links.');
  return selected;
}

function documentLink(from, to) {
  return posix.relative(posix.dirname(from), to).split('/').map(part => encodeURIComponent(part)
    .replace(/[!'()*]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase())).join('/');
}

export function createAdditivePlan(root, documentation, project) {
  const selected = selectReadme(documentation, project.id);
  const file = checkedPath(root, selected.path);
  const before = readFileSync(file);
  assert.equal(hash(before), selected.sha256, 'README mudou após o inventário.');
  assert.ok(!before.includes(Buffer.from(marker)), 'O exercício já foi aplicado a este clone.');
  const existingRoot = ['docs', 'documentation', 'doc', 'packages/docs'].find(path => {
    try { return info(checkedPath(root, path))?.isDirectory(); } catch { return false; }
  });
  const directory = existingRoot || 'docs';
  const index = `${directory}/agentdevkit-validation/README.md`;
  checkedPath(root, index, { absent: true });
  const sources = documentation.files.filter(item => item.kind === 'file' && item.path !== selected.path)
    .sort((a, b) => a.path.localeCompare(b.path)).slice(0, 5).map(item => item.path);
  const links = [selected.path, ...sources];
  const text = `---\ndescription: Controlled AgentDevKit documentation compatibility exercise.\n---\n\n# Documentation compatibility exercise\n\nThis local test index links documents discovered before editing. It does not\ndefine product requirements or approve architecture.\n\nRepository: ${project.repository}\nPinned commit: \`${project.commit}\`.\n\n${links.map(path => `- [${path}](${documentLink(index, path)})`).join('\n')}\n`;
  const appended = `\n\n${marker}\n\n## Documentation compatibility exercise\n\n[Existing documentation index](${documentLink(selected.path, index)}).\n`;
  return {
    schemaVersion: 1, mode: 'explicit-additive-test-fixture', project: project.id,
    approval: 'Authorized compatibility exercise in a disposable clone; not a product decision.',
    limits: ['No PRD, design, approval, or application behavior is invented.', 'This fixture tests preservation; it does not prove autonomous agent authorship.'],
    append: { path: selected.path, beforeSha256: hash(before), afterSha256: hash(Buffer.concat([before, Buffer.from(appended)])), bytesBefore: before.length, text: appended },
    create: { path: index, sha256: hash(Buffer.from(text)), text },
    links,
  };
}

// Only the harness calls this constrained fixture writer. It is not shipped as a
// product documentation mutator and never replaces an existing document.
export function applyAdditiveFixture(root, plan) {
  assert.equal(plan.schemaVersion, 1);
  assert.equal(plan.mode, 'explicit-additive-test-fixture');
  const appendPath = checkedPath(root, plan.append.path);
  const current = readFileSync(appendPath);
  const indexPath = checkedPath(root, plan.create.path);
  const indexInfo = info(indexPath);
  if (hash(current) === plan.append.afterSha256 && indexInfo?.isFile()
    && hash(readFileSync(indexPath)) === plan.create.sha256) return { changed: false };
  assert.equal(hash(current), plan.append.beforeSha256, 'Documento mudou depois do plano; nada será escrito.');
  assert.equal(indexInfo, null, 'O índice apareceu depois do plano; nada será sobrescrito.');
  const original = lstatSync(appendPath);
  const fd = openSync(appendPath, constants.O_WRONLY | constants.O_APPEND | (constants.O_NOFOLLOW || 0));
  try {
    const opened = fstatSync(fd), present = lstatSync(appendPath);
    assert.ok(opened.isFile() && !present.isSymbolicLink() && opened.dev === original.dev && opened.ino === original.ino
      && present.dev === opened.dev && present.ino === opened.ino, 'Documento foi substituído depois do plano.');
    assert.equal(hash(readFileSync(appendPath)), plan.append.beforeSha256, 'Documento mudou antes da adição.');
    mkdirSync(dirname(indexPath), { recursive: true });
    checkedPath(root, plan.create.path, { absent: true });
    // Exclusive creation cannot replace a file created after the preflight.
    writeFileSync(indexPath, plan.create.text, { flag: 'wx' });
    const added = Buffer.from(plan.append.text);
    let offset = 0;
    while (offset < added.length) {
      const written = writeSync(fd, added, offset, added.length - offset);
      assert.ok(written > 0, 'Adição documental não progrediu.'); offset += written;
    }
  } finally { closeSync(fd); }
  assert.equal(hash(readFileSync(appendPath)), plan.append.afterSha256);
  return { changed: true };
}

export function assertAdditivePreservation(root, before, plan, originalBytes) {
  const after = workspace(root);
  for (const [path, snapshot] of Object.entries(before)) {
    if (path === plan.append.path) continue;
    assert.deepEqual(after[path], snapshot, `Arquivo fora do plano alterado: ${path}`);
  }
  const content = readFileSync(checkedPath(root, plan.append.path));
  assert.ok(content.subarray(0, originalBytes.length).equals(originalBytes), 'Conteúdo original removido ou substituído.');
  assert.equal(hash(content), plan.append.afterSha256);
  assert.equal(after[plan.append.path].mode, before[plan.append.path].mode, 'Permissão do README mudou.');
  const allowed = new Set([plan.create.path]);
  let parent = posix.dirname(plan.create.path);
  while (parent !== '.') { allowed.add(parent); parent = posix.dirname(parent); }
  for (const path of Object.keys(after)) if (!Object.hasOwn(before, path)) assert.ok(allowed.has(path), `Caminho criado fora do plano: ${path}`);
  for (const path of plan.links) assert.ok(info(checkedPath(root, path))?.isFile(), `Link do índice não aponta a arquivo regular: ${path}`);
  return after;
}

function cliRunner(run, envRoot, npm, options) {
  return (name, args) => {
    const output = run(name, process.execPath, [npm, 'exec', '--yes', '--ignore-scripts', `--registry=${registry}`,
      `--package=${options.tarball || `@pathbit/agentdevkit@${options.version}`}`, '--', 'agentdevkit', ...args, '--json'], join(envRoot, 'npm-work'));
    const value = JSON.parse(output);
    assert.equal(value.version, options.version); assert.equal(value.ok, true);
    return value;
  };
}

function exerciseProject(project, options, output, envRoot, env, npm) {
  const root = join(output, 'projects', project.id), evidence = join(output, 'documentation', project.id);
  mkdirSync(evidence, { recursive: true });
  const { run, commands } = recorder(evidence, env);
  const git = (...args) => run(`git-${args[0]}`, 'git', ['-c', `core.hooksPath=${join(envRoot, 'empty-hooks')}`, '-c', `core.excludesFile=${join(envRoot, 'empty-config')}`, '-C', root, ...args], output);
  const cli = cliRunner(run, envRoot, npm, options);
  const result = { id: project.id, status: 'failed', scope: 'Explicit additive documentation fixture followed by kit maintenance', checks: [], failures: [] };
  const checked = name => { result.checks.push({ name, status: 'passed' }); console.log(`${project.id}: documentation-${name}=passed`); };
  try {
    const before = workspace(root), gitBefore = gitSnapshot(root, git);
    put(join(evidence, 'before.json'), JSON.stringify({ workspace: before, git: gitBefore }, null, 2) + '\n');
    const inspected = JSON.parse(run('inventory-before', process.execPath, [inspector], root));
    assert.deepEqual(workspace(root), before, 'Inventário alterou o clone.');
    assert.deepEqual(gitSnapshot(root, git), gitBefore, 'Inventário alterou o Git.');
    put(join(evidence, 'inventory-before.json'), JSON.stringify(inspected.documentation, null, 2) + '\n'); checked('inventory-read-only');
    const plan = createAdditivePlan(root, inspected.documentation, project);
    const original = readFileSync(checkedPath(root, plan.append.path));
    put(join(evidence, 'PLAN.json'), JSON.stringify(plan, null, 2) + '\n');
    applyAdditiveFixture(root, plan);
    const afterEdit = assertAdditivePreservation(root, before, plan, original);
    assert.deepEqual(gitSnapshot(root, git), gitBefore, 'Edição alterou índice/configuração/histórico Git.'); checked('additive-edit');
    put(join(evidence, 'after-edit.json'), JSON.stringify({ workspace: afterEdit, git: gitSnapshot(root, git) }, null, 2) + '\n');
    assert.equal(applyAdditiveFixture(root, plan).changed, false);
    assert.deepEqual(workspace(root), afterEdit, 'Repetição da fixture alterou arquivos.'); checked('fixture-idempotent');
    cli('update-documents', ['update', '--target', root, '--yes']);
    cli('doctor-documents', ['doctor', '--target', root]);
    cli('sync-documents', ['sync', '--check', '--target', root]);
    run('standalone-documents', process.execPath, ['.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs', '--check'], root);
    assert.deepEqual(workspace(root), afterEdit, 'Manutenção do kit reescreveu documentos.');
    assert.deepEqual(gitSnapshot(root, git), gitBefore, 'Git alterado após manutenção do kit.');
    checked('kit-preserves-additions');
    const afterInventory = JSON.parse(run('inventory-after', process.execPath, [inspector], root));
    const discovered = afterInventory.documentation.files.find(file => file.path === plan.create.path);
    assert.equal(discovered?.kind, 'file'); assert.equal(discovered.sha256, plan.create.sha256);
    assert.equal(afterInventory.documentation.files.find(file => file.path === plan.append.path)?.sha256, plan.append.afterSha256);
    assert.deepEqual(workspace(root), afterEdit, 'Segundo inventário alterou o clone.'); checked('new-index-discovered');
    put(join(evidence, 'inventory-after.json'), JSON.stringify(afterInventory.documentation, null, 2) + '\n');
    put(join(evidence, 'after.json'), JSON.stringify({ workspace: workspace(root), git: gitSnapshot(root, git) }, null, 2) + '\n');
    Object.assign(result, { status: 'passed', appendedDocument: plan.append.path, createdIndex: plan.create.path,
      originalPrefixPreserved: true, outsidePlanUnchanged: true, gitPreserved: true, noInventedProductDecisions: true });
  } catch (error) { result.error = error.message; result.failures.push(error.message); }
  result.commands = commands.length; result.evidence = portable(relative(output, evidence));
  put(join(evidence, 'REPORT.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}

function exerciseEmpty(options, output, envRoot, env, npm) {
  const root = join(output, 'projects', 'empty'), evidence = join(output, 'documentation', 'empty');
  mkdirSync(root); mkdirSync(evidence, { recursive: true });
  const { run, commands } = recorder(evidence, env), cli = cliRunner(run, envRoot, npm, options);
  const result = { id: 'empty', status: 'failed', checks: [], failures: [] };
  try {
    assert.deepEqual(workspace(root), {});
    cli('init-empty', ['init', '--target', root, '--agents', 'codex', '--lang', 'en', '--yes']);
    const before = workspace(root), inspected = JSON.parse(run('inventory-empty', process.execPath, [inspector], root));
    assert.deepEqual(workspace(root), before, 'Inventário alterou o projeto vazio.');
    assert.ok(inspected.documentation?.files.some(file => file.role === 'readme'));
    assert.ok(!inspected.documentation.files.some(file => ['product', 'prd', 'design', 'spec', 'roadmap', 'ux-ui'].includes(file.role)), 'Documentação de produto inventada.');
    for (const name of ['docs', 'prd.md', 'PRD.md', 'design.md', 'DESIGN.md']) assert.equal(info(join(root, name)), null, `Documento de produto inesperado: ${name}`);
    assert.equal(inspected.maturity.planning.prd.present, false); assert.equal(inspected.maturity.planning.design.present, false);
    cli('init-empty-repeat', ['init', '--target', root, '--agents', 'codex', '--lang', 'en', '--yes']);
    cli('update-empty', ['update', '--target', root, '--yes']); cli('doctor-empty', ['doctor', '--target', root]);
    cli('sync-empty', ['sync', '--check', '--target', root]);
    assert.deepEqual(workspace(root), before, 'Repetição alterou o projeto vazio.');
    put(join(evidence, 'inventory.json'), JSON.stringify(inspected, null, 2) + '\n');
    Object.assign(result, { status: 'passed', noInventedProductDecisions: true, checks: [
      { name: 'inventory-read-only', status: 'passed' }, { name: 'product-documents-pending', status: 'passed' }, { name: 'idempotent', status: 'passed' },
    ] });
  } catch (error) { result.error = error.message; result.failures.push(error.message); }
  result.commands = commands.length; result.evidence = portable(relative(output, evidence));
  put(join(evidence, 'REPORT.json'), JSON.stringify(result, null, 2) + '\n'); return result;
}

export function main(args = process.argv.slice(2)) {
  const options = parseCompatibilityArgs(args);
  if (options.help) {
    console.log('Uso: node tests/documentation-compatibility.mjs [--project id] [--output tmp/documentation-compatibility/execucao-nova] [--version x.y.z] [--tarball arquivo.tgz]\nExecuta a matriz OSS e uma fixture documental aditiva explícita em clones descartáveis, além de um projeto vazio. Não comprova autoria autônoma de documentos nem executa aplicações.');
    return 0;
  }
  assert.ok(Number(process.versions.node.split('.')[0]) >= 24, 'Use Node.js 24+.');
  const output = outputDirectory(options.output || `tmp/documentation-compatibility/${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`);
  if (options.tarball) options.tarball = resolve(options.tarball);
  const baseArgs = ['--output', output, '--version', options.version, ...(options.project ? ['--project', options.project] : []), ...(options.tarball ? ['--tarball', options.tarball] : [])];
  const baseStatus = runCompatibility(baseArgs), original = json(join(output, 'REPORT.json'));
  const report = { status: 'failed', version: options.version, packageSource: original.packageSource, installationStatus: original.status, output, results: [],
    limits: ['A autoria documental deste harness é uma fixture explícita, não um agente autônomo.',
      'Somente adições locais aprovadas para o teste; nenhuma especificação ou decisão de produto é inventada.',
      ...original.limits] };
  if (baseStatus === 0) {
    const envRoot = join(output, 'documentation-environment'); mkdirSync(envRoot);
    const env = environment(envRoot), npm = findNpmCli(); assert.ok(npm, 'npm CLI não encontrado.');
    report.results = original.results.map(project => exerciseProject(project, options, output, envRoot, env, npm));
    report.results.push(exerciseEmpty(options, output, envRoot, env, npm));
    report.status = report.results.every(result => result.status === 'passed') ? 'passed' : 'failed';
  } else report.failure = 'Matriz de instalação falhou; exercícios documentais não foram executados.';
  if (options.tarball) {
    const unchanged = hash(readFileSync(options.tarball)) === original.packageSource.sha256;
    report.packageSource = { ...report.packageSource, unchanged };
    if (!unchanged) { report.status = 'failed'; report.failure = 'O pacote mudou durante a validação.'; }
  }
  put(join(output, 'DOCUMENTATION-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, scenarios: report.results.length, report: join(output, 'DOCUMENTATION-REPORT.json') }));
  return report.status === 'passed' ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
