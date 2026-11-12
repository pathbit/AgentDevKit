import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { findNpmCli } from '../.pbai4devs/scripts/lib/npm.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, text) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };
const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const npm = findNpmCli();

function snapshot(folder) {
  const entries = {};
  function visit(path, relative = '') {
    for (const name of readdirSync(path).sort()) {
      if (['.git', '.agent-tests'].includes(name)) continue;
      const file = join(path, name); const label = relative ? `${relative}/${name}` : name;
      const info = lstatSync(file);
      if (info.isDirectory()) visit(file, label);
      else if (info.isSymbolicLink()) entries[label] = 'symlink';
      else entries[label] = digest(file);
    }
  }
  if (existsSync(folder)) visit(folder);
  return entries;
}

test('pacote real instala, preserva projetos e oferece próximos passos', { timeout: 240000 }, async t => {
  assert.ok(npm, 'Node 24+ com npm é necessário para testar a distribuição.');
  const artifacts = join(root, '.agent-tests'); mkdirSync(artifacts, { recursive: true });
  const work = mkdtempSync(join(artifacts, 'distribuicao com espaços-'));
  assert.equal(spawnSync('git', ['init', '--quiet', work]).status, 0);
  let verifyArtifact;
  t.after(() => { try { verifyArtifact?.(); } finally { rmSync(work, { recursive: true, force: true }); } });
  const stage = join(work, 'package'); mkdirSync(stage);
  const packageJson = json(join(root, 'package.json'));
  const sourceFiles = [...packageJson.files, 'package.json', 'LICENSE'];
  for (const relative of sourceFiles) {
    const source = join(root, relative);
    if (!existsSync(source)) continue;
    cpSync(source, join(stage, relative), { recursive: true, filter(file) {
      const parts = file.slice(root.length + 1).split(sep);
      if (parts.some(part => ['.git', '.agent-tests', '.local', '.cache', 'node_modules', 'tmp', 'temp'].includes(part))) return false;
      assert.equal(lstatSync(file).isSymbolicLink(), false, `Fonte simbólica: ${file}`);
      return true;
    } });
  }
  const localOnly = ['.pbai4devs/tools/agent-browser/.local/secret.json', '.pbai4devs/tools/.cache/download.bin', '.pbai4devs/external-skills/.local/private/SKILL.md', '.pbai4devs/scripts/exemplo/.playwright-mcp/log.json', '.pbai4devs/scripts/exemplo/sessions/state.json', '.pbai4devs/scripts/exemplo/auth.json', '.agent-tests/output.json', 'tmp/output.txt', 'tests/private.test.mjs', 'scripts/release/private.mjs', 'examples/.claude/skills/private/SKILL.md'];
  for (const relative of localOnly) write(join(stage, relative), 'LOCAL_ONLY_DO_NOT_DISTRIBUTE');
  const environment = { ...process.env, PATH: `${dirname(process.execPath)}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH || ''}`, npm_config_cache: join(work, 'npm-cache'), npm_config_offline: 'true', npm_config_audit: 'false', npm_config_fund: 'false', npm_config_ignore_scripts: 'true' };
  const runNpm = (args, cwd = stage) => {
    const result = spawnSync(process.execPath, [npm, ...args], { cwd, env: environment, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stderr || result.stdout);
    return result.stdout;
  };
  const packed = JSON.parse(runNpm(['pack', '--json', '--ignore-scripts', '--pack-destination', work]))[0];
  const selected = process.env.AGENTDEVKIT_TARBALL;
  if (selected) assert.ok(isAbsolute(selected) && selected.endsWith('.tgz'), 'AGENTDEVKIT_TARBALL exige caminho absoluto .tgz.');
  const tarball = selected || join(work, packed.filename);
  assert.ok(lstatSync(tarball).isFile() && !lstatSync(tarball).isSymbolicLink(), 'O tarball deve ser um arquivo regular.');
  const artifactHash = digest(tarball);
  const outcomes = [];
  const subtest = (name, action) => t.test(name, async context => {
    try { outcomes.push({ name, status: await action(context) === 'skipped' ? 'skipped' : 'passed' }); }
    catch (error) { outcomes.push({ name, status: 'failed', error: error.message }); throw error; }
  });
  verifyArtifact = () => {
    const afterHash = digest(tarball);
    const unchanged = afterHash === artifactHash;
    if (selected) write(join(root, '.agent-tests/release-artifact-verification.json'), JSON.stringify({
      artifact: tarball, sha256: artifactHash, sha256After: afterHash, unchanged,
      status: unchanged && outcomes.length === 5 && outcomes.every(item => item.status !== 'failed') ? 'passed' : 'failed',
      scenarios: outcomes,
    }, null, 2) + '\n');
    assert.ok(unchanged, 'O artefato selecionado mudou durante a verificação.');
  };
  assert.ok(packed.files.some(file => file.path === 'bin/agentdevkit.mjs'));
  assert.ok(packed.files.some(file => file.path === 'src/cli.mjs'));
  assert.ok(packed.files.some(file => file.path === 'LICENSE'));
  assert.ok(packed.files.some(file => file.path === '.pbai4devs/skills/projeto/proximos-passos/SKILL.md'));
  for (const file of packed.files) {
    assert.doesNotMatch(file.path, /(?:^|\/)(?:\.local|\.cache|node_modules|\.agent-tests|tmp|temp)(?:\/|$)/, file.path);
    assert.ok(!file.path.startsWith('.pbai4devs/adapters/'), file.path);
    assert.doesNotMatch(file.path, /^(?:tests|examples|scripts\/release)\//, file.path);
    assert.ok(!localOnly.includes(file.path), file.path);
  }
  const installed = join(work, 'installed');
  runNpm(['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', installed, tarball], work);
  const packageRoot = join(installed, 'node_modules', ...packageJson.name.split('/'));
  const bin = join(packageRoot, 'bin/agentdevkit.mjs');
  assert.ok(existsSync(bin));
  const canonicalLicense = readFileSync(join(packageRoot, 'LICENSE'));
  assert.deepEqual(canonicalLicense, readFileSync(join(root, 'LICENSE')));
  for (const relative of readdirSync(packageRoot, { recursive: true })) {
    const file = relative.split(sep).join('/');
    assert.doesNotMatch(file, /(?:^|\/)(?:\.local|\.cache|node_modules|\.agent-tests|tmp|temp)(?:\/|$)/, file);
    assert.ok(!file.startsWith('.pbai4devs/adapters/'), file);
    assert.ok(!localOnly.includes(file), file);
  }
  const cli = (args, expected = 0, executable = bin) => {
    const result = spawnSync(process.execPath, [executable, ...args, '--json'], { cwd: work, env: environment, encoding: 'utf8', timeout: 90000, maxBuffer: 8 * 1024 * 1024 });
    assert.ifError(result.error); assert.equal(result.status, expected, result.stderr || result.stdout);
    const value = JSON.parse(result.stdout);
    assert.ok(Array.isArray(value.next), 'Toda saída JSON deve informar próximos passos.');
    return value;
  };

  await subtest('npx offline executa o tarball, sem instalação global', () => {
    const npx = join(dirname(npm), 'npx-cli.js');
    assert.ok(existsSync(npx));
    const result = spawnSync(process.execPath, [npx, '--offline', '--yes', '--ignore-scripts', '--package', tarball, 'agentdevkit', '--version'], { cwd: work, env: environment, encoding: 'utf8', timeout: 120000 });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stderr);
    const output = result.stdout;
    assert.match(output, new RegExp(packageJson.version.replaceAll('.', '\\.')));
  });

  await subtest('init vazio, dry-run, idioma e repetição são reais', () => {
    const preview = join(work, 'somente simulação');
    cli(['init', '--target', preview, '--dry-run', '--yes']);
    assert.equal(existsSync(preview), false);
    const target = join(work, 'projeto vazio');
    const first = cli(['init', '--target', target, '--yes', '--lang', 'en']);
    assert.equal(first.language, 'en'); assert.equal(first.ok, true);
    assert.equal(json(join(target, '.pbai4devs/estado/agentdevkit.json')).language, 'en');
    assert.ok(existsSync(join(target, '.pbai4devs/skills/projeto/proximos-passos/SKILL.md')));
    assert.deepEqual(readFileSync(join(target, '.pbai4devs/LICENSE')), canonicalLicense);
    assert.equal(json(join(target, '.pbai4devs/estado/agentdevkit.json')).files['.pbai4devs/LICENSE'], digest(join(target, '.pbai4devs/LICENSE')));
    assert.equal(existsSync(join(target, 'docs')), false);
    for (const folder of ['src', 'bin', 'tests', 'scripts', 'examples']) assert.equal(existsSync(join(target, folder)), false, folder);
    for (const relative of localOnly) assert.equal(existsSync(join(target, relative)), false, relative);
    const before = snapshot(target);
    cli(['init', '--target', target, '--yes']); cli(['update', '--target', target, '--yes']);
    assert.deepEqual(snapshot(target), before);
    assert.equal(cli(['doctor', '--target', target]).language, 'en');
    assert.equal(cli(['next', '--target', target]).language, 'en');
    cli(['lang', 'es', '--target', target]);
    assert.equal(cli(['next', '--target', target]).language, 'es');
  });

  await subtest('projeto existente preserva código, instruções e configurações próprias', () => {
    const target = join(work, 'projeto existente');
    const sentinels = ['src/app.mjs', 'tests/app.test.mjs', 'bin/custom.mjs', 'README.md', 'LICENSE', '.vscode/settings.json', '.github/workflows/ci.yml', '.claude/skills/custom/SKILL.md', '.env', '.pbai4devs/tools/agent-browser/.local/state.json', '.pbai4devs/tools/.cache/keep.bin'];
    for (const relative of sentinels) write(join(target, relative), `USER_OWNED:${relative}\n`);
    write(join(target, '.vscode/settings.json'), '{"editor.wordWrap":"on"}\n');
    write(join(target, '.github/workflows/ci.yml'), 'name: Meu CI\non: push\njobs: {}\n');
    write(join(target, '.claude/skills/custom/SKILL.md'), '---\nname: custom\ndescription: Skill do usuário.\n---\n\n# Custom\n\nINSTRUCAO_PROPRIA\n');
    write(join(target, 'AGENTS.md'), '---\ndescription: Projeto existente.\n---\n\n# Projeto existente\n\nINSTRUCAO_DO_USUARIO\n');
    write(join(target, '.gitignore'), '# Ignore próprio\nminha-pasta-local/\n');
    const legacy = '.codex/skills/configurar-projeto';
    write(join(target, legacy, 'SKILL.md'), '---\nname: configurar-projeto\ndescription: Ponte antiga.\n---\n\n# Configurar projeto\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/skills/projeto/configurar-projeto/SKILL.md).\n');
    const ownEmpty = join(target, '.codex/skills/user-empty'); mkdirSync(ownEmpty, { recursive: true });
    const before = Object.fromEntries(sentinels.map(relative => [relative, digest(join(target, relative))]));
    const result = cli(['init', '--target', target, '--yes']);
    assert.equal(result.language, 'pt');
    cli(['update', '--target', target, '--yes']);
    assert.deepEqual(readFileSync(join(target, '.pbai4devs/LICENSE')), canonicalLicense);
    assert.equal(existsSync(join(target, legacy)), false, 'A pasta da ponte legada deve ser removida quando ficar vazia.');
    assert.ok(existsSync(ownEmpty), 'A pasta vazia própria deve permanecer.');
    for (const relative of sentinels) assert.equal(digest(join(target, relative)), before[relative], relative);
    assert.match(readFileSync(join(target, 'AGENTS.md'), 'utf8'), /INSTRUCAO_DO_USUARIO/);
    assert.match(readFileSync(join(target, '.gitignore'), 'utf8'), /minha-pasta-local\//);

    const managed = '.pbai4devs/rules/qualidade/RULE.md';
    const tampered = readFileSync(join(target, managed), 'utf8') + '\nUSER_EDIT_MANAGED\n';
    write(join(target, managed), tampered);
    const altered = snapshot(target);
    assert.equal(cli(['update', '--target', target, '--yes'], 1).ok, false);
    assert.deepEqual(snapshot(target), altered, 'Conflito não deve aplicar mudanças parciais.');
    cli(['update', '--target', target, '--yes', '--force']);
    assert.ok(existsSync(ownEmpty), 'O force não deve remover pastas próprias vazias.');
    assert.doesNotMatch(readFileSync(join(target, managed), 'utf8'), /USER_EDIT_MANAGED/);
    assert.equal(digest(join(target, '.claude/skills/custom/SKILL.md')), before['.claude/skills/custom/SKILL.md']);
    const backupRoot = join(target, '.agent-tests/agentdevkit/backups');
    assert.ok(existsSync(backupRoot));
    assert.ok(readdirSync(backupRoot, { recursive: true }).some(relative => {
      const file = join(backupRoot, relative);
      return lstatSync(file).isFile() && readFileSync(file, 'utf8') === tampered;
    }), 'Backup deve preservar a edição humana antes do --force.');
  });

  await subtest('nova versão atualiza a fonte sem substituir a skill própria', () => {
    const target = join(work, 'projeto para atualizar');
    cli(['init', '--target', target, '--yes']);
    write(join(target, '.claude/skills/custom/SKILL.md'), '---\nname: custom\ndescription: Skill própria.\n---\n\n# Custom\n');
    const customHash = digest(join(target, '.claude/skills/custom/SKILL.md'));
    const nextVersion = packageJson.version.split('.').map((part, index) => Number(part) + (index === 2 ? 1 : 0)).join('.');
    const nextPackage = { ...json(join(stage, 'package.json')), version: nextVersion };
    write(join(stage, 'package.json'), JSON.stringify(nextPackage));
    const nextSource = readFileSync(join(stage, '.pbai4devs/README.md'), 'utf8') + '\nNova versão da fixture.\n';
    write(join(stage, '.pbai4devs/README.md'), nextSource);
    const nextLicense = Buffer.concat([canonicalLicense, Buffer.from('\nAdditional notice in the new release fixture.\n')]);
    write(join(stage, 'LICENSE'), nextLicense);
    const upgrade = JSON.parse(runNpm(['pack', '--json', '--ignore-scripts', '--pack-destination', work]))[0];
    const upgradeRoot = join(work, 'upgrade-installed');
    runNpm(['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', upgradeRoot, join(work, upgrade.filename)], work);
    const upgradeBin = join(upgradeRoot, 'node_modules', ...packageJson.name.split('/'), 'bin/agentdevkit.mjs');
    const result = cli(['update', '--target', target, '--yes'], 0, upgradeBin);
    assert.equal(result.version, nextVersion);
    assert.equal(readFileSync(join(target, '.pbai4devs/README.md'), 'utf8'), nextSource);
    assert.equal(digest(join(target, '.claude/skills/custom/SKILL.md')), customHash);
    assert.deepEqual(readFileSync(join(target, '.pbai4devs/LICENSE')), nextLicense);
  });

  await subtest('target simbólico não redireciona a instalação', context => {
    const outside = join(work, 'não alterar'); mkdirSync(outside);
    write(join(outside, 'keep.txt'), 'preservado');
    const link = join(work, 'target-link');
    try { symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir'); }
    catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { context.skip('Sem permissão para criar symlink.'); return 'skipped'; } throw error; }
    cli(['init', '--target', link, '--yes'], 1);
    assert.deepEqual(readdirSync(outside), ['keep.txt']);
  });
});
