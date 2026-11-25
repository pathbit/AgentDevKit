---
description: "Sources of dependencies with isolated local cache."
language: en
---

# Opensrc

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Source: [Vercel Labs][source]- Apache-2.0; Node 24+ and Git to get fonts.
Configuration and channel `latest`: [TOOL.json](../../../../../.pbai4devs/tools/opensrc/TOOL.json).

```console
node .pbai4devs/tools/opensrc/SCRIPT.mjs install
node .pbai4devs/tools/opensrc/SCRIPT.mjs run list --json
node .pbai4devs/tools/opensrc/SCRIPT.mjs run path --help
```

The installer uses `--ignore-scripts`: the package includes native binaries and
their `postinstall` can change global shortcuts. `OPENSRC_HOME` directs sources
and index in `.local/cache/`. `path pacote@versao` low missing cache fonts;
`list --json` refer to the index. Downloads of sources follow the need for the
task; application dependencies are decided after product documents.

Supports macOS/Linux x64 e ARM64, Linux musl and Windows x64. The current
release does not include Windows ARM64 binary. [Common
operations](../README.md).

[source]: https://github.com/vercel-labs/opensrc/tree/main/packages/opensrc

[reading-pt]: ../../../../../.pbai4devs/tools/opensrc/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/tools/opensrc/README.md
