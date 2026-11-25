---
description: "Ejecuta escáneres fuera de línea y remite señales para la selección contextual."
language: es
---

# Auditar seguridad

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entrada: proyecto-objetivo, alcance y eventual informe existente. Por defecto,
use el proyecto actual y los tres checks. Reutilize un informe si cubre el mismo
estado, alcance y checks. La recolección requiere Node.js 24+, un repositorio
Git y `.agent-tests/security/` Pasado y fuera del índice. Revise los
[prerrequisitos del script local](../../scripts/auditar-seguranca/README.md)
antes de ejecutar:

```console
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs run --checks secrets,dependencies,sast
```

Añadir `--target` Solo para un camino autorizado dentro del proyecto. Lea el
estado de cada check, incluso con retorno `0` sin hallazgos o `1` con hallazgos.
Regreso `2` indica ejecución no válida o cobertura incompleta. Herramienta o
base ausente gira pendencia. Descargas usan el comando separado [preparar
seguros](../preparar-seguranca/COMMAND.md) Cuando se solicite.

Salida: informe sin valores secretos en
`.agent-tests/security/<execucao>/report.json`. Acione el
[auditor](../../agents/auditor-seguranca/AGENT.md) con el alcance, el resultado
de la recolección y el camino del informe, se generado. El auditor aplica
[revisar seguros](../../skills/seguranca/revisar-seguranca/SKILL.md), aprovecha
las pruebas recibidas y devuelve el diagnóstico y la cobertura pendiente. Si
falta el perfil, el agente principal lee la skill y hace la selección en el
ámbito autorizado.

[reading-pt]: ../../../../../.pbai4devs/commands/auditar-seguranca/COMMAND.md
[reading-en]: ../../../../en/kit/commands/auditar-seguranca/COMMAND.md
[reading-es]: COMMAND.md
