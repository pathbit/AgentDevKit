---
name: git-commit
description: "Creates a commit with selected user changes."
language: en
---

# git-commit

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Check out the state, diff, prepared changes and effective identities with `git
var GIT_AUTHOR_IDENT` e `git var GIT_COMMITTER_IDENT`. For unwritten query with
exact preservation of the bytes of the index, do not assume that status or diff
are secure: use proven method for the repository or report limitation. Do not
execute write commands when the request is only query. Follow the shared rule
`.pbai4devs/rules/git/RULE.md` for identity, message and signature. Author and
committer should be the user; do not assign authorship or coauthor to code
agents or add identification of them to the message. Prepare only authorized and
evaluated files in the delivery review; do not remove index changes without
authorization. Unprepared editing may remain outside the commit without removing
the prepared version. `.pbai4devs/commands/revisar-entrega/COMMAND.md` and,
after preparing the index, use the selector for `revisar-entrega check-commit
<relatorio> [outros-relatorios...]`:

```sh
node .pbai4devs/scripts/revisar-entrega/SCRIPT.mjs check-commit <relatorio>
```

Replace `<relatorio>` by file path and add other reports such as arguments. All
staged files must have been checked. Without reporting or history, please inform
that they have not been checked. If you fail or the index changes, interrupt and
recheck. Create the commit only with approved criteria, documentation and
revision. Check author, commit and message; do not include incomplete work or
other changes.

[reading-pt]: ../../../../../../.pbai4devs/skills/git/git-commit/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/git/git-commit/SKILL.md
