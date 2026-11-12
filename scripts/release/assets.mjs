#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findNpmCli } from '../../.pbai4devs/scripts/lib/npm.mjs';

export const releaseRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const sha256 = value => createHash('sha256').update(value).digest('hex');

export function npmExecutable(env = process.env, nodePath = process.execPath) {
  const file = findNpmCli({ node: nodePath, environment: env });
  if (!file) throw new Error('Node.js 24+ e npm são necessários para empacotar.');
  return file;
}

function repositoryBase(pkg) {
  const source = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  const match = source?.match(/^(?:git\+)?https:\/\/github\.com\/([^/]+)\/([^/#]+?)(?:\.git)?\/?$/);
  if (!match) throw new Error('Metadados exigem repository HTTPS do GitHub.');
  return `https://github.com/${match[1]}/${match[2]}/blob/master/`;
}

function validateMetadata(pkg) {
  const present = value => typeof value === 'string' && value.trim().length > 0;
  for (const key of ['name', 'description', 'license']) {
    if (!present(pkg[key])) throw new Error(`Metadado obrigatório ausente: ${key}.`);
  }
  if (!present(typeof pkg.author === 'string' ? pkg.author : pkg.author?.name)) throw new Error('Metadado obrigatório ausente: author.');
  if (!Array.isArray(pkg.keywords) || !pkg.keywords.length || !pkg.keywords.every(present)) throw new Error('Metadado obrigatório ausente: keywords.');
  for (const [key, value] of [['homepage', pkg.homepage], ['bugs', typeof pkg.bugs === 'string' ? pkg.bugs : pkg.bugs?.url]]) {
    if (!present(value) || !/^https:\/\//.test(value)) throw new Error(`Metadado HTTPS obrigatório ausente: ${key}.`);
    try { new URL(value); } catch { throw new Error(`Metadado HTTPS inválido: ${key}.`); }
  }
  if (pkg.bin?.agentdevkit !== 'bin/agentdevkit.mjs' || !present(pkg.engines?.node)) throw new Error('Metadados de CLI e Node.js obrigatórios.');
  return repositoryBase(pkg);
}

function rewriteInlineLinks(line, target) {
  let output = '', cursor = 0;
  for (let index = 0; index < line.length; index++) {
    if (line[index] === '\\') { index++; continue; }
    if (line[index] === '`') {
      const ticks = /^`+/.exec(line.slice(index))[0];
      let end = line.indexOf(ticks, index + ticks.length);
      while (end >= 0 && (line[end - 1] === '`' || line[end + ticks.length] === '`')) end = line.indexOf(ticks, end + ticks.length);
      if (end >= 0) { index = end + ticks.length - 1; continue; }
    }
    if (line[index] !== ']' || line[index + 1] !== '(') continue;
    let start = index + 2;
    while (/\s/.test(line[start] || '') && start < line.length) start++;
    const angled = line[start] === '<';
    if (angled) start++;
    let end = start, depth = 0;
    for (; end < line.length; end++) {
      const char = line[end];
      if (char === '\\') { end++; continue; }
      if (angled ? char === '>' : depth === 0 && (char === ')' || /\s/.test(char))) break;
      if (!angled && char === '(') depth++;
      if (!angled && char === ')') depth--;
    }
    if (end === start || end >= line.length) continue;
    const suffix = line.slice(end + (angled ? 1 : 0));
    const close = /^\s*(?:(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))\s*)?\)/.exec(suffix);
    if (!close) continue;
    output += line.slice(cursor, start) + target(line.slice(start, end));
    cursor = end;
    index = end + (angled ? 1 : 0) + close[0].length - 1;
  }
  return output + line.slice(cursor);
}

export function renderNpmReadme(source, base) {
  const body = source.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').replace(/^(?:\r?\n)+/, '');
  if (!/^#\s+\S/m.test(body)) throw new Error('README.md exige um título H1.');
  const target = value => {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) return value;
    const link = new URL(value.replace(/^\/+/, ''), base);
    if (!link.href.startsWith(base)) throw new Error(`Link do README fora do repositório: ${value}`);
    return link.href;
  };
  let fence = null;
  return body.split(/(?<=\n)/).map(line => {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
      return line;
    }
    if (marker) { fence = marker[1]; return line; }
    const reference = /^( {0,3}\[[^\]]+\]:\s*)(?:<([^>]+)>|(\S+))(.*)$/.exec(line.replace(/\r?\n$/, ''));
    if (reference) return `${reference[1]}${reference[2] !== undefined ? `<${target(reference[2])}>` : target(reference[3])}${reference[4]}${line.endsWith('\r\n') ? '\r\n' : line.endsWith('\n') ? '\n' : ''}`;
    return rewriteInlineLinks(line, target);
  }).join('');
}

function validatePaths(paths) {
  for (const path of paths) {
    if (typeof path !== 'string' || !path || isAbsolute(path) || /[\\\x00-\x1f:]/.test(path) || path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Caminho inválido no pacote.');
  }
  if (!paths.includes('bin/agentdevkit.mjs') || !paths.includes('src/cli.mjs') || !paths.some(path => path.startsWith('.pbai4devs/skills/'))) throw new Error('Pacote sem CLI, núcleo ou skills.');
  if (!paths.includes('README.md') || !paths.includes('LICENSE')) throw new Error('Pacote exige README.md e LICENSE.');
  if (paths.some(path => /(^|\/)(?:\.git|\.agent-tests|node_modules|\.local|\.cache|tmp|temp)(\/|$)/i.test(path) || /(^|\/)\.playwright/i.test(path) || /^(?:tests|scripts\/release|examples)\//.test(path))) throw new Error('Pacote inclui artefatos locais ou arquivos exclusivos de desenvolvimento.');
}

export function buildRelease(root = releaseRoot, { env = process.env } = {}) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Use Node.js 24+.');
  root = resolve(root);
  const packageBytes = readFileSync(join(root, 'package.json'));
  const pkg = JSON.parse(packageBytes);
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) throw new Error('A release exige uma versão estável SemVer.');
  if (env.GITHUB_REF_TYPE === 'tag' && env.GITHUB_REF_NAME !== `v${pkg.version}`) throw new Error('A tag difere da versão do pacote.');
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) throw new Error('A versão do lockfile difere da versão do pacote.');
  if (env.GITHUB_SHA && !/^[a-f0-9]{40}$/i.test(env.GITHUB_SHA)) throw new Error('Commit de origem inválido.');
  const base = validateMetadata(pkg);
  const license = readFileSync(join(root, 'LICENSE'));
  if (!license.toString('utf8').trim()) throw new Error('LICENSE não pode estar vazia.');
  const readmeSource = readFileSync(join(root, 'README.md'));
  const readme = renderNpmReadme(readmeSource.toString('utf8'), base);
  const npm = npmExecutable(env);
  const pack = (directory, args) => {
    const result = spawnSync(process.execPath, [npm, 'pack', '--ignore-scripts', '--json', ...args], { cwd: directory, env, encoding: 'utf8', timeout: 120000, shell: false });
    if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || 'npm pack falhou.');
    const data = JSON.parse(result.stdout);
    if (!Array.isArray(data) || data.length !== 1 || !Array.isArray(data[0].files)) throw new Error('Resultado inválido de npm pack.');
    return data[0];
  };
  const listed = pack(root, ['--dry-run']);
  const originalPaths = listed.files.map(item => item.path);
  validatePaths(originalPaths);
  const canonical = realpathSync(root);
  const stage = mkdtempSync(join(tmpdir(), 'agentdevkit-package-'));
  let result;
  const output = join(root, '.agent-tests', 'release', pkg.version);
  try {
    for (const path of originalPaths) {
      const source = join(root, path), destination = join(stage, path);
      let ancestor = source;
      while (ancestor !== root && ancestor !== dirname(ancestor)) {
        if (lstatSync(ancestor).isSymbolicLink()) throw new Error(`Link simbólico recusado no pacote: ${path}`);
        ancestor = dirname(ancestor);
      }
      const info = lstatSync(source), within = relative(canonical, realpathSync(source));
      if (!info.isFile() || within === '..' || within.startsWith(`..${sep}`) || isAbsolute(within)) throw new Error(`Arquivo fora do pacote: ${path}`);
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(source, destination); chmodSync(destination, info.mode & 0o777);
    }
    if (!readFileSync(join(stage, 'package.json')).equals(packageBytes) || !readFileSync(join(stage, 'README.md')).equals(readmeSource)) throw new Error('Metadados ou README mudaram durante o empacotamento.');
    writeFileSync(join(stage, 'README.md'), readme);
    if (!readFileSync(join(stage, 'LICENSE')).equals(license)) throw new Error('LICENSE mudou durante o empacotamento.');
    mkdirSync(output, { recursive: true });
    result = pack(stage, ['--pack-destination', output]);
    validatePaths(result.files.map(item => item.path));
    if (JSON.stringify([...originalPaths].sort()) !== JSON.stringify(result.files.map(item => item.path).sort())) throw new Error('O inventário mudou durante o empacotamento.');
  } finally { rmSync(stage, { recursive: true, force: true }); }
  const paths = result.files.map(item => item.path);
  const file = join(output, `agentdevkit-${pkg.version}.tgz`);
  const generated = join(output, basename(result.filename));
  if (generated !== file) renameSync(generated, file);
  const digest = sha256(readFileSync(file));
  writeFileSync(join(output, 'SHA256SUMS'), `${digest}  ${basename(file)}\n`);
  const registry = pkg.publishConfig?.registry || 'https://registry.npmjs.org';
  const publicNpm = new URL(registry).hostname === 'registry.npmjs.org';
  const command = `npx --yes --ignore-scripts${publicNpm ? '' : ` --registry=${registry}`} --package=${pkg.name}@${pkg.version} agentdevkit init`;
  const scopedName = pkg.name.match(/^@([^/]+)\/(.+)$/);
  const github = new URL(registry).hostname === 'npm.pkg.github.com';
  const repository = (typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url)?.match(/^(?:git\+)?https:\/\/github\.com\/([^/]+)\/([^/#]+?)(?:\.git)?\/?$/);
  const packageSlug = encodeURIComponent(scopedName?.[2] || pkg.name);
  const packagePage = publicNpm ? `https://www.npmjs.com/package/${pkg.name}` : repository ? `https://github.com/${repository[1]}/${repository[2]}/pkgs/npm/${packageSlug}` : `https://github.com/orgs/${encodeURIComponent(scopedName?.[1] || 'pathbit')}/packages/npm/package/${packageSlug}`;
  const authentication = publicNpm ? `Pacote público: [${pkg.name}](${packagePage}). A instalação não exige login.\n\n` : github ? `Pacote: [${pkg.name}](${packagePage}).\n\nAutentique-se uma vez antes de instalar:\n\n\`\`\`text\nnpm login${scopedName ? ` --scope=@${scopedName[1]}` : ''} --auth-type=legacy --registry=${registry}\n\`\`\`\n\nUse um token pessoal classic com \`read:packages\` e acesso ao pacote; mantenha a credencial fora do repositório.\n\n` : '';
  writeFileSync(join(output, 'NOTES.txt'), `# AgentDevKit ${pkg.version}\n\nKit de skills, specs e comandos para agentes de código.\n\n## Instalar\n\n${authentication}\`\`\`text\n${command}\n\`\`\`\n\nUse Node.js 18+ com npm. O launcher prepara Node.js 24+ local quando necessário; o core usa Node.js 24+. Sem Node/npm, instale-os antes pelo gerenciador do sistema.\n\nPortuguês é o padrão; use \`--lang en\` ou \`--lang es\`. Informe os agentes com \`--agents codex,claude\` ou responda à pergunta inicial.\n\n## Artefatos técnicos\n\n\`${basename(file)}\` e \`SHA256SUMS\` permitem conferir os bytes publicados no registry.\n\n**[ Próximo passo ]** Execute o comando de instalação na pasta do projeto.\n`);
  const manifest = {
    version: pkg.version, file: basename(file), sha256: digest, files: result.files,
    sourceCommit: env.GITHUB_SHA || null,
    provenance: {
      repository: env.GITHUB_REPOSITORY || null, workflow: env.GITHUB_WORKFLOW || null,
      runId: env.GITHUB_RUN_ID || null, runAttempt: env.GITHUB_RUN_ATTEMPT || null,
      event: env.GITHUB_EVENT_NAME || null, ref: env.GITHUB_REF || null,
    },
  };
  writeFileSync(join(output, 'package-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { version: pkg.version, file, sha256: digest, files: paths.length, directory: output };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(buildRelease()));
    console.log('\n[ Próximo passo ] Valide o pacote e publique a release correspondente.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
