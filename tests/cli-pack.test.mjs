import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { findNpmCli } from '../.pbai4devs/scripts/lib/npm.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const put = (root, path, content) => { const file = join(root, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); };

test('npm pack real exclui estado e payloads em qualquer caixa e preserva fontes e fixtures', t => {
  const npm = findNpmCli();
  assert.ok(npm, 'npm CLI is required for the package regression test.');
  const evidence = join(project, '.agent-tests'); mkdirSync(evidence, { recursive: true });
  const work = mkdtempSync(join(evidence, 'cli-pack-')); t.after(() => rmSync(work, { recursive: true, force: true }));
  const stage = join(work, 'source'); mkdirSync(stage);
  cpSync(join(project, 'package.json'), join(stage, 'package.json'));
  cpSync(join(project, '.pbai4devs/.npmignore'), join(stage, '.pbai4devs/.npmignore'), { recursive: true });
  put(stage, 'bin/agentdevkit.mjs', '#!/usr/bin/env node\n');
  put(stage, 'src/cli.mjs', '// Package implementation\n');
  const marker = 'AGENTDEVKIT_PRIVATE_SENTINEL_MUST_NOT_BE_IN_ARCHIVE';
  const excluded = [
    'tools/demo/.local/private.json', 'tools/demo/.LOCAL/private.json', 'tools/.cache/runtime/node',
    'tools/.CACHE/runtime/node', 'tools/bin/demo', 'tools/BIN/demo', 'tools/versions/demo',
    'tools/npm-cache/private.json', 'external-skills/.local/private/SKILL.md',
    'external-skills/.LOCAL/private/SKILL.md', 'estado/agentdevkit.json', 'estado/configuracao/ESTADO.md',
    'scripts/demo/node_modules/private/index.js', 'scripts/demo/NODE_MODULES/private/index.js',
    'scripts/demo/.playwright-mcp/trace.json', 'scripts/demo/.PLAYWRIGHT-MCP/trace.json',
    'scripts/demo/Playwright-report/index.html', 'scripts/demo/TestResults/private.json',
    'scripts/demo/.AGENT-TESTS/private.json', 'scripts/demo/SESSIONs/private.json',
    'scripts/demo/LOGS/private.txt', 'scripts/demo/TMP/private.txt', 'scripts/demo/TEMP/private.txt',
    'scripts/demo/AUTH.JSON', 'scripts/demo/CREDENTIALS.JSON', 'scripts/demo/HISTORY.JSONL',
    'scripts/demo/config.LOCAL.JSON', 'scripts/demo/.ENV.production', 'scripts/demo/trace.LOG',
  ];
  for (const path of excluded) put(stage, `.pbai4devs/${path}`, marker);
  const developmentOnly = ['tests/private.test.mjs', 'scripts/release/private.mjs', 'examples/.claude/skills/private/SKILL.md'];
  for (const path of developmentOnly) put(stage, path, marker);
  const kept = [
    'README.md', 'estado/README.md', 'external-skills/README.md', 'external-skills/CATALOG.json',
    'tools/demo/TOOL.json', 'tools/demo/SCRIPT.mjs', 'tools/demo/README.md',
    'scripts/demo/SCRIPT.mjs', 'scripts/demo/tests/TEST.mjs', 'scripts/demo/tests/fixtures/cache/input.txt',
    'scripts/demo/tests/fixtures/compose.local.yml.template', 'scripts/demo/tests/fixtures/.env.example',
    'templates/ambiente-local/compose.local.yml.template',
  ];
  for (const path of kept) put(stage, `.pbai4devs/${path}`, 'PUBLIC_SOURCE_FIXTURE');
  const result = spawnSync(process.execPath, [npm, 'pack', '--json', '--ignore-scripts', '--pack-destination', work], {
    cwd: stage, encoding: 'utf8', timeout: 60000,
    env: { ...process.env, npm_config_cache: join(work, 'npm-cache'), npm_config_offline: 'true', npm_config_audit: 'false', npm_config_fund: 'false' },
  });
  assert.ifError(result.error); assert.equal(result.status, 0, result.stdout + result.stderr);
  const packed = JSON.parse(result.stdout)[0], paths = packed.files.map(file => file.path);
  for (const path of excluded) assert.equal(paths.includes(`.pbai4devs/${path}`), false, path);
  for (const path of kept) assert.ok(paths.includes(`.pbai4devs/${path}`), path);
  for (const path of ['bin/agentdevkit.mjs', 'src/cli.mjs']) assert.ok(paths.includes(path), path);
  for (const path of developmentOnly) assert.equal(paths.includes(path), false, path);
  const archive = readFileSync(join(work, packed.filename));
  assert.equal(gunzipSync(archive).includes(Buffer.from(marker)), false, 'Private sentinel bytes leaked into the actual tarball.');
  const name = `cli-pack-node${process.versions.node.split('.')[0]}`;
  writeFileSync(join(evidence, `${name}.tgz`), archive);
  writeFileSync(join(evidence, `${name}.json`), `${JSON.stringify({ status: 'passed', node: process.versions.node, sha256: createHash('sha256').update(archive).digest('hex'), excluded, kept, files: paths }, null, 2)}\n`);
});
