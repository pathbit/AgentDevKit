---
description: "Local Bash execution in virtual environment."
language: en
---

# Just Bash

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Source: [Vercel Labs][source]- Apache-2.0; Node 24+. Configuration and channel
`latest`: [TOOL.json](../../../../../.pbai4devs/tools/just-bash/TOOL.json).

```console
node .pbai4devs/tools/just-bash/SCRIPT.mjs install
node .pbai4devs/tools/just-bash/SCRIPT.mjs run -c 'printf "ok\n"' --json
```

`--root <pasta>` reads files from disk and blocks written by default.
`--allow-write` enables written in an OverlayFS in memory, discarded at the end;
host files are preserved. Use this CLI for compatible shell tasks; check
applications with your real tests and runtimes. Packages stay in `.local/`.

[Common operations and platforms](../README.md).

[source]: https://github.com/vercel-labs/just-bash/tree/main/packages/just-bash

[reading-pt]: ../../../../../.pbai4devs/tools/just-bash/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/tools/just-bash/README.md
