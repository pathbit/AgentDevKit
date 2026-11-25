---
description: "It gathers doubts and produces a verifiable plan for delivery."
language: en
---

# Planning delivery

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entrance: goal or path of the spec, restrictions and existing decisions. Without
this context, gather the questions before proposing implementation.

Activate the [planner](../../agents/planejador/AGENT.md)- He uses it. [Next
steps](../../skills/projeto/proximos-passos/SKILL.md) to recognize the phase and
forward to product, design or spec skills. In existing design, read the actual
documents before using templates.

When the scope justifies, consult the
[architect](../../agents/arquiteto/AGENT.md) for borders, alternatives, risks
and design decisions. Identify independent tasks, dependencies, file responsible
and necessary evidence; include backend, frontend, QA, safety and performance
when applicable. Plan subagents according to customer capacity, without
anticipating product phases.

Output: scope, doubts, tasks, dependencies, files and proofs by criteria. Refer
to the main agent to obtain pending approvals. With spec and approved plan,
deliver them with accepted
[implement-delivery](../implementar-entrega/COMMAND.md).

[reading-pt]: ../../../../../.pbai4devs/commands/planejar-entrega/COMMAND.md
[reading-en]: COMMAND.md
[reading-es]: ../../../../es/kit/commands/planejar-entrega/COMMAND.md
