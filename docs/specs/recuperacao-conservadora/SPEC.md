---
description: Recuperação conservadora após falha de instalação e sincronização.
status: rascunho
---

# Recuperação conservadora após falha

## Objetivo

Eliminar a perda reproduzida durante o rollback do instalador e do
sincronizador, preservar caminhos que possam ter sido modificados por pessoas e
oferecer informações para recuperação manual. Essa garantia proposta cobre a
recuperação após falha; ela não elimina a janela de edição concorrente durante
a aplicação normal. Esta proposta não está implementada.

## Requisitos funcionais

- Após falha numa operação mutável, a recuperação automática não remove,
  renomeia, restaura, escreve nem altera o modo de caminhos públicos que possam
  ter sido criados, substituídos ou removidos, inclusive estado, migração,
  diretórios e resultados incertos. O projeto pode permanecer parcial.
- Antes da primeira mutação de caminhos públicos, preparar backup recuperável e
  manifesto de todos os itens preexistentes afetados, inclusive removíveis e
  estado; registrar ações planejadas, ausências e modos disponíveis. Falha na
  preparação impede a mutação pública. Preservar backups e hierarquia na falha.
- Registrar o início antes da mutação e a conclusão somente depois de todas as
  etapas. Pendência, registro inválido ou resultado desconhecido bloqueia
  `init`, `update`, `lang`, alteração de `agents` e `sync` mutáveis, inclusive
  o sincronizador direto. Consultas e diagnóstico seguro permanecem acessíveis
  com estado parcial ou inválido. Se não for possível simular um plano
  confiável, informar a limitação sem inventar um resultado. A resolução exige
  revisão e ação explícita do operador, sem substituição automática do conteúdo
  atual.
- Erros humanos, JSON e sync direto informam falha original, parcialidade,
  caminhos afetados ou incertos, backup e próximos passos, com indicação de
  truncamento e saída de falha, sem imprimir conteúdo de arquivos ou segredos.
- Orientar o operador a parar escritores, criar cópia ou checkpoint, comparar
  backup e conteúdo atual, revisar criações, remoções, estado e migração e
  executar diagnóstico e novo plano. Não recomendar cópia cega do backup nem
  reset do índice Git.

## Requisitos não funcionais

- Preservar bytes e registrar modos disponíveis no backup, sem alterar índice,
  configuração Git ou ignores existentes. Backups e manifestos podem conter
  dados sensíveis; documentar localização, visibilidade e ciclo de vida.
- Em POSIX, criar diretórios privados com `0700` e arquivos privados com
  `0600`; guardar modos originais como metadados. Em cada plataforma, verificar
  ACLs efetivas ou declarar a limitação: bits POSIX não comprovam sigilo.
- Proteger estágio e temporários, tratar falhas de limpeza e resíduos sem
  exclusão cega de caminhos públicos. O estágio privado usado no planejamento
  não deve criar pendência confundida com a do projeto consumidor.
- A atualização de arquivo existente deve preservar metadados e respeitar suas
  proteções, incluindo ACL que nega escrita e flag imutável quando disponíveis.
  ACL benigna deve continuar suportada e preservada; se a operação protegida
  não puder ser feita com segurança, recusar antes de mutações públicas.
  A causa principal estruturada dessa recusa, inclusive quando encapsulada,
  deve identificar o alvo em `path` e a proteção por `EACCES`, `EPERM`,
  `E_PROTECTED_METADATA` ou `E_METADATA_UNSUPPORTED`. Um erro em outro caminho,
  com apenas o destino de um rename ou ocorrido somente na limpeza não
  comprova essa recusa antes da mutação.

## Escopo e fora de escopo

Inclui instalador, sincronizador direto, backups, pendências, migração de
estado, diagnóstico e recuperação orientada. Não garante preservação contra
edições concorrentes durante a aplicação normal, atomicidade entre arquivos ou
recuperação automática após interrupção; não altera o índice nem oferece
`undo`. Um backup capturado durante edição pode não ser coerente. Corridas de
publicação, remoção, diretórios, aliases e links durante a aplicação exigem
trabalho separado. Versões antigas do kit podem não respeitar novos registros
ou bloqueios e não devem ser apresentadas como protegidas por esta mudança.
Os caminhos públicos abrangem arquivos, diretórios e estado do projeto que
pessoas ou outras ferramentas possam alterar. Backups e registros privados
devem ter localização e posse verificadas; sua limpeza não autoriza apagar
caminhos substituídos ou cuja identidade seja incerta.

## Restrições técnicas e decisões pendentes

### Metadados por plataforma

A orquestração continua em Node. Antes de alterar um arquivo existente, o
instalador e o sync precisam de uma forma comprovada de inspecionar e preservar
suas proteções e os metadados pertinentes, inclusive no backup. A verificação
deve distinguir sucesso comprovado, recurso indisponível e erro; resultado
desconhecido não autoriza afirmar que não há metadados. O mesmo contrato deve
cobrir remoções e arquivos de estado. A estratégia e a distribuição de qualquer
componente nativo ainda não foram decididas.

Se for necessário um componente compilado, a distribuição deve continuar
funcionando com um único pacote npm executável via `npx`, sem compilador ou
`postinstall` no projeto consumidor. O sync direto também precisa conseguir
usá-lo após a instalação, fora do cache temporário do `npx`. Validar origem,
integridade, SO, arquitetura e capacidade de execução; ausência ou
falha não são confirmação de preservação. A escolha entre executável e
[Node-API](https://nodejs.org/api/n-api.html), os alvos suportados e a montagem
do mesmo artefato para os dois registries continuam em avaliação. O pacote
aceita Node 18 para o bootstrap; a CLI preparada exige Node 24 ou superior.

No macOS, [`fcopyfile`](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man3/copyfile.3.html)
oferece opções para ACLs e atributos estendidos; copiar metadados não comprova
que a alteração do original é permitida. No Linux,
[`listxattr`](https://man7.org/linux/man-pages/man2/listxattr.2.html) e APIs
relacionadas precisam ser avaliadas por filesystem e namespace; utilitários
externos não podem ser presumidos. No Windows, a avaliação deve incluir os
[descritores de segurança](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights)
e os demais dados suportados pelo filesystem. A documentação de
[`fs.copyFile`](https://nodejs.org/api/fs.html#fscopyfilesrc-dest-mode-callback)
não estabelece o contrato completo exigido aqui. Nenhuma dessas referências,
isoladamente, comprova autorização, preservação integral ou segurança diante de
alterações concorrentes.
No [manual GNU](https://www.gnu.org/software/coreutils/manual/coreutils.html),
`cp -a` e `--preserve=all` podem não sinalizar falha ao preservar xattrs. Um
status de sucesso desses comandos não comprova a cópia dos metadados.

Uma prova isolada no macOS ARM64 copiou metadados entre dois arquivos
sintéticos por descritores: uma ACL benigna e um atributo estendido observado
coincidiram, sem alteração dos bytes. O helper foi compilado apenas na pasta
temporária da prova e não integra o pacote. Esse resultado não comprova as
permissões efetivas, todos os metadados, outros filesystems ou plataformas.
Um segundo protótipo Node-API foi carregado por Node 24 e 26 no mesmo macOS e
copiou os mesmos tipos de metadados benignos entre arquivos sintéticos. Ele
também permanece temporário e não prova distribuição, autorização ou segurança
sob concorrência.
Em outro ensaio no APFS, a cópia da ACL benigna e do xattr antecedeu a
substituição de um arquivo sintético com novos bytes; ambos permaneceram no
resultado observado. Modo, UID e GID apenas coincidiram na fixture. Essa prova
não estabelece autorização, durabilidade ou preservação de todos os metadados.
Em Linux ARM64, outro protótipo Node-API copiou um atributo `user` sintético
em tmpfs com Node 24. Esse ensaio não cobre ACLs, outros namespaces,
filesystems, arquiteturas ou integração.
Em `overlayfs` Linux ARM64, uma prova copiou ACL benigna e xattr sintético entre
arquivos, com comparação independente durante a cópia. Em tmpfs, a ACL retornou
`ENOTSUP`; em musl, a biblioteca ou seus símbolos ficaram indisponíveis. O
backup demonstrativo não testou restauração nem comprova autorização ou sigilo.
Em outro ensaio isolado no `overlayfs` ARM64, um addon temporário copiou uma
ACL benigna e três atributos sintéticos para backup e para um arquivo atualizado
em ambientes glibc e musl. Um leitor C independente conferiu os valores e a ACL;
o próprio addon conferiu os nomes. A fixture em tmpfs não conseguiu criar a ACL,
portanto não testou o fallback. O addon ignora outros namespaces e a checagem
para recusá-los ocorreu somente no ensaio; ele não está integrado ao kit.
Isso não comprova autorização, recuperação real ou preservação integral.
Uma segunda versão recusou uma lista sintética com nome não suportado antes da
cópia. A conferência dos valores permaneceu externa e o destino era novo; não
foram testados outros namespaces reais nem atributos preexistentes no destino.
Outro protótipo consultou apenas o tamanho da lista de atributos acessíveis em
48 cenários de um pacote experimental: 12 alterações e 36 recusas esperadas.
Os testes usaram ARM64 e x64, este sob tradução, em imagens glibc e musl; não
provam x64 nativo, suporte a ACL benigna, atributos ocultos ou distribuição.
Em outra prova isolada no macOS ARM64, `fcopyfile` com `COPYFILE_CHECK` e
metadados retornou zero e alterou o destino sintético: copiou ACL ou xattr
nos casos correspondentes e modificou a data no caso simples. A
variante `copyfile` por caminhos indicou os metadados nesses exemplos sem a
mesma alteração observada. Não usar a variante por descritores como consulta
somente leitura com base nessa flag; confirmar comportamento por sistema e
filesystem antes de escolher uma API.

`stat`, hash ou identidade seguidos de `rm` ou `rename` não são substituição
ou remoção condicional atômica de um nome; hardlinks e descritores não fecham
essa janela. O projeto deve registrar início e recibo de término em nomes
exclusivos e distintos, sem sobrescrever ou apagar por nome após checagem, e
tratar publicação ambígua e recibos incompletos como pendência.

Antes da implementação, revisar e decidir o protocolo de coordenação
cooperativa, detecção e resolução de trava abandonada, publicação e validação
dos registros e resolução explícita. A coordenação não bloqueia editores.
Definir a localização privada, o comportamento para raiz de projeto ainda
inexistente, e estágio no mesmo sistema de arquivos, inclusive `EXDEV` e
limitações de Windows. Não presumir que verificar e depois remover uma trava
por nome seja seguro.

Classificar todos os comandos e entradas diretas por seus efeitos, inclusive
`tools`, que encaminha argumentos a outro processo. Uma pendência deve impedir
as mutações abrangidas pelo protocolo; consultas seguras precisam funcionar
mesmo com estado parcial. Definir como tratar `dry-run` quando não for possível
construir plano confiável e como impedir que um comando novo ignore a classificação.
O módulo isolado `recovery-effects.mjs` classifica opções da CLI como consulta,
planejamento, mutação, opaco ou não suportado; `tools` é sempre opaco. Ele não
consulta o diário nem bloqueia ações. Antes da integração, falta assegurar que
a classificação corresponda às opções executadas, cobrir o sync direto e
definir o tratamento de consultas com estado parcial. Uma classificação de
planejamento não comprova ausência de efeitos em arquivos temporários.
Testar interrupção de processo separadamente de perda de energia e não atribuir
durabilidade a uma plataforma apenas por existir `fsync` no Node.

Examinar o modo no instante da criação dos temporários: na implementação
anterior do sync, a escrita ocorria antes de `chmod` e uma máscara permissiva
podia expor temporariamente o conteúdo. Rever também mensagens que propagam
`error.message` para impedir que conteúdo sensível apareça em diagnósticos.
Comprovar ambos com fixtures
sintéticas; a análise estática, por si só, não prova exposição em toda máquina.
Uma fixture com `umask 000` observou modo `666` na implementação anterior para
um destino `600` em macOS e Linux; não há prova de acesso a dados reais. A
correção e o teste em `tests/sync-temporary-privacy.test.mjs` tratam esse caso
para arquivos existentes em POSIX; criação de novos arquivos, Windows e ACLs
exigem análise própria. Isso não conclui o requisito mais amplo de AC-007.

Não seguir links simbólicos para fora do destino. Definir como representar
links, hardlinks, tipos especiais e ancestrais inseguros no backup; recusar
antes da mutação, com diagnóstico, o que não puder ser tratado com segurança.
Uma troca concorrente durante a captura permanece fora da garantia.

Uma investigação em `tests/recovery-plan-coverage.test.mjs` comparou um
candidato de captura com chamadas Node observadas em fixtures de init, migração
e remoção obsoleta. Apenas `plan.changes` não cobre diretórios; o candidato é
uma aproximação de teste, não uma implementação de produção. Uma raiz ausente
e o plano completo anterior à escrita do sync direto ainda exigem solução.
As provas cobrem somente o caminho de sucesso, clientes Claude e Codex e
chamadas síncronas instrumentadas no macOS e Linux. Não verificam ações e
tipos contra cada entrada, chamadas internas do sistema ou subprocessos. As
chamadas de criação da própria raiz são identificadas, mas ficam fora do
candidato: seu estado anterior precisa ser representado separadamente.
O instalador deriva antes da aplicação os caminhos candidatos à poda e usa
essas cadeias na execução, verificando cada diretório quando o alcança. Essa
lista é condicional e não captura o estado anterior, criações, migração,
temporários ou demais efeitos; ela não autoriza remoção nem constitui backup.
Ele compara os candidatos antes das escritas, antes da poda e antes das raízes
retiradas. Essas verificações não tornam o plano inteiro imutável nem eliminam
alterações entre verificação e operação; uma falha tardia ainda usa o rollback
existente. Planos normais usam arrays; planos externos aceitam arrays ou Set
para raízes retiradas. Outros iteráveis são recusados antes do backup porque
podem não permitir comparações repetidas.
O sync compartilha uma sequência interna de ações lógicas entre a verificação
de caminhos e a execução. Cada escrita contém uma cadeia lexical de pais
candidatos, consultada novamente no momento da criação; ela não captura estado
ou identidade dos diretórios. Temporários, backups e efeitos de rollback ficam
fora dessa sequência, que não é um plano completo de recuperação.
Uma inspeção interna em modo de consulta apresenta essa sequência sem conteúdo
de arquivos. Fixtures com callbacks inertes compararam ações de criação,
atualização e remoção com chamadas observadas; callbacks, subprocessos,
temporários e falhas ficam fora dessa cobertura. A inspeção inclui caminhos,
não autoriza a operação nem substitui backup.

Especificar a ordem e persistência de backup/manifesto, início, mutações e
recibo, usando `fsync` quando disponível e registrando suporte e falhas de
arquivos e diretórios. Diferenciar interrupção de processo e perda de energia;
não prometer durabilidade não comprovada. Estes detalhes, assim como a forma de
resolução e a conciliação do contrato histórico, ainda precisam ser definidos e
verificados.

## Critérios de aceite

- **AC-001:** Após falha em create, update ou remove, inclusive publicação
  ambígua, não há mutação automática dos caminhos públicos no instalador ou
  sync.
- **AC-002:** Substitutos humanos de bytes iguais ou diferentes sobrevivem nos
  limites da antiga recuperação; bytes, modo e identidade são preservados
  quando verificáveis, e caminhos afetados ou incertos são informados.
- **AC-003:** Backup e manifesto abrangem preexistentes, removíveis, estado,
  modos e ausências antes da primeira mutação pública; falha de preparação a
  impede.
- **AC-004:** Após o início registrado, falha, interrupção ou recibo inválido
  deixa pendência detectável e bloqueia mutações nas duas entradas até resolução
  explícita; consultas e diagnóstico permanecem disponíveis.
- **AC-005:** Saídas humana, JSON e sync direto informam causa, parcialidade,
  caminhos, backup e recuperação, sem conteúdo ou segredos, com truncamento e
  saída de falha.
- **AC-006:** A recuperação não altera estado ou migração parciais, diretórios,
  índice e configuração Git, nem usa estado parcial como prova de conclusão.
- **AC-007:** Backups e temporários atendem à privacidade verificável da
  plataforma; falhas de limpeza são informadas sem destruir substitutos
  públicos.
- **AC-008:** Documentação descreve revisão manual, projeto parcial, privacidade
  e limites reais de concorrência e durabilidade.
- **AC-009:** Regressões relevantes e provas nas plataformas suportadas passam;
  testes históricos são adaptados sem retirar proteção ao conteúdo humano.

## Plano de verificação

Métodos adicionais abaixo são propostas a confirmar antes da aprovação. Usar
fixtures sintéticas e código de teste versionado; guardar logs sem segredos em
`.agent-tests/recuperacao-conservadora/<execucao>/`, sem versioná-los. Cada
aceite exige prova aprovada; todos estão pendentes.

- **AC-001 — pending:** Testes rastreiam chamadas mutadoras após falha em
  atualização no instalador e no sync. Em macOS e Linux, o caso do sync
  registrou chamadas de remoção, escrita e mudança de modo do apontamento;
  falha com o código atual.
  Ampliar para create, remove e publicação ambígua nas duas entradas; o
  rastreamento cobre somente APIs instrumentadas e não prova ausência de outras
  mutações. Evidência proposta: `operacoes.log`.
- **AC-002 — pending:** Com Node 24+, executar o comando abaixo. Seis
  casos adicionais trocam conteúdo após publicação e antes da recuperação,
  sem depender de uma remoção, e conferem bytes, modo e identidade. Ampliar a
  prova para outros tipos de mudança e pontos de falha. Evidência proposta:
  `concorrencia.log`.

  ```sh
  ADK_STRICT_RECOVERY_TEST=1 node --test tests/concurrent-recovery.test.mjs
  ```

- **AC-003 — pending:** Testes propostos de backup/manifesto, com falhas em
  cada etapa. Usar fixtures com arquivos, diretórios, estado, ausências, links e
  tipos especiais; exigir backup seguro ou recusa antes de write público.
  Evidência: `backup.log`.
- **AC-004 — pending:** Testes propostos de subprocesso interrompido e dois
  processos cooperativos, usando CLI e sync direto. Início, migração, recibo
  parcial ou ambíguo e trava abandonada mantêm bloqueio; consulta e resolução
  explícita funcionam. Incluir comandos encaminhados a subprocessos e garantir
  que comandos novos não escapem da classificação. Evidência: `pendencia.log`.
- **AC-005 — pending:** Testes propostos da CLI em PT/EN/ES, humana e `--json`,
  e sync direto. Verificar erro original e orientação, sem bytes ou segredos
  sintéticos, e limites e códigos corretos. Evidência: `diagnostico.log`.
  Um incremento local informa caminhos de backup conhecidos como incertos e
  orienta revisar cópias possivelmente incompletas. Fixtures exercitam erro
  imutável, causa agrupada, saída JSON e sync direto, inclusive falha no estágio
  privado. Isso não comprova todos os idiomas, saídas, falhas ou ausência geral
  de conteúdo sensível; o critério permanece pendente.
- **AC-006 — pending:** Testes de migração e falha com repositório Git e índice
  staged. Comparar bytes, modos, diretórios, índice e configuração observados
  após falha; nenhuma restauração automática. Evidência: `estado-git.log`.
- **AC-007 — pending:** Testes de modo, ACL ou limitação declarada em cada
  plataforma, com falhas de limpeza. Verificar permissões desde a criação,
  inclusive com `umask` permissivo, resíduos informados, dados e substitutos
  preservados e limites de ACL e durabilidade registrados.
  Evidência: `privacidade.log`.
- **AC-008 — pending:** Revisão de guias e mensagens PT/EN/ES contra os cenários
  executados. A recuperação manual e os limites correspondem ao comportamento
  comprovado. Evidência: `documentacao.log`.
- **AC-009 — pending:** Testes relevantes, suíte do projeto e CI em Linux,
  macOS e Windows, com revisão independente. Regressões e casos de plataforma
  passam, sem ocultar falhas ou eliminar proteção humana. Evidência:
  `regressoes.log`.

Na rodada anterior, onze testes estritos portáteis falharam: oito reproduzem
substituições de criação e atualização no instalador e no sync durante o
rollback, dois testam
a limpeza do temporário após publicação bem-sucedida e um rastreia chamadas
do instalador após a falha. Um teste posterior também observou chamadas do
sync após falha, em macOS e Linux. As perdas foram reproduzidas nesses sistemas.
A prova estrita inclui ainda uma criação fora do projeto por troca concorrente
de ancestral da pasta de backup. Ela também falha em macOS e Linux e exige
tratamento separado da recuperação. No helper isolado de backup, outra fixture
trocou o diretório de blobs por um link e observou criação fora da raiz antes
do erro. O helper pressupõe ancestrais confiáveis e estáveis e não está ligado
ao instalador nem ao sync; essa pressuposição precisa ser tratada na integração.
Quatro testes de metadados nativos falham
em macOS: ACL e atributo estendido no instalador e no sincronizador. Eles são
ignorados em Linux. Provas separadas também detectaram perda de xattr ao
atualizar `AGENTS.md` pelo instalador e o catálogo pelo sync em container
Linux, Node 24 e tmpfs. O backup do `AGENTS.md` também perdeu o atributo;
as provas não comprovam ACLs ou outros sistemas de arquivos.
Outra prova estrita reescreve o backup após sua conferência por hash e também
falha em macOS e Linux; a verificação não é atômica com um escritor concorrente.
A reprodução em macOS mostrou que uma ACL negando escrita pode ser contornada
por `rename`: o instalador e o sync alteraram o arquivo e perderam a ACL, embora
uma abertura para escrita tenha falhado. A flag `uchg` bloqueou a substituição
do alvo nas fixtures, mas não garante que não haja outras alterações parciais.
Uma tentativa experimental de copiar por descritores preservou alguns
metadados, mas permitiu contornar a ACL e não protegeu a publicação contra
troca de ancestral; não é uma correção integrada ou validada.
Seis regressões adicionais, em `init`, `update` com legado sintético e `sync`,
exigem recusa relacionada ao alvo protegido por ACL ou `uchg` e comparam o
estado observado ao final. Elas falham na implementação atual; o snapshot
exclui `.agent-tests` e não detecta mudanças transitórias revertidas. O modo
padrão as registra como TODO, sem executar as fixtures.
Uma cópia experimental abriu, sem gravar, arquivos existentes previstos para
atualização antes das mutações. As seis fixtures de ACL e `uchg` passaram no
macOS, mas três testes históricos deixaram de alcançar o rollback de arquivos
`0444`, tanto em macOS quanto em Linux não privilegiado. O experimento não
verifica remoções, não preserva ACLs ou atributos e não fecha corridas; não foi
integrado. A política para arquivos somente leitura e a cobertura dos testes de
rollback precisam ser reconciliadas sem eliminar as provas existentes.
Em outra fixture macOS, uma ACL que negava apenas append permitiu a sondagem e a
atualização experimental, mas deixou de existir no arquivo resultante. Isso não
comprova o comportamento de outras ACLs ou filesystems. Duas regressões no
produto atual também reproduziram essa perda no instalador e no sync; o gate
nativo exige preservação ou recusa segura antes de aceitar uma release.
A execução
padrão registra TODOs sem executar as fixtures e não comprova a correção. Os
logs locais existentes são evidência da reprodução, não de aceite aprovado.
Uma revisão estática independente de trechos e das duas specs recomendou
acrescentar controle negativo ao oráculo, testar backup e registros incompletos
e reconciliar explicitamente o contrato histórico. Essas recomendações exigem
implementação e prova; a revisão não executou o código nem aprovou a entrega.

## Impacto na documentação

Revisar [instalação](../../guides/installation.md),
[solução de problemas](../../guides/troubleshooting.md),
[CLI](../../guides/cli.md),
[sync direto](../../../.pbai4devs/scripts/sincronizar-agentes/README.md),
mensagens traduzidas e outros documentos afetados pelo contrato final. Registrar
as decisões por arquivo na revisão da entrega; atualizar índices e roadmap
conforme o fluxo do projeto.

## Dependências de outras specs

- [v0.0.8](../v0.0.8/SPEC.md): contrato histórico aprovado exige restauração
  automática e AC-002 sem gravações parciais, incompatíveis com esta proposta.
- [Pasta de estado](../state-directory/SPEC.md),
  [sincronização segura](../safe-synchronization/SPEC.md) e
  [descoberta e preservação](../discovery-preservation/SPEC.md): preservação,
  migração e reconciliação também precisam ser verificadas nesta mudança.

### Reconciliação proposta

Na versão futura que implementar e comprovar esta spec, seu contrato de falha
substituirá apenas a restauração automática e a ausência de gravações próprias
parciais exigidas pela v0.0.8. A spec histórica permanece registro do contrato
daquela versão; esta proposta ainda não muda o comportamento entregue.

As demais garantias continuam: preservar conteúdo humano, índice e configuração
Git, `.gitignore` e proteção de colisões, inclusive com `--force`; preservar
modos e metadados para operações efetivamente suportadas. Testes históricos
que exigem rollback precisam de novos resultados esperados e provas de
preservação e diagnóstico, sem retirar a cobertura de conteúdo humano.

Após falha, conteúdo humano observado continua protegido, mas arquivos próprios
de estado e migração podem estar parciais. Não os interpretar como conclusão.
Em operações bem-sucedidas, a poda segue limitada a saídas de propriedade
comprovada e a reconciliação de estado continua obrigatória. Após falha, não
executar poda nem restauração automática de caminhos públicos; a reconciliação
permanece pendente de revisão e resolução explícita.

Antes de uma transição, orientar a interrupção de outros escritores, inclusive
versões antigas e processos suspensos, e a revisão do estado. A implementação
deve bloquear a mutação quando não puder comprovar as condições que exige para
uma transição segura; não deve alegar detecção universal de escritores antigos
nem que um registro, isoladamente, impeça a retomada de um processo suspenso.
O protocolo e a forma de resolução ainda precisam ser definidos e testados.

## Referências e aprovação

[PRD](../../product/prd.md), [UX/UI](../../product/ux-ui.md) e
[design](../../product/design.md) constam como aprovados;
[roadmap](../../product/roadmap.md) registra a recuperação como pendente e
separa a concorrência durante a aplicação. A
[configuração do projeto](../../../.pbai4devs/state/configuracao/ESTADO.md)
registra preparação e configuração técnica local concluídas, com falhas de
produto ainda abertas. Após correção do caminho
configurado das specs, a inspeção documental local terminou sem avisos e com
`scan.complete: true`; o inventário não substitui a leitura nem a aprovação.

Esta spec está em rascunho: revisão técnica e decisões permanecem pendentes.
A autorização geral já concedida pelo usuário não substitui a prova
das decisões nem altera o contrato histórico por si só.
