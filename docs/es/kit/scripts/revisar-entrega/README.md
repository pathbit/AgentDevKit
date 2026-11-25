---
description: "Verificación de los documentos, revisión y evidencia de la entrega."
language: es
---

# Revisar entrega

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Después de implementar, actualizar la documentación afectada y probar, gestionar
el registro:

```sh
node .pbai4devs/scripts/revisar-entrega/SCRIPT.mjs prepare --id minha-mudanca
```

Use `--spec caminho/SPEC.md` para extraer los criterios `AC-001` de laspec.
`--scope arquivo` limita una revisión; sin él, el snapshot reúne cambios Git.
Use `--document arquivo` para incluir PRD, diseño y otros documentos. En la
recolección automática, submódulos, índice esparso, flags que ocultan cambios y
filtros Git aplicados son bloqueados; use `--scope` Cuando se conoce el alcance.
Se rechaza el índice dividido y el clon parcial en cualquier modo. README,
AGENTS, CLAUDE e GEMINI Versionables en la raíz entran automáticamente en la
revisión, incluso sin cambios. Salidas locales ignoradas fuera del índice no son
documentos obligatorios; documentos rastreados siguen cubiertos incluso cuando
una regla de ignore corresponde al nombre. Rellena decisiones, resultados y
evidencias en el JSON retornado; pieza revisión independiente, ejecute `seal
<caminho/revisao.json>` y después `check <caminho/revisao.json>` Antes de
terminar.

`check` valida solamente el alcance de los informes. Antes de un commit, use
`check-commit <relatorio> [outros-relatorios...]`: todos los archivos preparados
deben estar cubiertos por revisiones selladas. La orden acepta solo archivos
regulares con modo Git `100644` y compara los bytes preparados a los revisados;
normalizaciones por filtros o CRLF que cambien los bytes están bloqueados. Cada
blob preparado está limitado a 64 MiB.

Para un merge fast-forward, ejecuta desde la rama de origen:

```console
check-merge --destino refs/heads/<branch> <relatorio> [outros-relatorios...]
```

El comando compara el commit y el diff completo con las revisiones selladas.
Comprueba los hashes que devuelve antes de integrar.

El check rechaza resultados pendientes, evidencias ausentes/versionadas y los
archivos modificados después de la revisión. Informes se encuentran en
`.agent-tests/<id>/<execução>/`. La preparación preserva el alcance en
`baseline.json`; el sello registra hashes del informe y de las pruebas en
`seal.json`. Preserve estos metadatos en el flujo. Cambios posteriores requieren
una nueva ejecución, preservando las evidencias anteriores. Una deleción staged
con archivo aún presente e ignorado es registrada como `indexAction: untrack`.
snapshot preserva su hash físico; cambios en el archivo, no ignore o en esa
acción del índice invalidan la revisión. Diferencias entre índice y contenido
probado continúan bloqueadas, inclusive con `--scope`. El script confiere el
registro; la revisión semántica continúa siendo responsabilidad del revisor. Las
salidas exitosas incluyen `reviewVerification: "not-verified"`: el script no
autentica el revisor ni confirma que la revisión ocurrió. Vea la skill
[actualizar-documentacao](../../skills/projeto/atualizar-documentacao/SKILL.md).

[reading-pt]: ../../../../../.pbai4devs/scripts/revisar-entrega/README.md
[reading-en]: ../../../../en/kit/scripts/revisar-entrega/README.md
[reading-es]: README.md
