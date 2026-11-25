---
description: "Tareas del componente de validación de registros de recuperación."
status: em andamento
language: es
---

# Registro de recuperación

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Spec: [registro-recuperacao](../../specs/registro-recuperacao/SPEC.md). Release:
pendiente.

- [x] Establecer formato y límites de los registros imutables.
- [x] Implementar y probar el validador puro en macOS y Linux, incluso un
  Historia sintética de mil operaciones e entradas corrompidas.
- [x] Comprobar la creación exclusiva de un competidor en el sistema de archivos
      local.
- [-] Revisar diff y validar el componente en Windows.
- [-] Clasificar órdenes para la futura barrera: el componente aislado cubre
  opciones de la CLI, pero no bloquea mutaciones ni clasifica sync directo.
- [ ] Integrar publicación, lectura segura, backup y bloqueo a CLI y al sync.
- [ ] Corregir y probar los once escenarios estrictos de recuperación y
      limpieza.

Evidencias locales: `.agent-tests/registro-recuperacao/prova-5bq7Fj/`. Las
pruebas locales no comprueban comportamiento en sistemas de archivos de red.

[reading-pt]: ../../../tasks/registro-recuperacao/TASKS.md
[reading-en]: ../../../en/tasks/registro-recuperacao/TASKS.md
[reading-es]: TASKS.md
