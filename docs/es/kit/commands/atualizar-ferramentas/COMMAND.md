---
description: "Actualiza las herramientas locales de los agentes para la plataforma actual."
language: es
---

# Actualizar herramientas

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entrada: `base`, `all`, grupo o nombre del [índice de
herramientas](../../tools/README.md); patrón: `base`. Prerrequisitos: Node.js
24+ con npm y acceso al registro oficial.

Siga [preparar
herramientas](../../skills/projeto/preparar-ferramentas/SKILL.md). Use el
[administrador del hub](../../scripts/preparar-ferramentas/README.md) com
`update <seleção>`; después, compruebe la misma selección con `check`. Para una
herramienta, también puede llamar `node <pasta-da-ferramenta>/SCRIPT.mjs` com
`update` e `check`.

Salida: versiones, plataforma, cambios y fallas. Instalaciones se quedan
solamente en `.pbai4devs/tools/<nome>/.local/`; preserve la versión anterior en
caso de fallo.

[reading-pt]: ../../../../../.pbai4devs/commands/atualizar-ferramentas/COMMAND.md
[reading-en]: ../../../../en/kit/commands/atualizar-ferramentas/COMMAND.md
[reading-es]: COMMAND.md
