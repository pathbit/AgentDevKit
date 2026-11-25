---
description: "Isolate installer backups with a private POSIX directory."
status: aprovado
language: en
---

# Private backup directory

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

The installer preserves the mode of the copied files, but a copy may lose the
protection of the original folder. This increment, authorized by the user,
maintains the mode contract of the [historical spec](../v0.0.8/SPEC.md) and
creates each backup in an exclusive folder with initial mode `0700` ed POSIX,
subject `umask`. O [PRD](../../product/prd.md), a [UX](../../product/ux-ui.md),
o [design](../../product/design.md) e o [roadmap](../../product/roadmap.md) The
release has not yet been selected.

Create unique folder before first copy and before changing project content;
create also each missing ancestor with mode `0700`, subject `umask`. A failure
prevents such changes. Do not change existing folder modes or contents, Git
files or `.gitignore`. Preserve the modes of copied files, create private
subfolders and files exclusively, and return the relative path; the identifier
is opaque and may vary. No previous files, do not create a backup folder. After
failure, empty or partial wastes are preserved.

Isolation depends on effective permissions, including ACLs, owners and security
of ancestors; mode POSIX does not demonstrate secrecy against the owner,
privileged users or those who can already access the folder. The proof does not
guarantee protection on Windows or against concurrent directory exchange. Direct
sync and concurrent recovery remain outside of this increment. Backups can still
be exposed to Git according to project rules. POSIX, if the file system informs
wide permissions for the created root, refuse with `E_BACKUP`; some volumes
without adequate support in modes POSIX They can stop the operation.

## Acceptance criteria

- **AC-001:** With masks `000`, `022` e `077`, a file backup `0640` protected by
  the original folder has a new root `0700` or more restricted; the mode and
  bytes of the copy remain the same as the original ones. POSIX with synthetic
  design and log in `.agent-tests/backup-privado/`.
- **AC-002:** Preexisting human folders and files are preserved; without
  previous files there is no new backup folder. Creation or copying failures
  prevent planned changes. Test modes, bytes and Git index prepared.
- **AC-003:** Installation returns, modes and preservation pass on macOS and
  Linux; validate Windows in real execution or register as unverified. Tests do
  not prove ACLs or security on network systems.

Conservative recovery, strict tests, independent review and multi-platform
validation remain necessary before any publication.

[reading-pt]: ../../../specs/backup-privado/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/backup-privado/SPEC.md
