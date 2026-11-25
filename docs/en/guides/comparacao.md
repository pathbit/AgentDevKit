---
description: "Compare planning, delivery, and context approaches for code agents."
language: en
---

# Compare tools for development with agents

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Compare the functions your team needs to plan, implement, verify, and maintain
the project context. Each tool has its own flow, and you can combine options
that fulfill different roles in the same repository.

## Functionality Matrix

**✓** Documented function · **✓\*** Documented function with additional
configuration · **—** Equivalent without confirmation in the sources consulted.

Brands compare capabilities. The scope, commands and guarantees of each
implementation are in the notes below the tables.

### Plan and deliver

<!-- markdownlint-disable MD013 -->

| Functionality | AgentDevKit | BMad Method | OpenSpec | GitHub Spec Kit | `tlc-spec-lean` | `tlc-spec-driven` | dotcontext |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Adoption in existing repository | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Specification or plan with accepted criteria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓\* |
| Tasks or stories in own artifact | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓\* |
| Plan-guided implementation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓\* |
| Verification of implementation against planned | ✓ | ✓ | ✓\* | ✓ | ✓ | ✓ | ✓\* |
| Criteria and evidence recorded in the verification | ✓ | ✓ | ✓\* | ✓ | ✓ | ✓ | ✓\* |
| Review of delivery in another session or by another agent | ✓ | ✓ | — | — | ✓ | ✓ | — |
| Verify the revised content against commit diff or fast-forward merge | ✓ | — | — | — | — | — | — |
| PRD and technical design in own stages | ✓ | ✓ | — | — | — | — | — |
| Retrieval of code to document existing system | ✓ | ✓ | — | — | — | — | ✓\* |
| Terminal orientation for next action or artifact | ✓ | ✓ | ✓ | ✓\* | — | — | ✓ |
| Update of current specs when archiving changes by deltas | ✓\* | — | ✓ | — | — | — | — |
| Starting or advancing the flow via server MCP | ✓\* | — | — | — | — | — | ✓ |

<!-- markdownlint-enable MD013 -->

AgentDevKit records the independent opinion, the result by criterion and the
references to the evidence. The command `revisar-entrega` can seal the revised
content and check the commit diff or a fast-forward merge. BMad guides the
revision in a new session. `tlc-spec-lean` organizes the slices in the plan and
`tlc-spec-driven` predicts a file of tasks in the formal flow. [AgentDevKit
Review][revisao] · [Review on BMad][bmad-review] · [Lean][tlc-lean] · [Spec
Driven][tlc-driven]

OpenSpec 2 offers `openspec-verify-change` in the custom profile. In GitHub Spec
Kit, `speckit-converge` compares evidence and artifacts. Install workflow
`speckit` to follow his execution by CLI. [OpenSpec Skills][openspec-skills] ·
[Convergence][speckit-verify] · [Spec Kit Workflows][speckit-workflows]

AgentDevKit offers both functions by optional plugins. The plugin `openspec`
uses the OpenSpec engine to apply deltas and archive the change in `openspec/`.
The plugin `dotcontext-mcp` uses the dotcontext server to start or advance
PREVC. Each engine applies its own criteria. `next --integrations` to locate the
recognized artifacts in the project. [Plugins](plugins.md) · [OpenSpec
Archive][openspec-cli] · [Evidence in dotcontext][dotcontext-evidence]

### Configure and maintain the project

<!-- markdownlint-disable MD013 -->

| Functionality | AgentDevKit | BMad Method | OpenSpec | GitHub Spec Kit | `tlc-spec-lean` | `tlc-spec-driven` | dotcontext |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Installation or integration with multiple AI customers | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Shared structure without installing files for individual customers | ✓ | — | ✓ | ✓ | — | — | — |
| Selection of customers or adjustable destinations after installation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Synchronization of project's own instructions between AI clients | ✓ | — | — | — | — | — | ✓ |
| Unwritten preview for updating or configuration of customers | ✓ | — | ✓ | — | — | — | ✓ |
| Diagnosis of managed files and installed configuration | ✓ | ✓ | — | ✓ | — | — | ✓ |
| Protection of local changes in managed files in update | ✓ | — | — | ✓ | — | — | — |
| Preserving the Git index when configuring and synchronizing | ✓ | — | — | — | — | — | — |
| Recovery of problems in the installation or upgrade cycle | ✓ | — | — | ✓ | — | — | — |
| Please refer to the optional module, extension or skill catalogue | ✓ | ✓ | — | ✓ | ✓ | ✓ | — |
| Selective installation of optional modules, extensions or skills | ✓ | ✓ | — | ✓ | ✓ | ✓ | — |
| Local tool check by terminal | ✓ | — | — | ✓ | — | — | — |

<!-- markdownlint-enable MD013 -->

- **Configuration and versioning.** AgentDevKit saves selection in
  `.pbai4devs/state/agentdevkit.json` and uses this selection in the `sync`- Use
  it. `agents add <ids>` e `agents remove <ids>` to change customers
  individually. The selection `none` preserved `.pbai4devs` e `AGENTS.md`
  without setting up a specific client. Vert the shared sources and treat the
  generated notes according to the installation guide. OpenSpec offers `init
  --tools none` and lets you repeat `init` to add customers. Spec Kit records
  the installed integrations and offers `--integration none`. [CLI
  AgentDevKit][cli] · [Installation and Git][instalacao] · [OpenSpec
  Configuration][openspec-setup] · [Spec Kit Integrations][speckit-integrations]
  · [Mode `none` Spec Kit][speckit-none]
- **Selection and diagnosis.** AgentDevKit uses `--dry-run` for the previous,
  `doctor` for the diagnosis and `sync --check` to check synchronization without
  writing. OpenSpec also offers `update --dry-run`. BMad's guide documents `bmad
  status` in advance of v7 and the selection of customers in the installation of
  modules. Tech Leads Club configures the destinations when installing
  individual skills. dotcontext uses presets by export, has prior configuration
  MCP and provides diagnostic of Codex hooks. Each check has the scope of the
  operation that the tool describes. [CLI AgentDevKit][cli] · [CLI
  OpenSpec][openspec-cli] · [Installation of BMad][bmad-install] · [Catalogue
  TLC][tlc-catalog] · [CLI dotcontext][dotcontext-cli]
- **Preservation and recovery.** AgentDevKit preserves the Git index, signals
  conflicts with its own content and allows you to consult the journal and copy
  of a pending operation via `recovery`. Review the status and copy before using
  `recovery resolve`. Spec Kit uses manifests to detect changes, block updates
  of changed integrations without `--force` and reverse faults of the operation
  itself, with snapshots in certain conflicts. OpenSpec 2 preserves changes in
  old paths in migration and warns that the update replaces direct edits of
  skills in `.agents/skills`. Recovery of dotcontext sessions belongs to the
  workflow. [Preservation and Recovery in AgentDevKit][instalacao] · [Spec Kit
  Integration Cycle][speckit-integrations] · [OpenSpec 2
  Migration][openspec-upgrade] · [Dotcontext Runtime][dotcontext-runtime]
- **Optional.** `plugins list` e `plugins info` consult the tools and external
  skills recognized by AgentDevKit. `plugins install` e `plugins check` they
  work on the selected items, with the corresponding managers. `tools check`
  Checks auxiliary tools while `specify check` Checks executables required by
  the Spec Kit integrations. The BMad catalog offers modules such as Test
  Architect. The Spec Kit offers extensions with search and installation, and
  the Tech Leads Club uses a common catalog of the two skill tables. `dotcontext
  admin skill list` context skills list, which `admin skill export` exports to
  customers. [CLI AgentDevKit][cli] · [BMad modules][bmad-modules] · [Spec Kit
  Extensions][speckit-extensions] · [CLI Spec Kit][speckit-core] · [Catalogue
  TLC][tlc-catalog] · [CLI dotcontext][dotcontext-cli]

## When to consider each option

| Approach | When you consider | Highlights |
| --- | --- | --- |
| **AgentDevKit** | Share instructions between agent clients and guide adoption in new or existing projects. | Common Source in `.pbai4devs`, selective configuration, local survey and review of delivery by criteria and evidence. [CLI][cli] · [Workflow][fluxo] |
| **BMad Method** | Explore ideas and organize discovery, planning and development. | Skills with specific entry points for each activity. [Official documentation][bmad] |
| **OpenSpec** | Organize work by change and keep the specs in place. | Proposals, specs, design and organized tasks from the proposal to archiving. [Overview][openspec] |
| **GitHub Spec Kit** | Specify, plan and decompose work by functionality. | Commands to move from specification to implementation and an adoption guide that part of the architecture and testing of an existing project. [Project][speckit] · [Existing projects][speckit-existing] |
| **Tech Leads Club `tlc-spec-lean`** | Use a short plan with verifiable criteria. | Plan reviewed by one person, criteria-related checks and review by another agent. [Official Skill][tlc-lean] |
| **Tech Leads Club `tlc-spec-driven`** | Detail tasks, dependencies and checkpoints. | Specification, design and tasks according to scope, with execution and verification steps. [Official Skill][tlc-driven] |
| **dotcontext**, by Vinicius Lana (Vini Lana) | Maintain persistent context and monitor execution between agents. | Context in `.context/`, flow PREVC, server MCP and optional hooks for compatible customers. The project has already been published as `@ai-coders/context`. [README project][dotcontext] |

## How to check your project

In the AI client, use the syntax available for the installed integration.

- **AgentDevKit**. Compare the orientation of `npx @pathbit/agentdevkit next`
  with the inventory of `npx @pathbit/agentdevkit document --markdown`. In a
  project with the kit installed, `sync --check` Checks the synchronization.
  [CLI][cli] · [Documentation of existing systems][legado] · [Compatible
  customers][compatibilidade]
- **BMad Method**- Use it. `bmad` in the AI client to consult the next step. If
  you use the ticket tree, `tickets.py next` shows the work queue in the
  terminal. To investigate existing code, see `bmad-deep-recon`. [Existing
  project][bmad-existing] · [Planning][bmad-plan] · [Ticket Tree][bmad-tickets]
- **OpenSpec**After creating a change with the skill `openspec-propose`, consult
  `openspec status --change <id>` in the terminal. Compare the change files with
  the current specs to see what the archive incorporates. [CLI][openspec-cli] ·
  [Structure and deltas][openspec-concepts]
- **GitHub Spec Kit**. Follow the flow of `/speckit-specify` a
  `/speckit-implement` and check it out `spec.md`, `plan.md` e `tasks.md`- Use
  it. `/speckit-converge` to look for differences between the code and these
  artifacts. CLI, consult `specify workflow status <run_id>`. [Quick
  Guide][speckit-quickstart] · [Workflows][speckit-workflows]
- **Tech Leads Club**. Check it out. `tlc-spec-lean` arranges the slices and
  criteria in the `plan.md` and triggers a review by another agent.
  `tlc-spec-driven`, look at the `tasks.md` the formal flow and the association
  between criteria, verifications and evidence. [Lean][tlc-lean] · [Spec
  Driven][tlc-driven] · [Compatible customers][tlc-catalog]
- **dotcontext**. See plans and context persisted in `.context/`. With the CLI
  installed, `dotcontext admin workflow guide` presents the orientation of the
  PREVC by the terminal. See also the instructions export configuration and MCP
  integration. [README project][dotcontext] · [Version
  notes][dotcontext-releases]

## Adopting only what you use

See the recognized flows in the project before or after installing the kit:

```console
npx @pathbit/agentdevkit next --integrations
```

The query uses local files and folders to point out references and documents
that you can take advantage of. `--intent product` or `--intent run` to indicate
your goal and `--json` for structured exit. When you find evidence in the
project, the `next` suggests this consultation and maintains the main
orientation. Project approvals continue to be valid.

If the project already has revised specs or decisions, start with them. Choose a
source for the acceptance criteria for each delivery and register where the
proofs are. This allows you to keep, for example, OpenSpec specs and use
AgentDevKit for local preparation and shared instructions.

In an existing project, see first plan with `init --dry-run` and limit
AgentDevKit notes with `--agents`. Install and configure each external tool in a
separate action, following its documentation when it uses the same customers or
paths. [AgentDevKit Installation][instalacao]

[cli]: cli.md
[fluxo]: workflow.md
[instalacao]: installation.md
[legado]: documentation.md#documenting-a-system-in-use
[compatibilidade]: ../kit/COMPATIBILIDADE.md
[revisao]: ../kit/commands/revisar-entrega/COMMAND.md
[bmad]: https://docs.bmad-method.org/
[bmad-existing]: https://docs.bmad-method.org/scenarios/change-an-existing-codebase/
[bmad-install]: https://docs.bmad-method.org/start/install-bmad/
[bmad-modules]: https://docs.bmad-method.org/customize/add-modules/
[bmad-plan]: https://docs.bmad-method.org/scenarios/plan-a-feature-as-a-team/
[bmad-review]: https://docs.bmad-method.org/build/review-a-change/
[bmad-tickets]: https://docs.bmad-method.org/reference/ticket-tree/#what-is-ready
[openspec]: https://github.com/Fission-AI/OpenSpec/blob/v2.0.0/docs-lab/start/overview.md
[openspec-cli]: https://github.com/Fission-AI/OpenSpec/blob/v2.0.0/docs-lab/reference/cli.md
[openspec-concepts]: https://github.com/Fission-AI/OpenSpec/blob/v2.0.0/docs-lab/guides/concepts.md
[openspec-setup]: https://github.com/Fission-AI/OpenSpec/blob/v2.0.0/docs-lab/start/setup.md
[openspec-skills]: https://github.com/Fission-AI/OpenSpec/blob/v2.0.0/docs-lab/reference/skills.md
[openspec-upgrade]: https://github.com/Fission-AI/OpenSpec/releases/tag/v2.0.0
[speckit]: https://github.com/github/spec-kit
[speckit-core]: https://github.github.com/spec-kit/overview/core.html#check-installed-tools
[speckit-existing]: https://github.github.com/spec-kit/how-to/existing-projects.html
[speckit-extensions]: https://github.github.com/spec-kit/extensions/cli.html
[speckit-integrations]: https://github.github.com/spec-kit/integrations/cli.html
[speckit-none]: https://github.github.com/spec-kit/integrations/none.html
[speckit-quickstart]: https://github.github.com/spec-kit/quickstart
[speckit-verify]: https://github.github.com/spec-kit/reference/agentic-sdd.html
[speckit-workflows]: https://github.github.com/spec-kit/workflows/overview.html
[tlc-lean]: https://github.com/tech-leads-club/agent-skills/blob/main/packages/skills-catalog/skills/%28development%29/tlc-spec-lean/SKILL.md
[tlc-driven]: https://github.com/tech-leads-club/agent-skills/blob/main/packages/skills-catalog/skills/%28development%29/tlc-spec-driven/SKILL.md
[tlc-catalog]: https://github.com/tech-leads-club/agent-skills#-supported-agents
[dotcontext]: https://github.com/vinilana/dotcontext#what-dotcontext-is
[dotcontext-cli]: https://github.com/vinilana/dotcontext#cli-reference
[dotcontext-evidence]: https://github.com/vinilana/dotcontext#executable-evidence
[dotcontext-releases]: https://github.com/vinilana/dotcontext/releases
[dotcontext-runtime]: https://github.com/vinilana/dotcontext#harness-runtime

[reading-pt]: ../../guides/comparacao.md
[reading-en]: comparacao.md
[reading-es]: ../../es/guides/comparacao.md
