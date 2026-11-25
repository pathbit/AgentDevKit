---
name: proximos-passos
description: "Identifica el estado actual y orienta la próxima acción útil del proyecto."
language: es
---

# Siguientes pasos

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Lea la solicitud, el estado salvo y los documentos existentes. Use el idioma de
`.pbai4devs/state/agentdevkit.json` o portugués cuando todavía no hay elección.
Si la CLI está disponible, consulte `agentdevkit next --target . --json`. Para
el producto o la funcionalidad, añade `--intent product`; para preparar la
ejecución de un proyecto existente, use `--intent run`. Para documentar lo que
ya existe, use `--intent document` y encaminhe a
[documentarlegado](../documentar-legado/SKILL.md). Trate la respuesta como
orientación y compruebe documentos y evidencias. Si falla la orden, no está
disponible o no está permitido, informe la laguna e inspecione los archivos.
Para producto, consulte `.pbai4devs/state/configuracao/ESTADO.md` y la
evidencia: si la preparación está pendiente, encaminé la `configurar-projeto`
antes del PRD; si no está comprobada, pida la confirmación necesaria. Preserve
documentos y decisiones existentes. Para ejecutar proyecto existente, use
`preparar-dev`. Cuando `next` indicar referencias externas, consulte `next
--integrations` con la misma intención. Utilice solamente los artefactos
pertinentes como insumo y
Compruebe las aprobaciones en la fuente que adoptó el proyecto.

Al finalizar una etapa, destaque: resultado, pendências/bloqueios y próxima
acción con comando o skill, en el formato de la [regla de próximos
pasos](../../../rules/proximos-passos/RULE.md). Sólo haga las preguntas que
impiden avanzar. Continúe el trabajo ya autorizado; no reinicie fases concluidas
ni presente suposiciones como aprobaciones.

Proyecto nuevo sigue preparación → PRD → UX → diseño (arquitectura y tecnología)
→ roadmap → spec aprobada → plano aprobado → configuración técnica →
implementación → revisión. UX puede ser no aplicable con justificación aprobada.
Proyecto existente parte de sus evidencias actuales; instalar el kit no autoriza
recrear documentos o sustituir decisiones. Si no hay pendencias en el alcance,
diga esto claramente.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/proximos-passos/SKILL.md
[reading-en]: ../../../../../en/kit/skills/projeto/proximos-passos/SKILL.md
[reading-es]: SKILL.md
