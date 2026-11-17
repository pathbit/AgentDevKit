import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prohibitedPaths } from './compose-package-smoke.mjs';

test('a prova recusa caminhos inseguros e artefatos locais no pacote', () => {
  const blocked = ['../secret', '/etc/passwd', 'a\\..\\secret', 'C:/secret', 'a/\nsecret',
    '.pbai4devs/tools/browser/.LOCAL/current.json', '.PLAYWRIGHT-mcp/trace',
    'playwright-report/index.html', 'TestResults/result.xml', 'blob-report/result.zip',
    '.pbai4devs/state/configuracao/ESTADO.md'];
  assert.deepEqual(prohibitedPaths(blocked), blocked);
  assert.deepEqual(prohibitedPaths(['src/install.mjs', '.pbai4devs/state/README.md', 'tests/fixture.mjs']), []);
});
