---
description: "Complement existing instructions without replacing human content."
status: aprovado
version: 0.0.12
language: en
---

# Integration without substitution

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

> The contract below is historical. The later decision is not to edit
> `.git/info/exclude` neither create or change ignores at the root or at the
> customers.
> The unknowns in the hub are also preserved.
> and its validation are pending in [roadmap](../../product/roadmap.md).
>
> The AC-006 criterion records integration TOML from previous versions.
> `0.0.36`, the kit ceases to create or renew notes on `.gemini/`- No, no, no.
> [migration][migration], the kit preserves its own content and can remove
> only his proven contribution. `GEMINI.md` Stays in Antigravity.

## Objective

When installing, updating or synchronizing, adding AgentDevKit references to
existing instruction files. Preserve content, metadata, names, permissions, and
Git index of the user, including in name collisions.

## Contract

- Existing root inputs receive a short block; unique aliases like `agents.md`
  are reused without creating a second entry.
- Existing Skills, Agents, Rules and Markdown Commands receive only one
  reference to the hub. Human frontmatter is not replaced.
- Existing Gemini commands receive the reference within `prompt`, in TOML valid.
  Unsupported Syntax is preserved and informed.
- The state records the property of the block, never the entire human file.
- Updates preserve human editions outside the block. Ambiguous markers or
  tampered blocks prevent replacement, including with `--force`.
- Removing a managed resource only removes your proven contribution.
- Human files remain subject to Git's own project choices; the kit ignores its
  derivatives by file, not the entire client folder.
- Symbolic links are not followed. Settings outside the scope of instructions
  are neither reformatted nor arbitrarily merged.

## Acceptance criteria

| ID | Observable result |
| --- | --- |
| AC-001 | Human root inputs receive the reference and preserve their bytes. |
| AC-002 | Markdown Collisions preserve frontmatter and text, with single block. |
| AC-003 | Repeats are idempotent; editions outside the block are preserved. |
| AC-004 | Changed blocks, ambiguities and links do not cause data loss. |
| AC-005 | Block withdrawal preserves text, permissions and human index. |
| AC-006 | TOML maintains human semantics and valid reference in the prompt. |
| AC-007 | Git doesn't ignore human files by partial ownership. |
| AC-008 | Real package, regressions, maturity and independent review pass. |

## Validation

Existing Fixtures include own frontmatter, different box, BOM, CRLF, absence of
final newline, subsequent changes, already staged files and structured commands.
Test source loss, rollback, `--force`, simulation, `doctor`, `sync --check` and
installation of the generated package.

Tests are versioned. Backups, snapshots and reports are ignored in
`.agent-tests/` or `tmp/`; do not change consumer projects in this delivery.

[migration]: ../../guides/installation.md#update-and-choose-agents

[reading-pt]: ../../../specs/additive-integration/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/additive-integration/SPEC.md
