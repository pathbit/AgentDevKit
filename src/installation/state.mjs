import { normalizeClients, adapterRoots } from '../adapters/index.mjs';
import { normalizeLanguage } from '../i18n.mjs';
import { fail, safePath, read, stat, hash } from './filesystem.mjs';
import { allowedManaged, nativeMarkdown, nativeToml, nativeManagedText, blockDigest } from './ownership.mjs';
import { statePath, legacyStatePath } from '../config.mjs';
import { canonicalEntrypoint } from '../../.pbai4devs/scripts/lib/managed-content.mjs';

export function loadState(root, { rawClients = false } = {}) {
  const content = read(root, actualStatePath(root)); if (content === null) return null;
  let state; try { state = JSON.parse(content); } catch { fail('E_STATE', 'Invalid AgentDevKit state JSON.'); }
  if (state?.schemaVersion !== 1 || !normalizeLanguage(state.language) || typeof state.version !== 'string' || !state.files || typeof state.files !== 'object' || Array.isArray(state.files) || !state.blocks || typeof state.blocks !== 'object' || Array.isArray(state.blocks)) fail('E_STATE', 'Invalid AgentDevKit state.');
  if (state.local !== undefined && state.local !== true) fail('E_STATE', 'Invalid AgentDevKit state.');
  if (state.clients !== undefined) {
    if (!Array.isArray(state.clients)) fail('E_STATE', 'Invalid client selection in AgentDevKit state.');
    try {
      const clients = normalizeClients(state.clients, { stored: true });
      if (!rawClients) state.clients = clients;
    } catch { fail('E_STATE', 'Invalid client selection in AgentDevKit state.'); }
  }
  for (const [path, digest] of [...Object.entries(state.files), ...Object.entries(state.blocks)]) {
    safePath(root, path);
    if (!allowedManaged(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', `Invalid managed state entry: ${path}`);
  }
  return state;
}

export function actualStatePath(root) {
  const legacy = stat(safePath(root, '.pbai4devs/estado'));
  const current = stat(safePath(root, '.pbai4devs/state'));
  if (legacy && !legacy.isDirectory() || current && !current.isDirectory()) fail('E_STATE', 'AgentDevKit state must be a directory.');
  if (legacy && current) fail('E_STATE', 'Both .pbai4devs/estado and .pbai4devs/state exist; preserve both and resolve the conflict.');
  return legacy ? legacyStatePath : statePath;
}

// Change only one top-level JSON member. Other fields, escaping and whitespace
// remain byte-for-byte intact, including user-provided fields in local state.
export function replaceJsonMember(bytes, member, value) {
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) fail('E_STATE', 'Invalid UTF-8 in derived state.');
  let i = 0;
  const space = () => { while (/\s/.test(text[i] || '') && i < text.length) i++; };
  const stringEnd = () => {
    if (text[i++] !== '"') fail('E_STATE', 'Invalid JSON member.');
    while (i < text.length) {
      const char = text[i++];
      if (char === '\\') { i++; continue; }
      if (char === '"') return;
    }
    fail('E_STATE', 'Unterminated JSON string.');
  };
  space(); if (text[i++] !== '{') fail('E_STATE', 'Invalid derived state.');
  const properties = [];
  while (true) {
    space(); if (text[i] === '}') break;
    const start = i; stringEnd(); const key = JSON.parse(text.slice(start, i));
    space(); if (text[i++] !== ':') fail('E_STATE', 'Invalid JSON member.');
    space(); const valueStart = i;
    if (text[i] === '"') stringEnd();
    else if (text[i] === '{' || text[i] === '[') {
      const stack = [];
      do {
        const char = text[i];
        if (char === '"') { stringEnd(); continue; }
        i++;
        if (char === '{' || char === '[') stack.push(char);
        else if (char === '}' || char === ']') stack.pop();
      } while (stack.length && i < text.length);
      if (stack.length) fail('E_STATE', 'Invalid derived state.');
    } else { while (i < text.length && text[i] !== ',' && text[i] !== '}') i++; while (i > valueStart && /\s/.test(text[i - 1])) i--; }
    const end = i; properties.push({ key, start, valueStart, end });
    space(); if (text[i] === ',') { i++; continue; } if (text[i] === '}') break;
    fail('E_STATE', 'Invalid JSON member separator.');
  }
  const matches = properties.filter(item => item.key === member);
  if (matches.length > 1) fail('E_STATE', 'Ambiguous state member.');
  if (!matches.length) {
    if (value === undefined) return bytes;
    const insertion = `${properties.length ? ',' : ''}\n  ${JSON.stringify(member)}: ${JSON.stringify(value, null, 2)}\n`;
    const next = text.slice(0, i) + insertion + text.slice(i);
    try { JSON.parse(next); } catch { fail('E_STATE', 'Unable to preserve state safely.'); }
    return Buffer.from(next);
  }
  const current = matches[0], index = properties.indexOf(current);
  let next;
  if (value !== undefined) next = text.slice(0, current.valueStart) + JSON.stringify(value, null, 2) + text.slice(current.end);
  else if (index > 0) next = text.slice(0, properties[index - 1].end) + text.slice(current.end);
  else if (properties.length > 1) next = text.slice(0, current.start) + text.slice(properties[1].start);
  else next = text.slice(0, current.start) + text.slice(current.end);
  try { JSON.parse(next); } catch { fail('E_STATE', 'Unable to preserve derived state safely.'); }
  return Buffer.from(next);
}

export function reconcileStateBytes(original, previous, next) {
  if (!original) return Buffer.from(`${JSON.stringify(next, null, 2)}\n`);
  const canonical = value => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : Array.isArray(value) ? value.map(canonical) : value;
  let result = original;
  for (const key of ['schemaVersion', 'version', 'language', 'clients', 'files', 'blocks', 'local']) {
    if (JSON.stringify(canonical(previous?.[key])) !== JSON.stringify(canonical(next[key]))) result = replaceJsonMember(result, key, next[key]);
  }
  return result;
}

export function readDerivedState(target) {
  let entries = {}, outputs = {}, blocks = {}, files = {}, catalogs = {}, config = null, removedBlocks = [], removedFiles = {};
  const derived = read(target, actualStatePath(target).replace(/agentdevkit\.json$/, 'derived.json'));
  if (derived) {
    try {
      const value = JSON.parse(derived);
      if (value.schemaVersion !== 1 || !value.entries || typeof value.entries !== 'object' || Array.isArray(value.entries)
        || ['outputs', 'blocks', 'files', 'catalogs', 'removedFiles'].some(key => value[key] !== undefined && (!value[key] || typeof value[key] !== 'object' || Array.isArray(value[key])))) fail('E_STATE', 'Invalid derived entrypoint state.');
      entries = value.entries; outputs = value.outputs ?? {}; blocks = value.blocks ?? {}; files = value.files ?? {}; catalogs = value.catalogs ?? {}; removedFiles = value.removedFiles ?? {};
      if (value.config !== undefined && (typeof value.config !== 'string' || !/^[a-f0-9]{64}$/.test(value.config))) fail('E_STATE', 'Invalid derived configuration state.');
      config = value.config ?? null;
      removedBlocks = value.removedBlocks ?? [];
      if (!Array.isArray(removedBlocks) || removedBlocks.some(path => typeof path !== 'string' || !nativeManagedText(path))) fail('E_STATE', 'Invalid removed block state.');
      for (const [path, digest] of Object.entries(entries)) if (!canonicalEntrypoint(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived entrypoint state.');
      for (const [path, digest] of Object.entries(outputs)) if (!allowedManaged(path) || !/^\.[^/]+\/(?:skills|agents|rules)\.json$/.test(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived output state.');
      for (const [path, digest] of Object.entries(blocks)) if (!(nativeManagedText(path) || path === '.pbai4devs/.gitignore' || adapterRoots.some(root => path === `${root}/.gitignore`)) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived block state.');
      // Legacy standalone sync can record Claude rules under ignored folders.
      // Accept this narrow provenance only so those paths can be preserved;
      // content hashes never authorize deleting or overwriting Claude rules.
      const legacyClaudeRule = path => typeof path === 'string' && /^\.claude\/rules\/.+\.md$/.test(path)
        && !/[\\|\x00-\x1f\x7f:]/.test(path)
        && !['readme.md', 'instructions.md'].includes(path.split('/').at(-1).toLowerCase())
        && path.split('/').every(part => part && part !== '.' && part !== '..' && part.toLowerCase() !== '.git');
      for (const [path, digest] of Object.entries(files)) {
        const forbiddenClaude = path.startsWith('.claude/rules/') && (path.split('/').some(part => part.toLowerCase() === '.git')
          || ['readme.md', 'instructions.md'].includes(path.split('/').at(-1).toLowerCase()));
        if (forbiddenClaude || !(allowedManaged(path) || legacyClaudeRule(path)) || !/\.(?:md|mdc|toml)$/.test(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived file state.');
      }
      for (const [path, digest] of Object.entries(catalogs)) if (!/^\.pbai4devs\/(?:catalog|skills|agents|rules)\.json$/.test(path) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid derived catalogue state.');
      for (const [path, digest] of Object.entries(removedFiles)) if (canonicalEntrypoint(path) || !(nativeMarkdown(path) || nativeToml(path)) || !/^[a-f0-9]{64}$/.test(digest)) fail('E_STATE', 'Invalid removed file state.');
      const installed = loadState(target);
      if (Object.entries(removedFiles).some(([path, digest]) => installed?.files?.[path] && installed.files[path] !== digest)) fail('E_STATE', 'Removed file state differs from installation.');
    }
    catch { fail('E_STATE', 'Invalid derived entrypoint state.'); }
    for (const path of [...Object.keys(entries), ...Object.keys(outputs), ...Object.keys(blocks), ...Object.keys(files), ...Object.keys(catalogs), ...Object.keys(removedFiles), ...removedBlocks]) safePath(target, path);
  }
  return { entries, outputs, blocks, files, catalogs, config, removedBlocks, removedFiles };
}

function unverifiedRemovalIssues(state, derived) {
  return Object.keys(derived.removedFiles).filter(path => !Object.hasOwn(state.files, path))
    .sort().map(path => ({ code: 'removed-file-unverified', path }));
}

// Read the removal history before planning, so a later planning failure does
// not hide an already observed inconsistency. This does not authorize writes.
export function inspectRemovalHistory(target) {
  const state = loadState(target);
  return state ? unverifiedRemovalIssues(state, readDerivedState(target)) : [];
}

export function inspect(target) {
  const state = loadState(target);
  if (!state) return { installed: false, issues: [{ code: 'missing', path: statePath }] };
  const derived = readDerivedState(target);
  // An orphaned removal record can be legitimate history, but the current
  // installation state cannot corroborate it. Do not silently report it clean.
  const issues = unverifiedRemovalIssues(state, derived);
  if (state.clients?.length === 0) issues.push({ code: 'client-selection-retired', path: statePath });
  for (const [path, digest] of Object.entries(state.files)) {
    if (derived.blocks[path] || derived.removedBlocks.includes(path)) continue;
    const content = read(target, path);
    if (derived.removedFiles[path] === digest && !derived.files[path] && !derived.entries[path]) {
      if (content) issues.push({ code: 'modified', path });
      continue;
    }
    if (!content || hash(content) !== digest && hash(content) !== derived.outputs[path] && hash(content) !== derived.files[path] && hash(content) !== derived.entries[path] && hash(content) !== derived.catalogs[path] && !(path === '.pbai4devs/espelhos.conf' && hash(content) === derived.config)) issues.push({ code: content ? 'modified' : 'missing', path });
  }
  for (const [path, digest] of Object.entries({ ...state.blocks, ...derived.blocks })) {
    if (derived.removedBlocks.includes(path) && !Object.hasOwn(derived.blocks, path)) continue;
    const content = read(target, path);
    if (content && [derived.entries[path], derived.files[path]].some(value => value && hash(content) === value)) continue;
    if (!content || blockDigest(path, content) !== digest) issues.push({ code: content ? 'modified' : 'missing', path });
  }
  return { installed: true, version: state.version, language: state.language, issues };
}
