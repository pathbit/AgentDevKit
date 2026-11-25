---
description: "Identify the local environment and the design structure without change."
language: en
---

# Diagnose

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Input: current project. Com Node.js 24+ available, run directly
[diagnostic-environment](../../../../../.pbai4devs/scripts/diagnosticar-ambiente/)
e
[Inspect-project](../../scripts/inspecionar-projeto/), without `--check`:

```sh
node .pbai4devs/scripts/diagnosticar-ambiente/SCRIPT.mjs
node .pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs
```

If network is not allowed and Docker context is not proven as local, pass
`--no-docker-probe` If runtime is missing, please inform the prerequisite. The
consultation only inspects and does not start the application. Interpret the
informed availability; zero output does not approve absent dependencies or tools
not yet verified.

Output: project type, OS, available tools and to-dos. Summarize results; save
reports in `.agent-tests/` when needed. Use
[prepare-dev](../preparar-dev/COMMAND.md) if the request includes repair or
preparation.

[reading-pt]: ../../../../../.pbai4devs/commands/diagnosticar/COMMAND.md
[reading-en]: COMMAND.md
[reading-es]: ../../../../es/kit/commands/diagnosticar/COMMAND.md
