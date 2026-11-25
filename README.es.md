---
description: "Instrucciones y herramientas portátiles para agentes de desarrollo."
language: es
---

# AgentDevKit

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

[Paquete npm][npm-package]

[![npm][npm-badge]][npm-package] [![MIT][license-badge]](LICENSE)

AgentDevKit ayuda a los agentes de código a entender tu proyecto, planificar
cambios y verificar el trabajo. Las instrucciones viven en `.pbai4devs` y se
pueden usar en proyectos escritos en cualquier lenguaje. El kit genera
referencias para [Codex, Claude, Cursor, Copilot, OpenCode y otros
clientes compatibles][clients].

## Requisitos previos

- **Obligatorio para la CLI.** Instala Node.js 24 LTS o posterior con npm y
  `npx`, incluidos en la distribución oficial. En Windows, usa como mínimo
  la versión 24.13.1 de la serie 24 LTS o elige 26 LTS o posterior.
  [Descargar Node.js][node-download] · [Instalación por sistema][prerequisites]
- **Git para trabajar con un repositorio.** Instala Git para clonar el código
  y comprobar las exclusiones. Puedes instalar el kit en una carpeta sin Git.
  [Descargar Git][git-download]
- **Agente de código y herramientas del proyecto.** Abre el proyecto en el
  cliente que usas para trabajar con agentes. Sigue los requisitos de tu
  proyecto para compilar y probar la aplicación. [Clientes compatibles][clients]

## Inicio rápido

Abre un terminal en la carpeta del proyecto y ejecuta:

```console
npx @pathbit/agentdevkit init --lang es --purpose agents
```

En el asistente, usa las flechas para navegar y **Espacio** para marcar cada
agente. Pulsa **Enter** para confirmar o **Esc** para cancelar. Si confirmas
sin marcar ningún agente, el kit instala los recursos compartidos.

Para cambiar la selección más adelante:

```console
npx @pathbit/agentdevkit agents --select
```

En una carpeta existente, puedes [revisar el plan antes de instalar][preview].
Para automatización o terminales sin menú, indica los IDs de los clientes:

```console
npx @pathbit/agentdevkit init --lang es --agents codex,claude --dry-run
npx @pathbit/agentdevkit init --lang es --agents codex,claude
```

Abre el proyecto en tu agente de código y pídele:

> Lee AGENTS.md y el README. Muestra los comandos del proyecto y propón
> un primer paso. Por ahora, solo lee los archivos.

Consulta la selección con `npx @pathbit/agentdevkit agents`.
[Opciones de instalación][install] · [Clientes compatibles][clients]

## Elige qué quieres hacer

| Quiero… | Ejecuta en la terminal |
| --- | --- |
| Planificar el producto | `npx @pathbit/agentdevkit next --intent product` |
| Saber cómo ejecutar la app | `npx @pathbit/agentdevkit next --intent run` |
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
| Conocer los conceptos y encontrar una guía | [Documentación](docs/es/README.md) |
| Mejorar documentación existente | [Inventario y complementos](docs/es/guides/documentation.md) |
| Crear una skill o comando | [Recursos](docs/es/guides/resources.md) |
| Elegir un flujo según el objetivo | [Recursos en la práctica](docs/es/guides/recursos-na-pratica.md) |
| Instalar herramientas y verificar | [Herramientas y pruebas][tests] |
| Revisar seguridad con herramientas locales | [Seguridad local](docs/es/guides/security.md) |
| Consultar opciones o resolver un error | [CLI][cli] · [Soluciones][help] |
| Mejorar el kit | [Contribuir](docs/es/CONTRIBUTING.md) |
| Probar los escenarios | [Ejemplos](docs/es/examples) |

## Desarrollar este repositorio

Usa Node.js 24+ con npm. Ejecuta `npm ci --ignore-scripts`, `npm run check`,
`npm test` y `npm run examples`. Los ejemplos se generan en una carpeta temporal
del sistema fuera de Git; `npm run test:examples` ejecuta los escenarios.
Consulta la [guía de desarrollo](docs/es/maintainers/development.md) para conocer
la estructura.

Las guías detalladas están en portugués. Las herramientas locales se
instalan por separado. Los [artefactos y sumas de la versión][release]
permiten comprobar el paquete publicado en [ambos registros][packages].

[Changelog](docs/es/CHANGELOG.md) · [Roadmap](docs/es/product/roadmap.md)
· [Plugins y créditos](docs/es/guides/plugins.md)

---

## Contributing and Branch Protection

Abre un pull request desde tu fork hacia `develop`. Los cambios revisados pasan
a `main` para la publicación. Consulta la [guía de contribución][contributing]
para ejecutar las comprobaciones antes de enviarlo.

¿Encontraste un problema o tienes una idea? [Abre una issue][issues] con los
formularios. Consulta [cómo participar](docs/es/maintainers/community.md).

---

## 📄 License

Distribuido bajo la [licencia MIT](LICENSE).
La instalación incluye la licencia del kit en `.pbai4devs/LICENSE` y conserva
la licencia y los archivos propios de tu proyecto.

[contributing]: docs/es/CONTRIBUTING.md
[clients]: docs/es/kit/COMPATIBILIDADE.md
[release]: https://github.com/pathbit/AgentDevKit/releases/latest
[npm-package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[npm-badge]: https://img.shields.io/npm/v/%40pathbit%2Fagentdevkit
[license-badge]: https://img.shields.io/badge/license-MIT-blue
[tests]: docs/es/guides/tools-and-testing.md
[cli]: docs/es/guides/cli.md
[help]: docs/es/guides/troubleshooting.md
[issues]: https://github.com/pathbit/AgentDevKit/issues/new/choose
[packages]: docs/es/maintainers/packages.md
[prerequisites]: docs/es/guides/prerequisites.md
[node-download]: https://nodejs.org/en/download
[git-download]: https://git-scm.com/install/
[install]: docs/es/guides/installation.md
[preview]: docs/es/guides/installation.md#simular-en-un-proyecto-existente
[update]: docs/es/guides/installation.md#actualizar-y-elegir-agentes
[workflow]: docs/es/guides/workflow.md
[plugins]: docs/es/guides/plugins.md
[comparison]: docs/es/guides/comparacao.md

[reading-pt]: README.md
[reading-en]: README.en.md
[reading-es]: README.es.md

---

Developed with ❤️ by [Pathbit](https://www.pathbit.com.br/)
