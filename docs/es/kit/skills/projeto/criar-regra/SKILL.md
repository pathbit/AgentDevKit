---
name: criar-regra
description: "Crea o actualiza reglas compartidas y sus apuntamientos."
language: es
---

# Crear regla

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Establezca finalidad, contexto y activación. Cree o actualice
`.pbai4devs/rules/<nome>/RULE.md` com `description` y activación explícita.
Preserve los alcances y mapeie diferencias sin ampliar la activación
silenciosamente. Elija el `trigger` de la fuente compartida conforme su alcance:
`always_on`, `model_decision`, `glob` o `manual`. La descripción orienta
`model_decision`, e `glob` exige `globs`. Mantenga adaptaciones de otros
clientes en YAMLs al lado de la fuente. El manifiesto es generado; no lo edite a
mano. Revise los valores en [compatibilidad](../../../COMPATIBILIDADE.md).

Actualizar índice/guia, siga la regla de calidad y finalice con
`sincronizar-agentes`, incluso después de renombrar o eliminar reglas. Compruebe
la activación cuando sea posible e informe cuando la lectura necesita ser
explícita.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/criar-regra/SKILL.md
[reading-en]: ../../../../../en/kit/skills/projeto/criar-regra/SKILL.md
[reading-es]: SKILL.md
