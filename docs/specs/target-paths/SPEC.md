---
description: Resolução segura dos destinos de instalação.
---

# Destinos de instalação

O instalador deve manter o caminho solicitado e preservar projetos existentes,
inclusive quando trabalha com diretórios temporários no macOS.

## Critérios de aceite

- AC-001: Destinos inexistentes preservam todos os nomes e sua ordem,
  inclusive quando o primeiro componente está diretamente sob a raiz.
- AC-002: Os aliases temporários de sistema esperados no macOS funcionam para
  instalação e consulta sem modificar o índice ou o `.gitignore` do projeto.
- AC-003: Destinos que atravessam links humanos são recusados, inclusive os
  apontados por variáveis de ambiente; caminhos reservados continuam protegidos.
- AC-004: Testes de regressão, revisão independente e CI cobrem os cenários
  pertinentes em Linux, Windows e macOS.
