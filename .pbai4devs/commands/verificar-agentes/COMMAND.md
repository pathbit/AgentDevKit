---
description: Confere a estrutura, os testes e as ferramentas locais dos agentes.
---

# Verificar agentes

Pré-requisito: Node.js 24+. Na raiz do projeto, rode nesta ordem:

```console
agentdevkit sync --check
node .pbai4devs/scripts/verificar-recursos/SCRIPT.mjs
node .pbai4devs/scripts/testar-infraestrutura/SCRIPT.mjs
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs check base
```

O primeiro comando confere os apontamentos. Em caso de divergência, use
[sincronizar](../sincronizar/COMMAND.md) antes de repetir. Os scripts verificam
[recursos][recursos], [infraestrutura][infra] e [ferramentas existentes][tools].
Ao alterar catálogo, instalação ou sincronização, rode também
`node .pbai4devs/scripts/testar-maturidade/SCRIPT.mjs run`.

Retorne o resultado por etapa e as evidências em `.agent-tests/`. Em
`partial`, informe o caso, seu motivo e em qual ambiente a prova deve rodar.
Provas web usam [testar-navegador](../testar-navegador/COMMAND.md).

[recursos]: ../../scripts/verificar-recursos/README.md
[infra]: ../../scripts/README.md#script-de-infraestrutura
[tools]: ../../scripts/preparar-ferramentas/README.md
