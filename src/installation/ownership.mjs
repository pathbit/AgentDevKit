import { isGeneratedOutput } from '../../.pbai4devs/scripts/lib/gitignore.mjs';
import { canonicalEntrypoint, managedBlockDigest, stripManagedContent } from '../../.pbai4devs/scripts/lib/managed-content.mjs';
import { adapterRoots } from '../adapters/index.mjs';
import { resourceAllowed, fail, hash, safePath, read } from './filesystem.mjs';
import { stripTomlContent, tomlManagedBlockDigest } from '../../.pbai4devs/scripts/lib/managed-toml.mjs';
import { begin, end } from '../config.mjs';
import { text } from '../i18n.mjs';

export function allowedManaged(path) {
  if (isGeneratedOutput(path)) return false;
  if (['.pbai4devs/estado/README.md', '.pbai4devs/adapters/README.md'].includes(path)) return true;
  if (canonicalEntrypoint(path) || path === '.gitignore') return true;
  if (nativeMarkdown(path) || nativeToml(path)) return true;
  if (['catalog.json', 'skills.json', 'agents.json', 'rules.json', 'espelhos.conf'].some(name => path === `.pbai4devs/${name}`)) return true;
  if (['.agents/skills.json', '.agents/agents.json', '.agents/rules.json'].includes(path)) return true;
  if (path.startsWith('.pbai4devs/')) return resourceAllowed(path.slice('.pbai4devs/'.length));
  return adapterRoots.some(root => path === `${root}/.gitignore` || ['skills', 'agents', 'commands', 'rules', 'instructions', 'prompts'].some(kind => path.startsWith(`${root}/${kind}/`)));
}

export function nativeMarkdown(path) {
  return Boolean(canonicalEntrypoint(path)) || /\.(?:md|mdc)$/i.test(path)
    && adapterRoots.some(root => {
      if (!path.startsWith(`${root}/`)) return false;
      const relative = path.slice(root.length + 1).split('/');
      return !['tools', 'scripts', 'templates', 'external-skills', 'estado', 'state', 'tests', 'docs', 'adapters', 'workflows'].includes(relative[0].toLowerCase())
        && !['readme.md', 'instructions.md'].includes(relative.at(-1).toLowerCase());
    });
}

export const nativeToml = path => path.startsWith('.gemini/commands/') && path.endsWith('.toml');

export const nativeManagedText = path => nativeMarkdown(path) || nativeToml(path);

// Check the planned managed-block change again when applying it. TOML block
// removal can reserialize the prompt even when its meaning stays the same.
export function allowsStagedBlock(path, current, content, knownBlock) {
  if (!current || !Buffer.isBuffer(content) || !nativeManagedText(path)) return false;
  try {
    if (!nativeToml(path) && content.subarray(0, current.length).equals(current)) {
      const digest = managedBlockDigest(content);
      const stripped = digest && stripManagedContent(content, digest);
      const extra = stripped?.slice(current.toString('utf8').length);
      return Boolean(stripped?.startsWith(current.toString('utf8')) && extra !== undefined && /^[\r\n]*$/.test(extra));
    }
    if (knownBlock) {
      const strip = nativeToml(path) ? stripTomlContent : stripManagedContent;
      return Buffer.from(strip(current, knownBlock)).equals(content);
    }
  } catch { /* Invalid or unproven block. */ }
  return false;
}

export function extractBlock(content, first = begin, last = end) {
  const start = content.indexOf(first), finish = content.indexOf(last);
  if (start < 0 && finish < 0) return null;
  if (start < 0 || finish < start || content.indexOf(first, start + first.length) >= 0 || content.indexOf(last, finish + last.length) >= 0) fail('E_BLOCK', 'Invalid or duplicate managed block markers.');
  return content.slice(start, finish + last.length);
}

export function blockDigest(path, content) {
  const value = content.toString('utf8');
  if (nativeToml(path)) return tomlManagedBlockDigest(content);
  if (nativeMarkdown(path)) return managedBlockDigest(content);
  const block = path === '.gitignore' ? extractBlock(value, '# BEGIN AGENTDEVKIT', '# END AGENTDEVKIT') : path.endsWith('/.gitignore') ? extractBlock(value, '# BEGIN AGENT IGNORE', '# END AGENT IGNORE') : null;
  return block === null ? null : hash(block);
}

export function replacedIgnoreBlocks(target, changes, previous) {
  const blocks = [];
  for (const change of changes) {
    if (change.path !== '.gitignore' && !change.path.endsWith('/.gitignore')) continue;
    const current = read(target, change.path); if (!current) continue;
    const source = current.toString('utf8');
    if (!previous?.blocks[change.path] || blockDigest(change.path, current) !== previous.blocks[change.path]) continue;
    const block = change.path === '.gitignore' ? extractBlock(source, '# BEGIN AGENTDEVKIT', '# END AGENTDEVKIT') : extractBlock(source, '# BEGIN AGENT IGNORE', '# END AGENT IGNORE');
    if (!block) continue;
    const first = source.indexOf(block), last = first + block.length;
    blocks.push({ path: safePath(target, change.path), firstLine: source.slice(0, first).split('\n').length, lastLine: source.slice(0, last).split('\n').length, sha256: hash(block) });
  }
  return blocks;
}

export function entryContent(current, template, language, path) {
  const lines = template.replaceAll('\r', '').split('\n');
  const heading = lines.findIndex(line => line.startsWith('# '));
  if (heading < 0) fail('E_TEMPLATE', `Missing title: ${path}`);
  let body = lines.slice(heading + 1).join('\n').trim();
  if (path === 'AGENTS.md') body = `${text(language, 'agentLanguage')}\n\n${body}`;
  const managed = `${begin}\n${body}\n${end}`;
  if (!current) return `${lines.slice(0, heading + 1).join('\n')}\n\n${managed}\n`;
  const source = current.toString('utf8'), previous = extractBlock(source);
  return previous ? source.replace(previous, managed) : `${source}${source.endsWith('\n\n') ? '' : source.endsWith('\n') ? '\n' : '\n\n'}${managed}\n`;
}

// Diagnostic only: equal hashes or blocks do not prove current ownership.
export function diagnosePreservedDerivedToml(derivedFiles, preserved, knownBlocks, readContent) {
  const diagnostics = [];
  for (const [path, digest] of Object.entries(derivedFiles)) {
    if (!nativeToml(path) || !preserved.has(path)) continue;
    let current;
    try { current = readContent(path); }
    catch { diagnostics.push({ code: 'derived-file-unverified', path }); continue; }
    if (current === null) { diagnostics.push({ code: 'derived-file-missing', path }); continue; }
    if (!Buffer.isBuffer(current)) { diagnostics.push({ code: 'derived-file-unverified', path }); continue; }
    if (hash(current) === digest) continue;
    const block = knownBlocks[path];
    if (block) {
      try { if (blockDigest(path, current) === block) continue; }
      catch { /* A malformed or unverified block cannot suppress the warning. */ }
    }
    diagnostics.push({ code: 'derived-file-diverged', path });
  }
  return diagnostics.sort((a, b) => a.path.localeCompare(b.path));
}
