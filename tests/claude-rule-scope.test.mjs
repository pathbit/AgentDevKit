import test from 'node:test';
import assert from 'node:assert/strict';
import { parseClaudePaths, planClaudeRule, serializeClaudePaths } from '../.pbai4devs/scripts/lib/claude-rule-scope.mjs';

const meta = paths => `---\npaths: ${JSON.stringify(paths)}\n---\n`;

test("always_on is global; manual and model_decision only have explicit reference", () => {
  const global = planClaudeRule({ trigger: 'always_on' });
  assert.equal(global.status, 'ready');
  assert.equal(global.activation, 'always');
  assert.equal(global.nativeDirectory, 'rules');
  assert.equal(global.paths, null);
  for (const trigger of ['manual', 'model_decision']) {
    const result = planClaudeRule({ trigger });
    assert.equal(result.status, 'reference-only');
    assert.equal(result.activation, 'explicit-only');
    assert.equal(result.nativeDirectory, 'references/rules');
    assert.equal(result.equivalence, 'not-verified');
  }
});

test("glo without metadata Claude does not become global nor is it inferred from Antigravity", () => {
  const result = planClaudeRule({ trigger: 'glob', globs: '**/*.ts' });
  assert.equal(result.status, 'reference-only');
  assert.equal(result.activation, 'explicit-only');
  assert.equal(result.reason, 'native-scope-not-provided');
  assert.equal(result.equivalence, 'not-verified');
});

test("glob requires explicit path and accepts only the subset listed", () => {
  const yaml = `---\npaths:\n  - 'src/**/*.ts'\n  - "tests/**/*.test.ts"\n  - '/README.md'\n  - 'docs/file#name.md'\n  - 'docs/it''s.md'\n---\n`;
  const result = planClaudeRule({ trigger: 'glob', nativeMetadata: yaml });
  assert.equal(result.status, 'ready');
  assert.equal(result.activation, 'paths');
  assert.equal(result.nativeDirectory, 'rules');
  assert.deepEqual(result.paths, ['src/**/*.ts', 'tests/**/*.test.ts', '/README.md', 'docs/file#name.md', "docs/it's.md"]);
  assert.equal(result.equivalence, 'not-verified');
  assert.deepEqual(parseClaudePaths(meta(['src/**/*.ts', '*.md'])), { ok: true, paths: ['src/**/*.ts', '*.md'] });
  assert.deepEqual(parseClaudePaths('---\r\npaths: ["src/**/*.ts"]\r\n---\r\n'), { ok: true, paths: ['src/**/*.ts'] });
});

test("YAML not supported, ambiguous or invalid blocks without creating global rule", () => {
  const cases = [
    '', 'paths: ["src/**"]', '\uFEFF---\npaths: ["src/**"]\n---\n',
    '---\npaths: ["src/**"]\n', '---\rpaths: ["src/**"]\r---\r',
    '---\npaths: []\n---\n', '---\npaths: null\n---\n', '---\npaths:\n---\n',
    '---\npaths: ["src/**", null]\n---\n', '---\npaths: ["src/**", 1]\n---\n',
    '---\npaths: ["src/**", {"x": 1}]\n---\n',
    '---\npaths: ["src/**"]\npaths: ["**"]\n---\n',
    '---\npaths: ["src/**"]\n"paths": ["**"]\n---\n',
    '---\n"paths": ["src/**"]\npaths: ["**"]\n---\n',
    '---\npaths: ["src/**"] # comentário\n---\n',
    '---\npaths:\n  - src/** # comentário\n---\n',
    '---\npaths: ["src/**"]\ndescription: texto\n---\n',
    '---\npaths: &scope ["src/**"]\n---\n',
    '---\npaths: *scope\n---\n', '---\n<<: *scope\npaths: ["src/**"]\n---\n',
    '---\npaths: !!seq ["src/**"]\n---\n',
    '---\npaths: |\n  src/**\n---\n', '---\npaths:\n\t- "src/**"\n---\n',
    '---\npaths:\n  - "src/**\n---\n', '---\npaths: ["src/\\q"]\n---\n',
    '---\npaths: ["src/**"]\n---\n---\npaths: ["**"]\n---\n',
    '---\npaths: ["src/**", "src/**"]\n---\n',
  ];
  for (const yaml of cases) {
    const result = planClaudeRule({ trigger: 'glob', nativeMetadata: yaml });
    assert.equal(result.status, 'blocked', JSON.stringify(yaml));
    assert.notEqual(result.action, 'create-reference', JSON.stringify(yaml));
    assert.notEqual(result.activation, 'always', JSON.stringify(yaml));
  }
});

test("patterns that depend on dialect or expansion are not divided or accepted", () => {
  for (const pattern of ['src/**/*.{ts,tsx}', 'src/**/*.ts,tests/**/*.ts', 'photos \\[2024/**', '[abc]/**/*.js', 'src/[bad/**', 'foo\\bar/**', '!private/**', '../outside/**', '/a/../b', 'C:/src/**', '//host/**', 'src//**', ' a/**', 'a/** ', 'a\u2028b']) {
    const result = planClaudeRule({ trigger: 'glob', nativeMetadata: meta([pattern]) });
    assert.equal(result.status, 'blocked', JSON.stringify(pattern));
  }
  // No keys no branch expansion; text beyond documented limit
  // it is also blocked before analyzing or producing a partial frontmatter.
  assert.equal(planClaudeRule({ trigger: 'glob', nativeMetadata: meta(['x'.repeat(4 * 1024 * 1024)]) }).reason, 'metadata-too-large');
});

test("serialization cites the paths and preserves special text in the round-trip", () => {
  const paths = Object.freeze(['src/**/*.ts', '/README.md', 'docs/ação #1.md', 'docs/it\'s "special".md', 'tests/🎯.test.js']);
  const frontmatter = serializeClaudePaths(paths);
  assert.equal(frontmatter, `---\npaths: ${JSON.stringify(paths)}\n---\n`);
  assert.deepEqual(parseClaudePaths(frontmatter), { ok: true, paths: [...paths] });
  assert.deepEqual(paths, ['src/**/*.ts', '/README.md', 'docs/ação #1.md', 'docs/it\'s "special".md', 'tests/🎯.test.js']);
  for (const invalid of [[], [''], ['src/**', 'src/**'], ['src/**/*.{ts,tsx}'], ['src/**,tests/**'], ['src/**', null], ['../outside'], ['x'.repeat(4 * 1024 * 1024)]]) {
    assert.throws(() => serializeClaudePaths(invalid));
  }
  for (const invalid of [null, undefined, 'src/**', {}]) assert.throws(() => serializeClaudePaths(invalid));
});

test("Unicode isolated surrogates are refused before generation and in human content", () => {
  for (const escape of ['\\ud800', '\\udc00', '\\ud800x', 'x\\udc00', '\\ud800\\ud800']) {
    const flow = `---\npaths: ["${escape}"]\n---\n`;
    const block = `---\npaths:\n  - "${escape}"\n---\n`;
    for (const yaml of [flow, block]) {
      assert.equal(parseClaudePaths(yaml).ok, false, escape);
      assert.equal(planClaudeRule({ trigger: 'glob', nativeMetadata: yaml }).status, 'blocked', escape);
      const collision = planClaudeRule({ trigger: 'glob', nativeMetadata: meta(['src/**']), humanFile: `${yaml}\n# Humano\n` });
      assert.equal(collision.action, 'preserve-human');
      assert.equal(collision.scopeMatches, false);
    }
  }
  for (const value of ['\ud800', '\udc00', '\ud800x', 'x\udc00', '\ud800\ud800']) assert.throws(() => serializeClaudePaths([value]));
  assert.deepEqual(parseClaudePaths('---\npaths: ["\\ud83c\\udfaf"]\n---\n'), { ok: true, paths: ['🎯'] });
  assert.deepEqual(parseClaudePaths(serializeClaudePaths(['tests/🎯.js'])), { ok: true, paths: ['tests/🎯.js'] });
});

test("characters out of c-printable YAML are not accepted", () => {
  for (const escape of ['\\ufffe', '\\uffff']) {
    for (const yaml of [`---\npaths: ["${escape}"]\n---\n`, `---\npaths:\n  - "${escape}"\n---\n`]) {
      assert.equal(parseClaudePaths(yaml).ok, false);
      assert.equal(planClaudeRule({ trigger: 'glob', nativeMetadata: yaml }).status, 'blocked');
      assert.equal(planClaudeRule({ trigger: 'always_on', humanFile: `${yaml}\n# Humano\n` }).scopeMatches, false);
    }
  }
  for (const char of ['\ufffe', '\uffff']) assert.throws(() => serializeClaudePaths([`a${char}b`]));
});

test("Unicode or control spaces are not interpreted as separators YAML", () => {
  for (const separator of ['\u000b', '\u00a0', '\ufeff', '\u2028', '\u2029']) {
    for (const yaml of [`---\npaths:${separator}["src/**"]\n---\n`, `---\npaths: ${separator}["src/**"]\n---\n`, `---\npaths: ["src/**"]${separator}\n---\n`, `---\npaths: ["src/**"]\n---\n${separator}`]) {
      assert.equal(parseClaudePaths(yaml).ok, false, JSON.stringify(yaml));
      assert.equal(planClaudeRule({ trigger: 'glob', nativeMetadata: yaml }).status, 'blocked');
      assert.equal(planClaudeRule({ trigger: 'always_on', humanFile: yaml }).action, 'preserve-human');
    }
  }
});

test("contradictory metadata and invalid triggers never generate automatic rule", () => {
  for (const trigger of ['always_on', 'manual', 'model_decision']) {
    const result = planClaudeRule({ trigger, nativeMetadata: meta(['src/**']) });
    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'metadata-not-applicable');
  }
  for (const trigger of ['other', '', null, undefined]) assert.equal(planClaudeRule({ trigger }).status, 'blocked');
  assert.equal(planClaudeRule({ trigger: 'glob', nativeMetadata: null }).status, 'blocked');
});

test("human collisions are preserved even with equal scope or identical content", () => {
  const input = meta(['src/**/*.ts']);
  const human = `${input}\n# Instrução da equipe\n\nNão alterar.\n`;
  const same = planClaudeRule({ trigger: 'glob', nativeMetadata: input, humanFile: human });
  assert.equal(same.status, 'preserved');
  assert.equal(same.action, 'preserve-human');
  assert.equal(same.scopeMatches, true);
  const unequal = planClaudeRule({ trigger: 'glob', nativeMetadata: input, humanFile: `${meta(['**'])}\n# Humano\n` });
  assert.equal(unequal.scopeMatches, false);
  assert.equal(unequal.action, 'preserve-human');
  const ambiguous = planClaudeRule({ trigger: 'glob', nativeMetadata: input, humanFile: '---\npaths: ["src/**"]\npaths: ["**"]\n---\n# Humano\n' });
  assert.equal(ambiguous.status, 'preserved');
  assert.equal(ambiguous.scopeMatches, false);
  assert.equal(ambiguous.action, 'preserve-human');
  assert.equal(planClaudeRule({ trigger: 'always_on', humanFile: '# Humano\n' }).scopeMatches, true);
  assert.equal(planClaudeRule({ trigger: 'always_on', humanFile: human }).scopeMatches, false);
  assert.equal(planClaudeRule({ trigger: 'manual', humanFile: human }).action, 'preserve-human');
  assert.throws(() => planClaudeRule({ trigger: 'glob', humanFile: null }), TypeError);
});
