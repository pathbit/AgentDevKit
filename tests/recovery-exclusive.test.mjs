import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outputParent } from './project-matrix.mjs';

// Probe the primitive on this filesystem only; the journal is not integrated.
for (const round of [1, 2, 3]) test(`criação exclusiva admite um vencedor: rodada ${round}`, { timeout: 60000 }, async t => {
  const root = mkdtempSync(join(outputParent(tmpdir()), 'adk-exclusive-')), target = join(root, 'claim');
  const worker = `const fs=require('node:fs');process.stdout.write('ready\\n');
process.stdin.once('data',data=>{const delay=Math.max(0,Number(data)-Date.now());setTimeout(()=>{try{const fd=fs.openSync(process.argv[1],'wx',0o600);
try{fs.writeFileSync(fd,process.argv[2]);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}
process.stdout.write('won\\n')}catch(e){if(e.code==='EEXIST')process.stdout.write('lost\\n');
else{process.stderr.write(String(e.code||e.message));process.exitCode=1}}},delay)})`;
  const children = [], ready = [], done = [];
  t.after(() => {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill();
    rmSync(root, { recursive: true, force: true });
  });
  for (let index = 0; index < 16; index++) {
    const child = spawn(process.execPath, ['-e', worker, target, String(index)], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    children.push(child);
    child.stdin.on('error', () => { /* The child result reports early exit. */ });
    let stdout = '', stderr = '', markReady;
    ready.push(new Promise(resolve => { markReady = resolve; }));
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; if (stdout.includes('ready\n')) markReady(true); });
    child.stderr.on('data', chunk => { stderr += chunk; });
    done.push(new Promise(resolve => {
      child.on('error', error => { markReady(false); resolve({ index, error: error.message }); });
      child.on('close', (code, signal) => { markReady(false); resolve({ index, code, signal, stdout, stderr }); });
    }));
  }
  let timer;
  const deadline = new Promise(resolve => { timer = setTimeout(() => resolve(false), 30000); });
  try {
    const started = await Promise.race([Promise.all(ready).then(values => values.every(Boolean)), deadline]);
    assert.equal(started, true, 'processos de prova não iniciaram');
    const start = String(Date.now() + 300);
    for (const child of children) child.stdin.end(start + '\n');
    const result = await Promise.race([Promise.all(done), deadline]);
    assert.ok(Array.isArray(result), 'processos de prova não terminaram');
    for (const item of result) assert.equal(item.code, 0, `processo ${item.index}: ${item.stderr || item.error || item.signal}`);
    const winners = result.filter(item => item.stdout.split('\n').includes('won'));
    const losers = result.filter(item => item.stdout.split('\n').includes('lost'));
    assert.equal(winners.length, 1); assert.equal(losers.length, 15);
    assert.equal(readFileSync(target, 'utf8'), String(winners[0].index));
  } finally {
    clearTimeout(timer);
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill();
    await Promise.all(done);
  }
});
