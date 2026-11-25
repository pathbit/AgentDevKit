---
description: "Contrato del informe ejecutable de revisión de una entrega."
status: modelo
language: es
---

# Revisión de entrega

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

El informe real es un único JSON en
`.agent-tests/<referencia>/<execucao>/revisao.json`, sin otra copia Markdown. Le
Gere por el script `revisar-entrega prepare --id <referencia>`, con `--spec` o
`--scope` De acuerdo con el cambio. Preserve el snapshot generado por el script.

| Campo | Contrato |
| --- | --- |
| `version` | `1`. |
| `reference`, `execution` | Identificadores del cambio y de la ejecución. |
| `spec` | Ruta de la spec o `null` Pero, en realidad, el cambio sin spec. |
| `snapshot` | Modo, HEAD, hashes, spec y documentos obligatorios revisados. |
| `baseline` | Camino y hash del alcance original generado por `prepare`. |
| `documentation` | Camino, decisión y justificación por documento. |
| `validation` | Criterio AC-001, método, prerrequisito, asertiva y pruebas. |
| `review` | Revisor, estado y hallazgos del estado final. |

Decisiones de documentación: `pending`, `updated`, `no-impact`,
`not-applicable`. Status de validación: `pending`, `passed`, `failed`,
`not-run`, `not-applicable`. Toda ausencia de impacto/aplicação Necesita
justificación. Evidencias deben existir en caminos relativos bajo la carpeta
ignorada de la ejecución; código de prueba permanece versionado. Sin spec,
defina criterios propios con IDs AC-001; `spec: null` no dispensa los requisitos
previos para implementar funcionalidades. El gate sólo aprueba criterios con
`passed` y evidencia. Un aceptado no aplicable exige revisar el alcance
aprobado; marcar `not-applicable` No lo dispensa.

El revisor trabaja en lectura; el agente principal registra sus hallazgos en
JSON. `review.status` só passa de `pending` a `approved` después de cerrar los
hallazgos `open` como `resolved` y revisar el estado final. Alteraciones
posteriores requieren nuevo snapshot, verificaciones afectadas y nueva revisión.
Error de delegación o ausencia de respuesta mantiene la revisión pendiente. El
sello confiere los datos registrados; no comprueba que la revisión haya
ocurrido.

Ejecute `revisar-entrega seal <relatorio>` después de la aprobación
independiente y `revisar-entrega check <relatorio>` antes del commit/merge.
`baseline.json` e `seal.json` Los metadados generados, sin edición manual. El
script confiere consistencia, cobertura, archivos y evidencias; la revisión
humana o del agente revisor evalúa la semántica y la calidad del resultado.

[reading-pt]: ../../../../../.pbai4devs/templates/revisao-entrega/TEMPLATE.md
[reading-en]: ../../../../en/kit/templates/revisao-entrega/TEMPLATE.md
[reading-es]: TEMPLATE.md
