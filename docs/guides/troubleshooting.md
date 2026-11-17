---
description: Diagnóstico, conflitos, backups e recuperação do AgentDevKit.
---

# Solução de problemas

Comece pelo erro completo e pelo diretório usado. Nos exemplos, `agentdevkit`
representa o executável obtido por npx, conforme a [referência da CLI][cli].
O comando completo está na [instalação](installation.md).

## Diagnóstico rápido

```console
agentdevkit --version
agentdevkit doctor --target "./meu projeto" --json
agentdevkit sync --check --target "./meu projeto" --json
```

`doctor` verifica a instalação do kit. Para as ferramentas, use
`agentdevkit tools check all`; para o aplicativo, use os testes do projeto.
Antes de compartilhar uma saída, remova dados privados e caminhos pessoais.

Se o Gemini CLI não listar skills do projeto, execute `gemini skills list` na
raiz e confira se `Location` aponta para `.gemini/skills/` do projeto. Skills
locais exigem que a pasta seja confiável; revise seu conteúdo antes de aprovar
a confiança pelo cliente. Em uma sessão aberta, use `/skills reload` e depois
`/skills list`. Veja a [documentação oficial de descoberta][gemini-trust].

No OpenCode 2, uma consulta imediata isolada de `skill.list` pode retornar uma
lista vazia mesmo com os arquivos presentes. Confira novamente no servidor já
inicializado e compare as localizações das skills com `.opencode/skills/`.
Uma lista vazia isolada não comprova que os arquivos estejam ausentes. O modo
`--standalone` usa um servidor privado para a execução; veja a
[documentação do cliente][opencode-cli].

Se faltarem recursos, confira a seleção com `agentdevkit agents`.
Para incluir um cliente, use `agentdevkit agents codex,claude` com a lista
completa, ou `agentdevkit agents all`. Reabra a sessão do cliente quando ele
exigir recarregar as skills. Pastas compartilhadas podem atender mais de um
agente; arquivos próprios também podem manter uma pasta após a desmarcação.

| Sintoma ou código | Próxima ação |
| --- | --- |
| `node` ou `npx` não encontrado | Siga [sem Node/npm][runtime]. |
| `E401` ou `E403` no registry | No npm, confira o destino; no GitHub, confira [token e login][github-install]. |
| `E404` ao baixar o pacote | Confira registry, versão e permissão. |
| `E_ARGS` | Confira comando e aspas com `agentdevkit --help`. |
| `E_MISSING` | Confirme `--target`; inicialize o projeto correto. |
| `E_TARGET`, `E_SYMLINK` | Use a pasta real, fora dos diretórios reservados. |
| `E_CONFLICT` ou lista `conflicts` | Revise o plano e os arquivos afetados. |
| `E_STATE`, `E_BLOCK`, `E_TEMPLATE` | Restaure o arquivo; não invente hashes. |
| `E_MANAGED_BLOCK` | Revise marcadores ou formato; preserve suas instruções. |
| `E_CHANGED` | Um arquivo mudou durante a operação; gere outro plano. |
| `plan-inspection-failed` | Revise a falha do planejamento. |
| `E_MIGRATION_REVIEW` | Preserve o estado legado e revise a reativação. |

No macOS, `/tmp` e `/var/folders` são aceitos quando forem os aliases de
sistema esperados. Destinos que atravessam links humanos continuam recusados,
inclusive quando apontados por `TMPDIR`, `TEMP` ou `TMP`.

## Conflitos e backups

Simule antes de substituir uma alteração própria:

```console
agentdevkit update --target "./meu projeto" --dry-run --json
```

Compare cada `conflicts` com o que deseja manter. Edite a origem em
`.pbai4devs/`, não os apontamentos gerados, quando estiver personalizando um
recurso. Use `sync` para atualizar suas derivações. `update` reaplica os
recursos do pacote invocado e pode conflitar com essa personalização.

O campo `preserved` pode detalhar o motivo observado. Por exemplo,
`claude-metadata-unverified` pede revisão da referência e seus metadados; ele
não comprova propriedade nem que a regra esteja ativa. Uma referência idêntica
indicada por `existing-reference-satisfied` continua sem adoção pelo kit.

Para regras legadas em `.claude/rules/`, compare o conteúdo e o escopo de
ativação da referência preservada com a origem indicada. Verifique também se
o arquivo tem conteúdo preparado no índice antes de decidir qualquer mudança:

```console
git ls-files --stage -- ".claude/rules/caminho/RULE.md"
git --no-optional-locks diff --cached -- ".claude/rules/caminho/RULE.md"
git --no-optional-locks diff -- ".claude/rules/caminho/RULE.md"
```

Substitua o caminho pelo conflito informado. As consultas desativam a
atualização opcional do índice pelo Git;
uma regra preservada pode continuar ativa globalmente. Não remova nem edite a
referência com base apenas no hash: revise seu conteúdo, metadados e impacto
com os responsáveis pelo projeto. Depois da decisão, execute novamente o
`update --dry-run --json` e confira o plano e o índice.

`--force` não substitui arquivos próprios nem blocos alterados. Resolva o
conflito preservando o conteúdo que deseja manter e confira novamente o plano.
O instalador copia os arquivos preexistentes incluídos em seu plano de backup;
criações e diretórios podem não estar cobertos. Em caso de sucesso, o campo
`backup`, quando presente, informa uma pasta relativa ao projeto:

```text
.agent-tests/agentdevkit/backups/<identificador>/
```

O layout interno repete os caminhos originais. Para recuperar:

1. Pare as edições e faça uma cópia do projeto ou um checkpoint no Git.
2. Compare os arquivos do backup com os atuais no editor.
3. Restaure somente os arquivos desejados, preservando edições posteriores;
   confira também as permissões e ACLs aplicáveis.
4. Execute `doctor` e revise o novo plano antes de aplicar qualquer correção.

Não existe comando `undo`. Copiar o backup inteiro não remove arquivos que a
operação criou; um rollback completo exige conferir o plano e o diff do Git.
Após falha, os caminhos informados para revisão podem incluir uma cópia
parcial, um caminho ausente ou dados de outra origem. Sua presença não comprova
que o backup está completo ou íntegro; compare antes de restaurar.
Os backups são locais e podem conter dados privados. Eles podem aparecer no
Git, conforme os ignores existentes; confira sua visibilidade antes de usar
`git add`. No POSIX, o instalador cria cada raiz de backup com acesso restrito
e preserva o modo dos arquivos copiados. ACLs, acesso privilegiado, troca
concorrente de pastas e Windows exigem verificação própria; não assuma sigilo
apenas pelos bits POSIX. Se um sistema de arquivos POSIX informar permissões
amplas para a nova pasta, a operação falha com `E_BACKUP` antes da cópia.
Backups não substituem o controle de versão.

Atualizações usam a cópia nativa da plataforma para preservar os metadados
suportados; falhas detectadas durante a cópia interrompem a publicação. No
macOS, ACLs legíveis e xattrs são mantidos; ACLs que negam escrita, flags de
proteção ou consultas inconclusivas bloqueiam a alteração. A verificação não
cobre ACLs de diretórios ou todos os filesystems.
No Linux, a cópia pede ao `cp` que preserve xattrs e o verificador compara os
atributos quando `getfattr` está disponível. Sem essa ferramenta, a cópia pode
prosseguir com aviso, mas a preservação de xattrs não foi verificada de forma
independente. Remoções e Windows têm limites próprios; mantenha uma cópia
verificada dos dados importantes antes de recuperar arquivos.

Se planejamento, aplicação ou uma ferramenta falhar após uma possível
alteração, interrompa outras operações e preserve arquivos e backups até
revisar o estado. A orientação aparece na resposta imediata, mas não bloqueia
novas chamadas: `next` não registra uma pendência persistente de recuperação.

Se o planejamento encontrar um caminho incerto no estágio temporário, o kit
pode manter e informar a pasta inteira no diretório temporário do sistema.
Ela pode conter cópias de arquivos do projeto. Confira o caminho e seu
conteúdo antes de removê-la; um caminho informado como incerto pode já não
existir. O sigilo depende das permissões e ACLs do ambiente.
Uma falha na aplicação ou no sync, antes ou depois da tentativa de publicar,
pode deixar um temporário no projeto; confira o caminho informado e seu
conteúdo antes de removê-lo.

Após uma falha, a recuperação tenta preservar e informar caminhos cuja
identidade não pôde ser comprovada. O número de identidades acompanhadas é
limitado; sob pressão de descritores, outras alterações também podem ser
preservadas. Com um limite muito baixo de descritores, como 32, a operação pode
falhar: revise os caminhos informados e aumente o limite antes de tentar de novo.
A verificação e a remoção ou restauração
de um arquivo são operações separadas: uma edição concorrente exatamente nesse
intervalo ainda pode ser perdida. Evite editar os mesmos caminhos durante a
instalação ou sincronização e revise o resultado antes de retomar o trabalho.

## Estado ou apontamentos inconsistentes

Se a instalação ainda usa `.pbai4devs/estado`, execute `agentdevkit update`
para migrar os dados e atualizar os scripts juntos. Se `estado` e `state`
coexistirem, compare e preserve as duas pastas antes de resolver o conflito;
o kit não escolhe nem sobrescreve uma delas automaticamente.
Se a configuração apontar para caminhos dentro da pasta antiga, atualize
esses caminhos para `.pbai4devs/state` antes de tentar novamente. O kit não
reescreve as decisões do projeto.

`missing`, `modified` e `outdated` em `issues` indicam arquivo ausente,
conteúdo alterado ou derivação pendente. Use `sync --check` para inspecionar;
se as alterações da origem forem intencionais, execute `sync` e confira de novo.

`removed-file-unverified` no `doctor` ou `sync --check` indica que um registro
de remoção em `derived.json` não tem entrada no estado instalado. Se a entrada
existir com hash diferente, o estado é inválido e a CLI retorna `E_STATE`. O
sincronizador direto também avisa. Se o planejamento falhar depois da leitura,
o `sync --check` indica que a observação foi anterior à falha; erros antes da
leitura ainda podem ocultá-la. Isso pode ser histórico legítimo. Preserve o
estado e o arquivo indicado e revise sua origem antes de atualizar: o
kit conserva registros desconhecidos e bloqueia alterações no alvo
identificado pela mesma grafia, inclusive com `--force`. A comparação de aliases
e a reconciliação automática da migração ainda não estão completas. Não ajuste
hashes para ocultar o aviso.

`E_MIGRATION_REVIEW` pode interromper o planejamento quando um registro de
remoção corresponde ao estado instalado, o alvo está ausente e sua recriação é
planejada durante a migração. Preserve o estado e o alvo, se existir, e revise
ambos antes de prosseguir; não apague o registro para contornar o erro. A
migração automática desse caso ainda não está disponível.

Se `.pbai4devs/state/agentdevkit.json` estiver inválido, recupere um backup
local coerente com os arquivos correspondentes. O estado pessoal não é
versionado. Não invente hashes nem apague o estado para ocultar conflitos;
peça ao agente para comparar as fontes e planejar o reparo com `init`/`sync`.

Entradas humanas recebem um bloco delimitado do kit. Edite fora dos marcadores
`BEGIN AGENTDEVKIT` e `END AGENTDEVKIT`; não altere hashes do estado. Um bloco
modificado precisa de revisão, mesmo com `--force`. Se o recurso for retirado,
somente seu bloco comprovado é removido, preservando o texto humano.
Links humanos preexistentes nas entradas e nos clientes são mantidos sem
atravessá-los. Consulte `preserved` no JSON para ver as rotas mantidas sob
controle do projeto, inclusive quando complementadas. Não transforme o hub
ou caminhos já gerenciados em links.
Destinos dentro de `.git`, `node_modules` ou `.pbai4devs` são recusados,
inclusive com variações de maiúsculas/minúsculas.

No script `sincronizar-agentes`, `--force` repara conflitos gerenciados com
backup. A CLI bloqueia conflitos de propriedade mesmo com `--force`. Recursos
nativos humanos e links preservados continuam intactos. Para manter a instalação
e sua seleção de clientes, prefira a CLI.

## Download, plataforma ou ferramenta falhando

Confira o destino padrão e um possível mapeamento do escopo:

```console
npm config get registry
npm config get @pathbit:registry
```

Um valor de `@pathbit:registry` prevalece sobre `npx --registry=...`.
Se esse mapeamento foi criado apenas para uma instalação antiga, remova
**somente essa chave** do arquivo que a definiu. No arquivo do usuário:

```console
npm config delete @pathbit:registry --location=user
```

Se a chave está no `.npmrc` do projeto ou em variáveis de ambiente, revise
nesse local; o comando acima não muda essas configurações. Preserve mapeamentos
exigidos por outras dependências e nunca apague o `.npmrc` inteiro.
Sem mapeamento do escopo, escolha o registry por execução no
[guia de instalação](installation.md#instalar).

O npm público não exige login para baixar o kit. No GitHub Packages, use
um token clássico com `read:packages` e o [login específico][github-install].
Publicar versões exige permissões adicionais; login no GitHub CLI (`gh`)
não configura automaticamente a autenticação do npm.

Confira acesso ao GitHub, ao registro npm e a `nodejs.org`, conforme a etapa.
Mantenha a verificação de certificados e hashes; resolva proxy, rede ou
dependências do SO e repita. Não troque por um binário de outra arquitetura.
O launcher aceita Node.js 18+ e prepara Node 24+ para o núcleo. Sem Node/npm,
o agente precisa instalar o runtime pelo mecanismo do SO antes de usar npx.

`tools setup` reutiliza instalações saudáveis e verifica as compatíveis.
Não aplicável em uma seleção geral não significa “instalado”. Esse preparo
também não baixa browsers, concede permissões desktop ou inicia aplicativos.
Veja [ferramentas][tools] para requisitos adicionais da tarefa.

Um lock indica instalação em andamento ou interrompida. Aguarde a operação
ativa. Se o processo terminou, tente `agentdevkit tools unlock <nome>`; só um lock
local com PID comprovadamente morto é removido. Não apague locks ativos ou
indeterminados para forçar duas instalações ao mesmo tempo.

## Sessões, loops ou calculadora abrindo

O AgentDevKit não agenda sessões, abre a calculadora nem inicia loops por
conta própria. Uma execução explícita de ferramenta pode abrir o aplicativo
solicitado. Se algo continua executando, identifique a sessão, tarefa do
editor, extensão ou processo que o iniciou e pare-o pela interface responsável.
Apagar apenas os logs não interrompe um processo que continua gravando.

Pastas de clientes e saídas como `.opencode/opencode-loop`, `.playwright*`,
caches e relatórios
não devem ser versionados. Verifique com `git status` e `git check-ignore -v
<caminho>`. Se um arquivo já estava rastreado, acrescentar um ignore não o
retira automaticamente do Git; revise a remoção do índice sem apagar dados.

O `.gitignore` do hub não controla pastas irmãs. O kit preserva as regras Git
existentes; confira a visibilidade com `git check-ignore -v` e ajuste as regras
do projeto quando necessário. Um bloco antigo em `info/exclude` pode afetar
outras worktrees e não é removido automaticamente.
O diagnóstico `shared-ignore-legacy` pode manter `doctor` e `sync --check` com
pendências mesmo após um update; confira o bloco e seu efeito em cada worktree
antes de decidir qualquer ajuste nas regras Git. O aviso reconhece apenas um
marcador de início semelhante ao antigo: ele não prova autoria, integridade
nem identifica todos os blocos alterados. As regras existentes continuam em
vigor enquanto permanecerem no arquivo.
Avisos `artifact-coverage-unverified` e `artifact-unprotected` são informativos:
eles indicam cobertura não comprovada ou artefatos visíveis, mas não bloqueiam
o check isoladamente. Verifique-os antes de versionar arquivos locais.

Para investigar sem alterar as regras, consulte os caminhos e, em cada
worktree, um arquivo escolhido para verificar:

```bash
git -C "<projeto>" rev-parse --git-path info/exclude
git -C "<projeto>" worktree list --porcelain
git -C "<worktree>" check-ignore -v --no-index -- "<caminho>"
```

Uma regra iniciada por `!` é uma exceção. Sem correspondência, `check-ignore`
retorna 1; erros operacionais devem ser investigados separadamente. A opção
`--no-index` consulta regras mesmo para arquivos rastreados e não informa se
o arquivo está no índice. Revise o conteúdo e os efeitos antes de decidir
qualquer alteração; o kit não remove o bloco automaticamente.

Se aparecer `E_GIT_ENV`, há uma variável de ambiente que redireciona o
repositório ou o índice Git. Revise `GIT_DIR`, `GIT_WORK_TREE`, `GIT_COMMON_DIR`
e `GIT_INDEX_FILE` na sessão e execute novamente sem os redirecionamentos. O kit
interrompe a operação para proteger os arquivos e o índice selecionados.

Se o sync não conseguir consultar um Git ancestral, confira a raiz que o Git
descobre com `git -C "<projeto>" rev-parse --show-toplevel`. Uma montagem em
outro sistema de arquivos pode interromper essa descoberta; confirme qual
repositório e índice pertencem ao projeto antes de alterar o ambiente Git.

Na versão em desenvolvimento, `E_NESTED_GIT` indica que um caminho a alterar
ou a área de backup atravessa outro repositório Git. Um submódulo ainda não
inicializado também pode bloquear a operação pelo índice externo. Confira o
projeto, o submódulo e seus índices antes de escolher outro destino; um
submódulo independente fora dos caminhos afetados não precisa ser removido.
O sync escolhe o nome completo do backup antes de verificar o índice, de modo
que um submódulo irmão não relacionado pode coexistir com ele. O instalador
ainda pode recusar submódulos dentro da pasta de backups por precaução.
A verificação `--check` não reserva o nome que será usado em outra execução.
Se a fronteira surgir durante a operação, ela pode parar parcialmente aplicada
e preservar os caminhos informados sem reverter as alterações já feitas.
Essas verificações não são atômicas com alterações concorrentes. Um índice com
nomes que não podem ser decodificados como UTF-8 também pode impedir a operação
por precaução, mesmo quando o caminho problemático não está relacionado.
Em uma fixture, um processo com acesso à pasta de backup trocou um diretório
ancestral por um link durante o sync e causou criação de arquivo fora do projeto.
Evite escritores concorrentes na pasta de backup; `0700` não impede outro
processo do mesmo usuário. A correção completa ainda está pendente.
Uma edição concorrente depois da verificação do conteúdo também pode fazer o
sync informar como válido um backup alterado; confira-o antes da recuperação.

No Windows, nomes curtos NTFS podem apontar para nomes diferentes. Quando a
identidade de caminhos preparados não pode ser verificada, o kit pode indicar
`E_STAGED` mesmo para arquivos aparentemente independentes. Revise o índice antes
de tentar novamente. A criação exclusiva usa hardlinks no mesmo volume; se o
volume não os suportar, a operação falha e os arquivos existentes são
preservados. Sistemas de arquivos remotos podem ter aliases próprios que essa
verificação não consegue identificar em todos os casos.

Para pedir ajuda, inclua SO/arquitetura, versões de Node/npm/AgentDevKit,
comando executado, código de saída e trecho relevante do JSON, sem segredos.
Use as [issues do projeto][issues] ou volte ao [índice](../README.md).

[cli]: cli.md
[runtime]: installation.md#pré-requisitos
[tools]: ../../.pbai4devs/scripts/preparar-ferramentas/README.md
[issues]: https://github.com/pathbit/AgentDevKit/issues
[github-install]: installation.md#github-packages
[gemini-trust]: https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/tutorials/skills-getting-started.md
[opencode-cli]: https://opencode.ai/docs/cli/
