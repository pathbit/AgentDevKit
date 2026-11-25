---
description: "Creación y publicación seguras de etiquetas de versiones verificadas."
language: es
---

# Etiquetas automáticas de release

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Criterios de aceptación

- AC-001: La CI crea `v<versão>` En el commit de la branch principal solamente
  después de toda la matriz pasar e inicia la publicación del mismo commit.
- AC-002: Cambios sin nueva versión no duplican publicaciones; etiquetas
  existentes nunca se mueven y colisiones o regressiones de versión impiden la
  publicación.
- AC-003: La release y los dos paquetes utilizan el mismo artefacto y la misma
  versión de la tag; la publicación exige el CI completo aprobado.
- AC-004: Pruebas verifican eventos indebidos, fallas, colisiones, retomada y
  carreras sin crear etiquetas o publicar paquetes reales.

[reading-pt]: ../../../specs/automatic-release-tags/SPEC.md
[reading-en]: ../../../en/specs/automatic-release-tags/SPEC.md
[reading-es]: SPEC.md
