---
description: Grupo de tarefas para a evolução e entrega do AgentDevKit.
status: em andamento
---

# Evolução da plataforma

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Este grupo reúne os pedidos de evolução; veja a [lista agrupada](GRUPOS.md)
para prioridades e acompanhamento. Marque cada item concluído somente
após implementação e validação; preserve arquivos e configurações existentes.

## Validação atual

- O primeiro grupo da pipeline completa no macOS passou: 37 testes.
- O grupo seguinte encontrou falhas estritas já pendentes em recuperação,
  backup e metadados. A execução foi interrompida após identificá-las; os
  testes cancelados não são resultados de falha do produto.
- O perfil completo foi reordenado para executar recuperação estrita primeiro,
  mantendo as outras suítes obrigatórias depois dela. A suíte estrita atual no
  macOS terminou com 21 aprovados, 17 falhas e três ignorados; os grupos
  seguintes não foram executados. Os 32 testes da lógica da pipeline passaram
  em macOS e Linux. A suíte de falhas de remoção passou com 31 testes no macOS
  e Linux após a restauração deixar de apagar o arquivo antes de preparar a
  cópia anterior. A mudança reduz uma perda em falha de recriação, mas não
  resolve as corridas de substituição nem o restante do gate.
- O sync verifica novamente o conteúdo do backup após ajustar timestamps e
  interrompe a operação se detectar mudança no conteúdo ou horário de acesso.
  O cenário de edição nessa etapa passou em macOS e Linux, assim como um teste
  que simula alteração de horário. O Linux usa leitura sem atualização de
  acesso; a verificação pode recusar arquivos ou sistemas que não a permitam.
  A verificação não é atômica e não resolve a troca de ancestrais ou edições
  posteriores; Windows e outros filesystems permanecem não verificados. Um
  teste confirmou que a recusa da leitura sem atualização do acesso interrompe
  o sync e preserva o backup em revisão no Linux.
- Uma revisão independente apontou possíveis recusas legítimas em volumes
  que atualizam o horário de acesso ou negam `O_NOATIME`. A releitura Linux
  passou a abrir o descritor antes de aplicar permissões restritivas à cópia:
  em fixture com usuários distintos, o backup de arquivo legível somente pelo
  grupo foi produzido com o modo original antes da proteção posterior. O sync
  completo desse cenário ainda não é suportado: agora é recusado antes de
  escrever para evitar substituir um arquivo com outro proprietário ou sem
  leitura do proprietário. Outro teste revelou que o
  planejamento pode alterar um horário de acesso antigo antes do backup; essa
  preservação também continua pendente. Não há prova de Windows.
- A CLI e o sync direto verificam proprietário POSIX no planejamento e antes
  de aplicar. Em uma fixture Linux com usuários distintos, ambos recusaram a
  operação e preservaram o conteúdo e o índice; um teste simulado também
  cobriu mudança após o planejamento em macOS e Linux. Isso não comprova
  preservação de grupos, ACLs, mudanças simultâneas ou suporte no Windows.
- Uma revisão independente apontou que o rollback do sync remove um arquivo
  antes de recriá-lo. Um teste sintético confirmou, em macOS e Linux, que uma
  falha na recriação pode deixar o caminho ausente. A regressão está no grupo
  estrito; ainda falta corrigir a recuperação sem sobrescrever outro conteúdo.
  Uma tentativa de preparar a cópia e renomeá-la foi descartada: testes
  mostraram regressão na preservação de arquivos criados durante a restauração.
- O caminho normal de `sync --force` tem agora um teste ativo: a cópia anterior
  do catálogo foi conferida em macOS e Linux, com índice, regras Git e arquivo
  humano staged e unstaged preservados. Ele não cobre falha nem concorrência.
- Na instalação e no sync, uma troca do nome temporário detectada antes da
  limpeza agora interrompe a operação e preserva o substituto. O teste passa
  em macOS e Linux. Outro teste estrito reproduziu a perda quando a troca ocorre
  entre a verificação e a remoção: a proteção continua parcial e não atômica.
- No macOS, 25 testes de proteção confirmaram os casos cobertos de recusa
  diante de ACL ou atributos estendidos. Um experimento isolado com `cp -p`
  preservou uma ACL e um atributo sintéticos, tanto pela origem nominal quanto
  por um descritor herdado; reescrever a primeira cópia manteve os metadados.
  O experimento não executou o kit nem provou segurança contra concorrência,
  metadados arbitrários, recuperação ou portabilidade.
- Uma prova de referência de diretório após renomeação funcionou no Linux
  testado e retornou `ENOENT` no macOS testado. Não foi integrada ao produto;
  não prova proteção dos ancestrais nem compatibilidade com outros ambientes.
- No router, índice, `.gitignore`, configuração e exclusões Git mantiveram os
  hashes anteriores; a instalação candidata ainda apresenta conflitos e não
  está pronta para publicação como correção desses casos.
- A candidata passou a tratar uma barreira estrutural em regras Claude como
  conflito nas atualizações, preservando o motivo do caminho. Testes exercitam
  `doctor`, `update` e `--force` com link não gerenciado e Git staged. A
  instalação inicial mantém o comportamento aditivo; isso não resolve a
  migração dos outros conflitos nem prova segurança contra concorrência. A
  suíte Claude passou no macOS (37 testes) e no Linux (36, um ignorado).
  O diagnóstico da candidata no router ainda retorna pendências.
- Um diretório humano no nome de uma regra Claude antes causava erro genérico
  no planejamento. A candidata agora registra o diretório preservado e bloqueia
  a atualização; `init` continua adicionando o kit sem remover seu conteúdo.
  Uma fixture também verificou o caso de arquivo humano no lugar do ancestral.
  As suítes Claude e de coexistência passaram no macOS (52 testes); no Linux,
  a suíte Claude passou com 39 testes e um ignorado. Uma execução anterior foi
  descartada por coincidir com a edição do código durante o teste.

## Mapa dos pedidos

As mensagens foram consolidadas por assunto, inclusive decisões que substituíram
pedidos anteriores. O [roadmap](../../product/roadmap.md) mantém o histórico
das entregas; os itens numerados abaixo registram o andamento desta revisão.
Uma funcionalidade documentada ou publicada ainda precisa das provas indicadas.
O [inventário por recurso](VALIDACAO-RECURSOS.md) mostra as provas individuais
registradas e as que ainda faltam para a versão `0.0.21`.

- **Segurança dos projetos:** integração aditiva, colisões, migração,
  recuperação e concorrência; preservar arquivos, índice e configuração Git.
  O `.gitignore` da raiz pertence ao projeto. Ver itens 1, 9 e 10.
- **Estrutura e clientes:** manter `.pbai4devs` como origem; selecionar clientes
  e gerar seus apontamentos, sem replicar ferramentas, scripts ou templates.
  Validar clientes e recursos nativos, inclusive Copilot e Antigravity. Itens 9
  e 10.
- **Fluxo de trabalho:** guiar configuração, produto, UX/design, arquitetura,
  roadmap, specs e implementação nessa ordem; reunir dúvidas antes do plano e
  conferir critérios de aceite. Não inventar conteúdo de produto. Ver evolução
  contínua no roadmap.
- **Especialistas e qualidade:** evoluir arquitetura, backend, frontend, QA,
  segurança, revisão e performance; usar subagentes quando disponíveis e provas
  adversariais proporcionais. Ver itens 2, 6 e 9.
- **Ferramentas e testes:** verificar instalação automática de Node ausente e
  instalação, atualização e validação das ferramentas em um comando por
  sistema; padronizar provas de navegador ou desktop quando cabíveis. Versionar
  testes e receitas; ignorar resultados, variações de caixa de `.playwright*`
  e clones ou projetos temporários. Ver evolução contínua no roadmap.
- **Distribuição e CI:** validar pacote e metadados, npm público e GitHub
  Packages, instaladores úteis, releases e tags da mesma versão; testar CI em
  Linux, macOS e Windows. Publicar nos dois registries após os gates e validar
  as instalações. Ver itens 4 e 8.
- **Documentação e comunidade:** manter README, wiki, guias, exemplos, issues e
  links claros e atuais; documentar os comandos e preservar a autoria humana
  dos commits. Validar Markdown com frontmatter adequado ao tipo e lint. Ver
  itens 3, 5, 7 e 8.
- **Aplicação no router:** validar a versão instalada e os comandos sem alterar
  arquivos humanos, índice ou `.gitignore`; aplicar novas versões somente após
  comprovar a preservação. Ver itens 1 e 9.
- **Operação local:** investigar sessões ou loops indesejados do OpenCode e
  documentar a remoção manual quando identificada; não criar agendamentos sem
  solicitação. Verificação pendente.

## Andamento e evidências

1. [-] **Preservação e migração:** concluir os testes e corrigir a migração de
   diretórios e os diagnósticos de erros, sem apagar dados ou alterar o índice.
   As verificações de bits POSIX especiais passaram em macOS e Linux; a
   proteção de atributos estendidos e o comportamento diante de alterações
   concorrentes ainda estão em validação. No macOS, uma ACL de teste não foi
   detectada pelo verificador de atributos; no Linux, foi reproduzida a perda
   de um atributo estendido sintético. Não presumir preservação desses
   metadados na migração. Uma opção de bloqueio está em avaliação e impede
   também migrações legítimas enquanto a verificação não for confiável; nessa
   proposta, testes existentes que exigem migração bem-sucedida falham.
   A tentativa do gate completo detectou perda de ACL em atualização no macOS
   e falhas de recuperação concorrente; uma prova independente observou perda
   de atributos estendidos no Linux. A tentativa parou após 42 falhas; os
   testes ou fixtures de 24 casos foram ajustados e verificados isoladamente.
   Falta corrigir os defeitos e executar novamente o gate estrito completo.
   Uma repetição com pacote local observou os três fluxos `update`, sync da CLI
   e sync direto: no Linux, os três perderam um xattr sintético; no macOS, os
   três perderam uma ACL benigna. O macOS recusou as mesmas operações com xattr
   presente, preservando-o. Índice, configuração Git e arquivos humanos
   comparados foram preservados; não há prova para todos os metadados.
   Um teste de regressão versionado reproduziu a perda no sync direto em Linux
   também com finais LF normais e arquivo staged: confirmou o atributo antes
   e depois de preparar o índice, mas não o encontrou após a sincronização. O
   teste falha até que o sync preserve o atributo ou recuse sem alterar o
   arquivo; no macOS ele é ignorado por ser específico de Linux. A execução
   usou pacote local com o mesmo hash do script de sincronização do checkout;
   não comprova equivalência dos demais arquivos do pacote.
   Uma consulta Linux experimental usa `getfattr` para listar nomes, sem obter
   valores. Em contêiner Debian identificou um xattr e uma ACL POSIX de teste;
   sem a ferramenta retornou estado desconhecido. Ela ainda não bloqueia nem
   protege operações: faltam cobertura de namespaces e permissões, ambientes
   sem a ferramenta, concorrência e integração com todos os pontos de escrita.
   Proteção parcial posterior: o planejamento e a aplicação da CLI e o sync
   direto recusam substituição de arquivos regulares com atributos que
   `/usr/bin/getfattr` consegue listar. A consulta direta e a CLI informam o
   bloqueio. Em Linux com `attr` instalado, fixtures confirmaram preservação
   dos arquivos com xattr; sem a ferramenta ou com atributos não listáveis,
   a proteção não está comprovada e a substituição ainda pode perder dados.
   Para não apresentar essa lacuna como verificada, CLI e sync direto agora
   avisam quando há arquivos existentes planejados sem inspeção conclusiva;
   o aviso também aparece na aplicação, que ainda é permitida. Testes sem a
   ferramenta confirmaram aviso e preservação durante o check, mas não
   demonstram segurança da escrita posterior.
   Com `getfattr` disponível, um controle adicionou o atributo após o plano;
   a aplicação o detectou e recusou a troca, preservando o arquivo. Os testes
   também confirmaram que o diagnóstico não expõe nome ou valor do atributo e
   que os avisos inconclusivos estão disponíveis em português, inglês e espanhol.
   A CLI e o sync direto voltam a consultar atributos listáveis imediatamente
   antes de substituir um arquivo no Linux. Fixtures com `attr` confirmaram
   recusa e preservação do valor adicionado após a verificação inicial. Ainda
   há uma janela entre essa consulta e a troca, e os casos sem ferramenta ou
   com atributos não listáveis seguem sem proteção comprovada.
   A mesma revalidação foi adicionada antes de remover arquivos regulares.
   Duas fixtures Linux com `attr` confirmaram recusa e preservação do valor
   quando o atributo foi adicionado após a inspeção inicial; os 27 testes de
   falhas de remoção passaram no macOS e no Linux. A janela concorrente e os
   casos de inspeção inconclusiva continuam pendentes.
   A remoção de referências pelo sync deixou de ser recursiva: uma fixture que
   troca o arquivo por uma pasta com conteúdo humano no instante da remoção
   agora preserva a pasta e o índice. A suíte de falhas de remoção passou com
   28 testes no macOS e Linux. Outras trocas concorrentes não são cobertas.
   Na restauração após falha, o sync deixou de remover pastas recursivamente e
   passou a recriar arquivos de forma exclusiva. Fixtures preservaram arquivo
   e pasta humanos criados durante o rollback no macOS e Linux, informando o
   erro e o caminho para revisão. A escrita e a permissão usam o descritor
   aberto, com verificação de identidade; outra fixture preservou um arquivo
   substituto e seu modo. Passaram 31 testes de remoção e sete de recuperação
   relacionados em cada sistema. Outras janelas concorrentes seguem abertas.
   A documentação de [`listxattr(2)`](https://man7.org/linux/man-pages/man2/listxattr.2.html)
   informa que nomes inacessíveis podem ser omitidos. Por isso a consulta foi
   corrigida: listagem vazia também retorna desconhecido, nunca ausência
   comprovada. Uma listagem não vazia indica somente presença observada.
   Em uma fixture Linux, escrita no mesmo inode preservou xattr e ACL
   observados, assim como os bytes do índice Git. Porém uma interrupção
   simulada após escrita parcial deixou conteúdo incompleto. O experimento é
   reproduzível em `tests/linux-inplace-metadata-experiment.test.mjs`; não é
   usado pelo produto e não comprova recuperação, concorrência ou durabilidade.
   Uma repetição direcionada de dois testes estritos falhou em ambos no macOS
   e no Linux: a troca de um ancestral do backup criou arquivo fora da fixture,
   e uma edição do backup entre a verificação e o ajuste de timestamps não
   impediu o sucesso. Essas falhas bloqueiam a validação segura da operação.
   Uma revisão estática adicional identificou que a limpeza após publicação
   exclusiva pode remover um substituto humano no nome temporário. Comparar
   inodes antes de remover não elimina a janela concorrente; a correção exige
   uma fronteira de propriedade e diagnóstico de resíduos. Essa revisão não
   repetiu a prova estrita nem demonstra uma solução implementada.
   Uma variante experimental preserva caminhos incertos para revisão após
   falha posterior a uma publicação, em vez de restaurá-los automaticamente.
   Em cada um dos sistemas
   macOS e Linux, passou quatro controles de falha sintética e dois de fluxo
   normal. Pode deixar a operação parcialmente aplicada; não cobre a criação
   anterior do backup e não foi demonstrada contra trocas concorrentes. A
   variante permanece isolada e requer definição do contrato de recuperação.
   Uma correção separada informa o temporário preservado quando a limpeza falha
   com erro congelado, mantendo causa e código. Testes sintéticos cobrem os
   fluxos de instalação, sync e estágio; as suítes direcionadas passaram com
   86 testes no macOS e 86 no Linux. A classificação da pipeline passou com
   32 testes em cada sistema. Mensagens e caminhos dos erros ainda não têm prova
   geral de sanitização. Essa correção não resolve a corrida nem foi validada
   no Windows. Um pacote local contém os dois arquivos corrigidos com bytes
   iguais aos do checkout; essa comparação não testa a instalação do pacote.
   O executor de infraestrutura recusou links simbólicos estáticos nas origens
   e saídas e passou a criar relatórios exclusivos por execução. A reprodução
   anterior sobrescreveu um log fora da fixture por meio de um link; os novos
   controles passaram no macOS e Linux, e um pacote local preservou o destino
   externo, relatório anterior e índice observados. A mudança do caminho fixo
   do relatório e os limites para trocas concorrentes estão documentados.
   Em uma execução Linux do pacote isolado, 12 suítes retornaram código zero e
   a de sincronização falhou no caso de `autocrlf` staged. O código zero não
   comprova que não houve testes ignorados. Uma primeira tentativa com checkout
   somente de leitura teve falhas adicionais de ambiente; a repetição usou Git
   próprio e não carregou a ferramenta local incompatível da máquina.
   Uma execução direcionada posterior no macOS também falhou nesse caso: após
   trocar LF por CRLF, a referência divergiu do hash registrado e o sync recusou
   a atualização como conteúdo próprio. A comparação do índice reconhece CRLF,
   mas isso não basta para comprovar a propriedade da referência. A correção
   foi então aplicada à cópia de desenvolvimento: exige hash idêntico após
   normalização e atributos Git compatíveis, sem executar filtros. Os 30 testes
   de preservação passaram no macOS e em contêiner Linux, incluindo índice
   staged, edição humana, filtro e conversão desativada. A suíte ampliada de
   sincronização no macOS foi repetida após um ajuste adicional que limita essa
   equivalência à atualização de referências ativas: teve 358 aprovações e
   dois testes ignorados. Depois do ajuste, 31 testes de preservação passaram
   no macOS, no Linux e no pacote local extraído; a referência obsoleta
   convertida foi preservada. Ainda faltam o gate completo, Windows e a
   validação do pacote publicado ou de uma nova versão.
   Um controle posterior configurou um filtro Git sintético: a sincronização
   não o executou, enquanto o `git add` da própria fixture o executou. Esse
   controle passou no macOS e em contêiner Linux. A consulta `check` e a
   aplicação também preservaram índice, estado e bytes diante de filtro,
   alteração humana ou conversão desativada nos mesmos sistemas.
   **Correção retirada:** a revisão posterior identificou que a atualização
   CRLF integrada não protegia atributos estendidos no Linux, uma limitação já
   observada no experimento anterior. O sync voltou a recusar essa atualização;
   o teste positivo de `autocrlf` voltou a falhar no macOS. Um novo controle
   Linux confirmou que a recusa preserva bytes, índice e um xattr sintético.
   Os resultados de sucesso anteriores descrevem a variante retirada, não a
   implementação atual. É necessário resolver a proteção de metadados antes
   de voltar a permitir a atualização.
   Uma variante posterior habilita a equivalência CRLF somente no macOS, para
   referências ativas cujo hash normalizado e atributos Git sejam compatíveis.
   A limpeza de referências obsoletas continua exigindo bytes exatos. Testes
   no macOS cobrem índice staged, filtros, edição humana e recusa diante de
   ACL ou xattr; a proteção Linux e a operação completa continuam pendentes.
   **Variante retirada:** um controle posterior mostrou que ela aceitava CRLF
   mesmo com `eol=lf`, que exige LF no checkout. Além disso, normalização para
   o índice não distingue uma edição humana de uma conversão de checkout.
   O sync voltou a preservar bytes divergentes; a atualização automática do
   caso CRLF equivalente continua falhando e exige solução sem perda de dados.
   O check direto agora identifica `line-ending-diverged` quando apenas a
   normalização CRLF corresponde ao registro, sem autorizar a escrita. Testes
   em macOS e Linux cobrem a edição humana, UTF-8 inválido e checkout LF;
   os casos conhecidos de atualização CRLF e perda de xattr foram excluídos
   das respectivas execuções ampliadas e permanecem pendentes.
   Quando a referência CRLF já coincide com a saída esperada após normalizar
   finais de linha, CLI e sync direto passam a preservá-la sem duplicar o
   apontamento ou adotar seus bytes. O teste cobre duas sincronizações e uma
   mudança posterior de descrição em macOS e Linux; isso não resolve a
   atualização do registro derivado divergente nem a proteção de xattr Linux.
   Uma revisão encontrou que a fonte dessa referência poderia mudar depois do
   plano; a aplicação agora revalida a referência e sua fonte nesse cenário.
   Testes em macOS e Linux confirmaram recusa de mudanças sequenciais após o
   plano, com os bytes humanos e Git observados preservados. Isso não prova
   proteção contra todas as corridas durante a aplicação.
   Uma alteração sintética da fonte durante a criação do backup também foi
   recusada nos dois sistemas; o arquivo editado, o índice, o estado observado
   e o backup sinalizado permaneceram disponíveis para revisão.
   A suíte principal da CLI na candidata atual teve 29 aprovações no macOS e
   27 no Linux, com dois skips específicos do macOS. Uma prévia offline do
   pacote incluiu licença e README e não incluiu os caches e resultados de
   teste verificados; não prova ausência de todo dado privado ou publicação.
   A suíte ampliada no macOS passou com 362 testes e seis skips específicos de
   outras plataformas. Uma falha intermitente no controle positivo de filtro
   foi corrigida usando renormalização explícita; a repetição passou três vezes.
   Na atualização sintética posterior da `0.0.21` publicada para a candidata
   local `0.0.30`, oito das nove operações `update` retornaram sucesso e a
   fixture Claude recusou oito conflitos. Todas as consultas `sync --check`
   sinalizaram cobertura de ignore não verificada e ignore legado. O init
   antigo alterou `info/exclude` nas nove fixtures; os caminhos humanos e Git
   observados permaneceram iguais durante o update e a consulta posteriores.
   Na fixture Codex com CRLF staged, a versão atualizada manteve o conteúdo
   indexado como prefixo após normalização e acrescentou um bloco; isso não
   demonstra que o novo ramo de equivalência foi usado. O teste não cobre
   histórico completo, todos os metadados ou ativação nativa.
   Em uma cópia da fixture Codex, desativar apenas o marcador legado preservou
   as regras e o check passou com os avisos de cobertura ainda presentes; a
   consulta preservou os arquivos Git observados. Um teste isolado confirmou
   no macOS e Linux que esses avisos não bloqueiam, enquanto o marcador legado
   bloqueia. Nenhuma regra do projeto real foi alterada.
   O teste de xattr aceita uma atualização que preserve o atributo ou uma
   recusa sem alteração, sem exigir recusa permanente. Após essa revisão, a
   suíte de preservação no macOS registrou 30 aprovações, uma falha de
   `autocrlf` e um skip específico de Linux; a mesma falha ocorreu no Linux.
   O runner atual classifica pelo código de saída e pode chamar de sucesso uma
   suíte com testes ignorados. Um reporter experimental distinguiu resultado
   parcial e arquivo sem testes observáveis, mas a pipeline de release ainda
   não consome esse estado e poderia aprová-lo. A política para skips esperados
   e TODOs precisa ser integrada e validada antes de adotar o protótipo.
   Dois testes pendentes agora demonstram no macOS e Linux que o runner marca
   como `passed` tanto uma suíte só com skip quanto um arquivo sem testes
   declarados. O Node 24 também conta o arquivo vazio como um teste aprovado;
   portanto, contar testes e verificar código zero não resolve a lacuna. Os
   dois testes estavam marcados como TODO e falhavam nas suas asserções.
   Uma implementação posterior classifica como `partial` skips, TODOs e
   ausência de testes declarados, e o comando retorna erro para resultado
   parcial. Passou 15 controles no macOS e no Linux, incluindo saída simulando
   evidência e opção de filtro herdada. A política ainda trata qualquer skip
   como parcial, inclusive os esperados por plataforma; faltam integração com
   a política de release, análise de confiabilidade dos eventos e Windows.
   O relatório passou a registrar a identidade e o motivo dos skips observados,
   com caminho relativo ao projeto quando disponível. Os 16 controles do
   executor passaram no macOS e em contêiner Linux; isso ainda não aprova
   automaticamente nenhum skip nem prova a matriz de CI completa.
   Duas execuções offline do pacote local extraído em contêiner Linux tiveram
   nove suítes completas, três parciais e uma falha de sincronização. Os
   skips identificados nas três suítes parciais foram CLI de skills não
   preparada, runner de desenvolvimento ausente do pacote e Compose ausente;
   a suíte falha também registrou o teste de alias 8.3 exclusivo do Windows.
   Isso caracteriza o pacote e o ambiente do contêiner, não o checkout do CI.
   Revisão independente identificou dois defeitos no coletor dessa execução:
   Node 24.13 não fornece `entryFile` em eventos de teste, e encerramento
   antecipado com código zero podia parecer sucesso. A candidata passou a
   exigir o resumo do arquivo de entrada e foi testada com execução normal,
   importada, vazia e interrompida. Os 20 controles passaram em macOS com Node
   24.13 e Linux com Node 24.22; a execução completa do pacote acima antecede
   essa alteração e não a valida. Outros minors, Windows, identidade de skips
   e confiabilidade de eventos ainda requerem avaliação.
   Um grupo ignorado ou pendente também pode deixar as contagens do Node sem
   skips ou TODOs. A classificação passou a considerar os eventos desses
   grupos; dois controles passaram no macOS e Linux. A revisão apontou ainda
   risco de ACL herdada para logs: no macOS o executor agora recusa uma ACL
   listada ou não verificável no diretório de saída antes de executar ou
   gravar. O teste com ACL herdada passou; não comprova ACLs ocultas,
   alterações concorrentes ou outros sistemas. A suíte do executor teve 23
   aprovações no macOS e 22 no Linux, com um skip específico de macOS.
   Outra tentativa de executar o pacote coincidiu com alterações no checkout
   durante o empacotamento; seus resultados não validam uma versão congelada.
   Uma repetição posterior usou um pacote local cujo SHA-256 permaneceu
   `78bfd16d47e82a21c5bf65464e5697e36c21586026eadbbb20ed4a0a9a0d56cf`;
   executor, reporter e seu teste foram comparados ao checkout antes da
   execução. No Linux offline, oito suítes passaram, quatro ficaram parciais
   e a sincronização falhou no caso de `autocrlf`. Depois do empacotamento,
   um teste adicional de ACL não verificável passou no macOS. A suíte atual
   teve 24 aprovações no macOS e 22 no Linux, com dois skips de macOS. Uma
   prova independente também observou que ACL de pai não herdável não bloqueou
   a fixture no macOS; não demonstra privacidade diante de mudanças simultâneas.
   Um controle posterior simulou falha da consulta após a suíte: o executor
   recusou gravar o log ou relatório e preservou o índice na fixture macOS.
   Isso não comprova proteção contra mudanças após a própria verificação. Com
   esse controle, a suíte do executor teve 25 aprovações no macOS e 22 no
   Linux, onde três testes específicos de macOS foram ignorados.
   Uma prova Linux isolada com `cp` e metadados sintéticos preservou ACL e
   xattrs na cópia examinada. Ela não executou o kit nem comprovou backup,
   recuperação ou alterações concorrentes, e não autoriza integrar a técnica.
   Em outro filesystem, `cp --preserve=xattr` retornou zero mesmo sem
   preservar a ACL; com preservação de modo e ACL, retornou erro depois de já
   criar o destino com conteúdo. Os controles usaram arquivos sintéticos e
   não justificam tratar o código de saída como prova de preservação ou de
   ausência de escrita.
   Outra fixture Linux observou uma ACL padrão em arquivo vazio criado antes
   da escrita. O arquivo foi criado pela fixture, não pelo `cp`; portanto,
   isso não comprova a sequência interna do utilitário nem acesso efetivo.
   O relatório identifica a combinação específica de teste, arquivo e evento
   do alias Windows como esperada no Linux e macOS, mas mantém o resultado
   parcial e não presume execução no Windows. A chave não prova por si só a
   causa do skip. Os controles atuais do executor registraram 27 aprovações
   no macOS e 24 no Linux, com três skips específicos de macOS.
   A classificação passou também a recusar contagens incompatíveis ou sem
   aprovações. Com esse ajuste, os controles tiveram 28 aprovações no macOS e
   25 no Linux, com três skips específicos de macOS; não se trata do gate
   completo de publicação.
   Na repetição Linux offline com o reporter experimental, das 13 suítes, nove
   ficaram completas, três parciais e uma falhou no caso de `autocrlf`; a
   suíte falha também teve um skip. O resultado parcial identifica a lacuna,
   mas ainda não informa no relatório a identidade de cada teste ignorado.
   Uma reprodução direcionada nas mesmas condições encontrou quatro skips
   compatíveis com as contagens: CLI de skills não preparada, runner de
   desenvolvimento ausente no pacote, Docker Compose ausente e teste de
   alias 8.3 específico do Windows. Como a execução completa não registrou a
   identidade dos skips, a reprodução não comprova quais ocorreram nela.
   O CI `full` usa o checkout, não essa cópia do pacote: a ausência do runner
   de desenvolvimento no tarball não comprova sua ausência no CI, e a
   disponibilidade das ferramentas naquele ambiente não foi confirmada.
   Uma política isolada recusou evidência ausente, TODO e skips não aprovados
   em cinco controles por sistema no macOS e Linux. A revisão apontou que ela
   ainda não vincula resultados ao processo e à matriz de CI e que a identidade
   proposta pode colidir. Não foi integrada nem validada no Windows; não
   constitui autorização para publicar.
   Uma prova adicional conectou o runner experimental ao perfil `full` em
   cópia isolada: quatro controles passaram em cada um de macOS e Linux,
   com as outras etapas simuladas e sem publicação. A exigência de execução
   completa bloquearia releases normais porque o teste Windows 8.3 é ignorado
   em Linux. O contrato do manifesto e seu consumidor também precisam de
   mudança coordenada; não foi integrada uma regra que esconda o skip.
   Uma variante posterior qualificou o skip específico de Windows 8.3 no Linux
   e registrou resultado `partial` em manifesto experimental. O publicador
   atual recusou o manifesto; outros grupos do perfil ainda não têm evidência
   estruturada de skips. Os controles passaram 6/6 no Linux e 4 no macOS, com
   dois skips específicos de Linux; as demais etapas foram simuladas. Não
   houve build, Actions ou publicação, e a variante não foi integrada.
   Outra cópia observou também os grupos Node e a distribuição: seis controles
   sintéticos passaram no Linux e três do observador no macOS. O build foi
   simulado; a publicação ainda recusa manifesto parcial, e a evidência do
   manifesto precisa de revisão. O fluxo completo de release não foi provado.
   Uma variante posterior registrou contagens também em resultados aprovados
   e repetiu builds locais com manifestos sintéticos. Passou 14 controles no
   Linux e 11 no macOS, com três skips; o publicador recusou resultados
   parciais e legados sem cobertura. O novo contrato ainda requer migração de
   consumidores, política de skips e validação no CI e Windows; não autentica
   a origem da evidência e não foi integrado.
   Um controle offline distinguiu consulta histórica de nova publicação: o
   publicador proposto recusou manifesto legado sem cobertura, enquanto o
   anterior o aceitou. A proposta mantém a consulta como não verificada e
   exige nova evidência para publicar; não altera pacotes já existentes.
   Uma prova isolada mostrou que uma mensagem arbitrária de falha de limpeza
   pode aparecer na saída JSON do estágio, inclusive como falha secundária de
   sincronização. Uma correção localizada substituiu a mensagem secundária no
   diagnóstico do estágio, mantendo código, caminho e causa da sincronização;
   os controles passaram 11/11 no macOS e Linux. A remoção final do estágio
   quando é falha primária também recebeu mensagem fixa, preservando código e
   causa na API; a mensagem da própria API muda para texto fixo. As suítes
   relacionadas passaram 17/17 no macOS e Linux. Um pacote local posterior
   incluiu a fonte com bytes iguais e, após extração e cópia da fixture, passou
   os seis controles da remoção final no macOS; não comprova publicação.
   No rollback do instalador, mensagens secundárias deixaram de ser incluídas
   no detalhe agregado e em `cleanupFailures` da CLI. Controles de API, JSON e
   texto passaram no macOS e Linux; a API preservou causa primária e erro
   secundário no agregado, e os caminhos observados permaneceram disponíveis.
   A projeção JSON usa o mesmo texto para todas as falhas de limpeza e perde
   detalhes secundários; erros primários e caminhos ainda podem conter dados.
   Na repetição das cinco suítes relacionadas, o macOS teve 247 aprovações e
   um skip; o Linux, 246 aprovações e dois skips. Não foram executados testes
   Windows nem a pipeline completa nessa repetição.
   O agregado de rollback do sync também deixou de concatenar mensagens
   secundárias, mantendo os objetos na API; controles direcionados passaram
   no macOS e Linux e em pacote local extraído no macOS. Limpeza interna do
   sincronizador e outras saídas ainda requerem revisão. A falha secundária ao
   remover o estágio depois de um erro do sync ou do callback de verificação
   de saída fica disponível à API na propriedade não enumerável `cleanupError`,
   sem substituir a causa primária; outros ramos ainda não têm esse campo.
   As duas suítes de limpeza passaram 23/23 no macOS e Linux; seis controles
   também passaram em pacote local extraído no macOS, com teste copiado após a
   extração. A propriedade é acessível explicitamente e não é um segredo.
   O mesmo campo passou a conservar a falha secundária quando a origem é o
   callback de verificação de saída. Três suítes relacionadas passaram 45/45
   no macOS e Linux; após reforçar a comparação de caminhos, os dois controles
   do callback passaram novamente nos dois sistemas e em pacote local extraído
   no macOS. O Windows e erros secundários congelados nesse ramo não foram
   testados.
   O planejamento agora registra a ocorrência de falhas independentemente do
   valor lançado, e usa `Object.is` para correlacionar o erro do sync. Em 55
   controles sintéticos por sistema, inclusive `undefined`, `null`, `false`,
   zero, string vazia e `NaN`, a falha foi reportada e o resíduo observado foi
   preservado quando a limpeza falhou. Isso não comprova a ocorrência natural
   desses valores nem o comportamento em Windows.
   Uma execução ampliada de seis arquivos registrou 329 aprovações e um skip
   no macOS, e 328 aprovações e dois skips no Linux. Posteriormente, 24
   controles direcionados para falhas simultâneas passaram em cada sistema;
   a suíte ampliada não foi repetida após adicionar esses controles.
   Um controle da API `applyPlan` mostrou que uma falha sintética sem valor
   antes da publicação podia remover o temporário. A escrita atômica agora
   registra a ocorrência da falha: sete controles preservaram o temporário,
   a causa, o índice e o arquivo humano observado no macOS e Linux. A ocorrência
   natural desses valores e o Windows não foram comprovados.
   O instalador e o sync direto agora recusam alterações em arquivos com ACL
   listada no macOS ou quando a consulta é inconclusiva. Os controles incluem
   ACL e xattr simultâneos e diagnóstico da CLI; a inspeção não expõe sua saída.
   Na primeira versão, planejamento e check não consultavam ACL. Eles passaram
   a informar os bloqueios nos alvos reais; a detecção não comprova ACLs ocultas,
   diretórios, outros sistemas ou alterações posteriores à consulta.
   Em uma suíte de regressão no macOS, 56 testes passaram; no Linux, 42
   passaram e 14 foram ignorados por plataforma. Dois controles estritos no
   macOS recusaram ou preservaram ACL que nega append. A revisão detectou uma
   saída malformada inicialmente classificada como vazia; o classificador foi
   ajustado para tratá-la como não verificada. O Node 18 no Linux executou o
   classificador, mas ignorou os 11 testes específicos de macOS.
   Doze controles também passaram no macOS após extração do pacote local; isso
   não comprova publicação, instalação em projeto real ou ACLs em diretórios.
   O diagnóstico antecipado foi ampliado para plano, doctor e check direto no
   macOS, incluindo conflitos e alterações após o plano. A suíte relacionada
   passou 83 testes no macOS; no Linux, 63 passaram e 20 foram ignorados por
   plataforma. Três controles passaram com pacote local extraído no macOS.
   Não há prova de Windows, ACLs ocultas, diretórios ou atomicidade.
   A consulta inicia um processo por arquivo existente afetado. Em uma única
   medição local macOS de 100 arquivos sintéticos de 11 bytes sem ACL, as
   consultas somaram 260,7 ms, com mediana de 2,43 ms e p95 de 4,08 ms; 100
   chamadas `lstat` somaram 0,5 ms. Não é benchmark do plano completo nem
   previsão para outras máquinas, cargas ou sistemas de arquivos.
   O mesmo defeito foi reproduzido na API de sync com sete falhas sintéticas:
   antes da correção o temporário era removido; após registrar a ocorrência da
   falha, os sete controles preservaram caminho, causa, índice e arquivo humano
   observado. A suíte de preservação de temporários passou com 94 testes no
   macOS e 94 no Linux em container. Ela não comprova concorrência, metadados,
   falhas naturais com esses valores ou comportamento no Windows.
   No backup do sync, uma falha sintética sem valor durante a cópia podia ser
   ignorada e a sincronização prosseguia. A correção registra a ocorrência da
   falha e interrompe a operação, preservando também a causa se o fechamento
   falhar. A suíte de backup e diagnóstico passou com 26 testes no macOS e
   no Linux em container. Esses controles não comprovam segurança concorrente,
   preservação de metadados, ocorrência natural da falha ou Windows.
   Os controles de falha foram ampliados para escrita parcial: o backup retido
   corresponde ao prefixo da origem observada, sem alterar essa origem, o
   apontamento, o índice ou os arquivos humanos comparados. A suíte ampliada
   passou com 28 casos no macOS e 28 no Linux em container; as falhas são
   injetadas e a segurança sob concorrência continua sem prova.
   Após extrair um pacote local com o script comparado ao checkout e copiar a
   fixture, os 14 controles direcionados também passaram no macOS; isso não
   representa uma instalação publicada nem valida o pacote completo.
   Uma variante isolada para a limpeza interna do sync passou oito controles
   no macOS e Linux, inclusive reentrância com erro congelado. O agregado foi
   testado somente em cópia anterior instrumentada; nova API, valores
   primitivos e Windows permanecem sem prova. A variante não foi integrada.
   Caminhos temporários
   continuam disponíveis no diagnóstico para revisão. Windows não foi testado.
   Um pacote local offline anterior incluiu a correção secundária então vigente
   com bytes iguais; após extrair o pacote e adicionar a fixture de teste, os
   dois controles secundários passaram no macOS. Esse pacote antecede a
   correção primária e não prova publicação ou outras falhas.
   Uma variante de laboratório para limpeza primária passou 12 controles no
   macOS, mas ainda pode perder a marca de proveniência ao atravessar um
   agregado de erros. Não foi integrada; Linux, Windows e a suíte completa
   permanecem sem prova para essa variante.
   Um protótipo suprimiu
   as mensagens, mas alterou a API e três expectativas existentes; permanece
   isolado enquanto uma alternativa compatível é investigada. Outra prova
   mostrou mensagem secundária de rollback no JSON; a revisão também apontou
   um ramo de limpeza do estágio sem proteção e limites em códigos e caminhos.
   Uma alternativa baseada em marca no objeto preservou a API no caso testado,
   mas classificou incorretamente uma segunda ocorrência ao reutilizar o mesmo
   erro em fixture; essa reprodução avaliou a projeção, não a CLI real.
   O diagnóstico de falhas ao inspecionar o projeto foi separado do estágio;
   as suítes relacionadas passaram em macOS e Linux, com 63 testes em cada.
   Outros erros ainda podem divulgar detalhes não confiáveis na saída da CLI;
   o coletor foi protegido e validado nas suítes relacionadas, mas a
   sanitização dos demais caminhos precisa de correção e validação próprias.
   Outra projeção experimental usou mensagens fixas na CLI e passou nove
   controles direcionados e dois de reutilização de erro no macOS, após
   ajustar na cópia uma expectativa de texto. Um controle adicional passou em
   executáveis reais com falha sintética injetada. A projeção reduz detalhes
   úteis e ainda pode divulgar caminhos sem proveniência comprovada; não foi
   integrada nem demonstra sanitização geral ou compatibilidade completa.
   Uma segunda projeção por ocorrência passou 21 controles direcionados no
   macOS e 21 no Linux em cópia congelada. Uma chamada de API aninhada pode
   receber wrapper, e caminhos arbitrários ainda podem aparecer; códigos não
   reconhecidos também podem ser omitidos. A variante continua isolada e não
   demonstra compatibilidade ou sanitização geral.
   Erros de sintaxe no JSON externo do catálogo agora informam o caminho sem
   incluir trechos do conteúdo; verificações de esquema seguem fora desse
   alcance. O sincronizador também usa mensagens sem conteúdo para erros de
   sintaxe nos estados instalado e derivado e na configuração de clientes; os
   testes focados passaram no macOS e no Linux. Na cópia instalada de um pacote
   local, três checks recusaram esses JSONs sem expor o conteúdo e preservaram
   o índice e os arquivos examinados; o estado derivado foi criado pela fixture.
   Os leitores locais de
   ferramentas e skills externas também usam
   mensagens de sintaxe sem conteúdo ou caminho; testes e classificação da
   pipeline passaram com 42 testes no macOS e 42 no Linux, incluindo a
   sintaxe da política local de adaptadores no planejador de ignore e na
   carga inicial do sync direto. Esses casos preservaram o índice observado;
   o primeiro também preservou o exclude. A CLI principal agora trata esse
   erro de carga sem exibir conteúdo ou caminho, em texto e JSON, nos três
   idiomas; o teste observou índice e arquivo humano preservados. Para esse
   mesmo erro, o sync direto também deixou de exibir o caminho do módulo nos
   testes macOS e Linux. Uma cópia instalada do pacote local confirmou o caso
   no macOS; outros erros e versões de runtime não foram cobertos por ela.
   As suítes da CLI e dos diagnósticos passaram com 39 testes no macOS e 37
   no Linux, onde dois casos foram ignorados por plataforma. O idioma do erro
   de startup usa as opções explícitas, sem consultar o idioma salvo.
   O teste de distribuição do pacote local passou em seis casos no macOS e
   seis no Linux, antes do ajuste posterior na skill de PRD. A primeira execução
   Linux falhou ao executar o pacote em tmpfs montado com `noexec`; a repetição
   com execução habilitada passou. Essas provas não demonstram publicação nem
   comportamento no Windows.
   A revisão de entrega também passou a ocultar conteúdo de JSON malformado
   em relatório, baseline e selo. Os três casos passaram pela API e CLI no
   macOS e no Linux, com índice e arquivos observados preservados. A ausência
   do relatório continuou retornando `ENOENT` nas duas plataformas. Outras
   falhas de leitura e erros de esquema não foram cobertos por esses testes.
   A suíte de revisão passou com 110 testes em cada sistema; o teste de
   `ENOENT`, acrescentado em seguida, passou separadamente nos dois sistemas.
   Uma execução Linux dos testes de adaptadores falhou numa fixture em tmpfs:
   o verificador encontrou o `.git` acima do ponto de montagem, mas o Git não
   atravessou o limite do sistema de arquivos. A fixture passou a criar seu
   próprio repositório Git em uma pasta temporária; as três suítes somaram 69
   testes aprovados no macOS e 69 no Linux após o ajuste, incluindo uma seleção
   representativa sem Git ancestral. Em outra execução Linux, no tmpfs que
   havia exposto a falha, 26 testes de adaptadores passaram e o caso sem Git
   ancestral foi ignorado porque o temporário estava dentro do checkout.
   A CLI principal também recusou os três JSONs malformados em `sync --check`
   e `update --dry-run`, preservando os arquivos Git, de estado e humanos
   observados na fixture, inclusive o índice com alterações preparadas e uma
   alteração humana ainda não preparada. Isso não prova o `update` efetivo.
   A primeira tentativa
   macOS anterior falhou com um alias no diretório temporário; foi repetida
   com caminho físico. A causa exata da falha anterior não foi comprovada pelo
   log. Em uma
   instalação sintética do pacote local, o check com Node 26 recusou JSON
   inválido sem exibir o conteúdo e manteve o índice e o arquivo examinados.
   Uma tentativa anterior terminou antes do diagnóstico e não registrou a
   versão usada. Após
   revisar cinco expectativas de preservação, a suíte ampliada
   de sincronização registrou 203 aprovações, uma falha e um skip tanto no
   macOS quanto no Linux. A falha restante envolve `autocrlf` e continua em
   investigação; não foi atribuída à correção do diagnóstico. Um protótipo que
   permitiu a escrita perdeu ACL em macOS e xattr em Linux; os controles da base
   recusaram a operação e preservaram os metadados sintéticos observados.
   O teste agora exige a descrição nova no frontmatter e bytes intactos do
   índice, impedindo aprovar um resultado que preserve o apontamento antigo.
   O controle confirmou que um no-op não satisfaz a asserção; a candidata
   passou em cópia no macOS e Linux, sem comprovar segurança ou metadados. A base
   continua falhando na colisão em ambos, antes de chegar às novas asserções;
   o teste normaliza finais de linha e não exige CRLF no resultado.
   Uma repetição com snapshot atualizado confirmou que a normalização proposta
   permite atualizar a referência e preservar o índice, mas ainda perde ACL no
   macOS e xattr no Linux. Ela permanece fora do produto.
   Uma variante posterior exigiu entrada e blob equivalentes no índice e recusou
   os metadados observados nas fixtures. A revisão independente destacou que
   hash não comprova autoria, que o diff depende de addon não distribuído e que
   as guardas afetam outras operações do sync. Os testes não comprovam conteúdo
   preservado em todos os erros, concorrência, autorização ou compatibilidade
   multiplataforma; a variante permanece em laboratório.
   Quatro controles adicionais no macOS recusaram substituição com ACL ou xattr
   sintético e preservaram os arquivos e metadados observados, com e sem force.
   Sem metadados, houve atualização, mas o check imediato indicou divergência
   do índice staged preservado; um controle só ficou saudável após `git add`
   explícito e outra sincronização. A repetição Linux foi inconclusiva; segundo
   a investigação da equipe, o addon não carregou em tmpfs sem execução e a
   ACL não era suportada ali.
   Esse experimento não foi integrado nem comprova portabilidade ou atomicidade.
   Uma repetição posterior no Linux com filesystem que permitiu o addon e ACL
   passou seis controles, assim como no macOS. Dois controles adicionais por
   sistema preservaram metadados sintéticos do diretório pai; eles não cobrem
   ACLs herdáveis ou diretórios restritivos. O protótipo ainda depende de addon
   experimental e não comprova todos os metadados nem Windows.
   Outra variante sem addon passou cinco controles por sistema: quatro de
   preservação de referências CRLF equivalentes e um de recusa de alteração
   real. A revisão independente
   confirmou que ela não resolve o teste de CI com descrição alterada: nesse
   caso a proteção continua recusando a operação. A prova cobre apenas um tipo
   de apontamento; faltam suíte completa, CLI, Windows e concorrência. A
   variante permanece em laboratório.
   Uma prova de escrita direta pelo descritor preservou inode e metadados
   sintéticos nos controles observados, mas também alterou outro nome ligado
   por hardlink e deixou conteúdo incompleto após interrupção simulada. Foram
   quatro controles no macOS e quatro no Linux; não executaram o sync. Esse
   mecanismo isolado não é uma correção segura para integrar.
   Em outro controle, a candidata de substituição desfez a relação com um
   hardlink humano, embora preservasse os bytes do outro nome. Uma guarda
   experimental recusou o caso e preservou a relação nas fixtures de macOS e
   Linux. Ela ainda depende de sondas experimentais e não comprova metadados,
   concorrência ou Windows; não foi integrada.
   Um teste versionado agora exige a recusa quando o apontamento CRLF precisa
   mudar e compartilha inode com arquivo humano. O controle passou no macOS e
   Linux, preservando os bytes, a relação observada e o índice; o Windows não
   foi validado. Na base daquela prova, a recusa veio da colisão genérica, sem
   comprovar uma guarda específica de hardlink. Se não for possível criar o link,
   o teste informa skip para as condições reconhecidas. Essa recusa não resolve
   a atualização de arquivos sem links.
   Uma guarda posterior no sync direto passou a recusar atualização ou remoção
   de arquivo regular com múltiplos hardlinks observados antes da escrita. Os
   quatro casos com e sem force e um sync sem alterações passaram no macOS e
   Linux, preservando os caminhos comparados; uma suíte anterior à expansão
   passou 132 testes em cada sistema. A verificação não é atômica com a escrita,
   e Windows, atributos estendidos e ACLs seguem sem prova suficiente.
   O sync agora também verifica a contagem imediatamente antes de publicar ou
   remover. Um hardlink criado entre as verificações levou à recusa em testes
   de atualização e remoção; a remoção inicialmente restaurava o arquivo e
   rompia o link, e foi ajustada para não restaurar quando a ação ainda não
   começou. Os dois controles do sync e um do instalador passaram em macOS e
   Linux, assim como 140 testes da suíte relacionada em cada sistema. Não
   eliminam a janela posterior à última verificação nem comprovam
   segurança concorrente geral. A revisão também apontou um risco ainda sem
   reprodução: operações anteriores no mesmo limite de transação podem levar
   o rollback a restaurar esse limite, enquanto o fingerprint não inclui a
   contagem de links. É preciso verificar se o plano permite essa situação.
   Outra correção impede que uma falha de remoção com valor vazio seja tratada
   como sucesso. Quando o conteúdo observado permanece igual, o rollback evita
   recriar o caminho; se houve toque anterior na mesma raiz, ela é preservada
   como incerta e pode manter alterações parciais. A suíte relacionada passou
   161 casos em cada sistema; os 21 controles direcionados também passaram com
   o script extraído de pacote local no macOS. O ramo com toque anterior, ACL, xattr,
   concorrência geral e Windows seguem sem prova suficiente.
   Posteriormente, seis controles com erro `EIO`, inclusive imutável,
   também passaram em cada sistema; esses erros são injetados pela fixture.
   Um protótipo isolado para informar hardlinks no planejamento passou seis
   controles por sistema, inclusive conflito simultâneo e mudança posterior
   ao plano. Não foi integrado: requer revisão dos caminhos e mensagens e não
   comprova atomicidade nem compatibilidade com Windows.
   Uma integração seletiva posterior informa hardlinks compartilhados e
   contagens não verificadas no planejamento, check e doctor; conflitos humanos
   mantêm prioridade. As mensagens foram corrigidas após revisão independente.
   Sete suítes relacionadas passaram 219 testes no macOS e Linux; dois controles
   passaram após extração de pacote local no macOS. A prova não cobre Windows,
   todas as mudanças concorrentes ou preservação de ACL e xattr.
   O instalador também passou a conferir os alvos reais planejados antes do
   backup e novamente antes da escrita. Testes sintéticos de atualização e
   remoção preservaram os hardlinks observados; a suíte relacionada passou 137
   casos no macOS e Linux. Na CLI real, seis testes de init verificaram saída
   humana e JSON nos três idiomas em ambos os sistemas. Uma primeira execução
   Linux relatou erro de sintaxe em leitura de arquivo incompleta; a repetição
   passou, mas a causa da leitura incompleta não foi comprovada. A proteção
   permanece sujeita a alterações concorrentes e não foi testada no Windows.
   Contagens de hardlinks inválidas ou ausentes agora interrompem a aplicação
   com diagnóstico de metadados não verificados, em vez de serem tratadas como
   prova de ausência. Doze controles sintéticos da API, sync e CLI passaram no
   macOS e Linux, inclusive mensagens nos três idiomas. Não se comprovou quais
   filesystems retornam esses valores; a política pode bloquear sua operação.
   A suíte relacionada passou 179 testes no macOS e Linux; os 12 controles
   também passaram após extração de um pacote local no macOS. A política não
   foi comprovada em Windows ou em filesystem que retorne contagem inválida.
   Uma hipótese de bloqueio do estágio por ACL herdável no diretório temporário
   não ocorreu em fixtures de init e sync. A herança foi verificada em amostra
   separada, não no arquivo efetivo do estágio; outras operações seguem sem
   prova, assim como a preservação integral de metadados nesses controles.
   Controles posteriores ampliaram os valores sintéticos para contagens
   negativas, fracionárias, infinitas e imprecisas; 20 passaram em cada sistema.
   Um controle adicional confirmou a recusa quando a contagem se tornou
   indisponível após o plano, sem declarar o hardlink como confirmado.
   Os 20 controles ampliados também passaram após extração de pacote local no
   macOS; isso não comprova uma publicação ou instalação em outros sistemas.
   Uma nova execução do caso `autocrlf` no Linux confirmou a recusa por
   colisão antes de atualizar a referência. O sync compara o hash registrado
   aos bytes atuais, que diferem após conversão de finais de linha. Aceitar a
   equivalência por si só ainda não protege ACLs, xattrs ou hardlinks.
   Os helpers `withUncertainPath` e `withPotentialPartial` agora leem a mensagem
   uma vez; os testes dessa alteração passaram em macOS e Linux. Isso não
   comprova proteção de todos os getters ou da saída do sincronizador. Um
   protótipo mais amplo continua fora do produto porque ainda expõe um caminho
   não confiável no sync direto.
   O diagnóstico de hardlink imutável também passou a conservar o código lido
   no reconhecimento; as suítes direcionadas passaram com 21 testes no macOS e
   21 no Linux. Essas provas não corrigem a recuperação concorrente.
   Uma fixture antiga foi ajustada para exigir truncamento em diagnóstico
   malformado sem perder dados válidos. As suítes de configuração Git e locale
   passaram com 153 testes no macOS e 152 no Linux; um e dois casos,
   respectivamente, foram ignorados por plataforma.
   Uma cópia experimental de ACL para backup preservou a entrada
   `everyone allow read` mesmo com modo `0600`. O acesso efetivo não foi
   testado; copiar metadados não comprova privacidade do backup.
   Uma fixture separada confirmou ACL herdada no backup e em temporários de
   init, sem testar acesso por outra identidade. A aplicação e o sync agora
   recusam copiar para backup novo no macOS quando a pasta tem ACL listada ou
   sua consulta falha; quatro controles preservaram o backup vazio e os
   arquivos comparados. A guarda não cobre temporários de publicação, outros
   sistemas ou alterações concorrentes após a consulta.
   Dois controles adicionais confirmaram que ACL não herdável no diretório pai
   não bloqueou as fixtures de instalador e sync; a suíte correspondente passou
   78 testes no macOS, e 72 no Linux com seis skips específicos do macOS.
   Após revisão, os controles bem-sucedidos passaram a comparar os bytes e o
   modo do arquivo específico no backup com os da origem; os sete controles
   direcionados passaram no macOS, sem comprovar todos os metadados.
   Os seis controles de backup passaram também no macOS após extrair o pacote
   local, sem instalar em projeto real.
   Uma prova adicional executou o init real da CLI com ACL herdável na raiz da
   fixture: o backup foi recusado vazio, e o arquivo original, índice e demais
   arquivos comparados foram preservados. A prova passou também com pacote
   local extraído. A suíte ampliada passou 79 testes no macOS e 72 no Linux,
   com sete testes de macOS ignorados no Linux; não mediu acesso de terceiros.
   Os quatro controles anteriores ao reforço da inspeção da fixture também
   passaram com o pacote local extraído; não houve instalação em projeto real.
   Um protótipo separado examinou temporários vazios antes de gravar conteúdo
   e recusou ACL herdada nas fixtures. Os 24 controles existentes de modo e
   umask não observaram a nova escrita por descritor; o protótipo continua
   isolado até que a cobertura seja adaptada e os fechamentos sejam verificados.
   Após adaptação experimental do observador, os 24 controles passaram no
   macOS e no Linux. Persistem lacunas nos demais testes de falha, fechamento, backup,
   rollback, atributos estendidos e atomicidade; não houve integração.
   Uma variante de laboratório preservou erros simultâneos de ACL e fechamento
   em seis controles macOS; no Linux passou um controle de agregação e cinco
   específicos de macOS foram ignorados. A identidade na publicação continua
   sem prova após o fechamento do descritor; não foi integrada.
   Outra cópia isolada com `cp -p` no macOS conservou ACL e xattr sintéticos.
   Com destino preexistente, `cp -np` retornou erro e manteve seu conteúdo na
   fixture. Esses controles não comprovam privacidade, atomicidade ou tratamento
   de corridas e não foram integrados ao produto.
   A primitiva isolada de backup agora recusa operar sem UID efetivo disponível;
   sua suíte passou com 53 testes no macOS e 53 no Linux. Ela ainda não está
   integrada ao instalador ou ao sync e não comprova privacidade de ACLs.
   Uma instrumentação de teste observou 290 diretórios criados e 488 nomes
   temporários em um init sintético; o candidato de captura cobriu os
   diretórios, mas não os temporários. Em outra fixture, a raiz ausente também
   ficou fora. Uma cópia sintética de backup foi conferida por bytes. A suíte
   passou com 29 testes no macOS e 29 no Linux; isso não comprova um plano
   completo nem recuperação segura.
2. [-] **Práticas externas:** comparar [ECC](https://github.com/affaan-m/ECC) e
   [Superpowers](https://github.com/obra/superpowers) com o kit. Priorizar
   avaliações com evidências, diagnóstico e revisão; respeitar licenças e evitar
   copiar conteúdo desnecessário ou ativar automações sem pedido.
3. [ ] **Autoria:** verificar código, documentação, metadados e histórico a
   publicar; remover referências aos agentes usados no desenvolvimento sem
   remover instruções de compatibilidade. Reforçar nas skills Git que autoria,
   committer e coautoria de agentes não devem constar nos commits.
4. [-] **Instalação:** verificar publicação no npm e testar formas úteis de
   execução com npm, Yarn, pnpm e Bun, documentando versões, pré-requisitos e
   limitações observadas; não afirmar compatibilidade sem prova. A versão npm
   `0.0.30` executou as quatro vias em macOS, mas alterou `.git/info/exclude`
   nas fixtures; a preservação integral não passou nessa prova.
5. [-] **Links externos:** inventariar e testar os links versionados, conferir
   pertinência e corrigir destinos; distinguir falha comprovada de bloqueio,
   autenticação, limite de acesso ou indisponibilidade temporária.
   Uma primeira extração de Markdown rastreado verificou 103 URLs com resposta
   2xx; quatro não foram verificadas. Outra busca encontrou 41 respostas 2xx
   entre referências adicionais. Sintaxes não capturadas e âncoras seguem
   pendentes; HEAD bem-sucedido não comprova pertinência do conteúdo. Uma
   auditoria incremental encontrou três destinos públicos adicionais acessíveis;
   URLs privadas, consultas sensíveis e endpoints mutáveis foram excluídos.
6. [-] **Performance:** incorporar ao fluxo a definição prévia de carga,
   métrica, limites e prova comparável, conforme o artigo fornecido; evitar
   assumir percentil ou quantidade de repetições universais.
7. [-] **Exemplos:** criar exemplos sintéticos úteis para projetos novos e
   existentes, preservando dados humanos e sem conteúdo privado. As receitas
   foram executadas no macOS com pacote local, preservando o índice, as
   configurações Git e o conteúdo humano observados; o kit acrescentou um
   bloco ao `AGENTS.md`. Windows e material visual ainda não foram verificados.
8. [ ] **Entrega:** revisar arquivos e índice, dados sensíveis, testes,
   documentação e pacote publicado. Depois criar commit com identidade do
   usuário e enviar as alterações autorizadas; verificar o resultado remoto.
9. [-] **Compatibilidade e execução:** validar versões publicadas em projetos
   existentes e executar cada skill e agente individualmente. Uma matriz de
   1.000 projetos sintéticos no macOS registrou 792 aprovados nas verificações
   estruturais da CLI; os outros 208 e o resultado geral permaneceram não
   verificados. A matriz não prova a execução real de todas as skills e
   agentes; essa prova continua pendente. Em 40 projetos sintéticos Linux, o
   pacote npm `0.0.21` alterou `.git/info/exclude` durante `init`; os 40 casos
   falharam no critério estrito e pararam antes das etapas posteriores. Entre
   os caminhos comparados, esse foi o único alterado; isso não cobre todos os
   arquivos ou metadados. Os blocos acrescentados foram reconhecidos em revisão
   posterior, mas continuam sendo alterações reais. O diagnóstico estrito foi
   corrigido para não afirmar que os blocos são desconhecidos quando não foram
   inspecionados. A suíte da matriz passou com 45 testes no macOS e 44 no
   Linux; um caso foi ignorado no Linux.
   Em mais 1.000 projetos sintéticos Linux, com outras combinações de clientes,
   `init` retornou sucesso em todos, mas todos falharam na preservação estrita:
   entre os caminhos monitorados, somente `.git/info/exclude` mudou. Os casos
   pararam após `init`, sem validar update, doctor, sync ou execução das skills.
   Um lote posterior de 40 projetos usou `--diagnose-exclude` com a `0.0.21`
   em contêiner Linux sem rede. Os 40 continuaram reprovados na preservação
   estrita, mas o controlador reconheceu os bytes do bloco de exclude e
   prosseguiu: `init`, `update`, `update --force`, `doctor` e `sync --check`
   retornaram zero em todos. O mapeamento de recursos permaneceu não
   verificado nos 40; reconhecer bytes não autentica o pacote ou comprova
   ativação, metadados e ausência de mudanças transitórias. Foi preservado o
   relatório agregado, não os logs e snapshots individuais do contêiner.
   Uma variante experimental do controlador reconheceu o export de caminhos
   da `0.0.21`, condicionado a hashes de três arquivos. Em 40 projetos, marcou
   26 como verificados pelos controles instrumentados e 14 não verificados;
   todos continuaram reprovados pela alteração do exclude. Revisão posterior
   mostrou que a variante importa código antes de verificar hashes e não
   comprova metadados como `alwaysApply` e `globs`. A marcação dos 26 não
   comprova cobertura estrutural completa, escopo ou ativação. A variante
   permaneceu isolada: faltam proveniência e testes de exceções. Uma primeira
   variante esperava incorretamente o formato Gemini sem argumentos e parou em
   quatro casos; a segunda usou o formato observado para destinos novos.
   Após essa revisão, o controlador principal passou a marcar regras Cursor e
   Copilot como não verificadas quando o escopo de seus metadados não foi
   conferido. Os controles com apontamentos sintéticos passaram no macOS e
   Linux; a suíte da matriz registrou 47 aprovações no macOS e 46 no Linux,
   com um skip. Resultados anteriores classificados como verificados não
   provam esses metadados e não foram recalculados.
   Depois, a matriz passou a comparar o frontmatter gerado simples com a
   regra de origem; sidecars, fontes humanas e escopos ambíguos continuam não
   verificados. Na repetição Linux offline com a candidata local anterior,
   30 dos 40 casos ficaram verificados pelos controles e dez não verificados:
   seis por escopo Claude e quatro por metadados Cursor com sidecar. O resumo
   agregado foi preservado; logs e snapshots individuais ficaram no contêiner.
   A prova não cobre ativação nativa, todos os metadados ou mudanças transitórias.
   Uma revisão confirmou que a continuação mantém a falha original, mas o
   resumo em stdout omitia a indicação do modo diagnóstico. O resumo agora
   inclui `diagnosticExclude`; os controles de execução diagnóstica e normal
   passaram no macOS e Linux. O stdout do lote anterior não contém esse campo.
   O container operou sem rede; os arquivos extraídos do pacote coincidiram com
   o tarball observado antes e depois, sem provar ausência de mudança transitória.
   A comparação não cobre toda a árvore ou seus metadados.
   Uma primeira comparação da candidata
   ficou sem proveniência válida porque o controlador foi editado durante a
   execução; seus resultados não comprovam a comparação. A repetição com
   controlador e pacote congelados preservou índice, ignores, configuração e
   refs observados em 40 projetos Linux; documentos puderam receber blocos
   gerenciados. As cinco etapas rodaram em todos: 34 tiveram cobertura
   estrutural verificada e seis permaneceram não verificados quanto ao escopo
   nativo Claude. A candidata usada precede o ajuste posterior da skill
   `verificar-trabalho`. O update foi da candidata sobre ela mesma, não da
   `0.0.21` para a candidata; a matriz não prova o comportamento de todas as
   skills. A proveniência compara cinco arquivos antes e depois, não a árvore
   integral do pacote nem alterações transitórias.
   O controlador posterior passou a comparar também catálogo, mapa de destinos
   e política de adaptadores. Um teste alterou esses arquivos durante uma
   execução sintética e confirmou falha da proveniência. A suíte teve 49 testes
   aprovados no macOS e, no Linux, 48 aprovados e um ignorado específico do
   macOS. Essa ampliação não autentica o pacote nem observa mudanças revertidas.
   Uma repetição em Linux sem rede usou um pacote local `0.0.30` congelado e
   preservou o relatório fora do repositório. Dos 40 projetos, 34 tiveram
   cobertura estrutural verificada e seis ficaram não verificados devido ao
   escopo nativo Claude da regra Git. A preservação observada foi verificada
   nos 40; `init`, `update`, `update --force`, `doctor` e `sync --check`
   retornaram zero. O pacote atualizou a si mesmo, não a `0.0.21`; a matriz
   não executou clientes ou skills e não cobre todos os metadados ou mudanças
   transitórias. O pacote precede alterações posteriores no executor de
   infraestrutura. O primeiro ensaio com saída fora de `/tmp` foi recusado
   antes da matriz; a repetição usou uma pasta temporária permitida.
   Uma prova posterior instalou a `0.0.21` e tentou atualizar uma fixture
   Claude com a candidata local `0.0.30`, sem rede no Linux. A atualização
   recusou oito conflitos de regras e não alterou tipos, modos ou hashes dos
   caminhos observados, inclusive Git. Na instalação anterior, o exclude foi
   criado e um agente humano recebeu bloco gerenciado; uma repetição confirmou
   que seu texto original foi mantido como prefixo. A recusa não comprova
   atualização bem-sucedida, outros projetos nem ausência de efeitos transitórios.
   Em outra fixture preparada com novo init da `0.0.21`, tanto `update` quanto
   `update --force` recusaram os mesmos conflitos; tipo, modo e hashes da árvore
   examinada, Git e bytes do agente humano ficaram iguais após cada tentativa.
   Não foram comparadas ACLs ou atributos estendidos.
   A saída humana da CLI passou a listar até cinco conflitos mesmo quando o
   plano está vazio. Os controles de formatação e o preview de conflito Claude
   passaram no macOS e Linux; a lista completa continua disponível em JSON.
   Uma análise de outra fixture confirmou que os oito wrappers correspondiam
   aos hashes de `state.files` da `0.0.21` e não estavam no índice Git. Sete
   declaravam `always_on`; cinco de suas fontes eram idênticas às da candidata
   e duas diferiam. A regra Git declarava `model_decision` e sua fonte também
   diferia. A candidata preservou os wrappers e bloqueou o plano; preservar
   apenas os wrappers não garante que uma atualização das fontes mantenha o
   comportamento. O hash histórico não comprova inode, ACL ou autorização
   atual, e a ativação real no cliente não foi observada.
   Uma alternativa experimental preservou os oito wrappers, fontes e hashes
   durante `update`, com aviso de escopo não verificado, mas não foi integrada.
   Na fixture, o template gitignore referenciado por qualidade e a skill
   `proximos-passos` referenciada pela regra homônima mudaram de hash; não há
   prova de comportamento transitivo equivalente. O sync direto recusou a regra
   Git; a explicação identificada por leitura de código não foi instrumentada.
   Não houve controles com wrapper staged ou editado nem fonte humana editada.
   A inspeção posterior encontrou dois recursos alterados a dois níveis da
   regra de segurança. Links não permitem enumerar com segurança referências
   em prosa, caminhos variáveis ou dependências externas; a recusa permanece
   até existir uma fronteira de compatibilidade comprovada.
   Em fixtures macOS separadas para Codex e Copilot, `init` da `0.0.21` e
   `update` da candidata extraída `0.0.30` retornaram sucesso, com alterações
   no update e sem conflitos. Os sete arquivos humanos observados, índice,
   configuração, exclude e diffs ficaram iguais durante cada update. O init
   anterior alterou `AGENTS.md` e exclude; os bytes humanos iniciais de
   `AGENTS.md` foram mantidos como prefixo. O update alterou 491 caminhos na
   fixture Codex e 318 na Copilot, sem inspeção individual de todos eles.
   A prova não cobre instalação npm, ativação nativa, metadados completos ou
   estabilidade integral do checkout durante o empacotamento da candidata.
   A suíte direcionada de escopo e legado passou 18 testes no macOS, incluindo
   preservação de referência sem ownership e bloqueio de conteúdo staged.
   Ela não reproduz, por si só, a atualização real entre essas versões.
   No router com `0.0.21`, o sync direto `--check` retornou zero e informou
   nenhuma alteração ou conflito em uma execução macOS com escrita e rede
   bloqueadas. O índice, `.gitignore`, exclude e configuração Git mantiveram
   seus hashes. Esse check não comprova ativação de regras nem todos os fluxos.
   O `doctor` do pacote publicado também retornou sucesso sem issues no router,
   com rede e escrita no projeto bloqueadas e estágio temporário autorizado;
   os mesmos arquivos Git mantiveram os hashes. Uma tentativa anterior falhou
   ao criar o estágio por causa do caminho permitido no sandbox e foi repetida
   com o diretório canônico. O resultado não comprova as operações mutáveis.
   `next` da mesma versão também retornou sucesso e indicou preparação inicial
   no router, com escrita e rede bloqueadas; os quatro arquivos Git observados
   mantiveram seus hashes. A recomendação não comprova conclusão do projeto.
   Uma consulta Git sem escrita confirmou padrões de ignore para seis caminhos
   sintéticos no router, incluindo três variações de caixa de `.playwright-mcp`;
   os mesmos quatro hashes permaneceram iguais. Como usou `--no-index`, a
   consulta não comprova se os caminhos são rastreados nem se deixariam de ser
   enviados ao Git; também não cobre todas as variações.
   Outra consulta cobriu as 8.192 combinações de caixa de `.playwright-mcp`
   com um sufixo fixo; todas encontraram padrão de ignore. A revisão independente
   confirmou as tuplas Git e os hashes observados. Os limites de `--no-index`,
   outros nomes e caminhos continuam aplicáveis.
   Outra consulta listou o índice e não encontrou entradas correspondentes às
   famílias de artefatos Playwright e resultados de teste verificadas. Isso
   não examina o histórico nem todos os nomes possíveis.
   Em provas nativas controladas,
   houve extrapolação do alcance de uma busca e afirmações de arquitetura e
   documentação sem comprovação; o comportamento ainda não é consistente.
   Em seis sessões controladas do Copilot CLI, a fonte do perfil foi lida em
   uma de três com link Markdown e em uma de três com `@`; nenhuma comprovou
   expansão automática. A amostra não comprova causalidade ou consistência.
   Em uma sessão do perfil de performance, o cliente distinguiu contagem de
   operações de benchmark; o teste das contagens foi executado pelo controlador,
   não pelo agente, e não demonstra desempenho em produção.
   Em uma sessão com a skill `avaliar-performance` da `0.0.21`, o cliente
   também distinguiu as contagens de uma medição isolada de latência; o
   controlador executou o teste separadamente. Não houve benchmark nem validação
   em produção. A instalação anterior alterou o `exclude` local da fixture.
   Em um projeto Express fixado por commit, a versão publicada `0.0.21`
   alterou as exclusões locais do Git no macOS. A candidata local preservou os
   arquivos observados nesse sistema. A suíte do Express passou antes e depois
   com 1.290 testes em cada cópia, em Linux ARM64 sem rede na execução, usando
   as mesmas dependências resolvidas sem lockfile.
   Uma candidata local também passou nas verificações de instalação em commits
   fixos do Zod e do Tailcat, no macOS ARM64, preservando o conteúdo humano e as
   configurações Git verificados. Nas cópias sem e com o kit, a execução
   padrão do Vitest no Zod passou: 8.426 testes em 596 execuções de arquivos,
   em Linux ARM64 sem rede durante build e testes. A instalação das
   dependências usou rede e ignorou scripts de instalação.
   A aplicação Tailcat não foi executada nessa prova.
   Em sessões isoladas, os perfis planejador e arquiteto foram lidos pelo
   cliente; os resultados não demonstram consistência entre sessões nem execução
   completa de todas as tarefas desses perfis.
   O `arquiteto` da `0.0.21` leu requisito e módulo sintéticos, invocou
   `avaliar-arquitetura` e delimitou a ausência de persistência ao módulo. Um
   controlador independente confirmou o caso em dois processos após a sessão.
   Em aplicação manual posterior da skill, dois testes confirmaram leitura no
   processo que gravou e ausência do valor em processo novo. A necessidade de
   persistência permanece decisão em aberto; a prova não cobre sistema real,
   falha de disco, cliente nativo ou revisão independente. Os arquivos e Git
   observados ficaram iguais após o init, que havia alterado o exclude.
   O `especialista-frontend` identificou, por leitura, um campo sem `required`;
   o controle foi estático e não executou navegador. Em ambas as consultas,
   árvore e Git observados ficaram iguais após o init ter alterado o exclude.
   Em outra consulta ao `planejador` da `0.0.21`, o cliente identificou a
   divergência de um cálculo, separou dúvidas e provas propostas e não afirmou
   ter testado. Árvore e Git observados ficaram iguais durante a consulta; o
   init anterior acrescentou um bloco ao exclude da fixture. Buscas ocorreram,
   mas seus argumentos e resultados não foram registrados pelo controlador.
   Em aplicação manual posterior, o `planejador` consultou `next`, registrou
   tarefas e deixou a decisão sobre entradas negativas em aberto. Um teste
   existente foi executado separadamente pelo controlador e passou; ele não
   cobre essa decisão. Árvore e Git observados permaneceram iguais após o init,
   que havia alterado o exclude. Não houve ativação nativa ou revisão
   independente.
   Em uma consulta ao agente `analista-performance` da `0.0.21`, o cliente leu
   a fonte e a skill de performance, explicou o custo sob hipóteses e informou
   que não executou benchmark. Árvore e Git observados ficaram iguais durante a
   consulta, após o init ter acrescentado um bloco ao exclude da fixture. O
   controlador não observou o wrapper no fluxo de eventos; sua ativação não foi
   comprovada nem refutada por essa sessão.
   Em aplicação manual posterior, duas implementações sintéticas de soma
   produziram resultados iguais na entrada examinada; sete rodadas alternadas
   foram medidas em um processo e um teste separado passou. Nenhuma meta foi
   fornecida. Os arquivos e o Git comparados permaneceram iguais após o init,
   que anteriormente alterou o exclude. A prova não cobre cliente nativo,
   CPU, memória, revisão independente ou desempenho em produção.
   Em outra consulta, o agente `especialista-backend` da `0.0.21` identificou
   um cálculo divergente do contrato e informou que não executou testes. O
   cliente leu a fonte e invocou `revisar-codigo`; não foi observada invocação
   de `implementar-backend`. Árvore e Git observados ficaram iguais durante a
   sessão, após o init ter acrescentado um bloco ao exclude da fixture.
   Em aplicação manual posterior, o especialista corrigiu uma comparação em
   módulo sintético: dois testes falhavam antes e os três passaram depois.
   O diff unstaged do código mudou intencionalmente; comentário humano,
   índice, configuração, exclude e diff staged permaneceram iguais. A spec e
   o plano eram fictícios; não houve cliente nativo, API real ou revisão
   independente. O init anterior havia alterado o exclude.
   Em consultas separadas aos agentes `revisor` e `documentador` da `0.0.21`,
   os clientes identificaram divergências sintéticas e informaram não executar
   testes; o controlador conferiu exemplos depois das sessões. Árvores e Git
   observados ficaram iguais durante as consultas, após os inits alterarem os
   excludes das fixtures. A ativação dos wrappers não foi comprovada.
   Em aplicação manual posterior do `revisor`, um diff staged sintético com
   erro aritmético foi identificado e um teste real registrou uma aprovação e
   uma falha. A alteração não foi aprovada. Índice, HEAD, configuração,
   exclude, diffs e árvore observados permaneceram iguais durante a revisão;
   o init anterior havia alterado o exclude. A prova não usou cliente nativo
   nem revisão independente e não comprova funcionamento em projeto real.
   Em aplicação manual posterior do `documentador`, o manifesto foi consultado
   e seu teste sintético passou com Node; o README recebeu o comando observado
   sem perder bytes anteriores, e a repetição não duplicou a seção. Índice,
   configuração, exclude, diffs e arquivos comparados ficaram iguais após o
   init, que anteriormente havia alterado o exclude. A prova não executou
   `npm test`, cliente nativo ou revisão independente.
   Em uma consulta ao `engenheiro-qa` da `0.0.21`, o cliente leu a fonte e
   invocou `planejar-qa`; identificou divergências no cálculo e declarou que
   não executou testes. O controlador confirmou quatro exemplos após a sessão.
   Árvore e Git observados ficaram iguais durante a consulta; o init anterior
   acrescentou um bloco ao exclude da fixture. O wrapper não foi observado nos
   eventos, o que não prova que tenha deixado de ser carregado.
   Em aplicação manual separada, cinco testes para dois critérios sintéticos
   passaram com Git e Node em sandbox macOS sem rede; o código de teste staged,
   índice e arquivos observados foram preservados. A primeira tentativa passou
   os testes, mas o controlador rejeitou o formato de saída; a repetição usou
   TAP explícito em outra fixture. Não houve instalação ou ativação nativa, nem
   prova de integração ou de todas as entradas possíveis.
   Em outra aplicação manual do `engenheiro-qa`, quatro testes de uma fila
   sintética passaram: ordem, fila vazia, preservação da entrada e rejeição de
   item vazio. Código e testes estavam staged e permaneceram iguais, assim
   como Git e arquivos observados após o init; o init havia alterado o exclude.
   Persistência, concorrência, integração e revisão independente não foram
   comprovadas.
   Em uma sessão de leitura com `gerenciar-roadmap` da `0.0.21`, o cliente
   reconheceu o rascunho e o bloqueio por ausência de PRD. Uma tentativa de
   executar `git status` foi negada; o controlador conferiu o índice e os
   arquivos observados. A sessão não prova o fluxo completo da skill.
   Em aplicação manual posterior, um roadmap sintético registrou design em
   revisão sem presumir aprovação. Sync e check da API retornaram zero com
   ignores locais e entrypoints desativados; índice, config, diffs e arquivos
   humanos comparados permaneceram iguais. A primeira tentativa não registrou
   o campo de uma falha de comparação; outra comparou objetos por identidade.
   A fixture final corrigiu o controlador. Não houve instalação, cliente
   nativo ou prova dos padrões da CLI e de todos os metadados.
   Em uma sessão com `criar-recurso` da `0.0.21`, o modelo solicitado foi
   criado sem frontmatter e rejeitado pelo catálogo na verificação posterior
   do controlador. O índice e os arquivos humanos observados foram preservados.
   A candidata passou a exigir explicitamente frontmatter e H1 para modelos.
   Em uma sessão nativa posterior, o modelo produzido incluiu ambos e o catálogo
   aceitou a entrada no controle separado; Git e arquivos humanos observados
   permaneceram iguais. A instalação de um pacote local em fixture Git incluiu
   a orientação e passou no `sync --check`. Uma fixture sem Git retornou aviso
   e código 1 no check. Uma sessão não comprova consistência entre clientes.
   Em prova manual offline separada da `0.0.21`, um modelo sintético com
   frontmatter foi reconhecido pelo catálogo e passou em sync e check; Git e
   arquivos humanos observados ficaram iguais. O controlador executou o fluxo;
   essa prova não é uma sessão nativa nem invalida a falha anterior.
   Em uma sessão de `criar-design-doc` da `0.0.21`, o cliente leu a skill e o
   PRD em rascunho, informou o bloqueio e não criou o documento. A tentativa
   de usar Git foi negada; o controlador verificou índice e árvore observada.
   A sessão não comprova o fluxo completo nem a consistência entre sessões.
   Em aplicação manual posterior, um design sintético foi criado em rascunho
   com PRD e UX ficticiamente aprovados; decisões e aprovação do design ficaram
   pendentes. Sync e check da API passaram e os arquivos e Git comparados foram
   preservados. Referências oficiais não foram consultadas por falta de rede;
   não houve cliente nativo ou comprovação do fluxo completo.
   Em uma sessão de `criar-spec` da `0.0.21`, o cliente leu um PRD em rascunho
   e mesmo assim criou a spec, incluindo decisões sem suporte no PRD sintético.
   O índice e os demais caminhos observados ficaram iguais durante a sessão.
   Uma revisão intermediária da candidata não criou a spec em outra sessão.
   Após reforço explícito da preparação e do bloqueio, uma sessão separada leu
   a orientação, mas criou a spec e incluiu decisões não comprovadas. O índice
   e os arquivos humanos observados ficaram iguais; a árvore fora do destino
   não foi comparada integralmente. O bloqueio continua sem garantia.
   O verificador ganhou `--preparacao`, para consultar esse indicador sem exigir
   configuração técnica antecipada. O resultado positivo ainda exige revisão
   das evidências e não impede escrita por quem o ignorar. A suíte do script e
   seletor passou com 30 testes em macOS e 30 no Linux; em pacote local, uma
   fixture com preparação concluída e configuração pendente passou no modo de
   preparação e foi bloqueada no modo de implementação. Índice e arquivo humano
   observados foram preservados.
   Em sessões nativas com a candidata, a fixture sem estado permaneceu intacta
   quando o shell foi negado; na fixture com preparação concluída e tecnologia
   pendente, o cliente criou a spec antes de consultar o estado ou executar o
   verificador. Não houve leitura observada de UX ou design. O controle encontrou
   links quebrados e um comando não comprovado na spec. O script consultivo não
   constitui barreira de escrita e a ordem ainda não está garantida.
   A instrução da skill não impede escrita por si só. Hooks variam por cliente;
   no [Copilot CLI](https://docs.github.com/en/copilot/reference/hooks-reference),
   por exemplo, um timeout no hook permite que a chamada siga ao fluxo normal
   de permissões. Isolamento e aplicação controlada exigem projeto e prova
   próprios; não há bloqueio universal implementado.
   Em uma sessão de `criar-prd` da `0.0.21`, o cliente leu o PRD existente,
   buscou o estado ausente, invocou `configurar-projeto` e não criou outro PRD.
   O controlador confirmou índice, alterações e árvore observados inalterados.
   A resposta listou lacunas, mas não formulou pergunta nem nomeou a skill de
   configuração. A prova cobre apenas esse bloqueio em uma sessão macOS.
   Em uma sessão de `criar-ux-ui` da `0.0.21`, o cliente leu a skill e um PRD
   em rascunho e não criou UX sem estado de configuração. Indicou `criar-prd`,
   mas não consultou essa skill nem identificou a preparação como primeira
   etapa. Índice, alterações e árvore observados ficaram iguais na sessão,
   após o init ter alterado o exclude. A prova cobre uma sessão com shell e
   URLs negados, não a consistência ou o fluxo completo.
   Em aplicação manual posterior, um PRD e sua aprovação fictícios orientaram
   a criação de UX sintética em rascunho, com aprovação pendente. O sync e o
   check da API passaram com opções explícitas; índice, config, diffs e arquivos
   humanos comparados ficaram iguais. Não houve cliente nativo, interface,
   validação com usuários ou prova dos padrões da CLI.
   Na candidata, as skills de UX e design passaram a exigir preparação
   concluída e comprovada antes das etapas de produto e a preservar aprovações
   sem mudança material. Uma revisão independente conferiu a redação. Um
   pacote local instalou as duas fontes e passou em `sync --check` numa fixture
   com índice, `.gitignore` e arquivo humano observados preservados. As suítes
   de recursos e próximos passos passaram com 50 testes no macOS e 50 no Linux;
   elas não comprovam o comportamento das novas instruções em cliente nativo.
   Em duas avaliações independentes por subagentes, numa fixture sintética com
   estado de preparação ausente e PRD em rascunho, UX e design indicaram primeiro
   verificar a preparação e relataram não executar scripts. O controle registrou
   igualdade de caminhos e modos de 796 entradas e do conteúdo dos arquivos
   regulares, inclusive o índice Git. Não houve imposição de leitura pelo SO;
   o controle não comparou destinos de links simbólicos, timestamps ou metadados
   estendidos, nem armazenou um snapshot final independente.
   As avaliações não comprovam descoberta por clientes nativos nem consistência
   em outras sessões ou estados de projeto.
   Uma tentativa de `preparar-dev` da `0.0.21` leu a skill e documentos da
   fixture, mas expirou sem resposta final; uma chamada de shell foi negada.
   Índice e árvore observados ficaram iguais. O teste executado antes pelo
   controlador não foi apresentado ao cliente; a prova funcional segue pendente.
   Em consulta separada à fonte `preparar-dev` da `0.0.21`, um subagente
   identificou o runtime declarado e propôs o teste existente sem executá-lo.
   Os arquivos e modos observados permaneceram iguais, inclusive índice e
   alterações humanas. A leitura da fixture usou sandbox; o subagente e o
   controlador não estavam integralmente confinados. A fonte foi conferida ao
   tarball, mas não houve instalação ou cliente nativo nessa consulta.
   Em aplicação manual posterior, inventário, diagnóstico e teste de biblioteca
   sintética passaram sem alterar os arquivos Git e humanos comparados após a
   instalação; o init anterior alterou o exclude. Setup, downloads e Docker
   não foram testados. O PATH restrito não demonstra ausência de ferramentas;
   a primeira tentativa falhou por parsing do controlador e foi repetida.
   Na candidata, `gerenciar-roadmap` passou a pedir sync somente após mudança de
   recurso agêntico. Em fixture, um subagente atualizou um marcador de roadmap e
   relatou não sincronizar; dos 798 caminhos e modos observados, apenas o
   conteúdo do roadmap mudou. O SO não impôs isolamento ao subagente, e não se
   compararam timestamps, atributos estendidos ou destinos de links. A primeira
   avaliação usou Python pontualmente, contrariando a preferência de Node; foi
   repetida com Node após restaurar a fixture. Revisão independente posterior
   comparou o resultado com o texto inicial reconstruído e validado por hash;
   confirmou somente a mudança do marcador, sem comprovar o inventário ou o
   isolamento da sessão. Um pacote local instalou a skill e passou
   em `sync --check`; a suíte de recursos passou com 17 testes em cada sistema,
   macOS e Linux. Isso não comprova descoberta em clientes nativos.
   Em outra consulta à fonte `criar-skill` da `0.0.21`, um subagente identificou
   uma skill humana existente e recomendou reutilizá-la, sem criar outra. Os
   caminhos, arquivos e modos observados ficaram iguais. A leitura da fixture
   usou sandbox, mas subagente e controlador não estavam integralmente
   confinados; não houve instalação do pacote ou prova de descoberta nativa.
   Em aplicação manual posterior, uma skill sintética foi catalogada e gerou
   dois apontamentos; o check passou e o catálogo externo foi apenas listado,
   sem download. Os arquivos Git e humanos comparados permaneceram iguais após
   a criação. O init anterior alterou `AGENTS.md` e o exclude, preservando o
   prefixo humano. Não houve cliente nativo ou prova dos defaults do sync.
   Em consulta separada a `criar-agente` da `0.0.21`, um subagente recomendou
   preservar um perfil humano e esclarecer requisitos. Os 45 caminhos e modos
   observados, índice e arquivos comparados permaneceram iguais. A leitura usou
   sandbox; subagente e controlador não estavam integralmente confinados. Não
   houve instalação, criação de perfil, sync ou cliente nativo nessa consulta.
   Em aplicação manual posterior, um perfil e metadados sintéticos foram
   catalogados e geraram dois apontamentos Antigravity e Gemini; o check passou
   e os arquivos Git e humanos comparados ficaram iguais após a criação. O init
   anterior alterou o exclude. Os YAMLs não comprovam descoberta nativa ou
   aplicação efetiva de permissões; o sync usou opções explícitas.
   Uma tentativa separada de `criar-agente` também expirou após ler a skill,
   sem resposta final ou perfil criado. Índice e árvore observados ficaram
   iguais; esse timeout não comprova falha funcional nem conclui a validação.
   Uma tentativa de `git-commit` sem rede e sem credenciais pessoais terminou
   antes da invocação da skill por falta de autenticação. Um commit sintético
   executado separadamente pelo controlador não comprova a atuação da skill;
   a prova nativa continua pendente.
   Em prova posterior, um subagente seguiu a fonte `git-commit` da `0.0.21`
   e criou commit em fixture offline sem remoto e com identidade fictícia.
   O blob correspondeu ao staged; alteração unstaged, arquivo não rastreado e
   arquivos Git observados foram preservados. HEAD e índice mudaram pelo commit.
   Não houve cliente nativo, push ou prova de assinatura e identidade real.
   Na aplicação manual de `git-pull` da `0.0.21`, a branch de uma fixture
   avançou por fast-forward a partir de remoto local em sandbox sem rede. Blob e
   diff staged, diff unstaged, arquivo não rastreado, `.gitignore`, configuração
   Git e exclude observados foram preservados; HEAD e bytes do índice mudaram.
   A URL do remoto foi conferida; a
   restrição ao protocolo `file` não limita sozinha o caminho acessível. Não
   houve pacote instalado, cliente nativo ou prova de conflitos, merge,
   assinatura e todos os metadados.
   Em aplicação manual de `git-push` da `0.0.21`, uma fixture sem rede usou
   identidade e remoto local sintéticos. Após um push de preparação, um push
   normal sem force atualizou o remoto ao HEAD esperado. HEAD local, índice,
   conteúdo staged e unstaged e arquivos Git e humanos observados permaneceram
   iguais. A URL local foi conferida; foram usadas fontes extraídas, sem
   instalação ou cliente nativo. Não prova autenticação, proteção de branch,
   divergência, assinatura, metadados gerais ou efeitos transitórios.
   Em consulta à fonte `git-merge` da `0.0.21`, um subagente não executou merge
   diante da restrição da fixture e indicou verificações Git pendentes. Os 63
   caminhos e modos observados, índice e arquivos comparados ficaram iguais. O
   controlador preparou branches e commits sintéticos antes do snapshot; a
   leitura usou sandbox, mas o subagente e o controlador não estavam totalmente
   confinados. Não houve pacote instalado ou cliente nativo nessa consulta.
   Em aplicação manual posterior, um fast-forward local sintético integrou a
   branch esperada e o teste passou antes e depois. Diffs staged e unstaged e
   arquivos humanos comparados permaneceram iguais; os bytes do índice mudaram
   para refletir o novo commit. Git e Node executaram em sandbox macOS sem
   rede, mas o controlador da fixture não. Não houve instalação ou ativação
   nativa, nem prova de conflito, assinaturas ou outros metadados.
   Na consulta à fonte `modelar-ameacas` da `0.0.21`, um subagente identificou
   ativos, fronteiras e verificações prioritárias em documentação sintética,
   sem presumir controles implementados ou falhas confirmadas. As 44 entradas
   e os arquivos Git observados permaneceram iguais. A leitura foi confinada;
   controlador e subagente não estavam integralmente confinados. Não houve
   cliente nativo, pacote instalado, auditor ou fluxo completo nessa prova.
   Uma aplicação manual posterior produziu modelo para uma biblioteca
   sintética e executou quatro testes benignos; índice, config e arquivos
   comparados permaneceram iguais. Não houve cliente nativo, auditor independente
   ou comprovação de segurança geral e de integrações desconhecidas.
   Em consulta separada ao perfil `auditor-seguranca`, um subagente examinou
   função sintética sem contexto e distinguiu comportamento observado de uma
   vulnerabilidade não comprovada. As 43 entradas e arquivos Git observados
   permaneceram iguais. A leitura foi confinada, mas não o controlador e o
   subagente; não houve execução, scanner, pacote instalado ou ativação nativa.
   Uma sessão nativa Copilot invocou `revisar-autorizacao` da `0.0.21`
   instalada e examinou um arquivo de acesso sintético. Indicou como não
   verificados servidor, identidade e autorização. O projeto e o índice
   observados permaneceram iguais; a sessão foi estática, com shell e escrita
   desabilitados, rede de inferência e autenticação permitida e subprocessos
   não auditados. Não prova o comportamento da API ou a criação de relatório.
   Outra sessão nativa Copilot invocou `revisar-seguranca` da `0.0.21`
   instalada e leu a skill, regras e código sintético. Não apontou achado no
   trecho e registrou ausência de scanners, testes e diff. Árvore, índice e
   alterações staged e unstaged observados ficaram iguais. Shell, escrita e URL
   foram negados, mas houve delegação cujos eventos internos não foram auditados;
   a rede de inferência e autenticação foi permitida. Sem servidor, varredura
   dinâmica ou relatório salvo, a prova não comprova segurança de uma aplicação.
   Em aplicação manual de `corrigir-vulnerabilidade` da `0.0.21`, uma fixture
   sintética restringiu os campos registrados: o teste preparado pelo
   controlador falhou antes e passou após a correção. Arquivos humanos e Git
   observados permaneceram iguais. Foram usadas fontes extraídas, sem instalar
   o pacote; não houve cliente nativo, scanner ou revisão independente da
   correção. O fluxo integral e a segurança geral não estão comprovados.
   Uma consulta ao perfil `implementador` e à skill `implementar-spec` da
   `0.0.21` indicou não iniciar código diante de preparação pendente, spec em
   rascunho e plano informado como ausente. As 51 entradas e os arquivos Git
   observados permaneceram iguais. A leitura foi confinada, mas o subagente e o
   controlador não; não houve cliente nativo, pacote instalado, implementação
   ou inventário independente do plano na fixture.
   Uma sessão nativa Copilot com o perfil `validador` da `0.0.21` leu critérios,
   teste e evidência sintética; marcou um critério como aprovado e outro como
   não verificado. O teste foi executado previamente pelo controlador em outra
   fixture, cujo código e teste coincidem em hash com os da sessão. Árvore e
   índice observados não mudaram. Shell, escrita e URL estavam desabilitados;
   autenticação e rede de inferência estavam disponíveis, sem auditoria dos
   subprocessos. A sessão não comprova execução própria ou validação integral.
   Em aplicação manual de `preparar-ferramentas` da `0.0.21` instalada numa
   fixture offline, ajuda e `info opensrc` retornaram zero; `check opensrc`
   retornou falha porque a ferramenta estava ausente. As consultas não criaram
   a pasta local do `opensrc` e preservaram árvore, índice e alterações staged e
   unstaged observados. O teste não cobre setup, instalação, update, run ou descoberta
   por cliente nativo; a instalação do pacote ocorreu antes do snapshot.
   Um subagente consultou `sincronizar-agentes` da `0.0.21` e propôs verificar
   a colisão antes de usar `--force`, sem executar o sync. Em cópia separada da
   fixture, o controlador executou check e sync direto com Node 24: o check
   retornou divergência e `--force` recusou índice divergente. Índice, ignores,
   configuração e arquivos humanos comparados ficaram iguais após ambos os
   comandos. Uma primeira tentativa não alcançou o sync por Node incompatível;
   outra foi bloqueada pelo sandbox ao acessar `/dev/null`. A prova não é uma
   sessão nativa nem cobre todos os arquivos, metadados ou outros conflitos.
   Em uma sessão nativa anterior e separada da mesma skill, o cliente executou
   check, sync sem `--force` e novo check; o índice e arquivos humanos observados
   permaneceram iguais, mas o sync alterou `.git/info/exclude`. A instalação
   dessa fixture ocorreu antes da criação do Git; a prova cobre apenas uma
   sessão macOS e não detecta mudanças transitórias revertidas.
   Em uma consulta de `proximos-passos` da `0.0.21`, o cliente indicou preparar
   o projeto antes de retomar o PRD em rascunho. Não executou a CLI; um
   controle separado recomendou `preparar-dev` para ambiente existente, sem
   que essa diferença, isoladamente, comprove erro. Índice e árvore observados
   permaneceram iguais durante a sessão, após o init ter alterado o exclude.
   Em aplicação manual posterior numa biblioteca Node sintética, `next --json`
   recomendou `preparar-dev` e o teste do projeto passou. A consulta preservou
   os arquivos Git e humanos comparados; o init anterior preservou o índice e
   o `.gitignore`, mas alterou o exclude. Não houve cliente nativo ou prova de
   outros estados de projeto.
   Na candidata, a skill passou a pedir um próximo passo concreto sem
   antecipar perguntas de produto. Em outra sessão com o mesmo PRD e pedido,
   o cliente indicou concluir e registrar a configuração, sem alterar a árvore
   observada. Não formulou pergunta nem nomeou a skill; o shell estava negado.
   Um pacote local com a alteração instalou e passou em `sync --check` numa
   fixture Git. As sessões não provam comportamento consistente ou causalidade.
   A CLI `next` agora orienta conferir evidências de aprovação também nas
   etapas de produto do fluxo padrão e `run`; a seleção da etapa não mudou.
   A suíte de próximos passos passou com 34 testes no macOS e 34 no Linux. Um
   pacote local confirmou a orientação em três idiomas e intenções numa fixture,
   preservando índice, `.gitignore` e arquivo humano comparados. Isso não torna
   a recomendação uma aprovação nem comprova o comportamento de clientes nativos.
   Em outra sessão, `implementar-backend` da `0.0.21` alterou uma linha com
   edição unstaged para atender a um pedido pontual e preservou o índice e o
   comentário humano observados. O cliente informou que não pôde consultar o
   Git nem testar; o controlador verificou dois exemplos separadamente. Como
   o pedido não mencionava spec, essa sessão não comprova o gate de spec.
   Em uma sessão de `atualizar-documentacao` da `0.0.21`, o cliente preservou
   o texto existente e acrescentou o comando de teste presente no projeto.
   O controlador executou esse teste antes da sessão; o cliente não recebeu a
   prova e não executou comandos. Índice e demais caminhos observados ficaram
   iguais durante a sessão, após o init ter alterado o exclude da fixture.
   Em outra sessão de `implementar-backend`, o pedido vinculava a tarefa a uma
   spec em rascunho. O
   cliente leu a spec e a skill da `0.0.21`, mas alterou o arquivo mesmo sem
   aprovação de spec ou plano observada. Preservou o índice e o comentário
   humano observados; a linha com edição unstaged mudou. O cliente informou que
   não pôde consultar Git nem testar. Uma sessão não comprova determinismo.
   Em uma sessão de `implementar-backend` com a candidata e o mesmo pedido,
   spec e conteúdo inicial, o cliente reconheceu o bloqueio e não alterou a
   árvore ou índice observados. Os históricos e kits das fixtures diferiam;
   a sessão não prova causalidade nem consistência. A consulta por shell foi
   negada.
   Em uma sessão separada, `implementar-spec` da `0.0.21` também alterou uma
   linha com edição unstaged após ler uma spec em rascunho, sem aprovação ou
   configuração comprovada. O índice e comentário humano permaneceram iguais,
   mas o diff unstaged mudou; a prova não cobre consistência entre sessões.
   Em uma sessão com a candidata e os mesmos dados principais, o cliente leu a
   skill e a spec, indicou `configurar-projeto` e não alterou o projeto. A prova
   cobre uma sessão com shell negado, não um bloqueio técnico universal.
   Em uma consulta a `implementar-frontend` da `0.0.21`, o cliente leu a spec
   e o HTML, recomendou provas de teclado e telas e informou que não executou
   testes ou navegador. Git e árvore observados ficaram iguais na consulta;
   a instalação anterior acrescentou um bloco ao exclude da fixture.
   Em uma sessão de leitura com a skill `revisar-codigo` publicada na `0.0.21`,
   o cliente identificou divergência em um cálculo sintético; o controlador
   executou o teste separadamente. A instalação anterior alterou o `exclude`
   local da fixture, enquanto a sessão preservou a árvore observada.
   Em outra sessão com a candidata local, `validar-adversarial` identificou que
   uma implementação sintética aceitava valores negativos. O cliente informou
   que não executou testes; o controlador confirmou o caso isoladamente no
   Linux. São provas de uma sessão por skill, não de seus fluxos completos.
   Uma sessão da mesma skill na `0.0.21` também identificou uma entrada
   negativa sem a exceção exigida; o controlador executou o caso em separado.
   A árvore e o índice observados ficaram iguais durante a sessão, após uma
   instalação que alterou o exclude da fixture.
   Em aplicação manual separada da `0.0.21`, uma suíte sintética identificou
   rejeição indevida de zero: três casos passaram e um falhou como esperado
   pela hipótese investigada. Git e Node rodaram em sandbox macOS sem rede;
   índice, configuração e alterações observadas permaneceram iguais. Não houve
   instalação, cliente nativo, revisão independente ou prova de integração.
   Em outra consulta, `usar-skills-externas` da `0.0.21` leu a skill e o
   catálogo, orientando sobre origem, licença e revisão fixada. A consulta
   preservou a árvore e o índice observados, mas não instalou skills externas.
   A instalação anterior também acrescentou um bloco ao exclude da fixture.
   Em uma sessão de `verificar-trabalho` da `0.0.21`, o cliente informou que
   não executou testes, mas marcou um critério funcional como cumprido por
   inspeção estática. O controlador confirmou exemplos apenas após a sessão;
   o cliente não recebeu essa prova. Uma versão candidata que proibia trocar
   teste exigido por inspeção também recebeu essa classificação, inclusive
   após leitura explícita. A fixture não definia um teste como exigido, então
   a contradição com essa orientação não foi comprovada. A orientação agora
   exige execução para aprovar critério comportamental. Em outra sessão com
   leitura explícita, o cliente marcou como não verificado o critério cujo
   teste não pôde executar. Uma sessão não comprova descoberta ou consistência.
   Uma consulta isolada à skill `git-fetch` na `0.0.21` não passou da
   autenticação; a skill não foi invocada e fetch não estava autorizado na
   sessão. Em outra sessão consultiva autenticada, o cliente invocou a skill e
   leu sua fonte; shell e fetch permaneceram desabilitados. A árvore e o Git
   observados não mudaram durante a consulta, que não valida um fetch real.
   Em aplicação manual da skill extraída do pacote, um fetch de remoto bare
   sintético avançou a referência esperada e preservou índice, árvore, HEAD,
   configuração e alterações observadas. O Git executou em sandbox macOS com
   rede negada e protocolo local; não houve instalação ou cliente nativo. O
   resumo foi sanitizado e não existe cópia bruta separada dos avisos; efeitos
   transitórios e metadados completos não foram comprovados.
   Uma sessão com `criar-regra` da `0.0.21` criou uma regra sintética e manteve
   a árvore fora do destino e o Git observados. Numa cópia separada, o
   controlador executou o sync da `0.0.21`: uma regra com `trigger: manual`
   gerou instrução Copilot com `applyTo: '**'`. Isso solicita escopo global;
   a ativação real no editor não foi verificada. O agente não executou o sync.
   Na candidata local, o controlador sincronizou a mesma regra sem gerar essa
   instrução global; a referência explícita manteve `trigger: manual` e o check
   final passou com avisos de visibilidade. A ativação nativa segue sem prova.
   No router, a regra Git declara `model_decision`, mas a instrução Copilot
   instalada declara `applyTo: '**'`. O arquivo foi mantido enquanto a origem e
   uma migração segura são verificadas; sua ativação efetiva não foi observada.
   Em fixture sintética, a `0.0.21` recriou o apontamento global após sua
   remoção. Com o apontamento ausente, o sync direto da candidata gerou uma
   referência explícita; o update recusou dois catálogos em conflito. Com o
   apontamento global ainda presente em outra fixture, o sync direto da
   candidata o removeu e criou uma referência explícita; o update também
   recusou os catálogos. Esses ensaios não provam a migração no router.
   Em outra matriz sintética, o sync preservou um apontamento global editado e
   também criou uma referência explícita; a ativação global não foi observada.
   Três updates recusaram catálogos. A matriz parou em uma colisão humana cujo
   arquivo recebeu um bloco adicional; o texto anterior foi observado como
   prefixo, mas não houve comparação independente dos demais bytes. O último
   update não foi executado. O código zero do controlador não indica aprovação.
   Em uma sessão com `criar-comando` da `0.0.21`, o comando criado descreveu
   apenas a linha JSON, omitindo mensagens anteriores do executor. A candidata
   passou a pedir conferência da saída completa. Em outra sessão, a saída padrão
   foi descrita, mas opções válidas antes do alvo foram proibidas; a orientação
   foi esclarecida novamente. Em uma sessão posterior, o comando descreveu as
   posições e efeitos observados sem aquela proibição, mas exigiu npm para uma
   chamada direta que não o exige. A skill passou a distinguir o seletor do
   bootstrap e do alvo. Em outra sessão, o comando distinguiu corretamente os
   pré-requisitos e as opções; o controlador executou o seletor com Node e sem
   npm no PATH. A consistência entre sessões ainda não foi demonstrada.
   A suíte do executor passou com 29 testes
   em cada sistema observado, macOS e Linux. A primeira tentativa Linux, com
   volume somente de leitura, falhou por exigir diretório temporário e foi
   repetida com tmpfs.
   Em uma sessão da skill `executar-script` da `0.0.21`, o cliente consultou
   o plano e executou um script sintético com dois argumentos literais; o
   resultado JSON estava correto e o índice e as alterações observadas foram
   preservados. A resposta resumiu a saída sem as linhas de metadados, embora
   o pedido não exigisse saída completa. Não houve bootstrap observado; a
   sessão não comprova instalação de runtime nem outros clientes.
   Uma sessão da skill `git-diff` da `0.0.21` consultou e distinguiu alterações
   staged e unstaged e um arquivo não rastreado, preservando os arquivos e o
   índice observados. A primeira instalação da fixture falhou com diagnóstico
   Git localizado; a segunda passou com locale `C`. Duas consultas bem-sucedidas
   exibiram aviso do sandbox sobre ignore global; a prova cobre uma sessão. O
   snapshot excluiu uma pasta da fixture e os eventos detalhados não foram
   arquivados para revisão independente. Em uma repetição com eventos privados
   arquivados e snapshot sem exclusão de pastas, o índice permaneceu igual
   durante a sessão, mas seu hash diferiu entre o início dos controles e o fim.
   A causa não foi comprovada; a preservação em toda a janela segue não
   verificada. Em uma fixture separada, `git diff --binary` alterou o cache de
   metadados no índice mesmo com `GIT_OPTIONAL_LOCKS=0`. Um índice temporário
   preservou os bytes do índice principal, mas uma consulta com split-index
   alterou o mtime de `sharedindex`; não se comprovou preservação integral. Os
   dois comportamentos foram reproduzidos em macOS e Linux em fixtures próprias.
   Uma sessão da skill `git-log` da `0.0.21` leu o histórico de dois commits
   sintéticos. Cliente e controlador usaram índice temporário, e o índice real
   da fixture ficou igual entre os hashes de início e fim. A prova cobre uma
   sessão macOS; não comprova o método para split-index ou linked worktrees.
   Uma sessão `git-status` distinguiu branch, upstream, staged, unstaged e
   arquivo não rastreado; índice e árvore observados permaneceram iguais. O
   isolamento de shell permitiu também consultas Git benignas em comandos
   compostos, além do `status` pretendido. A sessão não prova split-index ou
   worktrees vinculadas.
   Outra sessão nativa leu a skill extraída da `0.0.21` e executou status em
   fixture com staged, unstaged, arquivo não rastreado e upstream um commit à
   frente. O controlador confirmou a resposta e os snapshots persistentes;
   avisos de acesso ao ignore global foram produzidos pelo sandbox. Não houve
   instalação do pacote, prova de efeitos transitórios ou outros clientes.
   Em outra fixture, `copilot skill list --json` listou a skill `git-status`
   extraída da `0.0.21` como recurso do projeto; um diretório vazio não a
   listou. O comando rodou sem autenticação, rede ou acesso a dados pessoais e
   preservou árvore e Git observados. A skill foi copiada diretamente, sem
   instalar o adaptador; a listagem não comprova invocação ou obediência.
   Uma segunda fixture confirmou a descoberta de `git-fetch` pelo mesmo
   comando, também com controle vazio e skill copiada diretamente da `0.0.21`.
   A árvore e o Git observados permaneceram iguais; a prova não executou fetch.
   Outra fixture instalou uma cópia local extraída da `0.0.21` com o cliente
   Copilot selecionado. A listagem nativa, em sandbox sem rede e sem escrita
   na fixture, apresentou 41 nomes únicos de projeto, iguais aos 41 nomes dos
   apontamentos e das fontes no índice de skills; o controle vazio apresentou
   zero skills de projeto. Índice, configuração, exclude e gitignore
   observados permaneceram iguais durante a listagem. A prova não compara o
   caminho retornado de cada item, nem comprova invocação, leitura da origem,
   ativação ou execução dos fluxos; a instalação ocorreu antes do sandbox.
   Uma repetição verificou os 41 caminhos retornados, as referências até as
   fontes, seus bytes contra a cópia extraída e os hashes do estado instalado.
   A árvore de arquivos e modos observada e os quatro arquivos Git comparados
   permaneceram iguais durante a listagem. Não foi verificada a integridade
   integral da cópia extraída nesta repetição; a descoberta não demonstra
   leitura das fontes pelo cliente ou execução das skills.
   No `talquee-ai-router`, uma listagem nativa isolada e sem rede encontrou
   os 41 caminhos e apontamentos esperados do índice instalado. Também listou
   15 entradas de `.claude/commands` como skills de projeto; elas não foram
   modificadas nem classificadas quanto à autoria. O sandbox negou escrita no
   projeto, e índice, configuração, exclude e gitignore comparados ficaram
   iguais. A verificação não executou skills nem comparou toda a árvore.
   Uma inspeção posterior encontrou 18 arquivos Markdown em `.claude/commands`,
   todos com nome e referência compatíveis com o catálogo e hash igual ao
   estado instalado. Três compartilham nomes com skills; a listagem nativa
   mostrou cada nome uma vez, no caminho da skill, e os três comandos orientam
   usar as skills correspondentes. Os demais 15 foram listados a partir do
   diretório de comandos. O estado não comprova autoria nem comportamento de
   invocação; não se conclui que os três comandos sejam acessíveis no cliente.
   Uma consulta `git-worktree` da `0.0.21` listou a única worktree sintética;
   o controlador confirmou o resultado e preservação da árvore e índice
   observados. A prova não executou criação ou remoção de worktree.
   Em aplicação manual posterior, uma worktree e branch sintéticas foram
   criadas no commit esperado, com teste Node aprovado. Índice, HEAD, config e
   diffs observados da árvore principal ficaram iguais; refs e metadados Git
   mudaram pela criação. Git e Node rodaram em sandbox macOS sem rede; não
   houve instalação, ativação nativa, remoção ou prova de split-index.
   Em uma sessão `git-branch` da `0.0.21`, o cliente criou uma branch sintética
   no commit atual sem checkout. O controle confirmou o índice, HEAD, alterações
   e arquivos observados preservados fora da nova referência e seu reflog. A
   prova não cobre troca de branch, split-index ou worktrees vinculadas; o init
   anterior alterou o exclude da fixture.
10. [-] **Sincronização:** reconhecer referências legadas estritas sem assumir
    propriedade nem sobrescrevê-las, mantendo o alerta de escopo não verificado.
    No checkout do kit, o check passou de nove para quatro conflitos; os quatro
    restantes e os arquivos desatualizados ainda precisam de revisão.
    Na fixture de migração da `0.0.21`, o sync antigo regenerou catálogos sem
    atualizar os hashes históricos; o update candidato recusou a divergência.
    Em outra fixture macOS, um campo humano extra no catálogo causou recusa e
    foi preservado junto aos arquivos Git e humanos comparados. O controle sem
    esse campo concluiu o update, preservou Git, README e regra humana e
    atualizou catálogo e estado. Os
    snapshots começaram após o init/sync antigos; não comprovam sua preservação,
    a árvore completa, metadados, sync posterior ou outras plataformas.
    Uma variante em laboratório preservou o campo literal e a regra própria
    numa fixture, sem registrar o catálogo misto como gerenciado. Sync e novo
    update retornaram zero, mas os checks permaneceram não saudáveis pelo
    marcador legado em exclude e avisos de cobertura. A variante depende de
    origem histórica externa ao pacote e não comprova inventário completo ou
    autoria; permanece fora do produto.
    Uma cópia posterior incluiu a compatibilidade histórica no pacote e foi
    exercitada em fixtures no macOS e Linux; os checks continuaram com status 1.
    A instrumentação encontrou numa fixture mínima uma consulta da raiz que o
    inventário não registrava. Uma guarda experimental restrita passou controles
    locais, sem comprovar cobertura completa, metadados ou Windows. Não foi
    integrada, e não houve perda de dados demonstrada por essa omissão.
    Um classificador experimental aceita casos ambíguos e permanece fora do
    produto; não há ainda reconciliação comprovada de dados humanos e mudanças
    concorrentes.
    A revisão de um protótipo também reproduziu perda de precisão em números
    humanos e falha na detecção de remoção staged; variantes posteriores seguem
    em laboratório e não substituem as verificações reais do instalador.
    Um modelo posterior preservou bytes fora do campo alterado nos controles,
    mas ainda depende de propriedade e staged informados pelo chamador; não
    foi integrado ao sync ou ao instalador.
    Um protótipo para campos humanos extras na raiz funcionou em sync da mesma
    versão, mas uma fixture de atualização da `0.0.21` apresentou diferenças
    nos grupos gerados de regras e scripts. O planner conservou dois conflitos;
    esse protótipo não resolve a migração e permanece fora do produto.
    Em outra fixture da `0.0.21`, o planner recusou um catálogo com versões
    staged e unstaged distintas; os arquivos e o índice observados permaneceram
    iguais. O teste não aplicou a atualização nem cobriu concorrência.
    Um protótipo posterior aplicou a migração em fixture sintética preservando
    dados humanos e Git observados; após ajuste adicional, o check da CLI ainda
    ficou não saudável pelo marcador legado no `info/exclude`. A cobertura de
    artefatos também gerou aviso não bloqueante. Os controles de
    staged divergente, campo gerado alterado, estado derivado divergente e
    alteração após o plano foram recusados. Falta revisão independente, prova
    de metadados e concorrência; o protótipo usa origem temporária e não é
    distribuível nem foi integrado ao produto.
    Uma revisão independente reproduziu no protótipo uma dependência de
    catálogo omitida do plano: um asset já coincidente foi editado após o
    planejamento e a aplicação prosseguiu. A edição humana foi preservada,
    mas o catálogo passou a referenciar o asset sem revalidá-lo. A guarda
    experimental passou a incluir esse asset como dependência: uma repetição
    independente recusou a edição posterior com `E_CHANGED`, preservando seus
    bytes e o índice observados. Outros insumos, atomicidade e metadados ainda
    não estão comprovados; a solução permanece fora do produto.
    Outro controle editou uma regra humana após o plano: a aplicação preservou o
    arquivo, mas publicou no catálogo sua descrição anterior. Assim, a guarda
    experimental ainda não cobre todas as fontes do catálogo.
    Um inventário experimental mais amplo detectou alterações sequenciais, mas
    não incluiu uma regra staged ausente do working tree: o plano continuou
    aplicável. O teste preservou o índice e não aplicou o plano. A revisão
    também identificou leitura de pastas irrelevantes e possíveis bloqueios por
    arquivos grandes; o inventário precisa de escopo e cobertura mais precisos.
    Uma guarda staged ampla demais também bloqueou uma fixture por arquivo em
    pasta humana irrelevante ao catálogo; índice e blob foram preservados.
    Mesmo após reduzir o escopo, um arquivo grande ignorado pelo builder na
    raiz de ferramentas continuou provocando bloqueio no protótipo.
    Uma revisão posterior evitou esses dois bloqueios nas fixtures anteriores e
    recusou a fonte staged ausente; os controles passaram no macOS e no Linux.
    Outra fixture ainda mostrou falso `E_STAGED` para arquivo regular irrelevante
    na raiz de ferramentas. A captura não comprova atomicidade nem Windows;
    a variante continua isolada.
    Em variante posterior, os controles recusaram fontes catalogáveis staged e
    ausentes e permitiram o arquivo irrelevante; seis testes passaram em cada
    sistema, macOS e Linux. O update sintético preservou os dados observados,
    mas o check continuou não saudável pelos avisos Git. A leitura de assets
    ainda é mais ampla que a necessária, e propriedade, metadados, concorrência
    e cobertura completa das fontes permanecem sem prova suficiente.
    Outra variante inventariou um asset grande sem ler seu conteúdo nos
    controles, mas o plano de update dessa fixture permaneceu bloqueado por
    conflitos de catálogos. Índice e arquivos comparados ficaram iguais; a
    prova positiva cobre somente o inventário, não a migração. Alguns assets
    podem ser lidos por outras etapas mesmo quando o catálogo só lista o nome;
    essas dependências também precisam ser comprovadas antes da integração.
    Em variante posterior, um update sintético com asset grande já registrado
    e staged preservou índice, blob e bytes comparados; a instrumentação observou
    duas leituras do asset pelo planejamento. Um asset novo ainda gerou conflito,
    e o check continuou não saudável por avisos Git. A solução segue isolada.
    Uma nova cópia completou update, sync, check e novo update sem alterações
    na fixture preparada; também recusou a alteração de um sidecar após o plano.
    Os ignores dessa fixture foram preparados antes dos snapshots, e um aviso
    geral permaneceu. A captura de leituras ainda é parcial; não comprova todos
    os consumidores, concorrência ou metadados e não foi integrada ao produto.
    Revisão independente encontrou regressão no diff experimental: sua cópia
    reverte a correção recente de diagnóstico de limpeza. Também observou que
    o asset lido não consta como dependência verificada no ciclo positivo;
    portanto o diff não pode ser aplicado integralmente.
    Em outro controle da cópia experimental, um template alterado após o plano
    de update repetido permaneceu intacto, mas o catálogo reteve a descrição
    anterior. A dependência desse fluxo ainda precisa ser revalidada.
    Uma variante posterior passou em 16 controles no macOS e 16 no Linux,
    incluindo recusa da edição posterior do template e um ciclo positivo de
    update e sync com asset novo em fixture preparada. A coleta de leituras
    ainda é incompleta, o inventário é conservador e não há prova de Windows,
    concorrência ou preservação de ACL e xattr. Continua fora do produto.
    No teste de staged igual ao working tree e diferente de HEAD, em macOS e
    Linux, a aplicação experimental preservou índice, refs, diff staged, blobs
    staged e trechos humanos observados;
    a inclusão de conteúdo do kit alterou o catálogo no working tree, criando
    uma diferença unstaged. O check da CLI continuou com aviso bloqueante.
    Na cópia diagnóstica, o identificador do bloco legado não correspondia ao
    caminho atual. Retirar o marcador apenas naquela cópia eliminou o aviso,
    mas não demonstrou propriedade nem autorizou remover regras existentes.
    Em uma fixture com estado fabricado, registrar como gerenciado o hash de um
    catálogo com campo humano permitiu ao sync removê-lo. Isso demonstra o risco
    de adotar o arquivo inteiro, não que a migração atual faça essa adoção.
    Em fixture sintética, o gerador e as fontes `0.0.21` reconstruíram os dois
    hashes históricos de `catalog.json` e `rules.json`. Isso não comprovou a
    propriedade das alterações posteriores. Uma variante de planejamento
    evitou adotar `rules.json` idêntico, inclusive com staged divergente, mas
    manteve o conflito do catálogo principal. Em outra fixture preparada para
    igualdade dos catálogos, update e sync foram aplicados preservando os
    arquivos e o índice observados; uma edição após o plano foi recusada. A
    variante não reconcilia catálogos divergentes nem prova metadados ou
    atomicidade e permanece fora do produto. A revisão independente identificou
    que a classificação precisa considerar também a propriedade registrada em
    `derived.catalogs` e o estado anterior divergente; a prova não cobre toda
    a árvore, `sync --check` ou sync direto. Controles adicionais confirmaram
    que registros derivados podem continuar presentes e que o protótipo pode
    descartar hashes históricos do estado principal. Nenhum catálogo foi
    apagado nesses controles, mas a perda de referência impede a integração.

Na revisão da pipeline, três suítes ausentes foram classificadas. A validação
da classificação e os 32 testes da pipeline passaram no macOS. No Linux com
`attr` e `acl`, dez testes de metadados passaram; o cenário sem `getfattr` é
executado em ambiente separado. Na matriz completa Linux, a ausência dessas
ferramentas agora reprova os testes obrigatórios. Permanecem pendentes a
atualização de referência CRLF com registro anterior divergente e a proteção
completa de atributos que não possam ser inspecionados.
Uma execução posterior encontrou um teste de workflow incompatível com a
variável de metadados adicionada ao passo de CI. O teste foi corrigido para
verificar `NODE_OPTIONS`, a ativação estrita no Linux e a instalação de `attr`
e `acl`. As três suítes de release passaram com 99 testes no macOS e Linux
ARM64; a verificação adicional do passo também passou nos dois sistemas.
Isso não comprova a execução no Windows ou o resultado remoto da pipeline.
Uma fixture adicional confirmou no macOS e no Linux que converter CRLF antes
ou depois do `git add` produz os mesmos bytes do arquivo, blob normalizado no
índice e hash derivado. Esses dados isolados não provam a origem da alteração;
a atualização automática continua bloqueada até haver uma solução que preserve
edições humanas e metadados. A revisão independente não foi executada porque
o ambiente recusou a criação do subagente.
Em uma fixture Git isolada com a versão npm `0.0.21`, um cliente Codex real
leu o apontamento da skill `git-status` e sua origem; identificou corretamente
um arquivo preparado e alterado novamente e um arquivo não rastreado. O índice,
a configuração e as exclusões Git conservaram seus hashes. É uma prova de uma
skill e um cliente, não dos demais recursos ou da compatibilidade integral.
Em uma fixture Claude isolada, uma consulta em modo de planejamento e com
ferramentas de escrita e shell desabilitadas recebeu o caminho da skill
`criar-prd` e identificou preparação e dados de produto pendentes. A fonte
indicada coincide em hash com a `0.0.21`; índice, configuração, exclusões,
ignore e código humano observados mantiveram seus hashes. A saída registra a
leitura declarada, mas não fornece aqui uma trilha independente de ferramentas;
ela não comprova descoberta automática nem a criação completa do PRD.
Em uma segunda consulta, o cliente acionou `criar-prd` pelo nome. A trilha
registrou o carregamento do apontamento em `.claude/skills` e a leitura da
origem compartilhada; o estado de configuração estava ausente e a resposta
indicou a preparação como próxima etapa. Escrita e shell estavam desabilitados,
e os mesmos arquivos Git e humanos observados mantiveram seus hashes. Essa
prova cobre uma skill e uma seleção, não os demais recursos ou criação de PRD.
Em instalação nova `0.0.21` com Gemini CLI 0.67.0, `gemini skills list --all`
em perfil isolado não listou as skills locais sem confiança na pasta. Com
confiança apenas para o processo da fixture, listou os 41 apontamentos em
`.gemini/skills` como habilitados; os 426 arquivos observados do projeto
mantiveram seus hashes. A listagem comprova descoberta, não execução das
skills ou persistência de confiança. O requisito e a inspeção da localização
foram documentados com referência oficial.
Em OpenCode 2.2.6 isolado, sem rede e com o projeto montado somente para
leitura, o cliente listou os 11 perfis do kit. A configuração retornada para
o revisor negou `edit`, `shell` e `subagent`; isso não testa a aplicação dessas
permissões. Após inicializar um servidor privado, a API listou os 41
apontamentos de skills da fixture. Três consultas isoladas imediatas voltaram
vazias; um controle próprio também ficou ausente na consulta imediata, mas foi
encontrado no servidor já inicializado. Esse contraste não determina sozinho a
causa. Os 425 arquivos observados permaneceram iguais, sem pasta de loop na
fixture; nenhum contêiner de teste permaneceu ativo. Não houve execução das
skills, conexão ao serviço compartilhado ou validação do cliente instalado na
máquina do usuário.
Em outra fixture, o cliente acionou pelo nome `revisar-autorizacao`,
`revisar-seguranca` e `planejar-qa` da `0.0.21`. As três respostas apontaram
uma falha sintética de acesso entre usuários; um controle externo reproduziu o
comportamento. As sessões de revisão não executaram testes, conforme solicitado.
A resposta de autorização saiu em inglês e classificou o caso como crítico sem
comprovar exposição real. A candidata passou a orientar idioma e distinção entre
impacto comprovado e potencial; numa repetição, a resposta saiu em português e
informou ausência de rota comprovada, mas ainda atribuiu gravidade alta ao
código. Os hashes Git e humanos observados não mudaram; esse resultado não
prova calibração determinística nem auditoria completa de uma aplicação.
Na mesma fixture, o cliente também acionou `avaliar-arquitetura`,
`avaliar-performance` e `validar-adversarial` da `0.0.21`. As respostas
identificaram a divergência do contrato; performance ficou não verificada,
mas a resposta ainda qualificou o custo sem medi-lo. A revisão adversarial
atribuiu impacto crítico antes de comprovar uso ou exposição. Nas fontes
candidatas, as duas orientações foram reforçadas; uma repetição não qualificou
o custo sem medir e apresentou o impacto de segurança como condicional. Os
arquivos observados mantiveram seus hashes. É uma amostra pontual, não uma
medição de performance ou uma auditoria completa.
Em uma fixture sintética, a skill `corrigir-vulnerabilidade` da `0.0.21`
corrigiu uma falha de acesso: antes, dois de três testes falhavam; depois,
os três passaram e os arquivos Git e humanos observados mantiveram seus hashes.
A sessão registrou revisão independente e gate final pendentes; uma prova
adicional de propriedades que lançam exceções ficou fora do código de teste.
A candidata passou a exigir teste versionável para cenários adicionais
corrigidos. Em outra fixture com o cenário explicitado no pedido, a sessão
incluiu o teste: ele falhou contra o código original e os quatro testes passaram
após a correção. Índice e arquivos observados permaneceram iguais; revisão
independente e gate seguiram pendentes. As fixtures são híbridas e não provam
uma instalação integralmente publicada ou um fluxo completo de produção.
Na mesma fixture, o cliente descobriu pelo nome as skills de design e spec da
`0.0.21`, mas ambas sugeriram PRD antes da preparação não comprovada. A sessão
de roadmap atingiu o limite de turnos. Em uma cópia com apenas as três fontes
candidatas, as três consultas indicaram `configurar-projeto` primeiro; isso não
prova uma atualização completa ou comportamento determinístico. Na consulta de
roadmap, o cliente tentou escrever um plano, mas a ferramenta estava
desabilitada; os arquivos Git e humanos observados mantiveram seus hashes.
Uma repetição após orientar o uso da seleção salva identificou `claude`, mas
ainda pediu confirmação de clientes e idioma; a instrução foi reforçada e
em outra consulta identificou os valores salvos sem pedir confirmação. Os
mesmos dados Git e humanos observados permaneceram iguais. É uma prova pontual,
sem garantir que respostas futuras sejam idênticas.
Três sessões independentes também consultaram explicitamente `git-log`,
`git-branch` e `git-worktree` da `0.0.21` em uma fixture com branch `trunk`
e alteração staged. Os resultados coincidiram com as consultas Git de
conferência; os hashes do índice, configuração, exclusões, HEAD e dois arquivos
observados permaneceram iguais. As consultas não comprovam criação ou troca de
branch/worktree, descoberta automática das skills, nem ausência de alterações
transitórias em outros arquivos.
Em duas cópias descartáveis com alteração staged, sessões `workspace-write`
tentaram criar uma branch e uma worktree usando as skills da `0.0.21`. Ambas
foram impedidas pelo sandbox de criar o lock obrigatório em `.git`; nenhuma
branch ou worktree foi criada. Índice, configuração, exclusões e os dois
arquivos observados mantiveram seus hashes. Essas tentativas não comprovam o
fluxo de criação bem-sucedido nem justificam contornar a proteção do ambiente.
Em três sessões adicionais, `criar-agente`, `criar-comando` e `criar-regra`
da `0.0.21` receberam pedidos sem contrato definido e solicitaram decisões
antes da criação. Os mesmos hashes observados permaneceram iguais. A prova
cobre apenas a consulta inicial, não a criação, sincronização ou descoberta.
Em outra fixture, uma sessão criou uma regra `model_decision` e atualizou o
índice. A sessão usou Node 22 e não conseguiu sincronizar: o kit exige Node 24+.
Em uma cópia da fixture, a sincronização direta com Node 26 gerou apontamentos
para `.agents` e `.codex`, e `--check` e a validação nativa de fontes passaram.
Índice, configuração, exclusões e arquivos humanos observados mantiveram seus
hashes na cópia; não se comprovou ativação nativa nem sincronização pelo agente.
Na repetição com Node 26 explícito, o agente criou a origem e tentou a
sincronização, mas o sandbox recusou escrita em `.agents` com `EPERM`.
O `--check` registrou duas derivações e quatro índices pendentes. Os hashes
dos dados Git e arquivos humanos observados permaneceram iguais; catálogos e
estado comparados também permaneceram iguais. A prova permanece incompleta.
A candidata passou a orientar a seleção de Node 24+ já instalado antes de
solicitar instalação. Um teste com Node 22 confirmou a mensagem revisada; os
testes de requisito passaram em macOS e Linux ARM64. A orientação não procura
automaticamente outras versões no PATH e não elimina os limites do sandbox.
Na candidata, as skills de comando e regra foram ajustadas para indicar que o
manifesto é gerado e não deve ser editado manualmente. A suíte de adaptadores
passou no macOS e no Linux; ela não executa as skills em clientes nativos.
A verificação de fontes também passou em Linux ARM64 com Node 24 e
`markdownlint-cli2` instalado em áreas temporárias do contêiner: 252 arquivos,
sem erros. O checkout foi montado somente para leitura; não é prova em Windows
ou Linux x64.
A suíte de distribuição da candidata local passou no macOS e Linux ARM64:
empacotou uma cópia filtrada, instalou o tarball offline e exercitou `npx`,
projeto novo, projeto existente, atualização e recusa de destino simbólico.
Ela não comprova o pacote publicado, todos os projetos existentes ou Windows.
Uma matriz adicional em Linux ARM64 usou o tarball da candidata `0.0.30` em
80 projetos sintéticos, com quatro processos e sem rede. Registrou 60 casos
verificados, nenhum com falha e 20 não verificados: 12 por escopo Claude e
oito por metadados Cursor. Nos 80, os arquivos humanos e dados Git observados
permaneceram preservados; a proveniência observada permaneceu estável. O
resultado geral foi `not-verified`, sem comprovar execução de clientes ou skills,
metadados do sistema, todas as alterações transitórias ou pacote publicado.
Outra matriz em Linux ARM64 e Node 24 usou um novo tarball local da candidata
`0.0.30`, SHA-256 `c0b79afaf619ce62c97aaa4de04f8f4790c9d80ca336d84bbe49b993489ee5c0`,
em 1.000 projetos sintéticos: 500 novos e 500 existentes. Registrou 676 casos
verificados, 324 não verificados e nenhuma falha classificada. Os 1.000
relatórios indicaram preservação dos arquivos humanos, referências e dados Git
observados. A proveniência monitorada permaneceu estável e os arquivos do
tarball conferidos ao final coincidiam com a cópia extraída. Os não verificados
incluem 208 casos com escopo Claude e 132 com metadados Cursor, com 16 casos
em ambos os grupos. A prova não executa skills ou clientes nativos, não cobre
Windows, metadados completos nem alterações transitórias, e não valida o pacote
publicado. Os relatórios individuais permanecem em armazenamento temporário.
Uma matriz adicional em Linux ARM64 e Node 24 testou as rodadas 26 a 38 com
outro tarball local da candidata `0.0.30`, SHA-256
`87762b5741e8938c70a08b9947fc4d233cff45f9fd8f9f3bba0d70d7f127ab53`,
sem rede externa. Foram 520 projetos sintéticos, metade novos e metade existentes:
376 verificados estruturalmente, 144 não verificados e nenhuma falha
classificada. Os 520 relatórios registraram preservação dos caminhos humanos e
Git observados. Entre os inconclusivos, 84 incluíram escopo Cursor e 68 escopo
Claude, com oito em ambos. A proveniência monitorada passou; 687 entradas do
pacote extraído coincidiram em tipo, modo e conteúdo com o tarball antes e
depois da matriz. O tarball precede ajustes posteriores nas skills de roadmap e
backend. A prova não valida o pacote publicado, execução nativa de skills ou
clientes, Windows, todos os metadados ou alterações transitórias. Os relatórios
individuais e suas fixtures permanecem em armazenamento temporário.
Na mesma fixture, duas sessões independentes em paralelo executaram a skill
`git-diff` e a leitura explícita do perfil `revisor`. A primeira distinguiu
as linhas preparadas das não preparadas; a segunda identificou uma subtração
que contrariava o contrato de soma, com arquivo, linha e exemplo. Os hashes
dos arquivos da fixture, índice e configuração Git permaneceram iguais. A
chamada explícita do perfil não comprova sua descoberta ou delegação nativa.
Outras duas sessões testaram `criar-prd` sem dados de produto e
`implementar-spec` com formato e autorização indefinidos. Ambas solicitaram
informações e indicaram pré-requisitos ausentes sem escrever na fixture; os
hashes observados do índice, configuração e spec permaneceram iguais. A prova
cobre somente a etapa inicial, sem aprovação ou implementação completa.
Em outra fixture sintética com o pacote publicado `0.0.21`, o cliente da rota
`.claude` descobriu e invocou `criar-prd`, leu a fonte, o modelo e o estado e
criou um PRD em rascunho. Os requisitos informados e nove dúvidas apareceram;
o README recebeu um acréscimo mantendo o texto humano. Índice, configuração,
exclusões, `.gitignore` e estado observados após a instalação não mudaram.
Controles com arquivos sintéticos fora da fixture confirmaram a recusa das
ferramentas de leitura e escrita; shell e MCP estavam indisponíveis. Sessões
posteriores responderam às dúvidas e mantiveram o PRD em rascunho até uma
aprovação explícita simulada. Após ela, o PRD foi marcado como aprovado, o
README atualizado e um roadmap criado em rascunho. Outras dúvidas surgiram em
rodadas posteriores, e um critério de aceite precisou ser acrescentado. Os
mesmos arquivos Git e o estado observados permaneceram iguais nessas sessões.
Não houve revisão independente, execução de scripts de inventário e
sincronização nem testes de aplicação. A prova não comparou o `info/exclude`
antes e depois da instalação e não demonstra ausência de alterações transitórias.
Em uma nova fixture sintética, a skill candidata acrescentou a orientação de
agrupar dúvidas e critérios de aceite. Uma sessão nativa apresentou 17 grupos
de perguntas em uma rodada e manteve o PRD em rascunho; o README observado
continuou com o texto humano. A fixture combinou a instalação publicada com
essa única skill candidata. Não houve controle comparativo equivalente, novas
respostas, aprovação, revisão independente ou execução dos scripts; o resultado
não garante que todas as dúvidas apareçam na primeira rodada.
Na mesma fixture sintética com PRD aprovado por solicitação simulada, uma
sessão nativa invocou `criar-spec` da `0.0.21` e recusou criar a spec por
ausência de UX/UI e design aprovados. Os hashes observados de Git, README,
PRD, roadmap e estado permaneceram iguais; nenhuma escrita foi registrada na
sessão. A resposta tratou a preparação como concluída com base no estado
declarado, sem demonstrar suas evidências, e propôs perguntas de etapas futuras.
Não houve inventário por script nem prova da criação de uma spec válida.
Em cópia da fixture, a fonte candidata de `criar-spec` foi ativada nativamente:
ela tratou a preparação como não comprovada, informou que não podia executar a
verificação obrigatória, não antecipou perguntas de produto e não escreveu a
spec. Os hashes observados dos mesmos arquivos e da fonte candidata coincidiram
antes e depois. O pedido mencionou a falta de evidências adicionais e não foi
idêntico ao da sessão anterior; o teste não comprova que o script funcionaria
nem o comportamento da skill com preparação válida.
Em outra cópia da fixture com PRD aprovado por solicitação simulada, a skill
`criar-ux-ui` da `0.0.21` foi invocada nativamente e criou um documento em
rascunho com 14 dúvidas agrupadas. O arquivo distingue propostas de decisões
aprovadas. Git, PRD, roadmap, estado e fonte observados mantiveram os hashes;
o README observado permaneceu igual. A sessão não tinha shell ou revisor e
apontou que README, roadmap e estado ainda não refletiam o novo documento.
Não houve respostas, aprovação de UX/UI ou fluxo completo; a preparação foi
declarada na fixture, mas não comprovada por script.
Uma sessão posterior respondeu às 14 dúvidas sintéticas, atualizou apenas o
rascunho de UX/UI e agrupou nove perguntas adicionais, inclusive possíveis
conflitos com o PRD. Os hashes observados de Git, README, PRD, roadmap e
estado permaneceram iguais. A aprovação e a revisão independente continuam
pendentes; a sessão não demonstra execução de ferramentas ou fluxo completo.
Em cópia anterior à criação de UX/UI, a fonte candidata dessa skill identificou
a preparação declarada sem evidências, suspendeu o trabalho e não fez perguntas
de UX. Os arquivos e o índice observados mantiveram os hashes, e não surgiu o
documento de UX/UI. O pedido explicitou a ausência de evidências adicionais;
sem shell ou revisão independente, o teste não comprova o fluxo positivo da
candidata nem sua atuação em outros contextos.
Em uma fixture de autorização com defeito intencional, três sessões em paralelo
consultaram `revisar-autorizacao`, `revisar-seguranca` e `planejar-qa`. As duas
revisões identificaram acesso de não proprietário; a revisão de segurança
também observou igualdade indevida entre identificadores ausentes. QA propôs
casos negativos. Os hashes observados do arquivo e de dados Git não mudaram.
São provas pontuais, sem demonstrar scanners, correções ou fluxos completos.
Em três cópias sintéticas com fontes idênticas às da `0.0.21`, sessões nativas
ativaram `avaliar-arquitetura`, `planejar-qa` e `avaliar-performance` sem
ferramentas de escrita. Os hashes observados dos arquivos e dados Git não
mudaram. Arquitetura apontou conflito entre cenário e PRD; performance informou
que p95 não estava medido. QA propôs testes sem alegar execução, mas não
registrou o conflito. A fonte candidata de QA passou a pedir essa conferência;
em outra sessão nativa com o mesmo pedido e fixture, ela identificou o conflito
e distinguiu critérios derivados de decisões aprovadas. Os hashes observados
permaneceram iguais. Uma repetição não prova determinismo; os três fluxos
completos continuam pendentes. As sessões foram processos independentes, não
subagentes.
Em uma fixture positiva com documentos, spec e plano aprovados por solicitante
sintético, `implementar-backend` da `0.0.21` criou uma API em memória e testes
HTTP sem alterar os caminhos Git e documentos observados. Nove testes gerados
passaram em contêiner Linux sem rede externa. Uma prova adicional com título
não vazio acima de 64 KiB falhou: a API retornou 413, embora a spec sintética
não tivesse definido esse limite. A implementação informou a decisão adicional,
mas não a esclareceu antes de escrever. A skill candidata passou a pedir a
decisão sobre limites ausentes; essa alteração ainda não foi provada em fluxo
positivo de spec e a sessão original não executou testes nem revisão independente.
Em outra fixture de projeto existente sem spec, a skill candidata identificou
o limite sem contrato e pediu uma decisão antes de escrever. Após autorização
sintética para limitar o corpo a 1 MiB, alterou o servidor e os testes. Treze
testes HTTP passaram em contêiner Linux sem rede externa, incluindo título de
70 KiB e as fronteiras do limite; os arquivos executados coincidiram por hash
com os gerados. Git, README e demais caminhos observados permaneceram iguais.
As sessões não tinham shell, não executaram verificação de configuração nem
revisão independente; a prova cobre correção avulsa, não o fluxo de spec.
Em outra fixture com documentos e plano aprovados por solicitante sintético,
`implementar-frontend` da `0.0.21` criou HTML, CSS e JavaScript locais. Em
navegador headless, uma verificação separada percorreu estado vazio, erro para
entrada vazia ou só espaços, inclusão por Enter e botão e remoção por teclado.
No viewport 375 × 812, um título longo não produziu rolagem horizontal medida;
o console consultado não registrou erros e as três requisições observadas
foram locais.
Os 11 caminhos Git e documentos monitorados mantiveram seus hashes. A sessão
de implementação não tinha shell ou navegador e não gerou testes automatizados;
não houve revisão independente, teste de recarga, leitor de tela, dispositivo
móvel físico ou prova em outros navegadores. A fixture não comprova o produto real.
Em duas cópias sintéticas da `0.0.21`, sessões nativas invocaram
`criar-design-doc` e `gerenciar-roadmap`. Design recusou escrever sem UX/UI
aprovado. A consulta de roadmap não escreveu, mas marcou preparação como
concluída com base somente no estado declarado. Os hashes observados de Git e
documentos permaneceram iguais. Com uma orientação candidata para não concluir
preparação sem prova, uma repetição apresentou ressalva mas ainda usou `[x]`;
uma segunda orientação marcou a etapa como pendente e indicou
`configurar-projeto`. Ambos os testes foram pontuais, sem shell; a alteração
foi aplicada à fonte candidata após essa prova e não garante determinismo.
Em três outras cópias sintéticas, as fontes publicadas de
`implementar-backend`, `implementar-frontend` e `revisar-codigo` foram ativadas
em sessões independentes. As implementações pararam por falta de spec e design
aprovados; a revisão identificou uma subtração no lugar de soma. As sessões não
registraram escritas e os hashes observados permaneceram iguais. A revisão
generalizou o defeito para qualquer segundo operando diferente de zero, sem
considerar valores especiais e arredondamento; a skill candidata passou a
pedir limites das afirmações. Não houve implementação completa ou revisão
independente, e os controles cobrem somente os caminhos observados. Em uma
repetição com a fonte candidata, a revisão continuou generalizando o erro para
todos os números finitos com segundo operando não zero. Um controle Node com
`a = 1e20` e `b = 1` produziu o mesmo resultado para soma e subtração por
arredondamento. Logo, a alteração não corrigiu o problema nesse teste; os
hashes observados permaneceram iguais. Mesmo após explicitar a exigência de
prova e arredondamento, uma segunda repetição com a candidata voltou a fazer a
generalização falsa. A validação continua pendente; a instrução não garante a
correção da análise. Com uma instrução adicional para limitar o impacto aos
exemplos quando faltar prova geral, três sessões independentes repetiram o
cenário: uma voltou a afirmar que todos os segundos operandos finitos não zero
divergem, uma qualificou o alcance como geral e outra limitou o impacto aos
exemplos. As três identificaram o defeito e os hashes observados permaneceram
iguais. Não há garantia de precisão universal ou execução da função nessas
sessões; o contraexemplo foi executado separadamente.
Em duas cópias sintéticas, sessões nativas da `0.0.21` invocaram
`validar-adversarial` e `verificar-trabalho` sobre esse defeito e um relatório
que descrevia o contraexemplo. Ambas distinguiram o defeito da generalização
refutada e informaram que não reproduziram a execução. Os hashes observados
permaneceram iguais. A evidência do contraexemplo foi fornecida no pedido da
fixture; isso não prova descoberta autônoma nem revisão independente.
Quatro sessões adicionais consultaram `avaliar-arquitetura`,
`avaliar-performance`, `validar-adversarial` e `modelar-ameacas` em fixtures
sintéticas. A performance foi corretamente registrada como não medida; as
demais análises identificaram limites ou violações do contrato sintético.
Os hashes observados dos arquivos e dados Git permaneceram iguais. Não houve
prova de carga, aplicação real ou fluxo completo dessas skills.
Quatro sessões independentes leram explicitamente os perfis `arquiteto`,
`engenheiro-qa`, `auditor-seguranca` e `analista-performance` da `0.0.21`.
Arquitetura e segurança identificaram a divergência do contrato sintético; QA
executou oito casos locais, dos quais quatro falharam na fixture defeituosa;
performance permaneceu não verificada sem carga e medições. Os arquivos e dados
Git observados mantiveram seus hashes. A leitura explícita não comprova
descoberta ou delegação nativa dos perfis.
Outras quatro sessões leram explicitamente `documentador`, `planejador`,
`especialista-backend` e `especialista-frontend` diante de uma spec incompleta.
Identificaram decisões e pré-requisitos pendentes; índice, configuração e spec
observados não mudaram. Isso prova a consulta inicial dos perfis, não uma
implementação ou delegação nativa.
Por fim, `implementador` e `validador` foram consultados explicitamente para a
mesma spec: ambos identificaram que ela não estava pronta. O implementador da
`0.0.21` também mencionou o fluxo Git prescritivo tratado na candidata. Índice,
configuração e spec observados permaneceram iguais. Com a prova anterior de
`revisor`, havia consulta explícita dos 11 perfis.
Em sessões sintéticas posteriores, cada um dos 11 perfis da `0.0.21` foi
selecionado diretamente pela opção nativa `--agent` e leu sua fonte, cujos
hashes coincidiam com os do pacote. Um nome inexistente foi recusado. Os hashes
observados dos arquivos e dados Git permaneceram iguais; as sessões só tinham
ferramentas de leitura. O analista de performance informou ausência de medição;
o implementador parou por falta de spec. Revisor, especialista backend e
validador identificaram o defeito sintético, mas generalizaram incorretamente
seu alcance numérico. As provas não demonstram delegação por outro agente,
fluxos completos, ferramentas de escrita, execução de testes ou determinismo.
Na `0.0.21`, consultas reais a `criar-design-doc`, `criar-ux-ui`,
`gerenciar-roadmap` e `criar-spec` identificaram lacunas em uma spec sintética.
Em pedidos com preparação não comprovada, as três primeiras recomendaram PRD
antes de `configurar-projeto`; `criar-spec` indicou a preparação primeiro.
Com outro pedido que explicitou a ausência de preparação, tanto a `0.0.21`
quanto as skills candidatas de design e UX indicaram `configurar-projeto`.
A candidata de roadmap recebeu instrução explícita para essa ordem e, em uma
consulta na fixture, indicou a preparação. As fixtures e pedidos variam; os
resultados não provam comportamento determinístico nem migração integral.
Na preparação da fixture, a `0.0.21` interpretou uma consulta Docker bloqueada
pelo sandbox como daemon inativo, embora uma consulta fora dele conseguisse
acessá-lo. A candidata distingue consulta bem-sucedida, inconclusiva, não
solicitada e executável ausente do PATH. A opção `--no-docker-probe` evita
chamadas ao contexto potencialmente remoto; os booleanos antigos permanecem.
Testes direcionados passaram em macOS e Linux, sem prova de Windows. A mudança
ainda não foi publicada nem migrada.
A CLI rejeita opções desconhecidas antes da sondagem; o teste também percorre
o seletor e usa um executável sintético para verificar que ele não é chamado.
Com o catálogo real, outra prova interceptou APIs selecionadas de processos e
rede durante o diagnóstico sem sondagem; controles confirmaram especificamente
`spawnSync` e `https.request`. Passou em macOS e Linux, sem comprovar as demais
interceptações, todas as formas de acesso ao sistema ou execução em Windows.
Após revisão, a orientação candidata distingue início de produto de preparação
de execução de projeto existente. Em uma consulta sintética, a primeira ação
para execução local foi `preparar-dev`, com índice e arquivos observados
intactos. A revisão textual posterior não encontrou conflito nesses critérios;
os fluxos completos não foram executados.
O teste de `implementar-spec` também expôs um fluxo Git prescritivo na
`0.0.21`. Na candidata, a skill passou a respeitar a branch existente, permitir
trabalho sem remoto, condicionar commits e push à autorização e proteger staged
preexistente. Uma fixture em `trunk` sem remoto preservou índice e arquivo; a
execução parou por ausência dos documentos obrigatórios, sem provar a
implementação integral. Uma revisão encontrou risco em checkpoints e
ambiguidade na sequência de configuração; as instruções foram ajustadas.
Essa fixture em `trunk` tem estado `0.0.21`, mas seis fontes de skill foram
substituídas pela candidata: design doc, UX/UI, preparar-dev, próximos passos,
roadmap e implementar spec. O estado de versão não comprova que todas as skills
usadas nela sejam do pacote publicado. As fontes de Git e de criação de agente,
comando e regra usadas nas consultas acima coincidem com o pacote `0.0.21`.
Em uma fixture sintética com spec e plano aprovados no pedido, a fonte da
skill `implementar-spec` foi restaurada à `0.0.21` e implementou soma local;
dois testes passaram e índice, configuração, exclusões, HEAD e arquivo humano
observados mantiveram seus hashes. A fixture ainda tinha duas fontes da
candidata (`INSTRUCTIONS.md` e diagnóstico de ambiente), portanto não prova
um fluxo com instalação integralmente `0.0.21`. O registro da sessão contém
uma falha ao criar subagente; sua afirmação de revisão independente não pôde
ser comprovada por esse registro. Uma sessão independente posterior executou os
testes, apontou lacuna de especificação para overflow e combinações ausentes na
suíte, sem invalidar os exemplos verificados. O snapshot externo comprova a
igualdade dos arquivos observados, não todos os efeitos transitórios.
A candidata agora orienta manter a revisão pendente quando não houver resposta
verificável do revisor e esclarece que o selo valida consistência dos dados,
sem comprovar a ocorrência da revisão. Isso é uma instrução, não uma garantia
técnica contra preenchimento falso do relatório.
As saídas estruturadas do gate também incluem
`reviewVerification: "not-verified"` em `seal`, `check`, `check-commit` e
`check-merge`. O campo é
aditivo; não autentica a revisão nem muda a compatibilidade dos relatórios.
Misturar a skill candidata com `proximos-passos` da `0.0.21` revelou ordem
divergente, que exige atenção na migração de versões, ainda não comprovada.
Após alinhar as duas skills candidatas, uma nova revisão estática não encontrou
conflitos nesses critérios; ela não substitui um upgrade ou implementação real.
Em mais 40 projetos sintéticos macOS, usando a candidata local e combinações
diferentes de clientes, todos os comandos previstos retornaram sucesso e os
arquivos humanos e dados Git monitorados permaneceram preservados. A matriz
classificou 36 casos como estruturalmente verificados e quatro como não
verificados por metadados de escopo do Cursor. Não houve falha classificada,
mas o resultado geral permaneceu não verificado. A prova não executa os clientes
nativos nem cobre todas as alterações transitórias ou metadados do sistema.
A matriz agora detecta frontmatter Cursor divergente do sidecar instalado
quando ambos pertencem ao subconjunto de bytes reconhecido e o sidecar coincide
com o pacote e o estado. Igualdade não promove o escopo a verificado; YAML fora
desse subconjunto continua não verificado. A repetição de 40 projetos, anterior
à nova medição, manteve 36 verificados estruturalmente e quatro não verificados,
com dados humanos e Git observados preservados. A matriz agora mede presença e
hash dos sidecars Cursor no início e fim; testes detectaram alteração, inclusão,
remoção e link simbólico. Isso não detecta alterações transitórias revertidas,
não autentica o pacote e não comprova o escopo ou a ativação no cliente.
A leitura de proveniência exige uma política Cursor válida, recusa links nos
caminhos observados e confere novamente os diretórios durante a leitura. Os
testes específicos passaram no macOS e no Linux; a proteção não elimina todas
as corridas de troca de diretório e ainda precisa de validação no Windows.
Uma revisão independente identificou uma janela específica na enumeração dos
sidecars: a troca concorrente de um diretório pode alcançar uma árvore externa
antes da recusa. A comparação de nomes sem distinguir caixa também pode
incluir arquivos adicionais em sistemas que distinguem caixa. Esses limites
continuam pendentes; a matriz não deve ser tratada como prova de isolamento.
As provas de integração usam cópia temporária filtrada. Casos sintéticos
confirmaram exclusão de dados locais em variações de caixa, preservação do
README de estado e rejeição de um diretório que use esse nome. Não se afirma
que a cópia reproduza integralmente o pacote publicado. Um teste adicional
confirmou que links sintéticos para arquivo e diretório externos não são
copiados; ele não cobre corridas entre inspeção e cópia ou junctions Windows.
A investigação encontrou que o sidecar Cursor da regra Git a marcava como
sempre ativa, enquanto a origem usa decisão do agente. A candidata alinhou o
sidecar a esse gatilho, conforme a
[documentação do Cursor](https://cursor.com/docs/rules), e reforçou a regra
para interromper consultas sem método comprovadamente seguro.
Um teste de geração preservou os bytes do índice principal da fixture; não
comprova ativação no cliente nem os metadados de todos os sidecars.
No router com `0.0.21`, o apontamento Cursor, a regra Git e seu sidecar
coincidiram em SHA-256 com uma instalação sintética do pacote publicado. O
apontamento e o sidecar usam aplicação global, enquanto a origem indica
decisão por relevância. A configuração foi observada; sua ativação nativa
no cliente do usuário não foi comprovada nem alterada.
Uma tentativa isolada com o CLI Cursor, projeto somente de leitura e endpoint
local sem credenciais reais parou na autenticação antes de avaliar regras;
portanto não comprova ativação nativa nem usa configurações do usuário.
O apontamento Cursor existente no checkout permanece desatualizado porque o
`sync --check` apresenta outros conflitos; ele não foi sobrescrito. O teste de
fixture também confere a referência canônica, as instruções de autoria e a
interrupção de consultas sem método seguro.
No router real com `0.0.21`, o `doctor` da candidata `0.0.30` identificou
oito conflitos em regras existentes de cliente e um marcador de exclusão
compartilhada; também indicou 52 itens desatualizados. A consulta terminou com
status pendente. Antes e depois dela, os hashes do índice, `.gitignore`,
`.git/config` e `.git/info/exclude` coincidiram. Nenhum conflito foi resolvido
ou regra alterada nessa verificação. O `doctor` do pacote publicado `0.0.21`
retornou sucesso no mesmo projeto e preservou os mesmos hashes; esse resultado
não comprova a execução individual dos recursos nem um upgrade completo.
A candidata também passou a reconhecer o marcador legado quando o arquivo de
exclusões começa com BOM UTF-8. Em fixtures, o diagnóstico preserva exclusões
e índice; essa correção não remove o marcador nem resolve o conflito do router.
Uma nova execução da migração a partir do tarball publicado `0.0.21` cobriu
nove fixtures: oito atualizações terminaram, a seleção Claude apresentou oito
conflitos e os nove `sync --check` permaneceram bloqueados pelo marcador legado.
As verificações de preservação observadas passaram; o `init` histórico alterou
`.git/info/exclude` nas nove fixtures antes da atualização. O relatório não
comprova preservação de todos os metadados nem migração bem-sucedida.
Os nove testes de exclusão legada passaram novamente em macOS e Linux ARM64,
incluindo uma worktree vinculada com índices distintos e blocos truncados ou
alterados. A proteção permanece conservadora: reconhecer o marcador não prova
autoria nem autoriza remover suas regras.
No mesmo router, `sync --check` e `update --dry-run` da `0.0.21` retornaram
sucesso sem mudanças planejadas ou conflitos; `agents` e `next` também
retornaram sucesso. Após as consultas, os mesmos hashes Git permaneceram
iguais. Os 41 arquivos de skills e 11 de agentes instalados coincidiram em
SHA-256 com os do pacote publicado; comparação de bytes não prova execução.
O planejamento associou aos oito arquivos do router o motivo de metadados não
verificados e manteve os hashes Git anteriores. Uma tentativa de levar esse
motivo à lista de conflitos foi retirada: revisão independente identificou que
uma barreira estrutural pode ter seu motivo substituído no planejamento. A
versão atual mostra o registro de preservação associado ao mesmo caminho como
observação, sem afirmar que ele é a única causa do conflito. Os oito conflitos
do router e a verificação de outras barreiras continuam pendentes.
Uma fixture adicional em macOS e Linux comprovou que um link simbólico na
regra é identificado e preservado, incluindo seu destino externo; esse caso
isolado não elimina a hipótese para outras barreiras e caminhos do planejamento.
Com registros prévios de arquivo ou bloco, testes de `doctor` e `update
--dry-run` também retornaram `E_SYMLINK`, preservando o alvo, o estado e os
dados Git observados no macOS e no Linux. A recusa antecede o diagnóstico de
preservação; não demonstra o comportamento de outras barreiras estruturais.

Resultados, capturas e projetos temporários ficam fora do Git. Registre aqui
ou no roadmap as evidências, pendências e limites reais de cada etapa.

[reading-pt]: TASKS.md
[reading-en]: ../../en/tasks/evolucao-plataforma/TASKS.md
[reading-es]: ../../es/tasks/evolucao-plataforma/TASKS.md
