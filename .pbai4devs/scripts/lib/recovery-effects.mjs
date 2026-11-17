// Experimental classification of parsed CLI options. This does not inspect a
// journal, block commands, or prove that planning has no filesystem effects.
import { types } from 'node:util';

const keys = new Set([
  'command', 'positionals', 'toolArgs', 'target', 'language', 'clients',
  'yes', 'json', 'dryRun', 'force', 'check', 'help', 'version', 'intent',
]);
const required = ['command', 'positionals', 'toolArgs', 'target', 'language',
  'clients', 'yes', 'json', 'dryRun', 'force', 'check'];

function stringArray(value) {
  if (types.isProxy(value) || !Array.isArray(value)
    || Object.getPrototypeOf(value) !== Array.prototype || value.length > 10000) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== value.length + 1) return false;
  for (let index = 0; index < value.length; index++) {
    const item = descriptors[index];
    if (!item || !Object.hasOwn(item, 'value') || typeof item.value !== 'string') return false;
  }
  return true;
}

export function classifyRecoveryEffects(options) {
  if (!options || typeof options !== 'object' || types.isProxy(options)
    || Object.getPrototypeOf(options) !== Object.prototype) return 'unsupported';
  const descriptors = Object.getOwnPropertyDescriptors(options);
  if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string' || !keys.has(key))
    || required.some(key => !Object.hasOwn(descriptors, key))
    || Object.values(descriptors).some(item => !Object.hasOwn(item, 'value'))) return 'unsupported';
  const get = key => Object.hasOwn(descriptors, key) ? descriptors[key].value : undefined;
  const positionals = get('positionals'), toolArgs = get('toolArgs'), clients = get('clients');
  if (![positionals, toolArgs].every(stringArray)
    || clients !== undefined && !stringArray(clients)
    || !['yes', 'json', 'dryRun', 'force', 'check'].every(key => typeof get(key) === 'boolean')
    || !['help', 'version'].every(key => get(key) === undefined || typeof get(key) === 'boolean')
    || ![null, 'pt', 'en', 'es'].includes(get('language'))
    || !(get('target') === null || typeof get('target') === 'string')
    || !(get('intent') === undefined || ['product', 'run'].includes(get('intent')))) return 'unsupported';

  const command = get('command');
  const known = ['init', 'update', 'sync', 'lang', 'agents', 'doctor', 'next', 'tools', 'help', 'version'];
  if (!known.includes(command)
    || positionals.length > 1 || positionals.length && !['init', 'lang', 'agents'].includes(command)
    || command === 'init' && get('target') !== null && positionals.length
    || command === 'agents' && positionals.length && clients === undefined
    || toolArgs.length && !['tools', 'help', 'version'].includes(command)
    || clients !== undefined && !['init', 'update', 'sync', 'lang', 'agents', 'help', 'version'].includes(command)
    || get('intent') !== undefined && !['next', 'help', 'version'].includes(command)
    || get('check') && command !== 'sync'
    || get('dryRun') && (!['init', 'update', 'sync', 'lang', 'agents'].includes(command)
      || command === 'agents' && clients === undefined)) return 'unsupported';
  if (command === 'tools') return 'opaque';
  if (['help', 'version', 'doctor', 'next'].includes(command)) return 'query';
  if (command === 'agents' && clients === undefined) return 'query';
  if (command === 'lang' && positionals.length === 0 && get('language') === null
    && clients === undefined) return 'query';
  if (get('dryRun') || command === 'sync' && get('check')) return 'planning';
  return 'mutation';
}
