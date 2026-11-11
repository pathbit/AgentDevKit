---
description: Instrucciones y herramientas portátiles para agentes de desarrollo.
language: es
---

# AgentDevKit

[Português](README.md) · [English](README.en.md)

Organiza el trabajo con agentes de código, desde la planificación hasta la
verificación. Mantén skills, reglas, comandos y perfiles en `.pbai4devs`;
el kit genera las referencias de cada [cliente compatible][clients].
Las fuentes viven en `.pbai4devs`; las carpetas, entradas y preferencias
generadas son locales y no se versionan.

## Empezar en tu proyecto

Con Node.js 18+ y npm, abre una terminal en tu proyecto y ejecuta:

```console
npx --yes --ignore-scripts https://github.com/pathbit/AgentDevKit/releases/download/v0.0.3/agentdevkit-0.0.3.tgz
```

Elige tus agentes en la pregunta inicial o usa `--agents codex,claude`.
La selección se guarda en el proyecto; `agents` permite consultarla o cambiarla.
Sin interacción ni selección anterior, el valor predeterminado es `all`.

Después, abre el proyecto en tu agente y pide:

> Lee AGENTS.md y usa la skill proximos-passos para orientar mi trabajo.

La [guía de instalación](docs/installation.md) incluye Windows, Node ausente,
simulación y actualización. La [release v0.0.3][release] no requiere una
instalación global. La CLI guarda el idioma `pt`, `en` o `es` por proyecto.

## Explorar

| Quiero… | Leer |
| --- | --- |
| Entender el kit | [Wiki](docs/README.md) |
| Planificar o retomar un proyecto | [Flujo](docs/workflow.md) |
| Crear una skill o comando | [Recursos](docs/resources.md) |
| Instalar herramientas y verificar | [Herramientas y pruebas][tests] |
| Consultar opciones o resolver un error | [CLI][cli] · [Soluciones][help] |
| Mejorar el kit | [Contribuir](CONTRIBUTING.md) |

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
[release]: https://github.com/pathbit/AgentDevKit/releases/tag/v0.0.3
[tests]: docs/tools-and-testing.md
[cli]: docs/cli.md
[help]: docs/troubleshooting.md
[issues]: https://github.com/pathbit/AgentDevKit/issues/new/choose
