---
description: "Proyectos copiados para probar los flujos en madurezs diferentes."
language: es
---

# Testar madurez

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Exige Node.js 24+ y Git. En la raíz del repositorio:

```sh
npm run examples
npm run test:examples
node .pbai4devs/scripts/testar-maturidade/SCRIPT.mjs run
node .pbai4devs/scripts/testar-maturidade/SCRIPT.mjs run --case legado
node --test .pbai4devs/scripts/testar-maturidade/tests/TEST.mjs
```

`prepare` sólo genera copias; `run` genera y ejecuta. Cada ejecución crea una
nueva carpeta exclusiva en el directorio temporal del sistema e informa su
camino en la consola. Por estándar son ocho escenarios: agentes, descubrimiento,
planificación, aplicación inicial, configurada, mantenimiento, legado y monorepo
con caminos en portugués. Use `--case` Para ejecutar solo uno.

Las órdenes npm del checkout pasan `--source-only`. Ese modo usa `npm pack
--dry-run` En modo offline, con scripts desactivados, para listar las fuentes
publicables del hub. La copia comienza sin manifiesto, índices, selección local,
espejos o entradas del checkout. El informe marca `sourceMode:
"package-source"`.

Al ejecutar el script instalado directamente, el modo estándar es `"project"`.
Utiliza el manifiesto o la selección salva en el proyecto y copia las entradas
locales con las verificaciones descritas abajo. Una ruta antigua para `.gemini`
impide la ejecución del sincronizador de la copia. Revise la configuración antes
de probar este diseño.

Harness copia recursos y configuraciones reales; excluye paquetes, caché, logs,
resultados de pruebas, Playwright y carpetas temporales en cualquier caja,
`.git` y nombres conocidos de credenciais/overrides lugares. No hace barrido
semántico de secretos. Use `--output <caminho-novo>` para elegir otra carpeta
inexistente con padre existente. En el origen, se aceptan `tmp/`, `temp/`,
`.agent-tests/` o `examples/generated/` Sólo cuando Git confirma lo ignore y no
hay archivos del destino en el índice. Fuera del origen, use una carpeta fuera
de cualquier repositorio. Si el temporal estándar está dentro de Git o si no es
posible consultar a Git, la ejecución falla antes de copiar. Un destino debe ser
nuevo; ejecuciones y proyectos anteriores no se sustituyen ni se eliminan. Cada
ejemplo recibe Git local, sin commits ni identidad alterada. El directorio
generado contiene un ignore propio como protección adicional. Si la preparación
falla, el índice de la nueva ejecución permanece en `preparing`. Los procesos de
los escenarios no heredan variables `GIT_*` del usuario; esto evita que Git del
ejemplo use otro directorio o índice indicado por el ambiente.
fsmonitor está desactivado en las consultas y en los procesos de los escenarios,
sin alterar la configuración Git del usuario. Para salida local, la consulta
respeta la configuración efectiva de ignore, pero rechaza variables que
seleccionen otro repositorio o índice. El índice entero es examinado: nombres
Unicode o especiales potencialmente equivalentes bloquean la salida cuando no es
posible probar que son diferentes, incluso en sistemas de archivos con reglas
desconocidas. Esto puede bloquear nombres que serían distintos; use la salida
temporal estándar en ese caso. Índices cuya respuesta exceda de 64 MiB también
se niegan en lugar de suponer que no hay conflictos. Na API, `prepareExamples({
initializeGit: false })` También funciona sin Git para salida fuera del origen:
en ese caso la verificación usa solo los marcadores `.git` y la estructura de
repositorios bare en los directorios ancestrales. Variables `GIT_DIR` e
`GIT_WORK_TREE` definidas hacen la ejecución falla; un usuario todavía puede
apuntar órdenes Git directamente a cualquier carpeta. Elija un temporal privado
fuera de cualquier repositorio. Salidas en el origen continúan
exigiendo Git para comprobar el ignore y consultar el índice. El generador
verifica enlaces, ausencia de Git e identidad de la salida antes y después de
las etapas, pero eso no es una protección atómica. Un proceso concurrente con
permiso para mover directorios o iniciar Git en la salida todavía puede
redirigir una escritura o versionarla entre verificaciones. En salida local,
cambiar el ignore o ejecutar `git add -f` También puede versionar los ejemplos.
Utilice un área temporal privada, sin acceso concurrente; la carpeta se crea con
modo 0700 cuando el SO lo soporta. O hub `.pbai4devs` y los clientes registrados
son copiados. El manifiesto local tiene prioridad. Sin él, las plantillas
respetan la selección salva. Un estado legado sin selección mantiene la opción
`all`. Sin manifiesto ni estado, la copia trabaja solo con el hub. `.vscode`
requiere registro. Las entradas regulares `AGENTS.md`, `CLAUDE.md` e `GEMINI.md`
En el origen se copian a la raíz. Cuando una de ellas es un enlace simbólico, la
copia no sigue el destino: ella omite la entrada original y registra su nombre
en `omittedEntrypoints` En el informe, la preparación de la fixture puede
generar una entrada propia después.
Las plantillas reemplazan solamente entradas con bloques gestionados válidos;
entradas propias o editadas son preservadas. Sin estado de instalación, las
entradas existentes se copian sin presumir propiedad del kit. Las pruebas
resuelven cada apuntamiento por el formato declarado del cliente y recurso.

Las copias guardan los catálogos originales en
`.agent-tests/testar-maturidade/original-catalogs/` y generan nuevos catálogos
operativos sin cambiar los archivos de origen. Los archivos de origen
reemplazados por fixture se encuentran en `original-files/` En esa misma
carpeta. El informe identifica cada copia: el escenario no es una prueba del
proyecto original en el lugar. No copian el código del producto en `bin/`,
`src/`, `scripts/` o `tests/`, ni estas carpetas en la localización antigua
dentro del hub. Ejecutan sincronización, reparación, idempotencia, verificación
de recursos, diagnóstico, inspección y gates negativos y positivo. Con clientes
seleccionados, la prueba de reparación elimina un espejo gestionado de la copia.
Si la selección es solo o hub, elimina el catálogo `.pbai4devs/catalog.json`. En
los dos casos, confirma que `--check` detecta la ausencia, restaura los bytes
originales y repite la verificación. El campo `syncRepair` El informe identifica
el archivo reparado y su log. En dos casos, creación, edición, renombre,
remoción y preservación de índices alterados ejercitan todo el ciclo.
Aplicaciones ejecutan pruebas HTTP reales en puertas efémeras, cerradas al
final. Legado y monorepo preservan sus archivos.
Herramientas copiadas se quedan sin descargar: se espera el check negativo.

El gate positivo simula el parecer para probar su contrato; no representa una
revisión humana. Estados de aprobación son datos sintéticos. Ningún test
certifica producción, Docker, interfaz visual u otro sistema operativo.

Índice y informe se encuentran en `README.md` e `REPORT.json` En la carpeta
informada. Logs y pruebas se encuentran en `.agent-tests/` dentro de cada
ejemplo, todos ignorados. Cada fixture crea `.agent-tests/.gitignore` para
proteger esos artefactos sin alterar el `.gitignore` copiado del proyecto.

[reading-pt]: ../../../../../.pbai4devs/scripts/testar-maturidade/README.md
[reading-en]: ../../../../en/kit/scripts/testar-maturidade/README.md
[reading-es]: README.md
