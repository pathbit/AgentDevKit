---
description: "Review documentation, criteria and evidence before commit or merge."
language: en
---

# Review Delivery

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Input: change reference, spec when there is and scope files. Prerequisites:
ready change, Node.js 24+ and report and evidence of ignored execution in
`.agent-tests/` and off the Git index. [ignore template][ignore] If the rule is
missing. For documentation or a single adjustment without spec, set specific
criteria such as AC-001 and register the reason. Features follow the approved
spec flow.

Automatic collection refuses submodules, sparse-index, flags that hide changes
and Git filters applied; in these cases, use `--scope` Split-index and partial
clones are rejected in all modes. Git queries disable fsmonitor only in the
subprocess; no configuration is changed.

1. Gather diff, documentation decisions and evidence by criterion. Use
   [update-document][documentacao] for documentation gaps and
   [check-work](../../skills/projeto/verificar-trabalho/SKILL.md) for missing or
   out-of-date evidence.
2. Use the [hub script](../../scripts/revisar-entrega/README.md) with `prepare
   --id <referencia>`, `--spec`, `--scope` e `--output` when applicable.
   Complete JSON generated according to
   [template](../../templates/revisao-entrega/TEMPLATE.md), with real evidence
   and justified documentation decisions.
3. Activate the [reviewer](../../agents/revisor/AGENT.md) or another person or
   independent agent, in reading, about the same snapshot. Ask him to contest
   assumptions and search for regressions, failures and gaps in the tests.
   Register findings with evidence and location. Apply the pertinent ones; if
   files change, generate new snapshot, run the affected checks and review again
   before registering. `review.status: approved`. No independent review
   available, report the limitation and keep the review pending.
4. Run `seal <relatorio>` to register hashes after the review and `check
   <relatorio>` by the same script. Failed, criteria without proof or pending
   revision block commit/merge.

At the exits JSON, `reviewVerification: "not-verified"` indicates that the
approval was declared in the report: the gate does not authenticate its origin
or confirms that the reviewer acted. Check the actual response before completing
the review.

Before commit, execute `revisar-entrega check-commit <relatorio>
[outros-relatorios...]`. Sealed revisions union should cover all prepared files,
including both renaming tips. Check only accepts regular files with Git mode
`100644` whose blobs correspond to the revised bytes. Filters or CRLF to change
these bytes are refused. It is not atomic: repeat it if the index or files
change before the commit.

Before a fast-forward merge, at source, execute `revisar-entrega check-merge
--destino refs/heads/<destino> <relatorio> [outros-relatorios...]`. Verification
requires diff coverage and matching with the revised commit. It blocks divergent
history, links, submodules, executable files, and Git operations above 64 MiB.
Confirm the returned hashes before integrating.

Output: result by criterion, to-dos and single path `revisao.json` ed
`.agent-tests/<referencia>/<execucao>/`. This stage is mandatory after any
implementation; the absence of spece does not eliminate the review.
`baseline.json` e `seal.json` are metadata generated; do not edit them manually.

[documentacao]: ../../skills/projeto/atualizar-documentacao/SKILL.md
[ignore]: ../../templates/gitignore/TEMPLATE.md

[reading-pt]: ../../../../../.pbai4devs/commands/revisar-entrega/COMMAND.md
[reading-en]: COMMAND.md
[reading-es]: ../../../../es/kit/commands/revisar-entrega/COMMAND.md
