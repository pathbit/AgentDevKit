---
description: "Comandos, opciones y respuestas de AgentDevKit."
language: es
---

# Referencia de CLI

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Ejecute el paquete del npm público por `npx`, sin iniciar sesión:

```console
npx @pathbit/agentdevkit --help
```

Para GitHub Packages, autentique conforme a
[instalación](installation.md#github-packages) y use el prefijo `npx
--registry=https://npm.pkg.github.com` en los mismos comandos.

En las tablas, `agentdevkit` Representación `npx @pathbit/agentdevkit`. Ejecuta
los ejemplos en la carpeta del proyecto o introduzca `--target <pasta>`. Si está
trabajando en el checkout de AgentDevKit, ejecute `npm run cli -- <comando>` o
`node bin/agentdevkit.mjs <comando>` para probar el código local. En el proyecto
atendido, use `npx` para ejecutar el paquete.

## Comandos

| Comando | Resultado |
| --- | --- |
| `init [pasta]` | Instala el kit en el proyecto o reaplica la instalación. |
| `update` | Actualiza la fuente usando la versión del paquete ejecutado. |
| `sync` | Actualiza catálogos y apuntamientos a partir de la fuente local. |
| `sync --check` | Confiere sincronización sin cambiar el proyecto. |
| `doctor` | Diagnostica el kit e indica divergencias. |
| `recovery` | Consulta el diario y la copia de la operación pendiente. |
| `recovery resolve <geração> <id>` | Encerra la espera revisada. |
| `next` | Muestra la siguiente etapa, sin iniciarla. |
| `next --intent run` | Orienta la preparación de un proyecto existente. |
| `next --integrations` | Indica dónde consultar artefactos de otros métodos. |
| `document` | Inventaría un sistema existente a partir de archivos locales. |
| `lang [idioma]` | Consulta o cambia el idioma: pt, en o es. |
| `agents` | Muestra los clientes disponibles y la selección guardada. |
| `agents --select` | Abre el menú de la selección en un terminal interactivo. |
| `agents codex,claude` | Reemplaza la selección y sincroniza los apuntes. |
| `agents add <ids>`, `agents remove <ids>` | Altearon los IDs indicados. |
| `agents all` | Selecciona todos los clientes compatibles. |
| `agents none` | Mantiene el hub sin cliente específico. |
| `plugins list`, `plugins info <id>` | Consulta complementos y sus orígenes. |
| `plugins install <id>`, `plugins check <id>` | Prepara o verifica plugins. |
| `tools <ação>` | Consulta, instala, actualiza o ejecuta herramientas. |
| `--help`, `--version` | Ayuda o versión del paquete. |

Sin mando, a CLI ejecuta `init`, que puede crear archivos. `language` es alias
de `lang`; `clients`, de `agents`. El idioma no traduce documentos existentes.

Si el diario indica una operación pendiente, consulte [procedimiento de
recuperación](troubleshooting.md#retomar-despu%C3%A9s-de-una-interrupci%C3%B3n)
antes de ejecutar
`recovery resolve`.

## Opciones

| Opción | Uso |
| --- | --- |
| `--target <pasta>` | Proyecto objetivo; no combine con la carpeta de `init`. |
| `--lang <idioma>` | Idioma de esta ejecución. |
| `--agents <lista>` | IDs separados por coma, `all` o `none`. |
| `--clients <lista>` | Alias de `--agents`. |
| `--yes`, `-y` | Evita preguntas iniciales; no fuerza conflictos. |
| `--dry-run` | Exhibe el plan sin aplicar cambios. |
| `--local` | Em `init`, mantiene los nuevos archivos de hub en el checkout local. |
| `--check` | Em `sync`, confiere el proyecto sin aplicar la sincronización. |
| `--force` | Solicita reparaciones administrativas permitidas, con copia de seguridad. |
| `--json` | Produce una respuesta JSON para automatización. |
| `--intent` | Objetivo de la consulta `next`. |
| `--purpose` | Objetivo que orienta el siguiente paso en `init`. |
| `--markdown` | Em `document`, emite el inventario en Markdown. |
| `--integrations` | Em `next`: consulta de referencias externas en el proyecto. |

En el primer uso en terminal, use las flechas y espacio en el menú de agentes.
Enter confirma y Esc cancela. En proyectos instalados, `agents --select` abre la
lista con la selección existente. Con idioma y clientes explícitos, use
`--purpose` Para indicar el objetivo. Sin interacción, valen las opciones
explícitas, la selección salva y, por último, `none`. Revise los [IDs y
dependencias](../kit/COMPATIBILIDADE.md).

`agents --json` informa `kitInstalled`, `configuredClients`, `clientRoots` y
cuando haya una instalación, `statePath`. La selección indica qué clientes
reciben recursos del kit. Use `doctor` e `sync --check` para conferir archivos
generados.

Com `none`, `clients` contiene `["none"]` e `configuredClients` Está vacío.
`clientRoots` Incluye caminos compartidos que el cliente seleccionado usa. Para
cambiar solo algunos clientes, pase IDs individuales separados por coma a
`agents add` o `agents remove`. Use `agents all` o `agents none` Para reemplazar
la selección entera.

Use `init --purpose agents|product|run|document` Para indicar si quiere preparar
a los agentes, planificar producto, girar la aplicación o documentar lo que
existe. El objetivo orienta la siguiente acción de la CLI.

`init --local` Guarda la regla en `.gitignore` del hub y salva esa elección para
`update` e `sync`. Prueba con el ejecutable del checkout conforme al [guía de
instalación local](installation.md#usar-hub-solo-en-el-checkout-local).

## Preparación de un proyecto existente

En la carpeta que recibió el kit, consulte `next --intent run` Para preparar la
ejecución. En un monorepo, use la raíz si la instalación es compartida. Mire un
módulo cuando tiene instalación propia.

```console
npx @pathbit/agentdevkit@0.0.38 next --intent run --target "../Meu projeto"
```

Para probar la versión en desarrollo, ejecute esta orden desde la raíz del
checkout de AgentDevKit.

```console
node bin/agentdevkit.mjs next --intent run --target "../Meu projeto"
```

En la versión en desarrollo, la consulta puede mostrar hasta seis caminos para
conferir, como READMEs, manifiestos, Compose, Dockerfiles y Makefiles. Un
proyecto con sólo Compose o tareas declaradas ya puede recibir skill
`preparar-dev`. Si faltan indicios, consulte README y confirme el módulo o la
orden del equipo. La consulta solo lee archivos. Usted elige y ejecuta la orden
del proyecto.

## Actualización y previa

`update` usa la versión ejecutada; para elegir otra, la fije en el nombre del
paquete. `sync` usa lo que ya está en `.pbai4devs`: no baja otra versión. Ambos
conciliam recursos y eliminan apuntamientos obsoletos cuando la propiedad del
kit está comprobada. Recursos y configuraciones propios permanecen en el
proyecto. De los antiguos datos sin comprobación de propiedad pueden permanecer
vacíos. Al cambiar la selección, las carpetas compartidas continúan cuando otro
cliente necesita de ellas; los archivos adicionales del equipo deben ser
preservados.

En instalaciones legadas en la versión `0.0.21`, `init --force` e `update
--force` pueden reemplazar a uno. `.pbai4devs/catalog.json` preexistente.
Preserve una copia fuera del proyecto antes de ejecutar estas órdenes en esa
versión. En las fixtures probadas, `init` la `0.0.21` También agregó reglas a
`.git/info/exclude`; comprueba este archivo si necesita mantener la
configuración Git intacta.

Antes de aplicar en proyecto existente, consulte el plan con la versión que
pretende usar. O [guía de actualización][update] muestra la secuencia completa.

```console
npx @pathbit/agentdevkit update --dry-run --json
```

Use `init --dry-run --json`, `sync --dry-run --json` o `agents codex,claude
--dry-run --json` Para otras operaciones. Examine `plan`, `conflicts`,
`preserved`, `untrackedPaths` e `localIgnore` antes de aplicar. Conflictos sin
solución interrumpen la operación; no presuma que una colisión de nombres hace
que un archivo propiedad del kit. Al actualizar una instalación antigua con
reglas Claude, la CLI puede preservar las reglas y rechazar la operación por
alcance o metadados no verificados, incluso con `--force`. Revise los archivos
indicados y sus fuentes y dependencias; no apague las reglas para eludir la
negativa. Un hash registrado no comprueba los metadatos actuales ni la
activación efectiva en el cliente. La salida humana muestra hasta cinco caminos
en conflicto; use `--json` para la lista completa y los motivos disponibles en
`preserved`. En la migración de 0.0.21, el kit actualiza referencias Claude
globales con origen comprobado. La referencia Git antigua sólo se retira cuando
el contenido exacto es comprobado y el camino está fuera del índice. Una
referencia Markdown existente, integralmente idéntica a la generada y sin
registro anterior, es preservada y puede satisfacer el descubrimiento sin ser
adoptada.
Los registros históricos de eliminación siguen la política anterior y requieren
revisión. Las verificaciones no son atómicas con otros cambios en el sistema de
archivos: evite editar los archivos involucrados mientras la operación esté en
marcha.

## Diagnóstico y sincronización

Use `doctor` para verificar la instalación y `sync --check` Para detectar
divergencias con respecto a las fuentes instaladas. Los dos comandos solo
consultan el proyecto. Si hay cambios propuestos, examine `sync --dry-run
--json` antes de ejecutar `sync`. Sin Git, a CLI puede indicar la pendencia de
Git en `sync --check`.

El sincronizador independiente también puede ser ejecutado por [script
local](../kit/scripts/sincronizar-agentes/README.md). Su `--check`
Sólo confiere y `--force` es explícito en la línea de mando. El comando agêntico
[Sincronizar](../kit/commands/sincronizar/COMMAND.md) orienta revisar
y aplicar el plan por CLI; `--force` Es una opción explícita.

El campo `localIgnore.legacyMigration` muestra la migración planificada o
aplicada del bloque de la 0.0.21 en `.git/info/exclude`. Si se aplica, informa
el camino de la copia original. La configuración y el índice Git permanecen
preservados, y `untrackedPaths` permanece vacío. Consulte [Git y
migración](installation.md#git-y-migraci%C3%B3n) Para las condiciones y las
advertencias de visibilidad.

## Herramientas

Para preparar un elemento específico, use `plugins list`, `plugins info <id>` y
después `plugins install <id>`. Antes del `init`, `list` e `info` consultan el
catálogo empacotado. `install` e `check` Utiliza el kit instalado en el
proyecto. Vea orígenes, licencias y requisitos en el proyecto [guía de
complementos](plugins.md).

Las acciones son `list`, `setup`, `install`, `update`, `check`, `info`, `run` e
`unlock`. Consultar o ejecutar no instala silenciosamente. `setup` prepara las
herramientas compatibles; otras órdenes pueden recibir un nombre o grupo.
Consulte [herramientas y pruebas](tools-and-testing.md).

Em `tools`, use `--` antes de los argumentos que pertenecen a la herramienta:

```console
npx @pathbit/agentdevkit tools run agent-browser -- --json --help
```

Nesse exemplo, `--json` pertenece al agent-browser. Opciones del kit se quedan
antes del separador. `--help` e `--version` El kit no requiere un proyecto
instalado.

## JSON y retorno

Las respuestas JSON incluyen `ok`, `command`, `version`, `language`, `target` e
`next`. Conforme la operación, hay selección, plan, conflictos, copia de
seguridad y errores. Lea los campos estructurados, no dependa de la traducción
del mensaje. En `next --intent product`, tras una inspección completa, `stage`
identifica la etapa sugerida y `maturity` indica la madurez detectada. Sin kit
instalado o con inventario incompleto, `maturity` No se informa. No se
aprobarán. En la versión en desarrollo, `next --intent run --json` Incluye
`next[0].references` Cuando encuentra archivos para orientar la ejecución. Los
caminos son relativos al proyecto objetivo. `next --integrations` añade
`integrations` à resposta normal, com `id`, `name`, `url`, `paths` relativos a
la raíz y `instruction` por método. Cuando hay un complemento correspondiente,
`plugin` indica el ID para `plugins info`. La consulta funciona antes de la
instalación. Sólo indica caminos estándar reconocidos y no abre documentos
externos, baja paquetes o ejecuta herramientas. `preserved` Lista de caminos
mantenidos por el proyecto y el motivo. Un complemento puede ser administrado
por bloque sin hacer que el archivo propiedad
del kit. Contenido humano no se sustituye por `--force`. Si la planificación, la
aplicación o `tools` falla después de una posible modificación, `next` En esta
respuesta orienta preservar archivos y revisar el estado antes de retomar. Este
aviso no crea una espera persistente ni impide otra llamada. Si la propia salida
falla, puede estar incompleta; no suponga que una respuesta JSON parcial se
puede recuperar automáticamente.

| Código | Significado |
| --- | --- |
| `0` | Operación terminada; examine también el tipo de respuesta. |
| `1` | Fallo, conflicto o diagnóstico con pendencias. |
| `2` | Argumentos no válidos; herramientas pueden propagar otros códigos. |

`doctor` verifica el kit, no el producto entero. `next` Puede terminar con éxito
mientras orienta una etapa aún pendiente. En un repositorio Git saludable, siga
el comando copiado de la salida de `init` o `update` para `doctor`, después
`sync --check` e `next`. Si hay divergencias, revise el diagnóstico y use `sync
--dry-run --json` cuando se indica para conferir el plan de sincronización. Para
una nueva funcionalidad, use `next --intent product`. Sin `--intent`, `next`
consulta el estado para elegir el flujo. Consulte los documentos y decisiones
existentes antes de seguir la etapa sugerida. Después de producto y diseño,
utiliza los caminos de roadmap y specs registrados en el estado. Para orientar
una spec existente, exige una única referencia abierta `[ ]` o en curso `[-]` en
el roadmap. Con más de una spec, entrega cerrada, vínculo ausente o lectura
ambigua, orienta la revisión del roadmap. Un estado declarado no comprueba
aprobación: la skill confiere decisiones y evidencias. Con una spec abierta y
declarada aprobada, `implementar-spec` verifica el plan antes de encaminar la
configuración técnica; `next` No supone la aprobación del plan.
Si el inventario es truncado, `next` orienta una inspección manual, sin elegir
una fase o presumir que un proyecto existente está vacío. En la intención de
producto, las advertencias en el inventario documental también piden inspección:
esto incluye caminos no válidos, errores de lectura y enlaces simbólicos no
seguidos, incluso cuando un enlace parezca no ser documentación. Consulte al
inspector para ver los avisos y decida después de verificar los archivos
relevantes.

Use a [comparación de métodos](comparacao.md) Para decidir si vale consultar un
artefacto externo. Cuando `next` encuentra referencias, la consulta adicional
preserva la etapa y la skill indicadas para el proyecto.

## Inventario de un sistema existente

`document` funciona antes de la instalación. En la carpeta del proyecto, use
`npx @pathbit/agentdevkit document` para consultar el inventario local, o añadir
`--json` para automatización. Se muestran manifiestos, nombres de scripts,
infraestructura, muestras de archivos, pruebas, documentos y lagunas.

`document --markdown` emite un levantamiento en la salida con `status:
rascunho`. Los comportamientos quedan pendientes hasta la lectura de las
fuentes. `next --intent document` indica `document` y con el kit instalado, la
skill `documentar-legado`. Vea cómo convertir el inventario en trabajo
documental en [guía de
documentación](documentation.md#documentar-un-sistema-en-uso).

[Wiki](../README.md) · [Solución de problemas](troubleshooting.md)

[update]: installation.md#actualizar-y-elegir-agentes

[reading-pt]: ../../guides/cli.md
[reading-en]: ../../en/guides/cli.md
[reading-es]: cli.md
