---
description: "Evolve existing documents and create only what is missing."
language: en
---

# Documentation without losing context

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use `document` to start a system survey and `atualizar-documentacao` to review
the documents affected by a delivery. The agent uses the inventory as a starting
point to read the sources and propose add-ons on the authorized paths.

## Documenting a system in use

See the direct inventory at the project root, even before installing the kit.
`--json` for automation and `--markdown` to get a draft.

```console
npx @pathbit/agentdevkit document
npx @pathbit/agentdevkit document --markdown
```

The local query brings together manifests, script names, source and test
samples, infrastructure and documents. Use the result to choose the modules and
streams to read. With the kit installed, `next --intent document` forwards to
[skill document-legate][legado].

In each relevant stream, depart from a code entry, follow the effects and check
the tests. Quote file, line, symbol or test for the facts. Explain which
evidence supports each inference and which source can answer the pending
questions. Judge what a static reading supports and records execution results
only when actually verified.

Use the [survey model][levantamento] to consolidate the analysis. For authorized
changes, complement the existing documents with `atualizar-documentacao`. Use
design, ADR or SPEC when you need to document, respectively, the architecture, a
structural decision or an increase. The survey remains in draft until the review
of facts and gaps.

## Start with what exists

After installing the kit, ask your agent:

```text
Use atualizar-documentacao. Primeiro inventarie e leia os documentos existentes.
Proponha complementos por arquivo, preservando conteúdo, nomes e decisões.
Organize por índices e links; crie apenas documentos que realmente faltam.
```

The inventory can be found at the root of the project:

```console
node .pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs
```

No JSON the inspector's, `documentation.files` lists documents and their likely
roles, and `documentation.scan` informs search limits. Read the files before
using your papers to decide. `ARCHITECTURE.md` It describes the design of the
system, keep that path.

## Planning the add-on

| Situation | Action |
| --- | --- |
| Document already enough | Maintain and record no impact. |
| There's no proven information. | Add to appropriate section. |
| Documents hard to find | Create or complete indexes and links. |
| Required document does not exist | Match path and create only what is necessary. |
| Decision not found or contradictory | Ask before you write. |

Templates help identify gaps. Do not replace existing documents. Preserve your
sections, anchors, facts and decisions; repeat the flow should not duplicate
content. Do not move or delete files to standardize.

## New or existing project

In existing project, enjoy README, guides, ADRs and product documents. Preparing
the environment or improving documentation does not require restarting the
product.

In new design, discover product and experience before architecture and specs. As
long as the goal is only to set up agents, keep the templates without inventing
PRD, technology or approval. [workflow](workflow.md).

## Check result

Review diff and links. Confirm that the previous content has been preserved,
that files out of plan have not changed and that invented decisions have not
arisen. Use `verificar-trabalho` e `revisar-entrega`; save the evidence on
`.agent-tests/`.

[Wiki](../README.md) · [Shared Skill][skill] · [Tests][tests]

[skill]: ../kit/skills/projeto/atualizar-documentacao/SKILL.md
[legado]: ../kit/skills/projeto/documentar-legado/SKILL.md
[levantamento]: ../kit/templates/levantamento-legado/TEMPLATE.md
[tests]: ../tests/README.md

[reading-pt]: ../../guides/documentation.md
[reading-en]: documentation.md
[reading-es]: ../../es/guides/documentation.md
