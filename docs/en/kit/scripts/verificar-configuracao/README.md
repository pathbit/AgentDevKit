---
description: "Checks the indicators recorded before implementation."
language: en
---

# Check Settings

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

```sh
node .pbai4devs/scripts/verificar-configuracao/SCRIPT.mjs
```

To consult only the preparation before the spec, add `--preparacao`. In this
mode, pending technical configuration does not block the query.

Read only: without the option, returns `1` if the state is absent, inaccessible,
ambiguous or with preparation or pending configuration. Returns `0` e
`verificar-evidencias` when both indicators record `concluido`. Com
`--preparacao`, the same result requires only the preparation indicator. To
avoid ambiguities, refuse complex keys and tags, anchors, aliases or merges at
the top of the header. Symbolic links detected are refused; reading is not an
atomic lock against simultaneous path changes. Do not validate the YAML whole,
the infrastructure or the evidence; check them before writing. The command does
not block changes from those who ignore its result.

Legacy status is recognized without migration; conflicted states are refused.
Errors of use return `2`.

[reading-pt]: ../../../../../.pbai4devs/scripts/verificar-configuracao/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/scripts/verificar-configuracao/README.md
