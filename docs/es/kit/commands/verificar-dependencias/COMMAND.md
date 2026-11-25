---
description: "Verifica dependencias usando bases locales de vulnerabilidades."
language: es
---

# Comprobar dependencias

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entrada: proyecto y sus manifests/lockfiles. Si falta la base de los ecosistemas
presentes, registre el vacío. Descargas solicitados siguen [preparar
seguros](../preparar-seguranca/COMMAND.md). Revise los [prerrequisitos de
recolección](../auditar-seguranca/COMMAND.md) y ejecute el script offline:

```console
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs run --checks dependencies
```

Lea los retornos y la cobertura en [guía del
script](../../scripts/auditar-seguranca/README.md). Para triaje, use [revisar
seguros](../../skills/seguranca/revisar-seguranca/SKILL.md) con el informe y el
alcance de dependencias. Sin base adecuada o paquete reconocido, no declare
dependencias aprobadas. Triaje considera versión, alcance y mitigación. No
ejecute `audit fix --force` ni actualice todo automáticamente; proponga la menor
corrección verificable.

[reading-pt]: ../../../../../.pbai4devs/commands/verificar-dependencias/COMMAND.md
[reading-en]: ../../../../en/kit/commands/verificar-dependencias/COMMAND.md
[reading-es]: COMMAND.md
