---
description: Portable instructions and tools for coding agents.
language: en
---

# AgentDevKit

[Português](README.md) · [Español](README.es.md)

Install skills, rules, commands and agent profiles from one source:
`.pbai4devs`. Use it in new or existing projects and follow the next steps
reported for the project's current state.

## Start

Requires Node.js 24+. From this checkout:

```sh
node bin/agentdevkit.mjs init --target ../my-project --lang en
node bin/agentdevkit.mjs next --target ../my-project
```

Without Node, ask the agent to prepare the runtime using the
[checkout bootstrap](.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.md)
and continue installation. `npx` also requires Node/npm.

Use the `v0.0.1` distribution without a global installation:

```sh
RELEASE=https://github.com/pathbit/AgentDevKit/releases/download/v0.0.1
npx --yes --ignore-scripts \
  --package="$RELEASE/agentdevkit-0.0.1.tgz" agentdevkit init --lang en
```

See [installation and updates](docs/installation.md). The CLI supports `pt`,
`en` and `es`, saving the language in the target project. Use `--dry-run` to
preview changes and `--json` for automation.

## Workflow

Preparation → PRD → UX/design → configuration → specs → implementation → review.
Existing projects keep their current work. Installing instructions creates
neither product documents nor tool installations. Discovery depends on each
client; a reference alone does not prove that an agent loaded it.

## Develop

```sh
npm test
npm run test:infra
npm run check
```

[Documentation](docs/README.md) · [Requirements](docs/prd.md) ·
[Design](docs/design.md) · [Roadmap](docs/roadmap.md) · [MIT license](LICENSE)

**[ Next step ]** Install in your project:

```sh
node bin/agentdevkit.mjs init --target ../my-project --lang en
```
