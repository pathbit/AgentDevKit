---
description: "AgentDevKit installation and local agent generation."
language: en
---

# Installation

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

The package installs shared resources in `.pbai4devs` and creates references
for the coding agents you select.

- [Quick start with a coding agent](../../../README.en.md#quick-start).
- [Install for the first time](#install).
- [Simulate on an existing project](#simulate-on-an-existing-project).
- [Keep the hub local](#keep-the-hub-local).
- [Update the kit or change agents](#update-and-choose-agents).

## Prerequisites

Install [Node.js 24+ with npm and npx](prerequisites.md) on Windows, macOS
or Linux. Git is optional for installing the kit. If you already have Node
18 through 23, see how the [bootstrap][bootstrap] prepares a local runtime.

Your application keeps its toolchain. A .NET API uses its SDK, a Python
project uses its own environment, and a documentation folder can use the
kit with Node.js alone.

## Install

Use the [public package on npmjs](https://www.npmjs.com/package/@pathbit/agentdevkit)
in your project folder. To use a release tarball or run from `main`, see
[other ways to run](../../../README.en.md#other-ways-to-run).

### public npm

Public npm is the default. You can use it without an account.

```console
npx @pathbit/agentdevkit init
```

If npm requests confirmation to download the package, confirm to continue.

In the menu, use the arrows and **Space** to check
agents. Press **Enter** to confirm or **Esc** to cancel. To change the selection
in an installed project, run:

```console
npx @pathbit/agentdevkit agents --select
```

With Node.js and the npm that comes with it, the installation works in a folder
without Git. The application tools and code clients are needed when you use
them. The kit does not install them during `init`. To test the menu in the
developing checkout, use `npm run cli -- init` or `npm run cli -- agents
--select`.

If you already use another package manager, use its launcher.

```console
pnpm dlx @pathbit/agentdevkit init
yarn dlx @pathbit/agentdevkit init
bun x @pathbit/agentdevkit init
```

The four forms were exercised in macOS with the version `0.0.30` published. The
contract to preserve the current version is in [Git and
migration](#git-and-migration)With Yarn, `yarn dlx -q` avoids messages from the
manager before exit `--json`.

To explicitly choose this registry:

```console
npx --registry=https://registry.npmjs.org @pathbit/agentdevkit init
```

### GitHub Packages

The package is public, but this registry requires authentication to download.
Create a [classic personal access token][tokens] with `read:packages`.
Authenticate once on your computer.

```console
npm login --registry=https://npm.pkg.github.com --auth-type=legacy --scope=
```

Enter your GitHub username and use the token as the password. npm stores the
credential in your user's file, linked to the GitHub host. `--scope=` avoids
creating a permanent mapping of the scope; never place the token in shared
commands or in the repository. [official authentication][github-auth].

Then install with npx:

```console
npx --registry=https://npm.pkg.github.com @pathbit/agentdevkit init
```

The npx options, like `--registry`♪ Stay ♪ **before** of the package name.
`@pathbit:registry` already configured may prevail over this option; check out
the [registry
diagnosis](troubleshooting.md#download-platform-or-failing-tool).

### Options and verification

No additional command, the package executes `init`. In the first interactive
use, the wizard asks for the language, selection of agents and the goal they
lack. In terminals without menu support, enter commas-separated IDs. With
explicit language and clients, use `--purpose` to indicate the goal. In the chat
of a desktop agent, tell which client you want to use and ask to run the CLI in
the project folder.

See [CLI](cli.md) to add selection, destination and simulation. `--json`,
`--yes`, `--dry-run` or absence of interactive terminal avoid questions. No
explicit or saved choice, `none` prepare the shared instructions and
`AGENTS.md`. Start with the customer ID you use. It is possible to add another
later with `agents add <id>`. Option `--agents all` selects all active
customers. [Client list][clients]

After installing, confirm the version and check the diagnosis:

```console
npx @pathbit/agentdevkit --version
npx @pathbit/agentdevkit doctor
```

In a project with Git, use it too `npx @pathbit/agentdevkit sync --check` To
check the notes. `doctor` You can report a to-do of local Git rules. [Diagnosis
and Synchronisation][diagnostics]

If you chose GitHub Packages, use the same prefix `npx
--registry=https://npm.pkg.github.com` in these commands. To fix a version, add
it to the package name. Use the same version to simulate, apply and verify. `npx
@pathbit/agentdevkit next` to resume for the purpose of the project.
[tools](prerequisites.md#after-installing-the-kit) when the task demands.

### Simulate on an existing project

At the project root, use the same language and client in the simulation and
application. In this example, the client is Codex:

```console
npx @pathbit/agentdevkit init --lang en --agents codex --dry-run
```

The plan lists changes and conflicts. Add `--json` to consult the full list and
preservation reasons. After revision, run the same `init` without `--dry-run`.
To install only the shared instructions, use `--agents none` on both commands.
If the kit is already installed, simulate
[`update`](#update-and-choose-agents)In a monorepo, choose the root where
the team keeps the instructions and open the agent in that same directory.

### Keep the hub local

Use `init --local` to keep the `.pbai4devs` hub in your checkout. The kit adds a
rule in `.pbai4devs/.gitignore`. This helps when a project validator relies on
Git to list its files. From the project directory, preview the installation.

```console
npx @pathbit/agentdevkit init --local --agents none --lang en --dry-run
```

Review the plan and repeat the command without `--dry-run`. The same
`init --local` command enables the mode in an existing installation. Run
`doctor` and `sync --check` from the same directory to verify the result.
`update` and `sync` preserve the saved setting.

The rule covers untracked files inside `.pbai4devs`. The kit preserves the Git
index, the repository configuration, and the root `.gitignore`. Git continues
tracking files already in its index. `AGENTS.md`, client files, and test
artifacts may appear in `git status` depending on the project's rules.

## What's in the project

| Content | Treatment |
| --- | --- |
| `.pbai4devs` with features and templates | Shared source of the kit. |
| Customer resources | Local notes; they can appear in Git. |
| Root entries created by the kit | Local files generated. |
| Indexes, manifesto and selection | Local derivatives; check the ignore kit. |
| Human Archives | Check out the plan and the limits below. |
| Downloads and test results | Locations; check out the rules of the project. |
| `.pbai4devs/LICENSE` | License MIT from the kit, copied from the package. |

Updates preserve ACLs and extended attributes supported by the native copy of
the platform. In macOS, ACLs that deny writing, protection flags and metadata
whose reading fails keep blocking the change. The directory check, simultaneous
changes and ACLs in Windows has limits; check [conflicts and
backups](troubleshooting.md#conflicts-and-backups) before you restore it.

The full generator remains in the npm package. It does not copy `bin/`, `src/`,
`scripts/release/` or product tests for the project served. Installing the kit
does not start an application or install all tools. The existing license at the
project root is not replaced. The copy of the hub identifies the AgentDevKit
resource license without redefining the project.

## Git and migration

Ignore him from `.pbai4devs` control only your own tree. The kit preserves the
Git configuration, index and the project ignore rules. Notes, results and
private files can appear in Git. Before adding them, check the status and adjust
the project rules.

When updating or synchronizing, the kit migrates the block of exclusions from
0.0.21 when it proves its content and there is a single worktree. Removes the
marking and duplicates of the block, preserves the order of effective rules and
saves the original in `.agent-tests/agentdevkit/ignore-migrations/`. Changed or
shared blocks are pending for review. `doctor` e `sync --check` they also point
out visible credentials and artifacts already tracked.

Ignore does not remove already tracked files. The team decides how to adjust the
tracking. `--dry-run` e `sync --check` They don't change the index.

## Update and choose agents

Use the desired version of the package to plan and apply the update. For
example, to use the version marked as `latest` in npm:

```console
npx @pathbit/agentdevkit@latest update --dry-run --json
```

Review `plan`, `conflicts` e `preserved`. After revision, apply the plan using
the version indicated in the field `version` JSON answer. In the command below,
replace `VERSÃO` by the number displayed:

```text
npx @pathbit/agentdevkit@VERSÃO update
```

Use `doctor` And, with Git, `sync --check` After the update.

The saved selection remains valid. To adjust it, see `agents`, so use `agents
add cursor` to add or `agents remove cursor` to withdraw only this client.
`agents codex,claude` replaces the full list and `agents none` keeps only shared
resources. Selection changes accept `--dry-run`.

`E_UPGRADE` indicates that the format needs updated local scripts. If the plan
points to its own script, conciliate it with the package version before applying
the selection change. `sync` uses the fonts already installed and does not
download a new version. [Reference CLI](cli.md) to all commands.

To update facilities with old Antigravity, Kimi or Gemini folders CLI, consult
[customer migration][migracao].

## Preserving files

Skills and other own resources can coexist with those of the kit. An equal name
does not prove property: human content and additional files should not be
discarded to rebuild notes. Automatic removals are restricted to obsolete files
whose property can be proven. `--force` does not allow to replace own content;
backups stay in `.agent-tests/` and should be reviewed when there is managed
repair.

In entries like `AGENTS.md` or `CLAUDE.md` and in compatible native resources,
the kit may add a delimited reference:

```markdown
<!-- BEGIN AGENTDEVKIT -->
Leia e siga [origem](caminho/para/.pbai4devs/recurso.md).
<!-- END AGENTDEVKIT -->
```

Human text and frontmatter remain; the reference uses the actual path of the
resource. A file that cannot receive the block is preserved and informed without
promising the addition of the pointer. Repeat operation does not duplicate the
block. Edit your instructions outside the generated block. Input names with
different box are reused when there is a single option. Settings that are not
instructions do not receive an arbitrary merge. Mixed files do not belong to the
kit. Their visibility to Git also depends on the rule applied to the client
folder.

Preexisting symbolic links are preserved without crossing them. `preserved`
lists own paths found in planning or collisions, without inventorying unexamined
routes. The absence of a path does not prove that it has been verified or
preserved. An unsupported format or a changed block is informed; `--force` does
not allow erasing human instructions to reconstruct a note.

This preservation does not authorize to exchange files managed by links. Links
on paths already belonging to the kit, hub, state or tools remain subject to
security refusal. No human link is adopted as property of the kit, and `--force`
It doesn't replace him.

Human files continue to belong to the team, including when they contain a link.
If an update fails, the kit preserves the partial state and shows how to consult
the journal and compare the project with the previous copy. Follow [recovery
procedure](troubleshooting.md#resume-after-interruption) before you resume
the operation.

O [workflow](workflow.md) guides the next step of the project. If there is
error, see [troubleshooting](troubleshooting.md).

[Wiki](../README.md) · [Safety spec.][spec]

[bootstrap]: ../kit/scripts/preparar-ferramentas/BOOTSTRAP.md
[clients]: ../kit/COMPATIBILIDADE.md
[diagnostics]: cli.md#diagnosis-and-synchronisation
[migracao]: ../kit/COMPATIBILIDADE.md#migrate-legacy-folders
[spec]: ../specs/security-ecosystem/SPEC.md
[tokens]: https://github.com/settings/tokens
[github-auth]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages

[reading-pt]: ../../guides/installation.md
[reading-en]: installation.md
[reading-es]: ../../es/guides/installation.md
