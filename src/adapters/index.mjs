import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { resourcePath } from '../../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs';
import { isGeneratedOutput } from '../../.pbai4devs/scripts/lib/gitignore.mjs';

// Política de descoberta por cliente. A cópia instalada usa somente o manifesto.
export const adapters = Object.freeze([
  { id: 'antigravity', root: '.agents', formats: { skills: 'agrupado', agents: 'plano', rules: 'agrupado' }, discovery: 'antigravity', agentMetadata: 'antigravity.yaml', reason: 'Grupos são registrados em manifests nativos; o scan padrão alcança apenas um nível.', sources: ['https://antigravity.google/docs/customization-discovery'] },
  { id: 'antigravity-legacy', root: '.agent', formats: { skills: 'agrupado', agents: 'plano', rules: 'agrupado' }, agentMetadata: 'antigravity.yaml', reason: 'Alias legado; a descoberta agrupada é registrada pelo cliente principal .agents.', sources: ['https://antigravity.google/docs/customization-discovery'] },
  { id: 'claude', root: '.claude', formats: { skills: 'plano', agents: 'plano', commands: 'arquivo' }, agentMetadata: 'claude.yaml', reason: 'Skills e agentes usam o nível documentado; comandos e regras preservam grupos. Monorepos não equivalem a grupos dentro de skills/.', sources: ['https://code.claude.com/docs/en/skills', 'https://code.claude.com/docs/en/sub-agents', 'https://code.claude.com/docs/en/memory'] },
  { id: 'codex', root: '.codex', formats: { skills: 'agrupado' }, reason: 'Skills agrupadas; a entrada nativa de projeto é .agents/skills. Outros recursos em .codex são referências, não registros de agentes.', sources: ['https://learn.chatgpt.com/docs/build-skills', 'https://github.com/openai/codex/blob/392ced7d3a9160fd35d40c606359869215f50522/codex-rs/ext/skills/src/loader/host.rs'] },
  { id: 'cursor', root: '.cursor', formats: { skills: 'agrupado', agents: 'plano', commands: 'plano', rules: 'mdc' }, agentMetadata: 'cursor.yaml', ruleMetadata: 'cursor.yaml', reason: 'Skills e regras aceitam grupos. Agentes e comandos mantêm o formato direto documentado; recursão desses dois tipos não foi confirmada.', sources: ['https://cursor.com/docs/skills', 'https://cursor.com/docs/subagents', 'https://prod.cursor.com/help/customization/rules', 'https://cursor.com/docs/customize-cursor'] },
  { id: 'copilot', root: '.github', formats: { skills: 'plano', agents: 'agente', commands: 'prompt', rules: 'instrucoes' }, agentMetadata: 'github.yaml', reason: 'O scanner CLI/SDK de skills usa subpastas imediatas. Instruções preservam grupos; prompts .prompt.md atendem ao harness Local, não substituem skills Copilot.', sources: ['https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/skills', 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions', 'https://code.visualstudio.com/docs/agent-customization/custom-agents', 'https://code.visualstudio.com/docs/agent-customization/prompt-files'] },
  { id: 'opencode', root: '.opencode', formats: { skills: 'agrupado', agents: 'arquivo', commands: 'arquivo' }, agentMetadata: 'opencode.yaml', reason: 'OpenCode V2 busca SKILL.md em grupos até seis níveis; agentes e comandos aceitam caminhos aninhados. rules/ contém referências, não descoberta nativa.', sources: ['https://opencode.ai/docs/skills', 'https://opencode.ai/docs/agents', 'https://opencode.ai/docs/commands'] },
  { id: 'gemini', root: '.gemini', formats: { skills: 'plano', agents: 'plano', commands: 'arquivo' }, agentMetadata: 'gemini.yaml', reason: 'Skills usam SKILL.md ou */SKILL.md e agentes usam *.md direto. Comandos TOML são recursivos; rules/ contém referências.', sources: ['https://geminicli.com/docs/cli/skills/', 'https://geminicli.com/docs/core/subagents/', 'https://geminicli.com/docs/cli/custom-commands/', 'https://github.com/google-gemini/gemini-cli/blob/be6b6d8ff200c0cda543337c3f70b17c86337d49/packages/core/src/skills/skillLoader.ts'] },
  { id: 'zcode', root: '.zcode', formats: { skills: 'plano', commands: 'plano' }, reason: 'O layout documentado de skills é plano; plugins ignoram grupos. Subagentes de projeto não são confirmados, portanto permanecem referências agrupadas.', sources: ['https://zcode.z.ai/en/docs/skill', 'https://zcode.z.ai/en/docs/commands', 'https://zcode.z.ai/en/docs/subagents'] },
  { id: 'kimi', root: '.kimi-code', formats: { skills: 'agrupado', agents: 'plano' }, agentMetadata: 'kimi-code.yaml', reason: 'O scanner atual percorre agrupadores sem SKILL.md. Comandos precisam de plugin configurado; outros apontamentos não prometem descoberta nativa.', sources: ['https://moonshotai.github.io/kimi-code/en/customization/skills', 'https://github.com/MoonshotAI/kimi-code/blob/482936afceaec4d513aa28f7b7e6b461e35e105f/packages/agent-core-v2/src/features/skill/catalog/fileSkillDiscovery.ts', 'https://moonshotai.github.io/kimi-code/en/customization/plugins.html'] },
  { id: 'kimi-legacy', root: '.kimi', formats: { skills: 'plano' }, reason: 'Compatibilidade com instalações legadas; o cliente atual usa .kimi-code e .agents.', sources: ['https://moonshotai.github.io/kimi-code/en/customization/skills'] },
  { id: 'minimax', root: '.minimax', formats: { skills: 'plano' }, reason: 'O scanner enumera filhos diretos da raiz e lê <nome>/SKILL.md. Agentes, comandos e regras do projeto permanecem referências.', sources: ['https://github.com/MiniMax-AI/minimax-code/blob/3c21163c85a9684030cb147bfef48c6284fa3c46/packages/agent-modules/skills/src/registry.ts', 'https://github.com/MiniMax-AI/minimax-code/blob/3c21163c85a9684030cb147bfef48c6284fa3c46/packages/local-runtime/src/skills/roots.ts'] },
  { id: 'mimo', root: '.mimocode', formats: { skills: 'agrupado', agents: 'plano', commands: 'plano' }, agentMetadata: 'mimocode.yaml', reason: 'Skills usam **/SKILL.md. Agentes e comandos mantêm o nível documentado; rules/ contém referências.', sources: ['https://mimo.xiaomi.com/mimocode/skills', 'https://mimo.xiaomi.com/mimocode/agents', 'https://mimo.xiaomi.com/mimocode/commands'] },
  { id: 'deepseek', root: '.dsh', formats: { skills: 'plano' }, reason: 'O provider oficial descobre apenas <nome>/SKILL.md ou <nome>.md direto e exclui árvores aninhadas. Outros tipos são referências.', sources: ['https://github.com/deepseek-ai/deepseek-harness/blob/e8f7b93a344964de3dca1ace9e72b6e4d6de87cb/packages/skill/skill-filesystem/README.md'] },
]);

export const adapterRoots = Object.freeze([...adapters.map(adapter => adapter.root), '.vscode']);
const principal = { skills: 'SKILL.md', agents: 'AGENT.md', commands: 'COMMAND.md', rules: 'RULE.md' };
const stat = path => { try { return lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } };

function checked(root, relative) {
  let path = root;
  for (const part of relative.split('/')) {
    if (!part || part === '.' || part === '..') throw new Error(`Caminho de adaptador invalido: ${relative}`);
    if (stat(path)?.isDirectory() && readdirSync(path).some(name => name.toLowerCase() === part.toLowerCase() && name !== part)) throw new Error(`Capitalizacao ambigua: ${relative}`);
    path = join(path, part);
    if (stat(path)?.isSymbolicLink()) throw new Error(`Link simbolico no adaptador: ${relative}`);
  }
  return path;
}

function sources(root, kind) {
  const result = [];
  function visit(relative) {
    const path = checked(root, relative);
    const item = stat(path);
    if (!item) return;
    if (!item.isDirectory()) throw new Error(`Diretorio de recursos invalido: ${relative}`);
    for (const name of readdirSync(path).sort()) {
      const child = `${relative}/${name}`, file = checked(root, child), info = stat(file);
      if (isGeneratedOutput(child, info.isDirectory())) continue;
      if (info.isDirectory()) visit(child);
      else if (info.isFile() && name === principal[kind]) result.push(child);
    }
  }
  visit(`.pbai4devs/${kind}`);
  return result;
}

export function adapterManifest(root) {
  root = realpathSync(resolve(root));
  const rows = ['# Gerado por AgentDevKit; sincronizacao instalada nao depende do pacote npm.', '# tipo|cliente|recurso ou layout|formato ou metadados'];
  const resources = Object.fromEntries(Object.keys(principal).map(kind => [kind, sources(root, kind)]));
  for (const adapter of adapters) {
    rows.push(`# ${adapter.id}: ${adapter.reason}`, `agente|${adapter.root}|agrupado`);
    for (const [kind, mode] of Object.entries(adapter.formats)) rows.push(`formato|${adapter.root}|${kind}|${mode}`);
    if (adapter.discovery) rows.push(`descoberta|${adapter.root}|${adapter.discovery}`);
    for (const [kind, key] of [['agents', 'agentMetadata'], ['rules', 'ruleMetadata']]) {
      if (!adapter[key]) continue;
      for (const source of resources[kind]) {
        const metadata = `${source.slice(0, source.lastIndexOf('/'))}/${adapter[key]}`;
        if (!stat(checked(root, metadata))?.isFile()) continue;
        const target = `${adapter.root}/${resourcePath(source, kind, adapter.formats[kind] || 'agrupado')}`;
        rows.push(`nativo|${target}|${source}|${metadata}`);
      }
    }
  }
  rows.push('gitignore|.vscode');
  return rows.join('\n') + '\n';
}

// Somente configura a politica. O chamador decide quando planejar/aplicar o sync.
export function writeAdapterManifest(root) {
  root = realpathSync(resolve(root));
  const relative = '.pbai4devs/espelhos.conf';
  const file = checked(root, relative), content = adapterManifest(root);
  const info = stat(file);
  if (info && !info.isFile()) throw new Error('espelhos.conf deve ser arquivo regular.');
  if (info && readFileSync(file, 'utf8') === content) return { changed: [], roots: [...adapterRoots] };
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${randomUUID()}`;
  try { writeFileSync(temporary, content, { flag: 'wx' }); renameSync(temporary, file); }
  finally { rmSync(temporary, { force: true }); }
  return { changed: [relative], roots: [...adapterRoots] };
}
