---
description: "Conservative recovery after installation failure and synchronization."
status: rascunho
language: en
---

# Conservative recovery after failure

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

## Objective

Eliminate the lost played during the installer and syncer rollback, preserve
paths that may have been modified by people and provide information for manual
recovery. This proposed warranty covers recovery after failure; it does not
delete the concurrent editing window during the normal application. The
implementation is under verification and the accepted is still pending.

## Functional requirements

- After a changeable operation has failed, automatic recovery does not remove,
  rename, restore, write or change the mode of public paths that may have been
  created, replaced or removed, including state, migration, directories and
  uncertain results. The project may remain partial.
- Before the first mutation of public paths, prepare recoverable and manifest
  backup of all pre-existing items affected, including removable and state;
  record planned actions, absences and available modes. Preparing failure
  prevents public mutation. Preserve backups and hierarchy in failure.
- Record start before mutation and completion only after all steps. Invalid
  pending, invalid record or unknown result blocks `init`, `update`, `lang`,
  amendment of `agents` e `sync` changeables, including direct sync. Inquiries
  and safe diagnosis remain accessible with partial or invalid status. If it is
  not possible to simulate a reliable plan, inform the limitation without
  inventing a result. The resolution requires explicit revision and action of
  the operator without automatic replacement of the current content.
- Human errors, JSON and direct sync report original failure, partiality,
  affected or uncertain paths, backup and next steps, indicating truncation and
  failure output, without printing file or secret content.
- Orient the operator to stop writers, create copy or checkpoint, compare backup
  and current content, review creations, removals, status and migration, and
  execute diagnostic and new plan. Do not recommend blind backup or reset of the
  Git index.

## Non-functional requirements

- Preserve bytes and register available backup modes without changing existing
  Git index, configuration or ignores. Backups and manifests may contain
  sensitive data; document location, visibility, and life cycle.
- In POSIX, create private directories with `0700` and private files with
  `0600`; store original modes as metadata. On each platform, check effective
  ACLs or declare limitation: bits POSIX They don't prove secrecy.
- Protect internship and temporary, treat cleaning failures and waste without
  blind exclusion from public paths. The private stage used in planning should
  not create a to-do confused with that of the consumer project.
- Existing file update should preserve metadata and respect their protections,
  including ACL which denies writing and unchangeable flag when available. ACL
  The main structured cause of this refusal, including when encapsulated, must
  identify the target in the `path` and protection by `EACCES`, `EPERM`,
  `E_PROTECTED_METADATA` or `E_METADATA_UNSUPPORTED`. An error in another way,
  with only the fate of a rename or occurred only in cleaning does not prove
  this refusal before mutation.

## Scope and out of scope

Includes installer, direct syncer, backups, to-dos, state migration, targeted
diagnosis, and recovery. It does not guarantee preservation against concurrent
edits during normal application, file atomicity or automatic recovery after
interruption; it does not change index or offers `undo`. A backup captured
during editing may not be consistent. Post, removal, directories, aliases and
links during the application require separate work. Old versions of the kit may
not respect new records or locks and should not be presented as protected by
this change. Public paths cover files, directories, and project status that
people or other tools may change. Private backups and records must have verified
location and possession; their cleanup does not allow erasing replaced paths or
whose identity is uncertain.

## Technical restrictions and pending decisions

### Metadata per platform

The orchestration continues in Node. Before changing an existing file, the
installer and sync need a proven way to inspect and preserve their protections
and relevant metadata, including backup. The verification must distinguish
proven success, unavailable resource and error; unknown result does not allow to
state that there are no metadata. The same contract should cover removals and
status files. The strategy and distribution of any native component has not yet
been decided.

If a compiled component is required, the distribution must continue to work with
a single executable npm package via `npx`, without compiler or `postinstall` in
the consumer project. Direct sync also needs to be able to use it after
installation, outside the temporary cache of the `npx`. Validate source,
integrity, OS, architecture and execution capacity; absence or failure are not
preservation confirmation. The choice between executable and
[Node-API](https://nodejs.org/api/n-api.html), supported targets and assembly of
the same artifact for both registers continue to be evaluated. The package
accepts Node 18 for bootstrap; a CLI Prepared requires Node 24 or above.

On macOS,
[`fcopyfile`](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man3/copyfile.3.html)
offers options for extended ACLs and attributes; copying metadata does not prove
that the original change is allowed. On Linux,
[`listxattr`](https://man7.org/linux/man-pages/man2/listxattr.2.html) and
related APIs need to be evaluated by filesystem and namespace; external
utilities cannot be assumed. In Windows, the evaluation should include [Security
descriptors](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights)
and the other data supported by the filesystem.
[`fs.copyFile`](https://nodejs.org/api/fs.html#fscopyfilesrc-dest-mode-callback)
does not establish the full contract required here. None of these references, in
isolation, proves authorization, full preservation or security in the face of
competing changes. [manual
GNU](https://www.gnu.org/software/coreutils/manual/coreutils.html), `cp -a` e
`--preserve=all` may not signal failure while preserving xattrs. A success
status of these commands does not confirm the copy of the metadata.

An isolated test on macOS ARM64 copied metadata between two synthetic files by
descriptors: a ACL The helper was compiled only in the temporary directory of
the test and does not integrate the package. This result does not confirm the
effective permissions, all metadata, other filessystems or platforms. A second
prototype Node-API was loaded by Node 24 and 26 in the same macOS and copied the
same types of benign metadata between synthetic files. It also remains temporary
and does not prove distribution, authorization or security under competition.
APFS, the copy of ACL benign and xattr preceded the replacement of a synthetic
file with new bytes; both remained in the observed result. Mode, UID e GID only
coincided in fixture. This proof does not establish authorization, durability or
preservation of all metadata. ARM64, another prototype Node-API copied an
attribute `user` synthetic in tmpfs with Node 24. This test does not cover ACLs,
other namesspaces, filesystems, architectures or integration.
In `overlayfs` Linux ARM64, a proof copied ACL benign and synthetic xattr
between files, with independent comparison during copying. ACL He's back.
`ENOTSUP`; in musl, the library or its symbols became unavailable. The
demonstrative backup did not test restoration or prove authorization or secrecy.
`overlayfs` ARM64, a temporary addon copied a ACL benign and three synthetic
attributes for backup and for an updated file in glibc and musl environments. An
independent C reader checked the values and the ACL; addon itself checked the
names. Fixture in tmpfs failed to create the ACL, therefore did not test
fallback. Addon ignores other namesspaces and verification to refuse them
occurred only in the test; it is not integrated into the kit. This does not
prove authorization, actual recovery or integral preservation. A second version
refused a synthetic list with unsupported name before copying. The check of
values remained external and the destination was new; no other real namesspaces
or pre-existing attributes were tested in the destination. Another prototype
only consulted the size of the list of attributes accessible in
48 scenarios of an experimental package: 12 changes and 36 expected refusals.
Tests used ARM64 and x64, this under translation, in glibc and musl images; do
not prove native x64, support the ACL benign, hidden attributes or distribution.
In another test isolated in macOS ARM64, `fcopyfile` with `COPYFILE_CHECK` and
metadata returned zero and altered the synthetic destination: copied ACL or
xattr in the corresponding cases and modified the date in the simple case.
`copyfile` by paths indicated the metadata in these examples without the same
change observed. Do not use the variant by descriptors as read-only query based
on this flag; confirm system and filesystem behavior before choosing an API.

`stat`, hash or identity followed by `rm` or `rename` are not replacement or
atomic conditional removal of a name; hardlinks and descriptors do not close
this window. The project must register start and end receipt in unique and
distinct names, without overwriting or deleting by name after checking, and
treat ambiguous publication and incomplete receipts as pending.

Before implementation, review and decide the cooperative coordination protocol,
detection and resolution of abandoned lock, publication and validation of
records and explicit resolution. Coordination does not block editors. Set
private location, behavior for project root still nonexistent, and stage in the
same file system, including `EXDEV` and Windows limitations. Do not assume that
checking and then removing a lock by name is safe.

Sort all commands and direct entries by their effects, including `tools`, which
forwards arguments to another process. A to-do should prevent the changes
covered by the protocol; secure queries must work even partially. `dry-run` when
it is not possible to build a reliable plan and how to prevent a new command
from ignoring the classification. `recovery-effects.mjs` classifies options of
CLI as consultation, planning, mutation, opaque or not supported; `tools` It is
always opaque. It does not consult the journal or block actions. Before
integration, it is not necessary to ensure that the classification corresponds
to the options executed, cover the direct sync and define the treatment of
queries with partial status. A planning classification does not prove no effects
on temporary files. Test process interruption separately from energy loss and do
not assign durability to a platform just because it exists `fsync` Node.

To examine the mode at the time of the creation of temporarys: in the previous
implementation of the sync, the writing occurred before `chmod` and a permissive
mask could temporarily expose the content. `error.message` to prevent sensitive
content from appearing in diagnostics. Prove both with synthetic fixtures;
static analysis alone does not prove exposure on all machine. `umask 000`
observed mode `666` in previous implementation for a destination `600` in macOS
and Linux; there is no proof of access to real data.
`tests/sync-temporary-privacy.test.mjs` treat this case for existing files in
POSIX; creating new files, Windows and ACLs require own analysis. This does not
complete the broader requirement of AC-007.

Do not follow symbolic links out of destination. Set how to represent links,
hardlinks, special types and unsafe ancestors in backup; refuse before mutation,
with diagnosis, which cannot be handled safely. A concurrent exchange during
capture remains out of warranty.

An investigation in `tests/recovery-plan-coverage.test.mjs` compared a catch
candidate with Node calls observed in init fixtures, migration and obsolete
removal. `plan.changes` does not cover directories; the candidate is a test
approach, not a production implementation. A missing root and the complete plan
prior to writing direct sync still require solution. The proofs only cover the
path of success, Claude and Codex clients and synchronous calls instrumented on
macOS and Linux. They do not check actions and types against each input,
internal system calls or subprocesses. The root creation calls themselves are
identified, but stay outside the candidate: their previous state needs to be
represented separately. The installer derives before applying the candidate
paths to pruning and uses these strings in execution, checking each directory
when it reaches it. This list is conditional and does not capture the previous
state, creations, migration, temporary or other effects; it does not authorize
removal or constitutes backup. It compares the candidates before writing, before
pruning and before rooting.
These verifications do not make the entire plan unchangeable or eliminate
changes between verification and operation; a delayed failure still uses the
existing rollback. Normal plans use arrays; external plans accept arrays or Set
for removed roots. Other iterables are rejected before backup because they may
not allow repeated comparisons. Sync shares an internal sequence of logical
actions between path verification and execution. Each script contains a lexical
string of candidate parents, consulted again at the time of creation; it does
not capture state or identity of directories. Temporary, backups and rollback
effects stay out of this sequence, which is not a complete recovery plan. An
internal inspection in query mode presents this sequence without file content.
Fixtures with inert callbacks compared creation, update and removal actions with
observed calls; callbacks, subprocesses, temporarys and faults are out of this
coverage. The inspection includes paths and hashes of observed or `null` for
absences. These values serve
the diagnosis and may be outdated; other types are flagged as unsupported. The
inspection does not authorize the operation or replace backup.
`tests/fixtures/recovery-capture.mjs` captures the paths and their ancestors in
an existing real root, compares expected hashes and refuses links, shared
hardlinks and files changed during reading. The tests compare it to the
candidate of init, migration, removal and logical plane of sync. The
installation capture evidence passed on macOS and in Linux container ARM64;
Windows has not yet been checked. It does not determine the full effects, does
not capture ACLs or extended attributes and does not make the atomic query; it
is not distributed or used by the installation or sync. In a directory exchange
by link before opening, fixture refused the different identity before reading
the bytes. The path opening can still reach the external destination. `lstat`
the file can also allow external reading before detection; the strict proof
covers this gap. These results do not allow integrating the component.
A separate experimental inspection describes the missing root, missing
components and the identity of the existing ancestor without creating
directories. Fixtures on macOS and Linux detected a observed concurrent
creation; inspection does not reserve names, is not atomic and is not yet linked
to the backup manifest. Another isolated proof used `openat` by descriptor on
macOS and Linux ARM64: refused static links and in the final file and read the
directory originally opened after an ancestor swap. The proof does not
demonstrate containment after renaming, metadata protection, Windows
distribution or compatibility; no experimental binary integrates the package.

An isolated variant interrupts the restoration after publication and passed ten
preservation scenarios on macOS. The complete strict suite still had three
flaws: two in temporary cleaning and a fixture requiring restoration. Without
diary, a second installation continued on the partial design. With an
experimental diary and synthetic manifest, the second installation was blocked,
but the direct sync still ran. The variant does not prepare backup checked, does
not integrate the two entries and does not authorize a release. A second
isolated proof linked a real backup of 781 entries to the beginning of the
journal and checked the previous bytes of `AGENTS.md`; the next attempt was
blocked. Reserved after the old backup had created an extra backup in the
blocked attempt; while anticipating the reserve, this did not occur in fixture.
The test covers an init in macOS, does not prove full capture, safe directories,
sync, interruptions or Windows. The variant continues outside the product. In
the same fixture, two unactioned updates initially produced new records; an
experimental selection left the generation intact and still refused
an update without actions when there was already pending. Selection does not
cover all possible effects and requires revision before integration.

Specify the order and persistence of backup/manifesto, start, mutations and
receipt, using `fsync` when available and registering support and file and
directory failures. Differentiate process interruption and power loss; do not
promise unproven durability. These details, as well as the resolution form and
reconciliation of the historical contract, still need to be defined and
verified.

## Acceptance criteria

- **AC-001:** After failure to create, update or remove, including ambiguous
  publication, there is no automatic mutation of public paths in the installer
  or sync.
- **AC-002:** Human substitutes of equal or different bytes survive within the
  limits of the old recovery; bytes, mode and identity are preserved when
  verifiable, and affected or uncertain paths are informed.
- **AC-003:** Backup and manifesto cover preexisting, removable, state, modes
  and absences before the first public mutation; failure of preparation prevents
  it.
- **AC-004:** After registration, failure, interruption or invalid receipt
  leaves detectable pending and blocks mutations in both entries until explicit
  resolution; queries and diagnosis remain available.
- **AC-005:** Human outputs, JSON and direct sync inform cause, partiality,
  paths, backup and recovery, without content or secrets, with truncation and
  failure exit.
- **AC-006:** Recovery does not change partial status or migration, directories,
  index and Git configuration, nor does it use partial status as completion
  proof.
- **AC-007:** Backups and temporarys serve the verifiable privacy of the
  platform; cleaning failures are informed without destroying public
  substitutes.
- **AC-008:** Documentation describes manual review, partial design, privacy and
  real limits of competition and durability.
- **AC-009:** Relevant returns and evidence on supported platforms pass;
  historical tests are adapted without removing protection from human content.

## Verification plan

Additional methods below are proposed to confirm before approval. Use synthetic
fixtures and versioned test code; store logs without secrets in
`.agent-tests/recuperacao-conservadora/<execucao>/`Each acceptance requires
proof approved; all are pending.

- **AC-001 — hanging:** Tests track mutator calls after update failure in
  installer and sync. In macOS and Linux, the sync case recorded removal calls,
  writing and mode change of note; failure with current code. Zoom in to create,
  remove and publish ambiguous on both entries; tracking only covers
  instrumented APIs and does not prove absence of other mutations. Proposed
  evidence: `operacoes.log`.
- **AC-002 — hanging:** With Node 24+, run the command below. Six additional
  cases exchange content after posting and before recovery, without depending on
  a removal, and confer bytes, mode and identity. Extend the proof to other
  types of change and failure points. Proposed evidence: `concorrencia.log`.

  ```sh
  ADK_STRICT_RECOVERY_TEST=1 node --test tests/concurrent-recovery.test.mjs
  ```

- **AC-003 — hanging:** Proposed tests of backup/manifesto, with flaws in each
  step. Use fixtures with files, directories, state, absences, links and special
  types; require safe backup or refusal before public write. Evidence:
  `backup.log`.
- **AC-004 — hanging:** Proposed tests of interrupted subprocess and two
  cooperative processes, using CLI and direct sync. Start, migration, partial or
  ambiguous receipt and abandoned lock keep lock; explicit query and resolution
  work. Include commands sent to subprocesses and ensure that new commands do
  not escape the classification. Evidence: `pendencia.log`.
- **AC-005 — hanging:** Proposed tests of CLI ed PT/EN/ES, human `--json`, and
  direct sync. Verify original error and orientation, without bytes or synthetic
  secrets, and limits and correct codes. Evidence: `diagnostico.log`. A local
  increment informs backup paths known as uncertain and advises review possibly
  incomplete copies. Fixtures exercise immutable error, grouped cause, output
  JSON and direct sync, including failure in the private stage. This does not
  prove all languages, outputs, failures or general absence of sensitive
  content; the criterion remains pending.
- **AC-006 — hanging:** Migration and failure tests with Git repository and
  staged index. Compare bytes, modes, directories, index and configuration
  observed after failure; no auto restore. Evidence: `estado-git.log`.
- **AC-007 — hanging:** Mode tests, ACL or limitation declared on each platform,
  with cleaning failures. Check permissions since creation, including with
  `umask` Permissive, informed waste, preserved data and substitutes and limits
  of ACL and recorded durability. Evidence: `privacidade.log`.
- **AC-008 — hanging:** Revision of guides and messages PT/EN/ES against the
  scenarios executed. Manual recovery and limits correspond to proven behavior.
  Evidence: `documentacao.log`.
- **AC-009 — hanging:** Relevant tests, project suite and IC on Linux, macOS and
  Windows, with independent review. Regressions and platform cases pass without
  concealing flaws or eliminating human protection. Evidence: `regressoes.log`.

### Reproduction before integration

In the previous round, eleven strict portable tests failed: eight play creation
and upgrade substitutions in the installer and sync during rollback, two test
temporary cleaning after successful publication and a track of installer calls
after failure. A later test also observed sync calls after failure, on macOS and
Linux. Losses were reproduced on these systems. The strict test also includes a
creation out of the project for concurrent replacement of backup ancestor. It
also fails on macOS and Linux and requires separate recovery treatment. In the
isolated backup helper, another fixture changed the blob directory by a link and
observed out-of-root creation before error. Helper presupposes reliable and
stable ancestors and is not connected to the installer or sync; this
presupposition needs to be treated in integration. Four native metadata tests
fail on macOS: ACL and extended attribute in installer and syncer. They are
ignored on Linux. Separate proofs also detected loss of xattr when updating
`AGENTS.md` by the installer and catalog by the sync in container
Linux, Node 24 and tmpfs. Backup `AGENTS.md` also lost the attribute; the
evidence does not prove ACLs or other file systems. Another strict proof
rewrites the backup after its conference by hash and also fails on macOS and
Linux; the verification is not atomic with a competing writer. ACL negating
writing can be circumvented by `rename`: the installer and sync changed the file
and lost the ACL, although an opening for writing has failed. `uchg` blocked the
target replacement in fixtures, but does not guarantee that there are any other
partial changes. An experimental attempt to copy by descriptors preserved some
metadata, but allowed to bypass the ACL and did not protect the publication
against exchange of ancestor; it is not an integrated or validated correction.
`init`, `update` with synthetic legacy and `sync`, require refusal related to
the target protected by ACL or `uchg` and compare the state observed at the end.
In the initial diagnosis, they failed in strict mode and were TODO in default
mode. Current fixtures run in macOS. Snapshot
excludes `.agent-tests` and does not detect reversed transient changes. An
experimental copy opened, without saving, existing files scheduled for update
before mutations. ACL e `uchg` They passed on macOS, but three historical tests
failed to reach the rollback of files `0444`, both in macOS and in
non-privileged Linux. The experiment does not check removals, does not preserve
ACLs or attributes and does not close races; has not been integrated. The policy
for read-only files and the coverage of rollback tests need to be reconciled
without eliminating the existing evidence. In another fixture macOS, one ACL
that denied only append allowed the scan and experimental update, but no longer
exists in the resulting file. This does not prove the behavior of other ACLs or
filessystems. Two regressions in the current product also reproduced this loss
in the installer and sync; the native gate requires safe preservation or refusal
before accepting a release. The initial diagnosis logs record playback. The
current gate executes the applicable fixtures and requires native proofs before
release.
A static review independent of excerpts and the two specs recommended adding
negative control to the oracle, testing backup and incomplete records and
explicitly reconciling the historical contract. These recommendations require
implementation and proof; the review did not execute the code or approved the
delivery.

## Impact on documentation

Review [installation](../../guides/installation.md),
[troubleshooting](../../guides/troubleshooting.md), [CLI](../../guides/cli.md),
[direct sync](../../kit/scripts/sincronizar-agentes/README.md),
translated messages and other documents affected by the final contract. Register
the decisions per file in the delivery review; update indexes and roadmap as the
project stream.

## Dependencies of other specs

- [v0.0.8](../v0.0.8/SPEC.md): approved historical contract requires automatic
  restoration and AC-002 without partial recordings, incompatible with this
  proposal.
- [Status Folder](../state-directory/SPEC.md), [secure
  sync](../safe-synchronization/SPEC.md) e [discovery and
  preservation](../discovery-preservation/SPEC.md): preservation, migration and
  reconciliation also need to be verified in this change.

### Reconciliation proposed

In the future version that implements and proves this spec, its failure contract
will replace only the automatic restoration and absence of partial own
recordings required by v0.0.8. Historical spec remains record of the contract of
that version; this proposal still does not change the behavior delivered.

The remaining guarantees continue: preserving human content, index and
configuration Git, `.gitignore` and protection of collisions, including with
`--force`; preserve modes and metadata for effectively supported operations.
Historical tests requiring rollback need new expected results and evidence of
preservation and diagnosis, without removing the coverage of human content.

After failure, observed human content remains protected, but state and migration
files themselves may be partial. Do not interpret them as completion. In
successful operations, the pruning remains limited to proven property outputs
and state reconciliation remains mandatory. After failure, do not perform
pruning or automatic restoration of public paths; reconciliation remains pending
from explicit review and resolution.

Prior to a transition, guide the interruption of other writers, including old
versions and suspended processes, and the state review. Implementation must
block the mutation when it cannot prove the conditions it requires for a safe
transition; it must not claim universal detection of ancient writers nor that a
record alone prevents the resumption of a suspended process. Protocol and form
of resolution still need to be defined and tested.

## References and approval

[PRD](../../product/prd.md), [UX/UI](../../product/ux-ui.md) e
[design](../../product/design.md) are listed as approved;
[roadmap](../../product/roadmap.md) records recovery as pending and separates
competition during application. `.pbai4devs/state/configuracao/ESTADO.md`
records local preparation and technical configuration completed, with product
failures still open. After correcting the path of specs, the local documentary
inspection ended without notices and with `scan.complete: true`; the inventory
does not replace reading or approval.

This spec is in draft: technical review and decisions remain pending. The
general authorization already granted by the user does not replace the proof of
decisions or alter the historical contract by itself.

[reading-pt]: ../../../specs/recuperacao-conservadora/SPEC.md
[reading-en]: SPEC.md
[reading-es]: ../../../es/specs/recuperacao-conservadora/SPEC.md
