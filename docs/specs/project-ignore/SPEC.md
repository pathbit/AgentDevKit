---
description: Preservar o ignore do projeto ao instalar o AgentDevKit.
---

# Ignore do projeto

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
