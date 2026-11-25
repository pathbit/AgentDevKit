---
description: "Ejecución portátil y publicación confiables después de fallas del CI."
language: es
---

# Confiabilidad de la pipeline

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Las verificaciones deben identificar la causa de las fallas y ofrecer margen
para runners de velocidades diferentes, sin reducir la cobertura ni liberar un
paquete antes de la aprobación de todos los jobs.

## Criterios de aceptación

- AC-001: Las pruebas portátiles ejecutan en grupos independientes en Windows y
  macOS; una falla en cualquier grupo reproba el CI. La orden local continúa
  ejecutando todos los grupos y las suítes críticas permanecen cubiertas.
- AC-002: Procesos de prueba y publicación informan errores y señales útiles sin
  exponer credenciales. Tiempo agotado sigue siendo falla.
- AC-003: La release aguarda el CI por el período configurado con margen para la
  duración y la fila; continúa exigiendo el artefacto del commit y del intento
  aprobados y no acepta CI falho o de otro origen.
- AC-004: Linux, Windows y macOS ejecutan las verificaciones del CI real; los
  dos registros reciben y verifican el mismo paquete aprobado, si hay release.
- AC-005: La documentación explica los perfiles y cómo repetir todos los jobs al
  recuperar el artefacto de un intento anterior.

## Verificación

Ejecute pruebas de regresión de los límites, fallas, grupos y publicación,
además del perfil completo local. Siga los runners reales y la release hasta la
conclusión; registre resultados y revisión independiente en el gate de entrega.

[reading-pt]: ../../../specs/ci-resilience/SPEC.md
[reading-en]: ../../../en/specs/ci-resilience/SPEC.md
[reading-es]: SPEC.md
