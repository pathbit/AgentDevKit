---
name: implementar-backend
description: "Change APIs, services or persistence with proof of contracts and authorization."
language: en
---

# Implement backend

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

In task covered by a spec, follow the prerequisites, plan and gate configuration
of [implementation-spec](../../specs/implementar-spec/SKILL.md), even for point
corrections. In single-handed correction, follow the scope, decisions and the
existing stack. `preparar-dev` If you need to prepare the environment.

Clear gaps about entries, outputs, data, compatibility, and failures. Validate
entries, resource authorization, and data isolation. Evaluate competition,
repetition, limits, timeout, migration, and recovery according to risk. Confirm
the limits of which security depends before implementing. Preserve legitimate
contracts and protect secrets in logs.

Prove normal and negative cases with tests and, where applicable, real calls to
API with isolated data. Declare integrations covered only by mocks or still
pending. Use [check-work](../../projeto/verificar-trabalho/SKILL.md) to record
evidence by criterion.

[reading-pt]: ../../../../../../.pbai4devs/skills/desenvolvimento/implementar-backend/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/desenvolvimento/implementar-backend/SKILL.md
