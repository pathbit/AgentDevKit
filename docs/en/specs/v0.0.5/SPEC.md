---
description: "Package named as a form of installation and update."
status: aprovado
version: 0.0.5
language: en
---

# Installation by log

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objective

Install the package published in public npm by name and version without login.
The user chose this channel to install with `npx`, without downloading the
release.

Dependencies: [publication in GitHub Packages](../github-packages/SPEC.md),
[default structure](../v0.0.4/SPEC.md), [PRD](../../product/prd.md) e
[design](../../product/design.md). Change requested and execution authorized.

## Contract

- CLI, notes and guides use `npx` with the package name, version and
  registration.
- Do not require login to install and connect the public page of the package.
- Keep TGZ as approved technical artifact, with checksum and origin.
- After publishing, install by registration on temporary project and test
  version, `init`, `doctor` e `sync --check` in a new cache, no credentials.
- Prioritise Secret `NPMJS_TOKEN`, mapped to `NPM_TOKEN` in publication; use
  OIDC Authentication is only for the maintainer.
- Preserve credentials outside Git, human files and previous versions.

## Acceptance criteria

| ID | Result | Proof |
| --- | --- | --- |
| AC-001 | CLI suggests package named on all systems. | Tests and exits. |
| AC-002 | Notes and guides use the record and point out the package. | Lint and review. |
| AC-003 | Publication validates the consumer and refuses failures. | Negative tests. |
| AC-004 | Package installs by public npm without login. | Real actions. |
| AC-005 | Previous versions and data are preserved. | Distribution and Git. |

Evidence in `.agent-tests/registry-installation/`. A CLI and the files are the
scope; there is no web or desktop interface to validate this change.

[Specs](../README.md) · [npm package](../../maintainers/packages.md)

[reading-pt]: ../../../specs/v0.0.5/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/v0.0.5/SPEC.md
