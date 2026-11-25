---
description: "Update or check the shared notes of the agents."
language: en
---

# Synchronize

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entry: `sync` ed CLI uses local sources and does not imply `--force`; `update`
uses the fonts of the version of the executed package. Prerequisite: Node.js
24+.

Go on. [sync-agents](../../skills/projeto/sincronizar-agentes/SKILL.md): review
the plan of CLI, apply and check. Reconstruction repairs notes and removes
obsolete outputs whose property of the kit has been proven. Additional features,
configurations, folders and human links are preserved, including in name
collisions. Local backup does not replace Git history. After repair, run as well
`--check`. If the CLI is not in the PATH, use the version indicated in
`.pbai4devs/state/agentdevkit.json`.Add `sync --dry-run`, `sync` or `sync
--check` to the command below.

```sh
npx --yes --ignore-scripts --package=@pathbit/agentdevkit@VERSAO agentdevkit
```

The direct script uses the existing manifest and does not automatically include
new native YAMLs. Respect the selected clients. To change the saved selection,
use `agentdevkit agents <lista>`; sync does not activate all customers.

Output: updated notes or divergences found. Templates, scripts, tools, status,
tests, documents and guides are outside the mirrors.

[reading-pt]: ../../../../../.pbai4devs/commands/sincronizar/COMMAND.md
[reading-en]: COMMAND.md
[reading-es]: ../../../../es/kit/commands/sincronizar/COMMAND.md
