---
description: Brazilian Portuguese, English and Spanish in the AgentDevKit guides.
language: en
---

# Documentation languages

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Brazilian Portuguese is the source language for documentation.
`README.md` is the default entry point. Start from `README.en.md`
for English and `README.es.md` for Spanish.

Update all three versions when you change a guide, reference or
specification. Keep the instructions and examples equivalent. In a
translation, link to the matching language. Preserve paths and identifiers
that the CLI, Git or supported clients read.

Use English for code, comments and internal names. Keep translated
messages in the language tables used by the CLI. Command names, options
and persisted keys follow the version's interface.

`npm run check` checks that the three versions exist and verifies Markdown
structure and local link paths.

[reading-pt]: ../../maintainers/languages.md
[reading-en]: languages.md
[reading-es]: ../../es/maintainers/languages.md
