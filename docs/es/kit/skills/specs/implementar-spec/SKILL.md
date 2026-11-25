---
name: implementar-spec
description: "Entrega un incremento con spec y plan aprobados y reúne pruebas por criterio de aceptación."
language: es
---

# Implementar spec

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use spec, plan aprobado y documentos configurados en
`.pbai4devs/state/configuracao/ESTADO.md`. Revise las pruebas afectadas, los
vínculos y las aprobaciones de PRD, diseño, UX/UI y spec. UX/UI Se puede
dispensar con justificación aprobada. Use [reunir-contexto-spec][contexto] si
puede ejecutar órdenes. Si la recolección es incompleta, comprueba las fuentes
directamente. Resolva la primera espera apuntada por [proximospasos][proximos].

Reaproveche decisiones comprobadas. Si el plan falta o cambia materialmente,
lleve al usuario las decisiones abiertas, los riesgos, el alcance y la prueba de
cada aceptado. Aplique el plan después de la aprobación y registre en el
roadmap. Con las aprobaciones en día, conclua [configurar proyecto][configurar]
y ejecute [verificar-configuración][verificar] antes del primer parche de
código. Prossiga con salida 0, estado válido y pruebas obligatorias de
infraestructura conferidas.

Implemente dentro del alcance, usando las convenciones y pruebas del proyecto.
Revise el diff staged y unstaged y preserve el índice y las ediciones existentes
por [regla Git][git]. Resolva sobreposiciones de responsabilidad antes de
editar. Use [modelo de tareas][tarefas] en
`<documentos.tarefas>/<slug-da-spec>/TASKS.md` e vincule spec, release,
dependencias, aceptadas y pruebas. Consulte skills de dominio o
`usar-skills-externas` Cuando la decisión exija, registrando las fuentes usadas.
En delegación autorizada, asigna archivos y pruebas claras y confirme el diff
integrado.

Entregue diff, evidencias y pendencias al agente responsable. Use [verificar
trabajo][provas] para probar los aceptados y `atualizar-documentacao` para los
hechos afectados. Actualice tareas, roadmap y release. Sincronize se cambió
recursos agênticos. Si liderar la entrega, encaminhe para [validar
entrega][validar] y revisión independiente. Checkpoints, integración, push y
publicación siguen la autorización y los gates del proyecto.

[contexto]: ../../../scripts/reunir-contexto-spec/README.md
[proximos]: ../../projeto/proximos-passos/SKILL.md
[configurar]: ../../projeto/configurar-projeto/SKILL.md
[verificar]: ../../../scripts/verificar-configuracao/README.md
[git]: ../../../rules/git/RULE.md
[tarefas]: ../../../templates/tasks/TEMPLATE.md
[provas]: ../../projeto/verificar-trabalho/SKILL.md
[validar]: ../../../commands/validar-entrega/COMMAND.md

[reading-pt]: ../../../../../../.pbai4devs/skills/specs/implementar-spec/SKILL.md
[reading-en]: ../../../../../en/kit/skills/specs/implementar-spec/SKILL.md
[reading-es]: SKILL.md
