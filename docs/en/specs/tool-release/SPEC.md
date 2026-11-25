---
description: "Agent-browser secure update and version recovery."
language: en
---

# Tool update and versions

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Agent-browser has started distributing executables on optional packages per
platform. The update should work without losing existing installations.

## Acceptance criteria

- AC-001: The installer accepts the previous and current layouts of the
  agent-browser, validates executables suitable to the platform and proves the
  installed version.
- AC-002: Invalid or incomplete paths are refused before exchange; failures
  preserve the previous installation and do not cross unsafe links.
- AC-003: Each release and stream package points to the tag of the same version;
  the documentation explains how to consult a version and simulate its use.
- AC-004: Automated tests cover layouts and failures, and IC checks Linux,
  Windows and macOS in the matrix configured before publication.

[reading-pt]: ../../../specs/tool-release/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/tool-release/SPEC.md
