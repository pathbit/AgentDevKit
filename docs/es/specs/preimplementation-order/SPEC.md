---
description: "Orientación y verificación del orden anterior a la aplicación."
language: es
---

# Orden antes de la implementación

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

El proyecto debe partir de decisiones de producto y diseño, pasar por roadmap y
spec y concluir la configuración técnica antes del código de la aplicación.

## Criterios de aceptación

- AC-001: `next` orienta roadmap y spec antes de la configuración técnica y no
  presume aprobación o elige una spec ambigua.
- AC-002: La verificación previa informa bloqueo si el estado de preparación o
  configuración está ausente, no válido o pendiente; no modifica Git.
- AC-003: Las skills requieren pruebas de infraestructura antes de implementar y
  registran como pendientes las pruebas de una aplicación que todavía no existe.
- AC-004: Proyectos existentes, archivos humanos, enlaces e índice se conservan;
  pruebas y revisión cubren decisiones, lagunas y retomada.

El estado registrado no comprueba la evidencia por sí sola. Instrucciones y
scripts no impiden escritura arbitraria por un agente que los ignore; esa
protección depende de los permisos o hooks del cliente usado.

[reading-pt]: ../../../specs/preimplementation-order/SPEC.md
[reading-en]: ../../../en/specs/preimplementation-order/SPEC.md
[reading-es]: SPEC.md
