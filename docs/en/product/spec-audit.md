---
description: "Control of the review of the specifications and their evidence."
status: em-andamento
language: en
---

# Control of specifications

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

This index records the work needed to know the state of each criterion.
**Pending** means that the individual audit has not yet been completed; it does
not mean that the functionality is missing. Releases, old tests and approved
specs help locate evidence, but do not replace that conference.

For each spec, review your criteria, associate tests and evidence to the version
and the environment, record to-dos or blocks, and distinguish later decisions
that replaced historical criteria. Private files and local results remain
outside Git; register a safe reference or explain the block.

| Spec | Theme | Audit of the criteria |
| --- | --- | --- |
| [v0.0.1](../specs/v0.0.1/SPEC.md) | Distribution | Pending |
| [v0.0.2](../specs/v0.0.2/SPEC.md) | Selection of agents | Pending |
| [v0.0.3](../specs/v0.0.3/SPEC.md) | Sources and local generation | Pending; review Git policy |
| [GitHub Packages](../specs/github-packages/SPEC.md) | GitHub Package | Pending |
| [v0.0.4](../specs/v0.0.4/SPEC.md) | Structure and examples | Pending |
| [v0.0.5](../specs/v0.0.5/SPEC.md) | Installation by log | Pending |
| [v0.0.6](../specs/v0.0.6/SPEC.md) | Presentation and licence | Pending |
| [v0.0.7](../specs/v0.0.7/SPEC.md) | Existing projects | Pending; review Git policy |
| [v0.0.8](../specs/v0.0.8/SPEC.md) | Preserving and Validating | Pending; review Git policy and reconcile rollback and competition |
| [v0.0.9](../specs/v0.0.9/SPEC.md) | Existing agents and documents | Pending |
| [Two records](../specs/dual-registry/SPEC.md) | Synchronized publication | Pending |
| [v0.0.10](../specs/v0.0.10/SPEC.md) | Installation by both records | Pending |
| [Security](../specs/security-ecosystem/SPEC.md) | Local security ecosystem | Pending |
| [Additive integration](../specs/additive-integration/SPEC.md) | Integration without substitution | Pending; review Git policy |
| [Real projects](../specs/real-projects/SPEC.md) | Real projects and examples | Pending; review Git policy |
| [Ignore the project](../specs/project-ignore/SPEC.md) | Ignore the root | Pending; review Git policy |
| [Developer](../specs/development-ecosystem/SPEC.md) | Development ecosystem | Pending |
| [IC](../specs/ci-resilience/SPEC.md) | Pipeline Reliability | Pending |
| [Status](../specs/state-directory/SPEC.md) | Status Folder | Pending; review Git policy |
| [Synchronization](../specs/safe-synchronization/SPEC.md) | Secure sync | Pending |
| [Ignore Customers](../specs/client-ignore/SPEC.md) | Local unknowns | Pending; review Git policy |
| [Tool](../specs/tool-release/SPEC.md) | Tool and versions | Pending |
| [Tags](../specs/automatic-release-tags/SPEC.md) | Automatic tags | Pending |
| [Discovery](../specs/discovery-preservation/SPEC.md) | Discovery and preservation | Pending |
| [Destinations](../specs/target-paths/SPEC.md) | Installation destinations | Pending |
| [Order](../specs/preimplementation-order/SPEC.md) | Order before implementation | Pending |
| [Conservative recovery](../specs/recuperacao-conservadora/SPEC.md) | Recovery after failure | Draft; pending decisions and evidence |
| [Recovery log](../specs/registro-recuperacao/SPEC.md) | Records and transitions | Review by pending criterion |
| [Disk logbook](../specs/diario-disco/SPEC.md) | Persistence and publication of records | Review by pending criterion |
| [Recovery Manifesto](../specs/manifesto-recuperacao/SPEC.md) | Snapshot Integrity | Review by pending criterion |
| [Private backup](../specs/backup-privado/SPEC.md) | Protection of local copies | Review by pending criterion |
| [Temporary permissions](../specs/sync-permissoes/SPEC.md) | File Metadata | Review by pending criterion |
| [Rules Scope Claude](../specs/escopo-regras-claude/SPEC.md) | Discovery and Legacy Rules | Review by pending criterion |
| [Preserving TOML](../specs/toml-preservacao/SPEC.md) | Legacy commands | Review by pending criterion |
| [Guided experience](../specs/experiencia-guiada/SPEC.md) | First steps | Published in 0.0.34; revision by pending criterion |
| [Legacy documentation](../specs/documentacao-legado/SPEC.md) | Inventory and evidence | Published in 0.0.35; revision by pending criterion |

When completing an audit, add a criterion traceable reference with status and
evidence and update the corresponding line. [roadmap](roadmap.md) for priorities
and dependencies.

[reading-pt]: ../../product/spec-audit.md
[reading-en]: spec-audit.md
[reading-es]: ../../es/product/spec-audit.md
