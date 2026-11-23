import { normalizeClients } from '../adapters/index.mjs';
import { normalizeLanguage } from '../i18n.mjs';
import { validRecoveryResolution, validPluginRequest } from '../../.pbai4devs/scripts/lib/recovery-effects.mjs';

export function usage(message) { throw Object.assign(new Error(message), { code: 'E_ARGS', exitCode: 2 }); }

export function selectedClients(value) {
  try { return normalizeClients(value); }
  catch (error) { usage(error.message); }
}

export const purposes = ['agents', 'product', 'run', 'document'];

export function parseArgs(argv) {
  const options = { command: null, positionals: [], toolArgs: [], target: null, language: null, clients: undefined, yes: false, json: false, dryRun: false, force: false, check: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--' && options.command === 'tools') {
      options.toolArgs.push(...argv.slice(index));
      break;
    } else if (arg === '--integrations' && options.command !== 'tools') {
      if (options.integrations) usage('Use --integrations once.');
      options.integrations = true;
    } else if (arg === '--intent' && options.command !== 'tools') {
      const value = argv[++index];
      if (!['product', 'run', 'document'].includes(value)) usage('Use --intent product, run or document.');
      if (options.intent !== undefined) usage('Use --intent once.');
      options.intent = value;
    } else if (arg === '--purpose' && options.command !== 'tools') {
      const value = argv[++index];
      if (!purposes.includes(value)) usage('Use --purpose agents, product, run or document.');
      if (options.purpose !== undefined) usage('Use --purpose once.');
      options.purpose = value;
    } else if (arg === '--markdown' && options.command !== 'tools') {
      if (options.markdown) usage('Use --markdown once.');
      options.markdown = true;
    } else if (['--target', '--lang', '--agents', '--clients'].includes(arg)) {
      const value = argv[++index]; if (!value || value.startsWith('-')) usage(`Missing value: ${arg}`);
      if (arg === '--target') options.target = value;
      else if (arg === '--lang') { options.language = normalizeLanguage(value); if (!options.language) usage('Use --lang pt, en or es.'); }
      else { if (options.clients !== undefined) usage('Use --agents or --clients once.'); options.clients = selectedClients(value); }
    } else if (arg === '--json') options.json = true;
    else if (arg === '--yes' || arg === '-y') options.yes = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--check' && options.command !== 'tools') options.check = true;
    else if (options.command === 'tools') options.toolArgs.push(arg);
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--version' || arg === '-v') options.version = true;
    else if (arg.startsWith('-')) usage(`Unknown option: ${arg}`);
    else if (!options.command) options.command = arg;
    else options.positionals.push(arg);
  }
  if (!options.command) options.command = options.version ? 'version' : options.help ? 'help' : 'init';
  if (options.command === 'language') options.command = 'lang';
  if (options.command === 'clients') options.command = 'agents';
  if (!['init', 'update', 'doctor', 'sync', 'lang', 'agents', 'next', 'document', 'tools', 'plugins', 'help', 'version', 'recovery'].includes(options.command)) usage(`Unknown command: ${options.command}`);
  if (options.command === 'recovery' && (options.help || options.version)) options.positionals = [];
  if (options.help) options.command = 'help';
  if (options.version) options.command = 'version';
  if (options.command === 'recovery') {
    if (options.positionals.length && !validRecoveryResolution(options.positionals)) usage('Use recovery or recovery resolve <generation> <id>.');
    if (options.yes || options.force) usage('Recovery requires the explicit generation and operation ID.');
  } else if (options.command === 'plugins') {
    if (!validPluginRequest(options.positionals) || options.force || options.yes) usage('Use plugins list or plugins info|install|check <id>.');
  } else if (options.positionals.length > (options.command === 'agents' ? 2 : 1)
    || (options.positionals.length && !['init', 'lang', 'agents'].includes(options.command))) usage('Unexpected positional arguments.');
  if (options.command === 'init' && options.target && options.positionals.length) usage('Use a directory or --target, not both.');
  if (options.command === 'agents' && options.positionals.length) {
    if (options.clients !== undefined) usage('Use a selection argument or --agents, not both.');
    const [first, value] = options.positionals;
    const delta = ['add', 'remove'].includes(first);
    if (delta !== (value !== undefined)) usage('Use agents <ids> or agents add|remove <ids>.');
    options.clients = selectedClients(delta ? value : first);
    if (delta && options.clients.some(id => ['all', 'none'].includes(id))) usage('Use individual client IDs with agents add or remove.');
  }
  if (options.clients !== undefined && !['init', 'update', 'sync', 'lang', 'agents', 'help', 'version'].includes(options.command)) usage('--agents requires an installation or configuration command.');
  if (options.intent !== undefined && !['next', 'help', 'version'].includes(options.command)) usage('--intent requires next.');
  if (options.integrations && !['next', 'help', 'version'].includes(options.command)) usage('--integrations requires next.');
  if (options.purpose !== undefined && !['init', 'help', 'version'].includes(options.command)) usage('--purpose requires init.');
  if (options.markdown && (options.json || !['document', 'help', 'version'].includes(options.command))) usage('--markdown requires document without --json.');
  if (options.command === 'document' && (options.force || options.yes)) usage('document is a read-only command.');
  if (options.check && options.command !== 'sync') usage('--check requires sync.');
  if (options.dryRun && (!['init', 'update', 'sync', 'lang', 'agents'].includes(options.command) || (options.command === 'agents' && options.clients === undefined))) usage('--dry-run requires an installation or configuration change.');
  return options;
}
