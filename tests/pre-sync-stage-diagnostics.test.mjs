import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { applyPlan, inspect, planInstallation } from '../src/install.mjs';
import { main as cliMain } from '../src/cli.mjs';
import { collectErrorDiagnostics } from '../.pbai4devs/scripts/lib/error-reporting.mjs';

for (const entry of ['planner', 'cli-json', 'doctor-json']) {
  test(`falha anterior ao sync e limpeza do estágio conservam diagnóstico (${entry})`, { timeout: 120000 }, async t => {
    const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-presync-diagnostic-')));
    const rootIdentity = fs.lstatSync(root, { bigint: true });
    let stage, stageIdentity;
    t.after(() => {
      t.mock.restoreAll(); syncBuiltinESMExports();
      for (const [path, identity] of [[stage, stageIdentity], [root, rootIdentity]]) {
        if (!path || !identity) continue;
        let current;
        try { current = fs.lstatSync(path, { bigint: true }); }
        catch (error) { if (error.code === 'ENOENT') continue; throw error; }
        assert.ok(current.isDirectory() && !current.isSymbolicLink() && current.dev === identity.dev && current.ino === identity.ino, `diretório substituído deve ser preservado: ${path}`);
        fs.rmSync(path, { recursive: true });
      }
    });
    const git = (...args) => {
      const child = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
      assert.equal(child.status, 0, child.stderr);
    };
    git('init', '-q');
    fs.writeFileSync(join(root, '.gitignore'), '# regra humana\n');
    fs.writeFileSync(join(root, 'humano.txt'), 'sentinela humana\n');
    git('add', '--', '.gitignore', 'humano.txt');
    applyPlan(planInstallation({ target: root, mode: 'init', clients: ['codex'] }));
    const source = join(root, '.pbai4devs/skills/projeto/configurar-projeto/SKILL.md');
    const sentinel = 'SENTINELA_HUMANA_NAO_EXIBIR';
    fs.writeFileSync(source, fs.readFileSync(source, 'utf8').replace(/^description:.*$/m, `description: ${sentinel}`));
    if (entry === 'doctor-json') assert.ok(inspect(root).issues.length, 'doctor precisa de uma issue preexistente');
    const paths = ['.git/index', '.git/config', '.git/info/exclude', '.gitignore', 'humano.txt'];
    const before = paths.map(path => fs.readFileSync(join(root, path)));
    const originalSource = fs.readFileSync(source);
    const primary = Object.freeze(Object.assign(new Error('falha primária sintética'), { code: 'EIO' }));
    const cleanupSecret = 'SEGREDO_SINTETICO_DA_LIMPEZA';
    const cleanup = Object.freeze(Object.assign(new Error(cleanupSecret), { code: 'EACCES' }));
    const mkdirTemp = fs.mkdtempSync, read = fs.readFileSync, remove = fs.rmSync;
    let primaryInjected = false, cleanupInjected = false;
    t.mock.method(fs, 'mkdtempSync', (...args) => {
      const created = mkdirTemp(...args);
      if (String(args[0]).includes('agentdevkit-')) { stage = fs.realpathSync(created); stageIdentity = fs.lstatSync(stage, { bigint: true }); }
      return created;
    });
    t.mock.method(fs, 'readFileSync', (path, ...args) => {
      if (stage && path === source && !primaryInjected) { primaryInjected = true; throw primary; }
      return read(path, ...args);
    });
    t.mock.method(fs, 'rmSync', (path, ...args) => {
      if (stage && path === stage) { cleanupInjected = true; throw cleanup; }
      return remove(path, ...args);
    });
    syncBuiltinESMExports();
    let error, result, output = '', exit;
    try {
      if (entry === 'planner') {
        try { planInstallation({ target: root, mode: 'update', clients: ['codex'] }); }
        catch (caught) { error = caught; }
      } else {
        const args = entry === 'doctor-json' ? ['doctor'] : ['update'];
        exit = await cliMain([...args, '--target', root, '--json'], { cwd: root, stdout: { write: value => { output += value; } } });
        result = JSON.parse(output);
      }
    } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
    assert.ok(stage && primaryInjected && cleanupInjected, 'fixture deve falhar antes do sync e na limpeza');
    assert.ok(fs.existsSync(stage), 'caminho incerto deve permanecer disponível para revisão');
    paths.forEach((path, index) => assert.deepEqual(fs.readFileSync(join(root, path)), before[index], path));
    assert.deepEqual(fs.readFileSync(source), originalSource);
    const observed = entry === 'planner' ? collectErrorDiagnostics(error) : result.error || {};
    t.diagnostic(JSON.stringify({
      errorName: error?.name, code: entry === 'planner' ? error?.code : result.error?.code,
      issueCodes: result?.issues?.map(item => item.causeCode).filter(Boolean),
      stageReported: Boolean(observed.preservedPaths?.includes(stage) || observed.cleanupFailures?.some(item => item.path === stage)),
      detailExposesCleanupSecret: typeof result?.error?.detail === 'string' && result.error.detail.includes(cleanupSecret),
      cleanupFailuresExposeSecret: Boolean(result?.error?.cleanupFailures?.some(item => item.message?.includes(cleanupSecret))),
      gitAndHumanSnapshotsMatch: true,
    }));
    if (entry === 'planner') {
      const diagnostics = collectErrorDiagnostics(error);
      assert.equal(error?.code, 'EIO', 'o código primário deve permanecer disponível');
      assert.equal(error?.cause, primary, 'a causa primária deve ser preservada');
      assert.ok(diagnostics.preservedPaths.includes(stage) || diagnostics.cleanupFailures.some(item => item.path === stage));
    } else {
      assert.notEqual(exit, 0); assert.equal(result.ok, false);
      assert.equal(result.error?.code, 'EIO', 'a saída deve preservar o código primário');
      if (entry === 'doctor-json') {
        const issue = result.issues.find(item => item.code === 'plan-inspection-failed');
        assert.equal(issue?.causeCode, 'EIO');
        assert.equal(Object.hasOwn(issue, 'path'), false);
        assert.ok(result.issues.some(item => item.code === 'claude-inspection-unverified' && item.causeCode === 'EIO'));
        assert.ok(result.warnings.some(warning => warning.includes('Claude')));
      }
      const diagnostics = result.error;
      assert.ok((diagnostics.preservedPaths || []).includes(stage) || (diagnostics.cleanupFailures || []).some(item => item.path === stage));
      assert.equal(result.next[0].stage, 'revisao');
      assert.ok(!output.includes(sentinel));
      assert.ok(!output.includes(cleanupSecret), 'a saída não deve exibir mensagem arbitrária da limpeza');
    }
  });
}
