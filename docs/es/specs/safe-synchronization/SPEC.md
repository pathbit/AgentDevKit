---
description: "Sincronización segura con recursos y cambios propios del proyecto."
language: es
---

# Sincronización segura

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Los proyectos pueden tener archivos propios y recursos adicionales a los del
paquete. Las órdenes deben preservar este contenido al instalar, actualizar y
sincronizar.

## Criterios de aceptación

- AC-001: Los recursos humanos o modificados en el hub y los clientes se
  conservan, incluso en colisiones y con `--force`.
- AC-002: La limpieza elimina solamente salidas obsoletas con propiedad
  comprobada; carpetas y archivos adicionales del equipo no se eliminan.
- AC-003: Un contenido divergente preparado en el índice no es descartado por la
  sincronización; `.gitignore` La raíz y los datos humanos se conservan.
- AC-004: `init`, `update`, `sync`, consultas y opciones están documentados con
  sus efectos sobre archivos, copias de seguridad, selección de clientes y Git.
- AC-005: Pruebas ejercitan instalaciones existentes, obsolescencia, colisiones,
  ejecución repetida, Git y fallas; la CI contempla Linux, Windows y macOS.

[reading-pt]: ../../../specs/safe-synchronization/SPEC.md
[reading-en]: ../../../en/specs/safe-synchronization/SPEC.md
[reading-es]: SPEC.md
