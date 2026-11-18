---
description: Integração em avaliação e provas pendentes da preservação TOML.
status: rascunho
---

# Integração da preservação TOML

Este mapa complementa a [spec](SPEC.md). Uma candidata local integra a edição
ao instalador e ao sync; ela ainda precisa cumprir os critérios de aceite e
não representa uma release publicada.

A candidata mantém o formato atual de `blocks`: o digest do novo formato TOML
vincula versão, bloco e comentário de proveniência; no legado continua sendo o
hash do bloco. O comentário registra somente dados necessários à edição e não
copia o texto humano. Os passos abaixo continuam sendo requisitos em avaliação.
Em fixtures, ciclos completos e transições de estado preservaram o Git e o
TOML observados; arquivo staged divergente foi recusado. Uma prova de downgrade
com a CLI `0.0.21` também foi recusada preservando os arquivos observados;
isso não garante o comportamento de outras versões antigas ou situações.
No Linux, nove fixtures passaram por `init`, `update`, sync direto e remoção,
restaurando o TOML e preservando os arquivos Git observados. A prova usou LF,
arquivos TOML não rastreados e o parser do kit; não cobre Windows ou o Gemini
real. Em macOS, um protótipo também passou 40 casos com parser independente.
O carregador local do Gemini CLI 0.67.0 aceitou comandos V3 nas quatro formas
geradas pelo helper e expandiu uma referência e um argumento sintéticos. Um
parser independente também aceitou os arquivos; a prova usou configuração
simulada, sem rede, modelo ou fluxo de instalação completo.
Com TOML staged e edição unstaged divergente, fixtures em macOS e Linux
observaram recusas em `init`, `update` e nos dois caminhos de sync; a troca de
cliente preservou o índice e restaurou o texto humano. Não foram testados
Windows, ACLs, atributos estendidos ou todas as combinações staged.

## Estado e planejamento

1. Definir registro versionado por caminho Gemini, com digest do bloco e do
   comentário e dados mínimos sobre separadores e delimitadores. Validar
   caminhos, limites e relação com `blocks`; não registrar texto humano.
2. Em `loadState`, `reconcileStateBytes`, `readDerivedState` e
   `derivedContent`, validar e preservar o registro e os campos desconhecidos.
   Reconciliar o estado instalado, o derivado e suas remoções sem precedência
   silenciosa quando houver conflito.
3. Transportar o registro validado para o estágio privado e para o plano de
   `init`, `update` e sync direto. Uma origem preexistente sem propriedade
   comprovada não deve ser adotada. Dados ausentes, divergentes ou órfãos devem
   preservar o arquivo e produzir diagnóstico antes da alteração pública.
4. Na troca de clientes, remoção de recursos e consolidação do estado, retirar
   somente o registro associado à operação comprovada. `doctor` e
   `sync --check` devem informar estados parciais ou divergentes.
5. Conferir novamente o estado e os bytes aprovados antes da aplicação. Como
   TOML e estado não são publicados atomicamente, uma interrupção pode deixar
   o par incompleto: diagnosticar e preservar, sem prometer recuperação
   automática. Rollback e concorrência seguem sua própria spec.
6. Migrar o registro entre caminhos de estado somente com transição comprovada.
   Versões antigas podem ignorá-lo ou reserializar o TOML; testar downgrade
   real e não presumir que um binário antigo respeite a política nova.

O digest registra consistência; ele não autentica autoria ou identidade do
arquivo e não comprova permissões ou metadados do sistema de arquivos.

## Provas necessárias

- Adicionar, atualizar e retirar nas quatro formas TOML e sem prompt, com
  parser independente, BOM, LF/CRLF e edições humanas antes e depois do bloco.
- Verificar comentários ausentes, alterados, duplicados ou fora de posição;
  texto semelhante dentro de uma string não é comentário de metadados.
- Exercitar CLI e sync direto nas duas ordens, com índices staged e alterações
  unstaged, inclusive troca de clientes, legado, migração e estado parcial.
  Comparar arquivos humanos, índice, configuração Git, ignores e refs.
- Testar o pacote instalado sem `node_modules` do projeto, com parser e licença
  distribuídos, e testar versões antigas e atuais em fixtures descartáveis.
- Verificar `{{args}}` no prompt e nas inclusões: uma ocorrência no TOML não
  garante uma ocorrência após expansão pelo Gemini. A política desse caso
  continua pendente.

Não considerar esses pontos aprovados com base apenas em um helper ou teste
em memória; os fluxos públicos e suas limitações precisam de evidências.
