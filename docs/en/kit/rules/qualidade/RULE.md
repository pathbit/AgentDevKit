---
trigger: always_on
description: "Test patterns, evidence, and Markdown of the project."
language: en
---

# Quality

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Versify test code and fixtures in `tests/`; agent infrastructure tests are in
`.pbai4devs/scripts/<nome>/tests/`. Do not view results, reports, catches or
temporary artifacts: use `.agent-tests/`, ignored directories or a temporary
folder outside the repository. Please inform the necessary checks you cannot
perform.

Use `verificar-trabalho` to prove the changes. Web changes require testing the
actual flow in the browser; desktop requires opening and testing the
application. Revised code, build or fixture isolated do not replace this
functional proof.

Start new Markdown files with frontmatter YAML suitable to the type and title
H1; preserve the metadata required by the tool. In existing human documents,
keep the format and content: do not reformat them just to impose this pattern.

O `.gitignore` the root belongs to the project and is not changed by the kit.
[gitignore model](../../templates/gitignore/TEMPLATE.md) is optional for project
rules. `.pbai4devs/.gitignore` controls the hub; the generator protects the
external derivatives in the local Git. Without Git, this protection is pending
until `git init` and sync, before adding files to the index. Check with Git both
the allowed files and the ignored artifacts. Shared Scripts must be versioned;
local results ignored. Ignore downloaded content from tools, preserving
`TOOL.json`, own scripts and guides. Do not hide scripts, fixtures or templates
by generic name or extension. Any file or folder `.playwright*` is ignored, in
any box, including `.playwright-mcp`.

[reading-pt]: ../../../../../.pbai4devs/rules/qualidade/RULE.md
[reading-en]: RULE.md
[reading-es]: ../../../../es/kit/rules/qualidade/RULE.md
