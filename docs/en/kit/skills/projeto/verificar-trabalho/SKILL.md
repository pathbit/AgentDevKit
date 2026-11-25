---
name: verificar-trabalho
description: "It validates a change ready by criterion of acceptance with tests, actual execution and evidence."
language: en
---

# Check job

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Map available criteria, risks, and evidence. Reuse evidence of the same state
and environment that covers the criteria. [plan-qa][qa] to choose cases and
[validation-adversarial][adversarial] to investigate a specific flaw.
[execute-script][execucao] identifies the actual project commands.

- **Behaviour.** Run the project tests that cover the accepted ones. Check lint,
  types and build when applicable.
- **Agentic resources.** Turn around [verification-resources][recursos]- In
  disagreements, [review the plan][sync] and apply only if the correction is in
  scope.
- **Kit automations.** Turn around [test-infrastructure][infra]. For catalog,
  sync, installation or copy, also rotate [`testar-maturidade run`][maturidade].
- **Web interface.** [Open the actual application][navegador], traverse the
  affected streams and check screen, console and network in the project matrix.
- **Desktop or artifact.** Open or render and inspect the result. Run the
  affected flow when there is application.
- **Vercel catalog.** Rotate [functional test and check your limits][vercel].

Confirm results and output codes. Mark each criterion as **It's gone.**,
**failed** or **not verified**. A behavior acceptance requires an execution that
covers the entire criterion. Register environment, command, evidence and gaps.
When a tool or access is missing, enter the prerequisite and follow the viable
evidence.

File outputs in `.agent-tests/<referencia>/<execucao>/` and link them to IDs
such as AC-001. Tests and fixtures can be versioned. Return failures to the
implementer and forward the proofs to the flow that requested verification.
Standing criterion or open independent review prevents completion of delivery.

[execucao]: ../executar-script/SKILL.md
[qa]: ../../qualidade/planejar-qa/SKILL.md
[adversarial]: ../../qualidade/validar-adversarial/SKILL.md
[recursos]: ../../../scripts/verificar-recursos/README.md
[sync]: ../../../commands/sincronizar/COMMAND.md
[infra]: ../../../scripts/README.md#infrastructure-script
[maturidade]: ../../../scripts/testar-maturidade/README.md
[navegador]: ../../../commands/testar-navegador/COMMAND.md
[vercel]: ../../../scripts/preparar-ferramentas/README.md#individual-operations

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/verificar-trabalho/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/projeto/verificar-trabalho/SKILL.md
