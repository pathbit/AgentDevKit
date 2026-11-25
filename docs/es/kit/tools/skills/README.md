---
description: "Descubrimiento de skills externos con el CLI oficial."
language: es
---

# Skills

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Origen: [Vercel Labs](https://github.com/vercel-labs/skills). MIT; Node 24+.
Preferencias y canal `latest`: [TOOL.json](../../../../../.pbai4devs/tools/skills/TOOL.json).

```console
node .pbai4devs/tools/skills/SCRIPT.mjs install
node .pbai4devs/tools/skills/SCRIPT.mjs run find testing
node .pbai4devs/tools/skills/SCRIPT.mjs run add vercel-labs/agent-skills --list
```

Use `find` e `add <origem> --list` Para el descubrimiento, Importaciones siguen
`criar-skill` e `sincronizar-agentes`, preservando el origen en `.pbai4devs`.
`use <origem>@<skill>` sin `--agent` imprime prompt sin instalar ni lanzar otro
agente. `add` sin `--list`, `update` e `sync` alteran skills, enlaces, copias o
locks; requieren una solicitud específica. Telemetría desactivada con
`DISABLE_TELEMETRY=1`; estado en `.local/state/` por `XDG_STATE_HOME`.

[Operaciones comunes y plataformas](../README.md).

[reading-pt]: ../../../../../.pbai4devs/tools/skills/README.md
[reading-en]: ../../../../en/kit/tools/skills/README.md
[reading-es]: README.md
