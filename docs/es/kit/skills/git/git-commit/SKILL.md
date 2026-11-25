---
name: git-commit
description: "Crea un commit con cambios seleccionados del usuario."
language: es
---

# git-commit

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Revise el estado, el diff, las alteraciones preparadas y las identidades
efectivas con `git var GIT_AUTHOR_IDENT` e `git var GIT_COMMITTER_IDENT`. Para
consulta sin escritura con preservación exacta de los bytes del índice, no
presuma que status o diff sean seguros: use método comprobado para el
repositorio o informe la limitación. No ejecute órdenes de escritura cuando la
solicitud sea sólo consulta. Siga la regla compartida
`.pbai4devs/rules/git/RULE.md` para identidad, mensaje y firma. Autor y
committer deben ser el usuario; no la atribua autoría o coautoría a agentes de
código ni añada identificación de ellos al mensaje. Prepare solamente archivos
autorizados y evaluados en la revisión de la entrega; no elimine alteraciones
del índice sin autorización. Una edición no preparada puede permanecer fuera del
commit sin eliminar la versión preparada. Consulte la orden
`.pbai4devs/commands/revisar-entrega/COMMAND.md` y después de preparar el
índice, use el selector para `revisar-entrega check-commit <relatorio>
[outros-relatorios...]`:

```sh
node .pbai4devs/scripts/revisar-entrega/SCRIPT.mjs check-commit <relatorio>
```

Reemplazar `<relatorio>` por el camino del archivo y añadi otros informes como
argumentos. Todos los archivos staged deben revisarse selladas. Sin consultar
informes o antecedentes, informe que no han sido verificados. Si falla o el
índice cambia, interrumpa y refaza la verificación. Cree commit solamente con
criterios, documentación y revisión aprobados. Consulte autor, committer y
mensaje; no incluya trabajo incompleto o cambios ajenos.

[reading-pt]: ../../../../../../.pbai4devs/skills/git/git-commit/SKILL.md
[reading-en]: ../../../../../en/kit/skills/git/git-commit/SKILL.md
[reading-es]: SKILL.md
