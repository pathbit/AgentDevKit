---
description: "Same public version in the npm and GitHub Packages and cleaning the failed history."
status: aprovado
language: en
---

# Synchronized publication

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objective

Remove old executions with error, preserving approved executions and published
releases. Publish the same AgentDevKit in npm and GitHub Packages without
changing the number or content of an already published version.

## Contract

- Delete only completed executions with confirmed failure.
- Preserve tags, releases, assets and approved executions.
- Use TGZ original approved by the IC in both registers.
- Keep `npx` by public npm without authentication as default option.
- Authenticate GitHub with its own token, without sharing credentials.
- Confirm public visibility, version and integrity in both destinations.
- Publish both in the next tags; allow to complete only one destination.
- Refuse an existing version with different bytes; never repackage the tag.

## Acceptance criteria

| ID | Proof |
| --- | --- |
| AC-001 | Executions failures removed; approved and released preserved. |
| AC-002 | Same version and even checksum on both registers. |
| AC-003 | GitHub public and associated with the correct repository. |
| AC-004 | Isolated tokens and anonymous access to preserved npm. |
| AC-005 | Automation publishes both and allows you to resume a destination. |
| AC-006 | Tests and review approved; consumption of the two destinations verified. |

## Validation

Compare remote inventories antes/depois Cleanup. Test registry profiles,
authentication errors, divergent integrity, repetition and workflow selection.
Complete version `0.0.9` in GitHub with its original artifact, compare the
registers and prove installation, diagnosis and synchronization.

Evidence remains in `tmp/` or `.agent-tests/`, ignored by Git.

[reading-pt]: ../../../specs/dual-registry/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/dual-registry/SPEC.md
