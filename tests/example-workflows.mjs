#!/usr/bin/env node
// Reproducible sample products. Generated projects and execution reports are ignored.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findNpmCli } from '../.pbai4devs/scripts/lib/npm.mjs';
import { environment } from './oss-compatibility.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2] || JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
assert.match(version, /^\d+\.\d+\.\d+$/);
const generated = join(root, 'examples/generated');
mkdirSync(generated, { recursive: true });
const output = mkdtempSync(join(generated, 'workflows-'));
const env = environment(output);
const npmWork = join(output, 'npm-work');
const npm = findNpmCli();
assert.ok(npm, 'Node.js 24+ e npm são necessários.');
assert.ok(Number(process.versions.node.split('.')[0]) >= 24);
const write = (directory, path, value) => { const file = join(directory, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, value); };
const md = (title, text) => `---\ndescription: Exemplo didático gerado localmente.\n---\n\n# ${title}\n\n${text}\n`;
const report = { version, status: 'running', output, examples: [] };
const save = () => write(output, 'REPORT.json', JSON.stringify(report, null, 2) + '\n');
function run(directory, command, args) {
  const result = spawnSync(command, args, { cwd: directory, env, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')}: ${result.error?.message || result.stderr || result.stdout}`);
  return result.stdout;
}

const api = [
  {
    name: 'Saúde da API', criterion: 'GET /health responde 200 e status ok.',
    source: `import { createServer } from 'node:http';\nexport function app() { return createServer((req, res) => {\n  res.setHeader('content-type', 'application/json');\n  if (req.method === 'GET' && req.url === '/health') return res.end(JSON.stringify({ status: 'ok' }));\n  res.writeHead(404).end();\n}); }\n`,
    test: `import { test } from 'node:test'; import assert from 'node:assert/strict'; import { app } from '../src/app.mjs';\nexport async function withServer(fn) { const s=app(); await new Promise(r=>s.listen(0,'127.0.0.1',r)); try { await fn('http://127.0.0.1:'+s.address().port); } finally { await new Promise(r=>s.close(r)); } }\ntest('health',async()=>withServer(async url=>{ const r=await fetch(url+'/health'); assert.equal(r.status,200); assert.deepEqual(await r.json(),{status:'ok'}); }));\n`,
  },
  {
    name: 'Criar tarefas', criterion: 'POST /items cria tarefa e rejeita nome vazio.',
    source: `import { createServer } from 'node:http';\nexport function app() { const items=[]; return createServer(async (req,res)=>{\n  res.setHeader('content-type','application/json');\n  if(req.method==='GET' && req.url==='/health') return res.end(JSON.stringify({status:'ok'}));\n  if(req.method==='POST' && req.url==='/items') { let raw=''; for await(const part of req) raw+=part; let body; try { body=JSON.parse(raw); } catch { return res.writeHead(400).end(); }\n    if(typeof body?.name!=='string' || !body.name.trim()) return res.writeHead(400).end();\n    const item={id:items.length+1,name:body.name.trim()}; items.push(item); return res.writeHead(201).end(JSON.stringify(item)); }\n  res.writeHead(404).end();\n}); }\n`,
    test: `import { test } from 'node:test'; import assert from 'node:assert/strict'; import { withServer } from './01-health.test.mjs';\ntest('create and validate',async()=>withServer(async url=>{ const post=name=>fetch(url+'/items',{method:'POST',body:JSON.stringify({name})}); const ok=await post('a'); assert.equal(ok.status,201); assert.deepEqual(await ok.json(),{id:1,name:'a'}); assert.equal((await post('')).status,400); }));\n`,
  },
  {
    name: 'Listar tarefas', criterion: 'GET /items lista as tarefas criadas em memória.',
    source: null,
    test: `import { test } from 'node:test'; import assert from 'node:assert/strict'; import { withServer } from './01-health.test.mjs';\ntest('list',async()=>withServer(async url=>{ await fetch(url+'/items',{method:'POST',body:JSON.stringify({name:'a'})}); const r=await fetch(url+'/items'); assert.equal(r.status,200); assert.deepEqual(await r.json(),[{id:1,name:'a'}]); }));\n`,
  },
];
api[2].source = api[1].source.replace("  if(req.method==='POST'", "  if(req.method==='GET' && req.url==='/items') return res.end(JSON.stringify(items));\n  if(req.method==='POST'");
const cli = [
  { name: 'Somar números', criterion: 'A CLI soma argumentos numéricos.', source: `const numbers=process.argv.slice(3).map(Number);\nconsole.log(numbers.reduce((a,b)=>a+b,0));\n`, test: `import { test } from 'node:test'; import assert from 'node:assert/strict'; import { spawnSync } from 'node:child_process';\ntest('sum',()=>{const r=spawnSync(process.execPath,['src/calc.mjs','sum','2','3'],{encoding:'utf8'}); assert.equal(r.status,0); assert.equal(r.stdout.trim(),'5');});\n` },
  { name: 'Calcular média', criterion: 'A CLI também calcula a média.', source: `const numbers=process.argv.slice(3).map(Number);\nconst sum=numbers.reduce((a,b)=>a+b,0);\nconsole.log(process.argv[2]==='mean' ? sum/numbers.length : sum);\n`, test: `import { test } from 'node:test'; import assert from 'node:assert/strict'; import { spawnSync } from 'node:child_process';\ntest('mean',()=>{const r=spawnSync(process.execPath,['src/calc.mjs','mean','2','4'],{encoding:'utf8'}); assert.equal(r.status,0); assert.equal(r.stdout.trim(),'3');});\n` },
  { name: 'Validar entradas', criterion: 'A CLI rejeita operação desconhecida, lista vazia e valores inválidos.', source: `const operation=process.argv[2], values=process.argv.slice(3);\nif(!['sum','mean'].includes(operation) || !values.length || values.some(v=>!v.trim() || !Number.isFinite(Number(v)))) { console.error('Invalid input'); process.exit(1); }\nconst numbers=values.map(Number), sum=numbers.reduce((a,b)=>a+b,0);\nconsole.log(operation==='mean' ? sum/numbers.length : sum);\n`, test: `import { test } from 'node:test'; import assert from 'node:assert/strict'; import { spawnSync } from 'node:child_process';\ntest('invalid input',()=>{for(const args of [['sum'],['bad','1'],['sum','abc']]) assert.equal(spawnSync(process.execPath,['src/calc.mjs',...args]).status,1);});\n` },
];

try {
  for (const sample of [
    { id: 'api-tarefas', purpose: 'Criar e listar tarefas em memória por HTTP.', stages: api, source: 'src/app.mjs' },
    { id: 'cli-calculadora', purpose: 'Somar e calcular a média de números na linha de comando.', stages: cli, source: 'src/calc.mjs' },
  ]) {
    const directory = join(output, sample.id); mkdirSync(directory);
    run(directory, 'git', ['init', '--quiet', '--template=']);
    run(npmWork, process.execPath, [npm, 'exec', '--yes', '--ignore-scripts', `--package=@pathbit/agentdevkit@${version}`, '--', 'agentdevkit', 'init', '--target', directory, '--agents', 'codex,claude,copilot', '--lang', 'pt', '--yes']);
    write(directory, 'docs/PRD.md', md('PRD — exemplo', `Problema e objetivo: ${sample.purpose}\n\nUsuário: pessoa desenvolvedora. Escopo didático: somente os três incrementos do roadmap. Aprovação: simulada para este exemplo.`));
    write(directory, 'docs/UX.md', md('UX — exemplo', 'Não há interface visual; a experiência usa HTTP ou terminal. Decisão simulada para o exercício.'));
    write(directory, 'docs/DESIGN.md', md('Design — exemplo', 'Node.js, módulos ECMAScript e testes nativos. Sem banco, autenticação ou dependências externas. Decisão simulada.'));
    write(directory, 'docs/ROADMAP.md', md('Roadmap — exemplo', sample.stages.map((stage, index) => `${index + 1}. ${stage.name}.`).join('\n')));
    const current = { id: sample.id, directory, stages: [] }; report.examples.push(current); save();
    for (let index = 0; index < sample.stages.length; index++) {
      const stage = sample.stages[index], number = String(index + 1).padStart(2, '0');
      write(directory, `docs/specs/${number}/SPEC.md`, md(`Spec ${number} — ${stage.name}`, `Escopo: ${stage.name}.\n\nCritério de aceite AC-001: ${stage.criterion}\n\nAprovação e revisão: simuladas para o exemplo; não representam revisão humana.`));
      write(directory, sample.source, stage.source);
      write(directory, `tests/${number}-${sample.id === 'api-tarefas' && index === 0 ? 'health' : 'stage'}.test.mjs`, stage.test);
      const testFiles = Array.from({ length: index + 1 }, (_, i) => `tests/${String(i + 1).padStart(2, '0')}-${sample.id === 'api-tarefas' && i === 0 ? 'health' : 'stage'}.test.mjs`);
      const result = run(directory, process.execPath, ['--test', ...testFiles]);
      write(directory, `.agent-tests/spec-${number}.log`, result);
      current.stages.push({ spec: `docs/specs/${number}/SPEC.md`, criterion: stage.criterion, status: 'passed', evidence: `.agent-tests/spec-${number}.log` }); save();
      console.log(`${sample.id}: spec ${number} aprovada nos testes`);
    }
    run(npmWork, process.execPath, [npm, 'exec', '--yes', '--ignore-scripts', `--package=@pathbit/agentdevkit@${version}`, '--', 'agentdevkit', 'doctor', '--target', directory]);
  }
  report.status = 'passed'; save(); console.log(JSON.stringify({ status: report.status, report: join(output, 'REPORT.json') }));
} catch (error) { report.status = 'failed'; report.error = error.message; save(); console.error(error.message); process.exitCode = 1; }
