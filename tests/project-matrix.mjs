#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, constants, existsSync, fstatSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, parse, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { managedBlockDigest } from '../.pbai4devs/scripts/lib/managed-content.mjs';
import { tomlManagedBlockDigest } from '../.pbai4devs/scripts/lib/managed-toml.mjs';

const selections = [
  'codex', 'claude', 'opencode', 'gemini', 'copilot', 'cursor', 'kimi',
  'minimax', 'deepseek', 'antigravity', 'antigravity-legacy', 'zcode',
  'kimi-legacy', 'mimo', 'claude,codex', 'copilot,cursor', 'codex,opencode',
  'gemini,claude', 'deepseek,minimax', 'antigravity,copilot',
];
const usage = 'Uso: node tests/project-matrix.mjs --package <diretório> --version <versão> [--output <diretório>] [--jobs 1..4] [--rounds 1..100] [--start-round 1..100] [--diagnose-exclude]';
const sha = value => createHash('sha256').update(value).digest('hex');
function readProvenanceFile(file) {
  let path = resolve(file);
  if (process.platform === 'darwin') for (const [alias, actual] of [['/var', '/private/var'], ['/tmp', '/private/tmp']]) {
    if ((path === alias || path.startsWith(`${alias}/`)) && lstatSync(alias).isSymbolicLink() && realpathSync(alias) === actual) {
      path = `${actual}${path.slice(alias.length)}`; break;
    }
  }
  const root = parse(path).root; let current = root, before; const ancestors = [];
  const parts = path.slice(root.length).split(sep).filter(Boolean);
  for (const [index, part] of parts.entries()) {
    current = join(current, part); before = lstatSync(current);
    if (before.isSymbolicLink()) throw Object.assign(new Error('Link em entrada de proveniência.'), { code: 'E_SYMLINK' });
    if (index < parts.length - 1) {
      if (!before.isDirectory()) throw Object.assign(new Error('Ancestral de proveniência inválido.'), { code: 'E_PATH' });
      ancestors.push({ path: current, dev: before.dev, ino: before.ino });
    }
  }
  if (!before?.isFile()) throw Object.assign(new Error('Entrada de proveniência não é arquivo regular.'), { code: 'E_PATH' });
  const checkAncestors = () => {
    for (const ancestor of ancestors) {
      const info = lstatSync(ancestor.path);
      if (info.isSymbolicLink() || !info.isDirectory() || info.dev !== ancestor.dev || info.ino !== ancestor.ino) throw Object.assign(new Error('Ancestral de proveniência mudou.'), { code: 'E_CHANGED' });
    }
  };
  checkAncestors();
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) throw Object.assign(new Error('Entrada de proveniência mudou.'), { code: 'E_CHANGED' });
    checkAncestors();
    const bytes = readFileSync(fd), after = fstatSync(fd), currentInfo = lstatSync(path);
    if (currentInfo.isSymbolicLink() || [opened, after, currentInfo].some(info => info.dev !== before.dev || info.ino !== before.ino || info.size !== before.size || info.mtimeMs !== before.mtimeMs || info.ctimeMs !== before.ctimeMs)) throw Object.assign(new Error('Entrada de proveniência mudou.'), { code: 'E_CHANGED' });
    checkAncestors();
    return bytes;
  } finally { closeSync(fd); }
}
// Esta medição cobre somente estes arquivos nos dois instantes observados.
export function provenanceSnapshot(files) {
  return Object.fromEntries(Object.entries(files).map(([name, file]) => {
    try { return [name, { path: file, sha256: sha(readProvenanceFile(file)) }]; }
    catch (error) { return [name, { path: file, error: error.code || error.message }]; }
  }));
}
export function provenanceComparison(before, after) {
  const keys = Object.keys(before), afterKeys = Object.keys(after);
  return keys.length > 0 && keys.length === afterKeys.length && keys.every(name => Object.hasOwn(after, name) && before[name].sha256 && before[name].sha256 === after[name]?.sha256);
}
export function overallStatus(provenancePassed, failed, notVerified) {
  return !provenancePassed || failed ? 'failed' : notVerified ? 'not-verified' : 'passed';
}
export function cursorMetadataFromPolicy(policy) {
  if (!Array.isArray(policy?.adapters)) throw Error('Política de adaptadores inválida.');
  const matches = policy.adapters.filter(adapter => adapter?.id === 'cursor');
  if (matches.length !== 1 || typeof matches[0].ruleMetadata !== 'string'
    || !/^[a-z0-9][a-z0-9._-]*\.ya?ml$/i.test(matches[0].ruleMetadata)) throw Error('Política de metadados Cursor inválida.');
  return matches[0].ruleMetadata;
}
const installationStages = ['init', 'update', 'update-force', 'doctor', 'sync-check'];
export function assessCoverage(operations) {
  const reasons = [];
  for (const label of installationStages) {
    const matches = operations.filter(operation => operation.label === label);
    if (matches.length !== 1) { reasons.push(`${label}: etapa ausente ou duplicada`); continue; }
    const coverage = matches[0].installation?.coverage;
    if (!coverage || typeof coverage !== 'object' || Array.isArray(coverage)) {
      reasons.push(`${label}: cobertura ausente ou inválida`); continue;
    }
    const counts = coverage.checked;
    const countsValid = counts && typeof counts === 'object' && !Array.isArray(counts) &&
      ['skills', 'agents', 'commands', 'rules'].every(key => Number.isSafeInteger(counts[key]) && counts[key] >= 0);
    const reasonsValid = Array.isArray(coverage.notVerified) && coverage.notVerified.every(reason => typeof reason === 'string' && reason.trim());
    if (!countsValid || !reasonsValid) { reasons.push(`${label}: dados de cobertura incompletos ou inválidos`); continue; }
    if (coverage.status !== 'verified' && coverage.status !== 'not-verified') {
      reasons.push(`${label}: status de cobertura desconhecido`); continue;
    }
    if (coverage.status === 'not-verified' || coverage.notVerified.length) {
      reasons.push(`${label}: cobertura não verificada${coverage.notVerified.length ? `: ${coverage.notVerified.join('; ')}` : ''}`);
    }
  }
  return { status: reasons.length ? 'not-verified' : 'verified', reasons };
}
// Corpos exatos confirmados nos 1.000 cenários das rodadas 1–25 com o tarball
// npm 0.0.21 (SHA-512 registrado em .agent-tests/matrix-npm-021-20261115).
// A correspondência não autentica o pacote fornecido: sua integridade deve ser
// verificada separadamente. Outras versões/variantes permanecem não verificadas.
const legacy021 = {
  new: { normal: 'b85536e82145fa8a9c651674c7883c99e61dd15fbc175fb4575901deb39b5b61', claude: '045810d8b0b972cd1d20de6a3a378a97830b0eeadbef94aa1a72a5b1c941341f', gemini: '4f21a8e1e2063bbeb7a2e9f56ebd1599bd6d10c6fa0f5f4d20db5d6c50c431ca', both: 'ee886e5631a5bbada1b8c2aa49ee79351545a697a0598fa6cb0c28d78aab96ff' },
  existing: { normal: 'a36d313b9e7f65316a5bad6dcf4ef97c98eecced86a377dcb062b0462075ca31', gemini: '05aee8c7484f129c20ede306e243254873162eafb563b64454701b1a9be85b2a' },
};
export function expectedLegacyExclude(item, version) {
  if (version !== '0.0.21' || !legacy021Pairs.has(`${item.fixture ?? 0}|${item.selection}`) || !Object.hasOwn(legacy021, item.kind)) return null;
  const ids = item.selection.split(','), gemini = ids.some(id => ['gemini', 'antigravity', 'antigravity-legacy'].includes(id)), claude = ids.includes('claude');
  const key = item.kind === 'new' && gemini && claude ? 'both' : gemini ? 'gemini' : item.kind === 'new' && claude ? 'claude' : 'normal';
  return legacy021[item.kind][key] || null;
}
// Windows expõe apenas a distinção de escrita, sem equivalência de ACL POSIX.
const modeMask = process.platform === 'win32' ? 0o200 : 0o777;
const within = (root, path) => { const p = relative(root, path); return p === '' || (!isAbsolute(p) && p !== '..' && !p.startsWith(`..${sep}`)); };

export function options(args) {
  const out = { jobs: 3, rounds: 1, startRound: 1 };
  while (args.length) {
    const key = args.shift();
    if (key === '--help' || key === '-h') { if (args.length) throw Error(usage); return { help: true }; }
    if (key === '--diagnose-exclude') {
      if (out.diagnoseExclude) throw Error('Opção repetida: --diagnose-exclude');
      out.diagnoseExclude = true; continue;
    }
    if (!['--package', '--version', '--output', '--jobs', '--rounds', '--start-round'].includes(key) || !args.length) throw Error(usage);
    const name = key.slice(2);
    if (Object.hasOwn(out, name) && !['jobs', 'rounds'].includes(name)) throw Error(`Opção repetida: ${key}`);
    const value = args.shift();
    if (!value || value.startsWith('--')) throw Error(usage);
    if (name === 'jobs') {
      if (out.jobsSet || !/^[1-4]$/.test(value)) throw Error('--jobs deve estar entre 1 e 4.');
      out.jobsSet = true; out.jobs = Number(value);
    } else if (name === 'rounds' || name === 'start-round') {
      const property = name === 'rounds' ? 'rounds' : 'startRound', flag = `${property}Set`;
      if (out[flag] || !/^(?:[1-9]|[1-9][0-9]|100)$/.test(value)) throw Error(`--${name} deve estar entre 1 e 100 e não pode ser repetido.`);
      out[flag] = true; out[property] = Number(value);
    } else out[name] = value;
  }
  if (!out.package || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(out.version || '')) throw Error(usage);
  if (out.startRound + out.rounds - 1 > 100) throw Error('--start-round e --rounds ultrapassam a rodada 100.');
  return out;
}

// Seleções canônicas, sem repetição semântica por ordem dos agentes.
export function matrixCases(rounds, startRound = 1) {
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 100) throw Error('--rounds deve estar entre 1 e 100.');
  if (!Number.isInteger(startRound) || startRound < 1 || startRound > 100 || startRound + rounds - 1 > 100) throw Error('--start-round e --rounds devem estar entre as rodadas 1 e 100.');
  const agents = selections.slice(0, 14), pool = [], seen = new Set();
  const add = selection => {
    const key = selection.split(',').sort().join(',');
    if (!seen.has(key)) { seen.add(key); pool.push(selection); }
  };
  selections.forEach(add);
  const combinations = (chosen, start, remaining) => {
    if (!remaining) { add(chosen.join(',')); return; }
    for (let i = start; i <= agents.length - remaining; i++) combinations([...chosen, agents[i]], i + 1, remaining - 1);
  };
  for (let size = 1; size <= 4; size++) combinations([], 0, size);
  const cases = [];
  for (let round = startRound - 1; round < startRound - 1 + rounds; round++) {
    const fixture = round % 4, offset = Math.floor(round / 4) * 20;
    for (const selection of pool.slice(offset, offset + 20)) {
      for (const kind of ['new', 'existing']) cases.push({ number: (startRound - 1) * 40 + cases.length + 1, round: round + 1, selection, kind, fixture });
    }
  }
  return cases;
}

// Hash dos 500 pares extraídos dos relatórios 40+160+800, independentemente do
// gerador. Se ele mudar, nenhuma nova combinação recebe autorização implícita.
const observedLegacyPairsHash = 'a4eb9070d1210ea79885552ca6ef5b4c4048465f02e47c774363c905c792f03a';
export function verifiedLegacyPairs(items) {
  if (!Array.isArray(items) || items.length !== 1000) return new Set();
  const pairs = new Map();
  for (const item of items) {
    if (!item || !Number.isInteger(item.fixture) || item.fixture < 0 || item.fixture > 3 || typeof item.selection !== 'string' || !['new', 'existing'].includes(item.kind)) return new Set();
    const key = `${item.fixture}|${item.selection}`, kinds = pairs.get(key) || new Set();
    if (kinds.has(item.kind)) return new Set();
    kinds.add(item.kind); pairs.set(key, kinds);
  }
  const keys = [...pairs.keys()].sort();
  if (keys.length !== 500 || [...pairs.values()].some(kinds => kinds.size !== 2) || sha(JSON.stringify(keys)) !== observedLegacyPairsHash) return new Set();
  return new Set(keys);
}
const legacy021Pairs = verifiedLegacyPairs(matrixCases(25));

export function outputParent(requested) {
  const configuredTemp = resolve(tmpdir()), canonicalTemp = realpathSync(configuredTemp);
  let path = resolve(requested || canonicalTemp);
  // O tmpdir do sistema no macOS costuma passar por /var -> /private/var.
  if (within(configuredTemp, path)) path = resolve(canonicalTemp, relative(configuredTemp, path));
  const root = parse(path).root; let current = root;
  for (const part of path.slice(root.length).split(sep).filter(Boolean)) {
    current = join(current, part);
    const st = lstatSync(current);
    const systemTmp = process.platform === 'darwin' && current === '/tmp' && st.isSymbolicLink() && realpathSync(current) === '/private/tmp';
    if (st.isSymbolicLink() && !systemTmp) throw Error('--output deve ser diretório existente, sem link simbólico humano.');
  }
  if (!statSync(path).isDirectory()) throw Error('--output deve ser diretório existente.');
  const actual = realpathSync(path);
  const temporary = [tmpdir(), ...(process.platform === 'win32' ? [] : ['/tmp', '/private/tmp'])]
    .filter(path => existsSync(path)).map(path => realpathSync(path));
  let ancestor = actual, hasGitMarker = false;
  while (true) {
    if (lstatSync(join(ancestor, '.git'), { throwIfNoEntry: false })) { hasGitMarker = true; break; }
    const parent = dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  if (temporary.some(root => within(root, actual)) && !hasGitMarker) return actual;
  throw Error('--output precisa ser um diretório temporário fora de repositórios Git.');
}

export function command(file, args, cwd, env, timeout = 180000) {
  return new Promise(resolvePromise => {
    let child;
    try { child = spawn(file, args, { cwd, env, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (error) { resolvePromise({ status: null, signal: null, error: error.message, stdout: '', stderr: '' }); return; }
    const stdout = [], stderr = []; let bytes = 0, error = null, exceeded = false, timedOut = false, settled = false, stopTimer;
    const settle = (status, signal) => {
      if (settled) return;
      settled = true; clearTimeout(timer); clearTimeout(stopTimer);
      child.stdout?.destroy(); child.stderr?.destroy();
      resolvePromise({ status, signal, error, timedOut, exceeded, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') });
    };
    const stop = reason => {
      if (timedOut || exceeded || settled) return;
      if (reason === 'timeout') timedOut = true; else exceeded = true;
      // O grupo foi criado para este filho; nunca sinalize o grupo do runner.
      if (child.exitCode === null && child.signalCode === null && child.pid) {
        try {
          if (process.platform === 'win32') child.kill('SIGKILL');
          else process.kill(-child.pid, 'SIGKILL');
        } catch (err) { if (err.code !== 'ESRCH') error = err.message; }
      }
      child.stdout?.destroy(); child.stderr?.destroy();
      stopTimer = setTimeout(() => settle(null, null), 500);
    };
    const collect = (which, chunk) => {
      if (settled || timedOut || exceeded) return;
      const remaining = 16 * 1024 * 1024 - bytes;
      const part = chunk.subarray(0, remaining);
      if (part.length) (which === 'stdout' ? stdout : stderr).push(Buffer.from(part));
      bytes += part.length;
      if (part.length < chunk.length) stop('exceeded');
    };
    child.stdout.on('data', chunk => collect('stdout', chunk));
    child.stderr.on('data', chunk => collect('stderr', chunk));
    child.stdout.on('error', () => {}); child.stderr.on('error', () => {});
    child.on('error', err => { error = err.message; });
    const timer = setTimeout(() => stop('timeout'), timeout);
    child.on('close', settle);
  });
}

const snapshot = (root, path) => {
  const parts = path.split('/'); let current = root; const directories = {};
  const rootStat = lstatSync(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw Error('Raiz da fixture não é diretório regular.');
  directories['.'] = { type: 'directory', mode: rootStat.mode & modeMask };
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    const st = lstatSync(current);
    if (st.isSymbolicLink()) throw Error(`Link simbólico em caminho monitorado: ${parts.slice(0, index + 1).join('/')}`);
    if (index < parts.length - 1) {
      if (!st.isDirectory()) throw Error(`Ancestral não é diretório: ${parts.slice(0, index + 1).join('/')}`);
      directories[parts.slice(0, index + 1).join('/')] = { type: 'directory', mode: st.mode & modeMask };
    } else {
      if (!st.isFile()) throw Error(`Fixture não é arquivo regular: ${path}`);
      return { sha256: sha(readFileSync(current)), mode: st.mode & modeMask, directories };
    }
  }
  throw Error(`Caminho vazio: ${path}`);
};

// Captures presence and bytes of the configured Cursor sidecars at each end of
// a run. It does not authenticate the package or detect transient alterations.
export function cursorSidecarSnapshot(pkg, metadataName) {
  if (metadataName == null) return {};
  if (typeof metadataName !== 'string' || !/^[a-z0-9][a-z0-9._-]*\.ya?ml$/i.test(metadataName)) throw Error('Nome de metadado Cursor inválido.');
  const base = '.pbai4devs/rules', result = {};
  try {
    let current = pkg;
    for (const part of base.split('/')) {
      current = join(current, part);
      const info = lstatSync(current);
      if (info.isSymbolicLink() || !info.isDirectory()) throw Error('Diretório de regras não verificável.');
    }
    const visit = relativePath => {
      const absolute = join(pkg, ...relativePath.split('/')), info = lstatSync(absolute);
      if (info.isSymbolicLink()) throw Error('Link simbólico em regras do pacote.');
      if (info.isDirectory()) {
        if (posix.basename(relativePath).toLowerCase() === metadataName.toLowerCase()) throw Error('Sidecar Cursor não é arquivo regular.');
        for (const name of readdirSync(absolute).sort()) visit(`${relativePath}/${name}`);
      } else if (posix.basename(relativePath).toLowerCase() === metadataName.toLowerCase()) {
        if (!info.isFile()) throw Error('Sidecar Cursor não é arquivo regular.');
        result[`cursorSidecar:${relativePath}`] = { path: absolute, sha256: sha(readProvenanceFile(absolute)) };
      }
    };
    visit(base);
    return result;
  } catch {
    return { 'cursorSidecar:inventory': { path: join(pkg, base), error: 'E_SIDECAR_INVENTORY' } };
  }
}

function snapshotRefs(root) {
  const refs = {};
  const git = lstatSync(join(root, '.git'));
  if (!git.isDirectory() || git.isSymbolicLink()) throw Error('.git não é diretório regular.');
  const visit = path => {
    const file = join(root, path), st = lstatSync(file);
    if (st.isSymbolicLink()) throw Error(`Link simbólico em ref: ${path}`);
    if (st.isDirectory()) {
      refs[path] = { type: 'directory', mode: st.mode & modeMask };
      for (const name of readdirSync(file).sort()) visit(`${path}/${name}`);
    } else if (st.isFile()) refs[path] = { type: 'file', ...snapshot(root, path) };
    else throw Error(`Tipo inválido em ref: ${path}`);
  };
  visit('.git/refs');
  return refs;
}

const catalogTypes = ['skills', 'agents', 'commands', 'rules'];
const safePath = path => typeof path === 'string' && !isAbsolute(path) && !path.includes('\\') && path.split('/').every(part => part && part !== '.' && part !== '..');
const generatedPointer = /^---\r?\n(?:(?!---(?:\r?\n|$))[^\r\n]*\r?\n)*---\r?\n\r?\n# [^\r\n]+\r?\n\r?\n<!-- gerado: sincronizar-agentes -->\r?\n(?:Leia e siga )?@?\[origem\]\(([^)\r\n]+)\)\.?\r?\n?$/;

function sourceTrigger(bytes) {
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) return null;
  const header = /^---\r?\n([\s\S]+?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!header) return null;
  const fields = header[1].split(/\r?\n/).map(line => /^([a-z_][a-z0-9_]*): ([^\r\n]+)$/.exec(line));
  if (fields.some(field => field === null) || new Set(fields.map(field => field[1])).size !== fields.length) return null;
  const trigger = fields.find(field => field[1] === 'trigger')?.[2];
  return ['always_on', 'model_decision', 'manual', 'glob'].includes(trigger) ? trigger : null;
}

function ownRuleSource(root, entry, humanPaths) {
  if (humanPaths.has(entry.path)) return null;
  const source = readProvenanceFile(join(root, entry.path));
  return sha(source) === entry.sha256 && sourceTrigger(source) === entry.trigger ? source : null;
}

// Only certify the observable generated rule tree. Unknown files or import
// forms cannot be used to establish that the source has no native route.
function claudeRuleOrigins(root, state) {
  const origins = new Set();
  function visit(path) {
    const info = lstatSync(join(root, path), { throwIfNoEntry: false });
    if (!info || !info.isDirectory() || info.isSymbolicLink()) return false;
    for (const child of readdirSync(join(root, path), { withFileTypes: true })) {
      const target = `${path}/${child.name}`;
      if (child.isDirectory()) { if (!visit(target)) return false; continue; }
      if (!child.isFile() || child.isSymbolicLink() || !/\.md$/i.test(target)) return false;
      const bytes = readProvenanceFile(join(root, target));
      const text = bytes.toString('utf8');
      if (!Buffer.from(text, 'utf8').equals(bytes)) return false;
      const href = generatedPointer.exec(text)?.[1];
      if (!href || state.files[target] !== sha(bytes)) return false;
      const origin = posix.normalize(posix.join(posix.dirname(target), decodeURIComponent(href)));
      if (!safePath(origin) || !origin.startsWith('.pbai4devs/rules/')) return false;
      snapshot(root, origin);
      origins.add(realpathSync.native(join(root, origin)));
    }
    return true;
  }
  const claude = lstatSync(join(root, '.claude'), { throwIfNoEntry: false });
  if (claude && (!claude.isDirectory() || claude.isSymbolicLink())) return null;
  if (claude && lstatSync(join(root, '.claude/rules'), { throwIfNoEntry: false }) && !visit('.claude/rules')) return null;
  for (const guide of ['CLAUDE.md', '.claude/CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.md']) {
    if (!lstatSync(join(root, guide), { throwIfNoEntry: false })) continue;
    const bytes = readProvenanceFile(join(root, guide)), text = bytes.toString('utf8');
    if (!Buffer.from(text, 'utf8').equals(bytes)) return null;
    const imports = text.split(/\r?\n/).filter(line => line.includes('@'));
    if (imports.some(line => guide !== 'CLAUDE.md' || line.trim() !== '@AGENTS.md')) return null;
  }
  return origins;
}

function inspectClaudeOmission(root, entry, state, humanPaths, outcome) {
  if (!['manual', 'model_decision', 'glob'].includes(entry.trigger) || !ownRuleSource(root, entry, humanPaths)) return null;
  const target = `.claude/${entry.path.slice('.pbai4devs/'.length)}`;
  const omissions = outcome.scopeOmissions?.filter(item => item?.source === entry.path || item?.target === target);
  const omission = omissions?.[0];
  if (omissions?.length !== 1 || omission.source !== entry.path || omission.target !== target
    || omission.trigger !== entry.trigger || omission.status !== 'explicit-reference-planned') return null;
  if (outcome.retainedClaudeRules?.length) return null;
  if (Object.hasOwn(state.files, target) || Object.hasOwn(state.blocks || {}, target)) {
    throw Error(`Regra Claude omitida ainda consta no estado: ${target}.`);
  }
  const manifest = readProvenanceFile(join(root, '.pbai4devs/espelhos.conf')).toString('utf8').split(/\r?\n/);
  const nativeAlias = manifest.some(line => {
    const [kind, destination, source] = line.split('|').map(part => part.trim());
    return kind === 'nativo' && destination?.startsWith('.claude/rules/') && (destination === target || source === entry.path);
  });
  if (nativeAlias) throw Error(`Regra Claude omitida ainda consta no manifesto: ${target}.`);
  const origins = claudeRuleOrigins(root, state);
  if (!origins) return null;
  if (lstatSync(join(root, target), { throwIfNoEntry: false }) || origins.has(realpathSync.native(join(root, entry.path)))) {
    throw Error(`Regra Claude de leitura explícita ainda tem rota nativa: ${target}.`);
  }
  return { client: 'claude', source: entry.path, target, mode: 'explicit-source-only' };
}

// Only certify the simple, generated frontmatter whose origin is unchanged.
// Sidecars and human content require separate scope analysis.
export function inspectGeneratedRuleScope({ path, entry, content, sourceMatches, hasMetadata }) {
  if (!(path.endsWith('.mdc') || path.endsWith('.instructions.md'))) return 'not-applicable';
  if (!sourceMatches || hasMetadata || !entry || typeof entry.description !== 'string'
    || !['always_on', 'model_decision', 'manual', 'glob'].includes(entry.trigger)
    || entry.trigger === 'glob' && (typeof entry.globs !== 'string' || !entry.globs)) return 'not-verified';
  let expected;
  if (path.endsWith('.mdc')) {
    expected = `---\ndescription: ${JSON.stringify(entry.trigger === 'manual' ? '' : entry.description)}\nalwaysApply: ${entry.trigger === 'always_on'}\n${entry.trigger === 'glob' ? `globs: ${JSON.stringify(entry.globs)}\n` : ''}---\n`;
  } else {
    if (!['always_on', 'glob'].includes(entry.trigger)) return 'not-verified';
    expected = `---\napplyTo: ${JSON.stringify(entry.trigger === 'glob' ? entry.globs : '**')}\n---\n`;
  }
  return content.startsWith(expected) ? 'verified' : 'mismatch';
}

// Checks byte fidelity only; matching YAML does not prove its semantics or
// native activation.
const cursorSidecarHeader = /^---\ndescription: ([^\r\n]+)\nalwaysApply: (true|false)\n---\n$/;

export function compareCursorSidecar({ path, metadata, content }) {
  if (!path.endsWith('.mdc') || !Buffer.isBuffer(metadata) || typeof content !== 'string') return 'not-verified';
  const text = metadata.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(metadata)
    || !cursorSidecarHeader.test(text)) return 'not-verified';
  return content.startsWith(text) ? 'matches' : 'mismatch';
}

// Cursor documents alwaysApply: true as unconditional, and a nonempty
// description without a glob with alwaysApply: false as Apply Intelligently.
// Restrict certification to the two-field scalar form proven here.
export function inspectCursorSidecarScope({ path, entry, source, metadata, content }) {
  const fidelity = compareCursorSidecar({ path, metadata, content });
  if (fidelity !== 'matches') return fidelity;
  const [, description, alwaysApply] = cursorSidecarHeader.exec(metadata.toString('utf8'));
  if (!/^\p{L}[\p{L}\p{M}\p{N} .,/()'_-]*$/u.test(description)
    || /^(?:true|false|null|yes|no|on|off|y|n)$/i.test(description.trim())) return 'not-verified';
  const trigger = Buffer.isBuffer(source) ? sourceTrigger(source) : null;
  if (!trigger || trigger !== entry.trigger) return 'not-verified';
  if (alwaysApply === 'true') return trigger === 'always_on' ? 'always-apply' : 'mismatch';
  return trigger === 'model_decision' ? 'apply-intelligently' : 'mismatch';
}

const inventoryCache = new Map();
function packageInventory(pkg) {
  if (!inventoryCache.has(pkg)) inventoryCache.set(pkg, (async () => {
    const builder = '.pbai4devs/scripts/lib/catalog.mjs', policyFile = '.pbai4devs/templates/clients/ADAPTERS.json';
    snapshot(pkg, builder); snapshot(pkg, policyFile);
    const module = await import(pathToFileURL(join(pkg, builder)).href);
    const resourceFile = '.pbai4devs/scripts/lib/resource-path.mjs';
    snapshot(pkg, resourceFile);
    const resourceModule = await import(pathToFileURL(join(pkg, resourceFile)).href);
    if (typeof module.buildCatalog !== 'function') throw Error('Construtor de catálogo do pacote não suportado.');
    const catalog = module.buildCatalog(pkg).catalog;
    const policy = JSON.parse(readFileSync(join(pkg, policyFile), 'utf8'));
    if (policy.schemaVersion !== 1 || !Array.isArray(policy.adapters) || !policy.adapters.length) throw Error('Política de adaptadores do pacote inválida.');
    const inventory = {};
    for (const type of catalogTypes) {
      if (!Array.isArray(catalog[type]) || !catalog[type].length) throw Error(`Catálogo das fontes vazio: ${type}.`);
      inventory[type] = catalog[type].map(entry => {
        if (!safePath(entry.path) || !entry.path.startsWith(`.pbai4devs/${type}/`) || typeof entry.name !== 'string' || !entry.name || !/^[A-Za-z0-9._-]+$/.test(entry.name)) throw Error(`Entrada inválida no catálogo: ${entry.path}`);
        return { ...entry, sha256: snapshot(pkg, entry.path).sha256 };
      });
    }
    return { inventory, policy: policy.adapters, pkg, buildCatalog: module.buildCatalog, resourcePath: resourceModule.clientResourcePath };
  })());
  return inventoryCache.get(pkg);
}

function skillDestination(adapter, entry) {
  const format = adapter.formats?.skills || 'agrupado';
  const root = format === 'nenhum' ? adapter.skillFallback : adapter.root;
  if (typeof root !== 'string' || !/^\.[a-z0-9][a-z0-9-]*$/.test(root)) throw Error(`Raiz de skills inválida: ${adapter.id}.`);
  if (format === 'plano') return `${root}/skills/${posix.basename(posix.dirname(entry.path))}/SKILL.md`;
  if (format === 'agrupado' || format === 'nenhum') return `${root}/${entry.path.slice('.pbai4devs/'.length)}`;
  throw Error(`Formato de skills desconhecido: ${adapter.id}/${format}.`);
}

function inspectInstallation(root, version, selection, packageData, humanPaths, expectedDocuments, outcome) {
  const { inventory, policy, pkg, resourcePath, buildCatalog } = packageData;
  const coverage = { status: 'verified', notVerified: [], checked: { skills: 0, agents: 0, commands: 0, rules: 0 } };
  const readJson = path => { snapshot(root, path); return JSON.parse(readFileSync(join(root, path), 'utf8')); };
  const state = readJson('.pbai4devs/state/agentdevkit.json');
  if (state.schemaVersion !== 1 || state.version !== version || !Array.isArray(state.clients) || [...state.clients].sort().join(',') !== selection.split(',').sort().join(',')) throw Error('Estado instalado não confirma versão e agentes selecionados.');
  if (!state.files || Array.isArray(state.files) || typeof state.files !== 'object' || !Object.keys(state.files).length) throw Error('Estado instalado não possui arquivos gerenciados.');
  const catalog = readJson('.pbai4devs/catalog.json'), actualSources = buildCatalog(root).catalog;
  for (const type of catalogTypes) {
    if (!Array.isArray(catalog[type])) throw Error(`Catálogo instalado não possui ${type}.`);
    if (!Array.isArray(actualSources[type])) throw Error(`Fontes instaladas inválidas: ${type}.`);
    const key = entry => JSON.stringify([entry.id, entry.name, entry.path]);
    if (JSON.stringify(catalog[type].map(key).sort()) !== JSON.stringify(actualSources[type].map(key).sort())) throw Error(`Catálogo não corresponde às fontes: ${type}.`);
    const installed = new Set(catalog[type].map(entry => entry.path));
    for (const entry of inventory[type]) {
      if (!installed.has(entry.path)) throw Error(`Catálogo instalado omite ${entry.path}.`);
      const actual = snapshot(root, entry.path);
      if (!humanPaths.has(entry.path) && (actual.sha256 !== entry.sha256 || state.files[entry.path] !== actual.sha256)) throw Error(`Origem instalada divergente: ${entry.path}.`);
    }
  }
  if (!state.files['.pbai4devs/catalog.json']) throw Error('Catálogo ausente do estado.');
  for (const type of ['skills', 'agents', 'rules']) {
    const path = `.pbai4devs/${type}.json`, index = readJson(path);
    if (!state.files[path] || !Array.isArray(index.entries)) throw Error(`Índice inválido: ${path}.`);
    const expected = catalog[type].map(entry => type === 'skills' ? posix.dirname(entry.path) : entry.path).sort();
    const actual = index.entries.map(entry => entry?.path).sort();
    if (actual.some(path => !safePath(path)) || JSON.stringify(expected) !== JSON.stringify(actual)) throw Error(`Índice incompleto ou divergente: ${path}.`);
  }
  const selected = new Set(selection.split(','));
  for (const id of selected) {
    const adapter = policy.find(item => item?.id === id);
    if (!adapter) throw Error(`Adaptador não encontrado: ${id}.`);
    for (const dependency of adapter.requires || []) selected.add(dependency);
  }
  for (const path of ['.pbai4devs/.gitignore', 'AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) {
    const full = join(root, path);
    if (!existsSync(full)) continue;
    snapshot(root, path);
    const content = readFileSync(full, 'utf8');
    if ((content.includes('<!-- BEGIN AGENTDEVKIT -->') || content.includes('# BEGIN AGENT IGNORE')) && !state.blocks?.[path] && !state.files[path]) throw Error(`Bloco gerenciado ausente do estado: ${path}.`);
  }
  for (const [path, original] of Object.entries(expectedDocuments)) {
    if (!readFileSync(join(root, path)).equals(Buffer.from(original)) && !state.blocks?.[path]) throw Error(`Bloco gerenciado ausente do estado: ${path}.`);
  }
  for (const id of selected) {
    const matches = policy.filter(adapter => adapter?.id === id);
    if (matches.length !== 1) throw Error(`Adaptador não encontrado: ${id}.`);
    for (const type of catalogTypes) for (const entry of inventory[type]) {
      const adapter = matches[0], format = adapter.formats?.[type] || 'agrupado';
      let path, hasMetadata = false, metadata = null, packageMetadata = null;
      if (type === 'skills') path = skillDestination(adapter, entry);
      else if (typeof resourcePath !== 'function') { coverage.notVerified.push(`${id}/${type}: função de destino não disponível`); continue; }
      else {
        const metadataName = type === 'rules' ? adapter.ruleMetadata : type === 'agents' ? adapter.agentMetadata : null;
        if (metadataName != null && (typeof metadataName !== 'string' || !/^[a-z0-9][a-z0-9._-]*\.ya?ml$/i.test(metadataName))) throw Error(`Nome de metadado inválido para ${id}/${type}.`);
        metadata = metadataName && `${posix.dirname(entry.path)}/${metadataName}`;
        hasMetadata = Boolean(metadata && existsSync(join(pkg, metadata)));
        if (hasMetadata) packageMetadata = snapshot(pkg, metadata);
        const relativeTarget = resourcePath(entry.path, type, format, adapter.root, entry, Boolean(hasMetadata));
        if (relativeTarget === null) {
          const proof = id === 'claude' && adapter.root === '.claude' && type === 'rules' && format === 'agrupado' && !hasMetadata
            ? inspectClaudeOmission(root, entry, state, humanPaths, outcome) : null;
          if (proof) (coverage.ruleScopes ??= []).push(proof);
          else coverage.notVerified.push(`${id}/${type}: escopo nativo não comprovado para ${entry.path}`);
          continue;
        }
        path = `${adapter.root}/${relativeTarget}`;
        if (id === 'gemini' && type === 'commands') path = path.replace(/\.md$/, '.toml');
      }
      if (!safePath(path)) throw Error(`Destino inválido: ${path}.`);
      const target = snapshot(root, path);
      const content = readFileSync(join(root, path), 'utf8');
      if (path.endsWith('.toml')) {
        const lines = content.trimEnd().split(/\r?\n/);
        let description, prompt;
        try { description = JSON.parse(lines[1]?.slice('description = '.length)); prompt = JSON.parse(lines[2]?.slice('prompt = '.length)); } catch { /* formato inválido */ }
        if (lines.length !== 3 || lines[0] !== '# gerado: sincronizar-agentes' || !lines[1]?.startsWith('description = ') || typeof description !== 'string' || !lines[2]?.startsWith('prompt = ') || prompt !== `@{${entry.path}}\n\n{{args}}` || !state.files[path]) throw Error(`Apontamento TOML ausente ou divergente: ${id}/${path}.`);
        coverage.checked[type]++; continue;
      }
      if (Object.hasOwn(expectedDocuments, path)) {
        if (content === expectedDocuments[path]) coverage.notVerified.push(`${id}/${type}: destino humano preservado ${path}`);
        else if (!state.blocks?.[path]) throw Error(`Bloco gerenciado ausente do estado: ${path}.`);
        else coverage.checked[type]++;
        if (type === 'rules' && (path.endsWith('.mdc') || path.endsWith('.instructions.md'))) coverage.notVerified.push(`${id}/rules: escopo humano não verificado para ${path}`);
        continue;
      }
      const link = generatedPointer.exec(content);
      if (!link || resolve(dirname(join(root, path)), decodeURIComponent(link[1])) !== join(root, entry.path) || !state.files[path]) throw Error(`Apontamento nativo ausente ou divergente: ${id}/${path}.`);
      coverage.checked[type]++;
      if (type === 'rules' && (path.endsWith('.mdc') || path.endsWith('.instructions.md'))) {
        let scope = inspectGeneratedRuleScope({ path, entry, content, hasMetadata, sourceMatches: !humanPaths.has(entry.path) && snapshot(root, entry.path).sha256 === entry.sha256 });
        if (id === 'cursor' && hasMetadata && !humanPaths.has(metadata) && existsSync(join(root, metadata))) {
          const localMetadata = snapshot(root, metadata);
          if (localMetadata.sha256 === packageMetadata.sha256 && state.files[metadata] === localMetadata.sha256) {
            const metadataBytes = readFileSync(join(root, metadata));
            if (sha(metadataBytes) === localMetadata.sha256) {
              if (compareCursorSidecar({ path, metadata: metadataBytes, content }) === 'mismatch') {
                throw Error(`Frontmatter Cursor diverge do sidecar instalado: ${path}.`);
              }
              const mode = inspectCursorSidecarScope({ path, entry, source: ownRuleSource(root, entry, humanPaths), metadata: metadataBytes, content });
              if (mode === 'mismatch') throw Error(`Modo do sidecar Cursor diverge da regra de origem: ${path}.`);
              if (mode !== 'not-verified' && state.files[path] === target.sha256) {
                (coverage.ruleScopes ??= []).push({ client: id, source: entry.path, target: path, mode, metadata });
                scope = 'verified';
              }
            }
          }
        }
        if (scope === 'mismatch') throw Error(`Metadados de escopo divergentes: ${id}/${path}.`);
        if (scope !== 'verified') coverage.notVerified.push(`${id}/rules: metadados de escopo não verificados para ${path}`);
      }
    }
  }
  if (!state.blocks || Array.isArray(state.blocks) || typeof state.blocks !== 'object') throw Error('Estado sem mapa de blocos gerenciados.');
  for (const [path, hash] of Object.entries(state.blocks)) {
    if (!safePath(path) || !/^[a-f0-9]{64}$/.test(hash)) throw Error(`Bloco gerenciado inválido: ${path}.`);
    snapshot(root, path);
    const content = readFileSync(join(root, path));
    let digest;
    if (path.endsWith('.toml')) digest = tomlManagedBlockDigest(content);
    else if (path === '.gitignore' || path.endsWith('/.gitignore')) {
      const first = path === '.gitignore' ? '# BEGIN AGENTDEVKIT' : '# BEGIN AGENT IGNORE';
      const last = path === '.gitignore' ? '# END AGENTDEVKIT' : '# END AGENT IGNORE';
      const text = content.toString('utf8'), start = text.indexOf(first), end = text.indexOf(last);
      if (start < 0 || end < start || text.indexOf(first, start + first.length) !== -1 || text.indexOf(last, end + last.length) !== -1) throw Error(`Marcadores inválidos: ${path}.`);
      digest = sha(text.slice(start, end + last.length));
    } else digest = managedBlockDigest(content);
    if (digest !== hash) throw Error(`Hash de bloco divergente: ${path}.`);
  }
  const files = Object.entries(state.files);
  for (const [path, hash] of files) {
    if (!safePath(path) || !/^[a-f0-9]{64}$/.test(hash) || snapshot(root, path).sha256 !== hash) throw Error(`Arquivo gerenciado inválido: ${path}.`);
  }
  if (!files.some(([path]) => !path.startsWith('.pbai4devs/'))) throw Error('Estado não contém apontamentos gerenciados de cliente.');
  if (coverage.notVerified.length) coverage.status = 'not-verified';
  return { clients: state.clients, files: files.length, coverage, fingerprint: sha(JSON.stringify({ files: Object.fromEntries(files.sort(([a], [b]) => a.localeCompare(b))), blocks: state.blocks })) };
}

export async function projectCase(item, directory, cli, version, env, runCommand = command, { diagnoseExclude = false } = {}) {
  const id = `${String(item.number).padStart(2, '0')}-${item.kind}`;
  const caseDirectory = join(directory, id); mkdirSync(caseDirectory);
  const root = join(caseDirectory, 'project'); mkdirSync(root);
  const put = (path, value) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value, { flag: 'wx' }); };
  const staged = `human staged ${item.selection}\n`, unstaged = `${staged}human unstaged\n`;
  const humanDocuments = {
    'AGENTS.md': '# Equipe\n\nInstrução humana exclusiva.\n',
    'CLAUDE.md': '# Claude da equipe\n\nDecisões humanas preservadas.\n',
    '.claude/skills/criar-skill/SKILL.md': '---\nname: criar-skill\ndescription: Processo próprio da equipe.\n---\n\n# Criar skill\n\nNão substituir.\n',
  };
  const humanHubSkills = {
    '.pbai4devs/skills/equipe/skill-propria/SKILL.md': '---\nname: skill-propria\ndescription: Skill adicional da equipe.\n---\n\n# Skill própria\n\nConteúdo humano preservado.\n',
    '.pbai4devs/skills/projeto/criar-skill/SKILL.md': '---\nname: criar-skill\ndescription: Processo humano próprio.\n---\n\n# Criar skill\n\nPreserve esta origem humana.\n',
  };
  const expectedDocuments = item.kind === 'existing' ? { ...humanDocuments } : {};
  const managedBodies = {
    'AGENTS.md': 'Leia e siga [.pbai4devs/INSTRUCTIONS.md](.pbai4devs/INSTRUCTIONS.md).',
    'CLAUDE.md': '@AGENTS.md',
    '.claude/skills/criar-skill/SKILL.md': 'Leia e siga [origem](../../../.pbai4devs/skills/projeto/criar-skill/SKILL.md).',
    '.agents/skills/projeto/criar-skill/SKILL.md': 'Leia e siga [origem](../../../../.pbai4devs/skills/projeto/criar-skill/SKILL.md).',
  };
  // As variantes adicionam dados humanos reais e caminhos nativos preexistentes.
  // A última variante inclui uma colisão intencional com um destino gerenciado.
  const fixture = item.fixture ?? 0;
  const extraFiles = {};
  if (fixture > 0) {
    extraFiles[`human/round-${item.round ?? 1}/case-${item.number}.txt`] = `Conteúdo humano ${item.number} (${item.selection})\n`;
    if (item.kind === 'existing' || fixture === 3) {
      const native = [null, '.cursor/rules/equipe.mdc', '.gemini/commands/equipe.toml', '.agents/skills/projeto/criar-skill/SKILL.md'][fixture];
      extraFiles[native] = fixture === 2 ? 'description = "Comando humano"\nprompt = "Preservar"\n' : `# Configuração humana ${item.number}\nPreservar conteúdo da equipe.\n`;
      if (fixture === 3) expectedDocuments[native] = extraFiles[native];
    }
  }
  for (const [path, content] of Object.entries(extraFiles)) put(path, content);
  put('.gitignore', '# regra humana\nprivate-data/\n');
  put('HUMAN-STAGED.txt', staged);
  put('HUMAN-UNTRACKED.txt', 'Arquivo humano não rastreado.\n');
  if (item.kind === 'existing') {
    for (const [path, content] of Object.entries(humanDocuments)) put(path, content);
    put('.claude/settings.json', '{"human":"preservar"}\n');
    put('.claude/skills/equipe/SKILL.md', '---\nname: equipe\ndescription: Própria.\n---\n\n# Equipe\n');
    for (const [path, content] of Object.entries(humanHubSkills)) put(path, content);
    put('src/main.js', 'export const human = true;\n');
  }
  const initialPaths = [...Object.keys(extraFiles), '.gitignore', 'HUMAN-STAGED.txt', 'HUMAN-UNTRACKED.txt', ...(item.kind === 'existing' ? [...Object.keys(humanDocuments), ...Object.keys(humanHubSkills), '.claude/settings.json', '.claude/skills/equipe/SKILL.md', 'src/main.js'] : [])];
  const initial = Object.fromEntries(initialPaths.map(path => [path, snapshot(root, path)]));
  writeFileSync(join(caseDirectory, 'SETUP.json'), JSON.stringify(initial, null, 2) + '\n', { flag: 'wx' });
  const operations = [];
  const invoke = async (label, file, args) => {
    const result = await runCommand(file, args, root, env);
    const stem = join(caseDirectory, `${label}`);
    writeFileSync(`${stem}.stdout.log`, result.stdout, { flag: 'wx' });
    writeFileSync(`${stem}.stderr.log`, result.stderr, { flag: 'wx' });
    operations.push({ label, args, status: result.status, signal: result.signal, error: result.error, timedOut: result.timedOut, exceeded: result.exceeded,
      stdout: `${stem}.stdout.log`, stderr: `${stem}.stderr.log`, stdoutSha256: sha(result.stdout), stderrSha256: sha(result.stderr) });
    return result;
  };
  const good = r => r.status === 0 && !r.error && !r.timedOut && !r.exceeded;
  let baseline = null, preservation = null, issue = null, inventory = null, installedBaseline = null, excludeOriginal = null, acceptedExclude = null;
  const diagnostic = { enabled: diagnoseExclude, triggered: false, initialIssue: null, stopReason: null, continuedWithUnverifiedMapping: false };
  const optionalSnapshot = path => {
    try { return snapshot(root, path); }
    catch (error) { if (error.code === 'ENOENT' && error.path === join(root, path)) return null; return { error: error.message }; }
  };
  const assess = () => {
    const after = {};
    for (const path of Object.keys(baseline.unchanged)) {
      try { after[path] = snapshot(root, path); } catch (error) { after[path] = { error: error.message }; }
    }
    const documents = {};
    for (const [path, content] of Object.entries(expectedDocuments)) {
      try { const original = Buffer.from(content), documentAfter = snapshot(root, path), actual = readFileSync(join(root, path)); const managed = Buffer.from(`\n<!-- BEGIN AGENTDEVKIT -->\n${managedBodies[path]}\n<!-- END AGENTDEVKIT -->\n`); documents[path] = { after: documentAfter, originalPrefixPreserved: actual.subarray(0, original.length).equals(original), allowedContent: actual.equals(original) || actual.equals(Buffer.concat([original, managed])), modePreserved: documentAfter.mode === baseline.documents[path].mode, directoriesPreserved: JSON.stringify(documentAfter.directories) === JSON.stringify(baseline.documents[path].directories) }; }
      catch (error) { documents[path] = { error: error.message, originalPrefixPreserved: false, allowedContent: false, modePreserved: false, directoriesPreserved: false }; }
    }
    const uncertain = operations.some(operation => operation.timedOut || operation.exceeded || operation.signal);
    const observedUnchanged = Object.keys(baseline.unchanged).every(path => JSON.stringify(baseline.unchanged[path]) === JSON.stringify(after[path]));
    const optional = Object.fromEntries(Object.keys(baseline.optional).map(path => [path, optionalSnapshot(path)]));
    const observedOptionalUnchanged = Object.keys(baseline.optional).every(path => JSON.stringify(baseline.optional[path]) === JSON.stringify(optional[path]));
    let refs; try { refs = snapshotRefs(root); } catch (error) { refs = { error: error.message }; }
    const observedRefsUnchanged = JSON.stringify(baseline.refs) === JSON.stringify(refs);
    const observedDocumentsPreserved = Object.values(documents).every(document => document.originalPrefixPreserved && document.allowedContent && document.modePreserved && document.directoriesPreserved);
    return { baseline, after, optional, refs, documents, status: uncertain ? 'not-verified' : 'verified', observedUnchanged, observedOptionalUnchanged, observedRefsUnchanged, observedDocumentsPreserved,
      unchanged: uncertain ? null : observedUnchanged && observedOptionalUnchanged && observedRefsUnchanged, documentsPreserved: uncertain ? null : observedDocumentsPreserved };
  };
  try {
    const init = await invoke('git-init', 'git', ['init', '--quiet']);
    if (!good(init)) throw Error('git init falhou; consulte o log.');
    const exclude = join(root, '.git/info/exclude');
    excludeOriginal = Buffer.concat([readFileSync(exclude), Buffer.from('\n# regra humana local\nprivate-local/\n')]);
    writeFileSync(exclude, excludeOriginal);
    if (item.kind === 'existing') {
      const addBase = await invoke('git-add-base', 'git', ['add', '--', '.gitignore', 'AGENTS.md', 'CLAUDE.md', '.claude', '.pbai4devs/skills', 'src/main.js', ...Object.keys(extraFiles)]);
      if (!good(addBase)) throw Error('git add inicial da fixture falhou; consulte o log.');
      const commit = await invoke('git-commit-base', 'git', ['-c', 'user.name=Fixture Developer', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'test: criar fixture sintética']);
      if (!good(commit)) throw Error('commit inicial da fixture falhou; consulte o log.');
    }
    const extraHuman = Object.keys(extraFiles).find(path => path.startsWith('human/'));
    const add = await invoke('git-add', 'git', ['add', '--', '.gitignore', 'HUMAN-STAGED.txt', ...(extraHuman ? [extraHuman] : [])]);
    if (!good(add)) throw Error('git add da fixture falhou; consulte o log.');
    writeFileSync(join(root, 'HUMAN-STAGED.txt'), unstaged);
    if (extraHuman && fixture !== 2) writeFileSync(join(root, extraHuman), `${extraFiles[extraHuman]}Mudança ainda não staged.\n`);
    const paths = [...Object.keys(extraFiles).filter(path => !Object.hasOwn(expectedDocuments, path)), '.git/index', '.git/HEAD', '.git/config', '.git/info/exclude', '.gitignore', 'HUMAN-STAGED.txt', 'HUMAN-UNTRACKED.txt', ...(item.kind === 'existing' ? [...Object.keys(humanHubSkills), '.claude/settings.json', '.claude/skills/equipe/SKILL.md', 'src/main.js'] : [])];
    const head = readFileSync(join(root, '.git/HEAD'), 'utf8').trim();
    const symbolic = /^ref: (refs\/heads\/[A-Za-z0-9._/-]+)$/.exec(head);
    if (!symbolic || symbolic[1].split('/').some(part => !part || part === '.' || part === '..')) throw Error('HEAD sintético não aponta para uma branch segura.');
    const optionalPaths = [`.git/${symbolic[1]}`, '.git/packed-refs'];
    baseline = { unchanged: Object.fromEntries(paths.map(path => [path, snapshot(root, path)])),
      documents: Object.fromEntries(Object.keys(expectedDocuments).map(path => [path, snapshot(root, path)])),
      optional: Object.fromEntries(optionalPaths.map(path => [path, optionalSnapshot(path)])), refs: snapshotRefs(root) };
    if (Object.values(baseline.optional).some(value => value?.error)) throw Error('Não foi possível inspecionar refs da fixture.');
    writeFileSync(join(caseDirectory, 'BEFORE.json'), JSON.stringify(baseline, null, 2) + '\n', { flag: 'wx' });
    for (const [name, args] of [['init', ['init', '--agents', item.selection]], ['update', ['update']], ['update-force', ['update', '--force']], ['doctor', ['doctor']], ['sync-check', ['sync', '--check']]]) {
      const result = await invoke(name, process.execPath, [cli, ...args, '--target', root, '--json']);
      let json; try { json = JSON.parse(result.stdout); } catch { json = null; }
      const step = operations.at(-1); step.ok = json?.ok ?? null; step.version = json?.version ?? null;
      const stepSnapshot = assess();
      step.preservation = { status: stepSnapshot.status, unchanged: stepSnapshot.unchanged, documentsPreserved: stepSnapshot.documentsPreserved, snapshot: join(caseDirectory, `${name}.snapshot.json`) };
      writeFileSync(step.preservation.snapshot, JSON.stringify(stepSnapshot, null, 2) + '\n', { flag: 'wx' });
      if (!good(result) || json?.ok !== true || json?.version !== version) { diagnostic.stopReason = `${name} falhou ou não confirmou a versão solicitada.`; issue ??= diagnostic.stopReason; break; }
      if (stepSnapshot.status !== 'verified' || !stepSnapshot.unchanged || !stepSnapshot.documentsPreserved || diagnostic.triggered) {
        const problem = `${name} não preservou os arquivos ou não pôde ser verificado.`;
        let additive = false, excludeInspected = false;
        if (diagnoseExclude && (name === 'init' || diagnostic.triggered) && stepSnapshot.status === 'verified' && stepSnapshot.documentsPreserved && stepSnapshot.observedOptionalUnchanged && stepSnapshot.observedRefsUnchanged) {
          const key = '.git/info/exclude', original = baseline.unchanged[key], current = stepSnapshot.after[key];
          const others = Object.keys(baseline.unchanged).filter(path => path !== key).every(path => JSON.stringify(baseline.unchanged[path]) === JSON.stringify(stepSnapshot.after[path]));
          if (others && current && !current.error && current.mode === original.mode && JSON.stringify(current.directories) === JSON.stringify(original.directories)) {
            excludeInspected = true;
            // snapshot rejeita links e ancestrais não regulares antes de ler.
            const bytes = readFileSync(exclude), tailBytes = bytes.subarray(excludeOriginal.length), tail = tailBytes.toString('utf8');
            const block = /^# BEGIN AGENTDEVKIT LOCAL ([0-9a-f]{16})\n([\s\S]*)# END AGENTDEVKIT LOCAL \1\n$/.exec(tail);
            const expectedId = sha(realpathSync(root)).slice(0, 16), expectedBody = expectedLegacyExclude(item, version);
            additive = bytes.subarray(0, excludeOriginal.length).equals(excludeOriginal) && Buffer.from(tail, 'utf8').equals(tailBytes) && Boolean(block) && block[1] === expectedId && Boolean(expectedBody) && sha(block[2]) === expectedBody && (!acceptedExclude || acceptedExclude.equals(tailBytes));
            if (additive && !acceptedExclude) acceptedExclude = Buffer.from(tailBytes);
          }
        }
        if (!additive) {
          diagnostic.excludeRecognition = 'not-verified';
          diagnostic.stopReason = excludeInspected ? `${problem} Exceção legada desconhecida ou alterada.` : problem;
          issue ??= diagnostic.stopReason; break;
        }
        diagnostic.excludeRecognition = 'matched-known-bytes';
        if (!diagnostic.triggered) { diagnostic.triggered = true; diagnostic.initialIssue = problem; issue = problem; }
        step.preservation.diagnosticExcludeAdditive = true;
      }
      try {
        inventory ??= await packageInventory(dirname(dirname(cli)));
        step.installation = inspectInstallation(root, version, item.selection, inventory, new Set([...Object.keys(humanHubSkills), ...Object.keys(expectedDocuments)]), expectedDocuments, json);
        if (diagnostic.triggered && step.installation.coverage.status !== 'verified') {
          const missing = step.installation.coverage.notVerified;
          const onlyMissingMapping = typeof inventory.resourcePath !== 'function' && missing.length > 0 && missing.every(reason => /^[a-z0-9-]+\/(?:agents|commands|rules): função de destino não disponível$/.test(reason));
          if (!onlyMissingMapping) throw Error('cobertura da instalação não verificada por outros motivos');
          diagnostic.continuedWithUnverifiedMapping = true;
        }
        if (!installedBaseline) installedBaseline = step.installation.fingerprint;
        else if (step.installation.fingerprint !== installedBaseline) { diagnostic.stopReason = `${name} alterou o inventário gerenciado após init.`; issue ??= diagnostic.stopReason; break; }
        const expectedCommand = name === 'sync-check' ? 'sync' : name === 'update-force' ? 'update' : name;
        if (json.command !== expectedCommand || (name.startsWith('update') && json.changed !== false) || (name === 'doctor' && (!Array.isArray(json.issues) || json.issues.length)) || (name === 'sync-check' && (!Array.isArray(json.plan) || json.plan.length || !Array.isArray(json.conflicts) || json.conflicts.length))) { diagnostic.stopReason = `${name} não confirmou o resultado esperado da operação.`; issue ??= diagnostic.stopReason; break; }
      } catch (error) { diagnostic.stopReason = `${name}: instalação não verificada: ${error.message}`; issue ??= diagnostic.stopReason; break; }
    }
  } catch (error) { diagnostic.stopReason = error.message; issue ??= error.message; }
  if (baseline) {
    preservation = assess();
    writeFileSync(join(caseDirectory, 'AFTER.json'), JSON.stringify(preservation, null, 2) + '\n', { flag: 'wx' });
  }
  const report = join(caseDirectory, 'RESULT.json');
  const coverage = operations.at(-1)?.installation?.coverage ?? null;
  const complete = !issue && operations.filter(operation => installationStages.includes(operation.label)).length === 5 && preservation?.unchanged === true && preservation?.documentsPreserved === true;
  const coverageAssessment = assessCoverage(operations);
  const status = !complete ? 'failed' : coverageAssessment.status === 'verified' ? 'passed' : 'not-verified';
  const result = { ...item, root, report, operations, preservation, coverage, coverageAssessment, issue, ...(diagnoseExclude ? { diagnostic } : {}), status, passed: status === 'passed' };
  writeFileSync(report, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  return result;
}

async function main() {
  const opts = options(process.argv.slice(2));
  if (opts.help) { console.log(usage); return; }
  if (Number(process.versions.node.split('.')[0]) < 24) throw Error('Use Node.js 24+ já instalado; este runner não instala runtimes.');
  const pkg = realpathSync(resolve(opts.package));
  if (!statSync(pkg).isDirectory()) throw Error('--package deve apontar para o diretório de um pacote instalado.');
  const runnerPath = fileURLToPath(import.meta.url), runnerDir = dirname(runnerPath);
  const provenanceFiles = {
    runner: runnerPath,
    managedContent: resolve(runnerDir, '../.pbai4devs/scripts/lib/managed-content.mjs'),
    managedToml: resolve(runnerDir, '../.pbai4devs/scripts/lib/managed-toml.mjs'),
    packageManifest: join(pkg, 'package.json'),
    packageCli: join(pkg, 'bin/agentdevkit.mjs'),
    packageCatalog: join(pkg, '.pbai4devs/scripts/lib/catalog.mjs'),
    packageResourcePath: join(pkg, '.pbai4devs/scripts/lib/resource-path.mjs'),
    packageAdapterPolicy: join(pkg, '.pbai4devs/templates/clients/ADAPTERS.json'),
  };
  const fixedBefore = provenanceSnapshot(provenanceFiles);
  if (Object.values(fixedBefore).some(item => !item.sha256)) throw Error('Proveniência inicial não verificável.');
  const policyBytes = readProvenanceFile(provenanceFiles.packageAdapterPolicy);
  if (sha(policyBytes) !== fixedBefore.packageAdapterPolicy.sha256) throw Error('Política de adaptadores mudou durante a leitura.');
  const cursorMetadataName = cursorMetadataFromPolicy(JSON.parse(policyBytes.toString('utf8')));
  const sidecarsBefore = cursorSidecarSnapshot(pkg, cursorMetadataName);
  if (Object.values(sidecarsBefore).some(item => !item.sha256)) throw Error('Proveniência inicial dos sidecars não verificável.');
  const provenanceBefore = { ...fixedBefore, ...sidecarsBefore };
  const meta = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'));
  if (meta.name !== '@pathbit/agentdevkit' || meta.version !== opts.version) throw Error(`Pacote ou versão divergente: ${meta.name}@${meta.version}.`);
  const cli = join(pkg, 'bin/agentdevkit.mjs');
  if (!statSync(cli).isFile()) throw Error('CLI do pacote instalado não encontrada.');
  const directory = mkdtempSync(join(outputParent(opts.output), 'adk-project-matrix-'));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_|^npm_config_|^NODE_OPTIONS$/i.test(k) && !/(?:^|_)(?:token|secret|password)(?:_|$)/i.test(k)));
  Object.assign(env, { GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(directory, 'empty-gitconfig'), npm_config_offline: 'true', npm_config_audit: 'false', npm_config_fund: 'false' });
  writeFileSync(join(directory, 'empty-gitconfig'), '', { flag: 'wx' });
  const cases = matrixCases(opts.rounds, opts.startRound);
  const results = new Array(cases.length); let cursor = 0;
  const worker = async () => { while (true) { const index = cursor++; if (index >= cases.length) return; try { results[index] = await projectCase(cases[index], directory, cli, opts.version, env, command, { diagnoseExclude: Boolean(opts.diagnoseExclude) }); } catch (error) {
    const report = join(directory, `case-${cases[index].number}-setup-error.json`);
    results[index] = { ...cases[index], report, status: 'failed', passed: false, issue: error.stack || error.message };
    writeFileSync(report, JSON.stringify(results[index], null, 2) + '\n', { flag: 'wx' });
  } } };
  await Promise.all(Array.from({ length: opts.jobs }, worker));
  const provenanceAfter = { ...provenanceSnapshot(provenanceFiles), ...cursorSidecarSnapshot(pkg, cursorMetadataName) };
  const provenance = { platform: process.platform, arch: process.arch, algorithm: 'sha256', before: provenanceBefore, after: provenanceAfter, passed: provenanceComparison(provenanceBefore, provenanceAfter) };
  const summary = { version: meta.version, package: pkg, node: process.version, provenance, modeMask: `0o${modeMask.toString(8)}`, startRound: opts.startRound, rounds: opts.rounds, ...(opts.diagnoseExclude ? { diagnosticExclude: true } : {}), projects: results.length, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed && r.status !== 'not-verified').length, notVerified: results.filter(r => r.status === 'not-verified').length,
    limitations: ['Cada rodada contém 40 projetos; o limite é 100 rodadas (4.000 projetos), com custo de tempo e espaço proporcional; não há limite global de disco ou duração.', 'Documentos extensíveis aceitam apenas conteúdo original ou original seguido do bloco AgentDevKit exato esperado, além de modo e diretórios preservados; variantes legítimas desse bloco podem ser sinalizadas e exigem análise.', 'Projetos sintéticos locais; verifica inventário, hashes e seleção instalados após cada etapa, mas não executa skills, agentes, clientes nativos ou testes de aplicações.', 'A estabilidade do inventário indica idempotência dos arquivos gerenciados observados; update, doctor e sync dependem da CLI e de sua saída e não provam atualização a partir de conteúdo legado diferente.', 'Apontamentos Markdown de skills, perfis, comandos e regras usam política e fontes do pacote; destinos humanos preservados sem bloco são marcados não verificados. Descoberta e execução nativas não são testadas.', 'Logs de saída são texto decodificado como UTF-8; bytes inválidos não são preservados fielmente.', 'Não impede acesso à rede pelo sistema operacional.', 'Não testa configuração ou credenciais reais: remove NODE_OPTIONS, GIT_* e npm_config_* e isola configuração global do Git.', 'Os snapshots cobrem arquivos e índice registrados ao final de cada etapa; não detectam alteração e reversão durante um mesmo processo.', 'Refs das fixtures usam .git/refs e packed-refs; outros formatos e metadados Git não são cobertos.', 'Timeout ou excesso de saída deixam preservação não verificada; descendentes que escapem do grupo podem permanecer.', ...(process.platform === 'win32' ? ['No Windows, o modo compara apenas o bit de escrita reportado pelo Node; ACLs não são verificadas.', 'No Windows, apenas o processo filho é encerrado; descendentes podem permanecer.'] : [])], results };
  summary.status = overallStatus(provenance.passed, summary.failed, summary.notVerified);
  summary.limitations.push('ruleScopes registra configuração documental: origem de leitura explícita sem apontamento Claude na fixture, ou modo Cursor comparado à regra e ao sidecar. A execução do cliente permanece não testada.');
  summary.limitations.push('A proveniência compara os oito arquivos indicados e os sidecars Cursor presentes no início e no fim; não autentica o pacote, não cobre os demais arquivos nem detecta alteração transitória revertida. Os imports podem ter sido carregados antes da primeira medição.');
  const report = join(directory, 'RESULT.json'); writeFileSync(report, JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ report, version: summary.version, status: summary.status, diagnosticExclude: Boolean(opts.diagnoseExclude), startRound: summary.startRound, rounds: summary.rounds, projects: summary.projects, passed: summary.passed, failed: summary.failed, notVerified: summary.notVerified, provenancePassed: provenance.passed }));
  if (summary.status !== 'passed') process.exitCode = 1;
}

let entry = false;
try { entry = Boolean(process.argv[1]) && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url)); } catch { /* Importação ou entrada ausente. */ }
if (entry) main().catch(error => { console.error(error.message); process.exitCode = 1; });
