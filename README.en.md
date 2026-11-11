---
description: Portable instructions and tools for coding agents.
language: en
---

# AgentDevKit

[Português](README.md) · [Español](README.es.md)

Organize work with coding agents, from planning to verification. Keep skills,
rules, commands and agent profiles in `.pbai4devs`; the kit generates the
references each client can discover. See the [supported clients][clients].

## Start in your project

With Node.js 24+ and npm, open a terminal in your project (macOS/Linux):

```sh
RELEASE=https://github.com/pathbit/AgentDevKit/releases/download/v0.0.1
npx --yes --ignore-scripts \
  --package="$RELEASE/agentdevkit-0.0.1.tgz" agentdevkit init --lang en
```

Then open the project in your coding agent and ask:

> Read AGENTS.md and use the proximos-passos skill to guide my next steps.

See [installation](docs/installation.md) for Windows, missing Node, previews
and updates. The [v0.0.1 release][release] runs without a global installation.
The CLI supports `pt`, `en` and `es`; it saves your selection per project.

## Explore

| I want to… | Read |
| --- | --- |
| Understand the kit | [Documentation wiki](docs/README.md) |
| Plan or resume a project | [Workflow](docs/workflow.md) |
| Create a skill or command | [Resources](docs/resources.md) |
| Install tools and verify work | [Tools and tests][tests] |
| Look up options or fix an error | [CLI][cli] · [Troubleshooting][help] |
| Improve the kit | [Contributing](CONTRIBUTING.md) |

Detailed guides are in Portuguese. Installing the kit prepares instructions;
tools are installed separately. Product documents follow your planning
decisions. Existing projects retain their code and decisions. Discovery
depends on the client; references alone do not prove a skill was loaded.

[Changelog](CHANGELOG.md) · [Roadmap](docs/roadmap.md) · [MIT license](LICENSE)

Found a bug or have an idea? [Open an issue][issues] using the contribution
forms. See [how to participate](docs/community.md).

**[ Next step ]** Follow [installation](docs/installation.md), then ask your
agent to read `AGENTS.md`.

[clients]: .pbai4devs/COMPATIBILIDADE.md
[release]: https://github.com/pathbit/AgentDevKit/releases/tag/v0.0.1
[tests]: docs/tools-and-testing.md
[cli]: docs/cli.md
[help]: docs/troubleshooting.md
[issues]: https://github.com/pathbit/AgentDevKit/issues/new/choose
