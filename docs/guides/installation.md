---
description: Instalação do AgentDevKit e geração local dos agentes.
---

# Instalação

O pacote traz o gerador e as fontes compartilhadas. A instalação prepara
`.pbai4devs` e cria somente os apontamentos dos agentes escolhidos.

- [Instalar pela primeira vez](#instalar).
- [Simular em um projeto existente](#simular-em-um-projeto-existente).
- [Atualizar ou mudar clientes](#atualizar-e-escolher-agentes).

## Pré-requisitos

Prepare [Node.js 24+ com npm e npx](prerequisites.md) no Windows, macOS ou Linux.
O guia inclui instalação manual e como pedir ao agente para preparar a máquina.
Git é opcional para instalar o kit. O launcher aceita Node 18 para preparar
um runtime local usando `tar`. Veja o [bootstrap][bootstrap] para as regras
de seleção e cache no Windows.

## Instalar

Os dois registries oferecem o mesmo [`@pathbit/agentdevkit`](../maintainers/packages.md).
Escolha um deles e execute na pasta do projeto.

### npm público

É o caminho padrão e não exige conta nem login:

```console
npx @pathbit/agentdevkit init
```

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
quando falta o idioma ou a seleção de agentes, o assistente reúne essas escolhas
e o objetivo. Com idioma e clientes explícitos, use também `--purpose`.
No aplicativo desktop, reúna as escolhas pelo chat e passe-as à CLI.

Consulte [CLI](cli.md) para acrescentar seleção, destino e simulação. `--json`,
`--yes`, `--dry-run` ou ausência de terminal interativo evitam perguntas.
Sem escolha explícita ou salva, o modo `none` prepara o hub sem criar
pastas de clientes. Use `--agents all` para selecionar todos os
clientes ativos deliberadamente.

Após instalar, confirme a versão, o diagnóstico e os apontamentos:

```console
npx @pathbit/agentdevkit --version
npx @pathbit/agentdevkit doctor
npx @pathbit/agentdevkit sync --check
```

Sem Git, use `doctor` para conferir o kit. `sync --check` pode indicar
pendência de Git. Para as diferenças entre diagnóstico e sincronização,
consulte a [CLI](cli.md#diagnóstico-e-sincronização).

Se escolheu GitHub Packages, use o mesmo prefixo
`npx --registry=https://npm.pkg.github.com` nesses comandos. Para fixar uma
versão, acrescente-a ao nome do pacote, como `@pathbit/agentdevkit@0.0.31`.
Consulte `npx @pathbit/agentdevkit next` para retomar pelo objetivo do projeto.
Prepare [as ferramentas](prerequisites.md#depois-de-instalar-o-kit) quando a
tarefa exigir.

### Simular em um projeto existente

Na raiz do projeto, simule com os clientes e o idioma que serão aplicados.
Por exemplo, para preparar Codex e Claude em português:

```console
npx @pathbit/agentdevkit init --lang pt --agents codex,claude --dry-run
```

O plano lista mudanças e conflitos. Acrescente `--json` para consultar a lista
completa e os motivos de preservação. Depois da revisão, execute o mesmo
`init` sem `--dry-run`. Se só quiser os recursos compartilhados, use
`--agents none` no plano e na aplicação. Se o kit já está instalado, simule
[`update`](#atualizar-e-escolher-agentes).

## O que fica no projeto

| Conteúdo | Tratamento |
| --- | --- |
| `.pbai4devs` com recursos e templates | Fonte compartilhada versionável. |
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

Antigravity usa `.agents`, que também abriga as skills do Codex, e Kimi usa
`.kimi-code`. A atualização remove apontamentos comprovadamente gerados em
`.agent` e `.kimi`.

A partir da versão `0.0.36`, o kit deixa de criar ou renovar apontamentos em
`.gemini/`. Se uma instalação usava somente Gemini CLI, escolha outro cliente
ou `none` com `update --agents <id> --dry-run`. Nas instalações com outros
clientes salvos, `update` conserva esses IDs. A migração retira somente a
contribuição do kit que for comprovada e preserva conteúdo próprio.
`GEMINI.md` continua sendo a entrada do Antigravity. Consulte a
[migração de clientes][migracao].

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
[migracao]: ../../.pbai4devs/COMPATIBILIDADE.md#escolher-clientes
[spec]: ../specs/security-ecosystem/SPEC.md
[tokens]: https://github.com/settings/tokens
[github-auth]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages
