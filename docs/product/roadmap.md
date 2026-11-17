---
description: Entregas publicadas, especificações e próximos passos do AgentDevKit.
status: vigente
---

# Roadmap

O AgentDevKit compartilha recursos entre agentes e os instala em projetos
novos ou existentes, preservando os arquivos da equipe. O trabalho segue
produto, experiência, design, arquitetura, roadmap, spec, implementação e revisão.
O [PRD](prd.md), a [UX da CLI](ux-ui.md) e o [design técnico](design.md)
estão registrados como aprovados; isso não substitui os testes de cada entrega.

Este roadmap organiza o que já foi especificado e o que falta verificar.
`[x]` identifica uma **release publicada**; não significa que todos os
critérios das specs tenham sido novamente auditados. `[-]` indica trabalho em
andamento; `[ ]`, trabalho pendente. Os resultados dependem das evidências e
do ambiente indicado, não apenas de uma marcação neste documento.

## Entregas publicadas

As releases de `v0.0.1` a `v0.0.30` constam no [GitHub][releases]. O
[changelog][changelog] detalha cada versão; a tabela agrupa as entregas para
facilitar a leitura. As versões registram comportamento histórico e não
substituem as decisões mais recentes do projeto.

| Estado | Versões | Entrega | Especificações relacionadas |
| --- | --- | --- | --- |
| [x] | 0.0.1–0.0.3 | Distribuição, seleção de clientes e fontes compartilhadas. | [0.0.1][v1], [0.0.2][v2], [0.0.3][v3] |
| [x] | 0.0.4–0.0.6 | Estrutura do projeto, exemplos, registros, licença e apresentação. | [GitHub Packages][packages], [0.0.4][v4], [0.0.5][v5], [0.0.6][v6] |
| [x] | 0.0.7–0.0.10 | Projetos existentes, preservação, coexistência e dois registries. | [0.0.7][v7], [0.0.8][v8], [0.0.9][v9], [dois registries][dual], [0.0.10][v10] |
| [x] | 0.0.11–0.0.13 | Segurança local, integração aditiva e provas em projetos reais. | [segurança][security], [integração][additive], [projetos reais][real] |
| [x] | 0.0.14–0.0.16 | Preservação do ignore da raiz, especialistas e CI portátil. | [ignore do projeto][project-ignore], [desenvolvimento][development], [CI][ci] |
| [x] | 0.0.17–0.0.21 | Migração de estado, sincronização, ignore local histórico e tags. | [estado][state], [sincronização][sync], [ignore de clientes][client-ignore], [ferramenta][tool], [tags][tags] |
| [x] | 0.0.22–0.0.23 | Descoberta, preservação, destinos e ordem de implementação. | [descoberta][discovery], [destinos][targets], [ordem][order] |
| [x] | 0.0.24–0.0.27 | Proteção de conteúdo humano, revisão, índice e limites de consultas Git. | [descoberta][discovery], [sincronização][sync] |
| [x] | 0.0.28–0.0.30 | Preparo e execução de scripts, bootstrap e matriz de projetos. | [desenvolvimento][development], [descoberta][discovery] |

A [spec inicial][v1] organiza a primeira entrega; as demais estão no
[índice de specs][specs]. Uma spec aprovada registra escopo, não comprova por
si só que seus critérios continuam atendidos em todas as versões ou clientes.
O [controle das specs](spec-audit.md) reúne o estado da auditoria de cada uma.

## Prioridades e pendências

### 1. Preservação e confiabilidade

- [-] Validar e entregar a correção local da divergência entre o sync da CLI e
  o sincronizador direto. A candidata reconcilia a transição observada ao
  acrescentar metadados; bloqueia os estados ambíguos cobertos pelas fixtures,
  inclusive com `--force`, e revalida as dependências registradas para essa
  reconciliação antes e depois do backup. Isso não garante atomicidade após a
  última leitura. Os testes de
  regressão cobrem Claude, Codex, Gemini, conteúdo humano e índice staged em
  fixtures; integram o perfil portátil da pipeline. Referências já duplicadas
  não são reparadas automaticamente. A versão alterada ainda precisa de CI no
  Windows, revisão de migrações e validação antes da publicação; não foi aplicada
  ao router. Uma falha simulada de leitura do projeto também revelou diagnóstico
  preexistente com escopo `staging` incorreto; código e caminho foram mantidos.
  A revisão da migração também identificou limpeza de diretórios vazios sem
  comprovar sua criação pela operação; a preservação desse caso precisa de prova.
  A suíte de preservação Git passou em 140 testes no macOS e 139 no Linux;
  respectivamente um e dois casos foram pulados por dependências de plataforma.
- [-] Desenvolver a validação dos [registros de recuperação](../specs/registro-recuperacao/SPEC.md);
  implementar o [diário em disco](../specs/diario-disco/SPEC.md) e integrar
  [backup e manifesto](../specs/manifesto-recuperacao/SPEC.md), bloqueio e
  resolução em etapa posterior. O diário isolado agora recusa diretórios e
  registros com proprietário ou modo incompatível e detecta mudanças
  observáveis durante a leitura. Isso não comprova ACLs ou segurança contra
  trocas de ancestrais e não o integra ao instalador ou ao sync.
- [-] Corrigir a criação de temporários para não ampliar o modo de arquivos
  existentes; a [spec](../specs/sync-permissoes/SPEC.md) registra provas e limites.
- [-] Concluir e revisar as alterações locais de `init`, `update`, `sync`,
  diagnóstico e auditoria. Preservar arquivos humanos, conteúdo staged, índice,
  configuração Git e `.gitignore` do projeto; testar colisões, migrações,
  links, aliases de caminhos, falhas e recuperação.
  A consulta direta mostra caminhos conflitantes e os subprocessos Git da
  candidata desativam rastreamentos herdados sem alterar a configuração.
  As consultas de exclusão, índice e alterações staged usam idioma estável no
  subprocesso para reconhecer ausência de Git; sinais e erros inesperados
  continuam bloqueando. Os testes de exclusão e índice passaram em macOS e
  Linux com mensagens localizadas; Windows e as demais consultas Git ainda
  precisam de verificação específica.
  Um tarball local também passou `init`, `update` e `sync` em três fixtures
  Linux com Git em francês, sem repositório ou com índice staged; não foram
  testados registry, `npx` ou Windows nessa prova.
  Fixtures e revisão independente cobrem trace e Trace2 em macOS; testes locais
  também passaram em Linux. Isso não prova ausência de outros efeitos externos.
  No checkout atual, `sync --check` identifica nove conflitos preservados:
  cinco regras Claude sem propriedade comprovada, uma referência Git que pode
  continuar ativa globalmente e três catálogos sem histórico de propriedade.
  Após reconhecer referências integralmente idênticas sem adotá-las, a consulta
  passou de 1.077 para 453 derivações desatualizadas e manteve nove conflitos e
  uma exclusão local legada. Na versão anterior, uma fixture descartou um
  registro histórico desconhecido. O ajuste integrado cobre a mesma grafia;
  a reconciliação de aliases e de migrações ainda precisa de trabalho.
  Na candidata local, `doctor`, `sync --check` e o sync direto identificam
  registro de arquivo removido sem entrada no estado instalado quando
  a consulta alcança o diagnóstico. `sync --check` conserva a observação se o
  planejamento falhar depois da leitura; erros anteriores ainda podem ocultá-la.
  A candidata local preserva registros desconhecidos pela mesma grafia e
  bloqueia colisões no alvo; fixtures cobrem seleção, `--force` e blocos
  coexistentes. Aliases entre registros e metadados seguem sem prova completa.
  Uma revisão confirmou em fixture sintética que a migração de `estado` recria
  um arquivo correlacionado, mas conserva o registro antigo e o indica como
  modificado. O mesmo ocorre na base; uma guarda experimental falhou com
  `Derived.json` em volume insensível a caixa. Outra recusou esse caso e
  permitiu migração independente e foi integrada como bloqueio conservador;
  a reativação automática e aliases entre registros continuam pendentes.
  Em uma fixture com registros de arquivo e bloco coexistentes fora da seleção,
  a candidata preservou os três registros e permitiu operação independente;
  a origem natural desse estado não foi comprovada.
  Um protótipo para aliases bloqueou caminhos Unicode fisicamente distintos;
  uma tentativa de reduzir o bloqueio acrescentou bloco em fixture humana e
  preservou texto e índice, como permite o contrato. A fixture não tinha
  frontmatter e não comprova descoberta nem preservação de metadados.
  Após a integração, um tarball local passou instalação offline via `npx`,
  projeto novo, projeto existente e atualização em macOS. A prova não cobre
  registries publicados nem comprova todos os aliases ou metadados.
  Em oito fixtures da versão npm `0.0.21`, os caminhos Git e conteúdos humanos
  amostrados passaram nas comparações da atualização. Claude bloqueou em oito
  regras legadas; Codex, Copilot, Gemini, OpenCode e Cursor atualizaram, mas
  todos mantiveram `shared-ignore-legacy` no check. A variante Codex com regra
  Claude também informou ativação não verificada. O init antigo alterou
  `info/exclude` nas oito fixtures. Isso não autoriza remover regras existentes.
  Um protótipo de update preservou as regras e suas fontes em duas fixtures
  Claude, mas alterou skills Git referenciadas por elas. Ele retornou sucesso
  com aviso apesar da pendência; falta definir um status explícito. Não prova
  preservação de comportamento e permanece fora do kit.
  Compare candidatos e preserve conteúdo antes de resolver; não force o sync.
  Uma suíte específica passou em macOS e Linux com marcadores de exclusão
  antigos íntegros, alterados, truncados e múltiplos, além de worktree
  vinculada. Ela compara conteúdo Git e índices; os padrões legados continuam
  ativos e a prova não cobre metadados do sistema de arquivos nem Windows.
  A candidata bloqueia caminhos afetados por Git aninhado ou gitlink, inclusive
  backups; provas isoladas cobrem índices externos e internos, submódulos não
  relacionados e detecção durante a aplicação. Revisão e validação nos sistemas
  suportados continuam necessárias; a proteção não é atômica. O sync escolhe o
  nome do backup antes de consultar o índice, permitindo submódulos irmãos e
  recusando gitlinks coincidentes, inclusive ausentes no disco. Avaliar o mesmo
  falso bloqueio no instalador. O backup do sync cria arquivos exclusivamente,
  copia em blocos limitados e verifica identidade e hash antes de continuar;
  falhas na tentativa de criar a pasta ou durante a cópia informam seu caminho
  como incerto e não a removem. Isso não fixa os ancestrais nem elimina trocas
  após a última verificação. Definir e testar a política
  de leitura e geração a partir de fontes que estejam em um Git aninhado;
  a proteção atual cobre mutações, não impede essa leitura.
- [ ] Corrigir a recuperação diante de alterações concorrentes: há reprodução
  de substituição humana removida ou sobrescrita durante o rollback do
  instalador e da sincronização, inclusive após atualização e com conteúdo
  diferente. Revisar o rascunho de
  [recuperação conservadora](../specs/recuperacao-conservadora/SPEC.md),
  compará-lo à [spec histórica de rollback][v8] e documentar os limites.
  O rascunho registra uma reconciliação proposta: manter as garantias de
  preservação e substituir o rollback automático somente na futura versão que
  implementar e comprovar o novo contrato. O protocolo continua pendente.
  Provas e correções de concorrência durante a aplicação são trabalho separado;
  a correção da recuperação ainda não foi implementada. O perfil completo
  executa a regressão em modo estrito e bloqueia a certificação enquanto falhar.
  O instalador agora recusa caminhos exatamente duplicados e confere novamente
  caminhos e ações após o backup; fixtures cobrem criação, atualização, remoção
  e alterações mistas. Isso não protege aliases de caminhos nem alterações após
  a última verificação e não resolve a recuperação concorrente. Uma revisão
  estática identificou que alterações nos bytes do plano não são comparadas.
  A candidata recusa ações incompatíveis com o conteúdo ou com o estado
  anterior informado, antes da aplicação; oito cenários sintéticos passaram
  em macOS e Linux. Propriedades calculadas só são avaliadas durante a execução.
  Para acrescentar ou retirar bloco em conteúdo staged divergente, ela também
  repete a verificação de preservação com o estado e os bytes observados na
  aplicação. Casos de acréscimo Markdown e retirada TOML com edições staged e
  não staged passaram em macOS e Linux; a verificação não impede mudança
  posterior do próprio plano em memória.
  Para esses blocos staged, a candidata valida e publica uma cópia privada dos
  bytes propostos; migração e demais ações ainda não usam esse mecanismo.
  No Gemini, adicionar e remover um bloco pode reserializar o valor TOML de
  `prompt` e manter quebras de linha extras ou uma atribuição antes ausente.
  Em seis exemplos, um parser independente confirmou que a volta não preservou
  nem os bytes nem o valor original do documento. Um protótipo isolado com
  metadados no bloco passou 1.024 variações das quatro formas de string e 256
  casos sem `prompt`, com parser independente. São exemplos sintéticos, não
  projetos distintos; ainda não comprovam propriedade, legado ou integração.
  O carregador local do Gemini 0.67.0 aceitou os estágios aplicáveis em cinco
  fixtures isoladas, sem rede ou inferência; isso não comprova execução do
  comando, processamento de referências ou comportamento do modelo. A prova
  também observou o helper público `0.0.21`: as cinco fixtures não voltaram ao
  valor e aos bytes originais. A prova versionada
  `tests/toml-preservation-proof.mjs` apontou 40 diferenças na implementação
  anterior. Com a candidata integrada, os 40 casos restauraram os bytes em
  macOS; essa prova não usa parser independente ou cliente real.
  Uma prova posterior do carregador expandiu um arquivo sintético incluído e
  confirmou duplicação de argumentos quando o TOML e a inclusão contêm
  `{{args}}`. A CLI e o sync agora usam a mesma regra de argumentos para o
  texto humano do TOML. Na implementação anterior, em 20 fixtures Linux o
  marcador permaneceu único, mas a restauração byte a byte falhou. O
  parser semântico dessa matriz é o do kit, não uma verificação independente.
  Na candidata integrada, esses 20 ciclos passaram em Linux, inclusive a
  restauração dos bytes e a verificação do comentário de proveniência. Um
  leitor restrito às fixtures compara os bytes humanos sem usar a restauração
  do kit; o parser semântico e o digest continuam sendo os do produto. BOM e
  CRLF foram exercitados em fixtures sintéticas. O TOML não estava staged e
  esses ciclos não incluíram `update` ou edição humana intermediária.
  Essas provas não incluem resposta de modelo ou sessão completa do Gemini.
  A validação TOML da candidata passou a aceitar inteiros de 64 bits sem
  convertê-los para `Number`. Uma fixture com inteiro maior que a precisão de
  `Number` passou por `init`, `update` e os dois caminhos de `sync` em macOS
  e Linux, preservando os bytes do inteiro e os arquivos Git observados. Essa
  prova não cobre a restauração integral do prompt nem TOML arbitrário; o
  Windows continua pendente.
  A candidata registra proveniência em comentário externo ao prompt, vinculada
  ao digest existente. Um ciclo de downgrade para a CLI `0.0.21` foi recusado
  preservando os arquivos observados; isso não garante todas as versões ou
  situações. Não presumir a forma original de arquivos legados.
  O carregador local do Gemini 0.67.0 aceitou as quatro formas de comandos V3
  gerados pelo helper, expandindo um argumento e uma referência sintéticos;
  um parser independente também aceitou os arquivos. A prova não executou o
  fluxo de instalação nem modelo. Em outras fixtures, TOML staged divergente
  provocou recusas conservadoras em `init`, `update` e nos dois syncs; a troca
  de cliente preservou o índice e o texto humano em macOS e Linux. Windows e
  outras combinações staged permanecem pendentes.
  A CLI agora preserva um TOML preexistente com bloco sem propriedade
  comprovada e instala os demais recursos; quatro fixtures cobrem `init` e
  `sync`, com blocos idênticos ou diferentes e índice staged. Essa prova de
  propriedade não cobre a restauração de prompts com bloco novo.
  Em outra fixture, um hash antigo preparado manualmente em `derived.files`
  permaneceu após o TOML humano ser preservado. Nenhuma perda foi observada;
  `sync --check` retornou sucesso apesar desse registro. A origem natural dessa
  persistência e sua política de descarte ainda precisam de investigação. Em
  outro fluxo natural, um registro antigo coexistiu
  temporariamente com um novo bloco e foi consolidado pelo sync seguinte; o
  prompt resultante apresentou duas referências à mesma origem. Em fixture
  isolada, o carregador Gemini expandiu ambas; não houve chamada de modelo. A
  correção local preserva sem adoção um prompt integralmente equivalente ao
  gerado. O parser e sua licença acompanham o kit; prompts diferentes e a
  remoção seguem a candidata de preservação TOML,
  ainda sujeita aos critérios e limites da spec.
  O [rascunho de preservação TOML](../specs/toml-preservacao/SPEC.md) registra
  os critérios, os casos ambíguos e a validação necessária.
  Validar as demais hipóteses e projetar um plano imutável continuam pendentes.
  Os novos testes são ignorados no Windows.
  A perda foi reproduzida em macOS e Linux; a prova específica em Windows está
  pendente. Após acrescentar os seis controles de proteção, a suíte estrita no
  macOS teve 9 aprovações, 23 falhas e 3 testes ignorados. As falhas incluem
  sobrescrita após atualização, limpeza após publicação e perda de metadados.
  A matriz CI também exige o perfil nativo de macOS, que rejeita testes
  ausentes, ignorados ou pendentes e permanece bloqueado pelas falhas reais.
  Outra fixture reproduziu em macOS e Linux a criação de arquivo fora do
  projeto quando um escritor troca um ancestral do backup por link antes da
  abertura. A criação exclusiva protege o nome final, não os ancestrais.
  Um protótipo POSIX com `openat` evitou o link na fixture, mas não impede que
  a própria pasta aberta seja movida para fora antes da criação.
  Outra reprodução altera o backup após a verificação de conteúdo e antes dos
  timestamps; o sync pode anunciar a cópia alterada como válida.
  Os cenários atuais não cobrem todas as formas de alteração.
  Na resposta imediata a uma falha possivelmente parcial de planejamento,
  aplicação ou ferramenta, a CLI orienta revisão e não sugere nova mutação.
  O incremento local também informa caminhos de backup conhecidos em falhas,
  sem afirmar que as cópias estejam completas, e distingue caminhos de estágio
  em fixtures. O sync direto avisa quando a aplicação pode ter ficado parcial.
  Isso não registra pendência persistente nem corrige o rollback.
  Uma investigação local de init, migração e remoção demonstrou que a captura
  precisa incluir diretórios; a raiz de projeto ausente e o plano prévio do
  sync direto permanecem pendentes. Ela cobre apenas chamadas instrumentadas.
  O sync agora usa a mesma sequência interna de ações lógicas para calcular
  caminhos afetados e executar escritas e remoções. Cada escrita inclui os
  pais candidatos, verificados novamente no momento da criação. A sequência
  não representa temporários, backups ou rollback e não é plano de recuperação.
  O instalador também calcula e reutiliza candidatos à poda de diretórios;
  a lista é condicional e não cobre todos os efeitos nem captura seus dados.
  Na aplicação do plano e no sync direto, o nome temporário é preservado após
  `rename` bem-sucedido, evitando apagar uma recriação concorrente nesse ponto.
  Após planejamento bem-sucedido, ainda tenta remover o estágio recursivamente.
  Um rename
  entre hardlinks do mesmo inode pode deixar o nome original sem aviso;
  a limpeza após publicação por hardlink continua pendente.
  Em falha na criação exclusiva, a aplicação do plano e o sync direto
  preservam e reportam o nome incerto, inclusive em colisões e gravações
  parciais; isso não comprova sua existência. Quando o sync do estágio privado
  informa caminhos incertos, o estágio também é mantido e reportado. Outras
  formas de falha e alterações concorrentes ainda precisam de verificação.
  Erros antes ou depois da tentativa de publicação também preservam o nome
  temporário incerto; isso não corrige a limpeza após publicação bem-sucedida.
  No sync direto, falhas antes da tentativa de publicação não restauram o
  grupo inalterado sem ações anteriores. Uma alteração concorrente observada
  é preservada mesmo se tiver os bytes planejados; em falha pré-publicação, a
  limpeza não remove o temporário criado e informa seu caminho como incerto.
  A proteção não abrange
  rollback de grupos já alterados, diretórios ou falhas de publicação ambíguas.
- [-] Garantir proteção e diagnóstico dos backups que podem conter dados
  privados. Uma fixture confirmou que eles podem aparecer no Git quando o
  projeto não os ignora. Preserve o índice, os ignores e a configuração Git;
  não presuma que o diretório de backup esteja protegido. A spec de
  [backup privado](../specs/backup-privado/SPEC.md) cobre a pasta do instalador;
  há correção local em avaliação. ACLs, Windows e o restante da recuperação
  exigem validação separada.
- [ ] Preservar metadados nativos de arquivos existentes. Fixtures em macOS
  reproduziram perda de ACL e atributos estendidos na `0.0.21` e na candidata;
  os backups testados também não os preservaram. Na candidata, o sync direto
  também perdeu ambos ao atualizar o catálogo. Fixtures Linux em tmpfs
  reproduziram a perda de xattr no instalador, no backup e no sync; ACL Linux
  continua sem prova. Definir comportamento seguro e testar `init`, `update` e
  `sync` em cada sistema suportado. Em fixtures macOS, uma ACL que negava
  escrita foi perdida quando o instalador complementou `AGENTS.md` existente e
  quando o sync atualizou o catálogo; ambas as operações retornaram sucesso.
  A flag imutável `uchg` bloqueou a substituição nos dois cenários observados.
  Os testes de ACL devem distinguir regras benignas de negações de escrita.
  Antes da proteção atual, `update` e os dois modos de sync perderam um atributo
  sintético em TOML Gemini misto em macOS e Linux. No macOS, a candidata agora
  recusa alterações quando o utilitário lista atributos no arquivo planejado ou
  não consegue verificá-los; a regressão desses três fluxos passou por recusa.
  A listagem não comprova atributos ocultos, ACLs, flags ou autorização; Linux
  ainda precisa de solução, e a regressão não cobre Windows ou todos os metadados.
  Um helper experimental no macOS copiou uma ACL benigna e um atributo entre
  arquivos sintéticos; ainda não comprova autorização nem integra o pacote.
  No Linux arm64, um protótipo consultou o tamanho da lista de nomes de xattrs
  acessíveis com o mesmo binário em duas imagens glibc e musl. A consulta básica
  também passou em x64 sob tradução, em `tmpfs` e `overlayfs`, sem executar o
  kit. As provas não abrangem x64 nativo, atributos ocultos, ACLs, distribuição
  ou preservação integral.
  Em outra fixture `overlayfs`, ACL benigna e xattr foram copiados entre arquivos;
  tmpfs retornou `ENOTSUP` e musl não carregou ou resolveu a biblioteca. O backup
  demonstrativo não testou restauração nem comprovou autorização ou sigilo.
  Em outro ensaio isolado, um addon temporário copiou ACL benigna e três xattrs
  para backup e arquivo atualizado em `overlayfs` ARM64, com glibc e musl;
  o leitor independente conferiu valores. O fallback e a integração não foram
  comprovados, e outros namespaces dependem de uma checagem feita pelo ensaio.
  Um pacote npm sintético instalou esse binário offline nas duas imagens, sem
  scripts ou compilador no PATH da instalação. Isso não testa `npx` nem o kit.
  Uma cópia experimental do kit passou 48 cenários de atualização e sync:
  24 ARM64 e 24 x64 sob tradução, com 12 alterações e 36 recusas esperadas por
  atributo sintético ou addon ausente ou corrompido.
  Em musl, o Git veio de um wrapper glibc; x64 nativo, suporte a ACL benigna no
  kit e distribuição permanecem sem prova. Uma reconstrução na mesma imagem produziu
  o mesmo hash do addon; fonte e build não estão versionados nem validados em
  CI. Essa cópia permanece isolada e não foi publicada.
  Em macOS e Linux, o sync direto e a aplicação pela CLI agora recusam alterações
  planejadas em arquivos regulares com bits POSIX especiais. Essa proteção não
  cobre diretórios, ACLs/xattrs ou os planos exibidos por `--check` e `--dry-run`.
- [-] Diagnosticar registros derivados divergentes sem substituir TOML humano.
  Após uma edição humana e `update`, `doctor` e `sync --check` retornavam sucesso
  apesar do hash antigo. Para TOML preservado, a candidata informa divergência,
  ausência ou leitura não verificável nesses comandos; o check direto ainda não
  identifica o caminho. Ausência e erro foram cobertos por testes unitários.
  A correção não resolve a ambiguidade de propriedade quando bytes antigos voltam.
- [-] Aplicar a decisão atual: novas operações não devem alterar a configuração
  Git, editar `.git/info/exclude` nem criar ou alterar ignores na raiz ou nos
  clientes. Ignores existentes no hub também são preservados. Alguns arquivos
  podem aparecer no `git status`; o diagnóstico deve avisar sobre arquivos
  privados visíveis.
  Critérios históricos, como os de [ignore do projeto][project-ignore],
  [ignore de clientes][client-ignore], [integração][additive], [0.0.3][v3],
  [0.0.7][v7] e [estado][state], precisam ser revisados antes de servirem como
  contrato para essa evolução.
- [-] Validar os ajustes de regras do Copilot e a preservação de regras e
  metadados humanos. A descoberta e o carregamento variam por cliente; uma
  referência gerada não prova a execução da regra ou skill.
- [-] Corrigir o [escopo de regras Claude](../specs/escopo-regras-claude/SPEC.md)
  e migrar apontamentos sem ampliar ativação nem apagar conteúdo humano. O
  planejador agora está conectado ao sync local, com preservação conservadora
  de regras legadas e diagnóstico de escopo não verificado. A revisão passou
  nos testes de recursos no macOS e de projetos no Linux. Uma prova com Claude
  confirmou o carregamento por `paths` em regra gerada pelo sync integrado e
  a leitura explícita da origem em sessão separada; ela não prova leitura
  automática. Outra prova com Claude carregou na abertura tanto `always_on`
  quanto `model_decision` legadas sem `paths`; chamadas `Read` às fontes só
  ocorreram na sessão que pediu leitura explícita. São fixtures com sandbox e
  não provam obediência nem comportamento de todos os clientes. Persistem a
  validação Windows, a prova da geração pelo instalador e a recuperação
  concorrente. Uma tentativa de observar a regra no router parou antes de
  iniciar o modelo porque o isolamento bloqueou uma área temporária
  compartilhada; seu carregamento naquele projeto não foi verificado. O ajuste
  ainda não foi aplicado ao projeto consumidor nem publicado.
  Em laboratório, uma interrupção deliberada do protótipo deixou um apontamento
  sem registro; a retomada informou pendência. O protótipo não foi integrado e
  precisa de recuperação confiável antes de uso em projetos existentes.
- [-] Validar a skill de implementação em clientes reais. Em uma fixture com
  spec em rascunho, o Claude leu a skill, interrompeu a implementação e
  preservou arquivos e índice. Uma primeira resposta sugeriu dispensar PRD ou
  design; após esclarecer a regra na skill, outra sessão os reconheceu como
  obrigatórios. São sessões isoladas, sem shell, e não comprovam execução de
  testes, consulta ao remoto ou comportamento em outros projetos.
  Após renovar o Claude, uma prova da 0.0.21 delegou ao implementador e tentou
  editar sem spec; o sandbox bloqueou a edição. No pacote local atualizado, o
  perfil declarou a skill, o Claude leu sua origem e não tentou editar. Mesmo
  após esclarecer a ordem, outra sessão sugeriu criar a spec antes de comprovar
  a preparação do projeto. Cada resultado é de uma sessão isolada, sem comprovar
  comportamento em projeto gravável; a orientação de etapas permanece pendente.
  A CLI local agora distingue produto de preparação de ambiente com `next` e
  `--intent`, sem executar a etapa; a resposta continua exigindo conferência das
  evidências. No modo de produto, avisos no inventário documental interrompem a
  sugestão de etapa, inclusive por links não seguidos. Em outra sessão, o Claude
  indicou a ordem, mas ofereceu implementar
  sem spec. Na repetição, não ofereceu a dispensa, mas voltou a sugerir a spec
  sem confirmar a preparação; o comportamento continua em revisão.
  Em uma prova assistida posterior, leu o JSON produzido pela CLI e indicou a
  preparação primeiro; a sessão não demonstra que chamaria a CLI por conta própria.
- [-] Comprovar criação e uso de skills em sessões distintas. Com a candidata
  local `0.0.30`, o Claude criou uma skill de resumo de CSV em projeto sintético
  com Git preexistente; o controlador sincronizou e `--check` passou. Outra
  sessão descobriu a skill, leu sua origem e o CSV e respondeu quatro registros
  e soma 36, conferidos independentemente. Índice, ignores e arquivos humanos
  verificados permaneceram iguais. A prova não cobre a versão pública `0.0.21`,
  outros clientes ou alterações transitórias; o Claude não executou o sync.
- [-] Verificar compartilhamento entre clientes. O Copilot descobriu e chamou a
  skill criada pelo Claude, leu sua fonte e um novo CSV com campo entre aspas
  e valor inválido, e reproduziu uma instrução presente somente na fonte. A
  soma e a linha inválida coincidiram com o cálculo independente. O mesmo caso
  passou com a candidata local e com o pacote npm `0.0.21`, usando uma cópia da
  skill já criada. Em uma sessão anterior, não houve leitura separada da fonte;
  a resposta correta, sozinha, não comprova que suas instruções foram seguidas.
  Na fixture da versão publicada, `init` alterou `.git/info/exclude`, preservando
  o trecho humano; índice e `.gitignore` permaneceram iguais. O teste cobre
  somente esses clientes e cenários, sem comprovar ausência de mudanças
  transitórias.
- [-] Ao criar agente com YAMLs nativos, usar o `sync` da CLI para recompor o
  manifesto e verificar o frontmatter gerado. O script direto pode validar um
  manifesto anterior sem incorporar os novos YAMLs. Uma fixture com Claude e
  Copilot confirmou a diferença na candidata local e no pacote público
  `0.0.21`. O índice e o `.gitignore` foram preservados; a versão pública
  alterou `.git/info/exclude` no init. Uma sessão Copilot posterior descobriu e
  acionou o perfil sintético: o subagente leu notas e retornou os identificadores
  esperados. Em outra sessão, ele também leu a fonte e incluiu uma instrução
  presente somente nela; houve tentativa malsucedida de leitura fora do projeto
  e leitura da pasta temporária que o continha. As permissões nativas não foram
  comprovadas isoladamente e o perfil foi criado pelo controlador.
- [ ] Revisar conflitos e apontamentos desatualizados na sincronização do
  checkout de desenvolvimento, sem apagar conteúdo ou exclusões Git existentes.
  A situação depende dos arquivos e configurações locais de cada ambiente.
- [ ] Executar a suíte completa do estado final, incluindo o pacote instalado,
  e acompanhar a matriz real em Linux, Windows e macOS. Os casos NTFS, skips,
  volumes sem hardlinks e limites de concorrência devem ter resultado explícito.
- [ ] Atualizar a documentação e registrar evidências e revisão independente
  do diff final antes de criar commit, tag ou publicar uma nova versão.

### 2. Provas em projetos e clientes

A matriz base define 40 projetos sintéticos; sua ampliação e revisão estão em
andamento. Um teste separado verifica em memória 16.383 combinações de seleção
de clientes. Há também fluxos com decisões simuladas. Essas verificações não
comprovam a execução de cada skill e perfil em cada projeto ou cliente; seus
limites estão descritos nos respectivos testes.

Após integrar o ajuste de escopo Claude, o mesmo pacote local foi exercitado em
40 projetos no macOS e 40 no Linux: em cada sistema, 34 passaram e 6 ficaram
não verificados, sem falhas classificadas. Os seis incluem Claude e mantêm
pendente a comprovação do escopo nativo da regra Git; a fonte disponível para
consulta explícita não comprova sua ativação. Essas rodadas são estruturais e
não demonstram execução de cada skill ou perfil.

- [-] Ampliar os testes em projetos vazios e existentes, inclusive arquivos de
  agentes próprios, staged, colisões, seleção de clientes e operações repetidas.
  Gerar projetos e resultados fora do Git ou em destino comprovadamente ignorado;
  manter o código dos testes versionado.
  Em uma prova parcial de `preparar-dev`, Claude leu o projeto sintético sem
  editá-lo; uma repetição reconheceu o `.gitignore` e uma variável opcional.
  O teste automatizado foi executado pelo controlador, não pelo agente; setup,
  serviços e uso em outros projetos ou clientes continuam sem comprovação. A
  sessão não comprovou o ignore efetivo nem a ausência do arquivo `.env`.
  Em consultas isoladas de `gerenciar-roadmap`, Claude reconheceu dependências
  e tarefas; na repetição, distinguiu tarefa pendente de código não verificado.
  A resposta ainda teve uma afirmação ambígua sobre evidências não lidas.
  Em outra fixture, atualizou somente a linha pedida de um roadmap staged,
  preservando o índice; informou que não executou a sincronização requerida.
  Em consulta de `atualizar-documentacao`, identificou comandos divergentes sem
  executá-los. Após ajuste da skill, não presumiu um script obrigatório, mas
  apresentou como opcional a revisão exigida para uma entrega com alterações.
- [ ] Repetir as provas em projetos públicos reais, com revisões fixas e o
  pacote candidato. O comando
  `test:oss` é separado de `npm test`; registrar projetos, versões, resultados
  e bloqueios sem incluir clones ou relatórios no Git.
- [ ] Conferir o inventário dos catálogos contra as fontes reais antes de medir
  cobertura; reconstruir índices em cópias de teste, preservando o checkout.
- [ ] Manter uma matriz por projeto, cliente e skill ou perfil aplicável, com
  versão, recurso carregado, resultado e evidência. Distinguir estrutura,
  descoberta e execução real; registrar bloqueios e casos não aplicáveis.
  Combinações de seleção não substituem provas de execução em cada cliente.
- [ ] Manter as evidências da instalação `0.0.21` em projeto consumidor
  separadas das alterações futuras do kit; antes de nova aplicação, conferir
  novamente arquivos existentes, índice e `.gitignore` do projeto. Localizar e
  tornar consultável o relatório dessa instalação sem expor dados privados.
  Em consulta com escrita bloqueada no router, o `doctor` público `0.0.21`
  retornou `issues: []`; a candidata `0.0.30` apontou 52 diferenças, oito
  conflitos Claude e uma exclusão local legada. Os diagnósticos usam contratos
  diferentes: não equivalem a uma falha comprovada da versão instalada. Índice,
  `.gitignore` e `exclude` mantiveram os hashes observados antes da consulta.

Na [CI do commit da tag `v0.0.21`](https://github.com/pathbit/AgentDevKit/actions/runs/43498629228),
os três jobs Windows examinados registraram 106 aprovações e 16 testes
ignorados, incluindo links simbólicos e permissões POSIX. A
[release](https://github.com/pathbit/AgentDevKit/actions/runs/43499951587)
associou o artefato ao mesmo commit; o hash do tarball nele contido coincide
com o tarball consultado no npm. Essa prova não cobre os testes ignorados,
todas as skills ou o estado local posterior. A VM Windows do host permanece
desligada e sua configuração de rede e compartilhamento não foi alterada.

Na verificação local do consumidor, os arquivos gerenciados e os blocos
registrados da instalação `0.0.21` coincidiram com seus hashes, e o diagnóstico
passou sem alterar os arquivos Git monitorados. Em 40 projetos sintéticos, porém,
o `init` da mesma versão alterou `.git/info/exclude` em todos os casos: esse
comportamento histórico contraria a decisão atual e impede declarar a versão
compatível com ela. Uma fixture de worktree confirmou que as exclusões também
afetam a árvore principal. No consumidor, uma comparação de antes e depois da
atualização registrou o exclude inalterado; a origem anterior do bloco existente
não foi comprovada e ele foi preservado.
Em 1.000 cenários sintéticos, as cinco etapas tiveram retorno operacional de
sucesso. Todos continuam falhos pela alteração do exclude; não houve outro
desvio nos snapshots monitorados. O mapeamento de parte dos recursos permaneceu
não verificado. As provas das cinco etapas ocorreram em macOS: 600 casos com
Node 24 e 400 com Node 26; elas não comprovam Windows nem Linux.
Em comparação, um pacote local candidato `0.0.30` passou as cinco etapas e a
cobertura estrutural em 40 projetos sintéticos no macOS e outros 40 em container
Linux. Esses lotes não comprovam metadados nativos, recuperação concorrente,
execução de agentes ou migração a partir de outra versão gerenciada; a candidata
ainda não foi publicada.

Outra rodada local com 40 projetos sintéticos e uma cópia empacotada da
candidata `0.0.30` teve 34 cenários aprovados e seis não verificados. Os seis
incluíam Claude e não comprovaram a equivalência de escopo da regra Git nativa.
A rodada verificou instalação e preservação observadas, sem executar os fluxos
dos agentes; o pacote testado antecede ajustes posteriores nas skills.
Uma matriz ampliada no macOS executou as cinco etapas em 1.000 projetos
sintéticos: 792 passaram e 208 ficaram não verificados pelo mesmo limite de
escopo Claude. O resultado geral ficou `not-verified`; `sync --check` não
aplicou alterações. A cópia testada antecede ajustes posteriores no checkout.
Uma fixture no macOS iniciou a CLI com Node 18.20.8, que delega a execução a
Node 24 ou superior; a versão efetiva do processo delegado não foi registrada.
Após preparar uma skill própria no índice, `sync` gerou seu apontamento e
preservou os hashes observados; o `update` da mesma versão informou
`changed: false`. Isso não prova migração, execução nativa ou outros sistemas.
Um teste versionado agora prepara o Node 24 em um pacote temporário para
exercitar a entrada por Node 18 sem depender do cache do checkout. Ele passou
no macOS e em Linux com rede bloqueada no contêiner. A matriz CI propõe
executá-lo nos três sistemas; Windows ainda requer execução real.

Uma matriz verificou 1.456 entradas estruturais em 28 projetos sintéticos, com
o pacote publicado `0.0.21` e uma candidata local `0.0.30`. Em cada pacote,
observou 186 descobertas: skills do Gemini e do Copilot e perfis do OpenCode,
em projetos novos e existentes; as outras 1.270 não foram executadas. Essas
matrizes não executaram os fluxos das skills ou perfis. A candidata ainda precisa
de revisão e de testes completos, inclusive da recuperação concorrente.
No router, uma auditoria somente de leitura conferiu 41 skills, 11 perfis,
18 comandos e oito regras nas 14 raízes selecionadas: 1.092 apontamentos
reconhecidos resolvem para suas fontes. A conferência de comandos e regras se
limita aos arquivos registrados no estado. Isso não prova descoberta, execução
ou escopo ativo nos clientes.
Em provas separadas com inferência no Copilot, as 41 skills da `0.0.21` foram
invocadas e suas origens lidas em um projeto novo e em um existente. Marcadores
sintéticos e eventos comprovaram cada leitura; os fluxos completos das skills
não foram executados. Cada lote consumiu uma solicitação premium.
Um inventário encontrou pelo menos um cenário nominal para cada uma das 41
skills. Há provas parciais, recusas e falhas; isso não comprova todos os fluxos
nem todos os clientes ou projetos. Uma prova exercitou `git-diff`, distinguindo
mudanças staged e unstaged. Skills alteradas após a publicação da versão
`0.0.21` exigem validação funcional própria.
Em sessões de `git-worktree`, uma resposta interpretou `AM` incorretamente e
outra, após ajuste da skill, distinguiu as alterações preparadas e locais. As
duas tiveram outras afirmações não comprovadas; o índice observado foi preservado.
Uma prova posterior exercitou `criar-ux-ui`: diante de PRD em rascunho, o Claude
identificou a aprovação pendente e não criou o documento. As lacunas coexistiam
e não foram testadas separadamente; o Git foi criado após o `init`.
Em outra fixture com Git preexistente, duas sessões atribuíram ao documento UX
marcadores que estavam no template, mas não no documento. A skill foi ajustada;
a repetição ainda mostrou a imprecisão, que permanece pendente de correção.
Outra prova exercitou `git-fetch` entre repositórios sintéticos locais: a ref
remota avançou e um blob novo foi transferido sem integrar commits nem alterar
o índice e o arquivo humano.
Em outra fixture, `git-log` executou uma consulta Git real e identificou dois
commits sintéticos, com índice, refs e árvore observados preservados;
`validar-adversarial` criou um teste temporário que expôs uma falha de
fronteira, confirmada por execução independente. O pipeline usado pelo agente
naquela sessão não comprovava o código de saída do teste. A skill local agora
orienta preservar esse código; em outra fixture, o Claude executou o teste
diretamente e relatou a saída 1 com uma revisão intermediária da skill. A prova
usou sandbox e skill sobreposta a pacote local; não comprova pipeline,
comportamento determinístico ou versão publicada.
Em outra sessão com a skill atual, o teste passou e o Claude informou que a
ferramenta não expôs o código numérico. A fixture também usou sandbox; a
orientação sobre pipeline permanece sem prova de execução.
Três sessões individuais com o Claude e fontes atuais verificaram respostas
limitadas: `avaliar-performance` reconheceu falta de medições,
`avaliar-arquitetura` apontou decisões ausentes e `revisar-codigo` identificou
um defeito sintético confirmado por execução independente. O agente só leu
arquivos; as sessões não comprovam benchmarks ou fluxos completos.
Em outra consulta de performance, uma proposta de orientação sobre custo de
percurso não eliminou uma resposta contraditória ao repetir o mesmo exemplo e
prompt; ela não foi integrada e não houve medição.
Em outra revisão sintética somente por leitura, Claude invocou `revisar-codigo`
e identificou a fórmula incorreta; extrapolou a cobertura da suíte a partir de
um único arquivo. A sessão não executou testes nem invocou `validar-adversarial`.
Em uma prova de `verificar-trabalho`, o cliente reconheceu dois critérios sem
evidência e não concluiu a entrega, mas aprovou um critério geral a partir de
dois exemplos. Ele apenas leu a saída de teste executado pelo controlador.
A skill foi esclarecida; na repetição, o cliente ainda aprovou o critério,
interpretando-o como os dois exemplos. A abrangência pode ser ambígua, e a
prova não demonstra o comportamento geral da skill.
Em `implementar-backend`, Claude identificou uma spec em rascunho e parou, mas
sugeriu o plano antes de conferir a configuração e a ordem dos pré-requisitos.
A skill foi esclarecida; na repetição, sugeriu aprovar a spec antes do plano,
mas não consultou `implementar-spec`, `proximos-passos` ou o estado de
configuração. As provas foram somente de leitura e o prompt já impedia a
implementação.
Em `implementar-frontend`, Claude leu a spec e parou diante de rascunhos, mas
sugeriu aprovações antes de verificar todas as fases e atribuiu ao roadmap uma
aprovação não exigida pela skill. Após esclarecimento da skill, leu também
`proximos-passos` e tentou ler o estado ausente, mas ainda sugeriu UX antes de
resolver a configuração. As sessões não executaram testes ou navegador.
Em outra consulta de performance, o agente não inventou medições, mas
generalizou uma hipótese sobre entradas que um controle sintético contradisse.
A skill foi ajustada, mas a generalização persistiu na repetição. A prova não
estabelece falha de requisito de tipos.
Em outra prova de `avaliar-arquitetura`, o Claude extrapolou a partir de um
módulo e apresentou garantias sem todas as condições. A skill foi esclarecida,
mas repetições ainda tiveram afirmações além dos arquivos lidos; o comportamento
permanece pendente de correção e nova validação.
Em outra fixture, o Copilot carregou `criar-spec` da candidata local, pediu os
pré-requisitos ausentes e não criou uma spec. O shell foi negado e o inventário
automatizado não foi executado; snapshots de conteúdo não verificam metadados.
Outros cenários criaram uma branch e fizeram push para um remoto bare local,
preservando o índice e as alterações humanas sintéticas. O push não testou
divergência ou provedores externos.
No merge, uma fixture com alterações sobrepostas foi preservada por recusa;
outra, limpa e sem conflitos, produziu um commit com os dois pais esperados.
Em outra fixture, `criar-agente` gerou um apontamento após ajuste manual do
manifesto, mas o sync alterou o exclude; a invocação do perfil não foi testada.
`criar-skill` gerou fonte e apontamento, mas também alterou o exclude; o
`--check` passou e não detectou esse desvio. A nova skill não foi executada.
Na candidata local, outra prova preservou o Git observado e sincronizou a
skill; o check passou com avisos de visibilidade. O Claude ainda relatou
incorretamente a ausência de entradas existentes nos catálogos e alegou
descoberta sem comprová-la. A nova skill não foi invocada.
`criar-comando` também alterou o exclude e produziu restrições imprecisas de
argumentos. Em repetição com orientação local, não repetiu essas restrições e
executou `--plan`, mas o sync continuou alterando o exclude da versão publicada.
`criar-regra` gerou apontamento no Claude sem preservar o escopo condicional;
a sessão expirou. Uma prova nativa confirmou carregamento inicial de regras
manuais e com glob também na candidata local. A correção permanece pendente.
Em outra fixture, um subagente leu a skill explicitamente e configurou um glob
com sidecar Claude: os apontamentos gerados para Claude e Copilot mantiveram o
escopo informado. A prova conferiu arquivos, sem executar os clientes ou
comprovar sua ativação efetiva; não substitui a sessão que expirou.
Em novas fixtures com a candidata local, `criar-comando` gerou e sincronizou o
apontamento; o comando não foi invocado, e tentativas de executar seu script
dependente foram bloqueadas. `criar-regra` gerou a fonte, o sidecar Claude e o
apontamento Copilot; o controlador sincronizou o apontamento Claude depois.
O Git observado foi preservado nas sessões. Em prova posterior, o Claude
carregou a regra para um arquivo correspondente ao glob e não a carregou para
um arquivo fora dele; isso não comprova obediência ou ativação no Copilot.
No Copilot CLI, uma prova com os mesmos caminhos registrou descoberta
contextual apenas dentro do glob; a leitura e aplicação da fonte permaneceram
não verificadas. Em outra sessão, o cliente leu a fonte no caso correspondente
e usou uma instrução sintética; no controle fora do glob, não a leu. Isso não
garante o comportamento em outras sessões ou versões.
No router, `.claude/rules/git/RULE.md` também declara `model_decision` sem
`paths`; essa inspeção não comprova como cada sessão do projeto usou a regra.
`executar-script` informou corretamente um `--check` falho, mas não houve
bootstrap observado; o diagnóstico consultou o Docker local e a resposta
confundiu o mínimo de Node com a versão do npm.
As skills atuais agora distinguem o mínimo do Node da verificação do npm. Uma
avaliação independente somente de leitura mediu Node e npm separadamente e
identificou os limites da consulta; ela não executou bootstrap ou script.
Em outra fixture Linux isolada, um subagente leu a skill explicitamente: o
plano não executou o script e o bootstrap realizou diagnóstico e execução,
preservando seis argumentos e os arquivos Git observados. A rede estava
bloqueada. Isso não testa descoberta nativa da skill, obediência de um modelo
offline, outras plataformas ou alterações transitórias revertidas.
Em fixture separada, um subagente aplicou `verificar-trabalho`: distinguiu um
aceite aprovado, um falho e um não verificável, preservando os arquivos Git
observados. A revisão foi preparada, mas seu check parou primeiro numa decisão
de documentação pendente; ele não chegou a avaliar os aceites. A leitura da
skill foi explícita e não demonstra descoberta nativa ou execução de modelo.
As provas de roadmap e preparação do ambiente ficaram parciais; o check offline
de ferramenta ausente não executou bootstrap nem verificou o npm. A invocação
direta de sync repetiu a alteração indevida de exclude mesmo com `--check` verde.
Na candidata local, a orientação de `sincronizar-agentes` foi corrigida: o
sync preserva ignores existentes e não cria ignores nos clientes. Numa fixture
Git com conteúdo staged, índice, exclude e ignores monitorados permaneceram
iguais após `init`, `update`, `sync --check` e `sync --force`; a prova não
detecta alterações transitórias nem verifica ACLs, atributos estendidos ou
edições concorrentes.
Em outra fixture Linux com Git e conteúdo staged, um subagente leu a skill
explicitamente e executou plano, sync e check. Um recurso livre recebeu o
apontamento; um arquivo humano colidido foi complementado com o bloco esperado,
mantendo seu texto original. Os bytes do arquivo mudaram. O relatório resume a
integridade, mas não enumera os arquivos Git conferidos; a preservação do índice
nessa sessão não foi auditada independentemente. Um teste separado cobre o
índice em fixture semelhante. A prova não executou descoberta nativa, modelo,
outros sistemas ou verificação de ACLs e atributos estendidos.
Uma correção sintética de autorização passou em nove testes independentes, mas
a resposta do Claude fez uma afirmação incorreta sobre os testes anteriores e
não executou scanner ou revisão da entrega. A modelagem de ameaças identificou
o acesso indevido, mas extrapolou evidências e deixou partes do fluxo pendentes.
Em uma prova funcional com escrita permitida, o perfil `implementador` e a
skill de backend recusaram implementar sem spec aprovada; a fixture e seu índice
permaneceram intactos. Isso cobre apenas esse cenário. A tentativa equivalente
no Claude retornou 401 antes da inferência; em nova tentativa, o Claude invocou
`implementar-spec`, propôs um plano e pediu aprovação sem implementar. Arquivos,
índice e referências Git permaneceram iguais durante a sessão. O Git da fixture
foi criado depois da instalação, e os resultados completos das ferramentas não
foram preservados; a prova não cobre Git preexistente no `init`.
Em uma fixture sem estado de configuração, o Claude invocou `criar-prd` e
orientou concluir a configuração antes do PRD. A sessão só permitia leitura;
ela não prova o comportamento com escrita nem que a ausência de estado signifique
que a configuração nunca ocorreu. O Git foi criado depois do `init`.
Em repetição com uma candidata local da skill, o Claude reconheceu essa
distinção, mas leu apenas parte da configuração e voltou a perguntar quais
clientes usar, apesar da seleção salva. Após outra orientação sobre leituras
truncadas, uma nova sessão leu o restante e reconheceu o cliente e o idioma;
afirmou, sem inventário comprovado, que não havia documentos de produto.
Com orientação adicional na candidata, outra sessão informou que ainda não
havia verificado esses documentos e reutilizou as escolhas salvas.
Na skill ajustada, consultas com conteúdo fornecido no prompt encaminharam a
configuração sem evidência e preservaram UX não aplicável já justificada. A
configuração técnica pendente não bloqueou o produto; não houve escrita nem
descoberta nativa nessas consultas.
Em sessão posterior com invocação explícita da ferramenta Skill, Claude leu a
fonte e encaminhou a configuração. O pedido também solicitava perguntas, que
foram listadas como futuras; portanto a sessão não prova sua suspensão em um
pedido sem essa solicitação. Os snapshots da sessão não mostraram escrita.
Com pedido neutro posterior, Claude encaminhou a configuração sem listar
perguntas concretas, embora tenha antecipado categorias de descoberta.
Sessões isoladas não demonstram consistência nem execução completa da skill.
Em fixture Linux separada, a skill foi lida e aplicada manualmente para criar
um PRD fictício em rascunho, com respostas ausentes pendentes e Git observado
preservado. Não houve descoberta nativa, modelo ou sequência interativa de
perguntas antes da escrita; a preparação também foi sintética.
Em outra fixture, o Claude invocou `criar-spec`, fez perguntas e orientou passar
por PRD e design sem escrever arquivos. O índice e as referências permaneceram
iguais durante a sessão, mas o Git foi criado após o `init`. Ele afirmou que
`docs/` não existia, embora o diretório estivesse vazio; os resultados completos
das ferramentas não foram preservados.
Uma prova separada invocou `verificar-trabalho` no Claude: o teste real passou
em um aceite e falhou em outro, e o cliente deixou um terceiro não verificado.
Os arquivos e o índice permaneceram iguais; o Git foi criado depois do `init`.
Em uma API sintética, `revisar-autorizacao` identificou leitura entre contas;
teste HTTP independente confirmou o acesso indevido. A prova cobre apenas GET,
e o Git também foi criado depois do `init`.
Em outra fixture gravável com PRD em rascunho e UX/UI pendente, o Claude usou
`criar-design-doc`, apontou as dependências e não criou o design. Os bloqueios
coexistiam e não foram testados separadamente; o Git foi criado após o `init`.
Em uma fixture Linux sem rede e com Git preexistente, a mesma skill foi aplicada
manualmente para complementar um design fictício em rascunho, preservando o
conteúdo anterior e o Git observado. As aprovações eram dados da fixture; não
houve descoberta nativa, perguntas interativas ou consulta a referências oficiais.
Em uma fixture Git sintética, `git-status` foi aplicada manualmente: a consulta
identificou alterações staged, não staged, arquivo não rastreado e upstream
local. O índice observado ficou igual; não houve descoberta nativa nem rede.
Outra aplicação manual de `git-diff` distinguiu mudanças staged e não staged
usando uma cópia temporária do índice. O índice original observado permaneceu
igual; a prova não cobre worktrees múltiplas nem todos os metadados Git.
Em outra fixture, Claude invocou `git-merge`, leu um relatório Git preparado
pelo controlador e recomendou não integrar sem revisão e verificações. A sessão
preservou os arquivos humanos e Git observados; não executou o gate nem merge.
Em `git-pull`, uma sessão tratou como inofensivo um aviso de ignore global
inacessível. A orientação foi ampliada; outra sessão reconheceu a limitação ao
interpretar consultas fornecidas pelo controlador, sem executar pull ou fetch.
Ela também sugeriu resolver alterações locais antes de qualquer fetch, requisito
que não foi demonstrado.
Em consultas assistidas de `git-commit`, o Claude distinguiu staged e unstaged;
após ajustes na skill, reconheceu a opção de manter ambos. Persistiram afirmações
e sugestões sem prova; o cliente não executou comandos ou commit, e o controlador
forneceu consultas Git.
Em uma consulta de `git-push`, Claude leu a skill e a regra Git quando solicitado
explicitamente; não executou push. A sessão fez uma afirmação sem prova sobre a
branch principal e não comprova ativação automática da regra.
Em outra fixture, `git-branch` criou uma branch a partir de `develop` sem trocar
a branch atual; índice e alterações humanas observadas foram preservados. A
prova foi manual e não cobre troca de branch nem descoberta nativa.
Em uma fixture com Git preexistente, o Claude leu diretamente `configurar-projeto`
e identificou a fase e a sequência de trabalho. Nenhuma chamada explícita à
ferramenta de skill foi registrada e a sessão só permitia leitura. O cliente
sugeriu um comando inexistente. Após orientação explícita na skill local, outra
sessão indicou o comando Node correto; ele executou e informou uma pendência da
fixture, sem passar no `check`. O `init` da versão publicada preservou índice,
`.gitignore` e configuração Git, mas acrescentou um bloco ao exclude.
Em outra fixture, o revisor do Copilot apontou um erro numérico confirmado por
teste executado pelo controlador. A sessão preservou o projeto; o Git foi
iniciado depois do `init`, então essa prova não cobre Git preexistente.
Em fixture com Git preexistente, o Claude delegou ao revisor; a resposta final
identificou outro erro numérico. O controlador confirmou a falha em teste após
a sessão, que preservou o Git observado. O texto do subagente não foi capturado.
Em uma terceira fixture, o auditor de segurança identificou acesso entre
contas confirmado por teste do controlador. A sessão preservou o projeto, mas
não executou scanners; o Git também foi iniciado após o `init`.
Em outra fixture, o engenheiro de QA executou um teste e identificou uma falha
de limite. O projeto foi preservado durante a sessão; o Git foi iniciado após
o `init`. Cada piloto cobre apenas seu cenário sintético.
Em uma prova de `planejar-qa` com Git preexistente, Claude leu a spec e os
testes; o controlador executou dois exemplos e os demais aceites ficaram sem
verificação. Após uma classificação ampla demais, a skill foi ajustada; em nova
sessão, o agente separou os exemplos aprovados do critério geral não verificado.
A sessão não executou comandos nem alterou arquivos; a cobertura permanece parcial.
Em uma fixture com spec aprovada, o especialista de backend aplicou uma
correção; a repetição independente dos testes passou após a alteração. O Git
foi iniciado depois do `init`, e os logs resumidos não preservam a saída do
teste executado pelo agente.
Em uma página sintética, o especialista de frontend corrigiu o estado acessível
de um botão. O controlador verificou a interação no Chromium e em viewport
móvel emulado; o cliente não executou o navegador e o Git foi criado após init.
Em outra fixture, o analista de performance executou uma medição de contagem
de operações confirmada pelo controlador. Ela não mede tempo ou desempenho em
produção; o Git também foi iniciado após o `init`.
Em uma fixture de aceites, o validador executou testes e distinguiu um critério
aprovado, um falho e uma integração indisponível não verificada. A revisão
independente repetiu os testes; o Git foi iniciado após o `init`.
Em uma fila sintética, o arquiteto apontou a falta de persistência entre
processos. O cliente não executou testes; o controlador e a revisão repetiram
a prova, que não demonstra recuperação após queda ou durabilidade.
Em outra fixture, o documentador atualizou apenas o arquivo autorizado,
preservando texto humano, e executou três testes. O controlador reproduziu o
exemplo separadamente; no `init` anterior, o Git preexistente teve seu exclude
ampliado. Os eventos resumidos não substituem o log bruto da sessão.
O planejador levantou dúvidas de uma spec em rascunho, mas não perguntou sobre
permissões e retenção. A candidata explicita essas verificações no perfil;
em uma repetição, perguntou os papéis e o armazenamento, prazo e exclusão.
Uma sessão não comprova que o comportamento será repetido em outras tarefas.
Após renovar a sessão do Claude Code, a mesma prova confirmou as 41 invocações
e leituras em um projeto existente e em outro novo. No primeiro, uma tentativa
adicional de leitura de um plano pessoal retornou arquivo inexistente; no
segundo, diretórios pessoais foram bloqueados pelo sistema e não houve tentativa
externa. O custo informado pelo Claude foi de aproximadamente US$ 0,33 e
US$ 0,38, respectivamente. Isso não comprova os fluxos completos das skills.
No Claude Code, os 11 perfis da `0.0.21` também foram iniciados em paralelo
em um projeto novo e em um existente. Em cada sessão, marcadores sintéticos
comprovaram o carregamento dos perfis e a leitura das respectivas origens;
os demais arquivos da fixture permaneceram iguais. O Claude informou custos
de aproximadamente US$ 0,28 e US$ 0,30, respectivamente. Isso não comprova
os fluxos completos dos agentes nem sua execução em todos os projetos.
Em outra prova com o Copilot, os 11 perfis da `0.0.21` foram delegados em um
projeto existente: nove leram suas origens e dois não puderam ser verificados.
O pedido explicava a resolução de links relativos; nenhum fluxo completo de
perfil foi comprovado. Em repetição separada dos dois perfis, esclarecendo
também a raiz do projeto, ambos leram suas origens. Em projeto novo, com a raiz
e a resolução de links esclarecidas, os 11 perfis leram suas origens. Algumas
tentativas de leitura fora da fixture foram bloqueadas; nenhuma foi concluída.
Em outra rodada sintética, com o caminho visível no link e sem explicação de
resolução, nove perfis foram comprovados e dois outros não foram verificados.
Os resultados não estabelecem que a alternativa de apontamento seja melhor.
Em Linux, outra matriz da candidata passou em 40 projetos sintéticos para as
operações e verificações documentadas nos [testes](../../tests/README.md); isso
não substitui a prova de recuperação, que falhou separadamente.
Em repetição posterior com o pacote local e as alterações TOML, 34 dos 40
projetos passaram; seis seleções com Claude ficaram não verificadas quanto ao
escopo nativo de uma regra. A auditoria foi posterior à execução; a matriz não
executa os fluxos das skills nem comprova ACLs, xattrs ou Windows.
Com o gerador ajustado para avaliar a cobertura de todas as etapas, outra
matriz Linux teve os mesmos 34 aprovados e seis não verificados. As cinco
operações registraram essas contagens separadamente; o resultado global
continuou não verificado.
Após os ajustes de diagnóstico e proteção POSIX, um pacote local passou em 34
de 40 projetos Linux; seis continuaram não verificados quanto ao escopo Claude.
A auditoria constatou coerência dos registros, sem provar execução nativa nem
todos os metadados. O pacote foi comparado ao tarball após a execução.
Após acrescentar a consulta parcial de xattrs no macOS, outro pacote local teve
34 aprovados e seis não verificados em 40 projetos macOS. A auditoria dos logs
foi consistente e o pacote correspondeu ao tarball após a matriz; nenhuma das
duas provas verifica alterações transitórias ou execução nativa das skills.
O auditor versionável confere a coerência dos relatórios e dos hashes de logs,
incluindo as etapas e snapshots obrigatórios. Ele não autentica a execução,
o pacote ou a preservação antes do baseline; um relatório coerente ainda pode
ter resultado `failed` ou `not-verified`.
Uma repetição posterior da candidata `0.0.30` passou em 80 projetos no Linux,
com duas variações de fixtures, sem testar a execução das skills e perfis. O
executor agora permite dividir a matriz em lotes reproduzíveis; essa opção foi
testada em macOS e Linux e teve revisão independente. Windows segue pendente.
Uma terceira rodada, iniciada por essa opção, passou em mais 40 projetos no
Linux com o mesmo pacote local; ela também não executa skills ou perfis.
Em macOS, com Git e ignore XDG isolados, a candidata local `0.0.30` passou
nas provas de compatibilidade dos commits fixos de Express, Zod, Chi, Tailcat,
Requests, Go, Hibernate e Rust. Express e Chi foram repetidos após reforçar a
conferência das sentinelas humanas e da origem da regra local. O EF6 foi
bloqueado no diagnóstico por exceções ambíguas no
ignore existente; uma fixture confirmou que a exceção `!*.[Cc]ache/` pode
expor um cache de cliente antes ignorado. Os arquivos e o Git conferidos no
clone foram preservados. A versão
publicada `0.0.21` alterou `.git/info/exclude` nos clones de Express e Zod e
falhou no critério de preservação. As provas OSS não executaram as aplicações
nem todos os fluxos de skills e agentes. Os relatórios e clones ficam em `tmp/`
ignorado; veja os limites e o diagnóstico de arquivos privados nos testes.
Uma execução exploratória posterior, interrompida antes de concluir a matriz,
usou o pacote público `0.0.30`: o teste do Hibernate detectou alteração de
exclusões locais e o EF6 foi bloqueado por exceções ambíguas no `.gitignore`.
Esses resultados não comprovam o comportamento dos demais projetos nem da
candidata local de escopo Claude.
Em macOS ARM64, com Node 26, as cinco operações da candidata local `0.0.30`
retornaram zero em 1.000 projetos sintéticos: 500 novos e 500 existentes. Foram
792 casos aprovados, 208 não verificados quanto ao escopo nativo da regra Claude
e nenhuma falha; o resultado geral permaneceu não verificado. Após a correção
do inspetor, um novo pacote local passou em mais 40 projetos. Essas provas não
executam os clientes ou os fluxos das skills e não comprovam atualização de
uma versão gerenciada anterior diferente.
Outro pacote local `0.0.30` passou nas verificações da CLI em 200 projetos
sintéticos adicionais, nas rodadas 26 a 30. Ele antecede o ajuste posterior da
skill de PRD e também não comprova execução nativa de skills ou agentes.
Em uma matriz posterior com a candidata de escopo Claude, Linux ARM64 e Node
24, foram exercitados 1.000 projetos sintéticos, metade novos e metade
existentes. As cinco operações retornaram sucesso em todos; 792 projetos
passaram as verificações e 208 ficaram inconclusivos quanto ao escopo nativo da
regra Git do Claude. Esses números são os registrados pelos testes, não uma
certificação completa: o controlador rejeitou um lote de 200 projetos que os
testes classificaram como aprovados, sem preservar o motivo da rejeição. Além
disso, o hash externo da árvore do pacote diferiu no último lote; não está
comprovado que todo o conteúdo dos cinco lotes fosse idêntico. As 208
ocorrências inconclusivas coincidem com a seleção Claude e a omissão da regra
Git de escopo nativo não comprovado. A matriz não executa skills ou clientes,
não testa recuperação concorrente nem prova Windows; o pacote antecede a
alteração posterior da skill `implementar-spec`.
Uma repetição em execução separada passou nos mesmos 200 cenários e
foi aceita pelo novo controlador. A árvore extraída posteriormente do tar salvo
coincidiu com o hash da repetição; a causa da rejeição anterior e a diferença
entre os hashes históricos continuam sem explicação.
Após a correção local de referências derivadas, duas execuções em macOS com o
mesmo pacote local exercitaram 1.000 projetos: 792 passaram, 208 ficaram
inconclusivos pelo escopo Claude e nenhum foi classificado como falha. A
auditoria considerou os relatórios consistentes; ela não autentica os resultados.
A matriz não executou clientes ou aplicações e antecedeu o ajuste de `criar-prd`.
Uma rodada posterior com essa skill ajustada teve 34 projetos aprovados e seis
inconclusivos entre 40; a auditoria também considerou o relatório consistente.

Em uma fixture com preparação ausente e Claude já selecionado, a `0.0.21`
encaminhou a preparação antes do PRD, mas perguntou novamente os clientes. Após
ajustar a skill, uma sessão da candidata consultou os clientes e o idioma
salvos sem repetir essas perguntas. A prova cobre somente essa situação, não a
configuração do projeto ou a criação completa do PRD.
Em outra fixture, a `0.0.21` pediu aprovação de um plano sem esclarecer uma
edição staged conflitante. Com a skill ajustada, o Claude perguntou como
preservá-la, mas ainda propôs um plano sem ler os documentos exigidos. A
verificação completa do planejamento continua pendente. Na atualização dessa
fixture para a candidata, os arquivos protegidos foram preservados, mas
`doctor` e `sync --check` sinalizaram a exclusão local legada da `0.0.21`.
Uma coleta de contexto em avaliação reuniu os documentos configurados nessa
fixture sem alterar o Git; ela não comprova aprovação nem leitura pelo agente.
Uma nova sessão autenticada do Claude iniciou a skill e leu a spec, mas atingiu
o limite de custo antes de concluir. A prova do planejamento segue pendente.
Em duas sessões posteriores com a mesma skill e restrição de comandos Git,
ambas leram os documentos e o teste da fixture; uma executou Node apesar da
restrição e a outra usou apenas Git. Ambas preservaram os arquivos observados
sob sandbox sem escrita. Essas sessões não comprovam obediência determinística
nem preservação sem sandbox.
Em sessões posteriores, o Claude leu os documentos e o diff staged, identificou
o conflito e perguntou antes do plano. Uma resposta sugeriu dispensar a
configuração; após o ajuste da skill, outra a tratou como obrigatória, mas
ofereceu commit ou stash apesar da preservação do índice. A skill foi novamente
ajustada; essas provas não executaram implementação ou testes nem comprovam o
comportamento de outras sessões.
No último ensaio com a fonte ajustada, o Claude manteve o índice observado e
reconheceu a configuração obrigatória, mas tratou inferências sobre uso do código
e resultado de teste não executado como fatos. A validação funcional continua
parcial; nenhuma alternativa sugerida foi aplicada.
Em um pacote local posterior, uma instalação offline numa fixture Git com
Claude selecionado preservou os arquivos humanos e o estado Git observados;
`init` e `sync --check` passaram. A skill instalada e seu apontamento foram
conferidos por hash e caminho. Essa prova estrutural não executou a skill e
não verificou ACLs, atributos estendidos ou mudanças transitórias revertidas.
O inspetor também passou a rejeitar continuações e retornos de carro isolados
que poderiam transformar metadados ambíguos em aprovação indevida.

### 3. Evolução contínua

- [ ] Revisar as specs e os critérios afetados pela política atual de Git,
  mantendo o histórico das releases e sem declarar critérios antigos aprovados
  por equivalência. Registrar decisões e dependências antes de novos incrementos.
- [ ] Evoluir skills, perfis e provas de arquitetura, backend, frontend, QA,
  segurança, revisão e performance conforme necessidades comprovadas. Usar
  subagentes disponíveis e revisão adversarial quando o escopo permitir.
- [ ] Aperfeiçoar o fluxo de configuração, produto, UX, design, arquitetura e
  specs: reunir dúvidas no início, respeitar dependências e validar critérios
  antes de implementar. Templates devem apoiar decisões sem inventar produto.
- [ ] Validar seleção e sincronização dos clientes suportados nas interfaces
  disponíveis, inclusive Copilot e Antigravity. Fontes compartilhadas permanecem
  no hub; recursos e configurações preexistentes do usuário são preservados.
- [ ] Verificar detecção e instalação de Node.js quando ausente, conforme o
  sistema, e instalação, atualização e diagnóstico das ferramentas por comandos
  reproduzíveis. Orientar testes reais de navegador e desktop quando aplicáveis;
  versionar o código dos testes e manter resultados e projetos temporários fora
  do Git.
- [ ] Manter instalação, pré-requisitos, comandos, solução de problemas e
  publicação coerentes com o comportamento efetivo. [Issues][issues] e
  [contribuições][contributing] podem propor melhorias; cada entrega exige
  escopo e validação próprios.
- [-] Continuar verificando CI em Linux, macOS e Windows e o fluxo de tag,
  release e publicação nos dois registries com o mesmo artefato aprovado.
  O build local preserva uma saída anterior divergente e a verificação prepara
  cópia separada. As suítes de release passaram no macOS e Linux; `full` foi
  simulado. Windows, Actions real e publicação do estado atual estão pendentes.

## Dependências para uma próxima publicação

1. Concluir os ajustes e resolver os critérios pendentes das specs afetadas.
2. Testar o estado final e registrar evidências, limitações e revisão independente.
3. Aprovar a matriz de CI e verificar o artefato candidato antes da publicação.
4. Definir a próxima versão e publicar release e pacotes associados à sua tag;
   comparar os artefatos publicados e testar sua instalação nos dois registros.

Nenhuma versão ou data futura é presumida. A aprovação de uma spec ou a
existência de uma tag não substitui os testes da alteração em andamento.

[Wiki](../README.md) · [Produto](README.md) · [Specs][specs] ·
[Processo de release](../maintainers/maintenance.md)

[releases]: https://github.com/pathbit/AgentDevKit/releases
[issues]: https://github.com/pathbit/AgentDevKit/issues
[contributing]: ../../CONTRIBUTING.md
[changelog]: ../../CHANGELOG.md
[specs]: ../specs/README.md
[v1]: ../specs/v0.0.1/SPEC.md
[v2]: ../specs/v0.0.2/SPEC.md
[v3]: ../specs/v0.0.3/SPEC.md
[packages]: ../specs/github-packages/SPEC.md
[v4]: ../specs/v0.0.4/SPEC.md
[v5]: ../specs/v0.0.5/SPEC.md
[v6]: ../specs/v0.0.6/SPEC.md
[v7]: ../specs/v0.0.7/SPEC.md
[v8]: ../specs/v0.0.8/SPEC.md
[v9]: ../specs/v0.0.9/SPEC.md
[dual]: ../specs/dual-registry/SPEC.md
[v10]: ../specs/v0.0.10/SPEC.md
[security]: ../specs/security-ecosystem/SPEC.md
[additive]: ../specs/additive-integration/SPEC.md
[real]: ../specs/real-projects/SPEC.md
[project-ignore]: ../specs/project-ignore/SPEC.md
[development]: ../specs/development-ecosystem/SPEC.md
[ci]: ../specs/ci-resilience/SPEC.md
[state]: ../specs/state-directory/SPEC.md
[sync]: ../specs/safe-synchronization/SPEC.md
[client-ignore]: ../specs/client-ignore/SPEC.md
[tool]: ../specs/tool-release/SPEC.md
[tags]: ../specs/automatic-release-tags/SPEC.md
[discovery]: ../specs/discovery-preservation/SPEC.md
[targets]: ../specs/target-paths/SPEC.md
[order]: ../specs/preimplementation-order/SPEC.md
