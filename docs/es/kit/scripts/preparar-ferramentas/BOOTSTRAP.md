---
description: "Recuperación de Node.js por JavaScript sin instalación global."
language: es
---

# Preparar runtime

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

El inicializador usa Node.js 18+ para preparar Node.js 24+ y npm locales. En
Windows selecciona una versión con la corrección de eliminación en caminos
Unicode. Use Node.js LTS 24.13.1+ o 26+. Si el propio proceso de bootstrap es de
una versión afectada, puede usar un runtime compatible en la caché. De lo
contrario, actualice el Node por el administrador del sistema. Si Node/npm esté
totalmente ausente, el agente debe instalarlos por el administrador del sistema
operativo antes de ejecutar JavaScript o npx.

Con Node disponible, ejecute en la raíz del proyecto:

```text
node .pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.mjs --runtime-only
```

El modo `--runtime-only` imprime `node=<caminho absoluto>` sin instalar
herramientas. Sin opciones, continúa con `setup`; acepta grupo o nombre. Para
preparar el runtime, diagnosticar y ejecutar un script en secuencia, vea
[`--executar`](../executar-script/README.md). El plan y `--no-install` no bajan
runtime; no restringen los efectos de los procesos que se ejecutan.

El flujo reutiliza un runtime saludable o la caché local. Si es necesario, baja
Node 24 de `nodejs.org`, verifica SHA-256 y extrai usando `tar` nativo. Windows
usa ZIP; macOS/Linux usan tar.gz. No hay scripts Bash o PowerShell, cambio
permanente de PATH o instalación global en este flujo.

Los probes preservan `NODE_OPTIONS`. Cuando esta variable está llena, aislan su
respuesta del stdout común. Preloads asíncronos y npm personalizado que dependa
de detalles internos de Node todavía pueden impedir la verificación. Respuestas
ambiguas se niegan sin bajar un runtime; `--raw` No aislamiento la salida de
preloads.

La caché está en `.pbai4devs/tools/.cache/runtime/`. Falsos de descarga,
integridad o validación preservan el runtime anterior. Archivos y enlaces fuera
de la distribución son rechazados. `tar` Debe estar disponible en el sistema.

Navegadores, permisos de escritorio y FFmpeg dependen de la tarea y no se
instalan o activados por este inicializador.

Fuente: [distribuciones oficiales de Node.js][node].

[node]: https://nodejs.org/dist/latest-v24.x/

[reading-pt]: ../../../../../.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.md
[reading-en]: ../../../../en/kit/scripts/preparar-ferramentas/BOOTSTRAP.md
[reading-es]: BOOTSTRAP.md
