---
description: "English name for the shared status folder."
language: en
---

# Status Folder

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

The first level folder is more than `.pbai4devs/estado` for `.pbai4devs/state`.
It contains installation status and configuration, not chat memory. Internal
names remain the same.

## Acceptance criteria

- AC-001: New installations use `state` and resources, documentation, exclusions
  and package point to it, without exposing local state in the package or Git.
- AC-002: Upgrading old installations preserves selection, language, decisions,
  human content and permissions; unsafe conflicts and links do not cause loss or
  silent overwriting.
- AC-003: Simulation, repetition, failures and recovery preserve files, Git
  index and `.gitignore` independent Scripts identify old and new installations
  in a coherent way.
- AC-004: Local tests, Linux, Windows, and macOS IC and independent review check
  migration behavior and limits.

[reading-pt]: ../../../specs/state-directory/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/state-directory/SPEC.md
