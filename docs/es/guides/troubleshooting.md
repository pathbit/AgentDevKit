---
description: "Diagnóstico, conflictos, copias de seguridad y recuperación de AgentDevKit."
language: es
---

# Solución de problemas

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Comience por la orden, el error y la carpeta del proyecto. Los ejemplos de
diagnóstico abajo usan el npm público. En las demás secciones, reemplace.
`agentdevkit` por `npx @pathbit/agentdevkit`. Vea a [CLI][cli] para usar
checkout local y la [instalación](installation.md) para GitHub Packages.

## Diagnóstico rápido

```console
npx @pathbit/agentdevkit --version
npx @pathbit/agentdevkit doctor --target "./meu projeto" --json
npx @pathbit/agentdevkit sync --check --target "./meu projeto" --json
```

`doctor` comprueba la instalación del kit. Para las herramientas, use
`agentdevkit plugins check <id>` o `agentdevkit tools check <nome>`; para la
aplicación, use las pruebas del propio proyecto. Antes de compartir una salida,
elimine datos privados y caminos personales.

Si `doctor` Indicar `client-selection-retired`, siga a [migración de
clientes][retired-clients] Para elegir un destino y revisar el plan de
actualización.

En OpenCode 2, una consulta inmediata aislada de `skill.list` Puede volver una
lista vacía incluso con los archivos presentes. Consulte de nuevo en el servidor
ya inicializado y compare las ubicaciones de las skills con `.opencode/skills/`.
Una lista vacía aislada no comprueba que los archivos estén ausentes. El modo
`--standalone` usa un servidor privado para la ejecución; vea [documentación del
cliente][opencode-cli].

Si faltan recursos, consulte la selección con `agentdevkit agents`. Para incluir
un cliente, simule `agentdevkit agents add cursor --dry-run` con el ID deseado.
Después de revisar, ejecute la misma orden sin `--dry-run`La selección `none`
mantiene los recursos compartidos y `AGENTS.md`. Reabra la sesión del cliente si
requiere recargar las skills. Carpetas de clientes pueden permanecer por
contener archivos propios o recursos usados por otro cliente. [Selección de
clientes][clients]

| Sintoma o código | Siguiente acción |
| --- | --- |
| `node` o `npx` no encontrado | Siga [sin Node/npm][runtime]. |
| `E401` o `E403` el registry | En npm, vea el destino; en GitHub, consulte [token e login][github-install]. |
| `E404` al descargar el paquete | Echa un vistazo a registry, versión y permiso. |
| `E_ARGS` | Ver mando y comillas con `agentdevkit --help`. |
| `E_MISSING` | Confirme `--target`; inicialice el proyecto correcto. |
| `E_CLIENTS_RETIRED` | Simule `update --agents <id> --dry-run`. |
| `E_UPGRADE` | Simule `update --dry-run` y vea los scripts locales. |
| `E_TARGET`, `E_SYMLINK` | Use la carpeta real fuera de los directorios reservados. |
| `E_CONFLICT` o lista `conflicts` | Revise el plan y los archivos afectados. |
| `E_STATE`, `E_BLOCK`, `E_TEMPLATE` | Restaure el archivo; no invente hashes. |
| `E_MANAGED_BLOCK` | Revise marcadores o formato; preserve sus instrucciones. |
| `E_CHANGED` | Un archivo ha cambiado durante la operación; gestiona otro plan. |
| `E_RECOVERY_PENDING` | Consulte con `agentdevkit recovery --json`. |
| `E_RECOVERY_STORE` | Preserve el diario y vea el lugar y los permisos. |
| `E_RECOVERY_STATE` | Revise la generación y el ID de la espera actual. |
| `plan-inspection-failed` | Revise el fallo de la planificación. |
| `E_MIGRATION_REVIEW` | Preserve el estado legado y revise la reactivación. |
| `E_PLUGIN` | Revise el ID y el origen con `plugins info <id>`. |

En macOS, si `--dry-run --json` apuntar `xattr-present` o `xattr-unverified`,
vea la ruta indicada y léste los atributos con `xattr "<caminho>"`.

En macOS, `/tmp` e `/var/folders` se aceptan cuando sean los aliases de sistema
esperados. Los destinos que atraviesan enlaces humanos siguen rechazados,
incluso cuando son apuntados por `TMPDIR`, `TEMP` o `TMP`.

## Retomar después de una interrupción

Consulte el diario del proyecto y vea la generación, el ID, la fase y el camino
esperado de la copia de seguridad. `claim` Puede existir antes de que la copia
de seguridad esté completa.

```console
agentdevkit recovery --target "./meu projeto" --json
```

Mientras el diario está pendiente o no válido, el kit bloquea la instalación,
actualización, sincronización, cambio de configuración y ejecución de
herramientas. `doctor` informa la limitación del diagnóstico. `next`, `agents` e
`lang` Pueden consultar la información legible. Uno `--dry-run` o `sync --check`
inconclusivo retorna código de salida 1 y `planStatus: "inconclusive"`.

1. Pare los procesos que escriben en el proyecto. Conserve una copia o
   checkpoint de los archivos actuales, incluso estado y archivos ya preparados
   en Git.
2. Compara el manifiesto y las copias disponibles con las creaciones,
   remociones, archivos y migraciones observados en el proyecto. Decida qué
   cambios conservar y compruebe los permisos relevantes.
3. Consulte el diario otra vez. Si la operación está pendiente y la revisión
   está terminada, reemplace los marcadores por la generación y el ID informados
   en esa consulta y registre la decisión.

   ```text
   agentdevkit recovery resolve <geração> <id> --target "./meu projeto" --json
   ```

4. Ejecute `doctor` y ve un nuevo plan con `--dry-run` Antes de aplicar cambios.
   La resolución registra la decisión en el diario y preserva archivos públicos
   y copias de seguridad. Un diario no válido requiere revisión de sus
   evidencias y bloquea esta resolución.

El campo `recovery.backup` indica la carpeta de snapshot de la operación
pendiente. El archivo `manifest.json` relaciona caminos, acciones planificadas,
tipos y modos observados a las copias numeradas en `blobs/`. Ausencias
planificadas también constan del manifiesto. El camino informado por el diario
puede apuntar a una carpeta aún ausente, por lo que le confiere el material
disponible antes de comparar.

En la carpeta de la operación, al lado de `snapshot/` e `stage/`, `root.json`
identifica el ancestro existente y los componentes de la raíz que faltaban al
principio. Cuando el proyecto ya existe en el primer uso, el kit guarda el
diario en `.agent-tests/agentdevkit/recovery/`. Para un proyecto aún ausente,
crea la reserva en el ancestro existente más próximo y continúa consultandola
allí después de la creación del proyecto. Esta carpeta externa se llama
`.agentdevkit-recovery-<hash>`. Si el ancestro pertenece a otro repositorio Git,
compruebe las reglas de ignorar este repositorio antes de preparar un commit. Su
copia de seguridad puede contener el contenido anterior de archivos del
proyecto.

Si la grabación del recibo final vuelve `E_RECOVERY_UNCERTAIN`, consulte
`recovery --json`. Un recibo `done` íntegro puede ser visible cuando la
sincronización posterior del directorio falló. En este caso, la siguiente
reserva confiere los bytes del recibo y solicita de nuevo la sincronización
disponible en la plataforma. En Windows, la confirmación abarca el archivo. La
permanencia de la entrada del directorio después de la pérdida de energía sigue
sin comprobación.

El diario admite hasta 4.000 registros y 1 MiB de contenido de registros.
`E_RECOVERY_LIMIT` indica que el espacio restante no comporta una operación
completa. Preserve el historial y las copias de seguridad para la revisión. El
kit todavía requiere un procedimiento de mantenimiento para reanudar grabaciones
en ese límite.

## Conflictos y copias de seguridad

Simule antes de reemplazar una enmienda propia:

```console
agentdevkit update --target "./meu projeto" --dry-run --json
```

Compara cada `conflicts` con lo que desea mantener. Edite el origen en
`.pbai4devs/`, no los apuntes generados, cuando esté personalizando un recurso.
Use `sync` para actualizar sus derivaciones. `update` reaplica los recursos del
paquete invocado y puede resolver con esta personalización.

El campo `preserved` Puede detallar el motivo observado. Por ejemplo,
`claude-metadata-unverified` pide revisión de la referencia y sus metadatos; no
comprueba propiedad ni que la regla esté activa. Una referencia idéntica
indicada por `existing-reference-satisfied` Sigue sin adopción por el kit.

Al desmarcar Claude, algunas reglas son preservadas. La reactivación puede
indicar `claude-metadata-unverified` Para estos archivos. Consultelos en el plan
con `agents add claude --dry-run --json` y compare con las fuentes en el hub.
[Escopo de reglas Claude](resources.md#sincronizar-y-conferir)

Para reglas legadas en `.claude/rules/`, compare el contenido y el alcance de
activación de la referencia preservada con el origen especificado. Compruebe
también si el archivo tiene contenido preparado en el índice antes de decidir
cualquier cambio:

```console
git ls-files --stage -- ".claude/rules/caminho/RULE.md"
git --no-optional-locks diff --cached -- ".claude/rules/caminho/RULE.md"
git --no-optional-locks diff -- ".claude/rules/caminho/RULE.md"
```

Reemplaza el camino por el conflicto informado. Las consultas desactivan la
actualización opcional del índice por Git; una regla preservada puede continuar
activa globalmente. No elimine ni edite la referencia basándose únicamente en el
hash: revise su contenido, metadatos e impacto con los responsables del
proyecto. Después de la decisión, ejecute de nuevo el `update --dry-run --json`
y vea el plan y el índice.

`--force` no sustituye archivos propios ni bloques modificados. Resolva el
conflicto preservando el contenido que desea mantener y revise el plan. El
instalador también puede crear una copia de los archivos preexistentes con sus
caminos originales. Cuando presente en la respuesta de éxito, el campo `backup`
informa la ubicación de esta copia relativa al proyecto. Por ejemplo,

```text
.agent-tests/agentdevkit/backups/<identificador>/
```

El diseño interno repite los caminos originales. Para recuperar:

1. Pare las ediciones y haga una copia del proyecto o un checkpoint en Git.
2. Compara los archivos de copia de seguridad con los actuales en el editor.
3. Solo restaure los archivos deseados, preservando ediciones posteriores;
   comprueba también los permisos y ACLs aplicables.
4. Ejecute `doctor` y revise el nuevo plan antes de aplicar cualquier
   corrección.

No hay orden `undo`. Copiar la copia completa de seguridad no elimina archivos
que la operación creó; un rollback completo requiere conferir el plan y el diff
de Git. Después de fallo, los caminos informados para la revisión pueden incluir
una copia parcial, un camino ausente o datos de otro origen. Su presencia no
comprueba que la copia está completa o íntegra; compare antes de restaurar. Los
backups son locales y pueden contener datos privados. Pueden aparecer en Git,
conforme los ignores existentes; o compruebe su visibilidad antes de usar `git
add`. No POSIX, el instalador crea cada raíz de copia de seguridad con acceso
restringido y preserva el modo de los archivos copiados. ACLs, acceso
privilegiado, intercambio de carpetas y Windows requieren verificación propia;
no asuma secreto sólo por los bits POSIX. Si un sistema de archivos POSIX
informar a los permisos amplios para la nueva carpeta, la operación falla con
`E_BACKUP` antes de la copia. Backups no sustituyen el control de versión.

Las actualizaciones usan la copia nativa de la plataforma para conservar los
metadatos compatibles. Si la copia falla, se interrumpe la publicación. En
macOS, el kit conserva las ACL legibles y los atributos extendidos. Las ACL
que deniegan la escritura, las marcas de protección o las comprobaciones no
concluyentes bloquean el cambio. Se comprueban las ACL de archivos en sistemas
de archivos compatibles.

En macOS, eliminar un archivo con atributos extendidos puede devolver
`E_PROTECTED_METADATA` con `metadataReason: xattr-present`. En ARM se
reprodujo al actualizar de 0.0.36 a 0.0.37 y al ejecutar `agents remove`
tras instalar 0.0.37 desde cero. Los archivos generados tenían el atributo
`com.apple.provenance`. Ejecuta `xattr "<ruta>"` sobre el archivo del error
para listar sus atributos. Conserva los archivos y los atributos al revisar.

En Linux, el kit pide a `cp` que conserve los atributos extendidos y los
compara cuando `getfattr` está disponible. Sin esa herramienta, la copia puede
continuar con un aviso de que la conservación no se pudo comprobar. Mantén
una copia verificada de los datos importantes antes de recuperar archivos.

Si planificación, aplicación o herramienta falla después de un posible cambio,
interrumpa otras operaciones y preserve archivos y copias de seguridad hasta que
revise el estado. Consulte `recovery` Para saber si una operación reservó el
diario. La espera persiste entre llamadas de la CLI. Falsos de planificación o
de herramientas también pueden exigir revisión cuando no hubo reserva.

Si la planificación encuentra un camino incierto en la etapa temporal, el kit
puede mantener e informar la carpeta entera en el directorio temporal del
sistema. Puede contener copias de archivos del proyecto. Consulte el camino y su
contenido antes de eliminarla; un camino informado como incierto puede ya no
existir. El secreto depende de los permisos y ACLs del ambiente. Una falla en la
aplicación o en el sync, antes o después del intento de publicar, puede dejar un
temporal en la etapa privada de la operación. Consulte el camino informado y su
contenido antes de eliminarlo. La sustitución exige que la etapa y el destino
permitan la misma operación de publicación. Si el sistema rechaza la sustitución
entre montajes con `EXDEV`, preserve la copia de seguridad y consulte el diario
antes de volver a intentarlo.

Em NTFS, la actualización abre el archivo original con acceso exclusivo,
confiere las identidades y los hashes del original y de la propuesta y graba en
el flujo principal. El archivo mantiene su identidad, DACL y flujos
alternativos. Una interrupción durante la grabación puede dejar contenido
parcial. Consulte el diario y compare el destino con la copia de seguridad antes
de reanudar el trabajo.

Después de un fallo, la recuperación intenta preservar e informar caminos cuya
identidad no pudo ser comprobada. El número de identidades acompañadas es
limitado; bajo presión de descriptores, otras alteraciones también pueden ser
preservadas. Con un límite muy bajo de descriptores, como 32, la operación puede
fallar: revisar los caminos informados y aumentar el límite antes de intentar
nuevo. La verificación y la remoción o restauración de un archivo son
operaciones separadas: una edición concurrente exactamente en ese intervalo
todavía puede perderse. Evite editar los mismos caminos durante la instalación o
sincronización y revise el resultado antes de retomar el trabajo.

## Estado o apuntamientos inconsistentes

Si la instalación todavía usa `.pbai4devs/estado`, ejecute `agentdevkit update`
Para migrar los datos y actualizar los scripts juntos. Si `estado` e `state`
coexisten, compare y preserve las dos carpetas antes de resolver el conflicto;
el kit no elige ni sobrescribe una de ellas automáticamente. Si la configuración
apunta a caminos dentro de la carpeta antigua, actualice estos caminos
`.pbai4devs/state` Antes de volver a intentarlo. El kit no reescribe las
decisiones del proyecto.

`missing`, `modified` e `outdated` en `issues` indican un archivo ausente, un
contenido alterado o una derivación pendiente. Use `sync --check` para
inspeccionar; si los cambios de origen son intencionales, ejecute `sync` y deje
de nuevo.

`removed-file-unverified` el `doctor` o `sync --check` indica que un registro de
eliminación en `derived.json` no tiene entrada en el estado instalado. Si la
entrada existe con hash diferente, el estado no es válido y la CLI retornado
`E_STATE`. El sincronizador directo también avisa. Si la planificación falla
después de la lectura, el `sync --check` indica que la observación fue anterior
a la falla; errores antes de la lectura todavía pueden ocultarla. Esto puede ser
histórico legítimo. Preserve el estado y el archivo especificado y revise su
origen antes de actualizar: el kit conserva registros desconocidos y bloquea
alteraciones en el blanco identificado por la misma grafía, incluso con
`--force`. La comparación de aliases y la reconciliación automática de la
migración todavía no están completas. No ajustes hashes para ocultar el aviso.

`E_MIGRATION_REVIEW` Puede interrumpir la planificación cuando un registro de
remoción corresponde al estado instalado, el objetivo está ausente y su
recreación está planificado durante la migración. Preserve el estado y el
objetivo, si existe, y revise ambos antes de continuar; no apague el registro
para eludir el error. La migración automática de ese caso todavía no está
disponible.

Si `.pbai4devs/state/agentdevkit.json` no está válido, recupere una copia de
seguridad local coherente con los archivos correspondientes. El estado personal
no se vesionado. No invente hashes ni apague el estado para ocultar conflictos;
pida al agente que compara las fuentes y plantee la reparación con
`init`/`sync`.

Las entradas humanas reciben un bloque delimitado del kit. Edite fuera de los
marcadores `BEGIN AGENTDEVKIT` e `END AGENTDEVKIT`; no cambie hashes del estado.
Un bloque modificado necesita revisión, incluso con `--force`. Si se retira el
recurso, sólo se elimina su bloque comprobado, preservando el texto humano.
Links humanos preexistentes en las entradas y en los clientes se mantienen sin
cruzarlos. Consulte `preserved` el JSON Para ver las rutas mantenidas bajo
control del proyecto, incluso cuando complementadas. No transforme el hub o
caminos ya gestionados en enlaces. Destinos dentro de `.git`, `node_modules` o
`.pbai4devs` Se niegan, incluso con variaciones de maiúsculas/minúsculas.

No script `sincronizar-agentes`, `--force` reparación conflictos administrados
con copia de seguridad. A CLI bloquea conflictos de propiedad incluso con
`--force`. Recursos nativos humanos y enlaces preservados continúan intactos.
Para mantener la instalación y su selección de clientes, prefiera la CLI.

## Descargar, plataforma o herramienta fallando

Revise el destino estándar y un posible mapeo del alcance:

```console
npm config get registry
npm config get @pathbit:registry
```

Un valor de `@pathbit:registry` prevalece sobre `npx --registry=...`. Si este
mapeo fue creado solo para una instalación antigua, retire **Sólo esa clave**
del archivo que la definió. En el archivo de usuario:

```console
npm config delete @pathbit:registry --location=user
```

Si la clave está en `.npmrc` del proyecto o en variables de entorno, revise en
ese lugar; el comando arriba no cambia esas configuraciones. Preserve mapeos
exigidos por otras dependencias y nunca apague el `.npmrc` Sin mapeo del
alcance, elija el registry por ejecución en [guía de
instalación](installation.md#instalar).

El npm público no requiere iniciar sesión para descargar el kit. En GitHub
Packages, use un token clásico con `read:packages` e o [Inicio
específico][github-install]. Publicar versiones requiere permisos adicionales;
login en GitHub CLI (`gh`) no configura automáticamente la autenticación del
npm.

Echa un vistazo al acceso a GitHub, al registro npm y a `nodejs.org`, según la
etapa. Mantenga la verificación de certificados y hashes; resuelva proxy, red o
dependencias del SO y repita. No troque por un binario de otra arquitectura. El
launcher acepta Node.js 18+ y prepara Node 24+ para el núcleo. Sin Node/npm, el
agente necesita instalar runtime por el mecanismo del SO antes de usar npx.

`tools setup` reutiliza instalaciones saludables y verifica las compatibles. No
aplicable en una selección general no significa “instalado”. Esta preparación
tampoco baja navegadores, otorga permisos de escritorio o inicia aplicaciones.
Consulte [herramientas][tools] para requisitos adicionales de la tarea.

Un lock indica instalación en marcha o interrumpida. Espere la operación activa.
Si el proceso ha terminado, intente `agentdevkit tools unlock <nome>`; solo un
lock local con PID Está demostradomente muerto. No apague locks activos o
indeterminados para forzar dos instalaciones al mismo tiempo.

## Sesiones, loops o calculadora abriendo

AgentDevKit no agenda sesiones, abre la calculadora ni inicia loops por cuenta
propia. Una ejecución explícita de herramienta puede abrir la aplicación
solicitada. Si algo continúa ejecutando, identifique la sesión, tarea del
editor, extensión o proceso que lo inició y detenga por la interfaz responsable.
Borrar sólo los logs no interrumpe un proceso que continúa grabando.

Carpetas de clientes y salidas como `.opencode/opencode-loop`, `.playwright*`,
cachés e informes no deben verse. Compruebe con `git status` y `git check-ignore
-v
<caminho>`. Si un archivo ya estaba rastreado, añadir un ignore no el
retira automáticamente Git; revise la eliminación del índice sin borrar datos.

O `.gitignore` del hub no controla carpetas hermanas. Revise la visibilidad con
`git check-ignore -v` y ajuste las reglas del proyecto cuando sea necesario.
`shared-ignore-legacy` indica que todavía hay una marca antigua en
`info/exclude`. Se `update --dry-run --json` planificar su migración, ejecutar
`update` para retirar la marca y las duplicatas comprobadas preservando las
reglas efectivas. El resultado informa donde está la copia original. Si el
bloque es compartido o su contenido está incierto, compruebe las reglas en cada
trabajo antes de decidir cualquier ajuste. Avisos `artifact-coverage-unverified`
e `artifact-unprotected` son informativos: indican cobertura no comprobada o
artefactos visibles, pero no bloquean el check aisladamente. Compruebelos antes
de versionar archivos locales.

Para investigar sin cambiar las reglas, consulte los caminos y, en cada
worktree, un archivo elegido para verificar:

```bash
git -C "<projeto>" rev-parse --git-path info/exclude
git -C "<projeto>" worktree list --porcelain
git -C "<worktree>" check-ignore -v --no-index -- "<caminho>"
```

Una regla iniciada por `!` Es una excepción. Sin correspondencia, `check-ignore`
retorna 1; errores operativos deben ser investigados por separado. La opción
`--no-index` consulta reglas incluso para archivos rastreados y no informa si el
archivo está en el índice. Revise el contenido y los efectos antes de decidir
cualquier cambio manual.

Si aparece `E_GIT_ENV`, hay una variable de entorno que redirecciona el
repositorio o el índice Git. Revise `GIT_DIR`, `GIT_WORK_TREE`, `GIT_COMMON_DIR`
e `GIT_INDEX_FILE` En la sesión y ejecute de nuevo sin redirección. El kit
interrumpe la operación para proteger los archivos y el índice seleccionado.

Si sync no puede consultar a un Git ancestral, vea la raíz que Git descubre con
`git -C "<projeto>" rev-parse --show-toplevel`. Un montaje en otro sistema de
archivos puede interrumpir este descubrimiento; confirme que el repositorio y el
índice pertenecen al proyecto antes de cambiar el entorno Git.

En la versión en desarrollo, `E_NESTED_GIT` indica que un camino a cambiar o el
área de copia de seguridad atraviesa otro repositorio Git. Un submódulo todavía
no inicializado también puede bloquear la operación por el índice externo.
Consulte el proyecto, el submódulo y sus índices antes de elegir otro destino;
un submódulo independiente fuera de los caminos afectados no necesita ser
eliminado. sync elige el nombre completo de la copia de seguridad antes de
verificar el índice, de modo que un submódulo hermano no relacionado puede
coexistir con él. El instalador todavía puede rechazar submódulos dentro de la
carpeta de copia de seguridad por precaución. `--check` no reserva el nombre que
se usará en otra ejecución. Si la frontera surge durante la operación, puede
parar parcialmente aplicada y preservar los caminos informados sin revertir las
alteraciones ya hechas. Esas verificaciones no son atómicas con alteraciones
competidores. Un índice con nombres que no pueden ser decodificados como UTF-8
también puede impedir la operación por precaución, incluso cuando el camino
problemático no está relacionado. En una fixture, un proceso con acceso a la
carpeta de copia de seguridad cambió un directorio
Ancestro por un enlace durante sync y causó la creación de un archivo fuera del
proyecto. Evite escritores competidores en la carpeta de copia de seguridad;
`0700` no impide otro proceso del mismo usuario. La corrección completa todavía
está pendiente. Una edición concurrente después de la verificación del contenido
también puede hacer que sync informe como válido una copia de seguridad
alterada; lo prevee antes de la recuperación.

En Windows, nombres cortos NTFS pueden apuntar a nombres diferentes. Cuando la
identidad de caminos preparados no se puede verificar, el kit puede indicar
`E_STAGED` Incluso para archivos aparentemente independientes. Revise el índice
antes de intentar nuevamente. La publicación de los registros del diario usa
hardlinks en el mismo volumen. Si el volumen no los soporta, la operación falla
y los archivos existentes se conservan. Sistemas de archivos remotos pueden
tener aliases propios que esa verificación no puede identificar en todos los
casos.

Para pedir ayuda, incluya SO/arquitetura, versiones de Node/npm/AgentDevKit,
orden ejecutado, código de salida y tramo relevante del JSON, sin secretos.
Utilice las [issues del proyecto][issues] o vuelva a [índice](../README.md).

[cli]: cli.md
[clients]: installation.md#actualizar-y-elegir-agentes
[retired-clients]: ../kit/COMPATIBILIDADE.md#migrar-carpetas-legadas
[runtime]: installation.md#requisitos-previos
[tools]: ../kit/scripts/preparar-ferramentas/README.md
[issues]: https://github.com/pathbit/AgentDevKit/issues
[github-install]: installation.md#github-packages
[opencode-cli]: https://opencode.ai/docs/cli/

[reading-pt]: ../../guides/troubleshooting.md
[reading-en]: ../../en/guides/troubleshooting.md
[reading-es]: troubleshooting.md
