---
name: sincronizar-agentes
description: "Update or check catalogs and notes after changes in shared resources."
language: en
---

# Sync Agents

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

After creating, changing, moving or removing an agentic font, use the CLI the
installed version with Node.js 24+. O [command sync][comando] explains when to
use the CLI e o [script manual][script] It covers direct use.

```sh
agentdevkit sync --dry-run --json
agentdevkit sync --json
agentdevkit sync --check --json
```

Check out the plan, the conflicts and `preserved` Before applying. Preserve own
files, opaque links, rules of ignore and the Git index. `--force` respect the
same borders. Review the backup before restoring any file.

The fonts stay in `.pbai4devs`. Sync generates catalogs and notes for saved
customers. To change selection, use `agents`. Treat them JSON derivatives and
the manifesto generated as outputs. Templates, scripts, tools, status, tests and
documents stay in the hub or project, outside the mirrors.

[comando]: ../../../commands/sincronizar/COMMAND.md
[script]: ../../../scripts/sincronizar-agentes/README.md

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/sincronizar-agentes/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/projeto/sincronizar-agentes/SKILL.md
