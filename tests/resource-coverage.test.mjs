import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
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

test('cada recurso instalado aponta à origem em cada cliente selecionado', async t => {
  const base = join(sourceRoot, '.agent-tests'); mkdirSync(base, { recursive: true });
  const root = realpathSync(mkdtempSync(join(base, 'resource-coverage-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_NOSYSTEM: '1' };
  const git = spawnSync('git', ['-c', 'init.defaultBranch=main', 'init', '--quiet', '--template=', root], { encoding: 'utf8', env });
  assert.equal(git.status, 0, git.stderr);
  const init = spawnSync(process.execPath, [join(sourceRoot, 'bin/agentdevkit.mjs'), 'init', '--target', root, '--agents', 'all', '--yes', '--json'], { encoding: 'utf8', env, timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
  assert.equal(init.status, 0, init.stderr || init.stdout);
  assert.equal(JSON.parse(init.stdout).ok, true);
  const rows = readFileSync(join(root, '.pbai4devs/espelhos.conf'), 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => line.split('|'));
  const clients = rows.filter(row => row[0] === 'agente');
  const policy = JSON.parse(readFileSync(join(root, '.pbai4devs/templates/clients/ADAPTERS.json'), 'utf8'));
  assert.equal(clients.length, policy.adapters.length);
  const sources = Object.fromEntries(Object.entries(kinds).map(([kind, principal]) => [kind, files(root, `.pbai4devs/${kind}`, principal)]));
  assert.ok(sources.skills.length >= 41 && sources.agents.length >= 11 && sources.commands.length >= 18 && sources.rules.length >= 8);
  let verified = 0;
  for (const [, client, baseFormat] of clients) await t.test(client, () => {
    for (const [kind, paths] of Object.entries(sources)) for (const source of paths) {
      const format = rows.find(row => row[0] === 'formato' && row[1] === client && row[2] === kind)?.[3] || baseFormat;
      if (format === 'nenhum') continue;
      let destination = `${client}/${clientPath(source, kind, format)}`;
      if (client === '.gemini' && kind === 'commands') destination = destination.replace(/\.md$/, '.toml');
      const full = join(root, destination);
      assert.ok(statSync(full).isFile(), `${destination} não é arquivo`);
      const text = readFileSync(full, 'utf8');
      if (destination.endsWith('.toml')) assert.ok(text.includes(`@{${source}}`), `${destination} não aponta à origem`);
      else {
        const link = text.match(/\[origem\]\(([^)]+)\)/);
        assert.ok(link, `${destination} sem referência`);
        assert.equal(relative(root, resolve(dirname(full), decodeURIComponent(link[1]))).split('\\').join('/'), source, `${destination} aponta para outra origem`);
      }
      verified++;
    }
  });
  assert.ok(verified >= 1000, `Cobertura insuficiente: ${verified} referências`);
});

test('todas as combinações de clientes preservam dependências e seleção determinística', () => {
  const ids = adapters.map(adapter => adapter.id);
  const policy = JSON.parse(readFileSync(join(sourceRoot, '.pbai4devs/templates/clients/ADAPTERS.json'), 'utf8'));
  assert.ok(ids.length > 0 && ids.length <= 20, 'A matriz precisa caber em uma máscara segura.');
  const total = 2 ** ids.length;
  for (let mask = 1; mask < total; mask++) {
    const chosen = ids.filter((_, index) => mask & (1 << index));
    const closure = new Set(chosen);
    for (const id of closure) for (const dependency of adapters.find(adapter => adapter.id === id).requires) closure.add(dependency);
    const expectedAdapters = adapters.filter(adapter => closure.has(adapter.id));
    const expectedRoots = [...new Set(expectedAdapters.flatMap(adapter => [adapter.root, ...adapter.extraRoots]))];
    const requestedEntries = new Set([...policy.entrypoints, ...adapters.filter(adapter => chosen.includes(adapter.id)).flatMap(adapter => adapter.entrypoints)]);
    const expectedEntries = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'].filter(name => requestedEntries.has(name));
    const selection = resolveAdapters(chosen);
    assert.deepEqual(selection.clients, chosen, `seleção ${mask}`);
    assert.deepEqual(selection.adapters.map(adapter => adapter.id), expectedAdapters.map(adapter => adapter.id), `dependências ${mask}`);
    assert.deepEqual(selection.roots, expectedRoots, `raízes ${mask}`);
    assert.deepEqual(selection.entrypoints, expectedEntries, `entradas ${mask}`);
    assert.deepEqual(resolveAdapters([...chosen].reverse()).roots, expectedRoots, `ordem ${mask}`);
  }
  assert.ok(total - 1 >= 10000, `Matriz insuficiente: ${total - 1}`);
});
