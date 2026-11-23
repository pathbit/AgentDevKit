import test from 'node:test';
import assert from 'node:assert/strict';
import { lstatSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { adapters, resolveAdapters } from '../src/adapters/index.mjs';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const kinds = { skills: 'SKILL.md', agents: 'AGENT.md', commands: 'COMMAND.md', rules: 'RULE.md' };

function files(root, directory, principal) {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const child = `${directory}/${entry.name}`;
    return entry.isDirectory() ? files(root, child, principal) : entry.isFile() && entry.name === principal ? [child] : [];
  });
}

// These are the public client layouts, independently checked against the
// installed package's manifest and generated references.
function clientPath(source, kind, format) {
  const withoutHub = source.slice('.pbai4devs/'.length);
  if (format === 'agrupado') return withoutHub;
  const slug = posix.basename(posix.dirname(source));
  if (format === 'plano') return kind === 'skills' ? `skills/${slug}/SKILL.md` : `${kind}/${slug}.md`;
  const ext = { arquivo: '.md', mdc: '.mdc', instrucoes: '.instructions.md', prompt: '.prompt.md', agente: '.agent.md' }[format];
  assert.ok(ext, `Formato desconhecido: ${format}`);
  const category = { instrucoes: 'instructions', prompt: 'prompts' }[format] || kind;
  const folder = posix.dirname(withoutHub).slice(kind.length);
  return `${category}${folder}${ext}`;
}

// A referência explícita permanece no hub; não se contabiliza como espelho
// nativo nem comprova que o cliente tenha lido a regra.
function verifyClaudeOmission(root, source, destination, trigger, omissions) {
  assert.ok(['manual', 'model_decision'].includes(trigger));
  const original = readFileSync(join(root, source), 'utf8');
  const header = original.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  assert.ok(header, `${source} sem frontmatter`);
  const triggers = [...header[1].matchAll(/^trigger:\s*(.*?)\s*$/gm)];
  assert.equal(triggers.length, 1, `${source} deve declarar um único trigger suportado`);
  assert.ok([trigger, `"${trigger}"`, `'${trigger}'`].includes(triggers[0][1]), `${source} diverge do catálogo`);
  assert.throws(() => lstatSync(join(root, destination)), error => error.code === 'ENOENT', `${destination} não deve existir`);
  const matches = omissions.filter(item => item.source === source);
  assert.deepEqual(matches, [{ source, target: destination, trigger, status: 'explicit-reference-planned' }]);
  function visit(folder) {
    let entries;
    try { entries = readdirSync(folder, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const full = join(folder, entry.name);
      if (entry.isSymbolicLink()) assert.fail(`${full} é link simbólico de escopo não verificado`);
      else if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        const text = readFileSync(full, 'utf8');
        for (const link of text.matchAll(/\[origem\]\(([^)]+)\)/g)) {
          assert.notEqual(relative(root, resolve(dirname(full), decodeURIComponent(link[1]))).split('\\').join('/'), source, `${full} ativa a fonte por destino alternativo`);
        }
      }
    }
  }
  visit(join(root, '.claude/rules'));
}

test('cada recurso instalado aponta à origem em cada cliente selecionado', async t => {
  const base = join(sourceRoot, '.agent-tests'); mkdirSync(base, { recursive: true });
  const root = realpathSync(mkdtempSync(join(base, 'resource-coverage-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const gitConfig = join(root, '.test-gitconfig'), gitExclude = join(root, '.test-gitignore');
  writeFileSync(gitExclude, '');
  writeFileSync(gitConfig, `[core]\n\texcludesFile = ${JSON.stringify(gitExclude)}\n\tfsmonitor = false\n`);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
  Object.assign(env, { GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: gitConfig });
  const git = spawnSync('git', ['-c', 'init.defaultBranch=main', 'init', '--quiet', '--template=', root], { encoding: 'utf8', env });
  assert.equal(git.status, 0, git.stderr);
  const init = spawnSync(process.execPath, [join(sourceRoot, 'bin/agentdevkit.mjs'), 'init', '--target', root, '--agents', 'all', '--yes', '--json'], { encoding: 'utf8', env, timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
  assert.equal(init.status, 0, init.stderr || init.stdout);
  const initialized = JSON.parse(init.stdout);
  assert.equal(initialized.ok, true);
  const rows = readFileSync(join(root, '.pbai4devs/espelhos.conf'), 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => line.split('|'));
  const clients = rows.filter(row => row[0] === 'agente');
  const policy = JSON.parse(readFileSync(join(root, '.pbai4devs/templates/clients/ADAPTERS.json'), 'utf8'));
  const catalog = JSON.parse(readFileSync(join(root, '.pbai4devs/catalog.json'), 'utf8'));
  assert.deepEqual(policy, JSON.parse(readFileSync(join(sourceRoot, '.pbai4devs/templates/clients/ADAPTERS.json'), 'utf8')));
  assert.deepEqual(clients, policy.adapters.map(({ root }) => ['agente', root, 'agrupado']));
  const formats = policy.adapters.flatMap(adapter => Object.entries(adapter.formats)
    .map(([kind, format]) => ['formato', adapter.root, kind, format]));
  assert.deepEqual(rows.filter(row => row[0] === 'formato'), formats);
  const sources = Object.fromEntries(Object.entries(kinds).map(([kind, principal]) => [kind, files(root, `.pbai4devs/${kind}`, principal)]));
  assert.ok(sources.skills.length >= 41 && sources.agents.length >= 11 && sources.commands.length >= 18 && sources.rules.length >= 8);
  const supportedRoutes = policy.adapters.reduce((count, adapter) => count
    + Object.entries(sources).filter(([kind]) => adapter.formats[kind] !== 'nenhum')
      .reduce((subtotal, [, paths]) => subtotal + paths.length, 0), 0);
  const omissions = initialized.scopeOmissions || [];
  assert.ok(Array.isArray(omissions));
  let verified = 0, referenceOnly = 0;
  for (const [, client, baseFormat] of clients) await t.test(client, () => {
    for (const [kind, paths] of Object.entries(sources)) for (const source of paths) {
      const format = rows.find(row => row[0] === 'formato' && row[1] === client && row[2] === kind)?.[3] || baseFormat;
      if (format === 'nenhum') continue;
      let destination = `${client}/${clientPath(source, kind, format)}`;
      if (client === '.claude' && kind === 'rules') {
        const trigger = catalog.rules.find(rule => rule.path === source)?.trigger;
        assert.ok(trigger, `${source} sem trigger`);
        if (['manual', 'model_decision'].includes(trigger)) {
          verifyClaudeOmission(root, source, destination, trigger, omissions);
          referenceOnly++;
          continue;
        }
      }
      if (client === '.github' && kind === 'rules' && format === 'instrucoes') {
        const trigger = catalog.rules.find(rule => rule.path === source)?.trigger;
        assert.ok(trigger, `${source} sem trigger`);
        const native = rows.some(row => row[0] === 'nativo' && row[1] === destination && row[2] === source && row[3]);
        if (['manual', 'model_decision'].includes(trigger) && !native) {
          destination = `${client}/${source.slice('.pbai4devs/'.length)}`;
        }
      }
      const full = join(root, destination);
      assert.ok(statSync(full).isFile(), `${destination} não é arquivo`);
      const text = readFileSync(full, 'utf8');
      const link = text.match(/\[origem\]\(([^)]+)\)/);
      assert.ok(link, `${destination} sem referência`);
      assert.equal(relative(root, resolve(dirname(full), decodeURIComponent(link[1]))).split('\\').join('/'), source, `${destination} aponta para outra origem`);
      verified++;
    }
  });
  assert.equal(verified + referenceOnly, supportedRoutes, 'Cada rota da política deve ser verificada ou constar como omissão Claude comprovada');
  assert.equal(omissions.length, referenceOnly, 'Omissões extras ou duplicadas não contam como cobertura nativa');
});

test('verificação de omissão Claude rejeita arquivo, duplicidade, link alternativo e divergência de trigger', t => {
  const root = mkdtempSync(join(tmpdir(), 'adk-coverage-omission-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = '.pbai4devs/rules/demo/RULE.md', target = '.claude/rules/demo/RULE.md';
  const put = (p, value) => { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), value); };
  put(source, '---\ntrigger: manual\n---\n\n# Demo\n');
  const expected = [{ source, target, trigger: 'manual', status: 'explicit-reference-planned' }];
  verifyClaudeOmission(root, source, target, 'manual', expected);
  assert.throws(() => verifyClaudeOmission(root, source, target, 'manual', []));
  assert.throws(() => verifyClaudeOmission(root, source, target, 'manual', [...expected, ...expected]));
  assert.throws(() => verifyClaudeOmission(root, source, target, 'model_decision', expected));
  put(source, '---\ntrigger: always_on\ntrigger: manual\n---\n\n# Demo\n');
  assert.throws(() => verifyClaudeOmission(root, source, target, 'manual', expected));
  put(source, '---\ntrigger: manual\n---\n\n# Demo\n');
  put('.claude/rules/alternate.md', '[origem](../../.pbai4devs/rules/demo/RULE.md)');
  assert.throws(() => verifyClaudeOmission(root, source, target, 'manual', expected));
  rmSync(join(root, '.claude/rules/alternate.md'));
  put(target, '# Regra indevidamente carregável');
  assert.throws(() => verifyClaudeOmission(root, source, target, 'manual', expected));
  rmSync(join(root, target));
  if (process.platform !== 'win32') {
    symlinkSync('ausente', join(root, target));
    assert.throws(() => verifyClaudeOmission(root, source, target, 'manual', expected));
    rmSync(join(root, target));
    symlinkSync('ausente', join(root, '.claude/rules/alternate.md'));
    assert.throws(() => verifyClaudeOmission(root, source, target, 'manual', expected));
  }
});

test('todas as combinações de clientes preservam dependências e seleção determinística', () => {
  const policy = JSON.parse(readFileSync(join(sourceRoot, '.pbai4devs/templates/clients/ADAPTERS.json'), 'utf8'));
  const ids = policy.adapters.map(adapter => adapter.id);
  assert.deepEqual(adapters.map(adapter => adapter.id), ids);
  const byId = new Map(policy.adapters.map(adapter => [adapter.id, adapter]));
  assert.ok(ids.length > 0 && ids.length <= 20, 'A matriz precisa caber em uma máscara segura.');
  const total = 2 ** ids.length;
  for (let mask = 1; mask < total; mask++) {
    const chosen = ids.filter((_, index) => mask & (1 << index));
    const closure = new Set(chosen);
    for (const id of closure) for (const dependency of byId.get(id).requires) closure.add(dependency);
    const expectedAdapters = policy.adapters.filter(adapter => closure.has(adapter.id));
    const clientRoots = new Set(expectedAdapters.flatMap(adapter => [adapter.root, ...adapter.extraRoots]));
    const skillRoots = [...new Set(expectedAdapters.map(adapter => adapter.skillFallback).filter(root => root && !clientRoots.has(root)))];
    const expectedRoots = [...skillRoots, ...clientRoots];
    const requestedEntries = new Set([...policy.entrypoints, ...chosen.flatMap(id => byId.get(id).entrypoints)]);
    const expectedEntries = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'].filter(name => requestedEntries.has(name));
    const selection = resolveAdapters(chosen);
    assert.deepEqual(selection.clients, chosen, `seleção ${mask}`);
    assert.deepEqual(selection.adapters.map(adapter => adapter.id), expectedAdapters.map(adapter => adapter.id), `dependências ${mask}`);
    assert.deepEqual(selection.roots, expectedRoots, `raízes ${mask}`);
    assert.deepEqual(selection.skillRoots, skillRoots, `raízes de skills ${mask}`);
    assert.deepEqual(selection.entrypoints, expectedEntries, `entradas ${mask}`);
    assert.deepEqual(resolveAdapters([...chosen].reverse()).roots, expectedRoots, `ordem ${mask}`);
  }
});
