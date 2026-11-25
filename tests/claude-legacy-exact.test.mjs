import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { canMigrateClaudeReference, isLegacyExact, legacyClaudeGitTarget } from '../.pbai4devs/scripts/lib/claude-legacy-exact.mjs';

const source = Buffer.from('---\ntrigger: always_on\ndescription: Exemplo sintético para projetos.\n---\n\n# Regra sintética\n\nCorpo da origem.\n');
const body = '\n# Regra sintética\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/rules/demo/RULE.md).\n';
const old = Buffer.from('---\ntrigger: always_on\ndescription: Exemplo sintético para projetos.\n---\n' + body);
const current = Buffer.from('---\ndescription: "Exemplo sintético para projetos."\n---\n' + body);

test("legacy reference requires bytes and subset YAML explicit", () => {
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

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const target = '.claude/rules/demo/RULE.md';

test("Claude update requires intact registration, canonical origin and even scope", () => {
  const replacement = Buffer.from('---\ndescription: "Nova descrição."\n---\n' + body);
  const prove = (prior, next = replacement, changes = {}) => canMigrateClaudeReference({
    target, current: prior, replacement: next, recordedHash: digest(prior), ...changes,
  });
  assert.equal(prove(current), true);
  assert.equal(prove(current, replacement, { recordedHash: undefined }), false);
  assert.equal(prove(current, replacement, { recordedHash: digest(old) }), false);
  assert.equal(prove(current, replacement, { blocked: true }), false);
  assert.equal(prove(old), false, 'A forma legada genérica não é uma impressão de versão publicada.');
  const scoped = Buffer.from('---\npaths: ["src/**/*.ts"]\n---\n' + body);
  const scopedReplacement = Buffer.from(scoped.toString().replace('# Regra sintética', '# Novo título'));
  assert.equal(prove(scoped, scopedReplacement), true);
  assert.equal(prove(scoped), false);
  assert.equal(prove(scoped, Buffer.from(scopedReplacement.toString().replace('src/', 'test/'))), false);
  const original = current.toString();
  for (const bytes of [
    original + '\n', original + '\nEdição humana.\n',
    original.replace('description:', 'ambiguous: true\ndescription:'),
    original.replace('Exemplo', '\\u0045xemplo'),
    original.replace('/demo/', '/outra/'),
    original.replace('/demo/', '/d%65mo/'),
    original.replace('Leia e siga', 'Leia'), original.replaceAll('\n', '\r\n'),
  ]) {
    assert.notEqual(bytes, original);
    assert.equal(prove(Buffer.from(bytes)), false, bytes);
  }
});

test("Git removal requires published note and record simultaneously", () => {
  const recorded = Buffer.from('---\ntrigger: model_decision\ndescription: Aplique ao preparar, integrar ou publicar alterações Git.\n---\n'
    + '\n# Regras Git\n\n<!-- gerado: sincronizar-agentes -->\nLeia e siga [origem](../../../.pbai4devs/rules/git/RULE.md).\n');
  const proof = { target: legacyClaudeGitTarget, current: recorded, replacement: null, recordedHash: digest(recorded) };
  assert.equal(canMigrateClaudeReference(proof), true);
  assert.equal(canMigrateClaudeReference({ ...proof, target }), false);
  assert.equal(canMigrateClaudeReference({ ...proof, recordedHash: undefined }), false);
  const edited = Buffer.from(recorded.toString().replace('alterações Git', 'alterações humanas Git'));
  assert.equal(canMigrateClaudeReference({ ...proof, current: edited, recordedHash: digest(edited) }), false);
});
