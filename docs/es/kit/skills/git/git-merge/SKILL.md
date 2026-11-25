---
name: git-merge
description: "Integra branches con trabajo terminado y verificado."
language: es
---

# git-merge

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Consulte origen, destino, histórico, identidades, mensajes, alteraciones locales
y verificaciones; integre solamente tareas completas conforme AGENTS.md. Si los
commits a integrar identificar agentes como autores o coautores, informe y no
los integre.

Cuando haya implementado o gate exigido, en el origen ejecute solo:

```sh
node .pbai4devs/scripts/revisar-entrega/SCRIPT.mjs check-merge \
  --destino refs/heads/<branch> <revisao.json> [outros...]
```

El check requiere fast-forward, cobertura de todo diff y snapshots
correspondientes al commit de origen; cualquier fallo bloquea la integración.
Registra los hashes de origen y destino retornados y confirme ambos
inmediatamente antes del merge, con órdenes que interrompam la ejecución en
cualquier fallo; no mascare el status. Confirme también que `git symbolic-ref
HEAD` es el ref de destino y el HEAD corresponde al hash de destino validado. Si
alguna conferencia falla, interrumpa; si los hashes cambian, refaya la revisión
y el check. Integre con `git merge --ff-only <hash-da-origem-validada>`. Esas
verificaciones no son atómicas. El check recusa enlaces, submódulos, archivos
ejecutables y salidas Git mayores que 64 MiB; informe bloqueos sin bordearlos.
Preserve trabajo fuera del alcance. Si el resultado integrado divergir del
contenido revisado, haga nueva revisión y verificaciones antes de concluir. Sin
implementación, siga los criterios aplicables.

Si genera commit de merge, vea las identidades efectivas y siga
`.pbai4devs/rules/git/RULE.md` para identidad, mensaje y firma. Preserve
cambios, resuelva conflictos en el ámbito autorizado y respete las protecciones
de la branch.

[reading-pt]: ../../../../../../.pbai4devs/skills/git/git-merge/SKILL.md
[reading-en]: ../../../../../en/kit/skills/git/git-merge/SKILL.md
[reading-es]: SKILL.md
