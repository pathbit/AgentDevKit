---
name: revisar-seguranca
description: "It diagnoses security risks in code or project and reports findings, priorities and coverage."
language: en
---

# Review Security

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Design or change limit, sensitive data, stack and authorized environment. Follow
the rules of [safety](../../../rules/seguranca/RULE.md) e [local
execution](../../../rules/execucao-local/RULE.md).

Use the collection result already received. If there has been a failure, even
without reporting, register the attempt and the coverage gap. If there has been
no collection and review require scanners, use the [local
script](../../../scripts/auditar-seguranca/README.md) in mode `run` with the
relevant checks. [safety guide](../REFERENCE.md) to evaluate the scope controls
received even when the scanners do not detect signals.

Use [review-authorisation](../revisar-autorizacao/SKILL.md) for permissions,
[Moulding and moulding](../modelar-ameacas/SKILL.md) for new borders and
[Adverse validation](../../qualidade/validar-adversarial/SKILL.md) for negative
tests with synthetic data when applicable. Check the controls in the API or
local interface according to
[check-work](../../projeto/verificar-trabalho/SKILL.md).

## Safety report

Close the review in the diagnosis and recommendations. Present the report in the
conversation. Save a copy in `.agent-tests/security/` when the destination is
ignored and out of the index. If you need a copy without this destination, use a
private temporary folder outside Git. `report.json` existent. Omit secrets and
personal data. Use four sections:

1. **Summary and scope** with paths, environment, checks and count of findings
   confirmed by gravity. Identify and justify suspicions and false positives
   aside.
2. **Findings by risk** with ID, control, pre-condition, probability and impact.
   Justify critical gravity, high, medium or low and report confidence and
   evidence (file and line, configuration or test).
3. **What to Fix First** with actions related to IDs, urgency by exposure and
   impact, estimated effort and way to verify the correction. If there are only
   suspicions, prioritize obtaining evidence.
   [correct-vulnerability](../corrigir-vulnerabilidade/SKILL.md).
4. **Not evaluated** with excluded scope, incomplete checks, reasons and
   prerequisites to resume them. Justify apart the non-applicable items. Limit
   the conclusion to the proven coverage.

[reading-pt]: ../../../../../../.pbai4devs/skills/seguranca/revisar-seguranca/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/seguranca/revisar-seguranca/SKILL.md
