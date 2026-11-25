---
description: "AgentDevKit diagnosis, conflicts, backups and recovery."
language: en
---

# Troubleshooting

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Start with the command, error and project folder. The diagnostic examples below
use public npm. In the other sections, replace `agentdevkit` by `npx
@pathbit/agentdevkit`. See [CLI][cli] to use local checkout and
[installation](installation.md) for GitHub Packages.

## Quick Diagnosis

```console
npx @pathbit/agentdevkit --version
npx @pathbit/agentdevkit doctor --target "./meu projeto" --json
npx @pathbit/agentdevkit sync --check --target "./meu projeto" --json
```

`doctor` check the installation of the kit. For tools, use `agentdevkit plugins
check <id>` or `agentdevkit tools check <nome>`; for the application, use the
project's own tests. Before sharing an output, remove private data and personal
paths.

If `doctor` indicate `client-selection-retired`, follow [customer
migration][retired-clients] to choose a destination and review the update plan.

In OpenCode 2, an isolated immediate consultation of `skill.list` can return an
empty list even with the files present. Check again on the server already
initialized and compare the skills locations with `.opencode/skills/`. A single
empty list does not prove that the files are missing. Mode `--standalone` uses a
private server for execution; see [customer documentation][opencode-cli].

If you lack resources, check the selection with `agentdevkit agents`. To include
a client, simulate `agentdevkit agents add cursor --dry-run` with the desired
ID. After reviewing, run the same command without `--dry-run`. Selection `none`
keeps the resources shared and `AGENTS.md`. Reopen the client session if it
requires reloading the skills. Client folders may remain by containing own files
or resources used by another client. [Selection of customers][clients]

| Symptoms or code | Next action |
| --- | --- |
| `node` or `npx` not found | Go on. [without Node/npm][runtime]. |
| `E401` or `E403` no registry | At npm, check out the destination; at GitHub, check [token and login][github-install]. |
| `E404` while downloading package | Check register, version and permission. |
| `E_ARGS` | Check command and quote with `agentdevkit --help`. |
| `E_MISSING` | Confirm `--target`; initialize the correct project. |
| `E_CLIENTS_RETIRED` | Simulate `update --agents <id> --dry-run`. |
| `E_UPGRADE` | Simulate `update --dry-run` and check out the local scripts. |
| `E_TARGET`, `E_SYMLINK` | Use the real folder outside the reserved directories. |
| `E_CONFLICT` or list `conflicts` | Review the affected plan and files. |
| `E_STATE`, `E_BLOCK`, `E_TEMPLATE` | Restore the file; do not invent hashes. |
| `E_MANAGED_BLOCK` | Review bookmarks or format; preserve your instructions. |
| `E_CHANGED` | A file changed during the operation; manages another plan. |
| `E_RECOVERY_PENDING` | Consult with `agentdevkit recovery --json`. |
| `E_RECOVERY_STORE` | Preserve the diary and check the location and permissions. |
| `E_RECOVERY_STATE` | Check the generation and ID of the current pending. |
| `plan-inspection-failed` | Review the planning failure. |
| `E_MIGRATION_REVIEW` | Preserve the legacy state and review the reactivation. |
| `E_PLUGIN` | Check ID and source with `plugins info <id>`. |

On macOS, if `--dry-run --json` point `xattr-present` or `xattr-unverified`,
check the route indicated and list the attributes with `xattr "<caminho>"`.

On macOS, `/tmp` e `/var/folders` are accepted when it is the expected system
aliases. Destinations that cross human links continue to be refused, even when
pointed out by `TMPDIR`, `TEMP` or `TMP`.

## Resume after interruption

Check the project log and check the generation, ID, phase and expected backup
path. `claim` can exist before the backup is complete.

```console
agentdevkit recovery --target "./meu projeto" --json
```

While the journal is pending or invalid, the kit blocks installation, update,
synchronization, change of configuration, and execution of tools. `doctor`
informs the limitation of the diagnosis. `next`, `agents` e `lang` you can
consult the readable information. `--dry-run` or `sync --check` inconclusive
returns output code 1 and `planStatus: "inconclusive"`.

1. Stop the processes you write in the project. Keep a copy or checkpoint of the
   current files, including state and files already prepared in Git.
2. Compare the manifest and available copies with the creations, removals, files
   and migrations observed in the project. Decide which changes to save and
   check the relevant permissions.
3. Please refer to the journal again. If the operation is pending and the
   revision is completed, replace the markers below by the generation and ID
   reported in that query and register the decision.

   ```text
   agentdevkit recovery resolve <geração> <id> --target "./meu projeto" --json
   ```

4. Run `doctor` and check out a new plan with `--dry-run` before applying
   changes. The resolution records the decision in the journal and preserves
   public files and backups. An invalid diary requires review of its evidence
   and blocks this resolution.

The field `recovery.backup` indicates the file folder for the pending operation.
`manifest.json` relates paths, planned actions, types and modes observed to
numbered copies in `blobs/`. Planned absences also appear in the manifest. The
path reported by the journal may point to a folder still missing, so check the
available material before comparing.

In the operation folder, next to `snapshot/` e `stage/`, `root.json` identifies
the existing ancestor and the missing root components at the beginning. When the
project already exists in the first use, the kit keeps the diary in the first
use. `.agent-tests/agentdevkit/recovery/`. For a project that is still missing,
create the reserve in the nearest existing ancestor and continue to consult it
there after the project is created. This external folder is called
`.agentdevkit-recovery-<hash>`. If the ancestor belongs to another Git
repository, check out the rules of ignore of that repository before preparing a
commit. Your backup may contain the previous contents of the project files.

If the recording of the final receipt returns `E_RECOVERY_UNCERTAIN`, consult
`recovery --json`- A receipt. `done` integrity can be visible when the
directory's subsequent synchronization failed. In this case, the next
reservation checks the bytes of the receipt and asks again for the
synchronisation available on the platform. On Windows, confirmation covers the
file. The directory entry permanence after power loss continues without proof.

The diary admits even 4.000 records and 1 MiB record content. `E_RECOVERY_LIMIT`
indicates that the remaining space does not contain a complete operation.
Preserve the history and backups for revision. The kit still requires a
maintenance procedure to resume recordings at this limit.

## Conflicts and backups

Simulate before replacing an own change:

```console
agentdevkit update --target "./meu projeto" --dry-run --json
```

Compare each `conflicts` with what you want to keep. Edit the source in
`.pbai4devs/`, not the notes generated when you are customizing a resource.
`sync` to update your leads. `update` reapplys the resources of the package
invoked and may conflict with this customization.

The field `preserved` can detail the reason observed. For example,
`claude-metadata-unverified` asks for revision of the reference and its
metadata; it does not prove property or that the rule is active.
`existing-reference-satisfied` Still no adoption for the kit.

When you uncheck Claude, some rules are preserved. Reactivation may indicate
`claude-metadata-unverified` for these files. Check them in plan with `agents
add claude --dry-run --json` and compare it to the sources in the hub. [Rules
Scope Claude](resources.md#synchronize-and-check)

For rules bequeathed to `.claude/rules/`, compare the content and activation
scope of the preserved reference to the given source. Also check if the file has
content prepared in the index before deciding any change:

```console
git ls-files --stage -- ".claude/rules/caminho/RULE.md"
git --no-optional-locks diff --cached -- ".claude/rules/caminho/RULE.md"
git --no-optional-locks diff -- ".claude/rules/caminho/RULE.md"
```

Replace the path with the informed conflict. Queries disable the optional update
of the index by Git; a preserved rule can remain active globally. Do not remove
or edit the reference based only on hash: review its content, metadata and
impact with project managers. After the decision, run again the `update
--dry-run --json` and check the plan and index.

`--force` does not replace own files or changed blocks. Solve the conflict by
preserving the content you want to maintain and recheck the plan. The installer
can also create a copy of the preexisting files with their original paths. When
present in the successful response, the field `backup` informs the location of
this copy of the project. For example,

```text
.agent-tests/agentdevkit/backups/<identificador>/
```

The internal layout repeats the original paths. To recover:

1. Stop editing and make a copy of the project or checkpoint on Git.
2. Compare the backup files with the current ones in the editor.
3. Restore only the desired files, preserving later editions; also check the
   applicable permissions and ACLs.
4. Run `doctor` and review the new plan before applying any correction.

No command `undo`. Copying the entire backup does not remove files that the
operation created; a complete rollback requires checking the Git plan and diff.
After failure, the informed paths for revision may include a partial copy, a
missing path or data from another source. Its presence does not prove that the
backup is complete or intact; compare before restoring. Backups are local and
may contain private data. They may appear in Git as existing ignores; check your
visibility before using `git add`- No, no, no. POSIX, the installer creates each
backup root with restricted access and preserves the mode of copied files. ACLs,
privileged access, concurrent exchange of folders and Windows require own
verification; do not assume secrecy only by the POSIX bits. If a file system
POSIX inform broad permissions for the new folder, operation fails with
`E_BACKUP` before copying. Backups do not replace version control.

Updates use the native copy of the platform to preserve supported metadata;
faults detected during the copy interrupt the publication. In macOS, readable
ACLs and xattrs are maintained; ACLs that deny writing, protection flags or
inconclusive queries block the change. Verification does not cover directory
ACLs or all filessystems. In Linux, the copy asks the `cp` that preserves xattrs
and the verifier compares the attributes when `getfattr` is available. Without
this tool, the copy may proceed with warning, but the preservation of xattrs has
not been independently verified. Removals and Windows have their own limits;
keep a verified copy of the important data before recovering files.

If planning, application or a tool fails after a possible change, interrupt
other operations and preserve files and backups until you review the status. See
`recovery` to know if an operation has booked the diary. The pending persists
between calls from CLI. Planning or tool failures may also require revision when
there was no reservation.

If planning finds an uncertain path in the temporary stage, the kit can maintain
and inform the entire folder in the temporary directory of the system. It may
contain copies of files from the project. Check the path and its contents before
removing it; an informed path as uncertain may no longer exist. Confidentiality
depends on permissions and ACLs from the environment. A failure in the
application or sync, before or after the attempt to publish, may leave a
temporary in the private stage of the operation. Check the informed path and its
contents before removing it. Replacement requires that the stage and destination
allow the same publication operation. If the system refuses to replace between
mounts with `EXDEV`, preserve backup and consult the diary before trying again.

In NTFS, the update opens the original file with exclusive access, confers the
identities and hashes of the original and the proposal and saves in the main
stream. The file keeps its identity, DACL and alternative streams. An
interruption during the recording may leave partial content. Please refer to the
diary and compare the destination with the backup before resuming the work.

After a failure, the recovery tries to preserve and inform paths whose identity
could not be proven. The number of identities followed is limited; under
pressure from descriptors, other changes can also be preserved. With a very low
limit of descriptors, such as 32, the operation may fail: review the informed
paths and increase the limit before you try again. Verification and removal or
restoration of a file are separate operations: a concurrent edition exactly in
this range can still be lost. Avoid editing the same paths during installation
or synchronization and review the result before you resume the work.

## Inconsistent status or notes

Whether the installation still uses `.pbai4devs/estado`, execute `agentdevkit
update` to migrate data and update scripts together. `estado` e `state` coexist,
compare and preserve the two folders before solving the conflict; the kit does
not choose or overwrite one of them automatically. If the configuration points
to paths within the old folder, update these paths to `.pbai4devs/state` The kit
does not rewrite the project decisions.

`missing`, `modified` e `outdated` ed `issues` indicate missing file, altered
content, or pending derivation. `sync --check` to inspect; if the origin changes
are intentional, execute `sync` And check again.

`removed-file-unverified` in `doctor` or `sync --check` indicates that a removal
record in `derived.json` has no entry in the installed state. If the input
exists with different hash, the status is invalid and the CLI returns `E_STATE`.
The direct synchroniser also warns. If planning fails after reading, the `sync
--check` indicates that the observation was prior to the failure; errors before
reading may still hide it. This may be legitimate history. Preserve the
specified state and file and review its origin before updating: the kit keeps
unknown records and blocks changes in the target identified by the same
spelling, including with `--force`. Comparison of aliases and automatic
reconciliation of migration are not yet complete. Do not set hashes to hide the
warning.

`E_MIGRATION_REVIEW` can stop planning when a removal record corresponds to the
installed state, the target is absent and its recreation is planned during
migration. Preserve the state and target, if any, and review both before
proceeding; do not delete the record to bypass the error. Automatic migration of
this case is not yet available.

If `.pbai4devs/state/agentdevkit.json` is invalid, recover a local backup
consistent with the corresponding files. Personal status is not versioned. Do
not invent hashes or delete the state to hide conflicts; ask the agent to
compare the sources and plan the repair with `init`/`sync`.

Human inputs receive a delimited block of the kit. Edit off markers `BEGIN
AGENTDEVKIT` e `END AGENTDEVKIT`; do not change state hashes. A modified block
needs revision, even with `--force`. If the feature is removed, only its proven
block is removed, preserving the human text. Preexisting human links in the
entries and customers are maintained without crossing them. See `preserved` in
JSON to see the routes maintained under project control, including when
complemented. Do not transform the hub or paths already managed into links.
Destinations within the project `.git`, `node_modules` or `.pbai4devs` are
refused, including with variations in maiúsculas/minúsculas.

In the script `sincronizar-agentes`, `--force` repairs managed conflicts with
backup. CLI blocks property conflicts even with `--force`. Human native
resources and preserved links remain intact. To maintain installation and your
selection of customers, prefer CLI.

## Download, platform or failing tool

Check out the default destination and a possible scope mapping:

```console
npm config get registry
npm config get @pathbit:registry
```

A value of `@pathbit:registry` prevails over `npx --registry=...`. If this
mapping was created only for an old installation, remove **only this key** from
the file that defined it. In the user file:

```console
npm config delete @pathbit:registry --location=user
```

If the key is in `.npmrc` project or environment variables, review at this
location; the command above does not change these settings. Preserve mappings
required by other dependencies and never delete the `.npmrc` whole. Without
scope mapping, choose registry per run in [installation
guide](installation.md#install).

Public npm does not require login to download the kit. In GitHub Packages, use a
classic token with `read:packages` e o [specific login][github-install].
Publishing versions requires additional permissions; login to GitHub CLI (`gh`)
does not automatically configure npm authentication.

Check access to GitHub, npm registry and `nodejs.org`, according to step. Keep
checking certificates and hashes; resolve proxy, network or OS dependencies and
repeat. Do not change for another binary architecture. Launcher accepts Node.js
18+ and prepare Node 24+ for the core. Node/npm, the agent needs to install
runtime by the OS mechanism before using npx.

`tools setup` reuses healthy installations and checks compatible ones. Not
applicable in a general selection does not mean “installed”. This preparation
also does not lower browsers, grants desktop permissions or initiates
applications. See [tools][tools] for additional requirements of the task.

A lock indicates installation in progress or interrupted. Wait for active
operation. If the process is finished, try `agentdevkit tools unlock <nome>`;
only a local lock with PID proven dead is removed. Do not delete active or
indeterminate locks to force two installations at the same time.

## Sessions, loops or calculator opening

AgentDevKit does not schedule sessions, opens the calculator or initiates loops
on its own. An explicit execution of the tool can open the requested
application. If something continues to run, identify the session, editor task,
extension or process that started it and stop it by the responsible interface.
Delete only logs does not interrupt a process that keeps recording.

Client folders and outputs like `.opencode/opencode-loop`, `.playwright*`,
caches and reports should not be versioned. Check with `git status` and `git
check-ignore -v
<caminho>`. If a file was already tracked, add an ignore not the
automatically removes from Git; review the index removal without deleting data.

O `.gitignore` hub does not control sister folders. Check visibility with `git
check-ignore -v` and adjust the design rules when necessary.
`shared-ignore-legacy` indicates that there is still an old mark on
`info/exclude`. If `update --dry-run --json` plan your migration, run `update`
to remove the markup and the proven duplicates preserving the effective rules.
The result informs where the original copy is. If the block is shared or its
content is uncertain, check the rules in each worktree before deciding any
adjustment. `artifact-coverage-unverified` e `artifact-unprotected` are
informative: they indicate unproven coverage or visible artifacts, but do not
block the check alone. Check them before versioning local files.

To investigate without changing the rules, see the paths and, in each worktree,
a file chosen to check:

```bash
git -C "<projeto>" rev-parse --git-path info/exclude
git -C "<projeto>" worktree list --porcelain
git -C "<worktree>" check-ignore -v --no-index -- "<caminho>"
```

A rule initiated by `!` It's an exception. `check-ignore` returns 1; operational
errors should be investigated separately. `--no-index` query rules even for
tracked files and does not inform if the file is in the index. Review the
content and effects before deciding any manual change.

If it appears `E_GIT_ENV`, there is an environment variable that redirects the
repository or the Git index. `GIT_DIR`, `GIT_WORK_TREE`, `GIT_COMMON_DIR` e
`GIT_INDEX_FILE` in the session and run again without redirects. The kit
interrupts the operation to protect the selected files and index.

If the sync cannot consult an ancestral Git, check out the root Git discovers
with `git -C "<projeto>" rev-parse --show-toplevel`. An assembly on another file
system can interrupt this discovery; confirm which repository and index belong
to the project before changing the Git environment.

In the developing version, `E_NESTED_GIT` indicates that a path to change or the
backup area crosses another Git repository. An unbooted submodule can also block
the operation by the external index. Check the project, submodule and its
indexes before choosing another destination; an independent submodule outside
the affected paths does not need to be removed. Sync chooses the full name of
the backup before checking the index, so that an unrelated brother submodule can
coexist with it. The installer can still refuse submodules within the backup
folder by precaution. `--check` does not reserve the name that will be used in
another execution. If the border appears during the operation, it can stop
partially applied and preserve the informed paths without reverting the changes
already made. These checks are not atomic with concurrent changes. UTF-8 can
also prevent the operation just in case, even when the trouble path is not
related. In a fixture, a process with access to the backup folder changed a
directory
ancestral by a link during sync and caused file creation outside the project.
Avoid competing writers in the backup folder; `0700` does not prevent another
process from the same user. Full correction is still pending. A concurrent
edition after checking the content can also make sync inform as valid a changed
backup; check it before recovery.

In Windows, short names NTFS can point to different names. When the identity of
prepared paths cannot be verified, the kit can indicate `E_STAGED` Even for
apparently independent files. Review the index before trying again. Publication
of journal records uses hardlinks in the same volume. If the volume does not
support them, the operation fails and the existing files are preserved. Remote
file systems may have their own aliases that this verification cannot identify
in all cases.

For help, include SO/arquitetura, versions of Node/npm/AgentDevKit, command
executed, output code and relevant part of JSONUse the [Project issues][issues]
or return to [Contents](../README.md).

[cli]: cli.md
[clients]: installation.md#update-and-choose-agents
[retired-clients]: ../kit/COMPATIBILIDADE.md#migrate-legacy-folders
[runtime]: installation.md#prerequisites
[tools]: ../kit/scripts/preparar-ferramentas/README.md
[issues]: https://github.com/pathbit/AgentDevKit/issues
[github-install]: installation.md#github-packages
[opencode-cli]: https://opencode.ai/docs/cli/

[reading-pt]: ../../guides/troubleshooting.md
[reading-en]: troubleshooting.md
[reading-es]: ../../es/guides/troubleshooting.md
