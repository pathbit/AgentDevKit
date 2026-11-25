---
description: "Questions and background files of the environment after deciding the stack."
status: modelo
language: en
---

# Local environment

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Fill in with existing replies and files. This template does not approve
technology or initiate the product; copy the base files only in the authorized
technical configuration and replace all parameters before running.

## Initial questions

| Theme | What to Clear |
| --- | --- |
| Objective | New project, develop existing or repair what error? |
| Host | SO/arquitetura, Docker/Compose, resources and restrictions available? |
| Application | Linguagem/runtime, versions, manager, lockfiles and Dockerfile? |
| Services | Bank and version, cache, queues, integrations and external services? |
| Access | The desired door, aplicações/hosts and need of Traefik? |
| Data | Credentials, existing volumes, migrations and data that you preserve? |
| Verification | Commands of build/test/lint, health and real flow to prove ? |

If the port is unknown, choose a free one after checking conflicts and register
the decision. Secrets stay outside Git; examples contain only fictitious names
and values. Images and versions follow stack decisions.

## Base Files

- [Compose](../../../../../.pbai4devs/templates/ambiente-local/compose.local.yml.template):
  copy to
  `infra/compose/compose.local.yml`; define imagem/build, door, healthcheck and
  the necessary services.
- [Makefile](../../../../../.pbai4devs/templates/ambiente-local/Makefile.template):
  copy to `Makefile`; configure the commands of
  build/test/lint/saúde from the stack, preserving existing targets.
- [Dockerignore](../../../../../.pbai4devs/templates/ambiente-local/dockerignore.template):
  copy to `.dockerignore` and adapt to
  build context; keep code, fixtures and manifests required.

A [environment rule](../../rules/ambiente-local/RULE.md) defines the mandatory
structure and the safe use of Docker/Traefik. None of these models replace a
real Dockerfile or check the product without build and execution.

Makefile uses [`up --wait`][up] Compose uses [mandatory variables][variaveis] to
prevent execution with missing essential parameters.

[up]: https://docs.docker.com/reference/cli/docker/compose/up/
[variaveis]: https://docs.docker.com/reference/compose-file/interpolation/

[reading-pt]: ../../../../../.pbai4devs/templates/ambiente-local/TEMPLATE.md
[reading-en]: TEMPLATE.md
[reading-es]: ../../../../es/kit/templates/ambiente-local/TEMPLATE.md
