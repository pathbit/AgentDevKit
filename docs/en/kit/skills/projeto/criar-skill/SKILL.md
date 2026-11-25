---
name: criar-skill
description: "Creates or updates shared instructions for a recurring task with own decisions."
language: en
---

# Create skill

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

First look for an existing skill or cured reference that covers the task. Create
or update `.pbai4devs/skills/<grupo>/<nome>/SKILL.md`- Use it. `name` same as
the folder, with tiny numbers and hyphens. `description`Tell me when to use the
skill in a way that distinguishes it from the nearby options.

Include the expected result, project decisions and restrictions and proofs that
show quality. Let the agent choose how to perform the work when there are valid
alternatives. Reuse existing rules, scripts and templates. Link longer
references to the point where they will be needed.

Follow the quality rule and use `verificar-trabalho` to check relevant structure
and behavior. Update affected guides and entry points. Generate the indexes with
`sincronizar-agentes` and check it out `--check` separately. Inform code,
warnings and limits. A statement proves the integration of the file. Effective
discovery depends on the client. Present the result for revision, respecting
approvals already given.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/criar-skill/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/projeto/criar-skill/SKILL.md
