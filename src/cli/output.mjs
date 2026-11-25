import { text } from '../i18n.mjs';
import { nextCommand } from '../next.mjs';
import { renderLegacyDocumentation } from '../legacy-documentation.mjs';
import { isBlockingLocalIgnore } from '../../.pbai4devs/scripts/lib/gitignore.mjs';

export function print(result, options, output) {
  if (options.json) { output.write(`${JSON.stringify(result)}\n`); return; }
  if (result.documentation) {
    output.write(`${renderLegacyDocumentation(result.documentation, result.language, { frontmatter: Boolean(options.markdown) })}\n`);
    if (options.markdown) return;
  } else output.write(`${result.message}\n`);
  for (const method of result.integrations || []) {
    output.write(`\n${method.name}\n  ${method.paths.join(', ')}\n  ${method.instruction}\n  ${method.url}\n`);
    if (method.plugin) output.write(`  ${nextCommand(`plugins info ${method.plugin}`, result.target, result.language)}\n`);
  }
  const operation = result.recovery?.id ? result.recovery : result.error?.operation;
  if (operation) output.write(`${text(result.language, 'recoveryGeneration')} ${operation.generation} · ID ${operation.id}${operation.phase || operation.kind ? ' · ' + (operation.phase || operation.kind) : ''}\n`);
  if (result.recovery?.journal) output.write(`${text(result.language, 'recoveryJournal')} ${JSON.stringify(result.recovery.journal)}\n`);
  if (result.recovery?.backup) output.write(`${text(result.language, 'recoveryBackup')} ${JSON.stringify(result.recovery.backup)}\n`);
  if (result.error?.scope === 'staging') {
    const labels = { pt: 'A falha ocorreu no estágio temporário, não identifica um caminho do projeto.', en: 'The failure occurred in private staging and does not identify a project path.', es: 'El error ocurrió en el área temporal y no identifica una ruta del proyecto.' };
    output.write(`${labels[result.language]}\n`);
  }
  if (['E_PROTECTED_METADATA', 'E_METADATA_UNSUPPORTED'].includes(result.error?.code) && typeof result.error.path === 'string'
    && !(result.issues || []).some(item => item.path === result.error.path && item.code === result.error.metadataReason)) {
    const labels = result.error.metadataReason === 'file-owner-different'
      ? { pt: 'Arquivo pertence a outro usuário; preserve e revise', en: 'File belongs to another user; preserve and review', es: 'El archivo pertenece a otro usuario; conserve y revise' }
      : result.error.metadataReason === 'file-owner-unverified' || result.error.metadataReason === 'owner-read-unverified'
      ? { pt: 'Proprietário ou leitura não verificados; preserve e revise', en: 'Owner or read access could not be verified; preserve and review', es: 'Propietario o lectura no verificados; conserve y revise' }
      : result.error.metadataReason === 'acl-present'
      ? { pt: 'Arquivo possui ACL; revise', en: 'File has an ACL; review', es: 'Archivo tiene ACL; revise' }
      : result.error.metadataReason === 'acl-unverified'
        ? { pt: 'ACL do arquivo não verificada; revise', en: 'File ACL could not be verified; review', es: 'ACL del archivo no verificada; revise' }
        : result.error.metadataReason === 'hardlink-unverified'
      ? { pt: 'Contagem de hardlinks não verificada; revise', en: 'Hardlink count could not be verified; review', es: 'Número de enlaces físicos no verificado; revise' }
      : result.error.metadataReason === 'hardlink-shared'
      ? { pt: 'Arquivo possui hardlinks compartilhados; revise', en: 'File has shared hardlinks; review', es: 'Archivo tiene enlaces físicos compartidos; revise' }
      : result.error.metadataReason === 'xattr-directory-present'
      ? { pt: 'Diretório tem atributos estendidos; revise', en: 'Directory has extended attributes; review', es: 'Directorio tiene atributos extendidos; revise' }
      : result.error.metadataReason === 'xattr-directory-unverified'
        ? { pt: 'Atributos estendidos do diretório não verificados; revise', en: 'Directory extended attributes could not be verified; review', es: 'Atributos extendidos del directorio no verificados; revise' }
        : result.error.metadataReason === 'special-mode-directory'
      ? { pt: 'Diretório com bits POSIX especiais; revise', en: 'Directory has special POSIX mode bits; review', es: 'Directorio con bits POSIX especiales; revise' }
      : result.error.metadataReason === 'xattr-present'
      ? { pt: 'Arquivo tem atributos estendidos; revise', en: 'File has extended attributes; review', es: 'Archivo tiene atributos extendidos; revise' }
      : result.error.metadataReason === 'xattr-unverified'
        ? { pt: 'Atributos estendidos não verificados; revise', en: 'Extended attributes could not be verified; review', es: 'Atributos extendidos no verificados; revise' }
        : { pt: 'Arquivo com bits POSIX especiais; revise', en: 'File has special POSIX mode bits; review', es: 'Archivo con bits POSIX especiales; revise' };
    output.write(`${labels[result.language]}: ${result.error.path}\n`);
  }
  const reviewPaths = [...new Set([...(result.error?.preservedPaths || []), ...(result.error?.cleanupFailures || []).map(item => item.path)])];
  if (reviewPaths.length) {
    const labels = { pt: 'Revise os caminhos preservados', en: 'Review preserved paths', es: 'Revise las rutas preservadas' };
    output.write(`${labels[result.language]}: ${reviewPaths.slice(0, 5).join(', ')}${reviewPaths.length > 5 ? ` (+${reviewPaths.length - 5}; --json)` : ''}.\n`);
  }
  if (result.error?.diagnosticsTruncated) output.write(`${{ pt: 'Diagnósticos adicionais foram limitados.', en: 'Additional diagnostics were limited.', es: 'Se limitaron los diagnósticos adicionales.' }[result.language]}\n`);
  if (result.warnings?.length) for (const warning of result.warnings) output.write(`${warning}\n`);
  if (result.error?.code === 'E_UPGRADE' && result.error.path) output.write(`${result.error.path}\n`);
  if (result.clients) output.write(`${text(result.language, 'clientsCurrent')}: ${result.clients.join(', ')}\n`);
  if (result.availableClients) output.write(`${text(result.language, 'clientsAvailable')}: ${result.availableClients.map(client => client.id).join(', ')}\n`);
  if (result.command === 'plugins') {
    for (const plugin of result.plugins ?? (result.plugin ? [result.plugin] : [])) {
      output.write(`  ${plugin.id} · ${plugin.kind}${plugin.reviewStatus ? ` · ${plugin.reviewStatus}` : ''}\n`);
      if (!result.plugin) continue;
      if (plugin.description) output.write(`  ${plugin.description}\n`);
      if (plugin.source.url) output.write(`  ${plugin.source.url}\n`);
      if (plugin.license) output.write(`  ${plugin.license}${plugin.licenseSource ? ` · ${plugin.licenseSource}` : ''}\n`);
      if (result.status) output.write(`  ${text(result.language, result.status)}\n`);
    }
    if (result.error?.code === 'E_PLUGIN') output.write(`${result.error.detail}\n`);
  }
  if (result.toolOutput) output.write(`${result.toolOutput.trimEnd()}\n`);
  if (result.preserved?.length) output.write(`${text(result.language, 'preserved')}: ${result.preserved.length}. ${text(result.language, 'preservedDetails')}\n`);
  const pending = result.localIgnore?.pending || [];
  const displayedPending = [...pending.filter(isBlockingLocalIgnore), ...pending.filter(item => !isBlockingLocalIgnore(item))];
  for (const item of displayedPending.slice(0, 5)) output.write(`  ${item.code}: ${item.path}${item.pattern ? ` (${item.pattern})` : ''}\n`);
  const morePending = { pt: 'use --json para detalhes', en: 'use --json for details', es: 'use --json para los detalles' }[result.language];
  if (pending.length > 5) output.write(`  +${pending.length - 5}; ${morePending}.\n`);
  const legacyIgnore = [...pending, ...(result.issues || [])].find(item => item.code === 'shared-ignore-legacy');
  if (legacyIgnore) {
    const guidance = legacyIgnore.migration === 'migration' ? {
      pt: 'Bloco legado reconhecido em info/exclude. Use update ou sync para migrá-lo e guardar uma cópia local.',
      en: 'Recognized legacy block in info/exclude. Run update or sync to migrate it and keep a local copy.',
      es: 'Bloque anterior reconocido en info/exclude. Use update o sync para migrarlo y guardar una copia local.',
    } : {
      pt: 'Marcador semelhante ao legado em info/exclude: regras podem afetar arquivos não rastreados em outras worktrees. Revise o arquivo e as worktrees antes de alterá-lo.',
      en: 'Legacy-like marker in info/exclude: rules may affect untracked files in other worktrees. Review the file and worktrees before changing it.',
      es: 'Marcador similar al anterior en info/exclude: las reglas pueden afectar archivos no rastreados en otros worktrees. Revise el archivo y los worktrees antes de cambiarlo.',
    };
    output.write(`${guidance[result.language]}\n`);
  }
  const excludeMigration = result.localIgnore?.legacyMigration;
  if (excludeMigration?.status === 'applied') {
    const label = { pt: 'Cópia do exclude original', en: 'Original exclude backup', es: 'Copia del exclude original' };
    output.write(`${label[result.language]}: ${excludeMigration.backup}/exclude\n`);
  }
  if (result.plan?.length) {
    const names = { pt: { create: 'criar', update: 'atualizar', remove: 'remover' }, en: { create: 'create', update: 'update', remove: 'remove' }, es: { create: 'crear', update: 'actualizar', remove: 'eliminar' } };
    const labels = {
      pt: { files: 'Arquivos', more: 'caminhos adicionais; use --json para o plano completo.' },
      en: { files: 'Files', more: 'additional paths; use --json for the complete plan.' },
      es: { files: 'Archivos', more: 'rutas adicionales; use --json para el plan completo.' },
    }[result.language];
    output.write(`${labels.files}: ${['create', 'update', 'remove'].map(action => `${result.plan.filter(item => item.action === action).length} ${names[result.language][action]}`).join(', ')}.\n`);
    if (options.dryRun) {
      const limit = 12;
      for (const item of result.plan.slice(0, limit)) output.write(`  ${names[result.language][item.action]} ${item.path}${item.conflict ? ' [!]' : ''}\n`);
      if (result.plan.length > limit) output.write(`  +${result.plan.length - limit} ${labels.more}\n`);
    }
  }
  if (result.conflicts?.length) {
    const labels = {
      pt: { conflicts: 'Conflitos', more: 'mais; use --json para a lista completa' },
      en: { conflicts: 'Conflicts', more: 'more; use --json for the full list' },
      es: { conflicts: 'Conflictos', more: 'más; use --json para la lista completa' },
    }[result.language];
    const paths = result.conflicts.slice(0, 5).map(path => JSON.stringify(path));
    output.write(`${labels.conflicts}: ${result.conflicts.length}. ${paths.join(', ')}${result.conflicts.length > 5 ? ` (+${result.conflicts.length - 5} ${labels.more})` : ''}\n`);
  }
  if (result.issues?.length) for (const item of result.issues) {
    const cause = typeof item.causeCode === 'string' && /^[A-Z][A-Z0-9_]{0,31}$/.test(item.causeCode) ? ` (${item.causeCode})` : '';
    const labels = {
      'file-owner-different': { pt: 'Arquivo pertence a outro usuário; preserve e revise', en: 'File belongs to another user; preserve and review', es: 'El archivo pertenece a otro usuario; conserve y revise' },
      'file-owner-unverified': { pt: 'Proprietário do arquivo não verificado; preserve e revise', en: 'File owner could not be verified; preserve and review', es: 'Propietario del archivo no verificado; conserve y revise' },
      'owner-read-unverified': { pt: 'Leitura pelo proprietário não verificada; preserve e revise', en: 'Owner read access could not be verified; preserve and review', es: 'Lectura por el propietario no verificada; conserve y revise' },
      'hardlink-shared': { pt: 'Arquivo possui hardlinks compartilhados; revise', en: 'File has shared hardlinks; review', es: 'Archivo tiene enlaces físicos compartidos; revise' },
      'hardlink-unverified': { pt: 'Contagem de hardlinks não verificada; revise', en: 'Hardlink count could not be verified; review', es: 'Número de enlaces físicos no verificado; revise' },
      'acl-present': { pt: 'Arquivo possui ACL; revise', en: 'File has an ACL; review', es: 'Archivo tiene ACL; revise' },
      'acl-unverified': { pt: 'ACL do arquivo não verificada; revise', en: 'File ACL could not be verified; review', es: 'ACL del archivo no verificada; revise' },
      'xattr-present': { pt: 'Atributos estendidos detectados; revise', en: 'Extended attributes detected; review', es: 'Atributos extendidos detectados; revise' },
      'derived-file-diverged': { pt: 'Registro derivado diverge do TOML preservado; revise', en: 'Derived record differs from the preserved TOML; review', es: 'El registro derivado difiere del TOML conservado; revise' },
      'derived-file-missing': { pt: 'Arquivo preservado do registro derivado ausente; revise', en: 'Preserved file in derived record is missing; review', es: 'Falta el archivo conservado del registro derivado; revise' },
      'derived-file-unverified': { pt: 'Não foi possível verificar o arquivo do registro derivado; revise', en: 'Could not verify the file in the derived record; review', es: 'No se pudo verificar el archivo del registro derivado; revise' },
      'removed-file-unverified': { pt: 'Registro de remoção sem entrada no estado instalado; preserve e revise', en: 'Removal record has no entry in installed state; preserve and review', es: 'Registro de eliminación sin entrada en el estado instalado; conserve y revise' },
      'protected-state-directory': { pt: 'Diretório de estado com bits POSIX especiais; preserve e revise', en: 'State directory has special POSIX bits; preserve and review', es: 'Directorio de estado con bits POSIX especiales; conserve y revise' },
      'state-directory-xattr-present': { pt: 'Diretório de estado com atributos estendidos; preserve e revise', en: 'State directory has extended attributes; preserve and review', es: 'Directorio de estado con atributos extendidos; conserve y revise' },
      'state-directory-xattr-unverified': { pt: 'Atributos estendidos do diretório de estado não verificados; preserve e revise', en: 'State directory extended attributes not verified; preserve and review', es: 'Atributos extendidos del directorio de estado no verificados; conserve y revise' },
      'plan-inspection-failed': { pt: 'Não foi possível concluir o planejamento', en: 'Could not complete planning', es: 'No se pudo completar la planificación' },
    };
    const label = labels[item.code]?.[result.language] ?? item.code;
    const prior = item.observedBeforePlanFailure ? {
      pt: ' (observado antes da falha no planejamento)',
      en: ' (observed before planning failed)',
      es: ' (observado antes del fallo de planificación)',
    }[result.language] : '';
    const observations = {
      'claude-metadata-unverified': { pt: 'arquivo preservado; metadados não verificados', en: 'file preserved; metadata not verified', es: 'archivo conservado; metadatos no verificados' },
      'symbolic-link': { pt: 'link simbólico preservado', en: 'symbolic link preserved', es: 'enlace simbólico conservado' },
      'non-directory': { pt: 'caminho ancestral preservado', en: 'ancestor path preserved', es: 'ruta ancestral conservada' },
      'existing-directory': { pt: 'diretório existente preservado', en: 'existing directory preserved', es: 'directorio existente conservado' },
    };
    const observation = observations[item.preservationReason]?.[result.language];
    output.write(`  ${label}${item.path ? `: ${item.path}` : ''}${cause}${prior}${observation ? ` (${observation})` : ''}\n`);
  }
  output.write(`\n[ ${text(result.language, 'next')} ]\n`);
  for (const step of result.next) {
    output.write(`  ${step.label}\n`);
    if (step.skill) output.write(`  ${step.skill}\n`);
    if (step.instruction) output.write(`  ${step.instruction}\n`);
    for (const path of step.references ?? []) output.write(`    - ${path}\n`);
    if (step.command) output.write(`  > ${step.command}\n`);
  }
}
