---
description: Instrucciones y herramientas portátiles para agentes de desarrollo.
language: es
---

# AgentDevKit

[Português](README.md) · [English](README.en.md) · [Paquete npm][npm-package]

[![npm][npm-badge]][npm-package] [![MIT][license-badge]](LICENSE)

AgentDevKit orienta el trabajo con agentes de código, desde la planificación
hasta la verificación. Skills, reglas, comandos y perfiles comparten una
fuente en `.pbai4devs`. El kit genera referencias para [Codex, Claude, Cursor,
Copilot, OpenCode y otros clientes compatibles][clients].

## Empezar en tu proyecto

Prepara [Node.js 24+ y npm][prerequisites] en Windows, macOS o Linux. Abre la
terminal en la carpeta del proyecto. Si ya tiene archivos, [simula la
instalación][preview] para revisar los cambios. Instala desde el **npm público**,
sin iniciar sesión:

```console
npx @pathbit/agentdevkit init
```

El asistente inicial pregunta por el idioma, los clientes y el objetivo. Si ya
sabes qué clientes usas, indica `--agents codex,claude`. Sin una selección
explícita o guardada, `none` prepara los recursos compartidos y `AGENTS.md`
sin crear carpetas de clientes. El proyecto guarda la selección y la CLI
admite `pt`, `en` y `es`. Consulta
las [opciones de instalación][install], que incluyen pnpm, Yarn, Bun y
[GitHub Packages con autenticación][github-install].

En un proyecto con Git, comprueba la instalación y la sincronización:

```console
npx @pathbit/agentdevkit doctor
npx @pathbit/agentdevkit sync --check
```

## Elige qué quieres hacer

| Quiero… | Ejecuta en la terminal |
| --- | --- |
| Planificar el producto | `npx @pathbit/agentdevkit next --intent product` |
| Ejecutar la aplicación | `npx @pathbit/agentdevkit next --intent run` |
| Documentar el sistema | `npx @pathbit/agentdevkit next --intent document` |
| Inventariar antes de instalar | `npx @pathbit/agentdevkit document` |

`next` sugiere una acción. Pide a tu agente que lea `AGENTS.md` y use la skill
`proximos-passos` con tu objetivo. La [guía de flujo][workflow] explica cómo
empezar en cada caso.

## Actualizar y personalizar

- **Revisar y actualizar.** Consulta [cómo simular y aplicar un `update`][update].
  Usa `sync` para regenerar referencias con los recursos ya instalados.
- **Cambiar los clientes.** Consulta la selección con `agents` y ajusta los
  IDs con `agents add <id>` o `agents remove <id>`. Consulta la [CLI][cli].
- **Elegir herramientas opcionales.** Ejecuta
  `npx @pathbit/agentdevkit plugins list` y consulta la [guía de plugins][plugins].
- **Reutilizar documentos de otro flujo.** Usa `next --integrations` para
  localizar referencias en el proyecto. Consulta la [guía comparativa][comparison].

## Explorar

| Quiero… | Leer |
| --- | --- |
| Conocer los conceptos y encontrar una guía | [Documentación](docs/README.md) |
| Mejorar documentación existente | [Inventario y complementos](docs/guides/documentation.md) |
| Crear una skill o comando | [Recursos](docs/guides/resources.md) |
| Elegir un flujo según el objetivo | [Recursos en la práctica](docs/guides/recursos-na-pratica.md) |
| Instalar herramientas y verificar | [Herramientas y pruebas][tests] |
| Revisar seguridad con herramientas locales | [Seguridad local](docs/guides/security.md) |
| Consultar opciones o resolver un error | [CLI][cli] · [Soluciones][help] |
| Mejorar el kit | [Contribuir](CONTRIBUTING.md) |
| Probar los escenarios | [Ejemplos](https://github.com/pathbit/AgentDevKit/tree/main/examples) |

## Desarrollar este repositorio

Usa Node.js 24+ con npm. Ejecuta `npm ci --ignore-scripts`, `npm run check`,
`npm test` y `npm run examples`. Los ejemplos se generan en una carpeta temporal
del sistema fuera de Git; `npm run test:examples` ejecuta los escenarios.
Consulta la [guía de desarrollo](docs/maintainers/development.md) para conocer
la estructura.

Las guías detalladas están en portugués. Las herramientas locales se
instalan por separado. Los [artefactos y sumas de la versión][release]
permiten comprobar el paquete publicado en [ambos registros][packages].

## Licencia y autoría

Mantenido por [PathBit](https://www.pathbit.com.br),
con licencia [MIT](LICENSE).
La instalación incluye la licencia del kit en `.pbai4devs/LICENSE` y conserva
la licencia y los archivos propios de tu proyecto.

[Changelog](CHANGELOG.md) · [Roadmap](docs/product/roadmap.md)
· [Plugins y créditos](docs/guides/plugins.md)

¿Encontraste un problema o tienes una idea? [Abre una issue][issues] con los
formularios. Consulta [cómo participar](docs/maintainers/community.md).

[clients]: .pbai4devs/COMPATIBILIDADE.md
[release]: https://github.com/pathbit/AgentDevKit/releases/latest
[npm-package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[npm-badge]: https://img.shields.io/npm/v/%40pathbit%2Fagentdevkit
[license-badge]: https://img.shields.io/badge/license-MIT-blue
[tests]: docs/guides/tools-and-testing.md
[cli]: docs/guides/cli.md
[help]: docs/guides/troubleshooting.md
[issues]: https://github.com/pathbit/AgentDevKit/issues/new/choose
[packages]: docs/maintainers/packages.md
[prerequisites]: docs/guides/prerequisites.md
[install]: docs/guides/installation.md
[preview]: docs/guides/installation.md#simular-em-um-projeto-existente
[update]: docs/guides/installation.md#atualizar-e-escolher-agentes
[workflow]: docs/guides/workflow.md
[plugins]: docs/guides/plugins.md
[comparison]: docs/guides/comparacao.md
[github-install]: docs/guides/installation.md#github-packages
