---
description: "Journeys and communication of the command line interface."
status: aprovado
language: en
---

# UX of CLI

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

The product uses a CLI; there is no web or desktop interface in this delivery.
The experience prioritizes short commands, readable results and continuity.

| Journey | Expected response |
| --- | --- |
| First Use | Language, customers and goal, with summary and next step. |
| Existing project | Proposed changes and preservation of the archives themselves. |
| Update | What's changed, conflitos/backups and how to check the result. |
| Plugins | Catalog and origin before deciding what to prepare. |
| Diagnosis | Observed pendencies and next commands or skills. |
| Automation | JSON single and output code, without depending on the translated text. |

PT is default. EN and ES change the interface and next steps, keeping command
names and paths. The saved language is reused in the next executions. Messages
distinguish confirmation, warning and failure without stating undone tests.

The first use wizard gathers language, agents and purpose. Who passes language
and customers in the CLI you can choose the goal with `--purpose`. Agents in
apps can gather the choices by chat and use `--json` The simulation lists
changes and conflicts in the plan.

`doctor` responds about installing the kit. `next` guides the work of the
project, including the documentation stage with `next --intent document`.
`document` gathers inventory in Markdown or JSON. Conflicts ask for file
comparison before a replacement. See [CLI](../guides/cli.md) e
[recovery](../guides/troubleshooting.md) for observable behavior.

The command `agents` query the selection without writing files. Its change
allows to simulate the plan before removing generated notes. `agents add` e
`agents remove` change only the specified IDs. `none` is the initial option
without explicit or saved choice and keeps shared resources. Folders with own
files continue in the project. [Selection of customers][clients]

The user can consult `plugins list` e `plugins info <id>` before the
installation. `init`, `plugins install <id>` e `plugins check <id>` They prepare
and check only the item chosen. [Plugin Guide][plugins]

Scope authorized by [PRD](prd.md). Tests check the actual journeys; the approval
of the design does not replace the operating evidence.

[Wiki](../README.md) · [Flow of use](../guides/workflow.md)

[clients]: ../guides/installation.md#update-and-choose-agents
[plugins]: ../guides/plugins.md

[reading-pt]: ../../product/ux-ui.md
[reading-en]: ux-ui.md
[reading-es]: ../../es/product/ux-ui.md
