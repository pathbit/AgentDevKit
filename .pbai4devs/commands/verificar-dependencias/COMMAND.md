---
description: Verifica dependências usando bases locais de vulnerabilidades.
---

# Verificar dependências

Entrada: projeto e seus manifests/lockfiles. Prepare a base dos ecossistemas
reais por [preparar-seguranca](../preparar-seguranca/COMMAND.md).

```console
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs run --checks dependencies
```

Use [executar-script](../../skills/projeto/executar-script/SKILL.md) e leia o
contrato de [auditar-seguranca](../auditar-seguranca/COMMAND.md).
Sem base adequada ou pacote reconhecido, não declare dependências aprovadas.
Triagem considera versão, alcance e mitigação. Não execute `audit fix --force`
nem atualize tudo automaticamente; proponha a menor correção verificável.
