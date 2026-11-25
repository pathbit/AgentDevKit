---
trigger: always_on
description: "Mantiene análisis locales, herramientas abiertas y evidencias sin secretos."
language: es
---

# Ejecución local

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

En los flujos de seguridad, utilice herramientas open source que ejecuten
localmente, sin cuenta, licencia paga o servicio remoto obligatorio. Descargar
binarios y bases públicas es una preparación explícita; analizar código es una
operación separada.

No envíe fuentes, inventarios o credenciales a APIs de escáneres. Desative
telemetría y consultas remotas por el modo documentado. Si una herramienta o
base falta, registre la espera; no troque silenciosamente por un análisis cloud.

Restrinja pruebas al proyecto y ambiente autorizados. Preserve configuraciones,
contenido humano y límites del cliente. Informes ocultan secretos y se quedan en
`.agent-tests/`; binarios y caches se encuentran en las carpetas locales
ignoradas. O cliente/modelo La IA tiene su propia política de datos: mantenga
valores secretos fuera del contexto y utilice referencias redactadas en la
conversación.

[reading-pt]: ../../../../../.pbai4devs/rules/execucao-local/RULE.md
[reading-en]: ../../../../en/kit/rules/execucao-local/RULE.md
[reading-es]: RULE.md
