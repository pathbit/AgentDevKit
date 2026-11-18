#!/usr/bin/env node
// Offline evidence for a published 0.0.21 installation upgraded by the local kit.
import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { appendFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findNpmCli } from '../.pbai4devs/scripts/lib/npm.mjs';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const controller = fileURLToPath(import.meta.url);
const controllerBefore = createHash('sha256').update(readFileSync(controller)).digest('hex');
const archive = process.argv[2] && resolve(process.argv[2]);
const expected = 'sha512-1FOfpiHEYwJ0dmy86dhNQ1L87ntPyVR8rWgIUZ6o7XLV+MS866FY8dhBkDdD4BzenbnJwpT2bcn+bKJrSsXq3g==';
if (!archive) throw new Error('Uso: node tests/upgrade-published-021.mjs <tarball-0.0.21>');
if (`sha512-${createHash('sha512').update(readFileSync(archive)).digest('base64')}` !== expected) throw new Error('Tarball 0.0.21 diverge da integridade npm registrada.');
const npm = findNpmCli();
if (!npm) throw new Error('Node e npm são necessários.');
const artifactRoot = join(source, '.agent-tests');
try { mkdirSync(artifactRoot, { mode: 0o700 }); }
catch (error) { if (error.code !== 'EEXIST') throw error; }
const artifactInfo = lstatSync(artifactRoot);
if (!artifactInfo.isDirectory() || artifactInfo.isSymbolicLink()) throw new Error('.agent-tests deve ser um diretório real.');
const ignored = spawnSync('git', ['-C', source, 'check-ignore', '--no-index', '-q', '--', '.agent-tests/'], { encoding: 'utf8' });
if (ignored.error || ignored.status !== 0) throw new Error('.agent-tests não está comprovadamente ignorado pelo Git.');
const work = mkdtempSync(join(artifactRoot, 'upgrade-021-'));
const userConfig = join(work, 'user.npmrc'), globalConfig = join(work, 'global.npmrc');
writeFileSync(userConfig, ''); writeFileSync(globalConfig, '');
const env = { ...process.env, npm_config_userconfig: userConfig, npm_config_globalconfig: globalConfig, npm_config_cache: join(work, 'cache'), npm_config_offline: 'true', npm_config_ignore_scripts: 'true', npm_config_audit: 'false', npm_config_fund: 'false' };
const execute = (command, args, cwd, allowed = [0]) => {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || !allowed.includes(result.status)) throw new Error(`${command} falhou: ${result.error?.message || result.stderr || result.stdout}`);
  return result;
};
const put = (root, path, content) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); };
const read = (root, path) => readFileSync(join(root, path));
const checksum = bytes => createHash('sha256').update(bytes).digest('hex');
const capture = (root, paths) => Object.fromEntries(paths.map(path => {
  try { return [path, checksum(read(root, path))]; }
  catch (error) { if (error.code === 'ENOENT') return [path, null]; throw error; }
}));
const tree = (root, path) => {
  const files = {};
  const visit = relative => {
    const absolute = join(root, relative);
    let info;
    try { info = lstatSync(absolute); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    if (info.isSymbolicLink()) throw new Error(`Link inesperado na fixture: ${relative}`);
    if (info.isDirectory()) for (const name of readdirSync(absolute).sort()) visit(`${relative}/${name}`);
    else if (info.isFile()) files[relative] = checksum(readFileSync(absolute));
    else throw new Error(`Tipo inesperado na fixture: ${relative}`);
  };
  visit(path); return files;
};
const packed = JSON.parse(execute(process.execPath, [npm, 'pack', '--json', '--ignore-scripts', '--pack-destination', work], source).stdout)[0];
const currentArchive = join(work, packed.filename);
const oldDir = join(work, 'old'), newDir = join(work, 'new');
mkdirSync(oldDir); mkdirSync(newDir);
execute('tar', ['-xzf', archive, '-C', oldDir], work);
execute('tar', ['-xzf', currentArchive, '-C', newDir], work);
const oldBin = join(oldDir, 'package/bin/agentdevkit.mjs'), newBin = join(newDir, 'package/bin/agentdevkit.mjs');
const cli = (bin, root, args) => {
  const result = execute(process.execPath, [bin, ...args, '--target', root, '--json'], root, [0, 1]);
  let json; try { json = JSON.parse(result.stdout); } catch { throw new Error(`Saída CLI não é JSON: ${result.stdout}`); }
  return { status: result.status, result: json };
};
const outcomes = [];
const scenarios = [
  { id: 'claude', client: 'claude', humanRule: true, staged: true },
  { id: 'codex-with-claude-rule', client: 'codex', humanRule: true, staged: true },
  { id: 'codex-without-claude-rule', client: 'codex', humanRule: false, staged: true },
  { id: 'codex-untracked', client: 'codex', humanRule: false, staged: false },
  { id: 'codex-staged-crlf', client: 'codex', humanRule: false, staged: true, crlf: true },
  ...['copilot', 'gemini', 'opencode', 'cursor'].map(client => ({ id: client, client, humanRule: false, staged: true })),
];
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
for (const scenario of scenarios) {
  const { client, humanRule } = scenario;
  const root = join(work, `existing-${scenario.id}`);
  const gitFiles = ['.git/index', '.git/config', '.git/HEAD', '.git/info/exclude', '.gitignore'];
  let stage = 'prepare', preInit = null;
  try {
  mkdirSync(root);
  execute('git', ['init', '--quiet', '--template=', root], work);
  const humanAgents = '# Instruções da equipe\n\nPreservar esta orientação.\n';
  const humanClaude = '# Orientações Claude\n\nRegra da equipe.\n';
  const humanGemini = '# Orientações Gemini\n\nRegra da equipe.\n';
  put(root, '.gitignore', '# Ignore do projeto\nminha-pasta/\n');
  put(root, 'AGENTS.md', humanAgents);
  put(root, 'CLAUDE.md', humanClaude);
  put(root, 'GEMINI.md', humanGemini);
  put(root, 'src/app.mjs', 'export const trabalhoHumano = true;\n');
  put(root, '.claude/settings.json', '{"projeto":"configuração humana"}\n');
  put(root, '.claude/skills/equipe/SKILL.md', '---\nname: equipe\ndescription: Skill humana.\n---\n\n# Equipe\n');
  const nativeHuman = {
    '.gemini/commands/equipe.toml': 'description = "Comando humano"\nprompt = "Revisar decisões da equipe"\n',
    '.github/instructions/equipe.instructions.md': '---\napplyTo: "**/*.mjs"\n---\n\n# Regra humana\n',
    '.opencode/agents/equipe.md': '---\ndescription: Agente humano.\n---\n\n# Equipe\n',
    '.cursor/rules/equipe.mdc': '---\ndescription: Regra humana.\n---\n\n# Equipe\n',
  };
  for (const [path, content] of Object.entries(nativeHuman)) put(root, path, content);
  const ruleText = '---\ndescription: Regra humana.\n---\n\n# Regra da equipe\n';
  if (humanRule) put(root, '.claude/rules/equipe.md', ruleText);
  if (scenario.staged) execute('git', ['-C', root, 'add', '--', '.gitignore', 'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'src/app.mjs', '.claude/settings.json', '.claude/skills/equipe/SKILL.md', ...Object.keys(nativeHuman), ...(humanRule ? ['.claude/rules/equipe.md'] : [])], work);
  const gitDetails = () => {
    const refs = tree(root, '.git/refs'), packedRefs = capture(root, ['.git/packed-refs']);
    const stagedDiff = checksum(Buffer.from(execute('git', ['-C', root, 'diff', '--cached', '--no-ext-diff', '--binary', '--'], work).stdout));
    return { refs, packedRefs, stagedDiff, refsAfterQuery: tree(root, '.git/refs'), packedRefsAfterQuery: capture(root, ['.git/packed-refs']) };
  };
  const detailsStable = details => JSON.stringify(details.refs) === JSON.stringify(details.refsAfterQuery) && JSON.stringify(details.packedRefs) === JSON.stringify(details.packedRefsAfterQuery);
  const beforeInitQueries = capture(root, gitFiles);
  const gitBeforeInit = gitDetails();
  preInit = capture(root, gitFiles);
  const humanPaths = ['src/app.mjs', '.claude/settings.json', '.claude/skills/equipe/SKILL.md', ...Object.keys(nativeHuman), ...(humanRule ? ['.claude/rules/equipe.md'] : [])];
  const humanBeforeInit = capture(root, humanPaths);
  stage = 'init';
  const initial = cli(oldBin, root, ['init', '--yes', '--agents', client]);
  if (initial.status !== 0 || !initial.result.ok) throw new Error(`Init 0.0.21 falhou: ${client}: ${JSON.stringify(initial)}`);
  const immediatelyAfterInit = capture(root, gitFiles);
  const gitAfterInit = gitDetails();
  const postInit = capture(root, gitFiles);
  const initHumanPreserved = JSON.stringify(humanBeforeInit) === JSON.stringify(capture(root, humanPaths));
  const initEntryPrefixes = [['AGENTS.md', humanAgents], ['CLAUDE.md', humanClaude], ['GEMINI.md', humanGemini]]
    .every(([path, text]) => read(root, path).subarray(0, Buffer.byteLength(text)).equals(Buffer.from(text)));
  const ruleStagedAfterInit = humanRule ? execute('git', ['-C', root, 'show', ':.claude/rules/equipe.md'], work).stdout === ruleText : null;
  const indexEmptyAfterInit = !scenario.staged ? execute('git', ['-C', root, 'ls-files', '--stage', '-z'], work).stdout.length === 0 : null;
  const afterInitQueries = capture(root, gitFiles);
  if (scenario.crlf) {
    const path = '.agents/skills/git/git-status/SKILL.md';
    const bytes = read(root, path);
    if (!bytes.includes(Buffer.from('\n')) || bytes.includes(Buffer.from('\r'))) throw new Error('Referência antiga não possui os bytes LF esperados.');
    execute('git', ['-C', root, 'config', 'core.autocrlf', 'true'], work);
    put(root, path, bytes.toString('utf8').replaceAll('\n', '\r\n'));
    execute('git', ['-C', root, 'add', '-f', '--', path], work);
  }
  // Both staged and working-tree differences are human-owned.
  put(root, 'src/app.mjs', 'export const trabalhoHumano = "edição após init";\n');
  put(root, '.claude/skills/equipe/SKILL.md', '---\nname: equipe\ndescription: Skill humana.\n---\n\n# Equipe\n\nAlteração própria.\n');
  const extra = '\nOrientação humana adicionada após a instalação antiga.\n';
  for (const name of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) appendFileSync(join(root, name), extra);
  const paths = [...gitFiles, ...humanPaths];
  const before = capture(root, paths);
  const gitBeforeUpdate = gitDetails();
  const afterBaselineQuery = capture(root, paths);
  const rulesBefore = tree(root, '.claude/rules');
  const agentsBefore = read(root, 'AGENTS.md');
  stage = 'update';
  const update = cli(newBin, root, ['update']);
  const after = capture(root, paths);
  const agentsAfter = read(root, 'AGENTS.md');
  const prefix = (path, text) => read(root, path).subarray(0, Buffer.byteLength(text)).equals(Buffer.from(text));
  const rulesAfterUpdate = tree(root, '.claude/rules');
  const gitAfterUpdate = gitDetails();
  const afterUpdateQuery = capture(root, paths);
  const extrasPreserved = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'].every(name => read(root, name).includes(Buffer.from(extra)));
  const checks = {
    initHumanPreserved, initEntryPrefixes,
    ...(humanRule ? { ruleStagedAfterInit } : {}),
    ...(!scenario.staged ? { indexEmptyAfterInit } : {}),
    unchangedPaths: same(before, after),
    gitQueriesPreservedPaths: same(beforeInitQueries, preInit) && same(immediatelyAfterInit, postInit)
      && same(postInit, afterInitQueries) && same(before, afterBaselineQuery) && same(after, afterUpdateQuery)
      && [gitBeforeInit, gitAfterInit, gitBeforeUpdate, gitAfterUpdate].every(detailsStable),
    refsPreservedAfterInitQueries: same(gitAfterInit.refsAfterQuery, gitBeforeUpdate.refs)
      && same(gitAfterInit.packedRefsAfterQuery, gitBeforeUpdate.packedRefs),
    refsAndStagedDiffPreserved: same(gitBeforeUpdate, gitAfterUpdate),
    legacyRulesPreserved: same(rulesBefore, rulesAfterUpdate),
    agentsPrefix: agentsAfter.subarray(0, Buffer.byteLength(humanAgents)).equals(Buffer.from(humanAgents)),
    claudePrefix: prefix('CLAUDE.md', humanClaude), geminiPrefix: prefix('GEMINI.md', humanGemini),
    extrasPreserved, updateOk: update.status === 0 && update.result.ok === true,
  };
  const entriesAfterUpdate = capture(root, ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']);
  stage = 'sync-check';
  const verification = cli(newBin, root, ['sync', '--check']);
  const afterCheck = capture(root, paths), gitAfterCheck = gitDetails();
  const afterFinalQuery = capture(root, paths);
  checks.gitQueriesPreservedPaths &&= same(afterCheck, afterFinalQuery) && detailsStable(gitAfterCheck);
  checks.observedPathsUnchangedAfterCheck = same(after, afterCheck) && same(gitAfterUpdate, gitAfterCheck)
    && same(entriesAfterUpdate, capture(root, ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']))
    && same(rulesAfterUpdate, tree(root, '.claude/rules'));
  checks.syncCheckOk = verification.status === 0 && verification.result.ok === true;
  outcomes.push({ scenario: scenario.id, client, historicalInitChanges: gitFiles.filter(path => preInit[path] !== postInit[path]), historicalInitHashes: { before: preInit, after: postInit }, observedHashes: { beforeUpdate: before, afterUpdate: after, afterCheck }, gitDetails: { beforeInit: gitBeforeInit, afterInit: gitAfterInit, beforeUpdate: gitBeforeUpdate, afterUpdate: gitAfterUpdate, afterCheck: gitAfterCheck }, checks, update: { status: update.status, ok: update.result.ok, errorCode: update.result.error?.code || null, conflicts: update.result.conflicts || [], preserved: update.result.preserved || [] }, syncCheck: { status: verification.status, ok: verification.result.ok, issues: verification.result.issues || [], conflicts: verification.result.conflicts || [], retainedClaudeRules: verification.result.retainedClaudeRules || [], pending: verification.result.localIgnore?.pending || [], planCount: verification.result.plan?.length ?? null }, agentsChanged: !agentsBefore.equals(agentsAfter) });
  } catch (error) {
    let gitAfterFailure, snapshotError;
    try { gitAfterFailure = capture(root, gitFiles); }
    catch (failure) { snapshotError = failure.code || 'E_CAPTURE'; }
    outcomes.push({ scenario: scenario.id, client, checks: { executionCompleted: false }, failureStage: stage, gitBeforeInit: preInit, ...(gitAfterFailure ? { gitAfterFailure } : { snapshotError }), error: error.message });
  }
}
const controllerAfter = checksum(readFileSync(controller));
const result = { oldVersion: '0.0.21', oldIntegrity: expected, localVersion: JSON.parse(readFileSync(join(source, 'package.json'))).version, localArchiveSha256: checksum(readFileSync(currentArchive)), controllerSha256: controllerBefore, controllerUnchanged: controllerBefore === controllerAfter, outcomes, limits: ['Snapshots da atualização iniciam após init 0.0.21; diferenças Git do init são registradas separadamente.', 'Fixtures sintéticas sem commits; não comprovam preservação de histórico existente, todos os clientes, metadados ou execução de skills.', 'Pacote local não publicado; npm em modo offline, sem auditoria da rede dos demais processos.'] };
writeFileSync(join(work, 'RESULT.json'), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${join(work, 'RESULT.json')}\n`);
if (!result.controllerUnchanged || outcomes.some(item => Object.values(item.checks).some(value => !value))) process.exitCode = 1;
