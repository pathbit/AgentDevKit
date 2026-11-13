---
description: Sincronização segura com recursos e alterações próprios do projeto.
---

# Sincronização segura

Projetos podem ter arquivos próprios e recursos adicionais aos do pacote.
Os comandos devem preservar esse conteúdo ao instalar, atualizar e sincronizar.

## Critérios de aceite

- AC-001: Recursos humanos ou modificados no hub e nos clientes são
  preservados, inclusive em colisões e com `--force`.
- AC-002: A limpeza remove somente saídas obsoletas com propriedade comprovada;
  pastas e arquivos adicionais da equipe não são removidos.
- AC-003: Um conteúdo divergente preparado no índice não é descartado pela
  sincronização; `.gitignore` da raiz e dados humanos são preservados.
- AC-004: `init`, `update`, `sync`, consultas e opções estão documentados com
  seus efeitos sobre arquivos, backups, seleção de clientes e Git.
- AC-005: Testes exercitam instalações existentes, obsolescência, colisões,
  execução repetida, Git e falhas; a CI contempla Linux, Windows e macOS.
