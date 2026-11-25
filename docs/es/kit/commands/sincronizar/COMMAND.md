---
description: "Actualiza o confiere los apuntamientos compartidos de los agentes."
language: es
---

# Sincronizar

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entrada: `sync` la CLI Utiliza las fuentes locales y no implica `--force`;
`update` Utiliza las fuentes de la versión del paquete ejecutado. Prerrequisito:
Node.js 24+.

Siga [Sincronizar agentes](../../skills/projeto/sincronizar-agentes/SKILL.md):
revise el plan de CLI, aplique y compruebe. La reconstrucción repara los apuntes
y elimina las salidas obsoletas cuya propiedad del kit ha sido comprobada.
Recursos adicionales, configuraciones, carpetas y enlaces humanos se conservan,
incluso en colisiones de nombres. La copia de seguridad local no sustituye al
historial Git. Después de reparar, ejecute también `--check`. Si la CLI no está
en PATH, use la versión indicada en `.pbai4devs/state/agentdevkit.json`. Añadida
`sync --dry-run`, `sync` o `sync --check` al mando abajo.

```sh
npx --yes --ignore-scripts --package=@pathbit/agentdevkit@VERSAO agentdevkit
```

El script directo utiliza el manifiesto existente y no incluye automáticamente
nuevos YAMLs nativos. Respeta a los clientes seleccionados. Para cambiar la
selección salva, use `agentdevkit agents <lista>`; sincronizar no activa a todos
los clientes.

Salida: apuntamientos actualizados o divergencias encontradas. Templates,
scripts, herramientas, estado, pruebas, documentos y guías quedan fuera de los
espejos.

[reading-pt]: ../../../../../.pbai4devs/commands/sincronizar/COMMAND.md
[reading-en]: ../../../../en/kit/commands/sincronizar/COMMAND.md
[reading-es]: COMMAND.md
