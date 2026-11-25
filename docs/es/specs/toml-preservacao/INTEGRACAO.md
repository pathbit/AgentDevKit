---
description: "Integración en evaluación y pruebas pendientes de la preservación TOML."
status: rascunho
language: es
---

# Integración de la preservación TOML

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

> Registro histórico de una candidata. Desde `0.0.36`, el kit deja de crear
> o renovar apuntamientos en `.gemini/`. Para actualizar versiones anteriores,
> siga adelante [migración de clientes][migration].

Este mapa complementa la [spec](SPEC.md). Una candidata local integra la edición
al instalador y al sync; todavía necesita cumplir los criterios de aceptación y
no representa una release publicada.

La candidata mantiene el formato actual de `blocks`: el nuevo formato digest
TOML vincula versión, bloque y comentario de procedencia; en el legado continúa
siendo el hash del bloque. El comentario registra solamente datos necesarios a
la edición y no copia el texto humano. Los pasos abajo continúan siendo
requisitos en evaluación. En fixtures, ciclos completos y transiciones de estado
preservaron el Git y el TOML Se ha rechazado el archivo staged divergente. Una
prueba de downgrade con la CLI `0.0.21` También se ha rechazado preservando los
archivos observados; esto no garantiza el comportamiento de otras versiones
antiguas o situaciones. En Linux, nueve fixtures pasaron por `init`, `update`,
sync directo y remoción, restaurando el TOML y preservando los archivos Git
observados. La prueba usó LF, archivos TOML no rastreados y parser del kit; no
cubre Windows o Gemini real. En macOS, un prototipo también pasó 40 casos con
parser independiente. El cargador local de Gemini CLI 0.67.0 aceptó órdenes V3
en las cuatro formas generadas por el helper y amplió una referencia y un
argumento sintéticos. Un parser independiente también aceptó los archivos; la
prueba utilizó configuración
simulada, sin red, modelo o flujo de instalación completo. Com TOML staged y
edición unstaged divergente, fixtures en macOS y Linux observaron rechazos en
`init`, `update` y en los dos caminos de sync; el intercambio de cliente
preservó el índice y restauró el texto humano. No fueron probados Windows, ACLs,
atributos extendidos o todas las combinaciones staged.

## Estado y planificación

1. Establecer registro versionado por camino Gemini, con digest del bloque y del
   comentario y datos mínimos sobre separadores y delimitadores. Validar
   caminos, límites y relación con `blocks`; no registrar texto humano.
2. Em `loadState`, `reconcileStateBytes`, `readDerivedState` e `derivedContent`,
   validar y preservar el registro y los campos desconocidos. Reconciliar el
   estado instalado, el derivado y sus remociones sin prioridad silenciosa
   cuando haya conflicto.
3. Transportar el registro validado para la etapa privada y para el plan de
   `init`, `update` y sync directamente. Un origen preexistente sin propiedad
   comprobada no debe ser adoptado. Datos ausentes, divergentes o huérfanos
   deben preservar el archivo y producir diagnóstico antes de la alteración
   pública.
4. En el intercambio de clientes, remoción de recursos y consolidación del
   estado, retirar solamente el registro asociado a la operación comprobada.
   `doctor` e `sync --check` Deben informar a los estados parciales o
   divergentes.
5. Conferir nuevamente el estado y los bytes aprobados antes de la aplicación.
   Como TOML y el estado no se publica atomicamente, una interrupción puede
   dejar el par incompleto: diagnosticar y preservar, sin prometer recuperación
   automática. Rollback y competencia siguen su propia spec.
6. Migrar el registro entre caminos de estado solamente con transición
   comprobada. Versiones antiguas pueden ignorarlo o reserializar el TOML;
   probar downgrade real y no presumir que un binario antiguo respete la
   política nueva.

El digest registra consistencia; no autentica autoría o identidad del archivo y
no comprueba permisos o metadatos del sistema de archivos.

## Pruebas necesarias

- Añadir, actualizar y retirar en las cuatro formas TOML y sin prompt, con
  parser independiente, BOM, LF/CRLF y ediciones humanas antes y después del
  bloque.
- Comprobar comentarios ausentes, modificados, duplicados o fuera de posición;
  texto similar dentro de una cadena no es comentario de metadatos.
- Exercitar CLI y sync directo en las dos órdenes, con índices staged y
  alteraciones unstaged, inclusive intercambio de clientes, legado, migración y
  estado parcial. Comparar archivos humanos, índice, configuración Git, ignores
  y refs.
- Prueba el paquete instalado sin `node_modules` del proyecto, con parser y
  licencia distribuidos, y probar versiones antiguas y actuales en fixtures
  desechables.
- Comprobar `{{args}}` en prompt y en las inclusiones: una ocurrencia en el TOML
  No garantiza una ocurrencia después de la expansión por el Gemini. La política
  de ese caso sigue pendiente.

No considerar estos puntos aprobados sobre la base de sólo un helper o prueba en
memoria; los flujos públicos y sus limitaciones necesitan evidencias.

[migration]: ../../guides/installation.md#actualizar-y-elegir-agentes

[reading-pt]: ../../../specs/toml-preservacao/INTEGRACAO.md
[reading-en]: ../../../en/specs/toml-preservacao/INTEGRACAO.md
[reading-es]: INTEGRACAO.md
