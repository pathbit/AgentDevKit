---
description: "Actualización segura de agent-browser y recuperación por versión."
language: es
---

# Actualización de herramienta y versiones

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Agent-browser ha pasado a distribuir ejecutables en paquetes opcionales por
plataforma. La actualización debe funcionar sin perder instalaciones existentes.

## Criterios de aceptación

- AC-001: El instalador acepta los diseños anteriores y actuales del
  agent-browser, valida ejecutables adecuados a la plataforma y comprueba la
  versión instalada.
- AC-002: Caminos no válidos o incompletos se niegan antes del intercambio;
  fallas preservan la instalación anterior y no atraviesan enlaces inseguros.
- AC-003: Cada release y paquete del flujo apunta para la etiqueta de la misma
  versión; la documentación explica cómo consultar una versión y simular su uso.
- AC-004: Pruebas automatizadas cubren diseños y fallas, y la CI verifica Linux,
  Windows y macOS en la matriz configurada antes de la publicación.

[reading-pt]: ../../../specs/tool-release/SPEC.md
[reading-en]: ../../../en/specs/tool-release/SPEC.md
[reading-es]: SPEC.md
