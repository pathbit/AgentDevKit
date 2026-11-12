---
description: Inventário somente leitura da estrutura e documentação do projeto.
---

# Inspecionar projeto

```sh
node .pbai4devs/scripts/inspecionar-projeto/SCRIPT.mjs
```

O JSON identifica tecnologia, comandos, estrutura e documentos existentes.
`documentation.files` mantém caminhos e caixa, papel provável, tamanho e hash
quando a leitura couber nos limites. Referências válidas do estado aparecem em
`configured`; nomes sugerem papéis, mas não comprovam conteúdo ou aprovação.

Links simbólicos são listados como opacos, sem ler seus destinos. Conteúdo dos
documentos e valores de configuração não aparecem no relatório. `scan` e
`warnings` informam limites e leitura incompleta; `scan.complete` resume essas
condições. Uma pasta simbólica como `docs` também aparece, sem presumir que
esteja vazia. Links não classificados recebem `role: unclassified`; enquanto
existir uma fronteira não inspecionada, `scan.complete` será falso. Não use
inventário incompleto como prova de ausência de documentos.

`exclusions` descreve pastas de clientes, artefatos e caches fora do inventário.
Documentos humanos em `.github`, exemplos, wiki e RFCs são incluídos; os
apontamentos gerados em `.github/skills`, agentes e comandos ficam de fora.

O script não cria nem altera arquivos. Leia os documentos relevantes antes de
planejar complementos; preserve sua estrutura e use templates só para lacunas.
`--check` confere a estrutura técnica. `--root` aceita somente as fixtures
documentadas pelo próprio comando, sem ampliar o acesso a outros projetos.
