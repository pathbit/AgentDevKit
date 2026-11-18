import test from 'node:test';
import assert from 'node:assert/strict';
import { isLegacyExact } from '../.pbai4devs/scripts/lib/claude-legacy-exact.mjs';

const source = Buffer.from('---\ntrigger: always_on\ndescription: Exemplo sintético para projetos.\n---\n\n# Regra sintética\n\nCorpo da origem.\n');
const body = '\n# Regra sintética\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/rules/demo/RULE.md).\n';
const old = Buffer.from('---\ntrigger: always_on\ndescription: Exemplo sintético para projetos.\n---\n' + body);
const current = Buffer.from('---\ndescription: "Exemplo sintético para projetos."\n---\n' + body);

test('referência legada exige bytes e subconjunto YAML explícito', () => {
  assert(isLegacyExact(source, old, current, 'demo'));
  const text = source.toString('utf8');
  const variants = [
    text.replace('trigger: always_on', 'trigger: manual'),
    text.replace('description:', 'paths: ["src/**"]\ndescription:'),
    text.replace('trigger: always_on', 'trigger: always_on\ntrigger: always_on'),
    ...['null', 'true', 'yes', '- texto', 'texto # comentário', '"quebrado', '&a texto', '|\n  texto', '!!str texto'].map(value => text.replace(/^description: .*$/m, `description: ${value}`)),
    text.replaceAll('\n', '\r\n'), '\ufeff' + text,
  ];
  for (const v of variants) assert.equal(isLegacyExact(Buffer.from(v), old, current, 'demo'), false, v);
  for (const v of [old.toString().replace('Leia e siga', 'Leia'), old.toString().replace('/demo/', '/outra/'), old.toString() + '\n']) assert.equal(isLegacyExact(source, Buffer.from(v), current, 'demo'), false);
  assert.equal(isLegacyExact(source, old, Buffer.concat([current, Buffer.from('\n')]), 'demo'), false);
  assert.equal(isLegacyExact(source, old, current, '../demo'), false);
  assert.equal(isLegacyExact(Buffer.concat([source, Buffer.from([0xff])]), old, current, 'demo'), false);
});
