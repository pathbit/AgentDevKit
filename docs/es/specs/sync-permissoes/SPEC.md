---
description: "Preservar permisos durante la creación de temporales de sync."
status: aprovado
language: es
---

# Permisos temporales de sync

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

sincronizador puede crear un temporal con permisos más amplios que el archivo
existente antes de aplicar su modo. La autorización general de mejoras ya
concedida por el usuario cubre esta corrección. Este incremento complementa la
[spec de conservación](../v0.0.8/SPEC.md), sin reemplazar su contrato de
rollback. Producto y arquitectura permanecen los del
[PRD](../../product/prd.md), [UX](../../product/ux-ui.md) e
[diseño](../../product/design.md).

## Escopo

Em POSIX, al actualizar un archivo regular existente, crear el temporal con el
modo observado del destino, sujeto a la máscara de creación del sistema, antes
de escribir contenido; entonces restaurar el modo existente como hoy. Archivos
nuevos y Windows mantienen el método anterior de creación; el nuevo chequeo de
consistencia también se aplica a Windows y todavía necesita prueba real. No
consultar o cambiar `process.umask()` en la implementación: la consulta sin
argumento tiene riesgo de carrera según la [documentación de
Node](https://nodejs.org/api/process.html#processumask). Si se observa una
retirada o cambio de modo en el chequeo anterior a la creación del temporal,
rechaza la operación. Esto no cierra la ventana después de ese chequeo.

Esto no garantiza ACLs, dueño, grupo, bits especiales, atributos extendidos o
sigilo en Windows, ni resuelve intercambios competidores durante aplicación,
limpieza o rollback. El modo puede cambiar nuevamente después del chequeo. A
[recuperación conservadora](../recuperacao-conservadora/SPEC.md) continúa
separada y pendiente; no publicar mientras sus pruebas estrictos fallan.

## Criterios de aceptación

- **AC-001:** En macOS y Linux, con `umask` permisivo, el temporal de un destino
  `600` No concede acceso a grupo u otros en el instante de la creación. La
  fixture sintética en `tests/sync-temporary-privacy.test.mjs` Debe fallar antes
  y pasar después. Guardar salida en `.agent-tests/sync-permissoes/`.
- **AC-002:** Modos existentes `400`, `444`, `600`, `640` e `644` se conservan
  después del sync, con máscaras `000`, `002`, `022` e `077`. Archivo nuevo
  mantiene los modos resultantes de las mismas máscaras. Testar con fixtures
  aisladas; verificar bytes y no depender sólo de opciones pasadas a
  `writeFileSync`.
- **AC-003:** Pruebas de sync y preservación pasan sin alterar archivos humanos,
  índice Git o ignores de las fixtures. Reexecutar `testar-infraestrutura` e
  `testar-maturidade`; registrar órdenes, fallos y límites.
- **AC-004:** La prueba en Windows no interpreta bits POSIX como prueba de ACL.
  Validar funcionamiento y preservación en la matriz Windows antes de publicar;
  hasta entonces registrar como no verificado.

## Entrega

Actualizar [roadmap](../../product/roadmap.md), pruebas y documentación de
límites; registrar pruebas y revisión independiente. La versión de release
todavía no fue elegida. La corrección aislada no concluye los demás requisitos
del objetivo ni autoriza una publicación parcial.

[reading-pt]: ../../../specs/sync-permissoes/SPEC.md
[reading-en]: ../../../en/specs/sync-permissoes/SPEC.md
[reading-es]: SPEC.md
