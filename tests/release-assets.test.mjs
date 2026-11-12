import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  const pkg = { name: packageName, version: packageVersion, type: 'module', files: ['bin/', 'src/', '.pbai4devs/'], bin: { agentdevkit: 'bin/agentdevkit.mjs' }, ...(registry ? { publishConfig: { registry } } : {}), ...(repository ? { repository } : {}) };
  write('package.json', JSON.stringify(pkg));
  write('package-lock.json', JSON.stringify({ name: packageName, version: lockVersion, lockfileVersion: 3, packages: rootEntry ? { '': { name: packageName, version: rootVersion } } : {} }));
  write('bin/agentdevkit.mjs', '#!/usr/bin/env node\nconsole.log("fixture");\n');
  write('src/cli.mjs', 'export const fixture = true;\n');
  write('.pbai4devs/skills/example/SKILL.md', `---\nname: example\ndescription: Release fixture.\n---\n\n# Example\n\n${sourceMarker}\n`);
  mkdirSync(join(root, 'scripts/release'), { recursive: true });
  cpSync(join(project, 'scripts/release/assets.mjs'), join(root, 'scripts/release/assets.mjs'));
  mkdirSync(join(root, '.pbai4devs/scripts/lib'), { recursive: true });
  cpSync(join(project, '.pbai4devs/scripts/lib/npm.mjs'), join(root, '.pbai4devs/scripts/lib/npm.mjs'));
  return { root, output: join(root, '.agent-tests/release', packageVersion) };
}

function execute(root, { refType = 'branch', refName = 'master' } = {}) {
  return spawnSync(process.execPath, [join(root, 'scripts/release/assets.mjs')], {
    cwd: root, encoding: 'utf8', timeout: 60000,
    env: { ...process.env, npm_execpath: npmExecutable(), GITHUB_REF_TYPE: refType, GITHUB_REF_NAME: refName,
      GITHUB_SHA: 'a'.repeat(40), GITHUB_REPOSITORY: 'pathbit/AgentDevKit',
      GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/master', GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1',
      npm_config_cache: join(root, 'npm-cache'), npm_config_offline: 'true',
      npm_config_audit: 'false', npm_config_fund: 'false' },
  });
}

test('release produz quatro arquivos e checksum dos bytes reais do pacote', async t => {
  for (const refType of ['branch', 'tag']) await t.test(refType, subtest => {
    const { root, output } = fixture(subtest);
    const result = execute(root, { refType, refName: refType === 'tag' ? `v${version}` : 'master' });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stdout + result.stderr);
    const archiveName = `agentdevkit-${version}.tgz`;
    assert.deepEqual(readdirSync(output).sort(), ['NOTES.txt', 'SHA256SUMS', archiveName, 'package-manifest.json'].sort());
    const archive = readFileSync(join(output, archiveName));
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
