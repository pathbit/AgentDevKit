---
name: executar-script
description: "Identifies installed tools and executes scripts by the compatible interpreter."
language: en
---

# Run Script

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

With Node 18+ and npm, use bootstrap to prepare Node 24+, diagnose and execute
the requested script in that order. Minimum 24 is from Node; check npm
separately and inform your version only when measured:

```sh
node .pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.mjs --executar <script> [argumentos...]
```

If the diagnosis fails, inspect the cause; the script is not executed. Its
success indicates completed inventory, not necessarily ready dependencies.
`--executar --no-install` only avoids downloading and installing runtime; uses
the current one, the first Node of PATH or the cache, if compatible. It does not
restrict the diagnosis or child script. When network or facilities are
prohibited, only perform proven steps compatible with these restrictions or use
proper isolation. Node/npm, install them by the OS mechanism when authorized.
Preserve the operation and the arguments requested.

Prefer existing scripts. Use `--executar --plan <script>` to consult the
execution without installing or diagnosing; the plan uses the same runtime
options. Check prerequisites, effects and authorization, and run without
`--plan`. The direct selector remains available and does not prepare or
diagnose. Bootstrap gathers information from runtime, diagnosis and execution on
output; identify each snippet before reporting the script result. To redirect
metadata and kit diagnosis to stderr, use `--raw` before name; errors also share
stderr. No extra environment outputs, plans and help in raw mode leave stdout
empty. Preloads in `NODE_OPTIONS` can write in stdout before the kit; for narrow
bytes, control the environment without changing it automatically. Arguments
after the name belong to the target.
[reference](../../../scripts/executar-script/README.md).

If specified `playwright-mcp`, use the connector according to the
[reference](../../../scripts/testar-navegador/REFERENCE.md). Do not execute this
file as Node. Without the required connector, please state the prerequisite.

Verse reusable automations and your tests; save only diagnostics, reports and
captures in `.agent-tests/`. Summarize command, result and failures; read
complete outputs only to investigate problems.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/executar-script/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/projeto/executar-script/SKILL.md
