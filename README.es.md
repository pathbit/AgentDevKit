---
description: Instrucciones y herramientas portátiles para agentes de desarrollo.
language: es
---

# AgentDevKit

[Português](README.md) · [English](README.en.md) · [Paquete npm][npm-package]

[![npm][npm-badge]][npm-package] [![MIT][license-badge]](LICENSE)

Organiza el trabajo con agentes de código, desde la planificación hasta la
verificación. Mantén skills, reglas, comandos y perfiles en `.pbai4devs`;
el kit genera las referencias de cada [cliente compatible][clients].
El código vive en `src/`, las pruebas del producto en `tests/` y los recursos
compartidos en `.pbai4devs/`. Las carpetas, entradas y preferencias generadas
son locales y no se versionan.

## Empezar en tu proyecto

Con Node.js 18+ y npm, ejecuta en tu proyecto, sin iniciar sesión:

```console
npx @pathbit/agentdevkit init
```

Elige tus agentes en la pregunta inicial o usa `--agents codex,claude`.
La selección se guarda en el proyecto; `agents` permite consultarla o cambiarla.
Sin interacción ni selección anterior, el valor predeterminado es `all`.

Después, abre el proyecto en tu agente y pide:

> Lee AGENTS.md y usa la skill proximos-passos para orientar mi trabajo.

La [guía de instalación](docs/guides/installation.md) incluye Windows, Node ausente,
simulación y actualización. Instala y actualiza mediante el
[paquete npm público][packages];
la [release v0.0.6][release] conserva artefactos y checksums para verificarlos.
No requiere instalación global.
La CLI guarda el idioma `pt`, `en` o `es` por proyecto.

## Explorar

| Quiero… | Leer |
| --- | --- |
| Entender el kit | [Wiki](docs/README.md) |
| Planificar o retomar un proyecto | [Flujo](docs/guides/workflow.md) |
| Crear una skill o comando | [Recursos](docs/guides/resources.md) |
| Instalar herramientas y verificar | [Herramientas y pruebas][tests] |
| Consultar opciones o resolver un error | [CLI][cli] · [Soluciones][help] |
| Mejorar el kit | [Contribuir](CONTRIBUTING.md) |
| Probar los escenarios | [Ejemplos](https://github.com/pathbit/AgentDevKit/tree/master/examples) |

## Desarrollar este repositorio

Usa Node.js 24+ con npm. Ejecuta `npm ci --ignore-scripts`, `npm run check`,
`npm test` y `npm run examples`. Los ejemplos se generan localmente en
`examples/generated/`; `npm run test:examples` ejecuta los escenarios.
Consulta la [guía de desarrollo](docs/maintainers/development.md) para conocer
la estructura.

Las guías detalladas están en portugués. Instalar el kit prepara instrucciones;
las herramientas se instalan por separado. Los documentos de producto siguen
las decisiones de planificación. Los proyectos existentes conservan su código.
Una referencia no demuestra que un cliente haya cargado la skill.

## Licencia y autoría

Mantenido por [PathBit](https://www.pathbit.com.br),
con licencia [MIT](LICENSE).
La instalación incluye la licencia del kit en `.pbai4devs/LICENSE` y conserva
la licencia y los archivos propios de tu proyecto.

[Changelog](CHANGELOG.md) · [Roadmap](docs/product/roadmap.md)

¿Encontraste un problema o tienes una idea? [Abre una issue][issues] con los
formularios. Consulta [cómo participar](docs/maintainers/community.md).

**[ Próximo paso ]** Sigue la [instalación](docs/guides/installation.md) y pide
al agente que lea `AGENTS.md`.

[clients]: .pbai4devs/COMPATIBILIDADE.md
[release]: https://github.com/pathbit/AgentDevKit/releases/tag/v0.0.6
[npm-package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[npm-badge]: https://img.shields.io/npm/v/%40pathbit%2Fagentdevkit
[license-badge]: https://img.shields.io/badge/license-MIT-blue
[tests]: docs/guides/tools-and-testing.md
[cli]: docs/guides/cli.md
[help]: docs/guides/troubleshooting.md
[issues]: https://github.com/pathbit/AgentDevKit/issues/new/choose
[packages]: docs/maintainers/packages.md
