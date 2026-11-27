---
description: "Portable instructions and tools for coding agents."
language: en
---

# AgentDevKit

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

[Package on npmjs][npm-package] · [GitHub releases][github-releases]

[![npm][npm-badge]][npm-package] [![MIT][license-badge]](LICENSE)

AgentDevKit helps coding agents understand your project, plan changes and
verify their work. Its instructions live in `.pbai4devs` and can be used in
projects written in any language. The kit generates references for
[Codex, Claude, Cursor, Copilot, OpenCode and other supported clients][clients].

## Prerequisites

- **Required for the CLI.** Install Node.js 24 LTS or newer with npm and
  `npx`, included in the official distribution. On Windows, use at least
  version 24.13.1 in the 24 LTS series or choose 26 LTS or newer.
  [Download Node.js][node-download] · [Platform setup][prerequisites]
- **Git for repository workflows.** Install Git to clone the code and check
  Git ignore rules. You can install the kit in a folder without Git.
  [Download Git][git-download]
- **Coding agent and project tools.** Open the project in the client you use
  to work with coding agents. Follow your project's own requirements to build
  and test the application. [Supported clients][clients]

## Quick start

Open a terminal in your project folder. npmjs is the default way to run the
kit. Use `@latest` for the newest stable release. Specify the version number
to run the same version every time.

```console
npx --yes @pathbit/agentdevkit@latest init --lang en --purpose agents
npx --yes @pathbit/agentdevkit@0.0.42 init --lang en --purpose agents
```

In the setup wizard, use the arrow keys to move and **Space** to mark each
agent. Press **Enter** to confirm or **Esc** to cancel. Confirming with no
agents marked installs the shared resources.

To change the selection later:

```console
npx @pathbit/agentdevkit agents --select
```

In an existing folder, you can [preview the installation][preview]. For
automation or terminals without a menu, specify the client IDs:

```console
npx @pathbit/agentdevkit init --lang en --agents codex,claude --dry-run
npx @pathbit/agentdevkit init --lang en --agents codex,claude
```

Open the project in your coding agent and ask:

> Read AGENTS.md and the README. Show the project commands and suggest a
> first step. For now, only read the files.

Check the selection with `npx @pathbit/agentdevkit agents`.
[Installation options][install] · [Supported clients][clients]

## Other ways to run

On npm 12 or later, these commands permit only the specified source.
On npm 11 or earlier, omit `--allow-remote=root` or `--allow-git=root`.
[Official npm options][npm-source-options].

### From a GitHub release

Run the `.tgz` for a published version. It requires Node.js and its bundled `npx`.

<!-- markdownlint-disable MD013 -->

```console
npx --yes --allow-remote=root https://github.com/pathbit/AgentDevKit/releases/download/v0.0.42/agentdevkit-0.0.42.tgz init --lang en --purpose agents
```

<!-- markdownlint-enable MD013 -->

### From the source on GitHub

With [Git installed][git-download], run the development version from
the `main` branch.

<!-- markdownlint-disable MD013 -->

```console
npx --yes --allow-git=root "git+https://github.com/pathbit/AgentDevKit.git#main" init --lang en --purpose agents
```

<!-- markdownlint-enable MD013 -->

## Choose what to do

| I want to… | Run in the terminal |
| --- | --- |
| Select agents | `npx @pathbit/agentdevkit agents --select` |
| Plan a product | `npx @pathbit/agentdevkit next --intent product` |
| Find out how to run the app | `npx @pathbit/agentdevkit next --intent run` |
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
| Learn the concepts and find a guide | [Documentation](docs/en/README.md) |
| Improve existing documentation | [Inventory and additions](docs/en/guides/documentation.md) |
| Create a skill or command | [Resources](docs/en/guides/resources.md) |
| Choose a workflow by outcome | [Resources in practice](docs/en/guides/recursos-na-pratica.md) |
| Install tools and verify work | [Tools and tests][tests] |
| Review security with local tools | [Local security](docs/en/guides/security.md) |
| Look up options or fix an error | [CLI][cli] · [Troubleshooting][help] |
| Improve the kit | [Contributing](docs/en/CONTRIBUTING.md) |
| Try the scenarios | [Examples](docs/en/examples) |

## Develop this repository

Use Node.js 24+ with npm. Run `npm ci --ignore-scripts`, `npm run check`,
`npm test` and `npm run examples`. Examples are generated in a system temporary
directory outside Git; `npm run test:examples` runs the scenarios.
See the [development guide](docs/en/maintainers/development.md) for the project
structure.

Detailed guides are in Portuguese. Local tools have a separate installation
step. The [release artifacts and checksums][release] let you verify the package
published to [both registries][packages].

[Changelog](docs/en/CHANGELOG.md) · [Roadmap](docs/en/product/roadmap.md)
· [Plugins and credits](docs/en/guides/plugins.md)

---

## Contributing and Branch Protection

Open a pull request from your fork targeting `main`. See the
[contributing guide](docs/en/CONTRIBUTING.md) for the checks to run before
submitting.

Found a bug or have an idea? [Open an issue][issues] using the contribution
forms. See [how to participate](docs/en/maintainers/community.md).

---

## 📄 License

Distributed under the [MIT license](LICENSE).
Installation includes the kit license in `.pbai4devs/LICENSE` and preserves
your project's license and files.

[clients]: docs/en/kit/COMPATIBILIDADE.md
[release]: https://github.com/pathbit/AgentDevKit/releases/latest
[github-releases]: https://github.com/pathbit/AgentDevKit/releases
[npm-source-options]: https://docs.npmjs.com/cli/v12/commands/npm-install/#allow-remote
[npm-package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[npm-badge]: https://img.shields.io/npm/v/%40pathbit%2Fagentdevkit
[license-badge]: https://img.shields.io/badge/license-MIT-blue
[tests]: docs/en/guides/tools-and-testing.md
[cli]: docs/en/guides/cli.md
[help]: docs/en/guides/troubleshooting.md
[issues]: https://github.com/pathbit/AgentDevKit/issues/new/choose
[packages]: docs/en/maintainers/packages.md
[prerequisites]: docs/en/guides/prerequisites.md
[node-download]: https://nodejs.org/en/download
[git-download]: https://git-scm.com/install/
[install]: docs/en/guides/installation.md
[preview]: docs/en/guides/installation.md#simulate-on-an-existing-project
[update]: docs/en/guides/installation.md#update-and-choose-agents
[workflow]: docs/en/guides/workflow.md
[plugins]: docs/en/guides/plugins.md
[comparison]: docs/en/guides/comparacao.md

[reading-pt]: README.md
[reading-en]: README.en.md
[reading-es]: README.es.md

---

Developed with ❤️ by [Pathbit](https://www.pathbit.com.br/)
