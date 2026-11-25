---
description: Jornadas e comunicação da interface de linha de comando.
status: aprovado
---

# UX da CLI

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

O produto usa uma CLI; não há interface web ou desktop nesta entrega.
A experiência prioriza comandos curtos, resultados legíveis e continuidade.

| Jornada | Resposta esperada |
| --- | --- |
| Primeiro uso | Idioma, clientes e objetivo, com resumo e próxima etapa. |
| Projeto existente | Mudanças propostas e preservação dos arquivos próprios. |
| Atualização | O que mudou, conflitos/backups e como verificar o resultado. |
| Plugins | Catálogo e origem antes de decidir o que preparar. |
| Diagnóstico | Pendências observadas e próximos comandos ou skills. |
| Automação | JSON único e código de saída, sem depender do texto traduzido. |

PT é padrão. EN e ES alteram a interface e os próximos passos, mantendo nomes
de comandos e caminhos. O idioma salvo é reutilizado nas próximas execuções.
Mensagens distinguem confirmação, aviso e falha sem afirmar testes não feitos.

O assistente do primeiro uso reúne idioma, agentes e objetivo. Quem passa
idioma e clientes na CLI pode escolher o objetivo com `--purpose`.
Agentes em aplicativos podem reunir as escolhas pelo chat e usar `--json`
para obter a próxima ação. A simulação lista mudanças e conflitos no plano.

`doctor` responde sobre a instalação do kit. `next` orienta o trabalho do
projeto, inclusive a etapa de documentação com `next --intent document`.
`document` reúne o inventário em Markdown ou JSON. Conflitos pedem comparação
de arquivos antes de uma substituição. Veja [CLI](../guides/cli.md) e
[recuperação](../guides/troubleshooting.md) para o comportamento observável.

O comando `agents` consulta a seleção sem escrever arquivos. Sua alteração
permite simular o plano antes de remover apontamentos gerados. `agents add`
e `agents remove` alteram só os IDs indicados. `none` é a opção inicial sem
escolha explícita ou salva e mantém os recursos compartilhados. Pastas com
arquivos próprios continuam no projeto. [Seleção de clientes][clients]

O usuário pode consultar `plugins list` e `plugins info <id>` antes da
instalação. Depois do `init`, `plugins install <id>` e `plugins check <id>`
preparam e conferem apenas o item escolhido. [Guia de plugins][plugins]

Escopo autorizado junto ao [PRD](prd.md). Testes verificam as jornadas reais;
a aprovação do desenho não substitui as evidências de funcionamento.

[Wiki](../README.md) · [Fluxo de uso](../guides/workflow.md)

[clients]: ../guides/installation.md#atualizar-e-escolher-agentes
[plugins]: ../guides/plugins.md

[reading-pt]: ux-ui.md
[reading-en]: ../en/product/ux-ui.md
[reading-es]: ../es/product/ux-ui.md
