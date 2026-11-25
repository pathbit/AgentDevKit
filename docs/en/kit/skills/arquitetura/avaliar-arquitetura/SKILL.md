---
name: avaliar-arquitetura
description: "Evaluates and guides architectural decisions as required and restricted by the software."
language: en
---

# Evaluate architecture

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Examine the product, the flows, the design and the existing system. Gathers
questions that change decisions; when there is no definition, refer to the
[technical design](../../produto/criar-design-doc/SKILL.md)Don't impose stack.

Identify components, responsibilities, contracts, data and trust borders.
Evaluate operation, evolution, failures, safety, performance and costs according
to the context. Compare alternatives and consequences; register decisions,
compensations and migration when necessary. Diagrams only when clarified. Do not
assign behavior to the entire system by reading a component; record the
conditions and unchecked parts of each solution. For durability and idempotence,
check mechanism, atomity and effects; do not treat a key or a storage type as an
isolated warranty.

Question coupling, data loss, dependencies and simultaneous failures with
concrete scenarios. Delete an independent analysis when available and allowed.
Deliver proposed decision, evidence, risks and open verifications; do not
present hypotheses as facts. See [C4](https://c4model.com/diagrams) when a
diagram helps.

[reading-pt]: ../../../../../../.pbai4devs/skills/arquitetura/avaliar-arquitetura/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/arquitetura/avaliar-arquitetura/SKILL.md
