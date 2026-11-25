import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createInterface } from 'node:readline';
import { spawnSync } from 'node:child_process';
import { packageInfo, statePath, legacyStatePath } from '../config.mjs';
import { text, normalizeLanguage, explainError } from '../i18n.mjs';
import { resolveTarget, loadState, planInstallation, applyPlan, inspect, inspectRemovalHistory } from '../install.mjs';
import { getNextSteps, integrationHints, integrationNext, nextCommand, operationalNext } from '../next.mjs';
import { legacyDocumentation } from '../legacy-documentation.mjs';
import { availableClients, resolveAdapters } from '../adapters/index.mjs';
import { isBlockingLocalIgnore } from '../../.pbai4devs/scripts/lib/gitignore.mjs';
import { assertUnredirectedGitEnvironment } from '../../.pbai4devs/scripts/lib/git-environment.mjs';
import { collectErrorDiagnostics, primaryDiagnosticError } from '../../.pbai4devs/scripts/lib/error-reporting.mjs';
import { classifyRecoveryEffects } from '../../.pbai4devs/scripts/lib/recovery-effects.mjs';
import { inspectProjectRecovery } from '../../.pbai4devs/scripts/lib/project-recovery.mjs';
import { usage, selectedClients, purposes, parseArgs } from './arguments.mjs';
import { worktreeWarning, linuxXattrWarning, claudeInspectionWarning, retainedClaudeWarning, claudeScopeWarning } from './warnings.mjs';
import { print } from './output.mjs';
import { recoverySummary, publishedOperation, recoveryReport } from './recovery-report.mjs';
import { cancelledPrompt, canShowClientMenu, selectClientsFromMenu } from './client-menu.mjs';

async function askLine(input, output, question) {
  const prompt = createInterface({ input, output });
  try {
    return await new Promise((answer, reject) => {
      const cancel = () => reject(cancelledPrompt());
      prompt.once('close', cancel);
      prompt.once('SIGINT', cancel);
      prompt.once('error', reject);
      prompt.question(question, answer);
    });
  } finally {
    prompt.close();
  }
}

export async function main(argv = process.argv.slice(2), context = {}) {
  const output = context.stdout || process.stdout, input = context.stdin || process.stdin, errorOutput = context.stderr || process.stderr;
  const promptOutput = errorOutput.isTTY ? errorOutput : output;
  const separator = argv.indexOf('--'), globalArgs = separator < 0 ? argv : argv.slice(0, separator);
  let options = { json: globalArgs.includes('--json'), markdown: globalArgs.includes('document') && globalArgs.includes('--markdown') };
  let language = normalizeLanguage(globalArgs[globalArgs.indexOf('--lang') + 1]) || 'pt', target = resolve(context.cwd || process.cwd()), clients = ['none'], operationUncertain = false, removalBeforePlan = [];
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
    if (['init', 'update', 'sync', 'doctor', 'agents', 'lang', 'plugins'].includes(options.command)) assertUnredirectedGitEnvironment();
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
        return recoveryReport(options, target, recovery, previous, configurationStatus, configurationError, options.markdown ? errorOutput : output);
      }
    }
    language = options.language || normalizeLanguage(previous?.language) || 'pt';
    clients = options.clients ?? (previous ? previous.clients ?? ['all'] : ['none']);
    const menu = () => selectClientsFromMenu({ input, output: promptOutput, language, initial: clients,
      choices: availableClients.filter(client => !['all', 'none'].includes(client.id)) });
    if (options.command === 'agents' && options.select) {
      if (!previous) throw Object.assign(new Error(text(language, 'missing')), { code: 'E_MISSING' });
      if (!canShowClientMenu(input, promptOutput)) throw Object.assign(new Error('Agent selection requires an interactive terminal.'), { code: 'E_TTY', exitCode: 2 });
      clients = options.clients = await menu();
    }
    if (options.command === 'init' && !previous && !options.yes && !options.json && !options.dryRun && input.isTTY && output.isTTY && (!options.language || options.clients === undefined)) {
      const ask = context.ask || (question => askLine(input, promptOutput, question));
      if (!options.language) language = normalizeLanguage((await ask(text(language, 'select'))).trim() || 'pt') || 'pt';
      if (options.clients === undefined) {
        if (!context.ask && canShowClientMenu(input, promptOutput)) clients = await menu();
        else {
          const ids = availableClients.map(client => client.id).join(', ');
          clients = selectedClients((await ask(`${text(language, 'clientsAvailable')}: ${ids}\n${text(language, 'clientsSelect')}`)).trim() || 'none');
        }
        options.clients = clients;
      }
      if (options.purpose === undefined) {
        const value = (await ask(text(language, 'purposeSelect'))).trim();
        const purpose = /^[1-4]$/.test(value) ? purposes[Number(value) - 1] : value || 'agents';
        if (!purposes.includes(purpose)) usage('Choose 1, 2, 3 or 4.');
        options.purpose = purpose;
      }
    }
    const result = { ok: true, command: options.command, version: packageInfo.version, language, ...(['help', 'version'].includes(options.command) ? {} : { clients }), target, message: '', next: [] };
    let installed = Boolean(previous), planCanApply;
    let exitCode = 0;
    if (options.command === 'help') result.message = text(language, 'help');
    else if (options.command === 'version') result.message = `AgentDevKit ${packageInfo.version}`;
    else if (options.command === 'agents' && options.clients === undefined) {
      result.message = clients.length ? text(language, 'clientsCurrent') : explainError(language, 'E_CLIENTS_RETIRED');
      result.availableClients = availableClients;
      const active = resolveAdapters(clients.length ? clients : ['none']);
      result.kitInstalled = installed;
      result.configuredClients = active.adapters.map(adapter => adapter.id);
      result.clientRoots = active.roots;
      if (installed) result.statePath = existsSync(join(target, statePath)) ? statePath : legacyStatePath;
    }
    else if (options.command === 'lang' && !options.positionals.length && !options.language && options.clients === undefined) result.message = `${text(language, 'language')}: ${language}`;
    else if (options.command === 'doctor') {
      const found = inspect(target);
      if (found.installed && clients.length) {
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
      result.message = found.installed && !clients.length
        ? explainError(language, 'E_CLIENTS_RETIRED')
        : text(language, result.ok ? 'healthy' : found.installed ? 'unhealthy' : 'missing');
      exitCode = result.ok ? 0 : 1;
    } else if (options.command === 'document') {
      result.documentation = legacyDocumentation(target);
      result.message = text(language, 'document');
    } else if (options.command === 'next') {
      const hints = options.intent === 'document' && !options.integrations ? []
        : integrationHints({ target, language, intent: options.intent });
      if (options.integrations) {
        result.integrations = hints;
        result.message = text(language, hints.length ? 'integrationsFound' : 'integrationsEmpty');
        if (installed) {
          const action = options.intent ? `next --intent ${options.intent}` : 'next';
          result.next = [{ label: text(language, 'workflow'), command: nextCommand(action, target, language), stage: 'fluxo' }];
        }
      } else {
        result.message = options.intent === 'document' ? text(language, 'document')
          : installed ? text(language, 'workflow') : text(language, 'missing');
        result.next = getNextSteps({ command: 'next', language, target, installed, intent: options.intent });
        if (hints.length) result.next.push(integrationNext(result, options.intent));
      }
    } else if (options.command === 'plugins') {
      const [action, id] = options.positionals;
      const { runPlugin } = await import('../plugins.mjs');
      Object.assign(result, await runPlugin({ action, id, target, installed }));
      result.message = text(language, 'plugins');
    } else if (options.command === 'tools') {
      if (!previous) throw Object.assign(new Error(text(language, 'missing')), { code: 'E_MISSING' });
      const script = join(target, '.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs');
      operationUncertain = true;
      const child = spawnSync(process.execPath, [script, ...options.toolArgs], { cwd: target, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
      result.ok = !child.error && child.status === 0; result.message = text(language, 'tools');
      result.toolOutput = [child.stdout, child.stderr, child.error?.message].filter(Boolean).join('\n'); exitCode = result.ok ? 0 : child.status || 1;
      if (!result.ok) result.next = getNextSteps({ command: 'error', language, target, installed: true, possiblePartial: true });
    } else {
      if (!clients.length) throw Object.assign(new Error('The stored client selection was retired.'), { code: 'E_CLIENTS_RETIRED' });
      if (options.command === 'lang') {
        const selected = options.positionals[0] || options.language; language = normalizeLanguage(selected);
        if (!language) usage('Use lang pt, en or es.'); result.language = language;
      }
      if (options.command === 'sync' && options.check && previous) removalBeforePlan = inspectRemovalHistory(target);
      const clientChange = options.command === 'agents' && options.positionals.length === 2
        ? options.positionals[0] : undefined;
      const plan = preparePlan({ target, language, mode: options.command, force: options.force, clients: options.clients, clientChange, local: options.local });
      result.clients = plan.clients;
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
    if (!result.next.length && options.command !== 'plugins') result.next = operationalNext(result, options, { installed, planCanApply })
      || getNextSteps({ command: options.command, language, target, installed, intent: options.intent });
    print(result, options, output); return exitCode;
  } catch (error) {
    if (error.code === 'E_CANCELLED') {
      promptOutput.write(`${text(language, 'clientMenuCancelled')}\n`);
      return error.exitCode;
    }
    const diagnostics = collectErrorDiagnostics(error);
    const primary = primaryDiagnosticError(error), code = error.code || primary?.code || 'E_OPERATION';
    const precondition = ['E_UPGRADE', 'E_CLIENTS_RETIRED'].includes(code);
    const possiblePartial = operationUncertain && !precondition || diagnostics.possiblePartial || diagnostics.preservedPaths.length > 0 || diagnostics.cleanupFailures.length > 0 || diagnostics.truncated;
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
    if (code === 'E_CLIENTS_RETIRED' && !possiblePartial) {
      result.next = operationalNext(result, options, { installed: true });
    } else if (code === 'E_UPGRADE' && !possiblePartial) {
      if (typeof error.syncPath === 'string') result.error.path = error.syncPath;
      result.next = ['init', 'update'].includes(options.command) && result.error.path
        ? [{ label: text(language, 'reviewSyncSource'), stage: 'revisao' }]
        : [{ label: text(language, 'reviewUpdate'), command: nextCommand('update --dry-run', target, language), stage: 'revisao' }];
    } else if (options.command === 'doctor' || options.command === 'sync' && options.check) {
      result.warnings = [claudeInspectionWarning(language)];
    }
    if (options.command === 'document' && !result.recovery && !possiblePartial) {
      result.next = getNextSteps({ command: 'document-error', language, target });
    }
    if (!options.json) result.message += ` (${code})`;
    print(result, options, options.markdown && !options.json ? errorOutput : output); return error.exitCode || primary?.exitCode || 1;
  }
}
