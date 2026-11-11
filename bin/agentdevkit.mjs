#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(import.meta.url);
export async function run(argv = process.argv.slice(2), options = {}) {
  const version = options.nodeVersion || process.versions.node;
  const language = argv.includes('en') ? 'en' : argv.includes('es') ? 'es' : 'pt';
  if (!(options.bun ?? process.versions.bun) && Number(version.split('.')[0]) >= 24) {
    const { main } = await import('../src/cli.mjs'); return main(argv, options);
  }
  const spawn = options.spawn || spawnSync, platform = options.platform || process.platform;
  const script = join(dirname(file), '../.pbai4devs/scripts/preparar-ferramentas', platform === 'win32' ? 'BOOTSTRAP.ps1' : 'BOOTSTRAP.sh');
  const args = platform === 'win32' ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-RuntimeOnly'] : [script, '--runtime-only'];
  const prepared = spawn(platform === 'win32' ? 'powershell.exe' : 'sh', args, { encoding: 'utf8', timeout: 600000 });
  const runtime = prepared.stdout?.match(/^node=(.+)$/m)?.[1]?.trim();
  const checked = prepared.status === 0 && runtime && isAbsolute(runtime) ? spawn(runtime, ['--version'], { encoding: 'utf8' }) : null;
  if (checked?.status === 0 && /^v(?:2[4-9]|[3-9]\d|\d{3,})\./.test(checked.stdout?.trim() || '')) {
    const result = spawn(runtime, [file, ...argv], { stdio: 'inherit' }); return result.status ?? 1;
  }
  const message = language === 'en' ? 'Could not prepare Node.js 24+.' : language === 'es' ? 'No se pudo preparar Node.js 24+.' : 'Não foi possível preparar Node.js 24+.';
  const next = [{ command: 'https://nodejs.org/en/download', label: 'Node.js 24+' }];
  const output = options.stdout || process.stdout;
  if (argv.includes('--json')) output.write(`${JSON.stringify({ ok: false, command: 'runtime', language, message, detail: prepared.error?.message || prepared.stderr?.trim(), next })}\n`);
  else output.write(`${message}\n\n[ ${language === 'en' ? 'Next step' : language === 'es' ? 'Próximo paso' : 'Próximo passo'} ]\n  > ${next[0].command}\n`);
  return prepared.status || 1;
}

function isEntrypoint() {
  try { return Boolean(process.argv[1]) && realpathSync(resolve(process.argv[1])) === realpathSync(file); }
  catch { return false; }
}
if (isEntrypoint()) process.exitCode = await run();
