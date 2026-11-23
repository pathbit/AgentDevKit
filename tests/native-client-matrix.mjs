#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { command, outputParent } from './project-matrix.mjs';
import { buildCatalog } from '../.pbai4devs/scripts/lib/catalog.mjs';
import { adapters } from '../src/adapters/index.mjs';

const usage = 'Uso: node tests/native-client-matrix.mjs --package <diretório> --version <versão> [--output <diretório>]';
const hash = text => createHash('sha256').update(text).digest('hex');
export function destination(client, kind, item, policy = adapters) {
  const adapter = policy.find(value => value.id === client);
  if (!adapter || !['skills', 'agents'].includes(kind)) throw Error(`Cliente ou recurso não suportado: ${client}/${kind}`);
  const base = item.path.slice('.pbai4devs/'.length);
  const configured = adapter.formats[kind] || 'agrupado';
  const root = kind === 'skills' && configured === 'nenhum' ? adapter.skillFallback : adapter.root;
  if (!root) return null;
  const format = kind === 'skills' && configured === 'nenhum' ? 'agrupado' : configured;
  if (format === 'agrupado') return `${root}/${base}`;
  if (format === 'plano') return kind === 'skills' ? `${root}/skills/${item.name}/SKILL.md` : `${root}/agents/${item.name}.md`;
  if (format === 'arquivo' && kind === 'agents') return `${root}/agents/${item.name}.md`;
  if (format === 'agente' && kind === 'agents') return `${root}/agents/${item.name}.agent.md`;
  throw Error(`Formato não suportado pelo runner: ${client}/${kind}/${format}`);
}
// A checagem é física em cada componente; não garante atomicidade contra troca concorrente.
export function safeRead(project, path, encoding = 'utf8') {
  if (!path || path.split('/').some(part => !part || part === '.' || part === '..' || part.includes('\\'))) throw Error('Caminho inválido.');
  let current = project;
  const root = lstatSync(current);
  if (root.isSymbolicLink() || !root.isDirectory()) throw Error('Raiz inválida ou simbólica.');
  const parts = path.split('/');
  for (const [i, part] of parts.entries()) {
    current = join(current, part);
    const info = lstatSync(current);
    if (info.isSymbolicLink()) throw Error('Link simbólico em caminho verificado.');
    if (i < parts.length - 1 ? !info.isDirectory() : !info.isFile()) throw Error('Tipo de caminho inválido.');
  }
  return readFileSync(current, encoding);
}
export function compareInventory(expected, installed) {
  const result = {};
  for (const type of ['skills', 'agents']) {
    if (!Array.isArray(installed?.[type])) throw Error(`Inventário instalado inválido: ${type}`);
    const key = x => JSON.stringify([x?.id, x?.name, x?.path]);
    const counts = values => { const out = new Map(); for (const item of values) { const k = key(item); out.set(k, (out.get(k) || 0) + 1); } return out; };
    const want = counts(expected[type]), got = counts(installed[type]);
    const duplicates = [];
    for (const field of ['id', 'name', 'path']) { const seen = new Map(); for (const item of installed[type]) { const value = item?.[field]; seen.set(value, (seen.get(value) || 0) + 1); } for (const [value, count] of seen) if (count > 1) duplicates.push({ field, value, count }); }
    result[type] = { missing: [...want.keys()].filter(k => !got.has(k)).map(JSON.parse), extra: [...got.keys()].filter(k => !want.has(k)).map(JSON.parse), duplicates };
  }
  return result;
}
export function structural(project, client, kind, item, policy = adapters, packageRoot = project) {
  let path;
  try {
    path = destination(client, kind, item, policy);
    if (!path) return { status: 'unsupported', reason: 'O pacote não declara uma rota para este recurso.' };
    const full = join(project, path), text = safeRead(project, path);
    // Fixtures sem colisões devem ter o apontamento gerado completo, não apenas
    // uma substring que possa estar dentro de código, comentário ou texto escapado.
    const link = text.match(/^---\r?\n(?:(?!---(?:\r?\n|$))[^\r\n]*\r?\n)*---\r?\n\r?\n# [^\r\n]+\r?\n\r?\n<!-- gerado: sincronizar-agentes -->\r?\nLeia e siga \[origem\]\(([^)\r\n]+)\)\.\r?\n?$/);
    if (!link || relative(project, resolve(dirname(full), decodeURIComponent(link[1]))).split('\\').join('/') !== item.path) return { status: 'failed', path, reason: 'apontamento gerado divergente' };
    const source = safeRead(project, item.path, null), expected = safeRead(packageRoot, item.path, null);
    const hashes = { sha256: hash(text), sourceSha256: hash(source), expectedSourceSha256: hash(expected) };
    if (!source.equals(expected)) return { status: 'failed', path, reason: 'origem instalada diverge do pacote', ...hashes };
    return { status: 'passed', path, ...hashes };
  } catch (error) { return { status: 'failed', path, reason: error.code || error.message }; }
}
export function discovery(client, kind, item, output, project, policy = adapters) {
  if (client === 'copilot' && kind === 'skills') {
    try {
      const parsed = JSON.parse(output);
      if (!Array.isArray(parsed)) return false;
      const matches = parsed.filter(row => row?.name === item.name);
      const expected = dirname(join(project, destination(client, kind, item, policy)));
      return matches.length === 1 && matches[0].source === 'project' &&
        matches[0].enabled === true && typeof matches[0].path === 'string' &&
        resolve(matches[0].path) === resolve(expected);
    } catch { return false; }
  }
  if (client === 'opencode' && kind === 'agents') {
    try {
      const text = safeRead(project, destination(client, kind, item, policy));
      const match = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n(?:\r?\n)?([\s\S]*?)\s*$/);
      const parsed = JSON.parse(output);
      if (!match || !Array.isArray(parsed)) return false;
      const candidates = parsed.filter(row => row.id === item.name);
      return candidates.length === 1 && candidates[0].name === item.name && candidates[0].system === match[1];
    } catch { return false; }
  }
  return null;
}
function options(args) {
  const out = {};
  while (args.length) {
    const key = args.shift(); if (key === '--help' && !args.length) return { help: true };
    if (!['--package', '--version', '--output'].includes(key) || !args.length || Object.hasOwn(out, key.slice(2))) throw Error(usage);
    const value = args.shift(); if (!value || value.startsWith('--')) throw Error(usage); out[key.slice(2)] = value;
  }
  if (!out.package || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(out.version || '')) throw Error(usage);
  return out;
}
async function main() {
  const opts = options(process.argv.slice(2)); if (opts.help) { console.log(usage); return; }
  if (Number(process.versions.node.split('.')[0]) < 24) throw Error('Use Node 24+ já instalado.');
  const pkg = realpathSync(resolve(opts.package)), meta = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'));
  if (meta.name !== '@pathbit/agentdevkit' || meta.version !== opts.version) throw Error('Pacote ou versão divergente.');
  const cli = join(pkg, 'bin/agentdevkit.mjs'); if (!statSync(cli).isFile()) throw Error('CLI não encontrada.');
  const directory = mkdtempSync(join(outputParent(opts.output), 'adk-native-matrix-')); const rows = [], cases = [];
  let catalog, policy;
  try {
    const adapterModule = await import(pathToFileURL(join(pkg, '.pbai4devs/scripts/lib/adapters.mjs')).href);
    const catalogModule = await import(pathToFileURL(join(pkg, '.pbai4devs/scripts/lib/catalog.mjs')).href);
    policy = adapterModule.adapters;
    if (!Array.isArray(policy) || !policy.length || typeof catalogModule.buildCatalog !== 'function') throw Error('Contrato de adaptadores ou catálogo não reconhecido.');
    for (const adapter of policy) for (const kind of ['skills', 'agents']) {
      const format = adapter.formats?.[kind] || 'agrupado';
      if (!['agrupado', 'plano', 'arquivo', 'agente', 'nenhum'].includes(format) || format === 'nenhum' && kind !== 'skills') throw Error(`Formato não reconhecido: ${adapter.id}/${kind}/${format}.`);
    }
    catalog = catalogModule.buildCatalog(pkg).catalog;
    if (!catalog.skills.length || !catalog.agents.length) throw Error('Inventário de skills ou perfis vazio.');
  } catch (error) {
    const report = join(directory, 'RESULT.json');
    writeFileSync(report, JSON.stringify({ schemaVersion: 1, package: `${meta.name}@${meta.version}`, node: process.version, cases, rows, error: `Política ou inventário das fontes: ${error.message}` }, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    console.log(JSON.stringify({ report, cases: 0, rows: 0, failed: true })); process.exitCode = 1; return;
  }
  const envBase = Object.fromEntries(['PATH', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
  for (const client of policy.map(adapter => adapter.id)) for (const kind of ['new', 'existing']) {
    const caseDir = join(directory, `${client}-${kind}`), project = join(caseDir, 'project'), home = join(caseDir, 'home');
    const entry = { client, projectKind: kind, project, init: { status: 'blocked' }, discovery: { status: ['opencode', 'copilot'].includes(client) ? 'blocked' : 'not-run' } }; cases.push(entry);
    let observed = null, caseError = null;
    try {
    mkdirSync(project, { recursive: true, mode: 0o700 }); mkdirSync(home, { mode: 0o700 });
    for (const dir of ['config', 'cache', 'data', 'state', 'tmp']) mkdirSync(join(caseDir, dir), { mode: 0o700 });
    const env = { ...envBase, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: join(caseDir, 'config'), XDG_CACHE_HOME: join(caseDir, 'cache'), XDG_DATA_HOME: join(caseDir, 'data'), XDG_STATE_HOME: join(caseDir, 'state'), TMPDIR: join(caseDir, 'tmp'), TMP: join(caseDir, 'tmp'), TEMP: join(caseDir, 'tmp'), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(caseDir, 'empty-gitconfig'), GIT_TERMINAL_PROMPT: '0', npm_config_offline: 'true', NO_COLOR: '1' };
    writeFileSync(env.GIT_CONFIG_GLOBAL, '', { mode: 0o600, flag: 'wx' });
    if (kind === 'existing') { writeFileSync(join(project, 'README.md'), '# Projeto sintético\nConteúdo preexistente.\n'); writeFileSync(join(project, '.gitignore'), '# regra sintética\nprivate/\n'); }
    const invoke = async (label, file, args) => {
      const result = await command(file, args, project, env, 60000);
      for (const stream of ['stdout', 'stderr']) writeFileSync(join(caseDir, `${label}.${stream}.log`), result[stream], { mode: 0o600, flag: 'wx' });
      return { ...result, stdoutLog: join(caseDir, `${label}.stdout.log`), stderrLog: join(caseDir, `${label}.stderr.log`) };
    };
    const init = await invoke('init', process.execPath, [cli, 'init', '--target', project, '--agents', client, '--yes', '--json']);
    const good = r => r.status === 0 && !r.error && !r.timedOut && !r.exceeded;
    let initOk = false; try { initOk = good(init) && JSON.parse(init.stdout).ok === true; } catch { /* saída inválida */ }
    entry.init = { status: initOk ? 'passed' : 'failed', log: init.stdoutLog, stderr: init.stderrLog };
    if (!initOk) throw Error('Instalação falhou.');
    const installedCatalog = JSON.parse(safeRead(project, '.pbai4devs/catalog.json'));
    entry.inventory = compareInventory(catalog, installedCatalog);
    if (kind === 'existing') entry.fixturePreserved = safeRead(project, 'README.md') === '# Projeto sintético\nConteúdo preexistente.\n' && safeRead(project, '.gitignore') === '# regra sintética\nprivate/\n';
    if (['opencode', 'copilot'].includes(client)) {
      const version = await invoke('version', client, ['--version']);
      const query = client === 'copilot' ? ['skill', 'list', '--json'] : ['debug', 'agents', '--standalone'];
      observed = await invoke('discovery', client, query);
      entry.version = good(version) ? version.stdout.trim() : null;
      entry.discovery = { status: good(observed) ? 'completed' : 'blocked', log: observed.stdoutLog, stderr: observed.stderrLog, exitCode: observed.status, error: observed.error, timedOut: observed.timedOut, exceeded: observed.exceeded };
    }
    } catch (error) { caseError = error.message; entry.error = caseError; }
    for (const type of ['skills', 'agents']) for (const item of catalog[type]) {
      const structure = entry.init.status === 'passed' ? structural(project, client, type, item, policy, pkg) : { status: 'blocked', reason: caseError || 'Instalação indisponível.' };
      const supported = (client === 'copilot' && type === 'skills') || (client === 'opencode' && type === 'agents');
      const validObservation = observed && entry.discovery.status === 'completed';
      const found = validObservation && supported && structure.status === 'passed' ? discovery(client, type, item, observed.stdout, project, policy) : null;
      rows.push({ client, projectKind: kind, type, id: item.id, name: item.name, source: item.path, structure,
        discovery: { status: !supported ? 'not-run' : !validObservation || structure.status !== 'passed' ? 'blocked' : found ? 'observed' : 'not-observed', evidence: supported && observed ? observed.stdoutLog : null },
        execution: { status: 'not-run', reason: 'Inferência não executada por este runner.' } });
    }
  }
  const report = { schemaVersion: 1, package: `${meta.name}@${meta.version}`, node: process.version, cases, rows,
    limitations: ['A estrutura verifica apontamento gerado e bytes da origem contra o pacote, não comportamento; não inclui colisões humanas.', 'Descoberta só é observada para skills Copilot e perfis OpenCode; as demais combinações e clientes não foram testados; apontamentos podem ser apenas referências.', 'Não invoca inferência nem executa fluxos; leitura ou descoberta não provam execução.', 'O runner usa clientes e pacote confiáveis com permissões do usuário: HOME e variáveis isolados não são sandbox de sistema nem bloqueiam rede.', 'No Windows ACL e encerramento de descendentes não são garantidos.', 'Logs podem conter dados emitidos pelos processos; projetos e configurações gerados são sintéticos.', 'A checagem de links não é atômica contra trocas concorrentes.', 'Aplica os adaptadores e o construtor de catálogo exportados pelo pacote; contratos desconhecidos bloqueiam a prova.'] };
  const file = join(directory, 'RESULT.json'); writeFileSync(file, JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  const failed = cases.some(c => c.init.status !== 'passed' || !['completed', 'not-run'].includes(c.discovery?.status) || c.fixturePreserved === false || c.error || !c.inventory || Object.values(c.inventory).some(x => x.missing.length || x.extra.length || x.duplicates.length)) || rows.some(r => r.structure.status === 'failed' || r.discovery.status === 'not-observed');
  console.log(JSON.stringify({ report: file, cases: cases.length, rows: rows.length, failed })); if (failed) process.exitCode = 1;
}
let entry = false; try { entry = Boolean(process.argv[1]) && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url)); } catch { /* importação */ }
if (entry) main().catch(error => { console.error(error.message); process.exitCode = 1; });
