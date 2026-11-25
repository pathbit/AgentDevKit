---
name: atualizar-documentacao
description: "Update affected documents and their consistency with delivery."
language: en
---

# Update documentation

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Before you write, run the [hub inventory][inventario] and consult
`documentation`. If runtime is not available, map the documents by reading and
report the limits. Open the relevant files and check the approvals, diff and job
criteria. Gather at first only doubts that the files do not respond.

Propose by path: maintain, complement a section or create missing file. Reuse
existing names, formats, decisions, links, and structure; a document like
`ARCHITECTURE.md` you can fulfill the design role without being renamed. Arrange
first by indexes and links. Do not delete, move or replace files to standardize
them. Add only proven facts and preserve the previous content. If there is a
relevant contradiction without solution in the available instructions or
evidence, present the facts and ask the user; wait for the answer before editing
the affected document. Continue independent tasks. Diverging commands do not
justify creating a script: confirm the intention and behavior available before
deciding what to document.

Use the [catalog](../../../templates/README.md) as a list of gaps, never as a
substitute for an existing document. Create only what the phase and the request
require; absence of answers does not authorize inventing PRDdesign or approval.

Check it out. README ed raiz/pastas, AGENTS/CLAUDE/GEMINI, contribution, version
notes, produto/design/specs, ADRs, configuração/exemplos e
comentários/docstrings Relevant. Update only what the change affects; document
real behavior, prerequisites, commands, compatibility and limits. Avoid
repeating instructions. Public safety depends on confirmed support and channel,
without fictitious data.

No README main, keep a section **Prerequisites** close to the beginning. Tell us
what to install in each mode of use, the verified minimum version and the
official download link. Identify optional or specific development tools. Keep
the section when the stack or versions change.

Register by way the decision `updated`, `no-impact` or `not-applicable`, with
justification, in the delivery report or the result of the task. Check links and
examples; compare the previous content and confirm that files outside the plan
remain intact. Repeat the task should not duplicate sections. Test code is
versioned, evidence is ignored.

When delegated, return the diff to the main agent, the decisions per document
and the evidence. In delivery or review already open, gather the result in the
final diff. If you are the main agent and the documentation is the entire
delivery, open the review if not yet in progress, by
[review-delivery](../../../commands/revisar-entrega/COMMAND.md) to activate the
[reviewer](../../../agents/revisor/AGENT.md) correct findings and confirm the
final state before registering approval in the report.

[inventario]: ../../../scripts/inspecionar-projeto/README.md

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/atualizar-documentacao/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/projeto/atualizar-documentacao/SKILL.md
