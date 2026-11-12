---
description: Instalação do AgentDevKit e geração local dos agentes.
---

# Instalação

O pacote traz o gerador e as fontes compartilhadas. A instalação prepara
`.pbai4devs` e cria somente os apontamentos dos agentes escolhidos.

## Pré-requisitos

Use Node.js 18+ com npm para iniciar o pacote. O launcher prepara Node 24+
quando o runtime atual é antigo; o núcleo e as ferramentas usam Node 24+.
A extração de runtime usa o executável nativo `tar`, sem scripts shell.

Sem Node/npm, o agente precisa primeiro instalar o runtime pelo mecanismo do
sistema operacional e continuar. `npx` não funciona antes dessa instalação.
O [guia de preparo][bootstrap] explica as duas situações.

## Instalar

O pacote [`@pathbit/agentdevkit`](../maintainers/packages.md) é publicado no
npm público. Execute na pasta do projeto, sem login:

```console
npx @pathbit/agentdevkit init
```

Sem comando adicional, o pacote executa `init`. Em terminal interativo,
pergunta idioma e agentes. No aplicativo desktop, peça ao agente para reunir
as escolhas no chat e usar `--lang` e `--agents` na CLI.

Consulte [CLI](cli.md) para acrescentar seleção, destino e simulação. `--json`,
`--yes`, `--dry-run` ou ausência de terminal interativo evitam perguntas.
Sem escolha explícita ou salva, `all` mantém todos os clientes compatíveis.

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
Sem Git, uma proteção no `.gitignore` da raiz evita incluir os derivados
quando o repositório for iniciado.

O bloco local também protege `.agent-tests`, `tmp`, `temp`, `.playwright*`
e relatórios de testes, inclusive com letras maiúsculas e em subpastas.
O `.gitignore` existente e seus arquivos rastreados são preservados;
uma exceção humana que conflite com essa proteção é informada como conflito.
Nomes próprios de artefatos e arquivos existentes também são conferidos;
a validação fica restrita ao projeto e aos ignores de seus ancestrais.

Arquivos já rastreados exigem migração do índice: apenas saídas identificadas
do kit podem deixar de ser rastreadas, preservando seus bytes no disco.
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

Links simbólicos em caminhos usados pela instalação podem bloquear a operação.
O kit informa o caminho e não converte nem remove o link automaticamente.
Use a simulação para identificar esse caso antes de aplicar.

Arquivos humanos não se tornam gerenciados apenas por conterem um link.
As alterações de arquivos existentes preservam permissões, inclusive em backup
e restauração após falha.

O [fluxo de trabalho](workflow.md) orienta a próxima etapa do projeto.
Se houver erro, consulte [solução de problemas](troubleshooting.md).

[Wiki](../README.md) · [Spec v0.0.8][spec]

[bootstrap]: ../../.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.md
[spec]: ../specs/v0.0.8/SPEC.md
