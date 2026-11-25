---
description: "Secure creation and publication of verified version tags."
language: en
---

# Automatic release tags

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Acceptance criteria

- AC-001: IC creates `v<versão>` in the main branch commit only after the entire
  matrix passes and starts the publication of the same commit.
- AC-002: Changes without new version do not duplicate publications; existing
  tags are never moved and version collisions or regressions prevent
  publication.
- AC-003: The release and the two packages use the same artifact and the same
  version of the tag; the publication requires the approved full IC.
- AC-004: Tests check for undue events, failures, collisions, resumes and races
  without creating tags or publishing real packages.

[reading-pt]: ../../../specs/automatic-release-tags/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/automatic-release-tags/SPEC.md
