import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import { packageInfo } from './config.mjs';
import { text, normalizeLanguage, explainError } from './i18n.mjs';
import { resolveTarget, loadState, planInstallation, applyPlan, inspect } from './install.mjs';
import { getNextSteps } from './next.mjs';
import { availableClients, normalizeClients } from './adapters/index.mjs';

function usage(message) { throw Object.assign(new Error(message), { code: 'E_ARGS', exitCode: 2 }); }
function selectedClients(value) {
  try { return normalizeClients(value); }
  catch (error) { usage(error.message); }
}

export function parseArgs(argv) {
  const options = { command: null, positionals: [], toolArgs: [], target: null, language: null, clients: undefined, yes: false, json: false, dryRun: false, force: false, check: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (['--target', '--lang', '--agents', '--clients'].includes(arg)) {
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
  if (!['init', 'update', 'doctor', 'sync', 'lang', 'agents', 'next', 'tools', 'help', 'version'].includes(options.command)) usage(`Unknown command: ${options.command}`);
  if (options.help) options.command = 'help';
  if (options.version) options.command = 'version';
  if (options.positionals.length > 1 || (options.positionals.length && !['init', 'lang', 'agents'].includes(options.command))) usage('Unexpected positional arguments.');
  if (options.command === 'init' && options.target && options.positionals.length) usage('Use a directory or --target, not both.');
  if (options.command === 'agents' && options.positionals.length) {
    if (options.clients !== undefined) usage('Use a selection argument or --agents, not both.');
    options.clients = selectedClients(options.positionals[0]);
  }
  if (options.clients !== undefined && !['init', 'update', 'sync', 'lang', 'agents', 'help', 'version'].includes(options.command)) usage('--agents requires an installation or configuration command.');
  if (options.check && options.command !== 'sync') usage('--check requires sync.');
  if (options.dryRun && (!['init', 'update', 'sync', 'lang', 'agents'].includes(options.command) || (options.command === 'agents' && options.clients === undefined))) usage('--dry-run requires an installation or configuration change.');
  return options;
}

function print(result, options, output) {
  if (options.json) { output.write(`${JSON.stringify(result)}\n`); return; }
  output.write(`${result.message}\n`);
  if (result.clients) output.write(`${text(result.language, 'clientsCurrent')}: ${result.clients.join(', ')}\n`);
  if (result.availableClients) output.write(`${text(result.language, 'clientsAvailable')}: ${result.availableClients.map(client => client.id).join(', ')}\n`);
  if (result.toolOutput) output.write(`${result.toolOutput.trimEnd()}\n`);
  if (result.plan?.length) {
    const names = { pt: { create: 'criar', update: 'atualizar', remove: 'remover' }, en: { create: 'create', update: 'update', remove: 'remove' }, es: { create: 'crear', update: 'actualizar', remove: 'eliminar' } };
    const labels = {
      pt: { files: 'Arquivos', conflicts: 'Conflitos', more: 'caminhos adicionais; use --json para o plano completo.' },
      en: { files: 'Files', conflicts: 'Conflicts', more: 'additional paths; use --json for the complete plan.' },
      es: { files: 'Archivos', conflicts: 'Conflictos', more: 'rutas adicionales; use --json para el plan completo.' },
    }[result.language];
    output.write(`${labels.files}: ${['create', 'update', 'remove'].map(action => `${result.plan.filter(item => item.action === action).length} ${names[result.language][action]}`).join(', ')}.\n`);
    if (result.conflicts?.length) output.write(`${labels.conflicts}: ${result.conflicts.length}.\n`);
    if (options.dryRun) {
      const limit = 12;
      for (const item of result.plan.slice(0, limit)) output.write(`  ${names[result.language][item.action]} ${item.path}${item.conflict ? ' [!]' : ''}\n`);
      if (result.plan.length > limit) output.write(`  +${result.plan.length - limit} ${labels.more}\n`);
    }
  }
  if (result.issues?.length) for (const item of result.issues) output.write(`  ${item.code}: ${item.path}\n`);
  output.write(`\n[ ${text(result.language, 'next')} ]\n`);
  for (const step of result.next) {
    output.write(`  ${step.label}\n`);
    if (step.skill) output.write(`  ${step.skill}\n`);
    if (step.instruction) output.write(`  ${step.instruction}\n`);
    if (step.command) output.write(`  > ${step.command}\n`);
  }
}

export async function main(argv = process.argv.slice(2), context = {}) {
  const output = context.stdout || process.stdout, input = context.stdin || process.stdin, errorOutput = context.stderr || process.stderr;
  let options = { json: argv.includes('--json') }, language = normalizeLanguage(argv[argv.indexOf('--lang') + 1]) || 'pt', target = resolve(context.cwd || process.cwd()), clients = ['all'];
  try {
    options = parseArgs(argv);
    target = resolveTarget(options.target || (options.command === 'init' ? options.positionals[0] : '.'), context.cwd || process.cwd());
    const previous = ['help', 'version'].includes(options.command) ? null : loadState(target);
    language = options.language || previous?.language || 'pt';
    clients = options.clients ?? previous?.clients ?? ['all'];
    if (options.command === 'init' && !previous && !options.yes && !options.json && !options.dryRun && input.isTTY && output.isTTY && (!options.language || options.clients === undefined)) {
      const prompt = context.ask ? null : createInterface({ input, output: errorOutput });
      const ask = context.ask || (question => prompt.question(question));
      try {
        if (!options.language) language = normalizeLanguage((await ask(text(language, 'select'))).trim() || 'pt') || 'pt';
        if (options.clients === undefined) {
          const ids = availableClients.map(client => client.id).join(', ');
          clients = selectedClients((await ask(`${text(language, 'clientsAvailable')}: ${ids}\n${text(language, 'clientsSelect')}`)).trim() || 'all');
          options.clients = clients;
        }
      } finally { prompt?.close(); }
    }
    const result = { ok: true, command: options.command, version: packageInfo.version, language, ...(['help', 'version'].includes(options.command) ? {} : { clients }), target, message: '', next: getNextSteps({ command: options.command, language, target, installed: Boolean(previous) }) };
    let exitCode = 0;
    if (options.command === 'help') result.message = text(language, 'help');
    else if (options.command === 'version') result.message = `AgentDevKit ${packageInfo.version}`;
    else if (options.command === 'agents' && options.clients === undefined) {
      result.message = text(language, 'clientsCurrent'); result.availableClients = availableClients;
    }
    else if (options.command === 'lang' && !options.positionals.length && !options.language && options.clients === undefined) result.message = `${text(language, 'language')}: ${language}`;
    else if (options.command === 'doctor') {
      const found = inspect(target);
      if (found.installed && !found.issues.length) {
        const plan = planInstallation({ target, language, mode: 'sync' });
        found.issues.push(...plan.changes.map(change => ({ code: 'outdated', path: change.path })));
        found.issues.push(...plan.localIgnoreCheck.missing.map(path => ({ code: 'unignored', path })));
        if (plan.localIgnore.edits.length || plan.untrack?.paths.length) found.issues.push({ code: 'local-ignore', path: '.gitignore / Git info/exclude' });
      }
      result.issues = found.issues; result.ok = found.installed && found.issues.length === 0;
      result.message = text(language, result.ok ? 'healthy' : found.installed ? 'unhealthy' : 'missing'); exitCode = result.ok ? 0 : 1;
    } else if (options.command === 'next') {
      result.message = previous ? text(language, 'workflow') : text(language, 'missing');
    } else if (options.command === 'tools') {
      if (!previous) throw Object.assign(new Error(text(language, 'missing')), { code: 'E_MISSING' });
      const script = join(target, '.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs');
      const child = spawnSync(process.execPath, [script, ...options.toolArgs], { cwd: target, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
      result.ok = !child.error && child.status === 0; result.message = text(language, 'tools');
      result.toolOutput = [child.stdout, child.stderr, child.error?.message].filter(Boolean).join('\n'); exitCode = result.ok ? 0 : child.status || 1;
    } else {
      if (options.command === 'lang') {
        const selected = options.positionals[0] || options.language; language = normalizeLanguage(selected);
        if (!language) usage('Use lang pt, en or es.'); result.language = language;
        result.next = getNextSteps({ command: options.command, language, target, installed: Boolean(previous) });
      }
      const plan = planInstallation({ target, language, mode: options.command, force: options.force, clients: options.clients });
      result.plan = plan.changes.map(({ path, action }) => ({ path, action, conflict: plan.conflicts.includes(path) }));
      result.untrackedPaths = [...(plan.untrack?.paths || [])];
      result.localIgnore = { status: plan.localIgnore.status, edits: plan.localIgnore.edits.map(({ path, before }) => ({ path, action: before === null ? 'create' : 'update' })), missing: plan.localIgnoreCheck.missing };
      if (plan.localIgnore.edits.length) result.plan.push({ path: '.gitignore / Git info/exclude', action: 'update', conflict: false });
      if (plan.untrack?.paths.length) result.plan.push({ path: 'Git index (generated files)', action: 'update', conflict: false });
      result.conflicts = plan.conflicts;
      const preview = options.dryRun || (options.command === 'sync' && options.check);
      if (!plan.canApply || preview) {
        result.ok = plan.canApply && (!options.check || result.plan.length === 0);
        result.message = text(language, plan.canApply ? 'plan' : 'conflict'); exitCode = result.ok ? 0 : 1;
      } else {
        Object.assign(result, applyPlan(plan)); result.message = text(language, result.changed ? options.command : 'unchanged');
        result.next = getNextSteps({ command: options.command, language, target, installed: true });
      }
    }
    print(result, options, output); return exitCode;
  } catch (error) {
    const result = { ok: false, command: options.command || 'help', version: packageInfo.version, language, clients, target, message: explainError(language, error.code), error: { code: error.code || 'E_OPERATION', detail: error.message }, next: getNextSteps({ command: 'error', language, target, installed: existsSync(join(target, '.pbai4devs/estado/agentdevkit.json')) }) };
    if (!options.json) result.message += ` (${error.code || 'E_OPERATION'})`;
    print(result, options, output); return error.exitCode || 1;
  }
}
