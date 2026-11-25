---
description: Instalação do AgentDevKit e geração local dos agentes.
---

# Instalação

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

O pacote traz o gerador e as fontes compartilhadas. A instalação prepara
`.pbai4devs` e cria somente os apontamentos dos agentes escolhidos.

- [Começo rápido com um cliente](../../README.md#começo-rápido).
- [Instalar pela primeira vez](#instalar).
- [Simular em um projeto existente](#simular-em-um-projeto-existente).
- [Usar o hub apenas no checkout local](#usar-o-hub-apenas-no-checkout-local).
- [Atualizar ou mudar clientes](#atualizar-e-escolher-agentes).

## Pré-requisitos

Prepare [Node.js 24+ com npm e npx](prerequisites.md) no Windows, macOS ou Linux.
O guia inclui instalação manual e como pedir ao agente para preparar a máquina.
Git é opcional para instalar o kit. O launcher aceita Node 18 para preparar
um runtime local usando `tar`. Veja o [bootstrap][bootstrap] para as regras
de seleção e cache no Windows.

Node.js é um pré-requisito da CLI. Uma API .NET continua usando seu SDK, um
projeto Python continua usando seu ambiente e uma pasta de documentação
pode receber o kit sem instalar ferramentas da aplicação.

## Instalar

Os dois registries oferecem o mesmo [`@pathbit/agentdevkit`](../maintainers/packages.md).
Escolha um deles e execute na pasta do projeto.

### npm público

É o caminho padrão e não exige conta nem login:

```console
npx @pathbit/agentdevkit init
```

Se o npm pedir confirmação para baixar o pacote, confirme para continuar.

No menu, use as setas e **Espaço** para marcar agentes.
Pressione **Enter** para confirmar ou **Esc** para cancelar. Para trocar a
seleção em um projeto instalado, execute:

```console
npx @pathbit/agentdevkit agents --select
```

Com Node.js e o npm que vem com ele, a instalação funciona em uma pasta
sem Git. As ferramentas da aplicação e os clientes de código são necessários
quando você for usá-los. O kit não os instala durante `init`.
Para testar o menu no checkout em desenvolvimento, use
`npm run cli -- init` ou `npm run cli -- agents --select`.

Com outro gerenciador instalado, você também pode executar:

```console
pnpm dlx @pathbit/agentdevkit init
yarn dlx @pathbit/agentdevkit init
bun x @pathbit/agentdevkit init
```

As quatro formas foram exercitadas no macOS com a versão `0.0.30` publicada.
O contrato de preservação da versão atual está em [Git e migração](#git-e-migração).
Com Yarn, `yarn dlx -q` evita mensagens do gerenciador antes da saída `--json`.

Para escolher explicitamente esse registry:

```console
npx --registry=https://registry.npmjs.org @pathbit/agentdevkit init
```

### GitHub Packages

O pacote é público, mas esse registry exige autenticação para baixar.
Crie um [personal access token clássico][tokens] com `read:packages`.
Autentique uma vez no seu computador:

```console
npm login --registry=https://npm.pkg.github.com --auth-type=legacy --scope=
```

Informe seu usuário do GitHub e use o token no campo de senha. O npm guarda
a credencial no arquivo do seu usuário, vinculada ao host do GitHub.
`--scope=` evita criar um mapeamento permanente do escopo; nunca coloque
o token nos comandos compartilhados ou no repositório. Veja a
[autenticação oficial][github-auth].

Depois instale com npx:

```console
npx --registry=https://npm.pkg.github.com @pathbit/agentdevkit init
```

As opções de npx, como `--registry`, ficam **antes** do nome do pacote.
Um `@pathbit:registry` já configurado pode prevalecer sobre essa opção;
confira o [diagnóstico de registry](troubleshooting.md#download-plataforma-ou-ferramenta-falhando).

### Opções e verificação

Sem comando adicional, o pacote executa `init`. No primeiro uso interativo,
o assistente pede o idioma, a seleção de agentes e o objetivo que faltarem.
Em terminais sem suporte ao menu, digite os IDs separados por vírgulas.
Com idioma e clientes explícitos, use `--purpose` para indicar o objetivo.
No chat de um agente desktop, diga qual cliente quer usar e peça para
executar a CLI na pasta do projeto.

Consulte [CLI](cli.md) para acrescentar seleção, destino e simulação. `--json`,
`--yes`, `--dry-run` ou ausência de terminal interativo evitam perguntas.
Sem escolha explícita ou salva, `none` prepara as instruções compartilhadas
e `AGENTS.md`. Comece com o ID do cliente que você usa. É possível acrescentar
outro depois com `agents add <id>`. A opção `--agents all` seleciona todos
os clientes ativos. [Lista de clientes][clients]

Após instalar, confirme a versão e confira o diagnóstico:

```console
npx @pathbit/agentdevkit --version
npx @pathbit/agentdevkit doctor
```

Num projeto com Git, use também `npx @pathbit/agentdevkit sync --check`
para conferir os apontamentos. Sem Git, `doctor` pode informar uma
pendência de regras locais do Git. [Diagnóstico e sincronização][diagnostics]

Se escolheu GitHub Packages, use o mesmo prefixo
`npx --registry=https://npm.pkg.github.com` nesses comandos. Para fixar uma
versão, acrescente-a ao nome do pacote. Use a mesma versão para simular,
aplicar e verificar.
Consulte `npx @pathbit/agentdevkit next` para retomar pelo objetivo do projeto.
Prepare [as ferramentas](prerequisites.md#depois-de-instalar-o-kit) quando a
tarefa exigir.

### Simular em um projeto existente

Na raiz do projeto, use o mesmo idioma e cliente na simulação e na aplicação.
Neste exemplo, o cliente é Codex:

```console
npx @pathbit/agentdevkit init --lang pt --agents codex --dry-run
```

O plano lista mudanças e conflitos. Acrescente `--json` para consultar a lista
completa e os motivos de preservação. Depois da revisão, execute o mesmo
`init` sem `--dry-run`. Para instalar só as instruções compartilhadas, use
`--agents none` nos dois comandos. Se o kit já está instalado, simule
[`update`](#atualizar-e-escolher-agentes). Em um monorepo, escolha a raiz
onde a equipe mantém as instruções e abra o agente nesse mesmo diretório.

### Usar o hub apenas no checkout local

Use `init --local` quando quiser manter o hub `.pbai4devs` no seu checkout.
O kit grava a regra em `.pbai4devs/.gitignore`. Isso também ajuda quando um
validador do projeto usa a listagem do Git para selecionar seus próprios
arquivos. Na pasta do projeto, simule a instalação.

```console
npx @pathbit/agentdevkit init --local --agents none --lang pt --dry-run
```

Revise o plano e repita o comando sem `--dry-run`. O mesmo `init --local`
ativa o modo em uma instalação existente. Use `doctor` e `sync --check`
na mesma pasta para conferir o resultado. `update` e `sync` preservam a
escolha salva.

A regra abrange arquivos ainda não rastreados dentro de `.pbai4devs`.
O índice, a configuração e o `.gitignore` da raiz do projeto são preservados.
Arquivos já rastreados continuam rastreados. `AGENTS.md`, arquivos dos
clientes e artefatos de teste dependem das regras do projeto e podem aparecer
em `git status`.

## O que fica no projeto

| Conteúdo | Tratamento |
| --- | --- |
| `.pbai4devs` com recursos e templates | Fonte compartilhada do kit. |
| Recursos nos clientes | Apontamentos locais; podem aparecer no Git. |
| Entradas da raiz criadas pelo kit | Arquivos locais gerados. |
| Índices, manifesto e seleção | Derivados locais; confira o ignore do kit. |
| Arquivos humanos | Confira o plano e os limites abaixo. |
| Downloads e resultados de testes | Locais; confira as regras do projeto. |
| `.pbai4devs/LICENSE` | Licença MIT do kit, copiada do pacote. |

As atualizações preservam ACLs e atributos estendidos suportados pela cópia
nativa da plataforma. No macOS, ACLs que negam escrita, flags de proteção e
metadados cuja leitura falha continuam bloqueando a alteração. A verificação
de diretórios, mudanças simultâneas e ACLs no Windows tem limites; confira
[conflitos e backups](troubleshooting.md#conflitos-e-backups) antes de restaurar.

O gerador completo permanece no pacote npm. Ele não copia `bin/`, `src/`,
`scripts/release/` ou os testes do produto para o projeto atendido.
Instalar o kit não inicia uma aplicação nem instala todas as ferramentas.
A licença existente na raiz do projeto não é substituída. A cópia do hub
identifica a licença dos recursos do AgentDevKit, sem redefinir a do projeto.

## Git e migração

O ignore de `.pbai4devs` controla somente sua própria árvore. O kit preserva
a configuração Git, o índice e as regras de ignore do projeto. Apontamentos,
resultados e arquivos privados podem aparecer no Git. Antes de adicioná-los,
confira o status e ajuste as regras do projeto.

Ao atualizar ou sincronizar, o kit migra o bloco de exclusões da 0.0.21
quando comprova seu conteúdo e há uma única worktree. Remove a marcação e
as duplicatas do bloco, preserva a ordem das regras efetivas e guarda o
original em `.agent-tests/agentdevkit/ignore-migrations/`. Blocos alterados
ou compartilhados ficam pendentes para revisão. `doctor` e `sync --check`
também apontam credenciais visíveis e artefatos já rastreados.

Ignorar não remove arquivos já rastreados. A equipe decide como ajustar o
rastreamento. `--dry-run` e `sync --check` não alteram o índice.

## Atualizar e escolher agentes

Use a versão desejada do pacote para planejar e aplicar a atualização. Por
exemplo, para usar a versão marcada como `latest` no npm:

```console
npx @pathbit/agentdevkit@latest update --dry-run --json
```

Revise `plan`, `conflicts` e `preserved`. Depois da revisão, aplique o plano
usando a versão indicada no campo `version` da resposta JSON. No comando
abaixo, substitua `VERSÃO` pelo número exibido:

```text
npx @pathbit/agentdevkit@VERSÃO update
```

Use `doctor` e, com Git, `sync --check` depois da atualização.

A seleção salva continua válida. Para ajustá-la, consulte `agents`, então
use `agents add cursor` para acrescentar ou `agents remove cursor` para
retirar apenas esse cliente. `agents codex,claude` substitui a lista
completa e `agents none` mantém só os recursos compartilhados. As mudanças
de seleção aceitam `--dry-run`.

`E_UPGRADE` indica que o formato precisa de scripts locais atualizados.
Se o plano apontar um script próprio, concilie-o com a versão do pacote
antes de aplicar a mudança de seleção.
`sync` usa as fontes já instaladas e não baixa uma nova versão. Consulte a
[referência da CLI](cli.md) para todos os comandos.

Para atualizar instalações com pastas antigas do Antigravity, Kimi ou Gemini
CLI, consulte a [migração de clientes][migracao].

## Preservação dos arquivos

Skills e outros recursos próprios podem coexistir com os do kit. Um nome
igual não comprova propriedade: conteúdo humano e arquivos adicionais não
devem ser descartados para reconstruir apontamentos. Remoções automáticas
ficam restritas a arquivos obsoletos cuja propriedade possa ser comprovada.
`--force` não autoriza substituir conteúdo próprio; backups ficam em
`.agent-tests/` e devem ser revisados quando houver reparo gerenciado.

Em entradas como `AGENTS.md` ou `CLAUDE.md` e em recursos nativos compatíveis,
o kit pode acrescentar uma referência delimitada:

```markdown
<!-- BEGIN AGENTDEVKIT -->
Leia e siga [origem](caminho/para/.pbai4devs/recurso.md).
<!-- END AGENTDEVKIT -->
```

O texto e o frontmatter humanos permanecem; a referência usa o caminho real
do recurso. Um arquivo que não possa receber o bloco é preservado e informado,
sem prometer a adição do apontamento. Repetir a operação não duplica o bloco.
Edite suas instruções fora do bloco gerado. Nomes de entradas
com caixa diferente são reaproveitados quando há uma única opção.
Configurações que não são instruções não recebem uma mesclagem arbitrária.
Arquivos mistos não passam a pertencer ao kit. Sua visibilidade para o Git
também depende da regra aplicada à pasta do cliente.

Links simbólicos preexistentes são preservados sem atravessá-los. O campo
`preserved` lista caminhos próprios encontrados no planejamento ou em colisões,
sem inventariar rotas não examinadas. A ausência de um caminho não prova que ele
foi verificado ou preservado. Um formato não suportado ou um bloco alterado é
informado; `--force` não permite apagar instruções humanas para reconstruir um
apontamento.

Essa preservação não autoriza trocar arquivos gerenciados por links. Links
em caminhos já pertencentes ao kit, no hub, no estado ou em ferramentas
continuam sujeitos à recusa de segurança. Nenhum link humano é adotado como
propriedade do kit, e `--force` não o substitui.

Arquivos humanos continuam pertencendo à equipe, inclusive quando contêm um
link. Se uma atualização falhar, o kit preserva o estado parcial e mostra
como consultar o diário e comparar o projeto com a cópia anterior.
Siga o [procedimento de recuperação](troubleshooting.md#retomar-após-uma-interrupção)
antes de retomar a operação.

O [fluxo de trabalho](workflow.md) orienta a próxima etapa do projeto.
Se houver erro, consulte [solução de problemas](troubleshooting.md).

[Wiki](../README.md) · [Spec de segurança][spec]

[bootstrap]: ../../.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.md
[clients]: ../../.pbai4devs/COMPATIBILIDADE.md
[diagnostics]: cli.md#diagnóstico-e-sincronização
[migracao]: ../../.pbai4devs/COMPATIBILIDADE.md#migrar-pastas-legadas
[spec]: ../specs/security-ecosystem/SPEC.md
[tokens]: https://github.com/settings/tokens
[github-auth]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages

[reading-pt]: installation.md
[reading-en]: ../en/guides/installation.md
[reading-es]: ../es/guides/installation.md
