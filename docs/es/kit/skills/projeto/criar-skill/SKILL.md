---
name: criar-skill
description: "Crea o actualiza instrucciones compartidas para una tarea recurrente con decisiones propias."
language: es
---

# Crear skill

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Busque primero una skill existente o una referencia curada que cubra la tarea.
Cree o actualice `.pbai4devs/skills/<grupo>/<nome>/SKILL.md`. Use `name` igual a
la carpeta, con minúsculas, números y hífens. Na `description`, dígale cuándo
usar la skill de una manera que la distinga de las opciones próximas.

Incluya el resultado esperado, las decisiones y restricciones del proyecto y las
pruebas que muestran calidad. Deje que el agente elija cómo ejecutar el trabajo
cuando haya alternativas válidas. Reutilize reglas, scripts y modelos
existentes. Vincule referencias más largas en el punto en que serán necesarias.

Siga la regla de calidad y use `verificar-trabalho` para conferir estructura y
comportamiento relevante. Actualice guías y puntos de entrada afectados. Gere
los índices con `sincronizar-agentes` y vete `--check` Por separado. Informe
código, advertencias y límites. Un indicador comprueba la integración del
archivo. El descubrimiento efectivo depende del cliente. Presenta el resultado
para la revisión, respetando las aprobaciones ya dadas.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/criar-skill/SKILL.md
[reading-en]: ../../../../../en/kit/skills/projeto/criar-skill/SKILL.md
[reading-es]: SKILL.md
