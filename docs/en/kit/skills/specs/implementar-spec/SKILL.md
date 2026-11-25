---
name: implementar-spec
description: "Delivers an increase with approved spec and plan and gathers evidence by criterion of acceptance."
language: en
---

# Implement spec

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use the spec, approved plan and documents configured in
`.pbai4devs/state/configuracao/ESTADO.md`. Check the affected tests, links and
approvals of PRD, design, UX/UI and spec. UX/UI can be dispensed with approved
justification. [meeting-context-spec-][contexto] if you can execute commands. If
the collection is incomplete, check the sources directly. Solve the first
pending pointed by [Next steps][proximos].

Reuse proven decisions. If the plan is missing or changing materially, take the
open decisions, risks, scope and proof of each acceptance to the user. Apply the
plan after approval and register it to the roadmap. With the approvals in due
course, complete [configure-project][configurar] and execute
[check-configuration][verificar] before the first code patch. Proceed with
output 0, valid status and mandatory evidence of infrastructure conferred.

Implement within the scope, using the project conventions and tests. Check the
diff staged and unstaged and preserve the index and the existing editions by
[Git rule][git]. Solve liability overlaps before editing. Use [task
model][tarefas] ed `<documentos.tarefas>/<slug-da-spec>/TASKS.md` and link spec,
release, dependencies, accepted and proofs. `usar-skills-externas` when the
decision requires, registering the sources used. In authorized delegation,
assign clear files and evidence and confirm the integrated diff.

Deliver diff, evidence and to-dos to the agent in charge. [check-work][provas]
to prove the accepted and `atualizar-documentacao` for the affected facts.
Update tasks, roadmap and release. Sync if you have changed agency resources. If
you lead the delivery, forward to [validate-delivery][validar] and independent
review. Checkpoints, integration, push and publication follow the project
authorization and gates.

[contexto]: ../../../scripts/reunir-contexto-spec/README.md
[proximos]: ../../projeto/proximos-passos/SKILL.md
[configurar]: ../../projeto/configurar-projeto/SKILL.md
[verificar]: ../../../scripts/verificar-configuracao/README.md
[git]: ../../../rules/git/RULE.md
[tarefas]: ../../../templates/tasks/TEMPLATE.md
[provas]: ../../projeto/verificar-trabalho/SKILL.md
[validar]: ../../../commands/validar-entrega/COMMAND.md

[reading-pt]: ../../../../../../.pbai4devs/skills/specs/implementar-spec/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/specs/implementar-spec/SKILL.md
