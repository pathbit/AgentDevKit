---
description: "Sync temporary permission preservation tasks."
status: em andamento
language: en
---

# Temporary sync permissions

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Spec: [sync-permissives](../../specs/sync-permissoes/SPEC.md)Release: pending.

- [x] Play mode `666` in destination fixture `600` on macOS and Linux.
- [x] Fix temporary creation without changing new file policy.
- [x] Prove 26 cases of mode, content and concurrent checks on macOS and
  Linux. On baseline, 18 of these cases failed.
- [x] Repeat 12 infrastructure suites in isolated copy, eight scenarios of
  maturity and preservation tests; record a case NTFS ignored.
- [-] Review diff and update documentation and evidence.
- [ ] Validate Windows and concurrent recovery before a release.

The evidence stays in `.agent-tests/sync-permissoes/execucao-XZqfCZ/`. The local
candidate package has undergone six operations in isolated fixture; this does
not change the published version. The eleven strict preservation tests continue
to fail.

[reading-pt]: ../../../tasks/sync-permissoes/TASKS.md
[reading-en]: TASKS.md
[reading-es]: ../../../es/tasks/sync-permissoes/TASKS.md
