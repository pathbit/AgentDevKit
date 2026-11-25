---
description: "Secure sync with resources and changes that are specific to the project."
language: en
---

# Secure sync

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Projects can have their own files and additional resources to those of the
package. Commands must preserve that content when installing, updating and
synchronizing.

## Acceptance criteria

- AC-001: Human or modified resources in the hub and customers are preserved,
  including in collisions and with `--force`.
- AC-002: Cleaning only removes obsolete outputs with proven property;
  additional folders and team files are not removed.
- AC-003: A divergent content prepared in the index is not discarded by
  synchronization; `.gitignore` root and human data are preserved.
- AC-004: `init`, `update`, `sync`, queries and options are documented with
  their effects on files, backups, customer selection and Git.
- AC-005: Tests exercise existing installations, obsolescence, collisions,
  repeated execution, Git and failures; IC includes Linux, Windows and macOS.

[reading-pt]: ../../../specs/safe-synchronization/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/safe-synchronization/SPEC.md
