---
description: "Installation, updating and execution of local tools."
language: en
---

# Prepare Tools

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

O [catalog](../../tools/README.md) is discovered by the archives `TOOL.json`.

## First Use

Ask the agent. `instalar-ferramentas`He follows the [automatic
preparation](BOOTSTRAP.md): check Node/npm, install the local runtime when
needed and continue on its own until the validation of the tools. JavaScript
initializer accepts Node 18+ and prepares Node 24+ locally. Node/npm, the agent
uses the OS manager before running the kit. No permanent change in PATH Neither
Bash nor PowerShell scripts.

If Node 24+ with npm is already available, you can also run directly:

```sh
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs setup
```

`setup` reuses healthy facilities and executes `check` for each tool. Accept
`base`, group or name; no selection, use `all`. Incompatibilities in the general
selection are reported as not applicable; ask for one by default name.
instalação/verificação are reported and return code 1. `all` omit tools with
`optIn: true`- Use it. `setup workflow` to prepare the optional group or
`install <nome>` for an item. Without functional npm, prepare for before
changing the tools. When moving the hub, preserve your folders `.local` e
`.cache`; `setup` reuses packages and creates missing local shortcuts with
relative imports. If a file occupies the destination with different content, the
action informs the path and preserves the file.

## Individual operations

With runtime available, perform the action directly. If it is missing, use `node
.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.mjs --runtime-only` and reuse
the returned path; this mode does not install tools.

At the root of the repository:

```sh
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs list
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs install skills
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs update base
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs check all
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs unlock skills
```

`info <nome>` shows configuration and state. `check <nome>` performs the survey
of the existing installation, and `run <nome> [argumentos]` call the tool.
Without action, there is help. Each tool has a single input `SCRIPT.mjs`,
executed with Node on any system. CLI the installed kit, `plugins install <id>`
e `plugins check <id>` they also use this manager for one tool at a time.

`unlock <nome>` recovers only a local lock with PID provenly dead. Active locks,
from another host or without verifiable metadata are preserved. Do not accept
groups. A missing lock does not create files.

The common requirement is Node.js 24+ with npm. The manager uses the current
Node. Npm packages use the official registry with disabled installation scripts.
Native scanners use official GitHub asset with version and SHA- 256 reviewed.
`update` follow `latest` in npm and the catalog pin on native scanners. Both
paths give integrity before running and preserve the previous version if update
fails. POSIX are applied only to paths declared in `executables` in `TOOL.json`,
before the probe. Updates use staging and preserve the previous version in case
of failure. Local shortcuts refuse directories and symbolic files before
writing. Preparation validates CLIs. Browser, desktop permissions and FFmpeg
depend on the task; it does not start applications or grant permissions
automatically. In the group `security`, the basis OSV is also separated from
CLI. Use the command [Preparing for
safety](../../commands/preparar-seguranca/COMMAND.md) to guide installation,
explicit updating of data and offline analysis.

Tests: `node --test .pbai4devs/scripts/preparar-ferramentas/tests/TEST.mjs`.
After installing `skills`, `just-bash`, `opensrc`, `webreel` e `portless`,
execute `node .pbai4devs/scripts/preparar-ferramentas/tests/SMOKE_VERCEL.mjs`.
It proves local discovery, virtual shell and script validation; Portless
receives probes. Video, proxy, TLS and font downloads are not exercised. Reports
stay in `.agent-tests/vercel-labs/`.

[reading-pt]: ../../../../../.pbai4devs/scripts/preparar-ferramentas/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/scripts/preparar-ferramentas/README.md
