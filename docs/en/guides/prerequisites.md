---
description: "Install Node.js and npm on Windows, macOS or Linux before using the kit."
language: en
---

# Prepare the prerequisites

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Install **Node.js 24+ with npm**. Npm includes command `npx`, which runs
AgentDevKit without global installation. Use the runtime and package manager
your project already uses to compile and test the application. Git is optional
to install the kit.

## Check before installing

At the computer or agent terminal, run:

```console
node --version
npm --version
npx --version
```

With Node 24+ and the three commands running, follow the [fast
start](../../../README.en.md#quick-start) or consult [installation
methods](installation.md#install). Use the same environment where you will open
the project: Windows and WSLFor example, they have separate facilities.

## Windows

Use **Node.js 24.13.1 or later in series 24 LTS**, or Node.js LTS 26 or later.
These series include removal correction on Windows paths with accents. Check the
version before running the kit. [Notes from Node.js 24.13.1][node-unicode].

On PowerShell, with [WinGet][winget] available:

```powershell
winget install --id OpenJS.NodeJS.LTS --exact --source winget
```

Without WinGet, open the [official download of Node.js][node], select a version
LTS compatible and use Windows installer `.msi` of your architecture. Keep npm
and inclusion in PATH enabled. Close and reopen the terminal; in the VS Code,
also reopen the integrated terminal. Repeat the three commands above.

## macOS

No [official download][node], select Node LTS 24 or more and the macOS installer
`.pkg`. Complete the installation, reopen the terminal and check the versions.
The installer includes npm and npx.

If you're already using Homebrew, you can keep this flow:

```sh
brew install node@24
export PATH="$(brew --prefix node@24)/bin:$PATH"
```

The second line is valid for the current terminal. For other terminals, follow
the instructions of PATH displayed by Homebrew; do not replace your entire
profile. [official formula][brew].

## Linux

In Bash or Zsh, use the [nvm][nvm] to install Node 24 on your user.
Debian/Ubuntu, prepare the dependencies if missing:

```sh
sudo apt-get update
sudo apt-get install -y curl ca-certificates tar xz-utils
```

In another distribution, install the equivalents by your package manager. Run
the official nvm installer and then install Node:

```sh
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/install.sh | bash
```

Reopen the terminal to load nvm; then run:

```sh
nvm install 24
nvm use 24
```

nvm configures your user profile and includes npm/npx with Node. In Alpine or
other distribution with musl, confirm the support of the version and
architecture in [official download][node]; do not use a glibc binary in this
environment.

## Prepare with agent help

You can also order from your agent's app or terminal:

> Check out Node, npm and npx in this environment. If missing, install Node 24+
> by
> mechanism suitable to my system, preserve the existing configuration and
> continue until validating the three commands. Then help me choose npm or
> GitHub Packages and the agents I'll be using on this project.

The agent needs access to the terminal, network and system installation
permissions. Node/npm, o `npx` You can't run the kit yet. Launcher accepts Node
18 to prepare a local runtime. Affected versions in Windows can reuse a
compatible cache. To install a runtime from one of these versions, use the
system manager.

O [kit bootstrap][bootstrap] use `tar` native when you need to download a
runtime, check the checksum and do not change the PATH permanently.

## After installing the kit

Choose the tools required for the task. To prepare and check only lint Markdown,
for example:

```console
npx @pathbit/agentdevkit plugins info markdownlint-cli2
npx @pathbit/agentdevkit plugins install markdownlint-cli2
npx @pathbit/agentdevkit plugins check markdownlint-cli2
```

To use GitHub Packages, add `--registry=https://npm.pkg.github.com` before the
package name, as in [installation guide](installation.md#github-packages). O
[plugins tab](plugins.md) explains how to choose an item by ID. `tools setup`
prepares and verifies the compatible tools of a selection. `tools setup base`
limits the preparation to browser and lint. The installation of CLIs does not
install browsers, FFmpeg does not grant desktop permissions; see the task
requirements in [tools and tests](tools-and-testing.md).

[Wiki](../README.md) · [Install kit](installation.md)

[node]: https://nodejs.org/en/download
[node-unicode]: https://nodejs.org/en/blog/release/v24.13.1
[winget]: https://learn.microsoft.com/en-us/windows/package-manager/winget/install
[brew]: https://formulae.brew.sh/formula/node@24
[nvm]: https://github.com/nvm-sh/nvm#installing-and-updating
[bootstrap]: ../kit/scripts/preparar-ferramentas/BOOTSTRAP.md

[reading-pt]: ../../guides/prerequisites.md
[reading-en]: prerequisites.md
[reading-es]: ../../es/guides/prerequisites.md
