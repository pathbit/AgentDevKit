---
description: "AgentDevKit configuration initial inventory."
preparacao: concluido
configuracao_tecnica: concluido
ambiente_local:
  compose: infra/compose/compose.local.yml
  porta: null
  host: null
  ferramentas: .pbai4devs/tools/
documentos:
  readme: README.md
  contribuicao: CONTRIBUTING.md
  changelog: CHANGELOG.md
  seguranca: docs/guides/security.md
  adrs: null
  prd: docs/product/prd.md
  ux_ui: docs/product/ux-ui.md
  design: docs/product/design.md
  roadmap: docs/product/roadmap.md
  releases: null
  specs: docs/specs
  tarefas: docs/tasks
language: en
---

# Project Settings

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Inventory

O PRD, the experience of CLI and the existing design are registered as approved.
Roadmap and specs index record the work and its audits. `inspecionar-projeto`
identified the existing documents; the results need to be reregistered as shared
evidence.

## Preparation and technical configuration

- The preparation and technical configuration were checked in the local
  environment described below. Its conclusion does not attest that the product
  is faultless.
- The project is a CLI Node.js; no server, port or persistent service has been
  identified. CLI And it ends.
- Prerequisites, tools, build and basic flow were verified in the environment
  used; platform limits and pending tests are real.
- Conciliate the historical rollback criteria with the evolution of recovery
  before considering it ready for implementation.

## Local evidence of preparation

On November 15, 2026, the diagnosis identified macOS ARM64, Node `26.13.0`, npm
`11.20.0`, Git available and Docker/Compose with accessible daemon. `setup all`
installed or reused the 11 compatible tools and confirmed their versions; the
subsequent diagnosis did not point out missing tools.
`.agent-tests/preparacao-recuperacao-o83wpC/`.

The tool manager test passed in 115 cases. Vercel's seven functional tool tests
passed with fixtures; they do not run browser, product, proxy, TLS or video
recording. Local report is in
`.agent-tests/vercel-labs/smoke-vKkYOM/REPORT.json`.

Six strict recovery tests failed to reproduce the loss of human substitutes in
the installer and sync, including after updating the installer. A seventh
identified mutating calls after failure. These evidence reproduces product
defects, docker or runtime unavailability. They prevent declaring recovery safe
or approving a release. The reconciliation of the historical rollback contract
remains pending.

A fixture with synthetic human content has confirmed that a backup can be
visible to Git when the project does not ignore it; index and ignores remain
intact. Guides now guide you to check visibility before adding files to Git.

A temporary test with Compose executed the local candidate package `0.0.30` in
Node 24, no network, on a preexisting synthetic project. The six operations
preserved human files and Git files monitored. This does not prove concurrent
recovery, Windows or permanent project configuration.

On November 15, 2026, before the permanent configuration, `inspecionar-projeto
--check` identified absence of `infra/compose/compose.local.yml`,
`.dockerignore` e `Makefile` and returned incomplete contract. Documentary
inventory ended without notice or truncation. Local report is in
`.agent-tests/revisao-recuperacao-2a5Fou/inventario.json`. The application is a
CLI short run, no server or port.

Compose have been added, `.dockerignore` e `Makefile`The diagnosis, `make
setup`, `make up` e `make lint` passed on macOS; the CLI was executed in the
Linux Node 24 container without network. Build passed in temporary copy; the
previous artifact of `0.0.30` The Docker context proof confirmed seven files
kept and 37 deleted in synthetic fixture. `inspecionar-projeto --check` the
revisions identified risks in the direct build and in the recovery; the findings
remain open and prevent declaring complete delivery.

Before the punctual correction of permissions, `make test` finished with 658
approvals, a proof NTFS ignored and eight ALL. Reproduction permissions passed
after correction on macOS and Linux; at the time, seven ALL recovery cases did
not perform fixtures in the standard suite and failed in strict mode. Today
there are eleven outstanding portable cases after including concurrent update on
sync and cleaning after publication, two additional concurrent backup cases,
four metadata and six file protection on macOS, and three xattr on Linux. The
six new tests check refusal by ACL or unchangeable flag in the observed state;
update uses synthetic legacy. The previous default suite does not prove
correction. Logs are in `.agent-tests/configuracao-cli-8AkUjb/`.

[reading-pt]: https://github.com/pathbit/AgentDevKit/blob/main/.pbai4devs/state/configuracao/ESTADO.md
[reading-en]: ESTADO.md
[reading-es]: ../../../../es/kit/state/configuracao/ESTADO.md
