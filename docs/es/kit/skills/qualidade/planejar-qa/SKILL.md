---
name: planejar-qa
description: "Planifica y ejecuta verificaciones de QA orientadas a riesgos y criterios de aceptación."
language: es
---

# Planificar QA

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Compruebe los documentos de producto aprobados relevantes y registre conflictos
con el escenario antes de tratar criterios derivados como decisiones aprobadas.
Para cada criterio de aceptación, identifique el comportamiento observable,
riesgos, datos, prerrequisitos y ambiente. Si una decisión impide la prueba,
aclarezcala; no invente acceso, datos o resultados. Continúe las verificaciones
que no dependen de esa decisión. No generalice el comportamiento de entradas no
verificadas, incluso al leer el código: registre hipótesis y proponga pruebas
con datos representativos.

Elija casos positivos, negativos, límites, transiciones y regressiones
relevantes. Combine pruebas unitarios, integración, API, navegador o desktop
según el producto y el riesgo; use herramientas existentes y fixtures aisladas.
Pruebas de contrato o mocks no sustituyen a una integración real no ejecutada.

Regístrate para cada criterio comando o acción, resultado observado y estado
**Pasó**, **Fallo** o **no verificado**, con evidencia y limitaciones. Marque
como pasó solamente cuando los datos y aserciones comprobaron el criterio; el
nombre y el éxito de una prueba, aisladamente, no demuestran esa cobertura. Si
sólo ejemplos del criterio pasaron, relateos y mantenga el criterio entero como
no verificado hasta que haya prueba del resto. Versione el código de las pruebas
y salve resultados en `.agent-tests/` o directorio ignorado. Encaminhe hipótesis
de fallo a [validación adversarial](../validar-adversarial/SKILL.md).

[reading-pt]: ../../../../../../.pbai4devs/skills/qualidade/planejar-qa/SKILL.md
[reading-en]: ../../../../../en/kit/skills/qualidade/planejar-qa/SKILL.md
[reading-es]: SKILL.md
