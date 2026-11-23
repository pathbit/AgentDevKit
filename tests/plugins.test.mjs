import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { toolWrapper } from '../.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs';
import { skillsArguments } from '../.pbai4devs/scripts/gerenciar-skills-externas/SCRIPT.mjs';
import { runPlugin } from '../src/plugins.mjs';

const skillCatalogPath = '.pbai4devs/external-skills/CATALOG.json';
const skillsToolPath = '.pbai4devs/tools/skills';
const platform = `${process.platform}-${process.arch}`;
const version = '1.2.3';
const entry = {
  id: 'vendor-demo', repository: 'vendor/skills', commit: 'a'.repeat(40),
  path: 'skills/demo/SKILL.md', name: 'demo', license: 'MIT', use: 'Fixture offline.', status: 'reviewed',
  licenseSource: `https://github.com/vendor/skills/blob/${'a'.repeat(40)}/LICENSE`,
};
const candidate = { ...entry, id: 'vendor-candidate', status: 'candidate' };
const catalog = { schemaVersion: 1, allowlist: [entry.repository], skills: [entry, candidate] };

function fixture(t) {
  const target = realpathSync(mkdtempSync(join(tmpdir(), 'agentdevkit-plugins-')));
  t.after(() => rmSync(target, { recursive: true, force: true }));
  const put = (relative, content) => {
    const file = join(target, relative);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  };
  return { target, put, call: (action, id, installed = true) => runPlugin({ action, id, target, installed }) };
}

function installFixtureTool(put) {
  const packageDir = `${skillsToolPath}/.local/versions/${version}-${platform}/node_modules/skills`;
  put(`${skillsToolPath}/.local/CURRENT.json`, JSON.stringify({ name: 'skills', version, platform }));
  put(`${packageDir}/package.json`, JSON.stringify({ name: 'skills', version, bin: { skills: 'cli.mjs' } }));
  const expected = skillsArguments(entry);
  put(`${packageDir}/cli.mjs`, `
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
if (args[0] === '--version') {
  appendFileSync(new URL('./probed', import.meta.url), 'probe\\n');
  console.log('${version}');
} else {
  assert.deepEqual(args, ${JSON.stringify(expected)});
  const cwd = process.cwd();
  const skill = join(cwd, '.agents', 'skills', '${entry.name}');
  mkdirSync(skill, { recursive: true });
  writeFileSync(join(skill, 'SKILL.md'), '---\\nname: ${entry.name}\\n---\\n\\n# Instrução sintética privada\\n');
  writeFileSync(join(skill, 'LICENSE.txt'), 'MIT fixture\\n');
  const lock = { version: 2, skills: { '${entry.name}': {
    sourceType: 'github', source: '${entry.repository}', ref: '${entry.commit}',
    skillPath: '${entry.path}', computedHash: '${'b'.repeat(64)}',
  } } };
  writeFileSync(join(cwd, 'skills-lock.json'), JSON.stringify(lock));
}
`);
  return `${packageDir}/probed`;
}

function writeCatalogs(put) {
  put(skillCatalogPath, JSON.stringify(catalog));
  const tool = JSON.parse(readFileSync(new URL(`../${skillsToolPath}/TOOL.json`, import.meta.url), 'utf8'));
  tool.env.FIXTURE_MARKER = 'private-environment-value';
  put(`${skillsToolPath}/TOOL.json`, JSON.stringify(tool));
  put(`${skillsToolPath}/SCRIPT.mjs`, toolWrapper('skills'));
}

test('antes do init, list e info usam os catálogos empacotados sem criar arquivos', async t => {
  const { target, call } = fixture(t);
  const result = await call('list', undefined, false);
  const ids = result.plugins.map(plugin => plugin.id);
  assert.equal(result.ok, true);
  assert.deepEqual(ids, ids.toSorted((a, b) => a.localeCompare(b)));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('skills') && ids.includes('cloudflare-web-perf'));
  const { plugin: tool } = await call('info', 'gitleaks', false);
  assert.equal(tool.kind, 'tool');
  assert.equal(tool.license, 'MIT');
  assert.ok(tool.licenseSource.endsWith('/LICENSE'));
  const { plugin: npmTool } = await call('info', 'skills', false);
  assert.equal(npmTool.license, null);
  assert.equal(npmTool.source.channel, 'latest');
  const { plugin: skill } = await call('info', 'cloudflare-web-perf', false);
  assert.equal(skill.kind, 'external-skill');
  assert.equal(skill.reviewStatus, 'reviewed');
  assert.match(skill.source.commit, /^[a-f0-9]{40}$/);
  assert.ok(skill.licenseSource.includes('/blob/' + skill.source.commit + '/'));
  await assert.rejects(call('install', 'skills', false), { code: 'E_MISSING' });
  await assert.rejects(call('check', 'cloudflare-web-perf', false), { code: 'E_MISSING' });
  assert.deepEqual(readdirSync(target), []);
});

test('CLI publica o catálogo sem inicialização e verifica a ferramenta escolhida', t => {
  const { target, put } = fixture(t);
  const bin = fileURLToPath(new URL('../bin/agentdevkit.mjs', import.meta.url));
  const cli = (args, status = 0) => {
    const result = spawnSync(process.execPath, [bin, 'plugins', ...args, '--target', target, '--json'], { encoding: 'utf8', timeout: 60000 });
    assert.equal(result.status, status, result.stderr || result.stdout);
    return JSON.parse(result.stdout);
  };
  assert.ok(cli(['list']).plugins.some(plugin => plugin.id === 'agent-browser'));
  assert.equal(cli(['info', 'cloudflare-web-perf']).plugin.license, 'Apache-2.0');
  assert.equal(cli(['install', 'skills'], 1).error.code, 'E_MISSING');
  assert.deepEqual(readdirSync(target), []);
  put('.pbai4devs/state/agentdevkit.json', JSON.stringify({ schemaVersion: 1, version, language: 'pt', clients: ['none'], files: {}, blocks: {} }));
  writeCatalogs(put);
  const probe = join(target, installFixtureTool(put));
  assert.equal(cli(['info', 'skills']).plugin.installation.version, version);
  assert.equal(existsSync(probe), false);
  assert.equal(cli(['check', 'skills']).status, 'ready');
  assert.equal(readFileSync(probe, 'utf8'), 'probe\n');
  assert.equal(cli(['install', 'vendor-demo']).status, 'installed');
  for (const path of ['.agents', '.gemini', '.claude', '.codex']) assert.equal(existsSync(join(target, path)), false, path);
});

test('catálogo local é a autoridade e list/info não executam nem expõem o probe', async t => {
  const { target, put, call } = fixture(t);
  writeCatalogs(put);
  const probe = join(target, installFixtureTool(put));
  const result = await call('list');
  assert.deepEqual(result.plugins.map(plugin => plugin.id), ['skills', 'vendor-candidate', 'vendor-demo']);
  assert.equal(result.plugins.find(plugin => plugin.id === candidate.id).reviewStatus, 'candidate');
  const info = await call('info', 'skills');
  assert.deepEqual(info.plugin.installation, { version, platform, layout: 'local' });
  assert.doesNotMatch(JSON.stringify({ result, info }), /private-environment-value|probeInput|"env"|"probe"/);
  assert.equal(existsSync(probe), false);
  assert.equal((await call('check', 'skills')).status, 'ready');
  assert.equal(readFileSync(probe, 'utf8'), 'probe\n');
  const reused = await call('install', 'skills');
  assert.equal(reused.status, 'already-installed');
  assert.deepEqual(reused.plugin.installation, { version, platform, layout: 'local' });
  assert.deepEqual(readdirSync(join(target, '.pbai4devs/tools/bin')), ['skills.mjs']);
});

test('skill revisada usa o CLI já instalado e permanece no armazenamento externo', async t => {
  const { target, put, call } = fixture(t);
  writeCatalogs(put);
  const external = '.pbai4devs/external-skills/.local';
  await assert.rejects(call('install', candidate.id), { code: 'E_PLUGIN', message: /Revise origem/ });
  assert.equal(existsSync(join(target, external)), false);
  await assert.rejects(call('install', entry.id), { code: 'E_PLUGIN', message: /Ferramenta ausente: skills/ });
  assert.equal(existsSync(join(target, `${skillsToolPath}/.local`)), false);

  const probe = join(target, installFixtureTool(put));
  const installed = await call('install', entry.id);
  assert.equal(installed.status, 'installed');
  const { file, commit } = installed.plugin.installation;
  assert.equal(commit, entry.commit);
  assert.equal(file, `${external}/${entry.id}/.agents/skills/${entry.name}/SKILL.md`);
  assert.doesNotMatch(JSON.stringify(installed), /Instrução sintética privada/);
  assert.equal(readFileSync(join(target, dirname(file), 'LICENSE.txt'), 'utf8'), 'MIT fixture\n');
  assert.equal((await call('check', entry.id)).status, 'ready');
  assert.equal((await call('install', entry.id)).status, 'already-installed');
  assert.equal(readFileSync(probe, 'utf8'), 'probe\n', 'check e reutilização não invocam o CLI skills');
  assert.deepEqual(readdirSync(join(target, external)), [entry.id]);
  for (const path of ['.agents', '.codex', '.claude', '.pbai4devs/skills', '.pbai4devs/tools/bin']) {
    assert.equal(existsSync(join(target, path)), false, path);
  }
  assert.equal(readFileSync(join(target, skillCatalogPath), 'utf8'), JSON.stringify(catalog));
  put(file, 'Alteração local.');
  await assert.rejects(call('check', entry.id), { code: 'E_PLUGIN' });
  await assert.rejects(call('install', entry.id), { code: 'E_PLUGIN' });
  assert.equal(readFileSync(join(target, file), 'utf8'), 'Alteração local.');
});

test('a fachada recusa IDs não exatos, catálogos corrompidos e colisões', async t => {
  const { put, call } = fixture(t);
  writeCatalogs(put);
  for (const id of ['all', 'base', 'discovery', 'vendor/demo', 'https://example.invalid', '../skills']) {
    await assert.rejects(call('install', id), { code: 'E_PLUGIN' });
  }
  await assert.rejects(call('list', 'skills'), { code: 'E_PLUGIN' });
  await assert.rejects(call('info'), { code: 'E_PLUGIN' });
  await assert.rejects(call('update', 'skills'), { code: 'E_PLUGIN' });
  put(skillCatalogPath, '{');
  await assert.rejects(call('list'), { code: 'E_PLUGIN', message: /JSON invalido/ });
  put(skillCatalogPath, JSON.stringify({ ...catalog, skills: [{ ...entry, id: 'skills' }] }));
  await assert.rejects(call('info', 'skills'), { code: 'E_PLUGIN', message: /Ambiguous plugin ID/ });
});

test('catálogo por link não permite leitura fora da raiz instalada', async t => {
  const { target, call } = fixture(t), outside = fixture(t);
  outside.put('CATALOG.json', JSON.stringify(catalog));
  mkdirSync(join(target, '.pbai4devs'));
  try {
    symlinkSync(outside.target, join(target, '.pbai4devs/external-skills'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (['EACCES', 'EPERM', 'ENOTSUP'].includes(error.code)) { t.skip('Privilégio de links de diretório indisponível.'); return; }
    throw error;
  }
  await assert.rejects(call('list'), { code: 'E_PLUGIN', message: /Link simbolico/ });
  assert.deepEqual(readdirSync(outside.target), ['CATALOG.json']);
});
