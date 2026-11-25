---
description: "Task group for AgentDevKit evolution and delivery."
status: em andamento
language: en
---

# Development of the platform

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

This group brings together the requests for progress; see [group
list](GRUPOS.md) for priorities and follow-up. Mark each item completed only
after implementation and validation; preserve existing files and settings.

## Current Validation

- The first complete pipeline group in macOS passed: 37 tests.
- The next group found already pending strict failures in recovery, backup, and
  metadata. Execution was interrupted after identifying them; cancelled tests
  are not product failure results.
- The full profile was reordered to perform strict recovery first, keeping the
  other mandatory suites after it. The current strict suite in macOS ended with
  21 approved, 17 failed and three ignored; the following groups were not
  executed. The 32 tests of pipeline logic passed on macOS and Linux. The
  removal failure suite passed with 31 tests on macOS and Linux after the
  restoration stopped erasing the file before preparing the previous copy. The
  change reduces a loss in recreation failure, but does not resolve the
  replacement races nor the rest of the gate.
- Sync rechecks the backup content after adjusting timestamps and interrupts the
  operation if it detects change in content or access time. The editing scenario
  at this stage passed on macOS and Linux, as well as a test that simulates
  change of time. Linux uses read without access update; verification may refuse
  files or systems that do not allow it. Verification is non-atomic and does not
  resolve the change of ancestors or later editions; Windows and other
  filessystems remain unverified. A test confirmed that refusal to read without
  updating access interrupts sync and preserves backup in revision on Linux.
- An independent review indicated possible legitimate refusals in volumes that
  update access hours or deny `O_NOATIME`. The Linux rereading started to open
  the descriptor before applying restrictive copy permissions: in fixture with
  different users, the file backup readable only by the group was produced with
  the original mode before the later protection. The complete sync of this
  scenario is not yet supported: now it is refused before writing to avoid
  replacing a file with another owner or without reading from the owner. Another
  test revealed that planning can change an old access schedule before backup;
  this preservation also remains pending. There is no Windows proof.
- A CLI and the direct sync check owner POSIX in planning and before applying.
  In a Linux fixture with different users, both refused the operation and
  preserved the content and index; a simulated test also covered change after
  planning on macOS and Linux. This does not prove group preservation, ACLs,
  simultaneous changes or support on Windows.
- An independent review pointed out that the sync rollback removes a file before
  recreating it. A synthetic test confirmed, on macOS and Linux, that a
  recreation failure may leave the path missing. Regression is in the strict
  group; still lacks to fix recovery without overwriting other content. An
  attempt to prepare the copy and rename it was discarded: tests showed
  regression in preserving files created during restoration.
- The normal path of `sync --force` has now an active test: the previous copy of
  the catalog was checked on macOS and Linux, with index, Git rules and human
  file staged and unstaged preserved. It does not cover failure or competition.
- In installation and sync, a temporary name change detected before cleaning now
  interrupts the operation and preserves the replacement. The test passes on
  macOS and Linux. Another strict test reproduced the loss when the exchange
  occurs between verification and removal: the protection remains partial and
  non-atomic.
- In macOS, 25 protection tests confirmed the cases covered by refusal in the
  face of ACL or extended attributes. An isolated experiment with `cp -p` It
  preserved a ACL and a synthetic attribute, both by nominal origin and by a
  inherited descriptor; rewrite the first copy kept the metadata. The experiment
  did not execute the kit nor proved security against competition, arbitrary
  metadata, recovery or portability.
- A directory reference proof after renaming worked on tested Linux and returned
  `ENOENT` in the macOS tested, it was not integrated into the product; it does
  not prove protection of ancestors or compatibility with other environments.
- In the router, index, `.gitignore`, configuration and Git exclusions kept
  previous hashes; the candidate installation still has conflicts and is not
  ready for publication as correction of these cases.
- The candidate began to treat a structural barrier in Claude rules as conflict
  in updates, preserving the reason for the path. `doctor`, `update` e `--force`
  with unmanaged link and Git staged. The initial installation maintains the
  additive behavior; this does not solve the migration of other conflicts nor
  proves security against competition. The Claude suite passed macOS (37 tests)
  and Linux (36, one ignored). The candidate diagnosis on the router still
  returns pending.
- A human directory in the name of a Claude rule before caused generic error in
  planning. The candidate now records the preserved directory and blocks the
  update; `init` continues adding the kit without removing its contents. A
  fixture also checked the case of human file in place of the ancestor. Claude
  and coexistence suites passed macOS (52 tests); on Linux, Claude suite passed
  with 39 tests and one ignored. A previous execution was discarded by matching
  the code editing during the test.

## Application map

The messages were consolidated by subject, including decisions that replaced
previous requests. [roadmap](../../product/roadmap.md) maintains the history of
deliveries; the items numbered below record the progress of this review. A
documented or published feature still needs the evidence indicated. [inventory
by resource](VALIDACAO-RECURSOS.md) shows the individual proofs recorded and
those that are still missing for the version `0.0.21`.

- **Project security:** Additive integration, collisions, migration, recovery
  and competition; preserve Git files, index and configuration. `.gitignore`
  root belongs to the project. See items 1, 9 and 10.
- **Structure and customers:** maintain `.pbai4devs` as origin; select customers
  and generate their notes, without replicating tools, scripts or templates.
  Validate customers and native resources, including Copilot and Antigravity.
  Items 9 and 10.
- **Workflow:** guide configuration, product, UX/design, architecture, roadmap,
  specs and implementation in this order; gather doubts before plan and check
  criteria for acceptance. Do not invent product content. View continuous
  evolution on roadmap.
- **Experts and quality:** evolve architecture, backend, frontend, QA, security,
  review and performance; use subagents when available and proportional adverse
  tests. See items 2, 6 and 9.
- **Tools and tests:** check auto installation of Node missing and installation,
  update and validation of tools in a system command; standardize browser or
  desktop evidence when applicable. Versify tests and recipes; ignore results,
  box variations `.playwright*` and clones or temporary projects. See continuous
  progress on roadmap.
- **Distribution and IC:** validate package and metadata, public npm and GitHub
  Packages, useful installers, releases and tags of the same version; test IC on
  Linux, macOS and Windows. Post in both registers after gateways and validate
  installations. See items 4 and 8.
- **Documentation and community:** maintain README, wiki, guides, examples,
  issues and current links; document commands and preserve human authorship of
  commits. Validate Markdown with frontmatter suitable for type and lint. See
  items 3, 5, 7 and 8.
- **Router application:** validate the installed version and commands without
  changing human files, index or `.gitignore`; apply new versions only after
  proof of preservation. See items 1 and 9.
- **Local operation:** investigate unwanted OpenCode sessions or loops and
  document manual removal when identified; do not create schedules without
  request.

## Walking and evidence

1. [-] **Preservation and migration:** complete the tests and fix directory
   migration and error diagnostics without deleting data or changing the index.
   Bit checks POSIX specials passed on macOS and Linux; extended attributes
   protection and behavior in the face of competing changes are still in
   validation. ACL the test was not detected by the attribute verifier; on
   Linux, the loss of a synthetic extended attribute was reproduced. ACL in
   update on macOS and concurrent recovery failures; an independent test
   observed loss of extended attributes on Linux. The attempt stopped after 42
   failures; the tests or fixtures of 24 cases were adjusted and verified
   separately. `update`, sync da CLI
   and direct sync: on Linux, the three lost a synthetic xattr; on macOS, the
   Three lost one. ACL benign. macOS refused the same operations with xattr
   present, preserving it. Index, Git configuration and human files
   compared were preserved; there is no proof for all metadata.
   A versioned regression test reproduced the loss in direct sync on Linux
   also with normal LF endings and staged file: confirmed the attribute before
   and after preparing the index, but did not find it after synchronization.
   test fails until sync preserves the attribute or refuses without changing the
   file; in macOS it is ignored for being Linux specific. Execution
   used local package with the same hash as the checkout sync script;
   does not prove equivalence of the other files in the package.
   An experimental Linux query uses `getfattr` to list names without getting
   values. In Debian container identified a xattr and a ACL POSIX test;
   without the tool returned unknown state. It still does not block or
   protects operations: there is no coverage of namespaces and permissions,
   environments
   without the tool, competition and integration with all writing points.
   Later partial protection: planning and application of CLI and sync
   direct refuse to replace regular files with attributes that
   `/usr/bin/getfattr` can list. CLI inform the
   lock. On Linux with `attr` installed, fixtures confirmed preservation
   files with xattr; without the tool or with unlisted attributes,
   the protection is not proven and the replacement can still lose data.
   In order not to present this gap as verified, CLI and sync straight now
   warn when there are existing files planned without conclusive inspection;
   the warning also appears in the application, which is still allowed.
   tool confirmed warning and preservation during check, but no
   demonstrate security of later writing.
   With `getfattr` available, a control added the attribute after plan;
   the application detected it and refused to exchange, preserving the file.
   also confirmed that the diagnosis does not expose the name or value of the
   attribute and
   that inconclusive warnings are available in Portuguese, English and Spanish.
   A CLI and the direct sync recheck listable attributes immediately
   before replacing a file on Linux. Fixtures with `attr` They've confirmed
   refusal and preservation of added value after initial verification.
   there is a window between this query and the exchange, and cases without tool
   or
   with unlisted attributes follow without proven protection.
   The same revalidation was added before removing regular files.
   Two Linux fixes with `attr` confirmed refusal and preservation of value
   when the attribute was added after the initial inspection; the 27 tests of
   removal failures passed on macOS and Linux.
   Inconclusive inspection cases remain pending.
   The removal of references by sync is no longer recursive: a fixture that
   exchange file for a folder with human content at the time of removal
   Now preserves the folder and index. The removal failure suite has passed with
   28 tests on macOS and Linux. Other competing exchanges are not covered.
   In restoration after failure, sync stopped removing folders recursively and
   started to recreate files exclusively. Fixtures preserved file
   and human folder created during rollback on macOS and Linux, informing the
   error and path to revision. Writing and permission use the descriptor
   open, with identity check; another fixture preserved a file
   They passed 31 removal tests and seven recovery tests.
   related to each system. Other competing windows are still open.
   The documentation of
   [`listxattr(2)`](https://man7.org/linux/man-pages/man2/listxattr.2.html)
   informs that inaccessible names can be omitted.
   corrected: empty list also returns unknown, never absence
   proven. A non-empty listing indicates only observed presence.
   In a Linux fixture, written in the same inode preserved xattr and ACL
   observed, as well as the bytes of the Git index. However, an interruption
   simulated after partial writing left incomplete content.
   reproducible in `tests/linux-inplace-metadata-experiment.test.mjs`; it's not
   used by the product and does not prove recovery, competition or durability.
   A directed repetition of two strict tests failed both in macOS
   and on Linux: the exchange of a backup ancestor created file outside fixture,
   and a backup edit between verification and timestamp adjustment does not
   These failures block the safe validation of the operation.
   An additional static review identified that cleaning after publication
   exclusive can remove a human substitute in temporary name. Compare
   inodes before removing does not delete the concurrent window; correction
   requires
   a border of ownership and diagnosis of waste.
   repeated the strict proof nor demonstrates an implemented solution.
   An experimental variant preserves uncertain paths for revision after
   failure after a publication, instead of restoring them automatically.
   In each system
   macOS and Linux, passed four synthetic failure controls and two flow
   normal. You can leave the operation partially applied; it does not cover
   creation
   previous backup and was not demonstrated against competing exchanges.
   variant remains isolated and requires definition of the recovery contract.
   A separate correction informs the preserved temporary when cleaning fails
   with frozen error, keeping cause and code. Synthetic tests cover the
   installation flows, sync and internship; the directed suites passed with
   86 tests on macOS and 86 on Linux. Pipeline ranking passed with
   32 tests on each system. Messages and paths of errors still have no proof
   general sanitization. This correction does not solve the race or has been
   validated
   on Windows. A local package contains the two corrected files with bytes
   same as checkout; this comparison does not test package installation.
   The infrastructure executable refused static symbolic links at the origins
   and exits and started to create exclusive reports by execution.
   previous overwrite a log outside fixture through a link; new
   controls passed on macOS and Linux, and a local package preserved the
   destination
   external, previous report and index observed.
   the report and the limits for competing exchanges are documented.
   In a Linux run of the isolated package, 12 suites returned zero code and
   sync failed in case of `autocrlf` staged. Code zero not
   A first attempt with checkout.
   read only had additional environment failures; the repetition used Git
   itself and did not load the incompatible local machine tool.
   A later directed execution on macOS also failed in this case: after
   exchange LF for CRLF, the reference diverged from the registered hash and
   sync refused
   the update as own content. The comparison of the index recognizes CRLF,
   But that's not enough to prove the property of the reference.
   was then applied to the development copy: requires identical hash after
   normalization and compatible Git attributes without running filters. The 30
   tests
   preservation passed on macOS and in Linux container, including index
   staged, human edition, filter and conversion disabled.
   sync on macOS was repeated after an additional adjustment that limits this
   equivalence to active references update: had 358 approvals and
   two tests ignored. After the adjustment, 31 preservation tests passed
   on macOS, Linux and the extracted local package; the obsolete reference
   converted has been preserved. The complete gate, Windows and
   validation of the published package or a new version.
   A later control set up a synthetic Git filter: synchronization
   did not execute it while the `git add` from fixture itself executed it.
   control passed on macOS and in Linux container. `check` e a
   application also preserved index, state and bytes in front of filter,
   human change or deactivated conversion in the same systems.
   **Correction withdrawn:** the subsequent review identified that the update
   CRLF integrated did not protect extended attributes on Linux, a limitation
   already
   observed in the previous experiment. sync again refused this update;
   the positive test of `autocrlf` again failed on macOS. A new control
   Linux confirmed that the refusal preserves bytes, index and a synthetic
   xattr.
   Previous success results describe the withdrawn variant, not the
   current implementation. It is necessary to resolve metadata protection before
   to re-enable the update.
   A later variant enables equivalence CRLF only in macOS, for
   active references whose standard hash and Git attributes are compatible.
   The cleaning of obsolete references continues to require exact bytes.
   in the macOS cover staged index, filters, human edition and refusal in the
   face of
   ACL or xattr; Linux protection and full operation remain pending.
   **Variant withdrawal:** a later control showed that she accepted CRLF
   even with `eol=lf`, which requires LF at checkout. Also, standardization for
   the index does not distinguish a human edition from a checkout conversion.
   The sync has again preserved divergent bytes; the automatic update of the
   case CRLF equivalent continues to fail and requires solution without data
   loss.
   Direct check now identifies `line-ending-diverged` when only
   standardisation CRLF corresponds to the record, without authorizing the
   writing.
   in macOS and Linux cover the human edition, UTF-8 invalid and LF checkout;
   the known update cases CRLF and loss of xattr were excluded.
   the respective expanded executions and remain pending.
   When reference CRLF already coincides with the expected output after
   normalizing
   line endings, CLI and direct sync begin to preserve it without doubling the
   pointing or adopting your bytes. The test covers two synchronisations and one
   later description change in macOS and Linux; this does not solve the
   update of the divergent derivative record nor the protection of xattr Linux.
   A review found that the source of this reference could change after
   plan; the application now revalidates the reference and its source in this
   scenario.
   macOS and Linux tests confirmed refusal of sequential changes after
   plan, with the human bytes and Git observed preserved.
   protection against all races during application.
   A synthetic font change during backup creation was also
   refused on both systems; edited file, index, observed state
   and the signaled backup remained available for review.
   The main suite of the CLI in the current candidate had 29 approvals in macOS
   and
   27 on Linux, with two macOS specific skips. An offline preview of
   package included license and README and did not include caches and results of
   verified test; does not prove absence of any private data or publication.
   The suite expanded in macOS passed with 362 tests and six specific skips of
   other platforms. An intermittent failure in positive filter control
   it was corrected using explicit renormalization; the repetition passed three
   times.
   In the subsequent synthetic update of `0.0.21` published for the candidate
   local `0.0.30`, eight out of nine operations `update` they returned success
   and the
   fixture Claude refused eight conflicts. `sync --check`
   They signaled unverified ignore coverage and ignore legacy.
   old has changed `info/exclude` in the nine fixtures; the human ways and Git
   observed remained the same during the update and subsequent consultation.
   In fixture Codex with CRLF staged, the updated version kept the content
   indexed as prefix after normalization and added a block; this did not
   demonstrates that the new equivalence branch has been used.
   full history, all metadata or native activation.
   In a copy of fixture Codex, disable only the legacy marker preserved
   the rules and the check passed with the coverage notices still present;
   query preserved the observed Git files. An isolated test confirmed
   on macOS and Linux that these warnings do not block, while the legacy marker
   blocks. No actual project rule has been changed.
   The xattr test accepts an update that preserves the attribute or a
   recusa sem alteração, sem exigir recusa permanente. Após essa revisão, a
   preservation suite in macOS recorded 30 approvals, a failure of
   `autocrlf` and a specific Linux skip; the same failure occurred on Linux.
   The current runner ranks by the output code and can call success a
   suite with ignored tests. An experimental reporter distinguished results
   partial and file without observable tests, but the release pipeline still
   It doesn't consume that state and it could approve it.
   and ALL needs to be integrated and validated before adopting the prototype.
   Two pending tests now show on macOS and Linux that the runner marks
   how `passed` both a skip-only suite and a non-test file
   declared. Node 24 also counts the empty file as an approved test;
   therefore, counting tests and checking zero code does not solve the gap.
   two tests were marked as TODO and failed in their assertions.
   A later implementation classifies as `partial` skips, ALL and
   no declared tests, and command returns error for result
   Partial. Passed 15 controls on macOS and Linux, including simulated output
   evidence and filter option inherited. Policy still treats any skip
   as partial, including those expected by platform; lack integration with
   the release policy, analysis of reliability of events and Windows.
   The report began to record the identity and motive of the skips observed,
   with path relative to the project when available. The 16 controls of
   executable passed on macOS and Linux container; this still does not approve
   automatically no skip nor proves the full IC matrix.
   Two offline executions of local package extracted in Linux container had
   nine full suites, three partials and one synchronization failure.
   skips identified in the three partial suites were CLI not of skills
   prepared, missing package development runner and missing Compose;
   the suite failed also recorded the test of aliases. 8.3 Windows exclusive.
   This characterizes the container package and environment, not the IC
   checkout.
   Independent review identified two defects in the collector of this execution:
   Node 24.13 does not provide `entryFile` in test events, and closure
   early with zero code could seem successful.
   require summary of input file and was tested with normal execution,
   imported, empty and interrupted. The 20 controls passed macOS with Node
   24.13 and Linux with Node 24.22; the complete execution of the above package
   precedes
   other minors, Windows, skips identity
   and reliability of events still require evaluation.
   An ignored or pending group can also leave Node counts without
   skips or ALL. The classification began to consider the events of these
   groups; two controls passed macOS and Linux. The review also pointed out
   risk of ACL inherited for logs: on macOS the executable now refuses a ACL
   listed or unverifiable in the output directory before running or
   record. The test with ACL inherited passed; does not prove hidden ACLs,
   competing changes or other systems. The executor suite had 23
   macOS and 22 approvals on Linux, with a specific macOS skip.
   Another attempt to execute the package coincided with changes in checkout
   during packaging; its results do not validate a frozen version.
   A subsequent repetition used a local package whose SHA-256 remained
   `78bfd16d47e82a21c5bf65464e5697e36c21586026eadbbb20ed4a0a9a0d56cf`;
   executor, reporter and their test were compared to checkout before
   execution. On offline Linux, eight suites passed, four were partial
   and synchronization failed in case of `autocrlf`After packing,
   an additional test of ACL not verifiable passed macOS. The current suite
   It had 24 macOS approvals and 22 on Linux, with two macOS skips.
   independent evidence also observed that ACL of non-heritable father did not
   block
   fixture in macOS; does not show privacy in the face of simultaneous changes.
   A later control simulated query failure after suite: the executor
   refused to record the log or report and preserved the index in fixture macOS.
   This does not prove protection against changes after the verification itself.
   this control, the executor suite had 25 approvals in macOS and 22 in the
   Linux, where three specific macOS tests were ignored.
   An isolated Linux proof with `cp` and synthetic metadata preserved ACL e
   She didn't run the kit or prove backup,
   recovery or concurrent changes, and does not allow to integrate the
   technique.
   In another filesystem, `cp --preserve=xattr` returned zero even without
   maintain ACL; with mode preservation and ACL, returned error after already
   create destination with content. Controls used synthetic files and
   do not justify treating the output code as proof of preservation or
   preservation of
   No writing.
   Another Linux fixture noted a ACL default in empty file created before
   the file was created by fixture, not by `cp`; therefore,
   this does not prove the internal sequence of the utility or effective access.
   The report identifies the specific combination of test, file and event
   Windows alias as expected on Linux and macOS, but keeps the result
   partial and do not assume running on Windows. The key does not itself prove
   the
   skip cause. Current executable controls registered 27 approvals
   on macOS and 24 on Linux, with three macOS specific skips.
   The classification also refused incompatible or non-compliant counts.
   approvals. With this adjustment, the controls had 28 approvals in macOS and
   25 on Linux, with three macOS specific skips; it is not about gate
   complete publication.
   In the offline Linux repetition with the experimental reporter, of the 13
   suites, nine
   were completed, three partials and one failed in case of `autocrlf`; a
   The partial result identifies the gap,
   But you still don't report the identity of each unknown test.
   A directed reproduction under the same conditions found four skips
   compatible with counts: CLI Unprepared skill, runner of
   missing development in the package, Docker Compose missing and test
   aliases 8.3 Windows specific. As the complete execution did not register the
   the identity of the skips, the reproduction does not prove which occurred in
   it.
   The IC `full` uses checkout, not this copy of the package: the absence of the
   runner
   development in tarball does not prove its absence in the IC, and the
   availability of tools in that environment was not confirmed.
   An isolated policy refused absent evidence, TODO and skips not approved
   in five controls per system on macOS and Linux.
   still does not link results to the process and the IC matrix and that the
   identity
   proposal can crash. It has not been integrated or validated in Windows; no
   It's a release.
   An additional proof connected the experimental runner to the profile `full`
   ed
   isolated copy: four controls passed on each of macOS and Linux,
   with the other simulated and unpublished steps.
   complete block normal releases because the Windows test 8.3 is ignored
   on Linux. The manifesto contract and its consumer also need
   coordinated change; a rule that hides skip has not been integrated.
   A later variant qualified the specific Windows skip 8.3 on Linux
   and recorded results `partial` in experimental manifest.
   current refused the manifesto; other profile groups still have no evidence
   structured skips. Controls passed 6/6 on Linux and 4 on macOS, with
   two Linux specific skips; the other steps were simulated.
   there was build, Actions or publication, and the variant was not integrated.
   Another copy also observed the groups Node and distribution: six controls
   synthetics passed on Linux and three of the observer on macOS.
   simulated; publication still partially manifestly refused, and evidence of
   The full release flow has not been proven.
   A later variant also recorded counts in approved results
   and repeated local builds with synthetic manifestos.
   Linux and 11 on macOS, with three skips; the publisher refused results
   Partial and legacy uncovered.
   consumers, skips policy and validation in IC and Windows; not authenticate
   the origin of the evidence and was not integrated.
   An offline control distinguished historical consultation from new
   publication:
   proposed publisher refused manifest legacy without coverage, while the
   The proposal maintains the consultation as not verified and
   requires new evidence to publish; does not change existing packages.
   An isolated evidence showed that an arbitrary message of cleaning failure
   can appear on the exit JSON the stage, including as a secondary failure of
   sync. A localized correction replaced the secondary message in
   stage diagnosis, maintaining code, path and cause of synchronization;
   the controls passed 11/11 on macOS and Linux. The final removal of the stage
   when it is primary failure also received fixed message, preserving code and
   cause in API; the message of its own API Switches to fixed text. Suites
   related have passed 17/17 on macOS and Linux. A later local package
   included the source with equal bytes and, after extraction and copy of
   fixture, passed
   the six controls of the final removal in macOS; it does not prove
   publication.
   In the installer rollback, secondary messages are no longer included
   in aggregate detail and in `cleanupFailures` CLI Controls API, JSON e
   text passed on macOS and Linux; a API preserved primary cause and error
   secondary in the aggregate, and the paths observed remained available.
   The projection JSON uses the same text for all cleaning faults and loses
   secondary details; primary errors and paths may still contain data.
   In the repetition of the five related suites, macOS had 247 approvals and
   a skip; Linux, 246 approvals and two skips. No tests were performed
   Windows doesn't even complete the pipeline in this repetition.
   Sync rollback aggregate also stopped concatenating messages
   secondary, keeping the objects in the API; targeted controls have passed
   in macOS and Linux and in local package extracted in macOS.
   synchroniser and other outputs still require revision.
   remove the stage after a sync or callback error
   output is available at API on non-numerable property `cleanupError`,
   without replacing the primary cause; other branches do not yet have this
   field.
   The two cleaning suites passed 23/23 on macOS and Linux; six controls
   they also passed in local package extracted in macOS, with test copied after
   the
   The property is explicitly accessible and is not a secret.
   The same field began to conserve the secondary failure when the origin is the
   output check callback. Three related suites passed 45/45
   on macOS and Linux; after reinforcing the comparison of paths, the two
   controls
   callback passed again in both systems and in local package extracted
   on macOS. Windows and frozen secondary errors in this branch were not
   tested.
   The planning now records the occurrence of faults regardless of the
   value released, and uses `Object.is` to correlate sync error in 55
   synthetic controls by system, including `undefined`, `null`, `false`,
   zero, empty string and `NaN`, the failure was reported and the residue
   observed was
   preserved when cleaning failed. This does not prove the natural occurrence
   these values or behavior in Windows.
   An expanded execution of six files recorded 329 approvals and a skip
   on macOS, and 328 approvals and two skips on Linux. Later, 24
   controls directed to simultaneous failures passed in each system;
   the enlarged suite was not repeated after adding these controls.
   A Control of API `applyPlan` showed that a valueless synthetic failure
   Before the publication could remove the temporary.
   records the occurrence of the failure: seven controls preserved the
   temporary,
   the cause, index and human file observed in macOS and Linux.
   natural of these values and Windows have not been proven.
   The installer and direct sync now refuse changes in files with ACL
   listed in macOS or when the query is inconclusive. Controls include
   ACL and simultaneous xattr and diagnosis of CLI; the inspection does not
   expose its exit.
   In the first version, planning and checking did not consult ACL. They passed
   to inform the locks on the real targets; detection does not prove hidden
   ACLs,
   directories, other systems or changes after consultation.
   In a regression suite on macOS, 56 tests passed; on Linux, 42
   They went through and 14 were ignored by platform. Two strict controls in the
   macOS refused or preserved ACL which denies append. The review detected a
   malformed exit initially classified as empty; the classifier was
   set to treat it as not verified. Node 18 on Linux ran the
   Classifier, but ignored the 11 specific macOS tests.
   Twelve controls also passed on macOS after extraction of the local package;
   this
   does not prove publication, installation in real project or ACLs in
   directories.
   The early diagnosis was extended to plan, doctor and direct check in the
   macOS including conflicts and changes after plan. The related suite
   passed 83 tests on macOS; on Linux, 63 passed and 20 were ignored by
   platform. Three controls passed with local package extracted in macOS.
   There is no proof of Windows, hidden ACLs, directories or atomicity.
   The query starts a process by affected existing file. In a single
   local measurement macOS of 100 synthetic files of 11 bytes without ACL,
   consultations totaled 260.7 ms, with median of 2.43 ms and p95 of 4.08 ms;
   100
   calls `lstat` added 0.5 ms. It is not a full plan benchmark nor
   forecast for other machines, loads or file systems.
   The same defect has been reproduced in the API sync with seven synthetic
   flaws:
   before correction the temporary was removed; after recording the occurrence
   of the
   failure, the seven controls preserved path, cause, index and human file
   observed. The temporary preservation suite passed 94 tests in the
   macOS and 94 on Linux in container. It does not prove competition, metadata,
   natural failures with these values or behavior in Windows.
   In sync backup, a valueless synthetic failure during copying could be
   ignored and synchronization continued. The correction records the occurrence
   of
   failure and interrupts the operation, also preserving the cause if the
   closure
   failure. The backup and diagnostic suite passed with 26 tests on macOS and
   on Linux in container. These controls do not prove concurrent security,
   Metadata preservation, natural occurrence of failure or Windows.
   Failure controls were expanded to partial writing: backup retained
   corresponds to the origin prefix observed, without changing that origin, the
   pointing, index or compared human files.
   passed with 28 cases on macOS and 28 on Linux in container; failures are
   Injected and security under competition remains unprovoked.
   After extracting a local package with the script compared to checkout and
   copying the
   fixture, the 14 directed controls also passed on macOS; this did not
   represents a published installation nor validates the full package.
   An isolated variant for internal sync cleaning passed eight controls
   on macOS and Linux, including reentrance with frozen error.
   tested only on previous copy instrumented; new API, values
   primitives and Windows remain unprovoked. The variant has not been
   integrated.
   Temporary paths
   still available in the diagnosis for review. Windows has not been tested.
   A previous offline local package included the then current secondary
   correction
   with equal bytes; after extracting the package and adding the test fixture,
   the
   two secondary controls passed on macOS.
   primary correction and does not prove publication or other flaws.
   A laboratory variant for primary cleaning passed 12 controls on
   macOS, but it may still lose its provenance mark by crossing a
   error aggregate. Unintegrated; Linux, Windows and full suite
   they remain without proof for this variant.
   A prototype suppressed
   messages, but changed the API and three existing expectations; remains
   Isolated as a compatible alternative is investigated.
   showed secondary rollback message in JSON; the review also pointed out
   a branch of cleaning the unprotected stage and limits in codes and paths.
   An alternative brand based on the object preserved the API in the case
   tested,
   but incorrectly classified a second occurrence by reusing the same
   fixture error; this reproduction evaluated the projection, not the CLI Real.
   The diagnosis of failures when inspecting the project was separated from the
   stage;
   the related suites passed macOS and Linux, with 63 tests in each.
   Other errors can still disclose unreliable details on exit from CLI;
   the collector was protected and validated in the related suites, but the
   sanitization of the other paths needs to be corrected and validated.
   Another experimental projection used fixed messages in CLI and passed nine
   directed controls and two error reuse in macOS, after
   adjust in copy an expectation of text. An additional control passed on
   real executables with injected synthetic failure. Projection reduces details
   useful and can still disclose paths without proven proven provenance; it was
   not
   integrated neither demonstrates general sanitisation nor complete
   compatibility.
   A second projection per occurrence passed 21 directed controls in the
   macOS and 21 on Linux in frozen copy. API ♪ nested may ♪
   receive wrapper, and arbitrary paths can still appear; codes do not
   The variant is still isolated and not recognized.
   shows compatibility or general sanitisation.
   Syntax errors in JSON external catalogue now inform the path without
   include snippets of content; schema checks follow out of this
   range. Synchronizer also uses non-content messages for sync errors
   syntax in the installed and derived states and in the configuration of
   customers;
   focused tests passed on macOS and Linux. In the installed copy of a package
   local, three checks refused these JSONs without exposing the content and
   preserved
   the index and files examined; the derived state was created by fixture.
   The local readers of
   external tools and skills also use
   syntax messages without content or path; tests and classification of
   pipeline passed 42 tests on macOS and 42 on Linux, including
   syntax of the local policy of adapters in the ignore planner and in the
   initial load of direct sync. These cases preserved the observed index;
   The first also preserved the exclusion. CLI Main now treats this
   load error without displaying content or path, in text and JSON, on the three
   languages; the test observed preserved human index and file.
   same error, direct sync also stopped displaying module path in
   macOS and Linux tests. An installed copy of the local package confirmed the
   case
   in macOS; other errors and versions of runtime were not covered by it.
   The suites of CLI and the diagnoses passed with 39 tests in macOS and 37
   on Linux, where two cases were ignored by platform.
   startup uses explicit options without consulting the saved language.
   The local package distribution test passed in six cases on macOS and
   six on Linux, before the later adjustment in the PRD skill. The first
   execution
   Linux failed to execute package on tmpfs mounted with `noexec`; the
   repetition
   with qualified execution passed. These proofs do not demonstrate publication
   or
   behavior in Windows.
   The delivery review also started to hide content from JSON malformed
   The three cases have passed through the report, baseline and seal. API e CLI
   in
   macOS and Linux, with index and observed files preserved. Absence
   The report continued to return `ENOENT` on both platforms.
   reading failures and schematic errors were not covered by these tests.
   The review suite passed with 110 tests on each system; the test of
   `ENOENT`, then added, passed separately in both systems.
   A Linux run of adapter tests failed a fixture in tmpfs:
   the verifier found the `.git` above the mounting point, but the Git does not
   crossed the limit of the filesystem. Fixture has started to create its
   Git repository itself in a temporary folder; the three suites totaled 69
   tests approved on macOS and 69 on Linux after setting, including a selection
   representative without ancestral Git. In another Linux run, in tmpfs that
   had exposed the failure, 26 adapter tests passed and the case without Gitt
   Ancestry was ignored because the temp was inside the checkout.
   A CLI main also refused the three malformed JSONs in `sync --check`
   e `update --dry-run`, preserving Git, state and human files
   observed in fixture, including the index with prepared changes and a
   human change not yet prepared. `update` effective.
   The first attempt
   previous macOS failed with an alias in temporary directory; was repeated
   The exact cause of the previous failure has not been proven by
   log. In one
   Synthetic installation of the local package, check with Node 26 refused JSON
   invalid without displaying the contents and kept the index and file examined.
   A previous attempt ended before the diagnosis and did not record the
   version used. After
   review five preservation expectations, the enlarged suite
   synchronization recorded 203 approvals, a failure and a skip both in the
   macOS as in Linux. The remaining failure involves `autocrlf` and continues to
   research; it was not attributed to correcting the diagnosis.
   allowed the writing lost ACL on macOS and xattr on Linux; the base controls
   refused the operation and preserved the observed synthetic metadata.
   The test now requires new description on the frontmatter and intact bytes of
   This does not prevent approval of a result that preserves the old note.
   The control confirmed that a no-op does not satisfy the assertion; the
   candidate
   passed in copy on macOS and Linux, without proving security or metadata.
   continues to fail in the collision on both, before reaching the new
   assertions;
   the test normalizes line endings and does not require CRLF the result.
   A repeat with updated snapshot confirmed that the proposed standardisation
   allows to update the reference and preserve the index, but still loses ACL in
   macOS and xattr on Linux. It stays out of the product.
   A later variant required equivalent entry and blob in the index and refused
   the metadata observed in fixtures.
   hash does not prove authorship, that diff depends on undistributed addon and
   that
   the guards affect other sync operations. Tests do not prove content
   preserved in all errors, competition, authorization or compatibility
   multiplatform; the variant remains in laboratory.
   Four additional controls on macOS refused replacement with ACL or xattr
   synthetic and preserved the observed files and metadata, with and without
   force.
   No metadata, there was an update, but immediate check indicated divergence
   the stable index preserved; one control was healthy only after `git add`
   explicit and other synchronization. Linux repetition was inconclusive; second
   the investigation of the team, the addon did not load in unexecuted tmpfs and
   the
   ACL I couldn't stand it there.
   This experiment was neither integrated nor proved portability or atomicity.
   A later repetition on Linux with filesystem that allowed addon and ACL
   passed six controls, as well as macOS. Two additional controls per
   system preserved synthetic metadata from parent directory; they do not cover
   Inheritable ACLs or restrictive directories. The prototype still depends on
   addon
   experimental and does not prove all metadata or Windows.
   Another variant without addon passed five controls per system: four of
   preservation of references CRLF equivalent and one refusal of amendment
   The independent review.
   confirmed that it does not solve the IC test with altered description: in
   this
   In case the protection continues refusing the operation. The proof covers
   only one type
   pointer; complete suite missing, CLI, Windows and competition.
   variant remains in laboratory.
   A proof of direct writing by the descriptor preserved inode and metadata
   synthetics in the observed controls, but also changed another linked name
   by hardlink and left incomplete content after simulated interruption.
   four controls on macOS and four on Linux; they did not run sync.
   isolated mechanism is not a safe correction to integrate.
   In another control, the replacement candidate disbanded the relationship with
   a
   Human hardlink, although preserving the bytes of the other name.
   experimental refused the case and preserved the relationship in macOS
   fixtures and
   Linux. It still depends on experimental probes and does not prove metadata,
   competition or Windows; it has not been integrated.
   A versioned test now requires refusal when pointing CRLF You have to
   change and share inode with human file. Control passed on macOS and
   Linux, preserving bytes, the observed relationship and index; Windows does
   not
   On the basis of that evidence, the refusal came from the generic collision,
   without
   check a specific hardlink guard. If it is not possible to create the link,
   the test informs skip for recognized conditions.
   updating files without links.
   A later guard on direct sync has declined update or removal
   regular file with multiple hardlinks observed before writing.
   four cases with and without force and a sync without changes passed on macOS
   and
   Linux, preserving compared paths; a suite prior to expansion
   The verification is not atomic with the writing,
   and Windows, extended attributes and ACLs follow without sufficient proof.
   The sync now also checks the count immediately before publishing or
   remove. A hardlink created between checks led to refusal of testing
   update and removal; removal initially restored the file and
   breaks the link, and has been set not to restore when the action has not yet
   started. The two sync controls and one installer passed on macOS and
   Linux, as well as 140 related suite tests on each system. No
   delete the window after the last check or prove
   The review also pointed to a risk still lacking
   playback: previous transactions at the same transaction limit may lead
   the rollback restoring that limit, while the fingerprint does not include the
   Link count. We need to check if the plan allows this situation.
   Another correction prevents an empty value removal failure from being treated
   as a success. When the observed content remains the same, rollback avoids
   recreate the path; if there was previous touch on the same root, it is
   preserved
   as uncertain and can maintain partial changes. The related suite passed
   161 cases in each system; the 21 directed controls also passed with
   the script extracted from local package in macOS. The branch with previous
   touch, ACL, xattr,
   General competition and Windows follow without sufficient proof.
   Later, six error controls `EIO`, including immutable,
   also passed in each system; these errors are injected by fixture.
   An isolated prototype to inform hardlinks in the planning passed six
   system controls, including simultaneous conflict and subsequent change
   to plan. It was not integrated: requires revision of paths and messages and
   not
   proves atomity or Windows compatibility.
   A later selective integration informs shared hardlinks and
   unchecked counts in planning, check and doctor; human conflicts
   maintain priority. Messages have been corrected after independent revision.
   Seven related suites passed 219 tests on macOS and Linux; two controls
   passed after extraction of local package in macOS. The proof does not cover
   Windows,
   all concurrent changes or preservation of ACL and xattr.
   The installer also started checking the real targets planned before the
   backup and again before writing. Synthetic Update Tests and
   removal preserved the observed hardlinks; the related suite passed 137
   macOS and Linux cases. CLI real, six init tests checked out
   human and JSON in the three languages on both systems.
   Linux reported syntax error in incomplete file reading; repetition
   It has passed, but the cause of incomplete reading has not been proven.
   remains subject to concurrent changes and has not been tested on Windows.
   Invalid or missing hardlink counts now interrupt the application
   with a diagnosis of unverified metadata, instead of being treated as
   evidence of absence. Twelve synthetic controls of API, sync and CLI They've
   gone through the
   macOS and Linux, including messages in all three languages.
   filesystems return these values; the policy can block their operation.
   The related suite passed 179 tests on macOS and Linux; the 12 controls
   also passed after extraction of a local package in macOS.
   has been proven in Windows or filesystem that returns invalid count.
   A chance of stage blockage by ACL inheritable in temporary directory
   did not occur in init and sync fixtures.
   separate, not in the actual stage file; other operations go on without
   proof, as well as the integral preservation of metadata in these controls.
   Subsequent controls increased synthetic values for counts
   negative, fractional, infinite and inaccurate; 20 passed in each system.
   An additional check confirmed the refusal when the count became
   unavailable after plan, without declaring hardlink as confirmed.
   The 20 enlarged controls also passed after local package extraction in the
   macOS; this does not prove a publication or installation on other systems.
   A new case execution `autocrlf` on Linux confirmed the refusal by
   collision before updating reference. sync compares registered hash
   to the current bytes, which differ after line end conversion.
   equivalence alone does not yet protect ACLs, xattrs or hardlinks.
   The helpers `withUncertainPath` e `withPotentialPartial` Now read the message
   once; the tests of this change passed on macOS and Linux.
   proves protection of all getters or the synchronizer output.
   wider prototype continues outside the product because it still exposes a path
   Untrusted in direct sync.
   The unchangeable hardlink diagnosis also started to save the read code
   in recognition; the directed suites passed with 21 tests on macOS and
   21 on Linux. These tests do not correct concurrent recovery.
   An old fixture was adjusted to require truncation in diagnosis
   malformed without losing valid data. Git and locale configuration suites
   passed 153 tests on macOS and 152 on Linux; one and two cases,
   respectively, they were ignored by platform.
   An experimental copy of ACL to backup preserved entry
   `everyone allow read` whether or not with mode `0600`. The effective access
   was not
   tested; copying metadata does not prove backup privacy.
   A separate fixture confirmed ACL inherited in the backup and temporary of
   init, without testing access by another identity. Application and sync now
   refuse to copy to new backup on macOS when folder has ACL listed or
   your query fails; four controls have preserved empty backup and
   Comparative files. Guard does not cover publication temporarys, others
   competing systems or changes after consultation.
   Two additional controls confirmed that ACL not inherited in parent directory
   did not block installer fixtures and sync; the corresponding suite passed
   78 tests on macOS, and 72 on Linux with six macOS-specific skips.
   After review, successful controls started to compare bytes and
   specific file mode in backup with source; the seven controls
   directed passed in macOS, without proving all metadata.
   The six backup controls also passed on macOS after extracting the package
   local, without installing in real project.
   An additional proof executed the actual init of CLI with ACL Inheritable at
   the root of
   fixture: backup was rejected empty, and original file, index and others
   compared files have been preserved. The proof has also passed with package
   The enlarged suite passed 79 tests on macOS and 72 on Linux,
   with seven macOS tests ignored on Linux; did not measure third party access.
   The four controls prior to strengthening the inspection of fixture also
   passed with the local package extracted; there was no installation in real
   project.
   A separate prototype examined temporary blanks before recording content
   and refused ACL inherited in fixtures. The 24 existing mode controls and
   umask did not observe the new writing by descriptor; the prototype continues
   isolated until the cover is adapted and the closures are checked.
   After the observer's experimental adaptation, the 24 controls passed in the
   macOS and Linux. There are still gaps in the other tests of failure, closure,
   backup,
   rollback, extended attributes and atomity; no integration.
   A laboratory variant preserved simultaneous errors of ACL and closing
   on six macOS controls; on Linux passed a aggregation control and five
   macOS specifics have been ignored. Identity in publication continues
   without proof after closing the descriptor; it was not integrated.
   Other isolated copy with `cp -p` in macOS kept ACL and synthetic xattr.
   To a pre-existing destination, `cp -np` returned error and kept its contents
   in
   fixture. These controls do not prove privacy, atomicity or treatment
   The Commission has decided to initiate the procedure for the application of
   Article 93(2) of the EEC Treaty.
   The isolated primitive backup now refuses to operate without UID available
   herd;
   your suite passed 53 tests on macOS and 53 on Linux.
   integrated to the installer or sync and does not prove ACLs privacy.
   A test instrumentation observed 290 directories created and 488 names
   temporary in a synthetic init; the catch candidate covered the
   directories, but not temporary ones. In another fixture, the missing root
   also
   a synthetic backup copy was checked by bytes.
   passed 29 tests on macOS and 29 on Linux; this does not prove a plan
   complete or secure recovery.
2. [-] **External practices:** compare [ECC](https://github.com/affaan-m/ECC) e
   [Superpowers](https://github.com/obra/superpowers) with the kit. Prioritize
   assessments with evidence, diagnosis and review; respect licenses and avoid
   copying unnecessary content or activate automations without request.
3. [ ] **Author:** check code, documentation, metadata and history to
   publish; remove references to agents used in development without
   Remove compatibility instructions. Enhance Git skills that you author,
   Committer and co-authorship of agents should not be included in the commits.
4. [-] **Installation:** check publication in npm and test useful forms of
   execution with npm, Yarn, pppm and Bun, documenting versions, prerequisites
   and limitations observed; not affirm compatibility without proof. `0.0.30`
   performed the four pathways in macOS, but changed `.git/info/exclude` in
   fixtures; integral preservation did not pass this test.
5. [-] **External links:** inventory and test the versioned links, assign
   pertinence and fix destinations; distinguish proven blocking, authentication,
   access limit or temporary unavailability. A first traced Markdown extraction
   verified 103 URLs with 2xx response; four were not verified. Another search
   found 41 2xx responses between additional references. Uncaptured syntaxes and
   anchors are still pending; HEAD A incremental audit found three additional
   public destinations accessible; private URLs, sensitive queries and
   changeable endpoints were excluded.
6. [-] **Performance:** incorporate to the flow the previous definition of load,
   metric, limits and comparable proof, according to the article provided; avoid
   assuming percentile or quantity of universal repetitions.
7. [-] **Examples:** create useful synthetic examples for new and existing
   projects, preserving human data and without private content.The recipes were
   executed in macOS with local package, preserving the index, Git settings and
   human content observed; the kit added a block to the `AGENTS.md`. Windows and
   visual material have not yet been verified.
8. [ ] **Delivery:** review files and index, sensitive data, testing,
   published documentation and package. Then create commit with identity of
   user and send authorized changes; check the remote result.
9. [-] **Compatibility and execution:** validate published versions in existing
   projects and execute each skill and agent individually. 1.000 synthetic
   projects in macOS registered 792 approved in the structural checks of the
   CLI; the other 208 and the overall result remained unverified. The matrix
   does not prove the actual execution of all skills and agents; this proof
   remains pending. In 40 Linux synthetic projects, the npm package `0.0.21`
   changed `.git/info/exclude` during `init`; the 40 cases failed the strict
   criterion and stopped before the later steps. Among the compared paths, this
   was the only one changed; this does not cover all files or metadata. The
   added blocks were recognized in later revision, but still are real changes.
   The strict diagnosis was corrected not to state that the blocks are unknown
   when they were not inspected. The matrix suite passed with 45 tests on macOS
   and 44 on Linux; one case was ignored on Linux. 1.000 Linux synthetic
   projects, with other combinations of customers, `init` It returned success in
   all, but all failed in strict preservation:
   between the paths monitored, only `.git/info/exclude` The cases have changed.
   They stopped after `init`, without validating update, doctor, sync or
   execution of skills.
   A later batch of 40 projects used `--diagnose-exclude` with `0.0.21`
   in a networkless Linux container. The 40 continued to fail in preservation
   strict, but the controller recognized the bytes of the exclusion block and
   continued: `init`, `update`, `update --force`, `doctor` e `sync --check`
   returned zero in all. Resource mapping remained not
   verified in 40; recognize bytes does not authenticate the package or prove
   activation, metadata and absence of transient changes.
   aggregate report, not individual container logs and snapshots.
   An experimental variant of the controller recognized the export of paths
   ed `0.0.21`, conditioned to hashes of three files. In 40 projects, tagged
   26 as verified by the instrumented controls and 14 not verified;
   all continued to fail for the exclusion change.
   showed that the variant imports code before checking hashes and did not
   proves metadata like `alwaysApply` e `globs`. The marking of the 26 not
   proves complete structural coverage, scope or activation.
   remained isolated: lack of provenance and testing of exceptions.
   variant incorrectly expected the Gemini format without arguments and stopped
   at
   four cases; the second used the observed format for new destinations.
   After this review, the main controller began to mark Cursor and
   Copilot as not checked when the scope of your metadata was not
   checked. Controls with synthetic notes passed on macOS and
   Linux; the matrix suite registered 47 approvals on macOS and 46 on Linux,
   with a skip. Previous results classified as not verified
   They prove these metadata and have not been recalculated.
   Then, the matrix came to compare the simple generated frontmatter with the
   rule of origin; sidecars, human sources and ambiguous scopes continue not to
   verified. On offline Linux repeat with previous local candidate,
   30 of the 40 cases were checked by the controls and ten were not verified:
   six per Claude scope and four per Cursor metadata with sidecar.
   aggregate was preserved; individual logs and snapshots remained in the
   container.
   The test does not cover native activation, all metadata or transient changes.
   A review confirmed that the continuation maintains the original failure, but
   the
   abstract in stdout omitted the indication of the diagnostic mode.
   includes `diagnosticExclude`; diagnostic and normal execution controls
   passed on macOS and Linux. The stdout from the previous batch does not
   contain this field.
   Container operated without network; files extracted from package coincided
   with
   the tarball observed before and after, without proving no transient change.
   The comparison does not cover the entire tree or its metadata.
   A first comparison of the candidate
   it was without valid provenance because the controller was edited during the
   execution; its results do not confirm the comparison.
   frozen controller and package preserved index, ignores, configuration and
   refs observed in 40 Linux projects; documents could receive blocks
   The five stages were conducted in all: 34 had coverage
   structurally verified and six remained unchecked as to the scope
   native Claude. The candidate used precedes the subsequent adjustment of the
   skill
   `verificar-trabalho`. The update was from the candidate about herself, not
   from
   `0.0.21` for the candidate; the matrix does not prove the behavior of all
   The provenance compares five files before and after, not the tree
   full package and no transitional changes.
   The later controller also started to compare catalog, destination map
   and adapter policy. A test changed those files during a
   Synthetic execution and confirmed provenance failure. Suite had 49 tests
   approved on macOS and, on Linux, 48 approved and one ignored specific to the
   macOS. This zoom does not authenticate the package or observe reversed
   changes.
   A networkless Linux repetition used a local package `0.0.30` frozen and
   preserved the report outside the repository. Of the 40 projects, 34 had
   structural coverage verified and six were not verified due to the
   Claude's native scope of the Git rule. The observed preservation was verified
   No 40; `init`, `update`, `update --force`, `doctor` e `sync --check`
   returned zero. The package updated itself, not the `0.0.21`; the matrix
   did not execute customers or skills and does not cover all metadata or
   changes
   The package precedes subsequent changes in the executor of
   infrastructure. The first test with output outside of `/tmp` was refused
   before the matrix; the repetition used a temporary folder allowed.
   A later proof installed the `0.0.21` and tried to update a fixture
   Claude with the local candidate `0.0.30`, no network on Linux. Update
   refused eight conflicts of rules and did not alter types, modes or hashes of
   paths observed, including Git. In the previous installation, the exclusion
   was
   created and a human agent received managed block; a repetition confirmed
   that its original text was kept as prefix. The refusal does not prove
   successful update, other projects or absence of transient effects.
   In another fixture prepared with new init of `0.0.21`, both `update` how much
   `update --force` refused the same conflicts; tree type, mode and hashes
   examined, Git and bytes of the human agent became equal after each attempt.
   No ACLs or extended attributes were compared.
   The human outlet of CLI started listing up to five conflicts even when the
   Plan is empty. Formatting controls and conflict preview Claude
   have passed on macOS and Linux; the full list remains available on JSON.
   An analysis of another fixture confirmed that the eight wrappers corresponded
   the hashes of `state.files` ed `0.0.21` And they weren't on the Git index.
   declared `always_on`; five of its sources were identical to those of the
   candidate
   The Git rule declared `model_decision` and its source also
   The candidate preserved the wrappers and blocked the plan;
   only wrappers do not ensure that an update of the fonts keeps the
   The historical hash doesn't prove inode, ACL or authorisation
   current, and the actual activation in the client was not observed.
   An experimental alternative preserved the eight wrappers, fonts and hashes
   during `update`, with unverified scope warning, but not integrated.
   In fixture, the quality referenced gitignore template and the skill
   `proximos-passos` referenced by the same rule changed hash; there is no
   equivalent transitive behavior proof. Direct sync refused the rule
   Git; the explanation identified by code reading was not instrumented.
   There were no controls with wrapper staged or edited or edited human source.
   The subsequent inspection found two features altered at two levels of
   security rule. Links do not allow you to safely enumerate references
   in prose, variable paths or external dependencies; the refusal remains
   until there is a proven compatibility border.
   In separate macOS fixtures for Codex and Copilot, `init` ed `0.0.21` e
   `update` of the candidate extracted `0.0.30` returned success, with changes
   in update and no conflicts. The seven human files observed, index,
   configuration, delete and diffs were equal during each update.
   previous has changed `AGENTS.md` and excludes; the initial human bytes of
   `AGENTS.md` were kept as prefix. Update changed 491 paths in the
   fixture Codex and 318 at Copilot, without individual inspection of all of
   them.
   The test does not cover npm installation, native activation, complete
   metadata or
   full checkout stability during candidate packaging.
   The targeted suite of scope and legacy passed 18 tests on macOS, including
   reference preservation without ownership and block content staged.
   It does not in itself reproduce the actual update between these versions.
   On router with `0.0.21`, the direct sync `--check` returned zero and reported
   no change or conflict in a macOS execution with writing and network
   The index, `.gitignore`, delete and configuration Git kept
   This check does not prove activation of rules or all flows.
   O `doctor` the package published also returned success without issues on the
   router,
   with networked and written on the blocked project and authorised temporary
   internship;
   the same Git files kept the hashes. A previous attempt failed
   by creating the stage because of the path allowed in the sandbox and was
   repeated
   with the canonical directory. The result does not prove the changeable
   operations.
   `next` from the same version also returned success and indicated initial
   preparation
   on router, with writing and network locked; the four Git files observed
   The recommendation does not prove the project's completion.
   A Git unwritten query confirmed ignore patterns for six paths
   synthetics on the router, including three variations in the case of
   `.playwright-mcp`;
   the same four hashes remained the same as you used. `--no-index`, a
   consultation does not prove whether the paths are tracked or not.
   sent to Git; it also does not cover all variations.
   Another consultation covered the 8.192 box combinations of `.playwright-mcp`
   with a fixed suffix; all found ignore pattern. Independent revision
   confirmed the Git tuples and the observed hashes. `--no-index`,
   other names and paths remain applicable.
   Another query listed the index and found no entries corresponding to the
   Playwright artifact families and verified test results.
   does not examine the history or all possible names.
   In controlled native trials,
   there was extrapolation of the scope of a search and affirmations of
   architecture and
   documentation without proof; the behavior is not yet consistent.
   In six controlled Copilot sessions CLI, the profile source was read in
   one of three with Markdown link and one of three with `@`; none have proven
   Automatic expansion. The sample does not prove causality or consistency.
   In a performance profile session, the client distinguished count from
   benchmark operations; the count test was run by the controller,
   not by the agent, and does not demonstrate performance in production.
   In a session with the skill `avaliar-performance` ed `0.0.21`, the customer
   it also distinguished the counts from an isolated latency measurement;
   controller performed the test separately. There was no benchmark or
   validation
   The previous installation changed the `exclude` fixture site.
   In an Express project set by commit, the published version `0.0.21`
   changed local Git exclusions on macOS.
   files observed on this system. Express suite passed before and after
   with 1.290 tests on each copy, on Linux ARM64 without network on execution,
   using
   the same dependencies solved without lockfile.
   A local candidate also passed the installation checks on commits
   Zod and Tailcat fixed in macOS ARM64, preserving human content and
   Git settings checked. In copies without and with the kit, execution
   Vitest pattern on Zod passed: 8.426 tests on 596 file executions,
   on Linux ARM64 without network during build and tests.
   dependencies used network and ignored installation scripts.
   The Tailcat application was not executed in this test.
   In isolated sessions, the planning profiles and architects were read by
   client; results show no consistency between sessions or execution
   complete of all the tasks of these profiles.
   O `arquiteto` ed `0.0.21` read requirement and synthetic module, invoked
   `avaliar-arquitetura` and delimited the absence of persistence to the module.
   independent controller confirmed the case in two processes after the session.
   In the later manual application of the skill, two tests confirmed reading in
   the
   process that recorded and absence of value in new process.
   persistence remains open decision; proof does not cover real system,
   disk failure, native client or independent revision. Files and Git
   observed were equal after init, which had altered the exclusion.
   O `especialista-frontend` identified, by reading, a field without `required`;
   the control was static and did not execute navigator.
   tree and Git observed were equal after the init changed the exclusion.
   In another consultation with `planejador` ed `0.0.21`, the customer
   identified the
   divergence of a calculation, separated doubts and evidence proposed and did
   not affirm
   have tested. Tree and Git observed were equal during the consultation;
   previous init added a block to the fixture exclusion. Searches occurred,
   but their arguments and results were not recorded by the controller.
   In later manual application, the `planejador` consulted `next`, registered
   tasks and left the decision on negative entries open.
   existing was run separately by the controller and passed; it did not
   Tree and Git observed remained the same after the init,
   that had changed the exclusion. There was no native activation or revision
   independent.
   In a consult with the agent `analista-performance` ed `0.0.21`, the client
   read
   the source and skill of performance, explained the cost under hypotheses and
   informed the
   which did not perform benchmark. Tree and Git observed were equal during the
   query after init has added a block to the delete from fixture. o
   controller did not observe wrapper in event flow; its activation was not
   proven or refuted by this session.
   In later manual application, two synthetic sum implementations
   produced equal results at the examined entry; seven alternate rounds
   were measured in a process and a separate test passed.
   provided. The compared files and Git remained equal after init,
   The proof does not cover native client,
   CPU, memory, independent review or production performance.
   In another consultation, the agent `especialista-backend` ed `0.0.21`
   Identified
   a divergent calculation of the contract and reported that it did not perform
   tests.
   client read the source and invoked `revisar-codigo`; no invocation was
   observed
   of `implementar-backend`. Tree and Git observed were equal during the
   session, after init has added a block to the fixture delete.
   In later manual application, the expert corrected a comparison in
   Synthetic module: two tests failed before and the three passed later.
   The unstaged diff of the code has intentionally changed; human comment,
   index, configuration, exclude and diff staged remained equal.
   the plan was fictitious; there was no native client, API actual or revision
   independent. The previous init had changed the exclusion.
   In separate consultations with agents `revisor` e `documentador` ed `0.0.21`,
   customers identified synthetic divergences and reported not to execute
   tests; controller checked examples after sessions. Trees and Git
   observed were the same during the consultations, after inits changed the
   Excludes from fixtures. The activation of wrappers has not been proven.
   In later manual application of the `revisor`a synthetic diff staged with
   Arithmetic error was identified and a real test recorded approval and
   The change was not approved. Index, HEAD, configuration,
   excludes, diffs and tree observed remained equal during review;
   the previous init had changed the exclusion. The proof did not use native
   client
   No independent review and no proof of actual project operation.
   In later manual application of the `documentador`, the manifest was consulted
   and his synthetic test passed with Node; README received the observed command
   without losing previous bytes, and the repetition did not duplicate the
   section. Index,
   configuration, delete, diffs and compared files were equal after
   init, which had previously changed the exclusion. The proof did not execute
   `npm test`, native client or independent review.
   In a consultation of the `engenheiro-qa` ed `0.0.21`, the customer read the
   source and
   He called `planejar-qa`; identified differences in the calculation and stated
   that
   the controller confirmed four examples after the session.
   Tree and Git observed were equal during the query; the previous init
   added a block to the fixture exclusion. Wrapper was not observed in the
   events, which does not prove that it has ceased to be loaded.
   In separate manual application, five tests for two synthetic criteria
   passed with Git and Node in macOS sandbox without network; the test code
   staged,
   index and observed files were preserved. The first attempt passed
   the tests, but the controller rejected the output format; the repetition used
   TAP explicit in another fixture. There was no native installation or
   activation, nor
   proof of integration or of all possible inputs.
   In another manual application of `engenheiro-qa`, four one-row tests
   synthetic passed: order, empty queue, preservation of entry and rejection of
   Code and tests were staged and remained the same, thus
   like Git and files observed after init; the init had changed the delete.
   Persistence, competition, integration and independent review were not
   proven.
   In a reading session with `gerenciar-roadmap` ed `0.0.21`, the customer
   recognized the draft and blockage for absence of PRD.
   execute `git status` it was denied; the controller checked the index and
   Observed files. Session does not prove full skill flow.
   In later manual application, a synthetic roadmap registered design in
   review without assuming approval. Sync and check from API returned zero with
   ignores local and entrypoints disabled; index, config, diffs and files
   The first attempt did not record any human differences.
   the field of a comparison failure; another compared objects by identity.
   The final fixture fixed the controller. No installation, client
   native or proof of the patterns of CLI And all the metadata.
   In a session with `criar-recurso` ed `0.0.21`, the model requested was
   created without frontmatter and rejected by the catalogue in later
   verification
   The index and human files observed were preserved.
   The candidate now explicitly demanded frontmatter and H1 for models.
   In a later native session, the model produced included both and the catalog
   accepted entry in separate control; Git and observed human files
   The installation of a local package in fixture Git included
   the orientation and passed in the `sync --check`A fixture without Git
   returned warning
   and code 1 on check. A session does not prove consistency between customers.
   In separate off-line manual test from `0.0.21`, a synthetic model
   frontmatter was recognized by the catalog and passed in sync and check; Git
   and
   Observed human files became equal. The controller ran the stream;
   this evidence is neither a native session nor invalidates the previous
   failure.
   In a session of `criar-design-doc` ed `0.0.21`, the client read the skill and
   the
   PRD in draft, informed the lock and did not create the document.
   Git was denied; the controller checked index and tree observed.
   The session does not confirm the complete flow or consistency between
   sessions.
   In later manual application, a synthetic design was created in draft
   with PRD and UX fictitiously approved; decisions and approval of the design
   remained
   sync and check API passed and the files and Git compared were
   official references were not consulted due to lack of network;
   there was no native client or proof of full flow.
   In a session of `criar-spec` ed `0.0.21`, the customer read a PRD in draft
   and yet created the spec, including unsupported decisions in the PRD
   synthetic.
   The index and the other paths observed were the same during the session.
   An intermediate review of the candidate did not create the spec in another
   session.
   After explicit reinforcement of preparation and blockage, a separate session
   read
   the orientation, but it created the spec and included unproven decisions.
   and the observed human files were equal; the tree out of destination
   The blockade is still unsecured.
   The verifier won `--preparacao`, to consult this indicator without requiring
   Advanced technical configuration. Positive result still requires revision
   the evidence and does not prevent written by those who ignore it.
   selector passed with 30 macOS and 30 tests on Linux; in local package, one
   fixture with finished preparation and pending configuration passed in the
   mode of
   preparation and was blocked in implementation mode. Index and human file
   observed were preserved.
   In native sessions with the candidate, stateless fixture remained intact
   when shell was denied; fixture with completed preparation and technology
   pending, the client created the spec before consulting the state or executing
   the
   verifier. No UX or design reading was observed.
   broken links and an unproven command in spec. The advisory script does not
   It is a writing barrier and the order is not yet guaranteed.
   The skill instruction does not prevent writing by itself. Hooks vary by
   client;
   in [Copilot
   CLI](https://docs.github.com/en/copilot/reference/hooks-reference),
   for example, a timeout on hook allows the call to follow the normal flow
   Permissions. Isolation and controlled application require design and proof
   own; there is no universal block implemented.
   In a session of `criar-prd` ed `0.0.21`, the customer read the PRD existing,
   sought the absent state, invoked the `configurar-projeto` And he didn't
   create another PRD.
   The controller confirmed unchanged index, changes and tree.
   The answer listed gaps, but did not formulate a question or appoint the skill
   of
   The proof only covers this lock in a macOS session.
   In a session of `criar-ux-ui` ed `0.0.21`, the client read the skill and a
   PRD
   in draft and did not create UX without configuration status. `criar-prd`,
   but he didn't consult this skill or identify the preparation as first.
   index, changes and tree observed were equal in the session,
   after the init has changed the delete. The proof covers a shell session and
   URLs denied, not the complete consistency or flow.
   In later manual application, a PRD and their fictitious approval guided
   the creation of synthetic UX in draft, with pending approval.
   check of API passed with explicit options; index, config, diffs and files
   There was no native client, no interface.
   validation with users or proof of CLI standards.
   In the candidate, UX and design skills began to require preparation
   completed and proven before product steps and to preserve approvals
   without material change. An independent review checked the essay.
   local package installed both fonts and passed on `sync --check` in a fixture
   with an index, `.gitignore` and observed human file preserved.
   of resources and next steps passed with 50 tests on macOS and 50 on Linux;
   they do not prove the behavior of new instructions in native client.
   In two independent evaluations by subagents, in a synthetic fixture with
   a state of preparation absent and PRD in draft, UX and design indicated first
   check the preparation and reported not to execute scripts.
   equality of paths and modes of 796 entries and file content
   regular, including the Git index. There was no imposition of reading by the
   OS;
   the control did not compare destinations of symbolic links, timestamps or
   metadata.
   extended, nor stored an independent final snapshot.
   Reviews do not prove discovery by native customers or consistency
   in other sessions or design states.
   An attempt to `preparar-dev` ed `0.0.21` read the skill and documents of the
   fixture, but expired without final answer; a shell call was denied.
   Index and tree observed were equal. The test performed before by
   controller was not presented to client; functional proof remains pending.
   In separate source query `preparar-dev` ed `0.0.21`, a subagent
   identified the declared runtime and proposed the existing test without
   executing it.
   The observed files and modes remained equal, including index and
   human changes. The reading of fixture used sandbox; subagent and
   the controller was not fully confined.
   tarball, but there was no installation or native client in this consultation.
   In later manual application, inventory, diagnosis and library test
   synthetic passed without altering Git and human files compared after
   installation; previous init changed the delete. Setup, downloads and Docker
   have not been tested. PATH restricted does not show no tools;
   the first attempt failed by parsing the controller and was repeated.
   At the candidate, `gerenciar-roadmap` started to ask sync only after changing
   Agent resource. In fixture, a subagent updated a roadmap marker and
   reported not synchronizing; of the 798 paths and modes observed, only the
   The O.R. did not impose isolation on the subagent, and did not
   compared timestamps, extended attributes or links destinations.
   evaluation used Python punctually, contrary to Node's preference; it was
   repeated with Node after restoring fixture.
   compared the result with the initial text reconstructed and validated by
   hash;
   confirmed only the change of the marker, without proving the inventory or the
   session isolation. A local package installed the skill and passed
   ed `sync --check`; the resource suite passed with 17 tests on each system,
   macOS and Linux. This does not prove discovery in native customers.
   In another font query `criar-skill` ed `0.0.21`, a sub-agent identified
   an existing human skill and recommended reusing it, without creating another.
   paths, files and observed modes were the same.
   used sandbox, but subagent and controller were not fully
   confined; there was no installation of the package or proof of native
   discovery.
   In later manual application, a synthetic skill was cataloged and generated
   two notes; the check passed and the external catalogue was only listed,
   no download. The compared Git and human files remained the same after
   creation. The previous init changed `AGENTS.md` and excludes it, preserving
   the
   human prefix. There was no native client or proof of sync defaults.
   In separate consultation, the `criar-agente` ed `0.0.21`, a sub-agent
   recommended
   preserve a human profile and clarify requirements.
   observed, index and compared files remained equal.
   sandbox; subagent and controller were not fully confined. No
   there was installation, profile creation, sync or native client in this
   consultation.
   In later manual application, a synthetic profile and metadata were used.
   cataloged and generated two Antigravity and Gemini notes; check passed
   and the compared Git and human files were equal after creation.
   The YAMLs do not prove native discovery or
   effective application of permissions; sync used explicit options.
   A separate attempt of `criar-agente` It also expired after reading the skill,
   no final answer or profile created. Index and tree observed were
   equal; this timeout does not prove functional failure or concludes
   validation.
   An attempt to `git-commit` no network and no personal credentials ended
   before the call of the skill due to lack of authentication.
   executed separately by the controller does not prove the skill's performance;
   The native evidence remains pending.
   In later proof, a sub-agent followed the source `git-commit` ed `0.0.21`
   and created commit in offline fixture without remote and with fictitious
   identity.
   The blob corresponded to staged; unstaged change, untraceable file and
   observed Git files have been preserved. HEAD and index have changed by
   commit.
   There was no native client, push or proof of signature and real identity.
   In manual application of `git-pull` ed `0.0.21`, the branch of a fixture
   advanced by fast-forward from remote local in sandbox without network. Blob
   and
   diff staged, diff unstaged, untraced file, `.gitignore`, configuration
   Git and exclusion observed were preserved; HEAD and bytes of the index have
   changed.
   A URL from the remote was checked;
   restriction to the protocol `file` does not limit the accessible path alone.
   there was package installed, native client or conflict proof, merge,
   signature and all metadata.
   In manual application of `git-push` ed `0.0.21`, a fixture without network
   used
   identity and remote local synthetics. After a push preparation, a push
   normal without force updated the remote to HEAD Waited. HEAD location, index,
   staged and unstaged contents and Git and observed human files remained
   equals. URL location was checked; extracted sources were used, without
   native installation or client. Does not prove authentication, branch
   protection,
   divergence, signature, general metadata or transient effects.
   In consultation with the source `git-merge` ed `0.0.21`, a subagent did not
   execute merge
   In the face of fixture restriction and indicated pending Git checks.
   observed paths and modes, index and compared files were equal.
   controller prepared synthetic branches and commits before snapshot;
   reading used sandbox, but the subagent and the controller were not fully
   There was no package installed or native client in this query.
   In later manual application, a synthetic local fast-forward integrated the
   expected branch and the test passed before and after. Diffs staged and
   unstaged and
   compared human files remained equal; the bytes of the index changed
   to reflect the new commit. Git and Node executed in macOS sandbox without
   network, but fixture controller did not. No installation or activation
   native, no proof of conflict, signatures or other metadata.
   In the source query `modelar-ameacas` ed `0.0.21`, a sub-agent identified
   assets, borders and priority checks on synthetic documentation,
   without presuming implemented controls or confirmed failures. 44 entries
   and the observed Git files remained the same. Reading was confined;
   controller and subagent were not fully confined.
   native client, package installed, auditor or full flow in this test.
   A later manual application produced template for a library
   synthetic and performed four benign tests; index, config and files
   There was no native client, independent auditor.
   or evidence of general safety and unknown integrations.
   In separate profile query `auditor-seguranca`, a sub-agent examined
   synthetic function without context and distinguished observed behavior from a
   Unproven vulnerability. The 43 Git entries and files observed
   The reading was confined, but not the controller and the
   subagent; there was no execution, scanner, package installed or native
   activation.
   A native Copilot session invoked `revisar-autorizacao` ed `0.0.21`
   installed and examined a synthetic access file.
   verified server, identity and authorization. Project and index
   observed remained the same; the session was static, with shell and writing
   disabled, inference network and authentication allowed and subprocesses
   It doesn't prove the behavior of API or the creation of a report.
   Another native Copilot session invoked `revisar-seguranca` ed `0.0.21`
   installed and read the skill, rules and synthetic code.
   excerpt and recorded absence of scanners, tests and diff. Tree, index and
   staged and unstaged changes observed were equal. Shell, writing and URL
   were denied, but there was a delegation whose internal events were not
   audited;
   the login and inference network was allowed. No server, scan
   dynamic or report saved, the proof does not prove security of an application.
   In manual application of `corrigir-vulnerabilidade` ed `0.0.21`a fixture
   synthetic restricted the registered fields: the test prepared by
   controller failed before and passed after correction. Human files and Git
   observed remained the same. Extracted sources were used, without installing
   the package; there was no native client, scanner or independent review of the
   correction. Full flow and general security are not proven.
   A profile query `implementador` and to the skill `implementar-spec` ed
   `0.0.21` indicated not to initiate code in the face of pending preparation,
   spec in
   draft and plan reported as missing. The 51 entries and Git files
   the reading was confined, but the subagent and the
   no controller; there was no native client, package installed, implementation
   or inventory independent of the plan in fixture.
   A native Copilot session with the profile `validador` ed `0.0.21` You've read
   the criteria.
   test and synthetic evidence; marked one criterion as approved and another as
   not checked. The test was previously performed by the controller in another
   fixture, whose code and test coincide in hash with the session. Tree and
   observed index did not change. Shell, writing and URL they were disabled;
   authentication and inference network were available, without auditing
   The session does not prove its own execution or full validation.
   In manual application of `preparar-ferramentas` ed `0.0.21` installed in a
   fixture offline, help and `info opensrc` returned zero; `check opensrc`
   returned failure because the tool was missing. Queries did not create
   the local directory of `opensrc` and preserved tree, index and changes staged
   and
   unstaged observed. The test does not cover setup, installation, update, run
   or discovery
   per native client; package installation occurred before snapshot.
   A sub-agent consulted `sincronizar-agentes` ed `0.0.21` and proposed to check
   the collision before use `--force`, without running sync. In separate copy
   from
   fixture, the controller ran direct check and sync with Node 24: check
   It returned divergence and `--force` He refused a divergent index.
   configuration and compared human files were equal after both
   commands. A first attempt did not reach sync by incompatible Node;
   another was blocked by sandbox when accessing `/dev/null`The proof is not a
   native session does not cover all files, metadata or other conflicts.
   In a previous native session and separated from the same skill, the client
   executed
   check, sync without `--force` and new check; the index and observed human
   files
   remained the same, but sync changed `.git/info/exclude`. Installation
   of this fixture occurred before the creation of Git; the proof covers only
   one
   macOS session and does not detect reversed transient changes.
   In a consultation of `proximos-passos` ed `0.0.21`, the client indicated to
   prepare
   the project before resuming the PRD in draft. CLI; one
   separate control recommended `preparar-dev` for existing environment without
   that this difference, alone, proves error. Index and tree observed
   remained the same during the session after the init changed the exclusion.
   In later manual application in a synthetic Node library, `next --json`
   recommended `preparar-dev` And the test of the project passed.
   the Git and human compared files; the previous init preserved the index and
   o `.gitignore`There was no native client or proof of
   other design states.
   In the candidate, the skill began to ask for a concrete next step without
   anticipate product questions. In another session with the same PRD and
   request,
   the client indicated to complete and register the configuration without
   changing the tree
   observed. He did not formulate a question or appoint the skill; the shell was
   denied.
   A local package with the change installed and passed on `sync --check` one
   fixture Git. The sessions do not prove consistent behavior or causality.
   A CLI `next` now advises to provide evidence of approval also in the
   standard flow product steps and `run`; the selection of the stage has not
   changed.
   The next step suite passed 34 tests on macOS and 34 on Linux.
   local package confirmed orientation in three languages and intentions in a
   fixture,
   preserving index, `.gitignore` and compared human file. That does not make
   the recommendation a approval does not even prove the behavior of native
   customers.
   In another session, `implementar-backend` ed `0.0.21` changed a line with
   unstaged edition to meet a specific request and preserved the index and the
   human comment observed. The client informed that he could not consult the
   Git neither test; the controller checked two examples separately.
   the request did not mention spec, this session does not prove the gate de
   spec.
   In a session of `atualizar-documentacao` ed `0.0.21`, the customer preserved
   the existing text and added the test command present in the project.
   The controller ran this test before the session; the client did not receive
   the
   test and did not execute commands. Index and other paths observed remained
   same during the session, after init has changed the delete from fixture.
   In another session `implementar-backend`, the request linked the task to a
   spec in draft.
   client read the spec and skill of `0.0.21`, but changed the file without
   Spec approval or observed plan.
   Human observed; the line with unstaged editing changed. The client reported
   that
   He couldn't consult Git or test.
   In a session of `implementar-backend` with the candidate and the same
   request,
   spec and initial content, the client recognized the blocking and did not
   alter the
   tree or index observed. The history and kits of fixtures differed;
   the session does not prove causality or consistency.
   Denied.
   In a separate session, `implementar-spec` ed `0.0.21` also changed a
   line with unstaged editing after reading a spece in draft, without approval
   or
   The human index and commentary remained the same,
   but the unstaged diff has changed; the test does not cover consistency
   between sessions.
   In a session with the candidate and the same main data, the client read the
   the skill and the spec, indicated `configurar-projeto` And it didn't change
   the project.
   It covers a session with shell denied, not a universal technical block.
   In a consultation with `implementar-frontend` ed `0.0.21`, the customer read
   the spec
   e o HTML, recommended keyboard tests and screens and reported that it did not
   run
   tests or browser. Git and tree observed were the same in the query;
   the previous installation added a block to the exclusion of fixture.
   In a reading session with the skill `revisar-codigo` published in `0.0.21`,
   the client identified divergence in a synthetic calculation; the controller
   performed the test separately. The previous installation changed the
   `exclude`
   fixture location, while the session preserved the observed tree.
   In another session with the local candidate, `validar-adversarial` identified
   that
   a synthetic implementation accepted negative values.
   which did not perform tests; the controller confirmed the case alone in the
   Linux. They are proof of one session per skill, not of its complete flows.
   A session of the same skill in `0.0.21` also identified an entry
   negative without the required exception; the controller executed the case
   separately.
   The tree and index observed were the same during the session, after a
   installation that changed the delete of fixture.
   In separate manual application of the `0.0.21`, a synthetic suite identified
   Incorrect rejection of zero: three cases passed and one failed as expected
   Git and Node ran in macOS sandbox without network;
   index, configuration and observed changes remained the same.
   installation, native client, independent review or proof of integration.
   In another consultation, `usar-skills-externas` ed `0.0.21` read the skill
   and the
   catalogue, guiding on origin, license and revision fixed.
   preserved the tree and index observed, but did not install external skills.
   The previous installation also added a block to the fixture exclusion.
   In a session of `verificar-trabalho` ed `0.0.21`, the customer informed that
   did not perform tests, but marked a functional criterion as met by
   static inspection. The controller confirmed examples only after the session;
   The client did not receive this proof, a candidate version that prohibited
   the exchange of
   test required by inspection also received this classification, including
   after explicit reading. fixture did not define a test as required, then
   the contradiction with this orientation has not been proven.
   requires execution to approve behavioral criteria. In another session with
   explicit reading, the client marked as not verified the criterion whose
   A session doesn't prove discovery or consistency.
   An isolated skill consultation `git-fetch` ed `0.0.21` not more than
   authentication; the skill was not invoked and fetch was not authorized in
   session. In another authenticated advisory session, the client invoked the
   skill and
   read its source; shell and fetch remained disabled. The tree and Git
   observed did not change during the consultation, which does not validate a
   real match.
   In manual application of the skill extracted from the package, a remote bare
   fetch
   synthetic advanced the expected reference and preserved index, tree, HEAD,
   settings and changes observed. Git ran in macOS sandbox with
   denied network and local protocol; there was no installation or native
   client.
   abstract has been sanitized and there is no separate gross copy of the
   notices; effects
   transient and complete metadata have not been proven.
   A session with `criar-regra` ed `0.0.21` created a synthetic rule and
   maintained
   the tree out of destination and the Git observed.
   controller ran sync da `0.0.21`: a rule with `trigger: manual`
   generated Copilot instruction with `applyTo: '**'`. This requires global
   scope;
   the actual activation in the editor was not verified. The agent did not
   execute the sync.
   In the local candidate, the controller synchronized the same rule without
   generating this
   global instruction; explicit reference maintained `trigger: manual` and check
   The native activation goes on without proof.
   On the router, the Git rule states `model_decision`, but the Copilot
   instruction
   installed declares `applyTo: '**'`. The file was kept while the source and
   a safe migration is verified; its effective activation was not observed.
   In synthetic fixture, the `0.0.21` recreated the global note after his
   removal. With the note missing, the candidate's direct sync generated a
   explicit reference; update refused two catalogs in conflict.
   global point still present in another fixture, the direct sync of the
   candidate removed it and created an explicit reference; update also
   These trials don't prove migration to the router.
   In another synthetic matrix, sync preserved a global edited and
   also created an explicit reference; the global activation was not observed.
   Three updates refused catalogs. The matrix stopped in a human collision whose
   file received an additional block; previous text was observed as
   prefix, but there was no independent comparison of the other bytes.
   update was not executed. The controller's zero code does not indicate
   approval.
   In a session with `criar-comando` ed `0.0.21`, the created command described
   only the line JSON, omitting previous messages from the executable.
   started to request full output conference. In another session, the default
   output
   was described, but valid options before target were prohibited; guidance
   was clarified again. In a later session, the command described the
   positions and effects observed without that prohibition, but required npm for
   a
   direct call that does not require it. The skill started to distinguish the
   selector from
   bootstrap and target. In another session, the command correctly distinguished
   the
   prerequisites and options; the controller ran the selector with Node and
   without
   npm in PATH. Consistency between sessions has not been demonstrated.
   The executor's suite passed 29 tests.
   on each system observed, macOS and Linux. The first Linux attempt, with
   read-only volume, failed to require temporary directory and was
   repeated with tmpfs.
   In a skill session `executar-script` ed `0.0.21`, the customer consulted
   the plan and executed a synthetic script with two literal arguments;
   result JSON it was correct and the index and the observed changes were
   The answer summed up the output without the metadata lines, though
   the request did not require complete exit.
   session does not prove the installation of runtime or other customers.
   A skill session `git-diff` ed `0.0.21` consulted and distinguished changes
   staged and unstaged and an untraceable file, preserving the files and the
   index observed. The first fixture installation failed with diagnosis
   Git located; the second passed with locale `C`Two successful consultations.
   displayed sandbox warning about global ignore; the proof covers a session.
   snapshot deleted a fixture folder and detailed events were not
   archived for independent review. In a repetition with private events
   archived and snapshot without folder deletion, the index remained equal
   during the session, but its hash differed between the beginning of the
   controls and the end.
   The cause has not been proven; preservation throughout the window follows not
   verified. In a separate fixture, `git diff --binary` changed the cache of
   metadata in the index even with `GIT_OPTIONAL_LOCKS=0`A temporary index
   preserved the bytes of the main index, but a split-index query
   changed the mtime of `sharedindex`; there was no proof of integral
   preservation.
   two behaviors were reproduced in macOS and Linux in their own fixtures.
   A skill session `git-log` ed `0.0.21` read two commits history
   Client and controller used temporary index, and real index
   the fixture was the same between the hashes of beginning and end.
   macOS session; does not prove the method for split-index or linked worktrees.
   One session `git-status` distinguished branch, upstream, staged, unstaged and
   untraceable file; index and tree observed remained equal.
   shell isolation also allowed benign Git queries in commands
   compounds, in addition to `status` desired. The session does not prove
   split-index or
   Works linked.
   Another native session read the skill extracted from `0.0.21` and executed
   status in
   fixture with staged, unstaged, untraced file and upstream a commit to
   front. The controller confirmed the response and persistent snapshots;
   Global ignore access notices were produced by the sandbox. There was no
   package installation, proof of transient effects or other customers.
   In another fixture, `copilot skill list --json` listed a skill `git-status`
   extracted from `0.0.21` as project resource; an empty directory not to
   the command ran without authentication, network or access to personal data
   and
   preserved tree and Git observed. The skill was copied directly, without
   install the adapter; listing does not prove invocation or obedience.
   A second fixture confirmed the discovery of `git-fetch` by the same
   command, also with empty control and skill copied directly from `0.0.21`.
   The tree and Git observed remained the same; the test did not perform fetch.
   Another fixture installed a local copy extracted from `0.0.21` with the
   client
   Selected Copilot. Native listing, networkless and unwritten sandbox
   in fixture, presented 41 unique project names, equal to 41 names of the
   notes and sources in the skill index; the empty control showed
   zero project skills. Index, configuration, delete and gitignore
   observed remained equal during listing. The proof does not compare the
   path returned from each item, nor does it prove invocation, reading of the
   origin,
   activation or execution of the flows; installation occurred before sandbox.
   A repetition verified the 41 paths returned, the references to the
   sources, their bytes against the extracted copy and hashes of the installed
   state.
   The observed file and mode tree and the four compared Git files
   remained the same during listing.
   integral copy extracted in this repetition; discovery does not demonstrate
   reading the sources by the client or execution of the skills.
   No `talquee-ai-router`, an isolated and unnetworked native listing found
   the 41 paths and expected notes of the installed index.
   15 entries from `.claude/commands` as project skills; they were not
   The sandbox denied writing in the
   design, and index, configuration, exclusion and gitignore compared were
   The check didn't run skills or compare the whole tree.
   A later inspection found 18 Markdown files on `.claude/commands`,
   all with catalog-compatible name and reference and hash equal to
   installed status. Three share names with skills; native listing
   showed each name once, on the way to the skill, and the three commands guide
   use the corresponding skills. The remaining 15 were listed from the
   command directory. The state does not show authorship or behavior of
   invocation; it is not concluded that the three commands are accessible to the
   client.
   A consultation `git-worktree` ed `0.0.21` listed the only synthetic worktree;
   the controller confirmed the result and preservation of the tree and index
   observed. The proof did not perform creation or removal of worktree.
   In later manual application, a synthetic worktree and branch were
   created in the expected commit, with approved Node test. HEAD, config and
   observed diffs from the main tree became equal; refs and Git metadata
   Git and Node ran in macOS sandbox without network; no
   there was installation, native activation, removal or split-index test.
   In a session `git-branch` ed `0.0.21`, the client created a synthetic branch
   the current commit without checkout. HEAD, amendments
   and observed files preserved outside the new reference and its reflog.
   proof does not cover branch, split-index or linked workstrees exchange; init
   previous has changed the exclusion of fixture.
10. [-] **== sync, corrected by elderman ==:** recognizing strict legacy
    references without taking ownership or overwriting them, keeping the scope
    alert unverified. At kit checkout, check went from nine to four conflicts;
    the remaining four and outdated files still need revision. `0.0.21`, the old
    sync regenerated catalogs without updating the historical hashes; the
    candidate update refused divergence. In another fixture macOS, an extra
    human field in the catalog caused refusal and was preserved next to Git
    files and compared humans. The control without this field completed the
    update, preserved Git, README and human rule and updated catalog and state.
    init/sync old; do not prove its preservation, the complete tree, metadata,
    later sync or other platforms. A laboratory variant preserved the literal
    field and the proper rule in a fixture, without registering the mixed
    catalog as managed. Sync and new update returned zero, but checks remained
    unhealthy by the legacy marker in exclusion and coverage warnings. The
    variant depends on
    origem histórica externa ao pacote e não comprova inventário completo ou
    autoria; permanece fora do produto.
    Uma cópia posterior incluiu a compatibilidade histórica no pacote e foi
    exercitada em fixtures no macOS e Linux; os checks continuaram com status 1.
    A instrumentação encontrou numa fixture mínima uma consulta da raiz que o
    inventário não registrava. Uma guarda experimental restrita passou controles
    locais, sem comprovar cobertura completa, metadados ou Windows. Não foi
    integrada, e não houve perda de dados demonstrada por essa omissão.
    Um classificador experimental aceita casos ambíguos e permanece fora do
    produto; não há ainda reconciliação comprovada de dados humanos e mudanças
    concorrentes.
    A revisão de um protótipo também reproduziu perda de precisão em números
    humanos e falha na detecção de remoção staged; variantes posteriores seguem
    em laboratório e não substituem as verificações reais do instalador.
    Um modelo posterior preservou bytes fora do campo alterado nos controles,
    mas ainda depende de propriedade e staged informados pelo chamador; não
    foi integrado ao sync ou ao instalador.
    Um protótipo para campos humanos extras na raiz funcionou em sync da mesma
    versão, mas uma fixture de atualização da `0.0.21` apresentou diferenças
    nos grupos gerados de regras e scripts. O planner conservou dois conflitos;
    esse protótipo não resolve a migração e permanece fora do produto.
    Em outra fixture da `0.0.21`, o planner recusou um catálogo com versões
    staged e unstaged distintas; os arquivos e o índice observados permaneceram
    iguais. O teste não aplicou a atualização nem cobriu concorrência.
    Um protótipo posterior aplicou a migração em fixture sintética preservando
    dados humanos e Git observados; após ajuste adicional, o check da CLI ainda
    ficou não saudável pelo marcador legado no `info/exclude`. A cobertura de
    artefatos também gerou aviso não bloqueante. Os controles de
    staged divergente, campo gerado alterado, estado derivado divergente e
    alteração após o plano foram recusados. Falta revisão independente, prova
    de metadados e concorrência; o protótipo usa origem temporária e não é
    distribuível nem foi integrado ao produto.
    Uma revisão independente reproduziu no protótipo uma dependência de
    catálogo omitida do plano: um asset já coincidente foi editado após o
    planejamento e a aplicação prosseguiu. A edição humana foi preservada,
    mas o catálogo passou a referenciar o asset sem revalidá-lo. A guarda
    experimental passou a incluir esse asset como dependência: uma repetição
    independente recusou a edição posterior com `E_CHANGED`, preservando seus
    bytes e o índice observados. Outros insumos, atomicidade e metadados ainda
    não estão comprovados; a solução permanece fora do produto.
    Outro controle editou uma regra humana após o plano: a aplicação preservou o
    arquivo, mas publicou no catálogo sua descrição anterior. Assim, a guarda
    experimental ainda não cobre todas as fontes do catálogo.
    Um inventário experimental mais amplo detectou alterações sequenciais, mas
    não incluiu uma regra staged ausente do working tree: o plano continuou
    aplicável. O teste preservou o índice e não aplicou o plano. A revisão
    também identificou leitura de pastas irrelevantes e possíveis bloqueios por
    arquivos grandes; o inventário precisa de escopo e cobertura mais precisos.
    Uma guarda staged ampla demais também bloqueou uma fixture por arquivo em
    pasta humana irrelevante ao catálogo; índice e blob foram preservados.
    Mesmo após reduzir o escopo, um arquivo grande ignorado pelo builder na
    raiz de ferramentas continuou provocando bloqueio no protótipo.
    Uma revisão posterior evitou esses dois bloqueios nas fixtures anteriores e
    recusou a fonte staged ausente; os controles passaram no macOS e no Linux.
    Outra fixture ainda mostrou falso `E_STAGED` para arquivo regular irrelevante
    na raiz de ferramentas. A captura não comprova atomicidade nem Windows;
    a variante continua isolada.
    Em variante posterior, os controles recusaram fontes catalogáveis staged e
    ausentes e permitiram o arquivo irrelevante; seis testes passaram em cada
    sistema, macOS e Linux. O update sintético preservou os dados observados,
    mas o check continuou não saudável pelos avisos Git. A leitura de assets
    ainda é mais ampla que a necessária, e propriedade, metadados, concorrência
    e cobertura completa das fontes permanecem sem prova suficiente.
    Outra variante inventariou um asset grande sem ler seu conteúdo nos
    controles, mas o plano de update dessa fixture permaneceu bloqueado por
    conflitos de catálogos. Índice e arquivos comparados ficaram iguais; a
    prova positiva cobre somente o inventário, não a migração. Alguns assets
    podem ser lidos por outras etapas mesmo quando o catálogo só lista o nome;
    essas dependências também precisam ser comprovadas antes da integração.
    Em variante posterior, um update sintético com asset grande já registrado
    e staged preservou índice, blob e bytes comparados; a instrumentação observou
    duas leituras do asset pelo planejamento. Um asset novo ainda gerou conflito,
    e o check continuou não saudável por avisos Git. A solução segue isolada.
    Uma nova cópia completou update, sync, check e novo update sem alterações
    na fixture preparada; também recusou a alteração de um sidecar após o plano.
    Os ignores dessa fixture foram preparados antes dos snapshots, e um aviso
    geral permaneceu. A captura de leituras ainda é parcial; não comprova todos
    os consumidores, concorrência ou metadados e não foi integrada ao produto.
    Revisão independente encontrou regressão no diff experimental: sua cópia
    reverte a correção recente de diagnóstico de limpeza. Também observou que
    o asset lido não consta como dependência verificada no ciclo positivo;
    portanto o diff não pode ser aplicado integralmente.
    Em outro controle da cópia experimental, um template alterado após o plano
    de update repetido permaneceu intacto, mas o catálogo reteve a descrição
    anterior. A dependência desse fluxo ainda precisa ser revalidada.
    Uma variante posterior passou em 16 controles no macOS e 16 no Linux,
    incluindo recusa da edição posterior do template e um ciclo positivo de
    update e sync com asset novo em fixture preparada. A coleta de leituras
    ainda é incompleta, o inventário é conservador e não há prova de Windows,
    concorrência ou preservação de ACL e xattr. Continua fora do produto.
    No teste de staged igual ao working tree e diferente de HEAD, em macOS e
    Linux, a aplicação experimental preservou índice, refs, diff staged, blobs
    staged e trechos humanos observados;
    a inclusão de conteúdo do kit alterou o catálogo no working tree, criando
    uma diferença unstaged. O check da CLI continuou com aviso bloqueante.
    Na cópia diagnóstica, o identificador do bloco legado não correspondia ao
    caminho atual. Retirar o marcador apenas naquela cópia eliminou o aviso,
    mas não demonstrou propriedade nem autorizou remover regras existentes.
    Em uma fixture com estado fabricado, registrar como gerenciado o hash de um
    catálogo com campo humano permitiu ao sync removê-lo. Isso demonstra o risco
    de adotar o arquivo inteiro, não que a migração atual faça essa adoção.
    Em fixture sintética, o gerador e as fontes `0.0.21` reconstruíram os dois
    hashes históricos de `catalog.json` e `rules.json`. Isso não comprovou a
    propriedade das alterações posteriores. Uma variante de planejamento
    evitou adotar `rules.json` idêntico, inclusive com staged divergente, mas
    manteve o conflito do catálogo principal. Em outra fixture preparada para
    igualdade dos catálogos, update e sync foram aplicados preservando os
    arquivos e o índice observados; uma edição após o plano foi recusada. A
    variante não reconcilia catálogos divergentes nem prova metadados ou
    atomicidade e permanece fora do produto. A revisão independente identificou
    que a classificação precisa considerar também a propriedade registrada em
    `derived.catalogs` e o estado anterior divergente; a prova não cobre toda
    a árvore, `sync --check` ou sync direto. Controles adicionais confirmaram
    que registros derivados podem continuar presentes e que o protótipo pode
    descartar hashes históricos do estado principal. Nenhum catálogo foi
    apagado nesses controles, mas a perda de referência impede a integração.

In the pipeline review, three missing suites were classified. The classification
validation and 32 pipeline tests passed on macOS. `attr` e `acl`, ten metadata
tests passed; the scenario without `getfattr` runs in a separate environment. In
the full Linux matrix, the absence of these tools now fails the mandatory tests.
CRLF with divergent previous record and complete protection of attributes that
cannot be inspected.A later execution found a workflow test incompatible with
the metadata variable added to the IC step.The test was corrected to verify the
results of the test. `NODE_OPTIONS`, strict activation on Linux and installation
of `attr` e `acl`. The three release suites passed with 99 tests on macOS and
Linux ARM64; additional step check also passed on both systems. This does not
prove running on Windows or the remote output of pipeline. An additional fixture
confirmed on macOS and Linux that convert CRLF before or after `git add`
produces the same bytes of the file, normalized blob in
index and derived hash. These isolated data do not prove the origin of the
change; automatic update remains blocked until there is a solution that
preserves human and metadata editions. Independent revision was not performed
because the environment refused to create the subagent. In a fixed Git isolated
with npm version `0.0.21`, a real Codex client read the skill note `git-status`
and its origin; correctly identified a file prepared and changed again and an
untraceable file. The index, configuration and Git deletions kept its hashes. It
is a proof of a skill and a client, not the other features or the full
compatibility. In a fixture Claude isolated, a query in planning mode and with
disabled writing and shell tools received the way of the skill `criar-prd` and
identified pending preparation and product data. `0.0.21`; index, configuration,
exclusions, ignore and human code observed kept its hashes. The output records
the declared read, but does not provide here an independent tool trail;
it does not prove automatic discovery or the complete creation of the PRD. In a
second consultation, the client triggered `criar-prd` by name. The trail
recorded the loading of the note in `.claude/skills` and the reading of the
shared origin; the configuration state was missing and the response indicated
the preparation as the next step. Writing and shell were disabled, and the same
Git files and humans observed kept their hashes. This proof covers a skill and a
selection, not the other features or creation of PRD. `0.0.21` with Gemini CLI
0.67.0, `gemini skills list --all` in isolated profile did not list the local
skills without confidence in the folder. With confidence only for the fixture
process, listed the 41 notes in the `.gemini/skills` as enabled; the 426
observed project files kept their hashes. The listing proves discovery,
non-execution of skills or persistence of trust. The requirement and inspection
of the location were documented with official reference. 2.2.6 isolated, without
network and with the project mounted only for reading, the client listed the 11
profiles of the kit. The configuration returned to
the reviewer denied `edit`, `shell` e `subagent`; this does not test the
application of these permissions. After initializing a private server, the API
listed the 41 skill notes of fixture. Three immediate isolated queries returned
empty; a self-control was also missing in the immediate query, but was found on
the server already initialized. This contrast does not determine the cause
alone. The 425 observed files remained the same, without loop folder in fixture;
no test container remained active. There was no execution of the skills,
connection to the shared service or validation of the client installed on the
user machine. In another fixture, the client triggered by the name
`revisar-autorizacao`, `revisar-seguranca` e `planejar-qa` ed `0.0.21`. The
three responses indicated a synthetic failure of access between users; an
external control reproduced the behavior. The review sessions did not perform
tests, as requested. The authorization response came out in English and
classified the case as critical without proving real exposure. The candidate
began to guide language and distinction between proven impact and potential; in
a repetition, the answer came out in Portuguese and
reported no proven route, but still attributed high gravity to the code. The
observed hashes Git and humans did not change; this result does not prove
deterministic calibration or full audit of an application. In the same fixture,
the client also triggered `avaliar-arquitetura`, `avaliar-performance` e
`validar-adversarial` ed `0.0.21`. The responses identified the divergence of
the contract; performance was not verified, but the answer still qualified the
cost without measuring it. The adverse review attributed critical impact before
proving use or exposure. In the candidate sources, the two guidelines were
reinforced; a repetition did not qualify the cost without measuring and showed
the impact of security as conditional. The observed files kept their hashes. It
is a punctual sample, not a performance measurement or a complete audit. In a
synthetic fixture, the skill `corrigir-vulnerabilidade` ed `0.0.21` corrected an
access failure: before, two out of three tests failed; then, the three passed
and the Git files and humans observed kept their hashes. The session recorded
independent review and end gate pending; a proof
additional properties that release exceptions was left out of the test code. The
candidate began to require versionable test for additional corrected scenarios.
In another fixture with the scenario explained in the request, the session
included the test: it failed the original code and the four tests passed after
correction. Index and observed files remained the same; independent review and
gate were pending. Fixtures are hybrid and do not prove an entirely published
installation or a complete production flow. In the same fixture, the client
discovered by name the design and spec skills of the `0.0.21`But both suggested
PRD before unproven preparation. The roadmap session reached the turn limit. In
a copy with only the three candidate sources, the three queries indicated
`configurar-projeto` first; this does not prove a complete update or
deterministic behavior. In the roadmap query, the client tried to write a plan,
but the tool was disabled; the observed Git and human files kept their hashes. A
repetition after guiding the use of the saved selection identified `claude`but
The same Git and observed human data remained the same. It is a one-off test,
without ensuring that future responses are identical. Three independent sessions
also explicitly consulted `git-log`, `git-branch` e `git-worktree` ed `0.0.21`
in a fixture with branch `trunk` The results coincided with the Git conference
queries; the hashes of the index, configuration, exclusions, HEAD and two
observed files remained the same. The queries do not prove creation or exchange
of branch/worktree, automatic discovery of the skills, nor absence of transient
changes in other files. In two disposable copies with staged changes, sessions
`workspace-write` They tried to create a branch and a worktree using the skills
of `0.0.21`Both were prevented by the sandbox from creating the mandatory lock
in `.git`; no branch or worktree was created. Index, configuration, deletions
and the two observed files kept their hashes.
successful creation flow nor justify bypassing environmental protection. In
three additional sessions, `criar-agente`, `criar-comando` e `criar-regra` ed
`0.0.21` received requests without defined contract and requested decisions
before creation. The same hashes observed remained the same. The proof covers
only the initial query, not the creation, synchronization or discovery. In
another fixture, a session created a rule `model_decision` and updated the
index. The session used Node 22 and failed to synchronize: the kit requires Node
24+. In a copy of fixture, direct synchronization with Node 26 generated notes
for `.agents` e `.codex`, e `--check` and the native validation of sources
passed. Index, configuration, exclusions and observed human files kept their
hashes in copy; there was no native activation or synchronization by the agent.
In repetition with Node 26 explicit, the agent created the origin and attempted
synchronization, but the sandbox refused to write in `.agents` with `EPERM`. O
`--check` recorded two leads and four pending indexes. Git data hashes and
observed human files remained the same; catalogs and
The test remains incomplete. The candidate started to guide the selection of
Node 24+ already installed before requesting installation. A test with Node 22
confirmed the revised message; the requirement tests passed on macOS and Linux
ARM64. The orientation does not automatically search for other versions in the
PATH and does not delete sandbox limits. In the candidate, command and rule
skills have been adjusted to indicate that the manifest is generated and should
not be edited manually. The adapter suite passed macOS and Linux; it does not
run skills on native clients. Source verification has also passed Linux ARM64
with Node 24 and `markdownlint-cli2` installed in temporary container areas: 252
files, no errors. Checkout was set up for reading only; it is not proof on
Windows or Linux x64. The local candidate distribution suite passed on macOS and
Linux ARM64: Packed a filtered copy, installed the offline tarball and exercised
`npx`, new project, existing project, symbolic destination update and refusal.
It does not prove the package published, all existing projects or Windows.
An additional Linux matrix ARM64 used the candidate tarball `0.0.30` in 80
synthetic projects, with four processes and without network. He recorded 60
cases verified, none with failure and 20 not verified: 12 by scope Claude and
eight by metadata Cursor. In 80, the human files and Git data observed remained
preserved; the provenance observed remained stable. `not-verified`, without
proving execution of clients or skills, system metadata, all transitory changes
or package published. Another Linux matrix ARM64 and Node 24 used a new local
candidate tarball `0.0.30`, SHA-256
`c0b79afaf619ce62c97aaa4de04f8f4790c9d80ca336d84bbe49b993489ee5c0`, in 1.000
synthetic projects: 500 new and 500 existing. 1.000 reports indicated
preservation of human files, references and Git data observed.The monitored
provenance remained stable and tarball files checked at the end coincided with
the extracted copy.The unverified include 208 cases with Claude scope and 132
with Cursor metadata, with 16 cases.
in both groups. The proof does not run skills or native clients, does not cover
Windows, complete metadata or transient changes, and does not validate the
published package. Individual reports remain in temporary storage. An additional
Linux matrix ARM64 and Node 24 tested rounds 26 to 38 with another local tarball
of the candidate `0.0.30`, SHA-256
`87762b5741e8938c70a08b9947fc4d233cff45f9fd8f9f3bba0d70d7f127ab53`, without
external network. There were 520 synthetic projects, half new and half existing:
376 structurally verified, 144 unverified and no classified faults. The 520
reports recorded preservation of human paths and Git observed. Among the
inconclusive, 84 included Cursor scope and 68 Claude scope, with eight in both.
The monitored provenance passed; 687 entries of the extracted package coincided
in type, mode and content with tarball before and after matrix. Tarball precedes
subsequent adjustments in roadmap and backend skills. The proof does not
validate the published package, native execution of skills or customers,
Windows, all metadata or transient changes. Reports
Individuals and their fixtures remain in temporary storage. In the same fixture,
two independent sessions parallel executed the skill `git-diff` and the explicit
reading of the profile `revisor`. The first distinguished the prepared lines
from the unprepared ones; the second identified a subtraction that contradicted
the sum contract, with file, line and example. The hashes of the files of the
fixture, index and configuration Git remained the same. The explicit call of the
profile does not prove its discovery or native delegation. Two other sessions
tested `criar-prd` with no product data and `implementar-spec` with indefinite
format and authorization. Both requested information and indicated missing
prerequisites without writing in fixture; the observed hashes of index,
configuration and spec remained equal. The proof covers only the initial step,
without approval or full implementation. In another synthetic fixture with the
published package `0.0.21`, the route client `.claude` discovered and invoked
`criar-prd`, read the source, model and state and created a PRD The requirements
reported and nine questions appeared;
o README received an addition while maintaining the human text. Index,
configuration, exclusions, `.gitignore` and state observed after installation
did not change. Controls with synthetic files outside fixture confirmed the
refusal of reading and writing tools; shell and MCP They were unavailable.
Subsequent sessions answered questions and maintained the PRD in draft until a
simulated explicit approval. PRD has been marked as approved, the README updated
and a roadmap created in draft. Other doubts arose in later rounds, and an
acceptance criterion needed to be added. The same Git files and the observed
state remained the same in these sessions. There was no independent review,
execution of inventory scripts and synchronization or application tests. The
proof did not compare the `info/exclude` before and after installation and does
not show no transitional changes. In a new synthetic fixture, the candidate
skill added the orientation of grouping doubts and criteria of acceptance. PRD
in draft; README observed
The fixture combined the published installation with this single candidate
skill. There was no comparative control equivalent, new answers, approval,
independent revision or execution of scripts; the result does not guarantee that
all doubts appear in the first round. PRD approved by simulated request, a
native session invoked `criar-spec` ed `0.0.21` and refused to create the spec
for the absence of UX/UI and approved design. Git's observed hashes, README,
PRD, roadmap and state remained the same; no writing was recorded in the
session. The answer treated the preparation as completed based on the declared
state, without demonstrating its evidence, and proposed questions of future
steps. There was no inventory by script or proof of the creation of a valid
spec. In copy of fixture, the candidate source of `criar-spec` was natively
activated: it treated the preparation as unproven, reported that it could not
perform the mandatory verification, did not anticipate product questions and did
not write to spec. The observed hashes of the same files and candidate source
coincided
before and after. The request mentioned the lack of additional evidence and was
not identical to the previous session; the test does not prove that the script
would work nor the skill behavior with valid preparation. PRD approved by
simulated request, a skill `criar-ux-ui` ed `0.0.21` was natively invoked and
created a draft document with 14 questions grouped. PRD, roadmap, state and
source observed kept the hashes; README The session did not have shell or
reviewer and pointed out that README, roadmap and state still did not reflect
the new document. No answers, approval of UX/UI or full flow; the preparation
was declared in fixture, but not proven by script. A later session responded to
the 14 synthetic doubts, updated only the draft of UX/UI and grouped nine
additional questions, including possible conflicts with the PRD. Git's observed
hashes, README, PRD, roadmap and status remained the same. Approval and
independent review remain pending; the session does not demonstrate full tool
execution or flow.
In a copy prior to the creation of UX/UI, the candidate source of this skill
identified the preparation declared without evidence, suspended the work and did
not ask questions of UX. The files and the index observed kept the hashes, and
did not arise the document of UX/UI. The request explained the absence of
additional evidence; without shell or independent review, the test does not
prove the candidate's positive flow or his/her performance in other contexts. In
a fixture of authorization with intentional defect, three parallel sessions
consulted `revisar-autorizacao`, `revisar-seguranca` e `planejar-qa`. The two
revisions identified non-owner access; the security review also observed undue
equality between missing identifiers. QA proposed negative cases. The observed
hashes of the file and Git data did not change. They are punctual evidence
without demonstrating full scanners, corrections or streams. In three synthetic
copies with sources identical to those of the `0.0.21`, native sessions
activated `avaliar-arquitetura`, `planejar-qa` e `avaliar-performance` no
writing tools. The observed hashes of Git files and data do not
Architecture pointed conflict between scenario and PRD; performance reported
that p95 was not measured. QA proposed tests without claiming execution, but did
not record the conflict. The QA candidate source began to request this
conference; in another native session with the same request and fixture, she
identified the conflict and distinguished criteria derived from approved
decisions. The observed hashes remained equal. A repetition does not prove
determinism; the three complete flows remain pending. Sessions were independent,
non-subagent processes. In a positive fixture with documents, spec and plan
approved by synthetic requester, `implementar-backend` ed `0.0.21` created a API
in memory and testing HTTP without changing Git paths and observed documents.
Nine tests generated passed in Linux container without external network. An
additional proof with non-empty title above 64 KiB failed: a API 413 returned,
although the synthetic spec had not set this limit. The implementation informed
the additional decision, but did not clarify it before writing. The candidate
skill started to ask for the decision on absent limits; this change has not yet
been proved in flow
positive spec and the original session did not run tests or independent
revision. In another existing project fixture without spec, the candidate skill
identified the limit without contract and asked for a decision before writing.
After synthetic authorization to limit the body to 1 MiB, changed the server and
tests. Thirteen tests HTTP have passed in Linux container without external
network, including 70 KiB title and border limit; the files executed coincided
with hash generated. Git, README and other paths observed remained the same. The
sessions did not have shell, they did not perform configuration verification or
independent review; the proof covers a single correction, not the spec flow. In
another fixture with documents and plan approved by synthetic requester,
`implementar-frontend` ed `0.0.21` created HTML, CSS and local JavaScript. In
headless browser, a separate check ran empty state, error for empty entry or
only spaces, inclusion by Enter and button and keyboard removal. In viewport 375
× 812, a long title did not produce measured horizontal scrolling; the consulted
console did not record errors and the three requests observed
The 11 Git paths and monitored documents kept their hashes. The implementation
session did not have shell or browser and did not generate automated tests;
there was no independent review, reload test, screen reader, physical mobile
device or proof in other browsers. `0.0.21`, native sessions invoked
`criar-design-doc` e `gerenciar-roadmap`Design refused to write without UX/UI
approved. The roadmap query did not write, but marked preparation as completed
only based on the stated state. The observed hashes of Git and documents
remained the same. With a candidate orientation not to complete preparation
without proof, a repetition presented caveat but still used `[x]`; a second
orientation marked the stage as pending and indicated `configurar-projeto`. Both
tests were punctual, without shell; the change was applied to the candidate
source after this test and does not guarantee determinism. In three other
synthetic copies, the published sources of `implementar-backend`,
`implementar-frontend` e `revisar-codigo` have been activated
in independent sessions. implementations stopped due to lack of approved spec
and design; the review identified a subtraction in place of sum. the sessions
did not register written and the observed hashes remained equal. the review
generalized the defect for any second operating different from zero, without
considering special values and rounding; the candidate skill began to ask for
limits of assertions. there was no full implementation or independent review,
and the controls cover only the paths observed. in a repetition with the
candidate source, the review continued generalizing the error for all finite
numbers with second operating not zero. `a = 1e20` e `b = 1` produced the same
result for sum and subtraction by rounding. Therefore, the change did not
correct the problem in this test; the observed hashes remained the same. Even
after explaining the requirement of proof and rounding, a second repetition with
the candidate returned to make false generalization. Validation remains pending;
the instruction does not guarantee the correction of the analysis.
examples when there is no general proof, three independent sessions repeated the
scenario: one again stated that all finite operating seconds do not differ, one
qualified the range as general and the other limited the impact to the examples.
The three identified the defect and the observed hashes remained equal. There is
no guarantee of universal accuracy or execution of the function in these
sessions; the counterexample was executed separately. `0.0.21` They've called
`validar-adversarial` e `verificar-trabalho` on this defect and a report
describing the counterexample. Both distinguished the defect from the refuted
generalization and reported that they did not reproduce the execution.
`avaliar-arquitetura`, `avaliar-performance`, `validar-adversarial` e
`modelar-ameacas` in synthetic fixtures. The performance was correctly recorded
as not measured; the other analyses identified limits or violations of the
synthetic contract.
The observed hashes of Git files and data remained the same. There was no load
proof, real application or full flow of these skills. Four independent sessions
explicitly read the profiles `arquiteto`, `engenheiro-qa`, `auditor-seguranca` e
`analista-performance` ed `0.0.21`. Architecture and security identified the
divergence of the synthetic contract; QA executed eight local cases, of which
four failed in defective fixture; performance remained unchecked without load
and measurements. The observed Git files and data kept their hashes. Explicit
reading does not prove discovery or native delegation of the profiles. Another
four sessions read explicitly `documentador`, `planejador`,
`especialista-backend` e `especialista-frontend` in the face of an incomplete
spec. They identified pending decisions and prerequisites; index, configuration
and spece observed did not change. `implementador` e `validador` they were
explicitly consulted for the same spec: both identified that she was not ready.
`0.0.21` also mentioned the prescriptive Git flow treated in the candidate.
Index, configuration and spec observed remained equal. `revisor`, there was
explicit consultation of the 11 profiles. In subsequent synthetic sessions, each
of the 11 profiles of `0.0.21` was selected directly by native option `--agent`
and read its source, whose hashes coincided with those of the package. A
non-existent name was refused. The observed hashes of Git files and data
remained the same; the sessions only had reading tools. The performance analyst
reported no measurement; the implementer stopped for lack of spec. Reviewer,
backend specialist and validator identified the synthetic defect, but
misgeneralized its numerical range. The evidence does not demonstrate delegation
by another agent, complete flows, writing tools, execution of tests or
determinism. `0.0.21`, actual consultations with `criar-design-doc`,
`criar-ux-ui`, `gerenciar-roadmap` e `criar-spec` identified gaps in a synthetic
spec. In unproven preparation requests, the first three recommended PRD
before `configurar-projeto`; `criar-spec` indicated the preparation first. With
another request that explained the lack of preparation, both the `0.0.21` how
the design and UX skills candidates indicated `configurar-projeto`. The roadmap
candidate received explicit instruction for this order and, in a fixture
consultation, indicated the preparation. Fixtures and requests vary; the results
do not prove deterministic behavior or integral migration. In the preparation of
fixture, the `0.0.21` interpreted a Docker query blocked by the sandbox as
inactive daemon, although a query outside of it could access it. The candidate
distinguishes successful, inconclusive, unsolicited and executable query missing
from PATH. `--no-docker-probe` avoids calls to potentially remote context; older
booleans remain. Targeted tests have passed on macOS and Linux without Windows
proof. The change has not yet been published or migrated. CLI rejects unknown
options before scanning; the test also runs the selector and uses a synthetic
executable to verify that it is not called.
With the actual catalog, another proof intercepted selected process and network
APIs during diagnosis without scanning; controls specifically confirmed
`spawnSync` e `https.request`. It passed on macOS and Linux, without proving the
other intercepts, all forms of access to the system or running on Windows. After
review, the candidate orientation distinguishes beginning of product of
preparation of execution of existing project. In a synthetic query, the first
action for local execution was `preparar-dev`, with index and files observed
intact. The subsequent textual revision found no conflict in these criteria; the
complete flows were not executed. `implementar-spec` also exposed a prescriptive
Git flow in the `0.0.21`. In the candidate, the skill started to respect the
existing branch, allow work without remote, condition commits and push to the
authorization and protect preexisting staged. `trunk` without remote preserved
index and file; execution stopped due to absence of mandatory documents without
proving full implementation.
ambiguity in the configuration sequence; the instructions were adjusted. `trunk`
Has been `0.0.21`, but six skill sources were replaced by the candidate: design
doc, UX/UI, prepare-dev, next steps, roadmap and implement spec. The version
status does not prove that all the skills used in it are from the published
package. Git fonts and agent creation, command and rule used in the above
queries coincide with the package `0.0.21`. In a synthetic fixture with spec and
plan approved in the request, the skill source `implementar-spec` has been
restored to `0.0.21` and implemented local sum; two tests passed and index,
configuration, exclusions, HEAD and observed human file kept its hashes. The
fixture still had two candidate sources (`INSTRUCTIONS.md` and environmental
diagnosis), therefore does not prove a flow with installation fully `0.0.21`.
The session log contains a failure to create subagent; its independent revision
statement could not be confirmed by this record. A later independent session ran
the tests, pointed specification gap for overflow and missing combinations in
the
suite, without invalidating the verified examples. The external snapshot proves
the equality of the observed files, not all transient effects. The candidate now
advises to keep the review pending when there is no verifiable reply from the
reviewer and clarifies that the seal validates the consistency of the data,
without proving the occurrence of the review. This is an instruction, not a
technical guarantee against false filling of the report. Structured outputs of
the gate also include `reviewVerification: "not-verified"` ed `seal`, `check`,
`check-commit` e `check-merge`. Field is additive; does not authenticate review
or change report compatibility. Mix candidate skill with `proximos-passos` ed
`0.0.21` revealed divergent order, which requires attention in the migration of
versions, not yet proven. After aligning the two candidate skills, a new static
review found no conflicts in these criteria; it does not replace a real upgrade
or implementation. In 40 more synthetic macOS projects, using the local
candidate and different combinations of customers, all the predicted commands
returned success and the results of the project were compared to the results of
the project.
Human files and monitored Git data remained preserved. The matrix classified 36
cases as structurally verified and four as not verified by Cursor scope
metadata. There was no classified failure, but the overall result remained
unverified. The proof does not execute native customers nor covers all
transitory changes or metadata of the system. The matrix now detects divergent
sidecar frontmatter cursor installed when both belong to the recognized byte
subset and sidecar coincides with the package and state. Equality does not
promote the scope to be verified; YAML The repetition of 40 projects, prior to
the new measurement, kept 36 structurally verified and four unverified, with
human data and Git observed preserved. The matrix now measures the presence and
hash of the Cursor sidecars at the beginning and end; tests detected alteration,
inclusion, removal and symbolic link. This does not detect reversed transient
changes, does not authenticate the package and does not prove the scope or
activation in the client. The source reading requires a valid Cursor policy,
refuses links in the
paths observed and recheck directories during reading. Specific tests passed on
macOS and Linux; protection does not eliminate all directory exchange races and
still needs validation in Windows. An independent revision identified a specific
window in the sidecar enumeration: concurrent directory exchange can reach an
external tree before refusal. Comparing names without distinguishing box can
also include additional files on systems that distinguish box. These limits
remain pending; the matrix should not be treated as isolation proof. Integration
tests use temporary filtered copy. Synthetic cases have confirmed deletion of
local data in box variations, preservation of README status and rejection of a
directory that uses that name. It is not claimed that the copy reproduces the
published package in full. An additional test confirmed that synthetic links to
external file and directory are not copied; it does not cover races between
inspection and copy or Windows junctions. The investigation found that the
Cursor sidecar of the Git rule marked it as
always active, while the source uses the agent's decision. The candidate aligned
the sidecar to this trigger, according to the [Cursor
documentation](https://cursor.com/docs/rules), and reinforced the rule to
interrupt queries without proven safe method. A generation test preserved the
bytes of the main index of fixture; it does not prove activation in the client
or metadata of all sidecars. `0.0.21`, the Cursor note, the Git rule and its
sidecar coincided in SHA-256 with a synthetic installation of the published
package. Pointing and sidecar use global application, while origin indicates
decision by relevance. Configuration has been observed; native activation in the
user client has not been proven or changed. An isolated attempt with the user
client CLI Cursor, read-only project and local endpoint without real credentials
stopped authentication before evaluating rules; therefore it does not prove
native activation nor uses user settings. The existing Cursor point in checkout
remains outdated because the `sync --check` it presents other conflicts; it has
not been overwritten.
fixture also gives canonical reference, authoring instructions and interruption
of queries without safe method. `0.0.21`, o `doctor` of the candidate `0.0.30`
identified eight conflicts in existing client rules and a shared deletion
marker; also indicated 52 outdated items. The query ended with pending status.
Before and after it, the index hashes, `.gitignore`, `.git/config` e
`.git/info/exclude` no conflict has been resolved or rule changed in this
verification. `doctor` published package `0.0.21` returned success in the same
project and preserved the same hashes; this result does not prove the individual
execution of the features nor a complete upgrade. The candidate also began to
recognize the legacy marker when the deletion file starts with BOM UTF-8. In
fixtures, the diagnosis preserves exclusions and index; this correction does not
remove the marker or resolve the conflict of the router. A new execution of
migration from the published tarball `0.0.21` covered nine fixtures: eight
updates finished, the Claude selection presented eight
conflicts and the nine `sync --check` remained blocked by the legacy marker.
`init` history has changed `.git/info/exclude` in the nine fixtures before the
update. The report does not prove preservation of all metadata or successful
migration. The nine legacy deletion tests passed again on macOS and Linux ARM64,
including a worktree linked with different indexes and truncated or altered
blocks. Protection remains conservative: recognizing the marker does not prove
authorship or authorizes to remove its rules. `sync --check` e `update
--dry-run` ed `0.0.21` have returned success without planned changes or
conflicts; `agents` e `next` The same Git hashes remained the same after the
consultations. The 41 skill files and 11 installed agents coincided in SHA-256
with the published package; byte comparison does not prove execution. The
planning associated the eight router files with the reason for unchecked
metadata and kept the previous Git hashes. An attempt to take this
reason for the list of conflicts was removed: independent review identified that
a structural barrier may have its motive replaced in the planning.The current
version shows the record of preservation associated with the same path as
observation, without stating that it is the only cause of the conflict.The eight
conflicts of the router and the verification of other barriers remain pending.An
additional fixture in macOS and Linux proved that a symbolic link in the rule is
identified and preserved, including its external destination; this isolated case
does not eliminate the hypothesis for other barriers and paths of planning.With
previous records of file or block, tests of `doctor` e `update --dry-run` They
also returned. `E_SYMLINK`, preserving the target, state and Git data observed
in macOS and Linux. The refusal precedes the diagnosis of preservation; it does
not demonstrate the behavior of other structural barriers.

Results, catches and temporary projects are outside the Git. Register here or on
the roadmap the evidence, pending and actual limits of each step.

[reading-pt]: ../../../tasks/evolucao-plataforma/TASKS.md
[reading-en]: TASKS.md
[reading-es]: ../../../es/tasks/evolucao-plataforma/TASKS.md
