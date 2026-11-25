---
name: git-worktree
description: "Create or inspect workstrees for parallel work."
language: en
---

# git-worktree

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Check out existing workstrees and branches. For parallel agents, create
worktrees with different auxiliary branches; preserve changes and only integrate
completed and verified work.

Inspect without editing content and follow [Git
rule](../../../rules/git/RULE.md): same queries can change the index. Create
another worktree in a suitable directory and available branch does not require
commit, stashear or generate patches of existing changes. Common diffs do not
include untraced files. Preserve index and content and do not recommend these
actions without evaluating intention. `git status --short`, `AM` indicates file
added to the index and modified later in the working tree.

[reading-pt]: ../../../../../../.pbai4devs/skills/git/git-worktree/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/git/git-worktree/SKILL.md
