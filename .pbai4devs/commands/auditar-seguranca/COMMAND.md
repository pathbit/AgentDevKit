---
description: Executa scanners offline e encaminha sinais para triagem contextual.
---

# Auditar segurança

Entrada: projeto-alvo e escopo. Por padrão, use o projeto atual e os três checks.
Prepare ferramentas e bases por
[preparar-seguranca](../preparar-seguranca/COMMAND.md).

Use [executar-script](../../skills/projeto/executar-script/SKILL.md):

```console
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs run --checks secrets,dependencies,sast
```

Acrescente `--target` somente para um caminho autorizado. A execução é offline;
não troca base ausente por API remota. O retorno é `0` sem achados, `1` com
achados e `2` para falha ou verificação incompleta; leia o estado de cada check.

Saída: relatório sem valores secretos em
`.agent-tests/security/<execucao>/report.json`. Acione o
[auditor](../../agents/auditor-seguranca/AGENT.md) com
[revisar-seguranca](../../skills/seguranca/revisar-seguranca/SKILL.md) para
triagem e controles que os scanners não comprovam.
