---
description: "Guía rápida para desarrollar y validar AgentDevKit."
language: es
---

# Desarrollar AgentDevKit

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Comience con Git, Node.js 24+ y npm. `npm ci` Eliminado `node_modules` antes de
instalar; preserve cualquier contenido local de esta carpeta. En la raíz del
checkout:

```console
git switch develop
npm ci --ignore-scripts
npm run check
npm test
```

`develop` recibe los cambios en la integración. `main` es la branch estándar y
origen de las releases. Ambas ejecutan el CI. La automatización de publicación
depende del push aprobado en `main` y la versión del paquete.

`npm run check` confiere estructura y enlaces. Para incluir lint Markdown,
prepare `markdownlint-cli2` el [script de
herramientas](../kit/scripts/preparar-ferramentas/README.md). El
perfil `npm run verify` prepara la herramienta antes del chequeo.

## Ambiente Compose

La aplicación es una CLI: cada ejecución termina y no abre puerta ni mantiene
servicio, banco o volumen. Para ejecutarla CLI local en Linux aislado, instale
Docker con Compose y GNU Make y proporciona la imagen una vez:

```console
docker pull node:24-bookworm
make doctor
make up
```

Sin Make, consulte la ayuda de CLI con:

```console
cd infra/compose
docker compose -p adk-cli -f compose.local.yml run --rm --pull never cli
```

En Windows, use Docker Desktop configurado para contenedores Linux; esta
configuración todavía necesita ser verificada en este sistema.

`make up` imprime la versión usando la imagen local, sin descargar durante la
ejecución. El checkout está montado solamente para lectura, sin red en el
contenedor; el contenido del checkout queda legible al proceso dentro de él. El
montaje permite consultas, pero no cambios en el checkout. El comando no prueba
el paquete publicado. No hay servicio persistente o healthcheck a esperar: `make
down` e `make logs` explican este ciclo sin eliminar recursos Docker.

`make setup` verifica los prerrequisitos y usa `npm ci --ignore-scripts`. Se
niega a ejecutar si `node_modules` Ya existe, para evitar su remoción. Los
objetivos Make exigen un shell POSIX. `make lint`, `make test` e `make build`
envían a las órdenes npm arriba. El build graba en
`.agent-tests/release/<versão>/`; el blanco rechaza una carpeta de la misma
versión existente. Revise y preserve el artefacto anterior en otro lugar antes
de ejecutar otro build. La verificación del Makefile no es atómica: evite otros
procesos de build simultáneos. `npm run build` e `npm run verify` No usan esa
protección de Make: reutilizan una salida equivalente o niegan una divergencia,
preservando la carpeta anterior. Después de verificar el paquete, `verify` crea
una copia marcada en directorio exclusivo en `.agent-tests/release/` o en
`RUNNER_TEMP`, cuando se define. Revise las copias y los residuos antes de
eliminarlos. El archivo `.dockerignore` limita futuros contextos de build; no
filtra el contenido de un montaje bind del Compose. Patrones amplios como `tmp`,
`temp` y directorios `playwright*` También excluyen código con estos nombres en
el contexto.

## Donde trabajar

| Carpeta | Contenido |
| --- | --- |
| [`src/`](../src/README.md) | Código del CLI y el instalador. |
| [`bin/`](../bin/README.md) | Ejecutable del paquete. |
| [`tests/`][tests] | Pruebas del producto. |
| [`scripts/`][scripts] | Verificación, build y publicación. |
| [`examples/`][examples] | Ejemplos para estudiar el resultado. |
| [`.pbai4devs/`](../kit/README.md) | Recursos compartidos de los agentes. |
| [`docs/`](../README.md) | Guías, decisiones y especificaciones. |

El ejecutable en `bin/` comprueba runtime antes de cargar la entrada en
`src/cli.mjs`. A CLI aplica la barrera de recuperación antes de despachar las
operaciones. `src/install.mjs` expone la planificación y la aplicación usadas
por CLI y las pruebas. Vea la [arquitectura de módulos][architecture].

Al cambiar una orden, compruebe argumentos, ayuda, salida JSON e idiomas. Al
cambiar una utilidad de propiedad, publicación o recuperación en
`.pbai4devs/scripts/lib/`, vea el flujo de la CLI e o [Sincronizar
instalado][sync].

## Elija la siguiente acción

| Objetivo | Orden |
| --- | --- |
| Conocer órdenes de CLI local | `npm run cli -- --help` |
| Generar ejemplos a partir de las fuentes publicables | `npm run examples` |
| Ejecutar ocho escenarios de ejemplo | `npm run test:examples` |
| Conferir recursos y documentación | `npm run check` |
| Prueba del producto | `npm test` |
| Comprobar todo y el paquete real | `npm run verify` |
| Generar sólo el tarball, preservando una release existente | `make build` |

`generate` Es un alias para generar los ejemplos. `agents:sync` sincroniza una
configuración local de agentes del propio checkout cuando se adopta de forma
explícita. Las órdenes npm de ejemplos utilizan las fuentes publicables del hub.
Para evaluar la selección de un proyecto, ejecute el [script de
madurez][maturity] instalado en él.

Edite fuentes y plantillas, no los archivos generados. Pruebas y fixtures entran
en Git; informes y cachés se encuentran locales. Los ejemplos generados van a
una carpeta temporal fuera de Git. Antes de enviar un cambio, siga
[contribución](../CONTRIBUTING.md) e a [revisión de entrega][review]. A
[publicación](maintenance.md) reaprovecha el artefacto aprobado por el CI.

[Wiki](../README.md) · [Ejemplos][examples]

[review]: ../kit/commands/revisar-entrega/COMMAND.md
[architecture]: ../src/README.md
[sync]: ../kit/scripts/sincronizar-agentes/README.md
[maturity]: ../kit/scripts/testar-maturidade/README.md
[tests]: ../tests
[scripts]: ../scripts
[examples]: ../examples

[reading-pt]: ../../maintainers/development.md
[reading-en]: ../../en/maintainers/development.md
[reading-es]: development.md
