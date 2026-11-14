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

`--force` não substitui arquivos próprios nem blocos alterados. Resolva o
conflito preservando o conteúdo que deseja manter e confira novamente o plano.
Arquivos gerenciados afetados recebem backup antes da escrita, inclusive em
operações normais. O campo `backup` informa uma pasta relativa ao projeto:

```text
.agent-tests/agentdevkit/backups/<identificador>/
```

O layout interno repete os caminhos originais. Para recuperar:

1. Pare as edições e faça uma cópia do projeto ou um checkpoint no Git.
2. Compare os arquivos do backup com os atuais no editor.
3. Restaure somente os arquivos desejados, preservando edições posteriores.
4. Execute `doctor` e revise o novo plano antes de aplicar qualquer correção.

Não existe comando `undo`. Copiar o backup inteiro não remove arquivos que a
operação criou; um rollback completo exige conferir o plano e o diff do Git.
Os backups são locais e ignorados; não substituem o controle de versão.

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

O `.gitignore` do hub não controla pastas irmãs. Confira a proteção local
gerada pelo kit em `info/exclude`. Para versionar configurações humanas novas
em `.github` ou `.vscode`, reabra a pasta com `!/.github/` ou `!/.vscode/`
no `.gitignore` da raiz. Confira as regras com `git check-ignore -v`.

Para pedir ajuda, inclua SO/arquitetura, versões de Node/npm/AgentDevKit,
comando executado, código de saída e trecho relevante do JSON, sem segredos.
Use as [issues do projeto][issues] ou volte ao [índice](../README.md).

[cli]: cli.md
[runtime]: installation.md#pré-requisitos
[tools]: ../../.pbai4devs/scripts/preparar-ferramentas/README.md
[issues]: https://github.com/pathbit/AgentDevKit/issues
[github-install]: installation.md#github-packages
