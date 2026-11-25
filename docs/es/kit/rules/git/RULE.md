---
trigger: model_decision
description: "Aplique al consultar, preparar, integrar o publicar cambios Git."
language: es
---

# Reglas Git

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

En consultas sin cambios, defina `GIT_OPTIONAL_LOCKS=0` En el entorno del
subproceso para reducir las actualizaciones opcionales. Esto no garantiza la
preservación exacta del índice: hasta `git diff` Puede actualizarlo. Cuando se
requiera esta preservación, utilice únicamente métodos comprobados seguros para
el repositorio; sin ellos, no ejecute la consulta e informe la limitación. La
variable no sustituye los controles necesarios para operaciones que alteran Git.

Use Conventional Commits (`tipo(escopo): descrição`, alcance opcional), incluso
en checkpoints y merges; destaque cambios incompatibles con `!` o `BREAKING
CHANGE:`. Autor y committer deben ser el usuario, nunca un agente; compruebe las
identidades efectivas y no añada coautoría o identificación de agente. Si la
identidad del usuario no está clara, pregunte. No cambie la configuración Git ni
reescribe autores humanos existentes. Agentes de código jamás firman commits por
GPG, SSH o trailer. Cuando se requiera la firma criptográfica, el responsable
humano debe realizarla.

Antes de publicar, compruebe el contenido, las verificaciones y el estado
remoto; no envíe tareas incompletas ni use push forzado. Consulte la skill
correspondiente en `.pbai4devs/skills/git/`.

[reading-pt]: ../../../../../.pbai4devs/rules/git/RULE.md
[reading-en]: ../../../../en/kit/rules/git/RULE.md
[reading-es]: RULE.md
