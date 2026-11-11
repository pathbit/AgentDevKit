---
description: Jornadas e comunicação da interface de linha de comando.
status: aprovado
---

# UX da CLI

O produto usa uma CLI; não há interface web ou desktop nesta entrega.
A experiência prioriza comandos curtos, resultados legíveis e continuidade.

| Jornada | Resposta esperada |
| --- | --- |
| Primeiro uso | Local instalado, resumo e próxima etapa para o projeto. |
| Projeto existente | Mudanças propostas e preservação dos arquivos próprios. |
| Atualização | O que mudou, conflitos/backups e como verificar o resultado. |
| Diagnóstico | Pendências observadas e próximos comandos ou skills. |
| Automação | JSON único e código de saída, sem depender do texto traduzido. |

PT é padrão. EN e ES alteram a interface e os próximos passos, mantendo nomes
de comandos e caminhos. O idioma salvo é reutilizado nas próximas execuções.
Mensagens distinguem confirmação, aviso e falha sem afirmar testes não feitos.

O primeiro uso interativo permite escolher o idioma. Quem automatiza pode
fornecer `--lang` e ler `--json`; o resultado inclui a próxima ação. Instalação
normal resume mudanças; simulação lista uma amostra e o JSON fornece o plano.

`doctor` responde sobre a instalação do kit, enquanto `next` orienta o trabalho
do projeto. Essa distinção evita tratar um diagnóstico saudável como prova
de que a aplicação está pronta. Conflitos devem levar à comparação de arquivos
antes de qualquer substituição. Veja [CLI](cli.md) e
[recuperação](troubleshooting.md) para o comportamento observável.

Escopo autorizado junto ao [PRD](prd.md). Testes verificam as jornadas reais;
a aprovação do desenho não substitui as evidências de funcionamento.

[Wiki](README.md) · [Fluxo de uso](workflow.md)
