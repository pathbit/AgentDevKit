export const languages = ['pt', 'en', 'es'];
export function normalizeLanguage(value) {
  const locale = String(value || '').toLowerCase();
  if (locale === 'pt-br') return 'pt';
  return languages.includes(locale) ? locale : null;
}

const messages = {
  pt: {
    recoveryReady: 'O diário está pronto para uma nova operação.',
    recoveryPending: 'O diário registra uma operação pendente.',
    recoveryInvalid: 'O diário está inválido ou ilegível. Preserve os registros para revisão.',
    recoveryPartial: 'O estado do projeto exige revisão. O diagnóstico está limitado às informações legíveis.',
    recoveryPlan: 'Planejamento inconclusivo. A revisão do estado do projeto é necessária antes de gerar outro plano.',
    recoveryBlocked: 'Operação bloqueada pelo diário de recuperação.',
    recoveryResolved: 'A resolução foi registrada. Os arquivos do projeto e o backup foram preservados.',
    recoveryMismatch: 'A geração e o ID precisam corresponder à operação que está pendente.',
    recoveryResolveFailed: 'Não foi possível confirmar a resolução. Consulte o diário antes de repetir.',
    recoveryReview: 'Pare os escritores, preserve uma cópia e compare o backup disponível com os arquivos e o estado atuais. Consulte o diário antes de registrar a resolução.',
    recoveryVerify: 'Execute doctor e confira um novo plano com --dry-run antes de aplicar mudanças.',
    recoveryGeneration: 'Geração',
    recoveryJournal: 'Diário',
    recoveryBackup: 'Backup',
    gitPending: 'Git indisponível ou não inicializado; após instalar e inicializar Git, execute sync --check para verificar arquivos visíveis.',
    trackedLocal: 'Artefatos locais já estão versionados; revise o índice sem excluir conteúdo automaticamente.',
    preserved: 'Caminhos existentes preservados', preservedDetails: 'Use --json para consultar os caminhos e motivos.',
    help: 'AgentDevKit: init [diretório], update, doctor, sync [--check], lang [pt|en|es], agents [lista], next [--intent product|run|document] [--integrations], document [--markdown], tools <ação>, recovery [resolve <geração> <id>].\nOpções: --target <diretório>, --lang <idioma>, --agents <lista>, --purpose <agents|product|run|document>, --yes, --dry-run, --force, --json.\nAliases: --clients e clients.',
    clientsCurrent: 'Agentes selecionados', clientsAvailable: 'Agentes disponíveis', clientsSelect: 'Agentes (IDs separados por vírgula ou all) [all]: ', agents: 'Seleção de agentes atualizada.',
    purposeSelect: 'O que você quer fazer? 1) Configurar agentes  2) Planejar produto  3) Rodar o projeto  4) Documentar sistema existente [1]: ',
    document: 'Levantamento para documentar o sistema existente.',
    next: 'Próximo passo', integrationsFound: 'Referências locais para consultar conforme a tarefa.', integrationsEmpty: 'Nenhum artefato reconhecido nos caminhos padrão. Siga com a etapa indicada.', init: 'Estrutura instalada.', update: 'Estrutura atualizada.', sync: 'Apontamentos sincronizados.', lang: 'Idioma configurado.', unchanged: 'Estrutura já atualizada.', plan: 'Plano calculado; nenhum arquivo alterado.', conflict: 'Há arquivos próprios ou alterados em conflito. Revise o plano e resolva os conflitos; --force não substitui conteúdo próprio.',
    healthy: 'Estrutura verificada.', unhealthy: 'A estrutura precisa de ajustes.', missing: 'AgentDevKit ainda não foi inicializado neste diretório.', error: 'Não foi possível concluir a operação.', invalid: 'Argumentos inválidos.', language: 'Idioma atual', version: 'Versão', select: 'Idioma / Language / Idioma [pt/en/es] (pt): ',
    project: 'Projeto', readme: 'AgentDevKit instalado. Leia AGENTS.md e siga as etapas de produto, design e implementação.', state: 'Estado local do AgentDevKit e configuração compartilhada do projeto.',
    agentLanguage: 'Responda em português, salvo quando o usuário solicitar outro idioma.', inspect: 'Verifique a instalação', workflow: 'Consulte a próxima etapa', install: 'Inicialize este projeto', repair: 'Confira a sincronização', review: 'Revise os arquivos em conflito', tools: 'Resultado da ferramenta',
  },
  en: {
    recoveryReady: 'The journal is ready for a new operation.',
    recoveryPending: 'The journal records a pending operation.',
    recoveryInvalid: 'The journal is invalid or unreadable. Preserve its records for review.',
    recoveryPartial: 'The project state needs review. Diagnostics are limited to readable information.',
    recoveryPlan: 'Planning is inconclusive. Review the project state before generating another plan.',
    recoveryBlocked: 'The recovery journal blocked this operation.',
    recoveryResolved: 'The resolution was recorded. Project files and backups were preserved.',
    recoveryMismatch: 'The generation and ID must match the currently pending operation.',
    recoveryResolveFailed: 'The resolution could not be confirmed. Inspect the journal before retrying.',
    recoveryReview: 'Stop writers, preserve a copy and compare the available backup with the current files and state. Inspect the journal before recording a resolution.',
    recoveryVerify: 'Run doctor and review a new --dry-run plan before applying changes.',
    recoveryGeneration: 'Generation',
    recoveryJournal: 'Journal',
    recoveryBackup: 'Backup',
    gitPending: 'Git is unavailable or not initialized; after installing and initializing Git, run sync --check to inspect visible files.',
    trackedLocal: 'Local artifacts are already tracked; review the index without automatically deleting content.',
    preserved: 'Existing paths preserved', preservedDetails: 'Use --json to inspect paths and reasons.',
    help: 'AgentDevKit: init [directory], update, doctor, sync [--check], lang [pt|en|es], agents [list], next [--intent product|run|document] [--integrations], document [--markdown], tools <action>, recovery [resolve <generation> <id>].\nOptions: --target <directory>, --lang <language>, --agents <list>, --purpose <agents|product|run|document>, --yes, --dry-run, --force, --json.\nAliases: --clients and clients.',
    clientsCurrent: 'Selected agents', clientsAvailable: 'Available agents', clientsSelect: 'Agents (comma-separated IDs or all) [all]: ', agents: 'Agent selection updated.',
    purposeSelect: 'What do you want to do? 1) Set up agents  2) Plan product  3) Run the project  4) Document an existing system [1]: ',
    document: 'Survey for documenting the existing system.',
    next: 'Next step', integrationsFound: 'Local references to consult for the task at hand.', integrationsEmpty: 'No recognized artifacts in the standard locations. Continue with the indicated step.', init: 'Structure installed.', update: 'Structure updated.', sync: 'Pointers synchronized.', lang: 'Language configured.', unchanged: 'Structure is already current.', plan: 'Plan calculated; no files changed.', conflict: 'User files or edits conflict with this plan. Review and resolve the conflicts; --force does not replace user content.',
    healthy: 'Structure verified.', unhealthy: 'The structure needs attention.', missing: 'AgentDevKit has not been initialized in this directory.', error: 'The operation could not be completed.', invalid: 'Invalid arguments.', language: 'Current language', version: 'Version', select: 'Idioma / Language / Idioma [pt/en/es] (pt): ',
    project: 'Project', readme: 'AgentDevKit installed. Read AGENTS.md and follow the product, design and implementation stages.', state: 'AgentDevKit state and shared project configuration.',
    agentLanguage: 'Respond in English unless the user requests another language.', inspect: 'Check the installation', workflow: 'Review the next stage', install: 'Initialize this project', repair: 'Check synchronization', review: 'Review conflicting files', tools: 'Tool result',
  },
  es: {
    recoveryReady: 'El diario está listo para una nueva operación.',
    recoveryPending: 'El diario registra una operación pendiente.',
    recoveryInvalid: 'El diario no es válido o no se puede leer. Conserve los registros para su revisión.',
    recoveryPartial: 'El estado del proyecto requiere revisión. El diagnóstico se limita a la información legible.',
    recoveryPlan: 'La planificación es inconclusa. Revise el estado del proyecto antes de generar otro plan.',
    recoveryBlocked: 'El diario de recuperación bloqueó la operación.',
    recoveryResolved: 'Se registró la resolución. Se conservaron los archivos del proyecto y el respaldo.',
    recoveryMismatch: 'La generación y el ID deben coincidir con la operación pendiente.',
    recoveryResolveFailed: 'No se pudo confirmar la resolución. Consulte el diario antes de reintentar.',
    recoveryReview: 'Detenga los procesos que escriben, conserve una copia y compare el respaldo disponible con los archivos y el estado actuales. Consulte el diario antes de registrar la resolución.',
    recoveryVerify: 'Ejecute doctor y revise un nuevo plan con --dry-run antes de aplicar cambios.',
    recoveryGeneration: 'Generación',
    recoveryJournal: 'Diario',
    recoveryBackup: 'Respaldo',
    gitPending: 'Git no está disponible o no está inicializado; tras instalar e inicializar Git, ejecute sync --check para verificar archivos visibles.',
    trackedLocal: 'Hay artefactos locales versionados; revise el índice sin eliminar contenido automáticamente.',
    preserved: 'Rutas existentes preservadas', preservedDetails: 'Use --json para consultar las rutas y los motivos.',
    help: 'AgentDevKit: init [directorio], update, doctor, sync [--check], lang [pt|en|es], agents [lista], next [--intent product|run|document] [--integrations], document [--markdown], tools <acción>, recovery [resolve <generación> <id>].\nOpciones: --target <directorio>, --lang <idioma>, --agents <lista>, --purpose <agents|product|run|document>, --yes, --dry-run, --force, --json.\nAlias: --clients y clients.',
    clientsCurrent: 'Agentes seleccionados', clientsAvailable: 'Agentes disponibles', clientsSelect: 'Agentes (IDs separados por coma o all) [all]: ', agents: 'Selección de agentes actualizada.',
    purposeSelect: '¿Qué quiere hacer? 1) Configurar agentes  2) Planificar producto  3) Ejecutar el proyecto  4) Documentar sistema existente [1]: ',
    document: 'Relevamiento para documentar el sistema existente.',
    next: 'Próximo paso', integrationsFound: 'Referencias locales para consultar según la tarea.', integrationsEmpty: 'No se reconocieron artefactos en las rutas estándar. Continúe con el paso indicado.', init: 'Estructura instalada.', update: 'Estructura actualizada.', sync: 'Referencias sincronizadas.', lang: 'Idioma configurado.', unchanged: 'La estructura ya está actualizada.', plan: 'Plan calculado; ningún archivo modificado.', conflict: 'Hay archivos propios o cambios en conflicto. Revise y resuelva los conflictos; --force no reemplaza contenido propio.',
    healthy: 'Estructura verificada.', unhealthy: 'La estructura necesita ajustes.', missing: 'AgentDevKit no se ha inicializado en este directorio.', error: 'No se pudo completar la operación.', invalid: 'Argumentos inválidos.', language: 'Idioma actual', version: 'Versión', select: 'Idioma / Language / Idioma [pt/en/es] (pt): ',
    project: 'Proyecto', readme: 'AgentDevKit instalado. Lea AGENTS.md y siga las etapas de producto, diseño e implementación.', state: 'Estado de AgentDevKit y configuración compartida del proyecto.',
    agentLanguage: 'Responde en español salvo que el usuario solicite otro idioma.', inspect: 'Compruebe la instalación', workflow: 'Consulte la siguiente etapa', install: 'Inicialice este proyecto', repair: 'Compruebe la sincronización', review: 'Revise los archivos en conflicto', tools: 'Resultado de la herramienta',
  },
};
export const text = (language, key) => messages[language || 'pt'][key] || key;
export function explainError(language, code, error, { possiblePartial = false } = {}) {
  const migrationReview = {
    pt: 'Migração interrompida para revisão do registro de remoção. Preserve o estado e o arquivo afetado, se existir.',
    en: 'Migration stopped for review of the removal record. Preserve the state and affected file, if present.',
    es: 'Migración detenida para revisar el registro de eliminación. Conserve el estado y el archivo afectado, si existe.',
  }[language || 'pt'];
  if (error?.hardlinkUnsupported) return {
    pt: 'O sistema de arquivos não oferece suporte a hardlinks necessários para a criação segura.',
    en: 'The filesystem does not support hardlinks required for safe creation.',
    es: 'El sistema de archivos no admite los enlaces físicos necesarios para una creación segura.',
  }[language || 'pt'];
  if (possiblePartial) {
    const message = {
      pt: 'Não foi possível concluir a operação; o estado do projeto exige revisão.',
      en: 'The operation could not be completed; the project state needs review.',
      es: 'No se pudo completar la operación; el estado del proyecto requiere revisión.',
    }[language || 'pt'];
    return code === 'E_MIGRATION_REVIEW' ? `${message} ${migrationReview}` : message;
  }
  if (code === 'E_STAGED') return {
    pt: 'Há alterações preparadas diferentes dos arquivos locais; revise-as antes de atualizar.',
    en: 'Staged changes differ from the working files; review them before updating.',
    es: 'Hay cambios preparados distintos de los archivos locales; revíselos antes de actualizar.',
  }[language || 'pt'];
  if (code === 'E_GIT') return {
    pt: 'Não foi possível verificar o índice Git com segurança; nenhum arquivo foi alterado.',
    en: 'The Git index could not be checked safely; no files were changed.',
    es: 'No se pudo verificar el índice Git de forma segura; no se modificaron archivos.',
  }[language || 'pt'];
  if (code === 'E_CONFIG_PARSE') return {
    pt: 'Não foi possível analisar a configuração legada com segurança; revise o frontmatter e as aspas antes de executar update.',
    en: 'The legacy configuration could not be safely parsed; review its frontmatter and quoted values before running update.',
    es: 'No se pudo analizar la configuración anterior de forma segura; revise el frontmatter y las comillas antes de ejecutar update.',
  }[language || 'pt'];
  if (code === 'E_LEGACY_PATH') return {
    pt: 'Ajuste os caminhos .pbai4devs/estado para .pbai4devs/state na configuração antes de executar update.',
    en: 'Change .pbai4devs/estado paths to .pbai4devs/state in the configuration before running update.',
    es: 'Cambie las rutas .pbai4devs/estado por .pbai4devs/state en la configuración antes de ejecutar update.',
  }[language || 'pt'];
  if (code === 'E_UPGRADE') return {
    pt: 'Execute agentdevkit update antes de sincronizar ou alterar a configuração legada.',
    en: 'Run agentdevkit update before syncing or changing the legacy configuration.',
    es: 'Ejecute agentdevkit update antes de sincronizar o cambiar la configuración anterior.',
  }[language || 'pt'];
  if (code === 'E_MIGRATION_REVIEW') return migrationReview;
  if (code === 'E_CLIENTS_RETIRED') return {
    pt: 'A seleção anterior foi aposentada. Consulte agents e escolha um cliente com update --agents <id> --dry-run.',
    en: 'The previous selection was retired. Run agents and choose a client with update --agents <id> --dry-run.',
    es: 'La selección anterior se retiró. Consulte agents y elija un cliente con update --agents <id> --dry-run.',
  }[language || 'pt'];
  const value = {
    pt: { E_ARGS: 'Argumentos inválidos; consulte --help.', E_STATE: 'O estado do AgentDevKit está inválido.', E_SYMLINK: 'Um link simbólico impede a operação segura.', E_TARGET: 'Escolha uma pasta real e segura como destino.', E_PATH: 'Um caminho gerenciado é inválido.', E_BLOCK: 'Os marcadores do bloco gerenciado estão inválidos.', E_CHANGED: 'Um arquivo mudou depois do planejamento; execute novamente.', E_TEMPLATE: 'Um template necessário está inválido.' },
    en: { E_ARGS: 'Invalid arguments; see --help.', E_STATE: 'AgentDevKit state is invalid.', E_SYMLINK: 'A symbolic link prevents this operation.', E_TARGET: 'Choose a real, safe target directory.', E_PATH: 'A managed path is invalid.', E_BLOCK: 'Managed block markers are invalid.', E_CHANGED: 'A file changed after planning; try again.', E_TEMPLATE: 'A required template is invalid.' },
    es: { E_ARGS: 'Argumentos inválidos; consulte --help.', E_STATE: 'El estado de AgentDevKit no es válido.', E_SYMLINK: 'Un enlace simbólico impide la operación segura.', E_TARGET: 'Elija un directorio real y seguro.', E_PATH: 'Una ruta administrada no es válida.', E_BLOCK: 'Los marcadores del bloque no son válidos.', E_CHANGED: 'Un archivo cambió después del plan; ejecute de nuevo.', E_TEMPLATE: 'Una plantilla necesaria no es válida.' },
  };
  return value[language || 'pt'][code] || text(language, code === 'E_MISSING' ? 'missing' : code === 'E_CONFLICT' ? 'conflict' : 'error');
}
