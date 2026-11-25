---
description: "Validation of local browser scripts and recordings."
language: en
---

# Webreel

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Source: [official documentation](https://webreel.dev)- Apache-2.0; Node 24+.
Configuration and channel `latest`: [TOOL.json](../../../../../.pbai4devs/tools/webreel/TOOL.json).

```console
node .pbai4devs/tools/webreel/SCRIPT.mjs install
node .pbai4devs/tools/webreel/SCRIPT.mjs run validate -c roteiro.json
node .pbai4devs/tools/webreel/SCRIPT.mjs run record --dry-run -c roteiro.json
```

To save, inform existing executables on `CHROME_HEADLESS_PATH`, `CHROME_PATH` e
`FFMPEG_PATH`; without the overrides CLI low `~/.webreel`. `validate`, `record
--dry-run` Save videos, frames and captures on `.agent-tests/`; view the
scripts.

Adapter: macOS x64/ARM64, Linux x64 and Windows x64. Other architectures require
override and validation-compatible executables before zooming
[TOOL.json](../../../../../.pbai4devs/tools/webreel/TOOL.json). [Common operations](../README.md).

[reading-pt]: ../../../../../.pbai4devs/tools/webreel/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/tools/webreel/README.md
