---
description: "Local installation reviewed from osv-scanner."
language: en
---

# osv-canner

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Comparing dependencies with previously downloaded vulnerabilities bases.

Reviewed version: **2.7.1**. License:
[Apache-2.0](https://github.com/google/osv-scanner/blob/v2.7.1/LICENSE).
Downloads comes from [Official
release](https://github.com/google/osv-scanner/releases/tag/v2.7.1); each
platform has SHA-256 fixed at `TOOL.json`.

`SCRIPT.mjs install` download and check the executable. `update` applies revised
version of the catalog; does not select `latest` No review. `check` verifies
integrity and networkless version; `run` preserves arguments and exit code.
`node .pbai4devs/tools/osv-scanner/SCRIPT.mjs <acao>`.

Use `--offline` to prevent queries during scanning. Upgrading the bases is a
separate operation; base absence does not mean absence of vulnerabilities.

Binarios, caches and results are local and ignored. CLI does not require an
account or payment. [manager](../../scripts/preparar-ferramentas/README.md).

[reading-pt]: ../../../../../.pbai4devs/tools/osv-scanner/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/tools/osv-scanner/README.md
