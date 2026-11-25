---
description: "Keeps documents and examples consistent with a verified change."
language: en
---

# Update documentation

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Input: change, evidence and related documents.
[documenter](../../agents/documentador/AGENT.md) with
[skill](../../skills/projeto/atualizar-documentacao/SKILL.md) correspondent.

He would invent and read the material, propose complements by way, update only
confirmed facts and check links and examples. Scripts go through
[execute-script](../../skills/projeto/executar-script/SKILL.md).

Output: decisions per document, diff and local proofs for the main agent. If
there is already delivery or revision in progress, return the result to that
stream. For a single documentation task, use the [delivery
gate](../revisar-entrega/COMMAND.md) for independent review.

[reading-pt]: ../../../../../.pbai4devs/commands/atualizar-documentacao/COMMAND.md
[reading-en]: COMMAND.md
[reading-es]: ../../../../es/kit/commands/atualizar-documentacao/COMMAND.md
