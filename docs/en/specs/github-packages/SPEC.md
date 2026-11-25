---
description: "Publication of the single package in GitHub's npm registration."
status: aprovado
language: en
---

# Package npm in GitHub Packages

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objective

Publish `@pathbit/agentdevkit` in GitHub Packages, linked to this repository,
for installation with `npx`. Scope confirmed by the user in this request.
[PRD](../../product/prd.md), o [design](../../product/design.md) e a [UX of
CLI](../../product/ux-ui.md) This increment is a new distribution channel for
the existing package, without changing the CLI interface.

## Contract

- A npm package with CLI, skills and shared resources.
- Publish approved IC tarball, preserving source, version and bytes.
- Use `GITHUB_TOKEN` Actions with package writing permission.
- Include post in future releases and allow you to add an existing tag to the
  registry without re-recreating its release.
- Check the integrity of the version in the registry; versions with other bytes
  are conflicts. A repetition with equal bytes is safe.
- Prove installation of CLI from the registration, with workflow credentials.
- Document that GitHub Packages requires authentication even for public npm
  packages; do not view credentials or change the local login of the user.

Do not separate components into multiple packages, do not create a npmjs
registry and do not modify published tags. Dependency:
[v0.0.3](../v0.0.3/SPEC.md).

## Acceptance criteria

| ID | Result | Proof |
| --- | --- | --- |
| AC-001 | Single package with defined registration and repository. | Metadata. |
| AC-002 | Post the approved article without repack. | Tests and workflow. |
| AC-003 | Repetition and conflicts treated for integrity. | Negative tests. |
| AC-004 | CLI installed by the record performs correctly. | Real actions. |
| AC-005 | Log in, npx, documented limits and maintenance. | Lint and review. |

Evidence in `.agent-tests/github-packages/`, outside Git. Publication of the
version 0.0.3 uses the artifact of its existing tag; future versions follow the
IC.

[Specs](../README.md) · [Roadmap](../../product/roadmap.md)

[reading-pt]: ../../../specs/github-packages/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/github-packages/SPEC.md
