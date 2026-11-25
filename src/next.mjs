import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { packageRoot, releaseCommand } from './config.mjs';
import { text as cliText } from './i18n.mjs';
import { hasLegacyDocumentationSkill } from './legacy-documentation.mjs';
import { inspectIntegrations, inspectProject } from '../.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs';

const messages = {
  pt: {
    install: 'Instale o AgentDevKit neste projeto.', verify: 'Confira a instalação.',
    configure: 'Conclua a preparação inicial.', prepare: 'Prepare o ambiente existente.',
    prd: 'Defina ou conclua o PRD.', ux: 'Defina UX/UI ou justifique sua não aplicação.',
    design: 'Conclua o design técnico.',
    spec: 'Defina a próxima spec.', implement: 'Planeje a implementação da spec.', roadmap: 'Revise o roadmap e escolha o próximo incremento.',
    inspect: 'Confira o estado do projeto antes de avançar.',
    incomplete: 'O inventário do projeto está incompleto.',
    incompleteInstruction: 'Inspecione manualmente a estrutura e os documentos antes de escolher uma etapa; não presuma que o projeto está vazio.',
    productPreparation: 'Inventarie e mapeie documentos e decisões existentes antes de registrar a preparação; não presuma que estejam ausentes.',
    productReview: 'Confira o estado, os caminhos e as evidências dos documentos existentes antes de escolher uma etapa; não presuma ausência ou aprovação.',
    productEvidence: 'Confira os documentos e as evidências de aprovação; status registrado, por si só, não comprova aprovação.',
    ask: 'Use a skill indicada no agente; confirme as decisões ainda pendentes.',
    existing: 'Preserve código e decisões existentes; não reinicie a definição do produto.',
    runReferences: 'Confira estes arquivos antes de escolher o comando de execução.',
    runUnknown: 'Identifique o módulo ou peça o comando usado pela equipe. Consulte o README do projeto quando houver.',
    partial: 'A operação pode ter deixado alterações ou arquivos temporários.',
    partialInstruction: 'Interrompa outras operações; preserve arquivos e backups e revise o estado antes de tentar novamente. Backups podem estar incompletos: compare-os antes de restaurar.',
    check: 'Confira se os recursos dos agentes estão sincronizados.',
    next: 'Consulte a próxima etapa do projeto.',
    preview: 'Veja o plano de sincronização antes de aplicar.',
    apply: 'Aplique somente após revisar o plano.',
    review: 'Revise os itens apontados e repita a verificação.',
    integrations: 'Veja os artefatos de outros métodos que podem ajudar nesta tarefa.',
    document: 'Levante evidências para documentar o sistema existente.',
    documentReview: 'Valide os comportamentos com as evidências e complemente os documentos acordados.',
    documentUpdate: 'Atualize o kit para disponibilizar a skill de documentação.',
  },
  en: {
    install: 'Install AgentDevKit in this project.', verify: 'Check the installation.',
    configure: 'Complete the initial preparation.', prepare: 'Prepare the existing environment.',
    prd: 'Define or complete the PRD.', ux: 'Define UX/UI or document why it does not apply.',
    design: 'Complete the technical design.',
    spec: 'Define the next spec.', implement: 'Plan the spec implementation.', roadmap: 'Review the roadmap and select the next increment.',
    inspect: 'Inspect the project before proceeding.',
    incomplete: 'The project inventory is incomplete.',
    incompleteInstruction: 'Inspect the structure and documents manually before choosing a step; do not assume the project is empty.',
    productPreparation: 'Inventory and map existing documents and decisions before recording preparation; do not assume they are absent.',
    productReview: 'Check the state, paths and evidence of existing documents before choosing a step; do not assume absence or approval.',
    productEvidence: 'Check the documents and evidence of approval; a recorded status alone does not establish approval.',
    ask: 'Use the indicated skill in your agent; confirm outstanding decisions.',
    existing: 'Preserve existing code and decisions; do not restart product discovery.',
    runReferences: 'Review these files before choosing a startup command.',
    runUnknown: 'Identify the module or ask for the command the team uses. Check the project README when available.',
    partial: 'The operation may have left changes or temporary files.',
    partialInstruction: 'Stop other operations; preserve files and backups and review the state before retrying. Backups may be incomplete: compare them before restoring.',
    check: 'Check whether your agent resources are in sync.',
    next: 'Find the next step for this project.',
    preview: 'Review the synchronization plan before applying it.',
    apply: 'Apply only after reviewing the plan.',
    review: 'Review the reported items and run the check again.',
    integrations: 'Find artifacts from other methods that can help with this task.',
    document: 'Gather evidence to document the existing system.',
    documentReview: 'Verify behavior against the evidence and supplement the agreed documents.',
    documentUpdate: 'Update the kit to add the documentation skill.',
  },
  es: {
    install: 'Instale AgentDevKit en este proyecto.', verify: 'Compruebe la instalación.',
    configure: 'Complete la preparación inicial.', prepare: 'Prepare el entorno existente.',
    prd: 'Defina o complete el PRD.', ux: 'Defina UX/UI o justifique que no se aplica.',
    design: 'Complete el diseño técnico.',
    spec: 'Defina la próxima spec.', implement: 'Planifique la implementación de la spec.', roadmap: 'Revise el roadmap y elija el próximo incremento.',
    inspect: 'Inspeccione el proyecto antes de continuar.',
    incomplete: 'El inventario del proyecto está incompleto.',
    incompleteInstruction: 'Inspeccione manualmente la estructura y los documentos antes de elegir una etapa; no suponga que el proyecto está vacío.',
    productPreparation: 'Inventaríe y relacione los documentos y decisiones existentes antes de registrar la preparación; no suponga que faltan.',
    productReview: 'Revise el estado, las rutas y las evidencias de los documentos existentes antes de elegir una etapa; no suponga ausencia ni aprobación.',
    productEvidence: 'Revise los documentos y las evidencias de aprobación; un estado registrado no demuestra por sí solo la aprobación.',
    ask: 'Use la skill indicada en su agente y confirme las decisiones pendientes.',
    existing: 'Preserve el código y las decisiones existentes; no reinicie el producto.',
    runReferences: 'Revise estos archivos antes de elegir el comando de ejecución.',
    runUnknown: 'Identifique el módulo o pida el comando que usa el equipo. Consulte el README del proyecto si está disponible.',
    partial: 'La operación puede haber dejado cambios o archivos temporales.',
    partialInstruction: 'Detenga otras operaciones; conserve archivos y respaldos y revise el estado antes de reintentar. Los respaldos pueden estar incompletos: compárelos antes de restaurar.',
    check: 'Compruebe si los recursos de sus agentes están sincronizados.',
    next: 'Consulte el siguiente paso del proyecto.',
    preview: 'Revise el plan de sincronización antes de aplicarlo.',
    apply: 'Aplique el plan después de revisarlo.',
    review: 'Revise los elementos indicados y repita la comprobación.',
    integrations: 'Busque artefactos de otros métodos que puedan ayudar con esta tarea.',
    document: 'Reúna evidencias para documentar el sistema existente.',
    documentReview: 'Verifique los comportamientos con las evidencias y complete los documentos acordados.',
    documentUpdate: 'Actualice el kit para disponer de la skill de documentación.',
  },
};

const productStages = {
  configure: 'preparacao', prd: 'prd', ux: 'ux', design: 'design',
  roadmap: 'roadmap', spec: 'spec', implement: 'implementacao', inspect: 'inspecao',
};

function quote(value, platform) {
  return platform === 'win32' ? `'${String(value).replaceAll("'", "''")}'`
    : `'${String(value).replaceAll("'", "'\\''")}'`;
}

function commandLine(args, platform) {
  return (platform === 'win32' ? '& ' : '') + args.map(value => quote(value, platform)).join(' ');
}

export function nextCommand(action, target, language, platform = process.platform, useCurrentPackage = false) {
  const executable = useCurrentPackage
    ? commandLine([process.execPath, join(packageRoot, 'bin/agentdevkit.mjs')], platform)
    : `${platform === 'win32' ? '& ' : ''}${releaseCommand}`;
  return `${executable} ${action} --target ${quote(target, platform)} --lang ${quote(language, platform)}`;
}

function workflow(report, intent) {
  const state = report.maturity;
  const app = state.signals.application;
  if (report.scan.truncated || (intent === 'product' && !report.documentation.scan.complete)) return ['incomplete', null];
  if (intent === 'run') {
    if (app || report.compose.length || report.dockerfiles.length || report.commands.length) return ['prepare', 'preparar-dev'];
    return ['inspect', null];
  }
  if (intent === 'product') {
    if (!state.configuration.present || state.configuration.preparacao === 'pendente') return ['configure', 'configurar-projeto'];
    if (state.configuration.preparacao !== 'concluido') return ['inspect', null];
    for (const [name, accepted, key, skill] of [
      ['prd', ['aprovado'], 'prd', 'criar-prd'],
      ['ux_ui', ['aprovado', 'nao-aplicavel'], 'ux', 'criar-ux-ui'],
      ['design', ['aprovado'], 'design', 'criar-design-doc'],
    ]) {
      const document = state.planning[name];
      if (!document.path || !document.present || !document.status) return ['inspect', null];
      if (!accepted.includes(document.status)) return [key, skill];
    }
  }
  if (intent !== 'product' && app && (!state.configuration.present || !state.planning.ready)) return ['prepare', 'preparar-dev'];
  if (state.configuration.preparacao !== 'concluido') return app ? ['prepare', 'preparar-dev'] : ['configure', 'configurar-projeto'];
  if (state.planning.prd.status !== 'aprovado') return ['prd', 'criar-prd'];
  if (!['aprovado', 'nao-aplicavel'].includes(state.planning.ux_ui.status)) return ['ux', 'criar-ux-ui'];
  if (state.planning.design.status !== 'aprovado') return ['design', 'criar-design-doc'];
  if (state.level === 'manutencao' || !state.releasesComplete) return ['roadmap', 'gerenciar-roadmap'];
  if (intent !== 'product' && app && state.configuration.configuracao_tecnica === 'concluido' && !report.contract.complete) return ['prepare', 'preparar-dev'];
  const { roadmap, specs } = state.planning;
  if (!roadmap?.present || !['planejado', 'aprovado'].includes(roadmap.status) || !specs?.path || !specs.complete || specs.items.length > 1) return ['roadmap', 'gerenciar-roadmap'];
  if (!specs.items.length) return ['spec', 'criar-spec'];
  const [spec] = specs.items;
  if (!spec.linked || !['open', 'in-progress'].includes(spec.roadmapState) || !spec.status) return ['roadmap', 'gerenciar-roadmap'];
  if (spec.status !== 'aprovado') return ['spec', 'criar-spec'];
  return ['implement', 'implementar-spec'];
}

function runReferences(report) {
  const testPath = /(?:^|[./_-])(?:tests?|fixtures?|e2e)(?:$|[./_-])/i;
  const ordered = paths => [...new Set(paths.filter(path => path.length <= 512 && !/[\p{Cc}\p{Cf}]/u.test(path)))]
    .sort((left, right) => Number(testPath.test(left)) - Number(testPath.test(right))
      || left.split('/').length - right.split('/').length || (left < right ? -1 : Number(left > right)));
  const readmes = ordered(report.documentation.files
    .filter(file => file.kind === 'file' && file.sha256 && file.role === 'readme')
    .map(file => file.path));
  const launchFiles = ordered([...report.compose, ...report.dockerfiles, ...report.commands.map(({ file }) => file), ...report.manifests]);
  return [...readmes.slice(0, 2), ...(launchFiles.length ? launchFiles : ordered(report.sources)).slice(0, 4)];
}

export function getNextSteps({ command, target, language = 'pt', installed, possiblePartial = false, platform = process.platform, intent }) {
  target = resolve(target || '.');
  const text = messages[language] || messages.pt;
  if (command === 'error' && possiblePartial) return [{ label: text.partial, instruction: text.partialInstruction, stage: 'revisao' }];
  const cli = action => nextCommand(action, target, language, platform);
  if (command === 'document-error') return [{ label: text.review, command: cli('document'), stage: 'revisao' }];
  if (command === 'document' || intent === 'document') {
    const skillAvailable = installed && hasLegacyDocumentationSkill(target);
    const skill = skillAvailable ? { skill: 'documentar-legado' } : {};
    if (command !== 'document') return [{ label: text.document, command: cli('document'), ...skill, stage: 'documentacao' }];
    if (skillAvailable) return [{ label: text.documentReview, ...skill, stage: 'documentacao' }];
    return [installed
      ? { label: text.documentUpdate, command: cli('update'), stage: 'instalacao' }
      : { label: text.install, command: cli('init --purpose document'), stage: 'instalacao' }];
  }
  if (!installed) return [{ label: text.install, command: cli('init'), stage: 'instalacao' }];
  const verification = { label: text.verify, command: cli('doctor'), stage: 'verificacao' };
  let report;
  try { report = inspectProject(target); }
  catch {
    if (intent === 'product') return [{ label: text.incomplete, instruction: text.incompleteInstruction }];
    return [verification];
  }
  const [key, skill] = workflow(report, intent);
  if (key === 'incomplete') {
    const step = { label: text.incomplete, instruction: text.incompleteInstruction };
    return ['init', 'update', 'sync', 'lang', 'agents', 'tools'].includes(command) ? [verification, step] : [step];
  }
  const inspector = join(target, '.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs');
  const requiresEvidence = ['prd', 'ux', 'design', 'roadmap', 'spec', 'implement'].includes(key);
  const references = intent === 'run' && ['prepare', 'inspect'].includes(key) ? runReferences(report) : [];
  const step = {
    label: text[key],
    command: existsSync(inspector) ? commandLine([process.execPath, inspector], platform) : cli('doctor'),
    skill, stage: intent === 'product' ? productStages[key] : report.maturity.level,
    ...(intent === 'product' ? { maturity: report.maturity.level } : {}),
    ...(references.length ? { references } : {}),
    instruction: intent === 'product' && key === 'configure' ? text.productPreparation
      : intent === 'product' && key === 'inspect' ? text.productReview
      : intent === 'run' && key === 'inspect' ? text.runUnknown
      : references.length ? `${text.runReferences} ${text.ask} ${text.existing}`
      : `${text.ask}${key === 'prepare' ? ` ${text.existing}` : ''}${requiresEvidence ? ` ${text.productEvidence}` : ''}`,
  };
  return ['init', 'update', 'sync', 'lang', 'agents', 'tools'].includes(command) ? [verification, step] : [step];
}

export function operationalNext(result, options, { installed, planCanApply }) {
  const { command, language, target, ok } = result;
  const strings = messages[language];
  const step = (key, action, stage = 'verificacao') => [{
    label: strings[key], command: nextCommand(action, target, language, process.platform, options.local === true), stage,
  }];
  if (result.clients?.length === 0 && command === 'agents') {
    return [{ label: strings.preview, instruction: result.message, stage: 'revisao' }];
  }
  if (result.error?.code === 'E_CLIENTS_RETIRED' || result.clients?.length === 0 && command === 'doctor') {
    return [{ label: cliText(language, 'clientsAvailable'), command: nextCommand('agents', target, language), stage: 'revisao' }];
  }
  const selection = options.clients ? ` --agents ${options.clients.join(',')}` : '';
  if (command === 'doctor' && installed) {
    if (ok) return step('check', 'sync --check');
    if (result.issues.every(issue => issue.code === 'git-pending')) return step('next', 'next', 'fluxo');
    return step('preview', 'sync --dry-run --json', 'revisao');
  }
  if (options.check) {
    if (ok) return step('next', 'next', 'fluxo');
    if (planCanApply && result.plan.length && !options.force) return step('preview', `sync --dry-run --json${selection}`, 'revisao');
  }
  if (options.dryRun && !options.check && ok && !options.force) {
    if (installed && !result.plan.length) return step('next', 'next', 'fluxo');
    const purpose = options.purpose ? ` --purpose ${options.purpose}` : '';
    const local = options.local ? ' --local' : '';
    const yes = command === 'init' ? ' --yes' : '';
    const action = command === 'agents' && options.positionals?.length === 2
      ? `agents ${options.positionals[0]} ${options.clients.join(',')}` : `${command}${selection}`;
    return step('apply', `${action}${purpose}${local}${yes}`, 'aplicacao');
  }
  if (options.check || options.dryRun) {
    return [{ label: strings.review, stage: 'revisao' }];
  }
  if (command === 'init' && options.purpose) {
    const verification = step('verify', 'doctor');
    if (options.purpose === 'agents') return verification;
    const key = options.purpose === 'document' ? 'document' : 'next';
    return [...step(key, `next --intent ${options.purpose}`, 'fluxo'), ...verification];
  }
  return null;
}

const methods = {
  bmad: {
    name: 'BMad Method', url: 'https://github.com/bmad-code-org/BMAD-METHOD',
    product: ['Consulte o PRD e a arquitetura já discutidos.', 'Consult the existing PRD and architecture.', 'Consulte el PRD y la arquitectura existentes.'],
    run: ['Consulte a história e os critérios do incremento.', 'Consult the story and criteria for the increment.', 'Consulte la historia y los criterios del incremento.'],
  },
  openspec: {
    name: 'OpenSpec', url: 'https://github.com/Fission-AI/OpenSpec',
    plugin: 'openspec',
    product: ['Use as specs vigentes para entender o comportamento atual.', 'Use the current specs to understand existing behavior.', 'Use las specs vigentes para entender el comportamiento actual.'],
    run: ['Revise a proposta e os deltas da mudança em questão.', 'Review the proposal and deltas for the change at hand.', 'Revise la propuesta y los deltas del cambio en cuestión.'],
  },
  'spec-kit': {
    name: 'GitHub Spec Kit', url: 'https://github.com/github/spec-kit',
    product: ['Consulte a constituição e a spec relevante.', 'Consult the constitution and relevant spec.', 'Consulte la constitución y la spec pertinente.'],
    run: ['Confira a spec, o plano e as tarefas da feature.', 'Check the feature spec, plan and tasks.', 'Revise la spec, el plan y las tareas de la funcionalidad.'],
  },
  tlc: {
    name: 'Tech Leads Club', url: 'https://github.com/tech-leads-club/agent-skills',
    product: ['Consulte os requisitos e as decisões da feature.', 'Consult the feature requirements and decisions.', 'Consulte los requisitos y las decisiones de la funcionalidad.'],
    run: ['Revise os critérios e a validação da feature.', 'Review the feature criteria and validation.', 'Revise los criterios y la validación de la funcionalidad.'],
  },
  dotcontext: {
    name: 'Dotcontext (AI Context)', url: 'https://github.com/vinilana/dotcontext',
    plugin: 'dotcontext-mcp',
    product: ['Use os docs e planos relevantes como contexto do produto.', 'Use the relevant docs and plans as product context.', 'Use los docs y planes pertinentes como contexto del producto.'],
    run: ['Consulte o plano e o contexto técnico da mudança.', 'Consult the plan and technical context for the change.', 'Consulte el plan y el contexto técnico del cambio.'],
  },
};

export function integrationHints({ target, language, intent }) {
  const index = ['pt', 'en', 'es'].indexOf(language);
  return Object.entries(inspectIntegrations(target)).map(([id, paths]) => {
    const { name, url, product, run, plugin } = methods[id];
    return { id, name, url, paths, instruction: (intent === 'product' ? product : run)[index], ...(plugin ? { plugin } : {}) };
  });
}

export function integrationNext({ target, language }, intent) {
  return {
    label: messages[language].integrations,
    command: nextCommand(intent ? `next --integrations --intent ${intent}` : 'next --integrations', target, language),
    stage: 'contexto',
  };
}
