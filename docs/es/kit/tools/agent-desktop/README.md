---
description: "Origen y uso local opcional del agent-desktop."
language: es
---

# Agent-desktop

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Origen: [instalación oficial](https://agent-browser.dev/desktop/installation). O
[TOOL.json](../../../../../.pbai4devs/tools/agent-desktop/TOOL.json) define el
paquete npm, canal `latest`, plataformas y
probe.

```console
node .pbai4devs/tools/agent-desktop/SCRIPT.mjs install
node .pbai4devs/tools/agent-desktop/SCRIPT.mjs update
node .pbai4devs/tools/agent-desktop/SCRIPT.mjs run status
```

Use `check` para conferir la instalación y `run version` para ver la versión. El
script usa `AGENT_DESKTOP_HOME` en `.local/state`, sin alterar `HOME`. La
preparación común exige Node 24+/npm. La interacción depende del SO: [macOS 13+
y permisos](https://agent-browser.dev/desktop/platforms/macos), [Linux con glibc
y sesión AT-SPI](https://agent-browser.dev/desktop/platforms/linux) o Windows
compatible. Instalar no otorga permisos ni abre aplicaciones. Antes de actuar,
lea `run skills get desktop` e `run skills get platform`.

La prueba
[SMOKE_DESKTOP.mjs](../../../../../.pbai4devs/scripts/preparar-ferramentas/tests/SMOKE_DESKTOP.mjs)
abre un Chrome aislado y lee su ventana por accesibilidad, sin entrada física.
Requiere sesión gráfica, permisos y Chrome instalado; cierra su propia sesión.

[reading-pt]: ../../../../../.pbai4devs/tools/agent-desktop/README.md
[reading-en]: ../../../../en/kit/tools/agent-desktop/README.md
[reading-es]: README.md
