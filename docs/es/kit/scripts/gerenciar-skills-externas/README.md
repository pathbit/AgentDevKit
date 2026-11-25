---
description: "Instala y verifica skills externas del catálogo revisado."
language: es
---

# Administrar skills externos

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use Node.js 24+ y prepare el CLI com `node .pbai4devs/tools/skills/SCRIPT.mjs
install`. Las órdenes aceptan un ID del
[catálogo](../../../../../.pbai4devs/external-skills/CATALOG.json):

```console
node .pbai4devs/scripts/gerenciar-skills-externas/SCRIPT.mjs list
node .pbai4devs/scripts/gerenciar-skills-externas/SCRIPT.mjs discover cloudflare-web-perf
node .pbai4devs/scripts/gerenciar-skills-externas/SCRIPT.mjs install cloudflare-web-perf
node .pbai4devs/scripts/gerenciar-skills-externas/SCRIPT.mjs check cloudflare-web-perf
node .pbai4devs/scripts/gerenciar-skills-externas/SCRIPT.mjs read cloudflare-web-perf
```

`list`, `check` e `read` No acceden a la red. `discover` lista el origen fijado
usando el CLI oficial. `install` reutiliza la copia verificada; `update <id>`
aplica el pin revisado del catálogo o restaura contenido local alterado. Revise
origen, licencia e instrucciones antes de cambiar una entrada a `reviewed`.

Na CLI del kit instalado, prepare el prerrequisito con `agentdevkit plugins
install skills`. Use `plugins info <id>` para consultar el origen y la revisión,
y `plugins install <id>` o `plugins check <id>` para operar sobre la entrada
revisada. Las entradas candidatas sirven a la evaluación.

Descargas usan `skills add` com `--agent universal --copy --yes`, en carpeta
aislada. El administrador confiere origen, SHA, camino y contenido; preserva la
instalación anterior cuando la preparación falla. Él no llama `skills update`,
no ejecuta scripts de skill y no altera el catálogo ni los espejos. La
subcarpeta `.agents/skills` dentro de la descarga es el formato del CLI
universal; ella permanece en la caché de `.pbai4devs`, sin ocupar el espejo
`.agents` del proyecto.

Prueba offline: `node --test
.pbai4devs/scripts/gerenciar-skills-externas/tests/TEST.mjs`.

[reading-pt]: ../../../../../.pbai4devs/scripts/gerenciar-skills-externas/README.md
[reading-en]: ../../../../en/kit/scripts/gerenciar-skills-externas/README.md
[reading-es]: README.md
