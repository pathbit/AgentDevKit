---
name: atualizar-documentacao
description: "Actualiza documentos afectados y su coherencia con la entrega."
language: es
---

# Actualizar documentación

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Antes de escribir, ejecute [inventario del hub][inventario] y consulte
`documentation`. Si runtime no está disponible, mapeie los documentos por
lectura y relate los límites. Abra los archivos relevantes y compruebe
aprobaciones, diff y criterios de la tarea. Reúna al principio sólo dudas que
los archivos no responden.

Proponga por camino: mantener, complementar una sección o crear un archivo
ausente. Reutilize nombres, formatos, decisiones, enlaces y estructura
existentes; un documento como `ARCHITECTURE.md` Puede cumplir el papel de diseño
sin ser renombrado. Organize primero por índices y enlaces. No apague, mueva o
reemplace archivos para estandarizarlos. Añada solo hechos comprobados y
preserve el contenido anterior. Si hay contradicción relevante sin solución en
las instrucciones o evidencias disponibles, presente los hechos y pregunte al
usuario; espere la respuesta antes de editar el documento afectado. Continúe
tareas independientes. Comandos divergentes no justifican crear un script:
confirme la intención y el comportamiento disponible antes de decidir qué
documentar.

Use el [catálogo](../../../templates/README.md) como lista de lagunas, nunca
como sustituto de un documento existente. Cree solamente lo que la fase y la
solicitud exigen; ausencia de respuestas no autoriza inventar PRD, diseño o
aprobación.

Ver README la raiz/pastas, AGENTS/CLAUDE/GEMINI, contribución, notas de versión,
produto/design/specs, ADRs configuração/exemplos e comentários/docstrings
relevantes. Actualizar sólo lo que el cambio afecta; documente comportamiento
real, prerrequisitos, comandos, compatibilidad y límites. Evite repetir
instrucciones. Seguridad pública depende de soporte y canal confirmado, sin
datos ficticios.

No README principal, mantenga una sección **Requisitos previos** cerca del
principio. Informe qué instalar en cada modo de uso, la versión mínima
verificada y el enlace oficial de descarga. Identifique herramientas opcionales
o específicas de desarrollo. Mantenga la sección cuando estack o versiones
cambien.

Regístrate por camino a la decisión `updated`, `no-impact` o `not-applicable`,
con justificación, en el informe de la entrega o en el resultado de la tarea.
Compruebe enlaces y ejemplos; compare el contenido anterior y confirme que los
archivos fuera del plan permanecen intactos. Repetir la tarea no debe duplicarse
las secciones. Código de prueba se verá ignorado.

Cuando delegado, devuelve al agente principal el diff, las decisiones por
documento y las pruebas. En entrega o revisión ya abierta, reúna el resultado en
el diff final. Si usted es el agente principal y la documentación es la entrega
entera, abra la revisión, si aún no está en marcha, por [revisar
entrega](../../../commands/revisar-entrega/COMMAND.md) para accionar el
[revisor](../../../agents/revisor/AGENT.md) en lectura. Corrija hallazgos y
confirme el estado final antes de registrar aprobación en el informe.

[inventario]: ../../../scripts/inspecionar-projeto/README.md

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/atualizar-documentacao/SKILL.md
[reading-en]: ../../../../../en/kit/skills/projeto/atualizar-documentacao/SKILL.md
[reading-es]: SKILL.md
