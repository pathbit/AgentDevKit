// Isolated capture primitive. Callers must enumerate every affected path;
// this module does not coordinate writers or authorize project mutations.
import { createHash } from 'node:crypto';
import { constants, closeSync, fstatSync, lstatSync, openSync, readSync, realpathSync } from 'node:fs';
import { isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { types } from 'node:util';

const fail = code => { throw Object.assign(new Error('Recovery capture cannot safely continue.'), { code }); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sha = /^[a-f0-9]{64}$/;
const maxEntries = 4096, maxFile = 32 * 1024 * 1024, maxTotal = 128 * 1024 * 1024;
const alias = value => value.normalize('NFD').toLowerCase().toUpperCase().normalize('NFD');
const reserved = part => /^(CON|PRN|AUX|NUL|CONIN\$|CONOUT\$|COM[1-9¹²³]|LPT[1-9¹²³])$/.test(alias(part.split('.')[0].replace(/ +$/, '')));

function pathParts(path) {
  if (typeof path !== 'string' || !path || path.length > 512 || path !== path.normalize('NFC')
    || path !== Buffer.from(path, 'utf8').toString('utf8') || isAbsolute(path)
    || /[\\:<>"|?*\x00-\x1f\x7f-\x9f\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/.test(path)) fail('E_RECOVERY_CAPTURE_INPUT');
  const parts = path.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part)
    || Buffer.byteLength(part, 'utf8') > 255 || reserved(part)
    || ['.GIT', '.AGENT-TESTS'].includes(alias(part)))) fail('E_RECOVERY_CAPTURE_INPUT');
  return parts;
}

function record(value) {
  if (!value || typeof value !== 'object' || types.isProxy(value) || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) fail('E_RECOVERY_CAPTURE_INPUT');
  const fields = Object.getOwnPropertyDescriptors(value), keys = Reflect.ownKeys(fields);
  if (keys.some(key => typeof key !== 'string' || !['path', 'action', 'beforeHash'].includes(key))
    || !['path', 'action'].every(key => fields[key] && 'value' in fields[key])
    || Object.values(fields).some(field => !('value' in field))) fail('E_RECOVERY_CAPTURE_INPUT');
  const path = fields.path.value, action = fields.action.value, beforeHash = fields.beforeHash?.value;
  pathParts(path);
  if (!['create', 'update', 'remove', 'retain'].includes(action)
    || beforeHash !== undefined && beforeHash !== null && (typeof beforeHash !== 'string' || !sha.test(beforeHash))
    || action === 'create' && beforeHash !== undefined && beforeHash !== null) fail('E_RECOVERY_CAPTURE_INPUT');
  return { path, action, beforeHash };
}

const same = (a, b) => a.dev === b.dev && a.ino === b.ino && a.mode === b.mode && a.uid === b.uid
  && a.nlink === b.nlink && a.size === b.size && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
function item(path) {
  try { return lstatSync(path, { bigint: true }); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function knownRoot(root) {
  if (typeof root !== 'string' || !isAbsolute(root) || resolve(root) !== root) fail('E_RECOVERY_CAPTURE_INPUT');
  const info = item(root);
  if (!info?.isDirectory() || info.isSymbolicLink() || realpathSync(root) !== root) fail('E_RECOVERY_CAPTURE_ROOT');
  return info;
}

// Describes a target that may not exist without creating it. The identity is
// evidence for later comparison, not a lock or an atomic path reservation.
export function inspectRecoveryTarget(target) {
  if (typeof target !== 'string' || !isAbsolute(target) || resolve(target) !== target) fail('E_RECOVERY_CAPTURE_INPUT');
  try {
    const volume = parse(target).root, rest = relative(volume, target);
    const components = rest ? rest.split(sep) : [];
    if (components.some(part => !part || part === '.' || part === '..')) fail('E_RECOVERY_CAPTURE_INPUT');
    let anchor = volume, info = item(anchor), missing = [];
    if (!info?.isDirectory() || info.isSymbolicLink()) fail('E_RECOVERY_CAPTURE_ROOT');
    const observed = [[anchor, info]];
    for (let index = 0; index < components.length; index++) {
      const next = join(anchor, components[index]), nextInfo = item(next);
      if (!nextInfo) { missing = components.slice(index); pathParts(missing.join('/')); break; }
      if (!nextInfo.isDirectory() || nextInfo.isSymbolicLink()) fail('E_RECOVERY_CAPTURE_ROOT');
      anchor = next; info = nextInfo; observed.push([anchor, info]);
    }
    if (!info.ino || realpathSync(anchor) !== anchor) fail('E_RECOVERY_CAPTURE_ROOT');
    for (const [path, before] of observed) {
      const after = item(path);
      if (!after || after.isSymbolicLink() || !after.isDirectory()
        || before.dev !== after.dev || before.ino !== after.ino || before.mode !== after.mode) fail('E_RECOVERY_CAPTURE_CHANGED');
    }
    if (missing.length && item(join(anchor, missing[0]))) fail('E_RECOVERY_CAPTURE_CHANGED');
    return { status: missing.length ? 'missing' : 'existing', missing,
      anchor: { dev: String(info.dev), ino: String(info.ino), mode: Number(info.mode & 0o7777n) } };
  } catch (error) {
    if (typeof error?.code === 'string' && error.code.startsWith('E_RECOVERY_CAPTURE_')) throw error;
    fail('E_RECOVERY_CAPTURE_IO');
  }
}

// The result can be supplied to prepareRecoveryBackup. It deliberately
// refuses symbolic links, shared hardlinks and special modes. It checks observed
// identities twice; it does not make path lookup atomic or capture ACL/xattrs.
export function captureRecoverySnapshot(root, operations) {
  if (types.isProxy(operations) || !Array.isArray(operations) || Object.getPrototypeOf(operations) !== Array.prototype
    || Object.hasOwn(operations, Symbol.iterator) || operations.length > maxEntries) fail('E_RECOVERY_CAPTURE_INPUT');
  const wanted = new Map(), spellings = new Map();
  for (let index = 0; index < operations.length; index++) {
    const slot = Object.getOwnPropertyDescriptor(operations, String(index));
    if (!slot || !('value' in slot)) fail('E_RECOVERY_CAPTURE_INPUT');
    const operation = record(slot.value), parts = pathParts(operation.path);
    if (wanted.has(operation.path)) fail('E_RECOVERY_CAPTURE_INPUT');
    wanted.set(operation.path, operation);
    for (let i = 1; i <= parts.length; i++) {
      const path = parts.slice(0, i).join('/'), key = alias(path);
      if (spellings.has(key) && spellings.get(key) !== path) fail('E_RECOVERY_CAPTURE_INPUT');
      spellings.set(key, path);
    }
  }
  const paths = new Set(wanted.keys());
  for (const path of wanted.keys()) {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) paths.add(parts.slice(0, i).join('/'));
  }
  if (paths.size > maxEntries) fail('E_RECOVERY_CAPTURE_INPUT');
  const rootBefore = knownRoot(root), result = [], identities = new Map(); let total = 0;
  function checkAncestors(path) {
    const rootNow = knownRoot(root);
    if (rootBefore.dev !== rootNow.dev || rootBefore.ino !== rootNow.ino || rootBefore.mode !== rootNow.mode) fail('E_RECOVERY_CAPTURE_CHANGED');
    const parts = path.split('/');
    for (let index = 1; index < parts.length; index++) {
      const prefix = parts.slice(0, index).join('/');
      const before = identities.get(prefix), now = item(join(root, ...parts.slice(0, index)));
      if (!before?.isDirectory() || !now?.isDirectory() || now.isSymbolicLink() || !same(before, now)) fail('E_RECOVERY_CAPTURE_CHANGED');
    }
  }
  try {
    for (const path of [...paths].sort()) {
      const absolute = join(root, ...path.split('/'));
      const info = item(absolute), operation = wanted.get(path);
      identities.set(path, info);
      if (!info) {
        if (operation && operation.action !== 'create') fail('E_RECOVERY_CAPTURE_CHANGED');
        result.push({ path, action: 'create', type: 'absent', mode: null });
        continue;
      }
      if (info.isSymbolicLink() || (!info.isFile() && !info.isDirectory()) || (info.mode & 0o7000n)
        || typeof process.geteuid === 'function' && info.uid !== BigInt(process.geteuid())) fail('E_RECOVERY_CAPTURE_PROTECTED');
      if (operation?.action === 'create') fail('E_RECOVERY_CAPTURE_CHANGED');
      const mode = Number(info.mode & 0o777n);
      if (info.isDirectory()) {
        if (operation && !['remove', 'retain'].includes(operation.action) || operation?.beforeHash !== undefined) fail('E_RECOVERY_CAPTURE_INPUT');
        result.push({ path, action: operation?.action || 'retain', type: 'directory', mode });
        continue;
      }
      if (info.nlink !== 1n || info.size > BigInt(maxFile) || (total += Number(info.size)) > maxTotal) fail('E_RECOVERY_CAPTURE_PROTECTED');
      if (operation && ['update', 'remove'].includes(operation.action) && typeof operation.beforeHash !== 'string') fail('E_RECOVERY_CAPTURE_INPUT');
      checkAncestors(path);
      const fd = openSync(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW || 0) | (constants.O_NONBLOCK || 0));
      let data;
      try {
        const opened = fstatSync(fd, { bigint: true });
        if (!opened.isFile() || !same(info, opened)) fail('E_RECOVERY_CAPTURE_CHANGED');
        checkAncestors(path);
        data = Buffer.alloc(Number(info.size)); let offset = 0;
        while (offset < data.length) { const n = readSync(fd, data, offset, data.length - offset, offset); if (!n) fail('E_RECOVERY_CAPTURE_CHANGED'); offset += n; }
        if (!same(opened, fstatSync(fd, { bigint: true }))) fail('E_RECOVERY_CAPTURE_CHANGED');
        // A same-size edit can leave the observed timestamps unchanged.
        const verification = Buffer.alloc(Math.min(data.length, 64 * 1024));
        for (let verified = 0; verified < data.length;) {
          const count = readSync(fd, verification, 0, Math.min(verification.length, data.length - verified), verified);
          if (!count || !verification.subarray(0, count).equals(data.subarray(verified, verified + count))) {
            fail('E_RECOVERY_CAPTURE_CHANGED');
          }
          verified += count;
        }
        if (!same(opened, fstatSync(fd, { bigint: true }))) fail('E_RECOVERY_CAPTURE_CHANGED');
      } finally { closeSync(fd); }
      if (operation?.beforeHash !== undefined && operation.beforeHash !== hash(data)) fail('E_RECOVERY_CAPTURE_CHANGED');
      result.push({ path, action: operation?.action || 'retain', type: 'file', mode, data });
    }
    for (const [path, before] of identities) {
      const after = item(join(root, ...path.split('/')));
      if (before ? !after || !same(before, after) : after) fail('E_RECOVERY_CAPTURE_CHANGED');
    }
    const rootAfter = knownRoot(root);
    if (rootBefore.dev !== rootAfter.dev || rootBefore.ino !== rootAfter.ino || rootBefore.mode !== rootAfter.mode) fail('E_RECOVERY_CAPTURE_CHANGED');
    return result;
  } catch (error) {
    if (typeof error?.code === 'string' && error.code.startsWith('E_RECOVERY_CAPTURE_')) throw error;
    fail('E_RECOVERY_CAPTURE_IO');
  }
}
