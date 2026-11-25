---
name: preparar-ferramentas
description: "Instala, actualiza o verifica herramientas locales del hub por el nombre o grupo solicitado."
language: es
---

# Preparación de herramientas

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Identifique la operación y la selección en [catálogo de
herramientas][catalogo]Reutilize Node.js 24+ y compruebe el npm. Sin runtime
compatible, siga el [bootstrap][bootstrap]. El bootstrap de
`instalar-ferramentas` llama `setup` Una vez. Para consultar o ejecutar una
herramienta, prepare solo runtime cuando sea necesario y retome la operación
original.

No [administrador][script], use `setup <seleção>` Para preparar y verificar,
`install <nome>` o `update <nome>` Y para cambiar una instalación, y `info`,
`check` o `run <nome> [argumentos]` Para usar lo que existe. Vea [mando de
instalación][instalar] Para elegir la selección inicial.

Echa un vistazo a las plataformas `TOOL.json`. La actualización npm utiliza el
registro oficial. Scanners nativos siguen los pins revisados del catálogo. Para
seguridad, use [preparar seguros][seguranca] para distinguir el CLI, la base y
la ejecución offline. En navegador, escritorio, proxy o grabación, consulte la
guía de la herramienta y compruebe dependencias y permisos conforme al flujo
real.

Informe versiones, resultados y elementos no aplicables. Instalaciones
anteriores sanas se reutilizan o se conservan en fallos. Un probe comprueba la
sondaje del ejecutable. Use [verificar trabajo][verificar] para probar el
funcionamiento en caso de uso.

[catalogo]: ../../../tools/README.md
[bootstrap]: ../../../scripts/preparar-ferramentas/BOOTSTRAP.md
[script]: ../../../scripts/preparar-ferramentas/README.md
[instalar]: ../../../commands/instalar-ferramentas/COMMAND.md
[seguranca]: ../../../commands/preparar-seguranca/COMMAND.md
[verificar]: ../verificar-trabalho/SKILL.md

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/preparar-ferramentas/SKILL.md
[reading-en]: ../../../../../en/kit/skills/projeto/preparar-ferramentas/SKILL.md
[reading-es]: SKILL.md
