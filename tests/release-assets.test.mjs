import test from 'node:test';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { npmExecutable } from '../scripts/release/assets.mjs';
import { markVerified, runPipeline, portableProfiles, fullOnlyTests } from '../scripts/release/pipeline.mjs';
import { testGitConfig } from '../.pbai4devs/scripts/lib/test-git-environment.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = '1.2.3';
const name = '@pathbit/agentdevkit-fixture';
const sourceMarker = 'AGENTDEVKIT_RELEASE_FIXTURE_SOURCE';

function fixture(t, { packageVersion = version, lockVersion = packageVersion, rootVersion = packageVersion, rootEntry = true, packageName = name, registry, repository } = {}) {
  const artifacts = join(project, '.agent-tests'); mkdirSync(artifacts, { recursive: true });
  const root = mkdtempSync(join(artifacts, 'release-assets com espaço-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path, content) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); };
  const pkg = { name: packageName, version: packageVersion, type: 'module', description: 'Release fixture.',
    license: 'MIT', author: { name: 'PathBit' }, keywords: ['coding-agents'],
    homepage: 'https://github.com/pathbit/AgentDevKit#readme', bugs: { url: 'https://github.com/pathbit/AgentDevKit/issues' },
    engines: { node: '>=18' }, repository: repository || { url: 'git+https://github.com/pathbit/AgentDevKit.git' },
    files: ['bin/', 'src/', '.pbai4devs/'], bin: { agentdevkit: 'bin/agentdevkit.mjs' }, ...(registry ? { publishConfig: { registry } } : {}) };
  write('package.json', JSON.stringify(pkg));
  write('package-lock.json', JSON.stringify({ name: packageName, version: lockVersion, lockfileVersion: 3, packages: rootEntry ? { '': { name: packageName, version: rootVersion } } : {} }));
  write('bin/agentdevkit.mjs', '#!/usr/bin/env node\nconsole.log("fixture");\n');
  write('src/cli.mjs', 'export const fixture = true;\n');
  write('LICENSE', readFileSync(join(project, 'LICENSE')));
  write('README.md', '---\ndescription: Release fixture.\n---\n\n# Release fixture\n\n[Guide](docs/guide.md#start)\n');
  write('.pbai4devs/skills/example/SKILL.md', `---\nname: example\ndescription: Release fixture.\n---\n\n# Example\n\n${sourceMarker}\n`);
  mkdirSync(join(root, 'scripts/release'), { recursive: true });
  cpSync(join(project, 'scripts/release/assets.mjs'), join(root, 'scripts/release/assets.mjs'));
  mkdirSync(join(root, '.pbai4devs/scripts/lib'), { recursive: true });
  cpSync(join(project, '.pbai4devs/scripts/lib/npm.mjs'), join(root, '.pbai4devs/scripts/lib/npm.mjs'));
  const temporary = join(root, 'temporary'); mkdirSync(temporary);
  return { root, temporary, output: join(root, '.agent-tests/release', packageVersion) };
}

function execute(root, { refType = 'branch', refName = 'master', env = {} } = {}) {
  return spawnSync(process.execPath, [join(root, 'scripts/release/assets.mjs')], {
    cwd: root, encoding: 'utf8', timeout: 60000,
    env: { ...process.env, npm_execpath: npmExecutable(), GITHUB_REF_TYPE: refType, GITHUB_REF_NAME: refName,
      GITHUB_SHA: 'a'.repeat(40), GITHUB_REPOSITORY: 'pathbit/AgentDevKit',
      GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/master', GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1',
      npm_config_cache: join(root, 'npm-cache'), npm_config_offline: 'true',
      npm_config_audit: 'false', npm_config_fund: 'false', NODE_DISABLE_COMPILE_CACHE: '1',
      TMPDIR: join(root, 'temporary'), TMP: join(root, 'temporary'), TEMP: join(root, 'temporary'), ...env },
  });
}

function entries(archive) {
  const tar = gunzipSync(archive), files = new Map();
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const field = (start, end) => header.subarray(start, end).toString().replace(/\0.*$/, '');
    const size = parseInt(field(124, 136).trim(), 8) || 0;
    const name = [field(345, 500), field(0, 100)].filter(Boolean).join('/');
    files.set(name.replace(/^package\//, ''), { data: tar.subarray(offset + 512, offset + 512 + size), mode: parseInt(field(100, 108).trim(), 8) });
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

test("release produces four files and checksum of the actual bytes of the package", async t => {
  for (const refType of ['branch', 'tag']) await t.test(refType, subtest => {
    const { root, output, temporary } = fixture(subtest);
    const result = execute(root, { refType, refName: refType === 'tag' ? `v${version}` : 'master' });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stdout + result.stderr);
    const archiveName = `agentdevkit-${version}.tgz`;
    assert.deepEqual(readdirSync(output).sort(), ['NOTES.txt', 'SHA256SUMS', archiveName, 'package-manifest.json'].sort());
    const archive = readFileSync(join(output, archiveName));
    const contents = entries(archive);
    assert.deepEqual(contents.get('LICENSE').data, readFileSync(join(root, 'LICENSE')));
    assert.equal(contents.get('README.md').data.toString(), '# Release fixture\n\n[Guide](https://github.com/pathbit/AgentDevKit/blob/main/docs/guide.md#start)\n');
    assert.equal(readFileSync(join(root, 'README.md'), 'utf8').startsWith('---\n'), true);
    assert.deepEqual(readdirSync(temporary), []);
    const digest = createHash('sha256').update(archive).digest('hex');
    assert.ok(gunzipSync(archive).includes(Buffer.from(sourceMarker)));
    assert.equal(readFileSync(join(output, 'SHA256SUMS'), 'utf8'), `${digest}  ${archiveName}\n`);
    const manifest = JSON.parse(readFileSync(join(output, 'package-manifest.json'), 'utf8'));
    assert.equal(manifest.version, version); assert.equal(manifest.file, archiveName); assert.equal(manifest.sha256, digest);
    assert.ok(manifest.files.some(file => file.path === 'bin/agentdevkit.mjs'));
    assert.ok(manifest.files.some(file => file.path === 'src/cli.mjs'));
    assert.ok(manifest.files.some(file => file.path === '.pbai4devs/skills/example/SKILL.md'));
    assert.equal(manifest.sourceCommit, 'a'.repeat(40));
    assert.equal(manifest.provenance.runId, '123');
    const summary = JSON.parse(result.stdout.split('\n')[0]);
    assert.equal(summary.sha256, digest); assert.equal(summary.file, join(output, archiveName));
    const notes = readFileSync(join(output, 'NOTES.txt'), 'utf8');
    assert.ok(notes.includes(`npx --yes --ignore-scripts --package=${name}@${version} agentdevkit init`));
    assert.ok(notes.includes(`https://www.npmjs.com/package/${name}`));
    const npmNotes = notes.split('### npm público\n')[1].split('### GitHub Packages\n')[0];
    const githubNotes = notes.split('### GitHub Packages\n')[1].split('\nUse Node.js')[0];
    assert.ok(npmNotes.includes('A instalação não exige login.'));
    assert.doesNotMatch(npmNotes, /npm login|--registry=https:\/\/npm\.pkg\.github\.com/);
    assert.ok(githubNotes.includes(`npx --yes --ignore-scripts --registry=https://npm.pkg.github.com --package=${name}@${version} agentdevkit init`));
    assert.ok(githubNotes.includes('npm login --registry=https://npm.pkg.github.com --auth-type=legacy --scope='));
    assert.match(githubNotes, /read:packages/);
    assert.doesNotMatch(githubNotes, /--scope=@|npm login.*registry\.npmjs\.org/);
    assert.ok(notes.includes(`\`${archiveName}\` e \`SHA256SUMS\``));
    assert.doesNotMatch(notes, /releases\/download|--package=https/);
    assert.match(notes, /```text\n/);
    assert.match(notes, /Use Node\.js 24\+ com npm/);
    assert.match(notes, /Com Node 18–23 existente/);
    assert.ok(notes.includes('https://github.com/pathbit/AgentDevKit/blob/main/docs/guides/installation.md'));
    assert.ok(notes.includes('https://github.com/pathbit/AgentDevKit/blob/main/docs/guides/prerequisites.md'));
  });
});

test("README npm removes frontmatter and adapts only Markdown links out of code", t => {
  const { root, output, temporary } = fixture(t);
  const readme = [
    '---', 'description: Fonte preservada.', 'language: pt', '---', '', '# Release fixture', '',
    '[Guide](docs/guide.md#start "Guide")',
    '![Brand](assets/logo.svg)', '[Space](<docs/a b.md#item>)',
    '[Nested](docs/topic(v1).md)', '[Root](/docs/root.md)',
    '[Start](#start)', '[Npm](https://www.npmjs.com/package/example)',
    '[Mail](mailto:team@example.test)', '[CDN](//example.test/a.svg)',
    '[Read][guide]', '[guide]: docs/guide.md?view=npm#start "Guide"',
    '[space]: <docs/a b.md#item>',
    '`[literal](docs/local.md)`', '```markdown', '[literal](docs/local.md)', '```', '',
  ].join('\n');
  writeFileSync(join(root, 'README.md'), readme);
  chmodSync(join(root, 'bin/agentdevkit.mjs'), 0o755);
  const tracked = ['README.md', 'LICENSE', 'package.json', 'bin/agentdevkit.mjs', 'src/cli.mjs'];
  const before = new Map(tracked.map(path => [path, readFileSync(join(root, path))]));
  const modes = new Map(tracked.map(path => [path, statSync(join(root, path)).mode & 0o777]));
  const hook = join(root, 'npm-audit.mjs'), log = join(root, 'npm-calls.jsonl');
  writeFileSync(hook, "import{appendFileSync}from'node:fs';if(process.argv[1]?.endsWith('npm-cli.js'))appendFileSync(process.env.ADK_TEST_NPM_LOG,JSON.stringify({args:process.argv.slice(2),cwd:process.cwd()})+'\\n');\n");
  const result = execute(root, { env: { NODE_OPTIONS: `--import=${JSON.stringify(pathToFileURL(hook).href)}`, ADK_TEST_NPM_LOG: log } });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const files = entries(readFileSync(join(output, `agentdevkit-${version}.tgz`)));
  const published = files.get('README.md').data.toString();
  assert.ok(published.startsWith('# Release fixture\n'));
  assert.ok(!published.includes('description: Fonte preservada.'));
  const base = 'https://github.com/pathbit/AgentDevKit/blob/main/';
  for (const link of ['docs/guide.md#start', 'assets/logo.svg', 'docs/a%20b.md#item', 'docs/topic(v1).md', 'docs/root.md', 'docs/guide.md?view=npm#start']) assert.ok(published.includes(base + link), link);
  for (const link of ['[Start](#start)', '[Npm](https://www.npmjs.com/package/example)', '[Mail](mailto:team@example.test)', '[CDN](//example.test/a.svg)', '`[literal](docs/local.md)`', '```markdown\n[literal](docs/local.md)\n```']) assert.ok(published.includes(link), link);
  for (const path of tracked) {
    assert.deepEqual(readFileSync(join(root, path)), before.get(path), path);
    assert.equal(statSync(join(root, path)).mode & 0o777, modes.get(path), path);
    if (path !== 'README.md') assert.deepEqual(files.get(path).data, before.get(path), path);
  }
  if (process.platform !== 'win32') assert.equal(files.get('bin/agentdevkit.mjs').mode & 0o777, 0o755);
  const calls = readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.equal(calls.filter(call => call.args[0] === 'pack' && call.args.includes('--dry-run')).length, 1);
  assert.equal(calls.filter(call => call.args[0] === 'pack' && !call.args.includes('--dry-run')).length, 1);
  assert.notEqual(calls[0].cwd, calls[1].cwd);
  assert.deepEqual(readdirSync(temporary), []);
});

test("README, license and missing or empty metadata prevent any package", async t => {
  const changes = [
    { label: 'README ausente', file: 'README.md', remove: true, message: /README/ },
    { label: 'LICENSE ausente', file: 'LICENSE', remove: true, message: /LICENSE/ },
    { label: 'README vazio', file: 'README.md', content: '', message: /README/ },
    { label: 'LICENSE vazia', file: 'LICENSE', content: ' \n', message: /LICENSE/ },
    ...['description', 'license', 'author', 'keywords', 'repository', 'homepage', 'bugs', 'engines', 'bin'].map(key => ({ label: key, key, message: /Metadado|repository/ })),
  ];
  for (const scenario of changes) await t.test(scenario.label, subtest => {
    const { root, output, temporary } = fixture(subtest);
    if (scenario.file) {
      if (scenario.remove) rmSync(join(root, scenario.file));
      else writeFileSync(join(root, scenario.file), scenario.content);
    } else {
      const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
      delete pkg[scenario.key]; writeFileSync(join(root, 'package.json'), JSON.stringify(pkg));
    }
    const result = execute(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, scenario.message);
    assert.equal(existsSync(output), false);
    assert.deepEqual(readdirSync(temporary), []);
  });
});

test('falha do npm final limpa o staging e preserva as fontes', t => {
  const { root, output, temporary } = fixture(t);
  const before = readFileSync(join(root, 'README.md'));
  const hook = join(root, 'npm-failure.mjs');
  writeFileSync(hook, "if(process.argv[1]?.endsWith('npm-cli.js')&&process.argv[2]==='pack'&&!process.argv.includes('--dry-run')){process.stderr.write('pack-final-fixture');process.exit(77)}\n");
  const result = execute(root, { env: { NODE_OPTIONS: `--import=${JSON.stringify(pathToFileURL(hook).href)}` } });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /pack-final-fixture/);
  assert.deepEqual(readFileSync(join(root, 'README.md')), before);
  assert.deepEqual(readdirSync(temporary), []);
  assert.equal(existsSync(output), false);
});

test('notas incluem os dois destinos e respeitam a prioridade GitHub configurada', t => {
  const { root, output } = fixture(t, { packageName: '@pathbit/agentdevkit', registry: 'https://npm.pkg.github.com', repository: { url: 'git+https://github.com/pathbit/AgentDevKit.git' } });
  const result = execute(root);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const notes = readFileSync(join(output, 'NOTES.txt'), 'utf8');
  assert.ok(notes.includes(`npx --yes --ignore-scripts --registry=https://npm.pkg.github.com --package=@pathbit/agentdevkit@${version} agentdevkit init`));
  assert.ok(notes.includes('https://github.com/pathbit/AgentDevKit/pkgs/npm/agentdevkit'));
  assert.ok(notes.includes('npm login --registry=https://npm.pkg.github.com --auth-type=legacy --scope='));
  assert.ok(notes.includes(`npx --yes --ignore-scripts --package=@pathbit/agentdevkit@${version} agentdevkit init`));
  assert.ok(notes.includes('https://www.npmjs.com/package/@pathbit/agentdevkit'));
  assert.ok(notes.indexOf('### GitHub Packages') < notes.indexOf('### npm público'));
  assert.ok(notes.includes('read:packages'));
  assert.doesNotMatch(notes, /releases\/download|--package=https|--scope=@/);
});

test("invalid or divergent tag fails before creating artifacts", async t => {
  for (const refName of ['v9.9.9', 'v1.2.3-rc.1', 'v1.2.3/../../outside', '']) await t.test(refName || 'vazia', subtest => {
    const { root } = fixture(subtest);
    const result = execute(root, { refType: 'tag', refName });
    assert.ifError(result.error); assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /tag.*versão/i);
    assert.equal(existsSync(join(root, '.agent-tests/release')), false);
  });
});

test("new package requires core and deletes tests, release and examples", async t => {
  for (const path of ['tests/fixture.mjs', 'scripts/release/fixture.mjs', 'examples/.claude/skills/example/SKILL.md']) await t.test(path, subtest => {
    const { root } = fixture(subtest);
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    pkg.files.push(path.split('/')[0]);
    writeFileSync(join(root, 'package.json'), JSON.stringify(pkg));
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), 'development fixture');
    const result = execute(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /exclusivos de desenvolvimento/);
  });
  const { root } = fixture(t);
  rmSync(join(root, 'src/cli.mjs'));
  const result = execute(root);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /núcleo/);
});

test("unstable version and inconsistent versions of lock do not generate package", async t => {
  const cases = [
    { label: 'prerelease', options: { packageVersion: '1.2.3-rc.1' }, message: /estável/i },
    { label: 'lock.version', options: { lockVersion: '9.9.9' }, message: /lockfile/i },
    { label: 'lock.packages root', options: { rootVersion: '9.9.9' }, message: /lockfile/i },
    { label: 'lock sem entrada raiz', options: { rootEntry: false }, message: /lockfile/i },
  ];
  for (const scenario of cases) await t.test(scenario.label, subtest => {
    const { root } = fixture(subtest, scenario.options);
    const result = execute(root);
    assert.ifError(result.error); assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, scenario.message);
    assert.equal(existsSync(join(root, '.agent-tests/release')), false);
  });
});

// These fixtures exercise assembly and staging; a simulated full profile does not prove the test suites ran.
test("build, mark and repeat preserve exit and create new evidence isolated", t => {
  const {root,output,temporary}=fixture(t),runner=mkdtempSync(join(project,'.agent-tests','runner-repeat-'));
  t.after(()=>rmSync(runner,{recursive:true,force:true}));
  const first=execute(root);assert.equal(first.status,0,first.stdout+first.stderr);
  const snapshot=()=>Object.fromEntries(readdirSync(output).sort().map(n=>[n,readFileSync(join(output,n))]));
  const sourceBefore=snapshot();
  writeFileSync(join(runner,'agentdevkit-package'),'conteúdo humano');
  const firstMark=markVerified(output,{RUNNER_TEMP:runner});
  assert.deepEqual(snapshot(),sourceBefore);assert.equal(readFileSync(join(runner,'agentdevkit-package'),'utf8'),'conteúdo humano');
  const again=execute(root);assert.equal(again.status,0,again.stdout+again.stderr);assert.deepEqual(snapshot(),sourceBefore);
  const secondMark=markVerified(output,{RUNNER_TEMP:runner});
  assert.notEqual(firstMark,secondMark);assert.deepEqual(snapshot(),sourceBefore);
  for(const dir of [firstMark,secondMark]){
    const manifest=JSON.parse(readFileSync(join(dir,'package-manifest.json')));
    assert.equal(manifest.verification.status,'passed');assert.equal(manifest.verification.profile,'full');
    assert.deepEqual(readFileSync(join(dir,manifest.file)),sourceBefore[manifest.file]);
  }
  assert.deepEqual(readdirSync(temporary),[]);
});

test("old marked output is only reused if it is identical out of verification", t => {
  const {root,output}=fixture(t),first=execute(root);assert.equal(first.status,0,first.stdout+first.stderr);
  const file=join(output,'package-manifest.json'),manifest=JSON.parse(readFileSync(file));
  manifest.verification={status:'passed',profile:'full',sourceCommit:manifest.sourceCommit,checkedAt:'2026-11-16T00:00:00.000Z'};
  writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');
  if(process.platform!=='win32')chmodSync(output,0o755);
  const before=readFileSync(file),result=execute(root);
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.deepEqual(readFileSync(file),before);
  const runner=mkdtempSync(join(project,'.agent-tests','runner-legacy-'));
  t.after(()=>rmSync(runner,{recursive:true,force:true}));
  const staged=markVerified(output,{RUNNER_TEMP:runner});
  assert.notEqual(JSON.parse(readFileSync(join(staged,'package-manifest.json'))).verification.checkedAt,manifest.verification.checkedAt);
  assert.deepEqual(readFileSync(file),before);
});

test("previous divergent output is preserved instead of rewritten", async t => {
  for(const kind of ['archive','checksum','notes','extra','bad-verification','extra-verification','duplicate-key']) await t.test(kind,sub=>{
    const {root,output,temporary}=fixture(sub), first=execute(root);assert.equal(first.status,0,first.stdout+first.stderr);
    const manifestPath=join(output,'package-manifest.json');
    if(kind==='archive')writeFileSync(join(output,'agentdevkit-'+version+'.tgz'),'tar humano');
    if(kind==='checksum')writeFileSync(join(output,'SHA256SUMS'),'checksum humano');
    if(kind==='notes')writeFileSync(join(output,'NOTES.txt'),'notas humanas');
    if(kind==='extra')writeFileSync(join(output,'HUMANO.txt'),'arquivo humano');
    if(['bad-verification','extra-verification','duplicate-key'].includes(kind)){
      const value=JSON.parse(readFileSync(manifestPath));
      value.verification={status:kind==='bad-verification'?'pending':'passed',profile:'full',sourceCommit:value.sourceCommit,checkedAt:'2026-11-16T00:00:00.000Z'};
      if(kind==='extra-verification')value.verification.human='não perder';
      let text=JSON.stringify(value,null,2)+'\n';
      if(kind==='duplicate-key')text=text.replace('  "verification": {','  "verification": {},\n  "verification": {');
      writeFileSync(manifestPath,text);
    }
    const names=readdirSync(output).sort(),before=Object.fromEntries(names.map(n=>[n,readFileSync(join(output,n))]));
    const result=execute(root);assert.equal(result.status,1,result.stdout+result.stderr);assert.match(result.stderr,/Saída anterior divergente/);
    assert.deepEqual(readdirSync(output).sort(),names);
    for(const name of names)assert.deepEqual(readFileSync(join(output,name)),before[name],name);
    assert.deepEqual(readdirSync(temporary),[]);
  });
});

test("Full simulated profile repeats build and exposes new path without changing index or output", t => {
  const {root,output}=fixture(t),runner=mkdtempSync(join(project,'.agent-tests','runner-full-'));
  t.after(()=>rmSync(runner,{recursive:true,force:true}));
  const tests=join(root,'tests');mkdirSync(tests);
  for(const name of [...new Set([...Object.values(portableProfiles).flat(),...Object.keys(fullOnlyTests)])])writeFileSync(join(tests,name),'');
  const policy='.pbai4devs/templates/clients/ADAPTERS.json';
  mkdirSync(dirname(join(root,policy)),{recursive:true});cpSync(join(project,policy),join(root,policy));
  const env={...Object.fromEntries(Object.entries(process.env).filter(([name])=>!/^GIT_|^NODE_OPTIONS$/i.test(name))),GIT_CONFIG_GLOBAL:testGitConfig,GIT_CONFIG_NOSYSTEM:'1',GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0',
    RUNNER_TEMP:runner,GITHUB_OUTPUT:join(runner,'outputs'),npm_execpath:npmExecutable(),npm_config_offline:'true',npm_config_cache:join(root,'npm-cache')};
  writeFileSync(env.GITHUB_OUTPUT,'');
  for(const args of [['init','--quiet'],['add','--','README.md']]){
    const r=spawnSync('git',args,{cwd:root,env,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  }
  const indexPath=join(root,'.git/index'),indexBefore=readFileSync(indexPath),calls=[];
  const stub=(_root,args)=>calls.push(args);
  runPipeline('full',{root,env,run:stub,artifactOutput:env.GITHUB_OUTPUT});
  const saved=Object.fromEntries(readdirSync(output).map(n=>[n,readFileSync(join(output,n))]));
  runPipeline('full',{root,env,run:stub,artifactOutput:env.GITHUB_OUTPUT});
  const destinations=readFileSync(env.GITHUB_OUTPUT,'utf8').trim().split('\n').map(line=>line.replace(/^artifact_path=/,''));
  assert.equal(destinations.length,2);assert.notEqual(destinations[0],destinations[1]);
  for(const dir of destinations)assert.equal(JSON.parse(readFileSync(join(dir,'package-manifest.json'))).verification.profile,'full');
  assert.ok(calls.some(args=>args.includes('tests/distribution.test.mjs')));
  const outputBefore=readFileSync(env.GITHUB_OUTPUT);
  runPipeline('full',{root,env,run:stub});
  assert.deepEqual(readFileSync(env.GITHUB_OUTPUT),outputBefore,'GITHUB_OUTPUT ignorado sem opção explícita');
  const human=join(root,'README.md'),humanBefore=readFileSync(human), rootBefore=readdirSync(root).sort();
  assert.throws(()=>runPipeline('full',{root,env:{...env,RUNNER_TEMP:root},run:stub,artifactOutput:human}),/Saída do workflow inválida/);
  assert.deepEqual(readFileSync(human),humanBefore);assert.deepEqual(readdirSync(root).sort(),rootBefore);
  const append=fs.appendFileSync;let appendError;
  fs.appendFileSync=(path,...args)=>{if(String(path)===env.GITHUB_OUTPUT)throw Object.assign(new Error('falha sintética'),{code:'EACCES'});return append(path,...args)};
  syncBuiltinESMExports();
  try {runPipeline('full',{root,env,run:stub,artifactOutput:env.GITHUB_OUTPUT})}catch(error){appendError=error}
  finally {fs.appendFileSync=append;syncBuiltinESMExports();}
  assert.equal(appendError?.cause?.code,'EACCES');assert.equal(appendError?.preservedPaths?.length,1);
  assert.ok(appendError.message.includes(appendError.preservedPaths[0]));
  assert.ok(existsSync(join(appendError.preservedPaths[0],'package-manifest.json')));
  for(const [name,bytes] of Object.entries(saved))assert.deepEqual(readFileSync(join(output,name)),bytes,name);
  assert.deepEqual(readFileSync(indexPath),indexBefore);
});

test("links in release folders are refused without writing in destination", async t => {
  for(const item of ['.agent-tests','.agent-tests/release']) await t.test(item,sub=>{
    const {root,temporary}=fixture(sub), external=mkdtempSync(join(project,'.agent-tests','release-external-'));
    sub.after(()=>rmSync(external,{recursive:true,force:true}));
    writeFileSync(join(external,'humano.txt'),'conteúdo humano');
    if(item.includes('/'))mkdirSync(join(root,'.agent-tests'));
    try{symlinkSync(external,join(root,item),'dir')}catch(error){
      if(['EPERM','EACCES','ENOSYS'].includes(error.code))return sub.skip('links indisponíveis');
      throw error;
    }
    const result=execute(root);
    assert.equal(result.status,1,result.stdout+result.stderr);assert.match(result.stderr,/Diretório de release inválido/);
    assert.deepEqual(readdirSync(external),['humano.txt']);
    assert.equal(readFileSync(join(external,'humano.txt'),'utf8'),'conteúdo humano');
    assert.deepEqual(readdirSync(temporary),[]);
  });
});

test("npm error and cleaning failure preserve both causes and report temporary areas", t => {
  const {root,output,temporary}=fixture(t),hook=join(root,'cleanup-failure.mjs');
  writeFileSync(hook,[
    "import fs from 'node:fs'; import {syncBuiltinESMExports} from 'node:module';",
    "if(process.argv[1]?.endsWith('assets.mjs')){const original=fs.rmSync;fs.rmSync=(p,...a)=>String(p).includes('agentdevkit-package-')?(()=>{throw Object.assign(new Error('cleanup-fixture'),{code:'EACCES'})})():original(p,...a);syncBuiltinESMExports()}",
    "if(process.argv[1]?.endsWith('npm-cli.js')&&process.argv[2]==='pack'&&!process.argv.includes('--dry-run')){process.stderr.write('pack-final-fixture');process.exit(77)}"
  ].join('\n'));
  const before=readFileSync(join(root,'README.md'));
  const result=execute(root,{env:{NODE_OPTIONS:'--import='+JSON.stringify(pathToFileURL(hook).href)}});
  assert.equal(result.status,1,result.stdout+result.stderr);
  assert.match(result.stderr,/pack-final-fixture/);assert.match(result.stderr,/Falha ao limpar área temporária/);assert.match(result.stderr,/EACCES/);
  const roots=readdirSync(temporary).filter(n=>n.startsWith('agentdevkit-package-'));
  assert.equal(roots.length,1);assert.ok(result.stderr.includes(join(temporary,roots[0])));
  const release=join(root,'.agent-tests/release'),stages=readdirSync(release).filter(n=>n.startsWith('.release-staging-'));
  assert.equal(stages.length,1);assert.ok(result.stderr.includes(join(release,stages[0])));
  assert.equal(existsSync(output),false);assert.deepEqual(readFileSync(join(root,'README.md')),before);
});

test("failure to copy verification and cleaning failure maintain cause and copy path", t => {
  const {root,output}=fixture(t),first=execute(root);assert.equal(first.status,0,first.stdout+first.stderr);
  const runner=mkdtempSync(join(project,'.agent-tests','runner-cleanup-'));
  t.after(()=>rmSync(runner,{recursive:true,force:true}));
  const before=readFileSync(join(output,'package-manifest.json')),originalWrite=fs.writeFileSync,originalRemove=fs.rmSync;
  fs.writeFileSync=(path,...args)=>{if(String(path).includes('agentdevkit-package-'))throw Object.assign(new Error('cópia sintética'),{code:'EACCES'});return originalWrite(path,...args)};
  fs.rmSync=(path,...args)=>{if(String(path).includes('agentdevkit-package-'))throw Object.assign(new Error('limpeza sintética'),{code:'EBUSY'});return originalRemove(path,...args)};
  syncBuiltinESMExports();let failure;
  try{markVerified(output,{RUNNER_TEMP:runner})}catch(error){failure=error}
  finally{fs.writeFileSync=originalWrite;fs.rmSync=originalRemove;syncBuiltinESMExports()}
  assert.equal(failure?.cause?.code,'EACCES');assert.equal(failure?.errors?.[1]?.code,'EBUSY');
  assert.equal(failure?.preservedPaths?.length,1);assert.ok(failure.message.includes(failure.preservedPaths[0]));
  assert.equal(existsSync(failure.preservedPaths[0]),true);
  assert.deepEqual(readFileSync(join(output,'package-manifest.json')),before);
});
