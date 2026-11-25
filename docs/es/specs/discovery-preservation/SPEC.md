---
description: "Descubrimiento de skills y preservación en proyectos existentes."
language: es
---

# Descubrimiento y preservación

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Las integraciones deben proporcionar los recursos sin duplicar skills generados
para el Codex y sin sustituir configuraciones o cambios propios del proyecto.

## Criterios de aceptación

- AC-001: El Codex descubre cada skill en la ruta principal; las rutas
  alternativas se usan por recurso cuando es necesario y los conflictos son
  informados.
- AC-002: `init`, `update` e `sync` preservan contenido humano, índice Git y
  `.gitignore` de la raíz; limpieza exige propiedad comprobada.
- AC-003: La sincronización independiente y la actualización reconcilian el
  estado, preservando campos adicionales y señalando inconsistencias.
- AC-004: Scripts identifican su ejecución principal por caminos reales o
  aliases, sin ejecutar nuevamente cuando importados.
- AC-005: Los ejemplos de madurez funcionan también a partir del paquete
  distribuido, preservando archivos de origen y ejemplos anteriores.
- AC-006: Pruebas cubren combinaciones de clientes y proyectos existentes;
  resultados, clones y proyectos generados se ignoran o están fuera del
  repositorio.

Descubrimiento y validación estructural no demuestran ejecución completa de
todas las skills y perfiles en cada cliente. Registra los límites de las pruebas
realizadas.

[reading-pt]: ../../../specs/discovery-preservation/SPEC.md
[reading-en]: ../../../en/specs/discovery-preservation/SPEC.md
[reading-es]: SPEC.md
