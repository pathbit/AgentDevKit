---
description: "Publicación exclusiva de registros de recuperación en un directorio privado preparado."
status: aprovado
language: es
---

# Diario de recuperación en disco

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Este incremento implementa un componente aislado para publicar e inspeccionar
los [registros de recuperación](../registro-recuperacao/SPEC.md). No lo conecta
a CLI, al sync o al proyecto consumidor y no corrige el rollback. La
autorización general del usuario cubre el incremento.
[Producto](../../product/prd.md), [experiencia](../../product/ux-ui.md),
[diseño](../../product/design.md) e [roadmap](../../product/roadmap.md) Siguen
siendo válidos.

## Contrato

El estado de aprobación anterior se refiere a este contrato y a los criterios de
aceptación originales. La aplicación adicional descrita a continuación está en
revisión.

El llamador proporciona un directorio de almacenamiento ya preparado, privado y
confiable, que contiene exclusivamente las carpetas `records` e `staging`. El
módulo no crea estas carpetas, no elimina contenido ni interpreta directorios
ausentes como diario vacío. Entradas inesperadas en `records`, enlaces, archivos
especiales, registros incompletos, estados pendientes y fallos de lectura
impiden una nueva reserva. La inspección devuelve estados distintos y no altera
archivos. En POSIX, los directorios deben pertenecer al UID efectivo, sin
permisos de grupo/outros o bits especiales. Los registros también deben
pertenecer a ese UID y tener forma `0400`; sus propiedades observables son
comparadas durante la lectura. Esas verificaciones no comprueban la ausencia de
ACLs ni impiden un intercambio después de la última consulta.

Para reservar una generación, inspeccionar registros y publicar `claim` en el
nombre canónico de la próxima generación con hardlink exclusivo. Generar bytes
en archivo exclusivo en `staging`, creado con modo `0600` sujeto al `umask`,
tornándolo solamente lectura y sincronización antes de la publicación. Antes de
encadenar otro registro, sincronizar el registro anterior observado y su
directorio. A continuación, sincronizar el directorio de registros; cualquier
fallo es reportada. La carpeta `staging` preserva los archivos de origen,
incluidos los residuos de error; no se excluye automáticamente y su tamaño
todavía no está limitado. `begin` e `done` Sigue el mismo procedimiento,
exigiendo el ID de la operación y la fase anterior. El llamador proporciona el
hash del manifiesto: el módulo no verifica el manifiesto ni la copia de
seguridad. No implementar resolución o compactación en este incremento.

Uno `claim` o `begin` sin terminal mantiene la operación pendiente. La
publicación exclusiva decide la disputa entre procesos cooperativos; un estado
`ready` leído antes de la disputa no autoriza, solo, una enmienda. El límite de
registros y bytes necesita reservar espacio para los tres registros antes de
aceptar un claim. `E_RECOVERY_BUSY` registra `EEXIST` en la publicación; no
comprueba quién creó el nombre. `E_RECOVERY_UNCERTAIN` informa generación, ID y
tipo cuando la publicación puede haber ocurrido, sin alegar que ocurrió; fallas
anteriores retornan error de E/S. Fallo de lectura, registro incorrecto y fase
incorrecta son distintos. Los errores no deben divulgar el contenido de los
registros o de los archivos del usuario. La lectura puede actualizar metadatos
de acceso del sistema de archivos. Cambios competidores en el inode o un listado
incompleto pueden producir resultado no válido temporal. Exceciones inesperadas
durante la lectura también se clasifican como diario no válido; el resultado no
identifica su causa. El ID está visible en la inspección: no es secreto ni
prueba de que quien llama `begin` o `done` Es el proceso que ha reservado la
operación.

El módulo presupone que ningún escritor externo modifica o oculta los registros
y que el directorio suministrado es el correcto y permanece seguro. Links de
ancestrales, intercambios competidores de directorios, ACLs y la completitud
física de la listaje no están garantizados por este incremento. La ausencia de
una cola entera, escrita por versiones antiguas o eliminadas externamente, no es
detectable por hash. Una falla de sincronización después de la publicación puede
dejar el registro visible a pesar del error; el resultado debe ser
inspeccionado. `fsync` No prueba resistencia a la pérdida de energía y hardlinks
exclusivos pueden ser incompatibles con sistemas de archivos o de red. En
Windows, las operaciones mutables retornan `E_RECOVERY_UNSUPPORTED` antes de
acceder al diario; ACLs y soporte futuro requieren prueba específica. En el
prototipo, un fallo de `fsync` después de publicar `done` puede regresar
`E_RECOVERY_UNCERTAIN` mientras la consulta vuelve `ready`. Este estatus no
autoriza integrar el diario al producto: repetir `fsync` del recibo o comprobar
solo la copia de seguridad no prueba que los cambios hayan terminado. El archivo
de preparación y el registro publicado son nombres para el mismo inode;
Sólo lectura reduce alteraciones accidentales, pero no impide la edición por el
dueño.

Antes de la integración, todavía faltan localización y vínculo al proyecto,
creación segura, backups y manifiesto completos, retención, resolución
explícita, diagnóstico, clasificación de órdenes y conciliación del contrato
histórico. La resolución debe disputar un terminal mutuamente exclusivo con
`done` y considerar escritores suspendidos: solo insertar un registro de
resolución no impide que un proceso antiguo vuelva a cambiar archivos. No hay
ese bloqueo o procedimiento de recuperación en este componente.

## Aplicación en revisión

Después de detener a los escritores y revisar el estado del proyecto, el
operador puede registrar la resolución de la pendencia. `resolveRecovery(raiz,
geração, id)` consulta la generación actual y requiere correspondencia exacta de
los dos identificadores. Acepta las fases `claim` e `begin` y publica un recibo
`resolved` en el formato existente, con el hash del `claim` y el hash del
`begin` Cuando presente. La inspección de la cadena reconoce la resolución y
permite la siguiente reserva. Los archivos públicos, la copia de seguridad y los
registros anteriores permanecen disponibles para la revisión. [Aplicación del
diario](../../../../.pbai4devs/scripts/lib/recovery-store.mjs)

ID o generación divergente y diario no válido bloquean la resolución. Un error
que deje la publicación del recibo incierta requiere una nueva inspección. La
exclusividad del nombre `resolved` impide sobrescribir otro recibo de este tipo.
Como `done` Tiene un nombre distinto, cerrar a los escritores también es
necesario para evitar la continuación de una operación antigua. La presencia de
los dos terminales invalida la cadena y bloquea nuevas reservas.

En macOS, además del modo y del propietario, el componente exige una consulta
ACL exitosa y sin entradas en los directorios privados, en los registros y en el
archivo de preparación antes de escribir sus bytes. Una ACL heredada, incluso en
una carpeta `0700`, bloquea la operación. La prueba local confirmó la negativa
antes de publicar un `claim` y después añadir una ACL a un registro. [Pruebas de
privacidad](https://github.com/pathbit/AgentDevKit/blob/main/tests/recovery-backup.test.mjs)

En Windows, `createPrivateRecoveryDirectory` utiliza Windows PowerShell del
sistema y `CreateDirectoryW` para crear exclusivamente una carpeta con DACL
protegida. La creación informa `EEXIST` Cuando el nombre ya está ocupado. El
diario verifica la raíz, `staging`, `records` y los archivos de registro. La
política acepta como propietario el usuario actual, SYSTEM o el grupo local
Administradores. Sólo acepta concesiones simples a estas identidades y requiere
control total del usuario actual, herdable por archivos y subcarpetas en el caso
de directorios. Puntos de nuevo análisis (`reparse points`), concesiones más
amplias y fallas en la consulta impiden el uso. [Implementación de la política
de privacidad](../../../../.pbai4devs/scripts/lib/recovery-privacy.mjs)

Windows sincroniza los bytes del archivo por descriptor gravable y publica el
registro por hardlink exclusivo. La entrada del directorio queda fuera de ese
`fsync`, por lo tanto, la visibilidad después del cierre del proceso no
demuestra persistencia del nombre después de la caída de energía. La
verificación en macOS cubrió la resolución en ambas fases, un recibo no válido y
la repetición después de falla de grabación. Falta ejecutar las pruebas en
Windows real para verificar DACLs, creación exclusiva y transiciones del diario
en esa plataforma. La integración con las órdenes del producto y el contrato de
rollback son trabajos separados. [Pruebas del diario][testes-diario] ·
[Recuperación conservadora](../recuperacao-conservadora/SPEC.md)

## Criterios de aceptación

- **AC-001:** Inspección distingue vacío, pendiente, completado y datos
  inválidos, sin seguir enlaces en los registros ni exceder los límites del
  validador puro.
- **AC-002:** Claim, begin y done forman una secuencia encadeada; fase, ID,
  límites y colisiones inválidos son rechazados sin modificar registros
  existentes.
- **AC-003:** Procesos reales disputan el mismo claim: solo uno gana. Cierre
  después del claim mantiene espera reconocible en nueva ejecución.
- **AC-004:** Fallos inyectados antes y después del hardlink mantienen registros
  y residuos para inspección y no modifican archivos públicos de fixture.
- **AC-005:** Las pruebas pasan en macOS y Linux; Windows es registrado como no
  verificado hasta prueba real. Resultados en `.agent-tests/diario-disco/`.

Las pruebas no aprueban integración, recuperación de proyectos reales o release.

[testes-diario]: https://github.com/pathbit/AgentDevKit/blob/main/tests/recovery-store.test.mjs

[reading-pt]: ../../../specs/diario-disco/SPEC.md
[reading-en]: ../../../en/specs/diario-disco/SPEC.md
[reading-es]: SPEC.md
