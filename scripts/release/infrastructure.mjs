import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyExecution, testInfrastructure } from '../../.pbai4devs/scripts/testar-infraestrutura/SCRIPT.mjs';
import { verifyNativeTests } from './native-macos-metadata.mjs';

// portable-resources runs these fixtures on their native systems in the same CI matrix.
const platformFixtures = [
  {
    native: 'win32',
    platforms: ['linux', 'darwin'],
    suite: 'sincronizar-agentes',
    file: 'LOCAL_IGNORE.mjs',
    names: ['Windows normaliza o alias temporário 8.3 antes de comparar a raiz Git'],
  },
  {
    native: 'darwin',
    platforms: ['linux'],
    suite: 'sincronizar-agentes',
    file: 'PRESERVATION.mjs',
    names: ['sync recusa apontamento CRLF com xattr no macOS', 'sync recusa apontamento CRLF com acl no macOS'],
  },
  {
    native: 'darwin',
    platforms: ['linux'],
    suite: 'testar-infraestrutura',
    file: 'TEST.mjs',
    names: [
      'ACL herdada no diretório de logs interrompe antes de executar suítes',
      'ACL de logs não verificável interrompe sem expor diagnóstico',
      'ACL de logs não verificável após a suíte impede gravar saída',
    ],
  },
  {
    native: 'linux',
    platforms: ['darwin'],
    suite: 'sincronizar-agentes',
    file: 'PRESERVATION.mjs',
    names: [
      'sync preserva atributo Linux ao atualizar referência CRLF ou recusa sem alterar',
      'sync preserva atributo Linux em atualização comum ou recusa sem alterar',
      'sync avisa quando metadados Linux não foram verificados',
    ],
  },
];

const fixturePath = ({ suite, file }) => `.pbai4devs/scripts/${suite}/tests/${file}`;

function platformOnlySkip(suite, skip, platform) {
  return skip.kind === 'test' && skip.event === 'test:pass' && skip.reason === null
    && skip.booleanSkip === true && skip.todo === false
    && platformFixtures.some(fixture => fixture.suite === suite && fixture.platforms.includes(platform)
      && skip.file === fixturePath(fixture) && fixture.names.includes(skip.name));
}

export function verifyInfrastructure(report, platform = process.platform) {
  for (const suite of report.suites) {
    if (suite.status === 'passed') continue;
    const evidence = suite.evidence;
    const skips = evidence?.skipped;
    const counts = evidence?.counts;
    if (suite.status === 'partial' && Array.isArray(skips) && skips.length > 0 && counts?.skipped === skips.length
      && Number.isSafeInteger(counts.tests) && counts.tests === counts.passed + skips.length
      && new Set(skips.map(skip => skip?.name)).size === skips.length
      && skips.every(Boolean)
      && skips.every(skip => platformOnlySkip(suite.name, skip, platform))) {
      const applicable = { ...counts, tests: counts.tests - skips.length, skipped: 0 };
      if (classifyExecution({ status: 0 }, { ...evidence, counts: applicable, skipped: [] }) === 'passed') {
        console.log(`${suite.name}: ${skips.length} teste(s) exclusivos de outra plataforma na matriz.`);
        continue;
      }
    }
    throw new Error(`Infraestrutura incompleta em ${suite.name}. Consulte ${suite.log}.`);
  }
}

export function verifyNativeInfrastructure({ root = process.cwd(), platform = process.platform, env, exec } = {}) {
  let passed = 0;
  for (const fixture of platformFixtures.filter(item => item.native === platform)) {
    passed += verifyNativeTests({ root, file: fixturePath(fixture), names: fixture.names, env, exec });
  }
  return { platform, passed };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === '--native') console.log(JSON.stringify(verifyNativeInfrastructure()));
    else verifyInfrastructure(testInfrastructure());
  }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
