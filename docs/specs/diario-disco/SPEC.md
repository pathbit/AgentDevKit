---
description: Publicação exclusiva de registros de recuperação em um diretório privado preparado.
status: aprovado
---

# Diário de recuperação em disco

Este incremento implementa um componente isolado para publicar e inspecionar
os [registros de recuperação](../registro-recuperacao/SPEC.md). Não o conecta à
CLI, ao sync ou ao projeto consumidor e não corrige o rollback. A autorização
geral do usuário cobre o incremento. [Produto](../../product/prd.md),
[experiência](../../product/ux-ui.md), [design](../../product/design.md) e
[roadmap](../../product/roadmap.md) permanecem válidos.

## Contrato

O chamador fornece um diretório de armazenamento já preparado, privado e
confiável, contendo exclusivamente as pastas `records` e `staging`. O módulo
não cria essas pastas, não remove conteúdo nem interpreta diretórios ausentes
como diário vazio. Entradas inesperadas em `records`, links, arquivos especiais,
registros incompletos, estados pendentes e falhas de leitura impedem uma nova
reserva. A inspeção devolve estados distintos e não altera arquivos.
Em POSIX, os diretórios devem pertencer ao UID efetivo, sem permissões de
grupo/outros ou bits especiais. Os registros também devem pertencer a esse UID
e ter modo `0400`; suas propriedades observáveis são comparadas durante a
leitura. Essas verificações não comprovam a ausência de ACLs nem impedem uma
troca após a última consulta.

Para reservar uma geração, inspecionar registros e publicar `claim` no nome
canônico da próxima geração com hardlink exclusivo. Gerar bytes em arquivo
exclusivo em `staging`, criado com modo `0600` sujeito ao `umask`, torná-lo
somente leitura e sincronizá-lo antes da publicação. Antes de encadear outro
registro, sincronizar o registro anterior observado e seu diretório. Em seguida
à publicação, sincronizar o diretório de registros;
qualquer falha é reportada. A pasta `staging` preserva os arquivos de origem,
inclusive resíduos de erro; nenhum é excluído automaticamente e seu tamanho
ainda não é limitado. `begin` e `done`
seguem o mesmo procedimento, exigindo o ID da operação e a fase anterior. O
chamador fornece o hash do manifesto: o módulo não verifica o manifesto nem o
backup. Não implementar resolução ou compactação neste incremento.

Um `claim` ou `begin` sem terminal mantém a operação pendente. A publicação
exclusiva decide a disputa entre processos cooperativos; um estado `ready` lido
antes da disputa não autoriza, sozinho, uma alteração. O limite de registros e
bytes precisa reservar espaço para os três registros antes de aceitar um claim.
`E_RECOVERY_BUSY` registra `EEXIST` na publicação; não comprova quem criou o
nome. `E_RECOVERY_UNCERTAIN` informa geração, ID e tipo quando a publicação
pode ter ocorrido, sem alegar que ocorreu; falhas anteriores retornam erro de
E/S. Falha de leitura, registro inválido e fase incorreta são distintos.
Erros não devem divulgar o conteúdo dos registros ou dos arquivos do usuário.
A leitura pode atualizar metadados de acesso do sistema de arquivos.
Alterações concorrentes no inode ou uma listagem incompleta podem produzir
resultado inválido temporário. Exceções inesperadas durante a leitura também
são classificadas como diário inválido; o resultado não identifica sua causa.
O ID está visível na inspeção: não é segredo nem prova de que quem chama
`begin` ou `done` seja o processo que reservou a operação.

O módulo pressupõe que nenhum escritor externo modifica ou oculta os registros
e que o diretório fornecido é o correto e permanece seguro. Links de ancestrais,
trocas concorrentes de diretórios, ACLs e a completude física da listagem não
são garantidos por este incremento. A ausência de uma cauda inteira, escrita
por versões antigas ou removida externamente, não é detectável por hash. Uma
falha de sincronização após a publicação pode deixar o registro visível apesar
do erro; o resultado deve ser inspecionado. `fsync` não comprova resistência a
perda de energia, e hardlinks exclusivos podem ser incompatíveis com sistemas
de arquivos ou de rede. Em Windows, as operações mutáveis retornam
`E_RECOVERY_UNSUPPORTED` antes de acessar o diário; ACLs e suporte futuro
exigem prova específica. No protótipo, uma falha de `fsync` após publicar
`done` pode retornar `E_RECOVERY_UNCERTAIN` enquanto a consulta retorna
`ready`. Esse status não autoriza integrar o diário ao produto: repetir `fsync`
do recibo ou verificar apenas o backup não prova que as mudanças terminaram.
O arquivo de preparação e o registro publicado são nomes para o mesmo inode;
somente leitura reduz alterações acidentais, mas não impede edição pelo dono.

Antes da integração, ainda faltam localização e vínculo ao projeto, criação
segura, backups e manifesto completos, retenção, resolução explícita,
diagnóstico, classificação de comandos e conciliação do contrato histórico.
A resolução deverá disputar um terminal mutuamente exclusivo com `done` e
considerar escritores suspensos: apenas inserir um registro de resolução não
impede que um processo antigo volte a alterar arquivos. Não há esse bloqueio
ou procedimento de recuperação neste componente.

## Critérios de aceite

- **AC-001:** Inspeção distingue vazio, pendente, concluído e dados inválidos,
  sem seguir links nos registros nem exceder os limites do validador puro.
- **AC-002:** Claim, begin e done formam uma sequência encadeada; fase, ID,
  limites e colisões inválidos são recusados sem modificar registros existentes.
- **AC-003:** Processos reais disputam o mesmo claim: só um vence. Encerramento
  após o claim mantém pendência reconhecível em nova execução.
- **AC-004:** Falhas injetadas antes e depois do hardlink mantêm registros e
  resíduos para inspeção e não modificam arquivos públicos da fixture.
- **AC-005:** Provas passam em macOS e Linux; Windows é registrado como não
  verificado até teste real. Resultados em `.agent-tests/diario-disco/`.

Os testes não aprovam integração, recuperação de projetos reais ou release.
