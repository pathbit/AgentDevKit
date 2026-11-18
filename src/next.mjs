import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { releaseCommand } from './config.mjs';
import { inspectProject } from '../.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs';

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
    partial: 'A operação pode ter deixado alterações ou arquivos temporários.',
    partialInstruction: 'Interrompa outras operações; preserve arquivos e backups e revise o estado antes de tentar novamente. Backups podem estar incompletos: compare-os antes de restaurar.',
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
    partial: 'The operation may have left changes or temporary files.',
    partialInstruction: 'Stop other operations; preserve files and backups and review the state before retrying. Backups may be incomplete: compare them before restoring.',
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
    partial: 'La operación puede haber dejado cambios o archivos temporales.',
    partialInstruction: 'Detenga otras operaciones; conserve archivos y respaldos y revise el estado antes de reintentar. Los respaldos pueden estar incompletos: compárelos antes de restaurar.',
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

function workflow(report, intent) {
  const state = report.maturity;
  const app = state.signals.application;
  if (report.scan.truncated || (intent === 'product' && !report.documentation.scan.complete)) return ['incomplete', null];
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

export function getNextSteps({ command, target, language = 'pt', installed, possiblePartial = false, platform = process.platform, intent }) {
  target = resolve(target || '.');
  const text = messages[language] || messages.pt;
  if (command === 'error' && possiblePartial) return [{ label: text.partial, instruction: text.partialInstruction, stage: 'revisao' }];
  const cli = action => `${platform === 'win32' ? '& ' : ''}${releaseCommand} ${action} --target ${quote(target, platform)} --lang ${quote(language, platform)}`;
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
  const step = {
    label: text[key],
    command: existsSync(inspector) ? commandLine([process.execPath, inspector], platform) : cli('doctor'),
    skill, stage: intent === 'product' ? productStages[key] : report.maturity.level,
    ...(intent === 'product' ? { maturity: report.maturity.level } : {}),
    instruction: intent === 'product' && key === 'configure' ? text.productPreparation
      : intent === 'product' && key === 'inspect' ? text.productReview
      : `${text.ask}${key === 'prepare' ? ` ${text.existing}` : ''}${requiresEvidence ? ` ${text.productEvidence}` : ''}`,
  };
  return ['init', 'update', 'sync', 'lang', 'agents', 'tools'].includes(command) ? [verification, step] : [step];
}
