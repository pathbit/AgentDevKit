---
description: "Sources, local generation and architecture of AgentDevKit."
status: aprovado
language: en
---

# Technical design

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

The repository contains the generator. The installation produces the structure
used by agents in another project. [PRD](prd.md) e [specs](../specs/README.md)
define the contracts for each delivery.

## Sources in the repository

```text
AgentDevKit/
├── src/              CLI e instalação
├── bin/              entrada do pacote npx
├── tests/            testes do produto
├── scripts/release/  CI, empacotamento e publicação
├── examples/         guia de exemplos
├── docs/             guias e decisões do produto
└── .pbai4devs/        skills, regras, templates e ferramentas compartilhadas
```

Metadata npm, license, documentation, and workflows from GitHub are located in
their default locations. Native client folders, indexes, and local status are
not part of the versioned font.

`npm run examples` generates the demo trees in a temporary folder outside Git,
informed by the command. `.claude`, `.codex` and the other customers, without
mixing examples with the active root configuration. `npm run test:examples`
executes the scenarios. [development guide](../maintainers/development.md)
gathers the project commands.

## Output installed

`.pbai4devs` receives shared resources without copying the generator core,
release automations or unique product testing. Customer layouts come from
[declarative configuration][clients]The native files are small notes for the
hub, no symlinks.

O `LICENSE` the root of the package is the canonical source of the license MIT
from the kit. `init` e `update` They copy their bytes to `.pbai4devs/LICENSE`;
the license of the consumer project root remains intact. Changes in the managed
license follow the same conflict protection and backup of the other hub files.

Saved choice determines leads. Updates and synchronisations do not reactivate
unscheduled customers. In a new installation, `none` leaves only shared
resources, including `AGENTS.md`. The generated manifest has only the header.
`all` preserves the intention to use all; old states without registered
selection maintain this behavior.

## Installation and ownership

The installer mounts a plan, checks hashes and paths, presents conflicts and
applies changes with local backup. `--dry-run` does not change files or index.

Human entries receive references in a delimited block of the kit. The external
text, frontmatter and existing name are preserved; only the hash of the block is
registered. External changes remain allowed; changes within the block require
revision and do not allow overwriting the file with `--force`. New and fully
generated files remain fully owned. TOML legacy recognizes the managed
contribution in `prompt` in the migration. `0.0.36`, the kit deactivates
creation and renewal in `.gemini/`. `GEMINI.md` remains as Antigravity input.
Native settings remain under human control. It is never possible to ignore only
one file snippet in Git. See [integration spec][additive].

The kit preserves the Git configuration, the existing ignores and the index.
Local files may appear in the status; the diagnosis informs this visibility and
possible private files exposed. The team decides the rules of the project.

The state registers version, choice and local property. Indices and manifesto
can be rebuilt. Downloads, credentials and reports stay out of the package;
check out project ignores before preparing Git changes.

The plugin catalog uses the external tool and skill settings. `plugins list` e
`plugins info` consult the package before the `init` and the local catalogue
after installation. `plugins install` e `plugins check` forward the operation to
the corresponding manager. [Plugins and credits](../guides/plugins.md)

## Inventory and documentary developments

The inspector shall include documentation metadata in the JSON: paths, type,
probable paper, indication origin, size and hash when it fits the limits. It
does not write files, does not issue content and does not read symbolic
destinations. Limits and warnings prevent interpreting a partial search as
absence of docs.

`document` uses this inspection to prepare an inventory draft at Markdown or
JSON. `next --intent document` guides the agent's reading flow from the project
state. [Commands of CLI](../guides/cli.md)

A skill `atualizar-documentacao` The agent reads the material, proposes actions
per file and applies authorized complements. Organization uses indexes and
links, preserving paths and content. Product and approvals depend on the actual
decisions of the user.

## Runtime

Launcher accepts Node 18+ and prepares Node 24+ before loading the core.
Bootstrap uses JavaScript, official download, SHA-256 and extraction by `tar`
with separate arguments, without shell. Failures preserve the previous runtime.
Without Node, the agent first uses the native installer of the operating system.

## Verification and publication

The IC separates the full suite from portability tests. The publication uses an
approved article from the same commit and verifies version, origin and checksum.
There is no new packaging between test and publication.

Before packing, the distribution stage derives the README font audience: removes
frontmatter YAML and resolve local links to absolute GitHub URLs. README
versioned keeps your YAML The package identifies PathBit as an author, includes
keywords and declares MIT.

Public npm receives the same tarball as release `@pathbit/agentdevkit`. Workflow
prioritizes secret `NPMJS_TOKEN` of the repository, received by the internal
variable `NPM_TOKEN`; without token, uses OIDC. Confirms the integrity of the
version in the record and tests `--version`, `init`, `doctor` e `sync --check`
via `npm exec`, in temporary project with new cache. The commands suggested by
CLI and by the notes use the name and version of the package. Manual package
mode allows you to publish an existing tag without changing its release. The
consumer installation is validated without token or authentication
configuration, as per [npm package](../maintainers/packages.md).

Tests prove files and operations executed. Loading into a specific application
depends on the capabilities of that client; generating a reference does not
prove the execution of the skill.

[Wiki](../README.md) · [Maintainer](../maintainers/maintenance.md) ·
[Resources](../guides/resources.md)

[clients]: ../../../.pbai4devs/templates/clients/ADAPTERS.json
[additive]: ../specs/additive-integration/SPEC.md

[reading-pt]: ../../product/design.md
[reading-en]: design.md
[reading-es]: ../../es/product/design.md
