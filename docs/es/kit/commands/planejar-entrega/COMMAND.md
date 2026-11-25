---
description: "Reúne dudas y produce un plan verificable para la entrega."
language: es
---

# Planificar entrega

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entrada: objetivo o camino de la spec, restricciones y decisiones existentes.
Sin ese contexto, reúna las preguntas antes de proponer implementación.

Acione el [planificador](../../agents/planejador/AGENT.md). Él usa
[proximospasos](../../skills/projeto/proximos-passos/SKILL.md) Para reconocer la
fase y encaminar a las skills de producto, diseño o spec. En proyecto existente,
lea los documentos reales antes de usar templates.

Cuando el alcance justifique, consulte el
[arquitecto](../../agents/arquiteto/AGENT.md) para fronteras, alternativas,
riesgos y decisiones de diseño. Identifique tareas independientes, dependencias,
responsables de archivos y pruebas necesarias; incluya backend, frontend, QA,
seguridad y performance cuando sean aplicables. Planeje subagentes conforme a la
capacidad del cliente, sin anticipar fases del producto.

Salida: alcance, dudas, tareas, dependencias, archivos y pruebas por criterio.
Encaminhe al agente principal para obtener las aprobaciones pendientes. Con la
spec y el plan aprobados, los entregue con los aceptados a
[implementar-entrega](../implementar-entrega/COMMAND.md).

[reading-pt]: ../../../../../.pbai4devs/commands/planejar-entrega/COMMAND.md
[reading-en]: ../../../../en/kit/commands/planejar-entrega/COMMAND.md
[reading-es]: COMMAND.md
