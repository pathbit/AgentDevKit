---
trigger: always_on
description: "Preserva controles de acceso, datos y entradas durante cambios."
language: es
---

# Seguridad

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Al reproducir autenticación, permisos, datos, entradas o dependencias, use
[revisar seguros](../../skills/seguranca/revisar-seguranca/SKILL.md). Decisiones
de acceso pertenecen al servidor y al recurso, no sólo a la interfaz. Revise
RLS/policies en PostgreSQL y Security Rules en IHG conforme a stack.

Valide entradas, use consultas parametrizadas y codifique salidas por el
contexto. Uploads y límites de abuso exigen reglas propias. No trate toda clave
pública como secreto ni exponga credenciales reales en código, bundles, logs o
pruebas.

Scanners indican señales; no sustituyen análisis y pruebas de autorización. No
suprima hallazgos sin triaje, no desative controles para hacer pruebas pasar y
no declare seguridad para un escenario no ejecutado.

[reading-pt]: ../../../../../.pbai4devs/rules/seguranca/RULE.md
[reading-en]: ../../../../en/kit/rules/seguranca/RULE.md
[reading-es]: RULE.md
