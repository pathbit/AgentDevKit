---
name: git-diff
description: "Examina y resume los cambios Git."
language: es
---

# git-diff

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Examine los diffs preparados y no preparados conforme a la solicitud, incluyendo
archivos no rastreados cuando sean relevantes. Use `GIT_OPTIONAL_LOCKS=0` En las
consultas, pero no presuma que preserve los bytes del índice: `git diff` También
puede actualizarlo. Si se requiere la preservación exacta, no realice una
consulta sin método comprobadamente seguro para el repositorio; informe la
limitación. Una copia del índice, por sí sola, no comprueba la preservación de
`sharedindex` en repositorios con split-index.

[reading-pt]: ../../../../../../.pbai4devs/skills/git/git-diff/SKILL.md
[reading-en]: ../../../../../en/kit/skills/git/git-diff/SKILL.md
[reading-es]: SKILL.md
