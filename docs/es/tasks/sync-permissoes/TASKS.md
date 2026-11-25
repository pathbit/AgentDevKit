---
description: "Trabajos de conservación de permisos temporales de sync."
status: em andamento
language: es
---

# Permisos temporales de sync

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Spec: [sync-permissoes](../../specs/sync-permissoes/SPEC.md). Release:
pendiente.

- [x] Reproducir modo `666` en fixture de destino `600` En macOS y Linux.
- [x] Corregir la creación temporal sin cambiar la política de archivos nuevos.
- [x] Prueba 26 casos de modo, contenido y chequeos competidores en macOS y
  Linux. En la baseline, 18 de estos casos fallaron.
- [x] Repetir 12 suítes de infraestructura en copia aislada, ocho escenarios de
  madurez y pruebas de preservación; registrar un caso NTFS Pasado por alto.
- [-] Revisar diff y actualizar documentación y evidencia.
- [ ] Validar Windows y recuperación concurrente antes de una release.

Las pruebas se encuentran en `.agent-tests/sync-permissoes/execucao-XZqfCZ/`. El
paquete candidato local pasó por seis operaciones en fixture aislada; esto no
altera la versión publicada. Los once pruebas estrictos de preservación
continúan fallando.

[reading-pt]: ../../../tasks/sync-permissoes/TASKS.md
[reading-en]: ../../../en/tasks/sync-permissoes/TASKS.md
[reading-es]: TASKS.md
