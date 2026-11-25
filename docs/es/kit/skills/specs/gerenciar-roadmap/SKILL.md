---
name: gerenciar-roadmap
description: "Consulta el status y organiza specs y entregas en releases."
language: es
---

# Gestionar roadmap

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Lea el estado del proyecto y sus caminos. En una consulta, no cambia archivos:
muestre preparación, releases, specs y tareas con dependencias y bloqueos. Use
`[ ]`, `[-]` e `[x]` como evidencia; informe a los estados desconocidos. Si la
preparación está declarada, no la marque como terminada: informe la falta de
prueba e indique `configurar-projeto` antes de PRD, UX/UI o diseño. Sin roadmap,
diga que aún no se ha creado. No se ha completado ninguna entrega sin prueba.
Una tarea pendiente no comprueba la ausencia de implementación o pruebas. No se
ha comprobado la ausencia de artefactos o pruebas sin verificarlos; informe la
laguna. Para iniciar producto sin preparación comprobada, indique
`configurar-projeto` antes de crear PRD o diseño. En proyecto existente, vea las
evidencias y la intención: use `preparar-dev` para ejecución local y preserve
decisiones y documentos existentes al planificar producto. Consulte clientes y
idioma en `state/agentdevkit.json`. En consultas de roadmap, use los valores
guardados sin pedir confirmación o cambio; trate cambios sólo si el usuario las
solicita.

Antes de modificar documentos, aplique el inventario de
`atualizar-documentacao`. Al planificar o actualizar, utilice el modelo sólo
para lagunas en el camino acordado. Registra objetivos, prioridades, etapas,
dependencias y pendencias de PRD, UX/UI y diseño. Mantenga referencias y estados
coherentes al aprobar o revisar documentos; no invente alcance, fechas o
releases. Identifique las specs del primero entregble por las dependencias y
pregunte por decisiones faltantes.

Para una release planificada, combine nombre, prioridades y dependencias. Use
slug en minúsculas sin acentos, números y hífens y el modelo de release en
`<documentos.releases>/<slug>/RELEASE.md`. Vincule specs y tareas, preserve
otros ítems y sólo concluya después de entregas y verificaciones completas. La
preparación inicial no exige definir una release.

Siga la regla de calidad e informe archivos y esperas. Use `sincronizar-agentes`
Sólo si los recursos agênticos cambian; cambios sólo en el roadmap, releases o
tareas no requieren sincronización.

[reading-pt]: ../../../../../../.pbai4devs/skills/specs/gerenciar-roadmap/SKILL.md
[reading-en]: ../../../../../en/kit/skills/specs/gerenciar-roadmap/SKILL.md
[reading-es]: SKILL.md
