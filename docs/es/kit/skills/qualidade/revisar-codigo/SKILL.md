---
name: revisar-codigo
description: "Examina un diff y sus pruebas para apuntar defectos, regressiones y lagunas de cobertura."
language: es
---

# Revisar código

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Lea el diff, contratos, aceptados y pruebas pertinentes. Atue en lectura cuando
sea [revisor](../../../agents/revisor/AGENT.md). Compruebe la cobertura antes de
afirmar que falta una prueba y preserve cambios de otras personas.

Priorice defectos concretos y regresos del cambio. Considere datos, competencia,
fallos, seguridad e implantación conforme al riesgo. Use
[validar-adversarial](../validar-adversarial/SKILL.md) Cuando hay una hipótesis
específica que refutar.

Para cada hallazgo, informe archivo, línea, escenario, impacto y evidencia.
Distingui hipótesis de hechos y límite la afirmación a los casos demostrados.
Informe lo que consultó, lo que ejecutó y los límites de la revisión.

[reading-pt]: ../../../../../../.pbai4devs/skills/qualidade/revisar-codigo/SKILL.md
[reading-en]: ../../../../../en/kit/skills/qualidade/revisar-codigo/SKILL.md
[reading-es]: SKILL.md
