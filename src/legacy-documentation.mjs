import { lstatSync } from 'node:fs';
import { inspectProject } from '../.pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs';
import { safePath } from './install.mjs';

const maxEvidence = 24;
const safeRelative = value => typeof value === 'string' && value.length <= 512
  && !/[\\:\p{Cc}\p{Cf}]/u.test(value) && value.split('/').every(part => part && part !== '.' && part !== '..');

export function hasLegacyDocumentationSkill(target) {
  try {
    return lstatSync(safePath(target, '.pbai4devs/skills/projeto/documentar-legado/SKILL.md')).isFile();
  } catch { return false; }
}

export function legacyDocumentation(target) {
  const project = inspectProject(target, { survey: true });
  const sampledFields = ['sources', 'tests'];
  const sample = (field, values) => {
    if (values.length > maxEvidence) sampledFields.push(field);
    return values.slice(0, maxEvidence);
  };
  const paths = field => sample(field, project[field].filter(safeRelative).sort());
  const commands = sample('commands', project.commands.filter(({ file }) => safeRelative(file))
    .map(({ file, names }) => ({ file, names: sample('commandNames', names) }))
    .sort((left, right) => left.file < right.file ? -1 : Number(left.file > right.file)));
  const documentPriority = ({ path, origin }) => origin === 'configured' ? 0 : path.includes('/') ? 2 : 1;
  const documents = sample('documents', project.documentation.files
    .filter(file => file.kind === 'file' && file.sha256 && safeRelative(file.path))
    .sort((left, right) => documentPriority(left) - documentPriority(right))
    .map(({ path, role, configuredAs = [] }) => ({ path, roles: [...new Set([role, ...configuredAs])].sort() })));
  const evidence = {
    manifests: paths('manifests'), lockfiles: paths('lockfiles'), sources: paths('sources'),
    tests: project.testSources.filter(safeRelative).sort(), commands, compose: paths('compose'),
    dockerfiles: paths('dockerfiles'), documents,
  };
  const coverage = {
    inventoryComplete: !project.scan.truncated && project.warnings.length === 0,
    documentationComplete: project.documentation.scan.complete,
    applicationDetected: project.mode === 'aplicacao-detectada',
    sampledFields: [...new Set(sampledFields)],
  };
  const gaps = ['behavior-unverified'];
  if (!coverage.applicationDetected && !evidence.compose.length && !evidence.dockerfiles.length) gaps.push('no-application-evidence');
  if (!documents.length) gaps.push('no-documents');
  if (!coverage.inventoryComplete) gaps.push('inventory-incomplete');
  if (!coverage.documentationComplete) gaps.push('documentation-incomplete');
  return { status: 'rascunho', evidence, coverage, gaps };
}

const words = {
  pt: {
    title: 'Levantamento do sistema existente', intro: 'Inventário local para documentar o comportamento atual.',
    scope: 'Escopo', sampling: 'O inventário usa uma busca limitada. Os caminhos de código e teste são amostras.',
    evidence: 'Evidências observadas', behavior: 'Comportamentos', gaps: 'Lacunas', review: 'Revisão',
    labels: ['Manifestos', 'Arquivos de lock', 'Código', 'Testes', 'Compose', 'Dockerfiles', 'Documentos', 'Comandos declarados'],
    noEvidence: 'Nenhuma referência regular reconhecida na consulta.',
    trace: 'Descreva cada comportamento com a referência do código e do teste. Indique separadamente as inferências.',
    reviewing: 'Revise os fatos com o responsável e complemente os documentos existentes pelos caminhos acordados.',
    gap: {
      'behavior-unverified': 'Comportamentos e resultados de testes ainda precisam de verificação.',
      'no-application-evidence': 'A consulta não encontrou sinais de uma aplicação. Confirme o módulo ou repositório.',
      'no-documents': 'Nenhum documento pôde ser inventariado. Confirme a localização antes de criar um arquivo.',
      'inventory-incomplete': 'A busca técnica foi parcial. Inspecione os módulos ainda pendentes.',
      'documentation-incomplete': 'A busca documental foi parcial. Confira os caminhos já usados pela equipe.',
    },
  },
  en: {
    title: 'Existing system survey', intro: 'Local inventory for documenting current behavior.',
    scope: 'Scope', sampling: 'The inventory performs a bounded search. Code and test paths are samples.',
    evidence: 'Observed evidence', behavior: 'Behavior', gaps: 'Gaps', review: 'Review',
    labels: ['Manifests', 'Lockfiles', 'Source code', 'Tests', 'Compose', 'Dockerfiles', 'Documents', 'Declared commands'],
    noEvidence: 'No recognized regular files were identified by this survey.',
    trace: 'Describe each behavior with a code and test reference. Mark inferences separately.',
    reviewing: 'Review the facts with the owner and supplement existing documents at the agreed paths.',
    gap: {
      'behavior-unverified': 'Behavior and test results still need verification.',
      'no-application-evidence': 'The survey found no application signals. Confirm the module or repository.',
      'no-documents': 'No documents could be inventoried. Confirm their location before creating a file.',
      'inventory-incomplete': 'The technical search was partial. Inspect any remaining modules.',
      'documentation-incomplete': 'The document search was partial. Check the paths the team already uses.',
    },
  },
  es: {
    title: 'Relevamiento del sistema existente', intro: 'Inventario local para documentar el comportamiento actual.',
    scope: 'Alcance', sampling: 'El inventario usa una búsqueda limitada. Las rutas de código y pruebas son muestras.',
    evidence: 'Evidencias observadas', behavior: 'Comportamientos', gaps: 'Lagunas', review: 'Revisión',
    labels: ['Manifiestos', 'Archivos de bloqueo', 'Código', 'Pruebas', 'Compose', 'Dockerfiles', 'Documentos', 'Comandos declarados'],
    noEvidence: 'La consulta no identificó archivos regulares reconocidos.',
    trace: 'Describa cada comportamiento con una referencia al código y a la prueba. Indique las inferencias por separado.',
    reviewing: 'Revise los hechos con el responsable y complemente los documentos en las rutas acordadas.',
    gap: {
      'behavior-unverified': 'Los comportamientos y resultados de pruebas aún requieren verificación.',
      'no-application-evidence': 'La consulta no encontró señales de una aplicación. Confirme el módulo o repositorio.',
      'no-documents': 'No fue posible inventariar documentos. Confirme su ubicación antes de crear un archivo.',
      'inventory-incomplete': 'La búsqueda técnica fue parcial. Inspeccione los módulos pendientes.',
      'documentation-incomplete': 'La búsqueda documental fue parcial. Compruebe las rutas que usa el equipo.',
    },
  },
};

function inlineCode(value) {
  const length = Math.max(0, ...(value.match(/`+/g) || []).map(run => run.length)) + 1;
  const fence = '`'.repeat(length);
  return fence + ' ' + value + ' ' + fence;
}

export function renderLegacyDocumentation({ status, evidence, gaps }, language, { frontmatter = true } = {}) {
  const text = words[language];
  const { manifests, lockfiles, sources, tests, compose, dockerfiles, documents, commands } = evidence;
  const lines = [
    ...(frontmatter ? ['---', 'description: ' + text.intro, 'status: ' + status, '---', ''] : []),
    '# ' + text.title, '', '## ' + text.scope, '', text.sampling, '', '## ' + text.evidence, '',
  ];
  const groups = [manifests, lockfiles, sources, tests, compose, dockerfiles, documents.map(item => item.path), commands.map(item => item.file)];
  for (const [index, values] of groups.entries()) {
    if (!values.length) continue;
    lines.push('### ' + text.labels[index], '');
    if (index === groups.length - 1) {
      for (const { file, names } of commands) {
        lines.push('- ' + inlineCode(file));
        for (const name of names) lines.push('  - ' + inlineCode(name));
      }
    } else {
      lines.push(...values.map(value => '- ' + inlineCode(value)));
    }
    lines.push('');
  }
  if (!groups.some(group => group.length)) lines.push(text.noEvidence, '');
  lines.push('## ' + text.behavior, '', text.trace, '', '## ' + text.gaps, '',
    ...gaps.map(code => '- ' + text.gap[code]), '', '## ' + text.review, '', text.reviewing);
  return lines.join('\n');
}
