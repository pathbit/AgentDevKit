---
name: implementar-backend
description: "Altera APIs, servicios o persistencia con pruebas de contratos y autorización."
language: es
---

# Implementar backend

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

En tarea cubierta por una spec, siga los prerrequisitos, el plan y el gate de
configuración de [implementar-spec](../../specs/implementar-spec/SKILL.md),
incluso para correcciones puntuales. En corrección avulsa autorizada, siga el
alcance, las decisiones y la stack existentes. Acione `preparar-dev` Si necesita
preparar el ambiente.

Esclarezca lagunas sobre entradas, salidas, datos, compatibilidad y fallas.
Valide entradas, autorización por recurso y aislamiento de datos. Avalie
competencia, repetición, límites, timeout, migración y recuperación conforme al
riesgo. Compruebe los límites de los cuales la seguridad depende antes de
implementar. Preserve los contratos legítimos y proteja secretos en los logs.

Prove casos normales y negativos con pruebas y, cuando proceda, llamadas reales
a API con datos aislados. Declare integraciones cubiertas solo por mocks o
pendientes. Use [verificar trabajo](../../projeto/verificar-trabalho/SKILL.md)
para registrar evidencias por criterio.

[reading-pt]: ../../../../../../.pbai4devs/skills/desenvolvimento/implementar-backend/SKILL.md
[reading-en]: ../../../../../en/kit/skills/desenvolvimento/implementar-backend/SKILL.md
[reading-es]: SKILL.md
