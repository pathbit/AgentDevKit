import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { applyPlan, planInstallation } from '../src/install.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(repository, 'bin/agentdevkit.mjs');
const oldRoot = '.pbai4devs/estado';
const newRoot = '.pbai4devs/state';
const read = (root, path) => readFileSync(join(root, path));
function put(root, path, value) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), value);
}
function git(root, ...args) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}`);
  return result.stdout;
}
function cli(root, args, expected = 0) {
  const result = spawnSync(process.execPath, [bin, ...args, '--target', root, '--json'], {
    encoding: 'utf8', timeout: 180000,
  });
  assert.equal(result.status, expected, `${args.join(' ')}: ${result.error?.stack || ''}\n${result.stdout || ''}\n${result.stderr || ''}`);
  return JSON.parse(result.stdout);
}
function fixture(t) {
  const base = join(repository, '.agent-tests');
  mkdirSync(base, { recursive: true });
  const root = mkdtempSync(join(base, 'state-migration-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '--quiet');
  const ignore = Buffer.from('# Regras humanas\r\nnode_modules/\r\n.env\r\n!.env.example\r\n');
  put(root, '.gitignore', ignore);
  put(root, 'AGENTS.md', '# Instruções humanas\n\nNão substituir.\n');
  put(root, 'README.md', '# Projeto humano\n');
  cli(root, ['init', '--agents', 'codex,claude', '--lang', 'es']);
  const manifestPath = `${newRoot}/agentdevkit.json`;
  const manifest = JSON.parse(read(root, manifestPath));
  manifest.version = '0.0.16';
  for (const key of Object.keys(manifest.files || {})) {
    if (key.startsWith(`${newRoot}/`)) {
      manifest.files[key.replace(`${newRoot}/`, `${oldRoot}/`)] = manifest.files[key];
      delete manifest.files[key];
    }
  }
  put(root, manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const config = Buffer.from('---\npreparacao: concluido\nconfiguracao_tecnica: pendente\n---\n\n# Decisões da equipe\n\nNão reescrever.\n');
  const custom = Buffer.from('Arquivo próprio\r\ncom conteúdo preservado.\r\n');
  const catalog = '.agents/skills.json';
  const digest = createHash('sha256').update(read(root, catalog)).digest('hex');
  const derived = Buffer.from(`${JSON.stringify({ schemaVersion: 1, entries: {}, files: {}, blocks: {}, outputs: { [catalog]: digest } })}\n`);
  put(root, `${newRoot}/configuracao/ESTADO.md`, config);
  put(root, `${newRoot}/outros/minhas-notas.txt`, custom);
  put(root, `${newRoot}/derived.json`, derived);
  renameSync(join(root, newRoot), join(root, oldRoot));
  git(root, 'add', '--', '.gitignore', 'AGENTS.md', 'README.md', `${oldRoot}/configuracao/ESTADO.md`, `${oldRoot}/outros/minhas-notas.txt`);
  put(root, `${oldRoot}/configuracao/ESTADO.md`, Buffer.concat([config, Buffer.from('\nAlteração não preparada.\n')]));
  return { root, ignore, config: read(root, `${oldRoot}/configuracao/ESTADO.md`), custom, derived,
    index: git(root, 'ls-files', '--stage', '-z'), agents: read(root, 'AGENTS.md'), readme: read(root, 'README.md') };
}

test('migra estado legado preservando dados humanos, seleção, índice e ignore; atualização é idempotente', t => {
  const f = fixture(t), { root } = f;
  const oldManifest = read(root, `${oldRoot}/agentdevkit.json`);
  const preview = cli(root, ['update', '--dry-run']);
  assert.equal(preview.ok, true);
  assert.ok(preview.plan.some(change => change.path.startsWith(`${newRoot}/`)), 'o plano apresenta a migração');
  assert.equal(existsSync(join(root, newRoot)), false);
  assert.deepEqual(read(root, `${oldRoot}/agentdevkit.json`), oldManifest);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);

  const result = cli(root, ['update']);
  assert.equal(result.ok, true);
  assert.equal(existsSync(join(root, oldRoot)), false);
  assert.deepEqual(read(root, `${newRoot}/configuracao/ESTADO.md`), f.config);
  assert.deepEqual(read(root, `${newRoot}/outros/minhas-notas.txt`), f.custom);
  assert.deepEqual(read(root, `${newRoot}/derived.json`), f.derived);
  assert.deepEqual(read(root, '.gitignore'), f.ignore);
  assert.deepEqual(read(root, 'AGENTS.md'), f.agents);
  assert.deepEqual(read(root, 'README.md'), f.readme);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
  const manifest = JSON.parse(read(root, `${newRoot}/agentdevkit.json`));
  assert.equal(manifest.language, 'es');
  assert.deepEqual([...manifest.clients].sort(), ['claude', 'codex']);
  assert.equal(cli(root, ['update', '--dry-run']).plan.length, 0);
  assert.equal(cli(root, ['update']).changed, false);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
  assert.deepEqual(read(root, '.gitignore'), f.ignore);
});

test('conflito entre pastas legada e atual não substitui dados nem altera o índice, mesmo com force', t => {
  const f = fixture(t), { root } = f;
  const existing = Buffer.from('Conteúdo de state do projeto.\n');
  put(root, `${newRoot}/outros/minhas-notas.txt`, existing);
  const oldManifest = read(root, `${oldRoot}/agentdevkit.json`);
  for (const args of [['update', '--dry-run'], ['update', '--force']]) {
    const result = cli(root, args, 1);
    assert.equal(result.ok, false);
    assert.deepEqual(read(root, `${newRoot}/outros/minhas-notas.txt`), existing);
    assert.deepEqual(read(root, `${oldRoot}/outros/minhas-notas.txt`), f.custom);
    assert.deepEqual(read(root, `${oldRoot}/agentdevkit.json`), oldManifest);
    assert.deepEqual(read(root, '.gitignore'), f.ignore);
    assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
  }
});

test('comandos legados somente de consulta não migram nem alteram a instalação', t => {
  const f = fixture(t), { root } = f;
  const previous = read(root, `${oldRoot}/README.md`);
  const state = read(root, `${oldRoot}/agentdevkit.json`);
  const syncScript = read(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs');
  const excludes = read(root, '.git/info/exclude');
  const status = git(root, 'status', '--porcelain=v1', '-z');
  for (const args of [['agents'], ['lang']]) assert.equal(cli(root, args).ok, true);
  for (const command of [['sync'], ['agents', 'claude'], ['lang', 'pt']]) {
    for (const options of [[], ['--dry-run'], ['--force']]) {
      const result = cli(root, [...command, ...options], 1);
      assert.equal(result.ok, false);
      assert.equal(result.error?.code, 'E_UPGRADE');
      assert.match(JSON.stringify(result), /update/i);
      assert.equal(existsSync(join(root, newRoot)), false);
      assert.deepEqual(read(root, `${oldRoot}/README.md`), previous);
      assert.deepEqual(read(root, `${oldRoot}/agentdevkit.json`), state);
      assert.deepEqual(read(root, `${oldRoot}/configuracao/ESTADO.md`), f.config);
      assert.deepEqual(read(root, `${oldRoot}/outros/minhas-notas.txt`), f.custom);
      assert.deepEqual(read(root, '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs'), syncScript);
      assert.deepEqual(read(root, '.git/info/exclude'), excludes);
      assert.deepEqual(read(root, '.gitignore'), f.ignore);
      assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
      assert.equal(git(root, 'status', '--porcelain=v1', '-z'), status);
    }
  }
  const doctor = cli(root, ['doctor'], 1);
  assert.equal(doctor.ok, false);
  assert.match(JSON.stringify(doctor), /update/i);
  assert.equal(existsSync(join(root, newRoot)), false);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
  assert.equal(cli(root, ['update']).ok, true);
  assert.deepEqual(read(root, `${newRoot}/README.md`), previous);
  const current = JSON.parse(read(root, `${newRoot}/agentdevkit.json`));
  assert.equal(current.files[`${newRoot}/README.md`], createHash('sha256').update(previous).digest('hex'));
  assert.equal(existsSync(join(root, oldRoot)), false);
  assert.deepEqual(read(root, `${newRoot}/configuracao/ESTADO.md`), f.config);
  assert.deepEqual(read(root, `${newRoot}/outros/minhas-notas.txt`), f.custom);
  assert.deepEqual(read(root, '.gitignore'), f.ignore);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
});

test('README legado modificado continua humano e não causa divergência em doctor, sync ou atualização', t => {
  const f = fixture(t), { root } = f;
  const human = Buffer.from('---\r\ndescription: Orientações da equipe.\r\n---\r\n\r\n# Meu estado\r\n\r\nConteúdo próprio.\r\n');
  put(root, `${oldRoot}/README.md`, human);
  assert.equal(cli(root, ['update']).ok, true);
  assert.deepEqual(read(root, `${newRoot}/README.md`), human);
  const current = JSON.parse(read(root, `${newRoot}/agentdevkit.json`));
  assert.equal(Object.hasOwn(current.files, `${newRoot}/README.md`), false);
  assert.equal(cli(root, ['doctor']).ok, true);
  assert.equal(cli(root, ['sync', '--check']).ok, true);
  assert.equal(cli(root, ['update', '--dry-run']).plan.length, 0);
  assert.deepEqual(read(root, `${newRoot}/README.md`), human);
  assert.deepEqual(read(root, '.gitignore'), f.ignore);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
});

test('README legado diferente do template é preservado como humano sem divergência posterior', t => {
  const f = fixture(t), { root } = f;
  const readme = Buffer.from('---\ndescription: Conteúdo de uma versão anterior.\n---\n\n# Estado anterior\n\nTexto da versão antiga.\n');
  const digest = createHash('sha256').update(readme).digest('hex');
  put(root, `${oldRoot}/README.md`, readme);
  const manifest = JSON.parse(read(root, `${oldRoot}/agentdevkit.json`));
  manifest.files[`${oldRoot}/README.md`] = digest;
  put(root, `${oldRoot}/agentdevkit.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  assert.equal(cli(root, ['update']).ok, true);
  assert.deepEqual(read(root, `${newRoot}/README.md`), readme);
  const current = JSON.parse(read(root, `${newRoot}/agentdevkit.json`));
  assert.equal(Object.hasOwn(current.files, `${newRoot}/README.md`), false);
  assert.equal(cli(root, ['doctor']).ok, true);
  assert.equal(cli(root, ['sync', '--check']).ok, true);
  assert.equal(cli(root, ['update', '--dry-run']).plan.length, 0);
  assert.equal(cli(root, ['update']).changed, false);
  assert.deepEqual(read(root, `${newRoot}/README.md`), readme);
  assert.deepEqual(read(root, '.gitignore'), f.ignore);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
});

test('README gerenciado no caminho atual acompanha atualizações do template', t => {
  const base = join(repository, '.agent-tests');
  mkdirSync(base, { recursive: true });
  const root = mkdtempSync(join(base, 'state-readme-current-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '--quiet');
  put(root, '.gitignore', '# Humano\nnode_modules/\n');
  cli(root, ['init', '--agents', 'claude']);
  const readmePath = `${newRoot}/README.md`;
  const previous = Buffer.from('---\ndescription: Template de versão anterior.\n---\n\n# Estado anterior\n');
  const manifestPath = `${newRoot}/agentdevkit.json`;
  const manifest = JSON.parse(read(root, manifestPath));
  put(root, readmePath, previous);
  manifest.files[readmePath] = createHash('sha256').update(previous).digest('hex');
  put(root, manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  assert.equal(cli(root, ['update']).ok, true);
  const expected = read(repository, '.pbai4devs/state/README.md');
  assert.notDeepEqual(expected, previous);
  assert.deepEqual(read(root, readmePath), expected);
  const current = JSON.parse(read(root, manifestPath));
  assert.equal(current.files[readmePath], createHash('sha256').update(expected).digest('hex'));
  assert.equal(cli(root, ['doctor']).ok, true);
  assert.equal(cli(root, ['sync', '--check']).ok, true);
  assert.equal(cli(root, ['update', '--dry-run']).plan.length, 0);
});

test('referência legada na configuração bloqueia migração até ser ajustada sem perda', t => {
  const f = fixture(t), { root } = f;
  const oldPrd = `${oldRoot}/documentos/PRD.md`, newPrd = `${newRoot}/documentos/PRD.md`;
  const config = Buffer.from(`---\npreparacao: concluido\nconfiguracao_tecnica: pendente\ndocumentos:\n  prd: ${oldPrd}\n---\n\n# Decisões\n\nConteúdo próprio.\n`);
  const document = Buffer.from('---\nstatus: aprovado\n---\n\n# PRD da equipe\n');
  put(root, `${oldRoot}/configuracao/ESTADO.md`, config);
  put(root, oldPrd, document);
  const manifest = read(root, `${oldRoot}/agentdevkit.json`);
  const readme = read(root, `${oldRoot}/README.md`);
  const excludes = read(root, '.git/info/exclude');
  const status = git(root, 'status', '--porcelain=v1', '-z');
  for (const options of [[], ['--dry-run'], ['--force']]) {
    const result = cli(root, ['update', ...options], 1);
    assert.equal(result.ok, false);
    assert.equal(result.error?.code, 'E_LEGACY_PATH');
    assert.match(JSON.stringify(result), /estado/);
    assert.match(JSON.stringify(result), /state/);
    assert.equal(existsSync(join(root, newRoot)), false);
    assert.deepEqual(read(root, `${oldRoot}/configuracao/ESTADO.md`), config);
    assert.deepEqual(read(root, oldPrd), document);
    assert.deepEqual(read(root, `${oldRoot}/agentdevkit.json`), manifest);
    assert.deepEqual(read(root, `${oldRoot}/README.md`), readme);
    assert.deepEqual(read(root, '.git/info/exclude'), excludes);
    assert.deepEqual(read(root, '.gitignore'), f.ignore);
    assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
    assert.equal(git(root, 'status', '--porcelain=v1', '-z'), status);
  }
  const adjusted = Buffer.from(config.toString().replace(oldPrd, newPrd));
  put(root, `${oldRoot}/configuracao/ESTADO.md`, adjusted);
  assert.equal(cli(root, ['update']).ok, true);
  assert.deepEqual(read(root, `${newRoot}/configuracao/ESTADO.md`), adjusted);
  assert.deepEqual(read(root, newPrd), document);
  assert.equal(existsSync(join(root, oldRoot)), false);
  const inspection = spawnSync(process.execPath, [join(root, '.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs')], {
    cwd: root, encoding: 'utf8', timeout: 180000,
  });
  assert.equal(inspection.status, 0, `${inspection.error?.stack || ''}\n${inspection.stderr || ''}`);
  const prd = JSON.parse(inspection.stdout).maturity.planning.prd;
  assert.equal(prd.path, newPrd);
  assert.equal(prd.present, true);
  assert.equal(prd.status, 'aprovado');
  assert.deepEqual(read(root, '.gitignore'), f.ignore);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
});

test('referência à raiz legada sem barra impede migração sem alterar o projeto', t => {
  const f = fixture(t), { root } = f;
  const config = Buffer.from(`---\ndocumentos:\n  releases: ${oldRoot}\n---\n\n# Estado\n`);
  put(root, `${oldRoot}/configuracao/ESTADO.md`, config);
  const manifest = read(root, `${oldRoot}/agentdevkit.json`);
  const status = git(root, 'status', '--porcelain=v1', '-z');
  const result = cli(root, ['update', '--force'], 1);
  assert.equal(result.ok, false);
  assert.equal(result.error?.code, 'E_LEGACY_PATH');
  assert.equal(existsSync(join(root, newRoot)), false);
  assert.deepEqual(read(root, `${oldRoot}/configuracao/ESTADO.md`), config);
  assert.deepEqual(read(root, `${oldRoot}/agentdevkit.json`), manifest);
  assert.deepEqual(read(root, '.gitignore'), f.ignore);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
  assert.equal(git(root, 'status', '--porcelain=v1', '-z'), status);
});

test('nome diferente iniciado por estado não bloqueia a migração', t => {
  const f = fixture(t), { root } = f;
  const config = Buffer.from('---\ndocumentos:\n  releases: .PBAI4DEVS/ESTADO-extra\n---\n\n# Estado\n');
  put(root, `${oldRoot}/configuracao/ESTADO.md`, config);
  assert.equal(cli(root, ['update']).ok, true);
  assert.deepEqual(read(root, `${newRoot}/configuracao/ESTADO.md`), config);
  assert.equal(existsSync(join(root, oldRoot)), false);
  assert.deepEqual(read(root, '.gitignore'), f.ignore);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
});

test('referência legada com maiúsculas ou caixa mista bloqueia migração sem alterações', t => {
  const f = fixture(t), { root } = f;
  const manifest = read(root, `${oldRoot}/agentdevkit.json`);
  for (const reference of ['.PBAI4DEVS/ESTADO/documentos/PRD.md', '.PbAi4DeVs/EsTaDo']) {
    const config = Buffer.from(`---\ndocumentos:\n  prd: ${reference}\n---\n\n# Estado\n`);
    put(root, `${oldRoot}/configuracao/ESTADO.md`, config);
    const status = git(root, 'status', '--porcelain=v1', '-z');
    const result = cli(root, ['update', '--force'], 1);
    assert.equal(result.ok, false);
    assert.equal(result.error?.code, 'E_LEGACY_PATH');
    assert.equal(existsSync(join(root, newRoot)), false);
    assert.deepEqual(read(root, `${oldRoot}/configuracao/ESTADO.md`), config);
    assert.deepEqual(read(root, `${oldRoot}/agentdevkit.json`), manifest);
    assert.deepEqual(read(root, '.gitignore'), f.ignore);
    assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
    assert.equal(git(root, 'status', '--porcelain=v1', '-z'), status);
  }
});

test('referência legada codificada em escapes JSON bloqueia update, dry-run e force', t => {
  const f = fixture(t), { root } = f;
  const manifest = read(root, `${oldRoot}/agentdevkit.json`);
  const references = [String.raw`.pbai4devs/\u0065stado/documentos/PRD.md`, String.raw`.pbai4devs\/estado/documentos/PRD.md`];
  for (const reference of references) {
    const config = Buffer.from(`---\ndocumentos:\n  prd: "${reference}"\n---\n\n# Estado\n`);
    put(root, `${oldRoot}/configuracao/ESTADO.md`, config);
    const status = git(root, 'status', '--porcelain=v1', '-z');
    const excludes = read(root, '.git/info/exclude');
    for (const options of [[], ['--dry-run'], ['--force']]) {
      const result = cli(root, ['update', ...options], 1);
      assert.equal(result.ok, false);
      assert.equal(result.error?.code, 'E_LEGACY_PATH');
      assert.equal(existsSync(join(root, newRoot)), false);
      assert.deepEqual(read(root, `${oldRoot}/configuracao/ESTADO.md`), config);
      assert.deepEqual(read(root, `${oldRoot}/agentdevkit.json`), manifest);
      assert.deepEqual(read(root, '.git/info/exclude'), excludes);
      assert.deepEqual(read(root, '.gitignore'), f.ignore);
      assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
      assert.equal(git(root, 'status', '--porcelain=v1', '-z'), status);
    }
  }
});

test('estado-extra codificado em escapes JSON não bloqueia a migração', t => {
  const f = fixture(t), { root } = f;
  const reference = String.raw`.pbai4devs\/\u0065stado-extra`;
  const config = Buffer.from(`---\ndocumentos:\n  releases: "${reference}"\n---\n\n# Estado\n`);
  put(root, `${oldRoot}/configuracao/ESTADO.md`, config);
  assert.equal(cli(root, ['update']).ok, true);
  assert.deepEqual(read(root, `${newRoot}/configuracao/ESTADO.md`), config);
  assert.equal(existsSync(join(root, oldRoot)), false);
  assert.deepEqual(read(root, '.gitignore'), f.ignore);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
});

test('não segue link simbólico de estado legado nem altera o destino externo', { skip: process.platform === 'win32' }, t => {
  const f = fixture(t), { root } = f;
  const actual = join(root, 'human-backup');
  renameSync(join(root, oldRoot), actual);
  symlinkSync(actual, join(root, oldRoot), 'dir');
  const before = readFileSync(join(actual, 'agentdevkit.json'));
  const result = cli(root, ['update'], 1);
  assert.equal(result.ok, false);
  assert.deepEqual(readFileSync(join(actual, 'agentdevkit.json')), before);
  assert.equal(existsSync(join(root, newRoot)), false);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
});

test('não segue link simbólico dentro do estado legado', { skip: process.platform === 'win32' }, t => {
  const f = fixture(t), { root } = f;
  const external = join(root, 'external-data.txt');
  const original = Buffer.from('Conteúdo externo protegido.\n');
  writeFileSync(external, original);
  symlinkSync(external, join(root, oldRoot, 'outros/link.txt'));
  const before = read(root, `${oldRoot}/agentdevkit.json`);
  assert.equal(cli(root, ['update'], 1).ok, false);
  assert.deepEqual(readFileSync(external), original);
  assert.deepEqual(read(root, `${oldRoot}/agentdevkit.json`), before);
  assert.equal(existsSync(join(root, newRoot)), false);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
});

test('alteração concorrente em arquivo legado invalida o plano sem substituí-la', t => {
  const f = fixture(t), { root } = f;
  const before = read(root, `${oldRoot}/agentdevkit.json`);
  const plan = planInstallation({ target: root, mode: 'update' });
  assert.equal(plan.canApply, true, JSON.stringify(plan.conflicts));
  const concurrent = Buffer.from('Edição concorrente preservada.\n');
  put(root, `${oldRoot}/outros/minhas-notas.txt`, concurrent);
  assert.throws(() => applyPlan(plan), error => error.code === 'E_CHANGED');
  assert.deepEqual(read(root, `${oldRoot}/outros/minhas-notas.txt`), concurrent);
  assert.deepEqual(read(root, `${oldRoot}/agentdevkit.json`), before);
  assert.equal(existsSync(join(root, `${newRoot}/agentdevkit.json`)), false);
  assert.deepEqual(read(root, '.gitignore'), f.ignore);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
});

test('falha durante aplicação reverte arquivos migrados e mantém índice e ignore', t => {
  const f = fixture(t), { root } = f;
  const manifest = read(root, `${oldRoot}/agentdevkit.json`);
  const plan = planInstallation({ target: root, mode: 'update' });
  assert.equal(plan.canApply, true, JSON.stringify(plan.conflicts));
  assert.ok(plan.changes.some(change => change.path.startsWith(`${newRoot}/`)));
  const failure = new Error('injected migration write failure');
  plan.changes.push({ path: 'injected-failure.txt', action: 'create', beforeHash: null,
    get content() { throw failure; } });
  assert.throws(() => applyPlan(plan), error => error === failure);
  assert.deepEqual(read(root, `${oldRoot}/agentdevkit.json`), manifest);
  assert.deepEqual(read(root, `${oldRoot}/configuracao/ESTADO.md`), f.config);
  assert.deepEqual(read(root, `${oldRoot}/outros/minhas-notas.txt`), f.custom);
  assert.deepEqual(read(root, `${oldRoot}/derived.json`), f.derived);
  assert.equal(existsSync(join(root, `${newRoot}/agentdevkit.json`)), false);
  assert.deepEqual(read(root, '.gitignore'), f.ignore);
  assert.equal(git(root, 'ls-files', '--stage', '-z'), f.index);
});
