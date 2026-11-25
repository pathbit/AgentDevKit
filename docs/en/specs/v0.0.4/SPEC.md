---
description: "Standard repository structure, examples and simple automations."
status: aprovado
version: 0.0.4
language: en
---

# Default structure and examples

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objective

Organize the repository so that a person can locate the code, experiment with
the agents and check for a change by the npm commands. User requested scope:
source and root tests, examples in own folder and clear automations. General
approval and execution already authorized.

Dependencies: [v0.0.3](../v0.0.3/SPEC.md) e [GitHub
Packages](../github-packages/SPEC.md). O [PRD](../../product/prd.md), o
[design](../../product/design.md) e a [UX](../../product/ux-ui.md) they remain
applicable.

## Contract

- Code on `src/`, Launcher in `bin/`, tests in `tests/` and publication in
  `scripts/release/`. `.pbai4devs` It keeps the agents' portable resources.
- `examples/` contains the versioned guide. The generator produces eight
  scenarios in `examples/generated/`, with client directories and current
  report.
- The preparation should work without agent folders previously generated at the
  root. Preparing again invalidates old results with valid property.
- Do not remove human files. Only identified generated demos can exit the root
  with local backup. Real workflows stay in `.github`.
- Keep npm/npx, installation, upgrade, customer choice and consumer project
  preservation. Do not copy the kit code for the application served.
- Adapt build, testing, IC and publication without duplicate matrix. Releases
  and GitHub Packages use the same approved bytes.
- Keep tabs short by task, without new frameworks, dependencies or services that
  the CLI You don't.

## Acceptance criteria

| ID | Result | Proof |
| --- | --- | --- |
| AC-001 | Code and tests in the root folders. | Inventory and imports. |
| AC-002 | Npm and package commands remain functional. | CLI e TGZ Real. |
| AC-003 | Complete examples generated from a clean source. | Eight sets. |
| AC-004 | Current reports and preserved human content. | Negative tests. |
| AC-005 | Upgrade maintains previous projects and versions. | Real migration. |
| AC-006 | Outputs don't get into Git or package. | Git and inventory. |
| AC-007 | Publication preserves distribution. | Tests and Actions. |
| AC-008 | Guides and references accompany the new structure. | Lint and review. |

Evidence in `.agent-tests/standard-layout/`, out of the version. Tests
web/desktop do not apply: this delivery changes the CLI, files and automations.

[Developer](../../maintainers/development.md) · [Specs](../README.md)

[reading-pt]: ../../../specs/v0.0.4/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/v0.0.4/SPEC.md
