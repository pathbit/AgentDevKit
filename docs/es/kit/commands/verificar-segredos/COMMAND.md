---
description: "Busca señales de credenciales expuestas con escáner local."
language: es
---

# Comprobar secretos

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entrada: proyecto autorizado. Revise los [prerrequisitos de
recolección](../auditar-seguranca/COMMAND.md) y ejecute el script offline usando
las herramientas ya preparadas:

```console
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs run --checks secrets
```

Lea los retornos y la cobertura en [guía del
script](../../scripts/auditar-seguranca/README.md). Para triaje, use [revisar
seguros](../../skills/seguranca/revisar-seguranca/SKILL.md) con el informe y el
alcance de los secretos. Una señal no prueba que la placa es activa; no intente
autenticarla. No copie el valor encontrado para la conversación. Encaminhe
secreto real al responsable y use
[corregirvulnerabilidad](../../skills/seguranca/corrigir-vulnerabilidade/SKILL.md).
Quitar el texto no deroga el secreto ni borra copias en el historial.

[reading-pt]: ../../../../../.pbai4devs/commands/verificar-segredos/COMMAND.md
[reading-en]: ../../../../en/kit/commands/verificar-segredos/COMMAND.md
[reading-es]: COMMAND.md
