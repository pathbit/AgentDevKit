---
name: criar-spec
description: "It defines with the user the scope and verifiable criteria of an increase for approval."
language: en
---

# Create spec

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Check in `.pbai4devs/state/configuracao/ESTADO.md` the evidence of preparation.
PRD and design require approval. UX/UI requires approval or justification of
approved non-application. Before creating or changing the spec, execute:

```sh
node .pbai4devs/scripts/verificar-configuracao/SCRIPT.mjs --preparacao
```

The command must pass and the evidence and decisions must be valid for the
increment. If no verification or approval is required, indicate the first
pending step with `proximos-passos` and suspends writing, including drafts.

Use `atualizar-documentacao` to reuse what exists. Gather questions about name
(up to 50 characters), goal, requirements, limits and dependencies, with
predecessors and status or “None”. Check the increase in roadmap and use
`gerenciar-roadmap` if missing. Match the update if the slug already exists.

Fill in the [Spec model](../../../templates/spec/TEMPLATE.md) ed
`<documentos.specs>/<slug>/SPEC.md`, with the name on H1 and slug in tiny, no
accents, with numbers and hyphens allowed. PRD, UX/UI, design, roadmap and
external references. Enter to-dos, non-applicable items and affected documents.
For each acceptance, register ID (such as AC-001), prerequisite, data, method or
command, assertion and test path in `.agent-tests/<spec>/<execucao>/`. Check
relative links and identify still proposed commands.

A new or modified spece materially is in `status: rascunho`. Solve essential
doubts and get explicit approval before registering `status: aprovado` and
evidence. Preserve valid approval if change is immaterial. After approval,
combine release if necessary and update your links, dependencies and state,
preserving other items. Update affected indexes and forward the approved
increment to the [plan-delivery](../../../commands/planejar-entrega/COMMAND.md).

[reading-pt]: ../../../../../../.pbai4devs/skills/specs/criar-spec/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/specs/criar-spec/SKILL.md
