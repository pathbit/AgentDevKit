---
description: "Publication of installation and distribution documentation in both registers."
status: aprovado
version: 0.0.10
language: en
---

# Publish and check both installation paths

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objective

Publish version 0.0.10 with the pre-requisite and installation guides already
approved. Provide the same bytes in npm and GitHub Packages and prove the
consumption of the version published in both destinations.

## Contract

- Keep npm public without login and GitHub Packages with own authentication.
- Use only the tag commit IC-approved artifact.
- Check version, integrity, public visibility and association to the repository.
- Include both installation commands in README, guides and release notes.
- Preserve previous versions, human files, and existing settings.
- Save downloads and evidence in ignored directories.

## Acceptance criteria

| ID | Observable result |
| --- | --- |
| AC-001 | Version, lockfile, changelog, guides and notes consistent with 0.0.10. |
| AC-002 | IC approved in all four profiles and tag in the verified commit. |
| AC-003 | Version 0.0.10 public in both registers, with bytes equal to IC. |
| AC-004 | Version, init, doctor and sync --check They're on both registers. |
| AC-005 | License and guides included, no local artifacts or credentials. |

## Validation

Test note generation and local distribution. After IC, post tag, download the
original artifact and compare release and registry checksums. Use new caches and
projects: npm without credentials; GitHub with exclusive token. Check `latest`,
README public, license and the four CLI commands.

The systems' native installers are documented with official sources; this
release does not claim to reinstall them on machines that already have the
prerequisites.

[reading-pt]: ../../../specs/v0.0.10/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/v0.0.10/SPEC.md
