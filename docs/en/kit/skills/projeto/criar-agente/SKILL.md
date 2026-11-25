---
name: criar-agente
description: "Creates or updates shared profiles of agents and notes."
language: en
---

# Create Agent

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Set paper when delegating, input, result, tools and limits. Create or update
`.pbai4devs/agents/<nome>/AGENT.md`, with appropriate metadata and concise
profile. Preserve existing instructions and permissions. Link the relevant
skills and tell the profile to whom to return results.

Map mode and permissions in native YAMLs next to the source; keep the shared
header portable. When there is support, validate them and report differences of
discovery. When the format is not recognized, ask for explicit source reading.
For Antigravity, keep specific YAMLs next to `AGENT.md`. The manifest is
generated: do not edit it by hand. Synchronisation generates notes.

Update índice/guia, follow the rules of structure and quality and finish with
`sincronizar-agentes` for CLI, including after renaming or removing profiles;
check out the native metadata generated for each chosen client.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/criar-agente/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/projeto/criar-agente/SKILL.md
