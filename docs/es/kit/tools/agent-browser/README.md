---
description: "Origen y uso local del agent-browser."
language: es
---

# Agent-browser

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Origen: [instalación oficial](https://agent-browser.dev/installation). O
[TOOL.json](../../../../../.pbai4devs/tools/agent-browser/TOOL.json) define el
paquete npm, canal `latest`, plataformas y
probe. El campo `executables` declara los binarios que reciben permiso de
ejecución en la preparación POSIX, sin activar scripts de instalación del
paquete.

```console
node .pbai4devs/tools/agent-browser/SCRIPT.mjs install
node .pbai4devs/tools/agent-browser/SCRIPT.mjs update
node .pbai4devs/tools/agent-browser/SCRIPT.mjs run --version
```

Use `check` para conferir la instalación y `info` Para ver su configuración. La
preparación requiere Node 24+/npm. Use Chrome/Chromium existente por `run
--executable-path <caminho> ...`; el script no baja un navegador. El launcher
publicado para Windows ARM64 Puede usar el binario x64 en emulación. Antes de la
automatización, lea `run skills get core` de la versión instalada. Paquetes y
registros de instalación se encuentran en `.local/`; el estado propio del CLI
puede usar `~/.agent-browser`, según la [configuración
oficial](https://agent-browser.dev/configuration). El script no cambia `HOME`.
Las pruebas usan sesión propia y la cierran al terminar.

Si el navegador rechaza el nombre de la sesión debido a la longitud de socket
Unix, defina `AGENT_BROWSER_SOCKET_DIR` Para un directorio privado con un camino
corto. Esto puede ser necesario al ejecutar pruebas en una carpeta temporal
profunda en macOS.

[reading-pt]: ../../../../../.pbai4devs/tools/agent-browser/README.md
[reading-en]: ../../../../en/kit/tools/agent-browser/README.md
[reading-es]: README.md
