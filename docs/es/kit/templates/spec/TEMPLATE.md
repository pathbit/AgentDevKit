---
description: "Especificación de un incremento."
status: rascunho
language: es
---

# Nombre de la spec

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo

La definición.

## Requisitos funcionales

La definición.

## Requisitos no funcionales

La definición.

Cuando haya requisito de desempeño, combine antes de la implementación la carga,
el ambiente, la métrica y el límite de aceptación. Regístra tolerancias de
corrección, errores y recursos; en el plano de verificación, indique baseline,
comando, repeticiones y como comparar resultados. Use percentiles apenas cuando
pertinentes.

## Escopo y fuera de alcance

La definición.

## Restricciones técnicas

La definición.

## Criterios de aceptación

| Criterio | Resultado observable |
| --- | --- |
| AC-001 | La definición. |

## Plan de verificación

Establezca la prueba antes de implementar. Las evidencias se quedan en
`.agent-tests/<spec>/<execucao>/`; el código de las pruebas es versionado.

| Criterio | Método/comando | Prerrequisito | Assertiva | Evidencia | Status |
| --- | --- | --- | --- | --- | --- |
| AC-001 | Configurando | Configurando | Configurando | Configurando | pending |

Introduzca la URL/fluxo para la web, aplicação/ação para escritorio o la orden
real para lógica/API. La asertiva describe lo que comprueba el resultado; un
código de salida aislado no comprueba comportamiento. `passed`, `failed`,
`not-run` o `not-applicable` en el informe único de revisión. `not-applicable`
no aprueba un aceptado: revise el alcance con el usuario antes de retirarlo.
Todo criterio mantenido exige `passed` y evidencia para concluir.

## Impacto en la documentación

[Documentos y ejemplos que deben cambiar; registre la ausencia de impacto con
justificación en la revisión.]

## Dependencias de otras specs

La definición.

## Referencias y aprobación

PRD, UX/UI, diseño y configuración vigentes: a definir. Aprobación: pendiente.

[reading-pt]: ../../../../../.pbai4devs/templates/spec/TEMPLATE.md
[reading-en]: ../../../../en/kit/templates/spec/TEMPLATE.md
[reading-es]: TEMPLATE.md
