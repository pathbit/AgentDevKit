---
description: "Instalacao local revisada del osv-scanner."
language: es
---

# osv-scanner

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Compara dependencias con bases de vulnerabilidades bajas previamente.

Versao revisada: **2.7.1**. Licenca:
[Apache-2.0](https://github.com/google/osv-scanner/blob/v2.7.1/LICENSE).
Descargas viene de [release
oficial](https://github.com/google/osv-scanner/releases/tag/v2.7.1); cada
plataforma tiene SHA-256 fijado en `TOOL.json`.

`SCRIPT.mjs install` baja y verifica el ejecutable. `update` aplica la revisión
del catalogo; nao selecciona `latest` Sin revisarlo. `check` verifica integridad
y versao sin red; `run` preserva argumentos y código de salida. Use `node
.pbai4devs/tools/osv-scanner/SCRIPT.mjs <acao>`.

Use `--offline` Para evitar consultas durante la exploración. La actualización
de las bases y una operacion separada; ausencia de base nao significa ausencia
de vulnerabilidades.

Binarios, cachés y resultados se encuentran locales e ignorados. O CLI No
requiere cuenta ni pago. Consulte
[administrador](../../scripts/preparar-ferramentas/README.md).

[reading-pt]: ../../../../../.pbai4devs/tools/osv-scanner/README.md
[reading-en]: ../../../../en/kit/tools/osv-scanner/README.md
[reading-es]: README.md
