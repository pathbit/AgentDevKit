---
description: "Selective and persistent installation of the agents used by the project."
status: aprovado
version: 0.0.2
language: en
---

# Select Agents per Project

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objective

Create only the notes of the chosen agents, keeping the unique origin in
`.pbai4devs`. Selection works on the terminal, desktop agents and on
uninterplayed executions. Scope requested and authorized by the user as per
[PRD](../../product/prd.md), [UX](../../product/ux-ui.md) e
[design](../../product/design.md).

## Behavior

- `init --agents codex,claude` installs the selected customers.
- `agents` consultation; `agents codex,claude` amends; `agents all` It activates
  everyone.
- In the first interactive use, the CLI question language and agents.
- In an app, the agent can gather the choice by chat and pass it to CLI.
- Priority is explicit option, saved choice and, lastly, `all`.
- No interactive terminal, with `--yes`, `--json` or `--dry-run`There's no
  question.
- Selection is persisted in `estado/agentdevkit.json`; `all` keeps its sense of
  everyone, including customers added in future versions.
- Update, sync, exchange language and consult do not reactivate unscheduled
  customers. `all`.
- Discovery dependencies are included: Codex needs to `.agents`, for example.
  Effective folders can be shared between customers.
- Unselecting removes only proven own derivatives. Human files remain; changes
  in managed files produce conflicts and backup.

The hub, scripts, templates and tools remain complete. Selecting agents does not
install tools, choose stack, or start the product. It does not include process
detection, global editor configuration, or customer login.

## Plan

1. Centralize IDs, aliases, dependencies and native inputs in the adapters.
2. Filter the manifest and persist the choice in the installation.
3. Implement consultation, change and questions without blocking automations.
4. Remove unmarked derivatives with existing property protections.
5. Update configuration guides and skills; sync resources.
6. Check selection, migration, preservation, real package and distribution.

## Acceptance criteria

| ID | Observable result | Proof |
| --- | --- | --- |
| AC-001 | Generates only the chosen customers and their dependencies. | Adapters |
| AC-002 | Explicit choice and interactive question work. | CLI and terminal |
| AC-003 | Without interaction, there is saved selection or fallback all. | CLI/JSON |
| AC-004 | Update and sync preserve the choice. | CLI and direct script |
| AC-005 | Changing selection preserves human content. | Hashes and conflicts |
| AC-006 | Input and simulation errors do not alter the target. | Negative tests |
| AC-007 | Legacy state and all maintain compatibility. | Migration and repetition |
| AC-008 | Real package, guides and review are checked. | Package, lint and CI |

Use Node 24/26, empty and existing directories and facilities via real tarball.
Test the roots, inputs, indexes and `.gitignore`; do not just consider the
success message. Exercise the installed syncator without relying on `src/`.

Test code is versioned. Results and report by criterion stay in
`.agent-tests/client-selection/<execucao>/`. Selection of files does not confirm
loading in every application; record separately what was executed.

[All specs](../README.md) · [Wiki](../../README.md)

[reading-pt]: ../../../specs/v0.0.2/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/v0.0.2/SPEC.md
