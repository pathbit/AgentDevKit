---
description: Executa provas da entrega e prepara a revisão independente.
---

# Validar entrega

Entrada: critérios, diff, ambiente e instruções para executar o projeto.
Faltando aplicação ou ferramenta exigida, registre o impedimento.

Acione o [validador](../../agents/validador/AGENT.md) com
[verificar-trabalho](../../skills/projeto/verificar-trabalho/SKILL.md).
Ele usa [executar-script](../../skills/projeto/executar-script/SKILL.md) e as
verificações reais definidas no projeto. Não há comando universal de testes.

Saída: resultado por critério, comandos e provas em `.agent-tests/`.
O validador não corrige as fontes nem aprova a própria mudança. Entregue o
resultado ao [revisor](../../agents/revisor/AGENT.md) pelo
[gate de entrega](../revisar-entrega/COMMAND.md).
