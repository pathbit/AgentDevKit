---
description: Português do Brasil, inglês e espanhol nos guias do AgentDevKit.
language: pt-BR
---

# Idiomas da documentação

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

O português do Brasil é a fonte da documentação. O README padrão fica em
`README.md`. As versões em inglês e espanhol começam em
`README.en.md` e `README.es.md`.

Atualize as três versões ao alterar um guia, uma referência ou uma
especificação. Mantenha as mesmas instruções e exemplos. Nas traduções,
aponte os links internos para a página do mesmo idioma. Preserve os
caminhos e identificadores que a CLI, o Git ou os clientes leem.

Use inglês no código, nos comentários e nos nomes internos. As mensagens
traduzidas ficam nas tabelas de idioma usadas pela CLI. Nomes de comandos,
opções e chaves persistidas seguem o contrato da versão.

`npm run check` verifica a presença das três versões, a estrutura Markdown
e os caminhos dos links locais.

[reading-pt]: languages.md
[reading-en]: ../en/maintainers/languages.md
[reading-es]: ../es/maintainers/languages.md
