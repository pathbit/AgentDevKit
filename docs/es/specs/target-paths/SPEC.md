---
description: "Resolución segura de los destinos de instalación."
language: es
---

# Destinos de instalación

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

El instalador debe mantener el camino solicitado y preservar proyectos
existentes, incluso cuando trabaja con directorios temporales en macOS.

## Criterios de aceptación

- AC-001: Destinos inexistentes preservan todos los nombres y su orden, incluso
  cuando el primer componente está directamente bajo la raíz.
- AC-002: Los alias temporales de sistema previstos en macOS funcionan para la
  instalación y consulta sin modificar el índice o el índice `.gitignore` del
  proyecto.
- AC-003: Los destinos que atraviesan enlaces humanos son rechazados, incluso
  los apuntados por variables de entorno; caminos reservados continúan
  protegidos.
- AC-004: Pruebas de regresión, revisión independiente y CI cubren los
  escenarios pertinentes en Linux, Windows y macOS.

[reading-pt]: ../../../specs/target-paths/SPEC.md
[reading-en]: ../../../en/specs/target-paths/SPEC.md
[reading-es]: SPEC.md
