import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { buildCatalog } from '../.pbai4devs/scripts/lib/catalog.mjs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { compareInventory, destination, discovery, structural } from './native-client-matrix.mjs';

const skill = { id: 'projeto/criar-skill', name: 'criar-skill', path: '.pbai4devs/skills/projeto/criar-skill/SKILL.md' };
const agent = { id: 'revisor', name: 'revisor', path: '.pbai4devs/agents/revisor/AGENT.md' };
test("destinations are specific by customer and type", () => {
  assert.equal(destination('claude', 'skills', skill), '.claude/skills/criar-skill/SKILL.md');
  assert.equal(destination('opencode', 'skills', skill), '.opencode/skills/projeto/criar-skill/SKILL.md');
  assert.equal(destination('claude', 'agents', agent), '.claude/agents/revisor.md');
  assert.equal(destination('opencode', 'agents', agent), '.opencode/agents/revisor.md');
  assert.equal(destination('codex', 'skills', skill), '.agents/skills/projeto/criar-skill/SKILL.md');
  assert.equal(destination('codex', 'agents', agent), '.codex/agents/revisor/AGENT.md');
  assert.equal(destination('copilot', 'agents', agent), '.github/agents/revisor.agent.md');
  assert.equal(destination('zcode', 'agents', agent), '.zcode/agents/revisor.md');
  assert.throws(() => destination('outro', 'agents', agent));
});
test("structure requires origin and reference to the correct path", t => {
  const root = mkdtempSync(join(tmpdir(), 'native-test-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const target = join(root, destination('claude', 'skills', skill)); mkdirSync(dirname(target), { recursive: true });
  const wrapper = link => `---\nname: criar-skill\n---\n\n# Criar skill\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga ${link}.\n`;
  writeFileSync(target, wrapper('[origem](../../../.pbai4devs/skills/projeto/criar-skill/SKILL.md)'));
  assert.equal(structural(root, 'claude', 'skills', skill).status, 'failed');
  mkdirSync(dirname(join(root, skill.path)), { recursive: true }); writeFileSync(join(root, skill.path), 'skill');
  assert.equal(structural(root, 'claude', 'skills', skill).status, 'passed');
  writeFileSync(target, wrapper('[origem](../../../outro/SKILL.md)')); assert.equal(structural(root, 'claude', 'skills', skill).status, 'failed');
  const link = '[origem](../../../.pbai4devs/skills/projeto/criar-skill/SKILL.md)';
  for (const inert of [`---\nname: fake\n---\n\n\`\`\`\n---\n\n# Fake\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga ${link}.\n`, `<!-- ${link} -->`, `\`\`${link}\`\``, `    ${link}`, `\\${link}`, `\`\`\`md\n${link}\n\`\`\``, `  \`\`\`md\n${link}\n  \`\`\``, `\`\`\`\`md\n${link}\n\`\`\`\``, `\`inicio\n${link}\nfim\``]) {
    writeFileSync(target, inert); assert.equal(structural(root, 'claude', 'skills', skill).status, 'failed', inert);
  }
});
test("Copilot requires skill enabled and unique in project folder", () => {
  const project = '/tmp/projeto-sintetico';
  const row = { name: 'criar-skill', source: 'project', enabled: true,
    path: join(project, '.github/skills/criar-skill') };
  const observe = rows => discovery('copilot', 'skills', skill, JSON.stringify(rows), project);
  assert.equal(observe([row, { name: 'built-in', source: 'builtin' }]), true);
  assert.equal(observe([row, row]), false);
  assert.equal(observe([{ ...row, enabled: false }]), false);
  assert.equal(observe([{ ...row, source: 'personal' }]), false);
  assert.equal(observe([{ ...row, name: 'outra' }]), false);
  assert.equal(observe([{ ...row, path: '/tmp/outro/.github/skills/criar-skill' }]), false);
  assert.equal(discovery('copilot', 'skills', skill, '{', project), false);
  assert.equal(discovery('copilot', 'agents', agent, '[]', project), null);
});

test("inventory accuses faults, extras and duplicates even with same id", () => {
  const expected = { skills: [skill], agents: [agent] };
  const installed = { skills: [skill, { ...skill }], agents: [{ ...agent, path: '.pbai4devs/agents/outro/AGENT.md' }] };
  const result = compareInventory(expected, installed);
  assert.equal(result.skills.duplicates.length, 3);
  assert.equal(result.agents.missing.length, 1); assert.equal(result.agents.extra.length, 1);
  assert.throws(() => compareInventory(expected, { skills: [] }), /inválido/);
});
test("refuses symbolic links in origin and note, including ancestors", t => {
  const root = mkdtempSync(join(tmpdir(), 'native-symlink-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, skill.path), target = join(root, destination('claude', 'skills', skill));
  mkdirSync(dirname(source), { recursive: true }); mkdirSync(dirname(target), { recursive: true });
  writeFileSync(source, 'source'); writeFileSync(target, '---\nname: criar-skill\n---\n\n# Criar skill\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/skills/projeto/criar-skill/SKILL.md).\n');
  rmSync(source);
  try { symlinkSync(target, source); } catch (error) { if (process.platform === 'win32' && ['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) { t.skip('Sem permissão de symlink.'); return; } throw error; }
  assert.equal(structural(root, 'claude', 'skills', skill).status, 'failed');
  rmSync(source); writeFileSync(source, 'source'); rmSync(target); symlinkSync(source, target); assert.equal(structural(root, 'claude', 'skills', skill).status, 'failed');
  rmSync(target); rmSync(dirname(target), { recursive: true }); symlinkSync(dirname(source), dirname(target), 'dir'); assert.equal(structural(root, 'claude', 'skills', skill).status, 'failed');
});
test("OpenCode requires exact profile content installed for the same id", t => {
  const project = mkdtempSync(join(tmpdir(), 'native-profile-')); t.after(() => rmSync(project, { recursive: true, force: true }));
  const file = join(project, destination('opencode', 'agents', agent)); mkdirSync(dirname(file), { recursive: true });
  const body = '# Revisor\n\nLeia [origem](../../.pbai4devs/agents/revisor/AGENT.md).';
  writeFileSync(file, `---\ndescription: exemplo\n---\n\n${body}\n`);
  const output = system => JSON.stringify([{ id:'revisor', name:'revisor', system }]);
  assert.equal(discovery('opencode', 'agents', agent, output(body), project), true);
  assert.equal(discovery('opencode', 'agents', agent, JSON.stringify([{ id:'revisor', name:'revisor', system:body }, { id:'revisor', name:'revisor', system:'outro' }]), project), false);
  assert.equal(discovery('opencode', 'agents', agent, output(`comentário .pbai4devs/agents/revisor/AGENT.md`), project), false);
  assert.equal(discovery('opencode', 'agents', agent, output(body.replace('../../.pbai4devs', '/outro/.pbai4devs')), project), false);
  assert.equal(discovery('opencode', 'agents', agent, JSON.stringify([{ id:'revisor-outro', name:'revisor', system:body }]), project), false);
  const v1 = (name, prompt) => discovery('opencode', 'agents', agent, JSON.stringify({ name, prompt }), project, undefined, { opencodeV1: true });
  assert.equal(v1('revisor', body), true);
  assert.equal(v1('revisor', 'conteúdo diferente'), false);
  assert.equal(v1('revisor-outro', body), false);
});

test("invalid catalog produces error report", { skip: Number(process.versions.node.split('.')[0]) < 24 ? 'A matriz nativa requer Node.js 24 ou superior.' : false }, t => {
  const root = mkdtempSync(join(tmpdir(), 'native-invalid-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const pkg = join(root, 'package'); mkdirSync(join(pkg, 'bin'), { recursive: true });
  writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: '@pathbit/agentdevkit', version: '1.2.3' }));
  writeFileSync(join(pkg, 'bin/agentdevkit.mjs'), '');
  const runner = fileURLToPath(new URL('./native-client-matrix.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [runner, '--package', pkg, '--version', '1.2.3', '--output', root], { encoding:'utf8', timeout:30000 });
  assert.equal(result.status, 1, result.stderr); const summary = JSON.parse(result.stdout), report = JSON.parse(readFileSync(summary.report));
  assert.equal(summary.failed, true); assert.match(report.error, /Política ou inventário das fontes/); assert.deepEqual(report.rows, []);
});
test("Installed and fixture catalog failures produce cases and all lines", { skip: Number(process.versions.node.split('.')[0]) < 24 ? 'A matriz nativa requer Node.js 24 ou superior.' : false, timeout: 120000 }, t => {
  const root = mkdtempSync(join(tmpdir(), 'native-errors-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const pkg = join(root, 'package'); mkdirSync(join(pkg, 'bin'), { recursive: true });
  const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  cpSync(join(sourceRoot, '.pbai4devs'), join(pkg, '.pbai4devs'), { recursive: true, filter: p => !p.split(/[\\/]/).some(x => ['.local', '.cache', 'versions', 'bin', 'node_modules'].includes(x)) });
  const catalog = buildCatalog(pkg).catalog;
  const policyFile = join(pkg, '.pbai4devs/templates/clients/ADAPTERS.json');
  const alteredPolicy = JSON.parse(readFileSync(policyFile, 'utf8'));
  alteredPolicy.adapters.find(item => item.id === 'claude').root = '.claude-outra';
  writeFileSync(policyFile, JSON.stringify(alteredPolicy));
  writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: '@pathbit/agentdevkit', version: '1.2.3', type: 'module' }));
  const fake = `import {mkdirSync,writeFileSync,rmSync} from 'node:fs'; import {join,basename,dirname} from 'node:path';
const p=process.argv[process.argv.indexOf('--target')+1]; mkdirSync(join(p,'.pbai4devs'));
if(basename(dirname(p)).endsWith('-new')) writeFileSync(join(p,'.pbai4devs/catalog.json'), '{'); else { writeFileSync(join(p,'.pbai4devs/catalog.json'), ${JSON.stringify(JSON.stringify(catalog))}); rmSync(join(p,'README.md')); }
console.log(JSON.stringify({ok:true}));`;
  writeFileSync(join(pkg, 'bin/agentdevkit.mjs'), fake);
  const runner = fileURLToPath(new URL('./native-client-matrix.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [runner, '--package', pkg, '--version', '1.2.3', '--output', root], { encoding:'utf8', timeout:110000 });
  assert.equal(result.status, 1, result.stderr); const summary = JSON.parse(result.stdout), report = JSON.parse(readFileSync(summary.report));
  const expectedCases = alteredPolicy.adapters.flatMap(({ id }) => ['new', 'existing'].map(kind => [id, kind]));
  assert.deepEqual(report.cases.map(({ client, projectKind }) => [client, projectKind]), expectedCases);
  assert.equal(report.rows.length, expectedCases.length * (catalog.skills.length + catalog.agents.length));
  for (const item of report.cases) { assert.equal(item.init.status, 'passed'); assert.ok(item.error); assert.ok(['blocked', 'not-run'].includes(item.discovery.status)); }
  assert.equal(report.rows.every(item => item.execution.status === 'not-run'), true);
  assert.ok(report.rows.find(item => item.client === 'claude' && item.type === 'skills').structure.path.startsWith('.claude-outra/'));
});

test("destination uses package policy instead of checkout policy", () => {
  const policy = [{ id: 'claude', root: '.claude-outra', formats: { skills: 'agrupado', agents: 'plano' } }];
  assert.equal(destination('claude', 'skills', skill, policy), '.claude-outra/skills/projeto/criar-skill/SKILL.md');
  assert.equal(destination('claude', 'agents', agent, policy), '.claude-outra/agents/revisor.md');
});

test("detects byte tampering of the installed origin", t => {
  const root = mkdtempSync(join(tmpdir(), 'native-source-')); t.after(() => rmSync(root, { recursive:true, force:true }));
  const project = join(root, 'project'), pkg = join(root, 'package'), source = join(project, skill.path), expected = join(pkg, skill.path);
  const target = join(project, destination('claude', 'skills', skill));
  for (const file of [source, expected, target]) mkdirSync(dirname(file), { recursive:true });
  writeFileSync(expected, 'fonte original'); writeFileSync(source, 'fonte adulterada');
  writeFileSync(target, '---\nname: criar-skill\n---\n\n# Criar skill\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/skills/projeto/criar-skill/SKILL.md).\n');
  const result = structural(project, 'claude', 'skills', skill, undefined, pkg);
  assert.equal(result.status, 'failed'); assert.match(result.reason, /origem instalada diverge/);
  assert.notEqual(result.sourceSha256, result.expectedSourceSha256);
});
