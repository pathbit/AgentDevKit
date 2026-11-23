import { lstatSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { packageRoot } from './config.mjs';
import { resolveTarget } from './install.mjs';
import { ToolManager, loadCatalog as loadTools } from '../.pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs';
import { ExternalSkills, loadCatalog as loadSkills, safePath, sourceUrl } from '../.pbai4devs/scripts/gerenciar-skills-externas/SCRIPT.mjs';

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const text = value => typeof value === 'string' ? value.replace(/[\p{Cc}\p{Cf}]/gu, ' ').trim() : '';

function fail(message, code = 'E_PLUGIN') {
  throw Object.assign(new Error(message), { code });
}

function publicUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function describeTool(entry) {
  const { provider, repository, package: packageName, channel, version } = entry.download;
  return {
    id: entry.name, kind: 'tool', name: entry.name, description: text(entry.description), group: entry.group,
    source: { provider, repository, url: publicUrl(entry.source), channel, ...(packageName ? { package: packageName } : { version }) },
    license: text(entry.license) || null, licenseSource: publicUrl(entry.licenseSource),
    platforms: [...entry.platforms],
    ...(entry.optIn ? { optIn: true } : {}),
  };
}

function describeSkill(entry) {
  const notes = text(entry.notes);
  return {
    id: entry.id, kind: 'external-skill', name: entry.name, description: text(entry.use),
    source: { provider: 'github', repository: entry.repository, url: sourceUrl(entry), commit: entry.commit, path: entry.path },
    license: text(entry.license), licenseSource: publicUrl(entry.licenseSource), reviewStatus: entry.status,
    ...(notes ? { notes } : {}),
  };
}

function catalogs(root) {
  const tools = loadTools(root);
  const skillFile = safePath(root, '.pbai4devs/external-skills/CATALOG.json');
  if (!lstatSync(skillFile).isFile()) fail('The external skills catalog must be a regular file.');
  const skills = loadSkills(root);
  const entries = new Map(Object.values(tools).map(entry => [entry.name, describeTool(entry)]));
  for (const entry of skills.skills) {
    if (entries.has(entry.id)) fail(`Ambiguous plugin ID: ${entry.id}.`);
    entries.set(entry.id, describeSkill(entry));
  }
  return { tools, skills, entries };
}

export async function runPlugin({ action, id, target, installed }) {
  if (!['list', 'info', 'install', 'check'].includes(action)
    || (action === 'list' ? id !== undefined : typeof id !== 'string' || !idPattern.test(id))) {
    fail('Use plugins list or plugins info|install|check <id>.');
  }
  if (!installed && (action === 'install' || action === 'check')) fail('Initialize the kit before installing or checking a plugin.', 'E_MISSING');

  try {
    const root = installed ? resolveTarget(target) : packageRoot;
    const { tools, skills, entries } = catalogs(root);
    if (action === 'list') return { ok: true, plugins: [...entries.values()].sort((a, b) => a.id.localeCompare(b.id)) };
    const plugin = entries.get(id);
    if (!plugin) fail(`Unknown plugin: ${id}.`);
    if (action === 'info' && (!installed || plugin.kind === 'external-skill')) return { ok: true, plugin };

    if (plugin.kind === 'tool') {
      const manager = new ToolManager({ root, catalog: tools });
      if (action === 'info') {
        const { supported, installed: local } = manager.info(id);
        return { ok: true, plugin: { ...plugin, supported, installation: local } };
      }
      const { version, platform, layout, changed } = await manager[action](id);
      return {
        ok: true, plugin: { ...plugin, installation: { version, platform, layout } },
        status: action === 'check' ? 'ready' : changed ? 'installed' : 'already-installed',
      };
    }

    const manager = new ExternalSkills({ root, catalog: skills });
    const { commit, file, changed } = await manager[action](id);
    return {
      ok: true, plugin: { ...plugin, installation: { commit, file: relative(root, file).split(sep).join('/') } },
      status: action === 'check' ? 'ready' : changed ? 'installed' : 'already-installed',
    };
  } catch (error) {
    if (error.code === 'E_PLUGIN') throw error;
    fail(text(error.message).slice(0, 500) || 'Could not inspect or prepare the plugin.');
  }
}
