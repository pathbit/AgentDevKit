const behavioral = new Set(['argumentPlaceholderExactlyOnce', 'repeatedSyncIdempotent']);
export const requiredIntegrityChecks = [
  'processSucceeded', 'expectedCliResult', 'indexPreserved', 'stagedDiffPreserved',
  'gitHeadPreserved', 'gitRefsPreserved', 'packedRefsPreserved', 'gitConfigPreserved',
  'gitExcludePreserved', 'gitignorePreserved', 'readmePreserved', 'humanFilePreserved',
  'fixtureSyntaxValid', 'humanPromptPreserved', 'humanDescriptionPreserved', 'humanCommentPreserved',
  'managedReferencePresent',
];

export function mustStop(checks) {
  return requiredIntegrityChecks.some(key => checks[key] !== true)
    || Object.entries(checks).some(([key, value]) => !behavioral.has(key) && value !== true);
}

const refusalProtection = [
  'indexPreserved', 'stagedDiffPreserved', 'gitHeadPreserved', 'gitRefsPreserved',
  'packedRefsPreserved', 'gitConfigPreserved', 'gitExcludePreserved', 'gitignorePreserved',
  'readmePreserved', 'humanFilePreserved', 'fixtureSyntaxValid', 'humanPromptPreserved',
  'humanDescriptionPreserved', 'humanCommentPreserved',
];

// A staged conflict is expected only at init in the deliberately divergent
// fixture, with the original command bytes and all protected snapshots intact.
export function expectedStagedRefusal({ gitState, phase, result, stage, originalHash }) {
  return gitState === 'staged-and-unstaged' && phase === 'init'
    && Number.isInteger(result.status) && result.status > 0 && !result.signal && !result.error
    && result.json?.ok === false && result.json.command === 'init' && result.json.errorCode === 'E_STAGED'
    && typeof originalHash === 'string' && /^[a-f0-9]{64}$/.test(originalHash)
    && stage.fileSha256 === originalHash
    && refusalProtection.every(key => stage.checks[key] === true);
}
