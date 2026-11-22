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

Usa Node.js 24+ con npm. La [guía de requisitos][prerequisites] explica
la instalación en Windows, macOS y Linux.

Desde la carpeta de tu proyecto, instala mediante **npm**, sin iniciar sesión:

```console
npx @pathbit/agentdevkit init
```

Elige tus agentes en la pregunta inicial o usa `--agents codex,claude`.
El proyecto guarda la selección y puedes cambiarla con `agents`.
En modo no interactivo, `all` es el valor predeterminado si no hay una
selección explícita o guardada. La CLI admite `pt`, `en` y `es`. La
[guía de instalación](docs/guides/installation.md) cubre pnpm, Yarn, Bun y
[GitHub Packages con autenticación][github-install].

## Elige qué quieres hacer

- **Planificar un producto nuevo o un cambio.** Usa `next --intent product`
  para identificar el siguiente paso de planificación.
- **Ejecutar una aplicación existente.** Usa `next --intent run` para
  orientarte según el estado actual del proyecto.
- **Adoptar el kit para algunos clientes.** Usa `init --agents codex,claude`
  con los identificadores que necesites.

La instalación prepara los recursos de los agentes. En un repositorio
existente, `npx @pathbit/agentdevkit init --dry-run` muestra los cambios
previstos y los conflictos. El kit conserva las instrucciones y skills del
proyecto. Con Git, sigue las indicaciones de la terminal para `doctor` y
`sync --check` antes de consultar el siguiente paso según tu objetivo:

```console
npx @pathbit/agentdevkit next --intent product
npx @pathbit/agentdevkit next --intent run
```

`next` te propone un paso. Pide a tu agente que lea `AGENTS.md` y use la
skill `proximos-passos` con tu objetivo.

### Usa el flujo que pide la tarea

El AgentDevKit da a varios agentes un punto de partida común. Prepara el
proyecto y verifica la entrega con el kit, y aprovecha **BMad** para el
descubrimiento, **OpenSpec** o **GitHub Spec Kit** para las specs, **Tech Leads
Club** para planificar o **Dotcontext** (AI Context) para el contexto, según
la tarea. Si el proyecto ya tiene estos artefactos, ejecuta
`npx @pathbit/agentdevkit next --integrations` para localizar las referencias
reconocidas. Consulta la [guía comparativa](docs/guides/comparacao.md).

## Explorar

| Quiero… | Leer |
| --- | --- |
| Preparar Node.js y npm | [Requisitos][prerequisites] |
| Entender el kit | [Wiki](docs/README.md) |
| Planificar o retomar un proyecto | [Flujo](docs/guides/workflow.md) |
| Mejorar documentación existente | [Inventario y complementos](docs/guides/documentation.md) |
| Crear una skill o comando | [Recursos](docs/guides/resources.md) |
| Elegir un flujo según el objetivo | [Recursos en la práctica](docs/guides/recursos-na-pratica.md) |
| Instalar herramientas y verificar | [Herramientas y pruebas][tests] |
| Revisar seguridad con herramientas locales | [Seguridad local](docs/guides/security.md) |
| Consultar opciones o resolver un error | [CLI][cli] · [Soluciones][help] |
| Mejorar el kit | [Contribuir](CONTRIBUTING.md) |
| Probar los escenarios | [Ejemplos](https://github.com/pathbit/AgentDevKit/tree/master/examples) |

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
[github-install]: docs/guides/installation.md#github-packages
