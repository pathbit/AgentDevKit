---
description: Atualização segura do agent-browser e recuperação por versão.
---

# Atualização de ferramenta e versões

O agent-browser passou a distribuir executáveis em pacotes opcionais por
plataforma. A atualização deve funcionar sem perder instalações existentes.

## Critérios de aceite

- AC-001: O instalador aceita os layouts anterior e atual do agent-browser,
  valida executáveis adequados à plataforma e comprova a versão instalada.
- AC-002: Caminhos inválidos ou incompletos são recusados antes da troca;
  falhas preservam a instalação anterior e não atravessam links inseguros.
- AC-003: Cada release e pacote do fluxo aponta para a tag da mesma versão;
  a documentação explica como consultar uma versão e simular seu uso.
- AC-004: Testes automatizados cobrem layouts e falhas, e a CI verifica Linux,
  Windows e macOS na matriz configurada antes da publicação.
