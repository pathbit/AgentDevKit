// Internal worker: the lifecycle harness runs this inside its offline sandbox.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const [file, parserPath, loaderPath] = process.argv.slice(2);
const text = readFileSync(file, 'utf8');
const report = { parser: { status: 'not-verified' }, loader: { status: 'not-verified' } };
if (parserPath) {
  try {
    const parser = createRequire(import.meta.url)(parserPath);
    const data = parser.parse(text);
    report.parser = { status: 'observed', prompt: data.prompt, description: data.description };
  } catch {
    report.parser = { status: 'failed' };
  }
}
if (loaderPath) {
  try {
    const { FileCommandLoader } = await import(pathToFileURL(loaderPath).href);
    const loader = new FileCommandLoader(null);
    const base = file.slice(0, file.lastIndexOf('/'));
    const command = await loader.parseAndAdaptFile(file, base, 'workspace-file');
    const expected = file.slice(file.lastIndexOf('/') + 1).replace(/\.toml$/, '');
    const valid = command && command.name === expected && command.kind === 'workspace-file' && typeof command.action === 'function';
    report.loader = { status: valid ? 'accepted' : 'rejected' };
    // Deliberately do not invoke command.action.
  } catch {
    report.loader = { status: 'failed' };
  }
}
console.log(JSON.stringify(report));
