---
description: Preservar o ignore do projeto ao instalar o AgentDevKit.
---

# Ignore do projeto

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

> Esta spec registra o contrato histórico da release. A decisão posterior é não
> editar `.git/info/exclude` nem criar ou alterar ignores na raiz ou nos clientes.
> Os ignores existentes no hub também são preservados. A atualização dos
> critérios e sua validação estão pendentes no [roadmap](../../product/roadmap.md).

O arquivo `.gitignore` da raiz pertence ao projeto. Instalação, atualização e
sincronização preservam seus bytes, permissões e estado no índice Git, inclusive
quando um estado antigo do kit registra esse arquivo.

## Critérios de aceite

- AC-001: O kit não cria, altera, remove ou desindexa o `.gitignore` da raiz.
- AC-002: Derivados e artefatos locais são protegidos via `.git/info/exclude`.
- AC-003: Conflitos com regras humanas são informados antes das alterações; exceções
  ambíguas não são consideradas seguras apenas por ausência do arquivo.
- AC-004: Sem Git, a instalação informa a pendência e orienta a executar a
  sincronização depois de `git init` e antes de `git add`.
- AC-005: Arquivos humanos e configurações existentes são preservados.
- AC-006: Instalação e atualização são verificadas em projetos pelo pacote.

## Verificação

Os testes de exclusão local cobrem negações, migração, arquivos rastreados,
permissões e worktrees. Os testes de instalação e compatibilidade conferem a
preservação do projeto e o comportamento com e sem Git.

[reading-pt]: SPEC.md
[reading-en]: ../../en/specs/project-ignore/SPEC.md
[reading-es]: ../../es/specs/project-ignore/SPEC.md
