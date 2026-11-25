---
description: "Public presentation, license and update of the kit."
status: aprovado
version: 0.0.6
language: en
---

# Public presentation and licence

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objective and authorisation

Post a stable version of AgentDevKit with clear identification in npm, README
readable and license included in the installed hub. After posting, update the
`talquee-ai-router` preserving your files and data.

Scope authorized by user request. Approval allows you to perform the work;
testing, publishing and updating require your own proofs. Dependencies:
[PRD](../../product/prd.md), [design](../../product/design.md) e [installation
by log](../v0.0.5/SPEC.md).

## Contract

- Declare PathBit author, relevant keywords and license MIT in the package.
- Derive README published from source without changing the versioned file:
  remove YAML and convert local links to absolute GitHub URLs.
- Use `LICENSE` from the root of the package as a source of
  `.pbai4devs/LICENSE`. Preserve consumer root license and protect conflicts in
  the hub.
- Keep Node 18+ in the launcher and Node 24+ in the core; isolate credentials
  and cache in the public consumption tests, without installing tools
  implicitly.
- Confirm `latest`, integrity and download before anonymous evidence.
- Simulate the router update, check property and preserve existing human data,
  settings, local tools and commits.

Do not create product documents on the router, reset your license or change
published versions. Delivery does not promise total absence of bugs.

## Acceptance criteria

| ID | Observable result |
| --- | --- |
| AC-001 | Package identifies PathBit, keywords and MIT license. |
| AC-002 | README Do TGZ has not YAML; local links become absolute. |
| AC-003 | Hub gets the canonical license without changing the consumer's. |
| AC-004 | Runtime and public consumption maintain environmental contracts. |
| AC-005 | Stable version in `latest` installs and operates without authentication. |
| AC-006 | Updated router preserves previous files, data and commits. |

## Verification plan

Results are in `.agent-tests/public-package/`, separated from this spec. The
test code is versioned. Each test records command, version, prerequisites,
assertive and evidence path in the review report.

- **AC-001:** Inspect `package.json` Do TGZ exact and the npm metadata; compare
  authorship, keywords, MIT and version with approved source.
- **AC-002:** test packaging and extract the TGZ; check the first line, links of
  arquivos/imagens and preservation of bytes of README source.
- **AC-003:** run installation and distribution tests on new and existing
  projects; compare licenses, test conflict, backup and diagnosis.
- **AC-004:** perform Launcher tests, publication and distribution; prove
  runtime compatibility, isolated cache and absence of tokens in the consumer.
- **AC-005:** publish the approved artifact; consult `latest` and download;
  execute `--version`, `init`, `doctor` e `sync --check` in new destination and
  cache.
- **AC-006:** save hashes and Git status from router, review `--dry-run`, apply
  the fixed version and repeat diagnóstico/sincronização; compare own files,
  eight tool receipts and history to the previous state.

Independent review confers the report and findings before completion. This
change requires terminal and npm record; it does not change interface
web/desktop.

## Documentation affected

Update README public, guides to instalação/publicação, PRD, design, roadmap,
specs index, changelog and license description in the hub. README the router
affected by the update, preserving its context.

[Specs](../README.md) · [npm package](../../maintainers/packages.md)

[reading-pt]: ../../../specs/v0.0.6/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/v0.0.6/SPEC.md
