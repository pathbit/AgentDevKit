---
description: "Generate catalogs and notes from shared origin."
language: en
---

# Sync Agents

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

```sh
node .pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs --check
node .pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs --force
node --test .pbai4devs/scripts/sincronizar-agentes/tests/TEST.mjs
```

`--check` only checks and shows up to ten paths in conflict; the normal
execution updates the resources. `--force` can save backup on `.agent-tests/`
before repairing managed paths; protected conflicts remain blocked. CLI to
register the operation and protect the temporary stage. If there is a to-do,
stop the processes that write in the project and see `npx @pathbit/agentdevkit
recovery --json` at project root. Use project log and project version CLI that
started the operation. Keep a copy of the current files and compare the changes
to the available backup. After reviewing the pending operation, refer to the
generation and ID again and run `npx @pathbit/agentdevkit recovery resolve
<geração> <id>`. Then run `npx @pathbit/agentdevkit doctor` and check out the
plan with `npx @pathbit/agentdevkit sync --dry-run --json`. An invalid journal
requires reviewing your evidence and blocks the resolution. The script refuses
to update or remove a file when it identifies more than one hardlink or cannot
verify a valid count. This can block the
operation on file systems that do not provide counting. The conference does not
prevent concurrent changes after reading; interrupt other processes before
syncing. `--check` informs hardlinks and unchecked counts in the paths you plan
to change; the situation may change before the application. In macOS and Linux
updates, the stage copies the supported native metadata and checks the copy
before the publication. In macOS, ACLs that deny writing, protection flags or
inconclusive queries block the operation; readable ACLs and xattrs are preserved
when native verification passes. Removals with metadata that would be lost
remain blocked. ACLs of directories and concurrent changes after verification
are not covered. An informed path after failure may contain partial data or from
another source; preserve it and review before any recovery. In macOS, a backup
destination with ACL inherited or inconclusive query is refused before copying.
Empty folder is informed for review; inspection does not guarantee privacy
against concurrent changes nor covers other systems.
Git queries disable inherited trackings only in subprocesses without changing
user configuration. Readings can still update file system access metadata.
[agentic command](../../commands/sincronizar/COMMAND.md) use CLI: Consult `sync
--dry-run --json`, apply `sync` and check it out `sync --check`. The direct
script uses the existing manifest; its `--check` does not detect native YAMLs
still absent from that manifest. CLI Recomposes the manifest in the planning.
Compatible native features can receive a short block with the hub reference. The
state stores the hash of the block and allows external editions. An altered
block remains protected even with `--force`Human links remain opaque, a subagent
of his own in `.zcode/agents/<nome>.md` is preserved entirely when it takes the
path that the kit would use. Legacy facilities of Gemini CLI may have a
contribution from the kit in `prompt` TOML. Synchronizer recognizes its
migration format. Direct sync rejects manifest lines pointing to `.gemini`,
including in manual settings. In old installations, review the plan of
`agentdevkit update` as [customer migration][migration]. Team's own files remain
in the project.

Metadata comes from source or from YAML Native declared in manifesto. Rules
require `trigger` valid; `glob` requires `globs`. Native origins need to belong
to the catalog; results, caches and temporary folders do not enter the indexes.
Treatment of Copilot triggers and conservative migration of old instructions are
described in [Compatibility](../../COMPATIBILIDADE.md).

`espelhos.conf` sets `agente|pasta|layout`, can adjust each type with
`formato|pasta|tipo|formato` and register `descoberta|.agents|antigravity`.
`agrupado` preserves the tree; `plano` removes categories; `arquivo` preserves
categories and uses `nome.md`. `mdc`, `instrucoes`, `prompt` e `agente` produce
native extensions; `nenhum` disables the type derivation on the indicated route.
`agents none`, the manifesto keeps only the hub catalog and common instructions.
Without Antigravity in the selection, Codex uses `.agents` Just for skills.
`fallback|destino|origem|skills` uses the destination for each skill whose
origin route is obstructed. The discovery generates the three manifestos JSON
Antigravity. See the reasons and limits in
[Compatibility](../../COMPATIBILIDADE.md).

Without manifesto, the synchroniser generates the policy of
`templates/clients/ADAPTERS.json` using saved selection. A legacy state without
selection maintains `all`. Without manifest or installed state, it generates
only the hub. After installation, it only depends on Node and the local hub,
without the npm package. It respects the chosen customers. `agentdevkit agents
<lista>` to change the selection, or `agents add <id>` e `agents remove <id>` to
adjust it. The manifesto generated follows these CLI operations. In old
installations, use `agentdevkit update` to review the migration of the
Antigravity manifesto or the withdrawal of Kimi's legacy notes.

Direct sync preserves the human rules of ignoring and Git index. The legacy
block of the version 0.0.21 ed `.git/info/exclude` can be migrated when there is
proof of authorship and a single worktree.
`.agent-tests/agentdevkit/ignore-migrations/`. Notes and artifacts can be
visible; check the status before adding files. Diagnosis informs exposed private
files and old blocks in the delete that may still affect other workstrees. New
entries use templates; hashes in `state/derived.json` allow you to update
generated files and blocks separately, preserving human changes. CRLF already
equivalent to the expected output can be kept intact, without duplicate block or
adoption of property. If there is divergence with a derived record, direct check
informs the conflict and the API can return `line-ending-diverged`.
Standardization does not allow overwriting. `--check` only check; does not
change the index. Claude rules remaining after unchecking the client generate
warning and check failure, as they may still be active. Check them out before
removing them. A link, error or scan limit
also leaves the scope unchecked. Possible links in Markdown examples can
generate conservative warning; the file is not adopted for this. Obsolete notes
can be removed when the property is proven; own files and folders, including
additional ones within the same resource, must remain. The derivative state
records proven deletions to reconcile them in the next `update`; additional
fields existing in the state are preserved.

## Synchronizer Maintainer

- [SCRIPT.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/SCRIPT.mjs)
  provides the CLI, public exports and entry to the
  private internship.
  [private-stage.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/private-stage.mjs)
  confers the
  identity of the internship before allowing operations in this mode.
  [synchronize.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/synchronize.mjs)
  it sets up the plan, checks the
  preconditions and produces the `--check`.
- [manifest.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/manifest.mjs)
  solves customer selection and destinations.
  [references.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/references.mjs)
  treats the formats of the references.
  [projections.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/projections.mjs)
  derives the catalogs and root entries,
  including the removal of proven property files.
- [workspace.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/workspace.mjs)
  confers limits and identity of the paths.
  [operations.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/operations.mjs)
  orders the writings and removals, captures
  the expected bytes and uses
  [git-safety.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/git-safety.mjs)
  at Git's
  appointments.
  [derived-state.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/derived-state.mjs)
  It preserves the property
  records.
- [metadata.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/metadata.mjs)
  Concentrates metadata checks.
  [apply.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/apply.mjs)
  applies the plan and records the recovery.
  [backup.mjs](../../../../../.pbai4devs/scripts/sincronizar-agentes/backup.mjs)
  verifies the additional copies requested by
  `--force`.

[migration]: ../../COMPATIBILIDADE.md#migrate-legacy-folders

[reading-pt]: ../../../../../.pbai4devs/scripts/sincronizar-agentes/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/scripts/sincronizar-agentes/README.md
