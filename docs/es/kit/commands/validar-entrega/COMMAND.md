---
description: "Ejecuta pruebas de entrega y prepara la revisión independiente."
language: es
---

# Validar entrega

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entrada: criterios, diff, pruebas existentes, medio ambiente e instrucciones de
ejecución. Si falta aplicación o herramienta, registre los criterios afectados y
continúe con las pruebas viables.

Acione el [validador](../../agents/validador/AGENT.md) com [verificar
trabajo](../../skills/projeto/verificar-trabalho/SKILL.md). Él usa
[ejecutarscript](../../skills/projeto/executar-script/SKILL.md) y las
verificaciones reales definidas en el proyecto. No hay comando universal de
pruebas.

Como el riesgo, involucra [QA](../../agents/engenheiro-qa/AGENT.md),
[seguridad](../../agents/auditor-seguranca/AGENT.md) e
[rendimiento](../../agents/analista-performance/AGENT.md). Cubra casos de éxito,
límite y fallo, permisos e integración cuando sean aplicables. Para backend,
exercite contratos y datos; para interfaz, prueba flujos reales en el navegador
o escritorio. En performance, registre ambiente, carga, métricas y comparación
con la meta. No invente metas ni marque como aprobado lo que no fue ejecutado.

Salida: resultado por criterio, órdenes y pruebas en `.agent-tests/`. Código de
prueba y fixtures son versionables. El validador devuelve fallas al
implementador y entrega las pruebas al agente principal. Con los criterios
comprobados, siga [revisar entrega](../revisar-entrega/COMMAND.md) Para cerrar
documentación, revisión independiente y gate.

[reading-pt]: ../../../../../.pbai4devs/commands/validar-entrega/COMMAND.md
[reading-en]: ../../../../en/kit/commands/validar-entrega/COMMAND.md
[reading-es]: COMMAND.md
