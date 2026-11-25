---
description: "Order of work and maintenance of agents."
language: en
---

# How to use

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Start with the requested result. The command guides the sequence, the skill
guides the decisions, the profile defines the responsibility and the script
executes the operation with the available tools. Rules and templates give
context and format. Ask for font reading when the client does not offer the
shortcut.

| Situation | Where to start | Result |
| --- | --- | --- |
| Discover the next step | [Next steps](commands/proximos-passos/COMMAND.md) | Next action and prerequisite pending. |
| Just consult the environment or make an existing project run | [diagnose](commands/diagnosticar/COMMAND.md) or [prepare-dev](commands/preparar-dev/COMMAND.md) | Inventory or environment checked, as requested. |
| Understanding and documenting an existing system | [document-legate](commands/documentar-legado/COMMAND.md) | Behaviors, evidence and gaps by flow. |
| Set an increment or execute an approved delivery | [plan-delivery](commands/planejar-entrega/COMMAND.md) or [implement-delivery](commands/implementar-entrega/COMMAND.md) | Plan with accepted or change ready to validate. |
| Prove change or review final delivery | [validate-delivery](commands/validar-entrega/COMMAND.md) or [review-delivery][revisao] | Evidence by independent judgment or decision. |
| Review safety risks | [audit-safe](commands/auditar-seguranca/COMMAND.md) | Report with findings, priorities and coverage. |
| Evolve Kit Resources | [create-resource](skills/projeto/criar-recurso/SKILL.md) → [sync](commands/sincronizar/COMMAND.md) → [check-agents](commands/verificar-agentes/COMMAND.md) | Re-used or adjusted sources, notes and evidence. |

Before working on the documentation, use `atualizar-documentacao` to inventory
and read existing files. Preserve your paths and content; complement gaps and
organize by indexes, without replacing documents by templates.

When installing or reconfiguring the kit, ask which customers the user uses if
there is no choice in order or status. CLI accepted `--agents codex,claude`. See
`agents` and use `agents add <id>` or `agents remove <id>` to change the
selection later. Use the IDs of [compatibility](COMPATIBILIDADE.md), without
deducing the agent by application, OS or folders. No response available, keep
the choice saved or `none` to prepare only the hub. Register the choices by CLI.

In the first use, indicate the goal with `init --purpose
agents|product|run|document` or respond to the interactive wizard when it opens.
If you passed language and customers explicitly, also inform the CLI target. To
consult the inventory before installing, use `agentdevkit document`.

To start product, follow the order below. To prepare the existing project
execution, use `preparar-dev` and preserve the decisions already proven.

1. `configurar-projeto`: prepare the work without starting code.
2. `criar-prd` e `criar-ux-ui`: define product and experience.
3. `criar-design-doc`: approve architecture and technology.
4. `gerenciar-roadmap`: plan deliveries and dependencies.
5. `criar-spec`: requires the previous documents approved; UX/UI may not apply
   with approved justification.
6. `implementar-spec`: clarifying doubts, approving plan, configurar/verificar
   the environment, implement and prove the criteria of acceptance.

For new features, do not offer skip spec or plan approvals.

While setting up agents, keep only templates. Real documents will be filled in
with questions and answers when the project starts. Combine destinations and
register them in the future configuration state. When you finish a step, explain
the next one and gather your questions. [Next
steps](skills/projeto/proximos-passos/SKILL.md) and respect the language saved
in `.pbai4devs/state/agentdevkit.json`; without a choice, use Portuguese. README
and documents [Phase models](templates/README.md). Update affected facts and
links; record no impact with justification.

In existing design, preserve proven documents and decisions. Structure
improvements and functional changes have their own scope. [environment
model][ambiente] guides the technical configuration.

## Working with specialists

When independent tasks justify, use available and authorized subagents: divide
context, dependencies, unique writing files and expected proofs. Integrate and
check the results on the main agent. Before forwarding the next suggested
action, check out the pending step and your evidence with `proximos-passos`; if
you cannot verify them, report the gap and inspect them. Without subagents, work
in sequence and report the limits; do not present the review itself as
independent. Choose profiles by necessity, without imposing technology:
[architecture](agents/arquiteto/AGENT.md),
[backend](agents/especialista-backend/AGENT.md),
[frontend](agents/especialista-frontend/AGENT.md),
[QA](agents/engenheiro-qa/AGENT.md), [safety](agents/auditor-seguranca/AGENT.md)
e [performance](agents/analista-performance/AGENT.md). Validation and review
should consider failures and adverse scenarios, beyond the path of success.

## Creating and Maintaining Resources

Use `criar-recurso`; it forwards to the specific skill or creates a new type.
After creating, changing, renaming or removing resources, use
`sincronizar-agentes`It regenerates. `catalog.json` and auxiliary indices; do
not keep lists JSON manually. Check with `--check` before completing the
amendment. `.mjs`, check Node/npm for [first use][preparo]With Node 18+
available, use `BOOTSTRAP.mjs --runtime-only` to prepare Node 24+. Node/npm,
install first by the native OS mechanism. `instalar-ferramentas` uses the full
flow: prepares runtime and executes `setup` to install and verify compatible
tools. Use Node.js 24+ with npm and commands of [scripts](scripts/README.md).
`executar-script` reuses automations `.mjs`, equal in all systems.
`verificar-trabalho` orients the proofs; web changes require browser. Changes in
access, data, entries and dependencies use `revisar-seguranca`. O [safety
flow](commands/auditar-seguranca/COMMAND.md) combines local scanners and context
analysis; the skills already accompany the installation of the kit. After any
implementation, complete the [revision command][revisao]:
The report is ignored on `.agent-tests/`; pending findings and evidence prevent
conclusion. [external skills](external-skills/README.md) before reinventing a
procedure; activate references for the task, respecting the decided stack.
`preparar-ferramentas` baixa/atualiza local tools for the SO/arquitetura; each
tool has `TOOL.json` e `SCRIPT.mjs` ed `.pbai4devs/tools/<nome>`. Choose only
the tools applicable to the order. Binaries and records in `.local/`, cache and
launchers are ignored.

The local file `espelhos.conf` log selection, layouts and native points.
`catalog.json` gathers inventory and tool commands. `skills.json`, `rules.json`
e `agents.json` index sources. Codex and Antigravity share `.agents`; Kimi uses
`.kimi-code`. The Copilot project resources are in `.github`. Folder
`~/.copilot` It's personal and `.vscode` is optional for editor settings. See
customers and their limits in [compatibility](COMPATIBILIDADE.md). Only selected
customers receive leads; a shared folder remains when another client needs it.
Update or sync respect selection. Only agentic features have notes; templates,
scripts, tools and state remain exclusively in `.pbai4devs`. The kit preserves
existing ignores, Git configuration and index. Outputs and notes can be visible;
check the status and use the [ignore templates](templates/gitignore/TEMPLATE.md)
when deciding rules for the project. Product documents are also out of the
mirrors. The command `sincronizar` use CLI to review and apply the plan;
`--check` check without change.

The [commands](commands/README.md) are input of the use cases: diagnosis, local
preparation, tool update, synchronization and verifications. [status
command](commands/status-roadmap/COMMAND.md). Use
[reviewer](agents/revisor/AGENT.md) for review. Links guide reading; automatic
discovery depends on the formats of each tool.

[ambiente]: templates/ambiente-local/TEMPLATE.md
[preparo]: scripts/preparar-ferramentas/README.md
[revisao]: commands/revisar-entrega/COMMAND.md

[reading-pt]: ../../../.pbai4devs/INSTRUCTIONS.md
[reading-en]: INSTRUCTIONS.md
[reading-es]: ../../es/kit/INSTRUCTIONS.md
