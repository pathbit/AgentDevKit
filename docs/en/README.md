---
description: "AgentDevKit's Wiki, from first use to maintenance of the kit."
language: en
---

# AgentDevKit Documentation

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

AgentDevKit stores shared instructions in `.pbai4devs` and creates
references for the coding agents you select.

## Fast Starts

1. [Follow the quick start](../../README.en.md#quick-start) to select agents
   and make your first request.
2. [Choose a workflow][flow] to plan a product, run an application or
   document an existing system.
3. [Review the generated files][install] before staging changes in Git.

| Goal | Where to start |
| --- | --- |
| Install with Node.js and npm | [Install via npx](guides/installation.md#install) |
| Select or change agents | [Selection commands](guides/cli.md#commands) |
| Prepare an existing application | [Run the project](guides/workflow.md) |
| Document an existing system | [Inventory and update docs](guides/documentation.md) |
| Check the installation | [Tools and tests][tests] |

## See for objective

| Goal | Guide |
| --- | --- |
| Update the kit or change agents | [Update and choose agents][update] |
| Use an existing planning workflow | [Compare integrations](guides/comparacao.md) |
| Customize agent resources | [Resources][resources] · [Supported clients][clients] |
| See how resources work together | [Resources in practice](guides/recursos-na-pratica.md) |
| Delegate and review work | [Profiles and collaboration](guides/resources.md#experts-and-collaboration) |
| Review local controls | [Local scanners and controls](guides/security.md) |
| Look up command options or JSON output | [CLI reference](guides/cli.md) |
| Find tools for a task | [Plugins and credits](guides/plugins.md) · [Tools and tests][tests] |
| Recover from a problem | [Troubleshooting and recovery](guides/troubleshooting.md) |

The [guide index](guides/README.md) lists the guides in order of use.

## Understand the terms

| Term | Meaning |
| --- | --- |
| Skill | Procedure that guides decisions and actions of a task. |
| Rule | Guidance applicable to a working environment. |
| Command | Entry of a use case with steps, arguments and exit. |
| Agent profile | Responsible for a complete task. |
| Adapter | Translates references to the format of each client. |
| Mirror | Note generated for a source resource. |
| Template | Model that will be filled with project decisions. |
| Spec | Scope of a delivery with verifiable criteria. |
| Evidence | Log of a check actually executed. |

The agent reads and executes the instructions according to your client's
capabilities. CLI installs, syncs and diagnoses files. Having a correct note
does not prove that a certain client has loaded or executed the skill. [resource
guide](guides/resources.md) shows how these components combine; there is no
mandatory proportion between their quantities.

## Product and maintenance

- [PRD](product/prd.md): problem, public, requirements and limits.
- [Experience of CLI](product/ux-ui.md): interaction, languages and outputs.
- [Technical design](product/design.md): components, state and preservation of
  files.
- [Roadmap](product/roadmap.md) e [specs](specs/README.md): scope of deliveries.
- [Tasks](tasks/README.md): work and evidence by increment.
- [Changelog](CHANGELOG.md): changes per version.
- [Contribute][contrib] · [Developer][development] · [Examples][examples].
- [Maintainer](maintainers/README.md) · [Releases](maintainers/maintenance.md) ·
  [Publication](maintainers/packages.md) ·
  [Community](maintainers/community.md).

This wiki documents **the AgentDevKit** The projects that receive the kit use
the [templates](kit/templates/README.md) for your own documents, after
questions and decisions. The installation does not copy this wiki to `docs/`
from the project attended.

The guides and references are available in [Brazilian Portuguese][reading-pt],
[English][reading-en] and [Spanish][reading-es]. The CLI language determines
the interface language and the language guidance given to agents.

[Back to project](../../README.en.md)

[install]: guides/installation.md#whats-in-the-project
[update]: guides/installation.md#update-and-choose-agents
[flow]: guides/workflow.md
[clients]: kit/COMPATIBILIDADE.md
[tests]: guides/tools-and-testing.md
[contrib]: CONTRIBUTING.md
[examples]: examples
[resources]: guides/resources.md
[development]: maintainers/development.md

[reading-pt]: ../README.md
[reading-en]: README.md
[reading-es]: ../es/README.md
