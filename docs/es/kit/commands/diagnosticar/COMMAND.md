---
description: "Identifica el entorno local y la estructura del proyecto sin cambios."
language: es
---

# Diagnosticar

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entrada: proyecto actual. Com Node.js 24+ disponible, ejecute directamente
[diagnosticar
ambiente](../../../../../.pbai4devs/scripts/diagnosticar-ambiente/) e
[inspeccionar
proyectos](../../scripts/inspecionar-projeto/), sin `--check`:

```sh
node .pbai4devs/scripts/diagnosticar-ambiente/SCRIPT.mjs
node .pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs
```

Si la red no está permitida y el contexto Docker no está comprobado como local,
pase `--no-docker-probe` al diagnóstico. Si falta runtime, informe el
prerrequisito. La consulta sólo inspecciona y no inicia la aplicación.
Interprete la disponibilidad informada; salida cero no aprueba dependencias
ausentes o herramientas todavía no verificadas.

Salida: tipo de proyecto, SO, herramientas disponibles y esperas. Resuma los
resultados; salve informes en `.agent-tests/` cuando sea necesario. Use
[preparar dev](../preparar-dev/COMMAND.md) Si la solicitud incluye reparación o
preparación.

[reading-pt]: ../../../../../.pbai4devs/commands/diagnosticar/COMMAND.md
[reading-en]: ../../../../en/kit/commands/diagnosticar/COMMAND.md
[reading-es]: COMMAND.md
