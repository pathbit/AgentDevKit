---
description: "Prueba del paquete, instalación y distribución de AgentDevKit."
language: es
---

# Prueba del paquete

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Ejecute `npm test` en la raíz. Código de pruebas y fixtures son versionados; los
generadores de ejemplos usan, por estándar, directorios temporales fuera de Git.
Una salida local explícita exige ignorar comprobado. Otros clones y resultados
quedan en `tmp/`, `.agent-tests/` o directorio temporal, sin subir a Git. `npm
run test:distribution` Prueba el paquete real, incluyendo instalación,
actualización y preservación de archivos. Estas pruebas no se copian para los
proyectos atendidos.

Para ejecutar la distribución con el tarball candidato, introduzca el camino
absoluto en el ambiente. Ejemplo en shell POSIX:

```console
AGENTDEVKIT_TARBALL=/caminho/absoluto/agentdevkit-0.0.35.tgz npm run test:distribution
```

El modo con tarball informado registra los hashes antes y después en
`.agent-tests/release-artifact-verification.json`. `npm run verify` Pasa
automáticamente el tarball que acaba de construir.

`runtime-minimum.test.mjs` instala un paquete local fuera de línea en directorio
temporal y verifica la preservación del índice, configuración, `info/exclude`,
`HEAD` y de una skill propia. Al ejecutarlo con Node 18, informe en
`ADK_TEST_NODE24` el camino absoluto de un Node 24 con npm: la prueba prepara
una caché aislada y confirma que el bootstrap lo selecciona. Antes de eso,
confirma la negativa sin caché y sin permiso para descargar. Esto no prueba
descarga de runtime ni comprueba ejecución nativa de agentes.

Las pruebas de referencias derivadas verifican el ciclo entre CLI y sync
directo, notas humanas, registros divergentes y alteraciones después de la
planificación. Los snapshots cubren los caminos listados en las fixtures, no
todos los metadatos Git.

`removed-file-protection.test.mjs`, `removed-overlay.test.mjs` e
`migration-tombstone.test.mjs` verifican registros de remoción, bloques
coexistentes y la negativa conservadora de migración, preservando archivos
humanos y el índice en las fixtures observadas. No comprueban todos los aliases
o metadados.

En la validación de una entrega, utilice el paquete generado por el checkout en
análisis. Gestionar el tarball de release una vez y reprobarlo para las pruebas
de instalación y actualización. Para actualizar a partir del npm, informe la
última versión publicada.

```console
npm run build
version=$(node -p 'require("./package.json").version')
archive=".agent-tests/release/$version/agentdevkit-$version.tgz"
published=$(npm view @pathbit/agentdevkit@latest version --registry=https://registry.npmjs.org)
npm run test:upgrade -- --from-version "$published" --to-tarball "$archive"
```

El test confiere la integridad de la base publicada, la versión y el hash del
candidato. Exercita Claude, Codex, Copilot, Antigravity, OpenCode y Cursor en
proyectos sintéticos y compara el Git y el contenido humano antes y después de
la actualización. Una fixture Codex prepara una referencia CRLF con contenido
staged. Para volver a instalar o actualizar desde un archivo local, use
`--from-tarball caminho/pacote.tgz`. Sin `--to-tarball`, el test empacota el
checkout. El resultado en `tmp/upgrade-packages/` registra el origen, los hashes
de los dos paquetes y lo que fue verificado.

`sync-skill-collision.test.mjs` verifica el plan y el sync delante de una skill
humana con contenidos staged y unstaged diferentes. La fixture confiere el
bloque añadido, las fuentes y los archivos Git observados; no ejecuta un agente
o comprueba ACLs y atributos extendidos. `scoped-rule-clients.test.mjs` verifica
los apuntamientos de una regla con glob para Claude y Copilot con Git staged; no
comprueba la activación en los clientes.

Para verificar la jubilación de Gemini CLI y la actualización de proyectos que
aún tienen su selección salva:

```console
node --test tests/retired-client-migration.test.mjs
```

Suíte verifica la lista de clientes, el plan de actualización, los archivos
humanos, el índice Git y la retirada de lo que tiene propiedad comprobada. El
grupo de TOML legado continúa cubriendo la lectura de órdenes y validación de
los bloques administrados usados en instalaciones anteriores.

Para probar el paquete generado a partir del checkout actual en un Linux
aislado:

```console
node tests/compose-package-smoke.mjs
```

Requiere Node 24+, npm, Git, Docker Compose y la imagen `node:24-bookworm` ya
disponible localmente. La prueba genera el paquete offline, ejecuta seis
operaciones en un proyecto sintético con archivos staged y unstaged y confiere
su preservación. El contenedor no usa red y monta el paquete solamente para
lectura. Resultados y paquete se encuentran en directorio temporal fuera de Git;
`--output` permite elegir otro directorio temporal existente. La prueba no
ejecuta flujos de agentes, recuperación concurrente o Windows y no prueba un
paquete publicado.

`node tests/dockerignore-context.mjs` utiliza Docker Buildx y archivos
sintéticos para verificar el filtro real de `.dockerignore` com `FROM scratch` e
`--pull=false`. El builder depende de la configuración Docker local. El informe
queda fuera de Git. Esta prueba no verifica montajes bind ni todos los caminos
posibles; el contexto de build no es usado por la Compose local de la CLI.
`makefile-guards.test.mjs` confiere la preservación de `node_modules`,
artefactos y destinos simbólicos. Exige GNU Make y shell POSIX; en Windows se
ignora.

`resource-coverage.test.mjs` confiere las referencias generadas para los
clientes y las combinaciones de selección. La cobertura estructural no prueba
que cada recurso fue ejecutado en todos los clientes; valide también
descubrimiento y uso real.

`node --test tests/claude-rule-scope.test.mjs` verifica la planificación de
alcance Claude, incluyendo metadados ambiguos y colisiones humanas. El sync usa
ese planificador. El parser acepta un subconjunto de YAML y no comprueba
equivalencia de globs con otros clientes. Las pruebas de integración ejecutan
normalmente:

```console
node --test tests/claude-rule-scope-integration.test.mjs
```

`claude-legacy-exact.test.mjs` e `claude-legacy-exact-flow.test.mjs` verifican
el reconocimiento estricto y la preservación de referencias legadas, inclusive
alteraciones staged y con `--force`. La alerta permanece: no comprueban la
activación de la regla en el cliente ni preservación de todos los metadatos del
archivo.

Para conferir la instalación sin dependencias de la aplicación, ejecute:

```console
node --test tests/project-portability.mjs
```

El ensayo cubre carpeta vacía, documentación y proyectos en Python, Java, .NET,
TypeScript, Rust, Go y C++. En un monorepo, verifica el destino explícito con
espacios y acentos y preserva los bytes de los archivos humanos y del índice
Git. Las fixtures son locales y la prueba usa Node 24+ y Git. También forma
parte de la suíte portátil `project-matrix.test.mjs`.

Para ejercitar 40 proyectos sintéticos con el tarball local, extraía el paquete
en una carpeta temporal. Use Node.js 24 o más reciente.

```console
work=$(mktemp -d)
tar -xzf "$archive" -C "$work"
node tests/project-matrix.mjs --package "$work/package" --version "$version"
```

Añadir `--rounds 25` para planificar 1.000 proyectos; cada ronda contiene 40
casos distintos y se acepta hasta 100 rondas. Proyectos y evidencias ocupan
espacio proporcional; no hay límite global de tiempo o disco. Para dividir la
ejecución, use `--start-round 11 --rounds 5` para las rondas 11 a 15, por
ejemplo. Los números de los casos siguen siendo iguales a los de la matriz
integral; el informe registra la ronda inicial. Para comparar lotes, use el
mismo paquete, la misma revisión del runner y las mismas condiciones. El informe
no reconcilia lagunas o sobreposiciones entre lotes; resultados ausentes o
falhos no son contados como concluidos. Él registra plataforma y arquitectura y
compara hashes del runner, dos imports, manifiesto, CLI, constructor del
catálogo, mapa de destinos y política de adaptadores antes y después del lote.
Esto no autentica el paquete ni detecta cambios en los demás archivos o cambios
transitorios revertidas; los imports se cargan antes de la primera medición. Una
diferencia o fallo de lectura reproba la ejecución.

El runner confiere el nombre y la versión del paquete y ejecuta `init`,
`update`, `update --force`, `doctor` e `sync --check` para selecciones de
agentes, en proyectos nuevos o existentes. Varia archivos humanos,
configuraciones nativas y colisiones. No prueba colisión de catálogos
personalizados. Proyectos existentes comienzan con commit sintético de identidad
ficticia y archivos humanos rastreados, además de alteraciones staged y unstaged
separadas. Incluyen skill adicional y skill homónimo en el hub compartido,
además de la colisión de skill nativa del Claude. Compara bytes del índice,
HEAD, `.git/refs`, `packed-refs`, Git config, `.gitignore` y archivos
existentes. Otros formatos de refs y metadatos Git no están cubiertos. Compara
también `.git/info/exclude` byte a byte e recusa incluso a añadidos. En
documentos humanos extensibles, acepta el contenido original o el contenido
original seguido del bloque gestionado exacto esperado; otras variantes exigen
análisis. Conserva snapshots, logs y `RESULT.json` en carpeta exclusiva. Compara
índices, orígenes y apuntamientos esperados según la política del paquete.
`ruleScopes` registra las pruebas de configuración de alcance. En Claude,
`explicit-source-only` confirma el origen disponible para lectura explícita y la
ausencia de ruta nativa en la fixture. En el Cursor, el runner compara el modo
de aplicación con el trigger de la regla y los bytes del sidecar instalado.
Origenes humanos y alcances ambiguos continúan como `not-verified`. La prueba
cubre las preferencias de alcance y descubrimiento estructural. La cobertura se
evalúa en cada una de las cinco operaciones; una etapa sin cobertura válida
mantiene el caso como no verificado, incluso si la última está verificada. Los
logs son texto UTF-8 y no preservan bytes no válidos de la salida original.
`coverageAssessment` resume todas las etapas; `coverage` conserva solo la
última. Para evaluar el caso entero, utilice el estatus agregado y el
assessment. También compara permisos; en Windows, sólo el bit de escritura
reportado por Node, sin validar ACLs. Ancestrais monitorizados se inspeccionan
con `lstat`; enlaces simbólicos y cambios de tipo o modo de las carpetas
interrumpieron el caso. Después de cada etapa, interrumpió identificar un cambio
indebido. Los snapshots no detectan alteración y reversión dentro de un mismo
proceso. `--jobs 1..4` limita competencia. `--output` acepta un directorio
temporal
existente fuera de repositorios Git; runner crea una nueva subcarpeta. En macOS,
el alias de sistema `/tmp` También se acepta; se niegan enlaces humanos. No
ejecuta skills, agentes, clientes nativos o pruebas de aplicaciones y no bloquea
la red en el sistema operativo. Remove `NODE_OPTIONS`, `GIT_*` e `npm_config_*`
y aisla el Git global: no prueba credenciales o configuraciones reales. Las
operaciones dependen de CLI probado y no comprueban actualización a partir de
contenido administrado de una versión anterior diferente. `--package` ejecuta el
código informado con permisos normales del usuario; utilice solo un paquete
fiable o sandbox externo. El modo offline del npm no restringe el acceso al
sistema de archivos o a la red del proceso. Timeout o exceso de salida dejan
preservación no verificada. En Windows, solo el proceso hijo se cierra, y los
descendientes pueden continuar. Fals retornan `1`.

Para conferir la coherencia de una salida preservada de la matriz, proporcione
el camino original registrado por el runner, el paquete extraído y el checkout
usado.

```console
node tests/matrix-audit.mjs /caminho/da/saida /origem/registrada \
  --package "$work/package" --runner-root "$PWD"
```

El primer camino contiene `RESULT.json`. El segundo es el directorio padre del
archivo especificado por el campo `report` Antes de mover los archivos. La
auditoría confiere casos, etapas, snapshots, hashes de los logs y las fuentes
registradas en la procedencia. `audit: consistent` indica coherencia, incluso
cuando `matrixStatus` é `failed` o `not-verified`; comprueba ambos. Ella no
autentica la ejecución o el paquete, no añade la preparación anterior a
`BEFORE.json` y no garantiza seguridad frente a los cambios competidores en los
caminos. Utilice solamente evidencias de origen confiable.

Para verificar el paquete local en proyectos reales, ejecute:

```console
npm run test:oss -- --tarball "$archive"
```

La prueba clona los commits fijos de la [matriz de proyectos][oss-project-matrix].
Incluye Hibernate ORM, EF6, Rust, Go, Tailcat, Express, Requests, Zod y Chi.
Comprueba archivos, permisos, enlaces, staging,
instalación y actualización; compara los bytes de `.git/info/exclude` y observa
ignores sin exigir alteraciones en ellos. Para ediciones humanas, valida la
copia de seguridad compatible y, cuando el paquete usa diario de recuperación,
el encadenado de los recibos y la copia del estado anterior. Incluye una skill
propia, una referencia Markdown corta, configuración local y un agente humano
con nombre igual al del kit. Confiere también la sincronización independiente y
`--force` sin eliminar estos recursos. El entorno aislado lo ignore global
estándar XDG. Si la configuración privada de la fixture está visible al Git,
`doctor` e `sync --check` Deben señalarla; otros problemas continúan reprobando
el escenario. En esa situación, el verificador de recursos para no sync; el
runner confiere ese diagnóstico y ejecuta los demás chequeos por separado,
registrando la opción en el informe. La ejecución de las aplicaciones y de sus
dependencias no es parte de esa prueba. Clones y evidencias quedan en
`tmp/oss-compatibility/`, ignorado por Git.
runner verifica el ignore y el índice antes de crear una carpeta exclusiva;
rechazo redireccionamientos Git y caminos que puedan colidir con contenido
staged. Las verificaciones entre escenarios no son atómicas durante todas las
escritas; evite alterar la carpeta de la ejecución mientras esté en uso.
Requiere red; no rueda en el `npm test` patrón ni ejecuta las aplicaciones
clonadas. Use `--project express` para un caso y `--help` para todas las
opciones. Sin argumentos de paquete, runner empacota el checkout. Com
`--tarball`, prueba el archivo informado y espera la versión de checkout. Use
también `--version` Si el archivo tiene otra versión. Para darle el npm público,
pase solo `--version`. El informe registra el origen del paquete. Un bloqueo por
configuración previa aparece en el informe como fallo, con los archivos
preservados; no equivale a una instalación exitosa. El proceso vuelve `1` Si
algún escenario falla o bloquea. En Zod, confiere la preservación de los enlaces
`CLAUDE.md`, `README.md` e `.codex/skills`, mientras que los apuntamientos
disponibles son instalados en las demás rutas nativas. O EF6 puede bloquear la
instalación cuando una excepción de `.gitignore` existente
expone cachés de pruebas; el diagnóstico preserva ese archivo y el índice Git.

## Flujo documental

```console
npm run test:docs -- --tarball "$archive"
```

El runner reutiliza la matriz OSS y consulta el inventario del paquete
instalado. Registra un plan aditivo, añade un tramo controlado a un README
regular y crea un índice de enlaces. Luego repite el mantenimiento del kit y
compara contenido, archivos fuera del plan, Git y los diagnósticos de ignore
observados antes de la edición. También verifica un repositorio Git vacío sin
inventar PRD, diseño o aprobación. Sin argumentos de paquete, reutiliza el
tarball generado por runner OSS al comienzo de la ejecución.

Estos complementos son fixtures del harness: comprueban inventario y
preservación, no la calidad de la autoría autónoma por un modelo. Un ejercicio
real del agente debe leer la skill y la documentación, proponer el complemento y
pasar por la revisión.

## Preservación TOML

```sh
node tests/toml-preservation-proof.mjs
```

El comando compara 40 ejemplos sintéticos al añadir, actualizar y retirar el
bloque administrado. `1` Para fallas, diferencias o matriz incompleta. La prueba
es explícita y todavía no integra la suíte estándar. Ella no verifica la
semántica intermedia y no sustituye a parser independiente, clientes reales, Git
o plataformas diferentes. Vea [spec en
borrador](../specs/toml-preservacao/SPEC.md).

## Recuperación concurrente

`recovery-effects.test.mjs` ejercita la clasificación aislada con opciones
reales de CLI, aliases, simulaciones, argumentos opacos y entradas inválidas. El
módulo no es una barrera activa y no prueba el sincronizador directo o el
diario. `recovery-records.test.mjs` Prueba solamente la interpretación de
registros en memoria, incluyendo corrupción, límites y transiciones. El
componente todavía no es usado por CLI o sync y no comprueba la copia de
seguridad o la recuperación de proyectos. `recovery-exclusive.test.mjs` disputa
una creación exclusiva entre 16 procesos en tres rondas; el resultado vale para
el sistema de archivos de aquella ejecución. `recovery-store.test.mjs` cobre el
diario aislado en disco, incluyendo disputa entre procesos, interrupción,
errores de publicación y cambios observables de UID, modo e identidad. La prueba
no garantiza ACLs o atomicidad y no valida copia de seguridad o integración a la
CLI. Las pruebas POSIX Se ignoran en Windows; en ese sistema, las operaciones
mutables del componente se niegan antes de tocar el diario. Soporte futuro
requiere una evaluación real de sincronización y procesos en Windows.
`recovery-backup.test.mjs` prepara y verifica copias privadas de un snapshot
sintético y asocia el hash del manifiesto al diario. La prueba no confirma que
los planificadores reales identifican todos los archivos afectados o que haya
rollback. Las pruebas también simulan UID efectivo no disponible en la apertura
del manifiesto; la primitiva negativa a la lectura sin comprobar propiedad por
otros medios. `recovery-plan-coverage.test.mjs` compara un candidato de captura
con llamadas de instalación observadas en fixtures de init, migración y remoción
obsoleta. Utiliza solamente APIs síncronas instrumentadas en el camino de éxito
con clientes Claude y Codex; no verifica acciones y tipos en cada entrada,
llamadas internas del sistema o subprocesos. La instrumentación también observa
padres creados por `mkdir` recursivo y una copia específica de copia de
seguridad. Nombres temporales físicos y raíz, incluso cuando esté ausente,
quedan fuera del candidato; el plan completo de sync necesita tratamiento. El
candidato no es un planificador de producción. Las pruebas de captura se ignoran
en Windows mientras que la copia de seguridad no lo soporta.

Los escenarios de recuperación concurrente ejecutan por estándar cuando son
aplicables, incluyendo edición de copia de seguridad después de hash,
intercambio de ancestro en POSIX, doce casos nativos en macOS y tres de atributo
extendido en Linux. La fixture de xattr Linux exige Perl con `syscall.ph` y un
volumen compatible. El perfil `full` Hace que prerrequisitos estrictos
obligatorios en la plataforma aplicable. El perfil `native-macos-metadata`
requiere los doce casos macOS sin skips o TODOs. Para exigir los prerrequisitos
de suíte en la ejecución local:

```console
ADK_STRICT_RECOVERY_TEST=1 node --test tests/concurrent-recovery.test.mjs
```

En macOS, ejecute el mismo gate de la CI con:

```console
node scripts/release/pipeline.mjs native-macos-metadata
```

Las regresiones ejercitan los intercambios competidores de archivo y ancestrales
en el rollback, sustitución del nombre temporal después de enlazar y editar la
copia de seguridad después de dar el hash. Dos casos también observan llamadas
mutadoras después de fallar en el instalador y en sync, limitadas a las APIs
instrumentadas. La protección del intercambio ancestral en la copia de seguridad
utiliza una fixture de symlink POSIX. Cuatro casos específicos de macOS
verifican que actualizaciones del instalador y sincronizador preservan ACLs
legibles y xattrs. Dos verifican preservación o denegación segura cuando la ACL
Denega solo append. Otros seis requieren denegación y preservación del estado
observado después de protecciones ACL o `uchg` en init, update y sync; el update
usa legado sintético. El snapshot de esos seis excluye `.agent-tests` y no
detecta mutaciones revertidas o todos los metadatos de otros archivos. En otros
sistemas, se ignoran los doce casos. Las fixtures Linux para xattr cubren
actualizaciones y copias de seguridad en `tmpfs`; ellas no comprueban ACLs o
comportamiento en otros sistemas de archivos. La prueba de diagnóstico de TOML
legado distingue ausencia, fallo de lectura y divergencia del registro sin
inferir propiedad por el hash informado.
`sync-special-mode.test.mjs` comprueba la negativa de sync directo antes de
cambiar archivos planificados con bit POSIX especial, incluyendo `--force` y
remoción. Los bits sticky, setuid y setgid se ejercitan por separado en macOS y
Linux; la suíte no comprueba combinaciones, directorios, ACLs, xattrs, Windows o
operaciones por CLI. `cli-special-mode.test.mjs` verifica el bit sticky en
objetivos reales de `init`, `update` e `sync`, inclusive `--force`; setuid y
setgid se verifican en `update`. El intercambio de agentes verifica la negativa
de remoción a los tres bits, con y sin `--force`. La suíte no cubre directorios,
ACLs, xattrs o Windows. `--check` e `--dry-run` no identifican esa protección.
En el perfil estricto en macOS y Linux, la ausencia del bit necesario falla la
prueba; Windows es ignorado. `state-directory-xattr.test.mjs` verifica en macOS
la negativa de la migración de directorios legados con atributo sintético
listado, incluso con `--force`, y la preservación de los caminos Git y humanos
muestrados. También prueba consultas, diagnóstico con otro problema y fallas
simuladas del probe en la planificación y antes de la aplicación. La prueba
falla si no puede crear el atributo y es ignorado en
Otros sistemas. El listado no comprueba ACLs, atributos ocultos, metadatos no
mostrados o ausencia de cambios transitorios. `mac-xattr-probe.test.mjs`
verifica el clasificador de salida y, en macOS, se niega a un objetivo con
atributo listado y continuidad cuando no se ve afectado. El helper no lee
valores; atributos ocultos, ACLs y otros sistemas no son comprobados por esa
lista. En el modo estricto, la fixture falla si no puede crear el atributo
sintético. `mac-xattr-removal.test.mjs` verifica la denegación de retirada por
CLI y por sync directo con dos atributos sintéticos listados, sin comparar sus
valores. `xattr-stage-diagnostics.test.mjs` empacota offline e inyecta fallas
solamente en copias temporales para conferir el alcance de errores de la etapa.
Requiere npm y tar; ejecuta en macOS/Linux, ignora Windows y no reproduce falla
real de limpieza. `native-metadata.test.mjs` inyecta fallos simultáneos de
escritura y cierre y confiere que API mantiene el código de error primario.
`callback-boundary-isolated.test.mjs` distingue errores de inspección del
proyecto de errores en la etapa y verifica la salida sanitizada de CLI en los
casos ejercitados. A
causa original sigue accesible por API en `Error.cause`; los casos fueron
validados en macOS y Linux, pero Windows no fue verificado.
`diagnostic-collector-safe.test.mjs` verifica el colector con getters, proxies,
causas y límites sintéticos; no comprueba la sanitización de toda la CLI.
`json-diagnostics.test.mjs` verifica errores de sintaxis en lectores locales de
herramientas y skills externos, inclusive en las CLIs, y la propagación de
errores de lectura. Confiere la política local de adaptadores en el planificador
de ignorar y en la carga inicial del sync directo, sin exponer contenido o
camino en el error de sintaxis. Este error usa stack resumida y no informa línea
o llamadas del parser; errores de lectura continúan por el camino original.
Confiere también el diagnóstico de inicialización de la CLI principal en los
tres idiomas y el tratamiento de opciones antes y después del separador de
argumentos. También confiere a CLI principal con estado y configuración
inválidos, sin alterar el índice observado. No cubre validación de esquema,
otros parsers o respuestas HTTP. `sync-temporary-privacy.test.mjs` verifica el
modo en el instante en que el sync
crea un temporal. La implementación anterior ha llegado a crear modo `666` para
un destino `600` com `umask 000`. La prueba ahora incluye cinco modos de
archivos existentes y archivos nuevos, con máscaras `000`, `002`, `022` e `077`,
y pasó en macOS y Linux. También prueba remoción y restricción de modo antes de
la creación del temporal. Las fixtures se encuentran en directorios privados. La
prueba no comprueba ACLs en Windows ni elimina ventanas de cambios competidores.

```console
node --test tests/sync-temporary-privacy.test.mjs
```

`sync-backup-failure.test.mjs` Inyecta fallos en la copia y en el cierre de la
copia y verifica la interrupción, el diagnóstico y la preservación de los
archivos y del índice observados. Con cambio de UID en Linux, suíte comprueba la
negativa cuando el propietario diverge y preserva el modo `0440` En la copia de
seguridad del propio archivo. Estas pruebas observan los caminos de la fixture y
el modo de lectura.

`sync-remove-failure.test.mjs` Inyecta fallos antes y después de una retirada y
durante la restauración. La copia anterior está preparada al lado del destino y
publicada por rename; si la preparación falla, el archivo publicado continúa en
el lugar. La ejecución que cubrió 31 pruebas pasó en macOS y Linux. El alcance
de esta suíte es la falla inyectada y la preservación observada. El gate de
recuperación concurrente ejecuta sus propias fixtures.

`hardlink-unknown.test.mjs` simula recuentos de enlaces no disponibles y
verifica la negativa y el diagnóstico de CLI; no comprueba qué sistemas las
presentan.

`hardlink-plan.test.mjs` verifica diagnóstico en la planificación, check y
doctor, conflictos simultáneos y cambios entre plan y aplicación. La prueba no
elimina ventanas de competencia ni cubre todos los metadatos del archivo.

`mac-acl-protection.test.mjs` verifica la preservación de ACLs legibles y xattrs
en actualizaciones macOS, la negativa cuando la ACL niega la escritura y la
falla cerrada de la consulta. No comprueba protección de directorios, todas las
ACLs u otros sistemas.

`mac-acl-plan.test.mjs` verifica actualizaciones con ACL preservable, rechazo de
ACLs protegidos o no verificables, revalidación, check y conflictos. Las pruebas
específicas se ejecutan en macOS.

`mac-backup-acl.test.mjs` verifica en macOS que la copia de seguridad permanece
vacía cuando la carpeta hereda ACL o su consulta falla; no prueba privacidad en
competencia.

`temporary-preservation.test.mjs` verifica en la aplicación de un plan y en el
sync directo que fallas en la creación exclusiva preservan e informan el nombre
incierto, inclusive en colisión o grabación parcial. En una colisión en el sync
de la etapa privada de planificación, verifica que la etapa y el diagnóstico son
mantenidos. También verifica que un nombre temporal recreado después de que se
describe el nombre de tiempo recreado `rename` El éxito es preservado en la
aplicación y en el sync directo. Después de éxito, la planificación todavía
intenta eliminar la etapa recursivamente, incluso si un nombre es recreado en
él. En POSIX, también cubre un rename entre hardlinks del mismo inode: en ese
caso el nombre original puede continuar existiendo sin aviso automático. La
prueba cubre errores antes y después del intento de publicar, incluso una falla
reportada después del enlace. La sustitución competidor del temporal después del
enlace exitoso sin error continúa pendiente, así como el rollback completo.
También prueba falla de creación, modo y lectura del temporal antes de la
publicación en sync: si el grupo afectado no tenía cambios anteriores y su
contenido observado no cambió, el destino no es restaurado. Las pruebas incluyen
Sustituciones iguales al original, diferentes o iguales al contenido
planificado, además de la preservación del error original. En fallo antes de
publicar, la limpieza no elimina el temporal ya creado e informa su camino como
incierto; otro proceso todavía puede eliminarlo. Una publicación anterior en
otro grupo sigue siendo verificada e informada. No hay fixture comprobada de dos
acciones en el mismo grupo. Eso no cubre todos los efectos en directorios ni
publicaciones ambiguas.

`sync-logical-order.test.mjs` ejercita la eliminación de una referencia obsoleta
antes de la creación de otra, preservando un archivo humano, índice y
`.gitignore`. No comprueba el orden de todas las categorías ni un plan de
recuperación.

## Descubrimiento en clientes nativos

Con Node 24+, un paquete confiable local y las CLIs OpenCode y Copilot:

```console
node tests/native-client-matrix.mjs --package "$work/package" --version "$version"
```

El runner crea proyectos sintéticos nuevos y preexistentes para cada ID de la
política de adaptadores del paquete, en carpeta temporal exclusiva fuera de Git.
Carga los adaptadores y el constructor de catálogo del paquete; contratos
ausentes o no reconocidos bloquean la prueba. Constrói el inventario esperado de
las fuentes del paquete y compara el catálogo instalado, incluyendo faltas,
extras y duplicados. Para cada skill y perfil, registra separadamente referencia
estructural, descubrimiento y ejecución. La prueba estructural exige el
apuntamiento generado canónico y compara los bytes del origen instalado con los
del paquete; no incluye colisiones de contenido humano. Algunas referencias de
perfil exigen validación en el cliente. El Copilot lista skills. En OpenCode 1,
el runner consulta cada perfil con `debug agent <nome> --pure` y confiere el
`prompt` cargado. En OpenCode 2, usa `debug agents --standalone` y confiere el
`system` de la entrada correspondiente. Las demás combinaciones se quedan
`not-run`. Copilot debe volver cada nombre una vez, habilitado y con la
ubicación de la skill del proyecto; resultados personales o incorporados no son
confundidos.
El descubrimiento observado no comprueba ejecución. El runner no solicita
inferencia ni usa un modelo, por lo tanto toda ejecución queda `not-run`. Falsos
de instalación, inventario, estructura o descubrimiento observable y bloqueos de
CLI retornan código 1; resultados detallados y logs se encuentran en
`RESULT.json` y archivos al lado, fuera de Git. `--output` acepta directorio
temporal existente fuera de repositorios, con las mismas restricciones de la
matriz de proyectos.

O HOME, XDG y variables de configuración son aislados por caso; no son un
sandbox de sistema. Clientes y paquete tienen los permisos del usuario, y el
runner no bloquea la red ni garantiza acceso exclusivo a los datos generados.
Recusa enlaces simbólicos en los caminos verificados, sin garantizar atomicidad
contra los intercambios competidores. Use solamente binarios confiables. En
Windows, ACLs y cierre de descendientes no están garantizados. Logs pueden
contener salidas de los procesos. La fixture preexistente compara los bytes de
README e `.gitignore`, sin reemplazar las pruebas de preservación más amplias de
`project-matrix.mjs`.

Una prueba separada puede usar inferencia de Copilot y generar eventos y
marcadores sintéticos. Para auditar los eventos de una prueba ya realizada, sin
llamar modelo:

```console
node tests/copilot-evidence.mjs /pasta/da/prova /fixture/original /pacote/local
```

El auditor exige que la fixture corresponda a las fuentes del paquete informado,
confiere descubrimiento, invocación, lectura, marcadores y archivos protegidos y
rechaza herramientas inesperadas. No autentica el paquete en el registro ni
ejecuta el flujo completo de la skill. Las evidencias contienen datos sintéticos
y quedan fuera de Git; la ejecución con modelo puede consumir créditos del
servicio.

Para auditar eventos equivalentes de Claude Code sin volver a llamar el modelo:

```console
node tests/claude-evidence.mjs /pasta/da/prova /fixture/original /pacote/local
```

El auditor confiere la invocación, el apuntamiento cargado, la lectura del
origen, los marcadores y los archivos protegidos. Los intentos de lectura
externa sólo son identificados por comparación lexical de caminos y aceptas
cuando el evento demuestra un error reconocido sin contenido parcial; esa
comparación no detecta un enlace simbólico interno que apunte hacia fuera. La
prueba no autentica el paquete ni ejecuta el flujo completo de cada skill. El
informe identifica el tipo y el retorno de lanzamiento esperado sin copiar su
contenido. Estos campos son informativos y no determinan `passed`; `unavailable`
Incluye resultado ausente, duplicado o fuera de orden. Eventos de entrada pueden
contener datos sensibles y no son sanitizados por el auditor.

Para auditar la delegación a los perfiles de Claude Code, sin nueva llamada al
modelo:

```console
node tests/claude-agent-evidence.mjs /prova /fixture/original /pacote/local
```

La prueba utiliza marcadores diferentes en el perfil cargado y en el origen. El
auditor confiere la selección de cada subagente, la lectura, la respuesta, el
orden de los eventos y la preservación de la fixture. `passed` cobre esas
verificaciones; `swarmPassed` También exige paralelismo observado. Para una
prueba movida, acrece `--recorded-project /caminho/original/do/projeto` para
comparar los caminos registrados en los eventos con el local usado en la
ejecución. El prompt de la tarea es conferido en el evento de inicio; un mensaje
separado del prompt del hijo puede no aparecer, y su presencia es indicada por
`childPromptTextObserved`. La prueba no comprueba el flujo completo del agente
ni autentica el paquete. Los formatos nativos están en [documentación de Claude
Code](https://code.claude.com/docs/en/sub-agents).

Para auditar una prueba de delegación a los perfiles, sin nueva llamada al
modelo:

```console
node tests/copilot-fleet-evidence.mjs /prova /fixture /pacote original
```

El último argumento es `original` para apuntamientos del paquete o `path` para
el experimento sintético que hace visible el enlace. El auditor confiere la
delegación y la lectura por cada subagente, además de los marcadores y de la
preservación. Él registra intentos de lectura fuera de la fixture y rechaza la
prueba si una de ellas no tiene una negación explícita sin contenido parcial.
Devuelve error cuando cualquier perfil no es verificado; no ejecuta los flujos
completos de los agentes ni autentica el paquete informado.

[reading-pt]: https://github.com/pathbit/AgentDevKit/blob/main/tests/README.md
[oss-project-matrix]: https://github.com/pathbit/AgentDevKit/blob/main/tests/fixtures/oss-projects.json
[reading-en]: ../../en/tests/README.md
[reading-es]: README.md
