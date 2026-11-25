---
description: "Local exclusion of clients with explicit choice of the project."
language: en
---

# Ignore Customers

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

> This spec records the historical contract of the release. The subsequent
> decision is not
> edit `.git/info/exclude` neither create or change ignores at the root or at
> the customers.
> The ignores existing in the hub are also preserved, although some files
> be visible. Review and validation are pending in
> [roadmap](../../product/roadmap.md).

Git does not apply `../` in `.gitignore` from hub to sister folders. The kit
uses local Git deletions and the project chooses exceptions in its `.gitignore`.

## Acceptance criteria

- AC-001: Client folders are ignored by default in Git repositories without
  modifying the `.gitignore` from the root.
- AC-002: A literal exception of the root as `!/.claude/`, allows versioning the
  client and remains valid after installation, updating and synchronization.
- AC-003: Credentials and artifacts remain protected; unsafe exceptions are
  informed before any change.
- AC-004: Human files and the Git index, including prepared changes, are
  preserved. Already tracked files remain tracked.
- AC-005: Documentation and testing explain and verify precedence, limits,
  clones, shared customers, scenarios without Git and supported systems.

[reading-pt]: ../../../specs/client-ignore/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/client-ignore/SPEC.md
