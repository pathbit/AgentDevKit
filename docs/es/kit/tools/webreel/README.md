---
description: "Validación de guiones y grabaciones locales de navegador."
language: es
---

# Webreel

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Origen: [documentación oficial](https://webreel.dev). Apache-2.0; Node 24+.
Preferencias y canal `latest`: [TOOL.json](../../../../../.pbai4devs/tools/webreel/TOOL.json).

```console
node .pbai4devs/tools/webreel/SCRIPT.mjs install
node .pbai4devs/tools/webreel/SCRIPT.mjs run validate -c roteiro.json
node .pbai4devs/tools/webreel/SCRIPT.mjs run record --dry-run -c roteiro.json
```

Para guardar, informe los ejecutables existentes en `CHROME_HEADLESS_PATH`,
`CHROME_PATH` e `FFMPEG_PATH`; sin los overrides o CLI baja en `~/.webreel`.
`validate`, `record --dry-run` y los probes dispensan estos descargas. Salve
videos, frames y capturas en `.agent-tests/`; versione los guiones.

Adaptador: macOS x64/ARM64, Linux x64 y Windows x64. Otras arquitecturas
requieren ejecutables compatibles por override y validación antes de ampliar el
[TOOL.json](../../../../../.pbai4devs/tools/webreel/TOOL.json). [Operaciones comunes](../README.md).

[reading-pt]: ../../../../../.pbai4devs/tools/webreel/README.md
[reading-en]: ../../../../en/kit/tools/webreel/README.md
[reading-es]: README.md
