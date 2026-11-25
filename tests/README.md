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

Para executar a distribuição com o tarball candidato, indique o caminho
absoluto no ambiente. Exemplo em shell POSIX:

```console
AGENTDEVKIT_TARBALL=/caminho/absoluto/agentdevkit-0.0.35.tgz npm run test:distribution
```

O modo com tarball informado registra os hashes antes e depois em
`.agent-tests/release-artifact-verification.json`. `npm run verify` passa
automaticamente o tarball que acabou de construir.

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

Na validação de uma entrega, use o pacote gerado pelo checkout em análise.
Gere o tarball de release uma vez e reaproveite-o para os testes de instalação
e atualização. Para atualizar a partir do npm, informe a última versão
publicada.

```console
npm run build
version=$(node -p 'require("./package.json").version')
archive=".agent-tests/release/$version/agentdevkit-$version.tgz"
published=$(npm view @pathbit/agentdevkit@latest version --registry=https://registry.npmjs.org)
npm run test:upgrade -- --from-version "$published" --to-tarball "$archive"
```

O teste confere a integridade da base publicada, a versão e o hash do candidato.
Exercita Claude, Codex, Copilot, Antigravity, OpenCode e Cursor em projetos
sintéticos e compara o Git e o conteúdo humano antes e depois da atualização.
Uma fixture Codex prepara uma referência CRLF com conteúdo staged.
Para reinstalar ou atualizar a partir de um arquivo local, use
`--from-tarball caminho/pacote.tgz`. Sem `--to-tarball`, o teste empacota o
checkout. O resultado em `tmp/upgrade-packages/` registra a origem, os hashes
dos dois pacotes e o que foi verificado.

`sync-skill-collision.test.mjs` verifica o plano e o sync diante de uma skill
humana com conteúdos staged e unstaged diferentes. A fixture confere o bloco
acrescentado, as fontes e os arquivos Git observados; não executa um agente ou
comprova ACLs e atributos estendidos.
`scoped-rule-clients.test.mjs` verifica os apontamentos de uma regra com glob
para Claude e Copilot com Git staged; não comprova a ativação nos clientes.

Para verificar a aposentadoria do Gemini CLI e a atualização de projetos
que ainda têm sua seleção salva:

```console
node --test tests/retired-client-migration.test.mjs
```

A suíte verifica a lista de clientes, o plano de atualização, os arquivos
humanos, o índice Git e a retirada do que tem propriedade comprovada.
O grupo de TOML legado continua cobrindo a leitura de comandos e validação
dos blocos gerenciados usados em instalações anteriores.

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

Para conferir a instalação sem dependências da aplicação, execute:

```console
node --test tests/project-portability.mjs
```

O ensaio cobre pasta vazia, documentação e projetos em Python, Java, .NET,
TypeScript, Rust, Go e C++. Em um monorepo, verifica o destino explícito com
espaços e acentos e preserva os bytes dos arquivos humanos e do índice Git.
As fixtures são locais e o teste usa Node 24+ e Git. Também faz parte da
suíte portátil `project-matrix.test.mjs`.

Para exercitar 40 projetos sintéticos com o tarball local, extraia o pacote em
uma pasta temporária. Use Node.js 24 ou mais recente.

```console
work=$(mktemp -d)
tar -xzf "$archive" -C "$work"
node tests/project-matrix.mjs --package "$work/package" --version "$version"
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
`ruleScopes` registra as provas de configuração de escopo. No Claude,
`explicit-source-only` confirma a origem disponível para leitura explícita e
a ausência de rota nativa na fixture. No Cursor, o runner compara o modo
de aplicação com o trigger da regra e os bytes do sidecar instalado. Origens
humanas e escopos ambíguos continuam como `not-verified`. A prova cobre
configuração de escopo e descoberta estrutural. A cobertura
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

Para conferir a coerência de uma saída preservada da matriz, forneça o caminho
original registrado pelo runner, o pacote extraído e o checkout usado.

```console
node tests/matrix-audit.mjs /caminho/da/saida /origem/registrada \
  --package "$work/package" --runner-root "$PWD"
```

O primeiro caminho contém `RESULT.json`. O segundo é o diretório pai do
arquivo indicado pelo campo `report` antes de mover os arquivos. A auditoria
confere casos, etapas, snapshots, hashes dos logs e as fontes registradas na
proveniência. `audit: consistent` indica
coerência, inclusive quando `matrixStatus` é `failed` ou `not-verified`;
confira ambos. Ela não autentica a execução ou o pacote, não audita a
preparação anterior a `BEFORE.json` e não garante segurança diante de mudanças
concorrentes nos caminhos. Use somente evidências de origem confiável.

Para verificar o pacote local em projetos reais, execute:

```console
npm run test:oss -- --tarball "$archive"
```

O teste clona os commits fixos da [matriz](fixtures/oss-projects.json):
Hibernate ORM, EF6, Rust, Go, Tailcat, Express, Requests, Zod e Chi.
Confere arquivos, permissões, links, staging, instalação e atualização; compara
os bytes de `.git/info/exclude` e observa ignores sem exigir alterações neles.
Para edições humanas, valida o backup compatível e, quando o pacote usa diário
de recuperação, o encadeamento dos recibos e a cópia do estado anterior.
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
Sem argumentos de pacote, o runner empacota o checkout. Com `--tarball`, testa
o arquivo informado e espera a versão do checkout. Use também `--version`
se o arquivo tiver outra versão. Para conferir o npm público, passe apenas
`--version`. O relatório registra a origem do pacote.
Um bloqueio por configuração preexistente aparece no relatório como falha,
com os arquivos preservados; não equivale a uma instalação bem-sucedida.
O processo retorna `1` se algum cenário falhar ou bloquear. No Zod, confere
a preservação dos links `CLAUDE.md`, `README.md` e `.codex/skills`, enquanto
os apontamentos disponíveis são instalados nas demais rotas nativas.
O EF6 pode bloquear a instalação quando uma exceção do `.gitignore` existente
expõe caches de testes; o diagnóstico preserva esse arquivo e o índice Git.

## Fluxo documental

```console
npm run test:docs -- --tarball "$archive"
```

O runner reutiliza a matriz OSS e consulta o inventário do pacote instalado.
Registra um plano aditivo, acrescenta um trecho controlado a um README regular
e cria um índice de links. Depois repete a manutenção do kit e compara conteúdo,
arquivos fora do plano, Git e os diagnósticos de ignore observados antes da
edição. Também verifica um repositório Git vazio sem inventar PRD, design
ou aprovação. Sem argumentos de pacote, reutiliza o tarball gerado pelo
runner OSS no início dessa execução.

Esses complementos são fixtures do harness: comprovam inventário e preservação,
não a qualidade da autoria autônoma por um modelo. Um exercício real do agente
deve ler a skill e a documentação, propor o complemento e passar pela revisão.

## Preservação TOML

```sh
node tests/toml-preservation-proof.mjs
```

O comando compara 40 exemplos sintéticos ao acrescentar, atualizar e retirar
o bloco gerenciado. Ele retorna `1` para falhas, diferenças ou matriz
incompleta. A prova é explícita e ainda não integra a suíte padrão. Ela não verifica
a semântica intermediária e não substitui parser independente, clientes reais,
Git ou plataformas diferentes.
Veja a [spec em rascunho](../docs/specs/toml-preservacao/SPEC.md).

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

Os cenários de recuperação concorrente executam por padrão quando aplicáveis,
incluindo edição de backup após hash, troca de ancestral em POSIX, doze casos
nativos no macOS e três de atributo estendido no Linux. A fixture de xattr
Linux exige Perl com `syscall.ph` e um volume compatível. O perfil `full`
torna pré-requisitos estritos obrigatórios na plataforma aplicável.
O perfil `native-macos-metadata` exige os doze casos macOS sem skips ou TODOs.
Para exigir os pré-requisitos da suíte na execução local:

```console
ADK_STRICT_RECOVERY_TEST=1 node --test tests/concurrent-recovery.test.mjs
```

No macOS, execute o mesmo gate da CI com:

```console
node scripts/release/pipeline.mjs native-macos-metadata
```

As regressões exercitam trocas concorrentes de arquivo e ancestral no rollback,
substituição do nome temporário após link e edição do backup após conferir o
hash. Dois casos também observam chamadas mutadoras após a falha no instalador
e no sync, limitadas às APIs instrumentadas. A proteção da troca de ancestral
no backup usa uma fixture de symlink POSIX.
Quatro casos específicos de macOS verificam que atualizações do instalador e do
sincronizador preservam ACLs legíveis e xattrs. Dois verificam preservação ou
recusa segura quando a ACL nega apenas append. Outros seis exigem recusa e
preservação do estado observado após proteções ACL ou `uchg` em init, update e
sync; o update usa legado sintético. O snapshot desses seis exclui
`.agent-tests` e não detecta mutações revertidas ou todos os metadados de outros
arquivos. Em outros sistemas, os doze casos são ignorados. As fixtures Linux
para xattr cobrem atualizações e backups em `tmpfs`; elas não comprovam ACLs ou
comportamento em outros sistemas de arquivos.
O teste de diagnóstico de TOML legado distingue ausência, falha de leitura e
divergência do registro sem inferir propriedade pelo hash informado.
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
índice observados. Com troca de UID no Linux, a suíte comprova a recusa quando
o proprietário diverge e preserva o modo `0440` no backup do próprio arquivo.
Essas provas observam os caminhos da fixture e o modo de leitura.

`sync-remove-failure.test.mjs` injeta falhas antes e depois de uma remoção e
durante a restauração. A cópia anterior é preparada ao lado do destino e
publicada por rename; se a preparação falhar, o arquivo publicado continua no
lugar. A execução que cobriu 31 testes passou em macOS e Linux. O escopo desta
suíte é a falha injetada e a preservação observada. O gate de recuperação
concorrente executa suas próprias fixtures.

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

Com Node 24+, um pacote confiável local e as CLIs OpenCode e Copilot:

```console
node tests/native-client-matrix.mjs --package "$work/package" --version "$version"
```

O runner cria projetos sintéticos novos e preexistentes para cada ID da política
de adaptadores do pacote, em pasta temporária exclusiva
fora de Git. Carrega os adaptadores e o construtor de catálogo do pacote;
contratos ausentes ou não reconhecidos bloqueiam a prova. Constrói o inventário
esperado das fontes do pacote e compara o catálogo
instalado, incluindo faltas, extras e duplicatas. Para cada skill e perfil,
registra separadamente referência estrutural, descoberta e execução. A prova
estrutural exige o apontamento gerado canônico e compara os bytes da origem
instalada com os do pacote; não inclui colisões de conteúdo humano. Algumas
referências de perfil exigem validação no cliente. O Copilot lista skills.
No OpenCode 1, o runner consulta cada perfil com `debug agent <nome> --pure`
e confere o `prompt` carregado. No OpenCode 2, usa `debug agents --standalone`
e confere o `system` da entrada correspondente. As demais combinações ficam
`not-run`.
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
