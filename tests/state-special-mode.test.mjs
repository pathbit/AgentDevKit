import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { applyPlan, planInstallation } from '../src/install.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(repository, 'bin/agentdevkit.mjs');
const oldRoot = '.pbai4devs/estado';
const newRoot = '.pbai4devs/state';
const read = (root, path) => readFileSync(join(root, path));
function put(root, path, value) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), value);
}
function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}
function cli(root, args, expected = 0) {
  const result = spawnSync(process.execPath, [bin, ...args, '--target', root, '--json'], {
    encoding: 'utf8', timeout: 180000,
  });
  assert.equal(result.status, expected, `${args.join(' ')}: ${result.error?.stack || ''}\n${result.stdout || ''}\n${result.stderr || ''}`);
  return JSON.parse(result.stdout);
}
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'adk-state-special-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '--quiet');
  const ignore = Buffer.from('# Regras humanas\r\nnode_modules/\r\n.env\r\n!.env.example\r\n');
  put(root, '.gitignore', ignore);
  put(root, 'AGENTS.md', '# Instruções humanas\n\nNão substituir.\n');
  put(root, 'README.md', '# Projeto humano\n');
  cli(root, ['init', '--agents', 'codex,claude', '--lang', 'es']);
  const manifestPath = `${newRoot}/agentdevkit.json`;
  const manifest = JSON.parse(read(root, manifestPath));
  manifest.version = '0.0.16';
  for (const key of Object.keys(manifest.files || {})) {
    if (key.startsWith(`${newRoot}/`)) {
      manifest.files[key.replace(`${newRoot}/`, `${oldRoot}/`)] = manifest.files[key];
      delete manifest.files[key];
    }
  }
  put(root, manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const config = Buffer.from('---\npreparacao: concluido\nconfiguracao_tecnica: pendente\n---\n\n# Decisões da equipe\n\nNão reescrever.\n');
  const custom = Buffer.from('Arquivo próprio\r\ncom conteúdo preservado.\r\n');
  const catalog = '.agents/skills.json';
  const digest = createHash('sha256').update(read(root, catalog)).digest('hex');
  const derived = Buffer.from(`${JSON.stringify({ schemaVersion: 1, entries: {}, files: {}, blocks: {}, outputs: { [catalog]: digest } })}\n`);
  put(root, `${newRoot}/configuracao/ESTADO.md`, config);
  put(root, `${newRoot}/outros/minhas-notas.txt`, custom);
  put(root, `${newRoot}/derived.json`, derived);
  renameSync(join(root, newRoot), join(root, oldRoot));
  git(root, 'add', '--', '.gitignore', 'AGENTS.md', 'README.md', `${oldRoot}/configuracao/ESTADO.md`, `${oldRoot}/outros/minhas-notas.txt`);
  put(root, `${oldRoot}/configuracao/ESTADO.md`, Buffer.concat([config, Buffer.from('\nAlteração não preparada.\n')]));
  return { root, ignore, config: read(root, `${oldRoot}/configuracao/ESTADO.md`), custom, derived,
    index: git(root, 'ls-files', '--stage', '-z'), agents: read(root, 'AGENTS.md'), readme: read(root, 'README.md') };
}

test('migra estado legado preservando dados humanos, seleção, índice e ignore; atualização é idempotente', t => {
  const f = fixture(t), { root } = f;
  const oldManifest = read(root, `${oldRoot}/agentdevkit.json`);
  const preview = cli(root, ['update', '--dry-run']);
  assert.equal(preview.ok, true);
  assert.ok(preview.plan.some(change => change.path.startsWith(`${newRoot}/`)), 'o plano apresenta a migração');
  assert.equal(existsSync(join(root, newRoot)), false);
  assert.deepEqual(read(root, `${oldRoot}/agentdevkit.json`), oldManifest);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);

  const result = cli(root, ['update']);
  assert.equal(result.ok, true);
  assert.equal(existsSync(join(root, oldRoot)), false);
  assert.deepEqual(read(root, `${newRoot}/configuracao/ESTADO.md`), f.config);
  assert.deepEqual(read(root, `${newRoot}/outros/minhas-notas.txt`), f.custom);
  assert.deepEqual(read(root, `${newRoot}/derived.json`), f.derived);
  assert.deepEqual(read(root, '.gitignore'), f.ignore);
  assert.deepEqual(read(root, 'AGENTS.md'), f.agents);
  assert.deepEqual(read(root, 'README.md'), f.readme);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
  const manifest = JSON.parse(read(root, `${newRoot}/agentdevkit.json`));
  assert.equal(manifest.language, 'es');
  assert.deepEqual([...manifest.clients].sort(), ['claude', 'codex']);
  assert.equal(cli(root, ['update', '--dry-run']).plan.length, 0);
  assert.equal(cli(root, ['update']).changed, false);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
  assert.deepEqual(read(root, '.gitignore'), f.ignore);
});

for (const [name, bit] of [['sticky',0o1000],['setgid',0o2000],['setuid',0o4000]]) for(const nested of [false,true]) {
 test(`guarda diretório legado especial ${name}, nested=${nested}`,{timeout:180000,skip:process.platform==='win32'},t=>{
  const f=fixture(t),{root}=f,relative=nested?`${oldRoot}/especial`:oldRoot,path=join(root,relative);
  if(nested)fs.mkdirSync(path,{mode:0o700});fs.chmodSync(path,0o700|bit);
  const observed = fs.statSync(path).mode & 0o7000;
  if (observed !== bit && process.platform === 'darwin' && name === 'setgid') {
   t.skip('setgid indisponível nesta fixture macOS; comportamento não verificado');
   return;
  }
  assert.equal(observed,bit,'fixture requer bit especial suportado');
  const paths=['.git/index','.git/config','.git/info/exclude','.gitignore','AGENTS.md','README.md',`${oldRoot}/agentdevkit.json`,`${oldRoot}/configuracao/ESTADO.md`,`${oldRoot}/outros/minhas-notas.txt`,`${oldRoot}/derived.json`];
  const before=new Map(paths.map(p=>[p,read(root,p)])), beforeNames=fs.readdirSync(join(root,oldRoot)).sort(), beforeMode=fs.statSync(path).mode&0o7777;
  assert.equal(fs.existsSync(join(root,newRoot)),false,'fixture deve ter somente raiz legada');
  assert.throws(()=>planInstallation({target:root,mode:'update'}),e=>e.code==='E_PROTECTED_METADATA'&&e.path===relative&&e.metadataTargetVerified===true);
  for(const force of [false,true]){
   const result=spawnSync(process.execPath,[bin,'update',...(force?['--force']:[]),'--target',root,'--json'],{encoding:'utf8',timeout:180000,maxBuffer:8e6});
   assert.equal(result.error,undefined);assert.equal(result.signal,null);assert.equal(result.status,1,result.stdout+result.stderr);const json=JSON.parse(result.stdout);
   assert.equal(json.ok,false);assert.equal(json.error.code,'E_PROTECTED_METADATA');assert.equal(json.error.path,relative);
  }
  assert.equal(fs.existsSync(join(root,newRoot)),false);assert.equal(fs.statSync(path).mode&0o7777,beforeMode);assert.deepEqual(fs.readdirSync(join(root,oldRoot)).sort(),beforeNames);
  for(const [p,bytes] of before)assert.deepEqual(read(root,p),bytes,p);
 });
}

test('guarda de diretório especial revalida modo antes de aplicar plano', {timeout:180000,skip:process.platform==='win32'},t=>{
 const f=fixture(t),{root}=f,path=join(root,oldRoot,'configuracao'),relative=oldRoot+'/configuracao';const plan=planInstallation({target:root,mode:'update'});assert.equal(plan.canApply,true);
 fs.chmodSync(path,0o1700);assert.equal(fs.statSync(path).mode&0o7000,0o1000);
 const paths=['.git/index','.git/config','.git/info/exclude','.gitignore','AGENTS.md','README.md',oldRoot+'/agentdevkit.json',oldRoot+'/configuracao/ESTADO.md'];const before=new Map(paths.map(p=>[p,read(root,p)]));
 assert.throws(()=>applyPlan(plan),e=>e.code==='E_PROTECTED_METADATA'&&e.path===relative&&e.metadataTargetVerified===true);assert.equal(fs.existsSync(join(root,newRoot)),false);assert.equal(fs.statSync(path).mode&0o7777,0o1700);
 for(const [p,b] of before)assert.deepEqual(read(root,p),b,p);
});

test('auditoria: consultas e mensagens com diretório legado especial', {timeout:180000,skip:process.platform==='win32'},t=>{
 const f=fixture(t),{root}=f,relative=oldRoot+'/configuracao',dir=join(root,relative);fs.chmodSync(dir,0o1700);assert.equal(fs.statSync(dir).mode&0o7000,0o1000);
 const paths=['.git/index','.git/config','.git/info/exclude','.gitignore','AGENTS.md','README.md',oldRoot+'/agentdevkit.json',oldRoot+'/configuracao/ESTADO.md',oldRoot+'/outros/minhas-notas.txt'];const before=new Map(paths.map(p=>[p,read(root,p)]));
 for(const args of [['--help'],['--version'],['next','--intent','product'],['agents'],['lang'],['doctor'],['sync','--check'],['update','--dry-run'],['update','--dry-run','--force']]){
  const r=spawnSync(process.execPath,[bin,...args,'--target',root,'--json'],{encoding:'utf8',timeout:180000,maxBuffer:8e6});assert.equal(r.error,undefined);assert.equal(r.signal,null);const value=JSON.parse(r.stdout), blocked=['doctor','sync','update'].includes(args[0]);assert.equal(r.status,blocked?1:0,JSON.stringify(args));assert.equal(value.ok,!blocked);if(blocked){assert.equal(value.error.code,'E_PROTECTED_METADATA');assert.equal(value.error.path,relative);assert.equal(value.error.metadataReason,'special-mode-directory')}
  for(const [p,b]of before)assert.deepEqual(read(root,p),b,p);assert.equal(fs.existsSync(join(root,newRoot)),false);assert.equal(fs.statSync(dir).mode&0o7777,0o1700);
 }
 for(const lang of ['pt','en','es']){const r=spawnSync(process.execPath,[bin,'update','--dry-run','--target',root,'--lang',lang],{encoding:'utf8',timeout:180000,maxBuffer:8e6});assert.equal(r.error,undefined);assert.equal(r.signal,null);assert.equal(r.status,1);const labels={pt:'Diretório com bits POSIX especiais; revise',en:'Directory has special POSIX mode bits; review',es:'Directorio con bits POSIX especiales; revise'};assert.ok(r.stdout.includes(labels[lang]+': '+relative),r.stdout);for(const [p,b]of before)assert.deepEqual(read(root,p),b,p);assert.equal(fs.existsSync(join(root,newRoot)),false);assert.equal(fs.statSync(dir).mode&0o7777,0o1700);}
});

test('doctor com problema anterior identifica diretório protegido e preserva a fixture', {timeout:180000,skip:process.platform==='win32'}, t => {
  const { root } = fixture(t);
  const relative = `${oldRoot}/configuracao`, directory = join(root, relative);
  fs.chmodSync(directory, 0o1700);
  assert.equal(fs.statSync(directory).mode & 0o7000, 0o1000);
  fs.appendFileSync(join(root, '.pbai4devs/INSTRUCTIONS.md'), '\nObservação humana sintética.\n');
  const paths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'AGENTS.md',
    '.pbai4devs/INSTRUCTIONS.md', `${oldRoot}/agentdevkit.json`, `${relative}/ESTADO.md`];
  const before = new Map(paths.map(p => [p, read(root, p)]));
  const result = cli(root, ['doctor'], 1);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.code === 'plan-inspection-failed' && issue.causeCode === 'E_PROTECTED_METADATA'));
  assert.ok(result.issues.some(issue => issue.code === 'protected-state-directory' && issue.path === relative));
  assert.equal(result.next[0].stage, 'revisao');
  assert.ok(!result.next.some(step => step.skill === 'configurar-projeto'));
  for (const [p, bytes] of before) assert.deepEqual(read(root, p), bytes, p);
  assert.equal(fs.statSync(directory).mode & 0o7777, 0o1700);
  assert.equal(existsSync(join(root, newRoot)), false);
});
