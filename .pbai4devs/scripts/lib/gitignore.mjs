import { createHash, randomUUID } from 'node:crypto';
import { closeSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Atualiza apenas o bloco reservado; regras externas permanecem byte a byte.
export const ignoreBegin = '# BEGIN AGENT IGNORE';
export const ignoreEnd = '# END AGENT IGNORE';

const outputDirectories = new Set(['.git', '.agent-tests', '.cache', 'node_modules', '__pycache__', 'opencode-loop', 'sessions', 'logs', 'testresults', 'test-results', 'blob-report', 'tmp', 'temp']);
const localFiles = new Set(['auth.json', 'credentials.json', 'history.jsonl', '.ds_store', 'thumbs.db', 'desktop.ini']);

// Mesmos nomes de saídas locais ignoradas; não exclui fixtures/cache nem arquivos .template.
export function isGeneratedOutput(path, directory = false) {
  const parts = path.replaceAll('\\', '/').split('/');
  return parts.some((part, index) => {
    const name = part.toLowerCase();
    const folder = index < parts.length - 1 || directory;
    const localFile = localFiles.has(name) || /\.(?:log|swp|swo)$|~$|^\._/.test(name) || /\.local\.(?:jsonc?|toml|ya?ml)$/.test(name);
    const secretEnv = /^\.env(?:\.|$)/.test(name) && !/^\.env\.(?:example|sample|template|.*\.example)$/.test(part);
    return /^\.playwright/.test(name) || (folder && (outputDirectories.has(name) || name.startsWith('playwright'))) || (!folder && (localFile || secretEnv));
  });
}

export function validateIgnoreClients(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('clients.json deve conter um objeto.');
  const names = new Set();
  for (const [name, settings] of Object.entries(value)) {
    if (!/^\.[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) || ['.git', '.pbai4devs', '.agent-tests'].includes(name.toLowerCase()) || names.has(name.toLowerCase())) throw new Error(`Cliente .gitignore invalido: ${name}`);
    names.add(name.toLowerCase());
    if (!settings || typeof settings !== 'object' || Array.isArray(settings) || Object.keys(settings).some(key => !['resources', 'allow'].includes(key))) throw new Error(`Configuracao .gitignore invalida: ${name}`);
    if (settings.resources !== undefined && typeof settings.resources !== 'boolean') throw new Error(`resources deve ser booleano: ${name}`);
    const allow = settings.allow === undefined ? [] : settings.allow;
    if (!Array.isArray(allow) || new Set(allow).size !== allow.length) throw new Error(`allow deve ser uma lista sem duplicados: ${name}`);
    for (const path of allow) {
      if (typeof path !== 'string' || !path || /[\\:*?\[\]!#<>|\x00-\x1f\x7f]/.test(path) || path.trim() !== path || path.replace(/\/$/, '').split('/').some(part => !part || part === '.' || part === '..')) throw new Error(`Caminho allow deve ser relativo e literal: ${name}`);
    }
  }
  return value;
}

export function renderClientIgnore(template, settings = {}) {
  const token = '{{ALLOWLIST}}';
  if (!template.includes(token)) return template;
  if (template.split(token).length !== 2) throw new Error('agents.ignore exige um unico {{ALLOWLIST}}.');
  const allowed = [...(settings.resources === false ? [] : ['skills/', 'agents/', 'commands/', 'rules/']), ...(settings.allow ?? [])];
  const directories = allowed.filter(path => path.endsWith('/'));
  const patterns = new Set();
  for (const path of allowed) {
    const directory = path.endsWith('/');
    const parts = path.replace(/\/$/, '').split('/');
    for (let end = 1; end < parts.length; end++) {
      const ancestor = parts.slice(0, end).join('/') + '/';
      patterns.add(`!/${ancestor}`);
      if (!directories.some(value => ancestor.startsWith(value))) patterns.add(`/${ancestor}*`);
    }
    if (directory) patterns.add(`!/${parts.join('/')}/`);
    else patterns.add(`!/${path}`);
  }
  return template.replace(token, [...patterns].join('\n'));
}

const localStat = file => { try { return lstatSync(file); } catch (error) { if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null; throw error; } };
const localRead = file => localStat(file) ? readFileSync(file, 'utf8') : null;
const portable = path => path.split(sep).join('/');

function checkedLocalPath(file) {
  let current = resolve(file);
  while (true) {
    if (localStat(current)?.isSymbolicLink()) throw new Error(`Link simbolico em exclusao local: ${file}`);
    const parent = dirname(current); if (parent === current) break; current = parent;
  }
  const item = localStat(file);
  if (item && !item.isFile()) throw new Error(`Exclusao local exige arquivo regular: ${file}`);
  return file;
}

function localBlock(current, first, last, body) {
  const text = current ?? '';
  const begins = [...text.matchAll(new RegExp(`^${first}\\r?$`, 'gm'))];
  const ends = [...text.matchAll(new RegExp(`^${last}\\r?$`, 'gm'))];
  if (begins.length !== ends.length || begins.length > 1 || begins.length && begins[0].index > ends[0].index) throw new Error('Bloco de exclusao local invalido.');
  const block = body === null ? '' : `${first}\n${body.trimEnd()}\n${last}\n`;
  if (!begins.length) return block ? text + (text && !text.endsWith('\n') ? '\n' : '') + block : text;
  const start = begins[0].index;
  const offset = ends[0].index + ends[0][0].length;
  const finish = offset + (text[offset] === '\n' ? 1 : 0);
  return text.slice(0, start) + block + text.slice(finish);
}

function gitCommand(root, args, input) {
  const env = { ...process.env };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE']) delete env[key];
  return spawnSync('git', [...(['ls-files', 'rm'].includes(args[0]) ? ['--literal-pathspecs'] : []), '-C', root, ...args], { input, encoding: 'utf8', env, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
}

function checkedOutput(path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || /[\\\x00-\x1f\x7f]/.test(path) || path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error(`Saida local invalida: ${path}`);
  return path;
}

function escapePattern(path) { return path.replace(/[\\!#*?\[\] ]/g, '\\$&'); }

function rootProbes(root, roots) {
  return roots.filter(path => { const item = localStat(join(root, path)); return !item || item.isDirectory(); }).map(path => `${path}/.agentdevkit-ignore-probe`);
}

function localRoot(value) {
  const missing = []; let parent = resolve(value);
  while (!localStat(parent)) { missing.unshift(parent.slice(dirname(parent).length + 1)); parent = dirname(parent); }
  if (!localStat(parent).isDirectory() || localStat(parent).isSymbolicLink()) throw new Error('Raiz local exige diretorio real.');
  return { root: join(realpathSync(parent), ...missing), parent: realpathSync(parent) };
}

// Os padrões vêm do hub; apenas os nomes concretos dos derivados são calculados.
export function planLocalIgnore(root, { outputs = [], templateRoot } = {}) {
  const resolved = localRoot(root); root = resolved.root;
  const localTemplate = join(root, '.pbai4devs/templates/gitignore/local.ignore');
  const templateFile = checkedLocalPath(templateRoot ? join(templateRoot, '.pbai4devs/templates/gitignore/local.ignore') : localStat(localTemplate) ? localTemplate : fileURLToPath(new URL('../../templates/gitignore/local.ignore', import.meta.url)));
  const template = readFileSync(templateFile, 'utf8');
  if (template.split('{{OUTPUTS}}').length !== 2) throw new Error('local.ignore exige um unico {{OUTPUTS}}.');
  if (template.split('{{ROOTS}}').length > 2) throw new Error('local.ignore permite um unico {{ROOTS}}.');
  const localPolicy = join(templateRoot || root, '.pbai4devs/templates/clients/ADAPTERS.json');
  const policy = JSON.parse(readFileSync(checkedLocalPath(localStat(localPolicy) ? localPolicy : fileURLToPath(new URL('../../templates/clients/ADAPTERS.json', import.meta.url))), 'utf8'));
  const roots = [...new Set(policy.adapters.flatMap(adapter => [adapter.root, ...(adapter.extraRoots || [])]))].filter(path => !['.github', '.vscode'].includes(path));
  if (roots.some(path => typeof path !== 'string' || !/^\.[a-z0-9][a-z0-9-]*$/.test(path) || ['.git', '.pbai4devs', '.agent-tests'].includes(path))) throw new Error('Raiz de cliente invalida para exclusao.');
  const paths = [...new Set([...outputs.map(checkedOutput), ...template.split(/\r?\n/).filter(line => line.startsWith('/')).map(line => checkedOutput(line.slice(1)))])].sort();
  const info = gitCommand(resolved.parent, ['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-path', 'info/exclude']);
  let location = null;
  if (info.status === 0) {
    const [top, exclude] = info.stdout.trimEnd().split(/\r?\n/);
    if (!top || !exclude) throw new Error('Localizacao Git invalida.');
    const prefix = relative(top, root);
    if (isAbsolute(prefix) || prefix === '..' || prefix.startsWith(`..${sep}`)) throw new Error('Projeto fora da arvore Git.');
    location = { top, exclude: checkedLocalPath(exclude), prefix: portable(prefix) };
  } else if (info.error && info.error.code !== 'ENOENT' || !info.error && !/not a git repository/i.test(info.stderr || '')) {
    throw new Error(`Nao foi possivel localizar Git: ${info.error?.message || info.stderr}`);
  }
  const id = createHash('sha256').update(root).digest('hex').slice(0, 16);
  const first = `# BEGIN AGENTDEVKIT LOCAL ${id}`, last = `# END AGENTDEVKIT LOCAL ${id}`;
  const fixed = template.replace('{{ROOTS}}', roots.map(path => `/${path}/`).join('\n')).replace('{{OUTPUTS}}', paths.filter(path => !roots.some(root => path === root || path.startsWith(root + '/'))).map(path => `/${escapePattern(path)}`).join('\n'));
  const body = fixed.split(/\r?\n/).map(line => location?.prefix && line.startsWith('/') ? `/${escapePattern(location.prefix)}${line}` : line).join('\n');
  const target = location?.exclude ?? checkedLocalPath(join(root, '.gitignore'));
  const before = localRead(target), after = localBlock(before, first, last, body);
  const edits = before === after ? [] : [{ path: target, before, after }];
  const probes = [...paths, ...rootProbes(root, roots)];
  const wanted = new Set(probes.map(path => location?.prefix ? `${location.prefix}/${path}` : path));
  if (location && !before?.includes(first) && !localRead(join(root, '.gitignore'))?.includes(first)) {
    const ignored = gitCommand(location.top, ['check-ignore', '--no-index', '--stdin', '-z'], [...wanted].join('\0') + '\0');
    if (!ignored.error && [0, 1].includes(ignored.status) && ignored.stdout.split('\0').filter(Boolean).length === wanted.size) edits.length = 0;
  }
  if (location) {
    const fallback = checkedLocalPath(join(root, '.gitignore'));
    const old = localRead(fallback), next = localBlock(old, first, last, null);
    if (old !== null && old !== next) edits.push({ path: fallback, before: old, after: next });
  }
  const tracked = location ? gitCommand(location.top, ['ls-files', '-z']).stdout.split('\0').filter(path => wanted.has(path)).map(path => location.prefix ? path.slice(location.prefix.length + 1) : path) : [];
  return { root, status: location ? 'git' : 'fallback', location, paths, roots, edits, trackedOutputs: tracked, first, last };
}

export function checkLocalIgnore(plan, { replacedBlocks = [] } = {}) {
  const missing = [];
  const replacements = replacedBlocks.map(item => {
    const path = realpathSync(resolve(item.path)), inside = relative(plan.root, path);
    if (isAbsolute(inside) || inside === '..' || inside.startsWith(`..${sep}`) || !Number.isInteger(item.firstLine) || !Number.isInteger(item.lastLine) || item.firstLine < 1 || item.lastLine < item.firstLine || !/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error('Faixa de ignore gerenciado invalida.');
    const content = readFileSync(checkedLocalPath(path), 'utf8');
    const lines = [...content.matchAll(/[^\r\n]*(?:\r\n|\n|\r|$)/g)].filter(match => match[0]);
    if (item.lastLine > lines.length) throw new Error('Faixa de ignore fora do arquivo.');
    const first = lines[item.firstLine - 1], last = lines[item.lastLine - 1];
    const block = content.slice(first.index, last.index + last[0].replace(/[\r\n]+$/, '').length);
    if (createHash('sha256').update(block).digest('hex') !== item.sha256) throw new Error('Bloco de ignore mudou antes da verificacao.');
    return { ...item, path };
  });
  if (plan.location && plan.paths.length) {
    const probes = [...plan.paths, ...rootProbes(plan.root, plan.roots || [])];
    const relativePaths = probes.map(path => plan.location.prefix ? `${plan.location.prefix}/${path}` : path);
    const result = gitCommand(plan.location.top, ['check-ignore', '--verbose', '--no-index', '--stdin', '-z'], relativePaths.join('\0') + '\0');
    if (result.error || ![0, 1].includes(result.status)) throw new Error(result.error?.message || result.stderr || 'Falha ao conferir exclusoes Git.');
    const values = result.stdout.split('\0'), matches = new Map();
    for (let index = 0; index + 3 < values.length; index += 4) matches.set(values[index + 3], { source: values[index], line: Number(values[index + 1]), pattern: values[index + 2] });
    for (let index = 0; index < relativePaths.length; index++) {
      const match = matches.get(relativePaths[index]);
      const negative = match?.pattern.startsWith('!');
      const humanOverride = negative && /(?:^|[\\/])\.gitignore$/.test(match.source);
      const replaced = negative && replacements.some(item => item.path === resolve(plan.location.top, match.source) && match.line >= item.firstLine && match.line <= item.lastLine);
      if (!replaced && ((!plan.edits.length && (!match || negative)) || humanOverride)) missing.push(probes[index]);
    }
  }
  return { ok: plan.edits.length === 0 && missing.length === 0 && plan.trackedOutputs.length === 0, status: plan.status, missing, trackedOutputs: plan.trackedOutputs, changed: plan.edits.length };
}

export function assertLocalIgnoreUnchanged(plan) {
  for (const edit of plan.edits) {
    checkedLocalPath(edit.path);
    if (localRead(edit.path) !== edit.before) throw new Error(`Exclusao alterada apos planejar: ${edit.path}`);
  }
}

export function applyLocalIgnore(plan) {
  assertLocalIgnoreUnchanged(plan);
  const written = [];
  try {
    for (const edit of plan.edits) {
      mkdirSync(dirname(edit.path), { recursive: true });
      const temporary = `${edit.path}.agentdevkit-${randomUUID()}`;
      try { writeFileSync(temporary, edit.after, { flag: 'wx' }); renameSync(temporary, edit.path); }
      finally { rmSync(temporary, { force: true }); }
      written.push(edit);
    }
    const verified = checkLocalIgnore({ ...plan, edits: [], trackedOutputs: [] });
    if (verified.missing.length) throw new Error(`Regras humanas reabrem derivados locais: ${verified.missing.join(', ')}`);
  } catch (error) {
    for (const edit of written.reverse()) {
      if (localRead(edit.path) !== edit.after) continue;
      if (edit.before === null) rmSync(edit.path, { force: true }); else writeFileSync(edit.path, edit.before);
    }
    throw error;
  }
  return { status: plan.status, changed: plan.edits.length, trackedOutputs: plan.trackedOutputs };
}

export function planUntrack(root, expectedHashes = {}) {
  root = localRoot(root).root;
  const candidates = Object.keys(expectedHashes).map(checkedOutput).sort();
  for (const hash of Object.values(expectedHashes)) if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('Hash de ownership invalido para desindexar.');
  if (!candidates.length || !localStat(root)) return { root, paths: [], hashes: {}, index: '', conflicts: [] };
  const result = gitCommand(root, ['ls-files', '--stage', '-z']);
  if (result.status !== 0) {
    if (result.error?.code === 'ENOENT' || /not a git repository/i.test(result.stderr || '')) return { root, paths: [], hashes: {}, index: '', conflicts: [] };
    throw new Error(result.error?.message || result.stderr || 'Falha ao ler indice Git.');
  }
  const conflicts = [];
  const records = result.stdout.split('\0').filter(Boolean);
  const wanted = new Set(candidates);
  const matches = new Map();
  for (const record of records) {
    const position = record.indexOf('\t'), path = record.slice(position + 1);
    if (position < 0 || !wanted.has(path)) continue;
    matches.set(path, [...(matches.get(path) || []), record]);
  }
  const paths = [...matches.keys()].filter(path => {
    const file = checkedLocalPath(join(root, path));
    const entries = matches.get(path);
    const match = entries.length === 1 && entries[0].match(/^\d+ ([a-f0-9]+) 0\t/);
    const blob = match ? gitCommand(root, ['cat-file', 'blob', match[1]]) : null;
    const owned = localStat(file) && createHash('sha256').update(readFileSync(file)).digest('hex') === expectedHashes[path];
    const indexOwned = blob?.status === 0 && createHash('sha256').update(blob.stdout).digest('hex') === expectedHashes[path];
    if (!owned || !indexOwned) conflicts.push(path);
    return owned && indexOwned;
  });
  const selected = new Set(paths);
  const index = records.filter(record => selected.has(record.slice(record.indexOf('\t') + 1))).join('\0');
  return { root, paths, hashes: Object.fromEntries(paths.map(path => [path, expectedHashes[path]])), index, conflicts };
}

export function applyUntrack(plan) {
  if (plan.conflicts?.length) throw new Error(`Indice contem alteracoes nao pertencentes ao kit: ${plan.conflicts.join(', ')}`);
  if (!plan.paths.length) return { removed: [] };
  const current = planUntrack(plan.root, plan.hashes);
  if (current.index !== plan.index || current.paths.length !== plan.paths.length) throw new Error('Ownership ou indice mudou antes de desindexar.');
  const location = gitCommand(plan.root, ['rev-parse', '--show-toplevel']);
  if (location.status !== 0 || location.error) throw new Error('Nao foi possivel localizar a raiz Git para desindexar.');
  const top = location.stdout.trimEnd(), prefix = portable(relative(top, plan.root));
  const paths = plan.paths.map(path => prefix ? `${prefix}/${path}` : path);
  const result = gitCommand(top, ['rm', '--cached', '--pathspec-from-file=-', '--pathspec-file-nul'], paths.join('\0') + '\0');
  if (result.status !== 0 || result.error) throw new Error(result.error?.message || result.stderr || 'Falha ao desindexar derivados.');
  return { removed: [...plan.paths] };
}

// Reconstitui apenas entradas removidas; o índice atual e alterações concorrentes
// permanecem. O lock é do próprio Git e o trabalho ocorre numa cópia desse índice.
export function restoreUntrack(plan) {
  if (!plan?.paths?.length) return { restored: [], preserved: [] };
  const located = gitCommand(plan.root, ['rev-parse', '--path-format=absolute', '--show-toplevel', '--git-path', 'index']);
  if (located.status !== 0 || located.error) throw new Error('Nao foi possivel localizar o indice para rollback.');
  const [top, indexPath] = located.stdout.trimEnd().split(/\r?\n/);
  checkedLocalPath(indexPath);
  if (!localStat(indexPath)) throw new Error('Indice ausente; rollback automatico recusado.');
  const lock = `${indexPath}.lock`;
  let descriptor, acquired = false;
  try {
    descriptor = openSync(lock, 'wx');
    acquired = true;
    writeFileSync(descriptor, readFileSync(indexPath));
    const current = gitCommand(plan.root, ['ls-files', '--stage', '-z']);
    if (current.status !== 0 || current.error) throw new Error('Nao foi possivel ler indice atual para rollback.');
    const existing = new Set(current.stdout.split('\0').filter(Boolean).map(record => record.slice(record.indexOf('\t') + 1)));
    const entries = plan.index.split('\0').filter(Boolean);
    const selected = new Set(plan.paths), restored = [], preserved = [];
    const prefix = portable(relative(top, plan.root));
    const records = [];
    for (const record of entries) {
      const at = record.indexOf('\t'), path = record.slice(at + 1);
      if (!selected.has(path)) continue;
      if (existing.has(path)) { preserved.push(path); continue; }
      restored.push(path);
      records.push(record.slice(0, at + 1) + (prefix ? `${prefix}/${path}` : path));
    }
    if (!records.length) return { restored, preserved };
    const env = { ...process.env };
    for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE']) delete env[key];
    env.GIT_INDEX_FILE = lock;
    const result = spawnSync('git', ['-C', top, 'update-index', '-z', '--index-info'], { input: records.join('\0') + '\0', encoding: 'utf8', env, windowsHide: true, timeout: 20000 });
    if (result.status !== 0 || result.error) throw new Error(result.error?.message || result.stderr || 'Rollback do indice falhou.');
    closeSync(descriptor); descriptor = undefined;
    renameSync(lock, indexPath);
    return { restored, preserved };
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (acquired) rmSync(lock, { force: true });
  }
}

export function mergeGitignore(current, template) {
  if (typeof current !== 'string' || typeof template !== 'string' || current.includes('\0') || template.includes('\0')) throw new Error('Conteudo .gitignore invalido.');
  const body = template.replace(/\r\n?/g, '\n').replace(/\n*$/, '');
  if (!body.trim() || body.split('\n').some(line => [ignoreBegin, ignoreEnd].includes(line.trim()))) throw new Error('Template .gitignore vazio ou com marcadores reservados.');
  const markers = [];
  const lines = /([^\r\n]*)(\r\n|\n|\r|$)/g;
  for (const match of current.matchAll(lines)) {
    const value = match[1].trim();
    if ([ignoreBegin, ignoreEnd].includes(value)) markers.push({ value, start: match.index, end: match.index + match[0].length });
  }
  const block = `${ignoreBegin}\n${body}\n${ignoreEnd}\n`;
  if (!markers.length) {
    const separator = !current || /(?:\r\n|\n|\r){2}$/.test(current) ? '' : /(?:\r\n|\n|\r)$/.test(current) ? '\n' : '\n\n';
    return { text: current + separator + block, hasBlock: false };
  }
  if (markers.length !== 2 || markers[0].value !== ignoreBegin || markers[1].value !== ignoreEnd) throw new Error('Marcadores .gitignore incompletos, duplicados ou fora de ordem.');
  return { text: current.slice(0, markers[0].start) + block + current.slice(markers[1].end), hasBlock: true };
}
