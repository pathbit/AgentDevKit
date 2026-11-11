#!/usr/bin/env node
// Planeja em memória; somente os caminhos gerenciados pelo manifesto são alterados.
import { cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { requireNode, projectRoot, isMain } from '../lib/runtime.mjs';
import { buildCatalog } from '../lib/catalog.mjs';
import { resourcePath } from '../lib/resource-path.mjs';
import { adapterManifest, resolveAdapters } from '../lib/adapters.mjs';
import { mergeGitignore, validateIgnoreClients, renderClientIgnore, isGeneratedOutput, planLocalIgnore, applyLocalIgnore, checkLocalIgnore, ignoreBegin, ignoreEnd } from '../lib/gitignore.mjs';

const marker = '<!-- gerado: sincronizar-agentes -->';
const tomlMarker = '# gerado: sincronizar-agentes';
const principals = { skills: 'SKILL.md', agents: 'AGENT.md', commands: 'COMMAND.md', rules: 'RULE.md' };
const auxiliary = ['templates', 'scripts', 'tools', 'external-skills', 'estado', 'tests', 'docs', 'adapters'];
const reserved = new Set(['.git', '.pbai4devs', '.agent-tests']);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sorted = values => [...new Set(values)].sort(compare);
const layouts = new Set(['agrupado', 'plano', 'arquivo', 'mdc', 'instrucoes', 'prompt', 'agente']);
const fail = message => { throw new Error(message); };
const normalize = text => text.replace(/\r\n?/g, '\n');
const read = file => normalize(readFileSync(file, 'utf8'));
const stat = file => {
  try { return lstatSync(file); }
  catch (error) { if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null; throw error; }
};

export function header(text) {
  const lines = normalize(text).split('\n');
  if (lines[0] !== '---') fail('Frontmatter YAML ausente.');
  const end = lines.indexOf('---', 1);
  if (end < 0) fail('Frontmatter YAML sem fechamento.');
  return lines.slice(0, end + 1).join('\n') + '\n';
}

export function isReference(text) {
  let body = normalize(text);
  if (body.startsWith(tomlMarker + '\n')) {
    const lines = body.trimEnd().split('\n');
    if (lines.length !== 3 || !lines[1].startsWith('description = ') || !lines[2].startsWith('prompt = ')) return false;
    try {
      const description = JSON.parse(lines[1].slice('description = '.length));
      const prompt = JSON.parse(lines[2].slice('prompt = '.length));
      const match = typeof prompt === 'string' && prompt.match(/^@\{(\.pbai4devs\/commands\/[^{}\r\n]+\/COMMAND\.md)\}\n\n\{\{args\}\}$/);
      return typeof description === 'string' && Boolean(description.trim()) && Boolean(match) && !match[1].split('/').some(part => part === '..' || part === '.');
    } catch { return false; }
  }
  if (body.startsWith('---\n')) {
    try { body = body.slice(header(body).length); } catch { return false; }
  }
  let title = false;
  const action = [];
  for (const line of body.split('\n')) {
    if (!line.trim() || line === marker) continue;
    if (!title && line.startsWith('# ')) { title = true; continue; }
    action.push(line);
  }
  const instruction = action.join(' ').replace(/\s+/g, ' ').replace(/\) \.$/, ').');
  return title && (/^(Leia e siga|Leia) \[[^\]]+\]\([^)]*\)( ao realizar operações Git)?\.$/.test(instruction) || /^@\[[^\]\r\n]+\](?:\([^)]*\))?$/.test(instruction));
}

function topPaths(paths) {
  const result = [];
  for (const path of sorted(paths)) if (!result.some(parent => path.startsWith(parent + '/'))) result.push(path);
  return result;
}

function link(target, source) {
  return posix.relative(posix.dirname(target), source).split('/').map(part => encodeURIComponent(part).replace(/[!'()*]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase())).join('/');
}

export { resourcePath } from '../lib/resource-path.mjs';

export function synchronize({ root = projectRoot, check = false, force = false, localIgnores = true, generateEntrypoints = true, output = console.log } = {}) {
  requireNode();
  root = realpathSync(resolve(root));
  const absolute = value => join(root, ...value.split('/'));
  function safe(value) {
    if (typeof value !== 'string' || !value || /^[A-Za-z]:/.test(value) || /[|\\\x00-\x1f\x7f]/.test(value) || value.split('/').some(part => !part || part === '.' || part === '..')) fail(`Caminho invalido: ${value}`);
    let current = root;
    for (const part of value.split('/')) {
      const parent = stat(current);
      if (parent?.isDirectory()) {
        const aliases = readdirSync(current).filter(name => name.toLowerCase() === part.toLowerCase());
        if (aliases.some(name => name !== part)) fail(`Caminhos diferem somente por maiusculas/minusculas: ${value}`);
      }
      current = join(current, part);
      if (stat(current)?.isSymbolicLink()) fail(`Link simbolico: ${value}`);
    }
    return current;
  }
  function scan(value, { markdownOnly = false, prune = false } = {}) {
    const path = safe(value);
    const item = stat(path);
    if (!item) return [];
    if (item.isFile()) return !markdownOnly || value.endsWith('.md') ? [value] : [];
    if (!item.isDirectory()) fail(`Tipo de arquivo nao suportado: ${value}`);
    const files = [];
    function visit(folder) {
      for (const name of readdirSync(safe(folder)).sort(compare)) {
        const child = `${folder}/${name}`;
        const info = stat(safe(child));
        if (prune && isGeneratedOutput(child, info.isDirectory())) continue;
        if (info.isDirectory()) {
          files.push(...scan(child, { markdownOnly, prune }));
        } else if (info.isFile()) {
          if (!markdownOnly || name.endsWith('.md')) files.push(child);
        } else fail(`Tipo de arquivo nao suportado: ${child}`);
      }
    }
    visit(value);
    return files;
  }
  const referenceFile = value => {
    const info = stat(safe(value));
    return Boolean(info?.isFile() && info.size <= 1024 * 1024 && isReference(read(absolute(value))));
  };
  const onlyReferences = value => scan(value).every(file => /\.(md|mdc|toml)$/.test(file) && referenceFile(file));
  const protectedPath = value => /^(workflows(?:\/|$)|settings\.json$|extensions\.json$)/.test(value.slice(value.indexOf('/') + 1).toLowerCase());
  const agents = new Map();
  const formats = new Map();
  const discoveries = new Set();
  const ignoreRoots = new Set();
  const natives = [];
  const legacy = [];
  const config = '.pbai4devs/espelhos.conf';
  const configExists = stat(safe(config));
  const stateFile = '.pbai4devs/estado/agentdevkit.json';
  const installed = stat(safe(stateFile)) ? JSON.parse(read(safe(stateFile))) : null;
  const configText = configExists ? read(safe(config)) : adapterManifest(root, { clients: installed?.clients });
  const rows = configText.split('\n');
  function ignoreRoot(target) {
    if (!/^\.[^/]+$/.test(target) || reserved.has(target.toLowerCase())) fail(`Pasta de agente invalida: ${target}`);
    const info = stat(absolute(target));
    if (info && !info.isDirectory()) fail(`Pasta de agente nao e diretorio: ${target}`);
    for (const known of ignoreRoots) if (known !== target && known.toLowerCase() === target.toLowerCase()) fail('Raizes de agentes diferem somente por maiusculas/minusculas.');
    ignoreRoots.add(target);
  }
  for (const [index, row] of rows.entries()) {
    if (!row || row.startsWith('#')) continue;
    const fields = row.split('|');
    if (fields.length < 2 || fields.length > 4) fail('Campos invalidos no manifesto.');
    const [type, target, source = '', metadata = ''] = fields;
    safe(target);
    if (type === 'agente') {
      if (fields.length > 3) fail(`Pasta de agente invalida: ${target}`);
      ignoreRoot(target);
      const mode = source || 'agrupado';
      if (!['agrupado', 'plano'].includes(mode)) fail(`Layout invalido: ${mode}`);
      for (const known of agents.keys()) if (known !== target && known.toLowerCase() === target.toLowerCase()) fail('Raizes de agentes diferem somente por maiusculas/minusculas.');
      if (agents.has(target) && agents.get(target) !== mode) fail(`Layouts conflitantes: ${target}`);
      agents.set(target, mode);
    } else if (type === 'formato') {
      if (fields.length !== 4 || !Object.hasOwn(principals, source) || !layouts.has(metadata)) fail(`Formato invalido: ${row}`);
      if (source === 'skills' && !['agrupado', 'plano'].includes(metadata)) fail(`Skills exigem formato agrupado ou plano: ${row}`);
      if ((metadata === 'mdc' || metadata === 'instrucoes') && source !== 'rules' || metadata === 'prompt' && source !== 'commands' || metadata === 'agente' && source !== 'agents') fail(`Formato incompativel com recurso: ${row}`);
      const key = `${target}/${source}`;
      if (formats.has(key)) fail(`Formato duplicado: ${key}`);
      formats.set(key, metadata);
    } else if (type === 'descoberta') {
      if (fields.length !== 3 || target !== '.agents' || source !== 'antigravity' || discoveries.has(target)) fail(`Descoberta invalida: ${row}`);
      discoveries.add(target);
    } else if (type === 'gitignore') {
      if (fields.length !== 2) fail('gitignore aceita somente a pasta de destino.');
      ignoreRoot(target);
    } else if (type === 'documento') legacy.push(index);
    else if (type === 'nativo') {
      safe(source);
      if (metadata) {
        safe(metadata);
        if (posix.dirname(metadata) !== posix.dirname(source) || !/\.ya?ml$/.test(metadata)) fail(`Metadados fora da pasta da origem ou sem YAML: ${metadata}`);
        if (stat(absolute(source))?.isFile()) {
          if (!stat(absolute(metadata))?.isFile()) fail(`Metadados ausentes: ${metadata}`);
          const text = read(absolute(metadata));
          if (text.slice(header(text).length).trim()) fail(`Metadados devem conter apenas YAML: ${metadata}`);
        }
      }
      natives.push({ target, source, metadata, index });
    } else fail(`Tipo invalido no manifesto: ${type}`);
  }
  if (!agents.size) fail('Nenhum agente cadastrado.');
  for (const key of formats.keys()) if (!agents.has(key.split('/')[0])) fail(`Formato fora dos agentes: ${key}`);
  for (const root of discoveries) if (!agents.has(root)) fail(`Descoberta fora dos agentes: ${root}`);
  const managed = value => [...agents.keys()].some(agent => value.startsWith(agent + '/'));
  const built = buildCatalog(root);
  const sources = new Map(Object.keys(principals).flatMap(kind => built.catalog[kind].map(entry => [entry.path, kind])));
  const entries = new Map();
  const folded = new Map();
  function add(target, source, metadata = '') {
    safe(target);
    const alias = folded.get(target.toLowerCase());
    if (alias && alias !== target) fail(`Destinos diferem somente por maiusculas/minusculas: ${target}`);
    const previous = entries.get(target);
    if (previous && (previous.source !== source || (previous.metadata && metadata && previous.metadata !== metadata))) fail(`Destinos ou metadados em conflito: ${target}`);
    entries.set(target, { source, metadata: metadata || previous?.metadata || '' });
    folded.set(target.toLowerCase(), target);
  }
  for (const [source, kind] of sources) {
    for (const [agent, mode] of agents) {
      let path = resourcePath(source, kind, formats.get(`${agent}/${kind}`) || mode);
      if (agent === '.gemini' && kind === 'commands') path = path.replace(/\.md$/, '.toml');
      add(`${agent}/${path}`, source);
    }
  }
  const missing = [];
  for (const native of natives) {
    const { target, source, metadata } = native;
    if (!Object.entries(principals).some(([kind, name]) => source.startsWith(`.pbai4devs/${kind}/`) && source.slice(`.pbai4devs/${kind}/`.length).includes('/') && posix.basename(source) === name)) fail(`Origem exclusiva de .pbai4devs ou documento nao permitido: ${source}`);
    if (stat(absolute(source))?.isFile() && !sources.has(source)) fail(`Origem nativa fora do catalogo canonico: ${source}`);
    if (!managed(target)) fail(`Destino nativo fora dos agentes: ${target}`);
    const scope = target.split('/')[1].toLowerCase();
    const geminiCommand = target.startsWith('.gemini/commands/') && target.endsWith('.toml') && source.startsWith('.pbai4devs/commands/') && posix.basename(source) === 'COMMAND.md';
    if (target.startsWith('.gemini/commands/') && !geminiCommand) fail(`Comando Gemini exige TOML e origem COMMAND.md: ${target}`);
    if ([...auxiliary, 'workflows'].includes(scope) || ['readme.md', 'instructions.md'].includes(posix.basename(target).toLowerCase()) || (!/\.(md|mdc)$/i.test(target) && !geminiCommand)) fail(`Destino nativo nao permitido: ${target}`);
    if (geminiCommand && metadata) fail(`Comando Gemini usa metadados da origem, sem YAML separado: ${target}`);
    if (stat(absolute(source))?.isFile()) add(target, source, metadata);
    else missing.push(native);
  }
  const targets = sorted(entries.keys());
  for (const target of targets) {
    const parts = target.split('/');
    while (parts.length > 1) {
      parts.pop();
      if (folded.has(parts.join('/').toLowerCase())) fail(`Destino e ancestral de outro destino: ${target}`);
    }
  }
  const remove = new Set();
  const backup = new Set();
  const conflicts = new Set();
  const expected = new Map();
  const changed = [];
  function planRemove(value, custom = false) {
    safe(value);
    if (!managed(value) || protectedPath(value)) fail(`Limpeza fora dos espelhos ou caminho protegido: ${value}`);
    remove.add(value);
    if (custom) backup.add(value);
  }
  function cleanScope(value) {
    if (!stat(safe(value))) return;
    if (force && value.split('/')[1] === 'external-skills') planRemove(value, true);
    else if (onlyReferences(value)) planRemove(value);
    else if (force) planRemove(value, true);
    else conflicts.add(value);
  }
  const registries = new Map();
  for (const [target, content] of built.outputs) {
    const info = stat(safe(target));
    if (info && !info.isFile()) fail(`Registro nao e arquivo: ${target}`);
    if (!info || readFileSync(absolute(target), 'utf8') !== content) {
      registries.set(target, content);
      if (force && info) backup.add(target);
    }
  }
  for (const agent of discoveries) {
    for (const kind of ['skills', 'rules', 'agents']) {
      const manifest = `${agent}/${kind}.json`;
      const paths = [...entries].filter(([target, value]) => target.startsWith(`${agent}/`) && sources.get(value.source) === kind)
        .map(([target]) => kind === 'skills' ? posix.dirname(target) : target).sort(compare);
      const content = JSON.stringify({ entries: paths.map(path => ({ path })) }, null, 2) + '\n';
      const info = stat(safe(manifest));
      if (info && !info.isFile()) fail(`Registro nao e arquivo: ${manifest}`);
      if (!info || readFileSync(absolute(manifest), 'utf8') !== content) {
        let managedManifest = false;
        if (info) {
          try {
            const previous = JSON.parse(read(absolute(manifest)));
            managedManifest = Object.keys(previous).length === 1 && Array.isArray(previous.entries) && previous.entries.every(entry =>
              entry && Object.keys(entry).length === 1 && typeof entry.path === 'string' && entry.path.startsWith(`${agent}/${kind}/`) && !entry.path.split('/').some(part => !part || part === '..' || part === '.')
            );
          } catch { /* Um manifesto customizado ou corrompido requer --force e backup. */ }
        }
        if (info && !managedManifest && !force) conflicts.add(manifest);
        if (info && force) backup.add(manifest);
        registries.set(manifest, content);
      }
    }
  }
  const ignoreFiles = new Map();
  const clientSettingsPath = '.pbai4devs/templates/gitignore/clients.json';
  if (!stat(safe(clientSettingsPath))?.isFile()) fail(`Configuracao .gitignore ausente: ${clientSettingsPath}`);
  const ignoreClients = validateIgnoreClients(JSON.parse(read(absolute(clientSettingsPath))));
  const ignoreTemplates = new Map([
    ['.pbai4devs/.gitignore', '.pbai4devs/templates/gitignore/shared.ignore'],
    ...sorted(ignoreRoots).map(folder => [`${folder}/.gitignore`, '.pbai4devs/templates/gitignore/agents.ignore']),
  ]);
  for (const [target, template] of ignoreTemplates) {
    if (!stat(safe(template))?.isFile()) fail(`Template .gitignore ausente ou invalido: ${template}`);
    const info = stat(safe(target));
    if (info && !info.isFile()) fail(`.gitignore nao e arquivo: ${target}`);
    let merged;
    const current = info ? readFileSync(absolute(target), 'utf8') : '';
    try {
      let patterns = readFileSync(absolute(template), 'utf8');
      if (target !== '.pbai4devs/.gitignore') patterns = renderClientIgnore(patterns, ignoreClients[posix.dirname(target)]);
      merged = mergeGitignore(current, patterns);
    }
    catch (error) { fail(`${target}: ${error.message}`); }
    if (merged.text !== current) {
      ignoreFiles.set(target, merged.text);
      if (force && info && merged.hasBlock) backup.add(target);
    }
  }
  for (const target of targets) {
    const { source, metadata } = entries.get(target);
    let ancestor = posix.dirname(target);
    while (ancestor.includes('/')) {
      const info = stat(safe(ancestor));
      if (info && !info.isDirectory()) {
        if (force) planRemove(ancestor, true); else conflicts.add(ancestor);
      }
      ancestor = posix.dirname(ancestor);
    }
    const info = stat(safe(target));
    if (info && (!info.isFile() || !referenceFile(target))) {
      scan(target);
      if (force) planRemove(target, true); else conflicts.add(target);
    }
    const sourceText = read(safe(source));
    if (target.startsWith('.gemini/commands/') && target.endsWith('.toml')) {
      if (/[{}]/.test(source)) fail(`Caminho incompativel com inclusao Gemini: ${source}`);
      const command = built.catalog.commands.find(entry => entry.path === source);
      if (!command) fail(`Comando Gemini exige COMMAND.md: ${source}`);
      const content = `${tomlMarker}\ndescription = ${JSON.stringify(command.description)}\nprompt = ${JSON.stringify(`@{${source}}\n\n{{args}}`)}\n`;
      expected.set(target, content);
      if (!info?.isFile() || readFileSync(absolute(target), 'utf8') !== content) changed.push(target);
      continue;
    }
    let frontmatter;
    if (metadata) frontmatter = header(read(safe(metadata)));
    else if (target.endsWith('.mdc')) {
      const rule = built.catalog.rules.find(entry => entry.path === source);
      if (!rule) fail(`Regra Cursor exige RULE.md: ${source}`);
      frontmatter = `---\ndescription: ${JSON.stringify(rule.trigger === 'manual' ? '' : rule.description)}\nalwaysApply: ${rule.trigger === 'always_on'}\n${rule.trigger === 'glob' ? `globs: ${JSON.stringify(rule.globs)}\n` : ''}---\n`;
    } else frontmatter = target.endsWith('.instructions.md') ? "---\napplyTo: '**'\n---\n" : header(sourceText);
    const title = sourceText.match(/^# .+$/m)?.[0];
    if (!title) fail(`Titulo ausente: ${source}`);
    const ruleInclusion = /^\.(?:agents|agent)\/rules\//.test(target);
    const inclusion = ruleInclusion ? `@[origem](${link(target, source)})` : `Leia e siga [origem](${link(target, source)}).`;
    const content = `${frontmatter}\n${title}\n\n${marker}\n${inclusion}\n`;
    expected.set(target, content);
    if (!info?.isFile() || readFileSync(absolute(target), 'utf8') !== content) changed.push(target);
  }
  for (const agent of agents.keys()) {
    for (const kind of [...auxiliary, 'README.md', 'INSTRUCTIONS.md']) cleanScope(`${agent}/${kind}`);
    for (const kind of Object.keys(principals)) {
      const scope = `${agent}/${kind}`;
      const info = stat(safe(scope));
      if (!info) continue;
      const files = scan(scope);
      if (!info.isDirectory()) { if (force) planRemove(scope, true); else conflicts.add(scope); continue; }
      for (const file of files) if (!expected.has(file)) {
        if (referenceFile(file)) planRemove(file);
        else if (force) planRemove(file, true);
        else conflicts.add(file);
      }
      function directories(value) {
        for (const name of readdirSync(safe(value))) {
          const child = `${value}/${name}`;
          if (!stat(safe(child))?.isDirectory()) continue;
          if (![...expected.keys()].some(target => target.startsWith(child + '/'))) cleanScope(child);
          directories(child);
        }
      }
      directories(scope);
    }
    for (const file of scan(agent, { markdownOnly: true, prune: true })) {
      if (protectedPath(file) || expected.has(file) || !read(absolute(file)).includes(marker)) continue;
      if (referenceFile(file)) planRemove(file);
      else if (force) planRemove(file, true);
      else conflicts.add(file);
    }
  }
  for (const { target } of missing) cleanScope(target);
  const rootEntries = new Map();
  const entryRegistry = '.pbai4devs/estado/derived.json';
  if (generateEntrypoints) {
    const previous = stat(safe(entryRegistry)) ? JSON.parse(read(safe(entryRegistry))) : { schemaVersion: 1, entries: {} };
    if (previous?.schemaVersion !== 1 || !previous.entries || typeof previous.entries !== 'object' || Array.isArray(previous.entries) || Object.entries(previous.entries).some(([name, hash]) => !['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'].includes(name) || !/^[a-f0-9]{64}$/.test(hash))) fail('Registro de entradas derivadas invalido.');
    const next = { schemaVersion: 1, entries: {} };
    for (const name of resolveAdapters(installed?.clients).entrypoints) {
      const template = `.pbai4devs/templates/entrypoints/${name}`;
      if (!stat(safe(template))?.isFile()) continue;
      const info = stat(safe(name));
      const current = info?.isFile() ? readFileSync(absolute(name)) : null;
      const previousHash = previous.entries[name] ?? installed?.files?.[name];
      if (info && (!current || createHash('sha256').update(current).digest('hex') !== previousHash)) continue;
      if (current && createHash('sha256').update(current).digest('hex') === installed?.files?.[name]) {
        rootEntries.set(name, current.toString('utf8'));
        continue;
      }
      const content = readFileSync(absolute(template), 'utf8');
      const nextHash = createHash('sha256').update(content).digest('hex');
      next.entries[name] = nextHash;
      rootEntries.set(name, content);
    }
    const content = JSON.stringify(next, null, 2) + '\n';
    if ((Object.keys(next.entries).length || stat(safe(entryRegistry))) && (!stat(safe(entryRegistry)) || readFileSync(absolute(entryRegistry), 'utf8') !== content)) registries.set(entryRegistry, content);
  }
  const ownedOutputs = sorted([...targets, ...built.outputs.keys(), '.pbai4devs/espelhos.conf', ...rootEntries.keys(), ...(generateEntrypoints && (stat(safe(entryRegistry)) || registries.has(entryRegistry)) ? [entryRegistry] : []),
    ...[...discoveries].flatMap(agent => ['skills', 'rules', 'agents'].map(kind => `${agent}/${kind}.json`)),
    ...[...ignoreTemplates.keys()].filter(target => {
      if (target === '.pbai4devs/.gitignore') return false;
      const content = ignoreFiles.get(target) ?? readFileSync(absolute(target), 'utf8');
      const start = content.indexOf(ignoreBegin), finish = content.indexOf(ignoreEnd);
      return start >= 0 && finish > start && !(content.slice(0, start) + content.slice(finish + ignoreEnd.length)).trim();
    }),
  ]);
  const localPlan = localIgnores ? planLocalIgnore(root, { outputs: ownedOutputs }) : null;
  const localStatus = localPlan ? checkLocalIgnore(localPlan) : { changed: 0, missing: [], trackedOutputs: [] };
  const removals = topPaths(remove);
  const backups = topPaths(backup);
  const rootEntryChanges = [...rootEntries].filter(([name, content]) => !stat(absolute(name)) || readFileSync(absolute(name), 'utf8') !== content);
  const summary = { changed: changed.length + rootEntryChanges.length, stale: removals.length, conflicts: conflicts.size, missing: missing.length, legacy: legacy.length, registries: registries.size, gitignores: ignoreFiles.size, manifests: configExists ? 0 : 1, localIgnores: localStatus.changed + localStatus.missing.length + localStatus.trackedOutputs.length };
  const dirty = Object.values(summary).some(Boolean);
  output(`${summary.changed} desatualizadas; ${summary.stale} obsoletas; ${summary.conflicts} conflitos; ${summary.missing} origens nativas ausentes; ${summary.legacy} documentos antigos; ${summary.registries} indices derivados; ${summary.gitignores} gitignores; ${summary.localIgnores} exclusoes locais.`);
  if (check) return { ...summary, ownedOutputs, exitCode: dirty ? 1 : 0 };
  if (conflicts.size) fail(`Use --force para reconstruir somente os caminhos gerenciados: ${sorted(conflicts).join(', ')}`);
  function atomic(value, text) {
    const target = safe(value);
    mkdirSync(dirname(target), { recursive: true });
    const temporary = `${target}.sync.${randomUUID()}`;
    try { writeFileSync(temporary, text, { flag: 'wx' }); renameSync(temporary, target); }
    finally { rmSync(temporary, { force: true }); }
  }
  let backupRoot;
  if (backups.length) {
    mkdirSync(safe('.agent-tests'), { recursive: true });
    backupRoot = mkdtempSync(join(absolute('.agent-tests'), 'sync-backup.'));
    for (const value of backups) if (stat(safe(value))) {
      const destination = join(backupRoot, ...value.split('/'));
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(absolute(value), destination, { recursive: true, preserveTimestamps: true });
    }
    output(`Backup local: ${posix.join('.agent-tests', backupRoot.slice(backupRoot.lastIndexOf('/') + 1).split('\\').at(-1))}`);
  }
  for (const value of removals) rmSync(safe(value), { recursive: true, force: true });
  for (const value of changed) atomic(value, expected.get(value));
  for (const [value, text] of registries) atomic(value, text);
  for (const [value, text] of ignoreFiles) atomic(value, text);
  for (const [value, text] of rootEntryChanges) atomic(value, text);
  if (localPlan) applyLocalIgnore(localPlan);
  function pruneEmpty(value) {
    if (!stat(safe(value))?.isDirectory()) return;
    for (const name of readdirSync(absolute(value))) if (stat(safe(`${value}/${name}`))?.isDirectory()) pruneEmpty(`${value}/${name}`);
    if (!readdirSync(absolute(value)).length) rmdirSync(absolute(value));
  }
  for (const agent of agents.keys()) for (const kind of [...Object.keys(principals), 'instructions', 'prompts']) pruneEmpty(`${agent}/${kind}`);
  const omittedRows = new Set([...legacy, ...missing.map(native => native.index)]);
  const finalConfig = rows.filter((row, index) => !omittedRows.has(index)).join('\n').replace(/\n*$/, '\n');
  if (!configExists || configText !== finalConfig) atomic(config, finalConfig);
  return { ...summary, ownedOutputs, exitCode: 0, ...(backupRoot ? { backupRoot } : {}) };
}

export function main(args = process.argv.slice(2)) {
  requireNode();
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (option === '--check') options.check = true;
    else if (option === '--force') options.force = true;
    else if (option === '--root') {
      if (!args[index + 1] || args[index + 1].startsWith('--')) fail('--root exige um caminho.');
      options.root = args[++index];
    } else if (option === '--documento') fail('--documento foi removido: somente skills, agents, commands e rules sao sincronizados.');
    else fail(`Opcao desconhecida: ${option}`);
  }
  return synchronize(options).exitCode;
}

if (isMain(import.meta.url)) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}
