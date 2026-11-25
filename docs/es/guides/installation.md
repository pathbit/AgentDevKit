---
description: "Instalación de AgentDevKit y generación local de los agentes."
language: es
---

# Instalación

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

El paquete trae el generador y las fuentes compartidas. La instalación prepara
`.pbai4devs` y crea solamente los referencias para los agentes seleccionados.

- [Inicio rápido con un agente](../../../README.es.md#inicio-r%C3%A1pido).
- [Instalar por primera vez](#instalar).
- [Simular en un proyecto existente](#simular-en-un-proyecto-existente).
- [Usar hub solo en el checkout local](#usar-hub-solo-en-el-checkout-local).
- [Actualizar o cambiar clientes](#actualizar-y-elegir-agentes).

## Requisitos previos

Instala [Node.js 24+ con npm y npx](prerequisites.md) en Windows, macOS
o Linux. Git es opcional para instalar el kit. Si ya tienes Node 18 a 23,
consulta cómo el [arranque][bootstrap] prepara un entorno local.

Cada aplicación conserva sus herramientas. Una API .NET usa su SDK, un
proyecto Python usa su entorno y una carpeta de documentación puede
utilizar el kit solo con Node.js.

## Instalar

Usa el [paquete público en npmjs](https://www.npmjs.com/package/@pathbit/agentdevkit)
en la carpeta del proyecto. Para usar un archivo de una versión publicada o
el código de `main`, consulta [otras formas de ejecutar](../../../README.es.md#otras-formas-de-ejecutar).

### npm público

npm público es la opción predeterminada. Puedes usarla sin una cuenta.

```console
npx @pathbit/agentdevkit init
```

Si npm pide permiso para descargar el paquete, confirma para continuar.

En el menú, usa las flechas y **Espacio** para marcar agentes.
Pulsa **Enter** para confirmar o **Esc** para cancelar. Para cambiar la
selección de un proyecto instalado, ejecuta:

```console
npx @pathbit/agentdevkit agents --select
```

Puedes instalar el kit en una carpeta sin Git con Node.js y npm. El comando
`init` prepara las referencias para los clientes que elijas. Para probar el
menú en el checkout del kit, usa `npm run cli -- init` o
`npm run cli -- agents --select`.

Con otro gestor instalado, también puedes ejecutar:

```console
pnpm dlx @pathbit/agentdevkit init
yarn dlx @pathbit/agentdevkit init
bun x @pathbit/agentdevkit init
```

Las cuatro formas fueron ejercitadas en macOS con la versión `0.0.30` publicada.
El contrato de preservación de la versión actual está en [Git y
migración](#git-y-migraci%C3%B3n)Con Yarn, `yarn dlx -q` evita mensajes del
administrador antes de la salida `--json`.

Para elegir explícitamente este registry:

```console
npx --registry=https://registry.npmjs.org @pathbit/agentdevkit init
```

### GitHub Packages

El paquete es público, pero este registry requiere autenticación para descargar.
Cree un [personal access token clásico][tokens] com `read:packages`. Autentique
una vez en su computadora:

```console
npm login --registry=https://npm.pkg.github.com --auth-type=legacy --scope=
```

Informe a su usuario de GitHub y use el token en el campo de contraseña. npm
guarda la placa en el archivo de su usuario, vinculada al host de GitHub.
`--scope=` evita crear un mapeo permanente del alcance; nunca coloque el token
en las órdenes compartidas o en el repositorio. Vea [Autentificación
oficial][github-auth].

Después instale con npx:

```console
npx --registry=https://npm.pkg.github.com @pathbit/agentdevkit init
```

Las opciones de npx, como `--registry`, se **antes** del nombre del paquete. Uno
`@pathbit:registry` ya configurado puede prevalecer sobre esa opción; oístrale
[diagnóstico de
registry](troubleshooting.md#descargar-plataforma-o-herramienta-fallando).

### Opciones y verificación

Sin orden adicional, el paquete ejecuta `init`. En el primer uso interactivo, el
asistente pide el idioma, la selección de agentes y el objetivo que faltan. En
terminales sin soporte al menú, escriba los IDs separados por comas. Con idioma
y clientes explícitos, use `--purpose` para indicar el objetivo. En el chat de
un agente desktop, diga qué cliente quiere usar y pieza para ejecutarlo CLI en
la carpeta del proyecto.

Consulte [CLI](cli.md) Para añadir selección, destino y simulación. `--json`,
`--yes`, `--dry-run` o ausencia de terminal interactiva evitan preguntas. Sin
elección explícita o salva, `none` prepara las instrucciones compartidas y
`AGENTS.md`. Comience con el ID del cliente que usas. Es posible añadir otro
después con `agents add <id>`. La opción `--agents all` selecciona todos los
clientes activos. [Lista de clientes][clients]

Después de instalar, confirme la versión y compruebe el diagnóstico:

```console
npx @pathbit/agentdevkit --version
npx @pathbit/agentdevkit doctor
```

En un proyecto con Git, use también `npx @pathbit/agentdevkit sync --check` para
conferir los apuntamientos. Sin Git, `doctor` Puede informar una espera de
reglas locales de Git. [Diagnóstico y sincronización][diagnostics]

Si ha elegido GitHub Packages, use el mismo prefijo `npx
--registry=https://npm.pkg.github.com` En estas órdenes. Para fijar una versión,
añadirla al nombre del paquete. Utilice la misma versión para simular, aplicar y
verificar. Consulte `npx @pathbit/agentdevkit next` Para retomar el objetivo del
proyecto. Prepare [las herramientas](prerequisites.md#despu%C3%A9s-de-instalar-el-kit)
Cuando la tarea exija.

### Simular en un proyecto existente

En la raíz del proyecto, use el mismo idioma y cliente en la simulación y en la
aplicación. En este ejemplo, el cliente es Codex:

```console
npx @pathbit/agentdevkit init --lang es --agents codex --dry-run
```

El plan lista cambios y conflictos. Añada `--json` Para consultar la lista
completa y los motivos de preservación. Después de la revisión, ejecute lo mismo
`init` sin `--dry-run`. Para instalar solo las instrucciones compartidas, use
`--agents none` en las dos órdenes. Si el kit ya está instalado, simule
[`update`](#actualizar-y-elegir-agentes). En un monorepo, elija la raíz donde
el equipo mantiene las instrucciones y abra el agente en ese mismo directorio.

### Usar hub solo en el checkout local

Usa `init --local` para mantener el hub `.pbai4devs` en tu copia local. El
kit añade una regla en `.pbai4devs/.gitignore`. Esto ayuda cuando un validador
usa Git para listar los archivos del proyecto. Desde la carpeta del proyecto,
simula la instalación.

```console
npx @pathbit/agentdevkit init --local --agents none --lang es --dry-run
```

Revisa el plan y repite el comando sin `--dry-run`. El mismo `init --local`
activa el modo en una instalación existente. Ejecuta `doctor` y `sync --check`
desde la misma carpeta para comprobar el resultado. `update` y `sync`
conservan la opción guardada.

La regla incluye archivos aún no rastreados dentro de `.pbai4devs`. El índice,
la configuración y el `.gitignore` de la raíz del proyecto se conservan. Los
archivos ya rastreados continúan rastreados. `AGENTS.md`, archivos de clientes y
artefactos de prueba dependen de las reglas del proyecto y pueden aparecer en
`git status`.

## Lo que está en el proyecto

| Contenido | Tratamiento |
| --- | --- |
| `.pbai4devs` con recursos y plantillas | Fuente compartida del kit. |
| Recursos en los clientes | Apuntamientos locales; pueden aparecer en Git. |
| Entradas de raíz creadas por el kit | Archivos locales generados. |
| Índices, manifiesto y selección | Derivados locales; ve el ignore del kit. |
| Archivos humanos | Compruebe el plan y los límites a continuación. |
| Descargas y resultados de pruebas | Locales; comprueba las reglas del proyecto. |
| `.pbai4devs/LICENSE` | Licencia MIT del kit, copiada del paquete. |

Las actualizaciones preservan ACLs y atributos extendidos soportados por la
copia nativa de la plataforma. En macOS, ACLs que niegan escritura, flags de
protección y metadados cuya lectura falla continúan bloqueando la alteración. La
verificación de directorios, cambios simultáneos y ACLs en Windows tiene
límites; compruebe [conflictos y copias de
seguridad](troubleshooting.md#conflictos-y-copias-de-seguridad) Antes de restaurar.

El generador completo permanece en el paquete npm. Él no copia `bin/`, `src/`,
`scripts/release/` o las pruebas del producto para el proyecto atendido.
Instalar el kit no inicia una aplicación ni instala todas las herramientas. La
licencia existente en la raíz del proyecto no se sustituye. La copia del hub
identifica la licencia de los recursos de AgentDevKit, sin redefinir la del
proyecto.

## Git y migración

El ignore de `.pbai4devs` controla solo su propio árbol. El kit preserva la
configuración Git, el índice y las reglas de ignore del proyecto. Apuntamientos,
resultados y archivos privados pueden aparecer en Git. Antes de añadirlos,
compruebe el estado y ajuste las reglas del proyecto.

Al actualizar o sincronizar, el kit migra el bloque de exclusiones de 0.0.21
Cuando comprueba su contenido y hay una sola obra. Elimina la marca y las
duplicatas del bloque, preserva el orden de las reglas efectivas y guarda el
original en `.agent-tests/agentdevkit/ignore-migrations/`. Bloques alterados o
compartidos quedan pendientes para revisión. `doctor` e `sync --check` También
apuntan credenciales visibles y artefactos ya rastreados.

Ignorar no elimina archivos ya rastreados. El equipo decide cómo ajustar el
seguimiento. `--dry-run` e `sync --check` No alteran el índice.

## Actualizar y elegir agentes

Utilice la versión deseada del paquete para planificar y aplicar la
actualización. Por ejemplo, para usar la versión marcada como `latest` npm:

```console
npx @pathbit/agentdevkit@latest update --dry-run --json
```

Revise `plan`, `conflicts` e `preserved`. Después de la revisión, aplique el
plan usando la versión indicada en el campo `version` la respuesta JSON. Al
mando siguiente, reemplace `VERSÃO` el número mostrado:

```text
npx @pathbit/agentdevkit@VERSÃO update
```

Use `doctor` y con Git, `sync --check` Después de la actualización.

La selección guardada sigue siendo válida. Para ajustarla, consulte `agents`,
entonces use `agents add cursor` para añadir o `agents remove cursor` Para
retirar solo ese cliente. `agents codex,claude` sustituye la lista completa y
`agents none` Solo mantiene los recursos compartidos. Los cambios de selección
aceptan `--dry-run`.

`E_UPGRADE` indica que el formato necesita scripts locales actualizados. Si el
plan apunta un script propio, lo concilie con la versión del paquete antes de
aplicar el cambio de selección. `sync` Utiliza las fuentes ya instaladas y no
baja una nueva versión. Consulte [referencia de CLI](cli.md) Para todos los
comandos.

Para actualizar instalaciones con carpetas antiguas de Antigravity, Kimi o
Gemini CLI, consulte a [migración de clientes][migracao].

## Preservación de archivos

Skills y otros recursos propios pueden coexistir con los del kit. Un nombre
igual no comprueba propiedad: contenido humano y archivos adicionales no deben
ser descartados para reconstruir apuntamientos. Remociones automáticas se
restringen a archivos obsoletos cuya propiedad puede ser comprobada. `--force`
no autoriza sustituir contenido propio; las copias de seguridad se quedan en
`.agent-tests/` y deben ser revisados cuando haya reparación administrada.

En entradas como `AGENTS.md` o `CLAUDE.md` y en recursos nativos compatibles, el
kit puede añadir una referencia delimitada:

```markdown
<!-- BEGIN AGENTDEVKIT -->
Leia e siga [origem](caminho/para/.pbai4devs/recurso.md).
<!-- END AGENTDEVKIT -->
```

El texto y el frontmatter humanos permanecen; la referencia usa el camino real
del recurso. Un archivo que no puede recibir el bloque se conserva e informado,
sin prometer la adición del apuntamento. Repetir la operación no duplica el
bloque. Edite sus instrucciones fuera del bloque generado. Nombres de entradas
con caja diferente son reaprovechados cuando hay una sola opción. Configuración
que no son instrucciones no reciben una mezcla arbitraria. Archivos mixtos no
pasan a pertenecer al kit. Su visibilidad para Git también depende de la regla
aplicada a la carpeta del cliente.

Los enlaces simbólicos preexistentes se conservan sin cruzarlos. El campo
`preserved` lista caminos propios encontrados en la planificación o en
colisiones, sin inventariar rutas no examinadas. La ausencia de un camino no
prueba que fue verificado o preservado. Un formato no soportado o un bloque
alterado es informado; `--force` No permite borrar instrucciones humanas para
reconstruir un apuntamiento.

Esta preservación no permite intercambiar archivos administrados por enlaces.
Links en caminos ya pertenecientes al kit, no hub, en el estado o en
herramientas siguen sujetos a la negativa de seguridad. Ningún enlace humano es
adoptado como propiedad del kit, y `--force` No lo sustituye.

Los archivos humanos siguen perteneciendo al equipo, incluso cuando contienen un
enlace. Si una actualización falla, el kit preserva el estado parcial y muestra
cómo consultar el diario y comparar el proyecto con la copia anterior. Siga el
[procedimiento de recuperación](troubleshooting.md#retomar-despu%C3%A9s-de-una-interrupci%C3%B3n)
antes de reanudar la operación.

O [flujo de trabajo](workflow.md) orienta la próxima etapa del proyecto. Si hay
error, consulte [solución de problemas](troubleshooting.md).

[Wiki](../README.md) · [Spec de seguridad][spec]

[bootstrap]: ../kit/scripts/preparar-ferramentas/BOOTSTRAP.md
[clients]: ../kit/COMPATIBILIDADE.md
[diagnostics]: cli.md#diagn%C3%B3stico-y-sincronizaci%C3%B3n
[migracao]: ../kit/COMPATIBILIDADE.md#migrar-carpetas-legadas
[spec]: ../specs/security-ecosystem/SPEC.md
[tokens]: https://github.com/settings/tokens
[github-auth]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages

[reading-pt]: ../../guides/installation.md
[reading-en]: ../../en/guides/installation.md
[reading-es]: installation.md
