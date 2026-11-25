---
description: "Modelo de contexto, amenazas, hallazgos y pruebas de seguridad."
status: modelo
language: es
---

# Revisión de seguridad

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Rellene con hechos de alcance autorizado. Resultados y borradores se encuentran
en `.agent-tests/security/`; combine el destino de documentación permanente.
Este modelo complementa el informe JSON Los escáneres, sin reemplazar sus
pruebas.

## Contexto

Alvo, alteración, ambiente, activos, actores, operaciones y fronteras de
confianza. Regístra fuentes, hipótesis y dudas; no rellene lagunas con
suposiciones.

## Amenazas y controles

| Amenaza | Precondición | Impacto | Control existente | Prueba necesaria |
| --- | --- | --- | --- | --- |
| Configurando | Confirmando | Confirmando | Evidencia | Resultado esperado |

## Achados

| ID | Local | Evidencia sin secreto | Confianza | Estado | Siguiente acción |
| --- | --- | --- | --- | --- | --- |
| SEC-001 | Arquivo/linha | Evidencia | Evaluación | La triar | Responsable |

## Validación

Criterio, comando o escenario, resultado, camino de la prueba y limitaciones.
Tenga en cuenta lo que pasó, falló, no se aplica y no fue ejecutado. Regístra
revisión independiente y riesgo residual antes de concluir.

[reading-pt]: ../../../../../.pbai4devs/templates/revisao-seguranca/TEMPLATE.md
[reading-en]: ../../../../en/kit/templates/revisao-seguranca/TEMPLATE.md
[reading-es]: TEMPLATE.md
