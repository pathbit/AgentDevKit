import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import { packageInfo, statePath, legacyStatePath } from './config.mjs';
import { text, normalizeLanguage, explainError } from './i18n.mjs';
import { resolveTarget, loadState, planInstallation, applyPlan, inspect, inspectRemovalHistory } from './install.mjs';
import { getNextSteps, integrationHints, integrationNext, nextCommand, operationalNext } from './next.mjs';
import { availableClients, normalizeClients } from './adapters/index.mjs';
import { isBlockingLocalIgnore } from '../.pbai4devs/scripts/lib/gitignore.mjs';
import { assertUnredirectedGitEnvironment } from '../.pbai4devs/scripts/lib/git-environment.mjs';
import { collectErrorDiagnostics, primaryDiagnosticError } from '../.pbai4devs/scripts/lib/error-reporting.mjs';
import { classifyRecoveryEffects, validRecoveryResolution } from '../.pbai4devs/scripts/lib/recovery-effects.mjs';
import { inspectProjectRecovery, resolveProjectRecovery } from '../.pbai4devs/scripts/lib/project-recovery.mjs';

function usage(message) { throw Object.assign(new Error(message), { code: 'E_ARGS', exitCode: 2 }); }
function selectedClients(value) {
  try { return normalizeClients(value); }
  catch (error) { usage(error.message); }
}

function worktreeWarning(language) {
  return {
    pt: 'Apontamentos, artefatos e dados privados podem ficar visíveis no Git. Confira o status antes de adicionar arquivos. Regras antigas podem afetar outras worktrees.',
    en: 'References, artifacts and private data may remain visible to Git. Check status before adding files. Older rules may affect other worktrees.',
    es: 'Referencias, artefactos y datos privados pueden quedar visibles en Git. Revise el estado antes de agregar archivos. Reglas anteriores pueden afectar otras worktrees.',
  }[language];
}

function linuxXattrWarning(language) {
  return {
    pt: 'Atributos estendidos em arquivos Linux não foram totalmente verificados; a substituição pode perdê-los. Revise os metadados e mantenha uma cópia que os preserve.',
    en: 'Linux file extended attributes were not fully verified; replacement may lose them. Review metadata and keep a copy that preserves it.',
    es: 'No se verificaron completamente los atributos extendidos en Linux; la sustitución puede perderlos. Revise los metadatos y conserve una copia que los preserve.',
  }[language];
}

function claudeInspectionWarning(language) {
  return {
    pt: 'Não foi possível verificar as regras Claude; sua ativação pode continuar desconhecida.',
    en: 'Could not inspect Claude rules; their activation may remain unknown.',
    es: 'No fue posible inspeccionar las reglas Claude; su activación puede seguir siendo desconocida.',
  }[language];
}

function retainedClaudeWarning(language) {
  return {
    pt: 'Regras Claude preservadas podem continuar ativas globalmente; revise-as antes de considerar a desativação concluída.',
    en: 'Preserved Claude rules may still load globally; review them before considering deactivation complete.',
    es: 'Las reglas Claude conservadas pueden seguir activas globalmente; revíselas antes de dar por terminada la desactivación.',
  }[language];
}

function claudeScopeWarning(language, omissions) {
  if (omissions.some(item => item.status === 'activation-unverified')) return {
    pt: 'A ativação de regras Claude não foi verificada; regras preservadas podem continuar ativas globalmente. Consulte as fontes e revise regras existentes e conflitos.',
    en: 'Claude rule activation is unverified; preserved rules may still load globally. Read their sources and review existing rules and conflicts.',
    es: 'No se ha verificado la activación de reglas Claude; las reglas conservadas pueden seguir activas globalmente. Consulte sus fuentes y revise reglas existentes y conflictos.',
  }[language];
  return {
    pt: 'Algumas regras não têm escopo equivalente comprovado no Claude. Consulte as fontes e revise regras existentes e conflitos antes de presumir sua ativação.',
    en: 'Some rules have no verified equivalent scope in Claude. Read their sources and review existing rules and conflicts before assuming activation.',
    es: 'Algunas reglas no tienen un alcance equivalente comprobado en Claude. Consulte sus fuentes y revise las reglas existentes y los conflictos antes de suponer su activación.',
  }[language];
}

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
      if (!value || !['product', 'run'].includes(value)) usage('Use --intent product or run.');
      if (options.intent !== undefined) usage('Use --intent once.');
      options.intent = value;
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
  if (!['init', 'update', 'doctor', 'sync', 'lang', 'agents', 'next', 'tools', 'help', 'version', 'recovery'].includes(options.command)) usage(`Unknown command: ${options.command}`);
  if (options.command === 'recovery' && (options.help || options.version)) options.positionals = [];
  if (options.help) options.command = 'help';
  if (options.version) options.command = 'version';
  if (options.command === 'recovery') {
    if (options.positionals.length && !validRecoveryResolution(options.positionals)) usage('Use recovery or recovery resolve <generation> <id>.');
    if (options.yes || options.force) usage('Recovery requires the explicit generation and operation ID.');
  } else if (options.positionals.length > 1 || (options.positionals.length && !['init', 'lang', 'agents'].includes(options.command))) usage('Unexpected positional arguments.');
  if (options.command === 'init' && options.target && options.positionals.length) usage('Use a directory or --target, not both.');
  if (options.command === 'agents' && options.positionals.length) {
    if (options.clients !== undefined) usage('Use a selection argument or --agents, not both.');
    options.clients = selectedClients(options.positionals[0]);
  }
  if (options.clients !== undefined && !['init', 'update', 'sync', 'lang', 'agents', 'help', 'version'].includes(options.command)) usage('--agents requires an installation or configuration command.');
  if (options.intent !== undefined && !['next', 'help', 'version'].includes(options.command)) usage('--intent requires next.');
  if (options.integrations && !['next', 'help', 'version'].includes(options.command)) usage('--integrations requires next.');
  if (options.check && options.command !== 'sync') usage('--check requires sync.');
  if (options.dryRun && (!['init', 'update', 'sync', 'lang', 'agents'].includes(options.command) || (options.command === 'agents' && options.clients === undefined))) usage('--dry-run requires an installation or configuration change.');
  return options;
}

export function print(result, options, output) {
  if (options.json) { output.write(`${JSON.stringify(result)}\n`); return; }
  output.write(`${result.message}\n`);
  for (const method of result.integrations || []) {
    output.write(`\n${method.name}\n  ${method.paths.join(', ')}\n  ${method.instruction}\n  ${method.url}\n`);
  }
  const operation = result.recovery?.id ? result.recovery : result.error?.operation;
  if (operation) output.write(`${text(result.language, 'recoveryGeneration')} ${operation.generation} · ID ${operation.id}${operation.phase || operation.kind ? ' · ' + (operation.phase || operation.kind) : ''}\n`);
  if (result.recovery?.journal) output.write(`${text(result.language, 'recoveryJournal')} ${JSON.stringify(result.recovery.journal)}\n`);
  if (result.recovery?.backup) output.write(`${text(result.language, 'recoveryBackup')} ${JSON.stringify(result.recovery.backup)}\n`);
  if (result.error?.scope === 'staging') {
    const labels = { pt: 'A falha ocorreu no estágio temporário, não identifica um caminho do projeto.', en: 'The failure occurred in private staging and does not identify a project path.', es: 'El error ocurrió en el área temporal y no identifica una ruta del proyecto.' };
    output.write(`${labels[result.language]}\n`);
  }
  if (['E_PROTECTED_METADATA', 'E_METADATA_UNSUPPORTED'].includes(result.error?.code) && typeof result.error.path === 'string'
    && !(result.issues || []).some(item => item.path === result.error.path && item.code === result.error.metadataReason)) {
    const labels = result.error.metadataReason === 'file-owner-different'
      ? { pt: 'Arquivo pertence a outro usuário; preserve e revise', en: 'File belongs to another user; preserve and review', es: 'El archivo pertenece a otro usuario; conserve y revise' }
      : result.error.metadataReason === 'file-owner-unverified' || result.error.metadataReason === 'owner-read-unverified'
      ? { pt: 'Proprietário ou leitura não verificados; preserve e revise', en: 'Owner or read access could not be verified; preserve and review', es: 'Propietario o lectura no verificados; conserve y revise' }
      : result.error.metadataReason === 'acl-present'
      ? { pt: 'Arquivo possui ACL; revise', en: 'File has an ACL; review', es: 'Archivo tiene ACL; revise' }
      : result.error.metadataReason === 'acl-unverified'
        ? { pt: 'ACL do arquivo não verificada; revise', en: 'File ACL could not be verified; review', es: 'ACL del archivo no verificada; revise' }
        : result.error.metadataReason === 'hardlink-unverified'
      ? { pt: 'Contagem de hardlinks não verificada; revise', en: 'Hardlink count could not be verified; review', es: 'Número de enlaces físicos no verificado; revise' }
      : result.error.metadataReason === 'hardlink-shared'
      ? { pt: 'Arquivo possui hardlinks compartilhados; revise', en: 'File has shared hardlinks; review', es: 'Archivo tiene enlaces físicos compartidos; revise' }
      : result.error.metadataReason === 'xattr-directory-present'
      ? { pt: 'Diretório tem atributos estendidos; revise', en: 'Directory has extended attributes; review', es: 'Directorio tiene atributos extendidos; revise' }
      : result.error.metadataReason === 'xattr-directory-unverified'
        ? { pt: 'Atributos estendidos do diretório não verificados; revise', en: 'Directory extended attributes could not be verified; review', es: 'Atributos extendidos del directorio no verificados; revise' }
        : result.error.metadataReason === 'special-mode-directory'
      ? { pt: 'Diretório com bits POSIX especiais; revise', en: 'Directory has special POSIX mode bits; review', es: 'Directorio con bits POSIX especiales; revise' }
      : result.error.metadataReason === 'xattr-present'
      ? { pt: 'Arquivo tem atributos estendidos; revise', en: 'File has extended attributes; review', es: 'Archivo tiene atributos extendidos; revise' }
      : result.error.metadataReason === 'xattr-unverified'
        ? { pt: 'Atributos estendidos não verificados; revise', en: 'Extended attributes could not be verified; review', es: 'Atributos extendidos no verificados; revise' }
        : { pt: 'Arquivo com bits POSIX especiais; revise', en: 'File has special POSIX mode bits; review', es: 'Archivo con bits POSIX especiales; revise' };
    output.write(`${labels[result.language]}: ${result.error.path}\n`);
  }
  const reviewPaths = [...new Set([...(result.error?.preservedPaths || []), ...(result.error?.cleanupFailures || []).map(item => item.path)])];
  if (reviewPaths.length) {
    const labels = { pt: 'Revise os caminhos preservados', en: 'Review preserved paths', es: 'Revise las rutas preservadas' };
    output.write(`${labels[result.language]}: ${reviewPaths.slice(0, 5).join(', ')}${reviewPaths.length > 5 ? ` (+${reviewPaths.length - 5}; --json)` : ''}.\n`);
  }
  if (result.error?.diagnosticsTruncated) output.write(`${{ pt: 'Diagnósticos adicionais foram limitados.', en: 'Additional diagnostics were limited.', es: 'Se limitaron los diagnósticos adicionales.' }[result.language]}\n`);
  if (result.warnings?.length) for (const warning of result.warnings) output.write(`${warning}\n`);
  if (result.clients) output.write(`${text(result.language, 'clientsCurrent')}: ${result.clients.join(', ')}\n`);
  if (result.availableClients) output.write(`${text(result.language, 'clientsAvailable')}: ${result.availableClients.map(client => client.id).join(', ')}\n`);
  if (result.toolOutput) output.write(`${result.toolOutput.trimEnd()}\n`);
  if (result.preserved?.length) output.write(`${text(result.language, 'preserved')}: ${result.preserved.length}. ${text(result.language, 'preservedDetails')}\n`);
  const pending = result.localIgnore?.pending || [];
  const displayedPending = [...pending.filter(isBlockingLocalIgnore), ...pending.filter(item => !isBlockingLocalIgnore(item))];
  for (const item of displayedPending.slice(0, 5)) output.write(`  ${item.code}: ${item.path}${item.pattern ? ` (${item.pattern})` : ''}\n`);
  const morePending = { pt: 'use --json para detalhes', en: 'use --json for details', es: 'use --json para los detalles' }[result.language];
  if (pending.length > 5) output.write(`  +${pending.length - 5}; ${morePending}.\n`);
  const legacyIgnore = [...pending, ...(result.issues || [])].find(item => item.code === 'shared-ignore-legacy');
  if (legacyIgnore) {
    const guidance = legacyIgnore.migration === 'migration' ? {
      pt: 'Bloco legado reconhecido em info/exclude. Use update ou sync para migrá-lo e guardar uma cópia local.',
      en: 'Recognized legacy block in info/exclude. Run update or sync to migrate it and keep a local copy.',
      es: 'Bloque anterior reconocido en info/exclude. Use update o sync para migrarlo y guardar una copia local.',
    } : {
      pt: 'Marcador semelhante ao legado em info/exclude: regras podem afetar arquivos não rastreados em outras worktrees. Revise o arquivo e as worktrees antes de alterá-lo.',
      en: 'Legacy-like marker in info/exclude: rules may affect untracked files in other worktrees. Review the file and worktrees before changing it.',
      es: 'Marcador similar al anterior en info/exclude: las reglas pueden afectar archivos no rastreados en otros worktrees. Revise el archivo y los worktrees antes de cambiarlo.',
    };
    output.write(`${guidance[result.language]}\n`);
  }
  const excludeMigration = result.localIgnore?.legacyMigration;
  if (excludeMigration?.status === 'applied') {
    const label = { pt: 'Cópia do exclude original', en: 'Original exclude backup', es: 'Copia del exclude original' };
    output.write(`${label[result.language]}: ${excludeMigration.backup}/exclude\n`);
  }
  if (result.plan?.length) {
    const names = { pt: { create: 'criar', update: 'atualizar', remove: 'remover' }, en: { create: 'create', update: 'update', remove: 'remove' }, es: { create: 'crear', update: 'actualizar', remove: 'eliminar' } };
    const labels = {
      pt: { files: 'Arquivos', more: 'caminhos adicionais; use --json para o plano completo.' },
      en: { files: 'Files', more: 'additional paths; use --json for the complete plan.' },
      es: { files: 'Archivos', more: 'rutas adicionales; use --json para el plan completo.' },
    }[result.language];
    output.write(`${labels.files}: ${['create', 'update', 'remove'].map(action => `${result.plan.filter(item => item.action === action).length} ${names[result.language][action]}`).join(', ')}.\n`);
    if (options.dryRun) {
      const limit = 12;
      for (const item of result.plan.slice(0, limit)) output.write(`  ${names[result.language][item.action]} ${item.path}${item.conflict ? ' [!]' : ''}\n`);
      if (result.plan.length > limit) output.write(`  +${result.plan.length - limit} ${labels.more}\n`);
    }
  }
  if (result.conflicts?.length) {
    const labels = {
      pt: { conflicts: 'Conflitos', more: 'mais; use --json para a lista completa' },
      en: { conflicts: 'Conflicts', more: 'more; use --json for the full list' },
      es: { conflicts: 'Conflictos', more: 'más; use --json para la lista completa' },
    }[result.language];
    const paths = result.conflicts.slice(0, 5).map(path => JSON.stringify(path));
    output.write(`${labels.conflicts}: ${result.conflicts.length}. ${paths.join(', ')}${result.conflicts.length > 5 ? ` (+${result.conflicts.length - 5} ${labels.more})` : ''}\n`);
  }
  if (result.issues?.length) for (const item of result.issues) {
    const cause = typeof item.causeCode === 'string' && /^[A-Z][A-Z0-9_]{0,31}$/.test(item.causeCode) ? ` (${item.causeCode})` : '';
    const labels = {
      'file-owner-different': { pt: 'Arquivo pertence a outro usuário; preserve e revise', en: 'File belongs to another user; preserve and review', es: 'El archivo pertenece a otro usuario; conserve y revise' },
      'file-owner-unverified': { pt: 'Proprietário do arquivo não verificado; preserve e revise', en: 'File owner could not be verified; preserve and review', es: 'Propietario del archivo no verificado; conserve y revise' },
      'owner-read-unverified': { pt: 'Leitura pelo proprietário não verificada; preserve e revise', en: 'Owner read access could not be verified; preserve and review', es: 'Lectura por el propietario no verificada; conserve y revise' },
      'hardlink-shared': { pt: 'Arquivo possui hardlinks compartilhados; revise', en: 'File has shared hardlinks; review', es: 'Archivo tiene enlaces físicos compartidos; revise' },
      'hardlink-unverified': { pt: 'Contagem de hardlinks não verificada; revise', en: 'Hardlink count could not be verified; review', es: 'Número de enlaces físicos no verificado; revise' },
      'acl-present': { pt: 'Arquivo possui ACL; revise', en: 'File has an ACL; review', es: 'Archivo tiene ACL; revise' },
      'acl-unverified': { pt: 'ACL do arquivo não verificada; revise', en: 'File ACL could not be verified; review', es: 'ACL del archivo no verificada; revise' },
      'xattr-present': { pt: 'Atributos estendidos detectados; revise', en: 'Extended attributes detected; review', es: 'Atributos extendidos detectados; revise' },
      'derived-file-diverged': { pt: 'Registro derivado diverge do TOML preservado; revise', en: 'Derived record differs from the preserved TOML; review', es: 'El registro derivado difiere del TOML conservado; revise' },
      'derived-file-missing': { pt: 'Arquivo preservado do registro derivado ausente; revise', en: 'Preserved file in derived record is missing; review', es: 'Falta el archivo conservado del registro derivado; revise' },
      'derived-file-unverified': { pt: 'Não foi possível verificar o arquivo do registro derivado; revise', en: 'Could not verify the file in the derived record; review', es: 'No se pudo verificar el archivo del registro derivado; revise' },
      'removed-file-unverified': { pt: 'Registro de remoção sem entrada no estado instalado; preserve e revise', en: 'Removal record has no entry in installed state; preserve and review', es: 'Registro de eliminación sin entrada en el estado instalado; conserve y revise' },
      'protected-state-directory': { pt: 'Diretório de estado com bits POSIX especiais; preserve e revise', en: 'State directory has special POSIX bits; preserve and review', es: 'Directorio de estado con bits POSIX especiales; conserve y revise' },
      'state-directory-xattr-present': { pt: 'Diretório de estado com atributos estendidos; preserve e revise', en: 'State directory has extended attributes; preserve and review', es: 'Directorio de estado con atributos extendidos; conserve y revise' },
      'state-directory-xattr-unverified': { pt: 'Atributos estendidos do diretório de estado não verificados; preserve e revise', en: 'State directory extended attributes not verified; preserve and review', es: 'Atributos extendidos del directorio de estado no verificados; conserve y revise' },
      'plan-inspection-failed': { pt: 'Não foi possível concluir o planejamento', en: 'Could not complete planning', es: 'No se pudo completar la planificación' },
    };
    const label = labels[item.code]?.[result.language] ?? item.code;
    const prior = item.observedBeforePlanFailure ? {
      pt: ' (observado antes da falha no planejamento)',
      en: ' (observed before planning failed)',
      es: ' (observado antes del fallo de planificación)',
    }[result.language] : '';
    const observations = {
      'claude-metadata-unverified': { pt: 'arquivo preservado; metadados não verificados', en: 'file preserved; metadata not verified', es: 'archivo conservado; metadatos no verificados' },
      'symbolic-link': { pt: 'link simbólico preservado', en: 'symbolic link preserved', es: 'enlace simbólico conservado' },
      'non-directory': { pt: 'caminho ancestral preservado', en: 'ancestor path preserved', es: 'ruta ancestral conservada' },
      'existing-directory': { pt: 'diretório existente preservado', en: 'existing directory preserved', es: 'directorio existente conservado' },
    };
    const observation = observations[item.preservationReason]?.[result.language];
    output.write(`  ${label}${item.path ? `: ${item.path}` : ''}${cause}${prior}${observation ? ` (${observation})` : ''}\n`);
  }
  output.write(`\n[ ${text(result.language, 'next')} ]\n`);
  for (const step of result.next) {
    output.write(`  ${step.label}\n`);
    if (step.skill) output.write(`  ${step.skill}\n`);
    if (step.instruction) output.write(`  ${step.instruction}\n`);
    if (step.command) output.write(`  > ${step.command}\n`);
  }
}

function recoverySummary(observed) {
  const summary = { status: observed.status };
  for (const key of ['generation', 'resolvedCount']) if (Number.isSafeInteger(observed[key])) summary[key] = observed[key];
  for (const key of ['id', 'phase', 'terminal', 'reason', 'store', 'journal', 'backup']) {
    if (typeof observed[key] === 'string') summary[key] = observed[key];
  }
  return summary;
}

function publishedOperation(raw) {
  if (!raw || !Number.isSafeInteger(raw.generation) || !validRecoveryResolution(['resolve', String(raw.generation), raw.id])) return null;
  const operation = { generation: raw.generation, id: raw.id };
  if (['claim', 'begin', 'done', 'resolved'].includes(raw.kind)) operation.kind = raw.kind;
  if (raw.publication === 'possible') operation.publication = raw.publication;
  return operation;
}

function recoveryReport(options, target, recovery, previous, configurationStatus, configurationError, output) {
  const language = options.language || normalizeLanguage(previous?.language) || 'pt';
  const effect = classifyRecoveryEffects(options);
  const result = {
    command: options.command, version: packageInfo.version, language, target, recovery: recoverySummary(recovery), configurationStatus,
    ...(previous ? { clients: previous.clients ?? ['all'] } : {}),
    ok: true, message: '', next: [],
  };
  const review = { label: text(language, 'recoveryReview'), stage: 'revisao' };
  const verify = { label: text(language, 'recoveryVerify'), stage: 'verificacao' };
  const journalCode = recovery.status === 'pending' ? 'E_RECOVERY_PENDING' : recovery.status === 'invalid' ? 'E_RECOVERY_STORE' : configurationError?.code || 'E_STATE';
  result.next = [recovery.status === 'ready' && configurationStatus !== 'unreadable' ? verify : review];
  if (effect === 'resolution') {
    const [, generation, id] = options.positionals;
    try {
      resolveProjectRecovery(target, Number(generation), id);
      result.recovery = recoverySummary(inspectProjectRecovery(target));
      result.message = text(language, 'recoveryResolved');
      result.next = [result.recovery.status === 'ready' ? verify : review];
      if (result.recovery.status === 'invalid') {
        result.ok = false; result.error = { code: 'E_RECOVERY_UNCERTAIN' };
        result.message = text(language, 'recoveryResolveFailed');
      }
    } catch (error) {
      const code = /^E_RECOVERY_[A-Z_]+$/.test(error?.code) ? error.code : 'E_RECOVERY_IO';
      const operation = publishedOperation(error?.operation || error?.cause?.operation);
      result.error = { code, ...(operation ? { operation } : {}) }; result.ok = false;
      result.recovery = recoverySummary(inspectProjectRecovery(target));
      result.message = text(language, code === 'E_RECOVERY_STATE' ? 'recoveryMismatch' : 'recoveryResolveFailed');
      result.next = [review];
    }
  } else if (options.command === 'recovery') {
    result.message = text(language, recovery.status === 'ready' ? 'recoveryReady' : recovery.status === 'pending' ? 'recoveryPending' : 'recoveryInvalid');
    if (recovery.status === 'invalid') { result.ok = false; result.error = { code: journalCode }; }
  } else if (effect === 'query' && ['agents', 'lang'].includes(options.command) && previous) {
    result.message = options.command === 'agents' ? text(language, 'clientsCurrent') : `${text(language, 'language')}: ${previous.language}`;
    if (options.command === 'agents') result.availableClients = availableClients;
    result.warnings = [text(language, 'recoveryPartial')];
  } else if (effect === 'query' && options.command === 'next') {
    result.message = text(language, 'recoveryPartial');
  } else {
    result.ok = false; result.error = { code: journalCode };
    if (recovery.status === 'ready' && configurationError) result.error.detail = configurationError.detail;
    if (effect === 'planning') result.planStatus = 'inconclusive';
    if (options.command === 'doctor' || options.command === 'sync' && options.check) {
      result.warnings = [claudeInspectionWarning(language)];
    }
    result.message = text(language, effect === 'planning' ? 'recoveryPlan' : effect === 'query' ? 'recoveryPartial' : 'recoveryBlocked');
  }
  if (!options.json && result.error) result.message += ` (${result.error.code})`;
  print(result, options, output); return result.ok ? 0 : 1;
}

export async function main(argv = process.argv.slice(2), context = {}) {
  const output = context.stdout || process.stdout, input = context.stdin || process.stdin, errorOutput = context.stderr || process.stderr;
  const separator = argv.indexOf('--'), globalArgs = separator < 0 ? argv : argv.slice(0, separator);
  let options = { json: globalArgs.includes('--json') }, language = normalizeLanguage(globalArgs[globalArgs.indexOf('--lang') + 1]) || 'pt', target = resolve(context.cwd || process.cwd()), clients = ['all'], operationUncertain = false, removalBeforePlan = [];
  const preparePlan = input => {
    operationUncertain = true;
    const plan = planInstallation(input);
    operationUncertain = false;
    return plan;
  };
  try {
    options = parseArgs(argv);
    const effect = classifyRecoveryEffects(options);
    if (effect === 'unsupported') usage('The command effects could not be classified.');
    const informational = ['help', 'version'].includes(options.command);
    if (['init', 'update', 'sync', 'doctor', 'agents', 'lang'].includes(options.command)) assertUnredirectedGitEnvironment();
    target = informational ? resolve(context.cwd || process.cwd(), options.target || '.')
      : resolveTarget(options.target || (options.command === 'init' ? options.positionals[0] : '.'), context.cwd || process.cwd());
    const recovery = informational ? null : inspectProjectRecovery(target);
    let previous = null, configurationStatus = 'absent', configurationError;
    if (!informational) {
      try {
        previous = loadState(target);
        if (previous) configurationStatus = 'available';
      } catch (error) {
        if (recovery.status === 'ready' && options.command !== 'recovery' && !['query', 'planning'].includes(effect)) throw error;
        configurationStatus = 'unreadable';
        configurationError = {
          code: ['E_STATE', 'E_PATH', 'E_SYMLINK', 'EACCES', 'EPERM', 'EIO'].includes(error.code) ? error.code : 'E_STATE',
          detail: ['Invalid AgentDevKit state JSON.', 'Invalid AgentDevKit state.', 'Invalid client selection in AgentDevKit state.'].includes(error.message)
            ? error.message : 'The project configuration could not be read.',
        };
      }
      if (options.command === 'recovery' || recovery.status !== 'ready' || configurationStatus === 'unreadable') {
        return recoveryReport(options, target, recovery, previous, configurationStatus, configurationError, output);
      }
    }
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
    const result = { ok: true, command: options.command, version: packageInfo.version, language, ...(['help', 'version'].includes(options.command) ? {} : { clients }), target, message: '', next: [] };
    let installed = Boolean(previous), planCanApply;
    let exitCode = 0;
    if (options.command === 'help') result.message = text(language, 'help');
    else if (options.command === 'version') result.message = `AgentDevKit ${packageInfo.version}`;
    else if (options.command === 'agents' && options.clients === undefined) {
      result.message = text(language, 'clientsCurrent'); result.availableClients = availableClients;
    }
    else if (options.command === 'lang' && !options.positionals.length && !options.language && options.clients === undefined) result.message = `${text(language, 'language')}: ${language}`;
    else if (options.command === 'doctor') {
      const found = inspect(target);
      if (found.installed) {
        let plan;
        try { plan = preparePlan({ target, language, mode: 'sync' }); }
        catch (error) {
          if (!found.issues.length) throw error;
          // Preserve a stable error category without exposing file contents or paths.
          const causeCode = typeof error?.code === 'string' && /^[A-Z][A-Z0-9_]{0,31}$/.test(error.code) ? error.code : 'E_OPERATION';
          found.issues.push({ code: 'plan-inspection-failed', causeCode });
          // Only the direct guard identifies a verified project directory.
          const directoryIssues = {
            'special-mode-directory': ['E_PROTECTED_METADATA', 'protected-state-directory'],
            'xattr-directory-present': ['E_PROTECTED_METADATA', 'state-directory-xattr-present'],
            'xattr-directory-unverified': ['E_METADATA_UNSUPPORTED', 'state-directory-xattr-unverified'],
          };
          const directoryIssue = directoryIssues[error?.metadataReason];
          if (directoryIssue && error?.code === directoryIssue[0] && error?.metadataTargetVerified === true
            && error?.diagnosticsScope !== 'staging'
            && typeof error?.path === 'string') {
            found.issues.push({ code: directoryIssue[1], path: error.path });
            const label = {
              pt: 'Preserve e revise os metadados do diretório legado antes da migração.',
              en: 'Preserve and review legacy directory metadata before migration.',
              es: 'Conserve y revise los metadatos del directorio anterior antes de migrar.',
            }[language];
            result.next = [{ label, stage: 'revisao' }];
          }
          found.issues.push({ code: 'claude-inspection-unverified', path: '.claude/rules', causeCode });
          (result.warnings ||= []).push(claudeInspectionWarning(language));
          const diagnostics = collectErrorDiagnostics(error);
          const stagingFailure = error?.diagnosticsScope === 'staging';
          if (stagingFailure || diagnostics.preservedPaths.length || diagnostics.cleanupFailures.length || diagnostics.truncated || diagnostics.possiblePartial) {
            result.error = {
              code: causeCode,
              ...(stagingFailure ? { scope: 'staging' } : {}),
              ...(diagnostics.preservedPaths.length ? { preservedPaths: diagnostics.preservedPaths } : {}),
              ...(diagnostics.cleanupFailures.length ? { cleanupFailures: diagnostics.cleanupFailures.map(item => ({ path: item.path, message: 'cleanup failed' })) } : {}),
              ...(diagnostics.truncated ? { diagnosticsTruncated: true } : {}),
            };
            if (stagingFailure) {
              const hasResidue = diagnostics.preservedPaths.length || diagnostics.cleanupFailures.length || diagnostics.truncated;
              const instructions = (hasResidue ? {
                pt: ['O planejamento pode ter deixado caminhos temporários para revisão.', 'Os caminhos informados referem-se ao estágio, não comprovam alteração no projeto e podem conter dados parciais ou de outra origem; preserve e revise antes de remover.'],
                en: ['Planning may have left temporary paths to review.', 'The listed paths refer to the stage, do not prove project changes, and may contain partial data or data from another source; preserve and review them before removal.'],
                es: ['La planificación puede haber dejado rutas temporales para revisar.', 'Las rutas indicadas se refieren al área temporal, no prueban cambios en el proyecto y pueden contener datos parciales o de otro origen; consérvelas y revíselas antes de eliminarlas.'],
              } : {
                pt: ['O planejamento falhou em um estágio temporário.', 'Revise o diagnóstico; essa falha não comprova alteração no projeto.'],
                en: ['Planning failed in a temporary stage.', 'Review the diagnostic; this failure does not prove project changes.'],
                es: ['La planificación falló en un área temporal.', 'Revise el diagnóstico; este error no prueba cambios en el proyecto.'],
              })[language];
              result.next = [{ label: instructions[0], instruction: instructions[1], stage: 'revisao' }];
            } else result.next = getNextSteps({ command: 'error', language, target, possiblePartial: true, installed: true });
          }
        }
        if (plan) {
        result.preserved = plan.preserved;
        if (plan.scopeOmissions.length) { result.scopeOmissions = plan.scopeOmissions; (result.warnings ||= []).push(claudeScopeWarning(language, plan.scopeOmissions)); }
        if (plan.retainedClaudeRules.length) { result.retainedClaudeRules = plan.retainedClaudeRules; (result.warnings ||= []).push(retainedClaudeWarning(language)); found.issues.push(...plan.retainedClaudeRules.map(path => ({ code: 'claude-activation-unverified', path }))); }
        found.issues.push(...plan.derivedFileDiagnostics, ...plan.hardlinkBlockers, ...plan.ownerBlockers, ...plan.aclBlockers, ...plan.xattrBlockers);
        if (plan.xattrUnverified.length) { result.xattrUnverified = plan.xattrUnverified; (result.warnings ||= []).push(linuxXattrWarning(language)); }
        if (plan.localIgnore.worktreeScope) (result.warnings ||= []).push(worktreeWarning(language));
        if (plan.localIgnore.status === 'no-git') { found.issues.push({ code: 'git-pending', path: '.git/info/exclude' }); (result.warnings ||= []).push(text(language, 'gitPending')); }
        found.issues.push(...plan.changes.map(change => ({ code: 'outdated', path: change.path })));
        const preservedByPath = new Map(plan.preserved.map(item => [item.path, item.reason]));
        found.issues.push(...plan.conflicts.map(path => ({ code: 'conflict', path, ...(preservedByPath.has(path) ? { preservationReason: preservedByPath.get(path) } : {}) })));
        found.issues.push(...plan.localIgnoreCheck.missing.map(path => ({ code: 'unignored', path })));
        const pending = plan.localIgnoreCheck.pending || [];
        result.localIgnore = { pending };
        found.issues.push(...pending.filter(isBlockingLocalIgnore));
        found.issues.push(...plan.localIgnoreCheck.trackedOutputs.map(path => ({ code: 'tracked-local-output', path })));
        if (plan.localIgnore.edits.length || plan.untrack?.paths.length) found.issues.push({ code: 'local-ignore', path: 'Git info/exclude' });
        }
      }
      result.issues = found.issues; result.ok = found.installed && found.issues.length === 0;
      result.message = text(language, result.ok ? 'healthy' : found.installed ? 'unhealthy' : 'missing'); exitCode = result.ok ? 0 : 1;
    } else if (options.command === 'next') {
      const hints = integrationHints({ target, language, intent: options.intent });
      if (options.integrations) {
        result.integrations = hints;
        result.message = text(language, hints.length ? 'integrationsFound' : 'integrationsEmpty');
        if (installed) {
          const action = options.intent ? `next --intent ${options.intent}` : 'next';
          result.next = [{ label: text(language, 'workflow'), command: nextCommand(action, target, language), stage: 'fluxo' }];
        }
      } else {
        result.message = installed ? text(language, 'workflow') : text(language, 'missing');
        result.next = getNextSteps({ command: 'next', language, target, installed, intent: options.intent });
        if (hints.length) result.next.push(integrationNext(result, options.intent));
      }
    } else if (options.command === 'tools') {
      if (!previous) throw Object.assign(new Error(text(language, 'missing')), { code: 'E_MISSING' });
      const script = join(target, '.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs');
      operationUncertain = true;
      const child = spawnSync(process.execPath, [script, ...options.toolArgs], { cwd: target, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
      result.ok = !child.error && child.status === 0; result.message = text(language, 'tools');
      result.toolOutput = [child.stdout, child.stderr, child.error?.message].filter(Boolean).join('\n'); exitCode = result.ok ? 0 : child.status || 1;
      if (!result.ok) result.next = getNextSteps({ command: 'error', language, target, installed: true, possiblePartial: true });
    } else {
      if (options.command === 'lang') {
        const selected = options.positionals[0] || options.language; language = normalizeLanguage(selected);
        if (!language) usage('Use lang pt, en or es.'); result.language = language;
      }
      if (options.command === 'sync' && options.check && previous) removalBeforePlan = inspectRemovalHistory(target);
      const plan = preparePlan({ target, language, mode: options.command, force: options.force, clients: options.clients });
      planCanApply = plan.canApply;
      result.preserved = plan.preserved;
      if (options.command === 'sync' && options.check && (plan.derivedFileDiagnostics.length || plan.removalDiagnostics.length)) result.issues = [...plan.derivedFileDiagnostics, ...plan.removalDiagnostics];
      if (plan.hardlinkBlockers.length || plan.ownerBlockers.length || plan.aclBlockers.length || plan.xattrBlockers.length) result.issues = [...(result.issues || []), ...plan.hardlinkBlockers, ...plan.ownerBlockers, ...plan.aclBlockers, ...plan.xattrBlockers];
      if (plan.xattrUnverified.length) { result.xattrUnverified = plan.xattrUnverified; (result.warnings ||= []).push(linuxXattrWarning(language)); }
      if (plan.scopeOmissions.length) { result.scopeOmissions = plan.scopeOmissions; (result.warnings ||= []).push(claudeScopeWarning(language, plan.scopeOmissions)); }
      if (plan.retainedClaudeRules.length) { result.retainedClaudeRules = plan.retainedClaudeRules; (result.warnings ||= []).push(retainedClaudeWarning(language)); }
      result.plan = plan.changes.map(({ path, action }) => ({ path, action, conflict: plan.conflicts.includes(path) }));
      result.untrackedPaths = [...(plan.untrack?.paths || [])];
      result.localIgnore = { status: plan.localIgnore.status, edits: plan.localIgnore.edits.map(({ path, before }) => ({ path, action: before === null ? 'create' : 'update' })), missing: plan.localIgnoreCheck.missing, trackedOutputs: plan.localIgnoreCheck.trackedOutputs };
      if (plan.localIgnore.worktreeScope) {
        result.localIgnore.scope = 'worktree';
        result.localIgnore.uncoveredOutputs = plan.localIgnore.unprotectedOutputs;
        result.localIgnore.pending = plan.localIgnoreCheck.pending;
        (result.warnings ||= []).push(worktreeWarning(language));
      }
      if (plan.localIgnore.status === 'no-git') (result.warnings ||= []).push(text(language, 'gitPending'));
      if (plan.localIgnore.legacyMigration) {
        result.localIgnore.legacyMigration = { path: '.git/info/exclude', status: 'planned' };
        result.plan.push({ path: '.git/info/exclude', action: 'update', conflict: false });
      }
      if (plan.localIgnoreCheck.trackedOutputs.length) (result.warnings ||= []).push(`${text(language, 'trackedLocal')} ${plan.localIgnoreCheck.trackedOutputs.join(', ')}`);
      if (plan.localIgnore.edits.length) {
        if (plan.localIgnore.worktreeScope) result.plan.push(...plan.localIgnore.edits.map(edit => ({ path: edit.path, action: 'create', conflict: false })));
        else result.plan.push({ path: 'Git info/exclude', action: 'update', conflict: false });
      }
      if (plan.untrack?.paths.length) result.plan.push({ path: 'Git index (generated files)', action: 'update', conflict: false });
      result.conflicts = plan.conflicts;
      if ((plan.hardlinkBlockers.length || plan.ownerBlockers.length || plan.aclBlockers.length || plan.xattrBlockers.length) && !plan.conflicts.length && !plan.localIgnoreCheck.missing.length) {
        const blocker = plan.hardlinkBlockers[0] || plan.ownerBlockers[0] || plan.aclBlockers[0] || plan.xattrBlockers[0];
        result.error = { code: blocker.code.endsWith('-unverified') ? 'E_METADATA_UNSUPPORTED' : 'E_PROTECTED_METADATA', path: blocker.path, metadataReason: blocker.code };
      }
      const preview = options.dryRun || (options.command === 'sync' && options.check);
      if (!plan.canApply || preview) {
        result.ok = plan.canApply && (!options.check || result.plan.length === 0 && !plan.retainedClaudeRules.length && !plan.derivedFileDiagnostics.length && !plan.removalDiagnostics.length && plan.localIgnore.status !== 'no-git' && !plan.localIgnoreCheck.trackedOutputs.length && !(plan.localIgnoreCheck.pending || []).some(isBlockingLocalIgnore));
        result.message = result.error
          ? ({ pt: 'A operação requer revisão dos metadados.', en: 'The operation requires a metadata review.', es: 'La operación requiere revisar los metadatos.' })[language]
          : text(language, !plan.canApply ? 'conflict' : options.check && !result.ok ? 'unhealthy' : 'plan'); exitCode = result.ok ? 0 : 1;
      } else {
        operationUncertain = true;
        Object.assign(result, applyPlan(plan));
        result.message = text(language, result.changed ? options.command : 'unchanged');
        if (plan.localIgnore.worktreeScope) result.localIgnore.pending = result.localIgnorePending;
        if (result.localIgnoreMigration) {
          result.localIgnore.legacyMigration = { path: '.git/info/exclude', status: 'applied', ...result.localIgnoreMigration };
        }
        delete result.localIgnoreMigration;
        delete result.localIgnorePending;
        installed = true;
      }
    }
    if (!result.next.length) result.next = operationalNext(result, options, { installed, planCanApply })
      || getNextSteps({ command: options.command, language, target, installed, intent: options.intent });
    print(result, options, output); return exitCode;
  } catch (error) {
    const diagnostics = collectErrorDiagnostics(error);
    const primary = primaryDiagnosticError(error), code = error.code || primary?.code || 'E_OPERATION';
    const possiblePartial = operationUncertain || diagnostics.possiblePartial || diagnostics.preservedPaths.length > 0 || diagnostics.cleanupFailures.length > 0 || diagnostics.truncated;
    const result = { ok: false, command: options.command || 'help', version: packageInfo.version, language, clients, target, message: explainError(language, code, error, { possiblePartial }), error: { code, detail: error.message, ...(error.diagnosticsScope === 'staging' ? { scope: 'staging' } : {}), ...(['E_PROTECTED_METADATA', 'E_METADATA_UNSUPPORTED'].includes(code) && error.metadataTargetVerified === true && typeof error.path === 'string' ? { path: error.path } : {}), ...(['file-owner-different', 'file-owner-unverified', 'owner-read-unverified', 'acl-present', 'acl-unverified', 'hardlink-unverified', 'hardlink-shared', 'xattr-present', 'xattr-unverified', 'special-mode-directory', 'xattr-directory-present', 'xattr-directory-unverified'].includes(error.metadataReason) && error.metadataTargetVerified === true ? { metadataReason: error.metadataReason } : {}), ...(diagnostics.preservedPaths.length ? { preservedPaths: diagnostics.preservedPaths } : {}), ...(diagnostics.cleanupFailures.length ? { cleanupFailures: diagnostics.cleanupFailures.map(item => ({ path: item.path, message: 'cleanup failed' })) } : {}), ...(diagnostics.truncated ? { diagnosticsTruncated: true } : {}) }, next: getNextSteps({ command: 'error', language, target, possiblePartial, installed: existsSync(join(target, statePath)) || existsSync(join(target, legacyStatePath)) }) };
    const operation = publishedOperation(error.operation || error.cause?.operation || primary?.operation);
    if (operation) result.error.operation = operation;
    if (code.startsWith('E_RECOVERY_') || operationUncertain || error.recovery || operation) {
      const state = inspectProjectRecovery(target);
      if (state.status !== 'ready' || code.startsWith('E_RECOVERY_') || error.recovery || operation) {
        result.recovery = recoverySummary(state);
        result.error.detail = result.message;
        result.next = [...(possiblePartial ? result.next : []), { label: text(language, 'recoveryReview'), stage: 'revisao' }];
      }
    }
    if (removalBeforePlan.length) result.issues = removalBeforePlan.map(issue => ({ ...issue, observedBeforePlanFailure: true }));
    if (options.command === 'doctor' || options.command === 'sync' && options.check) result.warnings = [claudeInspectionWarning(language)];
    if (!options.json) result.message += ` (${code})`;
    print(result, options, output); return error.exitCode || primary?.exitCode || 1;
  }
}
