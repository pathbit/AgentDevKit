---
name: proximos-passos
description: "It identifies the current state and guides the next useful action of the project."
language: en
---

# Next steps

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Read the order, saved status and existing documents. Use the language of
`.pbai4devs/state/agentdevkit.json` or Portuguese when there is no choice yet.
CLI is available, see `agentdevkit next --target . --json`. For product or
functionality, add `--intent product`; to prepare the execution of an existing
project, use `--intent run`To document what already exists, use `--intent
document` and forward the [document-legate](../documentar-legado/SKILL.md).
Treat the answer as guidance and check out documents and evidence. If the
command fails, is not available or not allowed, fill in the gap and inspect the
files. For product, check `.pbai4devs/state/configuracao/ESTADO.md` and the
evidence: if the preparation is pending, refer the `configurar-projeto` prior to
PRD; if not proven, request the necessary confirmation. Preserve existing
documents and decisions. To execute existing project, use `preparar-dev`When?
`next` indicate external references, see `next --integrations` with the same
intention. Use only the pertinent artifacts as input and
check approvals at the source that the project adopted.

At the end of a stage, highlight: result, pendências/bloqueios and next action
with command or skill, in the format of [next step
rule](../../../rules/proximos-passos/RULE.md). Just ask the questions that
prevent you from moving forward. Continue the already authorized work; do not
restart completed phases or present assumptions such as approvals.

New project follows preparation → PRD → UX → design (architecture and
technology) → roadmap → approved spec → approved plan → technical configuration
→ implementation → review. UX may not be applicable with approved justification.
Existing project part of your current evidence; installing the kit does not
authorize to recreate documents or replace decisions. If there are no pendings
in the scope, say this clearly.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/proximos-passos/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/projeto/proximos-passos/SKILL.md
