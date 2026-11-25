---
description: "Mantiene documentos y ejemplos coherentes con una modificación verificada."
language: es
---

# Actualizar documentación

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entrada: cambio, evidencia y documentos relacionados. Acione el
[documentador](../../agents/documentador/AGENT.md) con la
[skill](../../skills/projeto/atualizar-documentacao/SKILL.md) correspondiente.

Él inventaría y lee el material, propone complementos por vía, actualiza
solamente hechos confirmados y verifica enlaces y ejemplos. Scripts pasan por
[ejecutarscript](../../skills/projeto/executar-script/SKILL.md).

Salida: decisiones por documento, diff y pruebas locales para el agente
principal. Si ya hay entrega o revisión en marcha, devuelve el resultado a ese
flujo. Para una tarea avulsa de documentación, use el [gate de
entrega](../revisar-entrega/COMMAND.md) para la revisión independiente.

[reading-pt]: ../../../../../.pbai4devs/commands/atualizar-documentacao/COMMAND.md
[reading-en]: ../../../../en/kit/commands/atualizar-documentacao/COMMAND.md
[reading-es]: COMMAND.md
