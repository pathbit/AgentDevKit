---
description: "Code of CLI and the AgentDevKit installer."
language: en
---

# Package code

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

CLI, installation, language and next steps use shared resources. This directory
is not part of the features installed in the projects.

| Module | Liability |
| --- | --- |
| `cli.mjs` | Steady entry to CLI. |
| `cli/` | Arguments, execution, exit, warnings and recovery report. |
| `install.mjs` | API installation, sync and diagnosis used by CLI. |
| `installation/` | Plan, internship, managed files and transaction. |
| `config.mjs` | Paths, version and metadata of the package. |
| `adapters/` | Access to agent shared layouts. |
| `i18n.mjs` e `next.mjs` | Languages and orientation of the next action. |
| `plugins.mjs` | Optional catalog and referral to local managers. |

In `installation/`, `plan.mjs` coordinate the plan. `prepare-stage.mjs` prepares
the private copy and `stage-cleanup.mjs` treats your cleanliness and your
diagnostics. `plan-state.mjs` reconciles the proposal with the registered state
and `native-outputs.mjs` reconciles references with the project's destinations.
`apply.mjs` revalidate the plan before writing and use `publish-file.mjs` to
publish files. `state.mjs`, `legacy-state.mjs`, `ownership.mjs` e
`git-index.mjs` focus reading, migration, property and index checks. Git shared
controls, metadata and recovery live in `.pbai4devs/scripts/lib/`.

Before applying changes, the installer refuses files with multiple hardlinks
detected or whose count cannot be checked. The count is checked again before
writing, but this does not eliminate concurrent changes between the conference
and the operation. The plan informs these locks; a later change requires further
verification. In macOS, the application also refuses files with ACL listed or
with inconclusive query; the plan informs these locks on the affected files. The
protection does not cover ACLs from project directories or concurrent changes
after query. Before copying data to a new backup on macOS, the application
refuses your folder if it has ACL listed or if the query fails. This check does
not prove privacy against competing changes or other systems.

When the stage planning fails and the attempt to remove it also fails,
`planInstallation` preserves the main failure chain in `cause` and provides the
cleaning failure in `cleanupError`, non-numerable property. This value can
contain sensitive messages and paths: only inspect it locally. JSON ed CLI
informs the cleaning failure with fixed message. When the final removal is the
only failure, its value stays in `cause`.

[reading-pt]: ../../../src/README.md
[reading-en]: README.md
[reading-es]: ../../es/src/README.md
