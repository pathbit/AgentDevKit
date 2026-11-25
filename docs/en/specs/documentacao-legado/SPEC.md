---
description: "Discovery and documentation of the behavior of an existing system."
status: rascunho
language: en
---

# Documenting a legacy system

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

The team needs to regain knowledge of the code and tests and register the result
in the documents they already use. The initial goal decides whether it is worth
mapping behavior, preparing the environment, or planning an evolution.

## Acceptance criteria

- **AC-001** The initial question and the explicit option refer the purpose of
  documentation. `next --intent document` indicates the survey and, when
  installed, the responsible skill. Non-interactive execution remains possible.
- **AC-002** A CLI generates a draft on Markdown and data on JSON before or
  after installing the kit. Registers evidence and gaps within search limits.
  Preserves code, documents and the Git state. Respects recovery.
- **AC-003** The skill, command and documenting profile reuse native documents
  and templates. A legacy flow is documented with cross-references between
  behavior, code and testing. Inferences are identified.
- **AC-004** The package goes through resource review, testing CLI, tests on
  existing and new projects and distribution verification.

[reading-pt]: ../../../specs/documentacao-legado/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/documentacao-legado/SPEC.md
