---
description: "Coexistence with agents and evolution of existing documentation."
status: aprovado
version: 0.0.9
language: en
---

# Preserve existing agents and documentation

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objective

Install and update AgentDevKit in Zod and projects with own agents, preserving
settings, files, permissions, links, and Git status. Also guide document
evolution from inventory and reading of existing materials without restarting
the project. The current order replaces the documented conservative block in the
[previous version](../v0.0.8/SPEC.md).

## Contract

- Treat human symbolic links in entries and clients as preserved paths: not
  open, cross, convert, overwrite or adopt.
- Preserve human agents and skills, including names similar to those of the kit
  and during execution with `--force`. Inform the preserved paths.
- Generate available notes without assigning preserved files to the kit. On Zod,
  keep `.codex/skills` and use also `.agents/skills` for Codex.
- Keep strict validation in fonts, status, tools, Git and paths previously
  belonging to the kit. A link cannot hide managed change.
- Keep the same contracts in CLI and the synchroniser installed.
- Before editing documents, inventory and read existing ones. Reuse paths,
  sections and decisions; templates only guide gaps.
- Organize by indexes and links, without deleting, moving or replacing
  documents. In new projects, do not invent product or approval without answers.

## Acceptance criteria

| ID | Observable result |
| --- | --- |
| AC-001 | Internal, external and broken human links remain intact. |
| AC-002 | Skills, preexisting agents and configurations are preserved. |
| AC-003 | Managed paths refuse links without external writing. |
| AC-004 | Init, update, doctor and sync are coherent and idempotent. |
| AC-005 | Zod, Express and Chi pass the package matrix, preserving Git. |
| AC-006 | Returns, documentation, IC and public package are verified. |
| AC-007 | Inventory detects real documentation without changing files. |
| AC-008 | Skills require reading and additive plan before templates. |
| AC-009 | Documentary exercises preserve content and files out of plan. |
| AC-010 | Empty design receives the kit without invented product documents. |

## Validation

Run regression tests for links and collisions, including `--force`, replacement
of paths after plan and change of customer selection. Rotate complete pipeline,
maturity and matrix OSS with TGZ candidate; repeat the matrix with the published
package. Compare bytes, types, modes, link destinations, staging and Git
configuration in clones. Also run the installed inventory and documentation flow
in real clones: file plan, fact-based complement, new index and revision.
Separate this proof of simple installation and fixtures of the harness; do not
assign to the automatic content generation package or product approvals.

Clones and evidence are ignored in `tmp/` e `.agent-tests/`. The scope is the
kit and its documentary flow; not affirm execution of cloned applications.

## Documentation affected

Update installation, CLI, recovery, resources, synchronization, tests, changelog
and indexes. Preserve old specs as historical.

[reading-pt]: ../../../specs/v0.0.9/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/v0.0.9/SPEC.md
