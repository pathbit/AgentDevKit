---
description: "Prepara escáneres locales y bases públicas para el análisis offline."
language: es
---

# Preparación de la seguridad

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entrada: proyecto y ecosistemas de dependencias, como `npm` o `Go`. Consulte
Node.js 24+ y los
[prerrequisitos](../../scripts/preparar-ferramentas/README.md).

Use [ejecutarscript](../../skills/projeto/executar-script/SKILL.md):

```console
node .pbai4devs/scripts/preparar-ferramentas/SCRIPT.mjs setup security
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs update-data --ecosystems npm,Go
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs check
```

Elija sólo los ecosistemas presentes; no descarga bases por suposición. La
actualización utiliza descargas públicas, sin enviar fuentes o inventarios.
Salida: herramientas y bases preparadas, versiones y pendencias. No inicia
servidores ni hace pruebas de seguridad de la aplicación.

[reading-pt]: ../../../../../.pbai4devs/commands/preparar-seguranca/COMMAND.md
[reading-en]: ../../../../en/kit/commands/preparar-seguranca/COMMAND.md
[reading-es]: COMMAND.md
