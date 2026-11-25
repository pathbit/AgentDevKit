---
description: "Origen y uso local de Markdown lint."
language: es
---

# Markdownlint-cli2

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Origen: [repositorio oficial](https://github.com/DavidAnson/markdownlint-cli2).
O [TOOL.json](../../../../../.pbai4devs/tools/markdownlint-cli2/TOOL.json)
define el paquete npm, canal `latest` y un probe de
lint.

```console
node .pbai4devs/tools/markdownlint-cli2/SCRIPT.mjs install
node .pbai4devs/tools/markdownlint-cli2/SCRIPT.mjs update
node .pbai4devs/tools/markdownlint-cli2/SCRIPT.mjs run README.md
```

Requiere Node 24+/npm para la preparación; usa JavaScript, sin binario nativo
propio. `check` ejecuta lint en una entrada válida. La aplicación de los
patrones del proyecto se encuentra en `verificar-recursos`; informes locales se
encuentran en `.agent-tests/`.

[reading-pt]: ../../../../../.pbai4devs/tools/markdownlint-cli2/README.md
[reading-en]: ../../../../en/kit/tools/markdownlint-cli2/README.md
[reading-es]: README.md
