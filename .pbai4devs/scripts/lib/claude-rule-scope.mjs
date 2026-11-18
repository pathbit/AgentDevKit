// Planejamento isolado: não lê nem altera arquivos e não comprova equivalência
// com globs de outros clientes. A sintaxe aceita é um subconjunto de YAML.
// YAML inválido no Claude pode ativar uma regra globalmente: em caso de dúvida,
// este módulo bloqueia a geração ou conserva a referência de leitura explícita.

const invalid = reason => ({ ok: false, reason });

function quoted(value) {
  if (/^"(?:[^"\\]|\\.)*"$/.test(value)) {
    try { const parsed = JSON.parse(value); return typeof parsed === 'string' ? parsed : null; } catch { return null; }
  }
  if (/^'(?:[^']|'')*'$/.test(value)) return value.slice(1, -1).replace(/''/g, "'");
  return null;
}

// Restrição deliberada: não interpretar vírgulas, chaves, classes ou escapes
// como glob Claude. São válidos em alguns dialetos, mas não foram comprovados
// por este planejador; nunca se tenta dividi-los ou convertê-los implicitamente.
function safePattern(value) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) return false;
  // JSON aceita surrogates isolados que alguns parsers YAML rejeitam. Claude
  // poderia então ignorar o frontmatter e carregar a regra globalmente.
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  if (/[\x00-\x1f\x7f-\x9f\u2028\u2029\ufffe\uffff\\,{}\[\]]/.test(value) || value.startsWith('!') || value.startsWith('//') || /^[A-Za-z]:/.test(value)) return false;
  const relative = value.startsWith('/') ? value.slice(1) : value;
  return Boolean(relative) && relative.split('/').every(part => part && part !== '.' && part !== '..');
}

/** Lê somente frontmatter de paths com lista JSON ou lista de strings citadas. */
export function parseClaudePaths(text, { metadataOnly = true, allowGlobal = false } = {}) {
  if (typeof text !== 'string') return invalid('metadata-not-text');
  if (Buffer.byteLength(text, 'utf8') > 4 * 1024 * 1024) return invalid('metadata-too-large');
  if (text.includes('\r') && /\r(?!\n)/.test(text)) return invalid('invalid-line-ending');
  const normalized = text.replace(/\r\n/g, '\n');
  if (normalized.startsWith('\uFEFF')) return invalid('bom-not-supported');
  if (!normalized.startsWith('---\n')) return allowGlobal && !normalized.startsWith('---') ? { ok: true, paths: null } : invalid('frontmatter-required');
  const lines = normalized.split('\n');
  const end = lines.indexOf('---', 1);
  if (end < 0) return invalid('frontmatter-unclosed');
  if (metadataOnly && lines.slice(end + 1).some(line => !/^ *$/.test(line))) return invalid('metadata-body-not-allowed');
  const fields = lines.slice(1, end);
  if (fields.some(line => line.includes('\t'))) return invalid('tabs-not-supported');
  if (fields.length === 0 && allowGlobal) return { ok: true, paths: null };
  if (!fields.length || !/^paths:(?: |$)/.test(fields[0])) return invalid('only-paths-supported');
  const rest = fields[0].slice('paths:'.length).replace(/^ +| +$/g, '');
  let paths;
  if (rest) {
    if (fields.length !== 1) return invalid('extra-or-duplicate-fields');
    if (!rest.startsWith('[')) return invalid('paths-list-required');
    try { paths = JSON.parse(rest); } catch { return invalid('invalid-json-list'); }
  } else {
    paths = [];
    for (const line of fields.slice(1)) {
      const match = /^  - (.+)$/.exec(line);
      if (!match) return invalid('invalid-list-entry');
      const entry = quoted(match[1]);
      if (entry === null) return invalid('quoted-string-required');
      paths.push(entry);
    }
  }
  if (!Array.isArray(paths) || !paths.length || paths.some(path => !safePattern(path))) return invalid('unsupported-or-empty-paths');
  if (new Set(paths).size !== paths.length) return invalid('duplicate-paths');
  return { ok: true, paths };
}

/** Produz YAML no subconjunto JSON, validado novamente antes de ser retornado. */
export function serializeClaudePaths(paths) {
  if (!Array.isArray(paths) || !paths.length || paths.some(path => !safePattern(path)) || new Set(paths).size !== paths.length) {
    throw new TypeError('paths deve conter padrões distintos no subconjunto suportado.');
  }
  const serialized = `---\npaths: ${JSON.stringify(paths)}\n---\n`;
  const parsed = parseClaudePaths(serialized);
  if (!parsed.ok || JSON.stringify(parsed.paths) !== JSON.stringify(paths)) throw new Error(`Frontmatter Claude inválido: ${parsed.reason || 'round-trip'}.`);
  return serialized;
}

/**
 * Planeja somente a ativação; não grava nem reconhece propriedade por conteúdo.
 * nativeMetadata é YAML explícito do Claude, não a lista glob de outro cliente.
 * humanFile, quando fornecido, é sempre preservado mesmo se o escopo coincidir.
 */
export function planClaudeRule({ trigger, nativeMetadata, humanFile } = {}) {
  const hasHuman = humanFile !== undefined;
  if (hasHuman && typeof humanFile !== 'string') throw new TypeError('humanFile deve ser texto quando informado.');
  const result = { action: hasHuman ? 'preserve-human' : 'none', equivalence: 'not-verified' };
  if (!['always_on', 'glob', 'manual', 'model_decision'].includes(trigger)) return { ...result, status: 'blocked', reason: 'invalid-trigger' };
  if (trigger !== 'glob' && nativeMetadata !== undefined) return { ...result, status: 'blocked', reason: 'metadata-not-applicable' };
  if (trigger === 'manual' || trigger === 'model_decision' || (trigger === 'glob' && nativeMetadata === undefined)) {
    return { ...result, status: hasHuman ? 'preserved' : 'reference-only', activation: 'explicit-only', nativeDirectory: 'references/rules', reason: trigger === 'glob' ? 'native-scope-not-provided' : 'no-native-equivalent' };
  }
  let paths = null;
  if (trigger === 'glob') {
    const parsed = parseClaudePaths(nativeMetadata);
    if (!parsed.ok) return { ...result, status: 'blocked', reason: parsed.reason };
    paths = parsed.paths;
  }
  const plan = { ...result, activation: paths ? 'paths' : 'always', nativeDirectory: 'rules', paths };
  if (!hasHuman) return { ...plan, status: 'ready', action: 'create-reference' };
  const actual = parseClaudePaths(humanFile, { metadataOnly: false, allowGlobal: true });
  const scopeMatches = actual.ok && JSON.stringify(actual.paths) === JSON.stringify(paths);
  return { ...plan, status: 'preserved', action: 'preserve-human', scopeMatches: Boolean(scopeMatches), ...(!actual.ok ? { reason: actual.reason } : {}) };
}
