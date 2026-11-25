---
name: preparar-dev
description: "Make an existing project run on the machine or repair your environment by following the stack and current commands."
language: en
---

# Prepare for development

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Inspect only this repository. Reuse the current output from
[diagnose](../../../commands/diagnosticar/COMMAND.md) or run the query. README,
hidden files, manifests, lockfiles, Makefile, Compose, Dockerfiles,
configuration examples, CI and connectors. Identify the actual command and what
is required for the stream. If the Docker query fails, report **not verified**.
No network allowed and no Docker context proven local, run diagnostic script
with `--no-docker-probe`The bootstrap makes its own diagnosis before forwarding.

Only treat customer selection if the request involves installing or setting the
kit. Gather questions about the error, purpose, services, credentials, versions,
port and data to be preserved. Use the [environment
model](../../../templates/ambiente-local/TEMPLATE.md) for the gaps.

Perform authorized repairs in the environment. Preserve product, stack and
documents. Functional changes, architecture, stack versions or data require your
own decision. For kit tools required for the task, use `setup <seleção>` in
[tool preparation](../../../commands/instalar-ferramentas/COMMAND.md)Follow the
lockfiles and stack commands to prepare the services. If the project already
uses Compose, follow the [environment
rule](../../../rules/ambiente-local/RULE.md). Adapt models when authorized
repair requires and preserves banks, volumes and secrets.

Validate configuration, build, health, agreed migrations and relevant tests.
`verificar-trabalho` for real flow, when there is application. Report commands
to climb and stop, URL or door, evidence and to-dos. `.agent-tests/`. Update
affected documentation and sync if agentic features change. New features follow
specs flow.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/preparar-dev/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/projeto/preparar-dev/SKILL.md
