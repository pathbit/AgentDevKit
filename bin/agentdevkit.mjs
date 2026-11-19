#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureRuntime, environmentWithNode } from '../.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.mjs';
import { isSupportedNodeVersion, windowsNode24Minimum } from '../.pbai4devs/scripts/lib/runtime.mjs';

const file = fileURLToPath(import.meta.url);
export async function run(argv = process.argv.slice(2), options = {}) {
  const version = options.nodeVersion || process.versions.node;
  const separator = argv.indexOf('--'), globalArgs = separator < 0 ? argv : argv.slice(0, separator);
  let selectedLanguage = '', command = '', languageArgument = '', terminalOption = false;
  for (let index = 0; index < globalArgs.length; index++) {
    const arg = globalArgs[index];
    if (arg === '--lang') selectedLanguage = globalArgs[++index] || '';
    else if (['--target', '--agents', '--clients'].includes(arg) || arg === '--intent' && command !== 'tools') index++;
    else if (['--help', '-h', '--version', '-v'].includes(arg) && command !== 'tools') terminalOption = true;
    else if (!arg.startsWith('-') && !command) command = arg;
    else if (!arg.startsWith('-') && ['lang', 'language'].includes(command) && !languageArgument) languageArgument = arg;
  }
  const locale = String((terminalOption ? '' : languageArgument) || selectedLanguage).toLowerCase();
  const language = locale === 'en' ? 'en' : locale === 'es' ? 'es' : 'pt';
  if (!(options.bun ?? process.versions.bun) && isSupportedNodeVersion(version)) {
    let main;
    try { ({ main } = await import('../src/cli.mjs')); }
    catch (error) {
      if (error?.code !== 'E_ADAPTER_POLICY_JSON') throw error;
      const message = language === 'en' ? 'Invalid adapter configuration JSON.' : language === 'es' ? 'JSON de configuracion de adaptadores invalido.' : 'JSON de configuracao de adaptadores invalido.';
      const output = options.stdout || process.stdout;
      if (globalArgs.includes('--json')) output.write(`${JSON.stringify({ ok: false, command: 'startup', language, message, error: { code: 'E_ADAPTER_POLICY_JSON' }, next: [] })}\n`);
      else output.write(`${message}\n`);
      return 1;
    }
    return main(argv, options);
  }
  let error;
  try {
    if (Number(version.split('.')[0]) < 18) throw new Error('Instale Node.js 24+ pelo gerenciador do sistema operacional.');
    const runtime = await (options.ensureRuntime || ensureRuntime)({ root: resolve(dirname(file), '..'), run: options.spawn || spawnSync });
    const result = (options.spawn || spawnSync)(runtime.node, [file, ...argv], { stdio: 'inherit', env: environmentWithNode(process.env, runtime.node) });
    if (result.error) throw result.error;
    return result.status ?? 1;
  } catch (cause) { error = cause; }
  const runtime = process.platform === 'win32' ? `Node.js ${windowsNode24Minimum}+ (LTS)` : 'Node.js 24+';
  const message = language === 'en' ? `Could not prepare ${runtime}.` : language === 'es' ? `No se pudo preparar ${runtime}.` : `Não foi possível preparar ${runtime}.`;
  const next = [{ command: 'https://nodejs.org/en/download', label: runtime }];
  const output = options.stdout || process.stdout;
  if (globalArgs.includes('--json')) output.write(`${JSON.stringify({ ok: false, command: 'runtime', language, message, detail: error?.message, next })}\n`);
  else output.write(`${message}\n\n[ ${language === 'en' ? 'Next step' : language === 'es' ? 'Próximo paso' : 'Próximo passo'} ]\n  > ${next[0].command}\n`);
  return 1;
}

function isEntrypoint() {
  try { return Boolean(process.argv[1]) && realpathSync(resolve(process.argv[1])) === realpathSync(file); }
  catch { return false; }
}
if (isEntrypoint()) process.exitCode = await run();
