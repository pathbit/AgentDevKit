---
name: modelar-ameacas
description: "Identifica activos, fronteras de confianza y amenazas del alcance aprobado."
language: es
---

# Modelar amenazas

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Lea producto, diseño y código relacionados. Reúna primero las dudas sobre datos,
actores, operaciones privilegiadas y límites del ambiente. Regístra lo que es
hecho, hipótesis o información ausente; no invente arquitectura.

Mapeie los activos, entradas, flujos y fronteras de confianza. Para cada
amenaza, describa pre-condición, camino de abuso, impacto, control y prueba
observable. Priorice lo que el diseño realmente permite: acceso entre usuarios,
elevación de privilegio, fuga, inyección y abuso de recursos.

Use el [modelo de revisión](../../../templates/revisao-seguranca/TEMPLATE.md)
como apoyo y apoyo [auditor](../../../agents/auditor-seguranca/AGENT.md) para
revisión. Si el proyecto necesita un documento permanente, combine su destino
con el usuario y siga
[actualizar-documentacao](../../projeto/atualizar-documentacao/SKILL.md).
Rascuños y evidencias se quedan en `.agent-tests/security/`.

Salida: amenazas priorizadas, controles existentes, lagunas y criterios de
prueba. El modelo orienta [revisar seguros](../revisar-seguranca/SKILL.md); no
comprueba que los controles fueron implementados o probados.

[reading-pt]: ../../../../../../.pbai4devs/skills/seguranca/modelar-ameacas/SKILL.md
[reading-en]: ../../../../../en/kit/skills/seguranca/modelar-ameacas/SKILL.md
[reading-es]: SKILL.md
