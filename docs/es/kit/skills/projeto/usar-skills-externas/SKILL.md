---
name: usar-skills-externas
description: "Selecciona y usa skills externas curadas sin copiar instrucciones para los agentes."
language: es
---

# Usar skills externos

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Consulte el [catálogo](../../../external-skills/README.md) antes de crear una
solución equivalente. Elija la tarea y el stack ya decidida; no adote
tecnologías para justificar una skill. Prefiera conectores y skills disponibles.

Use `gerenciar-skills-externas list` por el selector. Para una entrada
`reviewed`, ejecute `install <id>`, `check <id>` e `read <id>`; también lea las
referencias pertinentes. La instalación se ignora, fuera del origen y de los
espejos. Ative solo lo necesario; no pulse todas las colecciones en el contexto.

Confirme el origen, la licencia, la revisión fijada y los efectos antes de
aprobar una nueva entrada o versión. `update` Sólo vuelva a instalar el pin
revisado en el catálogo. Nuevas instrucciones y scripts requieren una nueva
revisión; no use actualizaciones globales de CLI. Después de cambiar
`CATALOG.json`, ejecute `sincronizar-agentes` e `--check` para mantener el
inventario local actualizado; las definiciones son fuentes, los índices son
derivados. Instrucciones externas se subordinan a las decisiones de este
proyecto: Node en las automaciones, resultados en `.agent-tests/`, sin cambios
de stack, hooks, publicaciones o instalación de frameworks por iniciativa de
skill.

Regístra ID y revisiones usadas en plano/revisão. Utilice directrices
compatibles sin copiar el contenido externo para `SKILL.md` locales. Origen
oficial no sustituye la revisión ni significa homologación universal.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/usar-skills-externas/SKILL.md
[reading-en]: ../../../../../en/kit/skills/projeto/usar-skills-externas/SKILL.md
[reading-es]: SKILL.md
