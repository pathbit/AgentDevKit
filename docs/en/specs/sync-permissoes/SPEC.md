---
description: "Preserve permissions while creating sync temporarys."
status: aprovado
language: en
---

# Temporary sync permissions

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Synchronizer can create a temporary with larger permissions than the existing
file before applying its mode. The user's general permission for improvements
already granted covers this correction. [preservation spec](../v0.0.8/SPEC.md),
without replacing your rollback contract. Product and architecture remain
[PRD](../../product/prd.md), [UX](../../product/ux-ui.md) e
[design](../../product/design.md).

## Scope

In POSIX, when updating an existing regular file, create the temporary with the
observed destination mode, subject to the system creation mask, before writing
content; then restore existing mode as today. New files and Windows maintain the
previous creation method; the new consistency check also applies to Windows and
still needs real proof. Do not consult or change `process.umask()` in the
implementation: the consultation without argument has risk of running according
to the [Node documentation](https://nodejs.org/api/process.html#processumask).
If a mode removal or change is observed in the check before the temporary is
created, refuse the operation. This does not close the window after this check.

This does not guarantee ACLs, owner, group, special bits, extended attributes or
secrecy on Windows, nor resolves competing exchanges during application,
cleaning or rollback. The mode can change again after checking. [conservative
recovery](../recuperacao-conservadora/SPEC.md) remains separate and pending; do
not publish as long as your strict tests fail.

## Acceptance criteria

- **AC-001:** On macOS and Linux, with `umask` permissive, the temporary of a
  destination `600` does not grant access to group or others at the time of
  creation. `tests/sync-temporary-privacy.test.mjs` It must fail before and pass
  later. `.agent-tests/sync-permissoes/`.
- **AC-002:** Existing modes `400`, `444`, `600`, `640` e `644` are preserved
  after sync, with masks `000`, `002`, `022` e `077`. New file keeps the modes
  resulting from the same masks. Test with isolated fixtures; check bytes and do
  not depend only on options passed to `writeFileSync`.
- **AC-003:** Sync and preservation tests pass without changing human files, Git
  index or ignore fixtures. Reexecut `testar-infraestrutura` e
  `testar-maturidade`; register commands, failures and limits.
- **AC-004:** Windows test does not interpret bits POSIX as proof of ACL.
  Validate operation and preservation in Windows matrix before publishing; until
  then record as not verified.

## Delivery

Refresh [roadmap](../../product/roadmap.md), tests and documentation of limits;
record evidence and independent review. The release version has not yet been
chosen. The isolated correction does not complete the other requirements of the
objective or authorize a partial publication.

[reading-pt]: ../../../specs/sync-permissoes/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/sync-permissoes/SPEC.md
