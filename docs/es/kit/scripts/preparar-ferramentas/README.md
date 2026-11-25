---
description: "Instalación, actualización y ejecución de las herramientas locales."
language: es
---

# Preparación de herramientas

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

O [catálogo](../../tools/README.md) Los archivos son descubiertos por los
archivos `TOOL.json`.

## Primer uso

Pida al agente `instalar-ferramentas`. Él sigue el [preparación
automática](BOOTSTRAP.md): verifica Node/npm, instala runtime local cuando es
necesario y continúa solo hasta la validación de las herramientas. El
inicializador JavaScript acepta Node 18+ y prepara Node 24+ localmente. Sin
Node/npm, el agente usa el administrador del SO antes de ejecutar el kit. No hay
cambio permanente en el PATH ni scripts Bash o PowerShell.

Si Node 24+ con npm ya está disponible, también puede ejecutar directamente:

```sh
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs setup
```

`setup` reutiliza instalaciones sanas y ejecuta `check` para cada herramienta.
Acepta `base`, grupo o nombre; sin selección, usa `all`. Incompatibilidad en la
selección general se informa como no aplicable; pedir una de ellas por el nombre
fallo. instalação/verificação Se informan y regresan código 1. La selección
`all` omite herramientas con `optIn: true`. Use `setup workflow` para preparar
el grupo opcional o `install <nome>` para un elemento. Sin npm funcional, la
preparación para antes de cambiar las herramientas. Al mover el hub, preserve
sus carpetas `.local` e `.cache`; `setup` reutiliza los paquetes y crea accesos
rápidos locales ausentes con imports relativos. Si un archivo ocupa el destino
con contenido diferente, la acción informa el camino y preserva el archivo.

## Operaciones individuales

Con runtime disponible, ejecute la acción directamente. Si él falta, use `node
.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.mjs --runtime-only` y
reutilize el camino retornado; ese modo no instala herramientas.

En la raíz del repositorio:

```sh
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs list
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs install skills
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs update base
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs check all
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs unlock skills
```

`info <nome>` Muestra configuración y estado. `check <nome>` ejecuta el sondeo
de la instalación existente, y `run <nome> [argumentos]` llama la herramienta.
Sin acción, hay ayuda. Cada herramienta tiene una única entrada `SCRIPT.mjs`,
ejecutada con Node en cualquier sistema. Na CLI del kit instalado, `plugins
install <id>` e `plugins check <id>` También usan este gestor para una
herramienta a la vez.

`unlock <nome>` solo recupera un lock local con PID comprobadamente muerto.
Locks activos, de otro host o sin metadatos verificables se conservan. No acepta
grupos. Un lock ausente no crea archivos.

El requisito común es Node.js 24+ con npm. El administrador utiliza Node actual.
Paquetes npm usan el registro oficial con scripts de instalación desactivados.
Scanners nativos usan assets oficiales de GitHub con versión y SHA-256
revisados. `update` sigue `latest` en el npm y el pin del catálogo en los
escáneres nativos. Los dos caminos confieren integridad antes de ejecutar y
preservan la versión anterior si la actualización falla. Permisos de binarios
POSIX se aplican solamente a los caminos declarados en `executables` el
`TOOL.json`, antes del probe. Actualizaciones usan staging y preservan la
versión anterior en caso de fallo. Accesos rápidos locales niegan directorios y
archivos simbólicos antes de escribir. La preparación valida los CLIs.
Navegador, permisos desktop y FFmpeg dependen de la tarea; no inicia
aplicaciones ni concede permisos automáticamente. En el grupo `security`, la
base OSV También está separada de CLI. Utilice la orden [preparar
seguros](../../commands/preparar-seguranca/COMMAND.md) Para orientar la
instalación, actualización explícita de los datos y análisis offline.

Pruebas: `node --test .pbai4devs/scripts/preparar-ferramentas/tests/TEST.mjs`.
Después de instalar `skills`, `just-bash`, `opensrc`, `webreel` e `portless`,
ejecute `node .pbai4devs/scripts/preparar-ferramentas/tests/SMOKE_VERCEL.mjs`.
Prueba descubrimiento local, shell virtual y validación de guión; Portless
recibe probes. Video, proxy, TLS y descargas de fuentes no se ejercitan.
Informes se quedan en `.agent-tests/vercel-labs/`.

[reading-pt]: ../../../../../.pbai4devs/scripts/preparar-ferramentas/README.md
[reading-en]: ../../../../en/kit/scripts/preparar-ferramentas/README.md
[reading-es]: README.md
