---
description: "Compatibility with public repositories and incremental examples."
status: aprovado
version: 0.0.13
language: en
---

# Real projects and incremental examples

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Validate the installation and maintenance of the package in fixed commits of
real projects, preserving its settings and its Git index. Demonstrate product
flow, design and three specs in two new projects, with ignored local results.

## Acceptance criteria

| ID | Observable result |
| --- | --- |
| AC-001 | Test the seven repositories, with registered commits. |
| AC-002 | Repeated init testing, update, sync and preservation in clones. |
| AC-003 | Protect Git cachings with Git exceptions, preserving text and index. |
| AC-004 | Product and design before the three specs of each new project. |
| AC-005 | Document ignored playback, limits and outputs. |
| AC-006 | Regression tests, package and independent review pass. |

Compatibility tests do not perform or compile external applications. Product
approvals and review in examples are simulated. Test code is versioned; clones,
generated projects and evidence remain outside Git.

[reading-pt]: ../../../specs/real-projects/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/real-projects/SPEC.md
