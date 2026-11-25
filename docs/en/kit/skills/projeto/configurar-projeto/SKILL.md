---
name: configurar-projeto
description: "Organizes the preparation of the product and, after approvals, proves the technical configuration."
language: en
---

# Configure Project

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Inspect only this repository. To run or repair existing project, use
`preparar-dev`. If the objective is to understand and document the system in
use, use [document-legate](../documentar-legado/SKILL.md). While the user
configures only agents, keep templates in `.pbai4devs/templates/`. When setting
up the kit, use the order or status customers. If you miss selection, ask and
apply `--agents` or `agents` by CLI. No response available, use `all` for
customer selection. In the first use, pass the goal with `--purpose` or answer
the interactive question to guide the next action. Check out Node and npm and
prepare only the tools necessary for the task.

## Prepare the product

Do inventory with `atualizar-documentacao`. When the product starts, reuse
decisions and documents. Create or resume
`.pbai4devs/state/configuracao/ESTADO.md` by the model and match where they are
PRD, UX/UI, design, roadmap, releases, specs, tasks and supporting documents.
[Phase models](../../../templates/README.md). Register evidence of preparation
and forward the first pending step with `proximos-passos`The choice of stack
happens in design.

## Configure technology

Demand PRD, design, spec and plan approved. UX/UI requires approval or
justification of approved non-application. Preserve existing approvals and
follow the plan. Missing material decisions return to design.

- Use [diagnose](../../../commands/diagnosticar/COMMAND.md). If the Docker query
  fails, report **not verified**. No network allowed and no context Docker
  proven local, use `--no-docker-probe`Complete gaps with the questions of
  [environment model][ambiente].
- Prepare OS and architecture compatible tools via `preparar-ferramentas`Reuse
  facilities, stack and lockfiles. Apply [compulsory structure][estrutura] for
  Makefile, Compose, dockerignore, services, healthchecks, doors and volumes.
  `.editorconfig` required by the structure. Configure VS Code when adopted and
  complete it ignore with stack patterns. Check out which fonts, scripts, tests
  and fixtures are versionable.
- Document versions, structure, commands and template origin or init. Check
  runtime, Compose, infrastructure health and `inspecionar-projeto --check` with
  `verificar-trabalho`. Register `configuracao_tecnica: concluido` only with
  proof of mandatory dependencies and services. Before that, keep the
  application code out of the step. If there is already application, prove the
  real flow. If there is not yet, keep build, health and flow of it pending.

After technical changes, conclude `revisar-entrega`. Sync and check `--check`
only when agency resources change.

[ambiente]: ../../../templates/ambiente-local/TEMPLATE.md
[estrutura]: ../../../rules/ambiente-local/RULE.md

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/configurar-projeto/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/projeto/configurar-projeto/SKILL.md
