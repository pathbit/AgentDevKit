import { posix } from 'node:path';
const principals = { skills: 'SKILL.md', agents: 'AGENT.md', commands: 'COMMAND.md', rules: 'RULE.md' };
const layouts = new Set(['agrupado', 'plano', 'arquivo', 'mdc', 'instrucoes', 'prompt', 'agente']);
const fail = message => { throw new Error(message); };
// Layouts de arquivo preservam os grupos, retirando apenas o nome do principal.
export function resourcePath(source, kind, mode = 'agrupado') {
  if (!Object.hasOwn(principals, kind) || !layouts.has(mode)) fail(`Formato invalido: ${kind}/${mode}`);
  const path = source.slice('.pbai4devs/'.length);
  if (mode === 'agrupado') return path;
  const slug = posix.basename(posix.dirname(source));
  if (mode === 'plano') {
    if (!/^[a-z0-9-]+$/.test(slug)) fail(`Nome invalido para layout plano: ${source}`);
    return kind === 'skills' ? `skills/${slug}/SKILL.md` : `${kind}/${slug}.md`;
  }
  if (kind === 'skills') fail(`Skills exigem formato agrupado ou plano: ${mode}`);
  const folder = posix.dirname(path);
  const extensions = { arquivo: '.md', mdc: '.mdc', instrucoes: '.instructions.md', prompt: '.prompt.md', agente: '.agent.md' };
  const scopes = { instrucoes: 'instructions', prompt: 'prompts' };
  return `${scopes[mode] || kind}${folder.slice(kind.length)}${extensions[mode]}`;
}

// Copilot CLI carrega instructions sem applyTo globalmente; escopos sem
// equivalente comprovado ficam disponíveis apenas como referência explícita.
export function clientResourcePath(source, kind, mode, agent, rule, explicitMetadata = false) {
  // Claude carrega regras sem paths globalmente. Sem equivalente comprovado,
  // a origem continua acessível explicitamente no hub; não criar espelho.
  if (agent === '.claude' && kind === 'rules' &&
      (['manual', 'model_decision'].includes(rule?.trigger) || rule?.trigger === 'glob' && !explicitMetadata)) return null;
  if (agent === '.github' && kind === 'rules' && mode === 'instrucoes' &&
      ['manual', 'model_decision'].includes(rule?.trigger) && !explicitMetadata) {
    return resourcePath(source, kind, 'agrupado');
  }
  return resourcePath(source, kind, mode);
}
