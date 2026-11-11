#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureRuntime, environmentWithNode } from '../.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.mjs';

const file = fileURLToPath(import.meta.url);
export async function run(argv = process.argv.slice(2), options = {}) {
  const version = options.nodeVersion || process.versions.node;
  const language = argv.includes('en') ? 'en' : argv.includes('es') ? 'es' : 'pt';
  if (!(options.bun ?? process.versions.bun) && Number(version.split('.')[0]) >= 24) {
    const { main } = await import('../src/cli.mjs'); return main(argv, options);
  }
  let error;
  try {
    if (Number(version.split('.')[0]) < 18) throw new Error('Instale Node.js 24+ pelo gerenciador do sistema operacional.');
    const runtime = await (options.ensureRuntime || ensureRuntime)({ root: resolve(dirname(file), '..'), run: options.spawn || spawnSync });
    const result = (options.spawn || spawnSync)(runtime.node, [file, ...argv], { stdio: 'inherit', env: environmentWithNode(process.env, runtime.node) });
    if (result.error) throw result.error;
    return result.status ?? 1;
  } catch (cause) { error = cause; }
  const message = language === 'en' ? 'Could not prepare Node.js 24+.' : language === 'es' ? 'No se pudo preparar Node.js 24+.' : 'Não foi possível preparar Node.js 24+.';
  const next = [{ command: 'https://nodejs.org/en/download', label: 'Node.js 24+' }];
  const output = options.stdout || process.stdout;
  if (argv.includes('--json')) output.write(`${JSON.stringify({ ok: false, command: 'runtime', language, message, detail: error?.message, next })}\n`);
  else output.write(`${message}\n\n[ ${language === 'en' ? 'Next step' : language === 'es' ? 'Próximo paso' : 'Próximo passo'} ]\n  > ${next[0].command}\n`);
  return 1;
}

function isEntrypoint() {
  try { return Boolean(process.argv[1]) && realpathSync(resolve(process.argv[1])) === realpathSync(file); }
  catch { return false; }
}
if (isEntrypoint()) process.exitCode = await run();
