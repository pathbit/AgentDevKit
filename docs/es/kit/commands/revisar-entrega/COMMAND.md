---
description: "Revisa documentación, criterios y pruebas antes de commit o merge."
language: es
---

# Revisar entrega

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Entrada: referencia del cambio, spec cuando hay y archivos del alcance.
Prerrequisitos: cambio listo, Node.js 24+ y informe y pruebas de la ejecución
ignorados en `.agent-tests/` y fuera del índice Git. Consulte el [modelo de
ignore][ignore] Si falta la regla. Para la documentación o el ajuste avulso
autorizado sin spec, defina criterios propios como AC-001 y registre el motivo.
Las características siguen el flujo de spec aprobado.

La recolección automática rechaza submódulos, sparse-index, flags que ocultan
cambios y filtros Git aplicados; en esos casos, use `--scope` para caminos
comprovables. Split-index y clones parciales se niegan en todos los modos. Las
consultas Git desactivan fsmonitor solamente en el subproceso; ninguna
configuración es alterada.

1. Reúna el diff, decisiones de documentación y pruebas por criterio. Use
   [actualizar-documentacao][documentacao] para lagunas de documentación y
   [verificar trabajo](../../skills/projeto/verificar-trabalho/SKILL.md) para
   pruebas faltantes o desactualizadas.
2. Use el [script de hub](../../scripts/revisar-entrega/README.md) com `prepare
   --id <referencia>`, con `--spec`, `--scope` e `--output` cuando se aplica.
   Complete el JSON generado conforme al
   [modelo](../../templates/revisao-entrega/TEMPLATE.md), con pruebas reales y
   decisiones de documentación justificadas.
3. Acione el [revisor](../../agents/revisor/AGENT.md) u otra persona o agente
   independiente, en lectura, sobre el mismo snapshot. Pida que conteste
   premisas y busque regressiones, fallas y lagunas en las pruebas. Registra
   hallazgos con evidencias y ubicación. Aplique los pertinentes; si los
   archivos cambian, gestiona nuevo snapshot, ejecute las verificaciones
   afectadas y revise de nuevo antes de registrar `review.status: approved`. Sin
   revisión independiente disponible, informe la limitación y mantenga la
   revisión pendiente.
4. Ejecute `seal <relatorio>` para registrar los hashes después de la revisión y
   `check <relatorio>` por el mismo script. Fallo, criterio sin prueba o
   revisión pendiente bloquean el commit/merge.

En las salidas JSON, `reviewVerification: "not-verified"` indica que la
aprobación fue declarada en el informe: el gate no autentica su origen ni
confirma que el revisor actuó. Compruebe la respuesta real antes de completar la
revisión.

Antes de commit, ejecute `revisar-entrega check-commit <relatorio>
[outros-relatorios...]`. La unión de las revisiones selladas debe cubrir todos
los archivos preparados, incluso ambas puntas de renombre. El check acepta
solamente archivos regulares con modo Git `100644` cuyos blobs coincidan con los
bytes revisados. Filtros o CRLF que cambien estos bytes se niegan. No es
atómico: repita si el índice o los archivos cambian antes de commit.

Antes de un merge fast-forward, en el origen, ejecute `revisar-entrega
check-merge --destino refs/heads/<destino> <relatorio> [outros-relatorios...]`.
La verificación requiere cobertura de diff y correspondencia con el commit
revisado. bloquea históricos divergentes, enlaces, submódulos, archivos
ejecutables y operaciones Git por encima de 64 MiB. Compruebe los hashes
retornados antes de integrarse.

Salida: resultado por criterio, esperas y camino del único `revisao.json` en
`.agent-tests/<referencia>/<execucao>/`. Esta etapa es obligatoria después de
cualquier implementación; la ausencia de spec no elimina la revisión.
`baseline.json` e `seal.json` Son metadados generados; no los edite manualmente.

[documentacao]: ../../skills/projeto/atualizar-documentacao/SKILL.md
[ignore]: ../../templates/gitignore/TEMPLATE.md

[reading-pt]: ../../../../../.pbai4devs/commands/revisar-entrega/COMMAND.md
[reading-en]: ../../../../en/kit/commands/revisar-entrega/COMMAND.md
[reading-es]: COMMAND.md
