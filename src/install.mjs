import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, writeFileSync, readdirSync, mkdirSync, mkdtempSync, realpathSync, renameSync, rmSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { synchronize, isReference } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { isGeneratedOutput } from '../.pbai4devs/scripts/lib/gitignore.mjs';
import { writeAdapterManifest, adapterRoots, normalizeClients, resolveAdapters } from './adapters/index.mjs';
import { packageRoot, packageInfo, statePath, entryNames, begin, end } from './config.mjs';
import { normalizeLanguage, text } from './i18n.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const portable = value => value.split(sep).join('/');
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
const stat = path => { try { return lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };
const ignored = new Set(['.git', '.local', '.cache', 'node_modules', '.agent-tests', 'opencode-loop']);
const reservedTargets = new Set(['.git', 'node_modules', '.pbai4devs']);
const checkTarget = path => {
  if (path.split(sep).some(part => reservedTargets.has(part.toLowerCase()))) fail('E_TARGET', 'Unsafe target directory.');
};

export function resolveTarget(input, cwd = process.cwd()) {
  let target = resolve(cwd, input || '.');
  checkTarget(target);
  // The OS may expose its own temporary directory through a system alias.
  const temporary = resolve(tmpdir()), insideTemporary = relative(temporary, target);
  if (insideTemporary === '' || (!insideTemporary.startsWith(`..${sep}`) && insideTemporary !== '..' && !isAbsolute(insideTemporary))) target = join(realpathSync(temporary), insideTemporary);
  let ancestor = target;
  while (true) {
    const info = stat(ancestor);
    if (info && (info.isSymbolicLink() || !info.isDirectory())) fail('E_TARGET', 'Target must be a real directory, without a symbolic link.');
    const parent = dirname(ancestor); if (parent === ancestor) break; ancestor = parent;
  }
  const missing = []; let parent = target;
  while (!stat(parent)) { missing.unshift(parent.slice(dirname(parent).length + 1)); parent = dirname(parent); }
  const info = stat(parent);
  if (info.isSymbolicLink() || !info.isDirectory()) fail('E_TARGET', 'Target must be a real directory, without a symbolic link.');
  const canonical = join(realpathSync(parent), ...missing);
  checkTarget(canonical);
  return canonical;
}

export function safePath(root, path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || /[\\\x00-\x1f:]/.test(path) || path.split('/').some(part => !part || part === '.' || part === '..')) fail('E_PATH', `Invalid managed path: ${path}`);
  let current = root;
  for (const part of path.split('/')) {
    current = join(current, part);
    if (stat(current)?.isSymbolicLink()) fail('E_SYMLINK', `Symbolic link refused: ${path}`);
  }
  return current;
}

function resourceAllowed(path, directory = false) {
  const parts = path.split('/');
  if (isGeneratedOutput(path, directory) || parts.some(part => ignored.has(part)) || parts[0] === 'adapters' || path === 'estado/agentdevkit.json' || path === '.npmignore') return false;
  if (parts[0] === 'tools') return parts.length === 1 || (directory && parts.length === 2 && !['bin', 'npm-cache'].includes(parts[1])) || (parts.length === 2 && parts[1] === 'README.md') || (parts.length === 3 && ['TOOL.json', 'SCRIPT.mjs', 'README.md'].includes(parts[2]));
  if (parts[0] === 'external-skills') return parts.length === 1 || (parts.length === 2 && ['README.md', 'CATALOG.json'].includes(parts[1]));
  return true;
}

function walk(root, path = '', filter = () => true) {
  const directory = path ? join(root, path) : root;
  if (!existsSync(directory)) return [];
  const files = [];
  for (const name of readdirSync(directory).sort()) {
    const child = path ? `${path}/${name}` : name;
    const info = lstatSync(join(root, child));
    if (info.isSymbolicLink()) fail('E_SYMLINK', `Symbolic link refused: ${child}`);
    if (!filter(child, info.isDirectory())) continue;
    if (info.isDirectory()) files.push(...walk(root, child, filter));
    else if (info.isFile()) files.push(child);
    else fail('E_PATH', `Unsupported file: ${child}`);
  }
  return files;
}

function write(root, path, content) {
  const target = safePath(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content);
}

function read(root, path) {
  const file = safePath(root, path), info = stat(file);
  if (!info) return null;
  if (!info.isFile()) fail('E_PATH', `Expected a file: ${path}`);
  return readFileSync(file);
}

function allowedManaged(path) {
  if (entryNames.includes(path) || path === '.gitignore') return true;
  if (['.agents/skills.json', '.agents/agents.json', '.agents/rules.json'].includes(path)) return true;
  if (path.startsWith('.pbai4devs/')) return resourceAllowed(path.slice('.pbai4devs/'.length));
  return adapterRoots.some(root => path === `${root}/.gitignore` || ['skills', 'agents', 'commands', 'rules', 'instructions', 'prompts'].some(kind => path.startsWith(`${root}/${kind}/`)));
}

export function loadState(root) {
  const content = read(root, statePath); if (content === null) return null;
  let state; try { state = JSON.parse(content); } catch { fail('E_STATE', 'Invalid AgentDevKit state JSON.'); }
  if (state?.schemaVersion !== 1 || !normalizeLanguage(state.language) || typeof state.version !== 'string' || !state.files || typeof state.files !== 'object' || Array.isArray(state.files) || !state.blocks || typeof state.blocks !== 'object' || Array.isArray(state.blocks)) fail('E_STATE', 'Invalid AgentDevKit state.');
  if (state.clients !== undefined) {
    if (!Array.isArray(state.clients)) fail('E_STATE', 'Invalid client selection in AgentDevKit state.');
    try { state.clients = normalizeClients(state.clients); } catch { fail('E_STATE', 'Invalid client selection in AgentDevKit state.'); }
  }
  for (const [path, digest] of [...Object.entries(state.files), ...Object.entries(state.blocks)]) {
    safePath(root, path);
    if (!allowedManaged(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', `Invalid managed state entry: ${path}`);
  }
  return state;
}

function extractBlock(content, first = begin, last = end) {
  const start = content.indexOf(first), finish = content.indexOf(last);
  if (start < 0 && finish < 0) return null;
  if (start < 0 || finish < start || content.indexOf(first, start + first.length) >= 0 || content.indexOf(last, finish + last.length) >= 0) fail('E_BLOCK', 'Invalid or duplicate managed block markers.');
  return content.slice(start, finish + last.length);
}

function blockDigest(path, content) {
  const value = content.toString('utf8');
  const block = path === '.gitignore' ? extractBlock(value, '# BEGIN AGENTDEVKIT', '# END AGENTDEVKIT') : entryNames.includes(path) ? extractBlock(value) : path.endsWith('/.gitignore') ? extractBlock(value, '# BEGIN AGENT IGNORE', '# END AGENT IGNORE') : null;
  return block === null ? null : hash(block);
}

function entryContent(current, template, language, path) {
  const lines = template.replaceAll('\r', '').split('\n');
  const heading = lines.findIndex(line => line.startsWith('# '));
  if (heading < 0) fail('E_TEMPLATE', `Missing title: ${path}`);
  let body = lines.slice(heading + 1).join('\n').trim();
  if (path === 'AGENTS.md') body = `${text(language, 'agentLanguage')}\n\n${body}`;
  const managed = `${begin}\n${body}\n${end}`;
  if (!current) return `${lines.slice(0, heading + 1).join('\n')}\n\n${managed}\n`;
  const source = current.toString('utf8'), previous = extractBlock(source);
  return previous ? source.replace(previous, managed) : `${source}${source.endsWith('\n\n') ? '' : source.endsWith('\n') ? '\n' : '\n\n'}${managed}\n`;
}

function copyResources(source, destination) {
  const files = walk(source, '', resourceAllowed);
  for (const path of files) write(destination, path, readFileSync(join(source, path)));
  return files;
}

export function planInstallation({ target, language = 'pt', mode = 'init', force = false, clients }) {
  const previous = loadState(target);
  if (mode !== 'init' && !previous) fail('E_MISSING', text(language, 'missing'));
  const selected = normalizeClients(clients ?? previous?.clients ?? ['all']);
  const active = resolveAdapters(selected);
  const changingClients = clients !== undefined || mode === 'agents';
  const stage = mkdtempSync(join(tmpdir(), 'agentdevkit-'));
  try {
    const existing = copyResources(join(target, '.pbai4devs'), join(stage, '.pbai4devs'));
    const bundled = mode === 'init' || mode === 'update' ? copyResources(join(packageRoot, '.pbai4devs'), join(stage, '.pbai4devs')) : [];
    const supplied = new Set(bundled);
    const internal = new Set(['catalog.json', 'skills.json', 'agents.json', 'rules.json', 'espelhos.conf', '.gitignore', 'estado/README.md']);
    if (bundled.length) for (const path of Object.keys(previous?.files || {})) {
      if (path.startsWith('.pbai4devs/') && !supplied.has(path.slice(11)) && !internal.has(path.slice(11))) rmSync(safePath(stage, path), { force: true });
    }
    for (const root of active.roots) {
      const content = read(target, `${root}/.gitignore`);
      if (content) write(stage, `${root}/.gitignore`, content);
    }
    const ownIgnore = read(target, '.pbai4devs/.gitignore');
    if (ownIgnore) write(stage, '.pbai4devs/.gitignore', ownIgnore);
    writeAdapterManifest(stage, { clients: selected });
    synchronize({ root: stage, force: true, output() {} });
    for (const name of active.entrypoints) write(stage, name, entryContent(read(target, name), readFileSync(join(packageRoot, '.pbai4devs/templates/entrypoints', name), 'utf8'), language, name));
    const ignoreTemplate = readFileSync(join(packageRoot, '.pbai4devs/templates/gitignore/TEMPLATE.md'), 'utf8').match(/```gitignore\r?\n([\s\S]*?)```/)?.[1];
    if (!ignoreTemplate) fail('E_TEMPLATE', 'Missing root gitignore template.');
    const rootIgnore = read(target, '.gitignore')?.toString('utf8') || '';
    const oldIgnore = extractBlock(rootIgnore, '# BEGIN AGENTDEVKIT', '# END AGENTDEVKIT');
    const ignoreBlock = `# BEGIN AGENTDEVKIT\n${ignoreTemplate.trim()}\n# END AGENTDEVKIT`;
    write(stage, '.gitignore', oldIgnore ? rootIgnore.replace(oldIgnore, ignoreBlock) : `${rootIgnore}${rootIgnore && !rootIgnore.endsWith('\n') ? '\n' : ''}${ignoreBlock}\n`);
    if (!read(target, 'README.md')) write(stage, 'README.md', `---\ndescription: ${JSON.stringify(text(language, 'readme'))}\nlanguage: ${language}\n---\n\n# ${text(language, 'project')}\n\n${text(language, 'readme')}\n`);
    if (!existsSync(join(stage, '.pbai4devs/estado/README.md'))) write(stage, '.pbai4devs/estado/README.md', `---\ndescription: AgentDevKit state.\n---\n\n# AgentDevKit\n\n${text(language, 'state')}\n`);
    const unknown = new Set(existing.filter(path => !supplied.has(path) && !previous?.files[`.pbai4devs/${path}`] && !internal.has(path)));
    const paths = walk(stage, '', path => !path.split('/').includes('.agent-tests')).filter(path => !path.startsWith('.pbai4devs/') || !unknown.has(path.slice(11)));
    const desired = new Map(paths.map(path => [path, readFileSync(join(stage, path))]));
    const manifest = { schemaVersion: 1, version: bundled.length ? packageInfo.version : previous.version, language, files: {}, blocks: {} };
    if (mode !== 'sync' || clients !== undefined || previous?.clients !== undefined) manifest.clients = selected;
    for (const [path, content] of desired) {
      if (path === 'README.md') continue;
      const block = blockDigest(path, content);
      if (block) manifest.blocks[path] = block;
      else manifest.files[path] = hash(content);
    }
    desired.set(statePath, Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
    const changes = [], conflicts = [];
    for (const [path, content] of desired) {
      const current = read(target, path);
      if (current?.equals(content)) continue;
      const managed = previous?.blocks[path] ? blockDigest(path, current || Buffer.alloc(0)) === previous.blocks[path] : previous?.files[path] ? hash(current || '') === previous.files[path] : false;
      const appendBlock = entryNames.includes(path) || path === '.gitignore' || path.endsWith('/.gitignore');
      const conflict = current && path !== statePath && !managed && !appendBlock;
      const changedBlock = current && previous?.blocks[path] && !managed;
      if (conflict || changedBlock) conflicts.push(path);
      changes.push({ path, action: current ? 'update' : 'create', content, beforeHash: current ? hash(current) : null });
    }
    for (const [path, digest] of Object.entries(previous?.files || {})) if (!desired.has(path)) {
      const current = read(target, path); if (!current) continue;
      if (hash(current) !== digest) conflicts.push(path);
      changes.push({ path, action: 'remove', content: null, beforeHash: hash(current) });
    }
    for (const [path, digest] of Object.entries(previous?.blocks || {})) if (!desired.has(path)) {
      const current = read(target, path); if (!current) continue;
      const source = current.toString('utf8');
      const block = path.endsWith('/.gitignore') ? extractBlock(source, '# BEGIN AGENT IGNORE', '# END AGENT IGNORE') : extractBlock(source);
      if (!block || hash(block) !== digest) conflicts.push(path);
      if (!block) continue;
      let content = source.replace(block, '');
      if (entryNames.includes(path)) {
        const template = readFileSync(join(packageRoot, '.pbai4devs/templates/entrypoints', path), 'utf8');
        if (source === entryContent(null, template, previous.language, path)) content = '';
      }
      changes.push({ path, action: content.trim() ? 'update' : 'remove', content: content.trim() ? Buffer.from(content) : null, beforeHash: hash(current) });
    }
    for (const root of changingClients ? [] : active.roots) for (const path of walk(join(target, root), '', path => !path.split('/').some(part => ignored.has(part)))) {
      if (!['skills', 'agents', 'commands', 'rules', 'instructions', 'prompts'].includes(path.split('/')[0])) continue;
      const full = `${root}/${path}`; if (desired.has(full) || changes.some(change => change.path === full)) continue;
      const current = read(target, full), source = current.toString('utf8');
      if (!(source.includes('<!-- gerado: sincronizar-agentes -->') || source.startsWith('# gerado: sincronizar-agentes\n'))) continue;
      if (!isReference(source)) conflicts.push(full);
      changes.push({ path: full, action: 'remove', content: null, beforeHash: hash(current) });
    }
    const legacy = '.pbai4devs/adapters/README.md', legacyContent = read(target, legacy);
    if (legacyContent) {
      const known = legacyContent.toString('utf8').includes('# Adaptadores') && /Antigravity|metadados/.test(legacyContent.toString('utf8'));
      if (!known) conflicts.push(legacy);
      changes.push({ path: legacy, action: 'remove', content: null, beforeHash: hash(legacyContent) });
    }
    const retiredRoots = adapterRoots.filter(root => !active.roots.includes(root) && changes.some(change => change.action === 'remove' && change.path.startsWith(`${root}/`) && (previous?.files[change.path] || previous?.blocks[change.path])));
    return { target, language, mode, changes, conflicts: [...new Set(conflicts)].sort(), canApply: !conflicts.length || force, manifest, retiredRoots };
  } finally { rmSync(stage, { recursive: true, force: true }); }
}

export function applyPlan(plan) {
  if (!plan.canApply) fail('E_CONFLICT', text(plan.language, 'conflict'));
  if (!plan.changes.length) return { changed: false, backup: null };
  const { target } = plan;
  const backup = `.agent-tests/agentdevkit/backups/${Date.now()}-${randomUUID()}`;
  safePath(target, backup);
  for (const change of plan.changes) safePath(target, change.path);
  const before = new Map(plan.changes.map(change => [change.path, read(target, change.path)]));
  for (const change of plan.changes) if ((before.get(change.path) ? hash(before.get(change.path)) : null) !== change.beforeHash) fail('E_CHANGED', `File changed after planning: ${change.path}`);
  for (const [path, content] of before) if (content) write(target, `${backup}/${path}`, content);
  const applied = [];
  try {
    for (const change of plan.changes) {
      const file = safePath(target, change.path);
      if (change.content === null) rmSync(file, { force: true });
      else {
        mkdirSync(dirname(file), { recursive: true });
        const temporary = `${file}.agentdevkit-${randomUUID()}`;
        try { writeFileSync(temporary, change.content, { flag: 'wx' }); renameSync(temporary, file); }
        finally { rmSync(temporary, { force: true }); }
      }
      applied.push(change.path);
    }
  } catch (error) {
    for (const path of applied.reverse()) {
      const content = before.get(path);
      if (content) write(target, path, content); else rmSync(safePath(target, path), { force: true });
    }
    throw error;
  }
  const legacy = '.pbai4devs/adapters/README.md';
  const removed = plan.changes.filter(change => change.action === 'remove' && (allowedManaged(change.path) || change.path === legacy));
  const parents = new Set(removed.map(change => portable(dirname(change.path))));
  if (removed.some(change => change.path === legacy)) {
    parents.add('.pbai4devs/adapters/antigravity');
    parents.add('.pbai4devs/adapters/antigravity/agents');
  }
  for (let parent of [...parents].sort((left, right) => right.length - left.length)) {
    const boundary = parent.startsWith('.pbai4devs/') ? '.pbai4devs' : adapterRoots.find(root => parent.startsWith(`${root}/`));
    while (boundary && parent.startsWith(`${boundary}/`)) {
      const directory = safePath(target, parent);
      if (!stat(directory)?.isDirectory() || readdirSync(directory).length) break;
      try { rmdirSync(directory); }
      catch (error) { if (['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) break; throw error; }
      parent = portable(dirname(parent));
    }
  }
  for (const root of plan.retiredRoots || []) {
    if (!adapterRoots.includes(root)) continue;
    const directory = safePath(target, root);
    if (!stat(directory)?.isDirectory()) continue;
    try { if (readdirSync(directory).length === 0) rmdirSync(directory); }
    catch (error) { if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error; }
  }
  return { changed: true, backup: [...before.values()].some(Boolean) ? backup : null };
}

export function inspect(target) {
  const state = loadState(target);
  if (!state) return { installed: false, issues: [{ code: 'missing', path: statePath }] };
  const issues = [];
  for (const [path, digest] of Object.entries(state.files)) {
    const content = read(target, path);
    if (!content || hash(content) !== digest) issues.push({ code: content ? 'modified' : 'missing', path });
  }
  for (const [path, digest] of Object.entries(state.blocks)) {
    const content = read(target, path);
    if (!content || blockDigest(path, content) !== digest) issues.push({ code: content ? 'modified' : 'missing', path });
  }
  return { installed: true, version: state.version, language: state.language, issues };
}
