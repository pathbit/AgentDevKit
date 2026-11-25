---
name: avaliar-arquitetura
description: "Evaluado y orienta decisiones de arquitectura según requisitos y restricciones del software."
language: es
---

# Evaluar arquitectura

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Examine el producto, los flujos, el diseño y el sistema existente. Reúna dudas
que cambian las decisiones; cuando falta definición, encaminhe al [diseño
técnico](../../produto/criar-design-doc/SKILL.md). No imponga stack.

Identifique componentes, responsabilidades, contratos, datos y fronteras de
confianza. Avalie operación, evolución, fallas, seguridad, rendimiento y costes
conforme al contexto. Compara alternativas y consecuencias; registre decisiones,
compensaciones y migración cuando sean necesarias. Diagramas sólo cuando se
aclaren. No asigna comportamiento al sistema entero por la lectura de un
componente; registre las condiciones y partes todavía no verificadas de cada
solución. Para durabilidad e idempotencia, compruebe mecanismo, atomicidad y
efectos; no trate una clave o un tipo de almacenamiento como garantía aislada.

Cuestione acoplamiento, pérdida de datos, dependencias y fallas simultáneas con
escenarios concretos. Delegue un análisis independiente cuando disponible y
permitido. Entregue decisión propuesta, evidencias, riesgos y verificaciones
abiertas; no presente hipótesis como hechos. Consulte
[C4](https://c4model.com/diagrams) Cuando un diagrama ayuda.

[reading-pt]: ../../../../../../.pbai4devs/skills/arquitetura/avaliar-arquitetura/SKILL.md
[reading-en]: ../../../../../en/kit/skills/arquitetura/avaliar-arquitetura/SKILL.md
[reading-es]: SKILL.md
