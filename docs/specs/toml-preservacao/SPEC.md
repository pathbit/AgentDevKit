---
description: Preservação dos prompts TOML humanos em comandos Gemini.
status: rascunho
---

# Preservação de prompts TOML

A edição de um comando Gemini deve acrescentar, atualizar ou retirar o bloco
AgentDevKit sem reserializar conteúdo humano do `prompt`. Este documento propõe
um contrato; ainda não aprova uma implementação nem comprova compatibilidade.

## Contrato

- Preserve os bytes humanos fora dos trechos cuja propriedade e alteração sejam
  comprovadas, inclusive comentários, chaves, BOM, espaços e finais LF/CRLF.
  Preserve também o valor semântico do conteúdo humano dentro de `prompt`.
- Aceite as quatro formas TOML: básica simples, literal simples, básica
  multilinha e literal multilinha. Modifique apenas spans brutos cuja relação
  com o valor decodificado seja demonstrável; valide novamente o TOML produzido.
  Preserve escapes e continuações existentes, sem normalizá-los.
- String literal simples não representa um bloco multilinha com os mesmos
  delimitadores. Admita sua promoção a literal multilinha apenas quando os
  bytes do conteúdo humano forem preservados e houver proveniência verificável
  para a reversão. Caso contrário, preserve o arquivo e informe o impedimento.
  Recuse também qualquer texto gerenciado que não seja representável com a
  sintaxe escolhida sem reescrever conteúdo humano.
- Identifique como propriedade do kit somente o bloco reconhecido e as
  alterações auxiliares comprovadas, como separadores e delimitadores inseridos.
  A proveniência deve ser versionada, limitada, vinculada ao bloco e não conter
  cópia do texto humano. A candidata usa um comentário TOML fora do `prompt`;
  um hash demonstra consistência, não autenticação. A compatibilidade com
  versões antigas e com o cliente real continua exigindo provas.
  Veja o [formato de comandos do Gemini][gemini-command].
- Quando `prompt` não existia, só retire a atribuição inteira se for comprovado
  que foi criada pelo kit e continua exclusivamente gerenciada. Caso contrário,
  preserve a atribuição e informe a ambiguidade.
- Preserve edições humanas feitas antes ou depois da instalação. Se uma edição
  tocar bloco, delimitadores, separadores ou fronteiras de modo que sua posse
  não possa ser comprovada, interrompa a alteração desse arquivo e informe o
  conflito; não escolha uma interpretação destrutiva.
- Mantenha o sync instalado executável com Node, sem depender do `node_modules`
  do projeto consumidor ou do cache temporário do pacote. Qualquer parser de
  produção deve acompanhar o kit com versão e licença verificadas; o parser
  independente de testes não comprova essa distribuição.
- A CLI atual extrai o `prompt` dos apontamentos gerados supondo uma string
  JSON em uma linha. Preserve essa forma de geração ou substitua a extração
  por leitura semântica comprovada antes de alterar o formato gerado.
- CLI e sync devem produzir o mesmo bloco para o mesmo comando, sem alternar
  sua referência ou os argumentos. Antes do ajuste local, a CLI incluía
  `{{args}}` no bloco combinado e o sync o removia; com `{{args}}` no prompt
  humano, a CLI acrescentava outra ocorrência. Em uma prova sem modelo, o
  carregador do Gemini
  substituiu ambas e duplicou o argumento no texto preparado para o modelo.
  Preserve os placeholders humanos e evite duplicação antes de definir a
  correção. Considere também placeholders em arquivos incluídos por `@{...}`:
  contar apenas o texto do TOML não comprova o resultado após expansão.
  Em uma prova com o carregador Gemini 0.67.0, uma referência que contém
  `{{args}}` duplicou o argumento quando o TOML também continha o marcador.
  Quando apenas o arquivo incluído tinha o marcador, ele permaneceu literal e
  a invocação foi acrescentada ao fim. A prova usou filtragem de arquivo
  permissiva e não executou modelo ou sessão completa.
- Mantenha intactos os bytes do índice Git e as alterações humanas staged e
  unstaged. Para TOML staged, permita mudança apenas se os spans humanos forem
  comprovadamente preservados; caso contrário, recuse sem descartar conteúdo.
- Para instalações legadas sem proveniência, preserve a representação atual.
  Não invente a sintaxe anterior à reserialização; mantenha separadores de
  origem desconhecida ou recuse quando não for possível isolar o bloco.
- Considere versões antigas da CLI e do sync: elas podem ignorar proveniência,
  removê-la ou reserializar o prompt. Defina e teste política de coexistência e
  downgrade antes da entrega; não prometa que uma trava nova impeça um binário
  antigo que não a reconhece. Uma prova isolada confirmou que o helper público
  `0.0.21` elimina os metadados do protótipo e normaliza a representação; a
  implementação experimental então recusa removê-lo sem nova evidência. Essa
  prova não executa o fluxo completo da CLI ou do sync.

Como cobertura mínima, adição, atualização e remoção devem funcionar para
prompts simples em cada uma das quatro formas de string, além de `prompt`
ausente, com LF, CRLF e BOM. A recusa de casos ambíguos ou não representáveis
não substitui essa cobertura; o arquivo preservado é o estado imediatamente
anterior à operação recusada. O [mapa de integração](INTEGRACAO.md) detalha
os pontos de estado e as provas ainda pendentes.

## Critérios de aceite

1. **AC-001:** Nas quatro formas suportadas, adicionar e retirar um bloco sem
   edição humana intermediária restaura o arquivo original byte a byte,
   incluindo delimitadores, BOM, CRLF/LF, espaços e comentários. Onde não for
   possível, a operação é recusada e o arquivo original permanece intacto.
2. **AC-002:** Adicionar e atualizar mantêm o valor humano do prompt; um segundo
   update é idempotente. A remoção retira apenas bytes de propriedade comprovada
   e preserva edições humanas não ambíguas. Edits ambíguos são recusados.
3. **AC-003:** Fixtures cobrem `prompt` ausente e presente, texto vazio,
   escapes Unicode, barras, continuações multilinha, aspas no conteúdo e
   fechamentos com três a cinco aspas; também cobrem marcadores duplicados,
   inválidos ou modificados e UTF-8 inválido. Cada caso tem resultado e limite
   explícitos.
4. **AC-004:** CLI e sync direto aplicam o mesmo contrato. Testes com índice
   staged e alterações unstaged conferem bytes humanos e índice antes e depois,
   inclusive em remoção e troca de agentes. Teste também `init` → `sync` →
   `update` e a ordem inversa, com e sem `{{args}}` humano e blocos legados.
   Conflito TOML identificado no planejamento bloqueia toda a aplicação antes
   de escrita pública, inclusive estado e derivados. Falhas posteriores seguem os
   limites de recuperação vigentes.
5. **AC-005:** Legado sem proveniência preserva a representação corrente ou é
   recusado; downgrade e coexistência são testados sem atribuir garantias a
   versões que ignoram a nova política. Caminhos e estado não são migrados
   silenciosamente.
6. **AC-006:** A validade e o valor semântico do TOML produzido são verificados
   também com parser TOML independente disponível no ambiente de teste; se
   indisponível, essa verificação permanece não verificada. Testes de código
   são versionados;
   resultados e fixtures ficam em área ignorada ou temporária. Teste o pacote
   real e o sync instalado em projeto sem `node_modules` ou `package.json`.

## Fases propostas

1. Definir spans brutos e proveniência, representação para as quatro formas,
   transição de estado e política conservadora de legado e versões mistas.
2. Implementar edição e remoção com recusa segura, integrando CLI e sync e
   preservando o contrato de staged. Manter formatos legados legíveis.
3. Executar a matriz de testes em plataformas disponíveis, a validação
   independente e uma revisão do diff; registrar separadamente falhas e casos
   não verificados antes de qualquer publicação.

A prova versionada `node tests/toml-preservation-proof.mjs` registrou 40
diferenças na implementação anterior. Após a integração local, os mesmos 40
casos passaram em macOS com restauração dos bytes; essa prova sintética não
usa parser independente nem cliente real. Um pacote experimental anterior
separado, com parser autocontido e
licença BSD-3-Clause passou init, update e sync em projeto sem `node_modules`,
em macOS e Linux; em outra fixture, o sync preservou o TOML staged e retornou
conflito nos dois sistemas. Um ajuste isolado que alinha o bloco do sync ao da
CLI eliminou esse conflito em uma fixture macOS sem modificar o índice. Ele não
resolve a duplicação de `{{args}}` nem comprova atualizações reais de arquivos
staged. Não é uma release nem comprova os demais casos.
Essas observações não encerram os critérios de aceite.

Em quatro projetos sintéticos, a CLI publicada `0.0.21` acrescentou e retirou
o bloco ao alterar a seleção de clientes, mas deixou três quebras de linha
extras no valor de cada prompt. O carregador Gemini aceitou as etapas e um
parser independente confirmou a diferença; não houve inferência. O índice,
o `.gitignore`, o README e as notas humanas foram preservados, enquanto o
TOML mudou e o `info/exclude` recebeu um acréscimo. A prova não cobre todos
os tipos TOML.
O mesmo ciclo foi repetido em Linux ARM64, sem rede, com quatro fixtures e
parser independente: as três quebras extras e o acréscimo ao `info/exclude`
voltaram a ocorrer. Essa repetição não executou o carregador Gemini ou modelo.

## Limites

A comparação e a edição não tornam uma sequência de operações atômica nem
impedem troca concorrente de arquivo ou ancestral. A sintaxe anterior já
reescrita por versões antigas não pode ser reconstruída sem evidência. A
segurança de rollback, permissões, ACLs e recuperação após interrupção pertence
à spec de recuperação conservadora e não é
comprovada por este contrato de TOML.

[gemini-command]: https://geminicli.com/docs/cli/custom-commands/
