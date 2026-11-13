import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { extractManagedBlock } from '../.pbai4devs/scripts/lib/managed-content.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skills = [
  ['arquitetura', 'avaliar-arquitetura'],
  ['desenvolvimento', 'implementar-backend'],
  ['desenvolvimento', 'implementar-frontend'],
  ['qualidade', 'planejar-qa'],
  ['qualidade', 'validar-adversarial'],
  ['qualidade', 'revisar-codigo'],
  ['qualidade', 'avaliar-performance'],
];
const agents = ['arquiteto', 'especialista-backend', 'especialista-frontend', 'engenheiro-qa', 'analista-performance'];

function fixture(t) {
  mkdirSync(join(repository, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(repository, '.agent-tests/development-ecosystem-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  git('init', '--quiet');
  const put = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  const read = path => readFileSync(join(root, path), 'utf8');
  return { root, git, put, read };
}

function cli(root, args) {
  const result = spawnSync(process.execPath, [join(repository, 'bin/agentdevkit.mjs'), ...args, '--target', root, '--json'], {
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(result.status, 0, `${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, true, result.stdout);
  return output;
}

test('instala recursos de desenvolvimento nos clientes selecionados e preserva projeto existente', t => {
  const { root, git, put, read } = fixture(t);
  const custom = '.claude/skills/planejar-qa/SKILL.md';
  const humanSkill = '---\nname: planejar-qa\ndescription: Processo existente da equipe.\n---\n\n# QA da equipe\n\nPreserve o processo humano.\n';
  const gitignore = '# Arquivos do projeto\nnode_modules/\n.env\n!.env.example\n';
  const humanFiles = {
    '.gitignore': gitignore,
    'AGENTS.md': '# Instruções do projeto\n\nPreserve estas instruções.\n',
    '.claude/settings.json': '{"human":true}\n',
    [custom]: humanSkill,
  };
  for (const [path, content] of Object.entries(humanFiles)) put(path, content);
  git('add', '--all');
  const originalIndex = git('ls-files', '--stage', '-z');

  const installed = cli(root, ['init', '--agents', 'codex,claude,copilot', '--lang', 'pt']);
  assert.ok(installed.preserved.some(item => item.path === custom), custom);
  assert.equal(read('.gitignore'), gitignore);
  assert.equal(read('.claude/settings.json'), humanFiles['.claude/settings.json']);
  assert.ok(read('AGENTS.md').startsWith(humanFiles['AGENTS.md']));
  assert.ok(read(custom).startsWith(humanSkill));
  assert.ok(extractManagedBlock(read(custom))?.includes('.pbai4devs/skills/qualidade/planejar-qa/SKILL.md'));
  assert.equal(git('ls-files', '--stage', '-z'), originalIndex);

  for (const [group, skill] of skills) {
    const source = `.pbai4devs/skills/${group}/${skill}/SKILL.md`;
    assert.ok(existsSync(join(root, source)), source);
    for (const pointer of [`.agents/skills/${group}/${skill}/SKILL.md`, `.codex/skills/${group}/${skill}/SKILL.md`, `.claude/skills/${skill}/SKILL.md`, `.github/skills/${skill}/SKILL.md`]) {
      assert.ok(read(pointer).includes(source), `${pointer} deve apontar para ${source}`);
    }
  }
  for (const agent of agents) {
    const source = `.pbai4devs/agents/${agent}/AGENT.md`;
    assert.ok(existsSync(join(root, source)), source);
    for (const pointer of [`.claude/agents/${agent}.md`, `.github/agents/${agent}.agent.md`]) {
      assert.ok(read(pointer).includes(source), `${pointer} deve apontar para ${source}`);
    }
  }
  assert.equal(existsSync(join(root, '.cursor')), false);
  assert.equal(existsSync(join(root, '.opencode')), false);
  cli(root, ['doctor']);
  cli(root, ['sync', '--check']);
  assert.equal(read('.gitignore'), gitignore);
  assert.equal(git('ls-files', '--stage', '-z'), originalIndex);
});
