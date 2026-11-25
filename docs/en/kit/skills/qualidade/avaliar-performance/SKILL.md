---
name: avaliar-performance
description: "Measure and investigate performance with load, comparison and explicit limits."
language: en
---

# Evaluate performance

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Set the authorized flow, metric and environment. Identify existing target or
record its absence; do not invent budget or simulate load in production without
authorization. Gather data volume, competition and reproducible conditions.
Before optimizing, combine typical and maximum load, metric, limit and protocol;
include cache, arrival of requests and heating when relevant. Also set
tolerances for errors, features and functional correction.

Measure a baseline and compare the change in the same conditions; register
commands, repetitions, latency, errors, throughput and features as appropriate.
Register absolute values before and after and when applicable the uncertainty of
difference. Choose percentiles and samples according to metric and load; do not
treat a fixed number of executions as a precision guarantee. Investigate the
bottleneck before optimizing and prove that the behavior remains. Separate
measurement code inferences and do not generalize behavior for unverified
inputs; register hypotheses and their limits. No measurement and load defined,
do not classify the cost as negligible, fast or slow; describe only the behavior
observed in the code. For web, use relevant metrics as relevant metrics as for
unchecked inputs. LCP, INP e CLS and distinguishes local measurements of actual
user data: see [Core Web Vitals](https://web.dev/articles/vitals).

Inform variation, limitations and result in relation to the target. No
environment, load or appropriate data, tick as not verified; do not extrapolate
a local measurement for production. Save reports in ignored directory.

[reading-pt]: ../../../../../../.pbai4devs/skills/qualidade/avaliar-performance/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/qualidade/avaliar-performance/SKILL.md
