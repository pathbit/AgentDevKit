import { closeSync, fstatSync, openSync, readSync, readdirSync } from 'node:fs';
import { fail, safePath, stat, read } from './filesystem.mjs';
import { inspectMacXattr } from '../../.pbai4devs/scripts/lib/xattr-probe.mjs';
import { assertNoNestedGit } from '../../.pbai4devs/scripts/lib/git-environment.mjs';
import { legacyStatePath } from '../config.mjs';
import { actualStatePath } from './state.mjs';

function readLegacyConfiguration(root, path) {
  const limit = 4 * 1024 * 1024, fd = openSync(safePath(root, path), 'r');
  try {
    if (!fstatSync(fd).isFile() || fstatSync(fd).size > limit) fail('E_STATE', 'Legacy configuration is too large or not a regular file.');
    const buffer = Buffer.allocUnsafe(limit + 1);
    let total = 0, count;
    while (total < buffer.length && (count = readSync(fd, buffer, total, buffer.length - total, null)) > 0) total += count;
    if (total > limit) fail('E_STATE', 'Legacy configuration is too large to inspect safely.');
    return buffer.subarray(0, total);
  } finally { closeSync(fd); }
}

function assertNoLegacyReferences(value) {
  const legacy = /\.pbai4devs\/estado(?=$|\/|[\s"'\],}:#])/i;
  const reject = () => fail('E_LEGACY_PATH', 'Replace .pbai4devs/estado references with .pbai4devs/state in the legacy configuration before running update.');
  if (legacy.test(value)) reject();
  const normalized = value.replaceAll('\r', '');
  const header = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  if (header === undefined) {
    if (normalized.startsWith('---')) fail('E_CONFIG_PARSE', 'Legacy configuration has an incomplete frontmatter block.');
    return;
  }
  let documents = false;
  for (const line of header.split('\n')) {
    const top = line.match(/^([a-z_]+):\s*(.*)$/);
    if (top) documents = top[1] === 'documentos';
    const nested = !top && documents ? line.match(/^  ([a-z_]+):\s*(.*)$/) : null;
    const raw = (top?.[2] ?? nested?.[2])?.trim();
    if (!raw?.startsWith('"')) continue;
    let decoded;
    try { decoded = JSON.parse(raw); }
    catch { fail('E_CONFIG_PARSE', 'Legacy configuration contains an ambiguous quoted scalar.'); }
    if (typeof decoded !== 'string') fail('E_CONFIG_PARSE', 'Legacy configuration contains an invalid quoted scalar.');
    if (legacy.test(decoded)) reject();
  }
}

export function assertMigrationDirectoryMetadata(root, folder, info) {
  if ((process.platform === 'darwin' || process.platform === 'linux') && (info.mode & 0o7000)) {
    throw Object.assign(new Error('State directory has special POSIX bits; review: ' + folder), { code: 'E_PROTECTED_METADATA', path: folder, metadataTargetVerified: true, metadataReason: 'special-mode-directory' });
  }
  if (process.platform === 'darwin') {
    const result = inspectMacXattr(safePath(root, folder));
    if (result !== 'empty') {
      throw Object.assign(new Error('State directory extended attributes require review: ' + folder), { code: result === 'present' ? 'E_PROTECTED_METADATA' : 'E_METADATA_UNSUPPORTED', path: folder, metadataTargetVerified: true, metadataReason: result === 'present' ? 'xattr-directory-present' : 'xattr-directory-unverified' });
    }
  }
}

export function legacyStateMigration(root) {
  if (actualStatePath(root) !== legacyStatePath) return null;
  const base = '.pbai4devs/estado', files = [], directories = [];
  const visit = folder => {
    assertNoNestedGit(root, [folder]);
    const info = stat(safePath(root, folder));
    if (!info?.isDirectory()) fail('E_STATE', `Invalid state directory: ${folder}`);
    assertMigrationDirectoryMetadata(root, folder, info);
    const names = readdirSync(safePath(root, folder)).sort();
    directories.push({ path: folder, mode: info.mode & 0o777, names });
    for (const name of names) {
      const path = `${folder}/${name}`, item = stat(safePath(root, path));
      if (item?.isDirectory()) visit(path);
      else if (item?.isFile()) {
        const configuration = path === `${base}/configuracao/ESTADO.md`;
        const content = configuration ? readLegacyConfiguration(root, path) : read(root, path);
        if (configuration) {
          if (content.includes(0)) fail('E_STATE', 'Legacy configuration contains binary data.');
          let value;
          try { value = new TextDecoder('utf-8', { fatal: true }).decode(content); }
          catch { fail('E_STATE', 'Legacy configuration is not valid UTF-8.'); }
          assertNoLegacyReferences(value);
        }
        files.push({ path, target: path.replace(`${base}/`, '.pbai4devs/state/'), mode: item.mode & 0o777, content });
      }
      else fail('E_STATE', `Unsupported state entry: ${path}`);
    }
  };
  visit(base);
  return { files, directories };
}
