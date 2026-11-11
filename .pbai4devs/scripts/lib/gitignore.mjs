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
