---
description: Evoluir documentos existentes e criar somente o que falta.
---

# Documentação sem perder o contexto

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Use `document` para começar um levantamento de sistema e
`atualizar-documentacao` para revisar os documentos afetados por uma entrega.
O agente usa o inventário como ponto de partida para ler as fontes e propor
complementos nos caminhos autorizados.

## Documentar um sistema em uso

Consulte o inventário direto na raiz do projeto, inclusive antes de instalar
o kit. Use `--json` para automação e `--markdown` para obter um rascunho.

```console
npx @pathbit/agentdevkit document
npx @pathbit/agentdevkit document --markdown
```

A consulta local reúne manifestos, nomes de scripts, amostras de fontes e
testes, infraestrutura e documentos. Use o resultado para escolher os módulos
e fluxos a ler. Com o kit instalado, `next --intent document` encaminha à
[skill documentar-legado][legado].

Em cada fluxo relevante, parta de uma entrada de código, siga os efeitos
e confira os testes. Cite arquivo, linha, símbolo ou teste para os fatos.
Explique quais evidências sustentam cada inferência e qual fonte pode
responder às perguntas pendentes. Julgue o que uma leitura estática sustenta
e registre resultados de execução apenas quando realmente verificados.

Use o [modelo de levantamento][levantamento] para consolidar a análise.
Para mudanças autorizadas, complemente os documentos existentes com
`atualizar-documentacao`. Use design, ADR ou SPEC quando precisar documentar,
respectivamente, a arquitetura, uma decisão estrutural ou um incremento.
O levantamento continua em rascunho até a revisão dos fatos e das lacunas.

## Começar pelo que existe

Depois de instalar o kit, peça ao seu agente:

```text
Use atualizar-documentacao. Primeiro inventarie e leia os documentos existentes.
Proponha complementos por arquivo, preservando conteúdo, nomes e decisões.
Organize por índices e links; crie apenas documentos que realmente faltam.
```

O inventário pode ser consultado na raiz do projeto:

```console
node .pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs
```

No JSON do inspetor, `documentation.files` lista documentos e seus papéis
prováveis, e `documentation.scan` informa os limites da busca. Leia os
arquivos antes de usar seus papéis para decidir. Se `ARCHITECTURE.md` já
descreve o desenho do sistema, mantenha esse caminho.

## Planejar o complemento

| Situação | Ação |
| --- | --- |
| Documento já suficiente | Manter e registrar ausência de impacto. |
| Falta uma informação comprovada | Acrescentar à seção apropriada. |
| Documentos difíceis de encontrar | Criar ou completar índices e links. |
| Documento necessário não existe | Combinar caminho e criar só o necessário. |
| Decisão não encontrada ou contraditória | Perguntar antes de escrever. |

Os templates ajudam a identificar lacunas. Não substituem documentos
existentes. Preserve suas seções, âncoras, fatos e decisões; repetir o fluxo
não deve duplicar conteúdo. Não mova nem exclua arquivos para padronizar.

## Projeto novo ou existente

Em projeto existente, aproveite README, guias, ADRs e documentos de produto.
Preparar o ambiente ou melhorar a documentação não exige reiniciar o produto.

Em projeto novo, descubra produto e experiência antes de arquitetura e specs.
Enquanto o objetivo for apenas configurar agentes, mantenha os modelos sem
inventar PRD, tecnologia ou aprovação. Siga o [fluxo de trabalho](workflow.md).

## Conferir o resultado

Revise o diff e os links. Confirme que o conteúdo anterior foi preservado,
que arquivos fora do plano não mudaram e que não surgiram decisões inventadas.
Use `verificar-trabalho` e `revisar-entrega`; salve as provas em `.agent-tests/`.

[Wiki](../README.md) · [Skill compartilhada][skill] · [Testes][tests]

[skill]: ../../.pbai4devs/skills/projeto/atualizar-documentacao/SKILL.md
[legado]: ../../.pbai4devs/skills/projeto/documentar-legado/SKILL.md
[levantamento]: ../../.pbai4devs/templates/levantamento-legado/TEMPLATE.md
[tests]: https://github.com/pathbit/AgentDevKit/blob/main/tests/README.md

[reading-pt]: documentation.md
[reading-en]: ../en/guides/documentation.md
[reading-es]: ../es/guides/documentation.md
