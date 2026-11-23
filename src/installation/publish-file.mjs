import { randomUUID } from 'node:crypto';
import { withUncertainPath } from '../../.pbai4devs/scripts/lib/error-reporting.mjs';
import { chmodSync, closeSync, fchmodSync, openSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { nativeMetadataCopySupported, publishFileReplacement, stageReplacementWithNativeMetadata } from '../../.pbai4devs/scripts/lib/native-metadata.mjs';
import { hash, safePath } from './filesystem.mjs';

export function publishPlannedFile(root, stage, path, content, mode, beforePublish, original) {
  const file = safePath(root, path);
  mkdirSync(dirname(file), { recursive: true });
  if (original === null) {
    // Let the final parent supply the default ACL. A failed create can be
    // partial; only the descriptor is closed. Never unlink the public name.
    beforePublish();
    const fd = openSync(file, 'wx', mode);
    try {
      writeFileSync(fd, content);
      if (mode !== undefined) fchmodSync(fd, mode);
    } finally { closeSync(fd); }
    return;
  }

  // Keep original ACLs and proposed contents behind the verified private
  // directory until replacement. Leave ambiguous results for review.
  const temporary = safePath(stage, path) + '.agentdevkit-' + randomUUID();
  mkdirSync(dirname(temporary), { recursive: true, mode: 0o700 });
  try {
    writeFileSync(temporary, content, { flag: 'wx', mode: 0o600 });
    if (nativeMetadataCopySupported) stageReplacementWithNativeMetadata(file, temporary, content, mode, path);
    if (mode !== undefined) chmodSync(temporary, mode);
    beforePublish();
    const hashes = process.platform === 'win32' ? { before: hash(original), after: hash(content) } : undefined;
    publishFileReplacement(temporary, file, path, hashes);
  } catch (error) { throw withUncertainPath(error, temporary); }
}
