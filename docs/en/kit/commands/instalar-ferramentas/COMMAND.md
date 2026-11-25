---
description: "Prepare the runtime when necessary and install the selected local tools."
language: en
---

# Install Tools

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entry: `base`, `all`, group or name of [Contents](../../tools/README.md). Choose
the selection by order and flow requirements. The manager uses `all` when
selection is omitted. For flow plugins, choose `workflow` or the ID of a tool.

Without Node, install Node and npm by operating system engine. With Node 18+
available and incompatible runtime, follow the [bootstrap
JavaScript](../../scripts/preparar-ferramentas/BOOTSTRAP.md) with the selection
of tools. To prepare only runtime, use `--runtime-only`.

Go on. [preparing tools](../../skills/projeto/preparar-ferramentas/SKILL.md)With
Node and npm ready, use `setup <seleção>` in [hub
manager](../../scripts/preparar-ferramentas/README.md). The flow installs what
is missing and checks each CLI, preserving healthy facilities. Network is
required when missing installation.

Output: versions, platform, results and items not applicable or failed. Packages
are ignored in `.local/`; UI dependencies follow the task. To search for more
recent versions, use [update](../atualizar-ferramentas/COMMAND.md).

[reading-pt]: ../../../../../.pbai4devs/commands/instalar-ferramentas/COMMAND.md
[reading-en]: COMMAND.md
[reading-es]: ../../../../es/kit/commands/instalar-ferramentas/COMMAND.md
