import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { npmExecutable } from '../scripts/release/assets.mjs';

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

test('release produz quatro arquivos e checksum dos bytes reais do pacote', async t => {
  for (const refType of ['branch', 'tag']) await t.test(refType, subtest => {
    const { root, output, temporary } = fixture(subtest);
    const result = execute(root, { refType, refName: refType === 'tag' ? `v${version}` : 'master' });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stdout + result.stderr);
    const archiveName = `agentdevkit-${version}.tgz`;
    assert.deepEqual(readdirSync(output).sort(), ['NOTES.txt', 'SHA256SUMS', archiveName, 'package-manifest.json'].sort());
    const archive = readFileSync(join(output, archiveName));
    const contents = entries(archive);
    assert.deepEqual(contents.get('LICENSE').data, readFileSync(join(root, 'LICENSE')));
    assert.equal(contents.get('README.md').data.toString(), '# Release fixture\n\n[Guide](https://github.com/pathbit/AgentDevKit/blob/master/docs/guide.md#start)\n');
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
    assert.ok(notes.includes('A instalação não exige login.'));
    assert.ok(notes.includes(`\`${archiveName}\` e \`SHA256SUMS\``));
    assert.doesNotMatch(notes, /releases\/download|--package=https|npm login/);
    assert.match(notes, /```text\n/);
    assert.match(notes, /Node\.js 18\+ com npm/);
    assert.match(notes, /core usa Node\.js 24\+/);
  });
});

test('README do npm remove frontmatter e adapta apenas links Markdown fora de código', t => {
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
  const base = 'https://github.com/pathbit/AgentDevKit/blob/master/';
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

test('README, licença e metadados ausentes ou vazios impedem qualquer pacote', async t => {
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
  assert.deepEqual(readdirSync(output), []);
});

test('notas priorizam GitHub Packages com nome, versão, link e login do registry', t => {
  const { root, output } = fixture(t, { packageName: '@pathbit/agentdevkit', registry: 'https://npm.pkg.github.com', repository: { url: 'git+https://github.com/pathbit/AgentDevKit.git' } });
  const result = execute(root);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const notes = readFileSync(join(output, 'NOTES.txt'), 'utf8');
  assert.ok(notes.includes(`npx --yes --ignore-scripts --registry=https://npm.pkg.github.com --package=@pathbit/agentdevkit@${version} agentdevkit init`));
  assert.ok(notes.includes('https://github.com/pathbit/AgentDevKit/pkgs/npm/agentdevkit'));
  assert.ok(notes.includes('npm login --scope=@pathbit --auth-type=legacy --registry=https://npm.pkg.github.com'));
  assert.ok(notes.includes('read:packages'));
  assert.doesNotMatch(notes, /releases\/download|--package=https/);
});

test('tag inválida ou divergente falha antes de criar artefatos', async t => {
  for (const refName of ['v9.9.9', 'v1.2.3-rc.1', 'v1.2.3/../../outside', '']) await t.test(refName || 'vazia', subtest => {
    const { root } = fixture(subtest);
    const result = execute(root, { refType: 'tag', refName });
    assert.ifError(result.error); assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /tag.*versão/i);
    assert.equal(existsSync(join(root, '.agent-tests/release')), false);
  });
});

test('pacote novo exige núcleo e exclui testes, release e exemplos', async t => {
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

test('versão não estável e versões inconsistentes do lock não geram pacote', async t => {
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
