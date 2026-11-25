---
description: "Origin and local use of agent-browser."
language: en
---

# Agent-browser

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Source: [official installation](https://agent-browser.dev/installation). O
[TOOL.json](../../../../../.pbai4devs/tools/agent-browser/TOOL.json) sets the
npm package, channel `latest`The field.
`executables` declares the binaries that receive execution permission in the
preparation POSIX, without enabling package installation scripts.

```console
node .pbai4devs/tools/agent-browser/SCRIPT.mjs install
node .pbai4devs/tools/agent-browser/SCRIPT.mjs update
node .pbai4devs/tools/agent-browser/SCRIPT.mjs run --version
```

Use `check` to check the installation and `info` to see its configuration.
Preparation requires Node 24+/npm. Use Chrome/Chromium existing by `run
--executable-path <caminho> ...`; script does not download a browser. Launcher
posted for Windows ARM64 you can use x64 binary emulation. Before automation,
read `run skills get core` Installed version. Packages and installation logs are
in `.local/`; the state of CLI can use `~/.agent-browser`, according to
[official configuration](https://agent-browser.dev/configuration). The script
does not change `HOME`The tests use their own session and close it when they
finish.

If the browser refuses session name because of Unix socket length, set
`AGENT_BROWSER_SOCKET_DIR` for a private directory with short path. This may be
necessary when running tests in a temporary folder deep in macOS.

[reading-pt]: ../../../../../.pbai4devs/tools/agent-browser/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/tools/agent-browser/README.md
