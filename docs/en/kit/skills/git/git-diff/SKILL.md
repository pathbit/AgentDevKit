---
name: git-diff
description: "Examines and summarizes Git changes."
language: en
---

# git-diff

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Examine prepared and unprepared diffs as requested, including untraceable files
when relevant. Use `GIT_OPTIONAL_LOCKS=0` in the queries, but do not assume to
preserve the bytes of the index: `git diff` you can still update it. If the
exact preservation is required, do not perform a query without proven safe
method for the repository; inform the limitation. `sharedindex` in split-index
repositories.

[reading-pt]: ../../../../../../.pbai4devs/skills/git/git-diff/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/git/git-diff/SKILL.md
