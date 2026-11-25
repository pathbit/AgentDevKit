---
description: "How to use AgentDevKit's features in software development."
language: en
---

# Resources in practice

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

AgentDevKit organizes software development work with agents you choose. The kit
brings together instructions and tools; product decisions, human review and
testing remain necessary in the project attended.

## What feature to use?

See [tab installed][start] to choose by intention. It points to the command that
receives the order and informs you what should leave each step. If the client
does not show a command or profile, ask the agent to read the source in
`.pbai4devs` and follow the instructions relevant to the application.

| Appeal | What's it for? | Concrete example |
| --- | --- | --- |
| [Skill][skills] | It guides decisions and steps of a recurring task. | [Create a spec][spec] with doubts and criteria. |
| [Command][commands] | It gives entry to a case of use and forwards the work. | [Validate delivery][validar] with proof. |
| [Officer][agents] | It defines responsibilities and limits of a role. | [Reviewer][reviewer] examines the change in reading. |
| [Rule][rules] | Registers a convention applicable to a context. | [Quality][quality] Orients the care of delivery. |
| [Template][templates] | It offers a structure to record decisions. | Fill [spec][spec-template] I'll give you a raise. |
| [Script][scripts] | Run a reusable automation. | [Synchronize][sync] the notes. |
| [Tool][tools] | Provides a verifiable technical capability. | [agent-browser][browser] exercise a web interface. |
| [Tests and evidence][tests] | They prove behavior and record results. | Versify the test and maintain local report. |

Links lead to fonts and catalogs. A Markdown instruction does not start a
process alone; the AI client decides how to find and execute resources according
to their capabilities and permissions. [customer compatibility][compat] before
you depend on a shortcut.

## How the steps connect

Use the sequence below for a product delivery. If the immediate goal is to run
or document an existing system, use the specific paths at the end of this
section.

1. Use [Next steps][next] to identify the phase and the to-dos.
2. Define product, experience when applicable and technical design with the
   user. [templates][templates] They're starting points, not ready decisions.
3. Use [create-spec][spec] to register limits and accepted.
   [plan-delivery][plan], pass the goal or spec to the planner. It returns
   doubts, scope, tasks and proofs for approval.
4. Pass spec and plan approved to [implement-delivery][implement]. The profile
   [implementer][developer] returns diff, accepted, commands and initial proofs.
5. Pass these materials to [validate-delivery][validar]The validator uses the
   skill. [check-work][verify] and project tools. For web, use real browser. For
   desktop, open the application. Register the proof and state of each
   criterion.
6. Deliver diff, documentation decisions and evidence to
   [review-delivery][review]. The reviewer evaluates the final state in reading,
   and the person responsible records the decision with the review script. The
   team decides when to integrate.

When there is independent work, the main agent can distribute it among the
[experts][specialists] available, with files, dependencies and evidence. If the
client does not offer subagents, the work follows and the absence of independent
review becomes explicit.

Choose evidence by scope: contracts, validation and backend data; interaction,
accessibility, error states and browser or desktop on the frontend. QA includes
limit and failure cases; security considers threats and permissions; performance
compares measurements with defined targets and load. Register environment,
commands and results by criteria, including flaws and unexecuted checks.

Stop **run an existing project**, refer to the current step with `npx
@pathbit/agentdevkit next --intent run --target .`, using the version and
registration chosen in [installation][install]. [Diagnose][diagnose] Inventing
environment and design, and [prepare-dev][prepare] uses this inventory when the
request includes adjustments. Deliver the commands to go up, check and stop the
application.

Stop **document a system in use**, start with `npx @pathbit/agentdevkit document
--markdown`. A CLI offers an inventory draft. [document-legate][legado] guides
the documenter to follow the relevant flows in the code and in the tests and
deliver facts, inferences and gaps with their sources. The editing work reuses
the existing documents. [Documentation
guide](documentation.md#documenting-a-system-in-use)

When the task depends on an existing spec or plan, the skill [Next
steps](../kit/skills/projeto/proximos-passos/SKILL.md) use the
indications of `next --integrations` to find references in the project. [when
using other methods](comparacao.md).

Stop **audit security**, [audit-safe][audit] collect or reuse the local report,
and the auditor profile uses [review-safe][security] to interpret it in context.
Absent tools or bases enter the pending coverage. The correction has its own
flow and scope.

Stop **evolve kit**, locate the resource by [resource guide][resources]. Once
you change the font, use [sync][sync-command] to apply and check the notes and
[check-agents][verify-agents] to validate sources, tools and tests.

## Where are the files?

`.pbai4devs/` contains shared fonts. Folders as `.claude/` or `.codex/` receive
only the integration features of selected clients; existing human files remain
part of the project. The selection can be consulted or changed by [CLI][cli].

The test code and necessary fixtures are versionable. Reports, captures,
downloads and local results are out of the version. `.gitignore` from the root
belongs to the project; the kit preserves existing Git rules and informs files
that may be visible. Check the status and rules of ignore before adding files to
the index. See [installation][install] e [tools and tests][tests].

To create or change a resource, use [resource guide][resources] and then sync
and check the notes. For operational questions, see
[troubleshooting](troubleshooting.md).

[skills]: ../kit/skills/README.md
[start]: ../kit/INSTRUCTIONS.md
[commands]: ../kit/commands/README.md
[agents]: ../kit/agents/README.md
[rules]: ../kit/rules/README.md
[templates]: ../kit/templates/README.md
[scripts]: ../kit/scripts/README.md
[tools]: ../kit/tools/README.md
[spec]: ../kit/skills/specs/criar-spec/SKILL.md
[spec-template]: ../kit/templates/spec/TEMPLATE.md
[validar]: ../kit/commands/validar-entrega/COMMAND.md
[reviewer]: ../kit/agents/revisor/AGENT.md
[developer]: ../kit/agents/implementador/AGENT.md
[quality]: ../kit/rules/qualidade/RULE.md
[sync]: ../kit/scripts/sincronizar-agentes/README.md
[browser]: ../kit/tools/agent-browser/README.md
[tests]: tools-and-testing.md
[compat]: ../kit/COMPATIBILIDADE.md
[next]: ../kit/skills/projeto/proximos-passos/SKILL.md
[legado]: ../kit/commands/documentar-legado/COMMAND.md
[implement]: ../kit/commands/implementar-entrega/COMMAND.md
[plan]: ../kit/commands/planejar-entrega/COMMAND.md
[verify]: ../kit/skills/projeto/verificar-trabalho/SKILL.md
[diagnose]: ../kit/commands/diagnosticar/COMMAND.md
[prepare]: ../kit/commands/preparar-dev/COMMAND.md
[audit]: ../kit/commands/auditar-seguranca/COMMAND.md
[security]: ../kit/skills/seguranca/revisar-seguranca/SKILL.md
[sync-command]: ../kit/commands/sincronizar/COMMAND.md
[verify-agents]: ../kit/commands/verificar-agentes/COMMAND.md
[review]: ../kit/commands/revisar-entrega/COMMAND.md
[install]: installation.md
[cli]: cli.md
[resources]: resources.md
[specialists]: resources.md#experts-and-collaboration

[reading-pt]: ../../guides/recursos-na-pratica.md
[reading-en]: recursos-na-pratica.md
[reading-es]: ../../es/guides/recursos-na-pratica.md
