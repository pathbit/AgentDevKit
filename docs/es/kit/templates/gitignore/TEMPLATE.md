---
description: "Ejemplo opcional de reglas de ignorar para el proyecto."
language: es
---

# Custom ignore

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

O `.gitignore` De la raíz pertenece al proyecto; el kit no lo crea ni lo cambia.
El proyecto puede adoptar este ejemplo y sus propios patrones si lo desea. O
`.gitignore` del hub no alcanza carpetas hermanas con `../`. El kit preserva los
ignores existentes, el índice y `.git/info/exclude`; comprueba la visibilidad
con `git status` e `git check-ignore -v` y ajuste las reglas del proyecto cuando
sea necesario. Carpetas de clientes pueden contener archivos humanos y datos
privados. Archivos ya rastreados permanecen en el índice; el kit no los
desindexa. Para Copilot CLI, preserve `.github/copilot/settings.json` como
configuración del equipo y ignore la versión `settings.local.json`. Se
`COPILOT_HOME` apuntar hacia dentro del proyecto, ignore el directorio personal
elegido. Ignore binarios descargados por local, no por extensión: `.bat`, `.exe`
y otros archivos pueden ser scripts o fixtures necesarios. No use reglas
genéricas como `Release/`, `Scripts/` o `Lib/` que escondan fuentes y modelos.
Ignore cualquier archivo o carpeta `.playwright*`, en cualquier combinación
maiúsculas/minúsculas, inclusive `.playwright-mcp`.

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
[reading-en]: ../../../../en/kit/templates/gitignore/TEMPLATE.md
[reading-es]: TEMPLATE.md
