---
description: Testes do pacote, instalação e distribuição do AgentDevKit.
---

# Testes do pacote

Execute `npm test` na raiz. Código de testes e fixtures são versionados;
os geradores de exemplos usam, por padrão, diretórios temporários fora de Git.
Uma saída local explícita exige ignore comprovado. Outros clones e resultados
ficam em `tmp/`, `.agent-tests/` ou diretório temporário, sem subir ao Git.
`npm run test:distribution` testa o
pacote real, incluindo instalação, atualização e preservação de arquivos.
Estes testes não são copiados para os projetos atendidos.

`runtime-minimum.test.mjs` instala um pacote local offline em diretório
temporário e verifica a preservação do índice, configuração, `info/exclude`,
`HEAD` e de uma skill própria. Ao executá-lo
com Node 18, informe em `ADK_TEST_NODE24` o caminho absoluto de um Node 24 com
npm: o teste prepara um cache isolado e confirma que o bootstrap o seleciona.
Antes disso, confirma a recusa sem cache e sem permissão para download. Isso
não testa download do runtime nem comprova execução nativa de agentes.

Os testes de referências derivadas verificam o ciclo entre CLI e sync direto,
notas humanas, registros divergentes e alterações após o planejamento. Os
snapshots cobrem os caminhos listados nas fixtures, não todos os metadados Git.

`removed-file-protection.test.mjs`, `removed-overlay.test.mjs` e
`migration-tombstone.test.mjs` verificam registros de remoção, blocos
coexistentes e a recusa conservadora de migração, preservando arquivos humanos
e o índice nas fixtures observadas. Não comprovam todos os aliases ou metadados.

Para comparar uma instalação publicada `0.0.21` com o pacote local:

```console
node tests/upgrade-published-021.mjs /caminho/agentdevkit-0.0.21.tgz
```

O controlador compara a integridade do tarball ao valor registrado, gera o
pacote com npm offline e exercita projetos sintéticos com Claude, Codex,
Copilot, Gemini, OpenCode e Cursor. Ele registra as diferenças do Git na
instalação antiga e compara caminhos Git e conteúdos humanos amostrados antes e
depois da atualização. Saída 1 indica que algum critério ou check não passou.
Uma fixture Codex prepara uma referência com CRLF no diretório de trabalho e
conteúdo staged antes da atualização; o controlador não confirma por si só
qual ramo de sincronização tratou essa referência.
Os resultados ficam em `.agent-tests/`. A prova não cobre todos os clientes,
histórico Git existente ou metadados.

`sync-skill-collision.test.mjs` verifica o plano e o sync diante de uma skill
humana com conteúdos staged e unstaged diferentes. A fixture confere o bloco
acrescentado, as fontes e os arquivos Git observados; não executa um agente ou
comprova ACLs e atributos estendidos.
`scoped-rule-clients.test.mjs` verifica os apontamentos de uma regra com glob
para Claude e Copilot com Git staged; não comprova a ativação nos clientes.

Para investigar a preservação de um comando Gemini humano com `{{args}}`:

```console
node tests/gemini-command-flow-proof.mjs
```

A prova opcional exige Node 24+ e Git e usa o checkout local para criar oito
fixtures temporárias fora de Git. O comando humano pode estar não rastreado,
ser uma adição staged, ser rastreado com edição unstaged ou ter conteúdos
distintos staged e unstaged. Cada caso é repetido com e sem `{{args}}` no texto
humano; os dois casos rastreados usam commits sintéticos locais. Ela executa
`init`, `sync` da CLI
duas vezes, `update`, `sync --check` e o sincronizador independente; confere
cada etapa, incluindo índice, diff staged, arquivos Git, trechos humanos e
referência gerenciada. Falhas de execução, preservação ou referência gerenciada
inválida interrompem as etapas seguintes; somente divergências de argumento e
idempotência mantêm o diagnóstico. Um analisador independente restrito à fixture
decodifica o valor de `prompt`, conta `{{args}}` nele e compara o texto humano
exato ao redor do bloco gerenciado, além da descrição e do comentário. A saída
e `RESULT.json` registram o resultado. Nas duas fixtures com conteúdo staged e
unstaged divergente, `init` deve recusar com `E_STAGED` e preservar os bytes e
os snapshots Git; as etapas seguintes são registradas como `not-run`. Essa
recusa conservadora é esperada, não prova as etapas que não foram executadas.
Código 1 indica
divergência ou falha de execução; a prova é opcional e não integra `npm test`.
Os diretórios temporários são mantidos para análise.
O analisador aceita somente as duas linhas e o subconjunto de string básica
usados nesta fixture; não é um parser TOML geral. Compara os valores humanos,
mas não garante a preservação dos bytes originais do literal TOML. Outro arquivo
humano é comparado integralmente por hash. Os processos têm as permissões do
usuário; não há bloqueio de rede, Gemini real nem detecção de alterações
transitórias revertidas. Os testes negativos do analisador e da política fazem
parte de `npm test` e do perfil `portable-resources`; eles também podem ser
executados isoladamente, sem rodar a matriz funcional:

```console
node --test tests/gemini-command-fixture.test.mjs
```

Para observar aplicação e retirada de comando Gemini em duas fixtures com Git
existente, ambas com `{{args}}` humano, use um pacote local confiável explícito:

```console
node tests/gemini-command-lifecycle.mjs --package /caminho/do/pacote
```

O comando exige macOS, Node 24+, Git e `sandbox-exec`. A rede é bloqueada, a
escrita é limitada à pasta temporária e a leitura da pasta pessoal é bloqueada,
com exceção do pacote e dos módulos fornecidos. Para verificar o valor TOML e o
carregador Gemini, acrescente `--parser /caminho/modulo` e
`--gemini-loader /caminho/modulo`; ambos devem ser confiáveis e compatíveis com
as APIs usadas pela prova. Sem eles, as respectivas verificações ficam como
`not-verified`. Nenhum comando Gemini, action, modelo ou serviço é executado.

As fixtures distinguem o TOML não rastreado da adição staged. `init`, `sync` e
a troca da seleção de Gemini para Claude são comparados com o índice, diff
staged, referências, configuração Git, conteúdo humano e bytes anteriores.
O relatório e as fixtures ficam em diretório temporário fora de Git. Uma
alteração de `.git/info/exclude` interrompe a prova por padrão; para continuar
o diagnóstico da fixture descartável quando o prefixo anterior permanece, use
`--diagnose-exclude`. A alteração continua sendo falha. Outras falhas de
integridade sempre interrompem as etapas seguintes. Código 0 indica aprovação,
1 falha e 2 verificação incompleta. A prova usa locale C e não cobre o efeito
de outras localidades, concorrência ou alterações transitórias revertidas.

Para testar o pacote gerado a partir do checkout atual em um Linux isolado:

```console
node tests/compose-package-smoke.mjs
```

Exige Node 24+, npm, Git, Docker Compose e a imagem `node:24-bookworm` já
disponível localmente. A prova gera o pacote offline, executa seis operações
em um projeto sintético com arquivos staged e unstaged e confere sua preservação.
O container não usa rede e monta o pacote somente para leitura. Resultados e
pacote ficam em diretório temporário fora do Git; `--output` permite escolher
outro diretório temporário existente. A prova não executa fluxos de agentes,
recuperação concorrente ou Windows e não testa um pacote publicado.

`node tests/dockerignore-context.mjs` usa Docker Buildx e arquivos sintéticos
para verificar o filtro real de `.dockerignore` com `FROM scratch` e
`--pull=false`. O builder depende da configuração Docker local. O relatório
fica fora do Git. Essa prova não verifica montagens bind nem todos os caminhos
possíveis; o contexto de build não é usado pelo Compose local da CLI.
`makefile-guards.test.mjs` confere a preservação de `node_modules`, artefatos e
destinos simbólicos. Exige GNU Make e shell POSIX; no Windows é ignorado.

`resource-coverage.test.mjs` confere as referências geradas para os clientes e
as combinações de seleção. A cobertura estrutural não prova que cada recurso
foi executado em todos os clientes; valide também descoberta e uso real.

`node --test tests/claude-rule-scope.test.mjs` verifica o planejamento de escopo
Claude, incluindo metadados ambíguos e colisões humanas. O sync usa esse
planejador. O parser aceita um subconjunto de YAML e não comprova equivalência
de globs com outros clientes. Os testes de integração executam normalmente:

```console
node --test tests/claude-rule-scope-integration.test.mjs
```

`claude-legacy-exact.test.mjs` e `claude-legacy-exact-flow.test.mjs` verificam
o reconhecimento estrito e a preservação de referências legadas, inclusive
alterações staged e com `--force`. O alerta permanece: não comprovam ativação
da regra no cliente nem preservação de todos os metadados do arquivo.

Para exercitar 40 projetos sintéticos com um pacote já instalado, use Node 24+:

```console
node tests/project-matrix.mjs --package /caminho/ao/pacote --version 0.0.21
```

Acrescente `--rounds 25` para planejar 1.000 projetos; cada rodada contém
40 casos distintos e aceita-se até 100 rodadas. Projetos e evidências ocupam
espaço proporcional; não há limite global de tempo ou disco.
Para dividir a execução, use `--start-round 11 --rounds 5` para as rodadas
11 a 15, por exemplo. Os números dos casos permanecem iguais aos da matriz
integral; o relatório registra a rodada inicial. Para comparar lotes, use o
mesmo pacote, a mesma revisão do runner e as mesmas condições. O relatório não
reconcilia lacunas ou sobreposições entre lotes; resultados ausentes ou falhos
não são contados como concluídos. Ele registra plataforma e arquitetura e
compara hashes do runner, dois imports, manifesto, CLI, construtor do catálogo,
mapa de destinos e política de adaptadores antes e depois do lote. Isso não
autentica o pacote nem detecta alterações nos demais arquivos ou mudanças
transitórias revertidas; os imports são carregados antes da primeira medição.
Uma diferença ou falha de leitura reprova a execução.

Para investigar a mudança de `.git/info/exclude` da `0.0.21`, acrescente
`--diagnose-exclude`. O runner continua após `init` apenas para os corpos
e pares de fixture e seleção observados nas primeiras 25 rodadas, com 1.000
cenários; outras variantes são interrompidas.
O caso continua falho e a verificação do bloco não autentica o pacote: confira
sua integridade separadamente. Os bytes originais permanecem como referência;
o acréscimo no exclude continua registrado como falha. O resumo JSON em stdout
inclui `diagnosticExclude` para identificar se esse modo foi solicitado.

O runner confere o nome e a versão do pacote e executa `init`, `update`,
`update --force`, `doctor` e `sync --check` para seleções de agentes, em
projetos novos ou existentes. Varia arquivos humanos, configurações nativas e
colisões. Não testa colisão de catálogos personalizados.
Projetos existentes começam com commit sintético de identidade fictícia e
arquivos humanos rastreados, além de alterações staged e unstaged separadas.
Incluem skill adicional e skill homônima no hub compartilhado, além da colisão
de skill nativa do Claude.
Compara bytes do índice, HEAD, `.git/refs`, `packed-refs`, Git config,
`.gitignore` e arquivos existentes. Outros formatos de refs e metadados Git
não são cobertos.
Compara também `.git/info/exclude` byte a byte e recusa inclusive acréscimos.
Em documentos humanos extensíveis, aceita o conteúdo original ou o conteúdo
original seguido do bloco gerenciado exato esperado; outras variantes exigem
análise. Conserva snapshots, logs e `RESULT.json` em pasta exclusiva.
Compara índices, origens e apontamentos esperados segundo a política do pacote.
Cobertura que não consegue verificar é `not-verified`, não sucesso. A cobertura
de regras Cursor e Copilot verifica o frontmatter gerado simples contra a
origem, mas mantém sidecars, origens humanas e escopos ambíguos como não
verificados; um link válido não prova seu alcance. Os demais frontmatters e
títulos também não são comparados
semanticamente; o resultado não comprova ativação dos clientes. A cobertura
é avaliada em cada uma das cinco operações; uma etapa sem cobertura válida
mantém o caso como não verificado, mesmo se a última estiver verificada. Os
logs são texto UTF-8 e não preservam bytes inválidos da saída original.
`coverageAssessment` resume todas as etapas; `coverage` conserva apenas a
última. Para avaliar o caso inteiro, use o status agregado e o assessment.
Também compara permissões; no Windows, apenas o bit de escrita reportado pelo
Node, sem validar ACLs. Ancestrais monitorados são inspecionados com `lstat`;
links simbólicos e mudanças de tipo ou modo das pastas interrompem o caso.
Após cada etapa, interrompe se identificar alteração indevida. Os snapshots
não detectam alteração e reversão dentro de um mesmo processo.
`--jobs 1..4` limita concorrência. `--output` aceita um diretório temporário
existente fora de repositórios Git; o runner cria uma subpasta nova.
No macOS, o alias de sistema `/tmp` também é aceito; links humanos são recusados.
Não executa skills, agentes, clientes nativos ou testes das aplicações e não
bloqueia a rede no sistema operacional. Remove `NODE_OPTIONS`, `GIT_*` e
`npm_config_*` e isola o Git global: não testa credenciais ou configurações reais.
As operações dependem da CLI testada e não comprovam atualização a partir de
conteúdo gerenciado de uma versão anterior diferente.
`--package` executa o código informado com permissões normais do usuário; use
somente pacote confiável ou sandbox externo. O modo offline do npm não restringe
acesso ao sistema de arquivos ou à rede do processo.
Timeout ou excesso de saída deixam preservação não verificada. Em Windows, só
o processo filho é encerrado, e descendentes podem continuar. Falhas retornam `1`.

Para conferir a coerência de uma saída preservada da matriz:

```console
node tests/matrix-audit.mjs /caminho/da/saida /origem/registrada
```

O primeiro caminho contém `RESULT.json`; o segundo é o diretório registrado
no campo `report` da saída do runner, antes de mover os arquivos. A auditoria
confere casos, etapas, snapshots e hashes dos logs. `audit: consistent` indica
coerência, inclusive quando `matrixStatus` é `failed` ou `not-verified`;
confira ambos. Ela não autentica a execução ou o pacote, não audita a
preparação anterior a `BEFORE.json` e não garante segurança diante de mudanças
concorrentes nos caminhos. Use somente evidências de origem confiável.

Para verificar o pacote publicado em projetos reais, execute:

```console
npm run test:oss -- --version 0.0.21
```

O teste clona os commits fixos da [matriz](fixtures/oss-projects.json):
Hibernate ORM, EF6, Rust, Go, Tailcat, Express, Requests, Zod e Chi.
Confere arquivos, permissões, links, staging, instalação e atualização; compara
os bytes de `.git/info/exclude` e observa ignores sem exigir alterações neles.
Inclui uma skill própria, uma referência Markdown curta, configuração local
e um agente humano com nome igual ao do kit. Confere também a sincronização
independente e `--force` sem remover esses recursos.
O ambiente isola o ignore global padrão XDG. Se a configuração privada da
fixture estiver visível ao Git, `doctor` e `sync --check` devem sinalizá-la;
outros problemas continuam reprovando o cenário. Nessa situação, o verificador
de recursos para no sync; o runner confere esse diagnóstico e executa as demais
checagens em separado, registrando a opção no relatório. A execução das
aplicações e de suas dependências não faz parte dessa prova.
Clones e evidências ficam em `tmp/oss-compatibility/`, ignorado pelo Git.
O runner verifica o ignore e o índice antes de criar uma pasta exclusiva;
recusa redirecionamentos Git e caminhos que possam colidir com conteúdo staged.
As verificações entre cenários não são atômicas durante todas as escritas;
evite alterar a pasta da execução enquanto ela estiver em uso.
Exige rede; não roda no `npm test` padrão nem executa as aplicações clonadas.
Use `--project express` para um caso e `--help` para todas as opções.
Para testar um candidato local, acrescente `--tarball caminho/pacote.tgz`
e informe sua versão. O relatório distingue candidato de pacote público.
Um bloqueio por configuração preexistente aparece no relatório como falha,
com os arquivos preservados; não equivale a uma instalação bem-sucedida.
O processo retorna `1` se algum cenário falhar ou bloquear. No Zod, confere
a preservação dos links `CLAUDE.md`, `README.md` e `.codex/skills`, enquanto
os apontamentos disponíveis são instalados nas demais rotas nativas.
O EF6 pode bloquear a instalação quando uma exceção do `.gitignore` existente
expõe caches de testes; o diagnóstico preserva esse arquivo e o índice Git.

## Fluxo documental

```console
npm run test:docs -- --version 0.0.13
```

O runner reutiliza a matriz OSS e consulta o inventário do pacote instalado.
Registra um plano aditivo, acrescenta um trecho controlado a um README regular
e cria um índice de links. Depois repete a manutenção do kit e compara conteúdo,
arquivos fora do plano e Git. Também verifica um projeto vazio sem inventar PRD,
design ou aprovação. Aceita `--tarball` para validar um candidato.

Esses complementos são fixtures do harness: comprovam inventário e preservação,
não a qualidade da autoria autônoma por um modelo. Um exercício real do agente
deve ler a skill e a documentação, propor o complemento e passar pela revisão.

## Preservação TOML

```sh
node tests/toml-preservation-proof.mjs
```

O comando compara 40 exemplos sintéticos ao acrescentar, atualizar e retirar
o bloco gerenciado. Ele retorna `1` para falhas, diferenças ou matriz
incompleta; no comportamento atual, os 40 casos falham na restauração byte a
byte. A prova é explícita e ainda não integra a suíte padrão. Ela não verifica
a semântica intermediária e não substitui parser independente, clientes reais,
Git ou plataformas diferentes.
Veja a [spec em rascunho](../docs/specs/toml-preservacao/SPEC.md).

Para executar o ciclo da CLI e do sync em 20 fixtures TOML:

```sh
node --test tests/gemini-toml-lifecycle-matrix.mjs
```

A prova compara Git e bytes após a retirada do Gemini; no código atual, os
20 casos falham na restauração integral. O leitor usa o parser distribuído
pelo kit e não substitui a comparação com um parser independente ou o cliente.
Os testes rápidos do leitor estão em `gemini-toml-lifecycle-reader.test.mjs` e
integram a suíte padrão.

## Recuperação concorrente

`recovery-effects.test.mjs` exercita a classificação isolada com opções reais
da CLI, aliases, simulações, argumentos opacos e entradas inválidas. O módulo
não é uma barreira ativa e não testa o sincronizador direto ou o diário.
`recovery-records.test.mjs` testa apenas a interpretação de registros em
memória, incluindo corrupção, limites e transições. O componente ainda não é
usado pela CLI ou pelo sync e não comprova backup ou recuperação de projetos.
`recovery-exclusive.test.mjs` disputa uma criação exclusiva entre 16 processos
em três rodadas; o resultado vale para o sistema de arquivos daquela execução.
`recovery-store.test.mjs` cobre o diário isolado em disco, incluindo disputa
entre processos, interrupção, erros de publicação e mudanças observáveis de UID,
modo e identidade. A prova não garante ACLs ou atomicidade e não valida backup
ou integração à CLI. Os testes POSIX são ignorados no Windows; nesse sistema,
as operações mutáveis do componente são recusadas antes de tocar no diário.
Suporte futuro exige avaliação real de sincronização e processos no Windows.
`recovery-backup.test.mjs` prepara e verifica cópias privadas de um snapshot
sintético e associa o hash do manifesto ao diário. A prova não confirma que os
planejadores reais identificam todos os arquivos afetados ou que haja rollback.
Os testes também simulam UID efetivo indisponível na abertura do manifesto;
a primitiva recusa a leitura sem comprovar propriedade por outros meios.
`recovery-plan-coverage.test.mjs` compara um candidato de captura com chamadas
de instalação observadas em fixtures de init, migração e remoção obsoleta. Ele
usa somente APIs síncronas instrumentadas no caminho de sucesso com clientes
Claude e Codex; não verifica ações e tipos em cada entrada, chamadas internas
do sistema ou subprocessos. A instrumentação também observa pais criados por
`mkdir` recursivo e uma cópia específica de backup. Nomes temporários físicos
e a raiz, inclusive quando ausente, ficam fora do candidato; o plano completo
do sync precisa de tratamento. O candidato não é um planejador de produção.
As provas de captura são ignoradas no Windows enquanto o backup não o suporta.

Os cenários ainda não suportados de `concurrent-recovery.test.mjs`, a edição do
backup após o hash, a troca de ancestral em POSIX, doze casos de metadados e
proteção em macOS e três de atributo estendido em Linux são registrados como
TODO no teste padrão quando aplicáveis; eles não executam a fixture. A prova
Linux exige
Perl com `syscall.ph` e um sistema de arquivos com suporte a xattr; sem esses
recursos, o modo estrito falha e informa o pré-requisito ausente.
O perfil `full` força a execução estrita nas plataformas em que roda. No CI,
esse perfil roda no Linux. O perfil `native-macos-metadata` exige os doze casos
exclusivos de macOS sem skips, TODOs ou subtestes; ele continua falhando até que
as regressões sejam corrigidas. Para reproduzir a suíte estrita completa:

```console
ADK_STRICT_RECOVERY_TEST=1 node --test tests/concurrent-recovery.test.mjs
```

No macOS, execute o mesmo gate da CI com:

```console
node scripts/release/pipeline.mjs native-macos-metadata
```

O modo estrito atualmente falha no instalador e no sincronizador: uma troca
concorrente após a última verificação pode ser removida ou sobrescrita durante
o rollback, inclusive após atualizações do instalador e do sync. Dois casos
adicionais registram chamadas mutadoras após a falha, um em cada entrada; eles
cobrem somente as APIs instrumentadas, sem rastrear todas as mutações possíveis.
Outros oito casos executam normalmente e comprovam a preservação quando a
substituição ocorre antes de começar o rollback, inclusive após atualizações no
instalador e no sync; eles não cobrem a janela posterior à última verificação.
Dois dos doze casos pendentes exercitam substituição do nome temporário após
link bem-sucedido; a limpeza atual pode remover esse arquivo humano.
A troca de ancestral do backup pode criar arquivo fora do projeto em macOS e
Linux; no Windows, essa fixture de symlink é ignorada e precisa de outra prova.
Uma edição no mesmo inode após a conferência do hash pode deixar um backup
alterado ser anunciado como válido; o caso também foi reproduzido em macOS e Linux.
Quatro casos específicos de macOS verificam que atualizações do instalador e do
sincronizador preservam ACLs legíveis e xattrs. Dois verificam preservação ou
recusa segura quando a ACL nega apenas append. Outros seis exigem recusa e
preservação do estado observado após proteções ACL ou `uchg` em init, update e
sync; o update usa legado sintético. O snapshot desses seis exclui
`.agent-tests` e não detecta mutações revertidas ou todos os metadados de outros
arquivos. Em outros sistemas, os doze casos são ignorados. As fixtures Linux
para xattr cobrem atualizações e backups em `tmpfs`; elas não comprovam ACLs ou
comportamento em outros sistemas de arquivos.
`gemini-derived-diagnostic.test.mjs` reproduz um registro derivado antigo após
edição humana e `update`. Exige diagnóstico por caminho e resultado não saudável
para `doctor` e `sync --check` da CLI, preservando os dados observados. O check
direto é apenas registrado; a prova não resolve propriedade por hash antigo.
`sync-special-mode.test.mjs` verifica recusa do sync direto antes de alterar
arquivos planejados com bit POSIX especial, incluindo `--force` e remoção.
Os bits sticky, setuid e setgid são exercitados separadamente em macOS e Linux;
a suíte não comprova combinações, diretórios, ACLs, xattrs, Windows ou operações
pela CLI. `cli-special-mode.test.mjs` verifica o bit sticky em alvos reais de
`init`, `update` e `sync`, inclusive `--force`; setuid e setgid são verificados
em `update`. A troca de agentes verifica a recusa de remoção para os três bits,
com e sem `--force`. A suíte não cobre diretórios, ACLs, xattrs ou Windows.
`--check` e `--dry-run` não identificam essa proteção. No perfil estrito em
macOS e Linux, a ausência do bit necessário falha o teste; Windows é ignorado.
`state-directory-xattr.test.mjs` verifica no macOS a recusa da migração de
diretórios legados com atributo sintético listado, inclusive com `--force`, e
a preservação dos caminhos Git e humanos amostrados. Também testa consultas,
diagnóstico com outro problema e falhas simuladas do probe no planejamento e
antes da aplicação. O teste falha se não puder criar o atributo e é ignorado em
outros sistemas. A listagem não comprova ACLs, atributos ocultos, metadados
não amostrados ou ausência de alterações transitórias.
`mac-xattr-probe.test.mjs` verifica o classificador de saída e, em macOS,
recusa de um alvo com atributo listado e continuidade quando ele não é afetado.
O helper não lê valores; atributos ocultos, ACLs e outros sistemas não são
comprovados por essa listagem. No modo estrito, a fixture falha se não puder
criar o atributo sintético.
`mac-xattr-removal.test.mjs` verifica a recusa de remoção pela CLI e pelo sync
direto com dois atributos sintéticos listados, sem comparar seus valores.
`xattr-stage-diagnostics.test.mjs` empacota offline e injeta falhas somente em
cópias temporárias para conferir o escopo de erros do estágio. Requer npm e tar;
executa em macOS/Linux, ignora Windows e não reproduz falha real de limpeza.
`native-metadata.test.mjs` injeta falhas simultâneas de escrita e fechamento e
confere que a API mantém o código do erro primário.
`callback-boundary-isolated.test.mjs` distingue erros de inspeção do projeto de
erros no estágio e verifica a saída sanitizada da CLI nos casos exercitados. A
causa original segue acessível pela API em `Error.cause`; os casos foram
validados em macOS e Linux, mas Windows não foi verificado.
`diagnostic-collector-safe.test.mjs` verifica o coletor com getters, proxies,
causas e limites sintéticos; não comprova a sanitização de toda a CLI.
`json-diagnostics.test.mjs` verifica erros de sintaxe em leitores locais de
ferramentas e skills externas, inclusive nas CLIs, e a propagação de erros de
leitura. Confere a política local de adaptadores no planejador de ignore e na
carga inicial do sync direto, sem expor conteúdo ou caminho no erro de sintaxe.
Esse erro usa stack resumida e não informa linha ou chamadas do parser; erros de
leitura continuam pelo caminho original.
Confere também o diagnóstico de inicialização da CLI principal nos três idiomas
e o tratamento de opções antes e depois do separador de argumentos.
Também confere a CLI principal com estado e configuração inválidos,
sem alterar o índice observado. Não cobre validação de esquema, outros parsers
ou respostas HTTP.
`gemini-xattr-preservation.test.mjs` usa TOML humano misto e xattr sintético em
macOS e Linux para verificar atualização real ou recusa sem alterações em
`update`, `sync` da CLI e sincronização direta. O teste exige modo estrito e
registra TODO no perfil portátil comum; não cobre ACL, outros xattrs, mudanças
transitórias ou todos os metadados. O gate macOS de doze casos não o inclui.
No Linux, a fixture exige Perl com `syscall.ph` e `/tmp` com suporte a xattr;
ausência desses requisitos causa falha, não aprovação. A recusa só é comprovada
quando a causa principal e o caminho exato aparecem em `error.code` e
`error.path` na resposta estruturada da CLI ou na primeira linha do erro do sync
direto; outra saída é inconclusiva e falha o teste. A candidata informa o caminho
para recusas de metadados no alvo real e distingue erros no estágio temporário.
O snapshot compara nomes, modos e bytes persistentes, mas não mede ACLs, outros
xattrs ou alterações transitórias revertidas.
Esse resultado não comprova execução no Windows; investigue separadamente
erros de preparação da fixture. Nunca trate os TODOs como critérios aprovados.
No PowerShell, defina a variável com `$env:ADK_STRICT_RECOVERY_TEST = '1'`,
execute `node --test tests/concurrent-recovery.test.mjs` e depois remova-a com
`Remove-Item Env:ADK_STRICT_RECOVERY_TEST`.

`sync-temporary-privacy.test.mjs` verifica o modo no instante em que o sync
cria um temporário. A implementação anterior chegou a criar modo `666` para
um destino `600` com `umask 000`. A prova agora abrange cinco modos de arquivos
existentes e arquivos novos, com máscaras `000`, `002`, `022` e `077`, e passou
em macOS e Linux. Também testa remoção e restrição de modo antes da criação do
temporário. As fixtures ficam em diretórios privados. O teste não comprova
ACLs no Windows nem elimina janelas de alterações concorrentes.

```console
node --test tests/sync-temporary-privacy.test.mjs
```

`sync-backup-failure.test.mjs` injeta falhas na cópia e no fechamento do
backup e verifica interrupção, diagnóstico e preservação dos arquivos e do
índice observados. Não comprova segurança concorrente ou metadados do backup.

`sync-remove-failure.test.mjs` injeta falhas antes e depois de uma remoção e
durante a restauração. A cópia anterior é preparada ao lado do destino e
publicada por rename; se a preparação falhar, o arquivo publicado continua no
lugar. A prova passou com 31 testes em macOS e Linux. Ainda há falhas no gate
estrito de concorrência; esta suíte não comprova rollback integral nem fecha a
janela entre validação e rename.

`hardlink-unknown.test.mjs` simula contagens de links indisponíveis e verifica
a recusa e o diagnóstico da CLI; não comprova quais sistemas as apresentam.

`hardlink-plan.test.mjs` verifica diagnóstico no planejamento, check e doctor,
conflitos simultâneos e alterações entre plano e aplicação. A prova não elimina
janelas de concorrência nem cobre todos os metadados do arquivo.

`mac-acl-protection.test.mjs` verifica a preservação de ACLs legíveis e xattrs
em atualizações macOS, a recusa quando a ACL nega escrita e a falha fechada da
consulta. Não comprova proteção de diretórios, todas as ACLs ou outros sistemas.

`mac-acl-plan.test.mjs` verifica atualizações com ACL preservável, recusa de
ACLs protegidas ou não verificáveis, revalidação, check e conflitos. Os testes
específicos são executados no macOS.

`mac-backup-acl.test.mjs` verifica no macOS que o backup permanece vazio quando
a pasta herda ACL ou sua consulta falha; não prova privacidade em concorrência.

`temporary-preservation.test.mjs` verifica na aplicação de um plano e no sync
direto que falhas na criação exclusiva preservam e reportam o nome incerto,
inclusive em colisão ou gravação parcial. Em uma colisão no sync do estágio
privado de planejamento, verifica que o estágio e o diagnóstico são mantidos.
Também verifica que um nome temporário recriado
depois de `rename` bem-sucedido é preservado na aplicação e no sync direto.
Após sucesso, o planejamento ainda tenta remover o estágio recursivamente,
inclusive se um nome for recriado nele. Em POSIX, também cobre um rename entre
hardlinks do mesmo inode:
nesse caso o nome original pode continuar existindo sem aviso automático. A
prova cobre erros antes e depois da tentativa de publicar, inclusive uma falha
reportada após o link. A substituição concorrente do temporário após link
bem-sucedido sem erro continua pendente, assim como o rollback completo.
Também testa falhas de criação, modo e leitura do temporário antes da
publicação no sync: se o grupo afetado não tinha alterações anteriores e seu
conteúdo observado não mudou, o destino não é restaurado. As provas incluem
substituições iguais ao original, diferentes ou iguais ao conteúdo planejado,
além da preservação do erro original. Em falha antes de publicar, a limpeza
não remove o temporário já criado e informa seu caminho como incerto; outro
processo ainda pode removê-lo. Uma
publicação anterior em outro grupo continua sendo verificada e informada.
Não há fixture comprovada de duas ações no mesmo grupo. Isso não cobre todos
os efeitos em diretórios nem publicações ambíguas.

`sync-logical-order.test.mjs` exercita a remoção de uma referência obsoleta
antes da criação de outra, preservando arquivo humano, índice e `.gitignore`.
Ele não comprova a ordem de todas as categorias nem um plano de recuperação.

## Descoberta em clientes nativos

Com Node 24+, um pacote confiável local e as CLIs Gemini, OpenCode e Copilot:

```console
node tests/native-client-matrix.mjs --package /caminho/ao/pacote --version 0.0.30
```

O runner cria projetos sintéticos novos e preexistentes para cada ID da política
de adaptadores do pacote (14 no candidato 0.0.30), em pasta temporária exclusiva
fora de Git. Carrega os adaptadores e o construtor de catálogo do pacote;
contratos ausentes ou não reconhecidos bloqueiam a prova. Constrói o inventário
esperado das fontes do pacote e compara o catálogo
instalado, incluindo faltas, extras e duplicatas. Para cada skill e perfil,
registra separadamente referência estrutural, descoberta e execução. A prova
estrutural exige o apontamento gerado canônico e compara os bytes da origem
instalada com os do pacote; não inclui colisões de conteúdo humano. Algumas
referências de perfil não são formatos de descoberta nativa. Gemini e Copilot
listam skills, e OpenCode lista perfis; as demais combinações ficam `not-run`.
O Copilot deve retornar cada nome uma única vez, habilitado e com a localização
da skill do projeto; resultados pessoais ou incorporados não são confundidos.
A descoberta observada não comprova execução. O runner não solicita inferência
nem usa um modelo, portanto toda execução fica `not-run`.
Falhas de instalação, inventário, estrutura ou descoberta observável e bloqueios
da CLI retornam código 1; resultados detalhados e logs ficam em `RESULT.json` e
arquivos ao lado, fora do Git. `--output` aceita diretório temporário existente
fora de repositórios, com as mesmas restrições da matriz de projetos.

O HOME, XDG e variáveis de configuração são isolados por caso; não são um
sandbox de sistema. Clientes e pacote têm as permissões do usuário, e o runner
não bloqueia rede nem garante acesso exclusivo aos dados gerados. Recusa links
simbólicos nos caminhos verificados, sem garantir atomicidade contra trocas
concorrentes. Use somente binários confiáveis. No Windows, ACLs e encerramento
de descendentes não são garantidos. Logs podem conter saídas dos processos. A
fixture preexistente compara os bytes de README e `.gitignore`, sem substituir
as provas de preservação mais amplas de `project-matrix.mjs`.

Uma prova separada pode usar inferência do Copilot e gerar eventos e marcadores
sintéticos. Para auditar os eventos de uma prova já realizada, sem chamar modelo:

```console
node tests/copilot-evidence.mjs /pasta/da/prova /fixture/original /pacote/local
```

O auditor exige que a fixture corresponda às fontes do pacote informado,
confere descoberta, invocação, leitura, marcadores e arquivos protegidos e
rejeita ferramentas inesperadas. Ele não autentica o pacote no registro nem
executa o fluxo completo da skill. As evidências contêm dados sintéticos e
ficam fora do Git; a execução com modelo pode consumir créditos do serviço.

Para auditar eventos equivalentes do Claude Code sem chamar o modelo novamente:

```console
node tests/claude-evidence.mjs /pasta/da/prova /fixture/original /pacote/local
```

O auditor confere a invocação, o apontamento carregado, a leitura da origem,
os marcadores e os arquivos protegidos. Tentativas de leitura externa só são
identificadas por comparação lexical de caminhos e aceitas quando o evento
demonstra erro reconhecido sem conteúdo parcial; essa comparação não detecta
um link simbólico interno que aponte para fora. A prova não autentica o pacote
nem executa o fluxo completo de cada skill.
O relatório identifica o tipo e o retorno de lançamento esperado sem copiar
seu conteúdo. Esses campos são informativos e não determinam `passed`;
`unavailable` inclui resultado ausente, duplicado ou fora de ordem. Eventos de
entrada podem conter dados sensíveis e não são sanitizados pelo auditor.

Para auditar a delegação aos perfis do Claude Code, sem nova chamada ao modelo:

```console
node tests/claude-agent-evidence.mjs /prova /fixture/original /pacote/local
```

A prova usa marcadores diferentes no perfil carregado e na origem. O auditor
confere a seleção de cada subagente, a leitura, a resposta, a ordem dos eventos
e a preservação da fixture. `passed` cobre essas verificações; `swarmPassed`
também exige paralelismo observado. Para uma prova movida, acrescente
`--recorded-project /caminho/original/do/projeto` para comparar os caminhos
registrados nos eventos com o local usado na execução. O prompt da tarefa é
conferido no evento de início; uma mensagem separada do prompt do filho pode
não aparecer, e sua presença é indicada por `childPromptTextObserved`. A prova
não comprova o fluxo completo do agente nem autentica o pacote. Os formatos
nativos estão na [documentação do Claude Code](https://code.claude.com/docs/en/sub-agents).

Para auditar uma prova de delegação aos perfis, sem nova chamada ao modelo:

```console
node tests/copilot-fleet-evidence.mjs /prova /fixture /pacote original
```

O último argumento é `original` para apontamentos do pacote ou `path` para o
experimento sintético que torna o caminho visível no link. O auditor confere a
delegação e a leitura por cada subagente, além dos marcadores e da preservação.
Ele registra tentativas de leitura fora da fixture e recusa a prova se uma
delas não tiver uma negação explícita sem conteúdo parcial. Retorna erro quando
qualquer perfil não é verificado; não executa os fluxos completos dos agentes
nem autentica o pacote informado.
