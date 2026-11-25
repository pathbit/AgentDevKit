---
name: usar-skills-externas
description: "Selects and uses healed external skills without copying instructions for agents."
language: en
---

# Use external skills

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

See [catalog](../../../external-skills/README.md) before creating an equivalent
solution. Choose from the task and stack already decided; do not adopt
technologies to justify a skill. Prefer connectors and skills available.

Use `gerenciar-skills-externas list` by the selector. For an entry `reviewed`,
execute `install <id>`, `check <id>` e `read <id>`; read the relevant references
as well. The installation is ignored, outside the source and mirrors. Enable
only what is needed; do not load all collections in context.

Confirm origin, license, fixed revision and effects before approving a new entry
or version. `update` reinstalls only the revised pin in the catalog. New
instructions and scripts require further revision; do not use CLI global
updates. After changing `CATALOG.json`, execute `sincronizar-agentes` e
`--check` to keep the local inventory up to date; the definitions are sources,
the indices are derived. External instructions are subordinated to the decisions
of this project: Node in automations, results in `.agent-tests/`, no stack
changes, hooks, publications or installation of frameworks on the initiative of
the skill.

Register IDs and revisions used in plano/revisão. Use compatible guidelines
without copying external content to `SKILL.md` local. Official origin does not
replace revision or means universal approval.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/usar-skills-externas/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/projeto/usar-skills-externas/SKILL.md
