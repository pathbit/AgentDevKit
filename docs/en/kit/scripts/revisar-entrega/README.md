---
description: "Verification of documents, review and evidence of delivery."
language: en
---

# Review Delivery

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

After implementing, update the affected documentation and test, manage the
record:

```sh
node .pbai4devs/scripts/revisar-entrega/SCRIPT.mjs prepare --id minha-mudanca
```

Use `--spec caminho/SPEC.md` to extract the criteria `AC-001` of the spec.
`--scope arquivo` limits a revision; without it, the snapshot gathers Git
changes. Use `--document arquivo` to include PRD, design and other documents. In
automatic collection, submodules, sparse index, flags that hide changes and
applied Git filters are blocked; use `--scope` divided index and partial clone
are refused in any way. README, AGENTS, CLAUDE e GEMINI root versionables
automatically enter the revision, even without changes. Ignored local outputs
outside the index are not mandatory documents; tracked documents remain covered
even when an ignore rule matches the name. Fill out decisions, results and
evidence in the JSON returned; independent revision piece, execute `seal
<caminho/revisao.json>` And then `check <caminho/revisao.json>` before you
finish.

`check` validates only the scope of the reports. Before a commit, use
`check-commit <relatorio> [outros-relatorios...]`: all prepared files must be
covered by sealed revisions. The command accepts only regular files with Git
mode `100644` and compares the prepared bytes to the revised; filter
normalizations or CRLF Each prepared blob is limited to 64 MiB.

Before a fast-forward merge, use `check-merge --destino refs/heads/<branch>
<relatorio> [Other reporters...]` at source. It compares commit and all diff
with sealed revisions; confirm the returned hashes before integrating.

Check refuses pending results, evidence ausentes/versionadas and changed files
after revision. Reports stay in `.agent-tests/<id>/<execução>/`. Preparation
preserves the scope in `baseline.json`; the seal records hashes of the report
and evidence in `seal.json`. Preserve these metadata in the stream. Subsequent
changes require new execution, preserving previous evidence. A staged deletion
with file still present and ignored is recorded as `indexAction: untrack`.
Snapshot preserves your physical hash; changes in file, ignore or in this index
action invalidate review. Differences between index and tested content remain
blocked, including with `--scope`. The script checks the record; semantic review
remains the reviewer's responsibility. Successful outputs include
`reviewVerification: "not-verified"`: the script does not authenticate the
reviewer or confirms that the revision occurred. See skill
[update-document](../../skills/projeto/atualizar-documentacao/SKILL.md).

[reading-pt]: ../../../../../.pbai4devs/scripts/revisar-entrega/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/scripts/revisar-entrega/README.md
