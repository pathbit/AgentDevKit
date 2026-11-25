---
description: "Fuentes de dependencias con caché local aislado."
language: es
---

# Opensrc

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Origen: [Vercel Labs][source]. Apache-2.0; Node 24+ y Git para obtener fuentes.
Preferencias y canal `latest`: [TOOL.json](../../../../../.pbai4devs/tools/opensrc/TOOL.json).

```console
node .pbai4devs/tools/opensrc/SCRIPT.mjs install
node .pbai4devs/tools/opensrc/SCRIPT.mjs run list --json
node .pbai4devs/tools/opensrc/SCRIPT.mjs run path --help
```

El instalador usa `--ignore-scripts`: el paquete incluye los binarios nativos y
su `postinstall` Puede cambiar accesos rápidos globales. `OPENSRC_HOME`
direcciona fuentes e índice en `.local/cache/`. `path pacote@versao` fuentes
bajas ausentes en la caché; `list --json` consulta el índice. Descargas de
fuentes siguen la necesidad de la tarea; dependencias de la aplicación se
decidirán después de los documentos de producto.

Suporta macOS/Linux x64 e ARM64, Linux musl y Windows x64. El release actual no
incluye binario Windows ARM64. [Operaciones comunes](../README.md).

[source]: https://github.com/vercel-labs/opensrc/tree/main/packages/opensrc

[reading-pt]: ../../../../../.pbai4devs/tools/opensrc/README.md
[reading-en]: ../../../../en/kit/tools/opensrc/README.md
[reading-es]: README.md
