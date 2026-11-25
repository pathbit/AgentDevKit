---
description: "Preserve ignore the project when installing AgentDevKit."
language: en
---

# Ignore the project

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

> This spec records the historical contract of the release. The subsequent
> decision is not
> edit `.git/info/exclude` neither create or change ignores at the root or at
> the customers.
> The ignores existing in the hub are also preserved.
> criteria and their validation are pending in the
> [roadmap](../../product/roadmap.md).

The file `.gitignore` root belongs to the project. Installation, update and
synchronization preserve their bytes, permissions and status in the Git index,
including when an old state of the kit records this file.

## Acceptance criteria

- AC-001: The kit does not create, change, remove or unindex `.gitignore` from
  the root.
- AC-002: Local derivatives and artifacts are protected via `.git/info/exclude`.
- AC-003: Conflicts with human rules are informed before changes; ambiguous
  exceptions are not considered safe only because of the file's absence.
- AC-004: Without Git, the installation informs the to-do and guides to perform
  synchronization after `git init` and before `git add`.
- AC-005: Existing human files and configurations are preserved.
- AC-006: Installation and update are verified in projects by the package.

## Verification

Local deletion tests cover denials, migration, tracked files, permissions, and
workstrees. Installation and compatibility tests confer project preservation and
behavior with and without Git.

[reading-pt]: ../../../specs/project-ignore/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/project-ignore/SPEC.md
