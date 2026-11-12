---
description: Comandos, opções e respostas do AgentDevKit.
---

# Referência da CLI

Execute o pacote do npm público por `npx`, sem login:

```console
npx @pathbit/agentdevkit --help
```

Nas tabelas, `agentdevkit` representa esse executável. No checkout das fontes,
use `npm run cli -- <comando>` ou `node bin/agentdevkit.mjs`.
Esse código não é copiado ao projeto
atendido; lá os comandos de manutenção usam o pacote por `npx`.

## Comandos

| Comando | Resultado |
| --- | --- |
| `init [pasta]` | Instala ou reaplica os recursos. |
| `update` | Usa os recursos da versão do pacote executado. |
| `sync` | Reconstrói as derivações da fonte do projeto. |
| `sync --check` | Confere as derivações sem escrever. |
| `doctor` | Diagnostica a instalação. |
| `next` | Orienta a próxima etapa do projeto. |
| `lang [idioma]` | Consulta ou altera o idioma: pt, en ou es. |
| `agents` | Consulta clientes disponíveis e seleção local. |
| `agents codex,claude` | Altera a seleção local. |
| `agents all` | Habilita todos os clientes. |
| `tools <ação>` | Executa o gerenciador de ferramentas. |
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
| `--force` | Substitui conflitos gerenciados, com backup. |
| `--json` | Produz uma resposta JSON para automação. |

O primeiro uso interativo reúne idioma e clientes. Sem interação, valem as
opções explícitas, a escolha local salva e, por último, `all`. Confira os
[IDs e dependências](../../.pbai4devs/COMPATIBILIDADE.md).

`update` não procura automaticamente a próxima versão: execute o pacote
da versão desejada. `sync` não atualiza a fonte distribuída.
A seleção e os derivados são locais; o source compartilhado permanece no Git.

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

| Código | Significado |
| --- | --- |
| `0` | Operação concluída; examine também o tipo da resposta. |
| `1` | Falha, conflito ou diagnóstico com pendências. |
| `2` | Argumentos inválidos; ferramentas podem propagar outros códigos. |

`doctor` verifica o kit, não o produto inteiro. `next` pode terminar com
sucesso enquanto orienta uma etapa ainda pendente.

[Wiki](../README.md) · [Solução de problemas](troubleshooting.md)
