import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
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
    timeout: 180000,
  });
  assert.equal(result.status, 0, `agentdevkit ${args.join(' ')}: ${result.error?.stack || ''}\nsignal: ${result.signal || 'none'}\n${result.stdout || ''}${result.stderr || ''}`);
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
  put('package.json', '{"name":"existing-project","scripts":{"test":"node --test"}}\n');
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
    for (const pointer of [`.agents/skills/${group}/${skill}/SKILL.md`, `.claude/skills/${skill}/SKILL.md`, `.github/skills/${skill}/SKILL.md`]) {
      assert.ok(read(pointer).includes(source), `${pointer} deve apontar para ${source}`);
    }
    assert.equal(existsSync(join(root, `.codex/skills/${group}/${skill}/SKILL.md`)), false);
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
  const next = cli(root, ['next', '--intent', 'run']);
  assert.ok(next.next.some(step => step.skill === 'preparar-dev'));
  for (const name of ['diagnosticar-ambiente', 'inspecionar-projeto']) {
    put(`${name}/SCRIPT.mjs`, 'process.exitCode = 7;\n');
  }
  const guide = read('.pbai4devs/commands/diagnosticar/COMMAND.md');
  const scripts = [...guide.matchAll(/^node (\S+\/SCRIPT\.mjs)$/gm)].map(match => match[1]);
  assert.deepEqual(scripts, [
    '.pbai4devs/scripts/diagnosticar-ambiente/SCRIPT.mjs',
    '.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs',
  ]);
  const inspect = (script, ...args) => {
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: root, encoding: 'utf8', timeout: 30000,
    });
    assert.equal(result.status, 0, result.error?.message || result.stderr);
    return JSON.parse(result.stdout);
  };
  const [diagnose, inventory] = scripts;
  const environment = inspect(diagnose, '--no-docker-probe');
  assert.equal(environment.docker.daemonStatus, environment.docker.executable ? 'not-requested' : 'not-found');
  assert.equal(inspect(inventory).documentation.scan.complete, true);
  const catalog = JSON.parse(read('.pbai4devs/catalog.json'));
  const command = id => catalog.commands.find(item => item.id === id);
  const profile = id => catalog.agents.find(item => item.id === id);
  const skill = name => catalog.skills.find(item => item.name === name);
  const automation = id => catalog.scripts.find(item => item.id === id);
  assert.ok(command('preparar-dev').references.includes(skill('preparar-dev').path));
  for (const [id, resources] of [
    ['planejar-entrega', [profile('planejador'), skill('proximos-passos')]],
    ['implementar-entrega', [profile('implementador'), skill('implementar-spec'), command('validar-entrega')]],
    ['validar-entrega', [profile('validador'), skill('verificar-trabalho'), command('revisar-entrega')]],
    ['revisar-entrega', [profile('revisor'), skill('atualizar-documentacao')]],
  ]) {
    for (const resource of resources) assert.ok(command(id).references.includes(resource.path), `${id} → ${resource.path}`);
  }
  const verify = automation('verificar-recursos');
  assert.ok(read(command('verificar-agentes').path).includes(verify.argv.join(' ')));
  const verified = spawnSync(process.execPath, verify.argv.slice(1), { cwd: root, encoding: 'utf8', timeout: 60000 });
  assert.equal(verified.status, 0, verified.error?.message || verified.stderr);
  assert.match(verified.stdout, /^recursos=passed$/m);
  assert.equal(existsSync(join(root, 'node_modules')), false);
  assert.equal(existsSync(join(root, 'docs')), false);
  for (const name of ['diagnosticar-ambiente', 'inspecionar-projeto']) {
    assert.equal(read(`${name}/SCRIPT.mjs`), 'process.exitCode = 7;\n');
  }
  assert.equal(read('.gitignore'), gitignore);
  assert.equal(git('ls-files', '--stage', '-z'), originalIndex);
});
