import { validRecoveryResolution, classifyRecoveryEffects } from '../../.pbai4devs/scripts/lib/recovery-effects.mjs';
import { packageInfo } from '../config.mjs';
import { text, normalizeLanguage } from '../i18n.mjs';
import { availableClients } from '../adapters/index.mjs';
import { inspectProjectRecovery, resolveProjectRecovery } from '../../.pbai4devs/scripts/lib/project-recovery.mjs';
import { claudeInspectionWarning } from './warnings.mjs';
import { print } from './output.mjs';

export function recoverySummary(observed) {
  const summary = { status: observed.status };
  for (const key of ['generation', 'resolvedCount']) if (Number.isSafeInteger(observed[key])) summary[key] = observed[key];
  for (const key of ['id', 'phase', 'terminal', 'reason', 'store', 'journal', 'backup']) {
    if (typeof observed[key] === 'string') summary[key] = observed[key];
  }
  return summary;
}

export function publishedOperation(raw) {
  if (!raw || !Number.isSafeInteger(raw.generation) || !validRecoveryResolution(['resolve', String(raw.generation), raw.id])) return null;
  const operation = { generation: raw.generation, id: raw.id };
  if (['claim', 'begin', 'done', 'resolved'].includes(raw.kind)) operation.kind = raw.kind;
  if (raw.publication === 'possible') operation.publication = raw.publication;
  return operation;
}

export function recoveryReport(options, target, recovery, previous, configurationStatus, configurationError, output) {
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
