---
description: Comandos, opções e respostas do AgentDevKit.
---

# Referência da CLI

Execute o pacote do npm público por `npx`, sem login:

```console
npx @pathbit/agentdevkit --help
```

Para GitHub Packages, autentique conforme a [instalação](installation.md#github-packages)
e use o prefixo `npx --registry=https://npm.pkg.github.com` nos mesmos comandos.

Nas tabelas, `agentdevkit` representa esse executável. No checkout das fontes,
use `npm run cli -- <comando>` ou `node bin/agentdevkit.mjs`.
Esse código não é copiado ao projeto
atendido; lá os comandos de manutenção usam o pacote por `npx`.

## Comandos

| Comando | Resultado |
| --- | --- |
| `init [pasta]` | Instala o kit no projeto ou reaplica a instalação. |
| `update` | Atualiza a fonte usando a versão do pacote executado. |
| `sync` | Atualiza catálogos e apontamentos a partir da fonte local. |
| `sync --check` | Confere sincronização sem alterar o projeto. |
| `doctor` | Diagnostica o kit e indica divergências. |
| `recovery` | Consulta o diário e a cópia da operação pendente. |
| `recovery resolve <geração> <id>` | Encerra a pendência revisada. |
| `next` | Mostra a próxima etapa, sem iniciá-la. |
| `next --integrations` | Indica onde consultar artefatos de outros métodos. |
| `document` | Inventaria um sistema existente em leitura local. |
| `lang [idioma]` | Consulta ou altera o idioma: pt, en ou es. |
| `agents` | Mostra os clientes disponíveis e a seleção salva. |
| `agents codex,claude` | Altera a seleção e os apontamentos necessários. |
| `agents all` | Seleciona todos os clientes compatíveis. |
| `tools <ação>` | Consulta, instala, atualiza ou executa ferramentas. |
| `--help`, `--version` | Ajuda ou versão do pacote. |

Sem comando, a CLI executa `init`, que pode criar arquivos. `language` é alias
de `lang`; `clients`, de `agents`. O idioma não traduz documentos existentes.

Se o diário indicar uma operação pendente, consulte o
[procedimento de recuperação](troubleshooting.md#retomar-após-uma-interrupção)
antes de executar `recovery resolve`.

## Opções

| Opção | Uso |
| --- | --- |
| `--target <pasta>` | Projeto-alvo; não combine com a pasta de `init`. |
| `--lang <idioma>` | Idioma desta execução. |
| `--agents <lista>` | IDs separados por vírgula, ou `all`. |
| `--clients <lista>` | Alias de `--agents`. |
| `--yes`, `-y` | Evita perguntas iniciais; não força conflitos. |
| `--dry-run` | Exibe o plano sem aplicar alterações. |
| `--force` | Solicita reparos gerenciados permitidos, com backup. |
| `--json` | Produz uma resposta JSON para automação. |
| `--intent` | Objetivo da consulta `next`. |
| `--purpose` | Objetivo que orienta o próximo passo em `init`. |
| `--markdown` | Em `document`, emite o inventário em Markdown. |
| `--integrations` | Em `next`: consulta de referências externas no projeto. |

No primeiro uso em terminal, o assistente pergunta o idioma ou os clientes
que faltam e o objetivo. Com idioma e clientes explícitos, use `--purpose`
para indicar o objetivo. Sem interação, valem as opções explícitas, a
seleção salva e, por último, `all`. Confira os [IDs e dependências](../../.pbai4devs/COMPATIBILIDADE.md).

Use `init --purpose agents|product|run|document` para indicar se quer preparar
os agentes, planejar produto, rodar a aplicação ou documentar o que existe.
O objetivo orienta a próxima ação da CLI.

`update` usa a versão executada; para escolher outra, fixe-a no nome do
pacote. `sync` usa o que já está em `.pbai4devs`: ele não baixa outra versão.
Ambos conciliam recursos e removem apontamentos obsoletos quando a propriedade
do kit é comprovada. Recursos e configurações próprios permanecem no projeto.
Diretórios antigos sem comprovação de propriedade podem permanecer vazios.
Ao mudar a seleção, pastas compartilhadas continuam quando outro cliente
precisa delas; arquivos adicionais da equipe devem ser preservados.

Em instalações legadas na versão `0.0.21`, `init --force` e `update --force`
podem substituir um
`.pbai4devs/catalog.json` preexistente. Preserve uma cópia fora do projeto
antes de executar esses comandos nessa versão. Nas fixtures testadas, `init`
da `0.0.21` também acrescentou regras a `.git/info/exclude`; confira esse
arquivo se precisar manter a configuração Git intacta.

Antes de aplicar em projeto existente, confira o plano e depois o diagnóstico:

```console
npx @pathbit/agentdevkit update --dry-run --json
npx @pathbit/agentdevkit update
npx @pathbit/agentdevkit doctor
npx @pathbit/agentdevkit sync --check
```

Use `init --dry-run --json`, `sync --dry-run --json` ou
`agents codex,claude --dry-run --json` para as outras operações. Examine
`plan`, `conflicts`, `preserved`, `untrackedPaths` e `localIgnore` antes de
aplicar. Conflitos sem solução interrompem a operação; não presuma que uma
colisão de nomes torna um arquivo propriedade do kit.
Ao atualizar uma instalação antiga com regras Claude, a CLI pode preservar
as regras e recusar a operação por escopo ou metadados não verificados,
inclusive com `--force`. Revise os arquivos indicados e suas fontes e
dependências; não apague as regras para contornar a recusa. Um hash registrado
não comprova os metadados atuais nem a ativação efetiva no cliente.
A saída humana mostra até cinco caminhos em conflito; use `--json` para a
lista completa e os motivos disponíveis em `preserved`.
Na migração da 0.0.21, o kit atualiza referências Claude globais com origem
comprovada. A referência Git antiga só é retirada quando o conteúdo exato
é comprovado e o caminho está fora do índice.
Uma referência Markdown existente, integralmente idêntica à gerada e sem
registro anterior, é preservada e pode satisfazer a descoberta sem ser adotada.
Registros históricos de remoção seguem a política anterior e exigem revisão.
As verificações não são atômicas com outras alterações no sistema de arquivos:
evite editar os arquivos envolvidos enquanto a operação estiver em andamento.

O sincronizador independente também pode ser executado pelo
[script local](../../.pbai4devs/scripts/sincronizar-agentes/README.md). Seu
`--check` apenas confere e `--force` é explícito na linha de comando. O
comando agêntico [sincronizar](../../.pbai4devs/commands/sincronizar/COMMAND.md)
orienta revisar e aplicar o plano pela CLI; `--force` é uma opção explícita.

O campo `localIgnore.legacyMigration` mostra a migração planejada ou aplicada
do bloco da 0.0.21 em `.git/info/exclude`. Se aplicada, informa o caminho da
cópia original. A configuração e o índice Git permanecem preservados, e
`untrackedPaths` permanece vazio. Consulte [Git e migração](installation.md#git-e-migração)
para as condições e os avisos de visibilidade.

## Ferramentas

As ações são `list`, `setup`, `install`, `update`, `check`, `info`, `run`
e `unlock`. Consultar ou executar não instala silenciosamente.
`setup` prepara as ferramentas compatíveis; outros comandos podem receber
um nome ou grupo. Consulte [ferramentas e testes](tools-and-testing.md).

Em `tools`, use `--` antes dos argumentos que pertencem à ferramenta:

```console
npx @pathbit/agentdevkit tools run agent-browser -- --json --help
```

Nesse exemplo, `--json` pertence ao agent-browser. Opções do kit ficam antes
do separador. `--help` e `--version` do kit não exigem um projeto instalado.

## JSON e retorno

As respostas JSON incluem `ok`, `command`, `version`, `language`, `target` e
`next`. Conforme a operação, há seleção, plano, conflitos, backup e erros.
Leia os campos estruturados, não dependa da tradução da mensagem.
Em `next --intent product`, após uma inspeção concluída, `stage` identifica a
etapa sugerida e `maturity` indica a maturidade detectada. Sem kit instalado ou
com inventário incompleto, `maturity` não é informado. Não são aprovações.
`next --integrations` acrescenta `integrations` à resposta normal, com
`id`, `name`, `url`, `paths` relativos à raiz e `instruction` por método.
A consulta funciona antes da instalação. Ela indica apenas caminhos padrão
reconhecidos e não abre documentos externos, baixa pacotes ou executa ferramentas.
`preserved` lista caminhos mantidos pelo projeto e o motivo.
Um complemento pode ser gerenciado por bloco sem tornar o arquivo propriedade
do kit. Conteúdo humano não é substituído por `--force`.
Se o planejamento, a aplicação ou `tools` falhar após uma possível alteração,
`next` nessa resposta orienta preservar arquivos e revisar o estado antes de
retomar. Esse aviso não cria uma pendência persistente nem impede outra chamada.
Se a própria saída falhar, ela pode estar incompleta; não suponha que uma
resposta JSON parcial possa ser recuperada automaticamente.

| Código | Significado |
| --- | --- |
| `0` | Operação concluída; examine também o tipo da resposta. |
| `1` | Falha, conflito ou diagnóstico com pendências. |
| `2` | Argumentos inválidos; ferramentas podem propagar outros códigos. |

`doctor` verifica o kit, não o produto inteiro. `next` pode terminar com
sucesso enquanto orienta uma etapa ainda pendente.
Em um repositório Git saudável, siga o comando copiado da saída de `init` ou
`update` para `doctor`, depois `sync --check` e `next`. Se houver
divergências, revise o diagnóstico e use `sync --dry-run --json` quando
indicado para conferir o plano de sincronização.
Para uma nova funcionalidade, use `next --intent product`; para preparar a
execução de um projeto existente, use `next --intent run`. Sem `--intent`, a
consulta mantém o comportamento anterior. O diagnóstico não inicia a etapa nem comprova
aprovações: confira os documentos e decisões existentes antes de agir.
Após produto e design, ele usa os caminhos de roadmap e specs registrados no
estado. Para orientar uma spec existente, exige uma única referência aberta
`[ ]` ou em andamento `[-]` no roadmap. Com mais de uma spec, entrega encerrada,
vínculo ausente ou leitura ambígua, orienta a revisão do roadmap. Um status
declarado não comprova aprovação: a skill confere decisões e evidências. Com uma
spec aberta e declarada aprovada, `implementar-spec` verifica o plano antes de
encaminhar a configuração técnica; `next` não presume aprovação do plano.
Se o inventário for truncado, `next` orienta inspeção manual, sem escolher uma
fase ou presumir que um projeto existente está vazio.
Na intenção de produto, avisos no inventário documental também pedem inspeção:
isso inclui caminhos inválidos, erros de leitura e links simbólicos não seguidos,
mesmo quando um link pareça não ser documentação. Consulte o inspetor para ver
os avisos e decida após verificar os arquivos relevantes.

Use a [comparação de métodos](comparacao.md) para decidir se vale consultar
um artefato externo. Quando `next` encontra referências, a consulta adicional
preserva a etapa e a skill indicadas para o projeto.

## Inventário de um sistema existente

`document` funciona antes da instalação. Na pasta do projeto, use
`npx @pathbit/agentdevkit document` para consultar o inventário local, ou
acrescente `--json` para automação. São apresentados manifestos, nomes de
scripts, infraestrutura, amostras de arquivos, testes, documentos e lacunas.

`document --markdown` emite na saída um levantamento com
`status: rascunho`. Os comportamentos ficam pendentes até a leitura das
fontes. `next --intent document` indica `document` e, com o kit instalado,
a skill `documentar-legado`. Veja como transformar o inventário em trabalho
documental no [guia de documentação](documentation.md#documentar-um-sistema-em-uso).

[Wiki](../README.md) · [Solução de problemas](troubleshooting.md)
