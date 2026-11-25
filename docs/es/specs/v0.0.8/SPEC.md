---
description: "Correcciones verificadas de preservación, transacciones y interfaz CLI."
status: aprovado
version: 0.0.8
language: es
---

# Preservación y validación profunda

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo y autorización

Atender al pedido de revisión profunda, corrigiendo fallas comprobadas y
publicando una nueva versión estable después de validación. Esta etapa continúa
el [PRD](../../product/prd.md), o [diseño](../../product/design.md) y los
[pruebas en proyectos reales](../v0.0.7/SPEC.md).

## Contrato

- No borrar ni sobrescribir archivos humanos por la apariencia de su Markdown.
  Exigir propiedad comprobada para limpieza automática de apuntamientos.
- Recusar conflictos conocidos antes de escribir. En fallas posteriores,
  restaurar los cambios propios sin reemplazar ediciones humanas competidores.
- Preservar permisos en actualización, seguridad y rollback, incluso en archivos
  solamente para lectura cuando la operación sea permitida por el sistema.
- Recusar componentes simbólicos en los caminos locales de herramientas, incluso
  después de operaciones externas, antes de escribir o confirmar una
  instalación.
- Preservar totalmente argumentos después `tools ... --`; ayuda y versión no
  requieren directorio de proyecto válido.
- Conferir artefactos existentes y excepciones literales además de los nombres
  de muestra, sin leer ignores de proyectos hermanos o desindexar archivos
  humanos.
- Mantener el rechazo de enlaces simbólicos incompatibles de Zod; no convertir
  ese bloqueo documentado en una instalación exitosa.

## Criterios de aceptación

| ID | Resultado observable |
| --- | --- |
| AC-001 | Markdown humano se conserva; limpieza usa propiedad comprobada. |
| AC-002 | Fallos no dejan grabaciones propias parciales ni cambian permisos. |
| AC-003 | Administrador no escribe fuera de la instalación por enlaces simbólicos. |
| AC-004 | CLI repasa argumentos; ayuda funciona sin proyecto. |
| AC-005 | Ignore protege artefactos sin invadir proyectos hermanos. |
| AC-006 | Regresos, paquete público y actualización del router son verificados. |

## Verificación

Para AC-001 a AC-005, conservar reproducciones anteriores y pruebas de regresión
que fallan antes de la corrección, con asertivas de contenido, modo, estado y
Git. Ejecutar las pruebas relevantes en Node 24/26 y revisar los diffs de forma
independiente. Limitaciones de plataforma deben quedar explícitas.

Para AC-006, ejecutar pipeline completo, escenarios de madurez y matriz OSS del
paquete generado. Confirmar en CI Linux, macOS y Windows; publicar lo mismo TGZ,
comparar checksum y repetir el consumo público. Actualizar el router con
preview, backup, diagnóstico y comparación de la baseline, preservando el índice
existente.

Las pruebas y fixtures son versionados. Clones y pruebas se quedan en `tmp/` y
el registro de revisión en `.agent-tests/`. No prometer la ausencia universal de
errores.

## Documentación afectada

Actualizar referencia de CLI, instalación, herramientas, changelog README,
roadmap e índices. No crear documentos de producto en los proyectos
consumidores.

[reading-pt]: ../../../specs/v0.0.8/SPEC.md
[reading-en]: ../../../en/specs/v0.0.8/SPEC.md
[reading-es]: SPEC.md
