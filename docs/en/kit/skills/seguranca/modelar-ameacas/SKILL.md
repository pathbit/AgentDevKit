---
name: modelar-ameacas
description: "It identifies assets, borders of trust and threats from the approved scope."
language: en
---

# Model Threats

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Read related product, design, and code. First, gather questions about data,
actors, privileged operations, and environment boundaries. Register what is
fact, hypothesis, or missing information; do not invent architecture.

Map the assets, inputs, flows, and borders of trust. For each threat, describe
pre-condition, path of abuse, impact, control, and observable test. Prioritise
what the design really allows: user access, privilege elevation, leak,
injection, and resource abuse.

Use the [revision model](../../../templates/revisao-seguranca/TEMPLATE.md) as
support and the [auditor](../../../agents/auditor-seguranca/AGENT.md) for
review. If the project needs a permanent document, match your destination with
the user and follow
[update-document](../../projeto/atualizar-documentacao/SKILL.md). Drafts and
evidence remain in `.agent-tests/security/`.

Output: prioritized threats, existing controls, gaps and test criteria. The
model guides [review-safe](../revisar-seguranca/SKILL.md); does not prove that
the controls were implemented or tested.

[reading-pt]: ../../../../../../.pbai4devs/skills/seguranca/modelar-ameacas/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/seguranca/modelar-ameacas/SKILL.md
