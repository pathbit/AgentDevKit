---
name: revisar-seguranca
description: "Diagnostica riesgos de seguridad en código o proyecto y relata hallazgos, prioridades y cobertura."
language: es
---

# Revisar seguridad

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Delimite proyecto o cambio, datos sensibles, stack y ambiente autorizado. Siga
las reglas de [seguridad](../../../rules/seguranca/RULE.md) e [ejecución
local](../../../rules/execucao-local/RULE.md).

Use el resultado de la recolección ya recibido. Si ha habido fallo, incluso sin
informe, registre el intento y la brecha de cobertura. Si aún no se ha
recopilado y la revisión requiere escáneres, use el [script
local](../../../scripts/auditar-seguranca/README.md) el modo `run` con los
checks pertinentes. Utilice el [guía de seguridad](../REFERENCE.md) Para evaluar
los controles del alcance recibido incluso cuando los escáneres no detectan
señales.

Use [revisar-autorizacion](../revisar-autorizacao/SKILL.md) para permisos,
[modelar-ameacas](../modelar-ameacas/SKILL.md) para nuevas fronteras y
[validación adversarial](../../qualidade/validar-adversarial/SKILL.md) para
pruebas negativas con datos sintéticos cuando sean aplicables. Comprovee los
controles en API o interfaz local conforme [verificar
trabajo](../../projeto/verificar-trabalho/SKILL.md).

## Informe de seguridad

Cierre la revisión del diagnóstico y las recomendaciones. Presenta el informe en
la conversación. Guarde una copia en `.agent-tests/security/` Cuando el destino
esté ignorado y fuera del índice. Si necesita una copia sin ese destino, utilice
una carpeta temporal privada fuera de Git. Cite y preserve el `report.json`
existente. Omita secretos y datos personales. Utilice cuatro secciones:

1. **Resumen y alcance** con caminos, medio ambiente, verificaciones y recuento
   de hallazgos confirmados por gravedad. Identifique y justifique sospechas y
   falsos positivos a la parte.
2. **hallazgos por riesgo** con ID, control, pre-condición, probabilidad e
   impacto. Justifique la gravedad crítica, alta, media o baja e informe
   confianza y evidencia (arquivo y línea, configuración o prueba). Introduzca
   la prueba faltante en cada sospecha.
3. **Qué corregir primero** con acciones ligadas a los IDs, urgencia por la
   exposición y por el impacto, esfuerzo estimado y forma de verificar la
   corrección. Si hay apenas sospechas, priorice obtener evidencia. Reparos
   autorizados siguen
   [corregirvulnerabilidad](../corrigir-vulnerabilidade/SKILL.md).
4. **No evaluado** con alcance excluido, verificaciones incompletas, motivos y
   prerrequisitos para recuperarlas. Justifique a la parte los ítems no
   aplicables. Límite la conclusión a la cobertura comprobada.

[reading-pt]: ../../../../../../.pbai4devs/skills/seguranca/revisar-seguranca/SKILL.md
[reading-en]: ../../../../../en/kit/skills/seguranca/revisar-seguranca/SKILL.md
[reading-es]: SKILL.md
