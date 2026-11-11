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

O pacote `@pathbit/agentdevkit` é publicado no GitHub Packages. Após o
[login no registro](packages.md#instalar-no-projeto), execute na pasta do projeto:

```console
npx -y --registry=https://npm.pkg.github.com @pathbit/agentdevkit@0.0.3 init
```

## Instalar pelo tarball público

O mesmo pacote também fica disponível na release, sem login no registro.
Abra um terminal na pasta do projeto e execute:

```console
npx --yes --ignore-scripts https://github.com/pathbit/AgentDevKit/releases/download/v0.0.3/agentdevkit-0.0.3.tgz
```

Sem comando adicional, o pacote executa `init`. Em terminal interativo,
pergunta idioma e agentes. No aplicativo desktop, peça ao agente para reunir
as escolhas no chat e usar `--lang` e `--agents` na CLI.

Com Git disponível, esta forma curta usa a mesma versão pelo código publicado:

```console
npx -y --ignore-scripts github:pathbit/AgentDevKit#v0.0.3 init
```

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

O gerador completo permanece no pacote npm. Ele não copia `bin/`, `src/`,
`release/` ou os testes do produto para o projeto atendido.
Instalar o kit não inicia uma aplicação nem instala todas as ferramentas.

## Git e migração

Um `.gitignore` dentro de `.pbai4devs` só controla essa árvore. Para os
apontamentos externos, o kit gera exclusões locais do Git, sem ignorar
workflows, formulários de issues ou configurações humanas em `.github`.
Sem Git, uma proteção no `.gitignore` da raiz evita incluir os derivados
quando o repositório for iniciado.

Arquivos já rastreados exigem migração do índice: apenas saídas identificadas
do kit podem deixar de ser rastreadas, preservando seus bytes no disco.
Revise o plano e os conflitos em um projeto existente; use `--dry-run` antes
de aplicar. Conteúdo humano não deve ser classificado como saída do gerador.

## Atualizar e escolher agentes

Use a versão desejada do pacote para executar `update`. A escolha salva
continua válida; `agents` consulta e `agents codex,claude` altera a seleção.
`agents all` habilita todos. As pastas compartilhadas permanecem quando
necessárias para outro cliente, como `.agents` para Codex e Antigravity.

O [fluxo de trabalho](workflow.md) orienta a próxima etapa do projeto.
Se houver erro, consulte [solução de problemas](troubleshooting.md).

[Wiki](README.md) · [Release 0.0.3][release]

[bootstrap]: ../.pbai4devs/scripts/preparar-ferramentas/BOOTSTRAP.md
[release]: https://github.com/pathbit/AgentDevKit/releases/tag/v0.0.3
