---
name: criar-comando
description: "Creates or updates shared commands and their notes."
language: en
---

# Create command

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Treat commands as usage case entries. Create or update
`.pbai4devs/commands/<nome>/COMMAND.md` for
[template](../../../templates/comando/TEMPLATE.md): adjustment description and
H1, remove `status: modelo` and define entry, standards, prerequisites,
execution and exit. Gather questions that change these contracts before
executing.

Reuse skills for decisions and profiles for responsibilities. Tell who gets the
output, with which proofs and on which condition. Enter script names and
arguments `.mjs` and use `executar-script` with Node.js 24+. The direct selector
does not require npm by itself; check the bootstrap and target script
prerequisites separately. Refer to required tools and folders; do not copy code,
binaries or instructions. Check the scripts and skills contracts referenced
before restricting arguments; do not declare rejections that have not been
verified. Check the full output, including executable messages, `stdout`,
`stderr`, output code and effect of `--raw`; do not just describe the output of
the script as if it was the entire output of the command. `--raw` e `--plan`
before the target are executable options; after the target, are script
arguments. `--plan` does not execute the target. Document this distinction
without prohibiting valid options; do not generalize the error channel beyond
what has been verified. Preserve arguments and documents.

When applicable, check out the native prompt generated in `.github/prompts/`: it
contains only metadata, H1 and the link to the source. The manifest is
generated; do not edit it by hand. Do not promise to import or run automatically
by Markdown.

Update índice/guia, follow the rules of structure and quality and finish with
`sincronizar-agentes`, including after renaming or removing commands. Check
arguments and discovery; report when reading needs to be explicit.

[reading-pt]: ../../../../../../.pbai4devs/skills/projeto/criar-comando/SKILL.md
[reading-en]: SKILL.md
[reading-es]: ../../../../../es/kit/skills/projeto/criar-comando/SKILL.md
