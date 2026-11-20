import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyExecution, isExpectedPlatformSkip, testInfrastructure } from '../../.pbai4devs/scripts/testar-infraestrutura/SCRIPT.mjs';
import { platformFixturePath, platformFixtures } from '../../.pbai4devs/scripts/testar-infraestrutura/PLATFORM_FIXTURES.mjs';
import { verifyNativeTests } from './native-macos-metadata.mjs';

export function verifyInfrastructure(report, platform = process.platform) {
  if (!Array.isArray(report?.suites) || report.suites.length === 0) {
    throw new Error('Infraestrutura incompleta. O relatório não inclui suítes.');
  }
  for (const suite of report.suites) {
    const evidence = suite.evidence;
    if (suite.status === 'passed' && classifyExecution({ status: 0 }, evidence) === 'passed') continue;
    const skips = evidence?.skipped;
    const counts = evidence?.counts;
    if (suite.status === 'partial' && Array.isArray(skips) && skips.length > 0 && counts?.skipped === skips.length
      && Number.isSafeInteger(counts.tests) && counts.tests === counts.passed + skips.length
      && evidence.observed >= counts.tests
      && new Set(skips.map(skip => skip?.name)).size === skips.length
      && skips.every(skip => isExpectedPlatformSkip(suite.name, skip, platform))) {
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
    passed += verifyNativeTests({ root, file: platformFixturePath(fixture), names: fixture.names, env, exec });
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
