---
description: "Grouped requests and priorities for AgentDevKit's evolution."
status: em andamento
language: en
---

# Task groups and improvements

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

This list consolidates the requests for the conversation as expected result.
Details, evidence and limits are in [progress and evidence](TASKS.md); o
[roadmap](../../product/roadmap.md) follows the evolution of the product. A task
is only completed after the corresponding validation.

## 1. Project protection and synchronization — priority

- [ ] Preserve human files and settings, staged and unstaged changes,
  index, ignore and configuration Git in installations, updates and sync.
- [ ] Solve collisions and migrations from ancient resources without assuming
      property,
  deleting only content whose removal is proven to be secure.
- [ ] Investigating the reference update generated with `core.autocrlf=true`:
  the current test finds divergence in the content record and blocks the sync.
  Preserve protection against human editions and the index when correcting and
  validating.
- [ ] Correct concurrent recovery and preserve extended ACLs and attributes;
  repeat the strict tests on the applicable systems.
- [ ] Documenting the effects, conflicts and limits of `init`, `update`, `sync`
  and other commands, including projects that already have agents and skills.
- [ ] Validate the published version and candidate on the router without
      changing its
  `.gitignore`, its index or settings; only update after sufficient proofs.

## 2. Development flow and experts

- [ ] Guide preparation, product, UX/design, architecture, roadmap, specs and
  implementation in the agreed order, collecting doubts before proposing the
  plan.
- [ ] Prove prerequisites, approvals and criteria to accept; investigate
  effective protection against early writing, as well as textual instructions.
- [ ] Evolve architectural orientations, backend, frontend, QA, security,
  review, performance and adverse validation, with subagents when possible.
- [ ] Apply relevant performance material practices and evaluate ECC
  and Superpowers, respecting licenses and without copying unnecessary content.

## 3. Customers, resources and tools

- [ ] Keep `.pbai4devs` as a shared origin and synchronize only the
  selected clients, preserving their native files and own resources.
- [ ] individually validate skills and agents, including native integrations;
  monitor coverage in [inventory](VALIDACAO-RECURSOS.md).
- [ ] Investigate OpenCode loop and document manual removal when the
  source is identified; do not create schedules without request.
- [ ] Check Node bootstrap and install, update and validation of
  Windows, macOS and Linux tools with a simple input.
- [ ] Versioning test code and fixtures; maintaining results, catches,
  `.playwright*` And temporary projects outside Git.

## 4. Package, IC and publication

- [ ] Validate metadata, license, content and installation by npm, Yarn, pnpm
      and
  Bun; document prerequisites and options npm public and GitHub Packages.
- [ ] Run full gates and multiplatform tests; fix failures
  Before publishing. Releases and packages must match the same tag.
- [ ] Distinguishing approved, ignored and unexecuted tests in the reports;
  do not treat a partial execution as complete evidence.
- [ ] Check out actual publication and installations in the registers after
      release.

## 5. Documentation, examples and delivery

- [ ] Organize README, guides, wiki, roadmap and issues with simple text and
  deep; validate frontmatter, lint and destinations and relevance of the links.
- [ ] Maintain synthetic examples of new and existing projects; evaluate
      material
  visual without capturing information or private windows.
- [ ] Review human authorship and sensitive data in code, documentation and
  metadata; keep explicit rules of authorship in the Git skills.
- [ ] Review the final set, run the necessary tests and then do
  authorized commit and push, following IC and publication.

The above items are work groupings, not an assertion that all previous requests
remain open or have already been implemented. Please refer to the evidence to
distinguish partial results from pending ones.

[reading-pt]: ../../../tasks/evolucao-plataforma/GRUPOS.md
[reading-en]: GRUPOS.md
[reading-es]: ../../../es/tasks/evolucao-plataforma/GRUPOS.md
