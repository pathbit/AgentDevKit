---
description: "Tests on real projects and protection of local artifacts."
status: aprovado
version: 0.0.7
language: en
---

# Compatibility with existing projects

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objective and authorisation

Meet the request to test the package published in open source projects with real
content, using clones in `tmp/` ignored. Fix the lack of artifact protection
revealed in projects that did not have the rules of AgentDevKit.

Work uses the [PRD](../../product/prd.md), o [design](../../product/design.md) e
a [public distribution](../v0.0.6/SPEC.md). It does not alter cloned
applications.

## Contract

- Clonar fixed commissions of Express, Zod and Chi; preserve the original
  projects.
- Compare bytes, types, permissions, links, HEAD and changes staged.
- Check installation, upgrade, repetition, own skill and conflicts.
- Protect artifacts in the ignore location without rewriting `.gitignore` user
  or unindex human files. Respect brother projects and exceptions.
- Maintaining symbolic links refusals. A secure lock does not prove successful
  installation; report it and check no changes.
- Versate test; save clones, logs and results only in `tmp/`.
- Post corrections as new stable version; repeat public proof.

## Acceptance criteria

| ID | Observable result |
| --- | --- |
| AC-001 | Real matrix records result and preservation per project. |
| AC-002 | Artifacts are ignored without altering sources or sister projects. |
| AC-003 | Returns and independent review approve the correction. |
| AC-004 | Published stable package repeats the results and updates the router. |

## Verification

- **AC-001:** run the runner against npm, including staged case and locks;
  register commits, version and hashes. Do not confuse with application tests.
- **AC-002:** Git testing, Git installation, nested design, mixed box, human
  exceptions and artifacts already tracked. Do not force overwritten.
- **AC-003:** perform package tests, infrastructure, lint and distribution.
  Compare Express native tests before and after without modifying your sources.
- **AC-004:** check release, `latest`, checksum and anonymous installation;
  repeat matrix with the package published and update the router with backup and
  diagnosis.

Evidence of clones remains in `tmp/oss-compatibility/`; the review report
`.agent-tests/oss-compatibility/` Zod and Chi won't have any native tests
without the runtimes/gerenciadores required. Do not complete universal
compatibility from this matrix.

## Documentation affected

Update installation, testing, changelog, indexes, and roadmap. Document the
protection of local artifacts and preexisting settings limits.

[reading-pt]: ../../../specs/v0.0.7/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/v0.0.7/SPEC.md
