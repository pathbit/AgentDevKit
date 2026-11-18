#!/usr/bin/env node
// Opt-in: validate real Docker context filtering using synthetic files only.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outputParent } from './project-matrix.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = mkdtempSync(join(outputParent(tmpdir()), 'agentdevkit-dockerignore-'));
const context = join(out, 'context'), result = join(out, 'result');
mkdirSync(context);
copyFileSync(join(root, '.dockerignore'), join(context, '.dockerignore'));
writeFileSync(join(context, 'Dockerfile'), 'FROM scratch\nCOPY . /fixture/\n');
const kept = ['src/source.mjs', '.pbai4devs/state/README.md', 'nested/.env.example',
  'nested/playwright.config.ts', 'tests/playwright-smoke.test.mjs',
  'src/tmpfoo/file.mjs', 'src/template.mjs'];
const omitted = ['.git/HEAD', 'nested/.git/HEAD', '.agent-tests/report.txt', '.AgEnT-TeStS/report.txt', '.pbai4devs/state/configuracao/ESTADO.md',
  '.env', 'nested/.ENV.secret', '.NPMRC', 'nested/.eNvRc', 'nested/.NETRC',
  'nested/.sSh/id', 'nested/.AwS/config', '.GIT-CREDENTIALS', 'nested/.DoCkEr/config',
  'nested/.KuBe/config', 'nested/.GnUpG/key', 'nested/.PyPiRc', '.YaRnRc.yml',
  'nested/private.KEY', 'nested/cert.PEM', 'nested/cert.P12', 'nested/cert.PFX',
  'nested/state.TfStAtE', 'node_modules/dependency/file',
  'nested/.DS_Store', '.PlaYwRiGhT-mcp/trace', 'nested/pLaYwRiGhT-report/index.html',
  'nested/TeStReSuLtS/result.xml', 'nested/TEST-RESULTS/result.xml', 'nested/BlOb-RePoRt/result.zip',
  'tmp/file', 'a/b/TMP/file', 'temp', 'nested/TmP/file', 'nested/TeMp/file',
  'nested/.LoCaL/tool', 'nested/.CaChE/file'];
for (const file of [...kept, ...omitted]) {
  const target = join(context, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, 'fixture sintética\n');
}
console.log(JSON.stringify({ status: 'running', output: out }));
const child = spawnSync('docker', ['buildx', 'build', '--network=none', '--pull=false', '--no-cache', '--output', `type=local,dest=${result}`, context],
  { encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024, shell: false });
writeFileSync(join(out, 'build.stdout'), child.stdout || '');
writeFileSync(join(out, 'build.stderr'), child.stderr || '');
assert.ifError(child.error);
assert.equal(child.signal, null);
assert.equal(child.status, 0, `Docker falhou; confira ${join(out, 'build.stderr')}`);
for (const file of kept) assert.ok(existsSync(join(result, 'fixture', file)), `arquivo necessário ausente: ${file}`);
for (const file of omitted) assert.ok(!existsSync(join(result, 'fixture', file)), `artefato incluído: ${file}`);
const report = { status: 'passed', kept, omitted, limit: 'Fixture sintética; não valida bind mounts nem garante sigilo de todo contexto possível.' };
writeFileSync(join(out, 'REPORT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, output: out, kept: kept.length, omitted: omitted.length }));
