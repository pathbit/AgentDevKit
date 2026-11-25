---
description: "Checks the local structure, testing and tools of the agents."
language: en
---

# Check Agents

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Prerequisite: Node.js 24+. At the root of the project, rotate in this order:

```console
node .pbai4devs/scripts/verificar-recursos/SCRIPT.mjs
node .pbai4devs/scripts/testar-infraestrutura/SCRIPT.mjs
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs check base
```

The first script checks the catalog, the [resources][recursos] and the notes of
the current manifest. YAML native customer, first pass by CLI in the flow
[sync](../sincronizar/COMMAND.md) to incorporate it. Use the same flow to
correct divergences. [infrastructure][infra] and [existing tools][tools]. When
changing catalog, installation or synchronization, turn as well `node
.pbai4devs/scripts/testar-maturidade/SCRIPT.mjs run`.

Return the result by step and the evidence in `.agent-tests/`. In `partial`,
inform the case, your reason and in which environment the proof should run. Web
proofs use [test-navigator](../testar-navegador/COMMAND.md).

[recursos]: ../../scripts/verificar-recursos/README.md
[infra]: ../../scripts/README.md#infrastructure-script
[tools]: ../../scripts/preparar-ferramentas/README.md

[reading-pt]: ../../../../../.pbai4devs/commands/verificar-agentes/COMMAND.md
[reading-en]: COMMAND.md
[reading-es]: ../../../../es/kit/commands/verificar-agentes/COMMAND.md
