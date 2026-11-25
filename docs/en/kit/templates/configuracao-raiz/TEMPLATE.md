---
description: "Templates of shared root configuration files."
status: modelo
language: en
---

# Root Settings

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Copy only in the configuration phase and preserve existing decisions:

| Template | Destination | Adjust when |
| --- | --- | --- |
| [Config Editor][editor] | `.editorconfig` | Formatting to change. |
| [Git Attributes][atributos] | `.gitattributes` | Texto/binário change. |
| [Environment](../../../../../.pbai4devs/templates/configuracao-raiz/env.example.template) | `.env.example` | Settings change. |

Use the [gitignore](../gitignore/TEMPLATE.md) e o [local
environment](../ambiente-local/TEMPLATE.md) for the other files. Verse examples
without credentials; document variables, mandatory and real standard values.
Test that setup works from the example.

[editor]: ../../../../../.pbai4devs/templates/configuracao-raiz/editorconfig.template
[atributos]: ../../../../../.pbai4devs/templates/configuracao-raiz/gitattributes.template

[reading-pt]: ../../../../../.pbai4devs/templates/configuracao-raiz/TEMPLATE.md
[reading-en]: TEMPLATE.md
[reading-es]: ../../../../es/kit/templates/configuracao-raiz/TEMPLATE.md
