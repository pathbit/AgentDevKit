---
description: "Validación y archivo deltas con el CLI OpenSpec"
language: es
---

# OpenSpec

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

El complemento instala el CLI [OpenSpec de Fission AI][source], bajo la
[licencia MIT][license]. El instalador obtiene `@fission-ai/openspec` y verifica
el binario `openspec` com `--version`. La instalación exige selección explícita.

En la raíz del proyecto con AgentDevKit instalado:

```console
npx @pathbit/agentdevkit plugins install openspec
npx @pathbit/agentdevkit plugins check openspec
```

En un proyecto con un cambio OpenSpec completado, reemplace `entrega` por el ID
del cambio y revise el delta antes de ejecutar el archivo.

```console
node .pbai4devs/tools/bin/openspec.mjs validate entrega --type change --strict
node .pbai4devs/tools/bin/openspec.mjs archive entrega --yes
```

El archivo aplica los deltas aprobados a las specs vigentes y mueve el cambio
para `openspec/changes/archive/`. O `--yes` confirma la escritura sin prompt.
Para adoptar OpenSpec en un proyecto nuevo, elija y ejecute su flujo de
preparación por separado. El plugin deja la configuración de OpenSpec a cargo
del proyecto.

[Documentación de CLI][cli] · [Herramientas](../README.md)

[source]: https://github.com/Fission-AI/OpenSpec
[license]: https://github.com/Fission-AI/OpenSpec/blob/v2.1.1/LICENSE
[cli]: https://github.com/Fission-AI/OpenSpec/blob/v2.1.1/docs-lab/reference/cli.md

[reading-pt]: ../../../../../.pbai4devs/tools/openspec/README.md
[reading-en]: ../../../../en/kit/tools/openspec/README.md
[reading-es]: README.md
