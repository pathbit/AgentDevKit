import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, closeSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
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
const localMode = file => { const item = localStat(file); return item ? item.mode & 0o777 : null; };
const portable = path => path.split(sep).join('/');

function canonicalExisting(path) {
  if (typeof realpathSync.native === 'function') {
    try { return realpathSync.native(path); }
    catch (error) { if (!['ENOSYS', 'ENOTSUP', 'EINVAL'].includes(error.code)) throw error; }
  }
  return realpathSync(path);
}

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
  return roots.filter(path => { const item = localStat(join(root, path)); return !item || item.isDirectory() && !item.isSymbolicLink(); }).map(path => `${path}/.agentdevkit-ignore-probe`);
}

function artifactPolicy(templateFile) {
  const adjacent = join(dirname(templateFile), 'agents.ignore');
  const source = checkedLocalPath(localStat(adjacent) ? adjacent : fileURLToPath(new URL('../../templates/gitignore/agents.ignore', import.meta.url)));
  const content = readFileSync(source, 'utf8');
  const section = content.split(/^## Resultados e arquivos temporarios\r?$/m)[1]?.split(/^## /m)[0];
  const patterns = section?.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  if (!patterns?.length || patterns.some(pattern => !pattern.startsWith('**/') || /[!\\\x00-\x1f]/.test(pattern) || pattern.split('/').includes('..'))) throw new Error('Secao de artefatos invalida em agents.ignore.');
  return patterns;
}

function privateClientPolicy(templateFile, roots) {
  const adjacent = join(dirname(templateFile), 'agents.ignore');
  const source = checkedLocalPath(localStat(adjacent) ? adjacent : fileURLToPath(new URL('../../templates/gitignore/agents.ignore', import.meta.url)));
  const section = readFileSync(source, 'utf8').split(/^## Estado local, caches e credenciais conhecidas\r?$/m)[1]?.split(/^## /m)[0];
  const patterns = section?.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  if (!patterns?.length || patterns.some(pattern => !/^(?:!?\*\*\/|\/)/.test(pattern) || /[\\\x00-\x1f]/.test(pattern) || pattern.split('/').includes('..'))) throw new Error('Secao de estado local invalida em agents.ignore.');
  const rules = [], probes = [];
  for (const root of roots) for (const pattern of patterns) {
    const negative = pattern.startsWith('!'), rule = pattern.replace(/^!/, '').replace(/^\//, '');
    rules.push(`${negative ? '!' : ''}/${escapePattern(root)}/${rule}`);
    if (negative) continue;
    const witness = lower => rule.replace(/^\*\*\//, '').replace(/\[([^\]]+)\]/g, (_match, letters) => lower ? letters[0].toLowerCase() : letters[0]).replace(/\*/g, 'agentdevkit-private-probe').replace(/\?/g, 'x');
    for (const variant of new Set([witness(false), witness(true)])) {
      probes.push(`${root}/${variant}${variant.endsWith('/') ? '.agentdevkit-ignore-probe' : ''}`);
      if (rule.startsWith('**/')) probes.push(`${root}/.agentdevkit-ignore-probes/${variant}${variant.endsWith('/') ? '.agentdevkit-ignore-probe' : ''}`);
    }
  }
  return { rules, probes };
}

function safeIgnoreProbe(root, path) {
  let parent = root;
  for (const part of path.split('/').slice(0, -1)) {
    parent = join(parent, part);
    const item = localStat(parent);
    if (item && (!item.isDirectory() || item.isSymbolicLink())) return false;
  }
  return true;
}

function artifactProbes(root, patterns) {
  const probes = new Set();
  for (const pattern of patterns) {
    const stem = pattern.slice(3).replace(/\/$/, '').replace(/\[([^\]]+)\]/g, (_match, letters) => letters[0]).replace(/\?/g, 'x');
    const names = stem.includes('*') ? ['', '-mcp', '-report', '-cache', '-agentdevkit'].map(suffix => stem.replace(/\*/g, suffix)) : [stem];
    for (const name of names) for (const variant of new Set([name, name.toLowerCase()])) {
      const leaves = stem.includes('*') ? ['.agentdevkit-artifact-probe', '.cache/.agentdevkit-artifact-probe'] : ['.agentdevkit-artifact-probe'];
      for (const leaf of leaves) for (const path of [`${variant}/${leaf}`, `.agentdevkit-ignore-probes/${variant}/${leaf}`]) {
        let parent = root, safe = true;
        for (const part of path.split('/').slice(0, -1)) {
          parent = join(parent, part); const item = localStat(parent);
          if (item && (!item.isDirectory() || item.isSymbolicLink())) { safe = false; break; }
        }
        if (safe) probes.add(path);
      }
    }
  }
  return [...probes];
}

const matchesComponent = (part, pattern) => posix.matchesGlob(`x${part}`, `x${pattern.replace(/[{}()]/g, '\\$&')}`);

function matchesParts(parts, pattern) {
  const cache = new Map();
  function match(part, glob) {
    const key = `${part}:${glob}`; if (cache.has(key)) return cache.get(key);
    const expected = pattern[glob];
    const result = glob === pattern.length ? part === parts.length
      : expected === '**' ? match(part, glob + 1) || part < parts.length && match(part + 1, glob)
        : part < parts.length && matchesComponent(parts[part], expected) && match(part + 1, glob + 1);
    cache.set(key, result); return result;
  }
  return match(0, 0);
}

function artifactPath(path, patterns, directory = false) {
  const parts = path.split('/');
  return patterns.some(pattern => {
    const rule = pattern.slice(3).replace(/\/$/, '');
    return parts.some((part, index) => (index < parts.length - 1 || directory || !pattern.endsWith('/'))
      && (rule.includes('/') ? matchesParts(parts.slice(0, index + 1), ['**', ...rule.split('/')])
        : matchesComponent(part, rule)));
  });
}

function visibleArtifactProbes(root, location, patterns) {
  const listed = gitCommand(location.top, ['--literal-pathspecs', '-c', 'core.excludesFile=', 'ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', location.prefix ? `${location.prefix}/` : '.']);
  if (listed.error || listed.status !== 0) throw new Error(listed.error?.message || listed.stderr || 'Falha ao conferir artefatos existentes.');
  const paths = listed.stdout.split('\0').filter(Boolean), prefix = location.prefix ? `${location.prefix}/` : '';
  const probes = new Set(paths.filter(path => path.startsWith(prefix)).map(path => path.slice(prefix.length)).filter(path => artifactPath(path, patterns) && safeIgnoreProbe(root, path)));
  const ignores = new Set(paths.filter(path => path.startsWith(prefix) && (path === '.gitignore' || path.endsWith('/.gitignore')) && safeIgnoreProbe(root, path.slice(prefix.length))));
  let ancestor = root;
  while (true) {
    ignores.add(portable(relative(location.top, join(ancestor, '.gitignore'))));
    if (ancestor === location.top) break;
    ancestor = dirname(ancestor);
  }
  for (const path of ignores) {
    const file = join(location.top, path), item = localStat(file);
    if (!item?.isFile() || item.isSymbolicLink()) continue;
    // Git resolves precedence; these literals only add witnesses for named exceptions.
    for (const line of readFileSync(checkedLocalPath(file), 'utf8').split(/\r?\n/)) {
      if (!line.startsWith('!') || line.length === 1) continue;
      const rule = line.slice(1).replace(/(?<!\\) +$/, ''), directory = rule.endsWith('/') || rule.endsWith('/**');
      const literal = rule.replace(/(?:\/\*\*)+\/?$/, '').replace(/\/$/, '').replace(/^\//, '');
      if (/(^|[^\\])[*?\[]/.test(literal)) continue;
      const ruleBase = !rule.startsWith('/') && !literal.includes('/') && relative(dirname(file), root).split(sep)[0] !== '..' ? root : dirname(file);
      const candidate = portable(relative(root, resolve(ruleBase, literal.replace(/\\(.)/g, '$1'))));
      if (!candidate || candidate === '..' || candidate.startsWith('../') || !artifactPath(candidate, patterns, directory)) continue;
      const probe = checkedOutput(directory ? `${candidate}/.agentdevkit-artifact-probe` : candidate);
      if (safeIgnoreProbe(root, probe)) probes.add(probe);
    }
  }
  return [...probes];
}

// Existing unignored private files and literal/mixed-case root exceptions must
// not slip through merely because a synthetic wildcard used another spelling.
function visiblePrivateProbes(root, location, clientRoots) {
  const listed = gitCommand(location.top, ['--literal-pathspecs', '-c', 'core.excludesFile=', 'ls-files', '--others', '--exclude-standard', '-z', '--', location.prefix ? `${location.prefix}/` : '.']);
  if (listed.error || listed.status !== 0) throw new Error(listed.error?.message || listed.stderr || 'Falha ao conferir arquivos privados.');
  const prefix = location.prefix ? `${location.prefix}/` : '', roots = new Set(clientRoots);
  const probes = new Set(listed.stdout.split('\0').filter(path => path.startsWith(prefix)).map(path => path.slice(prefix.length))
    .filter(path => roots.has(path.split('/')[0]) && isGeneratedOutput(path) && safeIgnoreProbe(root, path)));
  const ignore = join(root, '.gitignore'), item = localStat(ignore);
  if (item?.isFile() && !item.isSymbolicLink()) for (const line of readFileSync(ignore, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!line.startsWith('!') || line.length === 1) continue;
    const rule = line.slice(1), directory = rule.endsWith('/');
    const witness = rule.replace(/^\//, '').replace(/\*\*\//g, '').replace(/\[([^\]]+)\]/g, (_m, letters) => letters[0]).replace(/\*/g, '').replace(/\?/g, 'x').replace(/\/$/, '');
    if (!witness || /[\\\x00-\x1f]/.test(witness)) continue;
    const candidates = roots.has(witness.split('/')[0]) ? [witness] : [...roots].map(client => `${client}/${witness}`);
    for (const path of candidates) {
      const probe = checkedOutput(directory ? `${path}/.agentdevkit-ignore-probe` : path);
      if (isGeneratedOutput(path, directory) && safeIgnoreProbe(root, probe)) probes.add(probe);
    }
  }
  return [...probes];
}

// Wildcard negations may expose files that do not exist yet. Inspect client
// ignores directly, even when an old rule currently hides the entire client.
function ambiguousExceptions(root, location, clientRoots, artifacts) {
  const files = [];
  const visit = directory => {
    const item = localStat(directory);
    if (!item?.isDirectory() || item.isSymbolicLink()) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isFile() && entry.name === '.gitignore') files.push(path);
      else if (entry.isDirectory()) {
        const local = portable(relative(root, path)), client = clientRoots.includes(local.split('/')[0]);
        const downloaded = entry.name === 'node_modules' || /^\.pbai4devs\/(?:tools\/(?:npm-cache|bin)|external-skills\/[^/]+)$/.test(local);
        const gitPath = location.prefix ? `${location.prefix}/${local}/` : `${local}/`;
        const ignoredDownload = downloaded && gitCommand(location.top, ['-c', 'core.excludesFile=', 'check-ignore', '--no-index', '-q', '--', gitPath]).status === 0;
        const protectedDir = entry.name === '.git' || artifactPath(local, artifacts, true)
          || ignoredDownload || (client || local.startsWith('.pbai4devs/')) && isGeneratedOutput(local, true);
        if (!protectedDir) visit(path);
      }
    }
  };
  visit(root);
  let ancestor = dirname(root);
  while (root !== location.top && (ancestor === location.top || !relative(location.top, ancestor).startsWith(`..${sep}`))) {
    files.push(join(ancestor, '.gitignore'));
    if (ancestor === location.top) break;
    ancestor = dirname(ancestor);
  }
  const rootIgnore = join(root, '.gitignore');
  const conflicts = [];
  for (const file of files) {
    const item = localStat(file);
    if (!item?.isFile() || item.isSymbolicLink()) continue;
    const lines = readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
    for (const line of lines) {
      if (!line.startsWith('!')) continue;
      const rule = line.slice(1).replace(/^\/?(?:\*\*\/)?/, '');
      if (/^\.env\.(?:example|sample|template|\*\.example)$/.test(rule)) continue;
      const wildcard = /(^|[^\\])[*?\[]/.test(line);
      const scope = portable(relative(dirname(file), root));
      if (scope && !scope.startsWith('..') && !/^!\/?\*\*\//.test(line) && rule.includes('/')) {
        const parts = rule.split('/'), project = scope.split('/');
        if (project.some((part, index) => parts[index] && !/[*?\[]/.test(parts[index]) && parts[index] !== part && parts.slice(0, index).every(value => value && !/[*?\[]/.test(value)))) continue;
      }
      if (!wildcard) {
        if (file !== rootIgnore && isGeneratedOutput(portable(relative(root, join(dirname(file), rule))), rule.endsWith('/'))) conflicts.push(portable(relative(root, file)) + ': ' + line);
        continue;
      }
      conflicts.push(portable(relative(root, file)) + ': ' + line);
    }
  }
  return conflicts;
}

function foreignHiddenClients(plan) {
  if (!plan.location) return [];
  const content = localRead(plan.location.exclude) || '', ranges = [];
  let start = null;
  content.split(/\r?\n/).forEach((line, index) => {
    const begin = line.match(/^# BEGIN AGENTDEVKIT LOCAL ([a-f0-9]{16})$/);
    const end = line.match(/^# END AGENTDEVKIT LOCAL ([a-f0-9]{16})$/);
    if (begin) start = { id: begin[1], line: index + 1 };
    else if (end && start?.id === end[1]) { ranges.push({ ...start, end: index + 1 }); start = null; }
  });
  const probes = plan.clientRoots.filter(path => { const item = localStat(join(plan.root, path)); return !item || item.isDirectory() && !item.isSymbolicLink(); }).map(path => `${path}/.agentdevkit-human-probe.md`);
  if (!probes.length) return [];
  const { paths, matches } = ignoreMatches(plan.location, probes);
  return paths.flatMap((path, index) => {
    const match = matches.get(path);
    if (!match || match.pattern.startsWith('!') || resolve(plan.location.top, match.source) !== plan.location.exclude) return [];
    return ranges.some(range => `# BEGIN AGENTDEVKIT LOCAL ${range.id}` !== plan.first && match.line >= range.line && match.line <= range.end) ? [probes[index]] : [];
  });
}

function localIgnoreSource(location, source) {
  const path = resolve(location.top, source);
  if (path === location.exclude) return true;
  const inside = relative(location.top, path);
  return basename(path) === '.gitignore' && !isAbsolute(inside) && inside !== '..' && !inside.startsWith(`..${sep}`);
}

function ignoreMatches(location, probes) {
  const root = join(location.top, location.prefix);
  if (probes.some(path => !safeIgnoreProbe(root, path))) throw new Error('Probe atravessa caminho simbolico.');
  const paths = probes.map(path => location.prefix ? `${location.prefix}/${path}` : path);
  const result = gitCommand(location.top, ['-c', 'core.excludesFile=', 'check-ignore', '--verbose', '--no-index', '--stdin', '-z'], paths.join('\0') + '\0');
  if (result.error || ![0, 1].includes(result.status)) throw new Error(result.error?.message || result.stderr || 'Falha ao conferir exclusoes Git.');
  const values = result.stdout.split('\0'), matches = new Map();
  for (let index = 0; index + 3 < values.length; index += 4) matches.set(values[index + 3], { source: values[index], line: Number(values[index + 1]), pattern: values[index + 2] });
  return { paths, matches };
}

function localRoot(value) {
  const missing = []; let parent = resolve(value);
  while (!localStat(parent)) { missing.unshift(parent.slice(dirname(parent).length + 1)); parent = dirname(parent); }
  if (!localStat(parent).isDirectory() || localStat(parent).isSymbolicLink()) throw new Error('Raiz local exige diretorio real.');
  const canonical = canonicalExisting(parent);
  return { root: join(canonical, ...missing), parent: canonical };
}

// Os padrões vêm do hub; apenas os nomes concretos dos derivados são calculados.
export function planLocalIgnore(root, { outputs = [], templateRoot } = {}) {
  const resolved = localRoot(root); root = resolved.root;
  const localTemplate = join(root, '.pbai4devs/templates/gitignore/local.ignore');
  const templateFile = checkedLocalPath(templateRoot ? join(templateRoot, '.pbai4devs/templates/gitignore/local.ignore') : localStat(localTemplate) ? localTemplate : fileURLToPath(new URL('../../templates/gitignore/local.ignore', import.meta.url)));
  const template = readFileSync(templateFile, 'utf8');
  const artifacts = artifactPolicy(templateFile);
  if (template.split('{{OUTPUTS}}').length !== 2) throw new Error('local.ignore exige um unico {{OUTPUTS}}.');
  if (template.split('{{ROOTS}}').length > 2) throw new Error('local.ignore permite um unico {{ROOTS}}.');
  // A client directory can also contain human instructions and settings. Only
  // whole files owned by the kit belong in the local output exclusion list.
  const roots = [];
  const localPolicy = join(templateRoot || root, '.pbai4devs/templates/clients/ADAPTERS.json');
  const policy = JSON.parse(readFileSync(checkedLocalPath(localStat(localPolicy) ? localPolicy : fileURLToPath(new URL('../../templates/clients/ADAPTERS.json', import.meta.url))), 'utf8'));
  const clientRoots = [...new Set(policy.adapters.flatMap(adapter => [adapter.root, ...(adapter.extraRoots || [])]))];
  if (clientRoots.some(path => typeof path !== 'string' || !/^\.[a-z0-9][a-z0-9-]*$/.test(path) || ['.git', '.pbai4devs', '.agent-tests'].includes(path))) throw new Error('Raiz de cliente invalida para exclusao.');
  const privateClients = privateClientPolicy(templateFile, clientRoots);
  const paths = [...new Set([...outputs.map(checkedOutput), ...template.split(/\r?\n/).filter(line => line.startsWith('/')).map(line => checkedOutput(line.slice(1)))])].sort();
  const info = gitCommand(resolved.parent, ['rev-parse', '--show-toplevel', '--git-path', 'info/exclude']);
  let location = null;
  if (info.status === 0) {
    const [reportedTop, reportedExclude] = info.stdout.trimEnd().split(/\r?\n/);
    if (!reportedTop || !reportedExclude) throw new Error('Localizacao Git invalida.');
    const exclude = resolve(resolved.parent, reportedExclude);
    const top = canonicalExisting(reportedTop);
    const prefix = relative(top, root);
    if (isAbsolute(prefix) || prefix === '..' || prefix.startsWith(`..${sep}`)) throw new Error('Projeto fora da arvore Git.');
    checkedLocalPath(exclude);
    const canonicalExclude = localStat(exclude) ? canonicalExisting(exclude) : join(localRoot(dirname(exclude)).root, basename(exclude));
    location = { top, exclude: checkedLocalPath(canonicalExclude), prefix: portable(prefix) };
  } else if (info.error && info.error.code !== 'ENOENT' || !info.error && !/not a git repository/i.test(info.stderr || '')) {
    throw new Error(`Nao foi possivel localizar Git: ${info.error?.message || info.stderr}`);
  }
  const id = createHash('sha256').update(root).digest('hex').slice(0, 16);
  const first = `# BEGIN AGENTDEVKIT LOCAL ${id}`, last = `# END AGENTDEVKIT LOCAL ${id}`;
  const fixed = template.replace('{{ROOTS}}', roots.map(path => `/${path}/`).join('\n')).replace('{{OUTPUTS}}', paths.filter(path => !roots.some(root => path === root || path.startsWith(root + '/'))).map(path => `/${escapePattern(path)}`).join('\n'))
    + '\n# Estado privado dos clientes\n' + privateClients.rules.join('\n') + '\n'
    + '\n# Resultados e arquivos temporarios\n' + artifacts.map(pattern => `/${pattern}`).join('\n') + '\n';
  const body = fixed.split(/\r?\n/).map(line => {
    if (!location?.prefix) return line;
    if (line.startsWith('!/')) return `!/${escapePattern(location.prefix)}${line.slice(1)}`;
    return line.startsWith('/') ? `/${escapePattern(location.prefix)}${line}` : line;
  }).join('\n');
  const target = location?.exclude;
  const before = target ? localRead(target) : null, after = target ? localBlock(before, first, last, body) : null;
  const edits = before === after ? [] : [{ path: target, before, after, beforeMode: localMode(target) }];
  const probes = [...paths, ...rootProbes(root, roots)];
  const existingPrivate = privateClients.probes.filter(path => localStat(join(root, path.split('/')[0]))?.isDirectory() && safeIgnoreProbe(root, path));
  const artifactPaths = [...new Set([...artifactProbes(root, artifacts), ...existingPrivate, ...(location ? [...visibleArtifactProbes(root, location, artifacts), ...visiblePrivateProbes(root, location, clientRoots)] : [])])];
  const wanted = new Set(probes.map(path => location?.prefix ? `${location.prefix}/${path}` : path));
  if (location && !before?.includes(first)) {
    const ignored = ignoreMatches(location, [...probes, ...artifactPaths].filter(path => safeIgnoreProbe(root, path)));
    if (ignored.paths.every(path => { const match = ignored.matches.get(path); return match && !match.pattern.startsWith('!') && localIgnoreSource(location, match.source); })) edits.length = 0;
  }
  const prefix = location?.prefix ? `${location.prefix}/` : '';
  const tracked = location ? gitCommand(location.top, ['ls-files', '-z']).stdout.split('\0').filter(path => {
    if (!path.startsWith(prefix)) return false;
    const local = path.slice(prefix.length);
    return wanted.has(path) || artifactPath(local, artifacts) || clientRoots.includes(local.split('/')[0]) && isGeneratedOutput(local);
  }).map(path => path.slice(prefix.length)) : [];
  return { root, status: location ? 'git' : 'no-git', location, paths, roots, clientRoots, artifactPatterns: artifacts, artifactProbes: artifactPaths, privateProbes: privateClients.probes, edits, trackedOutputs: tracked, first, last };
}

export function checkLocalIgnore(plan, { replacedBlocks = [] } = {}) {
  const missing = [];
  if (plan.location) missing.push(...ambiguousExceptions(plan.root, plan.location, plan.clientRoots || [], plan.artifactPatterns || []), ...foreignHiddenClients(plan));
  const replacements = replacedBlocks.map(item => {
    const path = canonicalExisting(checkedLocalPath(resolve(item.path))), inside = relative(localRoot(plan.root).root, path);
    if (isAbsolute(inside) || inside === '..' || inside.startsWith(`..${sep}`) || !Number.isInteger(item.firstLine) || !Number.isInteger(item.lastLine) || item.firstLine < 1 || item.lastLine < item.firstLine || !/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error('Faixa de ignore gerenciado invalida.');
    const content = readFileSync(checkedLocalPath(path), 'utf8');
    const lines = [...content.matchAll(/[^\r\n]*(?:\r\n|\n|\r|$)/g)].filter(match => match[0]);
    if (item.lastLine > lines.length) throw new Error('Faixa de ignore fora do arquivo.');
    const first = lines[item.firstLine - 1], last = lines[item.lastLine - 1];
    const block = content.slice(first.index, last.index + last[0].replace(/[\r\n]+$/, '').length);
    if (createHash('sha256').update(block).digest('hex') !== item.sha256) throw new Error('Bloco de ignore mudou antes da verificacao.');
    return { ...item, path };
  });
  if (plan.location && (plan.paths.length || plan.artifactProbes?.length)) {
    missing.push(...plan.paths.filter(path => !safeIgnoreProbe(plan.root, path)));
    const privateProbes = (plan.privateProbes || []).filter(path => localStat(join(plan.root, path.split('/')[0]))?.isDirectory() && safeIgnoreProbe(plan.root, path));
    const probes = [...new Set([...plan.paths, ...rootProbes(plan.root, plan.roots || []), ...(plan.artifactProbes || []), ...privateProbes,
      ...(plan.artifactPatterns ? visibleArtifactProbes(plan.root, plan.location, plan.artifactPatterns) : []),
      ...visiblePrivateProbes(plan.root, plan.location, plan.clientRoots || [])])].filter(path => safeIgnoreProbe(plan.root, path));
    const { paths: relativePaths, matches } = ignoreMatches(plan.location, probes);
    for (let index = 0; index < relativePaths.length; index++) {
      const match = matches.get(relativePaths[index]);
      const negative = match?.pattern.startsWith('!');
      const local = match && localIgnoreSource(plan.location, match.source);
      const humanOverride = negative && local && /(?:^|[\\/])\.gitignore$/.test(match.source);
      const replaced = negative && replacements.some(item => item.path === canonicalExisting(resolve(plan.location.top, match.source)) && match.line >= item.firstLine && match.line <= item.lastLine);
      if (!replaced && ((!plan.edits.length && (!match || negative || !local)) || humanOverride)) missing.push(probes[index]);
    }
  }
  return { ok: plan.status === 'git' && plan.edits.length === 0 && missing.length === 0 && plan.trackedOutputs.length === 0, status: plan.status, missing, trackedOutputs: plan.trackedOutputs, changed: plan.edits.length };
}

export function assertLocalIgnoreUnchanged(plan) {
  for (const edit of plan.edits) {
    checkedLocalPath(edit.path);
    if (localRead(edit.path) !== edit.before || Object.hasOwn(edit, 'beforeMode') && localMode(edit.path) !== edit.beforeMode) throw new Error(`Exclusao alterada apos planejar: ${edit.path}`);
  }
}

function atomicLocalWrite(path, content, mode, published) {
  const temporary = `${path}.agentdevkit-${randomUUID()}`;
  try {
    writeFileSync(temporary, content, { flag: 'wx' });
    if (mode !== null && mode !== undefined) chmodSync(temporary, mode);
    const writtenMode = localMode(temporary);
    renameSync(temporary, path);
    published?.(writtenMode);
  } finally { rmSync(temporary, { force: true }); }
}

export function applyLocalIgnore(plan) {
  assertLocalIgnoreUnchanged(plan);
  const before = checkLocalIgnore(plan);
  if (before.missing.length) throw new Error(`Regras humanas reabrem derivados locais: ${before.missing.join(', ')}`);
  const written = [];
  try {
    for (const edit of plan.edits) {
      mkdirSync(dirname(edit.path), { recursive: true });
      atomicLocalWrite(edit.path, edit.after, edit.beforeMode, mode => written.push({ edit, mode }));
    }
    const verified = checkLocalIgnore({ ...plan, edits: [], trackedOutputs: [] });
    if (verified.missing.length) throw new Error(`Regras humanas reabrem derivados locais: ${verified.missing.join(', ')}`);
  } catch (error) {
    const rollbackErrors = [];
    for (const { edit, mode } of written.reverse()) {
      try {
        if (localRead(edit.path) !== edit.after || localMode(edit.path) !== mode) continue;
        if (edit.before === null) rmSync(edit.path, { force: true }); else atomicLocalWrite(edit.path, edit.before, edit.beforeMode);
      } catch (failure) { rollbackErrors.push(failure); }
    }
    if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], `${error.message}; rollback incompleto: ${rollbackErrors.map(failure => failure.message).join('; ')}`, { cause: error });
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
  const top = canonicalExisting(location.stdout.trimEnd()), prefix = portable(relative(top, localRoot(plan.root).root));
  const paths = plan.paths.map(path => prefix ? `${prefix}/${path}` : path);
  const result = gitCommand(top, ['rm', '--cached', '--pathspec-from-file=-', '--pathspec-file-nul'], paths.join('\0') + '\0');
  if (result.status !== 0 || result.error) throw new Error(result.error?.message || result.stderr || 'Falha ao desindexar derivados.');
  return { removed: [...plan.paths] };
}

// Reconstitui apenas entradas removidas; o índice atual e alterações concorrentes
// permanecem. O lock é do próprio Git e o trabalho ocorre numa cópia desse índice.
export function restoreUntrack(plan) {
  if (!plan?.paths?.length) return { restored: [], preserved: [] };
  const located = gitCommand(plan.root, ['rev-parse', '--show-toplevel', '--git-path', 'index']);
  if (located.status !== 0 || located.error) throw new Error('Nao foi possivel localizar o indice para rollback.');
  const [reportedTop, relativeIndex] = located.stdout.trimEnd().split(/\r?\n/);
  const reportedIndex = resolve(plan.root, relativeIndex);
  checkedLocalPath(reportedIndex);
  const top = canonicalExisting(reportedTop), indexPath = canonicalExisting(reportedIndex);
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
    const prefix = portable(relative(top, localRoot(plan.root).root));
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
