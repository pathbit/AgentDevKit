---
description: "Confiere la estructura, las pruebas y las herramientas locales de los agentes."
language: es
---

# Comprobar agentes

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Prerrequisito: Node.js 24+. En la raíz del proyecto, gire en este orden:

```console
node .pbai4devs/scripts/verificar-recursos/SCRIPT.mjs
node .pbai4devs/scripts/testar-infraestrutura/SCRIPT.mjs
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs check base
```

El primer script confiere el catálogo, los [recursos][recursos] y los apuntes
del manifiesto actual. Al añadir YAML nativo de cliente, pase primero por CLI el
flujo [Sincronizar](../sincronizar/COMMAND.md) para incorporarlo. Utilice el
mismo flujo para corregir divergencias. Los demás verifican la
[infraestructura][infra] y las [herramientas existentes][tools]. Al cambiar el
catálogo, instalación o sincronización, rode también `node
.pbai4devs/scripts/testar-maturidade/SCRIPT.mjs run`.

Retorne el resultado por etapa y las evidencias en `.agent-tests/`. Em
`partial`, informe el caso, su razón y en qué ambiente la prueba debe rotar.
Prueba web utiliza [probar-navegador](../testar-navegador/COMMAND.md).

[recursos]: ../../scripts/verificar-recursos/README.md
[infra]: ../../scripts/README.md#script-de-infraestructura
[tools]: ../../scripts/preparar-ferramentas/README.md

[reading-pt]: ../../../../../.pbai4devs/commands/verificar-agentes/COMMAND.md
[reading-en]: ../../../../en/kit/commands/verificar-agentes/COMMAND.md
[reading-es]: COMMAND.md
