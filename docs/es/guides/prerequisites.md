---
description: "Instalar Node.js y npm en Windows, macOS o Linux antes de usar el kit."
language: es
---

# Prerrequisitos

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Instale **Node.js 24+ con npm**. El npm incluye la orden `npx`, que ejecuta
AgentDevKit sin instalación global. Use runtime y el administrador de paquetes
que su proyecto ya usa para compilar y probar la aplicación. Git es opcional
para instalar el kit.

## Consulte antes de instalar

En el terminal de la computadora o del agente, ejecute:

```console
node --version
npm --version
npx --version
```

Con Node 24+ y los tres comandos funcionando, siga el [comienzo
rápido](../../../README.es.md#inicio-r%C3%A1pido) o ver los [métodos de
instalación](installation.md#instalar). Utilice el mismo entorno en el que
abrirá el proyecto: Windows y WSLPor ejemplo, tienen instalaciones separadas.

## Windows

Use **Node.js 24.13.1 la serie 24 o posterior LTS**o Node.js LTS 26 o posterior.
Estas series incluyen la corrección de remoción en caminos Windows con acentos.
Consulte la versión antes de ejecutar el kit. [Notas del Node.js
24.13.1][node-unicode].

En PowerShell, con [WinGet][winget] disponible:

```powershell
winget install --id OpenJS.NodeJS.LTS --exact --source winget
```

Sin WinGet, abra el [descarga oficial del Node.js][node], seleccione una versión
LTS compatible y use el instalador Windows `.msi` de su arquitectura. Mantenga
npm y la inclusión en PATH habilitados. Cierre y reabra el terminal; en VS Code,
reabra también el terminal integrado. Repita los tres comandos arriba.

## macOS

No [descarga oficial][node], seleccione Node LTS 24 o superior y el instalador
macOS `.pkg`. Concluya la instalación, reabra el terminal y compruebe las
versiones. El instalador incluye npm y npx.

Si ya usa Homebrew, puede mantener ese flujo:

```sh
brew install node@24
export PATH="$(brew --prefix node@24)/bin:$PATH"
```

La segunda línea vale para el terminal actual. Para otros terminales, siga las
instrucciones de PATH Muestras por Homebrew; no reemplace su perfil entero. Vea
[fórmula oficial][brew].

## Linux

En Bash o Zsh, use el [nvm][nvm] Para instalar Node 24 en su usuario. Em
Debian/Ubuntu, prepare las dependencias si faltan:

```sh
sudo apt-get update
sudo apt-get install -y curl ca-certificates tar xz-utils
```

En otra distribución, instale los equivalentes por su administrador de paquetes.
Ejecute el instalador oficial de nvm y luego instale Node:

```sh
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/install.sh | bash
```

Reabra la terminal para cargar nvm; entonces ejecute:

```sh
nvm install 24
nvm use 24
```

nvm configura el perfil de su usuario e incluye npm/npx con Node. En Alpine u
otra distribución con musl, confirme el soporte de la versión y arquitectura en
[descarga oficial][node]; no use un binario glibc en ese ambiente.

## Preparados con ayuda del agente

También puedes pedir en la aplicación o terminal de tu agente:

> Echa un vistazo a Node, npm y npx en este ambiente. Si faltan, instale Node
> 24+ por
> mecanismo adecuado para mi sistema, preserve la configuración existente y
> continúe hasta validar las tres órdenes. Después me ayude a elegir npm o
> GitHub Packages y los agentes que usaré en este proyecto.

El agente necesita acceso a la terminal, a la red y a los permisos de
instalación del sistema. Sin Node/npm, o `npx` Aún no puede ejecutar el kit. El
launcher acepta Node 18 para preparar un runtime local. Versiones afectadas en
Windows pueden reutilizar una caché compatible. Para instalar un runtime desde
una de estas versiones, utilice el administrador del sistema.

O [bootstrap del kit][bootstrap] usa `tar` nativo cuando necesita descargar un
runtime, verifica el checksum y no altera el PATH permanentemente.

## Después de instalar el kit

Elija las herramientas necesarias para la tarea. Para preparar y verificar solo
lint Markdown, por ejemplo:

```console
npx @pathbit/agentdevkit plugins info markdownlint-cli2
npx @pathbit/agentdevkit plugins install markdownlint-cli2
npx @pathbit/agentdevkit plugins check markdownlint-cli2
```

Para usar GitHub Packages, añade `--registry=https://npm.pkg.github.com` antes
del nombre del paquete, como en el [guía de
instalación](installation.md#github-packages). O [guía de
complementos](plugins.md) explica cómo elegir un elemento por el ID. `tools
setup` prepara y verifica las herramientas compatibles de una selección. `tools
setup base` limita la preparación al navegador y lint. La instalación de los
CLIs no instala navegadores, FFmpeg ni concede permisos de escritorio; vea los
requisitos de la tarea en [herramientas y pruebas](tools-and-testing.md).

[Wiki](../README.md) · [Instalar el kit](installation.md)

[node]: https://nodejs.org/en/download
[node-unicode]: https://nodejs.org/en/blog/release/v24.13.1
[winget]: https://learn.microsoft.com/en-us/windows/package-manager/winget/install
[brew]: https://formulae.brew.sh/formula/node@24
[nvm]: https://github.com/nvm-sh/nvm#installing-and-updating
[bootstrap]: ../kit/scripts/preparar-ferramentas/BOOTSTRAP.md

[reading-pt]: ../../guides/prerequisites.md
[reading-en]: ../../en/guides/prerequisites.md
[reading-es]: prerequisites.md
