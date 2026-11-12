---
description: Portable instructions and tools for coding agents.
language: en
---

# AgentDevKit

[Português](README.md) · [Español](README.es.md) · [npm package][npm-package]

Organize work with coding agents, from planning to verification. Keep skills,
rules, commands and agent profiles in `.pbai4devs`; the kit generates the
references each client can discover. Code lives in `src/`, product tests in
`tests/`, and shared agent resources in `.pbai4devs/`. Generated client
folders, entrypoints and preferences stay local and untracked.
See the [supported clients][clients].

## Start in your project

With Node.js 18+ and npm, run this in your project. No login is required:

```console
npx @pathbit/agentdevkit init
```

Choose your coding agents when prompted, or pass `--agents codex,claude`.
The project saves your selection; use `agents` to view or change it later.
Without interaction or a saved choice, the default is `all` clients.

Then open the project in your coding agent and ask:

> Read AGENTS.md and use the proximos-passos skill to guide my next steps.

See [installation](docs/guides/installation.md) for Windows, missing Node, previews
and updates. Install and update through the [public npm package][packages]; the
[v0.0.5 release][release] retains artifacts and checksums for verification.
No global installation is required.
The CLI supports `pt`, `en` and `es`; it saves your selection per project.

## Explore

| I want to… | Read |
| --- | --- |
| Understand the kit | [Documentation wiki](docs/README.md) |
| Plan or resume a project | [Workflow](docs/guides/workflow.md) |
| Create a skill or command | [Resources](docs/guides/resources.md) |
| Install tools and verify work | [Tools and tests][tests] |
| Look up options or fix an error | [CLI][cli] · [Troubleshooting][help] |
| Improve the kit | [Contributing](CONTRIBUTING.md) |
| Try the scenarios | [Examples](https://github.com/pathbit/AgentDevKit/tree/master/examples) |

## Develop this repository

Use Node.js 24+ with npm. Run `npm ci --ignore-scripts`, `npm run check`,
`npm test` and `npm run examples`. Examples are generated locally in
`examples/generated/`; `npm run test:examples` runs the scenarios.
See the [development guide](docs/maintainers/development.md) for the project structure.

Detailed guides are in Portuguese. Installing the kit prepares instructions;
tools are installed separately. Product documents follow your planning
decisions. Existing projects retain their code and decisions. Discovery
depends on the client; references alone do not prove a skill was loaded.

[Changelog](CHANGELOG.md) · [Roadmap](docs/product/roadmap.md) · [MIT license](LICENSE)

Found a bug or have an idea? [Open an issue][issues] using the contribution
forms. See [how to participate](docs/maintainers/community.md).

**[ Next step ]** Follow [installation](docs/guides/installation.md), then ask your
agent to read `AGENTS.md`.

[clients]: .pbai4devs/COMPATIBILIDADE.md
[release]: https://github.com/pathbit/AgentDevKit/releases/tag/v0.0.5
[npm-package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[tests]: docs/guides/tools-and-testing.md
[cli]: docs/guides/cli.md
[help]: docs/guides/troubleshooting.md
[issues]: https://github.com/pathbit/AgentDevKit/issues/new/choose
[packages]: docs/maintainers/packages.md
