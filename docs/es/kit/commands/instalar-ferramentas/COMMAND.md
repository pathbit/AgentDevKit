---
description: "Prepara runtime cuando sea necesario e instala las herramientas locales seleccionadas."
language: es
---

# Instalar herramientas

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entrada: `base`, `all`, grupo o nombre del [índice](../../tools/README.md).
Elija la selección por la solicitud y los requisitos del flujo. El administrador
utiliza `all` cuando se selecciona la selección. Para los complementos de flujo,
elija `workflow` o ID de una herramienta.

Sin Node, instale Node y npm por el mecanismo del sistema operativo. Con Node
18+ disponible y runtime incompatible, siga el [bootstrap
JavaScript](../../scripts/preparar-ferramentas/BOOTSTRAP.md) con la selección de
herramientas. Para preparar solo runtime, use `--runtime-only`.

Siga [preparar
herramientas](../../skills/projeto/preparar-ferramentas/SKILL.md). Con Node y
npm listos, use `setup <seleção>` el [administrador del
hub](../../scripts/preparar-ferramentas/README.md). El flujo instala lo que
falta y verifica cada CLI, preservando instalaciones saludables. Red es
necesaria cuando falta instalación.

Salida: versiones, plataforma, resultados y elementos no aplicables o con fallo.
Los paquetes se ignorarán en `.local/`; dependencias de UI siguen la tarea. Para
buscar versiones más recientes, use
[Actualizar](../atualizar-ferramentas/COMMAND.md).

[reading-pt]: ../../../../../.pbai4devs/commands/instalar-ferramentas/COMMAND.md
[reading-en]: ../../../../en/kit/commands/instalar-ferramentas/COMMAND.md
[reading-es]: COMMAND.md
