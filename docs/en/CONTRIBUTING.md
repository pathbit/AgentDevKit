---
description: "How to develop, verify and document AgentDevKit."
language: en
---

# Contribute

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use [Issues][issues] for bugs and proposals. Describe the context, version and
steps needed, removing secrets and private data.

## Preparing checkout

Use Git and Node.js 24+ with npm:

```console
git clone https://github.com/pathbit/AgentDevKit.git
cd AgentDevKit
git switch develop
npm ci --ignore-scripts
npm run check
```

Checkout contains fonts. Run `npm run examples` to explore agents in a temporary
folder outside Git, informed by the command. To choose an ignored local
destination, see the tab in
[`examples/`](examples/README.md).

This repository keeps only `develop` for integration and `main` for the public
version. At kit checkout, change branch with `git switch`. Forks contributions
point to `develop`. A [maintainer][release] describes the promotion of `main`.

## Choose the origin of the change

| Change | Origin |
| --- | --- |
| CLI and installation | `src/` e `bin/` |
| Customer Layout | `.pbai4devs/templates/clients/` |
| Skills, rules and commands | Synchronising folder `.pbai4devs/` |
| Shared automation | `.pbai4devs/scripts/` |
| IC and publication | `scripts/release/` and GitHub workflows |
| Product testing | `tests/` |
| Examples of use | `examples/` and shared generator |
| Help and examples | `docs/` e README of the appeal |

Read the [Source guide][source] e o [design](product/design.md). Modify
fonts and templates, not catalogs, status or client files.

## Check and send

```console
npm test
npm run test:infra
npm run check
```

Choose additional checks for the impact of the change. Installation requires new
and existing projects; Git requires preservation of index and files;
distribution requires the actual package. See [tests][tests]. O [development
guide][source] explains how to include the Markdown lint.

Keep tests and fixtures versioned. Reports, captures, downloads, notes and local
preferences are ignored. Review diff before sending and confirm that it contains
only intentional fonts and changes.

Update documentation and use [delivery review][review] to gather criteria,
evidence and independent review. PR should explain problem, solution and
validation. [Git rules][git]. A [publication][release] reuses the approved IC
article of `main`The same tarball goes for the [npm public and GitHub
Packages][package], with workflow authentication. Keep tokens out of code and
`.npmrc` versioned.

[Wiki](README.md) · [License MIT](../../LICENSE)

[issues]: https://github.com/pathbit/AgentDevKit/issues
[source]: maintainers/development.md
[tests]: guides/tools-and-testing.md
[review]: kit/commands/revisar-entrega/COMMAND.md
[git]: kit/rules/git/RULE.md
[release]: maintainers/maintenance.md
[package]: maintainers/packages.md

[reading-pt]: ../../CONTRIBUTING.md
[reading-en]: CONTRIBUTING.md
[reading-es]: ../es/CONTRIBUTING.md
