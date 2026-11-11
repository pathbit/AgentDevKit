---
description: Instrucciones y herramientas portátiles para agentes de desarrollo.
language: es
---

# AgentDevKit

[Português](README.md) · [English](README.en.md)

Instala skills, reglas, comandos y perfiles de agentes desde una sola fuente:
`.pbai4devs`. Sirve para proyectos nuevos o existentes e indica los próximos
pasos según el estado actual del proyecto.

## Empezar

Requiere Node.js 24+. Desde este checkout:

```sh
node bin/agentdevkit.mjs init --target ../mi-proyecto --lang es
node bin/agentdevkit.mjs next --target ../mi-proyecto
```

Sin Node, pida al agente preparar el runtime con el
[bootstrap del checkout](.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.md)
y continuar la instalación. `npx` también requiere Node/npm.

Use la distribución `v0.0.1` sin una instalación global:

```sh
RELEASE=https://github.com/pathbit/AgentDevKit/releases/download/v0.0.1
npx --yes --ignore-scripts \
  --package="$RELEASE/agentdevkit-0.0.1.tgz" agentdevkit init --lang es
```

Consulte [instalación y actualización](docs/installation.md). La CLI admite
`pt`, `en` y `es` y guarda el idioma en el proyecto. Use `--dry-run` para revisar
los cambios y `--json` para automatizaciones.

## Flujo

Preparación → PRD → UX/diseño → configuración → specs → implementación → revisión.
Los proyectos existentes mantienen su trabajo. Instalar instrucciones no crea
documentos de producto ni instala herramientas. El descubrimiento depende del
cliente; una referencia no demuestra que el agente la haya cargado.

## Desarrollar

```sh
npm test
npm run test:infra
npm run check
```

[Documentación](docs/README.md) · [Requisitos](docs/prd.md) ·
[Diseño](docs/design.md) · [Roadmap](docs/roadmap.md) · [Licencia MIT](LICENSE)

**[ Próximo paso ]** Instale en su proyecto:

```sh
node bin/agentdevkit.mjs init --target ../mi-proyecto --lang es
```
