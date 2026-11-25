---
description: "CLI and portable resources of the first AgentDevKit distribution."
status: aprovado
version: 0.0.1
language: en
---

# Distribution v0.0.1

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objective and scope

Distribute the independent kit, installable in new and existing projects,
according to [PRD](../../product/prd.md), [UX](../../product/ux-ui.md) e
[design](../../product/design.md). Includes CLI, features, adapters, languages
and tests. Publication depends on the validation of delivery; it does not
include backend or graphical interface.

## Acceptance criteria

| Criteria | Observable result |
| --- | --- |
| AC-001 | Tarball contains CLI/recursos no results, downloads or secrets. |
| AC-002 | `init` installs in empty directory and offers next steps. |
| AC-003 | Installation and updating preserve existing own content. |
| AC-004 | Repetition is idempotent; simulation does not alter the target. |
| AC-005 | Standard PT, EN/ES and persisted language work with JSON valid. |
| AC-006 | Adapters, catalogs and synchronization reflect the unique origin. |
| AC-007 | Project receives guidance without improper product creation. |
| AC-008 | Infrastructure tests and maturity scenarios pass. |

## Verification plan

Evidence: `.agent-tests/agentdevkit-v0.0.1/<execucao>/` and IC reports. The
table defines the evidence; actual results are left in the ignored report of
each execution, without versioning approvals or test outputs in this spec.

| Criteria | Method | Requires | Assertive | Evidence |
| --- | --- | --- | --- | --- |
| AC-001 | pack | Node/npm | No extras | pack.json |
| AC-002 | init | Tarball | Recursos/next | empty.json |
| AC-003 | init/update | Sentinels | Hashes equal | existing.json |
| AC-004 | repetir/simular | Target | Impotent | repeat.json |
| AC-005 | PT/EN/ES | Targets | Idioma/JSON | languages.json |
| AC-006 | sync/check | Fonts | Equal indices | sync.log |
| AC-007 | next/doctor | Phases | Applicable action | next.json |
| AC-008 | testes/matriz | Kit | Cases have passed | matrix.json |

Run `npm test` for distribution and CLI; `npm run test:infra` for automations;
and script `testar-maturidade` for the eight scenarios. `npm pack` and npx
offline about real tarball. Sentinels are user files whose content should remain
identical after installing and updating.

## Documentation and authorisation

README PT/EN/ES, installation, product and shared guides accompany CLI. Scope
authorized by the current request to create AgentDevKit. Maintained criteria
require proof approved in the review before completing the release.

[All specs](../README.md) · [Wiki](../../README.md)

[reading-pt]: ../../../specs/v0.0.1/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/v0.0.1/SPEC.md
