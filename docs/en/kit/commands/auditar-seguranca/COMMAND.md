---
description: "Runs offline scanners and forwards signals to contextual screening."
language: en
---

# Audit Security

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entrance: target project, scope and possible existing report. By default, use
the current project and the three checks. Reuse a report if it covers the same
state, scope and checks. Node.js 24+, a Git repository and
`.agent-tests/security/` ignored and off the index. Check out [local script
prerequisites](../../scripts/auditar-seguranca/README.md) before executing:

```console
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs run --checks secrets,dependencies,sast
```

Add `--target` only for an authorized path within the project. Read the status
of each check, including return `0` no findings or `1` I'll be back. `2`
indicates invalid execution or incomplete coverage. Missing tool or base becomes
to-do. Downloads use separate command [Preparing for
safety](../preparar-seguranca/COMMAND.md) when requested.

Output: report without secret values in
`.agent-tests/security/<execucao>/report.json`. Activate the
[auditor](../../agents/auditor-seguranca/AGENT.md) with the scope, the result of
the collection and the way of the report, if generated.
[review-safe](../../skills/seguranca/revisar-seguranca/SKILL.md), take advantage
of the evidence received and return the diagnosis and pending coverage. If
missing the profile, the main agent reads the skill and does the screening in
the authorized scope.

[reading-pt]: ../../../../../.pbai4devs/commands/auditar-seguranca/COMMAND.md
[reading-en]: COMMAND.md
[reading-es]: ../../../../es/kit/commands/auditar-seguranca/COMMAND.md
