import { spawnSync } from 'node:child_process';
import { chmodSync, closeSync, existsSync, fchmodSync, fstatSync, ftruncateSync, lstatSync, openSync, readFileSync, writeSync } from 'node:fs';

const nativePlatform = process.platform;
export const nativeMetadataCopySupported = nativePlatform === 'darwin' || nativePlatform === 'linux';

const failure = cause => Object.assign(new Error('Native file metadata could not be preserved.'), {
  code: 'E_METADATA_COPY',
  ...(cause ? { cause } : {}),
});

function copyArgs(source, destination) {
  return nativePlatform === 'darwin'
    ? ['-p', source, destination]
    : ['--preserve=mode,ownership,timestamps,xattr', '--', source, destination];
}

function metadataOnlyArgs(source, destination) {
  return ['--attributes-only', '--preserve=mode,ownership,timestamps,xattr', '--', source, destination];
}

function runCopy(source, destination) {
  const result = spawnSync('/bin/cp', copyArgs(source, destination), {
    encoding: 'utf8', windowsHide: true, timeout: 30000,
    env: { ...process.env, LC_ALL: 'C' },
  });
  if (result.error || result.status !== 0 || nativePlatform === 'linux' && result.stderr.trim()) {
    throw failure(result.error || new Error('copy command reported a metadata warning'));
  }
}

function runMetadataCopy(source, destination) {
  const result = spawnSync('/bin/cp', metadataOnlyArgs(source, destination), {
    encoding: 'utf8', windowsHide: true, timeout: 30000,
    env: { ...process.env, LC_ALL: 'C' },
  });
  if (result.error || result.status !== 0 || result.stderr.trim()) {
    throw failure(result.error || new Error('metadata-only copy command failed'));
  }
}

function file(path) {
  const info = lstatSync(path, { bigint: true });
  if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1n) throw failure();
  return info;
}

function sameFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.isFile() && right.isFile()
    && !left.isSymbolicLink() && !right.isSymbolicLink();
}

function macFlags(path) {
  const result = spawnSync('/usr/bin/stat', ['-f', '%Sf', path], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
  if (result.error || result.status !== 0 || result.stderr.trim()) throw failure(result.error || new Error('file flags could not be read'));
  return result.stdout.trim() === '-' ? '' : result.stdout.trim();
}

function macMetadata(path) {
  const names = spawnSync('/usr/bin/xattr', [path], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
  if (names.error || names.status !== 0) throw failure(names.error || new Error('xattr list failed'));
  const attrs = [];
  for (const name of names.stdout.split(/\r?\n/).filter(Boolean).sort()) {
    const value = spawnSync('/usr/bin/xattr', ['-p', name, path], { encoding: 'buffer', windowsHide: true, timeout: 10000 });
    if (value.error || value.status !== 0 || !Buffer.isBuffer(value.stdout)) throw failure(value.error || new Error('xattr read failed'));
    attrs.push([name, value.stdout.toString('base64')]);
  }
  const acl = spawnSync('/bin/ls', ['-ldeO', path], {
    encoding: 'utf8', windowsHide: true, timeout: 10000,
    env: { ...process.env, LC_ALL: 'C' },
  });
  if (acl.error || acl.status !== 0) throw failure(acl.error || new Error('ACL read failed'));
  const entries = acl.stdout.split(/\r?\n/).filter(line => /^\s*\d+:\s/.test(line));
  return { attrs, entries, flags: macFlags(path) };
}

function linuxMetadata(path) {
  const result = {};
  if (existsSync('/usr/bin/getfattr')) {
    const attrs = spawnSync('/usr/bin/getfattr', ['-h', '-d', '-m', '-', '--absolute-names', '-e', 'hex', '--', path], {
      encoding: 'utf8', windowsHide: true, timeout: 10000,
      env: { ...process.env, LC_ALL: 'C' },
    });
    if (attrs.error || attrs.status !== 0 || attrs.stderr.trim()) throw failure(attrs.error || new Error('xattr verification failed'));
    result.xattrs = attrs.stdout.split(/\r?\n/).filter(line => !line.startsWith('# file:')).sort();
  }
  if (existsSync('/usr/bin/getfacl')) {
    const acl = spawnSync('/usr/bin/getfacl', ['--absolute-names', '--numeric', '--omit-header', '--', path], {
      encoding: 'utf8', windowsHide: true, timeout: 10000,
      env: { ...process.env, LC_ALL: 'C' },
    });
    if (acl.error || acl.status !== 0 || acl.stderr.trim()) throw failure(acl.error || new Error('ACL verification failed'));
    result.acl = acl.stdout.split(/\r?\n/).filter(Boolean).sort();
  }
  return Object.keys(result).length ? result : null;
}

function nativeMetadata(path) {
  if (nativePlatform === 'darwin') return macMetadata(path);
  if (nativePlatform === 'linux') return linuxMetadata(path);
  return null;
}

export function inspectMacWriteProtection(path) {
  if (nativePlatform !== 'darwin') return 'unknown';
  const result = spawnSync('/bin/ls', ['-ldeO', path], {
    encoding: 'utf8', windowsHide: true, timeout: 10000,
    env: { ...process.env, LC_ALL: 'C' },
  });
  if (result.error || result.status !== 0) return 'unknown';
  const lines = result.stdout.split(/\r?\n/), columns = lines[0]?.trim().split(/\s+/) || [];
  let flags; try { flags = macFlags(path); } catch { return 'unknown'; }
  if (/(?:^|,)(?:uchg|schg|uappnd|sappnd)(?:,|$)/.test(flags)) return 'protected';
  const deniedWrites = /\bdeny\b[^\n]*\b(?:write|append|add_file|delete|delete_child|writeattr|writeextattr|writesecurity|chown)\b/i;
  return lines.slice(1).some(line => /^\s*\d+:\s/.test(line) && deniedWrites.test(line)) ? 'protected' : 'clear';
}

function copyAndVerify(source, destination, destinationIdentity, metadataOnly = false) {
  const original = file(source), target = file(destination);
  if (destinationIdentity && !sameFile(destinationIdentity, target)) throw failure();
  const originalMetadata = nativeMetadata(source);
  if (!metadataOnly) runCopy(source, destination);
  else if (nativePlatform === 'linux') runMetadataCopy(source, destination);
  else if (nativePlatform === 'darwin') runCopy(source, destination);
  const sourceAfter = file(source), destinationAfter = file(destination);
  if (!sameFile(original, sourceAfter) || !sameFile(target, destinationAfter)
    || original.mode !== sourceAfter.mode || original.uid !== destinationAfter.uid || original.gid !== destinationAfter.gid
    || original.size !== sourceAfter.size || original.size !== destinationAfter.size
    || (!metadataOnly || nativePlatform === 'linux') && original.mtimeNs !== destinationAfter.mtimeNs
    || original.ctimeNs !== sourceAfter.ctimeNs
    || (original.mode & 0o7777n) !== (destinationAfter.mode & 0o7777n)) throw failure();
  if (originalMetadata !== null && JSON.stringify(originalMetadata) !== JSON.stringify(nativeMetadata(destination))) throw failure();
  return { source: sourceAfter, destination: destinationAfter, metadata: originalMetadata };
}

export function copyFileWithNativeMetadata(source, destination, { destinationIdentity, expectedBytes, metadataOnly = false } = {}) {
  if (!nativeMetadataCopySupported) throw failure();
  copyAndVerify(source, destination, destinationIdentity, metadataOnly);
  if (!metadataOnly && expectedBytes !== undefined && !readFileSync(destination).equals(expectedBytes)) throw failure();
}

export function stageReplacementWithNativeMetadata(source, staged, content, mode, displayPath = source) {
  if (!nativeMetadataCopySupported || process.platform !== nativePlatform) return false;
  const sourceIdentity = lstatSync(source, { bigint: true });
  if (!sourceIdentity.isFile() || sourceIdentity.isSymbolicLink() || sourceIdentity.nlink !== 1n) {
    throw Object.assign(new Error('File identity prevents a safe update.'), { code: 'E_PROTECTED_METADATA', path: displayPath });
  }
  if (nativePlatform === 'darwin' && inspectMacWriteProtection(source) !== 'clear') {
    throw Object.assign(new Error('File metadata prevents a safe update.'), { code: 'E_PROTECTED_METADATA', path: displayPath });
  }
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const sourceBefore = file(source), stagedBefore = file(staged);
  let fd, primaryError, closeError;
  try {
    fd = openSync(staged, 'r+');
    const opened = fstatSync(fd, { bigint: true });
    if (!sameFile(stagedBefore, opened)) throw failure();
    copyAndVerify(source, staged, opened);
    const copied = fstatSync(fd, { bigint: true });
    if (!sameFile(opened, copied)) throw failure();
    for (let offset = 0; offset < bytes.length;) {
      const count = writeSync(fd, bytes, offset, bytes.length - offset, offset);
      if (count <= 0) throw failure();
      offset += count;
    }
    ftruncateSync(fd, bytes.length);
    if (mode !== undefined) fchmodSync(fd, mode);
    const completed = fstatSync(fd, { bigint: true });
    if (!sameFile(opened, completed) || (completed.mode & 0o777n) !== BigInt(mode ?? Number(sourceBefore.mode & 0o777n))) throw failure();
  } catch (error) {
    primaryError = error?.code === 'E_METADATA_COPY' ? error : failure(error);
  } finally {
    if (fd !== undefined) try { closeSync(fd); } catch (error) { closeError = error; }
  }
  if (primaryError && closeError) {
    const combined = new AggregateError([primaryError, closeError], primaryError.message, { cause: primaryError });
    combined.code = primaryError.code || 'E_METADATA_COPY';
    throw combined;
  }
  if (primaryError) throw primaryError;
  if (closeError) throw failure(closeError);
  const sourceAfter = file(source), stagedAfter = file(staged);
  if (!sameFile(sourceBefore, sourceAfter) || sourceBefore.size !== sourceAfter.size
    || sourceBefore.mtimeNs !== sourceAfter.mtimeNs || sourceBefore.ctimeNs !== sourceAfter.ctimeNs
    || !stagedAfter.isFile() || !readFileSync(staged).equals(bytes)) throw failure();
  const sourceMetadata = nativeMetadata(source);
  if (sourceMetadata !== null && JSON.stringify(sourceMetadata) !== JSON.stringify(nativeMetadata(staged))) throw failure();
  return true;
}
