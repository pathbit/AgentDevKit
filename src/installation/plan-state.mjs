import { gitPathsOverlap } from '../../.pbai4devs/scripts/lib/git-environment.mjs';
import { canonicalEntrypoint } from '../../.pbai4devs/scripts/lib/managed-content.mjs';
import { packageInfo, statePath } from '../config.mjs';
import { hash, fail, stat, safePath, read } from './filesystem.mjs';
import { stagedContains } from './git-index.mjs';
import { blockDigest } from './ownership.mjs';
import { actualStatePath, replaceJsonMember, reconcileStateBytes } from './state.mjs';

export function planStateRecords({
  target, desired, mode, language, bundled, previous, installedState, clients,
  selected, migration, changingClients, derived, derivedConfigFiles, unknownRemovedFiles,
  migratedHuman, preservedHub, mixedPaths, preserved, synchronized, stagedHuman, observeNative,
}) {
  const { entries: derivedEntries, outputs: derivedOutputs, blocks: derivedBlocks, files: derivedFiles,
    catalogs: derivedCatalogs, config: derivedConfig, removedBlocks, removedFiles } = derived;
  const manifest = { schemaVersion: 1, version: bundled.length ? packageInfo.version : previous.version, language, files: {}, blocks: {} };
  if (mode !== 'sync' || clients !== undefined || previous?.clients !== undefined) manifest.clients = selected;
  for (const [path, content] of desired) {
    if (path === 'README.md' || migratedHuman.has(path) || preservedHub.has(path)) continue;
    const block = blockDigest(path, content);
    if (block) manifest.blocks[path] = block;
    else manifest.files[path] = hash(content);
  }
  for (const [path, { reason }] of preserved) {
    if (reason === 'zcode-agent-preserved' && installedState?.blocks?.[path] && !removedBlocks.includes(path)) {
      manifest.blocks[path] = installedState.blocks[path];
    }
  }
  // A standalone sync records its proven outputs separately. During a later
  // check/sync, compare that overlay before declaring the installation state
  // stale; update still consolidates it into the main state transactionally.
  let stateContent = reconcileStateBytes(installedState ? read(target, actualStatePath(target)) : null, installedState, manifest);
  if (mode === 'sync' && installedState && !changingClients) {
    const files = { ...installedState.files }, blocks = { ...installedState.blocks };
    for (const [path, digest] of Object.entries(removedFiles)) {
      if (files[path] === digest && !stat(safePath(target, path))) delete files[path];
    }
    for (const path of removedBlocks) delete blocks[path];
    for (const [path, digest] of Object.entries({ ...derivedFiles, ...derivedOutputs, ...derivedEntries, ...derivedCatalogs, ...derivedConfigFiles })) { files[path] = digest; delete blocks[path]; }
    for (const [path, digest] of Object.entries(derivedBlocks)) { blocks[path] = digest; delete files[path]; }
    const same = (a, b) => {
      const keys = Object.keys(a).sort();
      return keys.length === Object.keys(b).length && keys.every(key => a[key] === b[key]);
    };
    if (installedState.schemaVersion === manifest.schemaVersion && installedState.version === manifest.version && installedState.language === manifest.language
      && JSON.stringify(installedState.clients) === JSON.stringify(manifest.clients) && same(files, manifest.files) && same(blocks, manifest.blocks)) stateContent = read(target, statePath);
  }
  desired.set(statePath, stateContent);
  const derivedPath = actualStatePath(target).replace(/agentdevkit\.json$/, 'derived.json');
  // Legacy migration must preserve the staged source and copy byte for byte.
  // Do not recreate a correlated retired output when that migration cannot
  // also reconcile its old derived marker under those existing guarantees.
  if (migration) {
    const blocked = Object.entries(removedFiles).find(([path, digest]) =>
      installedState?.files?.[path] === digest && !stat(safePath(target, path))
      && [...desired.keys()].some(candidate => gitPathsOverlap(path, candidate, { root: target, allowMissingTarget: true })));
    if (blocked) fail('E_MIGRATION_REVIEW', `Legacy removal record needs review before reactivation: ${blocked[0]}`);
  }
  const derivedBytes = !migration ? read(target, derivedPath) : null;
  let nextDerivedBytes = derivedBytes;
  if (nextDerivedBytes && Object.keys(removedFiles).length) {
    const finalState = JSON.parse(stateContent);
    const remaining = Object.fromEntries(Object.entries(removedFiles).filter(([path, digest]) =>
      unknownRemovedFiles.has(path) || finalState.files[path] === digest && !stat(safePath(target, path)) && !desired.has(path)));
    if (Object.keys(remaining).length !== Object.keys(removedFiles).length) {
      observeNative(derivedPath, derivedBytes);
      nextDerivedBytes = replaceJsonMember(nextDerivedBytes, 'removedFiles', Object.keys(remaining).length ? remaining : undefined);
    }
  }
  // Narrow transition: a direct-sync-only file being replaced by this plan
  // can transfer its prior overlay into the newly installed record.
  if (nextDerivedBytes && Object.keys(derivedFiles).length) {
    const finalState = JSON.parse(stateContent);
    const remaining = Object.fromEntries(Object.entries(derivedFiles).filter(([path, digest]) => {
      if (Object.hasOwn(installedState?.files ?? {}, path) || installedState?.blocks?.[path]
        || Object.hasOwn(removedFiles, path) || removedBlocks.includes(path)
        || derivedBlocks[path] || mixedPaths.has(path) || preserved.has(path)
        || !synchronized.ownedOutputs.includes(path) || stagedContains(target, stagedHuman, path)) return true;
      const current = read(target, path), content = desired.get(path);
      if (!current || !content || hash(current) !== digest || current.equals(content)
        || finalState.files[path] !== hash(content)) return true;
      observeNative(path, current);
      return false;
    }));
    if (Object.keys(remaining).length !== Object.keys(derivedFiles).length) {
      observeNative(derivedPath, derivedBytes);
      nextDerivedBytes = replaceJsonMember(nextDerivedBytes, 'files', Object.keys(remaining).length ? remaining : undefined);
    }
  }
  if (nextDerivedBytes && Object.keys(derivedCatalogs).length) {
    const finalState = JSON.parse(stateContent);
    const remaining = Object.fromEntries(Object.entries(derivedCatalogs).filter(([path]) => {
      const content = desired.get(path);
      return !content || finalState.files[path] !== hash(content);
    }));
    if (Object.keys(remaining).length !== Object.keys(derivedCatalogs).length) {
      observeNative(derivedPath, derivedBytes);
      nextDerivedBytes = replaceJsonMember(nextDerivedBytes, 'catalogs', Object.keys(remaining).length ? remaining : undefined);
    }
  }
  if (nextDerivedBytes && Object.keys(derivedBlocks).length) {
    const finalState = JSON.parse(stateContent);
    const remaining = Object.fromEntries(Object.entries(derivedBlocks).filter(([path, digest]) => {
      if (unknownRemovedFiles.has(path) || preserved.get(path)?.reason === 'zcode-agent-preserved') return true;
      const content = desired.get(path);
      // A deselected generated block is removed later in this transaction.
      // Drop its overlay only if its current bytes are still proven; edited
      // blocks remain conflicts and no metadata is committed on failure.
      if (!content && !canonicalEntrypoint(path) && !finalState.blocks[path] && !finalState.files[path]) {
        const current = read(target, path);
        return Boolean(current && blockDigest(path, current) !== digest);
      }
      return !content || finalState.blocks[path] !== blockDigest(path, content);
    }));
    if (Object.keys(remaining).length !== Object.keys(derivedBlocks).length) {
      observeNative(derivedPath, derivedBytes);
      nextDerivedBytes = replaceJsonMember(nextDerivedBytes, 'blocks', Object.keys(remaining).length ? remaining : undefined);
    }
  }
  if (nextDerivedBytes && derivedConfig) {
    const finalState = JSON.parse(stateContent), path = '.pbai4devs/espelhos.conf', content = desired.get(path);
    if (content && finalState.files[path] === hash(content)) {
      observeNative(derivedPath, derivedBytes);
      nextDerivedBytes = replaceJsonMember(nextDerivedBytes, 'config', undefined);
    }
  }
  if (nextDerivedBytes && !nextDerivedBytes.equals(derivedBytes)) desired.set(derivedPath, nextDerivedBytes);
  return { manifest, derivedPath, derivedBytes };
}
