---
description: "Instalacao local revisada de opengrep."
language: es
---

# opengrep

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Ejecuta reglas SAST almacenados en el proyecto.

Versao revisada: **1.33.1**. Licenca:
[LGPL-2.1](https://github.com/opengrep/opengrep/blob/v1.33.1/LICENSE). Descargas
viene de [release
oficial](https://github.com/opengrep/opengrep/releases/tag/v1.33.1); cada
plataforma tiene SHA-256 fijado en `TOOL.json`.

`SCRIPT.mjs install` baja y verifica el ejecutable. `update` aplica la revisión
del catalogo; nao selecciona `latest` Sin revisarlo. `check` verifica integridad
y versao sin red; `run` preserva argumentos y código de salida. Use `node
.pbai4devs/tools/opengrep/SCRIPT.mjs <acao>`.

Use `--config` con reglas locales y `--disable-version-check`. Nao use `auto` o
URLs de reglas en el modo local.

Binarios, cachés y resultados se encuentran locales e ignorados. O CLI No
requiere cuenta ni pago. Consulte
[administrador](../../scripts/preparar-ferramentas/README.md).

[reading-pt]: ../../../../../.pbai4devs/tools/opengrep/README.md
[reading-en]: ../../../../en/kit/tools/opengrep/README.md
[reading-es]: README.md
