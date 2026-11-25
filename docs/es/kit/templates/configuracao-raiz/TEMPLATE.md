---
description: "Modelos de archivos de configuración compartidos de raíz."
status: modelo
language: es
---

# Configuración de la raíz

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Copie solo en la fase de configuración y preserve decisiones existentes:

| Modelo | Destino | Ajustar cuando |
| --- | --- | --- |
| [EditorConfig][editor] | `.editorconfig` | Formateo cambiar. |
| [Atributos Git][atributos] | `.gitattributes` | Texto/binário cambiar. |
| [Medio ambiente](../../../../../.pbai4devs/templates/configuracao-raiz/env.example.template) | `.env.example` | Preferencias cambiar. |

Use el [gitignore](../gitignore/TEMPLATE.md) e o [ambiente
local](../ambiente-local/TEMPLATE.md) Para los demás archivos. Versione ejemplos
sin credenciales; documente variables, obligatoriedad y valores estándar reales.
Prueba que setup funciona a partir del ejemplo.

[editor]: ../../../../../.pbai4devs/templates/configuracao-raiz/editorconfig.template
[atributos]: ../../../../../.pbai4devs/templates/configuracao-raiz/gitattributes.template

[reading-pt]: ../../../../../.pbai4devs/templates/configuracao-raiz/TEMPLATE.md
[reading-en]: ../../../../en/kit/templates/configuracao-raiz/TEMPLATE.md
[reading-es]: TEMPLATE.md
