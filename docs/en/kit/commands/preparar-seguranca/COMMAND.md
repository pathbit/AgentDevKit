---
description: "Prepare local scanners and public bases for offline analysis."
language: en
---

# Prepare security

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entry: Design and ecosystems of dependencies such as `npm` or `Go`Check it out.
Node.js 24+ and [prerequisites](../../scripts/preparar-ferramentas/README.md).

Use [execute-script](../../skills/projeto/executar-script/SKILL.md):

```console
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs setup security
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs update-data --ecosystems npm,Go
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs check
```

Choose only the ecosystems present; do not download bases by assumption. The
update uses public downloads, without sending sources or inventories. Output:
prepared tools and bases, versions and to-dos. It does not start servers or
perform application security tests.

[reading-pt]: ../../../../../.pbai4devs/commands/preparar-seguranca/COMMAND.md
[reading-en]: COMMAND.md
[reading-es]: ../../../../es/kit/commands/preparar-seguranca/COMMAND.md
