---
description: Portable instructions and tools for coding agents.
language: en
---

# AgentDevKit

[Português](README.md) · [Español](README.es.md) · [npm package][npm-package]

[![npm][npm-badge]][npm-package] [![MIT][license-badge]](LICENSE)

AgentDevKit guides coding agents from planning through verification.
Skills, rules, commands and agent profiles share one source in `.pbai4devs`.
The kit generates references for [Codex, Claude, Cursor, Copilot, OpenCode
and other supported clients][clients].

## Start in your project

Set up [Node.js 24+ and npm][prerequisites] on Windows, macOS or Linux. Open a
terminal in your project folder. For an existing project, [preview the
installation][preview] to see what will change. Install through **public npm**
without logging in:

```console
npx @pathbit/agentdevkit init
```

The first-run wizard asks for a language, clients and a goal. If you know which
clients you use, pass `--agents codex,claude`. With no explicit or saved choice,
`none` prepares shared resources and `AGENTS.md` without creating client
directories. The choice is saved per project, and the CLI supports `pt`, `en`
and `es`. See the [installation
options][install] for pnpm, Yarn, Bun and [GitHub Packages][github-install].

In a Git project, check the installation and synchronization:

```console
npx @pathbit/agentdevkit doctor
npx @pathbit/agentdevkit sync --check
```

## Choose what to do

| I want to… | Run in the terminal |
| --- | --- |
| Plan a product | `npx @pathbit/agentdevkit next --intent product` |
| Run the application | `npx @pathbit/agentdevkit next --intent run` |
| Document the system | `npx @pathbit/agentdevkit next --intent document` |
| Inventory before installing | `npx @pathbit/agentdevkit document` |

`next` suggests an action. Ask your coding agent to read `AGENTS.md` and use
the `proximos-passos` skill with your goal. The [workflow guide][workflow]
shows where to start in each case.

## Update and customize

- **Review and update.** See [how to preview and apply an update][update].
  Use `sync` to regenerate references from the resources already installed.
- **Change clients.** Check the selection with `agents` and change individual
  IDs with `agents add <id>` or `agents remove <id>`. See the [CLI][cli].
- **Choose optional tools.** Run `npx @pathbit/agentdevkit plugins list` and see
  sources and installation steps in the [plugin guide][plugins].
- **Reuse documents from another workflow.** Run `next --integrations` to
  locate references in your project. See the [comparison guide][comparison].

## Explore

| I want to… | Read |
| --- | --- |
| Learn the concepts and find a guide | [Documentation](docs/README.md) |
| Improve existing documentation | [Inventory and additions](docs/guides/documentation.md) |
| Create a skill or command | [Resources](docs/guides/resources.md) |
| Choose a workflow by outcome | [Resources in practice](docs/guides/recursos-na-pratica.md) |
| Install tools and verify work | [Tools and tests][tests] |
| Review security with local tools | [Local security](docs/guides/security.md) |
| Look up options or fix an error | [CLI][cli] · [Troubleshooting][help] |
| Improve the kit | [Contributing](CONTRIBUTING.md) |
| Try the scenarios | [Examples](https://github.com/pathbit/AgentDevKit/tree/main/examples) |

## Develop this repository

Use Node.js 24+ with npm. Run `npm ci --ignore-scripts`, `npm run check`,
`npm test` and `npm run examples`. Examples are generated in a system temporary
directory outside Git; `npm run test:examples` runs the scenarios.
See the [development guide](docs/maintainers/development.md) for the project structure.

Detailed guides are in Portuguese. Local tools have a separate installation
step. The [release artifacts and checksums][release] let you verify the package
published to [both registries][packages].

## License and authorship

Maintained by [PathBit](https://www.pathbit.com.br),
under the [MIT license](LICENSE).
Installation includes the kit license in `.pbai4devs/LICENSE` and preserves
your project's license and files.

[Changelog](CHANGELOG.md) · [Roadmap](docs/product/roadmap.md)
· [Plugins and credits](docs/guides/plugins.md)

Found a bug or have an idea? [Open an issue][issues] using the contribution
forms. See [how to participate](docs/maintainers/community.md).

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
