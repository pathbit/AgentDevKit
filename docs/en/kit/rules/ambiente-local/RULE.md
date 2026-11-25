---
trigger: always_on
description: "Minimum structure and local environment of Docker Compose projects."
language: en
---

# Local environment

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

In the technical configuration of new projects, keep `.pbai4devs/` and only
manages the selected clients. Configure `.vscode/` when this editor is adopted.
For the application, create `src/`, `tests/` e
`infra/compose/compose.local.yml`- They're mandatory. `.gitignore`,
`.gitattributes`, `.editorconfig`, `.dockerignore`, `Makefile` e `README.md`;
`scripts/` is optional for application automations. In existing projects,
preserve the organization until authorized standardization and follow the stack
commands in use.

Use Docker Compose on new projects and existing ones that already adopt it.
Enlighten services and versions, banks, cache, queues, integrations, resources,
secrets, ports and data. Ask the incoming port; if the user does not know,
choose a free and register it. Publish only what is needed in localhost, with
healthchecks and explicit persistence. Preserve volumes; do not run `down -v` as
routine.

Traefik is optional for sharing the input port between applications with
different hosts. Use restricted file or proxy configuration for discovery; do
not expose dashboard or unrestricted access to the Docker socket.

When Makefile is part of the technical configuration, it should offer `help`,
`doctor`, `setup`, `up`, `down`, `logs`, `test`, `lint` e `build`, with actual
stack commands. Still undefined steps must fail with useful message; do not
simulate success. Document commands, dependencies and URL/porta in README;
validate the health and configuration of Compose when applicable. Before
application exists, validate runtime, Compose and infrastructure services
required. Build, health and flow of the non-existent application remain pending;
do not create business code to simulate these evidences. If a mandatory
dependency is unavailable, keep the configuration pending and record the
impediment. After implementation, prove the application.

Use the [environment model](../../templates/ambiente-local/TEMPLATE.md) for
questions and base files. Application versions follow project decisions;
updating local tools does not update stack banks or dependencies.

[reading-pt]: ../../../../../.pbai4devs/rules/ambiente-local/RULE.md
[reading-en]: RULE.md
[reading-es]: ../../../../es/kit/rules/ambiente-local/RULE.md
