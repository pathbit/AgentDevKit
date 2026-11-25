---
description: "Backup privado y manifiesto verificable para la recuperación conservadora."
status: aprovado
language: es
---

# Backup y manifiesto de recuperación

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Este componente aislado prepara copias del snapshot suministrado por el llamador
y entrega el hash del manifiesto para el [diario](../diario-disco/SPEC.md). La
autorización general del usuario cubre el incremento. No altera CLI, sync o
proyectos consumidores; no corrige el rollback. O [PRD](../../product/prd.md), a
[experiencia](../../product/ux-ui.md), o [diseño](../../product/design.md) e o
[roadmap](../../product/roadmap.md) Siguen siendo válidos.

## Contrato del incremento original aprobado

El estado de aprobación anterior se refiere a este contrato y a los criterios de
aceptación originales. La aplicación adicional descrita a continuación está en
revisión.

El llamador proporciona una carpeta privada, confiable, existente y vacía y una
lista de entradas con un camino relativo, acción (`create`, `update`, `remove`,
`retain`), tipo anterior (`file`, `directory`, `absent`), modo y bytes de cada
archivo. El componente valida todo antes de la primera escritura: caminos
portables con verificación conservadora de caja y componentes `.git` e
`.agent-tests`, entradas únicas, tipos y acciones coherentes, modos POSIX, bytes
sin `SharedArrayBuffer` y límites de 4.096 entradas, 32 MiB por archivo, 128 MiB
en total y 4 MiB en el manifiesto. Recusar formato o contenido desconocido, sin
imprimir nombres o bytes. También rechazar caracteres y nombres reservados,
espacios o puntos finales y componentes largos. La comparación de caja y
normalización no sustituye una prueba de aliases en cada sistema de archivos y
puede rechazar nombres distintos. Se rechaza los aliases Unicode reproducidos
para `ß`, sigma y `ſ`, pero no implementa todo el mundo [case folding
Unicode][case-folding] ni la comparación nativa de cada volumen. La integración
debe rechazar lo que no pueda validar con seguridad.

Generar copias exclusivas en `blobs/`, con nombres numéricos independientes de
los caminos del proyecto. Em POSIX, la carpeta nace con `0700`, sujeto al
`umask`; cada copia nace con hasta `0600` y recibe el modo `0600` antes del
`fsync`. El modo original está en el manifiesto. Sincronizar cada copia, la
carpeta y el manifiesto antes de volver. El manifiesto canónico UTF-8 contiene
los caminos, acciones, tipos, modos, tamaños, hashes SHA-256 y nombres de las
copias. Su hash completo, incluso la ruptura de línea final, identifica el
contenido a ser informado al diario. No sobrescribir ni eliminar residuos
después de fallas. Si la sincronización falla después de la grabación del
manifiesto, puede permanecer visible e incluso verificable a pesar del error;
eso no transforma la preparación en éxito ni comprueba durabilidad.

Una verificación separada recibe el hash esperado y rechaza datos truncados,
alterados, no canónicos, entradas extras, enlaces, permisos amplios o tipos
inesperados. `0700` en `blobs/`, `0600` en los archivos y confiere tamaño y hash
de las copias, sin restaurar archivos. Cuando Node informa al usuario efectivo,
la carpeta y las copias deben pertenecer a ese usuario. Propietario original,
grupo, ACLs, atributos extras, fechas e bits especiales del proyecto no son
registrados en este componente. El modo proporcionado debe estar entre `0000` e
`0777`; si el original tiene bits especiales, el planificador debe
identificarlos y no descartálos silenciosamente. Resultados y errores no exponen
contenido o nombres. La lectura puede actualizar metadatos de acceso. En
Windows, preparación y verificación se niegan hasta validación real; ACLs,
ancestral seguro y resistencia a caídas de energía no son comprobados por los
bits POSIX o por `fsync`.

El componente no lee el proyecto ni prueba que el snapshot es completo, actual o
que archivos con hardlinks, enlaces simbólicos o tipos especiales fueron
tratados con seguridad por el planificador. El manifiesto registra acciones,
pero no contiene el contenido o hash planificado para después de la operación.
No proporciona autenticación, restauración, retención o exclusión de datos. La
verificación no puede detectar una sustitución conjunta del manifiesto y del
hash por quien los controla. Los rechecajes detectan algunas alteraciones
durante la lectura, pero no hacen la copia de seguridad una visión atómica de un
directorio sujeto a escritores competidores. Antes de la integración, esos
límites, la identificación del proyecto, la captura completa y la coordinación
con procesos antiguos necesitan ser resueltos. El formato actual rechaza un
archivo anterior con descendientes, incluso un intercambio planificado de
archivo por directorio. Un `umask` que retire el acceso del propietario puede
impedir la escritura y dejar un residuo privado, que no se elimina.

## Aplicación en revisión

En macOS, la preparación requiere la ausencia de entradas de ACL en la raíz, en
`blobs/` y en los archivos privados antes de grabar sus bytes. La verificación
repite la inspección en el manifiesto y en las copias. Una fixture `0700` con
una concesión heredada se desestimaba antes de recibir datos. Una segunda
fixture confirmó la negativa de un blob al que se añadió una ACL.

En Windows, el llamador proporciona una carpeta privada vacía. Puede crearla con
`createPrivateRecoveryDirectory`, que atribuye una DACL protegida en la creación
exclusiva. La preparación confiere la DACL la raíz y la carpeta `blobs/` Antes
de guardar los datos de snapshot. La verificación también confiere a DACL del
manifiesto y de cada blob. Ambas aplican la política de propietario, concesiones
y herencia descrita en el diario. Permisos más amplios o fallo al consultar DACL
impiden el uso de la copia de seguridad. El modo original proporcionado sigue
siendo metadatos del manifiesto. Los permisos verificados describen el
almacenamiento de la copia de seguridad. La captura de ACLs originales del
proyecto sigue fuera de este formato. [Política del
diario](../diario-disco/SPEC.md#aplicaci%C3%B3n-en-revisi%C3%B3n) ·
[Implementación de
copia de seguridad](../../../../.pbai4devs/scripts/lib/recovery-backup.mjs)

En Windows, el componente sincroniza los bytes de los blobs y el manifiesto por
descriptor. El camino POSIX también ejecuta `fsync` los directorios. La
persistencia de los nombres en Windows después de la pérdida de energía
permanece sin garantía. La verificación local en macOS cubrió la creación
exclusiva y conferencia de los hashes. Falta ejecutar en Windows la prueba que
concede lectura a Todos (`Everyone`) y exige denegar la copia de seguridad antes
de guardar, además del ciclo de preparación y verificación en carpeta privada.
[Pruebas de copia de
seguridad](https://github.com/pathbit/AgentDevKit/blob/main/tests/recovery-backup.test.mjs)

El llamador puede verificar la copia de seguridad y proporcionar el hash del
manifiesto a `begin`. La resolución manual exige la generación y el ID de la
espera y preserva el manifiesto, los blobs y los archivos públicos. La
integración de esas operaciones a CLI y el sync y la decisión sobre el rollback
pertenecen al alcance de la recuperación conservadora. [Resolución en el
diario][resolucao] · [Spec de integración](../recuperacao-conservadora/SPEC.md)

[resolucao]: ../diario-disco/SPEC.md#aplicaci%C3%B3n-en-revisi%C3%B3n

## Criterios de aceptación

- **AC-001:** Preparar y verificar snapshot sintético con archivos vacíos y
  binarios, directorios y ausencias preserva bytes y modos en el manifiesto, sin
  modificar los archivos públicos de la fixture.
- **AC-002:** Las entradas inválidas, colisiones, paths peligrosos, formatos no
  soportados y límites se niegan antes de escribir. Los fallos posteriores
  preservan residuos, no sobrescriben otros archivos y no producen éxito.
- **AC-003:** Modificación, truncamiento, eliminación, enlace o archivo extra en
  la copia de seguridad y el manifiesto incorrecto se detectan sin revelar
  contenido.
- **AC-004:** Una prueba asocia el hash verificado al `begin` del diario; él no
  afirma que la CLI utiliza este mecanismo ni que snapshot es completo.
- **AC-005:** Las pruebas pasan en macOS y Linux; Windows real no está
  verificado. El código de prueba es versionado y la evidencia se encuentra en
  `.agent-tests/manifesto-recuperacao/`.

[case-folding]: https://www.unicode.org/faq/casemap_charprop.html

[reading-pt]: ../../../specs/manifesto-recuperacao/SPEC.md
[reading-en]: ../../../en/specs/manifesto-recuperacao/SPEC.md
[reading-es]: SPEC.md
