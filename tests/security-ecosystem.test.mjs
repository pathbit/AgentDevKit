import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { main } from '../src/cli.mjs';
import { extractManagedBlock } from '../.pbai4devs/scripts/lib/managed-content.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skills = ['revisar-seguranca', 'revisar-autorizacao', 'modelar-ameacas', 'corrigir-vulnerabilidade'];
const agents = ['planejador', 'implementador', 'validador', 'auditor-seguranca', 'documentador'];
function fixture(t) {
  mkdirSync(join(repository, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(repository, '.agent-tests/security-install-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '--quiet', root]).status, 0);
  return root;
}
async function cli(root, args) {
  let output = '';
  assert.equal(await main([...args, '--target', root, '--json'], { stdout: { write: text => { output += text; } } }), 0, output);
  return JSON.parse(output);
}

test('instalacao leva o ecossistema de seguranca sem baixar scanners nem sobrescrever recursos humanos', async t => {
  const root = fixture(t);
  const custom = '.claude/skills/revisar-seguranca/SKILL.md';
  const own = '# Procedimento de seguranca do projeto\n\nPreserve esta regra.\n';
  mkdirSync(dirname(join(root, custom)), { recursive: true });
  writeFileSync(join(root, custom), own);
  const installed = await cli(root, ['init', '--agents', 'claude,codex,copilot,opencode', '--lang', 'pt']);
  assert.ok(installed.preserved.some(item => item.path === custom));
  assert.ok(readFileSync(join(root, custom), 'utf8').startsWith(own));
  assert.match(extractManagedBlock(readFileSync(join(root, custom))), /\.pbai4devs\/skills\/seguranca\/revisar-seguranca\/SKILL\.md/);
  for (const skill of skills) {
    assert.ok(existsSync(join(root, `.pbai4devs/skills/seguranca/${skill}/SKILL.md`)), skill);
    assert.ok(existsSync(join(root, `.agents/skills/seguranca/${skill}/SKILL.md`)), skill);
  }
  for (const agent of agents) {
    assert.ok(existsSync(join(root, `.pbai4devs/agents/${agent}/AGENT.md`)), agent);
    assert.ok(existsSync(join(root, `.claude/agents/${agent}.md`)), agent);
  }
  assert.ok(existsSync(join(root, '.claude/commands/auditar-seguranca.md')));
  assert.ok(existsSync(join(root, '.github/prompts/auditar-seguranca.prompt.md')));
  assert.ok(existsSync(join(root, '.pbai4devs/rules/execucao-local/RULE.md')));
  for (const tool of ['gitleaks', 'osv-scanner', 'opengrep']) {
    assert.ok(existsSync(join(root, `.pbai4devs/tools/${tool}/TOOL.json`)));
    assert.equal(existsSync(join(root, `.pbai4devs/tools/${tool}/.local`)), false);
    assert.equal(existsSync(join(root, `.claude/tools/${tool}`)), false);
  }
  assert.match(readFileSync(join(root, '.opencode/agents/auditor-seguranca.md'), 'utf8'), /permissions:/);
  const help = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs'), '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0, help.stdout + help.stderr);
  assert.match(help.stdout, /run|check|update-data/);
  await cli(root, ['doctor']);
  await cli(root, ['sync', '--check']);
  const checked = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/verificar-recursos/SCRIPT.mjs')], { encoding: 'utf8', timeout: 60000 });
  assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  await cli(root, ['update']);
  assert.ok(readFileSync(join(root, custom), 'utf8').startsWith(own));
  assert.equal(existsSync(join(root, 'docs')), false, 'Guias do produto nao sao copiados ao consumidor.');
});
