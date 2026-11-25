---
name: avaliar-performance
description: "Mede e investiga desempeño con carga, comparación y límites explícitos."
language: es
---

# Evaluar rendimiento

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Establecer el flujo, la métrica y el ambiente autorizados. Identifique meta
existente o registre su ausencia; no invente presupuesto ni simule carga en
producción sin autorización. Reúna volumen de datos, competencia y condiciones
reproducibles. Antes de optimizar, combine carga típica y máxima, métrica,
límite y protocolo; incluya caché, llegada de requisiciones y calentamiento
cuando relevantes. Defina también tolerancias para errores, recursos y
corrección funcional.

Meça una línea de base y compare el cambio en las mismas condiciones; registre
órdenes, repeticiones, latencia, errores, throughput y recursos conforme el
caso. Registra valores absolutos antes y después y, cuando proceda, la
incertidumbre de la diferencia. Elija percentiles y muestras conforme a la
métrica y la carga; no trate un número fijo de ejecuciones como garantía de
precisión. Investigue el cuello antes de optimizar y proveer que el
comportamiento permanece. Separe inferencias de código de mediciones y no
generalice comportamiento para entradas no verificadas; registre hipótesis y sus
límites. Sin medición y carga definidas, no clasifique el costo como
desprezible, rápido o lento; describa apenas el comportamiento observado en el
código. Para web, use métricas pertinentes como LCP, INP e CLS y distinga
mediciones locales de datos reales de usuarios: vea [Core Web
Vitals](https://web.dev/articles/vitals).

Informe variación, limitaciones y resultado con respecto a la meta. Sin entorno,
carga o datos adecuados, marque como no verificado; no extrapole una medición
local para producción. Salve informes en directorio ignorado.

[reading-pt]: ../../../../../../.pbai4devs/skills/qualidade/avaliar-performance/SKILL.md
[reading-en]: ../../../../../en/kit/skills/qualidade/avaliar-performance/SKILL.md
[reading-es]: SKILL.md
