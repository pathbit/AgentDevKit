---
description: Exclusão local de clientes com escolha explícita do projeto.
---

# Ignore de clientes

O Git não aplica `../` no `.gitignore` do hub às pastas irmãs. O kit usa
exclusões locais do Git e o projeto escolhe exceções no seu `.gitignore`.

## Critérios de aceite

- AC-001: Pastas de clientes são ignoradas por padrão em repositórios Git,
  sem modificar o `.gitignore` da raiz.
- AC-002: Uma exceção literal da raiz, como `!/.claude/`, permite versionar
  o cliente e continua válida após instalação, atualização e sincronização.
- AC-003: Credenciais e artefatos continuam protegidos; exceções inseguras
  são informadas antes de qualquer mudança.
- AC-004: Arquivos humanos e o índice Git, incluindo alterações preparadas,
  são preservados. Arquivos já rastreados continuam rastreados.
- AC-005: Documentação e testes explicam e verificam precedência, limites,
  clones, clientes compartilhados, cenários sem Git e sistemas suportados.
