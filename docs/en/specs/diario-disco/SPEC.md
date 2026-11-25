---
description: "Exclusive publication of recovery records in a prepared private directory."
status: aprovado
language: en
---

# Disk recovery log

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

This increment implements an isolated component to publish and inspect [recovery
records](../registro-recuperacao/SPEC.md)- It doesn't connect you to CLI, sync
or consumer project and does not correct the rollback. The user’s general
authorization covers the increment. [Product](../../product/prd.md),
[experience](../../product/ux-ui.md), [design](../../product/design.md) e
[roadmap](../../product/roadmap.md) They remain valid.

## Contract

The approval status above refers to this contract and the original acceptance
criteria. The additional implementation described below is under review.

The caller provides an already prepared, private and reliable storage directory
containing exclusively the folders `records` e `staging`. The module does not
create these folders, does not remove contents or interpret missing directories
as empty journal. Unexpected entries in `records`, links, special files,
incomplete records, pending states and read faults prevent a new reservation.
The inspection returns different states and does not change files. POSIX,
directories must belong to UID effective, without permission of grupo/outros or
special bits. Records should also belong to this UID and have mode `0400`; its
observable properties are compared during reading. These checks do not prove the
absence of ACLs nor prevent an exchange after the last consultation.

To reserve a generation, inspect records and publish `claim` in next generation
canonical name with unique hardlink. Generate bytes in unique file in `staging`,
created with mode `0600` subject to `umask`, make it read-only and sync it
before publication. Before chaining another record, sync the previous record
observed and its directory. Then post, sync the log directory; any failure is
reported. The folder `staging` preserves the source files, including error
residues; none is deleted automatically and its size is not yet limited. `begin`
e `done` follow the same procedure, requiring the operation ID and the previous
phase. The caller provides the manifest hash: the module does not check the
manifest or backup. Do not implement resolution or compaction in this increment.

One `claim` or `begin` without terminal keeps the operation pending. Exclusive
publication decides the dispute between cooperative processes; a state `ready`
read before the dispute does not authorize, alone, a change. The limit of
records and bytes need to reserve space for the three records before accepting a
clan. `E_RECOVERY_BUSY` log `EEXIST` in the publication; it does not prove who
created the name. `E_RECOVERY_UNCERTAIN` informs generation, ID and type when
the publication may have occurred, without claiming it occurred; previous
failures return error of E/S. Reading failure, invalid record, and incorrect
phase are different. Errors should not disclose the contents of the records or
user files. Reading may update file system access metadata. Competing changes in
inode or an incomplete listing may produce temporary invalid result. Unexpected
exceptions during reading are also classified as invalid diary; the result does
not identify your cause. ID is visible in the inspection: it is neither secret
nor proof that caller `begin` or `done` be the process that has reserved the
operation.

The module assumes that no external writer modifies or hides the records and
that the directory provided is correct and remains secure. Ancestors links,
competing directory exchanges, ACLs and physical completion of the listing are
not guaranteed by this increment. The absence of an entire tail, written by old
versions or removed externally, is not detectable by hash. A synchronization
failure after posting can leave the record visible despite the error; the result
should be inspected. `fsync` does not prove resistance to power loss, and unique
hardlinks can be incompatible with file or network systems. On Windows,
changeable operations return `E_RECOVERY_UNSUPPORTED` before accessing the
journal; ACLs and future support require specific proof. In the prototype, a
failure of `fsync` after publication `done` can return `E_RECOVERY_UNCERTAIN`
while the query returns `ready`. This status does not allow to integrate the
journal to the product: repeat `fsync` the receipt or check only the backup does
not prove that the changes have ended. The preparation file and the published
record are names for the same inode;
reading only reduces accidental changes, but does not prevent editing by the
owner.

Prior to integration, there is still a lack of location and connection to the
project, secure creation, full backups and manifesto, retention, explicit
resolution, diagnosis, command classification and reconciliation of the
historical contract. The resolution should dispute a mutually exclusive terminal
with `done` and consider suspended writers: just inserting a resolution record
does not prevent an old process from changing files again. There is no such
block or recovery procedure in this component.

## Implementation in review

After stopping the writers and reviewing the project status, the operator can
register the pending resolution. `resolveRecovery(raiz, geração, id)` consults
the current generation and requires exact matching of the two identifiers.
Accepts the phases `claim` e `begin` and publishes a receipt `resolved` in the
existing format, with the hash of `claim` and the hash of `begin` when present.
The chain inspection recognizes the resolution and allows the next reservation.
Public files, backup and previous records remain available for review.
[Implementation of the
journal](../../../../.pbai4devs/scripts/lib/recovery-store.mjs)

Invalid divergent and daily ID or generation block resolution. An error that
leaves the publication of the uncertain receipt requires further inspection.
Exclusivity of the name `resolved` It prevents you from overwriting another
receipt of this kind. `done` The presence of the two terminals invalidates the
chain and blocks new reserves.

In macOS, in addition to the mode and owner, the component requires a
consultation of ACL successful and no entries in private directories, logs and
preparation file before writing your bytes. ACL inherited, even in a folder
`0700`The local test confirmed the refusal before publishing a `claim` and after
adding a ACL to a record. [Privacy
tests](https://github.com/pathbit/AgentDevKit/blob/main/tests/recovery-backup.test.mjs)

On Windows, `createPrivateRecoveryDirectory` uses Windows PowerShell system and
`CreateDirectoryW` to create only a folder with DACL Protected. Creation informs
`EEXIST` when the name is already occupied. The journal checks the root,
`staging`, `records` and the registration files. The policy accepts as owner the
current user, SYSTEM or the local group Administrators. Accepts only simple
concessions to these identities and requires total control of the current user,
inherited by files and subfolders in case of directories.`reparse points`),
wider concessions and consultation failures prevent the use. [Implementation of
the privacy policy](../../../../.pbai4devs/scripts/lib/recovery-privacy.mjs)

Windows syncs the bytes of the file by writeable descriptor and publishes the
log by unique hardlink. Directory entry is out of this `fsync`, therefore the
visibility after process closure does not demonstrate persistence of the name
after power drop. The macOS check covered the resolution in both phases, an
invalid receipt and repetition after recording failure. It is missing to perform
the tests in real Windows to check DACLs, unique creation and journal
transitions on that platform. Integration with the product commands and rollback
contract are separate jobs. [Daily tests][testes-diario] · [Conservative
recovery](../recuperacao-conservadora/SPEC.md)

## Acceptance criteria

- **AC-001:** Inspection distinguishes empty, pending, completed and invalid
  data without following links in the records or exceeding the limits of the
  pure validator.
- **AC-002:** Claim, begin and done form a chained sequence; phase, ID, limits
  and invalid collisions are refused without modifying existing records.
- **AC-003:** Real processes dispute the same claim: only one wins. Closure
  after the claim keeps pending recognisable in new execution.
- **AC-004:** Injected failures before and after hardlink keep records and waste
  for inspection and do not modify public fixture files.
- **AC-005:** Proofs pass on macOS and Linux; Windows is registered as not
  checked until actual test. Results on `.agent-tests/diario-disco/`.

The tests do not approve integration, recovery of real projects or release.

[testes-diario]: https://github.com/pathbit/AgentDevKit/blob/main/tests/recovery-store.test.mjs

[reading-pt]: ../../../specs/diario-disco/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/diario-disco/SPEC.md
