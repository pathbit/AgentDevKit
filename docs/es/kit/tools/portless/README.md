---
description: "Proxy local opcional para URL estables de desarrollo."
language: es
---

# Portless

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Origen: [documentación oficial](https://portless.sh). Apache-2.0; Node 24+.
Preferencias y canal `latest`: [TOOL.json](../../../../../.pbai4devs/tools/portless/TOOL.json).

```console
node .pbai4devs/tools/portless/SCRIPT.mjs install
node .pbai4devs/tools/portless/SCRIPT.mjs run --help
```

Utilice el proxy cuando la tarea exija, siguiendo la preparación prevista en el
proyecto. Comandos de ejecución pueden iniciar servicios y configurar CA,
confianza o hosts; `install` del adaptador sólo prepara el CLI. El estado usa
`.local/state/` por `PORTLESS_STATE_DIR`; cambios de SO siguen el flujo
explícito de configuración de la herramienta. Utilice script con binario local.

[Operaciones comunes y plataformas](../README.md).

[reading-pt]: ../../../../../.pbai4devs/tools/portless/README.md
[reading-en]: ../../../../en/kit/tools/portless/README.md
[reading-es]: README.md
