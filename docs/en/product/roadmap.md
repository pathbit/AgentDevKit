---
description: "Published deliveries, specifications and next steps of AgentDevKit."
status: vigente
language: en
---

# Roadmap

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

AgentDevKit shares resources between agents and installs them in new or existing
projects, preserving team files. The work follows product, experience, design,
architecture, roadmap, spec, implementation and review. [PRD](prd.md), a [UX of
CLI](ux-ui.md) e o [technical design](design.md) are registered as approved;
this does not replace the tests of each delivery.

This roadmap organizes what has already been specified and what remains to be
checked. `[x]` identifies a **release published**; does not mean that all the
criteria of the specs have been audited again. `[-]` indicates work in progress;
`[ ]`The results depend on the evidence and the environment indicated, not just
a marking in this document.

## Published deliveries

The releases of `v0.0.1` a `v0.0.35` are listed in the [GitHub][releases]. O
[changelog][changelog] details each version; the table groups the deliveries to
facilitate reading. The versions record historical behavior and do not replace
the latest decisions of the project.

| Status | Versions | Delivery | Related specifications |
| --- | --- | --- | --- |
| [x] | 0.0.1–0.0.3 | Distribution, selection of customers and shared sources. | [0.0.1][v1], [0.0.2][v2], [0.0.3][v3] |
| [x] | 0.0.4–0.0.6 | Project structure, examples, records, license and presentation. | [GitHub Packages][packages], [0.0.4][v4], [0.0.5][v5], [0.0.6][v6] |
| [x] | 0.0.7–0.0.10 | Existing projects, preservation, coexistence and two registers. | [0.0.7][v7], [0.0.8][v8], [0.0.9][v9], [two registers][dual], [0.0.10][v10] |
| [x] | 0.0.11–0.0.13 | Local security, additive integration and evidence in real projects. | [safety][security], [integration][additive], [real projects][real] |
| [x] | 0.0.14–0.0.16 | Denial root preservation, specialists and portable IC. | [Ignore the project][project-ignore], [development][development], [IC][ci] |
| [x] | 0.0.17–0.0.21 | Status migration, synchronization, ignore historical location and tags. | [status][state], [sync][sync], [Ignore customers][client-ignore], [tool][tool], [tags][tags] |
| [x] | 0.0.22–0.0.23 | Discovery, preservation, destinations and order of implementation. | [discovery][discovery], [destinations][targets], [order][order] |
| [x] | 0.0.24–0.0.27 | Protection of human content, review, index and limits of Git consultations. | [discovery][discovery], [sync][sync] |
| [x] | 0.0.28–0.0.30 | Preparation and execution of scripts, bootstrap and project matrix. | [development][development], [discovery][discovery] |
| [x] | 0.0.31–0.0.33 | Recovery log, criteria review and adapter migration. | [recovery][recovery], [daily][journal], [scope Claude][claude-scope] |
| [x] | 0.0.34 | Guided journey and references to methods already present in the project. | [guided experience][guided] |
| [x] | 0.0.35 | Inventory and documentation journey of existing systems. | [legacy documentation][legacy-doc] |

A [initial spec][v1] organizes the first delivery; the others are in the [Specs
index][specs]. An approved spect registers scope, does not in itself prove that
its criteria continue to meet all versions or customers. [specs
control](spec-audit.md) brings together the audit status of each.

## Priorities and to-dos

| Front | Next check |
| --- | --- |
| Preservation and recovery | Revalidate the criteria of the recovery specs with Git evidence, metadata and competition for each platform. [Control of specs](spec-audit.md) |
| Customers, commands and resources | Check for changes in discovery, metadata, and compatibility with the affected customer and test preservation when updating existing facilities. [Compatibility](../kit/COMPATIBILIDADE.md) |
| Documentation of existing systems | Check the link between inventory, code behavior and flow proof. [Guide](../guides/documentation.md) |
| Pipeline and distribution | Run the candidate commit proofs and compare the approved artifact in both registers when there is a new version. [Maintainer](../maintainers/maintenance.md) |

## Dependencies for a next publication

1. Complete the adjustments and resolve the pending criteria of the affected
   specs.
2. Test the final state and record evidence, limitations and independent review.
3. Approve the IC matrix and verify the candidate artifact before publication.
4. Set the next version and publish release and packages associated with your
   tag; compare the published artifacts and test their installation in both
   records.

No future version or date is assumed. The approval of a spec or the existence of
a tag does not replace the tests of the change in progress.

## Validation historical record

The records below preserve results, hypotheses and pending findings observed in
previous candidates. Mentions to a checkout, local status or IC refer to the
context of each trial. Use the above fronts and evidence of the corresponding
version to decide what still needs to be verified.

### 1. Preservation and reliability

- [-] Validate and deliver the local correction of the divergence between the
  sync of the CLI and the direct synchroniser. The candidate reconciles the
  observed transition by adding metadata; blocks the ambiguous states covered by
  fixtures, including with `--force`, and revalidates the registered
  dependencies for this reconciliation before and after backup. This does not
  guarantee atomicity after last reading. Regression tests cover Claude, Codex,
  Gemini, human content and index staged in fixtures; they integrate the
  portable pipeline profile. Duplicated references are not repaired
  automatically. The changed version still needs IC in Windows, migration review
  and validation before publication; it has not been applied to the router. A
  simulated reading failure of the project has also revealed pre-existing
  diagnosis with scope `staging` Incorrect; code and path were maintained. The
  migration review also identified empty directory cleaning without proving its
  creation by the operation; the preservation of this case needs proof. Git
  preservation suite passed 140 tests on macOS and 139 on Linux; respectively
  one and two cases were skipped by platform dependencies.
- [-] Check integration of [recovery
  records](../specs/registro-recuperacao/SPEC.md), do [disk
  journal](../specs/diario-disco/SPEC.md) and [backup and
  manifesto](../specs/manifesto-recuperacao/SPEC.md) In the installer and sync.
  A to-do in the journal blocks new mutations until explicit resolution. The
  first isolated tests verified the refusal of owner or incompatible mode and
  the detection of observable changes during reading. ACLs and ancestors
  exchanges require own verifications.
- [-] Fix temporary creation not to enlarge existing file mode; a
  [spec](../specs/sync-permissoes/SPEC.md) records evidence and limits.
- [-] Conclude and review local changes of `init`, `update`, `sync`, diagnostic
  and audit. Preserve human files, staged content, index, Git configuration and
  `.gitignore` The project; test collisions, migrations, links, path aliases,
  faults and recovery. The direct query shows conflicting paths and the
  candidate Git subprocesses disable inherited tracking without changing the
  configuration. Exclusion queries, index and staged changes use stable language
  in the subprocess to recognize Git's absence; unexpected signals and errors
  continue to block. Exclusion and index tests passed on macOS and Linux with
  localized messages; Windows and other Git queries still need specific
  verification. A local tarball also passed `init`, `update` e `sync` in three
  Linux fixtures with Git in French, without repository or with staged index;
  were not tested registry, `npx` or Windows in this test. Fixtures and
  independent review cover trace and Trace2 in macOS; local tests have also
  passed on Linux. This does not prove absence of other external effects. At
  current checkout, `sync --check` identifies nine preserved conflicts:
  five Claude rules without proven property, a Git reference that can
  continue globally active and three catalogues without property history.
  After recognising entirely identical references without adopting them, the
  consultation
  It's over. 1.077 to 453 outdated leads and maintained nine conflicts and
  a legacy local deletion. In the previous version, a fixture discarded a
  Unknown historical record. The integrated adjustment covers the same spelling;
  reconciliation of aliases and migration still needs work.
  At the local candidate, `doctor`, `sync --check` and the direct sync identify
  file record removed without input in the installed state when
  the consultation reaches the diagnosis. `sync --check` Keeps the observation
  if
  planning fails after reading; previous errors can still hide it.
  The local candidate preserves unknown records by the same spelling and
  blocks collisions on target; fixtures cover selection, `--force` and blocks
  Aliases between records and metadata follow without complete proof.
  A review confirmed in synthetic fixture that migration of `estado` recreates
  a correlated file, but saves the old record and indicates how
  modified. The same occurs at the base; an experimental guard failed with
  `Derived.json` in insensitive volume to the box. Another refused this case and
  allowed independent migration and was integrated as a conservative blockade;
  automatic reactivation and aliases between records remain pending.
  In a fixture with coexisting file and block records outside the selection,
  the candidate preserved the three records and allowed independent operation;
  the natural origin of this state has not been proven.
  A prototype for aliases blocked physically distinct Unicode paths;
  an attempt to reduce the block added block in human fixture and
  preserved text and index, as the contract allows.
  frontmatter and does not prove discovery or preservation of metadata.
  After integration, a local tarball passed offline installation via `npx`,
  new design, existing design and macOS update. The proof does not cover
  published registrations do not prove all aliases or metadata.
  In eight fixtures of the npm version `0.0.21`, the Git paths and human content
  sampled passed the comparisons of the update. Claude blocked in eight
  Legadas rules; Codex, Copilot, Gemini, OpenCode and Cursor updated, but
  Everybody kept it `shared-ignore-legacy` check. Codex variant with rule
  Claude also reported unchecked activation.
  `info/exclude` In the eight fixtures, this does not allow to remove existing
  rules.
  A prototype update preserved the rules and their sources in two fixtures
  Claude, but changed Git skills referenced by them.
  with warning despite pending; lack to set an explicit status. Do not prove
  Behaviour preservation and stays out of the kit.
  Compare candidates and preserve content before solving; do not force sync.
  A specific suite passed on macOS and Linux with deletion markers
  old integrity, altered, truncated and multiple, in addition to worktree
  linked. It compares Git content and indexes; legacy patterns continue
  active and proof does not cover metadata from file system or Windows.
  The candidate blocks paths affected by nested Git or gitlink, including
  backups; isolated proofs cover external and internal indexes, submodules not
  related and detection during application. Review and validation in systems
  supported remain necessary; protection is not atomic. sync chooses
  backup name before querying the index, allowing sibling submodules and
  refusing matching gitlinks, including missing on disk. Evaluate the same
  false lock on installer. Sync backup creates files exclusively,
  copy in limited blocks and check identity and hash before continuing;
  failure in trying to create folder or during copying inform your path
  It doesn't fix ancestors or eliminate exchanges.
  after last check. Set and test policy
  reading and generation from sources that are in a nested Git;
  the current protection covers mutations, does not prevent this reading.
- [-] Validate [conservative
  recovery](../specs/recuperacao-conservadora/SPEC.md) The application prepares
  the previous copy and records the operation before the mutations. After a
  failure, it preserves the public paths and requires explicit revision of the
  partial project before resuming the changes. Acceptance depends on the results
  of the matrix. Proofs and corrections of competition during the application
  follow as separate work. The full profile performs regression in strict mode.
  The investigation began with human substitutions removed or overwritten during
  rollback, including after updating and with different content. [historical
  spec of rollback][v8] records the previous contract. During the investigation,
  the installer started refusing exactly duplicate paths and rechecking paths
  and actions after backup. Fixtures cover creation, update, removal, and mixed
  changes. This check covers exact names until the time of the last conference.
  A static review identified that this control did not compare changes in the
  bytes of the plan.
  The candidate refuses actions incompatible with the content or state
  previously informed, before the application; eight synthetic scenarios passed
  in macOS and Linux. Calculated properties are only evaluated during execution.
  To add or remove block in divergent staged content, it also
  repeats the preservation check with the state and the bytes observed in the
  Application. Markdown and withdrawal add-on cases TOML with staged and
  not staged passed on macOS and Linux; verification does not prevent change
  later from the plane itself in memory.
  For these blocks, the candidate validates and publishes a private copy of the
  proposed bytes; migration and other actions still do not use this mechanism.
  In Gemini, adding and removing a block can reset the value TOML of
  `prompt` and keep extra line breaks or a previously absent assignment.
  In six examples, an independent parser confirmed that the return did not
  preserve
  either bytes or the original value of the document.
  metadata in the block passed 1.024 variations of the four string forms and 256
  cases without `prompt`, with independent parser.
  distinct projects; they still do not prove property, legacy or integration.
  The local Gemini charger 0.67.0 accepted the applicable internships in five
  fixtures isolated, without network or inference; this does not prove execution
  of the
  command, reference processing or model behavior.
  also observed the public helper `0.0.21`: the five fixtures did not return to
  value and to the original bytes. The proof versioned
  `tests/toml-preservation-proof.mjs` pointed out 40 differences in
  implementation
  previous. With the candidate integrated, the 40 cases restored the bytes in
  macOS; this proof does not use independent parser or real client.
  A later proof of the charger expanded a synthetic file included and
  confirmed duplication of arguments when the TOML and the inclusion contains
  `{{args}}`. A CLI and sync now use the same rule of argument for the
  human text of TOML. In previous implementation, in 20 Linux fixtures the
  marker remained unique, but byte a byte restoration failed.
  semantic parser of this matrix is the kit, not an independent verification.
  In the integrated candidate, these 20 cycles passed on Linux, including the
  Byte restoration and source comment check.
  narrow reader to fixtures compares human bytes without using restoration
  the kit; the semantic parser and digest remain the product. BOM e
  CRLF They were exercised in synthetic fixtures. TOML I wasn't staged and
  these cycles did not include `update` or intermediate human edition.
  These tests do not include template response or full Gemini session.
  Validation TOML the candidate started to accept 64 bit integers without
  convert them to `Number`. A fixture with integer greater than the accuracy of
  `Number` He's been through `init`, `update` and the two paths of `sync` in
  macOS
  and Linux, preserving the bytes of the whole and the Git files observed.
  proof does not cover the integral restoration of the prompt or TOML arbitrary;
  Windows is still pending.
  The candidate registers provenance in external comment to the prompt, linked
  to the existing digest. CLI `0.0.21` was refused
  preserving the observed files; this does not guarantee all versions or
  situations. Do not assume the original form of legacy files.
  The local Gemini charger 0.67.0 accepted the four forms of V3 commands
  generated by the helper, expanding a synthetic argument and reference;
  an independent parser also accepted the files.
  installation flow or model. In other fixtures, TOML divergent staged
  caused conservative refusals in `init`, `update` and in both syncs; the
  exchange
  client preserved the index and human text on macOS and Linux. Windows and
  other stable combinations remain pending.
  A CLI now preserves a TOML pre-existing with unowned block
  proven and installs the other resources; four fixtures cover `init` e
  `sync`, with identical or different blocks and staged index.
  Property does not cover the restoration of prompts with new block.
  In another fixture, an old hash manually prepared in `derived.files`
  remained after the TOML human being preserved. No loss was observed;
  `sync --check` It returned success despite this record.
  Persistence and its policy of disposal still need investigation.
  another natural flow, an ancient record coexisted with the
  temporarily with a new block and was consolidated by the following sync;
  resulting prompt presented two references to the same origin.
  isolated, the Gemini charger expanded both; there was no model call.
  local correction preserves without adoption a fully equivalent prompt to
  generated. The parser and its license accompany the kit; different prompts and
  the
  removal follows the preservation candidate TOML,
  still subject to the criteria and limits of the spec.
  O [preservation draft TOML](../specs/toml-preservacao/SPEC.md) log
  the criteria, ambiguous cases and the necessary validation.
  Validating the other hypotheses and designing an immutable plan remain
  pending.
  The tests from that round were still ignored on Windows.
  Before the implementation of conservative recovery, the loss was reproduced
  on macOS and Linux. After the first protection controls, the strict suite in
  macOS had 9 approvals, 23 failures and 3 ignored tests.
  overwritten after update, cleaning after publication and loss of metadata.
  The IC matrix requires the native profile of macOS, which rejects absent
  tests,
  ignored or pending.
  Another fixture played on macOS and Linux file creation outside
  project when a writer swaps an ancestor of backup by link before
  The exclusive creation protects the final name, not the ancestors.
  A prototype POSIX with `openat` avoided the link in fixture, but does not
  prevent
  the open folder itself be moved out before creation.
  Another playback changes the backup after the content check and before
  timestamps; sync can announce the modified copy as valid.
  Current scenarios do not cover all forms of change.
  In the immediate response to a possibly partial planning failure,
  application or tool, a CLI orients review and does not suggest new mutation.
  An intermediate step began to inform known backup paths in
  flaws, without claiming that the copies were complete, and distinguished paths
  The direct sync already warned about partial application.
  This step preceded the introduction of the persistent diary.
  A local investigation of init, migration and removal has shown that capture
  The investigation covered instrumentalized calls and
  preceded the reserve of the missing root and the prior manifest of the direct
  sync.
  Sync now uses the same internal sequence of logical actions to calculate
  affected paths and execute written and deletions. Each writing includes the
  candidate parents, checked again at the time of creation.
  does not represent temporary, backups or rollback and is not recovery plan.
  The installer also calculates and reuses directory pruning candidates;
  the list is conditional and does not cover all effects or capture your data.
  In the application of the plan and direct sync, the temporary name is
  preserved after
  `rename` successful, avoiding erasing a concurrent recreation at this point.
  After successful planning, he still tries to remove the stage recursively.
  A rename
  between hardlinks of the same inode can leave the original name without
  warning;
  cleaning after hardlink publication remains pending.
  Failure to create the plan, implementation of the plan and direct sync
  preserve and report the uncertain name, including in collisions and recordings
  Partial; this does not prove its existence. When the private stage sync
  informs uncertain paths, the internship is also maintained and reported.
  Fail forms and competing changes still need verification.
  Errors before or after the publication attempt also preserve the name
  temporary uncertain; this does not correct cleaning after successful
  publication.
  In direct sync, failures before publication attempt do not restore the
  Unchanged group without previous shares. A observed concurrent change
  is preserved even if it has the bytes planned; in pre-publication failure, the
  cleaning does not remove the created temporary and informs its path as
  uncertain.
  The original case exercised protection before publication.
  candidate informs affected or uncertain paths for review.
- [-] Ensure protection and diagnosis of backups that may contain private data.
  A fixture has confirmed that they may appear in Git when the project does not
  ignore them. Preserve index, ignores and Git configuration; do not assume that
  the backup directory is protected. [private
  backup](../specs/backup-privado/SPEC.md) covers the installer folder; there is
  local correction in evaluation. ACLs, Windows and the rest of recovery require
  separate validation.
- [-] Check the preservation of native metadata from existing files on supported
  platforms. Fixtures on macOS played loss of ACL and extended attributes in the
  `0.0.21` and in a previous candidate. Losses affected the tested backups and
  direct catalog update. Linux Fixtures in tmpfs played the loss of xattr in the
  installer, backup and sync. The test did not cover ACL on Linux. Test `init`,
  `update` e `sync` on each supported system. In macOS fixtures, one ACL which
  denied writing was lost when the installer supplemented `AGENTS.md` existing
  and when sync updated the catalog; both operations returned success.
  Unchangeable flag `uchg` blocked the replacement in the two observed
  scenarios. ACL They must distinguish benign rules from writing denials.
  `update` and the two sync modes lost a synthetic attribute in TOML Gemini
  mixed in macOS and Linux. An intermediate control in macOS started to refuse
  changes if the utility listed attributes in the planned file or could not
  verify them.
  flows have been refused in the trial. The listing itself does not prove
  hidden attributes, ACLs, flags or authorization.
  An experimental helper on macOS copied a ACL benign and an attribute between
  Synthetic files; does not yet confirm authorization or integrate the package.
  In Linux arm64, a prototype consulted the size of the list of xattr names
  accessible with the same binary in two glibc and musl images.
  also passed in x64 under translation, in `tmpfs` e `overlayfs`without
  executing the
  Kit. Tests do not cover native x64, hidden attributes, ACLs, distribution
  or integral preservation.
  In another fixture `overlayfs`, ACL benign and xattr were copied between
  files;
  tmpfs returned `ENOTSUP` and musl did not load or resolve the library.
  demonstrative did not test restoration or prove authorization or secrecy.
  In another isolated test, a temporary addon copied ACL benign and three xattrs
  for backup and updated file on `overlayfs` ARM64, with glibc and musl;
  the independent reader checked values. Fallback and integration were not
  proven, and other namesspaces depend on a check done by the test.
  A synthetic npm package installed this offline binary on both images without
  scripts or compiler in PATH This doesn't test. `npx` Not even the kit.
  An experimental copy of the kit passed 48 update and sync scenarios:
  24 ARM64 and 24 x64 under translation, with 12 amendments and 36 refusals
  expected by
  synthetic attribute or missing or corrupted addon.
  In musl, Git came from a glibc wrapper; x64 native, support the ACL benign
  Kit and distribution remain unproven. A reconstruction in the same image
  produced
  the same hash of addon; font and build are neither versioned nor validated in
  IC. This copy remains isolated and has not been published.
  In macOS and Linux, direct sync and application by CLI They now reject
  amendments
  planned in regular bit files POSIX Specials. This protection does not
  covers directories, ACLs/xattrs or the plans displayed by `--check` e
  `--dry-run`.
- [-] Diagnose divergent derived records without replacing TOML human. After a
  human edition and `update`, `doctor` e `sync --check` They returned success
  despite the old hash. TOML preserved, the candidate informs divergence,
  absence or unverifiable reading in these commands; direct check still does not
  identify the path. Absence and error were covered by unit tests. Correction
  does not solve the ambiguity of property when ancient bytes return.
- [-] Apply current decision: new operations should not change Git
  configuration, edit `.git/info/exclude` neither create or change ignores at
  the root or in customers. Ignores existing in the hub are also preserved. Some
  files may appear in the `git status`; diagnosis should warn about visible
  private files. Historical criteria such as those of [Ignore the
  project][project-ignore], [Ignore customers][client-ignore],
  [integration][additive], [0.0.3][v3], [0.0.7][v7] e [status][state], need to
  be reviewed before serving as a contract for this evolution.
- [-] Validate the rules adjustments of the Copilot and the preservation of
  human rules and metadata. The discovery and loading vary by client; a
  generated reference does not prove the execution of the rule or skill.
- [-] Correct [scope of rules Claude](../specs/escopo-regras-claude/SPEC.md) and
  migrate notes without amplifying activation or erasing human content. The
  planner is now connected to the local sync, with conservative preservation of
  legacy rules and unverified scope diagnosis. The review passed in resource
  testing on macOS and projects on Linux. A proof with Claude confirmed the
  loading by `paths` as a rule generated by the integrated sync and the explicit
  reading of the origin in separate session; it does not prove automatic
  reading. `always_on` how much `model_decision` legated without `paths`; calls
  `Read` the fonts only occurred in the session that asked for explicit reading.
  They are fixtures with sandbox and do not prove obedience or behavior of all
  customers. They persist Windows validation, proof of generation by installer
  and concurrent recovery. An attempt to observe the rule on router stopped
  before starting the model because isolation blocked a shared temporary area;
  its loading on that project was not verified.
  it has not yet been applied to the consumer project or published.
  In the laboratory, a deliberate interruption of the prototype left a note
  without registration; the resumption reported pending.
  needs reliable recovery before use in existing projects.
- [-] Validate the implementation skill in real customers. In a fixture with
  spec in draft, Claude read the skill, interrupted the implementation and
  preserved files and index. A first response suggested dispensing PRD or
  design; after clarifying the rule in the skill, another session recognized
  them as mandatory. They are isolated sessions, without shell, and do not prove
  execution of tests, remote consultation or behavior in other projects. After
  renewing Claude, a proof of 0.0.21 delegated to the implementer and tried to
  edit without spec; the sandbox blocked the editing. In the updated local
  package, the profile declared the skill, Claude read its origin and did not
  try to edit. Even after clarifying the order, another session suggested to
  create the spec before proving the preparation of the project. Each result is
  from an isolated session, without proving behavior on recordable project; the
  step orientation remains pending. CLI local now distinguishes environment
  preparation product with `next` e `--intent`, without performing the stage;
  the response continues to require evidence conference. In product mode,
  warnings in the documentary inventory interrupt the
  stage suggestion, including unfollowed links. In another session, Claude
  indicated the order, but offered to implement
  In the repetition, he did not offer the dispensation, but again suggested to
  spec.
  without confirming the preparation; the behavior continues to be reviewed.
  In a later assisted test, he read the JSON produced by CLI and indicated that
  It is not clear from the sitting that it would call the CLI on his own.
- [-] Prove creation and use of skills in different sessions. With local
  candidate `0.0.30`Claude created a skill summary of CSV in synthetic design
  with preexisting Git; the controller synchronized and `--check` Another
  session discovered the skill, read its origin and the CSV and answered four
  records and sum 36, checked independently. Index, ignores and verified human
  files remained equal. The proof does not cover the public version `0.0.21`,
  other clients or transitional changes; Claude did not execute the sync.
- [-] Check customer sharing. Copilot discovered and called Claude's created
  skill, read his source and a new one. CSV with a field between quotation marks
  and invalid value, and reproduced an instruction present only in the source.
  The sum and invalid line coincided with the independent calculation. The same
  case passed with the local candidate and with the npm package `0.0.21`, using
  a copy of the skill already created. In a previous session, there was no
  reading separate from the source; the correct answer, alone, does not prove
  that your instructions were followed. In the fixture of the published version,
  `init` changed `.git/info/exclude`, preserving the human part; index and
  `.gitignore` The test only covers these clients and scenarios, without proving
  the absence of transitional changes.
- [-] When creating agent with native YAMLs, use the `sync` ed CLI to recompose
  the manifest and check the generated frontmatter. The direct script can
  validate a previous manifest without incorporating the new YAMLs. A fixture
  with Claude and Copilot confirmed the difference in the local candidate and
  public package `0.0.21`. The index and the `.gitignore` they were preserved;
  the public version changed. `.git/info/exclude` in init. A later Copilot
  session discovered and triggered the synthetic profile: the subagent read
  notes and returned the expected identifiers. In another session, he also read
  the source and included an instruction present only in it; there was
  unsuccessful attempt to read out of the project and reading of the temporary
  folder that contained it. Native permissions were not proven alone and the
  profile was created by the controller.
- [ ] Review outdated conflicts and notes in sync
  development checkout without deleting existing Git content or exclusions.
  The situation depends on the local files and settings of each environment.
- [ ] Execute the complete suite of the final state, including the package
      installed,
  and track the real matrix on Linux, Windows and macOS. NTFS, skips,
  volumes without hardlinks and limits of competition must have resulted
  explicitly.
- [-] Check backups, pending operation, and revision of the partial status in
  the conservative recovery candidate. Normal application still has windows
  between checking and removing or replacing a path.
- [ ] Update documentation and record evidence and independent review
  the final diff before creating commit, tag or publish a new version.

### 2. Proofs in projects and customers

The base matrix defines 40 synthetic projects; their expansion and revision are
ongoing. A separate test checks in memory 16.383 Customer selection
combinations. There are also flows with simulated decisions. These checks do not
prove the execution of each skill and profile in each project or client; their
limits are described in the respective tests.

After integrating the Claude scope adjustment, the same local package was
exercised in 40 projects on macOS and 40 on Linux: in each system, 34 passed and
6 were unverified, without classified failures. The six include Claude and keep
pending proof of the native scope of the Git rule; the source available for
explicit query does not prove its activation. These rounds are structural and do
not demonstrate execution of each skill or profile.

- [-] Expand tests on empty and existing projects, including own agent files,
  staged, collisions, client selection and repeated operations. Generate
  projects and results outside Git or at proven destination ignored; keep the
  test code versioned. In a partial proof of `preparar-dev`, Claude read the
  synthetic project without editing it; a repetition recognized the `.gitignore`
  and an optional variable. The automated test was performed by the controller,
  not by the agent; setup, services and use in other projects or clients
  continue without proof. The session did not prove the effective ignore or the
  absence of the file `.env`. In isolated consultations of `gerenciar-roadmap`,
  Claude recognized dependencies and tasks; in repetition, distinguished pending
  task from unchecked code. The answer still had an ambiguous statement about
  unread evidence. In another fixture, he updated only the requested line of a
  roadmap staged, preserving the index; he reported that he did not perform the
  required synchronization. `atualizar-documentacao`, identified divergent
  commands without
  run them. After skill adjustment, did not assume a mandatory script, but
  presented as optional the revision required for a change delivery.
- [ ] Repeat the tests in real public projects, with fixed reviews and the
  candidate package. The command
  `test:oss` is separated from `npm test`; register projects, versions, results
  and locks without including clones or reports in Git.
- [ ] Check inventory of catalogues against actual sources before measuring
  coverage; reconstruct indexes in test copies, preserving checkout.
- [ ] Maintain a matrix per project, client and skill or applicable profile,
      with
  version, loaded feature, result and evidence.
  real discovery and execution; record blocks and non-applicable cases.
  Selection combinations do not replace execution proofs for each client.
- [ ] Maintain installation evidence `0.0.21` in consumer project
  separate from future kit changes; before new application check
  again existing files, index and `.gitignore` project. Find and
  make the report of this installation available without exposing private data.
  In consultation with locked writing on the router, the `doctor` public
  `0.0.21`
  He's back. `issues: []`; the candidate `0.0.30` pointed 52 differences, eight
  Claude's conflicts and a local exclusion bequeathed.
  different: do not equal a proven failure of the installed version. Index,
  `.gitignore` e `exclude` kept the hashes observed before the appointment.

Na [Tag commit CI
`v0.0.21`](https://github.com/pathbit/AgentDevKit/actions/runs/43498629228), the
three Windows jobs examined recorded 106 approvals and 16 ignored tests,
including symbolic links and POSIX permissions.
[release](https://github.com/pathbit/AgentDevKit/actions/runs/43499951587)
associated the artifact with the same commit; the tarball hash contained in it
coincides with the tarball consulted in npm. This proof does not cover the
ignored tests, all skills or the local state later. The Windows host VM remains
offline and its network and sharing configuration has not been changed.

In local consumer verification, managed files and registered install blocks
`0.0.21` coincided with their hashes, and the diagnosis passed without altering
the Git files monitored. In 40 synthetic projects, however, the `init` of the
same version has changed `.git/info/exclude` in all cases: this historical
behavior contradicts the current decision and prevents declaring the version
compatible with it. A fixture of worktree confirmed that the exclusions also
affect the main tree. In the consumer, a comparison of before and after the
update recorded the unaltered exclusion; the previous origin of the existing
block was not proven and it was preserved. 1.000 synthetic scenarios, the five
steps had successful operational return. All remain flawed by the exclusion
change; there was no other deviation in the monitored snapshots. The mapping of
part of the resources remained unverified. The tests of the five steps occurred
in macOS: 600 cases with Node 24 and 400 with Node 26; they do not prove Windows
or Linux. In comparison, a local candidate package `0.0.30` passed the five
stages and the
structural coverage in 40 synthetic projects in macOS and 40 other in Linux
container. These batches do not prove native metadata, concurrent recovery,
agent execution or migration from another managed version; the candidate has not
yet been published.

Another local round with 40 synthetic projects and a packaged copy of the
candidate `0.0.30` had 34 approved scenarios and six unchecked.The six included
Claude and did not prove the equivalence of scope of the native Git rule.The
round verified the installation and preservation observed, without executing the
flows of the agents; the tested package precedes subsequent adjustments in the
skills. 1.000 synthetic projects: 792 passed and 208 were not verified by the
same scope limit Claude. `not-verified`; `sync --check` no changes were applied.
The tested copy precedes subsequent adjustments in checkout. CLI with Node
18.20.8, which delegates the execution to Node 24 or above; the effective
version of the delegated process was not registered. After preparing a proper
skill in the index, `sync` He begat his note, and preserved the heshes observed;
`update` of the same version reported `changed: false`. This does not prove
migration, native execution or other systems. A versioned test now prepares Node
24 in a temporary package for
exercise the input by Node 18 without depending on the checkout cache. It passed
on macOS and Linux with network locked in the container. The IC matrix proposes
to run it on all three systems; Windows still requires real execution.

A matrix checked 1.456 structural entries in 28 synthetic projects, with the
package published `0.0.21` and a local candidate `0.0.30`. In each package, he
observed 186 discoveries: Gemini and Copilot skills and OpenCode profiles, in
new and existing projects; the others 1.270 These matrices did not execute the
flows of the skills or profiles. The candidate still needs revision and complete
tests, including concurrent recovery. On the router, a read-only audit checked
41 skills, 11 profiles, 18 commands and eight rules in the 14 selected roots:
1.092 recognized notes solve for your sources. The command and rules conference
is limited to the files registered in the state. This does not prove discovery,
execution or active scope in customers. In separate tests with inference in the
Copilot, the 41 skills of the `0.0.21` were invoked and their origins read in a
new project and in an existing one. Synthetic markers and events proved each
reading; the complete flows of the skills were not executed. Each batch consumed
a premium request. An inventory found at least one nominal scenario for each of
the 41
Skills. There are partial proofs, refusals and failures; this does not prove all
flows not all customers or projects. A test exercised `git-diff`, distinguishing
staged and unstaged changes. Skills changed after version publication `0.0.21`
require their own functional validation. `git-worktree`, an answer interpreted
`AM` incorrectly and another, after skill adjustment, distinguished the prepared
and local changes. The two had other unproven statements; the observed index was
preserved. `criar-ux-ui`: before PRD in draft, Claude identified pending
approval and did not create the document. `init`. In another fixture with
preexisting Git, two sessions attributed to the UX document markers that were in
the template, but not in the document. The skill was adjusted; the repetition
still showed inaccuracy, which remains pending correction. Another test
exercised `git-fetch` among local synthetic repositories: remote ref advanced
and a new blob was transferred without integrating commits or changing
the index and human file. In another fixture, `git-log` performed a real Git
query and identified two synthetic commits, with preserved index, refs and tree;
`validar-adversarial` created a temporary test that exposed a border failure,
confirmed by independent execution. The pipeline used by the agent in that
session did not prove the test output code. The local skill now guides to
preserve this code; in another fixture, Claude performed the test directly and
reported output 1 with an intermediate skill review. The test used sandbox and
skill superimposed the local package; it does not prove pipeline, deterministic
behavior or published version. In another session with the current skill, the
test passed and Claude informed that the tool did not expose the numerical code.
Fixture also used sandbox; the orientation on pipeline remains without execution
proof. Three individual sessions with Claude and current sources verified
limited answers: `avaliar-performance` recognized a lack of measurements,
`avaliar-arquitetura` pointed out absent decisions and `revisar-codigo`
Identified
a synthetic defect confirmed by independent execution. The agent only read
files; the sessions do not prove benchmarks or complete flows. In another
performance query, a proposal for guidance on route cost did not eliminate a
contradictory response when repeating the same example and prompt; it was not
integrated and there was no measurement. `revisar-codigo` and identified the
incorrect formula; extrapolated the suite coverage from a single file. The
session did not run tests or invoked `validar-adversarial`. In a proof of
`verificar-trabalho`, the client recognized two criteria without evidence and
did not complete the delivery, but approved a general criterion from two
examples. He only read the test output performed by the controller. The skill
was clarified; in repetition, the client still approved the criterion,
interpreting it as the two examples. The scope can be ambiguous, and the proof
does not demonstrate the overall behavior of the skill.
`implementar-backend`Claude identified a spec in draft and stopped, but
suggested the plan before checking the configuration and order of the
prerequisites.
The skill was clarified; in the repetition, it suggested approving the spec
before the plan, but did not consult `implementar-spec`, `proximos-passos` or
the configuration state. The tests were read-only and the prompt already
prevented the implementation. `implementar-frontend`, Claude read the spec and
stopped in front of drafts, but suggested approvals before checking all phases
and attributed to the roadmap an approval not required by the skill. After
clarification of the skill, he also read `proximos-passos` and tried to read the
absent state, but still suggested UX before solving the configuration. Sessions
did not run tests or browser. In another performance query, the agent did not
invent measurements, but generalized a hypothesis about inputs that a synthetic
control contradicted. The skill was adjusted, but the generalization persisted
in repetition. The proof does not establish type requirement failure.
`avaliar-arquitetura`, Claude extrapolated from a module and presented
guarantees without all the conditions. The skill was clarified, but repetitions
still had statements beyond the files read; the behavior of
remains pending correction and new validation. In another fixture, Copilot
loaded `criar-spec` the local candidate, asked for the missing prerequisites and
did not create a spec. shell was denied and the automated inventory was not
executed; content snapshots do not check metadata. Other scenarios created a
branch and pushed for a remote local bar, preserving the index and the synthetic
human changes. The push did not test divergence or external providers. In merge,
a fixture with overlapping changes was preserved by refusal; another, clean and
without conflict, produced a commit with the two expected parents. In another
fixture, `criar-agente` generated a note after manual adjustment of the
manifest, but the sync changed the exclusion; the invocation of the profile was
not tested. `criar-skill` generated source and note, but also changed the
exclusion; the `--check` The new skill was not executed. In the local candidate,
another test preserved the observed Git and synchronized the skill; the check
passed with visibility warnings. Claude still incorrectly reported the absence
of existing entries in the catalogs and claimed
The new skill has not been invoked. `criar-comando` also changed the exclusion
and produced inaccurate restrictions of arguments. In repetition with local
orientation, did not repeat these restrictions and executed `--plan`, but sync
continued to change the exclusion from the published version. `criar-regra`
generated point in Claude without preserving the conditional scope; the session
expired. A native proof confirmed initial loading of manual rules and with glob
also in the local candidate. The correction remains pending. In another fixture,
a subagent read the skill explicitly and configured a glob with sidecar Claude:
the notes generated for Claude and Copilot kept the scope informed. The proof
checked files without executing the clients or proving their effective
activation; it does not replace the session that expired. In new fixtures with
the local candidate, `criar-comando` generated and synchronized the note; the
command was not invoked, and attempts to execute its dependent script were
blocked. `criar-regra` generated the source, the sidecar Claude and the Copilot
pointer; the controller synchronized the pointer Claude later.
The observed Git was preserved in the sessions. In later proof, Claude loaded
the rule to a file corresponding to the glob and did not upload it to a file
outside of it; this does not prove obedience or activation in the Copilot. CLI,
a proof with the same paths recorded contextual discovery only within the glob;
reading and application of the source remained unverified. In another session,
the client read the source in the corresponding case and used a synthetic
instruction; in the control outside the glob, he did not read it. This does not
guarantee behavior in other sessions or versions. `.claude/rules/git/RULE.md`
also declares `model_decision` without `paths`; this inspection does not prove
how each project session used the rule. `executar-script` correctly reported a
`--check` Failure, but there was no bootstrap observed; the diagnosis consulted
the local Docker and the response confused the minimum of Node with the npm
version. The current skills now distinguish the minimum of the Node from the npm
verification. An independent reading only evaluation measured Node and npm
separately and identified the limits of the query; it did not execute bootstrap
or script.
In another isolated Linux fixture, a subagent read the skill explicitly: the
plan did not execute the script and bootstrap performed diagnostic and
execution, preserving six arguments and observed Git files. The network was
blocked. This does not test native skill discovery, obedience to an offline
model, other platforms or transitory changes reversed. In separate fixture, a
subagent applied `verificar-trabalho`: distinguished an approved acceptance, a
failure and a non-verifiable, preserving the observed Git files. The review was
prepared, but its check stopped first in a pending documentation decision; it
did not evaluate the accepted ones. The skill reading was explicit and does not
demonstrate native discovery or model execution. Roadmap and environment
preparation tests became partial; offline check of missing tool did not run
bootstrap nor verified npm. The direct invocation of sync repeated the improper
change of deletes even with `--check` In the local candidate, the orientation of
`sincronizar-agentes` has been corrected: sync preserves existing ignores and
does not create ignores on customers.
Git with content staged, index, exclude and ignored monitored remained equal
after `init`, `update`, `sync --check` e `sync --force`; the proof does not
detect transitory changes or verify ACLs, extended attributes or concurrent
edits. In another fixture Linux with Git and staged content, a subagent read the
skill explicitly and executed the skill, and did not perform the checked, plot,
sync and check. A free resource received the pointer; a collided human file was
complemented with the expected block, keeping its original text. The file bytes
changed. The report summarizes the integrity, but does not enumerate the Git
files conferred; the preservation of the index in that session was not
independently audited. A separate test covers the index in similar fixture. The
proof did not perform native discovery, model, other systems or verification of
ACLs and extended attributes. A synthetic correction of authorization passed
nine independent tests, but Claude's response made an incorrect statement about
previous tests and did not execute scanner or delivery review. Threat modeling
identified improper access, but extrapolated evidence and left parts of the
pending flow.
In a functional proof with written permission, the profile `implementador` and
the backend skill refused to implement without spec approved; fixture and its
index remained intact. This covers only this scenario. The equivalent attempt in
Claude returned 401 before inference; in a new attempt, Claude invoked
`implementar-spec`, proposed a plan and asked for approval without implementing.
Files, index and references Git remained the same during the session. Git from
fixture was created after installation, and the complete results of the tools
were not preserved; the proof does not cover Git preexisting in `init`. In a
fixture without a state of configuration, Claude invoked `criar-prd` and guided
to complete the configuration before the PRD. The session only allowed reading;
it does not prove the behavior with writing nor that the absence of state means
that the configuration never occurred. Git was created after the `init`. In
repetition with a local skill candidate, Claude recognized this distinction, but
read only part of the configuration and asked again which customers to use,
despite the saved selection. After further guidance on readings
truncated, a new session read the rest and recognized the client and the
language; stated, without proven inventory, that there were no product
documents. With additional guidance in the candidate, another session reported
that it had not checked these documents and reused saved choices. In the
adjusted skill, queries with content provided in the prompt forwarded the
configuration without evidence and preserved no applicable UX already justified.
The pending technical configuration did not block the product; there was no
native writing or discovery in these queries. In a later session with explicit
invocation of the Skill tool, Claude read the source and forwarded the
configuration. The request also asked questions, which were listed as future;
therefore the session does not prove its suspension in a request without such
request. The session snapshots did not show written. With later neutral request,
Claude sent the configuration without listing concrete questions, although it
had anticipated discovery categories. Isolated sessions do not demonstrate
consistency or complete execution of theskill. In separate fixture Linux, the
skill was handled and manually applied to create and manually applied to create
concrete questions.
one PRD fictional in draft, with outstanding absent answers and preserved Git
observed. There was no native discovery, model or interactive sequence of
questions before writing; the preparation was also synthetic. In another
fixture, Claude invoked `criar-spec`, asked questions and guided to pass by PRD
and design without writing files. The index and references remained the same
during the session, but Git was created after `init`- He said that `docs/` did
not exist, although the directory was empty; the complete results of the tools
were not preserved. `verificar-trabalho` in Claude: the actual test passed one
accepted and failed another, and the client left a third unchecked. The files
and index remained the same; Git was created after the `init`♪ In a ♪ API
synthetic, `revisar-autorizacao` identified reading between accounts; test HTTP
The evidence covers only GET, and Git was also created after the `init`. In
another fixture with recording PRD in draft and UX/UI Claude used it.
`criar-design-doc`, pointed out the dependencies and did not create the design.
coexist and were not tested separately; Git was created after the `init`. In a
fixed Linux without network and with preexisting Git, the same skill was applied
manually to complement a fictional draft design, preserving the previous content
and Git observed. Approvals were fixedture data; there was no native discovery,
interactive questions, or query to official references. In a synthetic Git
fixture, `git-status` it was applied manually: the query identified changes
staged, not staged, untraced file and local upstream. `git-diff` distinguished
changes staged and not staged using a temporary copy of the index. The observed
original index remained equal; the proof does not cover multiple workstrees not
all Git metadata. In another fixture, Claude invoked `git-merge`, read a Git
report prepared by the controller and recommended not to integrate without
revision and verifications. The session preserved the observed human and Git
files; did not execute the gate or merge. `git-pull`, a session treated as
harmless a global ignore warning
Unable. The orientation was expanded; another session recognized the limitation
when interpreting queries provided by the controller, without performing pull or
bolt. It also suggested to resolve local changes before any match, requirement
that was not demonstrated. `git-commit`, Claude distinguished staged and
unstaged; after adjustments in the skill, recognized the option to keep both.
They persisted assertions and suggestions without proof; the client did not
execute commands or commit, and the controller provided Git queries. In a
consultation of `git-push`, Claude read the skill and the Git rule when
explicitly requested; did not execute push. The session made an unprovoked
statement about the main branch and does not confirm automatic activation of the
rule. In another fixture, `git-branch` created a branch from `develop` without
changing the current branch; observed human index and changes were preserved.The
test was manual and does not cover branch change or native discovery.In a
fixture with preexisting Git, Claude read directly `configurar-projeto` and
identified the work phase and sequence.
skill tool was registered and the session only allowed reading. The client
suggested a non-existent command. After explicit guidance in the local skill,
another session indicated the correct Node command; it executed and informed a
pending fixture, without passing the `check`. O `init` the published version
preserved index, `.gitignore` and Git configuration, but added a block to the
delete. In another fixture, the Copilot reviewer pointed a numerical error
confirmed by test performed by the controller. The session preserved the
project; Git was started after `init`, then this test does not cover preexisting
Git. In fixture with preexisting Git, Claude delegated to the reviewer; the
final response identified another numerical error. The controller confirmed the
test failure after the session, which preserved the observed Git. The subagent
text was not captured. In a third fixture, the security auditor identified
access between accounts confirmed by controller test. The session preserved the
project but did not run scanners; Git was also started after the trial. `init`In
another fixture, the QA engineer ran a test and identified a failure
The project was preserved during the session; Git was started after `init`Each
pilot only covers his synthetic scenario. In a proof of `planejar-qa` with
preexisting Git, Claude read the spec and the tests; the controller executed two
examples and the others accepted were unchecked. After a wide classification,
the skill was adjusted; in a new session, the agent separated the approved
examples from the general criteria not checked. The session did not execute
commands or changed files; the coverage remains partial. In a fixture with
approved spec, the backend expert applied a correction; the independent
repetition of the tests passed after the change. Git was started after the
`init`, and the summarized logs do not preserve the output of the test performed
by the agent. On a synthetic page, the frontend expert corrected the accessible
state of a button. The controller checked the interaction in Chromium and mobile
emulated viewport; the client did not execute the browser and Git was created
after init. In another fixture, the performance analyst performed a measurement
of the count of operations confirmed by the controller. It does not measure time
or performance in
production; Git was also started after `init`. In a fixture of accepted, the
validator performed tests and distinguished an approved criterion, a failure and
an unavailable integration not verified. The independent review repeated the
tests; Git was started after `init`. In a synthetic queue, the architect pointed
out the lack of persistence between processes. The client did not perform tests;
the controller and review repeated the proof, which does not demonstrate
recovery after fall or durability. In another fixture, the documenter updated
only the authorized file, preserving human text, and performed three tests. The
controller reproduced the example separately; in the `init` previous, the
preexisting Git had its exclusion expanded. Summarized events do not replace the
session gross log. The planner raised doubts about a spec in draft, but did not
ask about permissions and retention. The candidate explains these checks in the
profile; in a repetition, asked the papers and storage, deadline and exclusion.
A session does not prove that the behavior will be repeated in other tasks.
After renewing Claude Code session, the same proof confirmed the 41 invocations
In the first, an additional attempt to read a personal plan returned a
non-existent file; in the second, personal directories were blocked by the
system and there was no external attempt.The cost reported by Claude was
approximately US$ 0.33 and US$ 0.38, respectively.This does not prove the
complete flows of the skills.In Claude Code, the 11 profiles of `0.0.21` In each
session, synthetic markers proved the loading of profiles and the reading of
their origins; the other files of fixture remained the same. Claude reported
costs of approximately US$ 0.28 and US$ 0.30, respectively. This does not prove
the complete flows of agents and their execution in all projects. `0.0.21` they
were delegated in an existing project: nine read their origins and two could not
be verified. the request explained the resolution of relative links; no full
profile flow was proven.
also the project root, both read its origins. In new project, with the root and
resolution of clarified links, the 11 profiles read its origins. Some reading
attempts outside fixture were blocked; none was completed. In another synthetic
round, with the path visible on the link and without resolution explanation,
nine profiles were proven and two others were not verified. The results do not
establish that the alternative pointing is better. In Linux, another candidate
matrix passed on 40 synthetic projects for the operations and documented
verifications in the [Repository tests][testes-kit]; this does not replace the
recovery proof, which failed separately. In later repetition with the local
package and changes TOML, 34 of the 40 projects passed; six selections with
Claude were not verified regarding the native scope of a rule. Audit was after
execution; the matrix does not execute the flows of the skills nor proves ACLs,
xattrs or Windows. With the generator adjusted to evaluate the coverage of all
steps, another Linux matrix had the same 34 approved and six unverified.
operations recorded these counts separately; the overall result remained
unverified. After the diagnostic and protective adjustments POSIX, a local
package passed 34 out of 40 Linux projects; six remained unchecked for Claude
scope. The audit found consistency of the records without proving native
execution not all metadata. The package was compared to tarball after execution.
After adding the partial query of xattrs in macOS, another local package had 34
approved and six not verified in 40 macOS projects. The audit of the logs was
consistent and the package corresponded to tarball after matrix; neither of the
two tests verifies transitory changes or native execution of the skills. The
versionable auditor checks the consistency of the reports and log hashes,
including the required steps and snapshots. It does not authenticate the
execution, package or preservation before baseline; a coherent report may still
have resulted `failed` or `not-verified`. A subsequent repetition of the
candidate `0.0.30` passed 80 projects on Linux, with two fixture variations,
without testing the execution of skills and profiles.
executable now allows to split the matrix into playable batches; this option was
tested on macOS and Linux and had independent revision. Windows remains pending.
A third round, started by this option, passed in 40 more projects on Linux with
the same local package; it also does not run skills or profiles. In macOS, with
Git and ignore XDG Isolated, the local candidate `0.0.30` passed the proofs of
compatibility of fixed commits of Express, Zod, Chi, Tailcat, Requests, Go,
Hibernate and Rust. Express and Chi were repeated after reinforcing the
conference of human sentries and the origin of the local rule. EF6 was blocked
in the diagnosis by ambiguous exceptions in the existing ignore; a fixture
confirmed that the exception `!*.[Cc]ache/` can display a previously ignored
client cache. Files and Git checked in clone have been preserved. `0.0.21`
changed `.git/info/exclude` in the clones of Express and Zod and failed the
criterion of preservation. OSS did not execute the applications or all the
Skills and Agents streams. The reports and clones stay in `tmp/` ignored; see
the limits and diagnosis of private files in the tests.
A later exploratory execution, interrupted before completing the matrix, used
the public package `0.0.30`: the Hibernate test detected changes in local
exclusions and the EF6 was blocked by ambiguous exceptions in the `.gitignore`.
These results do not prove the behavior of the other projects or the local scope
candidate Claude. 17/11/2026, a local candidate `0.0.30` passed the installation
and preservation controls in nine projects: Hibernate, EF6, Rust, Go, Tailcat,
Requests, Express, Zod and Chi. Round used macOS ARM64, Node 26.13 And the
tarball SHA-256
`ca490c637ef2796268daff07f607ded7c65343d8f3038483f6335b948ac8e5f4`. Then I
reapplied the updated textual oracle to the recorded outputs of the other eight
projects and repeated the EF6 with explicit expected diagnoses. EF6, `doctor` e
`sync --check` require attention: 15 cache probes appear visible to Git, two
existing rules of `.gitignore` The snapshots verified original files, human
content, index and Git exclusions, admitting only proven managed additions.
`passed` indicates approval of the observed controls
in these projects and versions, not health of EF6. The proof does not execute
the applications or the native customers and skills.
`tmp/oss-compatibility/candidate-final-20261117/AGGREGATE.json` references the
reports and evidence in `tmp/oss-compatibility/`, ignored by Git. In macOS
ARM64, with Node 26, the five operations of the local candidate `0.0.30`
returned zero in 1.000 synthetic projects: 500 new and 500 existing. There were
792 approved cases, 208 not verified as to the native scope of the Claude rule
and no failures; the overall result remained unverified. After the inspector's
correction, a new local package passed in 40 more projects. These tests do not
execute customers or the flows of the skills and do not prove update of a
previous different managed version. Another local package `0.0.30` has passed
the checks of the CLI in 200 additional synthetic projects, in rounds 26 to 30.
It precedes the subsequent adjustment of the skill of the PRD and also does not
prove native execution of skills or agents. In a later matrix with scope
candidate Claude, Linux ARM64 and Node 24, they were exercised 1.000 synthetic
projects, half new and half
The five operations were successful in all; 792 projects passed the checks and
208 were inconclusive about the native scope of the Claude Git rule. These
numbers are those registered by the tests, not a complete certification: the
controller rejected a batch of 200 projects that the tests classified as
approved, without preserving the reason for rejection. In addition, the outer
hash of the package tree differed in the last batch; it is not proven that all
the contents of the five batches were identical. The 208 inconclusive
occurrences coincide with the Claude selection and omission of the Git rule of
unproven native scope. The matrix does not execute skills or customers, it does
not test concurrent recovery or Windows proof; the package precedes the
subsequent modification of the skill; the package `implementar-spec`. A separate
run repetition passed in the same 200 scenarios and was accepted by the new
controller. The tree extracted later from the tar saved coincided with the hash
of the repetition; the cause of the previous rejection and the difference
between the historical hashes remain unexplained. After the local correction of
derived references, two macOS executions with the
same local package exercised 1.000 projects: 792 passed, 208 were inconclusive
by scope Claude and none was classified as failure. The audit considered the
reports consistent; it did not authenticate the results. The matrix did not
execute customers or applications and preceded the adjustment of the
`criar-prd`. A later round with this adjusted skill had 34 approved projects and
six inconclusive between 40; the audit also considered the report consistent.

In a fixture with absent preparation and Claude already selected, the `0.0.21`
forwarded the preparation before the PRD, but asked again customers. After
adjusting the skill, a candidate session consulted the saved customers and
language without repeating these questions. The proof covers only this
situation, not the project configuration or the complete creation of the PRD. In
another fixture, the `0.0.21` asked for approval of a plan without clarifying a
conflicting staged edition. With the skill adjusted, Claude asked how to
preserve it, but still proposed a plan without reading the required documents.
The complete check of the planning remains pending. In updating this fixture for
the candidate, the protected files were preserved, but `doctor` e `sync --check`
signaled the legacy local exclusion of `0.0.21`. A context collection in
evaluation gathered the documents configured in this fixture without changing
Git; it does not prove approval or reading by the agent. A new authenticated
Claude session started the skill and read the spec, but reached the cost limit
before completing. The proof of the planning remains pending.
In two later sessions with the same skill and Git command constraint, both read
the documents and fixture test; one performed Node despite the restriction and
the other used only Git. Both preserved the files observed under a sandbox
without writing. These sessions did not prove deterministic obedience or
preservation without sandbox. In later sessions, Claude read the documents and
diff staged, identified the conflict and asked before the plan. One response
suggested dispense the configuration; after the adjustment of the skill, another
treated it as mandatory, but offered commit or stash despite the preservation of
the index. The skill was again adjusted; these tests did not implement or test
or prove the behavior of other sessions. In the last trial with the adjusted
source, Claude kept the index observed and recognized the mandatory setting, but
treated inferences about the use of the code and test result not executed as
facts. The functional validation continued partial; no suggested alternative was
applied. In a later local package, an offline installation with a Git fixture
with Git fixed
Claude selected preserved the observed human files and Git state; `init` e `sync
--check` The installed skill and its pointer were checked by hash and path. This
structural proof did not execute the skill and did not check ACLs, extended
attributes or reverseed transient changes. The inspector also started to reject
isolated car continuations and returns that could transform ambiguous metadata
into undue approval.

### 3. Continuous evolution

- [ ] Review the specs and criteria affected by Git's current policy,
  maintaining the history of releases and without declaring approved old
  criteria
  by equivalence. Register decisions and dependencies before further increments.
- [ ] Evolve skills, profiles and proofs of architecture, backend, frontend, QA,
  safety, review and performance as proven needs. Use
  subagents available and adverse review when the scope allows.
- [ ] Improve configuration flow, product, UX, design, architecture and
  specs: raising doubts at first, respecting dependencies and validating
  criteria
  Templates should support decisions without inventing product.
- [ ] Validate selection and synchronization of customers supported in
      interfaces
  available, including Copilot and Antigravity. Shared fonts remain
  in the hub; pre-existing user features and settings are preserved.
- [ ] Check detection and installation of Node.js when absent, as the
  system, and installation, updating and diagnostic of the tools by commands
  playable. Orient actual browser and desktop tests when applicable;
  version the test code and keep results and temporary projects out
  Git.
- [ ] Maintain installation, prerequisites, commands, troubleshooting and
  publication consistent with effective behavior. [Issues][issues] e
  [Contributions][contributing] can propose improvements; each delivery requires
  scope and validation of its own.
- [-] Continue checking IC on Linux, macOS and Windows and the stream tag,
  release and post on both registers with the same approved artifact. The local
  build preserves a divergent previous output and the verification prepares
  separate copy. Release suites passed on macOS and Linux; `full` was simulated.
  Windows, Real Actions and current state publication are pending.

[Wiki](../README.md) · [Product](README.md) · [Specs][specs] · [Release
process](../maintainers/maintenance.md)

[releases]: https://github.com/pathbit/AgentDevKit/releases
[issues]: https://github.com/pathbit/AgentDevKit/issues
[contributing]: ../CONTRIBUTING.md
[changelog]: ../CHANGELOG.md
[specs]: ../specs/README.md
[v1]: ../specs/v0.0.1/SPEC.md
[v2]: ../specs/v0.0.2/SPEC.md
[v3]: ../specs/v0.0.3/SPEC.md
[packages]: ../specs/github-packages/SPEC.md
[v4]: ../specs/v0.0.4/SPEC.md
[v5]: ../specs/v0.0.5/SPEC.md
[v6]: ../specs/v0.0.6/SPEC.md
[v7]: ../specs/v0.0.7/SPEC.md
[v8]: ../specs/v0.0.8/SPEC.md
[v9]: ../specs/v0.0.9/SPEC.md
[dual]: ../specs/dual-registry/SPEC.md
[v10]: ../specs/v0.0.10/SPEC.md
[security]: ../specs/security-ecosystem/SPEC.md
[additive]: ../specs/additive-integration/SPEC.md
[real]: ../specs/real-projects/SPEC.md
[project-ignore]: ../specs/project-ignore/SPEC.md
[development]: ../specs/development-ecosystem/SPEC.md
[ci]: ../specs/ci-resilience/SPEC.md
[state]: ../specs/state-directory/SPEC.md
[sync]: ../specs/safe-synchronization/SPEC.md
[client-ignore]: ../specs/client-ignore/SPEC.md
[tool]: ../specs/tool-release/SPEC.md
[tags]: ../specs/automatic-release-tags/SPEC.md
[discovery]: ../specs/discovery-preservation/SPEC.md
[targets]: ../specs/target-paths/SPEC.md
[order]: ../specs/preimplementation-order/SPEC.md

[testes-kit]: ../tests/README.md
[recovery]: ../specs/recuperacao-conservadora/SPEC.md
[journal]: ../specs/diario-disco/SPEC.md
[claude-scope]: ../specs/escopo-regras-claude/SPEC.md
[guided]: ../specs/experiencia-guiada/SPEC.md
[legacy-doc]: ../specs/documentacao-legado/SPEC.md

[reading-pt]: ../../product/roadmap.md
[reading-en]: roadmap.md
[reading-es]: ../../es/product/roadmap.md
