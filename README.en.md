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

Use Node.js 24+ with npm. The [prerequisites guide][prerequisites] explains
installation on Windows, macOS and Linux.

From your project folder, install through **npm**, without logging in:

```console
npx @pathbit/agentdevkit init
```

Choose your coding agents when prompted, or pass `--agents codex,claude`.
Your project saves the choice, and `agents` lets you change it. With no explicit
or saved choice, a non-interactive run uses `all`. The CLI supports `pt`, `en`
and `es`. See the [installation guide](docs/guides/installation.md) for pnpm,
Yarn, Bun and [GitHub Packages authentication][github-install].

## Choose what to do

- **Plan a new product or change.** Use `next --intent product` to find the
  next planning step.
- **Run an existing application.** Use `next --intent run` for guidance
  based on the current project state.
- **Adopt the kit for selected clients.** Use `init --agents codex,claude`
  with the IDs you need.

Installation sets up agent resources. In an existing repository,
`npx @pathbit/agentdevkit init --dry-run` shows proposed changes and
conflicts. The kit preserves project instructions and skills.
In a Git repository, follow the terminal guidance through `doctor` and
`sync --check`, then ask for the next step for your goal:

```console
npx @pathbit/agentdevkit next --intent product
npx @pathbit/agentdevkit next --intent run
```

`next` suggests a step for you to take. Ask your agent to read `AGENTS.md`
and use the `proximos-passos` skill with your goal.

### Use the workflow the task calls for

AgentDevKit gives multiple coding agents the same starting point. Set up your
project and verify delivery with the kit, then draw on **BMad** for discovery,
**OpenSpec** or **GitHub Spec Kit** for specs, **Tech Leads Club** for planning,
or **Dotcontext** (AI Context) for project context as needed. If the project
already has these artifacts, run `npx @pathbit/agentdevkit next --integrations`
to find recognized references. See the [comparison guide](docs/guides/comparacao.md).

## Explore

| I want to… | Read |
| --- | --- |
| Prepare Node.js and npm | [Prerequisites][prerequisites] |
| Understand the kit | [Documentation wiki](docs/README.md) |
| Plan or resume a project | [Workflow](docs/guides/workflow.md) |
| Improve existing documentation | [Inventory and additions](docs/guides/documentation.md) |
| Create a skill or command | [Resources](docs/guides/resources.md) |
| Choose a workflow by outcome | [Resources in practice](docs/guides/recursos-na-pratica.md) |
| Install tools and verify work | [Tools and tests][tests] |
| Review security with local tools | [Local security](docs/guides/security.md) |
| Look up options or fix an error | [CLI][cli] · [Troubleshooting][help] |
| Improve the kit | [Contributing](CONTRIBUTING.md) |
| Try the scenarios | [Examples](https://github.com/pathbit/AgentDevKit/tree/master/examples) |

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
[github-install]: docs/guides/installation.md#github-packages
