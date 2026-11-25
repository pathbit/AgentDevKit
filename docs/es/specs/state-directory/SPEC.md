---
description: "Nombre en inglés para la carpeta de estado compartido."
language: es
---

# Carpeta de estado

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

La carpeta de primer nivel pasa de `.pbai4devs/estado` para `.pbai4devs/state`.
Contiene estado de instalación y configuración, no memoria de conversaciones.
Los nombres internos permanecen iguales.

## Criterios de aceptación

- AC-001: Instalaciones nuevas usan `state` y recursos, documentación,
  exclusiones y paquete apuntan a ella, sin exponer estado local en el paquete o
  en Git.
- AC-002: La actualización de instalaciones antiguas preserva selección, idioma,
  decisiones, contenido humano y permisos; conflictos y enlaces inseguros no
  causan pérdida o sobrescrita silenciosa.
- AC-003: Simulación, repetición, fallos y recuperación preservan archivos,
  índice Git y `.gitignore` del proyecto. Scripts independientes identifican
  instalaciones antiguas y nuevas de forma coherente.
- AC-004: Pruebas locales, CI en Linux, Windows y macOS y revisión independiente
  verifican el comportamiento y los límites de la migración.

[reading-pt]: ../../../specs/state-directory/SPEC.md
[reading-en]: ../../../en/specs/state-directory/SPEC.md
[reading-es]: SPEC.md
