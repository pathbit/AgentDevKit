---
name: git-merge
description: "Integrates branches with completed and verified work."
language: en
---

# git-merge

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Check source, destination, history, identities, messages, local changes and
checks; integrate only complete tasks according to AGENTS.md. If the commits to
integrate identify agents as authors or co-authors, inform them and do not
integrate them.

When there is implementation or gate required, at source run separately:

```sh
node .pbai4devs/scripts/revisar-entrega/SCRIPT.mjs check-merge \
  --destino refs/heads/<branch> <revisao.json> [outros...]
```

Check requires fast-forward, coverage of all diff and snapshots corresponding to
the origin commit; any failure blocks integration. Register the returned source
and destination hashes and confirm both immediately before merge, with commands
that interrupt execution in any failure; do not mask the status. Also confirm
`git symbolic-ref HEAD` It is the ref of destination and that the HEAD matches
the validated destination hash. If any conference fails, interrupt; if hashes
change, recheck and check. Integrate with `git merge --ff-only
<hash-da-origem-validada>`. These verifications are not atomic. Check refuses
links, submodules, executable files and Git outputs larger than 64 MiB; report
blockages without bypassing them. Preserve work outside the scope. If the
integrated result diverges from the revised content, review and check before
completing. Without implementation, follow the applicable criteria.

If you generate merge commit, check out the effective identities and follow
`.pbai4devs/rules/git/RULE.md` for identity, message and signature. Preserve
changes, resolve conflicts in the authorized scope and respect branch
protections.

[reading-pt]: ../../../../../../.pbai4devs/skills/git/git-merge/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/git/git-merge/SKILL.md
