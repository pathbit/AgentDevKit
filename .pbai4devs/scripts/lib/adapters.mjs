import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { resourcePath } from './resource-path.mjs';
import { isGeneratedOutput } from './gitignore.mjs';

const policy = JSON.parse(readFileSync(new URL('../../templates/clients/ADAPTERS.json', import.meta.url), 'utf8'));
const kinds = new Set(['skills', 'agents', 'commands', 'rules']);
const layouts = new Set(['agrupado', 'plano', 'arquivo', 'mdc', 'agente', 'prompt', 'instrucoes']);
const entryNames = new Set(['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']);
const safeRoot = value => typeof value === 'string' && /^\.[a-z0-9][a-z0-9-]*$/.test(value) && !['.git', '.pbai4devs', '.agent-tests'].includes(value);
const stringList = value => Array.isArray(value) && value.every(item => typeof item === 'string');
if (policy.schemaVersion !== 1 || !Array.isArray(policy.adapters) || !policy.adapters.length || !stringList(policy.entrypoints) || policy.entrypoints.some(name => !entryNames.has(name))) throw new Error('Politica de clientes invalida.');
const ids = new Set(), roots = new Set(), aliases = {};
for (const adapter of policy.adapters) {
  if (!adapter || typeof adapter.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(adapter.id) || adapter.id === 'all' || ids.has(adapter.id) || typeof adapter.name !== 'string' || !safeRoot(adapter.root) || roots.has(adapter.root) || !adapter.formats || Object.entries(adapter.formats).some(([kind, layout]) => !kinds.has(kind) || !layouts.has(layout))) throw new Error('Adaptador invalido.');
  if (/[\r\n]/.test(adapter.name) || typeof adapter.reason !== 'string' || /[\r\n]/.test(adapter.reason) || (adapter.discovery !== undefined && adapter.discovery !== 'antigravity')) throw new Error('Descricao ou descoberta de adaptador invalida.');
  for (const field of ['aliases', 'requires', 'extraRoots', 'entrypoints', 'sources']) if (!stringList(adapter[field])) throw new Error('Lista invalida no adaptador: ' + field);
  if (adapter.extraRoots.some(root => !safeRoot(root)) || adapter.entrypoints.some(name => !entryNames.has(name)) || adapter.sources.some(url => !url.startsWith('https://'))) throw new Error('Caminho ou fonte invalida no adaptador.');
  for (const field of ['agentMetadata', 'ruleMetadata']) if (adapter[field] !== undefined && !/^[a-z0-9-]+\.ya?ml$/.test(adapter[field])) throw new Error('Metadados invalidos no adaptador.');
  ids.add(adapter.id); roots.add(adapter.root);
}
for (const adapter of policy.adapters) {
  if (adapter.requires.some(id => !ids.has(id))) throw new Error('Dependencia de adaptador desconhecida.');
  for (const alias of adapter.aliases) {
    if (!/^[a-z][a-z0-9-]*$/.test(alias) || ids.has(alias) || alias === 'all' || Object.hasOwn(aliases, alias)) throw new Error('Alias de adaptador invalido.');
    aliases[alias] = adapter.id;
  }
}
export const adapters = Object.freeze(policy.adapters.map(adapter => Object.freeze(adapter)));
export const availableClients = Object.freeze([
  Object.freeze({ id: 'all', name: 'Todos os clientes', aliases: Object.freeze([]) }),
  ...adapters.map(({ id, name, root, aliases }) => Object.freeze({ id, name, root, aliases })),
]);
export const adapterRoots = Object.freeze([...new Set(adapters.flatMap(adapter => [adapter.root, ...adapter.extraRoots]))]);

export function normalizeClients(input) {
  if (input === undefined) return ['all'];
  const values = typeof input === 'string' ? [input] : input;
  if (!Array.isArray(values) || !values.length || values.some(value => typeof value !== 'string')) throw new Error('Selecione ao menos um cliente valido.');
  const selected = new Set();
  for (const value of values) for (const part of value.split(',')) {
    const requested = part.trim().toLowerCase(), id = aliases[requested] ?? requested;
    if (!availableClients.some(client => client.id === id)) throw new Error('Cliente desconhecido: ' + (part || '(vazio)'));
    selected.add(id);
  }
  if (selected.has('all')) {
    if (selected.size !== 1) throw new Error('all nao pode ser combinado com outros clientes.');
    return ['all'];
  }
  return adapters.filter(adapter => selected.has(adapter.id)).map(adapter => adapter.id);
}

export function resolveAdapters(input) {
  const clients = normalizeClients(input), all = clients.includes('all');
  const requested = all ? adapters.map(adapter => adapter.id) : clients;
  const selected = new Set(requested);
  for (const id of selected) for (const required of adapters.find(adapter => adapter.id === id).requires) selected.add(required);
  const resolved = adapters.filter(adapter => selected.has(adapter.id));
  const roots = [...new Set(resolved.flatMap(adapter => [adapter.root, ...adapter.extraRoots]))];
  const selectedEntries = new Set([...policy.entrypoints, ...adapters.filter(adapter => requested.includes(adapter.id)).flatMap(adapter => adapter.entrypoints)]);
  const entrypoints = [...entryNames].filter(name => selectedEntries.has(name));
  return { clients, adapters: resolved, roots, entrypoints };
}
const principal = { skills: 'SKILL.md', agents: 'AGENT.md', commands: 'COMMAND.md', rules: 'RULE.md' };
const stat = path => { try { return lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };

function checked(root, relative) {
  let path = root;
  for (const part of relative.split('/')) {
    if (!part || part === '.' || part === '..') throw new Error(`Caminho de adaptador invalido: ${relative}`);
    if (stat(path)?.isDirectory() && readdirSync(path).some(name => name.toLowerCase() === part.toLowerCase() && name !== part)) throw new Error(`Capitalizacao ambigua: ${relative}`);
    path = join(path, part);
    if (stat(path)?.isSymbolicLink()) throw new Error(`Link simbolico no adaptador: ${relative}`);
  }
  return path;
}

function sources(root, kind) {
  const result = [];
  function visit(relative) {
    const path = checked(root, relative);
    const item = stat(path);
    if (!item) return;
    if (!item.isDirectory()) throw new Error(`Diretorio de recursos invalido: ${relative}`);
    for (const name of readdirSync(path).sort()) {
      const child = `${relative}/${name}`, file = checked(root, child), info = stat(file);
      if (isGeneratedOutput(child, info.isDirectory())) continue;
      if (info.isDirectory()) visit(child);
      else if (info.isFile() && name === principal[kind]) result.push(child);
    }
  }
  visit(`.pbai4devs/${kind}`);
  return result;
}

export function adapterManifest(root, { clients } = {}) {
  const selection = resolveAdapters(clients);
  root = realpathSync(resolve(root));
  const rows = ['# Gerado por AgentDevKit; sincronizacao instalada nao depende do pacote npm.', '# tipo|cliente|recurso ou layout|formato ou metadados'];
  const resources = Object.fromEntries(Object.keys(principal).map(kind => [kind, sources(root, kind)]));
  for (const adapter of selection.adapters) {
    rows.push(`# ${adapter.id}: ${adapter.reason}`, `agente|${adapter.root}|agrupado`);
    for (const [kind, mode] of Object.entries(adapter.formats)) rows.push(`formato|${adapter.root}|${kind}|${mode}`);
    if (adapter.discovery) rows.push(`descoberta|${adapter.root}|${adapter.discovery}`);
    for (const [kind, key] of [['agents', 'agentMetadata'], ['rules', 'ruleMetadata']]) {
      if (!adapter[key]) continue;
      for (const source of resources[kind]) {
        const metadata = `${source.slice(0, source.lastIndexOf('/'))}/${adapter[key]}`;
        if (!stat(checked(root, metadata))?.isFile()) continue;
        const target = `${adapter.root}/${resourcePath(source, kind, adapter.formats[kind] || 'agrupado')}`;
        rows.push(`nativo|${target}|${source}|${metadata}`);
      }
    }
  }
  if (selection.roots.includes('.vscode')) rows.push('gitignore|.vscode');
  return rows.join('\n') + '\n';
}

// Somente configura a politica. O chamador decide quando planejar/aplicar o sync.
export function writeAdapterManifest(root, { clients } = {}) {
  const selection = resolveAdapters(clients);
  root = realpathSync(resolve(root));
  const relative = '.pbai4devs/espelhos.conf';
  const file = checked(root, relative), content = adapterManifest(root, { clients: selection.clients });
  const info = stat(file);
  if (info && !info.isFile()) throw new Error('espelhos.conf deve ser arquivo regular.');
  const result = { clients: selection.clients, roots: selection.roots, entrypoints: selection.entrypoints };
  if (info && readFileSync(file, 'utf8') === content) return { changed: [], ...result };
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${randomUUID()}`;
  try { writeFileSync(temporary, content, { flag: 'wx' }); renameSync(temporary, file); }
  finally { rmSync(temporary, { force: true }); }
  return { changed: [relative], ...result };
}
