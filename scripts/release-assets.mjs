#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) throw new Error('A release exige uma versão estável SemVer.');
  if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== `v${pkg.version}`) throw new Error('A tag difere da versão do pacote.');
  if (!process.env.npm_execpath) throw new Error('Execute npm run pack:release.');
  const output = join(root, '.agent-tests', 'release', pkg.version);
  mkdirSync(output, { recursive: true });
  const packed = spawnSync(process.execPath, [process.env.npm_execpath, 'pack', '--ignore-scripts', '--json', '--pack-destination', output], { cwd: root, encoding: 'utf8', timeout: 120000 });
  if (packed.error || packed.status !== 0) throw new Error(packed.error?.message || packed.stderr || 'npm pack falhou.');
  const [result] = JSON.parse(packed.stdout);
  const paths = result.files.map(item => item.path);
  if (!paths.includes('bin/agentdevkit.mjs') || !paths.some(path => path.startsWith('.pbai4devs/skills/'))) throw new Error('Pacote sem CLI ou skills.');
  if (paths.some(path => /(^|\/)(?:\.git|\.agent-tests|node_modules|\.local|\.cache|tmp|temp)(\/|$)/i.test(path) || /(^|\/)\.playwright/i.test(path))) throw new Error('Pacote inclui artefatos locais.');
  const file = join(output, `agentdevkit-${pkg.version}.tgz`);
  const generated = join(output, basename(result.filename));
  if (generated !== file) renameSync(generated, file);
  const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex');
  writeFileSync(join(output, 'SHA256SUMS'), `${sha256}  ${basename(file)}\n`);
  const url = `https://github.com/pathbit/AgentDevKit/releases/download/v${pkg.version}/${basename(file)}`;
  const command = `npx --yes --ignore-scripts --package=${url} agentdevkit init`;
  writeFileSync(join(output, 'NOTES.txt'), `# AgentDevKit ${pkg.version}\n\nKit de skills, specs e comandos para agentes de código.\n\n## Instalar\n\n\`\`\`sh\n${command}\n\`\`\`\n\nPortuguês é o padrão; use \`--lang en\` ou \`--lang es\`. Requer Node.js 24+ com npm.\n\nO arquivo SHA256SUMS permite conferir o pacote publicado.\n\n**[ Próximo passo ]** Execute o comando de instalação na pasta do projeto.\n`);
  writeFileSync(join(output, 'package-manifest.json'), JSON.stringify({ version: pkg.version, file: basename(file), sha256, files: result.files }, null, 2) + '\n');
  console.log(JSON.stringify({ version: pkg.version, file, sha256, files: paths.length }));
  console.log('\n[ Próximo passo ] Valide o pacote e publique a release correspondente no GitHub.');
} catch (error) {
  console.error(error.message);
  console.error('\n[ Próximo passo ] Corrija o erro e execute npm run pack:release novamente.');
  process.exitCode = 1;
}
