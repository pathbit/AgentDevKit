import { types as utilTypes } from 'node:util';
import { assertUnredirectedGitEnvironment, assertNoNestedGit, gitPathsOverlap } from '../../.pbai4devs/scripts/lib/git-environment.mjs';
import { inspectLinuxXattr, inspectMacAcl } from '../../.pbai4devs/scripts/lib/xattr-probe.mjs';
import { fileOwnerIssue } from '../../.pbai4devs/scripts/lib/file-owner.mjs';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createPrivateSyncStage, synchronizePrivateStage, isReference } from '../../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { legacyClaudeGitSource } from '../../.pbai4devs/scripts/lib/claude-legacy-exact.mjs';
import { planLocalIgnore, checkLocalIgnore, planUntrack } from '../../.pbai4devs/scripts/lib/gitignore.mjs';
import { nativePathBoundary } from '../../.pbai4devs/scripts/lib/native-paths.mjs';
import { inspectMacWriteProtection, nativeMetadataCopySupported } from '../../.pbai4devs/scripts/lib/native-metadata.mjs';
import { mayReferenceClaudeRule, resemblesClaudeReference, scanRetainedClaude } from '../../.pbai4devs/scripts/lib/claude-retained.mjs';
import { canonicalEntrypoint, resolveEntrypoint, entrypointReference, renderEntrypointImports, extractManagedBlock, mergeManagedContent, stripManagedContent } from '../../.pbai4devs/scripts/lib/managed-content.mjs';
import { extractTomlManagedBlock, stripTomlContent } from '../../.pbai4devs/scripts/lib/managed-toml.mjs';
import { adapterRoots, normalizeClients, resolveAdapters, changeClientSelection } from '../adapters/index.mjs';
import { packageRoot, statePath, legacyStatePath, entryNames, begin, end } from '../config.mjs';
import { text } from '../i18n.mjs';
import { hash, fail, stat, ignored, safePath, nativeOutputBoundary, walk, write, read, sameBytes } from './filesystem.mjs';
import { stagedDivergences, stagedContains } from './git-index.mjs';
import { nativeToml, nativeManagedText, allowsStagedBlock, extractBlock, blockDigest, replacedIgnoreBlocks, entryContent, diagnosePreservedDerivedToml } from './ownership.mjs';
import { loadState, actualStatePath, readDerivedState } from './state.mjs';
import { legacyStateMigration } from './legacy-state.mjs';
import { prepareInstallationStage } from './prepare-stage.mjs';
import { planStateRecords } from './plan-state.mjs';
import { cleanupInstallationStage } from './stage-cleanup.mjs';
import { reconcileNativeOutputs } from './native-outputs.mjs';

export function planInstallation({ target, language = 'pt', mode = 'init', force = false, clients, clientChange }) {
  assertUnredirectedGitEnvironment();
  const initialStatePath = actualStatePath(target);
  const initialDerivedPath = initialStatePath.replace(/agentdevkit\.json$/, 'derived.json');
  const initialStateBytes = read(target, initialStatePath), initialDerivedBytes = read(target, initialDerivedPath);
  const stageDependencies = new Map();
  // Reconcile the recorded IDs against the canonical selection for this plan.
  let previous = loadState(target, { rawClients: true });
  const installedState = previous;
  const migration = legacyStateMigration(target);
  // A migration must update the installed scripts and pointers in the same
  // transaction; a plain sync/agents/lang would leave old hard-coded paths.
  if (migration && !['init', 'update'].includes(mode)) fail('E_UPGRADE', 'Run AgentDevKit update before migrating the legacy state directory.');
  if (mode !== 'init' && !previous) fail('E_MISSING', text(language, 'missing'));
  const registered = previous ? normalizeClients(previous.clients, { stored: true }) : ['none'];
  if (clientChange && !registered.length) fail('E_CLIENTS_RETIRED', 'Choose a selection explicitly with update --agents.');
  const requested = clients === undefined ? registered : normalizeClients(clients);
  const selected = clientChange ? changeClientSelection(registered, clientChange, requested) : requested;
  if (clientChange) {
    if (actualStatePath(target) !== initialStatePath || !sameBytes(read(target, initialStatePath), initialStateBytes)) {
      fail('E_CHANGED', 'The saved client selection changed while planning.');
    }
    stageDependencies.set(initialStatePath, initialStateBytes ? hash(initialStateBytes) : null);
  }
  if (!selected.length) fail('E_CLIENTS_RETIRED', 'Choose a supported client with update --agents after reviewing the plan.');
  const active = resolveAdapters(selected);
  const changingClients = clients !== undefined || mode === 'agents';
  const ownedEntrypoints = new Set(), mixedPaths = new Set(), satisfiedReferences = new Set(), nativeInputs = new Map();
  const observeNative = (path, content) => {
    if (nativeInputs.has(path)) {
      const original = nativeInputs.get(path);
      if (original === null ? content !== null : !content?.equals(original)) fail('E_CHANGED', `File changed while planning: ${path}`);
    } else nativeInputs.set(path, content);
  };
  const derived = readDerivedState(target);
  const { entries: derivedEntries, outputs: derivedOutputs, blocks: derivedBlocks, files: derivedFiles, catalogs: derivedCatalogs, config: derivedConfig, removedBlocks, removedFiles } = derived;
  const removalDiagnostics = Object.keys(removedFiles).filter(path => !Object.hasOwn(installedState?.files ?? {}, path))
    .sort().map(path => ({ code: 'removed-file-unverified', path }));
  const unknownRemovedFiles = new Set(removalDiagnostics.map(item => item.path));
  const derivedConfigFiles = derivedConfig ? { '.pbai4devs/espelhos.conf': derivedConfig } : {};
  if (previous) previous = { ...previous, files: Object.fromEntries(Object.entries(previous.files).filter(([path, digest]) => removedFiles[path] !== digest)) };
  const previousBlocks = Object.fromEntries(Object.entries(previous?.blocks || {}).filter(([path]) => !removedBlocks.includes(path)));
  const knownBlocks = { ...previousBlocks, ...derivedBlocks };
  const ownedPaths = [...Object.keys(previous?.files || {}), ...Object.keys(previousBlocks), ...Object.keys(derivedEntries), ...Object.keys(derivedOutputs), ...Object.keys(derivedBlocks), ...Object.keys(derivedFiles), ...Object.keys(derivedCatalogs), ...Object.keys(derivedConfigFiles)];
  const entryPaths = new Map(entryNames.map(name => [name, resolveEntrypoint(target, name)]));
  const blockHash = path => knownBlocks[path]
    ?? (canonicalEntrypoint(path) ? Object.entries(knownBlocks).find(([candidate]) => canonicalEntrypoint(candidate) === canonicalEntrypoint(path))?.[1] : undefined);
  const preserved = new Map();
  const recordPreserved = (path, reason) => { preserved.set(path, { path, reason }); return true; };
  const fallbackChecks = new Map();
  let outputBoundaryFailure, outputBoundaryMayHaveStageEffects = true;
  const outputBlocked = (path, context) => {
    try {
    const result = nativeOutputBoundary(target, path, ownedPaths);
    if (fallbackChecks.has(path) && JSON.stringify(fallbackChecks.get(path)) !== JSON.stringify(result)) fail('E_CHANGED', `Skill route changed while planning: ${path}`);
    fallbackChecks.set(path, result);
    if (result.blocked) recordPreserved(result.path, result.reason);
    return result;
    } catch (cause) {
      // Preserve the cause, but never expose arbitrary messages or paths.
      let truncated = false;
      const data = (object, key) => {
        try {
          if ((typeof object !== 'object' || object === null) && typeof object !== 'function') return undefined;
          if (utilTypes.isProxy(object)) { truncated = true; return undefined; }
          const d = Object.getOwnPropertyDescriptor(object, key);
          if (!d) return undefined;
          if (!Object.hasOwn(d, 'value')) { truncated = true; return undefined; }
          return d.value;
        } catch { truncated = true; return undefined; }
      };
      // A callback may throw an arbitrary object, including one with a Proxy
      // prototype. Inspect only its own code; never traverse its prototype or
      // infer a primary cause from an untrusted errors property.
      const allowed = new Set(['EACCES', 'EPERM', 'EIO', 'ENOENT', 'ENOTDIR', 'ELOOP', 'EEXIST', 'EISDIR', 'EMFILE', 'ENFILE', 'ENAMETOOLONG', 'ESTALE', 'ETIMEDOUT', 'E_CHANGED', 'E_PATH', 'E_SYMLINK', 'E_GIT', 'E_NESTED_GIT', 'E_PROTECTED_METADATA', 'E_METADATA_UNSUPPORTED']);
      const candidate = data(cause, 'code');
      const code = typeof candidate === 'string' && allowed.has(candidate) ? candidate : undefined;
      if (!code) truncated = true;
      const reported = new Error('Unable to inspect project output; review the project path.', { cause });
      if (code) reported.code = code;
      if (truncated) reported.diagnosticsTruncated = true;
      outputBoundaryMayHaveStageEffects = context?.stageMayHaveEffects !== false;
      outputBoundaryFailure = reported;
      throw reported;
    }
  };
  const stagedHuman = stagedDivergences(target);
  const native = path => canonicalEntrypoint(path) || path === 'README.md' || adapterRoots.some(root => path === root || path.startsWith(`${root}/`));
  const boundary = path => {
    if (!native(path)) return false;
    const found = nativePathBoundary(target, path, ownedPaths, { preserveRootAliases: path === 'README.md' });
    return found ? recordPreserved(found.path, found.reason) : false;
  };
  const owned = path => ownedPaths.includes(path);
  const generatedReference = content => Boolean(content && isReference(content.toString('utf8'))
    && (content.toString('utf8').split(/\r?\n/).includes('<!-- gerado: sincronizar-agentes -->') || content.toString('utf8').startsWith('# gerado: sincronizar-agentes\n')));
  const preserveNative = path => {
    if (!native(path)) return false;
    if (boundary(path)) return true;
    const item = stat(safePath(target, path));
    if (!item) { observeNative(path, null); return false; }
    const current = item.isFile() ? read(target, path) : null;
    if (item.isFile()) observeNative(path, current);
    if (owned(path)) return false;
    if (!item.isFile() && ownedPaths.some(value => value.startsWith(`${path}/`))) fail('E_PATH', `Managed subtree occupies a file destination: ${path}`);
    if (item.isFile()) {
      if (nativeManagedText(path)) return false;
      if (generatedReference(current)) return false;
      if (path.endsWith('/.gitignore') && current.toString('utf8').split(/\r?\n/).some(line => ['# BEGIN AGENT IGNORE', '# END AGENT IGNORE'].includes(line))) return false;
    }
    return recordPreserved(path, item.isFile() ? 'existing-file' : 'existing-directory');
  };
  const stageHandle = createPrivateSyncStage();
  const stage = stageHandle.path;
  let stageSyncError, stageFailure, stageSyncFailed = false, stageFailed = false;
  try {
    const synchronizeStage = check => {
      try {
        return synchronizePrivateStage({
          root: stage, ...(check ? { check } : {}), force: true, localIgnores: false,
          generateEntrypoints: false, recordDerivedState: false, outputBlocked, output() {},
        }, stageHandle);
      } catch (error) { stageSyncError = error; stageSyncFailed = true; throw error; }
    };
    const { existing, bundled, supplied, internal, preservedHub, synchronized } = prepareInstallationStage({
      target, stage, mode, active, selected, previous, previousBlocks, derived,
      initialStatePath, initialDerivedPath, initialStateBytes, initialDerivedBytes, stageDependencies,
      stagedHuman, preserveNative, recordPreserved, observeNative, outputBlocked, synchronizeStage,
    });
    for (const canonical of active.entrypoints) {
      const name = entryPaths.get(canonical);
      if (preserveNative(name)) continue;
      const current = read(target, name), template = readFileSync(join(packageRoot, '.pbai4devs/templates/entrypoints', canonical), 'utf8');
      observeNative(name, current);
      const legacy = entryContent(null, template, language, canonical);
      const content = renderEntrypointImports(target, legacy.replace(`${begin}\n`, '').replace(`\n${end}`, ''));
      const knownFile = current && (previous?.files[name] === hash(current) || derivedEntries[name] === hash(current));
      const knownLegacy = current && previous?.blocks[name] && current.toString('utf8') === entryContent(null, template, previous.language, canonical);
      if (!current || knownFile || knownLegacy) { write(stage, name, content); ownedEntrypoints.add(name); }
      else {
        const body = entrypointReference(target, canonical);
        const merged = mergeManagedContent(current, body, { expectedHash: blockHash(name) });
        write(stage, name, merged.text); mixedPaths.add(name); recordPreserved(name, 'existing-file-extended');
      }
    }
    if (!preserveNative('README.md') && !read(target, 'README.md')) write(stage, 'README.md', `---\ndescription: ${JSON.stringify(text(language, 'readme'))}\nlanguage: ${language}\n---\n\n# ${text(language, 'project')}\n\n${text(language, 'readme')}\n`);
    if (!existsSync(join(stage, '.pbai4devs/state/README.md'))) write(stage, '.pbai4devs/state/README.md', `---\ndescription: AgentDevKit state.\n---\n\n# AgentDevKit\n\n${text(language, 'state')}\n`);
    const unknown = new Set(existing.filter(path => !supplied.has(path) && !previous?.files[`.pbai4devs/${path}`] && !internal.has(path)));
    const paths = walk(stage, '', path => !path.split('/').includes('.agent-tests')).filter(path => !path.startsWith('.pbai4devs/') || !unknown.has(path.slice(11)));
    const desired = new Map(paths.filter(path => {
      if (preserveNative(path)) return false;
      if (path.endsWith('/.gitignore') && read(target, path) && !previous?.files[path] && !previous?.blocks[path] && !derivedBlocks[path]) {
        recordPreserved(path, 'existing-ignore'); return false;
      }
      return true;
    }).map(path => [path, readFileSync(join(stage, path))]));
    const migratedHuman = new Set();
    for (const item of migration?.files || []) {
      if (item.path === legacyStatePath) continue;
      if (item.path === '.pbai4devs/estado/README.md') {
        const managed = previous?.files?.[item.path] === hash(item.content);
        const matchesTemplate = desired.get(item.target)?.equals(item.content);
        desired.set(item.target, item.content);
        if (!managed || !matchesTemplate) { recordPreserved(item.target, 'existing-file'); migratedHuman.add(item.target); }
        continue;
      }
      if (desired.has(item.target)) fail('E_STATE', `State migration collides with a managed file: ${item.target}`);
      desired.set(item.target, item.content);
      migratedHuman.add(item.target);
    }
    // Preserve human README content; verified managed files may be updated.
    const stateReadme = '.pbai4devs/state/README.md';
    const currentStateReadme = read(target, stateReadme);
    if (currentStateReadme && previous?.files?.[stateReadme] !== hash(currentStateReadme)) {
      desired.set(stateReadme, currentStateReadme);
      migratedHuman.add(stateReadme);
      recordPreserved(stateReadme, 'existing-file');
    }
    const { projectionConflicts, legacyClaudeUnverified, canMigrateClaude, observeClaudeMigration, overlapsPreserved } = reconcileNativeOutputs({
      target, stage, desired, previous, installedState, derived, unknownRemovedFiles,
      synchronized, initialStatePath, initialStateBytes, initialDerivedPath, initialDerivedBytes,
      stageDependencies, preservedHub, preserved, observeNative, recordPreserved,
      blockHash, stagedHuman, satisfiedReferences, mixedPaths,
    });
    const { manifest, derivedPath, derivedBytes } = planStateRecords({
      target, desired, mode, language, bundled, previous, installedState, clients,
      selected, migration, changingClients, derived, derivedConfigFiles, unknownRemovedFiles,
      migratedHuman, preservedHub, mixedPaths, preserved, synchronized, stagedHuman, observeNative,
    });
    const changes = [], conflicts = projectionConflicts;
    const aliasedEntrypoint = path => canonicalEntrypoint(path) && entryPaths.get(canonicalEntrypoint(path)) !== path;
    const generatedInternal = new Set(['.pbai4devs/catalog.json', '.pbai4devs/skills.json', '.pbai4devs/agents.json', '.pbai4devs/rules.json', '.pbai4devs/espelhos.conf']);
    for (const [path, content] of desired) {
      const current = read(target, path);
      if (nativeInputs.has(path) && (nativeInputs.get(path) === null ? current !== null : !current?.equals(nativeInputs.get(path)))) fail('E_CHANGED', `File changed while planning: ${path}`);
      const wholeFileOwned = current && [previous?.files[path], derivedOutputs[path], derivedEntries[path], derivedFiles[path], derivedCatalogs[path], derivedConfigFiles[path]].some(digest => digest && digest === hash(current));
      const existingBlock = current && (nativeManagedText(path) || canonicalEntrypoint(path) || path.endsWith('/.gitignore')) ? blockDigest(path, current) : null;
      if (existingBlock && !wholeFileOwned && knownBlocks[path] !== existingBlock) conflicts.push(path);
      if (current?.equals(content)) {
        // Identical bytes do not prove ownership of a pre-existing catalogue.
        // Refuse adoption: a later sync could otherwise overwrite user data.
        if (!wholeFileOwned && (generatedInternal.has(path) || native(path) && !existingBlock && !mixedPaths.has(path) && !preserved.has(path))) conflicts.push(path);
        continue;
      }
      const managed = path === derivedPath && derivedBytes && current?.equals(derivedBytes)
        || [previous?.files[path], derivedOutputs[path], derivedEntries[path], derivedFiles[path], derivedCatalogs[path], derivedConfigFiles[path]].some(digest => digest && hash(current || '') === digest)
        || knownBlocks[path] && blockDigest(path, current || Buffer.alloc(0)) === knownBlocks[path];
      const appendBlock = mixedPaths.has(path) || canonicalEntrypoint(path) || path === '.gitignore' || path.endsWith('/.gitignore');
      const conflict = current && path !== statePath && !managed && !appendBlock;
      const changedBlock = current && knownBlocks[path] && !managed;
      if (conflict || changedBlock) conflicts.push(path);
      const migrated = migration?.files.find(item => item.target === path);
      changes.push({ path, action: current ? 'update' : 'create', content, beforeHash: current ? hash(current) : null, ...(migrated ? { mode: migrated.mode } : {}) });
    }
    const retiredClaude = new Set();
    const wholeRecords = [previous?.files || {}, derivedEntries, derivedFiles];
    for (const path of new Set(wholeRecords.flatMap(record => Object.keys(record)))) if (!desired.has(path)) {
      if (preserved.get(path)?.reason === 'zcode-agent-preserved') continue;
      if (path === '.gitignore' || path.endsWith('/.gitignore')) { if (read(target, path)) recordPreserved(path, 'existing-ignore'); continue; }
      if (migration && path.startsWith('.pbai4devs/estado/')) continue;
      if (path === '.gitignore') { recordPreserved(path, 'project-owned'); continue; }
      if (aliasedEntrypoint(path)) continue;
      if (path.startsWith('.claude/rules/')) {
        if (synchronized.claudeRetiredTargets?.some(item => item.target === path)) continue;
        if (boundary(path) || read(target, path)) { if (active.roots.includes('.claude')) conflicts.push(path); recordPreserved(path, 'claude-metadata-unverified'); }
        continue;
      }
      const current = read(target, path); if (!current) continue;
      const known = wholeRecords.some(record => record[path] === hash(current));
      if (stagedContains(target, stagedHuman, path)) { recordPreserved(path, 'staged-content-differs'); continue; }
      if (!known) { recordPreserved(path, 'edited-managed-file'); continue; }
      changes.push({ path, action: 'remove', content: null, beforeHash: hash(current) });
    }
    for (const [recordedPath, digest] of Object.entries(knownBlocks)) {
      if (migration && recordedPath.startsWith('.pbai4devs/estado/')) continue;
      const path = canonicalEntrypoint(recordedPath) ? entryPaths.get(canonicalEntrypoint(recordedPath)) : recordedPath;
      if (desired.has(path)) continue;
      if (changes.some(change => change.path === path)) continue;
      if (preserved.get(path)?.reason === 'zcode-agent-preserved') continue;
      if (unknownRemovedFiles.has(path)) { recordPreserved(path, 'removed-file-unverified'); continue; }
      if (path === '.gitignore' || path.endsWith('/.gitignore')) { if (read(target, path)) recordPreserved(path, 'existing-ignore'); continue; }
      if (path.startsWith('.claude/rules/')) {
        if (boundary(path) || read(target, path)) { if (active.roots.includes('.claude')) conflicts.push(path); recordPreserved(path, 'claude-metadata-unverified'); }
        continue;
      }
      const current = read(target, path); if (!current) continue;
      const source = current.toString('utf8');
      const block = path.endsWith('/.gitignore') ? extractBlock(source, '# BEGIN AGENT IGNORE', '# END AGENT IGNORE') : nativeToml(path) ? extractTomlManagedBlock(current) : extractManagedBlock(current);
      if (!block || blockDigest(path, current) !== digest) conflicts.push(path);
      if (!block) continue;
      let content = path.endsWith('/.gitignore') ? source.replace(block, '') : (nativeToml(path) ? stripTomlContent : stripManagedContent)(current, digest);
      let removable = path.endsWith('/.gitignore') && !content.trim();
      if (canonicalEntrypoint(path)) {
        const template = readFileSync(join(packageRoot, '.pbai4devs/templates/entrypoints', canonicalEntrypoint(path)), 'utf8');
        if (source === entryContent(null, template, previous?.language || language, canonicalEntrypoint(path))) { content = ''; removable = true; }
      }
      changes.push({ path, action: removable ? 'remove' : 'update', content: removable ? null : Buffer.from(content), beforeHash: hash(current) });
    }
    const claudeScopeBoundaries = new Set();
    for (const omission of synchronized.claudeRetiredTargets || []) {
      const path = omission.target;
      if (boundary(path)) { claudeScopeBoundaries.add(path); continue; }
      const item = stat(safePath(target, path));
      if (item && !item.isFile()) {
        recordPreserved(path, item.isDirectory() ? 'existing-directory' : 'non-file');
        if (active.roots.includes('.claude') && ['update', 'sync'].includes(mode)) conflicts.push(path);
        claudeScopeBoundaries.add(path);
        continue;
      }
      const current = read(target, path);
      if (!current) continue;
      if (omission.source === legacyClaudeGitSource && omission.trigger === 'model_decision'
        && canMigrateClaude(path, current, null)) {
        const index = planUntrack(target, { [path]: hash(current) });
        if (!index.paths.length && !index.conflicts.length) {
          observeNative(path, current);
          observeClaudeMigration(path);
          retiredClaude.add(path);
          changes.push({ path, action: 'remove', content: null, beforeHash: hash(current) });
          continue;
        }
      }
      conflicts.push(path); recordPreserved(path, 'claude-scope-preserved');
    }
    function nativeFiles(root) {
      if (boundary(root)) return [];
      const directory = stat(safePath(target, root));
      if (!directory?.isDirectory()) return [];
      const files = [];
      const visit = folder => {
        for (const name of readdirSync(safePath(target, folder)).sort()) {
          const path = `${folder}/${name}`;
          if (boundary(path)) continue;
          const info = stat(safePath(target, path));
          if (path.split('/').some(part => ignored.has(part))) continue;
          if (info?.isDirectory()) visit(path);
          else if (info?.isFile()) files.push(path);
        }
      };
      visit(root); return files;
    }
    // Regras do cliente desmarcado são preservadas sem provar ownership.
    // Enquanto existirem, a configuração ativa é desconhecida e check/doctor
    // devem continuar sinalizando o risco, inclusive após mudar a seleção.
    const retainedClaude = active.roots.includes('.claude') ? [] : scanRetainedClaude(target);
    const retainedClaudeRules = retainedClaude.map(item => item.path);
    if (active.roots.includes('.claude')) {
      for (const path of [...claudeScopeBoundaries, ...legacyClaudeUnverified]) retainedClaudeRules.push(path);
      for (const [path, item] of preserved) {
        if ((path === '.claude' || path === '.claude/rules' || path.startsWith('.claude/rules/'))
          && ['symbolic-link', 'non-directory', 'non-file', 'existing-directory'].includes(item.reason)
        ) {
          if (!retainedClaudeRules.includes(path)) retainedClaudeRules.push(path);
          // Initial setup can preserve a pre-existing client boundary, but an
          // update must not report the rule scope as fully verified through it.
          if (path.startsWith('.claude/rules/') && ['update', 'sync'].includes(mode)) conflicts.push(path);
        }
      }
    }
    for (const item of retainedClaude) recordPreserved(item.path, item.reason);
    retainedClaudeRules.sort();
    if (active.roots.includes('.claude')) for (const item of scanRetainedClaude(target)) {
      const full = item.path;
      if (item.reason === 'claude-scan-incomplete') {
        conflicts.push(full); recordPreserved(full, item.reason); continue;
      }
      if (item.reason !== 'claude-activation-unverified') {
        if (!retainedClaudeRules.includes(full)) retainedClaudeRules.push(full);
        recordPreserved(full, item.reason); continue;
      }
      if (desired.has(full) || legacyClaudeUnverified.has(full) || retiredClaude.has(full)) continue;
      const known = [previous?.files[full], derivedFiles[full], knownBlocks[full]].some(Boolean);
      if (!known) {
        const info = stat(safePath(target, full));
        if (!info?.isFile() || info.size > 1024 * 1024) {
          if (!retainedClaudeRules.includes(full)) retainedClaudeRules.push(full);
          recordPreserved(full, 'claude-scan-incomplete'); continue;
        }
        const current = read(target, full), text = current?.toString('utf8');
        if (!current) continue;
        if (!resemblesClaudeReference(full, text)) {
          if (mayReferenceClaudeRule(full, text)) {
            if (!retainedClaudeRules.includes(full)) retainedClaudeRules.push(full);
            recordPreserved(full, 'claude-scope-unverified');
          }
          continue;
        }
      }
      conflicts.push(full); recordPreserved(full, 'claude-metadata-unverified');
    }
    retainedClaudeRules.sort();
    for (const root of changingClients ? [] : active.roots) for (const full of nativeFiles(root)) {
      const path = full.slice(root.length + 1);
      if (!['skills', 'agents', 'commands', 'rules', 'instructions', 'prompts'].includes(path.split('/')[0])) continue;
      if (desired.has(full) || changes.some(change => change.path === full)) continue;
      const current = read(target, full);
      const known = [previous?.files[full], derivedFiles[full]].some(digest => digest && digest === hash(current));
      if (preserved.has(full)) continue;
      if (!known || !generatedReference(current)) { recordPreserved(full, 'existing-file'); continue; }
      changes.push({ path: full, action: 'remove', content: null, beforeHash: hash(current) });
    }
    const legacy = '.pbai4devs/adapters/README.md', legacyRoot = '.pbai4devs/adapters';
    const legacyRootInfo = stat(join(target, legacyRoot));
    const legacyInfo = legacyRootInfo?.isDirectory() ? stat(join(target, legacy)) : null;
    if (legacyRootInfo && !legacyRootInfo.isDirectory()) recordPreserved(legacyRoot, legacyRootInfo.isSymbolicLink() ? 'symbolic-link' : 'existing-file');
    if (legacyInfo && !legacyInfo.isFile()) recordPreserved(legacy, legacyInfo.isSymbolicLink() ? 'symbolic-link' : 'existing-directory');
    const legacyContent = legacyInfo?.isFile() ? read(target, legacy) : null;
    if (legacyContent && !changes.some(change => change.path === legacy)) {
      if (!stagedContains(target, stagedHuman, legacy) && previous?.files?.[legacy] === hash(legacyContent)) changes.push({ path: legacy, action: 'remove', content: null, beforeHash: hash(legacyContent) });
      else recordPreserved(legacy, stagedContains(target, stagedHuman, legacy) ? 'staged-content-differs' : 'existing-file');
    }
    for (const item of migration?.files || []) changes.push({ path: item.path, action: 'remove', content: null, beforeHash: hash(item.content) });
    // The generated catalogues must agree with the installed sources. A staged
    // deletion has no indexed bytes to overwrite; allow their regeneration only
    // when the current file exactly matches the previously owned digest.
    const generatedCatalogues = new Set(['.pbai4devs/catalog.json', '.pbai4devs/skills.json', '.pbai4devs/agents.json', '.pbai4devs/rules.json']);
    for (const change of changes) if (change.action === 'update' && generatedCatalogues.has(change.path)
      && stagedContains(target, stagedHuman.deleted || new Set(), change.path)
      && change.beforeHash && previous?.files?.[change.path] === change.beforeHash) change.stagedDeletionAllowed = true;
    for (const change of changes) {
      if (!stagedContains(target, stagedHuman, change.path)) continue;
      const current = read(target, change.path);
      if (change.action === 'update' && allowsStagedBlock(change.path, current, change.content, knownBlocks[change.path])) change.stagedBlockAllowed = true;
      if (change.action === 'remove' && migration) {
        const item = migration.files.find(file => file.path === change.path);
        const copy = item && changes.find(candidate => candidate.path === item.target && candidate.action === 'create');
        if (item && current?.equals(item.content) && copy?.content?.equals(item.content)
          && changes.indexOf(copy) < changes.indexOf(change)) change.stagedMigrationTarget = item.target;
      }
    }
    const backupNeeded = changes.some(change => change.beforeHash !== null);
    for (const path of unknownRemovedFiles) {
      if (changes.some(change => gitPathsOverlap(change.path, path, { root: target, allowMissingTarget: true }))) {
        conflicts.push(path); if (!preserved.has(path)) recordPreserved(path, 'removed-file-unverified');
      }
    }
    const protectedGitlinks = changes.filter(change => stagedContains(target, stagedHuman.gitlinks || new Set(), change.path));
    if (backupNeeded && stagedContains(target, stagedHuman.gitlinks || new Set(), '.agent-tests/agentdevkit/backups')) fail('E_STAGED', 'Backup would be inside a Git submodule; contents are preserved.');
    if (protectedGitlinks.length) fail('E_STAGED', 'A planned change is inside a Git submodule; its contents are preserved.');
    const stagedChanges = changes.filter(change => stagedContains(target, stagedHuman, change.path) && !change.stagedDeletionAllowed && !change.stagedBlockAllowed && !change.stagedMigrationTarget);
    if (stagedChanges.length) fail('E_STAGED', `Staged content differs from the working tree for planned changes: ${stagedChanges.map(change => `${change.action} ${change.path}`).join(', ')}. Preserve and review these paths before updating.`);
    assertNoNestedGit(target, [...changes.map(change => change.path), ...(migration?.directories || []).flatMap(item => [item.path, item.path.replace(/^\.pbai4devs\/estado/, '.pbai4devs/state')])]);
    if (backupNeeded) assertNoNestedGit(target, ['.agent-tests/agentdevkit/backups']);
    const retiredRoots = adapterRoots.filter(root => !active.roots.includes(root) && changes.some(change => change.action === 'remove' && change.path.startsWith(`${root}/`) && (previous?.files[change.path] || previous?.blocks[change.path])));
    const ownedOutputs = [...new Set([...synchronized.ownedOutputs, ...ownedEntrypoints, statePath])].filter(path => !mixedPaths.has(path) && !legacyClaudeUnverified.has(path) && !overlapsPreserved(path));
    // Ignore rules affect only untracked files. Never remove existing index
    // entries on behalf of the project; staged bytes are checked separately.
    const untrack = { root: target, paths: [], hashes: {}, index: '', conflicts: [] };
    const localIgnore = planLocalIgnore(target, { outputs: ownedOutputs, templateRoot: stage });
    const localIgnoreCheck = checkLocalIgnore(localIgnore, { replacedBlocks: replacedIgnoreBlocks(target, changes, previous) });
    conflicts.push(...(untrack?.conflicts || []), ...localIgnoreCheck.missing);
    const derivedFileDiagnostics = diagnosePreservedDerivedToml(derivedFiles, preserved, knownBlocks, path => read(target, path));
    const hardlinkBlockers = changes.flatMap(change => {
      const info = stat(safePath(target, change.path));
      if (!info?.isFile()) return [];
      if (!Number.isSafeInteger(info.nlink) || info.nlink < 1) return [{ path: change.path, code: 'hardlink-unverified' }];
      return info.nlink > 1 ? [{ path: change.path, code: 'hardlink-shared' }] : [];
    });
    const ownerBlockers = changes.flatMap(change => {
      const issue = fileOwnerIssue(stat(safePath(target, change.path)));
      return issue ? [{ path: change.path, code: issue }] : [];
    });
    const aclBlockers = process.platform === 'darwin' ? changes.flatMap(change => {
      const file = safePath(target, change.path), info = stat(file);
      if (!info?.isFile()) return [];
      const acl = inspectMacAcl(file);
      const safeUpdate = change.action === 'update' && nativeMetadataCopySupported
        && acl === 'present' && inspectMacWriteProtection(file) === 'clear';
      return acl === 'empty' || safeUpdate ? [] : [{ path: change.path, code: acl === 'present' ? 'acl-present' : 'acl-unverified' }];
    }) : [];
    const linuxXattrChecks = process.platform === 'linux' ? changes.flatMap(change => {
      const file = safePath(target, change.path), info = stat(file);
      return info?.isFile() ? [{ path: change.path, action: change.action, status: inspectLinuxXattr(file) }] : [];
    }) : [];
    const xattrBlockers = linuxXattrChecks.filter(item => item.status === 'present'
      && !(item.action === 'update' && nativeMetadataCopySupported)).map(item => ({ path: item.path, code: 'xattr-present' }));
    const xattrUnverified = linuxXattrChecks.filter(item => item.status !== 'present').map(item => item.path);
    // A conflict means ownership or the managed bytes could not be proven.
    // Backups do not authorize replacing user content, even with --force.
    return { target, language, mode, clients: selected, changes, stageDependencies: [...stageDependencies].map(([path, expectedHash]) => ({ path, expectedHash })), conflicts: [...new Set(conflicts)].sort(), canApply: !conflicts.length && !untrack?.conflicts?.length && !localIgnoreCheck.missing.length && !hardlinkBlockers.length && !ownerBlockers.length && !aclBlockers.length && !xattrBlockers.length, hardlinkBlockers, ownerBlockers, aclBlockers, xattrBlockers, xattrUnverified, manifest, retiredRoots, ownedOutputs, untrack, localIgnore, localIgnoreCheck, migration, fallbackChecks: [...fallbackChecks], fallbackOwnedPaths: ownedPaths, retainedClaudeRules, derivedFileDiagnostics, removalDiagnostics, scopeOmissions: (synchronized.scopeOmissions || []).map(item => (retainedClaudeRules.length || conflicts.some(path => path.startsWith('.claude/rules/'))) ? { ...item, status: 'activation-unverified' } : item), preserved: [...preserved.values()].sort((a, b) => a.path.localeCompare(b.path)) };
  } catch (error) { stageFailure = error; stageFailed = true; throw error; }
  finally {
    cleanupInstallationStage({
      stage, stageFailure, stageFailed, stageSyncError, stageSyncFailed,
      outputBoundaryFailure, outputBoundaryMayHaveStageEffects,
    });
  }
}
