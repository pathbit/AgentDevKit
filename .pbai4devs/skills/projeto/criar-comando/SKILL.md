---
name: criar-comando
description: Cria ou atualiza comandos compartilhados e seus apontamentos.
---

# Criar comando

Trate comandos como entradas de casos de uso. Crie ou atualize
`.pbai4devs/commands/<nome>/COMMAND.md` pelo
[modelo](../../../templates/comando/TEMPLATE.md): ajuste descrição e H1,
remova `status: modelo` e defina entrada, padrões, pré-requisitos, execução e
saída. Reúna dúvidas que alterem esses contratos antes de executar.

Reutilize uma skill para decisões e fluxos completos. Indique os nomes e
argumentos dos scripts `.mjs` e use `executar-script` com Node.js 24+.
Referencie ferramentas e pastas necessárias; não copie código, binários ou
instruções. Preserve os argumentos e documentos existentes.

Registre o prompt nativo em `.github/prompts/` no manifesto quando aplicável;
ele contém apenas metadados, H1 e o link para a origem. Não prometa importação
ou execução automática pelo Markdown.

Atualize índice/guia, siga as regras de estrutura e qualidade e finalize com
`sincronizar-agentes`, inclusive após renomear ou remover comandos. Confira os
argumentos e a descoberta; informe quando a leitura precisar ser explícita.
