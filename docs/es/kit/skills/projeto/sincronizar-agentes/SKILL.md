---
name: sincronizar-agentes
description: "Actualiza o verifica catálogos y apuntamientos después de alteraciones en los recursos compartidos."
language: es
---

# Sincronizar agentes

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Después de crear, cambiar, mover o retirar una fuente agêntica, use la CLI la
versión instalada con Node.js 24+. O [orden sincronizar][comando] explica cuándo
usar el plan de CLI e o [manual del script][script] cobre el uso directo.

```sh
agentdevkit sync --dry-run --json
agentdevkit sync --json
agentdevkit sync --check --json
```

Echa un vistazo al plan, los conflictos y `preserved` Antes de aplicar. Preserve
archivos propios, enlaces opacos, reglas de ignore y el índice Git. `--force`
Respeta las mismas fronteras. Revise la copia de seguridad antes de restaurar
cualquier archivo.

Las fuentes se quedan en `.pbai4devs`. sync genera los catálogos y apuntamientos
para los clientes salvos. Para cambiar la selección, use `agents`. Trata a los
JSON derivados y el manifiesto generado como salidas. Templates, scripts,
herramientas, estado, pruebas y documentos quedan en el hub o en el proyecto,
fuera de los espejos.

[comando]: ../../../commands/sincronizar/COMMAND.md
[script]: ../../../scripts/sincronizar-agentes/README.md

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/sincronizar-agentes/SKILL.md
[reading-en]: ../../../../../en/kit/skills/projeto/sincronizar-agentes/SKILL.md
[reading-es]: SKILL.md
