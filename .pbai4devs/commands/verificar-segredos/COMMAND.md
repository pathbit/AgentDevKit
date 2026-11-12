---
description: Procura sinais de credenciais expostas com scanner local.
---

# Verificar segredos

Entrada: projeto autorizado. Use as ferramentas preparadas e
[executar-script](../../skills/projeto/executar-script/SKILL.md):

```console
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs run --checks secrets
```

Siga [auditar-seguranca](../auditar-seguranca/COMMAND.md) para retorno, relatório
e triagem. Um sinal não prova que a credencial é ativa; não tente autenticá-la.
Não copie o valor encontrado para a conversa. Encaminhe segredo real ao
responsável e use
[corrigir-vulnerabilidade](../../skills/seguranca/corrigir-vulnerabilidade/SKILL.md).
Remover o texto não revoga o segredo nem apaga cópias no histórico.
