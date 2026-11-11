---
description: Bloco customizado obrigatório ao final do gitignore.
---

# Custom ignore

Ao criar ou atualizar `.gitignore`, mantenha este bloco no final. Preserve
exceções existentes e acrescente os ignorados específicos da tecnologia aqui.
Regras de artefatos locais vêm de [shared.ignore](shared.ignore) e
[agents.ignore](agents.ignore). As saídas calculadas usam
[local.ignore](local.ignore) em `.git/info/exclude`; sem Git, um bloco gerado
na raiz protege os arquivos e migra para `exclude` após `git init` e `sync`.
O sincronizador mantém o bloco `BEGIN AGENT IGNORE` / `END AGENT IGNORE`;
regras próprias ficam fora dele, com exceções depois do bloco. Para permitir
novos arquivos compartilhados, ajuste as fontes e sincronize. Raízes dedicadas
dos clientes são locais. Em `.github` e `.vscode`, arquivos próprios continuam
elegíveis; somente os derivados são excluídos.
Ignore binários baixados por local, não por extensão: `.bat`, `.exe` e outros
arquivos podem ser scripts ou fixtures necessários. Não use regras genéricas
como `Release/`, `Scripts/` ou `Lib/` que escondam fontes e modelos.
Ignore qualquer arquivo ou pasta `.playwright*`, em qualquer combinação de
maiúsculas/minúsculas, inclusive `.playwright-mcp`.

```gitignore
# ---------------------------
# CUSTOM IGNORE
# ---------------------------

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
