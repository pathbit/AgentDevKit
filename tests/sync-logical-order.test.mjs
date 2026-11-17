import '../.pbai4devs/scripts/lib/test-git-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, sep } from 'node:path';
import { synchronize } from '../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';

test('sync remove referência obsoleta antes de criar a nova e preserva arquivos humanos', { timeout: 120000 }, t => {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-sync-order-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
  const git = (...args) => {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  const put = (path, content) => { const file = join(root, path); fs.mkdirSync(dirname(file), { recursive: true }); fs.writeFileSync(file, content); };
  git('init', '-q');
  put('.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(`.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
  }
  put('.pbai4devs/skills/zeta/SKILL.md', '---\nname: zeta\ndescription: Antiga.\n---\n\n# Zeta\n');
  synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  const stale = join(root, '.claude/skills/zeta/SKILL.md'), created = join(root, '.claude/skills/alfa/SKILL.md');
  assert.ok(fs.existsSync(stale));
  put('.claude/skills/zeta/nota-humana.md', 'Texto próprio.\n'); put('.gitignore', '# regra humana\n');
  git('add', '-f', '--', '.claude/skills/zeta/nota-humana.md', '.gitignore');
  const index = fs.readFileSync(join(root, '.git/index')), ignore = fs.readFileSync(join(root, '.gitignore'));
  fs.rmSync(join(root, '.pbai4devs/skills/zeta'), { recursive: true });
  put('.pbai4devs/skills/alfa/SKILL.md', '---\nname: alfa\ndescription: Nova.\n---\n\n# Alfa\n');
  const originalRemove = fs.rmSync, originalLink = fs.linkSync, events = [];
  t.mock.method(fs, 'rmSync', (path, ...args) => { if (path === stale) events.push('remover'); return originalRemove(path, ...args); });
  t.mock.method(fs, 'linkSync', (from, to) => { if (to === created) events.push('criar'); return originalLink(from, to); });
  syncBuiltinESMExports();
  synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  assert.deepEqual(events, ['remover', 'criar']);
  assert.equal(fs.existsSync(stale), false); assert.equal(fs.existsSync(created), true);
  assert.equal(fs.readFileSync(join(root, '.claude/skills/zeta/nota-humana.md'), 'utf8'), 'Texto próprio.\n');
  assert.deepEqual(fs.readFileSync(join(root, '.git/index')), index);
  assert.deepEqual(fs.readFileSync(join(root, '.gitignore')), ignore);
});

test('sync cria pais compartilhados somente quando necessários e conserva diretório humano', { timeout: 120000 }, t => {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'adk-sync-parents-')));
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); fs.rmSync(root, { recursive: true, force: true }); });
  const put = (path, content) => { const file = join(root, path); fs.mkdirSync(dirname(file), { recursive: true }); fs.writeFileSync(file, content); };
  put('.pbai4devs/espelhos.conf', 'agente|.claude|plano\n');
  for (const name of ['agents.ignore', 'shared.ignore', 'local.ignore', 'clients.json']) {
    put(`.pbai4devs/templates/gitignore/${name}`, fs.readFileSync(new URL(`../.pbai4devs/templates/gitignore/${name}`, import.meta.url)));
  }
  for (const name of ['alfa', 'beta']) put(`.pbai4devs/skills/${name}/SKILL.md`, `---\nname: ${name}\ndescription: Teste.\n---\n\n# ${name}\n`);
  put('.claude/nota-humana.md', 'Conteúdo próprio.\n');
  if (process.platform !== 'win32') fs.chmodSync(join(root, '.claude'), 0o700);
  const mode = fs.statSync(join(root, '.claude')).mode & 0o777;
  const originalMkdir = fs.mkdirSync, made = [];
  t.mock.method(fs, 'mkdirSync', (path, ...args) => {
    if (typeof path === 'string' && path.startsWith(join(root, '.claude') + sep)) made.push(path.slice(root.length + 1).split(sep).join('/'));
    return originalMkdir(path, ...args);
  });
  syncBuiltinESMExports();
  synchronize({ root, localIgnores: false, generateEntrypoints: false, output() {} });
  assert.deepEqual(made, ['.claude/skills', '.claude/skills/alfa', '.claude/skills/beta']);
  for (const name of ['alfa', 'beta']) assert.ok(fs.existsSync(join(root, `.claude/skills/${name}/SKILL.md`)));
  assert.equal(fs.readFileSync(join(root, '.claude/nota-humana.md'), 'utf8'), 'Conteúdo próprio.\n');
  assert.equal(fs.statSync(join(root, '.claude')).mode & 0o777, mode);
});
