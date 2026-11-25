---
name: criar-regra
description: "Create or update shared rules and notes."
language: en
---

# Create Rule

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Set purpose, context, and activation. Create or update
`.pbai4devs/rules/<nome>/RULE.md` with `description` and explicit activation.
Preserve scopes and map differences without silently expanding activation.
`trigger` from the shared source according to its scope: `always_on`,
`model_decision`, `glob` or `manual`. The description guides `model_decision`, e
`glob` requires `globs`. Keep adaptations of other customers in YAMLs next to
the source. The manifest is generated; do not edit it by hand. Check the values
in [compatibility](../../../COMPATIBILIDADE.md).

Update índice/guia, follow the quality rule and finish with
`sincronizar-agentes`, including after renaming or removing rules. Check
activation when possible and report when reading needs to be explicit.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/criar-regra/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/projeto/criar-regra/SKILL.md
