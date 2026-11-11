import { delimiter, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { accessSync, constants, statSync } from 'node:fs';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export function requireNode(minimum = 24, version = process.versions.node) {
  if (process.versions.bun || !/^\d+\.\d+\.\d+/.test(version || '') || Number(version.split('.')[0]) < minimum) {
    throw new Error(`Instale Node.js >=${minimum} com npm: https://nodejs.org/en/download .`);
  }
}

export function isMain(metaUrl) {
  return Boolean(process.argv[1]) && metaUrl === pathToFileURL(resolve(process.argv[1])).href;
}

export function findExecutable(name, environment = process.env, platform = process.platform) {
  const extensions = platform === 'win32' ? (environment.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';') : [''];
  const names = platform === 'win32' && !/\.[^/\\]+$/.test(name) ? [name, ...extensions.map(ext => name + ext.toLowerCase())] : [name];
  const directories = isAbsolute(name) ? [''] : (environment.PATH || environment.Path || '').split(delimiter).filter(Boolean);
  for (const directory of directories) for (const candidate of names) {
    const file = directory ? join(directory, candidate) : candidate;
    try {
      if (statSync(file).isFile()) { accessSync(file, platform === 'win32' ? constants.F_OK : constants.X_OK); return resolve(file); }
    } catch { /* Candidato ausente ou sem permissao. */ }
  }
  return null;
}
