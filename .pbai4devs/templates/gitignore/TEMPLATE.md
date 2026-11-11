---
description: Bloco customizado obrigatório ao final do gitignore.
---

# Custom ignore

Ao criar ou atualizar `.gitignore`, mantenha este bloco no final. Preserve
exceções existentes e acrescente os ignorados específicos da tecnologia aqui.
Regras de `.pbai4devs` e dos clientes ficam nos `.gitignore` dessas pastas,
gerados de [shared.ignore](shared.ignore), [agents.ignore](agents.ignore) e
[clients.json](clients.json). Não coloque esses caminhos no arquivo da raiz.
O sincronizador mantém o bloco `BEGIN AGENT IGNORE` / `END AGENT IGNORE`;
regras próprias ficam fora dele, com exceções depois do bloco. Para permitir
novos arquivos compartilhados, ajuste as fontes e sincronize. Arquivos
desconhecidos nas raízes agênticas permanecem ignorados.
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
