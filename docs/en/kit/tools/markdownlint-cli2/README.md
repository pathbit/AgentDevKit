---
description: "Origin and local use of Markdown lint."
language: en
---

# Markdownlint-cli2

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Source: [official repository](https://github.com/DavidAnson/markdownlint-cli2).
O [TOOL.json](../../../../../.pbai4devs/tools/markdownlint-cli2/TOOL.json) sets
the npm package, channel `latest` And a lint
probe.

```console
node .pbai4devs/tools/markdownlint-cli2/SCRIPT.mjs install
node .pbai4devs/tools/markdownlint-cli2/SCRIPT.mjs update
node .pbai4devs/tools/markdownlint-cli2/SCRIPT.mjs run README.md
```

Requires Node 24+/npm for preparation; uses JavaScript, without native binary
itself. `check` runs lint in a valid input. The application of project patterns
is in `verificar-recursos`; local reports remain in `.agent-tests/`.

[reading-pt]: ../../../../../.pbai4devs/tools/markdownlint-cli2/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/tools/markdownlint-cli2/README.md
