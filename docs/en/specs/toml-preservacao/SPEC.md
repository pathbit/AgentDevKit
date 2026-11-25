---
description: "Preserving Prompts TOML Humans in Gemini Commandos."
status: rascunho
language: en
---

# Preserving Prompts TOML

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

> Historical Draft. Since `0.0.36`, the kit ceases to create or renew
> notes on `.gemini/`. The evidence below records the behavior of
> previous versions and prototypes. [migration][migration], the kit preserves
> own content and can withdraw only the proven contribution from the kit.

Editing a Gemini command should add, update or remove the AgentDevKit block
without reserializing human content from `prompt`. This document proposes a
contract; it does not yet approve an implementation or proves compatibility.

## Contract

- Preserve the human bytes outside the passages whose property and alteration
  are proven, including comments, keys, BOM, spaces and finals LF/CRLF. Preserve
  also the semantic value of human content within `prompt`.
- Accept the four forms TOML: simple basic, simple literal, basic multiline and
  literal multiline. Modify only raw spans whose relation to the decoded value
  is demonstrable; revalidate the TOML Produced. Preserve existing escapes and
  continuations without normalizing them.
- Simple literal String does not represent a multiline block with the same
  delimiters. Admit its promotion to the literal multiline only when the bytes
  of the human content are preserved and verifiable provenance for the reversal.
  Otherwise, preserve the file and inform the impediment. Also refuse any
  managed text that is not representative with the syntax chosen without
  rewriting human content.
- Identify only the recognized block and the proven auxiliary changes as
  inserted separators and delimiters as the property of the kit. The provenance
  must be versioned, limited, linked to the block and not contain a copy of the
  human text. The candidate uses a comment TOML Out `prompt`; a hash
  demonstrates consistency, not authentication. Compatibility with old versions
  and with the real client continues to require proof. [Gemini command
  format][gemini-command].
- When `prompt` it did not exist, only remove the entire assignment if it is
  proven that it was created by the kit and remains exclusively managed.
  Otherwise, preserve the assignment and inform the ambiguity.
- Preserve human editions made before or after installation. If an issue touches
  block, delimiters, separators or borders so that its possession cannot be
  proven, interrupt the change of that file and inform the conflict; do not
  choose a destructive interpretation.
- Keep sync installed executable with Node, without depending on `node_modules`
  the consumer project or temporary package cache. Any production parser must
  accompany the kit with verified version and license; the test independent
  parser does not prove this distribution.
- A CLI current extracts the `prompt` of the notes generated assuming a string
  JSON in a row. Preserve this form of generation or replace the extraction by
  proven semantic reading before changing the generated format.
- CLI and sync must produce the same block for the same command without
  switching its reference or arguments. CLI included `{{args}}` in the combined
  block and the sync removed it; with `{{args}}` in the human prompt, CLI added
  another occurrence. In a non-modeled test, the Gemini charger replaced both
  and doubled the argument in the text prepared for the model. Preserve the
  human placeholders and avoid duplication before setting the correction. Also
  consider placeholders in files included by `@{...}`: count only the text of
  the TOML does not prove the result after expansion. In a test with the Gemini
  charger 0.67.0, a reference containing `{{args}}` doubled the argument when
  the TOML It also contained the bookmark. When only the included file had the
  bookmark, it remained literal and the invocation was added to the end. The
  proof used permissive file filtering and did not execute template or full
  session.
- Keep intact the bytes of the Git index and the human changes staged and
  unstaged. TOML staged, allow change only if human spans are proven to be
  preserved; otherwise, refuse without discarding content.
- For legacy installations without provenance, preserve the current
  representation. Do not invent the syntax prior to reserialization; keep
  separators of unknown origin or refuse when it is not possible to isolate the
  block.
- Consider Old Versions of CLI and sync: they can ignore provenance, remove it
  or reserialize the prompt. Define and test coexistence and downgrade policy
  before delivery; do not promise that a new lock prevents an old binary that
  does not recognize it. An isolated proof confirmed that the public helper
  `0.0.21` eliminates the prototype metadata and normalizes the representation;
  experimental implementation then refuses to remove it without new evidence.
  CLI or sync.

As minimum coverage, addition, update and removal should work for simple prompts
in each of the four string forms, in addition to `prompt` absent, with LF, CRLF
and GOOD. The refusal of ambiguous or non-representable cases does not replace
this coverage; the preserved file is the state immediately prior to the refused
operation. [integration map](INTEGRACAO.md) details the status points and the
evidence still pending.

## Acceptance criteria

1. **AC-001:** In the four supported forms, adding and removing a block without
   intermediate human editing restores the original byte to byte file, including
   delimiters, BOM, CRLF/LF, spaces and comments. Where not possible, the
   operation is refused and the original file remains intact.
2. **AC-002:** Add and update maintain the human value of the prompt; a second
   update is idempotent. Removing only removes bytes of proven property and
   preserves non-ambiguous human editions. Ambitional edits are rejected.
3. **AC-003:** Fixtures cover `prompt` absent and present, empty text, Unicode
   exhausts, bars, multiline continuations, quotes in content and closings with
   three to five quotes; also cover duplicate, invalid or modified markers and
   UTF- 8 invalid, each case has resulted in explicit limits.
4. **AC-004:** CLI and direct sync apply the same contract. Tests with staged
   index and unstaged changes confer human bytes and index before and after,
   including removal and agent exchange. `init` → `sync` → `update` and the
   reverse order, with and without `{{args}}` human and legacy blocks. Conflict
   TOML identified in the planning blocks all application before public writing,
   including state and derivatives. Later failures follow the current recovery
   limits.
5. **AC-005:** Legacy without provenance preserves current representation or is
   refused; downgrade and coexistence are tested without assigning guarantees to
   versions that ignore the new policy. Paths and state are not migrated
   silently.
6. **AC-006:** The validity and semantic value of TOML produced are also checked
   with parser TOML independent available in the test environment; if
   unavailable, this check remains unchecked. Code tests are versioned; results
   and fixtures are in ignored or temporary area. Test the actual package and
   sync installed in project without `node_modules` or `package.json`.

## Proposed stages

1. Define raw spans and provenance, representation to the four forms, state
   transition and conservative legacy policy and mixed versions.
2. Implement editing and removal with safe refusal, integrating CLI and sync and
   preserving the staged contract. Maintain legible legacy formats.
3. Run the test matrix on available platforms, independent validation and a diff
   review; separately record faults and unverified cases before any publication.

The proof versioned `node tests/toml-preservation-proof.mjs` recorded 40
differences in previous implementation. After local integration, the same 40
cases passed in macOS with bytes restoration; this synthetic proof does not use
independent parser or real client. BSD-3-Claude passed init, update and sync on
project without `node_modules`, in macOS and Linux; in another fixture, sync
preserved the TOML staged and returned conflict in both systems. An isolated
adjustment that aligns the sync block to CLI eliminated this conflict in a
fixture macOS without modifying the index. It does not solve the duplication of
`{{args}}` nor does it prove actual updates of staged files. It is not a release
nor does it prove the other cases. These observations do not complete the
criteria of acceptance.

In four synthetic projects, the CLI published `0.0.21` added and removed the
block by changing the selection of customers, but left three extra line breaks
in the value of each prompt. The charger Gemini accepted the steps and an
independent parser confirmed the difference; there was no inference.
`.gitignore`, o README and the human notes were preserved, while the TOML
changed and `info/exclude` received an addition. The proof does not cover all
TOML types. The same cycle was repeated on Linux ARM64, without network, with
four fixtures and independent parser: the three extra breaks and the addition to
`info/exclude` This repetition did not execute the Gemini charger or model.

## Limits

Comparison and editing do not make a sequence of atomic operations nor prevent
concurrent file or ancestor exchange. The previous syntax already rewritten by
old versions cannot be reconstructed without evidence. The rollback security,
permissions, ACLs and recovery after interruption belongs to the conservative
recovery spec and is not proven by this TOML contract.

[gemini-command]: https://geminicli.com/docs/cli/custom-commands/
[migration]: ../../guides/installation.md#update-and-choose-agents

[reading-pt]: ../../../specs/toml-preservacao/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/toml-preservacao/SPEC.md
