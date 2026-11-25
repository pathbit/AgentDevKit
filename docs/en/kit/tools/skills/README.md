---
description: "Discovery of external skills with the CLI Officer."
language: en
---

# Skills

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Source: [Vercel Labs](https://github.com/vercel-labs/skills). MIT; Node 24+.
Configuration and channel `latest`: [TOOL.json](../../../../../.pbai4devs/tools/skills/TOOL.json).

```console
node .pbai4devs/tools/skills/SCRIPT.mjs install
node .pbai4devs/tools/skills/SCRIPT.mjs run find testing
node .pbai4devs/tools/skills/SCRIPT.mjs run add vercel-labs/agent-skills --list
```

Use `find` e `add <origem> --list` for discovery. Imports follow `criar-skill` e
`sincronizar-agentes`, preserving the origin in `.pbai4devs`. `use
<origem>@<skill>` without `--agent` prints the prompt without installing or
launching another agent. `add` without `--list`, `update` e `sync` change
skills, links, copies or locks; require a specific request.
`DISABLE_TELEMETRY=1`; status in `.local/state/` by `XDG_STATE_HOME`.

[Common operations and platforms](../README.md).

[reading-pt]: ../../../../../.pbai4devs/tools/skills/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/tools/skills/README.md
