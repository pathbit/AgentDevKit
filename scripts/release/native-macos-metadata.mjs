import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const protections = ['acl-deny', 'immutable'];
const kinds = ['install', 'update', 'sync'];

export const expectedNames = [
  ...['install', 'sync'].flatMap(kind => ['acl', 'xattr'].map(type => `${kind}: atualização preserva ${type} existente no macOS`)),
  ...['install', 'sync'].map(kind => `${kind}: atualização preserva ACL que nega append ou recusa com segurança no macOS`),
  ...kinds.flatMap(kind => protections.map(protection => `${kind}: recusa alteração quando ${protection} nega escrita e preserva estado observado após recusa`)),
];

const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function verifyNativeTests({ root, file, names, env = process.env, exec = spawnSync }) {
  const reserved = ['NODE_OPTIONS', 'NODE_TEST_CONTEXT', 'ADK_STRICT_RECOVERY_TEST'];
  const childEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !reserved.includes(key.toUpperCase())));
  childEnv.ADK_STRICT_RECOVERY_TEST = '1';
  const pattern = `^(?:${names.map(escape).join('|')})$`;
  const result = exec(process.execPath, [
    '--test', '--test-reporter=tap', `--test-name-pattern=${pattern}`, file,
  ], { cwd: root, env: childEnv, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 180000 });

  if (result.error || result.status !== 0) {
    throw new Error(`Gate nativo falhou: ${result.error?.message || result.status}.\n${result.stdout || ''}\n${result.stderr || ''}`);
  }
  const output = result.stdout || '';
  // These checks are flat. A nested skip or TODO cannot count as a pass.
  if (/^ {4,}(?:# Subtest:|(?:not )?ok \d+ - )/m.test(output)) {
    throw new Error('Gate nativo incompleto: subtestes não são aceitos.');
  }
  for (const [key, value] of [['tests', names.length], ['pass', names.length], ['fail', 0], ['cancelled', 0], ['skipped', 0], ['todo', 0]]) {
    const lines = output.split(/\r?\n/).filter(line => line.startsWith(`# ${key} `));
    if (lines.length !== 1 || lines[0] !== `# ${key} ${value}`) throw new Error(`Gate nativo incompleto: resumo ${key} inválido.`);
  }

  const matches = new Map();
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^(not )?ok \d+ - (.*)$/);
    if (!match) continue;
    for (const name of names) {
      if (match[2] !== name && !match[2].startsWith(`${name} # `)) continue;
      const records = matches.get(name) || [];
      records.push({ pass: !match[1], directive: match[2].slice(name.length).trim() });
      matches.set(name, records);
    }
  }
  const invalid = names.filter(name => {
    const found = matches.get(name) || [];
    return found.length !== 1 || !found[0].pass || found[0].directive !== '';
  });
  if (invalid.length) throw new Error(`Gate nativo incompleto: ${invalid.join('; ')}`);
  return names.length;
}

export function nativeGate({ root = process.cwd(), platform = process.platform, env, exec } = {}) {
  if (platform !== 'darwin') throw new Error('O gate nativo exige macOS real.');
  const passed = verifyNativeTests({ root, file: 'tests/concurrent-recovery.test.mjs', names: expectedNames, env, exec });
  return { platform, passed };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(nativeGate({ root: process.argv[2] || process.cwd() }))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
