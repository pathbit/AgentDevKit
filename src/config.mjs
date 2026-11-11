import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const frameworkRoot = resolve(packageRoot, '.pbai4devs');
export const packageInfo = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
export const statePath = '.pbai4devs/estado/agentdevkit.json';
export const entryNames = ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'];
export const begin = '<!-- BEGIN AGENTDEVKIT -->';
export const end = '<!-- END AGENTDEVKIT -->';
export const releaseCommand = `npx --yes --ignore-scripts --package=https://github.com/pathbit/AgentDevKit/releases/download/v${packageInfo.version}/agentdevkit-${packageInfo.version}.tgz agentdevkit`;
