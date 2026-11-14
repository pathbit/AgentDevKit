// Preserve structured diagnostics across nested causes and AggregateErrors.
export function collectErrorDiagnostics(error) {
  const seen = new Set(), paths = new Set(), cleanup = new Map(), pending = [error], limit = 4096;
  let truncated = false;
  const read = (item, key) => { try { return item[key]; } catch { truncated = true; return undefined; } };
  while (pending.length && seen.size < limit) {
    const item = pending.pop();
    if (!item || typeof item !== 'object' || seen.has(item)) continue;
    seen.add(item);
    for (const key of ['rollbackPreservedPaths', 'uncertainPaths']) {
      const values = read(item, key);
      if (Array.isArray(values)) {
        if (values.length > limit) truncated = true;
        for (const path of values.slice(0, limit)) if (typeof path === 'string') {
          if (paths.size >= limit && !paths.has(path)) { truncated = true; break; }
          paths.add(path);
        }
      }
    }
    const failures = read(item, 'cleanupFailures');
    if (Array.isArray(failures)) for (const failure of failures.slice(0, limit)) {
      if (!failure || typeof failure !== 'object') continue;
      const path = read(failure, 'path'), message = read(failure, 'message');
      if (typeof path !== 'string' || typeof message !== 'string') continue;
      const key = JSON.stringify([path, message]);
      if (cleanup.size >= limit && !cleanup.has(key)) { truncated = true; break; }
      cleanup.set(key, { path, message });
    }
    const cause = read(item, 'cause'), errors = read(item, 'errors');
    if (cause) pending.push(cause);
    if (failures?.length > limit) truncated = true;
    if (Array.isArray(errors)) {
      const room = Math.max(0, limit - pending.length);
      if (errors.length > room) truncated = true;
      pending.push(...errors.slice(0, room));
    }
  }
  return { preservedPaths: [...paths], cleanupFailures: [...cleanup.values()], truncated: truncated || pending.length > 0 };
}

export function attachErrorDiagnostics(error) {
  const result = collectErrorDiagnostics(error);
  if (result.preservedPaths.length) error.rollbackPreservedPaths = result.preservedPaths;
  if (result.cleanupFailures.length) error.cleanupFailures = result.cleanupFailures;
  if (result.truncated) error.diagnosticsTruncated = true;
  return error;
}

// Only mark errors from an attempted exclusive hardlink publication.
export function explainUnsupportedHardlink(error) {
  if (['ENOTSUP', 'EOPNOTSUPP'].includes(error?.code)) {
    error.hardlinkUnsupported = true;
    error.message = `Hardlinks are not supported by this filesystem: ${error.message}`;
  }
  return error;
}
