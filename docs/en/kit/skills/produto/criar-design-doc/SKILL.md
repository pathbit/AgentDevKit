---
name: criar-design-doc
description: "Sets with the user the architecture and technology of the product and records the decision for approval."
language: en
---

# Create technical design

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Check out the preparation and its evidence in
`.pbai4devs/state/configuracao/ESTADO.md`, o PRD approved and UX/UI approved or
not applicable with approved justification. If there are gaps, forward the first
with `proximos-passos` before you write. `atualizar-documentacao` to re-use
what's there.

Gather questions about architecture, technology, components, integrations, data,
non-functional requirements, safety, testing, deployment, options and risks.
`usar-skills-externas` for relevant references. Register decisions and pending
in `documentos.design` for [template](../../../templates/design/TEMPLATE.md),
with ties to PRD e UX/UI. The stack installation is for the technical
configuration.

New or modified document materially stays in `status: rascunho`. Solve essential
decisions and register `status: aprovado` with evidence only after explicit
approval. Preserve valid approvals. Evaluate affected specs and reopen only with
proven material impact and authorization. Register pending doubt. Update
READMErelevant roadmap and ADRs.

After approval, use `proximos-passos` to forward the planning of increments
before specs. Follow the quality rule. Synchronize only if agents' resources
change.

[reading-pt]: ../../../../../../.pbai4devs/skills/produto/criar-design-doc/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/produto/criar-design-doc/SKILL.md
