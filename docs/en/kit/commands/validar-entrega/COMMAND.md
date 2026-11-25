---
description: "Execute evidence of delivery and prepare for independent review."
language: en
---

# Validate delivery

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entry: criteria, diff, existing evidence, environment and execution
instructions. If no application or tool is available, register the affected
criteria and proceed with the viable evidence.

Activate the [validator](../../agents/validador/AGENT.md) with
[check-work](../../skills/projeto/verificar-trabalho/SKILL.md)- He uses it.
[execute-script](../../skills/projeto/executar-script/SKILL.md) and the actual
checks defined in the project. There is no universal test command.

As the risk may, involve [QA](../../agents/engenheiro-qa/AGENT.md),
[safety](../../agents/auditor-seguranca/AGENT.md) e
[performance](../../agents/analista-performance/AGENT.md). Cover success, limit
and failure cases, permissions and integration when applicable. For backend,
exercise contracts and data; for interface, test actual flows on browser or
desktop. In performance, record environment, load, metrics and comparison with
goal. Do not invent goals or mark as approved what has not been executed.

Output: result by criterion, commands and tests in `.agent-tests/`. Test code
and fixtures are versionable. The validator returns failures to the implementer
and delivers the evidence to the main agent. With the criteria proven, follow
[review-delivery](../revisar-entrega/COMMAND.md) to close documentation,
independent review and gate.

[reading-pt]: ../../../../../.pbai4devs/commands/validar-entrega/COMMAND.md
[reading-en]: COMMAND.md
[reading-es]: ../../../../es/kit/commands/validar-entrega/COMMAND.md
