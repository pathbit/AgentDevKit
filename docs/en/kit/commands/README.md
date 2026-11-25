---
description: "Use cases for triggering skills, scripts and shared tools."
language: en
---

# Commands

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Choose the first command by the result in [use guide](../INSTRUCTIONS.md). The
following steps and what to pass on are in the case of use itself.

Each `<nome>/COMMAND.md` is the entry of a use case: informs input,
prerequisites, execution and output. The skill guides decisions; the script
executes automation; the tool provides the ability. Refer them without copying
their instructions or implementation. Folders indicate where to read or save
files.

- [diagnose](diagnosticar/COMMAND.md): identify environment and project.
- [prepare-dev](preparar-dev/COMMAND.md): prepare or repair the machine.
- [install tools](instalar-ferramentas/COMMAND.md): check Node/npm, install and
  validate tools in a stream.
- [update-tools](atualizar-ferramentas/COMMAND.md): update tools.
- [sync](sincronizar/COMMAND.md): keep agents' notes.
- [check-agents](verificar-agentes/COMMAND.md): check resources and tests.
- [review-delivery](revisar-entrega/COMMAND.md): close documentation and
  evidence.
- [test-navigator](testar-navegador/COMMAND.md): prove a real web stream.
- [status-roadmap](status-roadmap/COMMAND.md): see progress.
- [Next steps](proximos-passos/COMMAND.md): guide the next useful action.

## Delivery and safety flows

- [plan-delivery](planejar-entrega/COMMAND.md): to gather doubts and plan.
- [implement-delivery](implementar-entrega/COMMAND.md): implement the approved
  plan.
- [validate-delivery](validar-entrega/COMMAND.md): produce evidence by
  criterion.
- [update-document](atualizar-documentacao/COMMAND.md): keep the guides.
- [Preparing for safety](preparar-seguranca/COMMAND.md): Prepare scanners and
  bases.
- [audit-safe](auditar-seguranca/COMMAND.md): run and triage the analysis.
- [check-secret](verificar-segredos/COMMAND.md): limit the search to secrets.
- [check-dependencies](verificar-dependencias/COMMAND.md): check packages.

Use `criar-comando` e o [template](../templates/comando/TEMPLATE.md) for new
cases. For automations, use
[execute-script](../skills/projeto/executar-script/SKILL.md) with the script
name and its arguments, according to the [guide](../scripts/README.md).
Arguments come from the user; `$ARGUMENTS` It only exists when the tool offers
it.

Markdown guides the agent; it does not execute scripts alone. Ask for the path
read or use the native shortcut when discovered by the tool. Each command has
input and output; it does not need to match a new skill. A flow can combine
multiple profiles and procedures without doubling content.

[reading-pt]: ../../../../.pbai4devs/commands/README.md
[reading-en]: README.md
[reading-es]: ../../../es/kit/commands/README.md
