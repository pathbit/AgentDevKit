---
description: "Update the local tools of the agents to the current platform."
language: en
---

# Update Tools

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entry: `base`, `all`, group or name of [tool index](../../tools/README.md);
standard: `base`. Prerequisites: Node.js 24+ with npm and access to official
registration.

Go on. [preparing tools](../../skills/projeto/preparar-ferramentas/SKILL.md).
Use [hub manager](../../scripts/preparar-ferramentas/README.md) with `update
<seleção>`; then check the same selection with `check`For a tool, you can also
call `node <pasta-da-ferramenta>/SCRIPT.mjs` with `update` e `check`.

Output: versions, platform, changes and failures. Installations are only in
`.pbai4devs/tools/<nome>/.local/`; preserve the previous version in case of
failure.

[reading-pt]: ../../../../../.pbai4devs/commands/atualizar-ferramentas/COMMAND.md
[reading-en]: COMMAND.md
[reading-es]: ../../../../es/kit/commands/atualizar-ferramentas/COMMAND.md
