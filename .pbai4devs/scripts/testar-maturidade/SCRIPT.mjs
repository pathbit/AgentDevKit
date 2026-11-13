#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { isMain, projectRoot, requireNode } from '../lib/runtime.mjs';
import { isGeneratedOutput } from '../lib/gitignore.mjs';
import { resourcePath, synchronize } from '../sincronizar-agentes/SCRIPT.mjs';
import { adapterManifest } from '../lib/adapters.mjs';
import { stateDirectory } from '../lib/state-path.mjs';

const assets = join(dirname(fileURLToPath(import.meta.url)), 'assets');
const owner = 'testar-maturidade';
const marker = '.maturity-case.json';
const suiteMarker = '.maturity-suite.json';
const outputIgnore = '# Exemplos gerados permanecem locais.\n*\n';
const defaultOutput = root => join(root, 'examples/generated');
const prepareResources = root => {
  const result = synchronize({ root, localIgnores: false, output: () => {} });
  if (result.exitCode !== 0) fail('Não foi possível preparar os apontamentos do exemplo.');
};
const portable = value => value.split(sep).join('/');
const digest = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error(message); };
const document = (title, body, metadata = '') => `---\ndescription: Cenário sintético de maturidade.\nfixture: true\n${metadata}---\n\n# ${title}\n\n${body.trim()}\n`;
const write = (root, file, content) => { const path = join(root, file); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); return path; };
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const stat = file => { try { return lstatSync(file); } catch (error) { if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null; throw error; } };

function noLinks(root, target) {
  let current = root;
  for (const part of ['', ...relative(root, target).split(sep).filter(Boolean)]) {
    if (part) current = join(current, part);
    if (stat(current)?.isSymbolicLink()) fail(`Caminho gerenciado não pode ser link: ${current}`);
  }
}

export const SCENARIOS = [
  { id: 'somente-agentes', title: 'Somente agentes', expected: 'preparacao', complete: false, app: false, planning: 'none', note: 'Recursos compartilhados, sem produto ou aplicação.' },
  { id: 'descoberta', title: 'Descoberta de produto', expected: 'descoberta', complete: false, app: false, planning: 'draft', note: 'PRD em rascunho; nenhuma stack é iniciada.' },
  { id: 'planejado', title: 'Produto planejado', expected: 'planejado', complete: false, app: false, planning: 'ready', note: 'PRD/design aprovados no cenário e UX não aplicável; ainda sem código.' },
  { id: 'app-inicial', title: 'Aplicação inicial', expected: 'implementacao', complete: false, app: true, planning: 'none', note: 'API funcional, mas contrato de estrutura incompleto.' },
  { id: 'app-configurada', title: 'Aplicação configurada', expected: 'configurado', complete: true, app: true, planning: 'ready', configured: true, note: 'Estrutura e planejamento completos; testes reais de API.' },
  { id: 'manutencao', title: 'Manutenção de aplicação', expected: 'manutencao', complete: true, app: true, planning: 'ready', configured: true, released: true, note: 'Aplicação configurada com release publicada sintética.' },
  { id: 'legado', title: 'Aplicação legada', expected: 'implementacao', complete: false, app: true, planning: 'none', layout: 'legacy', note: 'Pastas, comandos e configurações antigas são preservados.' },
  { id: 'monorepo', title: 'Monorepo com dois módulos', expected: 'implementacao', complete: false, app: true, planning: 'ready', layout: 'monorepo', note: 'Dois módulos e caminhos com espaços/acentos; sem impor src na raiz.' },
];

function manifest(root) {
  const state = join(root, stateDirectory(root), 'agentdevkit.json');
  const file = join(root, '.pbai4devs/espelhos.conf');
  if (existsSync(file)) return readFileSync(file, 'utf8');
  return adapterManifest(root, { clients: existsSync(state) ? json(state).clients : undefined });
}

export function registeredRoots(root) {
  const names = manifest(root).split(/\r?\n/)
    .filter(line => /^(?:agente|gitignore)\|/.test(line)).map(line => line.split('|')[1]);
  for (const name of names) if (!/^\.[a-z0-9][a-z0-9.-]*$/i.test(name) || ['.git', '.pbai4devs', '.agent-tests'].includes(name.toLowerCase())) fail(`Raiz de agente inválida: ${name}`);
  return [...new Set(names)];
}

export function resourceTargets(root, source, kind = 'skills') {
  const rows = manifest(root).split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => line.split('|'));
  const targets = [];
  for (const [type, agent, layout = 'agrupado'] of rows) {
    if (type !== 'agente') continue;
    const override = rows.find(([entry, target, resource]) => entry === 'formato' && target === agent && resource === kind)?.[3];
    targets.push(`${agent}/${resourcePath(source, kind, override || layout)}`);
  }
  for (const [type, target, origin] of rows) if (type === 'nativo' && origin === source) targets.push(target);
  return [...new Set(targets)];
}

function copyAllowed(relativePath, directory = false) {
  const parts = portable(relativePath).split('/');
  const name = parts.at(-1);
  if (parts[0] === '.pbai4devs' && ['bin', 'src', 'release', 'tests', 'DEVELOPMENT.md'].includes(parts[1])) return false;
  if (isGeneratedOutput(relativePath, directory)) return false;
  if (parts.some(part => ['.git', '.local', '.cache', 'node_modules', 'logs', '.agent-tests', '__pycache__', '.ssh', '.gnupg'].includes(part.toLowerCase()))) return false;
  if (/^\.playwright/i.test(name) || /\.log$/i.test(name) || name === '.DS_Store') return false;
  if (/^\.env(?:\.|$)/i.test(name) && !/^\.env\.(?:.*\.)?(?:example|sample|template)$/i.test(name)) return false;
  if (/^(?:\.?auth|\.?credentials|secrets?)(?:\.(?:jsonc?|json5|ya?ml|toml|ini|conf))?$/i.test(name)) return false;
  if (/^(?:\.netrc|\.npmrc|\.pypirc|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?)$/i.test(name)) return false;
  if (/\.(?:pem|p12|pfx|key|jks|keystore)$/i.test(name) || /\.local\.(?:jsonc?|json5|ya?ml|toml|ini|conf)$/i.test(name)) return false;
  if (parts[0] === '.pbai4devs' && parts[1] === 'tools') {
    if (parts.length === 2) return true;
    if (parts.length === 3) return parts[2] === 'README.md' || !['bin', 'npm-cache'].includes(parts[2]);
    return parts.length === 4 && ['TOOL.json', 'SCRIPT.mjs', 'README.md'].includes(parts[3]);
  }
  if (parts[0] === '.pbai4devs' && parts[1] === 'external-skills') return parts.length === 2 || (parts.length === 3 && ['README.md', 'CATALOG.json'].includes(parts[2]));
  return true;
}

export function copyAgentStructure(sourceRoot, destination) {
  const roots = ['.pbai4devs', ...registeredRoots(sourceRoot)];
  const stateFile = join(sourceRoot, stateDirectory(sourceRoot), 'agentdevkit.json');
  const stateInfo = stat(stateFile);
  if (stateInfo && (!stateInfo.isFile() || stateInfo.isSymbolicLink())) fail('Estado da instalação deve ser arquivo regular.');
  const installation = stateInfo ? json(stateFile) : null;
  if (stateInfo && (!installation || !installation.blocks || typeof installation.blocks !== 'object' || Array.isArray(installation.blocks))) fail('Estado da instalação deve registrar os blocos gerenciados.');
  function managedEntry(name) {
    if (!installation) return true;
    const expected = installation.blocks[name];
    if (typeof expected !== 'string') return false;
    const content = readFileSync(join(sourceRoot, name), 'utf8');
    const begin = '<!-- BEGIN AGENTDEVKIT -->', end = '<!-- END AGENTDEVKIT -->';
    if (content.split(begin).length !== 2 || content.split(end).length !== 2) return false;
    const start = content.indexOf(begin), finish = content.indexOf(end);
    return finish > start && digest(content.slice(start, finish + end.length)) === expected;
  }
  const files = []; const entrypoints = {}; let skipped = 0;
  function copy(file, targetFile = file) {
    const source = join(sourceRoot, file);
    const item = stat(source); if (!item) return;
    if (!copyAllowed(file, item.isDirectory())) { skipped++; return; }
    if (item.isSymbolicLink()) fail(`A cópia recusa links simbólicos: ${file}`);
    if (item.isDirectory()) {
      mkdirSync(join(destination, targetFile), { recursive: true });
      for (const name of readdirSync(source).sort()) copy(join(file, name), join(targetFile, name));
    } else if (item.isFile()) {
      const target = join(destination, targetFile); mkdirSync(dirname(target), { recursive: true }); copyFileSync(source, target); files.push(portable(targetFile));
    } else fail(`Arquivo não regular na origem: ${file}`);
  }
  for (const file of [...roots, 'README.md', '.gitignore', '.gitattributes', '.editorconfig', '.dockerignore', '.env.example', '.env.sample', '.env.template', 'Makefile']) copy(file);
  for (const name of ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md']) {
    const installed = stat(join(sourceRoot, name));
    if (!installed) continue;
    if (!installed.isFile() || installed.isSymbolicLink()) fail(`Entrada de agente deve ser arquivo regular: ${name}`);
    const template = `.pbai4devs/templates/entrypoints/${name}`;
    const selected = managedEntry(name) && stat(join(sourceRoot, template)) ? template : name;
    const info = stat(join(sourceRoot, selected));
    if (info && !info.isFile()) fail(`Entrada de agente deve ser arquivo regular: ${selected}`);
    copy(selected, name);
    if (info) entrypoints[name] = selected;
  }
  const sourceDigest = digest(files.map(file => `${file}\0${digest(readFileSync(join(destination, file)))}`).join('\n'));
  return { roots, copiedFiles: files.length, skipped, files, sourceDigest, entrypoints, toolDefinitions: files.filter(file => /^\.pbai4devs\/tools\/[^/]+\/TOOL\.json$/.test(file)).length };
}

function ownership(root, file, expectedId) {
  if (stat(root)?.isSymbolicLink()) return false;
  const path = join(root, file);
  if (!existsSync(path)) return false;
  const item = lstatSync(path);
  if (!item.isFile() || item.isSymbolicLink()) return false;
  try { const data = json(path); return data.owner === owner && (!expectedId || data.id === expectedId); }
  catch { return false; }
}

function ensureOutput(output) {
  if (existsSync(output) && lstatSync(output).isSymbolicLink()) fail('A pasta de exemplos não pode ser um link.');
  for (const name of [suiteMarker, 'README.md', 'REPORT.json', '.gitignore']) {
    const item = stat(join(output, name));
    if (item && (!item.isFile() || item.isSymbolicLink())) fail(`Arquivo de saída deve ser regular: ${name}`);
  }
  if (existsSync(output) && [suiteMarker, 'README.md', 'REPORT.json'].some(name => existsSync(join(output, name)))
    && !ownership(output, suiteMarker)) fail('Índice de exemplos existente não pertence a este gerador.');
  if (existsSync(join(output, 'REPORT.json')) && !ownership(output, 'REPORT.json')) fail('Relatório de exemplos existente não pertence a este gerador.');
  if (existsSync(join(output, '.gitignore')) && readFileSync(join(output, '.gitignore'), 'utf8') !== outputIgnore) fail('Ignore de exemplos existente não pertence a este gerador.');
  mkdirSync(output, { recursive: true });
}

function planning(root, scenario) {
  const stateRoot = stateDirectory(root);
  const state = `${stateRoot}/configuracao/ESTADO.md`;
  rmSync(join(root, state), { force: true });
  if (scenario.planning === 'none' && !scenario.app) return;
  write(root, `${stateRoot}/README.md`, document('Estado dos exemplos', 'Dados sintéticos deste cenário, sem aprovação real de produto.'));
  let paths = { prd: null, ux_ui: null, design: null, releases: null, specs: null };
  if (scenario.planning !== 'none') {
    for (const folder of ['docs', 'docs/produto', 'docs/design']) write(root, `${folder}/README.md`, document('Documentos do cenário', 'Entradas sintéticas para testar a classificação de maturidade.'));
    paths.prd = 'docs/produto/PRD.md';
    write(root, paths.prd, document('Produto de exemplo', 'Problema e escopo sintéticos. Aprovação é dado de teste, não decisão humana.', `status: ${scenario.planning === 'ready' ? 'aprovado' : 'rascunho'}\n`));
    if (scenario.planning === 'ready') {
      paths.ux_ui = 'docs/produto/UX.md'; paths.design = 'docs/design/DESIGN.md';
      write(root, paths.ux_ui, document('UX do cenário', 'API sem interface visual: não aplicação justificada apenas para o cenário.', 'status: nao-aplicavel\n'));
      write(root, paths.design, document('Design do cenário', 'Node HTTP sem dependências. Decisão sintética para os testes.', 'status: aprovado\n'));
    }
  }
  if (scenario.released) {
    paths.releases = 'docs/releases';
    write(root, 'docs/releases/README.md', document('Releases de exemplo', 'Histórico sintético do cenário.'));
    write(root, 'docs/releases/1.0.0/README.md', document('Release 1.0.0', 'Documentos sintéticos desta versão.'));
    write(root, 'docs/releases/1.0.0/RELEASE.md', document('Release 1.0.0', 'Publicação sintética para classificar a manutenção.', 'status: publicado\n'));
  }
  if (scenario.configured) {
    paths.specs = 'docs/specs';
    write(root, 'docs/specs/README.md', document('Specs do cenário', 'Incrementos sintéticos aprovados apenas como dados de teste.'));
    write(root, 'docs/specs/http-api/README.md', document('API de exemplo', 'Spec e provas do incremento sintético.'));
    write(root, 'docs/specs/http-api/SPEC.md', document('API HTTP do cenário', '## Critérios de aceite\n\n| Critério | Resultado |\n| --- | --- |\n| AC-001 | GET /health retorna HTTP 200 e status ok. |\n| AC-002 | POST /sum calcula valores e rejeita entrada inválida. |\n\n## Plano de verificação\n\nExecutar os testes Node da API e guardar o log em .agent-tests/.', 'status: aprovado\n'));
  }
  const values = Object.entries(paths).map(([key, value]) => `  ${key}: ${value ?? 'null'}`).join('\n');
  write(root, state, document('Configuração do cenário', 'Somente fixture; não certifica configuração nem aprovação de produção.', `preparacao: concluido\nconfiguracao_tecnica: ${scenario.configured ? 'concluido' : 'pendente'}\ndocumentos:\n${values}\n`));
}

function application(root, scenario) {
  if (!scenario.app) return { tests: [], scope: [], protected: [], criteria: ['AC-001'] };
  const monorepo = scenario.layout === 'monorepo'; const legacy = scenario.layout === 'legacy';
  const server = monorepo ? 'apps/painel com espaços/src/server.mjs' : legacy ? 'legacy/server.mjs' : 'src/server.mjs';
  const test = monorepo ? 'apps/painel com espaços/tests/api.test.mjs' : legacy ? 'checks/legacy.test.mjs' : 'tests/api.test.mjs';
  let serverText = readFileSync(join(assets, 'server.mjs'), 'utf8');
  if (monorepo) serverText = serverText.replace('const add = (left, right) => left + right;', "import { add } from '../../../packages/cálculo/src/index.mjs';");
  write(root, server, serverText);
  let imported = portable(relative(dirname(test), server)); if (!imported.startsWith('.')) imported = './' + imported;
  write(root, test, readFileSync(join(assets, 'http-api.test.mjs.template'), 'utf8').replace('__SERVER_IMPORT__', imported));
  const tests = [test]; const scope = [server, test]; const preserved = [];
  const scripts = legacy ? { 'dev:old': 'node legacy/server.mjs', 'test:legacy': 'node --test checks/legacy.test.mjs' } : { start: `node "${server}"`, test: `node --test "${test}"` };
  write(root, 'package.json', JSON.stringify({ name: `maturity-${scenario.id}`, version: '1.0.0', private: true, type: 'module', ...(monorepo ? { workspaces: ['apps/*', 'packages/*'] } : {}), scripts }, null, 2) + '\n');
  if (monorepo) {
    write(root, 'apps/painel com espaços/package.json', JSON.stringify({ name: 'painel', private: true, type: 'module', scripts: { start: 'node src/server.mjs', test: 'node --test tests/api.test.mjs' } }, null, 2) + '\n');
    write(root, 'packages/cálculo/package.json', JSON.stringify({ name: 'calculo', private: true, type: 'module', scripts: { test: 'node --test tests/index.test.mjs' } }, null, 2) + '\n');
    write(root, 'packages/cálculo/src/index.mjs', readFileSync(join(assets, 'calculator.mjs')));
    const calculatorTest = 'packages/cálculo/tests/index.test.mjs';
    write(root, calculatorTest, readFileSync(join(assets, 'calculator.test.mjs.template')));
    tests.push(calculatorTest); scope.push('packages/cálculo/src/index.mjs', calculatorTest);
    const manifest = json(join(root, 'package.json'));
    manifest.scripts.test = `node --test ${tests.map(file => JSON.stringify(file)).join(' ')}`;
    write(root, 'package.json', JSON.stringify(manifest, null, 2) + '\n');
    preserved.push('package.json', 'apps/painel com espaços/package.json', 'packages/cálculo/package.json');
  }
  if (legacy) {
    write(root, 'config/legacy.json', '{"mode":"preserve-original-layout"}\n');
    write(root, '.github/workflows/legacy.yml', 'name: Legacy fixture\non: workflow_dispatch\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo legacy-command-preserved\n');
    write(root, '.vscode/settings.json', '{"legacy.setting":"preserve"}\n');
    write(root, 'Makefile', 'legacy-test:\n\tnode --test checks/legacy.test.mjs\n');
    preserved.push(server, test, 'config/legacy.json', '.github/workflows/legacy.yml', '.vscode/settings.json', 'Makefile', 'package.json');
  }
  if (scenario.configured) {
    write(root, '.dockerignore', '.git\n.agent-tests\nnode_modules\n');
    write(root, '.env.example', 'PORT=3000\n');
    write(root, 'Dockerfile', 'FROM node:24-alpine\nWORKDIR /app\nCOPY package.json ./\nCOPY src ./src\nEXPOSE 3000\nCMD ["node", "src/server.mjs"]\n');
    write(root, 'infra/compose/compose.local.yml', 'services:\n  app:\n    build: ../..\n    environment:\n      PORT: "3000"\n    ports:\n      - "127.0.0.1:39001:3000"\n    healthcheck:\n      test: ["CMD", "node", "-e", "fetch(\'http://127.0.0.1:3000/health\').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]\n      interval: 5s\n      timeout: 3s\n      retries: 5\n');
    write(root, 'Makefile', 'include .env.example\n.PHONY: help doctor setup up down logs test lint build\nhelp:\n\t@echo doctor setup up down logs test lint build\ndoctor:\n\tnode --version\n\tdocker compose -f infra/compose/compose.local.yml config --quiet\nsetup:\n\tnode --version\nup:\n\tdocker compose -f infra/compose/compose.local.yml up -d --wait\ndown:\n\tdocker compose -f infra/compose/compose.local.yml down\nlogs:\n\tdocker compose -f infra/compose/compose.local.yml logs --tail=100\ntest:\n\tnode --test tests/api.test.mjs\nlint:\n\tnode --check src/server.mjs\nbuild:\n\tnode --check src/server.mjs\n');
  }
  return { tests, scope, protected: preserved, criteria: monorepo ? ['AC-001', 'AC-002', 'AC-003'] : ['AC-001', 'AC-002'], spec: scenario.configured ? 'docs/specs/http-api/SPEC.md' : null };
}

function gitInit(root) {
  const result = spawnSync('git', ['-c', 'init.defaultBranch=main', 'init', '--template=', '-q', root], { encoding: 'utf8' });
  if (result.error || result.status !== 0) fail(`Git init: ${result.error?.message || result.stderr}`);
}

export function prepareExamples({ sourceRoot = projectRoot, outputRoot = defaultOutput(sourceRoot), scenarios = SCENARIOS, initializeGit = true, renderResources = prepareResources } = {}) {
  requireNode(); sourceRoot = realpathSync(resolve(sourceRoot)); outputRoot = resolve(outputRoot);
  const outputPath = portable(relative(sourceRoot, outputRoot));
  if (!(outputPath === 'examples/generated' || outputPath.startsWith('examples/generated/')
    || outputPath === 'tmp/examples' || outputPath.startsWith('tmp/examples/') || outputPath.startsWith('.agent-tests/'))) fail('Saída permitida somente em examples/generated, tmp/examples ou descendente de .agent-tests.');
  noLinks(sourceRoot, outputRoot);
  const ids = new Set();
  for (const scenario of scenarios) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scenario.id) || ids.has(scenario.id)) fail('Cenários devem ter IDs únicos e seguros.');
    ids.add(scenario.id);
  }
  ensureOutput(outputRoot);
  for (const scenario of scenarios) {
    const destination = join(outputRoot, scenario.id);
    noLinks(sourceRoot, destination);
    if (existsSync(destination) && !ownership(destination, marker, scenario.id)) fail(`Diretório existente não é gerenciado: ${destination}`);
  }
  write(outputRoot, suiteMarker, JSON.stringify({ owner, version: 1 }, null, 2) + '\n');
  write(outputRoot, '.gitignore', outputIgnore);
  rmSync(join(outputRoot, 'REPORT.json'), { force: true });
  writeIndex(outputRoot, [], 'preparing');
  const examples = [];
  for (const scenario of scenarios) {
    const destination = join(outputRoot, scenario.id);
    rmSync(destination, { recursive: true, force: true }); mkdirSync(destination, { recursive: true });
    write(destination, marker, JSON.stringify({ owner, version: 1, id: scenario.id }, null, 2) + '\n');
    const copied = copyAgentStructure(sourceRoot, destination);
    planning(destination, scenario);
    const app = application(destination, scenario);
    write(destination, 'README.md', document(scenario.title, `${scenario.note}\n\nEste é um exemplo gerado. Estados de aprovação/publicação são dados de teste.\nRevisão do gate é simulação contratual, não revisão humana.\n\nOs scripts dos agentes foram copiados, sem pacotes ou credenciais conhecidas.\nO filtro não detecta segredos em conteúdo arbitrário.\n${app.tests.length ? `\nPara repetir os testes: \`${scenario.layout === 'legacy' ? 'npm run test:legacy' : 'npm test'}\`.\nO harness executa os testes Node diretamente, sem instalar dependências.\nO teste abre HTTP em porta efêmera e encerra o servidor.\n` : '\nNão há aplicação; a prova real exercita os scripts copiados.\n'}`, `fase: ${scenario.expected}\n`));
    renderResources(destination);
    if (initializeGit) gitInit(destination);
    examples.push({ ...scenario, root: destination, copied, application: app });
  }
  write(outputRoot, 'REPORT.json', JSON.stringify({ owner, version: 1, status: 'prepared', scenarios: [...ids], results: [] }, null, 2) + '\n');
  writeIndex(outputRoot, examples, 'prepared');
  return examples;
}

function writeIndex(outputRoot, examples, status) {
  const rows = examples.map(item => `| [${item.id}](${item.id}/README.md) | ${item.expected} | ${item.status || 'prepared'} |`).join('\n');
  const progress = status === 'preparing' ? '\nPreparação em andamento; os resultados anteriores foram invalidados.\n' : '';
  write(outputRoot, 'README.md', document('Exemplos de maturidade', `Projetos sintéticos com cópias locais da estrutura de agentes.\nNenhum resultado certifica produção, revisão humana ou outros sistemas operacionais.\n${progress}\n| Cenário | Nível esperado | Resultado |\n| --- | --- | --- |${rows ? '\n' + rows : ''}\n\nRelatório: \`REPORT.json\`. Logs e evidências por projeto ficam em \`.agent-tests/\`.\nPastas sem marcador deste gerador são preservadas.\n`, `status: ${status}\n`));
}

function hashes(root, files) { return Object.fromEntries(files.map(file => [file, digest(readFileSync(join(root, file)))])); }

function managedHashes(root, roots) {
  const result = {};
  function visit(relativePath) {
    const full = join(root, relativePath); if (!existsSync(full)) return;
    const info = lstatSync(full); if (info.isSymbolicLink()) fail(`Espelho simbólico: ${relativePath}`);
    if (info.isDirectory()) for (const name of readdirSync(full).sort()) visit(join(relativePath, name));
    else if (info.isFile()) result[portable(relativePath)] = digest(readFileSync(full));
  }
  for (const file of [...roots, '.pbai4devs/catalog.json', '.pbai4devs/skills.json', '.pbai4devs/rules.json', '.pbai4devs/agents.json']) visit(file);
  return result;
}

function pointer(root, roots) {
  const entry = json(join(root, '.pbai4devs/skills.json')).entries[0]?.path;
  if (!entry) fail('Catálogo copiado não contém uma skill para provar reparação.');
  for (const file of resourceTargets(root, `${entry}/SKILL.md`)) if (roots.includes(file.split('/')[0]) && existsSync(join(root, file))) return file;
  fail('Nenhum apontamento copiado encontrado.');
}

function runner(root, logRoot, commands) {
  return (script, args = [], expected = 0, label = script.replaceAll('/', '-')) => {
    const command = [script, ...args];
    const environment = { ...process.env }; delete environment.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, command, { cwd: root, env: environment, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    const output = `${result.stdout || ''}${result.stderr || ''}`;
    const log = write(root, `${logRoot}/${String(commands.length + 1).padStart(2, '0')}-${label}.log`, output || `(sem saída; status ${result.status})\n`);
    commands.push({ command: [process.execPath, ...command], status: result.status, expected, log: portable(relative(root, log)) });
    if (result.error || result.status !== expected) fail(`${label}: esperado ${expected}, recebido ${result.status}: ${result.error?.message || output.slice(-2000)}`);
    return { ...result, output, log: portable(relative(root, log)) };
  };
}

function resourceLifecycle(example, run) {
  const root = example.root; const sync = '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
  const initial = `${example.id}-lifecycle-probe`; const renamed = `${initial}-renamed`;
  const folder = name => `.pbai4devs/skills/projeto/${name}`;
  const source = name => `${folder(name)}/SKILL.md`;
  const catalogPath = '.pbai4devs/catalog.json'; const registryPath = '.pbai4devs/skills.json';
  const before = { catalog: readFileSync(join(root, catalogPath), 'utf8'), registry: readFileSync(join(root, registryPath), 'utf8') };
  const rows = readFileSync(join(root, '.pbai4devs/espelhos.conf'), 'utf8').split(/\r?\n/).filter(line => line.startsWith('agente|')).map(line => line.split('|'));
  const pointers = name => resourceTargets(root, source(name));
  const skill = (name, description) => `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\nLIFECYCLE_SOURCE_ONLY\n`;
  const assertEntry = (name, description) => {
    const entry = json(join(root, catalogPath)).skills.find(item => item.path === source(name));
    if (!entry || entry.name !== name || entry.description !== description) fail(`Catálogo não refletiu ${name}.`);
    if (!json(join(root, registryPath)).entries.some(item => item.path === folder(name))) fail(`Registro nativo não refletiu ${name}.`);
    for (const file of pointers(name)) {
      const text = readFileSync(join(root, file), 'utf8');
      if (!text.includes(`name: ${name}`) || !text.includes(description) || text.includes('LIFECYCLE_SOURCE_ONLY')) fail(`Apontamento incorreto: ${file}`);
    }
  };
  if (existsSync(join(root, folder(initial))) || existsSync(join(root, folder(renamed)))) fail('A skill temporária já existe na cópia.');
  write(root, source(initial), skill(initial, 'Criada pelo teste de ciclo.'));
  run(sync, ['--check'], 1, 'lifecycle-create-detected'); run(sync, [], 0, 'lifecycle-create-sync');
  assertEntry(initial, 'Criada pelo teste de ciclo.');
  write(root, source(initial), skill(initial, 'Descrição alterada pelo teste.'));
  run(sync, ['--check'], 1, 'lifecycle-edit-detected'); run(sync, [], 0, 'lifecycle-edit-sync');
  assertEntry(initial, 'Descrição alterada pelo teste.');
  renameSync(join(root, folder(initial)), join(root, folder(renamed)));
  write(root, source(renamed), skill(renamed, 'Recurso renomeado pelo teste.'));
  run(sync, ['--check'], 1, 'lifecycle-rename-detected'); run(sync, [], 0, 'lifecycle-rename-sync');
  assertEntry(renamed, 'Recurso renomeado pelo teste.');
  if (pointers(initial).some(file => existsSync(join(root, file))) || json(join(root, catalogPath)).skills.some(item => item.path === source(initial))) fail('Renomeação preservou o recurso antigo.');
  rmSync(join(root, folder(renamed)), { recursive: true });
  run(sync, ['--check'], 1, 'lifecycle-delete-detected'); run(sync, [], 0, 'lifecycle-delete-sync');
  if (pointers(renamed).some(file => existsSync(join(root, file)))) fail('Remoção preservou apontamentos antigos.');
  if (readFileSync(join(root, catalogPath), 'utf8') !== before.catalog || readFileSync(join(root, registryPath), 'utf8') !== before.registry) fail('O ciclo não restaurou os catálogos originais.');
  const corrupted = '{"tampered":true}\n'; write(root, catalogPath, corrupted);
  run(sync, ['--check'], 1, 'catalog-drift-detected');
  const repair = run(sync, ['--force'], 0, 'catalog-drift-repaired');
  const backup = repair.output.match(/Backup local: (.+)/)?.[1]?.trim();
  if (!backup || readFileSync(join(root, backup, catalogPath), 'utf8') !== corrupted) fail('Correção forçada não preservou backup do JSON alterado.');
  rmSync(join(root, catalogPath)); run(sync, ['--check'], 1, 'catalog-missing-detected');
  run(sync, [], 0, 'catalog-missing-repaired'); run(sync, ['--check'], 0, 'lifecycle-clean');
  if (readFileSync(join(root, catalogPath), 'utf8') !== before.catalog || readFileSync(join(root, registryPath), 'utf8') !== before.registry) fail('Catálogos não foram restaurados após corrupção/remoção.');
  return { status: 'passed', operations: ['create', 'edit-description', 'rename', 'delete', 'corrupt-json', 'remove-json'], clients: rows.length, backup, sourceRestored: true };
}

function reviewContract(example, run, proof) {
  const id = `maturity-${example.id}`; const execution = 'contract';
  const script = '.pbai4devs/scripts/revisar-entrega/SCRIPT.mjs';
  const scope = example.application.scope.length ? example.application.scope : ['README.md'];
  const args = ['prepare', '--id', id, '--execution', execution, ...(example.application.spec ? ['--spec', example.application.spec] : []), ...scope.flatMap(file => ['--scope', file])];
  const prepared = run(script, args, 0, 'review-prepare');
  const reportFile = JSON.parse(prepared.stdout).report;
  run(script, ['check', reportFile], 1, 'review-pending-denied');
  const report = json(join(example.root, reportFile));
  const evidence = `.agent-tests/${id}/${execution}/proof.log`;
  write(example.root, evidence, readFileSync(join(example.root, proof.log)));
  for (const item of report.documentation) Object.assign(item, { decision: 'no-impact', reason: 'Documento de cenário sintético inspecionado para simulação contratual do gate.' });
  report.validation = example.application.criteria.map(criterion => ({ criterion, method: proof.method, prerequisite: 'Node.js 24+; somente fixtures locais, sem pacotes externos.', assertion: criterion === 'AC-001' ? (example.app ? 'GET /health retorna HTTP 200 e status ok.' : 'Os apontamentos copiados passam em sync --check.') : criterion === 'AC-002' ? 'POST /sum calcula 2+3 e rejeita entrada inválida.' : 'O módulo cálculo valida soma e cancelamento.', evidence: [evidence], status: 'passed' }));
  report.review = { status: 'approved', reviewer: 'testar-maturidade:simulacao-contratual-sem-revisao-humana', findings: [] };
  report.simulation = { kind: 'gate-contract-test', humanReview: false, productApproval: false };
  const save = () => write(example.root, reportFile, JSON.stringify(report, null, 2) + '\n');
  report.validation[0].status = 'failed'; save();
  const failed = run(script, ['check', reportFile], 1, 'review-failed-denied');
  if (!failed.output.includes('Criterio sem prova')) fail('O gate não recusou o critério falho pelo motivo esperado.');
  report.validation[0].status = 'passed'; save();
  run(script, ['check', reportFile], 1, 'review-unsealed-denied');
  run(script, ['seal', reportFile], 0, 'review-seal');
  run(script, ['check', reportFile], 0, 'review-positive');
  const changed = scope[0]; const original = readFileSync(join(example.root, changed));
  try {
    write(example.root, changed, Buffer.concat([original, Buffer.from('\n/* maturity stale probe */\n')]));
    const stale = run(script, ['check', reportFile], 1, 'review-stale-denied');
    if (!stale.output.includes('mudaram depois do snapshot')) fail('O gate não recusou alteração posterior pelo motivo esperado.');
  } finally { write(example.root, changed, original); }
  run(script, ['check', reportFile], 0, 'review-restored');
  return { status: 'passed', type: 'contract-simulation', humanReview: false, spec: example.application.spec || null, report: reportFile, evidence, rejected: ['pending', 'failed', 'unsealed', 'stale'] };
}

export function testExample(example) {
  const commands = []; const logRoot = '.agent-tests/maturity';
  const run = runner(example.root, logRoot, commands);
  const result = { id: example.id, expected: example.expected, status: 'failed', copied: { files: example.copied.copiedFiles, roots: example.copied.roots, skipped: example.copied.skipped, sourceDigest: example.copied.sourceDigest, entrypoints: example.copied.entrypoints }, commands, limits: ['Executado somente no SO/runtime deste host.', 'Estado de produto e revisão do gate são dados sintéticos.', 'Build Docker, UI e implantação não são exercitados.', 'Cópia exclui credenciais por nomes conhecidos, sem varredura semântica de segredos.'] };
  const preserved = hashes(example.root, example.application.protected);
  try {
    const sync = '.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
    run(sync, [], 0, 'sync-prepare-copy');
    run(sync, ['--check'], 0, 'sync-initial');
    const damaged = pointer(example.root, example.copied.roots); rmSync(join(example.root, damaged));
    run(sync, ['--check'], 1, 'sync-damage-detected'); run(sync, [], 0, 'sync-repair');
    const proofSync = run(sync, ['--check'], 0, 'sync-repaired');
    const before = managedHashes(example.root, example.copied.roots);
    run(sync, [], 0, 'sync-idempotent');
    if (JSON.stringify(before) !== JSON.stringify(managedHashes(example.root, example.copied.roots))) fail('A segunda sincronização alterou os espelhos.');
    if (['somente-agentes', 'manutencao'].includes(example.id)) result.resourceLifecycle = resourceLifecycle(example, run);
    const resourceCheck = run('.pbai4devs/scripts/verificar-recursos/SCRIPT.mjs', [], 0, 'resources-check');
    if (!resourceCheck.output.includes('recursos=passed') || !resourceCheck.output.includes('markdownlint-cli2=missing')) fail('Verificação nativa/linter ausente não foi reportada como esperado.');
    result.resourceCheck = { status: 'passed', markdownlint: 'not-installed-expected', log: resourceCheck.log };
    const catalog = run('.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs', ['list'], 0, 'tool-catalog');
    const tools = catalog.stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    if (!tools.length || tools.length !== example.copied.toolDefinitions || tools.some(tool => tool.installed !== null)) fail('O catálogo deve conter somente as definições copiadas, sem pacotes instalados.');
    const absent = run('.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs', ['check', 'base'], 1, 'tools-absent-expected');
    if (!absent.output.includes('Ferramenta ausente')) fail('O check negativo não falhou pela ausência esperada da ferramenta.');
    const diagnosis = JSON.parse(run('.pbai4devs/scripts/diagnosticar-ambiente/SCRIPT.mjs', [], 0, 'diagnosis').stdout);
    if (diagnosis.runtime?.name !== 'node') fail('Diagnóstico não reconheceu Node.');
    const inspection = JSON.parse(run('.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs', [], 0, 'inspection').stdout);
    run('.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs', ['--check'], example.complete ? 0 : 1, 'inspection-contract');
    if (inspection.maturity?.level !== example.expected || inspection.contract?.complete !== example.complete) fail(`Maturidade/contrato divergente: ${JSON.stringify(inspection.maturity)}; complete=${inspection.contract?.complete}`);
    if (example.layout === 'monorepo') {
      for (const file of ['apps/painel com espaços/package.json', 'packages/cálculo/package.json']) if (!inspection.manifests.includes(file)) fail(`Monorepo não detectou ${file}`);
      if (existsSync(join(example.root, 'src'))) fail('O cenário monorepo não deve criar scaffold src na raiz.');
    }
    let proof = { log: proofSync.log, method: 'node .pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs --check' };
    if (example.app) {
      const tested = run('--test', example.application.tests, 0, 'http-tests');
      for (const criterion of example.application.criteria) if (!tested.output.includes(criterion)) fail(`Teste real não registrou ${criterion}.`);
      proof = { log: tested.log, method: `node --test ${example.application.tests.map(file => JSON.stringify(file)).join(' ')}` };
      result.applicationProof = { type: 'real-http', assertions: example.application.criteria, log: tested.log, serverLifetime: 'portas efêmeras, fechadas por t.after' };
    }
    result.reviewGate = reviewContract(example, run, proof);
    if (JSON.stringify(preserved) !== JSON.stringify(hashes(example.root, example.application.protected))) fail('Código ou configuração preexistente do cenário foi alterado.');
    result.preserved = example.application.protected;
    result.maturity = inspection.maturity; result.structure = inspection.contract;
    result.status = 'passed';
  } catch (error) { result.error = error.message; }
  write(example.root, `${logRoot}/REPORT.json`, JSON.stringify(result, null, 2) + '\n');
  return result;
}

export function runExamples(options = {}) {
  const examples = prepareExamples(options);
  const results = examples.map(example => { const result = testExample(example); console.log(`${example.id}=${result.status}${result.error ? ': ' + result.error : ''}`); return result; });
  const outputRoot = resolve(options.outputRoot || defaultOutput(options.sourceRoot || projectRoot));
  const report = { owner, version: 1, status: results.every(item => item.status === 'passed') ? 'passed' : 'failed', platform: process.platform, arch: process.arch, node: process.version, results, limits: ['Provas reais somente das operações descritas e APIs locais.', 'Pareceres do gate são simulações explícitas, sem revisão humana.', 'Não certifica produção nem sistemas operacionais não executados.'] };
  write(outputRoot, 'REPORT.json', JSON.stringify(report, null, 2) + '\n');
  writeIndex(outputRoot, examples.map(example => ({ ...example, status: results.find(result => result.id === example.id).status })), report.status);
  return { outputRoot, report };
}

export function main(args = process.argv.slice(2)) {
  requireNode(); const [mode = 'help', ...rest] = args;
  if (['help', '--help', '-h'].includes(mode)) { console.log('Uso: testar-maturidade prepare|run [--case <id>]. Exemplos gerados em examples/generated; apenas pastas marcadas são substituídas.'); return 0; }
  if (!['prepare', 'run'].includes(mode)) fail('Use prepare ou run.');
  let scenarios = SCENARIOS;
  if (rest.length) {
    if (rest.length !== 2 || rest[0] !== '--case') fail('Use --case <id>.');
    scenarios = SCENARIOS.filter(item => item.id === rest[1]); if (!scenarios.length) fail('Cenário desconhecido.');
  }
  if (mode === 'prepare') { const examples = prepareExamples({ scenarios }); console.log(`prepared=${examples.length}`); return 0; }
  return runExamples({ scenarios }).report.status === 'passed' ? 0 : 1;
}

if (isMain(import.meta.url)) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
