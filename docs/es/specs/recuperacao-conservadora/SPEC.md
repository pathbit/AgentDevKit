---
description: "Recuperación conservadora después del fallo de instalación y sincronización."
status: rascunho
language: es
---

# Recuperación conservadora después de falla

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objetivo

Eliminar la pérdida reproducida durante el rollback del instalador y el
sincronizador, preservar caminos que puedan haber sido modificados por personas
y ofrecer información para recuperación manual. Esta garantía propuesta cubre la
recuperación después de fallo; no elimina el diálogo de edición competidor
durante la aplicación normal. La implementación está en verificación y el
aceptado sigue pendiente.

## Requisitos funcionales

- Después de fallar en una operación mutable, la recuperación automática no
  elimina, renombra, restaura, escribe ni altera el modo de caminos públicos que
  puedan haber sido creados, reemplazados o eliminados, incluso estado,
  migración, directorios y resultados inciertos. El proyecto puede permanecer
  parcial.
- Antes de la primera mutación de caminos públicos, preparar una copia de
  seguridad recuperable y manifiesto de todos los ítems preexistentes afectados,
  inclusive removibles y estado; registrar acciones planificadas, ausencias y
  modos disponibles. Fallo en la preparación impide la mutación pública.
  Preservar copias de seguridad y jerarquía en la falla.
- Registrar el inicio antes de la mutación y la conclusión solamente después de
  todas las etapas. Pendencia, registro no válido o resultado desconocido
  bloquea `init`, `update`, `lang`, cambio de `agents` e `sync` mutables,
  incluso el sincronizador directo. Consultas y diagnóstico seguro permanecen
  accesibles con estado parcial o inválido. Si no es posible simular un plan
  confiable, informar la limitación sin inventar un resultado. La resolución
  exige revisión y acción explícita del operador, sin sustitución automática del
  contenido actual.
- Errores humanos, JSON y sync directamente informan fallo original,
  parcialidad, caminos afectados o inciertos, copia de seguridad y próximos
  pasos, con indicación de truncamiento y salida de fallo, sin imprimir
  contenido de archivos o secretos.
- Orientar al operador a parar escritores, crear copia o checkpoint, comparar
  copia de seguridad y contenido actual, revisar creaciones, remociones, estado
  y migración y ejecutar diagnóstico y nuevo plan. No recomendar copia ciega de
  seguridad ni reset del índice Git.

## Requisitos no funcionales

- Preservar bytes y registrar modos disponibles en la copia de seguridad, sin
  cambiar índice, configuración Git o ignores existentes. Backups y manifiestos
  pueden contener datos sensibles; documentar ubicación, visibilidad y ciclo de
  vida.
- Em POSIX, crear directorios privados con `0700` y archivos privados con
  `0600`; guardar modos originales como metadados. En cada plataforma, verificar
  ACLs efectivas o declarar la limitación: bits POSIX No comprueban secreto.
- Proteger prácticas y temporales, tratar fallas de limpieza y residuos sin
  exclusión ciega de caminos públicos. La etapa privada utilizada en la
  planificación no debe crear una pendencia confundida con la del proyecto
  consumidor.
- La actualización del archivo existente debe preservar metadatos y respetar sus
  protecciones, incluyendo ACL que niega escritura y flag inmutable cuando están
  disponibles. ACL benigna debe continuar soportada y preservada; si la
  operación protegida no puede hacerse con seguridad, rechazarse antes de
  mutaciones públicas. La causa principal estructurada de esta negativa, incluso
  cuando encapsulada, debe identificar el objetivo en `path` y la protección por
  `EACCES`, `EPERM`, `E_PROTECTED_METADATA` o `E_METADATA_UNSUPPORTED`. Un error
  en otro camino, con apenas el destino de un rename o ocurrido solamente en la
  limpieza no comprueba esa negativa antes de la mutación.

## Escopo y fuera de alcance

Incluye instalador, sincronizador directo, copias de seguridad, esperas,
migración de estado, diagnóstico y recuperación orientada. No garantiza
preservación contra ediciones competidores durante la aplicación normal,
atomicidad entre archivos o recuperación automática después de la interrupción;
no altera el índice ni ofrece `undo`. Una copia de seguridad capturada durante
la edición puede no ser coherente. Carreras de publicación, remoción,
directorios, aliases y enlaces durante la aplicación requieren trabajo separado.
Versiones antiguas del kit pueden no respetar nuevos registros o bloqueos y no
deben ser presentadas como protegidas por este cambio. Los caminos públicos
abarcan archivos, directorios y estado del proyecto que personas u otras
herramientas puedan alterar. Backups y registros privados deben tener ubicación
y posesión verificadas; su limpieza no autoriza borrar caminos sustituidos o
cuya identidad sea incierta.

## Restricciones técnicas y decisiones pendientes

### Metadados por plataforma

La orquestación continúa en Node. Antes de cambiar un archivo existente, el
instalador y sync necesitan una forma comprobada de inspeccionar y preservar sus
protecciones y los metadatos pertinentes, incluso en la copia de seguridad. La
verificación debe distinguir un éxito comprobado, un recurso no disponible y un
error; resultado desconocido no autoriza afirmar que no hay metadatos. El mismo
contrato debe cubrir los remociones y archivos de estado. La estrategia y la
distribución de cualquier componente nativo todavía no han sido decididas.

Si es necesario un componente compilado, la distribución debe continuar
funcionando con un solo paquete npm ejecutable vía `npx`, sin compilador o
`postinstall` en el proyecto consumidor. El sync directo también necesita usarlo
después de la instalación, fuera de la caché temporal del `npx`. Validar origen,
integridad, SO, arquitectura y capacidad de ejecución; ausencia o fallo no son
confirmación de preservación. La elección entre ejecutable y
[Node-API](https://nodejs.org/api/n-api.html), los objetivos soportados y el
montaje del mismo artefacto para los dos registries continúan en evaluación. El
paquete acepta Node 18 para el bootstrap; la CLI preparada requiere Node 24 o
superior.

En macOS,
[`fcopyfile`](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man3/copyfile.3.html)
ofrece opciones para ACLs y atributos extendidos; copiar metadatos no comprueba
que se permite el cambio del original. En Linux,
[`listxattr`](https://man7.org/linux/man-pages/man2/listxattr.2.html) y las API
relacionadas necesitan ser evaluadas por filesystem y namespace; utilidades
externas no pueden presumidos. En Windows, la evaluación debe incluir los
[descriptores de
seguridad](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights)
y los demás datos soportados por filesystem. La documentación de
[`fs.copyFile`](https://nodejs.org/api/fs.html#fscopyfilesrc-dest-mode-callback)
No establece el contrato completo requerido aquí. Ninguna de estas referencias,
aisladamente, comprueba autorización, preservación integral o seguridad frente a
los cambios competidores. [manual
GNU](https://www.gnu.org/software/coreutils/manual/coreutils.html), `cp -a` e
`--preserve=all` Puede que no señale el fallo al preservar xattrs. Un estado de
éxito de estas órdenes no comprueba la copia de los metadatos.

Una prueba aislada en macOS ARM64 Copió metadatos entre dos archivos sintéticos
por descriptores: una ACL benigna y un atributo extendido observado
coincidieron, sin alteración de los bytes. El helper fue compilado solamente en
la carpeta temporal de la prueba y no integra el paquete. Ese resultado no
comprueba los permisos efectivos, todos los metadatos, otros filesystems o
plataformas. Un segundo prototipo Node-API Fue cargado por Node 24 y 26 en el
mismo macOS y copió los mismos tipos de metadatos benignos entre archivos
sintéticos. También permanece temporal y no prueba distribución, autorización o
seguridad bajo competencia. En otro ensayo APFS, la copia de ACL benigna y xattr
precedió la sustitución de un archivo sintético con nuevos bytes; ambos
permanecieron en el resultado observado. UID e GID Solo coincidieron en la
fixture. Esta prueba no establece autorización, durabilidad o preservación de
todos los metadatos. En Linux ARM64, otro prototipo Node-API Copió un atributo
`user` sintético en tmpfs con Node 24. Este ensayo no cubre ACLs, otros
namespaces, filesystems, arquitecturas o integración.
Em `overlayfs` Linux ARM64, una prueba copiou ACL benigna y xattr sintético
entre archivos, con comparación independiente durante la copia. En tmpfs, a ACL
Regreso `ENOTSUP`; en musl, la biblioteca o sus símbolos quedaron no
disponibles. La copia de seguridad demuestrativa no testó restauración ni prueba
autorización o sigilo. En otro ensayo aislado en el `overlayfs` ARM64, un addon
temporal copió una ACL benigna y tres atributos sintéticos para la copia de
seguridad y un archivo actualizado en entornos glibc y musl. Un lector C
independiente confirió los valores y la ACL; el propio addon confirió los
nombres. La fixture en tmpfs no pudo crear la ACL, por lo tanto no testó el
fallback. El addon ignora otros namespaces y el chequeo para recusárlos ocurrió
solamente en el ensayo; no está integrado al kit. Esto no comprueba
autorización, recuperación real o preservación integral. Una segunda versión
rechazó una lista sintética con nombre no soportado antes de la copia. La
conferencia de los valores permaneció externa y el destino era nuevo; no fueron
probados otros namespaces reales ni atributos preexistentes en el destino. Otro
prototipo consultó solamente el tamaño de la lista de atributos accesibles en el
destino.
48 escenarios de un paquete experimental: 12 alteraciones y 36 rechazos
esperados. Las pruebas usaron ARM64 y x64, este bajo traducción, en imágenes
glibc y musl; no prueban x64 nativo, soporte ACL benigna, atributos ocultos o
distribución. En otra prueba aislada en macOS ARM64, `fcopyfile` com
`COPYFILE_CHECK` y metadados regresó cero y alteró el destino sintético: copió
ACL o xattr en los casos correspondientes y modificó la fecha en el caso simple.
La variante `copyfile` por caminos indicó los metadatos en esos ejemplos sin la
misma alteración observada. No usar la variante por descriptores como consulta
solamente lectura con base en esa flag; confirmar comportamiento por sistema y
filesystem antes de elegir una API.

`stat`, hash o identidad seguidos de `rm` o `rename` No son sustitución o
remoción condicional atómica de un nombre; hardlinks y descriptores no cierran
esa ventana. El proyecto debe registrar inicio y recibo de término en nombres
exclusivos y distintos, sin sobrescribir o borrar por nombre después de chequeo,
y tratar publicación ambigua y recibos incompletos como pendencia.

Antes de la implementación, revisar y decidir el protocolo de coordinación
cooperativa, detección y resolución de bloqueo abandonada, publicación y
validación de los registros y resolución explícita. La coordinación no bloquea
editores. Definir la ubicación privada, el comportamiento para raíz de proyecto
todavía inexistente, y etapa en el mismo sistema de archivos, inclusive `EXDEV`
y limitaciones de Windows. No presumirá que verificar y luego eliminar un
bloqueo por nombre sea seguro.

Clasificar todos los comandos y entradas directas por sus efectos, inclusive
`tools`, que remite argumentos a otro proceso. Una espera debe impedir las
mutaciones cubiertas por el protocolo; las consultas seguras necesitan funcionar
incluso con estado parcial. Definir como tratar `dry-run` Cuando no sea posible
construir un plan confiable y como impedir que un comando nuevo ignore la
clasificación. El módulo aislado `recovery-effects.mjs` clasifica opciones de
CLI como consulta, planificación, mutación, opaco o no soportado; `tools`
Siempre es opaco. No consulta el diario ni bloquea acciones. Antes de la
integración, falta asegurar que la clasificación corresponda a las opciones
ejecutadas, cubrir el sync directo y definir el tratamiento de consultas con
estado parcial. Una clasificación de planificación no comprueba la ausencia de
efectos en archivos temporales. Testar interrupción de proceso por separado de
pérdida de energía y no atribuir durabilidad a una plataforma sólo por existir
`fsync` En Node.

Examinar el modo en el momento de la creación de los temporales: en la
implementación anterior del sync, la escritura ocurría antes de `chmod` y una
máscara permisiva podía exponer temporalmente el contenido. Rever también
mensajes que propagan `error.message` para impedir que el contenido sensible
aparezca en diagnósticos. Comprobar ambos con fixtures sintéticas; el análisis
estático, por sí solo, no prueba exposición en toda máquina. Una fixture con
`umask 000` observó modo `666` la implementación anterior para un destino `600`
en macOS y Linux; no hay prueba de acceso a datos reales. La corrección y la
prueba en `tests/sync-temporary-privacy.test.mjs` tratan este caso para archivos
existentes en POSIX; creación de nuevos archivos, Windows y ACLs requieren
análisis propio. Esto no concluye el requisito más amplio de AC-007.

No seguir enlaces simbólicos fuera del destino. Definir como representar
enlaces, hardlinks, tipos especiales y ancestros inseguros en la copia de
seguridad; rechazar antes de la mutación, con diagnóstico, lo que no puede ser
tratado con seguridad. Un intercambio concurrente durante la captura permanece
fuera de la garantía.

Una investigación en `tests/recovery-plan-coverage.test.mjs` comparó a un
candidato de captura con llamadas Node observadas en fixtures de init, migración
y remoción obsoleta. Sólo `plan.changes` no cubre directorios; el candidato es
una aproximación de prueba, no una implementación de producción. Una raíz
ausente y el plan completo anterior a la escritura del sync directo todavía
exigen solución. Las pruebas cubren solamente el camino de éxito, clientes
Claude y Codex y llamadas síncronas instrumentadas en macOS y Linux. No
verifican acciones y tipos contra cada entrada, llamadas internas del sistema o
subprocesos. Las llamadas de creación de la propia raíz son identificadas, pero
quedan fuera del candidato: su estado anterior precisa ser representado
separadamente. El instalador deriva antes de la aplicación los caminos
candidatos a la poda y usa esas cadenas en la ejecución, verificando cada
directorio cuando lo alcanza. Esta lista es condicional y no captura el estado
anterior, creaciones, migración, temporales o demás efectos; ella no autoriza
remoción ni constituye backup. Él compara los candidatos antes de la poda y
antes de las raíces
Estas verificaciones no hacen el plan entero inmutable ni eliminan alteraciones
entre verificación y operación; una falla tardía todavía usa el rollback
existente. Plans normales usan arrays; planes externos aceptan arrays o Set para
raíces retiradas. Otros iterables se niegan antes de la copia de seguridad
porque pueden no permitir comparaciones repetidas. sync comparte una secuencia
interna de acciones lógicas entre la verificación de caminos y la ejecución.
Cada escritura contiene una cadena lexical de padres candidatos, consultada
nuevamente en el momento de la creación; ella no captura estado o identidad de
los directorios. Temporarios, backups y efectos de rollback quedan fuera de esa
secuencia, que no es un plan completo de recuperación. Una inspección interna en
modo de consulta presenta esa secuencia sin contenido de archivos. Fixtures con
callbacks inertes compararon acciones de creación, actualización y remoción con
llamadas observadas; callbacks, subprocesos, temporales y fallas quedan fuera de
esa cobertura. La inspección incluye caminos y hashes de los archivos observados
o `null` Para ausencias, estos valores sirven
al diagnóstico y pueden quedar desactualizados; otros tipos son señalizados como
no soportados. La inspección no autoriza la operación ni sustituye la copia de
seguridad. El prototipo `tests/fixtures/recovery-capture.mjs` captura los
caminos y sus ancestros en una raíz real existente, compara hashes esperados y
rechazo enlaces, hardlinks compartidos y archivos alterados durante la lectura.
Las pruebas lo comparan al candidato de init, migración, remoción y el plan
lógico de sync. Las pruebas de captura de instalación pasaron en macOS y en
contenedores Linux ARM64; Windows todavía no ha sido verificado. No determina
los efectos completos, no captura ACLs o atributos extendidos y no hace la
consulta atómica; no se distribuye ni se utiliza por la instalación o por sync.
En un cambio de directorio por enlace antes de la apertura, la fixture rechazó
la identidad diferente antes de leer los bytes. La apertura por el camino
todavía puede alcanzar el destino externo. Un cambio anterior al `lstat` El
archivo también puede permitir lectura externa antes de la detección; la prueba
estricta cubre esa laguna. Estos resultados no permiten integrar el componente.
Una inspección experimental separada describe la raíz ausente, los componentes
que faltan y la identidad del ancestro existente, sin crear directorios.
Fixtures en macOS y Linux detectaron una creación concurrente observada; la
inspección no reserva nombres, no es atómica y todavía no está vinculada al
manifiesto de backup. Otra prueba aislada usó `openat` por descriptor en macOS y
Linux ARM64: rechazó enlaces estáticos y en el archivo final y leyó el
directorio originalmente abierto después de un intercambio del ancestro. La
prueba no demuestra contención después de renombrados, protección de metadatos,
distribución o compatibilidad Windows; ningún binario experimental integra el
paquete.

Una variante aislada interrumpe la restauración después de la publicación y pasó
diez escenarios de preservación en macOS. La suíte estricta completa todavía
tuvo tres fallas: dos en la limpieza de temporales y una fixture que exigía
restauración. Sin diario, una segunda instalación continuó sobre el proyecto
parcial. Con un diario experimental y manifiesto sintético, la segunda
instalación fue bloqueada, pero el sync directo todavía ejecutó. La variante no
prepara copia de seguridad verificado, no integra las dos entradas y no autoriza
una release. Una segunda prueba aislada vinculó una copia real de 781 entradas
al inicio del diario y verificó los bytes anteriores de `AGENTS.md`; el intento
siguiente fue bloqueado. Reservar después de la copia de seguridad antigua había
creado una copia de seguridad extra en el intento bloqueado; al anticipar la
reserva, esto no ocurrió en la fixture. La prueba cubre un init en macOS, no
prueba la captura completa, los directorios seguros, sync, interrupciones o
Windows. La variante sigue fuera del producto. En la misma fixture, dos
actualizaciones sin acciones inicialmente produjeron nuevos registros; una
selección experimental dejó la generación intacta y aún rechazó
Una actualización sin acciones cuando ya había espera. La selección no cubre
todos los posibles efectos y exige revisión antes de la integración.

Especificar el orden y la persistencia de backup/manifesto, inicio, mutaciones y
recibo, usando `fsync` Cuando esté disponible y registrando soporte y fallas de
archivos y directorios. Diferenciar interrupción de proceso y pérdida de
energía; no prometer durabilidad no comprobada. Estos detalles, así como la
forma de resolución y la conciliación del contrato histórico, todavía necesitan
ser definidos y verificados.

## Criterios de aceptación

- **AC-001:** Después de fallar en create, update o elimina, incluso publicación
  ambigua, no hay mutación automática de los caminos públicos en el instalador o
  sync.
- **AC-002:** Reemplazados humanos de bytes iguales o diferentes sobreviven en
  los límites de la antigua recuperación; bytes, modo e identidad se conservan
  cuando verificables, y caminos afectados o inciertos son informados.
- **AC-003:** Backup y manifiesto abarcan preexistentes, removibles, estado,
  modos y ausencias antes de la primera mutación pública; falla de preparación
  la impide.
- **AC-004:** Después del inicio registrado, fallo, interrupción o recibo no
  válido deja la espera detectable y bloquea mutaciones en las dos entradas
  hasta la resolución explícita; las consultas y el diagnóstico permanecen
  disponibles.
- **AC-005:** Salidas humanas, JSON y sync directo informan causa, parcialidad,
  caminos, backup y recuperación, sin contenido o secretos, con truncamiento y
  salida de falla.
- **AC-006:** La recuperación no altera estado o migración parcial, directorios,
  índice y configuración Git, ni usa estado parcial como prueba de conclusión.
- **AC-007:** Backups y temporales atienden a la privacidad verificable de la
  plataforma; los fallos de limpieza son informados sin destruir sustitutos
  públicos.
- **AC-008:** Documentación describe revisión manual, proyecto parcial,
  privacidad y límites reales de competencia y durabilidad.
- **AC-009:** Los retornos relevantes y las pruebas en las plataformas
  soportadas pasan; las pruebas históricas se adaptan sin retirar protección al
  contenido humano.

## Plan de verificación

Métodos adicionales a continuación se proponen confirmar antes de la aprobación.
Usar fixtures sintéticas y código de prueba versionado; guardar logs sin
secretos en `.agent-tests/recuperacao-conservadora/<execucao>/`, sin
versionarlos. Cada aceptado exige prueba aprobada; todos están pendientes.

- **AC-001 — pending:** Pruebas rastrean llamadas mutadoras después de falla en
  actualización en el instalador y en sync. En macOS y Linux, el caso de sync
  registró llamadas de remoción, escritura y cambio de modo del apuntamiento;
  falla con el código actual. Ampliar para create, remove y publicación ambigua
  en las dos entradas; el rastreo cubre solamente APIs instrumentadas y no
  prueba ausencia de otras mutaciones. Evidencia propuesta: `operacoes.log`.
- **AC-002 — pending:** Con Node 24+, ejecutar la orden abajo. Seis casos
  adicionales intercambian contenido después de la publicación y antes de la
  recuperación, sin depender de una remoción, y confieren bytes, modo e
  identidad. Ampliar la prueba para otros tipos de cambio y puntos de falla.
  Evidencia propuesta: `concorrencia.log`.

  ```sh
  ADK_STRICT_RECOVERY_TEST=1 node --test tests/concurrent-recovery.test.mjs
  ```

- **AC-003 — pending:** Pruebas propuestas de backup/manifesto, con fallas en
  cada etapa. Usar fixtures con archivos, directorios, estado, ausencias,
  enlaces y tipos especiales; exigir seguridad seguro o rechazo antes de write
  público. Evidencia: `backup.log`.
- **AC-004 — pending:** Pruebas propuestas de subproceso interrumpido y dos
  procesos cooperativos, usando CLI y sync directo. Inicio, migración, recibo
  parcial o ambiguo y bloqueo abandonado mantienen bloqueo; consulta y
  resolución explícita funcionan. Incluir órdenes encaminados a subprocesos y
  garantizar que órdenes nuevos no escapen de la clasificación. Evidencia:
  `pendencia.log`.
- **AC-005 — pending:** Pruebas propuestas de CLI en PT/EN/ES, humana y
  `--json`, y sync directo. Comprobar error original y orientación, sin bytes o
  secretos sintéticos, y límites y códigos correctos. Evidencia:
  `diagnostico.log`. Un incremento local informa caminos de backup conocidos
  como inciertos y orienta revisar copias posiblemente incompletas. Fixtures
  ejercitan error inmutable, causa agrupada, salida JSON y sync directo, incluso
  falla en la etapa privada. Eso no comprueba todos los idiomas, salidas, fallas
  o ausencia general de contenido sensible; el criterio permanece pendiente.
- **AC-006 — pending:** Pruebas de migración y fallo con repositorio Git e
  índice staged. Comparar bytes, modos, directorios, índice y configuración
  observados después de fallo; ninguna restauración automática. Evidencia:
  `estado-git.log`.
- **AC-007 — pending:** Pruebas de modo, ACL o limitación declarada en cada
  plataforma, con fallas de limpieza. Verificar permisos desde la creación,
  inclusive con `umask` permisivo, residuos informados, datos y sustitutos
  preservados y límites de ACL y durabilidad registrados. Evidencia:
  `privacidade.log`.
- **AC-008 — pending:** Revisión de guías y mensajes PT/EN/ES contra los
  escenarios ejecutados. La recuperación manual y los límites corresponden al
  comportamiento comprobado. Evidencia: `documentacao.log`.
- **AC-009 — pending:** Pruebas relevantes, suíte del proyecto y CI en Linux,
  macOS y Windows, con revisión independiente. Regreses y casos de plataforma
  pasan, sin ocultar fallas o eliminar protección humana. Evidencia:
  `regressoes.log`.

### Reproducción antes de la integración

En la ronda anterior, once tests estrictos portátiles fallaron: ocho reproducen
sustituciones de creación y actualización en el instalador y en el sync durante
el rollback, dos prueban la limpieza del temporal después de la publicación
exitosa y un seguimiento de llamadas del instalador después de la falla. Una
prueba posterior también observó llamadas de sync después de falla, en macOS y
Linux. Las pérdidas fueron reproducidas en estos sistemas. La prueba estricta
incluye también una creación fuera del proyecto por intercambio competidor de
ancestrales de la carpeta de copia de seguridad. También falla en macOS y Linux
y exige tratamiento separado de la recuperación. En el helper aislado de copia
de seguridad, otra fixture cambió el directorio de blobs por un enlace y observó
creación fuera de la raíz antes del error. El helper presupone ancestros
confiables y estables y no está conectado al instalador ni a sync; esa
presuposición precisa ser tratada en la integración. Cuatro pruebas de metadatos
nativos fallan en macOS: ACL y atributo extendido en el instalador y
sincronizador. Se ignoran en Linux. Pruebas separadas también detectaron pérdida
de xattr al actualizar `AGENTS.md` el instalador y el catálogo por sync en
contenedores
Linux, Node 24 y tmpfs. La copia de seguridad de `AGENTS.md` También perdió el
atributo; las pruebas no comprueban ACLs u otros sistemas de archivos. Otra
prueba estricta reescribe la copia de seguridad después de su conferencia por
hash y también falla en macOS y Linux; la verificación no es atómica con un
escritor competidor. La reproducción en macOS mostró que una ACL negando
escritura puede ser contornada por `rename`: el instalador y sync han cambiado
el archivo y han perdido ACL, aunque una apertura para escritura falló. A flag
`uchg` bloqueó la sustitución del objetivo en las fixtures, pero no garantiza
que no haya otras alteraciones parciales. Un intento experimental de copiar por
descriptores preservó algunos metadados, pero permitió eludir ACL y no protegió
la publicación contra cambio de ancestro; no es una corrección integrada o
validada. Seis regressiones adicionales, en `init`, `update` con legado
sintético y `sync`, requieren denegación relacionada con el objetivo protegido
por ACL o `uchg` y comparan el estado observado al final. En el diagnóstico
inicial fallaban en modo estricto y eran TODO en el modo estándar. Las fixtures
actuales ejecutan en macOS. El snapshot
excluido `.agent-tests` y no detecta cambios transitorios revertidas. Una copia
experimental abrió sin guardar archivos existentes previstos para la
actualización antes de las mutaciones. Las seis fixtures de ACL e `uchg` Han
pasado en macOS, pero tres pruebas históricas han dejado de alcanzar el rollback
de archivos `0444`, tanto en macOS como en Linux no privilegiado. El experimento
no verifica remociones, no preserva ACLs o atributos y no cierra carreras; no
fue integrado. La política para archivos solamente lectura y la cobertura de las
pruebas de rollback necesitan ser reconciliadas sin eliminar las pruebas
existentes. En otra fixture macOS, una ACL que negaba apenas append permitió la
sondaje y la actualización experimental, pero dejó de existir en el archivo
resultante. Esto no comprueba el comportamiento de otras ACLs o filesystems. Dos
regressiones en el producto actual también reproduciron esa pérdida en el
instalador y en sync; el gate nativo exige preservación o rechazo seguro antes
de aceptar una release. Los logs del diagnóstico inicial registran la
reproducción. El gate actual ejecuta las fixtures aplicables y exige las pruebas
nativas antes de la release.
Una revisión estática independiente de tramos y de las dos specs recomendó
añadir control negativo al oráculo, probar copias de seguridad y registros
incompletos y conciliar explícitamente el contrato histórico. Estas
recomendaciones exigen implementación y prueba; la revisión no ejecutó el código
ni aprobó la entrega.

## Impacto en la documentación

Revisar [instalación](../../guides/installation.md), [solución de
problemas](../../guides/troubleshooting.md), [CLI](../../guides/cli.md), [sync
directo](../../kit/scripts/sincronizar-agentes/README.md), mensajes
traducidos y otros documentos afectados por el contrato final. Registrar las
decisiones por archivo en la revisión de la entrega; actualizar índices y
roadmap conforme al flujo del proyecto.

## Dependencias de otras specs

- [v0.0.8](../v0.0.8/SPEC.md): contrato histórico aprobado exige restauración
  automática y AC-002 sin grabaciones parciales, incompatibles con esta
  propuesta.
- [Carpeta de estado](../state-directory/SPEC.md), [sincronización
  segura](../safe-synchronization/SPEC.md) e [descubrimiento y
  preservación](../discovery-preservation/SPEC.md): preservación, migración y
  reconciliación también deben ser verificadas en este cambio.

### Reconciliación propuesta

En la versión futura que implementar y comprobar esta spec, su contrato de falla
reemplazará solamente la restauración automática y la ausencia de grabaciones
propias parciales exigidas por la v0.0.8. La spec histórica permanece registro
del contrato de aquella versión; esta propuesta todavía no cambia el
comportamiento entregado.

Las demás garantías continúan: preservar contenido humano, índice y
configuración Git, `.gitignore` y protección de colisiones, incluso con
`--force`; preservar modos y metadados para operaciones efectivamente
soportadas. Pruebas históricas que exigen rollback necesitan nuevos resultados
esperados y pruebas de preservación y diagnóstico, sin retirar la cobertura de
contenido humano.

Después de falla, el contenido humano observado sigue protegido, pero los
archivos propios de estado y migración pueden estar parciales. No los
interpretar como conclusión. En operaciones exitosas, la poda sigue limitada a
salidas de propiedad comprobada y la reconciliación de estado continúa
obligatoria. Después de falla, no ejecutar poda ni restauración automática de
caminos públicos; la reconciliación permanece pendiente de revisión y resolución
explícita.

Antes de una transición, orientar la interrupción de otros escritores, incluso
versiones antiguas y procesos suspendidos, y la revisión del estado. La
implementación debe bloquear la mutación cuando no pueda comprobar las
condiciones que requiere para una transición segura; no debe alegar detección
universal de escritores antiguos ni que un registro, aisladamente, impida la
reanudación de un proceso suspendido. El protocolo y la forma de resolución
todavía necesitan ser definidos y probados.

## Referencias y aprobación

[PRD](../../product/prd.md), [UX/UI](../../product/ux-ui.md) e
[diseño](../../product/design.md) figuran como aprobados;
[roadmap](../../product/roadmap.md) registra la recuperación como pendiente y
separa la competencia durante la aplicación. El estado local en
`.pbai4devs/state/configuracao/ESTADO.md` registra preparación y configuración
técnica local terminadas, con fallas de producto aún abiertas. Después de
corregir el camino de las specs, la inspección documental local terminó sin
avisos y con `scan.complete: true`; el inventario no sustituye la lectura ni la
aprobación.

Esta spec está en borrador: revisión técnica y decisiones permanecen pendientes.
La autorización general ya concedida por el usuario no sustituye la prueba de
las decisiones ni altera el contrato histórico por sí solo.

[reading-pt]: ../../../specs/recuperacao-conservadora/SPEC.md
[reading-en]: ../../../en/specs/recuperacao-conservadora/SPEC.md
[reading-es]: SPEC.md
