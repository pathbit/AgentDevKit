---
description: "Ejecución local de Bash en entorno virtual."
language: es
---

# Just Bash

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Origen: [Vercel Labs][source]. Apache-2.0; Node 24+. Preferencias y canal
`latest`: [TOOL.json](../../../../../.pbai4devs/tools/just-bash/TOOL.json).

```console
node .pbai4devs/tools/just-bash/SCRIPT.mjs install
node .pbai4devs/tools/just-bash/SCRIPT.mjs run -c 'printf "ok\n"' --json
```

`--root <pasta>` lee archivos de disco y bloquea escritos por patrón.
`--allow-write` habilita escritas en un OverlayFS en memoria, descartadas al
final; los archivos del host se conservan. Use este CLI para tareas de shell
compatibles; compruebe aplicaciones con sus pruebas y runtimes reales. Paquetes
se quedan en `.local/`.

[Operaciones comunes y plataformas](../README.md).

[source]: https://github.com/vercel-labs/just-bash/tree/main/packages/just-bash

[reading-pt]: ../../../../../.pbai4devs/tools/just-bash/README.md
[reading-en]: ../../../../en/kit/tools/just-bash/README.md
[reading-es]: README.md
