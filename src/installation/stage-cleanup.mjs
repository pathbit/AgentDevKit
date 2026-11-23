import { types as utilTypes } from 'node:util';
import { collectErrorDiagnostics, markDiagnosticsBoundary, primaryDiagnosticError } from '../../.pbai4devs/scripts/lib/error-reporting.mjs';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

export function cleanupInstallationStage({
  stage, stageFailure, stageFailed, stageSyncError, stageSyncFailed,
  outputBoundaryFailure, outputBoundaryMayHaveStageEffects,
}) {
  let callbackFailure = Boolean(stageFailed && outputBoundaryFailure && stageFailure === outputBoundaryFailure);
  if (!callbackFailure && stageFailed && outputBoundaryFailure) {
    try { callbackFailure = primaryDiagnosticError(stageFailure) === outputBoundaryFailure; } catch { /* Keep the synchronizer boundary. */ }
  }
  // Inspect only own data descriptors. Any accessor, proxy, mixed diagnostic
  // or graph limit retains the stage without disclosing arbitrary paths.
  const uncertainCause = error => {
    const pending = [error], seen = new Set();
    while (pending.length) {
      const item = pending.pop();
      if (!item || (typeof item !== 'object' && typeof item !== 'function') || seen.has(item)) continue;
      if (seen.size >= 64 || utilTypes.isProxy(item)) return true;
      seen.add(item);
      for (const key of ['uncertainPaths', 'rollbackPreservedPaths', 'cleanupFailures', 'diagnosticsTruncated', 'operationMayBePartial']) {
        let d; try { d = Object.getOwnPropertyDescriptor(item, key); } catch { return true; }
        if (d && (!Object.hasOwn(d, 'value') || d.value !== undefined && d.value !== null && d.value !== false)) return true;
      }
      let cause, errors;
      try { cause = Object.getOwnPropertyDescriptor(item, 'cause'); errors = Object.getOwnPropertyDescriptor(item, 'errors'); } catch { return true; }
      if (cause) { if (!Object.hasOwn(cause, 'value')) return true; if (cause.value) pending.push(cause.value); }
      if (errors) {
        if (!Object.hasOwn(errors, 'value') || utilTypes.isProxy(errors.value) || !Array.isArray(errors.value)) return true;
        let length; try { length = Object.getOwnPropertyDescriptor(errors.value, 'length')?.value; } catch { return true; }
        if (!Number.isSafeInteger(length) || length > 64) return true;
        for (let i = 0; i < length; i++) { let d; try { d = Object.getOwnPropertyDescriptor(errors.value, String(i)); } catch { return true; } if (d) { if (!Object.hasOwn(d, 'value')) return true; pending.push(d.value); } }
      }
    }
    return false;
  };
  const callbackUncertain = callbackFailure && (outputBoundaryMayHaveStageEffects || stageFailure !== outputBoundaryFailure || uncertainCause(outputBoundaryFailure));
  const syncDiagnostics = stageFailed && stageSyncFailed && Object.is(stageFailure, stageSyncError) && !callbackFailure ? collectErrorDiagnostics(stageFailure) : null;
  const preserveStage = callbackUncertain || Boolean(syncDiagnostics && (syncDiagnostics.preservedPaths.length || syncDiagnostics.cleanupFailures.length || syncDiagnostics.truncated));
  let cleanupFailure, cleanupFailed = false;
  // An uncertain staged name may have been replaced; recursive cleanup
  // would erase it and discard the only diagnostics. Keep the private stage.
  if (!preserveStage) try { rmSync(stage, { recursive: true, force: true }); } catch (error) { cleanupFailure = error; cleanupFailed = true; }
  if (callbackFailure) {
    // Keep the synchronizer's complete causal chain, even if it wrapped the
    // callback with an aggregate containing stage cleanup failures.
    const reported = new Error(outputBoundaryFailure.message, { cause: stageFailure });
    if (outputBoundaryFailure.code) reported.code = outputBoundaryFailure.code;
    if (callbackUncertain) { reported.uncertainPaths = [stage]; reported.diagnosticsTruncated = true; }
    if (outputBoundaryFailure.diagnosticsTruncated) reported.diagnosticsTruncated = true;
    if (cleanupFailed) {
      Object.defineProperty(reported, 'cleanupError', { value: cleanupFailure });
      reported.uncertainPaths = [stage]; reported.cleanupFailures = [{ path: stage, message: 'cleanup failed' }]; reported.operationMayBePartial = true;
    }
    throw markDiagnosticsBoundary(reported);
  }
  if (stageFailed && stageSyncFailed && Object.is(stageFailure, stageSyncError)) {
    // Synchronizer diagnostics refer to the private stage, not the project.
    // Once the stage is gone, report only the original operation failure.
    const primary = primaryDiagnosticError(stageFailure);
    const stageCode = stageFailure?.code || primary?.code;
    // Paths from the private stage must never be attributed to the project.
    const metadataStage = ['E_PROTECTED_METADATA', 'E_METADATA_UNSUPPORTED'].includes(stageCode);
    const detail = metadataStage ? 'Metadata verification failed in private staging; no project path is identified.' : (cleanupFailed || preserveStage ? stageFailure?.message : primary?.message) || 'Synchronization failed in private staging.';
    const reported = new Error(detail, { cause: stageFailure });
    // API callers can explicitly inspect the secondary error; it is not
    // included in the mapped public diagnostics or ordinary serialization.
    if (cleanupFailed) Object.defineProperty(reported, 'cleanupError', { value: cleanupFailure });
    reported.code = stageCode;
    reported.hardlinkUnsupported = stageFailure?.hardlinkUnsupported || primary?.hardlinkUnsupported;
    reported.diagnosticsScope = 'staging';
    if (syncDiagnostics.possiblePartial) reported.operationMayBePartial = true;
    if (cleanupFailed || preserveStage) {
      reported.rollbackPreservedPaths = [...(preserveStage ? [stage] : []), ...syncDiagnostics.preservedPaths.map(path => resolve(stage, path))];
      // Keep secondary filesystem messages out of the staged diagnostics;
      // the original synchronization failure remains available as the cause.
      reported.cleanupFailures = [...syncDiagnostics.cleanupFailures.map(item => ({ path: resolve(stage, item.path), message: 'cleanup failed' })), ...(cleanupFailed ? [{ path: stage, message: 'cleanup failed' }] : [])];
      if (syncDiagnostics.truncated) reported.diagnosticsTruncated = true;
    }
    throw markDiagnosticsBoundary(reported);
  }
  if (cleanupFailed) {
    // Neither failure is guaranteed to be extensible. Keep the primary
    // cause and the uncertain stage without annotating either original.
    const original = stageFailed ? stageFailure : cleanupFailure;
    const primary = primaryDiagnosticError(original);
    const reported = new Error(stageFailed ? original?.message || 'Stage operation failed.' : 'Cleanup failed in private staging.', { cause: original });
    if (stageFailed) Object.defineProperty(reported, 'cleanupError', { value: cleanupFailure });
    reported.code = original?.code || primary?.code;
    if (Number.isInteger(original?.exitCode ?? primary?.exitCode)) reported.exitCode = original?.exitCode ?? primary.exitCode;
    if (original?.hardlinkUnsupported || primary?.hardlinkUnsupported) reported.hardlinkUnsupported = true;
    if (typeof (original?.nestedGitPath ?? primary?.nestedGitPath) === 'string') reported.nestedGitPath = original?.nestedGitPath ?? primary.nestedGitPath;
    reported.operationMayBePartial = true;
    reported.uncertainPaths = [stage];
    reported.cleanupFailures = [{ path: stage, message: 'cleanup failed' }];
    if (!stageFailed) { reported.diagnosticsScope = 'staging'; throw markDiagnosticsBoundary(reported); }
    throw reported;
  }
  if (stageFailed && !stageSyncFailed && (stageFailure === null || (typeof stageFailure !== 'object' && typeof stageFailure !== 'function'))) {
    const reported = new Error('Stage operation failed.', { cause: stageFailure });
    reported.code = 'E_OPERATION'; reported.diagnosticsScope = 'staging';
    throw markDiagnosticsBoundary(reported);
  }
}
