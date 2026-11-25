---
description: "Verified preservation corrections, transactions and CLI interface."
status: aprovado
version: 0.0.8
language: en
---

# Preservation and in-depth validation

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objective and authorisation

Meet the request for deep review, correcting proven failures and publishing a
new stable version after validation. [PRD](../../product/prd.md), o
[design](../../product/design.md) and [tests in real
projects](../v0.0.7/SPEC.md).

## Contract

- Do not delete or overwrite human files by the appearance of your Markdown.
  Require proven property for automatic cleanup of notes.
- Refuse known conflicts before writing. In later failures, restore own changes
  without replacing competing human editions.
- Preserve up-to-date, backup, and rollback permissions, including in read-only
  files when the operation is allowed by the system.
- Refuse symbolic components in local tool paths, including after external
  operations, before writing or confirming an installation.
- Preserve fully arguments after `tools ... --`; help and version do not require
  valid project directory.
- Check existing artifacts and literal exceptions beyond the sample names,
  without reading ignorant brother projects or unindexing human files.
- Maintaining the refusal of incompatible Zod symbolic links; do not convert
  this documented lock into a successful installation.

## Acceptance criteria

| ID | Observable result |
| --- | --- |
| AC-001 | Human Markdown is preserved; cleanliness uses proven property. |
| AC-002 | Failures do not leave partial own recordings or change permissions. |
| AC-003 | Manager does not write out of installation by symbolic links. |
| AC-004 | CLI replays arguments; help works without project. |
| AC-005 | Ignore protecting artifacts without invading brother projects. |
| AC-006 | Returns, public package and router update are checked. |

## Verification

For AC-001 the AC-005, keep previous reproductions and regression tests that
fail before correction, with assertions of content, mode, status and Git. Run
the relevant tests in Node 24/26 and review the diffs independently. Platform
limitations should be explicit.

For AC-006, run complete pipeline, maturity and matrix scenarios OSS from the
generated package. Confirm on IC Linux, macOS and Windows; publish the same TGZ,
compare checksum and repeat public consumption. Update the router with preview,
backup, diagnosis and comparison of baseline, preserving the existing index.

Tests and fixtures are versioned. Clones and evidence stay in `tmp/` and the
review record in `.agent-tests/`. Do not promise universal absence of bugs.

## Documentation affected

Update reference from CLI, installation, tools, changelog, README, roadmap and
indexes. Do not create product documents in consumer projects.

[reading-pt]: ../../../specs/v0.0.8/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/v0.0.8/SPEC.md
