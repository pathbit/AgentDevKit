---
description: "Opengrep's revised local installation."
language: en
---

# opengrep

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Executes rules SAST stored in the project.

Reviewed version: **1.33.1**. License:
[LGPL-2.1](https://github.com/opengrep/opengrep/blob/v1.33.1/LICENSE). Downloads
comes from [Official
release](https://github.com/opengrep/opengrep/releases/tag/v1.33.1); each
platform has SHA-256 fixed at `TOOL.json`.

`SCRIPT.mjs install` download and check the executable. `update` applies revised
version of the catalog; does not select `latest` No review. `check` verifies
integrity and networkless version; `run` preserves arguments and exit code.
`node .pbai4devs/tools/opengrep/SCRIPT.mjs <acao>`.

Use `--config` with local rules and `--disable-version-check`- Don't use it.
`auto` or rules URLs in local mode.

Binarios, caches and results are local and ignored. CLI does not require an
account or payment. [manager](../../scripts/preparar-ferramentas/README.md).

[reading-pt]: ../../../../../.pbai4devs/tools/opengrep/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/tools/opengrep/README.md
