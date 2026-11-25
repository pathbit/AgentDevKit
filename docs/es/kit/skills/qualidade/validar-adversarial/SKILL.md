---
name: validar-adversarial
description: "Confirma o refuta hipótesis específicas de fallo en los requisitos, en el cambio o en las pruebas."
language: es
---

# Validar adversarialmente

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Lea el alcance, el cambio y la evidencia. Priorice hipótesis de fallo por
probabilidad e impacto. Considere datos inválidos, límites, permisos, estados
ausentes, dependencias y competencia cuando sean aplicables.

Prueba con datos y medio ambiente autorizados, preferiendo aislamiento y
verificaciones no destructivas. Utilice una revisión independiente cuando esté
disponible y autorizada. De lo contrario, haga una segunda lectura crítica e
informe la limitación. Compruebe el código de salida de la prueba, incluso
cuando filtrar la salida en un pipeline. Encaminhe cuestiones de seguridad a
[revisar seguros](../../seguranca/revisar-seguranca/SKILL.md).

Relate escenario, observación, impacto, localización y confianza. Indique fallos
confirmados, hipótesis y pruebas pendientes. Restrinja la conclusión a la
cobertura observada y trate impactos sin exposición comprobada como
condicionales. Repita la verificación relevante después de la corrección.

[reading-pt]: ../../../../../../.pbai4devs/skills/qualidade/validar-adversarial/SKILL.md
[reading-en]: ../../../../../en/kit/skills/qualidade/validar-adversarial/SKILL.md
[reading-es]: SKILL.md
