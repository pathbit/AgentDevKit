import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { SecurityAudit, parseArgs, parseGitleaks, parseOsv, parseOpengrep, sanitizedEnvironment, safePath, snapshotSources, verifyDatabase } from '../SCRIPT.mjs';
import { zipFixture } from './zip-fixture.mjs';
import { validateOsvDatabase } from '../database-zip.mjs';

const write = (path, text) => { fs.mkdirSync(dirname(path), { recursive: true }); fs.writeFileSync(path, text); };
const toolPath = args => args[0].replaceAll('\\', '/');
const advisory = (id = 'TEST-1', extra = {}) => JSON.stringify({ id, modified: '2026-01-01T00:00:00Z', affected: [], ...extra });
const validZip = () => zipFixture({ 'TEST-1.json': advisory() });
function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'pbai-security-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '--quiet', root]).status, 0);
  write(join(root, '.gitignore'), '/.agent-tests/\n');
  write(join(root, 'app/index.js'), 'export const answer = 42;\n');
  write(join(root, '.pbai4devs/scripts/auditar-seguranca/rules/javascript.yml'), 'rules: []\n');
  for (const name of ['gitleaks', 'osv-scanner', 'opengrep']) write(join(root, `.pbai4devs/tools/${name}/SCRIPT.mjs`), '// fixture\n');
  const manager = { root, check: () => ({ version: '1.0.0' }), entry: () => ({ envPaths: { OSV_SCANNER_LOCAL_DB_CACHE_DIRECTORY: 'data/osv' } }), local: () => join(root, '.pbai4devs/tools/osv-scanner/.local'), withLock: (_name, action) => action() };
  const calls = [];
  const execute = (_node, args, options) => {
    calls.push({ args, options });
    const payload = toolPath(args).includes('/gitleaks/') ? [] : toolPath(args).includes('/osv-scanner/') ? { results: [] }
      : { results: [], errors: [], paths: { scanned: [join(options.cwd, 'source/index.js')] } };
    const output = args.find(arg => arg.startsWith('--report-path=') || arg.startsWith('--output-file='));
    if (output) fs.writeFileSync(output.slice(output.indexOf('=') + 1), JSON.stringify(payload));
    return { status: 0, stdout: JSON.stringify(payload), stderr: '' };
  };
  return { root, manager, calls, execute, audit: new SecurityAudit({ root, manager, execute }) };
}

test('argumentos limitam checks, destinos e operacoes', () => {
  assert.equal(parseArgs([]).command, 'help');
  assert.deepEqual(parseArgs(['run', '--checks', 'sast,secrets,secrets']).checks, ['sast', 'secrets']);
  assert.deepEqual(parseArgs(['update-data', '--ecosystems', 'NPM,go']).ecosystems, ['npm', 'Go']);
  for (const args of [['scan'], ['run', '--checks', 'cloud'], ['run', '--checks', ''], ['check', '--target', '.'], ['run', '--ecosystems', 'npm'], ['update-data'], ['update-data', '--ecosystems', '../../etc'], ['run', '--target', '.', '--target', '.'], ['run', '--checks', 'sast', '--include-history']]) assert.throws(() => parseArgs(args));
});

test('ambiente nao encaminha tokens, proxies, Node options ou configuracoes externas', () => {
  const env = sanitizedEnvironment({ PATH: '/bin', HOME: '/home/person', SystemRoot: 'C:\\Windows', AWS_ACCESS_KEY_ID: 'secret', GOOGLE_APPLICATION_CREDENTIALS: 'secret', SECRET: 'secret', NPM_TOKEN: 'secret', NODE_OPTIONS: '--require malicious', HTTPS_PROXY: 'secret', SEMGREP_RULES: 'https://remote', GITLEAKS_CONFIG: 'secret' });
  assert.equal(env.PATH, '/bin'); assert.equal(env.HOME, '/home/person'); assert.equal(env.SystemRoot, 'C:\\Windows');
  assert.ok(!JSON.stringify(env).includes('secret')); assert.equal(env.NODE_OPTIONS, undefined); assert.equal(env.SEMGREP_RULES, undefined);
  assert.equal(env.OPENGREP_ENABLE_VERSION_CHECK, '0');
});

test('caminhos recusam escapes, links e output rastreado antes de executar', async t => {
  const f = fixture(t); const outside = fs.mkdtempSync(join(tmpdir(), 'pbai-outside-')); t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.symlinkSync(outside, join(f.root, 'link'), process.platform === 'win32' ? 'junction' : undefined);
  assert.throws(() => safePath(f.root, '../outside')); assert.throws(() => safePath(f.root, 'link/file.json'));
  await assert.rejects(f.audit.run({ target: 'app', checks: ['secrets'], output: 'report.json' }));
  fs.mkdirSync(join(f.root, '.agent-tests/security'), { recursive: true });
  await assert.rejects(f.audit.run({ target: '.agent-tests', checks: ['secrets'] }), /conflita/);
  await assert.rejects(f.audit.run({ target: '.agent-tests/security', checks: ['secrets'] }), /conflita/);
  write(join(f.root, '.agent-tests/tracked.json'), '{}');
  assert.equal(spawnSync('git', ['-C', f.root, 'add', '-f', '.agent-tests/tracked.json']).status, 0);
  await assert.rejects(f.audit.run({ target: 'app', checks: ['secrets'], output: '.agent-tests/tracked.json' }));
  assert.equal(f.calls.length, 0);
});

test('snapshot preserva originais e nao atravessa links nem diretorios gerados', t => {
  const f = fixture(t); write(join(f.root, 'app/node_modules/excluded.js'), 'secret'); write(join(f.root, 'app/.semgrepignore'), '*');
  fs.symlinkSync(join(f.root, 'app'), join(f.root, 'app/link'), process.platform === 'win32' ? 'junction' : 'dir');
  const destination = join(f.root, '.agent-tests/snapshot'); fs.mkdirSync(destination, { recursive: true });
  const data = snapshotSources(f.root, join(f.root, 'app'), destination);
  assert.deepEqual(data.files.map(file => file.path), ['index.js']);
  assert.equal(data.excluded.length, 3); assert.equal(fs.readFileSync(join(f.root, 'app/index.js'), 'utf8'), fs.readFileSync(join(destination, 'index.js'), 'utf8'));
  assert.throws(() => snapshotSources(f.root, join(f.root, 'app'), destination, { maxFileBytes: 1 }));
});

test('parsers redigem segredos e recusam saidas invalidas ou falsas aprovacoes', () => {
  const secret = 'a-secret-value-that-must-not-escape';
  const gitleaks = parseGitleaks([{ RuleID: 'key', File: 'a.js', StartLine: 3, Secret: secret, Match: secret, Line: secret, Description: secret }], 1, '/tmp');
  assert.equal(gitleaks.status, 'findings'); assert.ok(!JSON.stringify(gitleaks).includes(secret));
  assert.throws(() => parseGitleaks([], 1, '/tmp')); assert.throws(() => parseGitleaks([], 2, '/tmp')); assert.throws(() => parseGitleaks([{ RuleID: 'x', File: '../escape' }], 1, '/tmp'));
  assert.throws(() => parseGitleaks([{ RuleID: 'x', File: 'src/../../escape' }], 1, '/tmp'));
  assert.equal(parseOsv({ results: [] }, 128, '/tmp').status, 'not-applicable'); assert.throws(() => parseOsv({ results: [] }, 127, '/tmp')); assert.throws(() => parseOsv({ results: [] }, 1, '/tmp'));
  const osv = parseOsv({ results: [{ source: { path: 'package-lock.json' }, packages: [{ package: { name: 'demo', version: '1.0.0', ecosystem: 'npm' }, vulnerabilities: [{ id: 'TEST-1', details: secret }] }] }] }, 1, '/tmp');
  assert.equal(osv.findings.length, 1); assert.ok(!JSON.stringify(osv).includes(secret));
  const sast = parseOpengrep({ results: [{ check_id: 'unsafe', path: 'a.js', start: { line: 2 }, extra: { lines: secret, message: secret } }], errors: [], paths: { scanned: ['a.js'] } }, 1, '/tmp');
  assert.equal(sast.findings.length, 1); assert.ok(!JSON.stringify(sast).includes(secret));
  assert.throws(() => parseOpengrep({ results: [], errors: [{}], paths: { scanned: [] } }, 0, '/tmp'));
  assert.throws(() => parseOpengrep({ results: [], errors: [] }, 0, '/tmp'));
});

test('run usa argumentos locais e fecha incompleto quando ferramenta ou DB falta', async t => {
  const f = fixture(t);
  const result = await f.audit.run({ target: 'app', checks: ['secrets', 'sast'] });
  assert.equal(result.status, 'passed'); assert.equal(result.exitCode, 0);
  assert.ok(f.calls.every(call => call.options.shell === false && call.options.timeout > 0));
  assert.ok(f.calls.some(call => call.args.includes('--disable-version-check') && call.args.includes('--no-git-ignore')));
  assert.ok(f.calls.some(call => call.args.includes('--redact=100')));
  assert.ok(!f.calls.some(call => call.args.some(arg => /metrics|https:\/\/|--autofix/.test(arg))));
  assert.ok(fs.existsSync(join(f.root, result.report))); assert.ok(!fs.readdirSync(join(f.root, '.agent-tests/security')).some(name => name.startsWith('.work-')));
  write(join(f.root, 'app/package-lock.json'), '{}');
  const missingDb = await f.audit.run({ target: 'app', checks: ['dependencies'] });
  assert.equal(missingDb.status, 'incomplete'); assert.equal(missingDb.exitCode, 2);
  f.manager.check = () => { throw Error('Missing TOKEN=secret'); };
  const missingTool = await f.audit.run({ target: 'app', checks: ['secrets'] });
  assert.equal(missingTool.status, 'incomplete'); assert.ok(!JSON.stringify(missingTool).includes('TOKEN'));
});

test('alteracao da fonte durante a ferramenta invalida o resultado', async t => {
  const f = fixture(t), execute = f.execute;
  f.audit.execute = (...args) => { const result = execute(...args); write(join(f.root, 'app/index.js'), 'changed'); return result; };
  const result = await f.audit.run({ target: 'app', checks: ['secrets'] });
  assert.equal(result.status, 'incomplete'); assert.equal(result.exitCode, 2);
});

test('saida quebrada da ferramenta nao vira relatorio limpo', async t => {
  const f = fixture(t); f.audit.execute = () => ({ status: 2, stdout: 'secret', stderr: 'secret' });
  const result = await f.audit.run({ target: 'app', checks: ['sast'] });
  assert.equal(result.exitCode, 2); assert.ok(!JSON.stringify(result).includes('secret'));
});

test('bases OSV atualizam explicitamente, validam hash e preservam anterior em falha', async t => {
  const f = fixture(t); const zip = validZip(); let calls = 0;
  f.audit.fetcher = async (url, options) => { calls++; assert.equal(url, 'https://osv-vulnerabilities.storage.googleapis.com/npm/all.zip'); assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit'); assert.deepEqual(Object.keys(options.headers), ['Accept']); return new Response(zip); };
  assert.equal((await f.audit.updateData(['npm'])).status, 'passed');
  const cache = join(f.manager.local(), 'data/osv'); const before = verifyDatabase(f.root, cache, 'npm'); assert.equal(calls, 1);
  f.audit.fetcher = async () => new Response('broken'); await assert.rejects(f.audit.updateData(['npm']));
  assert.deepEqual(verifyDatabase(f.root, cache, 'npm'), before);
  const fake = Buffer.alloc(22); fake.writeUInt32LE(0x04034b50); fake.writeUInt32LE(0x06054b50, 4);
  f.audit.fetcher = async () => new Response(fake); await assert.rejects(f.audit.updateData(['npm']));
  assert.deepEqual(verifyDatabase(f.root, cache, 'npm'), before);
  f.audit.fetcher = async () => new Response(zipFixture({ 'TEST-1.json': '{}' })); await assert.rejects(f.audit.updateData(['npm']));
  assert.deepEqual(verifyDatabase(f.root, cache, 'npm'), before);
  fs.appendFileSync(join(cache, 'osv-scalibr/npm/all.zip'), 'tampered'); assert.throws(() => verifyDatabase(f.root, cache, 'npm'));
});

test('query check nao escreve relatorios nem instala ferramentas', t => {
  const f = fixture(t); const before = fs.readdirSync(f.root);
  const result = f.audit.check(['secrets', 'sast']); assert.equal(result.exitCode, 0); assert.deepEqual(fs.readdirSync(f.root), before); assert.equal(f.calls.length, 0);
});

test('historico nunca amplia silenciosamente um target de subpasta', async t => {
  const f = fixture(t);
  await assert.rejects(f.audit.run({ target: 'app', checks: ['secrets'], includeHistory: true }), /raiz do repositorio/);
  assert.equal(f.calls.length, 0);
});

test('bundles de texto continuam incluidos no snapshot de segredos', t => {
  const f = fixture(t); write(join(f.root, 'app/dist/app.js'), 'bundle'); write(join(f.root, 'app/build/server.js'), 'server');
  const destination = join(f.root, '.agent-tests/snapshot'); fs.mkdirSync(destination, { recursive: true });
  const data = snapshotSources(f.root, join(f.root, 'app'), destination);
  assert.ok(data.files.some(file => file.path === 'dist/app.js')); assert.ok(data.files.some(file => file.path === 'build/server.js'));
});

test('OSV recebe modo offline estrito e erro de outro scanner prevalece sobre achados', async t => {
  const f = fixture(t); const zip = validZip(); f.audit.fetcher = async () => new Response(zip); await f.audit.updateData(['npm']);
  write(join(f.root, 'app/package-lock.json'), '{}');
  const execute = f.execute;
  f.audit.execute = (node, args, options) => {
    if (toolPath(args).includes('/osv-scanner/')) {
      assert.ok(args.includes('--offline')); assert.ok(args.includes('--no-resolve')); assert.ok(args.includes('--all-packages'));
      assert.ok(!args.some(arg => arg.includes('call-analysis') || arg.includes('licenses')));
    }
    return execute(node, args, options);
  };
  const result = await f.audit.run({ target: 'app', checks: ['dependencies'] }); assert.equal(result.status, 'not-applicable');
  f.audit.execute = (_node, args) => {
    if (toolPath(args).includes('/gitleaks/')) { const output = args.find(arg => arg.startsWith('--report-path=')); fs.writeFileSync(output.slice(output.indexOf('=') + 1), JSON.stringify([{ RuleID: 'key', File: 'index.js', StartLine: 1 }])); return { status: 1, stdout: '', stderr: '' }; }
    return { status: 2, stdout: '{}', stderr: 'failure' };
  };
  const mixed = await f.audit.run({ target: 'app', checks: ['secrets', 'sast'] }); assert.equal(mixed.exitCode, 2); assert.equal(mixed.findings.length, 1);
});

test('OSV sem pacotes usa 128 explicito; erro sem JSON permanece incompleto', async t => {
  const f = fixture(t); const zip = validZip(); f.audit.fetcher = async () => new Response(zip); await f.audit.updateData(['npm']);
  write(join(f.root, 'app/package-lock.json'), '{}');
  f.audit.execute = () => ({ status: 128, stdout: '', stderr: '' });
  assert.equal((await f.audit.run({ target: 'app', checks: ['dependencies'] })).status, 'not-applicable');
  f.audit.execute = () => ({ status: 127, stdout: '', stderr: '' });
  assert.equal((await f.audit.run({ target: 'app', checks: ['dependencies'] })).status, 'incomplete');
});

test('ZIP e ZIP64 exigem estrutura, CRC, JSON OSV e limites validos', () => {
  for (const options of [{}, { stored: true }, { descriptor: true }, { zip64: true }, { zip64: true, descriptor: true }]) {
    const zip = zipFixture({ 'TEST-1.json': advisory(), 'TEST-2.json': advisory('TEST-2', { withdrawn: '2026-02-01T00:00:00Z', affected: undefined }) }, options);
    assert.equal(validateOsvDatabase(zip).records, 2);
  }
  const zero = Buffer.alloc(22); zero.writeUInt32LE(0x04034b50); zero.writeUInt32LE(0x06054b50, 4);
  assert.throws(() => validateOsvDatabase(zero));
  assert.throws(() => validateOsvDatabase(zipFixture({ 'TEST-1.json': 'invalid' })));
  assert.throws(() => validateOsvDatabase(zipFixture({ 'TEST-1.json': '{}' })));
  assert.throws(() => validateOsvDatabase(zipFixture({ '../TEST-1.json': advisory() })));
  assert.throws(() => validateOsvDatabase(zipFixture([['TEST-1.json', advisory()], ['TEST-1.json', advisory()]])));
  const brokenCrc = validZip(); const central = brokenCrc.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  brokenCrc.writeUInt32LE(1, central + 16); assert.throws(() => validateOsvDatabase(brokenCrc));
  const brokenPayload = validZip(); const payload = 30 + brokenPayload.readUInt16LE(26) + brokenPayload.readUInt16LE(28); brokenPayload[payload] ^= 0xff;
  assert.throws(() => validateOsvDatabase(brokenPayload));
  assert.throws(() => validateOsvDatabase(validZip(), { maxEntryBytes: 2 }));
  assert.throws(() => validateOsvDatabase(validZip(), { maxTotalBytes: 2 }));
});

test('inventario final recusa adicao, remocao, renomeacao e mudanca de tipo', async t => {
  const changes = {
    addition: root => write(join(root, 'app/added-during-scan.js'), 'new'),
    removal: root => fs.unlinkSync(join(root, 'app/index.js')),
    rename: root => fs.renameSync(join(root, 'app/index.js'), join(root, 'app/renamed.js')),
    type: root => { fs.unlinkSync(join(root, 'app/index.js')); fs.mkdirSync(join(root, 'app/index.js')); },
    directory: root => fs.mkdirSync(join(root, 'app/new-folder')),
  };
  for (const [name, change] of Object.entries(changes)) await t.test(name, async subtest => {
    const f = fixture(subtest), execute = f.execute;
    f.audit.execute = (...args) => { const result = execute(...args); change(f.root); return result; };
    const result = await f.audit.run({ target: 'app', checks: ['secrets'] });
    assert.equal(result.status, 'incomplete'); assert.equal(result.exitCode, 2);
  });
});
