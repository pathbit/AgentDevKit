#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
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

export function buildRelease(root = releaseRoot, { env = process.env } = {}) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Use Node.js 24+.');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) throw new Error('A release exige uma versão estável SemVer.');
  if (env.GITHUB_REF_TYPE === 'tag' && env.GITHUB_REF_NAME !== `v${pkg.version}`) throw new Error('A tag difere da versão do pacote.');
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) throw new Error('A versão do lockfile difere da versão do pacote.');
  if (env.GITHUB_SHA && !/^[a-f0-9]{40}$/i.test(env.GITHUB_SHA)) throw new Error('Commit de origem inválido.');
  const output = join(root, '.agent-tests', 'release', pkg.version);
  mkdirSync(output, { recursive: true });
  const packed = spawnSync(process.execPath, [npmExecutable(env), 'pack', '--ignore-scripts', '--json', '--pack-destination', output], { cwd: root, env, encoding: 'utf8', timeout: 120000, shell: false });
  if (packed.error || packed.status !== 0) throw new Error(packed.error?.message || packed.stderr || 'npm pack falhou.');
  const [result] = JSON.parse(packed.stdout);
  const paths = result.files.map(item => item.path);
  if (!paths.includes('bin/agentdevkit.mjs') || !paths.includes('src/cli.mjs') || !paths.some(path => path.startsWith('.pbai4devs/skills/'))) throw new Error('Pacote sem CLI, núcleo ou skills.');
  if (paths.some(path => /(^|\/)(?:\.git|\.agent-tests|node_modules|\.local|\.cache|tmp|temp)(\/|$)/i.test(path) || /(^|\/)\.playwright/i.test(path) || /^(?:tests|scripts\/release|examples)\//.test(path))) throw new Error('Pacote inclui artefatos locais ou arquivos exclusivos de desenvolvimento.');
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
