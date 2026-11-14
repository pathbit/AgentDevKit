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
Na maturidade, o roadmap e as specs são consultados nos caminhos configurados;
status são declarações e um vínculo local não comprova aprovação ou revisão.
Uma lista de specs ambígua ou incompleta não autoriza escolher um incremento;
o estado do vínculo no roadmap também é apenas uma indicação para consulta.

Links simbólicos são listados como opacos, sem ler seus destinos. Conteúdo dos
documentos e valores de configuração não aparecem no relatório. `scan` e
`warnings` informam limites e leitura incompleta; `scan.complete` resume essas
condições. Uma pasta simbólica como `docs` também aparece, sem presumir que
esteja vazia. Links não classificados recebem `role: unclassified`; enquanto
existir uma fronteira não inspecionada, `scan.complete` será falso. Não use
inventário incompleto como prova de ausência de documentos.
O inspetor revalida a identidade dos caminhos durante a leitura; isso detecta
mudanças, mas não é uma garantia atômica contra toda troca simultânea.

`exclusions` descreve pastas de clientes, artefatos e caches fora do inventário.
Documentos humanos em `.github`, exemplos, wiki e RFCs são incluídos; os
apontamentos gerados em `.github/skills`, agentes e comandos ficam de fora.

O script não cria nem altera arquivos. Leia os documentos relevantes antes de
planejar complementos; preserve sua estrutura e use templates só para lacunas.
`--check` confere a estrutura técnica. `--root` aceita somente as fixtures
documentadas pelo próprio comando, sem ampliar o acesso a outros projetos.
