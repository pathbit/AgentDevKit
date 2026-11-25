---
description: "From kit preparation to implementation and review of a delivery."
language: en
---

# Workflow

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

[Documentation](../README.md) · [Installation](installation.md) ·
[Resources](resources.md) · [Tools and tests](tools-and-testing.md)

Install AgentDevKit prepares the instructions and templates. The workflow is
part of your goal and the decisions that the project has already registered.

## 1. Identify the situation

Choose the customers you use during the [installation](installation.md). In a
desktop agent's chat, please inform which customers you want to prepare. At the
root of the project installed with Git, check out the kit and see the next step:

```console
npx @pathbit/agentdevkit doctor
npx @pathbit/agentdevkit sync --check
npx @pathbit/agentdevkit next
```

`next` Uses the status found to suggest an action. In the AI client, ask the
agent to read `AGENTS.md` and follow the skill indicated for your purpose. The
inventory shows the files and states declared. Approval depends on the decisions
and evidence corresponding. [Reference CLI](cli.md)

| Situation | Command or initial resource |
| --- | --- |
| Just prepare the agents. | `init --purpose agents`. |
| New project, still no decisions | `next --intent product` · [configure-project][configurar]. |
| Existing application that needs to run | `next --intent run` · [prepare-dev][preparar]. |
| System in use that needs to be documented | `next --intent document` · [document-legate][legado]. |
| Evolve a project | `next --intent product` with the documents already adopted. |

Table commands use prefix `npx @pathbit/agentdevkit`. To inventory before
installing, use `npx @pathbit/agentdevkit document`. O [documentation
guide][inventario] shows how to verify behaviors in the code and tests and
complete the existing documents.

## 2. Gather the questions at the beginning

Before you create documents, [invent and read what exists](documentation.md).
Reuse the paths and complete gaps, without replacing by template. Gather
questions that change objective, scope, dependencies or criteria. Use the
answers already registered by the user or by project. Choose the documents and
tools according to the purpose of the request.

```text
Use configurar-projeto. Primeiro leia o repositório e reúna as dúvidas.
Neste momento quero apenas preparar os agentes; não crie produto ou aplicação.
```

When the product starts, combine document paths in the configuration state. Do
not assume that every project uses the same document folders. The record is
`.pbai4devs/state/configuracao/ESTADO.md`.

## 3. Define product and experience

[create-prd][prd] defines problem, public, scope, limits and expected success.
[create-ux-ui][ux] sets journeys and interface. UX/UI do not apply, register the
justification and its approval; absence of file does not mean approval.
Templates are filled with real answers.

Each document begins as draft. A material change requires reviewing your
approval and impact on dependent documents.

## 4. Approving the technical design

[create-design-doc][design] uses the approved product to define architecture,
technology, integrations, risks and alternatives. This step records decisions;
it should not start the application before the necessary work approval.

[manage-roadmap][roadmap] organizes increments, dependencies and releases. Do
not invent future dates or features to fill in the planning.

## 5. Create an executable spec

[create-spec][spec] requires PRD/design approved and UX/UI The spec delimits an
increase and links its criteria, such as: `AC-001`, to the planned tests:
method, prerequisite, assertive and local evidence.

```text
Use criar-spec para este incremento. Reúna as dúvidas antes de escrever.
Vincule os documentos existentes e defina como provar cada critério de aceite.
```

## 6. Approving the plan before implementing

[implementation-spec][implementar] begins in reading and planning: examines the
spec, code, dependencies and remaining doubts. It presents tasks, decisions,
risks and verification, awaiting the necessary approval of the plan.

After the approved plan, complete the missing technical configuration using the
already approved decisions. Just mark the configuration as completed with proof.
Implement the spec scope; do not anticipate future cycle resources.

## 7. Prove and review delivery

Use [check-work][verificar] to execute the relevant evidence. Code and test
fixtures are versioned; reports and catches remain in
`.agent-tests/<referencia>/<execucao>/`, ignored by Git.

[update-document][documentacao] keeps the affected documents consistent.
[command review-delivery][revisao] it brings together criteria, evidence and
independent review. `prepare` → Review → `seal` → `check`. Criteria without
proof, failure or pending review prevents completion of delivery.

## In an existing project

In the folder where the kit is installed, ask where to start.

```console
npx @pathbit/agentdevkit next --intent run
```

In a monorepo with shared installation, start at the root and inform the module
to the agent. If the module has its own kit, enter your folder with `--target`.
The developing version shows ways to check before execution. [How to test the
local version](cli.md#prepare-an-existing-project)

Read the README and the specified files such as Compose or Makefile. If the
project uses its own convention, confirm the startup command with the team. Pass
the module and those files to the agent along with the request.

```text
Quero rodar o módulo de relatórios. Leia o AGENTS.md e o README.
Mostre o comando de inicialização e como verificar se subiu.
```

Preserve data, lockfiles, settings, and real commands. For a functional change,
set the scope and criteria to accept before implementing.

**[ Next step ]** See `next` and use the indicated skill, preserving existing
decisions. [resources](resources.md) If there's a flow missing.

[configurar]: ../kit/skills/projeto/configurar-projeto/SKILL.md
[preparar]: ../kit/skills/projeto/preparar-dev/SKILL.md
[prd]: ../kit/skills/produto/criar-prd/SKILL.md
[ux]: ../kit/skills/produto/criar-ux-ui/SKILL.md
[design]: ../kit/skills/produto/criar-design-doc/SKILL.md
[roadmap]: ../kit/skills/specs/gerenciar-roadmap/SKILL.md
[spec]: ../kit/skills/specs/criar-spec/SKILL.md
[implementar]: ../kit/skills/specs/implementar-spec/SKILL.md
[verificar]: ../kit/skills/projeto/verificar-trabalho/SKILL.md
[documentacao]: ../kit/skills/projeto/atualizar-documentacao/SKILL.md
[inventario]: documentation.md#documenting-a-system-in-use
[legado]: ../kit/commands/documentar-legado/COMMAND.md
[revisao]: ../kit/commands/revisar-entrega/COMMAND.md

[reading-pt]: ../../guides/workflow.md
[reading-en]: workflow.md
[reading-es]: ../../es/guides/workflow.md
