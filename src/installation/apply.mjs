import { randomUUID } from 'node:crypto';
import { assertUnredirectedGitEnvironment, assertNoNestedGit } from '../../.pbai4devs/scripts/lib/git-environment.mjs';
import { withPotentialPartial, withUncertainPath } from '../../.pbai4devs/scripts/lib/error-reporting.mjs';
import { assertLinuxXattrsUnchanged, inspectLinuxXattr, inspectMacAcl, inspectMacDirectoryAcl, inspectMacXattr } from '../../.pbai4devs/scripts/lib/xattr-probe.mjs';
import { fileOwnerIssue } from '../../.pbai4devs/scripts/lib/file-owner.mjs';
import { chmodSync, lstatSync, readFileSync, writeFileSync, readdirSync, mkdirSync, mkdtempSync, rmSync, rmdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { legacyClaudeGitTarget } from '../../.pbai4devs/scripts/lib/claude-legacy-exact.mjs';
import { planLocalIgnore, assertLocalIgnoreUnchanged, applyLocalIgnore, planUntrack } from '../../.pbai4devs/scripts/lib/gitignore.mjs';
import { checkWindowsFileChanges, copyFileWithNativeMetadata, inspectMacWriteProtection, nativeMetadataCopySupported } from '../../.pbai4devs/scripts/lib/native-metadata.mjs';
import { legacyStatePath } from '../config.mjs';
import { text } from '../i18n.mjs';
import { buildRecoveryEntries } from '../../.pbai4devs/scripts/lib/recovery-entries.mjs';
import { createPrivateRecoveryDirectory } from '../../.pbai4devs/scripts/lib/recovery-privacy.mjs';
import { assertRecoveryStageVolume, completeProjectRecovery, inspectProjectRecovery, startProjectRecovery } from '../../.pbai4devs/scripts/lib/project-recovery.mjs';
import { hash, portable, fail, stat, safePath, nativeOutputBoundary, read } from './filesystem.mjs';
import { stagedDivergences, stagedContains } from './git-index.mjs';
import { publishPlannedFile } from './publish-file.mjs';
import { allowsStagedBlock, allowedManaged } from './ownership.mjs';
import { loadState, readDerivedState } from './state.mjs';
import { assertMigrationDirectoryMetadata } from './legacy-state.mjs';
import { adapterRoots } from '../adapters/index.mjs';

export function applyPlan(plan) {
  assertUnredirectedGitEnvironment();
  const pending = inspectProjectRecovery(plan.target);
  if (pending.status !== 'ready') {
    throw Object.assign(new Error('Inspect the project recovery record before continuing.'), {
      code: pending.status === 'pending' ? 'E_RECOVERY_PENDING' : 'E_RECOVERY_STORE', operation: pending,
    });
  }
  if (!plan.canApply && !plan.conflicts?.length && !plan.localIgnoreCheck?.missing?.length && plan.ownerBlockers?.length) {
    const blocker = plan.ownerBlockers[0], issue = fileOwnerIssue(stat(safePath(plan.target, blocker.path)));
    if (issue !== blocker.code) fail('E_CHANGED', 'The planned file owner changed; review and create a new plan.');
    throw Object.assign(new Error('File ownership or readability requires review.'), { code: issue.endsWith('-unverified') ? 'E_METADATA_UNSUPPORTED' : 'E_PROTECTED_METADATA', path: blocker.path, metadataTargetVerified: true, metadataReason: issue });
  }
  if (!plan.canApply && !plan.conflicts?.length && !plan.localIgnoreCheck?.missing?.length && plan.hardlinkBlockers?.length) {
    const blocker = plan.hardlinkBlockers[0], info = stat(safePath(plan.target, blocker.path));
    if (!info?.isFile()) fail('E_CHANGED', 'The planned file changed; review and create a new plan.');
    if (!Number.isSafeInteger(info.nlink) || info.nlink < 1) throw Object.assign(new Error('Hardlink count could not be verified; preserved for review.'), { code: 'E_METADATA_UNSUPPORTED', path: blocker.path, metadataTargetVerified: true, metadataReason: 'hardlink-unverified' });
    if (info.nlink === 1 || blocker.code !== 'hardlink-shared') fail('E_CHANGED', 'The planned hardlink status changed; review and create a new plan.');
    throw Object.assign(new Error('Existing file has multiple hardlinks; preserved for review.'), { code: 'E_PROTECTED_METADATA', path: blocker.path, metadataTargetVerified: true, metadataReason: 'hardlink-shared' });
  }
  if (!plan.canApply && !plan.conflicts?.length && !plan.localIgnoreCheck?.missing?.length && plan.aclBlockers?.length && process.platform === 'darwin') {
    const blocker = plan.aclBlockers[0], file = safePath(plan.target, blocker.path), info = stat(file);
    if (!info?.isFile()) fail('E_CHANGED', 'The planned file changed; review and create a new plan.');
    const acl = inspectMacAcl(file);
    if (acl === 'empty') fail('E_CHANGED', 'The planned ACL status changed; review and create a new plan.');
    throw Object.assign(new Error('ACL requires review.'), { code: acl === 'present' ? 'E_PROTECTED_METADATA' : 'E_METADATA_UNSUPPORTED', path: blocker.path, metadataTargetVerified: true, metadataReason: acl === 'present' ? 'acl-present' : 'acl-unverified' });
  }
  if (!plan.canApply && !plan.conflicts?.length && !plan.localIgnoreCheck?.missing?.length && plan.xattrBlockers?.length && process.platform === 'linux') {
    const blocker = plan.xattrBlockers[0], file = safePath(plan.target, blocker.path);
    if (!stat(file)?.isFile() || inspectLinuxXattr(file) !== 'present') fail('E_CHANGED', 'The planned metadata changed; review and create a new plan.');
    throw Object.assign(new Error('Extended attributes require review.'), { code: 'E_PROTECTED_METADATA', path: blocker.path, metadataTargetVerified: true, metadataReason: 'xattr-present' });
  }
  if (!plan.canApply) fail('E_CONFLICT', text(plan.language, 'conflict'));
  if (!Array.isArray(plan.changes)) fail('E_PLAN', 'The installation plan must contain a list of changes.');
  const assertActionContent = (action, content, code) => {
    if (action === 'remove' ? content !== null : !['create', 'update'].includes(action) || !Buffer.isBuffer(content)) {
      fail(code, 'The installation action and its content are inconsistent.');
    }
  };
  const assertStaticContents = code => {
    for (const change of plan.changes) {
      if (!['create', 'update', 'remove'].includes(change.action)) fail(code, 'The installation plan contains an unknown action.');
      if (change.action === 'create' ? change.beforeHash !== null : typeof change.beforeHash !== 'string' || !/^[a-f0-9]{64}$/.test(change.beforeHash)) {
        fail(code, 'The installation action and its previous state are inconsistent.');
      }
      const descriptor = Object.getOwnPropertyDescriptor(change, 'content');
      if (!descriptor) fail(code, 'The installation action is missing content.');
      // Defer accessors until execution: they can report a failure without
      // being evaluated during planning. Normal plans contain data properties.
      if ('value' in descriptor) assertActionContent(change.action, descriptor.value, code);
    }
  };
  const plannedPaths = new Set();
  for (const change of plan.changes) {
    if (!change || typeof change.path !== 'string' || plannedPaths.has(change.path)) {
      fail('E_PLAN', 'The installation plan contains an invalid or duplicate path.');
    }
    plannedPaths.add(change.path);
  }
  assertStaticContents('E_PLAN');
  const plannedActions = plan.changes.map(change => [change.path, change.action]);
  const assertActionsUnchanged = () => {
    if (!Array.isArray(plan.changes) || plan.changes.length !== plannedActions.length
      || plannedActions.some(([path, action], index) => plan.changes[index]?.path !== path || plan.changes[index]?.action !== action)) {
      fail('E_CHANGED', 'The installation actions changed during application.');
    }
  };
  assertLocalIgnoreUnchanged(plan.localIgnore);
  const { target } = plan;
  // These were real inputs to private-stage decisions, even if not outputs.
  const assertStageDependencies = () => {
    if (plan.stageDependencies !== undefined && !Array.isArray(plan.stageDependencies)) fail('E_PLAN', 'Invalid stage dependencies.');
    for (const item of plan.stageDependencies || []) {
      if (!item || typeof item.path !== 'string' || (item.expectedHash !== null && !/^[a-f0-9]{64}$/.test(item.expectedHash))) fail('E_PLAN', 'Invalid stage dependency.');
      const current = read(target, item.path);
      if ((current ? hash(current) : null) !== item.expectedHash) fail('E_CHANGED', 'Stage input changed after planning: ' + item.path);
    }
  };
  assertStageDependencies();
  const assertFallbackChecks = () => {
    for (const [path, expected] of plan.fallbackChecks || []) {
      let current;
      try { current = nativeOutputBoundary(target, path, plan.fallbackOwnedPaths || []); }
      catch { fail('E_CHANGED', `Skill route changed after planning: ${path}`); }
      if (JSON.stringify(current) !== JSON.stringify(expected)) fail('E_CHANGED', `Skill route changed after planning: ${path}`);
    }
  };
  assertFallbackChecks();
  const stagedHuman = stagedDivergences(target);
  const retiredClaude = plan.changes.find(change => change.path === legacyClaudeGitTarget && change.action === 'remove');
  const assertClaudeRetirementUntracked = () => {
    if (!retiredClaude) return;
    const index = planUntrack(target, { [retiredClaude.path]: retiredClaude.beforeHash });
    if (index.paths.length || index.conflicts.length) fail('E_STAGED', `Tracked Claude rule is preserved: ${retiredClaude.path}`);
  };
  assertClaudeRetirementUntracked();
  if (plan.changes.some(change => stagedContains(target, stagedHuman.gitlinks || new Set(), change.path))
    || plan.changes.some(change => change.beforeHash !== null) && stagedContains(target, stagedHuman.gitlinks || new Set(), '.agent-tests/agentdevkit/backups')) fail('E_STAGED', 'A planned change is inside a Git submodule; its contents are preserved.');
  const currentState = loadState(target);
  const derivedState = readDerivedState(target);
  const currentBlocks = {
    ...Object.fromEntries(Object.entries(currentState?.blocks || {}).filter(([path]) => !derivedState.removedBlocks.includes(path))),
    ...derivedState.blocks,
  };
  const approvedStagedContents = new Map();
  const stagedChanges = plan.changes.filter(change => {
    if (!stagedContains(target, stagedHuman, change.path)) return false;
    const current = read(target, change.path);
    if ((current ? hash(current) : null) !== change.beforeHash) fail('E_CHANGED', `File changed after planning: ${change.path}`);
    if (!current) return true;
    if (change.stagedDeletionAllowed && stagedContains(target, stagedHuman.deleted || new Set(), change.path)
      && currentState?.files?.[change.path] === change.beforeHash) return false;
    if (change.stagedBlockAllowed && change.action === 'update') {
      const proposed = change.content;
      if (Buffer.isBuffer(proposed)) {
        const content = Buffer.from(proposed);
        if (allowsStagedBlock(change.path, current, content, currentBlocks[change.path])) {
          approvedStagedContents.set(change.path, content);
          return false;
        }
      }
    }
    if (change.stagedMigrationTarget) {
      const copy = plan.changes.find(candidate => candidate.path === change.stagedMigrationTarget && candidate.action === 'create');
      if (copy?.content?.equals(current) && plan.changes.indexOf(copy) < plan.changes.indexOf(change)
        && !stat(safePath(target, change.stagedMigrationTarget))) return false;
    }
    return true;
  });
  if (stagedChanges.length) fail('E_STAGED', `Staged content differs from the working tree for planned changes: ${stagedChanges.map(change => `${change.action} ${change.path}`).join(', ')}. Preserve and review these paths before updating.`);
  assertNoNestedGit(target, [...plan.changes.map(change => change.path), ...(plan.migration?.directories || []).flatMap(item => [item.path, item.path.replace(/^\.pbai4devs\/estado/, '.pbai4devs/state')])]);
  const assertMigrationDirectories = () => {
    if (!plan.migration) return;
    if (stat(safePath(target, '.pbai4devs/state'))) fail('E_CHANGED', 'State destination appeared after planning.');
    for (const directory of plan.migration.directories) {
      const file = safePath(target, directory.path), info = stat(file);
      if (!info?.isDirectory()) fail('E_CHANGED', `State directory changed after planning: ${directory.path}`);
      assertMigrationDirectoryMetadata(target, directory.path, info);
      if ((info.mode & 0o777) !== directory.mode) fail('E_CHANGED', `State directory mode changed during migration: ${directory.path}`);
      if (JSON.stringify(readdirSync(file).sort()) !== JSON.stringify(directory.names)) {
        fail('E_CHANGED', `State directory changed after planning: ${directory.path}`);
      }
    }
  };
  assertMigrationDirectories();
  for (const item of plan.migration?.files || []) {
    const info = stat(safePath(target, item.path));
    if (!info?.isFile() || (info.mode & 0o777) !== item.mode || hash(readFileSync(safePath(target, item.path))) !== hash(item.content)) fail('E_CHANGED', `State file changed after planning: ${item.path}`);
  }
  const backupParent = '.agent-tests/agentdevkit/backups';
  safePath(target, backupParent);
  for (const change of plan.changes) safePath(target, change.path);
  const before = new Map(plan.changes.map(change => [change.path, read(target, change.path)]));
  const assertNoSharedLinks = (path, info) => {
    if (info?.isFile() && (!Number.isSafeInteger(info.nlink) || info.nlink < 1)) throw Object.assign(new Error('Hardlink count could not be verified; preserved for review.'), {
      code: 'E_METADATA_UNSUPPORTED', path, metadataTargetVerified: true, metadataReason: 'hardlink-unverified',
    });
    if (info?.isFile() && info.nlink > 1) throw Object.assign(new Error('Existing file has multiple hardlinks; preserved for review.'), {
      code: 'E_PROTECTED_METADATA', path, metadataTargetVerified: true, metadataReason: 'hardlink-shared',
    });
  };
  const assertFileOwner = (path, info) => {
    const issue = fileOwnerIssue(info);
    if (issue) throw Object.assign(new Error('File ownership or readability requires review.'), { code: issue.endsWith('-unverified') ? 'E_METADATA_UNSUPPORTED' : 'E_PROTECTED_METADATA', path, metadataTargetVerified: true, metadataReason: issue });
  };
  for (const change of plan.changes) assertNoSharedLinks(change.path, stat(safePath(target, change.path)));
  for (const change of plan.changes) assertFileOwner(change.path, stat(safePath(target, change.path)));
  if (process.platform === 'win32') {
    checkWindowsFileChanges(plan.changes.filter(item => item.action !== 'create').map(item => ({
      path: safePath(target, item.path), displayPath: item.path, update: item.action === 'update',
    })));
  }
  // Guard actual project files; private staging is not evidence of their metadata.
  if (process.platform === 'darwin' || process.platform === 'linux') {
    for (const change of plan.changes) {
      const info = stat(safePath(target, change.path));
      // Linux may hide inaccessible xattrs or lack getfattr. Only positive
      // detection is conclusive; absence of a finding is not a safety proof.
      if (info?.isFile() && process.platform === 'linux' && inspectLinuxXattr(safePath(target, change.path)) === 'present'
        && (change.action !== 'update' || !nativeMetadataCopySupported || plan.xattrUnverified?.includes(change.path))) {
        throw Object.assign(new Error('Extended attributes require review.'), { code: 'E_PROTECTED_METADATA', path: change.path, metadataTargetVerified: true, metadataReason: 'xattr-present' });
      }
      if (info?.isFile() && process.platform === 'darwin') {
        const protection = inspectMacWriteProtection(safePath(target, change.path));
        if (protection !== 'clear') {
          const code = protection === 'protected' ? 'E_PROTECTED_METADATA' : 'E_METADATA_UNSUPPORTED';
          throw Object.assign(new Error('File metadata prevents a safe update.'), { code, path: change.path, metadataTargetVerified: true, metadataReason: protection === 'protected' ? 'acl-deny' : 'acl-unverified' });
        }
        const acl = inspectMacAcl(safePath(target, change.path));
        if (acl !== 'empty' && !(change.action === 'update' && nativeMetadataCopySupported && acl === 'present')) {
          const code = acl === 'present' ? 'E_PROTECTED_METADATA' : 'E_METADATA_UNSUPPORTED';
          throw Object.assign(new Error('ACL requires review.'), { code, path: change.path, metadataTargetVerified: true, metadataReason: acl === 'present' ? 'acl-present' : 'acl-unverified' });
        }
        const result = inspectMacXattr(safePath(target, change.path));
        if (result !== 'empty' && !(change.action === 'update' && nativeMetadataCopySupported && result === 'present')) {
          const code = result === 'present' ? 'E_PROTECTED_METADATA' : 'E_METADATA_UNSUPPORTED';
          throw Object.assign(new Error('Extended attributes require review.'), { code, path: change.path, metadataTargetVerified: true, metadataReason: result === 'present' ? 'xattr-present' : 'xattr-unverified' });
        }
      }
      if (info?.isFile() && (info.mode & 0o7000)) {
        throw Object.assign(new Error('Existing file has special POSIX mode bits; preserved for review.'), {
          code: 'E_PROTECTED_METADATA', path: change.path, metadataTargetVerified: true,
        });
      }
    }
  }
  const beforeStats = new Map(plan.changes.map(change => {
    const info = stat(safePath(target, change.path));
    return [change.path, info];
  }));
  const beforeModes = new Map([...beforeStats].map(([path, info]) => [path, info ? info.mode & 0o777 : undefined]));
  for (const change of plan.changes) if ((before.get(change.path) ? hash(before.get(change.path)) : null) !== change.beforeHash) fail('E_CHANGED', `File changed after planning: ${change.path}`);
  // Plans produced by planInstallation use arrays. Restrict external plans
  // to reusable collections whose contents can be compared before backup.
  const retired = plan.retiredRoots;
  if (retired && !Array.isArray(retired) && !(retired instanceof Set)) fail('E_PLAN', 'Directory pruning roots must be an array or Set.');
  // Conditional candidates only: actual pruning still checks each directory
  // when reached. This does not describe all filesystem effects or backup.
  const pruneCandidates = derivePruneCandidates(plan);
  const pruneSnapshot = JSON.stringify(pruneCandidates);
  const assertPrunePlanUnchanged = () => {
    if (JSON.stringify(derivePruneCandidates(plan)) !== pruneSnapshot) fail('E_CHANGED', 'Directory pruning plan changed during application.');
  };
  const directories = [
    ...pruneCandidates.chains.flat().map(path => ({ path, action: 'remove' })),
    ...pruneCandidates.retiredRoots.filter(path => stat(safePath(target, path))?.isDirectory()).map(path => ({ path, action: 'remove' })),
    ...(plan.migration?.directories ?? []).flatMap(({ path }) => [
      { path, action: 'remove' }, { path: path.replace(/^\.pbai4devs\/estado/, '.pbai4devs/state'), action: 'retain' },
    ]),
  ];
  if (!plannedActions.length && !directories.length) {
    const ignored = applyLocalIgnore(plan.localIgnore, { migrateLegacy: true });
    return { changed: Boolean(ignored.changed), backup: null, localIgnorePending: ignored.pending, localIgnoreMigration: ignored.migration };
  }
  const entries = buildRecoveryEntries(target, plannedActions.map(([path, action]) => ({
    path, action, before: before.get(path) === null ? null : { data: before.get(path), mode: beforeModes.get(path) },
  })), directories);
  const transaction = startProjectRecovery(target, entries);
  let backup = null;
  const attemptedPaths = new Set();
  try {
    for (const [path, action] of plannedActions) {
      if (action === 'update') assertRecoveryStageVolume(transaction, safePath(target, path), path);
    }
    const copies = [...before].filter(([, content]) => content !== null);
    if (copies.length) {
      assertNoNestedGit(target, [backupParent]);
      let ancestor = '';
      for (const component of backupParent.split('/')) {
        ancestor = ancestor ? `${ancestor}/${component}` : component;
        const directory = safePath(target, ancestor);
        try { mkdirSync(directory, { mode: 0o700 }); }
        catch (error) {
          if (error.code !== 'EEXIST') throw error;
          const existing = lstatSync(safePath(target, ancestor));
          if (!existing.isDirectory() || existing.isSymbolicLink()) throw error;
        }
      }
      const directory = process.platform === 'win32'
        ? join(safePath(target, backupParent), randomUUID())
        : mkdtempSync(join(safePath(target, backupParent), `${Date.now()}-`));
      if (process.platform === 'win32') createPrivateRecoveryDirectory(directory);
      backup = portable(relative(target, directory));
      try {
        const info = lstatSync(safePath(target, backup));
        if (!info.isDirectory() || info.isSymbolicLink() || process.platform !== 'win32' && (info.mode & 0o077)) {
          fail('E_BACKUP', 'The new backup directory could not be verified as private.');
        }
        if (process.platform === 'darwin' && inspectMacDirectoryAcl(safePath(target, backup)) !== 'empty') fail('E_BACKUP', 'The new backup directory ACL could not be verified as private.');
        for (const [path, content] of copies) {
          const backupFile = `${backup}/${path}`;
          assertNoNestedGit(target, [backupFile]);
          const destination = safePath(target, backupFile), mode = beforeModes.get(path);
          mkdirSync(dirname(destination), { recursive: true, mode: 0o700 });
          assertNoNestedGit(target, [backupFile]);
          writeFileSync(destination, Buffer.alloc(0), { flag: 'wx', mode: nativeMetadataCopySupported ? 0o600 : mode });
          const destinationIdentity = lstatSync(destination, { bigint: true });
          if (nativeMetadataCopySupported) {
            try { copyFileWithNativeMetadata(safePath(target, path), destination, { destinationIdentity, expectedBytes: content }); }
            catch (error) {
              let contentStillMatches = false;
              try {
                const current = lstatSync(safePath(target, path), { bigint: true });
                contentStillMatches = current.isFile() && !current.isSymbolicLink() && read(target, path)?.equals(content) === true;
              } catch { /* An unreadable or replaced source is a concurrent change. */ }
              if (!contentStillMatches) fail('E_CHANGED', `File changed while creating its backup: ${path}`);
              throw error;
            }
          }
          else {
            writeFileSync(destination, content);
            chmodSync(destination, mode);
          }
        }
      } catch (error) { throw withUncertainPath(error, backup); }
    }
    assertStageDependencies();
    assertClaudeRetirementUntracked();
    const assertOriginal = path => {
      const file = safePath(target, path), info = stat(file), bytes = before.get(path);
      assertNoSharedLinks(path, info);
      assertFileOwner(path, info);
      assertLinuxXattrsUnchanged(file, beforeStats.get(path), info, path);
      if (bytes === null ? info !== null : !info?.isFile() || !readFileSync(file).equals(bytes) || (info.mode & 0o777) !== beforeModes.get(path)) fail('E_CHANGED', `File changed before writing: ${path}`);
    };
    assertActionsUnchanged();
    assertStaticContents('E_CHANGED');
    assertPrunePlanUnchanged();
    assertMigrationDirectories();
    for (const change of plan.changes) assertOriginal(change.path);
    for (let index = 0; index < plannedActions.length; index++) {
      if (!Array.isArray(plan.changes) || plan.changes.length !== plannedActions.length) fail('E_CHANGED', 'The installation actions changed during application.');
      const change = plan.changes[index], [path, action] = plannedActions[index];
      if (!change || change.path !== path || change.action !== action) fail('E_CHANGED', 'The installation actions changed during application.');
      assertNoNestedGit(target, [path]);
      if (path === retiredClaude?.path) assertClaudeRetirementUntracked();
      assertOriginal(path);
      const file = safePath(target, path);
      // Publish the same private bytes that passed the staged-block check.
      const content = approvedStagedContents.get(path) ?? change.content;
      assertActionContent(action, content, 'E_CHANGED');
      attemptedPaths.add(path);
      if (action === 'remove') {
        const migrated = plan.migration?.files.find(item => item.path === path);
        if (migrated) {
          const copy = plan.changes.find(candidate => candidate.path === migrated.target && candidate.action === 'create');
          const copied = read(target, migrated.target);
          if (!copy?.content || !copied?.equals(copy.content)
            || migrated.path !== legacyStatePath && !copied.equals(before.get(path))) {
            fail('E_CHANGED', `Migrated copy changed before removing: ${path}`);
          }
        }
        if (process.platform === 'linux' && stat(safePath(target, path))?.isFile() && inspectLinuxXattr(safePath(target, path)) === 'present') {
          throw Object.assign(new Error('Extended attributes require review.'), { code: 'E_PROTECTED_METADATA', path, metadataTargetVerified: true, metadataReason: 'xattr-present' });
        }
        rmSync(file);
      }
      else {
        publishPlannedFile(target, transaction.stage, path, content, beforeModes.get(path) ?? change.mode,
          () => assertOriginal(path), before.get(path));
      }
    }
    if (plan.migration) {
      for (const directory of plan.migration.directories) {
        const destination = directory.path.replace(/^\.pbai4devs\/estado/, '.pbai4devs/state');
        assertNoNestedGit(target, [directory.path, destination]);
        const file = safePath(target, destination), existing = stat(file);
        if (existing && !existing.isDirectory()) fail('E_CHANGED', `Invalid state destination: ${destination}`);
        attemptedPaths.add(destination);
        if (!existing) mkdirSync(file, { recursive: true, mode: directory.mode });
        chmodSync(file, directory.mode);
      }
      for (const directory of [...plan.migration.directories].sort((a, b) => b.path.length - a.path.length)) {
        assertNoNestedGit(target, [directory.path]);
        const file = safePath(target, directory.path), info = stat(file);
        if (!info?.isDirectory() || readdirSync(file).length) fail('E_CHANGED', `State directory changed during migration: ${directory.path}`);
        assertMigrationDirectoryMetadata(target, directory.path, info);
        if ((info.mode & 0o777) !== directory.mode) fail('E_CHANGED', `State directory mode changed during migration: ${directory.path}`);
        attemptedPaths.add(directory.path);
        rmdirSync(file);
      }
    }
    assertFallbackChecks();
    assertPrunePlanUnchanged();
    pruneRemovedDirectories(plan, pruneCandidates, assertPrunePlanUnchanged, path => attemptedPaths.add(path));
    const changesFallback = plan.changes.some(change => change.path === '.gitignore');
    const ignorePlan = changesFallback
      ? { ...planLocalIgnore(target, { outputs: plan.ownedOutputs }), legacyMigration: plan.localIgnore.legacyMigration }
      : plan.localIgnore;
    const ignored = applyLocalIgnore(ignorePlan, { migrateLegacy: true });
    completeProjectRecovery(transaction);
    return { changed: Boolean(plan.changes.length || ignored.changed), backup, localIgnorePending: ignored.pending, localIgnoreMigration: ignored.migration };
  } catch (cause) {
    let error = withPotentialPartial(cause);
    if (backup) error = withUncertainPath(error, backup);
    for (const path of attemptedPaths) error = withUncertainPath(error, path);
    error = withUncertainPath(error, transaction.backup);
    error.recovery = inspectProjectRecovery(target);
    const publication = cause?.operation ?? cause?.cause?.operation;
    if (publication) error.operation = publication;
    throw error;
  }
}

// Lexical candidates for normal pruning. A chain stops at the first
// directory that cannot be removed; the executor rechecks the live tree.
// Migration, creation, backup and rollback effects are not included.
export function derivePruneCandidates(plan) {
  const legacy = '.pbai4devs/adapters/README.md';
  const removed = plan.changes.filter(change => change.action === 'remove' && (allowedManaged(change.path) || change.path === legacy));
  const parents = new Set(removed.map(change => portable(dirname(change.path))));
  if (removed.some(change => change.path === legacy)) {
    parents.add('.pbai4devs/adapters/antigravity');
    parents.add('.pbai4devs/adapters/antigravity/agents');
  }
  const chains = [];
  for (let parent of [...parents].sort((left, right) => right.length - left.length)) {
    const boundary = parent.startsWith('.pbai4devs/') ? '.pbai4devs' : adapterRoots.find(root => parent.startsWith(`${root}/`));
    const chain = [];
    while (boundary && parent.startsWith(`${boundary}/`)) {
      chain.push(parent);
      parent = portable(dirname(parent));
    }
    if (chain.length) chains.push(chain);
  }
  return { chains, retiredRoots: [...(plan.retiredRoots || [])].filter(root => adapterRoots.includes(root)) };
}

function pruneRemovedDirectories(plan, candidates, validateCandidates, onRemove) {
  const { target } = plan;
  for (const chain of candidates.chains) {
    for (const parent of chain) {
      const directory = safePath(target, parent);
      const info = stat(directory);
      if (!info?.isDirectory() || readdirSync(directory).length) break;
      onRemove(parent);
      try { rmdirSync(directory); }
      catch (error) { if (['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) break; throw error; }
    }
  }
  for (const root of candidates.retiredRoots) {
    validateCandidates();
    const directory = safePath(target, root);
    const info = stat(directory);
    if (!info?.isDirectory()) continue;
    try {
      if (readdirSync(directory).length === 0) {
        onRemove(root);
        rmdirSync(directory);
      }
    }
    catch (error) { if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error; }
  }
}
