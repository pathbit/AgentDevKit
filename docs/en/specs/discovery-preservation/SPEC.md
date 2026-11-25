---
description: "Discovery of skills and preservation in existing projects."
language: en
---

# Discovery and preservation

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Integrations should make available the resources without duplicate skills
generated for Codex and without replacing configurations or project changes.

## Acceptance criteria

- AC-001: Codex discovers each skill on the main route; alternative routes are
  used by resource when needed and conflicts are informed.
- AC-002: `init`, `update` e `sync` preserve human content, Git index and
  `.gitignore` root; cleaning requires proven property.
- AC-003: Independent synchronization and update reconcile the state, preserving
  additional fields and signaling inconsistencies.
- AC-004: Scripts identify their main execution by real paths or aliases,
  without running again when imported.
- AC-005: The maturity examples also work from the distributed package,
  preserving source files and previous examples.
- AC-006: Tests cover combinations of existing clients and projects; results,
  clones and generated projects are ignored or outside the repository.

Discovery and structural validation do not demonstrate complete execution of all
skills and profiles in each client. Register the limits of the tests performed.

[reading-pt]: ../../../specs/discovery-preservation/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/discovery-preservation/SPEC.md
