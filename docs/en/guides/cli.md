---
description: "AgentDevKit commands, options and answers."
language: en
---

# Reference CLI

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Run the public npm package by `npx`, without login:

```console
npx @pathbit/agentdevkit --help
```

For GitHub Packages, please inform the
[installation](installation.md#github-packages) and use the prefix `npx
--registry=https://npm.pkg.github.com` on the same commands.

On the tables, `agentdevkit` represents `npx @pathbit/agentdevkit`. Run the
examples in the project folder or enter `--target <pasta>`. If you are working
on AgentDevKit checkout, run `npm run cli -- <comando>` or `node
bin/agentdevkit.mjs <comando>` to test the local code. In the attended project,
use `npx` to execute the package.

## Commands

| Command | Result |
| --- | --- |
| `init [pasta]` | Install the kit in the project or reapply the installation. |
| `update` | Update the source using the version of the executed package. |
| `sync` | Update catalogs and notes from the local source. |
| `sync --check` | Checks synchronization without changing the project. |
| `doctor` | Diagnoses the kit and indicates disagreements. |
| `recovery` | Please consult the journal and copy of the pending operation. |
| `recovery resolve <geração> <id>` | Records the reviewed resolution. |
| `next` | Show us the next step, without starting it. |
| `next --intent run` | Guides the preparation of an existing project. |
| `next --integrations` | Indicates where to consult artifacts from other methods. |
| `document` | Surveys an existing system using local files. |
| `lang [idioma]` | Query or change the language: pt, en or es. |
| `agents` | Shows the available clients and saved selection. |
| `agents --select` | Opens the selection menu in an interactive terminal. |
| `agents codex,claude` | Replaces the selection and synchronizes the notes. |
| `agents add <ids>`, `agents remove <ids>` | They've changed the given IDs. |
| `agents all` | Select all compatible customers. |
| `agents none` | Keeps the hub without a specific client. |
| `plugins list`, `plugins info <id>` | Consult plugins and their origins. |
| `plugins install <id>`, `plugins check <id>` | Prepare or check plugins. |
| `tools <ação>` | Query, install, update or execute tools. |
| `--help`, `--version` | Help or package version. |

Uncommanded, a CLI executes `init`, which can create files. `language` It's by
the way. `lang`; `clients`, of `agents`. The language does not translate
existing documents.

If the journal indicates a pending operation, see [recovery
procedure](troubleshooting.md#resume-after-interruption) before running
`recovery resolve`.

## Options

| Option | Usage |
| --- | --- |
| `--target <pasta>` | Target project; do not match with target folder `init`. |
| `--lang <idioma>` | Language of this execution. |
| `--agents <lista>` | Comma-separated IDs, `all` or `none`. |
| `--clients <lista>` | Alias for `--agents`. |
| `--yes`, `-y` | Avoids initial questions; does not force conflicts. |
| `--dry-run` | Displays the plan without applying changes. |
| `--local` | In `init`, keeps the new hub files on local checkout. |
| `--check` | In `sync`, checks the project without applying synchronization. |
| `--force` | Requests enabled managed repairs, with backup. |
| `--json` | Produces an answer JSON for automation. |
| `--intent` | Purpose of the consultation `next`. |
| `--purpose` | Objective guiding the next step in `init`. |
| `--markdown` | In `document`, issues the inventory at Markdown. |
| `--integrations` | In `next`: consultation of external references in the project. |

In the first terminal use, use the arrow keys and Space in the agent menu. Enter
confirms and Esc cancels. In installed projects, `agents --select` open the list
with the existing selection. With explicit language and clients, use `--purpose`
to indicate the objective. Without interaction, the explicit options are worth,
the selection saved and, lastly, `none`. Check out the [IDs and
dependencies](../kit/COMPATIBILIDADE.md).

`agents --json` informs `kitInstalled`, `configuredClients`, `clientRoots` and,
when there is an installation, `statePath`. Selection indicates which customers
receive kit features. Use `doctor` e `sync --check` to check the generated
files.

With `none`, `clients` contains `["none"]` e `configuredClients` It's empty.
`clientRoots` includes shared paths that the selected client uses. To change
only a few customers, pass individual IDs separated by comma to `agents add` or
`agents remove`- Use it. `agents all` or `agents none` to replace the entire
selection.

Use `init --purpose agents|product|run|document` to indicate whether you want to
prepare the agents, plan product, run the application or document what exists.
The goal guides the next action of CLI.

`init --local` record the rule in `.gitignore` from the hub and saves that
choice to `update` e `sync`. Test with checkout executable according to the
[local installation guide](installation.md#keep-the-hub-local).

## Prepare an existing project

In the folder that received the kit, see `next --intent run` to prepare the
execution. In a monorepo, use the root if the installation is shared. Aim a
module when it has its own installation.

```console
npx @pathbit/agentdevkit@0.0.38 next --intent run --target "../Meu projeto"
```

To test the developing version, run this command from the source of the
AgentDevKit checkout.

```console
node bin/agentdevkit.mjs next --intent run --target "../Meu projeto"
```

In the developing version, the query can show up to six paths to check, such as
READMEs, manifestos, Compose, Dockerfiles and Makefiles. A project with only
Compose or declared tasks can already receive the skill `preparar-dev`. If there
is no evidence, check the README and confirm the module or team command. The
query reads only files. You choose and execute the project command.

## Update and preview

`update` uses the executed version; to choose another one, set it to the package
name. `sync` use what is already in `.pbai4devs`: it does not download another
version. Both combine features and remove obsolete notes when the property of
the kit is proven. Own features and settings remain in the project. Old
directories without proof of ownership may remain empty. By changing selection,
shared folders continue when another client needs them; additional team files
should be preserved.

In installations legated in the version `0.0.21`, `init --force` e `update
--force` can replace a `.pbai4devs/catalog.json` pre-existing. Preserve a copy
outside the project before executing these commands in this version. In the
tested fixtures, `init` ed `0.0.21` It also added rules to `.git/info/exclude`;
Check out this file if you need to keep Git configuration intact.

Before applying in existing project, check the plan with the version you want to
use. [update guide][update] Shows the full sequence.

```console
npx @pathbit/agentdevkit update --dry-run --json
```

Use `init --dry-run --json`, `sync --dry-run --json` or `agents codex,claude
--dry-run --json` for other operations. `plan`, `conflicts`, `preserved`,
`untrackedPaths` e `localIgnore` before applying. Unsolved conflicts interrupt
the operation; do not assume that a name collision makes a file the property of
the kit. When updating an old installation with Claude rules, the CLI can
preserve the rules and refuse the operation by scope or unverified metadata,
including with `--force`. Review the specified files and their sources and
dependencies; do not delete the rules to circumvent the refusal. A registered
hash does not prove the current metadata or the effective activation in the
client. The human output shows up to five conflicting paths; use `--json` for
the full list and the reasons available on `preserved`. In the migration of
0.0.21, the kit updates global Claude references with proven origin. The old Git
reference is only removed when the exact content is proven and the path is out
of the index. An existing Markdown reference, fully identical to that generated
and without previous record, is preserved and can satisfy the discovery without
being adopted.
Historical removal logs follow previous policy and require revision.
Verifications are not atomic with other file system changes: avoid editing the
files involved while the operation is ongoing.

## Diagnosis and Synchronisation

Use `doctor` to check the installation and `sync --check` to detect divergences
in relation to the installed sources. The two commands only consult the project.
If there are proposed changes, examine `sync --dry-run --json` before running
`sync`Without Git, the CLI may indicate Git's to-do in `sync --check`.

The independent synchroniser can also be executed by [local
script](../kit/scripts/sincronizar-agentes/README.md)- Yours.
`--check` it just checks and `--force` is explicit on the command line.
[sync](../kit/commands/sincronizar/COMMAND.md) guides review and apply
the plan by CLI; `--force` It's an explicit option.

The field `localIgnore.legacyMigration` shows the planned or applied migration
of the block of 0.0.21 ed `.git/info/exclude`. If applied, informs the path of
the original copy. The configuration and the Git index remain preserved, and
`untrackedPaths` remains empty. [Git and
migration](installation.md#git-and-migration) for conditions and notices of
visibility.

## & Tools

To prepare a specific item, use `plugins list`, `plugins info <id>` And then
`plugins install <id>`. Before `init`, `list` e `info` they consult the packaged
catalogue. `install` e `check` use the kit installed in the project. See
backgrounds, licenses and requirements in [plugins tab](plugins.md).

The shares are `list`, `setup`, `install`, `update`, `check`, `info`, `run` e
`unlock`. Consult or execute does not install silently. `setup` prepares
compatible tools; other commands can receive a name or group. See [tools and
tests](tools-and-testing.md).

In `tools`, use `--` before the arguments that belong to the tool:

```console
npx @pathbit/agentdevkit tools run agent-browser -- --json --help
```

In this example, `--json` It belongs to the agent-browser. Kit options stay
before the separator. `--help` e `--version` the kit does not require an
installed project.

## JSON and return

The Answers JSON include `ok`, `command`, `version`, `language`, `target` e
`next`. According to the operation, there is selection, plan, conflicts, backup
and errors. Read structured fields, do not depend on message translation. `next
--intent product`, after a completed inspection, `stage` identifies the
suggested step and `maturity` indicates the detected maturity. No kit installed
or with incomplete inventory, `maturity` They're not approvals, in the
developing version, `next --intent run --json` includes `next[0].references`
when you find files to guide the execution. The paths are relative to the target
project. `next --integrations` adds `integrations` the normal response, with
`id`, `name`, `url`, `paths` related to root and `instruction` by method. When
there is a corresponding plugin, `plugin` indicates the ID for `plugins info`.
The query works before installation. It only indicates recognized default paths
and does not open external documents, download packages or execute tools.
`preserved` lists paths maintained by the project and the reason. A complement
can be managed by block without making the file property
Kit. Human content is not replaced by `--force`. If planning, application or
`tools` failure after a possible change, `next` in this response guides to
preserve files and review the state before resuming. This warning does not
create a persistent pending or prevents another call. If the output itself
fails, it may be incomplete; do not suppose that an answer JSON Partial can be
recovered automatically.

| Code | Meaning |
| --- | --- |
| `0` | Operation completed; also examine the type of response. |
| `1` | Failure, conflict or diagnosis with pending. |
| `2` | Invalid arguments; tools can propagate other codes. |

`doctor` Check the kit, not the whole product. `next` can end successfully while
orienting a still pending step. In a healthy Git repository, follow the copied
output command of `init` or `update` for `doctor`♪ then ♪ `sync --check` e
`next`. If there are differences, review the diagnosis and use `sync --dry-run
--json` when specified to check the synchronization plan. For a new feature, use
`next --intent product`- No, no, no, no. `--intent`, `next` query the state to
choose the flow. Check the existing documents and decisions before following the
suggested step. After product and design, it uses the roadmap paths and specs
registered in the state. To guide an existing spec, it requires a single open
reference `[ ]` or in progress `[-]` in roadmap. With more than one spec, closed
delivery, absent link or ambiguous reading, guides the review of roadmap. A
declared status does not prove approval: the skill confers decisions and
evidence. `implementar-spec` verifies the plan before forwarding the technical
configuration; `next` Don't assume approval of the plan.
If the inventory is truncated, `next` guides manual inspection without choosing
a phase or assuming that an existing project is empty. In the intention of
product, warnings in the documentary inventory also ask for inspection: this
includes invalid paths, read errors and symbolic links not followed, even when a
link seems not to be documentation. Please consult the inspector to view the
notices and decide after checking the relevant files.

Use [comparison of methods](comparacao.md) to decide whether to consult an
external artifact. `next` finds references, the additional consultation
preserves the step and the skill indicated for the project.

## Inventory of an existing system

`document` works before installation. In the project folder, use `npx
@pathbit/agentdevkit document` to consult the local inventory, or add `--json`
for automation. manifestos, script names, infrastructure, file samples, tests,
documents and gaps are presented.

`document --markdown` issues on exit a withdrawal with `status: rascunho`.
Behaviors are pending until the source is read. `next --intent document`
indicates `document` and, with the kit installed, the skill `documentar-legado`.
See how to transform inventory into document work in [documentation
guide](documentation.md#documenting-a-system-in-use).

[Wiki](../README.md) · [Troubleshooting](troubleshooting.md)

[update]: installation.md#update-and-choose-agents

[reading-pt]: ../../guides/cli.md
[reading-en]: cli.md
[reading-es]: ../../es/guides/cli.md
