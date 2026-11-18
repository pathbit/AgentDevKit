#!/usr/bin/env node
// Optional, offline proof against an explicitly supplied trusted package.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.versions.bun || Number(process.versions.node.split('.')[0]) < 24) throw new Error('A prova exige Node 24+.');
if (process.platform !== 'darwin' || !existsSync('/usr/bin/sandbox-exec')) throw new Error('Prova não executada: exige sandbox-exec no macOS.');
const options = {};
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i];
  if (key === '--diagnose-exclude' && !options[key]) { options[key] = true; continue; }
  if (!['--package', '--parser', '--gemini-loader'].includes(key) || options[key] || !process.argv[i + 1] || process.argv[i + 1].startsWith('--')) throw new Error('Uso: --package <pacote confiável> [--parser <módulo>] [--gemini-loader <módulo>] [--diagnose-exclude].');
  options[key] = realpathSync(resolve(process.argv[++i]));
}
if (!options['--package']) throw new Error('Informe --package com um pacote local confiável.');
const pkg = options['--package'];
const meta = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'));
if (meta.name !== '@pathbit/agentdevkit' || !existsSync(join(pkg, 'bin/agentdevkit.mjs'))) throw new Error('Pacote local incompatível.');
const root = realpathSync(mkdtempSync(join(tmpdir(), 'agentdevkit-gemini-lifecycle-')));
const home = join(root, 'home'), temp = join(root, 'temp'), template = join(root, 'git-template');
for (const dir of [home, temp, template]) mkdirSync(dir);
const globalConfig = join(root, 'gitconfig'); writeFileSync(globalConfig, '');
const env = { PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin', HOME: home, USERPROFILE: home, TMPDIR: temp, TMP: temp, TEMP: temp, XDG_CONFIG_HOME: join(root, 'config'), XDG_CACHE_HOME: join(root, 'cache'), GIT_CONFIG_GLOBAL: globalConfig, GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', GIT_ALLOW_PROTOCOL: 'file', npm_config_offline: 'true', LANG: 'C', LC_ALL: 'C' };
const profile = join(root, 'sandbox.sb');
const allowedRead = [pkg, ...(options['--parser'] ? [dirname(options['--parser'])] : []), ...(options['--gemini-loader'] ? [dirname(options['--gemini-loader'])] : [])];
writeFileSync(profile, `(version 1)\n(allow default)\n(deny network*)\n(deny file-write*)\n(allow file-write* (subpath ${JSON.stringify(root)}) (literal "/dev/null"))\n(deny file-read* (subpath ${JSON.stringify(homedir())}))\n${allowedRead.map(dir => `(allow file-read* (subpath ${JSON.stringify(dir)}))`).join('\n')}\n`);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const readHash = file => existsSync(file) ? hash(readFileSync(file)) : null;
function invoke(bin, args, cwd) {
  const r = spawnSync('/usr/bin/sandbox-exec', ['-f', profile, bin, ...args], { cwd, env, encoding: 'utf8', timeout: 120000, maxBuffer: 12 * 1024 * 1024 });
  return { status: r.status, signal: r.signal, error: r.error?.code || null, stdout: r.stdout || '' };
}
function must(bin, args, cwd) {
  const r = invoke(bin, args, cwd);
  if (r.status !== 0 || r.error) throw new Error(`Falha em operação da fixture: status=${r.status}, erro=${r.error || 'none'}.`);
  return r;
}
const git = (args, cwd) => invoke('git', args, cwd);
function gitDigest(args, cwd, accepted = [0]) {
  const result = git(args, cwd);
  if (result.error || !accepted.includes(result.status)) throw new Error('Consulta Git da fixture falhou.');
  return hash(result.stdout);
}
const outerGit = git(['-C', root, 'rev-parse', '--git-dir'], root);
if (outerGit.status !== 128 || outerGit.error) throw new Error('A pasta temporária não está comprovadamente fora de Git.');
const command = '.gemini/commands/revisar-entrega.toml';
const inspectSource = fileURLToPath(new URL('./gemini-command-lifecycle-inspect.mjs', import.meta.url));
const inspect = join(root, 'inspect.mjs');
writeFileSync(inspect, readFileSync(inspectSource));
const report = { packageVersion: meta.version, platform: process.platform, node: process.version, fixtureRoot: root, diagnoseExclude: Boolean(options['--diagnose-exclude']), sandbox: 'macOS: rede negada, escrita restrita à fixture, leitura da pasta pessoal negada exceto pacote e módulos explícitos', cases: [], limitations: ['Pacote e módulos explicitamente fornecidos devem ser confiáveis.', 'Não chama action do Gemini, inferência ou serviços.', 'Exclusão Git alterada é falha de preservação; --diagnose-exclude permite continuar apenas se o prefixo humano for mantido.', 'Os snapshots não detectam modificações transitórias revertidas; TOML sem parser externo fica não verificado.'] };
let setupFailed = false;
try {
  for (const staged of [false, true]) {
    const project = join(root, staged ? 'staged' : 'untracked');
    mkdirSync(join(project, '.gemini/commands'), { recursive: true });
    const originalPrompt = 'Humano pede análise {{args}}';
    const original = `description = "Comando humano"\nprompt = "${originalPrompt}" # comentário humano\n`;
    writeFileSync(join(project, command), original);
    writeFileSync(join(project, '.gitignore'), '# Ignore humano\nprivate-human/\n');
    writeFileSync(join(project, 'README.md'), '# Projeto sintético\nConteúdo humano.\n');
    writeFileSync(join(project, 'human-notes.txt'), 'Conteúdo humano preservado.\n');
    must('git', ['init', '--quiet', `--template=${template}`], project);
    mkdirSync(join(project, '.git/info'), { recursive: true });
    writeFileSync(join(project, '.git/info/exclude'), '# Exclusão humana\nprivate-human/\n');
    must('git', ['add', '--', '.gitignore', 'README.md', 'human-notes.txt', ...(staged ? [command] : [])], project);
    const lookup = git(['ls-files', '--error-unmatch', '--', command], project);
    if (lookup.error || lookup.status !== (staged ? 0 : 1)) throw new Error('Estado staged ou não rastreado não confirmado.');
    const protectedPaths = ['.git/index', '.git/HEAD', '.git/packed-refs', '.git/config', '.git/info/exclude', '.gitignore', 'README.md', 'human-notes.txt'];
    const initial = Object.fromEntries(protectedPaths.map(p => [p, readHash(join(project, p))]));
    const initialStagedDiff = gitDigest(['diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv'], project);
    const initialRefs = gitDigest(['show-ref'], project, [0, 1]);
    const humanExclude = readFileSync(join(project, '.git/info/exclude'));
    const item = { gitState: staged ? 'staged' : 'untracked', stages: [] }; report.cases.push(item);
    async function capture(phase, processResult) {
      const file = join(project, command), bytes = readFileSync(file), text = bytes.toString('utf8');
      const observed = invoke(process.execPath, [inspect, file, options['--parser'] || '', options['--gemini-loader'] || ''], project);
      const blocked = () => ({ parser: { status: options['--parser'] ? 'blocked' : 'not-verified' }, loader: { status: options['--gemini-loader'] ? 'blocked' : 'not-verified' } });
      let observation = blocked();
      try {
        if (observed.status === 0) {
          const parsedObservation = JSON.parse(observed.stdout);
          if (parsedObservation.parser && parsedObservation.loader) observation = parsedObservation;
        }
      } catch { /* malformed output remains blocked */ }
      const parsed = observation.parser;
      if (options['--parser'] && parsed.status === 'observed' && (typeof parsed.prompt !== 'string' || typeof parsed.description !== 'string')) parsed.status = 'failed';
      if (options['--gemini-loader'] && !['accepted', 'rejected', 'failed'].includes(observation.loader.status)) observation.loader.status = 'blocked';
      const prompt = parsed.status === 'observed' ? parsed.prompt : null;
      const protection = Object.fromEntries(protectedPaths.map(p => [p, readHash(join(project, p)) === initial[p]]));
      protection.stagedDiff = gitDigest(['diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv'], project) === initialStagedDiff;
      protection.refs = gitDigest(['show-ref'], project, [0, 1]) === initialRefs;
      const exclude = readFileSync(join(project, '.git/info/exclude'));
      const stage = { phase, process: processResult, protection, excludeHumanPrefixPreserved: exclude.subarray(0, humanExclude.length).equals(humanExclude), humanBytesIdentical: bytes.equals(Buffer.from(original)), humanPromptExact: prompt === null ? null : prompt === originalPrompt, humanPromptPrefixPreserved: prompt === null ? null : typeof prompt === 'string' && prompt.startsWith(originalPrompt), promptArgumentCount: typeof prompt === 'string' ? prompt.split('{{args}}').length - 1 : null, managedBlockPresent: typeof prompt === 'string' ? prompt.includes('<!-- BEGIN AGENTDEVKIT -->') : null, managedReferencePresent: typeof prompt === 'string' ? prompt.includes('@{.pbai4devs/commands/revisar-entrega/COMMAND.md}') : null, descriptionPreserved: parsed.status === 'observed' ? parsed.description === 'Comando humano' : null, commentPreserved: text.includes('# comentário humano'), parser: parsed.status, loader: observation.loader.status, fileSha256: hash(bytes) };
      item.stages.push(stage);
      return stage;
    }
    const cli = (...args) => {
      const r = invoke(process.execPath, [join(pkg, 'bin/agentdevkit.mjs'), ...args, '--target', project, '--json'], project);
      let parsed = null; try { parsed = JSON.parse(r.stdout); } catch { /* invalid output fails */ }
      return { status: r.status, signal: r.signal, error: r.error, ok: parsed?.ok === true, code: parsed?.error?.code || null };
    };
    const stopForIntegrity = stage => Object.entries(stage.protection).some(([key, preserved]) => key !== '.git/info/exclude' && !preserved)
      || !stage.commentPreserved || ['failed', 'blocked'].includes(stage.parser) || ['failed', 'blocked', 'rejected'].includes(stage.loader)
      || stage.parser === 'observed' && (stage.humanPromptPrefixPreserved !== true || stage.descriptionPreserved !== true)
      || !stage.protection['.git/info/exclude'] && (!options['--diagnose-exclude'] || !stage.excludeHumanPrefixPreserved);
    let stage = await capture('before', null);
    if (stopForIntegrity(stage)) { item.outcome = 'integrity-blocked'; continue; }
    let operation = cli('init', '--agents', 'gemini', '--yes'); stage = await capture('init', operation);
    if (operation.status !== 0 || !operation.ok) { item.outcome = 'init-blocked'; continue; }
    if (stopForIntegrity(stage) || stage.parser === 'observed' && !stage.managedReferencePresent) { item.outcome = 'integrity-blocked'; continue; }
    operation = cli('sync'); stage = await capture('sync', operation);
    if (operation.status !== 0 || !operation.ok) { item.outcome = 'sync-blocked'; continue; }
    if (stopForIntegrity(stage) || stage.parser === 'observed' && !stage.managedReferencePresent) { item.outcome = 'integrity-blocked'; continue; }
    operation = cli('agents', 'claude'); await capture('deselect-gemini', operation);
    const final = item.stages.at(-1);
    item.outcome = operation.status !== 0 || !operation.ok ? 'deselect-blocked' : final.humanBytesIdentical && final.humanPromptExact === true && final.managedBlockPresent === false ? 'restored' : final.humanPromptExact === null ? 'not-verified' : 'not-restored';
  }
} catch (error) {
  setupFailed = true;
  report.setupError = error.message;
}
const failures = report.cases.some(item => item.stages.some(stage => Object.values(stage.protection).some(value => !value) || !stage.commentPreserved || stage.parser === 'failed' || stage.parser === 'blocked' || stage.parser === 'observed' && (stage.humanPromptPrefixPreserved !== true || stage.descriptionPreserved !== true || stage.promptArgumentCount !== 1) || ['failed', 'blocked', 'rejected'].includes(stage.loader)) || ['init-blocked', 'sync-blocked', 'deselect-blocked', 'integrity-blocked', 'not-restored'].includes(item.outcome));
const unverified = report.cases.length !== 2 || report.cases.some(item => item.outcome === 'not-verified' || item.stages.some(stage => stage.parser === 'not-verified' || stage.loader === 'not-verified'));
report.status = setupFailed || failures ? 'failed' : unverified ? 'not-verified' : 'passed';
writeFileSync(join(root, 'RESULT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'passed') process.exitCode = report.status === 'not-verified' ? 2 : 1;
