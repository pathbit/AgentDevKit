#!/usr/bin/env node
// Inventario somente leitura; nomes e caminhos, nunca valores de configuracao.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireNode, isMain } from '../lib/runtime.mjs';

const repository = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
const defaultAgents = ['.agents', '.agent', '.gemini', '.claude', '.codex', '.cursor', '.github', '.opencode'];
const defaultExcluded = ['.git', '.pbai4devs', '.agent-tests', ...defaultAgents, '.vscode', 'node_modules', 'vendor', 'target', 'dist', 'build', 'bin', 'obj', '.venv', 'venv', '.cache', '.next', '.nuxt', 'coverage', 'test-results', 'playwright-report', 'blob-report', 'tmp', 'temp'];
const manifests = new Map([
  ['package.json', 'javascript'], ['deno.json', 'javascript'], ['deno.jsonc', 'javascript'],
  ['pyproject.toml', 'python'], ['Pipfile', 'python'], ['setup.py', 'python'], ['setup.cfg', 'python'],
  ['Cargo.toml', 'rust'], ['go.mod', 'go'], ['pom.xml', 'java'], ['build.gradle', 'java'], ['build.gradle.kts', 'kotlin'],
  ['composer.json', 'php'], ['Gemfile', 'ruby'], ['mix.exs', 'elixir'], ['pubspec.yaml', 'dart'],
  ['Package.swift', 'swift'], ['CMakeLists.txt', 'cpp']
]);
const locks = new Set(['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb', 'deno.lock', 'uv.lock', 'poetry.lock', 'Pipfile.lock', 'Cargo.lock', 'go.sum', 'composer.lock', 'Gemfile.lock', 'mix.lock', 'pubspec.lock', 'Package.resolved', 'packages.lock.json', 'gradle.lockfile']);
const requiredDirectories = ['.pbai4devs', '.vscode', 'src', 'tests', 'infra'];
function agentRoots(root) {
  const file = path.join(root, '.pbai4devs/espelhos.conf');
  if (!present(root, '.pbai4devs/espelhos.conf', false)) return defaultAgents;
  const values = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(line => line.startsWith('agente|')).map(line => line.split('|')[1]);
  const roots = [...new Set(values.filter(value => /^\.[a-z0-9][a-z0-9.-]*$/.test(value) && !['.git', '.pbai4devs', '.agent-tests'].includes(value)))];
  return roots.length ? roots : defaultAgents;
}
const requiredFiles = ['.gitignore', '.gitattributes', '.editorconfig', '.dockerignore', 'Makefile', 'README.md'];
const localCompose = ['infra/compose/compose.local.yml', 'infra/compose/docker-compose.local.yml'];
const normalize = value => value.split(path.sep).join('/');
const commandName = value => /^[A-Za-z0-9_][A-Za-z0-9_:./-]{0,99}$/.test(value);
const present = (root, name, directory) => {
  try {
    let current = root; let item;
    for (const part of name.split('/')) { current = path.join(current, part); item = fs.lstatSync(current); if (item.isSymbolicLink()) return false; }
    return directory ? item.isDirectory() : item.isFile();
  }
  catch { return false; }
};
const inside = candidate => { const relative = path.relative(repository, candidate); return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative); };
const fixturePath = candidate => /^(?:\.agent-tests\/|tmp\/examples\/)/.test(normalize(path.relative(repository, candidate)));

function metadata(root, file) {
  if (!present(root, file, false) || fs.statSync(path.join(root, file)).size > 1024 * 1024) return { fields: {}, documents: {} };
  const text = fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r', '');
  const header = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  const result = { fields: {}, documents: {} }; if (!header) return result;
  let documents = false;
  const scalar = raw => {
    const value = raw.trim();
    if (!value || ['null', '~'].includes(value)) return null;
    if (value.startsWith('"')) { try { return JSON.parse(value); } catch { return null; } }
    return value.startsWith("'") && value.endsWith("'") ? value.slice(1, -1).replaceAll("''", "'") : value;
  };
  for (const line of header.split('\n')) {
    const top = line.match(/^([a-z_]+):\s*(.*)$/);
    if (top) { documents = top[1] === 'documentos'; result.fields[top[1]] = scalar(top[2]); }
    else if (documents) { const item = line.match(/^  ([a-z_]+):\s*(.*)$/); if (item) result.documents[item[1]] = scalar(item[2]); }
  }
  return result;
}

function maturity(root, report) {
  const stateFile = '.pbai4devs/estado/configuracao/ESTADO.md'; const state = metadata(root, stateFile);
  const safeDocument = value => typeof value === 'string' && !path.isAbsolute(value) && !value.includes('\\') && !value.split('/').some(part => !part || ['.', '..', '.git'].includes(part));
  const planning = {};
  for (const name of ['prd', 'ux_ui', 'design']) {
    const file = state.documents[name];
    const exists = safeDocument(file) && /\.md$/i.test(file) && present(root, file, false);
    const status = exists ? metadata(root, file).fields.status : null;
    planning[name] = { path: safeDocument(file) ? file : null, present: Boolean(exists), status: ['rascunho', 'aprovado', 'nao-aplicavel', 'pendente'].includes(status) ? status : null };
  }
  planning.ready = planning.prd.status === 'aprovado' && planning.design.status === 'aprovado' && ['aprovado', 'nao-aplicavel'].includes(planning.ux_ui.status);
  let released = false; const releases = state.documents.releases;
  if (safeDocument(releases) && present(root, releases, true)) {
    const visit = (directory, depth = 0) => {
      for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true }).slice(0, 100)) {
        const file = normalize(path.join(directory, entry.name));
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory() && depth < 2) visit(file, depth + 1);
        else if (entry.isFile() && /^RELEASE\.md$/i.test(entry.name) && ['publicado', 'concluido', 'released'].includes(metadata(root, file).fields.status)) released = true;
      }
    };
    visit(releases);
  }
  const stateValue = value => ['pendente', 'concluido'].includes(value) ? value : null;
  const configuration = { present: present(root, stateFile, false), preparacao: stateValue(state.fields.preparacao), configuracao_tecnica: stateValue(state.fields.configuracao_tecnica) };
  let level = 'preparacao';
  if (Object.values(planning).some(item => item && typeof item === 'object' && item.present)) level = 'descoberta';
  if (planning.ready) level = 'planejado';
  if (report.mode === 'aplicacao-detectada') level = 'implementacao';
  if (report.mode === 'aplicacao-detectada' && planning.ready && report.contract.complete && configuration.configuracao_tecnica === 'concluido') level = released ? 'manutencao' : 'configurado';
  return { level, planning, configuration, released, signals: { application: report.mode === 'aplicacao-detectada', structure: report.contract.complete }, limits: ['Classificacao descritiva; status em arquivos nao substitui aprovacao, testes ou provas de funcionamento.'] };
}

export function inspectProject(root = repository, { check = false } = {}) {
  requireNode();
  root = fs.realpathSync(path.resolve(root));
  if (!fs.statSync(root).isDirectory()) throw new Error('A origem deve ser um diretorio.');
  const excluded = new Set(defaultExcluded);
  const configuredAgents = agentRoots(root); configuredAgents.forEach(name => excluded.add(name));
  const report = { mode: 'agentes-sem-aplicacao', languages: [], manifests: [], lockfiles: [], commands: [], compose: [], dockerfiles: [], sources: [], structure: { present: [], missing: [] }, scan: { maxDepth: 6, truncated: false }, warnings: [] };
  const languages = new Set(); let entries = 0;
  const warning = (file, reason) => report.warnings.push({ file, reason });
  function commands(file, name) {
    if (!['package.json', 'composer.json', 'deno.json', 'deno.jsonc', 'Makefile', 'makefile', 'GNUmakefile', 'pyproject.toml'].includes(name)) return;
    if (fs.statSync(path.join(root, file)).size > 1024 * 1024) { warning(file, 'manifest-grande-demais'); return; }
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    let names = [];
    try {
      if (['package.json', 'composer.json', 'deno.json', 'deno.jsonc'].includes(name)) {
        const data = JSON.parse(text);
        names = Object.keys((name.startsWith('deno.') ? data.tasks : data.scripts) || {});
      } else if (name === 'pyproject.toml') {
        let section = false;
        for (const line of text.split(/\r?\n/)) {
          if (/^\s*\[/.test(line)) section = /^\s*\[(?:project\.scripts|tool\.poetry\.scripts)\]\s*(?:#.*)?$/.test(line);
          else if (section) { const match = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=/); if (match) names.push(match[1]); }
        }
      } else {
        for (const line of text.split(/\r?\n/)) {
          const match = line.match(/^([A-Za-z0-9_][A-Za-z0-9_ ./-]*)\s*:(?!=)/);
          if (match) names.push(...match[1].trim().split(/\s+/));
        }
      }
      names = [...new Set(names.filter(commandName))].sort();
      if (names.length) report.commands.push({ file, names });
    } catch { warning(file, 'manifest-nao-interpretado'); }
  }
  function walk(directory = '', depth = 0) {
    const children = fs.readdirSync(path.join(root, directory), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const item of children) {
      if (++entries > 25000) { report.scan.truncated = true; return; }
      const file = normalize(path.join(directory, item.name));
      if (/^\.playwright/i.test(item.name)) continue;
      if (item.isSymbolicLink()) continue;
      if (item.isDirectory()) {
        if (excluded.has(item.name) || excluded.has(item.name.toLowerCase()) || /^\.?playwright/i.test(item.name)) continue;
        if (depth < report.scan.maxDepth) walk(file, depth + 1); else report.scan.truncated = true;
        continue;
      }
      if (!item.isFile()) continue;
      let language = manifests.get(item.name);
      if (/\.(?:csproj|fsproj|vbproj|sln)$/.test(item.name)) language = 'dotnet';
      if (/^requirements(?:[.-][A-Za-z0-9_-]+)?\.txt$/.test(item.name)) language = 'python';
      if (language) { report.manifests.push(file); languages.add(language); }
      if (locks.has(item.name)) report.lockfiles.push(file);
      if (/^(?:docker-)?compose(?:\.[A-Za-z0-9_-]+)*\.ya?ml$/i.test(item.name)) report.compose.push(file);
      if (/^Dockerfile(?:\.[A-Za-z0-9_-]+)?$/.test(item.name) || /\.Dockerfile$/.test(item.name)) report.dockerfiles.push(file);
      if (/\.(?:[cm]?[jt]sx?|py|go|rs|java|kt|cs|fs|vb|php|rb|ex|exs|dart|swift|c|cpp|cc|h|hpp|vue|svelte)$/.test(item.name) && !/(^|\/)(?:tests?|spec|fixtures)(\/|$)|\.(?:test|spec)\./.test(file) && report.sources.length < 12) report.sources.push(file);
      commands(file, item.name);
    }
  }
  walk();
  for (const [names, directory] of [[[...requiredDirectories, ...configuredAgents], true], [requiredFiles, false]]) {
    for (const name of names) report.structure[present(root, name, directory) ? 'present' : 'missing'].push(name);
  }
  const compose = localCompose.find(name => present(root, name, false));
  report.structure[compose ? 'present' : 'missing'].push(compose || localCompose[0]);
  if (report.manifests.length || report.lockfiles.length || report.sources.length) report.mode = 'aplicacao-detectada';
  report.languages = [...languages].sort();
  report.contract = { checked: check, complete: report.structure.missing.length === 0 };
  report.maturity = maturity(root, report);
  return report;
}

export function main(args = process.argv.slice(2)) {
  requireNode();
  let root = repository; let check = false; args = [...args];
  while (args.length) {
    const option = args.shift();
    if (option === '--check') check = true;
    else if (option === '--root' && args.length) {
      const candidate = path.resolve(repository, args.shift());
      if (!inside(candidate) || !fixturePath(candidate)) throw new Error('--root aceita somente fixtures em .agent-tests/ ou tmp/examples/ do repositorio ativo.');
      root = fs.realpathSync(candidate);
      if (!inside(root) || !fixturePath(root)) throw new Error('A fixture deve permanecer em .agent-tests/ ou tmp/examples/ do repositorio ativo.');
    } else throw new Error('Opcao invalida; use [--check] [--root <fixture-no-repositorio>].');
  }
  const report = inspectProject(root, { check });
  console.log(JSON.stringify(report));
  return check && !report.contract.complete ? 1 : 0;
}

if (isMain(import.meta.url)) {
  try { process.exitCode = main(); }
  catch (error) {
    console.error(JSON.stringify({ error: error.code ? `Falha de leitura (${error.code}).` : error.message }));
    process.exitCode = 2;
  }
}
