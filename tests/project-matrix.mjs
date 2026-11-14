#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const selections = [
  'codex', 'claude', 'opencode', 'gemini', 'copilot', 'cursor', 'kimi',
  'minimax', 'deepseek', 'antigravity', 'antigravity-legacy', 'zcode',
  'kimi-legacy', 'mimo', 'claude,codex', 'copilot,cursor', 'codex,opencode',
  'gemini,claude', 'deepseek,minimax', 'antigravity,copilot',
];
const usage = 'Uso: node tests/project-matrix.mjs --package <diretório> --version <versão> [--output <diretório>] [--jobs 1..4]';
const sha = value => createHash('sha256').update(value).digest('hex');
// Windows expõe apenas a distinção de escrita, sem equivalência de ACL POSIX.
const modeMask = process.platform === 'win32' ? 0o200 : 0o777;
const within = (root, path) => { const p = relative(root, path); return p === '' || (!isAbsolute(p) && p !== '..' && !p.startsWith(`..${sep}`)); };

function options(args) {
  const out = { jobs: 3 };
  while (args.length) {
    const key = args.shift();
    if (key === '--help' || key === '-h') { if (args.length) throw Error(usage); return { help: true }; }
    if (!['--package', '--version', '--output', '--jobs'].includes(key) || !args.length) throw Error(usage);
    const name = key.slice(2);
    if (Object.hasOwn(out, name) && name !== 'jobs') throw Error(`Opção repetida: ${key}`);
    const value = args.shift();
    if (!value || value.startsWith('--')) throw Error(usage);
    if (name === 'jobs') {
      if (out.jobsSet || !/^[1-4]$/.test(value)) throw Error('--jobs deve estar entre 1 e 4.');
      out.jobsSet = true; out.jobs = Number(value);
    } else out[name] = value;
  }
  if (!out.package || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(out.version || '')) throw Error(usage);
  return out;
}

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

export async function projectCase(item, directory, cli, version, env, runCommand = command) {
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
  const initialPaths = ['.gitignore', 'HUMAN-STAGED.txt', 'HUMAN-UNTRACKED.txt', ...(item.kind === 'existing' ? [...Object.keys(humanDocuments), ...Object.keys(humanHubSkills), '.claude/settings.json', '.claude/skills/equipe/SKILL.md', 'src/main.js'] : [])];
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
  let baseline = null, preservation = null, issue = null;
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
      try { const original = Buffer.from(content), documentAfter = snapshot(root, path), actual = readFileSync(join(root, path)); documents[path] = { after: documentAfter, originalPrefixPreserved: actual.subarray(0, original.length).equals(original), modePreserved: documentAfter.mode === baseline.documents[path].mode, directoriesPreserved: JSON.stringify(documentAfter.directories) === JSON.stringify(baseline.documents[path].directories) }; }
      catch (error) { documents[path] = { error: error.message, originalPrefixPreserved: false, modePreserved: false, directoriesPreserved: false }; }
    }
    const uncertain = operations.some(operation => operation.timedOut || operation.exceeded || operation.signal);
    const observedUnchanged = Object.keys(baseline.unchanged).every(path => JSON.stringify(baseline.unchanged[path]) === JSON.stringify(after[path]));
    const optional = Object.fromEntries(Object.keys(baseline.optional).map(path => [path, optionalSnapshot(path)]));
    const observedOptionalUnchanged = Object.keys(baseline.optional).every(path => JSON.stringify(baseline.optional[path]) === JSON.stringify(optional[path]));
    let refs; try { refs = snapshotRefs(root); } catch (error) { refs = { error: error.message }; }
    const observedRefsUnchanged = JSON.stringify(baseline.refs) === JSON.stringify(refs);
    const observedDocumentsPreserved = Object.values(documents).every(document => document.originalPrefixPreserved && document.modePreserved && document.directoriesPreserved);
    return { baseline, after, optional, refs, documents, status: uncertain ? 'not-verified' : 'verified', observedUnchanged, observedOptionalUnchanged, observedRefsUnchanged, observedDocumentsPreserved,
      unchanged: uncertain ? null : observedUnchanged && observedOptionalUnchanged && observedRefsUnchanged, documentsPreserved: uncertain ? null : observedDocumentsPreserved };
  };
  try {
    const init = await invoke('git-init', 'git', ['init', '--quiet']);
    if (!good(init)) throw Error('git init falhou; consulte o log.');
    const exclude = join(root, '.git/info/exclude');
    const excludeOriginal = Buffer.concat([readFileSync(exclude), Buffer.from('\n# regra humana local\nprivate-local/\n')]);
    writeFileSync(exclude, excludeOriginal);
    expectedDocuments['.git/info/exclude'] = excludeOriginal;
    if (item.kind === 'existing') {
      const addBase = await invoke('git-add-base', 'git', ['add', '--', '.gitignore', 'AGENTS.md', 'CLAUDE.md', '.claude', '.pbai4devs/skills', 'src/main.js']);
      if (!good(addBase)) throw Error('git add inicial da fixture falhou; consulte o log.');
      const commit = await invoke('git-commit-base', 'git', ['-c', 'user.name=Fixture Developer', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'test: criar fixture sintética']);
      if (!good(commit)) throw Error('commit inicial da fixture falhou; consulte o log.');
    }
    const add = await invoke('git-add', 'git', ['add', '--', '.gitignore', 'HUMAN-STAGED.txt']);
    if (!good(add)) throw Error('git add da fixture falhou; consulte o log.');
    writeFileSync(join(root, 'HUMAN-STAGED.txt'), unstaged);
    const paths = ['.git/index', '.git/HEAD', '.git/config', '.gitignore', 'HUMAN-STAGED.txt', 'HUMAN-UNTRACKED.txt', ...(item.kind === 'existing' ? [...Object.keys(humanHubSkills), '.claude/settings.json', '.claude/skills/equipe/SKILL.md', 'src/main.js'] : [])];
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
      if (!good(result) || json?.ok !== true || json?.version !== version) { issue = `${name} falhou ou não confirmou a versão solicitada.`; break; }
      if (stepSnapshot.status !== 'verified' || !stepSnapshot.unchanged || !stepSnapshot.documentsPreserved) { issue = `${name} não preservou os arquivos ou não pôde ser verificado.`; break; }
    }
  } catch (error) { issue = error.message; }
  if (baseline) {
    preservation = assess();
    writeFileSync(join(caseDirectory, 'AFTER.json'), JSON.stringify(preservation, null, 2) + '\n', { flag: 'wx' });
  }
  const result = { ...item, root, operations, preservation, issue, passed: !issue && operations.filter(operation => ['init', 'update', 'update-force', 'doctor', 'sync-check'].includes(operation.label)).length === 5 && preservation?.unchanged === true && preservation?.documentsPreserved === true };
  writeFileSync(join(caseDirectory, 'RESULT.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  return result;
}

async function main() {
  const opts = options(process.argv.slice(2));
  if (opts.help) { console.log(usage); return; }
  if (Number(process.versions.node.split('.')[0]) < 24) throw Error('Use Node.js 24+ já instalado; este runner não instala runtimes.');
  const pkg = realpathSync(resolve(opts.package));
  if (!statSync(pkg).isDirectory()) throw Error('--package deve apontar para o diretório de um pacote instalado.');
  const meta = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'));
  if (meta.name !== '@pathbit/agentdevkit' || meta.version !== opts.version) throw Error(`Pacote ou versão divergente: ${meta.name}@${meta.version}.`);
  const cli = join(pkg, 'bin/agentdevkit.mjs');
  if (!statSync(cli).isFile()) throw Error('CLI do pacote instalado não encontrada.');
  const directory = mkdtempSync(join(outputParent(opts.output), 'adk-project-matrix-'));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_|^npm_config_|^NODE_OPTIONS$/i.test(k) && !/(?:^|_)(?:token|secret|password)(?:_|$)/i.test(k)));
  Object.assign(env, { GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(directory, 'empty-gitconfig'), npm_config_offline: 'true', npm_config_audit: 'false', npm_config_fund: 'false' });
  writeFileSync(join(directory, 'empty-gitconfig'), '', { flag: 'wx' });
  const cases = selections.flatMap((selection, i) => ['new', 'existing'].map(kind => ({ number: i + 1, selection, kind })));
  const results = new Array(cases.length); let cursor = 0;
  const worker = async () => { while (true) { const index = cursor++; if (index >= cases.length) return; try { results[index] = await projectCase(cases[index], directory, cli, opts.version, env); } catch (error) { results[index] = { ...cases[index], passed: false, issue: error.stack || error.message }; } } };
  await Promise.all(Array.from({ length: opts.jobs }, worker));
  const summary = { version: meta.version, package: pkg, node: process.version, modeMask: `0o${modeMask.toString(8)}`, projects: results.length, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length,
    limitations: ['Projetos sintéticos locais; não executa skills, agentes, clientes nativos ou testes de aplicações.', 'Não impede acesso à rede pelo sistema operacional.', 'Não testa configuração ou credenciais reais: remove NODE_OPTIONS, GIT_* e npm_config_* e isola configuração global do Git.', 'Os snapshots cobrem arquivos e índice registrados ao final de cada etapa; não detectam alteração e reversão durante um mesmo processo.', 'Refs das fixtures usam .git/refs e packed-refs; outros formatos e metadados Git não são cobertos.', 'Timeout ou excesso de saída deixam preservação não verificada; descendentes que escapem do grupo podem permanecer.', ...(process.platform === 'win32' ? ['No Windows, o modo compara apenas o bit de escrita reportado pelo Node; ACLs não são verificadas.', 'No Windows, apenas o processo filho é encerrado; descendentes podem permanecer.'] : [])], results };
  const report = join(directory, 'RESULT.json'); writeFileSync(report, JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ report, version: summary.version, projects: summary.projects, passed: summary.passed, failed: summary.failed }));
  if (summary.failed) process.exitCode = 1;
}

let entry = false;
try { entry = Boolean(process.argv[1]) && realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url)); } catch { /* Importação ou entrada ausente. */ }
if (entry) main().catch(error => { console.error(error.message); process.exitCode = 1; });
