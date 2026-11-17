#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectedStagedRefusal, mustStop } from './gemini-command-flow-policy.mjs';
import { inspectFixture } from './gemini-command-fixture.mjs';

if (process.versions.bun || Number(process.versions.node.split('.')[0]) < 24) {
  console.error('Esta prova exige Node.js 24+ e não instala runtimes.');
  process.exit(1);
}

// Optional regression proof. All fixtures and outputs remain in a new temp dir.
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(repo, 'bin', 'agentdevkit.mjs');
const base = mkdtempSync(join(tmpdir(), 'agentdevkit-gemini-command-'));
const home = join(base, 'home');
mkdirSync(home);
const gitTemplate = join(base, 'git-template');
mkdirSync(gitTemplate);
const globalGitConfig = join(base, 'gitconfig');
writeFileSync(globalGitConfig, '');
const env = Object.fromEntries(['PATH', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
Object.assign(env, {
  HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: join(base, 'config'), XDG_CACHE_HOME: join(base, 'cache'),
  TMPDIR: base, TMP: base, TEMP: base, GIT_CONFIG_GLOBAL: globalGitConfig,
  GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', npm_config_offline: 'true',
});
const target = '.gemini/commands/revisar-entrega.toml';
const hash = file => existsSync(file) ? createHash('sha256').update(readFileSync(file)).digest('hex') : null;
function run(program, args, cwd) {
  const result = spawnSync(program, args, { cwd, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  let json = null;
  if (args.includes('--json')) {
    try { const parsed = JSON.parse(result.stdout); json = { ok: parsed.ok, command: parsed.command, clients: parsed.clients, errorCode: parsed.error?.code || null, conflicts: parsed.conflicts || [] }; } catch { /* Invalid JSON fails the check. */ }
  }
  return { status: result.status, signal: result.signal, error: result.error?.code || null, stderr: (result.stderr || '').slice(0, 500), json };
}
function mustRun(program, args, cwd) {
  const result = run(program, args, cwd);
  if (result.status !== 0 || result.error) throw new Error(`${program} falhou: ${JSON.stringify(result)}`);
}
function stagedDiffHash(root) {
  const result = spawnSync('git', ['diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv'], { cwd: root, env, timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0 || result.error) throw new Error('Não foi possível comparar o diff staged.');
  return createHash('sha256').update(result.stdout).digest('hex');
}
function refsHash(root) {
  const result = spawnSync('git', ['show-ref'], { cwd: root, env, timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  if (![0, 1].includes(result.status) || result.error) throw new Error('Não foi possível comparar as referências Git.');
  return createHash('sha256').update(result.stdout).digest('hex');
}
function readStage(root, baseline, phase, result, marker, previousSyncHash) {
  const file = join(root, target), present = existsSync(file);
  const content = present ? readFileSync(file, 'utf8') : '';
  const observed = inspectFixture(content, marker);
  const expectedCommand = phase === 'sync-cli-repeat' || phase === 'sync-check' ? 'sync' : phase === 'sync-cli' ? 'sync' : phase;
  const checkJson = ['init', 'sync-cli', 'sync-cli-repeat', 'sync-check', 'update'].includes(phase);
  const checks = {
    processSucceeded: result.status === 0 && !result.error,
    indexPreserved: hash(join(root, '.git/index')) === baseline.index,
    stagedDiffPreserved: stagedDiffHash(root) === baseline.stagedDiff,
    gitHeadPreserved: hash(join(root, '.git/HEAD')) === baseline.gitHead,
    gitRefsPreserved: refsHash(root) === baseline.gitRefs,
    packedRefsPreserved: hash(join(root, '.git/packed-refs')) === baseline.packedRefs,
    gitConfigPreserved: hash(join(root, '.git/config')) === baseline.gitConfig,
    gitExcludePreserved: hash(join(root, '.git/info/exclude')) === baseline.gitExclude,
    gitignorePreserved: hash(join(root, '.gitignore')) === baseline.gitignore,
    readmePreserved: hash(join(root, 'README.md')) === baseline.readme,
    humanFilePreserved: hash(join(root, 'human-notes.txt')) === baseline.humanFile,
    fixtureSyntaxValid: observed.fixtureSyntaxValid,
    humanPromptPreserved: observed.humanPromptPreserved,
    humanDescriptionPreserved: observed.humanDescriptionPreserved,
    humanCommentPreserved: observed.humanCommentPreserved,
    argumentPlaceholderExactlyOnce: observed.argumentPlaceholderExactlyOnce,
    managedReferencePresent: observed.managedReferencePresent,
    expectedCliResult: !checkJson || result.json?.ok === true && result.json.command === expectedCommand && result.json.clients?.includes('gemini'),
    repeatedSyncIdempotent: phase !== 'sync-cli-repeat' || hash(file) === previousSyncHash,
  };
  return { phase, process: result, promptPlaceholderCount: observed.promptPlaceholderCount, fileSha256: hash(file), checks, passed: Object.values(checks).every(Boolean) };
}

const cases = [];
try {
  const enclosingGit = run('git', ['-C', base, 'rev-parse', '--git-dir'], base);
  if (enclosingGit.status !== 128 || enclosingGit.error) throw new Error('A pasta temporária deve estar fora de qualquer repositório Git.');
  for (const gitState of ['untracked', 'staged', 'tracked-unstaged', 'staged-and-unstaged']) for (const humanHasPlaceholder of [false, true]) {
    const root = join(base, `${gitState}-${humanHasPlaceholder ? 'human-args' : 'no-human-args'}`);
    mkdirSync(join(root, '.gemini', 'commands'), { recursive: true });
    const marker = `Humano usa marcador${humanHasPlaceholder ? ' {{args}}' : ''}`;
    const human = `description = "Comando humano"\nprompt = "${marker}" # preservar comentário\n`;
    const tracked = ['tracked-unstaged', 'staged-and-unstaged'].includes(gitState);
    const baseCommand = 'description = "Versão base"\nprompt = "Base"\n';
    const stagedCommand = 'description = "Versão no índice"\nprompt = "Mudança staged"\n';
    writeFileSync(join(root, target), tracked ? baseCommand : human);
    writeFileSync(join(root, '.gitignore'), '# Regra humana\nprivate/\n');
    writeFileSync(join(root, 'README.md'), '# Projeto sintético\nConteúdo humano.\n');
    writeFileSync(join(root, 'human-notes.txt'), 'Conteúdo humano separado, preservado em bytes.\n');
    mustRun('git', ['init', '--quiet', `--template=${gitTemplate}`], root);
    mustRun('git', ['add', '--', '.gitignore', 'README.md', 'human-notes.txt', ...(gitState !== 'untracked' ? [target] : [])], root);
    if (tracked) {
      mustRun('git', ['-c', 'user.name=Fixture Sintética', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '--no-verify', '-m', 'fixture'], root);
      if (gitState === 'staged-and-unstaged') {
        writeFileSync(join(root, target), stagedCommand);
        mustRun('git', ['add', '--', target], root);
      }
      writeFileSync(join(root, target), human);
    }
    const stagedLookup = run('git', ['ls-files', '--error-unmatch', '--', target], root);
    const stagedDiff = run('git', ['diff', '--cached', '--quiet', '--', target], root);
    const workingDiff = run('git', ['diff', '--quiet', '--', target], root);
    if (stagedLookup.error || stagedLookup.status !== (gitState === 'untracked' ? 1 : 0)
      || stagedDiff.error || stagedDiff.status !== (['staged', 'staged-and-unstaged'].includes(gitState) ? 1 : 0)
      || workingDiff.error || workingDiff.status !== (tracked ? 1 : 0)) throw new Error(`Estado Git não confirmado: ${gitState}.`);
    const baseline = {
      index: hash(join(root, '.git/index')), stagedDiff: stagedDiffHash(root), gitHead: hash(join(root, '.git/HEAD')), gitRefs: refsHash(root),
      packedRefs: hash(join(root, '.git/packed-refs')), gitConfig: hash(join(root, '.git/config')),
      gitExclude: hash(join(root, '.git/info/exclude')), gitignore: hash(join(root, '.gitignore')),
      readme: hash(join(root, 'README.md')), humanFile: hash(join(root, 'human-notes.txt')), target: hash(join(root, target)),
    };
    const item = { gitState, gitStateConfirmed: true, humanHasPlaceholder, stages: [] };
    cases.push(item);
    const steps = [
      ['init', () => run(process.execPath, [cli, 'init', '--target', root, '--agents', 'gemini', '--yes', '--json'], root)],
      ['sync-cli', () => run(process.execPath, [cli, 'sync', '--target', root, '--yes', '--json'], root)],
      ['sync-cli-repeat', () => run(process.execPath, [cli, 'sync', '--target', root, '--yes', '--json'], root)],
      ['update', () => run(process.execPath, [cli, 'update', '--target', root, '--yes', '--json'], root)],
      ['sync-check', () => run(process.execPath, [cli, 'sync', '--target', root, '--check', '--json'], root)],
      ['sync-script', () => run(process.execPath, [join(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), '--root', root], root)],
    ];
    let previousSyncHash = null, stopped = false, stopReason = null;
    for (const [phase, action] of steps) {
      if (stopped) { item.stages.push({ phase, outcome: 'not-run', reason: stopReason }); continue; }
      const result = action();
      const stage = readStage(root, baseline, phase, result, marker, previousSyncHash);
      if (expectedStagedRefusal({ gitState, phase, result, stage, originalHash: baseline.target })) {
        stage.outcome = 'expected-conservative-refusal';
        stage.passed = true;
        item.outcome = 'expected-conservative-refusal';
        stopped = true; stopReason = 'expected-conservative-refusal';
      } else if (mustStop(stage.checks)) {
        stage.outcome = 'failed'; stopped = true; stopReason = 'failed-check';
      } else stage.outcome = stage.passed ? 'passed' : 'failed';
      item.stages.push(stage);
      if (phase === 'sync-cli') previousSyncHash = stage.fileSha256;
    }
    item.passed = item.outcome === 'expected-conservative-refusal'
      ? item.stages[0].passed === true && item.stages.slice(1).every(stage => stage.outcome === 'not-run' && stage.reason === item.outcome)
      : item.stages.every(stage => stage.passed === true);
    item.outcome ||= item.passed ? 'passed' : 'failed';
  }
} catch (error) {
  cases.push({ setupError: error.message, passed: false });
}
const report = {
  fixtureRoot: base, cases,
  passed: cases.length === 8 && cases.every(item => item.passed),
  limitations: ['Fixtures sintéticas; o analisador independente cobre apenas o formato restrito usado neste teste, não TOML em geral nem o cliente Gemini.', 'Node e Git executam com as permissões do usuário; o runner não bloqueia rede nem detecta alterações transitórias revertidas.', 'O pacote testado é o checkout local, não um pacote publicado.'],
};
writeFileSync(join(base, 'RESULT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
