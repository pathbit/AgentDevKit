---
trigger: model_decision
description: "Apply when consulting, preparing, integrating or publishing Git amendments."
language: en
---

# Git Rules

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

In unaltered queries, set `GIT_OPTIONAL_LOCKS=0` in the subprocess environment
to reduce optional updates. This does not guarantee the exact preservation of
the index: `git diff` you can update it. When this preservation is required,
only use provenly secure methods for the repository; without them, do not
execute the query and report the limitation. The variable does not replace the
necessary locks for operations that alter Git.

Use Conventional Committees (`tipo(escopo): descrição`, optional scope),
including in checkpoints and merges; highlight changes incompatible with `!` or
`BREAKING CHANGE:`. Author and committer should be the user, never an agent;
check out the effective identities and do not add coauthorship or agent
identification. If the user identity is not clear, ask. Do not change the Git
configuration or rewrite existing human authors. Code agents never sign commits
by GPG, SSH or trailer. When the cryptographic signature is required, the human
responsible must carry it out.

Before publishing, check the contents, checks and remote status; do not send
incomplete tasks or use forced push. See the corresponding skill in
`.pbai4devs/skills/git/`.

[reading-pt]: ../../../../../.pbai4devs/rules/git/RULE.md
[reading-en]: RULE.md
[reading-es]: ../../../../es/kit/rules/git/RULE.md
