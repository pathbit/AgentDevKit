---
name: criar-spec
description: "Define con el usuario el alcance y los criterios verificables de un incremento para aprobación."
language: es
---

# Crear spec

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Ver en `.pbai4devs/state/configuracao/ESTADO.md` Las evidencias de la
preparación. PRD y diseño requieren aprobación. UX/UI requiere aprobación o
justificación de no aplicación aprobada. Antes de crear o modificar la spec,
ejecute:

```sh
node .pbai4devs/scripts/verificar-configuracao/SCRIPT.mjs --preparacao
```

El comando necesita pasar y las evidencias y decisiones necesitan estar válidas
para el incremento. Si falta verificación o aprobación, introduzca la primera
etapa pendiente con `proximos-passos` y suspenda la escritura, incluso de
borradores.

Use `atualizar-documentacao` Para reaprovechar lo que existe. Reúna dudas sobre
nombre (hasta 50 caracteres), objetivo, requisitos, límites y dependencias, con
predecesoras y estado o “Ningunaa”. Consulte el incremento en el roadmap y use
`gerenciar-roadmap` Si falta. Combine la actualización si el complemento ya
existe.

Rellene el [modelo de spec](../../../templates/spec/TEMPLATE.md) en
`<documentos.specs>/<slug>/SPEC.md`, con el nombre en H1 y slug en minúsculas,
sin acentos, con números y hífens permitidos. Vincule PRD, UX/UI, diseño,
roadmap y referencias externas. Indique pendencias, elementos no aplicables y
documentos afectados. Para cada aceptado, registre ID (como AC-001),
prerrequisito, datos, método o comando, asertiva y camino de la prueba en
`.agent-tests/<spec>/<execucao>/`. Revise enlaces relativos e identifique
órdenes aún propuestos.

Una nuevaspec o modificada materialmente está en `status: rascunho`. Resolva
dudas esenciales y obtenga aprobación explícita antes de registrar `status:
aprovado` y la evidencia. Preserve la aprobación válida si el cambio es
inmaterial. Después de la aprobación, combine la release si es necesario y
actualice sus enlaces, dependencias y estado, preservando otros ítems. Actualice
índices afectados y encaminhe el incremento aprobado a [planificar
entrega](../../../commands/planejar-entrega/COMMAND.md).

[reading-pt]: ../../../../../../.pbai4devs/skills/specs/criar-spec/SKILL.md
[reading-en]: ../../../../../en/kit/skills/specs/criar-spec/SKILL.md
[reading-es]: SKILL.md
