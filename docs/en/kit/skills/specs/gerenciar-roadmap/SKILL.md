---
name: gerenciar-roadmap
description: "Check the status and organize specs and deliveries in releases."
language: en
---

# Manage roadmap

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Read the project status and paths. In a query, do not change files: show
preparation, releases, specs and tasks with dependencies and locks. Use `[ ]`,
`[-]` e `[x]` according to evidence; report unknown states. If the preparation
is only declared, do not mark it as completed: inform the lack of proof and
indicate `configurar-projeto` before PRD, UX/UI or design. No roadmap, say it
has not been created yet. Do not complete deliveries without proof. A pending
task does not prove no implementation or testing. Do not affirm absence of
artifacts or evidence without checking them; report the gap. To start product
without proven preparation, indicate `configurar-projeto` before creating PRD or
design. In existing design, check the evidence and intent: use `preparar-dev`
for local execution and preserve existing decisions and documents when planning
product. See customers and language in `state/agentdevkit.json`. In roadmap
queries, use the saved values without requesting confirmation or change; treat
changes only if the user requests them.

Before changing documents, apply the inventory of `atualizar-documentacao`. When
planning or updating, use the model only for gaps in the agreed path. Register
goals, priorities, steps, dependencies and pending PRD, UX/UI and design. Keep
references and coherent states when approving or reviewing documents; do not
invent scope, dates or releases. Identify the specs of the first deliverable by
dependencies and ask for missing decisions.

For a planned release, combine name, priorities and dependencies. Use slug in
lowercases without accents, numbers and hyphens and the release model in
`<documentos.releases>/<slug>/RELEASE.md`. Link specs and tasks, preserve other
items and only complete after complete deliveries and checks. Initial
preparation does not require setting a release.

Follow the quality rule and report files and to-dos. Use `sincronizar-agentes`
only if agentic features change; changes only in roadmap, releases or tasks do
not require synchronization.

[reading-pt]: ../../../../../../.pbai4devs/skills/specs/gerenciar-roadmap/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/specs/gerenciar-roadmap/SKILL.md
