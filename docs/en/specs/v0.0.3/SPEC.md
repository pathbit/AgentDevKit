---
description: "Single source, local outputs and JavaScript automations."
status: aprovado
version: 0.0.3
language: en
---

# Sources and local generation

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objective

Keep in `.pbai4devs` the sources of the kit and generate the specific structure
of each agent when necessary. the derivatives and preferences are local; code,
templates, tests and documentation remain versioned.
[PRD](../../product/prd.md).

## Contract

- The product, the launcher, the tests and the automations stay in `.pbai4devs`.
  Metadata npm, license, documentation and GitHub integration stay at the root.
- Declarative settings and templates describe names, directories, metadata and
  customer notes.
- The installation generates only chosen customers, entries and local indexes.
  The notes go to the shared source without symlinks.
- Exits and personal status are ignored by Git. `.github/workflows`, human
  issues and configurations are not confused with derivatives of agents.
- One `.gitignore` does not control sibling directories. The generator applies
  local Git deletions; without repository, uses a protection in `.gitignore`
  from the root.
- Migrating already tracked files requires removing only the identified
  derivatives from the index, preserving the contents on the disk.
- Human entrances are preserved. Ancient kit blocks are migrated without erasing
  human content outside the block; conflicting changes require review.
- The package remains executable by `npx`. The launcher accepts Node 18+ and
  prepares Node 24+ for the core when needed. No bootstrap `.sh` or `.ps1`.
- No Node/npm, the agent uses the native system installer; JavaScript cannot run
  before a runtime exists.
- The IC separates the complete verification from portability tests. Release
  reuses the approved article of the same commit without repeating packaging.

## Acceptance criteria

| ID | Observable result | Verification |
| --- | --- | --- |
| AC-001 | Sources in the hub; no traced derivatives. | Git and inventory |
| AC-002 | Templates generate correct customers and inputs. | Generation and npx |
| AC-003 | Ignored derivatives in Git, subfolder and worktree. | Real Git |
| AC-004 | Migration preserves human content and disk. | Hashes and index |
| AC-005 | Node automations, no shell scripts themselves. | Inventário/runtime |
| AC-006 | npx installs, updates and synchronizes the package. | Real Tarball |
| AC-007 | IC doesn't duplicate the full suite in the release. | Workflow/artifact |
| AC-008 | Old Runtime recovers with integrity. | Bootstrap and faults |
| AC-009 | Guides, tests and release reflect the contract. | Lint/revisão/CI |

## Evidence

Run tests in new, existing, with and without Git directories, in subfolders and
workstrees. Check preserved bytes and ignored paths, not just messages. Test
individual selection and `all`, error of download/checksum, tampered package,
incorrect artifact origin and local files outside the package.

Results are in `.agent-tests/source-only/`The IC must validate the systems
supported with appropriate groups without promising fixed times. Approval
requires independent review and evidence by criterion.

[All specs](../README.md) · [Wiki](../../README.md)

[reading-pt]: ../../../specs/v0.0.3/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/v0.0.3/SPEC.md
