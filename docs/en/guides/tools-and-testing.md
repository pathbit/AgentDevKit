---
description: "Tool preparation and choice of actual checks."
language: en
---

# Tools and tests

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

The kit brings settings and automations. Installing the kit does not install all
tools or choose the application stack. [catalog][tools].

## Runtime and prep

The core uses Node.js 24+ with npm. Launcher accepts Node 18+ and prepares the
current runtime when needed. Without Node, the agent needs to install it by
operating system mechanism before starting `npx`; follow the [system
prerequisites](prerequisites.md).

To prepare only runtime from the hub:

```console
node .pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.mjs --runtime-only
```

The same JavaScript meets supported systems. There is no PowerShell, SH or Bash
boot in the kit. The native executable `tar` is used without shell to extract
the official file after checking SHA-256. [bootstrap guide][bootstrap].

To prepare a catalog tool, see [plugins tab][plugins]. If you need to prepare a
group of tools, run from the hub:

```console
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs setup
```

`setup` reuses healthy installations and checks the compatible ones. A name or
group limits selection. Tools with mandatory selection, such as those of the
group `workflow`, require an explicit ID or group. `check`, `info` e `run`
operate on the available installation. Downloads, caches and receipts remain
local and ignored. The manager refuses symbolic links on the paths he writes or
uses as local state; the update does not follow these links out of the
installation.

## Choose proof

| Change | Verification |
| --- | --- |
| Logic or API | Tests and assertive results. |
| Web flow | Real browser, actions and visible result. |
| Desktop application | Open the application and run the stream. |
| Visual document | Render or open the artifact and inspect. |
| Generator and Git | Install, sync and compare arquivos/índice. |

Use [check-work][verify] to link accepted to the proofs. Web can use
[agent-browser][browser] or the Playwright connector; desktop can use
[agent-desktop][desktop]. Check console, network, permissions and real effects.
An isolated capture does not demonstrate complete operation.

## Check AgentDevKit

At the checkout, `npm test` checks the product; `npm run test:infra` checks
shared automations; `npm run check` validates the fonts.
[IC](../maintainers/maintenance.md) avoid repeating the complete suite in each
system.

The product tests are in `tests/`, at the root. Shared tests stay in
`scripts/<nome>/tests/` inside the hub. In an application attended, the test
code follows the agreed directories for that project.

A [maturity matrix][matrix] uses eight synthetic projects. It proves kit
contracts; does not approve a real product or certifies all applications.
Simulated reviews of this matrix do not replace independent review. `npm run
examples` to generate examples for inspection. `npm run test:examples` creates
new temporary copies and executes the scenarios. [example guide][examples]
explains each scenario; [development guide](../maintainers/development.md)
gathers repository checks.

## Save results

Verse test code and fixtures. Save reports, captures, videos, downloads and
Playwright outputs on paths ignored by the project and check with `git
check-ignore -v -- <caminho>`. Register the result of each check and close the
delivery by [revision][review].

[Wiki](../README.md) · [Resources](resources.md)

[tools]: ../kit/tools/README.md
[plugins]: plugins.md#consult-and-install
[bootstrap]: ../kit/scripts/preparar-ferramentas/BOOTSTRAP.md
[verify]: ../kit/skills/projeto/verificar-trabalho/SKILL.md
[browser]: ../kit/tools/agent-browser/README.md
[desktop]: ../kit/tools/agent-desktop/README.md
[matrix]: ../kit/scripts/testar-maturidade/README.md
[review]: ../kit/commands/revisar-entrega/COMMAND.md
[examples]: ../examples

[reading-pt]: ../../guides/tools-and-testing.md
[reading-en]: tools-and-testing.md
[reading-es]: ../../es/guides/tools-and-testing.md
