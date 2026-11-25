---
name: planejar-qa
description: "Plans and executes risk-oriented AQ checks and acceptance criteria."
language: en
---

# Planning QA

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Check the relevant approved product documents and register conflicts with the
scenario before treating derived criteria as approved decisions. For each
criterion of acceptance, identify observable behavior, risks, data,
prerequisites and environment. If a decision prevents proof, clarify it; do not
invent access, data or results. Continue the checks that do not depend on that
decision. Do not generalize the behavior of unverified entries, even when
reading the code: register hypotheses and propose tests with representative
data.

Choose positive cases, negative cases, limits, transitions and relevant
regressions. Combine unit tests, integration, API, browser or desktop according
to product and risk; use existing tools and isolated fixtures. Contract tests or
mocks do not replace a real unexecuted integration.

Register for each criterion command or action, observed result and status **It's
gone.**, **failed** or **not verified**, with evidence and limitations. Mark how
it passed only when the data and assertions prove the criterion; the name and
success of a test, alone, do not demonstrate this coverage. If only examples of
the criterion passed, report them and keep the whole criterion as not verified
until there is evidence of the rest. Verify the test code and save results in
`.agent-tests/` or ignored directory. [Adverse
validation](../validar-adversarial/SKILL.md).

[reading-pt]: ../../../../../../.pbai4devs/skills/qualidade/planejar-qa/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/qualidade/planejar-qa/SKILL.md
