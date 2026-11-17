import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
// Names and subprocess diagnostics never leave this function.
export function classifyXattr(result) {
  if (!result || result.error || result.signal || result.status !== 0 || !Buffer.isBuffer(result.stdout) || !Buffer.isBuffer(result.stderr) || result.stderr.length) return 'unknown';
  return result.stdout.length ? 'present' : 'empty';
}
export function inspectMacXattr(path) {
  try {
    const result = spawnSync('/usr/bin/xattr', ['-s', '--', path], { env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' }, timeout: 5000, maxBuffer: 65536, encoding: 'buffer', shell: false, windowsHide: true });
    return classifyXattr(result);
  } catch { return 'unknown'; }
}

// Linux can omit inaccessible names from listxattr, including trusted.*.
// A nonempty listing proves presence; an empty one cannot prove absence.
export function inspectLinuxXattr(path) {
  try {
    if (!existsSync('/usr/bin/getfattr')) return 'unknown';
    const result = classifyXattr(spawnSync('/usr/bin/getfattr', ['-h', '-m', '-', '--absolute-names', '--', path], { env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' }, timeout: 5000, maxBuffer: 65536, encoding: 'buffer', shell: false, windowsHide: true }));
    return result === 'present' ? 'present' : 'unknown';
  } catch { return 'unknown'; }
}

// Never expose ls output: it contains the path and ACL principals.
export function classifyMacAcl(result, kind = 'file') {
  if (!['file', 'directory'].includes(kind)) return 'unknown';
  if (!result || result.error || result.signal || result.status !== 0 || !Buffer.isBuffer(result.stdout) || !Buffer.isBuffer(result.stderr) || result.stderr.length || !result.stdout.length) return 'unknown';
  const output = result.stdout.toString('utf8');
  const mode = output.match(kind === 'directory' ? /^d[rwxSTst-]{9}([+@ ])[ \t]+[1-9][0-9]*[ \t]+/ : /^-[rwxSTst-]{9}([+@ ])[ \t]+[1-9][0-9]*[ \t]+/);
  if (!mode || !output.endsWith('\n')) return 'unknown';
  if (/^[ \t]+\d+:[ \t]/m.test(output)) return 'present';
  return mode[1] === '+' ? 'unknown' : 'empty';
}

export function inspectMacAcl(path) {
  try {
    return classifyMacAcl(spawnSync('/bin/ls', ['-lde', '--', path], { env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' }, timeout: 5000, maxBuffer: 65536, encoding: 'buffer', shell: false, windowsHide: true }));
  } catch { return 'unknown'; }
}

export function inspectMacDirectoryAcl(path) {
  try {
    return classifyMacAcl(spawnSync('/bin/ls', ['-lde', '--', path], { env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' }, timeout: 5000, maxBuffer: 65536, encoding: 'buffer', shell: false, windowsHide: true }), 'directory');
  } catch { return 'unknown'; }
}
