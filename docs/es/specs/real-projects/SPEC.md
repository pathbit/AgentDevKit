---
description: "Compatibilidad con repositorios públicos y ejemplos incrementales."
status: aprovado
version: 0.0.13
language: es
---

# Proyectos reales y ejemplos incrementales

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Validar la instalación y mantenimiento del paquete en commits fijos de proyectos
reales, preservando sus configuraciones y su índice Git. Demostrar el flujo de
producto, diseño y tres specs en dos proyectos nuevos, con resultados locales
ignorados.

## Criterios de aceptación

| ID | Resultado observable |
| --- | --- |
| AC-001 | Prueba los siete repositorios, con commits registrados. |
| AC-002 | Prueba init repetido, update, sync y preservación en los clones. |
| AC-003 | Proteger cachés ante excepciones Git, preservando texto e índice. |
| AC-004 | Producto y diseño antes de las tres specs de cada proyecto nuevo. |
| AC-005 | Documentar reproducción, límites y salidas ignoradas. |
| AC-006 | Pruebas de regresión, paquete y revisión independiente pasan. |

Las pruebas de compatibilidad no ejecutan ni compilan las aplicaciones externas.
Aprobaciones de producto y revisión en los ejemplos son simuladas. Código de
prueba es versionado; clones, proyectos generados y evidencias permanecen fuera
de Git.

[reading-pt]: ../../../specs/real-projects/SPEC.md
[reading-en]: ../../../en/specs/real-projects/SPEC.md
[reading-es]: SPEC.md
