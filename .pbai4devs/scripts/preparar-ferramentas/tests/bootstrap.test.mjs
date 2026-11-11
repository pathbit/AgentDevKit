import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, symlinkSync, readdirSync, existsSync, rmSync, chmodSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const bootstrap = join(project, '.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.sh');
const posix = process.platform !== 'win32';
const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const command = name => {
  const result = spawnSync('/bin/sh', ['-c', 'command -v "$1"', 'fixture', name], { encoding: 'utf8' });
  assert.equal(result.status, 0, `Prerequisito de teste ausente: ${name}`);
  return result.stdout.trim();
};
const executable = (file, text) => { writeFileSync(file, text); chmodSync(file, 0o755); };
const nodeStub = (file, code) => executable(file, `#!${process.execPath}\n${code}\n`);

function fixture(t, { platform = 'darwin-arm64', unsafeLink = false, badArchivePath = false } = {}) {
  mkdirSync(join(project, '.agent-tests'), { recursive: true });
  const root = mkdtempSync(join(project, '.agent-tests/bootstrap com espaco-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = join(root, '.pbai4devs/scripts/preparar-ferramentas'); mkdirSync(directory, { recursive: true });
  copyFileSync(bootstrap, join(directory, 'BOOTSTRAP.sh'));
  writeFileSync(join(directory, 'SCRIPT.mjs'), `import fs from 'node:fs'; fs.writeFileSync(process.env.BOOTSTRAP_PROOF, JSON.stringify({args:process.argv.slice(2),path:process.env.PATH,execPath:process.execPath})); process.exit(Number(process.env.BOOTSTRAP_SETUP_EXIT||0));\n`);
  const bin = join(root, 'commands'); mkdirSync(bin);
  for (const name of ['dirname', 'mkdir', 'mktemp', 'gzip', 'awk', 'mv', 'rm']) symlinkSync(command(name), join(bin, name));
  const hasher = ['shasum', 'sha256sum'].find(name => spawnSync('/bin/sh', ['-c', 'command -v "$1"', 'fixture', name]).status === 0);
  assert.ok(hasher, 'Teste requer ferramenta SHA-256.'); symlinkSync(command(hasher), join(bin, hasher));
  const [os, arch, libc] = platform.split('-');
  executable(join(bin, 'uname'), `#!/bin/sh\ncase "$1" in -s) printf '%s\\n' ${quote(os === 'darwin' ? 'Darwin' : 'Linux')};; -m) printf '%s\\n' ${quote(arch === 'x64' ? 'x86_64' : 'arm64')};; esac\n`);
  if (os === 'linux') executable(join(bin, 'ldd'), `#!/bin/sh\nprintf '%s\\n' ${quote(libc === 'musl' ? 'musl libc' : 'ldd (GNU libc)')}\n`);
  const version = 'v24.1.2'; const top = `node-${version}-${platform}`;
  const bundle = join(root, 'bundle', top); mkdirSync(join(bundle, 'bin'), { recursive: true }); mkdirSync(join(bundle, 'lib/node_modules/npm/bin'), { recursive: true });
  executable(join(bundle, 'bin/node'), `#!/bin/sh\nexec ${quote(process.execPath)} "$@"\n`);
  writeFileSync(join(bundle, 'lib/node_modules/npm/bin/npm-cli.js'), "console.log('11.0.0');\n");
  symlinkSync('../lib/node_modules/npm/bin/npm-cli.js', join(bundle, 'bin/npm'));
  if (unsafeLink) symlinkSync('../../../outside', join(bundle, 'bin/escape'));
  const archive = join(root, `${top}.tar.gz`); const tar = command('tar');
  const packed = spawnSync(tar, ['-czf', archive, '-C', join(root, 'bundle'), top], { encoding: 'utf8' }); assert.equal(packed.status, 0, packed.stderr);
  const hash = createHash('sha256').update(readFileSync(archive)).digest('hex');
  const manifest = join(root, 'SHASUMS256.txt'); writeFileSync(manifest, `${hash}  ${top}.tar.gz\n`);
  const calls = join(root, 'downloads.jsonl');
  nodeStub(join(bin, 'curl'), `import fs from 'node:fs'; const args=process.argv.slice(2); const url=args.at(-1); const output=args[args.indexOf('--output')+1]; fs.appendFileSync(process.env.BOOTSTRAP_CALLS,JSON.stringify(url)+'\\n'); if(process.env.BOOTSTRAP_DOWNLOAD_FAIL==='1')process.exit(12); fs.copyFileSync(url.endsWith('SHASUMS256.txt')?process.env.BOOTSTRAP_MANIFEST:process.env.BOOTSTRAP_ARCHIVE,output);`);
  if (badArchivePath) nodeStub(join(bin, 'tar'), `import {spawnSync} from 'node:child_process'; if(process.argv[2]==='-tzf'){console.log('../escape');process.exit(0)} const r=spawnSync(${JSON.stringify(tar)},process.argv.slice(2),{stdio:'inherit'});process.exit(r.status??1);`);
  else symlinkSync(tar, join(bin, 'tar'));
  const proof = join(root, 'proof.json');
  const env = { ...process.env, PATH: bin, BOOTSTRAP_MANIFEST: manifest, BOOTSTRAP_ARCHIVE: archive, BOOTSTRAP_CALLS: calls, BOOTSTRAP_PROOF: proof };
  const run = (args = [], extra = {}) => spawnSync('/bin/sh', [join(directory, 'BOOTSTRAP.sh'), ...args], { cwd: root, env: { ...env, ...extra }, encoding: 'utf8', timeout: 20000 });
  return { root, bin, version, top, platform, manifest, calls, proof, run, cache: join(root, '.pbai4devs/tools/.cache/runtime/node', platform), directory };
}

test('POSIX: reutiliza Node/npm do PATH sem download e preserva argumentos e codigo', { skip: !posix }, t => {
  const f = fixture(t); symlinkSync(process.execPath, join(f.bin, 'node'));
  executable(join(f.bin, 'npm'), "#!/bin/sh\nprintf '11.0.0\\n'\n");
  const result = f.run(['grupo com espaco', 'literal$valor'], { BOOTSTRAP_SETUP_EXIT: '37' });
  assert.equal(result.status, 37, result.stderr); assert.equal(existsSync(f.calls), false);
  assert.deepEqual(JSON.parse(readFileSync(f.proof)).args, ['setup', 'grupo com espaco', 'literal$valor']);
  assert.match(result.stdout, /^node=\//); assert.equal(existsSync(f.cache), false);
});

test('POSIX: runtime-only reutiliza Node/npm sem executar setup ou criar cache', { skip: !posix }, t => {
  const f = fixture(t); symlinkSync(process.execPath, join(f.bin, 'node'));
  executable(join(f.bin, 'npm'), "#!/bin/sh\nprintf '11.0.0\\n'\n");
  const result = f.run(['--runtime-only'], { BOOTSTRAP_SETUP_EXIT: '37' });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /^node=\//);
  assert.equal(existsSync(f.proof), false); assert.equal(existsSync(f.calls), false); assert.equal(existsSync(f.cache), false);
});

test('POSIX: runtime-only prepara apenas o runtime e reutiliza-o sem download', { skip: !posix }, t => {
  const f = fixture(t); const result = f.run(['--runtime-only']);
  assert.equal(result.status, 0, result.stderr); assert.equal(existsSync(f.proof), false);
  assert.equal(existsSync(join(f.cache, f.version, 'bin/node')), true);
  const downloads = readFileSync(f.calls, 'utf8'); assert.equal(downloads.trim().split('\n').length, 2);
  rmSync(join(f.bin, 'curl'));
  assert.equal(f.run(['--runtime-only']).status, 0);
  assert.equal(readFileSync(f.calls, 'utf8'), downloads); assert.equal(existsSync(f.proof), false);
});

test('POSIX: runtime-only rejeita selecao e argumentos desconhecidos antes de alterar arquivos', { skip: !posix }, t => {
  const f = fixture(t);
  for (const extra of ['base', '--unknown']) {
    const result = f.run(['--runtime-only', extra]);
    assert.equal(result.status, 1); assert.match(result.stderr, /nao aceita selecao/);
  }
  assert.equal(existsSync(f.proof), false); assert.equal(existsSync(f.calls), false); assert.equal(existsSync(f.cache), false);
});

test('POSIX: sem Node baixa versao fixada, valida checksum e reutiliza cache depois', { skip: !posix }, t => {
  const f = fixture(t); const result = f.run(); assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(f.proof)).args, ['setup']);
  assert.deepEqual(readFileSync(f.calls, 'utf8').trim().split('\n').map(JSON.parse), ['https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt', `https://nodejs.org/dist/${f.version}/${f.top}.tar.gz`]);
  const node = join(f.cache, f.version, 'bin/node'); assert.ok(existsSync(node)); assert.match(result.stdout, /node=.*bootstrap com espaco-.*\/bin\/node/);
  const proof = JSON.parse(readFileSync(f.proof)); assert.equal(proof.path.split(':')[0], dirname(node));
  rmSync(join(f.bin, 'curl')); assert.equal(f.run(['base']).status, 0);
  assert.equal(readFileSync(f.calls, 'utf8').trim().split('\n').length, 2);
  assert.ok(readdirSync(f.cache).every(name => !name.startsWith('.stage.')));
});

test('POSIX: checksum, arquivo inseguro e download falho nao sao promovidos', { skip: !posix }, async t => {
  for (const scenario of ['checksum', 'path', 'link', 'download']) await t.test(scenario, subtest => {
    const f = fixture(subtest, { unsafeLink: scenario === 'link', badArchivePath: scenario === 'path' });
    if (scenario === 'checksum') writeFileSync(f.manifest, `${'0'.repeat(64)}  ${f.top}.tar.gz\n`);
    const result = f.run([], { BOOTSTRAP_DOWNLOAD_FAIL: scenario === 'download' ? '1' : '0' });
    assert.equal(result.status, 1, result.stdout); assert.equal(existsSync(f.proof), false);
    assert.equal(existsSync(join(f.cache, f.version)), false);
    assert.ok(readdirSync(f.cache).every(name => !name.startsWith('.stage.')));
  });
});

test('POSIX: falha de promocao restaura cache anterior', { skip: !posix }, t => {
  const f = fixture(t); const previous = join(f.cache, f.version); mkdirSync(previous, { recursive: true }); writeFileSync(join(previous, 'preserve.txt'), 'before');
  const mv = command('mv'); rmSync(join(f.bin, 'mv'));
  nodeStub(join(f.bin, 'mv'), `import {spawnSync} from 'node:child_process'; const args=process.argv.slice(2); if(args.some(arg=>arg.includes('/unpack/')))process.exit(19); const r=spawnSync(${JSON.stringify(mv)},args,{stdio:'inherit'});process.exit(r.status??1);`);
  const result = f.run(); assert.equal(result.status, 1); assert.equal(readFileSync(join(previous, 'preserve.txt'), 'utf8'), 'before');
  assert.ok(readdirSync(f.cache).every(name => !name.startsWith('.stage.')));
});

test('POSIX: interrupcao entre backup e promocao restaura cache anterior', { skip: !posix }, t => {
  const f = fixture(t); const previous = join(f.cache, f.version); mkdirSync(previous, { recursive: true }); writeFileSync(join(previous, 'preserve.txt'), 'before');
  const mv = command('mv'); rmSync(join(f.bin, 'mv'));
  nodeStub(join(f.bin, 'mv'), `import {spawnSync} from 'node:child_process'; const args=process.argv.slice(2); const result=spawnSync(${JSON.stringify(mv)},args,{stdio:'inherit'}); if(result.status===0&&args.at(-1).endsWith('/previous'))process.kill(process.ppid,'SIGTERM'); process.exit(result.status??1);`);
  const result = f.run(); assert.equal(result.status, 143, result.stderr); assert.equal(readFileSync(join(previous, 'preserve.txt'), 'utf8'), 'before');
  assert.ok(readdirSync(f.cache).every(name => !name.startsWith('.stage.')));
});

test('POSIX: wget substitui curl quando disponivel', { skip: !posix }, t => {
  const f=fixture(t); rmSync(join(f.bin,'curl'));
  nodeStub(join(f.bin,'wget'),`import fs from 'node:fs';const args=process.argv.slice(2);const url=args.at(-1);const output=args.find(arg=>arg.startsWith('--output-document=')).slice('--output-document='.length);fs.appendFileSync(process.env.BOOTSTRAP_CALLS,JSON.stringify(url)+'\\n');fs.copyFileSync(url.endsWith('SHASUMS256.txt')?process.env.BOOTSTRAP_MANIFEST:process.env.BOOTSTRAP_ARCHIVE,output);`);
  const result=f.run();assert.equal(result.status,0,result.stderr);assert.equal(readFileSync(f.calls,'utf8').trim().split('\n').length,2);
});

test('POSIX: falta de downloader falha antes da rede', { skip: !posix }, t => {
  const f = fixture(t); rmSync(join(f.bin, 'curl')); const result = f.run();
  assert.equal(result.status, 1); assert.match(result.stderr, /curl ou wget/); assert.equal(existsSync(f.calls), false); assert.equal(existsSync(f.proof), false);
});

test('POSIX: musl seleciona somente distribuicao oficial exata', { skip: !posix }, async t => {
  await t.test('x64 disponivel', subtest => { const f = fixture(subtest, { platform: 'linux-x64-musl' }); const result = f.run(); assert.equal(result.status, 0, result.stderr); assert.match(readFileSync(f.calls, 'utf8'), /linux-x64-musl\.tar\.gz/); });
  await t.test('arm64 ausente', subtest => { const f = fixture(subtest, { platform: 'linux-arm64-musl' }); writeFileSync(f.manifest, `${'0'.repeat(64)}  node-v24.1.2-linux-arm64.tar.gz\n`); const result = f.run(); assert.equal(result.status, 1); assert.match(result.stderr, /indisponivel para linux-arm64-musl/); assert.equal(readFileSync(f.calls, 'utf8').trim().split('\n').length, 1); });
});

test('POSIX: cache simbolico e manifestos ambiguos sao recusados', { skip: !posix }, async t => {
  await t.test('cache link', subtest => { const f = fixture(subtest); mkdirSync(dirname(f.cache), { recursive: true }); symlinkSync(f.root, f.cache); const result=f.run(); assert.equal(result.status,1); assert.match(result.stderr,/link simbolico/); assert.equal(existsSync(f.calls),false); });
  await t.test('duas versoes', subtest => { const f=fixture(subtest); const manifest=readFileSync(f.manifest,'utf8'); writeFileSync(f.manifest,manifest+manifest.replaceAll('v24.1.2','v24.1.3')); const result=f.run(); assert.equal(result.status,1); assert.match(result.stderr,/indisponivel/); assert.equal(existsSync(f.proof),false); });
});

test('PowerShell: analisa sintaxe quando pwsh esta instalado', t => {
  const shell = spawnSync(process.platform === 'win32' ? 'powershell.exe' : 'pwsh', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()'], { encoding: 'utf8' });
  if (shell.error?.code === 'ENOENT') { t.skip('PowerShell indisponivel nesta plataforma; execucao Windows nao comprovada.'); return; }
  assert.equal(shell.status,0,shell.stderr);
  const script = join(project,'.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.ps1');
  const result=spawnSync(process.platform === 'win32' ? 'powershell.exe' : 'pwsh',['-NoProfile','-Command','$tokens=$null;$errors=$null;[System.Management.Automation.Language.Parser]::ParseFile($env:AGENTDEVKIT_PS_TEST_PATH,[ref]$tokens,[ref]$errors)|Out-Null;if($errors.Count){$errors|Out-String|Write-Error;exit 1}'],{encoding:'utf8',env:{...process.env,AGENTDEVKIT_PS_TEST_PATH:script}});
  assert.equal(result.status,0,result.stderr);
});
