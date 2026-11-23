

export function worktreeWarning(language) {
  return {
    pt: 'Apontamentos, artefatos e dados privados podem ficar visíveis no Git. Confira o status antes de adicionar arquivos. Regras antigas podem afetar outras worktrees.',
    en: 'References, artifacts and private data may remain visible to Git. Check status before adding files. Older rules may affect other worktrees.',
    es: 'Referencias, artefactos y datos privados pueden quedar visibles en Git. Revise el estado antes de agregar archivos. Reglas anteriores pueden afectar otras worktrees.',
  }[language];
}

export function linuxXattrWarning(language) {
  return {
    pt: 'Atributos estendidos em arquivos Linux não foram totalmente verificados; a substituição pode perdê-los. Revise os metadados e mantenha uma cópia que os preserve.',
    en: 'Linux file extended attributes were not fully verified; replacement may lose them. Review metadata and keep a copy that preserves it.',
    es: 'No se verificaron completamente los atributos extendidos en Linux; la sustitución puede perderlos. Revise los metadatos y conserve una copia que los preserve.',
  }[language];
}

export function claudeInspectionWarning(language) {
  return {
    pt: 'Não foi possível verificar as regras Claude; sua ativação pode continuar desconhecida.',
    en: 'Could not inspect Claude rules; their activation may remain unknown.',
    es: 'No fue posible inspeccionar las reglas Claude; su activación puede seguir siendo desconocida.',
  }[language];
}

export function retainedClaudeWarning(language) {
  return {
    pt: 'Regras Claude preservadas podem continuar ativas globalmente; revise-as antes de considerar a desativação concluída.',
    en: 'Preserved Claude rules may still load globally; review them before considering deactivation complete.',
    es: 'Las reglas Claude conservadas pueden seguir activas globalmente; revíselas antes de dar por terminada la desactivación.',
  }[language];
}

export function claudeScopeWarning(language, omissions) {
  if (omissions.some(item => item.status === 'activation-unverified')) return {
    pt: 'A ativação de regras Claude não foi verificada; regras preservadas podem continuar ativas globalmente. Consulte as fontes e revise regras existentes e conflitos.',
    en: 'Claude rule activation is unverified; preserved rules may still load globally. Read their sources and review existing rules and conflicts.',
    es: 'No se ha verificado la activación de reglas Claude; las reglas conservadas pueden seguir activas globalmente. Consulte sus fuentes y revise reglas existentes y conflictos.',
  }[language];
  return {
    pt: 'Algumas regras não têm escopo equivalente comprovado no Claude. Consulte as fontes e revise regras existentes e conflitos antes de presumir sua ativação.',
    en: 'Some rules have no verified equivalent scope in Claude. Read their sources and review existing rules and conflicts before assuming activation.',
    es: 'Algunas reglas no tienen un alcance equivalente comprobado en Claude. Consulte sus fuentes y revise las reglas existentes y los conflictos antes de suponer su activación.',
  }[language];
}
