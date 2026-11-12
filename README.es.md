---
description: Instrucciones y herramientas portátiles para agentes de desarrollo.
language: es
---

# AgentDevKit

[Português](README.md) · [English](README.en.md) · [Paquete npm][npm-package]

Organiza el trabajo con agentes de código, desde la planificación hasta la
verificación. Mantén skills, reglas, comandos y perfiles en `.pbai4devs`;
el kit genera las referencias de cada [cliente compatible][clients].
El código vive en `src/`, las pruebas del producto en `tests/` y los recursos
compartidos en `.pbai4devs/`. Las carpetas, entradas y preferencias generadas
son locales y no se versionan.

## Empezar en tu proyecto

Con Node.js 18+ y npm, [inicia sesión en GitHub Packages][packages].
Después abre una terminal en tu proyecto y ejecuta:

```console
npx -y --registry=https://npm.pkg.github.com @pathbit/agentdevkit@0.0.5 init
```

Elige tus agentes en la pregunta inicial o usa `--agents codex,claude`.
La selección se guarda en el proyecto; `agents` permite consultarla o cambiarla.
Sin interacción ni selección anterior, el valor predeterminado es `all`.

Después, abre el proyecto en tu agente y pide:

> Lee AGENTS.md y usa la skill proximos-passos para orientar mi trabajo.

La [guía de instalación](docs/installation.md) incluye Windows, Node ausente,
simulación y actualización. GitHub Packages exige autenticación incluso para
paquetes npm públicos. Instala y actualiza mediante el paquete del registro;
la [release v0.0.5][release] conserva artefactos y checksums para verificarlos.
No requiere instalación global.
La CLI guarda el idioma `pt`, `en` o `es` por proyecto.

## Explorar

| Quiero… | Leer |
| --- | --- |
| Entender el kit | [Wiki](docs/README.md) |
| Planificar o retomar un proyecto | [Flujo](docs/workflow.md) |
| Crear una skill o comando | [Recursos](docs/resources.md) |
| Instalar herramientas y verificar | [Herramientas y pruebas][tests] |
| Consultar opciones o resolver un error | [CLI][cli] · [Soluciones][help] |
| Mejorar el kit | [Contribuir](CONTRIBUTING.md) |
| Probar los escenarios | [Ejemplos](https://github.com/pathbit/AgentDevKit/tree/master/examples) |

## Desarrollar este repositorio

Usa Node.js 24+ con npm. Ejecuta `npm ci --ignore-scripts`, `npm run check`,
`npm test` y `npm run examples`. Los ejemplos se generan localmente en
`examples/generated/`; `npm run test:examples` ejecuta los escenarios.
Consulta la [guía de desarrollo](docs/development.md) para conocer la estructura.

Las guías detalladas están en portugués. Instalar el kit prepara instrucciones;
las herramientas se instalan por separado. Los documentos de producto siguen
las decisiones de planificación. Los proyectos existentes conservan su código.
Una referencia no demuestra que un cliente haya cargado la skill.

[Changelog](CHANGELOG.md) · [Roadmap](docs/roadmap.md) · [Licencia MIT](LICENSE)

¿Encontraste un problema o tienes una idea? [Abre una issue][issues] con los
formularios. Consulta [cómo participar](docs/community.md).

**[ Próximo paso ]** Sigue la [instalación](docs/installation.md) y pide al
agente que lea `AGENTS.md`.

[clients]: .pbai4devs/COMPATIBILIDADE.md
[release]: https://github.com/pathbit/AgentDevKit/releases/tag/v0.0.5
[npm-package]: https://github.com/pathbit/AgentDevKit/pkgs/npm/agentdevkit
[tests]: docs/tools-and-testing.md
[cli]: docs/cli.md
[help]: docs/troubleshooting.md
[issues]: https://github.com/pathbit/AgentDevKit/issues/new/choose
[packages]: docs/packages.md
