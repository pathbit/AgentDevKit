---
description: "Private and manifest verifiable backup for conservative recovery."
status: aprovado
language: en
---

# Backup and recovery manifest

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

This isolated component prepares copies of the snapshot provided by the caller
and delivers the hash from the manifest to the [daily](../diario-disco/SPEC.md).
The user's general authorization covers the increment. It does not change CLI,
sync or consumer projects; does not correct rollback.
[PRD](../../product/prd.md), a [experience](../../product/ux-ui.md), o
[design](../../product/design.md) e o [roadmap](../../product/roadmap.md) They
remain valid.

## Contract of the original increment approved

The approval status above refers to this contract and the original acceptance
criteria. The additional implementation described below is under review.

The caller provides a private, reliable, existing and empty folder and a list of
entries with relative path, action (`create`, `update`, `remove`, `retain`),
previous type (`file`, `directory`, `absent`), mode and bytes of each file. The
component validates everything before the first writing: portable paths with
conservative checkbox and components `.git` e `.agent-tests`, single entries,
coherent types and actions, modes POSIX, bytes without `SharedArrayBuffer` and
limits 4.096 entries, 32 MiB per file, 128 MiB in total and 4 MiB in manifesto.
Refuse unknown format or content without printing names or bytes. Also refuse
reserved characters and names, spaces or end points and long components. The box
comparison and standardization does not replace an alias proof on each file
system and can refuse distinct names. It rejects the Unicode aliases played for
`ß`, sigma and `ſ`, but does not implement the whole [case folding
Unicode][case-folding] or the native comparison of each volume. Integration
shall refuse what cannot safely validate.

Generate exclusive copies on `blobs/`, with numerical names independent of the
paths of the project. POSIX, the paste is born with `0700`, subject `umask`;
each copy is born with up to `0600` and gets mode `0600` prior to `fsync`. The
original mode is in the manifest. Sync each copy, folder and manifest before
returning. The canonical manifest UTF-8 contains the paths, actions, types,
modes, sizes, hashes SHA-256 and copy names. Its complete hash, including the
end-line break, identifies the content to be reported to the journal. Do not
overwrite or remove waste after failures. If synchronization fails after the
manifest recording, it may remain visible and even verifiable despite the error;
this does not transform preparation into success or proves durability.

A separate check gets the expected hash and rejects truncated, changed,
non-canonical data, extra entries, links, broad permissions or unexpected types.
It requires `0700` ed `blobs/`, `0600` in the files and gives size and hash of
the copies, without restoring files. When Node informs the effective user,
folder and copies must belong to that user. Original owner, group, ACLs, extra
attributes, special project dates and bits are not registered in this component.
The mode provided must be between `0000` e `0777`; if the original has special
bits, the planner must identify them and not silently discard them. Results and
errors do not expose content or names. Reading can update access metadata. In
Windows, preparation and verification are refused until real validation; ACLs,
secure ancestor and resistance to power drops are not proven by bits POSIX or by
`fsync`.

The component neither reads the project nor proves that the snapshot is
complete, current, or that files with hardlinks, symbolic links or special types
have been handled safely by the planner. The manifesto records actions, but does
not contain the planned content or hash for after the operation. It does not
provide authentication, restoration, retention or deletion of data. Verification
cannot detect a joint replacement of the manifest and hash by the controller.
Rechecks detect some changes during reading, but do not make backup an atomic
view of a directory subject to competing writers. Before integration, these
limits, project identification, complete capture and coordination with old
processes need to be resolved. The current format rejects a previous file with
descendants, including a planned file exchange per directory. One `umask` that
removes access from the owner may prevent writing and leave a private residue,
which is not removed.

## Implementation in review

In macOS, the preparation requires no entry of ACL at the root, in `blobs/` and
in private files before saving your bytes. Verification repeats inspection in
manifest and copies. `0700` with an inherited concession it was refused before
receiving data. A second fixture confirmed the refusal of a blob to which an ACL
was added.

In Windows, the caller provides an empty private folder. You can create it with
`createPrivateRecoveryDirectory`, which assigns a DACL The preparation confers
on the DACL root and folder `blobs/` before saving the snapshot data.
Verification also checks the DACL the manifesto and each blob. Both apply the
policy of owner, concessions and inheritance described in the diary. DACL
prevents the use of backup. The original mode provided continues as a manifest
metadata. Verified permissions describe the backup storage. The capture of
original project ACLs remains outside this format. [Journal
policy](../diario-disco/SPEC.md#implementation-in-review) · [Backup
implementation](../../../../.pbai4devs/scripts/lib/recovery-backup.mjs)

In Windows, the component synchronizes bytes of blobs and manifest by
descriptor. The path POSIX also performs `fsync` of directories. Persistence of
names in Windows after power loss remains unsecured. Local check in macOS
covered unique creation and hashes conference. Missing to execute in Windows the
test that grants reading to All (`Everyone`) and requires refusal of backup
before recording, in addition to the preparation and verification cycle in
private folder. [Backup
Tests](https://github.com/pathbit/AgentDevKit/blob/main/tests/recovery-backup.test.mjs)

The caller can check the backup and provide the manifest hash to `begin`. Manual
resolution requires the generation and ID of pending and preserves the manifest,
blobs and public files. CLI and sync and the decision on rollback belong to the
scope of conservative recovery. [Journal resolution][resolucao] · [Integration
Spec](../recuperacao-conservadora/SPEC.md)

[resolucao]: ../diario-disco/SPEC.md#implementation-in-review

## Acceptance criteria

- **AC-001:** Preparing and checking synthetic snapshot with empty and binary
  files, directories and absences preserves bytes and modes in the manifest,
  without modifying the public files of fixture.
- **AC-002:** Invalid entries, collisions, dangerous paths, unsupported formats
  and limits are rejected before writing. Later failures preserve waste, do not
  overwrite other files and do not produce success.
- **AC-003:** Modification, truncation, removal, link or extra file in backup
  and incorrect manifesto are detected without divulging content.
- **AC-004:** A test associates the hash verified with `begin` of the journal;
  it does not claim that the CLI You use this mechanism even if the snapshot is
  complete.
- **AC-005:** Proofs pass on macOS and Linux; real Windows gets unchecked. Test
  code is versioned and evidence stays on `.agent-tests/manifesto-recuperacao/`.

[case-folding]: https://www.unicode.org/faq/casemap_charprop.html

[reading-pt]: ../../../specs/manifesto-recuperacao/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/manifesto-recuperacao/SPEC.md
