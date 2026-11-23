import { posix } from 'node:path';
import { canMigrateClaudeReference, isLegacyExact } from '../../.pbai4devs/scripts/lib/claude-legacy-exact.mjs';
import { canonicalEntrypoint, mergeManagedContent, nativeZcodeAgent } from '../../.pbai4devs/scripts/lib/managed-content.mjs';
import { hash, fail, read, sameBytes } from './filesystem.mjs';
import { stagedContains } from './git-index.mjs';
import { nativeMarkdown, blockDigest } from './ownership.mjs';

export function reconcileNativeOutputs({
  target, stage, desired, previous, installedState, derived, unknownRemovedFiles,
  synchronized, initialStatePath, initialStateBytes, initialDerivedPath, initialDerivedBytes,
  stageDependencies, preservedHub, preserved, observeNative, recordPreserved,
  blockHash, stagedHuman, satisfiedReferences, mixedPaths,
}) {
  const { entries: derivedEntries, outputs: derivedOutputs, blocks: derivedBlocks, files: derivedFiles,
    catalogs: derivedCatalogs, removedBlocks, removedFiles } = derived;
  const protectedClaude = new Set(), protectedUnknownRemoved = new Set(), protectedDivergedDerived = new Set(), legacyClaudeUnverified = new Set();
  const canMigrateClaude = (path, current, replacement) => canMigrateClaudeReference({
    target: path, current, replacement, recordedHash: derivedFiles[path] ?? previous?.files[path],
    blocked: installedState?.blocks?.[path] || derivedBlocks[path] || removedBlocks.includes(path) || Object.hasOwn(removedFiles, path),
  });
  function observeClaudeMigration(path) {
    const inputs = synchronized.claudeRuleInputs.get(path);
    if (!inputs?.length) fail('E_CHANGED', `Missing rule inputs for: ${path}`);
    stageDependencies.set(initialStatePath, initialStateBytes ? hash(initialStateBytes) : null);
    stageDependencies.set(initialDerivedPath, initialDerivedBytes ? hash(initialDerivedBytes) : null);
    for (const [input, usedBytes] of inputs) {
      const current = read(target, input);
      if (!usedBytes || preservedHub.has(input) && !sameBytes(current, usedBytes)) fail('E_CHANGED', `Rule input changed while planning: ${input}`);
      const digest = current ? hash(current) : null;
      if (stageDependencies.has(input) && stageDependencies.get(input) !== digest) fail('E_CHANGED', `Rule input changed while planning: ${input}`);
      stageDependencies.set(input, digest);
    }
  }
  for (const path of unknownRemovedFiles) {
    if (desired.has(path)) protectedUnknownRemoved.add(path);
  }
  for (const [path, content] of desired) {
    if (!nativeMarkdown(path) || canonicalEntrypoint(path)) continue;
    const current = read(target, path);
    observeNative(path, current);
    if (!current) continue;
    // A divergent earlier direct-sync record cannot authorise extending a
    // native agent or its YAML. Preserve bytes until a person can review.
    let confirmedBlock = false;
    if (blockHash(path)) {
      try { confirmedBlock = blockDigest(path, current) === blockHash(path); } catch { /* Preserve ambiguous content. */ }
    }
    if (derivedFiles[path] && hash(current) !== derivedFiles[path]
      && !confirmedBlock) {
      observeNative(path, current);
      protectedDivergedDerived.add(path); recordPreserved(path, 'derived-file-diverged');
      desired.delete(path); continue;
    }
    const legacyMatch = path.match(/^\.claude\/rules\/([a-z0-9-]+)\/RULE\.md$/);
    const sourcePath = legacyMatch ? `.pbai4devs/rules/${legacyMatch[1]}/RULE.md` : null;
    const actualSource = sourcePath && read(target, sourcePath), stagedSource = sourcePath && read(stage, sourcePath);
    if (legacyMatch && actualSource && stagedSource?.equals(actualSource)
      && isLegacyExact(actualSource, current, content, legacyMatch[1])
      && !stagedContains(target, stagedHuman, path) && !stagedContains(target, stagedHuman, sourcePath)
      && !previous?.files?.[path] && !previous?.blocks?.[path] && !derivedFiles[path] && !derivedBlocks[path]
      && !derivedEntries[path] && !derivedOutputs[path] && !derivedCatalogs[path]
      && !removedBlocks.includes(path) && !Object.hasOwn(removedFiles, path)) {
      observeNative(sourcePath, actualSource); stageDependencies.set(sourcePath, hash(actualSource)); stageDependencies.set(path, hash(current));
      recordPreserved(path, 'legacy-claude-scope-unverified'); satisfiedReferences.add(path); legacyClaudeUnverified.add(path); desired.delete(path); continue;
    }
    const known = [previous?.files[path], derivedFiles[path]].some(digest => digest && digest === hash(current));
    if (known) {
      if (path.startsWith('.claude/rules/') && !current.equals(content)) {
        if (canMigrateClaude(path, current, content)) observeClaudeMigration(path);
        else {
          protectedClaude.add(path); recordPreserved(path, 'claude-metadata-unverified'); desired.delete(path);
        }
      }
      continue;
    }
    if (path.startsWith('.claude/rules/')) {
      protectedClaude.add(path); recordPreserved(path, 'claude-scope-preserved');
      desired.delete(path);
      continue;
    }
    // A reference whose only difference is CRLF already satisfies the new
    // output. Preserve its bytes and avoid appending a duplicate block; this
    // comparison neither adopts the file nor permits its replacement.
    if (!installedState?.blocks?.[path]
      && !derivedFiles[path] && !derivedBlocks[path] && !derivedEntries[path] && !derivedOutputs[path] && !derivedCatalogs[path]
      && !removedBlocks.includes(path) && !Object.hasOwn(removedFiles, path)) {
      const text = current.toString('utf8'), normalized = Buffer.from(text.replaceAll('\r\n', '\n'));
      if (text.includes('\r\n') && Buffer.from(text).equals(current) && normalized.equals(content)
        && (!installedState?.files?.[path] || hash(normalized) === installedState.files[path])) {
        const match = normalized.toString('utf8').match(/(?:^|\n)Leia e siga \[origem\]\(([^)\r\n]+)\)\.\n?$/);
        let sourcePath;
        try { if (match) sourcePath = posix.normalize(posix.join(posix.dirname(path), decodeURIComponent(match[1]))); } catch { /* Ambiguous references remain on the normal preservation path. */ }
        if (sourcePath && /^\.pbai4devs\/(?:skills|agents|commands|rules)\/.+\/(?:SKILL|AGENT|COMMAND|RULE)\.md$/.test(sourcePath)) {
          const sourceBytes = read(target, sourcePath);
          if (preservedHub.has(sourcePath) && !sameBytes(sourceBytes, read(stage, sourcePath))) fail('E_CHANGED', `Source changed while planning: ${sourcePath}`);
          stageDependencies.set(path, hash(current));
          stageDependencies.set(sourcePath, sourceBytes ? hash(sourceBytes) : null);
          recordPreserved(path, 'existing-reference-satisfied');
          satisfiedReferences.add(path); desired.delete(path); continue;
        }
      }
    }
    // Exact bytes satisfy discovery without transferring ownership.
    if (!installedState?.files?.[path] && !installedState?.blocks?.[path]
      && !derivedFiles[path] && !derivedBlocks[path] && !derivedEntries[path] && !derivedOutputs[path] && !derivedCatalogs[path] && !removedBlocks.includes(path)
      && !Object.hasOwn(removedFiles, path) && current.equals(content)) {
      recordPreserved(path, 'existing-reference-satisfied');
      satisfiedReferences.add(path); desired.delete(path); continue;
    }
    if (nativeZcodeAgent(path)) {
      recordPreserved(path, 'zcode-agent-preserved'); desired.delete(path); continue;
    }
    const source = content.toString('utf8'), marker = '<!-- gerado: sincronizar-agentes -->';
    const index = source.indexOf(marker);
    if (index < 0) fail('E_TEMPLATE', `Missing reference marker: ${path}`);
    const body = source.slice(index + marker.length).trim();
    const merged = mergeManagedContent(current, body, { expectedHash: blockHash(path) });
    desired.set(path, Buffer.from(merged.text)); mixedPaths.add(path); recordPreserved(path, 'existing-file-extended');
  }
  // Native discovery manifests must not advertise resources omitted at a human boundary.
  const overlapsPreserved = path => [...preserved.keys()].some(kept => !mixedPaths.has(kept) && !satisfiedReferences.has(kept) && (path === kept || path.startsWith(`${kept}/`) || kept.startsWith(`${path}/`)));
  for (const [path, content] of desired) if (/^\.agents\/(skills|rules|agents)\.json$/.test(path)) {
    const discovery = JSON.parse(content);
    discovery.entries = discovery.entries.filter(entry => !overlapsPreserved(entry.path));
    desired.set(path, Buffer.from(`${JSON.stringify(discovery, null, 2)}\n`));
  }
  const projectionConflicts = [...protectedClaude, ...protectedUnknownRemoved, ...protectedDivergedDerived];
  return { projectionConflicts, legacyClaudeUnverified, canMigrateClaude, observeClaudeMigration, overlapsPreserved };
}
