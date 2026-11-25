---
description: "Secure resolution of installation destinations."
language: en
---

# Installation destinations

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

The installer must maintain the path requested and preserve existing projects,
including when working with temporary directories on macOS.

## Acceptance criteria

- AC-001: Nonexistent destinations preserve all names and their order, including
  when the first component is directly under the root.
- AC-002: Temporary system aliases expected in macOS work for installation and
  consultation without modifying the index or the `.gitignore` the project.
- AC-003: Destinations that cross human links are refused, including those
  pointed out by environment variables; reserved paths remain protected.
- AC-004: Regression tests, independent review and IC cover relevant scenarios
  in Linux, Windows and macOS.

[reading-pt]: ../../../specs/target-paths/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/target-paths/SPEC.md
