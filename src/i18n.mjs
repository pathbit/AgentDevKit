export const languages = ['pt', 'en', 'es'];
export function normalizeLanguage(value) {
  const locale = String(value || '').toLowerCase();
  if (locale === 'pt-br') return 'pt';
  return languages.includes(locale) ? locale : null;
}

const messages = {
  pt: {
    help: 'AgentDevKit: init [diretório], update, doctor, sync [--check], lang [pt|en|es], agents [lista], next, tools <ação>.\nOpções: --target <diretório>, --lang <idioma>, --agents <lista>, --yes, --dry-run, --force, --json.\nAliases: --clients e clients.',
    clientsCurrent: 'Agentes selecionados', clientsAvailable: 'Agentes disponíveis', clientsSelect: 'Agentes (IDs separados por vírgula ou all) [all]: ', agents: 'Seleção de agentes atualizada.',
    next: 'Próximo passo', init: 'Estrutura instalada.', update: 'Estrutura atualizada.', sync: 'Apontamentos sincronizados.', lang: 'Idioma configurado.', unchanged: 'Estrutura já atualizada.', plan: 'Plano calculado; nenhum arquivo alterado.', conflict: 'Há arquivos próprios ou alterados em conflito. Revise o plano; --force salva backup antes de substituir.',
    healthy: 'Estrutura verificada.', unhealthy: 'A estrutura precisa de ajustes.', missing: 'AgentDevKit ainda não foi inicializado neste diretório.', error: 'Não foi possível concluir a operação.', invalid: 'Argumentos inválidos.', language: 'Idioma atual', version: 'Versão', select: 'Idioma / Language / Idioma [pt/en/es] (pt): ',
    project: 'Projeto', readme: 'AgentDevKit instalado. Leia AGENTS.md e siga as etapas de produto, design e implementação.', state: 'Estado local do AgentDevKit e configuração compartilhada do projeto.',
    agentLanguage: 'Responda em português, salvo quando o usuário solicitar outro idioma.', inspect: 'Verifique a instalação', workflow: 'Consulte a próxima etapa', install: 'Inicialize este projeto', repair: 'Confira a sincronização', review: 'Revise os arquivos em conflito', tools: 'Resultado da ferramenta',
  },
  en: {
    help: 'AgentDevKit: init [directory], update, doctor, sync [--check], lang [pt|en|es], agents [list], next, tools <action>.\nOptions: --target <directory>, --lang <language>, --agents <list>, --yes, --dry-run, --force, --json.\nAliases: --clients and clients.',
    clientsCurrent: 'Selected agents', clientsAvailable: 'Available agents', clientsSelect: 'Agents (comma-separated IDs or all) [all]: ', agents: 'Agent selection updated.',
    next: 'Next step', init: 'Structure installed.', update: 'Structure updated.', sync: 'Pointers synchronized.', lang: 'Language configured.', unchanged: 'Structure is already current.', plan: 'Plan calculated; no files changed.', conflict: 'User files or edits conflict with this plan. Review it; --force backs them up before replacement.',
    healthy: 'Structure verified.', unhealthy: 'The structure needs attention.', missing: 'AgentDevKit has not been initialized in this directory.', error: 'The operation could not be completed.', invalid: 'Invalid arguments.', language: 'Current language', version: 'Version', select: 'Idioma / Language / Idioma [pt/en/es] (pt): ',
    project: 'Project', readme: 'AgentDevKit installed. Read AGENTS.md and follow the product, design and implementation stages.', state: 'AgentDevKit state and shared project configuration.',
    agentLanguage: 'Respond in English unless the user requests another language.', inspect: 'Check the installation', workflow: 'Review the next stage', install: 'Initialize this project', repair: 'Check synchronization', review: 'Review conflicting files', tools: 'Tool result',
  },
  es: {
    help: 'AgentDevKit: init [directorio], update, doctor, sync [--check], lang [pt|en|es], agents [lista], next, tools <acción>.\nOpciones: --target <directorio>, --lang <idioma>, --agents <lista>, --yes, --dry-run, --force, --json.\nAlias: --clients y clients.',
    clientsCurrent: 'Agentes seleccionados', clientsAvailable: 'Agentes disponibles', clientsSelect: 'Agentes (IDs separados por coma o all) [all]: ', agents: 'Selección de agentes actualizada.',
    next: 'Próximo paso', init: 'Estructura instalada.', update: 'Estructura actualizada.', sync: 'Referencias sincronizadas.', lang: 'Idioma configurado.', unchanged: 'La estructura ya está actualizada.', plan: 'Plan calculado; ningún archivo modificado.', conflict: 'Hay archivos propios o cambios en conflicto. Revise el plan; --force guarda una copia antes de reemplazarlos.',
    healthy: 'Estructura verificada.', unhealthy: 'La estructura necesita ajustes.', missing: 'AgentDevKit no se ha inicializado en este directorio.', error: 'No se pudo completar la operación.', invalid: 'Argumentos inválidos.', language: 'Idioma actual', version: 'Versión', select: 'Idioma / Language / Idioma [pt/en/es] (pt): ',
    project: 'Proyecto', readme: 'AgentDevKit instalado. Lea AGENTS.md y siga las etapas de producto, diseño e implementación.', state: 'Estado de AgentDevKit y configuración compartida del proyecto.',
    agentLanguage: 'Responde en español salvo que el usuario solicite otro idioma.', inspect: 'Compruebe la instalación', workflow: 'Consulte la siguiente etapa', install: 'Inicialice este proyecto', repair: 'Compruebe la sincronización', review: 'Revise los archivos en conflicto', tools: 'Resultado de la herramienta',
  },
};
export const text = (language, key) => messages[language || 'pt'][key] || key;
export function explainError(language, code) {
  const value = {
    pt: { E_ARGS: 'Argumentos inválidos; consulte --help.', E_STATE: 'O estado do AgentDevKit está inválido.', E_SYMLINK: 'Um link simbólico impede a operação segura.', E_TARGET: 'Escolha uma pasta real e segura como destino.', E_PATH: 'Um caminho gerenciado é inválido.', E_BLOCK: 'Os marcadores do bloco gerenciado estão inválidos.', E_CHANGED: 'Um arquivo mudou depois do planejamento; execute novamente.', E_TEMPLATE: 'Um template necessário está inválido.' },
    en: { E_ARGS: 'Invalid arguments; see --help.', E_STATE: 'AgentDevKit state is invalid.', E_SYMLINK: 'A symbolic link prevents this operation.', E_TARGET: 'Choose a real, safe target directory.', E_PATH: 'A managed path is invalid.', E_BLOCK: 'Managed block markers are invalid.', E_CHANGED: 'A file changed after planning; try again.', E_TEMPLATE: 'A required template is invalid.' },
    es: { E_ARGS: 'Argumentos inválidos; consulte --help.', E_STATE: 'El estado de AgentDevKit no es válido.', E_SYMLINK: 'Un enlace simbólico impide la operación segura.', E_TARGET: 'Elija un directorio real y seguro.', E_PATH: 'Una ruta administrada no es válida.', E_BLOCK: 'Los marcadores del bloque no son válidos.', E_CHANGED: 'Un archivo cambió después del plan; ejecute de nuevo.', E_TEMPLATE: 'Una plantilla necesaria no es válida.' },
  };
  return value[language || 'pt'][code] || text(language, code === 'E_MISSING' ? 'missing' : code === 'E_CONFLICT' ? 'conflict' : 'error');
}
