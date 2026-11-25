---
description: "Purpose and creation of agent profiles."
language: en
---

# Agents

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

The shared profile uses portable metadata. YAMLs next to the source adapt fields
and client permissions. The integration uses `templates/clients/`, out of the
instructions distributed to the projects. [compatibility](../COMPATIBILIDADE.md)
before you promise to find out.

Profiles define paper, input, result, tools and limits. `criar-agente` when a
task justifies revision or specialized delegation. Each profile uses
`<nome>/AGENT.md`.

O [reviewer](revisor/AGENT.md) examines changes without editing them. Each
client receives the format predicted by his adaptor; when an input is not
discovered automatically, ask for explicit reading of the shared source.

| Profile | Delivery |
| --- | --- |
| [Planner](planejador/AGENT.md) | Doubts, scope and verifiable plan. |
| [Implementer](implementador/AGENT.md) | Code, testing and documentation. |
| [Software Architect](arquiteto/AGENT.md) | Decisions, contracts and architectural risks. |
| [Backend Specialist](especialista-backend/AGENT.md) | Implementation and service contracts. |
| [Frontend Specialist](especialista-frontend/AGENT.md) | Implementation and interface flows. |
| [QA Engineer](engenheiro-qa/AGENT.md) | Strategy and functional and adverse tests. |
| [Performance analyst](analista-performance/AGENT.md) | Comparable measurements and investigation of bottlenecks. |
| [Validator](validador/AGENT.md) | Real result by criterion of acceptance. |
| [Safety auditor](auditor-seguranca/AGENT.md) | Screening and testing of controls. |
| [Documenter](documentador/AGENT.md) | Documents consistent with delivery. |
| [Reviewer](revisor/AGENT.md) | Opinion independent of the final state. |

The main agent distributes the context, limits the files of each task and
gathers the results. One profile does not need to call another directly: when
the client forbids nested delegation, return the next step to the main one.
[command catalog](../commands/README.md) to know which flow triggers each paper
and what results it receives.

Sidecars limit tools where the format allows. The planner uses reading;
validators have terminals to produce evidence without editing sources. Allow
terminals does not create directory isolation. Respect environment permissions
and do not treat instructions as sandbox substitutes.

[reading-pt]: ../../../../.pbai4devs/agents/README.md
[reading-en]: README.md
[reading-es]: ../../../es/kit/agents/README.md
