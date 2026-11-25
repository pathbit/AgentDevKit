---
description: "Optional agent-desktop origin and local use."
language: en
---

# Agent-desktop

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Source: [official installation](https://agent-browser.dev/desktop/installation).
O [TOOL.json](../../../../../.pbai4devs/tools/agent-desktop/TOOL.json) sets the
npm package, channel `latest`, platforms and
probe.

```console
node .pbai4devs/tools/agent-desktop/SCRIPT.mjs install
node .pbai4devs/tools/agent-desktop/SCRIPT.mjs update
node .pbai4devs/tools/agent-desktop/SCRIPT.mjs run status
```

Use `check` to check the installation and `run version` to see the version. The
script uses `AGENT_DESKTOP_HOME` ed `.local/state`, without changing `HOME`.
Common preparation requires Node 24+/npm. Interaction depends on OS: [macOS 13+
and permissions](https://agent-browser.dev/desktop/platforms/macos), [Linux with
glibc and AT-sessionSPI](https://agent-browser.dev/desktop/platforms/linux) or
Windows compatible. Install does not grant permissions or open applications.
Before acting, read `run skills get desktop` e `run skills get platform`.

The test
[SMOKE_DESKTOP.mjs](../../../../../.pbai4devs/scripts/preparar-ferramentas/tests/SMOKE_DESKTOP.mjs)
opens an isolated Chrome and reads its window by accessibility, without physical
input. Requires graphical session, permissions and Chrome installed; closes its
own session.

[reading-pt]: ../../../../../.pbai4devs/tools/agent-desktop/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/tools/agent-desktop/README.md
