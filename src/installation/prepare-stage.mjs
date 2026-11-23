import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { writeAdapterManifest } from '../adapters/index.mjs';
import { packageRoot } from '../config.mjs';
import { hash, fail, safePath, write, read, copyResources, sameBytes } from './filesystem.mjs';
import { stagedContains } from './git-index.mjs';
import { actualStatePath } from './state.mjs';

const syncUpgrade = path => Object.assign(new Error(`The installed synchronization format needs review: ${path}`), { code: 'E_UPGRADE', syncPath: path });

export function prepareInstallationStage({
  target, stage, mode, active, selected, previous, previousBlocks, derived,
  initialStatePath, initialDerivedPath, initialStateBytes, initialDerivedBytes, stageDependencies,
  stagedHuman, preserveNative, recordPreserved, observeNative, outputBlocked, synchronizeStage,
}) {
  const { entries: derivedEntries, outputs: derivedOutputs, blocks: derivedBlocks, files: derivedFiles,
    catalogs: derivedCatalogs, config: derivedConfig, removedBlocks, removedFiles } = derived;
  const existing = copyResources(join(target, '.pbai4devs'), join(stage, '.pbai4devs'));
  const bundled = mode === 'init' || mode === 'update' ? copyResources(join(packageRoot, '.pbai4devs'), join(stage, '.pbai4devs')) : [];
  if (mode === 'init' || mode === 'update') {
    const license = read(packageRoot, 'LICENSE');
    if (!license?.length) fail('E_LICENSE', 'The AgentDevKit package is missing its LICENSE.');
    write(stage, '.pbai4devs/LICENSE', license);
    bundled.push('LICENSE');
  }
  const supplied = new Set(bundled);
  const internal = new Set(['catalog.json', 'skills.json', 'agents.json', 'rules.json', 'espelhos.conf', '.gitignore', 'state/README.md', 'estado/README.md']);
  // A pathname, matching contents, or --force alone do not establish that a
  // project's hub source belongs to the kit. Restore human files *before*
  // deriving native pointers so that the staged catalogue describes the
  // source that will actually remain in the project.
  const preservedHub = new Set();
  for (const relative of existing) {
    const path = `.pbai4devs/${relative}`;
    if (internal.has(relative)) continue;
    const current = read(target, path);
    if (!current || previous?.files?.[path] === hash(current) && !stagedContains(target, stagedHuman, path)) continue;
    if (supplied.has(relative)) write(stage, path, current);
    preservedHub.add(path);
    recordPreserved(path, stagedContains(target, stagedHuman, path) ? 'staged-content-differs' : previous?.files?.[path] ? 'edited-managed-file' : 'existing-file');
  }
  if (!active.roots.length || active.skillRoots.length) {
    const runtime = ['scripts/lib/adapters.mjs', 'scripts/sincronizar-agentes/SCRIPT.mjs'];
    for (const relative of runtime) {
      const path = `.pbai4devs/${relative}`;
      const script = read(stage, path);
      if (!script?.toString('utf8').split(/\r?\n/).includes('// agentdevkit-manifest: selective-clients-v1')) {
        throw syncUpgrade(path);
      }
      if (!supplied.has(relative) || preservedHub.has(path)) stageDependencies.set(path, hash(script));
    }
    if (active.skillRoots.length) {
      const relative = 'templates/clients/ADAPTERS.json', path = `.pbai4devs/${relative}`;
      const policy = read(stage, path);
      const current = policy && JSON.parse(policy).adapters?.find(adapter => adapter.id === 'codex');
      if (!current || current.skillFallback !== '.agents' || !Array.isArray(current.requires) || current.requires.includes('antigravity')) {
        throw syncUpgrade(path);
      }
      if (!supplied.has(relative) || preservedHub.has(path)) stageDependencies.set(path, hash(policy));
    }
  }
  if (bundled.length) for (const [path, digest] of Object.entries(previous?.files || {})) {
    if (!path.startsWith('.pbai4devs/') || supplied.has(path.slice(11)) || internal.has(path.slice(11))) continue;
    const current = read(target, path);
    if (current && (digest !== hash(current) || stagedContains(target, stagedHuman, path))) {
      preservedHub.add(path);
      recordPreserved(path, stagedContains(target, stagedHuman, path) ? 'staged-content-differs' : 'edited-managed-file');
    } else rmSync(safePath(stage, path), { force: true });
  }
  for (const root of active.roots) {
    if (preserveNative(`${root}/.gitignore`)) continue;
    const content = read(target, `${root}/.gitignore`);
    if (content) write(stage, `${root}/.gitignore`, content);
  }
  const ownIgnore = read(target, '.pbai4devs/.gitignore');
  if (ownIgnore) write(stage, '.pbai4devs/.gitignore', ownIgnore);
  writeAdapterManifest(stage, { clients: selected });
  // Supply the already-validated ownership records to the private stage so
  // the synchronizer can distinguish an owned ignore block from a user's.
  // These temporary records never replace or bypass checks on the target.
  const stagingState = '.pbai4devs/state/agentdevkit.json', stagingDerived = '.pbai4devs/state/derived.json';
  if (previous) write(stage, stagingState, JSON.stringify(previous));
  if (Object.keys(derivedEntries).length || Object.keys(derivedOutputs).length || Object.keys(derivedBlocks).length || Object.keys(derivedFiles).length || Object.keys(derivedCatalogs).length || derivedConfig || removedBlocks.length || Object.keys(removedFiles).length) {
    write(stage, stagingDerived, JSON.stringify({ schemaVersion: 1, entries: derivedEntries, outputs: derivedOutputs, blocks: derivedBlocks, files: derivedFiles, catalogs: derivedCatalogs, ...(derivedConfig ? { config: derivedConfig } : {}), removedBlocks, removedFiles: {} }));
  }
  // A read-only preview identifies catalogued destinations using exactly
  // the synchronizer's own selected layouts, including native exceptions.
  const candidates = Object.keys(derivedFiles).filter(path => {
    const old = previous?.files?.[path], later = derivedFiles[path];
    return active.roots.some(root => path.startsWith(root + '/')) && old && old !== later
      && !previousBlocks[path] && !derivedBlocks[path]
      && !Object.hasOwn(removedFiles, path) && !removedBlocks.includes(path);
  });
  if (previous && candidates.length) {
    const preview = synchronizeStage(true);
    const conflicts = new Set(preview.conflictPaths);
    const stagedState = { ...previous, files: { ...previous.files } };
    let changed = false;
    for (const path of candidates) {
      if (!conflicts.has(path) || stagedContains(target, stagedHuman, path) || outputBlocked(path).blocked) continue;
      const current = read(target, path);
      if (!current || hash(current) !== derivedFiles[path]) continue;
      observeNative(path, current);
      if (actualStatePath(target) !== initialStatePath
        || !sameBytes(read(target, initialStatePath), initialStateBytes)
        || !sameBytes(read(target, initialDerivedPath), initialDerivedBytes)) fail('E_CHANGED', 'Stage state changed while planning.');
      stageDependencies.set(initialStatePath, initialStateBytes ? hash(initialStateBytes) : null);
      stageDependencies.set(initialDerivedPath, initialDerivedBytes ? hash(initialDerivedBytes) : null);
      stageDependencies.set(path, hash(current));
      delete stagedState.files[path]; changed = true;
    }
    if (changed) write(stage, stagingState, JSON.stringify(stagedState));
  }
  const synchronized = synchronizeStage(false);
  rmSync(join(stage, stagingState), { force: true }); rmSync(join(stage, stagingDerived), { force: true });
  return { existing, bundled, supplied, internal, preservedHub, synchronized };
}
