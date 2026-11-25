---
description: "Quick guide to developing and validating AgentDevKit."
language: en
---

# Develop AgentDevKit

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Start with Git, Node.js 24+ and npm. `npm ci` remove `node_modules` before
installing; preserve any local contents of this folder. At the root of checkout:

```console
npm ci --ignore-scripts
npm run check
npm test
```

The `main` branch receives changes and is the source of releases. Automatic
publication requires successful CI on `main` and uses the package version.

`npm run check` gives structure and links. To include the Markdown lint, prepare
`markdownlint-cli2` for [tool
script](../kit/scripts/preparar-ferramentas/README.md). The profile
`npm run verify` Prepare the tool before checking.

## Compose Environment

The application is a CLI: each execution ends and does not open door or maintain
service, bank or volume. CLI local on isolated Linux, install Docker with
Compose and GNU Make and make the image available once:

```console
docker pull node:24-bookworm
make doctor
make up
```

Without Make, see the help of CLI with:

```console
cd infra/compose
docker compose -p adk-cli -f compose.local.yml run --rm --pull never cli
```

On Windows, use Docker Desktop configured for Linux containers; this setting
still needs to be checked on this system.

`make up` print the version using the local image, without downloading during
execution. Checkout is mounted for read only, without network in the container;
checkout content is readable to the process inside it. Mounting allows queries,
but does not change checkout. The command does not test the published package.
There is no persistent service or healthcheck waiting: `make down` e `make logs`
explain this cycle without removing Docker resources.

`make setup` check the prerequisites and use `npm ci --ignore-scripts`He refuses
to execute if `node_modules` already exists, to prevent its removal. Make
targets require a POSIX shell. `make lint`, `make test` e `make build` forward
to npm commands above. Build saves to `.agent-tests/release/<versão>/`; the
target refuses a folder of the same existing version. Review and preserve the
previous artifact in another location before executing another build. Makefile
check is not atomic: avoid other simultaneous build processes. `npm run build` e
`npm run verify` do not use this Make protection: they reuse an equivalent
output or refuse a divergence, preserving the previous folder. After checking
the package, `verify` creates a unique directory marked copy in
`.agent-tests/release/` or `RUNNER_TEMP`, when set. Review copies and waste
before removing them. File `.dockerignore` limits future build contexts; it does
not filter the contents of a Compose Bind mount. `tmp`, `temp` and directories
`playwright*` they also exclude code with these names in context.

## Where to work

| Folder | Content |
| --- | --- |
| [`src/`](../src/README.md) | Code of CLI and the installer. |
| [`bin/`](../bin/README.md) | Package Executable. |
| [`tests/`][tests] | Product testing. |
| [`scripts/`][scripts] | Check, build and publish. |
| [`examples/`][examples] | Examples to study the result. |
| [`.pbai4devs/`](../kit/README.md) | Shared resources of agents. |
| [`docs/`](../README.md) | Guides, decisions and specifications. |

The executable on `bin/` check the runtime before loading the entry into
`src/cli.mjs`. A CLI applies the recovery barrier before dispatching operations.
`src/install.mjs` exposes the planning and application used by CLI and the
tests. [module architecture][architecture].

When changing a command, check arguments, help, output JSON and languages. By
changing a property utility, publication or recovery in
`.pbai4devs/scripts/lib/`, check out the flow of CLI e o [synchroniser
installed][sync].

## Choose the next action

| Objective | Command |
| --- | --- |
| Know the commands of CLI local | `npm run cli -- --help` |
| Generate examples from publicable sources | `npm run examples` |
| Run eight example scenarios | `npm run test:examples` |
| Confidence of resources and documentation | `npm run check` |
| Test the product | `npm test` |
| Check all and the actual package | `npm run verify` |
| Generate tarball only, preserving an existing release | `make build` |

`generate` It's an alias to generate the examples. `agents:sync` syncs a local
configuration of agents from the checkout itself when explicitly adopted. The
npm commands of examples use the pub's publicable sources. To evaluate the
selection of a project, run the [maturity script][maturity] installed on it.

Edit fonts and templates, not generated files. Tests and fixtures enter Git;
reports and caches stay local. The generated examples go to a temporary folder
outside Git. Before sending a change, follow
[contribution](../CONTRIBUTING.md) e a [delivery review][review]. A
[publication](maintenance.md) Reuse the IC-approved artifact.

[Wiki](../README.md) · [Examples][examples]

[review]: ../kit/commands/revisar-entrega/COMMAND.md
[architecture]: ../src/README.md
[sync]: ../kit/scripts/sincronizar-agentes/README.md
[maturity]: ../kit/scripts/testar-maturidade/README.md
[tests]: ../tests
[scripts]: ../scripts
[examples]: ../examples

[reading-pt]: ../../maintainers/development.md
[reading-en]: development.md
[reading-es]: ../../es/maintainers/development.md
