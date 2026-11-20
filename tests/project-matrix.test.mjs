import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { syncBuiltinESMExports } from 'node:module';
import { gunzipSync } from 'node:zlib';
import { isGeneratedOutput } from '../.pbai4devs/scripts/lib/gitignore.mjs';
import { assessCoverage, command, compareCursorSidecar, cursorMetadataFromPolicy, cursorSidecarSnapshot, expectedLegacyExclude, inspectGeneratedRuleScope, matrixCases, options, outputParent, overallStatus, projectCase, provenanceComparison, provenanceSnapshot, verifiedLegacyPairs } from './project-matrix.mjs';

const runner = join(dirname(fileURLToPath(import.meta.url)), 'project-matrix.mjs');
// As cópias isoladas devem acompanhar também os imports transitivos do runner.
const runnerLibraries = ['managed-content.mjs', 'managed-toml.mjs', 'managed-toml-parser.mjs', 'extended.mjs', 'legacy021.mjs', 'smol-toml.cjs'];
const runtimeSkip = Number(process.versions.node.split('.')[0]) < 24 && 'A matriz do kit requer Node.js 24 ou superior.';
const temp = t => { const root = mkdtempSync(join(tmpdir(), 'adk-matrix-test-')); t.after(() => rmSync(root, { recursive: true, force: true })); return root; };
const put = (file, value) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value); };
function copiedPackage(root, source = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  const dest = join(root, 'package');
  mkdirSync(dest);
  for (const path of ['package.json', 'LICENSE', 'src', 'bin', '.pbai4devs']) {
    cpSync(join(source, path), join(dest, path), { recursive: true, filter: file => {
      const parts = relative(source, file).split(sep), lower = parts.map(part => part.toLowerCase()), info = lstatSync(file);
      if (info.isSymbolicLink() || isGeneratedOutput(parts.join('/'), info.isDirectory())
        || lower.some(part => ['.local', '.cache', 'node_modules'].includes(part))) return false;
      if (parts[0] !== '.pbai4devs' || parts.length === 1) return true;
      if (lower[1] === 'state') return parts[1] === 'state' && (parts.length === 2 && info.isDirectory()
        || parts.length === 3 && parts[2] === 'README.md' && info.isFile());
      if (lower[1] === 'tools' && parts.length > 2) return parts.length === 3 && (info.isDirectory() || info.isFile() && parts[2] === 'README.md')
        || parts.length === 4 && info.isFile() && ['TOOL.json', 'SCRIPT.mjs', 'README.md'].includes(parts[3]);
      if (lower[1] === 'external-skills' && parts.length > 2) return parts.length === 3 && info.isFile()
        && ['README.md', 'CATALOG.json'].includes(parts[2]);
      return true;
    } });
  }
  return dest;
}
test('cópia temporária inclui README de estado e exclui dados locais', t => {
  const root = temp(t), pkg = copiedPackage(root);
  const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  assert.deepEqual(readFileSync(join(pkg, '.pbai4devs/state/README.md')), readFileSync(join(source, '.pbai4devs/state/README.md')));
  assert.equal(existsSync(join(pkg, '.pbai4devs/state/derived.json')), false);
  assert.equal(existsSync(join(pkg, '.pbai4devs/state/configuracao')), false);
  assert.equal(existsSync(join(pkg, '.pbai4devs/tools/agent-browser/.local')), false);
});

test('cópia temporária omite variantes de caixa e dados locais sintéticos', t => {
  const root = temp(t), source = join(root, 'source');
  for (const dir of ['src', 'bin', '.pbai4devs']) mkdirSync(join(source, dir), { recursive: true });
  for (const path of ['package.json', 'LICENSE', '.pbai4devs/state/README.md', '.pbai4devs/rules/git/RULE.md', '.pbai4devs/tools/sample/TOOL.json']) put(join(source, path), 'conteúdo permitido\n');
  const privatePaths = ['.pbai4devs/state/derived.json', '.pbai4devs/state/configuracao/ESTADO.md', '.pbai4devs/tools/sample/.LOCAL/segredo', '.pbai4devs/skills/Node_Modules/segredo', '.pbai4devs/rules/.CaChE/segredo', '.pbai4devs/rules/AUTH.JSON', '.pbai4devs/rules/.ENV', '.pbai4devs/rules/.PLAYWRIGHT-MCP/segredo', '.pbai4devs/tools/sample/outro.json'];
  for (const path of privatePaths) put(join(source, path), 'dado sintético privado\n');
  const pkg = copiedPackage(root, source);
  assert.equal(readFileSync(join(pkg, '.pbai4devs/state/README.md'), 'utf8'), 'conteúdo permitido\n');
  assert.equal(readFileSync(join(pkg, '.pbai4devs/rules/git/RULE.md'), 'utf8'), 'conteúdo permitido\n');
  for (const path of privatePaths) {
    assert.equal(existsSync(join(pkg, path)), false, path);
    assert.equal(readFileSync(join(source, path), 'utf8'), 'dado sintético privado\n');
  }
});

test('cópia temporária não inclui diretório chamado README de estado', t => {
  const root = temp(t), source = join(root, 'source');
  for (const dir of ['src', 'bin', '.pbai4devs']) mkdirSync(join(source, dir), { recursive: true });
  put(join(source, 'package.json'), '{}'); put(join(source, 'LICENSE'), 'fixture');
  put(join(source, '.pbai4devs/state/README.md/privado'), 'dado sintético privado');
  const pkg = copiedPackage(root, source);
  assert.equal(existsSync(join(pkg, '.pbai4devs/state/README.md')), false);
  assert.equal(readFileSync(join(source, '.pbai4devs/state/README.md/privado'), 'utf8'), 'dado sintético privado');
});

test('cópia temporária não segue links para arquivos ou diretórios externos', t => {
  const root = temp(t), source = join(root, 'source'), outside = join(root, 'outside');
  for (const dir of ['src', 'bin', '.pbai4devs/rules', 'outside']) mkdirSync(join(root, dir === 'outside' ? dir : join('source', dir)), { recursive: true });
  put(join(source, 'package.json'), '{}'); put(join(source, 'LICENSE'), 'fixture');
  put(join(outside, 'sentinel'), 'dado sintético privado');
  try {
    symlinkSync(join(outside, 'sentinel'), join(source, '.pbai4devs/rules/file-link'), 'file');
    symlinkSync(outside, join(source, '.pbai4devs/rules/dir-link'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code) && !(process.platform === 'win32' && error.code === 'UNKNOWN')) throw error;
    return t.skip('Sistema sem permissão para criar links simbólicos.');
  }
  const pkg = copiedPackage(root, source);
  assert.equal(existsSync(join(pkg, '.pbai4devs/rules/file-link')), false);
  assert.equal(existsSync(join(pkg, '.pbai4devs/rules/dir-link')), false);
  assert.equal(readFileSync(join(outside, 'sentinel'), 'utf8'), 'dado sintético privado');
});
const fakePackage = (root, script, install = true, fault = null) => {
  const pkg = join(root, 'fake-package');
  put(join(pkg, 'package.json'), '{"name":"@pathbit/agentdevkit","version":"9.9.9","type":"module"}\n');
  const catalog = Object.fromEntries(['skills', 'agents', 'commands', 'rules'].map(type => [type, [{ id: 'synthetic', name: 'synthetic', path: `.pbai4devs/${type}/synthetic.txt` }]]));
  put(join(pkg, '.pbai4devs/catalog.json'), JSON.stringify({ skills: [], agents: [], commands: [], rules: [] }));
  const ids = ['codex','claude','opencode','gemini','copilot','cursor','kimi','minimax','deepseek','antigravity','antigravity-legacy','zcode','kimi-legacy','mimo'];
  const adapters = ids.map(id => ({ id, root: `.fake-${id}`, formats: {}, ...(id === 'cursor' ? { ruleMetadata: 'cursor.yaml' } : {}) }));
  put(join(pkg, '.pbai4devs/templates/clients/ADAPTERS.json'), JSON.stringify({schemaVersion:1,adapters}));
  put(join(pkg, '.pbai4devs/scripts/lib/catalog.mjs'), `export function buildCatalog(){return {catalog:${JSON.stringify(catalog)}}}`);
  put(join(pkg, '.pbai4devs/scripts/lib/resource-path.mjs'), fault === 'not-verified' ? 'export const unsupported=true;' : `export function clientResourcePath(source){return source.slice('.pbai4devs/'.length)}`);
  for (const entries of Object.values(catalog)) for (const entry of entries) put(join(pkg, entry.path), `synthetic ${entry.path}\n`);
  const fixture = `{
    const fs=await import('node:fs'), path=await import('node:path'), crypto=await import('node:crypto');
    const target=process.argv[process.argv.indexOf('--target')+1];
    const log=console.log;console.log=(value)=>{let data;try{data=JSON.parse(value)}catch{return log(value)};const cmd=process.argv[2];if(cmd==='init'){const statePath=path.join(target,'.pbai4devs/state/agentdevkit.json');const state=JSON.parse(fs.readFileSync(statePath));for(const p of ['AGENTS.md','CLAUDE.md','.claude/skills/criar-skill/SKILL.md','.agents/skills/projeto/criar-skill/SKILL.md']){const f=path.join(target,p);if(!fs.existsSync(f))continue;const text=fs.readFileSync(f,'utf8'),begin='<!-- BEGIN AGENTDEVKIT -->',end='<!-- END AGENTDEVKIT -->',a=text.indexOf(begin),b=text.indexOf(end);if(a>=0&&b>a)state.blocks[p]=crypto.createHash('sha256').update(text.slice(a,b+end.length)).digest('hex');}fs.writeFileSync(statePath,JSON.stringify(state));}data.command??=cmd;if(cmd==='update')data.changed??=false;if(cmd==='doctor')data.issues??=[];if(cmd==='sync'){data.plan??=[];data.conflicts??=[]}log(JSON.stringify(data));};
    if(process.argv[2]==='init'){
      const catalog=${JSON.stringify(catalog)}, files={};
      function write(p,v){const f=path.join(target,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,v);files[p]=crypto.createHash('sha256').update(v).digest('hex');}
      for(const entries of Object.values(catalog))for(const e of entries)write(e.path,'synthetic '+e.path+'\\n');
      write('.pbai4devs/catalog.json',JSON.stringify(catalog));
      for(const p of ['skills','agents','rules'])write('.pbai4devs/'+p+'.json',JSON.stringify(${JSON.stringify(fault)}==='index'?{}:{entries:catalog[p].map(e=>({path:p==='skills'?path.posix.dirname(e.path):e.path}))}));
      if(${JSON.stringify(fault)}!=='dest')for(const id of process.argv[process.argv.indexOf('--agents')+1].split(','))for(const entries of Object.values(catalog))for(const e of entries){const dest='.fake-'+id+'/'+e.path.slice('.pbai4devs/'.length);const rel=path.relative(path.dirname(path.join(target,dest)),path.join(target,e.path)).split(path.sep).join('/');write(dest,'---\\nname: synthetic\\n---\\n\\n# Synthetic\\n\\n<!-- gerado: sincronizar-agentes -->\\nLeia e siga [origem]('+rel+').\\n');}
      const state={schemaVersion:1,version:'9.9.9',clients:process.argv[process.argv.indexOf('--agents')+1].split(','),files,blocks:{}};
      fs.mkdirSync(path.join(target,'.pbai4devs/state'),{recursive:true});fs.writeFileSync(path.join(target,'.pbai4devs/state/agentdevkit.json'),JSON.stringify(state));
    }
  }\n`;
  put(join(pkg, 'bin/agentdevkit.mjs'), (install ? fixture : '') + script);
  return pkg;
};
const controlled = root => ({ ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key))), GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(root, 'no-global'), GIT_TERMINAL_PROMPT: '0' });
// Corpos da fixture 0.0.21 autenticada; limitados ao teste, sem rede.
const legacyBodies = { new: gunzipSync(Buffer.from('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', 'base64')).toString('utf8'), existing: gunzipSync(Buffer.from('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', 'base64')).toString('utf8') };
const fakeLegacyPackage = (...args) => { const pkg = fakePackage(...args); for (const file of ['package.json', 'bin/agentdevkit.mjs']) { const path = join(pkg, file); writeFileSync(path, readFileSync(path, 'utf8').replaceAll('9.9.9', '0.0.21')); } return pkg; };
const fakeExcludeAppend = `const id=(await import('node:crypto')).createHash('sha256').update((await import('node:fs')).realpathSync(target)).digest('hex').slice(0,16);const body=(await import('node:fs')).existsSync(join(target,'.claude/settings.json'))?${JSON.stringify(legacyBodies.existing)}:${JSON.stringify(legacyBodies.new)};appendFileSync(join(target,'.git/info/exclude'),'# BEGIN AGENTDEVKIT LOCAL '+id+'\\n'+body+'# END AGENTDEVKIT LOCAL '+id+'\\n')`;

test('proveniência recusa entrada alterada ou indisponível após a leitura inicial', t => {
  const root = temp(t), file = join(root, 'entrada'); put(file, 'original');
  const before = provenanceSnapshot({ file });
  assert.equal(provenanceComparison(before, provenanceSnapshot({ file })), true);
  put(file, 'alterado');
  assert.equal(provenanceComparison(before, provenanceSnapshot({ file })), false);
  unlinkSync(file);
  const after = provenanceSnapshot({ file });
  assert.equal(after.file.error, 'ENOENT');
  assert.equal(provenanceComparison(before, after), false);
  assert.equal(provenanceComparison(after, after), false);
  assert.equal(provenanceComparison({}, {}), false);
  assert.equal(provenanceComparison(before, { ...before, extra: before.file }), false);
  assert.equal(provenanceComparison({ ...before, extra: before.file }, before), false);
  assert.equal(provenanceComparison(before, { other: before.file }), false);
});

test('política Cursor exige uma única entrada com nome de sidecar válido', () => {
  assert.equal(cursorMetadataFromPolicy({ adapters: [{ id: 'cursor', ruleMetadata: 'cursor.yaml' }] }), 'cursor.yaml');
  for (const policy of [null, {}, { adapters: [] }, { adapters: [{ id: 'cursor' }] }, { adapters: [{ id: 'cursor', ruleMetadata: null }] }, { adapters: [{ id: 'cursor', ruleMetadata: '../outside.yaml' }] }, { adapters: [{ id: 'cursor', ruleMetadata: 'cursor.yaml' }, { id: 'cursor', ruleMetadata: 'cursor.yaml' }] }]) {
    assert.throws(() => cursorMetadataFromPolicy(policy), /inválida/);
  }
});

test('CLI rejeita política de adaptadores em link antes de criar projetos', { skip: runtimeSkip, timeout: 30000 }, t => {
  const root = temp(t), output = join(root, 'output'), testRunner = join(root, 'tests/project-matrix.mjs');
  mkdirSync(output); mkdirSync(dirname(testRunner), { recursive: true });
  const lib = join(root, '.pbai4devs/scripts/lib'); mkdirSync(lib, { recursive: true });
  for (const name of runnerLibraries) copyFileSync(resolve(dirname(runner), '../.pbai4devs/scripts/lib', name), join(lib, name));
  copyFileSync(runner, testRunner);
  const pkg = fakePackage(root, "console.log(JSON.stringify({ok:true,version:'9.9.9'}));");
  const policy = join(pkg, '.pbai4devs/templates/clients/ADAPTERS.json'), outside = join(root, 'outside.json');
  put(outside, '{"adapters":[]}'); unlinkSync(policy);
  try { symlinkSync(outside, policy, 'file'); }
  catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code) && !(process.platform === 'win32' && error.code === 'UNKNOWN')) throw error;
    return t.skip('Sistema sem permissão para criar link simbólico.');
  }
  const run = spawnSync(process.execPath, [testRunner, '--package', pkg, '--version', '9.9.9', '--output', output, '--jobs', '1'], { encoding: 'utf8', timeout: 25000 });
  assert.equal(run.status, 1, `${run.error?.message || ''}\n${run.stderr}`);
  assert.match(run.stderr, /Proveniência inicial não verificável/);
  assert.deepEqual(readdirSync(output), []);
  assert.equal(readFileSync(outside, 'utf8'), '{"adapters":[]}');
});

test('CLI rejeita política sem Cursor antes de criar projetos', { skip: runtimeSkip, timeout: 30000 }, t => {
  const root = temp(t), output = join(root, 'output'), testRunner = join(root, 'tests/project-matrix.mjs');
  mkdirSync(output); mkdirSync(dirname(testRunner), { recursive: true });
  const lib = join(root, '.pbai4devs/scripts/lib'); mkdirSync(lib, { recursive: true });
  for (const name of runnerLibraries) copyFileSync(resolve(dirname(runner), '../.pbai4devs/scripts/lib', name), join(lib, name));
  copyFileSync(runner, testRunner);
  const pkg = fakePackage(root, "console.log(JSON.stringify({ok:true,version:'9.9.9'}));");
  const file = join(pkg, '.pbai4devs/templates/clients/ADAPTERS.json'), policy = JSON.parse(readFileSync(file, 'utf8'));
  policy.adapters = policy.adapters.filter(adapter => adapter.id !== 'cursor'); writeFileSync(file, JSON.stringify(policy));
  const run = spawnSync(process.execPath, [testRunner, '--package', pkg, '--version', '9.9.9', '--output', output, '--jobs', '1'], { encoding: 'utf8', timeout: 25000 });
  assert.equal(run.status, 1, `${run.error?.message || ''}\n${run.stderr}`);
  assert.match(run.stderr, /Política de metadados Cursor inválida/);
  assert.deepEqual(readdirSync(output), []);
});

test('CLI interrompe antes das fixtures quando sidecar inicial é link', { skip: runtimeSkip, timeout: 30000 }, t => {
  const root = temp(t), output = join(root, 'output'), testRunner = join(root, 'tests/project-matrix.mjs');
  mkdirSync(output); mkdirSync(dirname(testRunner), { recursive: true });
  const lib = join(root, '.pbai4devs/scripts/lib'); mkdirSync(lib, { recursive: true });
  for (const name of runnerLibraries) copyFileSync(resolve(dirname(runner), '../.pbai4devs/scripts/lib', name), join(lib, name));
  copyFileSync(runner, testRunner);
  const pkg = fakePackage(root, "console.log(JSON.stringify({ok:true,version:'9.9.9'}));");
  const sidecar = join(pkg, '.pbai4devs/rules/cursor.yaml'), outside = join(root, 'outside.yaml');
  put(outside, 'dado sintético privado');
  try { symlinkSync(outside, sidecar, 'file'); }
  catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code) && !(process.platform === 'win32' && error.code === 'UNKNOWN')) throw error;
    return t.skip('Sistema sem permissão para criar link simbólico.');
  }
  const run = spawnSync(process.execPath, [testRunner, '--package', pkg, '--version', '9.9.9', '--output', output, '--jobs', '1'], { encoding: 'utf8', timeout: 25000 });
  assert.equal(run.status, 1, `${run.error?.message || ''}\n${run.stderr}`);
  assert.match(run.stderr, /Proveniência inicial dos sidecars não verificável/);
  assert.deepEqual(readdirSync(output), []);
  assert.equal(readFileSync(outside, 'utf8'), 'dado sintético privado');
});

for (const placement of ['arquivo', 'ancestral']) test(`proveniência fixa recusa link em ${placement} sem abrir destino`, t => {
  const root = temp(t), outside = join(root, 'outside'), inside = join(root, 'inside');
  mkdirSync(outside); mkdirSync(inside); const sentinel = join(outside, 'secret'); put(sentinel, 'dado sintético privado');
  const link = join(inside, 'link'), destination = placement === 'arquivo' ? sentinel : outside;
  try { symlinkSync(destination, link, placement === 'arquivo' ? 'file' : process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code) && !(process.platform === 'win32' && error.code === 'UNKNOWN')) throw error;
    return t.skip('Sistema sem permissão para criar link simbólico.');
  }
  const target = placement === 'arquivo' ? link : join(link, 'secret'), originalOpen = fs.openSync, realSentinel = realpathSync(sentinel);
  let attempts = 0, result;
  try {
    fs.openSync = function (path, ...args) {
      if (typeof path === 'string') {
        let actual; try { actual = realpathSync(path); } catch { /* Outra leitura pode não existir. */ }
        if (actual === realSentinel) { attempts++; throw Error('Abertura externa bloqueada pela fixture.'); }
      }
      return originalOpen.call(this, path, ...args);
    };
    syncBuiltinESMExports();
    assert.throws(() => fs.openSync(sentinel, 'r'), /bloqueada pela fixture/); attempts = 0;
    result = provenanceSnapshot({ target });
  } finally { fs.openSync = originalOpen; syncBuiltinESMExports(); }
  assert.equal(result.target.error, 'E_SYMLINK');
  assert.equal(attempts, 0);
  assert.equal(readFileSync(sentinel, 'utf8'), 'dado sintético privado');
});

test('proveniência interrompe leitura se ancestral muda após abertura', t => {
  const root = temp(t), inside = join(root, 'inside'), parent = join(inside, 'folder'), moved = join(inside, 'moved');
  mkdirSync(parent, { recursive: true }); const target = join(parent, 'file'); put(target, 'dado sintético');
  const probe = join(root, 'link-probe');
  try { symlinkSync(parent, probe, process.platform === 'win32' ? 'junction' : 'dir'); unlinkSync(probe); }
  catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code) && !(process.platform === 'win32' && error.code === 'UNKNOWN')) throw error;
    return t.skip('Sistema sem permissão para criar link simbólico.');
  }
  const originalOpen = fs.openSync, originalRead = fs.readFileSync, realTarget = realpathSync(target);
  let injected = false, trackedFd = null, reads = 0, result;
  try {
    fs.openSync = function (path, ...args) {
      let actual; try { if (typeof path === 'string') actual = realpathSync(path); } catch { /* Outro caminho. */ }
      if (!injected && actual === realTarget) {
        renameSync(parent, moved); symlinkSync(moved, parent, process.platform === 'win32' ? 'junction' : 'dir'); injected = true;
        trackedFd = originalOpen.call(this, path, ...args); return trackedFd;
      }
      return originalOpen.call(this, path, ...args);
    };
    fs.readFileSync = function (path, ...args) { if (path === trackedFd) reads++; return originalRead.call(this, path, ...args); };
    syncBuiltinESMExports(); result = provenanceSnapshot({ target });
  } finally { fs.openSync = originalOpen; fs.readFileSync = originalRead; syncBuiltinESMExports(); }
  assert.equal(injected, true);
  assert.equal(result.target.error, 'E_CHANGED');
  assert.equal(reads, 0);
  assert.equal(readFileSync(join(moved, 'file'), 'utf8'), 'dado sintético');
});

test('proveniência de sidecars detecta mudança, inclusão e remoção', t => {
  const root = temp(t), rules = join(root, '.pbai4devs/rules');
  const first = join(rules, 'first/cursor.yaml'), second = join(rules, 'second/cursor.yaml');
  put(first, '---\nalwaysApply: false\n---\n');
  const before = cursorSidecarSnapshot(root, 'cursor.yaml');
  assert.equal(provenanceComparison(before, cursorSidecarSnapshot(root, 'cursor.yaml')), true);
  assert.equal(provenanceComparison(before, cursorSidecarSnapshot(root, 'CURSOR.YAML')), true);
  put(join(rules, 'first/other.txt'), 'ignorado');
  assert.equal(provenanceComparison(before, cursorSidecarSnapshot(root, 'cursor.yaml')), true);
  put(second, '---\nalwaysApply: true\n---\n');
  assert.equal(provenanceComparison(before, cursorSidecarSnapshot(root, 'cursor.yaml')), false);
  unlinkSync(second);
  writeFileSync(first, '---\nalwaysApply: true\n---\n');
  assert.equal(provenanceComparison(before, cursorSidecarSnapshot(root, 'cursor.yaml')), false);
  unlinkSync(first);
  assert.equal(provenanceComparison(before, cursorSidecarSnapshot(root, 'cursor.yaml')), false);
  assert.deepEqual(cursorSidecarSnapshot(root, null), {});
  for (const name of ['../../fora.yaml', '/tmp/fora.yaml', '..\\fora.yaml', 'fora.json', '', 42]) {
    assert.throws(() => cursorSidecarSnapshot(root, name), /inválido/);
  }
});

for (const placement of ['base', 'subdiretório', 'sidecar']) test(`proveniência recusa link em ${placement} sem ler destino pelas APIs monitoradas`, t => {
  const root = temp(t), parent = join(root, '.pbai4devs'), rules = join(parent, 'rules'); mkdirSync(parent, { recursive: true });
  const outside = join(root, 'outside'); mkdirSync(outside); const sentinel = join(outside, 'cursor.yaml'); put(sentinel, 'dado sintético privado');
  if (placement !== 'base') mkdirSync(rules);
  const link = placement === 'base' ? rules : placement === 'subdiretório' ? join(rules, 'linked') : join(rules, 'cursor.yaml');
  const destination = placement === 'sidecar' ? sentinel : outside;
  try { symlinkSync(destination, link, placement === 'sidecar' ? 'file' : process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code) && !(process.platform === 'win32' && error.code === 'UNKNOWN')) throw error;
    return t.skip('Sistema sem permissão para criar link simbólico.');
  }
  const originalRead = fs.readFileSync, originalOpen = fs.openSync, realSentinel = realpathSync(sentinel); let attempts = 0, linked;
  const check = path => {
    if (typeof path !== 'string') return;
    let actual; try { actual = realpathSync(path); } catch { return; }
    if (actual === realSentinel) { attempts++; throw Error('Leitura externa bloqueada pela fixture.'); }
  };
  try {
    fs.readFileSync = function (path, ...args) {
      check(path);
      return originalRead.call(this, path, ...args);
    };
    fs.openSync = function (path, ...args) { check(path); return originalOpen.call(this, path, ...args); };
    syncBuiltinESMExports();
    assert.throws(() => fs.readFileSync(sentinel), /bloqueada pela fixture/);
    assert.throws(() => fs.openSync(sentinel, 'r'), /bloqueada pela fixture/);
    attempts = 0;
    linked = cursorSidecarSnapshot(root, 'cursor.yaml');
  } finally { fs.readFileSync = originalRead; fs.openSync = originalOpen; syncBuiltinESMExports(); }
  assert.equal(attempts, 0);
  assert.equal(linked['cursorSidecar:inventory'].error, 'E_SIDECAR_INVENTORY');
  assert.equal(readFileSync(sentinel, 'utf8'), 'dado sintético privado');
});

test('status global prioriza falhas e mantém casos não verificados distintos', () => {
  assert.equal(overallStatus(true, 0, 0), 'passed');
  assert.equal(overallStatus(true, 0, 1), 'not-verified');
  assert.equal(overallStatus(true, 1, 1), 'failed');
  assert.equal(overallStatus(false, 0, 0), 'failed');
  assert.equal(overallStatus(false, 0, 1), 'failed');
});

test('escopo gerado exige frontmatter exato e deixa sidecars ou origens humanas não verificados', () => {
  const rule = { trigger: 'glob', description: 'Regra de teste', globs: 'src/**/*.js' };
  const check = (path, entry, content, extra = {}) => inspectGeneratedRuleScope({ path, entry, content, sourceMatches: true, hasMetadata: false, ...extra });
  const cursor = '---\ndescription: "Regra de teste"\nalwaysApply: false\nglobs: "src/**/*.js"\n---\n\n# Título\n';
  const copilot = '---\napplyTo: "src/**/*.js"\n---\n\n# Título\n';
  assert.equal(check('.cursor/rules/test.mdc', rule, cursor), 'verified');
  assert.equal(check('.github/instructions/test.instructions.md', rule, copilot), 'verified');
  assert.equal(check('.cursor/rules/test.mdc', rule, cursor.replace('alwaysApply: false', 'alwaysApply: true')), 'mismatch');
  assert.equal(check('.cursor/rules/test.mdc', rule, cursor.replace('globs: "src/**/*.js"', 'globs: "**"')), 'mismatch');
  assert.equal(check('.cursor/rules/test.mdc', rule, cursor.replace('alwaysApply: false', 'alwaysApply: false\nalwaysApply: true')), 'mismatch');
  assert.equal(check('.github/instructions/test.instructions.md', rule, copilot.replace('src/**/*.js', '**')), 'mismatch');
  assert.equal(check('.github/instructions/test.instructions.md', { ...rule, trigger: 'always_on' }, '---\napplyTo: "**"\n---\n'), 'verified');
  assert.equal(check('.github/instructions/test.instructions.md', { ...rule, trigger: 'manual' }, copilot), 'not-verified');
  assert.equal(check('.cursor/rules/test.mdc', { ...rule, trigger: 'manual' }, '---\ndescription: ""\nalwaysApply: false\n---\n'), 'verified');
  assert.equal(check('.cursor/rules/test.mdc', { ...rule, trigger: 'manual' }, '---\ndescription: "Regra de teste"\nalwaysApply: false\n---\n'), 'mismatch');
  assert.equal(check('.cursor/rules/test.mdc', rule, cursor, { hasMetadata: true }), 'not-verified');
  assert.equal(check('.cursor/rules/test.mdc', rule, cursor, { sourceMatches: false }), 'not-verified');
  assert.equal(check('.cursor/rules/test.mdc', { ...rule, globs: '' }, cursor), 'not-verified');
});

test('sidecar Cursor detecta divergência de bytes sem afirmar escopo nativo', () => {
  const metadata = Buffer.from('---\ndescription: Regra Git.\nalwaysApply: false\n---\n');
  const path = '.cursor/rules/git.mdc', content = `${metadata.toString()}\n# Git\n`;
  assert.equal(compareCursorSidecar({ path, metadata, content }), 'matches');
  assert.equal(compareCursorSidecar({ path, metadata, content: content.replace('alwaysApply: false', 'alwaysApply: true') }), 'mismatch');
  assert.equal(compareCursorSidecar({ path, metadata, content: content.replace('Regra Git.', 'Outra regra.') }), 'mismatch');
  assert.equal(compareCursorSidecar({ path, metadata: Buffer.from('---\ndescription: Regra\nglobs: "**"\n---\n'), content }), 'not-verified');
  assert.equal(compareCursorSidecar({ path, metadata: Buffer.from([0xff]), content }), 'not-verified');
  assert.equal(compareCursorSidecar({ path: '.github/instructions/git.instructions.md', metadata, content }), 'not-verified');
  assert.equal(inspectGeneratedRuleScope({ path, entry: { trigger: 'model_decision', description: 'Regra Git.' }, content, sourceMatches: true, hasMetadata: true }), 'not-verified');
});

test('matriz recusa frontmatter Cursor alterado mesmo com hash atualizado', { skip: runtimeSkip, timeout: 60000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const pkg = copiedPackage(root);
  const cli = join(pkg, 'bin/agentdevkit.mjs'), version = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8')).version;
  const run = async (file, args, cwd, env) => {
    const result = await command(file, args, cwd, env);
    if (file === process.execPath && args[0] === cli && args[1] === 'init' && result.status === 0) {
      const relative = '.cursor/rules/git.mdc', target = join(cwd, relative);
      const content = readFileSync(target, 'utf8').replace('alwaysApply: false', 'alwaysApply: true');
      assert.match(content, /alwaysApply: true/);
      writeFileSync(target, content);
      const stateFile = join(cwd, '.pbai4devs/state/agentdevkit.json'), state = JSON.parse(readFileSync(stateFile, 'utf8'));
      state.files[relative] = createHash('sha256').update(content).digest('hex');
      writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
    }
    return result;
  };
  const result = await projectCase({ number: 1, kind: 'new', selection: 'cursor' }, results, cli, version, controlled(root), run);
  assert.equal(result.status, 'failed');
  assert.match(result.issue, /Frontmatter Cursor diverge do sidecar instalado/);
  assert.ok(!result.operations.some(operation => operation.label === 'update'));
});

test('sidecar Cursor em outra sintaxe válida permanece não verificado', { skip: runtimeSkip, timeout: 60000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const pkg = copiedPackage(root), cli = join(pkg, 'bin/agentdevkit.mjs');
  const version = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8')).version;
  writeFileSync(join(pkg, '.pbai4devs/rules/git/cursor.yaml'), '---\nalwaysApply: false\ndescription: Regra Git.\n---\n');
  const result = await projectCase({ number: 1, kind: 'new', selection: 'cursor' }, results, cli, version, controlled(root));
  assert.equal(result.status, 'not-verified', result.issue);
  assert.equal(result.issue, null);
  assert.ok(result.coverage.notVerified.some(reason => reason.includes('cursor/rules')));
  assert.equal(result.operations.at(-1).label, 'sync-check');
  assert.equal(result.preservation.unchanged, true);
});

test('matriz recusa nome de metadado que sai do diretório da regra', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const pkg = fakePackage(root, "console.log(JSON.stringify({ok:true,version:'9.9.9'}));");
  const policyFile = join(pkg, '.pbai4devs/templates/clients/ADAPTERS.json');
  const policy = JSON.parse(readFileSync(policyFile, 'utf8'));
  policy.adapters.find(adapter => adapter.id === 'cursor').ruleMetadata = '../../outside.yaml';
  writeFileSync(policyFile, JSON.stringify(policy));
  const outside = join(root, 'outside.yaml'); writeFileSync(outside, 'conteúdo humano\n');
  const result = await projectCase({ number: 1, kind: 'new', selection: 'cursor' }, results, join(pkg, 'bin/agentdevkit.mjs'), '9.9.9', controlled(root));
  assert.equal(result.status, 'failed');
  assert.match(result.issue, /Nome de metadado inválido/);
  assert.equal(readFileSync(outside, 'utf8'), 'conteúdo humano\n');
});

test('cobertura exige dados coerentes em cada etapa', () => {
  const labels = ['init', 'update', 'update-force', 'doctor', 'sync-check'];
  const verified = () => ({ status: 'verified', notVerified: [], checked: { skills: 1, agents: 0, commands: 2, rules: 3 } });
  const operations = () => labels.map(label => ({ label, installation: { coverage: verified() } }));
  assert.deepEqual(assessCoverage(operations()), { status: 'verified', reasons: [] });
  for (const [description, mutate] of [
    ['ausente', coverage => { delete coverage.status; }],
    ['desconhecido', coverage => { coverage.status = 'other'; }],
    ['inconsistente', coverage => { coverage.notVerified.push('destino não inspecionado'); }],
    ['contagem ausente', coverage => { delete coverage.checked.skills; }],
    ['contagem inválida', coverage => { coverage.checked.agents = -1; }],
    ['motivos inválidos', coverage => { coverage.notVerified = [null]; }],
    ['não verificado', coverage => { coverage.status = 'not-verified'; coverage.notVerified = ['destino não inspecionado']; }],
  ]) {
    const steps = operations(); mutate(steps[0].installation.coverage);
    const result = assessCoverage(steps);
    assert.equal(result.status, 'not-verified', description);
    assert.ok(result.reasons.some(reason => reason.startsWith('init:')), description);
  }
  const missingCoverage = operations(); delete missingCoverage[4].installation.coverage;
  assert.match(assessCoverage(missingCoverage).reasons.join('\n'), /sync-check: cobertura ausente/);
  assert.match(assessCoverage(operations().slice(1)).reasons.join('\n'), /init: etapa ausente/);
  const repeated = operations(); repeated.push(repeated[0]);
  assert.match(assessCoverage(repeated).reasons.join('\n'), /init: etapa ausente ou duplicada/);
});

test('CLI não aprova cobertura ausente em etapa anterior e falhas prevalecem', { skip: runtimeSkip, timeout: 60000 }, t => {
  const root = temp(t), testRunner = join(root, 'tests/project-matrix.mjs');
  mkdirSync(dirname(testRunner), { recursive: true });
  const lib = join(root, '.pbai4devs/scripts/lib'); mkdirSync(lib, { recursive: true });
  for (const name of runnerLibraries) copyFileSync(resolve(dirname(runner), '../.pbai4devs/scripts/lib', name), join(lib, name));
  const original = readFileSync(runner, 'utf8');
  const reduced = original.replace('const cases = matrixCases(opts.rounds, opts.startRound);', 'const cases = matrixCases(opts.rounds, opts.startRound).slice(0, 1);');
  const needle = 'step.installation = inspectInstallation(root, version, item.selection, inventory, new Set([...Object.keys(humanHubSkills), ...Object.keys(expectedDocuments)]), expectedDocuments);';
  const injected = reduced.replace(needle, `${needle}\n        if (name === 'init') delete step.installation.coverage;`);
  assert.notEqual(reduced, original); assert.notEqual(injected, reduced); writeFileSync(testRunner, injected);
  for (const failure of [false, true]) {
    const scenario = join(root, failure ? 'failed' : 'unverified'), output = join(scenario, 'output');
    mkdirSync(output, { recursive: true });
    const pkg = fakePackage(scenario, `console.log(JSON.stringify({ok:${failure ? "process.argv[2]!=='update'" : 'true'},version:'9.9.9'}));`);
    const run = spawnSync(process.execPath, [testRunner, '--package', pkg, '--version', '9.9.9', '--output', output, '--jobs', '1'], { encoding: 'utf8', timeout: 25000 });
    assert.equal(run.status, 1, `${run.error?.message || ''}\n${run.stderr}`);
    const summary = JSON.parse(run.stdout), report = JSON.parse(readFileSync(summary.report)), item = report.results[0];
    assert.equal(item.status, failure ? 'failed' : 'not-verified');
    assert.equal(report.status, item.status); assert.equal(summary.status, item.status);
    assert.equal(item.passed, false); assert.equal(report.passed, 0);
    assert.match(item.coverageAssessment.reasons.join('\n'), /init: cobertura ausente/);
    if (!failure) { assert.equal(item.coverage.status, 'verified'); assert.equal(item.operations.filter(step => step.installation).length, 5); }
    else assert.match(item.issue, /update falhou/);
  }
});

test('CLI registra falha e exit 1 quando o pacote muda durante um cenário aprovado', { skip: runtimeSkip, timeout: 30000 }, t => {
  const root = temp(t), output = join(root, 'output'), testRunner = join(root, 'tests/project-matrix.mjs');
  mkdirSync(output); mkdirSync(dirname(testRunner), { recursive: true });
  const lib = join(root, '.pbai4devs/scripts/lib'); mkdirSync(lib, { recursive: true });
  for (const name of runnerLibraries) copyFileSync(resolve(dirname(runner), '../.pbai4devs/scripts/lib', name), join(lib, name));
  const original = readFileSync(runner, 'utf8');
  const reduced = original.replace('const cases = matrixCases(opts.rounds, opts.startRound);', 'const cases = matrixCases(opts.rounds, opts.startRound).slice(0, 1);');
  assert.notEqual(reduced, original); writeFileSync(testRunner, reduced);
  const pkg = fakePackage(root, `if(process.argv[2]==='sync') { const fs=await import('node:fs'); for(const f of ['../package.json','../.pbai4devs/scripts/lib/catalog.mjs','../.pbai4devs/scripts/lib/resource-path.mjs','../.pbai4devs/templates/clients/ADAPTERS.json','../.pbai4devs/rules/cursor.yaml'])fs.appendFileSync(new URL(f,import.meta.url),' '); } console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const policyFile = join(pkg, '.pbai4devs/templates/clients/ADAPTERS.json');
  const policy = JSON.parse(readFileSync(policyFile, 'utf8'));
  policy.adapters.find(adapter => adapter.id === 'cursor').ruleMetadata = 'cursor.yaml';
  writeFileSync(policyFile, JSON.stringify(policy));
  put(join(pkg, '.pbai4devs/rules/cursor.yaml'), '---\nalwaysApply: false\n---\n');
  const result = spawnSync(process.execPath, [testRunner, '--package', pkg, '--version', '9.9.9', '--output', output, '--jobs', '1'], { encoding: 'utf8', timeout: 25000 });
  assert.equal(result.status, 1, `${result.error?.message || ''}\n${result.stderr}`);
  const summary = JSON.parse(result.stdout), report = JSON.parse(readFileSync(summary.report));
  assert.equal(report.projects, 1); assert.equal(report.passed, 1); assert.equal(report.failed, 0);
  assert.equal(summary.status, 'failed'); assert.equal(report.status, 'failed');
  assert.equal(summary.provenancePassed, false); assert.equal(report.provenance.passed, false);
  assert.equal(report.provenance.platform, process.platform); assert.equal(report.provenance.arch, process.arch);
  for (const name of ['packageManifest', 'packageCatalog', 'packageResourcePath', 'packageAdapterPolicy']) assert.notEqual(report.provenance.before[name].sha256, report.provenance.after[name].sha256);
  assert.notEqual(report.provenance.before['cursorSidecar:.pbai4devs/rules/cursor.yaml'].sha256, report.provenance.after['cursorSidecar:.pbai4devs/rules/cursor.yaml'].sha256);
  for (const name of ['runner', 'managedContent', 'managedToml', 'packageCli']) assert.equal(report.provenance.before[name].sha256, report.provenance.after[name].sha256);
});

test('CLI reprova proveniência quando apenas um sidecar Cursor muda', { skip: runtimeSkip, timeout: 30000 }, t => {
  const root = temp(t), output = join(root, 'output'), testRunner = join(root, 'tests/project-matrix.mjs');
  mkdirSync(output); mkdirSync(dirname(testRunner), { recursive: true });
  const lib = join(root, '.pbai4devs/scripts/lib'); mkdirSync(lib, { recursive: true });
  for (const name of runnerLibraries) copyFileSync(resolve(dirname(runner), '../.pbai4devs/scripts/lib', name), join(lib, name));
  const original = readFileSync(runner, 'utf8');
  const reduced = original.replace('const cases = matrixCases(opts.rounds, opts.startRound);', 'const cases = matrixCases(opts.rounds, opts.startRound).slice(0, 1);');
  assert.notEqual(reduced, original); writeFileSync(testRunner, reduced);
  const pkg = fakePackage(root, `if(process.argv[2]==='sync') { const fs=await import('node:fs'); fs.appendFileSync(new URL('../.pbai4devs/rules/cursor.yaml',import.meta.url),' '); } console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const policyFile = join(pkg, '.pbai4devs/templates/clients/ADAPTERS.json'), policy = JSON.parse(readFileSync(policyFile, 'utf8'));
  policy.adapters.find(adapter => adapter.id === 'cursor').ruleMetadata = 'cursor.yaml'; writeFileSync(policyFile, JSON.stringify(policy));
  put(join(pkg, '.pbai4devs/rules/cursor.yaml'), '---\nalwaysApply: false\n---\n');
  const run = spawnSync(process.execPath, [testRunner, '--package', pkg, '--version', '9.9.9', '--output', output, '--jobs', '1'], { encoding: 'utf8', timeout: 25000 });
  assert.equal(run.status, 1, `${run.error?.message || ''}\n${run.stderr}`);
  const summary = JSON.parse(run.stdout), report = JSON.parse(readFileSync(summary.report));
  assert.equal(report.passed, 1); assert.equal(report.failed, 0);
  assert.equal(summary.status, 'failed'); assert.equal(report.provenance.passed, false);
  assert.notEqual(report.provenance.before['cursorSidecar:.pbai4devs/rules/cursor.yaml'].sha256, report.provenance.after['cursorSidecar:.pbai4devs/rules/cursor.yaml'].sha256);
});

test('CLI comunica status não verificado quando apenas a cobertura está incompleta', { skip: runtimeSkip, timeout: 30000 }, t => {
  const root = temp(t), output = join(root, 'output'), testRunner = join(root, 'tests/project-matrix.mjs');
  mkdirSync(output); mkdirSync(dirname(testRunner), { recursive: true });
  const lib = join(root, '.pbai4devs/scripts/lib'); mkdirSync(lib, { recursive: true });
  for (const name of runnerLibraries) copyFileSync(resolve(dirname(runner), '../.pbai4devs/scripts/lib', name), join(lib, name));
  const original = readFileSync(runner, 'utf8');
  const reduced = original.replace('const cases = matrixCases(opts.rounds, opts.startRound);', 'const cases = matrixCases(opts.rounds, opts.startRound).slice(0, 1);');
  assert.notEqual(reduced, original); writeFileSync(testRunner, reduced);
  const pkg = fakePackage(root, `console.log(JSON.stringify({ok:true,version:'9.9.9'}));`, true, 'not-verified');
  const result = spawnSync(process.execPath, [testRunner, '--package', pkg, '--version', '9.9.9', '--output', output, '--jobs', '1'], { encoding: 'utf8', timeout: 25000 });
  assert.equal(result.status, 1, `${result.error?.message || ''}\n${result.stderr}`);
  const summary = JSON.parse(result.stdout), report = JSON.parse(readFileSync(summary.report));
  assert.equal(summary.status, 'not-verified'); assert.equal(report.status, 'not-verified');
  assert.equal(report.projects, 1); assert.equal(report.passed, 0); assert.equal(report.failed, 0); assert.equal(report.notVerified, 1);
  assert.equal(report.provenance.passed, true);
});

test('CLI registra exceção de preparação como falha no caso e no relatório agregado', { skip: runtimeSkip, timeout: 30000 }, t => {
  const root = temp(t), output = join(root, 'output'), testRunner = join(root, 'tests/project-matrix.mjs');
  mkdirSync(output); mkdirSync(dirname(testRunner), { recursive: true });
  const lib = join(root, '.pbai4devs/scripts/lib'); mkdirSync(lib, { recursive: true });
  for (const name of runnerLibraries) copyFileSync(resolve(dirname(runner), '../.pbai4devs/scripts/lib', name), join(lib, name));
  const original = readFileSync(runner, 'utf8');
  const reduced = original.replace('const cases = matrixCases(opts.rounds, opts.startRound);', "const cases = matrixCases(opts.rounds, opts.startRound).slice(0, 1); mkdirSync(join(directory, '01-new'));");
  assert.notEqual(reduced, original); writeFileSync(testRunner, reduced);
  const pkg = fakePackage(root, `console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const result = spawnSync(process.execPath, [testRunner, '--package', pkg, '--version', '9.9.9', '--output', output, '--jobs', '1'], { encoding: 'utf8', timeout: 25000 });
  assert.equal(result.status, 1, `${result.error?.message || ''}\n${result.stderr}`);
  const summary = JSON.parse(result.stdout), report = JSON.parse(readFileSync(summary.report));
  assert.equal(summary.status, 'failed'); assert.equal(report.status, 'failed');
  assert.equal(report.projects, 1); assert.equal(report.passed, 0); assert.equal(report.failed, 1); assert.equal(report.notVerified, 0);
  assert.equal(report.provenance.passed, true);
  const item = report.results[0], setup = JSON.parse(readFileSync(item.report));
  assert.equal(item.status, 'failed'); assert.equal(item.passed, false);
  assert.match(item.issue, /EEXIST/); assert.deepEqual(setup, item);
});

test('planeja mil projetos distintos e reproduzíveis sem criar projetos', () => {
  const cases = matrixCases(25);
  assert.equal(cases.length, 1000);
  assert.deepEqual(cases, matrixCases(25));
  assert.deepEqual(cases.map(item => item.number), Array.from({ length: 1000 }, (_, i) => i + 1));
  const scenario = item => [item.kind, item.fixture, item.selection.split(',').sort().join(',')].join('|');
  assert.equal(new Set(cases.map(scenario)).size, 1000);
  assert.equal(new Set(matrixCases(100).map(scenario)).size, 4000);
  assert.equal(cases.filter(item => item.kind === 'new').length, 500);
  assert.equal(cases.filter(item => item.kind === 'existing').length, 500);
  assert.deepEqual([...new Set(cases.map(item => item.fixture))], [0, 1, 2, 3]);
  assert.ok(new Set(cases.map(item => item.selection)).size > 100);
  assert.ok(cases.some(item => item.selection.split(',').length === 3));
  assert.ok(cases.every(item => new Set(item.selection.split(',')).size === item.selection.split(',').length));
  assert.equal(matrixCases(100).length, 4000);
  for (const rounds of [0, 101, 1.5, NaN]) assert.throws(() => matrixCases(rounds), /--rounds/);
});

test('lotes reproduzem exatamente a matriz integral sem lacunas nem números repetidos', () => {
  const full = matrixCases(100);
  const batches = [matrixCases(17), matrixCases(33, 18), matrixCases(50, 51)];
  assert.deepEqual(batches.flat(), full);
  assert.equal(matrixCases(1, 100)[0].number, 3961);
  assert.equal(matrixCases(1, 100).at(-1).number, 4000);
  for (const start of [0, 101, 1.5, NaN]) assert.throws(() => matrixCases(1, start), /--start-round/);
  assert.throws(() => matrixCases(2, 100), /--start-round/);
});

test('oráculo legado limita pares a 25 rodadas e mantém fórmulas distintas', () => {
  assert.ok(matrixCases(25).every(item => /^[a-f0-9]{64}$/.test(expectedLegacyExclude(item, '0.0.21'))));
  for (const start of [26, 27, 28, 29]) assert.ok(matrixCases(1, start).every(item => expectedLegacyExclude(item, '0.0.21') === null));
  const value = (kind, selection) => expectedLegacyExclude({ kind, selection, fixture: 0 }, '0.0.21');
  assert.notEqual(value('new', 'codex'), value('new', 'claude'));
  assert.notEqual(value('new', 'claude'), value('new', 'gemini,claude'));
  assert.equal(value('existing', 'claude'), value('existing', 'codex'));
  assert.equal(value('existing', 'gemini,claude'), value('existing', 'gemini'));
  assert.equal(expectedLegacyExclude(matrixCases(1)[0], '9.9.9'), null);
});

test('oráculo recusa toda a amostra se o gerador divergir dos 500 pares comprovados', () => {
  const original = matrixCases(25);
  assert.equal(verifiedLegacyPairs(original).size, 500);
  assert.equal(verifiedLegacyPairs([...original].reverse()).size, 500);
  assert.equal(verifiedLegacyPairs(original.slice(1)).size, 0);
  const replacedPair = original.map(item => ({ ...item }));
  const oldPair = `${replacedPair[0].fixture}|${replacedPair[0].selection}`;
  for (const item of replacedPair) if (`${item.fixture}|${item.selection}` === oldPair) item.selection = 'cliente-nao-comprovado';
  assert.equal(verifiedLegacyPairs(replacedPair).size, 0);
  const duplicatedKind = original.map(item => ({ ...item })); duplicatedKind[1].kind = duplicatedKind[0].kind;
  assert.equal(verifiedLegacyPairs(duplicatedKind).size, 0);
  const extra = [...original, { ...original[0], selection: 'cliente-nao-comprovado' }];
  assert.equal(verifiedLegacyPairs(extra).size, 0);
});

test('troca kimi/mimo no gerador não autoriza pares novos nem os antigos', async t => {
  const root = temp(t), lib = join(root, '.pbai4devs/scripts/lib'), changedRunner = join(root, 'tests/project-matrix.mjs');
  mkdirSync(lib, { recursive: true }); mkdirSync(dirname(changedRunner), { recursive: true });
  const sourceLib = resolve(dirname(runner), '../.pbai4devs/scripts/lib');
  for (const name of runnerLibraries) copyFileSync(join(sourceLib, name), join(lib, name));
  const original = readFileSync(runner, 'utf8');
  const changed = original.replace("'copilot', 'cursor', 'kimi',", "'copilot', 'cursor', 'mimo',").replace("'kimi-legacy', 'mimo', 'claude,codex'", "'kimi-legacy', 'kimi', 'claude,codex'");
  assert.notEqual(changed, original); writeFileSync(changedRunner, changed);
  const mutated = await import(pathToFileURL(changedRunner).href);
  const expected = new Set(matrixCases(25).map(item => `${item.fixture}|${item.selection}`));
  const rogue = mutated.matrixCases(25).find(item => !expected.has(`${item.fixture}|${item.selection}`));
  assert.ok(rogue, 'a troca deve produzir ao menos um par não observado');
  assert.equal(mutated.verifiedLegacyPairs(mutated.matrixCases(25)).size, 0);
  assert.equal(mutated.expectedLegacyExclude(rogue, '0.0.21'), null);
  assert.equal(mutated.expectedLegacyExclude({ fixture: 0, selection: 'codex', kind: 'new' }, '0.0.21'), null);
});

test('valida limites e repetição de rodadas antes de criar saída', () => {
  const required = ['--package', '/pacote', '--version', '9.9.9'];
  assert.equal(options([...required]).rounds, 1);
  assert.equal(options([...required, '--rounds', '25']).rounds, 25);
  for (const value of ['0', '101', '1.0', '-1', '01', '99999999999999999']) {
    assert.throws(() => options([...required, '--rounds', value]), /--rounds/);
  }
  assert.throws(() => options([...required, '--rounds', '2', '--rounds', '3']), /--rounds/);
  assert.equal(options([...required]).startRound, 1);
  assert.equal(options([...required, '--start-round', '99', '--rounds', '2']).startRound, 99);
  for (const value of ['0', '101', '1.0', '-1', '01', '99999999999999999']) assert.throws(() => options([...required, '--start-round', value]), /--start-round/);
  assert.throws(() => options([...required, '--start-round', '2', '--start-round', '3']), /--start-round/);
  assert.throws(() => options([...required, '--rounds', '2', '--start-round', '100']), /--start-round/);
  assert.equal(options([...required, '--diagnose-exclude']).diagnoseExclude, true);
  assert.equal(options([...required]).diagnoseExclude, undefined);
  assert.throws(() => options([...required, '--diagnose-exclude', '--diagnose-exclude']), /repetida/);
});

test('diagnóstico continua somente exclude aditivo e mantém falha original e baseline', { skip: runtimeSkip, timeout: 20000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const script = `import {appendFileSync} from 'node:fs';import {join} from 'node:path';const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init'){${fakeExcludeAppend}}console.log(JSON.stringify({ok:true,version:'0.0.21'}));`;
  const pkg = fakeLegacyPackage(root, script), cli = join(pkg, 'bin/agentdevkit.mjs');
  const item = { number: 1, kind: 'existing', selection: 'codex' };
  const standard = await projectCase(item, results, cli, '0.0.21', controlled(root));
  assert.equal(standard.status, 'failed'); assert.equal(standard.operations.at(-1).label, 'init');
  assert.equal(standard.issue, 'init não preservou os arquivos ou não pôde ser verificado.');
  assert.equal(standard.diagnostic, undefined);
  const diagnostic = await projectCase({ ...item, number: 2 }, results, cli, '0.0.21', controlled(root), command, { diagnoseExclude: true });
  assert.equal(diagnostic.status, 'failed'); assert.equal(diagnostic.passed, false);
  assert.equal(diagnostic.diagnostic.triggered, true); assert.match(diagnostic.diagnostic.initialIssue, /init não preservou/);
  assert.deepEqual(diagnostic.operations.slice(-5).map(op => op.label), ['init', 'update', 'update-force', 'doctor', 'sync-check']);
  assert.ok(diagnostic.operations.slice(-5).every(op => op.preservation.diagnosticExcludeAdditive === true));
  assert.equal(diagnostic.preservation.unchanged, false);
  assert.notEqual(diagnostic.preservation.baseline.unchanged['.git/info/exclude'].sha256, diagnostic.preservation.after['.git/info/exclude'].sha256);
  assert.equal(diagnostic.preservation.observedDocumentsPreserved, true);
});

test('diagnóstico recusa exclusão não aditiva e qualquer alteração humana adicional', { skip: runtimeSkip, timeout: 20000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const variants = [
    `writeFileSync(join(target,'.git/info/exclude'),'substituido\\n')`,
    `${fakeExcludeAppend};appendFileSync(join(target,'HUMAN-STAGED.txt'),'mudou')`,
    `${fakeExcludeAppend};appendFileSync(join(target,'.git/index'),'mudou')`,
    `${fakeExcludeAppend};writeFileSync(join(target,'.git/refs/heads/extra'),'0000000000000000000000000000000000000000\\n')`,
    `appendFileSync(join(target,'.git/info/exclude'),'# BEGIN AGENTDEVKIT LOCAL 0123456789abcdef\\n/.claude/\\n# END AGENTDEVKIT LOCAL 0123456789abcdef\\n')`,
    `${fakeExcludeAppend};appendFileSync(join(target,'.git/info/exclude'),'sufixo arbitrario\\n')`,
    `${fakeExcludeAppend};writeFileSync(join(target,'.git/info/exclude'),(await import('node:fs')).readFileSync(join(target,'.git/info/exclude'),'utf8').replace('/.claude/','/*'))`,
    `${fakeExcludeAppend};writeFileSync(join(target,'.git/info/exclude'),(await import('node:fs')).readFileSync(join(target,'.git/info/exclude'),'utf8').replace('/.claude/','/regra-humana/\\n/.claude/'))`,
    `${fakeExcludeAppend};writeFileSync(join(target,'.git/info/exclude'),(await import('node:fs')).readFileSync(join(target,'.git/info/exclude'),'utf8').replace('/.claude/','# comentário humano\\n/.claude/'))`,
    `{${fakeExcludeAppend}};{${fakeExcludeAppend}}`,
  ];
  for (const [i, mutation] of variants.entries()) {
    const dir = join(root, `pkg-${i}`); mkdirSync(dir);
    const pkg = fakeLegacyPackage(dir, `import {appendFileSync,writeFileSync} from 'node:fs';import {join} from 'node:path';const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init'){${mutation}}console.log(JSON.stringify({ok:true,version:'0.0.21'}));`);
    const result = await projectCase({ number: i + 1, kind: 'existing', selection: 'codex' }, results, join(pkg, 'bin/agentdevkit.mjs'), '0.0.21', controlled(root), command, { diagnoseExclude: true });
    assert.equal(result.status, 'failed'); assert.equal(result.diagnostic.triggered, false);
    if ([1, 2, 3].includes(i)) assert.equal(result.diagnostic.stopReason, 'init não preservou os arquivos ou não pôde ser verificado.');
    assert.equal(result.operations.at(-1).label, 'init'); assert.ok(!result.operations.some(op => op.label === 'update'));
  }
});

test('diagnóstico recusa alteração posterior do corpo mesmo com marcadores íntegros', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const pkg = fakeLegacyPackage(root, `import {appendFileSync,readFileSync,writeFileSync} from 'node:fs';import {join} from 'node:path';const target=process.argv[process.argv.indexOf('--target')+1],f=join(target,'.git/info/exclude');if(process.argv[2]==='init'){${fakeExcludeAppend}}if(process.argv[2]==='update')writeFileSync(f,readFileSync(f,'utf8').replace('/.claude/','/*'));console.log(JSON.stringify({ok:true,version:'0.0.21'}));`);
  const result = await projectCase({ number: 1, kind: 'new', selection: 'codex' }, results, join(pkg, 'bin/agentdevkit.mjs'), '0.0.21', controlled(root), command, { diagnoseExclude: true });
  assert.equal(result.status, 'failed'); assert.equal(result.diagnostic.triggered, true);
  assert.match(result.diagnostic.initialIssue, /init não preservou/); assert.match(result.diagnostic.stopReason, /Exceção legada desconhecida ou alterada/);
  assert.equal(result.operations.at(-1).label, 'update'); assert.ok(!result.operations.some(op => op.label === 'doctor'));
});

test('diagnóstico recusa bloco conhecido em versão ou fixture não comprovada', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const pkg = fakePackage(root, `import {appendFileSync} from 'node:fs';import {join} from 'node:path';const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init'){${fakeExcludeAppend}}console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const result = await projectCase({ number: 1, kind: 'new', selection: 'codex' }, results, join(pkg, 'bin/agentdevkit.mjs'), '9.9.9', controlled(root), command, { diagnoseExclude: true });
  assert.equal(result.status, 'failed'); assert.equal(result.diagnostic.triggered, false); assert.equal(result.operations.at(-1).label, 'init');
  const legacyDir = join(root, 'legacy'); mkdirSync(legacyDir);
  const legacy = fakeLegacyPackage(legacyDir, `import {appendFileSync} from 'node:fs';import {join} from 'node:path';const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init'){${fakeExcludeAppend}}console.log(JSON.stringify({ok:true,version:'0.0.21'}));`);
  const known = await projectCase({ number: 2, kind: 'new', selection: 'codex', fixture: 1 }, results, join(legacy, 'bin/agentdevkit.mjs'), '0.0.21', controlled(root), command, { diagnoseExclude: true });
  assert.equal(known.status, 'failed'); assert.equal(known.diagnostic.triggered, true); assert.equal(known.operations.at(-1).label, 'sync-check');
  const laterSelection = matrixCases(1, 29)[0].selection, outsideSelection = matrixCases(1, 29)[0].selection;
  for (const item of [{ number: 3, kind: 'new', selection: laterSelection, fixture: 1 }, { number: 4, kind: 'new', selection: outsideSelection, fixture: 0 }]) {
    const checked = await projectCase(item, results, join(legacy, 'bin/agentdevkit.mjs'), '0.0.21', controlled(root), command, { diagnoseExclude: true });
    assert.equal(checked.status, 'failed'); assert.equal(checked.diagnostic.triggered, false);
    assert.equal(checked.diagnostic.excludeRecognition, 'not-verified'); assert.equal(checked.operations.at(-1).label, 'init');
  }
});

test('diagnóstico interrompe atualização que altera conteúdo humano e preserva falha de init', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const pkg = fakeLegacyPackage(root, `import {appendFileSync} from 'node:fs';import {join} from 'node:path';const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init'){${fakeExcludeAppend}}if(process.argv[2]==='update')appendFileSync(join(target,'HUMAN-STAGED.txt'),'mudou');console.log(JSON.stringify({ok:true,version:'0.0.21'}));`);
  const result = await projectCase({ number: 1, kind: 'existing', selection: 'codex' }, results, join(pkg, 'bin/agentdevkit.mjs'), '0.0.21', controlled(root), command, { diagnoseExclude: true });
  assert.equal(result.status, 'failed'); assert.equal(result.diagnostic.triggered, true);
  assert.match(result.diagnostic.initialIssue, /init não preservou/); assert.match(result.diagnostic.stopReason, /update não preservou/);
  assert.equal(result.operations.at(-1).label, 'update'); assert.ok(!result.operations.some(op => op.label === 'doctor'));
});

test('diagnóstico não prossegue após timeout; mapeamento ausente permanece não verificado', { skip: runtimeSkip, timeout: 15000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const script = `import {appendFileSync} from 'node:fs';import {join} from 'node:path';const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init'){${fakeExcludeAppend}}console.log(JSON.stringify({ok:true,version:'0.0.21'}));`;
  const pkg = fakeLegacyPackage(root, script), cli = join(pkg, 'bin/agentdevkit.mjs');
  const timed = async (file, args, cwd, env) => {
    if (file === process.execPath && args[1] === 'update') return { status: null, signal: 'SIGKILL', error: null, timedOut: true, exceeded: false, stdout: '', stderr: '' };
    return command(file, args, cwd, env);
  };
  const result = await projectCase({ number: 1, kind: 'new', selection: 'codex' }, results, cli, '0.0.21', controlled(root), timed, { diagnoseExclude: true });
  assert.equal(result.status, 'failed'); assert.equal(result.diagnostic.triggered, true);
  assert.equal(result.operations.at(-1).label, 'update'); assert.equal(result.operations.at(-1).timedOut, true);
  assert.equal(result.preservation.status, 'not-verified'); assert.equal(result.preservation.unchanged, null);
  const unverifiedRoot = join(root, 'unverified'); mkdirSync(unverifiedRoot);
  const unsupported = fakeLegacyPackage(unverifiedRoot, script, true, 'not-verified');
  const unverified = await projectCase({ number: 2, kind: 'new', selection: 'codex' }, results, join(unsupported, 'bin/agentdevkit.mjs'), '0.0.21', controlled(root), command, { diagnoseExclude: true });
  assert.equal(unverified.status, 'failed'); assert.equal(unverified.operations.at(-1).label, 'sync-check');
  assert.equal(unverified.diagnostic.continuedWithUnverifiedMapping, true);
  assert.equal(unverified.coverage.status, 'not-verified');
  assert.ok(unverified.coverage.notVerified.every(reason => /função de destino não disponível$/.test(reason)));
  assert.equal(unverified.preservation.unchanged, false);
});

test('diagnóstico rejeita exclude substituído por link simbólico', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), target = join(root, 'sentinela'), probe = join(root, 'probe'); put(target, 'não alterar\n');
  try { symlinkSync(target, probe, 'file'); unlinkSync(probe); }
  catch (error) { if (process.platform === 'win32' && ['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) { t.skip('Sem permissão para criar symlink no Windows.'); return; } throw error; }
  const results = join(root, 'results'); mkdirSync(results);
  const pkg = fakeLegacyPackage(root, `import {unlinkSync,symlinkSync} from 'node:fs';import {join} from 'node:path';const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init'){const f=join(target,'.git/info/exclude');unlinkSync(f);symlinkSync(${JSON.stringify(target)},f,'file')}console.log(JSON.stringify({ok:true,version:'0.0.21'}));`);
  const result = await projectCase({ number: 1, kind: 'new', selection: 'codex' }, results, join(pkg, 'bin/agentdevkit.mjs'), '0.0.21', controlled(root), command, { diagnoseExclude: true });
  assert.equal(result.status, 'failed'); assert.equal(result.diagnostic.triggered, false); assert.equal(result.operations.at(-1).label, 'init');
  assert.match(result.preservation.after['.git/info/exclude'].error, /Link simbólico/); assert.equal(readFileSync(target, 'utf8'), 'não alterar\n');
});

test('CLI de diagnóstico preserva status de falha no resumo da rodada', { skip: runtimeSkip, timeout: 120000 }, t => {
  const root = temp(t), output = join(root, 'output'); mkdirSync(output);
  const pkg = fakeLegacyPackage(root, `import {appendFileSync} from 'node:fs';import {join} from 'node:path';const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init'){${fakeExcludeAppend}}console.log(JSON.stringify({ok:true,version:'0.0.21'}));`);
  const run = spawnSync(process.execPath, [runner, '--package', pkg, '--version', '0.0.21', '--output', output, '--jobs', '4', '--diagnose-exclude'], { encoding: 'utf8', timeout: 110000 });
  assert.equal(run.status, 1, `${run.error?.message || ''}\n${run.stderr}`);
  const summary = JSON.parse(run.stdout), report = JSON.parse(readFileSync(summary.report));
  assert.equal(report.diagnosticExclude, true); assert.equal(report.projects, 40);
  assert.equal(summary.diagnosticExclude, true);
  assert.equal(summary.status, 'failed'); assert.equal(report.status, 'failed');
  assert.equal(report.passed, 0); assert.equal(report.failed, 40);
  assert.ok(report.results.every(item => item.status === 'failed'));
  assert.ok(report.results.some(item => item.diagnostic.triggered && item.diagnostic.initialIssue));
});

test('executa duas rodadas completas com relatórios e caminhos distintos', { skip: runtimeSkip, timeout: 120000 }, t => {
  const root = temp(t), output = join(root, 'output'); mkdirSync(output);
  const pkg = fakePackage(root, `console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const run = spawnSync(process.execPath, [runner, '--package', pkg, '--version', '9.9.9', '--output', output, '--jobs', '4', '--rounds', '2', '--start-round', '2'], { encoding: 'utf8', timeout: 110000 });
  assert.equal(run.status, 0, `${run.error?.message || ''}\n${run.stderr}`);
  const summary = JSON.parse(run.stdout), report = JSON.parse(readFileSync(summary.report));
  assert.equal(summary.diagnosticExclude, false);
  assert.equal(report.startRound, 2); assert.equal(report.rounds, 2); assert.equal(report.projects, 80); assert.equal(report.passed, 80);
  assert.equal(summary.status, 'passed'); assert.equal(report.status, 'passed');
  assert.deepEqual(report.results.map(item => item.number), Array.from({ length: 80 }, (_, i) => i + 41));
  assert.equal(new Set(report.results.map(item => item.root)).size, 80);
  assert.equal(new Set(report.results.map(item => item.report)).size, 80);
  for (const item of report.results) {
    assert.equal(existsSync(item.report), true);
    assert.deepEqual(item.operations.slice(-5).map(op => op.label), ['init', 'update', 'update-force', 'doctor', 'sync-check']);
  }
});

test('rejeita índices forjados e ausência de apontamentos para o cliente', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  for (const [i, fault] of ['index', 'dest'].entries()) {
    const folder = join(root, fault); mkdirSync(folder);
    const pkg = fakePackage(folder, `console.log(JSON.stringify({ok:true,version:'9.9.9'}));`, true, fault);
    const result = await projectCase({ number: i + 1, kind: 'new', selection: 'codex' }, results, join(pkg, 'bin/agentdevkit.mjs'), '9.9.9', controlled(root));
    assert.equal(result.passed, false, fault);
    assert.match(result.issue, fault === 'index' ? /Índice inválido/ : /instalação não verificada/);
  }
});

test('formato de destino sem mapeamento fica explicitamente não verificado', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const pkg = fakePackage(root, `console.log(JSON.stringify({ok:true,version:'9.9.9'}));`, true, 'not-verified');
  const result = await projectCase({ number: 1, kind: 'new', selection: 'codex' }, results, join(pkg, 'bin/agentdevkit.mjs'), '9.9.9', controlled(root));
  assert.equal(result.status, 'not-verified'); assert.equal(result.passed, false);
  assert.equal(result.issue, null); assert.equal(result.coverage.status, 'not-verified');
  assert.ok(result.coverage.notVerified.some(reason => reason.includes('agents')));
  assert.equal(result.operations.at(-1).label, 'sync-check');
});

for (const [client, extension] of [['cursor', '.mdc'], ['copilot', '.instructions.md']]) test(`apontamento ${client} não certifica escopo sem validar metadados`, { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const pkg = fakePackage(root, `console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const mapper = join(pkg, '.pbai4devs/scripts/lib/resource-path.mjs');
  writeFileSync(mapper, `export function clientResourcePath(source,kind){const p=source.slice('.pbai4devs/'.length);return kind==='rules'?p.replace(/\\.txt$/,${JSON.stringify(extension)}):p}\n`);
  const cli = join(pkg, 'bin/agentdevkit.mjs'), body = readFileSync(cli, 'utf8');
  const before = "const dest='.fake-'+id+'/'+e.path.slice('.pbai4devs/'.length);";
  const after = `let dest='.fake-'+id+'/'+e.path.slice('.pbai4devs/'.length);if(id===${JSON.stringify(client)}&&e.path.startsWith('.pbai4devs/rules/'))dest=dest.replace(/\\.txt$/,${JSON.stringify(extension)});`;
  assert.ok(body.includes(before)); writeFileSync(cli, body.replace(before, after));
  const result = await projectCase({ number: 1, kind: 'new', selection: client }, results, cli, '9.9.9', controlled(root));
  assert.equal(result.status, 'not-verified', result.issue);
  assert.ok(result.coverage.notVerified.some(reason => reason.includes('metadados de escopo não verificados')));
  assert.equal(result.operations.at(-1).label, 'sync-check');
});

test('matriz recusa escopo gerado divergente mesmo com link e hash válidos', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const pkg = fakePackage(root, `console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const catalogFile = join(pkg, '.pbai4devs/scripts/lib/catalog.mjs'), catalogSource = readFileSync(catalogFile, 'utf8');
  const match = catalogSource.match(/return \{catalog:(.+)\}\}/); assert.ok(match);
  const catalog = JSON.parse(match[1]); catalog.rules[0].trigger = 'always_on'; catalog.rules[0].description = 'Teste';
  writeFileSync(catalogFile, catalogSource.replace(match[1], JSON.stringify(catalog)));
  writeFileSync(join(pkg, '.pbai4devs/scripts/lib/resource-path.mjs'), "export function clientResourcePath(source,kind){const p=source.slice('.pbai4devs/'.length);return kind==='rules'?p.replace(/\\.txt$/,'.instructions.md'):p}\n");
  const cli = join(pkg, 'bin/agentdevkit.mjs'), body = readFileSync(cli, 'utf8');
  const before = "const dest='.fake-'+id+'/'+e.path.slice('.pbai4devs/'.length);";
  const after = "let dest='.fake-'+id+'/'+e.path.slice('.pbai4devs/'.length);if(id==='copilot'&&e.path.startsWith('.pbai4devs/rules/'))dest=dest.replace(/\\.txt$/,'.instructions.md');";
  assert.ok(body.includes(before) && body.includes(match[1]));
  writeFileSync(cli, body.replace(before, after).replace(match[1], JSON.stringify(catalog)));
  const result = await projectCase({ number: 1, kind: 'new', selection: 'copilot' }, results, cli, '9.9.9', controlled(root));
  assert.equal(result.status, 'failed');
  assert.match(result.issue, /Metadados de escopo divergentes/);
  assert.ok(!result.operations.some(operation => operation.label === 'update'));
});

test('CLI que só responde sucesso não comprova instalação', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const pkg = fakePackage(root, `console.log(JSON.stringify({ok:true,version:'9.9.9'}));`, false);
  const result = await projectCase({ number: 1, kind: 'new', selection: 'codex' }, results, join(pkg, 'bin/agentdevkit.mjs'), '9.9.9', controlled(root));
  assert.equal(result.passed, false); assert.match(result.issue, /instalação não verificada/);
  assert.ok(!result.operations.some(op => op.label === 'update'));
});

test('aceita somente bloco gerenciado esperado na skill humana', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const pkg = fakePackage(root, `import {appendFileSync} from 'node:fs';import {join} from 'node:path';const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')appendFileSync(join(target,'.agents/skills/projeto/criar-skill/SKILL.md'),'\\n<!-- BEGIN AGENTDEVKIT -->\\nLeia e siga [origem](../../../../.pbai4devs/skills/projeto/criar-skill/SKILL.md).\\n<!-- END AGENTDEVKIT -->\\n');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const result = await projectCase({ number: 1, round: 4, kind: 'existing', selection: 'codex', fixture: 3 }, results, join(pkg, 'bin/agentdevkit.mjs'), '9.9.9', controlled(root));
  assert.equal(result.passed, true, result.issue);
  assert.equal(result.preservation.documents['.agents/skills/projeto/criar-skill/SKILL.md'].allowedContent, true);
});

test('detecta origem alterada em atualização e plano pendente no sync', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const pkg = fakePackage(root, `import {appendFileSync} from 'node:fs';import {join} from 'node:path';const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='update')appendFileSync(join(target,'.pbai4devs/skills/synthetic.txt'),'alteração');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const corrupted = await projectCase({ number: 1, kind: 'new', selection: 'codex' }, results, join(pkg, 'bin/agentdevkit.mjs'), '9.9.9', controlled(root));
  assert.equal(corrupted.passed, false); assert.match(corrupted.issue, /Origem instalada divergente/);
  assert.ok(!corrupted.operations.some(op => op.label === 'doctor'));
  const another = join(root, 'second'); mkdirSync(another);
  const pkg2 = fakePackage(another, `console.log(JSON.stringify({ok:true,version:'9.9.9',...(process.argv[2]==='sync'?{plan:[{action:'create'}]}:{})}));`);
  const pending = await projectCase({ number: 2, kind: 'new', selection: 'codex' }, results, join(pkg2, 'bin/agentdevkit.mjs'), '9.9.9', controlled(root));
  assert.equal(pending.passed, false); assert.match(pending.issue, /sync-check não confirmou/);
});

test('rejeita acréscimo arbitrário mesmo com prefixo humano intacto', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const pkg = fakePackage(root, `import {appendFileSync} from 'node:fs';import {join} from 'node:path';const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')appendFileSync(join(target,'.agents/skills/projeto/criar-skill/SKILL.md'),'texto invasivo\\n');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const result = await projectCase({ number: 1, round: 4, kind: 'existing', selection: 'codex', fixture: 3 }, results, join(pkg, 'bin/agentdevkit.mjs'), '9.9.9', controlled(root));
  const doc = result.preservation.documents['.agents/skills/projeto/criar-skill/SKILL.md'];
  assert.equal(result.passed, false); assert.equal(doc.originalPrefixPreserved, true); assert.equal(doc.allowedContent, false);
  assert.ok(!result.operations.some(op => op.label === 'update'));
});

test('variantes registram arquivos humanos, configuração nativa e colisão', { skip: runtimeSkip, timeout: 30000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const pkg = fakePackage(root, `console.log(JSON.stringify({ok:true,version:'9.9.9'}));`), cli = join(pkg, 'bin/agentdevkit.mjs');
  const paths = ['.cursor/rules/equipe.mdc', '.gemini/commands/equipe.toml', '.agents/skills/projeto/criar-skill/SKILL.md'];
  for (let fixture = 1; fixture <= 3; fixture++) {
    const item = { number: fixture, round: fixture + 1, kind: 'existing', selection: 'codex,claude', fixture };
    const result = await projectCase(item, results, cli, '9.9.9', controlled(root));
    assert.equal(result.passed, true, result.issue);
    assert.deepEqual(result.operations.slice(-5).map(op => op.label), ['init', 'update', 'update-force', 'doctor', 'sync-check']);
    const native = paths[fixture - 1], human = `human/round-${item.round}/case-${item.number}.txt`;
    assert.ok((fixture === 3 ? result.preservation.baseline.documents : result.preservation.baseline.unchanged)[native]);
    assert.ok(result.preservation.baseline.unchanged[human]);
    assert.equal(result.preservation.unchanged, true);
    assert.equal(result.report, join(dirname(result.root), 'RESULT.json'));
    assert.equal(existsSync(result.report), true);
    const status = spawnSync('git', ['status', '--porcelain', '--', human], { cwd: result.root, encoding: 'utf8', env: controlled(root) });
    assert.equal(status.status, 0);
    assert.match(status.stdout, fixture === 2 ? /^(?: {2}|$)/ : /^ M /);
  }
});

test('projeto novo com fixture 3 inclui colisão humana ainda não rastreada', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const pkg = fakePackage(root, `console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const result = await projectCase({ number: 1, round: 4, kind: 'new', selection: 'codex', fixture: 3 }, results, join(pkg, 'bin/agentdevkit.mjs'), '9.9.9', controlled(root));
  assert.equal(result.passed, true, result.issue);
  const native = '.agents/skills/projeto/criar-skill/SKILL.md';
  assert.ok(result.preservation.baseline.documents[native]);
  const status = spawnSync('git', ['status', '--porcelain', '--', native], { cwd: result.root, encoding: 'utf8', env: controlled(root) });
  assert.equal(status.status, 0); assert.match(status.stdout, /^\?\? /);
});

test('detecta alteração da colisão humana e interrompe as etapas seguintes', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), cli = join(root, 'collision.cjs'), results = join(root, 'results'); mkdirSync(results);
  put(cli, `const {writeFileSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')writeFileSync(join(target,'.agents/skills/projeto/criar-skill/SKILL.md'),'substituído');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const result = await projectCase({ number: 1, round: 4, kind: 'existing', selection: 'codex', fixture: 3 }, results, cli, '9.9.9', controlled(root));
  assert.equal(result.passed, false);
  assert.equal(result.preservation.documentsPreserved, false);
  assert.equal(result.preservation.documents['.agents/skills/projeto/criar-skill/SKILL.md'].originalPrefixPreserved, false);
  assert.ok(!result.operations.some(op => op.label === 'update'));
});

test('aceita o alias /tmp do macOS e recusa link humano', { skip: process.platform !== 'darwin' && 'O alias físico /tmp → /private/tmp é específico do macOS.' }, t => {
  const root = temp(t), link = join(root, 'link-humano'); symlinkSync(realpathSync(tmpdir()), link, 'dir');
  assert.equal(outputParent('/tmp'), realpathSync('/tmp'));
  assert.throws(() => outputParent(link), /sem link simbólico/);
  const child = join(root, 'diretorio'); mkdirSync(child); const alias = join(root, 'alias'); symlinkSync(child, alias, 'dir');
  mkdirSync(join(child, 'interno'));
  assert.throws(() => outputParent(join(alias, 'interno')), /sem link simbólico/);
});

test('recusa saída em repositório mesmo quando padrão fictício seria ignorado', { skip: runtimeSkip }, t => {
  const root = temp(t), pkg = fakePackage(root, 'process.exitCode=99;');
  const repo = join(root, 'repo'); mkdirSync(repo);
  const init = spawnSync('git', ['init', '--quiet', repo], { encoding: 'utf8', env: controlled(root), timeout: 30000 });
  assert.equal(init.status, 0, init.stderr);
  put(join(repo, '.gitignore'), '*\n!adk-project-matrix-*/\n');
  put(join(repo, 'sentinela'), 'preservado\n');
  const before = readdirSync(repo).sort();
  const result = spawnSync(process.execPath, [runner, '--package', pkg, '--version', '9.9.9', '--output', repo], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 1, result.stderr); assert.match(result.stderr, /fora de repositórios Git/);
  assert.deepEqual(readdirSync(repo).sort(), before); assert.equal(readFileSync(join(repo, 'sentinela'), 'utf8'), 'preservado\n');
});

test('detecta alteração de modo nos três documentos humanos mesmo com prefixos intactos', { skip: runtimeSkip, timeout: 180000 }, t => {
  const root = temp(t);
  const pkg = fakePackage(root, `import {chmodSync,existsSync,statSync} from 'node:fs';\nimport {join} from 'node:path';\nconst target=process.argv[process.argv.indexOf('--target')+1];\nif(process.argv[2]==='init')for(const p of ['AGENTS.md','CLAUDE.md','.claude/skills/criar-skill/SKILL.md']){const f=join(target,p);if(existsSync(f))chmodSync(f,(statSync(f).mode&0o777)^0o200)}\nconsole.log(JSON.stringify({ok:true,version:'9.9.9'}));\n`);
  const output = join(root, 'output'); mkdirSync(output);
  const result = spawnSync(process.execPath, [runner, '--package', pkg, '--version', '9.9.9', '--output', output, '--jobs', '4'], { encoding: 'utf8', timeout: 170000, maxBuffer: 1024 * 1024 });
  assert.equal(result.status, 1, `${result.error?.message || ''}\n${result.stderr}\n${result.stdout}`);
  const summary = JSON.parse(result.stdout), report = JSON.parse(readFileSync(summary.report));
  assert.equal(report.projects, 40); assert.equal(report.passed, 20); assert.equal(report.failed, 20);
  for (const item of report.results.filter(item => item.kind === 'existing')) {
    for (const path of ['AGENTS.md', 'CLAUDE.md', '.claude/skills/criar-skill/SKILL.md']) {
      assert.equal(item.preservation.documents[path].originalPrefixPreserved, true, `${item.root}: ${path}`);
      assert.equal(item.preservation.documents[path].modePreserved, false, `${item.root}: ${path}`);
      // Arquivos somente leitura podem impedir a limpeza em Windows.
      chmodSync(join(item.root, path), 0o600);
    }
    assert.equal(item.preservation.documentsPreserved, false);
  }
  assert.equal(report.modeMask, process.platform === 'win32' ? '0o200' : '0o777');
});

test('interrompe após alteração indevida, antes que outra etapa a reverta', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), cli = join(root, 'transient.cjs'), results = join(root, 'results'); mkdirSync(results);
  put(cli, `const {writeFileSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')writeFileSync(join(target,'.gitignore'),'adulterado\\n');if(process.argv[2]==='update')writeFileSync(join(target,'.gitignore'),'# regra humana\\nprivate-data/\\n');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const result = await projectCase({ number: 1, kind: 'existing', selection: 'codex' }, results, cli, '9.9.9', controlled(root));
  assert.equal(result.passed, false); assert.equal(result.preservation.unchanged, false);
  assert.deepEqual(result.operations.map(operation => operation.label), ['git-init', 'git-add-base', 'git-commit-base', 'git-add', 'init']);
  assert.equal(result.operations.at(-1).preservation.unchanged, false);
  assert.ok(existsSync(join(results, '01-existing', 'init.snapshot.json')));
  assert.equal(readFileSync(join(result.root, '.gitignore'), 'utf8'), 'adulterado\n');
});

test('recusa troca de pasta humana por link simbólico mesmo que conteúdo pareça igual', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), probeTarget = join(root, 'probe-target'), probeLink = join(root, 'probe-link'); mkdirSync(probeTarget);
  try { symlinkSync(probeTarget, probeLink, 'dir'); unlinkSync(probeLink); }
  catch (error) { if (process.platform === 'win32' && ['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) { t.skip('Sem permissão para criar symlink no Windows.'); return; } throw error; }
  const cli = join(root, 'replace.cjs'), results = join(root, 'results'); mkdirSync(results);
  put(cli, `const {renameSync,symlinkSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init'){const a=join(target,'.claude');const b=join(target,'.claude-movida');renameSync(a,b);symlinkSync(b,a,'dir')}console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const result = await projectCase({ number: 1, kind: 'existing', selection: 'codex' }, results, cli, '9.9.9', controlled(root));
  assert.equal(result.passed, false); assert.equal(result.preservation.unchanged, false);
  assert.match(result.preservation.after['.claude/settings.json'].error, /Link simbólico/);
  assert.equal(result.preservation.documents['.claude/skills/criar-skill/SKILL.md'].originalPrefixPreserved, false);
  assert.ok(!result.operations.some(operation => operation.label === 'update'));
});

test('detecta qualquer mudança no Git config e no exclude local', { skip: runtimeSkip, timeout: 15000 }, async t => {
  const root = temp(t), results = join(root, 'results'); mkdirSync(results);
  const config = join(root, 'config.cjs');
  put(config, `const {appendFileSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')appendFileSync(join(target,'.git/config'),'\\n[fixture]\\nflag=true\\n');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const changedConfig = await projectCase({ number: 1, kind: 'existing', selection: 'codex' }, results, config, '9.9.9', controlled(root));
  assert.equal(changedConfig.passed, false); assert.equal(changedConfig.preservation.unchanged, false);
  assert.notEqual(changedConfig.preservation.after['.git/config'].sha256, changedConfig.preservation.baseline.unchanged['.git/config'].sha256);
  const exclude = join(root, 'exclude.cjs');
  put(exclude, `const {appendFileSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')appendFileSync(join(target,'.git/info/exclude'),'# bloco gerenciado\\nfixture-generated/\\n');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const additive = await projectCase({ number: 2, kind: 'existing', selection: 'codex' }, results, exclude, '9.9.9', controlled(root));
  assert.equal(additive.passed, false); assert.equal(additive.preservation.unchanged, false);
  assert.notEqual(additive.preservation.after['.git/info/exclude'].sha256, additive.preservation.baseline.unchanged['.git/info/exclude'].sha256);
  assert.ok(!additive.operations.some(operation => operation.label === 'update'));
  const invalid = join(root, 'exclude-invalid.cjs');
  put(invalid, `const {writeFileSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')writeFileSync(join(target,'.git/info/exclude'),'# perdeu regra humana\\n');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const deletedRule = await projectCase({ number: 3, kind: 'existing', selection: 'codex' }, results, invalid, '9.9.9', controlled(root));
  assert.equal(deletedRule.passed, false); assert.equal(deletedRule.preservation.unchanged, false);
  assert.notEqual(deletedRule.preservation.after['.git/info/exclude'].sha256, deletedRule.preservation.baseline.unchanged['.git/info/exclude'].sha256);
});

test('detecta mudança da ref apontada por HEAD mesmo sem editar .git/HEAD', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'), cli = join(root, 'head-ref.cjs'); mkdirSync(results);
  put(cli, `const {readFileSync,writeFileSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init'){const h=readFileSync(join(target,'.git/HEAD'),'utf8').trim().slice(5);writeFileSync(join(target,'.git',h),'0000000000000000000000000000000000000000\\n')}console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const result = await projectCase({ number: 1, kind: 'existing', selection: 'codex' }, results, cli, '9.9.9', controlled(root));
  assert.equal(result.passed, false); assert.equal(result.preservation.observedUnchanged, true);
  assert.equal(result.preservation.observedOptionalUnchanged, false); assert.equal(result.preservation.unchanged, false);
  assert.ok(!result.operations.some(operation => operation.label === 'update'));
});

test('detecta criação de outra ref e mudança em packed-refs', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), results = join(root, 'results'), cli = join(root, 'other-ref.cjs'); mkdirSync(results);
  put(cli, `const {writeFileSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')writeFileSync(join(target,'.git/refs/heads/extra'),'0000000000000000000000000000000000000000\\n');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const added = await projectCase({ number: 1, kind: 'existing', selection: 'codex' }, results, cli, '9.9.9', controlled(root));
  assert.equal(added.passed, false); assert.equal(added.preservation.observedRefsUnchanged, false);
  assert.equal(added.preservation.observedOptionalUnchanged, true);
  const packed = join(root, 'packed.cjs');
  put(packed, `const {writeFileSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')writeFileSync(join(target,'.git/packed-refs'),'# synthetic\\n');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const changedPacked = await projectCase({ number: 2, kind: 'new', selection: 'codex' }, results, packed, '9.9.9', controlled(root));
  assert.equal(changedPacked.passed, false); assert.equal(changedPacked.preservation.observedOptionalUnchanged, false);
});

test('recusa link simbólico dentro das refs', { skip: runtimeSkip, timeout: 10000 }, async t => {
  const root = temp(t), probe = join(root, 'probe'), link = join(root, 'probe-link'); put(probe, 'ref\n');
  try { symlinkSync(probe, link, 'file'); unlinkSync(link); }
  catch (error) { if (process.platform === 'win32' && ['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) { t.skip('Sem permissão para criar symlink no Windows.'); return; } throw error; }
  const results = join(root, 'results'), cli = join(root, 'ref-link.cjs'); mkdirSync(results);
  put(cli, `const {symlinkSync}=require('node:fs');const {join}=require('node:path');const target=process.argv[process.argv.indexOf('--target')+1];if(process.argv[2]==='init')symlinkSync(${JSON.stringify(probe)},join(target,'.git/refs/heads/extra'),'file');console.log(JSON.stringify({ok:true,version:'9.9.9'}));`);
  const result = await projectCase({ number: 1, kind: 'existing', selection: 'codex' }, results, cli, '9.9.9', controlled(root));
  assert.equal(result.passed, false); assert.match(result.preservation.refs.error, /Link simbólico em ref/);
});

test('não aguarda indefinidamente pipe herdado de descendente confirmado por IPC', { timeout: 20000 }, async t => {
  const root = temp(t), script = join(root, 'pipes.cjs'), descendant = join(root, 'descendant.cjs');
  const stop = join(root, 'stop'), ack = join(root, 'ack');
  const parentExiting = join(root, 'parent-exiting'), descendantObserved = join(root, 'descendant-observed');
  const descendantPid = join(root, 'descendant-pid'), disconnected = join(root, 'disconnected');
  put(descendant, `const {existsSync,writeFileSync,renameSync}=require('node:fs');
const stop=process.argv[2],ack=process.argv[3],parentExiting=process.argv[4],observed=process.argv[5];let done=false,seen=false;
writeFileSync(process.argv[6],String(process.pid));
process.once('disconnect',()=>writeFileSync(process.argv[7],'disconnect'));
function finish(reason){if(done)return;done=true;clearTimeout(timer);clearInterval(poll);writeFileSync(ack+'.tmp',reason);renameSync(ack+'.tmp',ack);if(process.connected)process.disconnect();}
const timer=setTimeout(()=>finish('expired'),6000);
const poll=setInterval(()=>{if(!seen&&existsSync(parentExiting)){seen=true;writeFileSync(observed+'.tmp','observed');renameSync(observed+'.tmp',observed);}if(existsSync(stop))finish('stopped');},30);
process.send('ready');`);
  put(script, `const {spawn}=require('node:child_process');
const {tmpdir}=require('node:os');
const {writeFileSync,renameSync}=require('node:fs');
process.on('exit',()=>{writeFileSync(process.argv[5]+'.tmp','parent-exit-callback');renameSync(process.argv[5]+'.tmp',process.argv[5]);});
const c=spawn(process.execPath,[process.argv[2],process.argv[3],process.argv[4],process.argv[5],process.argv[6],process.argv[7],process.argv[8]],{stdio:['ignore','inherit','inherit','ipc'],cwd:tmpdir()});
c.once('error',e=>{process.stderr.write(e.message);process.exitCode=1;});
c.once('message',m=>{
  if(m!=='ready'){process.exitCode=1;return;}
  process.stdout.write('DESC_READY\\n');
  c.disconnect();c.unref();process.stdout.write('PARENT_EXIT\\n');
});`);
  const start = Date.now(); let result, elapsed;
  try {
    result = await command(process.execPath, [script, descendant, stop, ack, parentExiting, descendantObserved, descendantPid, disconnected], root, process.env, 2500);
    elapsed = Date.now() - start;
    const observationEnd = Date.now() + 1500;
    while (!existsSync(descendantObserved) && Date.now() < observationEnd) await new Promise(resolvePromise => setTimeout(resolvePromise, 30));
  } finally {
    // O próprio neto encerra após este arquivo; não sinalizamos PID reutilizável.
    writeFileSync(stop, 'stop');
    const end = Date.now() + 6500;
    while (!existsSync(ack) && Date.now() < end && !(process.platform !== 'win32' && result?.timedOut && result.signal === 'SIGKILL')) await new Promise(resolvePromise => setTimeout(resolvePromise, 30));
  }
  const killedGroup = process.platform !== 'win32' && result.timedOut && result.signal === 'SIGKILL';
  if (existsSync(ack)) assert.equal(readFileSync(ack, 'utf8'), 'stopped');
  else if (process.platform === 'win32') {
    // No Windows testado, o neto encerrou abruptamente por causa desconhecida.
    // Este ramo não prova que o neto viveu após a saída do pai.
    assert.equal(result.timedOut, false); assert.equal(result.status, 0); assert.equal(result.signal, null);
    assert.equal(readFileSync(disconnected, 'utf8'), 'disconnect');
    const pid = Number(readFileSync(descendantPid, 'utf8'));
    assert.ok(Number.isSafeInteger(pid) && pid > 0);
    let probeError;
    try { process.kill(pid, 0); } catch (error) { probeError = error; }
    assert.equal(probeError?.code, 'ESRCH', 'o neto deve ter encerrado; nenhum sinal é enviado');
  } else assert.equal(killedGroup, true, 'o descendente não confirmou encerramento');
  // O callback é executado no pai e antecede o encerramento efetivo no SO.
  assert.equal(readFileSync(parentExiting, 'utf8'), 'parent-exit-callback');
  if (process.platform !== 'win32' || existsSync(ack)) assert.equal(readFileSync(descendantObserved, 'utf8'), 'observed');
  assert.equal(result.exceeded, false); assert.equal(result.error, null);
  assert.match(result.stdout, /DESC_READY\r?\n/); assert.match(result.stdout, /PARENT_EXIT\r?\n/);
  if (!result.timedOut) {
    assert.equal(result.status, 0); assert.equal(result.signal, null);
  }
  assert.ok(elapsed < 6000, 'o pipe herdado não pode bloquear o runner');
});

test('processo vivo atinge timeout e não é tratado como sucesso', { timeout: 15000 }, async t => {
  const root = temp(t), script = join(root, 'alive.cjs');
  put(script, `process.stdout.write('ALVO_VIVO\\n');process.on('SIGTERM',()=>{});setInterval(()=>{},1000);`);
  const start = Date.now(), result = await command(process.execPath, [script], root, process.env, 1500);
  assert.equal(result.timedOut, true); assert.equal(result.exceeded, false);
  assert.match(result.stdout, /ALVO_VIVO\r?\n/); assert.ok(Date.now() - start < 5000);
});

test('timeout encerra grupo próprio sem sinalizar processo independente', { skip: process.platform === 'win32' && 'O teste exige sinais para um grupo de processos POSIX.', timeout: 10000 }, async t => {
  const root = temp(t), script = join(root, 'group.cjs'), marker = join(root, 'escaped');
  put(script, `const {spawn}=require('node:child_process');const {tmpdir}=require('node:os');const payload="process.on('SIGTERM',()=>{});process.stdout.write('DESC_READY\\\\n');setTimeout(()=>require('node:fs').writeFileSync(process.argv[1],'alive'),3000);setTimeout(()=>{},4000);";spawn(process.execPath,['-e',payload,process.argv[2]],{stdio:'inherit',cwd:tmpdir()});process.on('SIGTERM',()=>{});setInterval(()=>{},1000);`);
  const sibling = spawn(process.execPath, ['-e', 'setTimeout(()=>{},8000)'], { stdio: 'ignore' });
  t.after(() => { if (sibling.exitCode === null && sibling.signalCode === null) sibling.kill(); });
  const result = await command(process.execPath, [script, marker], root, process.env, 1200);
  assert.equal(result.timedOut, true); assert.match(result.stdout, /DESC_READY/);
  await new Promise(resolvePromise => setTimeout(resolvePromise, 3500));
  assert.equal(existsSync(marker), false, 'descendente do grupo não deve continuar');
  assert.equal(sibling.exitCode, null); assert.equal(sibling.signalCode, null);
});

test('limita saída excessiva e não sinaliza processo independente', { timeout: 10000 }, async t => {
  const root = temp(t), script = join(root, 'flood.cjs');
  put(script, `process.on('SIGTERM',()=>{});const b=Buffer.alloc(65536,65);function send(){while(process.stdout.write(b)){}process.stdout.once('drain',send)}send();`);
  const sibling = spawn(process.execPath, ['-e', 'setTimeout(()=>{},8000)'], { stdio: 'ignore' });
  t.after(() => { if (sibling.exitCode === null && sibling.signalCode === null) sibling.kill(); });
  const result = await command(process.execPath, [script], root, process.env, 5000);
  assert.equal(result.exceeded, true); assert.equal(result.timedOut, false);
  assert.ok(Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr) <= 16 * 1024 * 1024);
  assert.equal(sibling.exitCode, null); assert.equal(sibling.signalCode, null);
});

test('timeout do alvo não certifica preservação mesmo quando snapshots coincidem', { skip: runtimeSkip, timeout: 30000 }, async t => {
  const root = temp(t), cli = join(root, 'hang.cjs');
  put(cli, `process.stdout.write('ALVO_VIVO\\n');process.on('SIGTERM',()=>{});setInterval(()=>{},1000);`);
  const results = join(root, 'results'); mkdirSync(results);
  const env = controlled(root);
  const timed = (file, args, cwd, environment) => command(file, args, cwd, environment, file === process.execPath ? 1500 : 30000);
  const result = await projectCase({ number: 1, kind: 'existing', selection: 'codex' }, results, cli, '9.9.9', env, timed);
  assert.equal(result.passed, false); assert.equal(result.operations.at(-1).timedOut, true);
  assert.match(readFileSync(result.operations.at(-1).stdout, 'utf8'), /ALVO_VIVO/);
  assert.equal(result.preservation.status, 'not-verified');
  assert.equal(result.preservation.unchanged, null); assert.equal(result.preservation.documentsPreserved, null);
  assert.equal(result.preservation.observedUnchanged, true); assert.equal(result.preservation.observedDocumentsPreserved, true);
  for (const name of ['SETUP.json', 'BEFORE.json', 'AFTER.json', 'RESULT.json']) assert.ok(existsSync(join(results, '01-existing', name)), name);
});
