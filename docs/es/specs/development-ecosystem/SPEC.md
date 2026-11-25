---
description: "Expertos, colaboración y pruebas para el desarrollo de software."
language: es
---

# Ecosistema de desarrollo

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

El kit orienta equipos y agentes en arquitectura, backend, frontend, QA,
seguridad, revisión y performance, sin determinar la tecnología del proyecto.
Los recursos son instrucciones: su existencia no ejecuta agentes o herramientas.

## Criterios de aceptación

- AC-001: Skills y perfiles especializados son descubiertos por los clientes
  seleccionados y apuntan a las fuentes compartidas.
- AC-002: El flujo distribuye tareas independientes cuando hay subagentes
  permitidos y disponibles, define responsabilidades e integra los resultados.
  Sin delegación o revisión independiente, informa la limitación.
- AC-003: Las orientaciones seleccionan pruebas reales por riesgo y criterio,
  incluyendo fallas, accesibilidad y análisis adversos cuando son aplicables;
  distinguen resultados observados y verificaciones no ejecutadas.
- AC-004: La instalación preserva configuraciones, contenido existente, índice
  Git y el `.gitignore` De la raíz del proyecto.
- AC-005: Documentación y catálogos explican el uso de los recursos y sus
  límites; las verificaciones de fuentes, integración y distribución se
  ejecutan.
- AC-006: El perfil de revisión de OpenCode V2 niega edición, shell y delegación
  en el frontmatter generado.

## Verificación

Ejecute las pruebas de integración y la pipeline local completa. Compruebe los
adaptadores generados, la preservación de contenido y el resultado de la
revisión independiente. Regístra pruebas y esperas conforme el gate de entrega.

[reading-pt]: ../../../specs/development-ecosystem/SPEC.md
[reading-en]: ../../../en/specs/development-ecosystem/SPEC.md
[reading-es]: SPEC.md
