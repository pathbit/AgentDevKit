---
description: "Look for signs of credentials exposed with local scanner."
language: en
---

# Check Secrets

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Input: authorized project. Check out the [collection
prerequisites](../auditar-seguranca/COMMAND.md) and run the offline script using
the tools already prepared:

```console
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs run --checks secrets
```

Read the returns and coverage in [script
guide](../../scripts/auditar-seguranca/README.md). For triage, use
[review-safe](../../skills/seguranca/revisar-seguranca/SKILL.md) with the report
and the scope of secrets. A sign does not prove that the credentials are active;
do not try to authenticate it. Do not copy the value found for the conversation.
Send real secret to the person responsible and use
[correct-vulnerability](../../skills/seguranca/corrigir-vulnerabilidade/SKILL.md).
Remove the text does not revoke the secret or delete copies in the history.

[reading-pt]: ../../../../../.pbai4devs/commands/verificar-segredos/COMMAND.md
[reading-en]: COMMAND.md
[reading-es]: ../../../../es/kit/commands/verificar-segredos/COMMAND.md
