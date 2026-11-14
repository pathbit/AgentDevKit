#!/usr/bin/env node
// Inventario somente leitura; nomes e caminhos, nunca valores de configuracao.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { requireNode, isMain } from '../lib/runtime.mjs';
import { stateDirectory } from '../lib/state-path.mjs';

const repository = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
const defaultAgents = ['.agents', '.agent', '.gemini', '.claude', '.codex', '.cursor', '.github', '.opencode'];
const defaultExcluded = ['.git', '.pbai4devs', '.agent-tests', ...defaultAgents, '.vscode', 'node_modules', 'vendor', 'target', 'dist', 'build', 'bin', 'obj', '.venv', 'venv', '.cache', '.next', '.nuxt', 'coverage', 'test-results', 'playwright-report', 'blob-report', 'tmp', 'temp', 'examples'];
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
const fixturePath = candidate => /^(?:\.agent-tests\/|tmp\/examples\/|examples\/generated\/)/.test(normalize(path.relative(repository, candidate)));

// Rechecking is a conservative race detection, not an atomic openat traversal.
function pathIdentity(root, file = '') {
  try {
    let current = root; const result = [], parts = file ? file.split('/') : [];
    for (const [index, part] of ['', ...parts].entries()) {
      if (part) current = path.join(current, part);
      const item = fs.lstatSync(current);
      if (item.isSymbolicLink() || (index < parts.length && !item.isDirectory())) return null;
      result.push({ dev: item.dev, ino: item.ino, mode: item.mode, size: item.size, directory: item.isDirectory() });
    }
    return result;
  } catch { return null; }
}
const sameIdentity = (left, right) => left && right && left.length === right.length
  && left.every((item, index) => item.dev === right[index].dev && item.ino === right[index].ino && item.mode === right[index].mode);

function boundedEntries(folder, limit, verify = () => true) {
  const handle = fs.opendirSync(folder), entries = [];
  try {
    if (!verify()) return { entries: [], truncated: true, changed: true };
    while (true) {
      const entry = handle.readSync();
      if (!entry) return verify() ? { entries, truncated: false } : { entries: [], truncated: true, changed: true };
      if (entries.length >= limit) return verify() ? { entries, truncated: true } : { entries: [], truncated: true, changed: true };
      entries.push(entry);
    }
  } finally { handle.closeSync(); }
}

function stableDirectory(root, directory, limit) {
  const identity = pathIdentity(root, directory);
  if (!identity?.at(-1).directory) return { entries: [], truncated: true, changed: true, verify: () => false };
  const verify = () => sameIdentity(identity, pathIdentity(root, directory));
  return { ...boundedEntries(path.join(root, directory), limit, verify), verify };
}

function metadata(root, file) {
  const empty = { fields: {}, documents: {}, text: null };
  const identity = () => pathIdentity(root, file);
  let descriptor, text;
  try {
    const name = path.join(root, file), ancestors = identity();
    if (!ancestors || !sameIdentity(ancestors, identity())) return empty;
    const before = ancestors.at(-1);
    if (before.size > 1024 * 1024) return empty;
    descriptor = fs.openSync(name, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const opened = fs.fstatSync(descriptor);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino || opened.size !== before.size || !sameIdentity(ancestors, identity())) return empty;
    const buffer = Buffer.alloc(opened.size + 1); let length = 0;
    while (length < buffer.length) {
      const count = fs.readSync(descriptor, buffer, length, buffer.length - length, length);
      if (!count) break;
      length += count;
    }
    const after = fs.fstatSync(descriptor);
    if (length !== opened.size || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs || !sameIdentity(ancestors, identity())) return empty;
    text = buffer.subarray(0, length).toString('utf8').replaceAll('\r', '');
  } catch { return empty; }
  finally { if (descriptor !== undefined) fs.closeSync(descriptor); }
  const header = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  const result = { fields: {}, documents: {}, text }; if (!header) return result;
  let documents = false, invalidDocuments = false;
  const seen = new Set(), duplicates = new Set(), seenDocuments = new Set(), duplicateDocuments = new Set();
  const scalar = raw => {
    const value = raw.trim();
    if (!value || ['null', '~'].includes(value)) return null;
    if (value.startsWith('"')) { try { return JSON.parse(value); } catch { return null; } }
    return value.startsWith("'") && value.endsWith("'") ? value.slice(1, -1).replaceAll("''", "'") : value;
  };
  for (const line of header.split('\n')) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const top = line.match(/^(?:([\p{L}_][\p{L}\p{N}_.-]*)|"([^"\n]+)"|'([^'\n]+)'):\s*(.*)$/u);
    if (top) {
      const key = top[1] || top[2] || top[3];
      if (key.includes('\\')) return { ...empty, text };
      if (seen.has(key)) duplicates.add(key);
      seen.add(key); result.fields[key] = duplicates.has(key) ? null : scalar(top[4]);
      if (key === 'documentos' && duplicates.has(key)) { invalidDocuments = true; result.documents = {}; }
      documents = key === 'documentos' && !invalidDocuments && (!top[4].trim() || ['null', '~'].includes(top[4].trim()));
    } else if (!/^\s/.test(line)) return { ...empty, text };
    else if (documents) {
      const item = line.match(/^  (?:([\p{L}_][\p{L}\p{N}_.-]*)|"([^"\n]+)"|'([^'\n]+)'):\s*(.*)$/u);
      if (item) {
        const key = item[1] || item[2] || item[3];
        if (key.includes('\\')) { invalidDocuments = true; result.documents = {}; documents = false; continue; }
        if (seenDocuments.has(key)) duplicateDocuments.add(key);
        seenDocuments.add(key); result.documents[key] = duplicateDocuments.has(key) ? null : scalar(item[4]);
      } else if (/^  \S/.test(line)) { invalidDocuments = true; result.documents = {}; documents = false; }
    }
  }
  return result;
}

// The configured specs directory contains <slug>/SPEC.md. Refuse ambiguous
// layouts instead of guessing which increment or declared status to use.
function configuredSpecs(root, directory) {
  const result = { path: directory, present: false, complete: false, items: [] };
  if (!directory) return result;
  let current = root;
  for (const component of directory.split('/')) {
    current = path.join(current, component);
    try {
      const info = fs.lstatSync(current);
      if (info.isSymbolicLink() || !info.isDirectory()) return result;
    } catch (error) {
      if (error.code === 'ENOENT') result.complete = true;
      return result;
    }
  }
  result.present = true;
  const incomplete = () => { result.items = []; return result; };
  let scanned = 0;
  function entriesAt(folder) {
    const relative = normalize(path.relative(root, folder));
    const result = stableDirectory(root, relative, Math.min(200, 500 - scanned));
    scanned += result.entries.length;
    return result.truncated ? null : result.entries;
  }
  try {
    const entries = entriesAt(current);
    if (!entries) return incomplete();
    for (const entry of entries) {
      if (/^readme(?:\.md)?$/i.test(entry.name) && !entry.isSymbolicLink()) continue;
      if (['.git', '.pbai4devs', '.agent-tests', 'node_modules'].includes(entry.name.toLowerCase())) return incomplete();
      if (!entry.isDirectory() || entry.isSymbolicLink()) return incomplete();
      const folder = `${directory}/${entry.name}`;
      if (!present(root, folder, true)) return incomplete();
      const children = entriesAt(path.join(root, folder));
      if (!children) return incomplete();
      const names = children.filter(item => /^spec\.md$/i.test(item.name));
      if (names.length !== 1 || !names[0].isFile() || names[0].isSymbolicLink()) return incomplete();
      const file = `${folder}/${names[0].name}`;
      if (!present(root, file, false)) return incomplete();
      const document = metadata(root, file);
      if (document.text === null) return incomplete();
      result.items.push({ path: file, status: ['rascunho', 'pendente', 'aprovado'].includes(document.fields.status) ? document.fields.status : null });
      if (result.items.length > 1) return incomplete();
    }
    if (!present(root, directory, true)) return incomplete();
    result.complete = true;
  } catch { return incomplete(); }
  return result;
}

function referenceState(roadmap, roadmapFile, specFile) {
  if (!roadmap || !roadmapFile) return { linked: false, roadmapState: 'unknown' };
  // Examples and orphan reference definitions do not select an increment.
  const lines = []; let fence = null;
  const body = roadmap.replace(/^---\n[^]*?\n---(?:\n|$)/, '').replace(/<!--[^]*?-->/g, '');
  for (const line of body.split('\n')) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !line.slice(marker[0].length).trim()) fence = null;
    } else if (marker) fence = marker[1];
    else lines.push(line.replace(/(`+)[^`\n]*?\1/g, ''));
  }
  const normalizeLabel = label => label.trim().replace(/\s+/g, ' ').toLowerCase();
  const definitions = new Map();
  for (const line of lines) {
    const match = line.match(/^ {0,3}\[([^\]]+)\]:[ \t]*(?:<([^>\n]+)>|(\S+))(?:[ \t]+(?:"[^"\n]*"|'[^'\n]*'))?[ \t]*$/);
    if (match) { const label = normalizeLabel(match[1]); definitions.set(label, [...(definitions.get(label) || []), match[2] || match[3]]); }
  }
  const references = [], ancestry = [];
  for (const line of lines) {
    const list = line.match(/^([ \t]*)(?:[-+*]|\d+[.)])\s+(.*)$/);
    const marker = list?.[2].match(/^\[([ xX-])\](?:\s|$)/);
    const closed = /(?:^|[^\p{L}])(?:cancelad[ao]s?|conclu[ií]d[ao]s?|publicad[ao]s?|finalizad[ao]s?|descartad[ao]s?|cancelled|completed|published)(?=$|[^\p{L}])/iu.test(line);
    let state = 'unknown';
    if (list) {
      const indent = list[1].length;
      while (ancestry.length && ancestry.at(-1).indent >= indent) ancestry.pop();
      const own = closed || marker && /x/i.test(marker[1]) ? 'closed' : marker?.[1] === ' ' ? 'open' : marker?.[1] === '-' ? 'in-progress' : 'unknown';
      state = ancestry.some(item => item.state === 'closed') ? 'closed' : /\t/.test(list[1]) || ancestry.some(item => item.state === 'unknown') ? 'unknown' : own;
      ancestry.push({ indent, state });
    } else if (line.trim() && !/^\s/.test(line)) ancestry.length = 0;
    for (const match of line.matchAll(/(?<![!\\])\[[^\]\n]+\]\(\s*(?:<([^>\n]+)>|([^\s)]+))(?:\s+(?:"[^"\n]*"|'[^'\n]*'))?\s*\)/g)) references.push({ destination: match[1] || match[2], state });
    for (const match of line.matchAll(/(?<![!\\])\[([^\]\n]+)\]\[([^\]\n]*)\]/g)) {
      const label = normalizeLabel(match[2] || match[1]);
      if (definitions.get(label)?.length === 1) references.push({ destination: definitions.get(label)[0], state });
    }
  }
  const matches = references.filter(({ destination }) => {
    try {
      const value = decodeURIComponent(destination).split(/[?#]/, 1)[0];
      if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/|\\)/i.test(value) || value.includes('\\')) return false;
      return path.posix.resolve('/', path.posix.dirname(roadmapFile), value) === '/' + specFile;
    } catch { return false; }
  });
  if (matches.length !== 1) return { linked: matches.length > 0, roadmapState: matches.length ? 'ambiguous' : 'unknown' };
  return { linked: true, roadmapState: matches[0].state };
}

function maturity(root, report) {
  const stateFile = `${stateDirectory(root)}/configuracao/ESTADO.md`; const state = metadata(root, stateFile);
  const safeDocument = value => typeof value === 'string' && !path.isAbsolute(value) && !/[\\\x00-\x1f\x7f:]/.test(value) && !value.split('/').some(part => !part || ['.', '..', '.git'].includes(part.toLowerCase()));
  const planning = {};
  for (const name of ['prd', 'ux_ui', 'design']) {
    const file = state.documents[name];
    const exists = safeDocument(file) && /\.md$/i.test(file) && present(root, file, false);
    const status = exists ? metadata(root, file).fields.status : null;
    planning[name] = { path: safeDocument(file) ? file : null, present: Boolean(exists), status: ['rascunho', 'aprovado', 'nao-aplicavel', 'pendente'].includes(status) ? status : null };
  }
  planning.ready = planning.prd.status === 'aprovado' && planning.design.status === 'aprovado' && ['aprovado', 'nao-aplicavel'].includes(planning.ux_ui.status);
  const roadmapPath = safeDocument(state.documents.roadmap) && /\.md$/i.test(state.documents.roadmap) ? state.documents.roadmap : null;
  const roadmapPresent = Boolean(roadmapPath && present(root, roadmapPath, false));
  const roadmapDocument = roadmapPresent ? metadata(root, roadmapPath) : { fields: {}, text: null };
  planning.roadmap = { path: roadmapPath, present: roadmapPresent, status: ['pendente', 'rascunho', 'planejado', 'aprovado'].includes(roadmapDocument.fields.status) ? roadmapDocument.fields.status : null };
  const specsPath = safeDocument(state.documents.specs) ? state.documents.specs : null;
  planning.specs = configuredSpecs(root, specsPath);
  for (const spec of planning.specs.items) Object.assign(spec, referenceState(roadmapDocument.text, roadmapPath, spec.path));
  let released = false, releasesComplete = true; const releases = state.documents.releases;
  if (safeDocument(releases) && present(root, releases, true)) {
    const visit = (directory, depth = 0) => {
      let listing;
      try { listing = stableDirectory(root, directory, 100); }
      catch { releasesComplete = false; return; }
      if (listing.truncated) releasesComplete = false;
      for (const entry of listing.entries) {
        if (!listing.verify()) { releasesComplete = false; return; }
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
  return { level, planning, configuration, released, releasesComplete, signals: { application: report.mode === 'aplicacao-detectada', structure: report.contract.complete }, limits: ['Classificacao descritiva; status em arquivos nao substitui aprovacao, testes ou provas de funcionamento.'] };
}

const documentRoles = new Set(['readme', 'contribuicao', 'changelog', 'seguranca', 'adrs', 'prd', 'ux_ui', 'design', 'roadmap', 'releases', 'specs', 'tarefas']);
const documentLimits = { maxDepth: 12, maxEntries: 25000, maxFiles: 2000, maxFileBytes: 2 * 1024 * 1024, maxTotalBytes: 16 * 1024 * 1024 };
const documentClients = [...defaultAgents, '.zcode', '.zai', '.kimi', '.kimi-code', '.minimax', '.mimocode', '.dsh'];
const documentName = name => /\.(?:md|mdx|rst|adoc)$/i.test(name) || /^(?:readme|contributing|changelog|history|security|licen[cs]e|copying|notice|authors|code_of_conduct|architecture|design|roadmap)(?:\.txt)?$/i.test(name);
const documentRole = file => {
  const name = path.posix.basename(file).toLowerCase();
  if (/^readme(?:\.|$)/.test(name)) return 'readme';
  if (/^(?:agents|claude|gemini|copilot-instructions)\.md$/.test(name)) return 'instructions';
  if (/^(?:licen[cs]e|copying|notice)(?:\.|$)/.test(name)) return 'license';
  if (/^code_of_conduct(?:\.|$)/.test(name)) return 'conduct';
  if (/^contribut/.test(name)) return 'contribution';
  if (/^security(?:\.|$)/.test(name)) return 'security';
  if (/^(?:changelog|history)(?:\.|$)/.test(name)) return 'changelog';
  if (/(^|\/)(?:adr|adrs|decisions|rfcs)(\/|$)/i.test(file) || /^adr[-_.]/.test(name)) return 'decision';
  if (/(^|\/)(?:prd|product|requisitos)(?:\.|\/|$)/i.test(file)) return 'product';
  if (/(?:architecture|arquitetura|design)(?:\.|\/|$)/i.test(file)) return 'design';
  if (/roadmap/i.test(name)) return 'roadmap';
  if (/(^|\/)(?:spec|specs|specifications)(\/|$)/i.test(file)) return 'spec';
  return 'document';
};

// Names, kinds and bounded hashes only. A guessed role is never an approval.
export function inspectDocumentation(root, limits = {}) {
  root = fs.realpathSync(path.resolve(root));
  const bounds = { ...documentLimits, ...limits };
  for (const [key, value] of Object.entries(bounds)) {
    if (!(key in documentLimits) || !Number.isSafeInteger(value) || value < 0 || value > documentLimits[key]) throw new Error('Limite documental invalido.');
  }
  const ignored = new Set([...defaultExcluded, ...documentClients, ...agentRoots(root)].filter(name => !['examples', '.github'].includes(name)).map(name => name.toLowerCase()));
  const excludedPaths = ['examples/generated', ...['skills', 'agents', 'commands', 'rules', 'instructions', 'prompts'].map(name => `.github/${name}`)];
  const files = new Map();
  const configured = [];
  const warnings = [];
  const scan = { ...bounds, entries: 0, bytesRead: 0, bytesHashed: 0, truncated: false };
  const warn = (file, reason) => warnings.push({ file, reason });
  const excludedDocument = file => file.split('/').some(name => ignored.has(name.toLowerCase()) || /^\.?playwright/i.test(name))
    || excludedPaths.some(prefix => file.toLowerCase() === prefix || file.toLowerCase().startsWith(prefix + '/'));
  const safeDocument = value => typeof value === 'string' && value.length > 0 && !path.isAbsolute(value) && !/[\\\x00-\x1f\x7f:]/.test(value)
    && !value.split('/').some(part => !part || part === '.' || part === '..');
  const locate = file => {
    let current = root;
    const parts = file.split('/');
    for (const [index, part] of parts.entries()) {
      current = path.join(current, part);
      let item;
      try { item = fs.lstatSync(current); }
      catch (error) { if (['ENOENT', 'ENOTDIR'].includes(error.code)) return { kind: 'missing' }; throw error; }
      if (item.isSymbolicLink()) return { kind: 'symbolic-link', boundary: parts.slice(0, index + 1).join('/'), item };
      if (index < parts.length - 1 && !item.isDirectory()) return { kind: 'missing' };
      if (index === parts.length - 1) return { kind: item.isFile() ? 'file' : item.isDirectory() ? 'directory' : 'unsupported', item };
    }
  };
  function boundedHash(file, expected) {
    if (expected.size > bounds.maxFileBytes || expected.size > bounds.maxTotalBytes - scan.bytesRead) {
      scan.truncated = true; warn(file, 'hash-byte-limit'); return;
    }
    let descriptor;
    try {
      const identity = pathIdentity(root, file);
      if (!identity || !sameIdentity(identity, pathIdentity(root, file))) { warn(file, 'changed-during-read'); return; }
      descriptor = fs.openSync(path.join(root, file), fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
      const before = fs.fstatSync(descriptor);
      if (!before.isFile() || before.dev !== expected.dev || before.ino !== expected.ino || before.size !== expected.size
        || before.mtimeMs !== expected.mtimeMs || before.ctimeMs !== expected.ctimeMs || !sameIdentity(identity, pathIdentity(root, file))) { warn(file, 'changed-during-read'); return; }
      const buffer = Buffer.alloc(Math.min(before.size + 1, bounds.maxTotalBytes - scan.bytesRead));
      let length = 0;
      while (length < buffer.length) {
        const read = fs.readSync(descriptor, buffer, length, buffer.length - length, length);
        if (!read) break;
        length += read;
        scan.bytesRead += read;
      }
      const after = fs.fstatSync(descriptor);
      if (length !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs || !sameIdentity(identity, pathIdentity(root, file))) {
        warn(file, 'changed-during-read'); return;
      }
      scan.bytesHashed += length;
      return createHash('sha256').update(buffer.subarray(0, length)).digest('hex');
    } catch (error) { warn(file, error.code === 'ELOOP' ? 'symbolic-link-during-read' : 'unreadable-document'); }
    finally { if (descriptor !== undefined) fs.closeSync(descriptor); }
  }
  function add(file, found, role) {
    if (files.has(file)) {
      if (role) { const entry = files.get(file); entry.origin = 'configured'; entry.configuredAs = [...new Set([...(entry.configuredAs || []), role])].sort(); }
      return;
    }
    if (files.size >= bounds.maxFiles) { scan.truncated = true; warn(file, 'file-limit'); return; }
    const inferredRole = found.kind === 'symbolic-link' && !documentName(path.posix.basename(file)) ? 'unclassified' : documentRole(file);
    const entry = { path: file, kind: found.kind, role: inferredRole, origin: role ? 'configured' : 'inferred', bytes: found.item.size };
    if (role) entry.configuredAs = [role];
    if (found.kind === 'symbolic-link') warn(file, 'symbolic-link-not-inspected');
    if (found.kind === 'file') {
      const digest = boundedHash(file, found.item);
      if (digest) entry.sha256 = digest;
    }
    files.set(file, entry);
  }
  function walk(directory = '', depth = 0, role) {
    if (directory) {
      const found = locate(directory);
      if (found.kind !== 'directory') { if (found.kind === 'symbolic-link') add(found.boundary, found, role); return; }
    }
    let children, listing;
    try {
      listing = stableDirectory(root, directory, Math.max(0, bounds.maxEntries - scan.entries));
      if (listing.changed) { scan.truncated = true; warn(directory || '.', 'changed-during-read'); return; }
      if (listing.truncated) scan.truncated = true;
      children = listing.entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    }
    catch { warn(directory || '.', 'unreadable-directory'); return; }
    // Discard a listing if the directory became a link while being inspected.
    if (directory && locate(directory).kind !== 'directory') { warn(directory, 'changed-during-read'); return; }
    for (const child of children) {
      if (scan.entries >= bounds.maxEntries || files.size >= bounds.maxFiles) { scan.truncated = true; return; }
      scan.entries++;
      const file = directory ? `${directory}/${child.name}` : child.name;
      if (excludedDocument(file)) continue;
      if (!listing.verify()) { scan.truncated = true; warn(directory || '.', 'changed-during-read'); return; }
      const found = locate(file);
      if (found.kind === 'directory') {
        if (depth < bounds.maxDepth) walk(file, depth + 1, role);
        else { scan.truncated = true; warn(file, 'depth-limit'); }
      } else if (found.kind === 'file' && documentName(child.name)) add(file, found, role);
      else if (found.kind === 'symbolic-link') add(found.boundary, found, role);
    }
  }
  const declared = metadata(root, `${stateDirectory(root)}/configuracao/ESTADO.md`).documents;
  for (const [role, file] of Object.entries(declared)) {
    if (!documentRoles.has(role)) continue;
    if (!safeDocument(file)) { if (file !== null) warn(null, 'invalid-configured-path'); continue; }
    if (excludedDocument(file)) { configured.push({ role, path: file, kind: 'excluded' }); continue; }
    const found = locate(file);
    configured.push({ role, path: file, kind: found.kind });
    if (found.kind === 'directory') walk(file, 0, role);
    else if (found.kind === 'file' && documentName(path.posix.basename(file))) add(file, found, role);
    else if (found.kind === 'file') warn(file, 'configured-path-not-document');
    else if (found.kind === 'symbolic-link') add(found.boundary, found, role);
  }
  walk();
  return {
    files: [...files.values()].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
    configured, scan: { ...scan, complete: !scan.truncated && warnings.length === 0 }, warnings,
    exclusions: { directories: [...ignored].sort(), paths: excludedPaths, prefixes: ['playwright', '.playwright'] },
    limits: ['Papeis inferidos por nome; confirme o conteudo antes de propor alteracoes.', 'Links simbolicos sao opacos; destinos nao sao lidos.', 'O inventario nao cria documentos nem comprova aprovacao ou completude.'],
  };
}

export function inspectProject(root = repository, { check = false, documentationLimits } = {}) {
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
    const identity = pathIdentity(root, file);
    if (!identity) { warning(file, 'manifest-nao-inspecionado'); return; }
    if (identity.at(-1).size > 1024 * 1024) { warning(file, 'manifest-grande-demais'); return; }
    const text = metadata(root, file).text;
    if (text === null) { warning(file, 'manifest-nao-inspecionado'); return; }
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
    const listing = stableDirectory(root, directory, Math.max(0, 25000 - entries));
    if (listing.changed) { report.scan.truncated = true; warning(directory || '.', 'changed-during-read'); return; }
    if (listing.truncated) report.scan.truncated = true;
    const children = listing.entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const item of children) {
      if (++entries > 25000) { report.scan.truncated = true; return; }
      const file = normalize(path.join(directory, item.name));
      if (/^\.playwright/i.test(item.name)) continue;
      if (item.isSymbolicLink()) continue;
      if (item.isDirectory()) {
        if (excluded.has(item.name) || excluded.has(item.name.toLowerCase()) || /^\.?playwright/i.test(item.name)) continue;
        if (!listing.verify()) { report.scan.truncated = true; warning(directory || '.', 'changed-during-read'); return; }
        if (depth < report.scan.maxDepth) walk(file, depth + 1); else report.scan.truncated = true;
        continue;
      }
      if (!item.isFile()) continue;
      if (!listing.verify()) { report.scan.truncated = true; warning(directory || '.', 'changed-during-read'); return; }
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
  report.documentation = inspectDocumentation(root, documentationLimits);
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
      if (!inside(candidate) || !fixturePath(candidate)) throw new Error('--root aceita somente fixtures em examples/generated/, .agent-tests/ ou tmp/examples/ do repositorio ativo.');
      root = fs.realpathSync(candidate);
      if (!inside(root) || !fixturePath(root)) throw new Error('A fixture deve permanecer em examples/generated/, .agent-tests/ ou tmp/examples/ do repositorio ativo.');
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
