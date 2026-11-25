---
description: "Optional example of ignore rules for the project."
language: en
---

# Custom Ignore

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

O `.gitignore` the root belongs to the project; the kit does not create or alter
it. The project can adopt this example and its own patterns if desired.
`.gitignore` hub does not reach sister folders with `../`. The kit preserves the
existing ignores, the index and `.git/info/exclude`; check visibility with `git
status` e `git check-ignore -v` and adjust project rules when needed. Client
folders may contain human files and private data. Already tracked files remain
in the index; the kit does not unindex them. CLI, preserve
`.github/copilot/settings.json` as a team configuration and ignore the version
`settings.local.json`. If `COPILOT_HOME` point inside the project, ignore the
chosen personal directory. Ignore downloaded binaries per location, not by
extension: `.bat`, `.exe` and other files can be scripts or fixtures required.
Do not use generic rules like `Release/`, `Scripts/` or `Lib/` that hide fonts
and templates. Ignore any file or folder `.playwright*`, in any combination of
maiúsculas/minúsculas, including `.playwright-mcp`.

```gitignore
# ---------------------------
# CUSTOM IGNORE
# ---------------------------

## Ajustes locais do Copilot CLI
/.github/copilot/settings.local.json

## Testes e artefatos locais de agentes
/.[Aa][Gg][Ee][Nn][Tt]-[Tt][Ee][Ss][Tt][Ss]/

## Resultados e relatórios de testes
[Tt][Ee][Ss][Tt][Rr][Ee][Ss][Uu][Ll][Tt][Ss]/
[Tt][Ee][Ss][Tt]-[Rr][Ee][Ss][Uu][Ll][Tt][Ss]/
.[Pp][Ll][Aa][Yy][Ww][Rr][Ii][Gg][Hh][Tt]*
[Pp][Ll][Aa][Yy][Ww][Rr][Ii][Gg][Hh][Tt]*/
[Bb][Ll][Oo][Bb]-[Rr][Ee][Pp][Oo][Rr][Tt]/

## Temporary folder and files
**/[Tt][Mm][Pp]
**/[Tt][Ee][Mm][Pp]
```

[reading-pt]: ../../../../../.pbai4devs/templates/gitignore/TEMPLATE.md
[reading-en]: TEMPLATE.md
[reading-es]: ../../../../es/kit/templates/gitignore/TEMPLATE.md
