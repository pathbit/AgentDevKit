---
name: git-worktree
description: "Crea o inspecciona worktrees para trabajo paralelo."
language: es
---

# git-worktree

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Consulte worktrees y branches existentes. Para agentes paralelos, cree worktrees
con branches auxiliares distintas; preserve alteraciones y sólo integre trabajo
concluido y verificado.

Inspecione sin editar contenido y siga [regla Git](../../../rules/git/RULE.md):
incluso las consultas pueden cambiar el índice. Crear otra obra en directorio
adecuado y branch disponible no requiere commitar, stashear o generar parches de
los cambios existentes. Diffs comunes no incluyen archivos no rastreados.
Preserve índice y contenido y no recomende esas acciones sin evaluar la
intención. No `git status --short`, `AM` indica un archivo añadido al índice y
modificado después en el árbol de trabajo.

[reading-pt]: ../../../../../../.pbai4devs/skills/git/git-worktree/SKILL.md
[reading-en]: ../../../../../en/kit/skills/git/git-worktree/SKILL.md
[reading-es]: SKILL.md
