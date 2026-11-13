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
| `next` | Mostra a próxima etapa, sem iniciá-la. |
| `lang [idioma]` | Consulta ou altera o idioma: pt, en ou es. |
| `agents` | Mostra os clientes disponíveis e a seleção salva. |
| `agents codex,claude` | Altera a seleção e os apontamentos necessários. |
| `agents all` | Seleciona todos os clientes compatíveis. |
| `tools <ação>` | Consulta, instala, atualiza ou executa ferramentas. |
| `--help`, `--version` | Ajuda ou versão do pacote. |

Sem comando, a CLI executa `init`, que pode criar arquivos. `language` é alias
de `lang`; `clients`, de `agents`. O idioma não traduz documentos existentes.

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

O primeiro uso interativo reúne idioma e clientes. Sem interação, valem as
opções explícitas, a escolha local salva e, por último, `all`. Confira os
[IDs e dependências](../../.pbai4devs/COMPATIBILIDADE.md).

`update` usa a versão executada; para escolher outra, fixe-a no nome do
pacote. `sync` usa o que já está em `.pbai4devs`: ele não baixa outra versão.
Ambos conciliam recursos e removem apontamentos obsoletos quando a propriedade
do kit é comprovada. Recursos e configurações próprios permanecem no projeto.
Diretórios antigos sem comprovação de propriedade podem permanecer vazios.
Ao mudar a seleção, pastas compartilhadas continuam quando outro cliente
precisa delas; arquivos adicionais da equipe devem ser preservados.

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

O sincronizador independente também pode ser executado pelo
[script local](../../.pbai4devs/scripts/sincronizar-agentes/README.md). Seu
`--check` apenas confere e `--force` é explícito na linha de comando. O
comando agêntico [sincronizar](../../.pbai4devs/commands/sincronizar/COMMAND.md)
orienta executar o script com `--force`; ele não é o mesmo que `sync` da CLI.

No Git, o kit preserva o `.gitignore` da raiz e pode atualizar
`.git/info/exclude`. Se o plano indicar `untrackedPaths`, a operação pode
retirar do índice saídas comprovadamente geradas, mantendo seus arquivos no
disco. Confira a lista: `--dry-run` e `sync --check` não alteram o índice.
Backups locais ficam em `.agent-tests/` e não substituem o histórico Git.

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

As respostas incluem `ok`, `command`, `version`, `language`, `target` e
`next`. Conforme a operação, há seleção, plano, conflitos, backup e erros.
Leia os campos estruturados, não dependa da tradução da mensagem.
`preserved` lista caminhos mantidos pelo projeto e o motivo.
Um complemento pode ser gerenciado por bloco sem tornar o arquivo propriedade
do kit. Conteúdo humano não é substituído por `--force`.

| Código | Significado |
| --- | --- |
| `0` | Operação concluída; examine também o tipo da resposta. |
| `1` | Falha, conflito ou diagnóstico com pendências. |
| `2` | Argumentos inválidos; ferramentas podem propagar outros códigos. |

`doctor` verifica o kit, não o produto inteiro. `next` pode terminar com
sucesso enquanto orienta uma etapa ainda pendente.

[Wiki](../README.md) · [Solução de problemas](troubleshooting.md)
