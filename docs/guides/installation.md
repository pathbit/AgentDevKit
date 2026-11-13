---
description: Instalação do AgentDevKit e geração local dos agentes.
---

# Instalação

O pacote traz o gerador e as fontes compartilhadas. A instalação prepara
`.pbai4devs` e cria somente os apontamentos dos agentes escolhidos.

## Pré-requisitos

Prepare [Node.js 24+ com npm e npx](prerequisites.md) no Windows, macOS ou Linux.
O guia inclui instalação manual e como pedir ao agente para preparar a máquina.
Git é opcional para instalar o kit. Com Node 18–23 existente, o launcher pode
preparar Node 24 localmente usando `tar`; veja o [bootstrap][bootstrap].

## Instalar

Os dois registries oferecem o mesmo [`@pathbit/agentdevkit`](../maintainers/packages.md).
Escolha um deles e execute na pasta do projeto.

### npm público

É o caminho padrão e não exige conta nem login:

```console
npx @pathbit/agentdevkit init
```

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

Sem comando adicional, o pacote executa `init`. Em terminal interativo,
pergunta idioma e agentes. No aplicativo desktop, peça ao agente para reunir
as escolhas no chat e usar `--lang` e `--agents` na CLI.

Consulte [CLI](cli.md) para acrescentar seleção, destino e simulação. `--json`,
`--yes`, `--dry-run` ou ausência de terminal interativo evitam perguntas.
Sem escolha explícita ou salva, `all` mantém todos os clientes compatíveis.

Após instalar, confirme a versão, o diagnóstico e os apontamentos:

```console
npx @pathbit/agentdevkit --version
npx @pathbit/agentdevkit doctor
npx @pathbit/agentdevkit sync --check
```

Se escolheu GitHub Packages, use o mesmo prefixo
`npx --registry=https://npm.pkg.github.com` nesses comandos. Para fixar a versão,
use `@pathbit/agentdevkit@0.0.12` no lugar do nome sem versão, em qualquer destino.
O próximo passo é [preparar as ferramentas](prerequisites.md#depois-de-instalar-o-kit).

## O que fica no projeto

| Conteúdo | Tratamento |
| --- | --- |
| `.pbai4devs` com recursos e templates | Fonte compartilhada versionável. |
| Skills, regras e comandos nos clientes | Apontamentos locais gerados. |
| Entradas da raiz criadas pelo kit | Arquivos locais gerados. |
| Índices, manifesto e seleção pessoal | Derivados locais ignorados. |
| Código, documentos e configurações humanas | Preservados. |
| Downloads e resultados de testes | Locais e ignorados. |
| `.pbai4devs/LICENSE` | Licença MIT do kit, copiada do pacote. |

O gerador completo permanece no pacote npm. Ele não copia `bin/`, `src/`,
`scripts/release/` ou os testes do produto para o projeto atendido.
Instalar o kit não inicia uma aplicação nem instala todas as ferramentas.
A licença existente na raiz do projeto não é substituída. A cópia do hub
identifica a licença dos recursos do AgentDevKit, sem redefinir a do projeto.

## Git e migração

Um `.gitignore` dentro de `.pbai4devs` só controla essa árvore. Para os
apontamentos externos, o kit gera exclusões locais do Git, sem ignorar
workflows, formulários de issues ou configurações humanas em `.github`.
O kit não cria nem altera o `.gitignore` da raiz. Sem Git, a exclusão local
fica pendente; execute `git init` e `npx @pathbit/agentdevkit sync` antes de
usar `git add`. No GitHub Packages, use o prefixo de registry da instalação.

O bloco local também protege `.agent-tests`, `tmp`, `temp`, `.playwright*`
e relatórios de testes, inclusive com letras maiúsculas e em subpastas.
O conteúdo do `.gitignore` existente e os arquivos rastreados são preservados.
Uma exceção que reabra arquivo privado ou artefato é informada como conflito;
o projeto decide como ajustar suas próprias regras.
Negativas com curingas também podem ser recusadas preventivamente, mesmo antes
de existir um arquivo correspondente. Examine a regra indicada no diagnóstico.
Nomes próprios de artefatos e arquivos existentes também são conferidos;
a validação fica restrita ao projeto e aos ignores de seus ancestrais.

Arquivos já rastreados exigem migração do índice: apenas saídas identificadas
do kit podem deixar de ser rastreadas, preservando seus bytes no disco.
Artefatos já rastreados são informados por `doctor` e `sync --check` para
revisão; não são removidos automaticamente do índice.
Revise o plano e os conflitos em um projeto existente; use `--dry-run` antes
de aplicar. Conteúdo humano não deve ser classificado como saída do gerador.

## Atualizar e escolher agentes

Use a versão desejada do pacote para executar `update`. A escolha salva
continua válida; `agents` consulta e `agents codex,claude` altera a seleção.
`agents all` habilita todos. As pastas compartilhadas permanecem quando
necessárias para outro cliente, como `.agents` para Codex e Antigravity.

Confira a simulação antes de atualizar um projeto existente. Arquivos
gerenciados alterados geram conflito; use `--force` somente após revisar o
backup e o conteúdo que será substituído. Preserve os dados locais, as
configurações próprias e os commits do projeto.

Entradas como `AGENTS.md`, `claude.md` e `GEMINI.md`, além de skills, agentes,
comandos e regras existentes, recebem apenas um complemento do kit:

```markdown
<!-- BEGIN AGENTDEVKIT -->
Leia e siga [origem](caminho/para/.pbai4devs/recurso.md).
<!-- END AGENTDEVKIT -->
```

O texto e o frontmatter humanos permanecem; a referência usa o caminho real
do recurso. Repetir a operação não duplica o bloco. Edite suas instruções fora
dele: atualizações alteram somente a contribuição do kit. Nomes de entradas
com caixa diferente são reaproveitados quando há uma única opção.
Comandos Gemini mantêm a referência dentro do valor `prompt` em TOML válido.
Configurações que não são instruções não recebem uma mesclagem arbitrária.
Arquivos mistos permanecem sob controle do Git do projeto; somente derivados
integralmente gerados pelo kit recebem exclusão local.

Links simbólicos preexistentes são preservados sem atravessá-los. O campo
`preserved` informa rotas que continuam sob controle do projeto. Um formato
não suportado ou um bloco alterado é informado; `--force` não permite apagar
instruções humanas para reconstruir um apontamento.

Essa preservação não autoriza trocar arquivos gerenciados por links. Links
em caminhos já pertencentes ao kit, no hub, no estado ou em ferramentas
continuam sujeitos à recusa de segurança. Nenhum link humano é adotado como
propriedade do kit, e `--force` não o substitui.

Arquivos humanos não se tornam gerenciados apenas por conterem um link.
As alterações de arquivos existentes preservam permissões, inclusive em backup
e restauração após falha.

O [fluxo de trabalho](workflow.md) orienta a próxima etapa do projeto.
Se houver erro, consulte [solução de problemas](troubleshooting.md).

[Wiki](../README.md) · [Spec de segurança][spec]

[bootstrap]: ../../.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.md
[spec]: ../specs/security-ecosystem/SPEC.md
[tokens]: https://github.com/settings/tokens
[github-auth]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages
