---
description: "Analyze local secrets, dependencies and code patterns."
language: en
---

# Audit Security

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Requires Node.js 24+ and tools prepared with `setup security` in the manager.
The command never installs tools and does not send sources to remote services.

```console
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs check
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs update-data --ecosystems npm,Go
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs run
node .pbai4devs/scripts/auditar-seguranca/SCRIPT.mjs run --checks secrets,sast
```

`run` uses a text snapshot without following links. Deletes binaries, generated
directories, and settings that could suppress findings. The report records the
deletions. `--target` restricts to a folder within the project;
`--include-history` adds the Git history to the secret check and requires that
the destination be the root of that repository. Folders `dist/` e `build/` they
are also read; a text bundle is not hidden because it is a build artifact.
`examples/generated/` is deleted only when a rule in `.gitignore` identical to
the index blob to ignore and the index does not contain directory paths. Ignore
global, `info/exclude` and rules only in working tree do not delete it. Select
folder directly with `--target` It also analyzes it.

`update-data` low only public bases of the OSV by HTTPS, without parsing or
sending the project. The bases are in the local scanner cache, with size, date
and SHA-256 of local integrity. This hash is not the publisher's signature.
ZIP/ZIP64, limits, CRC and the records JSON OSV. Updates preserve the previous
base if download or promotion fails.

Analyses use Gitleaks, OSV with `--offline` and Opengrep with rules JS/TS local.
The rules themselves detect entries HTTP ed `eval`, shell and consultations SQL,
besides TLS deactivated; require context sorting, do not prove exploitation. OSV
requires local bases of detected ecosystems. Lack of tool, base or parsing error
generates incomplete state, never approval.

| Output | Meaning |
| --- | --- |
| `0` | Checks completed without findings; non-applicable items are explicit. |
| `1` | Found for triage. |
| `2` | Invalid execution, interrupted or incomplete. |

Results are given in `.agent-tests/security/<execução>/report.json`. Do not
include code, matches or secret values. JSON Crude and temporary snapshots are
removed. A destination `--output` It needs to be new, ignored by Git and be
under `.agent-tests/`. The workbook `.agent-tests/security/` also needs to be
ignored. The audit refuses Git redirects and paths that may conflict with the
index; it does not change the Git configuration; it disables `fsmonitor` In the
queries and environment provided to the scanners. When detecting change of the
workbook, the audit interrupts cleaning and preserves the content found.
Verification and removal are not atomic; avoid changing this folder during
execution.

Snapshot accepts up to 20,000 files, 10 MiB per file and 256 MiB in total. A
base OSV can have up to 512 MiB; exceeding the limits makes execution
incomplete. Validation accepted up to one million entries ZIP, 16 MiB per
registration and 2 GiB uncompressed. `--target` when necessary. At the end,
renumbers the scope: inclusion, removal, type change, mode or content during
analysis invalidate approval.

Scanners do not validate authorization by objeto/tenant, RLS or Firebase Rules.
Complete the flow through the skill [review-safe][skill] and their negative
tests.

[skill]: ../../skills/seguranca/revisar-seguranca/SKILL.md

[reading-pt]: ../../../../../.pbai4devs/scripts/auditar-seguranca/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/scripts/auditar-seguranca/README.md
