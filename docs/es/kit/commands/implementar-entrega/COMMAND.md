---
description: "Encami un plan aprobado para la aplicación dentro del ámbito."
language: es
---

# Implementar entrega

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entrada: spec y plan aprobados, responsables y criterios de aceptación. Consulte
los requisitos previos de
[implementar-spec](../../skills/specs/implementar-spec/SKILL.md). Si falta
aprobación o definición, vuelva a [planificar
entrega](../planejar-entrega/COMMAND.md) por la primera etapa pendiente.

Acione el [implementador](../../agents/implementador/AGENT.md) con archivos bajo
su responsabilidad. Utiliza skill, pruebas y herramientas del proyecto; registra
dudas restantes antes de decidir requisitos.

Para tareas independientes, distribuía entre subagentes disponibles y
autorizados, como [backend](../../agents/especialista-backend/AGENT.md) e
[frontend](../../agents/especialista-frontend/AGENT.md). Dé a cada contexto,
objetivo, dependencias, archivos exclusivos para escritura y pruebas esperadas.
El agente principal integra las alteraciones, resuelve interfaces y confiere los
resultados. Sin soporte a la delegación, ejecute en secuencia e informe esa
limitación.

Salida: diff, criterios, órdenes de ejecución, pruebas preliminares y esperas.
Pase ese conjunto a [validar entrega](../validar-entrega/COMMAND.md). Falsos
vuelven al implementador con la prueba que falló.

[reading-pt]: ../../../../../.pbai4devs/commands/implementar-entrega/COMMAND.md
[reading-en]: ../../../../en/kit/commands/implementar-entrega/COMMAND.md
[reading-es]: COMMAND.md
