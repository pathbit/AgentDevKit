---
description: "It checks dependencies using local bases of vulnerabilities."
language: en
---

# Check dependencies

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entry: project and its manifests/lockfiles. If there is no basis for the
ecosystems present, register the gap. Downloads requested follow [Preparing for
safety](../preparar-seguranca/COMMAND.md). Check out the [collection
prerequisites](../auditar-seguranca/COMMAND.md) and run the offline script:

```console
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs run --checks dependencies
```

Read the returns and coverage in [script
guide](../../scripts/auditar-seguranca/README.md). For triage, use
[review-safe](../../skills/seguranca/revisar-seguranca/SKILL.md) with the report
and the scope of dependencies. Without proper base or recognized package, do not
declare approved dependencies. Screening considers version, scope and
mitigation. Do not execute `audit fix --force` do not update everything
automatically; propose the smallest checkable correction.

[reading-pt]: ../../../../../.pbai4devs/commands/verificar-dependencias/COMMAND.md
[reading-en]: COMMAND.md
[reading-es]: ../../../../es/kit/commands/verificar-dependencias/COMMAND.md
