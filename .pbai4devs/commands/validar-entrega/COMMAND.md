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

Conforme o risco, envolva [QA](../../agents/engenheiro-qa/AGENT.md),
[segurança](../../agents/auditor-seguranca/AGENT.md) e
[performance](../../agents/analista-performance/AGENT.md). Cubra casos de sucesso,
limite e falha, permissões e integração quando aplicáveis. Para backend, exercite
contratos e dados; para interface, teste fluxos reais no navegador ou desktop.
Em performance, registre ambiente, carga, métricas e comparação com a meta.
Não invente metas nem marque como aprovado o que não foi executado.

Saída: resultado por critério, comandos e provas em `.agent-tests/`. Código de
teste e fixtures necessários são versionáveis; resultados não são versionados.
O validador não corrige as fontes nem aprova a própria mudança. Entregue o
resultado ao [revisor](../../agents/revisor/AGENT.md) pelo
[gate de entrega](../revisar-entrega/COMMAND.md).
